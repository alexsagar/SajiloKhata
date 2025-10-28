const mongoose = require("mongoose")

const friendInviteSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true, required: true },
    inviter: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    inviteeEmail: { type: String },
    status: { type: String, enum: ["pending", "accepted", "expired", "revoked"], default: "pending", index: true },
    expiresAt: { type: Date, index: true, required: true },
    metadata: {
      message: { type: String },
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model("FriendInvite", friendInviteSchema)


