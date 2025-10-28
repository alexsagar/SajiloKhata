const mongoose = require("mongoose")

const attachmentSchema = new mongoose.Schema(
  {
    url: String,
    type: String,
    size: Number,
  },
  { _id: false },
)

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", index: true, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    text: { type: String, default: "" },
    attachments: [attachmentSchema],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

messageSchema.index({ conversationId: 1, createdAt: -1 })

module.exports = mongoose.model("Message", messageSchema)


