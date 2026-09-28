const mongoose = require("mongoose")

const ArchetypeValidationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    archetype: {
      type: String,
      required: true,
      enum: [
        "The Slow Leak",
        "The Thunderstorm",
        "The Echo Chamber",
        "The Tide",
        "The Architect",
        "The Kaleidoscope",
        "The Sponge",
      ],
      index: true,
    },
    quizVersion: {
      type: String,
      required: true,
      default: "v1",
      index: true,
    },
    validationScore: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    isHighFit: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    accurateAreas: {
      type: [String],
      default: [],
    },
    inaccurateAreas: {
      type: [String],
      default: [],
    },
    feedbackText: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
)

// Index for query performance on aggregate resonance
ArchetypeValidationSchema.index({ archetype: 1, quizVersion: 1, validationScore: 1 })

module.exports = mongoose.model("ArchetypeValidation", ArchetypeValidationSchema)
