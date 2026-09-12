/**
 * msiClassification.js
 *
 * Backend Single Source of Truth for Mind Stress Index (MSI) v3 Classifications.
 * Reference: MSI V3 Instrument Design, Scoring Logic, and Scientific Credibility Report
 *
 * Scoring Matrix (Composite Score 0–100):
 *   0–20   -> Healthy
 *   21–40  -> Mild
 *   41–60  -> Moderate
 *   61–80  -> High
 *   81–100 -> Burnout
 */

const MSI_CATEGORIES = {
  HEALTHY: "Healthy",
  MILD: "Mild",
  MODERATE: "Moderate",
  HIGH: "High",
  BURNOUT: "Burnout",
}

/**
 * Returns the correct MSI v3 category label based on the 0-100 composite score.
 * @param {number|null|undefined} msi
 * @returns {"Healthy"|"Mild"|"Moderate"|"High"|"Burnout"}
 */
function getCategory(msi) {
  const score = Math.round(Number(msi) || 0)
  if (score <= 20) return MSI_CATEGORIES.HEALTHY
  if (score <= 40) return MSI_CATEGORIES.MILD
  if (score <= 60) return MSI_CATEGORIES.MODERATE
  if (score <= 80) return MSI_CATEGORIES.HIGH
  return MSI_CATEGORIES.BURNOUT
}

/**
 * Map MSI to Stress State for HR Analytics / Workforce Reports
 * Healthy & Mild (0-40) -> "normal"
 * Moderate (41-60) -> "acute"
 * High (61-80) -> "persistent"
 * Burnout (81-100) -> "burnout-risk"
 * @param {number|null|undefined} msi
 * @returns {"normal"|"acute"|"persistent"|"burnout-risk"}
 */
function mapMsiToStressState(msi) {
  if (msi == null) return "normal"
  const score = Math.round(Number(msi) || 0)
  if (score <= 40) return "normal"
  if (score <= 60) return "acute"
  if (score <= 80) return "persistent"
  return "burnout-risk"
}

module.exports = {
  MSI_CATEGORIES,
  getCategory,
  mapMsiToStressState,
}
