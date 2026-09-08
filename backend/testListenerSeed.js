const mongoose = require("mongoose")
const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, ".env") })

const Listener = require("./models/Listener")
const ListenerAvailability = require("./models/ListenerAvailability")
const ListenerSession = require("./models/ListenerSession")
const ListenerNotification = require("./models/ListenerNotification")
const ListenerMessage = require("./models/ListenerMessage")
const User = require("./models/User")

async function verifyFlow() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log("Connected to MongoDB")

  // 1. Check if test listener exists or create one
  let listener = await Listener.findOne({ email: "alex.listener@cortiquant.com" })
  if (!listener) {
    const passwordHash = await Listener.hashPassword("ListenerPass123!")
    listener = await Listener.create({
      listenerId: "LST-001",
      name: "Alex Listener",
      email: "alex.listener@cortiquant.com",
      passwordHash,
      role: "LISTENER",
      status: "Active",
      availabilityStatus: "Available",
      bio: "Here to listen and support. Open to talking about work stress or personal pressure.",
    })
    console.log("Created test listener:", listener.listenerId)
  } else {
    listener.status = "Active"
    listener.availabilityStatus = "Available"
    await listener.save()
    console.log("Using existing active listener:", listener.listenerId)
  }

  // 2. Set availability slots
  const todayStr = new Date().toISOString().split("T")[0]
  await ListenerAvailability.deleteMany({ listenerId: listener._id })
  await ListenerAvailability.insertMany([
    { listenerId: listener._id, day: "today", date: todayStr, time: "08:00", status: "Available" },
    { listenerId: listener._id, day: "today", date: todayStr, time: "18:00", status: "Available" },
    { listenerId: listener._id, day: "today", date: todayStr, time: "19:00", status: "Available" },
    { listenerId: listener._id, day: "tomorrow", date: "2026-09-07", time: "09:00", status: "Available" },
  ])
  console.log("Created 4 availability slots")

  // 3. Find or create an employee user for booking
  let employee = await User.findOne({ role: { $in: ["employee", "Employee"] } })
  if (!employee) {
    employee = await User.findOne({})
  }

  // 4. Create a sample session request
  await ListenerSession.deleteMany({ listenerId: listener._id })
  const sessionReq = await ListenerSession.create({
    sessionId: "S-1029",
    listenerId: listener._id,
    employeeId: employee._id,
    organisationId: employee.organisationId || "ORG-DEFAULT",
    date: "Today",
    time: "19:30",
    duration: 45,
    status: "Requested",
    scheduledAt: new Date(),
  })
  console.log("Created session request:", sessionReq.sessionId)

  // 5. Create a completed session to verify stats calculation
  const completedSession = await ListenerSession.create({
    sessionId: "S-1001",
    listenerId: listener._id,
    employeeId: employee._id,
    organisationId: employee.organisationId || "ORG-DEFAULT",
    date: "2026-09-04",
    time: "15:00",
    duration: 60,
    actualDurationMinutes: 60,
    status: "Completed",
    scheduledAt: new Date(Date.now() - 86400000),
    completedAt: new Date(Date.now() - 86400000 + 3600000),
  })
  console.log("Created completed session:", completedSession.sessionId)

  // 6. Create sample notification
  await ListenerNotification.deleteMany({ listenerId: listener._id })
  await ListenerNotification.create({
    listenerId: listener._id,
    type: "session_request",
    title: "New Session Request",
    message: "A new anonymous listening session (S-1029) has been requested for Today at 19:30.",
    data: { sessionId: "S-1029" },
  })
  console.log("Created test notification")

  console.log("VERIFICATION SEED COMPLETED SUCCESSFULLY")
  await mongoose.disconnect()
}

verifyFlow().catch((err) => {
  console.error("Verification seed error:", err)
  process.exit(1)
})
