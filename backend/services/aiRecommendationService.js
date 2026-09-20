/**
 * aiRecommendationService.js
 *
 * Pluggable AI Service for Root Cause Analysis and Personalized Recommendations.
 * Integrates with AI providers (Gemini / OpenAI compatible) using environment variables:
 *   AI_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY
 *   AI_MODEL (defaults to "gemini-1.5-flash" or "gpt-4o-mini")
 *
 * Strictly adheres to non-clinical phrasing guidelines and provides deterministic fallback
 * if the AI service is unconfigured, times out, or returns invalid data.
 */

// ── Deterministic safe fallback generator ──────────────────────────────────────

function getSafeFallback({ msi, rootCause, cause, relevantResponses, employeeContext }) {
  const normalizedCause = (rootCause || "Workload").trim()
  const dept = employeeContext?.department ? ` in ${employeeContext.department}` : ""

  const contributingMap = {
    "Workload": [
      "High workload volume and compressed deadlines",
      "Difficulty mentally disconnecting after working hours",
      "Frequent task switching and cognitive fatigue",
    ],
    "People": [
      "Workplace interpersonal friction or communication gaps",
      "Emotional drain following difficult interactions",
      "Hesitation around setting firm communication boundaries",
    ],
    "Performance": [
      "High internal and external pressure to meet targets",
      "Worry about making visible mistakes or falling behind",
      "Carrying professional expectations into personal downtime",
    ],
    "Future": [
      "Uncertainty around career direction or next progression steps",
      "Difficulty focusing on immediate tasks due to long-term unknowns",
      "Feeling limited clarity regarding professional growth",
    ],
    "Personal": [
      "Competing personal and family responsibilities",
      "Personal concerns encroaching on work focus",
      "Depleted recovery window outside of working hours",
    ],
    "Sleep & Energy": [
      "Disrupted sleep rhythm or poor sleep quality",
      "Persistent daytime fatigue even after rest periods",
      "Elevated evening nervous system stimulation",
    ],
  }

  const recommendationsMap = {
    "Workload": [
      {
        title: "Prioritize top 3 tasks for tomorrow",
        description: "Select 3 non-negotiable items to tackle first. Mentally shelf remaining tasks until the next work cycle.",
        type: "real_world",
        priority: "high",
        reason: "Reduces cognitive overload from attempting to keep all open responsibilities active in working memory.",
        cta: null,
        ctaText: null,
        icon: "📋",
      },
      {
        title: "Offload thoughts with Digital Dump Bag",
        description: "Spend 3 minutes writing down unfinished tasks and racing thoughts so they stop circulating.",
        type: "cortiquant_feature",
        priority: "high",
        reason: "Externalizing open loops helps signal your brain that items are recorded, promoting work shutdown.",
        cta: "dump-bag",
        ctaText: "Open Dump Bag",
        icon: "🗑️",
      },
      {
        title: "Explore a Reset Lab session",
        description: "Engage in a 5-minute guided acoustic or breathing reset to down-regulate workday adrenaline.",
        type: "cortiquant_feature",
        priority: "medium",
        reason: "Assists the autonomic nervous system in shifting from high alert into recovery mode.",
        cta: "reset-list",
        ctaText: "Explore Reset Labs",
        icon: "🧪",
      },
      {
        title: "Schedule a workload calibration check-in",
        description: "If timeline constraints continue to exceed daily capacity, sync with your manager to align expectations.",
        type: "real_world",
        priority: "medium",
        reason: "Proactively managing deliverables prevents prolonged chronic burnout.",
        cta: null,
        ctaText: null,
        icon: "🤝",
      },
    ],
    "People": [
      {
        title: "Talk to a Human Listener",
        description: "Connect with a trained listener for a confidential, non-judgmental space to unpack the situation.",
        type: "cortiquant_feature",
        priority: "high",
        reason: "Vocalizing interpersonal tension helps release emotional buildup and clarify next steps.",
        cta: "listener-connect",
        ctaText: "Talk to a Listener",
        icon: "💬",
      },
      {
        title: "Identify one communication boundary",
        description: "Establish a clear boundary around communication channels or response hours to protect your energy.",
        type: "real_world",
        priority: "high",
        reason: "Creating explicit space prevents difficult interactions from draining your entire workday.",
        cta: null,
        ctaText: null,
        icon: "🛡️",
      },
      {
        title: "Externalize the interaction in Dump Bag",
        description: "Draft an uncensored account of what happened to process emotions before engaging in future discussions.",
        type: "cortiquant_feature",
        priority: "medium",
        reason: "Separates factual observations from heightened emotional reactions.",
        cta: "dump-bag",
        ctaText: "Open Dump Bag",
        icon: "🗑️",
      },
      {
        title: "Take a structured nervous system pause",
        description: "Follow a short reset to release physical tension held in your shoulders and jaw after conflict.",
        type: "cortiquant_feature",
        priority: "medium",
        reason: "Down-regulates fight-or-flight physiological activation triggered by interpersonal conflict.",
        cta: "reset-list",
        ctaText: "Explore Reset Labs",
        icon: "🌱",
      },
    ],
    "Performance": [
      {
        title: "Break goals into bite-sized milestones",
        description: "Divide your main deliverable into 25-minute manageable units to lower perfectionism friction.",
        type: "real_world",
        priority: "high",
        reason: "Taking small concrete steps rebuilds momentum and diminishes fear of failure.",
        cta: null,
        ctaText: null,
        icon: "🎯",
      },
      {
        title: "Run a Priority Reset",
        description: "Follow a quick interactive exercise to separate critical tasks from anxiety-driven busywork.",
        type: "cortiquant_feature",
        priority: "high",
        reason: "Helps anchor your focus on high-impact items rather than diffuse worry.",
        cta: "priority-reset",
        ctaText: "Start Priority Reset",
        icon: "⚡",
      },
      {
        title: "Unload self-critical worries in Dump Bag",
        description: "Write out what you fear might happen if an outcome is imperfect, then place it aside.",
        type: "cortiquant_feature",
        priority: "medium",
        reason: "Disrupts repetitive rumination by recording fears in a secure private space.",
        cta: "dump-bag",
        ctaText: "Open Dump Bag",
        icon: "🗑️",
      },
      {
        title: "Normalize progress over perfection",
        description: "Remind yourself that unexpected obstacles are normal iteration steps rather than reflections of capability.",
        type: "real_world",
        priority: "low",
        reason: "Reduces performance anxiety and excessive self-monitoring.",
        cta: null,
        ctaText: null,
        icon: "💡",
      },
    ],
    "Future": [
      {
        title: "Map immediate controllable next steps",
        description: "List what is directly within your sphere of influence today versus future factors beyond your control.",
        type: "real_world",
        priority: "high",
        reason: "Anchors attention back to actionable progress and reduces open-ended dread.",
        cta: null,
        ctaText: null,
        icon: "🔭",
      },
      {
        title: "Clarify career reflections in Dump Bag",
        description: "Jot down your questions, goals, and recurring career concerns to see patterns clearly.",
        type: "cortiquant_feature",
        priority: "medium",
        reason: "Structured journaling transforms vague anxiety into tangible discussion points.",
        cta: "dump-bag",
        ctaText: "Open Dump Bag",
        icon: "🗑️",
      },
      {
        title: "Explore Reset Labs for grounding",
        description: "Engage in a guided presence session to quiet anxious future projections.",
        type: "cortiquant_feature",
        priority: "medium",
        reason: "Brings physiological awareness back to the present moment.",
        cta: "reset-list",
        ctaText: "Explore Reset Labs",
        icon: "🧪",
      },
      {
        title: "Connect with a Human Listener",
        description: "Talk through crossroads and career uncertainty with an objective, supportive human listener.",
        type: "cortiquant_feature",
        priority: "low",
        reason: "Externalizing thoughts aloud often reveals previously overlooked clarity.",
        cta: "listener-connect",
        ctaText: "Talk to a Listener",
        icon: "💬",
      },
    ],
    "Personal": [
      {
        title: "Connect with a Human Listener",
        description: "When personal concerns become heavy, speaking to a supportive listener provides immediate relief.",
        type: "cortiquant_feature",
        priority: "high",
        reason: "Sharing what you are navigating eases the emotional weight of carrying responsibilities alone.",
        cta: "listener-connect",
        ctaText: "Talk to a Listener",
        icon: "🤝",
      },
      {
        title: "Offload worries into Dump Bag",
        description: "Write out what is consuming mental space so work hours are not overwhelmed by personal stress.",
        type: "cortiquant_feature",
        priority: "high",
        reason: "Creates a dedicated mental compartment so you can function with greater calm.",
        cta: "dump-bag",
        ctaText: "Open Dump Bag",
        icon: "🗑️",
      },
      {
        title: "Temporarily reduce non-essential commitments",
        description: "Give yourself permission to decline or defer optional obligations during high-stress weeks.",
        type: "real_world",
        priority: "medium",
        reason: "Preserves vital cognitive bandwidth for core priorities and rest.",
        cta: null,
        ctaText: null,
        icon: "☕",
      },
      {
        title: "Engage in a Relaxation Reset",
        description: "Try a guided progressive physical relaxation module to release tension accumulated through the day.",
        type: "cortiquant_feature",
        priority: "medium",
        reason: "Relieves visceral tightness in the body induced by prolonged personal strain.",
        cta: "relaxation",
        ctaText: "Explore Reset Labs",
        icon: "🌿",
      },
    ],
    "Sleep & Energy": [
      {
        title: "Protect a strict 30-minute pre-sleep wind-down",
        description: "Turn off screens and dim ambient lights 30 minutes before bed to allow melatonin production to initiate.",
        type: "real_world",
        priority: "high",
        reason: "Reduces blue-light optic stimulation that prevents your brain from recognizing sleep time.",
        cta: null,
        ctaText: null,
        icon: "🌙",
      },
      {
        title: "Try the Sleep Wind-down Reset",
        description: "Listen to an acoustic cadence designed to slow heart rate and prepare your nervous system for sleep.",
        type: "cortiquant_feature",
        priority: "high",
        reason: "Facilitates parasympathetic activation needed to transition from vigilance into deep sleep.",
        cta: "sleep-winddown",
        ctaText: "Explore Reset Labs",
        icon: "😴",
      },
      {
        title: "Take a midday Breathing Reset",
        description: "Practice a 3-minute box breathing session to recharge mental energy without relying on stimulants.",
        type: "cortiquant_feature",
        priority: "medium",
        reason: "Oxygenates the blood and stabilizes nervous system rhythm during afternoon energy dips.",
        cta: "breathing-reset",
        ctaText: "Start Breathing Reset",
        icon: "🫧",
      },
      {
        title: "Curtail late caffeine and evening stimulation",
        description: "Limit caffeine consumption past 2:00 PM and avoid intense late-evening work tasks.",
        type: "real_world",
        priority: "medium",
        reason: "Preserves sleep architecture and allows your system to achieve restorative REM cycles.",
        cta: null,
        ctaText: null,
        icon: "☕",
      },
    ],
  }

  const factors = contributingMap[normalizedCause] || contributingMap["Workload"]
  const rawRecs = recommendationsMap[normalizedCause] || recommendationsMap["Workload"]

  const normalizedRecs = rawRecs.slice(0, 4).map((r, i) => {
    const isFeature = r.type === "cortiquant_feature" || r.type === "feature" || Boolean(r.cta)
    let featureKey = null
    let cta = r.cta || "Try this →"

    if (isFeature) {
      const titleLower = (r.title + " " + (r.description || "")).toLowerCase()
      if (titleLower.includes("dump") || titleLower.includes("bag")) {
        featureKey = "dump-bag"
        cta = "Open Dump Bag →"
      } else if (titleLower.includes("listener") || titleLower.includes("talk")) {
        featureKey = "listener"
        cta = "Talk to a Listener →"
      } else if (titleLower.includes("priority")) {
        featureKey = "priority-reset"
        cta = "Start Priority Reset →"
      } else if (titleLower.includes("breath")) {
        featureKey = "breathing-reset"
        cta = "Start Breathing Reset →"
      } else if (titleLower.includes("relax")) {
        featureKey = "relaxation"
        cta = "Explore Relaxation →"
      } else if (titleLower.includes("sleep") || titleLower.includes("wind")) {
        featureKey = "sleep-winddown"
        cta = "Start Wind-down →"
      } else {
        featureKey = "reset-labs"
        cta = "Explore Resets →"
      }
    }

    return {
      id: `rec_fallback_${i}`,
      title: r.title,
      description: r.description,
      type: isFeature ? "feature" : "action",
      featureKey,
      priority: r.priority || "medium",
      reason: r.reason || null,
      cta,
      icon: r.icon || (isFeature ? "✨" : "📋"),
    }
  })

  return {
    summary: `Your responses suggest that ${normalizedCause.toLowerCase()} pressure may be contributing significantly to your elevated stress index (${msi}%)${dept}. Focusing on deliberate micro-recoveries and setting realistic boundaries can help stabilize your energy.`,
    rootCause: normalizedCause,
    contributingFactors: factors,
    recommendations: normalizedRecs,
  }
}

