require('dotenv').config();
const m = require('mongoose');

m.connect(process.env.MONGO_URI).then(async () => {
  const matchService = require('./src/modules/matches/match.service');
  const Organization = require('./src/modules/organizations/organization.schema');
  const Match = require('./src/modules/matches/match.schema');
  
  const orgs = await Organization.find({ status: 'active' }).lean();
  console.log('Active orgs:', orgs.length);
  
  for (const org of orgs) {
    // Delete old matches first so nothing stale survives
    const del = await Match.deleteMany({ organization: org._id });
    console.log(`Deleted ${del.deletedCount} old matches for ${org.name}`);
    
    // Recompute with the NEW code
    await matchService.computeAllForOrganization(org._id);
    
    const relevant = await Match.countDocuments({ 
      organization: org._id, 
      isRelevant: true 
    });
    const total = await Match.countDocuments({ organization: org._id });
    console.log(`${org.name}: ${relevant} relevant / ${total} total`);
  }
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });