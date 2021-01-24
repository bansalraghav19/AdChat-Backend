const mongoose = require("mongoose");

const ChatRoom = new mongoose.model("room", {
  roomId: {
    type: String,
  },
  messages: {
    type: Array,
  },
});

module.exports = ChatRoom;

/*

room: {
    roomId,
    messages: {
        from: email,
        message: text
        createdAt: time(moment)
    }
}

*/
