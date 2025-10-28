export interface Expense {
  id: string
  description: string
  amount: number
  currency: string
  category: string
  date: string
  groupId: string
  paidBy: string
  splitType: "equal" | "percentage" | "exact"
  splits: ExpenseSplit[]
  receipt?: {
    id: string
    url: string
    filename: string
  }
  notes?: string
  tags: string[]
  isSettled: boolean
  createdAt: string
  updatedAt: string
  paidByUser: {
    id: string
    firstName: string
    lastName: string
    avatar?: string
  }
  group: {
    id: string
    name: string
  }
}

export interface ExpenseSplit {
  id: string
  userId: string
  amount: number
  percentage?: number
  isSettled: boolean
  user: {
    id: string
    firstName: string
    lastName: string
    avatar?: string
  }
}

export interface RecurringExpense {
  id: string
  description: string
  amount: number
  currency: string
  category: string
  groupId: string
  paidBy: string
  splitType: "equal" | "percentage" | "exact"
  splits: ExpenseSplit[]
  frequency: "daily" | "weekly" | "monthly" | "yearly"
  startDate: string
  endDate?: string
  isActive: boolean
  nextDue: string
  createdAt: string
  updatedAt: string
}
