import { useState } from "react"
import logoSrc from "@/imports/image-2.png"

interface OnboardingProps {
  onComplete: (answers: (string | null)[]) => void
  initialStep?: number
  initialAnswers?: (string | null)[]
}

type Answer = string | null

const API_BASE = ""

// ── Section labels ─────────────────────────────────────────────────────────────
// ── Section labels ─────────────────────────────────────────────────────────────
const SECTION_LABELS: Record<string, string> = {
  D: "Participant Profile",
}

function getSection(code: string): string {
  return SECTION_LABELS.D
}

// ── Participant Profile onboarding steps (D1–D8) ──────────────────────────────
const STEPS = [
  // ─── Participant Profile (D1–D8) ──────────────────────────────────────────
  {
    code: "D1",
    question: "What is your age range?",
    note: "Used only for aggregate analysis — never shared in an identifiable form.",
    type: "choice",
    options: ["18–24", "25–34", "35–44", "45–54", "55+"],
  },
  {
    code: "D2",
    question: "How do you describe your gender?",
    note: "This information is used only for aggregate analysis.",
    type: "choice",
    options: ["Male", "Female", "Non-binary", "Prefer to self-describe", "Prefer not to say"],
  },
  {
    code: "D3",
    question: "Which department or team are you in?",
    note: "Select the closest match to your current team.",
    type: "choice",
    options: [
      "Tech & Product",
      "Sales & Marketing",
      "Operations & Admin",
      "Research & Innovation",
      "Finance and Legal",
      "Services / Delivery",
      "People & Support",
      "Other",
    ],
  },
  {
    code: "D4",
    question: "What is your role level?",
    note: "This helps us understand work patterns across the organisation.",
    type: "choice",
    options: ["Individual Contributor", "Team Lead", "Manager", "Senior Leadership"],
  },
  {
    code: "D5",
    question: "How long have you been at this organisation?",
    note: "Tenure helps us contextualise your workspace profile.",
    type: "choice",
    options: ["< 6 months", "6–12 months", "1–3 years", "3–5 years", "5+ years"],
  },
  {
    code: "D6",
    question: "On average, how many hours do you work per week?",
    note: "A typical week, not your busiest or lightest.",
    type: "choice",
    options: ["< 35 hrs", "35–40 hrs", "41–45 hrs", "46–50 hrs", "50+ hrs"],
  },
  {
    code: "D7",
    question: "How would you rate your usual workload intensity?",
    note: "Think about how demanding your work feels day-to-day.",
    type: "scale",
    options: ["Very light", "Light", "Moderate", "Heavy", "Very heavy"],
  },
  {
    code: "D8",
    question: "What is your current work arrangement?",
    note: "Where you do most of your work on a typical week.",
    type: "choice",
    options: ["In-office", "Hybrid", "Fully remote"],
  },
]

// ── Map step index → structured answer payload for the API ────────────────────
function buildPayload(answers: Answer[]) {
  const str = (code: string): string | null => {
    const idx = STEPS.findIndex((s) => s.code === code)
    return answers[idx] ?? null
  }

  return {
    participantProfile: {
      D1: str("D1"), D2: str("D2"), D3: str("D3"), D4: str("D4"),
      D5: str("D5"), D6: str("D6"), D7: str("D7"), D8: str("D8"),
    },
  }
}

