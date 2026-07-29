/**
 * IMAGE PIPELINE
 *
 * Turns the original full-size plates in `img/src/` into the web-ready set the
 * site actually loads:
 *
 *   1. trims any baked-in letterbox bars, so the CSS owns the crop
 *   2. emits two WebP widths per plate for a sensible `srcset`
 *   3. emits a 20px blurred version of each as a data URI in
 *      `css/plates.lqip.css`, so a graded wash is on screen before the full
 *      image has decoded — no hard pop as a chapter arrives
 *   4. writes `img/plates.json` with real pixel dimensions, which the markup
 *      needs for width/height attributes (no layout shift)
 *
 *   node tools/images.mjs
 *
 * Only needs re-running when the source plates change. The outputs are
 * committed, so a normal build and a normal checkout need neither sharp nor
 * this script.
 */

import { readdir, mkdir, writeFile, readFile } from "node:fs/promises";
import { join, parse } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC = join(ROOT, "img", "src");
const OUT = join(ROOT, "img");

/** Widths per orientation. The sources are 1536px on the long edge; nothing is
 *  upscaled, because an invented pixel is worse than a soft one. */
const WIDTHS = { landscape: [1536, 960], portrait: [1024, 640] };
const QUALITY = 74; // everything is graded, blended and grain-overlaid on top

/**
 * Art-direction crops, as fractions of each edge, keyed by plate id. Applied
 * here rather than with `object-position` so that every delivered pixel is a
 * pixel that gets used; the CSS alternative is scaling the image up to push
 * unwanted content out of frame, which spends sharpness to hide something.
 *
 * Empty, and worth keeping empty: a crop this severe is a sign the plate is
 * framed wrongly, and re-shooting it beats throwing away half its resolution.
 */
const CROP = {};

/**
 * Detects letterbox bars: rows that are both nearly black and nearly uniform
 * across their whole width. Real photographic rows vary; synthetic bars do not,
 * which is what keeps this from eating into a genuinely dark composition.
 */
async function findBars(image, width, height) {
  const { data } = await image
    .clone()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rowIsBar = (y) => {
    let min = 255;
    let max = 0;
    for (let x = 0; x < width; x++) {
      const v = data[y * width + x];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return max < 14 && max - min < 5;
  };

  let top = 0;
  while (top < height / 4 && rowIsBar(top)) top++;
  let bottom = 0;
  while (bottom < height / 4 && rowIsBar(height - 1 - bottom)) bottom++;
  return { top, bottom };
}

await mkdir(OUT, { recursive: true });

const sources = (await readdir(SRC)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
if (!sources.length) throw new Error(`no source plates in ${SRC}`);

const manifest = {};
const lqip = [];
let bytes = 0;

for (const file of sources.sort()) {
  const id = parse(file).name;
  const input = sharp(join(SRC, file));
  const meta = await input.metadata();

  const bars = await findBars(input, meta.width, meta.height);
  const art = CROP[id] || {};
  const box = {
    left: Math.round(meta.width * (art.left || 0)),
    top: bars.top + Math.round(meta.height * (art.top || 0)),
    width: Math.round(meta.width * (1 - (art.left || 0) - (art.right || 0))),
    height:
      meta.height -
      bars.top -
      bars.bottom -
      Math.round(meta.height * ((art.top || 0) + (art.bottom || 0))),
  };

  const cropped =
    box.top || box.left || box.width !== meta.width || box.height !== meta.height
      ? input.clone().extract(box)
      : input.clone();

  const w = box.width;
  const h = box.height;
  // Requested widths are clamped to what the source actually has rather than
  // discarded, so a cropped plate still gets a full-size variant instead of
  // silently losing its largest one. Neighbours that end up within 15% of each
  // other are collapsed: two variants that close are a wasted encode and a
  // `srcset` the browser gains nothing from choosing between.
  const widths = WIDTHS[w >= h ? "landscape" : "portrait"]
    .map((x) => Math.min(x, w))
    .sort((a, b) => b - a)
    .filter((x, i, all) => i === 0 || x <= all[i - 1] * 0.85);

  const variants = [];
  for (const width of widths) {
    const buf = await cropped
      .clone()
      .resize({ width, kernel: "lanczos3" })
      .webp({ quality: QUALITY, effort: 6 })
      .toBuffer();
    const name = `${id}-${width}.webp`;
    await writeFile(join(OUT, name), buf);
    variants.push({ width, height: Math.round((h / w) * width), file: name, bytes: buf.length });
    bytes += buf.length;
  }

  // The placeholder: small enough that the data URI is cheaper than a request.
  const tiny = await cropped
    .clone()
    .resize({ width: 20 })
    .blur(1.4)
    .webp({ quality: 40 })
    .toBuffer();
  lqip.push(
    `[data-plate="${id}"] {\n  --lqip: url("data:image/webp;base64,${tiny.toString("base64")}");\n}`
  );

  manifest[id] = { width: w, height: h, trimmed: bars, crop: art, variants };

  const notes = [];
  if (bars.top || bars.bottom) notes.push(`bars ${bars.top}/${bars.bottom}`);
  if (CROP[id]) notes.push("art crop");
  const label = notes.length ? ` (${notes.join(", ")})` : "";
  console.log(
    `  ${id.padEnd(14)} ${w}×${h}${label.padEnd(22)} ` +
      variants.map((v) => `${v.width}w ${(v.bytes / 1024).toFixed(0)}kB`).join("  ") +
      `  lqip ${(tiny.length / 1024).toFixed(1)}kB`
  );
}

await writeFile(join(OUT, "plates.json"), `${JSON.stringify(manifest, null, 2)}\n`);

await writeFile(
  join(ROOT, "css", "plates.lqip.css"),
  `/* GENERATED by tools/images.mjs — do not edit.\n` +
    `   A 20px blurred stand-in per plate, inlined so the wash is painted with the\n` +
    `   stylesheet rather than after a second round trip. */\n\n${lqip.join("\n\n")}\n`
);

console.log(`\n  ${sources.length} plates → ${(bytes / 1024 / 1024).toFixed(2)} MB of WebP`);
console.log(`  manifest: img/plates.json · placeholders: css/plates.lqip.css\n`);
