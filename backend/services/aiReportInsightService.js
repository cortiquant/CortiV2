/**
 * aiReportInsightService.js
 *
 * Generates AI-powered executive workforce insights based strictly on aggregated,
 * anonymized metrics. Follows non-clinical, observational safety guidelines.
 */

function buildReportInsightPrompt(reportMetrics) {
  return `You are CortiQuant's Executive Workforce Wellbeing Intelligence AI.
Your role is to analyze strictly AGGREGATED organizational stress metrics and produce an executive-ready insight summary for HR leadership.

STRICT SAFETY AND LANGUAGE GUIDELINES:
1. NEVER diagnose employees or refer to clinical conditions (e.g. depression, anxiety, disorders).
2. NEVER claim causality. Use observational phrases like "observed pattern", "associated with", "correlates with", "pattern suggests".
3. NEVER make medical advice or prescriptive health interventions.
4. Keep insights professional, focused on workplace workload, team recovery, and supportive organizational habits.
5. Emphasize constructive, positive steps alongside areas needing attention.

AGGREGATED ORGANIZATIONAL METRICS:
${JSON.stringify(reportMetrics, null, 2)}

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this structure (no conversational text or markdown codeblocks outside JSON):
{
  "executiveSummary": "A concise 2-3 sentence executive overview summarizing the overall workforce state and notable changes for this period.",
  "keyObservations": [
    "Observation 1 (highlighting participation, stress shifts, or general recovery patterns)",
    "Observation 2",
    "Observation 3"
  ],
  "departmentInsights": [
    {
      "departmentId": "Department ID or DEPT-...",
      "insight": "1-2 sentences summarizing observed dynamics in this department."
    }
  ],
  "interventionInsights": [
    {
      "intervention": "Name of intervention",
      "insight": "1-2 sentences on observed pre/post response and employee engagement."
    }
  ],
  "recommendedActions": [
    "Actionable organizational or scheduling recommendation 1",
    "Actionable recommendation 2",
    "Actionable recommendation 3"
  ]
}`
}

function parseAndValidateReportInsight(text) {
  if (!text || typeof text !== "string") return null
  try {
    let clean = text.trim()
    if (clean.startsWith("```json")) clean = clean.slice(7)
    if (clean.startsWith("```")) clean = clean.slice(3)
    if (clean.endsWith("```")) clean = clean.slice(0, -3)
    clean = clean.trim()

    const obj = JSON.parse(clean)
    if (!obj || typeof obj !== "object") return null
    if (!obj.executiveSummary || typeof obj.executiveSummary !== "string") return null
    if (!Array.isArray(obj.keyObservations)) return null
    if (!Array.isArray(obj.recommendedActions)) return null

    return {
      executiveSummary: String(obj.executiveSummary).trim(),
      keyObservations: obj.keyObservations.map(String),
      departmentInsights: Array.isArray(obj.departmentInsights) ? obj.departmentInsights : [],
      interventionInsights: Array.isArray(obj.interventionInsights) ? obj.interventionInsights : [],
      recommendedActions: obj.recommendedActions.map(String),
    }
  } catch (err) {
    console.warn("[AI-REPORT-INSIGHT] JSON parse error:", err.message)
    return null
  }
}

function getSafeReportFallback(metrics) {
  const currentMSI = metrics.overallMSI ?? 50
  const prevMSI = metrics.previousMSI
  const change = metrics.change != null ? metrics.change : (prevMSI != null ? currentMSI - prevMSI : 0)
  const participation = metrics.participationRate ?? 0

  const summary = currentMSI <= 40
    ? `The workforce maintained a healthy overall stress profile (MSI ${currentMSI}) with steady check-in participation (${participation}%). Observed indicators suggest balanced recovery and manageable workload demands across active teams.`
    : currentMSI <= 60
    ? `Workforce stress sits in the acute zone (MSI ${currentMSI}, ${change >= 0 ? "+" : ""}${change} change). Patterns indicate localized workload pressure across specific departments while overall recovery participation remains active at ${participation}%.`
    : `Overall organizational stress is elevated (MSI ${currentMSI}). Aggregated data indicates sustained operational and priority strain, suggesting that targeted recovery support and workload pacing may be beneficial.`

  const keyObservations = [
    `Check-in completion rate reached ${participation}% across active teams for this reporting period.`,
    change < 0
      ? `Overall Mean Stress Index improved by ${Math.abs(change)} points compared to the previous period.`
      : change > 0
      ? `Mean Stress Index rose by ${change} points, reflecting compressed project timelines or seasonal demand.`
      : `Mean Stress Index remained stable across reporting intervals.`,
    `Recovery engagement and Reset Lab sessions demonstrate consistent utilization among employees navigating acute strain.`,
  ]

  const recommendedActions = [
    "Encourage managers to respect post-workday communication boundaries to support recovery.",
    "Promote scheduled midday Reset Labs (Breathing, Musical, and Priority Resets) across teams with elevated strain.",
    "Review task distribution in departments showing persistent elevation over consecutive weekly periods.",
  ]

  const departmentInsights = (metrics.departments || []).map((d) => ({
    departmentId: d.departmentId,
    insight: `${d.name} recorded an MSI of ${d.currentMSI != null ? d.currentMSI : "—"} (${d.state || "normal"}), reflecting ${d.changePercent != null ? (d.changePercent > 0 ? "+" : "") + d.changePercent + "%" : "steady"} trend.`,
  }))

  const interventionInsights = (metrics.interventions || []).map((inv) => ({
    intervention: inv.name,
    insight: `${inv.name} logged ${inv.sessions || 0} sessions with an average observational change of ${inv.delta != null ? inv.delta : "—"} MSI points.`,
  }))

  return {
    executiveSummary: summary,
    keyObservations,
    departmentInsights,
    interventionInsights,
    recommendedActions,
  }
}

async function generateReportInsights(reportMetrics) {
  const apiKey =
    process.env.GOOGLE_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.log("[AI-REPORT-INSIGHT] No AI key configured. Using safe algorithmic fallback.")
    return getSafeReportFallback(reportMetrics)
  }

  try {
    const prompt = buildReportInsightPrompt(reportMetrics)
    let aiJsonText = ""

    if (
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      (apiKey && (apiKey.startsWith("AIza") || apiKey.startsWith("AQ.")))
    ) {
      const rawModel = process.env.GOOGLE_MODEL || process.env.AI_MODEL || "gemini-2.5-flash"
      const model = rawModel.replace(/^models\//, "")
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      })

      if (!res.ok) {
        throw new Error(`Gemini API error ${res.status}`)
      }

      const data = await res.json()
      aiJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
    } else {
      const endpoint = process.env.AI_ENDPOINT || "https://api.openai.com/v1/chat/completions"
      const model = process.env.AI_MODEL || "gpt-4o-mini"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are an AI that strictly returns valid JSON with no conversational preamble." },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      })

      if (!res.ok) throw new Error(`OpenAI API error ${res.status}`)
      const data = await res.json()
      aiJsonText = data?.choices?.[0]?.message?.content || ""
    }

    const parsed = parseAndValidateReportInsight(aiJsonText)
    if (parsed) {
      return parsed
    }
    return getSafeReportFallback(reportMetrics)
  } catch (err) {
    console.warn("[AI-REPORT-INSIGHT] Provider call failed:", err.message)
    return getSafeReportFallback(reportMetrics)
  }
}

module.exports = {
  generateReportInsights,
  getSafeReportFallback,
}
