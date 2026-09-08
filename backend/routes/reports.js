const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const Organisation = require("../models/Organisation")
const Department = require("../models/Department")
const User = require("../models/User")
const Assessment = require("../models/Assessment")
const Intervention = require("../models/Intervention")
const InterventionSession = require("../models/InterventionSession")
const ReportSchedule = require("../models/ReportSchedule")
const { requireHR } = require("../middleware/auth")
const { ensureDepartmentsForOrg } = require("../services/departmentService")
const { ensureInterventionsForOrg } = require("../services/interventionService")
const { generateReportInsights } = require("../services/aiReportInsightService")
const { generateDocxReport } = require("../services/reportGenerator")

// Helper: Resolve organisation for authenticated HR
async function resolveHROrg(req) {
  const hrOrgId = req.user.organisationId
  if (!hrOrgId) return null
  return Organisation.findOne({
    $or: [
      { _id: mongoose.isValidObjectId(hrOrgId) ? hrOrgId : null },
      { organisationId: hrOrgId },
      { organisationId: String(hrOrgId) },
    ],
  })
}

function mapMsiToState(msi) {
  if (msi == null) return "normal"
  if (msi <= 40) return "normal"
  if (msi <= 60) return "acute"
  if (msi <= 80) return "persistent"
  return "burnout-risk"
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/reports
// Returns available report cards with live 'Ready' or 'Insufficient data' status
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrg(req)
    if (!org) return res.status(404).json({ success: false, message: "Organisation not found." })

    const now = new Date()
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const currentMonthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`
    const quarterNum = Math.floor(now.getMonth() / 3) + 1
    const currentQuarterLabel = `Q${quarterNum} ${now.getFullYear()}`

    // Check recent assessments to determine data availability
    const totalAssessments = await Assessment.countDocuments({
      $or: [
        { organisationId: org.organisationId },
        { organisationId: String(org._id) },
        ...(mongoose.isValidObjectId(org._id) ? [{ organisationId: org._id }] : []),
      ],
      status: "Completed",
    })

    const hasData = totalAssessments >= 3

    const cards = [
      {
        id: "monthly-wellbeing",
        name: "Monthly Wellbeing Report",
        period: currentMonthLabel,
        desc: "Complete workforce stress summary, team breakdown, and intervention impact.",
        type: "Monthly",
        status: hasData ? "Ready" : "Insufficient data",
        ready: hasData,
      },
      {
        id: "quarterly-stress",
        name: "Workforce Stress Summary",
        period: currentQuarterLabel,
        desc: "Quarterly aggregated stress trends, state distribution, and systemic patterns.",
        type: "Quarterly",
        status: hasData ? "Ready" : "Insufficient data",
        ready: hasData,
      },
      {
        id: "intervention-impact",
        name: "Intervention Impact Report",
        period: currentMonthLabel,
        desc: "Pre/post analysis of all Reset Lab and recovery sessions.",
        type: "Impact",
        status: hasData ? "Ready" : "Insufficient data",
        ready: hasData,
      },
      {
        id: "workforce-insights",
        name: "Workforce Insights Report",
        period: currentQuarterLabel,
        desc: "Executive AI-synthesized intelligence across workforce stress drivers.",
        type: "Quarterly",
        status: hasData ? "Ready" : "Insufficient data",
        ready: hasData,
      },
    ]

    return res.status(200).json({ success: true, reports: cards })
  } catch (err) {
    console.error("[HR-REPORTS] Error loading report cards:", err.message)
    return res.status(500).json({ success: false, message: "Error loading reports." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Reusable helper to compile full report data for an organisation
// ─────────────────────────────────────────────────────────────────────────────
async function compileReportMetrics(org, { reportType = "monthly", year, month, quarter } = {}) {
  const now = new Date()
  let startDate, endDate, periodLabel

  if (reportType === "quarterly" || reportType === "quarterly-stress" || reportType === "workforce-insights") {
    const q = parseInt(quarter) || Math.floor(now.getMonth() / 3) + 1
    const y = parseInt(year) || now.getFullYear()
    const startMonth = (q - 1) * 3
    startDate = new Date(y, startMonth, 1)
    endDate = new Date(y, startMonth + 3, 0, 23, 59, 59, 999)
    periodLabel = `Q${q} ${y}`
  } else {
    // Monthly, Intervention Impact, or others default
    const m = month !== undefined ? parseInt(month) : now.getMonth()
    const y = parseInt(year) || now.getFullYear()
    startDate = new Date(y, m, 1)
    endDate = new Date(y, m + 1, 0, 23, 59, 59, 999)
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    periodLabel = `${monthNames[m]} ${y}`
  }

  const orgIdFilter = [
    { organisationId: org.organisationId },
    { organisationId: String(org._id) },
    ...(mongoose.isValidObjectId(org._id) ? [{ organisationId: org._id }] : []),
  ]

  // 1. Employees
  const employees = await User.find({
    role: { $in: ["employee", "Employee", "EMPLOYEE"] },
    $or: orgIdFilter,
  }).select("_id employeeId name department departmentId status baselineMsi")

  const activeEmployees = employees.filter((e) => e.status === "Active" || e.status === "Approved")
  const activeCount = activeEmployees.length

  // 2. Assessments in period
  const assessmentsInPeriod = await Assessment.find({
    $or: orgIdFilter,
    createdAt: { $gte: startDate, $lte: endDate },
    status: "Completed",
  }).select("userId departmentId department msi responses scores createdAt completedAt")

  // Previous period for comparison
  const periodDurationMs = endDate.getTime() - startDate.getTime()
  const prevStartDate = new Date(startDate.getTime() - periodDurationMs)
  const prevEndDate = new Date(startDate.getTime() - 1)

  const prevAssessments = await Assessment.find({
    $or: orgIdFilter,
    createdAt: { $gte: prevStartDate, $lte: prevEndDate },
    status: "Completed",
  }).select("userId departmentId department msi createdAt completedAt")

  const currentMSI = assessmentsInPeriod.length > 0
    ? Math.round(assessmentsInPeriod.reduce((acc, a) => acc + (a.msi || 0), 0) / assessmentsInPeriod.length)
    : null

  const previousMSI = prevAssessments.length > 0
    ? Math.round(prevAssessments.reduce((acc, a) => acc + (a.msi || 0), 0) / prevAssessments.length)
    : null

  const msiChange = currentMSI != null && previousMSI != null ? currentMSI - previousMSI : null

  // Participation
  const participatingUsers = new Set(assessmentsInPeriod.map((a) => String(a.userId)))
  const participationRate = activeCount > 0 ? Math.min(100, Math.round((participatingUsers.size / activeCount) * 100)) : 0

  // Stress state distribution
  const stateCounts = { normal: 0, acute: 0, persistent: 0, "burnout-risk": 0 }
  for (const a of assessmentsInPeriod) {
    const s = mapMsiToState(a.msi)
    stateCounts[s]++
  }
  const totalAssessed = assessmentsInPeriod.length
  const stressStates = [
    { state: "Normal", pct: totalAssessed > 0 ? Math.round((stateCounts.normal / totalAssessed) * 100) : 0, count: stateCounts.normal, color: "#4A9E7A" },
    { state: "Acute", pct: totalAssessed > 0 ? Math.round((stateCounts.acute / totalAssessed) * 100) : 0, count: stateCounts.acute, color: "#9B5DE5" },
    { state: "Persistent", pct: totalAssessed > 0 ? Math.round((stateCounts.persistent / totalAssessed) * 100) : 0, count: stateCounts.persistent, color: "#7E4CC7" },
    { state: "Burnout-risk", pct: totalAssessed > 0 ? Math.round((stateCounts["burnout-risk"] / totalAssessed) * 100) : 0, count: stateCounts["burnout-risk"], color: "#B86B64" },
  ]

  // 3. Departments (using stable departmentId)
  const allOrgDepts = await ensureDepartmentsForOrg(org.organisationId)
  const departmentsData = []

  for (const dept of allOrgDepts) {
    const deptEmployees = employees.filter((e) => e.departmentId === dept.departmentId || e.department === dept.name)
    const inDept = assessmentsInPeriod.filter((a) => a.departmentId === dept.departmentId || a.department === dept.name)
    const prevInDept = prevAssessments.filter((a) => a.departmentId === dept.departmentId || a.department === dept.name)

    const deptCurrent = inDept.length > 0 ? Math.round(inDept.reduce((acc, a) => acc + (a.msi || 0), 0) / inDept.length) : null
    const deptPrev = prevInDept.length > 0 ? Math.round(prevInDept.reduce((acc, a) => acc + (a.msi || 0), 0) / prevInDept.length) : null
    const deptChange = deptCurrent != null && deptPrev != null && deptPrev > 0 ? Math.round(((deptCurrent - deptPrev) / deptPrev) * 100) : null

    departmentsData.push({
      departmentId: dept.departmentId,
      name: dept.name,
      employeeCount: deptEmployees.length,
      currentMSI: deptCurrent,
      previousMSI: deptPrev,
      changePercent: deptChange,
      state: mapMsiToState(deptCurrent),
    })
  }

  // 4. Interventions (All recovery categories: Reset Labs, Listener, Dump Bag, Guided, Workshops)
  await ensureInterventionsForOrg(org.organisationId)
  const sessions = await InterventionSession.find({
    organisationId: org.organisationId,
    status: "Completed",
    startedAt: { $gte: startDate, $lte: endDate },
  })

  const interventionsCatalog = await Intervention.find({ organisationId: org.organisationId, status: { $ne: "Archived" } })
  const interventionsData = []

  for (const inv of interventionsCatalog) {
    const invSessions = sessions.filter((s) => String(s.interventionId) === String(inv._id) || s.interventionName.toLowerCase() === inv.name.toLowerCase())
    const participants = new Set(invSessions.map((s) => String(s.employeeId))).size

    let preSum = 0, preCount = 0, postSum = 0, postCount = 0
    for (const s of invSessions) {
      if (s.preMSI != null) { preSum += s.preMSI; preCount++ }
      if (s.postMSI != null) { postSum += s.postMSI; postCount++ }
    }

    const avgPre = preCount > 0 ? Math.round(preSum / preCount) : null
    const avgPost = postCount > 0 ? Math.round(postSum / postCount) : null
    const delta = avgPre != null && avgPost != null ? avgPost - avgPre : null

    interventionsData.push({
      name: inv.name,
      category: inv.category,
      type: inv.type,
      sessions: invSessions.length,
      participants,
      preMSI: avgPre,
      postMSI: avgPost,
      delta,
      hasData: invSessions.length > 0,
    })
  }

  // 5. Workforce Trend Points (4 weekly points)
  const trend = []
  const numPoints = 4
  const intervalMs = (endDate.getTime() - startDate.getTime()) / numPoints
  for (let i = 0; i < numPoints; i++) {
    const pStart = new Date(startDate.getTime() + i * intervalMs)
    const pEnd = new Date(startDate.getTime() + (i + 1) * intervalMs)
    const pAssessments = assessmentsInPeriod.filter((a) => {
      const t = new Date(a.completedAt || a.createdAt).getTime()
      return t >= pStart.getTime() && t < pEnd.getTime()
    })
    const avg = pAssessments.length > 0 ? Math.round(pAssessments.reduce((acc, a) => acc + (a.msi || 0), 0) / pAssessments.length) : (currentMSI || 50)
    const label = `W${i + 1}`
    trend.push({ label, msi: avg })
  }

  // Aggregated payload for AI Insights
  const metricsPayload = {
    organisationName: org.name,
    period: periodLabel,
    overallMSI: currentMSI,
    previousMSI,
    change: msiChange,
    participationRate,
    activeEmployees: activeCount,
    stressStates: {
      normal: stressStates[0].pct,
      acute: stressStates[1].pct,
      persistent: stressStates[2].pct,
      burnoutRisk: stressStates[3].pct,
    },
    departments: departmentsData,
    interventions: interventionsData,
  }

  // Generate AI Insights
  const aiInsights = await generateReportInsights(metricsPayload)

  return {
    organisationName: org.name,
    period: periodLabel,
    generatedDate: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    overview: {
      currentMSI,
      previousMSI,
      change: msiChange,
      participationRate,
      totalEmployees: activeCount,
      hasSufficientData: assessmentsInPeriod.length >= 2,
    },
    stressStates,
    departments: departmentsData,
    trend,
    interventions: interventionsData,
    aiInsights,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/reports/data
// Aggregates real report data for specified type and date window
// ─────────────────────────────────────────────────────────────────────────────
router.get("/data", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrg(req)
    if (!org) return res.status(404).json({ success: false, message: "Organisation not found." })

    const { reportType = "monthly", year, month, quarter } = req.query
    const compiled = await compileReportMetrics(org, { reportType, year, month, quarter })

    return res.status(200).json({
      success: true,
      data: compiled,
    })
  } catch (err) {
    console.error("[HR-REPORTS-DATA] Error compiling report:", err.message)
    return res.status(500).json({ success: false, message: "Error compiling report data." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/reports/:reportId/export/docx
// or POST /api/hr/reports/generate (for dynamic download of editable DOCX)
// ─────────────────────────────────────────────────────────────────────────────
const reportTypeTitles = {
  "monthly-wellbeing": "Monthly Wellbeing Report",
  "quarterly-stress": "Workforce Stress Summary",
  "intervention-impact": "Intervention Impact Report",
  "workforce-insights": "Workforce Insights Report",
  "monthly": "Monthly Wellbeing Report",
  "quarterly": "Workforce Stress Summary",
}

router.get("/:reportId/export/docx", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrg(req)
    if (!org) return res.status(404).json({ success: false, message: "Organisation not found." })

    const reportIdParam = req.params.reportId
    const { year, month, quarter } = req.query

    const resolvedTitle = reportTypeTitles[reportIdParam] || "Monthly Wellbeing Report"
    const isQuarterly = reportIdParam === "quarterly-stress" || reportIdParam === "workforce-insights"
    
    // Compile actual MongoDB data
    const compiled = await compileReportMetrics(org, {
      reportType: isQuarterly ? "quarterly" : "monthly",
      year,
      month,
      quarter,
    })

    // Generate unique report ID and timestamp
    const uniqueReportId = `CQ-RPT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    
    const docxPayload = {
      ...compiled,
      reportId: uniqueReportId,
      reportTitle: resolvedTitle,
      reportType: resolvedTitle,
      documentVersion: "1.0",
    }

    const buffer = await generateDocxReport(docxPayload)

    const sanitizedOrg = (org.name || "Organisation").replace(/[^a-zA-Z0-9_-]/g, "_")
    const sanitizedTitle = resolvedTitle.replace(/[^a-zA-Z0-9_-]/g, "_")
    const filename = `CortiQuant_${sanitizedOrg}_${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.docx`

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("Content-Length", buffer.length)

    return res.status(200).send(buffer)
  } catch (err) {
    console.error("[HR-DOCX-EXPORT] Error generating DOCX report:", err.message)
    return res.status(500).json({ success: false, message: "Failed to generate DOCX report: " + err.message })
  }
})

