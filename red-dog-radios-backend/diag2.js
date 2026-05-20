require('dotenv').config();
const m = require('mongoose');

m.connect(process.env.MONGO_URI).then(async () => {
  const { computeMatchScore } = require('./src/modules/matches/match.service');
  const agencyTags = require('./src/utils/agencyProfileTags');
  const Organization = require('./src/modules/organizations/organization.schema');
  const Opportunity = require('./src/modules/opportunities/opportunity.schema');

  const fire = await Organization.findOne({ name: /colorado springs fire/i }).lean();

  // Show what keywords the agency profile produces now (post Fix 2)
  if (agencyTags.buildAgencyProfile) {
    const profile = agencyTags.buildAgencyProfile(fire);
    console.log('Agency thematic keywords:', JSON.stringify(profile.thematicKeywords || profile.keywords || profile, null, 2).slice(0, 800));
  }
  console.log('---');

  const opps = await Opportunity.find({ status: { $in: ['active','open','forecasted'] } }).lean();

  // Find clearly-fire grants by title/funder
  const fireGrants = opps.filter(o =>
    /firefighter|fire department|safer|assistance to firefighters|\bafg\b|emergency medical|ambulance|\bems\b|paramedic/i.test(
      (o.title||'')+' '+(o.description||'')+' '+(o.funder||'')
    )
  );
  console.log('Clearly fire/EMS grants found:', fireGrants.length, '\n');

  for (const opp of fireGrants.slice(0, 8)) {
    const r = computeMatchScore(fire, opp);
    console.log(`relevant:${r.isRelevant} fit:${r.fitScore} type:${r.breakdown?.agencyType} kw:${r.breakdown?.programKeyword} thematic:${r._thematicOverlap ?? '?'}`);
    console.log(`   ${(opp.title||'').slice(0,60)} | ${opp.funder} | cat:${opp.category}`);
    if (r.disqualifiers?.length) console.log(`   DQ: ${r.disqualifiers.join('; ')}`);
    console.log('');
  }

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });