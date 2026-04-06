/**
 * SarathiChat.jsx — Real-time world-class divine guide
 * Features: voice I/O, structured JSON responses, rich cards,
 * quick replies, typing animation, persistent history, real-time Panchangam context.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useGeo, haversineKm } from "./useGeo.js";
import { DEFAULT_LOC } from "./LivePanchangam.jsx";
import {
  getTimeContext,
  buildPanchangContext,
  getNearestTemples,
  buildSarathiSystemPrompt,
  parseSarathiResponse,
  isSpeechSupported,
  isTTSSupported,
  speakText,
  stopSpeaking,
  startListening,
  stopListening,
  searchTemples,
  formatTempleData,
  GEMINI_KEY,
} from "./sarathi-utils.js";

const CDark = {
  bg: "#1A1109", bg2: "#201610", bg3: "#2A1E14",
  card: "#241A10", cardH: "#2E2218", cardB: "rgba(255,255,255,0.055)",
  saffron: "#D4853C", saffronH: "#E69A52", saffronDim: "rgba(212,133,60,0.12)",
  saffronPale: "rgba(212,133,60,0.08)",
  gold: "#C4A24E", goldDim: "rgba(196,162,78,0.1)",
  cream: "#F2E8D4", creamM: "#D4C4A8", creamD: "#A89878",
  text: "#EDE4D4", textM: "#A89878", textD: "#6E5E48", textDD: "#5C4E3A",
  red: "#C44040", div: "rgba(255,255,255,0.07)", divL: "rgba(255,255,255,0.035)",
  glass: "rgba(26,17,9,0.78)", glassL: "rgba(26,17,9,0.62)",
};

const CLight = {
  bg: "#FAFAF8", bg2: "#F4F0EA", bg3: "#EDE8DF",
  card: "#FFFFFF", cardH: "#FBF8F3", cardB: "rgba(0,0,0,0.03)",
  saffron: "#C4721A", saffronH: "#D4853C", saffronDim: "rgba(196,114,26,0.12)",
  saffronPale: "rgba(196,114,26,0.07)",
  gold: "#9E7A28", goldDim: "rgba(158,122,40,0.08)",
  cream: "#1A1208", creamM: "#4A3010", creamD: "#7A5820",
  text: "#1A1208", textM: "#5A3A10", textD: "#8A6030", textDD: "#B89060",
  red: "#C44040", div: "rgba(0,0,0,0.08)", divL: "rgba(0,0,0,0.04)",
  glass: "rgba(250,250,248,0.88)", glassL: "rgba(250,250,248,0.72)",
};

const FB = "'Noto Sans Devanagari','Noto Sans',system-ui,sans-serif";
const FD = "'Noto Serif Devanagari','Noto Serif',Georgia,serif";

const HAPTIC = (ms = 20) => { try { navigator.vibrate?.(ms); } catch {} };
const STORAGE_KEY = "sti_sarathi_chat_v2";
const USER_NAME_KEY = "sti_user_name";

/* ─── SVG Icons ───────────────────────────────────────────────────────────── */

const OmSvg = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a5 5 0 0 1 5 5v2a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/>
    <path d="M12 14c-3.31 0-6 2.69-6 6"/>
    <path d="M12 14c3.31 0 6 2.69 6 6"/>
    <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/>
    <path d="M7 8c-1.5 0-2.5 1-2.5 2.5S5.5 13 7 13"/>
    <path d="M17 8c1.5 0 2.5 1 2.5 2.5S18.5 13 17 13"/>
  </svg>
);

const MicSvg = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 1 1-6 0V5a3 3 0 0 1 3-3z"/>
    <path d="M19 11v1a7 7 0 0 1-14 0v-1"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const SpeakerSvg = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);

const StopSvg = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>
);

const SendSvg = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const CopySvg = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const MapPinSvg = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

/* ─── Markdown renderer ───────────────────────────────────────────────────── */

