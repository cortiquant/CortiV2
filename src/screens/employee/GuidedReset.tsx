import { useState, useEffect, useRef, useMemo } from "react"

// ── Types ─────────────────────────────────────────────────────────────────────

export type GuidedModule = "energy_reset" | "relaxation" | "sleep_wind_down"
type Stage = "intro" | "prepare" | "session" | "complete"
type AnimType = "gentle" | "slow" | "minimal" | "still"

interface Phase {
  id: string
  title: string
  instruction: string
  subInstruction?: string
  duration: number
  animType: AnimType
}

interface ModuleConfig {
  title: string
  subtitle: string
  introText: string
  ctaLabel: string
  prepText?: string[]
  duration: number
  phases: Phase[]
  completionTitle: string
  completionQuestion: string
  postFeelings: { emoji: string; label: string }[]
  icon: string
  accentText: string
  accentBorder: string
  accentBg: string
  orbFrom: string
  orbVia: string
  orbGlow: string
  orbCore: string
  orbRing1: string
  orbRing2: string
  sessionBg?: string
  showPreFeeling?: boolean
  preFeelings?: { emoji: string; label: string }[]
}

// ── Configs ───────────────────────────────────────────────────────────────────

const CONFIGS: Record<GuidedModule, ModuleConfig> = {
  energy_reset: {
    title: "Energy Reset",
    subtitle: "Give yourself five quiet minutes to recharge.",
    introText: "Find a comfortable position.",
    ctaLabel: "Begin Reset",
    duration: 300,
    showPreFeeling: true,
    preFeelings: [
      { emoji: "🔋", label: "Completely drained" },
      { emoji: "😴", label: "Very tired" },
      { emoji: "😐", label: "Low energy" },
      { emoji: "🙂", label: "A little tired" },
    ],
    phases: [
      { id: "arrive",  title: "Arrive",  instruction: "Put everything else aside for a moment.", duration: 60, animType: "gentle" },
      { id: "breathe", title: "Breathe", instruction: "Take a slow breath in.", subInstruction: "Let it out gently.", duration: 60, animType: "gentle" },
      { id: "release", title: "Release", instruction: "Relax your shoulders.", subInstruction: "Unclench your jaw.", duration: 60, animType: "slow" },
      { id: "rest",    title: "Rest",    instruction: "Let yourself do nothing for a moment.", duration: 60, animType: "slow" },
      { id: "return",  title: "Return",  instruction: "Take one final slow breath.", subInstruction: "Come back when you're ready.", duration: 60, animType: "minimal" },
    ],
    completionTitle: "Five minutes for yourself.",
    completionQuestion: "How does your energy feel now?",
    postFeelings: [
      { emoji: "😌", label: "More refreshed" },
      { emoji: "🙂", label: "A little better" },
      { emoji: "😐", label: "About the same" },
      { emoji: "😴", label: "Still drained" },
    ],
    icon: "⚡",
    accentText: "text-c-info",
    accentBorder: "border-c-info/25",
    accentBg: "bg-c-info/10",
    orbFrom: "from-blue-900/40",
    orbVia: "via-c-info/15",
    orbCore: "radial-gradient(circle at 38% 32%, rgba(120,195,255,0.95) 0%, rgba(70,145,235,0.8) 38%, rgba(35,85,195,0.4) 70%, rgba(15,50,140,0.1) 100%)",
    orbGlow: "rgba(80,165,255,0.42)",
    orbRing1: "rgba(110,185,255,0.55)",
    orbRing2: "rgba(70,145,235,0.28)",
    sessionBg: "radial-gradient(ellipse at 50% 38%, rgba(40,90,200,0.22) 0%, transparent 65%)",
  },
  relaxation: {
    title: "Relaxation",
    subtitle: "Slow everything down for a while.",
    introText: "Find a comfortable position where you can stay undisturbed.",
    ctaLabel: "Begin Relaxation",
    prepText: ["Get comfortable.", "Let your hands rest.", "Allow your shoulders to soften."],
    duration: 900,
    phases: [
      { id: "arrive",    title: "Arrive",            instruction: "Notice where you are.", subInstruction: "There's nothing you need to solve right now.", duration: 120, animType: "gentle" },
      { id: "breath",    title: "Breath",            instruction: "Let your breathing become slower.", subInstruction: "Don't force it.", duration: 180, animType: "gentle" },
      { id: "shoulders", title: "Shoulders & Neck",  instruction: "Notice your shoulders.", subInstruction: "Let them soften.", duration: 120, animType: "slow" },
      { id: "arms",      title: "Arms & Hands",      instruction: "Allow your hands to relax.", duration: 120, animType: "slow" },
      { id: "body",      title: "Body",              instruction: "Notice the weight of your body.", subInstruction: "Let yourself settle.", duration: 180, animType: "slow" },
      { id: "quiet",     title: "Quiet",             instruction: "", duration: 120, animType: "still" },
      { id: "return",    title: "Return",            instruction: "Take your time.", subInstruction: "When you're ready, slowly return your attention to the room.", duration: 60, animType: "minimal" },
    ],
    completionTitle: "Take your time coming back.",
    completionQuestion: "How do you feel?",
    postFeelings: [
      { emoji: "😌", label: "Relaxed" },
      { emoji: "🙂", label: "A little lighter" },
      { emoji: "😐", label: "About the same" },
      { emoji: "😴", label: "Still tired" },
      { emoji: "😣", label: "Still tense" },
    ],
    icon: "✦",
    accentText: "text-lavender-soft",
    accentBorder: "border-purple-core/25",
    accentBg: "bg-purple-core/10",
    orbFrom: "from-purple-primary/45",
    orbVia: "via-purple-core/20",
    orbCore: "radial-gradient(circle at 38% 32%, rgba(195,145,255,0.95) 0%, rgba(155,93,229,0.82) 38%, rgba(110,58,190,0.45) 68%, rgba(70,32,150,0.12) 100%)",
    orbGlow: "rgba(155,93,229,0.48)",
    orbRing1: "rgba(183,122,242,0.58)",
    orbRing2: "rgba(140,85,215,0.28)",
    sessionBg: "radial-gradient(ellipse at 50% 38%, rgba(100,45,185,0.25) 0%, transparent 65%)",
  },
  sleep_wind_down: {
    title: "Sleep Wind-down",
    subtitle: "Let the day become a little quieter.",
    introText: "A gentle routine to help you transition toward rest.",
    ctaLabel: "Begin Wind-down",
    prepText: ["Dim the lights if you can.", "Get into your preferred resting position.", "Put your phone somewhere comfortable."],
    duration: 1200,
    phases: [
      { id: "leave",   title: "Leave the Day",     instruction: "Think about the day ending.", subInstruction: "You don't need to solve tomorrow tonight.", duration: 180, animType: "gentle" },
      { id: "breath",  title: "Slow Your Breath",  instruction: "Slowly breathe in.", subInstruction: "Let the breath leave naturally.", duration: 240, animType: "slow" },
      { id: "release", title: "Release",           instruction: "Let your shoulders soften.", subInstruction: "Let your hands rest. Let your body become heavier.", duration: 300, animType: "slow" },
      { id: "quiet",   title: "Quiet",             instruction: "", duration: 300, animType: "still" },
      { id: "rest",    title: "Rest",              instruction: "There's nowhere else you need to be right now.", subInstruction: "Let yourself rest.", duration: 180, animType: "still" },
    ],
    completionTitle: "Good night.",
    completionQuestion: "How ready do you feel to rest?",
    postFeelings: [
      { emoji: "😌", label: "Ready to rest" },
      { emoji: "🙂", label: "A little calmer" },
      { emoji: "😐", label: "About the same" },
      { emoji: "🤯", label: "Mind still active" },
    ],
    icon: "🌙",
    accentText: "text-lavender-bright",
    accentBorder: "border-lavender-bright/20",
    accentBg: "bg-lavender-bright/5",
    orbFrom: "from-purple-primary/55",
    orbVia: "via-purple-core/15",
    orbCore: "radial-gradient(circle at 38% 32%, rgba(140,105,210,0.88) 0%, rgba(100,68,175,0.75) 40%, rgba(65,38,140,0.45) 68%, rgba(35,18,100,0.12) 100%)",
    orbGlow: "rgba(110,72,185,0.38)",
    orbRing1: "rgba(140,105,210,0.42)",
    orbRing2: "rgba(100,68,175,0.22)",
    sessionBg: "radial-gradient(ellipse at 50% 30%, rgba(55,28,120,0.38) 0%, transparent 65%)",
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0")
  const sec = (s % 60).toString().padStart(2, "0")
  return `${m}:${sec}`
}

// ── Stars (sleep only) ────────────────────────────────────────────────────────

function Stars({ visible }: { visible: boolean }) {
  const dots = useMemo(
    () =>
      Array.from({ length: 28 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.5 + 0.5,
        delay: Math.random() * 4,
        dur: 2 + Math.random() * 3,
      })),
    []
  )
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-3000"
      style={{ opacity: visible ? 0.6 : 0 }}
    >
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-warm-white"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            animation: `pulse-dot ${d.dur}s ${d.delay}s ease-in-out infinite alternate`,
            opacity: 0.4 + Math.random() * 0.4,
          }}
        />
      ))}
    </div>
  )
}

