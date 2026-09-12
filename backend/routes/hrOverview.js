const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const Organisation = require("../models/Organisation")
const Department = require("../models/Department")
const User = require("../models/User")
const Assessment = require("../models/Assessment")
const Intervention = require("../models/Intervention")
const InterventionSession = require("../models/InterventionSession")
const { requireHR } = require("../middleware/auth")
const { ensureDepartmentsForOrg } = require("../services/departmentService")
const { ensureInterventionsForOrg } = require("../services/interventionService")
const { logActivity } = require("../services/activityService")
const { mapMsiToStressState } = require("../services/msiClassification")

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Resolve organisation document from HR's authenticated context
// ─────────────────────────────────────────────────────────────────────────────
async function resolveHROrganisation(req) {
  const hrOrgId = req.user.organisationId
  if (!hrOrgId) return null

  const org = await Organisation.findOne({
    $or: [
      { _id: mongoose.isValidObjectId(hrOrgId) ? hrOrgId : null },
      { organisationId: hrOrgId },
      { organisationId: String(hrOrgId) },
    ],
  })
  return org
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Format date for chart labels
// ─────────────────────────────────────────────────────────────────────────────
function formatChartDate(d, period) {
  const dateObj = new Date(d)
  if (period === "7d") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return days[dateObj.getDay()]
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[dateObj.getMonth()]} ${dateObj.getDate()}`
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/departments
// GET /api/hr/departments
// Returns departments belonging to the HR's organisation with real MongoDB metrics.
// If ?simple=true is passed, returns a lightweight list for dropdowns.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/departments", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrganisation(req)
    if (!org) {
      return res.status(404).json({ success: false, message: "Organisation not found for this HR account." })
    }

    // Ensure standard departments exist for this organisation
    await ensureDepartmentsForOrg(org.organisationId)

    const orgIdFilter = [
      { organisationId: org.organisationId },
      { organisationId: String(org._id) },
      ...(mongoose.isValidObjectId(org._id) ? [{ organisationId: org._id }] : []),
    ]

    const departments = await Department.find({
      $or: orgIdFilter,
      status: "Active",
    }).sort({ name: 1 })

    // If simple format requested (e.g. for dropdowns), return lightweight array
    if (req.query.simple === "true") {
      const data = departments.map((d) => ({
        departmentId: d.departmentId,
        name: d.name,
        status: d.status,
      }))
      return res.status(200).json({
        success: true,
        data,
      })
    }

    // ── Calculate Real Department Statistics ───────────────────────────────────
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // 1. Fetch all employees belonging to this organisation
    const allOrgEmployees = await User.find({
      role: { $in: ["employee", "Employee", "EMPLOYEE"] },
      $or: orgIdFilter,
    }).select("_id employeeId department departmentId status")

    // 2. Fetch assessments in current 30d period
    const assessmentsInPeriod = await Assessment.find({
      $or: orgIdFilter,
      createdAt: { $gte: thirtyDaysAgo },
    }).select("userId departmentId department msi responses scores createdAt completedAt")

    // 3. Fetch assessments in previous 30d period (for change %)
    const prevAssessments = await Assessment.find({
      $or: orgIdFilter,
      createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
    }).select("userId departmentId department msi createdAt completedAt")

    // 4. Fetch all assessments for elevated duration & historical tracking
    const allHistoricalAssessments = await Assessment.find({
      $or: orgIdFilter,
    }).select("userId departmentId department msi createdAt completedAt")

    // 4 weekly windows for elevated duration check (up to 4 weeks back)
    const weeklyWindows = []
    for (let i = 0; i < 4; i++) {
      const wEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const wStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      weeklyWindows.push({ start: wStart, end: wEnd })
    }

    const resultDepartments = []

    for (const dept of departments) {
      // Find all employees belonging to this department (scoped to org)
      const deptEmployees = allOrgEmployees.filter(
        (e) => e.departmentId === dept.departmentId || e.department === dept.name
      )
      const employeeCount = deptEmployees.length
      const activeEmployees = deptEmployees.filter((e) => e.status === "Active" || e.status === "Approved")
      const activeEmployeeCount = activeEmployees.length

      const deptUserIds = new Set(deptEmployees.map((e) => String(e._id)))

      // Find assessments for this department in 30d
      const deptAssessments30d = assessmentsInPeriod.filter(
        (a) =>
          a.departmentId === dept.departmentId ||
          a.department === dept.name ||
          deptUserIds.has(String(a.userId))
      )

      // Find previous assessments for this department in [60d, 30d)
      const deptPrevAssessments = prevAssessments.filter(
        (a) =>
          a.departmentId === dept.departmentId ||
          a.department === dept.name ||
          deptUserIds.has(String(a.userId))
      )

      // All historical assessments for this dept
      const deptAllAssessments = allHistoricalAssessments.filter(
        (a) =>
          a.departmentId === dept.departmentId ||
          a.department === dept.name ||
          deptUserIds.has(String(a.userId))
      )

      // ── Current MSI ──
      // Calculate average of latest valid assessments of active employees (or latest check-ins)
      let currentMSI = null
      let hasAssessments = false

      if (deptAssessments30d.length > 0) {
        // Find latest assessment per employee in this department
        const latestPerUser = new Map()
        for (const a of deptAssessments30d) {
          const uId = String(a.userId)
          const dateVal = new Date(a.completedAt || a.createdAt).getTime()
          if (!latestPerUser.has(uId) || dateVal > latestPerUser.get(uId).date) {
            latestPerUser.set(uId, { msi: a.msi, date: dateVal })
          }
        }
        const msiList = Array.from(latestPerUser.values()).map((v) => v.msi)
        if (msiList.length > 0) {
          currentMSI = Math.round(msiList.reduce((acc, v) => acc + (v || 0), 0) / msiList.length)
          hasAssessments = true
        }
      } else if (deptAllAssessments.length > 0) {
        // Fallback to latest historical assessments
        const sorted = [...deptAllAssessments].sort(
          (a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime()
        )
        currentMSI = sorted[0].msi
        hasAssessments = true
      }

      // ── Previous MSI & Change % ──
      let previousMSI = null
      let changePercent = null
      let trend = "—"

      if (deptPrevAssessments.length > 0) {
        const prevAvg = Math.round(
          deptPrevAssessments.reduce((sum, a) => sum + (a.msi || 0), 0) / deptPrevAssessments.length
        )
        previousMSI = prevAvg
        if (currentMSI !== null && previousMSI > 0) {
          const rawChange = ((currentMSI - previousMSI) / previousMSI) * 100
          changePercent = Math.round(rawChange)
          trend = `${changePercent >= 0 ? "+" : "−"}${Math.abs(changePercent)}%`
        }
      }

      // ── Stress State ──
      let stressState = "normal"
      if (currentMSI !== null) {
        stressState = mapMsiToStressState(currentMSI)
      }

      // ── Participation Rate ──
      // Employees who completed check-in in period / active employees in department * 100
      let participationRate = 0
      const participatingUserIds = new Set(deptAssessments30d.map((a) => String(a.userId)))
      const effectiveBaseCount = activeEmployeeCount > 0 ? activeEmployeeCount : employeeCount
      if (effectiveBaseCount > 0) {
        participationRate = Math.min(100, Math.round((participatingUserIds.size / effectiveBaseCount) * 100))
      }

      // ── Recovery Engagement ──
      // % of check-ins indicating recovery activity or feelings
      let recoveryEngagement = 0
      if (deptAssessments30d.length > 0) {
        const checkinsWithRecovery = deptAssessments30d.filter((a) => {
          const f = (a.responses?.feeling || "").toLowerCase()
          const p = (a.responses?.physical || "").toLowerCase()
          return f.includes("calm") || p.includes("energised") || (a.scores?.physicalScore ?? 0) >= 3
        })
        recoveryEngagement = Math.round((checkinsWithRecovery.length / deptAssessments30d.length) * 100)
      }

      // ── Elevated Duration ──
      // Check consecutive weeks from recent to past where avg MSI was elevated (MSI > 50)
      let elevatedWeeks = 0
      for (const window of weeklyWindows) {
        const inWindow = deptAllAssessments.filter((a) => {
          const t = new Date(a.completedAt || a.createdAt).getTime()
          return t >= window.start.getTime() && t < window.end.getTime()
        })
        if (inWindow.length > 0) {
          const avg = inWindow.reduce((acc, a) => acc + (a.msi || 0), 0) / inWindow.length
          if (avg > 50) {
            elevatedWeeks++
          } else {
            break // streak ended
          }
        } else {
          break
        }
      }

      let elevatedDuration = "—"
      if (elevatedWeeks === 1) elevatedDuration = "1 wk"
      else if (elevatedWeeks > 1) elevatedDuration = `${elevatedWeeks} wks`

      resultDepartments.push({
        departmentId: dept.departmentId,
        name: dept.name,
        status: dept.status,
        employeeCount,
        activeEmployeeCount,
        participationRate,
        recoveryEngagement,
        currentMSI,
        previousMSI,
        changePercent,
        trend,
        stressState,
        elevatedDuration,
        hasData: hasAssessments,
      })
    }

    // Sort departments: highest current MSI first (departments with no data at the end)
    resultDepartments.sort((a, b) => {
      if (a.currentMSI !== null && b.currentMSI === null) return -1
      if (a.currentMSI === null && b.currentMSI !== null) return 1
      if (a.currentMSI !== null && b.currentMSI !== null) {
        return b.currentMSI - a.currentMSI
      }
      return a.name.localeCompare(b.name)
    })

    return res.status(200).json({
      success: true,
      departments: resultDepartments,
      data: resultDepartments, // compatibility with frontend callers
    })
  } catch (err) {
    console.error("[HR-DEPARTMENTS] Error:", err.message)
    return res.status(500).json({ success: false, message: "Error fetching departments." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hr/departments
// Creates a new department for the authenticated HR's organisation.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/departments", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrganisation(req)
    if (!org) {
      return res.status(404).json({ success: false, message: "Organisation not found for this HR account." })
    }

    const { name } = req.body
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Department name is required." })
    }

    const trimmedName = name.trim()

    // Scoped query to prevent duplicate names within the same organisation
    const existing = await Department.findOne({
      $or: [
        { organisationId: org.organisationId },
        { organisationId: String(org._id) },
        ...(mongoose.isValidObjectId(org._id) ? [{ organisationId: org._id }] : []),
      ],
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    })

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Department "${trimmedName}" already exists in your organisation.`,
        department: {
          departmentId: existing.departmentId,
          name: existing.name,
          organisationId: org.organisationId,
        },
      })
    }

    // Generate stable unique departmentId
    const allOrgDepts = await Department.find({
      $or: [
        { organisationId: org.organisationId },
        { organisationId: String(org._id) },
        ...(mongoose.isValidObjectId(org._id) ? [{ organisationId: org._id }] : []),
      ],
    })

    let maxSeq = 0
    for (const d of allOrgDepts) {
      const match = d.departmentId?.match(/-(\d+)$/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxSeq) maxSeq = num
      }
    }

    const code = org.organisationCode || org.code
    let orgPrefix = "DEPT"
    if (code && typeof code === "string" && code.length >= 3) {
      orgPrefix = code.slice(0, 4).toUpperCase()
    } else {
      const nameChars = (org.name || "").replace(/[^a-zA-Z]/g, "").toUpperCase()
      if (nameChars.length >= 3) orgPrefix = nameChars.slice(0, 3)
    }

    const nextSeq = String(maxSeq + 1).padStart(3, "0")
    const departmentId = `DEPT-${orgPrefix}-${nextSeq}`

    const newDept = new Department({
      departmentId,
      organisationId: org.organisationId,
      name: trimmedName,
      status: "Active",
    })

    await newDept.save()

    return res.status(201).json({
      success: true,
      message: "Department created successfully.",
      department: {
        departmentId: newDept.departmentId,
        name: newDept.name,
        organisationId: org.organisationId,
        status: newDept.status,
      },
    })
  } catch (err) {
    console.error("[HR-CREATE-DEPARTMENT] Error:", err.message)
    return res.status(500).json({ success: false, message: "Error creating department." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/overview
// Returns full MongoDB-backed HR metrics, scoped strictly to HR's organisation.
// Optional query params:
//   - departmentId: filters metrics to specific department (must belong to this org)
//   - period: "7d" | "30d" | "90d" (defaults to "30d")
// ─────────────────────────────────────────────────────────────────────────────
router.get("/overview", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrganisation(req)
    if (!org) {
      return res.status(404).json({ success: false, message: "Organisation not found for this HR account." })
    }

    const orgIdFilter = [
      { organisationId: org.organisationId },
      { organisationId: String(org._id) },
      ...(mongoose.isValidObjectId(org._id) ? [{ organisationId: org._id }] : []),
    ]

    // Ensure departments exist
    const allOrgDepartments = await ensureDepartmentsForOrg(org.organisationId)
    const deptMap = new Map(allOrgDepartments.map((d) => [d.departmentId, d.name]))

    // Handle department filtering
    const { departmentId, period = "30d" } = req.query
    let selectedDeptDoc = null

    if (departmentId && departmentId !== "all" && departmentId !== "All departments") {
      selectedDeptDoc = allOrgDepartments.find((d) => d.departmentId === departmentId)
      if (!selectedDeptDoc) {
        return res.status(403).json({
          success: false,
          message: "Department does not exist or does not belong to your organisation.",
        })
      }
    }

    // ── 1. Fetch Employees (scoped to org, and optionally departmentId) ─────
    const employeeFilter = {
      role: { $in: ["employee", "Employee", "EMPLOYEE"] },
      $or: orgIdFilter,
    }

    if (selectedDeptDoc) {
      employeeFilter.$and = [
        {
          $or: [
            { departmentId: selectedDeptDoc.departmentId },
            { department: selectedDeptDoc.name },
          ],
        },
      ]
    }

    const employees = await User.find(employeeFilter).select("_id employeeId name status department departmentId onboardingCompleted createdAt")
    const employeeIds = employees.map((e) => e._id)
    const totalEmployees = employees.length

    const activeEmployeesCount = employees.filter(
      (e) => e.status === "Active" || e.status === "Approved"
    ).length

    // ── 2. Time Window calculations ──────────────────────────────────────────
    const now = new Date()
    const days = period.toLowerCase() === "7d" ? 7 : period.toLowerCase() === "90d" ? 90 : 30
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const prevStartDate = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000)

    // ── 3. Fetch Assessment Records for Period ────────────────────────────────
    const assessmentFilter = {
      $or: orgIdFilter,
      createdAt: { $gte: startDate },
    }

    if (selectedDeptDoc) {
      assessmentFilter.$and = [
        {
          $or: [
            { departmentId: selectedDeptDoc.departmentId },
            { department: selectedDeptDoc.name },
            { userId: { $in: employeeIds } },
          ],
        },
      ]
    }

    const assessmentsInPeriod = await Assessment.find(assessmentFilter).sort({ completedAt: 1, createdAt: 1 })

    // Previous period for trend delta
    const prevAssessmentFilter = {
      $or: orgIdFilter,
      createdAt: { $gte: prevStartDate, $lt: startDate },
    }
    if (selectedDeptDoc) {
      prevAssessmentFilter.$and = [
        {
          $or: [
            { departmentId: selectedDeptDoc.departmentId },
            { department: selectedDeptDoc.name },
            { userId: { $in: employeeIds } },
          ],
        },
      ]
    }
    const prevAssessments = await Assessment.find(prevAssessmentFilter)

    // ── 4. Workforce MSI & Change vs Previous Period ──────────────────────────
    let workforceMSI = 0
    let previousWorkforceMSI = 0
    let msiChangeLabel = "0% vs previous period"
    let msiIsIncrease = false

    if (assessmentsInPeriod.length > 0) {
      const sum = assessmentsInPeriod.reduce((acc, a) => acc + (a.msi || 0), 0)
      workforceMSI = Math.round(sum / assessmentsInPeriod.length)
    } else {
      // If no check-ins in the period, check latest known check-ins or baseline of employees
      const latestAssessments = await Assessment.find({
        $or: orgIdFilter,
        ...(selectedDeptDoc ? { $or: [{ departmentId: selectedDeptDoc.departmentId }, { userId: { $in: employeeIds } }] } : {}),
      }).sort({ completedAt: -1 }).limit(10)

      if (latestAssessments.length > 0) {
        const sum = latestAssessments.reduce((acc, a) => acc + (a.msi || 0), 0)
        workforceMSI = Math.round(sum / latestAssessments.length)
      } else {
        workforceMSI = 0
      }
    }

    if (prevAssessments.length > 0) {
      const prevSum = prevAssessments.reduce((acc, a) => acc + (a.msi || 0), 0)
      previousWorkforceMSI = Math.round(prevSum / prevAssessments.length)
      const diff = workforceMSI - previousWorkforceMSI
      if (previousWorkforceMSI > 0) {
        const pct = Math.abs(Math.round((diff / previousWorkforceMSI) * 100))
        msiChangeLabel = `${diff >= 0 ? "↑" : "↓"} ${pct}% vs previous period`
        msiIsIncrease = diff > 0
      }
    }

    // ── 5. Participation Rate ────────────────────────────────────────────────
    // Percentage of active employees who took at least 1 check-in within the period
    const participatingUserIds = new Set(
      assessmentsInPeriod.map((a) => String(a.userId)).filter(Boolean)
    )
    const participationRate =
      activeEmployeesCount > 0
        ? Math.min(100, Math.round((participatingUserIds.size / activeEmployeesCount) * 100))
        : 0

    // ── 6. Recovery Engagement & Intervention Response ───────────────────────
    // Check reset sessions or daily check-in recovery indicators
    const checkinsWithRecovery = assessmentsInPeriod.filter((a) => {
      const f = (a.responses?.feeling || "").toLowerCase()
      const p = (a.responses?.physical || "").toLowerCase()
      return f.includes("calm") || p.includes("energised") || (a.scores?.physicalScore ?? 0) >= 3
    })

    const recoveryEngagement =
      assessmentsInPeriod.length > 0
        ? Math.round((checkinsWithRecovery.length / assessmentsInPeriod.length) * 100)
        : 0

    // Intervention response: compare baseline vs current checkin MSI improvement
    let totalImprovement = 0
    let improvementCount = 0
    for (const emp of employees) {
      const empCheckins = assessmentsInPeriod.filter((a) => String(a.userId) === String(emp._id))
      if (empCheckins.length > 0) {
        const first = empCheckins[0].msi
        const last = empCheckins[empCheckins.length - 1].msi
        const delta = first - last // positive if stress decreased
        totalImprovement += delta
        improvementCount++
      }
    }
    const avgImprovement = improvementCount > 0 ? Math.round(totalImprovement / improvementCount) : 0
    const interventionResponse = `${avgImprovement >= 0 ? "+" : ""}${avgImprovement}%`

    // ── 7. Stress State Distribution (Normal, Acute, Persistent, Burnout-risk) ─
    const stateCounts = { normal: 0, acute: 0, persistent: 0, "burnout-risk": 0 }

    if (assessmentsInPeriod.length > 0) {
      for (const a of assessmentsInPeriod) {
        const s = mapMsiToStressState(a.msi)
        stateCounts[s]++
      }
    } else {
      // If no assessments in period, distribute baseline or default 100% normal
      stateCounts.normal = 1
    }

    const totalStateAssessments =
      stateCounts.normal + stateCounts.acute + stateCounts.persistent + stateCounts["burnout-risk"]

    const stressStates = [
      {
        state: "Normal",
        pct: Math.round((stateCounts.normal / totalStateAssessments) * 100),
        color: "#4A9E7A",
      },
      {
        state: "Acute",
        pct: Math.round((stateCounts.acute / totalStateAssessments) * 100),
        color: "#9B5DE5",
      },
      {
        state: "Persistent",
        pct: Math.round((stateCounts.persistent / totalStateAssessments) * 100),
        color: "#7E4CC7",
      },
      {
        state: "Burnout-risk",
        pct: Math.round((stateCounts["burnout-risk"] / totalStateAssessments) * 100),
        color: "#B86B64",
      },
    ]

    // ── 8. Workforce Stress Over Time Chart (7D / 30D / 90D) ─────────────────
    // Group assessments by date bucket
    const dateMap = new Map()

    for (const a of assessmentsInPeriod) {
      const dStr = (a.completedAt || a.createdAt).toISOString().slice(0, 10)
      if (!dateMap.has(dStr)) {
        dateMap.set(dStr, { sum: 0, count: 0, date: a.completedAt || a.createdAt })
      }
      const entry = dateMap.get(dStr)
      entry.sum += a.msi || 0
      entry.count += 1
    }

    const trend = []
    for (const [dStr, val] of dateMap.entries()) {
      trend.push({
        rawDate: dStr,
        date: formatChartDate(val.date, period.toLowerCase()),
        msi: Math.round(val.sum / val.count),
      })
    }
    // Sort chronologically
    trend.sort((a, b) => a.rawDate.localeCompare(b.rawDate))

    // ── 9. Team Overview (All departments with employee count, avg MSI, state)
    // Always compute real metrics for all departments belonging to this organisation
    const allOrgEmployees = await User.find({
      role: { $in: ["employee", "Employee", "EMPLOYEE"] },
      $or: orgIdFilter,
    }).select("_id employeeId department departmentId status")

    const allOrgAssessments = await Assessment.find({
      $or: orgIdFilter,
      createdAt: { $gte: startDate },
    }).select("userId departmentId department msi completedAt createdAt")

    const allPrevOrgAssessments = await Assessment.find({
      $or: orgIdFilter,
      createdAt: { $gte: prevStartDate, $lt: startDate },
    }).select("userId departmentId department msi")

    const departmentMetrics = []

    for (const dept of allOrgDepartments) {
      // Find employees in this department
      const deptEmployees = allOrgEmployees.filter(
        (e) => e.departmentId === dept.departmentId || e.department === dept.name
      )
      const deptUserIds = new Set(deptEmployees.map((e) => String(e._id)))

      // Find assessments for this department
      const deptAssessments = allOrgAssessments.filter(
        (a) =>
          a.departmentId === dept.departmentId ||
          a.department === dept.name ||
          deptUserIds.has(String(a.userId))
      )

      const deptPrevAssessments = allPrevOrgAssessments.filter(
        (a) =>
          a.departmentId === dept.departmentId ||
          a.department === dept.name ||
          deptUserIds.has(String(a.userId))
      )

      let deptMsi = 0
      if (deptAssessments.length > 0) {
        deptMsi = Math.round(deptAssessments.reduce((sum, a) => sum + (a.msi || 0), 0) / deptAssessments.length)
      } else if (deptEmployees.length > 0) {
        deptMsi = 45 // baseline fallback
      }

      let trendStr = "—"
      if (deptAssessments.length > 0 && deptPrevAssessments.length > 0) {
        const prevAvg = Math.round(
          deptPrevAssessments.reduce((sum, a) => sum + (a.msi || 0), 0) / deptPrevAssessments.length
        )
        const diff = deptMsi - prevAvg
        if (prevAvg > 0) {
          const pct = Math.abs(Math.round((diff / prevAvg) * 100))
          trendStr = `${diff >= 0 ? "+" : "−"}${pct}%`
        }
      }

      const state = mapMsiToStressState(deptMsi)

      departmentMetrics.push({
        departmentId: dept.departmentId,
        name: dept.name,
        employeeCount: deptEmployees.length,
        msi: deptMsi,
        trend: trendStr,
        state,
        participation:
          deptEmployees.length > 0
            ? Math.min(
                100,
                Math.round(
                  (new Set(deptAssessments.map((a) => String(a.userId))).size / deptEmployees.length) * 100
                )
              )
            : 0,
      })
    }

    // Sort by MSI descending (highest stress first)
    departmentMetrics.sort((a, b) => b.msi - a.msi)

    // ── 10. Recommended Actions based on actual department metrics ────────────
    const recommendedActions = []
    for (const d of departmentMetrics) {
      if (d.msi >= 61 && d.employeeCount > 0) {
        recommendedActions.push({
          departmentId: d.departmentId,
          team: d.name,
          insight: `${d.name} stress is currently elevated at MSI ${d.msi}.`,
          rec: `Consider scheduling a targeted Reset Lab or reviewing workload distribution for ${d.name}.`,
          cta: "Create intervention",
        })
      }
    }

    // If none are elevated, provide a positive proactive recommendation if data exists
    if (recommendedActions.length === 0 && departmentMetrics.some((d) => d.employeeCount > 0)) {
      recommendedActions.push({
        departmentId: null,
        team: "All Departments",
        insight: "Stress levels are currently stable across all active departments.",
        rec: "Encourage consistent micro-recovery habits and daily check-ins to sustain current wellbeing.",
        cta: "Explore resets",
      })
    }

    // ── 11. Executive Summary Insight ────────────────────────────────────────
    let executiveTitle = "Stress is within manageable ranges."
    let executiveBody = "Workforce wellbeing indicators reflect stable conditions across active teams."
    let highlightTeam = departmentMetrics[0]?.name || "All teams"

    if (workforceMSI >= 61) {
      executiveTitle = "Stress is elevated across the workforce."
      executiveBody = `Elevated strain detected primarily in ${highlightTeam} (MSI ${departmentMetrics[0]?.msi || workforceMSI}). Monitoring and recovery support are recommended.`
    } else if (workforceMSI >= 45) {
      executiveTitle = "Stress increased moderately across the workforce."
      executiveBody = `The highest stress load appeared in ${highlightTeam}. Early-stage indicators suggest checking in with team leads.`
    }

    return res.status(200).json({
      success: true,
      data: {
        organisationId: org.organisationId,
        organisationName: org.name,
        selectedDepartmentId: selectedDeptDoc ? selectedDeptDoc.departmentId : null,
        selectedDepartmentName: selectedDeptDoc ? selectedDeptDoc.name : "All departments",
        period,
        workforceMSI,
        msiSubtext: msiChangeLabel,
        msiIsIncrease,
        activeEmployees: `${activeEmployeesCount}`,
        activeEmployeesTotal: totalEmployees,
        participationRate: `${participationRate}%`,
        recoveryEngagement: `${recoveryEngagement}%`,
        interventionResponse,
        executiveInsight: {
          title: executiveTitle,
          body: executiveBody,
          highlightTeam,
        },
        stressStates,
        trend,
        departments: departmentMetrics,
        availableDepartments: allOrgDepartments.map((d) => ({
          departmentId: d.departmentId,
          name: d.name,
        })),
        recommendedActions,
      },
    })
  } catch (err) {
    console.error("[HR-OVERVIEW] Error:", err.message)
    return res.status(500).json({ success: false, message: "Error calculating HR overview." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/workforce
// Returns real MongoDB-backed workforce stress analytics:
// 1. Stress states distribution across Normal, Acute, Persistent, Burnout-risk
// 2. 5-week historical Workforce Stress Map (Heatmap) by department and week
// 3. Current MSI by team for the bar chart
// Strictly scoped to authenticated HR's organisation.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/workforce", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrganisation(req)
    if (!org) {
      return res.status(404).json({ success: false, message: "Organisation not found for this HR account." })
    }

    const orgIdFilter = [
      { organisationId: org.organisationId },
      { organisationId: String(org._id) },
      ...(mongoose.isValidObjectId(org._id) ? [{ organisationId: org._id }] : []),
    ]

    // Ensure departments exist for this organisation
    const allOrgDepartments = await ensureDepartmentsForOrg(org.organisationId)

    // Fetch all active employees in this organisation
    const employees = await User.find({
      role: { $in: ["employee", "Employee", "EMPLOYEE"] },
      $or: orgIdFilter,
    }).select("_id employeeId name department departmentId status")

    const employeeIds = employees.map((e) => e._id)

    // ── 1. Calculate 5 Weekly Windows for the Stress Map ──────────────────────
    const now = new Date()
    // Current week ends today, plus 4 previous 7-day blocks
    const weekBuckets = []
    for (let i = 4; i >= 0; i--) {
      const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const label = `${months[end.getMonth()]} ${end.getDate()}`
      weekBuckets.push({
        index: 4 - i,
        start,
        end,
        label,
      })
    }

    const earliestDate = weekBuckets[0].start

    // ── 2. Fetch Assessments across the 5-week window ─────────────────────────
    const assessments = await Assessment.find({
      $or: orgIdFilter,
      createdAt: { $gte: earliestDate },
    }).select("userId departmentId department msi createdAt completedAt")

    // ── 3. Stress State Distribution (Latest / 30-day window) ─────────────────
    const stateCounts = { normal: 0, acute: 0, persistent: 0, "burnout-risk": 0 }
    if (assessments.length > 0) {
      for (const a of assessments) {
        const s = mapMsiToStressState(a.msi)
        stateCounts[s]++
      }
    }

    const totalStateAssessments =
      stateCounts.normal + stateCounts.acute + stateCounts.persistent + stateCounts["burnout-risk"]

    const stressStates = [
      {
        state: "Normal",
        pct: totalStateAssessments > 0 ? Math.round((stateCounts.normal / totalStateAssessments) * 100) : 0,
        count: stateCounts.normal,
        color: "#4A9E7A",
      },
      {
        state: "Acute",
        pct: totalStateAssessments > 0 ? Math.round((stateCounts.acute / totalStateAssessments) * 100) : 0,
        count: stateCounts.acute,
        color: "#9B5DE5",
      },
      {
        state: "Persistent",
        pct: totalStateAssessments > 0 ? Math.round((stateCounts.persistent / totalStateAssessments) * 100) : 0,
        count: stateCounts.persistent,
        color: "#7E4CC7",
      },
      {
        state: "Burnout-risk",
        pct: totalStateAssessments > 0 ? Math.round((stateCounts["burnout-risk"] / totalStateAssessments) * 100) : 0,
        count: stateCounts["burnout-risk"],
        color: "#B86B64",
      },
    ]

    // ── 4. Build Workforce Stress Map (Heatmap Grid) ─────────────────────────
    // Build quick lookup of employee to departmentId
    const userDeptMap = new Map()
    for (const e of employees) {
      userDeptMap.set(String(e._id), e.departmentId || null)
    }

    const stressMap = []
    const currentMSIByTeam = []

    for (const dept of allOrgDepartments) {
      // Find assessments belonging to this department
      const deptAssessments = assessments.filter((a) => {
        if (a.departmentId && a.departmentId === dept.departmentId) return true
        if (a.department && a.department.toLowerCase() === dept.name.toLowerCase()) return true
        if (a.userId && userDeptMap.get(String(a.userId)) === dept.departmentId) return true
        return false
      })

      // Calculate weekly averages for the heatmap
      const weeklyData = weekBuckets.map((bucket) => {
        const inBucket = deptAssessments.filter((a) => {
          const t = new Date(a.completedAt || a.createdAt).getTime()
          return t >= bucket.start.getTime() && t < bucket.end.getTime()
        })

        if (inBucket.length > 0) {
          const avg = Math.round(inBucket.reduce((acc, curr) => acc + (curr.msi || 0), 0) / inBucket.length)
          return {
            weekLabel: bucket.label,
            msi: avg,
            hasData: true,
            count: inBucket.length,
          }
        }
        return {
          weekLabel: bucket.label,
          msi: null,
          hasData: false,
          count: 0,
        }
      })

      stressMap.push({
        departmentId: dept.departmentId,
        departmentName: dept.name,
        weeks: weeklyData,
      })

      // Latest / Current MSI for this team
      let latestMsi = null
      let state = "normal"
      if (deptAssessments.length > 0) {
        // Sort descending by date to get most recent
        const sorted = [...deptAssessments].sort((a, b) => {
          return new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime()
        })
        latestMsi = sorted[0].msi
        state = mapMsiToStressState(latestMsi)
      }

      currentMSIByTeam.push({
        departmentId: dept.departmentId,
        name: dept.name,
        msi: latestMsi,
        state,
        hasData: latestMsi !== null,
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        organisationId: org.organisationId,
        organisationName: org.name,
        monthYear: `${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`,
        workforceStressStates: stressStates,
        heatmapWeeks: weekBuckets.map((b) => b.label),
        stressMap,
        currentMSIByTeam,
      },
    })
  } catch (err) {
    console.error("[HR-WORKFORCE] Error:", err.message)
    return res.status(500).json({ success: false, message: "Error calculating workforce analytics." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/departments/:departmentId
// Returns real detailed analytics for a specific department within the HR's organisation.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/departments/:departmentId", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrganisation(req)
    if (!org) {
      return res.status(404).json({ success: false, message: "Organisation not found for this HR account." })
    }

    const { departmentId } = req.params
    const orgIdFilter = [
      { organisationId: org.organisationId },
      { organisationId: String(org._id) },
      ...(mongoose.isValidObjectId(org._id) ? [{ organisationId: org._id }] : []),
    ]

    // Verify department belongs to this organisation
    const dept = await Department.findOne({
      $or: orgIdFilter,
      $and: [
        {
          $or: [
            { departmentId: departmentId },
            { name: departmentId },
          ],
        },
      ],
    })

    if (!dept) {
      return res.status(404).json({
        success: false,
        message: "Department not found or does not belong to your organisation.",
      })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // Employees in this department
    const deptEmployees = await User.find({
      role: { $in: ["employee", "Employee", "EMPLOYEE"] },
      $or: orgIdFilter,
      $and: [
        {
          $or: [
            { departmentId: dept.departmentId },
            { department: dept.name },
          ],
        },
      ],
    }).select("_id employeeId department departmentId status")

    const deptUserIds = new Set(deptEmployees.map((e) => String(e._id)))

    // Assessments for this department
    const allDeptAssessments = await Assessment.find({
      $or: orgIdFilter,
      $and: [
        {
          $or: [
            { departmentId: dept.departmentId },
            { department: dept.name },
            { userId: { $in: Array.from(deptUserIds) } },
          ],
        },
      ],
    }).select("userId departmentId department msi responses scores createdAt completedAt driver")

    const recentAssessments = allDeptAssessments.filter(
      (a) => new Date(a.completedAt || a.createdAt).getTime() >= thirtyDaysAgo.getTime()
    )
    const prevAssessments = allDeptAssessments.filter((a) => {
      const t = new Date(a.completedAt || a.createdAt).getTime()
      return t >= sixtyDaysAgo.getTime() && t < thirtyDaysAgo.getTime()
    })

    // Current MSI
    let currentMSI = null
    let hasData = false
    if (recentAssessments.length > 0) {
      const latestPerUser = new Map()
      for (const a of recentAssessments) {
        const uId = String(a.userId)
        const dateVal = new Date(a.completedAt || a.createdAt).getTime()
        if (!latestPerUser.has(uId) || dateVal > latestPerUser.get(uId).date) {
          latestPerUser.set(uId, { msi: a.msi, date: dateVal })
        }
      }
      const msiList = Array.from(latestPerUser.values()).map((v) => v.msi)
      currentMSI = Math.round(msiList.reduce((acc, v) => acc + (v || 0), 0) / msiList.length)
      hasData = true
    } else if (allDeptAssessments.length > 0) {
      const sorted = [...allDeptAssessments].sort(
        (a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime()
      )
      currentMSI = sorted[0].msi
      hasData = true
    }

    // Previous MSI & Trend
    let trend = "—"
    if (prevAssessments.length > 0 && currentMSI !== null) {
      const prevAvg = Math.round(prevAssessments.reduce((sum, a) => sum + (a.msi || 0), 0) / prevAssessments.length)
      if (prevAvg > 0) {
        const diff = currentMSI - prevAvg
        const pct = Math.abs(Math.round((diff / prevAvg) * 100))
        trend = `${diff >= 0 ? "+" : "−"}${pct}%`
      }
    }

    // Recovery engagement
    let recoveryEngagement = 0
    if (recentAssessments.length > 0) {
      const checkinsWithRecovery = recentAssessments.filter((a) => {
        const f = (a.responses?.feeling || "").toLowerCase()
        const p = (a.responses?.physical || "").toLowerCase()
        return f.includes("calm") || p.includes("energised") || (a.scores?.physicalScore ?? 0) >= 3
      })
      recoveryEngagement = Math.round((checkinsWithRecovery.length / recentAssessments.length) * 100)
    }

    // Elevated Duration (consecutive 7-day windows)
    let elevatedWeeks = 0
    for (let i = 0; i < 4; i++) {
      const wEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const wStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const inWindow = allDeptAssessments.filter((a) => {
        const t = new Date(a.completedAt || a.createdAt).getTime()
        return t >= wStart.getTime() && t < wEnd.getTime()
      })
      if (inWindow.length > 0) {
        const avg = inWindow.reduce((acc, a) => acc + (a.msi || 0), 0) / inWindow.length
        if (avg > 50) {
          elevatedWeeks++
        } else {
          break
        }
      } else {
        break
      }
    }
    const elevatedDuration = elevatedWeeks === 1 ? "1 wk" : elevatedWeeks > 1 ? `${elevatedWeeks} wks` : "—"

    // Top reported stressors
    const stressorCounts = {}
    for (const a of recentAssessments) {
      const s = a.responses?.stressor || a.driver
      if (s && typeof s === "string" && s.trim()) {
        const cleaned = s.trim()
        stressorCounts[cleaned] = (stressorCounts[cleaned] || 0) + 1
      }
    }
    const totalWithStressor = Object.values(stressorCounts).reduce((acc, c) => acc + c, 0)
    const topStressors = Object.entries(stressorCounts)
      .map(([label, count]) => ({
        label,
        pct: totalWithStressor > 0 ? Math.round((count / totalWithStressor) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4)

    // 4-week trend
    const fourWeekTrend = []
    for (let i = 3; i >= 0; i--) {
      const wEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const wStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const inWindow = allDeptAssessments.filter((a) => {
        const t = new Date(a.completedAt || a.createdAt).getTime()
        return t >= wStart.getTime() && t < wEnd.getTime()
      })
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const label = `${months[wEnd.getMonth()]} ${wEnd.getDate()}`
      if (inWindow.length > 0) {
        const avg = Math.round(inWindow.reduce((acc, a) => acc + (a.msi || 0), 0) / inWindow.length)
        fourWeekTrend.push({ week: label, msi: avg })
      } else {
        fourWeekTrend.push({ week: label, msi: currentMSI || 0 })
      }
    }

    const state = mapMsiToStressState(currentMSI)

    return res.status(200).json({
      success: true,
      data: {
        departmentId: dept.departmentId,
        name: dept.name,
        state,
        msi: currentMSI,
        hasData,
        trend,
        duration: elevatedDuration,
        recovery: recoveryEngagement,
        employeeCount: deptEmployees.length,
        topStressors,
        fourWeekTrend,
      },
    })
  } catch (err) {
    console.error("[HR-DEPARTMENT-DETAIL] Error:", err.message)
    return res.status(500).json({ success: false, message: "Error fetching department details." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/interventions
// Returns all interventions for the HR's organisation with real usage stats.
// Supports query filters: ?departmentId=... &type=... &from=... &to=...
// ─────────────────────────────────────────────────────────────────────────────
router.get("/interventions", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrganisation(req)
    if (!org) {
      return res.status(404).json({ success: false, message: "Organisation not found for this HR account." })
    }

    const { departmentId, type, from, to } = req.query

    // 1. Ensure standard interventions exist for this organisation
    const interventions = await ensureInterventionsForOrg(org.organisationId)

    // Build session query strictly scoped to HR's organisation
    const sessionQuery = {
      organisationId: org.organisationId,
      status: "Completed",
    }

    if (departmentId && departmentId !== "all") {
      sessionQuery.departmentId = departmentId
    }

    if (type && type !== "all") {
      sessionQuery.type = type
    }

    if (from || to) {
      sessionQuery.startedAt = {}
      if (from) sessionQuery.startedAt.$gte = new Date(from)
      if (to) sessionQuery.startedAt.$lte = new Date(to)
    }

    // 2. Fetch all completed intervention sessions matching criteria
    const sessions = await InterventionSession.find(sessionQuery)

    // 3. Group metrics by interventionId and calculate real statistics
    const statsList = []
    let totalOrgSessions = 0
    const totalUniqueParticipantsSet = new Set()
    let totalPreMSISum = 0
    let totalPreMSICount = 0
    let totalPostMSISum = 0
    let totalPostMSICount = 0

    // Filter interventions if type filter is applied
    const filteredInterventions = interventions.filter((inv) => {
      if (type && type !== "all" && inv.type !== type) return false
      return true
    })

    for (const inv of filteredInterventions) {
      const invSessions = sessions.filter(
        (s) => String(s.interventionId) === String(inv._id) || s.interventionName.toLowerCase() === inv.name.toLowerCase()
      )

      const sessionCount = invSessions.length
      totalOrgSessions += sessionCount

      const participantSet = new Set()
      let preSum = 0
      let preCount = 0
      let postSum = 0
      let postCount = 0

      for (const s of invSessions) {
        if (s.employeeId) {
          participantSet.add(String(s.employeeId))
          totalUniqueParticipantsSet.add(String(s.employeeId))
        }
        if (s.preMSI != null) {
          preSum += s.preMSI
          preCount++
          totalPreMSISum += s.preMSI
          totalPreMSICount++
        }
        if (s.postMSI != null) {
          postSum += s.postMSI
          postCount++
          totalPostMSISum += s.postMSI
          totalPostMSICount++
        }
      }

      const avgPreMSI = preCount > 0 ? Math.round(preSum / preCount) : null
      const avgPostMSI = postCount > 0 ? Math.round(postSum / postCount) : null
      const avgDelta = avgPreMSI != null && avgPostMSI != null ? avgPostMSI - avgPreMSI : null

      statsList.push({
        id: inv._id,
        name: inv.name,
        type: inv.type,
        category: inv.category,
        description: inv.description,
        duration: inv.duration,
        status: inv.status,
        sessions: sessionCount,
        participants: participantSet.size,
        preMSI: avgPreMSI,
        postMSI: avgPostMSI,
        delta: avgDelta,
        hasData: sessionCount > 0,
      })
    }

    // Overall analytics
    const overallPre = totalPreMSICount > 0 ? Math.round(totalPreMSISum / totalPreMSICount) : null
    const overallPost = totalPostMSICount > 0 ? Math.round(totalPostMSISum / totalPostMSICount) : null
    const overallDelta = overallPre != null && overallPost != null ? overallPost - overallPre : null

    return res.status(200).json({
      success: true,
      data: {
        interventions: statsList,
        summary: {
          totalSessions: totalOrgSessions,
          totalParticipants: totalUniqueParticipantsSet.size,
          averagePreMSI: overallPre,
          averagePostMSI: overallPost,
          averageDelta: overallDelta,
        },
      },
    })
  } catch (err) {
    console.error("[HR-INTERVENTIONS] Error:", err.message)
    return res.status(500).json({ success: false, message: "Error fetching intervention analytics." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hr/interventions
// Creates a new intervention for the HR's organisation.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/interventions", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrganisation(req)
    if (!org) {
      return res.status(404).json({ success: false, message: "Organisation not found for this HR account." })
    }

    const { name, type = "RESET_LAB", category = "General", description = "", duration = "5–10 min", status = "Active" } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Intervention name is required." })
    }

    // Check duplicate name within organisation
    const existing = await Intervention.findOne({
      organisationId: org.organisationId,
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    })

    if (existing) {
      return res.status(409).json({ success: false, message: "An intervention with this name already exists in your organisation." })
    }

    const newIntervention = new Intervention({
      organisationId: org.organisationId,
      name: name.trim(),
      type,
      category: category.trim(),
      description: description.trim(),
      duration: duration.trim(),
      status,
      createdBy: req.user._id,
    })

    await newIntervention.save()

    return res.status(201).json({
      success: true,
      message: "Intervention created successfully.",
      data: newIntervention,
    })
  } catch (err) {
    console.error("[HR-CREATE-INTERVENTION] Error:", err.message)
    return res.status(500).json({ success: false, message: "Error creating intervention." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/profile
// Authenticated HR Profile — returns safe HR details
// ─────────────────────────────────────────────────────────────────────────────
router.get("/profile", requireHR, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: "HR profile not found." })
    }

    // Ensure persistent unique hrId if not yet populated
    if (!user.hrId) {
      const hex = user._id.toString().slice(-4).toUpperCase()
      const fallbackHrId = `HR${hex}`
      user.hrId = fallbackHrId
      await user.save()
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        hrId: user.hrId,
        role: user.role || "HR",
        status: user.status || "Active",
        organisationId: user.organisationId,
        updatedAt: user.updatedAt,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    console.error("[HR-GET-PROFILE] Error:", err.message)
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/hr/profile
// Update allowed HR profile fields (only name permitted)
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/profile", requireHR, async (req, res) => {
  try {
    const { name } = req.body

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "A valid name is required." })
    }

    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: "HR profile not found." })
    }

    const previousName = user.name
    user.name = name.trim()

    // Ensure persistent hrId
    if (!user.hrId) {
      const hex = user._id.toString().slice(-4).toUpperCase()
      user.hrId = `HR${hex}`
    }

    await user.save()

    await logActivity({
      req,
      user,
      action: "HR Profile Updated",
      status: "Success",
      organisationId: user.organisationId,
      entityType: "User",
      entityId: user._id,
      details: `HR administrator name updated from "${previousName}" to "${user.name}"`,
    })

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        hrId: user.hrId,
        role: user.role || "HR",
        status: user.status || "Active",
        organisationId: user.organisationId,
        updatedAt: user.updatedAt,
      },
    })
  } catch (err) {
    console.error("[HR-PATCH-PROFILE] Error:", err.message)
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/organisation
// Returns organisation details strictly derived from authenticated HR's token
// ─────────────────────────────────────────────────────────────────────────────
router.get("/organisation", requireHR, async (req, res) => {
  try {
    const org = await resolveHROrganisation(req)
    if (!org) {
      return res.status(404).json({ success: false, message: "Organisation not found for this HR account." })
    }

    return res.status(200).json({
      success: true,
      data: {
        organisationId: org.organisationId,
        organisationName: org.name,
        organisationCode: org.organisationCode || org.code,
        status: org.status || (org.isActive !== false ? "Active" : "Inactive"),
      },
    })
  } catch (err) {
    console.error("[HR-GET-ORGANISATION] Error:", err.message)
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/hr/password
// Authenticated password change with bcrypt verification
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/password", requireHR, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password, new password, and confirmation are required.",
      })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation do not match.",
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters.",
      })
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your current password.",
      })
    }

    const user = await User.findById(req.user._id).select("+passwordHash")
    if (!user) {
      return res.status(404).json({ success: false, message: "HR account not found." })
    }

    // Verify current password with bcrypt
    const isCurrentValid = await user.comparePassword(currentPassword)
    if (!isCurrentValid) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." })
    }

    // Hash new password securely
    user.passwordHash = await User.hashPassword(newPassword)
    await user.save()

    // Activity log - security safe, no credentials logged
    await logActivity({
      req,
      user,
      action: "HR Password Changed",
      status: "Success",
      organisationId: user.organisationId,
      entityType: "User",
      entityId: user._id,
      details: `HR administrator (${user.email}) changed account password`,
    })

    return res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    })
  } catch (err) {
    console.error("[HR-PASSWORD-CHANGE] Error:", err.message)
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." })
  }
})

module.exports = router


