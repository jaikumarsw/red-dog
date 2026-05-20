require('dotenv').config();
const m = require('mongoose');

m.connect(process.env.MONGO_URI).then(async () => {
  const { computeMatchScore } = require('./src/modules/matches/match.service');
  const Organization = require('./src/modules/organizations/organization.schema');
  const Opportunity = require('./src/modules/opportunities/opportunity.schema');

  const fireOrg = await Organization.findOne({ 
    name: /colorado springs fire/i 
  }).lean();
  
  const opps = await Opportunity.find({ 
    status: { $in: ['active', 'open', 'forecasted'] } 
  }).lean();

  // How many opps have empty agencyTypes?
  const noTypes = opps.filter(o => !o.agencyTypes || o.agencyTypes.length === 0).length;
  console.log(`Opps with EMPTY agencyTypes: ${noTypes} / ${opps.length}`);

  // Find FEMA / fire-relevant grants specifically
  const fireGrants = opps.filter(o => 
    /fire|safer|afg|firefighter|emergency response|first responder/i.test(
      (o.title || '') + ' ' + (o.description || '') + ' ' + (o.funder || '')
    )
  );
  console.log(`\nFire-relevant grants found: ${fireGrants.length}`);
  console.log('Scoring the first 10 against Colorado Springs Fire:\n');

  for (const opp of fireGrants.slice(0, 10)) {
    const r = computeMatchScore(fireOrg, opp);
    console.log(
      `fit:${r.fitScore} relevant:${r.isRelevant} ` +
      `typeScore:${r.breakdown?.agencyType ?? '?'} ` +
      `oppTypes:[${(opp.agencyTypes||[]).join(',')||'EMPTY'}] ` +
      `| ${(opp.title||'').slice(0,45)}`
    );
    if (r.disqualifiers?.length) {
      console.log(`   disqualifiers: ${r.disqualifiers.join('; ')}`);
    }
  }

  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
