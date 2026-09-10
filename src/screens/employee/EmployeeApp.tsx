import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import UpcomingSessionCard, { UpcomingSessionData } from "@/components/UpcomingSessionCard"
import BaselineMSI from "./BaselineMSI"
import StressDriverFlow from "./StressDriverFlow"
import PriorityReset from "./PriorityReset"
import BreathingReset from "./BreathingReset"
import Journal from "./Journal"
import MusicalReset from "./MusicalReset"
import MovementReset from "./MovementReset"
import GuidedReset from "./GuidedReset"

type Screen =
  | "home"
  | "checkin-1"
  | "checkin-2"
  | "checkin-3"
  | "driver"
  | "result"
  | "recommended"
  | "dump-bag"
  | "dump-response"
  | "reset-list"
  | "reset-active"
  | "reset-complete"
  | "my-stress"
  | "support"
  | "reset-labs"
  | "baseline-msi"
  | "stress-cause"
  | "msi-meaning"
  | "archetype"
  | "priority-reset"
  | "breathing-reset"
  | "journal"
  | "music-reset"
  | "movement-reset"
  | "energy-reset"
  | "relaxation"
  | "sleep-winddown"
  | "profile"
  | "settings"
  | "listener-connect"
  | "listener-schedule"
  | "my-sessions"
  | "notifications"
  | "professional-support"
  | "emergency-support"

interface CheckInData {
  feeling: string
  stressor: string
  physical: string
  driver: string
}

// ── Bottom nav ─────────────────────────────────────────────────────────────────

function BottomNav({ active, onNav }: { active: string; onNav: (s: Screen) => void }) {
  const tabs = [
    { id: "home",       label: "Home",      icon: NavHomeIcon  },
    { id: "dump-bag",   label: "Dump Bag",  icon: NavDumpIcon  },
    { id: "reset-list", label: "Reset",     icon: NavDropIcon  },
    { id: "archetype",  label: "Archetype", icon: NavStarIcon  },
    { id: "support",    label: "Support",   icon: NavHeartIcon },
  ]
  const dumpGroup  = ["dump-response"]
  const resetGroup = ["reset-active", "reset-complete", "reset-labs", "priority-reset", "breathing-reset", "journal", "music-reset", "movement-reset", "energy-reset", "relaxation", "sleep-winddown"]
  const homeGroup  = ["my-stress", "checkin-1", "checkin-2", "checkin-3", "driver", "result", "recommended", "baseline-msi", "stress-cause", "msi-meaning", "profile", "settings", "listener-connect", "listener-schedule", "notifications"]

  return (
    <div className="sticky bottom-0 left-0 right-0 z-50 w-full mt-auto">
      {/* Soft fade upward */}
      <div className="h-6 bg-gradient-to-t from-midnight/90 to-transparent pointer-events-none" />
      <div className="bg-midnight/92 backdrop-blur-xl">
        <div className="flex items-center justify-around px-2 py-2.5">
          {tabs.map((t) => {
            const Icon = t.icon
            const isActive =
              active === t.id ||
              (t.id === "home"       && homeGroup.includes(active)) ||
              (t.id === "dump-bag"   && dumpGroup.includes(active)) ||
              (t.id === "reset-list" && resetGroup.includes(active))
            return (
              <button
                key={t.id}
                onClick={() => onNav(t.id as Screen)}
                className="flex flex-col items-center gap-1 py-1.5 px-3 min-h-[44px] transition-all"
              >
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300 ${isActive ? "bg-purple-core/15" : ""}`}>
                  <Icon active={isActive} />
                </div>
                <span className={`text-[9px] font-medium tracking-wide transition-colors ${isActive ? "text-lavender-bright" : "text-text-muted/70"}`}>
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function NavHomeIcon({ active }: { active: boolean }) {
  return <svg className={`w-[18px] h-[18px] ${active ? "text-lavender-bright" : "text-text-muted/60"}`} fill="none" viewBox="0 0 20 20"><path d="M3 9l7-6 7 6v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill={active ? "currentColor" : "none"} fillOpacity={0.15} /></svg>
}
function NavDumpIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-[18px] h-[18px] ${active ? "text-lavender-bright" : "text-text-muted/60"}`} fill="none" viewBox="0 0 20 20">
      {/* Bag body */}
      <path
        d="M7 10C4.5 10 3 12 3 14.5C3 17.5 6 20 10 20C14 20 17 17.5 17 14.5C17 12 15.5 10 13 10C12.5 9.4 11.5 9 10 9C8.5 9 7.5 9.4 7 10Z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
        fill={active ? "currentColor" : "none"} fillOpacity={0.12}
      />
      {/* Neck pinch */}
      <path d="M7.5 9C7.5 8.1 8.6 7.5 10 7.5C11.4 7.5 12.5 8.1 12.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* Twisted knot top */}
      <path d="M8 7.5L6.5 5.5L9.5 4.5L10 6L10.5 4.5L13.5 5.5L12 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Interior crease */}
      <path d="M5.5 15.5V17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function NavDropIcon({ active }: { active: boolean }) {
  return <svg className={`w-[18px] h-[18px] ${active ? "text-lavender-bright" : "text-text-muted/60"}`} fill="none" viewBox="0 0 20 20"><path d="M10 3C10 3 5 9 5 13a5 5 0 0010 0c0-4-5-10-5-10z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill={active ? "currentColor" : "none"} fillOpacity={0.15} /></svg>
}
function NavStarIcon({ active }: { active: boolean }) {
  return <svg className={`w-[18px] h-[18px] ${active ? "text-lavender-bright" : "text-text-muted/60"}`} fill="none" viewBox="0 0 20 20"><path d="M10 2l2.4 5.3H18l-4.5 3.5 1.7 5.4L10 13l-5.2 3.2 1.7-5.4L2 7.3h5.6L10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill={active ? "currentColor" : "none"} fillOpacity={0.15} /></svg>
}
function NavHeartIcon({ active }: { active: boolean }) {
  return <svg className={`w-[18px] h-[18px] ${active ? "text-lavender-bright" : "text-text-muted/60"}`} fill="none" viewBox="0 0 20 20"><path d="M10 16.5S3 12 3 7a4 4 0 017-2.6A4 4 0 0117 7c0 5-7 9.5-7 9.5z" stroke="currentColor" strokeWidth="1.4" fill={active ? "currentColor" : "none"} fillOpacity={0.15} /></svg>
}

// ── Shell helpers ──────────────────────────────────────────────────────────────

function Shell({ children, noNav }: { children: React.ReactNode; noNav?: boolean }) {
  return (
    <div className={`flex-1 overflow-y-auto px-5 pt-5 ${noNav ? "pb-6" : "pb-28"}`}>
      {children}
    </div>
  )
}

function BackBtn({ onBack, label = "Back" }: { onBack: () => void; label?: string }) {
  return (
    <button onClick={onBack} className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors mb-5 text-sm font-medium">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {label}
    </button>
  )
}

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${i < current ? "bg-purple-core" : "bg-border-p"}`} />
      ))}
    </div>
  )
}

function getBand(msi: number) {
  if (msi <= 20) return { label: "Healthy",  color: "text-c-success",  bg: "bg-c-success/10",  border: "border-c-success/25",  dot: "bg-c-success"  }
  if (msi <= 40) return { label: "Mild",      color: "text-c-info",     bg: "bg-c-info/10",     border: "border-c-info/25",     dot: "bg-c-info"     }
  if (msi <= 60) return { label: "Moderate",  color: "text-lavender-soft", bg: "bg-purple-core/10", border: "border-purple-core/25", dot: "bg-lavender-soft" }
  if (msi <= 80) return { label: "High",      color: "text-c-warning",  bg: "bg-c-warning/10",  border: "border-c-warning/25",  dot: "bg-c-warning"  }
  return           { label: "Burnout",    color: "text-c-critical", bg: "bg-c-critical/10", border: "border-c-critical/25", dot: "bg-c-critical" }
}

function DriverBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100
  const color = value >= 70 ? "bg-c-warning" : value >= 50 ? "bg-lavender-bright" : "bg-c-success"
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-text-secondary font-medium">{label}</span>
        <span className={`font-mono-data font-medium ${value >= 70 ? "text-c-warning" : value >= 50 ? "text-lavender-soft" : "text-c-success"}`}>
          {value >= 70 ? "High" : value >= 50 ? "Moderate" : "Low"}
        </span>
      </div>
      <div className="h-2 bg-border-p rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700 opacity-80`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Notifications helpers ──────────────────────────────────────────────────────

interface CQNotification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

function getNotifications(): CQNotification[] {
  return JSON.parse(localStorage.getItem("cq_notifications") ?? "[]")
}

function pushNotification(n: Omit<CQNotification, "id" | "read" | "createdAt">) {
  const existing = getNotifications()
  existing.unshift({ ...n, id: Date.now().toString(), read: false, createdAt: new Date().toISOString() })
  localStorage.setItem("cq_notifications", JSON.stringify(existing))
}

function markAllRead() {
  const existing = getNotifications().map((n) => ({ ...n, read: true }))
  localStorage.setItem("cq_notifications", JSON.stringify(existing))
}

// ── Home screen ────────────────────────────────────────────────────────────────

const MSI_HEADLINE: Record<string, string> = {
  Healthy:  "You're in a good place today.",
  Mild:     "Your mental load is gently building.",
  Moderate: "Your stress is running a little warm.",
  High:     "Your mental load is quietly building.",
  Burnout:  "Your stress needs attention today.",
}

const MSI_SUBTEXT: Record<string, string> = {
  Healthy:  "Keep doing what you're doing — your recovery is working.",
  Mild:     "Small recovery habits now can keep this from rising.",
  Moderate: "Even a few quiet minutes today can help.",
  High:     "Give yourself permission to slow down, just for a little while.",
  Burnout:  "You don't have to carry this alone. Let's take it one step at a time.",
}

const GAUGE_COLOR: Record<string, string> = {
  Healthy:  "#4ade80",
  Mild:     "#60a5fa",
  Moderate: "#a78bfa",
  High:     "#f59e0b",
  Burnout:  "#f87171",
}

type PrimaryRec = { icon: string; title: string; label: string; nav: Screen; cta: string; iconBg: string; iconBorder: string }

function getAdvice(msi: number, driver?: string): string[] {
  if (msi >= 61) {
    if (driver === "Workload") return ["Step away for 10 minutes.", "Jot down the top priority.", "Leave the rest for tomorrow."]
    if (driver === "People") return ["Postpone non-urgent conversations.", "Take a short walk outside.", "Write it out in the dump bag."]
    if (driver === "Performance") return ["Lower the bar to 'good enough'.", "Focus on one small step.", "Take a breathing pause."]
    if (driver === "Future") return ["Focus only on today.", "List what you can control.", "Take a screen break."]
    if (driver === "Sleep & Energy") return ["Do the bare minimum.", "Rest is productive.", "Close your eyes for 5 mins."]
    if (driver === "Personal") return ["Leave your phone in another room.", "Drink a glass of water.", "Take 5 deep breaths."]
    if (driver === "Physical") return ["Do a gentle stretch.", "Step away from the screen.", "Rest your eyes."]
    return ["Step away for a moment.", "Let your nervous system settle.", "Do nothing for 5 minutes."]
  } else if (msi >= 41) {
    if (driver === "Workload") return ["Take a 60-second breathing break.", "Pick one task to finish.", "Close unnecessary tabs."]
    if (driver === "People") return ["Take a quick walk.", "Get some fresh air.", "Reset your focus."]
    if (driver === "Performance") return ["Focus on steady progress.", "Remember you are doing okay.", "Take a quick pause."]
    if (driver === "Sleep & Energy") return ["Prioritize your top task.", "Leave the rest for later.", "Stretch your legs."]
    return ["Find a moment of stillness.", "Take a deep breath.", "Step away for a minute."]
  } else {
    return ["Keep up your routines.", "Take a proactive break.", "Stay hydrated."]
  }
}

function getPrimaryRec(msi: number): PrimaryRec {
  if (msi >= 81) return { icon: "🤝", title: "Please reach out. You don't have to carry this alone.", label: "Support",         nav: "support",         cta: "Get support →",    iconBg: "rgba(192,132,252,0.10)", iconBorder: "rgba(192,132,252,0.20)" }
  if (msi >= 61) return { icon: "🗑️", title: "Get it out of your head.",                              label: "Dump bag",        nav: "dump-bag",        cta: "Open dump bag →",  iconBg: "rgba(233,154,154,0.10)", iconBorder: "rgba(233,154,154,0.20)" }
  if (msi >= 41) return { icon: "🫧",  title: "Take a short breathing pause.",                         label: "Breathing reset", nav: "breathing-reset", cta: "Start reset →",    iconBg: "rgba(127,168,216,0.10)", iconBorder: "rgba(127,168,216,0.20)" }
  if (msi >= 21) return { icon: "📖", title: "Write a few thoughts down.",                             label: "Journal",         nav: "journal",         cta: "Open journal →",   iconBg: "rgba(135,149,216,0.10)", iconBorder: "rgba(135,149,216,0.20)" }
  return                 { icon: "🌿", title: "Keep up your recovery habits.",                          label: "Explore resets",  nav: "reset-list",      cta: "Browse resets →",  iconBg: "rgba(114,198,165,0.10)", iconBorder: "rgba(114,198,165,0.20)" }
}

function SoftCard({ children, className = "", delay = 0, style }: { children: React.ReactNode; className?: string; delay?: number; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-3xl animate-fade-up ${className}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        animationDelay: `${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function MsiGauge({ pct, color, size = 64 }: { pct: number | null; color: string; size?: number }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const numVal = pct != null ? pct : 0
  const dash = pct != null ? circ * Math.min(Math.max(numVal / 100, 0), 1) : 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="inherit">
        {pct != null ? `${pct}%` : "—"}
      </text>
      <text x={size / 2} y={size / 2 + 11} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.45)" fontSize="8" fontFamily="inherit" letterSpacing="1">
        MSI
      </text>
    </svg>
  )
}

function HomeScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const [employeeProfile, setEmployeeProfile] = useState<any>(null)
  const [assessmentMetrics, setAssessmentMetrics] = useState<any>(null)
  const [latestRootCause, setLatestRootCause] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState<number>(() => getNotifications().filter((n) => !n.read).length)

  // Dynamic AI Recommendations for "For right now" (3–4 recommendations)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [recsLoading, setRecsLoading] = useState(false)

  const fetchRecommendations = useCallback(() => {
    const token = localStorage.getItem("cq_token")
    if (!token) return

    setRecsLoading(true)
    fetch("/api/recommendations/latest", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.recommendations?.length > 0) {
          setRecommendations(data.data.recommendations)
        } else {
          // Check local cache if backend had none
          const localSaved = localStorage.getItem("cq_latest_recommendations")
          if (localSaved) {
            try {
              setRecommendations(JSON.parse(localSaved))
            } catch {}
          }
        }
      })
      .catch((err) => {
        console.warn("[DASHBOARD-RECS] Fetch error:", err)
      })
      .finally(() => {
        setRecsLoading(false)
      })
  }, [])

  const fetchNotifications = useCallback(() => {
    const token = localStorage.getItem("cq_token")
    if (!token) return
    fetch("/api/employee/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("cq_token")
    if (!token) return

    Promise.all([
      fetch("/api/employee/profile", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch("/api/assessments/metrics", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch("/api/root-cause-assessments/latest", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([profData, metricsData, rootCauseData]) => {
        if (profData.success && profData.data) {
          setEmployeeProfile(profData.data)
          if (profData.data.name) {
            localStorage.setItem("cq_user_name", profData.data.name)
          }
        }
        if (metricsData.success && metricsData.data) {
          setAssessmentMetrics(metricsData.data)
          if (metricsData.data.baselineMsi != null) {
            localStorage.setItem("cq_baseline_msi", String(metricsData.data.baselineMsi))
          }
        }
        if (rootCauseData.success && rootCauseData.data) {
          setLatestRootCause(rootCauseData.data)
          localStorage.setItem("cq_latest_root_cause", JSON.stringify(rootCauseData.data))
        }

        // Fetch latest saved AI recommendations
        fetchRecommendations()
        fetchNotifications()
      })
      .catch((err) => console.warn("[DASHBOARD] Fetch error:", err))
      .finally(() => setLoading(false))

    // Listen for recommendations update event (dispatched right after root-cause completion)
    const handleRecsUpdated = () => {
      fetchRecommendations()
    }
    window.addEventListener("cq_recommendations_updated", handleRecsUpdated)
    const notifInterval = setInterval(fetchNotifications, 15000)
    return () => {
      window.removeEventListener("cq_recommendations_updated", handleRecsUpdated)
      clearInterval(notifInterval)
    }
  }, [fetchRecommendations, fetchNotifications])

  const empName = employeeProfile?.name || localStorage.getItem("cq_user_name") || "Employee"
  const firstName = empName.split(" ")[0]

  const baselineMsi = assessmentMetrics?.baselineMsi ?? (localStorage.getItem("cq_baseline_msi") ? parseInt(localStorage.getItem("cq_baseline_msi")!, 10) : null)
  const hasBaseline = baselineMsi != null

  const currentMsi = assessmentMetrics?.currentMsi ?? null
  const msiForDisplay = currentMsi ?? baselineMsi ?? 50
  const band = getBand(msiForDisplay)
  const headline = currentMsi != null ? (MSI_HEADLINE[band.label] ?? "Your stress is running smoothly.") : "Baseline established. Check in to track daily shifts."
  const subtext = currentMsi != null ? (MSI_SUBTEXT[band.label] ?? "Even a few quiet minutes today can help.") : "Take your daily check-in to monitor changes from your baseline."
  const gaugeColor = currentMsi != null ? (GAUGE_COLOR[band.label] ?? "#4ade80") : "#a78bfa"
  const primaryRec = getPrimaryRec(msiForDisplay)

  const assessments = JSON.parse(localStorage.getItem("cq_stress_assessments") ?? "[]")
  const recentAssessment = assessments.length > 0 ? assessments[assessments.length - 1] : null
  const driver = recentAssessment?.selectedDriver
  const advice = getAdvice(msiForDisplay, driver)

  // Current formatted date
  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className="flex-1 overflow-y-auto pb-32 relative">
      {/* Ambient background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(155,93,229,0.10) 0%, transparent 68%)", filter: "blur(32px)" }} />
        <div className="absolute top-1/3 -right-24 w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(100,60,200,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      <div className="relative px-5 pt-7 space-y-4">
        {/* Greeting */}
        <div className="flex items-start justify-between mb-2 animate-fade-up">
          <div>
            <p className="text-[12px] text-text-muted mb-1 tracking-wide">{todayStr}</p>
            <h1 className="text-[22px] font-semibold text-warm-white leading-snug">Good morning, {firstName}.</h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {/* Notification bell */}
            <button
              onClick={() => onNav("notifications")}
              className="relative w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0 hover:bg-white/8 transition-all"
              aria-label="Notifications"
            >
              <svg className="w-4.5 h-4.5 text-text-muted" width="18" height="18" fill="none" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-purple-core border border-midnight flex items-center justify-center">
                  <span className="text-[9px] font-bold text-warm-white leading-none">{unreadCount}</span>
                </span>
              )}
            </button>
            {/* Profile */}
            <button
              onClick={() => onNav("profile")}
              className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0 hover:bg-white/8 transition-all"
              aria-label="Profile"
            >
              <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Real-time Upcoming Session Card (Earliest next session) */}
        <UpcomingSessionCard role="employee" />

        {/* MSI card — compact horizontal */}
        {!hasBaseline ? (
          <SoftCard delay={40}>
            <button onClick={() => onNav("baseline-msi")} className="flex items-center gap-4 p-4 w-full group text-left">
              <div className="w-14 h-14 rounded-full bg-purple-core/10 border border-purple-core/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-core/18 transition-all duration-300">
                <svg className="w-6 h-6 text-purple-core" fill="none" viewBox="0 0 24 24">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-text-muted mb-1">{"Today's Mind Stress Index"}</p>
                <p className="text-sm font-medium text-warm-white group-hover:text-lavender-soft transition-colors">{"Let's find your baseline"}</p>
                <p className="text-xs text-text-muted mt-0.5">Start questionnaire →</p>
              </div>
            </button>
          </SoftCard>
        ) : (
          <>
            <SoftCard delay={30}>
              <div className="flex items-center gap-4 p-4">
                <MsiGauge pct={currentMsi} color={gaugeColor} size={68} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[11px] leading-none">🌿</span>
                    <p className="text-[9px] text-text-muted font-medium">
                      {currentMsi != null ? "How you're doing right now" : `Baseline: ${baselineMsi}%`}
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold text-warm-white leading-snug mb-1">{headline}</p>
                  <p className="text-xs text-text-muted leading-relaxed">{subtext}</p>
                </div>
              </div>
            </SoftCard>
            <div className="flex gap-2 animate-fade-up" style={{ animationDelay: "40ms" }}>
              <button onClick={() => onNav("checkin-1")} className="flex-1 btn-primary py-3 rounded-2xl text-sm font-medium">
                Check in
              </button>
              <button onClick={() => onNav("my-stress")} className="flex-1 py-3 rounded-2xl text-sm text-text-muted hover:text-text-secondary transition-colors" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {"Understand it →"}
              </button>
            </div>
          </>
        )}

        {/* Let's understand this */}
        {hasBaseline && currentMsi != null && currentMsi > 40 && (
          <SoftCard delay={65} className="p-5" style={{ background: "rgba(155,93,229,0.06)", border: "1px solid rgba(155,93,229,0.12)" }}>
            <p className="text-[10px] text-lavender-soft/60 mb-3">💭 {"Let's understand this"}</p>
            <p className="text-base font-medium text-warm-white mb-2">{"What's been weighing on you lately?"}</p>
            <p className="text-sm text-text-muted leading-relaxed mb-4">{"Choose what feels relevant — we'll help you make sense of it."}</p>
            
            {latestRootCause && (
              <div className="mb-4 p-3 rounded-2xl bg-purple-core/10 border border-purple-core/25">
                <p className="text-[10px] text-lavender-bright uppercase tracking-wider font-semibold mb-0.5">Based on your latest check-in</p>
                <p className="text-xs text-warm-white font-medium">
                  Primary Cause: <span className="font-bold text-lavender-soft">{latestRootCause.primaryCause}</span>
                </p>
              </div>
            )}

            <button onClick={() => onNav("stress-cause")} className="text-sm font-medium text-lavender-bright hover:text-lavender-soft transition-colors cursor-pointer">
              {latestRootCause ? "View what might help →" : "Let's find out →"}
            </button>
          </SoftCard>
        )}

        {/* For right now — AI-powered personalized recommendations */}
        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[10px] text-text-muted">🌱 For right now</p>
            {recsLoading && (
              <span className="text-[10px] text-lavender-soft/70 font-mono-data animate-pulse">
                Finding something that may help...
              </span>
            )}
          </div>

          {!hasBaseline && currentMsi == null ? (
            <SoftCard className="p-5" style={{ background: "rgba(155,93,229,0.04)", border: "1px solid rgba(155,93,229,0.1)" }}>
              <div className="text-left space-y-3">
                <p className="text-sm font-semibold text-warm-white">
                  Start your check-in to get a recommendation that fits how you're feeling today.
                </p>
                <button
                  onClick={() => onNav("checkin-1")}
                  className="text-xs font-semibold text-lavender-bright hover:text-lavender-soft transition-colors cursor-pointer"
                >
                  Check in →
                </button>
              </div>
            </SoftCard>
          ) : recsLoading && recommendations.length === 0 ? (
            <SoftCard className="p-5" style={{ background: "rgba(155,93,229,0.04)", border: "1px solid rgba(155,93,229,0.1)" }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-core/10 border border-purple-core/20 flex items-center justify-center text-lg flex-shrink-0 animate-pulse">
                  🌱
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm font-semibold text-warm-white">Finding something that may help...</p>
                  <p className="text-xs text-text-muted">Personalizing recommendations to your stress reflections.</p>
                </div>
              </div>
            </SoftCard>
          ) : recommendations.length > 0 ? (
            /* 3–4 dynamic AI-generated recommendation cards */
            <div className="space-y-3">
              {recommendations.slice(0, 4).map((rec, i) => {
                const isFeature = rec.type === "feature" || rec.type === "cortiquant_feature" || Boolean(rec.featureKey)
                const featureKey = rec.featureKey || (rec.cta?.includes("dump") ? "dump-bag" : rec.cta?.includes("listener") ? "listener" : null)

                let navTarget: Screen = "reset-list"
                if (featureKey === "dump-bag" || rec.cta?.includes("dump") || (rec.title + " " + rec.description).toLowerCase().includes("dump")) {
                  navTarget = "dump-bag"
                } else if (featureKey === "listener" || rec.cta?.includes("listener") || (rec.title + " " + rec.description).toLowerCase().includes("listener")) {
                  navTarget = "listener-connect"
                } else if (featureKey === "priority-reset" || rec.cta?.includes("priority")) {
                  navTarget = "priority-reset"
                } else if (featureKey === "breathing-reset" || rec.cta?.includes("breath")) {
                  navTarget = "breathing-reset"
                } else if (featureKey === "relaxation" || rec.cta?.includes("relax")) {
                  navTarget = "relaxation"
                } else if (featureKey === "sleep-winddown" || rec.cta?.includes("wind")) {
                  navTarget = "sleep-winddown"
                } else if (isFeature) {
                  navTarget = "reset-list"
                }

                const ctaText = rec.cta || (isFeature ? "Explore feature →" : "Try this →")

                return (
                  <SoftCard
                    key={rec.id || i}
                    className="p-4 transition-all hover:border-purple-core/30"
                    style={{ background: "rgba(155,93,229,0.04)", border: "1px solid rgba(155,93,229,0.1)" }}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-core/10 border border-purple-core/20 flex items-center justify-center text-base flex-shrink-0">
                        {rec.icon || (isFeature ? "✨" : "📋")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                              isFeature
                                ? "bg-purple-core/20 text-lavender-bright border border-purple-core/30"
                                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                            }`}
                          >
                            {isFeature ? "CortiQuant" : "Action"}
                          </span>
                          <p className="text-xs font-semibold text-warm-white truncate">{rec.title}</p>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed mb-2.5">{rec.description}</p>
                        
                        <div className="pt-2 border-t border-purple-core/10 flex items-center justify-between">
                          {isFeature ? (
                            <button
                              onClick={() => onNav(navTarget)}
                              className="text-xs font-semibold text-lavender-bright hover:text-lavender-soft transition-colors cursor-pointer"
                            >
                              {ctaText}
                            </button>
                          ) : (
                            <span className="text-[11px] font-medium text-emerald-400/90 flex items-center gap-1">
                              ✓ {ctaText}
                            </span>
                          )}
                          {isFeature && (
                            <button
                              onClick={() => onNav("reset-list")}
                              className="text-[11px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                            >
                              Explore resets →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </SoftCard>
                )
              })}
            </div>
          ) : (
            /* Default neutral recommendation when no root-cause analysis has been completed yet or MSI is within range */
            <SoftCard className="p-5" style={{ background: "rgba(155,93,229,0.04)", border: "1px solid rgba(155,93,229,0.1)" }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-core/10 border border-purple-core/20 flex items-center justify-center text-lg flex-shrink-0">
                  {primaryRec.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-warm-white leading-snug mb-1">
                    {primaryRec.title}
                  </p>
                  <p className="text-xs text-text-muted leading-relaxed mb-4">
                    {subtext}
                  </p>
                  <div className="pt-3 border-t border-purple-core/10 flex items-center justify-between gap-3">
                    <button
                      onClick={() => onNav(primaryRec.nav)}
                      className="text-xs font-semibold text-lavender-bright hover:text-lavender-soft transition-colors cursor-pointer"
                    >
                      {primaryRec.cta}
                    </button>
                    <button
                      onClick={() => onNav("reset-list")}
                      className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                    >
                      Explore resets →
                    </button>
                  </div>
                </div>
              </div>
            </SoftCard>
          )}
        </div>

        {/* Archetype mini-card */}
        {(() => {
          const archetypeName = localStorage.getItem("cq_archetype")
          if (!archetypeName) return null
          const p = ARCHETYPE_PROFILES[archetypeName]
          if (!p) return null
          return (
            <button
              onClick={() => onNav("archetype")}
              className="w-full text-left animate-fade-up"
              style={{ animationDelay: "95ms" }}
            >
              <SoftCard>
                <div className="flex items-center gap-3 p-4">
                  <div className={`w-10 h-10 rounded-xl ${p.bg} border ${p.border} flex items-center justify-center flex-shrink-0 text-xl`}>
                    {p.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-text-muted mb-0.5 tracking-wide">Your archetype</p>
                    <p className={`text-sm font-semibold ${p.color} truncate`}>{archetypeName}</p>
                    <p className="text-xs text-text-muted truncate">{p.tagline}</p>
                  </div>
                  <svg className="w-4 h-4 text-text-muted/50 flex-shrink-0" fill="none" viewBox="0 0 16 16">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </SoftCard>
            </button>
          )
        })()}

        {/* Your body & mind */}
        <SoftCard delay={120} className="p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] text-text-muted mb-3">🫀 Your body & mind</p>
          <p className="text-sm text-text-secondary leading-relaxed mb-1.5">Want to understand your physical stress signals?</p>
          <p className="text-xs text-text-muted">Biological measurement · Coming soon</p>
        </SoftCard>
      </div>
    </div>
  )
}

// ── Check-in screens ───────────────────────────────────────────────────────────

const FEELING_OPTIONS = ["Calm", "Okay", "A little tense", "Stressed", "Overwhelmed"]
const STRESSOR_OPTIONS = ["Workload", "Deadlines", "People", "Personal", "Sleep", "Uncertainty", "Something else"]
const PHYSICAL_OPTIONS = ["Energised", "Tired but okay", "Drained", "Tense / restless", "Exhausted"]

function CheckIn1({ onNext, onBack, data, setData }: { onNext: () => void; onBack: () => void; data: CheckInData; setData: (d: CheckInData) => void }) {
  return (
    <Shell>
      <BackBtn onBack={onBack} />
      <StepBar current={1} total={3} />
      <p className="text-[10px] text-text-muted mb-2">Check-in · 1 of 3</p>
      <h2 className="text-[22px] font-semibold text-warm-white leading-snug mb-2">How are you feeling<br />right now?</h2>
      <p className="text-text-muted text-sm mb-7">There's no wrong answer.</p>
      <div className="space-y-2.5">
        {FEELING_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => { setData({ ...data, feeling: opt }); onNext() }}
            className={`w-full flex items-center gap-3.5 px-4 py-4 rounded-2xl border text-left transition-all min-h-[56px] ${
              data.feeling === opt
                ? "border-purple-core bg-purple-core/10 text-lavender-soft"
                : "border-border-p text-text-secondary hover:border-border-s hover:text-warm-white"
            }`}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${data.feeling === opt ? "bg-purple-core" : "bg-border-s"}`} />
            <span className="font-medium">{opt}</span>
          </button>
        ))}
      </div>
    </Shell>
  )
}

function CheckIn2({ onNext, onBack, data, setData }: { onNext: () => void; onBack: () => void; data: CheckInData; setData: (d: CheckInData) => void }) {
  return (
    <Shell>
      <BackBtn onBack={onBack} />
      <StepBar current={2} total={3} />
      <p className="text-[10px] text-text-muted mb-2">Check-in · 2 of 3</p>
      <h2 className="text-[22px] font-semibold text-warm-white leading-snug mb-2">{"What's taking up the"}<br />most space?</h2>
      <p className="text-text-muted text-sm mb-7">In your mind right now.</p>
      <div className="grid grid-cols-2 gap-2.5">
        {STRESSOR_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => { setData({ ...data, stressor: opt }); onNext() }}
            className={`flex items-center px-4 py-3.5 rounded-2xl border text-left transition-all min-h-[52px] text-sm font-medium ${
              opt === "Something else" ? "col-span-2" : ""
            } ${
              data.stressor === opt
                ? "border-purple-core bg-purple-core/10 text-lavender-soft"
                : "border-border-p text-text-secondary hover:border-border-s hover:text-warm-white"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </Shell>
  )
}

function CheckIn3({ onNext, onBack, data, setData }: { onNext: () => void; onBack: () => void; data: CheckInData; setData: (d: CheckInData) => void }) {
  return (
    <Shell>
      <BackBtn onBack={onBack} />
      <StepBar current={3} total={3} />
      <p className="text-[10px] text-text-muted mb-2">Check-in · 3 of 3</p>
      <h2 className="text-[22px] font-semibold text-warm-white leading-snug mb-2">How has your body<br />been feeling?</h2>
      <p className="text-text-muted text-sm mb-7">Physical signals matter too.</p>
      <div className="space-y-2.5">
        {PHYSICAL_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => { setData({ ...data, physical: opt }); onNext() }}
            className={`w-full flex items-center gap-3.5 px-4 py-4 rounded-2xl border text-left transition-all min-h-[56px] ${
              data.physical === opt
                ? "border-purple-core bg-purple-core/10 text-lavender-soft"
                : "border-border-p text-text-secondary hover:border-border-s hover:text-warm-white"
            }`}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${data.physical === opt ? "bg-purple-core" : "bg-border-s"}`} />
            <span className="font-medium">{opt}</span>
          </button>
        ))}
      </div>
    </Shell>
  )
}

// ── Stress Driver Discovery ────────────────────────────────────────────────────

const DRIVER_OPTIONS = [
  "Workload", "Manager / Leadership", "Workplace relationships",
  "Performance pressure", "Career uncertainty", "Job security",
  "Personal / Family", "Financial concerns", "Sleep / Energy",
  "Physical wellbeing", "Other", "Cannot identify",
]

function DriverScreen({ onNext, onBack, data, setData }: { onNext: () => void; onBack: () => void; data: CheckInData; setData: (d: CheckInData) => void }) {
  return (
    <Shell>
      <BackBtn onBack={onBack} />
      <div className="mb-7">
        <p className="text-[10px] text-text-muted mb-2">Stress driver discovery</p>
        <h2 className="text-[22px] font-semibold text-warm-white leading-snug mb-2">{"What's contributing"}<br />to this?</h2>
        <p className="text-text-muted text-sm">You can select more than one. This helps Cortiquant understand context, not just severity.</p>
      </div>
      <div className="space-y-2 mb-6">
        {DRIVER_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => { setData({ ...data, driver: opt }); onNext() }}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border text-left transition-all text-sm font-medium ${
              data.driver === opt
                ? "border-purple-core bg-purple-core/10 text-lavender-soft"
                : "border-border-p text-text-secondary hover:border-border-s hover:text-warm-white"
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${data.driver === opt ? "bg-purple-core" : "bg-border-s"}`} />
            {opt}
          </button>
        ))}
      </div>
      <button onClick={onNext} className="w-full btn-ghost py-3 rounded-2xl text-sm font-medium">
        Skip this step
      </button>
    </Shell>
  )
}

