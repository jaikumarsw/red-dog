/**
 * Public Safety Score — keyword-based filter to gate ingestion.
 *
 * Only opportunities scoring >= MIN_SCORE_TO_INGEST are saved to DB.
 * Score is computed against title + summary_description + funding_categories.
 *
 * Scoring weights are intentionally simple. Tune as ingestion proves out.
 */

const KEYWORD_WEIGHTS = {
  // ===== Tier 1: Bullseye matches (Red Dog's core niche) =====
  // Land mobile radio / interoperable communications
  'interoperability': 12,
  'interoperable': 12,
  'p25': 12,
  'land mobile radio': 12,
  'lmr': 10,
  'two-way radio': 10,
  'public safety communications': 12,
  'public safety broadband': 10,
  'firstnet': 10,
  'next generation 911': 10,
  'ng911': 10,
  'ng9-1-1': 10,

  // High-confidence federal program names
  'assistance to firefighters': 14,
  'staffing for adequate fire': 14,
  'safer grant': 12,
  'byrne jag': 12,
  'edward byrne': 10,
  'cops hiring': 10,
  'cops office': 8,
  'urban area security initiative': 12,
  'state homeland security program': 12,
  'homeland security grant program': 10,
  'shsp': 8,
  'uasi': 8,

  // ===== Tier 2: Strong domain matches =====
  // Public safety umbrella
  'public safety': 10,
  'first responder': 10,
  'first responders': 10,
  'emergency response': 8,
  'emergency responder': 8,
  'emergency management': 7,
  'emergency preparedness': 7,
  'emergency communications': 10,

  // Fire
  'fire department': 10,
  'fire service': 8,
  'firefighter': 10,
  'firefighters': 10,
  'fire and rescue': 8,
  'wildland fire': 6,
  'fire prevention': 6,

  // Police / law enforcement
  'law enforcement': 10,
  'police department': 10,
  'police officer': 8,
  'sheriff': 6,
  'corrections': 6,
  'correctional': 6,
  'criminal justice': 8,
  'forensic': 8,
  'forensics': 8,
  'crime laboratory': 8,
  'criminal investigation': 6,
  'national institute of justice': 10,
  'office of justice programs': 8,
  'bureau of justice': 8,
  'community oriented policing': 10,
  'tribal law enforcement': 8,

  // EMS / 911
  'emergency medical services': 10,
  'emergency medical': 6,
  'ems': 3,
  'paramedic': 7,
  'ambulance': 6,
  '911': 8,
  '9-1-1': 8,
  'dispatch center': 8,
  'public safety answering point': 10,
  'psap': 8,

  // ===== Tier 3: Supporting / equipment context =====
  'radio': 3,
  'repeater': 6,
  'communications': 2,
  'dispatch': 5,
  'tactical equipment': 6,
  'protective equipment': 4,
  'turnout gear': 8,
  'self-contained breathing': 8,
  'scba': 7,
  'mobile data terminal': 6,
  'body-worn camera': 7,
  'body worn camera': 7,
  'in-car camera': 5,
  'license plate reader': 5,

  // ===== Tier 4: Disaster / resilience =====
  'disaster response': 6,
  'disaster preparedness': 6,
  'natural disaster': 5,
  'flood mitigation': 4,
  'hazard mitigation': 5,
  'hazard mitigation grant': 8,
  'bric': 6,
  'critical infrastructure': 5,
  'cybersecurity': 4,
  'infrastructure security': 5,

  // ===== Tier 5: Applicant-type signals (grants.gov codes as strings) =====
  // Grants open to local/county/tribal governments are strong candidates
  'local_governments': 4,
  'county_governments': 4,
  'city_or_township_governments': 4,
  'special_district_governments': 3,
  'native_american_tribal_governments': 4,
  'federally_recognized_native_american_tribal_governments': 4,
  'independent_school_districts': 2,

  // ===== Tier 6: Additional program / keyword coverage =====
  'office of community oriented policing': 10,
  'assistance to firefighters grant': 14,
  'fire prevention and safety': 10,
  'fire suppression': 6,
  'fire station': 6,
  'technical rescue': 6,
  'swift water rescue': 6,
  'search and rescue': 6,
  'bomb squad': 7,
  'swat': 6,
  'k-9': 5,
  'canine unit': 5,
  'unmanned aerial': 5,
  'drone': 3,
  'surveillance': 4,
  'records management': 4,
  'computer aided dispatch': 8,
  'cad system': 6,
  'evidence management': 5,
  'crime prevention': 8,
  'violence prevention': 6,
  'gang prevention': 6,
  'drug enforcement': 6,
  'substance abuse': 4,
  'opioid': 5,
  'trafficking': 5,
  'active shooter': 8,
  'mass casualty': 8,
  'hazmat': 8,
  'haz-mat': 8,
  'decontamination': 6,
  'explosive ordnance': 7,
  'eod': 5,
  'chemical biological radiological': 10,
  'cbrn': 10,
  'terrorism': 7,
  'anti-terrorism': 8,
  'counter-terrorism': 8,
  'vulnerability assessment': 5,
  'resilience': 4,
  'continuity of operations': 5,
  'coop': 3,
  'public health emergency': 6,
  'mass notification': 7,
  'alert and warning': 7,
  'reverse 911': 7,
  'early warning': 5,
};

const MIN_SCORE_TO_INGEST = parseInt(
  process.env.GRANTS_GOV_MIN_SAFETY_SCORE || '8',
  10
);

/**
 * Score one opportunity. Case-insensitive keyword match.
 * @param {Object} opp - Normalized opportunity (must have title, description, fundingCategories)
 * @returns {{ score: number, matched: string[] }}
 */
function scoreOpportunity(opp) {
  const haystack = [
    opp.title || '',
    opp.funder || '',
    opp.description || '',
    (opp.fundingCategories || []).join(' '),
    (opp.eligibleApplicants || []).join(' '),
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;
  const matched = [];

  for (const [keyword, weight] of Object.entries(KEYWORD_WEIGHTS)) {
    // Build a word-boundary regex. Escape special regex chars in keyword.
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
    if (pattern.test(haystack)) {
      score += weight;
      matched.push(keyword);
    }
  }

  // Disqualifier: foreign-aid grants are for non-U.S. governments and 
  // shouldn't appear in our public-safety pipeline regardless of keyword hits.
  const foreignAidSignals = [
    'department of state',
    'bureau of counterterrorism',
    'embassy',
    'u.s. mission to',
  ];
  const isLikelyForeignAid = foreignAidSignals.some((sig) => haystack.includes(sig));
  if (isLikelyForeignAid) {
    // Heavy penalty — drop below threshold
    return { score: Math.max(0, score - 20), matched, disqualifier: 'foreign_aid' };
  }

  return { score, matched };
}

function shouldIngest(score) {
  return score >= MIN_SCORE_TO_INGEST;
}

module.exports = {
  scoreOpportunity,
  shouldIngest,
  MIN_SCORE_TO_INGEST,
  KEYWORD_WEIGHTS,
};
