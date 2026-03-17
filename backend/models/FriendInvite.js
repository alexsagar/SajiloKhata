const mongoose = require("mongoose")

const friendInviteSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true, required: true },
    inviter: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    inviteeEmail: { type: String },
    status: { type: String, enum: ["pending", "accepted", "expired", "revoked", "declined"], default: "pending", index: true },
    expiresAt: { type: Date, index: true, required: true },
    metadata: {
      message: { type: String },
    },
  },
  { timestamps: true },
)

friendInviteSchema.index({ inviteeEmail: 1, status: 1, expiresAt: 1 })

module.exports = mongoose.model("FriendInvite", friendInviteSchema)


