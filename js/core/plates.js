/**
 * PLATES — scroll choreography for the photographic layer
 *
 * One still per chapter, each entering, travelling and leaving on the same clock
 * as the chapter it belongs to. The stills are not backgrounds: the atrium's
 * blinds close *because* the elevator is arriving, the photographic corridor
 * takes the frame *as* the rendered one dissolves, and the break room is only
 * visible where the lamp happens to be reaching at that instant.
 *
 * SYNC. Every chapter module returns its scrubbed timeline, and those run on an
 * arbitrary clock (the corridor's is ~10.4 units long). Rather than adding
 * tweens into a foreign timeline — which would change its duration and silently
 * remap every beat in it — each plate gets its own timeline over the identical
 * scroll range, padded to the identical total. Positions can then be quoted
 * straight out of the scene module and land on the same frame.
 *
 * TRANSFORM OWNERSHIP. `__move` owns translation, `__img` owns scale, and
 * nothing else may write `transform` to either. Reveals go through custom
 * properties that CSS turns into masks (`--slat`, `--iris`, `--band`,
 * `--curtain`, `--reach`, `--shut`), which keeps the reveal, the parallax and
 * the zoom in three independent channels — the reason these can be tuned at all.
 *
 * START VALUES. A scrubbed timeline records a `to()` tween's start value the
 * first time it renders, which for a timeline built at boot means *boot* values.
 * Anything whose start state is established later — everything the hero's
 * entrance touches — is therefore an explicit `fromTo` with
 * `immediateRender: false`, so the pair cannot capture each other's state.
 *
 * MOTION BUDGET. Parallax and zoom live inside a `gsap.matchMedia()`, so a
 * narrow viewport gets a shorter throw and a visitor who has asked for reduced
 * motion gets the photographs with no travel at all. Crossing a breakpoint
 * reverts and rebuilds; the scene timelines are untouched by that.
 */

import { qs, qsa, clamp } from "./utils.js";

/** Plates that are on screen before any scrolling happens. */
const EAGER = new Set(["atrium"]);

/** Longest the boot will wait for the hero plate before going without it. */
const DECODE_BUDGET = 4000;

/**
 * A scrubbed timeline over one chapter, on that chapter's own clock.
 * @param {string} id     section id
 * @param {object} scene  whatever the scene module returned, if anything
 * @param {number} scrub  smoothing, matched to the scene's own
 */
function chapter(id, scene, scrub = 0.6) {
  const section = qs(`#${id}`);
  if (!section) return null;

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub },
  });

  // Pad to the scene's total duration so a position quoted from the scene
  // module means the same instant here. Without this the two clocks differ and
  // every beat drifts.
  tl.to({}, { duration: scene?.tl?.duration?.() || 10 }, 0);

  return tl;
}

/** The animatable layers of one plate. */
function layers(selector) {
  const plate = qs(selector);
  if (!plate) return null;
  return {
    plate,
    mask: qs(".plate__mask", plate),
    move: qs(".plate__move", plate),
    img: qs(".plate__img", plate),
  };
}

/**
 * Fetch and decode one image now.
 *
 * The `loading` flip is not belt-and-braces, it is the whole mechanism. Every
 * plate starts `visibility: hidden` — GSAP owns the reveal — and a browser that
 * evaluates a lazy image while it is hidden defers the fetch and then never
 * reconsiders: the element was already intersecting, so revealing it changes
 * nothing it is watching for. Reassigning `loading` is what actually starts the
 * request. Without it these images are never fetched at all.
 *
 * @returns {Promise<void>} resolved once decoded, or once given up on
 */
function forceFetch(img) {
  if (!img) return Promise.resolve();
  img.loading = "eager";

  // `decode()` rejects on an image that has no data yet, so wait for the load
  // event first rather than mistaking that rejection for a broken file.
  return new Promise((resolve) => {
    if (img.complete && img.naturalWidth) return resolve();
    img.addEventListener("load", resolve, { once: true });
    img.addEventListener("error", resolve, { once: true });
  }).then(() => img.decode?.().catch(() => {}));
}

/**
 * Fetch an image a screen before its chapter arrives: early enough to be ready,
 * late enough not to compete with the boot. An image that pops in halfway
 * through its own reveal ruins the reveal.
 */
function fetchOnApproach(img, trigger) {
  if (!img || !trigger) return;
  ScrollTrigger.create({
    trigger,
    start: "top bottom+=100%",
    once: true,
    onEnter: () => forceFetch(img),
  });
}