// ── Main AI caller ─────────────────────────────────────────────────────────────

async function generateAnalysisAndRecommendations({
  msi,
  rootCause,
  cause,
  relevantResponses,
  employeeContext,
}) {
  const apiKey =
    process.env.GOOGLE_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY

  // If no AI key configured, seamlessly use the domain-expert fallback
  if (!apiKey) {
    console.log("[AI-SERVICE] No AI_API_KEY/GOOGLE_API_KEY/GEMINI_API_KEY configured. Using expert fallback engine.")
    return getSafeFallback({ msi, rootCause, cause, relevantResponses, employeeContext })
  }

  try {
    const prompt = buildPrompt({ msi, rootCause, cause, relevantResponses, employeeContext })
    let aiJsonText = ""

    if (
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      (apiKey && (apiKey.startsWith("AIza") || apiKey.startsWith("AQ.")))
    ) {
      // Google Gemini API
      aiJsonText = await callGeminiAPI(apiKey, prompt)
    } else {
      // OpenAI-compatible Chat Completions API
      aiJsonText = await callOpenAICompatibleAPI(apiKey, prompt)
    }

    const parsed = parseAndValidateAIResponse(aiJsonText, rootCause)
    if (parsed) {
      console.log(`[AI-SERVICE] Successfully generated AI recommendations for cause: ${rootCause}`)
      return parsed
    }

    console.warn("[AI-SERVICE] AI response validation failed or malformed. Using fallback engine.")
    return getSafeFallback({ msi, rootCause, cause, relevantResponses, employeeContext })
  } catch (err) {
    console.error("[AI-SERVICE] Error calling AI provider:", err.message)
    return getSafeFallback({ msi, rootCause, cause, relevantResponses, employeeContext })
  }
}

