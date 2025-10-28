const mongoose = require("mongoose")

const expenseSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: false, // Optional for personal expenses
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    // canonical money storage in cents
    amountCents: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    // deprecated: kept for backward compatibility/migrations only
    amount: {
      type: Number,
      required: false,
      min: 0,
      select: false,
    },
    currency: {
      type: String,
      default: "USD",
    },
    currencyCode: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    // Exchange rate to base currency at transaction time
    fxRate: {
      type: Number,
      default: 1.0,
      min: 0,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "food",
        "transportation",
        "accommodation",
        "entertainment",
        "utilities",
        "shopping",
        "healthcare",
        "other",
      ],
      default: "other",
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    splits: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        amountCents: {
          type: Number,
          required: true,
          min: 0,
        },
        // deprecated
        amount: {
          type: Number,
          required: false,
          min: 0,
          select: false,
        },
        percentage: {
          type: Number,
          min: 0,
          max: 100,
        },
        settled: {
          type: Boolean,
          default: false,
        },
        settledAt: {
          type: Date,
        },
      },
    ],
    splitType: {
      type: String,
      enum: ["equal", "percentage", "exact"],
      default: "equal",
    },
    receipt: {
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      url: String,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["active", "deleted", "archived", "settled", "disputed"],
      default: "active",
      index: true,
    },
    // Track when expense was fully settled
    settledAt: {
      type: Date,
      default: null,
    },
    // Track who created the expense
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Payment method used
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank_transfer", "digital_wallet", "other"],
      default: "other",
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for analytics queries
expenseSchema.index({ groupId: 1, date: -1 })
expenseSchema.index({ paidBy: 1, date: -1 })
expenseSchema.index({ "splits.user": 1, date: -1 })
expenseSchema.index({ category: 1, date: -1 })
expenseSchema.index({ status: 1, date: -1 })

// Virtual for checking if expense is fully settled
expenseSchema.virtual("isFullySettled").get(function () {
  return this.splits.every((split) => split.settled)
})

// Virtual for total amount in base currency
expenseSchema.virtual("amountBaseCents").get(function () {
  return Math.round(this.amountCents * (this.fxRate || 1.0))
})

// Method to mark expense as settled
expenseSchema.methods.markAsSettled = function() {
  this.status = "settled"
  this.settledAt = new Date()
  return this.save()
}

// Method to check if user participated in this expense
expenseSchema.methods.hasParticipant = function(userId) {
  return this.splits.some(split => split.user.toString() === userId.toString())
}

// Method to get user's share amount
expenseSchema.methods.getUserShare = function(userId) {
  const split = this.splits.find(s => s.user.toString() === userId.toString())
  return split ? split.amountCents : 0
}

// Pre-save middleware to update settledAt when all splits are settled
expenseSchema.pre('save', function(next) {
  if (this.splits.every(split => split.settled) && this.status !== 'settled') {
    this.status = 'settled'
    this.settledAt = new Date()
  }
  next()
})

module.exports = mongoose.model("Expense", expenseSchema)