function ResultScreen({ onNav, data }: { onNav: (s: Screen) => void; data: CheckInData }) {
  const feeling = data.feeling || "Stressed"
  const isElevated = ["A little tense", "Stressed", "Overwhelmed"].includes(feeling)
  const [msi, setMsi] = useState<number>(isElevated ? 67 : 44)
  const [category, setCategory] = useState<string>(msi >= 65 ? "High Stress" : msi >= 45 ? "Moderate" : "Within range")

  useEffect(() => {
    // Send check-in data to backend assessments API
    const token = localStorage.getItem("cq_token")
    if (token) {
      fetch("/api/assessments/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          feeling: data.feeling,
          stressor: data.stressor,
          physical: data.physical,
          driver: data.driver,
        }),
      })
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setMsi(json.data.msi)
            setCategory(json.data.category)
            localStorage.setItem("cq_last_msi", String(json.data.msi))
          }
        })
        .catch((err) => {
          console.warn("[CHECK-IN] Checkin save error:", err)
        })
    }
  }, [data])

  const categoryColor = msi >= 65 ? "text-c-warning" : msi >= 45 ? "text-lavender-soft" : "text-c-success"

  return (
    <Shell>
      <div className="text-center mb-6 animate-fade-up">
        <div className="w-14 h-14 rounded-2xl bg-purple-core/15 border border-purple-core/25 flex items-center justify-center mx-auto mb-4 text-2xl">
          ✓
        </div>
        <p className="text-lavender-soft font-semibold text-sm">Thanks for checking in.</p>
      </div>

      {/* MSI display */}
      <div className="card-base p-6 mb-4 text-center animate-fade-up" style={{ animationDelay: "50ms" }}>
        <p className="text-[10px] text-text-muted mb-3">Your stress snapshot</p>
        <p className="font-mono-data text-7xl font-semibold text-warm-white leading-none mb-2">{msi}</p>
        <p className={`text-lg font-bold ${categoryColor} mb-1`}>{category}</p>
        <p className="text-sm text-text-muted">↑ {msi - 43} points from your baseline of 43</p>
      </div>

      {/* Stress drivers */}
      <div className="card-base p-5 mb-4 animate-fade-up" style={{ animationDelay: "90ms" }}>
        <p className="text-[10px] text-text-muted mb-4">What may be adding to this</p>
        <div className="space-y-3.5">
          <DriverBar label="Mental Load" value={74} />
          <DriverBar label="Recovery" value={52} />
          <DriverBar label="Physical" value={45} />
        </div>
        {data.driver && (
          <div className="mt-4 pt-4 border-t border-border-p">
            <p className="text-xs text-text-muted">
              <span className="font-medium text-text-secondary">Reported driver · </span>
              {data.driver}
            </p>
          </div>
        )}
      </div>

      {/* Cortiquant insight */}
      {isElevated && (
        <div className="card-base p-4 mb-5 border-purple-core/20 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-purple-core/20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-core" />
            </div>
            <span className="text-xs font-semibold text-lavender-soft">Cortiquant insight</span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            Your recent responses suggest increasing mental load. This looks like more than a one-day spike.
          </p>
        </div>
      )}

      {/* Single recommended action */}
      <div className="animate-fade-up" style={{ animationDelay: "150ms" }}>
        <p className="text-[10px] text-text-muted mb-3">Recommended next step</p>
        <button
          onClick={() => onNav("recommended")}
          className="w-full btn-primary py-4 px-5 rounded-2xl text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-warm-white/50 font-medium mb-0.5">Based on your responses</p>
              <p className="text-base font-semibold text-warm-white">Start a 5-Minute Mental Reset</p>
            </div>
            <svg className="w-5 h-5 text-warm-white/60 flex-shrink-0" fill="none" viewBox="0 0 20 20"><path d="M8 5l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </button>

        <div className="flex gap-2 mt-3">
          <button onClick={() => onNav("dump-bag")} className="flex-1 btn-ghost py-3 rounded-2xl text-sm font-medium">Digital Dump Bag</button>
          <button onClick={() => onNav("my-stress")} className="flex-1 btn-ghost py-3 rounded-2xl text-sm font-medium">Find out why</button>
        </div>
      </div>
    </Shell>
  )
}

