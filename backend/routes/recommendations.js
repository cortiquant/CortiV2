const express = require("express")
const router = express.Router()
const Recommendation = require("../models/Recommendation")
const RootCauseAssessment = require("../models/RootCauseAssessment")
const Assessment = require("../models/Assessment")
const CorporateOnboarding = require("../models/CorporateOnboarding")
const { requireActiveEmployee } = require("../middleware/auth")
const { logActivity } = require("../services/activityService")
const { generateAnalysisAndRecommendations } = require("../services/aiRecommendationService")

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/recommendations/latest
// Returns the latest saved AI recommendations for the authenticated employee.
// If not yet generated but a root cause assessment exists, it generates & saves them.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/latest", requireActiveEmployee, async (req, res) => {
  try {
    const user = req.user

    // 1. Fetch employee's latest RootCauseAssessment (strict organisation/user scoping)
    const latestRc = await RootCauseAssessment.findOne({
      userId: user._id,
      organisationId: user.organisationId,
    }).sort({ createdAt: -1 })

    // If employee hasn't completed root-cause flow, return null so frontend shows default/pre-assessment state
    if (!latestRc) {
      return res.status(200).json({
        success: true,
        data: null,
      })
    }

    // 2. Check if recommendations already exist for this employee and assessment
    let recDoc = await Recommendation.findOne({
      employeeId: user._id,
      organisationId: user.organisationId,
      assessmentId: latestRc._id,
    }).sort({ createdAt: -1 })

    // Or check by employeeId created at or after the assessment
    if (!recDoc) {
      recDoc = await Recommendation.findOne({
        employeeId: user._id,
        organisationId: user.organisationId,
      }).sort({ createdAt: -1 })

      // Verify recDoc matches latest primaryCause
      if (recDoc && recDoc.primaryCause !== latestRc.primaryCause) {
        recDoc = null
      }
    }

    // 3. If recommendation document found, return it directly
    if (recDoc && Array.isArray(recDoc.recommendations) && recDoc.recommendations.length > 0) {
      return res.status(200).json({
        success: true,
        data: {
          id: recDoc._id,
          msiScore: recDoc.msiScore,
          primaryCause: recDoc.primaryCause,
          assessmentId: recDoc.assessmentId,
          recommendations: recDoc.recommendations,
          createdAt: recDoc.createdAt,
        },
      })
    }

    // 4. If root cause analysis exists but recommendations not yet stored in Recommendation collection:
    // Check if recommendations already exist inside latestRc doc
    if (Array.isArray(latestRc.recommendations) && latestRc.recommendations.length > 0) {
      // Normalize and persist into Recommendation collection
      const newRecDoc = new Recommendation({
        employeeId: user._id,
        organisationId: user.organisationId,
        assessmentId: latestRc._id,
        msiScore: latestRc.msiAtAssessment ?? 50,
        primaryCause: latestRc.primaryCause,
        recommendations: latestRc.recommendations.map((r) => {
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

      await newRecDoc.save()

      return res.status(200).json({
        success: true,
        data: {
          id: newRecDoc._id,
          msiScore: newRecDoc.msiScore,
          primaryCause: newRecDoc.primaryCause,
          assessmentId: newRecDoc.assessmentId,
          recommendations: newRecDoc.recommendations,
          createdAt: newRecDoc.createdAt,
        },
      })
    }

    // 5. Otherwise generate using AI service
    const resolvedMsi = latestRc.msiAtAssessment ?? 50
    let employeeContext = {
      department: user.department || null,
      designation: user.designation || null,
      workArrangement: user.workArrangement || null,
      tenure: user.tenure || null,
    }

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

    const aiResult = await generateAnalysisAndRecommendations({
      msi: resolvedMsi,
      rootCause: latestRc.primaryCause,
      cause: latestRc.secondaryCause || latestRc.primaryCause,
      relevantResponses: latestRc.responses || [],
      employeeContext,
    })

    const newRec = new Recommendation({
      employeeId: user._id,
      organisationId: user.organisationId,
      assessmentId: latestRc._id,
      msiScore: resolvedMsi,
      primaryCause: latestRc.primaryCause,
      recommendations: aiResult.recommendations.map((r) => ({
        type: r.type === "cortiquant_feature" || r.type === "feature" ? "feature" : "action",
        title: r.title,
        description: r.description,
        featureKey: r.featureKey || (r.type === "cortiquant_feature" ? "reset-labs" : null),
        cta: r.cta || (r.type === "cortiquant_feature" ? "Explore Resets →" : "Try this →"),
        icon: r.icon,
        priority: r.priority || "medium",
        reason: r.reason || null,
      })),
    })

    await newRec.save()

    // Also update RootCauseAssessment for consistency
    latestRc.recommendations = aiResult.recommendations
    latestRc.summary = aiResult.summary
    latestRc.contributingFactors = aiResult.contributingFactors
    await latestRc.save()

    return res.status(200).json({
      success: true,
      data: {
        id: newRec._id,
        msiScore: newRec.msiScore,
        primaryCause: newRec.primaryCause,
        assessmentId: newRec.assessmentId,
        recommendations: newRec.recommendations,
        createdAt: newRec.createdAt,
      },
    })
  } catch (err) {
    console.error("[RECOMMENDATIONS] GET /latest error:", err.message)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch recommendations.",
    })
  }
})

module.exports = router
