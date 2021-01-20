const express = require("express");
const User = require("../models/users");
const Friends = require("../models/userFriends");
const { SECRET_TOKEN_KEY, SENDGRID_API_KEY } = require("../SECRET_KEYS");
const { generateOTP, hashString, messgaeTemplate } = require("../lib/helpers");
const bcrypt = require("bcrypt");
const auth = require("../middleware/auth");
const sgMail = require("@sendgrid/mail");
const jwt = require("jsonwebtoken");

const router = new express.Router();
sgMail.setApiKey(SENDGRID_API_KEY);

router.post("/register", async (request, response) => {
  try {
    const userInfo = request.body;
    const user = await User.findOne({ email: userInfo.email });
    if (user) {
      response.status(409).json({
        success: false,
        message: "User Exists",
      });
    } else {
      userInfo.email = userInfo.email.toLowerCase();
      const FriendLists = new Friends({ email: userInfo.email });
      const newUser = new User(userInfo);
      const hashedPassword = await bcrypt.hash(newUser.password, 8);
      newUser.password = hashedPassword;
      const userId = await hashString(userInfo.email);
      newUser.userId = userId;
      const userToken = jwt.sign(
        { _id: newUser._id.toString() },
        Buffer.from(SECRET_TOKEN_KEY).toString("base64")
      );
      newUser.token.push(userToken);
      await newUser.save();
      await FriendLists.save();
      response.status(200).json({
        success: true,
        data: newUser,
      });
    }
  } catch (err) {
    console.log(err);
    response.status(400).json({
      success: false,
      message: "There was a problem with network",
    });
  }
});

router.post("/login", async (request, response) => {
  try {
    const userInfo = request.body;
    const user = await User.findOne({ email: userInfo.email.toLowerCase() });
    const isMatch = await bcrypt.compare(userInfo.password, user.password);
    if (!isMatch) {
      response.status(401).json({
        success: false,
        message: "User not Registered",
      });
    } else {
      const userToken = jwt.sign(
        { _id: user._id },
        Buffer.from(SECRET_TOKEN_KEY).toString("base64")
      );
      user.token.push(userToken);
      if (user.token.length > 2) {
        user.token.shift();
      }
      await user.save();
      response.status(200).json({
        success: true,
        data: user,
      });
    }
  } catch (err) {
    response.status(401).json({
      success: false,
      message: "User not Registered",
    });
  }
});

router.post("/checkUser", async (request, response) => {
  try {
    const user = await User.findOne({
      email: request.body.email.toLowerCase(),
    });
    if (!user) {
      response.status(200).json({
        success: true,
        data: {
          isAvailable: false,
        },
      });
    } else {
      response.status(200).json({
        success: true,
        data: {
          isAvailable: true,
        },
      });
    }
  } catch (e) {
    response.status(404).json({
      success: false,
      message: "There was a problem with network",
    });
  }
});

router.post("/verifyotp", async (request, response) => {
  try {
    const OTP = generateOTP();
    console.log(OTP);
    const message = messgaeTemplate(request.body.email.toLowerCase(), OTP);
    const hashedOtp = await hashString(OTP);
    await sgMail.send(message);
    response.status(200).json({
      success: true,
      data: {
        OTP: hashedOtp,
      },
    });
  } catch (error) {
    response.status(404).json({
      success: false,
      message: "There was a problem with network",
    });
  }
});

router.get("/user", auth, async (request, response) => {
  let userInfo = request.session.user;
  response.status(200).json({
    success: true,
    data: userInfo,
  });
});

router.put("/edituser", auth, async (request, response) => {
  try {
    const updatedInfo = request.body;
    const user = await User.findByIdAndUpdate(
      request.session.user_id,
      updatedInfo,
      {
        new: true,
      }
    );
    response.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    response.status(404).json({
      success: false,
      error: err.error,
    });
  }
});

router.get("/logout", auth, async (request, response) => {
  try {
    const user = await User.findOne({ _id: request.session.user_id });
    delete request.session.user_id;
    delete request.session.user;
    const userToken = request.header("Authorization");
    user.token.remove(userToken);
    user.socket_id = "";
    await user.save();
    response.status(200).json({
      success: true,
      message: "Logout Success",
    });
  } catch (err) {
    response.status(404).json({
      success: false,
      error: err.error,
    });
  }
});

module.exports = router;
