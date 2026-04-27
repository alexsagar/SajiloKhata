const express = require("express")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")
const { body, validationResult } = require("express-validator")
const User = require("../models/User")
const Group = require("../models/Group")
const Expense = require("../models/Expense")
const Settlement = require("../models/Settlement")
const { reconcileConfirmedSettlementsForGroups } = require("../services/settlementApplicationService")
const { requireRole } = require("../middleware/auth")
const { getPagination, escapeRegex } = require("../utils/query")
const { ok, fail } = require("../utils/http")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { sendEmail } = require("../services/emailService")
const { measure } = require("../utils/perf")

const router = express.Router()
const EMAIL_OTP_LENGTH = 6
const EMAIL_OTP_TTL_MS = 10 * 60 * 1000
const EMAIL_OTP_RESEND_COOLDOWN_MS = 60 * 1000
const EMAIL_OTP_MAX_RESENDS = 5

function generateOtp() {
  const max = Math.pow(10, EMAIL_OTP_LENGTH)
  const n = crypto.randomInt(0, max)
  return String(n).padStart(EMAIL_OTP_LENGTH, "0")
}

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/avatars")
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, `avatar-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"))
    }
  },
})

// Get current user profile
router.get("/profile", async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password -refreshTokens")
      .lean()

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Get user statistics
    const [groups, expenses, totalSpent] = await Promise.all([
      Group.countDocuments({ "members.user": req.user._id }),
      Expense.countDocuments({
        $or: [{ paidBy: req.user._id }, { "splits.user": req.user._id }],
      }),
      Expense.aggregate([
        { $match: { paidBy: req.user._id } },
        { $group: { _id: null, total: { $sum: "$amountCents" } } },
      ]),
    ])

    const userStats = {
      groupsCount: groups,
      expensesCount: expenses,
      totalSpent: Math.round((totalSpent[0]?.total || 0)) / 100,
      memberSince: user.createdAt,
    }

    res.json({
      user,
      stats: userStats,
    })
  } catch (error) {
    
    res.status(500).json({ message: "Server error" })
  }
})

// Update user profile
router.put(
  "/profile",
  [
    body("firstName").optional().trim().isLength({ min: 1, max: 50 }),
    body("lastName").optional().trim().isLength({ min: 1, max: 50 }),
    body("username")
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/),
    body("phone")
      .optional()
      .trim()
      .matches(/^\+?[\d\s\-$$$$]+$/),
    body("bio").optional().trim().isLength({ max: 500 }),
    body("location").optional().trim().isLength({ max: 100 }),
    body("website").optional().trim().isURL(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { firstName, lastName, username, phone, bio, location, website } = req.body

      // Check if username is already taken (if provided)
      if (username && username !== req.user.username) {
        const existingUser = await User.findOne({ username })
        if (existingUser) {
          return res.status(400).json({ message: "Username already taken" })
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: {
            firstName,
            lastName,
            username,
            phone,
            bio,
            location,
            website,
            updatedAt: new Date(),
          },
        },
        { new: true, runValidators: true },
      ).select("-password -refreshTokens")

      res.json({ user: updatedUser })
    } catch (error) {
      
      if (error.code === 11000) {
        return res.status(400).json({ message: "Username already taken" })
      }
      res.status(500).json({ message: "Server error" })
    }
  },
)

router.post(
  "/email-change/request",
  [body("newEmail").isEmail().normalizeEmail(), body("password").optional().isString()],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const newEmail = String(req.body.newEmail || "").toLowerCase().trim()
      const password = String(req.body.password || "")
      const user = await User.findById(req.user._id).select("+password")
      if (!user) return res.status(404).json({ message: "User not found" })

      if (newEmail === String(user.email || "").toLowerCase()) {
        return res.status(400).json({ message: "New email must be different from current email" })
      }

      const existing = await User.findOne({ email: newEmail, _id: { $ne: user._id } }).select("_id")
      if (existing) {
        return res.status(400).json({ message: "Email already in use" })
      }

      // Require password verification only for password-based accounts
      if (user.password) {
        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return res.status(400).json({ message: "Current password is incorrect" })
      }

      const otp = generateOtp()
      user.pendingEmail = newEmail
      user.emailChangeOtpHash = await bcrypt.hash(otp, 12)
      user.emailChangeOtpExpiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS)
      user.emailChangeOtpSentAt = new Date()
      user.emailChangeResendCount = 0
      await user.save()

      await sendEmail({
        to: newEmail,
        subject: "Verify your new SajiloKhata email",
        html: `<!DOCTYPE html><html><body><p>Hi ${user.firstName},</p><p>Your email change verification code is:</p><h2 style="letter-spacing:2px;">${otp}</h2><p>This code expires in 10 minutes.</p></body></html>`,
        text: `Hi ${user.firstName},\n\nYour email change verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
      })

      return res.json({
        message: "OTP sent to your new email address",
        ...(process.env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
      })
    } catch (error) {
      return res.status(500).json({ message: "Server error" })
    }
  },
)

