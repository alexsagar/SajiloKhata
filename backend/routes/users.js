const express = require("express")
const bcrypt = require("bcryptjs")
const { body, validationResult } = require("express-validator")
const User = require("../models/User")
const Group = require("../models/Group")
const Expense = require("../models/Expense")
const { requireRole } = require("../middleware/auth")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

const router = express.Router()

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

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Get user statistics
    const groups = await Group.countDocuments({ "members.user": req.user._id })
    const expenses = await Expense.countDocuments({
      $or: [{ paidBy: req.user._id }, { "splits.user": req.user._id }],
    })

    const totalSpent = await Expense.aggregate([
      { $match: { paidBy: req.user._id } },
      { $group: { _id: null, total: { $sum: "$amountCents" } } },
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
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { language, currency, timezone, dateFormat, theme, autoSplit, defaultSplitType, notifications } = req.body
      
      const updateData = {}
      
      if (language !== undefined) updateData["preferences.language"] = language
      if (currency !== undefined) updateData["preferences.currency"] = currency
      if (timezone !== undefined) updateData["preferences.timezone"] = timezone
      if (dateFormat !== undefined) updateData["preferences.dateFormat"] = dateFormat
      if (theme !== undefined) updateData["preferences.theme"] = theme
      if (autoSplit !== undefined) updateData["preferences.autoSplit"] = autoSplit
      if (defaultSplitType !== undefined) updateData["preferences.defaultSplitType"] = defaultSplitType
      if (notifications !== undefined) updateData["preferences.notifications"] = notifications
      
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
    const groups = await Group.find({ "members.user": req.user._id })
      .select('name members createdBy updatedAt')
      .populate({ path: "members", select: "firstName lastName username avatar email" })
      .populate({ path: "createdBy", select: "firstName lastName username" })
      .sort({ updatedAt: -1 })
      .lean()

    // Get group statistics
    const groupsWithStats = await Promise.all(
      groups.map(async (group) => {
        const expenseCount = await Expense.countDocuments({ groupId: group._id })
        const totalSpent = await Expense.aggregate([
          { $match: { groupId: group._id } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])

        return {
          ...group.toObject(),
          stats: {
            expenseCount,
            totalSpent: totalSpent[0]?.total || 0,
          },
        }
      }),
    )

    res.json({ groups: groupsWithStats })
  } catch (error) {
    
    res.status(500).json({ message: "Server error" })
  }
})

// Get user's recent expenses
router.get("/expenses/recent", async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit) || 10
    const page = Number.parseInt(req.query.page) || 1
    const skip = (page - 1) * limit

    const expenses = await Expense.find({
      $or: [{ paidBy: req.user._id }, { "splits.user": req.user._id }],
    })
      .select('description amountCents currency category date paidBy groupId splits status createdAt')
      .populate({ path: "paidBy", select: "firstName lastName username avatar" })
      .populate({ path: "groupId", select: "name" })
      .populate({ path: "splits.user", select: "firstName lastName username" })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean()

    const total = await Expense.countDocuments({
      $or: [{ paidBy: req.user._id }, { "splits.user": req.user._id }],
    })

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
router.get("/search", async (req, res) => {
  try {
    const { q, limit = 10 } = req.query

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" })
    }

    const searchRegex = new RegExp(q.trim(), "i")

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
      .limit(Number.parseInt(limit))

    res.json({ users })
  } catch (error) {
    
    res.status(500).json({ message: "Server error" })
  }
})

// Get user balance summary
router.get("/balance", async (req, res) => {
  try {
    const userId = req.user._id

    // Get all expenses where user is involved
    const expenses = await Expense.find({
      $or: [{ paidBy: userId }, { "splits.user": userId }],
    }).populate("groupId", "name")

    let totalOwed = 0 // Amount user owes to others
    let totalOwing = 0 // Amount others owe to user
    const balanceByGroup = {}

    expenses.forEach((expense) => {
      const groupId = expense.groupId._id.toString()
      const groupName = expense.groupId.name

      if (!balanceByGroup[groupId]) {
        balanceByGroup[groupId] = {
          groupName,
          balance: 0,
          totalPaid: 0,
          totalShare: 0,
        }
      }

      // Amount user paid
      if (expense.paidBy.toString() === userId.toString()) {
        balanceByGroup[groupId].totalPaid += Math.round(Number(expense.amountCents || 0)) / 100
      }

      // User's share of the expense
      const userSplit = expense.splits.find((split) => (split.user || split.userId).toString() === userId.toString())
      if (userSplit) {
        balanceByGroup[groupId].totalShare += Math.round(Number(userSplit.amountCents || 0)) / 100
      }

      // Calculate balance for this group
      balanceByGroup[groupId].balance = balanceByGroup[groupId].totalPaid - balanceByGroup[groupId].totalShare
    })

    // Calculate totals
    Object.values(balanceByGroup).forEach((group) => {
      if (group.balance > 0) {
        totalOwing += group.balance // Others owe user
      } else {
        totalOwed += Math.abs(group.balance) // User owes others
      }
    })

    res.json({
      summary: {
        totalOwed,
        totalOwing,
        netBalance: totalOwing - totalOwed,
      },
      balanceByGroup: Object.values(balanceByGroup),
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
      const pendingExpenses = await Expense.find({
        $or: [
          { paidBy: req.user._id, status: "active" },
          { "splits.user": req.user._id, status: "active" },
        ],
      })

      if (pendingExpenses.length > 0) {
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
    const { page = 1, limit = 20, search, status } = req.query
    const skip = (page - 1) * limit

    const query = {}

    if (search) {
      const searchRegex = new RegExp(search, "i")
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
      .limit(Number.parseInt(limit))
      .skip(skip)

    const total = await User.countDocuments(query)

    res.json({
      users,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