// ── Recommended action ─────────────────────────────────────────────────────────

function RecommendedScreen({ onNav }: { onNav: (s: Screen) => void }) {
  return (
    <Shell>
      <BackBtn onBack={() => onNav("result")} />
      <div className="mb-6">
        <p className="text-[10px] text-text-muted mb-2">Personalised recovery</p>
        <h2 className="text-[22px] font-semibold text-warm-white leading-snug mb-2">5-Minute Mental Reset</h2>
        <p className="text-text-muted text-sm">A quick breathing and grounding exercise matched to your current stress signal.</p>
      </div>

      <div className="card-base p-5 mb-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          {[["3 min", "Duration"], ["Breathing", "Type"], ["Mental", "Focus"]].map(([val, lbl]) => (
            <div key={lbl} className="card-elevated rounded-xl p-3">
              <p className="font-semibold text-warm-white text-sm">{val}</p>
              <p className="text-xs text-text-muted mt-0.5">{lbl}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-text-secondary leading-relaxed mt-4">
          Research suggests short structured breathing exercises can reduce acute stress signals within minutes. This is matched to your elevated mental load pattern.
        </p>
      </div>

      <button onClick={() => onNav("reset-active")} className="w-full btn-primary py-4 rounded-2xl text-base font-semibold mb-3">
        Start reset →
      </button>
      <button onClick={() => onNav("reset-list")} className="w-full btn-ghost py-3 rounded-2xl text-sm font-medium">
        See all reset options
      </button>
    </Shell>
  )
}

// ── Digital Dump Bag ───────────────────────────────────────────────────────────

interface DumpBagReflection {
  validation: string
  pattern: {
    title: string
    content: string
  }
  differentAngle: {
    title: string
    content: string
  }
  nextStep: {
    title: string
    content: string
  }
}

function DumpBagScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const [text, setText] = useState(() => localStorage.getItem("cq_pending_dump_text") ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError(null)
    localStorage.setItem("cq_pending_dump_text", trimmed)

    try {
      const token = localStorage.getItem("cq_token")
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const res = await fetch("/api/dumpbag/reflection", {
        method: "POST",
        headers,
        body: JSON.stringify({ text: trimmed }),
      })

      if (!res.ok) {
        let msg = "We couldn't reflect on this right now. Your words are still here — try again in a moment."
        try {
          const errData = await res.json()
          if (errData?.message && res.status !== 500) {
            msg = errData.message
          }
        } catch {
          // fallback msg
        }
        throw new Error(msg)
      }

      const data = await res.json()
      if (data?.success && data?.reflection) {
        localStorage.setItem("cq_dump_reflection", JSON.stringify(data.reflection))

        // Record anonymous intervention usage in MongoDB (text is private and NOT saved in session)
        if (token) {
          fetch("/api/interventions/record", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              interventionName: "Digital Dump Bag",
              type: "DUMP_BAG",
              category: "Dump Bag",
              duration: 180,
              postFeeling: "Better",
              status: "Completed",
            }),
          }).catch((e) => console.warn("[INTERVENTION-RECORD] Failed to record dump bag usage:", e.message))
        }

        onNav("dump-response")
      } else {
        throw new Error("Invalid response format received.")
      }
    } catch (err: any) {
      setError(err?.message || "We couldn't reflect on this right now. Your words are still here — try again in a moment.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell>
      <BackBtn onBack={() => onNav("home")} />
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[10px] text-text-muted">🗑️ Digital dump bag</p>
          <span className="bg-c-success/10 border border-c-success/20 text-c-success text-[10px] font-medium px-2 py-0.5 rounded-full">Private to you</span>
        </div>
        <h2 className="text-[22px] font-semibold text-warm-white leading-snug mb-2">Drop it here.</h2>
        <p className="text-text-muted text-sm">Don't carry it alone.</p>
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (error) setError(null)
        }}
        disabled={loading}
        placeholder="What's on your mind?"
        className="w-full bg-surface border border-border-p rounded-2xl p-4 text-text-secondary placeholder-text-muted/60 text-sm leading-relaxed resize-none focus:outline-none focus:border-border-s transition-colors mb-3 disabled:opacity-60"
        rows={7}
      />

      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-text-muted">Not shared with your organization.</p>
        <span className="text-xs text-text-muted font-mono-data">{text.length}</span>
      </div>

      {error && (
        <div className="bg-c-error/10 border border-c-error/30 rounded-xl p-3 mb-4 animate-fade-up">
          <p className="text-xs text-c-error leading-relaxed">{error}</p>
        </div>
      )}

      {loading && (
        <div className="card-base p-3.5 mb-4 flex items-center gap-3 animate-pulse border-purple-core/30 bg-purple-core/5">
          <div className="w-5 h-5 border-2 border-purple-core border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-xs text-purple-core font-medium">Taking a moment to understand this...</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!text.trim() || loading}
        className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
          text.trim() && !loading
            ? "btn-primary"
            : "bg-surface border border-border-p text-text-muted cursor-not-allowed"
        }`}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-warm-white/40 border-t-warm-white rounded-full animate-spin" />
            <span>Thinking this through...</span>
          </>
        ) : text.trim() ? (
          "See what Cortiquant notices →"
        ) : (
          "Write something first"
        )}
      </button>
    </Shell>
  )
}

// ── Dump Bag Response — 4-step framework ──────────────────────────────────────
// 1. Validate  2. Thinking Pattern  3. Perspective Shift  4. One Small Action

function DumpResponseScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const [savedToJournal, setSavedToJournal] = useState(false)
  const pendingText = localStorage.getItem("cq_pending_dump_text") ?? ""

  // Retrieve dynamic AI reflection or fallback gracefully
  const reflection: DumpBagReflection | null = (() => {
    try {
      const raw = localStorage.getItem("cq_dump_reflection")
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })()

  function saveToJournal() {
    if (!pendingText) return
    const entries = JSON.parse(localStorage.getItem("cq_journal_entries") ?? "[]")
    entries.unshift({
      id: Date.now().toString(),
      content: pendingText,
      emotion: "Stressed",
      tags: ["#stress"],
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem("cq_journal_entries", JSON.stringify(entries))
    localStorage.removeItem("cq_pending_dump_text")
    setSavedToJournal(true)
  }

  const steps = [
    {
      step: "01",
      label: "Validation",
      icon: "🤝",
      color: "border-lavender-soft/25 bg-lavender-soft/5",
      iconBg: "bg-lavender-soft/10",
      title: null,
      content:
        reflection?.validation ||
        "That sounds like a genuine amount of pressure to carry at once. What you're feeling makes complete sense given what you've described.",
    },
    {
      step: "02",
      label: reflection?.pattern?.title || "One pattern worth noticing",
      icon: "🔍",
      color: "border-purple-core/20 bg-purple-core/5",
      iconBg: "bg-purple-core/10",
      title: reflection?.pattern?.title || null,
      content:
        reflection?.pattern?.content ||
        "It sounds like there may be some all-or-nothing thinking here — a sense that if you can't manage everything perfectly, something has gone wrong. That pattern tends to increase stress rather than reduce it.",
    },
    {
      step: "03",
      label: reflection?.differentAngle?.title || "A different angle",
      icon: "🔄",
      color: "border-c-info/20 bg-c-info/5",
      iconBg: "bg-c-info/10",
      title: reflection?.differentAngle?.title || null,
      content:
        reflection?.differentAngle?.content ||
        "Three deadlines and a shifting brief is genuinely a lot. That pressure is real. But completing one thing well is more useful than attempting all three poorly — and your manager changing requirements is outside your control.",
    },
    {
      step: "04",
      label: reflection?.nextStep?.title || "Next small step",
      icon: "⚡",
      color: "border-c-success/20 bg-c-success/5",
      iconBg: "bg-c-success/10",
      title: reflection?.nextStep?.title || null,
      content:
        reflection?.nextStep?.content ||
        "Write down the one task that, if completed today, would make tomorrow feel more manageable. Just one. Then do that first.",
    },
  ]

  return (
    <Shell>
      <BackBtn onBack={() => onNav("dump-bag")} />
      <div className="mb-6 animate-fade-up">
        <p className="text-[10px] text-text-muted mb-2">Dump bag · response</p>
        <h2 className="text-[22px] font-semibold text-warm-white leading-snug">{"Here's what Cortiquant noticed."}</h2>
      </div>

      <div className="space-y-3 mb-6">
        {steps.map((s, i) => (
          <div
            key={s.step}
            className={`rounded-2xl border p-4 animate-fade-up ${s.color}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className={`w-7 h-7 rounded-lg ${s.iconBg} flex items-center justify-center text-base`}>
                {s.icon}
              </div>
              <div>
                <p className="text-[10px] font-mono-data text-text-muted">Step {s.step}</p>
                <p className="text-xs font-semibold text-text-secondary">{s.label}</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{s.content}</p>
          </div>
        ))}
      </div>

      {/* Save to Journal offer */}
      <div className="card-base p-4 mb-4">
        <p className="text-[10px] text-text-muted mb-2">Want to keep this?</p>
        {savedToJournal ? (
          <p className="text-sm text-c-success font-medium">Saved to your journal ✓</p>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={saveToJournal}
              className="flex-1 btn-ghost py-2.5 text-sm font-medium rounded-xl"
            >
              Save to Journal
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("cq_pending_dump_text")
                localStorage.removeItem("cq_dump_reflection")
              }}
              className="flex-1 btn-ghost py-2.5 text-sm font-medium rounded-xl text-text-muted"
            >
              Done
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <button onClick={() => onNav("reset-list")} className="w-full btn-primary py-3.5 rounded-2xl text-sm font-semibold">
          Take a quick reset →
        </button>
        <button onClick={() => onNav("support")} className="w-full btn-ghost py-3.5 rounded-2xl text-sm font-medium">
          Talk to someone
        </button>
      </div>
    </Shell>
  )
}

// ── Reset — organized by emotional need ───────────────────────────────────────
// Categories: Overwhelmed / Frustrated / Drained / Can't Switch Off

const RESET_CATEGORIES = [
  {
    id: "overwhelmed",
    label: "Overwhelmed",
    emoji: "🌊",
    desc: "Too much at once",
    color: "from-purple-primary/30",
    activities: [
      { name: "Priority Reset", dur: "5–10 min", desc: "Clear the mental clutter. Get everything out, then find what needs attention first.", screen: "priority-reset" },
      { name: "Breathing Reset", dur: "3 min", desc: "Slow down and reset. A guided breathing pause for your nervous system.", screen: "breathing-reset" },
      { name: "Journal", dur: "Whenever you need", desc: "Put it into words. A private space for everything on your mind.", screen: "journal" },
    ],
  },
  {
    id: "frustrated",
    label: "Frustrated",
    emoji: "🔥",
    desc: "Tense or irritated",
    color: "from-c-warning/20",
    activities: [
      { name: "Music Reset", dur: "10 min", desc: "Curated sound to shift your state. Give yourself a few minutes away from the noise.", screen: "music-reset" },
      { name: "Movement Reset", dur: "5 min", desc: "Step away from the screen. Short movements to release physical tension.", screen: "movement-reset" },
      { name: "Digital Dump Bag", dur: "2–10 min", desc: "Get what's on your mind out. No structure needed — just dump it.", screen: "dump-bag" },
    ],
  },
  {
    id: "drained",
    label: "Drained",
    emoji: "🪫",
    desc: "Low energy or depleted",
    color: "from-c-info/20",
    activities: [
      { name: "Energy Reset", dur: "5 min", desc: "Give yourself five quiet minutes to recharge. No effort required.", screen: "energy-reset" },
      { name: "Relaxation", dur: "15 min", desc: "Slow everything down. A guided journey to help you let go.", screen: "relaxation" },
      { name: "Sleep Wind-down", dur: "20 min", desc: "Let the day become quieter. A gentle pre-rest routine.", screen: "sleep-winddown" },
    ],
  },
]

function ResetListScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <Shell>
      <div className="mb-6 animate-fade-up">
        <p className="text-[10px] text-text-muted mb-2">Reset</p>
        <h2 className="text-[22px] font-semibold text-warm-white leading-snug mb-2">How are you feeling?</h2>
        <p className="text-text-muted text-sm">Choose what fits best. We'll match the right activity.</p>
      </div>

      {selected === null ? (
        <div className="space-y-3">
          {RESET_CATEGORIES.map((cat, i) => (
            <button
              key={cat.id}
              onClick={() => setSelected(cat.id)}
              className={`w-full card-base overflow-hidden text-left hover:border-border-s transition-all animate-fade-up`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={`h-12 bg-gradient-to-r ${cat.color} to-surface flex items-center px-5 gap-3`}>
                <span className="text-xl">{cat.emoji}</span>
                <div>
                  <p className="font-semibold text-warm-white text-sm">{cat.label}</p>
                  <p className="text-xs text-text-muted">{cat.desc}</p>
                </div>
              </div>
              <div className="px-5 py-3 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {cat.activities.map((a) => (
                    <span key={a.name} className="text-[10px] text-text-muted border border-border-p rounded-full px-2 py-0.5">{a.dur}</span>
                  ))}
                </div>
                <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </button>
          ))}

          <button
            onClick={() => onNav("reset-labs")}
            className="w-full card-base p-4 flex items-center gap-3 text-left hover:border-border-s transition-colors animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            <div className="w-9 h-9 rounded-xl bg-purple-core/10 border border-purple-core/20 flex items-center justify-center text-base flex-shrink-0">🔬</div>
            <div>
              <p className="text-sm font-semibold text-warm-white">Reset Labs</p>
              <p className="text-xs text-text-muted">Group recovery sessions · Upcoming events</p>
            </div>
            <svg className="w-4 h-4 text-text-muted ml-auto" fill="none" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      ) : (
        <div className="animate-fade-up">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors mb-5 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            All categories
          </button>
          {(() => {
            const cat = RESET_CATEGORIES.find((c) => c.id === selected)!
            return (
              <>
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-2xl">{cat.emoji}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-warm-white">{cat.label}</h3>
                    <p className="text-xs text-text-muted">{cat.desc}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {cat.activities.map((a) => {
                    const target = (a as { screen?: string }).screen ?? "reset-active"
                    const cta = target === "journal" ? "Write →" : target === "dump-bag" ? "Open →" : "Start →"
                    return (
                      <button
                        key={a.name}
                        onClick={() => onNav(target as Screen)}
                        className="w-full card-base p-5 text-left hover:border-border-s transition-all"
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <p className="font-semibold text-warm-white">{a.name}</p>
                          <span className="font-mono-data text-xs text-text-muted border border-border-p rounded-full px-2 py-0.5 ml-3">{a.dur}</span>
                        </div>
                        <p className="text-sm text-text-muted mb-3">{a.desc}</p>
                        <span className="text-sm font-semibold text-purple-core">{cta}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>
      )}
    </Shell>
  )
}

// ── Active Reset (breathing) ───────────────────────────────────────────────────

function ActiveResetScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in")
  const [secs, setSecs] = useState(4)
  const [done, setDone] = useState(false)
  const [cycles, setCycles] = useState(0)
  const phaseDurs = { in: 4, hold: 4, out: 6 }
  const phaseNext = { in: "hold" as const, hold: "out" as const, out: "in" as const }
  const phaseLabels = { in: "Breathe in.", hold: "Hold.", out: "Slowly release." }
  const phaseSubs = { in: "Through your nose", hold: "Gently", out: "Through your mouth" }

  useEffect(() => {
    if (done) return
    const t = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          const np = phaseNext[phase]
          setPhase(np)
          if (np === "in") setCycles((c) => { if (c >= 2) { setDone(true); return c } return c + 1 })
          return phaseDurs[np]
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase, done])

  if (done) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center bg-midnight animate-fade-in pb-8">
        <h2 className="font-display text-3xl text-warm-white mb-2">Take a second.</h2>
        <p className="text-text-muted text-sm mb-8">How do you feel now?</p>
        <div className="space-y-2.5 w-full max-w-xs mb-6">
          {["Much better", "A little better", "About the same", "Not really"].map((opt) => (
            <button
              key={opt}
              onClick={() => {
                const token = localStorage.getItem("cq_token")
                if (token) {
                  fetch("/api/interventions/record", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      interventionName: "Breathing Reset",
                      type: "RESET_LAB",
                      category: "Breathing",
                      duration: cycles * 14,
                      postFeeling: opt,
                      status: "Completed",
                    }),
                  }).catch((e) => console.warn("[INTERVENTION-RECORD] Failed to record breathing reset:", e.message))
                }
                onNav("reset-list")
              }}
              className="w-full border border-border-p rounded-2xl py-3.5 text-sm text-text-secondary font-medium hover:border-border-s hover:text-warm-white transition-all"
            >
              {opt}
            </button>
          ))}
        </div>
        <button onClick={() => onNav("reset-list")} className="text-xs text-text-muted hover:text-text-secondary transition-colors">Skip</button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center bg-midnight relative">
      <button onClick={() => onNav("reset-list")} className="absolute top-6 right-5 text-xs text-text-muted hover:text-text-secondary transition-colors font-medium">Exit</button>
      <div className="relative flex items-center justify-center mb-14">
        <div className={`absolute w-52 h-52 rounded-full bg-purple-core/6 transition-all duration-[1200ms] ${phase === "out" ? "scale-150" : phase === "hold" ? "scale-110" : "scale-100"} animate-breathe-ring`} />
        <div className={`absolute w-36 h-36 rounded-full bg-purple-core/10 transition-all duration-[1200ms] ${phase === "out" ? "scale-125" : "scale-100"} animate-breathe`} />
        <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-core to-lavender-bright flex items-center justify-center transition-all duration-[1200ms] ${phase === "out" ? "scale-90" : phase === "hold" ? "scale-105" : "scale-100"}`}>
          <span className="font-mono-data text-2xl text-warm-white font-bold">{secs}</span>
        </div>
      </div>
      <h2 className="font-display text-3xl text-warm-white mb-1">{phaseLabels[phase]}</h2>
      <p className="text-text-muted text-sm mb-8">{phaseSubs[phase]}</p>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < cycles ? "bg-purple-core" : "bg-border-p"}`} />)}
      </div>
    </div>
  )
}

// ── My Stress ──────────────────────────────────────────────────────────────────

function MyStressScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const [period, setPeriod] = useState<"7D" | "30D" | "90D">("7D")
  const [historyData, setHistoryData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback((rangeStr: string) => {
    const token = localStorage.getItem("cq_token")
    if (!token) return

    setLoading(true)
    setError(null)
    const rangeParam = rangeStr.toLowerCase()
    fetch(`/api/assessments/history?range=${rangeParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setHistoryData(data)
          if (data.currentMsi != null) {
            localStorage.setItem("cq_current_msi", String(data.currentMsi))
          }
        } else {
          setError(data.message || "Unable to load your stress history. Please try again.")
        }
      })
      .catch(() => {
        setError("Unable to load your stress history. Please try again.")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchHistory(period)
  }, [period, fetchHistory])

  // Process data from backend
  const baseline = historyData?.baselineMsi ?? (localStorage.getItem("cq_baseline_msi") ? parseInt(localStorage.getItem("cq_baseline_msi")!, 10) : null)
  const currentMsi = historyData?.currentMsi ?? (localStorage.getItem("cq_current_msi") ? parseInt(localStorage.getItem("cq_current_msi")!, 10) : null)
  const usualRange = historyData?.usualRange || "Not enough data"
  const observations: string[] = historyData?.observations || [
    "Complete a few more check-ins to build a clearer picture of your stress patterns.",
  ]

  const assessments: Array<{ date: string; msi: number; timestamp?: string }> = historyData?.assessments || []

  // Format Chart Data based on selected period
  const numDays = period === "7D" ? 7 : period === "30D" ? 30 : 90
  const chartPoints: Array<{ label: string; msi: number | null; dateStr: string }> = []

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dIso = d.toISOString().split("T")[0]
    const matched = assessments.find((a) => a.date === dIso)

    let label = ""
    if (period === "7D") {
      label = d.toLocaleDateString("en-US", { weekday: "short" })
    } else if (period === "30D") {
      // Label every 5th or 6th day or first/last
      label = i % 5 === 0 || i === numDays - 1 ? d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }) : ""
    } else {
      // 90D: label every ~15 days
      label = i % 15 === 0 || i === numDays - 1 ? d.toLocaleDateString("en-US", { month: "short" }) : ""
    }

    chartPoints.push({
      label,
      msi: matched ? matched.msi : null,
      dateStr: dIso,
    })
  }

  // Check if current MSI is elevated (>40)
  const isElevated = currentMsi != null && currentMsi > 40
  const currentBand = currentMsi != null ? getBand(currentMsi) : null

  function handleMeaningClick() {
    if (isElevated) {
      // Open root-cause discovery flow
      onNav("stress-cause")
    } else {
      // Open MSI Meaning detailed explanation
      onNav("msi-meaning")
    }
  }

  return (
    <Shell>
      <BackBtn onBack={() => onNav("home")} />
      <div className="mb-6">
        <p className="text-[10px] text-text-muted mb-2">My stress</p>
        <h2 className="text-[22px] font-semibold text-warm-white leading-snug">Is my stress changing?</h2>
      </div>

      {/* MSI over time chart card */}
      <div className="card-base p-5 mb-4">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[10px] text-text-muted">MSI over time</p>
          <div className="flex gap-1">
            {(["7D", "30D", "90D"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPeriod(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  period === t ? "bg-purple-core text-warm-white shadow-sm" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading && !historyData ? (
          <div className="h-32 flex flex-col items-center justify-center text-xs text-text-muted animate-pulse">
            <span className="mb-1">Loading your stress history…</span>
          </div>
        ) : error ? (
          <div className="h-32 flex flex-col items-center justify-center text-xs text-rose-400">
            <span>{error}</span>
          </div>
        ) : assessments.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-xs text-text-muted text-center px-4">
            <span className="font-medium text-warm-white mb-1">No completed check-ins in this period.</span>
            <span>Check in daily to build your personalized stress graph.</span>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-1.5 h-28 mb-3">
              {chartPoints.map((pt, i) => {
                const hasValue = pt.msi !== null
                const v = pt.msi ?? 0
                const isPtElevated = v > 40

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div className="w-full relative" style={{ height: "80px" }}>
                      {hasValue ? (
                        <div
                          title={`${pt.dateStr}: ${v}% MSI`}
                          className={`w-full absolute bottom-0 rounded-t transition-all ${
                            isPtElevated ? "bg-c-warning/80" : "bg-purple-core/60"
                          }`}
                          style={{ height: `${Math.max(6, (v / 100) * 80)}px` }}
                        />
                      ) : (
                        <div
                          className="w-full absolute bottom-0 bg-white/5 rounded-t"
                          style={{ height: "2px" }}
                        />
                      )}

                      {/* Baseline horizontal dashed line */}
                      {baseline != null && (
                        <div
                          className="absolute inset-x-0 border-t border-dashed border-lavender-soft/30 pointer-events-none"
                          style={{ bottom: `${(baseline / 100) * 80}px` }}
                        />
                      )}
                    </div>
                    <span className="text-[8px] text-text-muted truncate w-full text-center">
                      {pt.label}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted pt-2 border-t border-purple-core/10">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded bg-purple-core/60" />
                <span>MSI</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-px border-t border-dashed border-lavender-soft/60" />
                <span>{baseline != null ? `Baseline (${baseline})` : "Baseline —"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded bg-c-warning/80" />
                <span>Elevated (&gt;40)</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Metrics Row: Usual Range & Current MSI */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card-elevated p-4 rounded-xl">
          <p className="text-xs text-text-muted mb-1">Usual range</p>
          <p className="font-mono-data text-xl font-bold text-text-secondary">
            {usualRange}
          </p>
        </div>
        <div className="card-elevated p-4 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-text-muted">Current MSI</p>
            {isElevated && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-c-warning/20 text-c-warning uppercase">
                Elevated
              </span>
            )}
          </div>
          <p className={`font-mono-data text-xl font-bold ${isElevated ? "text-c-warning" : "text-emerald-400"}`}>
            {currentMsi != null ? currentMsi : "—"}
          </p>
        </div>
      </div>

      {/* What we've noticed observations */}
      <div className="card-base p-5 mb-4">
        <p className="text-[10px] text-text-muted mb-3">What we've noticed</p>
        <div className="space-y-3">
          {observations.map((obs, i) => (
            <div key={i} className="flex gap-3 text-sm text-text-secondary">
              <div className="w-1.5 h-1.5 rounded-full bg-lavender-soft mt-1.5 flex-shrink-0" />
              <p className="leading-relaxed text-xs">{obs}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What does this mean? button */}
      <button
        onClick={handleMeaningClick}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-border-p bg-elevated hover:border-purple-core hover:bg-purple-core/5 transition-all text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-purple-core/10 border border-purple-core/25 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-purple-core" fill="none" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 5v.5M8 7.5v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary">
              {isElevated ? "What's been driving this? →" : "What does this mean?"}
            </p>
            <p className="text-xs text-text-muted">
              {isElevated
                ? "Let's find out what may be causing your elevated MSI"
                : currentBand
                ? `Detailed analysis of your ${currentBand.label} MSI`
                : "Learn how your Mind Stress Index is calculated"}
            </p>
          </div>
        </div>
        <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 16 16">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </Shell>
  )
}

// ── Support ────────────────────────────────────────────────────────────────────

function SupportScreen({ onNav }: { onNav: (s: Screen) => void }) {
  return (
    <Shell>
      <div className="mb-7">
        <p className="text-[10px] text-text-muted mb-2">Support</p>
        <h2 className="text-[22px] font-semibold text-warm-white leading-snug mb-2">{"You're not expected to handle everything alone."}</h2>
        <p className="text-sm text-text-muted leading-relaxed">Whenever you need it, there are people ready to help.</p>
      </div>
      <div className="space-y-3 mb-6">
        {[
          { type: "Human Listener", desc: "Talk with a trained listener. Confidential and judgment-free.", icon: "🤝", gradient: "from-purple-primary/20", nav: "listener-connect" as Screen },
          { type: "Professional Support", desc: "Find appropriate professional support through your EAP.", icon: "🧑‍⚕️", gradient: "from-c-info/15", nav: "professional-support" as Screen },
          { type: "Emergency Support", desc: "In immediate distress, please contact emergency services.", icon: "🆘", gradient: "from-c-critical/15", nav: "emergency-support" as Screen },
        ].map((s) => (
          <div key={s.type} className="card-base overflow-hidden">
            <div className={`h-10 bg-gradient-to-r ${s.gradient} to-surface`} />
            <div className="px-5 py-4">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-xl">{s.icon}</span>
                <p className="font-semibold text-warm-white">{s.type}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNav(s.nav)}
                  className="btn-ghost text-sm px-4 py-2 cursor-pointer"
                >
                  Connect
                </button>
                {s.type === "Human Listener" && (
                  <button
                    onClick={() => onNav("my-sessions")}
                    className="text-xs text-lavender-soft hover:text-lavender-bright transition-colors font-medium cursor-pointer"
                  >
                    View My Sessions →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card-elevated border border-border-p rounded-2xl p-4">
        <p className="text-[10px] text-text-muted mb-2">Not a clinical service</p>
        <p className="text-xs text-text-muted leading-relaxed">Cortiquant is a wellbeing support tool. If you are in immediate danger, contact emergency services in your country.</p>
      </div>
    </Shell>
  )
}

// ── Professional Support directory ────────────────────────────────────────────

const PROFESSIONALS = [
  {
    initials: "AK",
    name: "Dr. Ananya Krishnan",
    type: "psychologist" as const,
    typeLabel: "Psychologist",
    specialization: "Stress & Workplace Wellbeing",
    desc: "Helps with workplace stress, emotional overwhelm, and building healthier coping routines.",
    availability: "Available today",
    availableNow: true,
    duration: "45 min",
    sessionType: "Online",
  },
  {
    initials: "RM",
    name: "Rajan Mehta",
    type: "counsellor" as const,
    typeLabel: "Counsellor",
    specialization: "Workplace & Emotional Wellbeing",
    desc: "Support for work pressure, burnout-related concerns, and difficult personal situations.",
    availability: "Available tomorrow",
    availableNow: false,
    duration: "30 min",
    sessionType: "Online",
  },
  {
    initials: "PN",
    name: "Dr. Priya Nair",
    type: "mental-health" as const,
    typeLabel: "Mental Health Professional",
    specialization: "Anxiety & Burnout Recovery",
    desc: "Specialises in anxiety management and recovery from chronic workplace stress and burnout.",
    availability: "Available today",
    availableNow: true,
    duration: "60 min",
    sessionType: "Online",
  },
]

function ProfessionalSupportScreen({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState<"all" | "psychologist" | "counsellor" | "mental-health">("all")
  const visible = filter === "all" ? PROFESSIONALS : PROFESSIONALS.filter((p) => p.type === filter)

  return (
    <Shell>
      <BackBtn onBack={onBack} />

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base leading-none">👩‍⚕️</span>
          <p className="text-[10px] text-text-muted">Professional support</p>
        </div>
        <h2 className="text-[22px] font-semibold text-warm-white leading-snug mb-2">Connect with a professional.</h2>
        <p className="text-sm text-text-muted leading-relaxed">Qualified professionals when you feel you need more support.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-0.5">
        {[
          { id: "all", label: "All" },
          { id: "psychologist", label: "Psychologist" },
          { id: "counsellor", label: "Counsellor" },
          { id: "mental-health", label: "Mental health" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as typeof filter)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
              filter === f.id
                ? "bg-purple-core text-warm-white"
                : "bg-elevated border border-border-p text-text-muted hover:border-border-s"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Professional cards */}
      <div className="space-y-3 mb-5">
        {visible.map((p, i) => (
          <div
            key={p.name}
            className="rounded-3xl p-4 animate-fade-up"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-purple-core/15 border border-purple-core/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-lavender-soft">{p.initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-warm-white leading-snug">{p.name}</p>
                  <span className="text-[9px] font-medium text-text-muted border border-border-p rounded-full px-2 py-0.5 flex-shrink-0 leading-none mt-0.5">Sample</span>
                </div>
                <p className="text-xs text-text-muted mb-1.5">{p.typeLabel}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-core/10 text-lavender-soft border border-purple-core/15 leading-none">
                  {p.specialization}
                </span>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed mb-3">{p.desc}</p>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1 text-xs">
                <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 12 12">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6 3.5v2.5l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className={p.availableNow ? "text-c-success font-medium" : "text-text-muted"}>{p.availability}</span>
              </div>
              <div className="w-px h-3 bg-border-p" />
              <span className="text-xs text-text-muted">{p.duration} · {p.sessionType}</span>
            </div>

            <button className="btn-primary w-full py-2.5 text-xs font-semibold rounded-2xl">Connect</button>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-text-muted leading-relaxed text-center px-3 pb-2">
        Cortiquant is not an emergency service. If you are in immediate danger, contact emergency services directly.
      </p>
    </Shell>
  )
}

// ── Emergency & Government Support ───────────────────────────────────────────

function PhoneIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 16 16">
      <path d="M3 3.5c.5-.3 1.3-.3 1.8 0l1.5 2.5c.2.4.1.9-.2 1.2L5.4 8c.8 1.5 2 2.7 3.5 3.5l.8-.7c.3-.3.8-.4 1.2-.2l2.5 1.5c.5.3.7 1 .3 1.5L12.4 15c-.7.9-2.2.9-3.1.4C5.7 13.1 2.9 10.3 1.1 6.7.6 5.8.6 4.3 1.5 3.5L3 3.5Z" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function EmergencySupportScreen({ onBack }: { onBack: () => void }) {
  return (
    <Shell>
      <BackBtn onBack={onBack} />

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base leading-none">🆘</span>
          <p className="text-[10px] text-text-muted">Emergency & government support</p>
        </div>
        <h2 className="text-[22px] font-semibold text-warm-white leading-snug mb-2">Immediate help is available.</h2>
        <p className="text-sm text-text-muted leading-relaxed">If you feel unsafe or need immediate help, these services can connect you with support.</p>
      </div>

      {/* 112 */}
      <div className="rounded-3xl p-5 mb-4 animate-fade-up" style={{ background: "rgba(184,107,100,0.08)", border: "1px solid rgba(184,107,100,0.18)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,107,100,0.15)" }}>
            <span className="text-lg leading-none">🚨</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-warm-white">Emergency Services</p>
            <p className="text-xs text-text-muted">National Emergency Response</p>
          </div>
          <span className="font-mono-data text-2xl font-medium text-c-critical">112</span>
        </div>
        <p className="text-xs text-text-muted leading-relaxed mb-4">For immediate emergency assistance. Available 24/7 across India.</p>
        <a
          href="tel:112"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold transition-all"
          style={{ background: "rgba(184,107,100,0.15)", border: "1px solid rgba(184,107,100,0.28)", color: "#E99A9A" }}
        >
          <PhoneIcon />
          Call 112
        </a>
      </div>

      {/* Tele-MANAS */}
      <div className="rounded-3xl p-5 mb-5 animate-fade-up" style={{ background: "rgba(107,130,196,0.08)", border: "1px solid rgba(107,130,196,0.18)", animationDelay: "60ms" }}>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(107,130,196,0.15)" }}>
            <span className="text-lg leading-none">🧠</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold text-warm-white">Tele-MANAS</p>
              <span className="text-[9px] font-medium border border-border-s rounded-full px-2 py-0.5 text-text-muted leading-none">Govt. of India</span>
            </div>
            <p className="text-xs text-text-muted">24×7 Government Tele-Mental Health Support</p>
          </div>
        </div>
        <p className="text-xs text-text-muted leading-relaxed mb-4">Free tele-mental health support available across India. Multilingual and available around the clock.</p>
        <div className="space-y-2">
          <a
            href="tel:14416"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold transition-all"
            style={{ background: "rgba(107,130,196,0.15)", border: "1px solid rgba(107,130,196,0.28)", color: "#7FA8D8" }}
          >
            <PhoneIcon />
            Call 14416
          </a>
          <a
            href="tel:18008914416"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-medium text-text-secondary transition-all"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <PhoneIcon size={13} />
            Call 1800-89-14416 (toll-free)
          </a>
        </div>
      </div>

      <p className="text-[10px] text-text-muted leading-relaxed text-center px-3 pb-2">
        Cortiquant is not an emergency service. If you are in immediate danger, contact emergency services directly.
      </p>
    </Shell>
  )
}

// ── Listener Connect ──────────────────────────────────────────────────────────

// ── Listener Connect ──────────────────────────────────────────────────────────

interface AvailableListener {
  id: string
  listenerId: string
  name: string
  avatar: string
  initials: string
  role: string
  title: string | null
  desc: string
  status: string
  statusNow: boolean
  availabilityStatus: string
  sessionDuration: number
  tags: string[]
}

function ListenerConnectScreen({ onBack, onNav, onSelectListener }: { onBack: () => void; onNav: (s: Screen) => void; onSelectListener?: (l: AvailableListener) => void }) {
  const [listeners, setListeners] = useState<AvailableListener[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [disclaimerFor, setDisclaimerFor] = useState<AvailableListener | null>(null)

  const fetchListeners = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch("/api/listeners/available", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (res.ok && json.success && Array.isArray(json.listeners)) {
        setListeners(json.listeners)
      } else {
        setListeners([])
      }
    } catch {
      setError("No listeners are available right now. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListeners()
  }, [])

  return (
    <Shell>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 animate-fade-up">
        <button onClick={onBack} className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors text-sm font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNav("my-sessions")}
            className="text-[10px] font-semibold text-lavender-soft border border-purple-core/30 bg-purple-core/10 rounded-full px-3 py-1 hover:bg-purple-core/20 transition-colors"
          >
            My Sessions
          </button>
          <span className="text-[10px] font-medium text-text-muted border border-border-p rounded-full px-3 py-1">Human listeners</span>
        </div>
      </div>

      {/* Headline */}
      <div className="mb-5 animate-fade-up" style={{ animationDelay: "20ms" }}>
        <h2 className="text-2xl font-semibold text-warm-white leading-snug mb-1">Talk to someone<br />who understands</h2>
        <p className="text-sm text-text-muted">Trained volunteers · Anonymous · Text only</p>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-6 flex-wrap animate-fade-up" style={{ animationDelay: "40ms" }}>
        {[{ icon: "🔒", label: "Anonymous" }, { icon: "⏱", label: "10 min" }, { icon: "✓", label: "Trained" }, { icon: "💬", label: "Text chat" }].map((p) => (
          <span key={p.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-p bg-elevated text-xs text-text-secondary font-medium">
            <span className="text-sm leading-none">{p.icon}</span>{p.label}
          </span>
        ))}
      </div>

      {/* Listener cards list */}
      <div className="space-y-3 mb-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="card-base p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-surface" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-surface rounded w-1/3" />
                    <div className="h-3 bg-surface rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-surface rounded w-3/4 mb-3" />
                <div className="h-10 bg-surface rounded-2xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card-base p-6 text-center">
            <p className="text-sm text-c-critical mb-3">{error}</p>
            <button onClick={fetchListeners} className="btn-primary text-xs px-4 py-2 rounded-xl">Retry</button>
          </div>
        ) : listeners.length === 0 ? (
          <div className="card-base p-8 text-center">
            <p className="text-sm text-text-secondary font-medium mb-1">No listeners are available right now.</p>
            <p className="text-xs text-text-muted mb-4">Please try again later or access professional support.</p>
            <button onClick={() => onNav("support")} className="btn-ghost text-xs px-4 py-2 rounded-xl">View Support Directory</button>
          </div>
        ) : (
          listeners.map((l, i) => {
            const isBookable = l.availabilityStatus === "Available"
            return (
              <div key={l.id || l.listenerId} className="card-base p-5 animate-fade-up" style={{ animationDelay: `${60 + i * 50}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-purple-core/15 border border-purple-core/25 flex items-center justify-center">
                        <span className="text-sm font-bold text-lavender-soft">{l.initials || l.avatar}</span>
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-midnight ${isBookable ? "bg-c-success" : "bg-text-muted"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-warm-white">{l.name}</p>
                      <p className="text-xs text-text-muted">{l.role}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${isBookable ? "text-c-success" : "text-text-muted"}`}>
                    {isBookable ? "Available now" : "Currently unavailable"}
                  </span>
                </div>
                {l.title && <p className="text-xs text-lavender-soft italic mb-1.5">{l.title}</p>}
                <p className="text-xs text-text-muted mb-3 leading-relaxed">{l.desc}</p>
                <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                  {l.tags.map((tag) => (
                    <span key={tag} className="text-[10px] text-text-muted border border-border-p rounded-full px-2.5 py-1">{tag}</span>
                  ))}
                </div>
                {isBookable ? (
                  <button
                    onClick={() => {
                      setDisclaimerFor(l)
                      if (onSelectListener) onSelectListener(l)
                      localStorage.setItem("cq_selected_listener", JSON.stringify(l))
                    }}
                    className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm text-warm-white transition-colors"
                    style={{ backgroundColor: "#1A5C3A" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1F6B43" }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1A5C3A" }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    Schedule a 10-min session
                  </button>
                ) : (
                  <div className="w-full py-3 rounded-2xl text-center text-xs font-medium text-text-muted bg-surface border border-border-p">
                    Currently unavailable
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <button onClick={onBack} className="w-full text-center text-sm text-text-muted hover:text-text-secondary transition-colors py-2 animate-fade-up" style={{ animationDelay: "160ms" }}>
        Maybe later
      </button>

      {/* Disclaimer modal */}
      {disclaimerFor && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(8,10,20,0.80)", backdropFilter: "blur(4px)" }}>
          <div className="bg-surface rounded-t-3xl px-5 pt-6 pb-10 animate-fade-up">
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-purple-core/10 border border-purple-core/20 flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-lavender-soft" fill="none" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M12 8v4M12 15v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-warm-white text-center mb-1">Just before you connect</h3>
            <p className="text-xs text-text-muted text-center mb-5">Please read this before booking a session</p>

            <div className="space-y-3 mb-6">
              <div className="rounded-2xl bg-elevated border border-border-p p-4">
                <p className="text-xs font-semibold text-lavender-soft mb-1.5">This is not therapy</p>
                <p className="text-sm text-text-muted leading-relaxed">
                  These sessions are with trained peer listeners — not therapists or counsellors. They are here to listen and offer human support, not clinical advice or treatment.
                </p>
              </div>
              <div className="rounded-2xl bg-elevated border border-border-p p-4">
                <p className="text-xs font-semibold text-c-warning mb-1.5">If you are in danger</p>
                <p className="text-sm text-text-muted leading-relaxed">
                  If you are in immediate distress or danger, please contact your local emergency services or a crisis helpline right away. Do not rely on this service for emergencies.
                </p>
              </div>
              <div className="rounded-2xl bg-elevated border border-border-p p-4">
                <p className="text-xs font-semibold text-text-secondary mb-1.5">For serious concerns</p>
                <p className="text-sm text-text-muted leading-relaxed">
                  For ongoing mental health concerns, we encourage you to also speak with a qualified professional. You can access professional support through the EAP in the Support tab.
                </p>
              </div>
            </div>

            <button
              onClick={() => { setDisclaimerFor(null); onNav("listener-schedule") }}
              className="w-full py-4 rounded-2xl font-semibold text-sm text-warm-white mb-3 transition-colors cursor-pointer"
              style={{ backgroundColor: "#1A5C3A" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1F6B43" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1A5C3A" }}
            >
              I understand — continue to schedule
            </button>
            <button onClick={() => setDisclaimerFor(null)} className="w-full text-center text-sm text-text-muted hover:text-text-secondary transition-colors py-1 cursor-pointer">
              Maybe later
            </button>
          </div>
        </div>
      )}
    </Shell>
  )
}

function ListenerScheduleScreen({ onBack, onNav }: { onBack: () => void; onNav?: (s: Screen) => void }) {
  const [day, setDay] = useState<"today" | "tomorrow">("today")
  const [selected, setSelected] = useState<string | null>(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(true)
  const [bookingResult, setBookingResult] = useState<any | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [listenerInfo, setListenerInfo] = useState<{ id: string; name: string; initials: string }>({
    id: "",
    name: "Peer Listener",
    initials: "PL",
  })

  const [slotsData, setSlotsData] = useState<{
    morning: string[]
    afternoon: string[]
    evening: string[]
  }>({
    morning: [],
    afternoon: [],
    evening: [],
  })

  // Load selected listener
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cq_selected_listener")
      if (stored) {
        const parsed = JSON.parse(stored)
        setListenerInfo({
          id: parsed.id || parsed.listenerId,
          name: parsed.name || "Peer Listener",
          initials: parsed.initials || (parsed.name ? parsed.name.slice(0, 2) : "PL").toUpperCase(),
        })
      }
    } catch {}
  }, [])

  // Helper to parse time string into minutes
  const parseTimeToMinutes = (t: string) => {
    if (!t) return null
    const match = t.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
    if (!match) return null
    let hour = parseInt(match[1], 10)
    const min = parseInt(match[2], 10)
    const ampm = match[3] ? match[3].toUpperCase() : null
    if (ampm === "PM" && hour < 12) hour += 12
    if (ampm === "AM" && hour === 12) hour = 0
    return hour * 60 + min
  }

  // Helper to get current minutes in Asia/Kolkata
  const getKolkataMinutesNow = () => {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(new Date())
      const p: Record<string, string> = {}
      for (const part of parts) {
        p[part.type] = part.value
      }
      return parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10)
    } catch {
      const now = new Date()
      return now.getHours() * 60 + now.getMinutes()
    }
  }

  const isSlotPast = (timeStr: string) => {
    if (day !== "today") return false
    const slotMin = parseTimeToMinutes(timeStr)
    if (slotMin === null) return false
    return slotMin <= getKolkataMinutesNow()
  }

  // Fetch dynamic slots whenever listener or day changes
  const fetchSlots = async () => {
    if (!listenerInfo.id) return
    setSlotsLoading(true)
    setErrorMessage(null)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`/api/listeners/${listenerInfo.id}/slots?day=${day}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (res.ok && json.success && json.slots) {
        setSlotsData({
          morning: json.slots.morning || [],
          afternoon: json.slots.afternoon || [],
          evening: json.slots.evening || [],
        })
      } else {
        setErrorMessage(json.message || "No available slots for this day.")
      }
    } catch {
      setErrorMessage("Unable to fetch available time slots. Please try again.")
    } finally {
      setSlotsLoading(false)
    }
  }

  useEffect(() => {
    if (listenerInfo.id) {
      fetchSlots()
    }
  }, [listenerInfo.id, day])

  // Periodic refresh so expired slots disappear automatically in real time
  useEffect(() => {
    if (!listenerInfo.id) return
    const interval = setInterval(() => {
      fetchSlots()
    }, 30000)
    return () => clearInterval(interval)
  }, [listenerInfo.id, day])

  // Deselect if currently selected slot expires
  useEffect(() => {
    if (selected && isSlotPast(selected)) {
      setSelected(null)
    }
  }, [selected, day, slotsData])

  // Handle booking submission with 409 conflict detection & time validation
  const handleBookSession = async () => {
    if (!selected || bookingLoading || !listenerInfo.id) return

    // Pre-flight frontend validation: block past slots before API call
    if (isSlotPast(selected)) {
      setErrorMessage("Sorry, this slot is no longer available. Please choose another time.")
      setSelected(null)
      fetchSlots()
      return
    }

    setBookingLoading(true)
    setErrorMessage(null)

    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch("/api/listener-sessions/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listenerId: listenerInfo.id,
          startTime: selected,
          day,
          durationMinutes: 10,
        }),
      })

      const json = await res.json()

      if (res.status === 409) {
        setErrorMessage("This slot was just booked. Please choose another time.")
        setSelected(null)
        fetchSlots()
        return
      }

      if (!res.ok) {
        if (
          json.message?.toLowerCase().includes("passed") ||
          json.message?.toLowerCase().includes("expired") ||
          json.message?.toLowerCase().includes("unavailable")
        ) {
          setErrorMessage("Sorry, this slot is no longer available. Please choose another time.")
        } else {
          setErrorMessage(json.message || "Failed to book session. Please try another time.")
        }
        setSelected(null)
        fetchSlots()
        return
      }

      if (json.success && json.session) {
        setBookingResult(json.session)
        pushNotification({
          type: "listener_session",
          title: "Session scheduled",
          body: `With ${listenerInfo.name} · ${selected} · ${day === "today" ? "Today" : "Tomorrow"}`,
        })
      } else {
        setErrorMessage(json.message || "Failed to book session. Please try another time.")
      }
    } catch {
      setErrorMessage("Network error during booking. Please try again.")
    } finally {
      setBookingLoading(false)
    }
  }

  // Confirmation screen
  if (bookingResult) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center h-full text-center py-10 px-4 animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-c-success/15 border border-c-success/30 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-c-success" fill="none" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-warm-white mb-2">Session booked</h2>
          <p className="text-xs text-text-muted mb-6">Your peer support session has been confirmed.</p>

          <div className="w-full card-base p-5 text-left mb-6 space-y-3 bg-surface border border-border-p">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">Listener:</span>
              <span className="font-semibold text-warm-white">{bookingResult.listenerName || listenerInfo.name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">Date:</span>
              <span className="font-semibold text-warm-white">{bookingResult.date || (day === "today" ? "Today" : "Tomorrow")}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">Time:</span>
              <span className="font-semibold text-lavender-soft">{bookingResult.startTime || selected}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">Duration:</span>
              <span className="font-semibold text-warm-white">{bookingResult.durationMinutes || 10} minutes</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">Session Type:</span>
              <span className="font-semibold text-warm-white">{bookingResult.sessionType || "Peer Support"}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">Mode:</span>
              <span className="font-semibold text-warm-white">{bookingResult.mode || "Text Chat"}</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-border-p">
              <span className="text-text-muted">Client ID:</span>
              <span className="font-mono text-purple-core font-bold text-sm">{bookingResult.clientId}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">Status:</span>
              <span className="text-c-success font-semibold px-2 py-0.5 rounded-full bg-c-success/15">{bookingResult.status || "Booked"}</span>
            </div>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={() => onNav ? onNav("my-sessions") : onBack()}
              className="btn-primary w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer"
            >
              View My Sessions
            </button>
            <button
              onClick={onBack}
              className="btn-ghost w-full py-3 rounded-2xl text-xs text-text-muted hover:text-text-secondary cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  const totalSlotsCount = [
    ...slotsData.morning,
    ...slotsData.afternoon,
    ...slotsData.evening,
  ].filter((t) => !isSlotPast(t)).length

  return (
    <Shell>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 animate-fade-up">
        <button onClick={onBack} className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors text-sm font-medium cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
        <span className="text-[10px] font-medium text-text-muted border border-border-p rounded-full px-3 py-1">Schedule a session</span>
      </div>

      {/* Listener mini-card */}
      <div className="card-base flex items-center justify-between px-4 py-3 mb-5 animate-fade-up" style={{ animationDelay: "20ms" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-core/15 border border-purple-core/25 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-lavender-soft">{listenerInfo.initials}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-warm-white">{listenerInfo.name}</p>
            <p className="text-xs text-text-muted">Peer support listener</p>
          </div>
        </div>
        <span className="text-xs text-text-muted border border-border-p rounded-full px-2.5 py-1 font-medium">10 min</span>
      </div>

      {/* Heading */}
      <div className="mb-5 animate-fade-up" style={{ animationDelay: "30ms" }}>
        <h2 className="text-[22px] font-semibold text-warm-white leading-snug mb-2">Choose a time slot</h2>
        <p className="text-sm text-text-muted">Each session is exactly 10 minutes — focused and supportive.</p>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-4 p-3.5 rounded-xl bg-c-critical/10 border border-c-critical/30 text-xs text-c-critical flex items-center justify-between animate-fade-up">
          <span>{errorMessage}</span>
          <button onClick={fetchSlots} className="font-semibold underline ml-2 cursor-pointer">Retry</button>
        </div>
      )}

      {/* Day toggle */}
      <div className="flex rounded-2xl border border-border-p overflow-hidden mb-6 animate-fade-up" style={{ animationDelay: "40ms" }}>
        {(["today", "tomorrow"] as const).map((d) => (
          <button key={d} onClick={() => { setDay(d); setSelected(null) }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all capitalize cursor-pointer ${day === d ? "text-warm-white" : "text-text-muted"}`}
            style={day === d ? { backgroundColor: "#1A5C3A" } : {}}
          >
            {d === "today" ? "Today" : "Tomorrow"}
          </button>
        ))}
      </div>

      {/* Slots Section */}
      {slotsLoading ? (
        <div className="space-y-4 py-8 animate-pulse">
          <div className="h-4 bg-surface rounded w-1/4 mb-2" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-9 bg-surface rounded-xl" />
            ))}
          </div>
        </div>
      ) : totalSlotsCount === 0 ? (
        <div className="card-base p-8 text-center my-6">
          <p className="text-sm text-text-secondary font-medium mb-1">No available slots for this day.</p>
          <p className="text-xs text-text-muted">Please switch to Tomorrow or try another listener.</p>
        </div>
      ) : (
        [
          { label: "Morning", emoji: "🌅", key: "morning" as const },
          { label: "Afternoon", emoji: "🌤", key: "afternoon" as const },
          { label: "Evening", emoji: "🌙", key: "evening" as const },
        ].map(({ label, emoji, key }, gi) => {
          const groupSlots = slotsData[key]
          if (groupSlots.length === 0) return null
          const activeOpenCount = groupSlots.filter((t) => !isSlotPast(t)).length
          return (
            <div key={key} className="mb-5 animate-fade-up" style={{ animationDelay: `${60 + gi * 30}ms` }}>
              <div className="flex items-center justify-between mb-3 px-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{emoji}</span>
                  <span className="text-[10px] font-medium text-text-muted">{label}</span>
                </div>
                <span className="text-[10px] text-text-muted">{activeOpenCount} open</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {groupSlots.map((t) => {
                  const past = isSlotPast(t)
                  if (past) {
                    return (
                      <button
                        key={t}
                        disabled
                        title="This time slot has already passed"
                        className="px-3 py-2 rounded-xl text-xs font-medium border border-border-p/40 bg-surface/40 text-text-muted/50 cursor-not-allowed flex items-center gap-1.5 opacity-50"
                      >
                        <span className="line-through">{t}</span>
                        <span className="text-[9px] uppercase tracking-wider text-text-muted/70">Unavailable</span>
                      </button>
                    )
                  }

                  return (
                    <button
                      key={t}
                      onClick={() => setSelected(t)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        selected === t
                          ? "text-warm-white border-transparent"
                          : "border-border-p text-text-secondary hover:border-border-s"
                      }`}
                      style={selected === t ? { backgroundColor: "#1A5C3A", borderColor: "#1A5C3A" } : {}}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      {/* Privacy note */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-border-p bg-elevated px-4 py-3 mb-5 animate-fade-up" style={{ animationDelay: "150ms" }}>
        <svg className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 16 16">
          <path d="M8 14s6-3 6-7.5V3L8 1 2 3v3.5C2 11 8 14 8 14z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
        <p className="text-xs text-text-muted leading-relaxed">Sessions are anonymous. Your employer sees only aggregate usage data — never your name or session content.</p>
      </div>

      {/* CTA */}
      <button
        onClick={handleBookSession}
        disabled={!selected || bookingLoading}
        className={`w-full py-4 rounded-2xl text-sm font-semibold animate-fade-up transition-all ${
          selected && !bookingLoading ? "text-warm-white cursor-pointer" : "bg-elevated border border-border-p text-text-muted cursor-not-allowed"
        }`}
        style={{ animationDelay: "160ms", backgroundColor: selected && !bookingLoading ? "#1A5C3A" : undefined }}
      >
        {bookingLoading ? "Confirming booking..." : selected ? `Book ${selected} session` : "Select a time slot to continue"}
      </button>
    </Shell>
  )
}

// ── Employee My Sessions Screen ───────────────────────────────────────────────

function MySessionsScreen({ onBack, onNav }: { onBack: () => void; onNav: (s: Screen) => void }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<"upcoming" | "completed" | "cancelled">("upcoming")
  const [loading, setLoading] = useState(true)
  const [sessionsData, setSessionsData] = useState<{
    upcoming: any[]
    completed: any[]
    cancelled: any[]
  }>({
    upcoming: [],
    completed: [],
    cancelled: [],
  })

  const fetchMySessions = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch("/api/listener-sessions/my", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json.success && json.sessions) {
        setSessionsData(json.sessions)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMySessions()
    const interval = setInterval(fetchMySessions, 15000)
    return () => clearInterval(interval)
  }, [])

  const [now, setNow] = useState<number>(Date.now())
  const [sessionAlert, setSessionAlert] = useState<string | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (sessionAlert) {
      const t = setTimeout(() => setSessionAlert(null), 4000)
      return () => clearTimeout(t)
    }
  }, [sessionAlert])

  const handleCancelSession = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to cancel this session?")) return
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`/api/listener-sessions/${sessionId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        fetchMySessions()
      }
    } catch {}
  }

  const handleEnterSession = (s: any) => {
    const startMs = s.startTimestamp ? Number(s.startTimestamp) : null
    const durMins = Number(s.durationMinutes || s.duration || 10)
    const endMs = s.endTimestamp ? Number(s.endTimestamp) : (startMs ? startMs + durMins * 60 * 1000 : null)

    // Allow entry up to 5 minutes (300,000 ms) before session start
    const fiveMinutesMs = 5 * 60 * 1000
    if (startMs !== null && now < (startMs - fiveMinutesMs)) {
      setSessionAlert(`Your session will be available 5 minutes before ${s.startTime || s.time}. Please wait.`)
      return
    }

    if (endMs !== null && now > endMs && s.status !== "In Progress") {
      setSessionAlert("This session has ended.")
      return
    }

    const targetId = s.sessionId || s.id
    navigate(`/session/${targetId}`)
  }

  const list = sessionsData[tab] || []

  return (
    <Shell>
      <div className="flex items-center justify-between mb-5 animate-fade-up">
        <button onClick={onBack} className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors text-sm font-medium cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
        <span className="text-[10px] font-medium text-text-muted border border-border-p rounded-full px-3 py-1">My Sessions</span>
      </div>

      <div className="mb-5 animate-fade-up">
        <h2 className="text-2xl font-bold text-warm-white mb-1">Your Peer Sessions</h2>
        <p className="text-xs text-text-muted">Confidential listening sessions with trained peer volunteers.</p>
      </div>

      {sessionAlert && (
        <div className="mb-4 p-3 rounded-2xl bg-purple-core/20 border border-purple-core/40 text-lavender-bright text-xs font-medium flex items-center gap-2 animate-fade-up">
          <svg className="w-4 h-4 text-lavender-soft flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="flex-1">{sessionAlert}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border-p mb-5 gap-4 animate-fade-up">
        {(["upcoming", "completed", "cancelled"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2.5 text-xs font-semibold capitalize transition-colors border-b-2 cursor-pointer ${
              tab === t ? "border-purple-core text-lavender-soft" : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            {t} ({sessionsData[t].length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-base p-5 h-24" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="card-base p-8 text-center my-6">
          <p className="text-sm text-text-secondary font-medium mb-1">
            {tab === "upcoming" ? "No upcoming sessions." : `No ${tab} sessions found.`}
          </p>
          <p className="text-xs text-text-muted mb-5">
            {tab === "upcoming" ? "Book a 10-minute session anytime you feel stressed or need a human ear." : ""}
          </p>
          {tab === "upcoming" && (
            <button onClick={() => onNav("listener-connect")} className="btn-primary text-xs px-5 py-2.5 rounded-xl cursor-pointer">
              Schedule a Session
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {list.map((s) => {
            const startMs = s.startTimestamp ? Number(s.startTimestamp) : null
            const durMins = Number(s.durationMinutes || s.duration || 10)
            const endMs = s.endTimestamp ? Number(s.endTimestamp) : (startMs ? startMs + durMins * 60 * 1000 : null)
            const fiveMinutesMs = 5 * 60 * 1000
            const isBefore = startMs !== null && now < (startMs - fiveMinutesMs)
            const isEnded = endMs !== null && now > endMs && s.status !== "In Progress"

            let countdownStr = ""
            if (isBefore && startMs !== null) {
              const diffSec = Math.max(0, Math.floor((startMs - fiveMinutesMs - now) / 1000))
              const m = Math.floor(diffSec / 60)
              const sec = diffSec % 60
              countdownStr = `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
            }

            return (
              <div key={s.id || s.sessionId} className="card-base p-4 border border-border-p hover:border-border-s transition-all relative">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-semibold text-warm-white flex items-center gap-2">
                      {s.listenerName}
                      <span className="text-[10px] font-mono-data text-text-muted bg-surface px-1.5 py-0.5 rounded">{s.sessionId}</span>
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">{s.date} · {s.time} · {s.durationMinutes} min</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    ["Confirmed", "Scheduled"].includes(s.status) ? "bg-purple-core/20 text-lavender-bright border border-purple-core/30"
                    : s.status === "Booked" ? "bg-c-info/15 text-blue-400 border border-blue-400/20"
                    : s.status === "Completed" ? "bg-c-success/15 text-c-success border border-c-success/30"
                    : "bg-surface text-text-muted"
                  }`}>
                    {s.status}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs text-text-muted pt-2 border-t border-border-p gap-2 flex-wrap sm:flex-nowrap">
                  <span className="font-mono text-[11px]">Client ID: {s.clientId}</span>
                  <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                    {tab === "upcoming" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCancelSession(s.sessionId || s.id)}
                          className="text-[11px] text-c-critical/80 hover:text-c-critical px-2.5 py-1.5 rounded cursor-pointer min-h-[36px] flex items-center pointer-events-auto touch-manipulation select-none"
                        >
                          Cancel
                        </button>
                        {isBefore ? (
                          <button
                            type="button"
                            disabled
                            className="bg-white/5 border border-white/10 text-text-muted text-[11px] font-mono px-3 py-1.5 rounded-xl cursor-not-allowed opacity-75 min-h-[38px] flex items-center gap-1.5"
                            title={`Session available 5 minutes before ${s.startTime || s.time}`}
                          >
                            <span>Starts in {countdownStr}</span>
                          </button>
                        ) : isEnded ? (
                          <span className="text-[11px] text-text-muted px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl min-h-[36px] flex items-center">
                            Session completed
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEnterSession(s)}
                            className="btn-primary text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer shadow-md shadow-purple-core/25 animate-pulse active:scale-95 transition-all min-h-[42px] min-w-[110px] flex items-center justify-center gap-1.5 pointer-events-auto touch-manipulation select-none"
                          >
                            <svg className="w-3.5 h-3.5 text-warm-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Enter Session</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Shell>
  )
}

// ── Notifications ─────────────────────────────────────────────────────────────

function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const [notifications, setNotifications] = useState<CQNotification[]>(() => getNotifications())
  const [loading, setLoading] = useState(true)

  const fetchRealNotifications = async () => {
    try {
      const token = localStorage.getItem("cq_token")
      if (!token) return
      const res = await fetch("/api/employee/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok && data.success && Array.isArray(data.notifications)) {
        // Merge with local notifications if any
        const local = getNotifications()
        const backendItems: CQNotification[] = data.notifications.map((n: any) => ({
          id: n.id || n._id,
          type: n.type,
          title: n.title,
          body: n.message || n.body,
          read: n.read,
          createdAt: n.createdAt,
        }))

        // Combined unique by title + timestamp or id
        const combined = [...backendItems]
        local.forEach((l) => {
          if (!combined.some((c) => c.id === l.id || (c.title === l.title && c.createdAt === l.createdAt))) {
            combined.push(l)
          }
        })
        combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setNotifications(combined)

        // Mark all as read on backend
        await fetch("/api/employee/notifications/read-all", {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }
    } catch {
      // fallback to local
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    markAllRead()
    fetchRealNotifications()
  }

  // Mark read and fetch on mount
  useEffect(() => {
    handleOpen()
  }, [])

  const iconFor = (type: string) => {
    if (type === "listener_session") return (
      <svg className="w-5 h-5 text-c-success" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M9 15l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
    return <svg className="w-5 h-5 text-lavender-soft" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" /><path d="M12 8v4M12 15v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
  }

  function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (diff < 1) return "Just now"
    if (diff < 60) return `${diff}m ago`
    return `${Math.floor(diff / 60)}h ago`
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <button onClick={onBack} className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors text-sm font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
        <h2 className="text-sm font-semibold text-warm-white">Notifications</h2>
        <div className="w-10" />
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-elevated border border-border-p flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">No notifications yet</p>
          <p className="text-xs text-text-muted">Booked sessions and updates will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <div
              key={n.id}
              className="card-base p-4 flex items-start gap-3.5 animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="w-10 h-10 rounded-2xl bg-elevated border border-border-p flex items-center justify-center flex-shrink-0">
                {iconFor(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-warm-white leading-snug">{n.title}</p>
                  <span className="text-[10px] text-text-muted flex-shrink-0">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">{n.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  )
}

// ── Reset Labs ─────────────────────────────────────────────────────────────────

function ResetLabsScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const sessions = [
    {
      name: "Rhythm for Resilience",
      desc: "Relax through guided music therapy designed to reduce anxiety, improve focus, and promote emotional balance.",
      icon: "🎵",
      decorative: "🎧",
      bg: "linear-gradient(135deg, rgba(124,58,237,0.52) 0%, rgba(109,40,217,0.34) 100%)",
      border: "rgba(167,139,250,0.55)",
      iconBg: "rgba(255,255,255,0.18)",
    },
    {
      name: "Resilience Talks",
      desc: "Interactive talks by psychologists, wellness coaches and inspiring speakers focused on stress management and personal growth.",
      icon: "🎤",
      decorative: "💬",
      bg: "linear-gradient(135deg, rgba(236,72,153,0.48) 0%, rgba(244,63,94,0.30) 100%)",
      border: "rgba(251,182,206,0.55)",
      iconBg: "rgba(255,255,255,0.18)",
    },
    {
      name: "Express and Unwind",
      desc: "Express emotions creatively through guided drawing, painting and mindful art exercises.",
      icon: "🎨",
      decorative: "🖌️",
      bg: "linear-gradient(135deg, rgba(5,150,105,0.52) 0%, rgba(6,182,212,0.32) 100%)",
      border: "rgba(110,231,183,0.55)",
      iconBg: "rgba(255,255,255,0.18)",
    },
  ]

  const comingSoon = [
    { emoji: "🕯️", label: "Meditation" },
    { emoji: "📖", label: "Journaling" },
    { emoji: "🫧", label: "Group therapy" },
    { emoji: "😄", label: "Laughter therapy" },
    { emoji: "🎵", label: "Sound healing" },
    { emoji: "🌿", label: "Nature therapy" },
    { emoji: "☕", label: "Coffee conversations" },
  ]

  return (
    <Shell>
      <BackBtn onBack={() => onNav("reset-list")} />

      {/* Upcoming sessions */}
      <div className="mb-5">
        <p className="text-[10px] text-text-muted font-medium mb-4 animate-fade-up">Upcoming sessions</p>
        <div className="space-y-3">
          {sessions.map((s, i) => (
            <div
              key={s.name}
              className="relative rounded-3xl overflow-hidden animate-fade-up"
              style={{ background: s.bg, border: `1px solid ${s.border}`, animationDelay: `${i * 60}ms` }}
            >
              <div className="p-5 pr-20">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4" style={{ background: s.iconBg }}>
                  <span className="text-xl leading-none">{s.icon}</span>
                </div>
                <p className="text-[15px] font-semibold text-warm-white mb-2 leading-snug">{s.name}</p>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.70)" }}>{s.desc}</p>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-5xl" style={{ opacity: 0.55 }}>
                {s.decorative}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* More labs coming soon */}
      <div
        className="rounded-3xl p-5 mb-4 animate-fade-up"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", animationDelay: "200ms" }}
      >
        <p className="text-sm font-semibold text-warm-white mb-4">More labs coming soon</p>
        <div className="flex flex-wrap gap-2">
          {comingSoon.map((c) => (
            <span
              key={c.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-p bg-elevated text-xs text-text-secondary font-medium"
            >
              <span className="leading-none">{c.emoji}</span>
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* Booking & Registration */}
      <div
        className="rounded-3xl p-5 text-center animate-fade-up"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", animationDelay: "240ms" }}
      >
        <div className="text-3xl mb-3">📬</div>
        <p className="text-base font-semibold text-warm-white mb-2">Booking & registration</p>
        <p className="text-xs text-text-muted leading-relaxed mb-4">
          Interested in joining one of our Stress Labs? For booking, collaborations, or corporate wellness sessions, please contact us at:
        </p>
        <button
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-warm-white transition-colors"
          style={{ backgroundColor: "#1A5C3A" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1F6B43" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1A5C3A" }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 16 16">
            <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M2 5l6 4 6-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          cortiqsupport@gmail.com
        </button>
        <p className="text-xs text-text-muted mt-3">{"We'll get back to you within 24 hours."}</p>
        <div className="mt-5 pt-4 border-t border-white/5">
          <p className="text-xs text-text-muted leading-relaxed">
            New sessions are announced regularly.<br />Stay tuned for upcoming wellness experiences.
          </p>
        </div>
      </div>
    </Shell>
  )
}

// ── MSI Meaning ────────────────────────────────────────────────────────────────

const BAND_DETAIL: Record<string, { headline: string; description: string; symptoms: string[]; actions: { icon: string; text: string; nav: Screen | null }[] }> = {
  Healthy: {
    headline: "You're in a healthy stress state.",
    description: "Your MSI sits in the Healthy range (0–20). This indicates low psychological strain across mood, stress load, recovery, and physical wellbeing. You're managing demands well.",
    symptoms: ["Feeling generally calm and in control", "Recovering well from challenges", "Good sleep and physical energy"],
    actions: [
      { icon: "🌱", text: "Maintain your current recovery habits", nav: "reset-list" },
      { icon: "📊", text: "Check in weekly to track your baseline", nav: "baseline-msi" },
      { icon: "🤝", text: "Consider supporting colleagues who may be struggling", nav: "support" },
    ],
  },
  Mild: {
    headline: "Mild stress — manageable with small habits.",
    description: "Your MSI is in the Mild range (21–40). You may be experiencing some pressure but it's within a manageable range. Small, consistent recovery habits can keep this from rising.",
    symptoms: ["Occasional tension or low mood", "Slightly reduced ability to switch off", "Minor physical signs like tiredness"],
    actions: [
      { icon: "🧘", text: "Try a short Reset session today", nav: "reset-active" },
      { icon: "📝", text: "Use the Dump Bag to offload thoughts", nav: "dump-bag" },
      { icon: "🚶", text: "Short breaks away from your screen", nav: "reset-list" },
    ],
  },
  Moderate: {
    headline: "Moderate stress — recovery is recommended.",
    description: "Your MSI is in the Moderate range (41–60). Stress is noticeable and may be affecting your focus, mood, or physical state. Active recovery now can prevent escalation.",
    symptoms: ["Difficulty concentrating or feeling overwhelmed", "Reduced patience or increased irritability", "Physical tension, disrupted sleep"],
    actions: [
      { icon: "🧘", text: "Do a guided reset — try Breathwork", nav: "reset-active" },
      { icon: "💬", text: "Talk to someone via the Support tab", nav: "support" },
      { icon: "📋", text: "Identify and name your main stressor", nav: "stress-cause" },
      { icon: "📊", text: "Monitor daily — check in tomorrow", nav: "baseline-msi" },
    ],
  },
  High: {
    headline: "High stress — action is recommended.",
    description: "Your MSI is in the High range (61–80). This level of stress can affect performance, relationships, and physical health if sustained. Please take steps to recover today.",
    symptoms: ["Persistent worry, low mood or burnout feelings", "Difficulty completing tasks", "Physical exhaustion, poor sleep quality"],
    actions: [
      { icon: "🆘", text: "Use the Dump Bag — get it out of your head", nav: "dump-bag" },
      { icon: "🤝", text: "Book a Human Listener session", nav: "support" },
      { icon: "🛑", text: "Block recovery time in your calendar today", nav: "reset-list" },
      { icon: "💊", text: "Speak to your GP if symptoms persist", nav: "support" },
    ],
  },
  Burnout: {
    headline: "Burnout risk — please reach out for support.",
    description: "Your MSI is in the Burnout range (81–100). This is a significant signal. You may be experiencing chronic stress that's depleting your capacity to cope. Please seek support.",
    symptoms: ["Complete emotional and physical exhaustion", "Detachment, cynicism, or numbness", "Inability to function normally at work or home"],
    actions: [
      { icon: "🆘", text: "Contact a professional via the Support tab", nav: "support" },
      { icon: "📞", text: "Speak to HR or your line manager today", nav: "support" },
      { icon: "🏥", text: "See your GP — describe your symptoms", nav: "support" },
      { icon: "⏸", text: "Request a break or reduced workload urgently", nav: "support" },
    ],
  },
}

function MSIMeaningScreen({ msi, onBack, onNav }: { msi: number; onBack: () => void; onNav: (s: Screen) => void }) {
  const band = getBand(msi)
  const detail = BAND_DETAIL[band.label]
  return (
    <Shell>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
            <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className="text-[10px] text-text-muted">What your MSI means</p>
      </div>

      {/* Score + band */}
      <div className={`card-elevated border ${band.border} rounded-2xl p-5 mb-5`}>
        <div className="flex items-end gap-3 mb-3">
          <span className="font-mono-data text-5xl font-bold text-warm-white leading-none">{msi}</span>
          <div className="pb-1">
            <span className={`text-base font-bold ${band.color}`}>{band.label}</span>
            <p className="text-xs text-text-muted">out of 100</p>
          </div>
        </div>
        {/* Band scale bar */}
        <div className="space-y-1.5">
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            {[["Healthy","bg-c-success"],["Mild","bg-c-info"],["Moderate","bg-lavender-soft"],["High","bg-c-warning"],["Burnout","bg-c-critical"]].map(([b, bg]) => (
              <div key={b} className={`flex-1 ${bg} ${b === band.label ? "opacity-100" : "opacity-25"} transition-all`} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-text-muted font-mono-data">
            <span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span>
          </div>
        </div>
      </div>

      <p className={`text-base font-bold ${band.color} mb-2`}>{detail.headline}</p>
      <p className="text-sm text-text-secondary leading-relaxed mb-5">{detail.description}</p>

      {/* Symptoms */}
      <div className="card-elevated rounded-2xl p-4 mb-4">
        <p className="text-[10px] text-text-muted mb-3">You may be experiencing</p>
        <div className="space-y-2">
          {detail.symptoms.map((s) => (
            <div key={s} className="flex items-start gap-2.5">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${band.dot}`} />
              <p className="text-sm text-text-secondary leading-snug">{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended actions */}
      <div className="card-elevated rounded-2xl p-4 mb-4">
        <p className="text-[10px] text-text-muted mb-2">Recommended actions</p>
        <div className="space-y-1">
          {detail.actions.map((a) => (
            a.nav ? (
              <button
                key={a.text}
                onClick={() => onNav(a.nav!)}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-surface transition-colors text-left group"
              >
                <span className="text-xl flex-shrink-0 leading-none w-7 text-center">{a.icon}</span>
                <p className="text-sm text-text-secondary leading-snug flex-1">{a.text}</p>
                <svg className="w-3.5 h-3.5 text-text-muted group-hover:text-text-secondary flex-shrink-0 transition-colors" fill="none" viewBox="0 0 14 14">
                  <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : (
              <div key={a.text} className="flex items-center gap-3 px-2 py-2.5">
                <span className="text-xl flex-shrink-0 leading-none w-7 text-center">{a.icon}</span>
                <p className="text-sm text-text-secondary leading-snug flex-1">{a.text}</p>
              </div>
            )
          ))}
        </div>
      </div>

      <p className="text-xs text-text-muted text-center leading-relaxed px-2">
        MSI is based on your self-reported responses. It is not a clinical diagnosis.
      </p>
    </Shell>
  )
}

