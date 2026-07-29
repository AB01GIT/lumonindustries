/**
 * MAIN
 * Boot order for the experience.
 *
 *   1. wait for the animation libraries, register plugins
 *   2. bring up the persistent layers (WebGL stage, scroll engine, HUD, pointer)
 *   3. wait for webfonts, *then* split every headline (line breaks depend on
 *      final metrics, so splitting earlier would measure the fallback font)
 *   4. build all eight chapters, then the photographic plates on top of their
 *      timelines, and decode the one that is already on screen
 *   5. only once all of the above is ready, let the boot terminal clear
 *
 * Scroll stays locked until step 5 completes, so nobody can scroll into a
 * half-constructed corridor.
 */

import { qs, onResize, prefersReducedMotion } from "./core/utils.js";
import { initScroll, startScroll, stopScroll, onTheme, getLenis } from "./core/scroll.js";
import { initWorld } from "./webgl/world.js";
import { initHud } from "./core/hud.js";
import { initPointer } from "./core/pointer.js";
import { initAudio, audio } from "./core/audio.js";
import { runPreloader } from "./core/preloader.js";
import { prepare } from "./core/reveals.js";
import { initPlates } from "./core/plates.js";

import { initHero } from "./scenes/hero.js";
import { initDescent } from "./scenes/descent.js";
import { initCorridor } from "./scenes/corridor.js";
import { initMacrodata } from "./scenes/macrodata.js";
import { initPersonnel } from "./scenes/personnel.js";
import { initHandbook } from "./scenes/handbook.js";
import { initBreakroom } from "./scenes/breakroom.js";
import { initOutro } from "./scenes/outro.js";

/* ------------------------------------------------------------ libraries --- */
/** GSAP and Lenis arrive as classic deferred scripts; wait for them politely. */
function waitForLibs(timeout = 8000) {
  const ready = () => window.gsap && window.ScrollTrigger && window.Lenis;
  if (ready()) return Promise.resolve(true);

  return new Promise((resolve) => {
    const started = performance.now();
    const check = () => {
      if (ready()) return resolve(true);
      if (performance.now() - started > timeout) return resolve(false);
      requestAnimationFrame(check);
    };
    check();
  });
}

/* ----------------------------------------------------------------- boot --- */
async function boot() {
  const ok = await waitForLibs();
  if (!ok) {
    // Without the animation stack, show the document as plain, readable content.
    document.body.classList.remove("is-loading");
    qs("#boot")?.remove();
    qs("#hud")?.style.setProperty("opacity", "1");
    console.warn("[severance] animation libraries unavailable — static fallback.");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Signature easing: a long, mechanical settle. Used for anything that is
  // supposed to feel like it is driven by a motor rather than by a hand.
  if (window.CustomEase) {
    gsap.registerPlugin(CustomEase);
    CustomEase.create("lumon", "M0,0 C0.32,0 0.06,1 1,1");
  }

  // Never restore a previous scroll position into a scripted narrative.
  history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  document.body.classList.add("js-ready");

  /* --- persistent layers --------------------------------------------- */
  const world = initWorld(qs("#gl-stage"));
  initScroll();
  stopScroll();

  initAudio(qs("#audio-toggle"));
  const hud = initHud();
  initPointer();

  // One palette change fans out to CSS, WebGL and the score.
  onTheme((name) => {
    world?.setTheme(name);
    audio.setMood(name);
  });

  /* --- chapters ------------------------------------------------------- */
  const buildScenes = (async () => {
    // Fonts first: every line mask is measured from real glyph metrics.
    try {
      await document.fonts?.ready;
    } catch {
      /* fonts are a nicety, not a dependency */
    }

    prepare();

    const scenes = {
      hero: initHero({ world }),
      descent: initDescent({ world }),
      corridor: initCorridor({ world }),
      macrodata: initMacrodata({ world }),
      personnel: initPersonnel({ world }),
      handbook: initHandbook({ world }),
      breakroom: initBreakroom({ world }),
      outro: initOutro({ world }),
    };

    // Last, because every plate's choreography is quoted against the clock of
    // the chapter timeline it belongs to, and those have to exist first.
    const plates = initPlates({ scenes });
    await plates.heroReady;

    ScrollTrigger.refresh();
    return { scenes, plates };
  })();

  /* --- curtain -------------------------------------------------------- */
  await runPreloader({ assetsReady: buildScenes });
  const { scenes, plates } = await buildScenes;

  document.body.classList.remove("is-loading");
  startScroll();
  window.scrollTo(0, 0);

  hud.reveal();
  // The atrium's blinds open under the title card, not before it.
  plates.intro();
  scenes.hero?.intro();

  // A single debug handle. Scrubbing a 40-viewport-tall scripted narrative by
  // hand is impractical, so the stage, the scroll engine and the scenes are
  // reachable from the console (and from the smoke test in tools/).
  window.__severance = { world, lenis: getLenis(), scenes, plates, ScrollTrigger };

  if (prefersReducedMotion()) {
    // Respect the preference by removing the film treatment and settling the
    // camera; the story still works, it just stops moving on its own.
    gsap.set(world?.p ?? {}, { shake: 0, grain: 0.02, aberration: 0.1, curve: 0.01 });
  }

  /* --- housekeeping --------------------------------------------------- */
  // Layout changes only need a measurement pass: because pinning is CSS
  // `position: sticky`, ScrollTrigger has no pin-spacers to rebuild, and the
  // line masks are auto-height so re-wrapped text is never clipped.
  onResize(() => ScrollTrigger.refresh());

  // Late-loading webfonts can shift metrics after first paint.
  document.fonts?.addEventListener?.("loadingdone", () => ScrollTrigger.refresh());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
