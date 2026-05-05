require('dotenv').config();
const m = require('mongoose');

m.connect(process.env.MONGO_URI).then(async () => {
  const db = m.connection.db;
  
  const replies = await db.collection('replies')
    .find({ ashleenAnalysis: { $exists: true, $ne: null } })
    .toArray();
  
  let updated = 0;
  
  for (const r of replies) {
    if (!r.commLogId) {
      console.log('Skipping reply', r._id, '- no commLogId');
      continue;
    }
    
    const result = await db.collection('communicationlogs').updateOne(
      { _id: r.commLogId },
      { 
        $set: {
          ashleenAnalysis: r.ashleenAnalysis,
          ashleenSuggestion: r.ashleenSuggestion,
          ashlynSuggestion: r.ashleenSuggestion,
        }
      }
    );
    
    console.log(
      'Reply', r._id, 
      '→ CommLog', r.commLogId,
      '| matched:', result.matchedCount,
      '| modified:', result.modifiedCount
    );
    
    if (result.modifiedCount > 0) updated++;
  }
  
  console.log('\nTotal updated:', updated);
  
  // Verify
  const inbound = await db.collection('communicationlogs')
    .find({ direction: 'inbound' })
    .toArray();
  
  console.log('\nVerification:');
  for (const l of inbound) {
    console.log(
      'CommLog', l._id,
      '| analysis now:', (l.ashleenAnalysis || 'STILL EMPTY').slice(0, 80)
    );
  }
  
  process.exit(0);
}).catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});