# SEVERANCE — Lumon Industries

An immersive, scroll-driven journey down to the severed floor. Eight chapters,
one continuous camera, no page reloads: the whole piece is a single scroll
timeline built with **HTML, CSS and JavaScript only**.

> The work is mysterious and important.

---

## Running it

The site uses ES modules and an import map, so it must be served over HTTP
(opening `index.html` from the filesystem will not work).

```bash
npm install      # only needed for the verification tooling
npm start        # → http://localhost:4173
```

Any static server works just as well — `python -m http.server`, `npx serve`,
the VS Code Live Server extension. There is no build step and nothing is
compiled: what you edit is what the browser runs.

## Libraries

Everything is loaded from CDN in `index.html`; there is no bundler.

| Library | Role |
| --- | --- |
| **GSAP 3** + **ScrollTrigger** | every timeline, pin and scrubbed animation |
| **CustomEase** | the `lumon` easing curve used for institutional motion |
| **Lenis** | smooth scrolling, driven from GSAP's ticker so both share one RAF loop |
| **Three.js (r180)** | the WebGL stage: corridor, particle field, post-processing |
| **Web Audio API** | the entire soundtrack, synthesised at runtime (no audio files) |

No images, no video, no 3D model files, no icon fonts. Every visual is either
CSS, WebGL, or Canvas 2D drawn procedurally, which is why the whole experience
weighs a few hundred kilobytes.

---

## The eight chapters

| # | Chapter | What happens | Technique |
| --- | --- | --- | --- |
| 00 | **Induction** | The Lumon mark resolves out of drifting dust; the title splits into place. | masked per-character reveal, WebGL particle field |
| 01 | **The Descent** | An elevator falls 261 m. The doors close, the floor counter runs, a waveform crosses the frame — and the entire site's palette inverts on the exact frame of the severance cut. | scrubbed timeline, SVG path draw, mid-scene theme swap |
| 02 | **The Floor** | A dolly down an infinite fluorescent corridor. Wing placards slide past at speed until the MDR door fills the frame. | shader-generated corridor geometry, camera dolly on scroll |
| 03 | **Macrodata Refinement** | An interactive terminal. Move the pointer across the number field: clusters that "feel scary" wobble, resolve, and file themselves into a bin. | Canvas 2D with a glyph sprite atlas |
| 04 | **Personnel** | Six dossiers scroll horizontally past a fixed header, each portrait lit by a light that follows the pointer. | horizontal pin, halftone gradients, parallax lighting |
| 05 | **Doctrine** | Kier's nine tenets rotate through a wheel that detents into place, one tenet at a time. | scroll-driven rotation with a dwell curve |
| 06 | **The Break Room** | The compliance statement, one line at a time, under a flickering lamp — while a sincerity meter refuses to accept it. | line-by-line reveal, deterministic gauge |
| 07 | **Egress** | The particle field reassembles into the Lumon mark. A button takes you back up. | GPU particle morph to a canvas-sampled target |

---

## Architecture

```
index.html            semantic skeleton — persistent layers + eight <section class="scene">
css/
  base.css            reset, design tokens, the five palettes, film grain
  interface.css       boot terminal, HUD, chapter rail, custom pointer
  scenes.css          every chapter's layout
  responsive.css      breakpoints, touch fallbacks, reduced motion
js/
  main.js             orchestration: fonts → splits → scenes → preloader → intro
  core/
    scroll.js         Lenis ⇄ ScrollTrigger bridge + the global palette machine
    split.js          dependency-free char/word/line splitter with clip frames
    utils.js          math, device tiering, a small spring integrator
    preloader.js      the boot sequence (and the gesture that unlocks audio)
    pointer.js        two-part cursor, contextual labels, magnetic hover
    hud.js            clock, chapter rail, depth gauge
    audio.js          synthesised drones per palette + interaction blips
    reveals.js        shared reveal recipes
  webgl/
    world.js          renderer, cameras, corridor, particle system, palettes
    shaders.js        all GLSL: backdrop, walls, floor, ceiling, particles, post
  scenes/*.js         one module per chapter, each returning its timeline
tools/                static server + headless verification scripts
```

