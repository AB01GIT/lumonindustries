/**
 * PRODUCTION BUILD
 *
 * Emits a self-contained, deployable folder. The source site is deliberately
 * buildless — it runs straight from the filesystem over HTTP — so this script
 * only does the things a static host cannot do for you:
 *
 *   1. bundles the ES modules into one minified file, tree-shaking Three.js
 *      down to the handful of classes the stage actually touches
 *   2. concatenates and minifies the four stylesheets in cascade order
 *   3. vendors the CDN libraries locally, so the deployment has no runtime
 *      dependency on jsdelivr staying up or serving the same version
 *   4. rewrites index.html to point at content-hashed filenames, which lets a
 *      host cache the assets forever and still ship updates
 *
 *   node tools/build.mjs [--outdir dist] [--no-vendor] [--sourcemap]
 *
 * `--no-vendor` keeps the CDN <script> tags exactly as the source has them,
 * which is the right choice if you would rather share the browser's cached copy
 * of GSAP with other sites than serve your own.
 */

import { rm, mkdir, readFile, writeFile, cp } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import * as esbuild from "esbuild";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const option = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const OUT = join(ROOT, option("outdir", "dist"));
const VENDOR = !flag("no-vendor");
const SOURCEMAP = flag("sourcemap");

/** Stylesheets, in the exact order index.html links them. Cascade depends on it. */
const STYLES = [
  "css/base.css",
  "css/interface.css",
  "css/scenes.css",
  "css/responsive.css",
];

/**
 * The globals the app expects on `window`. These stay as classic scripts rather
 * than being folded into the bundle: GSAP's UMD builds register their own
 * plugins against a global, and the source treats `gsap`/`ScrollTrigger`/
 * `Lenis` as ambient. Three.js is different — it is a real ES import, so it
 * gets bundled and tree-shaken instead of vendored whole.
 */
const LIBS = [
  { file: "gsap.min.js", url: "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js" },
  { file: "ScrollTrigger.min.js", url: "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js" },
  { file: "CustomEase.min.js", url: "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/CustomEase.min.js" },
  { file: "lenis.min.js", url: "https://cdn.jsdelivr.net/npm/lenis@1.3.11/dist/lenis.min.js" },
];

const hash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 8);
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
const gz = (buf) => gzipSync(buf, { level: 9 }).length;

const report = [];
const emit = async (relPath, contents) => {
  const buf = Buffer.from(contents);
  await mkdir(dirname(join(OUT, relPath)), { recursive: true });
  await writeFile(join(OUT, relPath), buf);
  report.push({ file: relPath, raw: buf.length, gzip: gz(buf) });
  return relPath;
};

/* ------------------------------------------------------------------ clean -- */
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

/* --------------------------------------------------------------- scripts -- */
const bundle = await esbuild.build({
  entryPoints: [join(ROOT, "js/main.js")],
  bundle: true,
  format: "esm",
  // Nothing is written from here (`write: false`) — the outdir only gives
  // esbuild somewhere to name its output relative to, including the sourcemap.
  outdir: join(OUT, "assets"),
  // Browsers that ship `color-mix()`, `svh` units and the standalone
  // `translate`/`scale` properties — the same floor the CSS already assumes.
  target: ["chrome111", "firefox113", "safari164", "edge111"],
  minify: true,
  legalComments: "none",
  sourcemap: SOURCEMAP,
  write: false,
  metafile: true,
});

const jsFile = bundle.outputFiles.find((f) => f.path.endsWith(".js"));
const jsName = `assets/app-${hash(jsFile.contents)}.js`;
await emit(jsName, jsFile.contents);

if (SOURCEMAP) {
  const map = bundle.outputFiles.find((f) => f.path.endsWith(".map"));
  if (map) {
    await emit(`${jsName}.map`, map.contents);
    // esbuild's comment points at the pre-hash name.
    const patched = Buffer.from(jsFile.contents)
      .toString()
      .replace(/sourceMappingURL=.*$/m, `sourceMappingURL=app-${hash(jsFile.contents)}.js.map`);
    await writeFile(join(OUT, jsName), patched);
  }
}

