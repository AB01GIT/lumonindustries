/**
 * SCENE 03 — MACRODATA REFINEMENT
 *
 * The only chapter the visitor can actually *operate*. Scroll advances the
 * shift automatically, but hovering the field magnifies the numbers, and
 * lingering over a cluster that trembles files it into a bin — so the visitor
 * discovers the mechanic rather than being told it.
 */

import { qs, qsa, clamp, pad, onResize } from "../core/utils.js";
import { registry } from "../core/reveals.js";
import { audio } from "../core/audio.js";
import { MdrScreen } from "./mdr-screen.js";

const FILES = ["0×TUMWATER", "0×SIENA", "0×CAIRNS", "0×PACIFICUS", "0×EMINENCE", "0×DRANESVILLE"];

export function initMacrodata({ world, pointer }) {
  const section = qs("#macrodata");
  const canvas = qs("#mdr-canvas");
  if (!section || !canvas) return;

  const terminal = qs(".terminal");
  const aside = { title: qs(".mdr__title"), body: qs(".mdr__body"), hint: qs("[data-cursor-hint]") };
  const stats = {
    refined: qs('[data-mdr-stat="refined"]'),
    quota: qs('[data-mdr-stat="quota"]'),
    tenure: qs('[data-mdr-stat="tenure"]'),
  };
  const progressLabel = qs("[data-mdr-progress]");
  const fileLabel = qs("[data-mdr-file]");
  const toast = qs("[data-mdr-toast]");
  const bins = qsa(".bin");
  const statsEls = qs(".mdr__stats");

  const p = world?.p ?? {};

  /* ------------------------------------------------------------- console -- */
  const binFill = bins.map(() => 0);
  let manualQuota = 0;
  let scrollQuota = 0;
  let refinedTotal = 0;

  const screen = new MdrScreen(canvas, {
    onRefine: (groupIndex, count) => {
      refinedTotal = count;
      if (stats.refined) stats.refined.textContent = pad(count, 2);
    },
    onTremble: (active, hold) => {
      // Feed the custom cursor so the pointer itself signals "something here".
      if (active) document.body.dataset.pointerState = "refine";
      else if (document.body.dataset.pointerState === "refine") {
        delete document.body.dataset.pointerState;
      }
      if (active && hold > 0.02 && Math.random() < 0.12) {
        audio.blip(1760 + hold * 900, { gain: 0.014, duration: 0.04 });
      }
    },
  });

  /** Shared by the hold gesture and the scroll timeline. */
  const fileGroup = (index) => {
    const group = screen.groups[index];
    if (!group || group.refined) return;

    const bin = bins[group.bin];
    let rect = null;
    if (bin) {
      const b = bin.getBoundingClientRect();
      const c = canvas.getBoundingClientRect();
      rect = { x: b.left + b.width / 2 - c.left, y: b.top - c.top };
    }

    if (!screen.refine(index, rect)) return;

    // Bin reacts: lid flashes, fill level climbs.
    if (bin) {
      binFill[group.bin] = clamp(binFill[group.bin] + 0.22, 0, 1);
      bin.style.setProperty("--fill", `${binFill[group.bin] * 100}%`);
      bin.classList.add("is-hot");
      gsap.delayedCall(0.9, () => bin.classList.remove("is-hot"));
    }

    manualQuota = clamp(manualQuota + 0.055, 0, 1);
    audio.blip(320, { gain: 0.06, duration: 0.24, type: "triangle" });
    audio.blip(1240, { gain: 0.03, duration: 0.1 });
  };

  screen.requestRefine = fileGroup;

  /* ------------------------------------------------------ pointer input --- */
  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  canvas.addEventListener(
    "pointermove",
    (e) => {
      const { x, y } = toLocal(e);
      screen.setPointer(x, y);
    },
    { passive: true }
  );

  canvas.addEventListener("pointerleave", () => screen.setPointer(null));

  // Tapping a cluster on touch devices files it immediately.
  canvas.addEventListener("pointerdown", (e) => {
    const { x, y } = toLocal(e);
    screen.setPointer(x, y);
    screen.update(0.001);
    if (screen.activeGroup) fileGroup(screen.activeGroup.index);
  });

  /* -------------------------------------------------------------- ticker -- */
  let last = performance.now();
  gsap.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    screen.update(dt);
    screen.draw();
  });

  onResize(() => screen.resize());
  // Fonts arriving late would otherwise leave a fallback-metrics atlas behind.
  document.fonts?.ready.then(() => screen.resize());

  // The field must already be alive while the console is sliding into frame,
  // and it must stop costing anything the moment the chapter is off screen.
  ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => {
      screen.visible = self.isActive;
      if (self.isActive) screen.resize();
    },
  });

  /* ------------------------------------------------------------ entrance -- */
  // Restrained on purpose: a large scale-down reads as a clipped box while the
  // console is still half below the fold. A small lift plus a tilt sells the
  // idea that the visitor is sitting down in front of it.
  gsap.set(terminal, { scale: 1.06, rotateX: 9, yPercent: 12, opacity: 0, transformPerspective: 1400 });
  gsap.set(statsEls, { opacity: 0, y: 16 });

  gsap.to(terminal, {
    scale: 1,
    rotateX: 0,
    yPercent: 0,
    opacity: 1,
    ease: "power2.out",
    scrollTrigger: {
      trigger: section,
      start: "top 92%",
      end: "top 15%",
      scrub: 0.5,
    },
  });

  /* ------------------------------------------------------------ timeline -- */
  const titleUnits = registry.get(aside.title)?.lines || [];

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      onToggle: (self) => {
        if (self.isActive) screen.resize();
      },
      onUpdate: (self) => {
        // The shift advances on its own; manual refining runs ahead of it.
        scrollQuota = self.progress;
        const quota = clamp(Math.max(scrollQuota, manualQuota));
        const pct = Math.round(quota * 100);
        if (progressLabel) progressLabel.textContent = `${pct}% COMPLETE`;
        if (stats.quota) stats.quota.textContent = pad(pct, 2);
        if (fileLabel) {
          fileLabel.textContent = FILES[Math.min(FILES.length - 1, Math.floor(quota * FILES.length))];
        }
        if (stats.tenure) stats.tenure.textContent = pad(Math.round(quota * 412), 3);
      },
    },
  });

  // Everything below is a *tween*, never a callback: a scrubbed timeline must
  // be able to run backwards through the whole chapter without side effects.
  tl.to(titleUnits, { yPercent: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.1 }, 0.1)
    .to(aside.body, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" }, 0.5)
    .to(statsEls, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, 0.7)
    .fromTo(aside.hint, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.2)
    .to(aside.hint, { opacity: 0.35, duration: 3, repeat: 1, yoyo: true }, 2);

  // The shift's own rhythm: five groups surface and get filed as you scroll.
  [1.4, 2.9, 4.4, 5.9, 7.4].forEach((at, i) => {
    tl.call(
      () => {
        screen.revealGroup(i);
        gsap.delayedCall(0.35, () => fileGroup(i));
      },
      null,
      at
    );
  });

  /* ------------------------------------------------------- quota reached -- */
  gsap.set(toast, { opacity: 0, scale: 0.9 });
  tl.to(toast, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, 8.9)
    .to(toast, { opacity: 0, duration: 0.5 }, 9.7)
    .call(
      () => audio.blip(523, { gain: 0.05, duration: 0.4, type: "triangle" }),
      null,
      8.95
    );

  /* ----------------------------------------------------------- departure -- */
  // The console recedes into the dark as the personnel files slide over it.
  tl.to(terminal, { scale: 0.82, rotateX: -12, opacity: 0.25, duration: 1.1, ease: "power2.in" }, 9)
    .to([aside.title, aside.body, statsEls, aside.hint], { opacity: 0, y: -24, duration: 0.9 }, 9)
    .to(p, { glow: 0.6, aberration: 1.4, duration: 0.9 }, 9.2)
    .to(p, { aberration: 0.4, duration: 0.6 }, 9.9);

  return { screen };
}
