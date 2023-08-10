// const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const CryptoJS = require("crypto-js");
const path = require("path");
// const fetch = require("node-fetch");

// const app = express();

const httpServer = createServer(async (req, res) => {
  //set the request route
  // if (req.url === "/api" && req.method === "GET") {
  //   fetch("https://jsonplaceholder.typicode.com/todos/1")
  //     .then((response) => response.json())
  //     .then((json) => {
  //       console.log(json);
  //       //response headers
  //       res.writeHead(200, { "Content-Type": "application/json" });
  //       //set the response
  //       res.write(JSON.stringify(json));
  //       //end the response
  //       res.end();
  //       return;
  //     });
  // }
});

// Static Middleware
// app.use(".", express.static(__dirname));
// Not reqd for current Heroku Netlify setup
// app.use(express.static(__dirname));

// app.get("/", function (req, res, next) {
//   console.log("came here");

//   if (process.env.NODE_ENV) {
//     res.sendFile(path.join(__dirname, "/index.html"), (err) => {
//       console.log("Error in accessing static resources");
//       res.end(err.message);
//     });
//   } else {
//     res.send("dev mode only");
//   }
// });

const uuid = require("uuid");

const users = {};
const rooms = {};

// const Securitykey = generateKey();
let Securitykey = "";

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

function generateKey2(randomText) {
  const hash = CryptoJS.SHA256(randomText);
  return hash.toString(CryptoJS.enc.Base64);
}

const io = new Server(httpServer, {
  /* options */
  maxHttpBufferSize: 1e8,
  cors: {
    // origin: "*", //only for localhost
    origin: /chattalk.netlify.app$/,
  },
});

const new_message_handler = (_data, socket) => {
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

  // for room comment foll
  // if (!data.to || !users[data.to]) {
  //   console.log("Error: Recipient unavailable");
  //   console.log("===========================");
  //   return;
  // }

  // console.log(data);

  const encryptedText = encryptText(JSON.stringify(data));
  // console.log(
  //   "encrypted text:",
  //   Buffer.from(encryptedText).toString("base64")
  // );

  // personal chat
  // io.to(users[data.to].id).emit("new_message", encryptedText);

  // console.log(rooms, data.toRoom, rooms[data.toRoom]);

  // room chat
  // io.to(data.toRoom).emit("new_message", encryptedText);
  socket.broadcast.to(data.toRoom).emit("new_message", encryptedText);
}

const new_image_handler = (_data, socket) => {
  // console.log("_data", _data);

  // for perf checking
  // const dt = new Date();
  // console.log(dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds());

  // for perf checking end

  let data = decryptText(_data);
  // let data = _data;

  // console.log(data);

  try {
    data = JSON.parse(data);
  } catch (err) {
    console.log("Error parsing the data");
    console.log("===========================");
    return;
  }

  // for room comment foll
  // if (!data.to || !users[data.to]) {
  //   console.log("Error: Recipient unavailable");
  //   console.log("===========================");
  //   return;
  // }

  // console.log(data);

  const encryptedText = encryptText(JSON.stringify(data));
  // const encryptedText = data;
  // console.log(
  //   "encrypted text:",
  //   Buffer.from(encryptedText).toString("base64")
  // );

  // personal chat
  // io.to(users[data.to].id).emit("new_message", encryptedText);

  console.log(rooms, data.toRoom, rooms[data.toRoom]);

  // room chat
  // io.to(data.toRoom).emit("new_message", encryptedText);
  socket.broadcast.to(data.toRoom).emit("new_image", encryptedText);
}

io.on("connection", (socket) => {
  console.log(socket.id);

  const { user, room } = socket.handshake.query;

  if (!user || !room) {
    socket?.disconnect()
    return;
  }

  // new change

  console.log('in new change')

  if(socket.uuserId) {
    console.log('existing')
    console.log(socket.uuserId)
  } else {
    socket.uuserId = uuid.v4().substring(8)
  }

  let _room = rooms[`${room}`]
  
  if (_room && _room[`${user}`] && !socket.uuserId) {
    console.log('already exists')
    socket?.disconnect()
    return;
  }
  
  rooms[room] = {
    ...rooms[room],
    // [`${socket.id}`]: user,
    // [`${socket.uuserId}`]: user
    [`${user}`]: socket.uuserId
  };

  // new change end


  console.log(rooms);

  // braodcast to room that user is conn

  socket.broadcast.to(room).emit("new_user", {newUser: user});

  // join to room
  socket.join(room);

  // const encryptedText = encryptText(JSON.stringify(data));

  Securitykey = generateKey2(room);

  // console.log(Securitykey);

  // send room specific server pub key to clients
  io.to(socket.id).emit("_", {
    publicKey: Securitykey,
    uuserId: socket.uuserId
  });


  socket.on("new_message", (_data)=> {
    new_message_handler(_data, socket)
  });

  socket.on("new_image", (_data)=> {
    new_image_handler(_data, socket)
  });

  socket.on("disconnect", (d) => {
    const { user, room } = socket.handshake.query;
    console.log("user disconnected", user, room, d);
  
    const _room = rooms[`${room}`]
    console.log(_room)
    delete _room[`${user}`]
    socket.broadcast.to(room).emit("user_exit", {userExit: user});
    console.log(_room)

  });
});

io.engine.generateId = (req) => {
  return uuid.v4(); // must be unique across all Socket.IO servers
};

const port = process.env.PORT || 3030;

httpServer.listen(port, () => {
  console.log("server running on: ", process.env.hostname || "localhost", port);
});
