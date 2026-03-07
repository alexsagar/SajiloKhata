const logger = require("./logger")

let Sentry = null
let initialized = false

try {
  Sentry = require("@sentry/node")
} catch (_) {
  Sentry = null
}

function initSentry(app) {
  const dsn = process.env.SENTRY_DSN
  if (!Sentry || !dsn) {
    logger.info({ sentryEnabled: false }, "sentry_disabled_or_not_installed")
    return { enabled: false }
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
  })

  initialized = true
  if (app && Sentry.Handlers) {
    app.use(Sentry.Handlers.requestHandler())
  }
  logger.info({ sentryEnabled: true }, "sentry_initialized")
  return { enabled: true, Sentry }
}

function captureException(error, context = {}) {
  if (initialized && Sentry) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v))
      Sentry.captureException(error)
    })
  }
}

function errorHandler() {
  if (initialized && Sentry?.Handlers?.errorHandler) {
    return Sentry.Handlers.errorHandler()
  }
  return (err, _req, _res, next) => next(err)
}

module.exports = {
  initSentry,
  captureException,
  sentryErrorHandler: errorHandler,
}
