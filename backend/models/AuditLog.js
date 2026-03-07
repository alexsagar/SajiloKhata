const mongoose = require("mongoose")

const auditLogSchema = new mongoose.Schema(
  {
    requestId: { type: String, index: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, default: null, index: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null, index: true },
    method: { type: String },
    path: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    statusCode: { type: Number },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

auditLogSchema.index({ actorUserId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })

module.exports = mongoose.model("AuditLog", auditLogSchema)
