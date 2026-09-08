import { useState } from "react"

// ── Types ──────────────────────────────────────────────────────────────────────

type QuestionType = "scale" | "single_choice"

interface Question {
  id: string
  type: QuestionType
  question: string
  options?: string[]
}

interface CauseCategory {
  id: string
  label: "Workload" | "People" | "Performance" | "Future" | "Personal" | "Sleep & Energy"
  icon: string
  sub: string
  title: string
  questions: Question[]
}

interface ResponseItem {
  questionId: string
  question: string
  answer: string
  answerScore: number
}

interface Recommendation {
  id: string
  type: "real_world" | "cortiquant_feature" | "action" | "feature"
  title: string
  description: string
  priority?: "high" | "medium" | "low" | string
  reason?: string | null
  cta?: string | null
  ctaText?: string | null
  icon?: string | null
}

// ── 6 Cause Categories with 3–5 targeted questions ─────────────────────────────

const CAUSE_CATEGORIES: CauseCategory[] = [
  {
    id: "workload",
    label: "Workload",
    icon: "💼",
    sub: "Too much work, deadlines or long hours",
    title: "Let's understand your workload.",
    questions: [
      {
        id: "workload_01",
        type: "scale",
        question: "How often have you felt overwhelmed by the amount of work?",
        options: ["Rarely", "Sometimes", "Often", "Almost every day"],
      },
      {
        id: "workload_02",
        type: "scale",
        question: "How often do deadlines make it difficult to switch off?",
        options: ["Rarely", "Sometimes", "Often", "Almost every day"],
      },
      {
        id: "workload_03",
        type: "scale",
        question: "How often do you continue thinking about work after working hours?",
        options: ["Rarely", "Sometimes", "Often", "Almost every day"],
      },
      {
        id: "workload_04",
        type: "scale",
        question: "How manageable does your current workload feel?",
        options: ["Very manageable", "Manageable", "Hard to manage", "Completely unmanageable"],
      },
    ],
  },
  {
    id: "people",
    label: "People",
    icon: "👥",
    sub: "Manager, colleagues or workplace conflict",
    title: "Let's understand what's happening around you.",
    questions: [
      {
        id: "people_01",
        type: "scale",
        question: "How often has workplace conflict been affecting you?",
        options: ["Rarely", "Sometimes", "Often", "Almost every day"],
      },
      {
        id: "people_02",
        type: "scale",
        question: "How comfortable do you feel communicating concerns at work?",
        options: ["Very comfortable", "Somewhat comfortable", "Uncomfortable", "Very uncomfortable"],
      },
      {
        id: "people_03",
        type: "scale",
        question: "How often do interactions with colleagues or managers leave you mentally drained?",
        options: ["Rarely", "Sometimes", "Often", "Almost every day"],
      },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    icon: "🎯",
    sub: "Targets, expectations or fear of failure",
    title: "Let's understand your performance pressure.",
    questions: [
      {
        id: "perf_01",
        type: "scale",
        question: "How often do you worry about meeting expectations?",
        options: ["Rarely", "Sometimes", "Often", "Almost every day"],
      },
      {
        id: "perf_02",
        type: "scale",
        question: "How often do you fear making mistakes at work?",
        options: ["Rarely", "Sometimes", "Often", "Almost every day"],
      },
      {
        id: "perf_03",
        type: "scale",
        question: "How much pressure do you feel to perform consistently?",
        options: ["Mild pressure", "Moderate pressure", "High pressure", "Extreme pressure"],
      },
    ],
  },
  {
    id: "future",
    label: "Future",
    icon: "🔭",
    sub: "Career, growth or job uncertainty",
    title: "Let's understand what's making the future feel uncertain.",
    questions: [
      {
        id: "future_01",
        type: "scale",
        question: "How uncertain do you currently feel about your career?",
        options: ["Not uncertain", "A little uncertain", "Noticeably uncertain", "Very uncertain"],
      },
      {
        id: "future_02",
        type: "scale",
        question: "How often do you worry about your professional future?",
        options: ["Rarely", "Sometimes", "Often", "Almost every day"],
      },
      {
        id: "future_03",
        type: "scale",
        question: "How clear do you feel about your next career step?",
        options: ["Very clear", "Somewhat clear", "Unclear", "Completely unclear"],
      },
    ],
  },
  {
    id: "personal",
    label: "Personal",
    icon: "🏠",
    sub: "Family, relationships or financial pressure",
    title: "Let's understand what's weighing on you personally.",
    questions: [
      {
        id: "personal_01",
        type: "scale",
        question: "How much are personal responsibilities affecting your mental space?",
        options: ["A little", "Moderately", "Significantly", "Overwhelmingly"],
      },
      {
        id: "personal_02",
        type: "scale",
        question: "How often do personal concerns distract you during work?",
        options: ["Rarely", "Sometimes", "Often", "Almost every day"],
      },
      {
        id: "personal_03",
        type: "scale",
        question: "How supported do you feel outside work?",
        options: ["Very supported", "Moderately supported", "Barely supported", "Not supported at all"],
      },
    ],
  },
  {
    id: "sleep",
    label: "Sleep & Energy",
    icon: "😴",
    sub: "Poor sleep, fatigue or low energy",
    title: "Let's understand your energy and recovery.",
    questions: [
      {
        id: "sleep_01",
        type: "scale",
        question: "How often have you been sleeping poorly?",
        options: ["Rarely", "Sometimes", "Often", "Almost every day"],
      },
      {
        id: "sleep_02",
        type: "scale",
        question: "How often do you feel tired even after resting?",
        options: ["Rarely", "Sometimes", "Often", "Almost every day"],
      },
      {
        id: "sleep_03",
        type: "scale",
        question: "How much is low energy affecting your day?",
        options: ["Mildly", "Noticeably", "Significantly", "Severely"],
      },
    ],
  },
]

// ── Recommendation & Analysis Engine ──────────────────────────────────────────

function computeSeverity(avgScore: number, msi: number): "Mild" | "Moderate" | "High" | "Severe" {
  if (msi >= 81 || avgScore >= 2.5) return "Severe"
  if (msi >= 61 || avgScore >= 1.8) return "High"
  if (msi >= 41 || avgScore >= 1.0) return "Moderate"
  return "Mild"
}

function buildPersonalizedAnalysis(
  category: CauseCategory,
  severity: "Mild" | "Moderate" | "High" | "Severe",
  responses: ResponseItem[],
  msi: number
): { explanation: string; secondaryCause: string | null } {
  const cause = category.label
  let secondary: string | null = null

  // Check responses for secondary indicators
  if (cause === "Workload") {
    const afterHours = responses.find((r) => r.questionId === "workload_03")?.answerScore ?? 0
    if (afterHours >= 2) secondary = "Sleep & Energy"
  } else if (cause === "People") {
    const comf = responses.find((r) => r.questionId === "people_02")?.answerScore ?? 0
    if (comf >= 2) secondary = "Personal"
  } else if (cause === "Performance") {
    secondary = "Future"
  }

  let text = `Your responses suggest that ${cause.toLowerCase()} pressure appears to be a significant contributor to your current stress level (${msi}%). `

  if (severity === "Severe" || severity === "High") {
    text += `The frequency of tension and difficulty switching off may be keeping your mental energy depleted. Addressing these pressure points with deliberate recovery can help keep stress from building further.`
  } else {
    text += `While still manageable, small daily recovery adjustments can help prevent mental load from accumulating.`
  }

  return { explanation: text, secondaryCause: secondary }
}

function generateRecommendations(
  category: CauseCategory,
  severity: "Mild" | "Moderate" | "High" | "Severe",
  msi: number
): Recommendation[] {
  const cause = category.label
  const recs: Recommendation[] = []

  switch (cause) {
    case "Workload":
      recs.push({
        id: "w_action_1",
        type: "action",
        title: "Prioritize top 3 tasks",
        description: "Focus on your top 3 tasks for tomorrow instead of carrying the entire workload mentally.",
        icon: "📋",
      })
      recs.push({
        id: "w_feat_1",
        type: "feature",
        title: "Unload with Dump Bag",
        description: "Put the thoughts taking up mental space somewhere outside your head before stepping away.",
        cta: "dump-bag",
        ctaText: "Open Dump Bag →",
        icon: "🗑️",
      })
      recs.push({
        id: "w_feat_2",
        type: "feature",
        title: "Explore Reset Labs",
        description: "Take a structured 5-minute pause designed to help you decompress from high-intensity work.",
        cta: "reset-list",
        ctaText: "Browse Resets →",
        icon: "🧪",
      })
      if (severity === "High" || severity === "Severe") {
        recs.push({
          id: "w_action_2",
          type: "action",
          title: "Align with your manager",
          description: "If deadlines feel unmanageable alone, schedule a quick check-in to realign timeline expectations.",
          icon: "🤝",
        })
      } else {
        recs.push({
          id: "w_action_3",
          type: "action",
          title: "Screen-free shutdown",
          description: "Set a clear work shutdown time and take a 15-minute screen-free recovery pause.",
          icon: "🌿",
        })
      }
      break

    case "People":
      recs.push({
        id: "p_feat_1",
        type: "feature",
        title: "Talk to a Human Listener",
        description: "Sometimes making sense of what happened starts with saying it out loud in a safe space.",
        cta: "listener-connect",
        ctaText: "Connect with Listener →",
        icon: "💬",
      })
      recs.push({
        id: "p_action_1",
        type: "action",
        title: "Establish a clear boundary",
        description: "Identify one communication boundary you can preserve today to protect your energy.",
        icon: "🛡️",
      })
      recs.push({
        id: "p_feat_2",
        type: "feature",
        title: "Clarify with Dump Bag",
        description: "Write down specifically what happened uncensored before entering future conversations.",
        cta: "dump-bag",
        ctaText: "Open Dump Bag →",
        icon: "🗑️",
      })
      recs.push({
        id: "p_feat_3",
        type: "feature",
        title: "Perspective Reset",
        description: "A short guided pause to reset your nervous system after difficult interpersonal interactions.",
        cta: "reset-list",
        ctaText: "Start Reset →",
        icon: "🌱",
      })
      break

    case "Performance":
      recs.push({
        id: "pf_action_1",
        type: "action",
        title: "Break goals into manageable micro-steps",
        description: "Lower the bar from perfection to completion by executing one bite-sized task at a time.",
        icon: "🎯",
      })
      recs.push({
        id: "pf_feat_1",
        type: "feature",
        title: "Priority Reset",
        description: "Separate fact from expectations with an interactive cognitive refocus exercise.",
        cta: "priority-reset",
        ctaText: "Begin Priority Reset →",
        icon: "⚡",
      })
      recs.push({
        id: "pf_feat_2",
        type: "feature",
        title: "Unload worries in Dump Bag",
        description: "Jot down self-critical thoughts or fears of falling behind so they stop replaying.",
        cta: "dump-bag",
        ctaText: "Open Dump Bag →",
        icon: "🗑️",
      })
      if (severity === "High" || severity === "Severe") {
        recs.push({
          id: "pf_feat_3",
          type: "feature",
          title: "Speak with a Listener",
          description: "Discuss performance pressure in confidence with a compassionate listener.",
          cta: "listener-connect",
          ctaText: "Talk to a Listener →",
          icon: "🤝",
        })
      } else {
        recs.push({
          id: "pf_action_2",
          type: "action",
          title: "Normalize constructive errors",
          description: "Remember that setbacks are standard feedback loops, not reflections of your capability.",
          icon: "💡",
        })
      }
      break

    case "Future":
      recs.push({
        id: "f_action_1",
        type: "action",
        title: "Focus on controllable next steps",
        description: "Separate what is in your immediate control today from long-term uncertainties you cannot solve now.",
        icon: "🔭",
      })
      recs.push({
        id: "f_feat_1",
        type: "feature",
        title: "Clarify with Dump Bag",
        description: "Capture scattered ideas and career questions in writing to discover underlying priorities.",
        cta: "dump-bag",
        ctaText: "Write it Down →",
        icon: "🗑️",
      })
      recs.push({
        id: "f_feat_2",
        type: "feature",
        title: "Explore Reset Labs",
        description: "Engage in guided soundscapes and reflective pauses to bring your attention back to the present.",
        cta: "reset-list",
        ctaText: "Explore Resets →",
        icon: "🧪",
      })
      recs.push({
        id: "f_feat_3",
        type: "feature",
        title: "Connect with a Human Listener",
        description: "Unpack career crossroads and explore new perspectives with a neutral listener.",
        cta: "listener-connect",
        ctaText: "Schedule Session →",
        icon: "💬",
      })
      break

    case "Personal":
      recs.push({
        id: "ps_feat_1",
        type: "feature",
        title: "Talk to a Human Listener",
        description: "Carrying non-work challenges alone is heavy. Speaking out loud can bring immediate relief.",
        cta: "listener-connect",
        ctaText: "Talk to a Listener →",
        icon: "🤝",
      })
      recs.push({
        id: "ps_feat_2",
        type: "feature",
        title: "Dump Bag Unload",
        description: "Write out what's weighing on you without editing yourself to create mental breathing room.",
        cta: "dump-bag",
        ctaText: "Open Dump Bag →",
        icon: "🗑️",
      })
      recs.push({
        id: "ps_action_1",
        type: "action",
        title: "Reduce non-essential commitments",
        description: "Give yourself permission to pause optional tasks and protect personal recovery time.",
        icon: "☕",
      })
      recs.push({
        id: "ps_feat_3",
        type: "feature",
        title: "Relaxation Reset",
        description: "Unwind your body and mind with a guided progressive muscle relaxation session.",
        cta: "relaxation",
        ctaText: "Start Relaxation →",
        icon: "🌿",
      })
      break

    case "Sleep & Energy":
      recs.push({
        id: "sl_action_1",
        type: "action",
        title: "Protect a consistent sleep window",
        description: "Power down screens 30 minutes before bed and establish a gentle winding-down transition.",
        icon: "🌙",
      })
      recs.push({
        id: "sl_action_2",
        type: "action",
        title: "Reduce late-day stimulation",
        description: "Avoid heavy caffeine or intense evening work sessions that keep nervous system adrenaline elevated.",
        icon: "☕",
      })
      recs.push({
        id: "sl_feat_1",
        type: "feature",
        title: "Sleep Wind-down Reset",
        description: "A calming session of acoustic resonance and rhythmic breathing to transition into deep rest.",
        cta: "sleep-winddown",
        ctaText: "Start Wind-down →",
        icon: "😴",
      })
      recs.push({
        id: "sl_feat_2",
        type: "feature",
        title: "Breathing Reset",
        description: "Restore depleted midday energy with a 3-minute nervous system down-regulation pause.",
        cta: "breathing-reset",
        ctaText: "Take a Breath →",
        icon: "🫧",
      })
      break
  }

  return recs.slice(0, 4)
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function StressDriverFlow({
  onBack,
  onNav,
  msi: incomingMsi,
}: {
  onBack: () => void
  onNav: (s: string) => void
  msi?: number | null
}) {
  // Use actual logged-in employee MSI from props or localStorage, fallback to 50
  const storedMsi = localStorage.getItem("cq_current_msi")
  const actualMsi = incomingMsi ?? (storedMsi ? parseInt(storedMsi, 10) : 50)
  const baseline = parseInt(localStorage.getItem("cq_baseline_msi") ?? "40", 10)

  const [stage, setStage] = useState<"select" | "questions" | "result">("select")
  const [selectedCategory, setSelectedCategory] = useState<CauseCategory | null>(null)
  const [qIdx, setQIdx] = useState(0)
  const [responses, setResponses] = useState<ResponseItem[]>([])
  const [analysisText, setAnalysisText] = useState("")
  const [severity, setSeverity] = useState<"Mild" | "Moderate" | "High" | "Severe">("Moderate")
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [contributingFactors, setContributingFactors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  function startCategory(cat: CauseCategory) {
    setSelectedCategory(cat)
    setQIdx(0)
    setResponses([])
    setStage("questions")
  }

  function handleSelectAnswer(optionIndex: number, optionText: string) {
    if (!selectedCategory) return
    const currentQ = selectedCategory.questions[qIdx]
    const updatedResponses = [
      ...responses,
      {
        questionId: currentQ.id,
        question: currentQ.question,
        answer: optionText,
        answerScore: optionIndex,
      },
    ]
    setResponses(updatedResponses)

    setTimeout(() => {
      if (qIdx < selectedCategory.questions.length - 1) {
        setQIdx(qIdx + 1)
      } else {
        finishAssessment(updatedResponses)
      }
    }, 220)
  }

  async function finishAssessment(finalResponses: ResponseItem[]) {
    if (!selectedCategory) return
    setSubmitting(true)

    // Compute fallback local analysis immediately for safety
    const avgScore =
      finalResponses.reduce((sum, r) => sum + r.answerScore, 0) / (finalResponses.length || 1)
    const computedSev = computeSeverity(avgScore, actualMsi)
    const localFallback = buildPersonalizedAnalysis(
      selectedCategory,
      computedSev,
      finalResponses,
      actualMsi
    )
    const localRecs = generateRecommendations(selectedCategory, computedSev, actualMsi)

    setSeverity(computedSev)
    setAnalysisText(localFallback.explanation)
    setRecommendations(localRecs)
    setContributingFactors([
      "High workload pressure and compressed deadlines",
      "Difficulty mentally switching off after work",
      "Persistent daytime cognitive fatigue",
    ])

    // Call backend AI recommendations service
    try {
      const token = localStorage.getItem("cq_token")
      if (token) {
        const aiRes = await fetch("/api/ai/root-cause-recommendations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            msi: actualMsi,
            rootCause: selectedCategory.label,
            cause: selectedCategory.sub,
            relevantResponses: finalResponses,
          }),
        })

        const aiData = await aiRes.json()
        if (aiData.success && aiData.data) {
          if (aiData.data.summary) {
            setAnalysisText(aiData.data.summary)
          }
          if (Array.isArray(aiData.data.contributingFactors) && aiData.data.contributingFactors.length > 0) {
            setContributingFactors(aiData.data.contributingFactors)
          }
          if (Array.isArray(aiData.data.recommendations) && aiData.data.recommendations.length >= 3) {
            setRecommendations(aiData.data.recommendations)
          }

          localStorage.setItem("cq_latest_root_cause", JSON.stringify({
            primaryCause: selectedCategory.label,
            causeSeverity: computedSev,
            msiAtAssessment: actualMsi,
            explanation: aiData.data.summary || localFallback.explanation,
            contributingFactors: aiData.data.contributingFactors,
            recommendations: aiData.data.recommendations || localRecs,
            createdAt: new Date().toISOString(),
          }))

          if (aiData.data.recommendations) {
            localStorage.setItem("cq_latest_recommendations", JSON.stringify(aiData.data.recommendations))
            window.dispatchEvent(new Event("cq_recommendations_updated"))
          }
        }
      }
    } catch (err) {
      console.warn("[ROOT-CAUSE-AI] AI recommendation fetch error:", err)
    } finally {
      setSubmitting(false)
      setStage("result")
    }
  }

  function handleBack() {
    if (stage === "result") {
      setStage("questions")
      return
    }
    if (stage === "questions") {
      if (qIdx > 0) {
        setQIdx(qIdx - 1)
        setResponses(responses.slice(0, -1))
      } else {
        setStage("select")
      }
      return
    }
    onBack()
  }

  // ── Stage 1: Cause Category Selection ────────────────────────────────────────

  if (stage === "select") {
    return (
      <div className="flex-1 flex flex-col px-5 py-5 overflow-y-auto pb-28">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors mb-5 text-sm font-medium cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-3 py-1.5 mb-3 self-start">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-core animate-pulse-dot" />
          <span className="text-[10px] font-semibold text-lavender-bright uppercase tracking-wider">
            Let's understand this
          </span>
        </div>

        <h2 className="text-xl font-semibold text-warm-white mb-1.5 leading-snug">
          What's been weighing on you lately?
        </h2>
        <p className="text-xs text-text-muted mb-6 leading-relaxed">
          Choose what feels most relevant — we'll help you make sense of it.
        </p>

        <div className="space-y-2.5">
          {CAUSE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => startCategory(cat)}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border border-border-p bg-elevated hover:border-purple-core/60 hover:bg-purple-core/5 transition-all text-left group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-midnight/80 border border-border-s flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-105 transition-transform">
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-warm-white group-hover:text-lavender-soft transition-colors">
                  {cat.label}
                </p>
                <p className="text-xs text-text-muted mt-0.5 leading-snug truncate">
                  {cat.sub}
                </p>
              </div>
              <svg className="w-4 h-4 text-text-muted group-hover:text-lavender-soft transition-colors flex-shrink-0" fill="none" viewBox="0 0 16 16">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Stage 2: Category-Specific Questions ─────────────────────────────────────

  if (stage === "questions" && selectedCategory) {
    const currentQ = selectedCategory.questions[qIdx]
    const progress = ((qIdx + 1) / selectedCategory.questions.length) * 100

    return (
      <div className="flex-1 flex flex-col px-5 py-5 overflow-y-auto pb-28">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors text-sm font-medium cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
          <span className="text-[11px] font-mono-data text-text-muted">
            {qIdx + 1} of {selectedCategory.questions.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-border-p rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-purple-primary to-purple-core rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-3 py-1 mb-3 self-start">
          <span className="text-xs">{selectedCategory.icon}</span>
          <span className="text-[10px] font-semibold text-lavender-bright uppercase tracking-wider">
            {selectedCategory.label}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-warm-white mb-6 leading-snug">
          {currentQ.question}
        </h3>

        <div className="space-y-2.5">
          {currentQ.options?.map((opt, i) => (
            <button
              key={opt}
              onClick={() => handleSelectAnswer(i, opt)}
              disabled={submitting}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-border-p bg-elevated hover:border-purple-core hover:bg-purple-core/10 transition-all text-left group cursor-pointer disabled:opacity-60"
            >
              <span className="text-sm font-medium text-warm-white group-hover:text-lavender-soft transition-colors">
                {opt}
              </span>
              <div className="w-4 h-4 rounded-full border border-border-s group-hover:border-purple-core flex items-center justify-center transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-purple-core transition-colors" />
              </div>
            </button>
          ))}
        </div>

        {submitting && (
          <div className="flex items-center justify-center gap-2.5 mt-6 py-2">
            <div className="w-4 h-4 border-2 border-purple-core/30 border-t-purple-core rounded-full animate-spin" />
            <p className="text-xs text-lavender-soft font-medium">Analyzing your reflections...</p>
          </div>
        )}

        <p className="text-[10px] text-text-muted mt-6 text-center leading-relaxed">
          CortiQuant uses your self-reported reflections to provide supportive strategies. Questions are non-clinical and non-diagnostic.
        </p>
      </div>
    )
  }

  // ── Stage 3: Result Screen ("Let's make sense of it.") ───────────────────────

  if (stage === "result" && selectedCategory) {
    return (
      <div className="flex-1 flex flex-col px-5 py-5 overflow-y-auto pb-28 animate-fade-up">
        <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-3 py-1.5 mb-3 self-start">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-core animate-pulse-dot" />
          <span className="text-[10px] font-semibold text-lavender-bright uppercase tracking-wider">
            Let's make sense of it
          </span>
        </div>

        <h2 className="text-xl font-semibold text-warm-white mb-4 leading-snug">
          Understanding your stress reflections
        </h2>

        {/* MSI & What may be driving it */}
        <div className="card-base p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="card-elevated rounded-xl p-3">
              <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">MSI</p>
              <p className="text-2xl font-bold text-warm-white font-mono-data">{actualMsi}%</p>
            </div>
            <div className="card-elevated rounded-xl p-3">
              <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">What may be driving it</p>
              <p className="text-sm font-bold text-lavender-bright flex items-center gap-1.5 mt-1">
                <span>{selectedCategory.icon}</span>
                <span>{selectedCategory.label}</span>
              </p>
            </div>
          </div>

          {/* What's contributing */}
          <div className="card-elevated rounded-xl p-3.5 space-y-2">
            <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">
              What's contributing
            </p>
            <ul className="space-y-1.5">
              {(contributingFactors.length > 0 ? contributingFactors : [
                "High workload volume and compressed deadlines",
                "Difficulty mentally switching off after work",
                "Persistent daytime fatigue",
              ]).map((factor, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-text-secondary leading-relaxed">
                  <span className="text-purple-core mt-0.5 font-bold">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Summary note */}
        {analysisText && (
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] mb-5">
            <p className="text-xs text-text-secondary leading-relaxed">
              {analysisText}
            </p>
            <p className="text-[10px] text-text-muted mt-2">
              Note: This reflection is designed for workplace self-awareness and does not constitute a medical or clinical diagnosis.
            </p>
          </div>
        )}

        {/* What you can try */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-warm-white tracking-wide uppercase">
              What you can try
            </p>
            <span className="text-[10px] font-mono-data text-lavender-soft">
              {recommendations.length} recommendations
            </span>
          </div>

          {recommendations.map((rec) => {
            const isCortiquant = rec.type === "cortiquant_feature" || rec.type === "feature"
            return (
              <div
                key={rec.id}
                className="card-base p-4 border border-border-p hover:border-purple-core/40 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{rec.icon || (isCortiquant ? "✨" : "📋")}</span>
                    <p className="text-sm font-semibold text-warm-white leading-tight">
                      {rec.title}
                    </p>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider flex-shrink-0 ${
                      isCortiquant
                        ? "bg-purple-core/20 text-lavender-bright border border-purple-core/30"
                        : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                    }`}
                  >
                    {isCortiquant ? "CortiQuant" : "Action"}
                  </span>
                </div>

                <p className="text-xs text-text-muted leading-relaxed">
                  {rec.description}
                </p>

                {rec.reason && (
                  <p className="text-[11px] text-text-secondary/80 italic leading-snug">
                    Why: {rec.reason}
                  </p>
                )}

                {isCortiquant && rec.cta && (
                  <div className="pt-2 border-t border-border-p/50">
                    <button
                      onClick={() => onNav(rec.cta!)}
                      className="text-xs font-semibold text-lavender-bright hover:text-lavender-soft flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>
                        {rec.ctaText ||
                          (rec.cta === "dump-bag"
                            ? "Open Dump Bag →"
                            : rec.cta === "listener-connect"
                            ? "Talk to a Listener →"
                            : "Explore Reset Labs →")}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={() => onNav("home")}
          className="btn-primary w-full py-3.5 text-sm font-semibold rounded-2xl cursor-pointer shadow-lg"
        >
          Return to Dashboard →
        </button>
      </div>
    )
  }

  return null
}
