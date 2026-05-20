require('dotenv').config();
const m = require('mongoose');
m.connect(process.env.MONGO_URI).then(async () => {
  const Opp = require('./src/modules/opportunities/opportunity.schema');
  const all = await Opp.find({ status: { $in: ['active','open','forecasted'] } }).lean();

  const fireEms = all.filter(o => /firefighter|fire department|fire service|\bsafer\b|assistance to firefighters|\bafg\b|emergency medical service|\bems\b|paramedic|ambulance|first responder|turnout|fire apparatus|interoperab/i.test((o.title||'')+' '+(o.description||'')));
  const police = all.filter(o => /law enforcement|police|sheriff|community policing|\bcops\b|body.?worn|criminal justice/i.test((o.title||'')+' '+(o.description||'')));
  const emergMgmt = all.filter(o => /emergency management|all.?hazards|homeland security|preparedness grant|\buasi\b|\bshsp\b/i.test((o.title||'')+' '+(o.description||'')));

  console.log('Total active opps:', all.length);
  console.log('Fire/EMS operational:', fireEms.length);
  console.log('Police/law enforcement:', police.length);
  console.log('Emergency management:', emergMgmt.length);
  console.log('\nFire/EMS grant titles:');
  fireEms.forEach(o => console.log('  -', (o.title||'').slice(0,60), '|', o.funder));

  process.exit(0);
}).catch(e=>{console.error(e);process.exit(1);});