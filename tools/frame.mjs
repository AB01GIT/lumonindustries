/**
 * Single-frame inspector: boots the site, jumps to one scroll position and
 * captures the viewport, printing the HUD state that goes with it.
 *
 *   node tools/frame.mjs <scrollY> [out.png]
 *   DSF=2 VIEW=1440x900 node tools/frame.mjs 21000 tools/frame.png
 *
 * Useful when a chapter needs judging in isolation — `smoke.mjs` walks the
 * whole narrative, which is slower and samples fixed fractions.
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const ROOT = resolve(process.cwd(), process.env.DIR || ".");
const PORT = 4179;
const DSF = Number(process.env.DSF) || 1;
const [vw, vh] = (process.env.VIEW || "1440x900").split("x").map(Number);
const scrollY = Number(process.argv[2]) || 0;
const out = process.argv[3] || "tools/frame.png";

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const file = join(ROOT, url === "/" ? "index.html" : url);
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end("not found");
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    "--headless=new",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: vw, height: vh, deviceScaleFactor: DSF });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2" });
await page.waitForSelector("#enter:not([hidden])");
await new Promise((r) => setTimeout(r, 2600));
await page.click("#enter");
await page.waitForFunction("!!window.__severance");
await new Promise((r) => setTimeout(r, 2200));

await page.evaluate((y) => {
  window.__severance.lenis.scrollTo(y, { immediate: true });
  window.__severance.ScrollTrigger.update();
}, scrollY);
await new Promise((r) => setTimeout(r, 1400));

console.log(
  await page.evaluate(() => ({
    scrollY: Math.round(window.scrollY),
    theme: document.documentElement.dataset.theme,
    chapter: document.querySelector(".rail__item.is-active")?.textContent.trim(),
    floor: document.querySelector("[data-hud-floor]")?.textContent,
    depth: document.querySelector("[data-hud-depth]")?.textContent,
  }))
);

// No `clip`: a clipped capture expands the layout viewport, which stops the
// fixed HUD compositing and returns a convincingly empty frame.
await page.screenshot({ path: join(process.cwd(), out) });
console.log(`wrote ${out}`);

await browser.close();
server.close();
