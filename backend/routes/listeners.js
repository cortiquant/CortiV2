const express = require("express")
const router = express.Router()
const Listener = require("../models/Listener")
const ListenerInvitation = require("../models/ListenerInvitation")
const { logActivity } = require("../services/activityService")
const { signToken, requireListener, requireAuth } = require("../middleware/auth")
const { sendBookingConfirmationEmail } = require("../services/emailService")

// Helper: Consistent date and time calculation in Asia/Kolkata timezone
function getKolkataDates() {
  const timeZone = "Asia/Kolkata"
  const now = new Date()
  const todayStr = now.toLocaleDateString("en-CA", { timeZone })
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowStr = tomorrow.toLocaleDateString("en-CA", { timeZone })
  return { todayStr, tomorrowStr }
}

function getKolkataNow() {
  const timeZone = "Asia/Kolkata"
  const now = new Date()
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now)

  const p = {}
  for (const part of parts) {
    p[part.type] = part.value
  }

  const todayStr = `${p.year}-${p.month}-${p.day}`
  const currentMinutes = parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10)
  const currentTimeStr = `${p.hour}:${p.minute}`

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowStr = tomorrow.toLocaleDateString("en-CA", { timeZone })

  return { todayStr, tomorrowStr, currentMinutes, currentTimeStr, raw: now }
}

