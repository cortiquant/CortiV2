require("dotenv").config({ path: require("path").resolve(__dirname, ".env") })
const mongoose = require("mongoose")
const User = require("./models/User")
const Organisation = require("./models/Organisation")

async function seedAdmin() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set in .env")
    process.exit(1)
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connected to MongoDB Atlas")

    // 1. Ensure master organisation exists for founder/admin
    let org = await Organisation.findOne({ code: "CORT4213" })
    if (!org) {
      org = await Organisation.findOne({})
    }
    if (!org) {
      org = await Organisation.create({
        organisationId: "ORG-0001",
        name: "CortiQuant HQ",
        code: "CORT4213",
        isActive: true,
      })
      console.log("Created master organisation:", org.name, org.code)
    } else {
      console.log("Using existing organisation:", org.name, org.code)
    }

    const email = "soham.founder@gmail.com"
    const password = "soam@mru"
    const passwordHash = await User.hashPassword(password)

    // Check if user already exists
    let adminUser = await User.findOne({ email: email.toLowerCase() })
    if (adminUser) {
      adminUser.name = "Soham (Founder)"
      adminUser.passwordHash = passwordHash
      adminUser.role = "admin"
      adminUser.status = "Approved"
      adminUser.organisationId = org._id
      adminUser.organisationCode = org.code
      adminUser.onboardingCompleted = true
      await adminUser.save()
      console.log("Updated existing user to admin/founder with new credentials:", email)
    } else {
      adminUser = await User.create({
        name: "Soham (Founder)",
        email: email.toLowerCase(),
        passwordHash,
        role: "admin",
        status: "Approved",
        organisationId: org._id,
        organisationCode: org.code,
        employeeId: "ADM-0001",
        onboardingCompleted: true,
      })
      console.log("Created new founder admin user:", email)
    }

    console.log("Seed finished successfully. User details:")
    console.log({
      id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      status: adminUser.status,
    })

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error("Seeding error:", err)
    process.exit(1)
  }
}

seedAdmin()
