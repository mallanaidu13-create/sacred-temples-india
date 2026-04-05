import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  bg: "#1A1109", saffron: "#D4853C", gold: "#C4A24E", cream: "#F2E8D4", text: "#EDE4D4",
  card: "#241A10", div: "rgba(255,255,255,0.07)", glass: "rgba(26,17,9,0.78)", textD: "#6E5E48",
};

const DIRECTIONS = ["North Gate", "North-East", "East Gate", "South-East", "South Gate", "South-West", "West Gate", "North-West"];

// ── Raga scales (just-intonation-ish ratios) ──
// Sa, Re, Ga, Ma, Ma#(tivra), Pa, Dha, Ni, Sa'
const RAGAS = {
  bhairav:  [1, 16/15, 5/4, 4/3, 45/32, 3/2, 8/5, 15/8, 2],       // komal Re, Dha (serious, morning)
  yaman:    [1, 9/8, 5/4, 45/32, 45/32, 3/2, 5/3, 15/8, 2],        // tivra Ma (bright, devotional)
  durga:    [1, 9/8, 5/4, 4/3, 4/3, 3/2, 5/3, 5/3, 2],             // skips Ni (energetic, pentatonic feel)
};

const MODE_CONFIG = {
  shiva:  { raga: "bhairav", root: 108, tempo: 3200, hasTabla: false },   // deep, slow, no percussion
  vishnu: { raga: "yaman",   root: 196, tempo: 2800, hasTabla: true },    // bright, tabla teentaal
  devi:   { raga: "durga",   root: 261.63, tempo: 2400, hasTabla: true }, // energetic, clap/kartaal
};