// ── Archetype Quiz ─────────────────────────────────────────────────────────────

const ARCHETYPE_PROFILES: Record<string, {
  num: string; tagline: string; desc: string; source: string; recovery: string;
  traits: string[]; trigger: string; color: string; bg: string; border: string; dot: string; gradient: string; emoji: string
}> = {
  "The Slow Leak": {
    num: "01", tagline: "Quiet on the surface. Draining underneath.",
    desc: "Stress accumulates slowly and mostly invisibly — building for weeks before it's acknowledged. You look composed and reliable on any given day, but the tank is draining.",
    source: "Cumulative, unacknowledged overload", recovery: "Slow",
    traits: ["High tolerance for discomfort", "Rarely asks for help", "Minimises early warning signals"],
    trigger: "Long stretches of unacknowledged overload with no clear endpoint.",
    color: "text-c-warning", bg: "bg-c-warning/10", border: "border-c-warning/30", dot: "bg-c-warning",
    gradient: "from-[#C98850]/30 to-[#08091F]", emoji: "🕯️",
  },
  "The Thunderstorm": {
    num: "02", tagline: "Intense. Loud. Gone by morning.",
    desc: "Stress spikes fast and visibly — then clears just as quickly. Directly tied to specific events. What defines you is the recovery — within hours, you're back.",
    source: "Specific triggering events", recovery: "Fast",
    traits: ["Highly visible responses", "Fast genuine recovery", "High self-awareness"],
    trigger: "Conflict, sudden changes, public pressure, or loss of control.",
    color: "text-c-critical", bg: "bg-c-critical/10", border: "border-c-critical/30", dot: "bg-c-critical",
    gradient: "from-[#B86B64]/30 to-[#08091F]", emoji: "⛈️",
  },
  "The Echo Chamber": {
    num: "03", tagline: "My brain replays the same moment on loop.",
    desc: "Stress is primarily cognitive — driven by rumination. A difficult meeting ends at 3pm and you're still inside it at 11pm, replaying what was said, rehearsing what you should have said.",
    source: "Cognitive rumination", recovery: "Medium",
    traits: ["Thoughts loop rather than resolve", "Peaks after events, not during", "Needs closure to feel settled"],
    trigger: "Ambiguous feedback, unresolved conversations, open loops.",
    color: "text-lavender-soft", bg: "bg-purple-core/10", border: "border-purple-core/30", dot: "bg-lavender-soft",
    gradient: "from-[#9B5DE5]/30 to-[#08091F]", emoji: "🔁",
  },
  "The Tide": {
    num: "04", tagline: "Work keeps coming in. I never fully dry out.",
    desc: "Stress comes from inability to psychologically disconnect from work — the boundary between on and off has dissolved. Work bleeds into every corner of life.",
    source: "Always-on culture / dissolved boundaries", recovery: "Slow",
    traits: ["Work present even when away from it", "No reliable shutdown ritual", "Recovery doesn't improve over weekends"],
    trigger: "Always-on team culture, remote work removing physical boundaries.",
    color: "text-c-info", bg: "bg-c-info/10", border: "border-c-info/30", dot: "bg-c-info",
    gradient: "from-[#6B82C4]/30 to-[#08091F]", emoji: "🌊",
  },
  "The Architect": {
    num: "05", tagline: "Everything I build, I rebuild. Three times.",
    desc: "Stress is self-generated — driven by impossibly high internal standards that no external situation demands. The pressure doesn't come from managers. It comes from the gap between what you've done and what you believe it should be.",
    source: "Self-imposed standards", recovery: "Medium",
    traits: ["Self-pressure exceeds external expectation", "Redoes work, second-guesses decisions", "Struggles to call things done"],
    trigger: "Submitting work that doesn't meet your own standard; any feedback.",
    color: "text-c-success", bg: "bg-c-success/10", border: "border-c-success/30", dot: "bg-c-success",
    gradient: "from-[#4A9E7A]/30 to-[#08091F]", emoji: "🏗️",
  },
  "The Kaleidoscope": {
    num: "06", tagline: "My focus breaks beautifully — but it still breaks.",
    desc: "Stress comes from constant context-switching — an inability to stay in one lane long enough to find flow. The cognitive cost of each transition accumulates. Mid-week depletion is your signature.",
    source: "Fragmented attention / context-switching", recovery: "Medium",
    traits: ["Highly sensitive to interruption", "Deep work is rare but excellent", "Calendar shape predicts stress"],
    trigger: "Meeting sandwiches, notifications during flow, 3+ parallel projects.",
    color: "text-lavender-bright", bg: "bg-lavender-bright/10", border: "border-lavender-bright/30", dot: "bg-lavender-bright",
    gradient: "from-[#B77AF2]/30 to-[#08091F]", emoji: "🔮",
  },
  "The Sponge": {
    num: "07", tagline: "I soak up every room I walk into.",
    desc: "Stress is empathic and social — absorbed from the emotional state of teammates, not from personal workload. You can have a perfectly manageable week and still arrive at Friday completely depleted.",
    source: "Empathic absorption from others", recovery: "Medium",
    traits: ["Stress follows team mood, not workload", "Trusted confidant for colleagues", "Post-interaction stress signature"],
    trigger: "Colleagues in distress, unresolved team tension, being the person others come to.",
    color: "text-c-warning", bg: "bg-c-warning/10", border: "border-c-warning/30", dot: "bg-c-warning",
    gradient: "from-[#C98850]/30 to-[#08091F]", emoji: "🧽",
  },
}

