const mongoose = require("mongoose")

const interventionSchema = new mongoose.Schema(
  {
    organisationId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Organisation",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["RESET_LAB", "HUMAN_LISTENER", "DUMP_BAG", "GUIDED_EXERCISE", "WORKSHOP", "OTHER"],
      default: "RESET_LAB",
      required: true,
      index: true,
    },

    category: {
      type: String,
      trim: true,
      default: "General",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    duration: {
      type: String,
      trim: true,
      default: "5–10 min",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Archived"],
      default: "Active",
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

interventionSchema.index({ organisationId: 1, name: 1 })
interventionSchema.index({ organisationId: 1, type: 1 })
interventionSchema.index({ organisationId: 1, status: 1 })

module.exports = mongoose.model("Intervention", interventionSchema)
