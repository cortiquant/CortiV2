import { useState } from "react"
import { createBrowserRouter, redirect, Outlet, useNavigate } from "react-router-dom"
import Landing from "@/screens/landing/Landing"
import Login from "@/screens/auth/Login"
import AdminLogin from "@/screens/auth/AdminLogin"
import ListenerLogin from "@/screens/auth/ListenerLogin"
import Onboarding from "@/screens/auth/Onboarding"
import EmployeeApp from "@/screens/employee/EmployeeApp"
import HRApp from "@/screens/admin/hr/HRApp"
import FounderApp from "@/screens/founder/FounderApp"
import ListenerApp, { ActiveSessionScreen } from "@/screens/listener/ListenerApp"
import AcceptInvitation from "@/screens/auth/AcceptInvitation"
import ListenerAcceptInvite from "@/screens/auth/ListenerAcceptInvite"
import PrivacyPolicyScreen from "@/screens/legal/PrivacyPolicy"
import ParticipantConsentScreen from "@/screens/legal/ParticipantConsent"
import logoSrc from "@/imports/image-2.png"

// ── Auth & Storage Helpers ───────────────────────────────────────────────────

export function getStoredAuthUser() {
  const token = localStorage.getItem("cq_token")
  if (!token) return null
  return {
    id: localStorage.getItem("cq_user_id"),
    name: localStorage.getItem("cq_user_name"),
    email: localStorage.getItem("cq_user_email"),
    role: localStorage.getItem("cq_role") || "employee",
    onboardingCompleted: localStorage.getItem("cq_onboarding_status") === "complete",
    approvalStatus: localStorage.getItem("cq_approval_status") || "none",
  }
}

export function getOnboardingStatus(): "incomplete" | "complete" {
  return (localStorage.getItem("cq_onboarding_status") as "incomplete" | "complete") || "incomplete"
}

export function getApprovalStatus(): "none" | "pending" | "approved" | "rejected" {
  return (localStorage.getItem("cq_approval_status") as "none" | "pending" | "approved" | "rejected") || "none"
}

export function getResumeStep(): number {
  return parseInt(localStorage.getItem("cq_onboarding_step") || "0", 10)
}

export function getResumeAnswers(): (string | null)[] | undefined {
  try {
    const raw = localStorage.getItem("cq_onboarding_answers")
    if (!raw) return undefined
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export function isUserAuthenticated(): boolean {
  return !!localStorage.getItem("cq_token")
}

export async function requireActiveEmployeeLoader({ request }: { request?: Request } = {}) {
  const token = localStorage.getItem("cq_token")
  if (!token) {
    return redirect("/company-login")
  }

  const url = request ? new URL(request.url) : null
  const isBaselinePath = url ? url.pathname === "/baseline" : false

  // Sync latest status from backend
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.success && data.user) {
      const rawStatus = data.user.status || data.status
      if (rawStatus === "Active" || rawStatus === "Approved") {
        localStorage.setItem("cq_approval_status", "approved")
        localStorage.setItem("cq_onboarding_status", "complete")

        const hasBaseline = data.hasBaseline || (data.user.baselineMsi !== null && data.user.baselineMsi !== undefined)
        if (hasBaseline) {
          localStorage.setItem("cq_baseline_msi", String(data.user.baselineMsi))
          if (isBaselinePath) {
            return redirect("/home")
          }
          return null
        } else {
          // Approved but no baseline yet -> force baseline flow
          if (isBaselinePath) {
            return null
          }
          return redirect("/baseline")
        }
      } else if (rawStatus === "Rejected") {
        localStorage.setItem("cq_approval_status", "rejected")
        localStorage.setItem("cq_onboarding_status", "complete")
        return redirect("/approval-rejected")
      } else if (rawStatus === "PendingApproval" || rawStatus === "Pending") {
        localStorage.setItem("cq_approval_status", "pending")
        localStorage.setItem("cq_onboarding_status", "complete")
        return redirect("/waiting-approval")
      } else if (rawStatus === "OnboardingRequired") {
        localStorage.setItem("cq_approval_status", "none")
        localStorage.setItem("cq_onboarding_status", "incomplete")
        return redirect("/corporate-onboarding")
      }
    } else if (res.status === 401) {
      localStorage.clear()
      return redirect("/company-login")
    }
  } catch {
    // Fallback to locally stored status if offline
  }

  const approval = getApprovalStatus()
  const onboarding = getOnboardingStatus()

  if (approval === "approved") {
    const storedBaseline = localStorage.getItem("cq_baseline_msi")
    if (!storedBaseline) {
      if (isBaselinePath) return null
      return redirect("/baseline")
    }
    if (isBaselinePath) return redirect("/home")
    return null
  }
  if (approval === "rejected") {
    return redirect("/approval-rejected")
  }
  if (onboarding === "complete" || approval === "pending") {
    return redirect("/waiting-approval")
  }
  return redirect("/corporate-onboarding")
}

