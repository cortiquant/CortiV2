const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, ".env") })
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const Listener = require("./models/Listener")
const User = require("./models/User")
const ListenerSession = require("./models/ListenerSession")
const ListenerAvailability = require("./models/ListenerAvailability")

async function runValidationTests() {
  await mongoose.connect(process.env.MONGODB_URI)
  const baseUrl = "http://localhost:3001"

  console.log("==================================================")
  console.log("RUNNING REAL-TIME BOOKING TIME VALIDATION TESTS")
  console.log("==================================================")

  // 1. Get or setup active listener
  let listener = await Listener.findOne({ email: "alex.listener@cortiquant.com" })
  if (!listener) {
    listener = await Listener.findOne({ status: "Active" })
  }

  // 2. Setup listener availability with both a past slot and a future slot for today
  // Let's check current Kolkata time
  const timeZone = "Asia/Kolkata"
  const now = new Date()
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now)
  const p = {}
  parts.forEach((x) => (p[x.type] = x.value))
  const todayStr = `${p.year}-${p.month}-${p.day}`
  const curH = parseInt(p.hour, 10)
  const curM = parseInt(p.minute, 10)
  const curTotalMin = curH * 60 + curM

  console.log(`Current Asia/Kolkata Time: ${p.hour}:${p.minute} (total minutes: ${curTotalMin})`)

  // Define past slot (e.g., 09:20)
  const pastSlot = "09:20"
  // Define future slot (e.g., 23:40)
  const futureSlot = "23:40"

  // Ensure listener availability has both slots configured
  await ListenerAvailability.deleteMany({
    listenerId: listener._id,
    time: { $in: [pastSlot, futureSlot] },
  })
  await ListenerAvailability.create([
    {
      listenerId: listener._id,
      day: "today",
      date: todayStr,
      time: pastSlot,
      status: "Available",
    },
    {
      listenerId: listener._id,
      day: "today",
      date: todayStr,
      time: futureSlot,
      status: "Available",
    },
  ])

  // Clear any existing test sessions for these slots
  await ListenerSession.deleteMany({
    listenerId: listener._id,
    time: { $in: [pastSlot, futureSlot] },
  })

  // 3. Setup employee auth token
  const employee = await User.findOne({ email: { $exists: true, $ne: null } })
  const empToken = jwt.sign(
    { id: employee._id.toString(), role: employee.role || "employee", email: employee.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  )

  // ---------------------------------------------------------------------------
  // TEST 1: Available Slots API filters out past slots for Today
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 1] Calling GET /api/listeners/:id/slots?day=today ...")
  const slotsRes = await fetch(`${baseUrl}/api/listeners/${listener._id}/slots?day=today`)
  const slotsData = await slotsRes.json()
  const allSlots = slotsData.slots?.all || []
  const hasPastSlot = allSlots.includes(pastSlot)
  const hasFutureSlot = allSlots.includes(futureSlot)

  console.log("All slots returned:", allSlots)
  console.log(`Past slot (${pastSlot}) in slots list:`, hasPastSlot, "(Expected: false)")
  console.log(`Future slot (${futureSlot}) in slots list:`, hasFutureSlot, "(Expected: true)")

  if (!hasPastSlot && hasFutureSlot) {
    console.log(">>> TEST 1 PASSED: Availability API filters out past slots for today.")
  } else {
    console.error(">>> TEST 1 FAILED!")
    process.exit(1)
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Direct API booking attempt with PAST slot -> Rejection
  // ---------------------------------------------------------------------------
  console.log(`\n[TEST 2] Attempting to book PAST slot (${pastSlot}) via POST /api/listener-sessions/book ...`)
  const bookPastRes = await fetch(`${baseUrl}/api/listener-sessions/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({
      listenerId: listener._id.toString(),
      startTime: pastSlot,
      day: "today",
      durationMinutes: 10,
    }),
  })
  const bookPastData = await bookPastRes.json()
  console.log("Response status:", bookPastRes.status, "(Expected: 400)")
  console.log("Response body:", bookPastData)

  if (
    bookPastRes.status === 400 &&
    bookPastData.success === false &&
    bookPastData.message === "This time slot has already passed"
  ) {
    console.log(">>> TEST 2 PASSED: Past slot booking rejected by backend with exact error message.")
  } else {
    console.error(">>> TEST 2 FAILED!")
    process.exit(1)
  }

  // Verify no session was created in DB
  const pastSessionInDb = await ListenerSession.findOne({
    listenerId: listener._id,
    time: pastSlot,
    date: { $in: ["Today", todayStr] },
  })
  if (pastSessionInDb) {
    console.error(">>> TEST 2 FAILED: Session was created in DB for past slot!")
    process.exit(1)
  }
  console.log("Verified: No session created in DB for past slot.")

  // ---------------------------------------------------------------------------
  // TEST 3: Direct API booking with FUTURE slot -> Successful
  // ---------------------------------------------------------------------------
  console.log(`\n[TEST 3] Attempting to book FUTURE slot (${futureSlot}) via POST /api/listener-sessions/book ...`)
  const bookFutureRes = await fetch(`${baseUrl}/api/listener-sessions/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({
      listenerId: listener._id.toString(),
      startTime: futureSlot,
      day: "today",
      durationMinutes: 10,
    }),
  })
  const bookFutureData = await bookFutureRes.json()
  console.log("Response status:", bookFutureRes.status, "(Expected: 201)")
  console.log("Response success:", bookFutureData.success, "Session ID:", bookFutureData.session?.sessionId)

  if (bookFutureRes.status === 201 && bookFutureData.success && bookFutureData.session?.sessionId) {
    console.log(">>> TEST 3 PASSED: Future slot booked successfully.")
  } else {
    console.error(">>> TEST 3 FAILED!")
    process.exit(1)
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Attempt to book the same slot again -> Collision rejection (409)
  // ---------------------------------------------------------------------------
  console.log(`\n[TEST 4] Attempting to book the same slot (${futureSlot}) again (duplicate booking) ...`)
  const bookDupRes = await fetch(`${baseUrl}/api/listener-sessions/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({
      listenerId: listener._id.toString(),
      startTime: futureSlot,
      day: "today",
      durationMinutes: 10,
    }),
  })
  const bookDupData = await bookDupRes.json()
  console.log("Response status:", bookDupRes.status, "(Expected: 409)")
  console.log("Response body:", bookDupData)

  if (bookDupRes.status === 409 && bookDupData.success === false) {
    console.log(">>> TEST 4 PASSED: Duplicate booking rejected with 409 conflict.")
  } else {
    console.error(">>> TEST 4 FAILED!")
    process.exit(1)
  }

  // Clean up test data
  await ListenerSession.deleteMany({
    listenerId: listener._id,
    time: { $in: [pastSlot, futureSlot] },
  })
  await ListenerAvailability.deleteMany({
    listenerId: listener._id,
    time: { $in: [pastSlot, futureSlot] },
  })

  console.log("\n==================================================")
  console.log("ALL REAL-TIME TIME VALIDATION TESTS PASSED!")
  console.log("==================================================")
  await mongoose.disconnect()
  process.exit(0)
}

runValidationTests().catch((err) => {
  console.error("Test execution error:", err)
  process.exit(1)
})
