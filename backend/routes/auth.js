const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const Organisation = require("../models/Organisation")
const { logActivity } = require("../services/activityService")
const { signToken, requireAuth, requireHR } = require("../middleware/auth")

// ── Utility: generate an employeeId like "EMP-1001" ──────────────────────────
async function generateEmployeeId() {
  const count = await User.countDocuments({ role: "employee", employeeId: { $ne: null } })
  return `EMP-${String(1000 + count + 1).padStart(4, "0")}`
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-organisation
//
// Public — validates an organisation code before account creation.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/verify-organisation", async (req, res) => {
  try {
    const { organisationCode } = req.body

    if (!organisationCode || typeof organisationCode !== "string" || !organisationCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Organisation code is required.",
      })
    }

    const searchCode = organisationCode.trim().toUpperCase()
    const org = await Organisation.findOne({
      $or: [{ organisationCode: searchCode }, { code: searchCode }],
    })

    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Invalid organisation code. Please check with your HR.",
      })
    }

    const isActive = org.status === "Active" || (org.status === undefined && org.isActive !== false)
    if (!isActive || org.status === "Inactive") {
      return res.status(400).json({
        success: false,
        message: "This organisation is currently inactive.",
      })
    }

    return res.status(200).json({
      success: true,
      organisation: {
        organisationId: org.organisationId,
        name: org.name,
        organisationCode: org.organisationCode || org.code,
      },
    })
  } catch (err) {
    console.error("[AUTH] Verify organisation error:", err.message)
    return res.status(500).json({
      success: false,
      message: "Server error during organisation verification.",
    })
  }
})

