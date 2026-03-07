let pino = null
try {
  pino = require("pino")
} catch (_) {
  pino = null
}

function createFallbackLogger(base = {}) {
  const write = (level, obj, msg) => {
    const payload = {
      level,
      time: new Date().toISOString(),
      ...base,
      ...(typeof obj === "object" && obj ? obj : {}),
      ...(typeof msg === "string" ? { msg } : {}),
    }
    const line = JSON.stringify(payload)
    if (level === "error") return console.error(line)
    if (level === "warn") return console.warn(line)
    return console.log(line)
  }

  return {
    info: (obj, msg) => write("info", obj, msg),
    warn: (obj, msg) => write("warn", obj, msg),
    error: (obj, msg) => write("error", obj, msg),
    debug: (obj, msg) => write("debug", obj, msg),
    child: (bindings = {}) => createFallbackLogger({ ...base, ...bindings }),
  }
}

const logger = pino
  ? pino({
      level: process.env.LOG_LEVEL || "info",
      base: {
        service: "sajilo-khata-backend",
        env: process.env.NODE_ENV || "development",
      },
      redact: ["req.headers.authorization", "password", "token", "refreshToken"],
    })
  : createFallbackLogger({ service: "sajilo-khata-backend" })

module.exports = logger
