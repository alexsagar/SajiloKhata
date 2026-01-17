const express = require("express")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")
const User = require("../models/User")
const PendingSignup = require("../models/PendingSignup")
const { generateTokens, verifyRefreshToken, authenticateToken } = require("../middleware/auth")
const cookie = require('cookie')
const { sendEmail } = require("../services/emailService")
const { body, validationResult } = require("express-validator")

const router = express.Router()

const inferCookieSecure = (req) => {
  if (typeof process.env.COOKIE_SECURE === 'string') {
    return process.env.COOKIE_SECURE === 'true'
  }
  const xfProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase()
  if (xfProto) return xfProto.includes('https')
  return !!req.secure
}

const OTP_LENGTH = 6
const OTP_TTL_MS = 10 * 60 * 1000
const PENDING_TTL_MS = 24 * 60 * 60 * 1000
const OTP_MAX_ATTEMPTS = 8
const OTP_RESEND_COOLDOWN_MS = 60 * 1000
const OTP_MAX_RESENDS = 5

const generateOtp = () => {
  const max = Math.pow(10, OTP_LENGTH)
  const n = crypto.randomInt(0, max)
  return String(n).padStart(OTP_LENGTH, "0")
}

// Register
router.post(
  "/register",
  [
    body("username").isLength({ min: 3, max: 30 }).trim(),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("firstName").notEmpty().trim(),
    body("lastName").notEmpty().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { username, email, password, firstName, lastName } = req.body

      const normalizedEmail = String(email || "").toLowerCase()

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email: normalizedEmail }, { username }],
      })

      if (existingUser) {
        return res.status(400).json({
          message: existingUser.email === normalizedEmail ? "Email already registered" : "Username already taken",
        })
      }

      const existingPendingUsername = await PendingSignup.findOne({ username })
      if (existingPendingUsername) {
        return res.status(400).json({ message: "Username already taken" })
      }

      const existingPending = await PendingSignup.findOne({ email: normalizedEmail })
      if (existingPending) {
        const tooSoon = existingPending.otpSentAt && (Date.now() - new Date(existingPending.otpSentAt).getTime() < OTP_RESEND_COOLDOWN_MS)
        if (tooSoon) {
          return res.status(429).json({ message: "Please wait before requesting another OTP" })
        }
        if ((existingPending.resendCount || 0) >= OTP_MAX_RESENDS) {
          return res.status(429).json({ message: "Too many OTP requests. Please try again later." })
        }
      }

      const otp = generateOtp()
      const otpHash = await bcrypt.hash(otp, 12)
      const passwordEncrypted = await bcrypt.hash(password, 12)

      const now = new Date()
      const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS)
      const expiresAt = new Date(Date.now() + PENDING_TTL_MS)

      await PendingSignup.findOneAndUpdate(
        { email: normalizedEmail },
        {
          email: normalizedEmail,
          username,
          firstName,
          lastName,
          passwordEncrypted,
          otpHash,
          otpExpiresAt,
          otpSentAt: now,
          otpAttempts: 0,
          resendCount: existingPending ? (existingPending.resendCount || 0) + 1 : 0,
          expiresAt,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )

      await sendEmail({
        to: normalizedEmail,
        subject: "Your SajiloKhata verification code",
        html: `<!DOCTYPE html><html><body><p>Hi ${firstName},</p><p>Your verification code is:</p><h2 style="letter-spacing:2px;">${otp}</h2><p>This code expires in 10 minutes.</p></body></html>`,
        text: `Hi ${firstName},\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
      })

      res.status(200).json({
        message: "OTP sent to your email. Please verify to complete registration.",
        email: normalizedEmail,
      })
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message })
    }
  },
)

router.post(
  "/register/verify-otp",
  [body("email").isEmail().normalizeEmail(), body("otp").isLength({ min: OTP_LENGTH, max: OTP_LENGTH })],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const email = String(req.body.email || "").toLowerCase()
      const otp = String(req.body.otp || "")

      const pending = await PendingSignup.findOne({ email })
      if (!pending) {
        return res.status(400).json({ message: "No pending signup found for this email" })
      }

      if (pending.otpExpiresAt && new Date(pending.otpExpiresAt).getTime() < Date.now()) {
        return res.status(400).json({ message: "OTP expired" })
      }

      if ((pending.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
        return res.status(429).json({ message: "Too many attempts. Please request a new OTP." })
      }

      const ok = await bcrypt.compare(otp, pending.otpHash)
      if (!ok) {
        pending.otpAttempts = (pending.otpAttempts || 0) + 1
        await pending.save()
        return res.status(400).json({ message: "Invalid OTP" })
      }

      const existingUser = await User.findOne({ $or: [{ email }, { username: pending.username }] })
      if (existingUser) {
        await PendingSignup.deleteOne({ _id: pending._id })
        return res.status(400).json({
          message: existingUser.email === email ? "Email already registered" : "Username already taken",
        })
      }

      const user = new User({
        username: pending.username,
        email,
        password: pending.passwordEncrypted,
        firstName: pending.firstName,
        lastName: pending.lastName,
        isEmailVerified: true,
      })

      await user.save()
      await PendingSignup.deleteOne({ _id: pending._id })

      res.status(201).json({
        message: "Registration complete. You can now log in.",
        user: user.toJSON(),
      })
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message })
    }
  },
)

router.post(
  "/register/resend-otp",
  [body("email").isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const email = String(req.body.email || "").toLowerCase()

      const pending = await PendingSignup.findOne({ email })
      if (!pending) {
        return res.status(400).json({ message: "No pending signup found for this email" })
      }

      const tooSoon = pending.otpSentAt && (Date.now() - new Date(pending.otpSentAt).getTime() < OTP_RESEND_COOLDOWN_MS)
      if (tooSoon) {
        return res.status(429).json({ message: "Please wait before requesting another OTP" })
      }

      if ((pending.resendCount || 0) >= OTP_MAX_RESENDS) {
        return res.status(429).json({ message: "Too many OTP requests. Please try again later." })
      }

      const otp = generateOtp()
      pending.otpHash = await bcrypt.hash(otp, 12)
      pending.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS)
      pending.otpSentAt = new Date()
      pending.otpAttempts = 0
      pending.resendCount = (pending.resendCount || 0) + 1
      await pending.save()

      await sendEmail({
        to: email,
        subject: "Your SajiloKhata verification code",
        html: `<!DOCTYPE html><html><body><p>Hi ${pending.firstName},</p><p>Your verification code is:</p><h2 style="letter-spacing:2px;">${otp}</h2><p>This code expires in 10 minutes.</p></body></html>`,
        text: `Hi ${pending.firstName},\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
      })

      res.status(200).json({ message: "OTP resent" })
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message })
    }
  },
)

