const express = require("express");
const http = require("http");
const cors = require("cors");
const Friends = require("./models/userFriends");
const User = require("./models/users");
const { SECRET_SESSION_KEY } = require("./SECRET_KEYS");

const session = require("express-session");
const sharedsession = require("express-socket.io-session");

const app = express();
const server = http.createServer(app);

const socketio = require("socket.io");

const io = socketio(server);

// database connection
require("./db/mongoose");

const sessionMiddleware = session({
  secret: SECRET_SESSION_KEY,
  resave: false,
  saveUninitialized: true,
});

app.use(express.json());
app.use(cors());
app.use(sessionMiddleware);
io.use(sharedsession(sessionMiddleware));

const PORT = process.env.PORT || 5000;

const userRouter = require("./routers/users");
app.use(userRouter);

const dashBoardRouter = require("./routers/userFriends");
app.use(dashBoardRouter);

io.on("connection", (socket) => {
  socket.on("join", async ({ _id, email, name }) => {
    try {
      if (_id) {
        socket.handshake.session._id = _id;
        socket.handshake.session.email = email;
        socket.handshake.session.name = name;
        await User.findByIdAndUpdate(_id, {
          socket_id: socket.id,
        });
      }
    } catch (error) {
      console.log(error);
    }
  });
  socket.on("addfriend", async ({ email, message }) => {
    try {
      const recieverProfile = await User.findOne({ email });
      if (socket.handshake.session.email === email) {
        socket.emit("addfriendresponse", {
          success: false,
          messageStatus: `You cannot send request to yourself`,
        });
        return;
      }
      if (!recieverProfile) {
        socket.emit("addfriendresponse", {
          success: false,
          messageStatus: `${email} is not registered on AdChat`,
        });
      } else {
        const curUserEmail = socket.handshake.session.email;
        const curUserFriends = await Friends.findOne({
          email: curUserEmail,
        });
        const recieverFriends = await Friends.findOne({ email });
        {
          const common = curUserFriends.friendsList.find(
            (element) => element.email === email
          );
          if (common) {
            socket.emit("addfriendresponse", {
              success: false,
              messageStatus: `${email} is already your friend`,
            });
            return;
          }
        }
        {
          const common = recieverFriends.unmappedFriends.find(
            (element) => element.email === curUserEmail
          );
          console.log(recieverFriends);
          if (common) {
            socket.emit("addfriendresponse", {
              success: false,
              messageStatus: `you have already sended request to ${email}`,
            });
            return;
          }
        }
        {
          const common = curUserFriends.unmappedFriends.find(
            (element) => element.email === email
          );
          if (common) {
            socket.emit("addfriendresponse", {
              success: false,
              messageStatus: `${email} has already send you send. To accept go to notification tab`,
            });
            return;
          }
        }
        {
          recieverFriends.unmappedFriends.push({
            email: curUserEmail,
            message,
            name: socket.handshake.session.name,
          });
          socket.emit("addfriendresponse", {
            success: true,
            messageStatus: "Friend Request Sent",
          });
          if (recieverProfile.socket_id === "") {
            recieverProfile.notification.push({
              email: curUserEmail,
              message,
              name: socket.handshake.session.name,
              typerequest: 1,
            });
          } else {
            socket.broadcast
              .to(recieverProfile.socket_id)
              .emit("notification", {
                type: 1,
                email: curUserEmail,
                message,
                name: socket.handshake.session.name,
              });
          }
          await recieverFriends.save();
        }
      }
    } catch (error) {
      console.log(error);
    }
  });
  socket.on('accepted', async ({ email }) => {

  })
  socket.on('declined', async ({ email }) => {
    
  })
  socket.on("disconnect", async () => {
    try {
      const user = await User.findByIdAndUpdate(
        socket.handshake.session._id,
        {
          socket_id: "",
        },
        { new: true }
      );
    } catch (error) {
      console.log(error);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server Running at Port ${PORT}`);
});
