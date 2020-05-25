const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const http = require('http').createServer(app);
const io = require('socket.io')(http);

const axios = require('axios');

// const io = require('socket.io')(8734, {
//   // path: '/test',
//   serveClient: false,
//   // below are engine.IO options
//   // pingInterval: 10000,
//   // pingTimeout: 5000,
//   // cookie: false
// });

http.listen(8734, () => {
  console.log('listening on *:8734');
});

var clients = {};

app.all('/reboot', (req, res) => {
  console.log("reboot");
  console.log(req.body);
  let hostnames = req.body.clients;
  for(let i = 0; i < hostnames.length; i++) {
    let client = clients[hostnames[i]];
    if(client && client.connected) {
      client.socket.emit("reboot");
      res.send("Client is going to reboot")
    } else {
      res.send("The client was not found")
    }
  }
});

app.all('/pools/:pool', (req, res) => {
  console.log("Add to pool");
  console.log(req.params);
  let pool = req.params.pool;
  console.log(req.body);
  let hostnames = req.body.clients;

  for(let i = 0; i < hostnames.length; i++) {
    let client = clients[hostnames[i]];
    if(client && client.connected) {
      client.socket.emit("changePool", pool);
    }
  }
  // let client = clients[req.params.hostname]
  // if(client) {
  //   client.socket.emit("reboot");
  // }
  res.send("Clients are added to the pool")
});

io.on('connection', (socket) => {
  socket.emit('getHostname');

  socket.on('setHostname', (data) => {
    socket.clientId = data;
    if(data in clients) {
      clients[data].socket = socket;
      clients[data].connected = true;
    } else {
      let client = {
        socket: socket,
        hostname: data,
        connected: true
      };
      console.log(`a client connected: ${data}`);
      clients[data] = client;
    }

    console.log(`${Object.keys(clients).length} clients connected`);
  });

  socket.on('disconnect', () => {
    if(socket.clientId in clients) {
      console.log('a client disconnected');
      clients[socket.clientId].socket = undefined;
      clients[socket.clientId].connected = false;
    } else {
      console.error("an unregistered client disconnected");
    }
  });
});

setInterval(() => {
  console.log("Check for clients without free slots");
  axios.get("http://tractor/Tractor/monitor?q=blades")
    .then((response) => {
      let blades = response.data.blades;
      for(let i = 0; i < blades.length; i++) {
        if(blades[i].note == "no free slots (1)" && blades[i].as == 1) {
          let hostname = blades[i].hnm;
          console.log(hostname);
          let client = clients[hostname]
          if(client && client.connected) {
            client.socket.emit("freeSlots");
          }
        }
      }
    })
    .catch(function (error) {
       // handle error
       console.log(error);
     })
}, 1000 * 60 * 15);
