/**
 * SCENE 05 — DOCTRINE
 *
 * Kier's nine core principles, mounted on a wheel that the scroll turns. The
 * wheel is laid out in JavaScript rather than with static CSS transforms
 * because each word must stay perfectly upright while its *position* travels
 * around the circle — a counter-rotation trick that only works if the ring's
 * angle and the glyphs' angle are computed together, every frame.
 *
 * As each tenet reaches the marker the ledger on the left swaps its heading
 * with a clipped morph, so the two halves of the composition feel mechanically
 * linked.
 */

import { qs, qsa, pad, clamp } from "../core/utils.js";
import { registry } from "../core/reveals.js";
import { audio } from "../core/audio.js";

export function initHandbook({ world }) {
  const section = qs("#handbook");
  const ring = qs("[data-ring]");
  if (!section || !ring) return;

  const items = qsa(".ring__list li");
  const display = qs("[data-tenet-display]");
  const gloss = qs("[data-tenet-gloss]");
  const indexLabel = qs("[data-tenet-index]");
  const kicker = qs(".handbook__kicker");
  const kier = qs("[data-kier]");
  const kierWords = registry.get(qs("[data-kier] p"))?.words || [];

  const p = world?.p ?? {};
  const STEP = 360 / items.length;
  // `slot` advances linearly with scroll; `angle` is derived from it through a
  // dwell curve so each tenet *rests* on the marker instead of sliding past it.
  const state = { slot: 0, angle: 0 };

  let radius = 0;
  const measure = () => {
    radius = ring.clientWidth * 0.4;
  };
  measure();
  window.addEventListener("resize", measure, { passive: true });

  /* -------------------------------------------------------------- layout -- */
  /**
   * Dwell curve: within each slot the wheel holds still for the first 40% and
   * the last 20%, and travels during the middle 40%. Mechanically it reads like
   * a detented dial, and it guarantees the highlighted word is the word the
   * marker is pointing at.
   */
  function advance() {
    const slot = clamp(state.slot, 0, items.length - 1);
    const base = Math.floor(slot);
    const frac = slot - base;
    const t = clamp((frac - 0.4) / 0.4);
    state.angle = -(base + t * t * (3 - 2 * t)) * STEP;
    return Math.round(-state.angle / STEP);
  }

  /** Place every tenet for the current wheel angle. */
  function layout() {
    items.forEach((li, i) => {
      const deg = state.angle + i * STEP;
      const rad = (deg * Math.PI) / 180;

      // deg = 0 puts the word exactly on the marker at the circle's left edge.
      const x = -Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;

      // Angular distance from the marker, wrapped into 0…180.
      const wrapped = ((deg % 360) + 360) % 360;
      const dist = wrapped > 180 ? 360 - wrapped : wrapped;
      const near = clamp(1 - dist / 90);

      li.style.transform =
        `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-100%, -50%) ` +
        `scale(${(0.72 + near * 0.5).toFixed(3)})`;
      li.style.opacity = (0.12 + near * 0.88).toFixed(3);
    });
  }

  /* ------------------------------------------------------- ledger swap ---- */
  let current = -1;
  let swap = null;

  function setTenet(index) {
    const i = clamp(index, 0, items.length - 1);
    if (i === current) return;
    const forward = i > current;
    current = i;

    const li = items[i];
    items.forEach((el, k) => el.classList.toggle("is-current", k === i));

    const word = li.dataset.tenet;
    const text = li.dataset.gloss;

    // A fast scrub can request several swaps per second. Killing an in-flight
    // swap mid-way would leave the heading clipped out of existence, so the
    // previous one is *completed* first — its final frame is always the fully
    // revealed state, which makes the sequence self-healing at any speed.
    if (swap) {
      swap.progress(1);
      swap.kill();
    }
    gsap.set(display, { clipPath: "inset(0% 0% 0% 0%)" });

    swap = gsap.timeline({ defaults: { ease: "expo.inOut", overwrite: "auto" } });

    // The heading is replaced, not cross-faded: it slides out behind a hard
    // edge and the next word slides in from the same direction.
    swap
      .to(display, {
        clipPath: forward ? "inset(0% 0% 100% 0%)" : "inset(100% 0% 0% 0%)",
        duration: 0.16,
      })
      .call(() => {
        display.textContent = word;
        gloss.textContent = text;
        if (indexLabel) indexLabel.textContent = pad(i + 1);
      })
      .fromTo(
        display,
        { clipPath: forward ? "inset(100% 0% 0% 0%)" : "inset(0% 0% 100% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.3 }
      )
      .fromTo(
        gloss,
        { opacity: 0, y: forward ? 12 : -12 },
        { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" },
        "<"
      );

    audio.blip(392 + i * 44, { gain: 0.035, duration: 0.18, type: "triangle" });
  }

  /* ------------------------------------------------------------ timeline -- */
  gsap.set(kicker, { opacity: 0, y: 10 });
  gsap.set(kier, { opacity: 0 });

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.7,
      onRefresh: measure,
    },
  });

  tl.to(kicker, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, 0)
    // Eight detents, so all nine tenets take a turn at the marker.
    .to(state, { slot: items.length - 1, duration: 9 }, 0.4)
    .to(p, { twist: 0.25, dust: 0.22, morph: 0.2, duration: 4 }, 0)
    // Kier's verse rises as the wheel completes.
    .to(kier, { opacity: 1, duration: 0.6 }, 7.6)
    .to(kierWords, { yPercent: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.05 }, 7.7)
    .to(kier, { opacity: 0, y: -30, duration: 0.8 }, 9.4)
    .to(p, { dust: 0, duration: 0.8 }, 9.2);

  // The wheel position drives both the layout and which tenet is "current".
  tl.eventCallback("onUpdate", () => {
    setTenet(advance());
    layout();
  });

  advance();
  layout();
  setTenet(0);

  return { tl };
}
