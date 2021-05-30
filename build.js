const esbuild = require("esbuild");
const sass = require("sass");
const minify = require("html-minifier").minify;
const fs = require("fs");

// TODO: Watch & automate.
// HTML
{
	const result = minify(fs.readFileSync("./src/html/index.html", {
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

	if (!fs.existsSync("./dist/")) {
		fs.mkdirSync("./dist/");
	}

	fs.writeFileSync("./dist/index.html", result);
}

// JS
esbuild.build({
	entryPoints: ["./src/js/index.jsx"],
	bundle: true,
	outdir: "./dist/assets/js/",
	jsx: "transform",
	jsxFactory: "createElement",
	jsxFragment: "",
	minify: true,
	keepNames: false,
	inject: ["./auto.js"],
	sourcemap: true,
	target: ["chrome58", "firefox57", "safari11", "edge16"]
})
	.catch(() => process.exit(1));

// CSS
{
	const result = sass.renderSync({
		file: "./src/css/index.scss",
		sourceMap: true,
		outFile: "./dist/assets/css/index.css",
		outputStyle: "compressed"
	});

	if (!fs.existsSync("./dist/assets/css")) {
		fs.mkdirSync("./dist/assets/css/");
	}

	fs.writeFileSync("./dist/assets/css/index.css", result.css);
	fs.writeFileSync("./dist/assets/css/index.css.map", result.map);
}