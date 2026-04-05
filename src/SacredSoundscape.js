// Sacred Soundscapes — Generative Mantra Music
// Maps current Panchangam limb to a generative musical mode using Web Audio API

import { useEffect, useRef, useCallback } from "react";

const NAKSHATRA_ROOTS = [
  261.63, // C  - Ashwini
  277.18, // C# - Bharani
  293.66, // D  - Krittika
  311.13, // D# - Rohini
  329.63, // E  - Mrigashira
  349.23, // F  - Ardra
  369.99, // F# - Punarvasu
  392.00, // G  - Pushya
  415.30, // G# - Ashlesha
  440.00, // A  - Magha
  466.16, // A# - Purva Phalguni
  493.88, // B  - Uttara Phalguni
  523.25, // C  - Hasta
  277.18, // C# - Chitra
  293.66, // D  - Swati
  311.13, // D# - Vishakha
  329.63, // E  - Anuradha
  349.23, // F  - Jyeshtha
  369.99, // F# - Mula
  392.00, // G  - Purva Ashadha
  415.30, // G# - Uttara Ashadha
  440.00, // A  - Shravana
  466.16, // A# - Dhanishta
  493.88, // B  - Shatabhisha
  523.25, // C  - Purva Bhadrapada
  277.18, // C# - Uttara Bhadrapada
  293.66, // D  - Revati
];

// Indian-scale intervals (just-intonation-ish ratios for mood)
const SCALE_RATIOS = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2]; // Sa, Re, Ga, Ma, Pa, Dha, Ni, Sa

function createOsc(ctx, type, freq, gainVal, when, duration) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gainVal, when + duration * 0.25);
  g.gain.exponentialRampToValueAtTime(gainVal * 0.6, when + duration);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(when);
  return { o, g };
}

export function useSacredSoundscape({ enabled, panchangam, volume = 0.2 }) {
  const ctxRef = useRef(null);
  const nodesRef = useRef([]);
  const intervalRef = useRef(null);
  const modeRef = useRef("default");

  const stopAll = useCallback(() => {
    const now = ctxRef.current?.currentTime || 0;
    nodesRef.current.forEach(({ g, o }) => {
      try {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        o.stop(now + 1.6);
      } catch {}
    });
    nodesRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const detectMode = useCallback(() => {
    if (!panchangam) return "default";
    const tithi = panchangam.tithiNum ?? 1;
    const festivals = panchangam.festivals || [];
    const isEvening = () => {
      const h = new Date().getHours();
      return h >= 17;
    };
    if ((tithi === 12 || tithi === 13) && isEvening()) return "pradosham";
    if (tithi === 9 || tithi === 10) return "navami";
    if (festivals.some((f) => f.id === "krishna-janmashtami" || f.names?.en?.toLowerCase().includes("janmashtami"))) {
      return "janmashtami";
    }
    return "default";
  }, [panchangam]);

  const playMode = useCallback((mode) => {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    stopAll();

    const nakIdx = panchangam?.nakshatraIdx ?? 0;
    const base = NAKSHATRA_ROOTS[nakIdx % NAKSHATRA_ROOTS.length] * (432 / 440); // tune to ~432
    const now = ctx.currentTime;

    const modeConfigs = {
      pradosham: {
        oscs: ["sine", "triangle", "sine"],
        freqMul: [1, 1.5, 0.5],
        gains: [volume * 0.8, volume * 0.35, volume * 0.5],
        rhythm: 8000,
      },
      navami: {
        oscs: ["sine", "sine", "triangle"],
        freqMul: [1, 1.25, 1.5],
        gains: [volume * 0.7, volume * 0.5, volume * 0.4],
        rhythm: 6000,
      },
      janmashtami: {
        oscs: ["sine", "sine", "sine"],
        freqMul: [1, 1.125, 1.25],
        gains: [volume * 0.6, volume * 0.5, volume * 0.5],
        rhythm: 5000,
      },
      default: {
        oscs: ["sine", "triangle", "sine"],
        freqMul: [1, 1.5, 2],
        gains: [volume * 0.7, volume * 0.3, volume * 0.25],
        rhythm: 10000,
      },
    };

    const cfg = modeConfigs[mode] || modeConfigs.default;

    // Start drones
    cfg.oscs.forEach((type, i) => {
      const freq = base * cfg.freqMul[i];
      const { o, g } = createOsc(ctx, type, freq, cfg.gains[i], now, 3);
      nodesRef.current.push({ o, g });
    });

    // Slowly evolving chord progression
    intervalRef.current = setInterval(() => {
      if (!ctxRef.current) return;
      const t = ctxRef.current.currentTime;
      const chordIndex = Math.floor(Math.random() * 3);
      const ratios = [SCALE_RATIOS[chordIndex], SCALE_RATIOS[chordIndex + 2], SCALE_RATIOS[chordIndex + 4]];
      ratios.forEach((r, idx) => {
        const freq = base * r;
        const gainVal = volume * 0.15 * (1 - idx * 0.15);
        const { o, g } = createOsc(ctx, "sine", freq, gainVal, t, 6);
        nodesRef.current.push({ o, g });
        // Auto cleanup after 12s
        setTimeout(() => {
          try {
            g.gain.cancelScheduledValues(ctx.currentTime);
            g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
            o.stop(ctx.currentTime + 2.2);
          } catch {}
        }, 12000);
      });
    }, cfg.rhythm);
  }, [panchangam, volume, stopAll]);

  useEffect(() => {
    if (!enabled) {
      stopAll();
      return;
    }
    // Initialize audio context on user interaction usually; here we attempt
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctxRef.current = new AC();
    }
    if (ctxRef.current?.state === "suspended") {
      ctxRef.current.resume().catch(() => {});
    }
    const mode = detectMode();
    if (mode !== modeRef.current || nodesRef.current.length === 0) {
      modeRef.current = mode;
      playMode(mode);
    }
    return () => stopAll();
  }, [enabled, detectMode, playMode, stopAll]);

  return { mode: modeRef.current };
}
