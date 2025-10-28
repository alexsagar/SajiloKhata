const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "expense_added",
        "expense_updated",
        "expense_deleted",
        "payment_reminder",
        "settlement_request",
        "group_invite",
        "group_joined",
        "group_left",
        "member_added",
        "member_removed",
        "balance_update",
        "system_announcement",
      ],
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    actionUrl: {
      type: String,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, read: 1 })
notificationSchema.index({ type: 1 })
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Virtual for checking if notification is expired
notificationSchema.virtual("isExpired").get(function () {
  return this.expiresAt && this.expiresAt < new Date()
})

// Method to mark as read
notificationSchema.methods.markAsRead = function () {
  this.read = true
  this.readAt = new Date()
  return this.save()
}

module.exports = mongoose.model("Notification", notificationSchema)