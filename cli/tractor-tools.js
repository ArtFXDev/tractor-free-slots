const { program } = require('commander');
const axios = require('axios');
const chalk = require('chalk');
const log = console.log;
const fs = require("fs");

program
  .version('0.0.1')
  .option('-d, --debug', 'output extra debugging')

program.command('reboot [clients...]')
  .description('Reboots clients')
  .option('-a, --all', "Reboot all clients")
  .action((clients, cmd) => {
    let options = cmd.opts();
    if(options.all) {
      axios.post(`http://tractor-tools:8734/reboot/all`)
        .then((response) => {
          console.log(response.data);
        })
        .catch(function (error) {
           // handle error
           // console.log(error);
           // console.log("error");
        })
    } else {
      if(!clients.length > 0 ) {
        log(chalk.red("No clients are given"));
        log(chalk.red("Run the following to command to reboot clients:"));
        log(chalk.blue.bold("tractor-tools reboot <client>"));
        log(chalk.red("Or:"));
        log(chalk.blue.bold("tractor-tools reboot <client> <client> ..."));
        log(chalk.red("Or to reboot all clients !!!Be carefull with this!!!:"));
        log(chalk.blue.bold("tractor-tools reboot --all"));
        return;
      }
      axios.post(`http://tractor-tools:8734/reboot`, {clients: clients})
        .then((response) => {
          console.log(response.data);
        })
        .catch(function (error) {
           // handle error
           // console.log(error);
           // console.log("error");
        })
    }
  });

program.command('pool <name> [clients...]')
  .description('Add clients to a pool')
  .option('-f, --file <file>', "Use a file containing a list of clients (1 client per line)")
  .action((name, clients, cmd) => {
    let options = cmd.opts();
    if(options.file != undefined) {
      let hostnames = fs.readFileSync(options.file, 'utf8').split('\r\n');
      axios.post(`http://tractor-tools:8734/pools/${name}`, {clients: hostnames})
        .then((response) => {
          console.log(response.data);
        })
        .catch(function (error) {
          // handle error
          // console.log(error);
        })
    } else {
      if(!clients.length > 0 ) {
        log(chalk.red("No clients are given"));
        log(chalk.red("Run the following to command to add clients to a pool:"));
        log(chalk.blue.bold("tractor-tools pool <pool-name> <client>"));
        log(chalk.red("Or:"));
        log(chalk.blue.bold("tractor-tools pool <pool-name> <client> <client> ..."));
        log(chalk.red("Or add a list of clients that are in a file (1 client per line)"));
        log(chalk.blue.bold("tractor-tools pool --file <file-path>"));
        return;
      }

      axios.post(`http://tractor-tools:8734/pools/${name}`, {clients: clients})
        .then((response) => {
          console.log(response.data);
        })
        .catch(function (error) {
          // handle error
          // console.log(error);
        })
    }
  });

program.parse(process.argv);
