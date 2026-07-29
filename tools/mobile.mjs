/**
 * Mobile pass. Same walk as smoke.mjs but in a phone viewport, checking for
 * horizontal overflow (the classic killer of full-bleed scroll sites) as well
 * as console errors.
 *
 *   node tools/mobile.mjs [--dir dist]
 */

import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const dirArg = process.argv.indexOf("--dir");
const ROOT = resolve(
  process.cwd(),
  (dirArg !== -1 && process.argv[dirArg + 1]) || process.env.DIR || "."
);
const PORT = 4175;
const SHOTS = join(process.cwd(), "tools", "shots-mobile");
const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp" };
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
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2" });
await page.waitForSelector("#enter:not([hidden])");
await new Promise((r) => setTimeout(r, 2600));
await page.click("#enter");
await page.waitForFunction("!!window.__severance");
await new Promise((r) => setTimeout(r, 2200));

await mkdir(SHOTS, { recursive: true });

const marks = await page.evaluate(() =>
  [...document.querySelectorAll(".scene")].map((s) => ({ id: s.id, top: s.offsetTop, h: s.offsetHeight }))
);

const overflow = [];

for (const m of marks) {
  for (const f of [0.15, 0.5, 0.85]) {
    await page.evaluate((y) => {
      window.__severance.lenis.scrollTo(y, { immediate: true });
      window.__severance.ScrollTrigger.update();
    }, Math.round(m.top + m.h * f));
    await new Promise((r) => setTimeout(r, 950));
    await page.screenshot({ path: join(SHOTS, `${m.id}-${Math.round(f * 100)}.png`) });

    // Horizontal overflow probe: anything wider than the viewport that is not
    // a deliberately translated track.
    const bad = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out = [];
      document.querySelectorAll("main *").forEach((el) => {
        if (el.closest("[data-track]")) return;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > vw + 2 || r.left < -2)) {
          out.push(`${el.className || el.tagName} → ${Math.round(r.left)}..${Math.round(r.right)} (vw ${vw})`);
        }
      });
      return [...new Set(out)].slice(0, 6);
    });
    if (bad.length) overflow.push({ at: `${m.id}-${Math.round(f * 100)}`, bad });
  }
}

console.log("scrollWidth vs clientWidth:", await page.evaluate(() =>
  `${document.documentElement.scrollWidth} / ${document.documentElement.clientWidth}`
));
console.log("\noverflowing elements:");
overflow.forEach((o) => console.log(` ${o.at}\n   ${o.bad.join("\n   ")}`));
console.log(`\nerrors: ${errors.length}`);
errors.forEach((e) => console.log("  ✗", e));

await browser.close();
server.close();
