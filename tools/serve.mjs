/**
 * Minimal static file server for local development.
 *
 * The site is plain HTML/CSS/JS, but it uses ES modules and an import map, so
 * it has to be served over HTTP rather than opened from the filesystem.
 *
 *   node tools/serve.mjs [port]
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize, sep } from "node:path";

const ROOT = process.cwd();
const PORT = Number(process.argv[2]) || 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = join(ROOT, normalize(url === "/" ? "/index.html" : url));

  // Refuse to serve anything that escapes the project root.
  if (!file.startsWith(ROOT + sep)) {
    res.writeHead(403).end("forbidden");
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": MIME[extname(file)] || "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

server.listen(PORT, () => {
  console.log(`Lumon terminal online → http://localhost:${PORT}/`);
});
