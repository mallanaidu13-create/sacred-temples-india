import { useState, useEffect, useRef, useCallback } from "react";

const hsl = (h, s, l, a) => a != null ? `hsla(${h},${s}%,${l}%,${a})` : `hsl(${h},${s}%,${l}%)`;

const CDark = {
  bg: "#1A1109", saffron: "#D4853C", gold: "#C4A24E", cream: "#F2E8D4", text: "#EDE4D4",
  card: "#241A10", div: "rgba(255,255,255,0.07)", glass: "rgba(26,17,9,0.78)"
};

const DEITIES = {
  shiva: { name: "Shiva Lingam", sk: "शिवलिङ्ग", hue: 350 },
  vishnu: { name: "Lord Vishnu", sk: "विष्णु", hue: 215 },
  devi: { name: "Sri Yantra", sk: "श्रीयन्त्र", hue: 280 },
};

export default function MandalaAR({ onBack }) {
  const [deity, setDeity] = useState("shiva");
  const [hasXR, setHasXR] = useState(false);
  const [magicWindow, setMagicWindow] = useState(false);
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [pulse, setPulse] = useState(0);
  const [flowers, setFlowers] = useState([]);
  const videoRef = useRef(null);
  const xrSessionRef = useRef(null);
  const C = CDark;

  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported("immersive-ar").then((ok) => {
        setHasXR(ok);
        if (ok) startXR();
        else startMagicWindow();
      }).catch(() => startMagicWindow());
    } else {
      startMagicWindow();
    }
    return () => {
      if (xrSessionRef.current) {
        try { xrSessionRef.current.end(); } catch {}
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startXR = async () => {
    try {
      const session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["local-floor"],
      });
      xrSessionRef.current = session;
    } catch {
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
      setOrientation({ alpha: e.alpha || 0, beta: e.beta || 0, gamma: e.gamma || 0 });
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  };

  const offerFlowers = () => {
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
  };

  const omPulse = () => setPulse((p) => p + 1);

  const rotX = Math.max(-20, Math.min(20, orientation.beta - 45));
  const rotY = Math.max(-20, Math.min(20, orientation.gamma));

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 300, overflow: "hidden" }}>
      {/* Camera background for magic window */}
      {magicWindow && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }}
        />
      )}

      {/* XR fallback gradient when no camera */}
      {!magicWindow && (
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 40%,${hsl(30,40,12)},#000)` }} />
      )}

      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          position: "absolute", top: 18, left: 18, zIndex: 310,
          width: 44, height: 44, borderRadius: 14, background: C.glass,
          border: `1px solid ${C.div}`, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", backdropFilter: "blur(12px)", color: C.cream, fontSize: 20,
        }}
      >←</button>

      {/* 3D Deity Container */}
      <div
        style={{
          position: "absolute", top: "45%", left: "50%", zIndex: 305,
          transform: `translate(-50%,-50%) perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.1)`,
          transformStyle: "preserve-3d",
          transition: "transform .2s linear",
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

        {/* Deity rendering */}
        <div style={{ width: 220, height: 220, position: "relative" }}>
          {deity === "shiva" && <ShivaLingam />}
          {deity === "vishnu" && <VishnuFigure />}
          {deity === "devi" && <DeviYantra />}
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

      {/* Bottom controls */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 310,
        padding: "24px 20px 34px", background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      }}>
        {/* Deity selector */}
        <div style={{ display: "flex", gap: 10, background: C.glass, padding: 6, borderRadius: 16, border: `1px solid ${C.div}` }}>
          {Object.entries(DEITIES).map(([key, d]) => (
            <button
              key={key}
              onClick={() => setDeity(key)}
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
        <div style={{ display: "flex", gap: 16 }}>
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
            onClick={omPulse}
            style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(196,162,78,0.9), rgba(212,133,60,0.9))",
              border: "none", cursor: "pointer", fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 24px rgba(196,162,78,0.45)",
            }}
          >ॐ</button>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: 0.5 }}>
          {hasXR ? "WebXR immersive AR active" : "Magic Window mode — hold device up"}
        </div>
      </div>

      <style>{`
        @keyframes arAuraSpin { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }
        @keyframes arOmPulse { 0% { transform: translate(-50%,-50%) scale(0.6); opacity: 0.85; } 100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; } }
        @keyframes arFlowerFall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(55vh) rotate(180deg); opacity: 0; } }
      `}</style>
    </div>
  );
}

function ShivaLingam() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 90, height: 130, borderRadius: "50% / 40%",
        background: "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.25), rgba(30,30,30,0.9) 60%)",
        boxShadow: "0 0 40px rgba(212,133,60,0.5), inset 0 0 30px rgba(0,0,0,0.8)",
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

function VishnuFigure() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {/* Spinning chakra */}
      <div style={{
        position: "absolute", width: 140, height: 140, borderRadius: "50%",
        border: "2px dashed rgba(255,220,100,0.35)",
        animation: "arAuraSpin 8s linear infinite",
      }} />
      <svg width={160} height={160} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 0 14px rgba(100,180,255,0.5))" }}>
        {/* Seated figure silhouette */}
        <ellipse cx="50" cy="85" rx="28" ry="10" fill="rgba(255,220,100,0.15)" />
        <path d="M38 85 Q38 55 50 45 Q62 55 62 85" fill="rgba(30,40,80,0.85)" stroke="rgba(120,160,255,0.6)" strokeWidth="1.5" />
        <circle cx="50" cy="40" r="10" fill="rgba(30,40,80,0.85)" stroke="rgba(120,160,255,0.6)" strokeWidth="1.5" />
        {/* Crown */}
        <path d="M42 32 L46 24 L50 28 L54 24 L58 32" fill="none" stroke="#FFD700" strokeWidth="1.5" />
        {/* Chakra disc behind right shoulder */}
        <circle cx="72" cy="55" r="12" fill="none" stroke="rgba(255,220,100,0.7)" strokeWidth="1.5" />
        <circle cx="72" cy="55" r="8" fill="none" stroke="rgba(255,220,100,0.5)" strokeWidth="1" />
      </svg>
    </div>
  );
}

function DeviYantra() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={200} height={200} viewBox="0 0 200 200" style={{ filter: "drop-shadow(0 0 18px rgba(255,100,180,0.45))" }}>
        <defs>
          <linearGradient id="ygrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,120,180,0.9)" />
            <stop offset="100%" stopColor="rgba(180,60,140,0.9)" />
          </linearGradient>
        </defs>
        {/* Outer triangle */}
        <polygon points="100,20 180,160 20,160" fill="none" stroke="url(#ygrad)" strokeWidth="2" opacity="0.9">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
        </polygon>
        {/* Inner inverted triangle */}
        <polygon points="100,170 30,50 170,50" fill="none" stroke="url(#ygrad)" strokeWidth="2" opacity="0.8">
          <animate attributeName="opacity" values="1;0.6;1" dur="3s" repeatCount="indefinite" />
        </polygon>
        {/* Bindu */}
        <circle cx="100" cy="100" r="6" fill="#FFD700">
          <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
        </circle>
        {/* Inner petals */}
        <circle cx="100" cy="100" r="28" fill="none" stroke="rgba(255,200,120,0.6)" strokeWidth="1" />
        <circle cx="100" cy="100" r="44" fill="none" stroke="rgba(255,200,120,0.45)" strokeWidth="1" />
        {/* Intersection hexagon hints */}
        <polygon points="100,50 140,80 140,120 100,150 60,120 60,80" fill="none" stroke="rgba(255,220,160,0.35)" strokeWidth="1" />
      </svg>
    </div>
  );
}
