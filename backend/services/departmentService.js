const Department = require("../models/Department")
const Organisation = require("../models/Organisation")
const mongoose = require("mongoose")

/**
 * Department Name Mapping: Old -> New
 */
const DEPARTMENT_MAPPING = {
  "Engineering": "Tech & Product",
  "Sales": "Sales & Marketing",
  "HR": "Operations & Admin",
  "Operations": "Research & Innovation",
  "Finance": "Finance and Legal",
  "Marketing": "Services / Delivery",
  "Customer Support": "People & Support",
  "Other": "Other",
}

/**
 * Normalizes legacy department names to new names.
 */
function normalizeDepartmentName(name) {
  if (!name || typeof name !== "string") return name
  const trimmed = name.trim()
  for (const [oldName, newName] of Object.entries(DEPARTMENT_MAPPING)) {
    if (trimmed.toLowerCase() === oldName.toLowerCase()) {
      return newName
    }
  }
  return trimmed
}

/**
 * Standard department catalogue names
 */
const DEFAULT_DEPARTMENTS = [
  "Tech & Product",
  "Sales & Marketing",
  "Operations & Admin",
  "Research & Innovation",
  "Finance and Legal",
  "Services / Delivery",
  "People & Support",
  "Other",
]

/**
 * Generates an organisation-scoped department ID prefix from the organisation.
 * e.g. For "Meridian Group" with organisationCode "MERI4827" or name "Meridian Group", prefix is "MER".
 * For "CortiQuant" (CORT4213) -> "CORT".
 */
function getOrgCodePrefix(org) {
  if (!org) return "DEPT"
  const code = org.organisationCode || org.code
  if (code && typeof code === "string" && code.length >= 3) {
    return code.slice(0, 4).toUpperCase()
  }
  const nameChars = (org.name || "").replace(/[^a-zA-Z]/g, "").toUpperCase()
  if (nameChars.length >= 3) {
    return nameChars.slice(0, 3)
  }
  return "DEPT"
}

/**
 * Ensures all default departments exist for a given organisation.
 * Existing departments are preserved and never duplicated.
 * Returns map or array of departments.
 */
async function ensureDepartmentsForOrg(organisationId) {
  if (!organisationId) return []

  // Resolve organisation doc to derive appropriate code prefix
  const org = await Organisation.findOne({
    $or: [
      { _id: mongoose.isValidObjectId(organisationId) ? organisationId : null },
      { organisationId: organisationId },
    ],
  })

  const orgPrefix = getOrgCodePrefix(org)
  const queryOrgId = org ? org.organisationId : organisationId

  // Fetch existing departments for this organisation
  const existing = await Department.find({
    $or: [
      { organisationId: queryOrgId },
      { organisationId: String(organisationId) },
      ...(mongoose.isValidObjectId(organisationId) ? [{ organisationId: new mongoose.Types.ObjectId(organisationId) }] : []),
    ],
  })

  const existingMap = new Map(existing.map((d) => [d.name.trim().toLowerCase(), d]))

  // Find max sequence number to avoid collisions
  let maxSeq = 0
  for (const d of existing) {
    const match = d.departmentId.match(/-(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxSeq) maxSeq = num
    }
  }

  // Create any missing standard departments
  for (const name of DEFAULT_DEPARTMENTS) {
    const key = name.trim().toLowerCase()
    if (!existingMap.has(key)) {
      maxSeq++
      const seqStr = String(maxSeq).padStart(3, "0")
      const departmentId = `DEPT-${orgPrefix}-${seqStr}`

      const newDept = new Department({
        departmentId,
        organisationId: queryOrgId,
        name,
        status: "Active",
      })

      try {
        await newDept.save()
        existing.push(newDept)
        existingMap.set(key, newDept)
      } catch (err) {
        // If duplicate key error due to race condition, re-fetch
        if (err.code === 11000) {
          const found = await Department.findOne({ organisationId: queryOrgId, name })
          if (found) {
            existing.push(found)
            existingMap.set(key, found)
          }
        } else {
          console.error(`[DEPARTMENT-SERVICE] Error creating department ${name}:`, err.message)
        }
      }
    }
  }

  return existing
}

/**
 * Finds or creates a single department by name for an organisation.
 * Returns the Department document.
 */
async function getOrCreateDepartment(organisationId, departmentName) {
  if (!organisationId || !departmentName) return null

  const org = await Organisation.findOne({
    $or: [
      { _id: mongoose.isValidObjectId(organisationId) ? organisationId : null },
      { organisationId: organisationId },
    ],
  })

  const queryOrgId = org ? org.organisationId : organisationId
  const rawTrimmed = departmentName.trim()
  const trimmedName = normalizeDepartmentName(rawTrimmed)

  // 1. Try to find existing department by name (case-insensitive)
  let dept = await Department.findOne({
    $or: [
      { organisationId: queryOrgId },
      { organisationId: String(organisationId) },
      ...(mongoose.isValidObjectId(organisationId) ? [{ organisationId: new mongoose.Types.ObjectId(organisationId) }] : []),
    ],
    name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
  })

  if (dept) return dept

  // 2. If not found, ensure all defaults or create this specific one
  const existingAll = await Department.find({
    $or: [
      { organisationId: queryOrgId },
      { organisationId: String(organisationId) },
      ...(mongoose.isValidObjectId(organisationId) ? [{ organisationId: new mongoose.Types.ObjectId(organisationId) }] : []),
    ],
  })

  let maxSeq = 0
  for (const d of existingAll) {
    const match = d.departmentId.match(/-(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxSeq) maxSeq = num
    }
  }

  const orgPrefix = getOrgCodePrefix(org)
  const nextSeq = String(maxSeq + 1).padStart(3, "0")
  const departmentId = `DEPT-${orgPrefix}-${nextSeq}`

  dept = new Department({
    departmentId,
    organisationId: queryOrgId,
    name: trimmedName,
    status: "Active",
  })

  try {
    await dept.save()
  } catch (err) {
    if (err.code === 11000) {
      dept = await Department.findOne({
        organisationId: queryOrgId,
        name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
      })
    } else {
      throw err
    }
  }

  return dept
}

module.exports = {
  ensureDepartmentsForOrg,
  getOrCreateDepartment,
  normalizeDepartmentName,
  DEPARTMENT_MAPPING,
  DEFAULT_DEPARTMENTS,
}
