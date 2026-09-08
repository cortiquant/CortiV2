import { useState, useRef } from "react"
import logoSrc from "@/imports/image-2.png"

interface LoginProps {
  onEmployeeSignIn: () => void
  onCreateAccount: (name: string, username: string) => void
  onHR: () => void
  onBack: () => void
}

type Mode = "employee" | "hr"
type Screen = "signin" | "join" | "create"

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

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onChange} className="flex items-start gap-3 text-left group">
      <div className={`w-4 h-4 mt-0.5 rounded flex-shrink-0 border transition-all ${checked ? "bg-purple-core border-purple-core" : "border-border-s bg-elevated group-hover:border-border-s"}`}>
        {checked && (
          <svg className="w-full h-full text-warm-white p-0.5" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-xs text-text-muted leading-relaxed">{children}</span>
    </button>
  )
}

const API_BASE = ""

export default function Login({ onEmployeeSignIn, onCreateAccount, onHR, onBack }: LoginProps) {
  const [screen, setScreen] = useState<Screen>("signin")
  const [mode, setMode] = useState<Mode>("employee")

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
  const [createPw, setCreatePw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [showCreatePw, setShowCreatePw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [nameFocused, setNameFocused] = useState(false)
  const [usernameFocused2, setUsernameFocused2] = useState(false)
  const [createPwFocused, setCreatePwFocused] = useState(false)
  const [confirmPwFocused, setConfirmPwFocused] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeConsent, setAgreeConsent] = useState(false)

  // Loading + error state
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  const pwReqs = {
    length: createPw.length >= 8,
    lower: /[a-z]/.test(createPw),
    upper: /[A-Z]/.test(createPw),
    number: /[0-9]/.test(createPw),
  }

  // ── Step 1: Verify Organisation Code ──
  async function handleVerifyOrg() {
    setErrorMsg("")
    if (!orgCode.trim()) {
      setErrorMsg("Please enter an Organisation Code.")
      return
    }

    setVerifyingOrg(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-organisation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationCode: orgCode.trim() }),
      })
      const data = await res.json()

      if (!res.ok || !data.success || !data.organisation) {
        setErrorMsg(data.message || "Invalid organisation code. Please check with your HR.")
        return
      }

      setVerifiedOrg(data.organisation)
      setScreen("create")
    } catch {
      setErrorMsg("Unable to verify organisation code. Please check your network connection.")
    } finally {
      setVerifyingOrg(false)
    }
  }

  // ── Sign-in handler ──
  async function handleSignIn() {
    setErrorMsg("")
    setLoading(true)
    abortRef.current = new AbortController()

    try {
      if (mode === "employee") {
        const res = await fetch(`${API_BASE}/api/auth/employee/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: employeeIdentifier, password }),
          signal: abortRef.current.signal,
        })
        const data = await res.json()

        if (!res.ok || !data.success) {
          setErrorMsg(data.message || "Invalid username or password.")
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
          localStorage.setItem("cq_approval_status", "pending")
        }

        onEmployeeSignIn()
      } else {
        // HR login
        const res = await fetch(`${API_BASE}/api/auth/hr/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: hrEmail, password }),
          signal: abortRef.current.signal,
        })
        const data = await res.json()

        if (!res.ok || !data.success) {
          setErrorMsg(data.message || "HR sign in failed.")
          return
        }

        localStorage.setItem("cq_token", data.token)
        localStorage.setItem("cq_user_name", data.user.name)
        localStorage.setItem("cq_user_email", data.user.email)
        localStorage.setItem("cq_role", data.user.role)
        onHR()
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setErrorMsg("Cannot connect to server. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const backLabel = screen === "create" ? "← Back to org code" : screen === "join" ? "← Back to sign in" : "← Back to home"
  function handleBack() {
    setErrorMsg("")
    if (screen === "create") setScreen("join")
    else if (screen === "join") setScreen("signin")
    else onBack()
  }

  // ── Step 2: Create Account ──
  async function handleCreateAccount() {
    setErrorMsg("")
    if (!verifiedOrg) {
      setErrorMsg("Please verify your Organisation Code first.")
      setScreen("join")
      return
    }

    setLoading(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch(`${API_BASE}/api/auth/employee/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationCode: verifiedOrg.organisationCode,
          name: fullName.trim(),
          username: username.trim().toLowerCase(),
          password: createPw,
          privacyConsent: agreePrivacy,
          participantConsent: agreeConsent,
        }),
        signal: abortRef.current.signal,
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Account creation failed.")
        return
      }

      // Store authenticated session token so employee can immediately complete Corporate Onboarding
      if (data.token) localStorage.setItem("cq_token", data.token)
      localStorage.setItem("cq_user_name", data.user.name)
      if (data.user.username) localStorage.setItem("cq_username", data.user.username)
      localStorage.setItem("cq_user_id", data.user.id)
      localStorage.setItem("cq_org_id", data.user.organisationId)
      localStorage.setItem("cq_org_code", data.user.organisationCode)
      localStorage.setItem("cq_approval_status", "none")
      localStorage.setItem("cq_onboarding_status", "incomplete")

      onCreateAccount(fullName, username)
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setErrorMsg("Cannot connect to server. Please try again.")
      }
    } finally {
      setLoading(false)
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
          <>
            <div className="flex gap-1 bg-surface border border-border-p rounded-xl p-1 mb-8">
              {(["employee", "hr"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setErrorMsg(""); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === m ? "bg-purple-core text-warm-white" : "text-text-muted hover:text-text-secondary"}`}
                >
                  {m === "employee" ? "Employee" : "HR Team"}
                </button>
              ))}
            </div>

            <div className="card-base p-8 glow-subtle">
              <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-4 py-1.5 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-core animate-pulse-dot" />
                <span className="text-xs font-semibold text-lavender-bright uppercase tracking-widest">
                  {mode === "employee" ? "Employee Sign-In" : "HR Sign-In"}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-warm-white mb-1">Sign in with your</h1>
              <h1 className="font-display text-3xl italic text-gradient mb-3">{mode === "employee" ? "username" : "email"}</h1>
              <p className="text-sm text-text-muted mb-8 leading-relaxed">
                {mode === "employee"
                  ? "Use the username chosen during your workspace sign-up."
                  : "Use your HR administrator credentials to access the workforce dashboard."}
              </p>

              <div className="space-y-3 mb-4">
                <InputRow
                  icon={mode === "employee" ? <PersonIcon focused={usernameFocused} /> : <EmailIcon focused={usernameFocused} />}
                  type={mode === "employee" ? "text" : "email"}
                  placeholder={mode === "employee" ? "Enter your username" : "Enter your email"}
                  value={mode === "employee" ? employeeIdentifier : hrEmail}
                  onChange={mode === "employee" ? setEmployeeIdentifier : setHrEmail}
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
                  Your responses are private. Only anonymised insights are shared with your organisation.
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

              {mode === "employee" && (
                <p className="text-center text-sm text-text-muted">
                  {"Don't have an account? "}
                  <button onClick={() => { setErrorMsg(""); setScreen("join"); }} className="text-lavender-bright font-semibold hover:text-lavender-soft transition-colors cursor-pointer">
                    Join with Org Code
                  </button>
                </p>
              )}
            </div>
          </>
        )}

        {/* ── Step 1: Join with Org Code screen ── */}
        {screen === "join" && (
          <div className="card-base p-8 glow-subtle animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-surface border border-border-s rounded-full px-4 py-1.5 mb-6">
              <span className="text-sm">🏢</span>
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-widest">Corporate Access</span>
            </div>

            <h1 className="text-3xl font-bold text-warm-white mb-1">Join your</h1>
            <h1 className="font-display text-3xl italic text-gradient mb-4">organisation</h1>
            <p className="text-sm text-text-muted leading-relaxed mb-8">
              Enter the Organisation Code provided by your HR or People Team to begin
              creating your CortiQuant workspace account.
            </p>

            <div className="mb-2">
              <InputRow
                icon={<LockIcon focused={orgFocused} />}
                placeholder="Enter Organisation Code"
                value={orgCode}
                onChange={(v) => setOrgCode(v.toUpperCase())}
                focused={orgFocused}
                onFocus={() => setOrgFocused(true)}
                onBlur={() => setOrgFocused(false)}
                mono
              />
            </div>
            <p className="text-xs text-text-muted mb-6 px-1">
              You can obtain this code from your HR or People Team. (Example: TEST4524)
            </p>

            {/* Error message */}
            {errorMsg && (
              <p className="text-xs text-c-critical bg-c-critical/10 border border-c-critical/25 rounded-xl px-4 py-2.5 mb-6">
                {errorMsg}
              </p>
            )}

            <button
              className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 mb-5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              onClick={handleVerifyOrg}
              disabled={verifyingOrg || !orgCode.trim()}
            >
              {verifyingOrg ? "Verifying…" : "Continue"}
              {!verifyingOrg && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            <p className="text-center text-sm text-text-muted">
              Already have an account?{" "}
              <button onClick={() => { setErrorMsg(""); setScreen("signin"); }} className="text-lavender-bright font-semibold hover:text-lavender-soft transition-colors cursor-pointer">
                Sign In
              </button>
            </p>
          </div>
        )}

        {/* ── Step 2: Create Account screen ── */}
        {screen === "create" && (
          <div className="card-base p-8 glow-subtle animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-4 py-1.5 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-core animate-pulse-dot" />
              <span className="text-xs font-semibold text-lavender-bright uppercase tracking-widest">
                Account Setup
              </span>
            </div>

            <h1 className="text-3xl font-bold text-warm-white mb-1">Create your</h1>
            <h1 className="font-display text-3xl italic text-gradient mb-3">account</h1>

            {/* Verified Organisation Banner (Read-only) */}
            {verifiedOrg && (
              <div className="bg-surface/80 border border-border-s rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">Organisation</p>
                    <p className="text-sm font-bold text-warm-white mt-0.5">{verifiedOrg.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">Code</p>
                    <p className="text-xs font-mono font-bold text-lavender-bright mt-0.5">{verifiedOrg.organisationCode}</p>
                  </div>
                </div>
              </div>
            )}

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
              <Checkbox checked={agreePrivacy} onChange={() => setAgreePrivacy(!agreePrivacy)}>
                I have read and agree to the{" "}
                <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-lavender-bright underline underline-offset-2">
                  Privacy Policy
                </a>.
              </Checkbox>
              <Checkbox checked={agreeConsent} onChange={() => setAgreeConsent(!agreeConsent)}>
                I have read and agree to the{" "}
                <span className="text-lavender-bright underline underline-offset-2">
                  Participant Consent Form
                </span>.
              </Checkbox>
            </div>

            {/* Error message */}
            {errorMsg && (
              <p className="text-xs text-c-critical bg-c-critical/10 border border-c-critical/25 rounded-xl px-4 py-2.5 mb-4">
                {errorMsg}
              </p>
            )}

            <button
              className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer"
              onClick={handleCreateAccount}
              disabled={loading || !agreePrivacy || !agreeConsent || !fullName.trim() || !username.trim() || !Object.values(pwReqs).every(Boolean) || createPw !== confirmPw}
            >
              {loading ? "Creating Account…" : "Create Account"}
              {!loading && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
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