export function isHRAuthenticated(): boolean {
  const token = localStorage.getItem("cq_token")
  const role = (localStorage.getItem("cq_role") || "").toLowerCase()
  return !!token && (role === "hr" || role === "admin" || role === "founder")
}

export function requireHRLoader() {
  const token = localStorage.getItem("cq_token")
  const role = (localStorage.getItem("cq_role") || "").toLowerCase()
  if (!token) {
    return redirect("/company-login")
  }
  if (role !== "hr" && role !== "admin" && role !== "founder") {
    // If logged in as an employee, redirect to employee home or sign in
    return redirect("/company-login")
  }
  return null
}

export function isFounderAuthenticated(): boolean {
  const token = localStorage.getItem("cq_token")
  const role = localStorage.getItem("cq_role")
  return !!token && (role === "admin" || role === "founder")
}

export function isListenerAuthenticated(): boolean {
  const token = localStorage.getItem("cq_token")
  const role = (localStorage.getItem("cq_role") || "").toUpperCase()
  return !!token && (role === "LISTENER" || role === "ADMIN" || role === "FOUNDER")
}

export function requireListenerLoader() {
  const token = localStorage.getItem("cq_token")
  const role = (localStorage.getItem("cq_role") || "").toUpperCase()
  if (!token) {
    return redirect("/listener/login")
  }
  if (role !== "LISTENER" && role !== "ADMIN" && role !== "FOUNDER") {
    return redirect("/listener/login")
  }
  return null
}

// ── Status Screens ────────────────────────────────────────────────────────────

