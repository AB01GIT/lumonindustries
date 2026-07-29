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
npm install      # only needed for the tooling
npm start        # → http://localhost:4173
```

Any static server works just as well — `python -m http.server`, `npx serve`,
the VS Code Live Server extension. **In development there is no build step and
nothing is compiled: what you edit is what the browser runs.**

## Building for production

```bash
npm run build      # → dist/
npm run preview    # serve dist/ on http://localhost:4174
```

`dist/` is a self-contained folder — drop it on any static host, no server
configuration and no runtime dependency on a CDN. The build only does the things
a static host cannot:

| | |
| --- | --- |
| **one JS bundle** | the modules are bundled and minified, and Three.js is tree-shaken down to the classes the stage actually touches — 1.2 MB of ESM becomes a 538 kB bundle, 140 kB over the wire |
| **one stylesheet** | the four sheets concatenated in cascade order and minified, 37 kB / 8.7 kB gzipped |
| **vendored libraries** | GSAP, ScrollTrigger, CustomEase and Lenis are downloaded into `dist/vendor/` at build time, so a deploy cannot drift when a CDN changes what it serves |
| **content hashes** | `app-<hash>.js` / `app-<hash>.css`, so a host can cache the assets forever and still ship updates |

About **208 kB gzipped** in total for the whole experience, fonts aside. The
import map disappears from the built HTML (Three.js is inside the bundle), and
the authoring comments are stripped, but the markup keeps its indentation —
collapsing it risks changing significant whitespace and gzip flattens the
difference anyway.

Two flags are worth knowing: `--no-vendor` keeps the original CDN `<script>`
tags, which is the better choice if you would rather share the browser's cached
copy of GSAP with other sites, and `--sourcemap` emits a map next to the bundle.
Typefaces are always loaded from Google Fonts; nothing else leaves the origin.

## Libraries

In development everything is loaded from CDN in `index.html`; there is no
bundler. `npm run build` vendors and bundles the same versions.

| Library | Role |
| --- | --- |
| **GSAP 3** + **ScrollTrigger** | every timeline, pin and scrubbed animation |
| **CustomEase** | the `lumon` easing curve used for institutional motion |
| **Lenis** | smooth scrolling, driven from GSAP's ticker so both share one RAF loop |
| **Three.js (r180)** | the WebGL stage: corridor, particle field, post-processing |
| **Web Audio API** | the entire soundtrack, synthesised at runtime (no audio files) |

No video, no 3D model files, no icon fonts, no audio files. Apart from the
photographic plates described below, every visual is CSS, WebGL or Canvas 2D
drawn procedurally, which is why a full build is around 790 kB on the wire —
roughly half of it the Three.js bundle and a third the photography.

### The photography

Eight chapters are built around large photographic plates — the atrium, the
elevator car, the fluorescent corridor, the refinement floor, Kier's portrait,
the break room, the egress doors, and four personnel badge photographs.

**None of them are frames from the series.** Every plate was rendered for this
build in the show's visual language, which keeps the project on the right side of
copyright and means each image could be composed for the reveal it has to
perform — a corridor with enough headroom for an iris to open across it, a break
room lit so a lamp-shaped mask finds a table inside it.

They are never wallpaper. Each plate is a three-layer figure whose reveal,
parallax and zoom are animated separately and quoted against the beats of the
chapter's own timeline, so the image arrives, moves and leaves as part of the
story rather than behind it. `css/plates.css` and `js/core/plates.js` carry the
full reasoning.

Source art lives in `img/src/` and is not served. `node tools/images.mjs` trims
letterbox bars, crops, and emits two WebP widths per plate into `img/` plus a
generated stylesheet of inlined 20-pixel blur placeholders, so a chapter shows a
colour wash immediately and the full plate a moment later.

---

## The eight chapters

| # | Chapter | What happens | Technique | How its plate arrives |
| --- | --- | --- | --- | --- |
| 00 | **Induction** | The Lumon mark resolves out of drifting dust; the title splits into place. | masked per-character reveal, WebGL particle field | the atrium opens through five gradient bands, like blinds, and closes the same way to hand over to the lift |
| 01 | **The Descent** | An elevator falls 261 m. The doors close, the floor counter runs, a waveform crosses the frame — and the entire site's palette inverts on the exact frame of the severance cut. | scrubbed timeline, SVG path draw, mid-scene theme swap | the car stretches vertically as it drops — anisotropic scale, so the fall smears rather than zooms |
| 02 | **The Floor** | A dolly down an infinite fluorescent corridor. Wing placards slide past at speed until the MDR door fills the frame. | shader-generated corridor geometry, camera dolly on scroll | an iris opens over the shader corridor and the two hold at matched opacity, one blending into the other |
| 03 | **Macrodata Refinement** | An interactive terminal. Move the pointer across the number field: clusters that "feel scary" wobble, resolve, and file themselves into a bin. | Canvas 2D with a glyph sprite atlas | the office arrives as a letterbox band opening behind the console, desks and monitors falling into depth |
| 04 | **Personnel** | Six dossiers scroll horizontally past a fixed header, each portrait lit by a light that follows the pointer. | horizontal pin, halftone gradients, parallax lighting | four badge photographs surface inside their cards as each passes centre; two management dossiers have no photograph on file |
| 05 | **Doctrine** | Kier's nine tenets rotate through a wheel that detents into place, one tenet at a time. | scroll-driven rotation with a dwell curve | the portrait is uncovered top-down by a feathered gradient, like a dust sheet coming off a painting |
| 06 | **The Break Room** | The compliance statement, one line at a time, under a flickering lamp — while a sincerity meter refuses to accept it. | line-by-line reveal, deterministic gauge | the room is masked to the lamp's pool and to nothing else; when the tube stutters, the room stutters with it |
| 07 | **Egress** | The particle field reassembles into the Lumon mark. A button takes you back up. | GPU particle morph to a canvas-sampled target | the doors rise and push in under the credits, then fade as the mark takes the frame |

---

## Architecture

```
index.html            semantic skeleton — persistent layers + eight <section class="scene">
css/
  base.css            reset, design tokens, the five palettes, film grain
  interface.css       boot terminal, HUD, chapter rail, custom pointer
  scenes.css          every chapter's layout
  plates.css          the photographic plates: masks, grading, per-palette exposure
  plates.lqip.css     GENERATED — inlined blur placeholders, one per plate
  responsive.css      breakpoints, touch fallbacks, reduced motion
