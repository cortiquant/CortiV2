const mongoose = require("mongoose")

const assessmentLedgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ── Profile Snapshot Fields ──────────────────────────────────────
    name: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    age: {
      type: Number,
      default: null,
    },
    gender: {
      type: String,
      default: "",
      trim: true,
    },
    profession: {
      type: String,
      default: "",
      trim: true,
    },
    hoursOfSleep: {
      type: Number,
      default: null,
    },
    medicalHistory: {
      type: String,
      default: "",
      trim: true,
    },

    // ── MSI Mood Questions ──────────────────────────────────────────
    M1: { type: Number, default: null },
    M2: { type: Number, default: null },
    M3: { type: Number, default: null },
    M4: { type: Number, default: null },

    // ── MSI Stress Questions ────────────────────────────────────────
    S1: { type: Number, default: null },
    S2: { type: Number, default: null },
    S3: { type: Number, default: null },
    S4: { type: Number, default: null },

    // ── MSI Recovery Questions ──────────────────────────────────────
    R1: { type: Number, default: null },
    R2: { type: Number, default: null },
    R3: { type: Number, default: null },
    R4: { type: Number, default: null },

    // ── MSI Physical Questions ──────────────────────────────────────
    P1: { type: Number, default: null },
    P2: { type: Number, default: null },
    P3: { type: Number, default: null },
    P4: { type: Number, default: null },

    // ── Result ──────────────────────────────────────────────────────
    calculatedMSI: {
      type: Number,
      required: true,
      index: true,
    },

    // ── Metadata ────────────────────────────────────────────────────
    assessmentType: {
      type: String,
      enum: ["baseline", "weekly", "Baseline", "Weekly"],
      default: "baseline",
      index: true,
    },
    assessmentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

assessmentLedgerSchema.index({ userId: 1, assessmentDate: -1 })
assessmentLedgerSchema.index({ assessmentType: 1, assessmentDate: -1 })
assessmentLedgerSchema.index({ name: "text" })

module.exports = mongoose.model("AssessmentLedger", assessmentLedgerSchema)
