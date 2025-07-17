const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const { generateMessage, generateLocationMessage } = require("./utils/messages");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

require("dotenv").config();

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

io.on("connection", socket => {
  console.log("New WebSocket connection");

  socket.on("join", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });
    if (error) {
      return callback(error);
    } else {
      socket.join(user.room);

      socket.emit("message", generateMessage("Admin", "Welcome!"));
      socket.broadcast.to(user.room).emit("message", generateMessage("Admin", `${user.username} has joined!`));
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
      console.log("Hello!");
      callback();
    }
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();

    filter.includesUs = (str) => str.toLowerCase().includes('us');

    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed!");
    } else if (filter.includesUs(message)) {
      return callback("The string contains 'us'")
    } else {
      io.to(user.room).emit("message", generateMessage(user.username, message));
      callback();
    }
    console.log("Successfully send a message");
  });

  socket.on("sendLocation", (coords, callback) => {
    console.log(coords)
    if ( 4 < coords.latitude && coords.latitude < 53 && 73 < coords.longitude && coords.longitude < 135) {
      console.log("Here is China!!!")
    }
    const user = getUser(socket.id);
    io.to(user.room).emit("locationMessage", generateLocationMessage(user.username, `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`));
    console.log("Successfully send a location");
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", generateMessage("Admin", `${user.username} has left!`));
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    }
    console.log("Successfully disconnect");
  });
});

server.listen(port, () => {
  console.log(`Server is up on port ${port}!`);
});
