const express = require("express");
const User = require("../models/users");
const Friends = require("../models/userFriends");
const { SECRET_TOKEN_KEY, SENDGRID_API_KEY } = require("../SECRET_KEYS");
const { generateOTP, hashString, messgaeTemplate } = require("../lib/helpers");
const bcrypt = require("bcrypt");
const auth = require("../middleware/auth");
const sgMail = require("@sendgrid/mail");
const { v4: uuidv4 } = require("uuid");
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
      newUser.userId = uuidv4();
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
    const OTP = "112233";
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
  userInfo.password = undefined;
  userInfo.token = undefined;
  userInfo.socket_id = undefined;
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
    await Friends.updateMany(
      { "friendsList.email": user.email },
      {
        $set: {
          "friendsList.$.user_image": user.user_image,
          "friendsList.$.name": user.name,
        },
      },
      { multi: true }
    );
    await Friends.updateMany(
      { "unmappedFriends.email": user.email },
      {
        $set: {
          "unmappedFriends.$.user_image": user.user_image,
          "unmappedFriends.$.name": user.name,
        },
      },
      { multi: true }
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

router.put("/changepassword", auth, async (request, response) => {
  try {
    const user = await User.findOne({ _id: request.session.user_id });
    const isMatch = await bcrypt.compare(request.body.password, user.password);
    if (!isMatch) {
      response.status(201).json({
        success: false,
        data: {
          message: "Wrong current Password entered",
        },
      });
    } else {
      const hashedPassword = await bcrypt.hash(request.body.newPassword, 8);
      user.password = hashedPassword;
      await user.save();
      response.status(201).json({
        success: true,
        data: {
          message: "Password Changed",
        },
      });
    }
  } catch (error) {
    response.status(502).json({
      success: false,
      message: "There was some problem, try again",
    });
  }
});

router.post("/resetpassword", async (request, response) => {
  try {
    const user = await User.findOne({
      email: request.body.email.toLowerCase(),
    });
    const hashedPassword = await bcrypt.hash(request.body.password, 8);
    user.password = hashedPassword;
    await user.save();
    response.status(201).json({
      success: true,
      data: {
        message: "Password Changed",
      },
    });
  } catch (error) {
    response.status(502).json({
      success: false,
      message: "There was some problem, try again",
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
