// MongoDB Database Setup Script
// Run this script to initialize your MongoDB database with required collections and indexes

const { MongoClient } = require("mongodb")

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/splitwise"

async function setupDatabase() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log("✅ Connected to MongoDB")

    const db = client.db()

    // Create collections
    const collections = [
      "users",
      "groups",
      "expenses",
      "notifications",
      "settlements",
      "receipts",
      "teams",
      "invites",
      "sessions",
      "messages",
      "flags",
      "features",
      "analytics",
      "calendar_events",
    ]

    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName)
        console.log(`📁 Created collection: ${collectionName}`)
      } catch (error) {
        if (error.code === 48) {
          console.log(`📁 Collection ${collectionName} already exists`)
        } else {
          throw error
        }
      }
    }

    // Create indexes for better performance
    console.log("🔍 Creating indexes...")

    // Users collection indexes
    await db.collection("users").createIndex({ email: 1 }, { unique: true })
    await db.collection("users").createIndex({ username: 1 }, { unique: true })
    await db.collection("users").createIndex({ createdAt: -1 })
    await db.collection("users").createIndex({ isActive: 1 })
    await db.collection("users").createIndex({ role: 1 })

    // Groups collection indexes
    await db.collection("groups").createIndex({ members: 1 })
    await db.collection("groups").createIndex({ createdBy: 1 })
    await db.collection("groups").createIndex({ inviteCode: 1 }, { unique: true })
    await db.collection("groups").createIndex({ createdAt: -1 })
    await db.collection("groups").createIndex({ category: 1 })

    // Expenses collection indexes
    await db.collection("expenses").createIndex({ groupId: 1, createdAt: -1 })
    await db.collection("expenses").createIndex({ paidBy: 1, createdAt: -1 })
    await db.collection("expenses").createIndex({ createdAt: -1 })
    await db.collection("expenses").createIndex({ "splits.user": 1, createdAt: -1 })
    await db.collection("expenses").createIndex({ status: 1 })
    await db.collection("expenses").createIndex({ category: 1 })
    await db.collection("expenses").createIndex({ date: -1 })
    await db.collection("expenses").createIndex({ amount: 1 })

    // Notifications collection indexes
    await db.collection("notifications").createIndex({ userId: 1 })
    await db.collection("notifications").createIndex({ createdAt: -1 })
    await db.collection("notifications").createIndex({ read: 1 })
    await db.collection("notifications").createIndex({ type: 1 })

    // Settlements collection indexes
    await db.collection("settlements").createIndex({ groupId: 1 })
    await db.collection("settlements").createIndex({ from: 1 })
    await db.collection("settlements").createIndex({ to: 1 })
    await db.collection("settlements").createIndex({ status: 1 })
    await db.collection("settlements").createIndex({ createdAt: -1 })

    // Receipts collection indexes
    await db.collection("receipts").createIndex({ userId: 1 })
    await db.collection("receipts").createIndex({ expenseId: 1 })
    await db.collection("receipts").createIndex({ createdAt: -1 })
    await db.collection("receipts").createIndex({ processed: 1 })

    // Teams collection indexes
    await db.collection("teams").createIndex({ "members.user": 1 })
    await db.collection("teams").createIndex({ createdBy: 1 })
    await db.collection("teams").createIndex({ plan: 1 })
    await db.collection("teams").createIndex({ createdAt: -1 })

    // Messages collection indexes
    await db.collection("messages").createIndex({ groupId: 1 })
    await db.collection("messages").createIndex({ createdAt: -1 })
    await db.collection("messages").createIndex({ sender: 1 })

    // Sessions collection indexes
    await db.collection("sessions").createIndex({ userId: 1 })
    await db.collection("sessions").createIndex({ token: 1 }, { unique: true })
    await db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

    // Calendar events collection indexes
    await db.collection("calendar_events").createIndex({ userId: 1 })
    await db.collection("calendar_events").createIndex({ expenseId: 1 })
    await db.collection("calendar_events").createIndex({ date: 1 })

    // Analytics collection indexes
    await db.collection("analytics").createIndex({ userId: 1 })
    await db.collection("analytics").createIndex({ groupId: 1 })
    await db.collection("analytics").createIndex({ date: -1 })
    await db.collection("analytics").createIndex({ type: 1 })

    console.log("✅ Database setup completed successfully!")
    console.log("📊 Collections created:", collections.length)
    console.log("🔍 Indexes created for optimal performance")
  } catch (error) {
    console.error("❌ Error setting up database:", error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
}

module.exports = setupDatabase
