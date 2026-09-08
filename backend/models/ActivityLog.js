const mongoose = require("mongoose")

const activityLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },

    userName: {
      type: String,
      default: "System",
      trim: true,
    },

    role: {
      type: String,
      default: "System",
      trim: true,
    },

    organisationId: {
      type: String,
      default: null,
      index: true,
    },

    organisationName: {
      type: String,
      default: null,
      trim: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    entityType: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    entityId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    status: {
      type: String,
      enum: ["Success", "Failed"],
      default: "Success",
      index: true,
    },

    details: {
      type: String,
      default: null,
      trim: true,
    },

    ipAddress: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

activityLogSchema.index({ userName: "text", action: "text", organisationName: "text", details: "text" })

module.exports = mongoose.model("ActivityLog", activityLogSchema)
