import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MandalaAudioEngine } from "./mandala-ar-audio.js";

const CDark = {
  bg: "#1A1109", saffron: "#D4853C", saffronH: "#E69A52", saffronDim: "rgba(212,133,60,0.12)",
  gold: "#C4A24E", goldDim: "rgba(196,162,78,0.1)",
  cream: "#F2E8D4", text: "#EDE4D4", textM: "#A89878", textD: "#6E5E48", textDD: "#5C4E3A",
  card: "#241A10", cardH: "#2E2218", div: "rgba(255,255,255,0.07)", glass: "rgba(26,17,9,0.78)",
};

const CLight = {
  bg: "#FAFAF8", saffron: "#C4721A", saffronH: "#D4853C", saffronDim: "rgba(196,114,26,0.12)",
  gold: "#9E7A28", goldDim: "rgba(158,122,40,0.08)",
  cream: "#1A1208", text: "#1A1208", textM: "#5A3A10", textD: "#8A6030", textDD: "#B89060",
  card: "#FFFFFF", cardH: "#FBF8F3", div: "rgba(0,0,0,0.08)", glass: "rgba(250,250,248,0.88)",
};

const DEITIES = {
  shiva: { name: "Shiva Lingam", sk: "शिवलिङ्ग", hue: 350, blessing: "May Lord Shiva destroy all obstacles and bless you with stillness." },
  vishnu: { name: "Lord Vishnu", sk: "विष्णु", hue: 215, blessing: "May Lord Vishnu preserve your dharma and grant you peace." },
  devi: { name: "Sri Yantra", sk: "श्रीयन्त्र", hue: 280, blessing: "May the Divine Mother fill your life with Shakti and grace." },
};

const TIMER_OPTIONS = [1, 5, 10, 15];
const HAPTIC = (ms = 20) => { try { navigator.vibrate?.(ms); } catch {} };

