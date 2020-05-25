const os = require('os');
const io = require('socket.io-client');
const find = require('find-process');
var ps = require('ps-node');
const { exec } = require("child_process");

const softwareList = [
  "houdini",
  "houdinifx",
  "hython",
  "maya",
  "mayapy",
  "mayabatch",
  "Nuke11.3"
];

const socket = io("http://localhost:8734");

var killProcesses = (pids) => {
  pids.forEach((pid) => {
      ps.kill(pid, function( err ) {
        if (err) {
          throw new Error( err );
        } else {
          console.log( 'Process %s has been killed!', pid );
        }
    });
  });
}

var reboot = () => {
  console.log("Reboot");
  exec("shutdown /r", (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
});
}

socket.on('getHostname', () => {
  var hostname = os.hostname();
  socket.emit('setHostname', hostname);
});

socket.on("freeSlots", () => {
  console.log("Free Slots");
  let restart = true;
  for(let i = 0; i < softwareList.length; i++) {
    let software = softwareList[i];
    find("name", software, true).then((pids) => {
      if(pids.length > 0) {
        killProcesses(pids);
        restart = false;
      }
    }, function (err) {
      console.log(err.stack || err);
    });
  }
  if(restart) {
    reboot();
  }
});
