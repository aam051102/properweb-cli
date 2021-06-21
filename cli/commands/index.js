const {
    command: watch, options: watchOptions 
} = require("./watch");

const {
    command: build, options: buildOptions 
} = require("./build");

module.exports = {
    build,
    buildOptions,
    watch,
    watchOptions
};