router.post("/email-change/resend", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+emailChangeOtpHash +emailChangeOtpExpiresAt")
    if (!user) return res.status(404).json({ message: "User not found" })
    if (!user.pendingEmail) {
      return res.status(400).json({ message: "No pending email change request found" })
    }

    const now = Date.now()
    const sentAt = user.emailChangeOtpSentAt ? new Date(user.emailChangeOtpSentAt).getTime() : 0
    if (sentAt && now - sentAt < EMAIL_OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ message: "Please wait before requesting another OTP" })
    }
    if ((user.emailChangeResendCount || 0) >= EMAIL_OTP_MAX_RESENDS) {
      return res.status(429).json({ message: "Too many OTP requests. Please try again later." })
    }

    const otp = generateOtp()
    user.emailChangeOtpHash = await bcrypt.hash(otp, 12)
    user.emailChangeOtpExpiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS)
    user.emailChangeOtpSentAt = new Date()
    user.emailChangeResendCount = (user.emailChangeResendCount || 0) + 1
    await user.save()

    await sendEmail({
      to: user.pendingEmail,
      subject: "Verify your new SajiloKhata email",
      html: `<!DOCTYPE html><html><body><p>Hi ${user.firstName},</p><p>Your email change verification code is:</p><h2 style="letter-spacing:2px;">${otp}</h2><p>This code expires in 10 minutes.</p></body></html>`,
      text: `Hi ${user.firstName},\n\nYour email change verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
    })

    return res.json({
      message: "OTP resent to your new email address",
      ...(process.env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
})

router.post(
  "/email-change/verify",
  [body("otp").isLength({ min: EMAIL_OTP_LENGTH, max: EMAIL_OTP_LENGTH })],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const otp = String(req.body.otp || "")
      const user = await User.findById(req.user._id).select("+emailChangeOtpHash +emailChangeOtpExpiresAt")
      if (!user) return res.status(404).json({ message: "User not found" })
      if (!user.pendingEmail || !user.emailChangeOtpHash || !user.emailChangeOtpExpiresAt) {
        return res.status(400).json({ message: "No pending email change request found" })
      }
      if (new Date(user.emailChangeOtpExpiresAt).getTime() < Date.now()) {
        return res.status(400).json({ message: "OTP expired. Please request a new one." })
      }

      const isValidOtp = await bcrypt.compare(otp, user.emailChangeOtpHash)
      if (!isValidOtp) {
        return res.status(400).json({ message: "Invalid OTP" })
      }

      const existing = await User.findOne({ email: user.pendingEmail, _id: { $ne: user._id } }).select("_id")
      if (existing) return res.status(400).json({ message: "Email already in use" })

      user.email = String(user.pendingEmail).toLowerCase()
      user.pendingEmail = null
      user.emailChangeOtpHash = null
      user.emailChangeOtpExpiresAt = null
      user.emailChangeOtpSentAt = null
      user.emailChangeResendCount = 0
      user.isEmailVerified = true
      await user.save()

      const safeUser = await User.findById(user._id).select("-password -refreshTokens")
      return res.json({ message: "Email updated successfully", user: safeUser })
    } catch (error) {
      return res.status(500).json({ message: "Server error" })
    }
  },
)

// Upload avatar
router.post("/avatar", upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`

    // Delete old avatar if exists
    const user = await User.findById(req.user._id)
    if (user.avatar && user.avatar.startsWith("/uploads/")) {
      const oldAvatarPath = path.join(__dirname, "..", user.avatar)
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath)
      }
    }

    // Update user with new avatar
    const updatedUser = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true }).select(
      "-password -refreshTokens",
    )

    res.json({
      message: "Avatar uploaded successfully",
      user: updatedUser,
      avatarUrl,
    })
  } catch (error) {
    
    res.status(500).json({ message: "Server error" })
  }
})