// Login
router.post("/login", [body("email").isEmail().normalizeEmail(), body("password").notEmpty()], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    // Find user
    const user = await User.findOne({ email }).select("+password")
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id)
    const inferredSecure = inferCookieSecure(req)
    const inferredSameSite = process.env.COOKIE_SAMESITE || (inferredSecure ? 'None' : 'Lax')
    const common = { httpOnly: true, sameSite: inferredSameSite, secure: inferredSecure, path: '/' }
    res
      .cookie('accessToken', accessToken, { ...common, maxAge: 15 * 60 * 1000 })
      .cookie('refreshToken', refreshToken, { ...common, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({ success: true, data: { user: user.toJSON() } })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Get current user (me endpoint)
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.json({ user })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Refresh token
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" })
    }

    const decoded = verifyRefreshToken(refreshToken)
    const user = await User.findById(decoded.userId)

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid refresh token" })
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id)
    const inferredSecure = inferCookieSecure(req)
    const inferredSameSite = process.env.COOKIE_SAMESITE || (inferredSecure ? 'None' : 'Lax')
    const common = { httpOnly: true, sameSite: inferredSameSite, secure: inferredSecure, path: '/' }
    res
      .cookie('accessToken', accessToken, { ...common, maxAge: 15 * 60 * 1000 })
      .cookie('refreshToken', newRefreshToken, { ...common, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({ success: true })
  } catch (error) {
    res.status(401).json({ message: "Invalid refresh token" })
  }
})

