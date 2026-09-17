const mongoose = require("mongoose")
const User = require("../models/User")
const Organisation = require("../models/Organisation")
const Notification = require("../models/Notification")
const {
  sendEmployeeApprovalRequestEmail,
  sendEmployeeApprovedEmail,
  sendEmployeeRejectedEmail,
} = require("./emailService")
const { buildFrontendUrl } = require("../config/appConfig")

/**
 * Sends an employee approval notification to all HR/Admin users of the employee's organisation.
 *
 * Requirements:
 * - Finds HR/Admin users using organisationId.
 * - Fetches their emails.
 * - Sends notification email using sendEmployeeApprovalRequestEmail.
 * - Records notification logs in Notification collection:
 *   {
 *     type: "EMPLOYEE_APPROVAL_REQUEST",
 *     recipientId: HR user id,
 *     organisationId,
 *     employeeId,
 *     status: "SENT",
 *     sentAt: timestamp
 *   }
 * - Prevents duplicate emails: checks if an EMPLOYEE_APPROVAL_REQUEST notification
 *   already exists for this recipient and employee.
 * - Error handling: failures never block callers or throw fatal exceptions.
 *
 * @param {Object} employee - The employee User document or object.
 * @param {Object} [organisationHR] - Optional specific HR User document or null.
 * @returns {Promise<{ success: boolean, notifiedCount: number, errors: string[] }>}
 */
async function sendEmployeeApprovalNotification(employee, organisationHR = null) {
  const result = { success: true, notifiedCount: 0, errors: [] }

  try {
    if (!employee || !employee.organisationId) {
      console.warn("[NOTIFICATION SERVICE] Missing employee or organisationId.")
      return { success: false, notifiedCount: 0, errors: ["Missing employee or organisationId."] }
    }

    const orgId = employee.organisationId
    const employeeId = employee._id || employee.id
    const empDisplayId = employee.employeeId || "Pending ID"
    const empName = employee.name || "Employee"
    const empEmail = employee.email || employee.username || "—"
    const empDept = employee.department || "Unassigned"

    // Resolve Organisation Name
    let orgName = "Your Organisation"
    try {
      const orgDoc = await Organisation.findOne({
        $or: [
          ...(mongoose.isValidObjectId(orgId) ? [{ _id: orgId }] : []),
          { organisationId: orgId },
          ...(employee.organisationCode ? [{ organisationCode: employee.organisationCode }] : []),
        ],
      })
      if (orgDoc?.name) {
        orgName = orgDoc.name
      }
    } catch (orgErr) {
      console.warn("[NOTIFICATION SERVICE] Could not resolve organisation name:", orgErr.message)
    }

    // Resolve HR/Admin recipient(s)
    let hrRecipients = []
    if (organisationHR && (organisationHR.email || organisationHR._id)) {
      hrRecipients = [organisationHR]
    } else {
      hrRecipients = await User.find({
        role: { $in: ["hr", "HR", "hr_admin", "admin", "Admin"] },
        $or: [
          { organisationId: orgId },
          { organisationId: String(orgId) },
          ...(mongoose.isValidObjectId(orgId) ? [{ organisationId: new mongoose.Types.ObjectId(orgId) }] : []),
        ],
      })
    }

    if (!hrRecipients || hrRecipients.length === 0) {
      console.warn(`[NOTIFICATION SERVICE] No HR/Admin users found for organisation ${orgId}.`)
      return { success: true, notifiedCount: 0, errors: ["No HR/Admin recipients found."] }
    }

    const reviewUrl = buildFrontendUrl("/hr/approval-queue")
    const requestedOn = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    for (const hr of hrRecipients) {
      const hrEmail = hr.email
      const hrId = hr._id

      if (!hrEmail) {
        console.warn(`[NOTIFICATION SERVICE] HR user ${hr.username || hr._id} has no email address configured.`)
        continue
      }

      // Check for duplicate notification to prevent spamming the HR
      const existingNotification = await Notification.findOne({
        type: "EMPLOYEE_APPROVAL_REQUEST",
        recipientId: hrId,
        employeeId: employeeId,
      })

      if (existingNotification) {
        console.log(`[NOTIFICATION SERVICE] Duplicate prevention: Approval email already sent to HR ${hrEmail} for employee ${employeeId}.`)
        continue
      }

      try {
        const emailRes = await sendEmployeeApprovalRequestEmail({
          hrEmail,
          employeeName: empName,
          email: empEmail,
          department: empDept,
          employeeId: empDisplayId,
          organisationName: orgName,
          requestedOn,
          reviewUrl,
        })

        const status = emailRes && emailRes.success !== false ? "SENT" : "FAILED"

        // Database Tracking in Notification collection
        await Notification.create({
          userId: hrId, // Backwards compatibility for existing queries
          recipientId: hrId,
          organisationId: orgId,
          employeeId: employeeId,
          type: "EMPLOYEE_APPROVAL_REQUEST",
          status,
          sentAt: new Date(),
          title: "New Employee Approval Request",
          message: `${empName} (${empEmail}) requested access to ${orgName}.`,
          read: false,
        })

        if (status === "SENT") {
          result.notifiedCount += 1
          console.log(`[NOTIFICATION SERVICE] Successfully logged and sent approval email to ${hrEmail} for ${empName}`)
        } else {
          result.errors.push(`Failed sending email to ${hrEmail}: ${emailRes?.error || "Unknown email error"}`)
        }
      } catch (sendErr) {
        console.error(`[NOTIFICATION SERVICE] Error sending to ${hrEmail}:`, sendErr.message)
        result.errors.push(`Error sending to ${hrEmail}: ${sendErr.message}`)

        // Log failure in database for audit and retryability
        try {
          await Notification.create({
            userId: hrId,
            recipientId: hrId,
            organisationId: orgId,
            employeeId: employeeId,
            type: "EMPLOYEE_APPROVAL_REQUEST",
            status: "FAILED",
            sentAt: new Date(),
            title: "Failed Employee Approval Request Notification",
            message: `Failed sending approval request notification for ${empName}: ${sendErr.message}`,
            read: false,
          })
        } catch (logErr) {
          console.error("[NOTIFICATION SERVICE] Failed to log failure record:", logErr.message)
        }
      }
    }

    return result
  } catch (err) {
    console.error("[NOTIFICATION SERVICE] Unexpected error in sendEmployeeApprovalNotification:", err.message)
    // Non-blocking: return clean object with error description
    return { success: false, notifiedCount: result.notifiedCount, errors: [err.message] }
  }
}

