const express = require("express")
const router = express.Router()
const { requireActiveEmployee } = require("../middleware/auth")
const { generateDumpBagReflection } = require("../services/aiRecommendationService")

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/dumpbag/reflection
// Generates CBT-informed reflection on employee's private Dump Bag entry.
// Content is strictly private to the user; never exposed to HR/org dashboards.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/reflection", requireActiveEmployee, async (req, res) => {
  try {
    const { text } = req.body

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Text is required.",
      })
    }

    const trimmedText = text.trim()

    if (trimmedText.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Text cannot exceed 5000 characters.",
      })
    }

    // Generate CBT-informed reflection using the project's existing AI engine
    const reflection = await generateDumpBagReflection(trimmedText)

    return res.status(200).json({
      success: true,
      reflection,
    })
  } catch (err) {
    console.error("[DUMPBAG-API] Reflection error:", err.message)
    return res.status(500).json({
      success: false,
      message: "Unable to reflect on this right now. Please try again.",
    })
  }
})

module.exports = router
