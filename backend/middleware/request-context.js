const crypto = require("crypto")
const logger = require("../services/logger")

function requestContext(req, res, next) {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID()
  req.requestId = String(requestId)
  req.log = logger.child({
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl || req.url,
  })

  res.setHeader("X-Request-Id", req.requestId)
  next()
}

module.exports = { requestContext }