/**
 * Validates whether an email string matches a standard email format.
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false
  return /^\S+@\S+\.\S+$/.test(email.trim())
}

/**
 * Sends an automated status email notification (Approved or Rejected) directly to the employee.
 *
 * Requirements:
 * - Uses the registered email address stored in the employee's MongoDB record.
 * - Validates the recipient's email address.
 * - Prevents duplicate emails using approvalEmailSentAt / rejectionEmailSentAt and Notification records.
 * - For Approved: includes sign-in URL built with buildFrontendUrl("/company-login") and welcome instructions.
 * - For Rejected: professional, human, safely includes HR rejection reason if provided.
 * - Non-blocking: failures do not reverse or disrupt the database operation.
 * - Tracks email notification in Notification collection for audit trail.
 *
 * @param {Object} employee - The employee User document or object.
 * @param {"Approved" | "Rejected"} decision - The status decision.
 * @param {Object} [options] - Additional options (e.g., { reason: string, hrUser: Object }).
 * @returns {Promise<{ success: boolean, skipped?: boolean, reason?: string, error?: string }>}
 */
async function sendEmployeeApprovalStatusEmail(employee, decision, options = {}) {
  try {
    if (!employee || !employee._id) {
      console.warn("[NOTIFICATION SERVICE] Cannot send status email: invalid employee record.")
      return { success: false, error: "Invalid employee record." }
    }

    const employeeId = employee._id
    const empName = employee.name || "Employee"
    const empEmail = (employee.email || "").trim()

    // 1. Email validation
    if (!isValidEmail(empEmail)) {
      console.warn(`[NOTIFICATION SERVICE] Invalid or missing email address for employee ${employeeId} (${empEmail}). Skipping email.`)
      return { success: false, skipped: true, reason: "Invalid or missing email address." }
    }

    // 2. Load latest user document to verify duplicate prevention flags
    const userDoc = await User.findById(employeeId)
    if (!userDoc) {
      console.warn(`[NOTIFICATION SERVICE] Employee user ${employeeId} not found in database.`)
      return { success: false, error: "User not found in database." }
    }

    if (decision === "Approved") {
      // ── DUPLICATE EMAIL PREVENTION FOR APPROVAL ───────────────────────────
      if (userDoc.approvalEmailSentAt) {
        console.log(`[NOTIFICATION SERVICE] Duplicate prevention: Approval email already sent to ${empEmail} at ${userDoc.approvalEmailSentAt}. Skipping.`)
        return { success: true, skipped: true, reason: "Approval email already sent." }
      }

      // Also check Notification collection for robustness
      const existingNotif = await Notification.findOne({
        recipientId: employeeId,
        type: "EMPLOYEE_APPROVED",
        status: "SENT",
      })
      if (existingNotif) {
        console.log(`[NOTIFICATION SERVICE] Duplicate prevention: EMPLOYEE_APPROVED notification already recorded for ${empEmail}. Skipping.`)
        return { success: true, skipped: true, reason: "Approval notification record already exists." }
      }

      const loginUrl = buildFrontendUrl("/company-login")
      console.log(`[NOTIFICATION SERVICE] Sending employee approved email to: ${empEmail}`)

      const sendResult = await sendEmployeeApprovedEmail({
        to: empEmail,
        employeeName: empName,
        loginUrl,
      })

      const isSent = sendResult && sendResult.success !== false
      const sentTimestamp = new Date()

      if (isSent) {
        // Update user record with sent timestamp and clear rejection timestamp
        await User.updateOne(
          { _id: employeeId },
          {
            $set: {
              approvalEmailSentAt: sentTimestamp,
              rejectionEmailSentAt: null,
            },
          }
        )

        // Log notification record in MongoDB
        await Notification.create({
          userId: employeeId,
          recipientId: employeeId,
          organisationId: userDoc.organisationId,
          employeeId: userDoc.employeeId || employeeId,
          type: "EMPLOYEE_APPROVED",
          status: "SENT",
          sentAt: sentTimestamp,
          title: "Account Approved",
          message: `Your CortiQuant account has been approved. You can now sign in at ${loginUrl}`,
          read: false,
        }).catch((notifErr) => {
          console.warn("[NOTIFICATION SERVICE] Failed creating Notification audit log for approved email:", notifErr.message)
        })

        console.log(`[NOTIFICATION SERVICE] Successfully sent and recorded approval email for ${empEmail}`)
        return { success: true, sentAt: sentTimestamp }
      } else {
        console.error(`[NOTIFICATION SERVICE] Failed to send approval email to ${empEmail}:`, sendResult?.error)
        return { success: false, error: sendResult?.error || "Email delivery failed" }
      }
    } else if (decision === "Rejected") {
      // ── DUPLICATE EMAIL PREVENTION FOR REJECTION ──────────────────────────
      if (userDoc.rejectionEmailSentAt) {
        console.log(`[NOTIFICATION SERVICE] Duplicate prevention: Rejection email already sent to ${empEmail} at ${userDoc.rejectionEmailSentAt}. Skipping.`)
        return { success: true, skipped: true, reason: "Rejection email already sent." }
      }

      const rejectionReason = options.reason || userDoc.rejectionReason || null
      console.log(`[NOTIFICATION SERVICE] Sending employee rejected email to: ${empEmail}${rejectionReason ? ` with reason` : ""}`)

      const sendResult = await sendEmployeeRejectedEmail({
        to: empEmail,
        employeeName: empName,
        rejectionReason,
      })

      const isSent = sendResult && sendResult.success !== false
      const sentTimestamp = new Date()

      if (isSent) {
        // Update user record with sent timestamp and clear approval timestamp
        await User.updateOne(
          { _id: employeeId },
          {
            $set: {
              rejectionEmailSentAt: sentTimestamp,
              approvalEmailSentAt: null,
            },
          }
        )

        // Log notification record in MongoDB
        await Notification.create({
          userId: employeeId,
          recipientId: employeeId,
          organisationId: userDoc.organisationId,
          employeeId: userDoc.employeeId || employeeId,
          type: "EMPLOYEE_REJECTED",
          status: "SENT",
          sentAt: sentTimestamp,
          title: "Account Registration Update",
          message: `Your CortiQuant registration was not approved by your organisation's HR administrator.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
          read: false,
        }).catch((notifErr) => {
          console.warn("[NOTIFICATION SERVICE] Failed creating Notification audit log for rejected email:", notifErr.message)
        })

        console.log(`[NOTIFICATION SERVICE] Successfully sent and recorded rejection email for ${empEmail}`)
        return { success: true, sentAt: sentTimestamp }
      } else {
        console.error(`[NOTIFICATION SERVICE] Failed to send rejection email to ${empEmail}:`, sendResult?.error)
        return { success: false, error: sendResult?.error || "Email delivery failed" }
      }
    } else {
      console.warn(`[NOTIFICATION SERVICE] Unrecognized decision '${decision}' for employee approval status email.`)
      return { success: false, error: `Invalid decision '${decision}'` }
    }
  } catch (err) {
    console.error("[NOTIFICATION SERVICE] Unexpected error in sendEmployeeApprovalStatusEmail:", err.message)
    return { success: false, error: err.message }
  }
}

module.exports = {
  sendEmployeeApprovalNotification,
  sendEmployeeApprovalStatusEmail,
  isValidEmail,
}