function WaitingApprovalScreen() {
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  function handleLogout() {
    localStorage.clear()
    navigate("/company-login")
  }

  async function handleRefreshStatus() {
    setRefreshing(true)
    setMsg(null)
    const token = localStorage.getItem("cq_token")
    if (!token) {
      setRefreshing(false)
      navigate("/company-login")
      return
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success && data.user) {
        const rawStatus = data.user.status || data.status
        if (rawStatus === "Active" || rawStatus === "Approved") {
          localStorage.setItem("cq_approval_status", "approved")
          navigate("/home")
          return
        } else if (rawStatus === "Rejected") {
          localStorage.setItem("cq_approval_status", "rejected")
          navigate("/approval-rejected")
          return
        } else {
          setMsg("Your registration is still being reviewed by your HR team.")
        }
      } else {
        setMsg("Unable to refresh status. Please try again.")
      }
    } catch {
      setMsg("Connection error while refreshing status.")
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="min-h-full bg-midnight flex flex-col items-center justify-center px-4 py-12 overflow-y-auto">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-primary/6 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-lavender-bright/4 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="flex justify-center mb-8">
          <img src={logoSrc} alt="CortiQuant" className="h-12 object-contain opacity-90" />
        </div>

        <div className="card-base p-8 glow-subtle text-center">
          <div className="inline-flex items-center gap-2 bg-c-warning/10 border border-c-warning/30 rounded-full px-4 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-c-warning animate-pulse-dot" />
            <span className="text-xs font-semibold text-c-warning">Pending approval</span>
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-c-warning/8 border border-c-warning/20 flex items-center justify-center">
              <svg className="w-9 h-9 text-c-warning" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-warm-white mb-2">Your account is awaiting approval.</h2>
          <p className="text-sm font-medium text-text-secondary mb-3">Your organisation's HR team is reviewing your registration.</p>
          <p className="text-sm text-text-muted leading-relaxed mb-6 max-w-xs mx-auto">
            Once approved, you will have immediate access to your wellness dashboard, check-ins, and workplace tools.
          </p>

          {msg && (
            <div className="mb-6 px-3 py-2 rounded-xl bg-elevated border border-border-p text-xs text-lavender-soft">
              {msg}
            </div>
          )}

          <div className="space-y-3">
            <button
              className="btn-primary w-full py-3.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              onClick={handleRefreshStatus}
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                  </svg>
                  Checking status...
                </>
              ) : (
                "Refresh Status"
              )}
            </button>

            <button
              className="btn-ghost w-full py-3.5 text-sm font-semibold text-text-muted hover:text-warm-white cursor-pointer"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ApprovalRejectedScreen() {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.clear()
    navigate("/company-login")
  }

  return (
    <div className="min-h-full bg-midnight flex flex-col items-center justify-center px-4 py-12 overflow-y-auto">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-c-critical/4 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-primary/4 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="flex justify-center mb-8">
          <img src={logoSrc} alt="CortiQuant" className="h-12 object-contain opacity-90" />
        </div>

        <div className="card-base p-8 glow-subtle text-center">
          <div className="inline-flex items-center gap-2 bg-c-critical/10 border border-c-critical/30 rounded-full px-4 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-c-critical" />
            <span className="text-xs font-semibold text-c-critical">Access not approved</span>
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-c-critical/8 border border-c-critical/20 flex items-center justify-center">
              <svg className="w-9 h-9 text-c-critical" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-warm-white mb-2">Your registration was not approved.</h2>
          <p className="text-sm text-text-muted leading-relaxed mb-8 max-w-xs mx-auto">
            Please contact your organisation's HR team for more information.
          </p>

          <button className="btn-ghost w-full py-3.5 text-sm font-semibold text-text-muted hover:text-warm-white cursor-pointer" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

function AcceptInviteScreen() {
  const navigate = useNavigate()
  return (
    <div className="min-h-full bg-midnight flex items-center justify-center px-4 py-12">
      <div className="card-base p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-warm-white mb-3">Accept Invitation</h1>
        <p className="text-sm text-text-muted mb-6">You've been invited to join CortiQuant through your organization.</p>
        <button onClick={() => navigate("/company-signup")} className="btn-primary w-full py-3 text-sm rounded-xl">
          Complete Registration &rarr;
        </button>
      </div>
    </div>
  )
}

// ── Route Screen Wrappers ──────────────────────────────────────────────────────

function WelcomeScreen() {
  const navigate = useNavigate()
  return <Landing onGetStarted={() => navigate("/company-login")} />
}

function CompanyLoginScreen() {
  const navigate = useNavigate()

  // If already authenticated with token, auto-route according to current MongoDB status
  useState(() => {
    const token = localStorage.getItem("cq_token")
    const role = localStorage.getItem("cq_role")
    if (token && role === "employee") {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.user) {
            const rawStatus = data.user.status || data.status
            if (rawStatus === "Active" || rawStatus === "Approved") {
              localStorage.setItem("cq_approval_status", "approved")
              const hasBaseline = data.hasBaseline || (data.user.baselineMsi !== null && data.user.baselineMsi !== undefined)
              if (hasBaseline) {
                localStorage.setItem("cq_baseline_msi", String(data.user.baselineMsi))
                navigate("/home")
              } else {
                navigate("/baseline")
              }
            } else if (rawStatus === "Rejected") {
              localStorage.setItem("cq_approval_status", "rejected")
              navigate("/approval-rejected")
            } else if (rawStatus === "PendingApproval" || rawStatus === "Pending") {
              localStorage.setItem("cq_approval_status", "pending")
              navigate("/waiting-approval")
            } else if (rawStatus === "OnboardingRequired") {
              localStorage.setItem("cq_approval_status", "none")
              navigate("/corporate-onboarding")
            }
          }
        })
        .catch(() => {})
    }
  })

  function handleEmployeeSignIn() {
    const approval = getApprovalStatus()
    const onboarding = getOnboardingStatus()
    const storedBaseline = localStorage.getItem("cq_baseline_msi")

    if (approval === "approved") {
      if (storedBaseline) {
        navigate("/home")
      } else {
        navigate("/baseline")
      }
    } else if (approval === "rejected") {
      navigate("/approval-rejected")
    } else if (onboarding === "complete" || approval === "pending") {
      navigate("/waiting-approval")
    } else {
      navigate("/corporate-onboarding")
    }
  }

  function handleCreateAccount(name: string, username: string, email: string) {
    localStorage.setItem("cq_user_name", name)
    localStorage.setItem("cq_username", username)
    localStorage.setItem("cq_user_email", email)
    localStorage.setItem("cq_onboarding_status", "incomplete")
    localStorage.setItem("cq_approval_status", "none")
    localStorage.removeItem("cq_onboarding_answers")
    localStorage.removeItem("cq_onboarding_step")
    navigate("/corporate-onboarding")
  }

  return (
    <Login
      onEmployeeSignIn={handleEmployeeSignIn}
      onCreateAccount={handleCreateAccount}
      onHR={() => navigate("/hr")}
      onBack={() => navigate("/")}
    />
  )
}

