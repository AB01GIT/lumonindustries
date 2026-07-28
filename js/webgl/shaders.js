/**
 * SHADERS
 * All GLSL for the experience lives here as tagged template strings.
 *
 * The severed floor is deliberately built from four quads (floor, ceiling,
 * two walls) whose entire architecture — panel seams, door recesses, baseboard
 * shadows, fluorescent ceiling troughs, floor sheen — is *drawn procedurally in
 * the fragment shader*. Four draw calls buy us an infinite corridor that holds
 * 60 fps on integrated graphics, and every architectural rhythm becomes a
 * uniform we can animate from the scroll timeline.
 */

/* ------------------------------------------------------------- shared ----- */

/** Cheap 2-D value noise + fbm, shared by the atmosphere and grain. */
const NOISE = /* glsl */ `
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }
`;

/** Manual depth fog. Custom materials don't inherit three.js' fog chunks, and
 *  doing it by hand lets the descent animate the fog window directly. */
const FOG = /* glsl */ `
  uniform vec3 uFogColor;
  uniform vec2 uFogRange; // x: near, y: far

  vec3 applyFog(vec3 color, float depth) {
    float f = smoothstep(uFogRange.x, uFogRange.y, depth);
    return mix(color, uFogColor, f);
  }
`;

/* ==================================================== ATMOSPHERE BACKDROP == */
/** Full-screen gradient field: the "air" of whatever room we are in. */
export const backdrop = {
  vertex: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragment: /* glsl */ `
    precision highp float;
    varying vec2 vUv;

    uniform float uTime;
    uniform vec2  uResolution;
    uniform vec3  uColorDeep;
    uniform vec3  uColorLift;
    uniform float uGlow;     // strength of the central bloom
    uniform float uBands;    // fluorescent banding (severed floor only)
    uniform float uDrift;    // vertical drift speed of the haze

    ${NOISE}

    void main() {
      vec2 uv = vUv;
      vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

      // Base vertical gradient — light pools toward the horizon line.
      float grad = smoothstep(-0.15, 0.85, 1.0 - abs(uv.y - 0.52) * 1.6);
      vec3 color = mix(uColorDeep, uColorLift, grad * 0.85);

      // Slow volumetric haze.
      float haze = fbm(p * 2.2 + vec2(uTime * 0.012, uTime * uDrift));
      color += (haze - 0.5) * 0.06;

      // Central bloom, as if a light source sits just out of frame.
      float bloom = exp(-dot(p, p) * 3.2);
      color += uColorLift * bloom * uGlow;

      // Fluorescent tube banding, extremely subtle, only on the floor.
      float bands = sin(uv.y * 140.0 + uTime * 0.4) * 0.5 + 0.5;
      color += bands * uBands * 0.02;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

/* ============================================================== CORRIDOR == */

/** Shared vertex program for every corridor surface. */
const surfaceVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vWorld;

  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

/**
 * WALLS — panelled drywall with recessed doors.
 * uv.x runs along the corridor (0 → uLength metres), uv.y is floor → ceiling.
 */
export const wall = {
  vertex: surfaceVertex,
  fragment: /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    varying float vDepth;
    varying vec3 vWorld;

    uniform vec3  uBase;
    uniform vec3  uTrim;
    uniform vec3  uDoor;
    uniform vec3  uAccent;
    uniform float uLength;    // corridor length in metres
    uniform float uPanel;     // panel pitch in metres
    uniform float uDoorPitch; // door pitch in metres
    uniform float uLights;    // ceiling light contribution
    uniform float uTime;
    uniform float uFlicker;

    ${FOG}
    ${NOISE}

    void main() {
      float along = vUv.x * uLength;
      float up = vUv.y;

      vec3 color = uBase;

      // --- vertical wash: brighter under the ceiling troughs -------------
      float wash = mix(0.72, 1.06, smoothstep(0.0, 1.0, pow(up, 0.7)));
      color *= wash;

      // --- panel seams ---------------------------------------------------
      float panel = fract(along / uPanel);
      float seam = smoothstep(0.012, 0.0, min(panel, 1.0 - panel));
      color = mix(color, uTrim * 0.86, seam * 0.55);

      // --- baseboard + shadow gap ---------------------------------------
      float base = smoothstep(0.075, 0.06, up);
      color = mix(color, uTrim * 0.7, base);
      float gap = smoothstep(0.083, 0.075, up) * smoothstep(0.069, 0.077, up);
      color = mix(color, uTrim * 0.28, gap);

      // --- recessed doors every uDoorPitch metres ------------------------
      float doorCell = fract(along / uDoorPitch);
      float doorX = smoothstep(0.30, 0.33, doorCell) * smoothstep(0.62, 0.59, doorCell);
      float doorY = smoothstep(0.08, 0.11, up) * smoothstep(0.68, 0.64, up);
      float door = doorX * doorY;
      color = mix(color, uDoor, door * 0.9);

      // Door frame highlight, and a small numbered plate beside each door.
      float frame = (smoothstep(0.285, 0.30, doorCell) * smoothstep(0.335, 0.32, doorCell)
                  +  smoothstep(0.575, 0.59, doorCell) * smoothstep(0.625, 0.61, doorCell))
                  * doorY;
      color = mix(color, uTrim * 0.55, frame * 0.8);

      float plate = smoothstep(0.655, 0.665, doorCell) * smoothstep(0.70, 0.69, doorCell)
                  * smoothstep(0.44, 0.46, up) * smoothstep(0.53, 0.51, up);
      color = mix(color, uAccent, plate * 0.85);

      // --- fluorescent falloff + faint flicker ---------------------------
      float lamp = pow(up, 2.4) * uLights;
      float flick = 1.0 + uFlicker * (vnoise(vec2(uTime * 7.0, along * 0.1)) - 0.5) * 0.7;
      color += uAccent * lamp * 0.10 * flick;

      // --- micro texture -------------------------------------------------
      color += (vnoise(vec2(along * 26.0, up * 220.0)) - 0.5) * 0.018;

      gl_FragColor = vec4(applyFog(color, vDepth), 1.0);
    }
  `,
};

