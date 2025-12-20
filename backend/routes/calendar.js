const express = require("express")
const router = express.Router()
const { body, validationResult } = require("express-validator")
const User = require("../models/User")
const Expense = require("../models/Expense")
const Group = require("../models/Group")
const { ok, fail } = require("../utils/http")
const { toBaseCurrency } = require("../utils/analytics-calcs")

// Get calendar month data with expense totals and base currency conversion
router.get("/month", async (req, res) => {
  try {
    const { year, month, mode = 'all', groupIds, baseCurrency } = req.query
    const userId = req.user._id || req.user.id
    
    if (!year || !month) {
      return fail(res, 'Year and month are required', 400)
    }

    // Parse year and month
    const yearNum = parseInt(year)
    const monthNum = parseInt(month)
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return fail(res, 'Invalid year or month', 400)
    }

    // Get user's base currency preference
    const user = await User.findById(userId).select('preferences.baseCurrency')
    const userBaseCurrency = baseCurrency || user?.preferences?.baseCurrency || 'USD'

    // Build date range for the month
    const startDate = new Date(yearNum, monthNum - 1, 1)
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999)

    // Build query based on mode
    let matchQuery = {
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['active', 'settled'] }
    }

    if (mode === 'personal') {
      matchQuery.groupId = null
      matchQuery.$or = [
        { paidBy: userId },
        { "splits.user": userId }
      ]
    } else if (mode === 'group') {
      matchQuery.groupId = { $exists: true, $ne: null }
      
      // Get user's groups for ACL
      const userGroups = await Group.find({
        "members.user": userId,
        isActive: true
      }).select('_id')
      
      if (groupIds && groupIds.length > 0) {
        // Filter by specific groups and verify membership
        const allowedGroupIds = groupIds.filter(groupId => 
          userGroups.some(g => g._id.toString() === groupId)
        )
        matchQuery.groupId = { $in: allowedGroupIds }
      } else {
        matchQuery.groupId = { $in: userGroups.map(g => g._id) }
      }
      
      matchQuery.$or = [
        { paidBy: userId },
        { "splits.user": userId }
      ]
    } else {
      // 'all' mode - include both personal and group expenses
      matchQuery.$or = [
        { paidBy: userId },
        { "splits.user": userId }
      ]
    }

    // Get expenses for the month
    const expenses = await Expense.find(matchQuery)
      .select('amountCents currencyCode fxRate date groupId paidBy splits')
      .lean()

    // Group expenses by date and calculate totals
    const dailyTotals = {}
    let monthTotalBaseCents = 0
    let monthTotalCount = 0

    expenses.forEach(expense => {
      const dateKey = expense.date.toISOString().split('T')[0]
      const baseAmount = toBaseCurrency(expense.amountCents, expense.fxRate || 1.0)
      
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = {
          totalBaseCents: 0,
          totalsByCurrency: {},
          count: 0
        }
      }
      
      dailyTotals[dateKey].totalBaseCents += baseAmount
      dailyTotals[dateKey].count += 1
      
      // Track currency-specific totals
      const currencyCode = expense.currencyCode || 'USD'
      if (!dailyTotals[dateKey].totalsByCurrency[currencyCode]) {
        dailyTotals[dateKey].totalsByCurrency[currencyCode] = 0
      }
      dailyTotals[dateKey].totalsByCurrency[currencyCode] += expense.amountCents
      
      monthTotalBaseCents += baseAmount
      monthTotalCount += 1
    })

    // Convert daily totals to array format
    const days = Object.keys(dailyTotals).map(date => {
      const dayData = dailyTotals[date]
      return {
        date,
        totalBaseCents: dayData.totalBaseCents,
        totalsByCurrency: Object.entries(dayData.totalsByCurrency).map(([code, cents]) => ({
          code,
          cents
        })),
        count: dayData.count
      }
    }).sort((a, b) => a.date.localeCompare(b.date))

    return ok(res, {
      month: `${yearNum}-${String(monthNum).padStart(2, '0')}`,
      baseCurrency: userBaseCurrency,
      days,
      monthTotals: {
        totalBaseCents: monthTotalBaseCents,
        count: monthTotalCount
      }
    })
  } catch (error) {
    
    return fail(res, 'Failed to get calendar month data', 500)
  }
})

