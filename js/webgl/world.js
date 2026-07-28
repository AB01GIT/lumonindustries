/**
 * WORLD
 * The single WebGL stage behind the entire document.
 *
 * Architecture
 * ------------
 *   bgScene  → one full-screen quad: the atmosphere of the current room
 *   scene    → the severed floor (4 procedural quads + signage) and the
 *              particle construct, which is parented to the camera so it
 *              always occupies the same slice of screen space
 *   postScene→ the composite pass (aberration, glitch, grain, flash, vignette)
 *
 * Everything animatable is exposed on `world.p`, a flat parameter object that
 * GSAP timelines tween directly. Scenes never touch three.js objects; they
 * only move numbers. That separation is what keeps eight chapters of
 * choreography readable.
 */

import * as THREE from "three";
import * as S from "./shaders.js";
import { deviceTier, clamp, lerp, Spring, onResize, prefersReducedMotion } from "../core/utils.js";

/* ---------------------------------------------------------- dimensions --- */
const CORRIDOR = {
  length: 420, // metres of hallway
  width: 9,
  height: 4.2,
  panelPitch: 3.0,
  doorPitch: 26.0,
  lightPitch: 9.0,
};

const EYE_HEIGHT = 1.62;

/* ------------------------------------------------------------ palettes --- */
/** Per-theme colour sets. Tweened, never swapped, so transitions are smooth. */
const PALETTES = {
  outie: {
    bgDeep: "#04070a",
    bgLift: "#101d27",
    glow: 0.22,
    bands: 0,
    drift: 0.004,
    wallBase: "#1b242b",
    wallTrim: "#0d1418",
    wallDoor: "#0a1116",
    accent: "#7fb4c8",
    floorBase: "#141d23",
    floorSeam: "#0a1014",
    ceilLight: "#2e4a58",
    fog: "#05080b",
    fogRange: [8, 120],
    lights: 0.25,
    reflect: 0.1,
    tint: "#ffffff",
    exposure: 1.0,
    vignette: 0.95,
    grain: 0.055,
    scan: 0.045,
  },
  innie: {
    bgDeep: "#c9d3d1",
    bgLift: "#f6f8f6",
    glow: 0.26,
    bands: 1,
    drift: 0.002,
    wallBase: "#e9ece9",
    wallTrim: "#c3ccc9",
    wallDoor: "#dfe4e1",
    accent: "#bcd7e2",
    floorBase: "#dfe3e0",
    floorSeam: "#b9c1be",
    ceilLight: "#ffffff",
    fog: "#eef1ef",
    fogRange: [30, 300],
    lights: 1.0,
    reflect: 0.55,
    tint: "#ffffff",
    exposure: 1.04,
    vignette: 0.45,
    grain: 0.04,
    scan: 0.02,
  },
  crt: {
    bgDeep: "#02090d",
    bgLift: "#0b3245",
    glow: 0.4,
    bands: 0.6,
    drift: 0.006,
    wallBase: "#0a2b39",
    wallTrim: "#04141c",
    wallDoor: "#072230",
    accent: "#57c7e8",
    floorBase: "#072230",
    floorSeam: "#02090d",
    ceilLight: "#57c7e8",
    fog: "#04141c",
    fogRange: [10, 140],
    lights: 0.5,
    reflect: 0.3,
    tint: "#dff3fb",
    exposure: 1.0,
    vignette: 0.85,
    grain: 0.075,
    scan: 0.09,
  },
  paper: {
    bgDeep: "#d5cfc0",
    bgLift: "#efeade",
    // Deliberately low: on a light palette the central bloom reads as a blown
    // highlight and eats the type contrast rather than adding atmosphere.
    glow: 0.1,
    bands: 0,
    drift: 0.003,
    wallBase: "#e2ddd1",
    wallTrim: "#bdb6a4",
    wallDoor: "#d6d0c2",
    accent: "#123f5e",
    floorBase: "#d8d2c4",
    floorSeam: "#b6ae9c",
    ceilLight: "#fffaf0",
    fog: "#e8e4da",
    fogRange: [26, 260],
    lights: 0.8,
    reflect: 0.35,
    tint: "#fffaf2",
    exposure: 1.02,
    vignette: 0.55,
    grain: 0.085,
    scan: 0.015,
  },
  dark: {
    bgDeep: "#010203",
    bgLift: "#0a0b09",
    glow: 0.16,
    bands: 0,
    drift: 0.008,
    wallBase: "#0b0d0c",
    wallTrim: "#050606",
    wallDoor: "#070808",
    accent: "#d9c98a",
    floorBase: "#08090a",
    floorSeam: "#020303",
    ceilLight: "#3a3324",
    fog: "#020304",
    fogRange: [4, 70],
    lights: 0.18,
    reflect: 0.06,
    tint: "#fdf6e3",
    exposure: 0.92,
    vignette: 1.0,
    grain: 0.1,
    scan: 0.06,
  },
};

