/**
 * Grants.gov ingestion orchestrator.
 *
 * Flow:
 *  1. Create ScrapeRun (status: running)
 *  2. Paginate through Simpler.Grants.gov search API
 *  3. Normalize each record
 *  4. Score for public safety relevance — skip if below threshold
 *  5. Upsert into Opportunity collection (key: externalSource + externalSourceId)
 *  6. Trigger match recompute for new opportunities
 *  7. Mark stale opportunities as 'closed'
 *  8. Update ScrapeRun with final stats
 */

const Opportunity = require('../../opportunities/opportunity.schema');
const ScrapeRun = require('../scrape-run.schema');
const matchService = require('../../matches/match.service');
const logger = require('../../../utils/logger');

const { searchOpportunities } = require('./client');
const { normalize } = require('./normalizer');
const { scoreOpportunity, shouldIngest } = require('./public-safety-score');

const PAGE_SIZE = 100;
const STALE_CLOSE_GUARD_MIN_PARSED = 500; // safety: don't mass-close on tiny runs

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

  // Detect meaningful change for match-refresh decision
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

  logger.info(`[grantsGov] Starting ingestion run ${run._id}`);

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
          opportunity_status: { one_of: ['posted'] },
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
          const normalized = normalize(rec);
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
          const action = await upsertOpportunity(normalized, score, matched);
          run.stats[action] += 1;
          run.stats.parsed += 1;

          if (action === 'inserted') {
            const inserted = await Opportunity.findOne({
              externalSource: normalized.externalSource,
              externalSourceId: normalized.externalSourceId,
            })
              .select('_id')
              .lean();
            if (inserted?._id) newOpportunityIds.push(inserted._id);
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

      // Safety circuit breaker — stop if a single run goes wildly off
      if (page > 1000) {
        logger.warn('[grantsGov] page cap reached — stopping pagination');
        break;
      }
    }

    // Close opportunities not seen this run (only if run looks healthy)
    if (run.stats.parsed >= STALE_CLOSE_GUARD_MIN_PARSED) {
      const closeResult = await Opportunity.updateMany(
        {
          externalSource: 'grants_gov',
          externalSourceId: { $nin: [...seenSourceIds] },
          status: { $ne: 'closed' },
        },
        { $set: { status: 'closed', externalLastSeenAt: new Date() } }
      );
      run.stats.closed = closeResult.modifiedCount || 0;
    } else {
      logger.warn(
        `[grantsGov] Skipping stale-close (only parsed ${run.stats.parsed}, need >= ${STALE_CLOSE_GUARD_MIN_PARSED})`
      );
    }

    // Refresh match scores for new opportunities only (cheap)
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
