const express = require("express");
const http = require("http");
const cors = require("cors");
const Friends = require("./models/userFriends");
const User = require("./models/users");
const { SECRET_SESSION_KEY } = require("./SECRET_KEYS");

const session = require("express-session");

const app = express();
const server = http.createServer(app);

const socketio = require("socket.io");

const io = socketio(server);

// database connection
require("./db/mongoose");

app.use(express.json());
app.use(cors());
app.use(
  session({
    secret: SECRET_SESSION_KEY,
    resave: false,
    saveUninitialized: true,
  })
);

const PORT = process.env.PORT;

const userRouter = require("./routers/users");
app.use(userRouter);

let user_id = null,
  Email = null;

io.on("connection", (socket) => {
  socket.on("join", async ({ _id, email }) => {
    if (_id) {
      user_id = _id;
      Email = email;
      await User.findByIdAndUpdate(_id, {
        socket_id: socket.id,
      });
    }
  });
  socket.on("addfriend", async ({ email, message, name }) => {
    try {
      const friendsList = await Friends.findOne({ email: Email });
      const friendUser = await User.findOne({ email });
      const friendNotFriends = await Friends.findOne({ email });
      if (!friendUser) {
        socket.emit("addfriendr", {
          success: false,
          messageStatus: 0,
        });
      } else {
        console.log(Email, email);
        let isDone = true;
        if (friendsList) {
          const list = friendsList.friendsList;
          list.forEach((element) => {
            if (element.email === email) {
              isDone = false;
              socket.emit("addfriendr", {
                success: false,
                messageStatus: 1,
              });
            }
          });
          friendsList.unmappedFriends.forEach((element) => {
            if (element.email === Email) {
              isDone = false;
              socket.emit("addfriendr", {
                success: false,
                messageStatus: 3,
              });
            }
          });
        }
        if (friendNotFriends) {
          friendNotFriends.unmappedFriends.forEach((element) => {
            if (element.email === Email) {
              isDone = false;
              socket.emit("addfriendr", {
                success: false,
                messageStatus: 2,
              });
            }
          });
        }
        if (isDone) {
          friendNotFriends.unmappedFriends.push({
            email: Email,
            message,
            name,
          });
          socket.emit("addfriendr", {
            success: true,
            messageStatus: "done",
          });
          if (friendUser.socket_id === "") {
            friendNotFriends.notification.push({
              email: Email,
              message,
              name,
              typerequest: 1,
            });
          } else {
            socket.broadcast.to(friendUser.socket_id).emit("notification", {
              type: 1,
              email: Email,
              message,
              name,
            });
          }
          await friendNotFriends.save();
        }
      }
    } catch (error) {}
  });
  socket.on("disconnect", async () => {
    try {
      await User.findByIdAndUpdate(user_id, {
        socket_id: "",
      });
    } catch (error) {}
  });
});

server.listen(PORT, () => {
  console.log(`Server Running at Port ${PORT}`);
});
