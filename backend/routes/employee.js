const express = require("express")
const router = express.Router()
const User = require("../models/User")
const CorporateOnboarding = require("../models/CorporateOnboarding")
const Assessment = require("../models/Assessment")
const { requireActiveEmployee, requireEmployee } = require("../middleware/auth")
const { logActivity } = require("../services/activityService")
const { sendEmailChangeVerificationCode } = require("../services/emailService")

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/employee/account
//
// Protected — permanently deletes the authenticated employee's account
// and cleans up all associated personal data safely.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/account", requireEmployee, async (req, res) => {
  try {
    const userId = req.user._id
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found." })
    }

    const orgId = user.organisationId ? user.organisationId.toString() : null
    const clientId = user.clientId

    // Load models
    const RootCauseAssessment = require("../models/RootCauseAssessment")
    const Recommendation = require("../models/Recommendation")
    const InterventionSession = require("../models/InterventionSession")
    const Notification = require("../models/Notification")
    const ListenerSession = require("../models/ListenerSession")
    const ListenerMessage = require("../models/ListenerMessage")

    // 1. Delete Corporate Onboarding record
    await CorporateOnboarding.deleteMany({ userId }).catch((err) => {
      console.warn("[DELETE-ACCOUNT] Onboarding deletion warning:", err.message)
    })

    // 2. Delete Assessments (daily check-ins, baseline MSI, etc.)
    await Assessment.deleteMany({ userId }).catch((err) => {
      console.warn("[DELETE-ACCOUNT] Assessment deletion warning:", err.message)
    })

    // 3. Delete RootCauseAssessments
    await RootCauseAssessment.deleteMany({ userId }).catch((err) => {
      console.warn("[DELETE-ACCOUNT] Root cause assessment deletion warning:", err.message)
    })

    // 4. Delete Recommendations
    await Recommendation.deleteMany({ employeeId: userId }).catch((err) => {
      console.warn("[DELETE-ACCOUNT] Recommendation deletion warning:", err.message)
    })

    // 5. Delete Intervention Sessions
    await InterventionSession.deleteMany({ employeeId: userId }).catch((err) => {
      console.warn("[DELETE-ACCOUNT] Intervention sessions deletion warning:", err.message)
    })

    // 6. Delete Notifications
    await Notification.deleteMany({ userId }).catch((err) => {
      console.warn("[DELETE-ACCOUNT] Notifications deletion warning:", err.message)
    })

    // 7. Handle Listener Sessions & Messages safely:
    // Find peer sessions booked by this employee
    const sessions = await ListenerSession.find({ employeeId: userId }).select("_id").lean().catch(() => [])
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s) => s._id)
      // Delete chat messages associated with these sessions
      await ListenerMessage.deleteMany({ sessionId: { $in: sessionIds } }).catch((err) => {
        console.warn("[DELETE-ACCOUNT] Listener messages deletion warning:", err.message)
      })
      // Delete or anonymize listener sessions
      await ListenerSession.deleteMany({ employeeId: userId }).catch((err) => {
        console.warn("[DELETE-ACCOUNT] Listener sessions deletion warning:", err.message)
      })
    }
    // Also clean up any messages where senderId is this user
    await ListenerMessage.deleteMany({ senderId: userId }).catch((err) => {
      console.warn("[DELETE-ACCOUNT] Extra messages deletion warning:", err.message)
    })

    // 8. Audit log for compliance before deleting User document (preserves audit integrity without personal info)
    await logActivity({
      req,
      user: {
        _id: userId,
        name: "Anonymous Former Employee",
        email: "deleted@cortiquant.com",
        role: "employee",
      },
      action: "Account Deleted",
      status: "Success",
      entityType: "User",
      entityId: userId,
      details: `Employee account deleted by user. All associated personal records were purged.`,
    }).catch(() => {})

    // 9. Delete the User record
    await User.findByIdAndDelete(userId)

    return res.status(200).json({
      success: true,
      message: "Your account has been deleted successfully.",
    })
  } catch (err) {
    console.error("[EMPLOYEE] DELETE /account error:", err.message)
    return res.status(500).json({
      success: false,
      message: "Server error deleting account. Please try again or contact support.",
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Returns real MongoDB profile details for the authenticated employee.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/profile", requireActiveEmployee, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: "Employee not found." })
    }

    // Fetch participant profile if exists
    const onboarding = await CorporateOnboarding.findOne({
      userId: user._id,
    })

    const p = onboarding?.participantProfile || {}

    // Fetch latest daily checkin
    const latestDaily = await Assessment.findOne({
      userId: user._id,
      type: "Daily Check-in (MSI)",
    }).sort({ completedAt: -1 })

    // Fetch latest of any assessment
    const latestAny = await Assessment.findOne({
      userId: user._id,
    }).sort({ completedAt: -1 })

    // Determine organisation membership / request status
    const isOrgApproved = (
      user.organisationLink?.status === "approved" ||
      (user.organisationId && user.employeeId && (user.status === "Approved" || user.status === "Active"))
    )
    const isOrgPending = (
      !isOrgApproved && (
        user.organisationLink?.status === "pending" ||
        (user.organisationId && user.status === "PendingApproval")
      )
    )
    const isOrgRejected = (
      !isOrgApproved && !isOrgPending && (
        user.organisationLink?.status === "rejected" ||
        user.status === "Rejected"
      )
    )

    // Fetch organisation if user is linked or pending or rejected
    let orgDoc = null
    const targetOrgId = user.organisationId || user.organisationLink?.organisationId
    if (targetOrgId) {
      const Organisation = require("../models/Organisation")
      orgDoc = await Organisation.findOne({
        $or: [
          { _id: require("mongoose").isValidObjectId(targetOrgId) ? targetOrgId : null },
          { organisationId: targetOrgId },
          { organisationCode: user.organisationCode || user.organisationLink?.organisationCode },
        ],
      })
    }

    const orgName = orgDoc?.name || user.organisationLink?.organisationName || null
    const orgId = String(orgDoc?._id || orgDoc?.organisationId || user.organisationId || user.organisationLink?.organisationId || "")

    let organisationObj = null
    if (isOrgApproved) {
      organisationObj = {
        id: orgId,
        name: orgName || "Organisation",
        status: "approved",
        employeeId: user.employeeId || null,
        department: user.department || user.organisationLink?.department || p.D3 || null,
        workingHours: user.organisationLink?.workingHours || p.D6 || null,
        workType: user.organisationLink?.workType || p.D8 || null,
      }
    } else if (isOrgPending) {
      organisationObj = {
        id: orgId,
        name: orgName || "Organisation",
        status: "pending",
        department: user.department || user.organisationLink?.department || p.D3 || null,
        workingHours: user.organisationLink?.workingHours || p.D6 || null,
        workType: user.organisationLink?.workType || p.D8 || null,
      }
    } else if (isOrgRejected) {
      organisationObj = {
        id: orgId,
        name: orgName || "Organisation",
        status: "rejected",
        ...(user.rejectionReason || user.organisationLink?.rejectionReason ? { rejectionReason: user.rejectionReason || user.organisationLink?.rejectionReason } : {}),
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        username: user.username || "—",
        email: user.email || "—",
        // Personal B2C profile fields
        age: user.age != null ? user.age : (p.D1 || null),
        gender: user.gender || p.D2 || null,
        occupation: user.occupation || null,
        sleepHours: user.sleepHours != null ? user.sleepHours : null,
        illnessHistory: user.illnessHistory || null,
        profileCompleted: user.profileCompleted || false,
        archetype: user.archetype || null,
        msi: Array.isArray(user.msi) ? user.msi : [],
        // Authoritative organisation object per Section 9
        organisation: organisationObj,
        organisationId: isOrgApproved ? (user.organisationId || null) : null,
        organisationCode: isOrgApproved ? (user.organisationCode || null) : null,
        organisationName: isOrgApproved ? orgName : null,
        employeeId: isOrgApproved ? (user.employeeId || null) : null,
        department: isOrgApproved ? (user.department || p.D3 || null) : null,
        departmentId: isOrgApproved ? (user.departmentId || null) : null,
        designation: isOrgApproved ? (p.D4 || null) : null,
        tenure: isOrgApproved ? (p.D5 || null) : null,
        weeklyWorkload: isOrgApproved ? (p.D6 || null) : null,
        workloadIntensity: isOrgApproved ? (p.D7 || null) : null,
        workArrangement: isOrgApproved ? (p.D8 || user.organisationLink?.workType || null) : null,
        workType: isOrgApproved ? (p.D8 || user.organisationLink?.workType || null) : null,
        // Status & Link details
        status: user.status,
        organisationLink: user.organisationLink || { status: isOrgApproved ? "approved" : isOrgPending ? "pending" : isOrgRejected ? "rejected" : "none" },
        ageRange: p.D1 || null,
        baselineMsi: user.baselineMsi ?? null,
        baselineCompletedAt: user.baselineCompletedAt ?? null,
        currentMsi: latestDaily ? latestDaily.msi : (user.baselineMsi ?? null),
        lastAssessmentDate: latestAny ? latestAny.completedAt : (user.baselineCompletedAt || null),
        settings: user.settings || {
          dailyCheckInReminder: true,
          reduceMotion: false,
          anonymousMode: true,
        },
      },
    })
  } catch (err) {
    console.error("[EMPLOYEE] GET /profile error:", err.message)
    res.status(500).json({ success: false, message: "Error fetching employee profile." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/employee/create-profile
// Initial B2C personal profile completion following signup.
// Validates all 8 personal profile fields and saves to the authenticated user.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/create-profile", requireActiveEmployee, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found." })
    }

    const {
      name,
      username,
      age,
      gender,
      occupation,
      sleepHours,
      illnessHistory,
    } = req.body

    // 1. Name validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Full Name is required." })
    }

    // 2. Username validation
    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ success: false, message: "Username is required." })
    }
    const cleanUsername = username.trim().toLowerCase()
    if (cleanUsername !== user.username) {
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return res.status(400).json({ success: false, message: "Username must be between 3 and 30 characters." })
      }
      if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
        return res.status(400).json({ success: false, message: "Username can only contain letters, numbers, periods, hyphens, and underscores." })
      }
      const existingUser = await User.findOne({
        username: new RegExp(`^${cleanUsername}$`, "i"),
        _id: { $ne: user._id },
      })
      if (existingUser) {
        return res.status(409).json({ success: false, message: "This username is already taken. Please choose another." })
      }
      user.username = cleanUsername
    }

    // 3. Age validation
    const parsedAge = Number(age)
    if (age === undefined || age === null || isNaN(parsedAge) || parsedAge < 10 || parsedAge > 120) {
      return res.status(400).json({ success: false, message: "Please provide a valid age between 10 and 120." })
    }

    // 4. Gender validation
    if (!gender || typeof gender !== "string" || !gender.trim()) {
      return res.status(400).json({ success: false, message: "Gender is required." })
    }

    // 5. Occupation validation
    const validOccupations = ["Working Professional", "Student", "Homemaker", "Other"]
    if (!occupation || !validOccupations.includes(occupation.trim())) {
      return res.status(400).json({
        success: false,
        message: "Occupation must be one of: Working Professional, Student, Homemaker, Other.",
      })
    }

    // 6. Sleep Hours validation
    if (sleepHours === undefined || sleepHours === null || sleepHours === "") {
      return res.status(400).json({ success: false, message: "Sleep Hours is required." })
    }
    const numSleepHours = Number(sleepHours)
    if (isNaN(numSleepHours) || numSleepHours < 0 || numSleepHours > 24) {
      return res.status(400).json({ success: false, message: "Please provide valid sleep hours (0-24)." })
    }

    // 7. Previous History of Illness validation
    const validIllness = ["Physical", "Mental", "Both", "None"]
    if (!illnessHistory || !validIllness.includes(illnessHistory.trim())) {
      return res.status(400).json({
        success: false,
        message: "Previous History of Illness must be one of: Physical, Mental, Both, None.",
      })
    }

    // Save personal profile fields to User
    user.name = name.trim()
    user.age = parsedAge
    user.gender = gender.trim()
    user.occupation = occupation.trim()
    user.sleepHours = numSleepHours
    user.illnessHistory = illnessHistory.trim()
    user.profileCompleted = true

    await user.save()

    await logActivity({
      req,
      user,
      action: "Profile Created",
      status: "Success",
      entityType: "User",
      entityId: user._id,
      details: `B2C personal profile completed for ${user.name} (@${user.username})`,
    })

    return res.status(200).json({
      success: true,
      message: "Profile saved successfully.",
      user: user.toSafeObject(),
    })
  } catch (err) {
    console.error("[EMPLOYEE] POST /create-profile error:", err)
    return res.status(500).json({ success: false, message: "Server error saving profile." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/employee/profile
// Updates non-sensitive employee and personal profile information.
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/employee/profile
// Updates personal profile information (name, age, gender, occupation, sleepHours, illnessHistory).
// Note: Organisation details (department, employeeId, workingHours, workType) are strictly
// READ-ONLY for users and controlled exclusively by HR.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/profile", requireActiveEmployee, async (req, res) => {
  try {
    const user = req.user
    const {
      name,
      age,
      gender,
      occupation,
      sleepHours,
      illnessHistory,
    } = req.body

    const userUpdates = {}
    if (name && typeof name === "string" && name.trim()) {
      userUpdates.name = name.trim()
    }

    if (age !== undefined && age !== null && !isNaN(Number(age))) {
      const numAge = Number(age)
      if (numAge >= 10 && numAge <= 120) {
        userUpdates.age = numAge
      }
    }

    if (gender && typeof gender === "string" && gender.trim()) {
      userUpdates.gender = gender.trim()
    }

    const validOccupations = ["Working Professional", "Student", "Homemaker", "Other"]
    if (occupation && validOccupations.includes(occupation.trim())) {
      userUpdates.occupation = occupation.trim()
    }

    if (sleepHours !== undefined && sleepHours !== null && !isNaN(Number(sleepHours))) {
      const numSleep = Number(sleepHours)
      if (numSleep >= 0 && numSleep <= 24) {
        userUpdates.sleepHours = numSleep
      }
    }

    const validIllness = ["Physical", "Mental", "Both", "None"]
    if (illnessHistory && validIllness.includes(illnessHistory.trim())) {
      userUpdates.illnessHistory = illnessHistory.trim()
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, userUpdates, { new: true })

    await logActivity({
      req,
      user,
      action: "Profile Settings Updated",
      status: "Success",
      organisationId: user.organisationId,
      entityType: "User",
      entityId: user._id,
      details: `Personal profile updated for ${updatedUser.name}`,
    })

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: {
        name: updatedUser.name,
        age: updatedUser.age,
        gender: updatedUser.gender,
        occupation: updatedUser.occupation,
        sleepHours: updatedUser.sleepHours,
        illnessHistory: updatedUser.illnessHistory,
      },
    })
  } catch (err) {
    console.error("[EMPLOYEE] PATCH /profile error:", err.message)
    res.status(500).json({ success: false, message: "Error updating employee profile." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/employee/request-email-change
// Initiates secure email change flow with verification code.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/request-email-change", requireActiveEmployee, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found." })
    }

    const { newEmail } = req.body
    if (!newEmail || typeof newEmail !== "string" || !newEmail.trim()) {
      return res.status(400).json({ success: false, message: "Please provide a valid new email address." })
    }

    const cleanNewEmail = newEmail.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanNewEmail)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email format." })
    }

    if (cleanNewEmail === (user.email || "").toLowerCase()) {
      return res.status(400).json({ success: false, message: "New email must be different from your current email." })
    }

    // Check if new email is already associated with another account
    const existing = await User.findOne({ email: cleanNewEmail, _id: { $ne: user._id } })
    if (existing) {
      return res.status(409).json({ success: false, message: "An account with this email address already exists." })
    }

    // Generate secure 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresInMinutes = 15
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)

    user.pendingEmail = cleanNewEmail
    user.emailVerificationCode = verificationCode
    user.emailVerificationExpires = expiresAt
    await user.save()

    // Send code via email
    await sendEmailChangeVerificationCode({
      toEmail: cleanNewEmail,
      userName: user.name,
      verificationCode,
      expiresInMinutes,
    })

    console.log(`[EMAIL CHANGE] Verification code sent for ${user.username || user._id} to ${cleanNewEmail}`)

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${cleanNewEmail}.`,
      pendingEmail: cleanNewEmail,
    })
  } catch (err) {
    console.error("[EMPLOYEE] POST /request-email-change error:", err)
    return res.status(500).json({ success: false, message: "Server error sending verification code." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/employee/verify-email-change
// Verifies code and updates the user's actual email address.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/verify-email-change", requireActiveEmployee, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+emailVerificationCode +emailVerificationExpires")
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found." })
    }

    const { code } = req.body
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ success: false, message: "Verification code is required." })
    }

    if (!user.pendingEmail || !user.emailVerificationCode || !user.emailVerificationExpires) {
      return res.status(400).json({ success: false, message: "No pending email change request found. Please request a new code." })
    }

    // Check expiration
    if (new Date() > new Date(user.emailVerificationExpires)) {
      user.pendingEmail = null
      user.emailVerificationCode = null
      user.emailVerificationExpires = null
      await user.save()
      return res.status(400).json({ success: false, message: "Verification code has expired. Please request a new code." })
    }

    // Check code match
    if (code.trim() !== String(user.emailVerificationCode).trim()) {
      return res.status(400).json({ success: false, message: "Invalid verification code. Please check and try again." })
    }

    // Re-verify that new email is not taken by another user
    const duplicate = await User.findOne({ email: user.pendingEmail, _id: { $ne: user._id } })
    if (duplicate) {
      user.pendingEmail = null
      user.emailVerificationCode = null
      user.emailVerificationExpires = null
      await user.save()
      return res.status(409).json({ success: false, message: "This email address is already registered to another account." })
    }

    const oldEmail = user.email
    const updatedEmail = user.pendingEmail

    user.email = updatedEmail
    user.pendingEmail = null
    user.emailVerificationCode = null
    user.emailVerificationExpires = null
    await user.save()

    await logActivity({
      req,
      user,
      action: "Email Changed",
      status: "Success",
      entityType: "User",
      entityId: user._id,
      details: `User updated personal email from ${oldEmail} to ${updatedEmail}`,
    })

    console.log(`[EMAIL CHANGE] User ${user._id} email updated successfully to ${updatedEmail}`)

    return res.status(200).json({
      success: true,
      message: "Email updated successfully.",
      email: updatedEmail,
      user: user.toSafeObject(),
    })
  } catch (err) {
    console.error("[EMPLOYEE] POST /verify-email-change error:", err)
    return res.status(500).json({ success: false, message: "Server error verifying email code." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/employee/settings
// Retrieves authenticated employee's settings from MongoDB.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/settings", requireActiveEmployee, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: "Employee not found." })
    }

    return res.status(200).json({
      success: true,
      settings: user.settings || {
        dailyCheckInReminder: true,
        reduceMotion: false,
        anonymousMode: true,
      },
      data: user.settings || {
        dailyCheckInReminder: true,
        reduceMotion: false,
        anonymousMode: true,
      },
    })
  } catch (err) {
    console.error("[EMPLOYEE] GET /settings error:", err.message)
    res.status(500).json({ success: false, message: "Error fetching employee settings." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/employee/settings
// Updates employee preferences and persists in MongoDB.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/settings", requireActiveEmployee, async (req, res) => {
  try {
    const { dailyCheckInReminder, reduceMotion, anonymousMode } = req.body

    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: "Employee not found." })
    }

    const currentSettings = user.settings || {
      dailyCheckInReminder: true,
      reduceMotion: false,
      anonymousMode: true,
    }

    if (typeof dailyCheckInReminder === "boolean") {
      currentSettings.dailyCheckInReminder = dailyCheckInReminder
    }
    if (typeof reduceMotion === "boolean") {
      currentSettings.reduceMotion = reduceMotion
    }
    if (typeof anonymousMode === "boolean") {
      currentSettings.anonymousMode = anonymousMode
    }

    user.settings = currentSettings
    user.markModified("settings")
    await user.save()

    return res.status(200).json({
      success: true,
      message: "Settings saved.",
      settings: user.settings,
      data: user.settings,
    })
  } catch (err) {
    console.error("[EMPLOYEE] PATCH /settings error:", err.message)
    res.status(500).json({ success: false, message: "Error saving employee settings." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/employee/notifications
//
// Protected — fetches real in-app notifications for authenticated employee
// ─────────────────────────────────────────────────────────────────────────────
router.get("/notifications", requireActiveEmployee, async (req, res) => {
  try {
    const Notification = require("../models/Notification")
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false })

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        body: n.message,
        message: n.message,
        read: n.read,
        sessionId: n.sessionId,
        createdAt: n.createdAt,
      })),
    })
  } catch (err) {
    console.error("[EMPLOYEE] GET /notifications error:", err.message)
    res.status(500).json({ success: false, message: "Error loading notifications." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/employee/notifications/read-all
//
// Protected — marks all in-app notifications as read
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/notifications/read-all", requireActiveEmployee, async (req, res) => {
  try {
    const Notification = require("../models/Notification")
    await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } })
    return res.status(200).json({ success: true, message: "Notifications marked as read." })
  } catch (err) {
    console.error("[EMPLOYEE] PATCH /notifications/read-all error:", err.message)
    res.status(500).json({ success: false, message: "Error updating notifications." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/employee/organisation-departments
//
// Protected — fetches departments for a verified organisation code
// ─────────────────────────────────────────────────────────────────────────────
router.get("/organisation-departments", requireActiveEmployee, async (req, res) => {
  try {
    const { code } = req.query
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ success: false, message: "Organisation code is required." })
    }

    const searchCode = code.trim().toUpperCase()
    const Organisation = require("../models/Organisation")
    const org = await Organisation.findOne({
      $or: [{ organisationCode: searchCode }, { code: searchCode }],
    })

    if (!org) {
      return res.status(404).json({ success: false, message: "Organisation not found." })
    }

    const { ensureDepartmentsForOrg } = require("../services/departmentService")
    const depts = await ensureDepartmentsForOrg(org.organisationId)
    const deptNames = depts.map((d) => d.name)

    return res.status(200).json({
      success: true,
      organisation: {
        id: org._id,
        organisationId: org.organisationId,
        name: org.name,
        code: org.organisationCode,
      },
      departments: deptNames,
    })
  } catch (err) {
    console.error("[EMPLOYEE] Error getting organisation departments:", err.message)
    res.status(500).json({ success: false, message: "Server error fetching departments." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/employee/link-organisation
//
// Protected — authenticated B2C user submits request to link with organisation.
// Reuses the existing CorporateOnboarding & HR approval queue system.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/link-organisation", requireActiveEmployee, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." })
    }

    const { organisationCode, department, workingHours, workType } = req.body

    if (!organisationCode || typeof organisationCode !== "string" || !organisationCode.trim()) {
      return res.status(400).json({ success: false, message: "Organisation code is required." })
    }
    if (!department || typeof department !== "string" || !department.trim()) {
      return res.status(400).json({ success: false, message: "Please select your department." })
    }
    if (!workingHours || typeof workingHours !== "string" || !workingHours.trim()) {
      return res.status(400).json({ success: false, message: "Please select your working hours." })
    }
    if (!workType || typeof workType !== "string" || !workType.trim()) {
      return res.status(400).json({ success: false, message: "Please select your work type." })
    }

    const allowedWorkTypes = ["Office", "In-office", "Remote", "Fully remote", "Hybrid"]
    if (!allowedWorkTypes.some((wt) => wt.toLowerCase() === workType.trim().toLowerCase())) {
      return res.status(400).json({ success: false, message: "Work type must be Office, Remote, or Hybrid." })
    }

    // Verify organisation from database (never trust client organisationId)
    const searchCode = organisationCode.trim().toUpperCase()
    const Organisation = require("../models/Organisation")
    const org = await Organisation.findOne({
      $or: [{ organisationCode: searchCode }, { code: searchCode }],
    })

    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Organisation code not found. Please check the code and try again.",
      })
    }

    if (org.status === "Inactive" || org.isActive === false) {
      return res.status(400).json({
        success: false,
        message: "This organisation is currently inactive.",
      })
    }

    // Check if user is already an approved member of this organisation
    const existingOrgId = String(user.organisationId || "")
    const targetOrgId = String(org.organisationId)
    if (existingOrgId === targetOrgId && user.employeeId && (user.status === "Approved" || user.status === "Active")) {
      return res.status(400).json({
        success: false,
        message: "You are already an approved member of this organisation.",
      })
    }

    // Check if user already has a pending request for this organisation
    if (existingOrgId === targetOrgId && user.status === "PendingApproval") {
      return res.status(400).json({
        success: false,
        message: "You already have a pending request for this organisation.",
      })
    }

    // Resolve department
    const { getOrCreateDepartment, normalizeDepartmentName } = require("../services/departmentService")
    const normalizedDept = normalizeDepartmentName(department.trim())
    let deptDoc = null
    try {
      deptDoc = await getOrCreateDepartment(org.organisationId, normalizedDept)
    } catch (dErr) {
      console.warn("[LINK-ORG] Department resolve notice:", dErr.message)
    }

    // Update / upsert CorporateOnboarding record so existing handleHRQueue displays all details
    const CorporateOnboarding = require("../models/CorporateOnboarding")
    await CorporateOnboarding.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          organisationId: org._id,
          organisationCode: org.organisationCode,
          participantProfile: {
            D1: "—",
            D2: "—",
            D3: normalizedDept,
            D4: "Employee",
            D5: "—",
            D6: workingHours.trim(),
            D7: "Moderate",
            D8: workType.trim(),
          },
          onboardingCompleted: true,
          completedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    // Update User with organisation reference, department, and transition status to PendingApproval
    user.organisationId = org._id
    user.organisationCode = org.organisationCode
    user.department = normalizedDept
    user.departmentId = deptDoc?.departmentId || null
    user.status = "PendingApproval"
    user.onboardingCompleted = true
    user.rejectedAt = null
    user.rejectedBy = null
    user.rejectionReason = null
    user.organisationLink = {
      status: "pending",
      organisationId: String(org._id),
      organisationCode: org.organisationCode,
      organisationName: org.name,
      department: normalizedDept,
      workingHours: workingHours.trim(),
      workType: workType.trim(),
      requestedAt: new Date(),
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
    }
    await user.save()

    console.log(`[LINK-ORG] B2C user ${user.username || user.email} submitted link request to org ${org.name} (${org.organisationCode})`)

    // Notify HR
    const { sendEmployeeApprovalNotification } = require("../services/notificationService")
    sendEmployeeApprovalNotification(user, org).catch((notifErr) => {
      console.warn("[LINK-ORG] Non-blocking notification notice:", notifErr.message)
    })

    await logActivity({
      req,
      user,
      action: "Requested Organisation Link",
      status: "Success",
      organisationId: org.organisationId,
      organisationName: org.name,
      entityType: "User",
      entityId: user._id,
      details: `User requested to link account to ${org.name} (${normalizedDept})`,
    })

    return res.status(200).json({
      success: true,
      message: "Organisation link request submitted successfully. Awaiting HR approval.",
      data: {
        organisationName: org.name,
        organisationCode: org.organisationCode,
        department: normalizedDept,
        workingHours: workingHours.trim(),
        workType: workType.trim(),
        status: "PendingApproval",
        requestedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error("[EMPLOYEE] POST /link-organisation error:", err)
    res.status(500).json({ success: false, message: err.message || "Server error submitting organisation link request." })
  }
})

module.exports = router


