const Group = require("../models/Group")
const Expense = require("../models/Expense")
const Settlement = require("../models/Settlement")
const ReconciliationReport = require("../models/ReconciliationReport")

async function computeGroupNetImbalance(groupId) {
  const [expenseEdges] = await Promise.all([
    Expense.aggregate([
      { $match: { groupId, status: "active" } },
      { $unwind: "$splits" },
      {
        $project: {
          fromUserId: "$splits.user",
          toUserId: "$paidBy",
          amountCents: {
            $cond: [{ $eq: ["$splits.settled", true] }, 0, { $ifNull: ["$splits.amountCents", 0] }],
          },
        },
      },
      { $match: { $expr: { $and: [{ $gt: ["$amountCents", 0] }, { $ne: ["$fromUserId", "$toUserId"] }] } } },
    ]),
  ])

  const netByUser = new Map()
  const bump = (userId, delta) => {
    const key = String(userId)
    netByUser.set(key, (netByUser.get(key) || 0) + Number(delta || 0))
  }

  for (const edge of expenseEdges) {
    bump(edge.toUserId, edge.amountCents)
    bump(edge.fromUserId, -edge.amountCents)
  }

  let imbalanceCents = 0
  for (const value of netByUser.values()) imbalanceCents += value
  return { imbalanceCents, participants: netByUser.size }
}

async function runReconciliation() {
  const issues = []
  const groups = await Group.find({ isActive: true }).select("_id name").lean()

  const activeExpenses = await Expense.find({ status: "active" })
    .select("_id groupId amountCents paidBy splits")
    .lean()

  for (const expense of activeExpenses) {
    const splitSum = (expense.splits || []).reduce((sum, split) => sum + Number(split.amountCents || 0), 0)
    if (splitSum !== Number(expense.amountCents || 0)) {
      issues.push({
        type: "EXPENSE_SPLIT_MISMATCH",
        severity: "high",
        groupId: expense.groupId || null,
        expenseId: expense._id,
        message: "Expense split sum does not match total amount.",
        details: {
          amountCents: Number(expense.amountCents || 0),
          splitSumCents: splitSum,
        },
      })
    }

    if ((expense.splits || []).some((split) => Number(split.amountCents || 0) < 0)) {
      issues.push({
        type: "EXPENSE_NEGATIVE_SPLIT",
        severity: "high",
        groupId: expense.groupId || null,
        expenseId: expense._id,
        message: "Expense has negative split amount.",
        details: {},
      })
    }
  }

  const pendingSettlements = await Settlement.find({ status: "PENDING" })
    .select("_id groupId amountCents fromUserId toUserId")
    .lean()
  for (const settlement of pendingSettlements) {
    if (String(settlement.fromUserId) === String(settlement.toUserId)) {
      issues.push({
        type: "SETTLEMENT_SELF_DEBT",
        severity: "medium",
        groupId: settlement.groupId || null,
        settlementId: settlement._id,
        message: "Settlement has identical debtor and creditor.",
        details: {},
      })
    }
  }

  for (const group of groups) {
    const { imbalanceCents } = await computeGroupNetImbalance(group._id)
    if (imbalanceCents !== 0) {
      issues.push({
        type: "GROUP_NET_IMBALANCE",
        severity: "high",
        groupId: group._id,
        message: "Group net balance does not zero out.",
        details: { imbalanceCents },
      })
    }
  }

  const groupIdsWithIssues = new Set(issues.map((issue) => String(issue.groupId || "")).filter(Boolean))
  const report = await ReconciliationReport.create({
    runAt: new Date(),
    status: issues.length ? "warning" : "ok",
    summary: {
      groupsChecked: groups.length,
      groupsWithIssues: groupIdsWithIssues.size,
      issuesFound: issues.length,
    },
    issues,
  })

  return report
}

module.exports = { runReconciliation }
