const os = require('os');
const io = require('socket.io-client');
const find = require('find-process');
var ps = require('ps-node');
const { exec } = require("child_process");
const { existsSync, mkdir, writeFile } = require("fs");

const path = require('path');
const fs = require('fs');

const version = 1;

const directoryPathOrigin = "\\\\multifct\\tools\\renderfarm\\ArtFx-Tractor";

const softwareList = [
  "houdini",
  "houdinifx",
  "hython",
  "maya",
  "mayapy",
  "mayabatch",
  "Nuke11.3"
];

const socket = io("http://tractor:8734");

const killProcesses = (pids) => {
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

const reboot = () => {
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

//Get all folder version in path
const getAllFolders = (files) => {

  let dirs = [];
  files.forEach((file) => {
    // Do whatever you want to do with the file
    let stats = fs.statSync(path.join(directoryPathOrigin, file));
    if(stats.isDirectory()) {
      let data = {
        path: path.join(directoryPathOrigin, file),
        version: parseInt(file.substring(1))
      }
      dirs.push(data);
    }
  });

  console.log(dirs);

  return dirs;
}

//Get last folder version
const getLastVersion = (dirs) => {
  let max = 0
  let lastVersionFile = null

  let file = {
    version: 0,
  }

  dirs.forEach((folder) => {
    if (folder.version > max) {
      file.path = folder.path;
      file.version = folder.version;
      file.folder = path.basename(folder.path);
    }
  });
  console.log("max version : "+ file.version)

  return file;
}


const update = () => {
  //passing directoryPath and callback function
  fs.readdir(directoryPathOrigin, function (err, files) {
    //handling error
    if (err) {
      return console.log('Unable to scan directory: ' + err);
    }

    let dirs = getAllFolders(files);
    let lastV = getLastVersion(dirs);

    const directoryPathLocal = "C:\\ArtFx-Tractor";

    //Check local lastVersion
    // fs.readdir(directoryPathLocal, function (err, files) {
    //
    //   //handling error
    //   if (err) {
    //     return console.log('Unable to scan directory: ' + err);
    //   }
    //
    //   let dirsLocal = getAllFolders(files);
    //   let localV = getLastVersion(dirsLocal);

      // destination will be created or overwritten by default if new version.
      if (  lastV.version > version){
        console.log(lastV);
        let destPath = path.join("C:\\ArtFx-Tractor", lastV.folder);
        try {
          fs.mkdirSync(destPath);

        } catch (e) {

        }
        fs.copyFile(path.join(lastV.path, 'ArtFx-Tractor-Tool.exe'), path.join(destPath, 'ArtFx-Tractor-Tool.exe'), fs.constants.COPYFILE_FICLONE, (err) => {
          if (err) throw err;
          console.log('New version. File was copied to destination');

          exec("sc stop ArtFx-Tractor && sc start ArtFx-Tractor", (error, stdout, stderr) => {
            if (error) {
              console.log(`error: ${error.message}`);
              return;
            }
            if (stderr) {
              console.log(`stderr: ${stderr}`);
              return;
            }
            console.log(`stdout: ${stdout}`);
            process.exit();
          });
        });
      }
    // })
  });
}

socket.on('getHostname', () => {
  var hostname = os.hostname();
  socket.emit('setHostname', {hostname: hostname, version: version});
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

socket.on("reboot", () => {
  console.log("reboot");
  reboot();
});

socket.on("update", () => {
  console.log("update");
  update();
});

socket.on("changePool", (data) => {
  console.log("Change Pool");
  console.log(data);
  if(!existsSync('C:/Tractor-Pool')) {
    mkdir('C:/Tractor-Pool', (err) => {
      if (err) throw err;
      writeFile(`C:/Tractor-Pool/${data}.txt`, '', (err) => {
        if (err) throw err;
        console.log('File is created successfully.');
      });
    })
  } else {
    writeFile(`C:/Tractor-Pool/${data}.txt`, '', (err) => {
      if (err) throw err;
      console.log('File is created successfully.');
    });
  }
});
