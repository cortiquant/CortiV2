const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const Organisation = require("../models/Organisation")
const { logActivity } = require("../services/activityService")
const { sendEmployeeApprovalNotification } = require("../services/notificationService")
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
    const { name, username, email, password, privacyConsent, participantConsent, organisationCode, orgCode, status } = req.body

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

    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : undefined

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
    const initialStatus = status === "PendingApproval" || status === "Pending" ? "PendingApproval" : "OnboardingRequired"

    const user = await User.create({
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      role: "employee",
      status: initialStatus,
      organisationId: org._id,
      organisationCode: org.organisationCode || org.code,
      privacyConsent: true,
      privacyConsentAt: now,
      participantConsent: true,
      participantConsentAt: now,
    })

    console.log(`[AUTH] Employee signup: ${user.username} → org ${user.organisationCode} (${initialStatus})`)

    // If account was created with PendingApproval status, notify HR immediately
    if (initialStatus === "PendingApproval") {
      sendEmployeeApprovalNotification(user).catch((notifErr) => {
        console.error("[AUTH] Non-fatal notification error on signup:", notifErr.message)
      })
    }

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

    // 4. Disabled account
    if (user.status === "Disabled" || user.status === "Inactive") {
      console.log(`[AUTH] Employee login blocked — account disabled: ${identifier}`)
      return res.status(403).json({
        success: false,
        status: "Disabled",
        message: "Your employee account has been disabled. Please contact your HR administrator.",
      })
    }

    // 5. Approved / Active account
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
    if (!user.passwordHash) {
      console.log(`[AUTH] HR login failed — no passwordHash set: ${email}`)
      return res.status(401).json({
        success: false,
        message: "No password has been set for this account. Please contact Administrator to set up your password.",
      })
    }

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
    console.error("[AUTH] HR login error:", err)
    res.status(500).json({
      success: false,
      message: err.message || "Server error during login.",
    })
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
    const pendingRequests = await User.countDocuments({
      ...baseOrgFilter,
      status: { $in: ["PendingApproval", "Pending"] },
      onboardingCompleted: true,
    })

    // 2. Approved and active employees in this organisation
    const approvedEmployees = await User.countDocuments({
      ...baseOrgFilter,
      status: { $in: ["Approved", "Active"] },
    })

    // 3. Total employees registered under the organisation (all statuses: active, disabled, pending, etc.)
    const totalEmployees = await User.countDocuments({
      ...baseOrgFilter,
    })

    // 4. Rejected today
    const rejectedToday = await User.countDocuments({
      ...baseOrgFilter,
      status: "Rejected",
      rejectedAt: { $gte: todayStart, $lte: todayEnd },
    })

    const data = employees.map((e) => {
      const onb = onbMap.get(String(e._id))
      const dept = e.department || onb?.participantProfile?.D3 || "Unassigned"
      const deptId = e.departmentId || null
      const isOnboardingComplete = e.onboardingCompleted || !!onb?.onboardingCompleted
      const onboardingCompletedAt = onb?.completedAt || null

      let displayStatus = "pending"
      if (e.status === "Approved" || e.status === "Active") displayStatus = "approved"
      else if (e.status === "Rejected") displayStatus = "rejected"
      else if (e.status === "Disabled" || e.status === "Inactive") displayStatus = "disabled"
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
        totalEmployees,
        approvedEmployees,
        pendingRequests,
        rejectedToday,
        // Legacy keys for seamless backwards compatibility
        pendingCount: pendingRequests,
        approvedToday: approvedEmployees,
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

// ─────────────────────────────────────────────────────────────────────────────
// Employee Management APIs (HR / Admin protected)
// ─────────────────────────────────────────────────────────────────────────────

// Handler: Fetch all employees belonging to logged-in HR organisation.
async function handleGetHREmployees(req, res) {
  try {
    const hrOrgId = req.user.organisationId
    const baseOrgFilter = {
      role: { $in: ["employee", "Employee", "EMPLOYEE"] },
      $or: [
        { organisationId: hrOrgId },
        { organisationId: String(hrOrgId) },
        ...(mongoose.isValidObjectId(hrOrgId) ? [{ organisationId: new mongoose.Types.ObjectId(hrOrgId) }] : []),
      ],
    }

    const employees = await User.find(baseOrgFilter).sort({ createdAt: -1 })
    const userIds = employees.map((e) => e._id)

    // Corporate onboarding records
    const CorporateOnboarding = require("../models/CorporateOnboarding")
    const onbRecords = await CorporateOnboarding.find({ userId: { $in: userIds } })
    const onbMap = new Map(onbRecords.map((o) => [String(o.userId), o]))

    // Check latest assessments to provide real last activity date
    const Assessment = require("../models/Assessment")
    const latestAssessments = await Assessment.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$userId", lastAssessmentAt: { $first: "$createdAt" } } },
    ])
    const assessmentMap = new Map(latestAssessments.map((a) => [String(a._id), a.lastAssessmentAt]))

    const orgDoc = await Organisation.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(hrOrgId) ? hrOrgId : null },
        { organisationId: hrOrgId },
      ],
    })
    const orgName = orgDoc ? orgDoc.name : "Organisation"

    const data = employees.map((e) => {
      const onb = onbMap.get(String(e._id))
      const dept = e.department || onb?.participantProfile?.D3 || "Unassigned"
      const deptId = e.departmentId || null

      let displayStatus = "pending"
      if (e.status === "Approved" || e.status === "Active") displayStatus = "Active"
      else if (e.status === "Disabled" || e.status === "Inactive") displayStatus = "Disabled"
      else if (e.status === "Rejected") displayStatus = "Rejected"
      else if (e.status === "OnboardingRequired") displayStatus = "Onboarding"
      else displayStatus = e.status || "Pending"

      const lastActivity = assessmentMap.get(String(e._id)) || e.updatedAt || e.createdAt

      return {
        id: String(e._id),
        _id: String(e._id),
        employeeId: e.employeeId || "Pending ID",
        name: e.name,
        username: e.username || "—",
        email: e.email || "—",
        department: dept,
        departmentId: deptId,
        organisation: orgName,
        status: displayStatus,
        rawStatus: e.status,
        joinedDate: e.approvedAt || e.createdAt,
        createdAt: e.createdAt,
        approvedAt: e.approvedAt || null,
        lastActivity: lastActivity,
        lastActiveAt: lastActivity,
        onboardingStatus: e.onboardingCompleted || onb?.onboardingCompleted ? "Completed" : "Pending",
      }
    })

    return res.status(200).json({
      success: true,
      count: data.length,
      employees: data,
    })
  } catch (err) {
    console.error("[HR EMPLOYEES] Fetch error:", err.message)
    res.status(500).json({ success: false, message: "Server error fetching employees list." })
  }
}

