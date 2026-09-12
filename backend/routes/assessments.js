const express = require("express")
const router = express.Router()
const Assessment = require("../models/Assessment")
const User = require("../models/User")
const { requireActiveEmployee } = require("../middleware/auth")
const { logActivity } = require("../services/activityService")
const { getCategory } = require("../services/msiClassification")

// ─────────────────────────────────────────────────────────────────────────────
// MSI CALCULATION FORMULA (NORMALIZED 0-100)
//
// 1. Detailed Formula (if item-level moodCheck, stressPulse, physicalCheck provided):
//    MSI = (moodScore/8 * 20) + (psychometricScore/24 * 55) + (physicalScore/4 * 25)
//    Clamped to 0–100.
//
// 2. Daily Check-in Snapshot Formula (from Feeling, Stressor, Physical body state):
//    - Feeling: Calm (0), Okay (1), A little tense (2), Stressed (3), Overwhelmed (4)  -> max 4 (weight 40%)
//    - Physical: Energised (0), Tired but okay (1), Drained (2), Tense / restless (3), Exhausted (4) -> max 4 (weight 35%)
//    - Stressor present: yes (+15 pts), no (0) -> max 15 (weight 25%)
//    Clamped to 0–100.
// ─────────────────────────────────────────────────────────────────────────────

