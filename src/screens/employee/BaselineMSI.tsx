import { useState } from "react"
import { getMSIBand } from "../../utils/msiClassification"

interface BaselineMSIProps {
  onComplete: () => void
  onBack: () => void
}

const SECTIONS = [
  {
    id: "mood",
    label: "Mood",
    period: "past week",
    color: "text-lavender-soft",
    bg: "bg-purple-core/10",
    border: "border-purple-core/25",
  },
  {
    id: "stress",
    label: "Stress Load",
    period: "past month",
    color: "text-c-warning",
    bg: "bg-c-warning/10",
    border: "border-c-warning/25",
  },
  {
    id: "recovery",
    label: "Recovery & Support",
    period: "past month",
    color: "text-c-info",
    bg: "bg-c-info/10",
    border: "border-c-info/25",
  },
  {
    id: "physical",
    label: "Physical",
    period: "past week",
    color: "text-c-success",
    bg: "bg-c-success/10",
    border: "border-c-success/25",
  },
]

const QUESTIONS = [
  { code: "M1",  section: "mood",     type: "emoji",  text: "How has your mood been?" },
  { code: "M2",  section: "mood",     type: "freq",   text: "I've felt low or down." },
  { code: "M3",  section: "mood",     type: "freq",   text: "I've felt worried or on edge." },
  { code: "M4",  section: "mood",     type: "freq",   text: "I've struggled to feel calm or relaxed." },
  { code: "S1",  section: "stress",   type: "freq",   text: "I've felt nervous or stressed." },
  { code: "S2",  section: "stress",   type: "freq",   text: "I've felt unable to control important things in my life." },
  { code: "S3",  section: "stress",   type: "freq",   text: "I've felt like I had too much to handle." },
  { code: "S4",  section: "stress",   type: "freq",   text: "Small problems have felt bigger than they are." },
  { code: "R1",  section: "recovery", type: "freq",   text: "It's taken me a while to feel okay after something stressful." },
  { code: "R2",  section: "recovery", type: "freq",   text: "I've struggled to relax even when I had time to." },
  { code: "R3",  section: "recovery", type: "freq",   text: "I haven't had anyone to talk to when things got hard." },
  { code: "R4",  section: "recovery", type: "freq",   text: "I've felt overwhelmed by everyday tasks." },
  { code: "PH1", section: "physical", type: "freq",   text: "I've felt tense or on edge in my body." },
  { code: "PH2", section: "physical", type: "freq",   text: "I've had headaches or tight shoulders or neck." },
  { code: "PH3", section: "physical", type: "freq",   text: "I've felt tired even after resting." },
  { code: "PH4", section: "physical", type: "freq",   text: "My stomach or sleep has been off." },
]

const FREQ_OPTIONS = ["Never", "Rarely", "Sometimes", "Often", "Always"]
const EMOJI_OPTIONS = [
  { label: "Great",   emoji: "😊" },
  { label: "Okay",    emoji: "😐" },
  { label: "Low",     emoji: "😟" },
  { label: "Rough",   emoji: "😠" },
  { label: "Very bad",emoji: "😔" },
]

function calcMSI(answers: (number | null)[]): number {
  const filled = answers.filter((a) => a !== null) as number[]
  if (!filled.length) return 30
  const avg = filled.reduce((s, v) => s + v, 0) / filled.length
  return Math.round(avg * 25)
}

function getBandLabel(msi: number) {
  const band = getMSIBand(msi)
  return { label: band.label, color: band.color }
}

