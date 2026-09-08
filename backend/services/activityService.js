const ActivityLog = require("../models/ActivityLog")

/**
 * Log an audit activity event safely without interrupting the primary request flow.
 *
 * @param {Object} options
 * @param {Object} [options.req] - Express request object for IP and fallback user extraction
 * @param {Object} [options.user] - Explicit user performing the action
 * @param {string} options.action - Short title of action (e.g., "Created Organisation")
 * @param {string} [options.status="Success"] - "Success" | "Failed"
 * @param {string} [options.organisationId] - Associated CQ ID or Organisation ID
 * @param {string} [options.organisationName] - Associated Organisation Name
 * @param {string} [options.entityType] - e.g. "Organisation", "HR", "Employee", "Assessment"
 * @param {string|mongoose.Types.ObjectId} [options.entityId] - Target entity identifier
 * @param {string} [options.details] - Safe summary description (NO credentials/tokens)
 */
async function logActivity({
  req,
  user,
  action,
  status = "Success",
  organisationId,
  organisationName,
  entityType,
  entityId,
  details,
}) {
  try {
    const currentUser = user || req?.user

    // Resolve user details
    let userId = currentUser?._id || currentUser?.id || null
    let userName = currentUser?.name || currentUser?.email || "System"
    let role = currentUser?.role || "System"

    // Format role nicely (e.g., 'admin' -> 'Founder', 'hr' -> 'HRAdmin', 'employee' -> 'Employee')
    if (role === "admin") role = "Founder"
    else if (role.toLowerCase() === "hr") role = "HRAdmin"
    else if (role.toLowerCase() === "employee") role = "Employee"

    // Resolve IP address safely
    let ipAddress = null
    if (req) {
      ipAddress =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        null
    }

    // Resolve Organisation Name & ID if available from user
    const resolvedOrgId = organisationId || currentUser?.organisationId || null
    const resolvedOrgName = organisationName || null

    await ActivityLog.create({
      timestamp: new Date(),
      userId,
      userName,
      role,
      organisationId: resolvedOrgId ? String(resolvedOrgId) : null,
      organisationName: resolvedOrgName,
      action,
      entityType: entityType || null,
      entityId: entityId ? String(entityId) : null,
      status: status === "Failed" ? "Failed" : "Success",
      details: details ? String(details) : null,
      ipAddress,
    })
  } catch (err) {
    // Non-blocking: log server-side and never break the calling operation
    console.error("[ACTIVITY_LOG] Failed to record log:", err.message)
  }
}

module.exports = { logActivity }
