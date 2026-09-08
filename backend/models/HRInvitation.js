const mongoose = require("mongoose")
const crypto = require("crypto")

const hrInvitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    // Reference to Organisation (stores CQ ID or ObjectId)
    organisationId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      ref: "Organisation",
    },

    organisationCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    invitedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: "admin",
    },

    // Secure SHA-256 hash of the random invitation token
    tokenHash: {
      type: String,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Accepted", "Expired", "Revoked"],
      default: "Pending",
    },

    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Index for token lookup and expiration check
hrInvitationSchema.index({ tokenHash: 1 })
hrInvitationSchema.index({ email: 1, organisationCode: 1, status: 1 })

/**
 * Static method: Hash a raw token with SHA-256
 */
hrInvitationSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex")
}

/**
 * Static method: Generate a new raw token, compute its hash, and set expiration
 */
hrInvitationSchema.statics.generateToken = function (expiresInDays = 7) {
  const rawToken = crypto.randomBytes(32).toString("hex")
  const tokenHash = this.hashToken(rawToken)
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
  return { rawToken, tokenHash, expiresAt }
}

module.exports = mongoose.model("HRInvitation", hrInvitationSchema)
