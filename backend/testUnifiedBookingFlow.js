const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, ".env") })
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const Listener = require("./models/Listener")
const User = require("./models/User")
const ListenerSession = require("./models/ListenerSession")
const ListenerAvailability = require("./models/ListenerAvailability")

async function runTest() {
  console.log("=== STARTING FULL SCENARIO INTEGRATION TEST ===")
  await mongoose.connect(process.env.MONGODB_URI)
  const baseUrl = "http://localhost:3001"

  // 1. Get listener
  let listener = await Listener.findOne({ email: "alex.listener@cortiquant.com" })
  if (!listener) {
    listener = await Listener.findOne({ status: "Active" })
  }
  if (!listener) throw new Error("No active listener found")

  const listenerToken = jwt.sign(
    { id: listener._id.toString(), role: "LISTENER", email: listener.email, name: listener.name },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  )

  // 2. Get employee 1 and employee 2
  const employees = await User.find({ email: { $exists: true, $ne: null } }).limit(2)
  const employee1 = employees[0]
  const employee2 = employees[1] || employees[0]

  const emp1Token = jwt.sign(
    { id: employee1._id.toString(), role: employee1.role || "employee", email: employee1.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  )
  const emp2Token = jwt.sign(
    { id: employee2._id.toString(), role: employee2.role || "employee", email: employee2.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  )

  // Clean previous test sessions / availability for this listener
  await ListenerSession.deleteMany({ listenerId: listener._id, time: { $in: ["09:10", "09:30", "10:00"] } })
  await ListenerAvailability.deleteMany({ listenerId: listener._id, time: { $in: ["09:10", "09:30", "10:00"] } })

  console.log("\n[STEP 1-5]: Listener sets availability: 09:10, 09:30, 10:00 for Today")
  const saveAvailRes = await fetch(`${baseUrl}/api/listener/availability`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${listenerToken}`,
    },
    body: JSON.stringify({
      slots: ["09:10", "09:30", "10:00"],
      day: "today",
    }),
  })
  const saveAvailData = await saveAvailRes.json()
  console.log("Save availability response:", saveAvailRes.status, saveAvailData)
  if (!saveAvailData.success) throw new Error("Failed to save listener availability")

  console.log("\n[STEP 6-9]: Employee fetches slots for listener")
  const empSlotsRes = await fetch(`${baseUrl}/api/listeners/${listener._id}/slots?day=today`)
  const empSlotsData = await empSlotsRes.json()
  console.log("Employee slots status:", empSlotsRes.status, "Slots:", empSlotsData.slots?.all)
  const expectedSlots = ["09:10", "09:30", "10:00"]
  const matched = expectedSlots.every(s => empSlotsData.slots?.all?.includes(s)) && empSlotsData.slots?.all?.length === 3
  console.log("Slots match expected exact 3 slots:", matched)
  if (!matched) throw new Error("Slots did not match exact listener saved slots: " + JSON.stringify(empSlotsData.slots))

  console.log("\n[STEP 10-11]: Employee books 09:30")
  const bookRes = await fetch(`${baseUrl}/api/listener-sessions/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${emp1Token}`,
    },
    body: JSON.stringify({
      listenerId: listener._id.toString(),
      startTime: "09:30",
      day: "today",
      durationMinutes: 10,
    }),
  })
  const bookData = await bookRes.json()
  console.log("Book response (expected 201):", bookRes.status, "Session ID:", bookData.session?.sessionId, "Client ID:", bookData.session?.clientId)
  if (bookRes.status !== 201) throw new Error("Booking failed: " + JSON.stringify(bookData))

  // Verify availability document was marked "Booked"
  const availDoc = await ListenerAvailability.findOne({ listenerId: listener._id, time: "09:30" })
  console.log("MongoDB ListenerAvailability status for 09:30:", availDoc?.status)
  if (availDoc?.status !== "Booked") throw new Error("Slot status in DB is not Booked")

  console.log("\n[STEP 12]: Refresh employee booking screen")
  const refreshSlotsRes = await fetch(`${baseUrl}/api/listeners/${listener._id}/slots?day=today`)
  const refreshSlotsData = await refreshSlotsRes.json()
  console.log("Refreshed slots for employee:", refreshSlotsData.slots?.all)
  const is0930Gone = !refreshSlotsData.slots?.all?.includes("09:30")
  console.log("09:30 is no longer available:", is0930Gone)
  if (!is0930Gone) throw new Error("09:30 should not be returned after booking")

  console.log("\n[STEP 13-14]: Listener Portal Dashboard checks")
  const dashRes = await fetch(`${baseUrl}/api/listener/dashboard`, {
    headers: { Authorization: `Bearer ${listenerToken}` },
  })
  const dashData = await dashRes.json()
  console.log("Listener Dashboard sessionsToday (expected >= 1):", dashData.sessionsToday)
  console.log("Listener Dashboard nextSession:", dashData.nextSession?.sessionId, dashData.nextSession?.time, dashData.nextSession?.participant)
  console.log("Listener Dashboard pendingRequests count:", dashData.pendingSessionRequests?.length)
  if (dashData.sessionsToday < 1) throw new Error("Sessions Today is 0 when booking exists!")
  if (!dashData.nextSession) throw new Error("Next Session is null when booking exists!")

  console.log("\n[STEP 15]: Accept the session")
  const acceptRes = await fetch(`${baseUrl}/api/listener-sessions/${bookData.session.sessionId}/accept`, {
    method: "POST",
    headers: { Authorization: `Bearer ${listenerToken}` },
  })
  const acceptData = await acceptRes.json()
  console.log("Accept status:", acceptRes.status, "New session status:", acceptData.session?.status)
  if (acceptData.session?.status !== "Confirmed") throw new Error("Session status not confirmed")

  console.log("\n[STEP 16]: Try booking 09:30 from another employee (Double Booking Prevention)")
  const collideRes = await fetch(`${baseUrl}/api/listener-sessions/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${emp2Token}`,
    },
    body: JSON.stringify({
      listenerId: listener._id.toString(),
      startTime: "09:30",
      day: "today",
      durationMinutes: 10,
    }),
  })
  const collideData = await collideRes.json()
  console.log("Double booking response status (expected 409):", collideRes.status, "Message:", collideData.message)
  if (collideRes.status !== 409) throw new Error("Double booking should have failed with 409!")

  console.log("\n=== ALL 16 STEPS PASSED SUCCESSFULLY! ===")
  await mongoose.disconnect()
}

runTest().catch((err) => {
  console.error("Test failed:", err.message)
  process.exit(1)
})
