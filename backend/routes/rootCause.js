const express = require("express")
const router = express.Router()
const RootCauseAssessment = require("../models/RootCauseAssessment")
const Assessment = require("../models/Assessment")
const { requireActiveEmployee } = require("../middleware/auth")
const { logActivity } = require("../services/activityService")

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/root-cause-assessments
// Submits a root cause assessment for the authenticated employee.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", requireActiveEmployee, async (req, res) => {
  try {
    const user = req.user
    const {
      msiAtAssessment,
      primaryCause,
      secondaryCause,
      causeSeverity,
      categoryScore,
      responses,
      explanation,
      recommendations,
    } = req.body

    if (!primaryCause) {
      return res.status(400).json({ success: false, message: "primaryCause is required." })
    }

    // Resolve MSI at assessment: either passed or latest from Assessment collection
    let resolvedMsi = msiAtAssessment
    if (resolvedMsi == null || typeof resolvedMsi !== "number") {
      const latestDaily = await Assessment.findOne({
        userId: user._id,
        type: "Daily Check-in (MSI)",
      }).sort({ completedAt: -1 })
      resolvedMsi = latestDaily ? latestDaily.msi : (user.baselineMsi ?? 50)
    }

    const doc = new RootCauseAssessment({
      userId: user._id,
      employeeId: user.employeeId || null,
      organisationId: user.organisationId,
      organisationCode: user.organisationCode || null,
      departmentId: user.departmentId || null,
      department: user.department || null,
      msiAtAssessment: resolvedMsi,
      primaryCause,
      secondaryCause: secondaryCause || null,
      causeSeverity: causeSeverity || "Moderate",
      categoryScore: categoryScore || 0,
      responses: Array.isArray(responses) ? responses : [],
      explanation: explanation || `Your responses suggest that ${primaryCause.toLowerCase()} pressure may be contributing significantly to your current stress level.`,
      recommendations: Array.isArray(recommendations) ? recommendations : [],
      createdAt: new Date(),
    })

    await doc.save()

    console.log(`[ROOT-CAUSE] Saved assessment for ${user.username || user.name}: Cause=${primaryCause}, MSI=${resolvedMsi}`)

    await logActivity({
      req,
      user,
      action: "Root Cause Assessment Completed",
      status: "Success",
      organisationId: user.organisationId,
      entityType: "RootCauseAssessment",
      entityId: doc._id,
      details: `Root cause identified: ${primaryCause} (Severity: ${causeSeverity || "Moderate"})`,
    })

    return res.status(201).json({
      success: true,
      message: "Root cause assessment saved.",
      data: doc,
    })
  } catch (err) {
    console.error("[ROOT-CAUSE] POST / error:", err.message)
    return res.status(500).json({ success: false, message: "Failed to save root cause assessment." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/root-cause-assessments/latest
// Fetches the most recent root cause assessment for the authenticated employee.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/latest", requireActiveEmployee, async (req, res) => {
  try {
    const user = req.user

    const latest = await RootCauseAssessment.findOne({
      userId: user._id,
      organisationId: user.organisationId,
    }).sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      data: latest || null,
    })
  } catch (err) {
    console.error("[ROOT-CAUSE] GET /latest error:", err.message)
    return res.status(500).json({ success: false, message: "Failed to fetch latest root cause assessment." })
  }
})

module.exports = router
