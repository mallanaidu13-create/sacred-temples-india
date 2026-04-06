/**
 * sankalpa-logic.js — Living Sankalpa Engine
 * Generates authentic Vedic Sankalpas using live Panchangam, location, and temple data.
 */

import { computePanchangam, DEFAULT_LOC } from "./LivePanchangam.jsx";
import {
  TITHI_NAMES,
  NAKSHATRA_NAMES,
  MASA_NAMES,
  VARA_NAMES,
} from "./panchangam-i18n.js";
import { findAbhijitMuhurta, julianDay } from "./kala-chakra-logic.js";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

/* ─── Intention Classification ───────────────────────────────────────────── */

const INTENTION_CATEGORIES = [
  {
    id: "wealth",
    keywords: ["money", "wealth", "rich", "business", "profit", "income", "job", "career", "success", "prosperity", "lakshmi", "finance", "loan", "debt", "property"],
    deity: "Mahālakṣmī",
    deityEn: "Goddess Lakshmi",
    seedMantra: "Oṃ Śrīṃ Mahālakṣmyai Namaḥ",
    template: (ctx) => `Oṃ Śrī Mahālakṣmyai Namaḥ ।
${ctx.locationLine}
${ctx.timeLine}
${ctx.selfLine}
${ctx.intentionLine}
Śrī Mahālakṣmī prasāda-siddhyarthaṃ imaṃ saṅkalpaṃ karomi ।`,
  },
  {
    id: "health",
    keywords: ["health", "heal", "disease", "illness", "sick", "recovery", "medicine", "doctor", "hospital", "cure", "pain", "body", "wellness"],
    deity: "Dhanvantari / Lord Śiva",
    deityEn: "Lord Dhanvantari",
    seedMantra: "Oṃ Namaḥ Śivāya",
    template: (ctx) => `Oṃ Śrī Dhanvantaraye Namaḥ ।
${ctx.locationLine}
${ctx.timeLine}
${ctx.selfLine}
${ctx.intentionLine}
Ārogya-siddhyarthaṃ Bhagavad-kṛpā-prāptaye imaṃ saṅkalpaṃ karomi ।`,
  },
  {
    id: "marriage",
    keywords: ["marriage", "wedding", "spouse", "husband", "wife", "partner", "relationship", "love", "union", "married", "matrimony", "groom", "bride"],
    deity: "Pārvatī-Pārameśvara",
    deityEn: "Lord Shiva and Goddess Parvati",
    seedMantra: "Oṃ Gaurī Śaṅkarābhyāṃ Namaḥ",
    template: (ctx) => `Oṃ Śrī Gaurī-Pārameśvarābhyāṃ Namaḥ ।
${ctx.locationLine}
${ctx.timeLine}
${ctx.selfLine}
${ctx.intentionLine}
Subha-vivāha-siddhyarthaṃ imaṃ saṅkalpaṃ karomi ।`,
  },
  {
    id: "education",
    keywords: ["study", "exam", "education", "knowledge", "wisdom", "school", "college", "university", "degree", "student", "learning", "competition", " Saraswati"],
    deity: "Sarasvatī",
    deityEn: "Goddess Saraswati",
    seedMantra: "Oṃ Aiṃ Sarasvatyai Namaḥ",
    template: (ctx) => `Oṃ Śrī Sarasvatyai Namaḥ ।
${ctx.locationLine}
${ctx.timeLine}
${ctx.selfLine}
${ctx.intentionLine}
Vidya-vijaya-siddhyarthaṃ imaṃ saṅkalpaṃ karomi ।`,
  },
  {
    id: "travel",
    keywords: ["travel", "journey", "trip", " abroad", "flight", "visa", "migration", "move", "settle", "safe", "return"],
    deity: "Hanumān",
    deityEn: "Lord Hanuman",
    seedMantra: "Oṃ Śrī Hanumate Namaḥ",
    template: (ctx) => `Oṃ Śrī Hanumate Namaḥ ।
${ctx.locationLine}
${ctx.timeLine}
${ctx.selfLine}
${ctx.intentionLine}
Akhaṇḍa-yātrā-saukhyārthaṃ imaṃ saṅkalpaṃ karomi ।`,
  },
  {
    id: "spirituality",
    keywords: ["god", "spiritual", "meditation", "yoga", "liberation", "moksha", "devotion", "bhakti", "peace", "enlightenment", "dharma", "truth", "guru"],
    deity: "Śrī Kṛṣṇa / Īśvara",
    deityEn: "Lord Krishna",
    seedMantra: "Oṃ Namo Bhagavate Vāsudevāya",
    template: (ctx) => `Oṃ Namo Bhagavate Vāsudevāya ।
${ctx.locationLine}
${ctx.timeLine}
${ctx.selfLine}
${ctx.intentionLine}
Ādhyātmika-siddhyarthaṃ Bhagavat-kṛpā-prāptaye imaṃ saṅkalpaṃ karomi ।`,
  },
  {
    id: "new_venture",
    keywords: ["start", "begin", "new", "venture", "project", "company", "shop", "office", "opening", "inauguration", "griha-pravesha", "house", "home", "construction"],
    deity: "Vināyaka",
    deityEn: "Lord Ganesha",
    seedMantra: "Oṃ Gaṃ Gaṇapataye Namaḥ",
    template: (ctx) => `Oṃ Śrī Gaṇeśāya Namaḥ ।
${ctx.locationLine}
${ctx.timeLine}
${ctx.selfLine}
${ctx.intentionLine}
Vighna-vināśana-siddhyarthaṃ imaṃ saṅkalpaṃ karomi ।`,
  },
  {
    id: "children",
    keywords: ["child", "baby", "pregnant", "pregnancy", "son", "daughter", "kid", "family", "progeny", "childbirth", "fertility"],
    deity: "Bāla Kṛṣṇa / Santāna Gopāla",
    deityEn: "Lord Krishna as Santana Gopala",
    seedMantra: "Oṃ Klīṃ Kṛṣṇāya Namaḥ",
    template: (ctx) => `Oṃ Śrī Santāna-Gopālāya Namaḥ ।
${ctx.locationLine}
${ctx.timeLine}
${ctx.selfLine}
${ctx.intentionLine}
Santāna-saubhāgya-siddhyarthaṃ imaṃ saṅkalpaṃ karomi ।`,
  },
];

