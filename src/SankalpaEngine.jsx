import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useGeo } from "./useGeo.js";
import { DEFAULT_LOC } from "./LivePanchangam.jsx";
import {
  classifyIntention,
  buildSankalpaContext,
  generateLocalSankalpa,
  buildSankalpaApiPrompt,
  parseSankalpaResponse,
  GEMINI_KEY,
} from "./sankalpa-logic.js";

const CDark = {
  bg: "#1A1109", saffron: "#D4853C", saffronDim: "rgba(212,133,60,0.12)",
  gold: "#C4A24E", goldDim: "rgba(196,162,78,0.1)",
  cream: "#F2E8D4", text: "#EDE4D4", textM: "#A89878", textD: "#6E5E48", textDD: "#5C4E3A",
  card: "#241A10", cardH: "#2E2218", div: "rgba(255,255,255,0.07)", glass: "rgba(26,17,9,0.78)",
};

const CLight = {
  bg: "#FAFAF8", saffron: "#C4721A", saffronDim: "rgba(196,114,26,0.12)",
  gold: "#9E7A28", goldDim: "rgba(158,122,40,0.08)",
  cream: "#1A1208", text: "#1A1208", textM: "#5A3A10", textD: "#8A6030", textDD: "#B89060",
  card: "#FFFFFF", cardH: "#FBF8F3", div: "rgba(0,0,0,0.08)", glass: "rgba(250,250,248,0.88)",
};

const CATEGORIES = [
  { id: "new_venture", label: "New Beginnings", icon: "🌱" },
  { id: "wealth", label: "Wealth & Career", icon: "💰" },
  { id: "health", label: "Health & Healing", icon: "🍃" },
  { id: "marriage", label: "Marriage & Love", icon: "💕" },
  { id: "education", label: "Education & Exams", icon: "📚" },
  { id: "travel", label: "Travel & Safety", icon: "🛤️" },
  { id: "children", label: "Children & Family", icon: "👶" },
  { id: "spirituality", label: "Spirituality", icon: "🧘" },
];

