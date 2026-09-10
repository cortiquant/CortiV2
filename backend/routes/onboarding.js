const express = require("express")
const router = express.Router()
const CorporateOnboarding = require("../models/CorporateOnboarding")
const User = require("../models/User")
const { logActivity } = require("../services/activityService")
const { getOrCreateDepartment } = require("../services/departmentService")
const { sendEmployeeApprovalNotification } = require("../services/notificationService")
const { requireEmployee, requireHR } = require("../middleware/auth")

// ─────────────────────────────────────────────────────────────────────────────
// MSI CALCULATION
//
// Formula (agreed CortiQuant spec):
//   MSI = (moodScore/8 * 20) + (psychometricScore/24 * 55) + (physicalScore/4 * 25)
//   Final value clamped to 0–100.
//
// Scoring for freq-type answers (Never=0, Rarely=1, Sometimes=2, Often=3, Always=4):
//   moodScore        = M1 + M2          (max 8)
//   psychometricScore = SP1+SP2+…+SP6   (max 24)
//   physicalScore    = PH1              (max 4)
// ─────────────────────────────────────────────────────────────────────────────
function calculateMSI(moodCheck, stressPulse, physicalCheck) {
  const moodScore = (moodCheck.M1 ?? 0) + (moodCheck.M2 ?? 0)

  const psychometricScore =
    (stressPulse.SP1 ?? 0) +
    (stressPulse.SP2 ?? 0) +
    (stressPulse.SP3 ?? 0) +
    (stressPulse.SP4 ?? 0) +
    (stressPulse.SP5 ?? 0) +
    (stressPulse.SP6 ?? 0)

  const physicalScore = physicalCheck.PH1 ?? 0

  const raw =
    (moodScore / 8) * 20 +
    (psychometricScore / 24) * 55 +
    (physicalScore / 4) * 25

  const msi = Math.max(0, Math.min(100, Math.round(raw)))

  return { moodScore, psychometricScore, physicalScore, msi }
}

// ─────────────────────────────────────────────────────────────────────────────
// ARCHETYPE CALCULATION
//
// Ported verbatim from EmployeeApp.tsx → calcArchetype()
// QUIZ_QUESTIONS matches the 5-question AQ1–AQ5 corporate onboarding quiz.
// Answers are stored as option indices (0, 1, 2).
// ─────────────────────────────────────────────────────────────────────────────
const QUIZ_QUESTIONS = [
  {
    options: [
      { primary: "The Slow Leak", pPts: 2, secondary: "The Tide", sPts: 1 },
      { primary: "The Thunderstorm", pPts: 2, secondary: "The Sponge", sPts: 1 },
      { primary: "The Sponge", pPts: 2, secondary: "The Thunderstorm", sPts: 1 },
    ],
  },
  {
    options: [
      { primary: "The Slow Leak", pPts: 2, secondary: "The Tide", sPts: 1 },
      { primary: "The Echo Chamber", pPts: 2, secondary: "The Architect", sPts: 1 },
      { primary: "The Tide", pPts: 2, secondary: "The Slow Leak", sPts: 1 },
    ],
  },
  {
    options: [
      { primary: "The Thunderstorm", pPts: 2, secondary: "The Sponge", sPts: 1 },
      { primary: "The Architect", pPts: 2, secondary: "The Echo Chamber", sPts: 1 },
      { primary: "The Kaleidoscope", pPts: 2, secondary: "", sPts: 0 },
    ],
  },
  {
    options: [
      { primary: "The Echo Chamber", pPts: 2, secondary: "The Architect", sPts: 1 },
      { primary: "The Tide", pPts: 2, secondary: "The Slow Leak", sPts: 1 },
      { primary: "The Sponge", pPts: 2, secondary: "The Thunderstorm", sPts: 1 },
    ],
  },
  {
    options: [
      { primary: "The Architect", pPts: 2, secondary: "The Echo Chamber", sPts: 1 },
      { primary: "The Kaleidoscope", pPts: 2, secondary: "", sPts: 0 },
    ],
  },
]

const MAX_SCORES = {
  "The Slow Leak": 6,
  "The Tide": 6,
  "The Thunderstorm": 6,
  "The Sponge": 6,
  "The Echo Chamber": 6,
  "The Architect": 6,
  "The Kaleidoscope": 4,
}

