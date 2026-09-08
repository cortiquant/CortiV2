import { useState, useEffect, useCallback } from "react"
import logoSrc from "@/imports/image-2.png"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts"

type HRScreen = "overview" | "workforce" | "teams" | "team-detail" | "interventions" | "reports" | "approval-queue" | "settings"

// ── Data ──────────────────────────────────────────────────────────────────────



// ── Sidebar ───────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: HRScreen; label: string; icon: string }[] = [
  { id: "overview",       label: "Overview",       icon: "⬡" },
  { id: "workforce",      label: "Workforce",      icon: "◈" },
  { id: "teams",          label: "Teams",          icon: "⬟" },
  { id: "interventions",  label: "Interventions",  icon: "◆" },
  { id: "reports",        label: "Reports",        icon: "▣" },
  { id: "approval-queue", label: "Approval Queue", icon: "◎" },
  { id: "settings",       label: "Settings",       icon: "⚙" },
]

function Sidebar({
  active,
  onNav,
  mobileOpen,
  onClose,
  orgName,
}: {
  active: HRScreen
  onNav: (s: HRScreen) => void
  mobileOpen: boolean
  onClose: () => void
  orgName?: string
}) {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-midnight/80 z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-deep-navy border-r border-border-p flex flex-col py-6 transition-transform duration-300 transform md:relative md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="px-4 mb-6">
          <img src={logoSrc} alt="CortiQuant" className="h-14 object-contain object-left" />
          <p className="text-[10px] text-text-muted mt-1 px-1">HR Platform</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => { onNav(item.id); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active === item.id || (active === "team-detail" && item.id === "teams")
                  ? "bg-purple-core/15 text-lavender-soft border border-purple-core/25"
                  : "text-text-muted hover:text-text-secondary hover:bg-elevated"
              }`}
            >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Org info & Logout */}
      <div className="px-5 pt-4 border-t border-border-p mt-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-text-muted font-medium truncate">{orgName || "Organisation"}</p>
          <button
            onClick={() => {
              localStorage.removeItem("cq_token")
              localStorage.removeItem("cq_role")
              localStorage.removeItem("cq_user_name")
              localStorage.removeItem("cq_user_email")
              window.location.href = "/company-login"
            }}
            title="Sign out"
            className="text-[11px] text-text-muted hover:text-warm-white transition-colors ml-2"
          >
            Sign out
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-c-success animate-pulse-dot" />
          <span className="text-xs text-c-success">Live data</span>
        </div>
      </div>
      </div>
    </>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────

function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="card-base p-5">
      <p className="text-xs text-text-muted font-medium mb-3">{label}</p>
      <p className={`font-mono-data text-3xl font-medium ${color} mb-1`}>{value}</p>
      <p className="text-xs text-text-muted">{sub}</p>
    </div>
  )
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl text-warm-white">{title}</h2>
      {sub && <p className="text-text-muted text-sm mt-1">{sub}</p>}
    </div>
  )
}

function StateBadge({ state }: { state: string }) {
  const styles: Record<string, string> = {
    normal: "bg-c-success/10 text-c-success border-c-success/25",
    acute: "bg-lavender-soft/10 text-lavender-soft border-lavender-soft/25",
    persistent: "bg-purple-core/15 text-lavender-bright border-purple-core/30",
    "burnout-risk": "bg-c-critical/10 text-c-critical border-c-critical/25",
  }
  const labels: Record<string, string> = {
    normal: "Normal", acute: "Acute", persistent: "Persistent", "burnout-risk": "Burnout-risk"
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[state] || styles.normal}`}>
      {labels[state] || state}
    </span>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-elevated border border-border-p rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="font-mono-data text-sm text-warm-white font-medium">MSI {payload[0]?.value}</p>
    </div>
  )
}

// ── Overview screen (Real MongoDB-backed) ──────────────────────────────────────

interface OverviewDept {
  departmentId: string
  name: string
  msi: number
  trend: string
  state: string
  duration: string
  employeeCount: number
  participation: number
  recovery: number
}

interface OverviewStressState {
  state: string
  pct: number
  count: number
  color: string
}

interface OverviewTrendPoint {
  date: string
  msi: number
}

interface OverviewRecommendedAction {
  departmentId: string | null
  team: string
  insight: string
  rec: string
  cta: string
}

interface OverviewData {
  organisationId: string
  organisationName: string
  selectedDepartmentId: string | null
  selectedDepartmentName: string
  period: string
  workforceMSI: number
  msiSubtext: string
  msiIsIncrease: boolean
  activeEmployees: string
  activeEmployeesTotal: number
  participationRate: string
  recoveryEngagement: string
  interventionResponse: string
  executiveInsight: {
    title: string
    body: string
    highlightTeam: string
  }
  stressStates: OverviewStressState[]
  trend: OverviewTrendPoint[]
  departments: OverviewDept[]
  availableDepartments: { departmentId: string; name: string }[]
  recommendedActions: OverviewRecommendedAction[]
}

