<link rel="stylesheet" type="text/css" media="all" href="markdown_styles.css" />

# tractor-free-slots

## User documentation (cli tool)

### Installation

For install the artfx-tractor tool, you need to run:
`\\multifct\tools\renderfarm\01_ARTFX_TOOL\artfx-tractor-tool-install.bat`
Test the install in cmd with `artfx-tractor -h`

### Commands

#### reboot

Reboots clients

```batch
reboot [options] [clients...]
```

<span class="blue">`[options]`</span>: `-a` or `--all`, Reboot all clients
<span class="blue">`[clients...]`</span>: Hostname of the client to restart

#### pool

Add clients to a pool

```batch
pool [options] <name> [clients...]  
```

<span class="blue">`[options]`</span>: `-f <file>` or `--file <file>`, Use a file containing a list of clients (1 client per line)
<span class="blue">`<name>`</span>: Name of the pool
<span class="blue">`[clients...]`</span>: Hostname of the client to change

#### details

Get details about a clients

```batch
details [options] [clients...]
```

<span class="blue">`[options]`</span>: `-f <file>` or `--file <file>`, Use a file containing a list of clients (1 client per line)
<span class="blue">`[clients...]`</span>: Hostname of the client

#### list-missing

Get clients that are not connected to the server

```batch
list-missing
```

#### update

Update all clients to latest version

```batch
update
```

#### kill

Kill job and restart clients

```batch
kill <jobId>
```

<span class="blue">`<jobId>`</span>: JobId to kill

#### create-job

Create job on Tractor

```batch
create-job
```

#### help

display help for command

```batch
help [command]
```

<span class="blue">`[command]`</span>: Command to get help
