const express = require("express");
const Room = require("../models/rooms");
const auth = require("../middleware/auth");

const router = new express.Router();

router.get("/roominfo/:id", auth, async (request, response) => {
  try {
    const roomId = request.params.id;
    const roomInfo = await Room.findOne({ roomId });
    if (!roomInfo) {
      response.status(400).json({
        success: false,
        message: "No room found",
      });
    } else {
      response.status(200).json({
        success: true,
        data: roomInfo,
      });
    }
  } catch (error) {
    response.status(502).json({
      success: false,
      message: "Oops problem with network",
    });
  }
});

module.exports = router;