function OverviewScreen({ onNav }: { onNav: (s: HRScreen) => void }) {
  const [period, setPeriod] = useState<"7D" | "30D" | "90D">("30D")
  const [selectedDept, setSelectedDept] = useState<string>("all")
  const [departments, setDepartments] = useState<{ departmentId: string; name: string }[]>([])
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch departments list for the dropdown
  useEffect(() => {
    async function loadDepartments() {
      try {
        const token = localStorage.getItem("cq_token")
        const res = await fetch(`${API_BASE}/api/hr/departments`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        })
        if (!res.ok) throw new Error("Failed to load departments")
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setDepartments(json.data)
        }
      } catch (err: any) {
        console.error("[HR-OVERVIEW] Department load error:", err.message)
      }
    }
    loadDepartments()
  }, [])

  // Fetch overview metrics when period or selectedDept changes
  const fetchOverview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("cq_token")
      const params = new URLSearchParams()
      params.append("period", period.toLowerCase())
      if (selectedDept && selectedDept !== "all") {
        params.append("departmentId", selectedDept)
      }

      const res = await fetch(`${API_BASE}/api/hr/overview?${params.toString()}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      })
      if (!res.ok) {
        const errorJson = await res.json().catch(() => null)
        const msg = errorJson?.message || (res.status === 403 ? "Access restricted to HR accounts. Please sign in with an authorised HR administrator account." : res.status === 401 ? "Session expired. Please sign in again." : `Overview fetch failed: ${res.statusText}`)
        const err = new Error(msg) as any
        err.status = res.status
        throw err
      }
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        // If departments list wasn't loaded or was empty, sync from overview payload
        if (json.data.availableDepartments && json.data.availableDepartments.length > 0) {
          setDepartments(json.data.availableDepartments)
        }
      } else {
        throw new Error(json.message || "Failed to load HR overview")
      }
    } catch (err: any) {
      console.error("[HR-OVERVIEW] Error:", err)
      setError(err.message || "Could not load HR overview data")
    } finally {
      setLoading(false)
    }
  }, [period, selectedDept])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  // Helper for MSI metric color
  const msiValue = data?.workforceMSI ?? 0
  const msiColor =
    msiValue >= 70 ? "text-c-critical" : msiValue >= 55 ? "text-c-warning" : "text-c-success"

  const currentDateFormatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())

  return (
    <div className="flex-1 overflow-y-auto p-8 w-full max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-warm-white">Workforce Wellbeing</h1>
          <p className="text-text-muted text-sm mt-1">
            {data?.organisationName || "Organisation"} · {currentDateFormatted}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            id="hr-overview-department-filter"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-surface border border-border-p rounded-xl px-3 py-2 text-sm text-text-secondary focus:outline-none focus:border-border-s cursor-pointer"
          >
            <option value="all">All departments</option>
            {departments.map((dept) => (
              <option key={dept.departmentId} value={dept.departmentId}>
                {dept.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            className="btn-ghost text-sm px-4 py-2 hover:bg-elevated transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      {/* Loading state indicator banner */}
      {loading && !data && (
        <div className="card-base p-12 text-center text-text-muted my-6">
          <div className="inline-block w-6 h-6 border-2 border-purple-core border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Loading workforce wellbeing intelligence...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="card-base p-8 border-c-warning/30 bg-midnight/90 mb-6 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-c-warning/15 border border-c-warning/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-c-warning" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-warm-white mb-2">HR Authorization Required</h3>
          <p className="text-sm text-text-muted leading-relaxed mb-6">
            {error}
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="/company-login"
              className="btn-primary text-xs px-5 py-2.5 rounded-xl font-medium"
            >
              Sign In to HR Account →
            </a>
            <button
              onClick={fetchOverview}
              className="btn-ghost text-xs px-4 py-2.5 rounded-xl border border-border-p text-text-secondary hover:text-warm-white"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard
              label="Workforce MSI"
              value={data.workforceMSI > 0 ? String(data.workforceMSI) : "—"}
              sub={data.msiSubtext}
              color={msiColor}
            />
            <KPICard
              label="Active Employees"
              value={data.activeEmployees}
              sub={`Participation: ${data.participationRate}`}
              color="text-c-success"
            />
            <KPICard
              label="Recovery Engagement"
              value={data.recoveryEngagement}
              sub="Used a reset this week"
              color="text-lavender-soft"
            />
            <KPICard
              label="Intervention Response"
              value={data.interventionResponse}
              sub="Avg MSI improvement"
              color="text-c-info"
            />
          </div>

          {/* Executive insight + chart */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Insight card */}
            <div className="card-base p-6 col-span-1 flex flex-col justify-between border-purple-core/20">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-purple-core/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-purple-core" />
                  </div>
                  <span className="text-xs font-medium text-lavender-soft">
                    {data.selectedDepartmentId ? `${data.selectedDepartmentName} Focus` : "Executive Summary"}
                  </span>
                </div>
                <h3 className="font-display text-xl text-warm-white mb-3 leading-snug">
                  {data.executiveInsight?.title || "Workforce metrics updated."}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {data.executiveInsight?.body || "Real-time assessment data calculated across authenticated teams."}
                </p>
              </div>
              <button
                onClick={() => onNav("teams")}
                className="mt-6 btn-primary text-sm py-2.5 text-center"
              >
                Explore insight →
              </button>
            </div>

            {/* Trend chart */}
            <div className="card-base p-6 col-span-1 md:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-text-muted font-medium">Workforce Stress Over Time</p>
                  <p className="text-[11px] text-text-muted/70 mt-0.5">
                    {data.selectedDepartmentId ? `${data.selectedDepartmentName}` : "Organisation-wide"} · {period}
                  </p>
                </div>
                <div className="flex gap-1">
                  {(["7D", "30D", "90D"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setPeriod(t)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        period === t ? "bg-purple-core text-warm-white" : "text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {data.trend && data.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.trend} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2750" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#A8A1B5", fontSize: 11, fontFamily: "JetBrains Mono" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#A8A1B5", fontSize: 11, fontFamily: "JetBrains Mono" }}
                      axisLine={false}
                      tickLine={false}
                      domain={[20, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={50} stroke="#2A2750" strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="msi"
                      stroke="#9B5DE5"
                      strokeWidth={2}
                      dot={{ r: 2, fill: "#9B5DE5" }}
                      activeDot={{ r: 5, fill: "#9B5DE5", stroke: "#B77AF2", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-border-p/40 rounded-xl">
                  <p className="text-xs text-text-muted font-medium mb-1">No assessment data in this timeframe</p>
                  <p className="text-[11px] text-text-muted/60">
                    Daily check-in records for {data.selectedDepartmentName} will plot here dynamically.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stress state distribution + Team overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Stress states */}
            <div className="card-base p-5 col-span-1">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-text-muted font-medium">Workforce Stress States</p>
                <span className="text-[10px] text-text-muted font-mono-data">
                  {data.selectedDepartmentName}
                </span>
              </div>
              <div className="space-y-3">
                {data.stressStates && data.stressStates.length > 0 ? (
                  data.stressStates.map((s) => (
                    <div key={s.state}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-text-secondary">{s.state}</span>
                        <span className="font-mono-data text-text-muted">
                          {s.pct}% {s.count > 0 ? `(${s.count})` : ""}
                        </span>
                      </div>
                      <div className="h-1.5 bg-border-p rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${s.pct}%`, backgroundColor: s.color, opacity: 0.85 }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-muted py-4 text-center">No assessments recorded yet.</p>
                )}
              </div>
            </div>

            {/* Team overview */}
            <div className="card-base p-5 col-span-1 md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-text-muted font-medium">Department Overview</p>
                <button
                  onClick={() => onNav("teams")}
                  className="text-xs text-purple-core font-semibold hover:text-lavender-bright transition-colors"
                >
                  View all →
                </button>
              </div>
              <div className="space-y-2">
                {data.departments && data.departments.length > 0 ? (
                  data.departments.map((t) => (
                    <div
                      key={t.departmentId || t.name}
                      onClick={() => {
                        if (t.departmentId) setSelectedDept(t.departmentId)
                      }}
                      className="flex items-center gap-4 py-2 border-b border-border-p last:border-0 hover:bg-elevated/40 px-2 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="w-36 text-sm text-text-secondary font-medium truncate" title={t.name}>
                        {t.name}
                      </div>
                      <div className="flex-1 h-1.5 bg-border-p rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(5, t.msi || 0))}%`,
                            backgroundColor:
                              t.state === "burnout-risk"
                                ? "#B86B64"
                                : t.state === "persistent"
                                ? "#7E4CC7"
                                : t.state === "acute"
                                ? "#9B5DE5"
                                : "#4A9E7A",
                            opacity: 0.85,
                          }}
                        />
                      </div>
                      <span className="font-mono-data text-sm text-text-secondary w-8 text-right">
                        {t.msi > 0 ? t.msi : "—"}
                      </span>
                      <span
                        className={`font-mono-data text-xs w-12 text-right ${
                          t.trend.startsWith("+")
                            ? "text-c-warning"
                            : t.trend.startsWith("−") || t.trend.startsWith("-")
                            ? "text-c-success"
                            : "text-text-muted"
                        }`}
                      >
                        {t.trend}
                      </span>
                      <StateBadge state={t.state} />
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-text-muted">
                    No department stress records available yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recommended actions */}
          <div className="card-base p-5">
            <p className="text-xs text-text-muted font-medium mb-4">Recommended actions</p>
            {data.recommendedActions && data.recommendedActions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.recommendedActions.map((a, idx) => (
                  <div key={idx} className="card-elevated border border-border-p rounded-xl p-4">
                    <p className="text-xs font-semibold text-lavender-soft mb-1">{a.team}</p>
                    <p className="text-xs text-text-muted mb-2 leading-relaxed">{a.insight}</p>
                    <p className="text-sm text-text-secondary mb-3 leading-relaxed">{a.rec}</p>
                    <button
                      onClick={() => onNav("interventions")}
                      className="text-xs text-purple-core font-semibold hover:text-lavender-bright transition-colors"
                    >
                      {a.cta || "Create intervention"} →
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-text-muted border border-dashed border-border-p/50 rounded-xl">
                No actionable trend detected yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Workforce screen (Real MongoDB-backed) ────────────────────────────────────

interface WorkforceStressState {
  state: string
  pct: number
  count: number
  color: string
}

interface HeatmapWeekCell {
  weekLabel: string
  msi: number | null
  hasData: boolean
  count: number
}

interface StressMapRow {
  departmentId: string
  departmentName: string
  weeks: HeatmapWeekCell[]
}

interface TeamMSIItem {
  departmentId: string
  name: string
  msi: number | null
  state: string
  hasData: boolean
}

interface WorkforceData {
  organisationId: string
  organisationName: string
  monthYear: string
  workforceStressStates: WorkforceStressState[]
  heatmapWeeks: string[]
  stressMap: StressMapRow[]
  currentMSIByTeam: TeamMSIItem[]
}

function WorkforceScreen() {
  const [data, setData] = useState<WorkforceData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkforce = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`${API_BASE}/api/hr/workforce`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || `Workforce fetch failed: ${res.statusText}`)
      }
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      } else {
        throw new Error(json.message || "Failed to load workforce intelligence")
      }
    } catch (err: any) {
      console.error("[HR-WORKFORCE] Error:", err)
      setError(err.message || "Could not load workforce intelligence")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkforce()
  }, [fetchWorkforce])

  function intensityColor(val: number | null) {
    if (val === null || val === undefined) return "rgba(42,39,80,0.4)"
    if (val >= 65) return "rgba(126,76,199,0.85)"
    if (val >= 55) return "rgba(155,93,229,0.6)"
    if (val >= 48) return "rgba(183,122,242,0.4)"
    return "rgba(74,158,122,0.3)"
  }

  // Calculate org-wide average MSI for reference line
  const activeTeamsWithMSI = data?.currentMSIByTeam.filter((t) => t.msi !== null) || []
  const orgAvgMSI =
    activeTeamsWithMSI.length > 0
      ? Math.round(activeTeamsWithMSI.reduce((acc, t) => acc + (t.msi || 0), 0) / activeTeamsWithMSI.length)
      : null

  return (
    <div className="flex-1 overflow-y-auto p-8 w-full max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-warm-white">Workforce</h1>
          <p className="text-text-muted text-sm mt-1">
            Aggregated stress intelligence · {data?.organisationName || "Organisation"} · {data?.monthYear || "Current"}
          </p>
        </div>
      </div>

      {/* Loading state */}
      {loading && !data && (
        <div className="card-base p-12 text-center text-text-muted my-6">
          <div className="inline-block w-6 h-6 border-2 border-purple-core border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Loading workforce stress intelligence...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="card-base p-8 border-c-warning/30 bg-midnight/90 mb-6 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-c-warning/15 border border-c-warning/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-c-warning" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-warm-white mb-2">Notice</h3>
          <p className="text-sm text-text-muted leading-relaxed mb-6">{error}</p>
          <button
            onClick={fetchWorkforce}
            className="btn-primary text-xs px-5 py-2.5 rounded-xl font-medium"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Main Content */}
      {data && (
        <>
          {/* Distribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {data.workforceStressStates.map((s) => (
              <div key={s.state} className="card-base p-5 flex flex-col gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <p className="font-mono-data text-3xl font-medium text-warm-white">{s.pct}%</p>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{s.state}</span>
                  {s.count > 0 && <span className="font-mono-data text-[11px] opacity-75">({s.count})</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Heatmap (Stress Map) */}
          <div className="card-base p-5 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs text-text-muted font-medium">Workforce Stress Map</p>
                <p className="text-[11px] text-text-muted/70 mt-0.5">5-Week rolling snapshots by department</p>
              </div>
              <div className="flex gap-2 text-xs text-text-muted items-center">
                <span>Low</span>
                <div className="flex gap-0.5">
                  {[0.15, 0.3, 0.5, 0.7, 0.9].map((o, i) => (
                    <div key={i} className="w-5 h-3 rounded-sm" style={{ backgroundColor: `rgba(155,93,229,${o})` }} />
                  ))}
                </div>
                <span>High</span>
              </div>
            </div>

            {data.stressMap && data.stressMap.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-[10px] text-text-muted font-medium pb-3 w-40">Team</th>
                      {data.heatmapWeeks.map((w) => (
                        <th key={w} className="text-center text-[10px] text-text-muted font-semibold pb-3 px-2">
                          {w}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="space-y-2">
                    {data.stressMap.map((row) => (
                      <tr key={row.departmentId || row.departmentName} className="hover:bg-elevated/20 transition-colors">
                        <td className="text-xs text-text-secondary font-medium py-2 pr-4 truncate max-w-[160px]" title={row.departmentName}>
                          {row.departmentName}
                        </td>
                        {row.weeks.map((cell, wi) => (
                          <td key={wi} className="px-2 py-1">
                            <div
                              className="h-8 rounded-lg flex items-center justify-center transition-all"
                              style={{ backgroundColor: intensityColor(cell.msi) }}
                              title={cell.hasData ? `MSI ${cell.msi} (${cell.count} checks)` : "No assessments"}
                            >
                              <span className="font-mono-data text-xs text-warm-white font-medium">
                                {cell.hasData ? cell.msi : "—"}
                              </span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-text-muted border border-dashed border-border-p/40 rounded-xl">
                No department records found for this organisation yet.
              </div>
            )}
          </div>

          {/* Bar chart */}
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs text-text-muted font-medium">Current MSI by Team</p>
                <p className="text-[11px] text-text-muted/70 mt-0.5">Latest calculated score per department</p>
              </div>
              {orgAvgMSI !== null && (
                <span className="text-xs font-mono-data text-lavender-soft bg-purple-core/10 px-2.5 py-1 rounded-lg border border-purple-core/20">
                  Org Avg: {orgAvgMSI}
                </span>
              )}
            </div>

            {data.currentMSIByTeam && data.currentMSIByTeam.some((t) => t.hasData) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data.currentMSIByTeam.map((t) => ({
                    name: t.name,
                    msi: t.msi || 0,
                    state: t.state,
                    hasData: t.hasData,
                  }))}
                  margin={{ top: 5, right: 10, bottom: 20, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2750" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#A8A1B5", fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fill: "#A8A1B5", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {orgAvgMSI !== null && (
                    <ReferenceLine
                      y={orgAvgMSI}
                      stroke="#9B5DE5"
                      strokeDasharray="4 4"
                      label={{ value: `org avg (${orgAvgMSI})`, fill: "#B77AF2", fontSize: 10, position: "top" }}
                    />
                  )}
                  <Bar dataKey="msi" radius={[4, 4, 0, 0]}>
                    {data.currentMSIByTeam.map((entry) => (
                      <Cell
                        key={entry.departmentId || entry.name}
                        fill={
                          !entry.hasData
                            ? "#2A2750"
                            : entry.state === "burnout-risk"
                            ? "#B86B64"
                            : entry.state === "persistent"
                            ? "#7E4CC7"
                            : entry.state === "acute"
                            ? "#9B5DE5"
                            : "#4A9E7A"
                        }
                        fillOpacity={entry.hasData ? 0.85 : 0.4}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center border border-dashed border-border-p/40 rounded-xl">
                <p className="text-xs text-text-muted font-medium mb-1">No assessment data available yet</p>
                <p className="text-[11px] text-text-muted/60">
                  Daily check-ins completed by team members will populate these department bars dynamically.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Teams screen (Real MongoDB-backed) ────────────────────────────────────────

interface DepartmentTeamItem {
  departmentId: string
  name: string
  status: string
  employeeCount: number
  activeEmployeeCount: number
  participationRate: number
  recoveryEngagement: number
  currentMSI: number | null
  previousMSI: number | null
  changePercent: number | null
  trend: string
  stressState: string
  elevatedDuration: string
  hasData: boolean
}

function TeamsScreen({ onDetail }: { onDetail: (dept: DepartmentTeamItem) => void }) {
  const [departments, setDepartments] = useState<DepartmentTeamItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`${API_BASE}/api/hr/departments`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || `Failed to fetch teams: ${res.statusText}`)
      }
      const json = await res.json()
      if (json.success && Array.isArray(json.departments || json.data)) {
        setDepartments(json.departments || json.data)
      } else {
        throw new Error(json.message || "Unable to load team data")
      }
    } catch (err: any) {
      console.error("[HR-TEAMS] Error:", err)
      setError(err.message || "Unable to load team data. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  // Get department initials dynamically (e.g. "Customer Support" -> "CS" or "CU", "Engineering" -> "EN")
  function getDeptInitials(name: string) {
    if (!name) return "DP"
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 w-full max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-warm-white">Teams</h1>
          <p className="text-text-muted text-sm mt-1">Where should you look first?</p>
        </div>
      </div>

      {/* Loading state */}
      {loading && departments.length === 0 && (
        <div className="card-base p-12 text-center text-text-muted my-6">
          <div className="inline-block w-6 h-6 border-2 border-purple-core border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Loading teams...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="card-base p-8 border-c-warning/30 bg-midnight/90 mb-6 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-c-warning/15 border border-c-warning/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-c-warning" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-warm-white mb-2">Unable to load team data</h3>
          <p className="text-sm text-text-muted leading-relaxed mb-6">{error}</p>
          <button
            onClick={fetchTeams}
            className="btn-primary text-xs px-5 py-2.5 rounded-xl font-medium"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Empty State: No departments in organisation */}
      {!loading && !error && departments.length === 0 && (
        <div className="card-base p-12 text-center border border-dashed border-border-p/40 my-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-core/10 border border-purple-core/25 flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">🏢</span>
          </div>
          <h3 className="text-base font-semibold text-warm-white mb-1">No departments yet</h3>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            Departments will appear here once employees complete onboarding.
          </p>
        </div>
      )}

      {/* Teams Grid */}
      {!loading && departments.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {departments.map((t) => (
            <button
              key={t.departmentId || t.name}
              onClick={() => onDetail(t)}
              className="card-base p-5 text-left hover:border-border-s transition-all w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-elevated border border-border-p flex items-center justify-center">
                    <span className="font-mono-data text-xs text-text-muted">{getDeptInitials(t.name)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-warm-white">{t.name}</p>
                    <StateBadge state={t.hasData ? t.stressState : "normal"} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono-data text-2xl text-warm-white font-medium">
                    {t.hasData && t.currentMSI !== null ? t.currentMSI : "—"}
                  </p>
                  <p
                    className={`text-xs font-semibold ${
                      t.trend.startsWith("+")
                        ? "text-c-warning"
                        : t.trend.startsWith("−") || t.trend.startsWith("-")
                        ? "text-c-success"
                        : "text-text-muted"
                    }`}
                  >
                    {t.trend}
                  </p>
                </div>
              </div>

              {/* MSI progress bar */}
              <div className="h-1.5 bg-border-p rounded-full overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${t.hasData && t.currentMSI !== null ? Math.min(100, Math.max(0, t.currentMSI)) : 0}%`,
                    backgroundColor:
                      t.stressState === "burnout-risk"
                        ? "#B86B64"
                        : t.stressState === "persistent"
                        ? "#7E4CC7"
                        : t.stressState === "acute"
                        ? "#9B5DE5"
                        : "#4A9E7A",
                    opacity: t.hasData ? 0.85 : 0.2,
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-mono-data text-sm text-text-secondary">
                    {t.hasData || t.employeeCount > 0 ? `${t.participationRate}%` : "—"}
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5">Participation</p>
                </div>
                <div>
                  <p className="font-mono-data text-sm text-text-secondary">
                    {t.hasData ? `${t.recoveryEngagement}%` : "—"}
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5">Recovery engagement</p>
                </div>
                <div>
                  <p className="font-mono-data text-sm text-text-secondary">{t.elevatedDuration}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Elevated duration</p>
                </div>
              </div>

              {!t.hasData && (
                <p className="text-[10px] text-text-muted/60 text-center mt-3 pt-2 border-t border-border-p/20">
                  No assessment data yet · {t.employeeCount} employee{t.employeeCount === 1 ? "" : "s"} assigned
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface TeamDetailData {
  departmentId: string
  name: string
  state: string
  msi: number | null
  hasData: boolean
  trend: string
  duration: string
  recovery: number
  employeeCount: number
  topStressors: { label: string; pct: number }[]
  fourWeekTrend: { week: string; msi: number }[]
}

function TeamDetailScreen({
  department,
  onBack,
}: {
  department: DepartmentTeamItem | null
  onBack: () => void
}) {
  const [detail, setDetail] = useState<TeamDetailData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const deptId = department?.departmentId || department?.name || ""

  const fetchDetail = useCallback(async () => {
    if (!deptId) return
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`${API_BASE}/api/hr/departments/${encodeURIComponent(deptId)}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || `Failed to fetch team details: ${res.statusText}`)
      }
      const json = await res.json()
      if (json.success && json.data) {
        setDetail(json.data)
      } else {
        throw new Error(json.message || "Failed to load team details")
      }
    } catch (err: any) {
      console.error("[HR-TEAM-DETAIL] Error:", err)
      setError(err.message || "Unable to load team detail")
    } finally {
      setLoading(false)
    }
  }, [deptId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const name = detail?.name || department?.name || "Team"
  const state = detail?.state || department?.stressState || "normal"
  const msi = detail?.hasData && detail.msi !== null ? detail.msi : department?.hasData && department.currentMSI !== null ? department.currentMSI : null
  const trend = detail?.trend || department?.trend || "—"
  const duration = detail?.duration || department?.elevatedDuration || "—"
  const recovery = detail?.recovery ?? department?.recoveryEngagement ?? 0
  const topStressors = detail?.topStressors || []
  const fourWeekTrend = detail?.fourWeekTrend || []

  return (
    <div className="flex-1 overflow-y-auto p-8 w-full max-w-[1400px] mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-text-muted hover:text-text-secondary transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-medium">All teams</span>
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-warm-white mb-1">{name}</h1>
          <StateBadge state={msi !== null ? state : "normal"} />
        </div>
        <div className="text-right">
          <p className="font-mono-data text-4xl text-c-warning font-medium">{msi !== null ? msi : "—"}</p>
          <p className="text-sm text-text-muted mt-1">Current MSI</p>
        </div>
      </div>

      {loading && !detail && (
        <div className="card-base p-8 text-center text-text-muted mb-6">
          <div className="inline-block w-6 h-6 border-2 border-purple-core border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Loading team details...</p>
        </div>
      )}

      {error && !loading && (
        <div className="card-base p-6 border-c-warning/30 bg-midnight/90 mb-6 text-center max-w-md mx-auto">
          <p className="text-sm text-c-warning mb-3">{error}</p>
          <button onClick={fetchDetail} className="btn-primary text-xs px-4 py-2 rounded-xl">
            Retry
          </button>
        </div>
      )}

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KPICard label="Trend" value={trend} sub="vs previous period" color="text-c-warning" />
        <KPICard label="Persistence" value={duration} sub="Elevated duration" color="text-lavender-soft" />
        <KPICard label="Recovery engagement" value={msi !== null ? `${recovery}%` : "—"} sub="Used a reset this week" color="text-c-info" />
      </div>

      {/* Middle Row: Stressors + Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card-base p-5">
          <p className="text-xs text-text-muted font-medium mb-4">Top reported stressors</p>
          {topStressors.length > 0 ? (
            <div className="space-y-3">
              {topStressors.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary">{s.label}</span>
                    <span className="font-mono-data text-text-muted">{s.pct}%</span>
                  </div>
                  <div className="h-1 bg-border-p rounded-full overflow-hidden">
                    <div className="h-full bg-lavender-bright/60 rounded-full" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-text-muted border border-dashed border-border-p/40 rounded-xl">
              No stressor reports available for this department yet.
            </div>
          )}
        </div>

        <div className="card-base p-5">
          <p className="text-xs text-text-muted font-medium mb-3">Trend (4 weeks)</p>
          {fourWeekTrend.length > 0 && fourWeekTrend.some((d) => d.msi > 0) ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={fourWeekTrend} margin={{ top: 5, right: 5, bottom: 0, left: -30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2750" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "#A8A1B5", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#A8A1B5", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="msi" stroke="#C98850" strokeWidth={2} dot={{ fill: "#C98850", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-center text-xs text-text-muted border border-dashed border-border-p/40 rounded-xl">
              Insufficient weekly trend data yet.
            </div>
          )}
        </div>
      </div>

      {/* Recommended action card */}
      <div className="card-base p-6 border-purple-core/25">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-full bg-purple-core/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-core" />
          </div>
          <p className="text-xs font-medium text-lavender-soft">Recommended action</p>
        </div>
        <p className="text-text-secondary mb-4 leading-relaxed">
          {msi !== null && msi >= 61
            ? `Stress has remained elevated (${duration !== "—" ? duration : "recently"}) for ${name}. The pattern indicates persistent workload and priority strain. Consider scheduling a targeted recovery intervention or reviewing distribution.`
            : msi !== null && msi >= 41
            ? `${name} stress is currently in the acute zone (MSI ${msi}). Encourage team members to participate in midday Breathing and Priority Reset sessions.`
            : msi !== null
            ? `${name} is currently in a healthy stress state (MSI ${msi}). Continue monitoring weekly check-in participation and maintain current team cadence.`
            : `No assessment records found for ${name} yet. As team members complete daily check-ins, real-time stress intelligence and recommendations will appear here.`}
        </p>
        <div className="flex gap-3">
          <button className="btn-primary text-sm px-5 py-2.5">Create intervention</button>
          <button className="btn-ghost text-sm px-5 py-2.5">Schedule Reset Lab</button>
        </div>
      </div>
    </div>
  )
}

// ── Interventions screen ──────────────────────────────────────────────────────

interface InterventionItem {
  id: string
  name: string
  type: string
  category: string
  description?: string
  duration?: string
  status?: string
  sessions: number
  participants: number
  preMSI: number | null
  postMSI: number | null
  delta: number | null
  hasData: boolean
}

interface InterventionSummary {
  totalSessions: number
  totalParticipants: number
  averagePreMSI: number | null
  averagePostMSI: number | null
  averageDelta: number | null
}

function InterventionsScreen() {
  const [interventions, setInterventions] = useState<InterventionItem[]>([])
  const [summary, setSummary] = useState<InterventionSummary | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedDept, setSelectedDept] = useState<string>("all")
  const [dateRange, setDateRange] = useState<string>("all")
  const [departments, setDepartments] = useState<{ departmentId: string; name: string }[]>([])

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [createName, setCreateName] = useState("")
  const [createType, setCreateType] = useState("RESET_LAB")
  const [createCategory, setCreateCategory] = useState("Mindset")
  const [createDesc, setCreateDesc] = useState("")
  const [createDuration, setCreateDuration] = useState("10 min")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // 1. Fetch departments for dropdown
  useEffect(() => {
    async function loadDepts() {
      try {
        const token = localStorage.getItem("cq_token")
        const res = await fetch(`${API_BASE}/api/hr/departments?simple=true`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        })
        if (!res.ok) throw new Error("Failed to load departments")
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setDepartments(json.data)
        }
      } catch (err: any) {
        console.warn("[HR-INTERVENTIONS] Could not load departments:", err.message)
      }
    }
    loadDepts()
  }, [])

  // 2. Fetch interventions with active filters
  const fetchInterventions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("cq_token")
      const params = new URLSearchParams()
      if (selectedType !== "all") params.append("type", selectedType)
      if (selectedDept !== "all") params.append("departmentId", selectedDept)

      if (dateRange === "7d") {
        const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        params.append("from", d.toISOString())
      } else if (dateRange === "30d") {
        const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        params.append("from", d.toISOString())
      } else if (dateRange === "90d") {
        const d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        params.append("from", d.toISOString())
      }

      const res = await fetch(`${API_BASE}/api/hr/interventions?${params.toString()}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      })

      if (!res.ok) {
        throw new Error("Unable to load intervention data. Please try again.")
      }

      const json = await res.json()
      if (json.success && json.data) {
        setInterventions(json.data.interventions || [])
        setSummary(json.data.summary || null)
      } else {
        throw new Error(json.message || "Failed to parse intervention data.")
      }
    } catch (err: any) {
      console.error("[HR-INTERVENTIONS] Load error:", err.message)
      setError(err.message || "Unable to load intervention data. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [selectedType, selectedDept, dateRange])

  useEffect(() => {
    fetchInterventions()
  }, [fetchInterventions])

  // Handle Create Intervention Submit
  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!createName.trim()) {
      setCreateError("Please enter an intervention name.")
      return
    }

    setCreating(true)
    setCreateError(null)

    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`${API_BASE}/api/hr/interventions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          name: createName.trim(),
          type: createType,
          category: createCategory.trim(),
          description: createDesc.trim(),
          duration: createDuration.trim(),
          status: "Active",
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to create intervention.")
      }

      // Success
      setShowCreateModal(false)
      setCreateName("")
      setCreateDesc("")
      fetchInterventions()
    } catch (err: any) {
      setCreateError(err.message || "Error creating intervention.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 w-full max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-warm-white">Are interventions working?</h1>
          <p className="text-text-muted text-sm mt-1">
            Pre/post MSI response · Observational data
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <span>+</span>
          <span>Create new intervention</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card-elevated rounded-xl p-4">
            <p className="text-xs text-text-muted mb-1">Total sessions</p>
            <p className="font-mono-data text-2xl font-bold text-warm-white">{summary.totalSessions}</p>
          </div>
          <div className="card-elevated rounded-xl p-4">
            <p className="text-xs text-text-muted mb-1">Participants</p>
            <p className="font-mono-data text-2xl font-bold text-warm-white">{summary.totalParticipants}</p>
          </div>
          <div className="card-elevated rounded-xl p-4">
            <p className="text-xs text-text-muted mb-1">Average Pre-MSI</p>
            <p className="font-mono-data text-2xl font-bold text-c-warning">
              {summary.averagePreMSI != null ? summary.averagePreMSI : "—"}
            </p>
          </div>
          <div className="card-elevated rounded-xl p-4">
            <p className="text-xs text-text-muted mb-1">Avg Improvement</p>
            <p className={`font-mono-data text-2xl font-bold ${summary.averageDelta != null && summary.averageDelta < 0 ? "text-c-success" : "text-lavender-soft"}`}>
              {summary.averageDelta != null ? `${summary.averageDelta} MSI` : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-2xl bg-surface/50 border border-border-p">
        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Type:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-elevated border border-border-p text-warm-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-core"
          >
            <option value="all">All Types</option>
            <option value="RESET_LAB">Reset Labs</option>
            <option value="HUMAN_LISTENER">Human Listener</option>
            <option value="DUMP_BAG">Digital Dump Bag</option>
            <option value="GUIDED_EXERCISE">Guided Exercise</option>
            <option value="WORKSHOP">Workshops</option>
          </select>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Department:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-elevated border border-border-p text-warm-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-core"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.departmentId} value={d.departmentId}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Date Range:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-elevated border border-border-p text-warm-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-core"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-purple-core border-t-transparent animate-spin" />
          <p className="text-xs text-text-muted font-medium">Loading interventions...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="card-base p-8 text-center border-c-error/30 bg-c-error/5 mb-6">
          <p className="text-sm text-c-error font-medium mb-2">{error}</p>
          <button
            onClick={() => fetchInterventions()}
            className="btn-ghost text-xs px-4 py-2 mt-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && interventions.length === 0 && (
        <div className="card-base p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-purple-core/10 border border-purple-core/20 flex items-center justify-center mx-auto mb-4 text-2xl">
            🌱
          </div>
          <h3 className="text-lg font-semibold text-warm-white mb-2">No intervention data available yet</h3>
          <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
            Intervention impact and pre/post MSI response will appear dynamically once employees complete Reset Labs, Listener sessions, or Dump Bag exercises.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-xs px-5 py-2.5"
          >
            Create first intervention
          </button>
        </div>
      )}

      {/* Intervention Cards List */}
      {!loading && !error && interventions.length > 0 && (
        <div className="grid grid-cols-1 gap-5 mb-6">
          {interventions.map((inv) => (
            <div key={inv.id || inv.name} className="card-base p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-warm-white text-lg">{inv.name}</p>
                    <span className="text-[10px] uppercase font-mono-data px-2 py-0.5 rounded-md bg-purple-core/10 text-lavender-soft border border-purple-core/20">
                      {inv.category || inv.type}
                    </span>
                  </div>
                  <p className="text-text-muted text-sm">
                    {inv.sessions} {inv.sessions === 1 ? "session" : "sessions"} · {inv.participants} {inv.participants === 1 ? "participant" : "participants"}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className={`font-mono-data text-2xl font-medium ${inv.delta != null && inv.delta < 0 ? "text-c-success" : "text-lavender-soft"}`}>
                    {inv.delta != null ? `${inv.delta} MSI` : "—"}
                  </p>
                  <p className="text-xs text-text-muted">Average change</p>
                </div>
              </div>

              {inv.hasData ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <div className="text-center">
                      <div className="card-elevated rounded-xl p-3 mb-2">
                        <p className="font-mono-data text-2xl text-c-warning">
                          {inv.preMSI != null ? inv.preMSI : "—"}
                        </p>
                      </div>
                      <p className="text-xs text-text-muted">Pre-session MSI</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 32 32">
                        <path d="M6 16h20M20 10l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <div className="card-elevated rounded-xl p-3 mb-2">
                        <p className="font-mono-data text-2xl text-c-success">
                          {inv.postMSI != null ? inv.postMSI : "Pending"}
                        </p>
                      </div>
                      <p className="text-xs text-text-muted">Post-session MSI</p>
                    </div>
                  </div>

                  {/* Before/after bar */}
                  {inv.preMSI != null && (
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-muted">Before intervention</span>
                          <span className="font-mono-data text-c-warning">{inv.preMSI}</span>
                        </div>
                        <div className="h-2 bg-border-p rounded-full overflow-hidden">
                          <div className="h-full bg-c-warning/60 rounded-full transition-all" style={{ width: `${inv.preMSI}%` }} />
                        </div>
                      </div>
                      {inv.postMSI != null ? (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-text-muted">After intervention</span>
                            <span className="font-mono-data text-c-success">{inv.postMSI}</span>
                          </div>
                          <div className="h-2 bg-border-p rounded-full overflow-hidden">
                            <div className="h-full bg-c-success/60 rounded-full transition-all" style={{ width: `${inv.postMSI}%` }} />
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-text-muted italic pt-1">
                          Post-session MSI pending completion check-in data.
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-6 text-center border border-dashed border-border-p rounded-xl bg-surface/30 mb-2">
                  <p className="text-xs text-text-muted">No session records logged for this filter yet.</p>
                </div>
              )}

              <p className="text-xs text-text-muted mt-4 italic">
                Observational data only. These results represent average MSI change and do not establish causation.
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create New Intervention Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="card-base w-full max-w-lg p-6 bg-surface border border-border-p rounded-3xl shadow-2xl relative animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl text-warm-white">Create new intervention</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text-secondary text-sm p-1 transition-colors"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="bg-c-error/10 border border-c-error/30 rounded-xl p-3 mb-4 text-xs text-c-error">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">Intervention Name *</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Acoustic Unwind Workshop"
                  required
                  className="w-full bg-elevated border border-border-p rounded-xl px-3.5 py-2.5 text-sm text-warm-white placeholder-text-muted/60 focus:outline-none focus:border-purple-core transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1 font-medium">Type</label>
                  <select
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value)}
                    className="w-full bg-elevated border border-border-p rounded-xl px-3 py-2.5 text-sm text-warm-white focus:outline-none focus:border-purple-core"
                  >
                    <option value="RESET_LAB">Reset Lab</option>
                    <option value="WORKSHOP">Workshop</option>
                    <option value="GUIDED_EXERCISE">Guided Exercise</option>
                    <option value="HUMAN_LISTENER">Human Listener</option>
                    <option value="DUMP_BAG">Dump Bag</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1 font-medium">Category</label>
                  <input
                    type="text"
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    placeholder="e.g. Music, Mindfulness"
                    className="w-full bg-elevated border border-border-p rounded-xl px-3.5 py-2.5 text-sm text-warm-white placeholder-text-muted/60 focus:outline-none focus:border-purple-core"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">Duration</label>
                <input
                  type="text"
                  value={createDuration}
                  onChange={(e) => setCreateDuration(e.target.value)}
                  placeholder="e.g. 15 min"
                  className="w-full bg-elevated border border-border-p rounded-xl px-3.5 py-2.5 text-sm text-warm-white placeholder-text-muted/60 focus:outline-none focus:border-purple-core"
                />
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">Description</label>
                <textarea
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Purpose and details of this intervention..."
                  rows={3}
                  className="w-full bg-elevated border border-border-p rounded-xl px-3.5 py-2 text-sm text-warm-white placeholder-text-muted/60 focus:outline-none focus:border-purple-core resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-p">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost text-xs px-4 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !createName.trim()}
                  className="btn-primary text-xs px-5 py-2.5 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Save Intervention"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Reports screen ────────────────────────────────────────────────────────────

// ── Reports screen ────────────────────────────────────────────────────────────

interface ReportCard {
  id: string
  name: string
  period: string
  desc: string
  type: string
  status: "Ready" | "Insufficient data"
  ready: boolean
}

interface ReportDetailData {
  organisationName: string
  period: string
  generatedDate: string
  overview: {
    currentMSI: number | null
    previousMSI: number | null
    change: number | null
    participationRate: number
    totalEmployees: number
    hasSufficientData: boolean
  }
  stressStates: { state: string; pct: number; count: number; color: string }[]
  departments: {
    departmentId: string
    name: string
    employeeCount: number
    currentMSI: number | null
    previousMSI: number | null
    changePercent: number | null
    state: string
  }[]
  trend: { label: string; msi: number }[]
  interventions: {
    name: string
    category: string
    type: string
    sessions: number
    participants: number
    preMSI: number | null
    postMSI: number | null
    delta: number | null
    hasData: boolean
  }[]
  aiInsights: {
    executiveSummary: string
    keyObservations: string[]
    departmentInsights: { departmentId: string; insight: string }[]
    interventionInsights: { intervention: string; insight: string }[]
    recommendedActions: string[]
  }
}

function ReportsScreen() {
  const [reportCards, setReportCards] = useState<ReportCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Report View Modal
  const [activeReport, setActiveReport] = useState<ReportCard | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<ReportDetailData | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  // Schedule Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleType, setScheduleType] = useState("Monthly Wellbeing Report")
  const [scheduleFreq, setScheduleFreq] = useState("monthly")
  const [scheduleEmail, setScheduleEmail] = useState("")
  const [scheduling, setScheduling] = useState(false)
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null)

  // Load report cards from backend
  const fetchReportCards = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`${API_BASE}/api/hr/reports`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      })
      if (!res.ok) throw new Error("Unable to load workforce reports.")
      const json = await res.json()
      if (json.success && Array.isArray(json.reports)) {
        setReportCards(json.reports)
      } else {
        throw new Error("Invalid response format.")
      }
    } catch (err: any) {
      console.error("[HR-REPORTS] Fetch error:", err.message)
      setError(err.message || "Unable to load reports.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReportCards()
  }, [fetchReportCards])

  // Open & Load Report Details
  async function handleOpenReport(report: ReportCard) {
    setActiveReport(report)
    setDetailLoading(true)
    setDetailError(null)
    try {
      const token = localStorage.getItem("cq_token")
      const typeParam = report.type.toLowerCase() === "quarterly" ? "quarterly" : "monthly"
      const res = await fetch(`${API_BASE}/api/hr/reports/data?reportType=${typeParam}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      })
      if (!res.ok) throw new Error("Unable to compile report data.")
      const json = await res.json()
      if (json.success && json.data) {
        setDetailData(json.data)
      } else {
        throw new Error("Failed to load report analytics.")
      }
    } catch (err: any) {
      console.error("[HR-REPORT-DETAIL] Load error:", err.message)
      setDetailError(err.message || "Failed to load report analytics.")
    } finally {
      setDetailLoading(false)
    }
  }

  // Download DOCX Report from backend
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null)
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null)

  async function handleDownloadDocx(report: ReportCard) {
    const reportKey = report.id || "monthly-wellbeing"
    setDownloadingReportId(reportKey)
    try {
      const token = localStorage.getItem("cq_token")
      const typeParam = report.type.toLowerCase() === "quarterly" ? "quarterly" : "monthly"
      const res = await fetch(`${API_BASE}/api/hr/reports/${reportKey}/export/docx?reportType=${typeParam}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || "Failed to generate DOCX report.")
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `CortiQuant_${report.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setDownloadSuccessMsg(`"${report.name}" DOCX generated & downloaded successfully.`)
      setTimeout(() => setDownloadSuccessMsg(null), 4000)
    } catch (err: any) {
      console.error("[HR-REPORT-DOCX] Download error:", err.message)
      alert(err.message || "Failed to download DOCX report.")
    } finally {
      setDownloadingReportId(null)
    }
  }

  // Print/PDF Export Handler
  function handleExportPDF() {
    window.print()
  }

  // Schedule Report Handler
  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault()
    setScheduling(true)
    setScheduleMsg(null)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`${API_BASE}/api/hr/reports/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          reportType: scheduleType,
          frequency: scheduleFreq,
          recipientEmail: scheduleEmail,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to save schedule.")
      setScheduleMsg("Report schedule created successfully!")
      setTimeout(() => {
        setShowScheduleModal(false)
        setScheduleMsg(null)
      }, 1500)
    } catch (err: any) {
      setScheduleMsg(`Error: ${err.message}`)
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 w-full max-w-[1400px] mx-auto">
      {/* Toast Notification */}
      {downloadSuccessMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-elevated border border-c-success/40 text-warm-white px-5 py-3 rounded-2xl shadow-xl animate-fade-up">
          <div className="w-2 h-2 rounded-full bg-c-success" />
          <span className="text-xs font-medium">{downloadSuccessMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-warm-white">Workforce Reports</h1>
          <p className="text-text-muted text-sm mt-1">Executive-ready editable reports & compliance documents</p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="btn-ghost text-sm px-4 py-2 cursor-pointer flex items-center gap-1.5"
        >
          <span>⏰</span>
          <span>Schedule report</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-purple-core border-t-transparent animate-spin" />
          <p className="text-xs text-text-muted font-medium">Loading reports...</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="card-base p-8 text-center border-c-error/30 bg-c-error/5 mb-6">
          <p className="text-sm text-c-error font-medium mb-2">{error}</p>
          <button onClick={() => fetchReportCards()} className="btn-ghost text-xs px-4 py-2 mt-2">
            Retry
          </button>
        </div>
      )}

      {/* Reports Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportCards.map((r) => (
            <div key={r.id} className="card-base p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="bg-purple-core/10 border border-purple-core/25 text-lavender-soft text-[10px] font-medium px-2 py-0.5 rounded-full">
                  {r.type}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${r.ready ? "bg-c-success" : "bg-c-warning"}`} />
                  <span className={`text-xs font-medium ${r.ready ? "text-c-success" : "text-c-warning"}`}>
                    {r.status}
                  </span>
                </div>
              </div>
              <p className="font-semibold text-warm-white mb-1">{r.name}</p>
              <p className="text-xs text-text-muted mb-1">{r.period}</p>
              <p className="text-sm text-text-muted leading-relaxed flex-1">{r.desc}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => handleOpenReport(r)}
                  className="btn-primary text-xs px-3 py-2 flex-1 min-w-[90px] cursor-pointer font-medium"
                >
                  View Report
                </button>
                <button
                  onClick={() => handleDownloadDocx(r)}
                  disabled={downloadingReportId === r.id}
                  className="btn-ghost text-xs px-3 py-2 flex items-center justify-center gap-1.5 cursor-pointer border border-purple-core/30 text-lavender-soft hover:bg-purple-core/10"
                >
                  {downloadingReportId === r.id ? (
                    <>
                      <div className="w-3 h-3 rounded-full border border-purple-core border-t-transparent animate-spin" />
                      <span>Generating DOCX...</span>
                    </>
                  ) : (
                    <>
                      <span>📄</span>
                      <span>Download DOCX</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Report Detail Modal ───────────────────────────────────────────────── */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto modal-backdrop-screen print:static print:p-0 print:bg-white print:overflow-visible print:z-auto print:block">
          <div className="card-base report-print-container w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 bg-surface border border-border-p rounded-3xl shadow-2xl relative animate-fade-up print:static print:m-0 print:p-0 print:max-h-none print:w-full print:max-w-none print:border-none print:shadow-none print:bg-white print:overflow-visible">
            
            {/* ── PRINT-ONLY PROFESSIONAL HEADER (A4) ───────────────────────── */}
            <div className="hidden print:flex print-header items-center justify-between pb-4 mb-6 border-b-2 border-[#7E4CC7] w-full">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#7E4CC7] flex items-center justify-center text-white font-bold text-base shadow-sm">
                  CQ
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10pt] font-black tracking-widest text-[#7E4CC7] uppercase">
                      CORTIQUANT INTELLIGENCE
                    </span>
                    <span className="text-gray-400 text-xs">·</span>
                    <span className="text-xs font-semibold text-gray-600">Workforce Wellbeing Analytics</span>
                  </div>
                  <h1 className="text-[18pt] font-bold text-gray-900 leading-tight m-0 p-0 font-display">
                    {activeReport.name}
                  </h1>
                </div>
              </div>
              <div className="text-right text-[8.5pt] text-gray-600 space-y-0.5">
                <p><span className="font-semibold text-gray-800">Organisation:</span> {detailData?.organisationName || "Organisation"}</p>
                <p><span className="font-semibold text-gray-800">Reporting Period:</span> {activeReport.period}</p>
                <p><span className="font-semibold text-gray-800">Generated:</span> {detailData?.generatedDate || new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
              </div>
            </div>

            {/* Modal Screen Header (Hidden in Print) */}
            <div className="flex items-start justify-between border-b border-border-p pb-5 mb-6 no-print print:hidden">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-purple-core">
                    CORTIQUANT INTELLIGENCE
                  </span>
                  <span className="text-text-muted text-xs">·</span>
                  <span className="text-xs text-text-muted">{detailData?.organisationName || "Organisation"}</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-warm-white">{activeReport.name}</h2>
                <p className="text-xs text-text-muted mt-1">
                  Reporting Period: <span className="text-warm-white font-medium">{activeReport.period}</span> · Generated: {detailData?.generatedDate || "Today"}
                </p>
              </div>
              <div className="flex items-center gap-2 print:hidden no-print">
                <button
                  onClick={() => handleDownloadDocx(activeReport)}
                  disabled={downloadingReportId === activeReport.id}
                  className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5 cursor-pointer border border-purple-core/40 text-lavender-soft hover:bg-purple-core/10"
                >
                  {downloadingReportId === activeReport.id ? (
                    <>
                      <div className="w-3 h-3 rounded-full border border-purple-core border-t-transparent animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span>📄</span>
                      <span>Download DOCX</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportPDF}
                  className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️</span>
                  <span>Print / PDF</span>
                </button>
                <button
                  onClick={() => {
                    setActiveReport(null)
                    setDetailData(null)
                  }}
                  className="text-text-muted hover:text-text-secondary text-base p-2 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            {detailLoading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 no-print">
                <div className="w-8 h-8 rounded-full border-2 border-purple-core border-t-transparent animate-spin" />
                <p className="text-xs text-text-muted font-medium">Generating executive workforce insights...</p>
              </div>
            ) : detailError ? (
              <div className="p-6 text-center text-c-error bg-c-error/10 border border-c-error/30 rounded-2xl">
                {detailError}
              </div>
            ) : detailData ? (
              <div className="space-y-8 print:space-y-6">
                {/* 1. Executive Summary */}
                <div className="card-elevated print-card p-6 rounded-2xl border border-purple-core/30 bg-purple-core/5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">✨</span>
                    <h3 className="text-base font-semibold text-warm-white print-section-title">Executive Summary</h3>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed mb-4">
                    {detailData.aiInsights.executiveSummary}
                  </p>
                  {detailData.aiInsights.keyObservations.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-purple-core/20">
                      <p className="text-xs font-semibold text-lavender-soft uppercase tracking-wider">
                        Key Observations:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-text-muted">
                        {detailData.aiInsights.keyObservations.map((obs, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {obs}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 2. Workforce Stress Overview */}
                <div className="print-card p-5 rounded-2xl border border-border-p">
                  <h3 className="text-sm font-semibold text-warm-white uppercase tracking-wider mb-4 print-section-title">
                    Workforce Stress Overview
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="card-base p-4 bg-surface/60">
                      <p className="text-xs text-text-muted mb-1">Current MSI</p>
                      <p className="font-mono-data text-2xl font-bold text-warm-white">
                        {detailData.overview.currentMSI != null ? detailData.overview.currentMSI : "—"}
                      </p>
                    </div>
                    <div className="card-base p-4 bg-surface/60">
                      <p className="text-xs text-text-muted mb-1">Previous Period</p>
                      <p className="font-mono-data text-2xl font-bold text-text-secondary">
                        {detailData.overview.previousMSI != null ? detailData.overview.previousMSI : "—"}
                      </p>
                    </div>
                    <div className="card-base p-4 bg-surface/60">
                      <p className="text-xs text-text-muted mb-1">Period Change</p>
                      <p className={`font-mono-data text-2xl font-bold ${detailData.overview.change != null && detailData.overview.change < 0 ? "text-c-success" : "text-lavender-soft"}`}>
                        {detailData.overview.change != null ? `${detailData.overview.change > 0 ? "+" : ""}${detailData.overview.change} MSI` : "—"}
                      </p>
                    </div>
                    <div className="card-base p-4 bg-surface/60">
                      <p className="text-xs text-text-muted mb-1">Participation</p>
                      <p className="font-mono-data text-2xl font-bold text-c-info">
                        {detailData.overview.participationRate}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Stress State Distribution */}
                <div className="print-card p-5 rounded-2xl border border-border-p">
                  <h3 className="text-sm font-semibold text-warm-white uppercase tracking-wider mb-4 print-section-title">
                    Stress State Distribution
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {detailData.stressStates.map((s) => (
                      <div key={s.state} className="card-base p-4 flex flex-col justify-between bg-surface/60">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            <p className="text-xs text-text-muted font-medium">{s.state}</p>
                          </div>
                          <p className="font-mono-data text-2xl font-bold text-warm-white">{s.pct}%</p>
                        </div>
                        <p className="text-[11px] text-text-muted mt-2">{s.count} {s.count === 1 ? "check-in" : "check-ins"}</p>
                      </div>
                    ))}
                  </div>
                  <div className="h-2 rounded-full overflow-hidden flex bg-border-p print:h-3 print:border print:border-gray-200">
                    {detailData.stressStates.map((s) => (
                      <div key={s.state} style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                    ))}
                  </div>
                </div>

                {/* 4. Department Analysis (Print page-break-friendly block) */}
                <div className="print-card p-5 rounded-2xl border border-border-p">
                  <h3 className="text-sm font-semibold text-warm-white uppercase tracking-wider mb-4 print-section-title">
                    Department Stress Analysis
                  </h3>
                  <div className="overflow-x-auto rounded-2xl border border-border-p print:border-none print:overflow-visible">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface/80 text-text-muted border-b border-border-p">
                        <tr>
                          <th className="p-3.5">Department</th>
                          <th className="p-3.5">Dept ID</th>
                          <th className="p-3.5 text-center">Employees</th>
                          <th className="p-3.5 text-center">Current MSI</th>
                          <th className="p-3.5 text-center">Change</th>
                          <th className="p-3.5 text-right">Stress State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-p">
                        {detailData.departments.map((d) => (
                          <tr key={d.departmentId} className="hover:bg-surface/40 transition-colors">
                            <td className="p-3.5 font-semibold text-warm-white">{d.name}</td>
                            <td className="p-3.5 font-mono-data text-text-muted">{d.departmentId}</td>
                            <td className="p-3.5 text-text-secondary text-center">{d.employeeCount}</td>
                            <td className="p-3.5 font-mono-data font-medium text-warm-white text-center">
                              {d.currentMSI != null ? d.currentMSI : "—"}
                            </td>
                            <td className={`p-3.5 font-mono-data text-center ${d.changePercent != null && d.changePercent < 0 ? "text-c-success" : "text-text-muted"}`}>
                              {d.changePercent != null ? `${d.changePercent > 0 ? "+" : ""}${d.changePercent}%` : "—"}
                            </td>
                            <td className="p-3.5 text-right capitalize">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium inline-block ${
                                d.state === "normal"
                                  ? "bg-c-success/15 text-c-success print:bg-emerald-50 print:text-emerald-800"
                                  : d.state === "acute"
                                  ? "bg-purple-core/15 text-lavender-soft print:bg-purple-50 print:text-purple-800"
                                  : d.state === "persistent"
                                  ? "bg-c-warning/15 text-c-warning print:bg-amber-50 print:text-amber-800"
                                  : "bg-c-error/15 text-c-error print:bg-rose-50 print:text-rose-800"
                              }`}>
                                {d.state}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Intervention Impact */}
                <div className="print-card p-5 rounded-2xl border border-border-p">
                  <h3 className="text-sm font-semibold text-warm-white uppercase tracking-wider mb-4 print-section-title">
                    Intervention & Recovery Impact
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {detailData.interventions.map((inv) => (
                      <div key={inv.name} className="card-base p-4 bg-surface/60">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-warm-white text-sm">{inv.name}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-border-p text-text-muted">
                            {inv.category}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mb-3">
                          {inv.sessions} sessions · {inv.participants} participants
                        </p>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-border-p">
                          <span className="text-text-muted">Avg Response:</span>
                          <span className={`font-mono-data font-semibold ${inv.delta != null && inv.delta < 0 ? "text-c-success" : "text-lavender-soft"}`}>
                            {inv.delta != null ? `${inv.delta} MSI` : "Pending data"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. AI Recommended Actions */}
                {detailData.aiInsights.recommendedActions.length > 0 && (
                  <div className="card-elevated print-card p-6 rounded-2xl border border-c-info/30 bg-c-info/5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🎯</span>
                      <h3 className="text-base font-semibold text-warm-white print-section-title">Recommended Actions</h3>
                    </div>
                    <div className="space-y-2.5">
                      {detailData.aiInsights.recommendedActions.map((action, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-text-secondary leading-relaxed">
                          <span className="text-c-info font-bold mt-0.5">•</span>
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. Methodology / Disclaimer */}
                <div className="p-4 rounded-xl bg-surface/40 border border-border-p text-[11px] text-text-muted leading-relaxed italic print:bg-gray-50 print:border-gray-200 print:text-gray-500">
                  Methodology & Disclaimer: These insights describe observed statistical patterns in aggregated workforce data. They do not establish causation, provide individual clinical diagnostics, or evaluate personal psychological records.
                </div>

                {/* ── PRINT-ONLY PROFESSIONAL FOOTER (A4) ────────────────────── */}
                <div className="hidden print:flex print-footer items-center justify-between pt-4 mt-8 border-t border-gray-200 text-[8pt] text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">CortiQuant</span>
                    <span>·</span>
                    <span>Workforce Wellbeing Intelligence</span>
                  </div>
                  <div>
                    <span>Aggregated data only · Privacy protected</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Schedule Report Modal ────────────────────────────────────────────── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="card-base w-full max-w-md p-6 bg-surface border border-border-p rounded-3xl shadow-2xl relative animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl text-warm-white">Schedule Report</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-text-muted hover:text-text-secondary text-sm p-1 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {scheduleMsg && (
              <div className={`p-3 rounded-xl text-xs mb-4 ${scheduleMsg.startsWith("Error") ? "bg-c-error/10 text-c-error border border-c-error/30" : "bg-c-success/10 text-c-success border border-c-success/30"}`}>
                {scheduleMsg}
              </div>
            )}

            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">Report Type</label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value)}
                  className="w-full bg-elevated border border-border-p rounded-xl px-3 py-2.5 text-sm text-warm-white focus:outline-none focus:border-purple-core"
                >
                  <option value="Monthly Wellbeing Report">Monthly Wellbeing Report</option>
                  <option value="Quarterly Workforce Stress Summary">Quarterly Workforce Stress Summary</option>
                  <option value="Intervention Impact Report">Intervention Impact Report</option>
                  <option value="Workforce Insights Report">Workforce Insights Report</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">Frequency</label>
                <select
                  value={scheduleFreq}
                  onChange={(e) => setScheduleFreq(e.target.value)}
                  className="w-full bg-elevated border border-border-p rounded-xl px-3 py-2.5 text-sm text-warm-white focus:outline-none focus:border-purple-core"
                >
                  <option value="monthly">Monthly (1st of each month)</option>
                  <option value="quarterly">Quarterly (Start of quarter)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">Recipient Email</label>
                <input
                  type="email"
                  value={scheduleEmail}
                  onChange={(e) => setScheduleEmail(e.target.value)}
                  placeholder="hr-admin@yourcompany.com"
                  required
                  className="w-full bg-elevated border border-border-p rounded-xl px-3.5 py-2.5 text-sm text-warm-white placeholder-text-muted/60 focus:outline-none focus:border-purple-core"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-p">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="btn-ghost text-xs px-4 py-2.5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduling || !scheduleEmail.trim()}
                  className="btn-primary text-xs px-5 py-2.5 disabled:opacity-50 cursor-pointer"
                >
                  {scheduling ? "Scheduling..." : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Approval Queue ────────────────────────────────────────────────────────────

const API_BASE = ""

type ApprovalStatus = "pending" | "approved" | "rejected"

interface ParticipantProfile {
  D1?: string | null
  D2?: string | null
  D3?: string | null
  D4?: string | null
  D5?: string | null
  D6?: string | null
  D7?: string | null
  D8?: string | null
}

interface ApprovalRequest {
  id: string       // MongoDB _id
  employeeId: string
  name: string
  username: string
  email: string
  department: string
  departmentId?: string | null
  organisation?: string
  role: string
  submittedAt: string
  onboardingCompletedAt?: string | null
  onboardingStatus?: string
  orgCode: string
  status: ApprovalStatus
  rejectionReason?: string | null
  participantProfile?: ParticipantProfile | null
}

interface QueueStats {
  pendingCount: number
  approvedToday: number
  rejectedToday: number
  avgApprovalTimeHours: string
}

function ApprovalQueueScreen() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [stats, setStats] = useState<QueueStats>({
    pendingCount: 0,
    approvedToday: 0,
    rejectedToday: 0,
    avgApprovalTimeHours: "0.0h",
  })
  const [search, setSearch]     = useState("")
  const [filter, setFilter]     = useState<ApprovalStatus | "all">("pending")
  const [sort, setSort]         = useState<"newest" | "oldest" | "name-asc" | "name-desc">("newest")
  const [loadingQueue, setLoadingQueue] = useState(true)

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)
  const [rejectingRequest, setRejectingRequest] = useState<ApprovalRequest | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev))
    }, 4000)
  }

  const fetchQueue = useCallback(async () => {
    const token = localStorage.getItem("cq_token")
    if (!token) {
      setLoadingQueue(false)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/hr/approval-queue?status=all`, {
        headers: { "Authorization": `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        const mapped: ApprovalRequest[] = data.data.map((u: {
          id: string
          employeeId?: string
          name: string
          username?: string
          email?: string
          department?: string
          departmentId?: string
          organisation?: string
          role?: string
          organisationCode?: string
          status: string
          createdAt: string
          submittedAt?: string
          onboardingCompletedAt?: string
          onboardingStatus?: string
          rejectionReason?: string
          participantProfile?: ParticipantProfile
        }) => ({
          id: u.id,
          employeeId: u.employeeId && u.employeeId !== "Pending ID" ? u.employeeId : "Pending ID",
          name: u.name,
          username: u.username && u.username !== "—" ? u.username : "",
          email: u.email && u.email !== "—" ? u.email : "",
          department: u.department || "Unassigned",
          departmentId: u.departmentId || null,
          organisation: u.organisation || "Organisation",
          role: u.role || "Employee",
          submittedAt: u.submittedAt || u.createdAt ? new Date(u.submittedAt || u.createdAt).toLocaleString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          }).replace(",", "") : "Recently",
          onboardingCompletedAt: u.onboardingCompletedAt ? new Date(u.onboardingCompletedAt).toLocaleString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          }).replace(",", "") : null,
          onboardingStatus: u.onboardingStatus || "Completed",
          orgCode: u.organisationCode || "—",
          status: (u.status?.toLowerCase() ?? "pending") as ApprovalStatus,
          rejectionReason: u.rejectionReason || null,
          participantProfile: u.participantProfile || null,
        }))
        setRequests(mapped)

        if (data.stats) {
          setStats({
            pendingCount: Number(data.stats.pendingCount || 0),
            approvedToday: Number(data.stats.approvedToday || 0),
            rejectedToday: Number(data.stats.rejectedToday || 0),
            avgApprovalTimeHours: String(data.stats.avgApprovalTimeHours || "0.0h"),
          })
        }
      }
    } catch (err) {
      console.error("[HR QUEUE] Fetch failed:", err)
    } finally {
      setLoadingQueue(false)
    }
  }, [])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  async function approve(id: string) {
    const token = localStorage.getItem("cq_token")
    try {
      const res = await fetch(`${API_BASE}/api/hr/approve/${id}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success && data.user) {
        showToast("Employee approved successfully.")
        setRequests((prev) => prev.map((r) => r.id === id ? {
          ...r,
          status: "approved",
          employeeId: data.user.employeeId || r.employeeId,
        } : r))
        if (selectedRequest?.id === id) {
          setSelectedRequest((prev) => prev ? {
            ...prev,
            status: "approved",
            employeeId: data.user.employeeId || prev.employeeId,
          } : null)
        }
        fetchQueue()
      } else {
        showToast(data.message || "Approval failed.")
      }
    } catch {
      showToast("Network error approving employee.")
      fetchQueue()
    }
  }

  async function confirmReject() {
    if (!rejectingRequest) return
    const id = rejectingRequest.id
    const token = localStorage.getItem("cq_token")

    try {
      const res = await fetch(`${API_BASE}/api/hr/reject/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        showToast("Employee rejected.")
        setRequests((prev) => prev.map((r) => r.id === id ? {
          ...r,
          status: "rejected",
          rejectionReason: rejectReason.trim() || null,
        } : r))
        if (selectedRequest?.id === id) {
          setSelectedRequest((prev) => prev ? {
            ...prev,
            status: "rejected",
            rejectionReason: rejectReason.trim() || null,
          } : null)
        }
        setRejectingRequest(null)
        setRejectReason("")
        fetchQueue()
      } else {
        showToast(data.message || "Rejection failed.")
      }
    } catch {
      showToast("Network error rejecting employee.")
      fetchQueue()
    }
  }

  const visible = requests
    .filter((r) => {
      if (filter === "all") return true
      return r.status === filter
    })
    .filter((r) => {
      const q = search.toLowerCase().trim()
      if (!q) return true
      return (
        r.name.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.employeeId.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sort === "newest") return b.id.localeCompare(a.id)
      if (sort === "oldest") return a.id.localeCompare(b.id)
      if (sort === "name-asc") return a.name.localeCompare(b.name)
      if (sort === "name-desc") return b.name.localeCompare(a.name)
      return 0
    })

  return (
    <div className="flex-1 overflow-y-auto p-8 w-full max-w-[1400px] mx-auto relative">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-elevated border border-purple-core/40 shadow-2xl rounded-2xl px-5 py-3 text-sm text-warm-white flex items-center gap-3 animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-purple-core" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-text-muted hover:text-warm-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-warm-white">Employee Approval Queue</h1>
          <p className="text-text-muted text-sm mt-1">Review and manage employee workspace access requests.</p>
        </div>
        <button
          onClick={() => fetchQueue()}
          disabled={loadingQueue}
          className="flex items-center gap-2 px-4 py-2 bg-elevated border border-border-p rounded-xl text-sm text-text-secondary hover:border-border-s transition-colors cursor-pointer disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${loadingQueue ? "animate-spin" : ""}`} fill="none" viewBox="0 0 16 16">
            <path d="M13 8A5 5 0 112.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M2 2v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {loadingQueue ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Pending requests",   value: String(stats.pendingCount),       sub: "Requires review",            color: stats.pendingCount > 0 ? "text-c-warning" : "text-warm-white" },
          { label: "Approved today",     value: String(stats.approvedToday),     sub: "Active workspace users",     color: stats.approvedToday > 0 ? "text-c-success" : "text-warm-white" },
          { label: "Rejected today",     value: String(stats.rejectedToday),     sub: "Workspace access denied",    color: stats.rejectedToday > 0 ? "text-c-critical" : "text-warm-white" },
          { label: "Avg approval time",  value: stats.avgApprovalTimeHours,      sub: "Based on today's approvals", color: "text-lavender-soft" },
        ].map((k) => (
          <div key={k.label} className="card-base p-5">
            <p className="text-xs text-text-muted font-medium mb-3">{k.label}</p>
            <p className={`font-mono-data text-3xl font-medium ${k.color} mb-1`}>{k.value}</p>
            <p className="text-xs text-text-muted">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 16 16">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, username, employee ID or department..."
            className="w-full bg-elevated border border-border-p rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-secondary placeholder-text-muted/60 focus:outline-none focus:border-border-s transition-colors"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ApprovalStatus | "all")}
          className="bg-elevated border border-border-p rounded-xl px-3 py-2.5 text-sm text-text-secondary focus:outline-none focus:border-border-s transition-colors cursor-pointer"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "newest" | "oldest" | "name-asc" | "name-desc")}
          className="bg-elevated border border-border-p rounded-xl px-3 py-2.5 text-sm text-text-secondary focus:outline-none focus:border-border-s transition-colors cursor-pointer"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
        </select>
      </div>

      {/* Request list */}
      {visible.length === 0 ? (
        <div className="card-base flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-core/10 border border-purple-core/20 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-purple-core" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M16 14l1.5 1.5L20 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-base font-semibold text-warm-white mb-1">No {filter === "all" ? "" : filter} requests</p>
          <p className="text-sm text-text-muted">All employee signup requests have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((req) => (
            <div key={req.id} className="card-base p-5 flex items-center gap-5 hover:border-border-s transition-all">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-purple-core/15 border border-purple-core/25 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-lavender-soft">
                  {req.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedRequest(req)}>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-warm-white hover:text-lavender-soft transition-colors">{req.name}</p>
                  <span className="text-xs text-lavender-bright font-mono-data bg-purple-core/10 px-2 py-0.5 rounded-md border border-purple-core/20">
                    {req.employeeId !== "Pending ID" ? req.employeeId : "Pending ID"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  {req.username && <span>@{req.username}</span>}
                  {req.username && req.email && <span>•</span>}
                  {req.email && <span>{req.email}</span>}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-text-secondary border border-border-p rounded-full px-2 py-0.5 bg-surface">{req.department}</span>
                  {req.departmentId && (
                    <span className="text-[11px] font-mono-data text-lavender-soft/80 border border-border-p rounded-full px-2 py-0.5">{req.departmentId}</span>
                  )}
                  <span className="text-xs text-text-muted border border-border-p rounded-full px-2 py-0.5">{req.role}</span>
                  <span className="text-xs text-text-muted">Submitted {req.submittedAt}</span>
                </div>
              </div>

              {/* View details button */}
              <button
                onClick={() => setSelectedRequest(req)}
                className="px-3 py-2 rounded-xl border border-border-p text-text-secondary text-xs font-medium hover:border-purple-core/40 hover:text-warm-white transition-colors cursor-pointer flex-shrink-0"
              >
                View Details
              </button>

              {/* Status or actions */}
              {req.status === "pending" ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      setRejectingRequest(req)
                      setRejectReason("")
                    }}
                    className="px-4 py-2 rounded-xl border border-c-critical/40 text-c-critical text-sm font-medium hover:bg-c-critical/10 transition-colors cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approve(req.id)}
                    className="px-4 py-2 rounded-xl bg-purple-core text-warm-white text-sm font-medium hover:bg-purple-primary transition-colors cursor-pointer"
                  >
                    Approve
                  </button>
                </div>
              ) : (
                <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  req.status === "approved"
                    ? "bg-c-success/10 text-c-success border-c-success/25"
                    : "bg-c-critical/10 text-c-critical border-c-critical/25"
                }`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  {req.status === "approved" ? "Approved" : "Rejected"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── View Details Modal ── */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border-s rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-border-p pb-4 mb-5">
              <div>
                <h3 className="text-xl font-display text-warm-white">{selectedRequest.name}</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {selectedRequest.username ? `@${selectedRequest.username}` : ""} {selectedRequest.email ? `• ${selectedRequest.email}` : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-text-muted hover:text-warm-white p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {/* General Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6 bg-elevated/40 p-4 rounded-xl border border-border-p text-sm">
              <div>
                <span className="text-text-muted text-xs block">Organisation</span>
                <span className="text-warm-white font-medium">{selectedRequest.organisation}</span>
              </div>
              <div>
                <span className="text-text-muted text-xs block">Employee ID</span>
                <span className="font-mono-data text-lavender-bright font-medium">{selectedRequest.employeeId}</span>
              </div>
              <div>
                <span className="text-text-muted text-xs block">Department</span>
                <span className="text-warm-white font-medium">{selectedRequest.department}</span>
              </div>
              <div>
                <span className="text-text-muted text-xs block">Department ID</span>
                <span className="font-mono-data text-text-secondary">{selectedRequest.departmentId || "DEP-000"}</span>
              </div>
              <div>
                <span className="text-text-muted text-xs block">Submitted At</span>
                <span className="text-text-secondary text-xs">{selectedRequest.submittedAt}</span>
              </div>
              <div>
                <span className="text-text-muted text-xs block">Onboarding Status</span>
                <span className="text-c-success text-xs font-semibold">
                  {selectedRequest.onboardingStatus} {selectedRequest.onboardingCompletedAt ? `(${selectedRequest.onboardingCompletedAt})` : ""}
                </span>
              </div>
              {selectedRequest.rejectionReason && (
                <div className="col-span-2 mt-1 border-t border-border-p pt-2">
                  <span className="text-c-critical text-xs block font-semibold">Rejection Reason</span>
                  <span className="text-text-secondary text-xs">{selectedRequest.rejectionReason}</span>
                </div>
              )}
            </div>

            {/* Participant Profile Answers (D1–D8) */}
            <h4 className="text-sm font-semibold text-warm-white uppercase tracking-wider mb-3">Participant Profile Responses</h4>
            {selectedRequest.participantProfile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {[
                  { label: "D1. Age Range", val: selectedRequest.participantProfile.D1 },
                  { label: "D2. Gender", val: selectedRequest.participantProfile.D2 },
                  { label: "D3. Department", val: selectedRequest.participantProfile.D3 },
                  { label: "D4. Role Level", val: selectedRequest.participantProfile.D4 },
                  { label: "D5. Tenure", val: selectedRequest.participantProfile.D5 },
                  { label: "D6. Hours / Week", val: selectedRequest.participantProfile.D6 },
                  { label: "D7. Workload Intensity", val: selectedRequest.participantProfile.D7 },
                  { label: "D8. Work Arrangement", val: selectedRequest.participantProfile.D8 },
                ].map((item) => (
                  <div key={item.label} className="bg-elevated p-3 rounded-xl border border-border-p">
                    <p className="text-[11px] text-text-muted">{item.label}</p>
                    <p className="text-sm font-medium text-warm-white mt-0.5">{item.val || "Not specified"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic mb-6">No participant profile responses recorded yet.</p>
            )}

            {/* Actions in Modal */}
            <div className="flex items-center justify-between border-t border-border-p pt-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                selectedRequest.status === "approved"
                  ? "bg-c-success/10 text-c-success border-c-success/25"
                  : selectedRequest.status === "rejected"
                  ? "bg-c-critical/10 text-c-critical border-c-critical/25"
                  : "bg-c-warning/10 text-c-warning border-c-warning/25"
              }`}>
                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                {selectedRequest.status.toUpperCase()}
              </span>

              <div className="flex items-center gap-3">
                {selectedRequest.status === "pending" && (
                  <>
                    <button
                      onClick={() => {
                        setRejectingRequest(selectedRequest)
                        setRejectReason("")
                      }}
                      className="px-4 py-2 rounded-xl border border-c-critical/40 text-c-critical text-sm font-medium hover:bg-c-critical/10 transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => approve(selectedRequest.id)}
                      className="px-5 py-2 rounded-xl bg-purple-core text-warm-white text-sm font-medium hover:bg-purple-primary transition-colors cursor-pointer shadow-lg shadow-purple-core/20"
                    >
                      Approve Employee
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 rounded-xl border border-border-p text-text-secondary text-sm hover:border-border-s transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection Confirmation Modal ── */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border-s rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-display text-warm-white mb-2">Reject Workspace Access</h3>
            <p className="text-sm text-text-muted mb-4">
              Are you sure you want to reject access for <strong className="text-warm-white">{rejectingRequest.name}</strong>?
            </p>

            <div className="mb-5">
              <label className="text-xs text-text-muted block mb-1">Reason for Rejection (Optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Unverified department, duplicate registration, or contract pending..."
                rows={3}
                className="w-full bg-elevated border border-border-p rounded-xl p-3 text-sm text-text-secondary placeholder-text-muted/60 focus:outline-none focus:border-border-s resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setRejectingRequest(null)}
                className="px-4 py-2 rounded-xl border border-border-p text-text-secondary text-sm hover:border-border-s transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                className="px-5 py-2 rounded-xl bg-c-critical text-white text-sm font-medium hover:bg-red-600 transition-colors shadow-lg shadow-red-900/20 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── HR Settings ───────────────────────────────────────────────────────────────

interface HRProfileData {
  id: string
  name: string
  email: string
  hrId: string
  role: string
  status: string
  organisationId: string
  updatedAt?: string
  createdAt?: string
}

interface HROrgData {
  organisationId: string
  organisationName: string
  organisationCode: string
  status: string
}

function HRSettingsScreen() {
  const [profile, setProfile] = useState<HRProfileData | null>(null)
  const [org, setOrg] = useState<HROrgData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Change Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastType, setToastType] = useState<"success" | "error">("success")

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToastMsg(msg)
    setToastType(type)
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Load profile & organisation
  const fetchSettingsData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const token = localStorage.getItem("cq_token")
    if (!token) {
      setError("Your session has expired. Please sign in again.")
      setLoading(false)
      return
    }

    try {
      const [profileRes, orgRes] = await Promise.all([
        fetch(`${API_BASE}/api/hr/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/hr/organisation`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (profileRes.status === 401 || orgRes.status === 401) {
        throw new Error("Your session has expired. Please sign in again.")
      }
      if (profileRes.status === 403 || orgRes.status === 403) {
        throw new Error("You do not have permission to access this page.")
      }
      if (profileRes.status === 404) {
        throw new Error("HR profile not found.")
      }
      if (!profileRes.ok || !orgRes.ok) {
        throw new Error("Unable to load your profile information.")
      }

      const profileJson = await profileRes.json()
      const orgJson = await orgRes.json()

      if (profileJson.success && profileJson.data) {
        setProfile(profileJson.data)
        setEditName(profileJson.data.name || "")
      }
      if (orgJson.success && orgJson.data) {
        setOrg(orgJson.data)
      }
    } catch (err: any) {
      console.error("[HR-SETTINGS] Load error:", err.message)
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettingsData()
  }, [fetchSettingsData])

  // Handle Profile Update
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim()) {
      setEditError("Name cannot be empty.")
      return
    }

    setSavingProfile(true)
    setEditError(null)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`${API_BASE}/api/hr/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ name: editName.trim() }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update profile.")
      }

      setProfile(json.data)
      setShowEditModal(false)
      showToast("Profile updated successfully.")
    } catch (err: any) {
      setEditError(err.message || "Failed to update profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  // Handle Password Update
  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.")
      return
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.")
      return
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from your current password.")
      return
    }

    setSavingPassword(true)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch(`${API_BASE}/api/hr/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update password.")
      }

      setShowPasswordModal(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      showToast("Password updated successfully.")
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password.")
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 w-full max-w-[1400px] mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 bg-elevated border ${toastType === "success" ? "border-c-success/40 text-warm-white" : "border-c-error/40 text-c-error"} px-5 py-3 rounded-2xl shadow-xl animate-fade-up`}>
          <div className={`w-2 h-2 rounded-full ${toastType === "success" ? "bg-c-success" : "bg-c-error"}`} />
          <span className="text-xs font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl text-warm-white">HR Settings & Profile</h1>
        <p className="text-text-muted text-sm mt-1">Manage your administrator identity, view organisation parameters, and update account security.</p>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-6">
          <div className="card-base p-6 animate-pulse">
            <div className="h-5 bg-border-p/60 rounded w-48 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="h-3 bg-border-p/40 rounded w-20" />
                <div className="h-5 bg-border-p/60 rounded w-36" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-border-p/40 rounded w-20" />
                <div className="h-5 bg-border-p/60 rounded w-28" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-border-p/40 rounded w-24" />
                <div className="h-5 bg-border-p/60 rounded w-44" />
              </div>
            </div>
          </div>
          <div className="card-base p-6 animate-pulse">
            <div className="h-5 bg-border-p/60 rounded w-44 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="h-3 bg-border-p/40 rounded w-24" />
                <div className="h-5 bg-border-p/60 rounded w-36" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-border-p/40 rounded w-24" />
                <div className="h-5 bg-border-p/60 rounded w-28" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="card-base p-8 text-center border-c-error/30 bg-c-error/5 mb-6">
          <p className="text-sm text-c-error font-medium mb-2">{error}</p>
          <button
            onClick={() => fetchSettingsData()}
            className="btn-ghost text-xs px-4 py-2 mt-2 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dynamic Content */}
      {!loading && !error && profile && (
        <div className="space-y-6">
          {/* Account Details */}
          <div className="card-base p-6">
            <div className="flex items-center justify-between pb-3 border-b border-border-p mb-5">
              <div>
                <h2 className="text-base font-semibold text-warm-white">Account Details</h2>
                <p className="text-xs text-text-muted mt-0.5">Your authenticated administrator profile details.</p>
              </div>
              <button
                onClick={() => {
                  setEditName(profile.name || "")
                  setEditError(null)
                  setShowEditModal(true)
                }}
                className="btn-ghost text-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer border border-purple-core/30 text-lavender-soft hover:bg-purple-core/10"
              >
                <span>✏️</span>
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
              <div>
                <p className="text-[10px] font-medium text-text-muted mb-1 uppercase tracking-wider">HR Name</p>
                <p className="text-sm font-semibold text-warm-white">{profile.name || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-text-muted mb-1 uppercase tracking-wider">HR ID</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-lavender-soft font-mono-data bg-purple-core/10 px-2.5 py-0.5 rounded-md border border-purple-core/20">
                    {profile.hrId || "HR-ADMIN"}
                  </span>
                  <span className="text-[10px] text-text-muted" title="Permanent ID assigned by system">🔒 Immutable</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-medium text-text-muted mb-1 uppercase tracking-wider">Email Address</p>
                <p className="text-sm font-medium text-text-secondary">{profile.email || "—"}</p>
              </div>
            </div>
          </div>

          {/* Organisation Info */}
          <div className="card-base p-6">
            <div className="pb-3 border-b border-border-p mb-5">
              <h2 className="text-base font-semibold text-warm-white">Organisation Info</h2>
              <p className="text-xs text-text-muted mt-0.5">Assigned enterprise organisation workspace managed by your account.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
              <div>
                <p className="text-[10px] font-medium text-text-muted mb-1 uppercase tracking-wider">Organisation Name</p>
                <p className="text-sm font-semibold text-warm-white">{org?.organisationName || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-text-muted mb-1 uppercase tracking-wider">Organisation Code</p>
                <p className="text-sm font-semibold text-warm-white font-mono-data bg-elevated px-2.5 py-0.5 rounded-md border border-border-p inline-block">
                  {org?.organisationCode || "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-text-muted mb-1 uppercase tracking-wider">Workspace Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${org?.status === "Active" ? "bg-c-success" : "bg-c-warning"}`} />
                  <span className={`text-xs font-medium ${org?.status === "Active" ? "text-c-success" : "text-c-warning"}`}>
                    {org?.status || "Active"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Sign In */}
          <div className="card-base p-6">
            <div className="pb-3 border-b border-border-p mb-5">
              <h2 className="text-base font-semibold text-warm-white">Security & Sign In</h2>
              <p className="text-xs text-text-muted mt-0.5">Keep your administrative credentials protected with regular updates.</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-warm-white">Account Password</p>
                <p className="text-xs text-text-muted mt-0.5">Encrypted with industry-standard bcrypt hashing algorithms.</p>
              </div>
              <button
                onClick={() => {
                  setCurrentPassword("")
                  setNewPassword("")
                  setConfirmPassword("")
                  setPasswordError(null)
                  setShowPasswordModal(true)
                }}
                className="btn-primary text-xs px-4 py-2 cursor-pointer font-medium self-start sm:self-auto"
              >
                Change Password
              </button>
            </div>
          </div>

          {/* Security Metadata */}
          <div className="card-base p-6">
            <div className="pb-3 border-b border-border-p mb-4">
              <h2 className="text-base font-semibold text-warm-white">Session & Audit Context</h2>
              <p className="text-xs text-text-muted mt-0.5">Real-time authentication context verified through CortiQuant security gateways.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-surface/50 border border-border-p">
                <p className="text-[10px] text-text-muted uppercase mb-1">Account Role</p>
                <p className="font-semibold text-lavender-soft capitalize">{profile.role || "HR"}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface/50 border border-border-p">
                <p className="text-[10px] text-text-muted uppercase mb-1">Account Status</p>
                <p className={`font-semibold ${profile.status === "Active" || profile.status === "Approved" ? "text-c-success" : "text-c-warning"}`}>
                  {profile.status || "Active"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface/50 border border-border-p">
                <p className="text-[10px] text-text-muted uppercase mb-1">Security Isolation</p>
                <p className="font-semibold text-text-secondary">Org-Scoped JWT</p>
              </div>
              <div className="p-3 rounded-xl bg-surface/50 border border-border-p">
                <p className="text-[10px] text-text-muted uppercase mb-1">Last Profile Sync</p>
                <p className="font-mono-data text-text-muted">
                  {profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Today"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Profile Modal ──────────────────────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="card-base w-full max-w-md p-6 bg-surface border border-border-p rounded-3xl shadow-2xl relative animate-fade-up">
            <div className="flex items-center justify-between pb-3 border-b border-border-p mb-5">
              <h3 className="font-display text-xl text-warm-white">Edit HR Profile</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-text-muted hover:text-text-secondary text-sm p-1 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl text-xs mb-4 bg-c-error/10 text-c-error border border-c-error/30">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">HR Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="w-full bg-elevated border border-border-p rounded-xl px-3.5 py-2.5 text-sm text-warm-white placeholder-text-muted/60 focus:outline-none focus:border-purple-core"
                />
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">HR ID (Read Only)</label>
                <input
                  type="text"
                  value={profile?.hrId || ""}
                  disabled
                  className="w-full bg-elevated/50 border border-border-p/50 rounded-xl px-3.5 py-2.5 text-sm text-text-muted cursor-not-allowed font-mono-data"
                />
                <p className="text-[10px] text-text-muted mt-1">HR ID is permanently assigned to your administrator identity.</p>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">Email Address (Login Identity)</label>
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="w-full bg-elevated/50 border border-border-p/50 rounded-xl px-3.5 py-2.5 text-sm text-text-muted cursor-not-allowed"
                />
                <p className="text-[10px] text-text-muted mt-1">Login email is managed by your Enterprise Administrator.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-p">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-ghost text-xs px-4 py-2.5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn-primary text-xs px-5 py-2.5 cursor-pointer font-medium flex items-center gap-2"
                >
                  {savingProfile && <div className="w-3 h-3 rounded-full border border-warm-white border-t-transparent animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ───────────────────────────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="card-base w-full max-w-md p-6 bg-surface border border-border-p rounded-3xl shadow-2xl relative animate-fade-up">
            <div className="flex items-center justify-between pb-3 border-b border-border-p mb-5">
              <div>
                <h3 className="font-display text-xl text-warm-white">Reset Password</h3>
                <p className="text-xs text-text-muted mt-0.5">Verify your current credentials to update your password.</p>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-text-muted hover:text-text-secondary text-sm p-1 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl text-xs mb-4 bg-c-error/10 text-c-error border border-c-error/30">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full bg-elevated border border-border-p rounded-xl px-3.5 py-2.5 text-sm text-warm-white placeholder-text-muted/60 focus:outline-none focus:border-purple-core"
                />
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 chars)"
                  required
                  className="w-full bg-elevated border border-border-p rounded-xl px-3.5 py-2.5 text-sm text-warm-white placeholder-text-muted/60 focus:outline-none focus:border-purple-core"
                />
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  required
                  className="w-full bg-elevated border border-border-p rounded-xl px-3.5 py-2.5 text-sm text-warm-white placeholder-text-muted/60 focus:outline-none focus:border-purple-core"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-p">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn-ghost text-xs px-4 py-2.5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="btn-primary text-xs px-5 py-2.5 cursor-pointer font-medium flex items-center gap-2"
                >
                  {savingPassword && <div className="w-3 h-3 rounded-full border border-warm-white border-t-transparent animate-spin" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── App shell ──────────────────────────────────────────────────────────────────

export default function HRApp() {
  const [screen, setScreen] = useState<HRScreen>("overview")
  const [selectedTeam, setSelectedTeam] = useState<DepartmentTeamItem | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [orgName, setOrgName] = useState<string>("")

  // Fetch HR organisation name once for the sidebar header
  useEffect(() => {
    async function loadOrgInfo() {
      try {
        const token = localStorage.getItem("cq_token")
        const res = await fetch(`${API_BASE}/api/hr/overview?period=7d`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        })
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data?.organisationName) {
            setOrgName(json.data.organisationName)
          }
        }
      } catch (e) {
        // Fallback or ignore
      }
    }
    loadOrgInfo()
  }, [])

  function handleNav(s: HRScreen) {
    setScreen(s)
  }

  return (
    <div className="flex w-full min-h-screen bg-midnight text-warm-white">
      <Sidebar
        active={screen}
        onNav={handleNav}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        orgName={orgName}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top bar */}
        <div className="h-14 border-b border-border-p flex items-center justify-between px-4 md:px-8 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-1 mr-1 text-text-secondary hover:text-warm-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="hidden sm:inline">HR Platform</span>
            <svg className="hidden sm:block w-3 h-3" fill="none" viewBox="0 0 12 12">
              <path d="M4 4l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="text-text-secondary font-medium capitalize">{screen.replace("-", " ")}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-elevated border border-border-p rounded-xl px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-c-success animate-pulse-dot" />
              <span className="text-xs text-text-muted">Aggregated data only · Privacy protected</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-core/20 border border-purple-core/30 flex items-center justify-center">
              <span className="text-xs font-semibold text-lavender-soft">HR</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {screen === "overview" && <OverviewScreen onNav={handleNav} />}
          {screen === "workforce" && <WorkforceScreen />}
          {screen === "teams" && (
            <TeamsScreen
              onDetail={(dept) => {
                setSelectedTeam(dept)
                setScreen("team-detail")
              }}
            />
          )}
          {screen === "team-detail" && (
            <TeamDetailScreen
              department={selectedTeam}
              onBack={() => setScreen("teams")}
            />
          )}
          {screen === "interventions" && <InterventionsScreen />}
          {screen === "reports" && <ReportsScreen />}
          {screen === "approval-queue" && <ApprovalQueueScreen />}
          {screen === "settings" && <HRSettingsScreen />}
        </div>
      </div>
    </div>
  )
}
