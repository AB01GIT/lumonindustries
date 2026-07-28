/**
 * SCENE 06 — COMPLIANCE
 *
 * The break room. The palette collapses to near-black, a single overhead lamp
 * flickers, and the visitor is made to recite the statement one line at a time
 * by scrolling. A sincerity meter climbs — and repeatedly falls back — until the
 * apology is finally accepted.
 *
 * This is the one chapter that deliberately withholds spectacle: the only
 * motion is the lamp, the type, and a meter that refuses to cooperate.
 */

import { qs, qsa, clamp } from "../core/utils.js";
import { registry } from "../core/reveals.js";
import { audio } from "../core/audio.js";

export function initBreakroom({ world }) {
  const section = qs("#breakroom");
  if (!section) return;

  const lamp = qs(".breakroom__lamp");
  const kicker = qs("[data-break-kicker]");
  const title = qs(".breakroom__title");
  const lines = qsa("[data-line]");
  const verdict = qs("[data-verdict]");
  const meter = qs("[data-sincerity]");
  const value = qs("[data-sincerity-value]");
  const chair = qs(".breakroom__chair");

  const p = world?.p ?? {};
  const titleChars = registry.get(title)?.chars || [];

  gsap.set(kicker, { opacity: 0 });
  gsap.set(lines, { opacity: 0.06, y: 18, filter: "blur(5px)" });
  gsap.set(chair, { opacity: 0, y: 60 });

  /* --------------------------------------------------------------- lamp --- */
  // A dying fluorescent tube: mostly on, occasionally not.
  const flicker = gsap
    .timeline({ repeat: -1, paused: true })
    .to(lamp, { opacity: 0.55, duration: 0.06 }, 1.2)
    .to(lamp, { opacity: 1, duration: 0.09 })
    .to(lamp, { opacity: 0.2, duration: 0.05 })
    .to(lamp, { opacity: 0.92, duration: 0.14 })
    .to(lamp, { opacity: 1, duration: 0.4 })
    .to(lamp, { opacity: 0.7, duration: 0.05 }, 3.4)
    .to(lamp, { opacity: 1, duration: 0.22 });

  /* ---------------------------------------------------------- sincerity --- */
  /**
   * Three advances and two rejections, keyed directly to scroll progress.
   * Deriving the reading from progress (rather than from a chain of tweens on a
   * shared value) makes it exact in both scroll directions and immune to the
   * render order of a scrubbed timeline.
   */
  const CURVE = [
    [0.0, 18], [0.14, 18], [0.3, 46], [0.36, 29],
    [0.55, 71], [0.62, 52], [0.88, 100], [1.0, 100],
  ];

  const gaugeAt = (t) => {
    for (let i = 1; i < CURVE.length; i++) {
      const [x1, y1] = CURVE[i];
      if (t <= x1) {
        const [x0, y0] = CURVE[i - 1];
        const k = (t - x0) / (x1 - x0 || 1);
        return y0 + (y1 - y0) * clamp(k);
      }
    }
    return 100;
  };

  const writeGauge = (t) => {
    const v = Math.round(gaugeAt(t));
    if (meter) meter.style.width = `${v}%`;
    if (value) value.textContent = v;
  };

  let accepted = false;

  /* ------------------------------------------------------------ timeline -- */
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      onToggle: (self) => (self.isActive ? flicker.play() : flicker.pause()),
      onUpdate: (self) => {
        writeGauge(self.progress);
        // Verdict is derived from progress so it is correct in both directions.
        const now = self.progress > 0.88;
        if (now !== accepted) {
          accepted = now;
          if (verdict) {
            verdict.textContent = accepted ? "ACCEPTED" : "PLEASE TRY AGAIN";
            verdict.classList.toggle("is-accepted", accepted);
          }
          if (accepted) audio.blip(261, { gain: 0.06, duration: 0.6, type: "triangle" });
        }
      },
    },
  });

  tl.to(lamp, { opacity: 1, duration: 1.2 }, 0)
    .to(kicker, { opacity: 1, duration: 0.5 }, 0.2)
    .to(titleChars, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.04 }, 0.3)
    .to(chair, { opacity: 1, y: 0, duration: 2, ease: "power2.out" }, 0.6)
    // The room presses in: fog tightens, exposure drops, grain rises.
    .to(p, { exposure: 0.9, vignette: 1, grain: 0.11, aberration: 0.28, duration: 2 }, 0);

  // Each line is spoken as it is scrolled into.
  lines.forEach((line, i) => {
    const at = 1.4 + i * 1.05;
    tl.to(
      line,
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.55,
        ease: "power2.out",
        onStart: () => line.classList.add("is-spoken"),
        onReverseComplete: () => line.classList.remove("is-spoken"),
      },
      at
    );
    // Older lines recede but never fully vanish — they are still on the page.
    if (i > 0) tl.to(lines[i - 1], { opacity: 0.22, duration: 0.6 }, at + 0.2);
  });

  /* --- lights out ------------------------------------------------------- */
  tl.to(lines, { opacity: 0, y: -20, duration: 0.8, stagger: 0.03 }, 9.1)
    .to([kicker, qs(".breakroom__verdict"), chair], { opacity: 0, duration: 0.7 }, 9.2)
    .to(titleChars, { yPercent: -118, duration: 0.7, ease: "expo.in", stagger: 0.02 }, 9.2)
    .to(lamp, { opacity: 0, duration: 0.35, ease: "power4.in" }, 9.55)
    // A full blackout before the elevator bank fades up.
    .to(p, { exposure: 0.06, glow: 0.02, duration: 0.5 }, 9.55)
    .to(p, { exposure: 1, glow: 0.24, duration: 0.6 }, 9.95);

  return { tl };
}
