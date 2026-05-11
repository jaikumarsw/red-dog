/**
 * Grants.gov ingestion orchestrator.
 *
 * Flow:
 *  1. Create ScrapeRun (status: running)
 *  2. Paginate through Simpler.Grants.gov — filtered to public-safety categories
 *  3. Normalize each record
 *  4. Score for relevance — skip if below threshold (secondary noise filter)
 *  5. Fetch full detail for contact info
 *  6. Upsert into Opportunity collection (key: externalSource + externalSourceId)
 *  7. Trigger match recompute for new opportunities
 *  8. Mark stale opportunities (within our categories) as 'closed'
 *  9. Update ScrapeRun with final stats
 *
 * Category pre-filtering means we only pull grants from the four relevant domains:
 *   LJL  - Law, Justice & Legal Services (COPS, Byrne JAG, corrections, crime prevention)
 *   DPR  - Disaster Prevention & Relief  (FEMA/AFG, BRIC, emergency management, fire)
 *   HL   - Health                        (EMS, paramedics, public health emergency)
 *   ST   - Science & Technology          (NG911, LMR/P25, communications infrastructure)
 */

const Opportunity = require('../../opportunities/opportunity.schema');
const ScrapeRun = require('../scrape-run.schema');
const matchService = require('../../matches/match.service');
const logger = require('../../../utils/logger');

const { searchOpportunities, getOpportunity } = require('./client');
const { normalize, mergeDetail } = require('./normalizer');
const { scoreOpportunity, shouldIngest } = require('./public-safety-score');

const PAGE_SIZE = 100;

// Simpler.Grants.gov funding category slugs (snake_case full names).
// Only opportunities in these categories are fetched at the API level.
const TARGET_CATEGORIES = [
  'law_justice_and_legal_services',        // LJL — COPS, Byrne JAG, corrections, crime prevention
  'disaster_prevention_and_relief',        // DPR — FEMA/AFG, BRIC, emergency management, fire
  'health',                                // HL  — EMS, paramedics, public health emergency
  'science_technology_and_other_research_and_development', // ST — NG911, LMR/P25, comms infra
];

// Safety guard: only run stale-close if we parsed enough records this run.
// Lowered from 500 because category-filtering means fewer total records.
const STALE_CLOSE_GUARD_MIN_PARSED = 50;

/**
 * Upsert a single normalized opportunity. Returns 'inserted' | 'updated' | 'unchanged'.
 */
async function upsertOpportunity(normalized, score, matched) {
  const filter = {
    externalSource: normalized.externalSource,
    externalSourceId: normalized.externalSourceId,
  };

  const existing = await Opportunity.findOne(filter).lean();

  const payload = {
    ...normalized,
    publicSafetyScore: score,
    publicSafetyKeywordsMatched: matched,
  };

  if (!existing) {
    payload.externalFirstSeenAt = new Date();
    await Opportunity.create(payload);
    return 'inserted';
  }

  const meaningfulChanged =
    existing.title !== payload.title ||
    String(existing.deadline) !== String(payload.deadline) ||
    existing.minAmount !== payload.minAmount ||
    existing.maxAmount !== payload.maxAmount ||
    existing.status !== payload.status ||
    JSON.stringify(existing.eligibleApplicants || []) !==
      JSON.stringify(payload.eligibleApplicants || []);

  await Opportunity.updateOne(filter, { $set: payload });
  return meaningfulChanged ? 'updated' : 'unchanged';
}

/**
 * Run a full ingestion. Returns the completed ScrapeRun document.
 */
