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
    default: "dummy.jpg",
  },
  token: {
    type: Array,
  },
  notification: {
    type: Array,
  },
});

module.exports = User;
