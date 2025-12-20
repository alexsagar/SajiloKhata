const cron = require("node-cron")
const Reminder = require("../models/Reminder")

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
  if (!io) {
    return
  }

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

      // Only notify for 3, 2, 1 days before and on the day (0)
      if (![3, 2, 1, 0].includes(diffDays)) continue
      
      // Skip if we already notified for this offset
      if (reminder.lastNotifiedOffsetDays === diffDays) continue

      let message
      const dueDateStr = reminder.dueDate.toLocaleDateString()
      
      if (diffDays === 3) {
        message = `"${reminder.title}" is due in 3 days (${dueDateStr})`
      } else if (diffDays === 2) {
        message = `"${reminder.title}" is due in 2 days (${dueDateStr})`
      } else if (diffDays === 1) {
        message = `"${reminder.title}" is due tomorrow (${dueDateStr})`
      } else {
        message = `"${reminder.title}" is due today`
      }

      // Send notification via socket
      io.to(`user_${reminder.user._id}`).emit("notification:reminder", {
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