/**
 * FLOOR — pale terrazzo with a long specular smear from the ceiling troughs.
 */
export const floor = {
  vertex: surfaceVertex,
  fragment: /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    varying float vDepth;
    varying vec3 vWorld;

    uniform vec3  uBase;
    uniform vec3  uSeam;
    uniform vec3  uAccent;
    uniform float uLength;
    uniform float uWidth;
    uniform float uTile;
    uniform float uLightPitch;
    uniform float uReflect;
    uniform float uTime;

    ${FOG}
    ${NOISE}

    void main() {
      float along = vUv.y * uLength;
      float across = (vUv.x - 0.5) * uWidth;

      vec3 color = uBase;

      // --- terrazzo speckle ---------------------------------------------
      float speck = vnoise(vec2(across * 34.0, along * 34.0));
      color += (speck - 0.5) * 0.05;

      // --- tile grid -----------------------------------------------------
      vec2 cell = fract(vec2(across, along) / uTile);
      float grid = smoothstep(0.02, 0.0, min(cell.x, 1.0 - cell.x))
                 + smoothstep(0.02, 0.0, min(cell.y, 1.0 - cell.y));
      color = mix(color, uSeam, clamp(grid, 0.0, 1.0) * 0.32);

      // --- reflected light troughs: bright, vertically smeared bars ------
      float trough = fract(along / uLightPitch);
      float bar = smoothstep(0.34, 0.5, 1.0 - abs(trough - 0.5) * 2.0);
      float centred = exp(-pow(across / (uWidth * 0.34), 2.0));
      color += uAccent * bar * centred * uReflect;

      // --- long wet-look streaks running down the corridor ---------------
      float streak = pow(max(0.0, 1.0 - abs(across) / (uWidth * 0.5)), 3.0);
      color += vec3(1.0) * streak * 0.05 * uReflect;

      gl_FragColor = vec4(applyFog(color, vDepth), 1.0);
    }
  `,
};

/**
 * CEILING — suspended tiles interrupted by luminous troughs.
 */
export const ceiling = {
  vertex: surfaceVertex,
  fragment: /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    varying float vDepth;

    uniform vec3  uBase;
    uniform vec3  uLight;
    uniform float uLength;
    uniform float uWidth;
    uniform float uLightPitch;
    uniform float uIntensity;
    uniform float uFlicker;
    uniform float uTime;

    ${FOG}
    ${NOISE}

    void main() {
      float along = vUv.y * uLength;
      float across = (vUv.x - 0.5) * uWidth;

      vec3 color = uBase * 0.9;

      // Suspended tile grid.
      vec2 cell = fract(vec2(across, along) / 1.2);
      float grid = smoothstep(0.03, 0.0, min(cell.x, 1.0 - cell.x))
                 + smoothstep(0.03, 0.0, min(cell.y, 1.0 - cell.y));
      color = mix(color, uBase * 0.68, clamp(grid, 0.0, 1.0) * 0.5);

      // Luminous troughs, two rows, running the length of the hall.
      float trough = fract(along / uLightPitch);
      float lit = smoothstep(0.30, 0.46, 1.0 - abs(trough - 0.5) * 2.0);
      float rows = smoothstep(0.24, 0.16, abs(abs(across) - uWidth * 0.22));
      float flick = 1.0 + uFlicker * (vnoise(vec2(uTime * 9.0, along)) - 0.5);

      color = mix(color, uLight, lit * rows * uIntensity * flick);
      color += uLight * lit * rows * 0.35 * uIntensity;

      gl_FragColor = vec4(applyFog(color, vDepth), 1.0);
    }
  `,
};

/* ============================================================= PARTICLES == */
/**
 * A single point cloud that morphs between three formations:
 *   A — a dispersed volumetric cloud (induction)
 *   B — a glyph sampled from a 2-D canvas (the Lumon mark / a word)
 * `uMorph` cross-fades, `uScatter` blows it apart, `uTwist` adds a slow
 * rotational shear so the cloud never feels frozen.
 */
