const Notification = require("../models/Notification")
const User = require("../models/User")
const { sendEmail } = require("./emailService")

class NotificationService {
  static async createNotification({ userId, type, title, message, data = {} }) {
    try {
      const notification = new Notification({
        userId,
        type,
        title,
        message,
        data,
      })

      await notification.save()

      // Get user preferences
      const user = await User.findById(userId).select("preferences")

      // Send email notification if enabled
      if (user?.preferences?.notifications?.email) {
        await this.sendEmailNotification(user, notification)
      }

      return notification
    } catch (error) {
      
      throw error
    }
  }

  static async sendEmailNotification(user, notification) {
    try {
      const emailTemplates = {
        expense_added: {
          subject: "New Expense Added",
          template: "expenseAdded",
        },
        expense_updated: {
          subject: "Expense Updated",
          template: "expenseUpdated",
        },
        payment_reminder: {
          subject: "Payment Reminder",
          template: "paymentReminder",
        },
        group_invite: {
          subject: "Group Invitation",
          template: "groupInvite",
        },
        settlement_request: {
          subject: "Settlement Request",
          template: "settlementRequest",
        },
      }

      const template = emailTemplates[notification.type]
      if (!template) {
        
        return
      }

      await sendEmail({
        to: user.email,
        subject: template.subject,
        template: template.template,
        data: {
          firstName: user.firstName,
          title: notification.title,
          message: notification.message,
          ...notification.data,
        },
      })
    } catch (error) {
      
    }
  }

  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true, readAt: new Date() },
        { new: true },
      )

      return notification
    } catch (error) {
      
      throw error
    }
  }

  static async markAllAsRead(userId) {
    try {
      await Notification.updateMany({ userId, read: false }, { read: true, readAt: new Date() })
    } catch (error) {
      
      throw error
    }
  }

  static async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    try {
      const query = { userId }
      if (unreadOnly) {
        query.read = false
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await Notification.countDocuments(query)
      const unreadCount = await Notification.countDocuments({ userId, read: false })

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      }
    } catch (error) {
      
      throw error
    }
  }

  static async deleteNotification(notificationId, userId) {
    try {
      await Notification.findOneAndDelete({ _id: notificationId, userId })
    } catch (error) {
      
      throw error
    }
  }

  static async sendBulkNotifications(userIds, { type, title, message, data = {} }) {
    try {
      const notifications = userIds.map((userId) => ({
        userId,
        type,
        title,
        message,
        data,
      }))

      await Notification.insertMany(notifications)

      // Send email notifications for users who have email notifications enabled
      const users = await User.find({
        _id: { $in: userIds },
        "preferences.notifications.email": true,
      }).select("email firstName preferences")

      for (const user of users) {
        const notification = { type, title, message, data }
        await this.sendEmailNotification(user, notification)
      }
    } catch (error) {
      
      throw error
    }
  }

  // Cleanup old notifications (can be run as a cron job)
  static async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        read: true,
      })

      
      return result.deletedCount
    } catch (error) {
      
      throw error
    }
  }
}

// Export both the class and a convenience function
module.exports = NotificationService
module.exports.createNotification = NotificationService.createNotification.bind(NotificationService)