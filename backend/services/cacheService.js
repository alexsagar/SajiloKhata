const crypto = require("crypto")
const Redis = require("ioredis")

const REDIS_URL = process.env.REDIS_URL
const CACHE_PREFIX = process.env.REDIS_CACHE_PREFIX || "splitwise:cache"
const CACHE_ENABLED = String(process.env.REDIS_CACHE_ENABLED || "true").toLowerCase() !== "false"

let redisClient = null
let cacheAvailable = false

function getRedisClient() {
  if (!CACHE_ENABLED || !REDIS_URL) return null
  if (redisClient) return redisClient

  try {
    redisClient = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    })

    redisClient.on("ready", () => {
      cacheAvailable = true
      console.log("[Cache] Connected to Redis")
    })

    redisClient.on("error", (err) => {
      cacheAvailable = false
      console.warn("[Cache] Redis error:", err.message)
    })
  } catch (err) {
    cacheAvailable = false
    console.warn("[Cache] Failed to initialize Redis:", err.message)
    redisClient = null
  }

  return redisClient
}

async function ensureCacheConnection() {
  const client = getRedisClient()
  if (!client) return false
  if (client.status === "ready") {
    cacheAvailable = true
    return true
  }
  if (client.status === "connecting" || client.status === "connect" || client.status === "reconnecting") {
    return false
  }
  try {
    await client.connect()
    cacheAvailable = true
    return true
  } catch (err) {
    cacheAvailable = false
    console.warn("[Cache] Could not connect to Redis:", err.message)
    return false
  }
}

function getDefaultTtlSeconds() {
  const raw = Number(process.env.REDIS_CACHE_DEFAULT_TTL || 120)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 120
}

function buildCacheKey(parts) {
  return `${CACHE_PREFIX}:${parts.filter(Boolean).join(":")}`
}

function hashKey(input) {
  return crypto.createHash("sha1").update(String(input)).digest("hex")
}

async function getJson(key) {
  if (!(await ensureCacheConnection())) return null
  try {
    const payload = await redisClient.get(key)
    if (!payload) return null
    return JSON.parse(payload)
  } catch (err) {
    return null
  }
}

async function setJson(key, value, ttlSeconds = getDefaultTtlSeconds()) {
  if (!(await ensureCacheConnection())) return false
  try {
    await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds)
    return true
  } catch (err) {
    return false
  }
}

function userCacheVersionKey(userId) {
  return buildCacheKey(["version", "user", String(userId)])
}

async function getUserCacheVersion(userId) {
  if (!userId) return "1"
  if (!(await ensureCacheConnection())) return "1"
  try {
    const key = userCacheVersionKey(userId)
    const version = await redisClient.get(key)
    if (version) return String(version)
    await redisClient.set(key, "1", "EX", 60 * 60 * 24 * 7)
    return "1"
  } catch (err) {
    return "1"
  }
}

async function bumpUsersCacheVersion(userIds = []) {
  const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean).map(String))]
  if (!ids.length) return
  if (!(await ensureCacheConnection())) return
  try {
    const pipeline = redisClient.pipeline()
    for (const id of ids) {
      const key = userCacheVersionKey(id)
      pipeline.incr(key)
      pipeline.expire(key, 60 * 60 * 24 * 7)
    }
    await pipeline.exec()
  } catch (err) {
    // Ignore cache invalidation failures to avoid breaking API writes
  }
}

function isCacheAvailable() {
  return cacheAvailable
}

module.exports = {
  buildCacheKey,
  hashKey,
  getJson,
  setJson,
  getUserCacheVersion,
  bumpUsersCacheVersion,
  getDefaultTtlSeconds,
  ensureCacheConnection,
  isCacheAvailable,
}