// ── Orb ───────────────────────────────────────────────────────────────────────

function SessionOrb({
  cfg,
  animType,
  pulse,
  isSleep,
}: {
  cfg: ModuleConfig
  animType: AnimType
  pulse: boolean
  isSleep: boolean
}) {
  const scaleMap: Record<AnimType, number> = {
    gentle: 1.07,
    slow: 1.045,
    minimal: 1.02,
    still: 1.005,
  }
  const durMap: Record<AnimType, string> = {
    gentle: "1400ms",
    slow: "2200ms",
    minimal: "2800ms",
    still: "4000ms",
  }

  const baseSize = isSleep ? 175 : 150
  const scale = pulse ? scaleMap[animType] : 1
  const transDur = durMap[animType]
  const scaledSize = baseSize * scale
  const area = baseSize + 100

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: area, height: area }}
    >
      {/* Stars for sleep */}
      {isSleep && <Stars visible={animType === "still"} />}

      {/* Outer glow ring */}
      <div
        className="absolute rounded-full transition-all pointer-events-none"
        style={{
          width: scaledSize + 88,
          height: scaledSize + 88,
          border: `1px solid ${cfg.orbRing2}`,
          transitionDuration: transDur,
        }}
      />
      {/* Mid ring */}
      <div
        className="absolute rounded-full transition-all pointer-events-none"
        style={{
          width: scaledSize + 44,
          height: scaledSize + 44,
          border: `1.5px solid ${cfg.orbRing1}`,
          transitionDuration: transDur,
        }}
      />
      {/* Ambient glow */}
      <div
        className="absolute rounded-full pointer-events-none transition-all"
        style={{
          width: scaledSize * 1.3,
          height: scaledSize * 1.3,
          background: `radial-gradient(circle, ${cfg.orbGlow} 0%, transparent 70%)`,
          filter: "blur(24px)",
          transitionDuration: transDur,
        }}
      />
      {/* Core orb */}
      <div
        className="relative rounded-full border border-white/8 transition-all flex items-center justify-center overflow-hidden"
        style={{ width: scaledSize, height: scaledSize, background: cfg.orbCore, transitionDuration: transDur }}
      >
        {/* Inner specular highlight */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: "32%",
            height: "26%",
            top: "16%",
            left: "20%",
            background: "radial-gradient(circle, rgba(255,255,255,0.38) 0%, transparent 80%)",
            filter: "blur(4px)",
          }}
        />
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function GuidedReset({
  module,
  onBack,
  onNav,
}: {
  module: GuidedModule
  onBack: () => void
  onNav: (s: string) => void
}) {
  const cfg = CONFIGS[module]
  const isSleep = module === "sleep_wind_down"
  const isEnergy = module === "energy_reset"

  const [stage, setStage] = useState<Stage>("intro")
  const [preFeeling, setPreFeeling] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(3)
  const [totalElapsed, setTotalElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [postFeeling, setPostFeeling] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Derive current phase from total elapsed
  const { currentPhaseIdx } = useMemo(() => {
    let acc = 0
    for (let i = 0; i < cfg.phases.length; i++) {
      if (totalElapsed < acc + cfg.phases[i].duration) {
        return { currentPhaseIdx: i }
      }
      acc += cfg.phases[i].duration
    }
    return { currentPhaseIdx: cfg.phases.length - 1 }
  }, [totalElapsed, cfg])

  const currentPhase = cfg.phases[currentPhaseIdx]
  const overallProgress = Math.min(totalElapsed / cfg.duration, 1)

  // Countdown
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
      setTotalElapsed((t) => {
        const next = t + 1
        if (next >= cfg.duration) {
          clearInterval(intervalRef.current!)
          setStage("complete")
          return cfg.duration
        }
        return next
      })
      setPulse((p) => !p)
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [stage, paused, cfg.duration])

  function saveSession(feeling: string) {
    const sessions = JSON.parse(localStorage.getItem("cq_guided_reset_sessions") ?? "[]")
    sessions.push({
      id: Date.now().toString(),
      module,
      preFeeling,
      postFeeling: feeling,
      duration: totalElapsed,
      phasesCompleted: currentPhaseIdx,
      completed: totalElapsed >= cfg.duration,
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem("cq_guided_reset_sessions", JSON.stringify(sessions))

    // Record usage in MongoDB backend for HR intervention analytics
    const token = localStorage.getItem("cq_token")
    if (token) {
      const moduleNameMap: Record<GuidedModule, string> = {
        energy_reset: "Energy Reset",
        relaxation: "Relaxation",
        sleep_wind_down: "Sleep Wind-down",
      }
      fetch("/api/interventions/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          interventionName: moduleNameMap[module] || cfg.title,
          type: "RESET_LAB",
          category: "Meditation",
          duration: totalElapsed,
          postFeeling: feeling,
          status: "Completed",
          metadata: { module, preFeeling },
        }),
      }).catch((e) => console.warn("[INTERVENTION-RECORD] Failed to record guided reset:", e.message))
    }
  }

  const hasPrep = !!(cfg.prepText?.length)

  // ── Intro ─────────────────────────────────────────────────────────────────

  if (stage === "intro") {
    const durationLabel = isEnergy ? "5 MIN" : module === "relaxation" ? "15 MIN" : "20 MIN"

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

        <div className="flex flex-col items-center text-center">
          {/* Preview orb */}
          <div className="relative mb-7" style={{ width: 120, height: 120 }}>
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${cfg.orbFrom} ${cfg.orbVia} to-transparent animate-breathe`}
            />
            <div className="absolute" style={{ inset: 12 }}>
              <div className="w-full h-full rounded-full border border-purple-core/20 animate-breathe-ring" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`w-12 h-12 rounded-full ${cfg.accentBg} border ${cfg.accentBorder} flex items-center justify-center text-xl`}
              >
                {cfg.icon}
              </div>
            </div>
          </div>

          {/* Badge */}
          <div
            className={`inline-flex items-center gap-2 ${cfg.accentBg} border ${cfg.accentBorder} rounded-full px-4 py-1.5 mb-4`}
          >
            <span className={`font-mono-data text-xs font-bold ${cfg.accentText}`}>{durationLabel}</span>
            <div className="w-px h-3 bg-border-s" />
            <span className={`text-xs font-semibold ${cfg.accentText} uppercase tracking-widest`}>{cfg.title}</span>
          </div>

          <h2 className="text-2xl font-bold text-warm-white mb-3 leading-snug">{cfg.subtitle}</h2>
          <p className="text-sm text-text-muted leading-relaxed max-w-[260px] mb-7">{cfg.introText}</p>

          {/* Optional pre-feeling (Energy Reset) */}
          {cfg.showPreFeeling && cfg.preFeelings && (
            <div className="w-full mb-6">
              <p className="text-xs text-text-muted font-semibold uppercase tracking-widest mb-3 text-left">
                How drained do you feel right now?
              </p>
              <div className="space-y-2">
                {cfg.preFeelings.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setPreFeeling(f.label)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium transition-all text-left ${
                      preFeeling === f.label
                        ? `${cfg.accentBorder} ${cfg.accentBg} ${cfg.accentText}`
                        : "border-border-p text-text-muted hover:border-border-s"
                    }`}
                  >
                    <span className="text-lg">{f.emoji}</span>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prep tips (Relaxation, Sleep) */}
          {cfg.prepText && cfg.prepText.length > 0 && (
            <div className="w-full mb-6">
              <div className="card-base p-4 text-left space-y-2.5">
                {cfg.prepText.map((tip) => (
                  <div key={tip} className="flex items-start gap-2.5">
                    <div className="w-1 h-1 rounded-full bg-purple-core/50 mt-2 flex-shrink-0" />
                    <p className="text-sm text-text-muted leading-snug">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => (hasPrep ? setStage("prepare") : setStage("session"))}
            className="w-full btn-primary py-4 text-sm font-semibold rounded-2xl mb-3"
          >
            {cfg.ctaLabel}
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

  // ── Preparation countdown ─────────────────────────────────────────────────

  if (stage === "prepare") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
        <p className="text-sm text-text-muted mb-1">Get comfortable.</p>
        <p className="text-xs text-text-muted mb-12">Relax your shoulders and let your hands rest.</p>
        <span className="font-mono-data text-8xl font-bold text-warm-white leading-none mb-4">
          {countdown === 0 ? "✓" : countdown}
        </span>
        <p className="text-xs text-text-muted">Starting soon…</p>
      </div>
    )
  }

  // ── Session ───────────────────────────────────────────────────────────────

  if (stage === "session" && currentPhase) {
    const isQuiet = currentPhase.animType === "still"
    const textOpacity = isQuiet ? 0.2 : 1
    const progressPercent = Math.round(overallProgress * 100)

    return (
      <div
        className="flex-1 flex flex-col items-center px-5 pt-4 pb-4 relative overflow-hidden"
        style={{ background: cfg.sessionBg }}
      >
        {/* Top bar */}
        <div className="relative w-full flex items-center justify-between mb-2 flex-shrink-0">
          <div className="w-14" />
          <span
            className={`text-xs font-bold uppercase tracking-widest ${cfg.accentText} transition-opacity duration-2000`}
            style={{ opacity: isQuiet ? 0.15 : 1 }}
          >
            {isQuiet ?  " " : currentPhase.title}
          </span>
          <button
            onClick={() => { setPaused(true); setStage("complete") }}
            className="text-xs text-text-muted font-medium hover:text-text-secondary transition-colors"
          >
            Exit
          </button>
        </div>

        {/* Orb + instruction grouped and centered */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <SessionOrb cfg={cfg} animType={currentPhase.animType} pulse={pulse} isSleep={isSleep} />

          <div
            className="text-center mt-5 transition-all duration-3000 min-h-[52px] max-w-[280px]"
            style={{ opacity: textOpacity }}
          >
            {currentPhase.instruction && (
              <p className="text-[15px] text-warm-white font-medium leading-relaxed mb-1">
                {currentPhase.instruction}
              </p>
            )}
            {currentPhase.subInstruction && (
              <p className="text-sm text-text-muted leading-relaxed">{currentPhase.subInstruction}</p>
            )}
          </div>
        </div>

        {/* Controls + progress pinned to bottom */}
        <div className="relative w-full flex-shrink-0">
          <div className="flex items-center justify-between mb-2.5" style={{ opacity: 0.5 }}>
            <span className="font-mono-data text-xs text-text-muted">
              {fmt(totalElapsed)} / {fmt(cfg.duration)}
            </span>
            <button
              onClick={() => setPaused((p) => !p)}
              className="text-xs text-text-muted font-medium hover:text-text-secondary transition-colors px-3 py-1.5 rounded-lg border border-border-p/50"
            >
              {paused ? "Resume" : "Pause"}
            </button>
          </div>

          <div className="h-0.5 bg-border-p/40 rounded-full overflow-hidden mb-2.5">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%`, background: `linear-gradient(to right, ${cfg.orbRing2}, ${cfg.orbRing1})` }}
            />
          </div>

          <div className="flex gap-1.5 justify-center">
            {cfg.phases.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-500 ${
                  i < currentPhaseIdx
                    ? "w-2 h-1.5 bg-purple-core/45"
                    : i === currentPhaseIdx
                    ? "w-4 h-1.5 bg-lavender-bright"
                    : "w-2 h-1.5 bg-border-p/35"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Complete ──────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col px-5 py-5 overflow-y-auto pb-28">
      <div className="flex-1 flex flex-col items-center justify-center text-center py-6 animate-fade-up">
        <div
          className={`w-16 h-16 rounded-full ${cfg.accentBg} border ${cfg.accentBorder} flex items-center justify-center mb-6 text-2xl`}
        >
          {cfg.icon}
        </div>

        <h2 className="text-2xl font-bold text-warm-white mb-2">{cfg.completionTitle}</h2>
        <p className="text-sm text-text-muted mb-8 leading-relaxed">{cfg.completionQuestion}</p>

        <div className="w-full space-y-2 mb-6">
          {cfg.postFeelings.map((f) => (
            <button
              key={f.label}
              onClick={() => {
                setPostFeeling(f.label)
                saveSession(f.label)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium transition-all text-left ${
                postFeeling === f.label
                  ? "border-purple-core bg-purple-core/10 text-lavender-soft"
                  : "border-border-p bg-elevated text-text-secondary hover:border-border-s"
              }`}
            >
              <span className="text-lg">{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>

        {postFeeling && (
          <div className="w-full animate-fade-up space-y-2">
            {/* Contextual next steps */}
            {isEnergy && postFeeling === "Still drained" && (
              <div className="card-base p-4 mb-2 text-left">
                <p className="text-sm text-text-secondary mb-3">Try a longer relaxation.</p>
                <button
                  onClick={() => onNav("relaxation")}
                  className="w-full btn-primary py-3 text-sm font-semibold rounded-2xl"
                >
                  Start Relaxation →
                </button>
              </div>
            )}
            {isEnergy && (postFeeling === "About the same" || postFeeling === "A little better") && (
              <div className="card-base p-4 mb-2 text-left">
                <p className="text-sm text-text-secondary mb-2">Prefer to simply listen?</p>
                <button
                  onClick={() => onNav("music-reset")}
                  className="w-full btn-ghost py-2.5 text-sm font-medium rounded-2xl"
                >
                  Musical Reset →
                </button>
              </div>
            )}
            {module === "relaxation" && postFeeling === "Still tense" && (
              <div className="card-base p-4 mb-2 text-left">
                <p className="text-sm text-text-secondary mb-3">Try a 3-minute breathing reset.</p>
                <button
                  onClick={() => onNav("breathing-reset")}
                  className="w-full btn-primary py-3 text-sm font-semibold rounded-2xl"
                >
                  Breathing Reset →
                </button>
              </div>
            )}
            {module === "relaxation" && postFeeling === "Still tired" && (
              <div className="card-base p-4 mb-2 text-left">
                <p className="text-sm text-text-secondary mb-2">Want to get away from the screen?</p>
                <button
                  onClick={() => onNav("movement-reset")}
                  className="w-full btn-ghost py-2.5 text-sm font-medium rounded-2xl"
                >
                  Movement Reset →
                </button>
              </div>
            )}
            {isSleep && postFeeling === "Mind still active" && (
              <div className="card-base p-4 mb-2 text-left">
                <p className="text-sm text-text-secondary mb-3">Want to put your thoughts somewhere?</p>
                <button
                  onClick={() => onNav("dump-bag")}
                  className="w-full btn-primary py-3 text-sm font-semibold rounded-2xl"
                >
                  Open Dump Bag →
                </button>
              </div>
            )}

            {/* Write something down (not shown for sleep since user should rest) */}
            {!isSleep && (
              <div className="flex items-center justify-center gap-2 py-1">
                <button
                  onClick={() => onNav("journal")}
                  className="text-xs text-purple-core hover:text-lavender-bright transition-colors font-medium"
                >
                  Write something in your journal →
                </button>
              </div>
            )}

            {!isSleep && (
              <button
                onClick={() => onNav("home")}
                className="w-full btn-primary py-3.5 text-sm font-semibold rounded-2xl"
              >
                Go to home screen →
              </button>
            )}
            {isSleep && (
              <p className="text-xs text-text-muted text-center py-2">Rest well. Good night.</p>
            )}
            <button onClick={onBack} className="w-full btn-ghost py-3 text-sm font-medium rounded-2xl">
              Back to Reset
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
