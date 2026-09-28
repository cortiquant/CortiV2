const express = require("express")
const router = express.Router()
const ArchetypeValidation = require("../models/ArchetypeValidation")
const { requireAuth, requireAdmin } = require("../middleware/auth")

const VALID_ARCHETYPES = [
  "The Slow Leak",
  "The Thunderstorm",
  "The Echo Chamber",
  "The Tide",
  "The Architect",
  "The Kaleidoscope",
  "The Sponge",
]

const MIN_PUBLIC_RESPONSES = 30

/**
 * Normalizes user input archetype name to canonical format (e.g. "Slow Leak" -> "The Slow Leak")
 */
function normalizeArchetype(name) {
  if (!name || typeof name !== "string") return null
  const trimmed = name.trim()
  if (VALID_ARCHETYPES.includes(trimmed)) return trimmed
  const withThe = `The ${trimmed}`
  if (VALID_ARCHETYPES.includes(withThe)) return withThe
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/archetype/validation
// Records authenticated user's feedback/resonance on their archetype
// ─────────────────────────────────────────────────────────────────────────────
router.post("/validation", requireAuth, async (req, res) => {
  try {
    const {
      archetype,
      quizVersion = "v1",
      validationScore,
      accurateAreas = [],
      inaccurateAreas = [],
      feedbackText = "",
    } = req.body

    const canonicalArchetype = normalizeArchetype(archetype)
    if (!canonicalArchetype) {
      return res.status(400).json({
        success: false,
        message: `Invalid archetype name. Must be one of: ${VALID_ARCHETYPES.join(", ")}`,
      })
    }

    const scoreNum = Number(validationScore)
    if (!Number.isInteger(scoreNum) || scoreNum < 1 || scoreNum > 5) {
      return res.status(400).json({
        success: false,
        message: "validationScore must be an integer between 1 and 5.",
      })
    }

    if (!quizVersion || typeof quizVersion !== "string") {
      return res.status(400).json({
        success: false,
        message: "quizVersion is required.",
      })
    }

    const safeAccurateAreas = Array.isArray(accurateAreas)
      ? accurateAreas.filter((item) => typeof item === "string" && item.trim().length > 0)
      : []

    const safeInaccurateAreas = Array.isArray(inaccurateAreas)
      ? inaccurateAreas.filter((item) => typeof item === "string" && item.trim().length > 0)
      : []

    const safeFeedbackText = typeof feedbackText === "string" ? feedbackText.trim() : ""

    const userId = req.user._id

    // Check for recent duplicate submission (within 1 minute for same quizVersion & archetype) to prevent accidental double-clicks
    const recentDuplicate = await ArchetypeValidation.findOne({
      userId,
      archetype: canonicalArchetype,
      quizVersion,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
    })

    if (recentDuplicate) {
      return res.status(200).json({
        success: true,
        message: "Feedback already recorded.",
        data: {
          id: recentDuplicate._id,
          archetype: recentDuplicate.archetype,
          validationScore: recentDuplicate.validationScore,
          isHighFit: recentDuplicate.isHighFit,
        },
      })
    }

    const validationDoc = new ArchetypeValidation({
      userId,
      archetype: canonicalArchetype,
      quizVersion,
      validationScore: scoreNum,
      isHighFit: scoreNum >= 4,
      accurateAreas: safeAccurateAreas,
      inaccurateAreas: safeInaccurateAreas,
      feedbackText: safeFeedbackText,
    })

    await validationDoc.save()

    console.log(
      `[ARCHETYPE VALIDATION] Recorded resonance for ${req.user.name || req.user.email}: Archetype="${canonicalArchetype}", Score=${scoreNum}, HighFit=${scoreNum >= 4}`
    )

    return res.status(201).json({
      success: true,
      message: "Feedback recorded successfully.",
      data: {
        id: validationDoc._id,
        archetype: validationDoc.archetype,
        validationScore: validationDoc.validationScore,
        isHighFit: validationDoc.isHighFit,
      },
    })
  } catch (err) {
    console.error("[ARCHETYPE VALIDATION] Error saving validation:", err.message)
    return res.status(500).json({
      success: false,
      message: "Server error saving archetype validation feedback.",
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/archetype/stats/public
// Returns anonymized, aggregate resonance stats for an archetype
// Strictly adheres to MIN_PUBLIC_RESPONSES threshold (default 30)
// Never exposes individual user data, names, emails, or personal comments
// ─────────────────────────────────────────────────────────────────────────────
router.get("/stats/public", async (req, res) => {
  try {
    const rawArchetype = req.query.archetype
    const canonicalArchetype = normalizeArchetype(rawArchetype)

    if (!canonicalArchetype) {
      return res.status(400).json({
        success: false,
        message: `Please specify a valid archetype query parameter.`,
      })
    }

    const quizVersion = req.query.quizVersion || "v1"

    const total = await ArchetypeValidation.countDocuments({
      archetype: canonicalArchetype,
      quizVersion,
    })

    if (total < MIN_PUBLIC_RESPONSES) {
      return res.status(200).json({
        success: true,
        data: {
          archetype: canonicalArchetype,
          hasSufficientData: false,
          totalResponses: total,
          minRequired: MIN_PUBLIC_RESPONSES,
          statement: "You're helping us validate this stress pattern.",
        },
      })
    }

    const highFitCount = await ArchetypeValidation.countDocuments({
      archetype: canonicalArchetype,
      quizVersion,
      validationScore: { $gte: 4 },
    })

    const strongResonancePct = Math.round((highFitCount / total) * 100)

    return res.status(200).json({
      success: true,
      data: {
        archetype: canonicalArchetype,
        hasSufficientData: true,
        totalResponses: total,
        strongResonancePercentage: strongResonancePct,
        statement: `${strongResonancePct}% of people who received this archetype said it strongly resonated with them.`,
      },
    })
  } catch (err) {
    console.error("[ARCHETYPE VALIDATION] Error fetching public stats:", err.message)
    return res.status(500).json({
      success: false,
      message: "Server error fetching aggregate resonance stats.",
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/archetype/analytics (Admin / Founder / R&D Protected)
// Returns full anonymized aggregate metrics per archetype:
// - Total responses
// - Average resonance score (out of 5)
// - High-fit percentage (score 4-5)
// - Moderate-fit percentage (score 3)
// - Low-fit percentage (score 1-2)
// - Accurate areas breakdown (%)
// - Inaccurate areas breakdown (%)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/analytics", requireAdmin, async (req, res) => {
  try {
    const quizVersion = req.query.quizVersion || "v1"

    const allValidations = await ArchetypeValidation.find({ quizVersion }).lean()

    const analyticsByArchetype = {}

    for (const archetype of VALID_ARCHETYPES) {
      const records = allValidations.filter((r) => r.archetype === archetype)
      const total = records.length

      if (total === 0) {
        analyticsByArchetype[archetype] = {
          archetype,
          totalResponses: 0,
          averageScore: 0,
          highFitPct: 0,
          moderateFitPct: 0,
          lowFitPct: 0,
          accurateAreas: [],
          inaccurateAreas: [],
        }
        continue
      }

      const sumScore = records.reduce((acc, r) => acc + (r.validationScore || 0), 0)
      const avgScore = Number((sumScore / total).toFixed(1))

      const highFitCount = records.filter((r) => r.validationScore >= 4).length
      const moderateFitCount = records.filter((r) => r.validationScore === 3).length
      const lowFitCount = records.filter((r) => r.validationScore <= 2).length

      const highFitPct = Math.round((highFitCount / total) * 100)
      const moderateFitPct = Math.round((moderateFitCount / total) * 100)
      const lowFitPct = Math.round((lowFitCount / total) * 100)

      // Accurate areas breakdown across all respondents
      const accurateCounts = {}
      records.forEach((r) => {
        if (Array.isArray(r.accurateAreas)) {
          r.accurateAreas.forEach((area) => {
            accurateCounts[area] = (accurateCounts[area] || 0) + 1
          })
        }
      })
      const accurateAreas = Object.entries(accurateCounts)
        .map(([area, count]) => ({
          area,
          count,
          percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.percentage - a.percentage)

      // Inaccurate areas breakdown across low-fit respondents (score <= 2)
      const lowFitRecords = records.filter((r) => r.validationScore <= 2)
      const inaccurateCounts = {}
      lowFitRecords.forEach((r) => {
        if (Array.isArray(r.inaccurateAreas)) {
          r.inaccurateAreas.forEach((area) => {
            inaccurateCounts[area] = (inaccurateCounts[area] || 0) + 1
          })
        }
      })
      const inaccurateAreas = Object.entries(inaccurateCounts)
        .map(([area, count]) => ({
          area,
          count,
          percentage: Math.round((count / (lowFitRecords.length || 1)) * 100),
        }))
        .sort((a, b) => b.percentage - a.percentage)

      analyticsByArchetype[archetype] = {
        archetype,
        totalResponses: total,
        averageScore: avgScore,
        highFitPct,
        moderateFitPct,
        lowFitPct,
        accurateAreas,
        inaccurateAreas,
      }
    }

    const overallTotal = allValidations.length
    const overallAvg =
      overallTotal > 0
        ? Number(
            (allValidations.reduce((a, b) => a + (b.validationScore || 0), 0) / overallTotal).toFixed(1)
          )
        : 0

    return res.status(200).json({
      success: true,
      data: {
        quizVersion,
        overallTotal,
        overallAverageScore: overallAvg,
        byArchetype: analyticsByArchetype,
      },
    })
  } catch (err) {
    console.error("[ARCHETYPE VALIDATION] Error compiling analytics:", err.message)
    return res.status(500).json({
      success: false,
      message: "Server error compiling archetype validation analytics.",
    })
  }
})

module.exports = router
