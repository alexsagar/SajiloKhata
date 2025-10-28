const { toCents, fromCents } = require('./money')

/**
 * Analytics calculation utilities
 * All functions are pure and work with integer cents for precision
 */

/**
 * Calculate base currency amount from transaction currency
 * @param {number} amountCents - Amount in transaction currency (cents)
 * @param {number} fxRate - Exchange rate to base currency
 * @returns {number} Amount in base currency (cents)
 */
function toBaseCurrency(amountCents, fxRate = 1.0) {
  if (!Number.isFinite(amountCents) || !Number.isFinite(fxRate)) return 0
  return Math.round(amountCents * fxRate)
}

/**
 * Calculate equal split amounts ensuring sum equals total
 * @param {number} totalCents - Total amount to split (cents)
 * @param {number} participantCount - Number of participants
 * @returns {Array<number>} Array of split amounts in cents
 */
function calculateEqualSplits(totalCents, participantCount) {
  if (participantCount <= 0) return []
  
  const baseShare = Math.floor(totalCents / participantCount)
  const remainder = totalCents % participantCount
  
  const splits = new Array(participantCount).fill(baseShare)
  
  // Distribute remainder to first participants
  for (let i = 0; i < remainder; i++) {
    splits[i] += 1
  }
  
  return splits
}

/**
 * Calculate weighted split amounts
 * @param {number} totalCents - Total amount to split (cents)
 * @param {Array<number>} weights - Array of weights for each participant
 * @returns {Array<number>} Array of split amounts in cents
 */
function calculateWeightedSplits(totalCents, weights) {
  if (weights.length === 0) return []
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  if (totalWeight === 0) return calculateEqualSplits(totalCents, weights.length)
  
  const splits = weights.map(weight => 
    Math.round((weight / totalWeight) * totalCents)
  )
  
  // Adjust to ensure sum equals total
  const sum = splits.reduce((a, b) => a + b, 0)
  const diff = totalCents - sum
  
  if (diff !== 0) {
    splits[splits.length - 1] += diff
  }
  
  return splits
}

/**
 * Calculate percentage-based splits
 * @param {number} totalCents - Total amount to split (cents)
 * @param {Array<number>} percentages - Array of percentages (0-100)
 * @returns {Array<number>} Array of split amounts in cents
 */
function calculatePercentageSplits(totalCents, percentages) {
  if (percentages.length === 0) return []
  
  const splits = percentages.map(percentage => 
    Math.round((percentage / 100) * totalCents)
  )
  
  // Adjust to ensure sum equals total
  const sum = splits.reduce((a, b) => a + b, 0)
  const diff = totalCents - sum
  
  if (diff !== 0) {
    splits[splits.length - 1] += diff
  }
  
  return splits
}

/**
 * Calculate member net balance for a group
 * @param {Array} expenses - Array of expense objects
 * @param {string} memberId - Member ID to calculate balance for
 * @param {string} baseCurrency - Base currency code
 * @returns {Object} Net balance information
 */
function calculateMemberBalance(expenses, memberId, baseCurrency = 'USD') {
  let totalPaid = 0
  let totalOwed = 0
  
  expenses.forEach(expense => {
    const isPayer = expense.paidBy.toString() === memberId
    const memberSplit = expense.splits.find(split => 
      split.user.toString() === memberId
    )
    
    if (!memberSplit) return
    
    const expenseBaseCents = toBaseCurrency(
      expense.amountCents, 
      expense.fxRate || 1.0
    )
    const splitBaseCents = toBaseCurrency(
      memberSplit.amountCents,
      expense.fxRate || 1.0
    )
    
    if (isPayer) {
      totalPaid += expenseBaseCents - splitBaseCents
    } else {
      totalOwed += splitBaseCents
    }
  })
  
  const netBalance = totalPaid - totalOwed
  
  return {
    totalPaid,
    totalOwed,
    netBalance,
    isCreditor: netBalance > 0,
    isDebtor: netBalance < 0
  }
}

/**
 * Calculate group balance matrix
 * @param {Array} expenses - Array of expense objects
 * @param {Array} memberIds - Array of member IDs
 * @param {string} baseCurrency - Base currency code
 * @returns {Object} Balance matrix with net amounts owed between members
 */