export function initPlates({ scenes = {} } = {}) {
  const plates = qsa(".plate");
  if (!plates.length) return { intro: () => null, heroReady: Promise.resolve() };

  /* ------------------------------------------------------------ loading --- */
  const pending = [];

  plates.forEach((plate) => {
    const img = qs(".plate__img", plate);
    if (EAGER.has(plate.dataset.plate)) pending.push(forceFetch(img));
    else fetchOnApproach(img, plate.closest(".scene") || plate);
  });

  // The personnel photographs are not plates — they live inside the dossier
  // cards — but they are hidden at boot for the same reason and so need the same
  // push. One trigger for all four: they are small, and the chapter scrolls
  // sideways, so there is no useful per-card ordering to exploit.
  const dossierPhotos = qsa(".dossier__photo");
  if (dossierPhotos.length) {
    ScrollTrigger.create({
      trigger: "#personnel",
      start: "top bottom+=100%",
      once: true,
      onEnter: () => dossierPhotos.forEach(forceFetch),
    });
  }

  /* --------------------------------------------------------------- hero --- */
  const hero = layers(".plate--hero");

  /** The atrium's entrance, handed back so main.js can fire it with the title. */
  const intro = () => {
    if (!hero) return null;
    return gsap
      .timeline()
      // Held short of opaque: each `.scene` is an isolated stacking context, so
      // a plate at full strength does not blend with the WebGL dust behind the
      // page — it simply covers it. Transparency is what keeps the motes in the
      // frame with the architecture.
      .to(hero.plate, { autoAlpha: 0.55, duration: 1.6, ease: "power2.out" }, 0)
      // The blinds open. `lumon` is the registered motor ease: it breaks slowly
      // and then glides, which is what stops this reading as a plain wipe.
      .fromTo(hero.mask, { "--slat": 0 }, { "--slat": 1, duration: 2.8, ease: "lumon" }, 0.15)
      // A push-out that is still moving when the scroll takes over.
      .fromTo(hero.img, { scale: 1.2 }, { scale: 1.07, duration: 3.6, ease: "power2.out" }, 0);
  };

  const mm = gsap.matchMedia();

  mm.add(
    {
      tall: "(min-width: 761px)",
      short: "(max-width: 760px)",
      still: "(prefers-reduced-motion: reduce)",
    },
    (ctx) => {
      const { short, still } = ctx.conditions;

      if (still) {
        // The photographs are content, so they stay; what goes is the travel.
        // CSS has already opened every mask to its resting state under this
        // query, so there is nothing to animate into place.
        gsap.set(plates, { autoAlpha: 1 });
        return;
      }

      /** Parallax throw multiplier. Short viewports cannot spare the crop. */
      const D = short ? 0.5 : 1;
      const cleanups = [];

      /* ================================================== 00 · ATRIUM ==== */
      // Exit only — `intro()` above owns the entrance, which is why every tween
      // here is an explicit pair that refuses to render until it is reached.
      if (hero) {
        gsap
          .timeline({
            defaults: { ease: "none", immediateRender: false },
            scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 0.6 },
          })
          .fromTo(hero.img, { scale: 1.07 }, { scale: 1.17, duration: 1 }, 0)
          .fromTo(hero.move, { yPercent: 0 }, { yPercent: 7 * D, duration: 1 }, 0)
          // The photograph develops as the wordmark is drawn up out of frame.
          // Under the title it is a suggestion; by the time the type has gone it
          // is the whole frame, which is what makes the first scroll gesture feel
          // like it is uncovering something.
          .fromTo(hero.plate, { "--scrim": 88 }, { "--scrim": 16, duration: 0.42 }, 0)
          .fromTo(hero.plate, { autoAlpha: 0.55 }, { autoAlpha: 0.92, duration: 0.42 }, 0)
          // Held open, then shut band by band as the elevator arrives.
          .fromTo(hero.mask, { "--slat": 1 }, { "--slat": 1, duration: 0.5 }, 0)
          .to(hero.mask, { "--slat": 0, duration: 0.5, ease: "power2.in" }, 0.5)
          .to(hero.plate, { autoAlpha: 0, duration: 0.28 }, 0.72);
      }

      /* ==================================================== 01 · LIFT ==== */
      // Beats quoted from scenes/descent.js: the doors close over 0→1, the car
      // settles by 1.8, the drop runs to 6.2, the cut lands at 6.2→6.9.
      const lift = layers(".plate--lift");
      if (lift) {
        chapter("descent", scenes.descent, 0.5)
          ?.fromTo(lift.plate, { autoAlpha: 0 }, { autoAlpha: 0.85, duration: 0.9 }, 0)
          // Stretched rather than blurred: an anisotropic scale reads as the
          // smear a falling camera would give, and costs nothing to composite.
          // One tween writes both axes — two tweens on the same transform is the
          // fight this module exists to avoid.
          .fromTo(
            lift.img,
            { scaleX: 1.04, scaleY: 1.04 },
            { scaleX: 1.13, scaleY: 1.3, duration: 4.4 },
            1.8
          )
          .fromTo(lift.move, { yPercent: 0 }, { yPercent: 9 * D, duration: 4.4 }, 1.8)
          // The whiteout at the cut burns the car away.
          .to(lift.plate, { autoAlpha: 0, duration: 0.35 }, 6.3)
          .to(lift.img, { scale: 1.5, duration: 0.7 }, 6.3);
      }

      /* ================================================ 02 · CORRIDOR ==== */
      // The hand-off. `--iris` opens an aperture at the vanishing point of the
      // rendered hallway; by 8.6 the photograph is full-bleed, and at 8.9 the
      // scene module fades the WebGL corridor out from behind it.
      const hall = layers(".plate--corridor");
      if (hall) {
        chapter("corridor", scenes.corridor, 0.65)
          ?.fromTo(hall.plate, { autoAlpha: 0 }, { autoAlpha: 0.5, duration: 2.4 }, 3.4)
          .fromTo(hall.mask, { "--iris": 0 }, { "--iris": 9, duration: 2.4, ease: "power2.in" }, 3.4)
          .fromTo(hall.img, { scale: 1.22 }, { scale: 1.02, duration: 5.2 }, 3.4)
          .fromTo(hall.move, { yPercent: 0 }, { yPercent: -4 * D, duration: 5.2 }, 3.4)
          .to(hall.mask, { "--iris": 50, duration: 2.6, ease: "power2.inOut" }, 5.8)
          // Held half-strength while the rendered corridor is still dollying, so
          // for two and a half chapters' worth of scroll the visitor is looking
          // at both at once and the photograph is reading as texture on the
          // shader's walls. It only takes the frame outright at the last moment
          // before the door swallows it.
          .to(hall.plate, { autoAlpha: 0.74, duration: 1.6 }, 6.2)
          .to(hall.plate, { autoAlpha: 0.97, duration: 0.7 }, 8.0)
          // Through the door: the photograph is what gets swallowed.
          .to(hall.img, { scale: 1.62, duration: 1.4, ease: "power2.in" }, 8.6)
          .to(hall.plate, { autoAlpha: 0, duration: 0.6 }, 9.2);
      }

      /* =================================================== 03 · FLOOR ==== */
      // A letterbox opening vertically behind the terminal, then closing on it.
      const floor = layers(".plate--floor");
      if (floor) {
        chapter("macrodata", scenes.macrodata, 0.6)
          ?.fromTo(floor.plate, { autoAlpha: 0 }, { autoAlpha: 0.9, duration: 1.6 }, 0.4)
          .fromTo(floor.mask, { "--band": 50 }, { "--band": 4, duration: 2, ease: "power2.out" }, 0.4)
          .fromTo(floor.img, { scale: 1.14 }, { scale: 1.0, duration: 6.2 }, 2.2)
          .fromTo(floor.move, { yPercent: -5 * D }, { yPercent: 5 * D, duration: 8.4 }, 0.4)
          .to(floor.mask, { "--band": 50, duration: 1, ease: "power2.in" }, 9)
          .to(floor.plate, { autoAlpha: 0, duration: 0.8 }, 9.2);
      }

      /* =============================================== 04 · PERSONNEL ==== */
      // These ride the horizontal container animation, so each photograph
      // resolves as its own card rotates into the plane of the screen. The card
      // owns its own transform; the photograph inside it owns only scale.
      const horizontal = scenes.personnel?.horizontal;
      if (horizontal) {
        qsa(".dossier").forEach((card) => {
          const photo = qs(".dossier__photo", card);
          if (!photo) return;

          gsap.fromTo(
            photo,
            { opacity: 0, scale: 1.26 },
            {
              opacity: 0.94,
              scale: 1.02,
              ease: "power2.out",
              scrollTrigger: {
                trigger: card,
                containerAnimation: horizontal,
                start: "left right",
                end: "center 55%",
                scrub: 0.5,
              },
            }
          );

          // And keeps moving as it leaves, so the file reads as handled rather
          // than displayed.
          gsap.to(photo, {
            scale: 1.12,
            opacity: 0.4,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              containerAnimation: horizontal,
              start: "right 40%",
              end: "right left",
              scrub: 0.5,
            },
          });
        });
      }

      /* ==================================================== 05 · KIER ==== */
      // Uncovered top-down as the wheel starts to turn, forward for the verse,
      // then covered again as the wing goes dark.
      const kier = layers(".plate--kier");
      if (kier) {
        chapter("handbook", scenes.handbook, 0.7)
          // Higher than it looks: the scrim above already spends most of this on
          // keeping the ledger column clean, so the figure only buys presence in
          // the right third where the canvas is actually uncovered.
          ?.fromTo(kier.plate, { autoAlpha: 0 }, { autoAlpha: 0.62, duration: 1.6 }, 0.3)
          .fromTo(
            kier.mask,
            { "--curtain": 100 },
            { "--curtain": 0, duration: 2.4, ease: "lumon" },
            0.3
          )
          .fromTo(kier.img, { scale: 1.16 }, { scale: 1.03, duration: 7 }, 0.4)
          .fromTo(kier.move, { yPercent: 6 * D }, { yPercent: -6 * D, duration: 8.6 }, 0.4)
          .to(kier.plate, { autoAlpha: 0.78, duration: 0.8 }, 7.6)
          .to(kier.plate, { autoAlpha: 0, duration: 0.9 }, 9.3)
          .to(kier.mask, { "--curtain": 62, duration: 0.9 }, 9.3);
      }

      /* ============================================== 06 · BREAK ROOM ==== */
      // The room is revealed by the lamp and by nothing else. `--reach` is the
      // radius of the mask: how far into the chapter the visitor is, multiplied
      // by how much light the lamp is giving at that instant. When the tube
      // stutters, the room stutters with it.
      const room = layers(".plate--breakroom");
      const lamp = qs(".breakroom__lamp");
      if (room && lamp) {
        const setReach = (v) => room.mask.style.setProperty("--reach", v.toFixed(2));
        const state = { open: 0 };
        let live = false;

        chapter("breakroom", scenes.breakroom, 0.6)
          ?.fromTo(room.plate, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2 }, 0.2)
          .fromTo(state, { open: 0 }, { open: 1, duration: 2.6, ease: "power2.out" }, 0.3)
          .fromTo(room.img, { scale: 1.12 }, { scale: 1.0, duration: 8 }, 0.4)
          .fromTo(room.move, { yPercent: -3 * D }, { yPercent: 4 * D, duration: 8.6 }, 0.4)
          // Lights out.
          .to(state, { open: 0, duration: 0.5, ease: "power4.in" }, 9.5)
          .to(room.plate, { autoAlpha: 0, duration: 0.4 }, 9.7);

        ScrollTrigger.create({
          trigger: "#breakroom",
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => (live = self.isActive),
        });

        // One read per frame while the chapter is on screen. Cheaper than a
        // tween per flicker beat, and it cannot drift out of step with the lamp
        // because it *is* the lamp's value.
        const tick = () => {
          if (!live) return;
          const lit = Number(gsap.getProperty(lamp, "opacity")) || 0;
          setReach(clamp(state.open, 0, 1) * (0.34 + lit * 0.66) * 96);
        };
        gsap.ticker.add(tick);
        // matchMedia reverts tweens and ScrollTriggers, but knows nothing about
        // the ticker — without this, crossing a breakpoint stacks a second one.
        cleanups.push(() => gsap.ticker.remove(tick));
      }

      /* ================================================== 07 · EGRESS ==== */
      // Rises from below as the motes reassemble, then seals over the frame.
      const exit = layers(".plate--egress");
      if (exit) {
        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: "#outro", start: "top bottom", end: "bottom bottom", scrub: 0.7 },
          })
          .fromTo(exit.plate, { autoAlpha: 0 }, { autoAlpha: 0.78, duration: 3 }, 0)
          .fromTo(exit.move, { yPercent: 16 * D }, { yPercent: -5 * D, duration: 10 }, 0)
          .fromTo(exit.img, { scale: 1.18 }, { scale: 1.0, duration: 7.6 }, 0)
          // The last of the scroll walks the visitor up to the doors. Sequential
          // with the tween above rather than overlapping it, so only one thing
          // ever writes this element's scale.
          .to(exit.img, { scale: 1.3, duration: 2.4, ease: "power2.in" }, 7.6)
          .to(exit.plate, { autoAlpha: 0.9, duration: 2.4 }, 7.6);
      }

      return () => cleanups.forEach((fn) => fn());
    }
  );

  /* The boot waits for the atrium and nothing else: every other plate is at
     least a chapter away, and a slow image should not hold the terminal. */
  const heroReady = Promise.race([
    Promise.all(pending),
    new Promise((r) => setTimeout(r, DECODE_BUDGET)),
  ]);

  return { intro, heroReady, mm };
}
