const {
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
} = require('../utils/analytics-calcs')

describe('Analytics Calculations', () => {
  describe('toBaseCurrency', () => {
    test('converts amount to base currency correctly', () => {
      expect(toBaseCurrency(1000, 1.5)).toBe(1500) // 10.00 * 1.5 = 15.00
      expect(toBaseCurrency(2500, 0.8)).toBe(2000) // 25.00 * 0.8 = 20.00
      expect(toBaseCurrency(1000, 1.0)).toBe(1000) // 10.00 * 1.0 = 10.00
    })

    test('handles invalid inputs gracefully', () => {
      expect(toBaseCurrency(NaN, 1.0)).toBe(0)
      expect(toBaseCurrency(1000, NaN)).toBe(0)
      expect(toBaseCurrency(Infinity, 1.0)).toBe(0)
      expect(toBaseCurrency(1000, Infinity)).toBe(0)
    })

    test('defaults to 1.0 exchange rate', () => {
      expect(toBaseCurrency(1000)).toBe(1000)
      expect(toBaseCurrency(2500)).toBe(2500)
    })
  })

  describe('calculateEqualSplits', () => {
    test('splits amount equally among participants', () => {
      const splits = calculateEqualSplits(1000, 4)
      expect(splits).toEqual([250, 250, 250, 250])
      expect(splits.reduce((a, b) => a + b, 0)).toBe(1000)
    })

    test('handles remainder distribution correctly', () => {
      const splits = calculateEqualSplits(1001, 3)
      expect(splits).toEqual([334, 334, 333])
      expect(splits.reduce((a, b) => a + b, 0)).toBe(1001)
    })

    test('returns empty array for invalid participant count', () => {
      expect(calculateEqualSplits(1000, 0)).toEqual([])
      expect(calculateEqualSplits(1000, -1)).toEqual([])
    })
  })

  describe('calculateWeightedSplits', () => {
    test('splits amount based on weights', () => {
      const splits = calculateWeightedSplits(1000, [1, 2, 3])
      expect(splits).toEqual([167, 333, 500])
      expect(splits.reduce((a, b) => a + b, 0)).toBe(1000)
    })

    test('handles zero weights by falling back to equal splits', () => {
      const splits = calculateWeightedSplits(1000, [0, 0, 0])
      expect(splits).toEqual([334, 333, 333])
      expect(splits.reduce((a, b) => a + b, 0)).toBe(1000)
    })

    test('adjusts last split to ensure total matches', () => {
      const splits = calculateWeightedSplits(1001, [1, 1, 1])
      expect(splits.reduce((a, b) => a + b, 0)).toBe(1001)
    })
  })

  describe('calculatePercentageSplits', () => {
    test('splits amount based on percentages', () => {
      const splits = calculatePercentageSplits(1000, [25, 25, 50])
      expect(splits).toEqual([250, 250, 500])
      expect(splits.reduce((a, b) => a + b, 0)).toBe(1000)
    })

    test('adjusts last split to ensure total matches', () => {
      const splits = calculatePercentageSplits(1001, [33.33, 33.33, 33.34])
      expect(splits.reduce((a, b) => a + b, 0)).toBe(1001)
    })

    test('handles edge case percentages', () => {
      const splits = calculatePercentageSplits(1000, [100])
      expect(splits).toEqual([1000])
    })
  })

  describe('calculateMemberBalance', () => {
    const mockExpenses = [
      {
        paidBy: 'user1',
        amountCents: 1000,
        fxRate: 1.0,
        splits: [
          { user: 'user1', amountCents: 500 },
          { user: 'user2', amountCents: 500 }
        ]
      },
      {
        paidBy: 'user2',
        amountCents: 800,
        fxRate: 1.0,
        splits: [
          { user: 'user1', amountCents: 400 },
          { user: 'user2', amountCents: 400 }
        ]
      }
    ]

    test('calculates correct balance for payer', () => {
      const balance = calculateMemberBalance(mockExpenses, 'user1')
      expect(balance.totalPaid).toBe(500) // 1000 - 500
      expect(balance.totalOwed).toBe(400) // owes 400 on user2's expense
      expect(balance.netBalance).toBe(100) // 500 - 400
      expect(balance.isCreditor).toBe(true)
    })

    test('calculates correct balance for non-payer', () => {
      const balance = calculateMemberBalance(mockExpenses, 'user2')
      expect(balance.totalPaid).toBe(400) // 800 - 400
      expect(balance.totalOwed).toBe(500) // owes 500 on user1's expense
      expect(balance.netBalance).toBe(-100) // 400 - 500
      expect(balance.isDebtor).toBe(true)
    })
  })

  describe('calculateBalanceMatrix', () => {
    const mockExpenses = [
      {
        paidBy: 'user1',
        amountCents: 1000,
        fxRate: 1.0,
        splits: [
          { user: 'user1', amountCents: 500 },
          { user: 'user2', amountCents: 500 }
        ]
      }
    ]

    test('creates correct balance matrix', () => {
      const matrix = calculateBalanceMatrix(mockExpenses, ['user1', 'user2'])
      
      expect(matrix.user1.user1).toBe(0)
      expect(matrix.user1.user2).toBe(0)
      expect(matrix.user2.user1).toBe(500) // user2 owes user1 500
      expect(matrix.user2.user2).toBe(0)
    })

    test('handles empty expenses array', () => {
      const matrix = calculateBalanceMatrix([], ['user1', 'user2'])
      expect(matrix.user1.user1).toBe(0)
      expect(matrix.user1.user2).toBe(0)
      expect(matrix.user2.user1).toBe(0)
      expect(matrix.user2.user2).toBe(0)
    })
  })

  describe('calculateSettlementSuggestions', () => {
    test('generates settlement suggestions for simple case', () => {
      // In this matrix: user2 owes user1 100, user3 owes user1 50
      // So user1 is a creditor (net +150), user2 is debtor (net -100), user3 is debtor (net -50)
      const balanceMatrix = {
        user1: { user1: 0, user2: 0, user3: 0 },
        user2: { user1: 100, user2: 0, user3: 0 },
        user3: { user1: 50, user2: 0, user3: 0 }
      }
      
      const suggestions = calculateSettlementSuggestions(balanceMatrix)
      expect(suggestions).toHaveLength(2) // Should have 2 settlements
      
      // Check that user2 pays user1
      const user2Settlement = suggestions.find(s => s.from === 'user2' && s.to === 'user1')
      expect(user2Settlement).toBeDefined()
      expect(user2Settlement.amountCents).toBe(100)
      
      // Check that user3 pays user1
      const user3Settlement = suggestions.find(s => s.from === 'user3' && s.to === 'user1')
      expect(user3Settlement).toBeDefined()
      expect(user3Settlement.amountCents).toBe(50)
    })

    test('handles complex settlement scenarios', () => {
      const balanceMatrix = {
        user1: { user1: 0, user2: 0, user3: 0 },
        user2: { user1: 100, user2: 0, user3: 0 },
        user3: { user1: 50, user2: 0, user3: 0 }
      }
      
      const suggestions = calculateSettlementSuggestions(balanceMatrix)
      expect(suggestions.length).toBeGreaterThan(0)
      
      // Verify total settlement amount
      const totalSettled = suggestions.reduce((sum, s) => sum + s.amountCents, 0)
      expect(totalSettled).toBe(150)
    })
  })

  describe('calculateAgingBuckets', () => {
    const mockExpenses = [
      {
        status: 'active',
        amountCents: 1000,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        status: 'active',
        amountCents: 2000,
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
      },
      {
        status: 'settled',
        amountCents: 500,
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      }
    ]

    test('categorizes expenses into correct aging buckets', () => {
      const buckets = calculateAgingBuckets(mockExpenses)
      
      expect(buckets['0-7'].count).toBe(1)
      expect(buckets['0-7'].amountCents).toBe(1000)
      expect(buckets['8-30'].count).toBe(1)
      expect(buckets['8-30'].amountCents).toBe(2000)
      expect(buckets['31-60'].count).toBe(0)
      expect(buckets['60+'].count).toBe(0)
    })

    test('excludes settled expenses', () => {
      const buckets = calculateAgingBuckets(mockExpenses)
      const totalCount = Object.values(buckets).reduce((sum, bucket) => sum + bucket.count, 0)
      expect(totalCount).toBe(2) // Only active expenses
    })
  })

  describe('calculateSettlementVelocity', () => {
    const mockExpenses = [
      {
        status: 'settled',
        date: new Date('2024-01-01T00:00:00Z'),
        settledAt: new Date('2024-01-03T00:00:00Z')
      },
      {
        status: 'settled',
        date: new Date('2024-01-01T00:00:00Z'),
        settledAt: new Date('2024-01-05T00:00:00Z')
      }
    ]

    test('calculates settlement velocity metrics', () => {
      const velocity = calculateSettlementVelocity(mockExpenses, [])
      
      // 2024-01-03 - 2024-01-01 = 2 days
      // 2024-01-05 - 2024-01-01 = 4 days
      // Average: (2 + 4) / 2 = 3
      // Median: [2, 4] -> 4 (middle value)
      expect(velocity.averageDays).toBe(3)
      expect(velocity.medianDays).toBe(4)
      expect(velocity.fastestSettlement).toBe(2)
      expect(velocity.slowestSettlement).toBe(4)
    })

    test('handles empty expenses array', () => {
      const velocity = calculateSettlementVelocity([], [])
      expect(velocity.averageDays).toBe(0)
      expect(velocity.medianDays).toBe(0)
    })
  })

  describe('calculateFairnessMetrics', () => {
    const mockExpenses = [
      {
        paidBy: 'user1',
        amountCents: 1000,
        fxRate: 1.0,
        splits: [
          { user: 'user1', amountCents: 500 },
          { user: 'user2', amountCents: 500 }
        ]
      }
    ]

    test('calculates fairness metrics correctly', () => {
      const fairness = calculateFairnessMetrics(mockExpenses, 'user1')
      
      expect(fairness.totalPaid).toBe(500)
      expect(fairness.totalOwed).toBe(0)
      expect(fairness.netBalance).toBe(500)
      expect(fairness.fairnessScore).toBe(100) // 100% unfair since user1 paid everything
      expect(fairness.isFair).toBe(false)
    })
  })

  describe('calculateParticipationMetrics', () => {
    const mockExpenses = [
      {
        paidBy: 'user1',
        splits: [
          { user: 'user1' },
          { user: 'user2' }
        ]
      },
      {
        paidBy: 'user2',
        splits: [
          { user: 'user1' },
          { user: 'user2' }
        ]
      }
    ]

    test('calculates participation metrics correctly', () => {
      const participation = calculateParticipationMetrics(mockExpenses, ['user1', 'user2'])
      
      expect(participation.user1.totalExpenses).toBe(2)
      expect(participation.user1.expensesParticipated).toBe(2)
      expect(participation.user1.expensesPaid).toBe(1)
      expect(participation.user1.participationRate).toBe(100)
      
      expect(participation.user2.totalExpenses).toBe(2)
      expect(participation.user2.expensesParticipated).toBe(2)
      expect(participation.user2.expensesPaid).toBe(1)
      expect(participation.user2.participationRate).toBe(100)
    })
  })

  describe('Rounding invariants', () => {
    test('equal splits sum to total amount', () => {
      const total = 1001
      const participants = 3
      const splits = calculateEqualSplits(total, participants)
      expect(splits.reduce((a, b) => a + b, 0)).toBe(total)
    })

    test('weighted splits sum to total amount', () => {
      const total = 1001
      const weights = [1, 2, 3]
      const splits = calculateWeightedSplits(total, weights)
      expect(splits.reduce((a, b) => a + b, 0)).toBe(total)
    })

    test('percentage splits sum to total amount', () => {
      const total = 1001
      const percentages = [33.33, 33.33, 33.34]
      const splits = calculatePercentageSplits(total, percentages)
      expect(splits.reduce((a, b) => a + b, 0)).toBe(total)
    })
  })
})