router.post("/generate", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrg(req)
    if (!org) return res.status(404).json({ success: false, message: "Organisation not found." })

    const { reportType = "monthly-wellbeing", year, month, quarter } = req.body

    const resolvedTitle = reportTypeTitles[reportType] || "Monthly Wellbeing Report"
    const isQuarterly = reportType === "quarterly-stress" || reportType === "workforce-insights"

    const compiled = await compileReportMetrics(org, {
      reportType: isQuarterly ? "quarterly" : "monthly",
      year,
      month,
      quarter,
    })

    const uniqueReportId = `CQ-RPT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

    const docxPayload = {
      ...compiled,
      reportId: uniqueReportId,
      reportTitle: resolvedTitle,
      reportType: resolvedTitle,
      documentVersion: "1.0",
    }

    const buffer = await generateDocxReport(docxPayload)

    const sanitizedOrg = (org.name || "Organisation").replace(/[^a-zA-Z0-9_-]/g, "_")
    const sanitizedTitle = resolvedTitle.replace(/[^a-zA-Z0-9_-]/g, "_")
    const filename = `CortiQuant_${sanitizedOrg}_${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.docx`

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("Content-Length", buffer.length)

    return res.status(200).send(buffer)
  } catch (err) {
    console.error("[HR-DOCX-GENERATE] Error:", err.message)
    return res.status(500).json({ success: false, message: "Failed to generate report: " + err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/reports/schedules & POST /api/hr/reports/schedule
// ─────────────────────────────────────────────────────────────────────────────
router.get("/schedules", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrg(req)
    if (!org) return res.status(404).json({ success: false, message: "Organisation not found." })

    const schedules = await ReportSchedule.find({ organisationId: org.organisationId }).sort({ createdAt: -1 })
    return res.status(200).json({ success: true, schedules })
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error fetching schedules." })
  }
})

router.post("/schedule", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrg(req)
    if (!org) return res.status(404).json({ success: false, message: "Organisation not found." })

    const { reportType, frequency = "monthly", recipientEmail } = req.body
    const email = recipientEmail || req.user.email

    if (!email) {
      return res.status(400).json({ success: false, message: "Recipient email is required." })
    }

    const schedule = new ReportSchedule({
      organisationId: org.organisationId,
      createdBy: req.user._id,
      reportType: reportType || "Monthly Wellbeing Report",
      frequency,
      recipientEmail: email,
      active: true,
    })

    await schedule.save()
    return res.status(201).json({ success: true, message: "Report schedule created.", schedule })
  } catch (err) {
    console.error("[HR-REPORT-SCHEDULE] Error:", err.message)
    return res.status(500).json({ success: false, message: "Error creating schedule." })
  }
})

router.delete("/schedules/:id", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrg(req)
    if (!org) return res.status(404).json({ success: false, message: "Organisation not found." })

    await ReportSchedule.findOneAndDelete({ _id: req.params.id, organisationId: org.organisationId })
    return res.status(200).json({ success: true, message: "Schedule deleted." })
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error deleting schedule." })
  }
})

module.exports = router
