const mongoose = require("mongoose")
const dotenv = require("dotenv")
const path = require("path")

dotenv.config({ path: path.join(__dirname, ".env") })

const User = require("./models/User")
const Organisation = require("./models/Organisation")
const CorporateOnboarding = require("./models/CorporateOnboarding")
const Notification = require("./models/Notification")
const ActivityLog = require("./models/ActivityLog")
const { signToken } = require("./middleware/auth")
const { sendEmployeeApprovedEmail, sendEmployeeRejectedEmail } = require("./services/emailService")
const { sendEmployeeApprovalStatusEmail } = require("./services/notificationService")

const API_PORT = process.env.PORT || 3001

async function req(method, endpoint, body, token) {
  const res = await fetch(`http://localhost:${API_PORT}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json()
  return { status: res.status, data }
}

async function runTests() {
  console.log("=== RUNNING EMPLOYEE APPROVAL STATUS EMAIL NOTIFICATION TESTS ===")
  console.log("Connecting to MongoDB...")
  await mongoose.connect(process.env.MONGODB_URI)
  console.log("Connected to MongoDB successfully.")

  const testSuffix = Math.floor(10000 + Math.random() * 90000)
  const org1Code = `ORGA${testSuffix}`
  const org1Id = `CQ_A_${testSuffix}`
  const org2Code = `ORGB${testSuffix}`
  const org2Id = `CQ_B_${testSuffix}`

  // 1. Create 2 Organisations (for cross-org check)
  const org1 = await Organisation.create({
    name: "Alpha Corp",
    organisationId: org1Id,
    organisationCode: org1Code,
    status: "Active",
  })
  const org2 = await Organisation.create({
    name: "Beta Corp",
    organisationId: org2Id,
    organisationCode: org2Code,
    status: "Active",
  })
  console.log("✓ Created test organisations:", org1.name, org2.name)

  // 2. Create HR Admins
  const hr1 = await User.create({
    name: "HR Sarah",
    username: `hr_sarah_${testSuffix}`,
    email: `hr_sarah_${testSuffix}@example.com`,
    passwordHash: "hash123",
    role: "hr",
    status: "Active",
    organisationId: org1._id,
    organisationCode: org1Code,
  })
  const hr1Token = signToken(hr1._id, { role: "hr", organisationId: org1._id })

  const hr2 = await User.create({
    name: "HR David",
    username: `hr_david_${testSuffix}`,
    email: `hr_david_${testSuffix}@example.com`,
    passwordHash: "hash123",
    role: "hr",
    status: "Active",
    organisationId: org2._id,
    organisationCode: org2Code,
  })
  const hr2Token = signToken(hr2._id, { role: "hr", organisationId: org2._id })
  console.log("✓ Created HR administrators for org 1 and org 2")

  // 3. Create Employee 1 (Alice) under Org 1
  const alice = await User.create({
    name: "Alice Walker",
    username: `alice_${testSuffix}`,
    email: `alice_${testSuffix}@example.com`,
    passwordHash: "hash123",
    role: "employee",
    status: "PendingApproval",
    organisationId: org1._id,
    organisationCode: org1Code,
    onboardingCompleted: true,
  })
  console.log("✓ Created Employee Alice under Alpha Corp:", alice.email)

  // 4. Test Cross-Organisation Security (HR David cannot approve Alice)
  console.log("\n[TEST 1] Cross-Organisation Access Control...")
  const crossApproveRes = await req("POST", `/api/hr/approve/${alice._id}`, null, hr2Token)
  console.log("Cross approve status:", crossApproveRes.status, crossApproveRes.data.message)
  if (crossApproveRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for cross-org approve, got: ${crossApproveRes.status}`)
  }
  console.log("✓ Cross-organisation approve correctly blocked with 403 Forbidden.")

  // 5. Test Approval Workflow (HR Sarah approves Alice)
  console.log("\n[TEST 2] Employee Approval Workflow & Email Dispatch...")
  const approveRes = await req("POST", `/api/hr/approve/${alice._id}`, null, hr1Token)
  console.log("Approve response:", approveRes.status, approveRes.data.message)
  if (!approveRes.data.success || !approveRes.data.user?.employeeId) {
    throw new Error(`Approval failed: ${JSON.stringify(approveRes.data)}`)
  }

  // Poll for async email dispatch to complete and populate approvalEmailSentAt
  let aliceDb = null
  for (let i = 0; i < 20; i++) {
    aliceDb = await User.findById(alice._id)
    if (aliceDb && aliceDb.approvalEmailSentAt) break
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log("Alice status after approval:", aliceDb.status)
  console.log("Alice employeeId:", aliceDb.employeeId)
  console.log("Alice approvalEmailSentAt:", aliceDb.approvalEmailSentAt)

  if (aliceDb.status !== "Active") throw new Error("Alice status is not Active")
  if (!aliceDb.approvalEmailSentAt) throw new Error("approvalEmailSentAt timestamp was not populated on User!")

  // Check Notification record
  const approveNotif = await Notification.findOne({
    recipientId: alice._id,
    type: "EMPLOYEE_APPROVED",
  })
  if (!approveNotif) throw new Error("Notification record for EMPLOYEE_APPROVED was not created!")
  console.log("✓ EMPLOYEE_APPROVED Notification record found:", {
    type: approveNotif.type,
    status: approveNotif.status,
    title: approveNotif.title,
    sentAt: approveNotif.sentAt,
  })

  // 6. Test Duplicate Email Prevention on Approval
  console.log("\n[TEST 3] Duplicate Email Prevention for Approval...")
  const dupCheck = await sendEmployeeApprovalStatusEmail(aliceDb, "Approved")
  console.log("Duplicate approval check result:", dupCheck)
  if (!dupCheck.skipped || dupCheck.reason !== "Approval email already sent.") {
    throw new Error(`Expected duplicate skip, got: ${JSON.stringify(dupCheck)}`)
  }
  console.log("✓ Duplicate approval email dispatch successfully intercepted and skipped.")

  // 7. Test Rejection Workflow (HR Sarah rejects Bob)
  console.log("\n[TEST 4] Employee Rejection Workflow & Email Dispatch...")
  const bob = await User.create({
    name: "Bob Stone",
    username: `bob_${testSuffix}`,
    email: `bob_${testSuffix}@example.com`,
    passwordHash: "hash123",
    role: "employee",
    status: "PendingApproval",
    organisationId: org1._id,
    organisationCode: org1Code,
    onboardingCompleted: true,
  })

  const rejectReason = "Unable to verify employment credentials in HR database."
  const rejectRes = await req("POST", `/api/hr/reject/${bob._id}`, { reason: rejectReason }, hr1Token)
  console.log("Reject response:", rejectRes.status, rejectRes.data.message)
  if (!rejectRes.data.success) {
    throw new Error(`Rejection failed: ${JSON.stringify(rejectRes.data)}`)
  }

  // Poll for async email dispatch to complete and populate rejectionEmailSentAt
  let bobDb = null
  for (let i = 0; i < 20; i++) {
    bobDb = await User.findById(bob._id)
    if (bobDb && bobDb.rejectionEmailSentAt) break
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log("Bob status after rejection:", bobDb.status)
  console.log("Bob rejectionReason:", bobDb.rejectionReason)
  console.log("Bob rejectionEmailSentAt:", bobDb.rejectionEmailSentAt)

  if (bobDb.status !== "Rejected") throw new Error("Bob status is not Rejected")
  if (bobDb.rejectionReason !== rejectReason) throw new Error("Bob rejectionReason was not preserved")
  if (!bobDb.rejectionEmailSentAt) throw new Error("rejectionEmailSentAt timestamp was not populated on User!")

  // Check Notification record for Bob
  const rejectNotif = await Notification.findOne({
    recipientId: bob._id,
    type: "EMPLOYEE_REJECTED",
  })
  if (!rejectNotif) throw new Error("Notification record for EMPLOYEE_REJECTED was not created!")
  console.log("✓ EMPLOYEE_REJECTED Notification record found:", {
    type: rejectNotif.type,
    status: rejectNotif.status,
    title: rejectNotif.title,
    sentAt: rejectNotif.sentAt,
  })

  // 8. Test Duplicate Email Prevention on Rejection
  console.log("\n[TEST 5] Duplicate Email Prevention for Rejection...")
  const dupRejectCheck = await sendEmployeeApprovalStatusEmail(bobDb, "Rejected")
  console.log("Duplicate rejection check result:", dupRejectCheck)
  if (!dupRejectCheck.skipped || dupRejectCheck.reason !== "Rejection email already sent.") {
    throw new Error(`Expected duplicate skip, got: ${JSON.stringify(dupRejectCheck)}`)
  }
  console.log("✓ Duplicate rejection email dispatch successfully intercepted and skipped.")

  // 9. Clean up test data
  console.log("\nCleaning up test records...")
  await User.deleteMany({ _id: { $in: [hr1._id, hr2._id, alice._id, bob._id] } })
  await Organisation.deleteMany({ _id: { $in: [org1._id, org2._id] } })
  await Notification.deleteMany({ recipientId: { $in: [alice._id, bob._id] } })
  await ActivityLog.deleteMany({ entityId: { $in: [alice._id, bob._id] } })
  console.log("✓ Cleaned up test data.")

  console.log("\n=======================================================")
  console.log("ALL EMPLOYEE APPROVAL/REJECTION EMAIL TESTS PASSED (100%)!")
  console.log("=======================================================")
  process.exit(0)
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
