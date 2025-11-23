const express = require("express")
const { body, validationResult } = require("express-validator")
const Conversation = require("../models/Conversation")
const Message = require("../models/Message")
const Group = require("../models/Group")

const router = express.Router()

// Upsert DM conversation
router.post(
  "/dm",
  [body("userId").isMongoId()],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const me = req.user._id
    const other = req.body.userId
    try {
      const participants = [me.toString(), other.toString()].sort()
      let conv = await Conversation.findOne({ type: "dm", participants: { $all: participants, $size: 2 } })
      if (!conv) {
        conv = await Conversation.create({ type: "dm", participants })
      }
      res.json({ data: conv })
    } catch (e) {
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Find or create group conversation
router.post("/group", [body("groupId").isMongoId()], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  try {
    const group = await Group.findById(req.body.groupId)
    if (!group) return res.status(404).json({ message: "Group not found" })
    const isMember = group.members.some((m) => m.user.toString() === req.user._id.toString())
    if (!isMember) return res.status(403).json({ message: "Forbidden" })

    let conv = await Conversation.findOne({ type: "group", groupId: group._id })
    if (!conv) {
      conv = await Conversation.create({ type: "group", groupId: group._id, participants: group.members.map((m) => m.user) })
    }
    res.json({ data: conv })
  } catch (e) {
    res.status(500).json({ message: "Server error" })
  }
})

// List my conversations
router.get("/", async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.user._id }).sort({ lastMessageAt: -1 }).lean()
    res.json({ data: convs })
  } catch (e) {
    res.status(500).json({ message: "Server error" })
  }
})

// Messages list with cursor
router.get("/:id/messages", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50)
    const cursor = req.query.cursor
    const query = { conversationId: req.params.id }
    if (cursor) query.createdAt = { $lt: new Date(cursor) }
    const msgs = await Message.find(query).sort({ createdAt: -1 }).limit(limit).lean()
    const nextCursor = msgs.length === limit ? msgs[msgs.length - 1].createdAt : null
    res.json({ data: msgs.reverse(), nextCursor })
  } catch (e) {
    res.status(500).json({ message: "Server error" })
  }
})

// Create message
router.post(
  "/messages",
  [body("conversationId").isMongoId(), body("text").optional().isLength({ max: 5000 })],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    try {
      const conv = await Conversation.findById(req.body.conversationId)
      if (!conv) return res.status(404).json({ message: "Conversation not found" })
      const isParticipant = conv.participants.map((p) => p.toString()).includes(req.user._id.toString())
      if (!isParticipant) return res.status(403).json({ message: "Forbidden" })

      const msg = await Message.create({ conversationId: conv._id, sender: req.user._id, text: req.body.text || "", attachments: req.body.attachments || [] })
      conv.lastMessageAt = msg.createdAt
      await conv.save()

      // emit to conversation room
      req.io.to(`conv_${conv._id}`).emit("message:new", { conversationId: String(conv._id), message: msg })
      // also emit to each participant's personal room to guarantee delivery even if not joined to conv room yet
      try {
        ;(conv.participants || []).forEach((p) => {
          req.io.to(`user_${String(p)}`).emit("message:new", { conversationId: String(conv._id), message: msg })
        })
      } catch (_) {}

      res.status(201).json({ data: msg })
    } catch (e) {
      res.status(500).json({ message: "Server error" })
    }
  },
)

module.exports = router


