const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");
const sass = require("sass");
const minify = require("html-minifier").minify;
const { Proper } = require("properweb");
const { parse: parseHTML } = require("node-html-parser");
const {
    writeToFile, createFileStructure 
} = require("../utils");
const glob = require("glob");

const shimPathJSX = path.join(__dirname, "..", "jsx-shim.js");

/**
 * Callback function for watch command.
 * @param {*} argv
 */
const command = (argv) => {
    let {
        src,
        dist,
        outcss,
        outjs
    } = argv;

    if (src) src = path.relative(process.cwd(), src);
    if (dist) dist = path.relative(process.cwd(), dist);

    createFileStructure(dist, outjs, outcss);

    /// HTML
    /**
     * Builds HTML file.
     * @param {*} file 
     */
    const buildHTML = (file) => {
        const contents = fs.readFileSync(path.relative(process.cwd(), file), { encoding: "utf-8" });

        const root = parseHTML(contents);

        root.querySelectorAll("link[rel=\"import\"]").forEach((element) => {
            const importLink = element.getAttribute("href");

            // Replace is a fix for ESBuild oddity.
            const scriptPath = path.relative(process.cwd(), path.resolve(path.dirname(file), importLink)).replace(/\\/g, "/");

            const importContents = esbuild.buildSync({
                entryPoints: [scriptPath],
                bundle: true,
                jsx: "transform",
                jsxFactory: "Proper.createElement",
                jsxFragment: "Proper.fragment",
                write: false,
                inject: [shimPathJSX],
                format: "iife",
                globalName: "__MODULE",
                metafile: true
            });

            // Get dataset
            const dataset = {};
            for (const attr in element.attributes) {
                if (attr.startsWith("data-")) {
                    dataset[attr.substr("data-".length)] = element.getAttribute(attr);
                }
            }

            // TODO: This is too much of a workaround. Find a better solution.
            const buildResult = new TextDecoder().decode(importContents.outputFiles[0].contents);
            const moduleFunction = new Function(`${buildResult};return __MODULE;`)().default;

            if (!moduleFunction) {
                console.error("Module exports were not set.");
                return;
            }
            
            let importData = moduleFunction(dataset);
            
            if (typeof importData != "string") {
                importData = Proper.renderToString(importData);
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

    glob(path.join(src, "/html/**/*.html"), {}, (_, files) => {
        for (const file of files) {
            buildHTML(file);
        }
    });

    /// JavaScript
    /**
     * Builds JavaScript file.
     * @param {*} file 
     */
    const buildJS = (file) => {
        // Build
        esbuild.buildSync({
            entryPoints: [file],
            bundle: true,
            outdir: path.join(dist, outjs),
            jsx: "transform",
            jsxFactory: "Proper.createElement",
            jsxFragment: "Proper.fragment",
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
            metafile: false
        });

        console.log(`Built "${file}"`);
    };

    glob(path.join(src, "/js/scripts/**/*"), {}, (_, files) => {
        for (const file of files) {
            buildJS(file);
        }
    });

    /// CSS
    /**
     * Builds CSS file.
     * @param {*} file 
     */
    const buildCSS = (file) => {
        const outPath = path.join(dist, outcss, `${path.basename(file, ".scss")}.css`);

        const result = sass.renderSync({
            file,
            sourceMap: true,
            outFile: outPath,
            outputStyle: "compressed"
        });

        writeToFile(outPath, result.css);
        writeToFile(`${outPath}.map`, result.map);

        console.log(`Built "${file}"`);
    };

    glob(path.join(src, "/css/**/*.scss"), {}, (_, files) => {
        for (const file of files) {
            if (!path.basename(file).startsWith("_")) {
                buildCSS(file);
            }
        }
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
    command,
    options 
};