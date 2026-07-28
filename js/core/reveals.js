/**
 * REVEALS
 * Shared entrance choreography.
 *
 * Every headline in the project is split once, up front, and then *scenes*
 * decide when to play it. Centralising the actual motion here is what gives
 * eight very different chapters a single, recognisable rhythm: type always
 * arrives by being lifted out of a mask, never by fading in place.
 */

import { qsa } from "./utils.js";
import { SplitRegistry } from "./split.js";

export const registry = new SplitRegistry();

/** Signature easing for the whole site: a fast, decisive settle. */
export const EASE = "cubic-bezier(0.16,1,0.3,1)";

/* ---------------------------------------------------------------- setup --- */
/**
 * Split every marked element and park it in its "before" state.
 * Called once, immediately after fonts are ready (so line breaks are correct).
 */
export function prepare() {
  qsa("[data-split]").forEach((el) => {
    const mode = el.dataset.split;
    const { chars, words, lines } = registry.add(el, mode);

    const units = mode === "chars" ? chars : mode === "words" ? words : lines;
    gsap.set(units, { yPercent: 118, opacity: mode === "chars" ? 1 : 0.001 });
    el.dataset.revealState = "hidden";
  });

  qsa("[data-reveal]").forEach((el) => {
    el.classList.add("is-prepared");
    gsap.set(el, { opacity: 0, y: 18 });
    el.dataset.revealState = "hidden";
  });
}

/* --------------------------------------------------------------- reveal --- */
/**
 * Play (or instantly complete) the entrance for one element.
 * @param {HTMLElement} el
 * @param {object} o
 * @returns {gsap.core.Tween|undefined}
 */
export function reveal(el, o = {}) {
  if (!el) return;
  const {
    duration = 1.15,
    stagger,
    delay = 0,
    from = "start",
    ease = "expo.out",
    instant = false,
  } = o;

  el.dataset.revealState = "shown";

  const split = registry.get(el);

  // Plain element (no split): a short lift and fade.
  if (!split) {
    return gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: instant ? 0 : duration * 0.7,
      delay: instant ? 0 : delay,
      ease: "power3.out",
    });
  }

  const { mode, chars, words, lines } = split;
  const units = mode === "chars" ? chars : mode === "words" ? words : lines;
  const step = stagger ?? (mode === "chars" ? 0.028 : mode === "words" ? 0.055 : 0.09);

  return gsap.to(units, {
    yPercent: 0,
    opacity: 1,
    duration: instant ? 0 : duration,
    delay: instant ? 0 : delay,
    ease,
    stagger: instant ? 0 : { each: step, from },
  });
}

/** Reverse of `reveal` — used when a scene hands off to the next one. */
export function conceal(el, o = {}) {
  if (!el) return;
  const { duration = 0.7, stagger, ease = "expo.in", direction = -1 } = o;
  el.dataset.revealState = "hidden";

  const split = registry.get(el);
  if (!split) return gsap.to(el, { opacity: 0, y: 18 * -direction, duration, ease });

  const { mode, chars, words, lines } = split;
  const units = mode === "chars" ? chars : mode === "words" ? words : lines;
  const step = stagger ?? (mode === "chars" ? 0.014 : 0.04);

  return gsap.to(units, {
    yPercent: 118 * direction,
    opacity: mode === "chars" ? 1 : 0,
    duration,
    ease,
    stagger: { each: step, from: "end" },
  });
}

/**
 * Convenience: reveal `el` the first time it enters view.
 * Used for content that no scene timeline is scrubbing directly.
 */
export function revealOnEnter(el, o = {}) {
  if (!el) return;
  ScrollTrigger.create({
    trigger: o.trigger || el,
    start: o.start || "top 82%",
    once: true,
    onEnter: () => reveal(el, o),
  });
}

/* --------------------------------------------------------- scatter exit --- */
/**
 * Explode a split headline outward. This is how the induction title is torn
 * apart when the elevator doors close over it.
 */
export function scatter(el, { duration = 1.1, spread = 140 } = {}) {
  const split = registry.get(el);
  if (!split) return;
  const units = split.mode === "chars" ? split.chars : split.words;

  return gsap.to(units, {
    yPercent: () => gsap.utils.random(-spread, spread),
    xPercent: () => gsap.utils.random(-spread * 0.4, spread * 0.4),
    rotation: () => gsap.utils.random(-24, 24),
    opacity: 0,
    duration,
    ease: "power3.in",
    stagger: { each: 0.012, from: "center" },
  });
}
