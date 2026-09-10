const ListenerSession = require("../models/ListenerSession")
const ListenerNotification = require("../models/ListenerNotification")
const Notification = require("../models/Notification")
const Listener = require("../models/Listener")
const { sendListenerSessionReminder } = require("./emailService")

/**
 * Parses time string like "10:40", "10:40 AM", "14:20" to minute of day (0-1439).
 */
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

/**
 * Returns current date and time info in Asia/Kolkata timezone.
 */
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

  return { todayStr, currentMinutes, currentTimeStr, raw: now }
}

/**
 * Calculates start epoch timestamp in ms for a session given date string and time string in Asia/Kolkata.
 */
function getSessionStartTimestamp(session) {
  if (!session) return null
  const timeZone = "Asia/Kolkata"
  const kolkataNow = getKolkataNow()
  const timeStr = session.startTime || session.time
  const slotMin = parseTimeToMinutes(timeStr)
  if (slotMin === null) return null

  let datePart = kolkataNow.todayStr
  const dLower = String(session.date || "").trim().toLowerCase()

  if (dLower === "tomorrow") {
    const tomorrow = new Date(kolkataNow.raw.getTime() + 24 * 60 * 60 * 1000)
    const tParts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(tomorrow)
    const tp = {}
    tParts.forEach((x) => (tp[x.type] = x.value))
    datePart = `${tp.year}-${tp.month}-${tp.day}`
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(session.date)) {
    datePart = session.date
  } else if (session.scheduledDate) {
    const sParts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(session.scheduledDate))
    const sp = {}
    sParts.forEach((x) => (sp[x.type] = x.value))
    datePart = `${sp.year}-${sp.month}-${sp.day}`
  }

  const [year, month, day] = datePart.split("-").map(Number)
  const hours = Math.floor(slotMin / 60)
  const minutes = slotMin % 60

  // Construct ISO string for Asia/Kolkata (+05:30)
  const pad = (n) => String(n).padStart(2, "0")
  const isoKolkata = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00+05:30`
  return new Date(isoKolkata).getTime()
}

/**
 * Checks for upcoming sessions starting within 5 minutes and dispatches reminders.
 */
async function checkUpcomingSessionReminders() {
  try {
    const nowMs = Date.now()
    const kolkataNow = getKolkataNow()

    // Query active sessions today where reminder has not been sent yet
    const sessions = await ListenerSession.find({
      status: { $in: ["BOOKED", "ACTIVE", "Booked", "Confirmed", "Scheduled", "In Progress"] },
      $or: [
        { reminderSent: { $ne: true } },
        { notificationSent: { $ne: true } },
      ],
      $and: [
        {
          $or: [
            { date: "Today" },
            { date: kolkataNow.todayStr },
            { scheduledDate: { $gte: new Date(kolkataNow.todayStr) } },
          ],
        },
      ],
    }).populate("listenerId", "name email")

    for (const session of sessions) {
      const startTimeMs = getSessionStartTimestamp(session)
      if (!startTimeMs) continue

      const diffMs = startTimeMs - nowMs
      const diffMinutes = diffMs / (60 * 1000)

      // When diff is <= 5 minutes (and not already expired beyond duration)
      const durationMinutes = session.durationMinutes || session.duration || 10
      const expiredMs = startTimeMs + durationMinutes * 60 * 1000

      if (diffMinutes <= 5 && nowMs < expiredMs) {
        console.log(`[SESSION NOTIFIER] Triggering 5-minute reminder for session ${session.sessionId} (starts in ${diffMinutes.toFixed(1)} mins)`)

        // 1. Dispatch Email to Listener
        const listener = session.listenerId
        if (listener && listener.email) {
          await sendListenerSessionReminder({
            listenerEmail: listener.email,
            listenerName: listener.name,
            startTime: session.startTime || session.time,
            duration: durationMinutes,
            sessionId: session.sessionId,
          }).catch((err) => console.error("[SESSION NOTIFIER] Email send error:", err.message))
        }

        // 2. Create Listener Notification in DB
        await ListenerNotification.create({
          listenerId: session.listenerId._id || session.listenerId,
          type: "session_reminder",
          title: "Session Starting in 5 Minutes",
          message: `Your peer support session (${session.sessionId}) starts in 5 minutes at ${session.startTime || session.time}.`,
          data: { sessionId: session.sessionId },
        }).catch(() => {})

        // 3. Create Employee In-App Notification in DB
        if (session.employeeId) {
          await Notification.create({
            userId: session.employeeId,
            type: "session_reminder",
            title: "Session Starting in 5 Minutes",
            message: "Your listening session with a peer starts in 5 minutes.",
            sessionId: session.sessionId,
          }).catch(() => {})
        }

        // 4. Mark reminderSent = true and notificationSent = true
        session.reminderSent = true
        session.notificationSent = true
        await session.save().catch((err) => console.error("[SESSION NOTIFIER] Save error:", err.message))
      }
    }
  } catch (err) {
    console.error("[SESSION NOTIFIER] Check failed:", err.message)
  }
}

/**
 * Calculates end epoch timestamp in ms for a session in Asia/Kolkata.
 */
function getSessionEndTimestamp(session) {
  const startTimestamp = getSessionStartTimestamp(session)
  if (!startTimestamp) return null
  const dur = session.durationMinutes || session.duration || 10
  return startTimestamp + dur * 60 * 1000
}

/**
 * Checks for sessions where currentTime > sessionEndTime and updates status to COMPLETED (or EXPIRED).
 * Also frees up listener availability status if applicable.
 */
async function expirePassedSessions() {
  try {
    const nowMs = Date.now()

    // Find all sessions currently in non-terminal states
    const activeCandidates = await ListenerSession.find({
      status: { $in: ["BOOKED", "ACTIVE", "Booked", "Confirmed", "Scheduled", "In Progress"] },
    })

    let expiredCount = 0
    for (const session of activeCandidates) {
      const endMs = getSessionEndTimestamp(session)
      if (endMs && nowMs > endMs) {
        if (session.started || session.status === "In Progress") {
          // If session was started, mark Completed
          session.status = "Completed"
          session.completed = true
          session.endedAt = new Date(endMs)
          if (!session.completedAt) {
            session.completedAt = new Date(endMs)
          }
        } else {
          // If session was never started by start/end time, mark Expired (no show / expired)
          session.status = "Expired"
          session.completed = false
          session.cancelledAt = new Date(endMs)
          session.cancelledBy = "system"
          session.cancelReason = "Expired session (No show / unattended)"
        }
        await session.save()
        expiredCount++
      }
    }

    if (expiredCount > 0) {
      console.log(`[SESSION LIFECYCLE] Expired and marked ${expiredCount} passed session(s) as COMPLETED`)
    }
    return expiredCount
  } catch (err) {
    console.error("[SESSION LIFECYCLE] Expire check failed:", err.message)
    return 0
  }
}

/**
 * Combined background runner executed every minute:
 * 1. Checks and expires passed sessions (now > sessionEndTime -> COMPLETED)
 * 2. Checks 5-minute pre-session reminders
 */
async function runSessionCron() {
  await expirePassedSessions()
  await checkUpcomingSessionReminders()
}

let notificationInterval = null

function startSessionNotificationService() {
  if (notificationInterval) return
  console.log("[SESSION NOTIFIER & LIFECYCLE] Started background service (running every 60s)...")
  // Run once immediately
  runSessionCron()
  // Run every 60 seconds
  notificationInterval = setInterval(runSessionCron, 60 * 1000)
}

module.exports = {
  getKolkataNow,
  parseTimeToMinutes,
  getSessionStartTimestamp,
  getSessionEndTimestamp,
  expirePassedSessions,
  checkUpcomingSessionReminders,
  startSessionNotificationService,
}

