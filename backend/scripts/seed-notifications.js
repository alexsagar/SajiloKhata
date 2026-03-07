#!/usr/bin/env node
require("dotenv").config()

const mongoose = require("mongoose")
const connectDB = require("../config/database")
const User = require("../models/User")
const Group = require("../models/Group")
const Expense = require("../models/Expense")
const Settlement = require("../models/Settlement")
const Receipt = require("../models/Receipt")
const Notification = require("../models/Notification")
const notificationService = require("../services/notificationService")

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    const next = argv[i + 1]
    if (!key.startsWith("--")) continue
    const name = key.slice(2)
    if (!next || next.startsWith("--")) {
      args[name] = true
      continue
    }
    args[name] = next
    i += 1
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const targetEmail = typeof args.email === "string" ? args.email.toLowerCase() : null
  const reset = Boolean(args.reset)

  await connectDB()

  const targetUser = targetEmail
    ? await User.findOne({ email: targetEmail }).select("_id email firstName lastName").lean()
    : await User.findOne({}).sort({ createdAt: 1 }).select("_id email firstName lastName").lean()

  if (!targetUser) {
    throw new Error("No users found. Create at least one user first.")
  }

  const otherUser =
    (await User.findOne({ _id: { $ne: targetUser._id } }).sort({ createdAt: 1 }).select("_id firstName lastName").lean()) ||
    targetUser

  if (reset) {
    await Notification.deleteMany({ userId: targetUser._id })
  }

  const stamp = Date.now()
  const group = await Group.create({
    name: `Notif QA ${stamp}`,
    description: "Notification seed scenario",
    createdBy: otherUser._id,
    members: [
      { user: targetUser._id, role: "member" },
      { user: otherUser._id, role: "admin" },
    ],
    category: "other",
  })

  const expense = await Expense.create({
    groupId: group._id,
    description: "Wifi Bill",
    amountCents: 150000,
    amount: 1500,
    currencyCode: "NPR",
    paidBy: otherUser._id,
    createdBy: otherUser._id,
    category: "utilities",
    date: new Date(),
    splits: [
      { user: targetUser._id, amountCents: 50000, amount: 500, settled: false },
      { user: otherUser._id, amountCents: 100000, amount: 1000, settled: false },
    ],
    splitType: "exact",
    status: "active",
  })

  const settlementPending = await Settlement.create({
    groupId: group._id,
    fromUserId: targetUser._id,
    toUserId: otherUser._id,
    amountCents: 50000,
    status: "PENDING",
  })

  const settlementConfirmed = await Settlement.create({
    groupId: group._id,
    fromUserId: otherUser._id,
    toUserId: targetUser._id,
    amountCents: 20000,
    status: "CONFIRMED",
    confirmedAt: new Date(),
  })

  const receipt = await Receipt.create({
    userId: targetUser._id,
    expenseId: expense._id,
    filename: `seed-${stamp}.png`,
    originalName: `seed-${stamp}.png`,
    filePath: `uploads/receipts/seed-${stamp}.png`,
    fileSize: 1024,
    mimeType: "image/png",
    ocrData: {
      processingStatus: "completed",
      parsedData: {
        merchant: "Demo Store",
        total: 7011,
        currency: "NPR",
      },
    },
  })

  const targetUserId = String(targetUser._id)
  await notificationService.createManyNotifications(
    [targetUserId],
    {
      type: "EXPENSE_CREATED",
      title: `New expense in ${group.name}`,
      message: `${otherUser.firstName} added "Wifi Bill" in ${group.name}. Total 1500.00, your share 500.00.`,
      entityType: "expense",
      entityId: expense._id,
      groupId: group._id,
      data: { groupId: String(group._id), expenseId: String(expense._id), actionUrl: `/expenses/${expense._id}` },
      actionUrl: `/expenses/${expense._id}`,
    },
    {},
  )

  await notificationService.createNotification({
    userId: targetUserId,
    type: "EXPENSE_UPDATED",
    title: `Expense updated in ${group.name}`,
    message: `Expense updated. New amount 1500.00.`,
    entityType: "expense",
    entityId: expense._id,
    groupId: group._id,
    data: { groupId: String(group._id), expenseId: String(expense._id), actionUrl: `/expenses/${expense._id}` },
    actionUrl: `/expenses/${expense._id}`,
  })

  await notificationService.createNotification({
    userId: targetUserId,
    type: "SPLIT_CHANGED_FOR_YOU",
    title: "Your share was updated",
    message: "Your share changed from 450.00 to 500.00.",
    entityType: "expense",
    entityId: expense._id,
    groupId: group._id,
    data: { groupId: String(group._id), expenseId: String(expense._id), actionUrl: `/expenses/${expense._id}` },
    actionUrl: `/expenses/${expense._id}`,
  })

  await notificationService.createNotification({
    userId: targetUserId,
    type: "EXPENSE_DELETED",
    title: `Expense removed in ${group.name}`,
    message: `"Old lunch split" was deleted.`,
    entityType: "expense",
    entityId: expense._id,
    groupId: group._id,
    data: { groupId: String(group._id), expenseId: String(expense._id), actionUrl: `/expenses/${expense._id}` },
    actionUrl: `/expenses/${expense._id}`,
  })

  await notificationService.createNotification({
    userId: targetUserId,
    type: "SETTLEMENT_REQUESTED",
    title: `Payment requested in ${group.name}`,
    message: `${otherUser.firstName} requested 500 from you.`,
    entityType: "settlement",
    entityId: settlementPending._id,
    groupId: group._id,
    data: { groupId: String(group._id), settlementId: String(settlementPending._id), actionUrl: `/groups/${group._id}` },
    actionUrl: `/groups/${group._id}`,
  })

  await notificationService.createNotification({
    userId: targetUserId,
    type: "SETTLEMENT_RECORDED",
    title: "Settlement recorded",
    message: `${otherUser.firstName} paid ${targetUser.firstName} 200.00.`,
    entityType: "settlement",
    entityId: settlementConfirmed._id,
    groupId: group._id,
    data: { groupId: String(group._id), settlementId: String(settlementConfirmed._id), actionUrl: `/groups/${group._id}` },
    actionUrl: `/groups/${group._id}`,
  })

  await notificationService.createNotification({
    userId: targetUserId,
    type: "SETTLEMENT_REMINDER",
    title: "Settlement reminder",
    message: `You still owe 500.00 in ${group.name}.`,
    entityType: "settlement",
    entityId: group._id,
    groupId: group._id,
    data: { groupId: String(group._id), actionUrl: `/groups/${group._id}` },
    actionUrl: `/groups/${group._id}`,
  })

  await notificationService.createNotification({
    userId: targetUserId,
    type: "RECEIPT_OCR_COMPLETED",
    title: "Receipt scan completed",
    message: "Receipt scanned successfully. Detected total 7011.",
    entityType: "receipt",
    entityId: receipt._id,
    data: { receiptId: String(receipt._id), expenseId: String(expense._id), actionUrl: `/expenses/${expense._id}/receipt` },
    actionUrl: `/expenses/${expense._id}/receipt`,
  })

  await notificationService.createNotification({
    userId: targetUserId,
    type: "RECEIPT_OCR_FAILED",
    title: "Receipt scan failed",
    message: "We could not process this receipt. Tap to retry.",
    entityType: "receipt",
    entityId: receipt._id,
    data: { receiptId: String(receipt._id), actionUrl: "/expenses" },
    actionUrl: "/expenses",
  })

  await notificationService.createNotification({
    userId: targetUserId,
    type: "RECEIPT_AMOUNT_MISMATCH",
    title: "Receipt amount mismatch",
    message: "Receipt total 7011 differs from expense 1500.",
    entityType: "receipt",
    entityId: receipt._id,
    data: {
      receiptId: String(receipt._id),
      expenseId: String(expense._id),
      receiptTotal: 7011,
      expenseTotal: 1500,
      tolerance: 10,
      actionUrl: `/expenses/${expense._id}/receipt`,
    },
    actionUrl: `/expenses/${expense._id}/receipt`,
  })

  const unreadCount = await Notification.countDocuments({ userId: targetUser._id, read: false })
  console.log(
    JSON.stringify(
      {
        ok: true,
        seededFor: targetUser.email,
        userId: String(targetUser._id),
        createdGroupId: String(group._id),
        createdExpenseId: String(expense._id),
        createdReceiptId: String(receipt._id),
        unreadCount,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((err) => {
    console.error("[seed-notifications] failed:", err.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {})
  })
