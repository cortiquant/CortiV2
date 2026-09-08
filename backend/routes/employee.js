const express = require("express")
const router = express.Router()
const User = require("../models/User")
const CorporateOnboarding = require("../models/CorporateOnboarding")
const Assessment = require("../models/Assessment")
const { requireActiveEmployee } = require("../middleware/auth")
const { logActivity } = require("../services/activityService")

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/employee/profile
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

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        employeeId: user.employeeId || "—",
        username: user.username || "—",
        email: user.email || "—",
        department: user.department || p.D3 || "—",
        departmentId: user.departmentId || null,
        designation: p.D4 || "—",
        tenure: p.D5 || "—",
        weeklyWorkload: p.D6 || "—",
        workloadIntensity: p.D7 || "—",
        workArrangement: p.D8 || "—",
        ageRange: p.D1 || "—",
        gender: p.D2 || "—",
        baselineMsi: user.baselineMsi ?? null,
        baselineCompletedAt: user.baselineCompletedAt ?? null,
        currentMsi: latestDaily ? latestDaily.msi : null,
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
// PATCH /api/employee/profile
// Updates non-sensitive employee profile information.
// Syncs User and CorporateOnboarding documents.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/profile", requireActiveEmployee, async (req, res) => {
  try {
    const user = req.user
    const {
      name,
      department,
      designation,
      tenure,
      weeklyWorkload,
      workloadIntensity,
      workArrangement,
    } = req.body

    const userUpdates = {}
    if (name && typeof name === "string" && name.trim()) {
      userUpdates.name = name.trim()
    }

    const DEPT_ID_MAP = {
      "Engineering": "DEP-001",
      "Operations": "DEP-002",
      "Sales": "DEP-003",
      "Marketing": "DEP-004",
      "HR": "DEP-005",
      "Finance": "DEP-006",
      "Customer Support": "DEP-007",
      "Other": "DEP-008",
    }

    if (department && typeof department === "string") {
      userUpdates.department = department.trim()
      userUpdates.departmentId = DEPT_ID_MAP[department.trim()] || "DEP-009"
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, userUpdates, { new: true })

    // Synchronize participant profile on CorporateOnboarding document
    const onboardingUpdates = {}
    if (department) onboardingUpdates["participantProfile.D3"] = department.trim()
    if (designation) onboardingUpdates["participantProfile.D4"] = designation.trim()
    if (tenure) onboardingUpdates["participantProfile.D5"] = tenure.trim()
    if (weeklyWorkload) onboardingUpdates["participantProfile.D6"] = weeklyWorkload.trim()
    if (workloadIntensity) onboardingUpdates["participantProfile.D7"] = workloadIntensity.trim()
    if (workArrangement) onboardingUpdates["participantProfile.D8"] = workArrangement.trim()

    let updatedOnboarding = null
    if (Object.keys(onboardingUpdates).length > 0) {
      updatedOnboarding = await CorporateOnboarding.findOneAndUpdate(
        { userId: user._id },
        { $set: onboardingUpdates },
        { new: true }
      )
    }

    await logActivity({
      req,
      user,
      action: "Profile Settings Updated",
      status: "Success",
      organisationId: user.organisationId,
      entityType: "User",
      entityId: user._id,
      details: `Profile updated: ${updatedUser.name} (${updatedUser.department || "No Dept"})`,
    })

    const p = updatedOnboarding?.participantProfile || {}

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: {
        name: updatedUser.name,
        department: updatedUser.department || p.D3 || "—",
        designation: p.D4 || designation || "—",
        tenure: p.D5 || tenure || "—",
        weeklyWorkload: p.D6 || weeklyWorkload || "—",
        workArrangement: p.D8 || workArrangement || "—",
      },
    })
  } catch (err) {
    console.error("[EMPLOYEE] PATCH /profile error:", err.message)
    res.status(500).json({ success: false, message: "Error updating employee profile." })
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

module.exports = router