function createNoiseBuffer(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export default function SpatialAudio({ onBack }) {
  const [mode, setMode] = useState("shiva");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [facing, setFacing] = useState("Facing North Gate");
  const [stepCount, setStepCount] = useState(0);
  const [hasMotion, setHasMotion] = useState(null);
  const ctxRef = useRef(null);
  const noiseBufferRef = useRef(null);
  const sourcesRef = useRef([]);
  const intervalRef = useRef([]);
  const stepTimerRef = useRef(null);
  const rotationRef = useRef(0);

  const stopAll = useCallback(() => {
    intervalRef.current.forEach(clearInterval);
    intervalRef.current = [];
    sourcesRef.current.forEach(({ o, g }) => {
      try {
        const t = ctxRef.current?.currentTime || 0;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        o.stop(t + 1);
      } catch {}
    });
    sourcesRef.current = [];
  }, []);

  const createPanner = (ctx, x, y, z) => {
    const p = ctx.createPanner();
    p.panningModel = "HRTF";
    p.distanceModel = "inverse";
    p.refDistance = 1;
    p.maxDistance = 100;
    p.rolloffFactor = 1;
    p.coneInnerAngle = 360;
    p.coneOuterAngle = 0;
    p.coneOuterGain = 0;
    p.positionX.value = x;
    p.positionY.value = y;
    p.positionZ.value = z;
    return p;
  };

  // ── Synthetic reverb (delay network) ──
  const createReverb = (ctx, master) => {
    const input = ctx.createGain();
    const output = ctx.createGain();
    output.gain.value = 0.3;
    [0.025, 0.042, 0.063, 0.098].forEach((dt) => {
      const d = ctx.createDelay(0.15);
      const g = ctx.createGain();
      d.delayTime.value = dt;
      g.gain.value = 0.45;
      input.connect(d);
      d.connect(g);
      g.connect(output);
      g.connect(d);
    });
    output.connect(master);
    return input;
  };

  // ── Tanpura pluck with rich jawari overtones ──
  const pluckTanpura = (ctx, freq, gainVal, panner, reverbSend, when) => {
    const masterG = ctx.createGain();
    masterG.gain.setValueAtTime(0, when);
    masterG.gain.linearRampToValueAtTime(gainVal, when + 0.015);
    masterG.gain.exponentialRampToValueAtTime(gainVal * 0.5, when + 2.5);
    masterG.gain.exponentialRampToValueAtTime(0.0001, when + 7);

    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(2600, when);
    f.frequency.exponentialRampToValueAtTime(650, when + 2.5);

    const ratios = [1, 1.5, 2, 2.5, 3, 4];
    const gains  = [0.5, 0.22, 0.14, 0.08, 0.05, 0.03];
    ratios.forEach((r, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = i % 2 === 0 ? "sawtooth" : "triangle";
      o.frequency.setValueAtTime(freq * r, when);
      o.detune.setValueAtTime((Math.random() - 0.5) * 10, when);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(gains[i], when + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 5 + i * 0.4);
      o.connect(g);
      g.connect(masterG);
      o.start(when);
      o.stop(when + 7.2);
      sourcesRef.current.push({ o, g });
    });

    masterG.connect(f);
    f.connect(panner);
    f.connect(reverbSend);
    sourcesRef.current.push({ o: { stop() {} }, g: masterG });
  };

  // ── Bansuri-like flute note ──
  const playFlute = (ctx, freq, gainVal, panner, reverbSend, when, duration = 2.2) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(freq * 3.5, when);
    f.Q.setValueAtTime(4, when);

    o.type = "sawtooth";
    o.frequency.setValueAtTime(freq, when);

    // Vibrato LFO
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.setValueAtTime(5.2, when);
    lfoG.gain.setValueAtTime(18, when);
    lfo.connect(lfoG);
    lfoG.connect(o.detune);
    lfo.start(when);
    lfo.stop(when + duration);

    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gainVal, when + 0.18); // breathy attack
    g.gain.setValueAtTime(gainVal * 0.85, when + duration * 0.7);
    g.gain.linearRampToValueAtTime(0, when + duration);

    o.connect(f);
    f.connect(g);
    g.connect(panner);
    g.connect(reverbSend);
    o.start(when);
    o.stop(when + duration);
    sourcesRef.current.push({ o, g });

    // Breath noise
    if (noiseBufferRef.current) {
      const n = ctx.createBufferSource();
      n.buffer = noiseBufferRef.current;
      const ng = ctx.createGain();
      const nf = ctx.createBiquadFilter();
      nf.type = "bandpass";
      nf.frequency.setValueAtTime(freq * 1.8, when);
      nf.Q.setValueAtTime(1.2, when);
      ng.gain.setValueAtTime(0, when);
      ng.gain.linearRampToValueAtTime(gainVal * 0.18, when + 0.12);
      ng.gain.exponentialRampToValueAtTime(0.0001, when + duration * 0.5);
      n.connect(nf);
      nf.connect(ng);
      ng.connect(panner);
      ng.connect(reverbSend);
      n.start(when);
      n.stop(when + duration);
      sourcesRef.current.push({ o: n, g: ng });
    }
  };

  // ── Tabla syllables ──
  const playTablaDha = (ctx, panner, reverbSend, when) => {
    // low bass + noise
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(90, when);
    o.frequency.exponentialRampToValueAtTime(55, when + 0.12);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.28, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.45);
    o.connect(g);
    g.connect(panner);
    g.connect(reverbSend);
    o.start(when);
    o.stop(when + 0.5);
    sourcesRef.current.push({ o, g });

    if (noiseBufferRef.current) {
      const n = ctx.createBufferSource();
      n.buffer = noiseBufferRef.current;
      const ng = ctx.createGain();
      const nf = ctx.createBiquadFilter();
      nf.type = "lowpass";
      nf.frequency.setValueAtTime(900, when);
      ng.gain.setValueAtTime(0, when);
      ng.gain.linearRampToValueAtTime(0.12, when + 0.01);
      ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
      n.connect(nf);
      nf.connect(ng);
      ng.connect(panner);
      ng.connect(reverbSend);
      n.start(when);
      n.stop(when + 0.2);
      sourcesRef.current.push({ o: n, g: ng });
    }
  };

  const playTablaTi = (ctx, panner, reverbSend, when) => {
    if (!noiseBufferRef.current) return;
    const n = ctx.createBufferSource();
    n.buffer = noiseBufferRef.current;
    const ng = ctx.createGain();
    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.setValueAtTime(3200, when);
    nf.Q.setValueAtTime(3, when);
    ng.gain.setValueAtTime(0, when);
    ng.gain.linearRampToValueAtTime(0.14, when + 0.005);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
    n.connect(nf);
    nf.connect(ng);
    ng.connect(panner);
    ng.connect(reverbSend);
    n.start(when);
    n.stop(when + 0.15);
    sourcesRef.current.push({ o: n, g: ng });
  };

  const playTablaNa = (ctx, panner, reverbSend, when) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(210, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.18, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
    o.connect(g);
    g.connect(panner);
    g.connect(reverbSend);
    o.start(when);
    o.stop(when + 0.25);
    sourcesRef.current.push({ o, g });
  };

  const playClap = (ctx, panner, reverbSend, when) => {
    if (!noiseBufferRef.current) return;
    const n = ctx.createBufferSource();
    n.buffer = noiseBufferRef.current;
    const ng = ctx.createGain();
    const nf = ctx.createBiquadFilter();
    nf.type = "highpass";
    nf.frequency.setValueAtTime(1200, when);
    ng.gain.setValueAtTime(0, when);
    ng.gain.linearRampToValueAtTime(0.16, when + 0.003);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
    n.connect(nf);
    nf.connect(ng);
    ng.connect(panner);
    ng.connect(reverbSend);
    n.start(when);
    n.stop(when + 0.08);
    sourcesRef.current.push({ o: n, g: ng });
  };

  const playGong = (ctx, panner, reverbSend, when) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.18, when + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 5);
    o.connect(g);
    g.connect(panner);
    g.connect(reverbSend);
    o.start(when);
    o.stop(when + 5.2);
    sourcesRef.current.push({ o, g });
  };

  const playBell = (ctx, panner, reverbSend, when) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(1200, when);
    f.Q.setValueAtTime(28, when);
    o.type = "sine";
    o.frequency.setValueAtTime(880, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.06, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 3.5);
    o.connect(g);
    g.connect(f);
    f.connect(panner);
    f.connect(reverbSend);
    o.start(when);
    o.stop(when + 3.6);
    sourcesRef.current.push({ o, g });
  };

  // ── Build the world-class soundscape ──
  const buildSoundscape = useCallback((ctx, m) => {
    stopAll();
    if (!noiseBufferRef.current) noiseBufferRef.current = createNoiseBuffer(ctx);

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.32, now);
    master.connect(ctx.destination);

    const reverbSend = createReverb(ctx, master);

    const cfg = MODE_CONFIG[m] || MODE_CONFIG.shiva;
    const scale = RAGAS[cfg.raga];
    const base = cfg.root;

    // 3 main audio sources positioned around listener
    const pLeft  = createPanner(ctx, -2.5, 0, 2.5);
    const pFront = createPanner(ctx, 0, 0, 3.5);
    const pRight = createPanner(ctx, 2.5, 0, 2.5);

    // ── Drone layer (tanpura) ──
    const dronePanners = [pLeft, pFront, pRight];
    const droneInterval = cfg.tempo * 0.75; // ms between plucks

    const scheduleDrone = () => {
      if (!playing) return;
      const t = ctx.currentTime;
      // Sa, Pa, Sa' rotating through spatial positions
      const notes = [scale[0], scale[5], scale[8] || scale[0] * 2]; // Sa, Pa, Sa'
      notes.forEach((ratio, i) => {
        pluckTanpura(ctx, base * ratio, 0.14 - i * 0.02, dronePanners[i], reverbSend, t + i * (droneInterval / 3000));
      });
    };
    scheduleDrone();
    const droneTimer = setInterval(scheduleDrone, droneInterval);
    intervalRef.current.push(droneTimer);

    // ── Melody layer (bansuri) for Vishnu & Devi ──
    if (m === "vishnu" || m === "devi") {
      const melodyPanner = createPanner(ctx, 0, 1.2, 2);
      const melodyNotes = m === "vishnu"
        ? [0, 2, 4, 5, 7, 4, 2, 0] // Yaman-like phrase
        : [0, 2, 4, 5, 4, 2, 0, 0]; // Durga-like phrase

      let phraseIdx = 0;
      const nextMelody = () => {
        if (!playing) return;
        const t = ctx.currentTime;
        const noteIdx = melodyNotes[phraseIdx % melodyNotes.length];
        const freq = base * (2 ** (Math.floor(phraseIdx / 8) % 2)) * scale[noteIdx]; // octave movement
        const duration = m === "vishnu" ? 2.6 : 1.6;
        playFlute(ctx, freq, 0.11, melodyPanner, reverbSend, t, duration);
        phraseIdx++;
        const delay = m === "vishnu" ? 3200 + Math.random() * 400 : 1800 + Math.random() * 300;
        setTimeout(nextMelody, delay);
      };
      nextMelody();
    }

    // ── Percussion / accents ──
    if (m === "shiva") {
      // Occasional bell strikes + deep gong
      const bellTimer = setInterval(() => {
        if (!playing) return;
        const t = ctx.currentTime;
        if (Math.random() < 0.35) playBell(ctx, pRight, reverbSend, t);
        if (Math.random() < 0.12) playGong(ctx, pLeft, reverbSend, t + 0.5);
      }, 5000);
      intervalRef.current.push(bellTimer);
    } else if (m === "vishnu") {
      // Teentaal-like tabla pattern: Dha Dhi Na Na | Ti Na Dhi Na
      let beat = 0;
      const pattern = [
        () => playTablaDha(ctx, pLeft, reverbSend, ctx.currentTime),
        () => playTablaTi(ctx, pLeft, reverbSend, ctx.currentTime),
        () => playTablaNa(ctx, pRight, reverbSend, ctx.currentTime),
        () => playTablaNa(ctx, pRight, reverbSend, ctx.currentTime),
        () => playTablaTi(ctx, pLeft, reverbSend, ctx.currentTime),
        () => playTablaNa(ctx, pRight, reverbSend, ctx.currentTime),
        () => playTablaDhi ? playTablaTi(ctx, pLeft, reverbSend, ctx.currentTime) : null,
        () => playTablaNa(ctx, pRight, reverbSend, ctx.currentTime),
      ];
      const tablaTimer = setInterval(() => {
        if (!playing) return;
        const fn = pattern[beat % pattern.length];
        if (fn) fn();
        beat++;
      }, cfg.tempo * 0.35); // ~16th notes at tempo
      intervalRef.current.push(tablaTimer);
    } else if (m === "devi") {
      // Clap / kartaal rhythm on 8-beat cycle
      let beat = 0;
      const clapTimer = setInterval(() => {
        if (!playing) return;
        const t = ctx.currentTime;
        const accents = [0, 2, 4, 6]; // strong beats
        if (accents.includes(beat % 8)) {
          playClap(ctx, pFront, reverbSend, t);
          if (Math.random() < 0.4) playClap(ctx, pRight, reverbSend, t + 0.08);
        } else if (Math.random() < 0.35) {
          playClap(ctx, pRight, reverbSend, t);
        }
        // occasional wind chime
        if (Math.random() < 0.15) {
          const n = ctx.createOscillator();
          const g = ctx.createGain();
          n.type = "sine";
          n.frequency.setValueAtTime(1200 + Math.random() * 300, t);
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.04, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
          n.connect(g);
          g.connect(pFront);
          g.connect(reverbSend);
          n.start(t);
          n.stop(t + 1.3);
          sourcesRef.current.push({ o: n, g });
        }
        beat++;
      }, cfg.tempo * 0.45);
      intervalRef.current.push(clapTimer);
    }

    // Store panner references for rotation on step
    sourcesRef.current.panners = [pLeft, pFront, pRight];
  }, [playing, stopAll]);

  const togglePlay = () => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume().catch(() => {});
    }
    setPlaying((p) => !p);
  };

  useEffect(() => {
    if (!ctxRef.current) return;
    if (playing) {
      buildSoundscape(ctxRef.current, mode);
    } else {
      stopAll();
    }
  }, [playing, mode, buildSoundscape, stopAll]);

  // Step detection via devicemotion
  useEffect(() => {
    let lastAcc = 0;
    let lastStep = 0;
    const onMotion = (e) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      const now = Date.now();
      if (mag > 12 && mag - lastAcc > 4 && now - lastStep > 600) {
        lastStep = now;
        setStepCount((c) => c + 1);
        setProgress((p) => {
          const np = Math.min(100, p + 2);
          const dirIdx = Math.floor((np / 100) * DIRECTIONS.length) % DIRECTIONS.length;
          setFacing(`Facing ${DIRECTIONS[dirIdx]}`);
          return np;
        });
        // Rotate audio field slightly
        rotationRef.current += 0.12;
        sourcesRef.current.panners?.forEach((panner) => {
          try {
            const t = ctxRef.current?.currentTime || 0;
            const x = panner.positionX.value;
            const z = panner.positionZ.value;
            const angle = 0.12;
            const nx = x * Math.cos(angle) - z * Math.sin(angle);
            const nz = x * Math.sin(angle) + z * Math.cos(angle);
            panner.positionX.setTargetAtTime(nx, t, 0.3);
            panner.positionZ.setTargetAtTime(nz, t, 0.3);
          } catch {}
        });
        if (hasMotion === null) setHasMotion(true);
      }
      lastAcc = mag;
    };
    window.addEventListener("devicemotion", onMotion);
    const t = setTimeout(() => { if (hasMotion === null) setHasMotion(false); }, 2500);
    return () => { window.removeEventListener("devicemotion", onMotion); clearTimeout(t); };
  }, [hasMotion]);

  const tapStep = () => {
    setStepCount((c) => c + 1);
    setProgress((p) => {
      const np = Math.min(100, p + 2);
      const dirIdx = Math.floor((np / 100) * DIRECTIONS.length) % DIRECTIONS.length;
      setFacing(`Facing ${DIRECTIONS[dirIdx]}`);
      return np;
    });
    rotationRef.current += 0.12;
    sourcesRef.current.panners?.forEach((panner) => {
      try {
        const t = ctxRef.current?.currentTime || 0;
        const x = panner.positionX.value;
        const z = panner.positionZ.value;
        const angle = 0.12;
        const nx = x * Math.cos(angle) - z * Math.sin(angle);
        const nz = x * Math.sin(angle) + z * Math.cos(angle);
        panner.positionX.setTargetAtTime(nx, t, 0.3);
        panner.positionZ.setTargetAtTime(nz, t, 0.3);
      } catch {}
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: "22px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onBack} style={{
          width: 44, height: 44, borderRadius: 14, background: C.glass, border: `1px solid ${C.div}`,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          color: C.cream, fontSize: 20,
        }}>←</button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.cream }}>Sacred Walks</h1>
          <p style={{ fontSize: 12, color: C.textD, marginTop: 2 }}>Spatial Audio Pradakṣiṇa</p>
        </div>
      </div>

      {/* Mode selector */}
      <div style={{ display: "flex", gap: 10, padding: "0 24px 18px", overflowX: "auto" }}>
        {[
          { key: "shiva", label: "Shiva", icon: "☽" },
          { key: "vishnu", label: "Vishnu", icon: "☸" },
          { key: "devi", label: "Devi", icon: "✦" },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            style={{
              padding: "10px 18px", borderRadius: 99, fontSize: 13, fontWeight: 700,
              background: mode === m.key ? C.saffron : C.card, color: mode === m.key ? "#fff" : C.cream,
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              boxShadow: mode === m.key ? "0 4px 18px rgba(212,133,60,0.35)" : "none",
            }}
          >
            <span>{m.icon}</span> {m.label}
          </button>
        ))}
      </div>

      {/* Circular progress */}
      <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 22px" }}>
        <div style={{ position: "relative", width: 220, height: 220 }}>
          <svg width={220} height={220} style={{ transform: "rotate(-90deg)" }}>
            <circle cx="110" cy="110" r="96" fill="none" stroke={C.div} strokeWidth="10" />
            <circle
              cx="110" cy="110" r="96" fill="none" stroke={C.saffron} strokeWidth="10"
              strokeDasharray={2 * Math.PI * 96}
              strokeDashoffset={2 * Math.PI * 96 * (1 - progress / 100)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset .4s ease" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: C.cream }}>{Math.round(progress)}%</div>
            <div style={{ fontSize: 12, color: C.textD, marginTop: 4 }}>{facing}</div>
            <div style={{ fontSize: 11, color: C.gold, marginTop: 6 }}>{stepCount} steps</div>
          </div>
        </div>
      </div>

      {/* Play / Pause */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <button
          onClick={togglePlay}
          style={{
            width: 72, height: 72, borderRadius: "50%",
            background: playing ? C.gold : C.saffron, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 6px 28px ${playing ? "rgba(196,162,78,0.45)" : "rgba(212,133,60,0.45)"}`,
          }}
        >
          {playing ? (
            <svg width="24" height="24" fill="#fff" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ) : (
            <svg width="24" height="24" fill="#fff" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
          )}
        </button>
      </div>

      {/* Hint */}
      <div style={{ textAlign: "center", fontSize: 12, color: C.textD, padding: "0 24px" }}>
        {hasMotion === false ? (
          <span>Accelerometer not available. <button onClick={tapStep} style={{ background: "none", border: "none", color: C.saffron, fontWeight: 700, cursor: "pointer" }}>Tap to step</button></span>
        ) : (
          <span>Walk with headphones for 3D audio. Each step rotates the sacred field.</span>
        )}
      </div>

      {/* Tap step button for manual fallback */}
      {hasMotion === false && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <button
            onClick={tapStep}
            style={{
              padding: "12px 28px", borderRadius: 99, background: C.card, border: `1px solid ${C.div}`,
              color: C.cream, fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >Tap to Step</button>
        </div>
      )}

      {/* 3D source indicators */}
      <div style={{ margin: "28px 24px 0", padding: 18, borderRadius: 20, background: C.card, border: `1px solid ${C.div}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textD, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Audio Sources</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(212,133,60,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 18 }}>🎻</div>
            <div style={{ fontSize: 11, color: C.cream }}>Drone</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(212,133,60,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 20 }}>🎵</div>
            <div style={{ fontSize: 11, color: C.cream, fontWeight: 700 }}>{mode === "shiva" ? "Gong" : "Melody"}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(212,133,60,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 18 }}>🥁</div>
            <div style={{ fontSize: 11, color: C.cream }}>{mode === "shiva" ? "Bell" : mode === "vishnu" ? "Tabla" : "Clap"}</div>
          </div>
        </div>
      </div>

      {/* Headphone hint */}
      <div style={{ margin: "18px 24px 0", padding: 14, borderRadius: 16, background: "rgba(196,162,78,0.08)", border: "1px solid rgba(196,162,78,0.18)", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 18 }}>🎧</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>Best with headphones</div>
          <div style={{ fontSize: 11, color: C.textD, marginTop: 2 }}>HRTF spatial panning requires stereo separation.</div>
        </div>
      </div>
    </div>
  );
}
