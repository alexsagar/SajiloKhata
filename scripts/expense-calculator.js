// Advanced expense splitting and balance calculation utility
// Implements graph algorithms to minimize transactions

class ExpenseCalculator {
  constructor() {
    this.transactions = []
    this.balances = new Map()
  }

  // Add an expense to the calculator
  addExpense(expense) {
    const { paidBy, splits, amount } = expense

    // Initialize balances if not exists
    if (!this.balances.has(paidBy)) {
      this.balances.set(paidBy, 0)
    }

    splits.forEach((split) => {
      if (!this.balances.has(split.userId)) {
        this.balances.set(split.userId, 0)
      }
    })

    // Update balances
    // Person who paid gets positive balance
    this.balances.set(paidBy, this.balances.get(paidBy) + amount)

    // People who owe get negative balance
    splits.forEach((split) => {
      if (split.userId !== paidBy) {
        this.balances.set(split.userId, this.balances.get(split.userId) - split.amount)
      } else {
        // Subtract the payer's share from their positive balance
        this.balances.set(paidBy, this.balances.get(paidBy) - split.amount)
      }
    })
  }

  // Calculate minimum transactions using graph algorithm
  calculateMinimumTransactions() {
    const creditors = [] // People who are owed money
    const debtors = [] // People who owe money

    // Separate creditors and debtors
    for (const [userId, balance] of this.balances) {
      if (balance > 0.01) {
        // Small threshold for floating point precision
        creditors.push({ userId, amount: balance })
      } else if (balance < -0.01) {
        debtors.push({ userId, amount: Math.abs(balance) })
      }
    }

    const transactions = []
    let i = 0,
      j = 0

    // Greedy algorithm to minimize transactions
    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i]
      const debtor = debtors[j]

      const settleAmount = Math.min(creditor.amount, debtor.amount)

      if (settleAmount > 0.01) {
        transactions.push({
          from: debtor.userId,
          to: creditor.userId,
          amount: Math.round(settleAmount * 100) / 100, // Round to 2 decimal places
        })
      }

      creditor.amount -= settleAmount
      debtor.amount -= settleAmount

      if (creditor.amount < 0.01) i++
      if (debtor.amount < 0.01) j++
    }

    return transactions
  }

  // Get balance for a specific user
  getUserBalance(userId) {
    return this.balances.get(userId) || 0
  }

  // Get all balances
  getAllBalances() {
    const result = {}
    for (const [userId, balance] of this.balances) {
      result[userId] = Math.round(balance * 100) / 100
    }
    return result
  }

  // Reset calculator
  reset() {
    this.transactions = []
    this.balances.clear()
  }

  // Calculate group summary
  getGroupSummary() {
    const totalExpenses = Array.from(this.balances.values())
      .filter((balance) => balance > 0)
      .reduce((sum, balance) => sum + balance, 0)

    const transactions = this.calculateMinimumTransactions()

    return {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalTransactions: transactions.length,
      balances: this.getAllBalances(),
      minimumTransactions: transactions,
    }
  }

  // Calculate what each user owes or is owed
  calculateUserSummary(userId) {
    const balance = this.getUserBalance(userId)
    const transactions = this.calculateMinimumTransactions()

    const owes = transactions.filter((t) => t.from === userId).map((t) => ({ to: t.to, amount: t.amount }))

    const owedBy = transactions.filter((t) => t.to === userId).map((t) => ({ from: t.from, amount: t.amount }))

    return {
      balance: Math.round(balance * 100) / 100,
      owes,
      owedBy,
      totalOwed: owes.reduce((sum, debt) => sum + debt.amount, 0),
      totalOwedBy: owedBy.reduce((sum, credit) => sum + credit.amount, 0),
    }
  }
}

// Smart expense suggestions based on patterns
class ExpenseSuggestionEngine {
  constructor() {
    this.patterns = new Map()
  }