const DEFAULT_CATEGORY = {
  id: "general",
  deity: "Īśvara",
  deityEn: "The Supreme Divine",
  seedMantra: "Oṃ Tat Sat",
  template: (ctx) => `Oṃ Śrī Īśvarāya Namaḥ ।
${ctx.locationLine}
${ctx.timeLine}
${ctx.selfLine}
${ctx.intentionLine}
Sarva-kalyāṇa-siddhyarthaṃ imaṃ saṅkalpaṃ karomi ।`,
};

export function classifyIntention(text) {
  const t = text.toLowerCase();
  for (const cat of INTENTION_CATEGORIES) {
    if (cat.keywords.some((k) => t.includes(k))) return cat;
  }
  return DEFAULT_CATEGORY;
}

/* ─── Panchangam Context for Sankalpa ─────────────────────────────────────── */

export function buildSankalpaContext(loc = DEFAULT_LOC) {
  try {
    const now = new Date();
    const p = computePanchangam(now, loc);
    const tithi = TITHI_NAMES.en[p.tithiIdx] || "";
    const nakshatra = NAKSHATRA_NAMES.en[p.nakshatraIdx] || "";
    const masa = MASA_NAMES.en[p.masaIdx] || "";
    const vara = VARA_NAMES.en[p.varaIdx] || "";

    const sunriseJD = p.dayStartJD;
    const sunsetJD = p.dayEndJD;
    const abhijit = findAbhijitMuhurta(sunriseJD, sunsetJD, loc.tz);

    return {
      tithi,
      nakshatra,
      masa,
      vara,
      paksha: p.paksha,
      samvatsara: p.samvatsara || "",
      yoga: p.yoga?.name || "",
      sunrise: p.sunrise,
      sunset: p.sunset,
      abhijitStartStr: abhijit?.startStr || "",
      abhijitEndStr: abhijit?.endStr || "",
    };
  } catch (e) {
    return null;
  }
}

