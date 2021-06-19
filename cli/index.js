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
const watchCommand = prog
    .command("watch")
    .describe("Watch files for changes.");

commands.watchOptions.forEach((option) => {
    watchCommand.option(option.name, option.description, option.default);
});

watchCommand.action(commands.watch);

// Process args
prog.parse(process.argv);