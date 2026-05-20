/**
 * Build a searchable profile from agency (Organization) data collected at signup/onboarding.
 * Used by the match engine to personalize grant results per agency.
 */

const AGENCY_TYPE_MAP = {
  'law-enforcement': 'law_enforcement',
  law_enforcement: 'law_enforcement',
  police: 'law_enforcement',
  'fire-services': 'fire_services',
  fire_services: 'fire_services',
  fire: 'fire_services',
  ems: 'ems',
  'emergency-management': 'emergency_management',
  emergency_management: 'emergency_management',
  '911-centers': '911_centers',
  '911_centers': '911_centers',
  hospitals: 'hospitals',
  healthcare: 'hospitals',
  'public-communication': 'public_safety_comms',
  public_safety_comms: 'public_safety_comms',
  'multi-agency': 'multi_agency',
  multi_agency: 'multi_agency',
  business: 'business',
  school: 'school',
  nonprofit: 'nonprofit',
  municipality: 'municipality',
  other: 'other',
};

const PUBLIC_SAFETY_AGENCY_TYPES = new Set([
  'law_enforcement',
  'fire_services',
  'ems',
  '911_centers',
  'emergency_management',
  'public_safety_comms',
  'multi_agency',
]);

const CHALLENGE_TO_PROGRAM_AREAS = {
  outdated_equipment: ['equipment', 'technology', 'infrastructure'],
  safety_concerns: ['safety', 'training'],
  slow_response_times: ['operations', 'training'],
  coverage_gaps: ['communications', 'infrastructure'],
  communication_issues: ['communications', 'technology'],
  staffing_shortages: ['training', 'community_outreach'],
};

const CHALLENGE_TO_KEYWORDS = {
  outdated_equipment: [
    'equipment',
    'apparatus',
    'gear',
    'modernization',
    'replacement',
    'vehicle',
    'firefighter',
    'technology',
    'infrastructure',
  ],
  safety_concerns: ['safety', 'protection', 'prevention', 'hazmat', 'responder', 'body armor'],
  slow_response_times: ['response', 'operations', 'dispatch', 'efficiency'],
  coverage_gaps: ['coverage', 'communications', 'radio', 'infrastructure', 'rural', 'broadband'],
  communication_issues: [
    'communications',
    'radio',
    'interoperability',
    '911',
    'ng911',
    'dispatch',
    'technology',
  ],
  staffing_shortages: ['staffing', 'workforce', 'recruitment', 'personnel'],
};

const AGENCY_TYPE_KEYWORDS = {
  law_enforcement: ['police', 'law enforcement', 'officer', 'crime', 'justice', 'cops', 'byrne'],
  fire_services: ['fire', 'firefighter', 'suppression', 'afg', 'safer', 'fire department'],
  ems: ['ems', 'ambulance', 'emergency medical', 'prehospital'],
  emergency_management: ['emergency management', 'disaster', 'preparedness', 'fema', 'homeland security'],
  '911_centers': ['911', 'dispatch', 'psap', 'ng911', 'call center'],
  hospitals: ['hospital', 'healthcare', 'medical', 'health'],
  school: ['school', 'education', 'campus', 'student'],
  nonprofit: ['nonprofit', '501c3', 'community'],
  municipality: ['municipal', 'local government', 'city', 'county'],
};

/** Terms that appear on nearly every federal grant — never use for thematic scoring */
const GENERIC_MATCH_TERMS = new Set([
  'government',
  'state',
  'local',
  'tribal',
  'municipality',
  'municipal',
  'county',
  'public',
  'agency',
  'nonprofit',
  '501',
  '501c3',
  'non-profit',
  'national',
  'charitable',
  'training',
  'community',
  'other',
]);

const OFF_DOMAIN_FUNDERS = [
  'national institutes of health',
  'nih',
  'centers for disease control',
  'cdc',
  'national science foundation',
  'nsf',
  'national endowment for the arts',
  'department of education',
];

const OFF_DOMAIN_CATEGORY_FRAGMENTS = [
  'health',
  'education',
  'humanities',
  'arts',
  'agriculture',
  'environment',
  'food and nutrition',
];

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'have',
  'will',
  'our',
  'are',
  'was',
  'been',
  'their',
  'they',
  'would',
  'could',
  'should',
  'about',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'under',
  'again',
  'further',
  'then',
  'once',
]);

