export interface Notification {
  id: string
  userId: string
  type:
    | "EXPENSE_CREATED"
    | "EXPENSE_UPDATED"
    | "EXPENSE_DELETED"
    | "SPLIT_CHANGED_FOR_YOU"
    | "SETTLEMENT_REQUESTED"
    | "SETTLEMENT_RECORDED"
    | "SETTLEMENT_REMINDER"
    | "RECEIPT_OCR_COMPLETED"
    | "RECEIPT_OCR_FAILED"
    | "RECEIPT_AMOUNT_MISMATCH"
    | "EXPENSE_COMMENT_MENTION"
    | "payment_reminder"
    | "expense_added"
    | "expense_updated"
    | "settlement_request"
    | "group_invite"
  title: string
  message: string
  data?: any
  read: boolean
  isRead?: boolean
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