const MAX_SCORES: Record<string, number> = {
  "The Slow Leak": 6, "The Tide": 6, "The Thunderstorm": 6,
  "The Sponge": 6, "The Echo Chamber": 6, "The Architect": 6, "The Kaleidoscope": 4,
}

const QUIZ_QUESTIONS = [
  {
    text: "You suddenly have a free afternoon. What do you do first?",
    options: [
      { text: "Nothing. It feels nice to just rest.", primary: "The Slow Leak", pPts: 2, secondary: "The Tide", sPts: 1 },
      { text: "You feel a quick rush of relief, then move on with your day.", primary: "The Thunderstorm", pPts: 2, secondary: "The Sponge", sPts: 1 },
      { text: "You message a friend or coworker to check on them.", primary: "The Sponge", pPts: 2, secondary: "The Thunderstorm", sPts: 1 },
    ],
  },
  {
    text: "Someone asks, \"How was your week?\" What do you say?",
    options: [
      { text: "\"Good!\" — even if it was not really good.", primary: "The Slow Leak", pPts: 2, secondary: "The Tide", sPts: 1 },
      { text: "You start thinking about a moment from earlier in the week.", primary: "The Echo Chamber", pPts: 2, secondary: "The Architect", sPts: 1 },
      { text: "You mention you have not really stopped, even for a break.", primary: "The Tide", pPts: 2, secondary: "The Slow Leak", sPts: 1 },
    ],
  },
  {
    text: "A meeting gets cancelled and moved two times in one day. How do you feel?",
    options: [
      { text: "You barely notice. It does not bother you.", primary: "The Thunderstorm", pPts: 2, secondary: "The Sponge", sPts: 1 },
      { text: "Annoyed — you already prepared for it two times.", primary: "The Architect", pPts: 2, secondary: "The Echo Chamber", sPts: 1 },
      { text: "A little relieved — one less thing to think about.", primary: "The Kaleidoscope", pPts: 2, secondary: "", sPts: 0 },
    ],
  },
  {
    text: "It is late at night. What is still on your mind?",
    options: [
      { text: "Something someone said to you earlier today.", primary: "The Echo Chamber", pPts: 2, secondary: "The Architect", sPts: 1 },
      { text: "Work messages — you keep checking your phone.", primary: "The Tide", pPts: 2, secondary: "The Slow Leak", sPts: 1 },
      { text: "You wonder how a coworker is doing after a hard day.", primary: "The Sponge", pPts: 2, secondary: "The Thunderstorm", sPts: 1 },
    ],
  },
  {
    text: "You finish a big task. What happens next?",
    options: [
      { text: "You go back and check it again, just to be sure.", primary: "The Architect", pPts: 2, secondary: "The Echo Chamber", sPts: 1 },
      { text: "You notice a lot of time has passed without a break.", primary: "The Kaleidoscope", pPts: 2, secondary: "", sPts: 0 },
    ],
  },
]

