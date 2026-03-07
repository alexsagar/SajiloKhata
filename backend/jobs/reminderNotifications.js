const cron = require("node-cron")
const Reminder = require("../models/Reminder")
const { createNotification } = require("../services/notificationService")

let io = null

// Initialize with socket.io instance
function initReminderNotifications(socketIO) {
  io = socketIO
  
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    try {
      await checkAndSendReminderNotifications()
    } catch (error) {
      console.error("Error in reminder notifications job:", error)
    }
  })
}

async function checkAndSendReminderNotifications() {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Find all pending reminders that are due within the next 3 days or today
    const futureDate = new Date(today)
    futureDate.setDate(today.getDate() + 3)
    
    const reminders = await Reminder.find({
      status: "pending",
      dueDate: { 
        $gte: today,
        $lte: futureDate
      }
    }).populate("user", "_id")

    for (const reminder of reminders) {
      const diffTime = reminder.dueDate.getTime() - today.getTime()
      const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000))

      // Send pre-due reminder exactly 3 days before due date.
      if (diffDays !== 3) continue
      
      // Skip if we already notified for this offset
      if (reminder.lastNotifiedOffsetDays === diffDays) continue

      const dueDateStr = reminder.dueDate.toLocaleDateString()
      const message = `"${reminder.title}" is due in 3 days (${dueDateStr})`

      const notification = await createNotification({
        userId: reminder.user._id,
        type: "payment_reminder",
        title: "Payment Reminder",
        message,
        data: {
          reminderId: reminder._id,
          dueDate: reminder.dueDate,
          category: reminder.category,
          amount: reminder.amount,
        },
      })

      // Send real-time notification if socket is available.
      io?.to(`user_${reminder.user._id}`).emit("notification", {
        id: notification?._id || reminder._id,
        title: "Payment Reminder",
        message,
        type: "payment_reminder",
      })
      io?.to(`user_${reminder.user._id}`).emit("notification:reminder", {
        id: reminder._id,
        title: reminder.title,
        dueDate: reminder.dueDate,
        daysUntil: diffDays,
        message,
        type: "reminder"
      })

      // Update the reminder to track this notification
      reminder.lastNotifiedOffsetDays = diffDays
      await reminder.save()
    }
  } catch (error) {
    console.error("Error checking reminder notifications:", error)
  }
}

module.exports = { initReminderNotifications }
