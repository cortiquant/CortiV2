import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

export interface UpcomingSessionData {
  id: string
  sessionId: string
  listener?: string
  listenerName?: string
  participant?: string
  clientId?: string
  sessionType?: string
  date: string
  time: string
  duration: number | string
  durationMinutes?: number | string
  status: string
  startTime?: string
  endTime?: string
  startTimestamp?: number | null
  endTimestamp?: number | null
}

interface UpcomingSessionCardProps {
  session?: UpcomingSessionData | null
  role: "employee" | "listener"
  onRefresh?: () => void
}

export default function UpcomingSessionCard({
  session: initialSession,
  role,
  onRefresh,
}: UpcomingSessionCardProps) {
  const navigate = useNavigate()
  const [session, setSession] = useState<UpcomingSessionData | null>(initialSession || null)
  const [loading, setLoading] = useState(!initialSession)
  const [now, setNow] = useState<number>(Date.now())
  const [alertMessage, setAlertMessage] = useState<string | null>(null)

  // Fetch upcoming session if not provided directly
  const fetchUpcoming = async () => {
    try {
      const token = localStorage.getItem("cq_token")
      if (!token) return
      const res = await fetch("/api/sessions/upcoming", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSession(data.session || null)
      }
    } catch (err) {
      console.warn("[UPCOMING-CARD] Failed to fetch session:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialSession !== undefined) {
      setSession(initialSession)
      setLoading(false)
    } else {
      fetchUpcoming()
      const fetchInterval = setInterval(fetchUpcoming, 15000)
      return () => clearInterval(fetchInterval)
    }
  }, [initialSession])

  // Live timer tick every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-dismiss alert message after 4 seconds
  useEffect(() => {
    if (alertMessage) {
      const timeout = setTimeout(() => setAlertMessage(null), 4000)
      return () => clearTimeout(timeout)
    }
  }, [alertMessage])

  if (loading) {
    return (
      <div className="card-base p-5 animate-pulse rounded-3xl">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
        <div className="h-6 bg-white/10 rounded w-2/3 mb-4" />
        <div className="h-10 bg-white/10 rounded w-full" />
      </div>
    )
  }

  // If no session or session is already past its end time, remove card / empty state
  if (!session) {
    if (role === "listener") {
      return (
        <div className="card-base p-6 text-center">
          <p className="text-sm text-text-secondary font-medium mb-1">No upcoming sessions</p>
          <p className="text-xs text-text-muted">When an employee books a session, it will appear here.</p>
        </div>
      )
    }
    return null
  }

  // Calculate timestamps
  const startMs = session.startTimestamp ? Number(session.startTimestamp) : null
  const durMins = Number(session.durationMinutes || session.duration || 10)
  const endMs = session.endTimestamp ? Number(session.endTimestamp) : (startMs ? startMs + durMins * 60 * 1000 : null)

  const isBeforeStart = startMs !== null && now < startMs
  const isExpired = endMs !== null && now > endMs
  const isActive = (startMs !== null && endMs !== null && now >= startMs && now <= endMs) || session.status === "ACTIVE" || session.status === "In Progress"

  // When current time > endTime: remove card (or show clean listener empty state)
  if (isExpired && session.status !== "In Progress" && session.status !== "ACTIVE") {
    if (role === "listener") {
      return (
        <div className="card-base p-6 text-center">
          <p className="text-sm text-text-secondary font-medium mb-1">No upcoming sessions</p>
          <p className="text-xs text-text-muted">When an employee books a session, it will appear here.</p>
        </div>
      )
    }
    return null
  }

  // Format countdown string: "Starts in MM:SS"
  let countdownText = ""
  if (isBeforeStart && startMs !== null) {
    const diffSec = Math.max(0, Math.floor((startMs - now) / 1000))
    const minutes = Math.floor(diffSec / 60)
    const seconds = diffSec % 60
    countdownText = `Starts in ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  const handleEnterSession = () => {
    const targetSessionId = session.sessionId || session.id
    if (isBeforeStart) {
      const displayTime = session.startTime || session.time
      setAlertMessage(`Your session will start at ${displayTime}. Please wait.`)
      return
    }

    if (isExpired && session.status !== "In Progress" && session.status !== "ACTIVE") {
      setAlertMessage("Session completed")
      return
    }

    // Role-specific routing
    if (role === "listener") {
      navigate(`/listener-portal/session/${targetSessionId}`)
    } else {
      navigate(`/session/${targetSessionId}`)
    }
  }

  // Client identifier display:
  // For Employee: shows their Client ID
  // For Listener: shows Anonymous Client ID
  const effectiveClientId = session.clientId || "Anonymous"
  const clientIdLabel = role === "listener"
    ? `Anonymous Client ID: ${effectiveClientId}`
    : `Client ID: ${effectiveClientId}`

  const targetPersonName = role === "listener"
    ? (session.participant || `Participant (${effectiveClientId})`)
    : (session.listenerName || session.listener || "Peer Listener")

  const sessionTypeLabel = session.sessionType || "Peer Support"
  const displayTime = session.startTime || session.time
  const durationLabel = `${durMins} min`

  return (
    <div className="card-base p-5 rounded-3xl border border-purple-core/30 shadow-[0_0_20px_rgba(155,93,229,0.12)] relative overflow-hidden animate-fade-up">
      <div className="absolute top-0 right-0 w-36 h-36 bg-purple-core/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Alert toast if early or expired */}
      {alertMessage && (
        <div className="mb-3 p-2.5 rounded-xl bg-purple-core/20 border border-purple-core/40 text-lavender-bright text-xs font-medium flex items-center gap-2 animate-fade-up">
          <svg className="w-4 h-4 text-lavender-soft flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="flex-1">{alertMessage}</span>
        </div>
      )}

      {/* Header: Session Type & Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-core animate-pulse" />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-lavender-soft">
            Upcoming Session · {sessionTypeLabel}
          </h2>
        </div>
        <span
          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            isActive
              ? "bg-c-success/20 text-c-success border border-c-success/30 animate-pulse"
              : isExpired
              ? "bg-white/10 text-text-muted border border-white/10"
              : "bg-purple-core/20 text-lavender-bright border border-purple-core/30"
          }`}
        >
          {session.status === "In Progress" || session.status === "ACTIVE" ? "Live Now" : session.status}
        </span>
      </div>

      {/* Participant info & Session / Client IDs */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
          <p className="text-base font-semibold text-warm-white">
            {targetPersonName}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-purple-core font-semibold bg-purple-core/10 border border-purple-core/20 px-2 py-0.5 rounded-md">
              {clientIdLabel}
            </span>
            <span className="text-[11px] font-mono-data text-text-muted">
              {session.sessionId}
            </span>
          </div>
        </div>

        {/* Date, Time, Duration */}
        <div className="flex items-center gap-2.5 text-xs text-text-secondary flex-wrap mt-2">
          <span className="flex items-center gap-1 text-lavender-soft">
            <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {session.date}
          </span>
          <span className="text-text-muted">·</span>
          <span className="flex items-center gap-1 text-lavender-soft">
            <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {displayTime}
          </span>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted">{durationLabel}</span>
        </div>
      </div>

      {/* Button Behaviour:
          Before start: Disabled button with "Starts in MM:SS"
          When current time >= startTime: Enabled button with "Enter Session"
          When current time > endTime: Card disappears automatically
      */}
      <div className="w-full">
        {isBeforeStart ? (
          <button
            disabled
            className="w-full py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-text-muted font-mono cursor-not-allowed flex items-center justify-center gap-2 opacity-80"
          >
            <svg className="w-4 h-4 text-lavender-soft animate-spin" style={{ animationDuration: "3s" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="14 14" />
            </svg>
            <span>{countdownText}</span>
          </button>
        ) : (
          <button
            onClick={handleEnterSession}
            className="w-full btn-primary py-3 rounded-xl text-sm font-semibold cursor-pointer shadow-lg shadow-purple-core/20 animate-pulse hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 text-warm-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Enter Session
          </button>
        )}
      </div>
    </div>
  )
}
