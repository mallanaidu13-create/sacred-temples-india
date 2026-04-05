import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  bg: "#1A1109", saffron: "#D4853C", gold: "#C4A24E", cream: "#F2E8D4", text: "#EDE4D4",
  card: "#241A10", div: "rgba(255,255,255,0.07)", glass: "rgba(26,17,9,0.78)", textD: "#6E5E48",
};

const DIRECTIONS = ["North Gate", "North-East", "East Gate", "South-East", "South Gate", "South-West", "West Gate", "North-West"];

export default function SpatialAudio({ onBack }) {
  const [mode, setMode] = useState("shiva");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [facing, setFacing] = useState("Facing North Gate");
  const [stepCount, setStepCount] = useState(0);
  const [hasMotion, setHasMotion] = useState(null);
  const ctxRef = useRef(null);
  const sourcesRef = useRef([]);
  const intervalRef = useRef(null);
  const stepTimerRef = useRef(null);

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
    p.orientationX.value = 0;
    p.orientationY.value = 0;
    p.orientationZ.value = 1;
    return p;
  };

  const buildSoundscape = useCallback((ctx, m) => {
    // Clear previous
    sourcesRef.current.forEach(({ o, g }) => { try { o.stop(); g.disconnect(); } catch {} });
    sourcesRef.current = [];

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.25, now);
    master.connect(ctx.destination);

    const configs = {
      shiva: [
        // Low drone left
        { type: "sawtooth", freq: 55, x: -3, y: 0, z: 2, gain: 0.18, detune: 0 },
        { type: "sine", freq: 110, x: 0, y: 0, z: 3, gain: 0.14, detune: 2 },
        // Bell right
        { type: "sine", freq: 880, x: 3, y: 1, z: 2, gain: 0.06, detune: 5 },
      ],
      vishnu: [
        { type: "sine", freq: 196, x: -2, y: 0, z: 3, gain: 0.12, detune: 0 },
        { type: "triangle", freq: 293.66, x: 2, y: 0.5, z: 3, gain: 0.10, detune: 3 },
        { type: "sine", freq: 146.83, x: 0, y: -1, z: 4, gain: 0.08, detune: -2 },
      ],
      devi: [
        { type: "sawtooth", freq: 261.63, x: -2.5, y: 0, z: 3, gain: 0.12, detune: 0 },
        { type: "square", freq: 329.63, x: 2.5, y: 0, z: 3, gain: 0.08, detune: 4 },
        { type: "sine", freq: 523.25, x: 0, y: 1.5, z: 2, gain: 0.07, detune: -3 },
      ],
    };

    const list = configs[m] || configs.shiva;
    list.forEach((cfg) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = cfg.type;
      o.frequency.setValueAtTime(cfg.freq, now);
      o.detune.setValueAtTime(cfg.detune, now);
      const panner = createPanner(ctx, cfg.x, cfg.y, cfg.z);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(cfg.gain, now + 2);
      o.connect(g);
      g.connect(panner);
      panner.connect(master);
      o.start(now);
      sourcesRef.current.push({ o, g, panner, cfg });
    });

    // Listener at center
    if (ctx.listener.positionX) {
      ctx.listener.positionX.setValueAtTime(0, now);
      ctx.listener.positionY.setValueAtTime(0, now);
      ctx.listener.positionZ.setValueAtTime(0, now);
    }

    // Synthetic ambience extras
    if (m === "shiva") {
      // Occasional bell strikes
      const bell = () => {
        if (!playing) return;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.setValueAtTime(1200, t);
        f.Q.setValueAtTime(25, t);
        o.type = "sine";
        o.frequency.setValueAtTime(880, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.04, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
        o.connect(g);
        g.connect(f);
        f.connect(master);
        o.start(t);
        o.stop(t + 2.6);
      };
      intervalRef.current = setInterval(() => { if (Math.random() < 0.35) bell(); }, 4000);
    } else if (m === "vishnu") {
      // Soft gong
      const gong = () => {
        if (!playing) return;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(150, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + 4);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + 4.2);
      };
      intervalRef.current = setInterval(() => { if (Math.random() < 0.25) gong(); }, 7000);
    } else if (m === "devi") {
      // Wind chimes
      const chime = () => {
        if (!playing) return;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(1046.5 + Math.random() * 200, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.03, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + 1.6);
      };
      intervalRef.current = setInterval(() => { if (Math.random() < 0.4) chime(); }, 2500);
    }
  }, [playing]);

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
      sourcesRef.current.forEach(({ o, g }) => {
        try {
          const t = ctxRef.current.currentTime;
          g.gain.cancelScheduledValues(t);
          g.gain.setValueAtTime(g.gain.value, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
          o.stop(t + 1.3);
        } catch {}
      });
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
  }, [playing, mode, buildSoundscape]);

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
        sourcesRef.current.forEach(({ panner }) => {
          try {
            const t = ctxRef.current?.currentTime || 0;
            const x = panner.positionX.value;
            const z = panner.positionZ.value;
            const angle = 0.08;
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
    sourcesRef.current.forEach(({ panner }) => {
      try {
        const t = ctxRef.current?.currentTime || 0;
        const x = panner.positionX.value;
        const z = panner.positionZ.value;
        const angle = 0.08;
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
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(212,133,60,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 18 }}>🔊</div>
            <div style={{ fontSize: 11, color: C.cream }}>Left</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(212,133,60,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 20 }}>🔊</div>
            <div style={{ fontSize: 11, color: C.cream, fontWeight: 700 }}>Front</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(212,133,60,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 18 }}>🔊</div>
            <div style={{ fontSize: 11, color: C.cream }}>Right</div>
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
