const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const Professional = require("../models/Professional")
const { requireAdmin } = require("../middleware/auth")
const { logActivity } = require("../services/activityService")

/**
 * Normalizes phone numbers to standard WhatsApp format:
 * Strips all spaces, dashes, parentheses, dots, and leading '+' signs.
 * e.g., "+91 98765-43210" -> "919876543210"
 */
function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== "string") return ""
  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, "")
  return digitsOnly
}

/**
 * Validates email format.
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false
  return /^\S+@\S+\.\S+$/.test(email.trim())
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC / EMPLOYEE ENDPOINTS (Under /api/professionals)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/professionals
 * Returns all active professionals for the employee support directory.
 * Phone number and private emails are strictly excluded.
 */
router.get("/", async (req, res) => {
  try {
    const professionals = await Professional.find({ status: "Active" }).sort({ createdAt: -1 })
    const data = professionals.map((p) => p.toPublicObject())

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    })
  } catch (err) {
    console.error("[PROFESSIONALS] Error fetching public professionals:", err.message)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch professionals directory.",
    })
  }
})

/**
 * POST /api/professionals/:id/connect
 * Generates a WhatsApp click-to-chat URL using the stored professional's phone number.
 * Does NOT expose the phone number directly in the response payload.
 */
router.post("/:id/connect", async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid professional ID." })
    }

    // Retrieve professional including phoneNumber
    const professional = await Professional.findById(id).select("+phoneNumber")
    if (!professional) {
      return res.status(404).json({ success: false, message: "Professional not found." })
    }

    if (professional.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "This professional is currently unavailable for consultation.",
      })
    }

    const rawPhone = professional.phoneNumber
    const normalizedPhone = normalizePhoneNumber(rawPhone)

    if (!normalizedPhone || normalizedPhone.length < 7) {
      console.warn(`[PROFESSIONALS] Professional ${id} has invalid phone number: ${rawPhone}`)
      return res.status(500).json({
        success: false,
        message: "Contact information for this professional is currently unavailable.",
      })
    }

    const prefilledMessage = "Hello Dr. Uvesh, I have been recommended to you by Cortoe for a complimentary professional consultation. I would like to connect with you and know more about the consultation process. Thank you."
    const encodedMessage = encodeURIComponent(prefilledMessage)
    const connectUrl = `https://wa.me/${normalizedPhone}?text=${encodedMessage}`

    console.log(`[PROFESSIONALS] Connect generated for professional: ${professional.professionalName} (${professional._id})`)

    return res.status(200).json({
      success: true,
      connectUrl,
      message: "Connect URL generated successfully.",
    })
  } catch (err) {
    console.error("[PROFESSIONALS] Connect endpoint error:", err.message)
    return res.status(500).json({
      success: false,
      message: "Unable to initiate professional connection.",
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS (requireAdmin)
// Accessible via:
// - GET/POST/PUT/DELETE under /api/admin/professionals
// - or under /api/professionals/admin/...
// ─────────────────────────────────────────────────────────────────────────────

const adminRouter = express.Router()

// Admin: Get all professionals
adminRouter.get("/", requireAdmin, async (req, res) => {
  try {
    const professionals = await Professional.find().select("+phoneNumber").sort({ createdAt: -1 })
    const data = professionals.map((p) => p.toAdminObject())

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    })
  } catch (err) {
    console.error("[ADMIN PROFESSIONALS] Fetch error:", err.message)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch professionals.",
    })
  }
})

// Admin: Create professional
adminRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const {
      professionalName,
      occupation,
      shortStats,
      qualification,
      consultationType,
      phoneNumber,
      email,
      status,
    } = req.body

    // Validation
    if (!professionalName || !String(professionalName).trim()) {
      return res.status(400).json({ success: false, message: "Professional name is required." })
    }
    if (!occupation || !String(occupation).trim()) {
      return res.status(400).json({ success: false, message: "Occupation is required." })
    }
    if (!shortStats || !String(shortStats).trim()) {
      return res.status(400).json({ success: false, message: "Short description/stats is required." })
    }
    if (!qualification || !String(qualification).trim()) {
      return res.status(400).json({ success: false, message: "Qualification is required." })
    }
    if (!consultationType || !["Complimentary", "Paid"].includes(consultationType)) {
      return res.status(400).json({
        success: false,
        message: "Consultation type must be either 'Complimentary' or 'Paid'.",
      })
    }
    if (!phoneNumber || !String(phoneNumber).trim()) {
      return res.status(400).json({ success: false, message: "Phone number is required." })
    }
    const cleanPhone = normalizePhoneNumber(phoneNumber)
    if (!cleanPhone || cleanPhone.length < 7) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid phone number with country code (e.g. +91 9876543210).",
      })
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address." })
    }

    const newProfessional = await Professional.create({
      professionalName: String(professionalName).trim(),
      occupation: String(occupation).trim(),
      shortStats: String(shortStats).trim(),
      qualification: String(qualification).trim(),
      consultationType,
      phoneNumber: String(phoneNumber).trim(),
      email: String(email).trim().toLowerCase(),
      status: status === "Inactive" ? "Inactive" : "Active",
      createdBy: req.user?._id || "admin",
    })

    console.log(`[ADMIN PROFESSIONALS] Created professional: ${newProfessional.professionalName} (${newProfessional._id})`)

    await logActivity({
      req,
      user: req.user,
      action: "Created Professional",
      status: "Success",
      entityType: "Professional",
      entityId: newProfessional._id,
      details: `Created professional ${newProfessional.professionalName} (${newProfessional.occupation})`,
    }).catch(() => { })

    return res.status(201).json({
      success: true,
      message: "Professional added successfully.",
      professional: newProfessional.toAdminObject(),
    })
  } catch (err) {
    console.error("[ADMIN PROFESSIONALS] Create error:", err.message)
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create professional.",
    })
  }
})

