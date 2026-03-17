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
      console.error('[Conversations] Upsert DM error:', e.message)
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
    console.error('[Conversations] Group conv error:', e.message)
    res.status(500).json({ message: "Server error" })
  }
})

// List my conversations — with unread counts
router.get("/", async (req, res) => {
  try {
    const userId = req.user._id
    const convs = await Conversation.find({ participants: userId })
      .populate('participants', 'firstName lastName username email avatar')
      .select("type groupId participants lastMessageAt createdAt updatedAt")
      .sort({ lastMessageAt: -1 })
      .lean()

    // Batch-fetch unread counts
    const convIds = convs.map(c => c._id)
    const unreadAgg = await Message.aggregate([
      { $match: { conversationId: { $in: convIds }, sender: { $ne: userId }, readBy: { $ne: userId } } },
      { $group: { _id: "$conversationId", count: { $sum: 1 } } },
    ])
    const unreadMap = Object.fromEntries(unreadAgg.map(u => [u._id.toString(), u.count]))

    const data = convs.map(c => ({
      ...c,
      unreadCount: unreadMap[c._id.toString()] || 0,
    }))

    res.json({ data })
  } catch (e) {
    console.error('[Conversations] List convs error:', e.message)
    res.status(500).json({ message: "Server error" })
  }
})

// Messages list with cursor — ACL: participant-only
router.get("/:id/messages", async (req, res) => {
  try {
    // Verify the requesting user is a participant of this conversation
    const conv = await Conversation.findById(req.params.id).lean()
    if (!conv) return res.status(404).json({ message: "Conversation not found" })
    const isParticipant = (conv.participants || []).map(p => p.toString()).includes(req.user._id.toString())
    if (!isParticipant) return res.status(403).json({ message: "Forbidden" })

    const limit = Math.min(Number(req.query.limit || 50), 100)
    const cursor = req.query.cursor
    const query = { conversationId: req.params.id }
    if (cursor) query.createdAt = { $lt: new Date(cursor) }
    const msgs = await Message.find(query)
      .populate("sender", "firstName lastName username avatar")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
    const nextCursor = msgs.length === limit ? msgs[msgs.length - 1].createdAt : null
    res.json({ data: msgs.reverse(), nextCursor })
  } catch (e) {
    console.error('[Conversations] GET messages error:', e.message)
    res.status(500).json({ message: "Server error" })
  }
})

// Create message — with attachment validation
router.post(
  "/messages",
  [
    body("conversationId").isMongoId(),
    body("text").optional().isLength({ max: 5000 }),
    body("attachments").optional().isArray({ max: 10 }),
    body("attachments.*.url").optional().isURL(),
    body("attachments.*.type").optional().isIn(['image', 'file', 'audio', 'video']),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    // Must have text or attachments
    const text = (req.body.text || '').trim()
    const attachments = req.body.attachments || []
    if (!text && attachments.length === 0) {
      return res.status(400).json({ message: "Message must contain text or attachments" })
    }

    try {
      const conv = await Conversation.findById(req.body.conversationId)
      if (!conv) return res.status(404).json({ message: "Conversation not found" })
      const isParticipant = conv.participants.map((p) => p.toString()).includes(req.user._id.toString())
      if (!isParticipant) return res.status(403).json({ message: "Forbidden" })

      const msg = await Message.create({
        conversationId: conv._id,
        sender: req.user._id,
        text,
        attachments,
        readBy: [req.user._id],  // sender has read their own message
      })
      await msg.populate("sender", "firstName lastName username avatar")
      conv.lastMessageAt = msg.createdAt
      await conv.save()

      // emit to conversation room (all participants join this room on load)
      req.io.to(`conv_${conv._id}`).emit("message:new", { conversationId: String(conv._id), message: msg })

      res.status(201).json({ data: msg })
    } catch (e) {
      console.error('[Conversations] Send message error:', e.message)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Mark conversation as read
router.post("/:id/read", async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id).lean()
    if (!conv) return res.status(404).json({ message: "Conversation not found" })
    const isParticipant = (conv.participants || []).map(p => p.toString()).includes(req.user._id.toString())
    if (!isParticipant) return res.status(403).json({ message: "Forbidden" })

    const result = await Message.updateMany(
      { conversationId: conv._id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } },
    )

    // Emit read receipt to conversation room so other participants see "Seen"
    if (req.io && result.modifiedCount > 0) {
      req.io.to(`conv_${conv._id}`).emit("conversation:read", {
        conversationId: String(conv._id),
        userId: String(req.user._id),
        readAt: new Date().toISOString(),
      })
    }

    res.json({ data: { modifiedCount: result.modifiedCount } })
  } catch (e) {
    console.error('[Conversations] Mark read error:', e.message)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
