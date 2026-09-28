const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllData() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cortiquant');
  const orgs = await mongoose.connection.db.collection('organisations').find({}).toArray();
  console.log('=== ALL ORGANISATIONS (' + orgs.length + ') ===');
  for (const o of orgs) {
    console.log({
      _id: o._id.toString(),
      name: o.name,
      organisationId: o.organisationId,
      organisationCode: o.organisationCode,
      employeeIdPrefix: o.employeeIdPrefix
    });
  }

  const allEmps = await mongoose.connection.db.collection('users').find({
    role: { $in: ['employee', 'Employee', 'EMPLOYEE'] }
  }).toArray();
  console.log('\n=== ALL EMPLOYEES (' + allEmps.length + ') ===');
  for (const e of allEmps) {
    console.log({
      _id: e._id.toString(),
      name: e.name,
      username: e.username,
      orgId: e.organisationId?.toString(),
      orgCode: e.organisationCode,
      status: e.status,
      employeeId: e.employeeId,
      approvedAt: e.approvedAt
    });
  }

  // Check if any employees in corporateonboardings
  const onbs = await mongoose.connection.db.collection('corporateonboardings').find({}).toArray();
  console.log('\n=== ONBOARDING RECORDS WITH EMPLOYEE ID (' + onbs.length + ') ===');
  for (const ob of onbs) {
    if (ob.employeeId) {
      console.log({
        userId: ob.userId?.toString(),
        employeeId: ob.employeeId
      });
    }
  }

  process.exit(0);
}

checkAllData().catch(e => {
  console.error(e);
  process.exit(1);
});
