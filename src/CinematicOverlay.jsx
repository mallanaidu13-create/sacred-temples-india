import { useState, useEffect, useRef, memo } from "react";

/**
 * CinematicOverlay — Sacred spiritual animation experience
 *
 * Layered, lightweight, performance-safe cinematic overlay that activates
 * when Om audio is playing. Layers include:
 *   1. Golden light rays from behind the hero area
 *   2. Mantra vibration pulse / aura resonance
 *   3. Graceful flower petal sprinkle falling softly
 *   4. Water ripple rings / sacred mist near the bottom
 *   5. Ambient floating dust particles
 *
 * Props:
 *   active   — boolean, true when Om audio is playing
 *   enabled  — boolean, master enable/disable (default true)
 */

// ── Petal configuration (deterministic, no randomness at render time) ──
// Generous shower of petals across the entire viewport when Om is playing
const PETAL_EMOJIS = ["🌸", "🌺", "🌼", "🪷", "🌷", "🏵️"];
const PETALS = Array.from({ length: 36 }, (_, i) => {
  const emoji = PETAL_EMOJIS[i % PETAL_EMOJIS.length];
  const left = 2 + (i * 2.7) % 96;                 // spread 2% → 98%
  const size = 10 + (i % 5) * 1.8;                 // 10–17px
  const dur = 7 + (i % 7) * 0.85;                  // 7–12s fall
  const delay = (i % 11) * 0.55;                   // staggered starts
  const drift = -26 + (i % 13) * 4.3;              // left/right sway
  const rot = -140 + (i % 9) * 35;                 // rotation
  return { emoji, left, size, dur, delay, drift, rot };
});

// ── Ambient dust particles ──
const DUST = [
  { left: 12, top: 20, size: 3,   dur: 12,  delay: 0,   driftX: 30,  driftY: -60 },
  { left: 28, top: 45, size: 2.5, dur: 14,  delay: 1.5, driftX: -20, driftY: -40 },
  { left: 55, top: 30, size: 2,   dur: 11,  delay: 3,   driftX: 15,  driftY: -50 },
  { left: 78, top: 55, size: 3,   dur: 13,  delay: 0.8, driftX: -25, driftY: -45 },
  { left: 42, top: 70, size: 2.5, dur: 15,  delay: 2.2, driftX: 18,  driftY: -55 },
  { left: 88, top: 35, size: 2,   dur: 10,  delay: 4,   driftX: -12, driftY: -35 },
  { left: 18, top: 60, size: 3,   dur: 12.5,delay: 1,   driftX: 22,  driftY: -48 },
  { left: 65, top: 15, size: 2,   dur: 14.5,delay: 3.5, driftX: -18, driftY: -42 },
];

// ── Ripple rings config ──
const RIPPLES = [
  { delay: 0,   left: 30 },
  { delay: 2,   left: 55 },
  { delay: 4,   left: 75 },
  { delay: 1.5, left: 20 },
  { delay: 3.5, left: 65 },
];

// ── Light ray angles ──
const RAYS = Array.from({ length: 12 }, (_, i) => ({
  angle: i * 30,
  opacity: 0.04 + (i % 3) * 0.02,
  width: 2 + (i % 2),
}));

