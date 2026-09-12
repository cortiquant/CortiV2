/**
 * Migration Script: Update Department Options Across CortiQuant Platform
 * 
 * Old -> New Mapping:
 * Engineering -> Tech & Product
 * Sales -> Sales & Marketing
 * HR -> Operations & Admin
 * Operations -> Research & Innovation
 * Finance -> Finance and Legal
 * Marketing -> Services / Delivery
 * Customer Support -> People & Support
 * Other -> Other
 */

const mongoose = require("mongoose")
require("dotenv").config()

const {
  DEPARTMENT_MAPPING,
  DEFAULT_DEPARTMENTS,
  ensureDepartmentsForOrg,
} = require("./services/departmentService")

async function runMigration() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error("MONGODB_URI not found in backend/.env")
  }

  console.log("Connecting to MongoDB Atlas...")
  await mongoose.connect(uri)
  console.log("Connected successfully.\n")

  console.log("=== 1. Updating 'departments' collection ===")
  for (const [oldName, newName] of Object.entries(DEPARTMENT_MAPPING)) {
    if (oldName === newName) continue
    const res = await mongoose.connection.collection("departments").updateMany(
      { name: oldName },
      { $set: { name: newName } }
    )
    console.log(`Department: '${oldName}' -> '${newName}' (Matched: ${res.matchedCount}, Modified: ${res.modifiedCount})`)
  }

  console.log("\n=== 2. Updating 'users' collection ===")
  for (const [oldName, newName] of Object.entries(DEPARTMENT_MAPPING)) {
    if (oldName === newName) continue
    const res = await mongoose.connection.collection("users").updateMany(
      { department: oldName },
      { $set: { department: newName } }
    )
    console.log(`Users: '${oldName}' -> '${newName}' (Matched: ${res.matchedCount}, Modified: ${res.modifiedCount})`)
  }

  console.log("\n=== 3. Updating 'corporateonboardings' collection ===")
  for (const [oldName, newName] of Object.entries(DEPARTMENT_MAPPING)) {
    if (oldName === newName) continue
    const res = await mongoose.connection.collection("corporateonboardings").updateMany(
      { "participantProfile.D3": oldName },
      { $set: { "participantProfile.D3": newName } }
    )
    console.log(`CorporateOnboardings D3: '${oldName}' -> '${newName}' (Matched: ${res.matchedCount}, Modified: ${res.modifiedCount})`)
  }

  console.log("\n=== 4. Updating 'assessments' collection ===")
  for (const [oldName, newName] of Object.entries(DEPARTMENT_MAPPING)) {
    if (oldName === newName) continue
    const res = await mongoose.connection.collection("assessments").updateMany(
      { department: oldName },
      { $set: { department: newName } }
    )
    console.log(`Assessments: '${oldName}' -> '${newName}' (Matched: ${res.matchedCount}, Modified: ${res.modifiedCount})`)
  }

  console.log("\n=== 5. Ensuring all standard default departments exist per organisation ===")
  const orgs = await mongoose.connection.collection("organisations").find({}).toArray()
  for (const org of orgs) {
    const orgId = org.organisationId || String(org._id)
    try {
      const depts = await ensureDepartmentsForOrg(orgId)
      console.log(`Organisation ${org.name || orgId} (${org.organisationCode || org.code}): ${depts.length} departments active.`)
    } catch (err) {
      console.warn(`Could not ensure departments for org ${orgId}:`, err.message)
    }
  }

  console.log("\n=== Migration completed successfully! ===")
  process.exit(0)
}

runMigration().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
