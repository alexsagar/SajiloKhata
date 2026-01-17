const express = require("express")
const Settlement = require("../models/Settlement")
const Group = require("../models/Group")
const { ok, fail } = require("../utils/http")

const router = express.Router()

router.patch("/:id/confirm", async (req, res) => {
  try {
    const settlement = await Settlement.findById(req.params.id)
    if (!settlement) {
      return fail(res, "Settlement not found", 404)
    }

    const group = await Group.findOne({
      _id: settlement.groupId,
      "members.user": req.user._id,
      isActive: true,
    })

    if (!group) {
      return fail(res, "Not authorized", 403)
    }

    if (settlement.status === "CONFIRMED") {
      await settlement.populate("fromUserId", "firstName lastName username avatar")
      await settlement.populate("toUserId", "firstName lastName username avatar")
      return ok(res, settlement)
    }

    settlement.status = "CONFIRMED"
    settlement.confirmedAt = new Date()
    await settlement.save()

    await settlement.populate("fromUserId", "firstName lastName username avatar")
    await settlement.populate("toUserId", "firstName lastName username avatar")

    return ok(res, settlement)
  } catch (error) {
    return fail(res, error.message || "Server error", 500)
  }
})

module.exports = router
