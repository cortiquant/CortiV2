import { useState, useRef } from "react"
import { Link } from "react-router-dom"
import logoSrc from "@/imports/image-2.png"

interface LoginProps {
  onEmployeeSignIn: () => void
  onCreateAccount: (name: string, username: string, email: string) => void
  onHR: () => void
  onBack: () => void
  initialMode?: "employee" | "hr"
}

type Mode = "employee" | "hr"
type Screen = "signin" | "signup" | "forgot" | "check-email"

function EmailIcon({ focused }: { focused: boolean }) {
  return (
    <svg className={`w-4 h-4 flex-shrink-0 transition-colors ${focused ? "text-purple-core" : "text-text-muted"}`} fill="none" viewBox="0 0 20 20">
      <path d="M3 5h14a2 2 0 012 2v6a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 6l7.5 5 7.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon({ focused }: { focused: boolean }) {
  return (
    <svg className={`w-4 h-4 flex-shrink-0 transition-colors ${focused ? "text-purple-core" : "text-text-muted"}`} fill="none" viewBox="0 0 20 20">
      <rect x="4" y="9" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 9V6a3 3 0 116 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PersonIcon({ focused }: { focused: boolean }) {
  return (
    <svg className={`w-4 h-4 flex-shrink-0 transition-colors ${focused ? "text-purple-core" : "text-text-muted"}`} fill="none" viewBox="0 0 20 20">
      <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 17c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="text-text-muted hover:text-text-secondary transition-colors" tabIndex={-1}>
      {show ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 20 20">
          <path d="M3 10s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 3l14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 20 20">
          <path d="M3 10s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5Z" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}
    </button>
  )
}

function InputRow({
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
  focused,
  onFocus,
  onBlur,
  suffix,
  mono,
}: {
  icon: React.ReactNode
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  focused: boolean
  onFocus: () => void
  onBlur: () => void
  suffix?: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-elevated border transition-all duration-150 ${focused ? "border-purple-core ring-2 ring-purple-core/15" : "border-border-p"}`}>
      {icon}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`flex-1 bg-transparent text-sm text-warm-white placeholder-text-muted focus:outline-none ${mono ? "font-mono-data tracking-widest" : ""}`}
      />
      {suffix}
    </div>
  )
}

function ReqItem({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {met ? (
        <svg className="w-4 h-4 text-c-success flex-shrink-0" fill="none" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <div className="w-4 h-4 rounded-full border border-border-s bg-surface flex-shrink-0" />
      )}
      <span className={`text-xs font-medium ${met ? "text-c-success" : "text-text-muted"}`}>{label}</span>
    </div>
  )
}

function Checkbox({
  checked,
  onChange,
  children,
  id,
}: {
  checked: boolean
  onChange: () => void
  children: React.ReactNode
  id?: string
}) {
  return (
    <div className="flex items-start gap-3 text-left">
      <button
        type="button"
        id={id}
        role="checkbox"
        aria-checked={checked}
        onClick={onChange}
        className={`w-4 h-4 mt-0.5 rounded flex-shrink-0 border transition-all cursor-pointer flex items-center justify-center ${
          checked
            ? "bg-purple-core border-purple-core"
            : "border-border-s bg-elevated hover:border-border-s"
        }`}
      >
        {checked && (
          <svg className="w-full h-full text-warm-white p-0.5" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="text-xs text-text-muted leading-relaxed select-text">{children}</div>
    </div>
  )
}

const API_BASE = ""

export default function Login({ onEmployeeSignIn, onCreateAccount, onHR, onBack, initialMode = "employee" }: LoginProps) {
  const [screen, setScreen] = useState<Screen>("signin")
  const [mode, setMode] = useState<Mode>(initialMode)

  // Sign-in fields
  const [employeeIdentifier, setEmployeeIdentifier] = useState("") // username or email
  const [hrEmail, setHrEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [usernameFocused, setUsernameFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  // Join / Org Code fields
  const [orgCode, setOrgCode] = useState("")
  const [orgFocused, setOrgFocused] = useState(false)
  const [verifiedOrg, setVerifiedOrg] = useState<{
    organisationId: string
    name: string
    organisationCode: string
  } | null>(null)
  const [verifyingOrg, setVerifyingOrg] = useState(false)

  // Create account fields
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [createPw, setCreatePw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [showCreatePw, setShowCreatePw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [nameFocused, setNameFocused] = useState(false)
  const [usernameFocused2, setUsernameFocused2] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [createPwFocused, setCreatePwFocused] = useState(false)
  const [confirmPwFocused, setConfirmPwFocused] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeConsent, setAgreeConsent] = useState(false)

  // Loading + error state
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const pwReqs = {
    length: createPw.length >= 8,
    lower: /[a-z]/.test(createPw),
    upper: /[A-Z]/.test(createPw),
    number: /[0-9]/.test(createPw),
  }

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotEmailFocused, setForgotEmailFocused] = useState(false)
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)

  // ── Sign-in handler ──
  async function handleSignIn() {
    if (loading) return
    setErrorMsg("")
    setLoading(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch(`${API_BASE}/api/auth/employee/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: employeeIdentifier, password }),
        signal: abortRef.current.signal,
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        if (res.status === 429) {
          setErrorMsg(data.message || "Too many login attempts. Please wait a few minutes and try again.")
        } else {
          setErrorMsg(data.message || "Invalid username or password.")
        }
        return
      }

      // Store token & core user details from successful authentication
      if (data.token) localStorage.setItem("cq_token", data.token)
      if (data.user?.id) localStorage.setItem("cq_user_id", data.user.id)
      if (data.user?.name) localStorage.setItem("cq_user_name", data.user.name)
      if (data.user?.username) localStorage.setItem("cq_username", data.user.username)
      if (data.user?.email) localStorage.setItem("cq_user_email", data.user.email)
      if (data.user?.employeeId) localStorage.setItem("cq_employee_id", data.user.employeeId)
      if (data.user?.organisationId) localStorage.setItem("cq_org_id", data.user.organisationId)
      if (data.user?.organisationCode) localStorage.setItem("cq_org_code", data.user.organisationCode)
      localStorage.setItem("cq_role", "employee")

      // Map status
      const rawStatus = data.status || data.user?.status || ""
      if (rawStatus === "Active" || rawStatus === "Approved") {
        localStorage.setItem("cq_approval_status", "approved")
        localStorage.setItem("cq_onboarding_status", "complete")
      } else if (rawStatus === "Rejected") {
        localStorage.setItem("cq_approval_status", "rejected")
        localStorage.setItem("cq_onboarding_status", "complete")
      } else if (rawStatus === "PendingApproval" || rawStatus === "Pending") {
        localStorage.setItem("cq_approval_status", "pending")
        localStorage.setItem("cq_onboarding_status", "complete")
      } else if (rawStatus === "OnboardingRequired") {
        localStorage.setItem("cq_approval_status", "none")
        localStorage.setItem("cq_onboarding_status", "incomplete")
      } else {
        localStorage.setItem("cq_approval_status", "approved")
      }

      // Clear any prior user's cached assessment/baseline state
      localStorage.removeItem("cq_baseline_msi")
      localStorage.removeItem("cq_current_msi")
      localStorage.removeItem("cq_last_baseline_date")
      localStorage.removeItem("cq_next_baseline_date")
      localStorage.removeItem("cq_latest_root_cause")
      localStorage.removeItem("cq_latest_recommendations")

      const msiArr = Array.isArray(data.user?.msi) ? data.user.msi : []
      const hasBaselineInArray = msiArr.some((item: any) => item.type === "baseline" && typeof item.score === "number")
      const userHasBaseline = hasBaselineInArray || data.hasBaseline === true || (data.user?.baselineMsi != null)

      if (userHasBaseline) {
        const bScore = data.user?.baselineMsi ?? msiArr.find((item: any) => item.type === "baseline")?.score
        if (bScore != null) {
          localStorage.setItem("cq_baseline_msi", String(bScore))
        }
      }

      onEmployeeSignIn()
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setErrorMsg("Cannot connect to server. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Forgot Password Request Handler ──
  async function handleRequestPasswordReset(isResend = false) {
    if (isResend && resendCooldown > 0) return
    if (loading) return
    setErrorMsg("")

    const clean = forgotEmail.trim()
    if (!clean) {
      setErrorMsg("Please enter your registered email address.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean }),
      })
      const data = await res.json()

      if (res.status === 429) {
        setErrorMsg(data.message || "Too many password reset requests. Please wait a few minutes and try again.")
        return
      }

      // Regardless of server status (to prevent user enumeration), advance to "check-email"
      setScreen("check-email")
      setResendCooldown(60)

      // Start cooldown timer
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch {
      setErrorMsg("Unable to reach the server. Please check your internet connection.")
    } finally {
      setLoading(false)
    }
  }

  // ── B2C Individual User Account Creation ──
  async function handleCreateAccount() {
    if (loading) return
    setErrorMsg("")

    const cleanName = fullName.trim()
    const cleanUsername = username.trim().toLowerCase()
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanName) {
      setErrorMsg("Full name is required.")
      return
    }
    if (!cleanUsername) {
      setErrorMsg("Username is required.")
      return
    }
    if (!cleanEmail) {
      setErrorMsg("Email address is required.")
      return
    }
    if (!isEmailValid) {
      setErrorMsg("Please provide a valid email address.")
      return
    }
    if (!createPw) {
      setErrorMsg("Password is required.")
      return
    }
    if (createPw !== confirmPw) {
      setErrorMsg("Passwords do not match.")
      return
    }
    if (!agreePrivacy || !agreeConsent) {
      setErrorMsg("Please agree to both the Privacy Policy and Participant Consent Form to proceed.")
      return
    }

    setLoading(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          username: cleanUsername,
          email: cleanEmail,
          password: createPw,
          privacyConsent: agreePrivacy,
          participantConsent: agreeConsent,
        }),
        signal: abortRef.current.signal,
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        if (res.status === 429) {
          setErrorMsg(data.message || "Too many signup attempts. Please wait a few minutes and try again.")
        } else {
          setErrorMsg(data.message || "Account creation failed.")
        }
        return
      }

      if (data.token) localStorage.setItem("cq_token", data.token)
      localStorage.setItem("cq_user_name", data.user.name)
      if (data.user.username) localStorage.setItem("cq_username", data.user.username)
      if (data.user.email) localStorage.setItem("cq_user_email", data.user.email)
      localStorage.setItem("cq_user_id", data.user.id)
      localStorage.setItem("cq_role", "employee")
      localStorage.setItem("cq_approval_status", "approved")
      localStorage.setItem("cq_onboarding_status", "complete")

      // Clear any previous user's baseline and assessment data so new user starts completely fresh
      localStorage.removeItem("cq_baseline_msi")
      localStorage.removeItem("cq_current_msi")
      localStorage.removeItem("cq_last_baseline_date")
      localStorage.removeItem("cq_next_baseline_date")
      localStorage.removeItem("cq_stress_assessments")
      localStorage.removeItem("cq_latest_recommendations")
      localStorage.removeItem("cq_latest_root_cause")
      localStorage.removeItem("cq_onboarding_answers")
      localStorage.removeItem("cq_onboarding_step")

      onCreateAccount(cleanName, cleanUsername, cleanEmail)
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setErrorMsg("Cannot connect to server. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const backLabel = screen === "signup" || screen === "forgot" || screen === "reset" ? "← Back to sign in" : "← Back to home"
  function handleBack() {
    setErrorMsg("")
    if (screen === "signup" || screen === "forgot" || screen === "reset") {
      setScreen("signin")
    } else {
      onBack()
    }
  }

  return (
    <div className="min-h-full bg-midnight flex flex-col items-center justify-center px-4 py-12 overflow-y-auto">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-primary/6 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-lavender-bright/4 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <button onClick={onBack}>
            <img src={logoSrc} alt="CortiQuant" className="h-12 object-contain opacity-90 hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* ── Sign-in screen ── */}
        {screen === "signin" && (
          <div className="card-base p-8 glow-subtle">
            <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-4 py-1.5 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-core animate-pulse-dot" />
              <span className="text-xs font-semibold text-lavender-bright uppercase tracking-widest">
                User Sign-In
              </span>
            </div>

            <h1 className="text-3xl font-bold text-warm-white mb-1">Sign in to your</h1>
            <h1 className="font-display text-3xl italic text-gradient mb-3">CortiQuant account</h1>
            <p className="text-sm text-text-muted mb-8 leading-relaxed">
              Enter your username or email address and password to access your personal dashboard.
            </p>

            <div className="space-y-3 mb-4">
              <InputRow
                icon={<PersonIcon focused={usernameFocused} />}
                type="text"
                placeholder="Enter your username or email"
                value={employeeIdentifier}
                onChange={setEmployeeIdentifier}
                focused={usernameFocused}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
              />
              <InputRow
                icon={<LockIcon focused={passwordFocused} />}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={setPassword}
                focused={passwordFocused}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                suffix={<EyeToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
              />
              <div className="flex justify-end mt-1 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg("")
                    setForgotSuccessMsg("")
                    setScreen("forgot")
                  }}
                  className="text-xs text-lavender-bright hover:text-lavender-soft transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <p className="text-xs text-c-critical bg-c-critical/10 border border-c-critical/25 rounded-xl px-4 py-2.5 mb-4">
                {errorMsg}
              </p>
            )}

            <div className="flex items-start gap-2.5 mb-8">
              <svg className="w-4 h-4 text-purple-core flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 20 20">
                <path d="M10 2l6.5 2.5v5c0 4-2.5 7-6.5 8.5C3.5 16.5 1 13.5 1 9.5v-5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-xs text-text-muted leading-relaxed">
                Your responses, assessments, and reset history are 100% private and confidential.
              </p>
            </div>

            <button
              className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 mb-5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              onClick={handleSignIn}
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
              {!loading && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            <p className="text-center text-sm text-text-muted">
              {"Don't have an account? "}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg("")
                  setScreen("signup")
                }}
                className="text-lavender-bright font-semibold hover:text-lavender-soft transition-colors cursor-pointer"
              >
                Sign up
              </button>
            </p>
          </div>
        )}

        {/* ── Forgot Password Screen ── */}
        {screen === "forgot" && (
          <div className="card-base p-8 glow-subtle animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-4 py-1.5 mb-6">
              <span className="text-xs font-semibold text-lavender-bright uppercase tracking-widest">
                Password Recovery
              </span>
            </div>

            <h1 className="text-3xl font-bold text-warm-white mb-1">Reset your</h1>
            <h1 className="font-display text-3xl italic text-gradient mb-3">password</h1>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              Enter your email address and we'll send you a secure link to reset your password.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">Email address</label>
              <InputRow
                icon={<EmailIcon focused={forgotEmailFocused} />}
                type="email"
                placeholder="Enter your registered email address"
                value={forgotEmail}
                onChange={setForgotEmail}
                focused={forgotEmailFocused}
                onFocus={() => setForgotEmailFocused(true)}
                onBlur={() => setForgotEmailFocused(false)}
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-c-critical bg-c-critical/10 border border-c-critical/25 rounded-xl px-4 py-2.5 mb-4 animate-shake">
                {errorMsg}
              </p>
            )}

            <button
              className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 mb-5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              onClick={() => handleRequestPasswordReset(false)}
              disabled={loading || !forgotEmail.trim()}
            >
              {loading ? "Sending reset link…" : "Send Reset Link"}
            </button>

            <p className="text-center text-sm text-text-muted">
              Remember your password?{" "}
              <button
                type="button"
                onClick={() => { setErrorMsg(""); setScreen("signin"); }}
                className="text-lavender-bright font-semibold hover:text-lavender-soft transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </div>
        )}

        {/* ── Check Your Email Screen ── */}
        {screen === "check-email" && (
          <div className="card-base p-8 glow-subtle animate-fade-up text-center">
            <div className="w-16 h-16 rounded-full bg-purple-core/10 border border-purple-core/25 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-lavender-bright" fill="none" viewBox="0 0 24 24">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-4 py-1.5 mb-4">
              <span className="text-xs font-semibold text-lavender-bright uppercase tracking-widest">
                Check Your Email
              </span>
            </div>

            <h1 className="text-2xl font-bold text-warm-white mb-2">Check your email</h1>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              If an account exists with this email address, we've sent you a password reset link.
            </p>

            <button
              onClick={() => {
                setErrorMsg("")
                setScreen("signin")
              }}
              className="btn-primary w-full py-3.5 text-sm font-semibold rounded-xl cursor-pointer mb-4"
            >
              Return to Sign In
            </button>

            <div className="pt-2 border-t border-border-s/40 flex flex-col items-center">
              <p className="text-xs text-text-muted mb-2">Didn't receive the email?</p>
              <button
                type="button"
                disabled={loading || resendCooldown > 0}
                onClick={() => handleRequestPasswordReset(true)}
                className="text-xs font-medium text-lavender-bright hover:text-lavender-soft disabled:text-text-muted disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {resendCooldown > 0 ? `Resend Reset Link (${resendCooldown}s)` : "Resend Reset Link"}
              </button>
            </div>
          </div>
        )}

        {/* ── B2C Individual User Sign-Up Screen ── */}
        {screen === "signup" && (
          <div className="card-base p-8 glow-subtle animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-4 py-1.5 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-core animate-pulse-dot" />
              <span className="text-xs font-semibold text-lavender-bright uppercase tracking-widest">
                Create Account
              </span>
            </div>

            <h1 className="text-3xl font-bold text-warm-white mb-1">Join</h1>
            <h1 className="font-display text-3xl italic text-gradient mb-3">CortiQuant</h1>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              Create your personal account to understand your stress patterns and start your recovery journey.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Full Name *</label>
                <InputRow
                  icon={<PersonIcon focused={nameFocused} />}
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={setFullName}
                  focused={nameFocused}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Username *</label>
                <InputRow
                  icon={<PersonIcon focused={usernameFocused2} />}
                  placeholder="Choose a unique username"
                  value={username}
                  onChange={setUsername}
                  focused={usernameFocused2}
                  onFocus={() => setUsernameFocused2(true)}
                  onBlur={() => setUsernameFocused2(false)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Email Address *</label>
                <InputRow
                  icon={<EmailIcon focused={emailFocused} />}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(val) => {
                    setEmail(val)
                    if (errorMsg && (errorMsg.includes("email") || errorMsg.includes("Email"))) {
                      setErrorMsg("")
                    }
                  }}
                  focused={emailFocused}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => {
                    setEmailFocused(false)
                    setEmailTouched(true)
                  }}
                />
                {emailTouched && !email.trim() && (
                  <p className="text-[11px] text-c-critical mt-1 px-1">Email address is required.</p>
                )}
                {emailTouched && email.trim() && !isEmailValid && (
                  <p className="text-[11px] text-c-critical mt-1 px-1">Please enter a valid email address.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Password *</label>
                <InputRow
                  icon={<LockIcon focused={createPwFocused} />}
                  type={showCreatePw ? "text" : "password"}
                  placeholder="Create password"
                  value={createPw}
                  onChange={setCreatePw}
                  focused={createPwFocused}
                  onFocus={() => setCreatePwFocused(true)}
                  onBlur={() => setCreatePwFocused(false)}
                  suffix={<EyeToggle show={showCreatePw} onToggle={() => setShowCreatePw(!showCreatePw)} />}
                />
              </div>
            </div>

            {/* Password requirements */}
            <div className="card-elevated rounded-2xl px-4 py-3 mb-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2.5">Password Requirements</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <ReqItem met={pwReqs.length} label="8+ characters" />
                <ReqItem met={pwReqs.upper} label="One uppercase" />
                <ReqItem met={pwReqs.lower} label="One lowercase" />
                <ReqItem met={pwReqs.number} label="One number" />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">Confirm Password *</label>
              <InputRow
                icon={<LockIcon focused={confirmPwFocused} />}
                type={showConfirmPw ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPw}
                onChange={setConfirmPw}
                focused={confirmPwFocused}
                onFocus={() => setConfirmPwFocused(true)}
                onBlur={() => setConfirmPwFocused(false)}
                suffix={<EyeToggle show={showConfirmPw} onToggle={() => setShowConfirmPw(!showConfirmPw)} />}
              />
            </div>

            {/* Consent checkboxes */}
            <div className="card-elevated rounded-2xl px-4 py-4 space-y-3 mb-6">
              <Checkbox
                id="checkbox-privacy"
                checked={agreePrivacy}
                onChange={() => {
                  setAgreePrivacy(!agreePrivacy)
                  if (errorMsg && errorMsg.includes("Privacy Policy")) setErrorMsg("")
                }}
              >
                I have read, understood, and agree to CortiQuant's{" "}
                <Link
                  to="/privacy-policy"
                  onClick={(e) => e.stopPropagation()}
                  className="text-lavender-bright underline underline-offset-2 hover:text-warm-white transition-colors"
                >
                  Privacy Policy
                </Link>{" "}
                governing data protection and confidential handling.
              </Checkbox>

              <Checkbox
                id="checkbox-consent"
                checked={agreeConsent}
                onChange={() => {
                  setAgreeConsent(!agreeConsent)
                  if (errorMsg && errorMsg.includes("Participant Consent")) setErrorMsg("")
                }}
              >
                I voluntarily agree to the terms in the{" "}
                <Link
                  to="/participant-consent"
                  onClick={(e) => e.stopPropagation()}
                  className="text-lavender-bright underline underline-offset-2 hover:text-warm-white transition-colors"
                >
                  Participant Consent Form
                </Link>{" "}
                for the Pilot Testing Program.
              </Checkbox>
            </div>

            {/* Error message */}
            {errorMsg && (
              <p className="text-xs text-c-critical bg-c-critical/10 border border-c-critical/25 rounded-xl px-4 py-2.5 mb-4 animate-shake">
                {errorMsg}
              </p>
            )}

            <button
              className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 mb-4 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer"
              onClick={handleCreateAccount}
              disabled={loading || !fullName.trim() || !username.trim() || !email.trim() || !isEmailValid || !Object.values(pwReqs).every(Boolean) || createPw !== confirmPw}
            >
              {loading ? "Creating Account…" : "Create Account"}
              {!loading && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            <p className="text-center text-sm text-text-muted">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { setErrorMsg(""); setScreen("signin"); }}
                className="text-lavender-bright font-semibold hover:text-lavender-soft transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </div>
        )}

        <div className="text-center mt-6">
          <button onClick={handleBack} className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer">
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
