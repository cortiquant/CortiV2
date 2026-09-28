const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require("./models/User");
const Organisation = require("./models/Organisation");
const ActivityLog = require("./models/ActivityLog");
const Counter = require("./models/Counter");
const { signToken } = require("./middleware/auth");
const { generateOrgEmployeeId, isValidOrgEmployeeId, resolveOrgPrefix } = require("./services/employeeIdService");

// Start express server in-process on an ephemeral/free port
const express = require("express");
const authRoutes = require("./routes/auth");

async function runRegressionTests() {
  console.log("=== RUNNING REGRESSION TESTS: ORGANISATION-SPECIFIC EMPLOYEE ID GENERATION & APPROVAL ===");
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cortiquant");
  console.log("✓ Connected to MongoDB.");

  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api", authRoutes);

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`✓ Test API server listening on port ${port}`);

  async function req(method, endpoint, body, token) {
    const res = await fetch(`http://127.0.0.1:${port}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  try {
    // ───────────────────────────────────────────────────────────────────────────
    // TEST 1: FlyanyTrip Employee Approval Regression Test
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n[TEST 1] Create and approve FlyanyTrip employee...");
    const flyaOrg = await Organisation.findOne({
      $or: [{ organisationCode: "FLYA5587" }, { name: /flyanytrip/i }],
    });
    if (!flyaOrg) throw new Error("FlyanyTrip organisation not found!");

    // Verify prefix resolution
    const resolvedPrefix = resolveOrgPrefix(flyaOrg);
    console.log(`✓ resolveOrgPrefix for FlyanyTrip: '${resolvedPrefix}'`);
    if (resolvedPrefix !== "FLYA") throw new Error(`Expected FLYA, got ${resolvedPrefix}`);

    // Find or create HR admin for FlyanyTrip
    let flyaHR = await User.findOne({
      organisationId: flyaOrg._id,
      role: { $in: ["hr", "HR", "admin"] },
    });
    if (!flyaHR) {
      flyaHR = await User.create({
        name: "FlyanyTrip HR",
        username: `flyahr_${Date.now()}`,
        email: `flyahr_${Date.now()}@flyanytrip.com`,
        passwordHash: "dummyhash",
        role: "hr",
        status: "Active",
        organisationId: flyaOrg._id,
        organisationCode: flyaOrg.organisationCode,
      });
    }
    const flyaHRToken = signToken(flyaHR._id, { role: "hr", organisationId: flyaOrg._id });

    // Create new pending employee for FlyanyTrip
    const testFlyaEmpUsername = `flyatest_${Date.now()}`;
    const flyaEmp = await User.create({
      name: "Regression Test Flya User",
      username: testFlyaEmpUsername,
      email: `${testFlyaEmpUsername}@flyanytrip.com`,
      passwordHash: "dummyhash",
      role: "employee",
      status: "PendingApproval",
      organisationId: flyaOrg._id,
      organisationCode: flyaOrg.organisationCode,
      onboardingCompleted: true,
    });

    console.log(`Created test FlyanyTrip employee: ${flyaEmp.name} (username: ${flyaEmp.username})`);

    // Call approval endpoint
    const flyaApproveRes = await req("POST", `/api/hr/approve/${flyaEmp._id}`, null, flyaHRToken);
    console.log("FlyanyTrip approve API response:", flyaApproveRes.status, flyaApproveRes.data.message);
    if (!flyaApproveRes.data.success) {
      throw new Error(`FlyanyTrip approval failed: ${flyaApproveRes.data.message}`);
    }

    const generatedFlyaId = flyaApproveRes.data.user.employeeId;
    console.log("Generated FlyanyTrip Employee ID:", generatedFlyaId);

    if (!generatedFlyaId.startsWith("FLYA-")) {
      throw new Error(`Expected employeeId to start with 'FLYA-', got: '${generatedFlyaId}'`);
    }
    console.log("✓ Verified employeeId starts with 'FLYA-'.");

    // Check activity log recorded for this approval (with small delay if needed)
    let flyaLog = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      flyaLog = await ActivityLog.findOne({
        $or: [
          { entityId: flyaEmp._id },
          { entityId: String(flyaEmp._id) },
        ],
        action: "Approved Employee",
      });
      if (flyaLog) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!flyaLog) {
      const recentLogs = await ActivityLog.find({ action: "Approved Employee" }).sort({ createdAt: -1 }).limit(3);
      console.log("Recent activity logs:", recentLogs.map((l) => ({ details: l.details, entityId: l.entityId })));
      throw new Error("Activity log for FlyanyTrip approval was not found!");
    }
    console.log("Activity log recorded:", flyaLog.details);

    if (!flyaLog.details.includes(generatedFlyaId) || !flyaLog.details.startsWith("Approved Employee FLYA-")) {
      throw new Error(`Activity log details '${flyaLog.details}' does not contain expected FLYA- ID '${generatedFlyaId}'!`);
    }
    console.log("✓ Verified activity log correctly recorded organisation-specific FLYA- ID.");

    // Clean up Test 1 employee & log
    await User.deleteOne({ _id: flyaEmp._id });
    await ActivityLog.deleteOne({ _id: flyaLog._id });
    console.log("✓ Cleaned up test FlyanyTrip employee.");

    // ───────────────────────────────────────────────────────────────────────────
    // TEST 2: CortiQuant Employee Approval Regression Test
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n[TEST 2] Create and approve CortiQuant employee...");
    const cqOrg = await Organisation.findOne({
      $or: [{ organisationCode: "CORT2480" }, { name: /cortiquant/i }],
    });
    if (!cqOrg) throw new Error("CortiQuant organisation not found!");

    const cqResolvedPrefix = resolveOrgPrefix(cqOrg);
    console.log(`✓ resolveOrgPrefix for CortiQuant: '${cqResolvedPrefix}'`);
    if (cqResolvedPrefix !== "EMP") throw new Error(`Expected EMP, got ${cqResolvedPrefix}`);

    let cqHR = await User.findOne({
      organisationId: cqOrg._id,
      role: { $in: ["hr", "HR", "admin"] },
    });
    if (!cqHR) {
      cqHR = await User.create({
        name: "CortiQuant HR",
        username: `cqhr_${Date.now()}`,
        email: `cqhr_${Date.now()}@cortiquant.com`,
        passwordHash: "dummyhash",
        role: "hr",
        status: "Active",
        organisationId: cqOrg._id,
        organisationCode: cqOrg.organisationCode,
      });
    }
    const cqHRToken = signToken(cqHR._id, { role: "hr", organisationId: cqOrg._id });

    // Create new pending employee for CortiQuant
    const testCqEmpUsername = `cqtest_${Date.now()}`;
    const cqEmp = await User.create({
      name: "Regression Test CortiQuant User",
      username: testCqEmpUsername,
      email: `${testCqEmpUsername}@cortiquant.com`,
      passwordHash: "dummyhash",
      role: "employee",
      status: "PendingApproval",
      organisationId: cqOrg._id,
      organisationCode: cqOrg.organisationCode,
      onboardingCompleted: true,
    });

    console.log(`Created test CortiQuant employee: ${cqEmp.name} (username: ${cqEmp.username})`);

    // Call approval endpoint
    const cqApproveRes = await req("POST", `/api/hr/approve/${cqEmp._id}`, null, cqHRToken);
    console.log("CortiQuant approve API response:", cqApproveRes.status, cqApproveRes.data.message);
    if (!cqApproveRes.data.success) {
      throw new Error(`CortiQuant approval failed: ${cqApproveRes.data.message}`);
    }

    const generatedCqId = cqApproveRes.data.user.employeeId;
    console.log("Generated CortiQuant Employee ID:", generatedCqId);

    if (!generatedCqId.startsWith("EMP-")) {
      throw new Error(`Expected employeeId to start with 'EMP-', got: '${generatedCqId}'`);
    }
    console.log("✓ Verified employeeId starts with 'EMP-'.");

    // Check activity log recorded for CortiQuant approval
    let cqLog = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      cqLog = await ActivityLog.findOne({
        $or: [
          { entityId: cqEmp._id },
          { entityId: String(cqEmp._id) },
        ],
        action: "Approved Employee",
      });
      if (cqLog) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!cqLog) throw new Error("Activity log for CortiQuant approval was not found!");
    console.log("Activity log recorded:", cqLog.details);

    if (!cqLog.details.includes(generatedCqId) || !cqLog.details.startsWith("Approved Employee EMP-")) {
      throw new Error(`Activity log details '${cqLog.details}' does not contain expected EMP- ID '${generatedCqId}'!`);
    }
    console.log("✓ Verified activity log correctly recorded organisation-specific EMP- ID.");

    // Clean up Test 2 employee & log
    await User.deleteOne({ _id: cqEmp._id });
    await ActivityLog.deleteOne({ _id: cqLog._id });
    console.log("✓ Cleaned up test CortiQuant employee.");

    // ───────────────────────────────────────────────────────────────────────────
    // TEST 3: Validation test: invalid EMP ID on FlyanyTrip employee rejected
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n[TEST 3] Verify isValidOrgEmployeeId rejects EMP- prefix for FlyanyTrip...");
    const isEmpValidForFlya = isValidOrgEmployeeId("EMP-1014", flyaOrg);
    const isFlyaValidForFlya = isValidOrgEmployeeId("FLYA-1006", flyaOrg);
    console.log(`isValidOrgEmployeeId('EMP-1014', FlyanyTrip) = ${isEmpValidForFlya}`);
    console.log(`isValidOrgEmployeeId('FLYA-1006', FlyanyTrip) = ${isFlyaValidForFlya}`);
    if (isEmpValidForFlya !== false) throw new Error("EMP-1014 should be invalid for FlyanyTrip!");
    if (isFlyaValidForFlya !== true) throw new Error("FLYA-1006 should be valid for FlyanyTrip!");
    console.log("✓ Verified isValidOrgEmployeeId guard correctly validates prefixes.");

    console.log("\n=======================================================");
    console.log("ALL EMPLOYEE ID GENERATION REGRESSION TESTS PASSED (100%)!");
    console.log("=======================================================");
  } finally {
    server.close();
  }
  process.exit(0);
}

runRegressionTests().catch((err) => {
  console.error("Regression test failure:", err);
  process.exit(1);
});
