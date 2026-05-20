'use strict';

const openai = require('../../config/openai.config');
const logger = require('../../utils/logger');

const SYSTEM_PROMPT = `You are a grant eligibility expert for U.S. public safety agencies \
(fire departments, EMS, police, sheriff, 911/dispatch, emergency management). Your job is to \
decide, for each grant, whether THIS specific agency could realistically and legitimately apply \
for and use it.

A grant is RELEVANT only if its funding purpose directly supports the agency's operational \
mission — equipment, staffing, training, communications, apparatus, facilities, or response \
capability for that type of public-safety agency.

A grant is NOT RELEVANT if it funds: medical/scientific research, academic studies, health \
programs unrelated to emergency response, environmental/geological work, education, social \
services, or programs for other sectors — EVEN IF it shares keywords like "fire", "emergency", \
or "medical".

Examples:
- "Rural EMS Training" for a fire/EMS agency → RELEVANT (operational training)
- "EMS for Children Pediatric Readiness" for an EMS agency → RELEVANT (operational)
- "Assistance to Firefighters Grant" for a fire dept → RELEVANT
- "Spinal Cord Injury Research Centers" → NOT RELEVANT (medical research)
- "Landslide Hazard Mapping" → NOT RELEVANT (geology)
- "Global Health Security" → NOT RELEVANT (health policy)

Be strict. When in doubt, lean toward NOT RELEVANT. A public safety agency should only see \
grants it could actually win and use.`;

/**
 * AI relevance judge. Evaluates a batch of grant opportunities against a single agency profile.
 *
 * @param {Object} agency - Organization document (plain object)
 * @param {Array<{id, title, funder, description, category}>} opportunities
 * @returns {Promise<Map<string, {relevant: boolean, reason: string}> | null>}
 *   Returns null if AI is unavailable or fails — caller should fall back to deterministic logic.
 */
async function judgeRelevanceBatch(agency, opportunities) {
  if (!openai) {
    logger.info('[AIRelevance] OpenAI not configured — skipping AI judge');
    return null;
  }
  if (!opportunities || opportunities.length === 0) return new Map();

  const agencyDesc = [
    `Agency: ${agency.name}`,
    `Type: ${(agency.agencyTypes || []).join(', ')}`,
    `Location: ${agency.location || 'N/A'}`,
    `Challenges: ${(agency.mainProblems || agency.challenges || []).join(', ')}`,
    `Funding priorities: ${(agency.fundingPriorities || []).join(', ')}`,
    `Specific need: ${agency.specificRequest || 'N/A'}`,
  ].join('\n');

  const grantList = opportunities.map((o, i) =>
    `[${i}] TITLE: ${o.title || 'N/A'}\nFUNDER: ${o.funder || 'N/A'}\nCATEGORY: ${o.category || 'N/A'}\nDESC: ${String(o.description || '').slice(0, 400)}`
  ).join('\n\n');

  const userPrompt = `AGENCY PROFILE:\n${agencyDesc}\n\nGRANTS TO EVALUATE:\n${grantList}\n\nFor each grant by index, decide if this agency should see it.\nReturn ONLY valid JSON, no markdown:\n{"results":[{"i":0,"relevant":true,"reason":"brief reason"},...]}\n`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '';
    const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    const map = new Map();
    for (const r of (parsed.results || [])) {
      const opp = opportunities[r.i];
      if (opp) map.set(opp.id, { relevant: !!r.relevant, reason: String(r.reason || '').slice(0, 200) });
    }
    logger.info(`[AIRelevance] Judged ${map.size}/${opportunities.length} for ${agency.name}`);
    return map;
  } catch (err) {
    logger.warn(`[AIRelevance] Judge failed for ${agency.name}: ${err.message}`);
    return null;
  }
}

module.exports = { judgeRelevanceBatch };