// ── Prompt Builder ─────────────────────────────────────────────────────────────

function buildPrompt({ msi, rootCause, cause, relevantResponses, employeeContext }) {
  const cleanResponses = Array.isArray(relevantResponses)
    ? relevantResponses.map((r) => `- ${r.question}: ${r.answer}`).join("\n")
    : "None provided"

  const contextStr = employeeContext
    ? `Department: ${employeeContext.department || "Not specified"}, Designation: ${employeeContext.designation || "Not specified"}, Work Arrangement: ${employeeContext.workArrangement || "Not specified"}, Tenure: ${employeeContext.tenure || "Not specified"}`
    : "Not specified"

  return `You are CortiQuant's workplace stress and recovery specialist AI.
Your role is to analyze an employee's self-reported stress reflections and generate exactly 3 or 4 personalized, actionable recommendations.

CRITICAL GUIDELINES:
1. Empathetic, supportive, and non-alarmist.
2. NEVER diagnose any medical or psychological condition.
3. NEVER say "You have anxiety/depression" or "MSI proves an illness". Use phrasing like "Your responses suggest that [cause] may be contributing...".
4. Do NOT give generic platitudes ("Stay positive", "Exercise more", "Drink water").
5. Recommendations MUST be a balanced mix of:
   - REAL-WORLD ACTIONS (e.g., renegotiating priorities, calendar blocks, communication boundaries).
   - CORTIQUANT FEATURES when logically matching:
     * "Digital Dump Bag" (for mental overload, racing thoughts, unburdening mind before rest).
     * "Human Listener" (for interpersonal conflict, emotional load, feeling unheard, need to talk).
     * "Reset Labs" (for guided recovery: breathing, acoustic sessions, relaxation, wind-down).
6. Explain WHY each recommendation is relevant to their specific responses.

INPUT:
- Mind Stress Index (MSI): ${msi}% (0-100 scale, >40 is elevated)
- Selected Root Cause: ${rootCause}
- Specific Cause: ${cause || rootCause}
- Employee Reflections:
${cleanResponses}
- Operational Context: ${contextStr}

OUTPUT FORMAT:
Return strictly valid JSON with no markdown backticks, matching this exact schema:
{
  "summary": "Short 2-3 sentence personalized summary explaining why their responses suggest this cause contributes to their stress level.",
  "rootCause": "${rootCause}",
  "contributingFactors": [
    "Short bullet 1 (e.g. High workload volume)",
    "Short bullet 2 (e.g. Compressed delivery timelines)",
    "Short bullet 3 (e.g. Difficulty switching off mentally)"
  ],
  "recommendations": [
    {
      "title": "Short actionable recommendation title",
      "description": "Clear 1-2 sentence description of what to do.",
      "type": "real_world | cortiquant_feature",
      "priority": "high | medium | low",
      "reason": "Specific reason why this helps with their reported situation.",
      "cta": "dump-bag | listener-connect | reset-list | null",
      "ctaText": "Open Dump Bag | Talk to a Listener | Explore Reset Labs | null",
      "icon": "Relevant emoji"
    }
  ]
}
Generate exactly 3 or 4 recommendations.`
}

// ── Gemini API Call ────────────────────────────────────────────────────────────

