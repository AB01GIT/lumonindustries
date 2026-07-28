/**
 * SCENE 02 — THE SEVERED FLOOR
 *
 * A 330-metre camera dolly down a procedurally drawn hallway. Nothing here is
 * a background image: the walls, the doors, the ceiling troughs and the sheen
 * on the floor are all fragment-shader arithmetic, which means the *camera*
 * does the acting. Wing signage passes on alternating sides at the depth the
 * geometry implies, and the chapter ends by walking the visitor into a door.
 */

import { qs, qsa } from "../core/utils.js";
import { registry } from "../core/reveals.js";
import { audio } from "../core/audio.js";

export function initCorridor({ world }) {
  const section = qs("#corridor");
  if (!section) return;

  const kicker = qs(".corridor__kicker");
  const title = qs(".corridor__title");
  const wings = qsa(".wing");
  const door = qs(".door");
  const doorPlate = qs(".door__plate strong");
  const prompt = qs("[data-door-prompt]");
  const sheet = qs(".veil__sheet");

  const p = world?.p ?? {};
  const titleChars = registry.get(title)?.chars || [];
  const plateChars = registry.get(doorPlate)?.chars || [];

  gsap.set(kicker, { opacity: 0, y: 12 });
  gsap.set(prompt, { opacity: 0 });

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.65,
    },
  });

  /* ------------------------------------------------------- camera dolly --- */
  // Slight ease at both ends: the visitor starts walking and then stops at the
  // door, rather than travelling at a constant machine speed the whole way.
  tl.fromTo(
    p,
    { camZ: -26 },
    { camZ: -352, duration: 8.6, ease: "power1.inOut" },
    0
  )
    // A gentle lens breath keeps the long corridor from feeling static.
    .fromTo(p, { camFov: 50 }, { camFov: 46, duration: 4.3, ease: "sine.inOut" }, 0)
    .to(p, { camFov: 52, duration: 4.3, ease: "sine.inOut" }, 4.3)
    .fromTo(p, { aberration: 0.55 }, { aberration: 0.32, duration: 2 }, 0);

  /* ------------------------------------------------------------- titles --- */
  tl.to(kicker, { opacity: 0.62, y: 0, duration: 0.5, ease: "power2.out" }, 0.15)
    .to(
      titleChars,
      {
        yPercent: 0,
        duration: 1.1,
        ease: "expo.out",
        stagger: { each: 0.02, from: "center" },
      },
      0.25
    )
    .to(kicker, { opacity: 0, duration: 0.5 }, 2.1)
    .to(
      titleChars,
      { yPercent: -118, duration: 0.8, ease: "expo.in", stagger: { each: 0.012, from: "edges" } },
      2.2
    );

  /* -------------------------------------------------------------- wings --- */
  // Each marker approaches, is legible for a beat, then sweeps past the lens.
  wings.forEach((wing, i) => {
    const at = 1.5 + i * 1.62;
    const side = wing.dataset.side === "left" ? -1 : 1;

    tl.fromTo(
      wing,
      {
        opacity: 0,
        xPercent: side * 26,
        yPercent: 18,
        scale: 0.72,
        clipPath: "inset(0% 0% 100% 0%)",
      },
      {
        opacity: 1,
        xPercent: 0,
        yPercent: 0,
        scale: 1,
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 0.85,
        ease: "expo.out",
      },
      at
    ).to(
      wing,
      {
        opacity: 0,
        xPercent: side * 62,
        yPercent: -14,
        scale: 1.5,
        duration: 0.75,
        ease: "power2.in",
      },
      at + 1.05
    );

    // A soft click as each wing registers.
    ScrollTrigger.create({
      trigger: section,
      start: () => `top+=${(at / 10) * section.offsetHeight} top`,
      once: true,
      onEnter: () => audio.blip(1046 - i * 84, { gain: 0.03, duration: 0.16, type: "triangle" }),
    });
  });

  /* ------------------------------------------------- fluorescent unease --- */
  // One trough falters as the visitor passes underneath it.
  tl.to(p, { flicker: 0.55, duration: 0.18 }, 5.2)
    .to(p, { flicker: 0, duration: 0.5 }, 5.38)
    .to(p, { flicker: 0.35, duration: 0.12 }, 6.9)
    .to(p, { flicker: 0, duration: 0.4 }, 7.02);

  /* --------------------------------------------------------------- door --- */
  tl.fromTo(
    door,
    { opacity: 0, scale: 0.42, yPercent: 6 },
    { opacity: 1, scale: 1, yPercent: 0, duration: 1.6, ease: "power2.out" },
    6.6
  )
    .to(
      plateChars,
      { yPercent: 0, duration: 0.9, ease: "expo.out", stagger: 0.022 },
      7.5
    )
    .to(prompt, { opacity: 0.62, duration: 0.5 }, 7.9)
    .to(prompt, { opacity: 0, duration: 0.3 }, 8.7)

    /* --- through the door ---------------------------------------------- */
    // The leaf swallows the frame; the hallway dissolves into its own fog.
    .to(door, { scale: 9, duration: 1.4, ease: "power2.in" }, 8.6)
    .to(door, { opacity: 0, duration: 0.5 }, 9.5)
    .to(p, { camFov: 74, duration: 1.4, ease: "power2.in" }, 8.6)
    .to(p, { corridor: 0, duration: 1.1, ease: "power2.in" }, 8.9)
    .to(p, { aberration: 2.2, duration: 0.9 }, 9.1)
    .to(sheet, { opacity: 0.85, duration: 0.28 }, 9.45)
    .to(sheet, { opacity: 0, duration: 0.6 }, 9.75)
    .to(p, { aberration: 0.5, camFov: 50, duration: 0.6 }, 9.8);

  return { tl };
}
