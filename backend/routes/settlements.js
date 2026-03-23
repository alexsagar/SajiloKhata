const express = require("express")
const Settlement = require("../models/Settlement")
const Group = require("../models/Group")
const Expense = require("../models/Expense")
const Notification = require("../models/Notification")
const { ok, fail } = require("../utils/http")
const { bumpUsersCacheVersion } = require("../services/cacheService")
const notificationService = require("../services/notificationService")
const { logAuditEvent } = require("../services/auditService")
const { appendLedgerEvent } = require("../services/ledgerService")
const { emitServerStateSync } = require("../services/realtimeSyncService")

const router = express.Router()

router.patch("/:id/payment-link", async (req, res) => {
  try {
    const { paymentLink, paymentProvider } = req.body || {}
    const settlement = await Settlement.findById(req.params.id)
    if (!settlement) return fail(res, "Settlement not found", 404)

    const group = await Group.findOne({
      _id: settlement.groupId,
      "members.user": req.user._id,
      isActive: true,
    }).select("_id members")
    if (!group) return fail(res, "Not authorized", 403)

    const isCreditor = String(settlement.toUserId) === String(req.user._id)
    const isAdmin = (group.members || []).some(
      (m) => String(m.user) === String(req.user._id) && String(m.role) === "admin",
    )
    if (!isCreditor && !isAdmin) {
      return fail(res, "Only creditor or group admin can set payment link", 403)
    }

    if (paymentLink) {
      try {
        // Validate URL shape
        // eslint-disable-next-line no-new
        new URL(String(paymentLink))
      } catch (_) {
        return fail(res, "Invalid payment link URL", 400)
      }
    }

    settlement.paymentLink = paymentLink ? String(paymentLink).trim() : null
    settlement.paymentProvider = paymentProvider ? String(paymentProvider).trim() : null
    await settlement.save()
    await settlement.populate("fromUserId", "firstName lastName username avatar")
    await settlement.populate("toUserId", "firstName lastName username avatar")

    if (settlement.paymentLink) {
      await notificationService.createNotification(
        {
          userId: settlement.fromUserId._id,
          type: "SETTLEMENT_REQUESTED",
          title: "Payment link available",
          message: `${settlement.toUserId.firstName} added a payment link for your settlement.`,
          entityType: "settlement",
          entityId: settlement._id,
          groupId: settlement.groupId,
          data: {
            settlementId: String(settlement._id),
            groupId: String(settlement.groupId),
            paymentLink: settlement.paymentLink,
            paymentProvider: settlement.paymentProvider,
            actionUrl: settlement.paymentLink,
          },
          actionUrl: settlement.paymentLink,
        },
        { io: req.io },
      )
    }

    emitServerStateSync({
      io: req.io,
      groupId: settlement.groupId,
      userIds: [String(settlement.fromUserId?._id || settlement.fromUserId), String(settlement.toUserId?._id || settlement.toUserId)],
    })
    return ok(res, settlement)
  } catch (error) {
    return fail(res, error.message || "Server error", 500)
  }
})

