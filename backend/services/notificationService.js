const mongoose = require("mongoose")
const User = require("../models/User")
const Organisation = require("../models/Organisation")
const Notification = require("../models/Notification")
const { sendEmployeeApprovalRequestEmail } = require("./emailService")
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

module.exports = {
  sendEmployeeApprovalNotification,
}