img/
  src/                source art, not served
  *.webp              two widths per plate, emitted by tools/images.mjs
  plates.json         GENERATED — dimensions and variants per plate
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
    plates.js         the photographic choreography, one block per chapter
    reveals.js        shared reveal recipes
  webgl/
    world.js          renderer, cameras, corridor, particle system, palettes
    shaders.js        all GLSL: backdrop, walls, floor, ceiling, particles, post
  scenes/*.js         one module per chapter, each returning its timeline
tools/
  serve.mjs           static server for development and for previewing a build
  build.mjs           produces dist/
  images.mjs          img/src/ → responsive WebP + the generated LQIP stylesheet
  check-syntax.mjs    parse-checks every module
  smoke.mjs           headless walk of all eight chapters, desktop
  mobile.mjs          the same at 390×844, plus an overflow assertion
  frame.mjs           one frame at one scroll position, for close inspection
  probe.mjs           computed styles and boxes at one scroll position
dist/                 build output (gitignored)
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

npm run verify:dist   # build, then run the same walks against dist/
```

`verify:dist` is the one that matters before a deploy: it proves the minified,
bundled, vendored output behaves identically to the source — same document
height, same trigger count, same cell count, no console errors.

All of them drive the real Lenis instance through `window.__severance`, the debug
handle `main.js` exposes, and all take `--dir <folder>` to test a build instead
of the source. `smoke.mjs --shots` writes a frame per chapter into
`tools/shots/`; the mobile run always captures into `tools/shots-mobile/`.

For narrower questions there are two more probes.
`node tools/frame.mjs <scrollY|#section[:fraction]>` captures a single frame and
prints the state that goes with it: the active palette, which plates are visible
at what opacity and decoded size, and the HUD's contrast ratio against the
current background — useful because a plate that looks fine can still be putting
small type below AA. `node tools/probe.mjs <scrollY> <selector...>` dumps
computed styles and boxes, which is how most of the animation-ownership bugs in
here were found.

They need a local Chrome or Edge — `puppeteer-core` ships no browser, and the
paths it looks in are listed at the top of each script.

## Browser support

Chromium, Firefox and Safari, current versions — the site leans on
`color-mix()`, `svh` units, the `translate`/`rotate`/`scale` CSS properties and
WebGL 2. Without WebGL the stage is skipped and the DOM narrative plays on its
own.

---

*Fan work. Severance is a production of Red Hour / Fifth Season for Apple TV+.
No affiliation and no assets from the show: every mark is drawn in code and every
photograph was rendered for this build. No frames from the series are
reproduced.*
