/**
 * sarathi-utils.js — Real-time divine intelligence for Sarathi
 * Provides context-aware prompts, voice I/O, and structured response parsing.
 */

import { haversineKm } from "./useGeo.js";
import { computePanchangam, DEFAULT_LOC } from "./LivePanchangam.jsx";
import { evaluateFestivals } from "./festival-rules.js";
import { findAbhijitMuhurta, findRahuKala } from "./kala-chakra-logic.js";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

/* ─── Time & Greeting ─────────────────────────────────────────────────────── */

export function getTimeContext() {
  const now = new Date();
  const h = now.getHours();
  let greeting = "Namaste 🙏";
  let timeOfDay = "day";
  if (h < 6) { greeting = "Shubha Ratri 🌙"; timeOfDay = "night"; }
  else if (h < 12) { greeting = "Shubha Prabhat ☀️"; timeOfDay = "morning"; }
  else if (h < 17) { greeting = "Shubha Aparahna 🌤️"; timeOfDay = "afternoon"; }
  else { greeting = "Shubha Sandhya 🪔"; timeOfDay = "evening"; }
  return {
    now: now.toISOString(),
    localTime: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    dayName: now.toLocaleDateString("en-IN", { weekday: "long" }),
    dateString: now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    greeting,
    timeOfDay,
    hour: h,
  };
}

/* ─── Temple Context ──────────────────────────────────────────────────────── */

export function getNearestTemples(temples, lat, lon, n = 3) {
  if (!temples?.length || lat == null || lon == null) return [];
  const scored = temples
    .filter((t) => t.latitude != null && t.longitude != null)
    .map((t) => ({
      ...t,
      distanceKm: haversineKm(lat, lon, t.latitude, t.longitude),
    }));
  scored.sort((a, b) => a.distanceKm - b.distanceKm);
  return scored.slice(0, n);
}

function summarizeTemple(t) {
  const parts = [`${t.templeName}`];
  if (t.deityPrimary) parts.push(`deity ${t.deityPrimary}`);
  if (t.townOrCity) parts.push(`in ${t.townOrCity}`);
  if (t.distanceKm != null) parts.push(`(${fmtDist(t.distanceKm)} away)`);
  return parts.join(" ");
}

