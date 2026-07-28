/**
 * Headless smoke test.
 *
 * Boots the site in the locally installed Chrome (software WebGL), clicks
 * through the boot terminal, then walks the whole scroll narrative capturing a
 * frame per chapter and reporting every console error, page exception, failed
 * request and WebGL shader warning.
 *
 *   node tools/smoke.mjs [--shots] [--dir dist]
 *
 * `--dir` points the server at a built folder instead of the source tree, which
 * is how the production output gets the same walk as the source.
 */

import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

// The site under test: the source tree by default, or a built folder.
const dirArg = process.argv.indexOf("--dir");
const ROOT = resolve(
  process.cwd(),
  (dirArg !== -1 && process.argv[dirArg + 1]) || process.env.DIR || "."
);
const PORT = 4173;
const SHOTS = join(process.cwd(), "tools", "shots");

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

/* ------------------------------------------------------------ dev server -- */
const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const file = join(ROOT, url === "/" ? "index.html" : url);
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

await new Promise((r) => server.listen(PORT, r));

/* ---------------------------------------------------------------- browser - */
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    "--headless=new",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--window-size=1440,900",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const errors = [];
const warnings = [];

page.on("console", (msg) => {
  const text = `${msg.type()}: ${msg.text()}`;
  if (msg.type() === "error") errors.push(text);
  else if (msg.type() === "warning") warnings.push(text);
});
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
page.on("requestfailed", (req) =>
  errors.push(`requestfailed: ${req.url()} — ${req.failure()?.errorText}`)
);

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2", timeout: 45000 });

/* --------------------------------------------------------------- entry --- */
await page.waitForSelector("#enter:not([hidden])", { timeout: 20000 });
await new Promise((r) => setTimeout(r, 2600)); // let the meter finish
await page.click("#enter");
await page.waitForFunction("!!window.__severance", { timeout: 25000 });
await new Promise((r) => setTimeout(r, 2500));

const total = await page.evaluate(() => document.documentElement.scrollHeight);
console.log(`document height: ${total}px (${(total / 900).toFixed(1)} viewports)`);

/* ------------------------------------------------------------- the walk --- */
const marks = await page.evaluate(() =>
  [...document.querySelectorAll(".scene")].map((s) => ({
    id: s.id,
    top: s.offsetTop,
    height: s.offsetHeight,
  }))
);

const stops = [];
marks.forEach((m) => {
  // Sample the beginning, middle and end of every chapter.
  [0.02, 0.35, 0.68, 0.95].forEach((f) =>
    stops.push({ id: `${m.id}-${Math.round(f * 100)}`, y: Math.round(m.top + m.height * f) })
  );
});

if (process.argv.includes("--shots")) await mkdir(SHOTS, { recursive: true });

for (const stop of stops) {
  await page.evaluate((y) => {
    window.__severance.lenis.scrollTo(y, { immediate: true });
    window.__severance.ScrollTrigger.update();
  }, stop.y);
  await new Promise((r) => setTimeout(r, 950));
  if (process.argv.includes("--shots")) {
    await page.screenshot({ path: join(SHOTS, `${stop.id}.png`) });
  }
}

/* ------------------------------------------------------------ diagnostics - */
const health = await page.evaluate(() => {
  const s = window.__severance;
  const p = s.world?.p;
  return {
    world: !!s.world,
    theme: document.documentElement.dataset.theme,
    glParams: p ? { corridor: p.corridor, camZ: Math.round(p.camZ), dust: +p.dust.toFixed(2) } : null,
    triggers: s.ScrollTrigger.getAll().length,
    splitNodes: document.querySelectorAll(".split-char, .split-word").length,
    hiddenSplits: [...document.querySelectorAll("[data-split]")].filter(
      (el) => getComputedStyle(el).visibility === "hidden"
    ).length,
    mdrCells: s.scenes?.macrodata?.screen?.cells?.length ?? 0,
  };
});

console.log("\nhealth:", JSON.stringify(health, null, 2));
console.log(`\nerrors: ${errors.length}`);
errors.forEach((e) => console.log("  ✗", e));
const notable = warnings.filter((w) => !/DevTools|Deprecation|favicon/i.test(w));
console.log(`warnings: ${notable.length}`);
notable.slice(0, 25).forEach((w) => console.log("  !", w));

await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
