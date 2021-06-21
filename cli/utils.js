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

export { writeToFile };