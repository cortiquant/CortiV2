const mongoose = require("mongoose")

const listenerAvailabilitySchema = new mongoose.Schema(
  {
    listenerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listener",
      required: true,
      index: true,
    },

    day: {
      type: String,
      enum: ["today", "tomorrow"],
      required: true,
    },

    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },

    time: {
      type: String, // e.g. "08:00", "18:00"
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["Available", "Booked", "Unavailable"],
      default: "Available",
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Prevent duplicate slots for the same listener, date, and time
listenerAvailabilitySchema.index({ listenerId: 1, date: 1, time: 1 }, { unique: true })

module.exports = mongoose.model("ListenerAvailability", listenerAvailabilitySchema)