function calculateBalanceMatrix(expenses, memberIds, baseCurrency = 'USD') {
  const matrix = {}
  
  // Initialize matrix
  memberIds.forEach(fromId => {
    matrix[fromId] = {}
    memberIds.forEach(toId => {
      matrix[fromId][toId] = 0
    })
  })
  
  // Calculate balances from expenses
  expenses.forEach(expense => {
    const payerId = expense.paidBy.toString()
    const expenseBaseCents = toBaseCurrency(
      expense.amountCents,
      expense.fxRate || 1.0
    )
    
    expense.splits.forEach(split => {
      const splitterId = split.user.toString()
      if (splitterId === payerId) return
      
      const splitBaseCents = toBaseCurrency(
        split.amountCents,
        expense.fxRate || 1.0
      )
      
      // splitter owes payer
      matrix[splitterId][payerId] += splitBaseCents
    })
  })
  
  return matrix
}

/**
 * Calculate settlement suggestions (greedy algorithm)
 * @param {Object} balanceMatrix - Balance matrix from calculateBalanceMatrix
 * @returns {Array} Array of settlement suggestions
 */
function calculateSettlementSuggestions(balanceMatrix) {
  const suggestions = []
  const memberIds = Object.keys(balanceMatrix)
  
  // Calculate net balances for each member
  const netBalances = {}
  memberIds.forEach(memberId => {
    let net = 0
    memberIds.forEach(otherId => {
      // If memberId owes otherId money, it's negative for memberId
      net -= balanceMatrix[memberId][otherId]
      // If otherId owes memberId money, it's positive for memberId
      net += balanceMatrix[otherId][memberId]
    })
    netBalances[memberId] = net
  })
  
  // Sort by net balance (creditors first, then debtors)
  const sortedMembers = memberIds.sort((a, b) => netBalances[b] - netBalances[a])
  
  // Greedy settlement
  for (let i = 0; i < sortedMembers.length; i++) {
    const creditor = sortedMembers[i]
    if (netBalances[creditor] <= 0) continue
    
    for (let j = sortedMembers.length - 1; j > i; j--) {
      const debtor = sortedMembers[j]
      if (netBalances[debtor] >= 0) continue
      
      const settleAmount = Math.min(
        netBalances[creditor],
        Math.abs(netBalances[debtor])
      )
      
      if (settleAmount > 0) {
        suggestions.push({
          from: debtor,
          to: creditor,
          amountCents: settleAmount,
          description: `Settlement from ${debtor} to ${creditor}`
        })
        
        netBalances[creditor] -= settleAmount
        netBalances[debtor] += settleAmount
      }
    }
  }
  
  return suggestions
}

/**
 * Calculate aging buckets for unsettled balances
 * @param {Array} expenses - Array of expense objects
 * @param {Date} referenceDate - Reference date for aging calculation
 * @returns {Object} Aging buckets with counts and amounts
 */
function calculateAgingBuckets(expenses, referenceDate = new Date()) {
  const buckets = {
    '0-7': { count: 0, amountCents: 0 },
    '8-30': { count: 0, amountCents: 0 },
    '31-60': { count: 0, amountCents: 0 },
    '60+': { count: 0, amountCents: 0 }
  }
  
  expenses.forEach(expense => {
    if (expense.status === 'settled') return
    
    const daysDiff = Math.floor(
      (referenceDate - new Date(expense.date)) / (1000 * 60 * 60 * 24)
    )
    
    let bucket
    if (daysDiff <= 7) bucket = '0-7'
    else if (daysDiff <= 30) bucket = '8-30'
    else if (daysDiff <= 60) bucket = '31-60'
    else bucket = '60+'
    
    buckets[bucket].count++
    buckets[bucket].amountCents += expense.amountCents
  })
  
  return buckets
}

/**
 * Calculate settlement velocity metrics
 * @param {Array} expenses - Array of expense objects
 * @param {Array} settlements - Array of settlement objects
 * @returns {Object} Settlement velocity metrics
 */
