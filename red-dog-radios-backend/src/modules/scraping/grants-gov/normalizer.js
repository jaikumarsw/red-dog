/**
 * Map Simpler.Grants.gov API response → Opportunity schema shape.
 *
 * The API returns nested objects under `summary` for some fields. We flatten
 * conservatively — when in doubt, fall back to null rather than throwing.
 */

function pickArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === 'string') return [val];
  return [];
}

function pickDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pickNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

/**
 * Determine the "open/closing/closed" status from API fields.
 */
function deriveStatus(rec) {
  const closeDate = pickDate(rec.close_date);
  const opportunityStatus = (rec.opportunity_status || '').toLowerCase();

  if (opportunityStatus === 'closed' || opportunityStatus === 'archived') {
    return 'closed';
  }
  if (!closeDate) return 'open';

  const daysLeft = (closeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0) return 'closed';
  if (daysLeft < 14) return 'closing';
  return 'open';
}

/**
 * Map agency name + eligibility codes → location focus array.
 * Federal grants are usually national; we only flag state-restricted ones.
 */
function deriveLocationFocus(rec) {
  // Grants.gov rarely scopes geography on opportunities — most are national.
  // Future: parse eligible_applicants codes to detect state restrictions.
  return ['national'];
}

/**
 * Map a single Grants.gov record to the shape we need for upsert.
 */
function normalize(rec) {
  if (!rec || !rec.opportunity_id) {
    throw new Error('Record missing opportunity_id');
  }

  const summary = rec.summary || {};
  const title = rec.opportunity_title || summary.opportunity_title || 'Untitled';
  const agency = rec.agency_name || summary.agency_name || 'Unknown Funder';
  const rawDescription = summary.summary_description || rec.summary_description || '';
  // Strip HTML tags and decode common entities. Scorer needs plain text.
  const description = String(rawDescription)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  const closeDate = pickDate(rec.close_date) || pickDate(summary.close_date);
  const minAward = pickNumber(rec.award_floor ?? summary.award_floor);
  const maxAward = pickNumber(rec.award_ceiling ?? summary.award_ceiling);

  const fundingCategories = pickArray(rec.funding_categories || summary.funding_categories);
  const fundingInstruments = pickArray(rec.funding_instruments || summary.funding_instruments);
  const eligibleApplicants = pickArray(
    rec.applicant_types || summary.applicant_types || rec.eligible_applicants
  );
  const cfdaNumbers = pickArray(
    rec.assistance_listings || summary.assistance_listings || rec.cfda_numbers
  )
    .map((al) => (typeof al === 'object' ? al.assistance_listing_number : al))
    .filter(Boolean);

  const isForecast =
    String(rec.opportunity_status || '').toLowerCase() === 'forecasted' ||
    Boolean(rec.forecasted_post_date);

  return {
    // Required by schema
    title: String(title).slice(0, 500),
    funder: String(agency).slice(0, 200),
    description: [
      String(description).slice(0, 5000),
      String(summary.applicant_eligibility_description || '').slice(0, 1000),
    ].filter(Boolean).join(' \n\n ').slice(0, 10000) || null,
    deadline: closeDate,
    minAmount: minAward,
    maxAmount: maxAward,
    status: deriveStatus(rec),
    keywords: fundingCategories,
    agencyTypes: [], // Grants.gov doesn't give us this directly
    category: fundingCategories[0] || null,
    locationFocus: deriveLocationFocus(rec),

    applicationUrl: rec.additional_info_url || summary.additional_info_url || null,

    // External source fields
    externalSource: 'grants_gov',
    externalSourceId: String(rec.opportunity_id),
    externalSourceUrl:
      rec.additional_info_url ||
      summary.additional_info_url ||
      `https://simpler.grants.gov/opportunity/${rec.opportunity_id}`,
    externalLastSeenAt: new Date(),
    isForecast,
    cfdaNumbers,
    fundingInstrument: fundingInstruments[0] || null,
    eligibleApplicants,
    rawSourceData: rec,

    // Public safety score is filled in by the orchestrator after scoring
  };
}

module.exports = { normalize };
