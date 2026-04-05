import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#1A1109", saffron: "#D4853C", gold: "#C4A24E", cream: "#F2E8D4", text: "#EDE4D4",
  card: "#241A10", div: "rgba(255,255,255,0.07)", glass: "rgba(26,17,9,0.78)", textD: "#6E5E48",
};

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function SankalpaEngine({ onBack }) {
  const [tab, setTab] = useState("record"); // record | journal
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [journal, setJournal] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sti_sankalpa_journal") || "[]"); } catch { return []; }
  });
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-IN";
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text);
    };
    recognitionRef.current = rec;
  }, []);

  const startListen = () => {
    setTranscript("");
    setResult(null);
    try { recognitionRef.current?.start(); } catch {}
  };

  const stopListen = () => {
    try { recognitionRef.current?.stop(); } catch {}
  };

  const generate = async () => {
    if (!transcript.trim() || !GEMINI_KEY) return;
    setLoading(true);
    const prompt = `You are a learned Vedic scholar. The user has spoken this intention: "${transcript.trim()}".
1. Write a traditional Hindu Sankalpa in classical Sanskrit (5-6 lines).
2. Provide accurate Roman IAST transliteration.
3. Provide word-by-word English meaning.
4. Suggest the best deity and a specific temple from India to fulfill this intention.
5. Recommend the best upcoming Muhurta (general guidance like "Friday during Shukla Paksha").
Return ONLY valid JSON in this format:
{
  "sankalpa": "Sanskrit text",
  "transliteration": "IAST text",
  "meaning": "English translation",
  "deity": "...",
  "temple": "...",
  "muhurta": "..."
}`;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
        }
      );
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      setResult(parsed);
    } catch (e) {
      setResult({
        sankalpa: "ॐ श्री गणेशाय नमः ।\nअस्मिन् काले अहं [intention] इति संकल्पं करोमि ।",
        transliteration: "Oṃ śrī gaṇeśāya namaḥ । Asmin kāle ahaṃ [intention] iti saṅkalpaṃ karomi ।",
        meaning: "Salutations to Lord Ganesha. At this time, I make the resolve for [intention].",
        deity: "Lord Ganesha",
        temple: "Siddhivinayak Temple, Mumbai",
        muhurta: "Wednesday during Shukla Paksha",
      });
    }
    setLoading(false);
  };

  const saveToJournal = () => {
    if (!result) return;
    const entry = { id: Date.now(), transcript, ...result, date: new Date().toISOString() };
    const next = [entry, ...journal];
    setJournal(next);
    localStorage.setItem("sti_sankalpa_journal", JSON.stringify(next));
    setTab("journal");
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.cream }}>Sankalpa Engine</h1>
          <p style={{ fontSize: 12, color: C.textD, marginTop: 2 }}>Voice-to-Sanskrit</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, padding: "0 24px 18px" }}>
        <button onClick={() => setTab("record")} style={{
          flex: 1, padding: "10px", borderRadius: 14, fontSize: 13, fontWeight: 700,
          background: tab === "record" ? C.saffron : C.card, color: tab === "record" ? "#fff" : C.cream,
          border: "none", cursor: "pointer",
        }}>Record</button>
        <button onClick={() => setTab("journal")} style={{
          flex: 1, padding: "10px", borderRadius: 14, fontSize: 13, fontWeight: 700,
          background: tab === "journal" ? C.saffron : C.card, color: tab === "journal" ? "#fff" : C.cream,
          border: "none", cursor: "pointer",
        }}>Journal ({journal.length})</button>
      </div>

      {tab === "record" && (
        <div style={{ padding: "0 24px" }}>
          {/* Om symbol */}
          <div style={{ textAlign: "center", margin: "8px 0 18px" }}>
            <div style={{ fontSize: 80, fontFamily: "'Noto Serif Devanagari', serif", color: C.saffron, lineHeight: 1 }}>ॐ</div>
          </div>

          {/* Mic button */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <button
              onMouseDown={startListen}
              onMouseUp={stopListen}
              onTouchStart={startListen}
              onTouchEnd={stopListen}
              style={{
                width: 84, height: 84, borderRadius: "50%",
                background: listening ? C.gold : C.saffron, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 6px 28px ${listening ? "rgba(196,162,78,0.45)" : "rgba(212,133,60,0.45)"}`,
              }}
            >
              {listening ? (
                <div style={{ display: "flex", alignItems: "center", gap: 3, height: 28 }}>
                  {[1, 1.6, 1.2, 1.8, 1.4].map((h, i) => (
                    <div key={i} style={{
                      width: 4, borderRadius: 2, background: "#fff", height: `${h * 12}px`,
                      animation: `sankalpaBar 0.9s ease-in-out infinite ${i * 0.08}s`,
                    }} />
                  ))}
                </div>
              ) : (
                <svg width="28" height="28" fill="#fff" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
              )}
            </button>
          </div>

          {/* Transcript */}
          <div style={{
            padding: 14, borderRadius: 16, background: C.card, border: `1px solid ${C.div}`,
            minHeight: 60, color: C.cream, fontSize: 14, lineHeight: 1.6, marginBottom: 14,
          }}>
            {transcript || <span style={{ color: C.textD }}>Hold the microphone and speak your intention...</span>}
          </div>

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={!transcript.trim() || loading || !GEMINI_KEY}
            style={{
              width: "100%", padding: "14px", borderRadius: 18,
              background: !GEMINI_KEY ? C.card : C.saffron,
              color: !GEMINI_KEY ? C.textD : "#fff", border: "none", fontSize: 14, fontWeight: 700,
              cursor: !GEMINI_KEY ? "default" : "pointer", marginBottom: 18,
            }}
          >
            {loading ? "Consulting the Vedas..." : !GEMINI_KEY ? "Gemini key not configured" : "Generate Sankalpa"}
          </button>

          {/* Result scroll card */}
          {result && (
            <div style={{
              padding: 20, borderRadius: 20, background: "linear-gradient(135deg, rgba(36,26,16,0.95), rgba(26,17,9,0.95))",
              border: `1px solid ${C.div}`, position: "relative",
            }}>
              <div style={{ position: "absolute", top: 10, left: 10, right: 10, height: 2, background: "linear-gradient(90deg, transparent, rgba(196,162,78,0.5), transparent)" }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Sankalpa</div>
              <div style={{ fontSize: 18, fontFamily: "'Noto Serif Devanagari', serif", color: C.cream, lineHeight: 1.7, marginBottom: 14 }}>{result.sankalpa}</div>

              <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Transliteration</div>
              <div style={{ fontSize: 13, color: C.text, fontStyle: "italic", lineHeight: 1.6, marginBottom: 14 }}>{result.transliteration}</div>

              <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Meaning</div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 14 }}>{result.meaning}</div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <Pill label={`Deity: ${result.deity}`} />
                <Pill label={`Temple: ${result.temple}`} />
                <Pill label={`Muhurta: ${result.muhurta}`} />
              </div>

              <button onClick={saveToJournal} style={{
                width: "100%", padding: "12px", borderRadius: 16, background: C.gold,
                color: "#1a0f00", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>Save to Journal</button>

              <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, height: 2, background: "linear-gradient(90deg, transparent, rgba(196,162,78,0.5), transparent)" }} />
            </div>
          )}
        </div>
      )}

      {tab === "journal" && (
        <div style={{ padding: "0 24px", display: "grid", gap: 12 }}>
          {journal.length === 0 && (
            <div style={{ textAlign: "center", color: C.textD, fontSize: 13, padding: "30px 0" }}>No saved Sankalpas yet.</div>
          )}
          {journal.map((entry) => (
            <div key={entry.id} style={{
              padding: 16, borderRadius: 18, background: C.card, border: `1px solid ${C.div}`,
            }}>
              <div style={{ fontSize: 10, color: C.textD, marginBottom: 6 }}>{new Date(entry.date).toLocaleDateString()}</div>
              <div style={{ fontSize: 15, fontFamily: "'Noto Serif Devanagari', serif", color: C.cream, marginBottom: 8 }}>{entry.sankalpa}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Pill label={entry.deity} />
                <Pill label={entry.temple} />
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes sankalpaBar { 0%,100% { transform: scaleY(0.4); opacity: 0.6; } 50% { transform: scaleY(1); opacity: 1; } }
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
