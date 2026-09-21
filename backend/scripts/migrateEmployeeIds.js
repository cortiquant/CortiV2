require("dotenv").config()
const mongoose = require("mongoose")
const { backfillMissingEmployeeIds } = require("../services/employeeIdService")

async function runMigration() {
  console.log("=== RUNNING EMPLOYEE ID BACKFILL & MIGRATION ===")
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cortiquant"
  await mongoose.connect(uri)
  console.log("Connected to MongoDB:", uri)

  const results = await backfillMissingEmployeeIds()
  console.log(`\nBackfilled ${results.length} employee(s):`)
  results.forEach((r) => {
    console.log(`- ${r.name} (${r.email || "no-email"}) [Org: ${r.organisationCode}]: Assigned ID ${r.employeeId}`)
  })

  console.log("\nMigration completed successfully.")
  process.exit(0)
}

runMigration().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