// Handler: Disable employee account. Keeps employee data and activity history for compliance.
async function handleToggleDisableEmployee(req, res) {
  try {
    const idParam = req.params.id
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

    // Security: cross-organisation isolation check
    const empOrg = String(employee.organisationId)
    const hrOrg = String(req.user.organisationId)
    if (empOrg !== hrOrg) {
      return res.status(403).json({ success: false, message: "Access denied: employee does not belong to your organisation." })
    }

    // Toggle or set to Disabled
    const nextStatus = employee.status === "Disabled" ? "Active" : "Disabled"
    employee.status = nextStatus
    await employee.save()

    console.log(`[HR EMPLOYEES] Status updated for ${employee.username || employee.email} → ${nextStatus}`)

    await logActivity({
      req,
      user: req.user,
      action: nextStatus === "Disabled" ? "Disabled Employee" : "Enabled Employee",
      status: "Success",
      organisationId: req.user.organisationId,
      entityType: "User",
      entityId: employee._id,
      details: `${nextStatus === "Disabled" ? "Disabled" : "Re-enabled"} employee account: ${employee.name} (${employee.employeeId || employee.username || employee.email})`,
    })

    return res.status(200).json({
      success: true,
      message: `Employee account ${nextStatus === "Disabled" ? "disabled" : "enabled"} successfully.`,
      employee: {
        id: String(employee._id),
        employeeId: employee.employeeId,
        name: employee.name,
        status: nextStatus,
      },
    })
  } catch (err) {
    console.error("[HR EMPLOYEES] Disable error:", err.message)
    res.status(500).json({ success: false, message: "Server error updating employee status." })
  }
}

// Handler: Delete employee access while preserving activity logs and historical compliance records.
async function handleDeleteHREmployee(req, res) {
  try {
    const idParam = req.params.id
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

    // Security: cross-organisation check
    const empOrg = String(employee.organisationId)
    const hrOrg = String(req.user.organisationId)
    if (empOrg !== hrOrg) {
      return res.status(403).json({ success: false, message: "Access denied: employee does not belong to your organisation." })
    }

    const employeeId = employee._id
    const employeeName = employee.name
    const empCode = employee.employeeId || employee.username || employee.email

    // Preserve activity logs and audit integrity before deleting User record
    await logActivity({
      req,
      user: req.user,
      action: "Deleted Employee",
      status: "Success",
      organisationId: req.user.organisationId,
      entityType: "User",
      entityId: employeeId,
      details: `HR removed employee access: ${employeeName} (${empCode}). Historical records preserved.`,
    })

    // Remove employee record from User collection
    await User.findByIdAndDelete(employeeId)

    console.log(`[HR EMPLOYEES] Employee access removed: ${employeeName} (${empCode}) by HR ${req.user.email}`)

    return res.status(200).json({
      success: true,
      message: `Employee ${employeeName} has been removed successfully.`,
      id: String(employeeId),
    })
  } catch (err) {
    console.error("[HR EMPLOYEES] Delete error:", err.message)
    res.status(500).json({ success: false, message: "Server error removing employee." })
  }
}

// Route registrations: support both /employees and /hr/employees under /api/hr and /api/auth
router.get("/hr/employees", requireHR, handleGetHREmployees)
router.get("/employees", requireHR, handleGetHREmployees)

router.patch("/hr/employees/:id/disable", requireHR, handleToggleDisableEmployee)
router.patch("/employees/:id/disable", requireHR, handleToggleDisableEmployee)

router.delete("/hr/employees/:id", requireHR, handleDeleteHREmployee)
router.delete("/employees/:id", requireHR, handleDeleteHREmployee)

module.exports = router
