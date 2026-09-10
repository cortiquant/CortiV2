const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require("./models/User");
const Organisation = require("./models/Organisation");
const { signToken } = require("./middleware/auth");

async function debugEndpoints() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  // 1. Find all HR users
  const hrUsers = await User.find({ role: { $in: ["hr", "HR", "hr_admin", "admin"] } }).select("+passwordHash");
  console.log(`Found ${hrUsers.length} HR/Admin users:`);
  for (const u of hrUsers) {
    console.log(`- ${u.email} (Name: ${u.name}, Role: ${u.role}, Status: ${u.status}, OrgId: ${u.organisationId}, hasPwHash: ${!!u.passwordHash})`);
  }

  // 2. Test password verification on the first HR user
  const hr = hrUsers[0];
  if (hr) {
    console.log("\nTesting login logic simulation for:", hr.email);
    console.log("organisationId:", hr.organisationId);

    let orgDoc = null;
    if (hr.organisationId) {
      orgDoc = await Organisation.findOne({
        $or: [
          { _id: mongoose.isValidObjectId(hr.organisationId) ? hr.organisationId : null },
          { organisationId: hr.organisationId },
        ],
      });
      console.log("Resolved orgDoc:", orgDoc?.name, "Status:", orgDoc?.status, "isActive:", orgDoc?.isActive);
    }

    try {
      const token = signToken(hr._id, { role: hr.role, organisationId: hr.organisationId });
      console.log("signToken succeeded, token length:", token.length);
    } catch (err) {
      console.error("signToken failed:", err.message);
    }
  }

  process.exit(0);
}

debugEndpoints().catch(err => {
  console.error("Debug error:", err);
  process.exit(1);
});
