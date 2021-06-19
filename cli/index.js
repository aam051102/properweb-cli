#!/usr/bin/env node
const sade = require("sade");
const pkg = require("../package");
const commands = require("./commands");

// Program setup
let prog = sade("proper").version(pkg.version);

// Build command
const buildCommand = prog.command("build").describe("Create a production build.");
buildCommand.action(commands.build);

// Watch command
const watchCommand = prog.command("watch").describe("Watch files for changes.");
watchCommand.action(commands.watch);
commands.watchOptions.forEach((option) => {
    watchCommand.command(option.name, option.description, { default: option.default });
});

// Process args
prog.parse(process.argv);