const tokenize = (text) => {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t) && !GENERIC_MATCH_TERMS.has(t));
};

const normalizeAgencyTypes = (rawTypes = []) =>
  [...new Set(rawTypes.map((t) => AGENCY_TYPE_MAP[String(t).trim()] || String(t).trim()).filter(Boolean))];

const deriveProgramAreas = (organization) => {
  const challengeAreas = (organization.challenges || []).flatMap(
    (c) => CHALLENGE_TO_PROGRAM_AREAS[c] || []
  );
  return [
    ...new Set([
      ...(organization.programAreas || []),
      ...(organization.focusAreas || []),
      ...(organization.fundingPriorities || []),
      ...challengeAreas,
    ]),
  ];
};

const buildThematicKeywords = (organization) => {
  const agencyTypes = normalizeAgencyTypes(organization?.agencyTypes || []);
  const programAreas = deriveProgramAreas(organization || {});

  const textFields = [
    organization?.missionStatement,
    organization?.specificRequest,
    organization?.projectTitle,
    organization?.biggestChallenge,
    organization?.urgencyStatement,
    organization?.whobenefits,
    organization?.currentEquipment,
  ];

  const textTokens = [...new Set(textFields.flatMap(tokenize))];
  const challengeKeywords = (organization?.challenges || []).flatMap(
    (c) => CHALLENGE_TO_KEYWORDS[c] || []
  );
  const agencyTypeKeywords = agencyTypes.flatMap(
    (t) => AGENCY_TYPE_KEYWORDS[t] || [t.replace(/_/g, ' ')]
  );
  const programKeywords = programAreas.map((p) => String(p).toLowerCase().replace(/_/g, ' '));

  // agencyTypeKeywords intentionally excluded — agency type is already scored structurally
  // (step 1, up to 20 pts). Including them here inflates thematic scores identically for
  // every agency of the same type regardless of their actual stated needs.
  return [
    ...new Set([...programKeywords, ...challengeKeywords, ...textTokens]),
  ].filter((term) => term && !GENERIC_MATCH_TERMS.has(String(term).toLowerCase()));
};

const buildAgencyProfile = (organization) => {
  if (!organization) {
    return {
      agencyTypes: [],
      programAreas: [],
      tags: [],
      keywords: [],
      thematicKeywords: [],
      challengeKeywords: [],
      textTokens: [],
      eligibilityType: null,
    };
  }

  const agencyTypes = normalizeAgencyTypes(organization.agencyTypes || []);
  const programAreas = deriveProgramAreas(organization);
  const thematicKeywords = buildThematicKeywords(organization);

  const textFields = [
    organization.missionStatement,
    organization.specificRequest,
    organization.projectTitle,
    organization.biggestChallenge,
    organization.urgencyStatement,
    organization.whobenefits,
    organization.currentEquipment,
    organization.coverageArea,
    organization.goals?.join(' '),
    organization.mainProblems?.join(' '),
  ];

  const textTokens = [...new Set(textFields.flatMap(tokenize))];
  const challengeKeywords = (organization.challenges || []).flatMap(
    (c) => CHALLENGE_TO_KEYWORDS[c] || []
  );

  const tags = [
    ...new Set([
      ...agencyTypes,
      ...programAreas.map((p) => String(p).toLowerCase()),
      ...(organization.challenges || []),
      organization.eligibilityType,
      organization.serviceArea,
      ...thematicKeywords,
    ]),
  ].filter(Boolean);

  return {
    agencyTypes,
    programAreas,
    tags,
    keywords: thematicKeywords,
    thematicKeywords,
    challengeKeywords,
    textTokens,
    eligibilityType: organization.eligibilityType || null,
  };
};

