const mongoose = require("mongoose")

const RootCauseAssessmentSchema = new mongoose.Schema(
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

    departmentId: {
      type: String,
      default: null,
      index: true,
    },

    department: {
      type: String,
      default: null,
    },

    msiAtAssessment: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },

    primaryCause: {
      type: String,
      required: true,
      enum: ["Workload", "People", "Performance", "Future", "Personal", "Sleep & Energy"],
    },

    secondaryCause: {
      type: String,
      default: null,
    },

    causeSeverity: {
      type: String,
      enum: ["Mild", "Moderate", "High", "Severe"],
      default: "Moderate",
    },

    categoryScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    responses: [
      {
        questionId: { type: String, required: true },
        question: { type: String, required: true },
        answer: { type: String, required: true },
        answerScore: { type: Number, default: 0 },
      },
    ],

    explanation: {
      type: String,
      required: true,
    },

    summary: {
      type: String,
      default: null,
    },

    contributingFactors: {
      type: [String],
      default: [],
    },

    recommendations: [
      {
        id: { type: String },
        type: { type: String, enum: ["real_world", "cortiquant_feature", "action", "feature"], default: "real_world" },
        title: { type: String, required: true },
        description: { type: String, required: true },
        priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
        reason: { type: String, default: null },
        cta: { type: String, default: null },
        ctaText: { type: String, default: null },
        icon: { type: String, default: null },
      },
    ],

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
)

RootCauseAssessmentSchema.index({ userId: 1, createdAt: -1 })
RootCauseAssessmentSchema.index({ organisationId: 1, createdAt: -1 })

module.exports = mongoose.model("RootCauseAssessment", RootCauseAssessmentSchema)
