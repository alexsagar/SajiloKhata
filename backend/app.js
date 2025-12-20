const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const compression = require("compression")
const cookieParser = require('cookie-parser')
const { setCsrfCookie, verifyCsrf } = require('./middleware/csrf')
const morgan = require("morgan")
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
const { handleMulterError } = require("./middleware/upload")
const { initReminderNotifications } = require("./jobs/reminderNotifications")

const app = express()
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

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
)

// // Rate limiting - general API limiter
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 500, // limit each IP to 500 requests per windowMs
//   message: "Too many requests from this IP, please try again later.",
// })

// More lenient rate limiter for auth routes (login, register, oauth)
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 50, // limit each IP to 50 auth requests per windowMs
//   message: "Too many authentication attempts, please try again later.",
//   skip: (req) => {
//     // Skip rate limiting for OAuth callback (it's already protected by OAuth flow)
//     return req.path === '/oauth' || req.path.includes('callback')
//   }
// })

// app.use("/api", limiter)
// app.use("/api/auth", authLimiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
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

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"))
}

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

  // Presence: add to online set and send current state to this socket
  try {
    onlineUsers.add(String(socket.userId))
    socket.emit("presence:state", { onlineUserIds: Array.from(onlineUsers) })
  } catch (_) { }

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
    } catch (_) { }
  })

  // Explicitly request presence state
  socket.on("presence:request", () => {
    try {
      socket.emit("presence:state", { onlineUserIds: Array.from(onlineUsers) })
    } catch (_) { }
  })

  // Simple presence broadcast
  socket.broadcast.emit("presence:online", { userId: String(socket.userId) })

  socket.on("disconnect", () => {
    
    try { onlineUsers.delete(String(socket.userId)) } catch (_) { }
    socket.broadcast.emit("presence:offline", { userId: String(socket.userId) })
  })
})

// Error handling middleware
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
})

module.exports = { app, io }
