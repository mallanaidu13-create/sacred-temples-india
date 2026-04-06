import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { C, FD, FB } from "../theme.js";
import { haptic } from "../utils.js";
import { Chip, ThemeBtn, SkeletonListCard, Empty } from "../components.jsx";
import { useGeo, haversineKm, bearingDeg, formatCompass } from "../useGeo.js";
import { SacredRadar, NearbyCard, RadarLegend } from "../SacredRadar.jsx";
import { TIRTHA_CIRCUITS } from "../tirtha-data.js";
import { isMapplsConfigured, fetchNearbyTemples, reverseGeocode, fetchDistanceMatrix, mergeMapplsTemples } from "../mappls-api.js";
import { mergeTemples, fetchOsmTemples } from "../osm-temples.js";
import { reverseGeocodeOSM } from "../overpass-api.js";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Leaflet Map component ──
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const SATELLITE_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TILE_ATTR = '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org/">OSM</a>';

const MAP_LAYERS = [
  { id: "dark", label: "Dark", url: DARK_TILES, attr: TILE_ATTR },
  { id: "light", label: "Light", url: LIGHT_TILES, attr: TILE_ATTR },
  { id: "satellite", label: "Satellite", url: SATELLITE_TILES, attr: "&copy; Esri" },
];

const rangeToZoom = (range) => {
  if (range <= 5) return 13;
  if (range <= 10) return 12;
  if (range <= 25) return 11;
  if (range <= 50) return 10;
  return 9;
};

const formatDist = (km) => km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