function calculateArchetype(archetypeQuiz) {
  // archetypeQuiz = { AQ1: 0, AQ2: 1, AQ3: 2, AQ4: 0, AQ5: 1 }
  const answerIndices = [
    archetypeQuiz.AQ1,
    archetypeQuiz.AQ2,
    archetypeQuiz.AQ3,
    archetypeQuiz.AQ4,
    archetypeQuiz.AQ5,
  ]

  const raw = {}
  answerIndices.forEach((ansIdx, qIdx) => {
    if (ansIdx === null || ansIdx === undefined) return
    const opt = QUIZ_QUESTIONS[qIdx].options[ansIdx]
    if (!opt) return
    raw[opt.primary] = (raw[opt.primary] || 0) + opt.pPts
    if (opt.secondary) {
      raw[opt.secondary] = (raw[opt.secondary] || 0) + opt.sPts
    }
  })

  const normalized = {}
  Object.keys(MAX_SCORES).forEach((k) => {
    normalized[k] = Math.round(((raw[k] || 0) / MAX_SCORES[k]) * 100)
  })

  const sorted = Object.entries(normalized).sort((a, b) => b[1] - a[1])
  const primary = sorted[0][0]
  const secondary = sorted[1][0]

  return { primary, secondary, normalized }
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_PARTICIPANT_KEYS = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"]
const REQUIRED_MOOD_KEYS        = ["M1", "M2"]
const REQUIRED_STRESS_KEYS      = ["SP1", "SP2", "SP3", "SP4", "SP5", "SP6"]
const REQUIRED_PHYSICAL_KEYS    = ["PH1"]
const REQUIRED_ARCHETYPE_KEYS   = ["AQ1", "AQ2", "AQ3", "AQ4", "AQ5"]

function validateSection(obj, keys, label) {
  if (!obj || typeof obj !== "object") {
    return `${label} section is missing.`
  }
  for (const key of keys) {
    if (obj[key] === undefined || obj[key] === null) {
      return `${label} is missing answer for ${key}.`
    }
  }
  return null
}

function validateNumericSection(obj, keys, label, min = 0, max = 4) {
  const err = validateSection(obj, keys, label)
  if (err) return err
  for (const key of keys) {
    const v = obj[key]
    if (typeof v !== "number" || v < min || v > max) {
      return `${label}.${key} must be a number between ${min} and ${max}.`
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding
//
// Employee-protected — submit (or update) Corporate Onboarding answers.
// Uses findOneAndUpdate with upsert to prevent duplicate documents.
// The backend calculates MSI and archetype; frontend values are ignored.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", requireEmployee, async (req, res) => {
  try {
    const user = req.user

    // ── Role & status guard ───────────────────────────────────────────────
    // Allow users in "OnboardingRequired" or "Pending" to submit onboarding
    if (user.status === "Rejected") {
      return res.status(403).json({
        success: false,
        message: "Your account request was rejected. Please contact HR.",
      })
    }

    const { participantProfile } = req.body

    console.log(`[ONBOARDING] Participant Profile received for employee: ${user.username || user.employeeId || user.email}`)

    // ── Validate Participant Profile ──────────────────────────────────────
    const error = validateSection(participantProfile, REQUIRED_PARTICIPANT_KEYS, "Participant Profile")
    if (error) {
      return res.status(400).json({ success: false, message: error })
    }

    const departmentName = participantProfile.D3 || null
    let departmentId = null
    if (departmentName && user.organisationId) {
      try {
        const deptDoc = await getOrCreateDepartment(user.organisationId, departmentName)
        if (deptDoc) {
          departmentId = deptDoc.departmentId
        }
      } catch (deptErr) {
        console.warn("[ONBOARDING] Department lookup error:", deptErr.message)
      }
    }

    // ── Upsert Corporate Onboarding record (Participant Profile ONLY) ─────
    const doc = await CorporateOnboarding.findOneAndUpdate(
      { userId: user._id, organisationId: user.organisationId },
      {
        $set: {
          userId:           user._id,
          employeeId:       user.employeeId,
          organisationId:   user.organisationId,
          organisationCode: user.organisationCode || null,
          participantProfile: {
            D1: participantProfile.D1,
            D2: participantProfile.D2,
            D3: participantProfile.D3,
            D4: participantProfile.D4,
            D5: participantProfile.D5,
            D6: participantProfile.D6,
            D7: participantProfile.D7,
            D8: participantProfile.D8,
          },
          onboardingCompleted: true,
          completedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    )

    // ── Mark user profile as onboarding complete, transition to PendingApproval, assign department ──
    const nextStatus = user.status === "Approved" || user.status === "Active" ? user.status : "PendingApproval"
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        onboardingCompleted: true,
        department: departmentName,
        departmentId: departmentId,
        status: nextStatus,
      },
      { new: true }
    )

    console.log(`[ONBOARDING] Profile saved successfully for ${user.username || user.employeeId || user.email} (Status: ${nextStatus})`)

    // Trigger HR Email Notification if transitioning to PendingApproval
    if (nextStatus === "PendingApproval") {
      sendEmployeeApprovalNotification(updatedUser || user).catch((notifErr) => {
        console.error("[ONBOARDING] Non-fatal notification error:", notifErr.message)
      })
    }

    await logActivity({
      req,
      user,
      action: "Employee Onboarding Completed",
      status: "Success",
      organisationId: user.organisationId,
      entityType: "CorporateOnboarding",
      entityId: doc._id,
      details: `Completed Participant Profile (${user.name}) - Dept: ${doc.participantProfile?.D3 || "Unassigned"}`,
    })

    return res.status(200).json({
      success: true,
      message: "Participant profile submitted successfully.",
      data: {
        participantProfile:  doc.participantProfile,
        onboardingCompleted: doc.onboardingCompleted,
        completedAt:         doc.completedAt,
      },
    })
  } catch (err) {
    console.error("[ONBOARDING] Submission error:", err.message)
    // Handle duplicate key edge case (race condition on concurrent submissions)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Onboarding already submitted. Use PUT /api/onboarding to update.",
      })
    }
    res.status(500).json({ success: false, message: "Server error during onboarding submission." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/onboarding/me
//
// Employee-protected — employee retrieves their own onboarding record.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/me", requireEmployee, async (req, res) => {
  try {
    const record = await CorporateOnboarding.findOne({
      userId: req.user._id,
      organisationId: req.user.organisationId,
    })

    if (!record || !record.onboardingCompleted) {
      return res.status(200).json({
        success: true,
        onboardingCompleted: false,
        data: null,
      })
    }

    return res.status(200).json({
      success: true,
      onboardingCompleted: true,
      data: {
        participantProfile:  record.participantProfile,
        moodCheck:           record.moodCheck,
        stressPulse:         record.stressPulse,
        physicalCheck:       record.physicalCheck,
        archetypeQuiz:       record.archetypeQuiz,
        scores:              record.scores,
        archetype:           record.archetype,
        completedAt:         record.completedAt,
      },
    })
  } catch (err) {
    console.error("[ONBOARDING] GET /me error:", err.message)
    res.status(500).json({ success: false, message: "Server error fetching onboarding data." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/onboarding/organisation
//
// HR-protected — HR retrieves onboarding records for their org ONLY.
// organisationId is always derived from the authenticated HR user — never
// trusted from query params.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/organisation", requireHR, async (req, res) => {
  try {
    const records = await CorporateOnboarding.find({
      organisationId: req.user.organisationId, // scoped to HR's own org
      onboardingCompleted: true,
    })
      .populate("userId", "name email employeeId status")
      .sort({ completedAt: -1 })

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records.map((r) => ({
        employeeId:          r.employeeId,
        employee:            r.userId, // populated: { name, email, employeeId, status }
        participantProfile:  r.participantProfile,
        scores:              r.scores,
        archetype:           r.archetype,
        onboardingCompleted: r.onboardingCompleted,
        completedAt:         r.completedAt,
      })),
    })
  } catch (err) {
    console.error("[ONBOARDING] GET /organisation error:", err.message)
    res.status(500).json({ success: false, message: "Server error fetching organisation onboarding data." })
  }
})

module.exports = router
