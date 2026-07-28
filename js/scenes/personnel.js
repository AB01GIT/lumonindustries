/**
 * SCENE 04 — PERSONNEL
 *
 * Vertical scroll is translated into a horizontal dossier gallery. Each card
 * is driven by `containerAnimation`, which lets ScrollTrigger reason about
 * elements moving *sideways* inside a scrubbed tween — so a card can animate
 * based on its own horizontal position rather than the page's vertical one.
 *
 * Micro-interactions: the portrait's key light follows the pointer across the
 * card, and a personnel stamp punches in when a file reaches centre frame.
 */

import { qs, qsa, pad, clamp, Spring, isTouch } from "../core/utils.js";
import { registry } from "../core/reveals.js";
import { audio } from "../core/audio.js";

export function initPersonnel({ world }) {
  const section = qs("#personnel");
  const track = qs("[data-track]");
  if (!section || !track) return;

  const cards = qsa("[data-dossier]");
  const title = qs(".personnel__title");
  const kicker = qs(".personnel__kicker");
  const indexLabel = qs("[data-personnel-index]");
  const bar = qs("[data-personnel-bar]");

  const p = world?.p ?? {};
  const titleChars = registry.get(title)?.chars || [];

  gsap.set(kicker, { opacity: 0, y: 10 });
  gsap.set(cards, { opacity: 0, yPercent: 12, rotateY: 10, transformPerspective: 1400 });

  /* ------------------------------------------------------ header reveal --- */
  // Cards travel under the fixed chapter rail; quiet it down while they do.
  ScrollTrigger.create({
    trigger: section,
    start: "top 60%",
    end: "bottom 40%",
    onToggle: (self) => qs(".rail")?.classList.toggle("is-quiet", self.isActive),
  });

  gsap.timeline({
    scrollTrigger: { trigger: section, start: "top 60%", end: "top top", scrub: 0.5 },
    defaults: { ease: "none" },
  })
    .to(kicker, { opacity: 1, y: 0, duration: 0.4 }, 0)
    .to(titleChars, { yPercent: 0, duration: 1, ease: "expo.out", stagger: 0.03 }, 0.1);

  /* -------------------------------------------------- the horizontal ride - */
  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

  const horizontal = gsap.to(track, {
    x: () => -distance(),
    ease: "none",
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.55,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (bar) bar.style.width = `${self.progress * 100}%`;
      },
    },
  });

  /* -------------------------------------------------------- per-dossier --- */
  cards.forEach((card, i) => {
    const stamp = qs(".dossier__stamp", card);
    const portrait = qs(".dossier__portrait", card);
    const name = qs(".dossier__name", card);
    const quote = qs(".dossier__quote", card);
    const rows = qsa(".dossier__lines li", card);

    gsap.set(stamp, { opacity: 0, scale: 1.5, rotate: -14 });
    gsap.set([name, quote], { opacity: 0, yPercent: 40 });
    gsap.set(rows, { opacity: 0, x: -12 });

    /* --- arrival: the card rotates into the plane of the screen -------- */
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: card,
        containerAnimation: horizontal,
        start: "left right",
        end: "left 42%",
        scrub: 0.5,
      },
    })
      .to(card, { opacity: 1, yPercent: 0, rotateY: 0, duration: 1, ease: "power2.out" }, 0)
      .to(name, { opacity: 1, yPercent: 0, duration: 0.6, ease: "expo.out" }, 0.35)
      .to(rows, { opacity: 1, x: 0, duration: 0.5, stagger: 0.08, ease: "power2.out" }, 0.5)
      .to(quote, { opacity: 1, yPercent: 0, duration: 0.6, ease: "expo.out" }, 0.75)
      .fromTo(portrait, { scale: 1.18 }, { scale: 1, duration: 1.2, ease: "power2.out" }, 0);

    /* --- centred: stamp the file -------------------------------------- */
    ScrollTrigger.create({
      trigger: card,
      containerAnimation: horizontal,
      start: "center 62%",
      end: "center 38%",
      onEnter: () => {
        if (indexLabel) indexLabel.textContent = pad(i + 1);
        gsap.to(stamp, { opacity: 1, scale: 1, rotate: -4, duration: 0.5, ease: "back.out(2.4)" });
        audio.blip(196 + i * 40, { gain: 0.05, duration: 0.2, type: "square" });
      },
      onEnterBack: () => {
        if (indexLabel) indexLabel.textContent = pad(i + 1);
      },
      onLeave: () => gsap.to(stamp, { opacity: 0.25, duration: 0.4 }),
      onLeaveBack: () => gsap.to(stamp, { opacity: 0, scale: 1.4, duration: 0.3 }),
    });

    /* --- departure: the card leans away as it exits stage left --------- */
    gsap.to(card, {
      rotateY: -14,
      opacity: 0.25,
      xPercent: -6,
      ease: "none",
      scrollTrigger: {
        trigger: card,
        containerAnimation: horizontal,
        start: "right 34%",
        end: "right left",
        scrub: 0.5,
      },
    });

    /* --- pointer micro-interaction ------------------------------------- */
    // The card's transform belongs to the scrubbed timelines above, so the
    // hover response is expressed through channels GSAP never writes to:
    // the portrait's light position (CSS custom properties) and the initials'
    // independent `translate` property. Nothing fights for the same value.
    if (!isTouch()) {
      const lx = new Spring({ value: 50, stiffness: 0.11, damping: 0.72 });
      const ly = new Spring({ value: 36, stiffness: 0.11, damping: 0.72 });
      const initials = qs(".dossier__initials", card);
      let hovering = false;

      card.addEventListener("pointerenter", () => {
        hovering = true;
        document.body.dataset.pointerState = "link";
      });

      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        lx.target = clamp((e.clientX - r.left) / r.width, 0, 1) * 100;
        ly.target = clamp((e.clientY - r.top) / r.height, 0, 1) * 80;
      });

      card.addEventListener("pointerleave", () => {
        hovering = false;
        lx.target = 50;
        ly.target = 36;
        if (document.body.dataset.pointerState === "link") {
          delete document.body.dataset.pointerState;
        }
      });

      gsap.ticker.add(() => {
        if (!hovering && lx.settled && ly.settled) return;
        const x = lx.update();
        const y = ly.update();
        card.style.setProperty("--px", `${x.toFixed(1)}%`);
        card.style.setProperty("--py", `${y.toFixed(1)}%`);
        if (initials) {
          initials.style.translate = `${((x - 50) * 0.12).toFixed(2)}px ${((y - 40) * 0.1).toFixed(2)}px`;
        }
      });
    }
  });

  /* ---------------------------------------------------------- atmosphere -- */
  gsap.to(p, {
    glow: 0.62,
    ease: "none",
    scrollTrigger: { trigger: section, start: "top bottom", end: "top top", scrub: 1 },
  });

  return { horizontal };
}
