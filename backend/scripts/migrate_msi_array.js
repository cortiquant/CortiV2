const mongoose = require("mongoose")
require("dotenv").config()

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cortiquant"

async function run() {
  await mongoose.connect(MONGODB_URI)
  const User = require("../models/User")
  const Assessment = require("../models/Assessment")

  const users = await User.find({ role: "employee" })
  console.log(`Checking ${users.length} employee accounts for MSI migration...`)

  for (const user of users) {
    const assessments = await Assessment.find({ userId: user._id }).sort({ completedAt: 1, createdAt: 1 })
    const msiEntries = []

    if (assessments.length > 0) {
      let hasBaseline = false
      for (const a of assessments) {
        const isBaseline = (a.type === "Baseline MSI" || (!hasBaseline && assessments.length === 1))
        const type = isBaseline && !hasBaseline ? "baseline" : "weekly"
        if (type === "baseline") hasBaseline = true
        msiEntries.push({
          score: Math.round(a.msi),
          type,
          recordedAt: a.completedAt || a.createdAt || new Date(),
        })
      }
    } else if (user.baselineMsi != null) {
      msiEntries.push({
        score: user.baselineMsi,
        type: "baseline",
        recordedAt: user.lastBaselineMsiDate || user.baselineCompletedAt || user.createdAt || new Date(),
      })
    }

    if (msiEntries.length > 0) {
      await User.findByIdAndUpdate(user._id, { $set: { msi: msiEntries } })
      console.log(`Migrated ${user.name} (${user._id}) -> ${msiEntries.length} msi items`)
    }
  }

  console.log("MSI migration completed successfully.")
  process.exit(0)
}

run().catch((err) => {
  console.error("Migration error:", err)
  process.exit(1)
})