function fmtDist(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

/* ─── Panchangam Context ──────────────────────────────────────────────────── */

export function buildPanchangContext(loc = DEFAULT_LOC) {
  try {
    const p = computePanchangam(new Date(), loc);
    const nowJD = p.jdNow;
    const sunriseJD = p.sunriseJD;
    const sunsetJD = p.sunsetJD;
    const varaIdx = p.varaIdx; // 0=Sun ... 6=Sat

    const abhijit = findAbhijitMuhurta(sunriseJD, sunsetJD, loc.tz);
    const rahu = findRahuKala(sunriseJD, sunsetJD, varaIdx, loc.tz);

    const inRahuKala = rahu && nowJD >= rahu.startJD && nowJD < rahu.endJD;
    const inAbhijit = abhijit && nowJD >= abhijit.startJD && nowJD < abhijit.endJD;

    // Festival check
    const festivals = evaluateFestivals(p, p.masaIdx, p.tithi.index, p.sunRashiIdx, p.nakshatra.index);
    const todayFestivals = festivals
      .filter((f) => f.today || f.tomorrow)
      .map((f) => f.names?.en || f.name || "Unknown festival");

    return {
      tithi: p.tithi.name,
      nakshatra: p.nakshatra.name,
      rashi: p.moonRashi?.name || "",
      masa: p.masaName,
      paksha: p.paksha,
      yoga: p.yoga?.name || "",
      vara: p.vara,
      sunrise: p.sunriseTime,
      sunset: p.sunsetTime,
      abhijitMuhurta: abhijit ? `${abhijit.start} – ${abhijit.end}` : null,
      rahuKala: rahu ? `${rahu.start} – ${rahu.end}` : null,
      inRahuKala,
      inAbhijit,
      festivalsToday: todayFestivals,
      ayana: p.ayana || "",
    };
  } catch (e) {
    return null;
  }
}

function fmtPanchangAlert(ctx) {
  if (!ctx) return "";
  const parts = [];
  if (ctx.inAbhijit) parts.push("🌟 You are currently in Abhijit Muhurta — highly auspicious for new beginnings.");
  if (ctx.inRahuKala) parts.push("⚠️ You are currently in Rahu Kala — avoid starting new ventures.");
  if (ctx.festivalsToday?.length) parts.push(`🎉 Today is ${ctx.festivalsToday.join(", ")}.`);
  return parts.join(" ");
}

/* ─── System Prompt Builder ───────────────────────────────────────────────── */

export function buildSarathiSystemPrompt({
  userName,
  timeCtx,
  geo,
  panchangCtx,
  nearestTemples,
  currentTemple,
}) {
  const lines = [];

  lines.push(`You are Sarathi (सारथी), a wise, warm, and real-time divine guide for the Sacred Temples of India app.`);
  lines.push(`Your name means "divine charioteer" — just as Lord Krishna guided Arjuna, you guide devotees through India's sacred heritage.`);
  lines.push(`Expertise: temple history, mythology, architecture (Dravidian, Nagara, Vesara, Hoysala), pilgrimage circuits, travel routes, rituals, puja types, festival calendars, darshan timings, dress codes, Sanskrit mantras, temple etiquette, regional cuisines, prasad.`);
  lines.push(`Tone: warm, reverent, knowledgeable — like a learned temple priest who is also a well-travelled guide. Use gentle Sanskrit terms (Namaste, Darshan, Prasad, Tirtha). Keep responses concise but meaningful. Use bullet points or numbered lists for routes/steps. Always end pilgrimage guidance with a brief blessing.`);

  lines.push(`\n--- REAL-TIME CONTEXT ---`);
  lines.push(`Current local time: ${timeCtx.localTime} on ${timeCtx.dayName}, ${timeCtx.dateString}. Greeting style: "${timeCtx.greeting}".`);

  if (userName) lines.push(`User name: ${userName}.`);

  if (geo?.effectiveLocation) {
    lines.push(`User location: lat ${geo.effectiveLocation.latitude.toFixed(4)}, lng ${geo.effectiveLocation.longitude.toFixed(4)} (accuracy ~${Math.round(geo.effectiveLocation.accuracy || 9999)}m).`);
  } else {
    lines.push(`User location: not available currently.`);
  }

  if (panchangCtx) {
    lines.push(`Today's Panchangam: Tithi ${panchangCtx.tithi}, Nakshatra ${panchangCtx.nakshatra}, Moon Rashi ${panchangCtx.rashi}, Masa ${panchangCtx.masa} (${panchangCtx.paksha}), Vara ${panchangCtx.vara}.`);
    lines.push(`Sunrise: ${panchangCtx.sunrise}, Sunset: ${panchangCtx.sunset}.`);
    if (panchangCtx.abhijitMuhurta) lines.push(`Abhijit Muhurta: ${panchangCtx.abhijitMuhurta}.`);
    if (panchangCtx.rahuKala) lines.push(`Rahu Kala: ${panchangCtx.rahuKala}.`);
    if (panchangCtx.festivalsToday?.length) lines.push(`Festivals today: ${panchangCtx.festivalsToday.join(", ")}.`);
    const alert = fmtPanchangAlert(panchangCtx);
    if (alert) lines.push(`Real-time alert: ${alert}`);
  }

  if (currentTemple) {
    lines.push(`Current temple context: ${currentTemple.templeName} in ${currentTemple.townOrCity || currentTemple.stateOrUnionTerritory}.`);
  }

  if (nearestTemples?.length) {
    lines.push(`Nearest temples to user: ${nearestTemples.map(summarizeTemple).join("; ")}.`);
  }

  lines.push(`\n--- RESPONSE FORMAT ---`);
  lines.push(`Respond with a single JSON object inside a markdown code block like this:`);
  lines.push(`\`\`\`json
{
  "text": "Your warm, markdown-formatted response text. Use **bold** for emphasis and emojis where appropriate.",
  "temples": [
    {
      "name": "Temple Name",
      "reason": "Why this temple is relevant",
      "distanceText": "e.g. 2.3km away"
    }
  ],
  "actions": [
    {"label": "Get Directions", "type": "maps", "value": "lat,lng"},
    {"label": "Save Temple", "type": "favorite", "value": "templeId"},
    {"label": "Open Details", "type": "detail", "value": "templeId"}
  ],
  "quickReplies": [
    {"icon": "🛕", "text": "Nearest temples"},
    {"icon": "🕉️", "text": "Tell me a shloka"}
  ],
  "alert": "Optional short auspicious alert or warning to show prominently"
}
\`\`\``);
  lines.push(`Rules for JSON:`);
  lines.push(`- "text" is required. Keep it under 200 words unless the user asks for detail.`);
  lines.push(`- "temples" array is optional. Only include if you mention specific temples.`);
  lines.push(`- "actions" array is optional. Only include actionable next steps.`);
  lines.push(`- "quickReplies" array is optional but encouraged. Provide 2-4 contextual follow-ups.`);
  lines.push(`- "alert" is optional. Use for Panchangam alerts (Rahu Kala, Abhijit, festivals).`);
  lines.push(`- Do not fabricate specific facts you are unsure about. Acknowledge uncertainty gracefully.`);
  lines.push(`- If the user writes in a language other than English, respond in that language.`);

  return lines.join("\n");
}

/* ─── Response Parser ─────────────────────────────────────────────────────── */

export function parseSarathiResponse(rawText) {
  const defaultResult = {
    text: rawText || "🙏 Sarathi could not respond. Please try again.",
    temples: [],
    actions: [],
    quickReplies: [],
    alert: "",
  };
  if (!rawText) return defaultResult;

  // Try to extract JSON from markdown code block
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = codeBlockMatch ? codeBlockMatch[1].trim() : rawText.trim();

  try {
    const parsed = JSON.parse(jsonText);
    return {
      text: parsed.text || rawText,
      temples: Array.isArray(parsed.temples) ? parsed.temples : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies : [],
      alert: parsed.alert || "",
    };
  } catch {
    // If parsing fails, treat the whole thing as plain text
    return { ...defaultResult, text: rawText };
  }
}

/* ─── Voice I/O ───────────────────────────────────────────────────────────── */

export function isSpeechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isTTSSupported() {
  return !!window.speechSynthesis;
}

export function speakText(text, onEnd) {
  if (!window.speechSynthesis) return null;
  // Stop any ongoing speech
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.0;
  utter.pitch = 1.0;
  utter.volume = 1.0;

  // Prefer an Indian English voice if available
  const voices = window.speechSynthesis.getVoices();
  const indian = voices.find((v) => /(en-IN|India|Indian)/i.test(v.lang + " " + v.name));
  const english = voices.find((v) => v.lang.startsWith("en"));
  utter.voice = indian || english || voices[0] || null;

  if (onEnd) utter.onend = onEnd;
  window.speechSynthesis.speak(utter);
  return utter;
}

export function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

export function startListening({ onResult, onError, onEnd, lang = "en-IN" }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    onError?.("Speech recognition not supported in this browser.");
    return null;
  }
  const rec = new SR();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = lang;

  let finalTranscript = "";

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalTranscript += transcript;
      else interim += transcript;
    }
    onResult?.(finalTranscript, interim);
  };

  rec.onerror = (e) => {
    const msg = e.error === "no-speech" ? "No speech detected. Please try again." : `Speech error: ${e.error}`;
    onError?.(msg);
  };

  rec.onend = () => {
    onEnd?.(finalTranscript);
  };

  try {
    rec.start();
  } catch (err) {
    onError?.(err.message);
    return null;
  }
  return rec;
}

