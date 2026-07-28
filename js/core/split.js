/**
 * SPLIT
 * A minimal, dependency-free text splitter.
 *
 * Why hand-rolled? Every headline in this project is revealed by lifting
 * glyphs out of a clipping frame, which means we need three things a generic
 * plugin does not give us for free:
 *
 *   1. real per-line overflow masks (`.line-mask`) that respect <br> *and*
 *      natural wrapping,
 *   2. stable re-splitting on resize without losing GSAP references,
 *   3. zero external dependency in the critical path.
 *
 * Usage:  const s = split(el, { mode: "chars" });  →  { chars, words, lines }
 */

const WORD_CLASS = "split-word";
const CHAR_CLASS = "split-char";

/** Flatten an element's children into a list of word strings and <br> markers. */
function tokenize(el) {
  const tokens = [];
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent
        .split(/(\s+)/)
        .filter((t) => t.trim().length)
        .forEach((word) => tokens.push({ type: "word", text: word }));
    } else if (node.nodeName === "BR") {
      tokens.push({ type: "break" });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Inline element (e.g. <cite>): keep its markup as a single word unit.
      tokens.push({ type: "word", html: node.outerHTML, text: node.textContent });
    }
  });
  return tokens;
}

/** Build the flat word layer so the browser can tell us where lines break. */
function buildWords(el, tokens) {
  const frag = document.createDocumentFragment();
  const words = [];

  tokens.forEach((token, i) => {
    if (token.type === "break") {
      frag.appendChild(document.createElement("br"));
      return;
    }
    const span = document.createElement("span");
    span.className = WORD_CLASS;
    if (token.html) span.innerHTML = token.html;
    else span.textContent = token.text;
    frag.appendChild(span);
    words.push(span);
    // Preserve inter-word spacing as real text so wrapping stays natural.
    if (tokens[i + 1] && tokens[i + 1].type !== "break") {
      frag.appendChild(document.createTextNode(" "));
    }
  });

  el.innerHTML = "";
  el.appendChild(frag);
  return words;
}

/** Group already-laid-out words into visual lines by their vertical offset. */
function groupLines(words) {
  const lines = [];
  let currentTop = null;
  let bucket = null;

  words.forEach((word) => {
    const top = Math.round(word.getBoundingClientRect().top);
    // 4px tolerance absorbs sub-pixel baseline noise between glyphs.
    if (currentTop === null || Math.abs(top - currentTop) > 4) {
      currentTop = top;
      bucket = [];
      lines.push(bucket);
    }
    bucket.push(word);
  });

  return lines;
}

/** Split a word span into per-character spans. */
function explodeChars(word) {
  const text = word.textContent;
  const chars = [];
  word.textContent = "";
  [...text].forEach((ch) => {
    const span = document.createElement("span");
    span.className = CHAR_CLASS;
    // Non-breaking space keeps hard-spaced titles from collapsing.
    span.textContent = ch === " " ? "\u00A0" : ch;
    word.appendChild(span);
    chars.push(span);
  });
  return chars;
}

/**
 * Split `el` into masked lines, words and (optionally) characters.
 * @param {HTMLElement} el
 * @param {{ mode?: "lines"|"words"|"chars" }} options
 */
export function split(el, { mode = "words" } = {}) {
  // Cache the pristine markup so a resize can re-split from scratch.
  if (!el.dataset.splitOriginal) el.dataset.splitOriginal = el.innerHTML;
  else el.innerHTML = el.dataset.splitOriginal;

  // Screen readers read the label, not the shrapnel.
  if (!el.getAttribute("aria-label")) {
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
  }

  const words = buildWords(el, tokenize(el));
  const lineGroups = groupLines(words);

  // Re-assemble: each visual line gets its own overflow-hidden frame.
  const frag = document.createDocumentFragment();
  const lines = [];

  lineGroups.forEach((group) => {
    const mask = document.createElement("span");
    mask.className = "line-mask";
    const inner = document.createElement("span");
    inner.className = "split-line";
    inner.style.display = "block";
    inner.style.willChange = "transform";

    group.forEach((word, i) => {
      inner.appendChild(word);
      if (i < group.length - 1) inner.appendChild(document.createTextNode(" "));
    });

    mask.appendChild(inner);
    frag.appendChild(mask);
    lines.push(inner);
  });

  el.innerHTML = "";
  el.appendChild(frag);
  el.setAttribute("role", "text");

  const chars = mode === "chars" ? words.flatMap(explodeChars) : [];

  return { el, lines, words, chars, mode };
}

/**
 * Split every element matching a selector and keep the results addressable.
 * Also re-splits on demand (used by the resize handler in main.js).
 */
export class SplitRegistry {
  constructor() {
    this.entries = new Map();
  }

  add(el, mode) {
    const result = split(el, { mode });
    this.entries.set(el, { mode, result });
    el.classList.add("is-prepared");
    return result;
  }

  get(el) {
    return this.entries.get(el)?.result;
  }

  /** Re-measure line breaks after a viewport change. */
  refresh() {
    this.entries.forEach((entry, el) => {
      entry.result = split(el, { mode: entry.mode });
    });
  }
}