const CinematicOverlay = memo(({ active = false, enabled = true }) => {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const fadeTimerRef = useRef(null);

  useEffect(() => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    if (active && enabled) {
      setFading(false);
      setVisible(true);
    } else if (visible) {
      setFading(true);
      fadeTimerRef.current = setTimeout(() => {
        setVisible(false);
        setFading(false);
      }, 1800);
    }

    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [active, enabled, visible]);

  if (!visible && !fading) return null;

  const masterOpacity = fading ? 0 : 1;

  return (
    <div
      className="cinematic-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        pointerEvents: "none",
        overflow: "hidden",
        opacity: masterOpacity,
        transition: "opacity 1.8s cubic-bezier(.4,0,.2,1)",
      }}
    >
      {/* ═══ LAYER 1: Golden Light Rays ═══ */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          height: "45%",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            height: 400,
            animation: "cine-raysRotate 90s linear infinite",
          }}
        >
          <svg width="400" height="400" viewBox="0 0 400 400" style={{ opacity: 0.6 }}>
            {RAYS.map((r, i) => {
              const a = (r.angle * Math.PI) / 180;
              const x2 = 200 + 195 * Math.cos(a);
              const y2 = 200 + 195 * Math.sin(a);
              return (
                <line
                  key={i}
                  x1="200"
                  y1="200"
                  x2={x2}
                  y2={y2}
                  stroke="rgba(240,192,96,0.65)"
                  strokeWidth={r.width}
                  opacity={r.opacity}
                  style={{
                    animation: `cine-rayPulse ${3 + (i % 4)}s ease-in-out infinite ${i * 0.3}s`,
                  }}
                />
              );
            })}
          </svg>
        </div>
        {/* Soft radial glow behind rays */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(240,192,96,0.12), rgba(212,133,60,0.04) 50%, transparent 70%)",
            filter: "blur(30px)",
            animation: "cine-auraPulse 4s ease-in-out infinite",
          }}
        />
      </div>

      {/* ═══ LAYER 2: Mantra Vibration Pulse ═══ */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {/* Expanding concentric aura rings */}
        {[0, 1, 2].map((i) => (
          <div
            key={`vib-${i}`}
            style={{
              position: "absolute",
              top: "14%",
              left: "50%",
              width: 200 + i * 60,
              height: 200 + i * 60,
              borderRadius: "50%",
              border: `1px solid rgba(240,192,96,${0.08 - i * 0.02})`,
              transform: "translate(-50%, -50%)",
              animation: `cine-vibrationRing ${3.5 + i * 0.8}s ease-in-out infinite ${i * 0.6}s`,
            }}
          />
        ))}
        {/* Subtle full-page golden vignette pulse */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 50% 15%, rgba(212,133,60,0.04), transparent 65%)",
            animation: "cine-auraPulse 5s ease-in-out infinite",
          }}
        />
      </div>

      {/* ═══ LAYER 3: Flower Petal Sprinkle ═══ */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        {PETALS.map((p, i) => (
          <div
            key={`petal-${i}`}
            style={{
              position: "absolute",
              top: "-5%",
              left: `${p.left}%`,
              fontSize: p.size,
              lineHeight: 1,
              animation: `cine-petalFall ${p.dur}s ease-in-out infinite ${p.delay}s`,
              "--cine-drift": `${p.drift}px`,
              "--cine-rot": `${p.rot}deg`,
              willChange: "transform, opacity",
            }}
          >
            {p.emoji}
          </div>
        ))}
      </div>

      {/* ═══ LAYER 4: Water Ripples & Sacred Mist ═══ */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          height: "25%",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {/* Soft mist gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(transparent 0%, rgba(212,133,60,0.02) 40%, rgba(196,162,78,0.04) 100%)",
            animation: "cine-mistBreath 8s ease-in-out infinite",
          }}
        />
        {/* Ripple rings */}
        {RIPPLES.map((r, i) => (
          <div
            key={`ripple-${i}`}
            style={{
              position: "absolute",
              bottom: "15%",
              left: `${r.left}%`,
              width: 60,
              height: 60,
              borderRadius: "50%",
              border: "1px solid rgba(196,162,78,0.12)",
              transform: "translate(-50%, 0)",
              animation: `cine-rippleExpand 4.5s ease-out infinite ${r.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ═══ LAYER 5: Ambient Floating Dust Particles ═══ */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          pointerEvents: "none",
        }}
      >
        {DUST.map((d, i) => (
          <div
            key={`dust-${i}`}
            style={{
              position: "absolute",
              left: `${d.left}%`,
              top: `${d.top}%`,
              width: d.size,
              height: d.size,
              borderRadius: "50%",
              background: "rgba(240,192,96,0.55)",
              boxShadow: `0 0 ${d.size * 3}px rgba(240,192,96,0.35)`,
              animation: `cine-dustFloat ${d.dur}s ease-in-out infinite ${d.delay}s`,
              "--cine-dx": `${d.driftX}px`,
              "--cine-dy": `${d.driftY}px`,
              willChange: "transform, opacity",
            }}
          />
        ))}
      </div>
    </div>
  );
});

CinematicOverlay.displayName = "CinematicOverlay";

export default CinematicOverlay;

/**
 * CSS keyframes to be injected into getCss().
 * Exported as a string to be concatenated.
 */
export const cinematicKeyframes = `
@keyframes cine-raysRotate{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes cine-rayPulse{0%,100%{opacity:0.3}50%{opacity:1}}
@keyframes cine-auraPulse{0%,100%{opacity:0.7;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}}
@keyframes cine-vibrationRing{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.5}50%{transform:translate(-50%,-50%) scale(1.06);opacity:1}}
@keyframes cine-petalFall{0%{transform:translateY(0) translateX(0) rotate(0deg) scale(1);opacity:0}5%{opacity:0.85}40%{opacity:0.7}85%{opacity:0.25}100%{transform:translateY(110vh) translateX(var(--cine-drift,0px)) rotate(var(--cine-rot,90deg)) scale(0.5);opacity:0}}
@keyframes cine-rippleExpand{0%{transform:translate(-50%,0) scale(0.3);opacity:0.6;border-width:1.5px}100%{transform:translate(-50%,0) scale(3);opacity:0;border-width:0.5px}}
@keyframes cine-mistBreath{0%,100%{opacity:0.6}50%{opacity:1}}
@keyframes cine-dustFloat{0%,100%{transform:translate(0,0) scale(1);opacity:0.25}25%{opacity:0.7}50%{transform:translate(var(--cine-dx,10px),var(--cine-dy,-30px)) scale(1.3);opacity:0.5}75%{opacity:0.65}100%{transform:translate(0,0) scale(1);opacity:0.25}}
`;
