export interface User {
  id: string
  _id?: string
  email: string
  username: string
  firstName: string
  lastName: string
  avatar?: string
  preferences: {
    currency: string
    baseCurrency?: string
    language: string
    theme: string
    timezone: string
    dateFormat?: string
    autoSplit?: boolean
    defaultSplitType?: string
    notifications: {
      email: boolean
      push: boolean
      sms: boolean
    }
    privacy?: {
      profileVisibility?: string
    }
  }
  role: string
  isActive: boolean
  isPremium: boolean
  createdAt: string
  lastLoginAt: string
}

export interface UserProfile extends User {
  bio?: string
  phone?: string
  dateOfBirth?: string
  address?: {
    street: string
    city: string
    state: string
    country: string
    zipCode: string
  }
}
