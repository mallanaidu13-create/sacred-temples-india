// ── Mappls (MapmyIndia) REST API integration ──
// Sign up free: https://auth.mappls.com/console
// Docs: https://about.mappls.com/api/

const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_API_KEY || "";
const BASE = "https://atlas.mappls.com/api/places";

// ── Token management (OAuth2) ──
let _token = null;
let _tokenExpiry = 0;

// For REST APIs that need OAuth token (client_credentials flow)
// The static key approach is simpler: pass access_token as query param
const getHeaders = () => ({
  Authorization: `bearer ${MAPPLS_KEY}`,
  "Content-Type": "application/json",
});

// ── Cache layer (5 min TTL per location key) ──
const _cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function cacheKey(prefix, lat, lng, extra = "") {
  return `${prefix}_${lat.toFixed(3)}_${lng.toFixed(3)}_${extra}`;
}

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { _cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  _cache.set(key, { data, ts: Date.now() });
  // Evict old entries to prevent memory leak
  if (_cache.size > 100) {
    const oldest = [..._cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) _cache.delete(oldest[0]);
  }
}

// ── Check if API is configured ──
export function isMapplsConfigured() {
  return MAPPLS_KEY.length > 10;
}

// ── Nearby Places API ──
// Finds temples near a location using Mappls' verified POI database
// Category: RLGTEM (Religious Temple), RLGGUR (Gurudwara), RLGPLC (Religious Place)
export async function fetchNearbyTemples(lat, lng, radiusKm = 25) {
  if (!isMapplsConfigured()) return { results: [], source: "mappls", error: "not_configured" };

  const key = cacheKey("nearby", lat, lng, `${radiusKm}`);
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const radiusM = Math.min(radiusKm * 1000, 50000); // Mappls max 50km
    const url = `${BASE}/nearby/json?keywords=temple&refLocation=${lat},${lng}&radius=${radiusM}&page=1&sortBy=dist&bounds=false`;

    const resp = await fetch(url, { headers: getHeaders(), signal: AbortSignal.timeout(8000) });
    if (!resp.ok) {
      if (resp.status === 401) return { results: [], source: "mappls", error: "invalid_key" };
      throw new Error(`Mappls API ${resp.status}`);
    }

    const data = await resp.json();
    const suggestedSearches = data.suggestedSearches || [];
    const places = data.suggestedLocations || [];

    const results = places
      .filter(p => p.latitude && p.longitude)
      .map(p => ({
        _source: "mappls",
        _mapplsEloc: p.eLoc || p.placeName || "",
        templeName: cleanTempleName(p.placeName || p.placeAddress || "Temple"),
        latitude: parseFloat(p.latitude),
        longitude: parseFloat(p.longitude),
        townOrCity: p.city || p.placeName || "",
        district: p.district || "",
        stateOrUnionTerritory: p.state || "",
        _address: p.placeAddress || "",
        _mapplsDist: p.distance ? parseFloat(p.distance) / 1000 : null, // km
        _mapplsType: p.type || "",
        _keywords: p.keywords || "",
        hue: 30,
      }));

    const result = { results, source: "mappls", error: null };
    setCache(key, result);
    return result;
  } catch (e) {
    console.warn("[Mappls] Nearby fetch failed:", e.message);
    return { results: [], source: "mappls", error: e.message };
  }
}

// Clean up Mappls place names
function cleanTempleName(name) {
  if (!name) return "Sacred Temple";
  // Remove trailing category labels like "(Temple)"
  return name.replace(/\s*\((?:Temple|Hindu Temple|Mandir|Religious Place)\)\s*$/i, "").trim();
}