async function runIngestion({ triggeredBy = 'cron' } = {}) {
  const run = await ScrapeRun.create({
    source: 'grants_gov',
    startedAt: new Date(),
    status: 'running',
    triggeredBy,
  });

  logger.info(
    `[grantsGov] Starting ingestion run ${run._id} — categories: ${TARGET_CATEGORIES.join(', ')}`
  );

  const seenSourceIds = new Set();
  const newOpportunityIds = [];

  try {
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const result = await searchOpportunities({
        page,
        pageSize: PAGE_SIZE,
        filters: {
          opportunity_status: { one_of: ['posted', 'forecasted'] },
          funding_category: { one_of: TARGET_CATEGORIES },
        },
        sortOrder: [{ order_by: 'post_date', sort_direction: 'descending' }],
      });

      const records = result?.data || [];
      const pagination = result?.pagination_info || {};
      totalPages = pagination.total_pages || 1;

      logger.info(
        `[grantsGov] page ${page}/${totalPages}, records=${records.length}`
      );

      for (const rec of records) {
        run.stats.fetched += 1;
        try {
          let normalized = normalize(rec);
          const { score, matched } = scoreOpportunity({
            title: normalized.title,
            funder: normalized.funder,
            description: normalized.description,
            fundingCategories: normalized.keywords,
            eligibleApplicants: normalized.eligibleApplicants,
          });

          if (!shouldIngest(score)) {
            run.stats.filtered_out += 1;
            continue;
          }

          seenSourceIds.add(normalized.externalSourceId);

          // Fetch full detail to get contact email and other enriched fields
          try {
            const detail = await getOpportunity(normalized.externalSourceId);
            normalized = mergeDetail(normalized, detail);
          } catch (detailErr) {
            logger.warn(
              `[grantsGov] detail fetch failed for ${normalized.externalSourceId}: ${detailErr.message}`
            );
          }

          const action = await upsertOpportunity(normalized, score, matched);
          run.stats[action] += 1;
          run.stats.parsed += 1;

          if (action === 'inserted') {
            const insertedDoc = await Opportunity.findOne({
              externalSource: normalized.externalSource,
              externalSourceId: normalized.externalSourceId,
            })
              .select('_id')
              .lean();
            if (insertedDoc?._id) {
              newOpportunityIds.push(insertedDoc._id);
              try {
                await matchService.computeAllForOpportunity(insertedDoc._id);
              } catch (matchErr) {
                logger.warn(
                  `[grantsGov] inline match compute failed for ${insertedDoc._id}: ${matchErr.message}`
                );
              }
            }
          }
        } catch (err) {
          run.stats.errors += 1;
          if (run.errorSummary.length < 50) {
            run.errorSummary.push({
              recordId: String(rec?.opportunity_id || 'unknown'),
              message: err.message.slice(0, 500),
            });
          }
          logger.warn(
            `[grantsGov] record failed (${rec?.opportunity_id}): ${err.message}`
          );
        }
      }

      page += 1;

      if (page > 1000) {
        logger.warn('[grantsGov] page cap reached — stopping pagination');
        break;
      }
    }

    // Only close grants within our target categories that weren't seen this run.
    // Scoping to TARGET_CATEGORIES prevents accidentally closing opportunities
    // that were ingested from a broader search in a previous run.
    if (run.stats.parsed >= STALE_CLOSE_GUARD_MIN_PARSED) {
      const closeResult = await Opportunity.updateMany(
        {
          externalSource: 'grants_gov',
          externalSourceId: { $nin: [...seenSourceIds] },
          status: { $ne: 'closed' },
          keywords: { $in: TARGET_CATEGORIES },
        },
        { $set: { status: 'closed', externalLastSeenAt: new Date() } }
      );
      run.stats.closed = closeResult.modifiedCount || 0;
    } else {
      logger.warn(
        `[grantsGov] Skipping stale-close (only parsed ${run.stats.parsed}, need >= ${STALE_CLOSE_GUARD_MIN_PARSED})`
      );
    }

    // Refresh match scores for newly inserted opportunities
    let matchRefreshErrors = 0;
    for (const oppId of newOpportunityIds) {
      try {
        await matchService.computeAllForOpportunity(oppId);
      } catch (err) {
        matchRefreshErrors += 1;
        logger.warn(
          `[grantsGov] match refresh failed for ${oppId}: ${err.message}`
        );
      }
    }
    if (matchRefreshErrors > 0) {
      run.errorSummary.push({
        recordId: 'match_refresh',
        message: `${matchRefreshErrors} match refresh failures`,
      });
    }

    run.finishedAt = new Date();
    run.durationMs = run.finishedAt - run.startedAt;
    run.status = run.stats.errors === 0 ? 'success' : 'partial';
    await run.save();

    logger.info(
      `[grantsGov] Run ${run._id} complete: ${JSON.stringify(run.stats)} in ${run.durationMs}ms`
    );

    return run;
  } catch (err) {
    run.finishedAt = new Date();
    run.durationMs = run.finishedAt - run.startedAt;
    run.status = 'failed';
    run.errorSummary.push({
      recordId: 'orchestrator',
      message: err.message.slice(0, 500),
    });
    await run.save();
    logger.error(`[grantsGov] Run ${run._id} FAILED: ${err.message}`);
    throw err;
  }
}

module.exports = { runIngestion };