  // Analyze expense patterns
  analyzePatterns(expenses) {
    const patterns = {
      frequentCategories: {},
      commonAmounts: {},
      regularPayees: {},
      timePatterns: {},
      merchantPatterns: {},
    }

    expenses.forEach((expense) => {
      // Category frequency
      patterns.frequentCategories[expense.category] = (patterns.frequentCategories[expense.category] || 0) + 1

      // Common amounts (rounded to nearest 5)
      const roundedAmount = Math.round(expense.amount / 5) * 5
      patterns.commonAmounts[roundedAmount] = (patterns.commonAmounts[roundedAmount] || 0) + 1

      // Regular payees
      patterns.regularPayees[expense.paidBy] = (patterns.regularPayees[expense.paidBy] || 0) + 1

      // Time patterns (day of week)
      const dayOfWeek = new Date(expense.date).getDay()
      patterns.timePatterns[dayOfWeek] = (patterns.timePatterns[dayOfWeek] || 0) + 1

      // Merchant patterns (extract from description)
      const merchant = this.extractMerchant(expense.description)
      if (merchant) {
        patterns.merchantPatterns[merchant] = (patterns.merchantPatterns[merchant] || 0) + 1
      }
    })

    return patterns
  }

  // Extract merchant name from expense description
  extractMerchant(description) {
    // Common patterns for merchant extraction
    const patterns = [/at\s+([A-Za-z\s]+)/i, /from\s+([A-Za-z\s]+)/i, /^([A-Za-z\s]+)\s*-/, /^([A-Za-z\s]+)\s*\(/]

    for (const pattern of patterns) {
      const match = description.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return null
  }

  // Generate suggestions based on patterns
  generateSuggestions(currentExpense, patterns) {
    const suggestions = []

    // Category-based suggestions
    const topCategories = Object.entries(patterns.frequentCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category)

    if (!topCategories.includes(currentExpense.category)) {
      suggestions.push({
        type: "category",
        message: `Consider categorizing as: ${topCategories[0]}`,
        confidence: 0.7,
        action: "change_category",
        data: { suggestedCategory: topCategories[0] },
      })
    }

    // Amount-based suggestions
    const commonAmounts = Object.entries(patterns.commonAmounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([amount]) => Number.parseFloat(amount))

    const closestAmount = commonAmounts.find(
      (amount) => Math.abs(amount - currentExpense.amount) < currentExpense.amount * 0.1,
    )

    if (closestAmount && closestAmount !== currentExpense.amount) {
      suggestions.push({
        type: "amount",
        message: `Similar expenses are usually $${closestAmount}`,
        confidence: 0.6,
        action: "verify_amount",
        data: { suggestedAmount: closestAmount },
      })
    }

    // Merchant-based suggestions
    const merchant = this.extractMerchant(currentExpense.description)
    if (merchant && patterns.merchantPatterns[merchant]) {
      const frequency = patterns.merchantPatterns[merchant]
      if (frequency > 2) {
        suggestions.push({
          type: "merchant",
          message: `You've spent at ${merchant} ${frequency} times before`,
          confidence: 0.8,
          action: "add_tag",
          data: { suggestedTag: merchant.toLowerCase() },
        })
      }
    }

    // Time-based suggestions
    const currentDay = new Date(currentExpense.date).getDay()
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    if (patterns.timePatterns[currentDay] > 3) {
      suggestions.push({
        type: "timing",
        message: `You often have expenses on ${dayNames[currentDay]}s`,
        confidence: 0.5,
        action: "set_reminder",
        data: { dayOfWeek: currentDay },
      })
    }

    return suggestions
  }

  // Predict next expense based on patterns
  predictNextExpense(expenses, groupId) {
    const patterns = this.analyzePatterns(expenses)
    const recentExpenses = expenses
      .filter((e) => e.groupId === groupId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)

    if (recentExpenses.length === 0) return null

    // Find most common category
    const topCategory = Object.entries(patterns.frequentCategories).sort(([, a], [, b]) => b - a)[0]

    // Calculate average amount for that category
    const categoryExpenses = expenses.filter((e) => e.category === topCategory[0])
    const avgAmount = categoryExpenses.reduce((sum, e) => sum + e.amount, 0) / categoryExpenses.length

    // Find most frequent payer
    const topPayer = Object.entries(patterns.regularPayees).sort(([, a], [, b]) => b - a)[0]

    return {
      predictedCategory: topCategory[0],
      predictedAmount: Math.round(avgAmount * 100) / 100,
      predictedPayer: topPayer[0],
      confidence: Math.min(topCategory[1] / expenses.length, 0.9),
      basedOn: `${topCategory[1]} similar expenses`,
    }
  }
}

// Export for use in other modules
module.exports = { ExpenseCalculator, ExpenseSuggestionEngine }