function CorporateOnboardingScreen() {
  const navigate = useNavigate()

  function handleOnboardingComplete(answers: (string | null)[]) {
    localStorage.setItem("cq_onboarding_status", "complete")
    localStorage.setItem("cq_approval_status", "pending")
    localStorage.setItem("cq_onboarding_answers", JSON.stringify(answers))
    localStorage.setItem("cq_approval_requested_at", new Date().toISOString())
    navigate("/waiting-approval")
  }

  return (
    <Onboarding
      initialStep={getResumeStep()}
      initialAnswers={getResumeAnswers()}
      onComplete={handleOnboardingComplete}
    />
  )
}

function AdminLoginScreen() {
  const navigate = useNavigate()
  return <AdminLogin onSignIn={() => navigate("/founder")} onBack={() => navigate("/")} />
}

function ListenerLoginScreen() {
  const navigate = useNavigate()
  return <ListenerLogin onSignIn={() => navigate("/listener-portal")} onBack={() => navigate("/")} />
}

function ListenerPortalScreen() {
  return <ListenerApp />
}

function ListenerAcceptInviteScreen() {
  return <ListenerAcceptInvite />
}

// ── Layout Component ──────────────────────────────────────────────────────────

export function AppLayout() {
  return (
    <div className="size-full bg-midnight">
      {/* Persistent logo watermark — top-right */}
      <div className="fixed top-3 right-4 z-50 flex items-center gap-2 pointer-events-none select-none">
        <img src={logoSrc} alt="CortiQuant" className="h-7 object-contain opacity-80" />
      </div>
      <Outlet />
    </div>
  )
}

