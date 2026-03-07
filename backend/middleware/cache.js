const { buildCacheKey, hashKey, getJson, setJson, getUserCacheVersion, getDefaultTtlSeconds } = require("../services/cacheService")

function cacheUserResponse(options = {}) {
  const ttl = Number(options.ttlSeconds) > 0 ? Number(options.ttlSeconds) : getDefaultTtlSeconds()
  const namespace = options.namespace || "api"

  return async function userCacheMiddleware(req, res, next) {
    if (req.method !== "GET") return next()
    if (!req.user?._id && !req.user?.id) return next()

    const userId = String(req.user._id || req.user.id)
    const version = await getUserCacheVersion(userId)
    const routeFingerprint = `${req.baseUrl || ""}${req.path || ""}|${req.originalUrl || req.url || ""}`
    const key = buildCacheKey([
      namespace,
      "user",
      userId,
      `v${version}`,
      hashKey(routeFingerprint),
    ])

    try {
      const cached = await getJson(key)
      if (cached !== null) {
        res.set("X-Cache", "HIT")
        return res.status(200).json(cached)
      }
    } catch (err) {
      // Continue without cache on read failures
    }

    const originalJson = res.json.bind(res)
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        setJson(key, body, ttl).catch(() => {})
        res.set("X-Cache", "MISS")
      }
      return originalJson(body)
    }

    return next()
  }
}

module.exports = { cacheUserResponse }
