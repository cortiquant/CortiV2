const mongoose = require("mongoose")

const departmentSchema = new mongoose.Schema(
  {
    // Unique human-readable department ID within the organisation (e.g. "DEPT-MER-001")
    departmentId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    // Reference to the Organisation document or string organisationId
    organisationId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Organisation",
      required: true,
      index: true,
    },

    // Department display name (e.g. "Engineering", "Customer Support")
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Status: Active / Inactive
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
)

// Ensure uniqueness of departmentId within each organisation
departmentSchema.index({ organisationId: 1, departmentId: 1 }, { unique: true })
departmentSchema.index({ organisationId: 1, name: 1 })

module.exports = mongoose.model("Department", departmentSchema)
