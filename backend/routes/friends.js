const express = require("express")
const { body, validationResult } = require("express-validator")
const { customAlphabet } = require("nanoid")
const FriendInvite = require("../models/FriendInvite")
const User = require("../models/User")

const router = express.Router()
const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 12)

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
      res.json({ code, inviteUrl, expiresAt })
    } catch (e) {
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

module.exports = router


