/**
 * Ad-hoc layout probe. Boots the site, jumps to a scroll offset, and dumps
 * the computed geometry of whichever selectors are passed on the command line.
 *
 *   node tools/probe.mjs <scrollY> "<selector>" ["<selector>" ...]
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const ROOT = process.cwd();
const PORT = 4174;
const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  try {
    const file = join(ROOT, req.url === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0]));
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end("nope");
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2" });
await page.waitForSelector("#enter:not([hidden])");
await new Promise((r) => setTimeout(r, 2600));
await page.click("#enter");
await page.waitForFunction("!!window.__severance");
await new Promise((r) => setTimeout(r, 1800));

const [y, ...selectors] = process.argv.slice(2);
if (y) {
  await page.evaluate((v) => {
    window.__severance.lenis.scrollTo(Number(v), { immediate: true });
    window.__severance.ScrollTrigger.update();
  }, y);
  await new Promise((r) => setTimeout(r, 600));
}

const out = await page.evaluate((sels) => {
  return sels.map((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, missing: true };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      sel,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      display: cs.display,
      opacity: cs.opacity,
      visibility: cs.visibility,
      transform: cs.transform === "none" ? "none" : cs.transform.slice(0, 60),
      fontSize: cs.fontSize,
      overflow: `${cs.overflowX}/${cs.overflowY}`,
      text: (el.textContent || "").trim().slice(0, 42),
    };
  });
}, selectors);

console.log(JSON.stringify(out, null, 2));
await browser.close();
server.close();
