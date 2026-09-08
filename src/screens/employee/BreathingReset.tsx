import { useState, useEffect, useRef } from "react"

type Phase = "inhale" | "hold" | "exhale"
type Stage = "intro" | "prepare" | "session" | "complete"

const PHASE_DURATIONS: Record<Phase, number> = { inhale: 4, hold: 2, exhale: 6 }
const CYCLE_DURATION = 12
const TOTAL_SECONDS = 180

const TIPS = [
  "Inhale slowly.",
  "Let it out gently.",
  "Relax your shoulders.",
  "Let your breath find its rhythm.",
  "Soften your jaw.",
  "You're doing great.",
]

const FEELINGS = ["Much calmer", "A little calmer", "About the same", "Still overwhelmed"]

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0")
  const sec = (s % 60).toString().padStart(2, "0")
  return `${m}:${sec}`
}

// ── Phase-specific visuals ────────────────────────────────────────────────────

const PHASE_VISUALS = {
  inhale: {
    core: "radial-gradient(circle at 40% 35%, rgba(210,160,255,1) 0%, rgba(170,100,240,0.95) 30%, rgba(130,70,210,0.7) 60%, rgba(90,45,160,0.25) 100%)",
    glow1: "radial-gradient(circle, rgba(183,122,242,0.65) 0%, transparent 65%)",
    glow2: "radial-gradient(circle, rgba(155,93,229,0.35) 0%, transparent 70%)",
    ring1: "rgba(200,150,255,0.55)",
    ring2: "rgba(183,122,242,0.3)",
    ring3: "rgba(155,93,229,0.15)",
    bg: "rgba(100,50,180,0.28)",
    label: "Inhale",
    labelColor: "rgba(220,180,255,1)",
  },
  hold: {
    core: "radial-gradient(circle at 40% 35%, rgba(235,210,255,1) 0%, rgba(200,155,255,0.95) 28%, rgba(165,110,240,0.75) 55%, rgba(120,75,200,0.3) 100%)",
    glow1: "radial-gradient(circle, rgba(220,180,255,0.75) 0%, transparent 60%)",
    glow2: "radial-gradient(circle, rgba(183,122,242,0.45) 0%, transparent 70%)",
    ring1: "rgba(235,210,255,0.7)",
    ring2: "rgba(200,155,255,0.4)",
    ring3: "rgba(165,110,240,0.2)",
    bg: "rgba(130,70,210,0.32)",
    label: "Hold",
    labelColor: "rgba(240,220,255,1)",
  },
  exhale: {
    core: "radial-gradient(circle at 40% 35%, rgba(120,80,200,0.9) 0%, rgba(85,50,160,0.8) 40%, rgba(55,30,120,0.5) 70%, rgba(30,15,80,0.15) 100%)",
    glow1: "radial-gradient(circle, rgba(120,80,200,0.45) 0%, transparent 65%)",
    glow2: "radial-gradient(circle, rgba(80,50,160,0.25) 0%, transparent 70%)",
    ring1: "rgba(140,100,220,0.4)",
    ring2: "rgba(100,65,180,0.22)",
    ring3: "rgba(70,40,140,0.12)",
    bg: "rgba(60,30,120,0.2)",
    label: "Exhale",
    labelColor: "rgba(170,130,230,1)",
  },
}

// ── Orb component ─────────────────────────────────────────────────────────────

