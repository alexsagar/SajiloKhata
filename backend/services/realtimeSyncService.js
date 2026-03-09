function emitServerStateSync({ io, groupId = null, userIds = [], expenseId = null, includeNotifications = true }) {
  if (!io) return

  const payload = {
    groupId: groupId ? String(groupId) : null,
    expenseId: expenseId ? String(expenseId) : null,
    includeNotifications,
  }

  if (payload.groupId) {
    io.to(`group_${payload.groupId}`).emit("server:sync", payload)
  }

  const uniqueUserIds = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean).map(String))]
  for (const userId of uniqueUserIds) {
    io.to(`user_${userId}`).emit("server:sync", payload)
  }
}

module.exports = { emitServerStateSync }
