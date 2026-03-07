const AuditLog = require("../models/AuditLog")
const logger = require("./logger")

async function logAuditEvent({
  req,
  action,
  entityType,
  entityId = null,
  groupId = null,
  actorUserId = null,
  statusCode = null,
  metadata = {},
}) {
  try {
    const ip = req?.headers?.["x-forwarded-for"] || req?.ip || null
    const userAgent = req?.headers?.["user-agent"] || null
    const actor = actorUserId || req?.user?._id || null

    await AuditLog.create({
      requestId: req?.requestId || null,
      actorUserId: actor,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      groupId: groupId || null,
      method: req?.method,
      path: req?.originalUrl || req?.url,
      ip: Array.isArray(ip) ? ip[0] : String(ip || ""),
      userAgent,
      statusCode: statusCode || null,
      metadata,
    })
  } catch (error) {
    logger.warn({ err: error.message, action, entityType }, "audit_log_write_failed")
  }
}

module.exports = { logAuditEvent }