function parseTimeToMinutes(t) {
  if (!t || typeof t !== "string") return null
  const match = t.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
  if (!match) return null
  let hour = parseInt(match[1], 10)
  const min = parseInt(match[2], 10)
  const ampm = match[3] ? match[3].toUpperCase() : null
  if (ampm === "PM" && hour < 12) hour += 12
  if (ampm === "AM" && hour === 12) hour = 0
  return hour * 60 + min
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/listener/login
//
// Public — Listener login using email & password
// ─────────────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // 1. Query listener including passwordHash
    const listener = await Listener.findOne({ email: normalizedEmail }).select("+passwordHash")

    if (!listener) {
      console.log(`[LISTENER AUTH] Login failed — listener not found: ${normalizedEmail}`)
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      })
    }

    // 2. Account status validation
    if (listener.status === "Pending") {
      return res.status(403).json({
        success: false,
        message: "Your listener invitation is pending. Please accept the invitation link sent to your email to set your password.",
      })
    }

    if (listener.status === "Inactive") {
      return res.status(403).json({
        success: false,
        message: "Your listener account has been deactivated. Please contact your platform administrator.",
      })
    }

    if (listener.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Account is not active. Please contact administrator.",
      })
    }

    // 3. Password check
    const isMatch = await listener.comparePassword(password)
    if (!isMatch) {
      console.log(`[LISTENER AUTH] Password mismatch for listener: ${normalizedEmail}`)
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      })
    }

    // 4. Update last login
    listener.lastLoginAt = new Date()
    await listener.save().catch((err) => console.warn("[LISTENER AUTH] Could not update lastLoginAt:", err.message))

    // 5. Generate JWT token
    const token = signToken(listener._id, {
      role: "LISTENER",
      listenerId: listener.listenerId,
      email: listener.email,
      name: listener.name,
    })

    // 6. Audit activity log
    await logActivity({
      req,
      user: {
        _id: listener._id,
        name: listener.name,
        email: listener.email,
        role: "LISTENER",
      },
      action: "Listener Login",
      status: "Success",
      entityType: "Listener",
      entityId: listener._id,
      details: `Listener logged in: ${listener.name} (${listener.listenerId})`,
    })

    console.log(`[LISTENER AUTH] Listener logged in successfully: ${listener.listenerId} (${listener.email})`)

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      listener: listener.toSafeObject(),
    })
  } catch (err) {
    console.error("[LISTENER AUTH] Login error:", err.message)
    res.status(500).json({ success: false, message: "An unexpected server error occurred during login." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/listener/validate-invite
//
// Public — validates an invitation token and returns safe listener metadata
// ─────────────────────────────────────────────────────────────────────────────
router.get("/validate-invite", async (req, res) => {
  try {
    const { token } = req.query

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({ success: false, message: "Invitation token is required." })
    }

    const tokenHash = ListenerInvitation.hashToken(token.trim())

    const invitation = await ListenerInvitation.findOne({ tokenHash })
    if (!invitation) {
      return res.status(400).json({ success: false, message: "Invitation link is invalid or expired." })
    }

    if (invitation.status === "Accepted") {
      return res.status(400).json({
        success: false,
        message: "This invitation has already been accepted. Please sign in to your dashboard.",
        isAccepted: true,
      })
    }

    if (invitation.status === "Revoked") {
      return res.status(400).json({
        success: false,
        message: "This invitation has been revoked by an administrator.",
      })
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      invitation.status = "Expired"
      await invitation.save().catch(() => {})
      return res.status(400).json({
        success: false,
        message: "This invitation link has expired. Please request a new invitation.",
      })
    }

    return res.status(200).json({
      success: true,
      invitation: {
        name: invitation.name,
        email: invitation.email,
        listenerId: invitation.listenerId,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (err) {
    console.error("[LISTENER AUTH] Validate invite error:", err.message)
    res.status(500).json({ success: false, message: "Server error validating invitation." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/listener/accept-invite
//
// Public — accepts invitation token, sets password, and activates listener account
// ─────────────────────────────────────────────────────────────────────────────
router.post("/accept-invite", async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({ success: false, message: "Invitation token is required." })
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." })
    }

    const tokenHash = ListenerInvitation.hashToken(token.trim())

    const invitation = await ListenerInvitation.findOne({ tokenHash })
    if (!invitation) {
      return res.status(400).json({ success: false, message: "Invitation link is invalid or expired." })
    }

    if (invitation.status === "Accepted") {
      return res.status(400).json({ success: false, message: "This invitation has already been accepted. Please log in." })
    }

    if (invitation.status === "Revoked") {
      return res.status(400).json({ success: false, message: "This invitation has been revoked by an administrator." })
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      invitation.status = "Expired"
      await invitation.save().catch(() => {})
      return res.status(400).json({ success: false, message: "This invitation link has expired." })
    }

    // Hash password
    const passwordHash = await Listener.hashPassword(password)
    const now = new Date()

    // Find or update the Listener account
    let listener = await Listener.findOne({ email: invitation.email.toLowerCase() }).select("+passwordHash")

    if (!listener) {
      // Create listener account if not pre-created
      listener = new Listener({
        listenerId: invitation.listenerId,
        name: invitation.name,
        email: invitation.email.toLowerCase(),
        passwordHash,
        role: "LISTENER",
        status: "Active",
        invitedBy: invitation.invitedBy,
        acceptedAt: now,
        lastLoginAt: now,
      })
    } else {
      listener.name = invitation.name || listener.name
      listener.passwordHash = passwordHash
      listener.status = "Active"
      listener.acceptedAt = now
      listener.lastLoginAt = now
    }

    await listener.save()

    // Mark invitation as Accepted
    invitation.status = "Accepted"
    invitation.acceptedAt = now
    await invitation.save()

    // Sign JWT token for automatic session login
    const sessionToken = signToken(listener._id, {
      role: "LISTENER",
      listenerId: listener.listenerId,
      email: listener.email,
      name: listener.name,
    })

    // Activity Log
    await logActivity({
      req,
      user: {
        _id: listener._id,
        name: listener.name,
        email: listener.email,
        role: "LISTENER",
      },
      action: "Listener Accepted Invitation",
      status: "Success",
      entityType: "Listener",
      entityId: listener._id,
      details: `Listener ${listener.name} accepted invitation and activated account (${listener.listenerId})`,
    })

    console.log(`[LISTENER AUTH] Account activated for: ${listener.listenerId} (${listener.email})`)

    return res.status(200).json({
      success: true,
      message: "Your listener account is now active! Redirecting to your dashboard...",
      token: sessionToken,
      listener: listener.toSafeObject(),
    })
  } catch (err) {
    console.error("[LISTENER AUTH] Accept invite error:", err.message)
    res.status(500).json({ success: false, message: "Server error activating listener account." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/listener/me
//
// Protected — fetches authenticated listener profile
// ─────────────────────────────────────────────────────────────────────────────
router.get("/me", requireListener, async (req, res) => {
  try {
    const listener = await Listener.findById(req.user._id)
    if (!listener) {
      return res.status(404).json({ success: false, message: "Listener account not found." })
    }

    return res.status(200).json({
      success: true,
      listener: listener.toSafeObject(),
    })
  } catch (err) {
    console.error("[LISTENER AUTH] GET /me error:", err.message)
    res.status(500).json({ success: false, message: "Server error fetching listener profile." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/listener/profile
//
// Protected — updates safe listener profile fields (bio, availabilityStatus)
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/profile", requireListener, async (req, res) => {
  try {
    const { bio, availabilityStatus } = req.body
    const listener = await Listener.findById(req.user._id)
    if (!listener) {
      return res.status(404).json({ success: false, message: "Listener account not found." })
    }

    if (typeof bio === "string") {
      listener.bio = bio.trim()
    }

    if (availabilityStatus && ["Available", "Busy", "Unavailable", "Offline"].includes(availabilityStatus)) {
      listener.availabilityStatus = availabilityStatus
    }

    await listener.save()

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      listener: listener.toSafeObject(),
    })
  } catch (err) {
    console.error("[LISTENER] PATCH /profile error:", err.message)
    res.status(500).json({ success: false, message: "Server error updating profile." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/listener/status
//
// Protected — toggles online availability status
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/status", requireListener, async (req, res) => {
  try {
    const { status } = req.body
    if (!["Available", "Busy", "Unavailable", "Offline"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." })
    }

    const listener = await Listener.findById(req.user._id)
    if (!listener) {
      return res.status(404).json({ success: false, message: "Listener not found." })
    }

    listener.availabilityStatus = status
    await listener.save()

    return res.status(200).json({
      success: true,
      availabilityStatus: listener.availabilityStatus,
    })
  } catch (err) {
    console.error("[LISTENER] PATCH /status error:", err.message)
    res.status(500).json({ success: false, message: "Server error updating status." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/listener/dashboard
//
// Protected — aggregates real stats from MongoDB for authenticated listener
// ─────────────────────────────────────────────────────────────────────────────
router.get("/dashboard", requireListener, async (req, res) => {
  try {
    const ListenerSession = require("../models/ListenerSession")
    const ListenerAvailability = require("../models/ListenerAvailability")
    const listenerId = req.user._id

    const { getSessionStartTimestamp, getSessionEndTimestamp, expirePassedSessions } = require("../services/sessionNotificationService")

    // Run automatic expiry check
    await expirePassedSessions()

    // Today's date in Asia/Kolkata
    const { todayStr, tomorrowStr } = getKolkataDates()

    // 1. Sessions Today:
    // Count only: ACTIVE + COMPLETED (or Active / Completed) today
    const sessionsTodayDocs = await ListenerSession.find({
      listenerId,
      $or: [
        { date: "Today" },
        { date: todayStr },
      ],
      status: { $in: ["ACTIVE", "COMPLETED", "Active", "In Progress", "Completed"] },
    })
    const sessionsToday = sessionsTodayDocs.length

    // 2. Completed Sessions (Lifetime):
    // Count only: COMPLETED (or Completed)
    const completedDocs = await ListenerSession.find({
      listenerId,
      status: { $in: ["COMPLETED", "Completed"] },
    })
    const completedSessions = completedDocs.length

    // 3. Upcoming Today:
    // Count only: BOOKED where startTime > now (and today)
    const nowMs = Date.now()
    const bookedDocsToday = await ListenerSession.find({
      listenerId,
      $or: [
        { date: "Today" },
        { date: todayStr },
      ],
      status: { $in: ["BOOKED", "Booked", "Confirmed", "Scheduled"] },
    })

    const upcomingToday = bookedDocsToday.filter((s) => {
      const startMs = getSessionStartTimestamp(s)
      return startMs && startMs > nowMs
    }).length

    // 4. Hours Listened (sum duration in minutes, divide by 60)
    const totalMinutes = completedDocs.reduce((acc, curr) => {
      const dur = curr.actualDurationMinutes || curr.durationMinutes || curr.duration || 10
      return acc + dur
    }, 0)
    const totalHoursListened = Number((totalMinutes / 60).toFixed(1))

    // 5. Next Session: nearest upcoming active/booked session where sessionEndTime > now
    const activeSessions = await ListenerSession.find({
      listenerId,
      status: { $in: ["BOOKED", "ACTIVE", "Booked", "Confirmed", "Scheduled", "Active", "In Progress"] },
    })

    const mappedSessions = activeSessions
      .map((s) => {
        const startTimestamp = getSessionStartTimestamp(s)
        const dur = s.durationMinutes || s.duration || 10
        const endTimestamp = getSessionEndTimestamp(s) || (startTimestamp ? startTimestamp + dur * 60 * 1000 : null)
        return { doc: s, startTimestamp, endTimestamp, dur }
      })
      .filter((item) => {
        if (!item.endTimestamp) return false
        return item.endTimestamp > nowMs
      })

    mappedSessions.sort((a, b) => {
      if (!a.startTimestamp) return 1
      if (!b.startTimestamp) return -1
      return a.startTimestamp - b.startTimestamp
    })

    let nextSession = null
    if (mappedSessions.length > 0) {
      const earliest = mappedSessions[0]
      const nextSessionDoc = earliest.doc
      const effectiveClientId = nextSessionDoc.clientId || "Anonymous Participant"
      nextSession = {
        id: nextSessionDoc._id.toString(),
        sessionId: nextSessionDoc.sessionId,
        clientId: effectiveClientId,
        sessionType: nextSessionDoc.sessionType || "Peer Support",
        date: nextSessionDoc.date,
        time: nextSessionDoc.time,
        startTime: nextSessionDoc.startTime || nextSessionDoc.time,
        endTime: nextSessionDoc.endTime,
        duration: `${nextSessionDoc.durationMinutes || nextSessionDoc.duration || 10} min`,
        durationMinutes: nextSessionDoc.durationMinutes || nextSessionDoc.duration || 10,
        status: nextSessionDoc.status === "In Progress" ? "In Progress" : nextSessionDoc.status,
        participant: `Client ID: ${effectiveClientId}`,
        startTimestamp: earliest.startTimestamp,
        endTimestamp: earliest.endTimestamp,
      }
    }

    // 5. Today's Availability from MongoDB
    const todaysAvailabilityDocs = await ListenerAvailability.find({
      listenerId,
      $or: [{ day: "today" }, { date: todayStr }],
    }).sort({ time: 1 })

    const todaysAvailability = todaysAvailabilityDocs.map((s) => ({
      id: s._id.toString(),
      time: s.time,
      status: s.status,
    }))

    // 6. Pending Session Requests (only REQUESTED sessions)
    const pendingRequests = await ListenerSession.find({
      listenerId,
      status: { $in: ["REQUESTED", "Requested"] },
    }).sort({ createdAt: -1 })

    const pendingSessionRequests = pendingRequests.map((r) => ({
      id: r._id.toString(),
      sessionId: r.sessionId,
      clientId: r.clientId || "Anonymous Participant",
      date: r.date,
      time: r.time,
      dur: `${r.durationMinutes || r.duration || 10} min`,
      status: r.status,
      participant: r.clientId ? `Client ID: ${r.clientId}` : "Anonymous Participant",
    }))

    return res.status(200).json({
      success: true,
      sessionsToday,
      upcomingToday,
      totalHoursListened,
      completedSessions,
      currentStatus: req.user.availabilityStatus || "Available",
      nextSession,
      todaysAvailability,
      pendingSessionRequests,
    })
  } catch (err) {
    console.error("[LISTENER] GET /dashboard error:", err.message)
    res.status(500).json({ success: false, message: "Unable to load dashboard. Please try again." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/listener/availability
//
// Protected — fetches listener's availability slots
// ─────────────────────────────────────────────────────────────────────────────
router.get("/availability", requireListener, async (req, res) => {
  try {
    const ListenerAvailability = require("../models/ListenerAvailability")
    const listenerId = req.user._id

    const { todayStr, tomorrowStr } = getKolkataDates()

    const slots = await ListenerAvailability.find({ listenerId }).sort({ time: 1 })

    const today = []
    const tomorrow = []

    slots.forEach((s) => {
      const slotObj = {
        id: s._id.toString(),
        time: s.time,
        status: s.status,
      }
      if (s.day === "today" || s.date === todayStr) {
        today.push(slotObj)
      } else if (s.day === "tomorrow" || s.date === tomorrowStr) {
        tomorrow.push(slotObj)
      }
    })

    return res.status(200).json({
      success: true,
      today,
      tomorrow,
      all: slots.map((s) => ({
        id: s._id.toString(),
        day: s.day,
        date: s.date,
        time: s.time,
        status: s.status,
      })),
    })
  } catch (err) {
    console.error("[LISTENER] GET /availability error:", err.message)
    res.status(500).json({ success: false, message: "Unable to load availability slots." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/listener/availability
//
// Protected — saves / updates availability slots for today and/or tomorrow
// ─────────────────────────────────────────────────────────────────────────────
router.post("/availability", requireListener, async (req, res) => {
  try {
    const ListenerAvailability = require("../models/ListenerAvailability")
    const listenerId = req.user._id
    const { slots, day } = req.body // slots: string array like ["09:10", "09:30"], day: "today" | "tomorrow"

    if (!Array.isArray(slots) || !day || !["today", "tomorrow"].includes(day)) {
      return res.status(400).json({ success: false, message: "Valid slots array and day ('today' or 'tomorrow') are required." })
    }

    const { todayStr, tomorrowStr } = getKolkataDates()
    const targetDateStr = day === "tomorrow" ? tomorrowStr : todayStr

    // 1. Remove existing slots for this day that are not currently booked
    await ListenerAvailability.deleteMany({
      listenerId,
      $or: [{ day }, { date: targetDateStr }],
      status: { $ne: "Booked" },
    })

    // 2. Fetch existing booked slots for this day so we don't overwrite or duplicate them
    const existingBooked = await ListenerAvailability.find({
      listenerId,
      $or: [{ day }, { date: targetDateStr }],
      status: "Booked",
    })
    const bookedTimeSet = new Set(existingBooked.map((b) => b.time))

    // 3. Create updated slots (only for times not already booked)
    const uniqueTimes = Array.from(new Set(slots.map((t) => String(t).trim()))).filter((t) => Boolean(t) && !bookedTimeSet.has(t))
    const docs = uniqueTimes.map((time) => ({
      listenerId,
      day,
      date: targetDateStr,
      time,
      status: "Available",
    }))

    if (docs.length > 0) {
      await ListenerAvailability.insertMany(docs, { ordered: false }).catch(() => {})
    }

    // Activity Log
    await logActivity({
      req,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: "LISTENER",
      },
      action: "Availability Updated",
      status: "Success",
      entityType: "ListenerAvailability",
      details: `Listener ${req.user.name} updated ${day} availability (${uniqueTimes.length} new/active slots, ${existingBooked.length} booked slots preserved)`,
    })

    return res.status(200).json({
      success: true,
      message: "Availability saved successfully.",
      count: uniqueTimes.length + existingBooked.length,
      day,
    })
  } catch (err) {
    console.error("[LISTENER] POST /availability error:", err.message)
    res.status(500).json({ success: false, message: "Failed to save availability." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/listener/sessions
//
// Protected — fetches real sessions for the authenticated listener
// ─────────────────────────────────────────────────────────────────────────────
router.get("/sessions", requireListener, async (req, res) => {
  try {
    const ListenerSession = require("../models/ListenerSession")
    const listenerId = req.user._id

    const sessions = await ListenerSession.find({ listenerId }).sort({ createdAt: -1 })

    const upcoming = []
    const completed = []
    const requested = []
    const cancelled = []

    sessions.forEach((s) => {
      const item = {
        id: s._id.toString(),
        sessionId: s.sessionId,
        clientId: s.clientId || "Anonymous Participant",
        date: s.date,
        time: s.time,
        dur: `${s.durationMinutes || s.duration || 10} min`,
        status: s.status,
        participant: s.clientId ? `Client ID: ${s.clientId}` : "Anonymous Participant",
        scheduledAt: s.scheduledAt,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      }

      if (["Scheduled", "Confirmed", "In Progress", "BOOKED", "Booked", "ACTIVE", "Active"].includes(s.status)) {
        upcoming.push(item)
      } else if (["Completed", "COMPLETED"].includes(s.status)) {
        completed.push(item)
      } else if (["Requested", "REQUESTED"].includes(s.status)) {
        requested.push(item)
      } else {
        cancelled.push(item)
      }
    })

    return res.status(200).json({
      success: true,
      sessions: {
        upcoming,
        completed,
        requested,
        cancelled,
      },
      all: sessions.map((s) => ({
        id: s._id.toString(),
        sessionId: s.sessionId,
        date: s.date,
        time: s.time,
        dur: `${s.duration || 45} min`,
        status: s.status,
        participant: "Anonymous Participant",
      })),
    })
  } catch (err) {
    console.error("[LISTENER] GET /sessions error:", err.message)
    res.status(500).json({ success: false, message: "Unable to load sessions." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/listener/sessions/:id/accept
//
// Protected — accepts a pending session request
// ─────────────────────────────────────────────────────────────────────────────
router.post("/sessions/:id/accept", requireListener, async (req, res) => {
  try {
    const ListenerSession = require("../models/ListenerSession")
    const ListenerNotification = require("../models/ListenerNotification")
    const mongoose = require("mongoose")
    const { id } = req.params
    const query = { listenerId: req.user._id }
    if (mongoose.isValidObjectId(id)) {
      query.$or = [{ _id: id }, { sessionId: String(id).toUpperCase() }]
    } else {
      query.sessionId = String(id).toUpperCase()
    }

    const session = await ListenerSession.findOne(query)

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found." })
    }

    if (session.status !== "Requested" && session.status !== "Booked") {
      return res.status(400).json({ success: false, message: `Session cannot be accepted from status: ${session.status}` })
    }

    session.status = "Confirmed"
    await session.save()

    // Create Notification
    await ListenerNotification.create({
      listenerId: req.user._id,
      type: "session_accepted",
      title: "Session Accepted",
      message: `You accepted session ${session.sessionId} scheduled for ${session.date} at ${session.time}.`,
      data: { sessionId: session.sessionId },
    })

    // Activity Log
    await logActivity({
      req,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: "LISTENER",
      },
      action: "Session Accepted",
      status: "Success",
      entityType: "ListenerSession",
      entityId: session._id,
      details: `Listener accepted session ${session.sessionId}`,
    })

    return res.status(200).json({
      success: true,
      message: "Session accepted.",
      session: {
        id: session._id.toString(),
        sessionId: session.sessionId,
        status: session.status,
      },
    })
  } catch (err) {
    console.error("[LISTENER] Accept session error:", err.message)
    res.status(500).json({ success: false, message: "Error accepting session." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/listener/sessions/:id/decline
//
// Protected — declines a pending session request
// ─────────────────────────────────────────────────────────────────────────────
router.post("/sessions/:id/decline", requireListener, async (req, res) => {
  try {
    const ListenerSession = require("../models/ListenerSession")
    const { id } = req.params

    const mongoose = require("mongoose")
    const query = { listenerId: req.user._id }
    if (mongoose.isValidObjectId(id)) {
      query.$or = [{ _id: id }, { sessionId: String(id).toUpperCase() }]
    } else {
      query.sessionId = String(id).toUpperCase()
    }

    const session = await ListenerSession.findOne(query)

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found." })
    }

    session.status = "Declined"
    await session.save()

    // Restore slot to Available in ListenerAvailability if it was booked
    const ListenerAvailability = require("../models/ListenerAvailability")
    const { todayStr, tomorrowStr } = getKolkataDates()
    const targetDate = session.date === "Tomorrow" ? tomorrowStr : session.date === "Today" ? todayStr : session.date
    await ListenerAvailability.updateOne(
      {
        listenerId: session.listenerId,
        $or: [
          { time: session.time, date: targetDate },
          { time: session.time, day: session.date.toLowerCase() },
        ],
      },
      { $set: { status: "Available" } }
    ).catch(() => {})

    // Activity Log
    await logActivity({
      req,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: "LISTENER",
      },
      action: "Session Declined",
      status: "Success",
      entityType: "ListenerSession",
      entityId: session._id,
      details: `Listener declined session ${session.sessionId}`,
    })

    return res.status(200).json({
      success: true,
      message: "Session declined.",
    })
  } catch (err) {
    console.error("[LISTENER] Decline session error:", err.message)
    res.status(500).json({ success: false, message: "Error declining session." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/listener/sessions/:id
//
// Protected — retrieves single session details for active entry (accessible to assigned listener or client employee)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/sessions/:id", requireAuth, async (req, res) => {
  try {
    const ListenerSession = require("../models/ListenerSession")
    const id = req.params.id || req.params.sessionId
    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({ success: false, message: "Session ID is required." })
    }

    const mongoose = require("mongoose")
    const isListener = req.user.role === "LISTENER" || (req.user.role && req.user.role.toLowerCase() === "listener")
    const userFilter = isListener ? { listenerId: req.user._id } : { employeeId: req.user._id }

    // Check if session exists at all first
    let rawSession
    if (mongoose.isValidObjectId(id)) {
      rawSession = await ListenerSession.findOne({
        $or: [{ _id: id }, { sessionId: String(id).toUpperCase() }]
      })
    } else {
      rawSession = await ListenerSession.findOne({
        sessionId: String(id).toUpperCase()
      })
    }

    if (!rawSession) {
      return res.status(404).json({ success: false, message: "Session not found." })
    }

    // Check authorization: must belong to the user as listener or employee
    const isOwner = isListener
      ? String(rawSession.listenerId) === String(req.user._id)
      : String(rawSession.employeeId) === String(req.user._id)

    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Access forbidden: You are not a participant in this session." })
    }

    let session = rawSession
    if (mongoose.isValidObjectId(id)) {
      session = await ListenerSession.findById(rawSession._id).populate("listenerId", "name")
    } else {
      session = await ListenerSession.findById(rawSession._id).populate("listenerId", "name")
    }

    const listenerName = session.listenerName || session.listenerId?.name || "Peer Support Listener"

    const effectiveClientId = session.clientId || ("CLT" + session._id.toString().slice(-6).toUpperCase())

    return res.status(200).json({
      success: true,
      session: {
        id: session._id.toString(),
        sessionId: session.sessionId,
        clientId: effectiveClientId,
        date: session.date,
        time: session.time,
        duration: session.durationMinutes || session.duration || 10,
        durationMinutes: session.durationMinutes || session.duration || 10,
        status: session.status,
        startedAt: session.startedAt,
        participant: isListener ? `Client ${effectiveClientId}` : "You",
        listenerName: listenerName,
        isListener: Boolean(isListener),
      },
    })
  } catch (err) {
    console.error("[LISTENER] GET /sessions/:id error:", err.message)
    res.status(500).json({ success: false, message: "Server error fetching session." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/listener/sessions/:id/start
//
// Protected — transitions session to In Progress
// ─────────────────────────────────────────────────────────────────────────────
router.post("/sessions/:id/start", requireListener, async (req, res) => {
  try {
    const ListenerSession = require("../models/ListenerSession")
    const id = req.params.id || req.params.sessionId

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({ success: false, message: "Session ID is required." })
    }

    const mongoose = require("mongoose")
    let rawSession
    if (mongoose.isValidObjectId(id)) {
      rawSession = await ListenerSession.findOne({
        $or: [{ _id: id }, { sessionId: String(id).toUpperCase() }]
      })
    } else {
      rawSession = await ListenerSession.findOne({
        sessionId: String(id).toUpperCase()
      })
    }

    if (!rawSession) {
      return res.status(404).json({ success: false, message: "Session not found." })
    }

    if (String(rawSession.listenerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access forbidden." })
    }

    const session = rawSession

    if (session.status === "Completed") {
      return res.status(400).json({ success: false, message: "Session is already completed." })
    }

    if (!session.startedAt) {
      session.startedAt = new Date()
    }
    session.started = true
    session.status = "In Progress"
    await session.save()

    // Update listener status to Busy
    const listener = await Listener.findById(req.user._id)
    if (listener) {
      listener.availabilityStatus = "Busy"
      await listener.save()
    }

    return res.status(200).json({
      success: true,
      message: "Session started.",
      session: {
        id: session._id.toString(),
        sessionId: session.sessionId,
        status: session.status,
        startedAt: session.startedAt,
      },
    })
  } catch (err) {
    console.error("[LISTENER] Start session error:", err.message)
    res.status(500).json({ success: false, message: "Error starting session." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/listener/sessions/:id/complete
//
// Protected — marks session Completed, calculates duration, updates stats & activity
// ─────────────────────────────────────────────────────────────────────────────
router.post("/sessions/:id/complete", requireListener, async (req, res) => {
  try {
    const ListenerSession = require("../models/ListenerSession")
    const Intervention = require("../models/Intervention")
    const InterventionSession = require("../models/InterventionSession")
    const id = req.params.id || req.params.sessionId

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({ success: false, message: "Session ID is required." })
    }

    const mongoose = require("mongoose")
    let rawSession
    if (mongoose.isValidObjectId(id)) {
      rawSession = await ListenerSession.findOne({
        $or: [{ _id: id }, { sessionId: String(id).toUpperCase() }]
      })
    } else {
      rawSession = await ListenerSession.findOne({
        sessionId: String(id).toUpperCase()
      })
    }

    if (!rawSession) {
      return res.status(404).json({ success: false, message: "Session not found." })
    }

    if (String(rawSession.listenerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access forbidden." })
    }

    const session = rawSession

    const now = new Date()
    const started = session.startedAt || new Date(now.getTime() - (session.duration || 45) * 60 * 1000)
    const elapsedMinutes = Math.max(1, Math.round((now.getTime() - started.getTime()) / (60 * 1000)))

    session.status = "Completed"
    session.completed = true
    session.completedAt = now
    session.actualDurationMinutes = elapsedMinutes
    await session.save()

    // Revert listener status back to Available
    const listener = await Listener.findById(req.user._id)
    if (listener) {
      listener.availabilityStatus = "Available"
      await listener.save()
    }

    // Register to aggregate InterventionSession for HR reporting without exposing individual data
    if (session.organisationId) {
      try {
        let intervention = await Intervention.findOne({
          organisationId: session.organisationId,
          type: "HUMAN_LISTENER",
        })
        if (!intervention) {
          intervention = await Intervention.create({
            organisationId: session.organisationId,
            name: "Human Listener",
            type: "HUMAN_LISTENER",
            category: "Listener",
            description: "Anonymous, confidential 1-on-1 support session with a trained listener.",
          })
        }

        await InterventionSession.create({
          interventionId: intervention._id,
          interventionName: "Human Listener",
          type: "HUMAN_LISTENER",
          category: "Listener",
          employeeId: session.employeeId,
          organisationId: session.organisationId,
          startedAt: started,
          completedAt: now,
          status: "Completed",
          duration: elapsedMinutes * 60,
          metadata: { sessionId: session.sessionId },
        })
      } catch (logErr) {
        console.warn("[LISTENER COMPLETE] Could not mirror to InterventionSession:", logErr.message)
      }
    }

    // Activity Log
    await logActivity({
      req,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: "LISTENER",
      },
      action: "Session Completed",
      status: "Success",
      entityType: "ListenerSession",
      entityId: session._id,
      details: `Listener completed session ${session.sessionId} (${elapsedMinutes} mins)`,
    })

    return res.status(200).json({
      success: true,
      message: "Session completed successfully.",
      durationMinutes: elapsedMinutes,
    })
  } catch (err) {
    console.error("[LISTENER] Complete session error:", err.message)
    res.status(500).json({ success: false, message: "Error completing session." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/listener/sessions/:id/messages
//
// Protected — fetches chat messages for a session
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/listener/sessions/:id/messages
//
// Protected — retrieves chat messages for a session (accessible to assigned listener or client employee)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/sessions/:id/messages", requireAuth, async (req, res) => {
  try {
    const ListenerSession = require("../models/ListenerSession")
    const ListenerMessage = require("../models/ListenerMessage")
    const id = req.params.id || req.params.sessionId

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({ success: false, message: "Session ID is required." })
    }

    const mongoose = require("mongoose")
    const isListener = req.user.role === "LISTENER" || (req.user.role && req.user.role.toLowerCase() === "listener")

    // Check if session exists
    let rawSession
    if (mongoose.isValidObjectId(id)) {
      rawSession = await ListenerSession.findOne({
        $or: [{ _id: id }, { sessionId: String(id).toUpperCase() }]
      })
    } else {
      rawSession = await ListenerSession.findOne({
        sessionId: String(id).toUpperCase()
      })
    }

    if (!rawSession) {
      return res.status(404).json({ success: false, message: "Session not found." })
    }

    const isOwner = isListener
      ? String(rawSession.listenerId) === String(req.user._id)
      : String(rawSession.employeeId) === String(req.user._id)

    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Access forbidden." })
    }

    const session = rawSession

    const effectiveClientId = session.clientId || ("CLT" + session._id.toString().slice(-6).toUpperCase())
    const messages = await ListenerMessage.find({ sessionId: session._id }).sort({ createdAt: 1 })

    return res.status(200).json({
      success: true,
      messages: messages.map((m) => {
        const isMsgListener = m.senderRole === "LISTENER"
        let displayName = isMsgListener ? (session.listenerName || "Peer Listener") : `Client ${effectiveClientId}`
        if (isListener && isMsgListener) {
          displayName = "You"
        } else if (!isListener && !isMsgListener) {
          displayName = "You"
        }
        return {
          id: m._id.toString(),
          senderRole: m.senderRole,
          senderName: displayName,
          text: m.text,
          read: m.read,
          createdAt: m.createdAt,
        }
      }),
    })
  } catch (err) {
    console.error("[LISTENER] GET messages error:", err.message)
    res.status(500).json({ success: false, message: "Error retrieving messages." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/listener/sessions/:id/messages
//
// Protected — sends chat message in a session (from either listener or employee)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/sessions/:id/messages", requireAuth, async (req, res) => {
  try {
    const ListenerSession = require("../models/ListenerSession")
    const ListenerMessage = require("../models/ListenerMessage")
    const id = req.params.id || req.params.sessionId
    const { text } = req.body

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({ success: false, message: "Session ID is required." })
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Message text is required." })
    }

    const mongoose = require("mongoose")
    const isListener = req.user.role === "LISTENER" || (req.user.role && req.user.role.toLowerCase() === "listener")

    // Check if session exists
    let rawSession
    if (mongoose.isValidObjectId(id)) {
      rawSession = await ListenerSession.findOne({
        $or: [{ _id: id }, { sessionId: String(id).toUpperCase() }]
      })
    } else {
      rawSession = await ListenerSession.findOne({
        sessionId: String(id).toUpperCase()
      })
    }

    if (!rawSession) {
      return res.status(404).json({ success: false, message: "Session not found." })
    }

    const isOwner = isListener
      ? String(rawSession.listenerId) === String(req.user._id)
      : String(rawSession.employeeId) === String(req.user._id)

    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Access forbidden." })
    }

    const session = rawSession

    const senderRole = isListener ? "LISTENER" : "EMPLOYEE"
    const senderName = isListener ? (req.user.name || session.listenerName) : `Client ${session.clientId}`

    const message = await ListenerMessage.create({
      sessionId: session._id,
      senderRole,
      senderId: req.user._id,
      senderName,
      text: text.trim(),
      read: true,
    })

    return res.status(201).json({
      success: true,
      message: {
        id: message._id.toString(),
        senderRole: message.senderRole,
        senderName: "You",
        text: message.text,
        createdAt: message.createdAt,
      },
    })
  } catch (err) {
    console.error("[LISTENER] POST message error:", err.message)
    res.status(500).json({ success: false, message: "Error sending message." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/listener/messages
//
// Protected — fetches list of conversations / recent message threads
// ─────────────────────────────────────────────────────────────────────────────
router.get("/messages", requireListener, async (req, res) => {
  try {
    const ListenerSession = require("../models/ListenerSession")
    const ListenerMessage = require("../models/ListenerMessage")
    const listenerId = req.user._id

    // Get active and scheduled sessions
    const sessions = await ListenerSession.find({
      listenerId,
      status: { $in: ["In Progress", "Scheduled", "Completed"] },
    }).sort({ updatedAt: -1 })

    const threads = []
    for (const s of sessions) {
      const lastMsg = await ListenerMessage.findOne({ sessionId: s._id }).sort({ createdAt: -1 })
      threads.push({
        sessionId: s._id.toString(),
        sessionCode: s.sessionId,
        participant: "Anonymous Participant",
        date: s.date,
        time: s.time,
        status: s.status,
        lastMessage: lastMsg ? lastMsg.text : "No messages yet",
        lastMessageAt: lastMsg ? lastMsg.createdAt : s.createdAt,
      })
    }

    return res.status(200).json({
      success: true,
      threads,
    })
  } catch (err) {
    console.error("[LISTENER] GET /messages error:", err.message)
    res.status(500).json({ success: false, message: "Error retrieving message threads." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/listener/notifications
//
// Protected — retrieves notifications and unread count
// ─────────────────────────────────────────────────────────────────────────────
router.get("/notifications", requireListener, async (req, res) => {
  try {
    const ListenerNotification = require("../models/ListenerNotification")
    const listenerId = req.user._id

    const notifications = await ListenerNotification.find({ listenerId }).sort({ createdAt: -1 }).limit(30)
    const unreadCount = await ListenerNotification.countDocuments({ listenerId, read: false })

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
      })),
    })
  } catch (err) {
    console.error("[LISTENER] GET /notifications error:", err.message)
    res.status(500).json({ success: false, message: "Error retrieving notifications." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/listener/notifications/mark-read
//
// Protected — marks all notifications as read
// ─────────────────────────────────────────────────────────────────────────────
router.post("/notifications/mark-read", requireListener, async (req, res) => {
  try {
    const ListenerNotification = require("../models/ListenerNotification")
    const listenerId = req.user._id

    await ListenerNotification.updateMany({ listenerId, read: false }, { read: true })

    return res.status(200).json({
      success: true,
      message: "Notifications marked as read.",
    })
  } catch (err) {
    console.error("[LISTENER] Mark read error:", err.message)
    res.status(500).json({ success: false, message: "Error marking notifications read." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/listener/available
// (And alias for GET /api/listeners/available)
// Public or Employee-authenticated — returns active, enabled, available listeners
// ─────────────────────────────────────────────────────────────────────────────
router.get("/available", async (req, res) => {
  try {
    const listeners = await Listener.find({
      status: "Active",
    }).sort({ createdAt: -1 })

    const formatted = listeners.map((l) => ({
      id: l._id.toString(),
      listenerId: l.listenerId,
      name: l.name,
      avatar: (l.name ? l.name[0] : "L").toUpperCase(),
      initials: (l.name ? l.name.slice(0, 2) : "LS").toUpperCase(),
      role: "Peer support listener",
      title: '"CortiQuant Listener"',
      desc: l.bio || "Registered peer support listener for the corporate workspace.",
      status: l.availabilityStatus === "Available" ? "Available now" : "Currently unavailable",
      statusNow: l.availabilityStatus === "Available",
      availabilityStatus: l.availabilityStatus || "Available",
      sessionDuration: 10,
      tags: ["Anonymous", "Peer support", "10 min", "Text chat"],
    }))

    return res.status(200).json({
      success: true,
      listeners: formatted,
    })
  } catch (err) {
    console.error("[LISTENER] Error fetching available listeners:", err.message)
    return res.status(500).json({ success: false, message: "Error fetching available listeners." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/listener/:id/slots
//
// Calculates real available 10-minute slots for "today" or "tomorrow"
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id/slots", async (req, res) => {
  try {
    const { id } = req.params
    const day = (req.query.day || "today").toLowerCase() // "today" | "tomorrow"
    const ListenerAvailability = require("../models/ListenerAvailability")
    const ListenerSession = require("../models/ListenerSession")
    const mongoose = require("mongoose")

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid listener ID." })
    }

    const listener = await Listener.findById(id)
    if (!listener || listener.status !== "Active") {
      return res.status(404).json({ success: false, message: "Listener not found or unavailable." })
    }

    const { todayStr, tomorrowStr } = getKolkataDates()
    const targetDateStr = day === "tomorrow" ? tomorrowStr : todayStr
    const targetDayNormalized = day === "tomorrow" ? "Tomorrow" : "Today"

    // 1. Fetch listener's configured availability slots for target day with status "Available"
    const availabilityDocs = await ListenerAvailability.find({
      listenerId: listener._id,
      $or: [
        { day: day },
        { date: targetDateStr },
      ],
      status: "Available",
    }).sort({ time: 1 })

    // 2. Fetch active sessions booked for this listener on this day
    const bookedSessions = await ListenerSession.find({
      listenerId: listener._id,
      $or: [
        { date: targetDayNormalized },
        { date: targetDateStr },
      ],
      status: { $in: ["Booked", "Confirmed", "Requested", "Scheduled", "In Progress"] },
    })

    const bookedTimes = new Set(bookedSessions.map((s) => s.time.trim()))

    // 3. Single source of truth: only return the listener's exact saved slots
    // No hardcoded fallback slots!
    const baseTimeStrings = availabilityDocs.map((s) => s.time.trim())

    // Filter out already booked slots
    let availableTimes = baseTimeStrings.filter((t) => !bookedTimes.has(t))

    // Real-time slot validation: If booking for today, filter out past slots in Asia/Kolkata
    const kolkataNow = getKolkataNow()
    if (day === "today" || targetDateStr === kolkataNow.todayStr) {
      availableTimes = availableTimes.filter((t) => {
        const slotMin = parseTimeToMinutes(t)
        return slotMin !== null && slotMin > kolkataNow.currentMinutes
      })
    }

    // Helper to categorize into morning, afternoon, evening
    const morning = []
    const afternoon = []
    const evening = []

    availableTimes.forEach((t) => {
      const match = t.match(/^(\d{1,2}):(\d{2})/)
      if (match) {
        let hour = parseInt(match[1], 10)
        if (t.toLowerCase().includes("pm") && hour < 12) hour += 12
        if (t.toLowerCase().includes("am") && hour === 12) hour = 0

        if (hour < 12) morning.push(t)
        else if (hour < 17) afternoon.push(t)
        else evening.push(t)
      } else {
        evening.push(t)
      }
    })

    return res.status(200).json({
      success: true,
      day,
      date: targetDateStr,
      listener: {
        id: listener._id.toString(),
        name: listener.name,
        availabilityStatus: listener.availabilityStatus,
      },
      slots: {
        morning,
        afternoon,
        evening,
        all: availableTimes,
      },
    })
  } catch (err) {
    console.error("[LISTENER] Error generating slots:", err.message)
    return res.status(500).json({ success: false, message: "Error calculating time slots." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/listener/book
//
// Protected — employee books a 10-minute session with collision detection (409)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/book", requireAuth, async (req, res) => {
  try {
    const { listenerId, scheduledDate, startTime, durationMinutes = 10, day = "today" } = req.body
    const ListenerSession = require("../models/ListenerSession")
    const ListenerAvailability = require("../models/ListenerAvailability")
    const ListenerNotification = require("../models/ListenerNotification")
    const User = require("../models/User")
    const mongoose = require("mongoose")

    if (!listenerId || !startTime) {
      return res.status(400).json({ success: false, message: "Listener ID and start time are required." })
    }

    if (!mongoose.isValidObjectId(listenerId)) {
      return res.status(400).json({ success: false, message: "Invalid listener ID." })
    }

    // 1. Authenticate & obtain Employee
    const employee = await User.findById(req.user._id)
    if (!employee) {
      return res.status(401).json({ success: false, message: "User not found." })
    }

    // 2. Generate or fetch persistent anonymous Client ID
    const clientId = await employee.getOrCreateClientId()

    // 3. Verify Listener exists & is Active & bookable
    const listener = await Listener.findById(listenerId)
    if (!listener) {
      return res.status(404).json({ success: false, message: "Listener not found." })
    }

    if (listener.status !== "Active") {
      return res.status(400).json({ success: false, message: "This listener is currently unavailable." })
    }

    if (listener.availabilityStatus === "Unavailable" || listener.availabilityStatus === "Offline") {
      return res.status(400).json({ success: false, message: "This listener is currently unavailable." })
    }

    const kolkataNow = getKolkataNow()
    const targetDayNormalized = day.toLowerCase() === "tomorrow" ? "Tomorrow" : "Today"
    const targetDayKey = day.toLowerCase() === "tomorrow" ? "tomorrow" : "today"
    const targetDateStr = targetDayNormalized === "Tomorrow" ? kolkataNow.tomorrowStr : kolkataNow.todayStr

    // 4. Validate that slot time has not passed in Asia/Kolkata timezone
    const slotMinutes = parseTimeToMinutes(startTime)
    if (slotMinutes === null) {
      return res.status(400).json({ success: false, message: "Invalid slot time format." })
    }

    if (targetDayNormalized === "Today" || targetDateStr === kolkataNow.todayStr) {
      if (slotMinutes <= kolkataNow.currentMinutes) {
        return res.status(400).json({
          success: false,
          message: "This time slot has already passed",
        })
      }
    }

    // 5. Verify that the slot exists and is Available in ListenerAvailability
    const slotDoc = await ListenerAvailability.findOne({
      listenerId: listener._id,
      $or: [
        { day: targetDayKey, time: startTime.trim() },
        { date: targetDateStr, time: startTime.trim() },
      ],
    })

    if (slotDoc && slotDoc.status !== "Available") {
      return res.status(409).json({
        success: false,
        message: "This time slot was just booked. Please choose another slot.",
      })
    }

    // 5. Atomic Double-Booking Collision Check in ListenerSession
    const existingConflict = await ListenerSession.findOne({
      listenerId: listener._id,
      $or: [
        { date: targetDayNormalized, time: startTime.trim() },
        { date: targetDateStr, time: startTime.trim() },
      ],
      status: { $in: ["Booked", "Confirmed", "Requested", "Scheduled", "In Progress"] },
    })

    if (existingConflict) {
      return res.status(409).json({
        success: false,
        message: "This time slot was just booked. Please choose another slot.",
      })
    }

    // 6. Mark slot as Booked in ListenerAvailability
    if (slotDoc) {
      slotDoc.status = "Booked"
      await slotDoc.save()
    } else {
      // If no explicit document existed, create one with Booked status to record it
      await ListenerAvailability.create({
        listenerId: listener._id,
        day: targetDayKey,
        date: targetDateStr,
        time: startTime.trim(),
        status: "Booked",
      }).catch(() => {})
    }

    // 7. Calculate end time (10 min duration)
    let calculatedEndTime = ""
    const timeMatch = startTime.match(/^(\d{1,2}):(\d{2})/)
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10)
      let m = parseInt(timeMatch[2], 10) + durationMinutes
      if (m >= 60) {
        h = (h + Math.floor(m / 60)) % 24
        m = m % 60
      }
      calculatedEndTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    }

    // 8. Generate unique Session ID (e.g. SES482731)
    const randomNum = Math.floor(100000 + Math.random() * 900000)
    const sessionId = `SES${randomNum}`

    // 9. Create ListenerSession document with status BOOKED
    const newSession = await ListenerSession.create({
      sessionId,
      clientId,
      employeeId: employee._id,
      employeeName: "Anonymous Participant",
      listenerId: listener._id,
      listenerName: listener.name,
      organisationId: employee.organisationId,
      date: targetDayNormalized,
      time: startTime.trim(),
      startTime: startTime.trim(),
      endTime: calculatedEndTime,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(targetDateStr),
      duration: durationMinutes,
      durationMinutes,
      sessionType: "Peer Support",
      mode: "Text Chat",
      status: "BOOKED",
      bookingEmailSent: false,
      reminderSent: false,
      scheduledAt: new Date(),
      metadata: {
        bookedByEmployee: true,
        clientAnonymousId: clientId,
      },
    })

    // 10. Send Immediate Booking Confirmation Email to Listener
    if (listener && listener.email) {
      sendBookingConfirmationEmail({
        listenerEmail: listener.email,
        listenerName: listener.name,
        date: targetDayNormalized,
        time: startTime.trim(),
        duration: durationMinutes,
        sessionId,
      }).then(async (res) => {
        if (res && res.success) {
          newSession.bookingEmailSent = true
          await newSession.save().catch(() => {})
        }
      }).catch((err) => {
        console.error("[BOOKING EMAIL] Error sending confirmation to listener:", err.message)
      })
    }

    // 11. Trigger real-time Notification for the Listener
    await ListenerNotification.create({
      listenerId: listener._id,
      type: "session_request",
      title: "New Session Booking",
      message: `Participant (${clientId}) booked a 10-min session for ${targetDayNormalized} at ${startTime.trim()}.`,
      data: { sessionId, listenerSessionId: newSession._id.toString(), clientId },
    })

    // 12. Activity Log (Audit)
    await logActivity({
      req,
      user: {
        _id: employee._id,
        name: "Anonymous Employee",
        email: "anonymous@peer.cortiquant",
        role: "employee",
      },
      action: "Session Booked",
      status: "Success",
      entityType: "ListenerSession",
      entityId: newSession._id,
      details: `Session ${sessionId} booked with listener ${listener.name} for ${targetDayNormalized} at ${startTime}`,
    })

    return res.status(201).json({
      success: true,
      session: {
        sessionId: newSession.sessionId,
        clientId: newSession.clientId,
        listenerName: listener.name,
        date: newSession.date,
        startTime: newSession.startTime,
        endTime: newSession.endTime,
        durationMinutes: newSession.durationMinutes,
        sessionType: newSession.sessionType,
        mode: newSession.mode,
        status: newSession.status,
      },
    })
  } catch (err) {
    console.error("[LISTENER] Booking error:", err.message)
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "This time slot was just booked. Please choose another slot." })
    }
    return res.status(500).json({ success: false, message: "Server error booking session." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/listener/my-sessions
//
// Protected — returns current authenticated employee's bookings
// ─────────────────────────────────────────────────────────────────────────────
router.get("/my-sessions", requireAuth, async (req, res) => {
  try {
    const ListenerSession = require("../models/ListenerSession")
    const employeeId = req.user._id

    const sessions = await ListenerSession.find({ employeeId })
      .populate("listenerId", "name listenerId availabilityStatus")
      .sort({ createdAt: -1 })

    const upcoming = []
    const completed = []
    const cancelled = []

    const { getSessionStartTimestamp, getSessionEndTimestamp, expirePassedSessions } = require("../services/sessionNotificationService")

    // Automatic expiry check before returning employee sessions
    await expirePassedSessions()

    const nowMs = Date.now()

    sessions.forEach((s) => {
      const listenerObj = s.listenerId || {}
      const startTimestamp = getSessionStartTimestamp(s)
      const dur = s.durationMinutes || s.duration || 10
      const endTimestamp = getSessionEndTimestamp(s) || (startTimestamp ? startTimestamp + dur * 60 * 1000 : null)

      const isEnded = endTimestamp && nowMs > endTimestamp

      const item = {
        id: s._id.toString(),
        sessionId: s.sessionId,
        clientId: s.clientId,
        listenerName: s.listenerName || listenerObj.name || "Peer Listener",
        date: s.date,
        time: s.time,
        startTime: s.startTime || s.time,
        endTime: s.endTime,
        durationMinutes: dur,
        sessionType: s.sessionType || "Peer Support",
        mode: s.mode || "Text Chat",
        status: isEnded ? "COMPLETED" : s.status,
        canEnter: !isEnded && ["BOOKED", "ACTIVE", "Booked", "Confirmed", "Scheduled", "In Progress"].includes(s.status),
        startTimestamp,
        endTimestamp,
        createdAt: s.createdAt,
      }

      if (!isEnded && ["BOOKED", "ACTIVE", "Booked", "Confirmed", "Requested", "Scheduled", "In Progress"].includes(s.status)) {
        upcoming.push(item)
      } else if (isEnded || ["COMPLETED", "Completed"].includes(s.status)) {
        completed.push(item)
      } else {
        cancelled.push(item)
      }
    })

    return res.status(200).json({
      success: true,
      sessions: {
        upcoming,
        completed,
        cancelled,
      },
    })
  } catch (err) {
    console.error("[LISTENER] Error fetching employee sessions:", err.message)
    return res.status(500).json({ success: false, message: "Error loading your sessions." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/listener/sessions/:sessionId/cancel-booking
//
// Employee-protected — cancels employee's upcoming session
// ─────────────────────────────────────────────────────────────────────────────
router.post("/sessions/:sessionId/cancel-booking", requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params
    const ListenerSession = require("../models/ListenerSession")
    const ListenerNotification = require("../models/ListenerNotification")
    const mongoose = require("mongoose")

    const query = { employeeId: req.user._id }
    if (mongoose.isValidObjectId(sessionId)) {
      query.$or = [{ _id: sessionId }, { sessionId: String(sessionId).toUpperCase() }]
    } else {
      query.sessionId = String(sessionId).toUpperCase()
    }

    const session = await ListenerSession.findOne(query)
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found." })
    }

    if (session.status === "Completed") {
      return res.status(400).json({ success: false, message: "Completed sessions cannot be cancelled." })
    }

    session.status = "Cancelled"
    await session.save()

    // Restore slot to Available in ListenerAvailability if it was booked
    const ListenerAvailability = require("../models/ListenerAvailability")
    const { todayStr, tomorrowStr } = getKolkataDates()
    const targetDate = session.date === "Tomorrow" ? tomorrowStr : session.date === "Today" ? todayStr : session.date
    await ListenerAvailability.updateOne(
      {
        listenerId: session.listenerId,
        $or: [
          { time: session.time, date: targetDate },
          { time: session.time, day: session.date.toLowerCase() },
        ],
      },
      { $set: { status: "Available" } }
    ).catch(() => {})

    await ListenerNotification.create({
      listenerId: session.listenerId,
      type: "session_cancelled",
      title: "Session Cancelled",
      message: `Participant cancelled session ${session.sessionId} for ${session.date} at ${session.time}.`,
      data: { sessionId: session.sessionId },
    })

    return res.status(200).json({
      success: true,
      message: "Session cancelled.",
      session: {
        sessionId: session.sessionId,
        status: session.status,
      },
    })
  } catch (err) {
    console.error("[LISTENER] Cancel error:", err.message)
    return res.status(500).json({ success: false, message: "Error cancelling session." })
  }
})

// Aliases for /api/listener-sessions mounts:
router.get("/my", requireAuth, (req, res, next) => {
  req.url = "/my-sessions"
  router.handle(req, res, next)
})
router.get("/sessions/my", requireAuth, (req, res, next) => {
  req.url = "/my-sessions"
  router.handle(req, res, next)
})
router.post("/:id/accept", requireListener, (req, res, next) => {
  req.url = `/sessions/${req.params.id}/accept`
  router.handle(req, res, next)
})
router.post("/:id/decline", requireListener, (req, res, next) => {
  req.url = `/sessions/${req.params.id}/decline`
  router.handle(req, res, next)
})
router.post("/:sessionId/cancel", requireAuth, (req, res, next) => {
  req.url = `/sessions/${req.params.sessionId}/cancel-booking`
  router.handle(req, res, next)
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/listener/sessions/upcoming or /api/sessions/upcoming
//
// Protected — fetches earliest active upcoming session for logged-in user
// ─────────────────────────────────────────────────────────────────────────────
router.get("/sessions/upcoming", requireAuth, async (req, res) => {
  try {
    const ListenerSession = require("../models/ListenerSession")
    const { getSessionStartTimestamp, getSessionEndTimestamp, expirePassedSessions } = require("../services/sessionNotificationService")

    // Automatic expiry check on fetch: expire any passed sessions to COMPLETED
    await expirePassedSessions()

    const isListener = req.user.role === "LISTENER" || (req.user.role && req.user.role.toLowerCase() === "listener")
    const query = {
      status: { $in: ["BOOKED", "ACTIVE", "Booked", "Confirmed", "Scheduled", "Active", "In Progress"] },
    }

    if (isListener) {
      query.listenerId = req.user._id
    } else {
      query.employeeId = req.user._id
    }

    const sessions = await ListenerSession.find(query).populate("listenerId", "name email")
    if (!sessions || sessions.length === 0) {
      return res.status(200).json({
        success: true,
        session: null,
      })
    }

    const nowMs = Date.now()

    // Map and calculate exact start and end timestamps
    const mapped = sessions
      .map((s) => {
        const startTimestamp = getSessionStartTimestamp(s)
        const dur = s.durationMinutes || s.duration || 10
        const endTimestamp = getSessionEndTimestamp(s) || (startTimestamp ? startTimestamp + dur * 60 * 1000 : null)
        return {
          doc: s,
          startTimestamp,
          endTimestamp,
          dur,
        }
      })
      // Only return sessions where sessionEndTime > currentTime AND not completed/expired/cancelled
      .filter((item) => {
        if (!item.endTimestamp) return false
        return item.endTimestamp > nowMs
      })

    // Sort by earliest start time ascending
    mapped.sort((a, b) => {
      if (!a.startTimestamp) return 1
      if (!b.startTimestamp) return -1
      return a.startTimestamp - b.startTimestamp
    })

    if (mapped.length === 0) {
      return res.status(200).json({
        success: true,
        session: null,
      })
    }

    const earliest = mapped[0]
    const s = earliest.doc
    const effectiveClientId = s.clientId || ("CLT" + s._id.toString().slice(-6).toUpperCase())

    return res.status(200).json({
      success: true,
      session: {
        id: s._id.toString(),
        sessionId: s.sessionId,
        listener: s.listenerName || s.listenerId?.name || "Peer Listener",
        listenerName: s.listenerName || s.listenerId?.name || "Peer Listener",
        clientId: effectiveClientId,
        sessionType: s.sessionType || "Peer Support",
        date: s.date,
        time: s.time,
        duration: s.durationMinutes || s.duration || 10,
        durationMinutes: s.durationMinutes || s.duration || 10,
        status: s.status,
        startTime: s.startTime || s.time,
        endTime: s.endTime,
        startTimestamp: earliest.startTimestamp,
        endTimestamp: earliest.endTimestamp,
      },
    })
  } catch (err) {
    console.error("[UPCOMING SESSIONS] Error fetching upcoming session:", err.message)
    res.status(500).json({ success: false, message: "Error fetching upcoming session." })
  }
})

// Alias for /api/listener/upcoming
router.get("/upcoming", requireAuth, (req, res, next) => {
  req.url = "/sessions/upcoming"
  router.handle(req, res, next)
})

module.exports = router
