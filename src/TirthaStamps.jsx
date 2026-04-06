import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useGeo, haversineKm } from "./useGeo.js";
import {
  TIRTHA_CIRCUITS,
  getStampArt,
  gregorianToVikramSamvat,
  getCircuitCompletion,
  getOverallCompletion,
} from "./tirtha-data.js";

const CDark = {
  bg: "#1A1109", saffron: "#D4853C", saffronDim: "rgba(212,133,60,0.12)",
  gold: "#C4A24E", goldDim: "rgba(196,162,78,0.1)",
  cream: "#F2E8D4", text: "#EDE4D4", textM: "#A89878", textD: "#6E5E48", textDD: "#5C4E3A",
  card: "#241A10", cardH: "#2E2218", div: "rgba(255,255,255,0.07)", glass: "rgba(26,17,9,0.78)",
  good: "#4ade80",
};

const CLight = {
  bg: "#FAFAF8", saffron: "#C4721A", saffronDim: "rgba(196,114,26,0.12)",
  gold: "#9E7A28", goldDim: "rgba(158,122,40,0.08)",
  cream: "#1A1208", text: "#1A1208", textM: "#5A3A10", textD: "#8A6030", textDD: "#B89060",
  card: "#FFFFFF", cardH: "#FBF8F3", div: "rgba(0,0,0,0.08)", glass: "rgba(250,250,248,0.88)",
  good: "#16a34a",
};

const CLAIM_KEY = "sti_tirtha_claims";
const HAPTIC = (ms = 20) => { try { navigator.vibrate?.(ms); } catch {} };

