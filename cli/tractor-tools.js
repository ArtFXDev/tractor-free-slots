const { program } = require('commander');
const axios = require('axios');

program
  .version('0.0.1')
  .option('-d, --debug', 'output extra debugging')

program.command('reboot <clients...>')
  .description('Reboots clients')
  .action((client) => {
    console.log(`Reboot: ${clients}`);
    axios.post(`http://tractor-tools:8734//reboot`, {clients: clients})
      .then((response) => {
        console.log(response.data);
      })
      .catch(function (error) {
         // handle error
         console.log(error);
       })
  });

program.command('pool <name> <clients...>')
  .description('Add clients to a pool')
  .action((name, clients) => {
    console.log(name);
    console.log(clients);
    axios.post(`http://tractor-tools:8734/pools/${name}`, {clients: clients})
      .then((response) => {
        console.log(response.data);
      })
      .catch(function (error) {
         // handle error
         console.log(error);
       })
  });

program.parse(process.argv);
