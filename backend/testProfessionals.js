const mongoose = require("mongoose")
const dotenv = require("dotenv")
const path = require("path")

dotenv.config({ path: path.join(__dirname, ".env") })

const Professional = require("./models/Professional")
const User = require("./models/User")
const { signToken } = require("./middleware/auth")

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
  return { status: res.status, ok: res.ok, data }
}

async function runTests() {
  console.log("=== RUNNING PROFESSIONALS MODULE AUTOMATED INTEGRATION TESTS ===")
  await mongoose.connect(process.env.MONGODB_URI)
  console.log("✓ Connected to MongoDB")

  const testSuffix = Math.floor(10000 + Math.random() * 90000)

  // 1. Create Admin User & Token
  const adminUser = await User.create({
    name: `Admin Tester ${testSuffix}`,
    username: `admin_prof_${testSuffix}`,
    email: `admin_prof_${testSuffix}@example.com`,
    passwordHash: "hash123",
    role: "admin",
    status: "Active",
    organisationId: "CQ_FOUNDER",
  })
  const adminToken = signToken(adminUser._id, { role: "admin" })
  console.log("✓ Admin token created")

  // 2. Test Admin Add Professional
  console.log("\n[TEST 1] Admin Add Professional...")
  const createPayload = {
    professionalName: `Dr. Kavita Rao ${testSuffix}`,
    occupation: "Clinical Psychologist",
    shortStats: "10+ years experience in workplace burnout and anxiety reduction.",
    qualification: "Ph.D. in Clinical Psychology, NIMHANS",
    consultationType: "Complimentary",
    phoneNumber: "+91 98765 43210",
    email: `kavita_${testSuffix}@cortiquant.com`,
    status: "Active",
  }

  const createRes = await req("POST", "/api/admin/professionals", createPayload, adminToken)
  console.log("Create professional status:", createRes.status, createRes.data.message)
  if (!createRes.ok || !createRes.data.success || !createRes.data.professional?.id) {
    throw new Error(`Failed to create professional: ${JSON.stringify(createRes.data)}`)
  }
  const profId = createRes.data.professional.id
  console.log("✓ Professional created successfully with ID:", profId)

  // 3. Test MongoDB Record Integrity
  console.log("\n[TEST 2] Verify MongoDB Record Integrity...")
  const profDb = await Professional.findById(profId).select("+phoneNumber")
  if (!profDb) throw new Error("Professional not found in MongoDB!")
  if (profDb.phoneNumber !== "+91 98765 43210") throw new Error("Phone number mismatch in MongoDB")
  if (profDb.consultationType !== "Complimentary") throw new Error("Consultation type mismatch")
  console.log("✓ MongoDB document verified with stored phone number and required fields")

  // 4. Test Public API - Phone Number Protection & Inactive Filtering
  console.log("\n[TEST 3] Public Support Directory API & Phone Number Protection...")
  const publicRes = await req("GET", "/api/professionals")
  if (!publicRes.ok || !publicRes.data.success) {
    throw new Error(`Failed to fetch public professionals: ${JSON.stringify(publicRes.data)}`)
  }

  const foundPublic = publicRes.data.data.find((p) => String(p.id) === String(profId) || String(p._id) === String(profId))
  if (!foundPublic) throw new Error("Newly added professional not found in public directory!")

  console.log("Public professional item:", foundPublic)
  if (foundPublic.phoneNumber) {
    throw new Error("SECURITY FAILURE: Phone number was exposed in public API response!")
  }
  if (foundPublic.email) {
    throw new Error("SECURITY FAILURE: Private email was exposed in public API response!")
  }
  console.log("✓ Phone number and email are strictly hidden from public API response.")

  // 5. Test WhatsApp Click-to-Chat Connect Endpoint
  console.log("\n[TEST 4] WhatsApp Click-to-Chat Connect Flow...")
  const connectRes = await req("POST", `/api/professionals/${profId}/connect`)
  console.log("Connect status:", connectRes.status, connectRes.data)
  if (!connectRes.ok || !connectRes.data.success || !connectRes.data.connectUrl) {
    throw new Error(`Connect endpoint failed: ${JSON.stringify(connectRes.data)}`)
  }

  const expectedUrl = "https://wa.me/919876543210?text=Hello%2C%20I%20would%20like%20to%20connect%20regarding%20professional%20support."
  if (connectRes.data.connectUrl !== expectedUrl) {
    throw new Error(`Unexpected connectUrl: expected '${expectedUrl}', got '${connectRes.data.connectUrl}'`)
  }
  if (connectRes.data.phoneNumber) {
    throw new Error("SECURITY FAILURE: Raw phone number exposed in connect response payload!")
  }
  console.log("✓ WhatsApp click-to-chat connect URL generated correctly:", connectRes.data.connectUrl)

  // 6. Test Admin Visibility Toggle (Active -> Inactive)
  console.log("\n[TEST 5] Admin Toggle Visibility (Active -> Inactive)...")
  const toggleRes = await req("PATCH", `/api/admin/professionals/${profId}/status`, { status: "Inactive" }, adminToken)
  if (!toggleRes.ok || !toggleRes.data.success) {
    throw new Error(`Status toggle failed: ${JSON.stringify(toggleRes.data)}`)
  }
  console.log("✓ Status toggled to Inactive")

  // Verify public API now excludes this inactive professional
  const publicResAfterInactive = await req("GET", "/api/professionals")
  const foundInactive = publicResAfterInactive.data.data.find((p) => String(p.id) === String(profId) || String(p._id) === String(profId))
  if (foundInactive) {
    throw new Error("FAILURE: Inactive professional appeared in public employee support directory!")
  }
  console.log("✓ Inactive professional is successfully hidden from public support directory.")

  // Verify connect endpoint rejects inactive professional
  const connectInactiveRes = await req("POST", `/api/professionals/${profId}/connect`)
  if (connectInactiveRes.status !== 400) {
    throw new Error(`Expected 400 for connecting to inactive professional, got: ${connectInactiveRes.status}`)
  }
  console.log("✓ Connect to inactive professional correctly rejected with 400.")

  // 7. Test Admin Edit
  console.log("\n[TEST 6] Admin Edit Professional...")
  const editRes = await req(
    "PUT",
    `/api/admin/professionals/${profId}`,
    {
      consultationType: "Paid",
      qualification: "Ph.D. NIMHANS, Licensed Practitioner",
      status: "Active",
    },
    adminToken
  )
  if (!editRes.ok || !editRes.data.success || editRes.data.professional.consultationType !== "Paid") {
    throw new Error(`Edit failed: ${JSON.stringify(editRes.data)}`)
  }
  console.log("✓ Professional updated to Paid and re-activated")

  // 8. Test Admin Delete
  console.log("\n[TEST 7] Admin Delete Professional...")
  const deleteRes = await req("DELETE", `/api/admin/professionals/${profId}`, null, adminToken)
  if (!deleteRes.ok || !deleteRes.data.success) {
    throw new Error(`Delete failed: ${JSON.stringify(deleteRes.data)}`)
  }
  const deletedCheck = await Professional.findById(profId)
  if (deletedCheck) throw new Error("Professional was not removed from MongoDB!")
  console.log("✓ Professional deleted successfully from MongoDB.")

  // 9. Clean up test admin
  await User.deleteOne({ _id: adminUser._id })
  console.log("✓ Cleaned up test admin user.")

  console.log("\n=======================================================")
  console.log("ALL PROFESSIONALS MODULE BACKEND TESTS PASSED (100%)!")
  console.log("=======================================================")
  process.exit(0)
}

runTests().catch((err) => {
  console.error("Test failed with error:", err)
  process.exit(1)
})