export default function BaselineMSI({ onComplete, onBack }: BaselineMSIProps) {
  const [stage, setStage] = useState<"intro" | "quiz" | "calculating" | "done">("intro")
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null))
  const [serverBaseline, setServerBaseline] = useState<number | null>(null)
  const [isUpdateFlow, setIsUpdateFlow] = useState<boolean>(() => {
    return localStorage.getItem("cq_baseline_msi") != null
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const q = QUESTIONS[step]
  const section = SECTIONS.find((s) => s.id === q?.section)!
  const progress = ((step + 1) / QUESTIONS.length) * 100

  async function submitBaselineToBackend(finalAnswers: number[]) {
    setStage("calculating")
    setErrorMessage(null)
    const localScore = calcMSI(finalAnswers)

    try {
      const token = localStorage.getItem("cq_token")
      if (token) {
        const res = await fetch("/api/assessments/baseline", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ answers: finalAnswers }),
        })
        const data = await res.json()
        if (data.success && data.data) {
          const msiVal = data.data.baselineMsi ?? localScore
          setServerBaseline(msiVal)
          localStorage.setItem("cq_baseline_msi", String(msiVal))
          if (data.data.nextBaselineMsiDate) {
            localStorage.setItem("cq_next_baseline_date", data.data.nextBaselineMsiDate)
          }
          if (data.data.lastBaselineMsiDate) {
            localStorage.setItem("cq_last_baseline_date", data.data.lastBaselineMsiDate)
          }
        } else if (!res.ok && data.message) {
          setErrorMessage(data.message)
          setStage("intro")
          return
        } else {
          setServerBaseline(localScore)
          localStorage.setItem("cq_baseline_msi", String(localScore))
        }
      } else {
        setServerBaseline(localScore)
        localStorage.setItem("cq_baseline_msi", String(localScore))
      }
    } catch (err) {
      console.warn("[BASELINE] Error submitting to backend:", err)
      setServerBaseline(localScore)
      localStorage.setItem("cq_baseline_msi", String(localScore))
    } finally {
      setTimeout(() => {
        setStage("done")
      }, 1500)
    }
  }

  function select(val: number) {
    const next = [...answers]
    next[step] = val
    setAnswers(next)
    setTimeout(() => {
      if (step < QUESTIONS.length - 1) {
        setStep(step + 1)
      } else {
        const completed = [...answers.slice(0, step), val] as number[]
        submitBaselineToBackend(completed)
      }
    }, 200)
  }

  function handleBack() {
    if (stage === "quiz") {
      if (step > 0) setStep(step - 1)
      else setStage("intro")
    } else {
      onBack()
    }
  }

  const selected = answers[step]
  const baseline = serverBaseline ?? calcMSI(answers)
  const baselineState = getBandLabel(baseline)

  /* ── Intro ── */
  if (stage === "intro") {
    return (
      <div className="flex-1 flex flex-col px-5 pt-6 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-core animate-pulse-dot" />
            <span className="text-[10px] font-semibold text-lavender-bright uppercase tracking-wider">
              {isUpdateFlow ? "Weekly Calibration" : "First-Time Setup"}
            </span>
          </div>
          <button
            onClick={onBack}
            className="text-xs font-semibold text-text-muted hover:text-warm-white transition-colors cursor-pointer"
          >
            ← Back to Home
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto text-center animate-fade-up">
          <div className="w-16 h-16 rounded-3xl bg-purple-core/15 border border-purple-core/25 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-purple-core" fill="none" viewBox="0 0 24 24">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-warm-white mb-3">
            {isUpdateFlow ? "Update Your Baseline MSI" : "Let's Find Your Baseline"}
          </h1>
          <p className="text-base text-lavender-soft font-medium mb-3">
            {isUpdateFlow
              ? "Re-calibrate your personal baseline stress index with your weekly check-in."
              : "Before we start tracking your daily stress, let's establish your personal baseline."}
          </p>
          <p className="text-sm text-text-muted leading-relaxed mb-8">
            {isUpdateFlow
              ? "Your baseline calibrates your personal stress reference point. Updating it every 7 days keeps your stress measurements aligned with your current life rhythm."
              : "This initial assessment establishes your personal baseline stress level. Your future check-ins will be measured against this score so you can see meaningful shifts in your mental energy over time."}
          </p>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-c-warning/10 border border-c-warning/30 text-left">
              <p className="text-xs font-medium text-c-warning">{errorMessage}</p>
            </div>
          )}

          <div className="card-base p-4 mb-8 text-left space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-text-secondary">
              <span className="text-lavender-soft">✓</span>
              <span>16 calibrated questions across Mood, Stress, Recovery & Physical</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-text-secondary">
              <span className="text-lavender-soft">✓</span>
              <span>Takes under 2 minutes</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-text-secondary">
              <span className="text-lavender-soft">✓</span>
              <span>Calculates your calibrated Mind Stress Index (0–100)</span>
            </div>
          </div>

          <button
            onClick={() => setStage("quiz")}
            className="btn-primary w-full py-4 text-sm font-semibold rounded-2xl cursor-pointer"
          >
            {isUpdateFlow ? "Begin Weekly Update →" : "Begin Assessment →"}
          </button>
        </div>
      </div>
    )
  }

  /* ── Calculating ── */
  if (stage === "calculating") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full border-2 border-purple-core/30 animate-breathe-ring absolute inset-0" />
          <div className="w-20 h-20 rounded-full bg-purple-core/10 border border-purple-core/25 flex items-center justify-center animate-breathe">
            <svg className="w-8 h-8 text-purple-core" fill="none" viewBox="0 0 24 24">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <p className="font-display text-xl italic text-warm-white mb-2">Calculating your baseline…</p>
        <p className="text-sm text-text-muted">Analysing your responses across all 4 domains.</p>
      </div>
    )
  }

  /* ── Result ── */
  if (stage === "done") {
    return (
      <div className="flex-1 flex flex-col px-5 pt-6 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-core animate-pulse-dot" />
            <span className="text-xs font-semibold text-lavender-bright uppercase tracking-widest">
              {isUpdateFlow ? "Baseline Updated" : "Baseline Established"}
            </span>
          </div>

          <p className="text-sm text-text-muted font-semibold uppercase tracking-widest mb-2">Your Baseline MSI</p>
          <p className="font-mono-data text-7xl font-bold text-warm-white leading-none mb-2">{baseline}</p>
          <p className={`text-base font-semibold mb-4 ${baselineState.color}`}>{baselineState.label}</p>
          <p className="text-sm text-text-secondary leading-relaxed max-w-[280px] mb-8">
            {isUpdateFlow
              ? "Your baseline has been updated. Your daily check-ins will now be compared against this new score for the next 7 days."
              : "This is your personal stress baseline. Future check-ins will be compared against this score to show how your stress shifts over time."}
          </p>

          {/* Domain summary */}
          <div className="w-full space-y-2 mb-8">
            {SECTIONS.map((sec) => {
              const qIdxs = QUESTIONS.map((q, i) => q.section === sec.id ? i : -1).filter(i => i >= 0)
              const vals = qIdxs.map(i => answers[i]).filter(v => v !== null) as number[]
              const avg = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 25) : 0
              return (
                <div key={sec.id} className="card-elevated rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sec.color.replace("text-", "bg-")}`} />
                  <span className="text-sm text-text-secondary flex-1 text-left">{sec.label}</span>
                  <div className="flex-1 h-1.5 bg-border-p rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sec.color.replace("text-", "bg-")}`} style={{ width: `${avg}%`, opacity: 0.7 }} />
                  </div>
                  <span className={`font-mono-data text-xs ${sec.color} w-8 text-right`}>{avg}</span>
                </div>
              )
            })}
          </div>

          <button className="btn-primary w-full py-3.5 text-sm" onClick={onComplete}>
            Go to home screen →
          </button>
        </div>
      </div>
    )
  }

  /* ── Questions ── */
  const sectionQIndex = QUESTIONS.slice(0, step).filter(q2 => q2.section === q.section).length
  const totalInSection = QUESTIONS.filter(q2 => q2.section === q.section).length

  return (
    <div className="flex-1 flex flex-col px-5 pt-4 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
            <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-xs text-text-muted font-medium">{step + 1} of {QUESTIONS.length}</span>
        <div className="w-8" />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-border-p rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-primary to-purple-core rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Section badge */}
      <div className={`inline-flex items-center gap-2 ${section.bg} border ${section.border} rounded-full px-3 py-1 mb-5 self-start`}>
        <span className={`font-mono-data text-xs font-medium ${section.color}`}>{q.code}</span>
        <div className="w-px h-3 bg-border-s" />
        <span className="text-xs text-text-muted">{section.label} · {section.period}</span>
        <span className="text-xs text-text-muted">· {sectionQIndex + 1}/{totalInSection}</span>
      </div>

      <div key={step} className="animate-fade-up flex-1 flex flex-col">
        <h2 className="text-lg font-bold text-warm-white mb-6 leading-snug">{q.text}</h2>

        {q.type === "emoji" ? (
          <div className="grid grid-cols-5 gap-2">
            {EMOJI_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                onClick={() => select(i)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all duration-150 ${
                  selected === i
                    ? "border-purple-core bg-purple-core/10 scale-95"
                    : "border-border-p bg-elevated hover:border-border-s"
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className={`text-[10px] font-medium leading-tight text-center ${selected === i ? "text-lavender-soft" : "text-text-muted"}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {FREQ_OPTIONS.map((opt, i) => (
              <button
                key={opt}
                onClick={() => select(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-150 ${
                  selected === i
                    ? "border-purple-core bg-purple-core/10"
                    : "border-border-p bg-elevated hover:border-border-s"
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
                  selected === i ? "bg-purple-core border-purple-core" : "border-border-s"
                }`}>
                  {selected === i && <div className="w-1.5 h-1.5 rounded-full bg-warm-white" />}
                </div>
                <span className={`text-sm font-medium flex-1 text-left ${selected === i ? "text-lavender-soft" : "text-text-secondary"}`}>
                  {opt}
                </span>
                <span className="font-mono-data text-xs text-text-muted">{i + 1}/5</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
