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
const { handleMulterError } = require("./middleware/upload")

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
})

app.use("/api", limiter)

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

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() })
})

// Socket.IO connection handling
io.use((socket, next) => {
  // Prefer cookie-based auth for socket handshake
  try {
    const cookieHeader = socket.handshake.headers.cookie || ''
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const [k, ...rest] = c.trim().split('=')
      return [k, decodeURIComponent(rest.join('='))]
    }))
    const token = cookies['accessToken']
    if (!token) return next(new Error('Authentication error'))
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.userId = decoded.userId
    return next()
  } catch (err) {
    return next(new Error('Authentication error'))
  }
})

io.on("connection", (socket) => {
  console.log(`User ${socket.userId} connected`)

  // Join user to their personal room
  socket.join(`user_${socket.userId}`)

  // Join user to their group rooms
  socket.on("join_groups", (groupIds) => {
    groupIds.forEach((groupId) => {
      socket.join(`group_${groupId}`)
    })
  })

  socket.on("disconnect", () => {
    console.log(`User ${socket.userId} disconnected`)
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
  console.log(`Server running on port ${PORT}`)
})

module.exports = { app, io }
