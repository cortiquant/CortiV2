const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, ".env") })

const express    = require("express")
const mongoose   = require("mongoose")
const cors       = require("cors")
const rateLimit  = require("express-rate-limit")

const authRoutes        = require("./routes/auth")
const onboardingRoutes  = require("./routes/onboarding")
const adminRoutes       = require("./routes/admin")
const hrInvitationRoutes = require("./routes/hrInvitations")
const assessmentsRoutes = require("./routes/assessments")
const employeeRoutes    = require("./routes/employee")
const rootCauseRoutes   = require("./routes/rootCause")
const aiRoutes          = require("./routes/ai")
const recommendationsRoutes = require("./routes/recommendations")
const dumpbagRoutes     = require("./routes/dumpbag")
const interventionsRoutes = require("./routes/interventions")
const reportsRoutes       = require("./routes/reports")
const hrOverviewRoutes  = require("./routes/hrOverview")
const listenerRoutes    = require("./routes/listeners")
const { verifySMTP }    = require("./services/emailService")

// Safe diagnostic logging (no passwords or credentials exposed)
console.log("[EMAIL CONFIG] SMTP_USER configured:", !!process.env.SMTP_USER)
console.log("[EMAIL CONFIG] SMTP_PASSWORD configured:", !!process.env.SMTP_PASSWORD)
console.log("[EMAIL CONFIG] SMTP_HOST:", process.env.SMTP_HOST || "missing")
console.log("[EMAIL CONFIG] SMTP_PORT:", process.env.SMTP_PORT || "missing")
console.log("[EMAIL CONFIG] EMAIL_FROM configured:", !!process.env.EMAIL_FROM)

// ─────────────────────────────────────────────────────────────────────────────
// Environment validation
// ─────────────────────────────────────────────────────────────────────────────
if (!process.env.MONGODB_URI) {
  console.error("[STARTUP] FATAL: MONGODB_URI is not set. Create backend/.env from .env.example.")
  process.exit(1)
}

if (!process.env.JWT_SECRET) {
  console.error("[STARTUP] FATAL: JWT_SECRET is not set. Create backend/.env from .env.example.")
  process.exit(1)
}

const PORT       = process.env.PORT || 3001
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:8443"

// ─────────────────────────────────────────────────────────────────────────────
// Express app
// ─────────────────────────────────────────────────────────────────────────────
const app = express()

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}))

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true }))

// ── Global rate limiting (protect against brute-force) ────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
})
app.use(globalLimiter)

// ── Stricter limiter for auth endpoints ───────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please wait 15 minutes." },
})
app.use("/api/auth", authLimiter)



// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────
app.use("/api/auth",        authRoutes)
app.use("/api/hr/reports",  reportsRoutes)
app.use("/api/hr",          hrOverviewRoutes)
app.use("/api/hr",          authRoutes)
app.use("/api/onboarding",  onboardingRoutes)
app.use("/api/admin",       adminRoutes)
app.use("/api/hr/invitations", hrInvitationRoutes)
app.use("/api/assessments", assessmentsRoutes)
app.use("/api/employee",    employeeRoutes)
app.use("/api/root-cause-assessments", rootCauseRoutes)
app.use("/api/ai",          aiRoutes)
app.use("/api/recommendations", recommendationsRoutes)
app.use("/api/dumpbag",     dumpbagRoutes)
app.use("/api/interventions", interventionsRoutes)
app.use("/api/listener",      listenerRoutes)
app.use("/api/listeners",     listenerRoutes)
app.use("/api/listener-sessions", listenerRoutes)
app.use("/api/sessions",      listenerRoutes)

// ── Health checks ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  })
})

app.get("/api/health/db", async (req, res) => {
  try {
    const isReady = mongoose.connection.readyState === 1
    if (!isReady) {
      return res.status(503).json({
        success: false,
        database: "disconnected",
      })
    }

    await mongoose.connection.db.admin().ping()

    return res.status(200).json({
      success: true,
      database: "connected",
    })
  } catch {
    return res.status(503).json({
      success: false,
      database: "disconnected",
    })
  }
})

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` })
})

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[SERVER] Unhandled error:", err.message)
  res.status(500).json({ success: false, message: "Internal server error." })
})

// ─────────────────────────────────────────────────────────────────────────────
// MongoDB + Server start
// ─────────────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[SERVER] CortiQuant backend running on http://localhost:${PORT}`)
  console.log(`[SERVER] CORS allowed origin: ${CORS_ORIGIN}`)
})

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n[SERVER ERROR] Port ${PORT} is already in use by another running instance.`)
    console.error(`To release port ${PORT}, terminate the existing node process or check open terminals.\n`)
  } else {
    console.error("[SERVER ERROR]", err)
  }
})

const { startSessionNotificationService } = require("./services/sessionNotificationService")

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log("[DB] Connected to MongoDB Atlas")
    startSessionNotificationService()
  } catch (err) {
    console.warn("\n[DB WARNING] MongoDB Atlas connection could not be established:")
    console.warn(`  --> ${err.message}`)
    console.warn("  --> If using Atlas, ensure your current IP address is whitelisted:")
    console.warn("      https://www.mongodb.com/docs/atlas/security-whitelist/ (or allow 0.0.0.0/0)")
    console.warn("  --> Server will remain running on port " + PORT + " and retry connecting in background.\n")
    setTimeout(connectDB, 15000)
  }
}

connectDB()
verifySMTP()
