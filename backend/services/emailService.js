const nodemailer = require("nodemailer")
const { getFrontendUrl, buildFrontendUrl } = require("../config/appConfig")

/**
 * Creates and caches the SMTP transporter.
 * Supports:
 * - SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD
 * - EMAIL_HOST / EMAIL_PORT / EMAIL_USER / EMAIL_PASSWORD
 * Defaults to Gmail SMTP (smtp.gmail.com:465 secure) when configured.
 */
let cachedTransporter = null

function getTransporter() {
  if (cachedTransporter) return cachedTransporter

  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.gmail.com"
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || "465", 10)
  const isSecure = process.env.SMTP_SECURE === "true" || port === 465

  const user = process.env.SMTP_USER || process.env.EMAIL_USER || "cortiquant@gmail.com"
  const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD

  if (!pass) {
    return null
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user: user.trim(),
      pass: pass.trim(),
    },
  })

  return cachedTransporter
}

/**
 * Verifies SMTP connection during development or startup.
 */
async function verifySMTP() {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn("[EMAIL] SMTP credentials not fully configured in .env (SMTP_PASSWORD missing).")
    return { success: false, message: "SMTP credentials not configured." }
  }

  try {
    await transporter.verify()
    console.log("[EMAIL] SMTP connection verified successfully (smtp.gmail.com)")
    return { success: true }
  } catch (err) {
    console.error("[EMAIL] SMTP connection verification failed:", err.message)
    return { success: false, message: err.message }
  }
}

/**
 * Generates branded HTML template for HR Invitation
 */
function buildInvitationHtml({ hrName, orgName, orgCode, acceptUrl, expiresInDays = 7 }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CortiQuant HR Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #701198; padding: 32px 40px; text-align: left;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">CortiQuant</h1>
              <p style="color: rgba(255, 255, 255, 0.85); margin: 6px 0 0 0; font-size: 13px;">Mental Readiness & Workplace Performance Intelligence</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 16px; margin: 0 0 16px 0; color: #111827;">Hello <strong>${hrName}</strong>,</p>
              <p style="font-size: 14px; line-height: 24px; margin: 0 0 24px 0; color: #4b5563;">
                You have been invited to join <strong>${orgName}</strong> as an <strong>HR Administrator</strong> on CortiQuant.
              </p>

              <!-- Org Info Box -->
              <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin-bottom: 32px; border: 1px solid #e5e7eb;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; padding-bottom: 4px;">Organisation</td>
                  </tr>
                  <tr>
                    <td style="font-size: 15px; color: #111827; font-weight: 600; padding-bottom: 16px;">${orgName}</td>
                  </tr>
                  <tr>
                    <td style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; padding-bottom: 4px;">Organisation Code</td>
                  </tr>
                  <tr>
                    <td style="font-size: 15px; color: #701198; font-weight: 700; font-family: monospace;">${orgCode}</td>
                  </tr>
                </table>
              </div>

              <p style="font-size: 14px; line-height: 24px; margin: 0 0 24px 0; color: #4b5563;">
                Click the button below to accept your invitation and set up your secure password:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${acceptUrl}" style="display: inline-block; background-color: #701198; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(112, 17, 152, 0.2);">
                      Accept Invitation &amp; Set Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">
                This invitation link expires in <strong>${expiresInDays} days</strong>.
              </p>
              <p style="font-size: 12px; color: #9ca3af; margin: 0 0 24px 0;">
                If you did not expect this invitation, you can safely ignore this email.
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

              <p style="font-size: 13px; color: #4b5563; margin: 0;">
                Regards,<br>
                <strong>The CortiQuant Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Sends HR invitation email
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.hrName - Recipient name
 * @param {string} options.orgName - Organisation name
 * @param {string} options.orgCode - Organisation code
 * @param {string} options.rawToken - Raw unhashed invitation token
 */
async function sendHRInvitation({ to, hrName, orgName, orgCode, rawToken }) {
  const acceptUrl = buildFrontendUrl("/hr/accept-invitation", { token: rawToken })

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || "CortiQuant <cortiquant@gmail.com>"
  const subject = "You're invited to join CortiQuant as an HR Administrator"
  const html = buildInvitationHtml({ hrName, orgName, orgCode, acceptUrl, expiresInDays: 7 })
  const text = `Hello ${hrName},

You have been invited to join ${orgName} as an HR Administrator on CortiQuant.

Organisation: ${orgName}
Organisation Code: ${orgCode}

Click the link below to accept your invitation and create your HR account:
${acceptUrl}

This invitation expires in 7 days.

If you did not expect this invitation, you can safely ignore this email.

Regards,
CortiQuant Team`

  console.log(`[EMAIL] Preparing HR invitation for ${to} (${orgName})`)
  console.log(`[EMAIL] From: ${fromAddress}`)

  const transporter = getTransporter()

  if (!transporter) {
    console.error("[EMAIL] HR invitation email failed: SMTP transporter not configured.")
    throw new Error("Email service is not configured. Please configure SMTP_PASSWORD in backend/.env.")
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    })
    console.log(`[EMAIL] HR invitation email sent successfully to: ${to} (msgId: ${info.messageId})`)
    return { success: true, messageId: info.messageId, to }
  } catch (err) {
    console.error(`[EMAIL] HR invitation email failed for ${to}:`, err.message)
    throw new Error(`Email delivery failed: ${err.message}`)
  }
}