async function callGeminiAPI(apiKey, prompt) {
  const rawModel = process.env.GOOGLE_MODEL || process.env.AI_MODEL || "gemini-2.5-flash"
  // Normalize model name (remove "models/" prefix if present)
  const model = rawModel.replace(/^models\//, "")
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${errText}`)
  }

  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
}

// ── OpenAI-compatible Call ─────────────────────────────────────────────────────

async function callOpenAICompatibleAPI(apiKey, prompt) {
  const model = process.env.AI_MODEL || "gpt-4o-mini"
  const endpoint = process.env.AI_ENDPOINT || "https://api.openai.com/v1/chat/completions"

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
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`AI API error ${res.status}: ${errText}`)
  }

  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ""
}

// ── Parse and Validate ─────────────────────────────────────────────────────────

function parseAndValidateAIResponse(text, expectedCause) {
  if (!text) return null

  try {
    let clean = text.trim()
    if (clean.startsWith("```json")) clean = clean.slice(7)
    if (clean.startsWith("```")) clean = clean.slice(3)
    if (clean.endsWith("```")) clean = clean.slice(0, -3)
    clean = clean.trim()

    const obj = JSON.parse(clean)

    if (!obj || typeof obj !== "object") return null
    if (!obj.summary || typeof obj.summary !== "string") return null
    if (!Array.isArray(obj.contributingFactors) || obj.contributingFactors.length === 0) return null
    if (!Array.isArray(obj.recommendations) || obj.recommendations.length < 3) return null

    // Clean & normalize recommendations
    const normalizedRecs = obj.recommendations.slice(0, 4).map((r, i) => {
      const isFeature = r.type === "cortiquant_feature" || r.type === "feature" || Boolean(r.featureKey)
      const type = isFeature ? "feature" : "action"
      let featureKey = r.featureKey || null
      let cta = r.cta || null
      let ctaText = r.ctaText || null

      if (isFeature) {
        const titleLower = (r.title + " " + (r.description || "")).toLowerCase()
        if (titleLower.includes("dump") || titleLower.includes("bag")) {
          featureKey = "dump-bag"
          cta = "Open Dump Bag →"
          ctaText = "Open Dump Bag →"
        } else if (titleLower.includes("listener") || titleLower.includes("talk") || titleLower.includes("speak")) {
          featureKey = "listener"
          cta = "Talk to a Listener →"
          ctaText = "Talk to a Listener →"
        } else if (titleLower.includes("priority")) {
          featureKey = "priority-reset"
          cta = "Start Priority Reset →"
          ctaText = "Start Priority Reset →"
        } else if (titleLower.includes("breath")) {
          featureKey = "breathing-reset"
          cta = "Start Breathing Reset →"
          ctaText = "Start Breathing Reset →"
        } else if (titleLower.includes("relax")) {
          featureKey = "relaxation"
          cta = "Explore Relaxation →"
          ctaText = "Explore Relaxation →"
        } else if (titleLower.includes("sleep") || titleLower.includes("wind")) {
          featureKey = "sleep-winddown"
          cta = "Start Wind-down →"
          ctaText = "Start Wind-down →"
        } else {
          featureKey = "reset-labs"
          cta = "Explore Resets →"
          ctaText = "Explore Resets →"
        }
      } else {
        featureKey = null
        cta = r.cta || "Try this →"
        ctaText = r.ctaText || "Try this →"
      }

      return {
        id: `rec_${Date.now()}_${i}`,
        title: String(r.title || "Actionable Step"),
        description: String(r.description || ""),
        type,
        featureKey,
        priority: ["high", "medium", "low"].includes(r.priority) ? r.priority : "medium",
        reason: r.reason ? String(r.reason) : null,
        cta,
        ctaText,
        icon: r.icon || (isFeature ? "✨" : "📋"),
      }
    })

    return {
      summary: obj.summary,
      rootCause: obj.rootCause || expectedCause,
      contributingFactors: obj.contributingFactors.map(String).slice(0, 5),
      recommendations: normalizedRecs,
    }
  } catch (err) {
    console.warn("[AI-SERVICE] JSON parse error:", err.message)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DUMP BAG CBT REFLECTION LOGIC
// ─────────────────────────────────────────────────────────────────────────────

function buildDumpBagPrompt(userText) {
  return `You are Cortiquant's CBT-informed reflection assistant.

Your role is to help a user understand what they have written in their private Dump Bag.

Use principles inspired by Cognitive Behavioural Therapy (CBT), especially:
- identifying automatic thoughts
- identifying cognitive patterns/distortions
- separating thoughts from facts
- considering alternative interpretations
- encouraging small practical behavioural steps

You are NOT a therapist, psychologist, doctor, or crisis service.
Do not diagnose mental health conditions.
Do not label the user with a disorder.
Do not claim certainty about the user's thoughts, emotions, or psychological state.

The response should feel human, calm, empathetic and non-judgmental.

Never shame, lecture, or invalidate the user.

Do not simply repeat what the user wrote.
Do not give generic motivational quotes.

Base the response primarily on the user's actual text.

If a cognitive distortion is not clearly present, do not force one.
Use phrases such as 'there may be a pattern of...' or 'one thing worth noticing is...'

Prefer one meaningful pattern over listing multiple CBT distortions.

Recommendations should be practical, small and realistic.

The response should help the user move from:
event → thought → feeling → possible pattern → balanced perspective → small action.

SAFETY INSTRUCTION:
If the user expresses possible self-harm, suicide, intent to hurt themselves/others, or immediate danger:
- Do NOT provide ordinary CBT reframing as if nothing is wrong.
- Respond with supportive safety-focused guidance.
- Encourage contacting emergency services or a trusted person immediately.
- Provide professional crisis support resources (e.g. 988 Suicide & Crisis Lifeline, Crisis Text Line, emergency services).

OUTPUT FORMAT:
Return strictly valid JSON with no markdown backticks, matching this exact schema:
{
  "validation": "Short empathetic acknowledgement (1-3 sentences).",
  "pattern": {
    "title": "Short title for the pattern (e.g. All-or-nothing thinking, High internal pressure, Physical fatigue)",
    "content": "Explain the possible thought pattern in simple, non-judgmental language."
  },
  "differentAngle": {
    "title": "A balanced alternative perspective",
    "content": "Help the user look at the situation differently without dismissing their concern or resorting to toxic positivity."
  },
  "nextStep": {
    "title": "One small thing to try",
    "content": "Give one practical, realistic action the user can take right now."
  }
}

USER PRIVATE DUMP BAG INPUT:
"${userText.replace(/"/g, '\\"')}"`
}

function parseAndValidateDumpBagResponse(aiText) {
  try {
    if (!aiText || typeof aiText !== "string") return null
    let clean = aiText.trim()
    if (clean.startsWith("```json")) clean = clean.slice(7)
    if (clean.startsWith("```")) clean = clean.slice(3)
    if (clean.endsWith("```")) clean = clean.slice(0, -3)
    clean = clean.trim()

    const obj = JSON.parse(clean)
    if (!obj || typeof obj !== "object") return null
    if (!obj.validation || typeof obj.validation !== "string") return null
    if (!obj.pattern || !obj.pattern.title || !obj.pattern.content) return null
    if (!obj.differentAngle || !obj.differentAngle.title || !obj.differentAngle.content) return null
    if (!obj.nextStep || !obj.nextStep.title || !obj.nextStep.content) return null

    return {
      validation: String(obj.validation).trim(),
      pattern: {
        title: String(obj.pattern.title).trim(),
        content: String(obj.pattern.content).trim(),
      },
      differentAngle: {
        title: String(obj.differentAngle.title).trim(),
        content: String(obj.differentAngle.content).trim(),
      },
      nextStep: {
        title: String(obj.nextStep.title).trim(),
        content: String(obj.nextStep.content).trim(),
      },
    }
  } catch (err) {
    console.warn("[DUMP-BAG-AI] JSON parse error:", err.message)
    return null
  }
}

function getSafeDumpBagFallback(userText) {
  const lower = (userText || "").toLowerCase()

  // Safety check for self-harm keywords
  if (
    lower.includes("suicide") ||
    lower.includes("kill myself") ||
    lower.includes("end my life") ||
    lower.includes("self harm") ||
    lower.includes("hurt myself")
  ) {
    return {
      validation:
        "It sounds like you are going through an extraordinarily heavy moment, and it takes courage to put these feelings into words. Please know that your life matters and you do not have to carry this alone.",
      pattern: {
        title: "Immediate support is available",
        content:
          "When emotional pain feels unbearable, our thoughts can make it seem like there is no way forward. Reaching out to someone who can hold space with you right now is the most important step.",
      },
      differentAngle: {
        title: "Connecting with compassionate support",
        content:
          "Trained professionals are available 24/7 without judgment. Reaching out is a sign of strength and self-care.",
      },
      nextStep: {
        title: "Contact support right now",
        content:
          "Please call or text 988 (Suicide & Crisis Lifeline) or contact your local emergency services or a trusted person immediately.",
      },
    }
  }

  // Workload / deadlines / perfectionism pattern
  if (lower.includes("deadline") || lower.includes("work") || lower.includes("perfect") || lower.includes("fail")) {
    return {
      validation:
        "Carrying multiple high-stakes responsibilities at once creates a genuine physiological and mental strain. Feeling stretched is a completely natural reaction to that level of volume.",
      pattern: {
        title: "All-or-nothing standards",
        content:
          "One pattern worth noticing is a tendency to view outcomes in extremes — feeling that unless every deliverable is executed flawlessly, something has fundamentally fallen short.",
      },
      differentAngle: {
        title: "Defining 'good enough' for today",
        content:
          "High standards are valuable, but in heavy weeks, completing the core priorities with reasonable quality is far more sustainable than aiming for perfection on everything.",
      },
      nextStep: {
        title: "Clarify your single top non-negotiable",
        content:
          "Identify the one task that would give you the greatest peace of mind to finish today. Give yourself permission to pause or defer the remainder until tomorrow.",
      },
    }
  }

  // Interpersonal / communication pattern
  if (lower.includes("manager") || lower.includes("boss") || lower.includes("colleague") || lower.includes("reply") || lower.includes("message")) {
    return {
      validation:
        "Waiting on responses or navigating workplace ambiguity can quickly trigger uncertainty and tension. It is understandable that this is on your mind.",
      pattern: {
        title: "Mind reading & personalization",
        content:
          "When communication is delayed or brief, our minds often rush to fill in the silence by assuming we did something wrong or that others are displeased.",
      },
      differentAngle: {
        title: "Separating assumptions from facts",
        content:
          "A delayed response usually reflects the other person's schedule, meetings, or competing tasks rather than a reflection of your standing or performance.",
      },
      nextStep: {
        title: "Step away from checking messages",
        content:
          "Take 15 minutes away from communication apps. Focus on an independent task or take a short physical reset before returning.",
      },
    }
  }

  // General exhaustion / overwhelm pattern (no forced distortion)
  return {
    validation:
      "What you have written reflects a real, understandable accumulation of fatigue and cognitive load. Acknowledging when your reserves are low is an important step.",
    pattern: {
      title: "Signals of cognitive depletion",
      content:
        "Rather than a thinking error, your words point toward genuine physical and mental exhaustion where your nervous system is asking for decompression.",
    },
    differentAngle: {
      title: "Rest as an active recovery practice",
      content:
        "Pausing or stepping back is not lost productivity — it is the necessary condition for your cognitive clarity and energy to restore.",
    },
    nextStep: {
      title: "Protect an uninterrupted 10-minute pause",
      content:
        "Step away from your screen, hydrate, or engage in a quiet physical stretch before making any further decisions today.",
    },
  }
}

async function generateDumpBagReflection(userText) {
  const apiKey =
    process.env.GOOGLE_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.log("[DUMP-BAG-AI] No AI API key configured. Using safe CBT fallback.")
    return getSafeDumpBagFallback(userText)
  }

  try {
    const prompt = buildDumpBagPrompt(userText)
    let aiJsonText = ""

    if (
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      (apiKey && (apiKey.startsWith("AIza") || apiKey.startsWith("AQ.")))
    ) {
      aiJsonText = await callGeminiAPI(apiKey, prompt)
    } else {
      aiJsonText = await callOpenAICompatibleAPI(apiKey, prompt)
    }

    const parsed = parseAndValidateDumpBagResponse(aiJsonText)
    if (parsed) {
      console.log("[DUMP-BAG-AI] Successfully generated CBT reflection.")
      return parsed
    }

    console.warn("[DUMP-BAG-AI] Response validation failed. Using safe CBT fallback.")
    return getSafeDumpBagFallback(userText)
  } catch (err) {
    console.error("[DUMP-BAG-AI] AI provider call failed:", err.message)
    return getSafeDumpBagFallback(userText)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Priority Reset / Priority Path AI Module
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Intelligent task extractor for client or fallback heuristic processing.
 * Separates tasks intelligently by line breaks, numbering, bullet points,
 * semicolons, and natural language conjunctions (e.g. "and then", "after that").
 */
function extractTasksFromRawInput(input) {
  if (Array.isArray(input)) {
    // If array has only 1 element with multiple tasks embedded, split it
    if (input.length === 1 && typeof input[0] === "string" && input[0].length > 25) {
      return extractTasksFromRawInput(input[0])
    }
    return input.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean)
  }

  if (typeof input !== "string" || !input.trim()) return []

  const raw = input.trim()

  // First check if there are multiple lines
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length > 1) {
    // Strip leading bullets/numbering (e.g. "1. ", "- ", "* ")
    return lines.map((l) => l.replace(/^(\d+[\.\)]\s*|[-*•]\s*)/, "").trim()).filter(Boolean)
  }

  // Single line or single block: inspect for numbered lists (e.g., "1. ... 2. ...")
  if (/\b\d+[\.\)]\s+/.test(raw)) {
    const parts = raw.split(/\b\d+[\.\)]\s+/).map((p) => p.trim()).filter(Boolean)
    if (parts.length > 1) return parts
  }

  // Inspect for bullets or semicolons
  if (raw.includes(";") || raw.includes("•")) {
    const parts = raw.split(/[;•]+/).map((p) => p.trim()).filter(Boolean)
    if (parts.length > 1) return parts
  }

  // Inspect for natural sequencing phrases: "and then", "after that", "followed by"
  if (/\b(and\s+then|after\s+that|followed\s+by)\b/i.test(raw)) {
    const parts = raw.split(/\b(?:and\s+then|after\s+that|followed\s+by)\b/i).map((p) => p.trim()).filter(Boolean)
    if (parts.length > 1) return parts
  }

  // Inspect for comma separation if there are 3+ items or items look like distinct clauses
  if (raw.includes(",")) {
    const commaParts = raw.split(",").map((p) => p.replace(/^\s*(and\s+)/i, "").trim()).filter(Boolean)
    if (commaParts.length >= 2 && commaParts.every((p) => p.length >= 3 && p.length <= 150)) {
      return commaParts
    }
  }

  return [raw]
}

