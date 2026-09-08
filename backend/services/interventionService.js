const Intervention = require("../models/Intervention")

const STANDARD_INTERVENTIONS = [
  // 1. Reset Labs
  {
    name: "Musical Reset",
    type: "RESET_LAB",
    category: "Music",
    description: "Curated soundscapes and ambient audio tracks to down-regulate nervous system arousal.",
    duration: "5–10 min",
    status: "Active",
  },
  {
    name: "Movement Reset",
    type: "RESET_LAB",
    category: "Movement",
    description: "Short physical sequences addressing muscle stiffness, low energy, and physical tension.",
    duration: "3–5 min",
    status: "Active",
  },
  {
    name: "Breathing Reset",
    type: "RESET_LAB",
    category: "Breathing",
    description: "4-4-6 guided parasympathetic breathing cycles to stabilize pulse and relieve acute stress.",
    duration: "2–5 min",
    status: "Active",
  },
  {
    name: "Priority Reset",
    type: "RESET_LAB",
    category: "Mindset",
    description: "Cognitive task dump and sorting exercise to clear overwhelm and focus on one next step.",
    duration: "5–10 min",
    status: "Active",
  },
  {
    name: "Energy Reset",
    type: "RESET_LAB",
    category: "Meditation",
    description: "Guided relaxation journey designed to recharge low cognitive and physical energy reserves.",
    duration: "5 min",
    status: "Active",
  },
  {
    name: "Relaxation",
    type: "RESET_LAB",
    category: "Meditation",
    description: "Slow, calming meditation session designed for unwinding after sustained mental effort.",
    duration: "15 min",
    status: "Active",
  },
  {
    name: "Sleep Wind-down",
    type: "RESET_LAB",
    category: "Meditation",
    description: "Gentle pre-rest bedtime meditation to ease the day into quiet evening rest.",
    duration: "20 min",
    status: "Active",
  },
  {
    name: "Journal",
    type: "RESET_LAB",
    category: "Art/Reflective",
    description: "Private expressive writing space for untangling complex emotions and reflections.",
    duration: "Whenever you need",
    status: "Active",
  },

  // 2. Human Listener
  {
    name: "Human Listener",
    type: "HUMAN_LISTENER",
    category: "Listener",
    description: "Anonymous, confidential 10-minute 1-on-1 support session with a trained listener.",
    duration: "10 min",
    status: "Active",
  },

  // 3. Digital Dump Bag
  {
    name: "Digital Dump Bag",
    type: "DUMP_BAG",
    category: "Dump Bag",
    description: "Private mental offloading with CBT-informed validation and actionable perspective shifts.",
    duration: "2–10 min",
    status: "Active",
  },

  // 4. Workshops
  {
    name: "Acoustic Unwind",
    type: "WORKSHOP",
    category: "Workshop",
    description: "Immersive group acoustic recovery workshop targeting cognitive overload and team fatigue.",
    duration: "30 min",
    status: "Active",
  },
]

/**
 * Ensures standard interventions exist for an organisation.
 * If any are missing, creates them so HR and employees can interact immediately.
 */
async function ensureInterventionsForOrg(organisationId) {
  if (!organisationId) return []

  const existing = await Intervention.find({ organisationId })
  const existingNames = new Set(existing.map((item) => item.name.toLowerCase().trim()))

  const toCreate = []
  for (const std of STANDARD_INTERVENTIONS) {
    if (!existingNames.has(std.name.toLowerCase().trim())) {
      toCreate.push({
        ...std,
        organisationId,
      })
    }
  }

  if (toCreate.length > 0) {
    await Intervention.insertMany(toCreate)
  }

  return Intervention.find({ organisationId, status: { $ne: "Archived" } }).sort({ createdAt: 1 })
}

/**
 * Find or create an intervention by name/type for an organisation.
 */
async function getOrCreateIntervention(organisationId, name, type = "RESET_LAB", category = "General") {
  if (!organisationId || !name) return null

  let intervention = await Intervention.findOne({
    organisationId,
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
  })

  if (!intervention) {
    intervention = new Intervention({
      organisationId,
      name: name.trim(),
      type,
      category,
      status: "Active",
    })
    await intervention.save()
  }

  return intervention
}

module.exports = {
  STANDARD_INTERVENTIONS,
  ensureInterventionsForOrg,
  getOrCreateIntervention,
}
