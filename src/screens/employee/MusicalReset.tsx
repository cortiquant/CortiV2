import { useState, useEffect, useRef } from "react"

type ModeId = "slow-down" | "unwind" | "clear-head" | "lift-up" | "just-listen"
type Stage = "intro" | "mode-select" | "session" | "complete"

const MODES = [
  {
    id: "slow-down" as ModeId,
    emoji: "🌊",
    label: "Slow Down",
    desc: "I need to calm things down.",
    color: "text-c-info",
    bg: "bg-c-info/10",
    border: "border-c-info/25",
    gradFrom: "from-blue-900/40",
    gradVia: "via-c-info/20",
  },
  {
    id: "unwind" as ModeId,
    emoji: "🌿",
    label: "Unwind",
    desc: "I just need a break.",
    color: "text-c-success",
    bg: "bg-c-success/10",
    border: "border-c-success/25",
    gradFrom: "from-emerald-900/30",
    gradVia: "via-c-success/15",
  },
  {
    id: "clear-head" as ModeId,
    emoji: "🧠",
    label: "Clear My Head",
    desc: "I need some mental space.",
    color: "text-lavender-soft",
    bg: "bg-purple-core/10",
    border: "border-purple-core/25",
    gradFrom: "from-purple-primary/50",
    gradVia: "via-purple-core/25",
  },
  {
    id: "lift-up" as ModeId,
    emoji: "☀️",
    label: "Lift Me Up",
    desc: "I need a little energy.",
    color: "text-c-warning",
    bg: "bg-c-warning/10",
    border: "border-c-warning/25",
    gradFrom: "from-amber-900/35",
    gradVia: "via-c-warning/15",
  },
  {
    id: "just-listen" as ModeId,
    emoji: "🎧",
    label: "Just Listen",
    desc: "I don't want to think.",
    color: "text-text-secondary",
    bg: "bg-elevated",
    border: "border-border-s",
    gradFrom: "from-purple-primary/30",
    gradVia: "via-lavender-bright/15",
  },
]

const DURATIONS = [
  { label: "3 MIN", seconds: 180 },
  { label: "5 MIN", seconds: 300 },
  { label: "10 MIN", seconds: 600 },
]

const TRACKS: Record<ModeId, { title: string; artist: string }[]> = {
  "slow-down": [
    { title: "Evening Drift", artist: "Cortiquant Reset" },
    { title: "Still Waters", artist: "Cortiquant Reset" },
    { title: "Low Tide", artist: "Cortiquant Reset" },
  ],
  "unwind": [
    { title: "Warm Light", artist: "Cortiquant Reset" },
    { title: "Gentle Hours", artist: "Cortiquant Reset" },
    { title: "Sunday Space", artist: "Cortiquant Reset" },
  ],
  "clear-head": [
    { title: "Open Space", artist: "Cortiquant Reset" },
    { title: "Quiet Mind", artist: "Cortiquant Reset" },
    { title: "Empty Room", artist: "Cortiquant Reset" },
  ],
  "lift-up": [
    { title: "Morning Shift", artist: "Cortiquant Reset" },
    { title: "Soft Rise", artist: "Cortiquant Reset" },
    { title: "First Light", artist: "Cortiquant Reset" },
  ],
  "just-listen": [
    { title: "Uninterrupted", artist: "Cortiquant Reset" },
    { title: "No Words", artist: "Cortiquant Reset" },
    { title: "Signal", artist: "Cortiquant Reset" },
  ],
}

const PROMPTS = [
  "Just listen.",
  "Nothing to solve right now.",
  "Let your shoulders soften.",
  "Take your time.",
  "Let the music carry the next few minutes.",
  "Breathe slowly.",
  "You're here. That's enough.",
  "Let your jaw unclench.",
]

const FEELINGS = [
  { emoji: "😌", label: "Much calmer" },
  { emoji: "🙂", label: "A little better" },
  { emoji: "😐", label: "About the same" },
  { emoji: "😣", label: "Still overwhelmed" },
  { emoji: "⚡", label: "More energized" },
]

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0")
  const sec = (s % 60).toString().padStart(2, "0")
  return `${m}:${sec}`
}