function renderMdNodes(text, baseColor) {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    const nodes = parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) {
        return <strong key={i} style={{ fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
      }
      if (p.startsWith("`") && p.endsWith("`")) {
        return <code key={i} style={{ background: "rgba(212,133,60,0.15)", padding: "1px 5px", borderRadius: 4, fontSize: "0.88em", fontFamily: "monospace" }}>{p.slice(1, -1)}</code>;
      }
      return <span key={i}>{p}</span>;
    });
    return (
      <span key={li} style={{ display: "block", minHeight: "1.4em" }}>
        {nodes}
      </span>
    );
  });
}

/* ─── Temple inline card ──────────────────────────────────────────────────── */

function TempleInlineCard({ t, C, onOpen, onSave, isSaved }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.card}, ${C.bg2})`,
      border: `1px solid ${C.div}`,
      borderRadius: 14,
      padding: 12,
      marginTop: 10,
      display: "flex",
      gap: 12,
      alignItems: "center",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `linear-gradient(135deg, ${C.saffronDim}, ${C.saffronPale})`,
        border: `1px solid ${C.div}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 22 }}>🛕</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FB, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {t.name}
        </div>
        {t.reason && (
          <div style={{ fontSize: 11, color: C.textD, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {t.reason}{t.distanceText ? ` · ${t.distanceText}` : ""}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => onOpen?.(t)}
          style={{
            padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: C.saffron, color: "#fff", border: "none", cursor: "pointer",
            fontFamily: FB,
          }}
        >Open</button>
      </div>
    </div>
  );
}

/* ─── Typing effect hook ──────────────────────────────────────────────────── */

function useTypingEffect(fullText, speedMs = 18, enabled = true) {
  const [displayed, setDisplayed] = useState(enabled ? "" : fullText);
  const [done, setDone] = useState(!enabled);
  const fullRef = useRef(fullText);
  const enabledRef = useRef(enabled);

  useEffect(() => { fullRef.current = fullText; }, [fullText]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(fullText);
      setDone(true);
      return;
    }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setDisplayed(fullRef.current.slice(0, i));
      if (i >= fullRef.current.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speedMs);
    return () => clearInterval(interval);
  }, [fullText, enabled, speedMs]);

  return { displayed, done };
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

