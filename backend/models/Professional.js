const mongoose = require("mongoose")

const professionalSchema = new mongoose.Schema(
  {
    professionalName: {
      type: String,
      required: [true, "Professional name is required"],
      trim: true,
    },
    occupation: {
      type: String,
      required: [true, "Occupation is required"],
      trim: true,
    },
    shortStats: {
      type: String,
      required: [true, "Short description/stats is required"],
      trim: true,
    },
    qualification: {
      type: String,
      required: [true, "Qualification is required"],
      trim: true,
    },
    consultationType: {
      type: String,
      required: [true, "Consultation type is required"],
      enum: {
        values: ["Complimentary", "Paid"],
        message: "Consultation type must be either 'Complimentary' or 'Paid'",
      },
      default: "Complimentary",
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      select: false, // Never exposed in standard public queries
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      default: "admin",
    },
  },
  {
    timestamps: true,
  }
)

/**
 * Returns safe fields for the public employee support directory.
 * Explicitly omits phoneNumber and private email.
 */
professionalSchema.methods.toPublicObject = function () {
  return {
    id: this._id,
    _id: this._id,
    professionalName: this.professionalName,
    occupation: this.occupation,
    shortStats: this.shortStats,
    qualification: this.qualification,
    consultationType: this.consultationType,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

/**
 * Returns complete fields for the Admin management view.
 */
professionalSchema.methods.toAdminObject = function () {
  return {
    id: this._id,
    _id: this._id,
    professionalName: this.professionalName,
    occupation: this.occupation,
    shortStats: this.shortStats,
    qualification: this.qualification,
    consultationType: this.consultationType,
    phoneNumber: this.phoneNumber,
    email: this.email,
    status: this.status,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

professionalSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model("Professional", professionalSchema)
