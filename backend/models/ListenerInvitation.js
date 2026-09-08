const mongoose = require("mongoose")
const crypto = require("crypto")

const listenerInvitationSchema = new mongoose.Schema(
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

    listenerId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
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
      index: true,
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

// Index for token hash lookup and status queries
listenerInvitationSchema.index({ tokenHash: 1 })
listenerInvitationSchema.index({ email: 1, status: 1 })

/**
 * Static method: Hash raw token with SHA-256
 */
listenerInvitationSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex")
}

/**
 * Static method: Generate a new raw token, compute its hash, and set expiration
 */
listenerInvitationSchema.statics.generateToken = function (expiresInHours = 72) {
  const rawToken = crypto.randomBytes(32).toString("hex")
  const tokenHash = this.hashToken(rawToken)
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
  return { rawToken, tokenHash, expiresAt }
}

module.exports = mongoose.model("ListenerInvitation", listenerInvitationSchema)
