const mongoose = require("mongoose")

const listenerNotificationSchema = new mongoose.Schema(
  {
    listenerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listener",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["session_request", "session_accepted", "session_cancelled", "session_reminder", "availability_update", "general"],
      default: "general",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

listenerNotificationSchema.index({ listenerId: 1, createdAt: -1 })

module.exports = mongoose.model("ListenerNotification", listenerNotificationSchema)
