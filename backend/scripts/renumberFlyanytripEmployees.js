require("dotenv").config()
const mongoose = require("mongoose")

async function renumberFlyanytripEmployees() {
  console.log("=== RENUMBERING ALL FLYANYTRIP EMPLOYEE IDS ===")
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cortiquant"
  await mongoose.connect(uri)
  console.log("Connected to MongoDB.")

  const org = await mongoose.connection.db.collection("organisations").findOne({
    $or: [{ organisationCode: "FLYA5587" }, { code: "FLYA5587" }, { name: /flyanytrip/i }]
  })

  if (!org) {
    throw new Error("FlyanyTrip organisation not found!")
  }

  // Update organisation model employeeIdPrefix
  await mongoose.connection.db.collection("organisations").updateOne(
    { _id: org._id },
    { $set: { employeeIdPrefix: "FLYA" } }
  )

  // Fetch all FlyanyTrip employees sorted by registration time (createdAt) ascending
  const employees = await mongoose.connection.db.collection("users").find({
    role: { $in: ["employee", "Employee", "EMPLOYEE"] },
    $or: [
      { organisationId: org._id },
      { organisationCode: "FLYA5587" }
    ]
  }).sort({ createdAt: 1 }).toArray()

  console.log(`Found ${employees.length} employees to renumber.`)

  // Step 1: Temporarily set placeholder IDs to prevent unique index collision
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i]
    await mongoose.connection.db.collection("users").updateOne(
      { _id: emp._id },
      { $set: { employeeId: `TEMP-FLYA-${i}-${Date.now()}` } }
    )
  }

  // Step 2: Assign clean sequential FLYA-1001, FLYA-1002, etc.
  let seq = 1000
  for (const emp of employees) {
    seq += 1
    const newEmployeeId = `FLYA-${seq}`

    await mongoose.connection.db.collection("users").updateOne(
      { _id: emp._id },
      {
        $set: {
          employeeId: newEmployeeId,
          approvedAt: emp.approvedAt || emp.createdAt || new Date(),
        }
      }
    )

    await mongoose.connection.db.collection("corporateonboardings").updateMany(
      { userId: emp._id },
      { $set: { employeeId: newEmployeeId } }
    )

    console.log(`- ${emp.name} (${emp.email}): -> ${newEmployeeId}`)
  }

  // Update Counter to current seq
  await mongoose.connection.db.collection("counters").updateOne(
    { _id: "employeeId_FLYA" },
    { $set: { seq: seq } },
    { upsert: true }
  )

  console.log(`\nUpdated Counter "employeeId_FLYA" to seq: ${seq}`)
  console.log("All FlyanyTrip employees successfully updated!")
  process.exit(0)
}

renumberFlyanytripEmployees().catch(err => {
  console.error("Migration failed:", err)
  process.exit(1)
})
