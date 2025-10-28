export interface User {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  avatar?: string
  preferences: {
    currency: string
    language: string
    theme: string
    timezone: string
    notifications: {
      email: boolean
      push: boolean
      sms: boolean
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
