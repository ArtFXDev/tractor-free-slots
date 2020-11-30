# tractor-free-slots

## About

tractor-free-slots is a tool for fix tractor isues and manage ArtFx pools.
It's work with 3 different tools :

- cli: This is the cmd tool. You can send request for pool change, reboot ...
- client: It's the client server needed on all renderfarm pc. It resive request and execute them.
- server: Connect with tractor, it transfer cli request to client and do some automatic reboot for "no free slot" slave.

## Install

For all tool, you need to install package with npm (npm install)

### Cli

You can run npn run build for build artfx-tractor.exe file.
Build exe file is for cmd tool, you need to add environement PATH.
Exemple: Move .exe here: `C:/ArtFx-Tractor/artfx-tractor.exe` and add `C:/ArtFx-Tractor/` to your PATH environment variable.
To test the install, run a cmd and run: `artfx-tractor -h`

### Client

To build client run `npm run build`. You will have the Artfx-Tractor-Tool.exe.
You need to use a windows service for lauch it at windows start.
Copy `TractorTool.exe.config`, `TractorTool.pdb` and `Artfx-Tractor-Tool.exe` into the folder you want (ex: `C:\ArtFx-Tractor`).
Create the service (admin mode):

```batch
start /wait sc create ArtFx-Tractor start=auto BinPath=C:\ArtFx-Tractor\TractorTool.exe
rem start /wait sc create ArtFx-Tractor start=auto BinPath=C:\ArtFx-Tractor\TractorTool.exe
start /wait sc config ArtFx-Tractor depend= +NetworkProvider
sc start ArtFx-Tractor
```

### Server

For server, build is not currently avalable. You need to have a sever acessible with all the client and configure a DNS name `tractor`.
In the server `run npm install` and `npm run dev`.
The server start and, if you have the Client and Cli install, you can run command like `artfx-tractor pool MyPoolName hostname1 hostname2 ...`.
It will create a file in `C:\Tractor-Pool` name MyPoolName.txt, configure your blade with `PathExists`.

## cli ideas

https://www.npmjs.com/package/inquirer
https://www.npmjs.com/package/ora
https://www.npmjs.com/package/log-symbols
