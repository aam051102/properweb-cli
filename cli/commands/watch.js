const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const esbuild = require("esbuild");
const sass = require("sass");
const minify = require("html-minifier").minify;
const jsdom = require("jsdom");

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

    if (src) src = path.join(process.cwd(), src);
    if (dist) dist = path.join(process.cwd(), dist);

    // Directory structure
    if (!fs.existsSync(path.join(dist, "assets/js/"))) {
        fs.mkdirSync(path.join(dist, "assets/js/"), { recursive: true });
    }

    if (!fs.existsSync(path.join(dist, "assets/css/"))) {
        fs.mkdirSync(path.join(dist, "assets/css/"), { recursive: true });
    }

    // HTML
    const buildHTML = (file) => {
        const contents = fs.readFileSync(file, { encoding: "utf-8" });

        // Build HTML/JSX modules
        const importRegex = /<link +rel="import" *href="(.+\.jsx)" *\/?>/g;
        let newContents = contents;
        let importMatch;
        while ((importMatch = importRegex.exec(contents))) {
            const importContents = esbuild.buildSync({
                entryPoints: [path.resolve(path.dirname(file), importMatch[1])],
                bundle: true,
                jsx: "transform",
                jsxFactory: "JSX.createElement",
                jsxFragment: "JSX.fragment",
                write: false,
                inject: [],
                format: "iife",
                globalName: "__MODULE"
            });

            const localDOM = new jsdom.JSDOM("");
            const buildResult = new TextDecoder().decode(importContents.outputFiles[0].contents);
            const importData = new Function("document", `${buildResult};return __MODULE;`)(localDOM.window.document);

            if (importData) {
                newContents = newContents.replace(importMatch[0], importData.default);
            } else {
                console.error("Module exports were not set.");
            }
        }

        // Process HTML
        const result = minify(newContents, {
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

    const watchHTML = (file) => {
        buildHTML(file);
    };

    chokidar.watch(path.join(src, "/html/**/*.html"), {
        persistent: true,
        ignoreInitial: false
    })
        .on("add", watchHTML)
        .on("change", watchHTML)
        .on("unlink", file => {
            const outName = path.join(dist, path.basename(file));

            if (fs.existsSync(outName)) {
                fs.rmSync(outName);
            }
        });

    // JS
    const JSImports = {};

    const linkJSImportsRecursive = (inputs, file) => {
        let imports = [];

        // TODO: Fix updating multiple times from several levels of imports.

        // TODO: Set up changes in imports after initial import load.
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
            inject: [],
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

    const watchJS = (file) => {
        // TODO: Have ProperWeb Example link to this directly instead of having to republish for each test.
        // TODO: Move this to be general. No need for full paths on the other files.

        const fileName = path.relative(process.cwd(), file).replace(/\\/g, "/"); // Fix for ESBuild oddity.

        if (fileName.includes("js/scripts")) {
            buildJS(fileName);
        } else if (JSImports[fileName]) {
            console.log(JSImports[fileName].exports);
            for (const exportFile in JSImports[fileName].exports) {
                watchJS(exportFile);
            }
        }
    };

    chokidar.watch([path.join(src, "/js/**/*.js"), path.join(src, "/js/**/*.jsx")], {
        persistent: true,
        ignoreInitial: false
    })
        .on("add", watchJS)
        .on("change", watchJS)
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

    const watchCSS = (file) => {
        const filePath = path.resolve(file);

        if (!path.basename(file).startsWith("_")) {
            buildCSS(file);
        } else if (CSSImports[filePath]) {
            for (const exportFile in CSSImports[filePath].exports) {
                watchCSS(exportFile);
            }
        }
    };

    chokidar.watch(path.join(src, "/css/**/*.scss"), {
        persistent: true,
        ignoreInitial: false
    })
        .on("add", watchCSS)
        .on("change", watchCSS)
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