// Update user preferences
router.put(
  "/preferences",
  [
    body("language").optional().isIn(["en", "es", "fr", "de", "it", "pt", "nl", "ru", "zh", "ja", "ko", "hi", "ne"]),
    body("currency").optional().isLength({ min: 3, max: 3 }),
    body("timezone").optional().isLength({ min: 1, max: 50 }),
    body("dateFormat").optional().isIn(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]),
    body("theme").optional().isIn(["light", "dark", "system"]),
    body("autoSplit").optional().isBoolean(),
    body("defaultSplitType").optional().isIn(["equal", "percentage", "exact"]),
    body("notifications").optional().isObject(),
    body("privacy").optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { language, currency, timezone, dateFormat, theme, autoSplit, defaultSplitType, notifications, privacy } = req.body
      
      const updateData = {}
      
      if (language !== undefined) updateData["preferences.language"] = language
      if (currency !== undefined) updateData["preferences.currency"] = currency
      if (timezone !== undefined) updateData["preferences.timezone"] = timezone
      if (dateFormat !== undefined) updateData["preferences.dateFormat"] = dateFormat
      if (theme !== undefined) updateData["preferences.theme"] = theme
      if (autoSplit !== undefined) updateData["preferences.autoSplit"] = autoSplit
      if (defaultSplitType !== undefined) updateData["preferences.defaultSplitType"] = defaultSplitType
      if (notifications !== undefined) updateData["preferences.notifications"] = notifications
      if (privacy !== undefined && typeof privacy === "object" && privacy !== null) {
        if (privacy.profileVisibility !== undefined) {
          updateData["preferences.privacy.profileVisibility"] = privacy.profileVisibility
        }
      }
      
      updateData.updatedAt = new Date()

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        { new: true, runValidators: true },
      ).select("-password -refreshTokens")

      res.json({
        message: "Preferences updated successfully",
        user: updatedUser,
      })
    } catch (error) {
      
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Change password
router.put(
  "/password",
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Password confirmation does not match")
      }
      return true
    }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { currentPassword, newPassword } = req.body

      const user = await User.findById(req.user._id)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" })
      }

      // Hash new password
      const saltRounds = 12
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)

      // Update password
      await User.findByIdAndUpdate(req.user._id, {
        password: hashedNewPassword,
        updatedAt: new Date(),
      })

      res.json({ message: "Password updated successfully" })
    } catch (error) {
      
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get user's groups
router.get("/groups", async (req, res) => {
  try {
    const groups = await measure("users.groups.find", () =>
      Group.find({ "members.user": req.user._id })
        .select("name members createdBy updatedAt")
        .populate({ path: "members.user", select: "firstName lastName username avatar email" })
        .populate({ path: "createdBy", select: "firstName lastName username" })
        .sort({ updatedAt: -1 })
        .lean(),
    )

    const groupIds = groups.map((g) => g._id)
    const stats = await Expense.aggregate([
      {
        $match: {
          groupId: { $in: groupIds },
          status: { $ne: "deleted" },
        },
      },
      {
        $group: {
          _id: "$groupId",
          expenseCount: { $sum: 1 },
          totalSpentCents: { $sum: "$amountCents" },
        },
      },
    ])
    const statsMap = new Map(stats.map((s) => [String(s._id), s]))

    const groupsWithStats = groups.map((group) => {
      const groupStats = statsMap.get(String(group._id))
      return {
        ...group,
        stats: {
          expenseCount: groupStats?.expenseCount || 0,
          totalSpent: (groupStats?.totalSpentCents || 0) / 100,
        },
      }
    })

    res.json({ groups: groupsWithStats })
  } catch (error) {
    
    res.status(500).json({ message: "Server error" })
  }
})

// Get user's recent expenses
router.get("/expenses/recent", async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10, maxLimit: 200 })
    const expenseQuery = {
      $or: [{ paidBy: req.user._id }, { "splits.user": req.user._id }],
    }

    const [expenses, total] = await Promise.all([
      measure("users.expensesRecent.find", () =>
        Expense.find(expenseQuery)
          .select("description amountCents currency category date paidBy groupId splits status createdAt")
          .populate({ path: "paidBy", select: "firstName lastName username avatar" })
          .populate({ path: "groupId", select: "name" })
          .populate({ path: "splits.user", select: "firstName lastName username" })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean(),
      ),
      Expense.countDocuments(expenseQuery),
    ])

    res.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    
    res.status(500).json({ message: "Server error" })
  }
})