/**
 * Generates branded HTML template for Listener Invitation
 */
function buildListenerInvitationHtml({ listenerName, acceptUrl, expiresInHours = 72 }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CortiQuant Listener Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #08091F; color: #F5F5FA;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px; background-color: #08091F;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0D0F2D; border: 1px solid rgba(155, 93, 229, 0.25); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);">
          <!-- Header -->
          <tr>
            <td style="background-color: #701198; padding: 32px 40px; text-align: left;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">CortiQuant</h1>
              <p style="color: rgba(255, 255, 255, 0.85); margin: 6px 0 0 0; font-size: 13px;">Peer Support &amp; Workplace Wellbeing</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 16px; margin: 0 0 16px 0; color: #FFFFFF;">Hello <strong>${listenerName}</strong>,</p>
              <p style="font-size: 14px; line-height: 24px; margin: 0 0 20px 0; color: #A0A5C0;">
                You have been invited to join <strong>CortiQuant</strong> as a verified <strong>Peer-Support Listener</strong>.
              </p>

              <!-- Role Mission Callout -->
              <div style="background-color: rgba(112, 17, 152, 0.12); border-left: 4px solid #9B5DE5; border-radius: 8px; padding: 18px 20px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 13px; line-height: 22px; color: #E0E2EC;">
                  <strong>What a Listener does:</strong><br />
                  Provide confidential, compassionate peer-support listening to employees through the CortiQuant platform.
                </p>
              </div>

              <p style="font-size: 14px; line-height: 24px; margin: 0 0 28px 0; color: #A0A5C0;">
                To accept this invitation and create your secure password, click the button below:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${acceptUrl}" style="display: inline-block; background-color: #9B5DE5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(155, 93, 229, 0.4);">
                      Accept Invitation &amp; Set Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #7B819E; margin: 0 0 8px 0;">
                This invitation link will expire in <strong>${expiresInHours} hours</strong>.
              </p>
              <p style="font-size: 12px; color: #5A5F7A; margin: 0 0 24px 0;">
                If you were not expecting this invitation, please disregard this email.
              </p>

              <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 24px 0;" />

              <p style="font-size: 13px; color: #A0A5C0; margin: 0;">
                Warm regards,<br />
                <strong>The CortiQuant Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Sends Listener invitation email
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.listenerName - Recipient name
 * @param {string} options.rawToken - Raw unhashed invitation token
 */
async function sendListenerInvitation({ to, listenerName, rawToken }) {
  const acceptUrl = buildFrontendUrl("/listener/accept-invite", { token: rawToken })

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || "CortiQuant <cortiquant@gmail.com>"
  const subject = "CortiQuant Listener Invitation"
  const html = buildListenerInvitationHtml({ listenerName, acceptUrl, expiresInHours: 72 })
  const text = `Hello ${listenerName},

You have been invited to join CortiQuant as a Peer-Support Listener.
Provide confidential peer-support listening to employees through the CortiQuant platform.

Click the link below to accept your invitation and create your account:
${acceptUrl}

This invitation expires in 72 hours.

If you did not expect this invitation, you can safely ignore this email.

Regards,
The CortiQuant Team`

  console.log(`[EMAIL] Preparing Listener invitation for ${to}`)
  console.log(`[EMAIL] From: ${fromAddress}`)
  console.log(`[DEV EMAIL URL] ${acceptUrl}`)

  const transporter = getTransporter()

  if (!transporter) {
    console.warn("[EMAIL] Transporter not configured. Outputting link to console only.")
    return { success: true, acceptUrl, devOnly: true }
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    })
    console.log(`[EMAIL] Listener invitation email sent successfully to: ${to} (msgId: ${info.messageId})`)
    return { success: true, messageId: info.messageId, to, acceptUrl }
  } catch (err) {
    console.error(`[EMAIL] Listener invitation email delivery failed for ${to}:`, err.message)
    // Fallback: don't crash invitation creation if email delivery throws, log acceptUrl
    console.log(`[FALLBACK DEV LINK] ${acceptUrl}`)
    return { success: false, error: err.message, acceptUrl }
  }
}

