/**
 * AUDIO
 * A fully synthesised score — no audio files anywhere in this project.
 *
 * The bed is three layers that respond to where the visitor is in the story:
 *   · sub   — two detuned sine oscillators, the building's structural hum
 *   · air   — filtered white noise, the HVAC of a windowless floor
 *   · tone  — a thin fluorescent whine that only exists on the severed floor
 *
 * Everything is silent until the visitor explicitly opts in (autoplay policy
 * and basic manners), and every parameter change is ramped, never stepped, so
 * the mix never clicks.
 */

const MOODS = {
  outie: { sub: 55, subGain: 0.16, airGain: 0.05, tone: 0, toneGain: 0, cutoff: 320 },
  innie: { sub: 82.4, subGain: 0.1, airGain: 0.075, tone: 1180, toneGain: 0.012, cutoff: 900 },
  crt: { sub: 61.7, subGain: 0.12, airGain: 0.055, tone: 15600, toneGain: 0.02, cutoff: 1400 },
  paper: { sub: 73.4, subGain: 0.08, airGain: 0.035, tone: 0, toneGain: 0, cutoff: 520 },
  dark: { sub: 41.2, subGain: 0.2, airGain: 0.09, tone: 220, toneGain: 0.008, cutoff: 180 },
};

class Ambience {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.built = false;
    this.mood = "outie";
    this.intensity = 1;
  }

  /* ------------------------------------------------------------- graph --- */
  build() {
    if (this.built) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;

    const ctx = (this.ctx = new Ctor());
    const now = ctx.currentTime;

    // Master chain: gain → soft limiter → out
    this.master = ctx.createGain();
    this.master.gain.value = 0;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 12;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.005;
    limiter.release.value = 0.25;

    this.master.connect(limiter).connect(ctx.destination);

    /* --- sub: the building itself ---------------------------------- */
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0.16;
    this.subFilter = ctx.createBiquadFilter();
    this.subFilter.type = "lowpass";
    this.subFilter.frequency.value = 320;
    this.subFilter.Q.value = 0.8;
    this.subGain.connect(this.subFilter).connect(this.master);

    this.osc = [];
    [1, 1.005, 1.5].forEach((mult, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? "triangle" : "sine";
      o.frequency.value = 55 * mult;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.18 : 0.5;
      o.connect(g).connect(this.subGain);
      o.start(now);
      this.osc.push(o);
    });

    // Slow breathing LFO on the sub filter keeps the drone alive.
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 0.07;
    this.lfoDepth = ctx.createGain();
    this.lfoDepth.gain.value = 90;
    this.lfo.connect(this.lfoDepth).connect(this.subFilter.frequency);
    this.lfo.start(now);

    /* --- air: filtered noise --------------------------------------- */
    const noiseLen = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < noiseLen; i++) {
      // One-pole low-passed noise → brown-ish, far less hissy than white.
      last = (last + Math.random() * 2 - 1) * 0.5;
      data[i] = last * 0.6;
    }
    this.noise = ctx.createBufferSource();
    this.noise.buffer = buffer;
    this.noise.loop = true;
    this.airGain = ctx.createGain();
    this.airGain.gain.value = 0.05;
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = "bandpass";
    airFilter.frequency.value = 480;
    airFilter.Q.value = 0.6;
    this.noise.connect(airFilter).connect(this.airGain).connect(this.master);
    this.noise.start(now);

    /* --- tone: fluorescent whine ----------------------------------- */
    this.tone = ctx.createOscillator();
    this.tone.type = "sine";
    this.tone.frequency.value = 1180;
    this.toneGain = ctx.createGain();
    this.toneGain.gain.value = 0;
    this.tone.connect(this.toneGain).connect(this.master);
    this.tone.start(now);

    this.built = true;
    this.applyMood(this.mood, 0.01);
  }

  /* ------------------------------------------------------------ control -- */
  async enable() {
    this.build();
    if (!this.ctx) return false;
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.enabled = true;
    this.ramp(this.master.gain, 0.75, 2.2);
    return true;
  }

  disable() {
    if (!this.ctx) return;
    this.enabled = false;
    this.ramp(this.master.gain, 0, 0.8);
  }

  toggle() {
    if (this.enabled) {
      this.disable();
      return false;
    }
    this.enable();
    return true;
  }

  ramp(param, value, seconds) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  /** Move the bed toward a new palette's sonic character. */
  setMood(name, seconds = 2.4) {
    this.mood = name;
    if (this.built) this.applyMood(name, seconds);
  }

  applyMood(name, seconds) {
    const m = MOODS[name] || MOODS.outie;
    const k = this.intensity;
    this.ramp(this.osc[0].frequency, m.sub, seconds);
    this.ramp(this.osc[1].frequency, m.sub * 1.005, seconds);
    this.ramp(this.osc[2].frequency, m.sub * 1.5, seconds);
    this.ramp(this.subGain.gain, m.subGain * k, seconds);
    this.ramp(this.airGain.gain, m.airGain * k, seconds);
    this.ramp(this.subFilter.frequency, m.cutoff, seconds);
    if (m.tone) this.ramp(this.tone.frequency, m.tone, seconds);
    this.ramp(this.toneGain.gain, m.toneGain * k, seconds);
  }

  /** 0 → 1 macro used by the descent to swell the room. */
  setIntensity(v) {
    this.intensity = 0.35 + v * 0.9;
    if (this.built) this.applyMood(this.mood, 0.4);
  }

  /* ------------------------------------------------------------- events -- */
  /** Short UI tick — hovers, refinement selections, rail changes. */
  blip(freq = 880, { duration = 0.09, gain = 0.07, type = "sine" } = {}) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    o.connect(g).connect(this.master);
    o.start(now);
    o.stop(now + duration + 0.02);
  }

  /** Elevator arrival / heavy door — a filtered noise burst plus a body thump. */
  thud({ gain = 0.5 } = {}) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(120, now);
    o.frequency.exponentialRampToValueAtTime(38, now + 0.45);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    o.connect(g).connect(this.master);
    o.start(now);
    o.stop(now + 0.75);
  }

  /** The severance barrier snapping shut: a bright, brief, unpleasant ping. */
  sever() {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    [1720, 2580, 3440].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, now + i * 0.012);
      g.gain.linearRampToValueAtTime(0.03, now + 0.01 + i * 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      o.connect(g).connect(this.master);
      o.start(now + i * 0.012);
      o.stop(now + 0.6);
    });
    this.thud({ gain: 0.35 });
  }
}

export const audio = new Ambience();

/** Wire the HUD toggle. */
export function initAudio(button) {
  if (!button) return;
  button.addEventListener("click", () => {
    const on = audio.toggle();
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", String(on));
    if (on) audio.blip(660, { gain: 0.05 });
  });
}
