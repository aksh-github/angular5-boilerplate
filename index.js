

const express = require("express");
const server = require("http").createServer();
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

const app = express();

app.use(express.static(__dirname));
// app.use(cors())

app.get("/", function (req, res, next) {
  console.log("came here", process.env.NODE_ENV);

  if (process.env.NODE_ENV=="production") {
    res.sendFile(path.join(__dirname, "web", "index.html"), (err) => {
      console.log("Error in accessing static resources");
      res.end(err?.message);
    });
  } else {
    res.send("dev mode only");
  }
});

const PORT = 4000;
const NEW_CHAT_MESSAGE_EVENT = "newChatMessage";

io.on("connection", (socket) => {
  console.log(`Client ${socket.id} connected`);

  // Join a conversation
  const { roomId } = socket.handshake.query;
  socket.join(roomId);

  // Listen for new messages
  socket.on(NEW_CHAT_MESSAGE_EVENT, (data) => {
    io.in(roomId).emit(NEW_CHAT_MESSAGE_EVENT, data);
  });

  // Leave the room if the user closes the socket
  socket.on("disconnect", () => {
    console.log(`Client ${socket.id} diconnected`);
    socket.leave(roomId);
  });
});

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