// Get calendar events (expenses as events)
router.get("/events", async (req, res) => {
  try {
    const { start, end, groupId } = req.query

    const startDate = new Date(start)
    const endDate = new Date(end)

    const query = {
      $or: [{ paidBy: req.user._id }, { "splits.user": req.user._id }],
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    }

    if (groupId) {
      query.groupId = groupId
    }

    const expenses = await Expense.find(query)
      .populate("paidBy", "firstName lastName avatar")
      .populate("groupId", "name")
      .sort({ createdAt: -1 })

    const events = expenses.map((expense) => ({
      id: expense._id,
      title: expense.description,
      start: expense.createdAt,
      amount: expense.amount,
      currency: expense.currency,
      paidBy: expense.paidBy,
      group: expense.groupId,
      category: expense.category,
      type: "expense",
    }))

    res.json({ events })
  } catch (error) {
    
    res.status(500).json({ message: "Server error" })
  }
})

// Create calendar reminder
router.post(
  "/reminders",
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("date").isISO8601().withMessage("Valid date is required"),
    body("type").isIn(["payment", "bill", "expense"]).withMessage("Invalid reminder type"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { title, description, date, type, groupId, expenseId } = req.body

      // Create notification for the reminder
      const notificationService = require("../services/notificationService")
      await notificationService.createNotification({
        userId: req.user._id,
        type: "reminder",
        title: `Reminder: ${title}`,
        message: description || `Don't forget about your ${type}`,
        data: {
          reminderType: type,
          scheduledFor: date,
          groupId,
          expenseId,
        },
        scheduledFor: new Date(date),
      })

      res.status(201).json({ message: "Reminder created successfully" })
    } catch (error) {
      
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get user's calendar settings
router.get("/settings", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("preferences.calendar")

    const defaultSettings = {
      defaultView: "month",
      weekStartsOn: 0, // Sunday
      timeFormat: "12h",
      showWeekends: true,
      defaultReminders: {
        bills: 3, // days before
        payments: 1,
        expenses: 0,
      },
      integrations: {
        google: {
          enabled: false,
          calendarId: null,
          syncEnabled: false,
        },
        outlook: {
          enabled: false,
          calendarId: null,
          syncEnabled: false,
        },
      },
    }

    const settings = user.preferences?.calendar || defaultSettings

    res.json(settings)
  } catch (error) {
    
    res.status(500).json({ message: "Server error" })
  }
})

// Update calendar settings
router.put(
  "/settings",
  [
    body("defaultView").optional().isIn(["month", "week", "day"]),
    body("weekStartsOn").optional().isInt({ min: 0, max: 6 }),
    body("timeFormat").optional().isIn(["12h", "24h"]),
    body("showWeekends").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const settings = req.body

      await User.findByIdAndUpdate(req.user._id, {
        "preferences.calendar": settings,
        updatedAt: new Date(),
      })

      res.json({ message: "Calendar settings updated", settings })
    } catch (error) {
      
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Sync with external calendar (placeholder for Google/Outlook integration)
router.post("/sync/:provider", async (req, res) => {
  try {
    const { provider } = req.params
    const { accessToken, calendarId } = req.body

    if (!["google", "outlook"].includes(provider)) {
      return res.status(400).json({ message: "Invalid calendar provider" })
    }

    // This would integrate with Google Calendar API or Microsoft Graph API
    // For now, we'll just store the integration settings

    await User.findByIdAndUpdate(req.user._id, {
      [`preferences.calendar.integrations.${provider}`]: {
        enabled: true,
        calendarId,
        syncEnabled: true,
        lastSyncAt: new Date(),
      },
      updatedAt: new Date(),
    })

    res.json({ message: `${provider} calendar integration enabled` })
  } catch (error) {
    
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