// Verify email
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body

    const user = await User.findOne({ emailVerificationToken: token })
    if (!user) {
      return res.status(400).json({ message: "Invalid verification token" })
    }

    user.isEmailVerified = true
    user.emailVerificationToken = undefined
    await user.save()

    res.json({ message: "Email verified successfully" })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Forgot password
router.post("/forgot-password", [body("email").isEmail().normalizeEmail()], async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.json({ message: "If an account with that email exists, a password reset link has been sent." })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    user.passwordResetToken = resetToken
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000 // 10 minutes
    await user.save()

    // Send reset email
    try {
      await sendEmail({
        to: email,
        subject: "Reset your SajiloKhata password",
        template: "passwordReset",
        data: {
          firstName: user.firstName,
          resetUrl: `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`,
        },
      })
    } catch (emailError) {
      
    }

    res.json({ message: "If an account with that email exists, a password reset link has been sent." })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Reset password
router.post("/reset-password", [body("token").notEmpty(), body("password").isLength({ min: 6 })], async (req, res) => {
  try {
    const { token, password } = req.body

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" })
    }

    user.password = password
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()

    res.json({ message: "Password reset successfully" })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Logout (optional - mainly for clearing refresh tokens)
router.post("/logout", authenticateToken, async (req, res) => {
  res
    .clearCookie('accessToken')
    .clearCookie('refreshToken')
    .json({ success: true })
})

// OAuth Login/Register - handles Google and Facebook OAuth users
router.post("/oauth", async (req, res) => {
  try {
    const { provider, providerId, email, name, firstName, lastName, avatar, accessToken } = req.body

    // Validate required fields
    if (!provider || !providerId || !email) {
      return res.status(400).json({ 
        message: "Missing required OAuth fields: provider, providerId, and email are required" 
      })
    }

    // Validate provider
    if (!["google", "facebook"].includes(provider)) {
      return res.status(400).json({ message: "Invalid OAuth provider" })
    }

    // Try to find existing user by OAuth provider ID or email
    let user = await User.findOne({
      $or: [
        { oauthProvider: provider, oauthProviderId: providerId },
        { email: email.toLowerCase() }
      ]
    })

    if (user) {
      // User exists - update OAuth info if needed
      if (!user.oauthProvider) {
        // User registered with email/password, now linking OAuth
        user.oauthProvider = provider
        user.oauthProviderId = providerId
      }

      // Always update avatar to the latest value from the OAuth provider if provided
      if (avatar) {
        user.avatar = avatar
      }

      // Update last login
      user.lastLogin = new Date()
      await user.save()
    } else {
      // Create new OAuth user
      const fName = firstName || name?.split(" ")[0] || "User"
      const lName = lastName || name?.split(" ").slice(1).join(" ") || ""
      
      // Generate a unique username from email
      const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
      let username = baseUsername
      let counter = 1
      
      // Check if username exists and generate unique one
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`
        counter++
      }

      user = new User({
        email: email.toLowerCase(),
        username,
        firstName: fName,
        lastName: lName,
        avatar: avatar || null,
        oauthProvider: provider,
        oauthProviderId: providerId,
        isEmailVerified: true, // OAuth emails are pre-verified
        isActive: true,
        lastLogin: new Date(),
      })

      await user.save()
    }

    // Generate tokens for the user
    const { accessToken: jwtAccessToken, refreshToken } = generateTokens(user._id)
    
    // Set cookies
    const inferredSecure = inferCookieSecure(req)
    const inferredSameSite = process.env.COOKIE_SAMESITE || (inferredSecure ? 'None' : 'Lax')
    const common = { httpOnly: true, sameSite: inferredSameSite, secure: inferredSecure, path: '/' }
    
    res
      .cookie('accessToken', jwtAccessToken, { ...common, maxAge: 15 * 60 * 1000 })
      .cookie('refreshToken', refreshToken, { ...common, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({ 
        success: true, 
        data: { 
          user: user.toJSON(),
          isNewUser: !user.lastLogin || (Date.now() - new Date(user.lastLogin).getTime() < 5000)
        } 
      })
  } catch (error) {
    console.error("OAuth error:", error)
    res.status(500).json({ message: "Server error during OAuth", error: error.message })
  }
})

module.exports = router