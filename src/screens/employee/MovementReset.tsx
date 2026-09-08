import { useState, useEffect, useRef } from "react"
import {
  NeedId,
  MoveSVG,
  Movement,
  BODY_NEEDS,
  movementSequences,
} from "./movementSequences"

type Stage = "need-select" | "session" | "complete"

const FEELINGS = [
  { emoji: "😌", label: "Looser" },
  { emoji: "🙂", label: "A little better" },
  { emoji: "😐", label: "About the same" },
  { emoji: "😣", label: "Still tense" },
  { emoji: "⚡", label: "More energized" },
]

// ── Lightweight, elegant exercise illustration component ──────────────────────

function MovementIllustration({ type, progress }: { type: MoveSVG; progress: number }) {
  const wave = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5
  const sway = wave * 8
  const stroke = "rgba(155,93,229,0.6)"
  const strokeFaint = "rgba(155,93,229,0.35)"
  const strokeBright = "rgba(167,139,250,0.85)"
  const fill = "rgba(155,93,229,0.08)"

  const headCx = 60
  const headCy = 22

  // Shared anatomical reference segments
  const spine = <line x1="60" y1="34" x2="60" y2="90" stroke={strokeFaint} strokeWidth="2" strokeLinecap="round" />
  const legsStatic = (
    <>
      <line x1="60" y1="90" x2="45" y2="128" stroke={strokeFaint} strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="90" x2="75" y2="128" stroke={strokeFaint} strokeWidth="2" strokeLinecap="round" />
    </>
  )
  const head = <circle cx={headCx} cy={headCy} r="11" stroke={stroke} strokeWidth="1.8" fill={fill} />

  return (
    <svg viewBox="0 0 120 155" className="w-full h-full select-none" fill="none">
      {head}

      {type === "shoulder-rolls" && (
        <>
          {spine}
          {/* Arms rolling with gentle smooth sway */}
          <path
            d={`M60,48 Q${40 - sway},${58 + sway * 0.7} 26,${52 + sway * 0.4}`}
            stroke={strokeBright}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d={`M60,48 Q${80 + sway},${58 - sway * 0.7} 94,${52 - sway * 0.4}`}
            stroke={strokeBright}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {legsStatic}
        </>
      )}

      {type === "neck" && (
        <>
          {/* Head tilted by rhythmic sway */}
          <line x1="60" y1="34" x2={60 + sway * 0.6} y2="34" stroke={strokeFaint} strokeWidth="1" strokeDasharray="2 2" />
          {spine}
          <line x1="60" y1="48" x2="30" y2="62" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="48" x2="90" y2="62" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          {legsStatic}
        </>
      )}

      {type === "wrist" && (
        <>
          {spine}
          <line x1="60" y1="48" x2="28" y2="62" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="48" x2="92" y2="62" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          {/* Rotating wrist circles */}
          <circle
            cx={24 + Math.cos(progress * Math.PI * 6) * 5}
            cy={67 + Math.sin(progress * Math.PI * 6) * 5}
            r="5"
            stroke={strokeBright}
            strokeWidth="1.6"
            fill={fill}
          />
          <circle
            cx={96 - Math.cos(progress * Math.PI * 6) * 5}
            cy={67 + Math.sin(progress * Math.PI * 6) * 5}
            r="5"
            stroke={strokeBright}
            strokeWidth="1.6"
            fill={fill}
          />
          {legsStatic}
        </>
      )}

      {type === "reach" && (
        <>
          {spine}
          {/* Arms reaching upward/forward, animated */}
          <line
            x1="60"
            y1="48"
            x2={48 - sway * 0.4}
            y2={20 - sway * 0.5}
            stroke={strokeBright}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line
            x1="60"
            y1="48"
            x2={72 + sway * 0.4}
            y2={20 - sway * 0.5}
            stroke={strokeBright}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {legsStatic}
        </>
      )}

      {type === "side-stretch" && (
        <>
          <line x1={60 + sway * 0.25} y1="34" x2={60 + sway * 0.25} y2="90" stroke={strokeFaint} strokeWidth="2" />
          {/* One arm reaching overhead */}
          <line
            x1={60 + sway * 0.25}
            y1="48"
            x2={72 + sway * 1.4}
            y2={18 - sway * 0.6}
            stroke={strokeBright}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Other arm relaxed down */}
          <line
            x1={60 + sway * 0.25}
            y1="48"
            x2={42 + sway * 0.25}
            y2={62}
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line x1={60 + sway * 0.25} y1="90" x2={45 + sway * 0.2} y2="128" stroke={strokeFaint} strokeWidth="2" />
          <line x1={60 + sway * 0.25} y1="90" x2={75 + sway * 0.2} y2="128" stroke={strokeFaint} strokeWidth="2" />
        </>
      )}

      {type === "rotation" && (
        <>
          {spine}
          {/* Torso twist */}
          <path
            d={`M60,55 L${42 - sway},62 L${32 - sway},52`}
            stroke={strokeBright}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d={`M60,55 L${78 + sway},62`} stroke={strokeFaint} strokeWidth="2" strokeLinecap="round" />
          {legsStatic}
        </>
      )}

      {type === "march" && (
        <>
          {spine}
          <line x1="60" y1="48" x2="32" y2="66" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="48" x2="88" y2="66" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          {/* Alternating marching legs */}
          <line x1="60" y1="90" x2={46 - sway * 0.4} y2={108 - sway * 0.5} stroke={strokeBright} strokeWidth="2.2" strokeLinecap="round" />
          <line x1={46 - sway * 0.4} y1={108 - sway * 0.5} x2={49 - sway * 0.2} y2="128" stroke={strokeFaint} strokeWidth="2" />
          <line x1="60" y1="90" x2={74 + sway * 0.4} y2={108 + sway * 0.5} stroke={strokeBright} strokeWidth="2.2" strokeLinecap="round" />
          <line x1={74 + sway * 0.4} y1={108 + sway * 0.5} x2={71 + sway * 0.2} y2="128" stroke={strokeFaint} strokeWidth="2" />
        </>
      )}

      {type === "breathing" && (
        <>
          {/* Chest expanding with breath */}
          <ellipse cx="60" cy="62" rx={18 + sway * 0.6} ry="22" stroke={strokeBright} strokeWidth="1.8" fill={fill} />
          <line x1="60" y1="34" x2="60" y2="40" stroke={strokeFaint} strokeWidth="2" />
          {/* Expanding atmospheric rings */}
          <circle cx="60" cy="62" r={34 + sway * 2} stroke={strokeFaint} strokeWidth="1" opacity="0.6" />
          <circle cx="60" cy="62" r={44 + sway * 3} stroke={strokeFaint} strokeWidth="1" opacity="0.3" />
          {legsStatic}
        </>
      )}

      {/* Subtle safety anchor text */}
      <text x="60" y="148" textAnchor="middle" fontSize="7" fill="rgba(155,93,229,0.35)">
        Move gently
      </text>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main MovementReset Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MovementReset({
  onBack,
  onNav,
}: {
  onBack: () => void
  onNav: (s: string) => void
}) {
  // Stages: need-select -> session -> complete
  const [stage, setStage] = useState<Stage>("need-select")
  const [selectedBodyNeed, setSelectedBodyNeed] = useState<NeedId | null>(null)

  // Current active sequence and movement tracking
  const [currentSequence, setCurrentSequence] = useState<Movement[]>(movementSequences.unwind)
  const [currentMovementIndex, setCurrentMovementIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [isPaused, setIsPaused] = useState(false)
  const [postFeeling, setPostFeeling] = useState<string | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const activeMovement = currentSequence[currentMovementIndex] || currentSequence[0]
  const totalMovements = currentSequence.length

  // Start selected body need sequence or fallback to unwind for "Skip & Start"
  function handleStart(needToUse?: NeedId) {
    const needKey = needToUse || selectedBodyNeed || "unwind"
    const seq = movementSequences[needKey] || movementSequences.unwind

    setCurrentSequence(seq)
    setCurrentMovementIndex(0)
    setTimeRemaining(seq[0]?.duration || 30)
    setIsPaused(false)
    setStage("session")
  }

  // Handle Next movement button
  function handleNextMovement() {
    if (currentMovementIndex + 1 < totalMovements) {
      const nextIdx = currentMovementIndex + 1
      setCurrentMovementIndex(nextIdx)
      setTimeRemaining(currentSequence[nextIdx]?.duration || 30)
      setIsPaused(false)
    } else {
      setStage("complete")
    }
  }

  // Active Timer Effect
  useEffect(() => {
    if (stage !== "session" || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time expired for this movement
          if (currentMovementIndex + 1 < totalMovements) {
            const nextIdx = currentMovementIndex + 1
            setCurrentMovementIndex(nextIdx)
            return currentSequence[nextIdx]?.duration || 30
          } else {
            // Reached the end of Movement 5
            clearInterval(timerRef.current!)
            setStage("complete")
            return 0
          }
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [stage, isPaused, currentMovementIndex, totalMovements, currentSequence])

  // Save session record locally
  function handleSelectFeeling(feeling: string) {
    setPostFeeling(feeling)
    const sessions = JSON.parse(localStorage.getItem("cq_movement_sessions") ?? "[]")
    sessions.push({
      id: Date.now().toString(),
      need: selectedBodyNeed || "unwind",
      movementsCompleted: currentMovementIndex + 1,
      postFeeling: feeling,
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem("cq_movement_sessions", JSON.stringify(sessions))

    // Record usage in MongoDB backend for HR intervention analytics
    const token = localStorage.getItem("cq_token")
    if (token) {
      fetch("/api/interventions/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          interventionName: "Movement Reset",
          type: "RESET_LAB",
          category: "Movement",
          duration: (currentMovementIndex + 1) * 30,
          postFeeling: feeling,
          status: "Completed",
          metadata: { need: selectedBodyNeed || "unwind", movementsCompleted: currentMovementIndex + 1 },
        }),
      }).catch((e) => console.warn("[INTERVENTION-RECORD] Failed to record movement reset:", e.message))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Body Need Selection Screen
  // ─────────────────────────────────────────────────────────────────────────
  if (stage === "need-select") {
    return (
      <div className="flex-1 flex flex-col px-5 py-5 overflow-y-auto pb-28 bg-midnight">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors mb-6 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        <h2 className="text-xl font-bold text-warm-white mb-1">What does your body need right now?</h2>
        <p className="text-sm text-text-muted mb-6">Choose one — we'll match the right movements.</p>

        <div className="space-y-2.5 mb-6">
          {BODY_NEEDS.map((n) => {
            const isSelected = selectedBodyNeed === n.id
            return (
              <button
                key={n.id}
                onClick={() => setSelectedBodyNeed(n.id)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all text-left ${
                  isSelected
                    ? "border-purple-core bg-purple-core/15 ring-1 ring-purple-core/30"
                    : "border-border-p bg-surface/50 hover:border-border-s"
                }`}
              >
                <span className="text-2xl flex-shrink-0">{n.emoji}</span>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${isSelected ? "text-lavender-bright" : "text-warm-white"}`}>
                    {n.label}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">{n.desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => handleStart(selectedBodyNeed || undefined)}
          className="w-full btn-primary py-4 text-sm font-semibold rounded-2xl shadow-lg shadow-purple-core/20"
        >
          {selectedBodyNeed ? "Start →" : "Skip & Start"}
        </button>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Movement Screen (Timer, Illustration, Progress, Controls)
  // ─────────────────────────────────────────────────────────────────────────
  if (stage === "session" && activeMovement) {
    const progressFrac = 1 - timeRemaining / (activeMovement.duration || 30)

    return (
      <div className="flex-1 flex flex-col px-5 py-5 overflow-hidden bg-midnight">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-text-muted font-semibold uppercase tracking-widest">MOVEMENT RESET</p>
          <button
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current)
              setStage("need-select")
            }}
            className="text-xs text-text-muted font-medium hover:text-text-secondary transition-colors"
          >
            Exit
          </button>
        </div>

        {/* Dynamic Progress Bar (1/5 to 5/5) */}
        <div className="flex gap-1.5 mb-2">
          {currentSequence.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < currentMovementIndex
                  ? "bg-purple-core"
                  : i === currentMovementIndex
                  ? "bg-lavender-bright shadow-sm shadow-purple-core/50"
                  : "bg-surface border border-border-p/50"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-text-muted text-center mb-4 font-mono-data">
          Movement {currentMovementIndex + 1} of {totalMovements}
        </p>

        {/* Exercise Illustration + Countdown */}
        <div className="flex-1 flex items-center justify-center relative my-2">
          <div className="w-40 h-52 flex items-center justify-center">
            <MovementIllustration type={activeMovement.svg} progress={progressFrac} />
          </div>

          {/* Prominent Countdown Indicator */}
          <div className="absolute bottom-2 right-4">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg viewBox="0 0 44 44" className="w-12 h-12 -rotate-90 absolute inset-0">
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(155,93,229,0.15)" strokeWidth="3.5" />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="rgba(167,139,250,0.85)"
                  strokeWidth="3.5"
                  strokeDasharray="113.1"
                  strokeDashoffset={`${113.1 * (timeRemaining / (activeMovement.duration || 30))}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="text-sm font-bold font-mono-data text-warm-white">
                {timeRemaining}
              </span>
            </div>
          </div>
        </div>

        {/* Movement Info */}
        <div className="text-center mt-2 mb-4">
          <h3 className="text-2xl font-bold text-warm-white mb-2">{activeMovement.name}</h3>
          <p className="text-sm text-text-secondary leading-relaxed max-w-[280px] mx-auto">
            {activeMovement.instruction}
          </p>
        </div>

        {/* Safety hint */}
        <div className="bg-surface/60 border border-border-p/40 rounded-xl px-3 py-2 mb-4 text-center">
          <p className="text-[11px] text-text-muted">
            Move gently. Stop if anything feels painful or uncomfortable.
          </p>
        </div>

        {/* Controls: Pause / Resume, Next */}
        <div className="flex gap-2.5 mb-2">
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-border-p bg-surface text-sm font-semibold text-text-secondary hover:text-warm-white hover:border-border-s transition-colors"
          >
            {isPaused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button
            onClick={handleNextMovement}
            className="px-6 py-3.5 rounded-2xl btn-primary text-sm font-semibold transition-all shadow-md"
          >
            Next
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3 — Completion Screen
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col px-5 py-5 overflow-y-auto pb-28 bg-midnight">
      <div className="flex-1 flex flex-col items-center justify-center text-center py-6 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-c-success/15 border border-c-success/30 flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-c-success" fill="none" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-warm-white mb-2">Movement complete.</h2>
        <p className="text-sm text-text-muted mb-2 leading-relaxed">
          You gave your body a few minutes to reset.
        </p>
        <p className="text-xs text-text-secondary mb-8">
          Nice work. Notice how your body feels now.
        </p>

        <div className="w-full space-y-2 mb-6">
          {FEELINGS.map((f) => (
            <button
              key={f.label}
              onClick={() => handleSelectFeeling(f.label)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-sm font-medium transition-all text-left ${
                postFeeling === f.label
                  ? "border-purple-core bg-purple-core/15 text-lavender-bright font-semibold ring-1 ring-purple-core/30"
                  : "border-border-p bg-surface/60 text-text-secondary hover:border-border-s"
              }`}
            >
              <span className="text-lg">{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>

        <div className="w-full space-y-2.5">
          <button
            onClick={onBack}
            className="w-full btn-primary py-4 text-sm font-semibold rounded-2xl shadow-lg shadow-purple-core/20"
          >
            Done →
          </button>
          <button
            onClick={() => onNav("home")}
            className="w-full btn-ghost py-3 text-sm font-medium rounded-2xl"
          >
            Go to home screen
          </button>
        </div>
      </div>
    </div>
  )
}
