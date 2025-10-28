// Database migration script for schema updates

const { MongoClient } = require("mongodb")

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/splitwise"

class DatabaseMigrator {
  constructor() {
    this.client = new MongoClient(MONGODB_URI)
    this.db = null
    this.migrations = [
      this.migration_001_add_user_preferences,
      this.migration_002_add_expense_tags,
      this.migration_003_add_recurring_expenses,
      this.migration_004_add_team_features,
      this.migration_005_add_receipt_processing,
    ]
  }

  async connect() {
    await this.client.connect()
    this.db = this.client.db()
    console.log("✅ Connected to MongoDB for migration")
  }

  async disconnect() {
    await this.client.close()
    console.log("✅ Disconnected from MongoDB")
  }

  // Migration 001: Add user preferences
  async migration_001_add_user_preferences() {
    console.log("Running migration 001: Add user preferences")

    const users = await this.db.collection("users").find({}).toArray()

    for (const user of users) {
      if (!user.preferences) {
        await this.db.collection("users").updateOne(
          { _id: user._id },
          {
            $set: {
              preferences: {
                currency: "USD",
                language: "en",
                theme: "light",
                timezone: "America/New_York",
                notifications: {
                  email: true,
                  push: true,
                  whatsapp: false,
                  expenseAdded: true,
                  expenseUpdated: true,
                  paymentReminder: true,
                  groupInvite: true,
                },
              },
            },
          },
        )
      }
    }

    console.log(`✅ Updated ${users.length} users with preferences`)
  }

  // Migration 002: Add tags to expenses
  async migration_002_add_expense_tags() {
    console.log("Running migration 002: Add expense tags")

    const result = await this.db.collection("expenses").updateMany({ tags: { $exists: false } }, { $set: { tags: [] } })

    console.log(`✅ Added tags field to ${result.modifiedCount} expenses`)
  }

  // Migration 003: Add recurring expense support
  async migration_003_add_recurring_expenses() {
    console.log("Running migration 003: Add recurring expenses")

    const result = await this.db
      .collection("expenses")
      .updateMany({ recurring: { $exists: false } }, { $set: { recurring: null } })

    console.log(`✅ Added recurring field to ${result.modifiedCount} expenses`)
  }

  // Migration 004: Add team features
  async migration_004_add_team_features() {
    console.log("Running migration 004: Add team features")

    // Add subscription field to users
    const userResult = await this.db.collection("users").updateMany(
      { subscription: { $exists: false } },
      {
        $set: {
          subscription: {
            plan: "free",
            status: "active",
            startDate: new Date(),
            endDate: null,
          },
        },
      },
    )

    console.log(`✅ Added subscription to ${userResult.modifiedCount} users`)

    // Add role field to users
    const roleResult = await this.db
      .collection("users")
      .updateMany({ role: { $exists: false } }, { $set: { role: "user" } })

    console.log(`✅ Added role to ${roleResult.modifiedCount} users`)
  }

  // Migration 005: Add receipt processing fields
  async migration_005_add_receipt_processing() {
    console.log("Running migration 005: Add receipt processing")

    // Ensure receipts collection exists
    try {
      await this.db.createCollection("receipts")
    } catch (error) {
      if (error.code !== 48) throw error // Ignore "collection already exists" error
    }

    // Add receipt field to expenses
    const result = await this.db
      .collection("expenses")
      .updateMany({ receipt: { $exists: false } }, { $set: { receipt: null } })

    console.log(`✅ Added receipt field to ${result.modifiedCount} expenses`)
  }

  // Get migration status
  async getMigrationStatus() {
    try {
      const migrations = await this.db.collection("migrations").find({}).toArray()
      return migrations.reduce((acc, migration) => {
        acc[migration.name] = migration.completedAt
        return acc
      }, {})
    } catch (error) {
      return {}
    }
  }

  // Mark migration as completed
  async markMigrationCompleted(migrationName) {
    await this.db.collection("migrations").updateOne(
      { name: migrationName },
      {
        $set: {
          name: migrationName,
          completedAt: new Date(),
        },
      },
      { upsert: true },
    )
  }

  // Run all pending migrations
  async runMigrations() {
    console.log("🔄 Starting database migrations...")

    const completedMigrations = await this.getMigrationStatus()

    for (let i = 0; i < this.migrations.length; i++) {
      const migration = this.migrations[i]
      const migrationName = `migration_${String(i + 1).padStart(3, "0")}`

      if (!completedMigrations[migrationName]) {
        try {
          await migration.call(this)
          await this.markMigrationCompleted(migrationName)
          console.log(`✅ Completed ${migrationName}`)
        } catch (error) {
          console.error(`❌ Failed ${migrationName}:`, error)
          throw error
        }
      } else {
        console.log(`⏭️  Skipped ${migrationName} (already completed)`)
      }
    }

    console.log("✅ All migrations completed successfully!")
  }

  // Rollback a specific migration (if needed)
  async rollbackMigration(migrationName) {
    console.log(`🔄 Rolling back ${migrationName}...`)

    // Remove migration record
    await this.db.collection("migrations").deleteOne({ name: migrationName })

    console.log(`✅ Rolled back ${migrationName}`)
  }
}

// Run migrations if this file is executed directly
async function runMigrations() {
  const migrator = new DatabaseMigrator()

  try {
    await migrator.connect()
    await migrator.runMigrations()
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  } finally {
    await migrator.disconnect()
  }
}

if (require.main === module) {
  runMigrations()
}

module.exports = DatabaseMigrator