export default function Onboarding({ onComplete, initialStep = 0, initialAnswers }: OnboardingProps) {
  const [step, setStep] = useState(initialStep)
  const [answers, setAnswers] = useState<Answer[]>(initialAnswers ?? Array(STEPS.length).fill(null))
  const [advancing, setAdvancing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const current = STEPS[step]
  const selected = answers[step]
  const progress = ((step + 1) / STEPS.length) * 100
  const sectionLabel = getSection(current.code)

  function select(option: string) {
    if (advancing || submitting) return
    const next = [...answers]
    next[step] = option
    setAnswers(next)

    // Persist progress so user can resume
    localStorage.setItem("cq_onboarding_answers", JSON.stringify(next))
    localStorage.setItem("cq_onboarding_step", String(step))

    setAdvancing(true)
    setTimeout(async () => {
      setAdvancing(false)
      if (step < STEPS.length - 1) {
        setStep(step + 1)
      } else {
        // Last step — submit to backend
        await submitOnboarding(next)
      }
    }, 350)
  }

  async function submitOnboarding(finalAnswers: Answer[]) {
    setSubmitting(true)
    setSubmitError("")

    const token = localStorage.getItem("cq_token")
    const payload = buildPayload(finalAnswers)

    try {
      if (token) {
        const res = await fetch(`${API_BASE}/api/onboarding`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.success) {
          localStorage.setItem("cq_onboarding_status", "complete")
          localStorage.setItem("cq_approval_status", "pending")
        } else {
          // Non-fatal: still complete locally and surface error
          console.warn("[ONBOARDING] API save failed:", data.message)
          setSubmitError(data.message || "Onboarding saved locally only.")
        }
      }
    } catch {
      // Network error — still complete locally
      console.warn("[ONBOARDING] Backend unreachable, completing locally.")
    } finally {
      setSubmitting(false)
      onComplete(finalAnswers)
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1)
  }

  return (
    <div className="min-h-full bg-midnight flex flex-col items-center justify-center px-4 py-12 overflow-y-auto">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full bg-purple-primary/6 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-lavender-bright/4 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo + step counter */}
        <div className="flex items-center justify-between mb-6">
          <img src={logoSrc} alt="CortiQuant" className="h-8 object-contain opacity-80" />
          <span className="text-xs text-text-muted font-medium">{step + 1} of {STEPS.length}</span>
        </div>

        {/* Intro header */}
        <div className="mb-6">
          <h1 className="text-[26px] font-semibold text-warm-white leading-snug">
            {"Set up your"}
          </h1>
          <h1 className="text-[26px] font-semibold leading-snug text-purple-core">
            participant profile
          </h1>
          <p className="text-sm text-text-muted leading-relaxed mt-2">
            A short background questionnaire to help contextualise your workspace profile. Your responses are anonymised and private.
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-border-p rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-primary to-purple-core rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Submitting overlay */}
        {submitting && (
          <div className="card-base p-8 glow-subtle text-center mb-4">
            <div className="w-12 h-12 rounded-full bg-purple-core/10 border border-purple-core/25 flex items-center justify-center mx-auto mb-4 animate-breathe">
              <svg className="w-6 h-6 text-purple-core" fill="none" viewBox="0 0 24 24">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="font-display text-lg italic text-warm-white">Saving your profile…</p>
            <p className="text-sm text-text-muted mt-1">Submitting for HR approval.</p>
          </div>
        )}

        {!submitting && (
          <>
            {/* Card */}
            <div key={step} className="card-base p-8 glow-subtle animate-fade-up">
              {/* Step badge */}
              <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-3 py-1 mb-5">
                <span className="font-mono-data text-xs text-purple-core font-medium">{current.code}</span>
                <div className="w-px h-3 bg-border-s" />
                <span className="text-xs text-text-muted">{sectionLabel}</span>
              </div>

              <h2 className="text-xl font-semibold text-warm-white mb-2 leading-snug">{current.question}</h2>
              <p className="text-xs text-text-muted mb-6 leading-relaxed">{current.note}</p>

              {/* Scale (D7) */}
              {current.type === "scale" ? (
                <div className="space-y-2">
                  {current.options.map((opt, i) => {
                    const isSelected = selected === opt
                    const barWidth = ((i + 1) / current.options.length) * 100
                    return (
                      <button
                        key={opt}
                        onClick={() => select(opt)}
                        disabled={advancing && !isSelected}
                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl border text-left transition-all duration-150 ${
                          isSelected
                            ? "border-purple-core bg-purple-core/10"
                            : "border-border-p bg-elevated hover:border-border-s"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className={`text-sm font-medium ${isSelected ? "text-lavender-soft" : "text-text-secondary"}`}>{opt}</span>
                            <span className="font-mono-data text-xs text-text-muted">{i + 1}/5</span>
                          </div>
                          <div className="h-1 bg-border-p rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isSelected ? "bg-purple-core" : "bg-border-s"}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
                          isSelected ? "bg-purple-core border-purple-core" : "border-border-s"
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-warm-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : current.type === "freq" ? (
                /* Frequency scale */
                <div className="space-y-2">
                  {current.options.map((opt, i) => {
                    const isSelected = selected === opt
                    const barWidth = ((i + 1) / current.options.length) * 100
                    return (
                      <button
                        key={opt}
                        onClick={() => select(opt)}
                        disabled={advancing && !isSelected}
                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl border text-left transition-all duration-150 ${
                          isSelected
                            ? "border-purple-core bg-purple-core/10"
                            : "border-border-p bg-elevated hover:border-border-s"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className={`text-sm font-medium ${isSelected ? "text-lavender-soft" : "text-text-secondary"}`}>{opt}</span>
                            <span className="font-mono-data text-xs text-text-muted">{i + 1}/5</span>
                          </div>
                          <div className="h-1 bg-border-p rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isSelected ? "bg-purple-core" : "bg-border-s"}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
                          isSelected ? "bg-purple-core border-purple-core" : "border-border-s"
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-warm-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                /* Choice grid */
                <div className={`grid gap-2 ${current.options.length > 5 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {current.options.map((opt) => {
                    const isSelected = selected === opt
                    return (
                      <button
                        key={opt}
                        onClick={() => select(opt)}
                        disabled={advancing && !isSelected}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all duration-150 ${
                          isSelected
                            ? "border-purple-core bg-purple-core/10"
                            : "border-border-p bg-elevated hover:border-border-s"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
                          isSelected ? "bg-purple-core border-purple-core" : "border-border-s"
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-warm-white" />}
                        </div>
                        <span className={`text-sm font-medium leading-snug ${isSelected ? "text-lavender-soft" : "text-text-secondary"}`}>
                          {opt}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Back button + submit error */}
              {submitError && (
                <p className="text-xs text-c-warning bg-c-warning/10 border border-c-warning/25 rounded-xl px-4 py-2.5 mt-4">
                  ⚠ {submitError}
                </p>
              )}

              {step > 0 && (
                <div className="mt-8">
                  <button onClick={handleBack} className="btn-ghost px-5 py-3 text-sm w-full">
                    ← Back
                  </button>
                </div>
              )}
            </div>

            {/* Privacy note */}
            <div className="flex items-start gap-2 mt-5 px-1">
              <svg className="w-3.5 h-3.5 text-purple-core flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 20 20">
                <path d="M10 2l6.5 2.5v5c0 4-2.5 7-6.5 8.5C3.5 16.5 1 13.5 1 9.5v-5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-xs text-text-muted leading-relaxed">
                This information is used only for aggregate analysis and is never shared outside your organisation's wellness program in an identifiable form.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
