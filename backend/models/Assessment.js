const mongoose = require("mongoose")

const AssessmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    employeeId: {
      type: String,
      default: null,
      index: true,
    },

    organisationId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Organisation",
      required: true,
      index: true,
    },

    organisationCode: {
      type: String,
      default: null,
    },

    type: {
      type: String,
      default: "Daily Check-in (MSI)",
      enum: ["Daily Check-in (MSI)", "Baseline MSI", "Psychometric", "Behavioral", "Archetype"],
    },

    // Daily Check-in responses
    responses: {
      feeling: { type: String, default: null },
      stressor: { type: String, default: null },
      physical: { type: String, default: null },
      driver: { type: String, default: null },
      // Optional detailed item scores if full psychometric/behavioral questionnaire submitted
      moodCheck: {
        M1: { type: Number, min: 0, max: 4, default: null },
        M2: { type: Number, min: 0, max: 4, default: null },
      },
      stressPulse: {
        SP1: { type: Number, min: 0, max: 4, default: null },
        SP2: { type: Number, min: 0, max: 4, default: null },
        SP3: { type: Number, min: 0, max: 4, default: null },
        SP4: { type: Number, min: 0, max: 4, default: null },
        SP5: { type: Number, min: 0, max: 4, default: null },
        SP6: { type: Number, min: 0, max: 4, default: null },
      },
      physicalCheck: {
        PH1: { type: Number, min: 0, max: 4, default: null },
      },
    },

    // MSI Score & Sub-scores calculated exclusively from check-in
    msi: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },

    scores: {
      moodScore: { type: Number, default: null },
      psychometricScore: { type: Number, default: null },
      physicalScore: { type: Number, default: null },
      msi: { type: Number, min: 0, max: 100, default: null },
    },

    category: {
      type: String,
      enum: ["Healthy", "Mild", "Moderate", "High", "Burnout", "Within range", "High Stress"],
      default: "Moderate",
    },

    driver: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      default: "Completed",
    },

    departmentId: {
      type: String,
      default: null,
      index: true,
    },

    department: {
      type: String,
      default: null,
    },

    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

AssessmentSchema.index({ userId: 1, completedAt: -1 })
AssessmentSchema.index({ organisationId: 1, completedAt: -1 })
AssessmentSchema.index({ organisationId: 1, departmentId: 1, createdAt: -1 })
AssessmentSchema.index({ organisationId: 1, departmentId: 1, completedAt: -1 })

module.exports = mongoose.model("Assessment", AssessmentSchema)