// ── createBrowserRouter Definition ─────────────────────────────────────────────

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,
    children: [
      {
        path: "",
        Component: WelcomeScreen,
      },
      {
        path: "accept-invite/:token",
        Component: AcceptInviteScreen,
      },
      {
        path: "accept-invite",
        Component: AcceptInviteScreen,
      },
      {
        path: "accept-invitation",
        Component: AcceptInvitation,
      },
      {
        path: "privacy-policy",
        Component: PrivacyPolicyScreen,
      },
      {
        path: "participant-consent",
        Component: ParticipantConsentScreen,
      },
      {
        path: "individual",
        loader: () => redirect("/company-login"),
      },
      {
        path: "company-login",
        Component: CompanyLoginScreen,
      },
      {
        path: "company-signup",
        Component: CompanyLoginScreen,
      },
      {
        path: "company-signup/register",
        Component: CompanyLoginScreen,
      },
      {
        path: "waiting-approval",
        Component: WaitingApprovalScreen,
      },
      {
        path: "approval-rejected",
        Component: ApprovalRejectedScreen,
      },
      {
        path: "corporate-onboarding",
        Component: CorporateOnboardingScreen,
        loader: () => {
          const user = getStoredAuthUser()
          if (user && user.onboardingCompleted && user.approvalStatus === "approved") {
            return redirect("/home")
          }
          return null
        },
      },
      {
        path: "productivity-readiness",
        Component: () => <EmployeeApp initialScreen="recommended" />,
      },
      {
        path: "hr-login",
        Component: CompanyLoginScreen,
      },
      {
        path: "hr/accept-invitation",
        Component: AcceptInvitation,
      },
      {
        path: "hr/*",
        Component: HRApp,
        loader: requireHRLoader,
      },
      {
        path: "hr",
        Component: HRApp,
        loader: requireHRLoader,
      },
      {
        path: "baseline",
        Component: () => <EmployeeApp initialScreen="baseline-msi" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "checkin",
        Component: () => <EmployeeApp initialScreen="checkin-1" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "psychometric",
        Component: () => <EmployeeApp initialScreen="baseline-msi" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "behavioral",
        Component: () => <EmployeeApp initialScreen="stress-cause" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "profile",
        Component: () => <EmployeeApp initialScreen="profile" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "notification-settings",
        Component: () => <EmployeeApp initialScreen="notifications" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "archetype-quiz",
        Component: () => <EmployeeApp initialScreen="archetype" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "archetype-reveal",
        Component: () => <EmployeeApp initialScreen="archetype" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "archetypes-gallery",
        Component: () => <EmployeeApp initialScreen="archetype" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "home/*",
        Component: () => <EmployeeApp initialScreen="home" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "home",
        Component: () => <EmployeeApp initialScreen="home" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "dump",
        Component: () => <EmployeeApp initialScreen="dump-bag" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "response",
        Component: () => <EmployeeApp initialScreen="dump-response" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "listener/login",
        Component: ListenerLoginScreen,
      },
      {
        path: "listener-login",
        Component: ListenerLoginScreen,
      },
      {
        path: "listener/accept-invite",
        Component: ListenerAcceptInviteScreen,
      },
      {
        path: "accept-listener-invite",
        Component: ListenerAcceptInviteScreen,
      },
      {
        path: "lister",
        Component: ListenerAcceptInviteScreen,
      },
      {
        path: "lister/accept-invite",
        Component: ListenerAcceptInviteScreen,
      },
      {
        path: "listener/connect",
        Component: () => <EmployeeApp initialScreen="listener-connect" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "listener",
        Component: () => <EmployeeApp initialScreen="listener-connect" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "listeners",
        Component: () => <EmployeeApp initialScreen="listener-connect" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "listener-booking",
        Component: () => <EmployeeApp initialScreen="listener-schedule" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "my-sessions",
        Component: () => <EmployeeApp initialScreen="my-sessions" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "reset",
        Component: () => <EmployeeApp initialScreen="reset-list" />,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "listener-portal/session/:sessionId",
        Component: ActiveSessionScreen,
        loader: requireListenerLoader,
      },
      {
        path: "listener-portal/session/:id",
        Component: ActiveSessionScreen,
        loader: requireListenerLoader,
      },
      {
        path: "listener-portal/*",
        Component: ListenerPortalScreen,
        loader: requireListenerLoader,
      },
      {
        path: "listener-portal",
        Component: ListenerPortalScreen,
        loader: requireListenerLoader,
      },
      {
        path: "session/:id",
        Component: ActiveSessionScreen,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "session/:sessionId",
        Component: ActiveSessionScreen,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "employee-chat/:sessionId",
        Component: ActiveSessionScreen,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "employee-chat/:bookingId",
        Component: ActiveSessionScreen,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "employee-chat",
        Component: ActiveSessionScreen,
        loader: requireActiveEmployeeLoader,
      },
      {
        path: "listener-chat/:sessionId",
        Component: ActiveSessionScreen,
        loader: requireListenerLoader,
      },
      {
        path: "listener-chat/:bookingId",
        Component: ActiveSessionScreen,
        loader: requireListenerLoader,
      },
      {
        path: "listener-chat",
        Component: ActiveSessionScreen,
        loader: requireListenerLoader,
      },
      {
        path: "admin",
        Component: AdminLoginScreen,
      },
      {
        path: "admin/csv",
        Component: HRApp,
      },
      {
        path: "founder/login",
        Component: AdminLoginScreen,
        loader: () => {
          if (isFounderAuthenticated()) {
            return redirect("/founder")
          }
          return null
        },
      },
      {
        path: "founder/*",
        Component: FounderApp,
        loader: () => {
          if (!isFounderAuthenticated()) {
            return redirect("/founder/login")
          }
          return null
        },
      },
      {
        path: "founder",
        Component: FounderApp,
        loader: () => {
          if (!isFounderAuthenticated()) {
            return redirect("/founder/login")
          }
          return null
        },
      },
      {
        path: "stress-labs",
        Component: () => <EmployeeApp initialScreen="reset-labs" />,
      },

      // Compatibility Aliases for auth flows
      {
        path: "auth/login",
        Component: CompanyLoginScreen,
      },
      {
        path: "auth/admin-login",
        Component: AdminLoginScreen,
      },
      {
        path: "auth/listener-login",
        Component: ListenerLoginScreen,
      },
      {
        path: "auth/onboarding",
        loader: () => redirect("/corporate-onboarding"),
      },
      {
        path: "auth/pending",
        Component: WaitingApprovalScreen,
      },
      {
        path: "auth/rejected",
        Component: ApprovalRejectedScreen,
      },
      {
        path: "app/*",
        Component: () => <EmployeeApp initialScreen="home" />,
      },

      // Fallback
      {
        path: "*",
        loader: () => redirect("/"),
      },
    ],
  },
])

export default router
