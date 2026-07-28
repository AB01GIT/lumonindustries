/** One-off: dump dossier + inner element state at a given scroll offset. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const ROOT = process.cwd();
const PORT = 4176;
const CHROME = ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"].find((p) => existsSync(p));
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  try {
    const f = join(ROOT, req.url === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0]));
    res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" });
    res.end(await readFile(f));
  } catch {
    res.writeHead(404).end("x");
  }
});
await new Promise((r) => server.listen(PORT, r));

const w = Number(process.argv[2] || 390);
const h = Number(process.argv[3] || 844);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setViewport({ width: w, height: h });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2" });
await page.waitForSelector("#enter:not([hidden])");
await new Promise((r) => setTimeout(r, 2600));
await page.click("#enter");
await page.waitForFunction("!!window.__severance");
await new Promise((r) => setTimeout(r, 1500));

const info = await page.evaluate(() => {
  const s = document.querySelector("#personnel");
  return { top: s.offsetTop, height: s.offsetHeight };
});

const y = Math.round(info.top + info.height * 0.5);
await page.evaluate((v) => {
  window.__severance.lenis.scrollTo(v, { immediate: true });
  window.__severance.ScrollTrigger.update();
}, y);
await new Promise((r) => setTimeout(r, 900));

const out = await page.evaluate(() => {
  const track = document.querySelector("[data-track]");
  const cards = [...document.querySelectorAll("[data-dossier]")];
  return {
    trackX: getComputedStyle(track).transform,
    trackWidth: track.scrollWidth,
    viewport: innerWidth,
    triggers: window.__severance.ScrollTrigger.getAll()
      .filter((t) => t.animation && t.vars.containerAnimation)
      .length,
    cards: cards.map((c, i) => {
      const r = c.getBoundingClientRect();
      const name = c.querySelector(".dossier__name");
      const quote = c.querySelector(".dossier__quote");
      return {
        i,
        left: Math.round(r.left),
        right: Math.round(r.right),
        cardOpacity: getComputedStyle(c).opacity,
        nameOpacity: name ? getComputedStyle(name).opacity : null,
        nameTransform: name ? getComputedStyle(name).transform : null,
        quoteOpacity: quote ? getComputedStyle(quote).opacity : null,
      };
    }),
  };
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
server.close();