/* ---------------------------------------------------------------- styles -- */
const cssSource = (
  await Promise.all(
    STYLES.map(async (file) => `/* ${file} */\n${await readFile(join(ROOT, file), "utf8")}`)
  )
).join("\n");

const css = await esbuild.transform(cssSource, {
  loader: "css",
  minify: true,
  // `esnext` so nothing modern gets lowered into a form these browsers no
  // longer need — notably `color-mix()`, which the whole palette leans on.
  target: "esnext",
});
for (const w of css.warnings) console.warn(`  ! css: ${w.text}`);
const cssName = `assets/app-${hash(css.code)}.css`;
await emit(cssName, css.code);

/* ---------------------------------------------------------------- vendor -- */
const vendored = [];
if (VENDOR) {
  for (const lib of LIBS) {
    const res = await fetch(lib.url);
    if (!res.ok) throw new Error(`${lib.url} → HTTP ${res.status}`);
    const body = Buffer.from(await res.arrayBuffer());
    vendored.push(await emit(`vendor/${lib.file}`, body));
  }
}

/* ------------------------------------------------------------------ html -- */
// Normalised to LF up front: with CRLF endings, a multiline `^` also matches
// between the CR and the LF, so any later line-based pass quietly eats the LF
// of every pair and emits a file with bare CR endings.
let html = (await readFile(join(ROOT, "index.html"), "utf8")).replace(/\r\n/g, "\n");

// One stylesheet in place of four.
html = html.replace(
  /\s*<link rel="stylesheet" href="\.\/css\/[^"]+" \/>/g,
  ""
).replace(
  /(<!-- =+ STYLES =+ -->)/,
  `$1\n    <link rel="stylesheet" href="./${cssName}" />`
);

// Local copies of the libraries, or the original CDN tags when --no-vendor.
if (VENDOR) {
  LIBS.forEach((lib, i) => {
    html = html.replace(lib.url, `./${vendored[i]}`);
  });
}

// Three.js is inside the bundle now, so the import map has nothing left to map.
html = html.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, "");
html = html.replace('src="./js/main.js"', `src="./${jsName}"`);

// Authoring comments are for whoever reads the source, not for every visitor.
// The markup itself keeps its indentation: collapsing it would risk changing
// significant whitespace inside text, and gzip flattens the difference anyway.
html = html
  .replace(/<!--(?!\[if)[\s\S]*?-->/g, "")
  .replace(/^[ \t]*\r?\n/gm, "");

await emit("index.html", html);

/* ---------------------------------------------------------------- extras -- */
// A tiny manifest so a deploy can be identified after the fact.
await emit(
  "build.json",
  `${JSON.stringify(
    {
      built: new Date().toISOString(),
      js: jsName,
      css: cssName,
      vendored: VENDOR ? vendored : "cdn",
      node: process.version,
    },
    null,
    2
  )}\n`
);

/* ---------------------------------------------------------------- report -- */
const pad = (s, n) => String(s).padEnd(n);
console.log(`\n  ${pad("file", 34)}${pad("raw", 12)}gzip`);
console.log(`  ${"-".repeat(56)}`);
for (const r of report.sort((a, b) => b.raw - a.raw)) {
  console.log(`  ${pad(r.file, 34)}${pad(kb(r.raw), 12)}${kb(r.gzip)}`);
}
const total = report.reduce((a, r) => a + r.raw, 0);
const totalGz = report.reduce((a, r) => a + r.gzip, 0);
console.log(`  ${"-".repeat(56)}`);
console.log(`  ${pad(`${report.length} files`, 34)}${pad(kb(total), 12)}${kb(totalGz)}`);
console.log(`\n  → ${OUT}\n`);