// Alias for verify-organisation
router.post("/verify-organisation-code", async (req, res) => {
  try {
    const { organisationCode } = req.body

    if (!organisationCode || typeof organisationCode !== "string" || !organisationCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Organisation code is required.",
      })
    }

    const searchCode = organisationCode.trim().toUpperCase()
    const org = await Organisation.findOne({
      $or: [{ organisationCode: searchCode }, { code: searchCode }],
    })

    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Invalid organisation code. Please check with your HR.",
      })
    }

    const isActive = org.status === "Active" || (org.status === undefined && org.isActive !== false)
    if (!isActive || org.status === "Inactive") {
      return res.status(400).json({
        success: false,
        message: "This organisation is currently inactive.",
      })
    }

    return res.status(200).json({
      success: true,
      organisation: {
        organisationId: org.organisationId,
        name: org.name,
        organisationCode: org.organisationCode || org.code,
      },
    })
  } catch (err) {
    console.error("[AUTH] Verify organisation code error:", err.message)
    return res.status(500).json({
      success: false,
      message: "Server error during organisation verification.",
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/employee/signup
//
// Public — employees register with Name, Username, Password, and Consents.
// Organisation is resolved from verified organisationCode.
// Status is set to "OnboardingRequired".
// Returns JWT token so newly created account can immediately proceed to Corporate Onboarding.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/employee/signup", async (req, res) => {
  try {
    const { name, username, password, privacyConsent, participantConsent, organisationCode, orgCode } = req.body

    const codeToSearch = (organisationCode || orgCode || "").trim().toUpperCase()

    // ── Validate required fields ──────────────────────────────────────────
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Full Name is required." })
    }
    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: "Username is required." })
    }
    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required." })
    }
    if (!codeToSearch) {
      return res.status(400).json({ success: false, message: "Organisation code is required." })
    }

    // ── Consents validation ───────────────────────────────────────────────
    if (!privacyConsent || !participantConsent) {
      return res.status(400).json({
        success: false,
        message: "You must agree to both the Privacy Policy and Participant Consent Form.",
      })
    }

    // ── Validate username length and format ───────────────────────────────
    const cleanUsername = username.trim().toLowerCase()
    if (cleanUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters long.",
      })
    }

    // ── Validate password strength ────────────────────────────────────────
    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!pwRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
      })
    }

    // ── Find organisation by invite code ──────────────────────────────────
    const org = await Organisation.findOne({
      $or: [{ organisationCode: codeToSearch }, { code: codeToSearch }],
    })
    if (!org) {
      return res.status(400).json({
        success: false,
        message: "Invalid organisation code. Please check with your HR.",
      })
    }
    const isActive = org.status === "Active" || (org.status === undefined && org.isActive !== false)
    if (!isActive || org.status === "Inactive") {
      return res.status(400).json({
        success: false,
        message: "This organisation is currently inactive.",
      })
    }

    // ── Check for duplicate username (case-insensitive) ───────────────────
    const existing = await User.findOne({
      username: new RegExp(`^${cleanUsername}$`, "i"),
    })
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this username already exists. Please choose another.",
      })
    }

    // ── Hash password and create user ─────────────────────────────────────
    const passwordHash = await User.hashPassword(password)
    const now = new Date()

    const user = await User.create({
      name: name.trim(),
      username: cleanUsername,
      passwordHash,
      role: "employee",
      status: "OnboardingRequired",
      organisationId: org._id,
      organisationCode: org.organisationCode || org.code,
      privacyConsent: true,
      privacyConsentAt: now,
      participantConsent: true,
      participantConsentAt: now,
    })

    console.log(`[AUTH] Employee signup: ${user.username} → org ${user.organisationCode} (OnboardingRequired)`)

    await logActivity({
      req,
      user,
      action: "Employee Account Created",
      status: "Success",
      organisationId: org.organisationId,
      organisationName: org.name,
      entityType: "User",
      entityId: user._id,
      details: `Employee account created: ${user.username} (${user.name})`,
    })

    // Sign JWT so employee can directly perform Corporate Onboarding
    const token = signToken(user._id, {
      role: "employee",
      organisationId: org._id,
      organisationCode: user.organisationCode,
    })

    return res.status(201).json({
      success: true,
      message: "Account created successfully. Let's complete your onboarding.",
      user: user.toSafeObject(),
      token,
    })
  } catch (err) {
    console.error("[AUTH] Employee signup error:", err.message)
    if (err.code === 11000) {
      const keyPattern = err.keyPattern || {}
      const keyValue = err.keyValue || {}

      if (keyPattern.username || keyValue.username !== undefined || (err.message && err.message.includes("username"))) {
        return res.status(409).json({
          success: false,
          message: "Username already taken.",
        })
      }

      if (keyPattern.employeeId || keyValue.employeeId !== undefined || (err.message && err.message.includes("employeeId"))) {
        return res.status(409).json({
          success: false,
          message: "Employee ID conflict. Please try again.",
        })
      }

      return res.status(409).json({
        success: false,
        message: "Duplicate resource conflict. Please try again.",
      })
    }
    res.status(500).json({ success: false, message: "Server error during signup." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/employee/login
//
// Public — employees log in with username (or email for legacy accounts).
// Returns user, token, and status guiding navigation.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/employee/login", async (req, res) => {
  try {
    const { username, email, password } = req.body
    const identifier = (username || email || "").trim()

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      })
    }

    // Fetch user by username or email
    const user = await User.findOne({
      $or: [
        { username: new RegExp(`^${identifier}$`, "i") },
        { email: identifier.toLowerCase() },
      ],
    }).select("+passwordHash")

    if (!user) {
      console.log(`[AUTH] Employee login failed — not found: ${identifier}`)
      return res.status(401).json({ success: false, message: "Invalid credentials." })
    }

    // ── Role check ────────────────────────────────────────────────────────
    const normalizedRole = (user.role || "").toLowerCase()
    if (normalizedRole !== "employee") {
      return res.status(403).json({ success: false, message: "Use the HR login for this account." })
    }

    // ── Password verification ─────────────────────────────────────────────
    const isValid = await user.comparePassword(password)
    if (!isValid) {
      console.log(`[AUTH] Employee login failed — wrong password: ${identifier}`)
      return res.status(401).json({ success: false, message: "Invalid username or password." })
    }

    // ── Check if Organisation is Inactive ────────────────────────────────
    if (user.organisationId) {
      const org = await Organisation.findOne({
        $or: [
          { _id: mongoose.isValidObjectId(user.organisationId) ? user.organisationId : null },
          { organisationId: user.organisationId },
        ],
      })
      if (org && (org.status === "Inactive" || org.isActive === false)) {
        return res.status(403).json({
          success: false,
          message: "Your organisation account is currently inactive. Please contact HR.",
        })
      }
    }

    // Sign JWT so employee has authenticated session
    const token = signToken(user._id, { role: "employee", organisationId: user.organisationId })

    // ── Route based on status ─────────────────────────────────────────────
    // 1. OnboardingRequired: Needs to finish onboarding
    if (user.status === "OnboardingRequired" || (!user.onboardingCompleted && user.status !== "Approved" && user.status !== "Active")) {
      return res.status(200).json({
        success: true,
        status: "OnboardingRequired",
        onboardingRequired: true,
        message: "Please complete your corporate onboarding.",
        user: user.toSafeObject(),
        token,
      })
    }

    // 2. Pending approval
    if (user.status === "PendingApproval" || user.status === "Pending") {
      console.log(`[AUTH] Employee login — awaiting HR approval: ${identifier}`)
      return res.status(200).json({
        success: true,
        status: "PendingApproval",
        message: "Your account is awaiting approval. Your organisation's HR team is reviewing your registration.",
        user: user.toSafeObject(),
        token,
      })
    }

    // 3. Rejected account
    if (user.status === "Rejected") {
      console.log(`[AUTH] Employee login — account rejected: ${identifier}`)
      return res.status(200).json({
        success: true,
        status: "Rejected",
        message: "Your registration was not approved. Please contact your organisation's HR team for more information.",
        user: user.toSafeObject(),
        token,
      })
    }

    // 4. Approved / Active account
    console.log(`[AUTH] Employee login successful: ${identifier}`)

    await logActivity({
      req,
      user,
      action: "Employee Login",
      status: "Success",
      organisationId: user.organisationId,
      entityType: "User",
      entityId: user._id,
      details: `Employee login: ${user.username || user.email}`,
    })

    const hasBaseline = user.baselineMsi !== null && user.baselineMsi !== undefined

    return res.status(200).json({
      success: true,
      status: "Active",
      message: "Login successful.",
      onboardingRequired: false,
      hasBaseline,
      user: user.toSafeObject(),
      token,
    })
  } catch (err) {
    console.error("[AUTH] Employee login error:", err.message)
    res.status(500).json({ success: false, message: "Server error during login." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
//
// Authenticated route — fetches currently authenticated employee details and current status
// ─────────────────────────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." })
    }
    const hasBaseline = user.baselineMsi !== null && user.baselineMsi !== undefined
    return res.status(200).json({
      success: true,
      status: user.status,
      hasBaseline,
      user: user.toSafeObject(),
    })
  } catch (err) {
    console.error("[AUTH] GET /me error:", err.message)
    res.status(500).json({ success: false, message: "Server error fetching user." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/hr/login
//
// Public — HR / admin accounts only.
// HR accounts are created directly in MongoDB by the Founder — no signup route.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/hr/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      })
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash")
    if (!user) {
      console.log(`[AUTH] HR login failed — not found: ${email}`)
      return res.status(401).json({ success: false, message: "Invalid credentials." })
    }

    // ── Role check (case-insensitive) ────────────────────────────────────
    const normalizedRole = (user.role || "").toLowerCase()
    if (normalizedRole !== "hr" && normalizedRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "This account does not have HR access.",
      })
    }

    // ── Status check (Approved or Active) ─────────────────────────────────
    if (user.status !== "Approved" && user.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "HR account is inactive or not approved.",
      })
    }

    // ── Password verification ─────────────────────────────────────────────
    const isValid = await user.comparePassword(password)
    if (!isValid) {
      console.log(`[AUTH] HR login failed — wrong password: ${email}`)
      return res.status(401).json({ success: false, message: "Invalid credentials." })
    }

    // ── Check if Organisation is Inactive ────────────────────────────────
    let orgDoc = null
    if (user.organisationId) {
      orgDoc = await Organisation.findOne({
        $or: [{ _id: mongoose.isValidObjectId(user.organisationId) ? user.organisationId : null }, { organisationId: user.organisationId }],
      })
      if (orgDoc && (orgDoc.status === "Inactive" || orgDoc.isActive === false)) {
        return res.status(403).json({
          success: false,
          message: "This organisation account is inactive. Please contact Administrator.",
        })
      }
    }

    const token = signToken(user._id, { role: user.role, organisationId: user.organisationId })
    console.log(`[AUTH] HR login successful: ${email}`)

    await logActivity({
      req,
      user,
      action: "HR Login",
      status: "Success",
      organisationId: orgDoc?.organisationId || user.organisationId,
      organisationName: orgDoc?.name || null,
      entityType: "User",
      entityId: user._id,
      details: `HR administrator login: ${user.email}`,
    })

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organisationId: user.organisationId,
      },
      token,
    })
  } catch (err) {
    console.error("[AUTH] HR login error:", err.message)
    res.status(500).json({ success: false, message: "Server error during login." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
//
// Unified login route (recognizes role: "HR", "employee", "admin")
// ─────────────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      })
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash")
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials." })
    }

    const isValid = await user.comparePassword(password)
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials." })
    }

    // Check status
    if (user.status === "Pending") {
      return res.status(200).json({
        success: false,
        status: "pending",
        message: "Your account is awaiting HR approval.",
      })
    }
    if (user.status === "Rejected") {
      return res.status(403).json({
        success: false,
        status: "rejected",
        message: "Your access request was not approved. Please contact HR.",
      })
    }
    if (user.status !== "Approved" && user.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive or pending.",
      })
    }

    // Check organisation status
    if (user.organisationId) {
      const org = await Organisation.findOne({
        $or: [{ _id: mongoose.isValidObjectId(user.organisationId) ? user.organisationId : null }, { organisationId: user.organisationId }],
      })
      if (org && (org.status === "Inactive" || org.isActive === false)) {
        return res.status(403).json({
          success: false,
          message: "Your organisation account is currently inactive.",
        })
      }
    }

    const token = signToken(user._id, { role: user.role, organisationId: user.organisationId })

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organisationId: user.organisationId,
        employeeId: user.employeeId,
      },
      token,
    })
  } catch (err) {
    console.error("[AUTH] Unified login error:", err.message)
    res.status(500).json({ success: false, message: "Server error during login." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/admin/login
//
// Public — Founder / Admin accounts only.
// Authenticates credentials against database with fallback support for initial founder seed.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      })
    }

    const trimmedEmail = email.toLowerCase().trim()

    // 1. Try finding in DB
    try {
      const user = await User.findOne({ email: trimmedEmail }).select("+passwordHash")
      if (user) {
        if (user.role !== "admin") {
          return res.status(403).json({ success: false, message: "Access restricted to Founder/Admin." })
        }
        if (user.status !== "Approved") {
          return res.status(403).json({ success: false, message: "Account is inactive or pending." })
        }
        const isValid = await user.comparePassword(password)
        if (!isValid) {
          return res.status(401).json({ success: false, message: "Invalid credentials." })
        }

        const token = signToken(user._id)

        await logActivity({
          req,
          user,
          action: "Admin Login",
          status: "Success",
          entityType: "User",
          entityId: user._id,
          details: `Admin login: ${user.email}`,
        })

        return res.status(200).json({
          success: true,
          message: "Admin login successful.",
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: "admin",
            organisationId: user.organisationId,
          },
          token,
        })
      }
    } catch (dbErr) {
      console.warn("[AUTH] Database query error during admin login:", dbErr.message)
    }

    // 2. Check founder initial root credentials fallback
    if (trimmedEmail === "soham.founder@gmail.com" && password === "soam@mru") {
      const token = jwt.sign(
        { id: "founder-admin-root", role: "admin", email: trimmedEmail },
        process.env.JWT_SECRET || "cortiquant-secret-key",
        { expiresIn: "7d" }
      )

      await logActivity({
        req,
        user: { _id: "founder-admin-root", name: "Soham (Founder)", email: trimmedEmail, role: "admin" },
        action: "Admin Login",
        status: "Success",
        entityType: "User",
        entityId: "founder-admin-root",
        details: `Founder root login: ${trimmedEmail}`,
      })

      return res.status(200).json({
        success: true,
        message: "Founder login successful.",
        user: {
          id: "founder-admin-root",
          name: "Soham (Founder)",
          email: trimmedEmail,
          role: "admin",
        },
        token,
      })
    }

    return res.status(401).json({ success: false, message: "Invalid credentials." })
  } catch (err) {
    console.error("[AUTH] Admin login error:", err.message)
    res.status(500).json({ success: false, message: "Server error during admin login." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/hr/queue & GET /api/hr/approval-queue & GET /api/hr/queue
//
// HR-protected — returns all employees in the HR's organisation.
// Pending items are strictly restricted to employees who completed onboarding.
// Includes real statistics (pendingCount, approvedToday, rejectedToday, avgApprovalTimeHours).
// Enriched with participant profile answers (D1–D8), department, departmentId, and dates.
// ─────────────────────────────────────────────────────────────────────────────
async function handleHRQueue(req, res) {
  try {
    const { status } = req.query // optional filter: "pending" | "approved" | "rejected" | "all"

    // HR org can be ObjectId or string ID
    const hrOrgId = req.user.organisationId
    const baseOrgFilter = {
      role: { $in: ["employee", "Employee", "EMPLOYEE"] },
      $or: [
        { organisationId: hrOrgId },
        { organisationId: String(hrOrgId) },
        ...(mongoose.isValidObjectId(hrOrgId) ? [{ organisationId: new mongoose.Types.ObjectId(hrOrgId) }] : []),
      ],
    }

    const filter = { ...baseOrgFilter }

    if (status && status.toLowerCase() !== "all") {
      const s = status.toLowerCase()
      if (s === "pending") {
        filter.status = { $in: ["PendingApproval", "Pending"] }
        filter.onboardingCompleted = true
      } else if (s === "approved" || s === "active") {
        filter.status = { $in: ["Approved", "Active"] }
      } else if (s === "rejected") {
        filter.status = "Rejected"
      }
    }

    const employees = await User.find(filter).sort({ createdAt: -1 })
    const userIds = employees.map((e) => e._id)

    // Lookup onboarding records for completion date, department & participantProfile (D1–D8)
    const CorporateOnboarding = require("../models/CorporateOnboarding")
    const onbRecords = await CorporateOnboarding.find({ userId: { $in: userIds } })
    const onbMap = new Map(onbRecords.map((o) => [String(o.userId), o]))

    // Lookup organisation details for name
    const orgDoc = await Organisation.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(hrOrgId) ? hrOrgId : null },
        { organisationId: hrOrgId },
      ],
    })
    const orgName = orgDoc ? orgDoc.name : "Organisation"

    // ── Calculate Real Org KPIs ─────────────────────────────────────────────
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // 1. Pending requests: status in Pending/PendingApproval AND onboarding completed
    const pendingCount = await User.countDocuments({
      ...baseOrgFilter,
      status: { $in: ["PendingApproval", "Pending"] },
      onboardingCompleted: true,
    })

    // 2. Approved today
    const approvedTodayUsers = await User.find({
      ...baseOrgFilter,
      status: { $in: ["Approved", "Active"] },
      approvedAt: { $gte: todayStart, $lte: todayEnd },
    }).select("approvedAt createdAt onboardingCompleted")

    const approvedToday = approvedTodayUsers.length

    // 3. Rejected today
    const rejectedToday = await User.countDocuments({
      ...baseOrgFilter,
      status: "Rejected",
      rejectedAt: { $gte: todayStart, $lte: todayEnd },
    })

    // 4. Avg approval time (hours): average of (approvedAt - onboardingCompletedAt or createdAt)
    let avgApprovalTimeHours = "0.0h"
    if (approvedTodayUsers.length > 0) {
      // Find onboarding completion timestamps for these users
      const approvedIds = approvedTodayUsers.map((u) => u._id)
      const approvedOnbs = await CorporateOnboarding.find({ userId: { $in: approvedIds } })
      const appOnbMap = new Map(approvedOnbs.map((o) => [String(o.userId), o]))

      let totalDurationMs = 0
      let validCount = 0

      for (const u of approvedTodayUsers) {
        if (u.approvedAt) {
          const onb = appOnbMap.get(String(u._id))
          const startTime = onb?.completedAt || u.createdAt
          if (startTime) {
            const diff = new Date(u.approvedAt).getTime() - new Date(startTime).getTime()
            if (diff >= 0) {
              totalDurationMs += diff
              validCount++
            }
          }
        }
      }

      if (validCount > 0) {
        const avgHours = totalDurationMs / validCount / (1000 * 60 * 60)
        avgApprovalTimeHours = `${avgHours.toFixed(1)}h`
      }
    }

    const data = employees.map((e) => {
      const onb = onbMap.get(String(e._id))
      const dept = e.department || onb?.participantProfile?.D3 || "Unassigned"
      const deptId = e.departmentId || null
      const isOnboardingComplete = e.onboardingCompleted || !!onb?.onboardingCompleted
      const onboardingCompletedAt = onb?.completedAt || null

      let displayStatus = "pending"
      if (e.status === "Approved" || e.status === "Active") displayStatus = "approved"
      else if (e.status === "Rejected") displayStatus = "rejected"
      else if (e.status === "OnboardingRequired") displayStatus = "onboarding"

      return {
        id: String(e._id),
        employeeId: e.employeeId || "Pending ID",
        name: e.name,
        username: e.username || "—",
        email: e.email || "—",
        organisation: orgName,
        organisationId: orgDoc ? orgDoc.organisationId : String(e.organisationId),
        organisationCode: e.organisationCode || orgDoc?.organisationCode || "—",
        department: dept,
        departmentId: deptId,
        role: "Employee",
        onboardingStatus: isOnboardingComplete ? "Completed" : "Pending",
        onboardingCompletedAt,
        submittedAt: e.createdAt,
        createdAt: e.createdAt,
        approvedAt: e.approvedAt || null,
        rejectedAt: e.rejectedAt || null,
        rejectionReason: e.rejectionReason || null,
        status: displayStatus,
        rawStatus: e.status,
        participantProfile: onb?.participantProfile || null,
      }
    })

    return res.status(200).json({
      success: true,
      count: data.length,
      stats: {
        pendingCount,
        approvedToday,
        rejectedToday,
        avgApprovalTimeHours,
      },
      data,
    })
  } catch (err) {
    console.error("[AUTH] HR queue error:", err.message)
    res.status(500).json({ success: false, message: "Server error fetching approval queue." })
  }
}

