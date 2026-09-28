const mongoose = require('mongoose');
const { generateOrgEmployeeId, resolveOrgPrefix } = require('../services/employeeIdService');
const Organisation = require('../models/Organisation');
const User = require('../models/User');
require('dotenv').config();

async function testResolution() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cortiquant');
  const nirav = await User.findOne({ username: 'nirav' });
  console.log('Nirav organisationId type:', typeof nirav.organisationId, nirav.organisationId);

  // Let's test Organisation.findOne with nirav.organisationId
  const isObjId = mongoose.isValidObjectId(nirav.organisationId);
  console.log('isObjId:', isObjId);

  const orgDirect = await Organisation.findById(nirav.organisationId);
  console.log('orgDirect:', orgDirect ? orgDirect.name : 'NOT FOUND');

  const orgQuery = await Organisation.findOne({
    $or: [
      ...(isObjId ? [{ _id: nirav.organisationId }] : []),
      { organisationId: String(nirav.organisationId).trim().toUpperCase() },
      { organisationCode: String(nirav.organisationId).trim().toUpperCase() },
    ],
  });
  console.log('orgQuery in generateOrgEmployeeId:', orgQuery ? orgQuery.name : 'NOT FOUND');

  if (orgQuery) {
    console.log('resolveOrgPrefix(orgQuery):', resolveOrgPrefix(orgQuery));
  } else {
    console.log('resolveOrgPrefix(null):', resolveOrgPrefix(null));
  }

  // Also test Activity logs
  const db = mongoose.connection.db;
  const allLogs = await db.collection('activities').find({}).sort({ createdAt: -1 }).limit(20).toArray();
  console.log('Recent 5 activity logs:');
  for (const l of allLogs.slice(0, 5)) {
    console.log(`Action: ${l.action} | Details: ${l.details} | Org: ${l.organisationId} | At: ${l.createdAt || l.timestamp}`);
  }

  // Check if any activity has nirav
  const niravLog = await db.collection('activities').find({ details: { $regex: 'nirav', $options: 'i' } }).toArray();
  console.log('Activity log with nirav:', JSON.stringify(niravLog, null, 2));

  process.exit(0);
}

testResolution().catch(e => {
  console.error(e);
  process.exit(1);
});
