import { useState, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import logoSrc from "@/imports/image-2.png"

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

export default function ListenerAcceptInvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token") || ""

  const [validating, setValidating] = useState(true)
  const [inviteData, setInviteData] = useState<{
    name: string
    email: string
    listenerId?: string
    expiresAt?: string
  } | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [confirmFocused, setConfirmFocused] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setValidating(false)
      setValidationError("Invitation token is missing. Please use the complete link provided in your email.")
      return
    }

    let isMounted = true
    async function validateToken() {
      try {
        const res = await fetch(`/api/listener/validate-invite?token=${encodeURIComponent(token)}`)
        const data = await res.json()

        if (!isMounted) return
        if (res.ok && data.success) {
          setInviteData(data.invitation)
        } else {
          setValidationError(data.message || "This invitation link is invalid or has expired.")
        }
      } catch {
        if (isMounted) {
          setValidationError("Unable to verify invitation link. Please check your connection.")
        }
      } finally {
        if (isMounted) setValidating(false)
      }
    }

    validateToken()
    return () => {
      isMounted = false
    }
  }, [token])

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match. Please verify both fields.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/listener/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setSubmitError(data.message || "Failed to set up account. Please try again.")
        setSubmitting(false)
        return
      }

      setSuccess(true)
      // Save auth details and navigate to listener portal
      if (data.token) {
        localStorage.setItem("cq_token", data.token)
        localStorage.setItem("cq_role", "LISTENER")
        localStorage.setItem("cq_user_email", data.listener?.email || inviteData?.email || "")
        localStorage.setItem("cq_user_name", data.listener?.name || inviteData?.name || "Listener")
        if (data.listener?.listenerId) {
          localStorage.setItem("cq_listener_id", data.listener.listenerId)
        }
      }

      setTimeout(() => {
        navigate("/listener-portal")
      }, 1500)
    } catch {
      setSubmitError("Network error. Please try submitting again.")
      setSubmitting(false)
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
          <button onClick={() => navigate("/")} type="button" className="cursor-pointer">
            <img src={logoSrc} alt="CortiQuant" className="h-12 object-contain opacity-90 hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <div className="card-base p-8 glow-subtle">
          <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-core animate-pulse-dot" />
            <span className="text-xs font-semibold text-lavender-bright uppercase tracking-widest">
              Listener Invitation
            </span>
          </div>

          {validating ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <svg className="w-8 h-8 text-purple-core animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-sm text-text-secondary">Validating invitation link...</p>
            </div>
          ) : validationError ? (
            <div className="py-4">
              <div className="w-12 h-12 rounded-full bg-c-critical/10 border border-c-critical/30 flex items-center justify-center mx-auto mb-4 text-c-critical">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-warm-white text-center mb-2">Invalid or Expired Link</h2>
              <p className="text-sm text-text-muted text-center mb-6 leading-relaxed">
                {validationError}
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigate("/listener/login")}
                  className="btn-primary w-full py-3 text-sm cursor-pointer"
                >
                  Go to Listener Sign-In
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="w-full py-2 text-xs text-text-muted hover:text-warm-white transition-colors cursor-pointer"
                >
                  Back to Home
                </button>
              </div>
            </div>
          ) : success ? (
            <div className="py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-c-success/15 border border-c-success/30 flex items-center justify-center mx-auto mb-4 text-c-success animate-fade-in">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-warm-white mb-2">Welcome to CortiQuant!</h2>
              <p className="text-sm text-text-muted mb-4">Your listener account has been activated successfully.</p>
              <p className="text-xs text-lavender-bright">Redirecting you to the listener dashboard...</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-warm-white mb-1">Welcome, {inviteData?.name}</h1>
              <p className="text-sm text-text-muted mb-6 leading-relaxed">
                Create a secure password to activate your peer support listener account.
              </p>

              {/* Readonly info */}
              <div className="mb-6 p-4 rounded-xl bg-elevated border border-border-p space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Account Name:</span>
                  <span className="font-semibold text-warm-white">{inviteData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Assigned Email:</span>
                  <span className="font-mono-data text-lavender-soft">{inviteData?.email}</span>
                </div>
                {inviteData?.listenerId && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Listener ID:</span>
                    <span className="font-mono-data text-purple-core font-semibold">{inviteData.listenerId}</span>
                  </div>
                )}
              </div>

              {submitError && (
                <div className="mb-6 p-3.5 rounded-xl bg-c-critical/10 border border-c-critical/30 text-xs text-c-critical flex items-start gap-2.5 animate-fade-in">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
                    <path d="M12 8v4m0 4h.01" strokeWidth={2} strokeLinecap="round" />
                  </svg>
                  <div className="flex-1 leading-relaxed">{submitError}</div>
                </div>
              )}

              <form onSubmit={handleAccept} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Create Password
                  </label>
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-elevated border transition-all duration-150 ${passwordFocused ? "border-purple-core ring-2 ring-purple-core/15" : "border-border-p"}`}>
                    <LockIcon focused={passwordFocused} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      disabled={submitting}
                      className="flex-1 bg-transparent text-sm text-warm-white placeholder-text-muted focus:outline-none"
                    />
                    <EyeToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-elevated border transition-all duration-150 ${confirmFocused ? "border-purple-core ring-2 ring-purple-core/15" : "border-border-p"}`}>
                    <LockIcon focused={confirmFocused} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setConfirmFocused(true)}
                      onBlur={() => setConfirmFocused(false)}
                      disabled={submitting}
                      className="flex-1 bg-transparent text-sm text-warm-white placeholder-text-muted focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Activating Account...
                    </>
                  ) : (
                    <>
                      Set Password & Access Dashboard
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <button onClick={() => navigate("/listener/login")} type="button" className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer">
            Already have an active password? Sign in &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
