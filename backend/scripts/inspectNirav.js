const mongoose = require('mongoose');
require('dotenv').config();

async function inspectNirav() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cortiquant';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const nirav = await db.collection('users').findOne({
    $or: [{ username: /nirav/i }, { name: /nirav/i }, { email: /nirav/i }]
  });
  console.log('=== NIRAV USER RECORD ===');
  console.log(JSON.stringify(nirav, null, 2));

  if (nirav) {
    const org = await db.collection('organisations').findOne({
      $or: [
        { _id: nirav.organisationId },
        { organisationId: nirav.organisationId },
        { organisationCode: nirav.organisationCode }
      ]
    });
    console.log('=== NIRAV ORGANISATION ===');
    console.log(JSON.stringify(org, null, 2));
  }

  const logs = await db.collection('activities').find({
    $or: [
      { details: /nirav/i },
      { details: /EMP-1014/i }
    ]
  }).sort({ timestamp: -1, createdAt: -1 }).limit(10).toArray();
  console.log('=== NIRAV / EMP-1014 ACTIVITY LOGS ===');
  console.log(JSON.stringify(logs, null, 2));

  // Also inspect all users in FlyanyTrip
  const flyaOrg = await db.collection('organisations').findOne({
    $or: [{ organisationCode: 'FLYA5587' }, { code: 'FLYA5587' }, { name: /flyanytrip/i }]
  });
  console.log('=== FLYANYTRIP ORG ===');
  console.log(JSON.stringify(flyaOrg, null, 2));

  if (flyaOrg) {
    const flyaUsers = await db.collection('users').find({
      $or: [
        { organisationId: flyaOrg._id },
        { organisationId: flyaOrg.organisationId },
        { organisationCode: flyaOrg.organisationCode }
      ]
    }).toArray();
    console.log(`=== ALL FLYANYTRIP USERS (${flyaUsers.length}) ===`);
    for (const u of flyaUsers) {
      console.log(`Name: ${u.name} | Username: ${u.username} | Status: ${u.status} | Role: ${u.role} | OrgId: ${u.organisationId} | OrgCode: ${u.organisationCode} | empId: ${u.employeeId} | approvedAt: ${u.approvedAt}`);
    }
  }

  // Check counters
  const counters = await db.collection('counters').find({}).toArray();
  console.log('=== ALL COUNTERS ===');
  console.log(JSON.stringify(counters, null, 2));

  process.exit(0);
}

inspectNirav().catch(e => {
  console.error(e);
  process.exit(1);
});
