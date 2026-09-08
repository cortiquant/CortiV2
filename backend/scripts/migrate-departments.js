/**
 * Safe Migration Script: Backfill Department IDs
 *
 * Ensures:
 * 1. Every existing organisation has its standard set of Department documents.
 * 2. Every existing employee with a department name gets their organization's matching departmentId.
 * 3. Every existing assessment gets backfilled with the employee's departmentId if missing.
 */
require("dotenv").config({ path: __dirname + "/../.env" })
const mongoose = require("mongoose")
const Organisation = require("../models/Organisation")
const Department = require("../models/Department")
const User = require("../models/User")
const Assessment = require("../models/Assessment")
const { ensureDepartmentsForOrg, getOrCreateDepartment } = require("../services/departmentService")

async function runMigration() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/cortiquant"
  console.log("[MIGRATION] Connecting to MongoDB at", uri)
  await mongoose.connect(uri)
  console.log("[MIGRATION] Connected successfully.")

  // 1. Ensure all organisations have department collections
  const organisations = await Organisation.find({})
  console.log(`[MIGRATION] Found ${organisations.length} organisations.`)

  for (const org of organisations) {
    const orgId = org.organisationId || String(org._id)
    console.log(`[MIGRATION] Ensuring departments for org: ${org.name} (${orgId})`)
    await ensureDepartmentsForOrg(orgId)
  }

  // 2. Backfill employees who have department name but no departmentId
  const employees = await User.find({
    role: "employee",
    $or: [
      { departmentId: { $exists: false } },
      { departmentId: null },
      { departmentId: "" },
    ],
  })

  console.log(`[MIGRATION] Found ${employees.length} employees needing departmentId backfill.`)

  let employeeCount = 0
  for (const emp of employees) {
    if (!emp.organisationId) continue

    // Resolve org
    const org = await Organisation.findOne({
      $or: [
        { organisationId: emp.organisationId },
        { _id: mongoose.isValidObjectId(emp.organisationId) ? emp.organisationId : null },
      ],
    })

    const canonicalOrgId = org ? org.organisationId : emp.organisationId
    const deptName = emp.department || emp.profile?.D3 || "Other"

    const deptDoc = await getOrCreateDepartment(canonicalOrgId, deptName)
    if (deptDoc) {
      emp.departmentId = deptDoc.departmentId
      emp.department = deptDoc.name
      await emp.save()
      employeeCount++
    }
  }
  console.log(`[MIGRATION] Backfilled ${employeeCount} employees with departmentId.`)

  // 3. Backfill assessments that are missing departmentId
  const assessments = await Assessment.find({
    $or: [
      { departmentId: { $exists: false } },
      { departmentId: null },
      { departmentId: "" },
    ],
  })

  console.log(`[MIGRATION] Found ${assessments.length} assessments needing departmentId backfill.`)

  let assessmentCount = 0
  for (const ass of assessments) {
    let emp = null
    if (ass.userId) {
      emp = await User.findById(ass.userId)
    } else if (ass.employeeId) {
      emp = await User.findOne({ employeeId: ass.employeeId })
    }

    if (emp && emp.departmentId) {
      ass.departmentId = emp.departmentId
      if (!ass.department && emp.department) {
        ass.department = emp.department
      }
      if (!ass.organisationId && emp.organisationId) {
        ass.organisationId = emp.organisationId
      }
      await ass.save()
      assessmentCount++
    }
  }

  console.log(`[MIGRATION] Backfilled ${assessmentCount} assessments with departmentId.`)
  console.log("[MIGRATION] Migration completed successfully.")
  await mongoose.disconnect()
}

runMigration().catch((err) => {
  console.error("[MIGRATION] Error:", err)
  process.exit(1)
})
