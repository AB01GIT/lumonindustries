/**
 * SCENE 01 — DESCENT
 *
 * The centrepiece transition, and the only place in the site where one chapter
 * physically becomes another rather than merely following it.
 *
 * The choreography, in scroll units (the timeline is 10 units long and scrubbed
 * linearly across ~5 viewport heights):
 *
 *   0.0 – 1.0   elevator doors close over the title card; the dust construct
 *               is blown apart; the outside world is sealed off
 *   1.0 – 1.8   the car settles, the door seam lights, floor reads "G"
 *   1.8 – 6.2   the drop: light streaks, aberration, a rising floor counter,
 *               the severance barrier waveform growing more agitated, and
 *               single words strobing past the visitor's face
 *   6.2 – 6.9   THE CUT. The waveform flatlines, the frame tears, everything
 *               whites out and the entire document's palette flips from the
 *               nocturnal outside world to fluorescent Lumon white
 *   6.9 – 8.6   doors part onto a corridor that did not exist a moment ago
 *   8.6 – 10    the car dissolves; only the severed floor remains
 */

import { qs, qsa, clamp, mapRange, pad } from "../core/utils.js";
import { setTheme } from "../core/scroll.js";
import { registry } from "../core/reveals.js";
import { audio } from "../core/audio.js";
import { CORRIDOR, EYE_HEIGHT } from "../webgl/world.js";

/** Floor plate labels for the ride down. */
const FLOORS = ["G", "-1", "-2", "-3", "-4", "-5", "-6", "-7", "-8", "-9", "-10", "-11", "SF"];

