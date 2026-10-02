import { useState, useEffect } from "react"
import { useSearchParams, useNavigate, Link } from "react-router-dom"

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
    <button onClick={onToggle} type="button" className="text-text-muted hover:text-text-secondary transition-colors" tabIndex={-1}>
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
  onChange: (val: string) => void
  focused: boolean
  onFocus: () => void
  onBlur: () => void
  suffix?: React.ReactNode
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all ${
        focused
          ? "border-purple-core bg-purple-core/5 shadow-glow-sm"
          : "border-border-s bg-elevated hover:border-border-s"
      }`}
    >
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

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = (searchParams.get("token") || "").trim()

  const [validating, setValidating] = useState(true)
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [newPasswordFocused, setNewPasswordFocused] = useState(false)
  const [confirmNewPasswordFocused, setConfirmNewPasswordFocused] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [success, setSuccess] = useState(false)

  const pwReqs = {
    length: newPassword.length >= 8,
    lower: /[a-z]/.test(newPassword),
    upper: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  }

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setValidationError("Reset link expired or invalid.")
      setValidating(false)
      return
    }

    fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIsTokenValid(true)
        } else {
          setValidationError(data.message || "Reset link expired or invalid.")
        }
      })
      .catch(() => {
        setValidationError("Could not connect to the server. Please check your internet connection.")
      })
      .finally(() => {
        setValidating(false)
      })
  }, [token])

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg("")

    if (!token) {
      setErrorMsg("Reset token is missing or invalid.")
      return
    }

    if (!newPassword) {
      setErrorMsg("Please enter a new password.")
      return
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg("Passwords do not match.")
      return
    }

    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!pwRegex.test(newPassword)) {
      setErrorMsg("Password must be at least 8 characters and include uppercase, lowercase, and a number.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Reset link expired or invalid. Please request a new one.")
        return
      }

      setSuccess(true)
    } catch {
      setErrorMsg("Unable to reset password. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full bg-midnight flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden select-none">
      {/* Background ambient lighting glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-core/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Loading validation */}
        {validating && (
          <div className="card-base p-8 glow-subtle text-center">
            <div className="w-8 h-8 border-2 border-purple-core border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-text-muted">Verifying password reset link...</p>
          </div>
        )}

        {/* Invalid or Expired Token State */}
        {!validating && !isTokenValid && !success && (
          <div className="card-base p-8 glow-subtle animate-fade-up text-center">
            <div className="w-16 h-16 rounded-full bg-c-critical/10 border border-c-critical/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-c-critical" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-warm-white mb-2">Reset link expired or invalid</h1>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              {validationError || "This password reset link is invalid or has already been used. Please request a new reset link."}
            </p>
            <button
              onClick={() => navigate("/company-login")}
              className="btn-primary w-full py-3.5 text-sm font-semibold rounded-xl cursor-pointer"
            >
              Request New Reset Link
            </button>
          </div>
        )}

        {/* Success State */}
        {!validating && success && (
          <div className="card-base p-8 glow-subtle animate-fade-up text-center">
            <div className="w-16 h-16 rounded-full bg-c-success/10 border border-c-success/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-c-success" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-warm-white mb-2">Password Updated</h1>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              Your password has been updated successfully. You can now sign in with your new password.
            </p>
            <button
              onClick={() => navigate("/company-login")}
              className="btn-primary w-full py-3.5 text-sm font-semibold rounded-xl cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Reset Password Form */}
        {!validating && isTokenValid && !success && (
          <div className="card-base p-8 glow-subtle animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-4 py-1.5 mb-6">
              <span className="text-xs font-semibold text-lavender-bright uppercase tracking-widest">
                Account Recovery
              </span>
            </div>

            <h1 className="text-3xl font-bold text-warm-white mb-1">Create new</h1>
            <h1 className="font-display text-3xl italic text-gradient mb-3">password</h1>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              Please enter and confirm your new secure password below.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">New Password *</label>
                <InputRow
                  icon={<LockIcon focused={newPasswordFocused} />}
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={setNewPassword}
                  focused={newPasswordFocused}
                  onFocus={() => setNewPasswordFocused(true)}
                  onBlur={() => setNewPasswordFocused(false)}
                  suffix={<EyeToggle show={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)} />}
                />
              </div>

              {/* Password requirements */}
              <div className="card-elevated rounded-2xl px-4 py-3">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2.5">Password Requirements</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <ReqItem met={pwReqs.length} label="8+ characters" />
                  <ReqItem met={pwReqs.upper} label="One uppercase" />
                  <ReqItem met={pwReqs.lower} label="One lowercase" />
                  <ReqItem met={pwReqs.number} label="One number" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Confirm New Password *</label>
                <InputRow
                  icon={<LockIcon focused={confirmNewPasswordFocused} />}
                  type={showConfirmNewPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmNewPassword}
                  onChange={setConfirmNewPassword}
                  focused={confirmNewPasswordFocused}
                  onFocus={() => setNewPasswordFocused(false)}
                  onBlur={() => setConfirmNewPasswordFocused(false)}
                  suffix={<EyeToggle show={showConfirmNewPassword} onToggle={() => setShowConfirmNewPassword(!showConfirmNewPassword)} />}
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-c-critical bg-c-critical/10 border border-c-critical/25 rounded-xl px-4 py-2.5 animate-shake">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 mb-5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={loading || !newPassword || !confirmNewPassword || newPassword !== confirmNewPassword || !Object.values(pwReqs).every(Boolean)}
              >
                {loading ? "Saving new password…" : "Save New Password"}
              </button>

              <p className="text-center text-sm text-text-muted">
                <Link
                  to="/company-login"
                  className="text-lavender-bright font-semibold hover:text-lavender-soft transition-colors"
                >
                  &larr; Return to Sign In
                </Link>
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
