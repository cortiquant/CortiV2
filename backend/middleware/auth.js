const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")
const User = require("../models/User")

// ─────────────────────────────────────────────────────────────────────────────
// requireAuth
// Verifies the JWT in the Authorization header.
// Attaches the full User document to req.user.
// ─────────────────────────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    const hasHeader = Boolean(authHeader)
    const hasBearer = Boolean(authHeader && authHeader.startsWith("Bearer "))

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn(`[AUTH DEBUG] ${req.method} ${req.path} -> No valid Bearer header (hasHeader: ${hasHeader}, hasBearer: ${hasBearer})`)
      return res.status(401).json({ success: false, message: "No token provided." })
    }

    const token = authHeader.slice(7).trim()

    let decoded
    const secret = process.env.JWT_SECRET
    try {
      decoded = jwt.verify(token, secret)
      console.log(`[AUTH DEBUG] ${req.method} ${req.path} -> JWT verified. decoded userId: ${decoded.id}, role: ${decoded.role || "n/a"}`)
    } catch (err) {
      console.warn(`[AUTH DEBUG] ${req.method} ${req.path} -> JWT verification failed: ${err.message}`)
      return res.status(401).json({ success: false, message: "Token is invalid or expired." })
    }

    // Fetch fresh user or listener from DB (catches deleted / deactivated accounts)
    let user = null
    const Listener = require("../models/Listener")

    if (decoded.id === "founder-admin-root") {
      user = await User.findOne({ email: decoded.email || "soham.founder@gmail.com", role: "admin" })
      if (!user) {
        user = await User.findById(decoded.id).catch(() => null)
      }
      if (!user) {
        user = {
          _id: "founder-admin-root",
          name: "Soham (Founder)",
          email: decoded.email || "soham.founder@gmail.com",
          role: "admin",
          status: "Approved",
        }
      }
    } else if (mongoose.isValidObjectId(decoded.id)) {
      // Check if user is a Listener first if role indicated, or query both
      if (decoded.role === "LISTENER" || decoded.role === "listener") {
        user = await Listener.findById(decoded.id)
      }
      if (!user) {
        user = await User.findById(decoded.id)
      }
      if (!user) {
        user = await Listener.findById(decoded.id)
      }
      if (!user) {
        console.warn(`[AUTH DEBUG] ${req.method} ${req.path} -> User/Listener not found in DB: ${decoded.id}`)
        return res.status(401).json({ success: false, message: "User no longer exists." })
      }
    } else {
      user = await User.findOne({ email: decoded.email })
      if (!user) {
        user = await Listener.findOne({ email: decoded.email })
      }
      if (!user) {
        return res.status(401).json({ success: false, message: "User no longer exists." })
      }
    }

    req.user = user
    if (user.role === "LISTENER" || (user.role && user.role.toLowerCase() === "listener")) {
      req.listener = user
    }
    next()
  } catch (err) {
    console.error("[AUTH] requireAuth error:", err.message)
    res.status(500).json({ success: false, message: "Authentication error." })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// requireUser / requireEmployee
// Authenticated CortiQuant user access. Every authenticated user (B2C user or employee)
// has full access to personal wellbeing functionality.
// ─────────────────────────────────────────────────────────────────────────────
async function requireUser(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err)
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." })
    }
    const role = (req.user?.role || "").toLowerCase()
    // Restrict only pure external listener accounts from user personal features
    if (role === "listener") {
      return res.status(403).json({ success: false, message: "Access restricted to CortiQuant user accounts." })
    }
    // Block disabled / inactive accounts
    if (req.user?.status === "Disabled" || req.user?.status === "Inactive") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact support.",
        status: req.user.status,
      })
    }
    next()
  })
}

const requireEmployee = requireUser

// ─────────────────────────────────────────────────────────────────────────────
// requireActiveEmployee
// Personal features belong to the authenticated user.
// Personal MSI, assessments, baseline, history, and recommendations are available
// to every authenticated user. Organisation status/approval is ONLY required for
// corporate/workplace employee features, never for personal wellbeing.
// ─────────────────────────────────────────────────────────────────────────────
async function requireActiveEmployee(req, res, next) {
  requireUser(req, res, next)
}

// ─────────────────────────────────────────────────────────────────────────────
// requireHR
// Requires valid JWT AND role === 'hr' or 'admin'
// ─────────────────────────────────────────────────────────────────────────────
async function requireHR(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err)
    const role = (req.user?.role || "").toLowerCase()
    if (role !== "hr" && role !== "admin") {
      return res.status(403).json({ success: false, message: "Access restricted to HR accounts." })
    }
    next()
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// requireAdmin
// Requires valid JWT AND role === 'admin'
// ─────────────────────────────────────────────────────────────────────────────
async function requireAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err)
    const role = (req.user?.role || "").toLowerCase()
    if (role !== "admin") {
      return res.status(403).json({ success: false, message: "You are not authorized to perform this action." })
    }
    next()
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// requireListener
// Requires valid JWT AND role === 'LISTENER' (or 'listener')
// ─────────────────────────────────────────────────────────────────────────────
async function requireListener(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err)
    const role = (req.user?.role || "").toUpperCase()
    if (role !== "LISTENER") {
      return res.status(403).json({ success: false, message: "Access restricted to Peer-Support Listeners." })
    }
    if (req.user?.status === "Inactive") {
      return res.status(403).json({ success: false, message: "Your listener account has been deactivated. Please contact administrator." })
    }
    if (req.user?.status === "Pending") {
      return res.status(403).json({ success: false, message: "Your listener account invitation is pending acceptance." })
    }
    next()
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// signToken — helper used by auth routes
// ─────────────────────────────────────────────────────────────────────────────
function signToken(userId, extra = {}) {
  const idStr = userId && typeof userId === "object" && userId.toString
    ? userId.toString()
    : String(userId)

  const payload = {
    id: idStr,
  }

  if (extra && typeof extra === "object") {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== null) {
        payload[k] = typeof v === "object" && v.toString ? v.toString() : v
      }
    }
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  })
}

module.exports = {
  requireAuth,
  requireUser,
  requireEmployee,
  requireActiveEmployee,
  requireHR,
  requireAdmin,
  requireListener,
  signToken,
}
