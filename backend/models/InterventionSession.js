const mongoose = require("mongoose")

const interventionSessionSchema = new mongoose.Schema(
  {
    interventionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Intervention",
      required: true,
      index: true,
    },

    interventionName: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["RESET_LAB", "HUMAN_LISTENER", "DUMP_BAG", "GUIDED_EXERCISE", "WORKSHOP", "OTHER"],
      required: true,
      index: true,
    },

    category: {
      type: String,
      trim: true,
      default: "General",
    },

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

    departmentId: {
      type: String,
      default: null,
      index: true,
    },

    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["Started", "Completed", "Abandoned"],
      default: "Completed",
      index: true,
    },

    preMSI: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },

    postMSI: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },

    msiChange: {
      type: Number,
      default: null,
    },

    duration: {
      type: Number, // in seconds or minutes
      default: 0,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

interventionSessionSchema.index({ organisationId: 1, departmentId: 1, startedAt: -1 })
interventionSessionSchema.index({ organisationId: 1, interventionId: 1, startedAt: -1 })
interventionSessionSchema.index({ employeeId: 1, startedAt: -1 })

module.exports = mongoose.model("InterventionSession", interventionSessionSchema)
