const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const HRInvitation = require("../models/HRInvitation")
const Organisation = require("../models/Organisation")
const User = require("../models/User")
const { logActivity } = require("../services/activityService")

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/invitations/validate?token=...
//
// Public — validates an invitation token and returns safe organization details
// ─────────────────────────────────────────────────────────────────────────────
router.get("/validate", async (req, res) => {
  try {
    const { token } = req.query

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({ success: false, message: "Invitation token is required." })
    }

    const tokenHash = HRInvitation.hashToken(token.trim())

    const invitation = await HRInvitation.findOne({ tokenHash })
    if (!invitation) {
      return res.status(400).json({ success: false, message: "Invitation is invalid or has expired." })
    }

    if (invitation.status === "Accepted") {
      return res.status(400).json({ success: false, message: "This invitation has already been accepted. Please login." })
    }

    if (invitation.status === "Revoked") {
      return res.status(400).json({ success: false, message: "This invitation has been revoked. Please contact your Administrator." })
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      invitation.status = "Expired"
      await invitation.save().catch(() => {})
      return res.status(400).json({ success: false, message: "Invitation is invalid or has expired." })
    }

    // Lookup organization name
    const org = await Organisation.findOne({
      $or: [
        { organisationId: invitation.organisationId },
        { _id: mongoose.isValidObjectId(invitation.organisationId) ? invitation.organisationId : null },
      ],
    })

    return res.status(200).json({
      success: true,
      invitation: {
        name: invitation.name,
        email: invitation.email,
        organisationId: invitation.organisationId,
        organisationName: org ? org.name : "Your Organisation",
        organisationCode: invitation.organisationCode,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (err) {
    console.error("[HR INVITATIONS] Validate error:", err.message)
    res.status(500).json({ success: false, message: "Server error validating invitation." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hr/invitations/accept
//
// Public — accepts an invitation, hashes the password, and provisions the HR
// account in the existing User/Auth schema.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/accept", async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({ success: false, message: "Invitation token is required." })
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." })
    }

    const tokenHash = HRInvitation.hashToken(token.trim())

    const invitation = await HRInvitation.findOne({ tokenHash })
    if (!invitation) {
      return res.status(400).json({ success: false, message: "Invitation is invalid or has expired." })
    }

    if (invitation.status === "Accepted") {
      return res.status(400).json({ success: false, message: "This invitation has already been accepted. Please login." })
    }

    if (invitation.status === "Revoked") {
      return res.status(400).json({ success: false, message: "This invitation has been revoked." })
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      invitation.status = "Expired"
      await invitation.save().catch(() => {})
      return res.status(400).json({ success: false, message: "Invitation is invalid or has expired." })
    }

    // Verify parent organisation
    const org = await Organisation.findOne({
      $or: [
        { organisationId: invitation.organisationId },
        { _id: mongoose.isValidObjectId(invitation.organisationId) ? invitation.organisationId : null },
      ],
    })

    if (!org) {
      return res.status(404).json({ success: false, message: "Organisation no longer exists." })
    }

    // Verify email doesn't already belong to an active user
    const normalizedEmail = invitation.email.trim().toLowerCase()
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return res.status(400).json({ success: false, message: "An account with this email already exists." })
    }

    // 1. Hash password using existing User mechanism
    const passwordHash = await User.hashPassword(password)

    // 2. Create HR user in existing User/Auth schema
    const hrUser = new User({
      name: invitation.name,
      email: normalizedEmail,
      passwordHash,
      role: "HR",
      status: "Active",
      organisationId: org._id,
      organisationCode: org.organisationCode,
      onboardingCompleted: true,
    })

    await hrUser.save()

    // 3. Link Organisation to HR
    org.hrAdminId = hrUser._id
    await org.save()

    // 4. Mark invitation as Accepted
    invitation.status = "Accepted"
    invitation.acceptedAt = new Date()
    await invitation.save()

    console.log(`[HR INVITATIONS] Invitation accepted: ${hrUser.email} (${hrUser.role}) linked to ${org.name}`)

    await logActivity({
      req,
      user: hrUser,
      action: "Accepted HR Invitation",
      status: "Success",
      organisationId: org.organisationId,
      organisationName: org.name,
      entityType: "User",
      entityId: hrUser._id,
      details: `HR administrator ${hrUser.name} accepted invitation and activated account`,
    })

    return res.status(201).json({
      success: true,
      message: "HR account created successfully. Please login.",
      user: {
        id: hrUser._id,
        name: hrUser.name,
        email: hrUser.email,
        role: hrUser.role,
        organisationId: hrUser.organisationId,
      },
    })
  } catch (err) {
    console.error("[HR INVITATIONS] Accept error:", err.message)
    res.status(500).json({ success: false, message: "Server error creating HR account." })
  }
})

module.exports = router
