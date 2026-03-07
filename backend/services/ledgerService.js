const LedgerEvent = require("../models/LedgerEvent")
const logger = require("./logger")

async function appendLedgerEvent({
  req = null,
  eventType,
  entityType,
  entityId,
  groupId,
  actorUserId = null,
  payload = {},
}) {
  try {
    await LedgerEvent.create({
      eventType,
      entityType,
      entityId: String(entityId),
      groupId,
      actorUserId: actorUserId || req?.user?._id || null,
      requestId: req?.requestId || null,
      payload,
    })
  } catch (error) {
    logger.warn(
      {
        err: error.message,
        eventType,
        entityType,
        entityId: String(entityId),
      },
      "ledger_event_append_failed",
    )
  }
}

module.exports = { appendLedgerEvent }
