const Notification = require("../models/Notification")
const Settlement = require("../models/Settlement")
const Group = require("../models/Group")

const normalizeId = (value) => String(value)

class NotificationService {
  static async createNotification(payload, options = {}) {
    const {
      userId,
      type,
      title,
      message,
      data = {},
      entityType = "system",
      entityId = null,
      groupId = null,
      priority = "medium",
      actionUrl,
      expiresAt,
    } = payload

    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      entityType,
      entityId: entityId ? normalizeId(entityId) : null,
      groupId: groupId || null,
      priority,
      actionUrl,
      expiresAt,
    })

    if (options.io) {
      options.io.to(`user_${userId}`).emit("notification", {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
      })
    }

    return notification
  }

  static async createManyNotifications(recipients, payload, options = {}) {
    const uniqueRecipients = [...new Set((recipients || []).map((id) => normalizeId(id)))]
    if (!uniqueRecipients.length) return []

    const docs = uniqueRecipients.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data || {},
      entityType: payload.entityType || "system",
      entityId: payload.entityId ? normalizeId(payload.entityId) : null,
      groupId: payload.groupId || null,
      priority: payload.priority || "medium",
      actionUrl: payload.actionUrl,
      expiresAt: payload.expiresAt,
    }))

    const inserted = await Notification.insertMany(docs, { ordered: false })

    if (options.io) {
      for (const notification of inserted) {
        options.io.to(`user_${notification.userId}`).emit("notification", {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
        })
      }
    }

    return inserted
  }

  static async batchNotifications(recipients, config, options = {}) {
    const {
      groupId = null,
      type,
      timeWindowMs = 2 * 60 * 1000,
      batchKey,
      title,
      message,
      entityType = "group",
      entityId = null,
      data = {},
      buildContent,
    } = config

    const since = new Date(Date.now() - timeWindowMs)
    const uniqueRecipients = [...new Set((recipients || []).map((id) => normalizeId(id)))]
    const results = []

    for (const userId of uniqueRecipients) {
      const existing = await Notification.findOne({
        userId,
        type,
        groupId: groupId || null,
        "data.batchKey": batchKey || null,
        createdAt: { $gte: since },
      }).sort({ createdAt: -1 })

      if (!existing) {
        const created = await this.createNotification(
          {
            userId,
            type,
            title,
            message,
            entityType,
            entityId,
            groupId,
            data: {
              ...data,
              batchCount: 1,
              batchKey: batchKey || null,
            },
          },
          options,
        )
        results.push(created)
        continue
      }

      const nextCount = Math.max(1, Number(existing.data?.batchCount || 1) + 1)
      const nextContent = typeof buildContent === "function" ? buildContent(nextCount) : { title, message }

      existing.title = nextContent.title
      existing.message = nextContent.message
      existing.entityType = entityType
      existing.entityId = entityId ? normalizeId(entityId) : existing.entityId
      existing.groupId = groupId || existing.groupId
      existing.data = {
        ...(existing.data || {}),
        ...data,
        batchCount: nextCount,
        batchKey: batchKey || null,
      }
      await existing.save()

      if (options.io) {
        options.io.to(`user_${userId}`).emit("notification", {
          id: existing._id,
          title: existing.title,
          message: existing.message,
          type: existing.type,
        })
      }

      results.push(existing)
    }

    return results
  }

  static async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true, readAt: new Date() },
      { new: true },
    )
  }

  static async markAllAsRead(userId) {
    return Notification.updateMany({ userId, read: false }, { read: true, readAt: new Date() })
  }

  static async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const query = { userId: normalizeId(userId) }
    if (unreadOnly) query.read = false

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean()

    const total = await Notification.countDocuments(query)
    const unreadCount = await Notification.countDocuments({ userId: normalizeId(userId), read: false })

    return {
      notifications: notifications.map((n) => ({
        ...n,
        id: n._id,
        isRead: Boolean(n.read),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    }
  }

  static async getUnreadCount(userId) {
    return Notification.countDocuments({ userId: normalizeId(userId), read: false })
  }

  static async deleteNotification(notificationId, userId) {
    return Notification.findOneAndDelete({ _id: notificationId, userId })
  }

  static async createSettlementRemindersForUser(userId, options = {}) {
    const days = Number(options.days || process.env.SETTLEMENT_REMINDER_DAYS || 7)
    const cooldownDays = Number(options.cooldownDays || 7)
    const userObjectId = userId
    const overdueBefore = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const cooldownSince = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000)

    const overdueByGroup = await Settlement.aggregate([
      {
        $match: {
          fromUserId: userObjectId,
          status: "PENDING",
          createdAt: { $lte: overdueBefore },
          $or: [
            { reminderSnoozedUntil: null },
            { reminderSnoozedUntil: { $lte: new Date() } },
          ],
        },
      },
      {
        $group: {
          _id: "$groupId",
          totalOwedCents: { $sum: "$amountCents" },
          oldestCreatedAt: { $min: "$createdAt" },
          anyPaymentLink: { $max: "$paymentLink" },
        },
      },
      { $match: { totalOwedCents: { $gt: 0 } } },
    ])

    if (!overdueByGroup.length) return []

    const groupIds = overdueByGroup.map((r) => r._id)
    const groups = await Group.find({ _id: { $in: groupIds } }).select("_id name").lean()
    const groupNameById = new Map(groups.map((g) => [normalizeId(g._id), g.name]))
    const existingRecent = await Notification.find({
      userId: userObjectId,
      type: "SETTLEMENT_REMINDER",
      groupId: { $in: groupIds },
      createdAt: { $gte: cooldownSince },
    }).select("groupId").lean()
    const existingGroupIds = new Set(existingRecent.map((n) => normalizeId(n.groupId)))
    const notifications = []

    for (const row of overdueByGroup) {
      if (existingGroupIds.has(normalizeId(row._id))) continue

      const amount = Number(row.totalOwedCents || 0) / 100
      const groupName = groupNameById.get(normalizeId(row._id)) || "your group"

      const created = await this.createNotification(
        {
          userId: userObjectId,
          type: "SETTLEMENT_REMINDER",
          title: "Settlement reminder",
          message: `You still owe ${amount.toFixed(2)} in ${groupName}.`,
          entityType: "settlement",
          entityId: normalizeId(row._id),
          groupId: row._id,
          data: {
            totalOwedCents: row.totalOwedCents,
            oldestCreatedAt: row.oldestCreatedAt,
            paymentLink: row.anyPaymentLink || null,
            actionUrl: `/groups/${row._id}`,
          },
          actionUrl: `/groups/${row._id}`,
        },
        options,
      )
      notifications.push(created)
    }

    return notifications
  }
}

module.exports = NotificationService
module.exports.createNotification = NotificationService.createNotification.bind(NotificationService)