/* ─── Temple Matching ─────────────────────────────────────────────────────── */

const DEITY_KEYWORDS = {
  "Mahālakṣmī": ["lakshmi", "mahalakshmi", "wealth", "prosperity"],
  "Sarasvatī": ["saraswati", "knowledge", "education", "wisdom"],
  "Vināyaka": ["ganesha", "ganapati", "vinayaka", "new", "beginning"],
  "Śrī Kṛṣṇa": ["krishna", "vasudeva", "gopala"],
  "Pārvatī-Pārameśvara": ["shiva", "parvati", "marriage", "union"],
  "Hanumān": ["hanuman", "anjani", "travel", "protection"],
  "Dhanvantari": ["dhanvantari", "health", "healing"],
};

export function findBestTemple(temples, category) {
  if (!temples?.length) return null;

  // Try direct deity match first
  const targetDeity = category.deityEn.toLowerCase();
  const direct = temples.find((t) =>
    t.deityPrimary && t.deityPrimary.toLowerCase().includes(targetDeity.split(" ")[0])
  );
  if (direct) return direct;

  // Try keyword match on deity
  const keywords = DEITY_KEYWORDS[category.deity] || category.keywords || [];
  for (const kw of keywords) {
    const match = temples.find((t) =>
      t.deityPrimary?.toLowerCase().includes(kw) ||
      t.templeName?.toLowerCase().includes(kw) ||
      t.specialNotes?.toLowerCase().includes(kw)
    );
    if (match) return match;
  }

  // Fallback to any famous temple (heuristic: longer description = more data)
  const sorted = [...temples]
    .filter((t) => t.deityPrimary)
    .sort((a, b) => (b.historicalSignificance?.length || 0) - (a.historicalSignificance?.length || 0));
  return sorted[0] || temples[0];
}

/* ─── Location Formatter ──────────────────────────────────────────────────── */

export function formatLocationLine(loc) {
  if (!loc) return "Bhārata-kṣetre";
  if (loc.name && loc.name !== "Your Location") return `${loc.name.split(",")[0]}-kṣetre`;
  if (loc.lat != null && loc.lng != null) {
    // Use coordinates as a rough region if no city name
    return `Bhārata-kṣetre (${loc.lat.toFixed(2)}°, ${loc.lng.toFixed(2)}°)`;
  }
  return "Bhārata-kṣetre";
}

/* ─── Local Sankalpa Generator (works without API) ────────────────────────── */

export function generateLocalSankalpa(intentionText, { panchangCtx, location, temples }) {
  const cat = classifyIntention(intentionText);
  const locLine = formatLocationLine(location);

  let timeLine = "Asmin śubha-kāle";
  if (panchangCtx) {
    timeLine = `Asmin ${panchangCtx.samvatsara} nāma-saṃvatsare, ${panchangCtx.masa}-māse, ${panchangCtx.paksha}-pakshe, ${panchangCtx.tithi}-tithau, ${panchangCtx.nakshatra}-nakṣatre, ${panchangCtx.vara}-vāsare`;
  }

  const ctx = {
    locationLine: `Śrī ${locLine},`,
    timeLine: `${timeLine},`,
    selfLine: "śrī bhagavad-kṛpā-prāptaye aham",
    intentionLine: `"${intentionText}" iti arthaṃ,`,
  };

  const sankalpa = cat.template(ctx).trim();

  const temple = findBestTemple(temples, cat);
  let templeName = temple ? temple.templeName : defaultTempleForCategory(cat);
  if (temple && temple.townOrCity) templeName += `, ${temple.townOrCity}`;

  let muhurta = "Abhijit Muhurta or any Shukla Paksha day";
  if (panchangCtx?.abhijitStartStr) {
    muhurta = `Today’s Abhijit Muhurta is ${panchangCtx.abhijitStartStr} – ${panchangCtx.abhijitEndStr}. This is highly auspicious.`;
  }

  return {
    sankalpa,
    transliteration: sankalpa,
    meaning: `I offer salutations to ${cat.deityEn}. At this sacred place and auspicious time, I resolve to fulfill the intention: "${intentionText}".`,
    deity: cat.deityEn,
    temple: templeName,
    muhurta,
    seedMantra: cat.seedMantra,
    category: cat.id,
    matchedTemple: temple || null,
    isLocal: true,
  };
}

