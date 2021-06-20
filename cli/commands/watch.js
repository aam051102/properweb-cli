const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const esbuild = require("esbuild");
const sass = require("sass");
const minify = require("html-minifier").minify;
const jsdom = require("jsdom");
const { JSX } = require("properweb");
const { parse: parseHTML } = require("node-html-parser");

const shimPathJSX = path.join(__dirname, "..", "jsx-shim.js");

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
 * Callback function for watch command.
 * @param {string} src 
 * @param {string} dist 
 */
const command = (argv) => {
    let {
        src,
        dist,
        port
    } = argv;

    if (src) src = path.relative(process.cwd(), src);
    if (dist) dist = path.relative(process.cwd(), dist);

    // Directory structure
    if (!fs.existsSync(path.join(dist, "assets/js/"))) {
        fs.mkdirSync(path.join(dist, "assets/js/"), { recursive: true });
    }

    if (!fs.existsSync(path.join(dist, "assets/css/"))) {
        fs.mkdirSync(path.join(dist, "assets/css/"), { recursive: true });
    }

    // HTML
    /**
     * Builds HTML file.
     * @param {*} file 
     */
    const buildHTML = (file) => {
        const contents = fs.readFileSync(file, { encoding: "utf-8" });

        const root = parseHTML(contents);

        root.querySelectorAll("link[rel=\"import\"]").forEach((element) => {
            const importLink = element.getAttribute("href");

            // Replace is a fix for ESBuild oddity.
            const scriptPath = path.relative(process.cwd(), path.resolve(path.dirname(file), importLink)).replace(/\\/g, "/");

            const importContents = esbuild.buildSync({
                entryPoints: [scriptPath],
                bundle: true,
                jsx: "transform",
                jsxFactory: "JSX.createElement",
                jsxFragment: "JSX.fragment",
                write: false,
                inject: [shimPathJSX],
                format: "iife",
                globalName: "__MODULE",
                metafile: true
            });

            const metafileInputs = importContents.metafile.inputs;

            if (!JSImports[scriptPath] || !JSImports[scriptPath].exports) {
                JSImports[scriptPath] = { exports: {} };
            }
            JSImports[scriptPath].exports[file] = true;

            linkJSImportsRecursive(metafileInputs, scriptPath);

            // Get dataset
            const dataset = {};
            for (const attr in element.attributes) {
                if (attr.startsWith("data-")) {
                    dataset[attr.substr("data-".length)] = element.getAttribute(attr);
                }
            }

            // TODO: Find a way to send element data/args to import.
            // TODO: This is too much of a workaround. Find a better solution.
            const localDOM = new jsdom.JSDOM("");
            const buildResult = new TextDecoder().decode(importContents.outputFiles[0].contents);
            const moduleFunction = new Function("document", `${buildResult};return __MODULE;`)(localDOM.window.document).default;

            if (!moduleFunction) {
                console.error("Module exports were not set.");
                return;
            }
            
            let importData = moduleFunction(dataset);

            if (typeof importData != "string") {
                importData = JSX.renderToString(importData);
            }

            element.replaceWith(importData);
        });

        // Process HTML
        const result = minify(root.toString(), {
            minifyCSS: true,
            minifyJS: true,
            minifyURLs: true,
            collapseWhitespace: true,
            removeTagWhitespace: false,
            collapseInlineTagWhitespace: false,
            conservativeCollapse: false,
            html5: true,
            removeComments: true
        });

        writeToFile(path.join(dist, path.basename(file)), result);

        console.log(`Built "${file}"`);
    };

    /**
     * Handles new HTML files.
     * @param {*} file 
     */
    const handleAddHTML = (file) => {
        buildHTML(file);
    };

    /**
     * Handles HTML file changes.
     * @param {*} file 
     */
    const handleChangeHTML = (file) => {
        buildHTML(file);
    };

    chokidar.watch(path.join(src, "/html/**/*.html"), {
        persistent: true,
        ignoreInitial: false
    })
        .on("add", handleAddHTML)
        .on("change", handleChangeHTML)
        .on("unlink", file => {
            const outName = path.join(dist, path.basename(file));

            if (fs.existsSync(outName)) {
                fs.rmSync(outName);
            }
        });

    // JS
    const JSImports = {};

    /**
     * Recursively links JavaScript dependencies to their dependants.
     * @param {*} inputs 
     * @param {*} file 
     * @returns 
     */
    const linkJSImportsRecursive = (inputs, file) => {
        let imports = [];

        // TODO: How to handle linking into oneself?
    
        inputs[file].imports.forEach((importInfo) => {
            const importPath = importInfo.path;

            // Proceed to link imports of existing import
            imports.push(importPath);
            const importData = imports.concat(linkJSImportsRecursive(inputs, importPath));
            JSImports[importPath] = {};
            if (!JSImports[importPath].exports) {
                JSImports[importPath].exports = {};
            }
            JSImports[importPath].exports[file] = true;
            imports = importData;
        });

        return imports;
    };

    /**
     * Builds JavaScript file.
     * @param {*} file 
     */
    const buildJS = (file) => {
        // Build
        const data = esbuild.buildSync({
            entryPoints: [file],
            bundle: true,
            outdir: path.join(dist, "assets/js/"),
            jsx: "transform",
            jsxFactory: "JSX.createElement",
            jsxFragment: "JSX.fragment",
            minify: true,
            keepNames: false,
            inject: [shimPathJSX],
            sourcemap: true,
            target: [
                "chrome58",
                "firefox57",
                "safari11",
                "edge16"
            ],
            metafile: true
        });

        const metafileInputs = data.metafile.inputs;

        // Link imports
        linkJSImportsRecursive(metafileInputs, file);

        console.log(`Built "${file}"`);
    };

    /**
     * Handles new JavaScript files.
     * @param {*} file 
     */
    const handleAddJS = (file) => {
        const fileName = file.replace(/\\/g, "/"); // Fix for ESBuild oddity.

        if (fileName.includes("js/scripts")) {
            buildJS(fileName);
        }
    };

    /**
     * Handles JavaScript file changes.
     * @param {*} file 
     */
    const handleChangeJS = (file) => {
        const fileName = file.replace(/\\/g, "/"); // Fix for ESBuild oddity.

        if (fileName.includes("js/scripts")) {
            buildJS(fileName);
        } else if (JSImports[fileName]) {
            for (const exportFile in JSImports[fileName].exports) {
                if (exportFile.endsWith(".html")) {
                    handleChangeHTML(exportFile);
                } else {
                    handleChangeJS(exportFile);
                }
            }
        }
    };

    chokidar.watch([path.join(src, "/js/**/*.js"), path.join(src, "/js/**/*.jsx")], {
        persistent: true,
        ignoreInitial: false
    })
        .on("add", handleAddJS)
        .on("change", handleChangeJS)
        .on("unlink", file => {
            // Remove output files
            const outName = path.join(dist, `assets/js/${path.basename(file, ".jsx")}.js`);

            if (fs.existsSync(outName)) {
                fs.rmSync(outName);
            }

            if (fs.existsSync(`${outName}.map`)) {
                fs.rmSync(`${outName}.map`);
            }
        });

    // CSS
    const CSSImports = {};

    /**
     * Links SCSS dependencies with their dependants.
     * @param {*} inputs 
     * @param {*} file 
     */
    const linkCSSImports = (inputs, file) => {   
        inputs.forEach((importPath) => {
            // Proceed to link imports of existing import
            CSSImports[importPath] = {};

            if (!CSSImports[importPath].exports) {
                CSSImports[importPath].exports = {};
            }

            CSSImports[importPath].exports[file] = true;
        });
    };

    /**
     * Builds CSS file.
     * @param {*} file 
     */
    const buildCSS = (file) => {
        const outPath = path.join(dist, `assets/css/${path.basename(file, ".scss")}.css`);

        const result = sass.renderSync({
            file,
            sourceMap: true,
            outFile: outPath,
            outputStyle: "compressed"
        });

        linkCSSImports(result.stats.includedFiles, file);

        writeToFile(outPath, result.css);
        writeToFile(`${outPath}.map`, result.map);

        console.log(`Built "${file}"`);
    };

    /**
     * Handles new CSS files.
     * @param {*} file 
     */
    const handleAddCSS = (file) => {
        if (!path.basename(file).startsWith("_")) {
            buildCSS(file);
        }
    };

    /**
     * Handles CSS file changes.
     * @param {*} file 
     */
    const handleChangeCSS = (file) => {
        const filePath = path.resolve(file);

        if (!path.basename(file).startsWith("_")) {
            buildCSS(file);
        } else if (CSSImports[filePath]) {
            for (const exportFile in CSSImports[filePath].exports) {
                handleChangeCSS(exportFile);
            }
        }
    };

    chokidar.watch(path.join(src, "/css/**/*.scss"), {
        persistent: true,
        ignoreInitial: false
    })
        .on("add", handleAddCSS)
        .on("change", handleChangeCSS)
        .on("unlink", file => {
            const outName = path.join(dist, `assets/css/${path.basename(file, ".scss")}.css`);

            if (fs.existsSync(outName)) {
                fs.rmSync(outName);
            }
        });    

    // Server
    const express = require("express");
    const app = express();

    app.use("/", express.static(dist));

    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
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
        name: "--port",
        description: "The port to serve the dist folder on.",
        default: "3000"
    }
];

module.exports = {
    command, options 
};