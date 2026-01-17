const mongoose = require("mongoose")

const settlementSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // canonical money storage in cents (paisa)
    amountCents: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED"],
      default: "PENDING",
      index: true,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

settlementSchema.index({ groupId: 1, status: 1, createdAt: -1 })
settlementSchema.index({ groupId: 1, fromUserId: 1, toUserId: 1, status: 1 })

module.exports = mongoose.model("Settlement", settlementSchema)
