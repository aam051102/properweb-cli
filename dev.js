const esbuild = require("esbuild");
const sass = require("sass");
const minify = require("html-minifier").minify;
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");

/**
 * Writes content to filepath and creates directory if it doesn't exist.
 * @param {string} file
 * @param {string} content
 */
const writeToFile = (file, content) => {
    const dir = path.dirname(file);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    fs.writeFileSync(file, content);
};

// HTML
const jsdom = require("jsdom");

const buildHTML = (file, out) => {
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
            jsxFragment: "\"JSX_FRAG\"",
            write: false,
            inject: [],
            format: "iife",
            globalName: "__MODULE"
        });

        const localDOM = new jsdom.JSDOM("");
        const importData = new Function("doc", `${new TextDecoder().decode(importContents.outputFiles[0].contents)};return __MODULE;`)(localDOM.window);

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

    writeToFile(out + path.basename(file), result);

    console.log(`Built ${file}`);
};

// JS
const JSImports = {};

const linkJSImportsRecursive = (inputs, file) => {
    let imports = [];

    // TODO: Fix updating multiple times from several levels of imports.
    // TODO: Set up removal of imports
    // TODO: How to handle linking into oneself?
    
    inputs[file].imports.forEach((importInfo) => {
        const importPath = importInfo.path;

        if (JSImports[importPath]) {
            // Don't link, but send data on
            imports = imports.concat(JSImports[importPath].imports);
            JSImports[importPath].exports[file] = true;
            return;
        }

        // Proceed to link imports of existing import
        imports.push(importPath);
        const importData = imports.concat(linkJSImportsRecursive(inputs, importPath));
        JSImports[importPath] = {
            imports: importData,
            exports: {}
        };
        JSImports[importPath].exports[file] = true;
        imports = importData;
    });

    return imports;
};

const buildJS = (file, out) => {
    const data = esbuild.buildSync({
        entryPoints: [file],
        bundle: true,
        outdir: out,
        jsx: "transform",
        jsxFactory: "JSX.createElement",
        jsxFragment: "\"JSX_FRAG\"",
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
    
    linkJSImportsRecursive(data.metafile.inputs, file);

    console.log(`Built ${file}`);
};

// SCSS
const buildSCSS = (file, out) => {
    const outPath = `${out + path.basename(file, ".scss")}.css`;

    const result = sass.renderSync({
        file,
        sourceMap: true,
        outFile: outPath,
        outputStyle: "compressed"
    });

    writeToFile(outPath, result.css);
    writeToFile(`${outPath}.map`, result.map);

    console.log(`Built ${file}`);
};

// Watching
const outDir = "./dist/";

// Directory structure
if (!fs.existsSync(`${outDir}assets/js/`)) {
    fs.mkdirSync(`${outDir}assets/js/`, { recursive: true });
}

if (!fs.existsSync(`${outDir}assets/css/`)) {
    fs.mkdirSync(`${outDir}assets/css/`, { recursive: true });
}

// Watchers
const watcherHTML = chokidar.watch("./src/html/**/*.html", {
    persistent: true,
    ignoreInitial: false
});

const watcherSCSS = chokidar.watch("./src/css/**/*.scss", {
    persistent: true,
    ignoreInitial: false
});

const watcherJS = chokidar.watch(["./src/js/**/*.js", "./src/js/**/*.jsx"], {
    persistent: true,
    ignoreInitial: false
});

// HTML
const watchHTML = file => {
    buildHTML(file, `${outDir}`);
};

watcherHTML.on("add", watchHTML);
watcherHTML.on("change", watchHTML);
watcherHTML.on("unlink", file => {
    const outName = outDir + path.basename(file);

    if (fs.existsSync(outName)) {
        fs.rmSync(outName);
    }
});

// JS
const watchJS = file => {
    const fileName = file.replace(/\\/g, "/"); // Fix for ESBuild oddity.

    if (fileName.startsWith(`src/js/scripts`)) {
        buildJS(fileName, `${outDir}assets/js/`);
    } else if (JSImports[fileName]) {
        for (const exportFile in JSImports[fileName].exports) {
            watchJS(exportFile);
        }
    }
};

watcherJS.on("add", watchJS);
watcherJS.on("change", watchJS);
watcherJS.on("unlink", file => {
    const outName = `${outDir}assets/js/${path.basename(file, ".jsx")}.js`;

    if (fs.existsSync(outName)) {
        fs.rmSync(outName);
    }

    if (fs.existsSync(`${outName}.map`)) {
        fs.rmSync(`${outName}.map`);
    }
});

// SCSS
const watchSCSS = file => {
    if (!path.basename(file).startsWith("_")) {
        buildSCSS(file, `${outDir}assets/css/`);
    }
};

watcherSCSS.on("add", watchSCSS);
watcherSCSS.on("change", watchSCSS);
watcherSCSS.on("unlink", file => {
    const outName = `${outDir}assets/css/${path.basename(file, ".scss")}.css`;

    if (fs.existsSync(outName)) {
        fs.rmSync(outName);
    }
});

// Server
const express = require("express");
const app = express();

app.use("/", express.static(path.join(__dirname, "./dist/")));

app.listen(3000, () => {
    console.log("Server running on port 3000.");
});