router.post("/:id/remind", async (req, res) => {
  try {
    const settlement = await Settlement.findById(req.params.id)
    if (!settlement) return fail(res, "Settlement not found", 404)
    if (settlement.status !== "PENDING") return fail(res, "Settlement already confirmed", 400)

    const group = await Group.findOne({
      _id: settlement.groupId,
      "members.user": req.user._id,
      isActive: true,
    }).select("_id members name")
    if (!group) return fail(res, "Not authorized", 403)

    const isCreditor = String(settlement.toUserId) === String(req.user._id)
    const isAdmin = (group.members || []).some(
      (m) => String(m.user) === String(req.user._id) && String(m.role) === "admin",
    )
    if (!isCreditor && !isAdmin) return fail(res, "Only creditor or admin can send reminder", 403)

    const cooldownSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const existing = await Notification.findOne({
      userId: settlement.fromUserId,
      type: "SETTLEMENT_REMINDER",
      groupId: settlement.groupId,
      createdAt: { $gte: cooldownSince },
    }).lean()
    if (existing) return ok(res, { message: "Reminder already sent recently" })

    await settlement.populate("fromUserId", "firstName lastName")
    await settlement.populate("toUserId", "firstName lastName")

    await notificationService.createNotification(
      {
        userId: settlement.fromUserId._id,
        type: "SETTLEMENT_REMINDER",
        title: "Payment reminder",
        message: `${settlement.toUserId.firstName} reminded you about pending settlement of ${settlement.amountCents / 100}.`,
        entityType: "settlement",
        entityId: settlement._id,
        groupId: settlement.groupId,
        data: {
          settlementId: String(settlement._id),
          groupId: String(settlement.groupId),
          amountCents: settlement.amountCents,
          paymentLink: settlement.paymentLink || null,
          paymentProvider: settlement.paymentProvider || null,
          actionUrl: settlement.paymentLink || `/groups/${settlement.groupId}`,
        },
        actionUrl: settlement.paymentLink || `/groups/${settlement.groupId}`,
      },
      { io: req.io },
    )

    settlement.lastReminderAt = new Date()
    await settlement.save()
    emitServerStateSync({
      io: req.io,
      groupId: settlement.groupId,
      userIds: [String(settlement.fromUserId?._id || settlement.fromUserId), String(settlement.toUserId?._id || settlement.toUserId)],
      includeNotifications: true,
    })
    return ok(res, { message: "Reminder sent" })
  } catch (error) {
    return fail(res, error.message || "Server error", 500)
  }
})

router.post("/:id/remind-later", async (req, res) => {
  try {
    const settlement = await Settlement.findById(req.params.id)
    if (!settlement) return fail(res, "Settlement not found", 404)
    if (String(settlement.fromUserId) !== String(req.user._id)) {
      return fail(res, "Only payer can snooze reminder", 403)
    }

    const snoozeDays = Number(req.body?.days || 3)
    const snoozedUntil = new Date(Date.now() + Math.max(1, snoozeDays) * 24 * 60 * 60 * 1000)
    settlement.reminderSnoozedUntil = snoozedUntil
    await settlement.save()
    emitServerStateSync({
      io: req.io,
      groupId: settlement.groupId,
      userIds: [String(settlement.fromUserId), String(settlement.toUserId)],
      includeNotifications: true,
    })
    return ok(res, { message: "Reminder snoozed", reminderSnoozedUntil: snoozedUntil })
  } catch (error) {
    return fail(res, error.message || "Server error", 500)
  }
})

