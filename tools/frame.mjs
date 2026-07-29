/**
 * Single-frame inspector: boots the site, jumps to one scroll position and
 * captures the viewport, printing the HUD state that goes with it.
 *
 *   node tools/frame.mjs <scrollY|#section[:fraction]> [out.png]
 *   DSF=2 VIEW=1440x900 node tools/frame.mjs 21000 tools/frame.png
 *   DSF=2 node tools/frame.mjs #handbook:0.35 tools/frame.png
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
const target = process.argv[2] || "0";
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
  ".webp": "image/webp",
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

// `#section:fraction` resolves in the page, so a chapter can be named instead of
// measured — the offsets move every time a scene's scroll length is retuned.
await page.evaluate((t) => {
  let y = Number(t);
  if (Number.isNaN(y)) {
    const [id, frac] = t.replace("#", "").split(":");
    const el = document.getElementById(id);
    y = el ? el.offsetTop + el.offsetHeight * (Number(frac) || 0.35) : 0;
  }
  window.__severance.lenis.scrollTo(Math.round(y), { immediate: true });
  window.__severance.ScrollTrigger.update();
}, target);
await new Promise((r) => setTimeout(r, 1400));

console.log(
  await page.evaluate(() => {
    // Relative luminance per WCAG, so the HUD's contrast against whatever the
    // plate has left behind it can be read as a number rather than eyeballed.
    const lum = (c) => {
      const [r, g, b] = c.match(/[\d.]+/g).map(Number).slice(0, 3);
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => {
      const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
      return ((x + 0.05) / (y + 0.05)).toFixed(2);
    };
    // Resolved through a throwaway element so the comparison is against the
    // rgb() the browser actually paints, not the hex in the stylesheet.
    const resolve = (v) => {
      const probeEl = document.createElement("span");
      probeEl.style.color = v;
      document.body.appendChild(probeEl);
      const out = getComputedStyle(probeEl).color;
      probeEl.remove();
      return out;
    };
    const bg = resolve(
      getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()
    );
    const probe = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        color: cs.color,
        fgVar: cs.getPropertyValue("--fg").trim(),
        contrast: ratio(cs.color, bg),
      };
    };
    return {
      scrollY: Math.round(window.scrollY),
      theme: document.documentElement.dataset.theme,
      chapter: document.querySelector(".rail__item.is-active")?.textContent.trim(),
      floor: document.querySelector("[data-hud-floor]")?.textContent,
      depth: document.querySelector("[data-hud-depth]")?.textContent,
      bg,
      hudOpacity: getComputedStyle(document.querySelector(".hud")).opacity,
      brand: probe(".hud__brand"),
      meta: probe(".hud__meta"),
      gauge: probe(".hud__depth"),
      rail: probe(".rail__item.is-active"),
      plates: [...document.querySelectorAll(".plate")]
        .filter((p) => getComputedStyle(p).visibility !== "hidden")
        .map((p) => {
          const img = p.querySelector("img");
          return {
            plate: p.dataset.plate,
            alpha: Number(getComputedStyle(p).opacity).toFixed(2),
            loaded: `${img?.naturalWidth || 0}x${img?.naturalHeight || 0}`,
          };
        }),
    };
  })
);

// No `clip`: a clipped capture expands the layout viewport, which stops the
// fixed HUD compositing and returns a convincingly empty frame.
await page.screenshot({ path: join(process.cwd(), out) });
console.log(`wrote ${out}`);

await browser.close();
server.close();
