import { useState } from "react"
import logoSrc from "@/imports/image-2.png"

interface ListenerLoginProps {
  onSignIn: () => void
  onBack: () => void
}

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
    <button type="button" onClick={onToggle} className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer" tabIndex={-1}>
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
  disabled,
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
  disabled?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-elevated border transition-all duration-150 ${focused ? "border-purple-core ring-2 ring-purple-core/15" : "border-border-p"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
      {icon}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        className="flex-1 bg-transparent text-sm text-warm-white placeholder-text-muted focus:outline-none"
      />
      {suffix}
    </div>
  )
}

export default function ListenerLogin({ onSignIn, onBack }: ListenerLoginProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSignIn(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setErrorMessage(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter both email and password.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/listener/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Invalid credentials. Please try again.")
        setLoading(false)
        return
      }

      // Successful login - persist tokens and profile info
      localStorage.setItem("cq_token", data.token)
      localStorage.setItem("cq_role", data.role || "LISTENER")
      localStorage.setItem("cq_user_email", data.listener?.email || trimmedEmail)
      localStorage.setItem("cq_user_name", data.listener?.name || "Listener")
      if (data.listener?.listenerId) {
        localStorage.setItem("cq_listener_id", data.listener.listenerId)
      }

      onSignIn()
    } catch {
      setErrorMessage("Unable to connect to the authentication server. Please verify your connection.")
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
          <button onClick={onBack} type="button" className="cursor-pointer">
            <img src={logoSrc} alt="CortiQuant" className="h-12 object-contain opacity-90 hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <div className="card-base p-8 glow-subtle">
          <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-core animate-pulse-dot" />
            <span className="text-xs font-semibold text-lavender-bright uppercase tracking-widest">
              Listener Sign-In
            </span>
          </div>

          <h1 className="text-3xl font-bold text-warm-white mb-1">Sign in with your</h1>
          <h1 className="font-display text-3xl italic text-gradient mb-3">email</h1>
          <p className="text-sm text-text-muted mb-6 leading-relaxed">
            Use your CortiQuant listener credentials to access the peer support dashboard.
          </p>

          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-c-critical/10 border border-c-critical/30 text-xs text-c-critical flex items-start gap-2.5 animate-fade-in">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
                <path d="M12 8v4m0 4h.01" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSignIn}>
            <div className="space-y-3 mb-8">
              <InputRow
                icon={<EmailIcon focused={emailFocused} />}
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={setEmail}
                focused={emailFocused}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                disabled={loading}
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
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 mb-5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <button onClick={onBack} type="button" className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer">
            &larr; Back to home
          </button>
        </div>
      </div>
    </div>
  )
}