function buildPriorityPrompt({ rawInput, tasks, msi, history, userContext }) {
  const msiScore = msi != null ? msi : 50
  const dept = userContext?.department ? `Department: ${userContext.department}` : ""
  const role = userContext?.designation ? `Role: ${userContext.designation}` : ""

  let historyContext = "No prior task completion history recorded."
  if (history && Array.isArray(history.completedTasks) && history.completedTasks.length > 0) {
    historyContext = `Recent completed tasks: ${history.completedTasks.slice(0, 5).join(", ")}. Typical preferred quick-win focus.`
  }

  const rawInputText = typeof rawInput === "string" && rawInput.trim()
    ? rawInput.trim()
    : Array.isArray(tasks)
    ? tasks.join("\n")
    : ""

  return `You are CortiQuant's empathetic, highly intelligent AI Cognitive Wellbeing & Productivity Coach.
Analyze the user's input, extract all distinct tasks, and synthesize their personalized "Priority Path".

CRITICAL RULE ON ORDERING:
- Users enter tasks in arbitrary, random order, often mentioning trivial or immediate chores first.
- NEVER default to the first-mentioned task simply because it appears first.
- The order entered by the user must NOT dictate the priority order.
- Do NOT output generic robotic responses like "Let's do the first task", "Start with task 1", or "Complete task 1 then task 2".

USER CONTEXT:
Current Mind Stress Index (MSI): ${msiScore}/100
(0-20: Normal, 21-40: Mild Stress, 41-60: Elevated/Moderate, 61-80: High Stress, 81-100: Burnout)
${dept}
${role}
${historyContext}

USER'S RAW INPUT (may be one sentence, paragraph, comma-separated, bulleted, or multi-line):
"""
${rawInputText}
"""

DEEP MULTI-FACTOR ANALYSIS GUIDELINES:
1. Task Extraction:
   - Identify every distinct task in the input, even if written in a single run-on sentence or separated by commas/conjunctions.
   - Clean and extract the true essence of each task.

2. Urgency & Deadlines:
   - Identify explicit deadlines (e.g. "by 3pm", "tomorrow 9am", "today", "before client meeting").
   - Assess actual consequences of delay.

3. Importance & Dependencies:
   - Identify dependencies where one task must happen before another (e.g. reviewing data/docs before writing slides/reports).
   - Assess impact on unblocking team members, clients, or essential commitments.

4. Cognitive Friction & Stress Impact:
   - Distinguish high-focus deep work from low-effort administrative/communication tasks.
   - Assess which task causes the highest background anxiety or dread, and which unblocks momentum.

5. Energy Matching with Current MSI (${msiScore}/100):
   - If MSI is Elevated/High (>= 60): The user is experiencing mental strain or cognitive overload. Prioritize an early clarity-unblocking task or high-relief quick win first to break paralysis, rebuild self-efficacy, and prevent burnout.
   - If MSI is Mild/Normal (< 60): The user has available cognitive bandwidth. Tackle the highest-impact deliverable or foundational blocker first while energy is fresh.

6. Ambiguity Handling:
   - If deadlines or urgency cannot be determined, provide a thoughtful, polite clarification question or clearly stated assumption in the "clarificationQuestion" field. Do NOT hallucinate made-up deadlines or details.

7. Personal, Human & Supportive Tone:
   - Explain the trade-offs naturally: "While [Task A] is on your mind, starting with [Task B] resolves the blocker needed for your meeting and gives you instant breathing room."
   - Provide a concrete "nextAction": a tiny, low-friction first physical step (takes under 2 minutes) to get started without friction.

OUTPUT STRICT VALID JSON ONLY (no preamble, no markdown formatting outside JSON):
{
  "overview": "Supportive 2-3 sentence explanation of the situation and why this specific priority sequence was selected.",
  "clarificationQuestion": "Optional short question or clearly stated assumption if any key urgency/timeline was ambiguous (or null if clear)",
  "firstFocus": {
    "task": "Exact task name recommended to do FIRST (do not just pick item #1)",
    "estimatedMinutes": 20,
    "reason": "Detailed, specific explanation of why this must come first over the other tasks",
    "stressRelief": "How completing this lowers cognitive burden and frees working memory",
    "nextAction": "A tiny 2-minute actionable first step to start right away"
  },
  "nextStep": {
    "task": "Exact task name to tackle immediately after the first focus",
    "estimatedMinutes": 25,
    "reason": "Why this comes second (e.g., builds directly on the first task or addresses subsequent urgency)"
  },
  "laterTasks": [
    {
      "task": "Task name",
      "estimatedMinutes": 30,
      "reason": "Why this can safely wait until the top focus blocks are cleared"
    }
  ],
  "quickWin": {
    "task": "Smallest low-friction task that can be knocked out quickly (or null if none)",
    "estimatedMinutes": 10,
    "reason": "Why this offers effortless momentum and dopamine"
  },
  "recoverySuggestion": {
    "title": "Short reset title",
    "activity": "2-3 minute restorative autonomic pause",
    "durationMinutes": 2,
    "navTarget": "breathing-reset"
  }
}`
}

