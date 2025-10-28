export interface Group {
  id: string
  name: string
  description?: string
  avatar?: string
  inviteCode: string
  currency: string
  members: GroupMember[]
  createdBy: string
  createdAt: string
  updatedAt: string
  isActive: boolean
  settings: {
    allowMemberInvites: boolean
    requireApprovalForExpenses: boolean
    defaultSplitType: "equal" | "percentage" | "exact"
  }
}

export interface GroupMember {
  id: string
  userId: string
  groupId: string
  role: "admin" | "member"
  joinedAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatar?: string
  }
}

export interface GroupBalance {
  userId: string
  balance: number
  owes: Array<{
    userId: string
    amount: number
  }>
  owedBy: Array<{
    userId: string
    amount: number
  }>
}
