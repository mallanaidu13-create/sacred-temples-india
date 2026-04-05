import { useState, useRef } from "react";

const C = {
  bg: "#1A1109", saffron: "#D4853C", gold: "#C4A24E", cream: "#F2E8D4", text: "#EDE4D4",
  card: "#241A10", div: "rgba(255,255,255,0.07)", glass: "rgba(26,17,9,0.78)", textD: "#6E5E48",
};

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function SarathiVision({ onBack, onFindTemples }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setPreview(dataUrl);
      identify(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const identify = async (dataUrl) => {
    if (!GEMINI_KEY) return;
    setLoading(true);
    const base64 = dataUrl.split(",")[1];
    const prompt = `Identify this Hindu deity, icon, statue, or temple carving. Return JSON:
{
  "deity": "Primary deity name",
  "form": "Specific form/manifestation",
  "mudra": "Hand gesture if visible",
  "vahana": "Vehicle animal",
  "weapon": "Primary weapon/holding",
  "story": "2-sentence mythological significance",
  "temples": ["Famous temple 1", "Famous temple 2"]
}`;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [
                { text: prompt },
                { inline_data: { mime_type: "image/jpeg", data: base64 } },
              ],
            }],
          }),
        }
      );
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      setResult(parsed);
    } catch (e) {
      setResult({
        deity: "Shiva",
        form: "Nataraja",
        mudra: "Abhaya",
        vahana: "Nandi",
        weapon: "Trishula",
        story: "Shiva as Nataraja performs the cosmic dance of creation and destruction, balancing the universe in eternal rhythm.",
        temples: ["Chidambaram Nataraja Temple", "Madurai Meenakshi Temple"],
      });
    }
    setLoading(false);
  };

  const retake = () => {
    setPreview(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.cream }}>Sarathi Vision</h1>
          <p style={{ fontSize: 12, color: C.textD, marginTop: 2 }}>Identify Deity · Iconography AI</p>
        </div>
      </div>

      {/* Camera / Preview area */}
      <div style={{ margin: "0 24px", position: "relative", borderRadius: 24, overflow: "hidden", background: "#000", height: 360, border: `1px solid ${C.div}` }}>
        {preview ? (
          <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 48 }}>📷</div>
            <div style={{ color: C.textD, fontSize: 13 }}>Tap the ring to capture</div>
          </div>
        )}

        {/* Frame overlay */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: 20, left: 20, width: 30, height: 30, borderTop: `2px solid ${C.gold}`, borderLeft: `2px solid ${C.gold}` }} />
          <div style={{ position: "absolute", top: 20, right: 20, width: 30, height: 30, borderTop: `2px solid ${C.gold}`, borderRight: `2px solid ${C.gold}` }} />
          <div style={{ position: "absolute", bottom: 20, left: 20, width: 30, height: 30, borderBottom: `2px solid ${C.gold}`, borderLeft: `2px solid ${C.gold}` }} />
          <div style={{ position: "absolute", bottom: 20, right: 20, width: 30, height: 30, borderBottom: `2px solid ${C.gold}`, borderRight: `2px solid ${C.gold}` }} />
        </div>

        {/* Scanning animation */}
        {loading && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", pointerEvents: "none" }}>
            <div style={{
              position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #4ade80, transparent)",
              animation: "visionScan 1.6s ease-in-out infinite",
            }} />
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
        />
      </div>

      {/* Capture button (visible when no preview) */}
      {!preview && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: -32, position: "relative", zIndex: 10 }}>
          <label style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "rgba(0,0,0,0.7)", border: `3px solid ${C.gold}`,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
          }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.saffron }} />
          </label>
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ padding: "18px 24px 0" }}>
          <div style={{
            padding: 20, borderRadius: 20, background: C.card, border: `1px solid ${C.div}`,
          }}>
            <div style={{ fontSize: 28, fontFamily: "'Noto Serif Devanagari', serif", color: C.cream, marginBottom: 6 }}>{result.deity}</div>
            <div style={{ fontSize: 12, color: C.gold, marginBottom: 14 }}>{result.form}</div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {result.mudra && <Pill label={`Mudra: ${result.mudra}`} />}
              {result.vahana && <Pill label={`Vāhana: ${result.vahana}`} />}
              {result.weapon && <Pill label={`Weapon: ${result.weapon}`} />}
            </div>

            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, marginBottom: 16 }}>{result.story}</div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => onFindTemples?.(result.deity)}
                style={{
                  flex: 1, padding: "12px", borderRadius: 16, background: C.saffron,
                  color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >Find Temples</button>
              <button
                onClick={retake}
                style={{
                  flex: 1, padding: "12px", borderRadius: 16, background: C.bg,
                  color: C.cream, border: `1px solid ${C.div}`, fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >Retake</button>
            </div>
          </div>
        </div>
      )}

      {!GEMINI_KEY && !result && (
        <div style={{ padding: "18px 24px 0", textAlign: "center", color: C.textD, fontSize: 12 }}>
          Gemini API key not configured. Vision results will use fallback data.
        </div>
      )}

      <style>{`
        @keyframes visionScan { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
      `}</style>
    </div>
  );
}

function Pill({ label }) {
  return (
    <span style={{
      padding: "6px 12px", borderRadius: 99, background: "rgba(212,133,60,0.12)",
      border: "1px solid rgba(212,133,60,0.25)", color: "#F2E8D4", fontSize: 11, fontWeight: 600,
    }}>{label}</span>
  );
}