/**
 * Sends a test email to verify credentials (development endpoint)
 */
async function sendTestEmail(recipientEmail) {
  const transporter = getTransporter()
  if (!transporter) {
    throw new Error("SMTP is not configured. Please set SMTP_PASSWORD in backend/.env.")
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || "CortiQuant <cortiquant@gmail.com>"
  const subject = "CortiQuant Email Service Test"
  const text = "This is a test email from CortiQuant."
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #111827;">
      <h2 style="color: #701198;">CortiQuant Email Service Test</h2>
      <p>This is a test email confirming that CortiQuant Gmail SMTP delivery is functional.</p>
      <p style="color: #6b7280; font-size: 12px;">Sent from cortiquant@gmail.com</p>
    </div>
  `

  const info = await transporter.sendMail({
    from: fromAddress,
    to: recipientEmail,
    subject,
    text,
    html,
  })

  console.log(`[EMAIL] Test email sent successfully to ${recipientEmail} (msgId: ${info.messageId})`)
  return { success: true, messageId: info.messageId }
}

/**
 * Sends a 5-minute session reminder email to a Listener
 */
async function sendListenerSessionReminder({ listenerEmail, listenerName, startTime, duration = 10, sessionId }) {
  const transporter = getTransporter()
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || "CortiQuant <cortiquant@gmail.com>"
  const subject = "Your CortiQuant listening session starts in 5 minutes"
  const text = `Your peer support session starts in 5 minutes.\n\nTime: ${startTime}\nDuration: ${duration} minutes\nSession ID: ${sessionId}`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Session Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background-color: #701198; padding: 28px 36px; text-align: left;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">CortiQuant</h1>
              <p style="color: rgba(255, 255, 255, 0.85); margin: 4px 0 0 0; font-size: 13px;">Peer Support Listener Portal</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px;">
              <p style="font-size: 16px; margin: 0 0 16px 0; color: #111827;">Hello <strong>${listenerName || "Listener"}</strong>,</p>
              <p style="font-size: 14px; line-height: 22px; margin: 0 0 20px 0; color: #4b5563;">
                Your peer support session starts in <strong>5 minutes</strong>.
              </p>
              <div style="background-color: #f3f4f6; border-radius: 12px; padding: 18px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #374151;">
                  <tr>
                    <td style="padding-bottom: 8px; color: #6b7280; width: 120px;">Time:</td>
                    <td style="padding-bottom: 8px; font-weight: 600; color: #111827;">${startTime}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px; color: #6b7280;">Duration:</td>
                    <td style="padding-bottom: 8px; font-weight: 600; color: #111827;">${duration} minutes</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280;">Session ID:</td>
                    <td style="font-weight: 700; font-family: monospace; color: #701198;">${sessionId}</td>
                  </tr>
                </table>
              </div>
              <p style="font-size: 13px; color: #6b7280; margin: 0;">Please log into your Listener Portal and be ready to enter the session.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  if (!transporter) {
    console.warn(`[EMAIL MOCK] SMTP not configured. Would send 5-min session reminder to listener: ${listenerEmail} (${sessionId})`)
    return { success: true, mocked: true }
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: listenerEmail,
      subject,
      text,
      html,
    })
    console.log(`[EMAIL] 5-min reminder sent to listener ${listenerEmail} for session ${sessionId} (msgId: ${info.messageId})`)
    return { success: true, messageId: info.messageId }
  } catch (err) {
    console.error(`[EMAIL] Failed sending session reminder to ${listenerEmail}:`, err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Sends a booking confirmation email to a Listener immediately when a session is booked.
 */
async function sendBookingConfirmationEmail({ listenerEmail, listenerName, date, time, duration = 10, sessionId }) {
  const transporter = getTransporter()
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || "CortiQuant <cortiquant@gmail.com>"
  const subject = "Your CortiQuant session has been booked"
  const text = `Hello ${listenerName || "Listener"},\n\nYour CortiQuant peer support session has been confirmed.\n\nDate: ${date}\nTime: ${time}\nDuration: ${duration} minutes\nSession ID: ${sessionId}\n\nPlease log into your Listener Portal to prepare for the session.`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Session Booked</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background-color: #701198; padding: 28px 36px; text-align: left;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">CortiQuant</h1>
              <p style="color: rgba(255, 255, 255, 0.85); margin: 4px 0 0 0; font-size: 13px;">Peer Support Listener Portal</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px;">
              <p style="font-size: 16px; margin: 0 0 16px 0; color: #111827;">Hello <strong>${listenerName || "Listener"}</strong>,</p>
              <p style="font-size: 14px; line-height: 22px; margin: 0 0 20px 0; color: #4b5563;">
                A new listening session has been booked with you by an employee.
              </p>
              <div style="background-color: #f3f4f6; border-radius: 12px; padding: 18px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #374151;">
                  <tr>
                    <td style="padding-bottom: 8px; color: #6b7280; width: 120px;">Date:</td>
                    <td style="padding-bottom: 8px; font-weight: 600; color: #111827;">${date}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px; color: #6b7280;">Time:</td>
                    <td style="padding-bottom: 8px; font-weight: 600; color: #111827;">${time}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px; color: #6b7280;">Duration:</td>
                    <td style="padding-bottom: 8px; font-weight: 600; color: #111827;">${duration} minutes</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280;">Session ID:</td>
                    <td style="font-weight: 700; font-family: monospace; color: #701198;">${sessionId}</td>
                  </tr>
                </table>
              </div>
              <p style="font-size: 13px; color: #6b7280; margin: 0;">This session is confirmed and will appear in your upcoming sessions.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  if (!transporter) {
    console.warn(`[EMAIL MOCK] SMTP not configured. Would send booking confirmation to listener: ${listenerEmail} (${sessionId})`)
    return { success: true, mocked: true }
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: listenerEmail,
      subject,
      text,
      html,
    })
    console.log(`[EMAIL] Booking confirmation sent to listener ${listenerEmail} for session ${sessionId} (msgId: ${info.messageId})`)
    return { success: true, messageId: info.messageId }
  } catch (err) {
    console.error(`[EMAIL] Failed sending booking confirmation to ${listenerEmail}:`, err.message)
    return { success: false, error: err.message }
  }
}

module.exports = {
  sendHRInvitation,
  sendListenerInvitation,
  sendTestEmail,
  sendListenerSessionReminder,
  sendBookingConfirmationEmail,
  verifySMTP,
}


