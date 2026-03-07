const cron = require("node-cron")
const logger = require("../services/logger")
const { runReconciliation } = require("../services/reconciliationService")

let task = null

function initReconciliationJob() {
  if (task) return task
  task = cron.schedule("15 2 * * *", async () => {
    try {
      const report = await runReconciliation()
      logger.info(
        {
          reportId: String(report._id),
          issues: report.summary?.issuesFound || 0,
        },
        "reconciliation_run_completed",
      )
    } catch (error) {
      logger.error({ err: error.message }, "reconciliation_run_failed")
    }
  })
  return task
}

module.exports = { initReconciliationJob }
