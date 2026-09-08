const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const listenerSchema = new mongoose.Schema(
  {
    listenerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      default: "LISTENER",
      immutable: true,
    },

    status: {
      type: String,
      enum: ["Active", "Pending", "Inactive"],
      default: "Pending",
      index: true,
    },

    invitedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: "admin",
    },

    invitedAt: {
      type: Date,
      default: Date.now,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    bio: {
      type: String,
      default: "Here to listen and support. Open to talking about work stress or personal pressure.",
      trim: true,
    },

    availabilityStatus: {
      type: String,
      enum: ["Available", "Busy", "Unavailable", "Offline"],
      default: "Available",
    },
  },
  {
    timestamps: true,
  }
)

/**
 * Compare plain password against stored passwordHash
 */
listenerSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash)
}

/**
 * Static helper to hash a plain password
 */
listenerSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(plainPassword, salt)
}

/**
 * Safe representation of listener object without sensitive hashes
 */
listenerSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    listenerId: this.listenerId,
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    availabilityStatus: this.availabilityStatus || "Available",
    invitedBy: this.invitedBy,
    invitedAt: this.invitedAt,
    acceptedAt: this.acceptedAt,
    lastLoginAt: this.lastLoginAt,
    bio: this.bio,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

module.exports = mongoose.model("Listener", listenerSchema)
