const crypto = require("crypto")
const bcrypt = require("bcryptjs")

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString("hex")
}

// Generate invite code
const generateInviteCode = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword)
}

// Format currency
const formatCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount)
}

// Calculate split amounts
const calculateSplits = (totalAmount, splits, splitType = "equal") => {
  const result = []

  switch (splitType) {
    case "equal":
      const equalAmount = totalAmount / splits.length
      splits.forEach((split) => {
        result.push({
          userId: split.userId,
          amount: Number.parseFloat(equalAmount.toFixed(2)),
          percentage: Number.parseFloat((100 / splits.length).toFixed(2)),
        })
      })
      break

    case "exact":
      splits.forEach((split) => {
        result.push({
          userId: split.userId,
          amount: split.amount,
          percentage: Number.parseFloat(((split.amount / totalAmount) * 100).toFixed(2)),
        })
      })
      break

    case "percentage":
      splits.forEach((split) => {
        const amount = (totalAmount * split.percentage) / 100
        result.push({
          userId: split.userId,
          amount: Number.parseFloat(amount.toFixed(2)),
          percentage: split.percentage,
        })
      })
      break

    default:
      throw new Error("Invalid split type")
  }

  return result
}

// Validate split amounts
const validateSplits = (totalAmount, splits, splitType = "equal") => {
  if (!splits || splits.length === 0) {
    return { valid: false, error: "At least one split is required" }
  }

  switch (splitType) {
    case "equal":
      return { valid: true }

    case "exact":
      const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0)
      if (Math.abs(totalSplitAmount - totalAmount) > 0.01) {
        return {
          valid: false,
          error: `Split amounts (${totalSplitAmount}) don't match total amount (${totalAmount})`,
        }
      }
      return { valid: true }

    case "percentage":
      const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return {
          valid: false,
          error: `Split percentages (${totalPercentage}%) don't add up to 100%`,
        }
      }
      return { valid: true }

    default:
      return { valid: false, error: "Invalid split type" }
  }
}

// Sanitize filename
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, "_")
}

// Generate pagination info
const getPaginationInfo = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return {
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  }
}

// Format date for different locales
const formatDate = (date, locale = "en-US", options = {}) => {
  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }

  return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(new Date(date))
}

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Generate slug from string
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-")
}

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

// Remove sensitive data from user object
const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : user
  delete userObj.password
  delete userObj.refreshTokens
  delete userObj.__v
  return userObj
}

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distance in kilometers
  return distance
}

// Debounce function
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Throttle function
const throttle = (func, limit) => {
  let inThrottle
  return function () {
    const args = arguments
    
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

module.exports = {
  generateRandomString,
  generateInviteCode,
  hashPassword,
  comparePassword,
  formatCurrency,
  calculateSplits,
  validateSplits,
  sanitizeFilename,
  getPaginationInfo,
  formatDate,
  isValidEmail,
  generateSlug,
  deepClone,
  sanitizeUser,
  calculateDistance,
  debounce,
  throttle,
}