export default function TirthaStamps({ onBack, isDark, onToggleTheme }) {
  const C = useMemo(() => (isDark ? CDark : CLight), [isDark]);
  const geo = useGeo();

  const [activeCircuit, setActiveCircuit] = useState(TIRTHA_CIRCUITS[0].id);
  const [claims, setClaims] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CLAIM_KEY) || "[]"); } catch { return []; }
  });
  const [shareId, setShareId] = useState(null);
  const canvasRef = useRef(null);

  // Persist claims
  useEffect(() => {
    try { localStorage.setItem(CLAIM_KEY, JSON.stringify(claims)); } catch {}
  }, [claims]);

  const overall = useMemo(() => getOverallCompletion(claims), [claims]);
  const circuitCompletion = useMemo(() => getCircuitCompletion(activeCircuit, claims), [activeCircuit, claims]);

  const isClaimed = (templeId) => claims.some((c) => c.templeId === templeId);

  const canClaim = (temple) => {
    if (!geo.effectiveLocation || temple.lat == null || temple.lng == null) return false;
    const d = haversineKm(geo.effectiveLocation.latitude, geo.effectiveLocation.longitude, temple.lat, temple.lng);
    return d * 1000 <= 5000; // 5km for broader claim radius (pilgrimages are large areas)
  };

  const distanceTo = (temple) => {
    if (!geo.effectiveLocation || temple.lat == null || temple.lng == null) return null;
    const d = haversineKm(geo.effectiveLocation.latitude, geo.effectiveLocation.longitude, temple.lat, temple.lng);
    if (d < 1) return `${Math.round(d * 1000)}m`;
    if (d < 100) return `${d.toFixed(1)}km`;
    return `${Math.round(d)}km`;
  };

  const claim = (circuit, temple) => {
    if (isClaimed(temple.id)) return;
    HAPTIC(30);
    const entry = {
      templeId: temple.id,
      circuitId: circuit.id,
      date: new Date().toISOString(),
      lat: geo.effectiveLocation?.latitude || null,
      lng: geo.effectiveLocation?.longitude || null,
    };
    const next = [...claims, entry];
    setClaims(next);
  };

  const unclaim = (templeId) => {
    HAPTIC(15);
    const next = claims.filter((c) => c.templeId !== templeId);
    setClaims(next);
  };

  const generateStampPng = useCallback((circuit, temple) => {
    const art = getStampArt(temple, circuit.colorHue);
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Background
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, `hsl(${circuit.colorHue}, 40%, ${isDark ? 12 : 92}%)`);
    grad.addColorStop(1, `hsl(${circuit.colorHue}, 50%, ${isDark ? 6 : 88}%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Gold foil
    const foil = ctx.createRadialGradient(size * 0.3, size * 0.3, 10, size * 0.3, size * 0.3, size * 0.6);
    foil.addColorStop(0, "rgba(255,220,150,0.25)");
    foil.addColorStop(1, "transparent");
    ctx.fillStyle = foil;
    ctx.fillRect(0, 0, size, size);

    // Hexagon border
    ctx.strokeStyle = `hsl(${circuit.colorHue}, 70%, 55%)`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    const r = 180;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = size / 2 + r * Math.cos(a);
      const y = size / 2 + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Inner fill
    ctx.fillStyle = `hsla(${circuit.colorHue}, 60%, 20%, 0.35)`;
    ctx.fill();

    // Symbol
    ctx.font = "160px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isDark ? "#fff" : "#1a1208";
    ctx.fillText(art.symbol, size / 2, size / 2 - 20);

    // Name
    ctx.font = "bold 42px 'Noto Serif Devanagari', serif";
    ctx.fillStyle = isDark ? "#F2E8D4" : "#1a1208";
    ctx.fillText(temple.sk, size / 2, size / 2 + 110);

    // Date
    const d = new Date();
    const vs = gregorianToVikramSamvat(d);
    ctx.font = "24px system-ui";
    ctx.fillStyle = isDark ? "rgba(242,232,212,0.7)" : "rgba(26,18,8,0.7)";
    ctx.fillText(`${d.toLocaleDateString()} · VS ${vs}`, size / 2, size / 2 + 155);

    // Circuit name
    ctx.font = "bold 20px system-ui";
    ctx.fillStyle = `hsl(${circuit.colorHue}, 70%, 65%)`;
    ctx.fillText(circuit.name.toUpperCase(), size / 2, size / 2 + 190);

    return canvas.toDataURL("image/png");
  }, [isDark]);

  const shareStamp = async (circuit, temple) => {
    const dataUrl = generateStampPng(circuit, temple);
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `tirtha-stamp-${temple.id}.png`, { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Tīrtha Stamp — ${temple.name}`,
          text: `I claimed the sacred stamp for ${temple.name} (${circuit.name}) on my Spiritual Passport! 🙏`,
          files: [file],
        });
        setShareId(temple.id);
        setTimeout(() => setShareId(null), 2000);
        return;
      } catch {}
    }

    // Fallback to download
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `tirtha-stamp-${temple.id}.png`;
    link.click();
    setShareId(temple.id);
    setTimeout(() => setShareId(null), 2000);
  };

  const currentCircuit = TIRTHA_CIRCUITS.find((c) => c.id === activeCircuit);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: "22px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onBack} style={{
          width: 44, height: 44, borderRadius: 14, background: C.glass, border: `1px solid ${C.div}`,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          color: C.cream, fontSize: 20,
        }}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.cream }}>Tīrtha Stamps</h1>
          <p style={{ fontSize: 12, color: C.textD, marginTop: 2 }}>Spiritual Passport</p>
        </div>
        <button onClick={onToggleTheme} style={{
          width: 40, height: 40, borderRadius: 12, background: C.card, border: `1px solid ${C.div}`,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.cream,
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

      {/* Passport summary */}
      <div style={{ margin: "0 24px 18px", padding: 16, borderRadius: 18, background: C.card, border: `1px solid ${C.div}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Progress ring */}
          <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
            <svg width={100} height={100} style={{ transform: "rotate(-90deg)" }}>
              <circle cx="50" cy="50" r="44" fill="none" stroke={C.div} strokeWidth="7" />
              <circle
                cx="50" cy="50" r="44" fill="none" stroke={C.gold} strokeWidth="7"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (1 - overall.percent / 100)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset .5s ease" }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.cream }}>{overall.percent}%</div>
              <div style={{ fontSize: 9, color: C.textD }}>{overall.claimed}/{overall.total}</div>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.cream, marginBottom: 4 }}>Your Spiritual Passport</div>
            <div style={{ fontSize: 12, color: C.textD, lineHeight: 1.5 }}>
              {overall.claimed === 0
                ? "Begin your Tīrtha Yatra and collect sacred stamps."
                : overall.percent < 25
                ? "Your pilgrimage has begun. May many more stamps grace your passport."
                : overall.percent < 50
                ? "A beautiful collection. The divine path unfolds before you."
                : overall.percent < 75
                ? "Remarkable devotion. You have walked many sacred grounds."
                : overall.percent < 100
                ? "Nearing completion. Your spiritual journey inspires."
                : "Purnatva — your passport is complete. Blessed soul."}
            </div>
            {geo.effectiveLocation && (
              <div style={{ fontSize: 10, color: C.saffron, marginTop: 6 }}>
                📍 Live location active — stamps within 5 km can be claimed
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Circuit tabs */}
      <div style={{ display: "flex", gap: 8, padding: "0 24px 14px", overflowX: "auto" }}>
        {TIRTHA_CIRCUITS.map((c) => {
          const comp = getCircuitCompletion(c.id, claims);
          return (
            <button
              key={c.id}
              onClick={() => setActiveCircuit(c.id)}
              style={{
                padding: "10px 16px", borderRadius: 99, fontSize: 12, fontWeight: 700,
                background: activeCircuit === c.id ? `hsl(${c.colorHue},60%,35%)` : C.card,
                color: activeCircuit === c.id ? "#fff" : C.cream, border: "none", cursor: "pointer",
                whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span>{c.name}</span>
              {comp.claimed > 0 && (
                <span style={{
                  padding: "2px 6px", borderRadius: 99, background: activeCircuit === c.id ? "rgba(255,255,255,0.2)" : C.saffronDim,
                  color: activeCircuit === c.id ? "#fff" : C.saffron, fontSize: 10,
                }}>{comp.claimed}/{comp.total}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Circuit progress bar */}
      <div style={{ padding: "0 24px 14px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textD, marginBottom: 6 }}>
          {currentCircuit?.name} — {circuitCompletion.claimed} of {circuitCompletion.total} stamps
        </div>
        <div style={{ height: 8, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            width: `${circuitCompletion.percent}%`, height: "100%",
            background: `linear-gradient(90deg, ${C.gold}, ${C.saffron})`,
            borderRadius: 4, transition: "width .5s ease",
          }} />
        </div>
      </div>

      {/* Stamp grid */}
      <div style={{ padding: "0 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {currentCircuit?.temples.map((t) => {
          const claimed = isClaimed(t.id);
          const art = getStampArt(t, currentCircuit.colorHue);
          const nearby = canClaim(t);
          const dist = distanceTo(t);
          return (
            <div key={t.id} style={{
              padding: 14, borderRadius: 18, background: C.card, border: `1px solid ${C.div}`,
              display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
              opacity: claimed ? 1 : 0.65,
              transition: "opacity .2s",
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: claimed ? art.gradient : C.bg,
                border: claimed ? `2px solid hsl(${art.hue},70%,55%)` : nearby ? `2px solid ${C.saffron}` : `2px dashed ${C.div}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
                boxShadow: claimed ? `0 0 20px hsla(${art.hue},60%,45%,0.35)` : nearby ? `0 0 16px rgba(212,133,60,0.25)` : "none",
                marginBottom: 10,
                transition: "all .2s",
              }}>
                {claimed ? art.symbol : nearby ? "🛕" : "🔒"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.cream }}>{t.name}</div>
              <div style={{ fontSize: 11, fontFamily: "'Noto Serif Devanagari', serif", color: C.gold, marginTop: 2 }}>{t.sk}</div>
              <div style={{ fontSize: 10, color: C.textD, marginTop: 4 }}>{t.state}</div>

              {dist != null && !claimed && (
                <div style={{ fontSize: 10, color: nearby ? C.saffron : C.textD, marginTop: 4, fontWeight: nearby ? 600 : 400 }}>
                  {nearby ? `Within ${dist} — Claim now!` : `${dist} away`}
                </div>
              )}

              {claimed ? (
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button
                    onClick={() => shareStamp(currentCircuit, t)}
                    style={{
                      padding: "6px 12px", borderRadius: 99, background: C.goldDim,
                      border: `1px solid ${C.goldDim}`, color: C.gold, fontSize: 11, fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {shareId === t.id ? "Saved!" : "Share"}
                  </button>
                  <button
                    onClick={() => unclaim(t.id)}
                    title="Remove claim"
                    style={{
                      padding: "6px 10px", borderRadius: 99, background: "transparent",
                      border: `1px solid ${C.div}`, color: C.textD, fontSize: 11, fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : nearby ? (
                <button
                  onClick={() => claim(currentCircuit, t)}
                  style={{
                    marginTop: 10, padding: "6px 14px", borderRadius: 99, background: C.saffron,
                    border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 3px 12px rgba(212,133,60,0.3)",
                  }}
                >
                  Claim Stamp
                </button>
              ) : (
                <div style={{ marginTop: 10, fontSize: 10, color: C.textD }}>
                  {geo.effectiveLocation ? "Visit nearby to claim" : "Enable location to claim"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