function BreathingOrb({
  phase,
  scale,
  countdown,
}: {
  phase: Phase
  scale: number
  countdown: number
}) {
  const v = PHASE_VISUALS[phase]
  const BASE = 148

  const coreSize = BASE * scale
  const ring1Size = (BASE + 52) * scale
  const ring2Size = (BASE + 100) * scale
  const ring3Size = (BASE + 155) * scale
  const glowSize  = BASE * scale * 1.6

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: BASE + 165, height: BASE + 165 }}
    >
      {/* Outer atmospheric ring */}
      <div
        className="absolute rounded-full transition-all duration-1000 pointer-events-none"
        style={{
          width: ring3Size,
          height: ring3Size,
          border: `1px solid ${v.ring3}`,
        }}
      />

      {/* Second ring */}
      <div
        className="absolute rounded-full transition-all duration-1000 pointer-events-none"
        style={{
          width: ring2Size,
          height: ring2Size,
          border: `1.5px solid ${v.ring2}`,
        }}
      />

      {/* Inner ring */}
      <div
        className="absolute rounded-full transition-all duration-1000 pointer-events-none"
        style={{
          width: ring1Size,
          height: ring1Size,
          border: `2px solid ${v.ring1}`,
        }}
      />

      {/* Outer glow */}
      <div
        className="absolute rounded-full transition-all duration-1000 pointer-events-none"
        style={{
          width: glowSize,
          height: glowSize,
          background: v.glow2,
          filter: "blur(32px)",
        }}
      />

      {/* Inner glow */}
      <div
        className="absolute rounded-full transition-all duration-1000 pointer-events-none"
        style={{
          width: coreSize * 1.15,
          height: coreSize * 1.15,
          background: v.glow1,
          filter: "blur(18px)",
        }}
      />

      {/* Core orb */}
      <div
        className="relative rounded-full transition-all duration-1000 flex items-center justify-center overflow-hidden"
        style={{ width: coreSize, height: coreSize, background: v.core }}
      >
        {/* Specular highlight */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: "32%",
            height: "28%",
            top: "16%",
            left: "20%",
            background: "radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 80%)",
            filter: "blur(4px)",
          }}
        />
        {/* Phase countdown */}
        <span
          className="relative font-mono-data font-bold transition-all duration-500"
          style={{
            fontSize: Math.round(coreSize * 0.28),
            color: v.labelColor,
            textShadow: `0 0 24px ${v.ring1}, 0 0 8px rgba(255,255,255,0.4)`,
          }}
        >
          {countdown}
        </span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BreathingReset({
  onBack,
  onNav,
}: {
  onBack: () => void
  onNav: (s: string) => void
}) {
  const [stage, setStage] = useState<Stage>("intro")
  const [countdown, setCountdown] = useState(3)
  const [phase, setPhase] = useState<Phase>("inhale")
  const [phaseTime, setPhaseTime] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [tip, setTip] = useState("")
  const [postFeeling, setPostFeeling] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Countdown before session
  useEffect(() => {
    if (stage !== "prepare") return
    if (countdown <= 0) { setStage("session"); return }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [stage, countdown])

  // Session tick
  useEffect(() => {
    if (stage !== "session" || paused) return
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1
        if (next >= TOTAL_SECONDS) {
          clearInterval(intervalRef.current!)
          setStage("complete")
          return TOTAL_SECONDS
        }
        const pos = next % CYCLE_DURATION
        if (pos < PHASE_DURATIONS.inhale) setPhase("inhale")
        else if (pos < PHASE_DURATIONS.inhale + PHASE_DURATIONS.hold) setPhase("hold")
        else setPhase("exhale")
        setPhaseTime(pos)
        return next
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [stage, paused])

  // Occasional tips
  useEffect(() => {
    if (stage !== "session") return
    function showTip() {
      setTip(TIPS[Math.floor(Math.random() * TIPS.length)])
      tipTimerRef.current = setTimeout(() => {
        setTip("")
        tipTimerRef.current = setTimeout(showTip, 14000)
      }, 4500)
    }
    const t = setTimeout(showTip, 6000)
    return () => {
      clearTimeout(t)
      if (tipTimerRef.current) clearTimeout(tipTimerRef.current)
    }
  }, [stage])

  // Orb scale: smooth interpolation within phase
  const orbScale =
    phase === "inhale"
      ? 1 + (phaseTime / PHASE_DURATIONS.inhale) * 0.28
      : phase === "hold"
      ? 1.28
      : 1.28 - ((phaseTime - PHASE_DURATIONS.inhale - PHASE_DURATIONS.hold) / PHASE_DURATIONS.exhale) * 0.28

  // Phase-relative countdown
  const phaseCountdown =
    phase === "inhale"
      ? PHASE_DURATIONS.inhale - phaseTime
      : phase === "hold"
      ? PHASE_DURATIONS.inhale + PHASE_DURATIONS.hold - phaseTime
      : CYCLE_DURATION - phaseTime

  function saveSession(feeling: string) {
    const sessions = JSON.parse(localStorage.getItem("cq_breathing_sessions") ?? "[]")
    sessions.push({
      id: Date.now().toString(),
      duration: elapsed,
      completionStatus: elapsed >= TOTAL_SECONDS ? "completed" : "partial",
      postFeeling: feeling,
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem("cq_breathing_sessions", JSON.stringify(sessions))
  }

  const v = PHASE_VISUALS[phase]

  // ── Intro ─────────────────────────────────────────────────────────────────

  if (stage === "intro") {
    return (
      <div className="flex-1 flex flex-col px-5 py-5 overflow-y-auto pb-28">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors mb-6 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          {/* Preview orb */}
          <div className="relative mb-8">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle at 38% 32%, rgba(210,160,255,0.9) 0%, rgba(155,93,229,0.7) 45%, rgba(90,45,160,0.3) 100%)",
              }}
            >
              <div
                className="w-16 h-16 rounded-full"
                style={{
                  border: "1.5px solid rgba(200,150,255,0.5)",
                  background: "radial-gradient(circle, rgba(235,210,255,0.12) 0%, transparent 80%)",
                }}
              />
            </div>
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(155,93,229,0.4) 0%, transparent 70%)",
                filter: "blur(20px)",
              }}
            />
          </div>

          <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-4 py-1.5 mb-4">
            <span className="font-mono-data text-xs font-bold text-lavender-bright">3 MIN</span>
            <div className="w-px h-3 bg-border-s" />
            <span className="text-xs font-semibold text-lavender-bright uppercase tracking-widest">Breathing Reset</span>
          </div>

          <h2 className="text-2xl font-bold text-warm-white mb-3 leading-snug">
            Take 3 minutes
            <br />
            for yourself.
          </h2>
          <p className="text-sm text-text-muted leading-relaxed max-w-[260px] mb-10">
            {"Let's slow things down and give your mind a moment to reset."}
          </p>

          <button
            onClick={() => setStage("prepare")}
            className="w-full btn-primary py-4 text-sm font-semibold rounded-2xl mb-3"
          >
            Begin Reset
          </button>
          <button
            onClick={onBack}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    )
  }

  // ── Prepare countdown ─────────────────────────────────────────────────────

  if (stage === "prepare") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
        <p className="text-sm text-text-muted mb-2">Get comfortable.</p>
        <p className="text-xs text-text-muted mb-12">Relax your shoulders and let your hands rest.</p>
        <span className="font-mono-data text-8xl font-bold text-warm-white leading-none mb-4">
          {countdown === 0 ? "✓" : countdown}
        </span>
        <p className="text-xs text-text-muted">Starting…</p>
      </div>
    )
  }

  // ── Session ───────────────────────────────────────────────────────────────

  if (stage === "session") {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-between px-5 py-6 relative overflow-hidden transition-all duration-1000"
      >
        {/* Atmospheric background — shifts with phase */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000"
          style={{
            background: `radial-gradient(ellipse at 50% 42%, ${v.bg} 0%, transparent 68%)`,
          }}
        />

        {/* Exit */}
        <div className="relative w-full flex items-center justify-between">
          <div className="w-14" />
          <span
            className="text-base font-bold tracking-wider transition-all duration-700"
            style={{ color: v.labelColor, textShadow: `0 0 20px ${v.ring1}` }}
          >
            {v.label}
          </span>
          <button
            onClick={() => { setPaused(true); setStage("complete") }}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors font-medium"
          >
            Exit
          </button>
        </div>

        {/* Orb */}
        <div className="flex-1 flex items-center justify-center relative">
          <BreathingOrb phase={phase} scale={orbScale} countdown={phaseCountdown} />
        </div>

        {/* Tip */}
        <div className="h-6 flex items-center justify-center mb-2">
          {tip && (
            <p className="text-sm italic text-center animate-fade-up" style={{ color: "rgba(200,170,240,0.75)" }}>
              {tip}
            </p>
          )}
        </div>

        {/* Timer + controls */}
        <div className="relative w-full">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono-data text-xs text-text-muted">
              {fmt(elapsed)} / {fmt(TOTAL_SECONDS)}
            </p>
            <button
              onClick={() => setPaused((p) => !p)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border-p/60 bg-elevated/50 text-xs text-text-secondary hover:border-border-s transition-colors"
            >
              {paused ? (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M3 2l8 4-8 4V2z" />
                  </svg>
                  Resume
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                    <rect x="2" y="2" width="3" height="8" rx="0.75" />
                    <rect x="7" y="2" width="3" height="8" rx="0.75" />
                  </svg>
                  Pause
                </>
              )}
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-0.5 bg-border-p/40 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${(elapsed / TOTAL_SECONDS) * 100}%`,
                background: `linear-gradient(to right, rgba(130,70,210,0.8), ${v.ring1})`,
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Complete ──────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col px-5 py-5 overflow-y-auto pb-28">
      <div className="flex-1 flex flex-col items-center justify-center text-center py-8 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-c-success/10 border border-c-success/25 flex items-center justify-center mb-6">
          <svg className="w-7 h-7 text-c-success" fill="none" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-warm-white mb-2">Nice. You took a moment.</h2>
        <p className="text-sm text-text-muted mb-8 leading-relaxed">Notice how you feel right now.</p>

        <p className="text-xs text-text-muted font-semibold uppercase tracking-widest mb-4">How do you feel?</p>
        <div className="w-full space-y-2 mb-8">
          {FEELINGS.map((f) => (
            <button
              key={f}
              onClick={() => {
                setPostFeeling(f)
                saveSession(f)
              }}
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${
                postFeeling === f
                  ? "border-purple-core bg-purple-core/10 text-lavender-soft"
                  : "border-border-p bg-elevated text-text-secondary hover:border-border-s"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {postFeeling && (
          <div className="w-full animate-fade-up space-y-2">
            <p className="text-xs text-text-muted mb-3">
              {"Thanks for checking in. We'll learn over time which resets work best for you."}
            </p>
            <button
              onClick={() => onNav("home")}
              className="w-full btn-primary py-3.5 text-sm font-semibold rounded-2xl"
            >
              Go to home screen →
            </button>
            <button
              onClick={onBack}
              className="w-full btn-ghost py-3 text-sm font-medium rounded-2xl"
            >
              Back to Reset
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