function parseAndValidatePriorityResponse(aiText, originalTasks) {
  try {
    if (!aiText || typeof aiText !== "string") return null
    let clean = aiText.trim()
    if (clean.startsWith("```json")) clean = clean.slice(7)
    if (clean.startsWith("```")) clean = clean.slice(3)
    if (clean.endsWith("```")) clean = clean.slice(0, -3)
    clean = clean.trim()

    const obj = JSON.parse(clean)
    if (!obj || typeof obj !== "object") return null
    if (!obj.overview || typeof obj.overview !== "string") return null
    if (!obj.firstFocus || !obj.firstFocus.task) return null

    const firstTaskText = String(obj.firstFocus.task).trim()
    const nextTaskText = obj.nextStep && obj.nextStep.task ? String(obj.nextStep.task).trim() : null
    const quickWinText = obj.quickWin && obj.quickWin.task ? String(obj.quickWin.task).trim() : null

    // Build unified sequence array for roadmap display
    const sequence = []
    sequence.push({
      task: firstTaskText,
      order: 1,
      role: "First Focus",
      estimatedMinutes: Number(obj.firstFocus.estimatedMinutes) || 15,
      reason: String(obj.firstFocus.reason || "High leverage starting point.").trim(),
      nextAction: obj.firstFocus.nextAction ? String(obj.firstFocus.nextAction).trim() : null,
    })

    if (nextTaskText && nextTaskText !== firstTaskText) {
      sequence.push({
        task: nextTaskText,
        order: 2,
        role: "Next Step",
        estimatedMinutes: Number(obj.nextStep.estimatedMinutes) || 20,
        reason: String(obj.nextStep.reason || "Builds on your momentum.").trim(),
      })
    }

    const laterTasks = Array.isArray(obj.laterTasks)
      ? obj.laterTasks
          .map((t, idx) => ({
            task: String(t.task || "").trim(),
            order: 3 + idx,
            role: "Later",
            estimatedMinutes: Number(t.estimatedMinutes) || 25,
            reason: String(t.reason || "Can wait until key tasks are cleared.").trim(),
          }))
          .filter((t) => t.task.length > 0 && t.task !== firstTaskText && t.task !== nextTaskText)
      : []

    laterTasks.forEach((lt) => sequence.push(lt))

    return {
      overview: String(obj.overview).trim(),
      clarificationQuestion: obj.clarificationQuestion ? String(obj.clarificationQuestion).trim() : null,
      firstFocus: {
        task: firstTaskText,
        estimatedMinutes: Number(obj.firstFocus.estimatedMinutes) || 15,
        reason: String(obj.firstFocus.reason || "Completing this first unblocks your focus.").trim(),
        stressRelief: String(obj.firstFocus.stressRelief || "Reduces immediate mental pressure and clears uncertainty.").trim(),
        nextAction: obj.firstFocus.nextAction ? String(obj.firstFocus.nextAction).trim() : "Open your workspace and spend the first 2 minutes setting up your draft.",
      },
      nextStep: nextTaskText ? {
        task: nextTaskText,
        estimatedMinutes: Number(obj.nextStep.estimatedMinutes) || 20,
        reason: String(obj.nextStep.reason || "Follows naturally once your first priority is off your plate.").trim(),
      } : null,
      laterTasks,
      quickWin: quickWinText ? {
        task: quickWinText,
        estimatedMinutes: Number(obj.quickWin.estimatedMinutes) || 10,
        reason: String(obj.quickWin.reason || "Gives a fast dopamine boost with low effort.").trim(),
      } : null,
      sequence,
      recoverySuggestion: obj.recoverySuggestion ? {
        title: String(obj.recoverySuggestion.title || "Quick Mindful Pause").trim(),
        activity: String(obj.recoverySuggestion.activity || "Step away from your screen and take 3 deep reset breaths.").trim(),
        durationMinutes: Number(obj.recoverySuggestion.durationMinutes) || 2,
        navTarget: obj.recoverySuggestion.navTarget || "breathing-reset",
      } : {
        title: "2-Minute Breathing Reset",
        activity: "Take 4 slow breaths to reset your autonomic nervous system before jumping in.",
        durationMinutes: 2,
        navTarget: "breathing-reset",
      },
    }
  } catch (err) {
    console.warn("[PRIORITY-AI] JSON parse error:", err.message)
    return null
  }
}