### Three ideas hold it together

**One palette, five states.** Every colour in the document is a custom property
on `:root`. Scenes declare `data-palette`, `scroll.js` watches which scene owns
the viewport, and a single `data-theme` swap on `<html>` re-tints the DOM, the
WebGL scene and the audio mood together over 1.2 s. The severance cut in chapter
01 is that same mechanism fired mid-timeline instead of at a scene boundary.

**One RAF loop.** Lenis is driven by `gsap.ticker` and its own RAF is disabled,
so smooth scroll, every ScrollTrigger, the cursor springs and the Three.js
render all happen in the same frame. Nothing schedules its own loop.

**Transforms have exactly one owner.** Where a GSAP timeline animates an
element's `transform`, nothing else may touch it — pointer parallax and magnetic
hover write CSS custom properties that feed the separate `translate` property
instead, so the two compose rather than fight.

---

## Performance

- `deviceTier()` in `utils.js` grades the device from core count, viewport size
  and (where exposed) device memory, then scales the particle count, the DPR cap
  and the render resolution accordingly.
- The corridor is a handful of large planes whose surface detail — panel seams,
  ceiling grid, light fittings, floor reflection, fog — is generated entirely in
  their fragment shaders, so an endless hallway costs a few draw calls. The
  particle field is one `Points` draw. Post-processing is a single extra pass
  carrying grain, chromatic aberration, vignette and lens curvature.
- The MDR grid pre-renders its digits into a sprite atlas once, so a field of
  ~900 animated cells costs one canvas per frame with no text layout.
- Scroll handlers do no layout reads. Anything that needs measurements takes
  them in ScrollTrigger's `onRefresh`.

## Accessibility

- `prefers-reduced-motion` turns off scroll smoothing, the film grain and
  scanlines, the camera's idle drift and the lens treatment, and drops the
  particle budget. Scrubbed timelines stay — they only advance when the reader
  scrolls, so the motion never happens on its own.
- Audio never starts on its own. It waits for the entry gesture and can be
  muted from the HUD at any time.
- The custom cursor is only installed for fine pointers; touch devices keep
  native behaviour and get tap equivalents for the pointer-driven scenes.
- Every chapter is a labelled `<section>` landmark with a real heading, so the
  narrative can be navigated by region, and the boot screen is dismissable with
  Enter or Space.

## Verification

```bash
npm run check    # parse-check every module
npm run smoke    # headless Chrome: walk all 8 chapters, report console errors
npm run mobile   # same at 390×844, plus a horizontal-overflow assertion
npm run verify   # all three
```

Both drive the real Lenis instance through `window.__severance`, the debug
handle `main.js` exposes. `smoke.mjs --shots` writes a frame per chapter into
`tools/shots/`; the mobile run always captures into `tools/shots-mobile/`.

For narrower questions there are two more probes: `node tools/frame.mjs <scrollY>`
captures a single frame with the HUD state that goes with it, and
`node tools/probe.mjs <scrollY> <selector...>` dumps computed styles and boxes —
which is how most of the animation-ownership bugs in here were found.

They need a local Chrome or Edge — `puppeteer-core` ships no browser, and the
paths it looks in are listed at the top of each script.

## Browser support

Chromium, Firefox and Safari, current versions — the site leans on
`color-mix()`, `svh` units, the `translate`/`rotate`/`scale` CSS properties and
WebGL 2. Without WebGL the stage is skipped and the DOM narrative plays on its
own.

---

*Fan work. Severance is a production of Red Hour / Fifth Season for Apple TV+.
No affiliation, no assets from the show — every mark and image here is drawn in
code.*
