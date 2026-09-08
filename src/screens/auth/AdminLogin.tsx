import { useState } from "react"
import logoSrc from "@/imports/image-2.png"

interface AdminLoginProps {
  onSignIn: () => void
  onBack: () => void
}

const API_BASE = ""

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
        className="flex-1 bg-transparent text-sm text-warm-white placeholder-text-muted focus:outline-none"
      />
      {suffix}
    </div>
  )
}

export default function AdminLogin({ onSignIn, onBack }: AdminLoginProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  async function handleAdminSignIn() {
    setErrorMsg("")

    if (!email || !password) {
      setErrorMsg("Please enter both email and password.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await res.json()

      if (res.ok && data.success && data.token) {
        localStorage.setItem("cq_token", data.token)
        localStorage.setItem("cq_user_id", data.user.id)
        localStorage.setItem("cq_user_name", data.user.name || "Founder")
        localStorage.setItem("cq_user_email", data.user.email)
        localStorage.setItem("cq_role", "admin")
        onSignIn()
        return
      }

      setErrorMsg(data.message || "Invalid founder credentials.")
    } catch {
      setErrorMsg("Could not connect to backend server. Please verify backend is running.")
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

        <div className="card-base p-8 glow-subtle">
          <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs font-semibold text-lavender-bright uppercase tracking-widest">
              Founder & Admin
            </span>
          </div>

          <h1 className="text-3xl font-bold text-warm-white mb-1">Sign in with your</h1>
          <h1 className="font-display text-3xl italic text-gradient mb-3">email</h1>
          <p className="text-sm text-text-muted mb-6 leading-relaxed">
            Use your founder credentials to access the global administration dashboard.
          </p>

          <div className="space-y-3 mb-4">
            <InputRow
              icon={<EmailIcon focused={emailFocused} />}
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={setEmail}
              focused={emailFocused}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
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

          {errorMsg && (
            <p className="text-xs text-c-critical bg-c-critical/10 border border-c-critical/25 rounded-xl px-4 py-2.5 mb-4">
              {errorMsg}
            </p>
          )}

          <button
            className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 mb-5 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleAdminSignIn}
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
            {!loading && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        <div className="text-center mt-6">
          <button onClick={onBack} className="text-xs text-text-muted hover:text-text-secondary transition-colors">
            &larr; Back to home
          </button>
        </div>
      </div>
    </div>
  )
}