/* ============================================================== helpers == */

/**
 * Sample the Lumon mark (triangle + dot) off a 2-D canvas and turn the opaque
 * pixels into point positions. Drawing the mark with canvas paths instead of
 * text keeps the construct identical regardless of which webfonts have loaded.
 */
function sampleMark(count, spanX = 11) {
  const size = 220;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#fff";
  ctx.fillStyle = "#fff";
  ctx.lineWidth = size * 0.045;
  ctx.lineJoin = "round";

  // Triangle
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.14);
  ctx.lineTo(size * 0.87, size * 0.84);
  ctx.lineTo(size * 0.13, size * 0.84);
  ctx.closePath();
  ctx.stroke();

  // Inner dot
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.63, size * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // Baseline rule under the mark
  ctx.fillRect(size * 0.13, size * 0.93, size * 0.74, size * 0.028);

  const data = ctx.getImageData(0, 0, size, size).data;
  const hits = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (data[(y * size + x) * 4] > 140) hits.push([x, y]);
    }
  }

  const out = new Float32Array(count * 3);
  const scale = spanX / size;
  for (let i = 0; i < count; i++) {
    const [x, y] = hits[(Math.random() * hits.length) | 0] || [size / 2, size / 2];
    out[i * 3 + 0] = (x - size / 2) * scale + (Math.random() - 0.5) * 0.045;
    out[i * 3 + 1] = -(y - size / 2) * scale + (Math.random() - 0.5) * 0.045;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }
  return out;
}

const col = (hex) => new THREE.Color(hex);

/* ================================================================ world == */

