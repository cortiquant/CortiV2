import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import logoSrc from "@/imports/image-2.png"

const OCCUPATIONS = [
  "Working Professional",
  "Student",
  "Homemaker",
  "Other",
] as const

const ILLNESS_HISTORIES = [
  "Physical",
  "Mental",
  "Both",
  "None",
] as const

const GENDERS = [
  "Male",
  "Female",
  "Non-binary",
  "Other",
  "Prefer not to say",
]

export default function CreateProfile() {
  const navigate = useNavigate()

  // Form state
  const [name, setName] = useState(localStorage.getItem("cq_user_name") || "")
  const [username, setUsername] = useState(localStorage.getItem("cq_username") || "")
  const [email] = useState(localStorage.getItem("cq_user_email") || "")
  const [age, setAge] = useState<string>("")
  const [gender, setGender] = useState<string>("")
  const [occupation, setOccupation] = useState<string>("")
  const [sleepHours, setSleepHours] = useState<number>(7)
  const [illnessHistory, setIllnessHistory] = useState<string>("")

  // UI state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    // If user has not signed up or logged in, redirect to login
    const token = localStorage.getItem("cq_token")
    if (!token) {
      navigate("/company-login")
      return
    }

    // Attempt to prefill if profile already partially exists
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.user) {
          if (res.user.name && !name) setName(res.user.name)
          if (res.user.username && !username) setUsername(res.user.username)
          if (res.user.age) setAge(String(res.user.age))
          if (res.user.gender) setGender(res.user.gender)
          if (res.user.occupation) setOccupation(res.user.occupation)
          if (res.user.sleepHours) setSleepHours(Number(res.user.sleepHours))
          if (res.user.illnessHistory) setIllnessHistory(res.user.illnessHistory)
        }
      })
      .catch(() => {})
  }, [navigate])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg("")

    // Validation
    const cleanName = name.trim()
    const cleanUsername = username.trim().toLowerCase()
    const parsedAge = parseInt(age, 10)

    if (!cleanName) {
      setErrorMsg("Please enter your name.")
      return
    }
    if (!cleanUsername) {
      setErrorMsg("Please enter a username.")
      return
    }
    if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 120) {
      setErrorMsg("Please enter a valid age between 10 and 120.")
      return
    }
    if (!gender) {
      setErrorMsg("Please select your gender.")
      return
    }
    if (!occupation) {
      setErrorMsg("Please select your occupation.")
      return
    }
    if (sleepHours === undefined || sleepHours === null || isNaN(sleepHours) || sleepHours < 1 || sleepHours > 24) {
      setErrorMsg("Please provide your average sleep hours (1–24).")
      return
    }
    if (!illnessHistory) {
      setErrorMsg("Please select your previous history of illness.")
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem("cq_token")
      const res = await fetch("/api/employee/create-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: cleanName,
          username: cleanUsername,
          age: parsedAge,
          gender,
          occupation,
          sleepHours,
          illnessHistory,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSaved(true)
        localStorage.setItem("cq_user_name", cleanName)
        localStorage.setItem("cq_username", cleanUsername)
        localStorage.setItem("cq_profile_completed", "true")

        // 1. Purge any stale baseline/MSI keys from localStorage
        localStorage.removeItem("cq_baseline_msi")
        localStorage.removeItem("cq_current_msi")
        localStorage.removeItem("cq_last_baseline_date")
        localStorage.removeItem("cq_next_baseline_date")

        // 2. Obtain the authenticated user's fresh server-side profile and assessment state
        let hasBaseline = false
        try {
          const [meRes, metricsRes] = await Promise.all([
            fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }),
            fetch("/api/assessments/metrics", { headers: { Authorization: `Bearer ${token}` } }),
          ])
          const meData = await meRes.json()
          const metricsData = await metricsRes.json()

          const msiArr = Array.isArray(meData?.user?.msi)
            ? meData.user.msi
            : Array.isArray(metricsData?.data?.msi)
            ? metricsData.data.msi
            : []

          hasBaseline =
            msiArr.some((item: any) => item.type === "baseline" && typeof item.score === "number") ||
            metricsData?.data?.hasBaseline === true ||
            typeof metricsData?.data?.baselineMsi === "number"

          if (hasBaseline) {
            const baselineVal = metricsData?.data?.baselineMsi ?? meData?.user?.baselineMsi
            if (baselineVal != null) {
              localStorage.setItem("cq_baseline_msi", String(baselineVal))
            }
          }
        } catch {
          hasBaseline = false
        }

        // 3. Navigate accordingly: brand new users without baseline go directly to baseline onboarding
        setTimeout(() => {
          if (!hasBaseline) {
            navigate("/baseline")
          } else {
            navigate("/home")
          }
        }, 800)
      } else {
        setErrorMsg(data.message || "Failed to save profile. Please check the fields and try again.")
      }
    } catch {
      setErrorMsg("Connection error while saving profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full bg-midnight flex flex-col items-center justify-center px-4 py-12 overflow-y-auto">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-primary/6 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-lavender-bright/4 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg animate-fade-up">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logoSrc} alt="CortiQuant" className="h-10 object-contain opacity-90" />
        </div>

        {/* Card */}
        <div className="card-base p-6 sm:p-8 glow-subtle">
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-core/15 text-lavender-bright border border-purple-core/30 mb-3">
              Step 1 of 1 · Personal Setup
            </span>
            <h1 className="text-2xl font-bold text-warm-white">Create Your Profile</h1>
            <p className="text-xs text-text-muted mt-1.5 max-w-sm mx-auto">
              Please complete your personal CortiQuant profile to tailor your wellbeing insights.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-c-critical/15 border border-c-critical/30 text-c-critical text-xs flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
                <path strokeWidth={2} d="M12 8v4m0 4h.01" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {saved && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center justify-center gap-2 animate-fade-in">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Profile saved! Redirecting to your dashboard...</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* 1. Name */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Full Name <span className="text-purple-accent">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                className="input-base w-full py-2.5 px-3.5 text-sm"
              />
            </div>

            {/* 2 & 3. Username and Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Username <span className="text-purple-accent">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    required
                    className="input-base w-full py-2.5 pl-8 pr-3.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Email</span>
                  <span className="text-[10px] text-text-muted lowercase flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Account email
                  </span>
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  readOnly
                  className="input-base w-full py-2.5 px-3.5 text-sm bg-elevated/40 text-text-muted cursor-not-allowed border-border-p/60"
                />
              </div>
            </div>

            {/* 4 & 5. Age and Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Age <span className="text-purple-accent">*</span>
                </label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 28"
                  required
                  className="input-base w-full py-2.5 px-3.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Gender <span className="text-purple-accent">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                  className="input-base w-full py-2.5 px-3.5 text-sm bg-surface text-warm-white"
                >
                  <option value="" disabled className="bg-surface text-text-muted">Select gender</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g} className="bg-surface text-warm-white">
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 6. Occupation */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Occupation <span className="text-purple-accent">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {OCCUPATIONS.map((occ) => {
                  const isSelected = occupation === occ
                  return (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => setOccupation(occ)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-medium text-left border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-purple-core/20 border-purple-core text-lavender-bright shadow-sm"
                          : "bg-elevated/40 border-border-p text-text-secondary hover:border-border-s hover:bg-elevated"
                      }`}
                    >
                      <span className="truncate">{occ}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-lavender-bright flex-shrink-0 ml-1.5" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 7. Sleep Hours */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Sleep Hours (Daily) <span className="text-purple-accent">*</span>
                </label>
                <span className="text-xs font-bold text-lavender-bright bg-purple-core/15 px-2.5 py-0.5 rounded-full border border-purple-core/30">
                  {sleepHours} {sleepHours === 1 ? "hour" : "hours"} / night
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-1.5">
                  {[5, 6, 7, 8, 9].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setSleepHours(hrs)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        sleepHours === hrs
                          ? "bg-purple-core text-white border-purple-accent shadow-sm"
                          : "bg-elevated/40 text-text-muted border-border-p hover:border-border-s hover:text-text-secondary"
                      }`}
                    >
                      {hrs}h
                    </button>
                  ))}
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(Math.max(1, Math.min(24, Number(e.target.value) || 0)))}
                    className="input-base w-full py-2 px-2.5 text-center text-xs"
                    title="Custom sleep hours"
                  />
                </div>
              </div>
            </div>

            {/* 8. Previous History of Illness */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Previous History of Illness <span className="text-purple-accent">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ILLNESS_HISTORIES.map((ill) => {
                  const isSelected = illnessHistory === ill
                  return (
                    <button
                      key={ill}
                      type="button"
                      onClick={() => setIllnessHistory(ill)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-medium text-center border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-core/20 border-purple-core text-lavender-bright shadow-sm font-semibold"
                          : "bg-elevated/40 border-border-p text-text-secondary hover:border-border-s hover:bg-elevated"
                      }`}
                    >
                      {ill}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || saved}
                className="btn-primary w-full py-3.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                    </svg>
                    Saving Profile...
                  </>
                ) : saved ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Profile Saved
                  </>
                ) : (
                  "Save Profile"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
