const express = require("express")
const router = express.Router()
const { requireRole } = require("../middleware/auth")
const User = require("../models/User")
const Group = require("../models/Group")
const Expense = require("../models/Expense")
const Notification = require("../models/Notification")
const ReconciliationReport = require("../models/ReconciliationReport")
const { getPagination } = require("../utils/query")
const { runReconciliation } = require("../services/reconciliationService")

// Admin dashboard stats
router.get("/dashboard", requireRole(["admin"]), async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments(),
      Group.countDocuments(),
      Expense.countDocuments(),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      Expense.aggregate([{ $group: { _id: null, totalCents: { $sum: "$amountCents" } } }]),
    ])

    const [totalUsers, totalGroups, totalExpenses, newUsersThisMonth, totalAmount] = stats

    res.json({
      totalUsers,
      totalGroups,
      totalExpenses,
      newUsersThisMonth,
      totalAmount: (totalAmount[0]?.totalCents || 0) / 100,
      timestamp: new Date(),
    })
  } catch (error) {
    res.status(500).json({ message: "Error fetching dashboard stats", error: error.message })
  }
})

// Get all users with pagination
router.get("/users", requireRole(["admin"]), async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 200 })

    const users = await User.find().select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit).lean()

    const total = await User.countDocuments()

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
    res.status(500).json({ message: "Error fetching users", error: error.message })
  }
})

// Update user status
router.put("/users/:id/status", requireRole(["admin"]), async (req, res) => {
  try {
    const { isActive } = req.body
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true }).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({ message: "User status updated", user })
  } catch (error) {
    res.status(500).json({ message: "Error updating user status", error: error.message })
  }
})

// System health check
router.get("/health", requireRole(["admin"]), async (req, res) => {
  try {
    const dbStatus = await require("mongoose").connection.readyState
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    res.json({
      status: "healthy",
      database: dbStatus === 1 ? "connected" : "disconnected",
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
      },
      uptime: Math.round(uptime) + " seconds",
      timestamp: new Date(),
    })
  } catch (error) {
    res.status(500).json({ message: "Health check failed", error: error.message })
  }
})

router.post("/reconciliation/run", requireRole(["admin"]), async (req, res) => {
  try {
    const report = await runReconciliation()
    res.json({ message: "Reconciliation completed", data: report })
  } catch (error) {
    res.status(500).json({ message: "Failed to run reconciliation", error: error.message })
  }
})

router.get("/reconciliation/latest", requireRole(["admin"]), async (req, res) => {
  try {
    const report = await ReconciliationReport.findOne().sort({ runAt: -1 }).lean()
    if (!report) {
      return res.status(404).json({ message: "No reconciliation report found" })
    }
    res.json({ data: report })
  } catch (error) {
    res.status(500).json({ message: "Failed to load reconciliation report", error: error.message })
  }
})

module.exports = router
