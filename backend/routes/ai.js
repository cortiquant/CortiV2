const express = require("express")
const router = express.Router()
const RootCauseAssessment = require("../models/RootCauseAssessment")
const Assessment = require("../models/Assessment")
const CorporateOnboarding = require("../models/CorporateOnboarding")
const { requireActiveEmployee } = require("../middleware/auth")
const { logActivity } = require("../services/activityService")
const { generateAnalysisAndRecommendations } = require("../services/aiRecommendationService")

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/root-cause-recommendations
// Generates AI analysis & recommendations for the authenticated employee.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/root-cause-recommendations", requireActiveEmployee, async (req, res) => {
  try {
    const user = req.user
    const {
      msi,
      rootCause,
      cause,
      relevantResponses,
    } = req.body

    let effectiveRootCause = rootCause
    let effectiveCause = cause
    let effectiveResponses = Array.isArray(relevantResponses) ? relevantResponses : []

    // If rootCause is not passed, attempt to resolve from user's latest RootCauseAssessment or latest Daily Check-in
    if (!effectiveRootCause) {
      const latestRc = await RootCauseAssessment.findOne({
        userId: user._id,
      }).sort({ createdAt: -1 })

      if (latestRc && latestRc.primaryCause) {
        effectiveRootCause = latestRc.primaryCause
        effectiveCause = latestRc.secondaryCause || latestRc.primaryCause
        effectiveResponses = latestRc.responses || []
      } else {
        const latestCheckin = await Assessment.findOne({
          userId: user._id,
          type: "Daily Check-in (MSI)",
        }).sort({ completedAt: -1 })

        if (latestCheckin && (latestCheckin.driver || latestCheckin.responses?.stressor)) {
          const rawDriver = latestCheckin.driver || latestCheckin.responses?.stressor
          // Normalize to one of the 6 cause categories if possible
          const lower = rawDriver.toLowerCase()
          if (lower.includes("work") || lower.includes("deadline")) effectiveRootCause = "Workload"
          else if (lower.includes("people") || lower.includes("conflict") || lower.includes("manager") || lower.includes("colleague")) effectiveRootCause = "People"
          else if (lower.includes("target") || lower.includes("performance") || lower.includes("fail")) effectiveRootCause = "Performance"
          else if (lower.includes("future") || lower.includes("career") || lower.includes("growth")) effectiveRootCause = "Future"
          else if (lower.includes("sleep") || lower.includes("tired") || lower.includes("energy") || lower.includes("fatigue")) effectiveRootCause = "Sleep & Energy"
          else effectiveRootCause = "Personal"
          effectiveCause = rawDriver
        } else {
          // If no root cause or stressor is recorded yet, use a gentle default
          effectiveRootCause = "Workload"
          effectiveCause = "Daily workplace pressure"
        }
      }
    }

    // Resolve trusted MSI from database or payload
    let resolvedMsi = msi
    if (resolvedMsi == null || typeof resolvedMsi !== "number") {
      const latestDaily = await Assessment.findOne({
        userId: user._id,
        type: "Daily Check-in (MSI)",
      }).sort({ completedAt: -1 })
      resolvedMsi = latestDaily ? latestDaily.msi : (user.baselineMsi ?? 50)
    }

    // Resolve trusted employee context (NO passwords, emails, tokens, or PII exposed to AI)
    let employeeContext = {
      department: user.department || null,
      designation: user.designation || null,
      workArrangement: user.workArrangement || null,
      tenure: user.tenure || null,
    }

    // Check CorporateOnboarding for participant profile if user doc is missing fields
    if (!employeeContext.department || !employeeContext.designation) {
      const onboarding = await CorporateOnboarding.findOne({ userId: user._id })
      if (onboarding && onboarding.participantProfile) {
        const p = onboarding.participantProfile
        employeeContext.department = employeeContext.department || p.D3 || null
        employeeContext.designation = employeeContext.designation || p.D4 || null
        employeeContext.tenure = employeeContext.tenure || p.D5 || null
        employeeContext.workArrangement = employeeContext.workArrangement || p.D7 || null
      }
    }

    // Call AI recommendation service (or fallback engine)
    const aiResult = await generateAnalysisAndRecommendations({
      msi: resolvedMsi,
      rootCause: effectiveRootCause,
      cause: effectiveCause || effectiveRootCause,
      relevantResponses: effectiveResponses,
      employeeContext,
    })

    // Persist into RootCauseAssessment collection
    const assessmentDoc = new RootCauseAssessment({
      userId: user._id,
      employeeId: user.employeeId || null,
      organisationId: user.organisationId,
      organisationCode: user.organisationCode || null,
      msiAtAssessment: resolvedMsi,
      primaryCause: effectiveRootCause,
      causeSeverity: resolvedMsi >= 81 ? "Severe" : resolvedMsi >= 61 ? "High" : "Moderate",
      summary: aiResult.summary,
      contributingFactors: aiResult.contributingFactors,
      responses: Array.isArray(effectiveResponses)
        ? effectiveResponses.map((r) => ({
            questionId: r.questionId || "q",
            question: r.question || "",
            answer: r.answer || "",
            answerScore: r.answerScore ?? 0,
          }))
        : [],
      explanation: aiResult.summary,
      recommendations: aiResult.recommendations.map((r, idx) => ({
        id: r.id || `rec_${Date.now()}_${idx}`,
        type: r.type,
        title: r.title,
        description: r.description,
        priority: r.priority,
        reason: r.reason,
        cta: r.cta,
        ctaText: r.ctaText,
        icon: r.icon,
      })),
      createdAt: new Date(),
    })

    await assessmentDoc.save()

    // Also persist into Recommendation collection for instant retrieval
    try {
      const Recommendation = require("../models/Recommendation")
      const recDoc = new Recommendation({
        employeeId: user._id,
        organisationId: user.organisationId,
        assessmentId: assessmentDoc._id,
        msiScore: resolvedMsi,
        primaryCause: effectiveRootCause,
        recommendations: aiResult.recommendations.map((r) => {
          const isFeature = r.type === "cortiquant_feature" || r.type === "feature" || Boolean(r.featureKey)
          return {
            type: isFeature ? "feature" : "action",
            title: r.title,
            description: r.description,
            featureKey: r.featureKey || (isFeature ? "reset-labs" : null),
            cta: r.cta || (isFeature ? "Explore Resets →" : "Try this →"),
            icon: r.icon || (isFeature ? "✨" : "📋"),
            priority: r.priority || "medium",
            reason: r.reason || null,
          }
        }),
      })
      await recDoc.save()
    } catch (recSaveErr) {
      console.warn("[AI-RECOMMENDATIONS] Error saving into Recommendation model:", recSaveErr.message)
    }

    console.log(`[AI-RECOMMENDATIONS] Generated and saved for ${user.username || user.name}: Cause=${rootCause}, MSI=${resolvedMsi}`)

    await logActivity({
      req,
      user,
      action: "AI Root Cause Recommendations Generated",
      status: "Success",
      organisationId: user.organisationId,
      entityType: "RootCauseAssessment",
      entityId: assessmentDoc._id,
      details: `AI root cause analysis: ${rootCause} with ${aiResult.recommendations.length} recommendations`,
    })

    return res.status(200).json({
      success: true,
      data: {
        msi: resolvedMsi,
        summary: aiResult.summary,
        rootCause: aiResult.rootCause,
        contributingFactors: aiResult.contributingFactors,
        recommendations: aiResult.recommendations,
        assessmentId: assessmentDoc._id,
      },
    })
  } catch (err) {
    console.error("[AI-RECOMMENDATIONS] POST / error:", err.message)
    return res.status(500).json({ success: false, message: "Failed to generate AI recommendations." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/priority-reset
// Generates personalized AI Priority Path analysis for employee tasks.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/priority-reset", requireActiveEmployee, async (req, res) => {
  try {
    const user = req.user
    const { tasks, history, msi: requestedMsi } = req.body

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A list of tasks is required for Priority Path analysis.",
      })
    }

    // Resolve trusted MSI
    let resolvedMsi = requestedMsi
    if (resolvedMsi == null || typeof resolvedMsi !== "number") {
      const latestDaily = await Assessment.findOne({
        userId: user._id,
        type: "Daily Check-in (MSI)",
      }).sort({ completedAt: -1 })
      resolvedMsi = latestDaily ? latestDaily.msi : (user.baselineMsi ?? 50)
    }

    // Safe employee context
    const userContext = {
      department: user.department || null,
      designation: user.designation || null,
    }

    const { generatePriorityPathAnalysis } = require("../services/aiRecommendationService")
    const priorityPath = await generatePriorityPathAnalysis({
      tasks,
      msi: resolvedMsi,
      history: history || {},
      userContext,
    })

    await logActivity({
      req,
      user,
      action: "AI Priority Path Generated",
      status: "Success",
      organisationId: user.organisationId,
      entityType: "PriorityReset",
      details: `AI Priority Path generated for ${tasks.length} tasks (MSI: ${resolvedMsi})`,
    })

    return res.status(200).json({
      success: true,
      data: priorityPath,
    })
  } catch (err) {
    console.error("[PRIORITY-AI-ROUTE] POST /priority-reset error:", err.message)
    return res.status(500).json({
      success: false,
      message: "Unable to analyze priority path right now.",
    })
  }
})

module.exports = router

