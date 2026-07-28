/**
 * SCENE 00 — INDUCTION
 *
 * The title card. Type is lifted out of masks, the dust construct breathes in
 * the background, and as the visitor begins to scroll the letters are drawn
 * *upward out of frame* while the motes gather into the Lumon mark — so the
 * first scroll gesture already feels like it is operating machinery.
 */

import { qs, qsa } from "../core/utils.js";
import { reveal } from "../core/reveals.js";
import { registry } from "../core/reveals.js";
import { audio } from "../core/audio.js";

export function initHero({ world }) {
  const section = qs("#hero");
  const title = qs(".hero__title");
  const eyebrow = qs(".hero__eyebrow");
  const quote = qs(".hero__quote");
  const rule = qs(".hero__rule span");
  const specs = qsa(".hero__specs div");
  const glow = qs(".hero__glow");
  const status = qs("[data-hero-status]");

  gsap.set(specs, { opacity: 0, y: 14 });
  gsap.set(glow, { opacity: 0, scale: 0.7 });

  /* --------------------------------------------------------------- intro -- */
  /** Played once, the instant the boot terminal clears. */
  function intro() {
    const chars = registry.get(title)?.chars || [];

    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

    tl.to(glow, { opacity: 1, scale: 1, duration: 2.4, ease: "power2.out" }, 0)
      .add(reveal(eyebrow, { duration: 1 }), 0.1)
      // The wordmark arrives glyph by glyph from the centre outward, each one
      // slightly over-tall so it appears to be pulled into place.
      .fromTo(
        chars,
        { yPercent: 118, scaleY: 1.35, opacity: 0 },
        {
          yPercent: 0,
          scaleY: 1,
          opacity: 1,
          duration: 1.6,
          stagger: { each: 0.05, from: "center" },
        },
        0.35
      )
      .to(rule, { scaleX: 1, duration: 1.6, ease: "expo.inOut" }, 1.1)
      .add(reveal(quote, { duration: 1.3, stagger: 0.06 }), 1.25)
      .to(specs, { opacity: 1, y: 0, duration: 1, stagger: 0.09 }, 1.6)
      // Dust fades up last so the frame settles into depth rather than starting there.
      .to(
        world?.p ?? {},
        { dust: 0.55, dotSize: 2.4, duration: 3, ease: "power2.out" },
        0.2
      );

    // The status readout keeps ticking, a machine waiting for input.
    const states = ["Awaiting descent", "Awaiting descent .", "Awaiting descent ..", "Awaiting descent ..."];
    let i = 0;
    setInterval(() => {
      if (status) status.textContent = states[i++ % states.length];
    }, 620);

    return tl;
  }

  /* -------------------------------------------------------------- scroll -- */
  // Scrubbed exit: the title is drawn up and out while the motes assemble.
  const chars = registry.get(title)?.chars || [];

  gsap
    .timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom top",
        scrub: 0.6,
      },
      defaults: { ease: "none" },
    })
    .to(chars, { yPercent: -120, stagger: { each: 0.01, from: "edges" } }, 0)
    .to([eyebrow, quote], { yPercent: -60, opacity: 0 }, 0)
    .to(specs, { y: -30, opacity: 0, stagger: 0.02 }, 0)
    .to(rule, { scaleX: 0, transformOrigin: "right center" }, 0)
    .to(glow, { opacity: 0.2, scale: 1.4 }, 0)
    .to(
      world?.p ?? {},
      { dust: 0.95, morph: 1, twist: 0.5, dotSize: 3.1, glow: 0.4 },
      0
    );

  // A single soft tone the first time the visitor commits to descending.
  ScrollTrigger.create({
    trigger: section,
    start: "bottom 90%",
    once: true,
    onEnter: () => audio.blip(196, { gain: 0.05, duration: 0.5, type: "triangle" }),
  });

  return { intro };
}
