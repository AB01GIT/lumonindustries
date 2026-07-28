/**
 * HUD
 * The fixed instrument panel: facility clock, chapter rail, depth gauge.
 * It is deliberately dumb — it only reflects state that the scroll controller
 * and the scenes publish.
 */

import { qs, qsa, pad, clamp } from "./utils.js";
import { audio } from "./audio.js";

/**
 * Each chapter declares the depth at which it *begins*; the gauge interpolates
 * toward the next chapter's entry depth. The descent therefore owns the whole
 * 0 → 240 m fall, which is exactly the stretch of scroll where the elevator is
 * actually moving.
 */
const CHAPTERS = [
  { id: "hero", floor: "GROUND LEVEL", depth: 0 },
  { id: "descent", floor: "IN TRANSIT", depth: 0 },
  { id: "corridor", floor: "SEVERED FLOOR", depth: 240 },
  { id: "macrodata", floor: "MDR — ROOM 3", depth: 268 },
  { id: "personnel", floor: "PERSONNEL FILES", depth: 291 },
  { id: "handbook", floor: "PERPETUITY WING", depth: 317 },
  { id: "breakroom", floor: "BREAK ROOM", depth: 402 },
  { id: "outro", floor: "ELEVATOR BANK", depth: 402 },
];

export function initHud() {
  const hud = qs("#hud");
  const clockEl = qs("[data-hud-clock]");
  const floorEl = qs("[data-hud-floor]");
  const depthEl = qs("[data-hud-depth]");
  const thumb = qs(".rail__thumb");
  const hint = qs("[data-hud-hint]");
  const items = qsa(".rail__item");

  /* ------------------------------------------------------------- clock --- */
  const tick = () => {
    const d = new Date();
    if (clockEl) {
      clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  };
  tick();
  setInterval(tick, 1000);

  /* -------------------------------------------------------------- rail --- */
  // Rail thumb follows overall document progress.
  ScrollTrigger.create({
    trigger: document.documentElement,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      if (thumb) thumb.style.height = `${self.progress * 100}%`;
    },
  });

  let activeIndex = -1;
  const setActive = (index, { silent = false } = {}) => {
    if (index === activeIndex || index < 0) return;
    activeIndex = index;
    items.forEach((item, i) => {
      item.classList.toggle("is-active", i === index);
      item.classList.toggle("is-past", i < index);
    });
    const chapter = CHAPTERS[index];
    if (chapter && floorEl) floorEl.textContent = chapter.floor;
    if (!silent) audio.blip(520, { gain: 0.03, duration: 0.12, type: "triangle" });
  };

  // Depth gauge interpolates between chapter depths for a continuous readout.
  const chapterTriggers = [];

  CHAPTERS.forEach((chapter, i) => {
    const section = qs(`#${chapter.id}`);
    if (!section) return;
    const next = CHAPTERS[i + 1];

    // "top top → bottom bottom" is the exact window in which a sticky-pinned
    // chapter owns the viewport, so the label and the gauge change on the same
    // frame the visitor arrives.
    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      onToggle: (self) => self.isActive && setActive(i),
      onUpdate: (self) => {
        if (!depthEl || !self.isActive) return;
        const from = chapter.depth;
        const to = next ? next.depth : chapter.depth;
        depthEl.textContent = pad(from + (to - from) * self.progress, 3);
      },
    });
    chapterTriggers.push({ i, st });
  });

  // `onToggle` only reports *crossings*. The chapter under the viewport at load
  // has never been crossed, so without this the rail opens with nothing lit and
  // the floor readout keeps whatever the markup shipped with.
  const sync = () => {
    const hit = chapterTriggers.find(({ st }) => st.isActive);
    setActive(hit ? hit.i : 0, { silent: activeIndex === -1 });
  };
  ScrollTrigger.addEventListener("refresh", sync);
  sync();

  /* -------------------------------------------------------------- hint --- */
  // The scroll prompt is only useful once.
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    gsap.to(hint, { opacity: 0, y: 8, duration: 0.6, ease: "power2.out" });
    window.removeEventListener("wheel", dismiss);
    window.removeEventListener("touchstart", dismiss);
    window.removeEventListener("keydown", dismiss);
  };
  window.addEventListener("wheel", dismiss, { passive: true, once: false });
  window.addEventListener("touchstart", dismiss, { passive: true });
  window.addEventListener("keydown", dismiss);

  // Belt and braces: the prompt is meaningless once the descent has begun.
  ScrollTrigger.create({ trigger: "#descent", start: "top 80%", once: true, onEnter: dismiss });

  return {
    reveal() {
      gsap.to(hud, { opacity: 1, duration: 1.4, ease: "power2.out" });
      hud.setAttribute("aria-hidden", "false");
    },
  };
}