// Search users (for adding to groups)
router.get("/search/global", async (req, res) => {
  try {
    const { q } = req.query
    const { limit } = getPagination({ ...req.query, page: 1 }, { defaultLimit: 10, maxLimit: 25 })

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" })
    }

    const term = q.trim()
    const searchRegex = new RegExp(escapeRegex(term), "i")

    const [users, groups, expenses] = await Promise.all([
      User.find({
        _id: { $ne: req.user._id },
        isActive: true,
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { username: searchRegex },
          { email: searchRegex },
        ],
      })
        .select("firstName lastName username avatar email")
        .limit(limit)
        .lean(),
      Group.find({
        "members.user": req.user._id,
        isActive: true,
        name: searchRegex,
      })
        .select("name members")
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean(),
      Expense.find({
        status: "active",
        description: searchRegex,
        $or: [{ paidBy: req.user._id }, { "splits.user": req.user._id }],
      })
        .select("description amountCents currencyCode category date")
        .sort({ date: -1 })
        .limit(limit)
        .lean(),
    ])

    return res.json({ users, groups, expenses })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
})

// Splitwise-style debt summary for dashboard cards (across all groups).
router.get("/balance-summary", async (req, res) => {
  try {
    const currentUserId = String(req.user._id)
    const groups = await Group.find({
      "members.user": req.user._id,
      isActive: true,
    }).select("_id settlementsReconciledAt").lean()

    const groupIds = groups.map((g) => g._id)
    if (groupIds.length === 0) {
      return ok(res, {
        youAreOwedCents: 0,
        youOweCents: 0,
        totalBalanceCents: 0,
        youAreOwed: 0,
        youOwe: 0,
        totalBalance: 0,
      })
    }

    const legacyGroupIds = groups
      .filter((group) => !group.settlementsReconciledAt)
      .map((group) => group._id)
    if (legacyGroupIds.length > 0) {
      await reconcileConfirmedSettlementsForGroups(legacyGroupIds)
    }

    const Settlement = require("../models/Settlement")
    const [expenseEdges, confirmedSettlements] = await Promise.all([
      Expense.aggregate([
        { $match: { groupId: { $in: groupIds }, status: { $in: ["active", "settled"] } } },
        { $unwind: "$splits" },
        {
          $project: {
            groupId: "$groupId",
            fromUserId: "$splits.user",
            toUserId: "$paidBy",
            amountCents: { $ifNull: ["$splits.amountCents", 0] },
          },
        },
        {
          $match: {
            $expr: {
              $and: [
                { $gt: ["$amountCents", 0] },
                { $ne: ["$fromUserId", "$toUserId"] },
              ],
            },
          },
        },
        {
          $group: {
            _id: { groupId: "$groupId", fromUserId: "$fromUserId", toUserId: "$toUserId" },
            amountCents: { $sum: "$amountCents" },
          },
        },
      ]),
      Settlement.find({ groupId: { $in: groupIds }, status: "CONFIRMED" }).lean(),
    ])

    const netByGroup = new Map()
    const bumpNet = (gId, deltaCents) => {
      const key = String(gId)
      netByGroup.set(key, (netByGroup.get(key) || 0) + deltaCents)
    }

    for (const edge of expenseEdges) {
      const gId = String(edge?._id?.groupId || "")
      const fromId = String(edge?._id?.fromUserId || "")
      const toId = String(edge?._id?.toUserId || "")
      const cents = Math.round(Number(edge?.amountCents || 0))
      if (cents <= 0) continue

      if (toId === currentUserId) bumpNet(gId, cents)
      if (fromId === currentUserId) bumpNet(gId, -cents)
    }

    for (const s of confirmedSettlements) {
      const gId = String(s.groupId || "")
      const fromId = String(s.fromUserId || "")
      const toId = String(s.toUserId || "")
      const cents = Math.round(Number(s.amountCents || 0))
      if (cents <= 0) continue

      if (toId === currentUserId) bumpNet(gId, -cents)
      if (fromId === currentUserId) bumpNet(gId, cents)
    }

    let youAreOwedCents = 0
    let youOweCents = 0
    for (const value of netByGroup.values()) {
      if (value > 0) youAreOwedCents += value
      if (value < 0) youOweCents += Math.abs(value)
    }

    const totalBalanceCents = youAreOwedCents - youOweCents
    return ok(res, {
      youAreOwedCents,
      youOweCents,
      totalBalanceCents,
      youAreOwed: youAreOwedCents / 100,
      youOwe: youOweCents / 100,
      totalBalance: totalBalanceCents / 100,
    })
  } catch (error) {
    return fail(res, "Failed to calculate balance summary", 500)
  }
})

