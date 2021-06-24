const fs = require("fs");
const path = require("path");

/**
 * Writes content to filepath and creates directory if it doesn't exist.
 * @param {string} file
 * @param {string} content
 */
const writeToFile = (file, content) => {
    const dir = path.dirname(file);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(file, content);
};

/**
 * 
 * @param {string} dist 
 * @param {string} outjs 
 * @param {string} outcss 
 */
const createFileStructure = (dist, outjs, outcss) => {
    fs.mkdirSync(dist, { recursive: true });

    if (!fs.existsSync(path.join(dist, outjs))) {
        fs.mkdirSync(path.join(dist, outjs), { recursive: true });
    }

    if (!fs.existsSync(path.join(dist, outcss))) {
        fs.mkdirSync(path.join(dist, outcss), { recursive: true });
    }
};

module.exports = {
    writeToFile, createFileStructure 
};