export default function SankalpaEngine({ onBack, isDark, onToggleTheme, temples }) {
  const C = useMemo(() => (isDark ? CDark : CLight), [isDark]);

  const geo = useGeo();
  const location = useMemo(() => {
    if (geo.effectiveLocation) {
      return {
        name: "Your Location",
        lat: geo.effectiveLocation.latitude,
        lng: geo.effectiveLocation.longitude,
        tz: 5.5,
        tzName: "Asia/Kolkata",
      };
    }
    return DEFAULT_LOC;
  }, [geo.effectiveLocation]);

  const [tab, setTab] = useState("record");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [journal, setJournal] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sti_sankalpa_journal_v2") || "[]"); } catch { return []; }
  });
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
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
    setErrorMsg("");
    try { recognitionRef.current?.start(); } catch {}
  };

  const stopListen = () => {
    try { recognitionRef.current?.stop(); } catch {}
  };

  const generate = useCallback(async () => {
    const text = transcript.trim();
    if (!text) return;
    setLoading(true);
    setResult(null);
    setErrorMsg("");

    const panchangCtx = buildSankalpaContext(location);
    const category = classifyIntention(text);

    // Always compute local fallback first
    const localResult = generateLocalSankalpa(text, { panchangCtx, location, temples });

    if (!GEMINI_KEY) {
      setResult(localResult);
      setLoading(false);
      return;
    }

    try {
      const prompt = buildSankalpaApiPrompt(text, {
        panchangCtx,
        location,
        matchedTemple: localResult.matchedTemple,
      });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
        }
      );
      const data = await res.json();

      if (!res.ok || data?.error) {
        const err = data?.error?.message || `HTTP ${res.status}`;
        if (isQuotaError(err)) {
          setResult({ ...localResult, muhurta: `${localResult.muhurta} (Cloud quota resting — local wisdom active)` });
        } else {
          setErrorMsg(err);
          setResult(localResult);
        }
        setLoading(false);
        return;
      }

      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = parseSankalpaResponse(raw);

      if (parsed.sankalpa) {
        setResult({
          ...parsed,
          category: category.id,
          matchedTemple: localResult.matchedTemple,
          isLocal: false,
        });
      } else {
        setResult(localResult);
      }
    } catch (e) {
      setResult(localResult);
    }
    setLoading(false);
  }, [transcript, location, temples]);

  const saveToJournal = () => {
    if (!result) return;
    const entry = { id: Date.now(), transcript, ...result, date: new Date().toISOString() };
    const next = [entry, ...journal];
    setJournal(next);
    try { localStorage.setItem("sti_sankalpa_journal_v2", JSON.stringify(next)); } catch {}
    setTab("journal");
  };

  const copySankalpa = async () => {
    if (!result?.sankalpa) return;
    try {
      await navigator.clipboard.writeText(result.sankalpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const speakSankalpa = () => {
    if (!result?.sankalpa || !window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    const utter = new SpeechSynthesisUtterance(result.sankalpa);
    utter.rate = 0.9;
    utter.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const indian = voices.find((v) => /(en-IN|India|Indian)/i.test(v.lang + " " + v.name));
    const english = voices.find((v) => v.lang.startsWith("en"));
    utter.voice = indian || english || voices[0] || null;
    utter.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  };

  const shareSankalpa = async () => {
    if (!result) return;
    const shareText = `🙏 My Sankalpa\n\n${result.sankalpa}\n\nMeaning: ${result.meaning}\nDeity: ${result.deity}\nTemple: ${result.temple}\nMuhurta: ${result.muhurta}\n\nGenerated by Sacred Temples of Bhārata`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Sankalpa", text: shareText });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  const addToCalendar = () => {
    if (!result?.muhurta) return;
    // Try to extract a time from muhurta text like "12:16 PM"
    const timeMatch = result.muhurta.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    const now = new Date();
    let eventDate = new Date(now);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3].toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      eventDate.setHours(h, m, 0, 0);
      if (eventDate <= now) eventDate.setDate(eventDate.getDate() + 1);
    } else {
      // Default to tomorrow 6 AM if no time found
      eventDate.setDate(eventDate.getDate() + 1);
      eventDate.setHours(6, 0, 0, 0);
    }

    const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const start = fmt(eventDate);
    const endDate = new Date(eventDate.getTime() + 30 * 60000);
    const end = fmt(endDate);

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `SUMMARY:Sankalpa Muhurta — ${result.deity}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `DESCRIPTION:${result.sankalpa.replace(/\n/g, "\\n")}\\n\\nMeaning: ${result.meaning}\\nTemple: ${result.temple}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sankalpa-muhurta-${result.deity.replace(/\s+/g, "-")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const pickCategory = (id) => {
    const cat = CATEGORIES.find((c) => c.id === id);
    if (cat) {
      setTranscript(cat.label);
      setResult(null);
    }
  };

  const locationLabel = geo.effectiveLocation
    ? `Using live location · ${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`
    : `Using default location · ${DEFAULT_LOC.name}`;

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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.cream }}>Sankalpa Engine</h1>
          <p style={{ fontSize: 12, color: C.textD, marginTop: 2 }}>Voice · Intention · Sanskrit</p>
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

      {/* Location pill */}
      <div style={{ padding: "0 24px 14px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 12px", borderRadius: 100, background: C.saffronDim,
          border: `1px solid ${isDark ? "rgba(212,133,60,0.18)" : "rgba(196,114,26,0.18)"}`,
          fontSize: 11, color: C.saffron, fontWeight: 600,
        }}>
          <span>📍</span>
          <span>{locationLabel}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, padding: "0 24px 18px" }}>
        <button onClick={() => setTab("record")} style={{
          flex: 1, padding: "10px", borderRadius: 14, fontSize: 13, fontWeight: 700,
          background: tab === "record" ? C.saffron : C.card, color: tab === "record" ? "#fff" : C.cream,
          border: `1px solid ${C.div}`, cursor: "pointer",
        }}>Record</button>
        <button onClick={() => setTab("journal")} style={{
          flex: 1, padding: "10px", borderRadius: 14, fontSize: 13, fontWeight: 700,
          background: tab === "journal" ? C.saffron : C.card, color: tab === "journal" ? "#fff" : C.cream,
          border: `1px solid ${C.div}`, cursor: "pointer",
        }}>Journal ({journal.length})</button>
      </div>

      {tab === "record" && (
        <div style={{ padding: "0 24px" }}>
          {/* Category chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => pickCategory(cat.id)}
                style={{
                  padding: "8px 12px", borderRadius: 100, fontSize: 12, fontWeight: 500,
                  background: C.card, color: C.textM, border: `1px solid ${C.div}`, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.saffronDim; e.currentTarget.style.color = C.saffron; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.card; e.currentTarget.style.color = C.textM; }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

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
                transition: "all .2s",
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

          {/* Transcript textarea */}
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Speak or type your intention here..."
            style={{
              width: "100%", padding: 14, borderRadius: 16, background: C.card, border: `1px solid ${C.div}`,
              color: C.cream, fontSize: 14, lineHeight: 1.6, marginBottom: 14,
              outline: "none", minHeight: 80, resize: "none", fontFamily: "inherit",
            }}
          />

          {/* Error banner */}
          {errorMsg && (
            <div style={{
              padding: "10px 14px", borderRadius: 12, background: "rgba(196,64,64,0.12)",
              border: "1px solid rgba(196,64,64,0.25)", color: isDark ? "#fca5a5" : "#dc2626",
              fontSize: 12, marginBottom: 14,
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={!transcript.trim() || loading}
            style={{
              width: "100%", padding: "14px", borderRadius: 18,
              background: loading ? C.card : C.saffron,
              color: loading ? C.textD : "#fff", border: "none", fontSize: 14, fontWeight: 700,
              cursor: loading ? "default" : "pointer", marginBottom: 18,
            }}
          >
            {loading ? "Invoking the Vedas..." : GEMINI_KEY ? "Generate Sankalpa" : "Generate Sankalpa (Local Mode)"}
          </button>

          {/* Result card */}
          {result && (
            <div style={{
              padding: 22, borderRadius: 22,
              background: isDark ? "linear-gradient(135deg, rgba(36,26,16,0.98), rgba(26,17,9,0.98))" : "linear-gradient(135deg, #fff, #fbf8f3)",
              border: `1px solid ${C.div}`, position: "relative",
            }}>
              {result.isLocal && (
                <div style={{
                  padding: "6px 10px", borderRadius: 8, marginBottom: 12,
                  background: C.goldDim, border: `1px solid ${C.goldDim}`,
                  color: C.gold, fontSize: 11, fontWeight: 600,
                }}>
                  📿 Generated from local sacred wisdom
                </div>
              )}

              <div style={{ position: "absolute", top: 10, left: 10, right: 10, height: 2, background: `linear-gradient(90deg, transparent, ${C.goldDim}, transparent)` }} />

              <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Sankalpa</div>
              <div style={{ fontSize: 20, fontFamily: "'Noto Serif Devanagari', serif", color: C.cream, lineHeight: 1.8, marginBottom: 16, whiteSpace: "pre-line" }}>{result.sankalpa}</div>

              <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Transliteration</div>
              <div style={{ fontSize: 13, color: C.text, fontStyle: "italic", lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line" }}>{result.transliteration}</div>

              <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Meaning</div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, marginBottom: 16 }}>{result.meaning}</div>

              {result.seedMantra && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Seed Mantra</div>
                  <div style={{ fontSize: 14, color: C.saffron, fontWeight: 600, lineHeight: 1.6, marginBottom: 16, fontFamily: "'Noto Serif Devanagari', serif" }}>{result.seedMantra}</div>
                </>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <Pill label={`Deity: ${result.deity}`} C={C} />
                <Pill label={`Temple: ${result.temple}`} C={C} />
                <Pill label={`Muhurta: ${result.muhurta}`} C={C} />
              </div>

              {/* Action row */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <ActionBtn onClick={copySankalpa} label={copied ? "Copied!" : "Copy"} icon="📋" C={C} />
                <ActionBtn onClick={speakSankalpa} label={speaking ? "Speaking..." : "Speak"} icon="🔊" C={C} />
                <ActionBtn onClick={shareSankalpa} label="Share" icon="↗️" C={C} />
                <ActionBtn onClick={addToCalendar} label="Add to Calendar" icon="📅" C={C} />
              </div>

              <button onClick={saveToJournal} style={{
                width: "100%", padding: "12px", borderRadius: 16, background: C.gold,
                color: isDark ? "#1a0f00" : "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>Save to Journal</button>

              <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, height: 2, background: `linear-gradient(90deg, transparent, ${C.goldDim}, transparent)` }} />
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
              <div style={{ fontSize: 10, color: C.textD, marginBottom: 6 }}>{new Date(entry.date).toLocaleDateString()} · {entry.deity}</div>
              <div style={{ fontSize: 15, fontFamily: "'Noto Serif Devanagari', serif", color: C.cream, marginBottom: 8, whiteSpace: "pre-line" }}>{entry.sankalpa}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Pill label={entry.deity} C={C} />
                <Pill label={entry.temple} C={C} />
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

function isQuotaError(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return t.includes("quota") || t.includes("rate limit") || t.includes("limit: 0") || t.includes("exceeded");
}

function Pill({ label, C }) {
  return (
    <span style={{
      padding: "6px 12px", borderRadius: 99, background: C.saffronDim,
      border: `1px solid ${C.div}`, color: C.cream, fontSize: 11, fontWeight: 600,
    }}>{label}</span>
  );
}

function ActionBtn({ onClick, label, icon, C }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 12px", borderRadius: 10, background: C.card,
        border: `1px solid ${C.div}`, color: C.cream, fontSize: 12, fontWeight: 600,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
