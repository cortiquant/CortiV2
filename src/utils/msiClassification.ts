/**
 * msiClassification.ts
 *
 * Single Source of Truth for Mind Stress Index (MSI) v3 Classifications.
 * Reference: MSI V3 Instrument Design, Scoring Logic, and Scientific Credibility Report
 *
 * Scoring Matrix (Composite Score 0–100):
 *   0–20   -> Healthy
 *   21–40  -> Mild
 *   41–60  -> Moderate
 *   61–80  -> High
 *   81–100 -> Burnout
 */

export type MSIBandLabel = "Healthy" | "Mild" | "Moderate" | "High" | "Burnout"

export interface MSIBandInfo {
  label: MSIBandLabel
  color: string
  bg: string
  border: string
  dot: string
  hex: string
  min: number
  max: number
  headline: string
  subtext: string
  description: string
  symptoms: string[]
}

export const MSI_BANDS: Record<MSIBandLabel, MSIBandInfo> = {
  Healthy: {
    label: "Healthy",
    color: "text-c-success",
    bg: "bg-c-success/10",
    border: "border-c-success/25",
    dot: "bg-c-success",
    hex: "#4ade80",
    min: 0,
    max: 20,
    headline: "You're in a good place today.",
    subtext: "Keep doing what you're doing — your recovery is working.",
    description:
      "Your MSI sits in the Healthy range (0–20). This indicates low psychological strain across mood, stress load, recovery, and physical wellbeing. You're managing demands well.",
    symptoms: [
      "Feeling generally calm and in control",
      "Recovering well from challenges",
      "Good sleep and physical energy",
    ],
  },
  Mild: {
    label: "Mild",
    color: "text-c-info",
    bg: "bg-c-info/10",
    border: "border-c-info/25",
    dot: "bg-c-info",
    hex: "#60a5fa",
    min: 21,
    max: 40,
    headline: "Your mental load is gently building.",
    subtext: "Small recovery habits now can keep this from rising.",
    description:
      "Your MSI is in the Mild range (21–40). You may be experiencing some pressure but it's within a manageable range. Small, consistent recovery habits can keep this from rising.",
    symptoms: [
      "Occasional tension or low mood",
      "Slightly reduced ability to switch off",
      "Minor physical signs like tiredness",
    ],
  },
  Moderate: {
    label: "Moderate",
    color: "text-lavender-soft",
    bg: "bg-purple-core/10",
    border: "border-purple-core/25",
    dot: "bg-lavender-soft",
    hex: "#a78bfa",
    min: 41,
    max: 60,
    headline: "Your stress is running a little warm.",
    subtext: "Even a few quiet minutes today can help.",
    description:
      "Your MSI is in the Moderate range (41–60). Stress is noticeable and may be affecting your focus, mood, or physical state. Active recovery now can prevent escalation.",
    symptoms: [
      "Difficulty concentrating or feeling overwhelmed",
      "Reduced patience or increased irritability",
      "Physical tension, disrupted sleep",
    ],
  },
  High: {
    label: "High",
    color: "text-c-warning",
    bg: "bg-c-warning/10",
    border: "border-c-warning/25",
    dot: "bg-c-warning",
    hex: "#f59e0b",
    min: 61,
    max: 80,
    headline: "Your mental load is quietly building.",
    subtext: "Give yourself permission to slow down, just for a little while.",
    description:
      "Your MSI is in the High range (61–80). This level of stress can affect performance, relationships, and physical health if sustained. Please take steps to recover today.",
    symptoms: [
      "Persistent worry, low mood or burnout feelings",
      "Difficulty completing tasks",
      "Physical exhaustion, poor sleep quality",
    ],
  },
  Burnout: {
    label: "Burnout",
    color: "text-c-critical",
    bg: "bg-c-critical/10",
    border: "border-c-critical/25",
    dot: "bg-c-critical",
    hex: "#f87171",
    min: 81,
    max: 100,
    headline: "Your stress needs attention today.",
    subtext: "You don't have to carry this alone. Let's take it one step at a time.",
    description:
      "Your MSI is in the Burnout range (81–100). This is a significant signal. You may be experiencing chronic stress that's depleting your capacity to cope. Please seek support.",
    symptoms: [
      "Complete emotional and physical exhaustion",
      "Detachment, cynicism, or numbness",
      "Inability to function normally at work or home",
    ],
  },
}

/**
 * Returns the correct MSI v3 category label based on the 0-100 composite score.
 * 0–20   -> "Healthy"
 * 21–40  -> "Mild"
 * 41–60  -> "Moderate"
 * 61–80  -> "High"
 * 81–100 -> "Burnout"
 */
export function getMSICategory(msi: number | null | undefined): MSIBandLabel {
  const score = Math.round(Number(msi) || 0)
  if (score <= 20) return "Healthy"
  if (score <= 40) return "Mild"
  if (score <= 60) return "Moderate"
  if (score <= 80) return "High"
  return "Burnout"
}

/**
 * Returns complete styling, labels, and text metadata for a given MSI score.
 */
export function getMSIBand(msi: number | null | undefined): MSIBandInfo {
  const category = getMSICategory(msi)
  return MSI_BANDS[category]
}

/**
 * MSI v3 Standard Subscale and Total calculation for 16 items.
 * Answers array contains 16 values (0-4):
 *   M1: emoji scale (0 to 4), reverse-coded so 0 (great mood) -> 1, 4 (very bad) -> 5.
 *   M2-M4, S1-S4, R1-R4, PH1-PH4: (0 to 4) -> (1 to 5).
 * Formula: ((Total Raw - 16) / 64) * 100
 */
export function calcMSIv3(answers: (number | null)[]): number {
  const filled = answers.filter((a): a is number => a !== null && typeof a === "number")
  if (filled.length === 0) return 30

  // If complete 16 items
  if (answers.length === 16 && filled.length === 16) {
    let totalRaw = 0
    for (let i = 0; i < 16; i++) {
      const val = answers[i]! // 0 to 4
      if (i === 0) {
        // M1 reverse-coded: val 0 (Great/Happy) -> 1, val 4 (Very bad) -> 5
        const coded = val + 1
        totalRaw += coded
      } else {
        // Uni-directional 1-5
        const coded = val + 1
        totalRaw += coded
      }
    }
    // Total raw range is 16–80
    const composite = ((totalRaw - 16) / 64) * 100
    return Math.max(0, Math.min(100, Math.round(composite)))
  }

  // Fallback for partial answers: average percentage
  const avg = filled.reduce((s, v) => s + v, 0) / filled.length
  return Math.max(0, Math.min(100, Math.round(avg * 25)))
}
