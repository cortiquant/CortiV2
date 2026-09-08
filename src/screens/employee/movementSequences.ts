export type NeedId = "stiff" | "lowEnergy" | "tense" | "mentallyStuck" | "unwind"

export type MoveSVG =
  | "neck"
  | "shoulder-rolls"
  | "rotation"
  | "side-stretch"
  | "reach"
  | "march"
  | "wrist"
  | "breathing"

export interface Movement {
  id: string
  name: string
  instruction: string
  duration: number
  cue?: string
  emoji?: string
  svg: MoveSVG
}

export interface BodyNeedOption {
  id: NeedId
  label: string
  desc: string
  emoji: string
  color: string
  bg: string
  border: string
}

export const BODY_NEEDS: BodyNeedOption[] = [
  {
    id: "stiff",
    label: "Stiff",
    desc: "My body feels tight from sitting.",
    emoji: "🪑",
    color: "text-c-warning",
    bg: "bg-c-warning/10",
    border: "border-c-warning/25",
  },
  {
    id: "lowEnergy",
    label: "Low Energy",
    desc: "I need a little movement.",
    emoji: "🔋",
    color: "text-c-info",
    bg: "bg-c-info/10",
    border: "border-c-info/25",
  },
  {
    id: "tense",
    label: "Tense",
    desc: "I feel tension in my body.",
    emoji: "😣",
    color: "text-c-critical",
    bg: "bg-c-critical/10",
    border: "border-c-critical/25",
  },
  {
    id: "mentallyStuck",
    label: "Mentally Stuck",
    desc: "I've been sitting with the same thoughts.",
    emoji: "🧠",
    color: "text-lavender-soft",
    bg: "bg-purple-core/10",
    border: "border-purple-core/25",
  },
  {
    id: "unwind",
    label: "Unwind",
    desc: "I just want to loosen up.",
    emoji: "🌿",
    color: "text-c-success",
    bg: "bg-c-success/10",
    border: "border-c-success/25",
  },
]