// Support both /api/hr/queue, /api/auth/hr/queue, and /api/hr/approval-queue
router.get("/hr/queue", requireHR, handleHRQueue)
router.get("/hr/approval-queue", requireHR, handleHRQueue)
router.get("/approval-queue", requireHR, handleHRQueue)

// ─────────────────────────────────────────────────────────────────────────────
// Approval Logic (helper used by POST and PATCH endpoints)
// ─────────────────────────────────────────────────────────────────────────────
async function handleApproveEmployee(req, res) {
  try {
    const idParam = req.params.employeeId || req.params.userId

    // Find by ObjectId or employeeId
    const isObjId = mongoose.isValidObjectId(idParam)
    const employee = await User.findOne({
      role: { $in: ["employee", "Employee", "EMPLOYEE"] },
      $or: [
        ...(isObjId ? [{ _id: idParam }] : []),
        { employeeId: idParam },
      ],
    })

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found." })
    }

    // ── Cross-org protection ──────────────────────────────────────────────
    const empOrg = String(employee.organisationId)
    const hrOrg = String(req.user.organisationId)
    if (empOrg !== hrOrg) {
      return res.status(403).json({ success: false, message: "Access denied: cross-organisation action." })
    }

    if (employee.status === "Approved" || employee.status === "Active") {
      return res.status(400).json({ success: false, message: "Employee is already approved." })
    }

    const employeeId = employee.employeeId || (await generateEmployeeId())
    employee.status = "Active"
    employee.employeeId = employeeId
    employee.approvedAt = new Date()
    employee.approvedBy = req.user._id
    employee.rejectedAt = null
    employee.rejectedBy = null
    employee.rejectionReason = null
    await employee.save()

    console.log(`[AUTH] HR approved employee: ${employee.username || employee.email} → ${employeeId}`)

    await logActivity({
      req,
      user: req.user,
      action: "Approved Employee",
      status: "Success",
      organisationId: req.user.organisationId,
      entityType: "User",
      entityId: employee._id,
      details: `Approved Employee ${employeeId} (${employee.name})`,
    })

    return res.status(200).json({
      success: true,
      message: `Employee approved successfully. ID: ${employeeId}`,
      user: employee.toSafeObject(),
    })
  } catch (err) {
    console.error("[AUTH] HR approve error:", err.message)
    res.status(500).json({ success: false, message: "Server error during approval." })
  }
}

