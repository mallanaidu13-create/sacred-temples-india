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

const GENERIC_NAMES = new Set([
  "temple", "mandir", "hindu temple", "place of worship", "religious place",
  "shrine", "devasthanam", "devasthan", "koyil", "kovil", "gudi", "devalay",
  "devalaya", "alayam", "mandapa", "mantapa", "chatra", "math", "mutt",
  "peeth", "peetha", "ashram", "ashrama", "gurukul", "satsang", "bhavan",
  "bhawan", "kendra", "samaj", "sangh", "seva", "trust temple", "community temple"
]);

function isGenericName(name = "") {
  const n = name.trim().toLowerCase();
  if (n.length < 3) return true;
  return GENERIC_NAMES.has(n);
}

export function transformOsmElement(el) {
  const tags = el.tags || {};
  const center = centerForElement(el);
  if (!center) return null;

  const rawName = tags.name || tags["name:en"] || tags["name:hi"] || "";
  const name = rawName.trim();
  if (!name || isGenericName(name)) return null;

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
    (el) => el.tags && (el.tags.name || el.tags["name:en"])
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