export default function SarathiChat({ onBack, temple, temples, isDark, onToggleTheme, oT }) {
  const C = useMemo(() => (isDark ? CDark : CLight), [isDark]);

  const geo = useGeo();
  const timeCtx = useMemo(() => getTimeContext(), []);
  const panchangCtx = useMemo(() => {
    const loc = geo.effectiveLocation
      ? { lat: geo.effectiveLocation.latitude, lng: geo.effectiveLocation.longitude, tz: 5.5 }
      : DEFAULT_LOC;
    return buildPanchangContext(loc);
  }, [geo.effectiveLocation]);

  const nearestTemples = useMemo(() => {
    if (!geo.effectiveLocation) return [];
    return getNearestTemples(temples, geo.effectiveLocation.latitude, geo.effectiveLocation.longitude, 3);
  }, [geo.effectiveLocation, temples]);

  const [userName, setUserName] = useState(() => {
    try { return localStorage.getItem(USER_NAME_KEY) || ""; } catch { return ""; }
  });

  const buildGreeting = useCallback(() => {
    let base = timeCtx.greeting;
    if (userName) base += `, ${userName}`;
    base += ".";
    base += ` I am **Sarathi**, your divine guide to the sacred temples of Bhārata.`;
    if (temple) {
      base += ` You're exploring **${temple.templeName}** in ${temple.townOrCity || temple.stateOrUnionTerritory}.`;
    }
    if (panchangCtx?.festivalsToday?.length) {
      base += ` Today we celebrate **${panchangCtx.festivalsToday.join(", ")}**.`;
    }
    if (panchangCtx?.inAbhijit) {
      base += ` 🌟 It is currently **Abhijit Muhurta** — an auspicious time for new beginnings.`;
    } else if (panchangCtx?.inRahuKala) {
      base += ` ⚠️ Please note: we are currently in **Rahu Kala**. It is best to avoid starting new ventures.`;
    }
    base += " How may I guide you today?";
    return base;
  }, [timeCtx, userName, temple, panchangCtx]);

  const [msgs, setMsgs] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [{
      id: "welcome",
      role: "assistant",
      text: buildGreeting(),
      parsed: { temples: [], actions: [], quickReplies: [], alert: "" },
      createdAt: Date.now(),
    }];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
    } catch {}
  }, [msgs]);

  // Update welcome message dynamically when real-time context loads
  useEffect(() => {
    setMsgs((prev) => {
      if (prev.length >= 1 && prev[0].id === "welcome") {
        return [{ ...prev[0], text: buildGreeting() }, ...prev.slice(1)];
      }
      return prev;
    });
  }, [buildGreeting]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [typingMsgId, setTypingMsgId] = useState(null);

  const speechSupported = useMemo(() => isSpeechSupported(), []);
  const ttsSupported = useMemo(() => isTTSSupported(), []);

  const endRef = useRef(null);
  const taRef = useRef(null);
  const recRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, isLoading, interimText]);

  const autoResize = (el) => { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; };

  const handleAction = useCallback((action) => {
    if (!action) return;
    HAPTIC(15);
    if (action.type === "maps") {
      const [lat, lng] = (action.value || "").split(",").map((s) => parseFloat(s.trim()));
      if (lat != null && lng != null) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
      }
    } else if (action.type === "detail") {
      const t = (temples || []).find((x) => (x.id || x.templeName) === action.value);
      if (t) oT(t);
    } else if (action.type === "favorite") {
      // Best-effort favorite toggle via localStorage to match app convention
      try {
        const key = "sti_favorites_v1";
        const raw = localStorage.getItem(key) || "[]";
        const list = JSON.parse(raw);
        const idx = list.indexOf(action.value);
        if (idx >= 0) list.splice(idx, 1);
        else list.push(action.value);
        localStorage.setItem(key, JSON.stringify(list));
      } catch {}
    }
  }, [temples, oT]);

  const sendMessage = useCallback(async (text) => {
    const q = (text || input).trim();
    if (!q || isLoading) return;
    HAPTIC(15);

    const userMsg = { id: `${Date.now()}-u`, role: "user", text: q, createdAt: Date.now() };
    const nextMsgs = [...msgs, userMsg];
    setMsgs(nextMsgs);
    setInput("");
    setInterimText("");
    if (taRef.current) taRef.current.style.height = "auto";
    setIsLoading(true);

    // Extract name on first user message if they say something like "My name is..."
    if (!userName) {
      const nameMatch = q.match(/my name is (\w+)/i);
      if (nameMatch) {
        const nm = nameMatch[1];
        try { localStorage.setItem(USER_NAME_KEY, nm); } catch {}
        setUserName(nm);
      }
    }

    // Local temple match fallback
    const allTemples = temples || [];
    let matchedTemples = [];
    if (temple) {
      matchedTemples = [temple];
      const extra = searchTemples(allTemples, q).filter(
        (t) => (t.id || t.templeName) !== (temple.id || temple.templeName)
      );
      matchedTemples = matchedTemples.concat(extra.slice(0, 3));
    } else {
      matchedTemples = searchTemples(allTemples, q);
    }

    const systemPrompt = buildSarathiSystemPrompt({
      userName,
      timeCtx,
      geo,
      panchangCtx,
      nearestTemples,
      currentTemple: temple || null,
    });

    try {
      // Gemini API requires contents to start with user and alternate roles.
      // Filter out the local welcome greeting so the turn sequence is valid.
      const contents = nextMsgs
        .filter((m) => !(m.role === "assistant" && m.id === "welcome"))
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text }],
        }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
          }),
        }
      );
      const data = await res.json();

      if (!res.ok || data?.error) {
        const errMsg = data?.error?.message || `HTTP ${res.status}`;
        throw new Error(errMsg);
      }

      const rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawReply) {
        throw new Error("Empty response from Gemini");
      }
      const parsed = parseSarathiResponse(rawReply);

      const assistantMsg = {
        id: `${Date.now()}-a`,
        role: "assistant",
        text: parsed.text,
        parsed,
        createdAt: Date.now(),
      };
      setMsgs((prev) => [...prev, assistantMsg]);
      setTypingMsgId(assistantMsg.id);
    } catch (e) {
      const errText = e?.message || "Unknown error";
      console.error("Sarathi API error:", e);
      if (matchedTemples.length > 0) {
        const fallback = matchedTemples.map((t) => {
          const parts = [`**🛕 ${t.templeName}**`];
          if (t.deityPrimary) parts.push(`**Deity:** ${t.deityPrimary}`);
          const loc = [t.townOrCity, t.district, t.stateOrUnionTerritory].filter(Boolean).join(", ");
          if (loc) parts.push(`**📍 Location:** ${loc}`);
          if (t.darshanTimings) parts.push(`**🕐 Timings:** ${t.darshanTimings}`);
          if (t.majorFestivals) parts.push(`**🎪 Festivals:** ${t.majorFestivals}`);
          if (t.routeSummary) parts.push(`**🗺️ Route:** ${t.routeSummary}`);
          if (t.historicalSignificance) parts.push(`**🏛️ History:** ${t.historicalSignificance}`);
          if (t.specialNotes) parts.push(`**📝 Notes:** ${t.specialNotes}`);
          return parts.join("\n");
        }).join("\n\n---\n\n");
        const fallbackMsg = {
          id: `${Date.now()}-a`,
          role: "assistant",
          text: `🙏 I couldn't reach the cloud, but here's what I found in our temple records:\n\n${fallback}`,
          parsed: { temples: [], actions: [], quickReplies: [], alert: "" },
          createdAt: Date.now(),
        };
        setMsgs((prev) => [...prev, fallbackMsg]);
        setTypingMsgId(fallbackMsg.id);
      } else {
        const errMsg = {
          id: `${Date.now()}-a`,
          role: "assistant",
          text: `🙏 Unable to reach Sarathi right now.\n\n**Error:** ${errText}`,
          parsed: { temples: [], actions: [], quickReplies: [], alert: "" },
          createdAt: Date.now(),
        };
        setMsgs((prev) => [...prev, errMsg]);
        setTypingMsgId(errMsg.id);
      }
    }
    setIsLoading(false);
  }, [input, isLoading, msgs, userName, timeCtx, geo, panchangCtx, nearestTemples, temple, temples, oT]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleListen = () => {
    if (isListening) {
      stopListening(recRef.current);
      recRef.current = null;
      setIsListening(false);
      return;
    }
    HAPTIC(15);
    setIsListening(true);
    setInterimText("");
    recRef.current = startListening({
      onResult: (final, interim) => {
        setInput(final + interim);
        setInterimText(interim);
      },
      onError: (err) => {
        setIsListening(false);
        setInterimText("");
        // Only overwrite if nothing was captured
        if (!input.trim()) setInput("");
      },
      onEnd: (final) => {
        setIsListening(false);
        setInterimText("");
        if (final.trim()) {
          setInput(final.trim());
          // Optional: auto-send after voice input
          // sendMessage(final.trim());
        }
      },
    });
  };

  const toggleSpeak = (text) => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    HAPTIC(15);
    setIsSpeaking(true);
    speakText(text, () => setIsSpeaking(false));
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      HAPTIC(10);
    } catch {}
  };

  const hasUserMsg = msgs.some((m) => m.role === "user");

  const defaultSuggestions = temple ? [
    { icon: "🛕", label: `Tell me about ${temple.templeName}` },
    { icon: "🗺️", label: `How to reach ${temple.townOrCity || temple.stateOrUnionTerritory}` },
    { icon: "🎪", label: "Festivals celebrated here" },
    { icon: "🕐", label: "Darshan timings and tips" },
  ] : [
    { icon: "🛕", label: "Famous temples near me" },
    { icon: "🕉️", label: "What are the 12 Jyotirlingas?" },
    { icon: "🎪", label: "Festivals and significance" },
    { icon: "📿", label: "Tell me a shloka for peace" },
    { icon: "🗺️", label: "Plan a pilgrimage route" },
    { icon: "🕐", label: "When is Abhijit Muhurta today?" },
  ];

  const suggestions = useMemo(() => {
    const last = msgs[msgs.length - 1];
    if (last?.role === "assistant" && last.parsed?.quickReplies?.length) {
      return last.parsed.quickReplies.map((qr) => ({ icon: qr.icon || "✨", label: qr.text }));
    }
    return defaultSuggestions;
  }, [msgs, defaultSuggestions]);

  /* ─── Render ─────────────────────────────────────────────────────────────── */

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg, position: "relative" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 18px 12px", background: C.glass, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.divL}`, flexShrink: 0, position: "sticky", top: 0, zIndex: 60,
      }}>
        <button onClick={onBack} className="t" style={{
          width: 36, height: 36, borderRadius: 11, background: C.bg3, border: `1px solid ${C.div}`,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: `linear-gradient(135deg, rgba(212,133,60,0.25), rgba(212,133,60,0.10))`,
          border: `1px solid rgba(212,133,60,0.3)`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          boxShadow: "0 0 20px rgba(212,133,60,0.12)",
        }}>
          <span aria-label="Om — sacred symbol" style={{
            fontFamily: FD, fontSize: 26, color: C.saffron, lineHeight: 1,
            animation: "sarathiBreathe 5s ease-in-out infinite",
          }}>ॐ</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: FD }}>Sarathi</span>
            <span style={{ fontSize: 10, color: C.saffron, fontWeight: 600, letterSpacing: 1, fontFamily: FB, opacity: 0.8 }}>सारथी</span>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px rgba(74,222,128,0.6)", flexShrink: 0, animation: "glow 2s ease-in-out infinite" }}/>
          </div>
          <div style={{ fontSize: 11, color: C.textD, marginTop: 2 }}>
            {GEMINI_KEY ? "Live · Real-time divine guide" : "Divine guide · API key not configured"}
          </div>
        </div>
        {ttsSupported && (
          <button
            onClick={() => {
              const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
              if (lastAssistant) toggleSpeak(lastAssistant.text);
            }}
            title={isSpeaking ? "Stop speaking" : "Speak last response"}
            style={{
              width: 36, height: 36, borderRadius: 11, background: isSpeaking ? C.saffron : C.bg3,
              border: `1px solid ${C.div}`, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0, color: isSpeaking ? "#fff" : C.textM,
            }}
          >
            {isSpeaking ? <StopSvg size={15} /> : <SpeakerSvg size={16} />}
          </button>
        )}
        <button onClick={onToggleTheme} style={{
          width: 36, height: 36, borderRadius: 11, background: C.bg3, border: `1px solid ${C.div}`,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
        }}>
          {isDark ? (
            <svg width="15" height="15" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg width="15" height="15" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Temple context pill */}
      {temple && (
        <div style={{ padding: "10px 18px 0", flexShrink: 0 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "6px 14px", borderRadius: 100, background: C.saffronDim,
            border: `1px solid rgba(212,133,60,0.18)`,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.saffron }}/>
            <span style={{ fontSize: 11, color: C.saffron, fontWeight: 600 }}>{temple.templeName}</span>
            <span style={{ fontSize: 10, color: C.textD, fontWeight: 400 }}>· {temple.stateOrUnionTerritory}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "14px 16px 8px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {!hasUserMsg && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 0 12px", position: "relative" }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%", width: 140, height: 140, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(212,133,60,0.10), transparent 70%)",
              transform: "translate(-50%,-50%)", animation: "sarathiAura 4s ease-in-out infinite", pointerEvents: "none",
            }}/>
            <div style={{
              position: "absolute", top: "50%", left: "50%", width: 110, height: 110, borderRadius: "50%",
              border: "1.5px solid rgba(212,133,60,0.15)", animation: "sarathiRingPulse 3.5s ease-out infinite", pointerEvents: "none",
            }}/>
            <span style={{
              fontFamily: FD, fontSize: 72, lineHeight: 1, color: C.saffron,
              animation: "sarathiBreathe 5s ease-in-out infinite, sarathiGlow 5s ease-in-out infinite",
              userSelect: "none", position: "relative", zIndex: 2,
            }}>ॐ</span>
            <div style={{ marginTop: 10, fontSize: 13, color: C.textM, fontFamily: FD, fontWeight: 500, letterSpacing: 0.5 }}>
              Sarathi is ready to guide you
            </div>
          </div>
        )}

        {msgs.map((m, idx) => {
          const isLastAssistant = m.role === "assistant" && idx === msgs.length - 1;
          const enableTyping = isLastAssistant && typingMsgId === m.id;
          return (
            <MessageBubble
              key={m.id}
              msg={m}
              C={C}
              enableTyping={enableTyping}
              onDoneTyping={() => setTypingMsgId(null)}
              onAction={handleAction}
              onCopy={() => copyText(m.text)}
              onSpeak={() => toggleSpeak(m.text)}
              isSpeaking={isSpeaking}
              temples={temples}
            />
          );
        })}

        {isLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-end", gap: 8, animation: "fi .3s ease both" }}>
            <div style={{
              width: 30, height: 30, borderRadius: 10,
              background: `linear-gradient(135deg, rgba(212,133,60,0.22), rgba(212,133,60,0.08))`,
              border: `1px solid rgba(212,133,60,0.2)`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}><OmSvg size={17} color={C.saffron}/></div>
            <div style={{
              padding: "12px 20px", borderRadius: "4px 18px 18px 18px",
              background: C.card, border: `1px solid ${C.div}`,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%", background: C.saffron, opacity: 0.5,
                    animation: `soundWave 1.2s ease-in-out infinite ${i * 0.18}s`,
                  }}/>
                ))}
              </div>
              <span style={{ fontSize: 11, color: C.textD, fontFamily: FB, fontStyle: "italic" }}>Sarathi is contemplating…</span>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Suggestion chips */}
      <div style={{ padding: "6px 16px 10px", flexShrink: 0, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => sendMessage(s.label)}
            style={{
              padding: "8px 14px", borderRadius: 100, fontSize: 12, fontWeight: 500,
              background: C.card, color: C.textM, border: `1px solid ${C.div}`, cursor: "pointer",
              fontFamily: FB, display: "flex", alignItems: "center", gap: 6,
              transition: "all .2s cubic-bezier(.16,1,.3,1)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.saffronDim; e.currentTarget.style.color = C.saffron; e.currentTarget.style.borderColor = "rgba(212,133,60,0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.card; e.currentTarget.style.color = C.textM; e.currentTarget.style.borderColor = C.div; }}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{
        padding: "10px 16px 16px", background: C.glass, backdropFilter: "blur(20px)",
        borderTop: `1px solid ${C.divL}`, flexShrink: 0,
      }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 8,
          padding: "8px 10px 8px 14px", borderRadius: 20,
          background: C.bg2, border: `1px solid ${C.div}`,
        }}>
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(e.target); }}
            onKeyDown={onKeyDown}
            placeholder={isListening ? "Listening..." : "Ask Sarathi anything..."}
            rows={1}
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 14, color: C.text, fontFamily: FB, resize: "none", lineHeight: 1.5,
              maxHeight: 120, paddingTop: 6, paddingBottom: 6,
            }}
          />
          {speechSupported && (
            <button
              onClick={toggleListen}
              title={isListening ? "Stop listening" : "Speak your question"}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: isListening ? C.red : C.bg3,
                border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0, color: isListening ? "#fff" : C.textM,
                transition: "all .2s",
              }}
            >
              <MicSvg size={18} />
            </button>
          )}
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: input.trim() && !isLoading ? C.saffron : C.div,
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !isLoading ? "pointer" : "default", flexShrink: 0,
              color: "#fff", transition: "all .2s",
            }}
          >
            <SendSvg size={18} />
          </button>
        </div>
        <div style={{ fontSize: 10, color: C.textDD, textAlign: "center", marginTop: 6, fontFamily: FB }}>
          Press Enter to send · Shift+Enter for a new line
        </div>
      </div>
    </div>
  );
}

