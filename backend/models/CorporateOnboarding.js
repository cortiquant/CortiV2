const mongoose = require("mongoose")

// ─────────────────────────────────────────────────────────────────────────────
// CorporateOnboarding model
//
// Stores answers, computed scores, and archetype for a single employee's
// Corporate Onboarding submission.
//
// Question code reference:
//   Participant Profile : D1–D8   (string answers)
//   Mood Check          : M1–M2   (numeric, 0-indexed: Never=0…Always=4)
//   Stress Pulse        : SP1–SP6 (numeric, 0-indexed: Never=0…Always=4)
//   Physical Check      : PH1     (numeric, 0-indexed: Never=0…Always=4)
//   Archetype Quiz      : AQ1–AQ5 (numeric, option index chosen by employee)
// ─────────────────────────────────────────────────────────────────────────────

const corporateOnboardingSchema = new mongoose.Schema(
  {
    // The employee who submitted this record
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Denormalised for quick querying without joins
    employeeId: {
      type: String,
      default: null,
    },

    organisationId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Organisation",
      required: true,
    },

    organisationCode: {
      type: String,
      default: null,
    },

    // ── Section 1: Participant Profile (D1–D8) ─────────────────────────────
    participantProfile: {
      D1: { type: String, default: null }, // Age range
      D2: { type: String, default: null }, // Gender
      D3: { type: String, default: null }, // Department
      D4: { type: String, default: null }, // Role level
      D5: { type: String, default: null }, // Tenure
      D6: { type: String, default: null }, // Hours per week
      D7: { type: String, default: null }, // Workload intensity
      D8: { type: String, default: null }, // Work arrangement
    },

    // ── Section 2: Mood Check (M1–M2) ─────────────────────────────────────
    // 0 = Never, 1 = Rarely, 2 = Sometimes, 3 = Often, 4 = Always
    // Max total = 8
    moodCheck: {
      M1: { type: Number, min: 0, max: 4, default: null },
      M2: { type: Number, min: 0, max: 4, default: null },
    },

    // ── Section 3: Stress Pulse (SP1–SP6) ─────────────────────────────────
    // 0 = Never … 4 = Always  |  Max total = 24
    stressPulse: {
      SP1: { type: Number, min: 0, max: 4, default: null },
      SP2: { type: Number, min: 0, max: 4, default: null },
      SP3: { type: Number, min: 0, max: 4, default: null },
      SP4: { type: Number, min: 0, max: 4, default: null },
      SP5: { type: Number, min: 0, max: 4, default: null },
      SP6: { type: Number, min: 0, max: 4, default: null },
    },

    // ── Section 4: Physical Check (PH1) ───────────────────────────────────
    // 0 = Never … 4 = Always  |  Max total = 4
    physicalCheck: {
      PH1: { type: Number, min: 0, max: 4, default: null },
    },

    // ── Section 5: Archetype Quiz (AQ1–AQ5) ───────────────────────────────
    // Stores the chosen option index for each question (matches QUIZ_QUESTIONS
    // in EmployeeApp.tsx)
    archetypeQuiz: {
      AQ1: { type: Number, default: null },
      AQ2: { type: Number, default: null },
      AQ3: { type: Number, default: null },
      AQ4: { type: Number, default: null },
      AQ5: { type: Number, default: null },
    },

    // ── Computed scores (backend is source of truth) ───────────────────────
    scores: {
      // Raw sums
      moodScore:          { type: Number, default: null }, // sum(M1,M2), max 8
      psychometricScore:  { type: Number, default: null }, // sum(SP1–SP6), max 24
      physicalScore:      { type: Number, default: null }, // PH1, max 4

      // MSI = (mood/8*20) + (psychometric/24*55) + (physical/4*25), clamped 0–100
      msi: { type: Number, min: 0, max: 100, default: null },
    },

    // ── Archetype result ───────────────────────────────────────────────────
    archetype: {
      primary:   { type: String, default: null },
      secondary: { type: String, default: null },
    },

    onboardingCompleted: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

// ── Compound unique index: one onboarding record per employee per org ─────────
corporateOnboardingSchema.index({ userId: 1, organisationId: 1 }, { unique: true })

module.exports = mongoose.model("CorporateOnboarding", corporateOnboardingSchema)
