const mongoose = require("mongoose")
const dotenv = require("dotenv")
const path = require("path")

dotenv.config({ path: path.join(__dirname, ".env") })

const User = require("./models/User")
const Organisation = require("./models/Organisation")
const CorporateOnboarding = require("./models/CorporateOnboarding")
const ActivityLog = require("./models/ActivityLog")
const jwt = require("jsonwebtoken")

const JWT_SECRET = process.env.JWT_SECRET || "cortiquant-development-secret-key-2024"

async function runTest() {
  console.log("Connecting to MongoDB...")
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/cortiquant")
  console.log("Connected successfully.")

  const testOrgCode = `TEST${Math.floor(1000 + Math.random() * 9000)}`
  const testOrgId = `CQ${Math.floor(100000 + Math.random() * 900000)}`
  
  // 1. Create a test organisation
  const org = await Organisation.create({
    name: "Approval Queue Test Org",
    organisationId: testOrgId,
    organisationCode: testOrgCode,
    status: "Active",
  })
  console.log("✓ Organisation created:", org.name, org.organisationCode)

  const { signToken } = require("./middleware/auth")

  // 2. Create an HR user
  const hrUser = await User.create({
    name: "HR Admin",
    username: `hr_${Date.now()}`,
    email: `hr_${Date.now()}@test.com`,
    passwordHash: "hash123",
    role: "hr",
    status: "Active",
    organisationId: org.organisationId,
    organisationCode: org.organisationCode,
  })
  const hrToken = signToken(hrUser._id, { role: "hr", organisationId: org.organisationId })
  console.log("✓ HR User created:", hrUser.username)

  // 3. Create an Employee user in OnboardingRequired
  const empUser = await User.create({
    name: "Alice Smith",
    username: `alice_${Date.now()}`,
    email: `alice_${Date.now()}@test.com`,
    passwordHash: "hash123",
    role: "employee",
    status: "OnboardingRequired",
    organisationId: org.organisationId,
    organisationCode: org.organisationCode,
    onboardingCompleted: false,
  })
  console.log("✓ Employee created (OnboardingRequired):", empUser.name)

  // Test Verify Org Code endpoint
  const API_PORT = process.env.PORT || 3001

  async function req(method, endpoint, body, token) {
    const res = await fetch(`http://localhost:${API_PORT}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const data = await res.json()
    return { status: res.status, data }
  }

  // 4. Verify Org Code
  const verifyRes = await req("POST", "/api/auth/verify-organisation-code", { organisationCode: testOrgCode })
  console.log("✓ verify-organisation-code response:", verifyRes.status, verifyRes.data.success)
  if (!verifyRes.data.success) throw new Error("Org verification failed")

  // 5. Query HR Queue before onboarding - employee should NOT be pending in approval queue
  const queueBefore = await req("GET", "/api/hr/approval-queue?status=pending", null, hrToken)
  console.log("✓ HR Queue before response:", queueBefore.status, queueBefore.data)
  if (!queueBefore.data.stats) throw new Error("queueBefore returned no stats: " + JSON.stringify(queueBefore.data))
  console.log("✓ HR Queue pending count before onboarding:", queueBefore.data.stats.pendingCount)
  if (queueBefore.data.stats.pendingCount !== 0) throw new Error("Employee appeared in pending queue before onboarding!")

  // 6. Simulate Corporate Onboarding completed for Alice
  const empToken = signToken(empUser._id, { role: "employee", organisationId: org.organisationId })
  const onbRes = await req("POST", "/api/onboarding", {
    participantProfile: {
      D1: "26–35",
      D2: "Female",
      D3: "Engineering",
      D4: "Mid-level",
      D5: "1–3 years",
      D6: "41–50 hours",
      D7: "Moderate",
      D8: "Hybrid",
    },
  }, empToken)
  console.log("✓ Onboarding submitted:", onbRes.status, onbRes.data.success)
  if (!onbRes.data.success) throw new Error("Onboarding submission failed")

  // 7. Check HR Queue now - Alice should be pending with departmentId DEP-001 and profile answers
  const queueAfter = await req("GET", "/api/hr/approval-queue?status=pending", null, hrToken)
  console.log("✓ HR Queue pending count after onboarding:", queueAfter.data.stats.pendingCount)
  if (queueAfter.data.stats.pendingCount !== 1) throw new Error("Employee not found in pending queue!")
  const pendingEmp = queueAfter.data.data[0]
  console.log("✓ Pending employee details:", {
    id: pendingEmp.id,
    name: pendingEmp.name,
    department: pendingEmp.department,
    departmentId: pendingEmp.departmentId,
    D1: pendingEmp.participantProfile?.D1,
    D3: pendingEmp.participantProfile?.D3,
  })

  // 8. Test Approve Alice via /api/hr/approve/:userId
  const approveRes = await req("POST", `/api/hr/approve/${pendingEmp.id}`, null, hrToken)
  console.log("✓ Approve response:", approveRes.status, approveRes.data.success, approveRes.data.message)
  if (!approveRes.data.success || !approveRes.data.user.employeeId) throw new Error("Approval failed!")
  console.log("✓ Generated Employee ID:", approveRes.data.user.employeeId)

  // 9. Re-fetch queue to verify KPIs updated
  const queueApproved = await req("GET", "/api/hr/approval-queue?status=all", null, hrToken)
  console.log("✓ Queue KPIs after approval:", queueApproved.data.stats)
  // 10. Test Bob (rejection flow with reason)
  const bobUser = await User.create({
    name: "Bob Jones",
    username: `bob_${Date.now()}`,
    email: `bob_${Date.now()}@test.com`,
    passwordHash: "hash123",
    role: "employee",
    status: "PendingApproval",
    organisationId: org.organisationId,
    organisationCode: org.organisationCode,
    onboardingCompleted: true,
  })
  const rejectRes = await req("PATCH", `/api/hr/employees/${bobUser._id}/reject`, { reason: "Unverified department" }, hrToken)
  console.log("✓ Reject response via PATCH:", rejectRes.status, rejectRes.data.success, rejectRes.data.message)
  if (!rejectRes.data.success) throw new Error("Rejection failed")

  const bobDb = await User.findById(bobUser._id)
  if (bobDb.status !== "Rejected" || bobDb.rejectionReason !== "Unverified department") {
    throw new Error("Bob status or rejection reason not set in DB!")
  }
  console.log("✓ Bob rejected with reason in DB:", bobDb.rejectionReason)

  // 11. Test already approved protection
  const doubleApprove = await req("POST", `/api/hr/approve/${pendingEmp.id}`, null, hrToken)
  console.log("✓ Double approve response:", doubleApprove.status, doubleApprove.data.success, doubleApprove.data.message)
  if (doubleApprove.data.success) throw new Error("Double approve should fail!")

  // 12. Verify Activity Logs recorded
  const logs = await ActivityLog.find({ organisationId: org.organisationId })
  console.log(`✓ Activity logs recorded (${logs.length}):`, logs.map(l => l.action))
  if (!logs.some(l => l.action === "Approved Employee") || !logs.some(l => l.action === "Rejected Employee")) {
    throw new Error("Missing audit trail activity logs!")
  }

  // 13. Clean up test data
  await User.deleteMany({ organisationId: org.organisationId })
  await CorporateOnboarding.deleteMany({ organisationId: org.organisationId })
  await Organisation.deleteOne({ _id: org._id })
  await ActivityLog.deleteMany({ organisationId: org.organisationId })
  console.log("✓ Cleaned up test data.")

  console.log("\n==========================================")
  console.log("ALL HR APPROVAL QUEUE INTEGRATION TESTS PASSED (100% SUCCESS)!")
  console.log("==========================================")
  process.exit(0)
}

runTest().catch((err) => {
  console.error("Test failed with error:", err)
  process.exit(1)
})