router.post("/hr/approve/:userId", requireHR, handleApproveEmployee)
router.post("/approve/:userId", requireHR, handleApproveEmployee)
router.patch("/hr/employees/:employeeId/approve", requireHR, handleApproveEmployee)
router.patch("/employees/:employeeId/approve", requireHR, handleApproveEmployee)

// ─────────────────────────────────────────────────────────────────────────────
// Rejection Logic (helper used by POST and PATCH endpoints)
// ─────────────────────────────────────────────────────────────────────────────
async function handleRejectEmployee(req, res) {
  try {
    const idParam = req.params.employeeId || req.params.userId
    const reason = req.body?.reason || req.body?.rejectionReason || null

    const isObjId = mongoose.isValidObjectId(idParam)
    const employee = await User.findOne({
      role: { $in: ["employee", "Employee", "EMPLOYEE"] },
      $or: [
        ...(isObjId ? [{ _id: idParam }] : []),
        { employeeId: idParam },
      ],
    })

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found." })
    }

    const empOrg = String(employee.organisationId)
    const hrOrg = String(req.user.organisationId)
    if (empOrg !== hrOrg) {
      return res.status(403).json({ success: false, message: "Access denied: cross-organisation action." })
    }

    employee.status = "Rejected"
    employee.rejectedAt = new Date()
    employee.rejectedBy = req.user._id
    if (reason) {
      employee.rejectionReason = String(reason).trim()
    }
    await employee.save()

    console.log(`[AUTH] HR rejected employee: ${employee.username || employee.email}${reason ? ` (Reason: ${reason})` : ""}`)

    await logActivity({
      req,
      user: req.user,
      action: "Rejected Employee",
      status: "Success",
      organisationId: req.user.organisationId,
      entityType: "User",
      entityId: employee._id,
      details: `Rejected Employee ${employee.name} (${employee.username || employee.email})${reason ? ` - Reason: ${reason}` : ""}`,
    })

    return res.status(200).json({
      success: true,
      message: "Employee rejected.",
      user: employee.toSafeObject(),
    })
  } catch (err) {
    console.error("[AUTH] HR reject error:", err.message)
    res.status(500).json({ success: false, message: "Server error during rejection." })
  }
}

router.post("/hr/reject/:userId", requireHR, handleRejectEmployee)
router.post("/reject/:userId", requireHR, handleRejectEmployee)
router.patch("/hr/employees/:employeeId/reject", requireHR, handleRejectEmployee)
router.patch("/employees/:employeeId/reject", requireHR, handleRejectEmployee)

module.exports = router