export function stopListening(rec) {
  try {
    rec?.stop();
  } catch {}
}

/* ─── Local Data Search (mirrors App.jsx logic) ───────────────────────────── */

export function searchTemples(temples, query) {
  if (!temples || !temples.length || !query) return [];
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 1);
  const scored = temples
    .map((t) => {
      let score = 0;
      const fields = [
        t.templeName,
        t.deityPrimary,
        t.deitySecondary,
        t.townOrCity,
        t.village,
        t.district,
        t.stateOrUnionTerritory,
        t.nearestCity,
        t.architectureStyle,
        t.majorFestivals,
        t.historicalSignificance,
        t.specialNotes,
      ]
        .map((f) => (f || "").toLowerCase());
      const all = fields.join(" ");
      if ((t.templeName || "").toLowerCase().includes(q)) score += 50;
      if (all.includes(q)) score += 20;
      words.forEach((w) => {
        if ((t.templeName || "").toLowerCase().includes(w)) score += 10;
        if ((t.deityPrimary || "").toLowerCase().includes(w)) score += 8;
        if ((t.stateOrUnionTerritory || "").toLowerCase().includes(w)) score += 6;
        if ((t.townOrCity || "").toLowerCase().includes(w)) score += 6;
        if ((t.district || "").toLowerCase().includes(w)) score += 5;
        if (all.includes(w)) score += 2;
      });
      return { temple: t, score };
    })
    .filter((r) => r.score > 0);
  scored.sort((a, b) => b.score - b.score);
  return scored.slice(0, 5).map((r) => r.temple);
}

