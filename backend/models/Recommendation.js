const mongoose = require("mongoose")

const RecommendationSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    organisationId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Organisation",
      required: true,
      index: true,
    },

    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RootCauseAssessment",
      default: null,
      index: true,
    },

    msiScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    primaryCause: {
      type: String,
      required: true,
    },

    recommendations: [
      {
        type: {
          type: String,
          enum: ["feature", "action", "real_world", "cortiquant_feature"],
          default: "action",
        },
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        featureKey: {
          type: String,
          default: null,
        },
        cta: {
          type: String,
          default: null,
        },
        icon: {
          type: String,
          default: null,
        },
        priority: {
          type: String,
          default: "medium",
        },
        reason: {
          type: String,
          default: null,
        },
      },
    ],
  },
  { timestamps: true }
)

RecommendationSchema.index({ employeeId: 1, createdAt: -1 })
RecommendationSchema.index({ organisationId: 1, createdAt: -1 })

module.exports = mongoose.model("Recommendation", RecommendationSchema)