/* ─── Message Bubble Sub-component ────────────────────────────────────────── */

function MessageBubble({ msg, C, enableTyping, onDoneTyping, onAction, onCopy, onSpeak, isSpeaking, temples }) {
  const { displayed, done } = useTypingEffect(msg.text, 16, enableTyping);

  useEffect(() => {
    if (enableTyping && done) onDoneTyping?.();
  }, [enableTyping, done, onDoneTyping]);

  const textToShow = enableTyping ? displayed : msg.text;
  const parsed = msg.parsed || {};

  return (
    <div style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
      {msg.role === "assistant" && (
        <div style={{
          width: 30, height: 30, borderRadius: 10,
          background: `linear-gradient(135deg, rgba(212,133,60,0.22), rgba(212,133,60,0.08))`,
          border: `1px solid rgba(212,133,60,0.2)`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2,
        }}>
          <OmSvg size={17} color={C.saffron} />
        </div>
      )}
      <div style={{
        maxWidth: "85%",
        padding: msg.role === "user" ? "10px 14px" : "12px 16px",
        borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
        background: msg.role === "user" ? `linear-gradient(135deg, ${C.saffron}, ${C.saffronH})` : `${C.card}`,
        border: msg.role === "user" ? "none" : `1px solid ${C.div}`,
        boxShadow: msg.role === "user" ? `0 3px 16px rgba(212,133,60,0.25)` : `0 2px 12px rgba(0,0,0,0.08)`,
      }}>
        {msg.role === "assistant" && parsed.alert && (
          <div style={{
            padding: "8px 12px", borderRadius: 10, marginBottom: 10,
            background: parsed.alert.includes("Rahu") ? "rgba(196,64,64,0.12)" : "rgba(212,133,60,0.12)",
            border: `1px solid ${parsed.alert.includes("Rahu") ? "rgba(196,64,64,0.25)" : "rgba(212,133,60,0.25)"}`,
            color: parsed.alert.includes("Rahu") ? C.red : C.saffron,
            fontSize: 12, fontWeight: 600, fontFamily: FB,
          }}>
            {parsed.alert}
          </div>
        )}

        <div style={{ fontSize: 13.5, color: msg.role === "user" ? "#fff" : C.text, lineHeight: 1.75, fontFamily: FB }}>
          {renderMdNodes(textToShow, msg.role === "user" ? "#fff" : C.text)}
        </div>

        {msg.role === "assistant" && parsed.temples?.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {parsed.temples.map((t, i) => (
              <TempleInlineCard
                key={i}
                t={t}
                C={C}
                onOpen={(item) => {
                  const found = temples?.find((x) => x.templeName === item.name || x.id === item.id);
                  if (found) oT?.(found);
                  else if (item.value) onAction?.({ type: "detail", value: item.value });
                }}
              />
            ))}
          </div>
        )}

        {msg.role === "assistant" && parsed.actions?.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {parsed.actions.map((a, i) => (
              <button
                key={i}
                onClick={() => onAction?.(a)}
                style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: C.saffronDim, color: C.saffron, border: `1px solid ${C.div}`,
                  cursor: "pointer", fontFamily: FB, display: "flex", alignItems: "center", gap: 5,
                }}
              >
                {a.type === "maps" && <MapPinSvg size={12} />}
                {a.label}
              </button>
            ))}
          </div>
        )}

        {msg.role === "assistant" && done && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.divL}` }}>
            <button onClick={onCopy} title="Copy" style={{
              display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.textD,
              background: "transparent", border: "none", cursor: "pointer", fontFamily: FB,
            }}>
              <CopySvg size={14} /> Copy
            </button>
            <button onClick={onSpeak} title={isSpeaking ? "Stop" : "Speak"} style={{
              display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: isSpeaking ? C.saffron : C.textD,
              background: "transparent", border: "none", cursor: "pointer", fontFamily: FB,
            }}>
              {isSpeaking ? <StopSvg size={12} /> : <SpeakerSvg size={14} />}
              {isSpeaking ? "Speaking" : "Speak"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