function calculateDailyCheckInMSI({ feeling, stressor, physical, moodCheck, stressPulse, physicalCheck }) {
  // If item-level responses are provided (psychometric flow)
  if (moodCheck && stressPulse && physicalCheck) {
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
    return {
      msi,
      scores: { moodScore, psychometricScore, physicalScore, msi },
    }
  }

  // Daily Check-in 3-question flow
  const feelingMap = {
    "Calm": 12,
    "Okay": 34,
    "A little tense": 56,
    "Stressed": 72,
    "Overwhelmed": 88,
  }

  const physicalMap = {
    "Energised": -8,
    "Tired but okay": 0,
    "Drained": 6,
    "Tense / restless": 10,
    "Exhausted": 14,
  }

  const baseFeeling = feelingMap[feeling] ?? 45
  const physAdj = physicalMap[physical] ?? 0
  const stressorAdj = stressor && stressor !== "Something else" ? 4 : 0

  const msi = Math.max(0, Math.min(100, Math.round(baseFeeling + physAdj + stressorAdj)))

  return {
    msi,
    scores: {
      moodScore: Math.round((baseFeeling / 100) * 8),
      psychometricScore: Math.round((msi / 100) * 24),
      physicalScore: Math.round(((physAdj + 8) / 22) * 4),
      msi,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/assessments/checkin
// Submits a Daily Check-in (Strictly requires Active status).
// Calculates MSI and stores exclusively in the Assessment collection.
// Never overwrites Corporate Onboarding profile data.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/checkin", requireActiveEmployee, async (req, res) => {
  try {
    const user = req.user
    const { feeling, stressor, physical, driver, moodCheck, stressPulse, physicalCheck } = req.body

    const { msi, scores } = calculateDailyCheckInMSI({
      feeling,
      stressor,
      physical,
      moodCheck,
      stressPulse,
      physicalCheck,
    })

    const category = getCategory(msi)

    const assessmentDoc = new Assessment({
      userId: user._id,
      employeeId: user.employeeId || null,
      organisationId: user.organisationId,
      organisationCode: user.organisationCode || null,
      departmentId: user.departmentId || null,
      department: user.department || null,
      type: "Daily Check-in (MSI)",
      responses: {
        feeling: feeling || null,
        stressor: stressor || null,
        physical: physical || null,
        driver: driver || null,
        moodCheck,
        stressPulse,
        physicalCheck,
      },
      msi,
      scores,
      category,
      driver: driver || stressor || null,
      status: "Completed",
      completedAt: new Date(),
    })

    await assessmentDoc.save()

    console.log(`[ASSESSMENT] Daily check-in saved for ${user.username || user.name}: MSI=${msi} (${category})`)

    await logActivity({
      req,
      user,
      action: "Completed Assessment",
      status: "Success",
      organisationId: user.organisationId,
      entityType: "Assessment",
      entityId: assessmentDoc._id,
      details: `Daily Check-in submitted (${user.name}) - MSI: ${msi} (${category})`,
    })

    return res.status(201).json({
      success: true,
      message: "Check-in assessment recorded successfully.",
      data: {
        id: assessmentDoc._id,
        msi: assessmentDoc.msi,
        category: assessmentDoc.category,
        scores: assessmentDoc.scores,
        driver: assessmentDoc.driver,
        completedAt: assessmentDoc.completedAt,
      },
    })
  } catch (err) {
    console.error("[ASSESSMENT] Error saving daily check-in:", err.message)
    res.status(500).json({ success: false, message: "Server error saving daily check-in." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/assessments/baseline/eligibility
// Checks whether the logged-in employee can complete or update Baseline MSI.
// - If no previous baseline: eligible = true, status = "initial"
// - If previous baseline exists:
//   - eligible = false if < 7 days have passed since last baseline
//   - eligible = true if >= 7 days have passed
// Returns remainingDays, nextAvailableDate, lastBaselineDate, baselineMsi, history
// ─────────────────────────────────────────────────────────────────────────────
router.get("/baseline/eligibility", requireActiveEmployee, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." })
    }

    const lastDate = user.lastBaselineMsiDate || user.baselineCompletedAt || null
    const hasBaseline = user.baselineMsi != null && lastDate != null

    if (!hasBaseline) {
      return res.status(200).json({
        success: true,
        data: {
          eligible: true,
          status: "initial",
          buttonLabel: "Complete Baseline MSI",
          currentMsi: user.baselineMsi ?? null,
          lastBaselineMsiDate: null,
          nextBaselineMsiDate: null,
          remainingDays: 0,
          remainingHours: 0,
          message: "Ready to establish your baseline MSI.",
          baselineMsiHistory: user.baselineMsiHistory || [],
        },
      })
    }

    const lastTime = new Date(lastDate).getTime()
    const nextTime = user.nextBaselineMsiDate
      ? new Date(user.nextBaselineMsiDate).getTime()
      : lastTime + 7 * 24 * 60 * 60 * 1000

    const now = Date.now()
    const diffMs = nextTime - now

    if (diffMs <= 0) {
      return res.status(200).json({
        success: true,
        data: {
          eligible: true,
          status: "ready_for_update",
          buttonLabel: "Update your Baseline MSI",
          currentMsi: user.baselineMsi,
          lastBaselineMsiDate: new Date(lastTime).toISOString(),
          nextBaselineMsiDate: new Date(nextTime).toISOString(),
          remainingDays: 0,
          remainingHours: 0,
          message: "Your weekly baseline MSI update is now available.",
          baselineMsiHistory: user.baselineMsiHistory || [],
        },
      })
    }

    // Still in cooldown period
    const remainingDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
    const remainingHours = Math.ceil(diffMs / (60 * 60 * 1000))

    return res.status(200).json({
      success: true,
      data: {
        eligible: false,
        status: "cooldown",
        buttonLabel: "Update your Baseline MSI",
        currentMsi: user.baselineMsi,
        lastBaselineMsiDate: new Date(lastTime).toISOString(),
        nextBaselineMsiDate: new Date(nextTime).toISOString(),
        remainingDays,
        remainingHours,
        message: `Available again in ${remainingDays} ${remainingDays === 1 ? "day" : "days"}.`,
        baselineMsiHistory: user.baselineMsiHistory || [],
      },
    })
  } catch (err) {
    console.error("[ASSESSMENT] Error checking baseline eligibility:", err.message)
    res.status(500).json({ success: false, message: "Server error checking baseline eligibility." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/assessments/baseline
// Submits Baseline MSI Assessment (initial or weekly update).
// Calculates MSI normalized 0–100, persists as type 'Baseline MSI' in Assessment
// collection, records in baselineMsiHistory, and updates baselineMsi, lastBaselineMsiDate,
// and nextBaselineMsiDate directly on User.
//
// Validation: Enforces 7-day cooldown on the backend if a baseline already exists.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/baseline", requireActiveEmployee, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." })
    }

    const { answers, moodCheck, stressPulse, physicalCheck } = req.body

    // ── Enforce 7-day validation if previous baseline exists ───────────────────
    const lastDate = user.lastBaselineMsiDate || user.baselineCompletedAt
    if (user.baselineMsi != null && lastDate) {
      const lastTime = new Date(lastDate).getTime()
      const nextTime = user.nextBaselineMsiDate
        ? new Date(user.nextBaselineMsiDate).getTime()
        : lastTime + 7 * 24 * 60 * 60 * 1000
      const now = Date.now()

      if (now < nextTime) {
        const remainingDays = Math.ceil((nextTime - now) / (24 * 60 * 60 * 1000))
        return res.status(403).json({
          success: false,
          code: "BASELINE_COOLDOWN",
          message: `Baseline MSI can only be updated once every 7 days. Next update available in ${remainingDays} ${remainingDays === 1 ? "day" : "days"} on ${new Date(nextTime).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}.`,
          nextBaselineMsiDate: new Date(nextTime).toISOString(),
          remainingDays,
        })
      }
    }

    let msi = 0
    let scores = {}

    if (moodCheck && stressPulse && physicalCheck) {
      const computed = calculateDailyCheckInMSI({ moodCheck, stressPulse, physicalCheck })
      msi = computed.msi
      scores = computed.scores
    } else if (Array.isArray(answers) && answers.length > 0) {
      // 16-question answers array (0-4 each)
      // M1–M4 (mood: first 2 questions contribute to Mood score out of 8)
      // S1–S4 + R1–R4 (stress load + recovery: 8 questions contribute to psychometric score out of 24)
      // PH1–PH4 (physical: first 2 questions contribute to physical score out of 4)
      const m1 = answers[0] ?? 0
      const m2 = answers[1] ?? 0
      const moodScore = Math.min(8, m1 + m2)

      const s_scores = (answers[4] ?? 0) + (answers[5] ?? 0) + (answers[6] ?? 0) + (answers[7] ?? 0) +
                       (answers[8] ?? 0) + (answers[9] ?? 0)
      const psychometricScore = Math.min(24, s_scores)

      const physicalScore = Math.min(4, answers[12] ?? 0)

      const raw =
        (moodScore / 8) * 20 +
        (psychometricScore / 24) * 55 +
        (physicalScore / 4) * 25

      msi = Math.max(0, Math.min(100, Math.round(raw)))
      scores = { moodScore, psychometricScore, physicalScore, msi }
    } else {
      return res.status(400).json({ success: false, message: "Valid assessment responses required." })
    }

    const category = getCategory(msi)
    const now = new Date()
    const nextAvailable = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // 1. Create Assessment entry of type "Baseline MSI"
    const assessmentDoc = new Assessment({
      userId: user._id,
      employeeId: user.employeeId || null,
      organisationId: user.organisationId,
      organisationCode: user.organisationCode || null,
      departmentId: user.departmentId || null,
      department: user.department || null,
      type: "Baseline MSI",
      msi,
      scores,
      category,
      status: "Completed",
      completedAt: now,
    })
    await assessmentDoc.save()

    // 2. Prepare new history entry
    const newHistoryEntry = {
      score: msi,
      completedAt: now,
    }

    // Build existing history if user previously had a baseline but empty history array
    let history = user.baselineMsiHistory || []
    if (history.length === 0 && user.baselineMsi != null && lastDate) {
      history.push({
        score: user.baselineMsi,
        completedAt: new Date(lastDate),
      })
    }
    history.push(newHistoryEntry)

    // 3. Persist baseline directly onto User model
    user.baselineMsi = msi
    user.baselineCompletedAt = user.baselineCompletedAt || now
    user.lastBaselineMsiDate = now
    user.nextBaselineMsiDate = nextAvailable
    user.baselineMsiHistory = history
    await user.save()

    console.log(`[ASSESSMENT] Baseline MSI saved for ${user.username || user.name}: MSI=${msi} (${category}), next update: ${nextAvailable.toISOString()}`)

    await logActivity({
      req,
      user,
      action: "Completed Baseline Assessment",
      status: "Success",
      organisationId: user.organisationId,
      entityType: "Assessment",
      entityId: assessmentDoc._id,
      details: `Baseline Assessment completed (${user.name}) - MSI: ${msi} (${category})`,
    })

    return res.status(201).json({
      success: true,
      message: "Baseline assessment recorded successfully.",
      data: {
        id: assessmentDoc._id,
        baselineMsi: msi,
        category,
        scores,
        completedAt: now,
        lastBaselineMsiDate: now.toISOString(),
        nextBaselineMsiDate: nextAvailable.toISOString(),
        remainingDays: 7,
        baselineMsiHistory: user.baselineMsiHistory,
      },
    })
  } catch (err) {
    console.error("[ASSESSMENT] Error saving baseline assessment:", err.message)
    res.status(500).json({ success: false, message: "Server error saving baseline assessment." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/assessments/metrics
// Retrieves real dashboard metrics for the authenticated employee:
// - Baseline Stress (Baseline MSI)
// - Baseline eligibility and countdown
// - Current Stress (Current MSI from latest daily check-in)
// - Primary Archetype (stored archetype)
// - Last Assessment Date
// ─────────────────────────────────────────────────────────────────────────────
router.get("/metrics", requireActiveEmployee, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." })
    }

    // Find latest daily check-in
    const latestDaily = await Assessment.findOne({
      userId: user._id,
      type: "Daily Check-in (MSI)",
    }).sort({ completedAt: -1 })

    // Find latest of ANY assessment for lastAssessmentDate
    const latestAny = await Assessment.findOne({
      userId: user._id,
    }).sort({ completedAt: -1 })

    // Calculate baseline eligibility & timing
    const lastDate = user.lastBaselineMsiDate || user.baselineCompletedAt || null
    const hasBaseline = user.baselineMsi != null && lastDate != null
    let baselineEligibility = {
      eligible: true,
      status: "initial",
      remainingDays: 0,
      lastBaselineMsiDate: null,
      nextBaselineMsiDate: null,
    }

    if (hasBaseline) {
      const lastTime = new Date(lastDate).getTime()
      const nextTime = user.nextBaselineMsiDate
        ? new Date(user.nextBaselineMsiDate).getTime()
        : lastTime + 7 * 24 * 60 * 60 * 1000
      const now = Date.now()
      const diffMs = nextTime - now

      if (diffMs <= 0) {
        baselineEligibility = {
          eligible: true,
          status: "ready_for_update",
          remainingDays: 0,
          lastBaselineMsiDate: new Date(lastTime).toISOString(),
          nextBaselineMsiDate: new Date(nextTime).toISOString(),
        }
      } else {
        const remainingDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
        baselineEligibility = {
          eligible: false,
          status: "cooldown",
          remainingDays,
          lastBaselineMsiDate: new Date(lastTime).toISOString(),
          nextBaselineMsiDate: new Date(nextTime).toISOString(),
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        baselineMsi: user.baselineMsi ?? null,
        baselineCompletedAt: user.baselineCompletedAt ?? null,
        lastBaselineMsiDate: user.lastBaselineMsiDate || user.baselineCompletedAt || null,
        nextBaselineMsiDate: user.nextBaselineMsiDate || null,
        baselineMsiHistory: user.baselineMsiHistory || [],
        baselineEligibility,
        currentMsi: latestDaily ? latestDaily.msi : null,
        currentCategory: latestDaily ? latestDaily.category : null,
        latestDailyDate: latestDaily ? latestDaily.completedAt : null,
        lastAssessmentDate: latestAny ? latestAny.completedAt : (user.baselineCompletedAt || null),
      },
    })
  } catch (err) {
    console.error("[ASSESSMENT] Error fetching assessment metrics:", err.message)
    res.status(500).json({ success: false, message: "Server error fetching metrics." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/assessments/history?range=7d | 30d | 90d
// Retrieves authenticated employee's real MSI assessment history.
// Strictly scopes to employee's own assessments, sorted ascending by date.
// Returns { success: true, assessments: [{ date, msi, id, type, category }], currentMsi, baselineMsi, usualRange, observations }
// ─────────────────────────────────────────────────────────────────────────────
router.get("/history", requireActiveEmployee, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." })
    }

    const rangeQuery = (req.query.range || "7d").toLowerCase().trim()
    let daysBack = 7
    if (rangeQuery === "30d") daysBack = 30
    else if (rangeQuery === "90d") daysBack = 90

    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - daysBack)
    sinceDate.setHours(0, 0, 0, 0)

    // Fetch employee's completed assessments within range, sorted ascending by completedAt
    const rawAssessments = await Assessment.find({
      userId: user._id,
      completedAt: { $gte: sinceDate },
      status: "Completed",
    }).sort({ completedAt: 1 })

    // Map to required structure: { date: "YYYY-MM-DD", msi: number, id, category, type }
    const assessments = rawAssessments.map((a) => {
      const d = new Date(a.completedAt)
      const dateStr = d.toISOString().split("T")[0]
      return {
        id: a._id,
        date: dateStr,
        timestamp: a.completedAt,
        msi: a.msi,
        category: a.category,
        type: a.type,
        driver: a.driver,
      }
    })

    // Fetch all-time completed assessments for accurate 'usual range' and latest currentMsi
    const allAssessments = await Assessment.find({
      userId: user._id,
      status: "Completed",
    }).sort({ completedAt: -1 })

    const latestAssessment = allAssessments[0] || null
    const currentMsi = latestAssessment ? latestAssessment.msi : null
    const baselineMsi = user.baselineMsi ?? null

    // Calculate Usual Range:
    // If >= 3 completed assessments exist, calculate 25th to 75th percentile (interquartile range) or mean +/- 0.75 SD.
    // If < 3 assessments, return null (insufficient data).
    let usualRange = null
    if (allAssessments.length >= 3) {
      const msiValues = allAssessments.map((a) => a.msi).sort((a, b) => a - b)
      const q1Index = Math.floor(msiValues.length * 0.25)
      const q3Index = Math.floor(msiValues.length * 0.75)
      const lower = msiValues[q1Index]
      const upper = msiValues[q3Index]
      usualRange = {
        min: lower,
        max: upper,
        formatted: `${lower}–${upper}`,
      }
    }

    // Generate Dynamic Observations based on real assessment history
    const observations = []
    if (allAssessments.length < 2) {
      observations.push("Complete a few more check-ins to build a clearer picture of your stress patterns.")
    } else {
      // 1. Trend across recent check-ins
      const recent3 = allAssessments.slice(0, 3)
      if (recent3.length >= 3) {
        const [first, second, third] = recent3 // first is latest, third is oldest of the 3
        if (first.msi > second.msi && second.msi > third.msi) {
          observations.push("MSI has increased across your last 3 check-ins.")
        } else if (first.msi < second.msi && second.msi < third.msi) {
          observations.push("MSI has steadily decreased across your last 3 check-ins.")
        }
      }

      // 2. Comparison to baseline
      if (baselineMsi != null && currentMsi != null) {
        if (currentMsi > baselineMsi + 10) {
          observations.push("Recent check-ins are running noticeably higher than your baseline.")
        } else if (currentMsi < baselineMsi - 10) {
          observations.push("Recent check-ins are running comfortably below your baseline.")
        } else {
          observations.push("Your MSI is currently tracking close to your established baseline.")
        }
      }

      // 3. Elevated frequency in the filtered period
      const elevatedInPeriod = assessments.filter((a) => a.msi > 40)
      if (elevatedInPeriod.length >= 3) {
        observations.push("Elevated scores have appeared repeatedly during this period.")
      } else if (elevatedInPeriod.length === 0 && assessments.length >= 3) {
        observations.push("Your stress levels have remained smoothly within range throughout this period.")
      }

      // 4. Driver pattern if available
      const drivers = allAssessments.map((a) => a.driver).filter(Boolean)
      if (drivers.length >= 2) {
        const counts = {}
        for (const d of drivers) counts[d] = (counts[d] || 0) + 1
        const topDriver = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
        if (topDriver && topDriver[1] >= 2) {
          observations.push(`${topDriver[0]} has been your most frequently noted contributor.`)
        }
      }

      if (observations.length === 0) {
        observations.push("Your MSI has remained relatively stable across your completed check-ins.")
      }
    }

    return res.status(200).json({
      success: true,
      range: rangeQuery,
      days: daysBack,
      count: assessments.length,
      assessments, // Formatted as array of { date, msi, ... }
      currentMsi,
      baselineMsi,
      usualRange: usualRange ? usualRange.formatted : "Not enough data",
      observations: observations.slice(0, 3),
      data: rawAssessments, // Maintain backward compatibility if any legacy consumer looks at data
    })
  } catch (err) {
    console.error("[ASSESSMENT] Error fetching assessment history:", err.message)
    res.status(500).json({ success: false, message: "Unable to fetch assessment history." })
  }
})

module.exports = router
