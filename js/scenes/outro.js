/**
 * SCENE 07 — REINTEGRATION
 *
 * The end of the shift. The motes that were blown apart at the top of the
 * descent reassemble into the Lumon mark, and the visitor is offered a ride
 * back up — which is implemented as a real transition, not a jump: a sheet
 * rises like an elevator floor, the document is repositioned behind it, and the
 * sheet then drops away onto the title card.
 */

import { qs, qsa } from "../core/utils.js";
import { registry } from "../core/reveals.js";
import { getLenis, setTheme } from "../core/scroll.js";
import { audio } from "../core/audio.js";

export function initOutro({ world }) {
  const section = qs("#outro");
  if (!section) return;

  const kicker = qs(".outro__kicker");
  const title = qs(".outro__title");
  const lines = qsa(".outro__lines p");
  const button = qs("#return-top");
  const credits = qsa(".credits__col, .credits__mark");
  const sheet = qs(".veil__sheet");

  const p = world?.p ?? {};
  const titleChars = registry.get(title)?.chars || [];

  gsap.set(button, { opacity: 0, y: 24 });
  gsap.set(credits, { opacity: 0, y: 22 });

  /* ------------------------------------------------------------ entrance -- */
  gsap
    .timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: section,
        start: "top 85%",
        end: "top 20%",
        scrub: 0.6,
      },
    })
    .to(kicker, { opacity: 1, y: 0, duration: 0.4 }, 0)
    .to(
      titleChars,
      { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: { each: 0.02, from: "start" } },
      0.15
    )
    // The construct comes back together, one mote at a time.
    .fromTo(
      p,
      { dust: 0, scatter: 0.4, morph: 0.4 },
      { dust: 0.6, scatter: 0, morph: 1, twist: 0.1, dotSize: 2.6, duration: 1.6 },
      0
    );

  lines.forEach((line, i) => {
    const words = registry.get(line)?.words || [];
    gsap.to(words, {
      yPercent: 0,
      opacity: 1,
      duration: 1,
      ease: "expo.out",
      stagger: 0.05,
      scrollTrigger: { trigger: line, start: "top 88%", once: true },
    });
  });

  gsap.to(button, {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: "expo.out",
    scrollTrigger: { trigger: button, start: "top 92%", once: true },
  });

  gsap.to(credits, {
    opacity: 1,
    y: 0,
    duration: 1,
    stagger: 0.12,
    ease: "expo.out",
    scrollTrigger: { trigger: ".credits", start: "top 92%", once: true },
  });

  /* ----------------------------------------------------------- the ride --- */
  let riding = false;

  button?.addEventListener("click", () => {
    if (riding) return;
    riding = true;

    const lenis = getLenis();
    audio.thud({ gain: 0.45 });

    gsap
      .timeline({
        onComplete: () => {
          riding = false;
        },
      })
      // The floor of the car rises over the frame.
      .set(sheet, { opacity: 1, scaleY: 0, transformOrigin: "50% 100%" })
      .to(sheet, { scaleY: 1, duration: 0.85, ease: "expo.inOut" })
      .call(() => {
        // Behind the sheet: reset the document and the whole stage.
        lenis?.scrollTo(0, { immediate: true });
        setTheme("outie");
        gsap.set(p, { corridor: 0, camZ: 6, camFov: 50, dust: 0.55, morph: 0, scatter: 0 });
        ScrollTrigger.refresh();
        audio.blip(523, { gain: 0.04, duration: 0.3, type: "triangle" });
      })
      .to(sheet, { scaleY: 0, transformOrigin: "50% 0%", duration: 1.1, ease: "expo.inOut" }, "+=0.35")
      .set(sheet, { opacity: 0, scaleY: 1, transformOrigin: "50% 100%" });
  });
}
