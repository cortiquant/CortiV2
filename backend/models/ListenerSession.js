const mongoose = require("mongoose")

const listenerSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    listenerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listener",
      required: true,
      index: true,
    },

    clientId: {
      type: String,
      required: true,
      index: true,
      trim: true,
      uppercase: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    employeeName: {
      type: String,
      default: "Anonymous",
    },

    listenerName: {
      type: String,
      default: "Peer Listener",
    },

    organisationId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Organisation",
      default: null,
      index: true,
    },

    date: {
      type: String, // e.g., "Today", "Tomorrow", or "2026-09-06"
      required: true,
    },

    time: {
      type: String, // e.g., "19:30", "08:00"
      required: true,
    },

    startTime: {
      type: String,
      default: null,
    },

    endTime: {
      type: String,
      default: null,
    },

    scheduledDate: {
      type: Date,
      default: null,
    },

    duration: {
      type: Number, // duration in minutes, e.g. 10, 30 or 45
      default: 10,
    },

    durationMinutes: {
      type: Number,
      default: 10,
    },

    sessionType: {
      type: String,
      default: "Peer Support",
    },

    mode: {
      type: String,
      default: "Text Chat",
    },

    status: {
      type: String,
      enum: [
        "REQUESTED",
        "BOOKED",
        "ACTIVE",
        "COMPLETED",
        "CANCELLED",
        "EXPIRED",
        "Requested",
        "Booked",
        "Confirmed",
        "Scheduled",
        "Active",
        "In Progress",
        "Completed",
        "Declined",
        "Cancelled",
        "Expired",
        "No Show",
      ],
      default: "BOOKED",
      index: true,
    },

    scheduledAt: {
      type: Date,
      default: Date.now,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    started: {
      type: Boolean,
      default: false,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    notificationSent: {
      type: Boolean,
      default: false,
    },

    bookingEmailSent: {
      type: Boolean,
      default: false,
    },

    reminderSent: {
      type: Boolean,
      default: false,
    },

    actualDurationMinutes: {
      type: Number,
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

listenerSessionSchema.index({ listenerId: 1, date: 1, time: 1 })
listenerSessionSchema.index({ listenerId: 1, status: 1, createdAt: -1 })
listenerSessionSchema.index({ employeeId: 1, createdAt: -1 })
listenerSessionSchema.index({ clientId: 1, createdAt: -1 })

module.exports = mongoose.model("ListenerSession", listenerSessionSchema)
