const { program } = require('commander');
const axios = require('axios');
const chalk = require('chalk');
const chalkTable = require('chalk-table');
const emoji = require('node-emoji')
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
          log(chalk.cyan(response.data))
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
          let data = response.data;
          if(data.message) {
            log(chalk.cyan(data.message));
          } else {
            log(chalk.red(data.error));
          }
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
          log(response.data);
          log(chalk.cyan("Reload the Blade config on Tractor to accelerate the pool change"));
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
          log(response.data);
          log(chalk.cyan("Reload the Blade config on Tractor to accelerate the pool change"));
        })
        .catch(function (error) {
          // handle error
          // console.log(error);
        })
    }
  });

program.command('detail <client>')
  .description('Get details about a client')
  .action((client) => {
    axios.post(`http://tractor-tools:8734/client/${client}`)
      .then((response) => {
        let data = response.data;

        let tableOptions = {
          leftPad: 2,
          columns: [
            { field: "host", name: chalk.cyan("Hostname") },
            { field: "pool", name: chalk.green("Pool") },
            { field: "ip", name: chalk.magenta("IP") },
            { field: data.error ? "error" : "connected", name: data.error ? chalk.red("Error") : chalk.yellow("Connected")}
          ]
        }

        let table = chalkTable(tableOptions, [
          { host: data.hostname, pool: data.pool ? data.pool.substring(5) : "", ip: data.ip, connected: data.connected, error: data.error }
        ]);

        // if(data.error) {
        //   log(data);
        // }
        log(table);
      })
      .catch(function (error) {
        // handle error
        // console.log(error);
      })
  });

program.command('list-missing')
  .description('Get clients that are not connected to the server')
  .action((client) => {
    axios.get(`http://tractor-tools:8734/list-missing`)
      .then((response) => {
        let data = response.data;
        // if(data.error) {
        //   log(data);
        // }
        for(let i = 0; i < data.length; i++) {
          log(data[i]);
        }
      })
      .catch(function (error) {
        // handle error
        // console.log(error);
      })
  });

  program.command('kill <jobId>')
    .description('Kill job and restart clients')
    .action((jobId) => {
      axios.get(`http://tractor-tools:8734/kill/${jobId}`)
        .then((response) => {
          let data = response.data;
          log(chalk.cyan(data));
        })
        .catch(function (error) {
          // handle error
          // console.log(error);
        })
    });

program.parse(process.argv);
