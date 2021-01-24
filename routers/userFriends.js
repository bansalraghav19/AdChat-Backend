const express = require("express");
const Friends = require("../models/userFriends");
const User = require("../models/users");
const auth = require("../middleware/auth");

const router = new express.Router();

router.get("/getfriends", auth, async (request, response) => {
  try {
    const userFriends = await Friends.findOne({
      email: request.session.user.email,
    });
    response.status(200).json({
      success: true,
      data: userFriends,
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      message: "server timeout",
    });
  }
});

router.get("/friend/:id", auth, async (request, response) => {
  try {
    const userId = request.params.id;
    const requestedUser = await User.findOne({ userId });
    const curUserFriends = await Friends.findOne({
      email: request.session.user.email,
    });
    const check = curUserFriends.friendsList.find(
      (element) => element.email === requestedUser.email
    );
    if (!check) {
      response.status(400).json({
        success: false,
        message: "request user is not your friend",
      });
    } else {
      requestedUser.password = undefined;
      requestedUser.socket_id = undefined;
      requestedUser.token = undefined;
      requestedUser.notification = undefined;
      response.status(200).json({
        success: true,
        data: requestedUser,
      });
    }
  } catch (error) {
    response.status(500).json({
      success: false,
      message: "server timeout",
    });
  }
});

module.exports = router;
