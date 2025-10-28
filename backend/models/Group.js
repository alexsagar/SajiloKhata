const mongoose = require("mongoose")

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    category: {
      type: String,
      enum: ["travel", "food", "home", "entertainment", "utilities", "other"],
      default: "other",
    },
    inviteCode: {
      type: String,
      unique: true,
    },
    settings: {
      allowMemberInvites: {
        type: Boolean,
        default: true,
      },
      requireApprovalForExpenses: {
        type: Boolean,
        default: false,
      },
      defaultSplitType: {
        type: String,
        enum: ["equal", "percentage", "exact"],
        default: "equal",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
)

// Generate invite code before saving
groupSchema.pre("save", function (next) {
  if (!this.inviteCode) {
    this.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
  }
  next()
})

module.exports = mongoose.model("Group", groupSchema)