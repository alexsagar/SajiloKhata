// One-shot migration to canonical cents storage
// Usage: node scripts/migrate-cents.js

require('dotenv').config()
const mongoose = require('mongoose')
const Expense = require('../backend/models/Expense')

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/splitwise'
  await mongoose.connect(uri)
  

  const batchSize = 500
  let migrated = 0
  let cursor = Expense.find({ $or: [ { amountCents: { $exists: false } }, { 'splits.amountCents': { $exists: false } } ] }).cursor()

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    let changed = false

    // expense amount
    if (doc.amountCents == null) {
      const legacy = typeof doc.amount === 'number' ? doc.amount : 0
      doc.amountCents = Math.round(legacy * 100)
      changed = true
    }

    // splits
    if (Array.isArray(doc.splits)) {
      let totalSplits = 0
      doc.splits.forEach((s) => {
        if (s.amountCents == null) {
          const legacy = typeof s.amount === 'number' ? s.amount : 0
          s.amountCents = Math.round(legacy * 100)
          changed = true
        }
        totalSplits += s.amountCents || 0
      })

      // Reconcile rounding to match amountCents by adjusting last split
      const diff = (doc.amountCents || 0) - totalSplits
      if (diff !== 0 && doc.splits.length > 0) {
        const last = doc.splits[doc.splits.length - 1]
        const adjusted = (last.amountCents || 0) + diff
        if (adjusted < 0) {
          // If adjustment would go negative, spread the diff across all splits
          const per = Math.trunc(diff / doc.splits.length)
          const rem = diff - per * doc.splits.length
          doc.splits.forEach((s, idx) => {
            s.amountCents = (s.amountCents || 0) + per + (idx === doc.splits.length - 1 ? rem : 0)
            if (s.amountCents < 0) s.amountCents = 0
          })
        } else {
          last.amountCents = adjusted
        }
        changed = true
      }
    }

    if (changed) {
      await doc.save()
      migrated += 1
      if (migrated % batchSize === 0) {
        
      }
    }
  }

  
  await mongoose.disconnect()
}

run().catch((e) => {
  
  process.exit(1)
})


