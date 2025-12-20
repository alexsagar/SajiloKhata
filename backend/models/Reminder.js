const mongoose = require("mongoose")

const reminderSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    title: { 
      type: String, 
      required: true,
      trim: true
    },
    description: { 
      type: String,
      trim: true
    },
    dueDate: { 
      type: Date, 
      required: true 
    },
    amount: { 
      type: Number,
      min: 0
    },
    category: { 
      type: String,
      enum: [
        "food", "transportation", "accommodation", "entertainment", 
        "utilities", "shopping", "healthcare", "other"
      ],
      default: "other"
    },
    status: {
      type: String,
      enum: ["pending", "done", "cancelled"],
      default: "pending"
    },
    lastNotifiedOffsetDays: { 
      type: Number, 
      default: null 
    }
  },
  { 
    timestamps: true 
  }
)

// Index for efficient queries
reminderSchema.index({ user: 1, dueDate: 1 })
reminderSchema.index({ status: 1, dueDate: 1 })

module.exports = mongoose.model("Reminder", reminderSchema)
