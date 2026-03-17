const mongoose = require("mongoose")
const { recordDbOperation } = require("../utils/perf")

let mongoosePerfPatched = false

function instrumentMongoose() {
  if (mongoosePerfPatched) return
  mongoosePerfPatched = true

  const originalQueryExec = mongoose.Query.prototype.exec
  mongoose.Query.prototype.exec = async function instrumentedQueryExec(...args) {
    const started = process.hrtime.bigint()
    try {
      return await originalQueryExec.apply(this, args)
    } finally {
      recordDbOperation({
        model: this.model?.modelName,
        collection: this.mongooseCollection?.name,
        operation: this.op,
        durationMs: Number(process.hrtime.bigint() - started) / 1e6,
      })
    }
  }

  const originalAggregateExec = mongoose.Aggregate.prototype.exec
  mongoose.Aggregate.prototype.exec = async function instrumentedAggregateExec(...args) {
    const started = process.hrtime.bigint()
    try {
      return await originalAggregateExec.apply(this, args)
    } finally {
      recordDbOperation({
        model: this._model?.modelName,
        collection: this._model?.collection?.name,
        operation: "aggregate",
        durationMs: Number(process.hrtime.bigint() - started) / 1e6,
      })
    }
  }

  const originalSave = mongoose.Model.prototype.save
  mongoose.Model.prototype.save = async function instrumentedSave(...args) {
    const started = process.hrtime.bigint()
    try {
      return await originalSave.apply(this, args)
    } finally {
      recordDbOperation({
        model: this.constructor?.modelName,
        collection: this.collection?.name,
        operation: "save",
        durationMs: Number(process.hrtime.bigint() - started) / 1e6,
      })
    }
  }
}

// In test environment, disable command buffering so model operations fail fast
if (process.env.NODE_ENV === 'test') {
  mongoose.set('bufferCommands', false)
}

instrumentMongoose()

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Fail fast when server is unavailable (helps tests avoid long timeouts)
      serverSelectionTimeoutMS: process.env.NODE_ENV === 'test' ? 2000 : undefined,
    })

    
  } catch (error) {
    
    process.exit(1)
  }
}

module.exports = connectDB
