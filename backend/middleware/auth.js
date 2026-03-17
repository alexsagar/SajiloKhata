const jwt = require("jsonwebtoken")
const User = require("../models/User")

async function resolveLeanUser(query) {
  if (!query) return query
  const selected = typeof query.select === "function"
    ? query.select("firstName lastName username email avatar preferences isActive role")
    : query

  if (selected && typeof selected.lean === "function") {
    return selected.lean()
  }
  return selected
}

const authenticateToken = async (req, res, next) => {
  try {
    // Prefer cookie-based auth
    const token = req.cookies?.accessToken

    if (!token) {
      return res.status(401).json({ message: "Access token required" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await resolveLeanUser(User.findById(decoded.userId))

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid token or user not found" })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" })
    }
    return res.status(403).json({ message: "Invalid token" })
  }
}

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "15m" })
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" })
  return { accessToken, refreshToken }
}

function requireRole(roles) {
  return function (req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET)
}

module.exports = {
  authenticateToken,
  generateTokens,
  verifyRefreshToken,
  requireRole,
}
