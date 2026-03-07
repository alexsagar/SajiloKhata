const MerchantProfile = require("../models/MerchantProfile")

function normalizeMerchantName(name) {
  if (!name || typeof name !== "string") return null
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function learnAndResolveMerchant(userId, merchantRaw) {
  const normalized = normalizeMerchantName(merchantRaw)
  if (!normalized) return { canonicalName: null, normalizedName: null, profile: null }

  let profile = await MerchantProfile.findOne({ userId, normalizedName: normalized })
  if (!profile) {
    profile = await MerchantProfile.create({
      userId,
      canonicalName: merchantRaw.trim(),
      normalizedName: normalized,
      aliases: [merchantRaw.trim()],
      usageCount: 1,
      lastSeenAt: new Date(),
    })
  } else {
    const aliasSet = new Set([...(profile.aliases || []), merchantRaw.trim()])
    profile.aliases = Array.from(aliasSet).slice(0, 20)
    profile.usageCount = Number(profile.usageCount || 0) + 1
    profile.lastSeenAt = new Date()
    await profile.save()
  }

  return {
    canonicalName: profile.canonicalName,
    normalizedName: profile.normalizedName,
    profile,
  }
}

module.exports = {
  normalizeMerchantName,
  learnAndResolveMerchant,
}
