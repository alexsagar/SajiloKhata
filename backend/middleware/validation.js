const { body, param, query, validationResult } = require("express-validator")

// Common validation rules
const commonValidations = {
  id: param("id").isMongoId().withMessage("Invalid ID format"),
  email: body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  password: body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  name: body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name is required and must be less than 100 characters"),
  amount: body("amount").isFloat({ min: 0.01 }).withMessage("Amount must be a positive number"),
  currency: body("currency").isLength({ min: 3, max: 3 }).withMessage("Currency must be 3 characters"),
  description: body("description")
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Description is required and must be less than 500 characters"),
}

// User validation rules
const userValidations = {
  register: [
    body("firstName").trim().isLength({ min: 1, max: 50 }).withMessage("First name is required"),
    body("lastName").trim().isLength({ min: 1, max: 50 }).withMessage("Last name is required"),
    commonValidations.email,
    commonValidations.password,
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match")
      }
      return true
    }),
  ],
  login: [commonValidations.email, body("password").notEmpty().withMessage("Password is required")],
  updateProfile: [
    body("firstName").optional().trim().isLength({ min: 1, max: 50 }),
    body("lastName").optional().trim().isLength({ min: 1, max: 50 }),
    body("email").optional().isEmail().normalizeEmail(),
    body("phone").optional().isMobilePhone(),
    body("bio").optional().isLength({ max: 500 }),
  ],
  changePassword: [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Password confirmation does not match")
      }
      return true
    }),
  ],
}

// Group validation rules
const groupValidations = {
  create: [
    body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Group name is required"),
    body("description").optional().trim().isLength({ max: 500 }),
    body("currency").optional().isLength({ min: 3, max: 3 }),
  ],
  update: [
    commonValidations.id,
    body("name").optional().trim().isLength({ min: 1, max: 100 }),
    body("description").optional().trim().isLength({ max: 500 }),
  ],
  addMember: [commonValidations.id, body("email").isEmail().normalizeEmail().withMessage("Valid email is required")],
}

// Expense validation rules
const expenseValidations = {
  create: [
    commonValidations.description,
    commonValidations.amount,
    body("groupId").isMongoId().withMessage("Valid group ID is required"),
    body("category")
      .optional()
      .isIn(["food", "transport", "entertainment", "shopping", "bills", "travel", "health", "education", "other"])
      .withMessage("Invalid category"),
    body("splits").isArray({ min: 1 }).withMessage("At least one split is required"),
    body("splits.*.userId").isMongoId().withMessage("Valid user ID is required for splits"),
    body("splits.*.amount").isFloat({ min: 0 }).withMessage("Split amount must be non-negative"),
  ],
  update: [
    commonValidations.id,
    body("description").optional().trim().isLength({ min: 1, max: 500 }),
    body("amount").optional().isFloat({ min: 0.01 }),
    body("category")
      .optional()
      .isIn(["food", "transport", "entertainment", "shopping", "bills", "travel", "health", "education", "other"]),
  ],
}

// Notification validation rules
const notificationValidations = {
  create: [
    body("title").trim().isLength({ min: 1, max: 200 }).withMessage("Title is required"),
    body("message").trim().isLength({ min: 1, max: 1000 }).withMessage("Message is required"),
    body("type").isIn(["info", "warning", "success", "error"]).withMessage("Invalid notification type"),
    body("recipients").optional().isArray(),
  ],
  updatePreferences: [
    body("email").optional().isObject(),
    body("push").optional().isObject(),
    body("inApp").optional().isObject(),
  ],
}

// Query validation rules
const queryValidations = {
  pagination: [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  ],
  dateRange: [
    query("startDate").optional().isISO8601().withMessage("Start date must be valid ISO date"),
    query("endDate").optional().isISO8601().withMessage("End date must be valid ISO date"),
  ],
  search: [query("q").optional().trim().isLength({ min: 2 }).withMessage("Search query must be at least 2 characters")],
}

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    })
  }
  next()
}

// Custom validation functions
const customValidations = {
  isOwnerOrAdmin: (model) => {
    return async (req, res, next) => {
      try {
        const document = await model.findById(req.params.id)
        if (!document) {
          return res.status(404).json({ message: "Resource not found" })
        }

        const isOwner = document.createdBy?.toString() === req.user._id.toString()
        const isAdmin = req.user.role === "admin"

        if (!isOwner && !isAdmin) {
          return res.status(403).json({ message: "Access denied" })
        }

        req.document = document
        next()
      } catch (error) {
        res.status(500).json({ message: "Server error" })
      }
    }
  },

  isGroupMember: async (req, res, next) => {
    try {
      const Group = require("../models/Group")
      const group = await Group.findById(req.params.groupId || req.body.groupId)

      if (!group) {
        return res.status(404).json({ message: "Group not found" })
      }

      const isMember = group.members.some((member) => member.toString() === req.user._id.toString())

      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" })
      }

      req.group = group
      next()
    } catch (error) {
      res.status(500).json({ message: "Server error" })
    }
  },
}

module.exports = {
  userValidations,
  groupValidations,
  expenseValidations,
  notificationValidations,
  queryValidations,
  handleValidationErrors,
  customValidations,
  commonValidations,
}
