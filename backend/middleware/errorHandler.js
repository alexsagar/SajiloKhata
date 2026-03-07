const logger = require("../services/logger")
const { captureException } = require("../services/sentry")

const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found"
    error = { message, statusCode: 404 }
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    const message = `${field} already exists`
    error = { message, statusCode: 400 }
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ")
    error = { message, statusCode: 400 }
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token"
    error = { message, statusCode: 401 }
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired"
    error = { message, statusCode: 401 }
  }

  const status = error.statusCode || 500
  req?.log?.error(
    {
      status,
      errName: err?.name,
      errMessage: err?.message,
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    },
    "request_failed",
  )
  if (status >= 500) {
    captureException(err, {
      requestId: req?.requestId,
      path: req?.originalUrl || req?.url,
      method: req?.method,
    })
  }

  logger.error(
    {
      requestId: req?.requestId,
      status,
      errName: err?.name,
      errMessage: err?.message,
    },
    "error_handler_response",
  )

  res.status(status).json({
    success: false,
    error: error.message || "Server Error",
    status,
    requestId: req?.requestId,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

module.exports = errorHandler
