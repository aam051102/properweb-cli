const path = require("path");

/**
 * Callback function for watch command.
 * @param {*} argv
 */
const command = (argv) => {
    let {
        src, dist 
    } = argv;

    if (src) src = path.relative(process.cwd(), src);
    if (dist) dist = path.relative(process.cwd(), dist);
};

/**
 * Command options.
 */
const options = [{
    name: "--src",
    description: "The root input directory.",
    default: "src"
}, {
    name: "--dist",
    description: "The root output directory.",
    default: "dist"
}];

module.exports = {
    command, options 
};