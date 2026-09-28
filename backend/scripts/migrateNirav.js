const mongoose = require('mongoose');
require('dotenv').config();

async function migrateNirav() {
  console.log("=== MIGRATING NIRAV EMPLOYEE ID TO FLYA PREFIX ===");
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cortiquant";
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const nirav = await db.collection('users').findOne({ username: 'nirav' });
  if (!nirav) {
    throw new Error("Nirav user not found!");
  }

  console.log(`Found Nirav: current employeeId = '${nirav.employeeId}', status = '${nirav.status}'`);

  const flyaCounter = await db.collection('counters').findOne({ _id: 'employeeId_FLYA' });
  const currentSeq = flyaCounter ? flyaCounter.seq : 1005;
  const targetSeq = currentSeq + 1;
  const newEmployeeId = `FLYA-${targetSeq}`;

  console.log(`Current counter seq for FLYA: ${currentSeq}. New employeeId will be: ${newEmployeeId}`);

  // 1. Update Nirav user record
  const updateRes = await db.collection('users').updateOne(
    { _id: nirav._id },
    { $set: { employeeId: newEmployeeId } }
  );
  console.log(`Updated Nirav in 'users': matched ${updateRes.matchedCount}, modified ${updateRes.modifiedCount}`);

  // 2. Update counter
  await db.collection('counters').updateOne(
    { _id: 'employeeId_FLYA' },
    { $set: { seq: targetSeq } },
    { upsert: true }
  );
  console.log(`Updated Counter 'employeeId_FLYA' to seq: ${targetSeq}`);

  // 3. Update corporateonboardings
  const onbRes = await db.collection('corporateonboardings').updateMany(
    { userId: nirav._id },
    { $set: { employeeId: newEmployeeId } }
  );
  console.log(`Updated CorporateOnboardings for Nirav: modified ${onbRes.modifiedCount}`);

  // 4. Update activity log
  const logRes = await db.collection('activitylogs').updateMany(
    {
      $or: [
        { entityId: nirav._id, action: "Approved Employee" },
        { details: /Approved Employee EMP-1014/i }
      ]
    },
    {
      $set: {
        details: `Approved Employee ${newEmployeeId} (${nirav.name})`
      }
    }
  );
  console.log(`Updated ActivityLogs for Nirav approval: modified ${logRes.modifiedCount}`);

  // Verify Nirav record now
  const verifyNirav = await db.collection('users').findOne({ _id: nirav._id });
  console.log(`Verification: Nirav employeeId is now: ${verifyNirav.employeeId}`);

  const verifyLogs = await db.collection('activitylogs').find({ entityId: nirav._id }).toArray();
  console.log(`Verification Activity Logs:`);
  for (const l of verifyLogs) {
    console.log(`- ${l.action}: ${l.details}`);
  }

  process.exit(0);
}

migrateNirav().catch(e => {
  console.error(e);
  process.exit(1);
});