function defaultTempleForCategory(cat) {
  const map = {
    wealth: "Tirumala Tirupati Devasthanams, Andhra Pradesh",
    health: "Vaitheeswaran Koil, Tamil Nadu",
    marriage: "Meenakshi Temple, Madurai",
    education: "Saraswati Temple, Basara",
    travel: "Anjaneyar Temple, Namakkal",
    spirituality: "Kashi Vishwanath Temple, Varanasi",
    new_venture: "Siddhivinayak Temple, Mumbai",
    children: "Guruvayur Temple, Kerala",
    general: "Rameshwaram Temple, Tamil Nadu",
  };
  return map[cat.id] || "A nearby sacred temple";
}

/* ─── API Prompt Builder (for when quota is available) ────────────────────── */

export function buildSankalpaApiPrompt(intentionText, { panchangCtx, location, matchedTemple }) {
  const locLine = formatLocationLine(location);
  let timeCtx = "";
  if (panchangCtx) {
    timeCtx = `Current Panchangam context: ${panchangCtx.paksha} ${panchangCtx.tithi}, Nakshatra ${panchangCtx.nakshatra}, Masa ${panchangCtx.masa}, Vara ${panchangCtx.vara}, Samvatsara ${panchangCtx.samvatsara}. Sunrise approximately ${panchangCtx.sunrise}h, sunset ${panchangCtx.sunset}h. Abhijit Muhurta today: ${panchangCtx.abhijitStartStr} – ${panchangCtx.abhijitEndStr}.`;
  }

  const templeHint = matchedTemple
    ? `Real temple from database: ${matchedTemple.templeName} in ${matchedTemple.townOrCity || matchedTemple.stateOrUnionTerritory}, deity ${matchedTemple.deityPrimary}.`
    : "";

  return `You are a learned Vedic scholar. The devotee speaks this intention from location "${locLine}":
"${intentionText.trim()}"

${timeCtx}
${templeHint}

Generate a traditional Hindu Sankalpa.
Rules:
1. The Sanskrit text must follow classical Sankalpa structure: Salutation → Place → Time (Tithi, Nakshatra, Masa, Vara, Samvatsara) → Self → Intention → Resolution.
2. Provide accurate Roman IAST transliteration line-by-line.
3. Provide a warm English meaning.
4. Recommend the best deity.
5. Recommend the specific real temple mentioned above if available, otherwise a well-known authentic temple in India matching the deity.
6. Give exact muhurta guidance using the Panchangam context above (e.g. "Today’s Abhijit Muhurta at 12:16 PM" or "Avoid Rahu Kala 10:30 AM – 12:00 PM").
7. Include a seed mantra.

Return ONLY valid JSON in this exact format:
{
  "sankalpa": "Sanskrit text with \\n line breaks",
  "transliteration": "IAST text with \\n line breaks",
  "meaning": "English translation",
  "deity": "...",
  "temple": "...",
  "muhurta": "...",
  "seedMantra": "..."
}`;
}

/* ─── API Response Parser ─────────────────────────────────────────────────── */

export function parseSankalpaResponse(rawText) {
  const defaultResult = {
    sankalpa: "",
    transliteration: "",
    meaning: "",
    deity: "",
    temple: "",
    muhurta: "",
    seedMantra: "",
  };
  if (!rawText) return defaultResult;
  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) return defaultResult;
  try {
    const parsed = JSON.parse(match[0]);
    return {
      sankalpa: parsed.sankalpa || "",
      transliteration: parsed.transliteration || "",
      meaning: parsed.meaning || "",
      deity: parsed.deity || "",
      temple: parsed.temple || "",
      muhurta: parsed.muhurta || "",
      seedMantra: parsed.seedMantra || "",
    };
  } catch {
    return defaultResult;
  }
}

/* ─── Export key ──────────────────────────────────────────────────────────── */

export { GEMINI_KEY };
