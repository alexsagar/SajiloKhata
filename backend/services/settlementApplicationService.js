const Expense = require("../models/Expense")
const Settlement = require("../models/Settlement")

async function reconcileConfirmedSettlementsForGroup(groupId) {
  const settlements = await Settlement.find({
    groupId,
    status: "CONFIRMED",
  })
    .select("fromUserId toUserId amountCents confirmedAt createdAt")
    .sort({ confirmedAt: 1, createdAt: 1 })
    .lean()

  if (!settlements.length) return

  const expenses = await Expense.find({
    groupId,
    status: "active",
  }).sort({ date: 1, createdAt: 1 })

  const now = new Date()
  const changedExpenseIds = new Set()

  for (const settlement of settlements) {
    let remainingCents = Math.max(0, Number(settlement.amountCents || 0))
    if (remainingCents <= 0) continue

    for (const expense of expenses) {
      if (remainingCents <= 0) break
      if (String(expense.paidBy) !== String(settlement.toUserId)) continue

      let changed = false
      for (const split of expense.splits) {
        if (remainingCents <= 0) break
        if (String(split.user) !== String(settlement.fromUserId)) continue
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
        changedExpenseIds.add(String(expense._id))
      }
    }
  }

  if (changedExpenseIds.size > 0) {
    await Promise.all(
      expenses
        .filter((expense) => changedExpenseIds.has(String(expense._id)))
        .map((expense) => expense.save()),
    )
  }
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
