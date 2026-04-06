import { haversineKm } from "./useGeo.js";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const deityHueMap = {
  shiva: 350,
  vishnu: 215,
  devi: 280,
  ganesha: 28,
  hanuman: 15,
  murugan: 155,
  krishna: 240,
  rama: 30,
};

const defaultHue = 30;

function inferDeity(name = "", denomination = "") {
  const n = name.toLowerCase();
  const d = denomination.toLowerCase();
  const text = n + " " + d;

  const keywords = [
    { key: "shiva", names: ["shiva", "mahadev", "shankar", "rudra", "bholenath", "nataraja", "somnath"] },
    { key: "vishnu", names: ["vishnu", "venkateswara", "balaji", "tirupati", "perumal", "narayan"] },
    { key: "rama", names: ["rama", "ram", "ayodhya", "sita ram"] },
    { key: "krishna", names: ["krishna", "govind", "gopala", "radha", "vrindavan"] },
    { key: "ganesha", names: ["ganesh", "ganesha", "ganapati", "vinayak", "vigneshwara"] },
    { key: "hanuman", names: ["hanuman", "bajrang", "anjaneya", "maruti"] },
    { key: "murugan", names: ["murugan", "subramanya", "kartikeya", "skanda", "palani"] },
    { key: "devi", names: ["devi", "durga", "kali", "amman", "mariamman", "parvati", "lakshmi", "saraswati", "shakti", "mata"] },
  ];

  for (const item of keywords) {
    if (item.names.some((kw) => text.includes(kw))) return item.key;
  }
  return "temple";
}

function hueFromDeity(deity = "") {
  const d = deity.toLowerCase();
  return deityHueMap[d] ?? defaultHue;
}

function idForElement(el) {
  return `osm-${el.type}-${el.id}`;
}

function centerForElement(el) {
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  if (el.lat != null && el.lon != null) return { lat: el.lat, lon: el.lon };
  return null;
}

// ── Strict name-quality gates for 100% accuracy ──

const INDIC_SCRIPTS = /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/;

const GENERIC_NAMES = new Set([
  "temple", "mandir", "shrine", "place of worship", "religious place", "hindu temple",
  "devasthanam", "devasthan", "koyil", "kovil", "gudi", "devalay", "devalaya", "alayam",
  "mandapa", "mantapa", "chatra", "math", "mutt", "peeth", "peetha", "ashram", "ashrama",
  "gurukul", "satsang", "bhavan", "bhawan", "kendra", "samaj", "sangh", "seva",
  "trust temple", "community temple", "hall", "building", "complex", "center", "centre",
  "office", "school", "institution", "organization", "organisation", "committee",
  "society", "board", "unknown", "unnamed", "no name", "n/a", "na", "none"
]);

const COMMON_DEITIES = new Set([
  "shiva", "mahadev", "mahadeva", "shankar", "bholenath", "nataraja",
  "vishnu", "venkateswara", "balaji", "perumal", "narayan", "narayana",
  "rama", "ram", "sriram", "shriram", "sita",
  "krishna", "govind", "gopala", "govinda", "radha", "radhe",
  "ganesh", "ganesha", "ganapati", "vinayak", "vinayaka", "vigneshwara", "vigneshwar",
  "hanuman", "bajrang", "anjaneya", "maruti", "maruthi",
  "murugan", "subramanya", "kartikeya", "skanda", "palani",
  "durga", "kali", "amman", "mariamman", "parvati", "lakshmi", "saraswati",
  "shakti", "mata", "devi", "bhavani", "tulja", "tuljabhavani",
  "surya", "aditya", "sun"
]);

const GENERIC_SUFFIXES = [
  "temple", "mandir", "koyil", "kovil", "gudi", "devalay", "devalaya",
  "devalayam", "alayam", "alay", "mandapa", "mantapa", "math", "mutt",
  "peeth", "peetha", "ashram", "ashrama", "gurukul", "satsang", "bhavan",
  "bhawan", "kendra", "samaj", "sangh", "seva", "chatra", "devasthan", "devasthanam"
];

