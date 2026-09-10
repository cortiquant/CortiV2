const express = require("express")
const router = express.Router()
const crypto = require("crypto")
const mongoose = require("mongoose")
const Organisation = require("../models/Organisation")
const User = require("../models/User")
const HRInvitation = require("../models/HRInvitation")
const Listener = require("../models/Listener")
const ListenerInvitation = require("../models/ListenerInvitation")
const CorporateOnboarding = require("../models/CorporateOnboarding")
const Assessment = require("../models/Assessment")
const ActivityLog = require("../models/ActivityLog")
const { sendHRInvitation, sendListenerInvitation, sendTestEmail, verifySMTP } = require("../services/emailService")
const { logActivity } = require("../services/activityService")
const { ensureDepartmentsForOrg } = require("../services/departmentService")
const { requireAdmin } = require("../middleware/auth")

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: Unique ID and Code Generators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates Organisation ID:
 * Format: "CQ" + 6 random digits (total 8 characters). Example: CQ482731
 */
async function generateUniqueOrganisationId() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString()
    const idCandidate = `CQ${randomDigits}`
    const existing = await Organisation.findOne({ organisationId: idCandidate })
    if (!existing) {
      return idCandidate
    }
  }
  throw new Error("Unable to generate a unique organisation ID. Please try again.")
}

/**
 * Generates Organisation Code:
 * Format: First 4 alphabetic chars of Org Name (padded with uppercase letters if < 4)
 * + 4 random digits (total 8 characters). Example: MERI4827
 */