router.patch("/:id/confirm", async (req, res) => {
  try {
    const settlement = await Settlement.findById(req.params.id)
    if (!settlement) {
      return fail(res, "Settlement not found", 404)
    }

    const group = await Group.findOne({
      _id: settlement.groupId,
      "members.user": req.user._id,
      isActive: true,
    })

    if (!group) {
      return fail(res, "Not authorized", 403)
    }

    if (settlement.status === "CONFIRMED") {
      await settlement.populate("fromUserId", "firstName lastName username avatar")
      await settlement.populate("toUserId", "firstName lastName username avatar")
      return ok(res, settlement)
    }

    // Capture raw ObjectIds BEFORE populate turns them into full user objects.
    // String(populatedDoc) yields "[object Object]", breaking ID comparisons.
    const fromUserOid = settlement.fromUserId
    const toUserOid = settlement.toUserId

    await settlement.populate("fromUserId", "firstName lastName username avatar")
    await settlement.populate("toUserId", "firstName lastName username avatar")

    // Only the payer (fromUser) can confirm this payment.
    if (String(settlement.fromUserId?._id || settlement.fromUserId) !== String(req.user._id)) {
      const payerName = settlement.fromUserId?.firstName || settlement.fromUserId?.username || "the payer"
      return fail(res, `Only ${payerName} can mark this settlement as paid`, 403)
    }

    const amountCents = Math.max(0, Number(settlement.amountCents || 0))
    if (amountCents <= 0) {
      return fail(res, "Invalid settlement amount", 400)
    }

    settlement.status = "CONFIRMED"
    settlement.confirmedAt = new Date()
    await settlement.save()
    await Group.updateOne(
      { _id: settlement.groupId },
      { $unset: { settlementsReconciledAt: "" } },
    )

    // Apply this confirmed settlement against active expense splits so UI and balances
    // reflect paid amounts immediately without requiring aggregate-only reconciliation.
    let remainingCents = Math.max(0, Number(settlement.amountCents || 0))
    if (remainingCents > 0) {
      const settlementCutoff = settlement.confirmedAt || new Date()
      const relatedExpenses = await Expense.find({
        groupId: settlement.groupId,
        status: "active",
        paidBy: toUserOid,
        createdAt: { $lte: settlementCutoff },
        "splits.user": fromUserOid,
        "splits.settled": { $ne: true },
      }).sort({ date: 1, createdAt: 1 })

      const now = new Date()
      for (const expense of relatedExpenses) {
        if (remainingCents <= 0) break
        let changed = false

        for (const split of expense.splits) {
          if (remainingCents <= 0) break
          if (String(split.user) !== String(fromUserOid)) continue
          if (split.settled) continue

          const dueCents = Math.max(0, Number(split.amountCents || 0))
          if (dueCents <= 0) {
            split.settled = true
            split.settledAt = now
            changed = true
            continue
          }

          if (remainingCents >= dueCents) {
            split.settled = true
            split.settledAt = now
            remainingCents -= dueCents
            changed = true
          } else {
            // Partial settlement against this split: reduce outstanding amount.
            split.amountCents = dueCents - remainingCents
            if (typeof split.amount === "number") {
              split.amount = split.amountCents / 100
            }
            remainingCents = 0
            changed = true
          }
        }

        if (changed) {
          if (expense.splits.every((s) => s.settled)) {
            expense.status = "settled"
            expense.settledAt = now
          }
          await expense.save()
        }
      }
    }

    const actorId = String(req.user._id)
    const recipientIds = [
      String(settlement.fromUserId?._id || settlement.fromUserId),
      String(settlement.toUserId?._id || settlement.toUserId),
    ].filter((id, index, arr) => id !== actorId && arr.indexOf(id) === index)

    await notificationService.createManyNotifications(
      recipientIds,
      {
        type: "SETTLEMENT_RECORDED",
        title: "Settlement recorded",
        message: `${settlement.fromUserId.firstName} paid ${settlement.toUserId.firstName} ${settlement.amountCents / 100}.`,
        entityType: "settlement",
        entityId: settlement._id,
        groupId: settlement.groupId,
        data: {
          settlementId: String(settlement._id),
          groupId: String(settlement.groupId),
          fromUserId: String(settlement.fromUserId._id),
          toUserId: String(settlement.toUserId._id),
          amountCents: settlement.amountCents,
          paymentLink: settlement.paymentLink || null,
          paymentProvider: settlement.paymentProvider || null,
          actionUrl: `/groups/${settlement.groupId}`,
        },
        actionUrl: `/groups/${settlement.groupId}`,
      },
      { io: req.io },
    )

    await logAuditEvent({
      req,
      action: "SETTLEMENT_CONFIRMED",
      entityType: "settlement",
      entityId: settlement._id,
      groupId: settlement.groupId,
      statusCode: 200,
      metadata: {
        amountCents: settlement.amountCents,
        fromUserId: settlement.fromUserId._id,
        toUserId: settlement.toUserId._id,
      },
    })
    await appendLedgerEvent({
      req,
      eventType: "SETTLEMENT_CONFIRMED",
      entityType: "settlement",
      entityId: settlement._id,
      groupId: settlement.groupId,
      payload: {
        fromUserId: settlement.fromUserId._id,
        toUserId: settlement.toUserId._id,
        amountCents: settlement.amountCents,
        confirmedAt: settlement.confirmedAt,
      },
    })

    try {
      req.io?.to(`group_${settlement.groupId}`).emit("settlement:confirmed", {
        groupId: String(settlement.groupId),
        settlementId: String(settlement._id),
      })
    } catch {}

    await bumpUsersCacheVersion((group.members || []).map((m) => String(m.user)))
    emitServerStateSync({
      io: req.io,
      groupId: settlement.groupId,
      userIds: (group.members || []).map((member) => String(member.user)),
    })
    return ok(res, settlement)
  } catch (error) {
    return fail(res, error.message || "Server error", 500)
  }
})

module.exports = router
