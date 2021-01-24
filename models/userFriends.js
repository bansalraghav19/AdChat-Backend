const mongoose = require("mongoose");

const UserFriends = new mongoose.model("userfriend", {
  email: {
    type: String,
    required: true,
  },
  friendsList: {
    type: Array,
    default: [],
  },
  unmappedFriends: {
    type: Array,
    default: [],
  },
});

module.exports = UserFriends;

/*

friendList:: {
  email: String,
  name: String, 
  photoLink: String,
  lastMessage: String,
  time: String,
  room_id: String,
  number_of_unread: number,
  last_chat: [
    max: 1000
  ]
}

unmappedFriends {
  email: String, 
  name: String,
  message: String,
  user_image: String,
}

*/