function calculateSettlementVelocity(expenses, settlements) {
  const settlementTimes = []
  
  expenses.forEach(expense => {
    if (expense.status !== 'settled') return
    
    const expenseDate = new Date(expense.date)
    const settlementDate = new Date(expense.settledAt || expense.updatedAt)
    const daysToSettle = Math.floor(
      (settlementDate - expenseDate) / (1000 * 60 * 60 * 24)
    )
    
    settlementTimes.push(daysToSettle)
  })
  
  if (settlementTimes.length === 0) {
    return {
      averageDays: 0,
      medianDays: 0,
      fastestSettlement: 0,
      slowestSettlement: 0
    }
  }
  
  const sorted = settlementTimes.sort((a, b) => a - b)
  const average = settlementTimes.reduce((a, b) => a + b, 0) / settlementTimes.length
  const median = sorted[Math.floor(sorted.length / 2)]
  
  return {
    averageDays: Math.round(average * 100) / 100,
    medianDays: median,
    fastestSettlement: sorted[0],
    slowestSettlement: sorted[sorted.length - 1]
  }
}

/**
 * Calculate fairness metrics
 * @param {Array} expenses - Array of expense objects
 * @param {string} memberId - Member ID to calculate fairness for
 * @param {string} baseCurrency - Base currency code
 * @returns {Object} Fairness metrics
 */
function calculateFairnessMetrics(expenses, memberId, baseCurrency = 'USD') {
  let totalPaid = 0
  let totalOwed = 0
  let totalExpenses = 0
  
  expenses.forEach(expense => {
    const isPayer = expense.paidBy.toString() === memberId
    const memberSplit = expense.splits.find(split => 
      split.user.toString() === memberId
    )
    
    if (!memberSplit) return
    
    totalExpenses++
    const expenseBaseCents = toBaseCurrency(
      expense.amountCents,
      expense.fxRate || 1.0
    )
    const splitBaseCents = toBaseCurrency(
      memberSplit.amountCents,
      expense.fxRate || 1.0
    )
    
    if (isPayer) {
      totalPaid += expenseBaseCents - splitBaseCents
    } else {
      totalOwed += splitBaseCents
    }
  })
  
  const netBalance = totalPaid - totalOwed
  const fairnessScore = totalExpenses > 0 ? 
    Math.abs(netBalance) / (totalPaid + totalOwed) * 100 : 0
  
  return {
    totalPaid,
    totalOwed,
    netBalance,
    fairnessScore: Math.round(fairnessScore * 100) / 100,
    isFair: fairnessScore < 5 // Consider fair if within 5%
  }
}

/**
 * Calculate participation metrics
 * @param {Array} expenses - Array of expense objects
 * @param {Array} memberIds - Array of member IDs
 * @returns {Object} Participation metrics per member
 */
function calculateParticipationMetrics(expenses, memberIds) {
  const participation = {}
  
  memberIds.forEach(memberId => {
    participation[memberId] = {
      totalExpenses: 0,
      expensesPaid: 0,
      expensesParticipated: 0,
      participationRate: 0
    }
  })
  
  expenses.forEach(expense => {
    const isPayer = expense.paidBy.toString()
    const participants = expense.splits.map(split => split.user.toString())
    
    participants.forEach(participantId => {
      if (participation[participantId]) {
        participation[participantId].totalExpenses++
        participation[participantId].expensesParticipated++
        
        if (participantId === isPayer) {
          participation[participantId].expensesPaid++
        }
      }
    })
  })
  
  // Calculate participation rates
  memberIds.forEach(memberId => {
    if (participation[memberId].totalExpenses > 0) {
      participation[memberId].participationRate = Math.round(
        (participation[memberId].expensesParticipated / participation[memberId].totalExpenses) * 100
      )
    }
  })
  
  return participation
}

module.exports = {
  toBaseCurrency,
  calculateEqualSplits,
  calculateWeightedSplits,
  calculatePercentageSplits,
  calculateMemberBalance,
  calculateBalanceMatrix,
  calculateSettlementSuggestions,
  calculateAgingBuckets,
  calculateSettlementVelocity,
  calculateFairnessMetrics,
  calculateParticipationMetrics
}
