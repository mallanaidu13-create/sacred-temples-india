// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Overpass (OpenStreetMap) — Real-time nearby temple discovery
//  Free, no API key required, community-maintained data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// ── Cache (5 min TTL) ──
const _cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function cacheKey(lat, lng, radius) {
  return `ovp_${lat.toFixed(3)}_${lng.toFixed(3)}_${radius}`;
}

function getCached(key) {
  const e = _cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { _cache.delete(key); return null; }
  return e.data;
}

function setCache(key, data) {
  _cache.set(key, { data, ts: Date.now() });
  if (_cache.size > 50) {
    const oldest = [..._cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) _cache.delete(oldest[0]);
  }
}

// ── Fetch real-time temples from Overpass API ──
export async function fetchOverpassTemples(lat, lng, radiusKm = 25) {
  const radiusM = Math.min(radiusKm * 1000, 100000);
  const key = cacheKey(lat, lng, radiusKm);
  const cached = getCached(key);
  if (cached) return cached;

  // Query: Hindu temples + generic temples in India region
  const query = `[out:json][timeout:15];
(
  nwr["amenity"="place_of_worship"]["religion"="hindu"](around:${radiusM},${lat},${lng});
  nwr["amenity"="place_of_worship"]["denomination"="hindu"](around:${radiusM},${lat},${lng});
  nwr["building"="temple"](around:${radiusM},${lat},${lng});
);
out center body qt;`;

  try {
    const resp = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      if (resp.status === 429) return { results: [], source: "overpass", error: "rate_limited" };
      throw new Error(`Overpass ${resp.status}`);
    }

    const data = await resp.json();
    const elements = data.elements || [];

    const seen = new Set();
    const results = [];

    for (const el of elements) {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      if (!elLat || !elLng) continue;

      // Deduplicate by ~50m grid
      const gridKey = `${elLat.toFixed(4)}_${elLng.toFixed(4)}`;
      if (seen.has(gridKey)) continue;
      seen.add(gridKey);

      const tags = el.tags || {};
      const name = tags.name || tags["name:en"] || tags["alt_name"] || "";
      if (!name && !tags.amenity) continue; // skip totally unnamed/untagged

      results.push({
        _source: "osm",
        _osmId: `${el.type}_${el.id}`,
        templeName: cleanName(name) || "Hindu Temple",
        deityPrimary: tags.deity || tags["religion:deity"] || tags.denomination || "",
        latitude: elLat,
        longitude: elLng,
        townOrCity: tags["addr:city"] || tags["addr:village"] || tags["addr:suburb"] || "",
        district: tags["addr:district"] || "",
        stateOrUnionTerritory: tags["addr:state"] || "",
        _address: [tags["addr:street"], tags["addr:city"], tags["addr:state"]].filter(Boolean).join(", "),
        architectureStyle: tags["building:architecture"] || tags.heritage || "",
        darshanTimings: tags.opening_hours || "",
        specialNotes: [
          tags.heritage === "yes" ? "Heritage Site" : "",
          tags.wikipedia ? "Wikipedia" : "",
          tags.denomination || "",
        ].filter(Boolean).join(", ") || "",
        majorFestivals: "",
        hue: deityHue(tags.deity || tags["religion:deity"] || ""),
        imageUrls: [],
        isFavorite: false,
        isFeatured: false,
      });
    }

    const result = { results, source: "overpass", error: null };
    setCache(key, result);
    return result;
  } catch (e) {
    console.warn("[Overpass] Fetch failed:", e.message);
    return { results: [], source: "overpass", error: e.message };
  }
}

function cleanName(name) {
  if (!name) return "";
  return name
    .replace(/\s*\((?:Hindu\s*)?(?:Temple|Mandir|Kovil|Devasthanam)\)\s*$/i, "")
    .trim();
}

function deityHue(deity) {
  if (!deity) return 30;
  const d = deity.toLowerCase();
  if (d.includes("shiva") || d.includes("mahadev")) return 200;
  if (d.includes("vishnu") || d.includes("krishna") || d.includes("rama")) return 240;
  if (d.includes("devi") || d.includes("durga") || d.includes("kali") || d.includes("shakti")) return 340;
  if (d.includes("ganesh") || d.includes("vinayak")) return 20;
  if (d.includes("hanuman")) return 15;
  if (d.includes("murugan") || d.includes("skanda")) return 160;
  return 30;
}

// ── Merge OSM discoveries with curated temples ──
// Dedup by proximity (~100m) and name similarity
export function mergeOsmTemples(curatedTemples, osmPlaces) {
  if (!osmPlaces.length) return curatedTemples;

  const merged = [...curatedTemples];
  const existing = new Set();

  curatedTemples.forEach(t => {
    if (t.latitude != null && t.longitude != null) {
      existing.add(`${t.latitude.toFixed(3)}_${t.longitude.toFixed(3)}`);
      if (t.templeName) existing.add(normalizeName(t.templeName));
    }
  });

  let added = 0;
  for (const p of osmPlaces) {
    const gridKey = `${p.latitude.toFixed(3)}_${p.longitude.toFixed(3)}`;
    const nameKey = normalizeName(p.templeName);

    if (existing.has(gridKey) || (nameKey && existing.has(nameKey))) continue;

    existing.add(gridKey);
    if (nameKey) existing.add(nameKey);
    merged.push({ ...p, id: `osm_${p._osmId || added}` });
    added++;
  }

  return merged;
}

function normalizeName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\s*(temple|mandir|kovil|devasthanam|dham|shrine)\s*/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
}

// ── Reverse geocode via OpenStreetMap Nominatim (free) ──
export async function reverseGeocodeOSM(lat, lng) {
  const key = `revgeo_${lat.toFixed(3)}_${lng.toFixed(3)}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=16`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "SacredTemplesIndia/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    const addr = data.address || {};
    const result = {
      formattedAddress: data.display_name || "",
      area: addr.suburb || addr.neighbourhood || addr.village || "",
      city: addr.city || addr.town || addr.county || "",
      state: addr.state || "",
      pincode: addr.postcode || "",
      landmark: addr.amenity || addr.road || "",
    };
    setCache(key, result);
    return result;
  } catch (e) {
    console.warn("[Nominatim] Reverse geocode failed:", e.message);
    return null;
  }
}