export const movementSequences: Record<NeedId, Movement[]> = {
  stiff: [
    {
      id: "stiff-1",
      name: "Neck Rolls",
      instruction: "Slowly roll your neck from one side to the other. Keep the movement comfortable.",
      duration: 30,
      cue: "Release tension in your cervical spine",
      emoji: "🔄",
      svg: "neck",
    },
    {
      id: "stiff-2",
      name: "Shoulder Rolls",
      instruction: "Roll your shoulders slowly backward, then forward.",
      duration: 30,
      cue: "Open up your chest and upper back",
      emoji: "💪",
      svg: "shoulder-rolls",
    },
    {
      id: "stiff-3",
      name: "Seated Spinal Twist",
      instruction: "Sit tall and gently rotate your upper body from side to side.",
      duration: 30,
      cue: "Gentle mobility for your thoracic spine",
      emoji: "🌀",
      svg: "rotation",
    },
    {
      id: "stiff-4",
      name: "Standing Side Stretch",
      instruction: "Reach one arm overhead and gently lean to the opposite side.",
      duration: 30,
      cue: "Create length through your ribcage",
      emoji: "✨",
      svg: "side-stretch",
    },
    {
      id: "stiff-5",
      name: "Gentle Forward Fold",
      instruction: "Let your upper body soften forward. Keep your knees relaxed.",
      duration: 30,
      cue: "Let gravity decompress your lower back",
      emoji: "🌱",
      svg: "reach",
    },
  ],

  lowEnergy: [
    {
      id: "low-1",
      name: "Gentle March",
      instruction: "March in place while lifting your knees comfortably.",
      duration: 30,
      cue: "Awaken circulation from your feet up",
      emoji: "🚶",
      svg: "march",
    },
    {
      id: "low-2",
      name: "Arm Swings",
      instruction: "Swing your arms gently forward and backward.",
      duration: 30,
      cue: "Encourage natural blood flow and warmth",
      emoji: "👐",
      svg: "shoulder-rolls",
    },
    {
      id: "low-3",
      name: "Calf Raises",
      instruction: "Rise onto your toes and slowly lower back down.",
      duration: 30,
      cue: "Pump oxygenated blood back to your heart",
      emoji: "🦶",
      svg: "march",
    },
    {
      id: "low-4",
      name: "Reach & Stretch",
      instruction: "Reach both arms overhead, then release.",
      duration: 30,
      cue: "Expand your lungs and awaken your torso",
      emoji: "🙌",
      svg: "reach",
    },
    {
      id: "low-5",
      name: "Side Steps",
      instruction: "Take gentle steps from side to side.",
      duration: 30,
      cue: "Shift weight smoothly and rhythmically",
      emoji: "↔️",
      svg: "side-stretch",
    },
  ],

  tense: [
    {
      id: "tense-1",
      name: "Shoulder Shrug & Release",
      instruction: "Lift your shoulders toward your ears, hold briefly, then let them drop.",
      duration: 30,
      cue: "Notice the difference between tension and release",
      emoji: "🔻",
      svg: "shoulder-rolls",
    },
    {
      id: "tense-2",
      name: "Fist Clench & Release",
      instruction: "Gently make fists, hold for a moment, then completely relax your hands.",
      duration: 30,
      cue: "Let your fingers and wrists soften completely",
      emoji: "✊",
      svg: "wrist",
    },
    {
      id: "tense-3",
      name: "Neck Side Stretch",
      instruction: "Let your ear move gently toward one shoulder. Switch sides.",
      duration: 30,
      cue: "Lengthen without forcing",
      emoji: "👂",
      svg: "neck",
    },
    {
      id: "tense-4",
      name: "Chest Opener",
      instruction: "Bring your shoulders gently back and open your chest.",
      duration: 30,
      cue: "Counterbalance hunched posture",
      emoji: "🫁",
      svg: "breathing",
    },
    {
      id: "tense-5",
      name: "Shake It Out",
      instruction: "Loosen your hands, arms and shoulders with a gentle shake.",
      duration: 30,
      cue: "Discharge lingering physical tension",
      emoji: "🌊",
      svg: "wrist",
    },
  ],

  mentallyStuck: [
    {
      id: "stuck-1",
      name: "Alternating March",
      instruction: "March slowly while alternating your left and right sides.",
      duration: 30,
      cue: "Cross-lateral movement connects both brain hemispheres",
      emoji: "👣",
      svg: "march",
    },
    {
      id: "stuck-2",
      name: "Cross-Body Reach",
      instruction: "Reach your right hand toward your left side, then switch.",
      duration: 30,
      cue: "Break linear focus and reset cognitive flow",
      emoji: "✋",
      svg: "side-stretch",
    },
    {
      id: "stuck-3",
      name: "Shoulder Tap",
      instruction: "Bring each hand across to gently tap the opposite shoulder.",
      duration: 30,
      cue: "Grounding tactile touch to anchor attention",
      emoji: "🤝",
      svg: "rotation",
    },
    {
      id: "stuck-4",
      name: "Slow Side-to-Side Sway",
      instruction: "Shift your weight gently from one side to the other.",
      duration: 30,
      cue: "Rhythmic swaying calms the vestibular system",
      emoji: "🌾",
      svg: "side-stretch",
    },
    {
      id: "stuck-5",
      name: "Full Body Reach",
      instruction: "Reach upward, take a comfortable breath, then slowly release.",
      duration: 30,
      cue: "Full reset breath to clear mental fog",
      emoji: "🌌",
      svg: "reach",
    },
  ],

  unwind: [
    {
      id: "unwind-1",
      name: "Shoulder Drop",
      instruction: "Raise your shoulders gently, then let them fall.",
      duration: 30,
      cue: "Surrender accumulated weight",
      emoji: "🍂",
      svg: "shoulder-rolls",
    },
    {
      id: "unwind-2",
      name: "Neck Release",
      instruction: "Let your head gently move from side to side.",
      duration: 30,
      cue: "Find ease in slow, unhurried motion",
      emoji: "🍃",
      svg: "neck",
    },
    {
      id: "unwind-3",
      name: "Side Stretch",
      instruction: "Reach overhead and gently stretch each side.",
      duration: 30,
      cue: "Open lateral breathing pathways",
      emoji: "🌿",
      svg: "side-stretch",
    },
    {
      id: "unwind-4",
      name: "Forward Fold",
      instruction: "Let your upper body soften forward comfortably.",
      duration: 30,
      cue: "Quiet your nervous system",
      emoji: "🧘",
      svg: "reach",
    },
    {
      id: "unwind-5",
      name: "Gentle March & Breathe",
      instruction: "Move slowly while keeping your breathing relaxed.",
      duration: 30,
      cue: "Smooth integration of breath and light movement",
      emoji: "🌸",
      svg: "breathing",
    },
  ],
}
