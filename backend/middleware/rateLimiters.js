const rateLimit = require("express-rate-limit")

/**
 * Safe diagnostic logger for rate limiting events.
 * Logs endpoint, client IP, HTTP method, timestamp, limiter type, and account identifier if safely available.
 * NEVER logs passwords, tokens, or sensitive credentials.
 */
function logRateLimitViolation(limiterType, req, explicitIdentifier = null) {
  const timestamp = new Date().toISOString()
  const clientIp = req.ip || req.connection?.remoteAddress || "unknown"
  const method = req.method
  const endpoint = req.originalUrl || req.url

  let safeIdentifier = explicitIdentifier
  if (!safeIdentifier) {
    const rawId = req.body?.username || req.body?.email || req.body?.identifier
    if (typeof rawId === "string" && rawId.trim()) {
      safeIdentifier = rawId.trim().toLowerCase()
      if (safeIdentifier.includes("@")) {
        const [local, domain] = safeIdentifier.split("@")
        const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : `${local[0]}***`
        safeIdentifier = `${maskedLocal}@${domain}`
      }
    }
  }

  const accountInfo = safeIdentifier ? ` | Account: ${safeIdentifier}` : ""
  console.warn(
    `[RATE_LIMIT_BLOCKED] [${timestamp}] Limiter: ${limiterType} | IP: ${clientIp} | ${method} ${endpoint}${accountInfo}`
  )
}

// ── Global API Limiter (Volumetric DDoS / Brute-force flood protection) ────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.GLOBAL_RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
  handler: (req, res, _next, options) => {
    logRateLimitViolation("GLOBAL_API", req)
    res.status(options.statusCode).json(options.message)
  },
})

// ── Primary Login Protection: Account/Email Identifier ─────────────────────────
// Focuses on the account being targeted. If an attacker repeatedly enters wrong
// passwords for an account, only that account is throttled.
// Crucially uses skipSuccessfulRequests: true so legitimate logins do not count.
const accountLoginLimiter = rateLimit({
  windowMs: (Number(process.env.LOGIN_ACCOUNT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: Number(process.env.LOGIN_ACCOUNT_MAX) || 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const rawId = req.body?.username || req.body?.email || req.body?.identifier
    if (typeof rawId === "string" && rawId.trim()) {
      return `account:${rawId.trim().toLowerCase()}`
    }
    return `ip:${req.ip}`
  },
  message: {
    success: false,
    message: "Too many login attempts. Please wait a few minutes and try again.",
  },
  handler: (req, res, _next, options) => {
    logRateLimitViolation("ACCOUNT_LOGIN", req)
    res.status(options.statusCode).json(options.message)
  },
})

// ── Secondary Login Protection: IP-based Burst / Spray Protection ─────────────
// Protects against automated bots spraying passwords across multiple accounts from one IP.
// Generous threshold allows shared Wi-Fi / NAT networks during onboarding events.
// Crucially uses skipSuccessfulRequests: true so legitimate logins do not count.
const ipLoginLimiter = rateLimit({
  windowMs: (Number(process.env.LOGIN_IP_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: Number(process.env.LOGIN_IP_MAX) || 50,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: {
    success: false,
    message: "Too many login attempts. Please wait a few minutes and try again.",
  },
  handler: (req, res, _next, options) => {
    logRateLimitViolation("IP_LOGIN", req)
    res.status(options.statusCode).json(options.message)
  },
})

// ── Signup Limiter (Account Creation Abuse Protection) ────────────────────────
// Protects signup endpoints without blocking entire rooms of users at onboarding events.
// Generous event quota (60 per 15 mins per IP) while stopping automated bot scripts.
const signupLimiter = rateLimit({
  windowMs: (Number(process.env.SIGNUP_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: Number(process.env.SIGNUP_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: {
    success: false,
    message: "Too many signup attempts. Please wait a few minutes and try again.",
  },
  handler: (req, res, _next, options) => {
    logRateLimitViolation("SIGNUP", req)
    res.status(options.statusCode).json(options.message)
  },
})

// ── Organisation Code Verification Limiter ────────────────────────────────────
// Prevents brute-forcing valid company codes without blocking users typing typos.
const orgVerificationLimiter = rateLimit({
  windowMs: (Number(process.env.ORG_VERIFY_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: Number(process.env.ORG_VERIFY_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: {
    success: false,
    message: "Too many organisation verification attempts. Please wait a few minutes and try again.",
  },
  handler: (req, res, _next, options) => {
    logRateLimitViolation("ORG_VERIFY", req)
    res.status(options.statusCode).json(options.message)
  },
})

// ── Password Reset Limiter ────────────────────────────────────────────────────
// Protects forgot-password and reset-password against email spam and token guessing.
const passwordResetLimiter = rateLimit({
  windowMs: (Number(process.env.RESET_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: Number(process.env.RESET_MAX) || 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: {
    success: false,
    message: "Too many password reset requests. Please wait a few minutes and try again.",
  },
  handler: (req, res, _next, options) => {
    logRateLimitViolation("PASSWORD_RESET", req)
    res.status(options.statusCode).json(options.message)
  },
})

module.exports = {
  globalLimiter,
  accountLoginLimiter,
  ipLoginLimiter,
  signupLimiter,
  orgVerificationLimiter,
  passwordResetLimiter,
  logRateLimitViolation,
}
