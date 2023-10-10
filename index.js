const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const { Server } = require("socket.io");
const cors = require("cors");
require('dotenv').config();

const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");

const router = require("./router");
const { log } = require("console");

const app = express();
const server = http.createServer(app);
// const io = socketio(server);

const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};

app.use(cors());
app.use(router);

const io = new Server(server, {
  cors: corsOptions,
});



io.on("connect", (socket) => {
  socket.on("join", ({ name, room }, callback) => {
    console.log("You have a new connection");
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.join(user.room);

    socket.emit("message", {
      user: "admin",
      text: `${user.name}! Welcome to room, ${user.room}.`,
    });
    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name} has joined!` });

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", { user: user.name, text: message });
    }

    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    console.log("user left");

    if (user) {
      io.to(user.room).emit("message", {
        user: "Admin",
        text: `${user.name} has left.`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(process.env.PORT || 5000, () =>
  console.log(`Server has started.`)
  );