// ── Reverse Geocode API ──
// Returns human-readable address for a lat/lng
export async function reverseGeocode(lat, lng) {
  if (!isMapplsConfigured()) return null;

  const key = cacheKey("revgeo", lat, lng);
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const url = `https://apis.mappls.com/advancedmaps/v1/${MAPPLS_KEY}/rev_geocode?lat=${lat}&lng=${lng}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;

    const data = await resp.json();
    const r = data.results?.[0];
    if (!r) return null;

    const result = {
      formattedAddress: r.formatted_address || "",
      area: r.area || r.locality || "",
      city: r.city || r.district || "",
      state: r.state || "",
      pincode: r.pincode || "",
      landmark: r.poi || r.street || "",
    };
    setCache(key, result);
    return result;
  } catch (e) {
    console.warn("[Mappls] Reverse geocode failed:", e.message);
    return null;
  }
}

// ── Distance Matrix API ──
// Returns real road distance & ETA between origin and multiple temple destinations
// Much more accurate than haversine for actual travel
export async function fetchDistanceMatrix(originLat, originLng, temples, mode = "driving") {
  if (!isMapplsConfigured() || !temples.length) return null;

  // Mappls supports up to 100 destinations per call; batch if needed
  const batch = temples.slice(0, 50);
  const destStr = batch.map(t => `${t.longitude},${t.latitude}`).join(";");
  const key = cacheKey("dist", originLat, originLng, `${mode}_${batch.length}`);
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const url = `https://apis.mappls.com/advancedmaps/v1/${MAPPLS_KEY}/distance_matrix/${mode}/${originLng},${originLat};${destStr}?sources=0&rtype=0&region=IND`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;

    const data = await resp.json();
    if (!data.results?.distances?.[0] || !data.results?.durations?.[0]) return null;

    const distances = data.results.distances[0]; // meters from origin to each dest
    const durations = data.results.durations[0]; // seconds

    // Map back to temple IDs
    const result = {};
    batch.forEach((t, i) => {
      const distM = distances[i + 1]; // index 0 is origin-to-origin
      const durS = durations[i + 1];
      if (distM != null && durS != null && distM > 0) {
        result[t.id] = {
          roadDistKm: distM / 1000,
          durationMin: Math.round(durS / 60),
          mode,
        };
      }
    });

    setCache(key, result);
    return result;
  } catch (e) {
    console.warn("[Mappls] Distance matrix failed:", e.message);
    return null;
  }
}

// ── Merge Mappls discoveries with Supabase temples ──
// Deduplication by proximity (100m threshold) and name similarity
export function mergeMapplsTemples(supabaseTemples, mapplsPlaces) {
  if (!mapplsPlaces.length) return supabaseTemples;

  const merged = [...supabaseTemples];
  const existing = new Set();

  // Index existing temples by ~100m grid
  supabaseTemples.forEach(t => {
    if (t.latitude != null && t.longitude != null) {
      existing.add(`${t.latitude.toFixed(3)}_${t.longitude.toFixed(3)}`);
      // Also add name-based key for fuzzy dedup
      if (t.templeName) existing.add(normalizeName(t.templeName));
    }
  });

  let added = 0;
  for (const mp of mapplsPlaces) {
    const gridKey = `${mp.latitude.toFixed(3)}_${mp.longitude.toFixed(3)}`;
    const nameKey = normalizeName(mp.templeName);

    // Skip if too close to an existing temple OR name is too similar
    if (existing.has(gridKey) || existing.has(nameKey)) continue;

    existing.add(gridKey);
    existing.add(nameKey);
    merged.push({ ...mp, id: `mappls_${mp._mapplsEloc || added}` });
    added++;
  }

  return merged;
}

function normalizeName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\s*(temple|mandir|kovil|devasthanam|dham)\s*/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
}

// ── Place Details API (eLoc) ──
// Get detailed info for a specific place by its eLoc (6-char Mappls unique ID)
export async function fetchPlaceDetails(eloc) {
  if (!isMapplsConfigured() || !eloc) return null;

  const key = `place_${eloc}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const url = `${BASE}/place/detail?place_id=${eloc}`;
    const resp = await fetch(url, { headers: getHeaders(), signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;

    const data = await resp.json();
    setCache(key, data);
    return data;
  } catch (e) {
    console.warn("[Mappls] Place detail failed:", e.message);
    return null;
  }
}
