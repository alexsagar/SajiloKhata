const express = require("express")
const { body, validationResult } = require("express-validator")
const { customAlphabet } = require("nanoid")
const FriendInvite = require("../models/FriendInvite")
const User = require("../models/User")
const Conversation = require("../models/Conversation")
const { sendEmail } = require("../services/emailService")

const router = express.Router()
const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 12)

// List my friends
router.get("/", async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select("friends").populate("friends", "firstName lastName username email avatar createdAt")
    const friends = (me?.friends || []).map((u) => ({
      _id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      email: u.email,
      avatar: u.avatar,
      joinedAt: u.createdAt,
    }))
    res.json({ data: friends })
  } catch (e) {
    res.status(500).json({ message: "Server error" })
  }
})

// List pending invites for the logged-in user (invitee)
router.get("/my-invites", async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select("email")
    if (!me || !me.email) {
      return res.json({ data: [] })
    }

    const invites = await FriendInvite.find({
      inviteeEmail: me.email,
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
      .populate("inviter", "firstName lastName username avatar email")
      .lean()

    const mapped = invites.map((inv) => ({
      code: inv.code,
      invitedDate: inv.createdAt,
      expiresAt: inv.expiresAt,
      message: inv.metadata?.message || null,
      inviter: {
        id: inv.inviter._id,
        firstName: inv.inviter.firstName,
        lastName: inv.inviter.lastName,
        username: inv.inviter.username,
        email: inv.inviter.email,
        avatar: inv.inviter.avatar,
      },
    }))

    res.json({ data: mapped })
  } catch (e) {
    res.status(500).json({ message: "Server error" })
  }
})

// Decline invite (invitee only)
router.post("/invites/:code/decline", async (req, res) => {
  try {
    const now = new Date()

    // Atomically mark invite as declined only if it's still pending and not expired
    const result = await FriendInvite.updateOne(
      { code: req.params.code, status: "pending", expiresAt: { $gt: now } },
      { $set: { status: "declined" } },
    )

    if (result.matchedCount === 0 && result.modifiedCount === 0) {
      // Either invite doesn't exist, is already handled, or expired
      const exists = await FriendInvite.exists({ code: req.params.code })
      if (!exists) {
        return res.status(404).json({ message: "Invite not found" })
      }
      return res.status(400).json({ message: "Invite invalid or already handled" })
    }

    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ message: "Server error" })
  }
})

// Create invite
router.post(
  "/invites",
  [body("inviteeEmail").optional().isEmail().normalizeEmail(), body("message").optional().isLength({ max: 500 })],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

      const code = nanoid()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const invite = await FriendInvite.create({
        code,
        inviter: req.user._id,
        inviteeEmail: req.body.inviteeEmail,
        expiresAt,
        metadata: { message: req.body.message },
      })

      const inviteUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/invite/${code}`

      if (req.body.inviteeEmail) {
        const inviter = await User.findById(req.user._id).select("firstName")
        await sendEmail({
          to: req.body.inviteeEmail,
          subject: "You're invited to join SajiloKhata",
          template: "groupInvite",
          data: {
            firstName: "Friend",
            message: `${inviter?.firstName || "Your friend"} invited you to connect on SajiloKhata`,
            inviteUrl,
          },
        })

        // If the invitee already has an account, notify them in real time
        const existingUser = await User.findOne({ email: req.body.inviteeEmail }).select("_id")
        if (existingUser) {
          req.io.to(`user_${existingUser._id}`).emit("friend:invited", {
            code,
            inviter: {
              id: req.user._id,
              firstName: inviter?.firstName || null,
            },
          })
        }
      }

      res.json({ code, inviteUrl, expiresAt })
    } catch (e) {
      console.error("Error in POST /friends/invites:", e)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get invite metadata
router.get("/invites/:code", async (req, res) => {
  try {
    const invite = await FriendInvite.findOne({ code: req.params.code })
      .populate("inviter", "firstName lastName avatar username")
      .lean()

    if (!invite) return res.status(404).json({ message: "Not found" })
    if (invite.status !== "pending" || invite.expiresAt < new Date()) {
      return res.status(404).json({ message: "Invite invalid or expired" })
    }

    res.json({
      code: invite.code,
      inviter: {
        firstName: invite.inviter.firstName,
        lastName: invite.inviter.lastName,
        username: invite.inviter.username,
        avatar: invite.inviter.avatar,
      },
      status: invite.status,
      expiresAt: invite.expiresAt,
      message: invite.metadata?.message || null,
    })
  } catch (e) {
    res.status(500).json({ message: "Server error" })
  }
})

// Accept invite
router.post("/invites/:code/accept", async (req, res) => {
  try {
    const invite = await FriendInvite.findOne({ code: req.params.code })
    if (!invite) return res.status(404).json({ message: "Not found" })
    if (invite.status !== "pending" || invite.expiresAt < new Date()) {
      return res.status(404).json({ message: "Invite invalid or expired" })
    }

    const meId = req.user._id.toString()
    const inviterId = invite.inviter.toString()
    if (meId === inviterId) return res.status(400).json({ message: "Cannot accept your own invite" })

    // Add friendship (set-like)
    await User.updateOne({ _id: inviterId }, { $addToSet: { friends: req.user._id } })
    await User.updateOne({ _id: req.user._id }, { $addToSet: { friends: invite.inviter } })

    invite.status = "accepted"
    await invite.save()

    // Upsert a DM conversation between inviter and invitee
    const participants = [inviterId, meId].sort()
    let conv = await Conversation.findOne({ type: "dm", participants: { $all: participants, $size: 2 } })
    if (!conv) {
      conv = await Conversation.create({ type: "dm", participants })
    }

    // notify inviter via socket
    req.io.to(`user_${inviterId}`).emit("friend:accepted", { userId: meId })

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ message: "Server error" })
  }
})

// Revoke invite (inviter only)
router.post("/invites/:code/revoke", async (req, res) => {
  try {
    const invite = await FriendInvite.findOne({ code: req.params.code })
    if (!invite) return res.status(404).json({ message: "Not found" })
    if (invite.inviter.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Forbidden" })
    if (invite.status !== "pending") return res.status(400).json({ message: "Cannot revoke" })
    invite.status = "revoked"
    await invite.save()
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ message: "Server error" })
  }
})

// Remove friend (unfriend permanently from both sides)
router.delete("/:friendId", async (req, res) => {
  try {
    const meId = req.user._id.toString()
    const friendId = req.params.friendId

    if (!friendId) {
      return res.status(400).json({ message: "Friend id is required" })
    }

    // Remove each other from friends arrays
    await User.updateOne({ _id: meId }, { $pull: { friends: friendId } })
    await User.updateOne({ _id: friendId }, { $pull: { friends: meId } })

    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
