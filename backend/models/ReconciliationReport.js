const mongoose = require("mongoose")

const reconciliationReportSchema = new mongoose.Schema(
  {
    runAt: { type: Date, default: Date.now, index: true },
    status: { type: String, enum: ["ok", "warning", "error"], required: true, index: true },
    summary: {
      groupsChecked: { type: Number, default: 0 },
      groupsWithIssues: { type: Number, default: 0 },
      issuesFound: { type: Number, default: 0 },
    },
    issues: [
      {
        type: { type: String, required: true },
        severity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
        expenseId: { type: mongoose.Schema.Types.ObjectId, ref: "Expense", default: null },
        settlementId: { type: mongoose.Schema.Types.ObjectId, ref: "Settlement", default: null },
        message: { type: String, required: true },
        details: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],
  },
  { timestamps: true },
)

reconciliationReportSchema.index({ runAt: -1 })

module.exports = mongoose.model("ReconciliationReport", reconciliationReportSchema)