function isHighQualityName(name = "") {
  const n = name.trim();
  if (n.length < 4) return false;

  // Reject pure Indic-script names (unreadable to most users)
  if (INDIC_SCRIPTS.test(n)) return false;

  // Must contain at least some Latin letters
  if (!/[a-zA-Z]/.test(n)) return false;

  // Should not be all lowercase (proper nouns are capitalized)
  if (n === n.toLowerCase()) return false;

  const lower = n.toLowerCase();

  // Exact generic match
  if (GENERIC_NAMES.has(lower)) return false;

  const words = lower.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return false;

  // Single word: must not be generic
  if (words.length === 1) {
    return !GENERIC_NAMES.has(words[0]);
  }

  // Two-word names: reject if it's just "[common deity] [temple type]"
  if (words.length === 2) {
    const [first, second] = words;
    const firstIsCommonDeity = COMMON_DEITIES.has(first);
    const secondIsGenericSuffix = GENERIC_SUFFIXES.some((s) => second === s || second.endsWith(s));
    if (firstIsCommonDeity && secondIsGenericSuffix) return false;
  }

  // Must contain at least one word that isn't purely generic
  const hasProperNoun = words.some((word) => {
    return !GENERIC_NAMES.has(word) && !GENERIC_SUFFIXES.some((s) => word === s);
  });

  return hasProperNoun;
}

function pickBestName(tags) {
  const candidates = [
    tags["name:en"],
    tags.name,
    tags.official_name,
    tags.alt_name?.split(/[;,]/)[0],
  ].filter(Boolean).map((n) => n.trim().replace(/\s+/g, " "));

  for (const c of candidates) {
    if (isHighQualityName(c)) return c;
  }
  return "";
}

export function transformOsmElement(el) {
  const tags = el.tags || {};
  const center = centerForElement(el);
  if (!center) return null;

  const name = pickBestName(tags);
  if (!name) return null;

  const townOrCity = tags["addr:city"] || tags["addr:town"] || tags["addr:place"] || tags["is_in:city"] || "";
  const district = tags["addr:district"] || tags["is_in:district"] || "";
  const stateOrUnionTerritory = tags["addr:state"] || tags["is_in:state"] || "";
  const denomination = tags.denomination || "";
  const deity = inferDeity(name, denomination);

  return {
    id: idForElement(el),
    templeName: name,
    townOrCity,
    district,
    stateOrUnionTerritory,
    deityPrimary: deity.charAt(0).toUpperCase() + deity.slice(1),
    latitude: center.lat,
    longitude: center.lon,
    isFavorite: false,
    hue: hueFromDeity(deity),
    architectureStyle: "",
    specialNotes: "",
    _source: "osm",
  };
}

export function buildOverpassQuery(lat, lon, radiusKm) {
  const r = Math.round(radiusKm * 1000);
  return `
[out:json][timeout:25];
(
  node["amenity"="place_of_worship"]["religion"="hindu"](around:${r},${lat},${lon});
  way["amenity"="place_of_worship"]["religion"="hindu"](around:${r},${lat},${lon});
  relation["amenity"="place_of_worship"]["religion"="hindu"](around:${r},${lat},${lon});
);
out center tags;
`.trim();
}

export async function fetchOsmTemples(lat, lon, radiusKm) {
  const query = buildOverpassQuery(lat, lon, radiusKm);
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const json = await res.json();
  const elements = (json.elements || []).filter(
    (el) => el.tags && pickBestName(el.tags)
  );
  return elements.map(transformOsmElement).filter(Boolean);
}

export function mergeTemples(supabaseTemples = [], osmTemples = [], dedupRadiusM = 150) {
  const keptOsm = osmTemples.filter((o) => {
    if (o.latitude == null || o.longitude == null) return false;
    const tooClose = supabaseTemples.some((s) => {
      if (s.latitude == null || s.longitude == null) return false;
      return haversineKm(s.latitude, s.longitude, o.latitude, o.longitude) * 1000 <= dedupRadiusM;
    });
    return !tooClose;
  });
  return [...supabaseTemples, ...keptOsm];
}

export async function fetchOsmTemplesProgressive(lat, lon, onProgressRadius) {
  const radii = [10, 25, 50];
  let lastError = null;
  for (const r of radii) {
    onProgressRadius?.(r);
    try {
      const data = await fetchOsmTemples(lat, lon, r);
      if (data.length > 0) return { data, radius: r };
    } catch (e) {
      lastError = e;
    }
  }
  if (lastError) throw lastError;
  return { data: [], radius: 50 };
}