function calcArchetype(answers: number[]) {
  const raw: Record<string, number> = {}
  answers.forEach((ansIdx, qIdx) => {
    const opt = QUIZ_QUESTIONS[qIdx].options[ansIdx]
    raw[opt.primary] = (raw[opt.primary] || 0) + opt.pPts
    if (opt.secondary) raw[opt.secondary] = (raw[opt.secondary] || 0) + opt.sPts
  })
  const normalized: Record<string, number> = {}
  Object.keys(MAX_SCORES).forEach((k) => {
    normalized[k] = Math.round(((raw[k] || 0) / MAX_SCORES[k]) * 100)
  })
  const sorted = Object.entries(normalized).sort((a, b) => b[1] - a[1])
  const top = sorted[0]
  const second = sorted[1]
  const confidence = top[1] >= 70 ? "High" : top[1] >= 50 ? "Medium" : "Low"
  const blended = second[1] >= top[1] - 15 && top[1] >= 50
  return { winner: top[0], second: second[0], normalized, confidence, blended }
}

type QuizStage = "intro" | "quiz" | "calculating" | "result"

function ArchetypeScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const [stage, setStage] = useState<QuizStage>(() =>
    localStorage.getItem("cq_archetype") ? "result" : "intro"
  )
  const [qIdx, setQIdx] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const savedArchetype = localStorage.getItem("cq_archetype")
  const result = answers.length === 5 ? calcArchetype(answers)
    : savedArchetype ? { winner: savedArchetype, second: "", normalized: {}, confidence: "High", blended: false }
    : null

  function pick(optIdx: number) {
    setSelected(optIdx)
    setTimeout(() => {
      const next = [...answers, optIdx]
      setAnswers(next)
      setSelected(null)
      if (qIdx < QUIZ_QUESTIONS.length - 1) {
        setQIdx(qIdx + 1)
      } else {
        setStage("calculating")
        const r = calcArchetype(next)
        localStorage.setItem("cq_archetype", r.winner)
        setTimeout(() => setStage("result"), 2200)
      }
    }, 220)
  }

  function retake() {
    setStage("intro")
    setQIdx(0)
    setAnswers([])
    setSelected(null)
    localStorage.removeItem("cq_archetype")
  }

  function copyCard() {
    if (!result) return
    const p = ARCHETYPE_PROFILES[result.winner]
    navigator.clipboard.writeText(
      `My stress archetype is ${result.winner}\n"${p.tagline}"\n\nDiscover yours at CortiQuant.`
    ).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  // ── Intro ──
  if (stage === "intro") {
    return (
      <Shell>
        <div className="mb-6">
          <p className="text-[10px] text-text-muted mb-2">Stress archetype</p>
          <h2 className="text-2xl font-semibold text-warm-white leading-snug">Discover how<br />your stress shows up.</h2>
        </div>
        <div className="card-base p-5 mb-4">
          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            5 quick questions. No rating scales — just real scenarios. Your result reveals the shape your stress takes, not what causes it.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[["⏱", "5 questions"], ["🎯", "Single select"], ["🔒", "Private to you"], ["🔄", "Retake anytime"]].map(([icon, label]) => (
              <div key={label} className="flex items-center gap-2 bg-elevated border border-border-p rounded-xl px-3 py-2">
                <span className="text-base">{icon}</span>
                <span className="text-[10px] text-text-muted">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            7 archetypes. Scored automatically. Results are yours alone — never shared with your organisation.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {Object.entries(ARCHETYPE_PROFILES).slice(0, 6).map(([name, p]) => (
            <div key={name} className={`card-elevated rounded-2xl px-3 py-2.5 border ${p.border} flex items-center gap-2`}>
              <span className="text-lg">{p.emoji}</span>
              <div>
                <p className={`text-xs font-bold ${p.color} leading-tight`}>{name.replace("The ", "")}</p>
                <p className="text-[10px] text-text-muted truncate">{p.source.split("/")[0].trim()}</p>
              </div>
            </div>
          ))}
        </div>
        <button className="btn-primary w-full py-3.5 text-sm" onClick={() => setStage("quiz")}>
          Start the quiz →
        </button>
      </Shell>
    )
  }

  // ── Calculating ──
  if (stage === "calculating") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full border-2 border-purple-core/30 animate-breathe-ring absolute inset-0" />
          <div className="w-20 h-20 rounded-full bg-purple-core/10 border border-purple-core/25 flex items-center justify-center animate-breathe">
            <span className="text-3xl">🔮</span>
          </div>
        </div>
        <p className="font-display text-xl italic text-warm-white mb-2">Finding your archetype…</p>
        <p className="text-sm text-text-muted">Scoring across all 7 archetypes.</p>
      </div>
    )
  }

  // ── Result ──
  if (stage === "result" && result) {
    const p = ARCHETYPE_PROFILES[result.winner]
    const p2 = result.blended && result.second ? ARCHETYPE_PROFILES[result.second] : null
    return (
      <Shell>
        {/* Shareable card */}
        <div className={`rounded-3xl overflow-hidden mb-5 bg-gradient-to-br ${p.gradient} border ${p.border}`}>
          <div className="px-5 pt-6 pb-5">
            <div className="flex items-center justify-between mb-4">
              <div className={`inline-flex items-center gap-2 ${p.bg} border ${p.border} rounded-full px-3 py-1`}>
                <div className={`w-1.5 h-1.5 rounded-full ${p.dot} animate-pulse-dot`} />
                <span className={`text-[10px] font-semibold ${p.color}`}>Your stress archetype</span>
              </div>
              <span className="text-2xl">{p.emoji}</span>
            </div>
            <p className="font-mono-data text-xs text-text-muted mb-1">{p.num} of 07</p>
            <h2 className="text-3xl font-semibold text-warm-white mb-1">{result.winner}</h2>
            {result.blended && p2 && (
              <p className="text-xs text-text-muted mb-1">with traces of {result.second}</p>
            )}
            <p className="font-display text-base italic text-text-secondary mb-4 leading-snug">"{p.tagline}"</p>
            <div className="h-px bg-border-p mb-4" />
            <div className="space-y-1.5 mb-4">
              {p.traits.map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <div className={`w-1 h-1 rounded-full flex-shrink-0 ${p.dot}`} />
                  <span className="text-xs text-text-secondary">{t}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${result.confidence === "High" ? "bg-c-success" : result.confidence === "Medium" ? "bg-c-warning" : "bg-text-muted"}`} />
                <span className="text-[10px] text-text-muted font-medium">{result.confidence} confidence</span>
              </div>
              <span className="text-[10px] text-text-muted font-mono-data">cortiquant.com</span>
            </div>
          </div>
        </div>

        {/* Share button */}
        <button
          onClick={copyCard}
          className="w-full flex items-center justify-center gap-2 btn-ghost py-3 text-sm mb-4"
        >
          {copied ? (
            <><svg className="w-4 h-4 text-c-success" fill="none" viewBox="0 0 16 16"><path d="M3 8l3 3 7-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> Copied to clipboard</>
          ) : (
            <><svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M10 2H4a1 1 0 00-1 1v9M6 5h6a1 1 0 011 1v7a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> Copy archetype card</>
          )}
        </button>

        {/* Full description */}
        <div className="card-elevated rounded-2xl p-4 mb-3">
          <p className="text-[10px] text-text-muted mb-2">What this means</p>
          <p className="text-sm text-text-secondary leading-relaxed">{p.desc}</p>
        </div>

        <div className="card-elevated rounded-2xl p-4 mb-3">
          <p className="text-[10px] text-text-muted mb-2">What sets you off</p>
          <p className="text-sm text-text-secondary leading-relaxed">{p.trigger}</p>
        </div>

        <div className="card-elevated rounded-2xl p-4 mb-4">
          <p className="text-[10px] text-text-muted mb-2">How you recover</p>
          <p className="text-sm text-text-secondary leading-relaxed">
            {result.winner === "The Slow Leak" && "Unstructured solo time, physical movement, private unobserved space. Being told the work is done and good enough."}
            {result.winner === "The Thunderstorm" && "Physical release, talking it through with someone you trust, a short but complete break from the stressor."}
            {result.winner === "The Echo Chamber" && "Explicit closure rituals, journaling to externalise thoughts, physical activity that demands present-moment attention."}
            {result.winner === "The Tide" && "Hard shutdown rituals with a clear endpoint, physical separation from devices, activities that demand full presence."}
            {result.winner === "The Architect" && "Being explicitly told something is done and good enough. Projects with defined endpoints and clear completion criteria."}
            {result.winner === "The Kaleidoscope" && "Protected uninterrupted blocks of 90+ minutes. Single-tasking days. Physical movement between contexts."}
            {result.winner === "The Sponge" && "Solitude — genuine alone time after people-heavy days. Activities that are entirely self-directed and non-relational."}
          </p>
        </div>

        {/* All scores */}
        {answers.length === 5 && (
          <div className="card-elevated rounded-2xl p-4 mb-4">
            <p className="text-[10px] text-text-muted mb-3">All archetype scores</p>
            <div className="space-y-2">
              {Object.entries(result.normalized).sort((a, b) => b[1] - a[1]).map(([name, score]) => {
                const ap = ARCHETYPE_PROFILES[name]
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-sm">{ap.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className={`font-medium ${name === result.winner ? ap.color : "text-text-muted"}`}>{name.replace("The ", "")}</span>
                        <span className="font-mono-data text-text-muted">{score}%</span>
                      </div>
                      <div className="h-1 bg-border-p rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${ap.dot} opacity-70`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <button onClick={() => onNav("home")} className="w-full btn-primary py-3.5 text-sm font-semibold mb-3">
          Go to home screen →
        </button>
        <button onClick={retake} className="w-full text-center text-xs text-text-muted hover:text-text-secondary transition-colors py-2">
          Retake quiz · refreshes every 8–12 weeks
        </button>
      </Shell>
    )
  }

  // ── Quiz ──
  const q = QUIZ_QUESTIONS[qIdx]
  const progress = ((qIdx) / QUIZ_QUESTIONS.length) * 100
  return (
    <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => { if (qIdx > 0) { setQIdx(qIdx - 1); setAnswers(answers.slice(0, -1)) } else setStage("intro") }}
          className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-secondary"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
            <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-[10px] text-text-muted">{qIdx + 1} of {QUIZ_QUESTIONS.length}</span>
        <div className="w-8" />
      </div>

      <div className="h-1 bg-border-p rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-primary to-purple-core rounded-full transition-all duration-400" style={{ width: `${progress + 20}%` }} />
      </div>

      <div key={qIdx} className="animate-fade-up flex-1 flex flex-col">
        <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-3 py-1 mb-4 self-start">
          <span className="font-mono-data text-xs text-purple-core">Q{qIdx + 1}</span>
          <div className="w-px h-3 bg-border-s" />
          <span className="text-xs text-text-muted">Stress Archetype Quiz</span>
        </div>

        <h2 className="text-lg font-semibold text-warm-white mb-6 leading-snug">{q.text}</h2>

        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              className={`w-full flex items-start gap-4 px-4 py-4 rounded-2xl border text-left transition-all duration-150 ${
                selected === i ? "border-purple-core bg-purple-core/10 scale-[0.98]" : "border-border-p bg-elevated hover:border-border-s"
              }`}
            >
              <div className={`w-5 h-5 rounded-full border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                selected === i ? "bg-purple-core border-purple-core" : "border-border-s"
              }`}>
                {selected === i && <div className="w-2 h-2 rounded-full bg-warm-white" />}
              </div>
              <span className={`text-sm font-medium leading-relaxed ${selected === i ? "text-lavender-soft" : "text-text-secondary"}`}>{opt.text}</span>
            </button>
          ))}
        </div>

        <p className="text-[10px] text-text-muted text-center mt-6">Tap an answer to continue</p>
      </div>
    </div>
  )
}

// ── Profile ───────────────────────────────────────────────────────────────────