const TempleMap = ({ location, nearby, range, isDark, heading, onSelectTemple, selectedTemple }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileRef = useRef(null);
  const userRef = useRef(null);
  const pulseRef = useRef(null);
  const circleRef = useRef(null);
  const markersRef = useRef([]);
  const headingRef = useRef(null);
  const [mapLayer, setMapLayer] = useState(isDark ? "dark" : "light");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      zoomAnimation: true,
      markerZoomAnimation: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);
    map.setView(location ? [location.latitude, location.longitude] : [20.59, 78.96], location ? rangeToZoom(range) : 5);
    mapRef.current = map;

    // Force resize when container size changes
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  // Tile layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = MAP_LAYERS.find(l => l.id === mapLayer) || MAP_LAYERS[0];
    if (tileRef.current) map.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(layer.url, { maxZoom: 19, attribution: layer.attr }).addTo(map);
  }, [mapLayer]);

  // Update center when location/range changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;
    map.flyTo([location.latitude, location.longitude], rangeToZoom(range), { duration: 0.8 });
  }, [location?.latitude, location?.longitude, range]);

  // User marker + accuracy circle + heading wedge
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;

    // User location pulsing marker
    if (userRef.current) map.removeLayer(userRef.current);
    if (pulseRef.current) map.removeLayer(pulseRef.current);
    const userIcon = L.divIcon({
      className: "",
      html: `<div style="position:relative;width:20px;height:20px">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(212,133,60,0.25);animation:locatePulse 2s ease-in-out infinite"></div>
        <div style="position:absolute;inset:4px;border-radius:50%;background:#D4853C;border:2.5px solid #fff;box-shadow:0 0 12px rgba(212,133,60,0.8)"></div>
      </div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    userRef.current = L.marker([location.latitude, location.longitude], { icon: userIcon, zIndexOffset: 1000, interactive: false }).addTo(map);

    // Range circle
    if (circleRef.current) map.removeLayer(circleRef.current);
    circleRef.current = L.circle([location.latitude, location.longitude], {
      radius: range * 1000,
      color: "rgba(212,133,60,0.35)",
      fillColor: "rgba(212,133,60,0.06)",
      fillOpacity: 1,
      weight: 1.5,
      dashArray: "6 4",
    }).addTo(map);

    // Heading wedge
    if (headingRef.current) map.removeLayer(headingRef.current);
    if (heading != null) {
      const wedge = L.divIcon({
        className: "",
        html: `<div style="width:60px;height:60px;transform:rotate(${heading}deg);transform-origin:center center;">
          <div style="width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-bottom:28px solid rgba(212,133,60,0.2);margin:0 auto;filter:blur(1px)"></div>
        </div>`,
        iconSize: [60, 60],
        iconAnchor: [30, 30],
      });
      headingRef.current = L.marker([location.latitude, location.longitude], { icon: wedge, zIndexOffset: 999, interactive: false }).addTo(map);
    }
  }, [location?.latitude, location?.longitude, location?.accuracy, range, heading]);

  // Temple markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    nearby.forEach(t => {
      const isSel = selectedTemple?.id === t.id;
      const hue = t.hue ?? 30;
      const size = isSel ? 36 : 28;
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${isSel
            ? "linear-gradient(135deg,#E69A52,#D4853C)"
            : `linear-gradient(135deg,hsl(${hue},60%,45%),hsl(${hue},55%,35%))`
          };
          border:${isSel ? "3px solid #fff" : `2px solid rgba(255,255,255,0.4)`};
          display:flex;align-items:center;justify-content:center;
          font-size:${isSel ? 16 : 13}px;
          box-shadow:${isSel
            ? "0 0 20px rgba(212,133,60,0.8),0 4px 16px rgba(0,0,0,0.4)"
            : "0 2px 8px rgba(0,0,0,0.35)"
          };
          transition:all 0.3s cubic-bezier(.22,1,.36,1);
          cursor:pointer;
        ">🛕</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const dist = formatDist(t._dist);
      const roadDist = t._roadDist ? formatDist(t._roadDist) : null;
      const eta = t._eta ? `~${t._eta} min` : null;
      const compass = formatCompass(t._bearing ?? 0);
      const loc = [t.townOrCity, t.district].filter(Boolean).join(", ");
      const deity = t.deityPrimary || "";
      const hasAddress = (t._source === "mappls" || t._source === "osm") && t._address;

      const darshan = t.darshanTimings || "";
      const festivals = t.majorFestivals || "";
      const archStyle = t.architectureStyle || "";
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${t.latitude},${t.longitude}`;

      const popup = L.popup({
        className: "sacred-popup",
        closeButton: false,
        maxWidth: 280,
        offset: [0, -size / 2 - 4],
      }).setContent(`
        <div style="font-family:${FB};padding:2px 0;min-width:200px">
          <div style="font-family:${FD};font-size:15px;font-weight:600;color:#F2E8D4;margin-bottom:4px;line-height:1.3">${t.templeName || "Sacred Temple"}</div>
          ${deity ? `<div style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;background:rgba(212,133,60,0.15);margin-bottom:6px"><span style="font-size:10px;color:#D4853C;font-weight:600">${deity}</span></div>` : ""}
          ${hasAddress ? `<div style="font-size:10px;color:#A89878;margin-bottom:4px;line-height:1.3">${t._address}</div>` : loc ? `<div style="font-size:11px;color:#A89878;margin-bottom:4px">${loc}</div>` : ""}
          ${darshan ? `<div style="font-size:10px;color:#C4A24E;margin-bottom:3px">🕐 ${darshan}</div>` : ""}
          ${archStyle ? `<div style="font-size:10px;color:#A89878;margin-bottom:3px">🏛 ${archStyle}</div>` : ""}
          ${festivals ? `<div style="font-size:10px;color:#e9967a;margin-bottom:4px;line-height:1.4">🎪 ${festivals.length > 80 ? festivals.slice(0, 80) + '…' : festivals}</div>` : ""}
          <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#6E5E48;margin-top:4px;flex-wrap:wrap">
            <span style="color:#D4853C;font-weight:700">${roadDist || dist}</span>
            ${roadDist ? `<span style="font-size:9px;color:#6E5E48">(${dist} straight)</span>` : ""}
            <span style="width:3px;height:3px;border-radius:50%;background:#6E5E48"></span>
            <span>${compass}</span>
            ${eta ? `<span style="width:3px;height:3px;border-radius:50%;background:#6E5E48"></span><span style="color:#22c55e;font-weight:600">${eta}</span>` : ""}
          </div>
          <a href="${directionsUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;margin-top:8px;padding:5px 12px;border-radius:8px;background:rgba(212,133,60,0.15);color:#D4853C;font-size:10px;font-weight:700;text-decoration:none">📍 Directions</a>
        </div>
      `);

      const marker = L.marker([t.latitude, t.longitude], { icon })
        .bindPopup(popup)
        .on("click", () => onSelectTemple(t))
        .addTo(map);

      if (isSel) marker.openPopup();
      markersRef.current.push(marker);
    });
  }, [nearby, selectedTemple?.id, mapLayer]);

  // Sync layer with theme
  useEffect(() => {
    if (mapLayer !== "satellite") setMapLayer(isDark ? "dark" : "light");
  }, [isDark]);

  const toggleFullscreen = () => setIsFullscreen(fs => {
    const next = !fs;
    setTimeout(() => mapRef.current?.invalidateSize(), 50);
    return next;
  });

  return (
    <div style={{
      margin: isFullscreen ? 0 : "0 24px 14px",
      borderRadius: isFullscreen ? 0 : 20,
      overflow: "hidden",
      border: isFullscreen ? "none" : `1px solid ${C.div}`,
      height: isFullscreen ? "calc(100vh - 140px)" : 360,
      position: "relative",
      transition: "all 0.3s cubic-bezier(.22,1,.36,1)",
    }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Map layer switcher */}
      <div style={{
        position: "absolute", top: 12, right: 12, zIndex: 1000,
        display: "flex", gap: 4, background: "rgba(26,17,9,0.85)", backdropFilter: "blur(12px)",
        borderRadius: 10, padding: 3, border: "1px solid rgba(255,255,255,0.08)",
      }}>
        {MAP_LAYERS.map(l => (
          <button key={l.id} className="t" onClick={() => setMapLayer(l.id)}
            style={{
              padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 10, fontWeight: mapLayer === l.id ? 700 : 400,
              background: mapLayer === l.id ? "rgba(212,133,60,0.25)" : "transparent",
              color: mapLayer === l.id ? "#D4853C" : "rgba(255,255,255,0.5)",
            }}>{l.label}</button>
        ))}
      </div>

      {/* Fullscreen toggle */}
      <button className="t" onClick={toggleFullscreen} style={{
        position: "absolute", top: 12, left: 12, zIndex: 1000,
        width: 34, height: 34, borderRadius: 10,
        background: "rgba(26,17,9,0.85)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: 14,
      }}>{isFullscreen ? "⊟" : "⊞"}</button>

      {/* Re-center button */}
      {location && (
        <button className="t" onClick={() => {
          mapRef.current?.flyTo([location.latitude, location.longitude], rangeToZoom(range), { duration: 0.5 });
        }} style={{
          position: "absolute", bottom: 12, left: 12, zIndex: 1000,
          width: 34, height: 34, borderRadius: 10,
          background: "rgba(26,17,9,0.85)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#D4853C", fontSize: 16,
        }}>◎</button>
      )}

      {/* Info overlay */}
      <div style={{
        position: "absolute", bottom: 12, right: 12, zIndex: 1000,
        padding: "6px 12px", borderRadius: 10,
        background: "rgba(26,17,9,0.85)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 600,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4853C", boxShadow: "0 0 6px rgba(212,133,60,0.6)" }} />
        {nearby.length} temple{nearby.length !== 1 ? "s" : ""} · {range} km
      </div>

      {/* Selected temple mini card */}
      {selectedTemple && (
        <div style={{
          position: "absolute", bottom: 56, left: 12, right: 12, zIndex: 1000,
          padding: "12px 14px", borderRadius: 16,
          background: "rgba(26,17,9,0.92)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(212,133,60,0.2)",
          animation: "rv .35s cubic-bezier(.16,1,.3,1) both",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
              background: `linear-gradient(135deg,hsl(${selectedTemple.hue ?? 30},60%,45%),hsl(${selectedTemple.hue ?? 30},55%,30%))`,
              border: `1px solid hsl(${selectedTemple.hue ?? 30},50%,50%,0.3)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>🛕</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FD, fontSize: 14, fontWeight: 600, color: "#F2E8D4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedTemple.templeName}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#A89878", marginTop: 3, flexWrap: "wrap" }}>
                <span style={{ color: "#D4853C", fontWeight: 700 }}>{selectedTemple._roadDist ? formatDist(selectedTemple._roadDist) : formatDist(selectedTemple._dist)}</span>
                {selectedTemple._roadDist && <span style={{ fontSize: 9, color: "#6E5E48" }}>road</span>}
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#6E5E48" }} />
                <span>{formatCompass(selectedTemple._bearing ?? 0)}</span>
                {selectedTemple._eta && <>
                  <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#6E5E48" }} />
                  <span style={{ color: "#22c55e", fontWeight: 600 }}>~{selectedTemple._eta} min</span>
                </>}
                {selectedTemple.deityPrimary && <>
                  <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#6E5E48" }} />
                  <span>{selectedTemple.deityPrimary}</span>
                </>}
              </div>
              {selectedTemple.darshanTimings && (
                <div style={{ fontSize: 10, color: "#C4A24E", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🕐 {selectedTemple.darshanTimings}</div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
              <button className="t" onClick={() => onSelectTemple(selectedTemple)} style={{
                padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,#D4853C,#E69A52)",
                color: "#fff", fontSize: 11, fontWeight: 700,
              }}>View</button>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedTemple.latitude},${selectedTemple.longitude}`} target="_blank" rel="noopener noreferrer" style={{
                padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "rgba(212,133,60,0.15)", textAlign: "center",
                color: "#D4853C", fontSize: 9, fontWeight: 700, textDecoration: "none",
              }}>📍 Navigate</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── View toggle button ──
const ViewToggle = ({ view, onView }) => (
  <div style={{ display: "flex", gap: 4, padding: "0 24px 12px", justifyContent: "center" }}>
    {[
      { id: "map", label: "Map", svg: '<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/>' },
      { id: "radar", label: "Radar", svg: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4"/>' },
      { id: "list", label: "List", svg: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="3" cy="6" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="18" r="1"/>' },
    ].map(v => (
      <button key={v.id} className="t" onClick={() => onView(v.id)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 16px", borderRadius: 99,
          background: view === v.id ? C.saffronDim : "rgba(255,255,255,0.04)",
          border: `1px solid ${view === v.id ? "rgba(212,133,60,0.3)" : C.div}`,
          color: view === v.id ? C.saffron : C.textD,
          fontSize: 12, fontWeight: view === v.id ? 700 : 400, cursor: "pointer",
          transition: "all .2s",
        }}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: v.svg }} />
        {v.label}
      </button>
    ))}
  </div>
);

// ── Main Nearby page ──
const Nearby = ({ oT, oF, temples, loading, isDark, onToggleTheme }) => {
  const geo = useGeo({ enableHighAccuracy: true });
  useEffect(() => {
    geo.startWatching();
    return () => geo.stopWatching();
  }, []);
  const [range, setRange] = useState(25);
  const [view, setView] = useState("map");
  const [selectedTemple, setSelectedTemple] = useState(null);
  const [expandedCluster, setExpandedCluster] = useState(null);
  const [claimToast, setClaimToast] = useState(null);
  const claimTimerRef = useRef(null);
  const RANGES = [{ l: "5 km", v: 5 }, { l: "10 km", v: 10 }, { l: "25 km", v: 25 }, { l: "50 km", v: 50 }, { l: "100 km", v: 100 }];
  const lastHapticRef = useRef(0);
  const templesRef = useRef(temples);

  // Mappls integration state
  const [mapplsDiscoveries, setMapplsDiscoveries] = useState([]);
  const [mapplsLoading, setMapplsLoading] = useState(false);
  const [mapplsError, setMapplsError] = useState(null);
  const [roadDistances, setRoadDistances] = useState({});
  const [userAddress, setUserAddress] = useState(null);
  const mapplsFetchKeyRef = useRef("");
  const distMatrixKeyRef = useRef("");
  const isMapplsAvail = useMemo(() => isMapplsConfigured(), []);

  // OSM real-time discovery state (original pattern)
  const [osmLoading, setOsmLoading] = useState(false);
  const [osmRadius, setOsmRadius] = useState(0);
  const [osmError, setOsmError] = useState(null);
  const [osmCount, setOsmCount] = useState(0);
  const [merged, setMerged] = useState(temples);
  const fetchedKeyRef = useRef("");
  const abortRef = useRef(null);

  useEffect(() => {
    templesRef.current = temples;
    setMerged(prev => {
      const osmOnly = prev.filter(p => p._source === "osm");
      return mergeTemples(temples, osmOnly);
    });
  }, [temples]);

  // Merge: Mappls discoveries into merged list
  const mergedTemples = useMemo(() => {
    if (!mapplsDiscoveries.length) return merged;
    return mergeMapplsTemples(merged, mapplsDiscoveries);
  }, [merged, mapplsDiscoveries]);

  const allWithCoords = useMemo(() => {
    const loc = geo.effectiveLocation;
    if (!loc) return [];
    return mergedTemples
      .filter(t => t.latitude != null && t.longitude != null && isFinite(t.latitude) && isFinite(t.longitude))
      .map(t => {
        const straightDist = haversineKm(loc.latitude, loc.longitude, t.latitude, t.longitude);
        const road = roadDistances[t.id];
        return {
          ...t,
          _dist: straightDist,
          _roadDist: road?.roadDistKm ?? null,
          _eta: road?.durationMin ?? null,
          _bearing: bearingDeg(loc.latitude, loc.longitude, t.latitude, t.longitude),
        };
      })
      .filter(t => isFinite(t._dist) && t._dist >= 0)
      .sort((a, b) => a._dist - b._dist);
  }, [geo.effectiveLocation?.latitude, geo.effectiveLocation?.longitude, mergedTemples, roadDistances]);

  const nearby = useMemo(() => {
    return allWithCoords.filter(t => t._dist <= range);
  }, [allWithCoords, range]);

  // ── Mappls: Discover nearby temples ──
  useEffect(() => {
    const loc = geo.effectiveLocation;
    if (!loc || !isMapplsAvail) return;
    const fetchKey = `${loc.latitude.toFixed(3)},${loc.longitude.toFixed(3)},${range}`;
    if (mapplsFetchKeyRef.current === fetchKey) return;
    mapplsFetchKeyRef.current = fetchKey;

    setMapplsLoading(true);
    setMapplsError(null);
    fetchNearbyTemples(loc.latitude, loc.longitude, Math.min(range, 50))
      .then(({ results, error }) => {
        if (error === "not_configured") return;
        if (error) { setMapplsError(error); return; }
        setMapplsDiscoveries(results);
      })
      .finally(() => setMapplsLoading(false));
  }, [geo.effectiveLocation?.latitude, geo.effectiveLocation?.longitude, range, isMapplsAvail]);

  // ── OSM: Discover real temples nearby at user's current range ──
  const runOsmFetch = useCallback(() => {
    const loc = geo.effectiveLocation;
    if (!loc) { setOsmRadius(0); setOsmError(null); return; }

    const fetchKey = `${loc.latitude.toFixed(3)},${loc.longitude.toFixed(3)},${range}`;
    if (fetchedKeyRef.current === fetchKey) return;
    fetchedKeyRef.current = fetchKey;

    // Cancel any in-flight request for a previous range/location
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setOsmLoading(true);
    setOsmError(null);
    setOsmRadius(range);
    fetchOsmTemples(loc.latitude, loc.longitude, range, controller.signal)
      .then((data) => {
        setOsmCount(data.length);
        setMerged(mergeTemples(templesRef.current, data));
        setOsmError(null);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        const msg = e.message || "";
        const friendly = /5\d\d/.test(msg)
          ? "Map server busy — showing saved temples. Tap Retry."
          : "Could not reach OpenStreetMap. Check connection and retry.";
        setOsmError(friendly);
      })
      .finally(() => {
        setOsmLoading(false);
      });
  }, [geo.effectiveLocation?.latitude, geo.effectiveLocation?.longitude, range]);

  // Auto-trigger OSM fetch when location or range changes
  useEffect(() => {
    if (geo.effectiveLocation) runOsmFetch();
  }, [geo.effectiveLocation?.latitude, geo.effectiveLocation?.longitude, range, runOsmFetch]);

  // ── Reverse geocode user location (Mappls or OSM Nominatim) ──
  useEffect(() => {
    const loc = geo.effectiveLocation;
    if (!loc) return;
    const geocodeFn = isMapplsAvail
      ? () => reverseGeocode(loc.latitude, loc.longitude)
      : () => reverseGeocodeOSM(loc.latitude, loc.longitude);
    geocodeFn().then(addr => {
      if (addr) setUserAddress(addr);
    });
  }, [geo.effectiveLocation?.latitude, geo.effectiveLocation?.longitude, isMapplsAvail]);

  // ── Mappls: Real road distances for closest temples ──
  useEffect(() => {
    const loc = geo.effectiveLocation;
    if (!loc || !isMapplsAvail || !nearby.length) return;

    // Only fetch for the closest 20 temples (API efficiency)
    const closest = nearby.slice(0, 20);
    const distKey = `${loc.latitude.toFixed(3)},${loc.longitude.toFixed(3)}_${closest.map(t => t.id).join(",")}`;
    if (distMatrixKeyRef.current === distKey) return;
    distMatrixKeyRef.current = distKey;

    fetchDistanceMatrix(loc.latitude, loc.longitude, closest).then(dm => {
      if (dm) setRoadDistances(prev => ({ ...prev, ...dm }));
    });
  }, [geo.effectiveLocation?.latitude, geo.effectiveLocation?.longitude, isMapplsAvail, nearby.length > 0 && nearby[0]?.id]);

  // Proximity haptic
  useEffect(() => {
    const loc = geo.location || geo.cachedLocation;
    if (!loc || !nearby.length) return;
    const now = Date.now();
    if (now - lastHapticRef.current < 5000) return;
    const close = nearby.some(t => t._dist * 1000 <= 500);
    if (close) {
      try { navigator.vibrate?.(40); } catch {}
      lastHapticRef.current = now;
    }
  }, [geo.location, geo.cachedLocation, nearby]);

  // Tirtha stamp check
  useEffect(() => {
    const loc = geo.effectiveLocation;
    if (!loc) return;
    const claims = JSON.parse(localStorage.getItem("sti_tirtha_claims") || "[]");
    const check = () => {
      for (const circuit of TIRTHA_CIRCUITS) {
        for (const t of circuit.temples) {
          const d = haversineKm(loc.latitude, loc.longitude, t.lat, t.lng) * 1000;
          if (d <= 300 && !claims.some((c) => c.templeId === t.id)) {
            setClaimToast({ temple: t, circuit });
            return;
          }
        }
      }
      setClaimToast(null);
    };
    check();
    claimTimerRef.current = setInterval(check, 8000);
    return () => clearInterval(claimTimerRef.current);
  }, [geo.effectiveLocation?.latitude, geo.effectiveLocation?.longitude]);

  const claimStamp = () => {
    if (!claimToast) return;
    const claims = JSON.parse(localStorage.getItem("sti_tirtha_claims") || "[]");
    const entry = {
      templeId: claimToast.temple.id,
      circuitId: claimToast.circuit.id,
      date: new Date().toISOString(),
    };
    localStorage.setItem("sti_tirtha_claims", JSON.stringify([...claims, entry]));
    setClaimToast(null);
  };

  const handleMapSelect = useCallback((t) => {
    setSelectedTemple(prev => prev?.id === t.id ? null : t);
    haptic(15);
  }, []);

  const handleViewTemple = useCallback((t) => {
    oT(t);
  }, [oT]);

  const clusterItems = expandedCluster || [];
  const coordCount = allWithCoords.length;
  const nearest = allWithCoords[0];
  const isDiscovering = osmLoading || (isMapplsAvail && mapplsLoading);
  const showFallback = geo.effectiveLocation && nearby.length === 0 && !isDiscovering && coordCount > 0;

  return (
    <div className="fi" style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ padding: "22px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: FD, fontSize: 28, fontWeight: 500, color: C.cream }}>Nearby</h1>
          <p style={{ fontSize: 13, color: C.textD, marginTop: 5 }}>
            {geo.effectiveLocation ? `${nearby.length} temples within ${range} km` : "Temples around your location"}
          </p>
        </div>
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme} />
      </div>

      {/* View toggle */}
      {geo.effectiveLocation && <ViewToggle view={view} onView={v => { setView(v); setExpandedCluster(null); }} />}

      {/* Map view */}
      {view === "map" && geo.effectiveLocation && (
        <TempleMap
          location={geo.effectiveLocation}
          nearby={nearby}
          range={range}
          isDark={isDark}
          heading={geo.heading}
          onSelectTemple={handleMapSelect}
          selectedTemple={selectedTemple}
        />
      )}

      {/* Radar view */}
      {view === "radar" && geo.effectiveLocation && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "8px 0 18px" }}>
          <SacredRadar
            location={geo.effectiveLocation}
            heading={geo.heading}
            temples={mergedTemples}
            size={240}
            maxDistKm={range}
            showClusters={true}
            onClusterClick={(items) => setExpandedCluster(items)}
          />
          <RadarLegend count={nearby.length} maxDistKm={range} />
        </div>
      )}

      {/* Locate button */}
      <div style={{ display: "flex", justifyContent: "center", margin: "0 24px 14px" }}>
        <button
          className="t"
          onClick={() => geo.requestAndWatch()}
          disabled={geo.status === "locating"}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "11px 22px", borderRadius: 99,
            background: geo.status === "active" ? C.saffronDim : `linear-gradient(120deg,${C.saffron},${C.saffronH})`,
            border: `1px solid ${geo.status === "active" ? "rgba(212,133,60,0.25)" : "transparent"}`,
            color: geo.status === "active" ? C.saffron : "#fff",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            animation: geo.status === "locating" ? "locatePulse 1.2s ease-in-out infinite" : "none",
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" />
          </svg>
          {geo.status === "locating" ? "Locating…" : geo.status === "active" ? "Live Tracking" : geo.error ? "Try Again" : "Locate Me"}
        </button>
      </div>

      {/* Range chips */}
      {geo.effectiveLocation && (
        <div style={{ display: "flex", gap: 8, padding: "0 24px 12px", overflowX: "auto" }}>
          {RANGES.map(r => (
            <Chip key={r.l} label={r.l} active={range === r.v} onClick={() => { setRange(r.v); setExpandedCluster(null); setSelectedTemple(null); }} />
          ))}
        </div>
      )}

      {/* Status panel */}
      {geo.effectiveLocation && (
        <div style={{ margin: "0 24px 14px", padding: "12px 14px", borderRadius: 14, background: C.card, border: `1px solid ${C.div}` }}>
          <div style={{ fontSize: 11, color: C.textD, lineHeight: 1.6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: geo.status === "active" ? "#22c55e" : "#eab308" }} />
              <span>GPS {geo.status === "active" ? "active" : geo.error ? "denied" : "calibrating"}
                {geo.effectiveLocation?.accuracy ? ` · ±${Math.round(geo.effectiveLocation.accuracy)}m` : ""}
              </span>
            </div>
            {userAddress && (
              <div style={{ marginBottom: 4 }}>📍 <span style={{ color: C.creamM, fontWeight: 500 }}>{userAddress.area || userAddress.landmark}{userAddress.city ? `, ${userAddress.city}` : ""}</span></div>
            )}
            <div>Database: <span style={{ color: C.creamM, fontWeight: 600 }}>{temples.filter(t => t.latitude != null && t.longitude != null).length}</span> temples with coordinates</div>
            {osmLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${C.div}`, borderTopColor: C.saffron, animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                <span>Scanning OpenStreetMap{osmRadius ? ` up to ${osmRadius} km…` : "…"}</span>
              </div>
            )}
            {!osmLoading && osmCount > 0 && (
              <div style={{ marginTop: 4, color: "#4ade80" }}>✔ OpenStreetMap added <span style={{ fontWeight: 700 }}>{osmCount}</span> real temples nearby</div>
            )}
            {osmError && (
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                <span style={{ color: "#f87171" }}>⚠ {osmError}</span>
                <button className="t" onClick={() => { fetchedKeyRef.current = ""; runOsmFetch(); }} style={{ padding: "5px 10px", borderRadius: 8, background: C.saffronDim, border: "none", color: C.saffron, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Retry</button>
              </div>
            )}
            {isMapplsAvail && mapplsDiscoveries.length > 0 && (
              <div>Mappls: <span style={{ color: "#4ade80", fontWeight: 600 }}>+{mapplsDiscoveries.length}</span> verified temples discovered</div>
            )}
            {Object.keys(roadDistances).length > 0 && (
              <div style={{ marginTop: 2 }}>🛣 Road distances available for <span style={{ color: C.creamM, fontWeight: 600 }}>{Object.keys(roadDistances).length}</span> temples</div>
            )}
            {nearest && <div>Nearest: <span style={{ color: C.saffron, fontWeight: 600 }}>{nearest.templeName}</span> · {nearest._roadDist ? `${nearest._roadDist.toFixed(1)} km by road` : nearest._dist < 1 ? `${(nearest._dist * 1000).toFixed(0)} m` : `${nearest._dist.toFixed(1)} km`}{nearest._eta ? ` · ~${nearest._eta} min` : ""} away</div>}
          </div>
        </div>
      )}

      {/* Tirtha stamp claim */}
      {claimToast && (
        <div style={{ margin: "0 24px 12px", padding: "12px 14px", borderRadius: 14, background: "rgba(196,162,78,0.12)", border: "1px solid rgba(196,162,78,0.35)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>You are at {claimToast.temple.name}</div>
            <div style={{ fontSize: 11, color: C.textD, marginTop: 2 }}>Claim your Tīrtha Stamp?</div>
          </div>
          <button className="t" onClick={claimStamp} style={{ padding: "8px 14px", borderRadius: 10, background: C.gold, color: "#1a0f00", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Claim</button>
        </div>
      )}

      {/* Cluster expansion */}
      {clusterItems.length > 0 && (
        <div style={{ margin: "0 24px 12px", padding: "12px 14px", borderRadius: 16, background: "rgba(212,133,60,0.08)", border: "1px solid rgba(212,133,60,0.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.saffron }}>{clusterItems.length} temples nearby</span>
            <button className="t" onClick={() => setExpandedCluster(null)} style={{ fontSize: 11, color: C.textD, background: "none", border: "none", cursor: "pointer" }}>Close</button>
          </div>
          {clusterItems.slice(0, 5).map((t, i) => (
            <NearbyCard
              key={t.id}
              t={{ ...t, bearing: t._bearing ?? t.bearing ?? 0 }}
              distanceKm={t._dist ?? t.distance ?? 0}
              onClick={() => { setExpandedCluster(null); oT(t); }}
              delay={i * 0.04}
              gyroHeading={geo.heading}
            />
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !geo.effectiveLocation && [0, 1].map(i => <SkeletonListCard key={i} />)}

      {/* Discovering real-time temples */}
      {geo.effectiveLocation && isDiscovering && nearby.length === 0 && (
        <div style={{ margin: "0 24px 12px", padding: "16px 14px", borderRadius: 14, background: C.card, border: `1px solid ${C.div}`, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${C.div}`, borderTopColor: "#4ade80", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.cream }}>Discovering temples near you…</span>
          </div>
          <div style={{ fontSize: 11, color: C.textD }}>Searching OpenStreetMap for real temples within {range} km</div>
        </div>
      )}

      {/* Fallback — only after discovery finishes with no results */}
      {showFallback && (
        <>
          <div style={{ margin: "0 24px 10px", padding: "10px 14px", borderRadius: 12, background: "rgba(212,133,60,0.08)", border: "1px solid rgba(212,133,60,0.2)" }}>
            <div style={{ fontSize: 12, color: C.saffron, fontWeight: 600 }}>No temples within {range} km</div>
            <div style={{ fontSize: 11, color: C.textD, marginTop: 3 }}>{osmCount > 0 ? "Try a larger radius to find more." : "Showing nearest known temples. Try a larger radius."}</div>
          </div>
          {allWithCoords.slice(0, 10).map((t, i) => (
            <NearbyCard
              key={t.id}
              t={{ ...t, bearing: t._bearing ?? 0 }}
              distanceKm={t._dist}
              onClick={() => oT(t)}
              delay={i * 0.05}
              gyroHeading={geo.heading}
            />
          ))}
        </>
      )}

      {/* Temple list — always shown below map/radar */}
      {geo.effectiveLocation && nearby.length > 0 && nearby.map((t, i) => (
        <NearbyCard
          key={t.id}
          t={{ ...t, bearing: t._bearing ?? 0 }}
          distanceKm={t._dist}
          onClick={() => oT(t)}
          delay={i * 0.05}
          gyroHeading={geo.heading}
        />
      ))}

      {/* Empty states */}
      {geo.effectiveLocation && nearby.length === 0 && !isDiscovering && coordCount === 0 && (
        <Empty emoji="🏛" title="No Temples Found" sub="No temples found near your location. Try a larger radius." />
      )}

      {!geo.effectiveLocation && !loading && (
        <div style={{ margin: "0 24px", padding: "18px 20px", borderRadius: 18, background: C.card, border: `1px solid ${C.div}`, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: C.textD, lineHeight: 1.7, marginBottom: 10 }}>
            Share your location to discover sacred temples around you.
          </div>
          {geo.error && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 10, lineHeight: 1.6 }}>{geo.error}</div>}
          <button
            className="t"
            onClick={() => geo.requestAndWatch()}
            style={{ padding: "9px 18px", borderRadius: 12, background: C.saffronDim, border: "1px solid rgba(212,133,60,0.2)", color: C.saffron, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            {geo.error ? "Try Again" : "Enable Location"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Nearby;