router.get("/search", async (req, res) => {
  try {
    const { q } = req.query
    const { limit } = getPagination({ ...req.query, page: 1 }, { defaultLimit: 10, maxLimit: 50 })

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" })
    }

    const searchRegex = new RegExp(escapeRegex(q.trim()), "i")

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        { isActive: true },
        {
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { username: searchRegex },
            { email: searchRegex },
          ],
        },
      ],
    })
      .select("firstName lastName username avatar email")
      .limit(limit)
      .lean()

    res.json({ users })
  } catch (error) {
    
    res.status(500).json({ message: "Server error" })
  }
})

// Get user balance summary
router.get("/balance", async (req, res) => {
  try {
    const userId = req.user._id

    const baseMatch = {
      groupId: { $ne: null },
      status: { $ne: "deleted" },
    }
    const [paidByGroup, shareByGroup] = await Promise.all([
      Expense.aggregate([
        {
          $match: {
            ...baseMatch,
            paidBy: userId,
          },
        },
        {
          $group: {
            _id: "$groupId",
            totalPaidCents: { $sum: { $ifNull: ["$amountCents", 0] } },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            ...baseMatch,
            "splits.user": userId,
          },
        },
        { $unwind: "$splits" },
        {
          $match: {
            "splits.user": userId,
          },
        },
        {
          $group: {
            _id: "$groupId",
            totalShareCents: { $sum: { $ifNull: ["$splits.amountCents", 0] } },
          },
        },
      ]),
    ])

    const groupedBalancesMap = new Map()
    for (const entry of paidByGroup) {
      groupedBalancesMap.set(String(entry._id), {
        _id: entry._id,
        totalPaidCents: Number(entry.totalPaidCents || 0),
        totalShareCents: 0,
      })
    }
    for (const entry of shareByGroup) {
      const key = String(entry._id)
      const current = groupedBalancesMap.get(key) || {
        _id: entry._id,
        totalPaidCents: 0,
        totalShareCents: 0,
      }
      current.totalShareCents += Number(entry.totalShareCents || 0)
      groupedBalancesMap.set(key, current)
    }
    const groupedBalances = Array.from(groupedBalancesMap.values())

    const groupIds = groupedBalances.map((entry) => entry._id)
    const groups = groupIds.length
      ? await Group.find({ _id: { $in: groupIds } }).select("name").lean()
      : []
    const groupNameById = new Map(groups.map((group) => [String(group._id), group.name]))

    let totalOwed = 0
    let totalOwing = 0
    const balanceByGroup = groupedBalances.map((entry) => {
      const totalPaid = Number(entry.totalPaidCents || 0) / 100
      const totalShare = Number(entry.totalShareCents || 0) / 100
      const balance = totalPaid - totalShare
      if (balance > 0) totalOwing += balance
      if (balance < 0) totalOwed += Math.abs(balance)
      return {
        groupName: groupNameById.get(String(entry._id)) || "Unknown group",
        balance,
        totalPaid,
        totalShare,
      }
    })

    res.json({
      summary: {
        totalOwed,
        totalOwing,
        netBalance: totalOwing - totalOwed,
      },
      balanceByGroup,
    })
  } catch (error) {
    
    res.status(500).json({ message: "Server error" })
  }
})

// Delete user account
router.delete(
  "/account",
  [
    body("password").notEmpty().withMessage("Password is required for account deletion"),
    body("confirmDelete").equals("DELETE").withMessage("Please type DELETE to confirm"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { password } = req.body

      const user = await User.findById(req.user._id)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid password" })
      }

      // Check if user has pending settlements
      const pendingExpenses = await Expense.exists({
        $or: [
          { paidBy: req.user._id, status: "active" },
          { "splits.user": req.user._id, status: "active" },
        ],
      })

      if (pendingExpenses) {
        return res.status(400).json({
          message: "Cannot delete account with pending expenses. Please settle all debts first.",
        })
      }

      // Soft delete user (mark as inactive)
      await User.findByIdAndUpdate(req.user._id, {
        isActive: false,
        email: `deleted_${Date.now()}_${user.email}`,
        username: `deleted_${Date.now()}_${user.username}`,
        deletedAt: new Date(),
      })

      res.json({ message: "Account deleted successfully" })
    } catch (error) {
      
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Admin routes
router.get("/admin/all", requireRole(["admin"]), async (req, res) => {
  try {
    const { search, status } = req.query
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 200 })

    const query = {}

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i")
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
      ]
    }

    if (status) {
      query.isActive = status === "active"
    }

    const users = await User.find(query)
      .select("-password -refreshTokens")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean()

    const total = await User.countDocuments(query)

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
