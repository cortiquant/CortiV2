const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const Intervention = require("../models/Intervention")
const InterventionSession = require("../models/InterventionSession")
const Assessment = require("../models/Assessment")
const User = require("../models/User")
const { requireActiveEmployee } = require("../middleware/auth")
const { getOrCreateIntervention } = require("../services/interventionService")

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/interventions/record
// Unified employee endpoint to start or complete an intervention session.
// Automatically retrieves preMSI from employee's latest assessment,
// calculates msiChange if postMSI is provided, and records departmentId.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/record", requireActiveEmployee, async (req, res) => {
  try {
    const user = req.user
    const {
      interventionName,
      type = "RESET_LAB",
      category = "General",
      duration = 0,
      postFeeling = null,
      status = "Completed",
      metadata = {},
    } = req.body

    if (!interventionName) {
      return res.status(400).json({ success: false, message: "Intervention name is required." })
    }

    // 1. Get or create intervention in employee's organisation
    const intervention = await getOrCreateIntervention(
      user.organisationId,
      interventionName,
      type,
      category
    )

    // 2. Fetch employee's latest MSI assessment for preMSI
    const latestAssessment = await Assessment.findOne({
      userId: user._id,
      status: "Completed",
    }).sort({ completedAt: -1 })

    const preMSI = latestAssessment ? latestAssessment.msi : (user.baselineMsi ?? null)

    // 3. Post-MSI calculation if feeling is provided
    let postMSI = null
    let msiChange = null

    if (preMSI != null) {
      if (postFeeling) {
        // Observational feeling delta mapping
        const feelingLower = String(postFeeling).toLowerCase()
        let feelingDelta = 0
        if (feelingLower.includes("much better") || feelingLower.includes("great") || feelingLower.includes("energised")) {
          feelingDelta = -14
        } else if (feelingLower.includes("better") || feelingLower.includes("calm") || feelingLower.includes("good") || feelingLower.includes("relaxed")) {
          feelingDelta = -8
        } else if (feelingLower.includes("about the same") || feelingLower.includes("okay")) {
          feelingDelta = -2
        } else if (feelingLower.includes("not really") || feelingLower.includes("still")) {
          feelingDelta = 0
        } else {
          feelingDelta = -5
        }
        postMSI = Math.max(0, Math.min(100, Math.round(preMSI + feelingDelta)))
        msiChange = postMSI - preMSI
      }
    }

    const session = new InterventionSession({
      interventionId: intervention._id,
      interventionName: intervention.name,
      type: intervention.type,
      category: intervention.category,
      employeeId: user._id,
      organisationId: user.organisationId,
      departmentId: user.departmentId || null,
      startedAt: new Date(Date.now() - (duration ? duration * 1000 : 60000)),
      completedAt: new Date(),
      status: status || "Completed",
      preMSI,
      postMSI,
      msiChange,
      duration: duration || 0,
      metadata: {
        ...metadata,
        postFeeling,
      },
    })

    await session.save()

    // If type is HUMAN_LISTENER, create a real ListenerSession and notify active listeners
    if (type === "HUMAN_LISTENER" || interventionName.toLowerCase().includes("listener")) {
      try {
        const Listener = require("../models/Listener")
        const ListenerSession = require("../models/ListenerSession")
        const ListenerNotification = require("../models/ListenerNotification")

        // Find an active listener
        let targetListener = await Listener.findOne({ status: "Active", availabilityStatus: "Available" })
        if (!targetListener) {
          targetListener = await Listener.findOne({ status: "Active" })
        }

        if (targetListener) {
          const randNum = Math.floor(1000 + Math.random() * 9000)
          const sid = `S-${randNum}`
          const bookingDate = metadata.day === "tomorrow" ? "Tomorrow" : "Today"
          const bookingTime = metadata.timeSlot || "18:00"

          const lSession = await ListenerSession.create({
            sessionId: sid,
            listenerId: targetListener._id,
            employeeId: user._id,
            organisationId: user.organisationId,
            date: bookingDate,
            time: bookingTime,
            duration: 45,
            status: "Requested",
            scheduledAt: new Date(),
            metadata: {
              bookedByEmployee: true,
            },
          })

          await ListenerNotification.create({
            listenerId: targetListener._id,
            type: "session_request",
            title: "New Session Request",
            message: `A new anonymous listening session (${sid}) has been requested for ${bookingDate} at ${bookingTime}.`,
            data: { sessionId: sid, listenerSessionId: lSession._id.toString() },
          })
        }
      } catch (listenerLinkErr) {
        console.warn("[INTERVENTIONS] ListenerSession creation warning:", listenerLinkErr.message)
      }
    }

    return res.status(201).json({
      success: true,
      message: "Intervention recorded successfully.",
      data: {
        sessionId: session._id,
        interventionName: intervention.name,
        preMSI,
        postMSI,
        msiChange,
      },
    })
  } catch (err) {
    console.error("[INTERVENTIONS-EMPLOYEE] Error recording intervention:", err.message)
    return res.status(500).json({ success: false, message: "Error recording intervention session." })
  }
})

module.exports = router
