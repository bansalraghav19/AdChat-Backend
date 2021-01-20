const mongoose = require("mongoose");

const User = new mongoose.model("user", {
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  about: {
    type: String,
    default: "",
  },
  password: {
    type: String,
    required: true,
  },
  socket_id: {
    type: String,
    default: "",
  },
  user_image: {
    type: String,
    default: "./dummy.png",
  },
  token: {
    type: Array,
  },
  notification: {
    type: Array,
  },
});

module.exports = User;
