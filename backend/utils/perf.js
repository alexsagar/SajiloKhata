const { AsyncLocalStorage } = require("async_hooks")

const perfStorage = new AsyncLocalStorage()

const SLOW_DB_QUERY_MS = Number(process.env.SLOW_DB_QUERY_MS || 75)
const SLOW_APP_SPAN_MS = Number(process.env.SLOW_APP_SPAN_MS || 40)
const MAX_DB_SAMPLES = Number(process.env.PERF_DB_SAMPLE_LIMIT || 12)
const MAX_APP_SAMPLES = Number(process.env.PERF_APP_SAMPLE_LIMIT || 12)

function createRequestPerfState() {
  return {
    requestStartedAt: Date.now(),
    db: {
      count: 0,
      totalDurationMs: 0,
      slowCount: 0,
      samples: [],
    },
    app: {
      count: 0,
      totalDurationMs: 0,
      slowCount: 0,
      samples: [],
    },
  }
}

function runWithRequestPerfContext(next) {
  return perfStorage.run(createRequestPerfState(), next)
}

function getRequestPerfState() {
  return perfStorage.getStore() || null
}

function pushSample(target, sample, limit) {
  target.push(sample)
  target.sort((a, b) => b.durationMs - a.durationMs)
  if (target.length > limit) target.length = limit
}

function recordDbOperation(entry) {
  const state = getRequestPerfState()
  if (!state) return

  const durationMs = Math.round(Number(entry.durationMs || 0) * 100) / 100
  state.db.count += 1
  state.db.totalDurationMs += durationMs

  if (durationMs >= SLOW_DB_QUERY_MS) {
    state.db.slowCount += 1
  }

  pushSample(
    state.db.samples,
    {
      type: "db",
      durationMs,
      model: entry.model || "unknown",
      collection: entry.collection || null,
      operation: entry.operation || "query",
    },
    MAX_DB_SAMPLES,
  )
}

function recordAppSpan(label, durationMs, meta = {}) {
  const state = getRequestPerfState()
  if (!state) return

  const roundedMs = Math.round(Number(durationMs || 0) * 100) / 100
  state.app.count += 1
  state.app.totalDurationMs += roundedMs

  if (roundedMs >= SLOW_APP_SPAN_MS) {
    state.app.slowCount += 1
  }

  pushSample(
    state.app.samples,
    {
      type: "app",
      label,
      durationMs: roundedMs,
      ...meta,
    },
    MAX_APP_SAMPLES,
  )
}

async function measure(label, work, meta = {}) {
  const started = process.hrtime.bigint()
  try {
    return await work()
  } finally {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6
    recordAppSpan(label, durationMs, meta)
  }
}

function buildRequestPerfSummary() {
  const state = getRequestPerfState()
  if (!state) return null

  return {
    db: {
      count: state.db.count,
      totalDurationMs: Math.round(state.db.totalDurationMs * 100) / 100,
      slowCount: state.db.slowCount,
      samples: state.db.samples,
    },
    app: {
      count: state.app.count,
      totalDurationMs: Math.round(state.app.totalDurationMs * 100) / 100,
      slowCount: state.app.slowCount,
      samples: state.app.samples,
    },
  }
}

module.exports = {
  buildRequestPerfSummary,
  measure,
  recordDbOperation,
  runWithRequestPerfContext,
}