export const particles = {
  vertex: /* glsl */ `
    attribute vec3 aTarget;
    attribute float aSeed;

    uniform float uTime;
    uniform float uMorph;
    uniform float uScatter;
    uniform float uTwist;
    uniform float uSize;
    uniform float uPixelRatio;

    varying float vSeed;
    varying float vFade;

    void main() {
      // Stagger the morph per point so the formation assembles as a wave.
      float stagger = smoothstep(0.0, 1.0, clamp(uMorph * 1.6 - aSeed * 0.6, 0.0, 1.0));
      vec3 p = mix(position, aTarget, stagger);

      // Idle turbulence keeps the cloud breathing.
      float t = uTime * 0.35 + aSeed * 6.2831;
      p += vec3(sin(t), cos(t * 1.13), sin(t * 0.71)) * (0.16 + uScatter * 2.4);

      // Slow shear about the corridor axis.
      float a = uTwist * (0.4 + aSeed * 0.6);
      float c = cos(a), s = sin(a);
      p.xy = mat2(c, -s, s, c) * p.xy;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;

      // Perspective size attenuation, clamped so distant motes stay visible.
      float dist = max(1.0, -mv.z);
      gl_PointSize = uSize * uPixelRatio * (12.0 / dist) * (0.5 + aSeed);

      vSeed = aSeed;
      vFade = smoothstep(90.0, 6.0, dist);
    }
  `,
  fragment: /* glsl */ `
    precision highp float;
    varying float vSeed;
    varying float vFade;

    uniform vec3  uColor;
    uniform float uOpacity;
    uniform float uTime;

    void main() {
      // Round, soft-edged motes.
      vec2 d = gl_PointCoord - 0.5;
      float r = dot(d, d);
      if (r > 0.25) discard;
      float alpha = smoothstep(0.25, 0.0, r);

      // Per-point twinkle.
      float tw = 0.65 + 0.35 * sin(uTime * 2.4 + vSeed * 40.0);

      gl_FragColor = vec4(uColor, alpha * uOpacity * vFade * tw);
    }
  `,
};

/* =========================================================== POST EFFECT == */
/**
 * Final composite: lens curvature, chromatic aberration, CRT roll glitch,
 * exposure flash, grain, scanlines and vignette. Everything is driven by
 * uniforms that the scroll timeline tweens, which is how the severance
 * procedure gets its violence.
 */
export const post = {
  vertex: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragment: /* glsl */ `
    precision highp float;
    varying vec2 vUv;

    uniform sampler2D uScene;
    uniform vec2  uResolution;
    uniform float uTime;
    uniform float uCurve;       // barrel distortion
    uniform float uAberration;  // rgb split
    uniform float uGlitch;      // horizontal tear amount
    uniform float uFlash;       // white-out
    uniform float uGrain;
    uniform float uScan;
    uniform float uVignette;
    uniform float uExposure;
    uniform vec3  uTint;

    ${NOISE}

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;

      // --- lens curvature -----------------------------------------------
      // Normalised so the corner of the frame still lands exactly on the
      // corner of the texture: without this the barrel push samples outside
      // [0,1] and paints a black border around the whole composition.
      float overscan = 1.0 + uCurve * 0.5;
      uv = 0.5 + c * (1.0 + uCurve * dot(c, c)) / overscan;

      // --- horizontal tear: blocks of scanlines shift sideways -----------
      if (uGlitch > 0.001) {
        float band = floor(uv.y * 42.0);
        float shift = (hash(vec2(band, floor(uTime * 18.0))) - 0.5);
        shift *= step(0.62, hash(vec2(band * 3.7, floor(uTime * 18.0))));
        uv.x += shift * uGlitch * 0.16;
      }

      // --- chromatic aberration, stronger toward the edges ---------------
      float ab = uAberration * (0.0012 + length(c) * 0.012);
      vec2 dir = normalize(c + 1e-5);
      vec3 color;
      // Clamped so the aberration offset near the frame edge smears the edge
      // pixel instead of wrapping or going black.
      color.r = texture2D(uScene, clamp(uv + dir * ab, 0.0, 1.0)).r;
      color.g = texture2D(uScene, clamp(uv, 0.0, 1.0)).g;
      color.b = texture2D(uScene, clamp(uv - dir * ab, 0.0, 1.0)).b;

      // --- grade ---------------------------------------------------------
      color *= uExposure;
      color *= uTint;

      // --- scanlines + grain ---------------------------------------------
      float scan = sin(uv.y * uResolution.y * 1.5) * 0.5 + 0.5;
      color *= 1.0 - scan * uScan;

      float g = hash(uv * uResolution + fract(uTime) * 431.0);
      color += (g - 0.5) * uGrain;

      // --- vignette ------------------------------------------------------
      float vig = 1.0 - smoothstep(0.36, 0.92, length(c) * 1.28);
      color *= mix(1.0, vig, uVignette);

      // --- flash ---------------------------------------------------------
      color = mix(color, vec3(1.0), clamp(uFlash, 0.0, 1.0));

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};
