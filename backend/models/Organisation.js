const mongoose = require("mongoose")

const organisationSchema = new mongoose.Schema(
  {
    // CortiQuant short Organisation ID (format: CQ + 6 digits, e.g. "CQ482731")
    organisationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Organisation display name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Employee signup code (format: 4 letters of org name + 4 digits, e.g. "MERI4827")
    organisationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Reference to the HR Admin user created for this organisation
    hrAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Status: Active / Pending / Inactive
    status: {
      type: String,
      enum: ["Active", "Pending", "Inactive"],
      default: "Active",
    },

    // Boolean flag kept for backward compatibility
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Backward compatibility alias: organisation.code <-> organisation.organisationCode
organisationSchema.virtual("code")
  .get(function () {
    return this.organisationCode
  })
  .set(function (v) {
    this.organisationCode = v
  })

module.exports = mongoose.model("Organisation", organisationSchema)
