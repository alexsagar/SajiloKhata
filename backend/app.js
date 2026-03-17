const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const compression = require("compression")
const cookieParser = require('cookie-parser')
const { setCsrfCookie, verifyCsrf } = require('./middleware/csrf')
const { createServer } = require("http")
const path = require("path")
const { Server } = require("socket.io")
require("dotenv").config()

const connectDB = require("./config/database")
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/users")
const adminRoutes = require("./routes/admin")

const friendsRoutes = require("./routes/friends")
const conversationsRoutes = require("./routes/conversations")
const groupRoutes = require("./routes/groups")
const expenseRoutes = require("./routes/expenses")
const notificationRoutes = require("./routes/notifications")
const receiptRoutes = require("./routes/receipts")
const errorHandler = require("./middleware/errorHandler")
const { authenticateToken } = require("./middleware/auth")
const calendarRoutes = require("./routes/calendar")
const analyticsRoutes = require("./routes/analytics")
const reminderRoutes = require("./routes/reminders")
const settlementRoutes = require("./routes/settlements")
const { handleMulterError } = require("./middleware/upload")
const { initReminderNotifications } = require("./jobs/reminderNotifications")
const { initReconciliationJob } = require("./jobs/reconciliationJob")
const { ensureCacheConnection } = require("./services/cacheService")
const logger = require("./services/logger")
const { initSentry, sentryErrorHandler, captureException } = require("./services/sentry")
const { requestContext } = require("./middleware/request-context")
const { buildRequestPerfSummary } = require("./utils/perf")

const app = express()
const SLOW_REQUEST_MS = Number(process.env.SLOW_REQUEST_MS || 500)
app.set("trust proxy", 1)
// Track online users by userId
const onlineUsers = new Set()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Connect to MongoDB
connectDB()
ensureCacheConnection().catch(() => { })

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
)

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests from this IP, please try again later." },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts, please try again later." },
  skip: (req) => req.path === "/oauth" || req.path.includes("callback"),
})

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.WRITE_RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many write requests, please try again later." },
  skip: (req) => req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS",
})

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.UPLOAD_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many uploads, please slow down." },
  skip: (req) => req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS",
})

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.MESSAGE_RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many messages sent. Please wait a moment." },
})

// app.use("/api/auth", authLimiter)
// app.use("/api", apiLimiter)
// app.use("/api", writeLimiter)
// app.use("/api/receipts", uploadLimiter)
// app.use("/api/expenses", uploadLimiter)
// app.use("/api/conversations/messages", messageLimiter)

initSentry(app)
app.use(requestContext)

// Body parsing middleware
// Request timing middleware
app.use((req, res, next) => {
  const start = Date.now()
  res.on("finish", () => {
    const duration = Date.now() - start
    const perf = buildRequestPerfSummary()
    const logPayload = {
      statusCode: res.statusCode,
      durationMs: duration,
      perf,
    }
    if (duration >= SLOW_REQUEST_MS || res.statusCode >= 500) {
      req.log?.warn(
        logPayload,
        "slow_or_error_request",
      )
    } else {
      req.log?.info(
        logPayload,
        "request_complete",
      )
    }
  })
  next()
})

app.use(express.json({ limit: process.env.API_BODY_LIMIT || "1mb" }))
app.use(express.urlencoded({ extended: true, limit: process.env.API_BODY_LIMIT || "1mb" }))
app.use(compression())
app.use(cookieParser())
app.use(setCsrfCookie)

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  immutable: true,
  maxAge: '7d',
  index: false,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
  }
}))

// Socket.IO middleware
app.use((req, res, next) => {
  req.io = io
  next()
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", authenticateToken, verifyCsrf, userRoutes)
app.use("/api/groups", authenticateToken, verifyCsrf, groupRoutes)
app.use("/api/expenses", authenticateToken, verifyCsrf, expenseRoutes)
app.use("/api/notifications", authenticateToken, verifyCsrf, notificationRoutes)
app.use("/api/receipts", authenticateToken, verifyCsrf, receiptRoutes)
app.use("/api/settlements", authenticateToken, verifyCsrf, settlementRoutes)
app.use("/api/admin", authenticateToken, verifyCsrf, adminRoutes)

app.use("/api/friends", authenticateToken, verifyCsrf, friendsRoutes)
app.use("/api/conversations", authenticateToken, verifyCsrf, conversationsRoutes)
app.use("/api/calendar", authenticateToken, verifyCsrf, calendarRoutes)
app.use("/api/analytics", authenticateToken, analyticsRoutes)
app.use("/api/reminders", authenticateToken, verifyCsrf, reminderRoutes)

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() })
})

