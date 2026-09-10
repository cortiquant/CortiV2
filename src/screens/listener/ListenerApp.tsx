
import { useState, useEffect, useRef } from "react"
import { Routes, Route, useNavigate, Navigate, useLocation, useParams } from "react-router-dom"
import logoSrc from "@/imports/image-2.png"
import UpcomingSessionCard, { UpcomingSessionData } from "@/components/UpcomingSessionCard"

// ── Icons ────────────────────────────────────────────────────────────
function IconHome({ active }: { active?: boolean }) {
  return <svg className={`w-5 h-5 ${active ? "text-purple-core" : "text-text-muted"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
}
function IconCalendar({ active }: { active?: boolean }) {
  return <svg className={`w-5 h-5 ${active ? "text-purple-core" : "text-text-muted"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
}
function IconClock({ active }: { active?: boolean }) {
  return <svg className={`w-5 h-5 ${active ? "text-purple-core" : "text-text-muted"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
function IconChat({ active }: { active?: boolean }) {
  return <svg className={`w-5 h-5 ${active ? "text-purple-core" : "text-text-muted"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
}
function IconUser({ active }: { active?: boolean }) {
  return <svg className={`w-5 h-5 ${active ? "text-purple-core" : "text-text-muted"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
}

// ── Shared ────────────────────────────────────────────────────────────

function PrivacyNotice() {
  return (
    <div className="bg-surface/50 border border-border-p/50 rounded-2xl p-4 flex items-start gap-3 mt-8">
      <svg className="w-4 h-4 text-purple-core flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <p className="text-xs text-text-muted leading-relaxed">
        Client identities are always anonymous. Never share session content. CortiQuant encrypts all conversations end-to-end.
      </p>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string, value: string | number, sub?: string }) {
  return (
    <div className="card-base p-5">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">{label}</p>
      <p className="font-mono-data text-3xl font-medium text-warm-white mb-1">{value}</p>
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
    </div>
  )
}

function EmptyState({ title, msg }: { title: string, msg: string }) {
  return (
    <div className="bg-elevated border border-border-p rounded-2xl p-8 text-center flex flex-col items-center justify-center">
      <div className="w-10 h-10 rounded-full bg-surface border border-border-p flex items-center justify-center mb-3 text-text-muted">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-text-secondary mb-1">{title}</p>
      <p className="text-xs text-text-muted">{msg}</p>
    </div>
  )
}

// ── Screens ────────────────────────────────────────────────────────────

interface DashboardData {
  sessionsToday: number
  upcomingToday: number
  totalHoursListened: number
  completedSessions: number
  notCompletedSessions?: number
  completionRate?: number
  currentStatus: string
  nextSession: UpcomingSessionData | null
  todaysAvailability: Array<{ id: string; time: string; status: string }>
  pendingSessionRequests: Array<{
    id: string
    sessionId: string
    date: string
    time: string
    dur: string
    status: string
    participant: string
  }>
}

function HomeDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const listenerName = localStorage.getItem("cq_user_name") || "Listener"

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch("/api/listener/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setData(json)
        setError(null)
      } else {
        setError(json.message || "Unable to load your dashboard. Please try again.")
      }
    } catch {
      setError("Unable to load your dashboard. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 15000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse max-w-4xl mx-auto w-full space-y-6">
        <div className="h-10 bg-surface rounded-xl w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-surface rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-surface rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto w-full">
        <div className="bg-c-critical/10 border border-c-critical/30 rounded-2xl p-6 text-center">
          <p className="text-sm font-medium text-c-critical mb-3">{error}</p>
          <button onClick={fetchDashboard} className="btn-primary px-5 py-2 text-xs rounded-xl">Retry</button>
        </div>
      </div>
    )
  }

  const statusColor = data?.currentStatus === "Available"
    ? "text-c-success bg-c-success"
    : data?.currentStatus === "Busy"
    ? "text-c-warning bg-c-warning"
    : "text-text-muted bg-text-muted"

  return (
    <div className="animate-fade-up max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-warm-white mb-2">Good day, {listenerName}</h1>
        <p className="text-text-muted">Your space to listen, support, and help someone reset.</p>
      </div>

      {/* Top Stat Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Sessions Today" value={data?.sessionsToday ?? 0} sub={`${data?.upcomingToday ?? 0} upcoming`} />
        <StatCard label="Hours Listened" value={data?.totalHoursListened ?? 0} sub="Lifetime" />
        <StatCard label="Completed" value={data?.completedSessions ?? 0} sub="Finished" />
        <div className="card-base p-5 flex flex-col justify-center">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">Status</p>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${statusColor.split(" ")[1]} animate-pulse-dot`} />
            <span className={`text-sm font-medium ${statusColor.split(" ")[0]}`}>{data?.currentStatus || "Available"}</span>
          </div>
        </div>
      </div>

      {/* My Performance Analytics Card */}
      <div className="card-base p-6 mb-8 border border-border-p/80 bg-gradient-to-r from-surface/80 to-elevated/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-warm-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-core" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              My Performance
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Summary of session reliability and attendance</p>
          </div>
          <button
            onClick={() => navigate("/listener-portal/sessions")}
            className="text-xs font-semibold text-lavender-soft hover:text-warm-white flex items-center gap-1 cursor-pointer"
          >
            View History &rarr;
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center divide-x divide-border-p/60">
          <div className="px-2">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Completed</p>
            <p className="text-2xl font-mono-data font-bold text-c-success">{data?.completedSessions ?? 0}</p>
            <p className="text-[10px] text-text-muted mt-0.5">Finished sessions</p>
          </div>
          <div className="px-2">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Not Completed</p>
            <p className="text-2xl font-mono-data font-bold text-amber-400">{data?.notCompletedSessions ?? 0}</p>
            <p className="text-[10px] text-text-muted mt-0.5">Cancelled / Expired</p>
          </div>
          <div className="px-2">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Completion Rate</p>
            <p className="text-2xl font-mono-data font-bold text-lavender-bright">{data?.completionRate ?? 100}%</p>
            <p className="text-[10px] text-text-muted mt-0.5">Attendance ratio</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {data?.nextSession ? (
            <UpcomingSessionCard
              session={data.nextSession}
              role="listener"
              onRefresh={fetchDashboard}
            />
          ) : (
            <div className="card-base p-6 text-center">
              <p className="text-sm text-text-secondary font-medium mb-1">No upcoming sessions</p>
              <p className="text-xs text-text-muted">When an employee books a session, it will appear here.</p>
            </div>
          )}
        </div>

        <div>
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-warm-white">Today's Availability</h3>
            </div>
            {data?.todaysAvailability && data.todaysAvailability.length > 0 ? (
              <div className="space-y-2 mb-5">
                {data.todaysAvailability.map((slot) => (
                  <div key={slot.id || slot.time} className="px-3 py-2 rounded-lg bg-surface border border-border-p text-sm text-text-secondary flex justify-between">
                    <span>{slot.time}</span>
                    <span className="text-xs text-c-success font-medium">{slot.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted py-4 text-center">No availability slots added for today.</p>
            )}
            <button onClick={() => navigate("/listener-portal/availability")} className="w-full btn-ghost py-2.5 text-xs font-semibold rounded-xl cursor-pointer">
              Manage Availability
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionsScreen() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<"upcoming" | "completed" | "not_completed">("upcoming")
  const [sessionsData, setSessionsData] = useState<{ upcoming: any[]; completed: any[]; notCompleted: any[]; requested: any[] }>({
    upcoming: [],
    completed: [],
    notCompleted: [],
    requested: [],
  })
  const [performance, setPerformance] = useState<{
    totalSessions: number
    completedSessions: number
    notCompletedSessions: number
    completionRate: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem("cq_token")
      const [resSessions, resPerf] = await Promise.all([
        fetch("/api/listener/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/listener/performance", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const json = await resSessions.json()
      if (resSessions.ok && json.success) {
        setSessionsData({
          upcoming: json.sessions?.upcoming || [],
          completed: json.sessions?.completed || [],
          notCompleted: json.sessions?.notCompleted || json.sessions?.cancelled || [],
          requested: json.sessions?.requested || [],
        })
      }

      const jsonPerf = await resPerf.json()
      if (resPerf.ok && jsonPerf.success && jsonPerf.performance) {
        setPerformance(jsonPerf.performance)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleAccept = async (id: string) => {
    setActionLoading(id)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`/api/listener/sessions/${id}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) fetchSessions()
    } finally {
      setActionLoading(null)
    }
  }

  const handleDecline = async (id: string) => {
    setActionLoading(id)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`/api/listener/sessions/${id}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) fetchSessions()
    } finally {
      setActionLoading(null)
    }
  }

  const activeList =
    tab === "upcoming"
      ? [...sessionsData.requested, ...sessionsData.upcoming]
      : tab === "completed"
      ? sessionsData.completed
      : sessionsData.notCompleted

  const completedCount = performance?.completedSessions ?? sessionsData.completed.length
  const notCompletedCount = performance?.notCompletedSessions ?? sessionsData.notCompleted.length
  const completionRate = performance?.completionRate ?? 100

  return (
    <div className="animate-fade-up max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-warm-white mb-2">Sessions & History</h1>
        <p className="text-text-muted">Track your upcoming appointments, completed sessions, and reliability metrics.</p>
      </div>

      {/* My Performance Analytics Card in Sessions screen */}
      <div className="card-base p-5 mb-6 border border-border-p bg-surface/50">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">My Performance Analytics</p>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-core/15 text-lavender-soft border border-purple-core/30">
            {completionRate}% Completion Rate
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-elevated rounded-xl border border-border-p/60">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Completed</p>
            <p className="text-xl font-bold font-mono-data text-c-success">{completedCount}</p>
          </div>
          <div className="p-3 bg-elevated rounded-xl border border-border-p/60">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Not Completed</p>
            <p className="text-xl font-bold font-mono-data text-amber-400">{notCompletedCount}</p>
          </div>
          <div className="p-3 bg-elevated rounded-xl border border-border-p/60">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Completion Rate</p>
            <p className="text-xl font-bold font-mono-data text-lavender-bright">{completionRate}%</p>
          </div>
        </div>
      </div>

      {/* 3 Tabs: Upcoming, Completed, Not Completed */}
      <div className="flex gap-4 border-b border-border-p mb-6">
        <button
          onClick={() => setTab("upcoming")}
          className={`pb-3 border-b-2 font-semibold text-sm cursor-pointer transition-colors ${
            tab === "upcoming" ? "border-purple-core text-lavender-soft" : "border-transparent text-text-muted hover:text-text-secondary"
          }`}
        >
          Upcoming ({sessionsData.upcoming.length + sessionsData.requested.length})
        </button>
        <button
          onClick={() => setTab("completed")}
          className={`pb-3 border-b-2 font-semibold text-sm cursor-pointer transition-colors ${
            tab === "completed" ? "border-purple-core text-lavender-soft" : "border-transparent text-text-muted hover:text-text-secondary"
          }`}
        >
          Completed ({sessionsData.completed.length})
        </button>
        <button
          onClick={() => setTab("not_completed")}
          className={`pb-3 border-b-2 font-semibold text-sm cursor-pointer transition-colors ${
            tab === "not_completed" ? "border-purple-core text-lavender-soft" : "border-transparent text-text-muted hover:text-text-secondary"
          }`}
        >
          Not Completed ({sessionsData.notCompleted.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-surface rounded-2xl" />
          ))}
        </div>
      ) : activeList.length === 0 ? (
        <EmptyState
          title={
            tab === "upcoming"
              ? "No upcoming sessions"
              : tab === "completed"
              ? "No completed sessions yet"
              : "No uncompleted sessions"
          }
          msg={
            tab === "upcoming"
              ? "New sessions booked by participants will appear here."
              : tab === "completed"
              ? "Completed sessions will be logged here with start/end duration stats."
              : "Cancelled, expired, or skipped sessions will appear here with reasons."
          }
        />
      ) : (
        <div className="space-y-4">
          {activeList.map((s) => {
            const isCompletedTab = tab === "completed"
            const isNotCompletedTab = tab === "not_completed"

            return (
              <div key={s.id} className="card-base p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-border-s transition-colors">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-warm-white">
                      {s.participant || (s.clientId ? `Client ID: ${s.clientId}` : "Anonymous Participant")}
                    </span>
                    <span className="text-[10px] font-mono-data text-text-muted bg-surface border border-border-p px-1.5 py-0.5 rounded">
                      {s.sessionId}
                    </span>
                    {s.clientId && (
                      <span className="text-[10px] font-mono-data text-lavender-soft/80 bg-purple-core/10 border border-purple-core/20 px-1.5 py-0.5 rounded">
                        Client: {s.clientId}
                      </span>
                    )}
                  </div>

                  {/* Date & Time Row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                    <span>📅 {s.date}</span>
                    <span>⏰ {s.time}</span>
                    {s.startTime && s.endTime && (
                      <span className="text-text-muted">
                        ({s.startTime} - {s.endTime})
                      </span>
                    )}
                    <span>⏱ {s.dur || `${s.duration || 10} min`}</span>
                  </div>

                  {/* Additional info for Completed and Not Completed */}
                  {isCompletedTab && (
                    <div className="text-[11px] text-text-muted flex items-center gap-3 pt-1">
                      {s.completedAt && (
                        <span>Finished: {new Date(s.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                      <span>Actual duration: {s.duration || 10} minutes</span>
                    </div>
                  )}

                  {isNotCompletedTab && (
                    <div className="text-[11px] pt-1 flex flex-wrap items-center gap-2">
                      <span className="text-amber-400 font-medium">
                        Reason: {s.cancelReason || "Cancelled or Expired session"}
                      </span>
                      {s.cancelledBy && (
                        <span className="text-text-muted">
                          (by {s.cancelledBy})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right side Action or Status Badge */}
                <div className="flex items-center sm:justify-end gap-2">
                  {s.status === "Requested" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(s.sessionId || s.id)}
                        disabled={actionLoading === (s.sessionId || s.id)}
                        className="btn-ghost px-4 py-2 text-xs font-semibold rounded-xl text-lavender-soft border-purple-core/30 hover:border-purple-core/60 cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(s.sessionId || s.id)}
                        disabled={actionLoading === (s.sessionId || s.id)}
                        className="btn-ghost px-4 py-2 text-xs font-medium rounded-xl text-text-muted cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  ) : s.status === "Scheduled" || s.status === "Starting soon" || s.status === "In Progress" || s.status === "Booked" ? (
                    <button
                      onClick={() => {
                        const sid = s.sessionId || s.id || s._id
                        navigate(`/listener-portal/session/${sid}`)
                      }}
                      className="btn-primary px-5 py-2.5 text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Enter Session
                    </button>
                  ) : isCompletedTab ? (
                    <span className="text-xs text-c-success bg-c-success/10 border border-c-success/20 px-3 py-1.5 rounded-lg font-medium">
                      ✓ Completed
                    </span>
                  ) : (
                    <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/25 px-3 py-1.5 rounded-lg font-medium">
                      ✕ Not Completed ({s.status})
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <PrivacyNotice />
    </div>
  )
}

function MessagesScreen() {
  const [threads, setThreads] = useState<any[]>([])
  const [selectedThread, setSelectedThread] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [inputMsg, setInputMsg] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchThreads = async () => {
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch("/api/listener/messages", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setThreads(json.threads || [])
        if (json.threads && json.threads.length > 0 && !selectedThread) {
          setSelectedThread(json.threads[0])
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchMessagesForThread = async (sessionId: string) => {
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`/api/listener/sessions/${sessionId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setMessages(json.messages || [])
      }
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    fetchThreads()
  }, [])

  useEffect(() => {
    if (selectedThread) {
      fetchMessagesForThread(selectedThread.sessionId)
    }
  }, [selectedThread])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMsg.trim() || !selectedThread) return

    setSending(true)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`/api/listener/sessions/${selectedThread.sessionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: inputMsg }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setMessages((prev) => [...prev, json.message])
        setInputMsg("")
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="animate-fade-up max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-warm-white mb-2">Messages</h1>
        <p className="text-text-muted">Confidential session communication.</p>
      </div>

      {loading ? (
        <div className="h-64 bg-surface rounded-2xl animate-pulse" />
      ) : threads.length === 0 ? (
        <EmptyState title="No conversations yet" msg="Session-related messages will appear here once sessions are scheduled." />
      ) : (
        <div className="grid md:grid-cols-3 gap-6 card-base overflow-hidden border border-border-p min-h-[460px]">
          {/* Threads list */}
          <div className="border-r border-border-p p-4 space-y-2">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 px-1">Active Sessions</p>
            {threads.map((t) => (
              <button
                key={t.sessionId}
                onClick={() => setSelectedThread(t)}
                className={`w-full text-left p-3 rounded-xl transition-colors cursor-pointer ${
                  selectedThread?.sessionId === t.sessionId ? "bg-purple-core/15 border border-purple-core/30" : "hover:bg-surface border border-transparent"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-warm-white">{t.participant}</span>
                  <span className="text-[10px] font-mono-data text-text-muted">{t.sessionCode}</span>
                </div>
                <p className="text-xs text-text-muted truncate">{t.lastMessage}</p>
              </button>
            ))}
          </div>

          {/* Conversation view */}
          <div className="md:col-span-2 flex flex-col justify-between p-4 min-h-[400px]">
            {selectedThread ? (
              <>
                <div className="border-b border-border-p pb-3 mb-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-warm-white">{selectedThread.participant}</p>
                    <p className="text-[10px] text-text-muted">Session {selectedThread.sessionCode} · {selectedThread.date}</p>
                  </div>
                  <span className="text-xs text-c-success bg-c-success/10 px-2.5 py-1 rounded-full">{selectedThread.status}</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 max-h-[300px]">
                  {messages.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-10">Send a reassuring message to start the peer support conversation.</p>
                  ) : (
                    messages.map((m) => {
                      const isListener = m.senderRole === "LISTENER"
                      return (
                        <div key={m.id || m._id} className={`flex ${isListener ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                            isListener ? "bg-purple-core text-warm-white" : "bg-elevated border border-border-p text-warm-white"
                          }`}>
                            <p>{m.text}</p>
                            <span className="text-[9px] opacity-70 block text-right mt-1">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder="Type a confidential message..."
                    className="flex-1 bg-surface border border-border-p rounded-xl px-4 py-2.5 text-sm text-warm-white focus:outline-none focus:border-purple-core/50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !inputMsg.trim()}
                    className="btn-primary px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">
                Select a session to view messages.
              </div>
            )}
          </div>
        </div>
      )}
      <PrivacyNotice />
    </div>
  )
}

// 10-minute slot ranges for Peer Support Sessions
const MORNING_SLOTS: string[] = []
for (let h = 8; h < 12; h++) {
  for (let m = 0; m < 60; m += 10) {
    MORNING_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
  }
}

const AFTERNOON_SLOTS: string[] = []
for (let h = 12; h < 17; h++) {
  for (let m = 0; m < 60; m += 10) {
    AFTERNOON_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
  }
}

const EVENING_SLOTS: string[] = []
for (let h = 17; h <= 21; h++) {
  for (let m = 0; m < (h === 21 ? 10 : 60); m += 10) {
    EVENING_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
  }
}

function AvailabilityScreen() {
  const [day, setDay] = useState<"today" | "tomorrow">("today")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchAvailability = async () => {
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch("/api/listener/availability", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json.success) {
        const selSet = new Set<string>()
        const bkdSet = new Set<string>()

        json.today?.forEach((s: any) => {
          selSet.add(`today_${s.time}`)
          if (s.status === "Booked") {
            bkdSet.add(`today_${s.time}`)
          }
        })
        json.tomorrow?.forEach((s: any) => {
          selSet.add(`tomorrow_${s.time}`)
          if (s.status === "Booked") {
            bkdSet.add(`tomorrow_${s.time}`)
          }
        })

        setSelected(selSet)
        setBookedSlots(bkdSet)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAvailability()
  }, [])

  const toggleSlot = (time: string) => {
    const id = `${day}_${time}`
    // Booked slots cannot be toggled off or deleted
    if (bookedSlots.has(id)) return

    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const token = localStorage.getItem("cq_token")
      // Extract slots for current day
      const currentDaySlots: string[] = []
      selected.forEach((s) => {
        if (s.startsWith(`${day}_`)) {
          currentDaySlots.push(s.replace(`${day}_`, ""))
        }
      })

      const res = await fetch("/api/listener/availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slots: currentDaySlots, day }),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        fetchAvailability()
      }
    } finally {
      setSaving(false)
    }
  }

  const renderSlots = (title: string, icon: string, times: string[]) => (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-semibold text-text-muted tracking-widest uppercase">{title}</span>
        <div className="flex-1 h-px bg-border-p/60" />
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {times.map((t) => {
          const id = `${day}_${t}`
          const isSelected = selected.has(id)
          const isBooked = bookedSlots.has(id)

          return (
            <button
              key={t}
              onClick={() => toggleSlot(t)}
              disabled={isBooked}
              title={isBooked ? "Booked session — cannot be removed" : undefined}
              className={`py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                isBooked
                  ? "bg-purple-core/30 border border-purple-core text-warm-white cursor-not-allowed opacity-85 flex flex-col items-center justify-center gap-0.5"
                  : isSelected
                  ? "bg-purple-core/15 border-purple-core/40 text-lavender-soft border cursor-pointer"
                  : "bg-surface border-border-p text-text-secondary border hover:border-border-s hover:bg-elevated cursor-pointer"
              }`}
            >
              <span>{t}</span>
              {isBooked && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-c-warning">Booked</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  const activeDayCount = Array.from(selected).filter((s) => s.startsWith(`${day}_`)).length

  return (
    <div className="animate-fade-up max-w-4xl mx-auto w-full">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-warm-white mb-2">Availability</h1>
          <p className="text-text-muted">Choose your 10-minute listening rest slots.</p>
        </div>
        <div className="bg-purple-core/15 border border-purple-core/30 text-lavender-soft px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-lavender-soft animate-pulse-dot" />
          {activeDayCount} slots ({day})
        </div>
      </div>

      <div className="card-base p-6 mb-6">
        <div className="flex bg-surface border border-border-p rounded-xl p-1 mb-8 max-w-xs">
          {(["today", "tomorrow"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                day === d ? "bg-elevated text-warm-white border border-border-s" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-48 bg-surface rounded-xl animate-pulse" />
        ) : (
          <>
            {renderSlots("Morning", "🌧", MORNING_SLOTS)}
            {renderSlots("Afternoon", "🌞", AFTERNOON_SLOTS)}
            {renderSlots("Evening", "🌙", EVENING_SLOTS)}

            <div className="pt-6 border-t border-border-p mt-8 flex items-center justify-end gap-4">
              {saved && <span className="text-sm font-medium text-c-success">Saved successfully ✓</span>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary px-6 py-2.5 text-sm font-semibold rounded-xl min-w-[120px] cursor-pointer"
              >
                {saving ? "Saving..." : "Save Availability"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ProfileScreen() {
  const [profile, setProfile] = useState<any | null>(null)
  const [bio, setBio] = useState("")
  const [status, setStatus] = useState("Available")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch("/api/listener/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json.success && json.listener) {
        setProfile(json.listener)
        setBio(json.listener.bio || "")
        setStatus(json.listener.availabilityStatus || "Available")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch("/api/listener/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bio, availabilityStatus: status }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  const listenerName = profile?.name || localStorage.getItem("cq_user_name") || "Alex Listener"
  const listenerEmail = profile?.email || localStorage.getItem("cq_user_email") || "alex@cortiquant.com"
  const listenerId = profile?.listenerId || localStorage.getItem("cq_listener_id") || "LST-001"
  const initial = (listenerName.charAt(0) || "L").toUpperCase()

  return (
    <div className="animate-fade-up max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-warm-white mb-2">Profile & Settings</h1>
        <p className="text-text-muted">Manage your listener account.</p>
      </div>

      <div className="card-base p-6 mb-6">
        <h2 className="text-sm font-semibold text-warm-white uppercase tracking-widest mb-6">Listener Details</h2>
        <div className="flex items-start gap-5 mb-6 pb-6 border-b border-border-p">
          <div className="w-16 h-16 rounded-full bg-purple-core/20 border border-purple-core/30 flex items-center justify-center text-lavender-soft font-display italic text-2xl">
            {initial}
          </div>
          <div>
            <p className="text-lg font-semibold text-warm-white mb-1">{listenerName}</p>
            <p className="text-sm text-text-muted mb-1">{listenerEmail}</p>
            <p className="text-xs font-mono text-purple-core mb-3">ID: {listenerId}</p>
            <div className="flex gap-2 flex-wrap">
              <span className="bg-c-success/15 border border-c-success/30 text-c-success px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider">
                {profile?.status || "Active"}
              </span>
              <span className="bg-surface border border-border-p text-text-muted px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider">
                Verified Listener
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-32 bg-surface rounded-xl animate-pulse" />
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-widest">Availability Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-surface border border-border-p rounded-xl px-4 py-3 text-sm text-warm-white focus:outline-none focus:border-border-s cursor-pointer"
              >
                <option value="Available">Available</option>
                <option value="Busy">Busy / In Session</option>
                <option value="Unavailable">Unavailable</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-widest">Introduction Bio</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-surface border border-border-p rounded-xl px-4 py-3 text-sm text-text-secondary focus:outline-none focus:border-border-s"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {saved && <span className="text-xs text-c-success font-medium">Profile saved ✓</span>}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="btn-primary px-5 py-2.5 text-sm rounded-xl cursor-pointer"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card-base p-6">
        <h2 className="text-sm font-semibold text-warm-white uppercase tracking-widest mb-4">Security & Privacy</h2>
        <p className="text-xs text-text-muted leading-relaxed">
          Your account is secured with role-based encryption. Passwords and sensitive session data are never exposed or shared with third parties.
        </p>
      </div>
    </div>
  )
}

export function ActiveSessionScreen() {
  const navigate = useNavigate()
  const params = useParams()
  const location = useLocation()

  // Resolve sessionId from route params or directly from pathname
  const rawId = params.sessionId || params.id
  let sessionId = rawId
  if (!sessionId) {
    const match = location.pathname.match(/\/session\/([^/?#]+)/)
    if (match) {
      sessionId = match[1]
    }
  }

  console.log("Listener Session URL params:", params)
  console.log("Resolved sessionId:", sessionId)

  const [session, setSession] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [inputMsg, setInputMsg] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(10 * 60)
  const [ending, setEnding] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isListener = (localStorage.getItem("cq_role") || "").toUpperCase() === "LISTENER"

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID specified in URL.")
      setLoading(false)
      return
    }

    const fetchSession = async () => {
      try {
        const token = localStorage.getItem("cq_token")
        const res = await fetch(`/api/listener/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (res.ok && json.success && json.session) {
          setSession(json.session)
          const durSec = (json.session.durationMinutes || json.session.duration || 10) * 60
          setSecondsRemaining(durSec)

          // Only listeners start/transition session state
          if (isListener) {
            await fetch(`/api/listener/sessions/${sessionId}/start`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {})
          }
        } else {
          setError(json.message || "Session not found or access denied.")
        }
      } catch {
        setError("Failed to load session.")
      } finally {
        setLoading(false)
      }
    }

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem("cq_token")
        const res = await fetch(`/api/listener/sessions/${sessionId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (res.ok && json.success) {
          setMessages(json.messages || [])
        }
      } catch {
        // Ignore
      }
    }

    fetchSession()
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [sessionId, isListener])

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleEndSession = async () => {
    if (ending || !sessionId) return
    setEnding(true)
    try {
      const token = localStorage.getItem("cq_token")
      if (isListener) {
        await fetch(`/api/listener/sessions/${sessionId}/complete`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
        navigate("/listener-portal/sessions")
      } else {
        // For employee, return to home or my-sessions
        navigate("/home")
      }
    } finally {
      setEnding(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMsg.trim() || !sessionId) return

    const msgText = inputMsg.trim()
    setInputMsg("")
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`/api/listener/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: msgText }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setMessages((prev) => [...prev, json.message])
      }
    } catch {
      // Ignore
    }
  }

  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  if (loading) {
    return (
      <div className="fixed inset-0 bg-midnight z-[100] flex items-center justify-center text-text-muted text-sm">
        Loading session...
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-midnight z-[100] flex flex-col items-center justify-center p-6 text-center">
        <div className="card-base p-8 max-w-md w-full border border-border-p">
          <p className="text-base font-semibold text-c-critical mb-2">Access Denied</p>
          <p className="text-xs text-text-muted mb-6">{error}</p>
          <button
            onClick={() => navigate(isListener ? "/listener-portal" : "/home")}
            className="btn-primary text-xs px-5 py-2.5 rounded-xl cursor-pointer"
          >
            {isListener ? "Back to Listener Portal" : "Back to Home"}
          </button>
        </div>
      </div>
    )
  }

  const roleSubtitle = isListener
    ? (session?.participant || "Anonymous Participant")
    : `With ${session?.listenerName || "Peer Listener"}`

  return (
    <div className="fixed inset-0 bg-midnight z-[100] flex flex-col">
      <header className="h-16 border-b border-border-p bg-surface/50 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <img src={logoSrc} alt="CortiQuant" className="h-6 opacity-70" />
          <div className="h-4 w-px bg-border-p" />
          <div>
            <p className="text-sm font-semibold text-warm-white">Session {session?.sessionId || sessionId}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">{roleSubtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="font-mono-data text-xl font-medium text-warm-white">{timeFormatted}</div>
          <button
            onClick={handleEndSession}
            disabled={ending}
            className="btn-ghost px-4 py-2 text-xs font-semibold rounded-lg text-c-critical border-c-critical/30 hover:border-c-critical/60 hover:bg-c-critical/10 cursor-pointer"
          >
            {ending ? "Leaving..." : isListener ? "End Session" : "Leave Session"}
          </button>
        </div>
      </header>

      <main className="flex-1 bg-midnight overflow-y-auto p-6 flex flex-col justify-between">
        <div className="max-w-3xl mx-auto w-full mb-4">
          <div className="bg-surface/60 border border-border-p rounded-2xl p-4 text-center mb-6">
            <p className="text-xs text-lavender-soft font-medium">Session in progress · Anonymous & Confidential</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {isListener
                ? "Listen without judgement. Help unpack pressure and support your peer."
                : "You are speaking anonymously with a trained peer listener. Feel free to share."}
            </p>
          </div>

          <div className="space-y-3">
            {messages.length === 0 ? (
              <EmptyState
                title="Session Connected"
                msg={isListener ? "Send a message below to welcome the participant." : "Type a message below to start sharing."}
              />
            ) : (
              messages.map((m) => {
                const isSentByMe = isListener ? m.senderRole === "LISTENER" : m.senderRole === "EMPLOYEE"
                return (
                  <div key={m.id || m._id} className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] p-3.5 rounded-2xl text-sm ${
                      isSentByMe ? "bg-purple-core text-warm-white" : "bg-elevated border border-border-p text-warm-white"
                    }`}>
                      <p className="text-xs font-semibold mb-1 opacity-75">
                        {isSentByMe ? "You" : (m.senderName || (isListener ? "Participant" : "Peer Listener"))}
                      </p>
                      <p>{m.text}</p>
                      <span className="text-[9px] opacity-60 block text-right mt-1">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      <footer className="p-4 border-t border-border-p bg-surface/30">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3">
          <input 
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder={isListener ? "Type a message to participant..." : "Type your message..."}
            className="flex-1 bg-elevated border border-border-p rounded-xl px-4 py-3 text-sm text-warm-white focus:outline-none focus:border-purple-core/50"
          />
          <button
            type="submit"
            disabled={!inputMsg.trim()}
            className="w-12 h-12 rounded-xl bg-purple-core flex items-center justify-center text-white hover:bg-purple-500 transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </footer>
    </div>
  )
}

// ── Layout ────────────────────────────────────────────────────────────

function ListenerLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [listenerStatus, setListenerStatus] = useState("Available")

  const navigate = useNavigate()
  const location = useLocation()
  
  const currentPath = location.pathname.split('/').pop() || ""
  
  const navItems = [
    { id: "listener-portal", path: "/listener-portal", label: "Home", icon: <IconHome active={currentPath === "listener-portal" || currentPath === "" || currentPath === "listener"} /> },
    { id: "sessions", path: "/listener-portal/sessions", label: "Sessions", icon: <IconCalendar active={currentPath === "sessions"} /> },
    { id: "availability", path: "/listener-portal/availability", label: "Availability", icon: <IconClock active={currentPath === "availability"} /> },
    { id: "messages", path: "/listener-portal/messages", label: "Messages", icon: <IconChat active={currentPath === "messages"} /> },
    { id: "profile", path: "/listener-portal/profile", label: "Profile", icon: <IconUser active={currentPath === "profile"} /> },
  ]

  const getPageTitle = () => {
    switch (currentPath) {
      case "sessions": return { t: "Sessions", s: "Manage your listening schedule" }
      case "availability": return { t: "Availability", s: "Set your rest slots" }
      case "messages": return { t: "Messages", s: "Confidential communication" }
      case "profile": return { t: "Profile", s: "Account settings" }
      default: return { t: "Dashboard", s: "Overview" }
    }
  }

  const listenerName = localStorage.getItem("cq_user_name") || "Listener"
  const listenerEmail = localStorage.getItem("cq_user_email") || "listener@cortiquant.com"
  const initial = (listenerName.charAt(0) || "L").toUpperCase()

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch("/api/listener/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setNotifications(json.notifications || [])
        setUnreadCount(json.unreadCount || 0)
      }
    } catch {
      // Ignore
    }
  }

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch("/api/listener/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json.success && json.listener) {
        setListenerStatus(json.listener.availabilityStatus || "Available")
      }
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    fetchNotifications()
    fetchStatus()
  }, [location.pathname])

  const handleMarkNotificationsRead = async () => {
    try {
      const token = localStorage.getItem("cq_token")
      await fetch("/api/listener/notifications/mark-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      setUnreadCount(0)
    } catch {
      // Ignore
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("cq_token")
    localStorage.removeItem("cq_role")
    localStorage.removeItem("cq_user_email")
    localStorage.removeItem("cq_user_name")
    localStorage.removeItem("cq_listener_id")
    navigate("/listener/login")
  }

  const SidebarContent = () => (
    <>
      <div className="px-6 py-6 border-b border-border-p mb-2">
        <img src={logoSrc} alt="CortiQuant" className="h-8 object-contain object-left opacity-90" />
        <p className="text-[10px] text-text-muted mt-2 font-medium uppercase tracking-widest">Listener Portal</p>
      </div>
      
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = currentPath === item.id || (currentPath === "" && item.id === "listener-portal")
          return (
            <button
              key={item.id}
              onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                active 
                  ? "bg-purple-core/15 text-lavender-soft border border-purple-core/30" 
                  : "text-text-muted hover:bg-elevated hover:text-warm-white border border-transparent"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </nav>
      
      <div className="p-4 border-t border-border-p bg-surface/30">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-purple-core/20 border border-purple-core/30 flex items-center justify-center text-lavender-soft font-display italic text-sm">{initial}</div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-warm-white truncate">{listenerName}</p>
            <p className="text-[10px] text-text-muted truncate">{listenerEmail}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors rounded-lg hover:bg-elevated cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Logout
        </button>
      </div>
    </>
  )

  const statusColor = listenerStatus === "Available"
    ? "bg-c-success text-c-success"
    : listenerStatus === "Busy"
    ? "bg-c-warning text-c-warning"
    : "bg-text-muted text-text-muted"

  return (
    <div className="flex w-full min-h-screen bg-midnight text-warm-white font-sans">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-midnight/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-deep-navy border-r border-border-p flex flex-col transition-transform duration-300 transform lg:translate-x-0 lg:static ${mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-border-p flex items-center justify-between px-4 sm:px-8 flex-shrink-0 z-10 bg-midnight/90 backdrop-blur relative">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-1.5 -ml-1.5 text-text-muted hover:text-warm-white transition-colors cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="hidden sm:block">
              <h2 className="text-sm font-semibold text-warm-white">{getPageTitle().t}</h2>
              <p className="text-xs text-text-muted">{getPageTitle().s}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-elevated border border-border-p rounded-full px-3 py-1">
              <div className={`w-2 h-2 rounded-full ${statusColor.split(" ")[0]} animate-pulse-dot`} />
              <span className={`text-[10px] font-semibold ${statusColor.split(" ")[1]} uppercase tracking-wider`}>
                {listenerStatus}
              </span>
            </div>
            
            {/* Notification bell & dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen)
                  if (!notifOpen && unreadCount > 0) handleMarkNotificationsRead()
                }}
                className="text-text-muted hover:text-warm-white transition-colors relative p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-lavender-soft rounded-full" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-deep-navy border border-border-p rounded-2xl shadow-2xl p-4 z-50 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-border-p pb-2 mb-3">
                    <p className="text-xs font-semibold text-warm-white uppercase tracking-wider">Notifications</p>
                    <span className="text-[10px] text-text-muted">{notifications.length} updates</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2.5">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-text-muted text-center py-4">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-2.5 rounded-xl bg-surface border border-border-p/50">
                          <p className="text-xs font-semibold text-warm-white">{n.title}</p>
                          <p className="text-[11px] text-text-muted mt-0.5">{n.message}</p>
                          <span className="text-[9px] text-text-muted opacity-60 mt-1 block">
                            {new Date(n.createdAt).toLocaleDateString()} · {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-8 h-8 rounded-full bg-purple-core/20 border border-purple-core/30 flex items-center justify-center text-lavender-soft font-display italic text-sm">{initial}</div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Routes>
            <Route path="/" element={<HomeDashboard />} />
            <Route path="sessions" element={<SessionsScreen />} />
            <Route path="availability" element={<AvailabilityScreen />} />
            <Route path="messages" element={<MessagesScreen />} />
            <Route path="profile" element={<ProfileScreen />} />
            <Route path="session/:sessionId" element={<ActiveSessionScreen />} />
            <Route path="session/:id" element={<ActiveSessionScreen />} />
            <Route path="*" element={<Navigate to="/listener-portal" />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function ListenerApp() {
  const location = useLocation()
  if (location.pathname.includes("/session/")) {
    return <ActiveSessionScreen />
  }
  return <ListenerLayout />
}

