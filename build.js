const esbuild = require("esbuild");
const sass = require("sass");
const minify = require("html-minifier").minify;
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
		fs.mkdirSync(dir);
	}

	fs.writeFileSync(file, content);
};

// HTML
const buildHTML = (file, out) => {
	const result = minify(fs.readFileSync(file, {
		encoding: "utf-8"
	}), {
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
};

// JS
const buildJS = (files, out) => {
	if (typeof files === "string") {
		files = [files];
	}

	esbuild.build({
		entryPoints: files,
		bundle: true,
		outdir: out,
		jsx: "transform",
		jsxFactory: "createElement",
		jsxFragment: "\"JSX_FRAG\"",
		minify: true,
		keepNames: false,
		inject: ["./auto.js"],
		sourcemap: true,
		target: ["chrome58", "firefox57", "safari11", "edge16"]
	})
		.catch(console.error);
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
};

// BUILD
buildHTML("./src/html/index.html", "./dist/");
buildJS("./src/js/index.jsx", "./dist/assets/js/");
buildSCSS("./src/css/index.scss", "./dist/assets/css/");

// TODO: Watch & automate.