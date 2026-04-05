import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { TIRTHA_CIRCUITS, getStampArt, gregorianToVikramSamvat } from "./tirtha-data.js";

const C = {
  bg: "#1A1109", saffron: "#D4853C", gold: "#C4A24E", cream: "#F2E8D4", text: "#EDE4D4",
  card: "#241A10", div: "rgba(255,255,255,0.07)", glass: "rgba(26,17,9,0.78)", textD: "#6E5E48",
};

const CLAIM_KEY = "sti_tirtha_claims";

export default function TirthaStamps({ onBack }) {
  const [activeCircuit, setActiveCircuit] = useState(TIRTHA_CIRCUITS[0].id);
  const [claims, setClaims] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CLAIM_KEY) || "[]"); } catch { return []; }
  });
  const [shareId, setShareId] = useState(null);
  const canvasRef = useRef(null);

  const totalTemples = useMemo(() => TIRTHA_CIRCUITS.reduce((s, c) => s + c.temples.length, 0), []);
  const claimedCount = claims.length;
  const progress = Math.round((claimedCount / totalTemples) * 100);

  const isClaimed = (templeId) => claims.some((c) => c.templeId === templeId);

  const claim = (circuit, temple) => {
    if (isClaimed(temple.id)) return;
    const entry = {
      templeId: temple.id,
      circuitId: circuit.id,
      date: new Date().toISOString(),
    };
    const next = [...claims, entry];
    setClaims(next);
    localStorage.setItem(CLAIM_KEY, JSON.stringify(next));
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
    grad.addColorStop(0, `hsl(${circuit.colorHue}, 40%, 12%)`);
    grad.addColorStop(1, `hsl(${circuit.colorHue}, 50%, 6%)`);
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
    ctx.fillStyle = "#fff";
    ctx.fillText(art.symbol, size / 2, size / 2 - 20);

    // Name
    ctx.font = "bold 42px 'Noto Serif Devanagari', serif";
    ctx.fillStyle = "#F2E8D4";
    ctx.fillText(temple.sk, size / 2, size / 2 + 110);

    // Date
    const d = new Date();
    const vs = gregorianToVikramSamvat(d);
    ctx.font = "24px system-ui";
    ctx.fillStyle = "rgba(242,232,212,0.7)";
    ctx.fillText(`${d.toLocaleDateString()} · VS ${vs}`, size / 2, size / 2 + 155);

    // Circuit name
    ctx.font = "bold 20px system-ui";
    ctx.fillStyle = `hsl(${circuit.colorHue}, 70%, 65%)`;
    ctx.fillText(circuit.name.toUpperCase(), size / 2, size / 2 + 190);

    return canvas.toDataURL("image/png");
  }, []);

  const shareStamp = (circuit, temple) => {
    const dataUrl = generateStampPng(circuit, temple);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `tirtha-stamp-${temple.id}.png`;
    link.click();
    setShareId(temple.id);
    setTimeout(() => setShareId(null), 2000);
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.cream }}>Tīrtha Stamps</h1>
          <p style={{ fontSize: 12, color: C.textD, marginTop: 2 }}>Spiritual Passport</p>
        </div>
      </div>

      {/* Progress ring */}
      <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 18px" }}>
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <svg width={140} height={140} style={{ transform: "rotate(-90deg)" }}>
            <circle cx="70" cy="70" r="60" fill="none" stroke={C.div} strokeWidth="8" />
            <circle
              cx="70" cy="70" r="60" fill="none" stroke={C.gold} strokeWidth="8"
              strokeDasharray={2 * Math.PI * 60}
              strokeDashoffset={2 * Math.PI * 60 * (1 - progress / 100)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset .5s ease" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.cream }}>{progress}%</div>
            <div style={{ fontSize: 10, color: C.textD }}>{claimedCount}/{totalTemples}</div>
          </div>
        </div>
      </div>

      {/* Circuit tabs */}
      <div style={{ display: "flex", gap: 8, padding: "0 24px 14px", overflowX: "auto" }}>
        {TIRTHA_CIRCUITS.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCircuit(c.id)}
            style={{
              padding: "10px 16px", borderRadius: 99, fontSize: 12, fontWeight: 700,
              background: activeCircuit === c.id ? `hsl(${c.colorHue},60%,35%)` : C.card,
              color: activeCircuit === c.id ? "#fff" : C.cream, border: "none", cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Stamp grid */}
      <div style={{ padding: "0 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {TIRTHA_CIRCUITS.find((c) => c.id === activeCircuit)?.temples.map((t) => {
          const claimed = isClaimed(t.id);
          const art = getStampArt(t, TIRTHA_CIRCUITS.find((c) => c.id === activeCircuit).colorHue);
          return (
            <div key={t.id} style={{
              padding: 14, borderRadius: 18, background: C.card, border: `1px solid ${C.div}`,
              display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
              opacity: claimed ? 1 : 0.55,
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: claimed ? art.gradient : C.bg,
                border: claimed ? `2px solid hsl(${art.hue},70%,55%)` : `2px dashed ${C.div}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
                boxShadow: claimed ? `0 0 20px hsla(${art.hue},60%,45%,0.35)` : "none",
                marginBottom: 10,
              }}>
                {claimed ? art.symbol : "🔒"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.cream }}>{t.name}</div>
              <div style={{ fontSize: 11, fontFamily: "'Noto Serif Devanagari', serif", color: C.gold, marginTop: 2 }}>{t.sk}</div>
              <div style={{ fontSize: 10, color: C.textD, marginTop: 4 }}>{t.state}</div>
              {claimed ? (
                <button
                  onClick={() => shareStamp(TIRTHA_CIRCUITS.find((c) => c.id === activeCircuit), t)}
                  style={{
                    marginTop: 10, padding: "6px 12px", borderRadius: 99, background: "rgba(196,162,78,0.15)",
                    border: "1px solid rgba(196,162,78,0.3)", color: C.gold, fontSize: 11, fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {shareId === t.id ? "Saved!" : "Share"}
                </button>
              ) : (
                <div style={{ marginTop: 10, fontSize: 10, color: C.textD }}>Visit within 300m to claim</div>
              )}
            </div>
          );
        })}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