export default function MandalaAR({ onBack, isDark, onToggleTheme }) {
  const C = useMemo(() => (isDark ? CDark : CLight), [isDark]);

  const [deity, setDeity] = useState("shiva");
  const [hasXR, setHasXR] = useState(false);
  const [magicWindow, setMagicWindow] = useState(false);
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 45, gamma: 0 });
  const [pulse, setPulse] = useState(0);
  const [flowers, setFlowers] = useState([]);
  const [offerings, setOfferings] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sti_mandala_offerings") || "{}"); } catch { return {}; }
  });
  const [timerMin, setTimerMin] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showBlessing, setShowBlessing] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  const videoRef = useRef(null);
  const xrSessionRef = useRef(null);
  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const targetOrientRef = useRef({ alpha: 0, beta: 45, gamma: 0 });
  const currentOrientRef = useRef({ alpha: 0, beta: 45, gamma: 0 });
  const timerRef = useRef(null);

  // Offerings persistence
  useEffect(() => {
    try { localStorage.setItem("sti_mandala_offerings", JSON.stringify(offerings)); } catch {}
  }, [offerings]);

  // Audio engine init
  useEffect(() => {
    audioRef.current = new MandalaAudioEngine();
    return () => {
      audioRef.current?.destroy();
    };
  }, []);

  // XR / Magic window camera start
  useEffect(() => {
    let cleanupOrientation = null;

    const init = async () => {
      if (navigator.xr) {
        try {
          const ok = await navigator.xr.isSessionSupported("immersive-ar");
          setHasXR(ok);
          if (ok) {
            const session = await navigator.xr.requestSession("immersive-ar", { requiredFeatures: ["local-floor"] });
            xrSessionRef.current = session;
          } else {
            startMagicWindow();
          }
        } catch {
          startMagicWindow();
        }
      } else {
        startMagicWindow();
      }
    };

    const startMagicWindow = async () => {
      setMagicWindow(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {}

      const onOrient = (e) => {
        targetOrientRef.current = {
          alpha: e.alpha || 0,
          beta: e.beta || 45,
          gamma: e.gamma || 0,
        };
      };
      window.addEventListener("deviceorientation", onOrient);
      cleanupOrientation = () => window.removeEventListener("deviceorientation", onOrient);
    };

    init();

    // Smooth orientation loop
    const smooth = () => {
      const target = targetOrientRef.current;
      const cur = currentOrientRef.current;
      const k = 0.08; // low-pass factor
      cur.alpha += (target.alpha - cur.alpha) * k;
      cur.beta += (target.beta - cur.beta) * k;
      cur.gamma += (target.gamma - cur.gamma) * k;
      setOrientation({ ...cur });
      rafRef.current = requestAnimationFrame(smooth);
    };
    rafRef.current = requestAnimationFrame(smooth);

    return () => {
      if (xrSessionRef.current) { try { xrSessionRef.current.end(); } catch {} }
      if (videoRef.current?.srcObject) { videoRef.current.srcObject.getTracks().forEach((t) => t.stop()); }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (cleanupOrientation) cleanupOrientation();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (timeLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timerMin > 0 && isPlaying) {
        // Timer just finished
        setIsPlaying(false);
        audioRef.current?.toggleDrone();
        setShowBlessing(true);
        HAPTIC([60, 40, 60]);
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft, timerMin, isPlaying]);

  const startTimer = (min) => {
    HAPTIC(20);
    setTimerMin(min);
    setTimeLeft(min * 60);
    setShowBlessing(false);
    if (!isPlaying) {
      const playing = audioRef.current?.toggleDrone();
      setIsPlaying(playing);
      setAudioReady(true);
    }
  };

  const stopTimer = () => {
    HAPTIC(15);
    setTimeLeft(0);
    setTimerMin(0);
    if (isPlaying) {
      audioRef.current?.toggleDrone();
      setIsPlaying(false);
    }
  };

  const toggleAudio = () => {
    HAPTIC(20);
    const playing = audioRef.current?.toggleDrone();
    setIsPlaying(playing);
    setAudioReady(true);
    if (!playing) {
      setTimeLeft(0);
      setTimerMin(0);
    }
  };

  const omPulse = () => {
    HAPTIC(30);
    setPulse((p) => p + 1);
    audioRef.current?.chantOm();
    if (!audioReady) {
      // Prime audio context on first user gesture
      audioRef.current?.ensureResumed();
      setAudioReady(true);
    }
  };

  const offerFlowers = () => {
    HAPTIC(25);
    const emojis = ["🌸", "🌺", "🌼", "🪷"];
    const now = Date.now();
    const next = Array.from({ length: 12 }, (_, i) => ({
      id: now + i,
      emoji: emojis[i % emojis.length],
      left: 20 + Math.random() * 60,
      delay: i * 80,
      dur: 1200 + Math.random() * 600,
    }));
    setFlowers((prev) => [...prev, ...next]);
    setTimeout(() => {
      setFlowers((prev) => prev.filter((f) => !next.find((n) => n.id === f.id)));
    }, 3000);

    setOfferings((prev) => ({
      ...prev,
      [deity]: (prev[deity] || 0) + 1,
    }));
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const rotX = Math.max(-18, Math.min(18, orientation.beta - 45));
  const rotY = Math.max(-18, Math.min(18, orientation.gamma));

  const deityInfo = DEITIES[deity];
  const currentOfferings = offerings[deity] || 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 300, overflow: "hidden", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}>
      {/* Camera background for magic window */}
      {magicWindow && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: isDark ? 0.55 : 0.35 }}
        />
      )}

      {/* Fallback gradient when no camera */}
      {!magicWindow && (
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 40%, ${isDark ? "hsl(30,40%,12%)" : "hsl(30,40%,90%)"}, ${C.bg})` }} />
      )}

      {/* Top bar */}
      <div style={{ position: "absolute", top: "env(safe-area-inset-top)", left: 0, right: 0, zIndex: 310, padding: "18px 18px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            width: 44, height: 44, borderRadius: 14, background: C.glass,
            border: `1px solid ${C.div}`, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", backdropFilter: "blur(12px)", color: C.cream, fontSize: 20,
          }}
        >←</button>

        <button onClick={onToggleTheme} style={{
          width: 40, height: 40, borderRadius: 12, background: C.glass, border: `1px solid ${C.div}`,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.cream,
          backdropFilter: "blur(12px)",
        }}>
          {isDark ? (
            <svg width="18" height="18" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg width="18" height="18" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Timer selector (top center) */}
      <div style={{ position: "absolute", top: 74, left: 0, right: 0, zIndex: 310, display: "flex", justifyContent: "center", gap: 8, padding: "0 24px" }}>
        {TIMER_OPTIONS.map((min) => (
          <button
            key={min}
            onClick={() => startTimer(min)}
            disabled={timeLeft > 0 && timerMin === min}
            style={{
              padding: "6px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: timerMin === min && timeLeft > 0 ? C.saffron : C.glass,
              color: timerMin === min && timeLeft > 0 ? "#fff" : C.cream,
              border: `1px solid ${C.div}`, cursor: "pointer",
              backdropFilter: "blur(12px)", opacity: timeLeft > 0 && timerMin !== min ? 0.6 : 1,
            }}
          >
            {min}m
          </button>
        ))}
        {timeLeft > 0 && (
          <button
            onClick={stopTimer}
            style={{
              padding: "6px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: "rgba(196,64,64,0.15)", color: isDark ? "#fca5a5" : "#dc2626",
              border: "1px solid rgba(196,64,64,0.3)", cursor: "pointer",
            }}
          >
            Stop
          </button>
        )}
      </div>

      {/* Countdown display */}
      {timeLeft > 0 && (
        <div style={{
          position: "absolute", top: 120, left: 0, right: 0, zIndex: 310,
          textAlign: "center", fontSize: 28, fontWeight: 700, color: C.cream,
          textShadow: isDark ? "0 2px 10px rgba(0,0,0,0.5)" : "0 1px 4px rgba(255,255,255,0.6)",
        }}>
          {formatTime(timeLeft)}
        </div>
      )}

      {/* 3D Deity Container */}
      <div
        style={{
          position: "absolute", top: "45%", left: "50%", zIndex: 305,
          transform: `translate(-50%,-50%) perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.1)`,
          transformStyle: "preserve-3d",
          transition: "transform .05s linear",
        }}
      >
        {/* Aura rings */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 280, height: 280, borderRadius: "50%",
          border: `2px solid ${hsl(DEITIES[deity].hue, 70, 55, 0.25)}`,
          transform: "translate(-50%,-50%)", animation: "arAuraSpin 10s linear infinite",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 340, height: 340, borderRadius: "50%",
          border: `1px dashed ${hsl(DEITIES[deity].hue, 60, 50, 0.18)}`,
          transform: "translate(-50%,-50%)", animation: "arAuraSpin 16s linear infinite reverse",
          pointerEvents: "none",
        }} />

        {/* Om pulse ring */}
        {pulse > 0 && (
          <div key={pulse} style={{
            position: "absolute", top: "50%", left: "50%",
            width: 200, height: 200, borderRadius: "50%",
            border: `3px solid ${C.gold}`,
            transform: "translate(-50%,-50%)",
            animation: "arOmPulse 1.2s ease-out both",
            pointerEvents: "none",
          }} />
        )}

        {/* Breathing glow behind deity */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 240, height: 240, borderRadius: "50%",
          background: `radial-gradient(circle, ${hsl(DEITIES[deity].hue, 60, 50, 0.15)} 0%, transparent 70%)`,
          transform: "translate(-50%,-50%)",
          animation: "arBreath 4s ease-in-out infinite",
          pointerEvents: "none",
        }} />

        {/* Deity rendering */}
        <div style={{ width: 220, height: 220, position: "relative" }}>
          {deity === "shiva" && <ShivaLingam isDark={isDark} />}
          {deity === "vishnu" && <VishnuFigure isDark={isDark} />}
          {deity === "devi" && <DeviYantra isDark={isDark} />}
        </div>
      </div>

      {/* Falling flowers */}
      {flowers.map((f) => (
        <div
          key={f.id}
          style={{
            position: "absolute", top: "10%", left: `${f.left}%`, zIndex: 306,
            fontSize: 24, pointerEvents: "none",
            animation: `arFlowerFall ${f.dur}ms ease-in forwards`,
            animationDelay: `${f.delay}ms`,
          }}
        >
          {f.emoji}
        </div>
      ))}

      {/* Offerings counter */}
      {currentOfferings > 0 && (
        <div style={{
          position: "absolute", top: "72%", left: 0, right: 0, zIndex: 306,
          textAlign: "center", fontSize: 13, color: C.gold, fontWeight: 600,
          textShadow: isDark ? "0 1px 6px rgba(0,0,0,0.6)" : "0 1px 4px rgba(255,255,255,0.6)",
        }}>
          {currentOfferings} {currentOfferings === 1 ? "flower" : "flowers"} offered to {DEITIES[deity].name}
        </div>
      )}

      {/* Bottom controls */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 310,
        padding: "24px 20px calc(34px + env(safe-area-inset-bottom))", background: isDark ? "linear-gradient(transparent, rgba(0,0,0,0.85))" : "linear-gradient(transparent, rgba(250,250,248,0.85))",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      }}>
        {/* Deity selector */}
        <div style={{ display: "flex", gap: 10, background: C.glass, padding: 6, borderRadius: 16, border: `1px solid ${C.div}` }}>
          {Object.entries(DEITIES).map(([key, d]) => (
            <button
              key={key}
              onClick={() => { HAPTIC(10); setDeity(key); }}
              style={{
                padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700,
                background: deity === key ? `hsl(${d.hue},60%,35%)` : "transparent",
                color: deity === key ? "#fff" : C.cream, border: "none", cursor: "pointer",
              }}
            >
              {d.name}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button
            onClick={offerFlowers}
            style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(212,133,60,0.9), rgba(196,162,78,0.9))",
              border: "none", cursor: "pointer", fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 24px rgba(212,133,60,0.45)",
            }}
          >🌸</button>

          <button
            onClick={toggleAudio}
            title={isPlaying ? "Stop drone" : "Start drone"}
            style={{
              width: 72, height: 72, borderRadius: "50%",
              background: isPlaying
                ? "linear-gradient(135deg, rgba(74,222,128,0.9), rgba(34,197,94,0.9))"
                : "linear-gradient(135deg, rgba(196,162,78,0.9), rgba(212,133,60,0.9))",
              border: "none", cursor: "pointer", fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: isPlaying ? "0 6px 24px rgba(74,222,128,0.45)" : "0 6px 24px rgba(196,162,78,0.45)",
              transition: "all .3s",
            }}
          >
            {isPlaying ? "⏹" : "🎵"}
          </button>

          <button
            onClick={omPulse}
            style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(196,162,78,0.9), rgba(212,133,60,0.9))",
              border: "none", cursor: "pointer", fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 24px rgba(196,162,78,0.45)",
            }}
          >ॐ</button>
        </div>

        <div style={{ fontSize: 11, color: C.textD, letterSpacing: 0.5, textAlign: "center" }}>
          {hasXR ? "WebXR immersive AR active" : "Magic Window mode — hold device up"}
          {isPlaying && <div style={{ marginTop: 4, color: C.gold }}>Generative sacred audio playing</div>}
        </div>
      </div>

      {/* Blessing modal */}
      {showBlessing && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 320,
          background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }} onClick={() => setShowBlessing(false)}>
          <div style={{
            maxWidth: 320, padding: 24, borderRadius: 22,
            background: C.card, border: `1px solid ${C.div}`, textAlign: "center",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🙏</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.cream, marginBottom: 10, fontFamily: "'Noto Serif Devanagari', serif" }}>
              {deityInfo.blessing}
            </div>
            {currentOfferings > 0 && (
              <div style={{ fontSize: 12, color: C.gold, marginBottom: 14 }}>
                You offered {currentOfferings} {currentOfferings === 1 ? "flower" : "flowers"} during this darshan.
              </div>
            )}
            <button
              onClick={() => setShowBlessing(false)}
              style={{
                padding: "10px 22px", borderRadius: 99, background: C.saffron,
                color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              Receive Blessing
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes arAuraSpin { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }
        @keyframes arOmPulse { 0% { transform: translate(-50%,-50%) scale(0.6); opacity: 0.85; } 100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; } }
        @keyframes arFlowerFall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(55vh) rotate(180deg); opacity: 0; } }
        @keyframes arBreath { 0%, 100% { transform: translate(-50%,-50%) scale(1); opacity: 0.6; } 50% { transform: translate(-50%,-50%) scale(1.15); opacity: 1; } }
      `}</style>
    </div>
  );
}