/**
 * Intelligent client & server fallback engine.
 * Analyzes urgency, dependencies, cognitive load, and MSI without favoring the first item.
 */
function getSafePriorityPathFallback({ rawInput, tasks, msi }) {
  const extracted = extractTasksFromRawInput(rawInput || tasks || [])
  const cleanTasks = extracted.map((t) => t.trim()).filter(Boolean)

  if (cleanTasks.length === 0) {
    return {
      overview: "No tasks entered yet. Share what is on your plate to map your personalized Priority Path.",
      clarificationQuestion: null,
      firstFocus: null,
      nextStep: null,
      laterTasks: [],
      quickWin: null,
      sequence: [],
      recoverySuggestion: {
        title: "Mindful Reset",
        activity: "Take a quiet moment to breathe and clear your thoughts.",
        durationMinutes: 2,
        navTarget: "breathing-reset",
      },
    }
  }

  const msiScore = msi != null ? Number(msi) : 50

  // Deep Heuristic Scoring across tasks
  const analyzed = cleanTasks.map((text, idx) => {
    const l = text.toLowerCase()
    let urgencyScore = 0
    let cognitiveLoad = 2 // 1: light/admin, 2: medium, 3: heavy/strategic
    let isQuick = false
    let dependencyWeight = 0

    // Deadlines & urgency cues
    if (/\b(today|urgent|asap|now|critical|deadline|due|meeting|call|by\s+\d+|am\b|pm\b)\b/.test(l)) {
      urgencyScore += 50
    }
    if (/\b(client|submit|deliver|present|boss|manager|payroll|invoice|exam)\b/.test(l)) {
      urgencyScore += 30
    }
    if (/\b(finish|send|reply|review|check|email|ping|approve)\b/.test(l)) {
      urgencyScore += 15
    }

    // Cognitive load
    if (/\b(reply|email|call|text|ping|check|quick|pay|bill|print|trash|dishes|groceries)\b/.test(l)) {
      cognitiveLoad = 1
      isQuick = true
    } else if (/\b(strategy|architecture|presentation|deck|report|analysis|budget|write|draft|code|build)\b/.test(l)) {
      cognitiveLoad = 3
    }

    // Dependency heuristic: e.g. "review docs before slides", "draft before submit", "analyze before meeting"
    if (/\b(review|prep|draft|read|gather|outline)\b/.test(l)) {
      dependencyWeight += 20
    }

    // Give a slight intentional negative bias to pure position so first item is never picked on index alone
    const positionTieBreaker = (cleanTasks.length - idx) * 0.1

    const totalPriorityScore = urgencyScore + dependencyWeight + (isQuick && msiScore >= 60 ? 30 : 0) + positionTieBreaker

    const estMinutes = isQuick ? 10 : cognitiveLoad === 3 ? 35 : 20
    return {
      id: `task_${idx}`,
      text,
      urgencyScore,
      cognitiveLoad,
      isQuick,
      dependencyWeight,
      totalPriorityScore,
      estMinutes,
      originalIndex: idx,
    }
  })

  // Sort by priority score descending
  const sorted = [...analyzed].sort((a, b) => b.totalPriorityScore - a.totalPriorityScore)

  // Energy & MSI matching:
  // If MSI >= 60 (high stress), prefer high-scoring quick win if available
  let first = sorted[0]
  if (msiScore >= 60) {
    const quickHigh = sorted.find((s) => s.isQuick && s.urgencyScore > 0) || sorted.find((s) => s.isQuick)
    if (quickHigh) first = quickHigh
  }

  const remaining = sorted.filter((s) => s.id !== first.id)
  const next = remaining.length > 0 ? remaining[0] : null
  const later = remaining.length > 1 ? remaining.slice(1) : []
  const quickWinCandidate = sorted.find((s) => s.isQuick && s.id !== first.id) || (first.isQuick ? null : null)

  const overview = msiScore >= 60
    ? `You have ${cleanTasks.length} pending items and elevated stress signals today. We selected "${first.text}" as your primary anchor to eliminate immediate friction and rebuild momentum without cognitive burnout.`
    : `Analyzing your ${cleanTasks.length} open responsibilities, tackling "${first.text}" first gives you the highest leverage, resolving the critical path and removing the largest blocker on your schedule.`

  const firstFocus = {
    task: first.text,
    estimatedMinutes: first.estMinutes,
    reason: first.isQuick
      ? "Clears immediate uncertainty with minimal mental friction, unblocking your working memory."
      : "Carries the most critical timeline impact and unblocks the remaining steps on your schedule.",
    stressRelief: "Clears cognitive overload and gives you immediate agency over your day.",
    nextAction: `Spend the first 2 minutes opening the relevant file or screen for "${first.text}" without worrying about finishing.`,
  }

  const nextStep = next ? {
    task: next.text,
    estimatedMinutes: next.estMinutes,
    reason: "Builds directly on your momentum once your primary focus is complete.",
  } : null

  const laterTasks = later.map((l, idx) => ({
    task: l.text,
    order: 3 + idx,
    role: "Later",
    estimatedMinutes: l.estMinutes,
    reason: "Can wait safely without penalty until your top focus blocks are cleared.",
  }))

  const sequence = [
    {
      task: first.text,
      order: 1,
      role: "First Focus",
      estimatedMinutes: first.estMinutes,
      reason: firstFocus.reason,
      nextAction: firstFocus.nextAction,
    },
    ...(nextStep ? [{
      task: nextStep.task,
      order: 2,
      role: "Next Step",
      estimatedMinutes: nextStep.estimatedMinutes,
      reason: nextStep.reason,
    }] : []),
    ...laterTasks,
  ]

  return {
    overview,
    clarificationQuestion: cleanTasks.length > 1 && sorted.every((s) => s.urgencyScore === 0)
      ? "Assuming tasks have equal deadlines; adjust if any item is due sooner."
      : null,
    firstFocus,
    nextStep,
    laterTasks,
    quickWin: quickWinCandidate ? {
      task: quickWinCandidate.text,
      estimatedMinutes: quickWinCandidate.estMinutes,
      reason: "A lightweight task you can knock out in 10 minutes for an effortless dopamine boost.",
    } : null,
    sequence,
    recoverySuggestion: {
      title: msiScore >= 60 ? "3-Minute Down-Regulation" : "Cognitive Cleansing Pause",
      activity: msiScore >= 60
        ? "Take a slow 3-minute physiological sigh reset before beginning your work session."
        : "Step away from the screen for 2 minutes to let your working memory reset.",
      durationMinutes: msiScore >= 60 ? 3 : 2,
      navTarget: "breathing-reset",
    },
  }
}