export function formatTempleData(temple) {
  const lines = [];
  lines.push(`Temple: ${temple.templeName}`);
  if (temple.deityPrimary) lines.push(`Primary Deity: ${temple.deityPrimary}`);
  if (temple.deitySecondary) lines.push(`Secondary Deity: ${temple.deitySecondary}`);
  const loc = [temple.village, temple.townOrCity, temple.district, temple.stateOrUnionTerritory].filter(Boolean).join(", ");
  if (loc) lines.push(`Location: ${loc}`);
  if (temple.latitude && temple.longitude) lines.push(`Coordinates: ${temple.latitude}, ${temple.longitude}`);
  if (temple.nearestCity) lines.push(`Nearest City: ${temple.nearestCity}`);
  if (temple.nearestRailwayStation) lines.push(`Nearest Railway Station: ${temple.nearestRailwayStation}`);
  if (temple.nearestAirport) lines.push(`Nearest Airport: ${temple.nearestAirport}`);
  if (temple.routeSummary) lines.push(`Route: ${temple.routeSummary}`);
  if (temple.darshanTimings) lines.push(`Darshan Timings: ${temple.darshanTimings}`);
  if (temple.majorFestivals) lines.push(`Major Festivals: ${temple.majorFestivals}`);
  if (temple.architectureStyle) lines.push(`Architecture: ${temple.architectureStyle}`);
  if (temple.historicalSignificance) lines.push(`Historical Significance: ${temple.historicalSignificance}`);
  if (temple.specialNotes) lines.push(`Special Notes: ${temple.specialNotes}`);
  return lines.join("\n");
}

/* ─── Markdown Renderer helper (returns React-like structure data) ─────────── */

export function renderMd(text) {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    const rendered = parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) {
        return { type: "bold", text: p.slice(2, -2), key: `${li}-${i}` };
      }
      if (p.startsWith("`") && p.endsWith("`")) {
        return { type: "code", text: p.slice(1, -1), key: `${li}-${i}` };
      }
      return { type: "text", text: p, key: `${li}-${i}` };
    });
    return { lineIndex: li, parts: rendered, isLast: li === lines.length - 1 };
  });
}

export { GEMINI_KEY };
