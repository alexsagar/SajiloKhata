const mongoose = require("mongoose")

const merchantProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    canonicalName: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true, index: true },
    aliases: {
      type: [String],
      default: [],
    },
    usageCount: { type: Number, default: 1 },
    lastSeenAt: { type: Date, default: Date.now },
    inferredCategory: { type: String, default: null },
  },
  { timestamps: true },
)

merchantProfileSchema.index({ userId: 1, normalizedName: 1 }, { unique: true })

module.exports = mongoose.model("MerchantProfile", merchantProfileSchema)
