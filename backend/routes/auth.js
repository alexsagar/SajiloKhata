const express = require("express")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")
const User = require("../models/User")
const { generateTokens, verifyRefreshToken, authenticateToken } = require("../middleware/auth")
const cookie = require('cookie')
const { sendEmail } = require("../services/emailService")
const { body, validationResult } = require("express-validator")

const router = express.Router()

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

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      })

      if (existingUser) {
        return res.status(400).json({
          message: existingUser.email === email ? "Email already registered" : "Username already taken",
        })
      }

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString("hex")

      // Create user
      const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
        emailVerificationToken,
      })

      await user.save()

      // Send verification email
      try {
        await sendEmail({
          to: email,
          subject: "Verify your Khutrukey account",
          template: "emailVerification",
          data: {
            firstName,
            verificationUrl: `${process.env.CLIENT_URL}/verify-email?token=${emailVerificationToken}`,
          },
        })
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError)
      }

      // Don't generate tokens - user needs to login separately
      res.status(201).json({
        message: "User registered successfully. Please check your email for verification.",
        user: user.toJSON(),
      })
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
    const inferredSecure = process.env.COOKIE_SECURE ? (process.env.COOKIE_SECURE === 'true') : (process.env.CLIENT_URL?.startsWith('https') || process.env.NODE_ENV === 'production')
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
    const inferredSecure = process.env.COOKIE_SECURE ? (process.env.COOKIE_SECURE === 'true') : (process.env.CLIENT_URL?.startsWith('https') || process.env.NODE_ENV === 'production')
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
        subject: "Reset your Khutrukey password",
        template: "passwordReset",
        data: {
          firstName: user.firstName,
          resetUrl: `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`,
        },
      })
    } catch (emailError) {
      console.error("Failed to send reset email:", emailError)
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

module.exports = router