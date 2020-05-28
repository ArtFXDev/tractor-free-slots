const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const log = console.log;
const chalk = require('chalk');

const http = require('http').createServer(app);
const io = require('socket.io')(http);

const axios = require('axios');

var tsid = undefined;

http.listen(8734, () => {
  console.log('listening on *:8734');
});

axios.get('http://tractor/Tractor/monitor?q=login&user=root')
.then(function (response) {
  // handle success
  tsid = response.data.tsid;
  console.log(tsid);
})
.catch(function (error) {
  // handle error
  console.log("-------------------- ERROR TSID ----------------------------");
})

var clients = {};

app.all('/reboot', (req, res) => {
  console.log("reboot");
  console.log(req.body);
  let hostnames = req.body.clients;
  for(let i = 0; i < hostnames.length; i++) {
    let client = clients[hostnames[i]];
    if(client && client.connected) {
      client.socket.emit("reboot");
      res.send({message: `${hostnames[i]} is going to reboot`});
    } else {
      res.send({error: "The client was not found " + hostnames[i]});
    }
  }
});

app.all('/reboot/all', (req, res) => {
  console.log("Reboot all clients");
  for(let hostname in clients) {
    let client = clients[hostname];
    if(client && client.connected) {
      client.socket.emit("reboot");
    }
  }
  res.send("All clients are rebooting");
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
  res.send("Clients are added to the pool")
});

app.all('/client/:client', (req, res) => {
  console.log("Check client status: " + req.params.client);
  let hostname = req.params.client;
  let data = {
    hostname: hostname,
  };
  axios.get(`http://tractor/Tractor/monitor?q=bdetails&b=${hostname}`)
    .then((response) => {
      data.pool = response.data.profile;
      data.ip = response.data.addr;
      if(hostname in clients) {
        data.connected = clients[hostname].connected;
        res.send(data);
      } else {
        data.error = "The client is not registered to the server";
        res.send(data);
      }
    })
    .catch(function (error) {
      // handle error
      // console.log(error);
      if(hostname in clients) {
        data.connected = clients[hostname].connected;
        res.send(data);
      } else {
        data.error = "The client is not registered to the server";
        res.send(data);
      }
    })
});

app.all('/kill/:job', (req, res) => {
  console.log("Kill Job: " + req.params.job);
  let job = req.params.job;
  axios.get(`http://tractor/Tractor/monitor?q=jtree&jid=${job}`)
    .then((response) => {
      let users = response.data.users;
      let key1 = Object.keys(users)[0];
      let key2 = Object.keys(users[key1])[0];
      let tree = users[key1][key2];

      rebootChildren(tree.children);

      axios.post(`http://tractor/Tractor/queue?q=jinterrupt&jid=${job}&tsid=${tsid}`)
        .then((response) => {
          console.log(response.data);
          res.send("Running clients are going to reboot");
        })
        .catch(function (error) {
          res.send("Running clients are going to reboot");
        })
    })
    .catch(function (error) {

    })
});

app.all('/list-missing', (req, res) => {
  axios.get("http://tractor/Tractor/monitor?q=blades")
    .then((response) => {
      let blades = response.data.blades;
      let missing = [];
      for(let i = 0; i < blades.length; i++) {
        if(!(blades[i].hnm in clients) || !clients[blades[i].hnm].connected) {
          if(!["gpu", "simu"].includes(blades[i].profile)) {
            missing.push(blades[i].hnm);
          }
        }
      }
      res.send(missing);
    })
    .catch(function (error) {

    })
});

io.on('connection', (socket) => {
  socket.emit('getHostname');

  socket.on('setHostname', (data) => {
    socket.clientId = data;
    if(data in clients) {
      clients[data].socket = socket;
      clients[data].connected = true;
      console.log(`client reconnected: ${data}`);
    } else {
      let client = {
        socket: socket,
        hostname: data,
        connected: true
      };
      console.log(`client connected: ${data}`);
      clients[data] = client;
    }

    let connectedNb = 0;
    for(let host in clients) {
      if(clients[host].connected) {
        connectedNb += 1;
      }
    }
    console.log(`${connectedNb}/${Object.keys(clients).length} clients connected`);
  });

  socket.on('disconnect', (reason) => {
    if(socket.clientId in clients) {
      log(`client disconnected: ${socket.clientId}`);
      log(chalk.red(reason));
      clients[socket.clientId].socket = undefined;
      clients[socket.clientId].connected = false;
      let connectedNb = 0;
      for(let host in clients) {
        if(clients[host].connected) {
          connectedNb += 1;
        }
      }
      console.log(`${connectedNb}/${Object.keys(clients).length} clients connected`);
    } else {
      console.error("an unregistered client disconnected");
    }
  });
});








const rebootChildren = (children) => {
  for(let i = 0; i < children.length; i++) {
    let child = children[i];
    rebootChildren(child.children);
    if(child.data.state == "+A") {
      let hostname = child.data.blade;
      let client = clients[hostname];
      if(client && client.connected) {
        log("Reboot: " + hostname);
        client.socket.emit("reboot");
      }
    }
  }
}









setInterval(() => {
  console.log("Check for clients without free slots");
  axios.get("http://tractor/Tractor/monitor?q=blades")
    .then((response) => {
      let blades = response.data.blades;
      for(let i = 0; i < blades.length; i++) {
        if(blades[i].note == "no free slots (1)" && blades[i].as == 1) {
          let hostname = blades[i].hnm;
          // console.log(hostname);
          let client = clients[hostname]
          if(client && client.connected) {
            console.log(hostname);
            client.socket.emit("freeSlots");
          } else {
            console.log("no free slot not connected: " + hostname);
          }
        }
      }
    })
    .catch(function (error) {
       // handle error
       console.log(error);
     })
}, 1000 * 60 * 3);
