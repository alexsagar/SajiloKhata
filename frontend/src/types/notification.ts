export interface Notification {
  id: string
  userId: string
  type: "expense_added" | "expense_updated" | "group_invite" | "settlement_request" | "payment_reminder"
  title: string
  message: string
  data?: any
  read: boolean
  createdAt: string
  expiresAt?: string
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  sms: boolean
  types: {
    expenseAdded: boolean
    expenseUpdated: boolean
    groupInvite: boolean
    settlementRequest: boolean
    paymentReminder: boolean
  }
}
