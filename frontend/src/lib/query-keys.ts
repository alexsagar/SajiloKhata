export const queryKeys = {
  notifications: {
    all: ["notifications"] as const,
    list: (page?: number) => ["notifications", page ?? "all"] as const,
    unreadCount: () => ["notifications", "unread-count"] as const,
    preferences: () => ["notifications", "preferences"] as const,
  },
  groups: {
    all: ["groups"] as const,
    list: (params?: Record<string, unknown>) => ["groups", "list", params ?? {}] as const,
    userGroups: () => ["user-groups"] as const,
    detail: (groupId: string) => ["group", groupId] as const,
    balance: (groupId: string) => ["group-balance", groupId] as const,
    settlements: (groupId: string) => ["group-settlements", groupId] as const,
    activity: (groupId: string) => ["group-activity", groupId] as const,
    expensesForBalance: (groupId: string) => ["group-expenses-for-balance", groupId] as const,
    expenses: (groupId: string) => ["group-expenses", groupId] as const,
    eligibleFriends: (groupId: string) => ["group-eligible-friends", groupId] as const,
    myBalance: () => ["my-balance"] as const,
  },
  expenses: {
    all: ["expenses"] as const,
    list: (params?: Record<string, unknown>) => ["expenses", params ?? {}] as const,
    recent: () => ["recent-expenses"] as const,
    summary: () => ["expense-summary"] as const,
    detail: (expenseId: string) => ["expense", expenseId] as const,
    comments: (expenseId: string) => ["expense-comments", expenseId] as const,
  },
  dashboard: {
    balanceSummary: () => ["user-balance-summary"] as const,
  },
  friends: {
    list: () => ["friends-list"] as const,
    invites: () => ["friend-invites"] as const,
  },
  calendar: {
    month: () => ["calendar-month"] as const,
    reminders: () => ["calendar-reminders"] as const,
  },
} as const

export type GroupScopedKey =
  | ReturnType<typeof queryKeys.groups.detail>
  | ReturnType<typeof queryKeys.groups.balance>
  | ReturnType<typeof queryKeys.groups.settlements>
  | ReturnType<typeof queryKeys.groups.activity>
  | ReturnType<typeof queryKeys.groups.expensesForBalance>
  | ReturnType<typeof queryKeys.groups.expenses>