export function initDescent({ world }) {
  const section = qs("#descent");
  if (!section) return;

  const doorL = qs(".lift__door--l");
  const doorR = qs(".lift__door--r");
  const seam = qs(".lift__seam");
  const walls = qsa(".lift__wall");
  const ceiling = qs(".lift__ceiling");
  const panel = qs(".lift__panel");
  const floorLabel = qs("[data-lift-floor]");
  const streakWrap = qs(".lift__streaks");
  const streaks = qsa(".lift__streaks i");
  const barrier = qs(".barrier");
  const barrierNote = qs("[data-barrier-note]");
  const barrierLabel = qs("[data-barrier-label]");
  const wavePath = qs("[data-barrier-path]");
  const ghostPath = qs("[data-barrier-path-ghost]");
  const words = qsa("[data-descent-word] span");
  const sheet = qs(".veil__sheet");

  const p = world?.p ?? {};

  /* ------------------------------------------------------- streak engine -- */
  // Continuous light streaks whose speed is driven by real scroll velocity.
  const streakTweens = streaks.map((el, i) =>
    gsap.fromTo(
      el,
      { yPercent: -150 },
      {
        yPercent: 150,
        duration: 0.85 + (i % 3) * 0.12,
        ease: "none",
        repeat: -1,
        delay: -i * 0.19,
        paused: true,
      }
    )
  );

  /* ---------------------------------------------------- barrier waveform -- */
  // The waveform is redrawn every frame while this chapter is on screen. Its
  // shape is data: calm sine → agitated multi-harmonic → dead flat line.
  const wave = { amp: 8, freq: 1.6, chaos: 0, phase: 0, flat: 0 };
  let waveActive = false;

  const buildPath = (offset = 0) => {
    const steps = 96;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = t * 600;
      const a = t * Math.PI * 2 * wave.freq + wave.phase + offset;

      // Two harmonics plus a QRS-like spike keep it organic rather than sine-y.
      let y =
        Math.sin(a) * 0.62 +
        Math.sin(a * 3.1 + wave.phase * 1.7) * 0.26 +
        Math.sin(a * 7.3) * 0.12 * wave.chaos;

      // Occasional arrhythmic jolt as the barrier is approached.
      const spike = Math.pow(Math.max(0, Math.sin(a * 0.5)), 22);
      y += spike * 1.6 * wave.chaos;

      // Random noise floor.
      y += (Math.random() - 0.5) * 0.22 * wave.chaos;

      const amp = wave.amp * (1 - wave.flat);
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${(60 - y * amp).toFixed(2)} `;
    }
    return d;
  };

  const drawWave = () => {
    if (!waveActive || !wavePath) return;
    wave.phase += 0.06 + wave.chaos * 0.1;
    wavePath.setAttribute("d", buildPath(0));
    if (ghostPath) ghostPath.setAttribute("d", buildPath(0.35));
  };
  gsap.ticker.add(drawWave);

  /* ------------------------------------------------------- initial state -- */
  gsap.set([walls, ceiling, panel, barrier, streakWrap, seam], { opacity: 0 });
  gsap.set(words, { opacity: 0, scale: 0.35 });
  gsap.set(ghostPath, { opacity: 0 });
  // Doors start off-canvas. GSAP owns the transform so CSS never fights it.
  gsap.set(doorL, { xPercent: -101 });
  gsap.set(doorR, { xPercent: 101 });

  const counter = { floor: 0 };

  /* ---------------------------------------------------------- timeline ---- */
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
      onToggle: (self) => {
        waveActive = self.isActive;
        streakTweens.forEach((t) => (self.isActive ? t.play() : t.pause()));
      },
      onUpdate: (self) => {
        // Streak speed tracks scroll speed — the car accelerates when you do.
        const speed = clamp(Math.abs(self.getVelocity()) / 2200, 0.15, 3.2);
        streakTweens.forEach((t) => t.timeScale(speed * 1.6));

        // The document palette flips exactly at the cut, in both directions.
        // `setTheme` is idempotent and fans out to WebGL + audio via main.js.
        setTheme(self.progress > 0.655 ? "innie" : "outie");

        audio.setIntensity(
          self.progress < 0.65 ? mapRange(self.progress, 0, 0.65, 0.3, 1) : 0.55
        );
      },
    },
  });

  /* --- 0.0 → 1.0 · the doors close ------------------------------------- */
  tl.to([doorL, doorR], { xPercent: 0, duration: 1, ease: "power2.in" }, 0)
    .to(walls, { opacity: 0.9, duration: 0.8 }, 0.2)
    .to(ceiling, { opacity: 1, duration: 0.8 }, 0.3)
    // The Lumon mark the visitor just assembled is torn apart by the doors.
    .to(p, { scatter: 0.55, dust: 0, morph: 1, duration: 1 }, 0)
    .to(p, { aberration: 1.1, curve: 0.12, duration: 1 }, 0)

    /* --- 1.0 → 1.8 · the car settles ---------------------------------- */
    .to(seam, { opacity: 1, duration: 0.25 }, 1)
    .to(panel, { opacity: 1, duration: 0.4 }, 1.15)
    .to(p, { shake: 0.006, duration: 0.4 }, 1)

    /* --- 1.8 → 6.2 · the drop ----------------------------------------- */
    .to(streakWrap, { opacity: 1, duration: 0.6 }, 1.8)
    .to(
      counter,
      {
        floor: FLOORS.length - 1,
        duration: 4.2,
        onUpdate: () => {
          if (floorLabel) floorLabel.textContent = FLOORS[Math.round(counter.floor)];
        },
      },
      1.8
    )
    .to(p, { shake: 0.02, aberration: 2.4, glitch: 0.14, duration: 4.2 }, 1.8)
    .to(barrier, { opacity: 1, duration: 0.8 }, 2.4)
    .to(wave, { amp: 30, freq: 3.4, chaos: 1, duration: 3.4 }, 2.6)
    .to(ghostPath, { opacity: 1, duration: 1.6 }, 4.2);

  // Words strobe past the visitor's face during the drop.
  words.forEach((word, i) => {
    const at = 2.1 + i * 0.72;
    tl.fromTo(
      word,
      { opacity: 0, scale: 0.3, filter: "blur(14px)" },
      { opacity: 1, scale: 1.05, filter: "blur(0px)", duration: 0.34, ease: "power2.out" },
      at
    ).to(word, { opacity: 0, scale: 3.4, filter: "blur(10px)", duration: 0.42, ease: "power2.in" }, at + 0.34);
  });

  /* --- 6.2 → 6.9 · the cut --------------------------------------------- */
  tl.to(barrierLabel, { opacity: 0.35, duration: 0.2 }, 6.1)
    .call(
      () => {
        if (barrierLabel) barrierLabel.textContent = "BARRIER ENGAGED";
      },
      null,
      6.15
    )
    // Flatline.
    .to(wave, { flat: 1, chaos: 0, duration: 0.28, ease: "power4.in" }, 6.2)
    .to(p, { glitch: 1, aberration: 6.5, shake: 0.05, duration: 0.28 }, 6.2)
    .call(
      () => {
        if (barrierNote) barrierNote.textContent = "INNIE CONSCIOUSNESS: ACTIVE";
        audio.sever();
      },
      null,
      6.45
    )
    // Total white-out: the WebGL flash and the DOM veil fire together so the
    // frame is genuinely blank for a beat — the actual severance.
    .to(p, { flash: 1, duration: 0.16 }, 6.36)
    .to(sheet, { opacity: 1, duration: 0.14 }, 6.38)
    .set(
      [walls, ceiling, streakWrap, barrier],
      { opacity: 0 },
      6.52
    )
    // The corridor is switched on while the screen is white — the visitor
    // never sees it arrive, only that it is suddenly, undeniably there.
    .set(p, { corridor: 1, camZ: -18, camY: EYE_HEIGHT, camFov: 50 }, 6.52)
    .to(p, { flash: 0, duration: 0.6, ease: "power2.out" }, 6.55)
    .to(sheet, { opacity: 0, duration: 0.7, ease: "power2.out" }, 6.58)
    .to(p, { glitch: 0, aberration: 0.55, shake: 0.002, duration: 0.9 }, 6.6)

    /* --- 6.9 → 8.6 · doors open --------------------------------------- */
    // "lumon" is the registered CustomEase: a slow break followed by a long,
    // motor-driven glide. It is the difference between a slide and a mechanism.
    .to(doorL, { xPercent: -101, duration: 1.7, ease: "lumon" }, 6.95)
    .to(doorR, { xPercent: 101, duration: 1.7, ease: "lumon" }, 6.95)
    .to(seam, { opacity: 0, duration: 0.4 }, 6.95)
    .call(
      () => {
        if (floorLabel) floorLabel.textContent = "SF";
        audio.thud({ gain: 0.4 });
      },
      null,
      6.95
    )
    // A short push forward as the doors part: stepping out of the car.
    .to(p, { camZ: -26, duration: 1.7, ease: "power2.inOut" }, 6.95)

    /* --- 8.6 → 10 · only the floor remains ---------------------------- */
    // The indicator is the last piece of the car; once it goes, the visitor is
    // simply standing on the severed floor.
    .to(panel, { opacity: 0, y: -20, duration: 0.9 }, 7.3)
    .to(p, { curve: 0.05, aberration: 0.4, duration: 1.4 }, 8.6);

  /* -------------------------------------------------- one-shot punctuation */
  // Door impact, fired once in each direction of travel.
  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (() => {
      let closed = false;
      return (self) => {
        const shut = self.progress > 0.098;
        if (shut !== closed) {
          closed = shut;
          if (shut) audio.thud();
        }
      };
    })(),
  });

  return { tl };
}
