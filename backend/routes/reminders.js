const express = require("express")
const { body, validationResult } = require("express-validator")
const Reminder = require("../models/Reminder")

const router = express.Router()

// Create a new reminder
router.post(
  "/",
  [
    body("title").notEmpty().trim().withMessage("Title is required"),
    body("dueDate").isISO8601().withMessage("Valid due date is required"),
    body("amount").optional().isFloat({ min: 0 }).withMessage("Amount must be positive"),
    body("category").optional().isIn([
      "food", "transportation", "accommodation", "entertainment", 
      "utilities", "shopping", "healthcare", "other"
    ]).withMessage("Invalid category"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { title, description, dueDate, amount, category } = req.body

      // Normalize dueDate to start of day in UTC
      const dueDateObj = new Date(dueDate + "T00:00:00.000Z")

      const reminder = new Reminder({
        user: req.user._id,
        title,
        description,
        dueDate: dueDateObj,
        amount,
        category: category || "other"
      })

      await reminder.save()

      res.status(201).json({
        success: true,
        data: reminder
      })
    } catch (error) {
      res.status(500).json({ 
        message: "Server error", 
        error: error.message 
      })
    }
  }
)

// Get reminders for a specific month
router.get("/month", async (req, res) => {
  try {
    const { year, month } = req.query

    if (!year || !month) {
      return res.status(400).json({ 
        message: "Year and month are required" 
      })
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)

    // Compute "today" at midnight to filter out past-due reminders
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const reminders = await Reminder.find({
      user: req.user._id,
      status: "pending",
      dueDate: {
        // still constrain to the requested month, but also require dueDate >= today
        $gte: today > startDate ? today : startDate,
        $lte: endDate,
      },
    }).sort({ dueDate: 1 })

    res.json({
      success: true,
      data: reminders
    })
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    })
  }
})

// Get all pending reminders for a user
router.get("/", async (req, res) => {
  try {
    const reminders = await Reminder.find({
      user: req.user._id,
      status: "pending"
    }).sort({ dueDate: 1 })

    res.json({
      success: true,
      data: reminders
    })
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    })
  }
})

// Update reminder status
router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body
    
    if (!["pending", "done", "cancelled"].includes(status)) {
      return res.status(400).json({ 
        message: "Invalid status" 
      })
    }

    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { status },
      { new: true }
    )

    if (!reminder) {
      return res.status(404).json({ 
        message: "Reminder not found" 
      })
    }

    res.json({
      success: true,
      data: reminder
    })
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    })
  }
})

module.exports = router