function ProfileScreen({ onBack, onNav }: { onBack: () => void; onNav: (s: Screen) => void }) {
  const [profile, setProfile] = useState<any>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")

  // Form edit fields
  const [formName, setFormName] = useState("")
  const [formDept, setFormDept] = useState("")
  const [formDesignation, setFormDesignation] = useState("")
  const [formTenure, setFormTenure] = useState("")
  const [formArrangement, setFormArrangement] = useState("")
  const [formWorkload, setFormWorkload] = useState("")

  // Delete account state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError("")
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch("/api/employee/account", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (res.ok && data.success) {
        // Clear all employee-specific storage
        localStorage.clear()
        sessionStorage.clear()
        // Inform user and redirect to login
        alert("Your account has been deleted successfully.")
        window.location.href = "/company-login"
      } else {
        setDeleteError(data.message || "Failed to delete account. Please try again.")
      }
    } catch {
      setDeleteError("Connection error while attempting to delete account.")
    } finally {
      setDeleting(false)
    }
  }

  function loadProfileData() {
    const token = localStorage.getItem("cq_token")
    if (!token) return

    Promise.all([
      fetch("/api/employee/profile", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch("/api/assessments/metrics", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([profData, metricsData]) => {
        if (profData.success && profData.data) {
          setProfile(profData.data)
          setFormName(profData.data.name || "")
          setFormDept(profData.data.department || "")
          setFormDesignation(profData.data.designation || "")
          setFormTenure(profData.data.tenure || "")
          setFormArrangement(profData.data.workArrangement || "")
          setFormWorkload(profData.data.weeklyWorkload || "")
        }
        if (metricsData.success && metricsData.data) {
          setMetrics(metricsData.data)
        }
      })
      .catch((err) => console.warn("[PROFILE] Error loading:", err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProfileData()
  }, [])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg("")
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch("/api/employee/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName,
          department: formDept,
          designation: formDesignation,
          tenure: formTenure,
          workArrangement: formArrangement,
          weeklyWorkload: formWorkload,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSaveMsg("Profile updated successfully!")
        loadProfileData()
        setTimeout(() => {
          setEditOpen(false)
          setSaveMsg("")
        }, 1000)
      } else {
        setSaveMsg(data.error || "Failed to update profile")
      }
    } catch {
      setSaveMsg("Network error saving profile")
    } finally {
      setSaving(false)
    }
  }

  const archetype = localStorage.getItem("cq_archetype") ?? null
  const ap = archetype ? ARCHETYPE_PROFILES[archetype] : null

  const empName = profile?.name || "—"
  const empId = profile?.employeeId || "—"
  const username = profile?.username || "—"
  const dept = profile?.department || "—"
  const designation = profile?.designation || "—"
  const tenure = profile?.tenure || "—"
  const arrangement = profile?.workArrangement || "—"
  const workload = profile?.weeklyWorkload || "—"
  const ageVal = (profile?.age && profile.age !== "—") ? profile.age : (profile?.ageRange && profile.ageRange !== "—") ? profile.ageRange : null
  const genderVal = (profile?.gender && profile.gender !== "—") ? profile.gender : null
  const ageGender =
    ageVal && genderVal
      ? `${ageVal} · ${genderVal}`
      : ageVal || genderVal || "—"

  const baselineScore = metrics?.baselineMsi ?? profile?.baselineMsi ?? null
  const currentScore = metrics?.currentMsi ?? profile?.currentMsi ?? null
  const lastDate = metrics?.lastAssessmentDate
    ? new Date(metrics.lastAssessmentDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
    : "—"

  const infoFields = [
    { label: "USERNAME", value: username },
    { label: "DEPARTMENT", value: dept },
    { label: "DESIGNATION", value: designation },
    { label: "TENURE", value: tenure },
    { label: "ARRANGEMENT", value: arrangement },
    { label: "WEEKLY WORKLOAD", value: workload },
  ]

  const metricsFields = [
    { label: "Baseline Stress (Baseline MSI)", value: baselineScore != null ? `${baselineScore}%` : "—", accent: false },
    { label: "Current Stress (Current MSI)", value: currentScore != null ? `${currentScore}%` : "—", accent: false },
    { label: "Primary Archetype", value: archetype ?? "—", accent: !!archetype },
    { label: "Last Assessment Date", value: lastDate, accent: false },
  ]

  return (
    <div className="flex-1 flex flex-col pb-36 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <span className="text-sm font-semibold text-warm-white">Employee Profile</span>
        <button
          onClick={() => {
            localStorage.clear()
            window.location.href = "/company-login"
          }}
          className="text-xs font-semibold text-text-muted hover:text-warm-white transition-colors cursor-pointer"
        >
          Logout
        </button>
      </div>

      <div className="px-5 space-y-4">
        {/* Profile info card */}
        <div className="card-base p-5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full border-2 border-border-s bg-elevated flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-text-secondary" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-warm-white leading-tight">{empName}</p>
              <p className="text-xs text-text-muted mt-0.5">ID: {empId}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {infoFields.map((f) => (
              <div key={f.label}>
                <p className="text-[9px] font-semibold text-text-muted mb-0.5">{f.label}</p>
                <p className="text-sm text-text-secondary font-medium">{f.value}</p>
              </div>
            ))}
            <div className="col-span-2">
              <p className="text-[9px] font-semibold text-text-muted mb-0.5">Age & gender</p>
              <p className="text-sm text-text-secondary font-medium">{ageGender}</p>
            </div>
          </div>
        </div>

        {/* Assessment Metrics */}
        <div className="card-base p-5">
          <p className="text-sm font-semibold text-warm-white mb-1">Assessment metrics</p>
          <div className="divide-y divide-border-p">
            {metricsFields.map((m) => (
              <div key={m.label} className="flex items-center justify-between py-3.5 gap-3">
                <span className="text-sm text-text-muted leading-snug">{m.label}</span>
                <span
                  className={`text-sm font-semibold flex-shrink-0 ${
                    m.accent && ap ? ap.color : "text-text-secondary"
                  }`}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Profile Settings */}
        <button
          onClick={() => setEditOpen(true)}
          className="w-full py-4 rounded-2xl font-semibold text-sm text-white transition-colors cursor-pointer"
          style={{ backgroundColor: "#1A5C3A" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1F6B43" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1A5C3A" }}
        >
          Edit Profile Settings
        </button>

        {/* Account Settings */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-warm-white">Account settings</p>
          <button
            onClick={() => onNav("settings")}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-border-p bg-elevated hover:border-border-s transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 20 20">
                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M16.2 12.3a1.3 1.3 0 00.26 1.43l.05.05a1.58 1.58 0 010 2.23 1.58 1.58 0 01-2.23 0l-.05-.05a1.3 1.3 0 00-1.43-.26 1.3 1.3 0 00-.79 1.19V17a1.58 1.58 0 01-3.16 0v-.08A1.3 1.3 0 008 15.73a1.3 1.3 0 00-1.43.26l-.04.05a1.58 1.58 0 01-2.23-2.23l.05-.05A1.3 1.3 0 004.6 12.3a1.3 1.3 0 00-1.19-.79H3a1.58 1.58 0 010-3.16h.08A1.3 1.3 0 004.27 7.7a1.3 1.3 0 00-.26-1.43l-.05-.04a1.58 1.58 0 012.23-2.23l.04.05A1.3 1.3 0 008 4.31a1.3 1.3 0 00.79-1.19V3a1.58 1.58 0 013.16 0v.08a1.3 1.3 0 00.79 1.19 1.3 1.3 0 001.43-.26l.05-.05a1.58 1.58 0 012.23 2.23l-.05.04A1.3 1.3 0 0015.73 8a1.3 1.3 0 001.19.79H17a1.58 1.58 0 010 3.16h-.08a1.3 1.3 0 00-1.19.79l-.03.03z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-medium text-text-secondary">Settings</span>
            </div>
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 16 16">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Danger Zone / Delete Account */}
        <div className="pt-3 pb-8 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-c-critical/80">Danger Zone</p>
          <button
            type="button"
            onClick={() => {
              setDeleteError("")
              setDeleteModalOpen(true)
            }}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-c-critical/25 bg-c-critical/8 hover:bg-c-critical/15 hover:border-c-critical/40 transition-all text-left cursor-pointer min-h-[48px] touch-manipulation pointer-events-auto"
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-c-critical/80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <div>
                <span className="text-sm font-semibold text-c-critical">Delete Account</span>
                <p className="text-[11px] text-text-muted">Permanently remove your account and personal records</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-c-critical/60" fill="none" viewBox="0 0 16 16">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="card-base w-full max-w-sm p-6 space-y-4 border border-c-critical/30 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-c-critical/15 border border-c-critical/30 flex items-center justify-center flex-shrink-0 text-c-critical">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-warm-white leading-snug">Delete your account?</h3>
                <p className="text-xs text-text-muted">Permanent action</p>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              This will permanently delete your CortiQuant account and associated personal data. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-c-critical/15 border border-c-critical/30 text-c-critical text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!deleting) {
                    setDeleteModalOpen(false)
                    setDeleteError("")
                  }
                }}
                disabled={deleting}
                className="flex-1 py-3 px-4 rounded-xl border border-border-p bg-surface text-text-muted hover:text-warm-white text-xs font-semibold cursor-pointer transition-colors min-h-[44px] flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-3 px-4 rounded-xl bg-c-critical hover:bg-red-600 active:bg-red-700 text-white text-xs font-semibold cursor-pointer transition-all shadow-md shadow-c-critical/30 min-h-[44px] flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Account</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="card-base w-full max-w-sm p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border-p">
              <h3 className="text-base font-bold text-warm-white">Edit Profile Settings</h3>
              <button
                onClick={() => setEditOpen(false)}
                className="text-text-muted hover:text-warm-white transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-left">
              <div>
                <label className="text-[11px] font-semibold text-text-muted">Full Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full mt-1 bg-elevated border border-border-p rounded-xl px-3 py-2 text-sm text-warm-white outline-none focus:border-purple-core"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-muted">Department</label>
                <input
                  type="text"
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  className="w-full mt-1 bg-elevated border border-border-p rounded-xl px-3 py-2 text-sm text-warm-white outline-none focus:border-purple-core"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-muted">Designation / Role Level</label>
                <input
                  type="text"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  className="w-full mt-1 bg-elevated border border-border-p rounded-xl px-3 py-2 text-sm text-warm-white outline-none focus:border-purple-core"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-muted">Tenure</label>
                <select
                  value={formTenure}
                  onChange={(e) => setFormTenure(e.target.value)}
                  className="w-full mt-1 bg-elevated border border-border-p rounded-xl px-3 py-2 text-sm text-warm-white outline-none focus:border-purple-core"
                >
                  <option value="< 6 Months">&lt; 6 Months</option>
                  <option value="6–12 Months">6–12 Months</option>
                  <option value="1–2 Years">1–2 Years</option>
                  <option value="3–5 Years">3–5 Years</option>
                  <option value="5+ Years">5+ Years</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-muted">Work Arrangement</label>
                <select
                  value={formArrangement}
                  onChange={(e) => setFormArrangement(e.target.value)}
                  className="w-full mt-1 bg-elevated border border-border-p rounded-xl px-3 py-2 text-sm text-warm-white outline-none focus:border-purple-core"
                >
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-muted">Weekly Workload</label>
                <select
                  value={formWorkload}
                  onChange={(e) => setFormWorkload(e.target.value)}
                  className="w-full mt-1 bg-elevated border border-border-p rounded-xl px-3 py-2 text-sm text-warm-white outline-none focus:border-purple-core"
                >
                  <option value="< 35 Hours">&lt; 35 Hours</option>
                  <option value="35–40 Hours">35–40 Hours</option>
                  <option value="41–50 Hours">41–50 Hours</option>
                  <option value="50+ Hours">50+ Hours</option>
                </select>
              </div>

              {saveMsg && (
                <p className={`text-xs text-center font-medium ${saveMsg.includes("success") ? "text-emerald-400" : "text-c-critical"}`}>
                  {saveMsg}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border-p text-text-muted hover:text-warm-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────

function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [notif, setNotif] = useState(true)
  const [motion, setMotion] = useState(false)
  const [anon, setAnon] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("cq_token")
    if (!token) return

    fetch("/api/employee/settings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setNotif(!!data.data.dailyCheckInReminder)
          setMotion(!!data.data.reduceMotion)
          setAnon(!!data.data.anonymousMode)
          if (data.data.reduceMotion) {
            document.documentElement.classList.add("reduce-motion")
          } else {
            document.documentElement.classList.remove("reduce-motion")
          }
        }
      })
      .catch((err) => console.warn("[SETTINGS] Error loading:", err))
      .finally(() => setLoading(false))
  }, [])

  async function updateSetting(key: "dailyCheckInReminder" | "reduceMotion" | "anonymousMode", val: boolean) {
    const token = localStorage.getItem("cq_token")
    if (!token) return

    if (key === "reduceMotion") {
      if (val) {
        document.documentElement.classList.add("reduce-motion")
      } else {
        document.documentElement.classList.remove("reduce-motion")
      }
    }

    try {
      await fetch("/api/employee/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [key]: val }),
      })
    } catch (err) {
      console.warn("[SETTINGS] Failed to persist setting:", err)
    }
  }

  const Toggle = ({ on, toggle }: { on: boolean; toggle: () => void }) => (
    <button
      onClick={toggle}
      className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0 cursor-pointer ${on ? "bg-purple-core" : "bg-border-s"}`}
      style={{ height: 22, width: 40 }}
    >
      <div
        className="absolute top-0.5 rounded-full bg-warm-white shadow transition-all duration-200"
        style={{ width: 18, height: 18, left: on ? 20 : 2 }}
      />
    </button>
  )

  const sections = [
    {
      title: "Notifications",
      rows: [
        {
          label: "Daily check-in reminder",
          sub: "Reminds you to check in once a day",
          on: notif,
          toggle: () => {
            const next = !notif
            setNotif(next)
            updateSetting("dailyCheckInReminder", next)
          },
        },
      ],
    },
    {
      title: "Accessibility",
      rows: [
        {
          label: "Reduce motion",
          sub: "Minimises animations in modules",
          on: motion,
          toggle: () => {
            const next = !motion
            setMotion(next)
            updateSetting("reduceMotion", next)
          },
        },
      ],
    },
    {
      title: "Privacy",
      rows: [
        {
          label: "Anonymous mode",
          sub: "Your responses are never linked to your name in aggregates",
          on: anon,
          toggle: () => {
            const next = !anon
            setAnon(next)
            updateSetting("anonymousMode", next)
          },
        },
      ],
    },
  ]

  return (
    <div className="flex-1 flex flex-col px-5 pt-5 pb-28 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors text-sm font-medium cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <button
          onClick={() => {
            localStorage.clear()
            window.location.href = "/company-login"
          }}
          className="text-xs font-semibold text-text-muted hover:text-warm-white transition-colors cursor-pointer"
        >
          Logout
        </button>
      </div>

      <h2 className="text-xl font-semibold text-warm-white mb-6">Settings</h2>

      <div className="space-y-5">
        {sections.map((sec) => (
          <div key={sec.title}>
            <p className="text-[10px] font-semibold text-text-muted mb-2 px-1">{sec.title}</p>
            <div className="card-base divide-y divide-border-p overflow-hidden">
              {sec.rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between px-4 py-3.5 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-secondary leading-tight">{r.label}</p>
                    <p className="text-xs text-text-muted mt-0.5 leading-snug">{r.sub}</p>
                  </div>
                  <Toggle on={r.on} toggle={r.toggle} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* App info */}
        <div>
          <p className="text-[10px] font-semibold text-text-muted mb-2 px-1">About</p>
          <div className="card-base divide-y divide-border-p overflow-hidden">
            {[
              { label: "Version", value: "1.0.0-beta" },
              { label: "Build", value: "2026.08" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between px-4 py-3.5">
                <span className="text-sm text-text-muted">{r.label}</span>
                <span className="font-mono-data text-xs text-text-muted">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── App shell ──────────────────────────────────────────────────────────────────

export default function EmployeeApp({ initialScreen = "home" }: { initialScreen?: Screen }) {
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [checkInData, setCheckInData] = useState<CheckInData>({ feeling: "", stressor: "", physical: "", driver: "" })
  const [appCurrentMsi, setAppCurrentMsi] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("cq_token")
    if (!token) return
    fetch("/api/assessments/metrics", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.currentMsi != null) {
          setAppCurrentMsi(data.data.currentMsi)
          localStorage.setItem("cq_current_msi", String(data.data.currentMsi))
        }
      })
      .catch(() => {})
  }, [screen])

  const isFullscreen = screen === "reset-active"

  return (
    <div className="flex justify-center items-start min-h-full w-full bg-midnight">
      <div className="relative w-full max-w-xl md:max-w-2xl lg:max-w-3xl min-h-full bg-midnight flex flex-col">
        {/* Screen content */}
        <div className="flex-1 flex flex-col relative w-full">
          {screen === "home" && <HomeScreen onNav={setScreen} />}
          {screen === "baseline-msi" && <BaselineMSI onComplete={() => setScreen("home")} onBack={() => setScreen("home")} />}
          {screen === "stress-cause" && <StressDriverFlow msi={appCurrentMsi} onBack={() => setScreen("home")} onNav={(s) => setScreen(s as Screen)} />}
          {screen === "msi-meaning" && <MSIMeaningScreen msi={appCurrentMsi ?? 50} onBack={() => setScreen("home")} onNav={setScreen} />}
          {screen === "checkin-1" && <CheckIn1 onNext={() => setScreen("checkin-2")} onBack={() => setScreen("home")} data={checkInData} setData={setCheckInData} />}
          {screen === "checkin-2" && <CheckIn2 onNext={() => setScreen("checkin-3")} onBack={() => setScreen("checkin-1")} data={checkInData} setData={setCheckInData} />}
          {screen === "checkin-3" && <CheckIn3 onNext={() => setScreen("driver")} onBack={() => setScreen("checkin-2")} data={checkInData} setData={setCheckInData} />}
          {screen === "driver" && <DriverScreen onNext={() => setScreen("result")} onBack={() => setScreen("checkin-3")} data={checkInData} setData={setCheckInData} />}
          {screen === "result" && <ResultScreen onNav={setScreen} data={checkInData} />}
          {screen === "recommended" && <RecommendedScreen onNav={setScreen} />}
          {screen === "dump-bag" && <DumpBagScreen onNav={setScreen} />}
          {screen === "dump-response" && <DumpResponseScreen onNav={setScreen} />}
          {screen === "reset-list" && <ResetListScreen onNav={setScreen} />}
          {screen === "reset-active" && <ActiveResetScreen onNav={setScreen} />}
          {screen === "priority-reset" && <PriorityReset onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />}
          {screen === "breathing-reset" && <BreathingReset onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />}
          {screen === "journal" && <Journal onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />}
          {screen === "music-reset" && <MusicalReset onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />}
          {screen === "movement-reset" && <MovementReset onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />}
          {screen === "energy-reset" && <GuidedReset module="energy_reset" onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />}
          {screen === "relaxation" && <GuidedReset module="relaxation" onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />}
          {screen === "sleep-winddown" && <GuidedReset module="sleep_wind_down" onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />}
          {screen === "my-stress" && <MyStressScreen onNav={setScreen} />}
          {screen === "support" && <SupportScreen onNav={setScreen} />}
          {screen === "professional-support" && <ProfessionalSupportScreen onBack={() => setScreen("support")} />}
          {screen === "emergency-support" && <EmergencySupportScreen onBack={() => setScreen("support")} />}
          {screen === "listener-connect" && <ListenerConnectScreen onBack={() => setScreen("support")} onNav={setScreen} />}
          {screen === "listener-schedule" && <ListenerScheduleScreen onBack={() => setScreen("listener-connect")} onNav={setScreen} />}
          {screen === "my-sessions" && <MySessionsScreen onBack={() => setScreen("support")} onNav={setScreen} />}
          {screen === "notifications" && <NotificationsScreen onBack={() => setScreen("home")} />}
          {screen === "reset-labs" && <ResetLabsScreen onNav={setScreen} />}
          {screen === "archetype" && <ArchetypeScreen onNav={setScreen} />}
          {screen === "profile" && <ProfileScreen onBack={() => setScreen("home")} onNav={setScreen} />}
          {screen === "settings" && <SettingsScreen onBack={() => setScreen("profile")} />}
        </div>

        {!isFullscreen && <BottomNav active={screen} onNav={setScreen} />}
      </div>
    </div>
  )
}