export default function MusicalReset({
  onBack,
  onNav,
}: {
  onBack: () => void
  onNav: (s: string) => void
}) {
  const [stage, setStage] = useState<Stage>("intro")
  const [mode, setMode] = useState<ModeId | null>(null)
  const [durationIdx, setDurationIdx] = useState(1)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [trackIdx, setTrackIdx] = useState(0)
  const [prompt, setPrompt] = useState("")
  const [postFeeling, setPostFeeling] = useState<string | null>(null)
  const [pulse, setPulse] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalSeconds = DURATIONS[durationIdx].seconds
  const currentMode = MODES.find((m2) => m2.id === mode) ?? MODES[2]
  const tracks = mode ? TRACKS[mode] : TRACKS["clear-head"]
  const currentTrack = tracks[trackIdx % tracks.length]

  useEffect(() => {
    if (stage !== "session" || paused) return
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= totalSeconds) {
          clearInterval(intervalRef.current!)
          setStage("complete")
          return totalSeconds
        }
        return e + 1
      })
      setPulse((p) => !p)
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [stage, paused, totalSeconds])

  useEffect(() => {
    if (stage !== "session" || mode === "just-listen") return
    function showPrompt() {
      setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])
      promptTimerRef.current = setTimeout(() => {
        setPrompt("")
        promptTimerRef.current = setTimeout(showPrompt, 20000)
      }, 5000)
    }
    const t = setTimeout(showPrompt, 10000)
    return () => {
      clearTimeout(t)
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current)
    }
  }, [stage, mode])

  function saveSession(feeling: string) {
    const sessions = JSON.parse(localStorage.getItem("cq_music_sessions") ?? "[]")
    sessions.push({
      id: Date.now().toString(),
      mode,
      duration: elapsed,
      completionStatus: elapsed >= totalSeconds ? "completed" : "partial",
      postFeeling: feeling,
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem("cq_music_sessions", JSON.stringify(sessions))

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
          interventionName: "Musical Reset",
          type: "RESET_LAB",
          category: "Music",
          duration: elapsed,
          postFeeling: feeling,
          status: "Completed",
          metadata: { mode },
        }),
      }).catch((e) => console.warn("[INTERVENTION-RECORD] Failed to record musical reset:", e.message))
    }
  }

  // ── Intro ──
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

        <div className="flex-1 flex flex-col items-center text-center py-4">
          <div className="relative mb-8" style={{ width: 120, height: 120 }}>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-primary/25 via-lavender-bright/10 to-transparent animate-breathe" />
            <div className="absolute" style={{ inset: 10 }}>
              <div className="w-full h-full rounded-full border border-purple-core/20 animate-breathe-ring" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-purple-core/15 border border-purple-core/30 flex items-center justify-center text-2xl">
                🎵
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-4 py-1.5 mb-4">
            <span className="text-xs font-bold text-lavender-bright uppercase tracking-widest">Musical Reset</span>
          </div>

          <h2 className="text-2xl font-bold text-warm-white mb-3 leading-snug">
            Let the music
            <br />
            take over.
          </h2>
          <p className="text-sm text-text-muted leading-relaxed max-w-[260px] mb-8">
            Put everything else aside for a few minutes and give yourself some space.
          </p>

          <div className="w-full mb-6">
            <p className="text-xs text-text-muted font-semibold uppercase tracking-widest mb-3 text-left">Duration</p>
            <div className="flex gap-2">
              {DURATIONS.map((d, i) => (
                <button
                  key={d.label}
                  onClick={() => setDurationIdx(i)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    durationIdx === i
                      ? "border-purple-core bg-purple-core/10 text-lavender-bright"
                      : "border-border-p text-text-muted hover:border-border-s"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStage("mode-select")}
            className="w-full btn-primary py-4 text-sm font-semibold rounded-2xl mb-3"
          >
            Begin
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

  // ── Mode selection ──
  if (stage === "mode-select") {
    return (
      <div className="flex-1 flex flex-col px-5 py-5 overflow-y-auto pb-28">
        <button
          onClick={() => setStage("intro")}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors mb-6 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        <h2 className="text-xl font-bold text-warm-white mb-1">What do you need right now?</h2>
        <p className="text-sm text-text-muted mb-6">One selection only.</p>

        <div className="space-y-2.5 mb-6">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all text-left ${
                mode === m.id ? `${m.border} ${m.bg}` : "border-border-p hover:border-border-s"
              }`}
            >
              <span className="text-2xl flex-shrink-0">{m.emoji}</span>
              <div>
                <p className={`text-sm font-bold ${mode === m.id ? m.color : "text-warm-white"}`}>{m.label}</p>
                <p className="text-xs text-text-muted">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => { if (mode) setStage("session") }}
          disabled={!mode}
          className={`w-full py-4 text-sm font-semibold rounded-2xl transition-all ${
            mode
              ? "btn-primary"
              : "bg-surface border border-border-p text-text-muted cursor-not-allowed"
          }`}
        >
          {mode ? `Start · ${MODES.find((m2) => m2.id === mode)?.label}` : "Choose a mode"}
        </button>
      </div>
    )
  }

  // ── Session ──
  if (stage === "session") {
    const progress = elapsed / totalSeconds

    return (
      <div className="flex-1 flex flex-col items-center px-5 py-6 relative overflow-hidden">
        {/* Atmospheric background */}
        <div
          className={`absolute inset-0 bg-gradient-to-b ${currentMode.gradFrom} ${currentMode.gradVia} to-transparent opacity-60 pointer-events-none`}
        />

        {/* Top bar */}
        <div className="relative w-full flex items-center justify-between mb-4">
          <button
            onClick={() => setPaused((p) => !p)}
            className="text-xs text-text-muted font-medium hover:text-text-secondary transition-colors px-3 py-1.5 rounded-lg border border-border-p"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <span className={`text-xs font-bold uppercase tracking-widest ${currentMode.color}`}>
            {currentMode.label}
          </span>
          <button
            onClick={() => { setPaused(true); setStage("complete") }}
            className="text-xs text-text-muted font-medium hover:text-text-secondary transition-colors"
          >
            Exit
          </button>
        </div>

        {/* Orb visualizer */}
        <div className="relative flex-1 flex items-center justify-center w-full">
          <div
            className="absolute rounded-full border border-purple-core/10 transition-all duration-2000 pointer-events-none"
            style={{
              width: pulse ? 268 : 252,
              height: pulse ? 268 : 252,
            }}
          />
          <div
            className="absolute rounded-full border border-purple-core/15 transition-all duration-1500 pointer-events-none"
            style={{
              width: pulse ? 218 : 208,
              height: pulse ? 218 : 208,
            }}
          />
          <div
            className="absolute rounded-full blur-3xl opacity-40 pointer-events-none transition-all duration-2000"
            style={{
              width: 180,
              height: 180,
              background:
                "radial-gradient(circle, rgba(155,93,229,0.5) 0%, transparent 70%)",
            }}
          />
          <div
            className={`relative rounded-full ${currentMode.bg} border ${currentMode.border} flex items-center justify-center transition-all duration-1000`}
            style={{
              width: pulse ? 164 : 156,
              height: pulse ? 164 : 156,
            }}
          >
            <span className="text-5xl">{currentMode.emoji}</span>
          </div>
        </div>

        {/* Guided prompt */}
        <div className="relative h-7 flex items-center justify-center mb-3">
          {prompt && (
            <p className="text-sm text-text-muted italic text-center animate-fade-up">{prompt}</p>
          )}
        </div>

        {/* Track info */}
        <div className="relative w-full text-center mb-4">
          <p className="text-base font-bold text-warm-white">{currentTrack.title}</p>
          <p className="text-xs text-text-muted">{currentTrack.artist}</p>
        </div>

        {/* Progress bar */}
        <div className="relative w-full mb-5">
          <div className="flex justify-between text-xs text-text-muted font-mono-data mb-1.5">
            <span>{fmt(elapsed)}</span>
            <span>{fmt(totalSeconds)}</span>
          </div>
          <div className="h-1 bg-border-p rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress * 100}%`,
                background:
                  "linear-gradient(to right, var(--color-purple-primary, #7B5EA7), var(--color-lavender-bright, #B77AF2))",
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="relative flex items-center gap-5">
          <button
            onClick={() => setTrackIdx((i) => Math.max(0, i - 1))}
            className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
              <path d="M4 4v12M16 4L8 10l8 6V4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            onClick={() => setPaused((p) => !p)}
            className="w-14 h-14 rounded-full bg-purple-core flex items-center justify-center shadow-lg hover:bg-purple-primary transition-colors"
          >
            {paused ? (
              <svg className="w-6 h-6 text-warm-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-warm-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zm6.5 0a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setTrackIdx((i) => i + 1)}
            className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
              <path d="M16 4v12M4 4l8 6-8 6V4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // ── Complete ──
  return (
    <div className="flex-1 flex flex-col px-5 py-5 overflow-y-auto pb-28">
      <div className="flex-1 flex flex-col items-center justify-center text-center py-6 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-purple-core/10 border border-purple-core/25 flex items-center justify-center mb-6 text-3xl">
          🎵
        </div>

        <h2 className="text-2xl font-bold text-warm-white mb-2">{"That's your reset."}</h2>
        <p className="text-sm text-text-muted mb-8 leading-relaxed">How do you feel now?</p>

        <div className="w-full space-y-2 mb-6">
          {FEELINGS.map((f) => (
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
            {postFeeling === "Still overwhelmed" && (
              <div className="card-base p-4 mb-2 text-left">
                <p className="text-sm text-text-secondary mb-3">
                  Maybe getting it out would help.
                </p>
                <button
                  onClick={() => onNav("dump-bag")}
                  className="w-full btn-primary py-3 text-sm font-semibold rounded-2xl"
                >
                  Open Dump Bag →
                </button>
              </div>
            )}
            {postFeeling === "More energized" && (
              <div className="card-base p-4 mb-2 text-left">
                <p className="text-sm text-text-secondary mb-3">
                  Great momentum. Use it — clear your task list.
                </p>
                <button
                  onClick={() => onNav("priority-reset")}
                  className="w-full btn-ghost py-3 text-sm font-semibold rounded-2xl"
                >
                  Priority Reset →
                </button>
              </div>
            )}
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
