const path = require("path");
const { createFileStructure } = require("../utils");

/**
 * Callback function for watch command.
 * @param {*} argv
 */
const command = (argv) => {
    let {
        src, dist, outjs, outcss
    } = argv;

    if (src) src = path.relative(process.cwd(), src);
    if (dist) dist = path.relative(process.cwd(), dist);

    createFileStructure(dist, outjs, outcss);
};

/**
 * Command options.
 */
const options = [
    {
        name: "--src",
        description: "The root input directory.",
        default: "src"
    },
    {
        name: "--dist",
        description: "The root output directory.",
        default: "dist"
    },
    {
        name: "--outcss",
        description: "The output directory for CSS, relative to the root output directory.",
        default: "assets/css/"
    },
    {
        name: "--outjs",
        description: "The output directory for JS, relative to the root output directory.",
        default: "assets/js/"
    }
];

module.exports = {
    command, options 
};