function hsl(h, s, l, a) { return a != null ? `hsla(${h},${s}%,${l}%,${a})` : `hsl(${h},${s}%,${l}%)`; }

function ShivaLingam({ isDark }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 90, height: 130, borderRadius: "50% / 40%",
        background: "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.25), rgba(30,30,30,0.9) 60%)",
        boxShadow: `0 0 40px rgba(212,133,60,0.5), inset 0 0 30px rgba(0,0,0,0.8)`,
        position: "relative",
      }}>
        <div style={{
          position: "absolute", top: "18%", left: "50%", transform: "translateX(-50%)",
          fontSize: 28, color: "#FFD700", textShadow: "0 0 12px rgba(255,215,0,0.8)", fontFamily: "'Noto Serif Devanagari', serif",
        }}>ॐ</div>
      </div>
    </div>
  );
}

function VishnuFigure({ isDark }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{
        position: "absolute", width: 140, height: 140, borderRadius: "50%",
        border: "2px dashed rgba(255,220,100,0.35)",
        animation: "arAuraSpin 8s linear infinite",
      }} />
      <svg width={160} height={160} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 0 14px rgba(100,180,255,0.5))" }}>
        <ellipse cx="50" cy="85" rx="28" ry="10" fill="rgba(255,220,100,0.15)" />
        <path d="M38 85 Q38 55 50 45 Q62 55 62 85" fill={isDark ? "rgba(30,40,80,0.85)" : "rgba(200,220,255,0.85)"} stroke="rgba(120,160,255,0.6)" strokeWidth="1.5" />
        <circle cx="50" cy="40" r="10" fill={isDark ? "rgba(30,40,80,0.85)" : "rgba(200,220,255,0.85)"} stroke="rgba(120,160,255,0.6)" strokeWidth="1.5" />
        <path d="M42 32 L46 24 L50 28 L54 24 L58 32" fill="none" stroke="#FFD700" strokeWidth="1.5" />
        <circle cx="72" cy="55" r="12" fill="none" stroke="rgba(255,220,100,0.7)" strokeWidth="1.5" />
        <circle cx="72" cy="55" r="8" fill="none" stroke="rgba(255,220,100,0.5)" strokeWidth="1" />
      </svg>
    </div>
  );
}

