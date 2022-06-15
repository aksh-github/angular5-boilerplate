
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const CryptoJS = require("crypto-js");
const path = require("path");

const app = express();

const httpServer = createServer(app);

// Static Middleware
// app.use(".", express.static(__dirname));
app.use(express.static(__dirname));

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

const uuid = require("uuid");

const users = {};

const Securitykey = generateKey();

function encryptText(plainData) {
  return CryptoJS.AES.encrypt(plainData, Securitykey).toString();
}

function decryptText(ciphertext) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, Securitykey);
  return bytes.toString(CryptoJS.enc.Utf8);
}

function generateKey() {
  const salt = CryptoJS.lib.WordArray.random(128 / 8);
  const key = CryptoJS.PBKDF2("SIsThisSecureEnough11!", salt, {
    keySize: 256 / 32,
  });

  console.log(CryptoJS.enc.Hex.stringify(key));
  return CryptoJS.enc.Hex.stringify(key);
}

const io = new Server(httpServer, {
  /* options */
  cors: {
    origin: /\.chattalk.netlify.app$/
  },
});

io.on("connection", (socket) => {
  console.log(socket.id);

  const { user } = socket.handshake.query;

  // users[socket.id] = {};
  users[user] = {
    id: socket.id,
  };

  // const encryptedText = encryptText(JSON.stringify(data));

  // send server pub key to clients
  io.to(socket.id).emit("_", {
    publicKey: Securitykey,
  });

  // 3516b3932a0cc967632a8ef9816d137664b26f349cd89c4300b4049dc84cfeb6

  socket.on("_", (data) => {
    console.log("_");

    // console.log(users);

    // users[data.user].publicKey = data.publicKey;

    // console.log(users)
  });

  socket.on("new_message", (_data) => {
    // console.log("_data", _data);

    let data = decryptText(_data);

    // console.log(data);

    try {
      data = JSON.parse(data);
    } catch (err) {
      console.log("Error parsing the data");
      console.log("===========================");
      return;
    }

    if (!data.to || !users[data.to]) {
      console.log("Error: Recipient unavailable");
      console.log("===========================");
      return;
    }

    // console.log(data);

    const encryptedText = encryptText(JSON.stringify(data));
    // console.log(
    //   "encrypted text:",
    //   Buffer.from(encryptedText).toString("base64")
    // );

    io.to(users[data.to].id).emit("new_message", encryptedText);
  });

  socket.on("disconnect", (d) => {
    console.log("user disconnected", socket.id);
    users[socket.id] = null;
    delete users[socket.id];
  });
});

io.engine.generateId = (req) => {
  return uuid.v4(); // must be unique across all Socket.IO servers
};

httpServer.listen(process.env.PORT || 7000, () => {
  console.log("server running on: ", process.env.hostname || "localhost", process.env.PORT || 7000);
});
