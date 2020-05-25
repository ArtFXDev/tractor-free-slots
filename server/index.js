const io = require('socket.io')(8734, {
  // path: '/test',
  serveClient: false,
  // below are engine.IO options
  // pingInterval: 10000,
  // pingTimeout: 5000,
  // cookie: false
});

const axios = require('axios');

var clients = {};

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
  // axios.get("http://tractor/Tractor/monitor?q=blades")
  //   .then((response) => {
  //     let clients = response.data.blades;
      let hostname = "DESKTOP-NPQCVOP";
      let client = clients[hostname];
      client.socket.emit("freeSlots");
    // })
    // .catch(function (error) {
    //    // handle error
    //    console.log(error);
    //  })
}, 1000 * 60);
