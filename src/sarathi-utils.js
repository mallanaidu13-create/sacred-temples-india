/**
 * sarathi-utils.js — Real-time divine intelligence for Sarathi
 * Provides context-aware prompts, voice I/O, and structured response parsing.
 */

import { haversineKm } from "./useGeo.js";
import { computePanchangam, DEFAULT_LOC, julianDay, fmtTime } from "./LivePanchangam.jsx";
import { evaluateFestivals } from "./festival-rules.js";
import { findAbhijitMuhurta, findRahuKala } from "./kala-chakra-logic.js";
import {
  TITHI_NAMES,
  NAKSHATRA_NAMES,
  RASHI_NAMES,
  MASA_NAMES,
  YOGA_NAMES,
  VARA_NAMES,
} from "./panchangam-i18n.js";

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
    const now = new Date();
    const p = computePanchangam(now, loc);
    const nowJD = julianDay(now);
    const sunriseJD = p.dayStartJD;
    const sunsetJD = sunriseJD + (p.sunset - p.sunrise) / 24;
    const varaIdx = p.varaIdx; // 0=Sun ... 6=Sat

    const abhijit = findAbhijitMuhurta(sunriseJD, sunsetJD, loc.tz);
    const rahu = findRahuKala(sunriseJD, sunsetJD, varaIdx, loc.tz);

    const inRahuKala = rahu && nowJD >= rahu.start && nowJD < rahu.end;
    const inAbhijit = abhijit && nowJD >= abhijit.start && nowJD < abhijit.end;

    // Festival check (using sunrise-based indices as in LivePanchangam)
    const festivals = evaluateFestivals(
      { tithiNum: p.tithiNum, masa: p.masaIdx, sunRashiIdx: p.rashiSunIdx, nakshatraIdx: Math.floor(p.nakshatraIdx) },
      p.masaIdx,
      p.tithiNum,
      p.rashiSunIdx,
      Math.floor(p.nakshatraIdx)
    );
    const todayFestivals = festivals
      .map((f) => f.names?.en || f.name || "Unknown festival");

    return {
      tithi: TITHI_NAMES.en[p.tithiIdx] || "",
      nakshatra: NAKSHATRA_NAMES.en[p.nakshatraIdx] || "",
      rashi: RASHI_NAMES.en[p.rashiMoonIdx] || "",
      masa: MASA_NAMES.en[p.masaIdx] || "",
      paksha: p.paksha,
      yoga: YOGA_NAMES.en[p.yogaIdx] || "",
      vara: VARA_NAMES.en[p.varaIdx] || "",
      sunrise: fmtTime(p.sunrise),
      sunset: fmtTime(p.sunset),
      abhijitMuhurta: abhijit ? `${abhijit.startStr} – ${abhijit.endStr}` : null,
      rahuKala: rahu ? `${rahu.startStr} – ${rahu.endStr}` : null,
      inRahuKala,
      inAbhijit,
      festivalsToday: todayFestivals,
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
  scored.sort((a, b) => b.score - a.score);
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

/* ─── Local Fallback Engine ──────────────────────────────────────────────── */

export function isQuotaError(errText) {
  if (!errText) return false;
  const t = errText.toLowerCase();
  return (
    t.includes("quota") ||
    t.includes("rate limit") ||
    t.includes("rate-limit") ||
    t.includes("exceeded your current quota") ||
    t.includes("limit: 0") ||
    t.includes("429")
  );
}

function matchIntent(query, keywords) {
  const q = query.toLowerCase();
  return keywords.some((k) => q.includes(k));
}

const JYOTIRLINGAS = [
  "Somnath (Gujarat)", "Mallikarjuna (Andhra Pradesh)", "Mahakaleshwar (Madhya Pradesh)",
  "Omkareshwar (Madhya Pradesh)", "Kedarnath (Uttarakhand)", "Bhimashankar (Maharashtra)",
  "Kashi Vishwanath (Uttar Pradesh)", "Trimbakeshwar (Maharashtra)", "Baidyanath (Jharkhand)",
  "Nageshwar (Gujarat)", "Rameshwaram (Tamil Nadu)", "Grishneshwar (Maharashtra)"
];

const SHAKTI_PEETHAS_COUNT = 51;
const DIVYA_DESAMS_COUNT = 108;
const CHAR_DHAM = ["Badrinath (Uttarakhand)", "Dwarka (Gujarat)", "Puri (Odisha)", "Rameshwaram (Tamil Nadu)"];
const PANCHA_BHUTA_STALAS = [
  "Ekambareswarar (Kanchipuram) — Earth",
  "Jambukeswarar (Tiruvanaikaval) — Water",
  "Annamalaiyar (Tiruvannamalai) — Fire",
  "Kalahasteeswarar (Srikalahasti) — Air",
  "Chidambaram Natarajar (Chidambaram) — Ether"
];

export function generateLocalSarathiResponse(query, {
  userName,
  timeCtx,
  panchangCtx,
  nearestTemples,
  currentTemple,
  matchedTemples,
}) {
  const q = query.trim();
  const ql = q.toLowerCase();

  // ── Helper to build result
  const make = (text, { temples = [], actions = [], quickReplies = [], alert = "" } = {}) => ({
    text,
    temples,
    actions,
    quickReplies,
    alert,
  });

  // ── Greeting / identity
  if (matchIntent(q, ["hello", "hi", "namaste", "who are you", "what is your name", "sarathi", "guide"])) {
    let base = timeCtx?.greeting || "Namaste 🙏";
    if (userName) base += `, ${userName}`;
    base += ". I am **Sarathi**, your divine guide to the sacred temples of Bhārata.";
    if (panchangCtx) {
      base += `\n\nToday is **${panchangCtx.vara}**, **${panchangCtx.paksha} ${panchangCtx.tithi}** in **${panchangCtx.masa}** masa. The Nakshatra is **${panchangCtx.nakshatra}** and Moon Rashi is **${panchangCtx.rashi}**.`;
      if (panchangCtx.festivalsToday?.length) base += `\n\n🎉 Today we celebrate **${panchangCtx.festivalsToday.join(", ")}**.`;
      if (panchangCtx.inAbhijit) base += `\n\n🌟 It is currently **Abhijit Muhurta** — highly auspicious for new beginnings.`;
      else if (panchangCtx.inRahuKala) base += `\n\n⚠️ Please note: we are currently in **Rahu Kala**. It is best to avoid starting new ventures.`;
    }
    return make(base, {
      alert: panchangCtx?.inRahuKala ? "⚠️ Rahu Kala is active now" : panchangCtx?.inAbhijit ? "🌟 Abhijit Muhurta now" : "",
      quickReplies: [
        { icon: "🕉️", text: "Tell me a shloka" },
        { icon: "🛕", text: "Nearest temples" },
        { icon: "📿", text: "What are the 12 Jyotirlingas?" },
        { icon: "🎪", text: "Festivals today" },
      ],
    });
  }

  // ── Panchangam queries
  if (matchIntent(q, ["panchang", "panchangam", "tithi", "nakshatra", "rahu kala", "abhijit", "muhurta", "sunrise", "sunset", "yoga", "vara", "masa", "rashi"])) {
    if (!panchangCtx) {
      return make("🙏 I do not have the Panchangam data at this moment. Please try again shortly.");
    }
    let text = "**Today's Panchangam**\n\n";
    text += `• **Tithi:** ${panchangCtx.paksha} ${panchangCtx.tithi}\n`;
    text += `• **Nakshatra:** ${panchangCtx.nakshatra}\n`;
    text += `• **Moon Rashi:** ${panchangCtx.rashi}\n`;
    text += `• **Yoga:** ${panchangCtx.yoga}\n`;
    text += `• **Vara:** ${panchangCtx.vara}\n`;
    text += `• **Masa:** ${panchangCtx.masa}\n`;
    text += `• **Sunrise:** ${panchangCtx.sunrise}\n`;
    text += `• **Sunset:** ${panchangCtx.sunset}`;
    if (panchangCtx.abhijitMuhurta) text += `\n• **Abhijit Muhurta:** ${panchangCtx.abhijitMuhurta}`;
    if (panchangCtx.rahuKala) text += `\n• **Rahu Kala:** ${panchangCtx.rahuKala}`;
    if (panchangCtx.festivalsToday?.length) text += `\n• **Festivals:** ${panchangCtx.festivalsToday.join(", ")}`;
    text += "\n\nMay your day be filled with **Shubh Karma** and divine blessings. 🙏";
    return make(text, {
      alert: panchangCtx.inRahuKala ? "⚠️ Rahu Kala is active now" : panchangCtx.inAbhijit ? "🌟 Abhijit Muhurta now" : "",
      quickReplies: [
        { icon: "🕐", text: "When is Abhijit Muhurta today?" },
        { icon: "⚠️", text: "When is Rahu Kala today?" },
        { icon: "🎪", text: "Festivals today" },
      ],
    });
  }

  // ── Festival today
  if (matchIntent(q, ["festival", "festivals today", "today festival", "celebration"])) {
    if (!panchangCtx) return make("🙏 I am unable to fetch the festival calendar right now.");
    if (panchangCtx.festivalsToday?.length) {
      return make(`🎉 **Today we celebrate:** ${panchangCtx.festivalsToday.join(", ")}.\n\nMay this auspicious day bring you peace, prosperity, and divine grace. 🙏`, {
        quickReplies: [
          { icon: "🛕", text: "Nearest temples" },
          { icon: "🕉️", text: "Tell me a shloka" },
        ],
      });
    }
    return make("There are no major festivals today according to the Panchangam. It is still a beautiful day for Darshan and quiet contemplation. 🙏", {
      quickReplies: [
        { icon: "🛕", text: "Nearest temples" },
        { icon: "🕉️", text: "Tell me a shloka" },
      ],
    });
  }

  // ── Rahu Kala / Abhijit specific
  if (matchIntent(q, ["rahu kala"])) {
    if (!panchangCtx?.rahuKala) return make("🙏 Rahu Kala data is not available at the moment.");
    let text = `**Rahu Kala today:** ${panchangCtx.rahuKala}.\n\nThis period is considered inauspicious for beginning new ventures, signing contracts, or making major purchases. It is, however, an excellent time for prayer, meditation, and chanting mantras.`;
    if (panchangCtx.inRahuKala) text += "\n\n⚠️ **We are currently in Rahu Kala.**";
    text += "\n\n*Om Namah Shivaya.* 🙏";
    return make(text, {
      alert: panchangCtx.inRahuKala ? "⚠️ Rahu Kala is active now" : "",
      quickReplies: [
        { icon: "🌟", text: "When is Abhijit Muhurta?" },
        { icon: "🕉️", text: "Tell me a shloka" },
      ],
    });
  }

  if (matchIntent(q, ["abhijit"])) {
    if (!panchangCtx?.abhijitMuhurta) return make("🙏 Abhijit Muhurta data is not available at the moment.");
    let text = `**Abhijit Muhurta today:** ${panchangCtx.abhijitMuhurta}.\n\nAbhijit Muhurta is the most auspicious time of the day — ideal for starting new ventures, travel, interviews, and important decisions. It is ruled by Vishnu as the victor over darkness.`;
    if (panchangCtx.inAbhijit) text += "\n\n🌟 **We are currently in Abhijit Muhurta.** Make the most of it!";
    text += "\n\n*Shubham Bhavatu.* 🙏";
    return make(text, {
      alert: panchangCtx.inAbhijit ? "🌟 Abhijit Muhurta now" : "",
      quickReplies: [
        { icon: "⚠️", text: "When is Rahu Kala?" },
        { icon: "🛕", text: "Nearest temples" },
      ],
    });
  }

  // ── Nearest temples / near me
  if (matchIntent(q, ["near me", "nearest temple", "nearby temple", "close temple", "around me", "sacred places near"])) {
    const list = nearestTemples?.length ? nearestTemples : matchedTemples;
    if (!list?.length) {
      return make("🙏 I could not find any temples near your current location. Try enabling location access, or ask me about a specific city or pilgrimage circuit.", {
        quickReplies: [
          { icon: "🗺️", text: "Plan a pilgrimage route" },
          { icon: "🛕", text: "Famous temples to visit" },
        ],
      });
    }
    let text = "**Nearest sacred temples to you:**\n\n";
    const templesCards = [];
    list.slice(0, 4).forEach((t, i) => {
      text += `${i + 1}. **${t.templeName}**`;
      if (t.deityPrimary) text += ` — ${t.deityPrimary}`;
      if (t.townOrCity) text += `, ${t.townOrCity}`;
      if (t.distanceKm != null) text += ` (${fmtDist(t.distanceKm)})`;
      text += "\n";
      templesCards.push({
        name: t.templeName,
        reason: t.deityPrimary ? `Deity: ${t.deityPrimary}` : "Sacred temple",
        distanceText: t.distanceKm != null ? fmtDist(t.distanceKm) : "",
      });
    });
    text += "\nMay your journey to these Tirthas be blessed. 🙏";
    const actions = [];
    if (list[0]?.latitude != null && list[0]?.longitude != null) {
      actions.push({ label: "Get Directions", type: "maps", value: `${list[0].latitude},${list[0].longitude}` });
    }
    return make(text, {
      temples: templesCards,
      actions,
      quickReplies: [
        { icon: "🕐", text: "Darshan timings" },
        { icon: "🗺️", text: "How to reach there" },
        { icon: "🕉️", text: "Tell me a shloka" },
      ],
    });
  }

  // ── Matched temples from database (generic query that matched records)
  if (matchedTemples?.length > 0 && !currentTemple) {
    const t = matchedTemples[0];
    let text = `**🛕 ${t.templeName}**\n\n`;
    if (t.deityPrimary) text += `**Primary Deity:** ${t.deityPrimary}\n`;
    if (t.deitySecondary) text += `**Secondary Deity:** ${t.deitySecondary}\n`;
    const loc = [t.townOrCity, t.district, t.stateOrUnionTerritory].filter(Boolean).join(", ");
    if (loc) text += `**Location:** ${loc}\n`;
    if (t.darshanTimings) text += `**Darshan Timings:** ${t.darshanTimings}\n`;
    if (t.majorFestivals) text += `**Major Festivals:** ${t.majorFestivals}\n`;
    if (t.architectureStyle) text += `**Architecture:** ${t.architectureStyle}\n`;
    if (t.historicalSignificance) text += `**History:** ${t.historicalSignificance}\n`;
    if (t.routeSummary) text += `**Route:** ${t.routeSummary}\n`;
    if (t.specialNotes) text += `**Special Notes:** ${t.specialNotes}\n`;
    text += "\n*May your Darshan be fulfilling and your heart be filled with Bhakti.* 🙏";
    const templesCards = [{ name: t.templeName, reason: t.deityPrimary ? `Deity: ${t.deityPrimary}` : "Sacred temple" }];
    const actions = [];
    if (t.latitude != null && t.longitude != null) actions.push({ label: "Get Directions", type: "maps", value: `${t.latitude},${t.longitude}` });
    if (t.id || t.templeName) actions.push({ label: "Open Details", type: "detail", value: t.id || t.templeName });
    return make(text, {
      temples: templesCards,
      actions,
      quickReplies: [
        { icon: "🗺️", text: "How to reach" },
        { icon: "🎪", text: "Festivals here" },
        { icon: "🕉️", text: "Tell me a shloka" },
      ],
    });
  }

  // ── Current temple context
  if (currentTemple) {
    let text = `**🛕 ${currentTemple.templeName}**\n\n`;
    if (currentTemple.deityPrimary) text += `**Primary Deity:** ${currentTemple.deityPrimary}\n`;
    if (currentTemple.deitySecondary) text += `**Secondary Deity:** ${currentTemple.deitySecondary}\n`;
    const loc = [currentTemple.townOrCity, currentTemple.district, currentTemple.stateOrUnionTerritory].filter(Boolean).join(", ");
    if (loc) text += `**Location:** ${loc}\n`;
    if (currentTemple.darshanTimings) text += `**Darshan Timings:** ${currentTemple.darshanTimings}\n`;
    if (currentTemple.majorFestivals) text += `**Major Festivals:** ${currentTemple.majorFestivals}\n`;
    if (currentTemple.architectureStyle) text += `**Architecture:** ${currentTemple.architectureStyle}\n`;
    if (currentTemple.historicalSignificance) text += `**History:** ${currentTemple.historicalSignificance}\n`;
    if (currentTemple.routeSummary) text += `**Route:** ${currentTemple.routeSummary}\n`;
    if (currentTemple.specialNotes) text += `**Special Notes:** ${currentTemple.specialNotes}\n`;
    text += "\n*May the blessings of this sacred space uplift your soul.* 🙏";
    const templesCards = [{ name: currentTemple.templeName, reason: currentTemple.deityPrimary ? `Deity: ${currentTemple.deityPrimary}` : "Sacred temple" }];
    const actions = [];
    if (currentTemple.latitude != null && currentTemple.longitude != null) actions.push({ label: "Get Directions", type: "maps", value: `${currentTemple.latitude},${currentTemple.longitude}` });
    return make(text, {
      temples: templesCards,
      actions,
      quickReplies: [
        { icon: "🗺️", text: "How to reach" },
        { icon: "🎪", text: "Festivals here" },
        { icon: "🕉️", text: "Tell me a shloka" },
      ],
    });
  }

  // ── 12 Jyotirlingas
  if (matchIntent(q, ["jyotirlinga", "12 jyotirlinga", "jyotirlingas"])) {
    let text = "**The 12 Jyotirlingas** are the most sacred abodes of Lord Shiva, where He appeared as a pillar of light.\n\n";
    JYOTIRLINGAS.forEach((j, i) => { text += `${i + 1}. ${j}\n`; });
    text += "\n*Chanting the Dwadasha Jyotirlinga Stotram brings spiritual merit and liberation.* 🙏";
    return make(text, {
      quickReplies: [
        { icon: "📿", text: "Dwadasha Jyotirlinga Stotram" },
        { icon: "🛕", text: "Nearest temples" },
        { icon: "🗺️", text: "Plan a pilgrimage route" },
      ],
    });
  }

  // ── 51 Shakti Peethas
  if (matchIntent(q, ["shakti peetha", "shakti peethas", "51 shakti"])) {
    return make(`There are **${SHAKTI_PEETHAS_COUNT} Shakti Peethas** across the Indian subcontinent — sacred seats of the Divine Mother where parts of Devi Sati's body are believed to have fallen.\n\nProminent ones include **Kamakhya** (Assam), **Kalighat** (West Bengal), **Vaishno Devi** (Jammu & Kashmir), **Meenakshi** (Tamil Nadu), and **Tulja Bhavani** (Maharashtra).\n\n*May Devi's grace protect you always.* 🙏`, {
      quickReplies: [
        { icon: "🛕", text: "Nearest temples" },
        { icon: "🕉️", text: "Tell me a shloka" },
      ],
    });
  }

  // ── 108 Divya Desams
  if (matchIntent(q, ["divya desam", "divya desams", "108 divya"])) {
    return make(`The **${DIVYA_DESAMS_COUNT} Divya Desams** are the holiest Vishnu temples praised by the 12 Alvar saints in the Naalayira Divya Prabandham. Most are in Tamil Nadu, with others in Kerala, Andhra Pradesh, Gujarat, Uttar Pradesh, and Nepal.\n\n*Srirangam, Tirupati, Kanchipuram, and Badrinath* are among the most revered.\n\n*May your Bhakti deepen with every Darshan.* 🙏`, {
      quickReplies: [
        { icon: "🛕", text: "Nearest temples" },
        { icon: "🗺️", text: "Plan a pilgrimage route" },
      ],
    });
  }

  // ── Char Dham
  if (matchIntent(q, ["char dham", "chardham", "four dhams"])) {
    let text = "**Char Dham** — the four sacred abodes:\n\n";
    CHAR_DHAM.forEach((d, i) => { text += `${i + 1}. ${d}\n`; });
    text += "\nTraditionally, the pilgrimage is undertaken in the order: **West (Dwarka) → South (Rameshwaram) → East (Puri) → North (Badrinath).**\n\n*May your Tirtha Yatra be safe and spiritually fulfilling.* 🙏";
    return make(text, {
      quickReplies: [
        { icon: "🗺️", text: "Plan a pilgrimage route" },
        { icon: "🛕", text: "Nearest temples" },
      ],
    });
  }

  // ── Pancha Bhuta Stalas
  if (matchIntent(q, ["pancha bhuta", "panchabhuta", "five elements"])) {
    let text = "**Pancha Bhuta Stalas** — temples representing the five elements:\n\n";
    PANCHA_BHUTA_STALAS.forEach((t, i) => { text += `${i + 1}. ${t}\n`; });
    text += "\nAll five are sacred Shaivite shrines in Tamil Nadu and Andhra Pradesh.\n\n*May the five elements bless your path.* 🙏";
    return make(text, {
      quickReplies: [
        { icon: "🛕", text: "Nearest temples" },
        { icon: "🕉️", text: "Tell me a shloka" },
      ],
    });
  }

  // ── Shloka / mantra / peace
  if (matchIntent(q, ["shloka", "shlok", "mantra", "peace", "chant", "prayer"])) {
    const shlokas = [
      { title: "Shanti Mantra", text: "*Om Sarve Bhavantu Sukhinah*\n*Sarve Santu Niramayah*\n*Sarve Bhadrani Pashyantu*\n*Ma Kashchit Duhkha Bhagbhavet*\n*Om Shantih Shantih Shantih*" },
      { title: "Gayatri Mantra", text: "*Om Bhur Bhuvaḥ Svaḥ*\n*Tat Savitur Vareṇyaṃ*\n*Bhargo Devasya Dhīmahi*\n*Dhiyo Yo Naḥ Prachodayāt*" },
      { title: "Maha Mrityunjaya Mantra", text: "*Om Tryambakam Yajamahe*\n*Sugandhim Pushtivardhanam*\n*Urvarukamiva Bandhanan*\n*Mrityor Mukshiya Maamritat*" },
    ];
    const pick = shlokas[Math.floor(Math.random() * shlokas.length)];
    return make(`**${pick.title}**\n\n${pick.text}\n\nChant this with devotion and a calm mind. *May peace and divine grace be yours.* 🙏`, {
      quickReplies: [
        { icon: "📿", text: "Another shloka" },
        { icon: "🛕", text: "Nearest temples" },
        { icon: "🕉️", text: "Teach me a mantra" },
      ],
    });
  }

  // ── Pilgrimage route / plan
  if (matchIntent(q, ["route", "pilgrimage", "plan", "itinerary", "travel", "how to reach", "directions"])) {
    return make(`**Planning a sacred pilgrimage** is a beautiful intention. Here are some tips:\n\n1. **Choose your circuit** — Char Dham, 12 Jyotirlingas, Shakti Peethas, or Tamil Nadu's Navagraha/Divya Desam trails.\n2. **Best seasons** — October to March for North India; year-round for South India (avoid peak summer).\n3. **Travel modes** — Indian Railways connects most major Tirthas. For remote temples, hire local taxis or join organized Yatra buses.\n4. **Stay** — Many temples offer budget Dharmashalas; book in advance during festivals.\n5. **Pack light** — modest clothing, a small puja kit, water, and an open heart.\n\n*May your Tirtha Yatra transform your soul.* 🙏`, {
      quickReplies: [
        { icon: "🗺️", text: "Char Dham route" },
        { icon: "🛕", text: "12 Jyotirlingas" },
        { icon: "🛕", text: "Nearest temples" },
      ],
    });
  }

  // ── Temple etiquette / dress code / visit tips
  if (matchIntent(q, ["etiquette", "dress code", "what to wear", "visit tips", "darshan tips", "rules", "guidelines", "offering"])) {
    return make(`**Temple Etiquette & Darshan Tips**\n\n• **Dress modestly** — traditional Indian attire is best; avoid shorts, sleeveless tops, and leather.\n• **Remove footwear** before entering the sanctum.\n• **Maintain silence** inside the Garbha Griha and avoid photography unless permitted.\n• **Prasad & offerings** — flowers, coconuts, and camphor are common. Avoid non-vegetarian food before visiting.\n• **Head coverings** may be required in some temples (especially Gurudwaras and certain Devi shrines).\n• **Queue patiently** — early mornings and weekdays are less crowded.\n\n*May your visit be filled with reverence and divine blessings.* 🙏`, {
      quickReplies: [
        { icon: "🛕", text: "Nearest temples" },
        { icon: "🕐", text: "Darshan timings" },
        { icon: "🕉️", text: "Tell me a shloka" },
      ],
    });
  }

  // ── Default graceful fallback
  let text = "🙏 I am currently answering from **local sacred wisdom**, as the cloud connection is resting.\n\n";
  text += "I can help you with:\n";
  text += "• Today's **Panchangam** (Tithi, Nakshatra, Rahu Kala, Abhijit Muhurta)\n";
  text += "• **Nearest temples** and directions\n";
  text += "• **12 Jyotirlingas**, **51 Shakti Peethas**, **108 Divya Desams**, **Char Dham**\n";
  text += "• **Shlokas**, **mantras**, and temple etiquette\n";
  text += "• **Pilgrimage routes** and travel guidance\n\n";
  text += "Please ask me about any of these, and I shall guide you with devotion.";
  if (panchangCtx?.inRahuKala) text += "\n\n⚠️ *Note: Rahu Kala is active right now.*";
  else if (panchangCtx?.inAbhijit) text += "\n\n🌟 *Note: Abhijit Muhurta is active right now — an auspicious time!*";
  text += "\n\n*Om Shantih Shantih Shantih.* 🙏";
  return make(text, {
    alert: panchangCtx?.inRahuKala ? "⚠️ Rahu Kala is active now" : panchangCtx?.inAbhijit ? "🌟 Abhijit Muhurta now" : "",
    quickReplies: [
      { icon: "🕉️", text: "Tell me a shloka" },
      { icon: "🛕", text: "Nearest temples" },
      { icon: "📿", text: "What are the 12 Jyotirlingas?" },
      { icon: "🎪", text: "Festivals today" },
    ],
  });
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
