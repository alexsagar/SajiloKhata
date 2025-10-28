const multer = require("multer")
const path = require("path")
const fs = require("fs")

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Avatar upload configuration
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/avatars"
    ensureDirectoryExists(uploadPath)
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, req.user._id + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Only image files (JPEG, PNG, GIF) are allowed for avatars"))
    }
  },
})

// Receipt upload configuration
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/receipts"
    ensureDirectoryExists(uploadPath)
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, req.user._id + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const receiptUpload = multer({
  storage: receiptStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === "application/pdf"

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Only image files (JPEG, PNG) and PDF files are allowed for receipts"))
    }
  },
})

// General file upload configuration
const generalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/general"
    ensureDirectoryExists(uploadPath)
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, req.user._id + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const generalUpload = multer({
  storage: generalStorage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow most common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|csv/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())

    if (extname) {
      return cb(null, true)
    } else {
      cb(new Error("File type not allowed"))
    }
  },
})

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large" })
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ message: "Too many files" })
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: "Unexpected file field" })
    }
  }

  if (error.message) {
    return res.status(400).json({ message: error.message })
  }

  next(error)
}

module.exports = {
  avatarUpload,
  receiptUpload,
  generalUpload,
  handleMulterError,
}
