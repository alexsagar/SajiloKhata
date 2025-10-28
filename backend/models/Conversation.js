const mongoose = require("mongoose")

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["group", "dm"], required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    lastMessageAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
)

conversationSchema.index({ participants: 1 })
conversationSchema.index({ groupId: 1 })
conversationSchema.index({ lastMessageAt: -1 })

module.exports = mongoose.model("Conversation", conversationSchema)


