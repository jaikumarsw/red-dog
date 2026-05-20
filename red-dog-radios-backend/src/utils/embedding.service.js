const openai = require('../config/openai.config');

const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Cosine similarity between two equal-length float arrays.
 * Returns null if inputs are invalid, 0-1 otherwise.
 */
const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) return null;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

/**
 * Call OpenAI embeddings API. Returns float array or null on failure/unavailable.
 */
const generateEmbedding = async (text) => {
  if (!openai) return null;
  const clean = typeof text === 'string' ? text.trim() : '';
  if (clean.length < 3) return null;
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: clean.substring(0, 8000),
    });
    return response.data[0]?.embedding ?? null;
  } catch (err) {
    console.warn('[Embedding] Failed to generate embedding:', err.message);
    return null;
  }
};

/**
 * Build a rich natural-language text from an agency profile for embedding.
 * Includes all content fields — content richness directly drives semantic quality.
 * Agency type is included for context but content fields should dominate.
 */
const buildAgencyProfileText = (org) => {
  const parts = [
    org.agencyTypes?.map((t) => t.replace(/_/g, ' ')).join(', '),
    org.missionStatement,
    org.specificRequest,
    org.biggestChallenge,
    org.urgencyStatement,
    org.whobenefits,
    org.currentEquipment,
    org.coverageArea,
    org.projectTitle,
    org.challenges?.map((c) => c.replace(/_/g, ' ')).join(', '),
    org.programAreas?.join(', '),
    org.focusAreas?.join(', '),
    org.fundingPriorities?.join(', '),
    org.goals?.join('. '),
    org.mainProblems?.join(', '),
  ].filter(Boolean);
  return parts.join('. ');
};

/**
 * Build a rich natural-language text from a grant opportunity for embedding.
 */
const buildOpportunityText = (opp) => {
  const parts = [
    opp.title,
    opp.funder,
    opp.category,
    opp.description,
    opp.keywords?.join(', '),
    opp.equipmentTags?.join(', '),
    opp.publicSafetyKeywordsMatched?.join(', '),
    opp.eligibleApplicants?.join(', '),
  ].filter(Boolean);
  return parts.join('. ');
};

/**
 * Generate and persist the profile embedding for an Organization document.
 * Call this after any save that changes profile content fields.
 * Safe to call without awaiting — logs warnings on failure.
 */
const refreshOrgEmbedding = async (orgDoc) => {
  if (!openai) return;
  const text = buildAgencyProfileText(orgDoc);
  if (text.trim().length < 3) return;
  const embedding = await generateEmbedding(text);
  if (!embedding) return;
  try {
    const Organization = require('../modules/organizations/organization.schema');
    await Organization.findByIdAndUpdate(orgDoc._id, { profileEmbedding: embedding });
  } catch (err) {
    console.warn('[Embedding] Failed to save org embedding:', err.message);
  }
};

/**
 * Generate and persist the description embedding for an Opportunity document.
 * Call this after any save that changes content fields.
 */
const refreshOppEmbedding = async (oppDoc) => {
  if (!openai) return;
  const text = buildOpportunityText(oppDoc);
  if (text.trim().length < 3) return;
  const embedding = await generateEmbedding(text);
  if (!embedding) return;
  try {
    const Opportunity = require('../modules/opportunities/opportunity.schema');
    await Opportunity.findByIdAndUpdate(oppDoc._id, { descriptionEmbedding: embedding });
  } catch (err) {
    console.warn('[Embedding] Failed to save opp embedding:', err.message);
  }
};

/**
 * Backfill embeddings for all organizations and opportunities that don't have them yet.
 * Call once after deployment via the admin API to enable semantic matching on existing data.
 */
const backfillAllEmbeddings = async () => {
  if (!openai) return { orgs: 0, opps: 0, error: 'OpenAI not configured' };

  const Organization = require('../modules/organizations/organization.schema');
  const Opportunity = require('../modules/opportunities/opportunity.schema');

  const orgs = await Organization.find({ profileEmbedding: { $exists: false } }).lean();
  let orgsProcessed = 0;
  for (const org of orgs) {
    const text = buildAgencyProfileText(org);
    if (text.trim().length < 3) continue;
    const embedding = await generateEmbedding(text);
    if (embedding) {
      await Organization.findByIdAndUpdate(org._id, { profileEmbedding: embedding });
      orgsProcessed++;
    }
  }

  const opps = await Opportunity.find({ descriptionEmbedding: { $exists: false }, status: { $in: ['open', 'closing'] } }).lean();
  let oppsProcessed = 0;
  for (const opp of opps) {
    const text = buildOpportunityText(opp);
    if (text.trim().length < 3) continue;
    const embedding = await generateEmbedding(text);
    if (embedding) {
      await Opportunity.findByIdAndUpdate(opp._id, { descriptionEmbedding: embedding });
      oppsProcessed++;
    }
  }

  return { orgs: orgsProcessed, opps: oppsProcessed };
};

module.exports = {
  generateEmbedding,
  cosineSimilarity,
  buildAgencyProfileText,
  buildOpportunityText,
  refreshOrgEmbedding,
  refreshOppEmbedding,
  backfillAllEmbeddings,
};
