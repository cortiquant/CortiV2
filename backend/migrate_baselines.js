const mongoose = require("mongoose")
require("dotenv").config()
const Assessment = require("./models/Assessment")

async function migrateBaselines() {
  await mongoose.connect(process.env.MONGODB_URI)
  const userIds = await Assessment.distinct("userId", { type: "Baseline MSI" })
  console.log("Migrating baselines for users count:", userIds.length)

  for (const uid of userIds) {
    const baselines = await Assessment.find({ userId: uid, type: "Baseline MSI" }).sort({ completedAt: -1, createdAt: -1 })
    if (baselines.length > 0) {
      const latest = baselines[0]
      latest.status = "Active"
      await latest.save()
      console.log("User " + uid + ": marked latest baseline " + latest._id + " (msi: " + latest.msi + ") as Active")

      for (let i = 1; i < baselines.length; i++) {
        baselines[i].status = "Superseded"
        await baselines[i].save()
        console.log("User " + uid + ": marked older baseline " + baselines[i]._id + " (msi: " + baselines[i].msi + ") as Superseded")
      }
    }
  }

  await mongoose.disconnect()
  console.log("Migration complete!")
}

migrateBaselines().catch(console.error)