// Socket.IO connection handling
io.use((socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie || ''



    const cookies = Object.fromEntries(cookieHeader.split(';').filter(Boolean).map(c => {
      const [k, ...rest] = c.trim().split('=')
      return [k, decodeURIComponent(rest.join('='))]
    }))

    // Prefer accessToken cookie, but fall back to auth token from client
    const authToken = socket.handshake.auth && socket.handshake.auth.token
    const token = cookies['accessToken'] || authToken


    if (!token) {

      return next(new Error('Authentication error'))
    }

    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Support multiple possible id fields from JWT payload
    const uid = decoded.userId || decoded.id || decoded._id
    if (!uid) return next(new Error('Authentication error'))

    socket.userId = String(uid)
    return next()
  } catch (err) {
    return next(new Error('Authentication error'))
  }
})

io.on("connection", (socket) => {


  // Join user to their personal room
  socket.join(`user_${socket.userId}`)

  // Join all active groups for this user so cross-user CRUD updates are
  // delivered everywhere, not only on pages that manually join a group room.
  ;(async () => {
    try {
      const Group = require("./models/Group")
      const groups = await Group.find({
        "members.user": socket.userId,
        isActive: true,
      }).select("_id").lean()

      for (const group of groups) {
        socket.join(`group_${group._id}`)
      }
    } catch (err) {
      console.error("[Socket] auto-join groups error:", err.message)
    }
  })()

  // Presence: add to online set and send current state to this socket
  try {
    onlineUsers.add(String(socket.userId))
    socket.emit("presence:state", { onlineUserIds: Array.from(onlineUsers) })
  } catch (err) { console.error("[Socket] presence:state emit error:", err.message) }

  // Join user to their group rooms
  socket.on("join_groups", (groupIds) => {
    groupIds.forEach((groupId) => {
      socket.join(`group_${groupId}`)
    })
  })

  // Allow client to join DM/group conversation rooms
  socket.on("join_conversations", (conversationIds = []) => {
    try {
      conversationIds.forEach((id) => socket.join(`conv_${id}`))
    } catch (err) { console.error("[Socket] join_conversations error:", err.message) }
  })

  // Explicitly request presence state
  socket.on("presence:request", () => {
    try {
      socket.emit("presence:state", { onlineUserIds: Array.from(onlineUsers) })
    } catch (err) { console.error("[Socket] presence:request error:", err.message) }
  })

  // Simple presence broadcast
  socket.broadcast.emit("presence:online", { userId: String(socket.userId) })

  // Typing indicators — broadcast to conversation room (exclude sender)
  socket.on("typing:start", (payload) => {
    try {
      const convId = payload?.conversationId
      if (convId) {
        socket.to(`conv_${convId}`).emit("typing:start", {
          conversationId: convId,
          userId: String(socket.userId),
        })
      }
    } catch (err) { console.error("[Socket] typing:start error:", err.message) }
  })

  socket.on("typing:stop", (payload) => {
    try {
      const convId = payload?.conversationId
      if (convId) {
        socket.to(`conv_${convId}`).emit("typing:stop", {
          conversationId: convId,
          userId: String(socket.userId),
        })
      }
    } catch (err) { console.error("[Socket] typing:stop error:", err.message) }
  })

  socket.on("disconnect", () => {

    try { onlineUsers.delete(String(socket.userId)) } catch (err) { console.error("[Socket] disconnect cleanup error:", err.message) }
    socket.broadcast.emit("presence:offline", { userId: String(socket.userId) })
  })
})

// Error handling middleware
app.use(sentryErrorHandler())
app.use(errorHandler)

// multer error handling
app.use(handleMulterError)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" })
})

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  initReminderNotifications(io)
  initReconciliationJob()
  logger.info({ port: PORT }, "server_started")
})

// Prevent crash on unhandled promise rejections (e.g. Redis connection failure)
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, "unhandled_rejection")
  captureException(reason instanceof Error ? reason : new Error(String(reason)), { type: "unhandledRejection" })
  // Application specific logging, throwing an error, or other logic here
})

module.exports = { app, io }
