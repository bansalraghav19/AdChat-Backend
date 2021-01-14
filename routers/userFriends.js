const express = require("express");
const Friends = require("../models/userFriends");
const auth = require("../middleware/auth");

const router = new express.Router();

router.post("./addfriend", auth, (request, response) => {
  try {
  } catch (error) {}
});