class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.tier = deviceTier();
    this.reduced = prefersReducedMotion();
    this.clock = new THREE.Clock();
    this.disposed = false;

    /** Flat, tweenable parameter block — the public animation surface. */
    this.p = {
      time: 0,
      timeScale: 1,

      // camera
      camZ: 6,
      camX: 0,
      camY: EYE_HEIGHT,
      camRoll: 0,
      camPitch: 0,
      camFov: 50,
      shake: 0,
      parallax: 1,

      // architecture
      corridor: 0, // 0 = hidden, 1 = fully present
      lights: 0.25,
      reflect: 0.1,
      flicker: 0,
      fogNear: 8,
      fogFar: 120,

      // particle construct
      dust: 0.0,
      morph: 0,
      scatter: 0,
      twist: 0,
      dotSize: 2.4,

      // composite
      aberration: 0.35,
      glitch: 0,
      flash: 0,
      grain: 0.055,
      scan: 0.045,
      vignette: 0.95,
      exposure: 1,
      curve: 0.06,

      // atmosphere
      glow: 0.22,
      bands: 0,
      drift: 0.004,
    };

    this.mouse = { x: 0, y: 0 };
    this.mx = new Spring({ stiffness: 0.045, damping: 0.8 });
    this.my = new Spring({ stiffness: 0.045, damping: 0.8 });

    this.#initRenderer();
    this.#initBackdrop();
    this.#initCamera();
    this.#initCorridor();
    this.#initSignage();
    this.#initParticles();
    this.#initPost();
    this.setTheme("outie", 0);

    this.#bindEvents();
  }

  /* ----------------------------------------------------------- renderer -- */
  #initRenderer() {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.tier === "high",
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    });
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 1);
    this.maxDpr = this.tier === "high" ? 1.75 : this.tier === "mid" ? 1.35 : 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxDpr));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
  }

  /* ----------------------------------------------------------- backdrop -- */
  #initBackdrop() {
    this.bgScene = new THREE.Scene();
    this.bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.bgUniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uColorDeep: { value: col("#04070a") },
      uColorLift: { value: col("#101d27") },
      uGlow: { value: 0.22 },
      uBands: { value: 0 },
      uDrift: { value: 0.004 },
    };

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: S.backdrop.vertex,
        fragmentShader: S.backdrop.fragment,
        uniforms: this.bgUniforms,
        depthTest: false,
        depthWrite: false,
      })
    );
    mesh.frustumCulled = false;
    this.bgScene.add(mesh);
  }

  /* ------------------------------------------------------------- camera -- */
  #initCamera() {
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      700
    );
    camera.position.set(0, EYE_HEIGHT, 6);
    this.camera = camera;
    // Children of the camera (the dust construct) need the camera in-graph.
    this.scene.add(camera);
  }

  /* ----------------------------------------------------------- corridor -- */
  #initCorridor() {
    const { length: L, width: W, height: H } = CORRIDOR;
    const group = new THREE.Group();
    group.visible = false;
    this.corridor = group;
    this.scene.add(group);

    // Shared fog uniforms so all four surfaces stay in perfect agreement.
    this.fogUniforms = {
      uFogColor: { value: col("#05080b") },
      uFogRange: { value: new THREE.Vector2(8, 120) },
    };

    const shared = () => ({
      ...this.fogUniforms,
      uTime: { value: 0 },
    });

    /* --- walls ------------------------------------------------------- */
    this.wallUniforms = {
      ...shared(),
      uBase: { value: col("#e9ece9") },
      uTrim: { value: col("#c3ccc9") },
      uDoor: { value: col("#dfe4e1") },
      uAccent: { value: col("#bcd7e2") },
      uLength: { value: L },
      uPanel: { value: CORRIDOR.panelPitch },
      uDoorPitch: { value: CORRIDOR.doorPitch },
      uLights: { value: 1 },
      uFlicker: { value: 0 },
    };

    const wallMat = new THREE.ShaderMaterial({
      vertexShader: S.wall.vertex,
      fragmentShader: S.wall.fragment,
      uniforms: this.wallUniforms,
    });

    const wallGeo = new THREE.PlaneGeometry(L, H, 1, 1);

    const left = new THREE.Mesh(wallGeo, wallMat);
    left.rotation.y = Math.PI / 2;
    left.position.set(-W / 2, H / 2, -L / 2);
    group.add(left);

    const right = new THREE.Mesh(wallGeo, wallMat);
    right.rotation.y = -Math.PI / 2;
    right.position.set(W / 2, H / 2, -L / 2);
    group.add(right);

    /* --- floor ------------------------------------------------------- */
    this.floorUniforms = {
      ...shared(),
      uBase: { value: col("#dfe3e0") },
      uSeam: { value: col("#b9c1be") },
      uAccent: { value: col("#ffffff") },
      uLength: { value: L },
      uWidth: { value: W },
      uTile: { value: 1.5 },
      uLightPitch: { value: CORRIDOR.lightPitch },
      uReflect: { value: 0.55 },
    };

    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(W, L, 1, 1),
      new THREE.ShaderMaterial({
        vertexShader: S.floor.vertex,
        fragmentShader: S.floor.fragment,
        uniforms: this.floorUniforms,
      })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, -L / 2);
    group.add(floorMesh);

    /* --- ceiling ----------------------------------------------------- */
    this.ceilUniforms = {
      ...shared(),
      uBase: { value: col("#e9ece9") },
      uLight: { value: col("#ffffff") },
      uLength: { value: L },
      uWidth: { value: W },
      uLightPitch: { value: CORRIDOR.lightPitch },
      uIntensity: { value: 1 },
      uFlicker: { value: 0 },
    };

    const ceilMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(W, L, 1, 1),
      new THREE.ShaderMaterial({
        vertexShader: S.ceiling.vertex,
        fragmentShader: S.ceiling.fragment,
        uniforms: this.ceilUniforms,
      })
    );
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.position.set(0, CORRIDOR.height, -L / 2);
    group.add(ceilMesh);
  }

  /* ----------------------------------------------------------- signage --- */
  /** A handful of real meshes: emissive wayfinding that reads as depth cues. */
  #initSignage() {
    const group = new THREE.Group();
    this.corridor.add(group);
    this.signage = group;

    const signGeo = new THREE.PlaneGeometry(0.9, 0.26);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x43d17c,
      transparent: true,
      opacity: 0.9,
    });

    for (let i = 1; i <= 12; i++) {
      const z = -i * CORRIDOR.doorPitch + 6;
      const side = i % 2 === 0 ? 1 : -1;

      const sign = new THREE.Mesh(signGeo, mat);
      sign.position.set(side * (CORRIDOR.width / 2 - 0.06), 2.55, z);
      sign.rotation.y = side * -Math.PI / 2;
      group.add(sign);
    }

    // A single ceiling-hung sign far down the hall gives the eye a target.
    const hangGeo = new THREE.PlaneGeometry(2.6, 0.5);
    const hangMat = new THREE.MeshBasicMaterial({ color: 0xeef1ef, transparent: true, opacity: 0.85 });
    for (let i = 1; i <= 4; i++) {
      const hang = new THREE.Mesh(hangGeo, hangMat);
      hang.position.set(0, 3.2, -i * 84);
      group.add(hang);
    }
  }

  /* --------------------------------------------------------- particles --- */
  #initParticles() {
    const count = this.tier === "high" ? 7000 : this.tier === "mid" ? 3600 : 1200;

    const cloud = new Float32Array(count * 3);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // A slab of drifting motes that fills the frame and reaches past it.
      cloud[i * 3 + 0] = (Math.random() - 0.5) * 46;
      cloud[i * 3 + 1] = (Math.random() - 0.5) * 26;
      cloud[i * 3 + 2] = -6 - Math.random() * 62;
      seeds[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(cloud, 3));
    geo.setAttribute("aTarget", new THREE.BufferAttribute(sampleMark(count, 11), 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    this.dustUniforms = {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uScatter: { value: 0 },
      uTwist: { value: 0 },
      uSize: { value: 2.4 },
      uPixelRatio: { value: this.renderer.getPixelRatio() },
      uColor: { value: col("#cfe4ec") },
      uOpacity: { value: 0 },
    };

    const points = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: S.particles.vertex,
        fragmentShader: S.particles.fragment,
        uniforms: this.dustUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    points.frustumCulled = false;
    // Parented to the camera: the construct is always framed, no matter where
    // in the 420 m hallway the camera happens to be.
    points.position.set(0, 0, -16);
    this.camera.add(points);
    this.dust = points;
  }

  /* ------------------------------------------------------------- post ----- */
  #initPost() {
    const dpr = this.renderer.getPixelRatio();
    this.target = new THREE.WebGLRenderTarget(
      Math.floor(window.innerWidth * dpr),
      Math.floor(window.innerHeight * dpr),
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        type: THREE.UnsignedByteType,
        depthBuffer: true,
      }
    );

    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.postUniforms = {
      uScene: { value: this.target.texture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uCurve: { value: 0.06 },
      uAberration: { value: 0.35 },
      uGlitch: { value: 0 },
      uFlash: { value: 0 },
      uGrain: { value: 0.055 },
      uScan: { value: 0.045 },
      uVignette: { value: 0.95 },
      uExposure: { value: 1 },
      uTint: { value: col("#ffffff") },
    };

    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: S.post.vertex,
        fragmentShader: S.post.fragment,
        uniforms: this.postUniforms,
        depthTest: false,
        depthWrite: false,
      })
    );
    quad.frustumCulled = false;
    this.postScene.add(quad);

    this.resize();
  }

  /* ------------------------------------------------------------ events --- */
  #bindEvents() {
    this.offResize = onResize(() => this.resize());

    window.addEventListener(
      "pointermove",
      (e) => {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
      },
      { passive: true }
    );

    // Stop burning GPU when the tab is hidden.
    document.addEventListener("visibilitychange", () => {
      this.hidden = document.hidden;
      if (!this.hidden) this.clock.getDelta();
    });
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);

    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);

    this.camera.aspect = w / h;
    // Narrow viewports need a wider lens or the corridor feels claustrophobic
    // in the wrong way — cropped rather than deep.
    this.baseFov = w / h < 0.85 ? 66 : 50;
    this.camera.fov = this.baseFov * (this.p.camFov / 50);
    this.camera.updateProjectionMatrix();

    this.target.setSize(Math.floor(w * dpr), Math.floor(h * dpr));

    this.bgUniforms.uResolution.value.set(w, h);
    this.postUniforms.uResolution.value.set(w * dpr, h * dpr);
    this.dustUniforms.uPixelRatio.value = dpr;
  }

  /* ------------------------------------------------------------- theme --- */
  /**
   * Tween the whole stage to a new palette. Colours are interpolated in place
   * so a theme change mid-scroll never pops.
   */
  setTheme(name, duration = 1.1) {
    // Guard: scenes may call this from a scroll handler on every frame.
    if (this.theme === name && duration !== 0) return;
    const t = PALETTES[name] || PALETTES.outie;
    this.theme = name;

    const tweenColor = (target, hex) => {
      const next = col(hex);
      if (duration === 0) {
        target.copy(next);
        return;
      }
      gsap.to(target, { r: next.r, g: next.g, b: next.b, duration, ease: "power2.inOut" });
    };

    tweenColor(this.bgUniforms.uColorDeep.value, t.bgDeep);
    tweenColor(this.bgUniforms.uColorLift.value, t.bgLift);
    tweenColor(this.wallUniforms.uBase.value, t.wallBase);
    tweenColor(this.wallUniforms.uTrim.value, t.wallTrim);
    tweenColor(this.wallUniforms.uDoor.value, t.wallDoor);
    tweenColor(this.wallUniforms.uAccent.value, t.accent);
    tweenColor(this.floorUniforms.uBase.value, t.floorBase);
    tweenColor(this.floorUniforms.uSeam.value, t.floorSeam);
    tweenColor(this.ceilUniforms.uLight.value, t.ceilLight);
    tweenColor(this.ceilUniforms.uBase.value, t.wallBase);
    tweenColor(this.fogUniforms.uFogColor.value, t.fog);
    tweenColor(this.postUniforms.uTint.value, t.tint);
    tweenColor(this.dustUniforms.uColor.value, t.accent);

    const numbers = {
      glow: t.glow,
      bands: t.bands,
      drift: t.drift,
      lights: t.lights,
      reflect: t.reflect,
      fogNear: t.fogRange[0],
      fogFar: t.fogRange[1],
      exposure: t.exposure,
      vignette: t.vignette,
      grain: t.grain,
      scan: t.scan,
    };

    if (duration === 0) Object.assign(this.p, numbers);
    else gsap.to(this.p, { ...numbers, duration, ease: "power2.inOut", overwrite: "auto" });
  }

  /* -------------------------------------------------------------- frame -- */
  render() {
    if (this.disposed || this.hidden) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const p = this.p;
    p.time += dt * p.timeScale;
    const t = p.time;

    /* --- camera ----------------------------------------------------- */
    this.mx.target = this.mouse.x;
    this.my.target = this.mouse.y;
    const mx = this.mx.update();
    const my = this.my.update();

    // Hand-held drift: two incommensurable sines so it never loops visibly.
    const drift = this.reduced ? 0 : 1;
    const shakeAmp = p.shake;
    const cam = this.camera;

    cam.position.set(
      p.camX + mx * 0.55 * p.parallax + Math.sin(t * 0.31) * 0.06 * drift + (Math.random() - 0.5) * shakeAmp,
      p.camY - my * 0.28 * p.parallax + Math.sin(t * 0.47) * 0.045 * drift + (Math.random() - 0.5) * shakeAmp,
      p.camZ
    );

    cam.rotation.set(
      p.camPitch - my * 0.035 * p.parallax,
      -mx * 0.055 * p.parallax,
      p.camRoll + Math.sin(t * 0.23) * 0.004 * drift
    );

    const fov = this.baseFov * (p.camFov / 50);
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    /* --- uniforms --------------------------------------------------- */
    this.bgUniforms.uTime.value = t;
    this.bgUniforms.uGlow.value = p.glow;
    this.bgUniforms.uBands.value = p.bands;
    this.bgUniforms.uDrift.value = p.drift;

    this.corridor.visible = p.corridor > 0.001;
    if (this.corridor.visible) {
      this.wallUniforms.uTime.value = t;
      this.floorUniforms.uTime.value = t;
      this.ceilUniforms.uTime.value = t;
      this.wallUniforms.uLights.value = p.lights * p.corridor;
      this.wallUniforms.uFlicker.value = p.flicker;
      this.ceilUniforms.uIntensity.value = p.lights * p.corridor;
      this.ceilUniforms.uFlicker.value = p.flicker;
      this.floorUniforms.uReflect.value = p.reflect * p.corridor;
      // Collapsing the fog window is how the corridor dissolves in and out.
      this.fogUniforms.uFogRange.value.set(
        lerp(0.5, p.fogNear, p.corridor),
        lerp(3.0, p.fogFar, p.corridor)
      );
      this.signage.visible = p.corridor > 0.6;
    }

    this.dustUniforms.uTime.value = t;
    this.dustUniforms.uMorph.value = p.morph;
    this.dustUniforms.uScatter.value = p.scatter;
    this.dustUniforms.uTwist.value = p.twist;
    this.dustUniforms.uSize.value = p.dotSize;
    this.dustUniforms.uOpacity.value = p.dust;
    this.dust.visible = p.dust > 0.001;

    this.postUniforms.uTime.value = t;
    this.postUniforms.uCurve.value = p.curve;
    this.postUniforms.uAberration.value = p.aberration;
    this.postUniforms.uGlitch.value = p.glitch;
    this.postUniforms.uFlash.value = p.flash;
    this.postUniforms.uGrain.value = p.grain;
    this.postUniforms.uScan.value = p.scan;
    this.postUniforms.uVignette.value = p.vignette;
    this.postUniforms.uExposure.value = p.exposure;

    /* --- draw ------------------------------------------------------- */
    const r = this.renderer;
    r.setRenderTarget(this.target);
    r.clear(true, true, true);
    r.render(this.bgScene, this.bgCamera); // paints, no depth
    r.render(this.scene, this.camera);
    r.setRenderTarget(null);
    r.clear(true, true, true);
    r.render(this.postScene, this.postCamera);
  }

  dispose() {
    this.disposed = true;
    this.offResize?.();
    this.renderer.dispose();
  }
}

/* ---------------------------------------------------------------- factory - */
let instance = null;

export function initWorld(canvas) {
  if (instance) return instance;
  try {
    instance = new World(canvas);
    gsap.ticker.add(() => instance.render());
    document.body.classList.add("gl-ready");
  } catch (err) {
    // A missing WebGL context must never take the story down with it.
    console.warn("[world] WebGL unavailable — continuing without the stage.", err);
    instance = null;
  }
  return instance;
}

export const getWorld = () => instance;
export { CORRIDOR, EYE_HEIGHT };
