class ExpenseCalculator {
  constructor() {
    this.balances = new Map() // userId -> balance (positive = owed, negative = owes)
    this.expenses = []
  }

  addExpense({ paidBy, splits, amount }) {
    // Work in cents to avoid FP errors
    const totalCents = Math.round(Number(amount) * 100)
    const splitsInCents = splits.map((s) => ({ ...s, amount: Math.round(Number(s.amount) * 100) }))
    this.expenses.push({ paidBy, splits: splitsInCents, amount: totalCents })

    // Initialize balances if not exists
    if (!this.balances.has(paidBy)) {
      this.balances.set(paidBy, 0)
    }

    splits.forEach(split => {
      if (!this.balances.has(split.userId)) {
        this.balances.set(split.userId, 0)
      }
    })

    // Update balances
    // Person who paid gets positive balance (they are owed)
    this.balances.set(paidBy, this.balances.get(paidBy) + totalCents)

    // Each person in split gets negative balance (they owe)
    splitsInCents.forEach(split => {
      this.balances.set(split.userId, this.balances.get(split.userId) - split.amount)
    })
  }

  getGroupSummary() {
    const totalExpenses = this.expenses.reduce((sum, exp) => sum + exp.amount, 0)
    
    const summary = {
      totalExpenses: totalExpenses / 100, // Convert cents to dollars
      balances: {},
      minimumTransactions: []
    }

    // Convert balances map to object
    for (const [userId, balance] of this.balances) {
      const balanceInDollars = Math.round(balance) / 100
      summary.balances[userId] = {
        amount: balanceInDollars, // This is what the frontend expects
        balance: balanceInDollars,
        owes: balance < 0 ? Math.abs(balanceInDollars) : 0,
        owed: balance > 0 ? balanceInDollars : 0
      }
    }

    // Calculate minimum transactions to settle all debts
    summary.minimumTransactions = this.calculateMinimumTransactions()

    return summary
  }

  calculateMinimumTransactions() {
    const transactions = []
    const balancesCopy = new Map(this.balances)

    // Get all creditors (positive balance) and debtors (negative balance)
    const creditors = []
    const debtors = []

    for (const [userId, balance] of balancesCopy) {
      if (balance > 0) {
        creditors.push({ userId, amount: balance })
      } else if (balance < 0) {
        debtors.push({ userId, amount: Math.abs(balance) })
      }
    }

    // Sort by amount (largest first)
    creditors.sort((a, b) => b.amount - a.amount)
    debtors.sort((a, b) => b.amount - a.amount)

    let i = 0, j = 0
    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i]
      const debtor = debtors[j]

      const settleAmount = Math.min(creditor.amount, debtor.amount)

      if (settleAmount > 0) {
        transactions.push({
          from: debtor.userId,
          to: creditor.userId,
          amount: Math.round(settleAmount) / 100 // cents to dollars
        })

        creditor.amount -= settleAmount
        debtor.amount -= settleAmount
      }

      if (creditor.amount <= 0) i++
      if (debtor.amount <= 0) j++
    }

    return transactions
  }

  getUserBalance(userId) {
    return this.balances.get(userId) || 0
  }

  getTotalExpenses() {
    return this.expenses.reduce((sum, exp) => sum + exp.amount, 0)
  }
}

module.exports = { ExpenseCalculator }