async function generateUniqueOrganisationCode(name) {
  // Extract only alphabetic characters
  const lettersOnly = (name || "").replace(/[^a-zA-Z]/g, "").toUpperCase()

  let prefix = lettersOnly.slice(0, 4)
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  while (prefix.length < 4) {
    prefix += alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString()
    const codeCandidate = `${prefix}${randomDigits}`
    const existing = await Organisation.findOne({
      $or: [{ organisationCode: codeCandidate }, { code: codeCandidate }],
    })
    if (!existing) {
      return codeCandidate
    }
  }
  throw new Error("Unable to generate a unique organisation code. Please try again.")
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/organisations
//
// Admin/Founder-protected — returns all real organisations with employee counts
// ─────────────────────────────────────────────────────────────────────────────
router.get("/organisations", requireAdmin, async (req, res) => {
  try {
    const orgs = await Organisation.find({})
      .populate("hrAdminId", "name email status createdAt")
      .sort({ createdAt: -1 })

    // Aggregate employee counts per organisation
    const employeeCounts = await User.aggregate([
      { $match: { role: "employee" } },
      { $group: { _id: "$organisationId", count: { $sum: 1 } } },
    ])
    const countMap = new Map(employeeCounts.map((item) => [String(item._id), item.count]))

    const result = orgs.map((org) => {
      const empCount = countMap.get(String(org._id)) || 0
      return {
        _id: org._id,
        organisationId: org.organisationId,
        name: org.name,
        organisationCode: org.organisationCode || org.code,
        code: org.organisationCode || org.code,
        hrAdmin: org.hrAdminId
          ? {
              id: org.hrAdminId._id,
              name: org.hrAdminId.name,
              email: org.hrAdminId.email,
              status: org.hrAdminId.status,
            }
          : null,
        hrName: org.hrAdminId ? org.hrAdminId.name : "Unassigned",
        hrEmail: org.hrAdminId ? org.hrAdminId.email : "",
        employeeCount: empCount,
        employees: empCount,
        status: org.status || (org.isActive ? "Active" : "Inactive"),
        createdAt: org.createdAt,
      }
    })

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    })
  } catch (err) {
    console.error("[ADMIN] Error fetching organisations:", err.message)
    res.status(500).json({ success: false, message: "Unable to fetch organisations. Please try again." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/organisations
//
// Admin/Founder-protected — creates Organisation + HR Invitation
// Expects: { name, hrName, hrEmail } (No hrPassword — HR sets password upon accept)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/organisations", requireAdmin, async (req, res) => {
  const { name, hrName, hrEmail } = req.body

  // 1. Validation
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: "Organisation Name is required." })
  }
  if (!hrName || !hrName.trim()) {
    return res.status(400).json({ success: false, message: "HR Name is required." })
  }
  if (!hrEmail || !hrEmail.trim()) {
    return res.status(400).json({ success: false, message: "HR Email is required." })
  }
  const emailRegex = /^\S+@\S+\.\S+$/
  if (!emailRegex.test(hrEmail.trim())) {
    return res.status(400).json({ success: false, message: "Please enter a valid HR email address." })
  }

  const normalizedEmail = hrEmail.trim().toLowerCase()
  const trimmedName = name.trim()
  const trimmedHRName = hrName.trim()

  // 2. Check if an active account with this email already exists
  const existingUser = await User.findOne({ email: normalizedEmail })
  if (existingUser) {
    return res.status(400).json({ success: false, message: "An account with this email already exists." })
  }

  // 3. Generate IDs
  let organisationId
  let organisationCode
  try {
    organisationId = await generateUniqueOrganisationId()
    organisationCode = await generateUniqueOrganisationCode(trimmedName)
  } catch (genErr) {
    return res.status(500).json({ success: false, message: genErr.message })
  }

  // 4. Creation with fallback cleanup if sessions/replica sets aren't available
  let session = null
  let createdOrg = null
  let createdInvitation = null

  try {
    // Attempt transaction if MongoDB replica set session supported
    try {
      session = await mongoose.startSession()
      session.startTransaction()
    } catch {
      session = null
    }

    // Create organisation doc (HR is not active yet, hrAdminId is null)
    const orgDoc = new Organisation({
      organisationId,
      name: trimmedName,
      organisationCode,
      status: "Active",
      isActive: true,
      hrAdminId: null,
    })

    if (session) {
      await orgDoc.save({ session })
    } else {
      await orgDoc.save()
    }
    createdOrg = orgDoc

    // Generate secure token and invitation doc
    const { rawToken, tokenHash, expiresAt } = HRInvitation.generateToken(7)

    const invitationDoc = new HRInvitation({
      email: normalizedEmail,
      name: trimmedHRName,
      organisationId: orgDoc._id,
      organisationCode: orgDoc.organisationCode,
      invitedBy: req.user?._id || "admin",
      tokenHash,
      expiresAt,
      status: "Pending",
    })

    if (session) {
      await invitationDoc.save({ session })
      await session.commitTransaction()
      session.endSession()
    } else {
      await invitationDoc.save()
    }
    createdInvitation = invitationDoc
    await ensureDepartmentsForOrg(orgDoc.organisationId).catch((dErr) => {
      console.warn("[ADMIN] Could not auto-seed departments:", dErr.message)
    })

    // 5. Send invitation email before concluding creation
    try {
      await sendHRInvitation({
        to: normalizedEmail,
        hrName: trimmedHRName,
        orgName: orgDoc.name,
        orgCode: orgDoc.organisationCode,
        rawToken,
      })
    } catch (emailErr) {
      console.error("[ADMIN] Email dispatch failed:", emailErr.message)
      // Clean up newly created records
      if (invitationDoc._id) {
        await HRInvitation.findByIdAndDelete(invitationDoc._id).catch(() => {})
      }
      if (orgDoc._id) {
        await Organisation.findByIdAndDelete(orgDoc._id).catch(() => {})
      }
      return res.status(500).json({
        success: false,
        message: `Failed to send HR invitation email: ${emailErr.message}. Please verify email configuration.`,
      })
    }

    console.log(`[ADMIN] Organisation created: ${orgDoc.name} (${orgDoc.organisationId}) with HR Invitation sent to: ${normalizedEmail}`)

    await logActivity({
      req,
      user: req.user,
      action: "Created Organisation",
      status: "Success",
      organisationId: orgDoc.organisationId,
      organisationName: orgDoc.name,
      entityType: "Organisation",
      entityId: orgDoc._id,
      details: `Created organisation and provisioned HR administrator (${normalizedEmail})`,
    })

    return res.status(201).json({
      success: true,
      message: "Organisation created and HR invitation sent successfully.",
      organisation: {
        _id: orgDoc._id,
        organisationId: orgDoc.organisationId,
        name: orgDoc.name,
        organisationCode: orgDoc.organisationCode,
      },
      hrInvitation: {
        email: invitationDoc.email,
        status: "Pending",
      },
    })
  } catch (err) {
    console.error("[ADMIN] Organisation creation error:", err.message)

    if (session) {
      try {
        await session.abortTransaction()
        session.endSession()
      } catch {}
    } else {
      // Manual cleanup if transaction was unavailable
      if (createdInvitation && createdInvitation._id) {
        await HRInvitation.findByIdAndDelete(createdInvitation._id).catch(() => {})
      }
      if (createdOrg && createdOrg._id) {
        await Organisation.findByIdAndDelete(createdOrg._id).catch(() => {})
      }
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create organisation. Please try again.",
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/organisations/:id
//
// Admin/Founder-protected — edits organisation name or status.
// Permanent organisationId is preserved and never changed.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/organisations/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { name, status } = req.body

    const org = await Organisation.findOne({
      $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { organisationId: id }],
    })

    if (!org) {
      return res.status(404).json({ success: false, message: "Organisation not found." })
    }

    const oldStatus = org.status
    const statusChanged = status && ["Active", "Pending", "Inactive"].includes(status) && status !== oldStatus

    if (name && name.trim()) {
      org.name = name.trim()
    }

    if (status && ["Active", "Pending", "Inactive"].includes(status)) {
      org.status = status
      org.isActive = status !== "Inactive"
    }

    await org.save()

    await logActivity({
      req,
      user: req.user,
      action: statusChanged ? "Changed Organisation Status" : "Updated Organisation",
      status: "Success",
      organisationId: org.organisationId,
      organisationName: org.name,
      entityType: "Organisation",
      entityId: org._id,
      details: statusChanged
        ? `Changed status of ${org.name} to ${status}`
        : `Updated organisation details for ${org.name}`,
    })

    return res.status(200).json({
      success: true,
      message: "Organisation updated successfully.",
      organisation: {
        _id: org._id,
        organisationId: org.organisationId,
        name: org.name,
        organisationCode: org.organisationCode,
        status: org.status,
      },
    })
  } catch (err) {
    console.error("[ADMIN] Error updating organisation:", err.message)
    res.status(500).json({ success: false, message: "Unable to update organisation. Please try again." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/organisations/:organisationId
//
// Admin/Founder-protected — cascade deletes organisation and all owned records:
// 1. Verifies organisation exists by short organisationId (e.g. CQ798065)
// 2. Cascade deletes:
//    - HR invitations belonging to this organisation
//    - Corporate onboarding records / assessments
//    - Organisation employees (User records with role: employee)
//    - Organisation HR accounts (User records with role: hr/HR)
//    - The Organisation document itself
// 3. Performs operation inside a MongoDB transaction session with fallback
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/organisations/:organisationId", requireAdmin, async (req, res) => {
  const { organisationId } = req.params

  if (!organisationId || !organisationId.trim()) {
    return res.status(400).json({ success: false, message: "Organisation ID is required." })
  }

  const cleanOrgId = organisationId.trim().toUpperCase()

  // 1. Locate the organisation strictly by organisationId (or ObjectId fallback if provided)
  const org = await Organisation.findOne({
    $or: [
      { organisationId: cleanOrgId },
      { _id: mongoose.isValidObjectId(cleanOrgId) ? cleanOrgId : null },
    ],
  })

  if (!org) {
    return res.status(404).json({
      success: false,
      message: "Organisation not found.",
    })
  }

  const orgMongoId = org._id
  const orgCQId = org.organisationId
  const orgCode = org.organisationCode

  // Identifier criteria matching any record linked to this organisation
  const orgMatchCriteria = {
    $or: [
      { organisationId: orgMongoId },
      { organisationId: orgCQId },
      { organisationCode: orgCode },
    ],
  }

  console.log(`[ADMIN] Initiating cascade delete for organisation: ${org.name} (${orgCQId})`)

  // Log BEFORE deleting so organisation information is preserved
  await logActivity({
    req,
    user: req.user,
    action: "Deleted Organisation",
    status: "Success",
    organisationId: orgCQId,
    organisationName: org.name,
    entityType: "Organisation",
    entityId: orgMongoId,
    details: `Deleted organisation ${org.name} and all associated HR/employees/data`,
  })

  let session = null
  try {
    session = await mongoose.startSession()
    session.startTransaction()
  } catch {
    session = null // Deployment does not support replica set transactions
  }

  try {
    const sessionOpt = session ? { session } : {}

    // Find all users (employees & HR) belonging to this organisation so we can also clean up their submissions
    const usersToDelete = await User.find(
      {
        ...orgMatchCriteria,
        role: { $in: ["employee", "Employee", "hr", "HR"] },
      },
      "_id role email",
      sessionOpt
    )

    const userIdsToDelete = usersToDelete.map((u) => u._id)

    // 1. Delete CorporateOnboarding / Assessments / Check-ins
    const onboardingDeleteResult = await CorporateOnboarding.deleteMany(
      {
        $or: [
          { organisationId: orgMongoId },
          { userId: { $in: userIdsToDelete } },
        ],
      },
      sessionOpt
    )

    // 2. Delete HR Invitations (Pending, Accepted, Expired, Revoked)
    const invitationDeleteResult = await HRInvitation.deleteMany(
      {
        $or: [
          { organisationId: orgMongoId },
          { organisationId: orgCQId },
          { organisationCode: orgCode },
        ],
      },
      sessionOpt
    )

    // 3. Delete HR & Employee Users belonging to this organisation
    // (Never delete admins/founders)
    const userDeleteResult = await User.deleteMany(
      {
        ...orgMatchCriteria,
        role: { $in: ["employee", "Employee", "hr", "HR"] },
      },
      sessionOpt
    )

    // 4. Delete the Organisation itself
    const orgDeleteResult = await Organisation.deleteOne(
      { _id: orgMongoId },
      sessionOpt
    )

    if (session) {
      await session.commitTransaction()
      session.endSession()
    }

    console.log(`[ADMIN] Cascade delete complete for ${org.name} (${orgCQId}):`, {
      onboardingsDeleted: onboardingDeleteResult.deletedCount,
      invitationsDeleted: invitationDeleteResult.deletedCount,
      usersDeleted: userDeleteResult.deletedCount,
      orgDeleted: orgDeleteResult.deletedCount,
      deletedBy: req.user?._id || "admin",
    })

    return res.status(200).json({
      success: true,
      message: "Organisation and all associated data deleted successfully.",
      details: {
        organisationId: orgCQId,
        name: org.name,
        usersDeleted: userDeleteResult.deletedCount,
        invitationsDeleted: invitationDeleteResult.deletedCount,
        onboardingRecordsDeleted: onboardingDeleteResult.deletedCount,
      },
    })
  } catch (err) {
    console.error(`[ADMIN] Cascade delete failed for organisation ${orgCQId}:`, err.message)

    if (session) {
      try {
        await session.abortTransaction()
        session.endSession()
      } catch {}
    }

    return res.status(500).json({
      success: false,
      message: "Unable to delete organisation. Please try again.",
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/hr-admins
//
// Admin/Founder-protected — returns all active HR accounts and pending invitations
// ─────────────────────────────────────────────────────────────────────────────
router.get("/hr-admins", requireAdmin, async (req, res) => {
  try {
    // 1. Fetch active/inactive HR users from User collection
    const hrUsers = await User.find({
      role: { $in: ["hr", "HR"] },
    }).sort({ createdAt: -1 })

    // Build org lookup map
    const orgs = await Organisation.find({})
    const orgMapById = new Map(orgs.map((o) => [String(o._id), o]))
    const orgMapByCQ = new Map(orgs.map((o) => [o.organisationId, o]))

    const activeList = hrUsers.map((u) => {
      const org = orgMapById.get(String(u.organisationId)) || orgMapByCQ.get(String(u.organisationId)) || null
      return {
        id: u._id,
        _id: u._id,
        name: u.name,
        email: u.email,
        organisationId: org ? org.organisationId : u.organisationCode || "N/A",
        organisationName: org ? org.name : "Unassigned",
        organisationCode: u.organisationCode || (org ? org.organisationCode : "N/A"),
        status: u.status || "Active",
        type: "account",
        lastLogin: "Recent",
        createdAt: u.createdAt,
      }
    })

    // 2. Fetch invitations that are Pending, Expired, or Revoked
    const invitations = await HRInvitation.find({
      status: { $in: ["Pending", "Expired", "Revoked"] },
    }).sort({ createdAt: -1 })

    const invitationList = invitations.map((inv) => {
      const org = orgMapById.get(String(inv.organisationId)) || orgMapByCQ.get(String(inv.organisationId)) || null
      const isExpired = inv.status === "Pending" && new Date() > new Date(inv.expiresAt)
      return {
        id: inv._id,
        _id: inv._id,
        name: inv.name,
        email: inv.email,
        organisationId: org ? org.organisationId : inv.organisationCode,
        organisationName: org ? org.name : "Unassigned",
        organisationCode: inv.organisationCode,
        status: isExpired ? "Expired" : (inv.status === "Pending" ? "Invitation Pending" : inv.status),
        type: "invitation",
        lastLogin: "Never",
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      }
    })

    // Combined records sorted by createdAt desc
    const combined = [...activeList, ...invitationList].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return res.status(200).json({
      success: true,
      hrAdmins: combined,
    })
  } catch (err) {
    console.error("[ADMIN] Error fetching HR admins:", err.message)
    res.status(500).json({ success: false, message: "Unable to fetch HR admins." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/hr-admins/invite
//
// Admin/Founder-protected — invites an HR Administrator directly to an organisation
// Expects: { name, email, organisationId }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/hr-admins/invite", requireAdmin, async (req, res) => {
  try {
    const { name, email, organisationId } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "HR Name is required." })
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "HR Email is required." })
    }
    const emailRegex = /^\S+@\S+\.\S+$/
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Please enter a valid HR email address." })
    }
    if (!organisationId) {
      return res.status(400).json({ success: false, message: "Organisation is required." })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()

    // 1. Verify organisation exists
    const org = await Organisation.findOne({
      $or: [
        { organisationId: organisationId },
        { _id: mongoose.isValidObjectId(organisationId) ? organisationId : null },
      ],
    })

    if (!org) {
      return res.status(404).json({ success: false, message: "Organisation not found." })
    }

    // 2. Check if user account already exists
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return res.status(400).json({ success: false, message: "An account with this email already exists." })
    }

    // 3. Check for existing pending invitation for same email and organisation
    const existingInvite = await HRInvitation.findOne({
      email: normalizedEmail,
      organisationCode: org.organisationCode,
      status: "Pending",
      expiresAt: { $gt: new Date() },
    })

    if (existingInvite) {
      return res.status(400).json({
        success: false,
        message: "A pending invitation has already been sent to this email for this organisation.",
      })
    }

    // 4. Create secure invitation
    const { rawToken, tokenHash, expiresAt } = HRInvitation.generateToken(7)

    const invitation = new HRInvitation({
      email: normalizedEmail,
      name: trimmedName,
      organisationId: org._id,
      organisationCode: org.organisationCode,
      invitedBy: req.user?._id || "admin",
      tokenHash,
      expiresAt,
      status: "Pending",
    })

    await invitation.save()

    // 5. Send invitation email
    try {
      await sendHRInvitation({
        to: normalizedEmail,
        hrName: trimmedName,
        orgName: org.name,
        orgCode: org.organisationCode,
        rawToken,
      })
    } catch (emailErr) {
      console.error("[ADMIN] Direct HR email dispatch failed:", emailErr.message)
      await HRInvitation.findByIdAndDelete(invitation._id).catch(() => {})
      return res.status(500).json({
        success: false,
        message: `Failed to send HR invitation email: ${emailErr.message}. Please check email configuration.`,
      })
    }

    console.log(`[ADMIN] Direct HR invitation sent: ${normalizedEmail} for ${org.name}`)

    await logActivity({
      req,
      user: req.user,
      action: "Invited HR Administrator",
      status: "Success",
      organisationId: org.organisationId,
      organisationName: org.name,
      entityType: "HRInvitation",
      entityId: invitation._id,
      details: `Invited HR administrator ${trimmedName} (${normalizedEmail}) to ${org.name}`,
    })

    return res.status(201).json({
      success: true,
      message: "HR invitation sent successfully.",
      invitation: {
        id: invitation._id,
        name: invitation.name,
        email: invitation.email,
        organisationId: org.organisationId,
        organisationName: org.name,
        organisationCode: org.organisationCode,
        status: "Invitation Pending",
      },
    })
  } catch (err) {
    console.error("[ADMIN] Error inviting HR:", err.message)
    res.status(500).json({ success: false, message: "Unable to invite HR administrator." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/hr-admins/:invitationId/resend
//
// Admin/Founder-protected — regenerates token and resends invitation email
// ─────────────────────────────────────────────────────────────────────────────
router.post("/hr-admins/:invitationId/resend", requireAdmin, async (req, res) => {
  try {
    const { invitationId } = req.params

    const invitation = await HRInvitation.findById(invitationId)
    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found." })
    }

    if (invitation.status === "Accepted") {
      return res.status(400).json({ success: false, message: "This invitation has already been accepted." })
    }

    // Lookup organisation
    const org = await Organisation.findOne({
      $or: [
        { organisationId: invitation.organisationId },
        { _id: mongoose.isValidObjectId(invitation.organisationId) ? invitation.organisationId : null },
      ],
    })

    // Regenerate token & expiration
    const { rawToken, tokenHash, expiresAt } = HRInvitation.generateToken(7)
    invitation.tokenHash = tokenHash
    invitation.expiresAt = expiresAt
    invitation.status = "Pending"
    await invitation.save()

    // Send email
    try {
      await sendHRInvitation({
        to: invitation.email,
        hrName: invitation.name,
        orgName: org ? org.name : "Your Organisation",
        orgCode: invitation.organisationCode,
        rawToken,
      })
    } catch (emailErr) {
      console.error("[ADMIN] Resend email failed:", emailErr.message)
      return res.status(500).json({
        success: false,
        message: `Failed to resend invitation email: ${emailErr.message}. Please check email configuration.`,
      })
    }

    console.log(`[ADMIN] Invitation resent to: ${invitation.email}`)

    await logActivity({
      req,
      user: req.user,
      action: "Resent HR Invitation",
      status: "Success",
      organisationId: org?.organisationId || invitation.organisationCode,
      organisationName: org?.name || "Organisation",
      entityType: "HRInvitation",
      entityId: invitation._id,
      details: `Resent HR invitation to ${invitation.email}`,
    })

    return res.status(200).json({
      success: true,
      message: "Invitation resent successfully.",
    })
  } catch (err) {
    console.error("[ADMIN] Error resending invitation:", err.message)
    res.status(500).json({ success: false, message: "Unable to resend invitation." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/hr-admins/:invitationId/revoke
//
// Admin/Founder-protected — revokes an outstanding invitation
// ─────────────────────────────────────────────────────────────────────────────
router.post("/hr-admins/:invitationId/revoke", requireAdmin, async (req, res) => {
  try {
    const { invitationId } = req.params

    const invitation = await HRInvitation.findById(invitationId)
    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found." })
    }

    if (invitation.status === "Accepted") {
      return res.status(400).json({ success: false, message: "Cannot revoke an accepted invitation." })
    }

    invitation.status = "Revoked"
    await invitation.save()

    console.log(`[ADMIN] Invitation revoked: ${invitation.email}`)

    await logActivity({
      req,
      user: req.user,
      action: "Revoked HR Invitation",
      status: "Success",
      organisationId: invitation.organisationCode,
      organisationName: null,
      entityType: "HRInvitation",
      entityId: invitation._id,
      details: `Revoked HR invitation for ${invitation.email}`,
    })

    return res.status(200).json({
      success: true,
      message: "Invitation revoked successfully.",
    })
  } catch (err) {
    console.error("[ADMIN] Error revoking invitation:", err.message)
    res.status(500).json({ success: false, message: "Unable to revoke invitation." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/hr-admins/:hrId
//
// Admin/Founder-protected — edits an active HR user's name or status (Active / Inactive)
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/hr-admins/:hrId", requireAdmin, async (req, res) => {
  try {
    const { hrId } = req.params
    const { name, status } = req.body

    const hrUser = await User.findById(hrId)
    if (!hrUser) {
      return res.status(404).json({ success: false, message: "HR account not found." })
    }

    const role = (hrUser.role || "").toLowerCase()
    if (role !== "hr" && role !== "admin") {
      return res.status(400).json({ success: false, message: "Target user is not an HR account." })
    }

    if (name && name.trim()) {
      hrUser.name = name.trim()
    }

    if (status && ["Active", "Inactive", "Approved", "Pending"].includes(status)) {
      hrUser.status = status
    }

    await hrUser.save()

    console.log(`[ADMIN] HR updated: ${hrUser.email} (Status: ${hrUser.status})`)

    return res.status(200).json({
      success: true,
      message: "HR account updated successfully.",
      user: {
        id: hrUser._id,
        name: hrUser.name,
        email: hrUser.email,
        status: hrUser.status,
      },
    })
  } catch (err) {
    console.error("[ADMIN] Error updating HR user:", err.message)
    res.status(500).json({ success: false, message: "Unable to update HR account." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/email/test
//
// Admin/Founder-protected — sends a test email to verify SMTP configuration
// Expects: { email }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/email/test", requireAdmin, async (req, res) => {
  try {
    const { email } = req.body

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Recipient email is required." })
    }

    const emailRegex = /^\S+@\S+\.\S+$/
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address." })
    }

    const result = await sendTestEmail(email.trim().toLowerCase())

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${email.trim()}.`,
      messageId: result.messageId,
    })
  } catch (err) {
    console.error("[ADMIN] Test email failed:", err.message)
    return res.status(500).json({
      success: false,
      message: `Failed to send test email: ${err.message}`,
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/employees
//
// Admin/Founder-protected — returns all employees across all organisations.
// Enriches each employee with:
// - Organisation name, organisationId, organisationCode
// - Department (from participantProfile.D3 if completed)
// - Onboarding status ("Complete", "Pending", or "Not Started")
// - Latest assessment MSI and Archetype
// ─────────────────────────────────────────────────────────────────────────────
router.get("/employees", requireAdmin, async (req, res) => {
  try {
    // 1. Fetch all employees across all organisations
    const employees = await User.find({
      role: { $in: ["employee", "Employee"] },
    })
      .select("-passwordHash")
      .sort({ createdAt: -1 })

    // 2. Fetch all organisations to map names and codes
    const orgs = await Organisation.find({})
    const orgMapById = new Map(orgs.map((o) => [String(o._id), o]))
    const orgMapByCQ = new Map(orgs.map((o) => [o.organisationId, o]))

    // 3. Fetch corporate onboarding records for all retrieved employees
    const employeeUserIds = employees.map((e) => e._id)
    const onboardingRecords = await CorporateOnboarding.find({
      userId: { $in: employeeUserIds },
    })
    const onboardingMap = new Map(onboardingRecords.map((o) => [String(o.userId), o]))

    // 4. Format employee payload
    const result = employees.map((emp) => {
      const org =
        orgMapById.get(String(emp.organisationId)) ||
        orgMapByCQ.get(String(emp.organisationId)) ||
        null

      const onb = onboardingMap.get(String(emp._id))

      let onboardingStatus = "Not Started"
      if (onb) {
        onboardingStatus = onb.onboardingCompleted || emp.onboardingCompleted ? "Complete" : "Pending"
      } else if (emp.onboardingCompleted) {
        onboardingStatus = "Complete"
      }

      const department = onb?.participantProfile?.D3 || "Not assigned"

      return {
        _id: emp._id,
        employeeId: emp.employeeId || "Pending ID",
        name: emp.name,
        email: emp.email,
        organisationId: org ? org.organisationId : String(emp.organisationId || ""),
        organisationName: org ? org.name : "Unassigned Organisation",
        organisationCode: org ? org.organisationCode : emp.organisationCode || "",
        department,
        status: emp.status || "Pending",
        onboardingStatus,
        createdAt: emp.createdAt,
        lastLogin: "Never",
        archetype: onb?.archetype?.primary || null,
        msi: onb?.scores?.msi ?? null,
      }
    })

    return res.status(200).json({
      success: true,
      count: result.length,
      employees: result,
    })
  } catch (err) {
    console.error("[ADMIN] Error fetching global employees:", err.message)
    res.status(500).json({ success: false, message: "Unable to fetch employees. Please try again." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/employees/:employeeId
//
// Admin/Founder-protected — returns full employee details by employeeId (or _id fallback).
// ─────────────────────────────────────────────────────────────────────────────
router.get("/employees/:employeeId", requireAdmin, async (req, res) => {
  try {
    const { employeeId } = req.params

    if (!employeeId || !employeeId.trim()) {
      return res.status(400).json({ success: false, message: "Employee ID is required." })
    }

    const cleanId = employeeId.trim()

    const employee = await User.findOne({
      $and: [
        { role: { $in: ["employee", "Employee"] } },
        {
          $or: [
            { employeeId: cleanId },
            { _id: mongoose.isValidObjectId(cleanId) ? cleanId : null },
          ],
        },
      ],
    }).select("-passwordHash")

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found." })
    }

    // Resolve organisation
    const org = await Organisation.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(employee.organisationId) ? employee.organisationId : null },
        { organisationId: employee.organisationId },
      ],
    })

    // Resolve onboarding
    const onb = await CorporateOnboarding.findOne({ userId: employee._id })

    let onboardingStatus = "Not Started"
    if (onb) {
      onboardingStatus = onb.onboardingCompleted || employee.onboardingCompleted ? "Complete" : "Pending"
    } else if (employee.onboardingCompleted) {
      onboardingStatus = "Complete"
    }

    const departmentName = onb?.participantProfile?.D3 || "Not assigned"

    return res.status(200).json({
      success: true,
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId || "Pending ID",
        name: employee.name,
        email: employee.email,
        organisation: {
          organisationId: org ? org.organisationId : String(employee.organisationId || ""),
          name: org ? org.name : "Unassigned Organisation",
          organisationCode: org ? org.organisationCode : employee.organisationCode || "",
        },
        department: {
          name: departmentName,
        },
        status: employee.status || "Pending",
        onboarding: {
          status: onboardingStatus,
          completedAt: onb?.completedAt || null,
        },
        latestAssessment: {
          msi: onb?.scores?.msi ?? null,
          moodScore: onb?.scores?.moodScore ?? null,
          psychometricScore: onb?.scores?.psychometricScore ?? null,
          physicalScore: onb?.scores?.physicalScore ?? null,
          completedAt: onb?.completedAt || null,
        },
        archetype: onb?.archetype ? {
          primary: onb.archetype.primary,
          secondary: onb.archetype.secondary,
        } : null,
        createdAt: employee.createdAt,
        lastLogin: "Never",
      },
    })
  } catch (err) {
    console.error("[ADMIN] Error fetching employee details:", err.message)
    res.status(500).json({ success: false, message: "Unable to fetch employee details." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/assessments
//
// Admin/Founder-protected — returns global assessment ledger across all organisations.
// Normalizes Corporate Onboarding / Daily Check-in (MSI) and Archetype assessments.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/assessments", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1
    const limit = parseInt(req.query.limit, 10) || 100

    // Fetch completed daily assessments and legacy onboarding assessment records
    const [checkInRecords, onboardingRecords] = await Promise.all([
      Assessment.find({})
        .sort({ completedAt: -1, createdAt: -1 })
        .populate("userId", "name email employeeId status"),
      CorporateOnboarding.find({
        $or: [
          { "scores.msi": { $ne: null } },
          { "archetype.primary": { $ne: null } },
        ],
      })
        .sort({ completedAt: -1, createdAt: -1 })
        .populate("userId", "name email employeeId status"),
    ])

    // Fetch organisations for name/code resolution
    const orgs = await Organisation.find({})
    const orgMapById = new Map(orgs.map((o) => [String(o._id), o]))
    const orgMapByCQ = new Map(orgs.map((o) => [o.organisationId, o]))

    const normalizedList = []

    // 1. Process daily check-in assessment records (Assessment collection)
    for (const record of checkInRecords) {
      const user = record.userId
      if (!user) continue

      const org =
        orgMapById.get(String(record.organisationId)) ||
        orgMapByCQ.get(String(record.organisationId)) ||
        null

      const orgName = org ? org.name : "Unassigned Organisation"
      const orgId = org ? org.organisationId : String(record.organisationId || "")
      const orgCode = org ? org.organisationCode : (record.organisationCode || "")

      const dateStr = record.completedAt || record.createdAt

      normalizedList.push({
        id: String(record._id),
        recordId: record._id,
        employeeId: user.employeeId || record.employeeId || "Pending ID",
        employeeName: user.name,
        employeeEmail: user.email,
        organisationId: orgId,
        organisationName: orgName,
        organisationCode: orgCode,
        type: record.type || "Daily Check-in (MSI)",
        score: Math.round(record.msi),
        scoreDisplay: String(Math.round(record.msi)),
        date: dateStr,
        status: record.status || "Completed",
        breakdown: record.scores || {
          moodScore: null,
          psychometricScore: null,
          physicalScore: null,
        },
      })
    }

    for (const record of onboardingRecords) {
      const user = record.userId
      if (!user) continue // Orphan record protection

      const org =
        orgMapById.get(String(record.organisationId)) ||
        orgMapByCQ.get(String(record.organisationId)) ||
        null

      const orgName = org ? org.name : "Unassigned Organisation"
      const orgId = org ? org.organisationId : String(record.organisationId || "")
      const orgCode = org ? org.organisationCode : ""

      const dateStr = record.completedAt || record.createdAt

      // 1. MSI Assessment entry (if MSI score is present)
      if (record.scores && record.scores.msi !== null && record.scores.msi !== undefined) {
        normalizedList.push({
          id: `${record._id}-msi`,
          recordId: record._id,
          employeeId: user.employeeId || record.employeeId || "Pending ID",
          employeeName: user.name,
          employeeEmail: user.email,
          organisationId: orgId,
          organisationName: orgName,
          organisationCode: orgCode,
          type: "Daily Check-in (MSI)",
          score: Math.round(record.scores.msi),
          scoreDisplay: String(Math.round(record.scores.msi)),
          date: dateStr,
          status: record.onboardingCompleted ? "Completed" : "Incomplete",
          breakdown: {
            moodScore: record.scores.moodScore,
            psychometricScore: record.scores.psychometricScore,
            physicalScore: record.scores.physicalScore,
          },
        })
      }

      // 2. Archetype Assessment entry (if archetype is present)
      if (record.archetype && record.archetype.primary) {
        normalizedList.push({
          id: `${record._id}-archetype`,
          recordId: record._id,
          employeeId: user.employeeId || record.employeeId || "Pending ID",
          employeeName: user.name,
          employeeEmail: user.email,
          organisationId: orgId,
          organisationName: orgName,
          organisationCode: orgCode,
          type: "Archetype",
          score: null,
          scoreDisplay: "N/A",
          archetype: record.archetype.primary,
          secondaryArchetype: record.archetype.secondary || null,
          date: dateStr,
          status: "Completed",
        })
      }
    }

    // Sort newest assessment first
    normalizedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const total = normalizedList.length
    const startIndex = (page - 1) * limit
    const paginated = normalizedList.slice(startIndex, startIndex + limit)

    return res.status(200).json({
      success: true,
      count: paginated.length,
      assessments: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    })
  } catch (err) {
    console.error("[ADMIN] Error fetching global assessments:", err.message)
    res.status(500).json({ success: false, message: "Unable to fetch assessments. Please try again." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/assessments/:id
//
// Admin/Founder-protected — returns detailed summary for a specific assessment record.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/assessments/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    // Handle compound id format: "<recordId>-msi" or "<recordId>-archetype" or raw ObjectId
    const rawId = id.split("-")[0]
    const subType = id.includes("-archetype") ? "Archetype" : "Daily Check-in (MSI)"

    if (!mongoose.isValidObjectId(rawId)) {
      return res.status(404).json({ success: false, message: "Assessment record not found." })
    }

    const record = await CorporateOnboarding.findById(rawId).populate(
      "userId",
      "name email employeeId status"
    )

    if (!record || !record.userId) {
      return res.status(404).json({ success: false, message: "Assessment record not found." })
    }

    const org = await Organisation.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(record.organisationId) ? record.organisationId : null },
        { organisationId: record.organisationId },
      ],
    })

    const user = record.userId
    const orgName = org ? org.name : "Unassigned Organisation"
    const orgId = org ? org.organisationId : String(record.organisationId || "")
    const orgCode = org ? org.organisationCode : ""
    const dateStr = record.completedAt || record.createdAt

    const isArchetype = subType === "Archetype"

    return res.status(200).json({
      success: true,
      assessment: {
        id,
        recordId: record._id,
        employee: {
          employeeId: user.employeeId || record.employeeId || "Pending ID",
          name: user.name,
          email: user.email,
        },
        organisation: {
          organisationId: orgId,
          name: orgName,
          organisationCode: orgCode,
        },
        type: isArchetype ? "Archetype" : "Daily Check-in (MSI)",
        score: isArchetype ? null : (record.scores?.msi !== null ? Math.round(record.scores.msi) : null),
        scoreDisplay: isArchetype ? "N/A" : (record.scores?.msi !== null ? String(Math.round(record.scores.msi)) : "N/A"),
        status: record.onboardingCompleted ? "Completed" : "Incomplete",
        completedAt: dateStr,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        archetype: record.archetype ? {
          primary: record.archetype.primary,
          secondary: record.archetype.secondary,
        } : null,
        scores: !isArchetype && record.scores ? {
          msi: Math.round(record.scores.msi),
          moodScore: record.scores.moodScore,
          psychometricScore: record.scores.psychometricScore,
          physicalScore: record.scores.physicalScore,
        } : null,
      },
    })
  } catch (err) {
    console.error("[ADMIN] Error fetching assessment details:", err.message)
    res.status(500).json({ success: false, message: "Unable to fetch assessment details." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/activity-logs
//
// Admin/Founder-protected — returns paginated and searchable system-wide audit logs.
// Supports: page, limit, search, role, status, action, organisationId, startDate, endDate
// ─────────────────────────────────────────────────────────────────────────────
router.get("/activity-logs", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const { search, role, status, action, organisationId, startDate, endDate } = req.query

    const filter = {}

    // Role filter
    if (role && role.trim()) {
      filter.role = new RegExp(`^${role.trim()}$`, "i")
    }

    // Status filter ("Success" | "Failed")
    if (status && status.trim()) {
      filter.status = status.trim()
    }

    // Action filter
    if (action && action.trim()) {
      filter.action = new RegExp(action.trim(), "i")
    }

    // Organisation filter
    if (organisationId && organisationId.trim()) {
      filter.organisationId = organisationId.trim()
    }

    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {}
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        filter.timestamp.$lte = end
      }
    }

    // Keyword search across userName, organisationName, organisationId, action, role, details
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i")
      filter.$or = [
        { userName: searchRegex },
        { organisationName: searchRegex },
        { organisationId: searchRegex },
        { action: searchRegex },
        { role: searchRegex },
        { details: searchRegex },
      ]
    }

    const total = await ActivityLog.countDocuments(filter)
    const logs = await ActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    return res.status(200).json({
      success: true,
      logs: logs.map((l) => ({
        _id: l._id,
        timestamp: l.timestamp,
        userName: l.userName,
        role: l.role,
        organisationId: l.organisationId,
        organisationName: l.organisationName,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        status: l.status,
        details: l.details,
        ipAddress: l.ipAddress,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    })
  } catch (err) {
    console.error("[ADMIN] Error fetching activity logs:", err.message)
    res.status(500).json({ success: false, message: "Unable to fetch activity logs. Please try again." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/settings/profile
//
// Admin/Founder-protected — returns authenticated admin profile safely.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/settings/profile", requireAdmin, async (req, res) => {
  try {
    const user = req.user

    // Fetch fresh from DB if req.user has an _id or email
    let dbUser = null
    if (mongoose.isValidObjectId(user._id)) {
      dbUser = await User.findById(user._id)
    } else if (user.email) {
      dbUser = await User.findOne({ email: user.email.toLowerCase(), role: "admin" })
    }

    const adminData = {
      id: dbUser?._id || user._id,
      name: dbUser?.name || user.name || "Founder",
      email: dbUser?.email || user.email || "soham.founder@gmail.com",
      role: "Founder",
    }

    return res.status(200).json({
      success: true,
      admin: adminData,
    })
  } catch (err) {
    console.error("[ADMIN] Error fetching profile settings:", err.message)
    res.status(500).json({ success: false, message: "Unable to load settings. Please try again." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/settings/profile
//
// Admin/Founder-protected — updates admin's display name. Email is read-only.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/settings/profile", requireAdmin, async (req, res) => {
  try {
    const { name } = req.body

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name is required." })
    }

    const cleanName = name.trim()
    const user = req.user

    let dbUser = null
    if (mongoose.isValidObjectId(user._id)) {
      dbUser = await User.findById(user._id)
    } else if (user.email) {
      dbUser = await User.findOne({ email: user.email.toLowerCase(), role: "admin" })
    }

    if (!dbUser) {
      // If user doesn't exist yet in DB, create it
      dbUser = await User.create({
        name: cleanName,
        email: (user.email || "soham.founder@gmail.com").toLowerCase(),
        passwordHash: await User.hashPassword("soam@mru"),
        role: "admin",
        status: "Approved",
      })
    } else {
      dbUser.name = cleanName
      await dbUser.save()
    }

    await logActivity({
      req,
      user: dbUser,
      action: "Updated Admin Profile",
      status: "Success",
      entityType: "User",
      entityId: dbUser._id,
      details: `Updated administrator profile name to ${cleanName}`,
    })

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      admin: {
        id: dbUser._id,
        name: dbUser.name,
        email: dbUser.email,
        role: "Founder",
      },
    })
  } catch (err) {
    console.error("[ADMIN] Error updating profile settings:", err.message)

    await logActivity({
      req,
      user: req.user,
      action: "Updated Admin Profile",
      status: "Failed",
      details: "Administrator profile update failed",
    })

    res.status(500).json({ success: false, message: "Unable to update profile. Please try again." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/settings/password
//
// Admin/Founder-protected — verifies current password and updates password hash.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/settings/password", requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long.",
      })
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must differ from current password.",
      })
    }

    const user = req.user

    let dbUser = null
    if (mongoose.isValidObjectId(user._id)) {
      dbUser = await User.findById(user._id).select("+passwordHash")
    } else if (user.email) {
      dbUser = await User.findOne({ email: user.email.toLowerCase(), role: "admin" }).select("+passwordHash")
    }

    // Verify current password
    let isCurrentValid = false
    if (dbUser && dbUser.passwordHash) {
      isCurrentValid = await dbUser.comparePassword(currentPassword)
    } else if (currentPassword === "soam@mru") {
      isCurrentValid = true
    }

    if (!isCurrentValid) {
      await logActivity({
        req,
        user: req.user,
        action: "Changed Password",
        status: "Failed",
        details: "Incorrect current password",
      })

      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      })
    }

    // Hash and persist new password
    const newHash = await User.hashPassword(newPassword)

    if (!dbUser) {
      dbUser = await User.create({
        name: user.name || "Soham (Founder)",
        email: (user.email || "soham.founder@gmail.com").toLowerCase(),
        passwordHash: newHash,
        role: "admin",
        status: "Approved",
      })
    } else {
      dbUser.passwordHash = newHash
      await dbUser.save()
    }

    await logActivity({
      req,
      user: dbUser,
      action: "Changed Password",
      status: "Success",
      entityType: "User",
      entityId: dbUser._id,
      details: "Administrator password changed",
    })

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    })
  } catch (err) {
    console.error("[ADMIN] Error changing password:", err.message)

    await logActivity({
      req,
      user: req.user,
      action: "Changed Password",
      status: "Failed",
      details: "Administrator password change failed",
    })

    res.status(500).json({ success: false, message: "Unable to change password. Please try again." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/stats
//
// Admin/Founder-protected — returns live aggregated counts directly from MongoDB.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/dashboard/stats", requireAdmin, async (req, res) => {
  try {
    const [
      totalOrganisations,
      activeOrganisations,
      totalEmployees,
      assessmentsCompleted,
    ] = await Promise.all([
      // Total organisations in MongoDB
      Organisation.countDocuments({}),

      // Active organisations (status: 'Active' or fallback isActive: true)
      Organisation.countDocuments({
        $or: [{ status: "Active" }, { status: { $exists: false }, isActive: true }],
      }),

      // Total real employee accounts
      User.countDocuments({ role: { $in: ["employee", "Employee"] } }),

      // Assessments completed (Daily check-ins in Assessment model + any legacy records)
      Promise.all([
        Assessment.countDocuments({}),
        CorporateOnboarding.countDocuments({
          $or: [
            { "scores.msi": { $ne: null } },
            { "archetype.primary": { $ne: null } },
          ],
        }),
      ]).then(([a, b]) => a + b),
    ])

    return res.status(200).json({
      success: true,
      stats: {
        totalOrganisations,
        totalEmployees,
        assessmentsCompleted,
        activeOrganisations,
      },
    })
  } catch (err) {
    console.error("[ADMIN] Error calculating dashboard stats:", err.message)
    res.status(500).json({ success: false, message: "Unable to load dashboard statistics." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: Unique Listener ID Generator
// Format: "LST" + 6 random digits (total 9 characters). Example: LST482731
// ─────────────────────────────────────────────────────────────────────────────
async function generateUniqueListenerId() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString()
    const idCandidate = `LST${randomDigits}`
    const existing = await Listener.findOne({ listenerId: idCandidate })
    if (!existing) {
      return idCandidate
    }
  }
  throw new Error("Unable to generate a unique listener ID. Please try again.")
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/listeners
//
// Admin/Founder-protected — returns all listeners & invitations
// ─────────────────────────────────────────────────────────────────────────────
router.get("/listeners", requireAdmin, async (req, res) => {
  try {
    const [listeners, invitations] = await Promise.all([
      Listener.find({}).sort({ createdAt: -1 }),
      ListenerInvitation.find({ status: { $in: ["Pending", "Revoked", "Expired"] } }).sort({ createdAt: -1 }),
    ])

    // Fetch all listener sessions to compute performance per listener
    const ListenerSession = require("../models/ListenerSession")
    const allSessions = await ListenerSession.find({})
    const sessionsByListener = new Map()

    allSessions.forEach((s) => {
      const lid = s.listenerId ? s.listenerId.toString() : null
      if (!lid) return
      if (!sessionsByListener.has(lid)) {
        sessionsByListener.set(lid, [])
      }
      sessionsByListener.get(lid).push(s)
    })

    // Build unified list for Admin UI
    const result = []

    // 1. Existing Listener accounts
    listeners.forEach((l) => {
      const lidStr = l._id.toString()
      const lSessions = sessionsByListener.get(lidStr) || []
      let completedCount = 0
      let notCompletedCount = 0

      lSessions.forEach((s) => {
        const st = String(s.status).toLowerCase()
        if (st === "completed") {
          completedCount++
        } else if (["cancelled", "declined", "expired", "no show", "no_show", "skipped"].includes(st)) {
          notCompletedCount++
        }
      })

      const totalTracked = completedCount + notCompletedCount
      const completionRate = totalTracked > 0 ? Math.round((completedCount / totalTracked) * 100) : 100

      result.push({
        id: l._id.toString(),
        _id: l._id.toString(),
        listenerId: l.listenerId,
        name: l.name,
        email: l.email,
        status: l.status, // "Active" | "Pending" | "Inactive"
        invitedAt: l.invitedAt,
        acceptedAt: l.acceptedAt,
        lastLoginAt: l.lastLoginAt,
        createdAt: l.createdAt,
        type: "account",
        performance: {
          totalSessions: lSessions.length,
          completedSessions: completedCount,
          notCompletedSessions: notCompletedCount,
          completionRate,
        },
      })
    })

    // 2. Pending invitations that haven't been accepted yet
    invitations.forEach((inv) => {
      // If already present as an account, check if pending
      const alreadyInList = result.some(
        (r) => r.email.toLowerCase() === inv.email.toLowerCase() && r.type === "account"
      )

      if (!alreadyInList) {
        result.push({
          id: inv._id.toString(),
          invitationId: inv._id.toString(),
          listenerId: inv.listenerId,
          name: inv.name,
          email: inv.email,
          status: inv.status === "Pending" ? "Pending" : inv.status,
          invitedAt: inv.createdAt,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
          type: "invitation",
        })
      }
    })

    return res.status(200).json({
      success: true,
      count: result.length,
      listeners: result,
    })
  } catch (err) {
    console.error("[ADMIN] Error fetching listeners:", err.message)
    res.status(500).json({ success: false, message: "Unable to load listeners. Please try again." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/listeners/invite
//
// Admin/Founder-protected — generates token, saves invitation and pending account,
// and sends invitation email.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/listeners/invite", requireAdmin, async (req, res) => {
  try {
    const { name, email } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Listener name is required." })
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Listener email is required." })
    }

    const emailRegex = /^\S+@\S+\.\S+$/
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." })
    }

    const trimmedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()

    // 1. Check whether active listener already exists
    const existingListener = await Listener.findOne({ email: normalizedEmail })
    if (existingListener && existingListener.status === "Active") {
      return res.status(409).json({
        success: false,
        message: "An active listener account with this email already exists.",
      })
    }

    // 2. Generate unique listener ID
    const listenerId = existingListener?.listenerId || (await generateUniqueListenerId())

    // 3. Generate secure token
    const { rawToken, tokenHash, expiresAt } = ListenerInvitation.generateToken(72)

    // 4. Invalidate any existing pending invitations for this email
    await ListenerInvitation.updateMany(
      { email: normalizedEmail, status: "Pending" },
      { status: "Revoked" }
    )

    // 5. Create new ListenerInvitation record
    const invitation = await ListenerInvitation.create({
      name: trimmedName,
      email: normalizedEmail,
      listenerId,
      tokenHash,
      expiresAt,
      status: "Pending",
      invitedBy: req.user?.email || "Founder/Admin",
    })

    // 6. Pre-create pending Listener record if not present
    if (!existingListener) {
      // Temporary random password hash until accepted
      const placeholderHash = await Listener.hashPassword(crypto.randomBytes(24).toString("hex"))
      await Listener.create({
        listenerId,
        name: trimmedName,
        email: normalizedEmail,
        passwordHash: placeholderHash,
        role: "LISTENER",
        status: "Pending",
        invitedBy: req.user?.email || "Founder/Admin",
        invitedAt: new Date(),
      })
    } else {
      existingListener.name = trimmedName
      existingListener.status = "Pending"
      existingListener.invitedAt = new Date()
      await existingListener.save()
    }

    // 7. Send invitation email
    const emailResult = await sendListenerInvitation({
      to: normalizedEmail,
      listenerName: trimmedName,
      rawToken,
    })

    // 8. Audit activity log
    await logActivity({
      req,
      action: "Listener Invitation Sent",
      status: "Success",
      entityType: "Listener",
      details: `Invited listener: ${trimmedName} (${normalizedEmail}, ${listenerId})`,
    })

    return res.status(201).json({
      success: true,
      message: `Invitation successfully sent to ${normalizedEmail}.`,
      listener: {
        listenerId,
        name: trimmedName,
        email: normalizedEmail,
        status: "Pending",
        expiresAt,
      },
      invitation: {
        id: invitation._id,
      },
      emailDelivery: emailResult?.success ?? true,
    })
  } catch (err) {
    console.error("[ADMIN] Error inviting listener:", err.message)
    res.status(500).json({ success: false, message: err.message || "Failed to invite listener." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/listeners/invitations/:id/resend
//
// Admin/Founder-protected — invalidates previous token and resends a fresh invitation
// ─────────────────────────────────────────────────────────────────────────────
router.post("/listeners/invitations/:id/resend", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    let invitation = await ListenerInvitation.findById(id)
    if (!invitation) {
      // Try finding by listenerId or email if account ID was passed
      const listener = await Listener.findById(id)
      if (listener) {
        invitation = await ListenerInvitation.findOne({ email: listener.email.toLowerCase() }).sort({ createdAt: -1 })
      }
    }

    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found." })
    }

    if (invitation.status === "Accepted") {
      return res.status(400).json({ success: false, message: "This listener account has already been accepted and is active." })
    }

    // Invalidate old token
    invitation.status = "Revoked"
    await invitation.save()

    // Generate fresh token
    const { rawToken, tokenHash, expiresAt } = ListenerInvitation.generateToken(72)

    const newInvitation = await ListenerInvitation.create({
      name: invitation.name,
      email: invitation.email,
      listenerId: invitation.listenerId,
      tokenHash,
      expiresAt,
      status: "Pending",
      invitedBy: req.user?.email || "Founder/Admin",
    })

    // Send email
    const emailResult = await sendListenerInvitation({
      to: newInvitation.email,
      listenerName: newInvitation.name,
      rawToken,
    })

    // Activity Log
    await logActivity({
      req,
      action: "Listener Invitation Resent",
      status: "Success",
      entityType: "Listener",
      details: `Resent invitation to listener: ${newInvitation.name} (${newInvitation.email})`,
    })

    return res.status(200).json({
      success: true,
      message: `Invitation resent to ${newInvitation.email}.`,
      expiresAt,
      emailDelivery: emailResult?.success ?? true,
    })
  } catch (err) {
    console.error("[ADMIN] Error resending listener invitation:", err.message)
    res.status(500).json({ success: false, message: "Failed to resend invitation." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/listeners/invitations/:id/revoke
//
// Admin/Founder-protected — revokes pending invitation
// ─────────────────────────────────────────────────────────────────────────────
router.post("/listeners/invitations/:id/revoke", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    let invitation = await ListenerInvitation.findById(id)
    if (!invitation) {
      const listener = await Listener.findById(id)
      if (listener) {
        invitation = await ListenerInvitation.findOne({ email: listener.email.toLowerCase() }).sort({ createdAt: -1 })
      }
    }

    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found." })
    }

    if (invitation.status === "Accepted") {
      return res.status(400).json({ success: false, message: "Cannot revoke an invitation that has already been accepted." })
    }

    invitation.status = "Revoked"
    await invitation.save()

    // Activity Log
    await logActivity({
      req,
      action: "Listener Invitation Revoked",
      status: "Success",
      entityType: "Listener",
      details: `Revoked invitation for ${invitation.name} (${invitation.email})`,
    })

    return res.status(200).json({
      success: true,
      message: "Invitation revoked.",
    })
  } catch (err) {
    console.error("[ADMIN] Error revoking listener invitation:", err.message)
    res.status(500).json({ success: false, message: "Failed to revoke invitation." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/listeners/:id/status
//
// Admin/Founder-protected — toggles account status between Active and Inactive
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/listeners/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'Active' or 'Inactive'." })
    }

    const listener = await Listener.findById(id)
    if (!listener) {
      return res.status(404).json({ success: false, message: "Listener account not found." })
    }

    listener.status = status
    await listener.save()

    const actionTitle = status === "Active" ? "Listener Reactivated" : "Listener Disabled"

    await logActivity({
      req,
      action: actionTitle,
      status: "Success",
      entityType: "Listener",
      entityId: listener._id,
      details: `Listener ${listener.name} (${listener.listenerId}) status changed to ${status}`,
    })

    return res.status(200).json({
      success: true,
      message: `Listener status updated to ${status}.`,
      listener: listener.toSafeObject(),
    })
  } catch (err) {
    console.error("[ADMIN] Error updating listener status:", err.message)
    res.status(500).json({ success: false, message: "Failed to update listener status." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/listeners/:id
//
// Admin/Founder-protected — permanently deletes listener and cascade removes invitations
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/listeners/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Valid listener ID is required." })
    }

    let deletedName = ""
    let deletedEmail = ""
    let deletedListenerId = ""
    let listenerFound = false

    // 1. Check in Listener collection
    const listener = await Listener.findById(id)
    if (listener) {
      listenerFound = true
      deletedName = listener.name
      deletedEmail = listener.email
      deletedListenerId = listener.listenerId

      // Delete the actual listener account record
      await Listener.findByIdAndDelete(id)

      // Cascade delete any related invitation records for this listener by email or listenerId
      await ListenerInvitation.deleteMany({
        $or: [
          { email: deletedEmail.toLowerCase() },
          { listenerId: deletedListenerId },
        ],
      })
    } else {
      // 2. Check if it was an invitation record (e.g. pending invitation ID passed)
      const invitation = await ListenerInvitation.findById(id)
      if (invitation) {
        listenerFound = true
        deletedName = invitation.name
        deletedEmail = invitation.email
        deletedListenerId = invitation.listenerId

        // Delete invitation record
        await ListenerInvitation.findByIdAndDelete(id)

        // Also clean up any associated pending Listener record with matching email or listenerId
        await Listener.deleteMany({
          $or: [
            { email: deletedEmail.toLowerCase() },
            { listenerId: deletedListenerId },
          ],
        })
      }
    }

    if (!listenerFound) {
      return res.status(404).json({ success: false, message: "Listener record not found." })
    }

    // 3. Activity Audit Log
    await logActivity({
      req,
      action: "Listener Deleted",
      status: "Success",
      entityType: "Listener",
      details: `Permanently deleted listener: ${deletedName} (${deletedEmail}, ${deletedListenerId})`,
    })

    console.log(`[ADMIN] Permanently deleted listener: ${deletedName} (${deletedEmail}, ${deletedListenerId})`)

    return res.status(200).json({
      success: true,
      message: `Listener ${deletedName} (${deletedListenerId}) has been permanently deleted.`,
    })
  } catch (err) {
    console.error("[ADMIN] Error deleting listener:", err.message)
    return res.status(500).json({ success: false, message: "Failed to delete listener. Please try again." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/listeners/:id/sessions
//
// Admin/Founder-protected — returns complete session history for a listener
// with filter support (?filter=completed|not_completed|all)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/listeners/:id/sessions", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { filter } = req.query
    const ListenerSession = require("../models/ListenerSession")

    let listenerDoc = null
    if (mongoose.isValidObjectId(id)) {
      listenerDoc = await Listener.findById(id)
    }
    if (!listenerDoc) {
      listenerDoc = await Listener.findOne({ listenerId: String(id).toUpperCase() })
    }

    if (!listenerDoc) {
      return res.status(404).json({ success: false, message: "Listener not found." })
    }

    const sessions = await ListenerSession.find({ listenerId: listenerDoc._id }).sort({ createdAt: -1 })

    const completed = []
    const notCompleted = []

    sessions.forEach((s) => {
      const durMin = s.actualDurationMinutes || s.durationMinutes || s.duration || 10
      const item = {
        id: s._id.toString(),
        sessionId: s.sessionId,
        clientId: s.clientId || "Anonymous Participant",
        date: s.date,
        time: s.time,
        startTime: s.startTime || s.time,
        endTime: s.endTime || null,
        duration: durMin,
        durationMinutes: durMin,
        dur: `${durMin} min`,
        status: s.status,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        completedAt: s.completedAt,
        cancelledAt: s.cancelledAt,
        cancelledBy: s.cancelledBy,
        cancelReason: s.cancelReason || (["Cancelled", "CANCELLED", "cancelled"].includes(s.status) ? "Cancelled" : ["Expired", "EXPIRED", "expired"].includes(s.status) ? "Expired" : ["Declined"].includes(s.status) ? "Declined by listener" : "Not attended"),
      }

      const st = String(s.status).toLowerCase()
      if (st === "completed") {
        completed.push({
          ...item,
          category: "Completed",
        })
      } else if (["cancelled", "declined", "expired", "no show", "no_show", "skipped"].includes(st)) {
        notCompleted.push({
          ...item,
          category: "Not Completed",
        })
      }
    })

    const totalTracked = completed.length + notCompleted.length
    const completionRate = totalTracked > 0 ? Math.round((completed.length / totalTracked) * 100) : 100

    let filtered = [...completed, ...notCompleted]
    if (filter === "completed") {
      filtered = completed
    } else if (filter === "not_completed") {
      filtered = notCompleted
    }

    return res.status(200).json({
      success: true,
      listener: {
        id: listenerDoc._id.toString(),
        name: listenerDoc.name,
        email: listenerDoc.email,
        listenerId: listenerDoc.listenerId,
      },
      performance: {
        totalSessions: sessions.length,
        completedSessions: completed.length,
        notCompletedSessions: notCompleted.length,
        completionRate,
      },
      sessions: {
        completed,
        notCompleted,
        all: filtered,
      },
    })
  } catch (err) {
    console.error("[ADMIN] Error fetching listener sessions:", err.message)
    return res.status(500).json({ success: false, message: "Failed to load listener session history." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/listeners/:id/performance
//
// Admin/Founder-protected — returns listener performance metrics
// ─────────────────────────────────────────────────────────────────────────────
router.get("/listeners/:id/performance", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const ListenerSession = require("../models/ListenerSession")

    let listenerDoc = null
    if (mongoose.isValidObjectId(id)) {
      listenerDoc = await Listener.findById(id)
    }
    if (!listenerDoc) {
      listenerDoc = await Listener.findOne({ listenerId: String(id).toUpperCase() })
    }

    if (!listenerDoc) {
      return res.status(404).json({ success: false, message: "Listener not found." })
    }

    const performance = await calculateListenerPerformance(listenerDoc._id)

    return res.status(200).json({
      success: true,
      performance,
    })
  } catch (err) {
    console.error("[ADMIN] Error fetching listener performance:", err.message)
    return res.status(500).json({ success: false, message: "Failed to load listener performance." })
  }
})

async function calculateListenerPerformance(listenerId) {
  const ListenerSession = require("../models/ListenerSession")
  const sessions = await ListenerSession.find({ listenerId })

  let completedSessions = 0
  let notCompletedSessions = 0

  sessions.forEach((s) => {
    const st = String(s.status).toLowerCase()
    if (st === "completed" || s.completed) {
      completedSessions++
    } else if (["cancelled", "declined", "expired", "no show", "no_show", "skipped"].includes(st) || s.cancelledAt) {
      notCompletedSessions++
    }
  })

  const totalTracked = completedSessions + notCompletedSessions
  const completionRate = totalTracked > 0 ? Math.round((completedSessions / totalTracked) * 100) : 100

  return {
    totalSessions: sessions.length,
    completedSessions,
    notCompletedSessions,
    completionRate,
  }
}

module.exports = router
module.exports.calculateListenerPerformance = calculateListenerPerformance
