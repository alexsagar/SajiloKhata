const express = require("express")
const { body, validationResult } = require("express-validator")
const Notification = require("../models/Notification")
const User = require("../models/User")
const notificationService = require("../services/notificationService")

const router = express.Router()

// Get user notifications
router.get("/", async (req, res) => {
  try {
    const pageNum = Number.parseInt(req.query.page) || 1
    const limitNum = Number.parseInt(req.query.limit) || 20
    const unreadOnly = String(req.query.unreadOnly) === "true"

    const result = await notificationService.getUserNotifications(req.user._id, {
      page: pageNum,
      limit: limitNum,
      unreadOnly,
    })

    // Ensure consistent response shape for frontend
    return res.json({
      notifications: result.notifications || [],
      unreadCount: result.unreadCount || 0,
      pagination: result.pagination || { page: pageNum, limit: limitNum, total: 0, pages: 0 },
    })
  } catch (error) {
    console.error("Get notifications error:", error)
    return res.status(500).json({ message: "Server error" })
  }
})

// Mark notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true, readAt: new Date() },
      { new: true },
    )

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" })
    }

    // Emit real-time update
    req.io.to(`user_${req.user._id}`).emit("notification_read", {
      notificationId: notification._id,
    })

    res.json({ notification })
  } catch (error) {
    console.error("Mark notification read error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Mark all notifications as read
router.put("/read-all", async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true, readAt: new Date() },
    )

    // Emit real-time update
    req.io.to(`user_${req.user._id}`).emit("notifications_read_all")

    res.json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    console.error("Mark all notifications read error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete notification
router.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" })
    }

    // Emit real-time update
    req.io.to(`user_${req.user._id}`).emit("notification_deleted", {
      notificationId: notification._id,
    })

    res.json({ message: "Notification deleted successfully" })
  } catch (error) {
    console.error("Delete notification error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete all read notifications
router.delete("/read", async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      userId: req.user._id,
      read: true,
    })

    // Emit real-time update
    req.io.to(`user_${req.user._id}`).emit("notifications_cleared")

    res.json({
      message: "Read notifications deleted successfully",
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    console.error("Delete read notifications error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get notification preferences
router.get("/preferences", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("preferences.notifications")

    const defaultPreferences = {
      email: {
        expenseAdded: true,
        expenseUpdated: true,
        expenseDeleted: true,
        paymentReceived: true,
        paymentReminder: true,
        groupInvite: true,
        weeklyDigest: true,
      },
      push: {
        expenseAdded: true,
        expenseUpdated: false,
        expenseDeleted: true,
        paymentReceived: true,
        paymentReminder: true,
        groupInvite: true,
        weeklyDigest: false,
      },
      inApp: {
        expenseAdded: true,
        expenseUpdated: true,
        expenseDeleted: true,
        paymentReceived: true,
        paymentReminder: true,
        groupInvite: true,
        weeklyDigest: true,
      },
    }

    const preferences = user.preferences?.notifications || defaultPreferences

    res.json({ preferences })
  } catch (error) {
    console.error("Get notification preferences error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update notification preferences
router.put(
  "/preferences",
  [body("preferences").isObject().withMessage("Preferences must be an object")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { preferences } = req.body

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: {
            "preferences.notifications": preferences,
            updatedAt: new Date(),
          },
        },
        { new: true },
      ).select("preferences.notifications")

      res.json({
        message: "Notification preferences updated successfully",
        preferences: updatedUser.preferences.notifications,
      })
    } catch (error) {
      console.error("Update notification preferences error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Create custom notification (admin only)
router.post(
  "/",
  [
    body("userId").isMongoId().withMessage("Valid user ID is required"),
    body("type").notEmpty().withMessage("Notification type is required"),
    body("title").notEmpty().withMessage("Title is required"),
    body("message").notEmpty().withMessage("Message is required"),
    body("priority").optional().isIn(["low", "medium", "high"]),
  ],
  async (req, res) => {
    try {
      // Check if user is admin or has permission to send notifications
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Insufficient permissions" })
      }

      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { userId, type, title, message, priority = "medium", data = {} } = req.body

      // Verify target user exists
      const targetUser = await User.findById(userId)
      if (!targetUser) {
        return res.status(404).json({ message: "Target user not found" })
      }

      // Create notification
      const notification = await notificationService.createNotification({
        userId,
        type,
        title,
        message,
        priority,
        data,
        createdBy: req.user._id,
      })

      res.status(201).json({
        message: "Notification created successfully",
        notification,
      })
    } catch (error) {
      console.error("Create notification error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Send bulk notifications (admin only)
router.post(
  "/bulk",
  [
    body("userIds").isArray().withMessage("User IDs must be an array"),
    body("type").notEmpty().withMessage("Notification type is required"),
    body("title").notEmpty().withMessage("Title is required"),
    body("message").notEmpty().withMessage("Message is required"),
  ],
  async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Insufficient permissions" })
      }

      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { userIds, type, title, message, priority = "medium", data = {} } = req.body

      // Verify all users exist
      const users = await User.find({ _id: { $in: userIds } })
      if (users.length !== userIds.length) {
        return res.status(400).json({ message: "Some user IDs are invalid" })
      }

      // Create notifications for all users
      const notifications = await Promise.all(
        userIds.map((userId) =>
          notificationService.createNotification({
            userId,
            type,
            title,
            message,
            priority,
            data,
            createdBy: req.user._id,
          }),
        ),
      )

      res.status(201).json({
        message: `${notifications.length} notifications created successfully`,
        count: notifications.length,
      })
    } catch (error) {
      console.error("Bulk notification error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get notification statistics (admin only)
router.get("/stats", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Insufficient permissions" })
    }

    const { days = 30 } = req.query
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Number.parseInt(days))

    const stats = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            type: "$type",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          count: { $sum: 1 },
          readCount: { $sum: { $cond: ["$read", 1, 0] } },
        },
      },
      {
        $group: {
          _id: "$_id.type",
          totalCount: { $sum: "$count" },
          totalReadCount: { $sum: "$readCount" },
          dailyStats: {
            $push: {
              date: "$_id.date",
              count: "$count",
              readCount: "$readCount",
            },
          },
        },
      },
    ])

    const totalNotifications = await Notification.countDocuments({
      createdAt: { $gte: startDate },
    })

    const totalRead = await Notification.countDocuments({
      createdAt: { $gte: startDate },
      read: true,
    })

    res.json({
      summary: {
        totalNotifications,
        totalRead,
        readRate: totalNotifications > 0 ? ((totalRead / totalNotifications) * 100).toFixed(2) : 0,
      },
      byType: stats,
      period: `${days} days`,
    })
  } catch (error) {
    console.error("Get notification stats error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