const buildOpportunityCorpus = (opportunity) => {
  if (!opportunity) {
    return { keywords: [], textTokens: [], thematicTerms: [], allTerms: [] };
  }

  const keywordFields = [
    ...(opportunity.keywords || []),
    ...(opportunity.equipmentTags || []),
    ...(opportunity.publicSafetyKeywordsMatched || []),
    ...(opportunity.cfdaNumbers || []),
    opportunity.category,
    opportunity.fundingInstrument,
    opportunity.funder,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

  const textTokens = tokenize(`${opportunity.title || ''} ${opportunity.description || ''}`);

  // Thematic corpus excludes eligibleApplicants — those match every government agency
  const thematicTerms = [...new Set([...keywordFields, ...textTokens])];
  const eligibilityTerms = (opportunity.eligibleApplicants || [])
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

  const allTerms = [...new Set([...thematicTerms, ...eligibilityTerms])];

  return { keywords: keywordFields, textTokens, thematicTerms, allTerms, eligibilityTerms };
};

const countTermOverlap = (agencyTerms, oppTerms) => {
  const matched = [];
  let count = 0;

  for (const term of agencyTerms) {
    const normalized = String(term).toLowerCase().trim();
    if (normalized.length < 3 || GENERIC_MATCH_TERMS.has(normalized)) continue;

    const hit = oppTerms.some((opp) => {
      const o = String(opp).toLowerCase();
      return o.includes(normalized) || normalized.includes(o);
    });

    if (hit) {
      count += 1;
      matched.push(normalized);
    }
  }

  return { count, matched: [...new Set(matched)] };
};

const isNationalLocationFocus = (locationFocus) => {
  if (locationFocus == null) return true;
  if (!Array.isArray(locationFocus) || locationFocus.length === 0) return true;
  return locationFocus.some((f) => {
    const v = String(f).trim().toLowerCase();
    return v === 'national' || v === 'nationwide' || v === 'all states';
  });
};

const isOffDomainOpportunity = (profile, opportunity, corpus) => {
  const agencyTypes = profile?.agencyTypes || [];
  const isPublicSafetyAgency = agencyTypes.some((t) => PUBLIC_SAFETY_AGENCY_TYPES.has(t));
  if (!isPublicSafetyAgency) return false;

  if (agencyTypes.includes('hospitals') || agencyTypes.includes('school')) return false;

  const funder = String(opportunity?.funder || '').toLowerCase();
  const title = String(opportunity?.title || '').toLowerCase();
  const categories = (opportunity?.keywords || []).map((k) => String(k).toLowerCase());

  const looksOffDomain =
    OFF_DOMAIN_FUNDERS.some((f) => funder.includes(f)) ||
    OFF_DOMAIN_CATEGORY_FRAGMENTS.some(
      (frag) =>
        categories.some((c) => c.includes(frag)) ||
        title.includes(frag) ||
        funder.includes(frag)
    );

  if (!looksOffDomain) return false;

  const thematic = profile.thematicKeywords || profile.keywords || [];
  const { count } = countTermOverlap(thematic, corpus.thematicTerms || corpus.allTerms);
  return count < 2;
};

const DEFAULT_MIN_RELEVANCE_SCORE = Number(process.env.AGENCY_MIN_FIT_SCORE) || 50;

const isAgencyRelevant = (scored, profile, opportunity, corpus) => {
  const disqualifiers = scored.disqualifiers || [];

  if (disqualifiers.some((d) => d.includes('Deadline has already passed'))) return false;
  if (disqualifiers.some((d) => d.includes('Local match required'))) return false;
  if (disqualifiers.some((d) => d.includes('Off-domain opportunity'))) return false;
  if (disqualifiers.some((d) => d.includes('No thematic overlap') || d.includes('Low semantic relevance'))) return false;

  if ((scored.fitScore || 0) < DEFAULT_MIN_RELEVANCE_SCORE) return false;

  const thematicOverlap = scored.thematicOverlap || 0;
  const programKeyword = scored.breakdown?.programKeyword || 0;

  if (programKeyword === 0 && thematicOverlap < 2) return false;

  if (opportunity && corpus && isOffDomainOpportunity(profile, opportunity, corpus)) return false;

  return true;
};

module.exports = {
  AGENCY_TYPE_MAP,
  CHALLENGE_TO_PROGRAM_AREAS,
  buildAgencyProfile,
  buildOpportunityCorpus,
  buildThematicKeywords,
  countTermOverlap,
  deriveProgramAreas,
  isAgencyRelevant,
  isNationalLocationFocus,
  isOffDomainOpportunity,
  normalizeAgencyTypes,
  DEFAULT_MIN_RELEVANCE_SCORE,
};
