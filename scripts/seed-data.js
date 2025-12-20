// Seed script to populate the database with sample data for development

const { MongoClient, ObjectId } = require("mongodb")
const bcrypt = require("bcryptjs")

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/splitwise"

async function seedData() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    
    const db = client.db()

    // Clear existing data
    
    await db.collection("users").deleteMany({})
    await db.collection("groups").deleteMany({})
    await db.collection("expenses").deleteMany({})
    await db.collection("notifications").deleteMany({})
    await db.collection("settlements").deleteMany({})
    await db.collection("messages").deleteMany({})

    // Create sample users
    
    const hashedPassword = await bcrypt.hash("password123", 10)

    const users = [
      {
        _id: new ObjectId(),
        username: "johndoe",
        email: "john@example.com",
        password: hashedPassword,
        firstName: "John",
        lastName: "Doe",
        avatar: null,
        isActive: true,
        role: "user",
        createdAt: new Date(),
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
        subscription: {
          plan: "free",
          status: "active",
          startDate: new Date(),
          endDate: null,
        },
      },
      {
        _id: new ObjectId(),
        username: "sarahchen",
        email: "sarah@example.com",
        password: hashedPassword,
        firstName: "Sarah",
        lastName: "Chen",
        avatar: null,
        isActive: true,
        role: "user",
        createdAt: new Date(),
        preferences: {
          currency: "USD",
          language: "en",
          theme: "dark",
          timezone: "America/Los_Angeles",
          notifications: {
            email: true,
            push: true,
            whatsapp: true,
            expenseAdded: true,
            expenseUpdated: true,
            paymentReminder: true,
            groupInvite: true,
          },
        },
        subscription: {
          plan: "premium",
          status: "active",
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        },
      },
      {
        _id: new ObjectId(),
        username: "mikejohnson",
        email: "mike@example.com",
        password: hashedPassword,
        firstName: "Mike",
        lastName: "Johnson",
        avatar: null,
        isActive: true,
        role: "user",
        createdAt: new Date(),
        preferences: {
          currency: "EUR",
          language: "en",
          theme: "light",
          timezone: "Europe/London",
          notifications: {
            email: false,
            push: true,
            whatsapp: false,
            expenseAdded: true,
            expenseUpdated: false,
            paymentReminder: true,
            groupInvite: true,
          },
        },
        subscription: {
          plan: "free",
          status: "active",
          startDate: new Date(),
          endDate: null,
        },
      },
      {
        _id: new ObjectId(),
        username: "admin",
        email: "admin@splitwise.com",
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        avatar: null,
        isActive: true,
        role: "admin",
        createdAt: new Date(),
        preferences: {
          currency: "USD",
          language: "en",
          theme: "dark",
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
        subscription: {
          plan: "enterprise",
          status: "active",
          startDate: new Date(),
          endDate: null,
        },
      },
    ]

    await db.collection("users").insertMany(users)
    

    // Create sample groups
    
    const groups = [
      {
        _id: new ObjectId(),
        name: "Weekend Trip to Mountains",
        description: "Our amazing weekend getaway to the mountains",
        members: [users[0]._id, users[1]._id, users[2]._id],
        createdBy: users[0]._id,
        createdAt: new Date(),
        currency: "USD",
        category: "travel",
        inviteCode: "TRIP2024",
        settings: {
          allowMembersToAddExpenses: true,
          requireApprovalForExpenses: false,
          defaultSplitType: "equal",
        },
        stats: {
          totalExpenses: 0,
          totalMembers: 3,
          lastActivity: new Date(),
        },
      },
      {
        _id: new ObjectId(),
        name: "Office Lunch Group",
        description: "Daily office lunch expenses",
        members: [users[0]._id, users[1]._id],
        createdBy: users[1]._id,
        createdAt: new Date(),
        currency: "USD",
        category: "food",
        inviteCode: "LUNCH24",
        settings: {
          allowMembersToAddExpenses: true,
          requireApprovalForExpenses: false,
          defaultSplitType: "equal",
        },
        stats: {
          totalExpenses: 0,
          totalMembers: 2,
          lastActivity: new Date(),
        },
      },
      {
        _id: new ObjectId(),
        name: "Apartment Roommates",
        description: "Shared apartment expenses - rent, utilities, groceries",
        members: [users[0]._id, users[2]._id],
        createdBy: users[0]._id,
        createdAt: new Date(),
        currency: "USD",
        category: "home",
        inviteCode: "ROOM2024",
        settings: {
          allowMembersToAddExpenses: true,
          requireApprovalForExpenses: false,
          defaultSplitType: "equal",
        },
        stats: {
          totalExpenses: 0,
          totalMembers: 2,
          lastActivity: new Date(),
        },
      },
    ]

    await db.collection("groups").insertMany(groups)
    

    // Create sample expenses
    
    const expenses = [
      {
        _id: new ObjectId(),
        groupId: groups[0]._id,
        description: "Hotel booking for mountain trip",
        amount: 300.0,
        paidBy: users[0]._id,
        category: "accommodation",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        currency: "USD",
        status: "active",
        splits: [
          { userId: users[0]._id, amount: 100.0, settled: false, percentage: 33.33 },
          { userId: users[1]._id, amount: 100.0, settled: false, percentage: 33.33 },
          { userId: users[2]._id, amount: 100.0, settled: false, percentage: 33.34 },
        ],
        receipt: null,
        tags: ["vacation", "accommodation"],
        notes: "Booked through Booking.com",
        recurring: null,
      },
      {
        _id: new ObjectId(),
        groupId: groups[0]._id,
        description: "Gas for the trip",
        amount: 80.0,
        paidBy: users[1]._id,
        category: "transportation",
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        currency: "USD",
        status: "active",
        splits: [
          { userId: users[0]._id, amount: 26.67, settled: false, percentage: 33.33 },
          { userId: users[1]._id, amount: 26.67, settled: false, percentage: 33.33 },
          { userId: users[2]._id, amount: 26.66, settled: false, percentage: 33.34 },
        ],
        receipt: null,
        tags: ["transportation", "gas"],
        notes: "Shell gas station",
        recurring: null,
      },
      {
        _id: new ObjectId(),
        groupId: groups[1]._id,
        description: "Pizza lunch at Tony's",
        amount: 45.6,
        paidBy: users[1]._id,
        category: "food",
        date: new Date(),
        createdAt: new Date(),
        currency: "USD",
        status: "active",
        splits: [
          { userId: users[0]._id, amount: 22.8, settled: false, percentage: 50 },
          { userId: users[1]._id, amount: 22.8, settled: false, percentage: 50 },
        ],
        receipt: null,
        tags: ["lunch", "pizza"],
        notes: "Large pepperoni pizza + drinks",
        recurring: null,
      },
      {
        _id: new ObjectId(),
        groupId: groups[2]._id,
        description: "Monthly electricity bill",
        amount: 120.0,
        paidBy: users[2]._id,
        category: "utilities",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        currency: "USD",
        status: "active",
        splits: [
          { userId: users[0]._id, amount: 60.0, settled: false, percentage: 50 },
          { userId: users[2]._id, amount: 60.0, settled: false, percentage: 50 },
        ],
        receipt: null,
        tags: ["utilities", "electricity"],
        notes: "ConEd monthly bill",
        recurring: {
          frequency: "monthly",
          nextDate: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000), // 27 days from now
          endDate: null,
        },
      },
    ]

    await db.collection("expenses").insertMany(expenses)
    

    // Create sample notifications
    
    const notifications = [
      {
        _id: new ObjectId(),
        userId: users[0]._id,
        type: "expense_added",
        title: "New expense added",
        message: "Sarah added 'Gas for the trip' ($80.00) to Weekend Trip to Mountains",
        data: {
          expenseId: expenses[1]._id,
          groupId: groups[0]._id,
          amount: 80.0,
          addedBy: users[1]._id,
        },
        read: false,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        _id: new ObjectId(),
        userId: users[2]._id,
        type: "expense_added",
        title: "New expense added",
        message: "Sarah added 'Gas for the trip' ($80.00) to Weekend Trip to Mountains",
        data: {
          expenseId: expenses[1]._id,
          groupId: groups[0]._id,
          amount: 80.0,
          addedBy: users[1]._id,
        },
        read: false,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        _id: new ObjectId(),
        userId: users[0]._id,
        type: "payment_reminder",
        title: "Payment reminder",
        message: "You owe $26.67 to Sarah for 'Gas for the trip'",
        data: {
          expenseId: expenses[1]._id,
          groupId: groups[0]._id,
          amount: 26.67,
          owedTo: users[1]._id,
        },
        read: true,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      },
    ]

    await db.collection("notifications").insertMany(notifications)
    

    // Create sample messages
    
    const messages = [
      {
        _id: new ObjectId(),
        groupId: groups[0]._id,
        sender: users[0]._id,
        message: "Hey everyone! I just booked our hotel for the mountain trip. It's $300 total, so $100 each.",
        type: "text",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        edited: false,
        reactions: [
          { userId: users[1]._id, emoji: "👍", createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          { userId: users[2]._id, emoji: "👍", createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        ],
      },
      {
        _id: new ObjectId(),
        groupId: groups[0]._id,
        sender: users[1]._id,
        message: "Perfect! I'll handle the gas. Just filled up the tank - $80 total.",
        type: "text",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        edited: false,
        reactions: [],
      },
      {
        _id: new ObjectId(),
        groupId: groups[1]._id,
        sender: users[1]._id,
        message: "Pizza time! 🍕 Got us a large pepperoni from Tony's.",
        type: "text",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        edited: false,
        reactions: [{ userId: users[0]._id, emoji: "🍕", createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) }],
      },
    ]

    await db.collection("messages").insertMany(messages)
    

    // Update group stats
    
    for (const group of groups) {
      const groupExpenses = expenses.filter((e) => e.groupId.equals(group._id))
      const totalExpenses = groupExpenses.reduce((sum, expense) => sum + expense.amount, 0)

      await db.collection("groups").updateOne(
        { _id: group._id },
        {
          $set: {
            "stats.totalExpenses": totalExpenses,
            "stats.lastActivity": new Date(),
          },
        },
      )
    }

    
    
    
    
    
    
    
    
    
    
    
    ")
  } catch (error) {
    
    process.exit(1)
  } finally {
    await client.close()
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedData()
}

module.exports = seedData
