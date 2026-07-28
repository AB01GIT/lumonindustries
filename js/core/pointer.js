/**
 * POINTER
 * A two-part custom cursor: a hard dot that tracks precisely and a soft ring
 * that trails behind on a spring. Interactive elements declare their intent
 * with `data-cursor="link|hold|refine"`, which the body mirrors so the styling
 * lives entirely in CSS.
 *
 * Also provides the "magnetic" micro-interaction: elements tagged with
 * `data-magnet` lean toward the pointer when it is nearby.
 */

import { qs, qsa, Spring, isTouch, clamp } from "./utils.js";
import { audio } from "./audio.js";

export function initPointer() {
  if (isTouch()) return null;

  const root = qs(".pointer");
  const dot = qs(".pointer__dot");
  const ring = qs(".pointer__ring");
  const label = qs(".pointer__label");
  if (!root) return null;

  document.body.dataset.pointer = "custom";

  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const dotX = new Spring({ value: mouse.x, stiffness: 0.34, damping: 0.62 });
  const dotY = new Spring({ value: mouse.y, stiffness: 0.34, damping: 0.62 });
  const ringX = new Spring({ value: mouse.x, stiffness: 0.11, damping: 0.72 });
  const ringY = new Spring({ value: mouse.y, stiffness: 0.11, damping: 0.72 });

  let visible = false;

  window.addEventListener(
    "pointermove",
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (!visible) {
        visible = true;
        gsap.to(root, { opacity: 1, duration: 0.4 });
      }
    },
    { passive: true }
  );

  window.addEventListener("pointerdown", () => gsap.to(ring, { scale: 0.7, duration: 0.2 }));
  window.addEventListener("pointerup", () => gsap.to(ring, { scale: 1, duration: 0.35 }));
  document.addEventListener("pointerleave", () => {
    visible = false;
    gsap.to(root, { opacity: 0, duration: 0.3 });
  });

  /* -------------------------------------------------------- hover intent -- */
  const setState = (state, text = "") => {
    if (state) document.body.dataset.pointerState = state;
    else delete document.body.dataset.pointerState;
    if (label) label.textContent = text;
  };

  const bindTargets = () => {
    qsa("[data-cursor]").forEach((el) => {
      if (el.dataset.cursorBound) return;
      el.dataset.cursorBound = "1";
      const kind = el.dataset.cursor;
      const text = el.dataset.cursorLabel || (kind === "hold" ? "Press" : "");
      el.addEventListener("pointerenter", () => {
        setState(kind, text);
        audio.blip(1320, { gain: 0.025, duration: 0.05 });
      });
      el.addEventListener("pointerleave", () => setState(null));
    });
  };
  bindTargets();

  /* ------------------------------------------------------------ magnetic -- */
  const magnets = qsa("[data-magnet]").map((el) => ({
    el,
    strength: parseFloat(el.dataset.magnet) || 0.28,
    x: new Spring({ stiffness: 0.1, damping: 0.74 }),
    y: new Spring({ stiffness: 0.1, damping: 0.74 }),
  }));

  /* ---------------------------------------------------------------- loop -- */
  gsap.ticker.add(() => {
    dotX.target = mouse.x;
    dotY.target = mouse.y;
    ringX.target = mouse.x;
    ringY.target = mouse.y;

    dot.style.transform = `translate3d(${dotX.update()}px, ${dotY.update()}px, 0)`;
    ring.style.transform = `translate3d(${ringX.update()}px, ${ringY.update()}px, 0)`;

    magnets.forEach((m) => {
      const r = m.el.getBoundingClientRect();
      if (!r.width) return; // hidden or removed: skip the spring entirely
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = mouse.x - cx;
      const dy = mouse.y - cy;
      const dist = Math.hypot(dx, dy);
      const radius = Math.max(r.width, r.height) * 1.5;
      const pull = clamp(1 - dist / radius) * m.strength;
      m.x.target = dx * pull;
      m.y.target = dy * pull;
      // Written as custom properties which each target folds into its own CSS
      // `translate`, never into `transform`. Both buttons that use this are
      // also animated by GSAP, which owns `transform` outright — `translate`
      // composes alongside it instead of being overwritten.
      m.el.style.setProperty("--mx", `${m.x.update().toFixed(2)}px`);
      m.el.style.setProperty("--my", `${m.y.update().toFixed(2)}px`);
    });
  });

  return { setState, bindTargets };
}
