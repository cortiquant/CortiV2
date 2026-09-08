const mongoose = require("mongoose")

const listenerMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ListenerSession",
      required: true,
      index: true,
    },

    senderRole: {
      type: String,
      enum: ["LISTENER", "EMPLOYEE"],
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    senderName: {
      type: String,
      default: "Anonymous Participant",
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

listenerMessageSchema.index({ sessionId: 1, createdAt: 1 })

module.exports = mongoose.model("ListenerMessage", listenerMessageSchema)
