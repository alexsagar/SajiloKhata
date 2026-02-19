const nodemailer = require("nodemailer")

const IS_PRODUCTION = process.env.NODE_ENV === "production"

class EmailService {
  constructor() {
    // Only create transporter if SMTP credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS &&
      !process.env.SMTP_USER.includes('your-email') &&
      !process.env.SMTP_PASS.includes('your-app-password')) {
      const port = Number(process.env.SMTP_PORT) || 587
      const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER,
          // Gmail app password should not contain spaces; if present, strip them
          pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
        },
        logger: String(process.env.EMAIL_DEBUG || '').toLowerCase() === 'true',
        debug: String(process.env.EMAIL_DEBUG || '').toLowerCase() === 'true',
      })

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error("[EmailService] SMTP connection verification failed:", error.message)
        } else {
          console.log("[EmailService] SMTP connection verified successfully")
        }
      })
    } else {
      if (IS_PRODUCTION) {
        console.warn(
          "[EmailService] WARNING: No SMTP credentials configured in production. " +
          "Emails will NOT be sent. Set SMTP_USER and SMTP_PASS environment variables."
        )
      } else {
        console.log("[EmailService] No SMTP credentials configured. Emails will be logged to console in development.")
      }
      this.transporter = null
    }
  }

  async sendEmail({ to, subject, template, data, html, text }) {
    try {
      // If no transporter (no SMTP configuration), handle gracefully
      if (!this.transporter) {
        if (IS_PRODUCTION) {
          console.error(
            `[EmailService] FAILED: Cannot send email to ${to} (subject: "${subject}") — SMTP not configured.`
          )
          throw new Error("Email delivery unavailable: SMTP not configured in production environment")
        }
        // Development: log the email that would have been sent
        console.log("[EmailService] Dev mode — email not sent:", {
          to,
          subject,
          template: template || "custom",
        })
        return { success: true, messageId: `dev-no-smtp-${Date.now()}`, accepted: [to], rejected: [] }
      }

      let emailHtml = html
      let emailText = text

      // Generate HTML from template if provided
      if (template && !html) {
        emailHtml = this.generateEmailTemplate(template, data)
      }

      // Generate plain text version if not provided
      if (!emailText && emailHtml) {
        emailText = this.htmlToText(emailHtml)
      }

      const fromAddress = `${process.env.APP_NAME || "SajiloKhata"} <${process.env.SMTP_FROM || process.env.SMTP_USER}>`
      const replyTo = (process.env.SMTP_FROM && process.env.SMTP_FROM !== process.env.SMTP_USER)
        ? process.env.SMTP_FROM
        : undefined

      const bccSelf = String(process.env.EMAIL_BCC_SELF || '').toLowerCase() === 'true'

      const mailOptions = {
        from: fromAddress,
        to,
        ...(bccSelf ? { bcc: process.env.SMTP_USER } : {}),
        subject,
        text: emailText,
        html: emailHtml,
        replyTo,
        envelope: {
          from: process.env.SMTP_USER, // ensure SMTP envelope aligns with authenticated user
          to,
        },
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log(`[EmailService] Email sent to ${to} (messageId: ${result.messageId})`)
      return result
    } catch (error) {
      console.error(`[EmailService] Failed to send email to ${to}:`, error.message)
      throw error
    }
  }

  generateEmailTemplate(template, data) {
    const templates = {
      emailVerification: this.emailVerificationTemplate,
      passwordReset: this.passwordResetTemplate,
      expenseAdded: this.expenseAddedTemplate,
      expenseUpdated: this.expenseUpdatedTemplate,
      paymentReminder: this.paymentReminderTemplate,
      groupInvite: this.groupInviteTemplate,
      settlementRequest: this.settlementRequestTemplate,
    }

    const templateFunction = templates[template]
    if (!templateFunction) {
      throw new Error(`Email template '${template}' not found`)
    }

    return templateFunction(data)
  }

  emailVerificationTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to SajiloKhata!</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.firstName},</h2>
            <p>Thank you for signing up for SajiloKhata! To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${data.verificationUrl}">${data.verificationUrl}</a></p>
            <p>This link will expire in 24 hours for security reasons.</p>
            <p>If you didn't create an account with SajiloKhata, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 SajiloKhata. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  passwordResetTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.firstName},</h2>
            <p>We received a request to reset your password for your SajiloKhata account. Click the button below to reset your password:</p>
            <a href="${data.resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${data.resetUrl}">${data.resetUrl}</a></p>
            <p>This link will expire in 10 minutes for security reasons.</p>
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 SajiloKhata. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  expenseAddedTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Expense Added</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .expense-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Expense Added</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.firstName},</h2>
            <p>${data.message}</p>
            <div class="expense-details">
              <h3>Expense Details:</h3>
              <p><strong>Amount:</strong> $${data.amount}</p>
              <p><strong>Description:</strong> ${data.title}</p>
            </div>
            <p>You can view the full details and manage your expenses in the SajiloKhata app.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 SajiloKhata. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  expenseUpdatedTemplate(data) {
    return this.expenseAddedTemplate({ ...data, title: "Expense Updated" })
  }

  paymentReminderTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Reminder</title>
        <style>
          body { margin:0; padding:0; background:#f6f9fc; font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .wrapper { padding: 24px; }
          .container { max-width: 600px; margin: 0 auto; background:#ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(16,24,40,0.08); }
          .header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
          .content { padding: 24px; }
          .button { display: inline-block; background: #F59E0B; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
          .muted { color:#667085; font-size: 14px; }
          @media (max-width: 640px){ .wrapper{ padding:12px } .content{ padding:16px } }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>Payment Reminder</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.firstName},</h2>
              <p>${data.message}</p>
              <a href="${process.env.CLIENT_URL}/expenses" class="button">View Expenses</a>
              <p class="muted">You received this because you have pending balances in SajiloKhata.</p>
            </div>
          </div>
          <p class="muted" style="text-align:center; margin-top:12px;">&copy; 2024 SajiloKhata. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }

  groupInviteTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>SajiloKhata Invitation</title>
        <style>
          body { margin:0; padding:0; background:#f6f9fc; font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .wrapper { padding: 24px; }
          .container { max-width: 600px; margin: 0 auto; background:#ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(16,24,40,0.08); }
          .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; }
          .content { padding: 24px; }
          .button { display: inline-block; background: #8B5CF6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
          .muted { color:#667085; font-size: 14px; }
          @media (max-width: 640px){ .wrapper{ padding:12px } .content{ padding:16px } }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>You're invited to SajiloKhata!</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.firstName},</h2>
              <p>${data.message}</p>
              <a href="${data.inviteUrl}" class="button">Accept Invitation</a>
              <p class="muted">If the button doesn't work, copy and paste this link into your browser:</p>
              <p><a href="${data.inviteUrl}">${data.inviteUrl}</a></p>
            </div>
          </div>
          <p class="muted" style="text-align:center; margin-top:12px;">&copy; 2024 SajiloKhata. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }

  settlementRequestTemplate(data) {
    return this.paymentReminderTemplate({ ...data, title: "Settlement Request" })
  }

  htmlToText(html) {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim()
  }
}

// Create singleton instance
const emailService = new EmailService()

// Export convenience function
const sendEmail = (options) => emailService.sendEmail(options)

module.exports = { EmailService, sendEmail }