/**
 * SCROLL
 * Lenis owns the scroll position; ScrollTrigger owns the storytelling.
 *
 * Lenis 1.x scrolls the real document (no transformed wrapper), so the two
 * libraries only need one bridge: forward Lenis' scroll event into
 * ScrollTrigger.update() and drive Lenis' rAF from GSAP's single ticker. One
 * loop for the whole site keeps everything phase-locked and avoids the
 * double-rAF jitter you get when each library animates on its own clock.
 */

import { qsa, clamp, prefersReducedMotion } from "./utils.js";

const state = {
  lenis: null,
  velocity: 0,
  progress: 0,
  theme: "outie",
  resolvePalette: null,
};

/* --------------------------------------------------------------- theme --- */
const themeListeners = new Set();

/** Cross-fade the global palette. Idempotent, so scenes can call it freely. */
export function setTheme(name) {
  if (state.theme === name) return;
  state.theme = name;
  document.documentElement.dataset.theme = name;
  themeListeners.forEach((fn) => fn(name));
}

export const onTheme = (fn) => {
  themeListeners.add(fn);
  return () => themeListeners.delete(fn);
};

export const getTheme = () => state.theme;

/* -------------------------------------------------------------- public --- */
export const getLenis = () => state.lenis;
/** Signed scroll velocity, useful for motion blur / aberration intensity. */
export const getVelocity = () => state.velocity;
/** Whole-document progress, 0 → 1. */
export const getProgress = () => state.progress;

export function stopScroll() {
  state.lenis?.stop();
  document.body.classList.add("is-locked");
}

export function startScroll() {
  state.lenis?.start();
  document.body.classList.remove("is-locked");
}

export function scrollTo(target, options = {}) {
  state.lenis?.scrollTo(target, { duration: 1.6, ...options });
}

/* ---------------------------------------------------------------- init --- */
export function initScroll() {
  const reduced = prefersReducedMotion();

  const lenis = new Lenis({
    // A slightly heavy lerp gives the descent its "freight elevator" weight.
    lerp: reduced ? 1 : 0.085,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.4,
    smoothWheel: !reduced,
    syncTouch: false,
    autoRaf: false,
  });

  state.lenis = lenis;

  lenis.on("scroll", ({ velocity, progress }) => {
    state.velocity = velocity;
    state.progress = progress || 0;
    ScrollTrigger.update();
    // After the update, so the zones report the position we just moved to.
    state.resolvePalette?.();
  });

  // Single source of animation truth.
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  ScrollTrigger.defaults({ invalidateOnRefresh: true });

  // Because pinning is done with CSS `position: sticky`, ScrollTrigger never
  // mutates layout — a refresh is therefore cheap and safe at any time.
  ScrollTrigger.config({ ignoreMobileResize: true });

  initPaletteController();

  return lenis;
}

/* ---------------------------------------------------- palette controller -- */
/**
 * Each scene declares `data-palette`. Whichever scene owns the middle of the
 * viewport owns the palette of the entire document.
 *
 * The palette is *derived* from the current scroll position rather than driven
 * by `onEnter` callbacks. Crossing events are only reliable when the visitor
 * moves continuously: jump several chapters in one frame — a hash link, a
 * restored scroll position, `scrollTo` — and several zones report their crossing
 * in the same pass, so the last callback to run wins rather than the correct
 * one. Reading state instead makes every arrival, however abrupt, land on the
 * right palette.
 *
 * Scenes with no `data-palette` (the descent) leave no zone active, and the
 * resolver deliberately holds the current palette there: that chapter animates
 * the theme itself, mid-timeline, on the frame the severance barrier closes.
 */
function initPaletteController() {
  const zones = qsa("[data-palette]").map((scene) => ({
    palette: scene.dataset.palette,
    st: ScrollTrigger.create({ trigger: scene, start: "top 45%", end: "bottom 45%" }),
  }));

  const resolve = () => {
    // Later scenes win, so a boundary always resolves to the chapter arriving.
    let found = null;
    for (const zone of zones) if (zone.st.isActive) found = zone.palette;
    if (found) setTheme(found);
  };

  state.resolvePalette = resolve;
  ScrollTrigger.addEventListener("refresh", resolve);
  resolve();
}

/* ------------------------------------------------------------- helpers --- */
/**
 * Normalised progress of a scrubbed timeline, remapped to a sub-window.
 * Handy for sequencing several beats inside one pinned scene.
 */
export const window0to1 = (p, start, end) => clamp((p - start) / (end - start));
