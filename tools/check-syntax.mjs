/**
 * Parse-check every module in js/ without a bundler.
 *
 * `node --check` treats a bare .js file as CommonJS, so ES module syntax would
 * fail spuriously. Instead each file is copied to a temporary .mjs and checked
 * as a module. Run with:  node tools/check-syntax.mjs
 */

import { readdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (extname(entry.name) === ".js") out.push(full);
  }
  return out;
}

const files = await walk(join(root, "js"));
const tmp = await mkdtemp(join(tmpdir(), "sev-check-"));
let failed = 0;

for (const file of files) {
  const copy = join(tmp, relative(root, file).replace(/[\\/]/g, "__") + ".mjs");
  await writeFile(copy, await readFile(file));
  try {
    await run(process.execPath, ["--check", copy]);
    console.log(`ok    ${relative(root, file)}`);
  } catch (err) {
    failed++;
    console.error(`FAIL  ${relative(root, file)}\n${err.stderr || err.message}`);
  }
}

await rm(tmp, { recursive: true, force: true });
console.log(`\n${files.length - failed}/${files.length} modules parsed cleanly.`);
process.exit(failed ? 1 : 0);