async function generatePriorityPathAnalysis({ rawInput, tasks, msi, history, userContext }) {
  const extracted = extractTasksFromRawInput(rawInput || tasks || [])
  const cleanTasks = extracted.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean)

  if (cleanTasks.length === 0) {
    return getSafePriorityPathFallback({ rawInput, tasks: [], msi })
  }

  const apiKey =
    process.env.GOOGLE_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.log("[PRIORITY-AI] No AI API key configured. Using intelligent multi-factor fallback.")
    return getSafePriorityPathFallback({ rawInput, tasks: cleanTasks, msi })
  }

  try {
    const prompt = buildPriorityPrompt({ rawInput, tasks: cleanTasks, msi, history, userContext })
    let aiJsonText = ""

    if (
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      (apiKey && (apiKey.startsWith("AIza") || apiKey.startsWith("AQ.")))
    ) {
      aiJsonText = await callGeminiAPI(apiKey, prompt)
    } else {
      aiJsonText = await callOpenAICompatibleAPI(apiKey, prompt)
    }

    const parsed = parseAndValidatePriorityResponse(aiJsonText, cleanTasks)
    if (parsed) {
      console.log("[PRIORITY-AI] Successfully generated deep AI Priority Path.")
      return parsed
    }

    console.warn("[PRIORITY-AI] Validation failed. Using intelligent multi-factor fallback.")
    return getSafePriorityPathFallback({ rawInput, tasks: cleanTasks, msi })
  } catch (err) {
    console.error("[PRIORITY-AI] AI provider call error:", err.message)
    return getSafePriorityPathFallback({ rawInput, tasks: cleanTasks, msi })
  }
}


module.exports = {
  generateAnalysisAndRecommendations,
  getSafeFallback,
  generateDumpBagReflection,
  getSafeDumpBagFallback,
  generatePriorityPathAnalysis,
  getSafePriorityPathFallback,
}
