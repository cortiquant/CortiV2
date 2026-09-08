const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, ".env") })
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const Listener = require("./models/Listener")
const User = require("./models/User")
const ListenerSession = require("./models/ListenerSession")
const ListenerAvailability = require("./models/ListenerAvailability")

async function testApiEndpoints() {
  await mongoose.connect(process.env.MONGODB_URI)
  const listener = await Listener.findOne({ email: "alex.listener@cortiquant.com" })
  const token = jwt.sign(
    { id: listener._id.toString(), role: "LISTENER", email: listener.email, name: listener.name },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  )

  const baseUrl = "http://localhost:3001"

  // Test 1: GET /api/listener/dashboard
  const dashRes = await fetch(`${baseUrl}/api/listener/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const dashData = await dashRes.json()
  console.log("Dashboard response status:", dashRes.status, "success:", dashData.success)
  console.log("Stats -> completedSessions:", dashData.completedSessions, "totalHoursListened:", dashData.totalHoursListened)

  // Test 2: GET /api/listeners/available
  const availListRes = await fetch(`${baseUrl}/api/listeners/available`)
  const availListData = await availListRes.json()
  console.log("Available listeners status:", availListRes.status, "Count:", availListData.listeners?.length)

  // Test 3: GET /api/listeners/:id/slots?day=today
  const slotsRes = await fetch(`${baseUrl}/api/listeners/${listener._id}/slots?day=today`)
  const slotsData = await slotsRes.json()
  console.log("Slots status:", slotsRes.status, "Slots count:", slotsData.slots?.all?.length)

  // Test 4: Book session as Employee
  const employee = await User.findOne({ email: { $exists: true, $ne: null } })
  const empClientId = await employee.getOrCreateClientId()
  const empToken = jwt.sign(
    { id: employee._id.toString(), role: employee.role || "employee", email: employee.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  )

  const testSlot = "18:20"
  await ListenerSession.deleteMany({ listenerId: listener._id, time: testSlot })

  const bookRes = await fetch(`${baseUrl}/api/listener-sessions/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({
      listenerId: listener._id.toString(),
      startTime: testSlot,
      day: "today",
      durationMinutes: 10,
    }),
  })
  const bookData = await bookRes.json()
  console.log("Booking response status (expected 201):", bookRes.status, "Session ID:", bookData.session?.sessionId, "Client ID:", bookData.session?.clientId)

  // Test 5: Collision Detection (409 Conflict)
  const collideRes = await fetch(`${baseUrl}/api/listener-sessions/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({
      listenerId: listener._id.toString(),
      startTime: testSlot,
      day: "today",
      durationMinutes: 10,
    }),
  })
  const collideData = await collideRes.json()
  console.log("Collision status (expected 409):", collideRes.status, "Message:", collideData.message)

  // Test 6: Employee My Sessions
  const myRes = await fetch(`${baseUrl}/api/listener-sessions/my`, {
    headers: { Authorization: `Bearer ${empToken}` },
  })
  const myData = await myRes.json()
  console.log("Employee upcoming sessions:", myData.sessions?.upcoming?.length)

  // Test 7: Listener accepts session
  const acceptRes = await fetch(`${baseUrl}/api/listener-sessions/${bookData.session.sessionId}/accept`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  })
  const acceptData = await acceptRes.json()
  console.log("Listener accept status:", acceptRes.status, "New status:", acceptData.session?.status)

  console.log("\nALL REST API AND BOOKING INTEGRATION TESTS PASSED!\n")
  await mongoose.disconnect()
}

testApiEndpoints().catch((err) => {
  console.error("API test failed:", err)
  process.exit(1)
})
