/**
 * mandala-ar-audio.js — Generative sacred audio for AR Darshan
 * Produces a tanpura drone and an "Om" chant using pure Web Audio API.
 */

export class MandalaAudioEngine {
  ctx = null;
  masterGain = null;
  reverb = null;
  droneNodes = [];
  omNodes = [];
  isPlaying = false;

  constructor() {
    if (typeof window !== "undefined") {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  ensureResumed() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  /* ─── Simple synthetic reverb (feedback delay network) ──────────────────── */
  buildReverb() {
    if (!this.ctx) return null;
    const input = this.ctx.createGain();
    const output = this.ctx.createGain();
    output.gain.value = 1;

    const delays = [0.03, 0.05, 0.07, 0.11];
    const gains = [0.35, 0.3, 0.25, 0.2];

    delays.forEach((dt, i) => {
      const d = this.ctx.createDelay(1);
      d.delayTime.value = dt;
      const g = this.ctx.createGain();
      g.gain.value = gains[i];
      input.connect(d);
      d.connect(g);
      g.connect(output);
      g.connect(d); // feedback
    });

    // Dry path
    const dry = this.ctx.createGain();
    dry.gain.value = 0.6;
    input.connect(dry);
    dry.connect(output);

    return { input, output };
  }

  /* ─── Tanpura drone ─────────────────────────────────────────────────────── */
  startDrone() {
    if (!this.ctx || this.droneNodes.length > 0) return;
    this.ensureResumed();

    if (!this.reverb) this.reverb = this.buildReverb();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.001;

    // Connect reverb -> master -> destination
    this.reverb.output.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Sa-Pa-Sa-Sa tanpura strings (~C2 / ~G2 / ~C3)
    const freqs = [65.41, 98.0, 130.81, 131.85]; // slight detune on last for beating
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 1 ? "triangle" : "sawtooth";
      osc.frequency.value = f;

      // Slight stereo pan
      const pan = this.ctx.createStereoPanner();
      pan.pan.value = [-0.5, 0.3, -0.2, 0.5][i];

      const gain = this.ctx.createGain();
      gain.gain.value = 0.12;

      // Slow pluck-like tremolo (jawari effect)
      const lfo = this.ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 2.5 + i * 0.4;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.04;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();

      // Lowpass to soften
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 600 + i * 120;

      osc.connect(lp);
      lp.connect(pan);
      pan.connect(gain);
      gain.connect(this.reverb.input);
      osc.start();

      this.droneNodes.push({ osc, lfo, gain });
    });

    // Fade in master
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(0.55, now, 1.5);
  }

  stopDrone() {
    if (!this.ctx || this.droneNodes.length === 0 || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(0.0001, now, 0.8);
    setTimeout(() => {
      this.droneNodes.forEach((n) => {
        try { n.osc.stop(); n.lfo.stop(); } catch {}
      });
      this.droneNodes = [];
    }, 1200);
  }

  /* ─── Om Chant burst ────────────────────────────────────────────────────── */
  chantOm() {
    if (!this.ctx) return;
    this.ensureResumed();
    if (!this.reverb) this.reverb = this.buildReverb();

    const now = this.ctx.currentTime;
    const t = now;

    // Base drone for Om (~65 Hz fundamental + 130 Hz 2nd harmonic)
    const freqs = [65.41, 130.81, 196.0];
    const gains = [0.18, 0.12, 0.06];
    const nodes = [];

    const master = this.ctx.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(0.9, t + 0.8);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
    master.connect(this.reverb.input);

    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = f;

      // Slight vibrato for breathiness
      const vib = this.ctx.createOscillator();
      vib.type = "sine";
      vib.frequency.value = 4.2 + i * 0.5;
      const vibGain = this.ctx.createGain();
      vibGain.gain.value = i === 0 ? 1.2 : 0.6;
      vib.connect(vibGain);
      vibGain.connect(osc.frequency);
      vib.start(t);

      const g = this.ctx.createGain();
      g.gain.value = gains[i];

      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 5);
      nodes.push({ osc, vib });
    });

    // Add filtered noise for "breath" texture
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(5);
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 800;
    noiseFilter.Q.value = 1;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(0.03, t + 0.6);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.reverb.input);
    noise.start(t);
    noise.stop(t + 5);

    nodes.push({ noise });

    // Clean up nodes after chant
    setTimeout(() => {
      nodes.forEach((n) => { try { n.osc?.stop(); n.vib?.stop(); n.noise?.stop(); } catch {} });
    }, 5200);
  }

  createNoiseBuffer(durationSec) {
    if (!this.ctx) return null;
    const len = this.ctx.sampleRate * durationSec;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  /* ─── Toggle drone ──────────────────────────────────────────────────────── */
  toggleDrone() {
    if (this.isPlaying) {
      this.stopDrone();
      this.isPlaying = false;
    } else {
      this.startDrone();
      this.isPlaying = true;
    }
    return this.isPlaying;
  }

  destroy() {
    this.stopDrone();
    if (this.ctx) {
      try { this.ctx.close(); } catch {}
    }
  }
}
