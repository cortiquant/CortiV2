const { getTransporter } = require("./emailService")
const { buildFrontendUrl } = require("../config/appConfig")

/**
 * Escapes HTML characters in user-provided content to prevent XSS / formatting issues.
 */
function escapeHtml(str) {
  if (!str) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Generates branded HTML template for Password Reset Email
 */
function buildPasswordResetHtml({ userName, resetUrl, expiresInMinutes = 60 }) {
  const safeName = escapeHtml(userName || "there")

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset your CortiQuant password</title>
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
              <p style="color: rgba(255, 255, 255, 0.85); margin: 6px 0 0 0; font-size: 13px;">Mental Readiness &amp; Workplace Performance Intelligence</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 16px; margin: 0 0 16px 0; color: #FFFFFF;">Hello ${safeName},</p>
              <p style="font-size: 14px; line-height: 24px; margin: 0 0 20px 0; color: #A0A5C0;">
                We received a request to reset your CortiQuant password.
              </p>
              <p style="font-size: 14px; line-height: 24px; margin: 0 0 28px 0; color: #A0A5C0;">
                Click the button below to create a new password:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #9B5DE5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(155, 93, 229, 0.4);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #7B819E; margin: 0 0 8px 0;">
                This link will expire in <strong>${expiresInMinutes} minutes</strong> and can only be used once.
              </p>
              <p style="font-size: 12px; color: #5A5F7A; margin: 0 0 24px 0;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>

              <p style="font-size: 12px; color: #7B819E; margin: 0 0 8px 0; word-break: break-all;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #c4b5fd; text-decoration: underline;">${resetUrl}</a>
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
 * Sends a password reset email to the user.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.userName - Recipient name
 * @param {string} options.rawToken - Raw single-use secure reset token
 * @returns {Promise<{success: boolean, messageId?: string, resetUrl?: string, error?: string}>}
 */
async function sendPasswordResetEmail({ to, userName, rawToken }) {
  const resetUrl = buildFrontendUrl("/reset-password", { token: rawToken })
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || "CortiQuant <cortiquant@gmail.com>"
  const subject = "Reset your CortiQuant password"
  const html = buildPasswordResetHtml({ userName, resetUrl, expiresInMinutes: 60 })

  const text = `Hello,

We received a request to reset your CortiQuant password.

Click the link below to create a new password:
${resetUrl}

This link will expire in 60 minutes and can only be used once.

If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.

Warm regards,
The CortiQuant Team`

  const transporter = getTransporter()

  if (!transporter) {
    console.warn(`[AUTH EMAIL] SMTP not configured. Reset email not sent to: ${to}`)
    return { success: false, error: "SMTP not configured" }
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    })
    console.log(`[AUTH] Password reset email sent to user: ${to} (msgId: ${info.messageId})`)
    return { success: true, messageId: info.messageId }
  } catch (err) {
    console.error(`[AUTH] Error sending password reset email to ${to}:`, err.message)
    return { success: false, error: err.message }
  }
}

module.exports = {
  sendPasswordResetEmail,
  buildPasswordResetHtml,
}
