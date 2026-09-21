const mongoose = require("mongoose")
const User = require("../models/User")
const Organisation = require("../models/Organisation")
const Counter = require("../models/Counter")

/**
 * Derives the standard employee ID prefix for an organisation.
 * Rules:
 * 1. If org.employeeIdPrefix is explicitly set, use that.
 * 2. If org.name is "CortiQuant" (case-insensitive), default to "EMP" to preserve existing naming convention.
 * 3. If org.organisationCode exists (e.g. "FLYA5587"), extract the alphabetic part (e.g. "FLYA").
 * 4. Fallback: extract the first 4 alphabetic characters from the organisation name, uppercase.
 */
function resolveOrgPrefix(org) {
  if (!org) return "EMP"

  if (org.employeeIdPrefix && typeof org.employeeIdPrefix === "string" && org.employeeIdPrefix.trim()) {
    return org.employeeIdPrefix.trim().toUpperCase()
  }

  const cleanName = (org.name || "").trim().toLowerCase()
  if (cleanName === "cortiquant" || cleanName === "cortiquant technologies") {
    return "EMP"
  }

  // If organisationCode exists (e.g. "FLYA5587"), take the letters prefix
  const code = org.organisationCode || org.code || ""
  const codeLetters = code.replace(/[^a-zA-Z]/g, "").toUpperCase()
  if (codeLetters.length >= 3) {
    return codeLetters.slice(0, 4)
  }

  // Fallback to name letters
  const nameLetters = (org.name || "").replace(/[^a-zA-Z]/g, "").toUpperCase()
  if (nameLetters.length >= 3) {
    return nameLetters.slice(0, 4)
  }

  return "EMP"
}

/**
 * Initializes atomic counter for a given prefix by scanning existing max employee ID in DB
 * so existing IDs (e.g., EMP-1001 through EMP-1008) are never duplicated.
 */
async function initializeCounterIfMissing(prefix) {
  const counterId = `employeeId_${prefix}`
  const existingCounter = await Counter.findById(counterId)
  if (existingCounter) {
    return existingCounter
  }

  // Find max numeric suffix for this prefix among existing users
  // Regex matches: ^PREFIX-(\d+)$
  const prefixRegex = new RegExp(`^${prefix}-(\\d+)$`, "i")
  const usersWithPrefix = await User.find({
    employeeId: { $regex: prefixRegex },
  }).select("employeeId")

  let maxNum = 1000
  for (const u of usersWithPrefix) {
    const match = String(u.employeeId).match(prefixRegex)
    if (match && match[1]) {
      const num = parseInt(match[1], 10)
      if (!isNaN(num) && num > maxNum) {
        maxNum = num
      }
    }
  }

  // Upsert the counter with the maxNum found
  const doc = await Counter.findByIdAndUpdate(
    counterId,
    { $setOnInsert: { seq: maxNum } },
    { upsert: true, new: true }
  )

  return doc
}

/**
 * Generates an organisation-specific, unique, atomic employee ID.
 * Example:
 * - CortiQuant -> EMP-1001, EMP-1002...
 * - FlyanyTrip -> FLYA-1001, FLYA-1002...
 *
 * Guaranteed unique and safe for concurrent approvals.
 */
async function generateOrgEmployeeId(organisationIdOrDoc) {
  let org = null

  if (organisationIdOrDoc && typeof organisationIdOrDoc === "object" && organisationIdOrDoc.name) {
    org = organisationIdOrDoc
  } else if (organisationIdOrDoc) {
    const isObjId = mongoose.isValidObjectId(organisationIdOrDoc)
    org = await Organisation.findOne({
      $or: [
        ...(isObjId ? [{ _id: organisationIdOrDoc }] : []),
        { organisationId: String(organisationIdOrDoc).trim().toUpperCase() },
        { organisationCode: String(organisationIdOrDoc).trim().toUpperCase() },
      ],
    })
  }

  const prefix = resolveOrgPrefix(org)
  const counterId = `employeeId_${prefix}`

  // Ensure counter is initialized based on DB state
  await initializeCounterIfMissing(prefix)

  // Atomic increment loop with collision guard
  for (let attempt = 0; attempt < 50; attempt++) {
    const counterDoc = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    )

    const nextSeq = counterDoc.seq
    const candidateId = `${prefix}-${String(nextSeq).padStart(4, "0")}`

    // Verify no user already holds this ID (e.g. from manual entry)
    const existing = await User.findOne({ employeeId: candidateId })
    if (!existing) {
      return candidateId
    }
  }

  throw new Error(`Unable to allocate a unique employee ID for prefix ${prefix} after 50 attempts.`)
}

/**
 * Safe backfill function:
 * Finds any active or approved employee missing an employeeId (or having "Pending ID"),
 * and assigns them an organisation-specific ID without touching valid existing IDs.
 */
async function backfillMissingEmployeeIds() {
  const usersToBackfill = await User.find({
    role: { $in: ["employee", "Employee", "EMPLOYEE"] },
    status: { $in: ["Active", "Approved", "active", "approved"] },
    $or: [
      { employeeId: { $exists: false } },
      { employeeId: null },
      { employeeId: "" },
      { employeeId: "Pending ID" },
      { employeeId: "pending" },
    ],
  }).sort({ createdAt: 1 })

  const results = []

  for (const user of usersToBackfill) {
    const newId = await generateOrgEmployeeId(user.organisationId)
    user.employeeId = newId
    if (!user.approvedAt) {
      user.approvedAt = user.createdAt || new Date()
    }
    await user.save()
    results.push({
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      organisationCode: user.organisationCode,
      employeeId: newId,
    })
  }

  return results
}

module.exports = {
  resolveOrgPrefix,
  generateOrgEmployeeId,
  backfillMissingEmployeeIds,
  initializeCounterIfMissing,
}
