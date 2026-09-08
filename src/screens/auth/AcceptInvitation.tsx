import { useState, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import logoSrc from "@/imports/image-2.png"

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token") || ""

  const [validating, setValidating] = useState(true)
  const [invitation, setInvitation] = useState<{
    name: string
    email: string
    organisationName: string
    organisationCode: string
    expiresAt: string
  } | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setValidationError("No invitation token was provided in the link.")
      setValidating(false)
      return
    }

    fetch(`/api/hr/invitations/validate?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.invitation) {
          setInvitation(data.invitation)
        } else {
          setValidationError(data.message || "This invitation is invalid or has expired.")
        }
      })
      .catch(() => {
        setValidationError("Could not connect to the server. Please check your internet connection.")
      })
      .finally(() => {
        setValidating(false)
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!password || password.length < 6) {
      setSubmitError("Password must be at least 6 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.")
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch("/api/hr/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccess(true)
      } else {
        setSubmitError(data.message || "Failed to create your account. Please try again.")
      }
    } catch {
      setSubmitError("Could not connect to the server. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f0fa] via-white to-[#f5f0fa] flex flex-col items-center justify-center p-4 selection:bg-purple-core selection:text-white">
      {/* Brand Header */}
      <div className="mb-8 flex flex-col items-center">
        <img src={logoSrc} alt="CortiQuant" className="h-9 mb-3 object-contain" />
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">CortiQuant HR Portal</h1>
      </div>

      <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl shadow-xl shadow-purple-900/5 overflow-hidden">
        {/* Loading State */}
        {validating && (
          <div className="p-10 text-center space-y-4">
            <div className="w-10 h-10 border-3 border-purple-core border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-gray-600">Verifying your invitation...</p>
          </div>
        )}

        {/* Validation Error State */}
        {!validating && validationError && (
          <div className="p-8 text-center space-y-5">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Invitation Invalid or Expired</h2>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{validationError}</p>
            </div>
            <button
              onClick={() => navigate("/company-login")}
              className="w-full bg-gray-900 hover:bg-black text-white text-xs font-semibold py-3 rounded-xl transition-colors"
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Success State */}
        {!validating && success && (
          <div className="p-8 text-center space-y-5 animate-fade-in">
            <div className="w-14 h-14 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mx-auto">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Account Created Successfully!</h2>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Your HR administrator account has been activated for <strong>{invitation?.organisationName}</strong>. You can now log in using your email and password.
              </p>
            </div>
            <button
              onClick={() => navigate("/company-login")}
              className="w-full bg-purple-core hover:bg-purple-700 text-white text-xs font-semibold py-3 rounded-xl transition-colors shadow-sm"
            >
              Sign In to HR Dashboard
            </button>
          </div>
        )}

        {/* Setup Password Form */}
        {!validating && !validationError && !success && invitation && (
          <div className="p-8">
            <div className="mb-6 text-center">
              <span className="inline-block px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full mb-3">
                HR Administrator Invitation
              </span>
              <h2 className="text-xl font-bold text-gray-900">Accept Your Invitation</h2>
              <p className="text-xs text-gray-500 mt-1">Set up your password to activate your workspace account.</p>
            </div>

            {/* Organisation Card Info */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-medium">Invited Name</span>
                <span className="text-gray-900 font-semibold">{invitation.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-medium">Email Address</span>
                <span className="text-gray-900 font-semibold">{invitation.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200/60">
                <span className="text-gray-400 font-medium">Organisation</span>
                <span className="text-purple-700 font-bold">{invitation.organisationName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-medium">Org Code</span>
                <span className="font-mono text-gray-700 font-semibold">{invitation.organisationCode}</span>
              </div>
            </div>

            {submitError && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Create Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full text-sm px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core pr-14 selection:bg-purple-100 selection:text-gray-900"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-700 font-medium text-xs px-1 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full text-sm px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core pr-14 selection:bg-purple-100 selection:text-gray-900"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-700 font-medium text-xs px-1 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-purple-core hover:bg-purple-700 text-white font-semibold text-xs py-3 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Activating Account...</span>
                  </>
                ) : (
                  "Accept Invitation & Create Account"
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
