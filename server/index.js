const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

var exec = require('child_process').exec;

const log = console.log;
const chalk = require('chalk');

const http = require('http').createServer(app);
const io = require('socket.io')(http);

const axios = require('axios');

var tsid = undefined;

http.listen(8734, () => {
  console.log('listening on *:8734');
});

const dbUrl = 'mongodb://renderfarmdb:27017';
var dbClient;
var db;

MongoClient.connect(dbUrl, {
   useUnifiedTopology: true
 }, (err, client) => {
  assert.equal(null, err);
  log("Connected successfully to Database");
  dbClient = client;
  db = client.db("artfx-tractor");

  const collection = db.collection('clients');

  collection.find({}).toArray(function(err, docs) {
    assert.equal(err, null);

    for(let i = 0; i < docs.length; i++) {
      if(!(docs[i].hostname in clients)) {
        clients[docs[i].hostname] = docs[i];
      } else {
        for(let key in docs[i]) {
          clients[docs[i].hostname][key] = docs[i][key];
        }
      }
    }
  });
});

const getClient = (hostname, cb) => {
  const collection = db.collection('clients');
  collection.findOne({"hostname": hostname}, (err, item) => {
    assert.equal(err, null);
    // log(chalk.magenta("Found the following client records:"))
    cb(item)
  });
}

const addClient = (hostname, cb) => {
  const collection = db.collection('clients');

  let doc = {
    "hostname": hostname
  }

  collection.insertOne(doc, (err) => {
    assert.equal(err, null);
    cb();
  });
}

const updateClient = (hostname, data, cb) => {
  const collection = db.collection('clients');

  collection.updateOne({ hostname: hostname }, { $set: data }, function(err, result) {
    assert.equal(err, null);
    assert.equal(1, result.result.n);
    cb(result);
  });
}






const logNbClientsConnected = () => {
  let connectedNb = 0;
  for(let host in clients) {
    if(clients[host].connected) {
      connectedNb += 1;
    }
  }
  log(`${connectedNb}/${Object.keys(clients).length} clients connected`);
}











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

app.all('/details', (req, res) => {
  let hostnames = req.body.clients;
  axios.get("http://tractor/Tractor/monitor?q=blades")
    .then((response) => {
      let blades = response.data.blades;
      let hosts = [];
      for(let i = 0; i < blades.length; i++) {
        if(hostnames.includes(blades[i].hnm)) {
          let blade = blades[i];
          hostnames.splice(hostnames.indexOf(blade.hnm), 1);
          let data = {
            hostname: blade.hnm,
            pool: blade.profile,
            ip: blade.addr
          }
          if(blade.hnm in clients) {
             data.connected = clients[blade.hnm].connected;
           } else {
             data.error = "The client is not registered to the server";
           }
           hosts.push(data);
        }
      }
      for(let i = 0; i < hostnames.length; i++) {
        let data = {
          hostname: hostnames[i]
        }
        if(hostnames[i] in clients) {
           data.connected = clients[hostnames[i]].connected;
         } else {
           data.error = "The client is not registered to the server";
         }
         hosts.push(data);
      }
      res.send(hosts);
    })
    .catch(function (error) {
       // handle error
       log(error);
     })
});

app.all('/update', (req, res) => {
  console.log("Update clients");
  for(let hostname in clients) {
    let client = clients[hostname];
    if(client && client.connected) {
      client.socket.emit("update");
    }
  }
  res.send("Clients are updating");
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

app.all('/create-job', (req, res) => {
  let command = 'C:\\"Program Files"\\Pixar\\Tractor-2.3\\bin\\tractor-spool.bat --help'
  exec(command, (error, stdout, stderr) => {
    if(error) {
      console.log(error);
    }
    log(chalk.cyan("Created Job"));
    log(chalk.cyan("-------------------------"));
    log(stdout);
    log(chalk.cyan("#########################"));
    res.send("Job Created");
  });
});

io.on('connection', (socket) => {
  socket.emit('getHostname');

  socket.on('setHostname', (data) => {
    socket.clientId = data.hostname;
    console.log("Client connected: " + data.hostname);
    if(data.version) {
      console.log("Version: " + data.version);
    }
    getClient(data, (item) => {
      if(item == null) {
        // log(chalk.yellow(`${data} is not registered in the database`));
        addClient(data, () => {
          // log(chalk.green(`${data} added to the database`));
          // axios.get(`http://tractor/Tractor/monitor?q=bdetails&b=${item.hostname}`)
          //   .then((response) => {
          //     let data = response.data;
          //     item.pool = data.profile;
          //     item.ip = data.addr;
          //     item.tractor = true;
          //     clients[item.hostname] = item;
          //     logNbClientsConnected();
          //     updateClient(item.hostname, {
          //       pool: item.pool,
          //       ip: item.ip,
          //       tractor: item.tractor
          //     }, (result) => {
          //
          //     });
          //   })
          //   .catch(function (error) {
          //      // handle error
          //      item.tractor = false;
          //      clients[item.hostname] = item;
          //      logNbClientsConnected();
          //      updateClient(item.hostname, {
          //        tractor: item.tractor
          //      }, (result) => {
          //
          //      });
          //    })
        });
      } else {
        // log(chalk.cyan(`${data} found in the database`));
        item.connected = true;
        item.socket = socket;
        if(!item.tractor) {
          axios.get(`http://tractor/Tractor/monitor?q=bdetails&b=${item.hostname}`)
            .then((response) => {
              let data = response.data;
              item.pool = data.profile;
              item.ip = data.addr;
              item.tractor = true;
              clients[item.hostname] = item;
              logNbClientsConnected();
              updateClient(item.hostname, {
                pool: item.pool,
                ip: item.ip,
                tractor: item.tractor
              }, (result) => {

              });
            })
            .catch(function (error) {
               // handle error
               item.tractor = false;
               clients[item.hostname] = item;
               logNbClientsConnected();
               updateClient(item.hostname, {
                 tractor: item.tractor
               }, (result) => {

               });
             })
        } else {
          item.connected = true;
          clients[item.hostname] = item;
          logNbClientsConnected();
        }
      }
    });

    // if(data in clients) {
    //   clients[data].socket = socket;
    //   clients[data].connected = true;
    //   console.log(`client reconnected: ${data}`);
    // } else {
    //   let client = {
    //     socket: socket,
    //     hostname: data,
    //     connected: true
    //   };
    //   console.log(`client connected: ${data}`);
    //   clients[data] = client;
    // }
    //
    // let connectedNb = 0;
    // for(let host in clients) {
    //   if(clients[host].connected) {
    //     connectedNb += 1;
    //   }
    // }
    // console.log(`${connectedNb}/${Object.keys(clients).length} clients connected`);
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


process.on('exit', (code) => {
  dbClient.close();
});
