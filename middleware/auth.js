const User = require("../models/users");
const { SECRET_TOKEN_KEY } = require("../SECRET_KEYS");
const jwt = require("jsonwebtoken");

const auth = async (request, response, next) => {
  try {
    const userToken = request.header("Authorization");
    
    const decoded = jwt.verify(
      userToken,
      Buffer.from(SECRET_TOKEN_KEY).toString("base64")
    );

    const user = await User.findOne({ _id: decoded._id });

    if (!user.token.includes(userToken)) {
      response.status(404).json({
        success: false,
        message: "You are not authorized to view this page",
      });
    } else {
      request.session.user_id = user._id;
      request.session.user = user;
      next();
    }
  } catch (e) {
    console.log(e);
    response.status(404).json({
      success: false,
      message: "You are not authorized to view this page",
    });
  }
};

module.exports = auth;
