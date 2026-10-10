import { useState } from "react"
import { createBrowserRouter, redirect, Outlet, useNavigate, useLocation } from "react-router-dom"
import Landing from "@/screens/landing/Landing"
import Login from "@/screens/auth/Login"
import HRLogin from "@/screens/auth/HRLogin"
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
import TermsAndConditionsScreen from "@/screens/legal/TermsAndConditions"
import ParticipantConsentScreen from "@/screens/legal/ParticipantConsent"
import ContactScreen from "@/screens/contact/ContactScreen"
import CreateProfile from "@/screens/auth/CreateProfile"
import ResetPassword from "@/screens/auth/ResetPassword"
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

let cachedAuthMe: { token: string; timestamp: number; data: any } | null = null

export function clearAuthMeCache() {
  cachedAuthMe = null
}

export async function requireActiveEmployeeLoader({ request }: { request?: Request } = {}) {
  const token = localStorage.getItem("cq_token")
  if (!token) {
    cachedAuthMe = null
    return redirect("/company-login")
  }

  const url = request ? new URL(request.url) : null
  const isBaselinePath = url ? url.pathname === "/baseline" : false

  // Sync latest status from backend with 15s short-lived session cache
  let data: any = null
  if (cachedAuthMe && cachedAuthMe.token === token && Date.now() - cachedAuthMe.timestamp < 15000) {
    data = cachedAuthMe.data
  } else {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        cachedAuthMe = null
        localStorage.clear()
        return redirect("/company-login")
      }
      data = await res.json()
      if (data && data.success) {
        cachedAuthMe = { token, timestamp: Date.now(), data }
      }
    } catch {
      // Fallback to locally stored status if offline
    }
  }

  try {
    if (data && data.success && data.user) {
      const rawStatus = data.user.status || data.status

      // Check if user needs to complete their personal B2C profile first
      const isLegacy = data.user.baselineMsi !== null || data.user.department !== null || (data.user.age !== null && data.user.age !== undefined)
      if (data.user.profileCompleted === false && !isLegacy) {
        localStorage.setItem("cq_profile_completed", "false")
        return redirect("/create-profile")
      }
      localStorage.setItem("cq_profile_completed", "true")

      if (rawStatus === "Active" || rawStatus === "Approved") {
        localStorage.setItem("cq_approval_status", "approved")
        localStorage.setItem("cq_onboarding_status", "complete")

        const msiArr = Array.isArray(data.user?.msi) ? data.user.msi : []
        const hasBaselineInArray = msiArr.some((item: any) => item.type === "baseline" && typeof item.score === "number")
        const hasBaseline = hasBaselineInArray || data.hasBaseline === true || (data.user?.baselineMsi !== null && data.user?.baselineMsi !== undefined)

        if (hasBaseline) {
          const baselineScore = data.user?.baselineMsi ?? msiArr.find((item: any) => item.type === "baseline")?.score
          if (baselineScore != null) {
            localStorage.setItem("cq_baseline_msi", String(baselineScore))
          }
          if (isBaselinePath) {
            return redirect("/home")
          }
          return null
        } else {
          localStorage.removeItem("cq_baseline_msi")
          localStorage.removeItem("cq_current_msi")
          if (!isBaselinePath) {
            return redirect("/baseline")
          }
          return null
        }
      } else if (rawStatus === "Rejected") {
        if (data.user?.organisationLink && data.user.organisationLink.status === "rejected") {
          // B2C user with rejected org link stays in normal app
          localStorage.setItem("cq_approval_status", "approved")
          localStorage.setItem("cq_onboarding_status", "complete")
          return null
        }
        localStorage.setItem("cq_approval_status", "rejected")
        localStorage.setItem("cq_onboarding_status", "complete")
        return redirect("/approval-rejected")
      } else if (rawStatus === "PendingApproval" || rawStatus === "Pending") {
        if (data.user?.organisationLink && data.user.organisationLink.status === "pending") {
          // B2C user with pending org link continues using B2C platform normally
          localStorage.setItem("cq_approval_status", "approved")
          localStorage.setItem("cq_onboarding_status", "complete")
          return null
        }
        localStorage.setItem("cq_approval_status", "pending")
        localStorage.setItem("cq_onboarding_status", "complete")
        return redirect("/waiting-approval")
      } else if (rawStatus === "OnboardingRequired") {
        localStorage.setItem("cq_approval_status", "none")
        localStorage.setItem("cq_onboarding_status", "incomplete")
        return redirect("/corporate-onboarding")
      }
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
    return redirect("/hr-login")
  }
  if (role !== "hr" && role !== "admin" && role !== "founder") {
    // If logged in as an employee, redirect to employee home or sign in
    return redirect("/hr-login")
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
        if (rawStatus === "Active" || rawStatus === "Approved" || data.user?.organisationLink?.status === "pending") {
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
            Once approved, you will have immediate access to your organisation's workplace tools. Your personal dashboard remains available.
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
              className="w-full py-2.5 text-xs text-lavender-soft hover:text-warm-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              onClick={() => {
                localStorage.setItem("cq_approval_status", "approved")
                navigate("/home")
              }}
            >
              Continue to Personal Dashboard &rarr;
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
  return (
    <Landing
      onGetStarted={() => navigate("/company-login")}
      onHRLogin={() => navigate("/hr-login")}
    />
  )
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
              const msiArr = Array.isArray(data.user?.msi) ? data.user.msi : []
              const hasBaselineInArray = msiArr.some((item: any) => item.type === "baseline" && typeof item.score === "number")
              const hasBaseline = hasBaselineInArray || data.hasBaseline === true || (data.user?.baselineMsi !== null && data.user?.baselineMsi !== undefined)

              if (hasBaseline) {
                const bScore = data.user?.baselineMsi ?? msiArr.find((item: any) => item.type === "baseline")?.score
                if (bScore != null) localStorage.setItem("cq_baseline_msi", String(bScore))
                navigate("/home")
              } else {
                localStorage.removeItem("cq_baseline_msi")
                localStorage.removeItem("cq_current_msi")
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
    // Clear any previous user's baseline and assessment state
    localStorage.removeItem("cq_baseline_msi")
    localStorage.removeItem("cq_current_msi")
    localStorage.removeItem("cq_last_baseline_date")
    localStorage.removeItem("cq_next_baseline_date")
    localStorage.removeItem("cq_stress_assessments")
    localStorage.removeItem("cq_latest_recommendations")
    localStorage.removeItem("cq_latest_root_cause")
    localStorage.removeItem("cq_onboarding_answers")
    localStorage.removeItem("cq_onboarding_step")

    localStorage.setItem("cq_user_name", name)
    localStorage.setItem("cq_username", username)
    localStorage.setItem("cq_user_email", email)
    localStorage.setItem("cq_onboarding_status", "complete")
    localStorage.setItem("cq_approval_status", "approved")
    localStorage.setItem("cq_profile_completed", "false")

    // Post-signup: show "Create Your Profile"
    navigate("/create-profile")
  }

  return (
    <Login
      onEmployeeSignIn={handleEmployeeSignIn}
      onCreateAccount={handleCreateAccount}
      onHR={() => navigate("/hr-login")}
      onBack={() => navigate("/")}
      initialMode="employee"
    />
  )
}

function HRLoginScreen() {
  const navigate = useNavigate()
  return (
    <HRLogin
      onSignIn={() => navigate("/hr")}
      onBack={() => navigate("/company-login")}
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
        path: "reset-password",
        Component: ResetPassword,
      },
      {
        path: "privacy-policy",
        Component: PrivacyPolicyScreen,
      },
      {
        path: "privacy",
        Component: PrivacyPolicyScreen,
      },
      {
        path: "terms-and-conditions",
        Component: TermsAndConditionsScreen,
      },
      {
        path: "terms",
        Component: TermsAndConditionsScreen,
      },
      {
        path: "contact",
        Component: ContactScreen,
      },
      {
        path: "contact-us",
        Component: ContactScreen,
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
        path: "create-profile",
        Component: CreateProfile,
        loader: () => {
          const token = localStorage.getItem("cq_token")
          if (!token) return redirect("/company-login")
          return null
        },
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
        Component: HRLoginScreen,
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
