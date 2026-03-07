const mongoose = require("mongoose")

const ledgerEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        "EXPENSE_CREATED",
        "EXPENSE_UPDATED",
        "EXPENSE_DELETED",
        "EXPENSE_COMMENT_ADDED",
        "EXPENSE_COMMENT_DELETED",
        "SETTLEMENT_PLANNED",
        "SETTLEMENT_CONFIRMED",
      ],
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ["expense", "settlement", "group"],
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    requestId: {
      type: String,
      default: null,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
)

ledgerEventSchema.pre("save", function preventUpdate(next) {
  if (!this.isNew) {
    return next(new Error("Ledger events are immutable"))
  }
  next()
})

ledgerEventSchema.pre("findOneAndUpdate", function preventMutation(next) {
  return next(new Error("Ledger events are immutable"))
})

ledgerEventSchema.pre("updateOne", function preventMutation(next) {
  return next(new Error("Ledger events are immutable"))
})

ledgerEventSchema.pre("deleteOne", function preventDeletion(next) {
  return next(new Error("Ledger events cannot be deleted"))
})

ledgerEventSchema.index({ groupId: 1, createdAt: -1 })
ledgerEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })

module.exports = mongoose.model("LedgerEvent", ledgerEventSchema)
