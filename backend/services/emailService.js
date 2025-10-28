const nodemailer = require("nodemailer")

class EmailService {
  constructor() {
    // Only create transporter if SMTP credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS && 
        !process.env.SMTP_USER.includes('your-email') && 
        !process.env.SMTP_PASS.includes('your-app-password')) {
      
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error("Email service configuration error:", error)
        } else {
          console.log("Email service is ready to send messages")
        }
      })
    } else {
      console.log("Email service: No SMTP credentials configured, emails will be logged only")
      this.transporter = null
    }
  }

  async sendEmail({ to, subject, template, data, html, text }) {
    try {
      // If no transporter (no SMTP configuration), log and return
      if (!this.transporter) {
        console.log("📧 Email would be sent:", { 
          to, 
          subject, 
          template: template || 'custom',
          preview: data ? `${data.firstName || 'User'}: ${data.message || subject}` : subject
        })
        return { success: true, messageId: "mock-id" }
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

      const mailOptions = {
        from: `"${process.env.APP_NAME || "SplitWise"}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text: emailText,
        html: emailHtml,
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log("Email sent successfully:", result.messageId)
      return result
    } catch (error) {
      console.error("Failed to send email:", error)
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
            <h1>Welcome to SplitWise!</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.firstName},</h2>
            <p>Thank you for signing up for SplitWise! To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${data.verificationUrl}">${data.verificationUrl}</a></p>
            <p>This link will expire in 24 hours for security reasons.</p>
            <p>If you didn't create an account with SplitWise, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 SplitWise. All rights reserved.</p>
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
            <p>We received a request to reset your password for your SplitWise account. Click the button below to reset your password:</p>
            <a href="${data.resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${data.resetUrl}">${data.resetUrl}</a></p>
            <p>This link will expire in 10 minutes for security reasons.</p>
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 SplitWise. All rights reserved.</p>
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
            <p>You can view the full details and manage your expenses in the SplitWise app.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 SplitWise. All rights reserved.</p>
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
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Reminder</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.firstName},</h2>
            <p>${data.message}</p>
            <a href="${process.env.CLIENT_URL}/expenses" class="button">View Expenses</a>
          </div>
          <div class="footer">
            <p>&copy; 2024 SplitWise. All rights reserved.</p>
          </div>
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
        <title>Group Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited!</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.firstName},</h2>
            <p>${data.message}</p>
            <a href="${data.inviteUrl}" class="button">Join Group</a>
          </div>
          <div class="footer">
            <p>&copy; 2024 SplitWise. All rights reserved.</p>
          </div>
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