/**
 * UTILS
 * Tiny, dependency-free helpers shared by every scene module.
 */

/* ----------------------------------------------------------------- DOM --- */
export const qs = (sel, scope = document) => scope.querySelector(sel);
export const qsa = (sel, scope = document) => [...scope.querySelectorAll(sel)];

/* ----------------------------------------------------------------- math -- */
export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Remap a value from one range to another, clamped to the output range. */
export const mapRange = (v, inMin, inMax, outMin, outMax) =>
  outMin + ((clamp(v, inMin, inMax) - inMin) / (inMax - inMin)) * (outMax - outMin);

/** Smooth 0→1 ramp with zero derivative at both ends (GLSL smoothstep). */
export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export const rand = (min, max) => min + Math.random() * (max - min);
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Left-pad a number, e.g. pad(7, 3) → "007". */
export const pad = (n, size = 2) => String(Math.floor(n)).padStart(size, "0");

/* ------------------------------------------------------------ platform -- */
export const isTouch = () =>
  window.matchMedia("(hover: none)").matches || navigator.maxTouchPoints > 0;

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Coarse capability probe used to decide how much WebGL to spend. */
export const deviceTier = () => {
  // Device Memory is Chromium-only and needs a secure context, so the fallback
  // is the common case rather than the exception; core count and the short
  // viewport edge carry most of the decision.
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  if (prefersReducedMotion()) return "low";
  if (small || cores <= 4 || mem <= 2) return "mid";
  return "high";
};

/* -------------------------------------------------------------- events -- */
/** Debounced resize that also survives mobile browser chrome changes. */
export function onResize(fn, wait = 180) {
  let id;
  const run = () => {
    clearTimeout(id);
    id = setTimeout(fn, wait);
  };
  window.addEventListener("resize", run, { passive: true });
  window.addEventListener("orientationchange", run, { passive: true });
  return () => {
    window.removeEventListener("resize", run);
    window.removeEventListener("orientationchange", run);
  };
}

/* -------------------------------------------------------------- spring -- */
/**
 * Framer-Motion-inspired critically-tunable spring, integrated by hand so it
 * can be driven from any rAF loop (GSAP ticker, WebGL loop, canvas loop).
 *
 *   const s = new Spring({ stiffness: 0.09, damping: 0.72 });
 *   s.target = 120;
 *   s.update();  // → returns the eased current value
 */
export class Spring {
  constructor({ value = 0, stiffness = 0.08, damping = 0.75 } = {}) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  set(v) {
    this.value = this.target = v;
    this.velocity = 0;
    return this;
  }

  update() {
    const force = (this.target - this.value) * this.stiffness;
    this.velocity = (this.velocity + force) * this.damping;
    this.value += this.velocity;
    return this.value;
  }

  get settled() {
    return Math.abs(this.target - this.value) < 0.001 && Math.abs(this.velocity) < 0.001;
  }
}

/* --------------------------------------------------------------- misc ---- */
/** Fire `fn` the first time `el` enters the viewport, then disconnect. */
export function once(el, fn, rootMargin = "0px") {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    },
    { rootMargin }
  );
  io.observe(el);
  return io;
}

/** Promise that resolves on the next animation frame. */
export const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