// Admin: Update professional
adminRouter.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid professional ID." })
    }

    const professional = await Professional.findById(id).select("+phoneNumber")
    if (!professional) {
      return res.status(404).json({ success: false, message: "Professional not found." })
    }

    const {
      professionalName,
      occupation,
      shortStats,
      qualification,
      consultationType,
      phoneNumber,
      email,
      status,
    } = req.body

    if (professionalName !== undefined) {
      if (!String(professionalName).trim()) {
        return res.status(400).json({ success: false, message: "Professional name cannot be empty." })
      }
      professional.professionalName = String(professionalName).trim()
    }

    if (occupation !== undefined) {
      if (!String(occupation).trim()) {
        return res.status(400).json({ success: false, message: "Occupation cannot be empty." })
      }
      professional.occupation = String(occupation).trim()
    }

    if (shortStats !== undefined) {
      if (!String(shortStats).trim()) {
        return res.status(400).json({ success: false, message: "Short description/stats cannot be empty." })
      }
      professional.shortStats = String(shortStats).trim()
    }

    if (qualification !== undefined) {
      if (!String(qualification).trim()) {
        return res.status(400).json({ success: false, message: "Qualification cannot be empty." })
      }
      professional.qualification = String(qualification).trim()
    }

    if (consultationType !== undefined) {
      if (!["Complimentary", "Paid"].includes(consultationType)) {
        return res.status(400).json({
          success: false,
          message: "Consultation type must be either 'Complimentary' or 'Paid'.",
        })
      }
      professional.consultationType = consultationType
    }

    if (phoneNumber !== undefined) {
      const cleanPhone = normalizePhoneNumber(phoneNumber)
      if (!cleanPhone || cleanPhone.length < 7) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid phone number with country code.",
        })
      }
      professional.phoneNumber = String(phoneNumber).trim()
    }

    if (email !== undefined) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, message: "Please provide a valid email address." })
      }
      professional.email = String(email).trim().toLowerCase()
    }

    if (status !== undefined) {
      professional.status = status === "Inactive" ? "Inactive" : "Active"
    }

    await professional.save()

    console.log(`[ADMIN PROFESSIONALS] Updated professional: ${professional.professionalName} (${professional._id})`)

    await logActivity({
      req,
      user: req.user,
      action: "Updated Professional",
      status: "Success",
      entityType: "Professional",
      entityId: professional._id,
      details: `Updated professional details for ${professional.professionalName}`,
    }).catch(() => { })

    return res.status(200).json({
      success: true,
      message: "Professional updated successfully.",
      professional: professional.toAdminObject(),
    })
  } catch (err) {
    console.error("[ADMIN PROFESSIONALS] Update error:", err.message)
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update professional.",
    })
  }
})

// Admin: Toggle status
adminRouter.patch("/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid professional ID." })
    }

    if (!status || !["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'Active' or 'Inactive'.",
      })
    }

    const professional = await Professional.findById(id).select("+phoneNumber")
    if (!professional) {
      return res.status(404).json({ success: false, message: "Professional not found." })
    }

    professional.status = status
    await professional.save()

    console.log(`[ADMIN PROFESSIONALS] Toggled status for ${professional.professionalName} -> ${status}`)

    return res.status(200).json({
      success: true,
      message: `Professional status changed to ${status}.`,
      professional: professional.toAdminObject(),
    })
  } catch (err) {
    console.error("[ADMIN PROFESSIONALS] Status toggle error:", err.message)
    return res.status(500).json({
      success: false,
      message: "Failed to update professional status.",
    })
  }
})

// Admin: Delete professional
adminRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid professional ID." })
    }

    const professional = await Professional.findByIdAndDelete(id)
    if (!professional) {
      return res.status(404).json({ success: false, message: "Professional not found." })
    }

    console.log(`[ADMIN PROFESSIONALS] Deleted professional: ${professional.professionalName} (${professional._id})`)

    await logActivity({
      req,
      user: req.user,
      action: "Deleted Professional",
      status: "Success",
      entityType: "Professional",
      entityId: professional._id,
      details: `Deleted professional ${professional.professionalName} (${professional.occupation})`,
    }).catch(() => { })

    return res.status(200).json({
      success: true,
      message: "Professional deleted successfully.",
    })
  } catch (err) {
    console.error("[ADMIN PROFESSIONALS] Delete error:", err.message)
    return res.status(500).json({
      success: false,
      message: "Failed to delete professional.",
    })
  }
})

// Mount adminRouter on /admin as well inside router for backwards compatibility
router.use("/admin", adminRouter)

module.exports = {
  publicRouter: router,
  adminRouter,
  normalizePhoneNumber,
}
