const express = require("express");
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const Friends = require("./models/userFriends");
const User = require("./models/users");
const Rooms = require("./models/rooms");
const { SECRET_SESSION_KEY } = require("./SECRET_KEYS");
const PORT = process.env.PORT || 5000;

const session = require("express-session");
const sharedsession = require("express-socket.io-session");

const app = express();
const server = http.createServer(app);

const socketio = require("socket.io");

const io = socketio(server, {
  cors: true,
  origins: ["https://advchatapp.herokuapp.com/"],
});

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
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

const userRouter = require("./routers/users");
app.use(userRouter);

const dashBoardRouter = require("./routers/userFriends");
app.use(dashBoardRouter);

const roomsRouter = require("./routers/roomChat");
app.use(roomsRouter);

io.on("connection", (socket) => {
  socket.on("join", async ({ _id, email, name }) => {
    try {
      if (_id) {
        socket.handshake.session._id = _id;
        socket.handshake.session.email = email;
        socket.handshake.session.name = name;
        socket.handshake.session.user = await User.findByIdAndUpdate(
          _id,
          {
            socket_id: socket.id,
          },
          { new: true }
        );
        const userFriends = await Friends.findOne({ email });
        const allRooms = userFriends.friendsList.map((friend) => friend.roomId);
        socket.join(allRooms);
      }
    } catch (error) {
      console.log(error);
    }
  });
  socket.on("addfriend", async ({ email, message }) => {
    try {
      email = email.toLowerCase();
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
            user_image: socket.handshake.session.user.user_image,
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
              .emit("refershFriends");
            socket.broadcast
              .to(recieverProfile.socket_id)
              .emit("notification", {
                message: `${socket.handshake.session.email} send you friend Request`,
              });
          }
          await recieverFriends.save();
        }
      }
    } catch (error) {
      console.log(error);
    }
  });
  socket.on("accepted", async ({ email }) => {
    const currentFriends = await Friends.findOne({
      email: socket.handshake.session.email,
    });
    const acceptedUser = await User.findOne({ email });
    const currentUser = socket.handshake.session.user;
    const acceptedUserFriends = await Friends.findOne({ email });
    const newUnmapped = currentFriends.unmappedFriends.filter(
      (friend) => friend.email !== email
    );
    currentFriends.unmappedFriends = newUnmapped;
    const roomId = uuidv4();
    currentFriends.friendsList.push({
      email,
      name: acceptedUser.name,
      userId: acceptedUser.userId,
      user_image: acceptedUser.user_image,
      roomId,
    });
    acceptedUserFriends.friendsList.push({
      email: currentUser.email,
      name: currentUser.name,
      userId: currentUser.userId,
      user_image: currentUser.user_image,
      roomId,
    });
    const newRoom = new Rooms({
      roomId,
      messages: [],
    });
    await newRoom.save();
    await currentFriends.save();
    await acceptedUserFriends.save();
    socket.emit("refershFriends");
    if (acceptedUser.socket_id !== "") {
      socket.broadcast.to(acceptedUser.socket_id).emit("refershFriends");
      socket.broadcast.to(acceptedUser.socket_id).emit("notification", {
        message: `${socket.handshake.session.email} accepted your friend Request`,
        name: socket.handshake.session.name,
        typerequest: 200,
      });
      socket.join(roomId);
    } else {
      acceptedUser.notification.push({
        message: `${socket.handshake.session.email} accepted your friend Request`,
        name: socket.handshake.session.name,
        typerequest: 200,
      });
      await acceptedUser.save();
    }
  });
  socket.on("declined", async ({ email }) => {
    try {
      console.log(email);
      const currentFriends = await Friends.findOne({
        email: socket.handshake.session.email,
      });
      const rejectedUser = await User.findOne({ email });
      const newUnmapped = currentFriends.unmappedFriends.filter(
        (friend) => friend.email !== email
      );
      currentFriends.unmappedFriends = newUnmapped;
      await currentFriends.save();
      socket.emit("refershFriends");
      if (rejectedUser.socket_id !== "") {
        socket.broadcast.to(rejectedUser.socket_id).emit("notification", {
          message: `${socket.handshake.session.email} rejected your friend Request`,
          name: socket.handshake.session.name,
          typerequest: -1,
        });
      } else {
        rejectedUser.notification.push({
          message: `${socket.handshake.session.email} rejected your friend Request`,
          name: socket.handshake.session.name,
          typerequest: -1,
        });
        await rejectedUser.save();
      }
    } catch (error) {
      console.log(error);
    }
  });
  socket.on("sendMessage", async ({ roomId, message }) => {
    try {
      socket.broadcast
        .to(roomId)
        .emit("revieveMessage", { ...message, roomId });
      socket.broadcast
        .to(roomId)
        .emit("notification", { message: "New Message" });
      const room = await Rooms.findOne({ roomId });
      room.messages.push(message);
      await room.save();
    } catch (error) {
      console.log(error);
    }
  });
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