function DeviYantra({ isDark }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={200} height={200} viewBox="0 0 200 200" style={{ filter: "drop-shadow(0 0 18px rgba(255,100,180,0.45))" }}>
        <defs>
          <linearGradient id="ygrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,120,180,0.9)" />
            <stop offset="100%" stopColor="rgba(180,60,140,0.9)" />
          </linearGradient>
        </defs>
        <polygon points="100,20 180,160 20,160" fill="none" stroke="url(#ygrad)" strokeWidth="2" opacity="0.9">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
        </polygon>
        <polygon points="100,170 30,50 170,50" fill="none" stroke="url(#ygrad)" strokeWidth="2" opacity="0.8">
          <animate attributeName="opacity" values="1;0.6;1" dur="3s" repeatCount="indefinite" />
        </polygon>
        <circle cx="100" cy="100" r="6" fill="#FFD700">
          <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="100" cy="100" r="28" fill="none" stroke="rgba(255,200,120,0.6)" strokeWidth="1" />
        <circle cx="100" cy="100" r="44" fill="none" stroke="rgba(255,200,120,0.45)" strokeWidth="1" />
        <polygon points="100,50 140,80 140,120 100,150 60,120 60,80" fill="none" stroke="rgba(255,220,160,0.35)" strokeWidth="1" />
      </svg>
    </div>
  );
}
