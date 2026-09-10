const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    organisationId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Organisation",
      required: false,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
      index: true,
    },
    type: {
      type: String,
      default: "session_reminder",
      index: true,
    },
    status: {
      type: String,
      default: "SENT",
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    title: {
      type: String,
      required: false,
      trim: true,
    },
    message: {
      type: String,
      required: false,
      trim: true,
    },
    sessionId: {
      type: String,
      default: null,
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

notificationSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model("Notification", notificationSchema)
