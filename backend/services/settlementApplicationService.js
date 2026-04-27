const Expense = require("../models/Expense")
const Settlement = require("../models/Settlement")
const Group = require("../models/Group")

async function reconcileConfirmedSettlementsForGroup(groupId) {
  // 1. Fetch group
  const group = await Group.findById(groupId).select("_id")
  if (!group) return

  // 2. Fetch mathematical true balances (ignoring current settled flags)
  // We can't easily import groups.js router, so we inline the exact ledger query:
  const expenseResult = await Expense.aggregate([
    { $match: { groupId, status: { $in: ["active", "settled"] } } },
    { $unwind: "$splits" },
    {
      $project: {
        fromUserId: "$splits.user",
        toUserId: "$paidBy",
        amountCents: { $ifNull: ["$splits.amountCents", 0] },
      },
    },
    { $match: { $expr: { $and: [{ $gt: ["$amountCents", 0] }, { $ne: ["$fromUserId", "$toUserId"] }] } } },
    { $group: { _id: { fromUserId: "$fromUserId", toUserId: "$toUserId" }, amountCents: { $sum: "$amountCents" } } },
  ])

  const netByUser = new Map()
  const bump = (userId, delta) => {
    const key = String(userId)
    netByUser.set(key, (netByUser.get(key) || 0) + delta)
  }

  const actualEdges = Array.isArray(expenseResult) ? expenseResult : []

  for (const edge of actualEdges) {
    bump(edge._id.toUserId, edge.amountCents)
    bump(edge._id.fromUserId, -edge.amountCents)
  }

  // Loop confirmed settlements
  const confirmedSettlements = await Settlement.find({ groupId, status: "CONFIRMED" }).lean()
  for (const s of confirmedSettlements) {
    bump(s.fromUserId, s.amountCents)
    bump(s.toUserId, -s.amountCents)
  }

  // 3. Unallocated Debt Map (users who owe money)
  const unallocatedDebtMap = new Map()
  for (const [userId, netCents] of netByUser.entries()) {
    // If netCents < 0, they owe money. That's their unpaid debt.
    if (netCents < 0) {
      unallocatedDebtMap.set(String(userId), Math.abs(Math.round(netCents)))
    }
  }

  // 4. Fetch all expenses, NEWEST first (so newest stay Unpaid, oldest get Settled)
  const expenses = await Expense.find({
    groupId,
    status: { $in: ["active", "settled"] },
  }).sort({ date: -1, createdAt: -1 })

  const now = new Date()
  const changedExpenseIds = new Set()

  for (const expense of expenses) {
    let changed = false
    const paidBy = String(expense.paidBy)

    for (const split of expense.splits) {
      const splitUser = String(split.user)
      if (splitUser === paidBy) continue

      const dueCents = Number(split.amountCents || 0)
      if (dueCents <= 0) {
        if (!split.settled) {
          split.settled = true
          split.settledAt = now
          changed = true
        }
        continue
      }

      let remainingUnpaid = unallocatedDebtMap.get(splitUser) || 0
      
      if (remainingUnpaid > 0) {
        // Still has unpaid debt, this newer expense remains Unpaid
        if (split.settled) {
          split.settled = false
          split.settledAt = null
          changed = true
        }
        unallocatedDebtMap.set(splitUser, remainingUnpaid - dueCents)
      } else {
        // No more unpaid debt, this older expense is Settled
        if (!split.settled) {
          split.settled = true
          split.settledAt = now
          changed = true
        }
      }
    }

    if (changed) {
      const allSettled = expense.splits.every(s => s.settled || String(s.user) === paidBy || Number(s.amountCents || 0) <= 0)
      if (allSettled && expense.status !== "settled") {
        expense.status = "settled"
        expense.settledAt = now
      } else if (!allSettled && expense.status !== "active") {
        expense.status = "active"
        expense.settledAt = null
      }
      changedExpenseIds.add(String(expense._id))
    }
  }

  if (changedExpenseIds.size > 0) {
    await Promise.all(
      expenses
        .filter((expense) => changedExpenseIds.has(String(expense._id)))
        .map((expense) => expense.save()),
    )
  }

  await Group.updateOne(
    { _id: groupId },
    { $set: { settlementsReconciledAt: now } },
  )
}

async function reconcileConfirmedSettlementsForGroups(groupIds = []) {
  for (const groupId of groupIds) {
    // Sequential keeps application deterministic across historical records.
    // Group counts are typically small for dashboard paths.
    // eslint-disable-next-line no-await-in-loop
    await reconcileConfirmedSettlementsForGroup(groupId)
  }
}

module.exports = {
  reconcileConfirmedSettlementsForGroup,
  reconcileConfirmedSettlementsForGroups,
}
