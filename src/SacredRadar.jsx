import { useMemo, memo } from "react";
import { haversineKm, bearingDeg, formatCompass } from "./useGeo.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Group temples into directional clusters
function clusterByBearing(items, binSize = 30) {
  const bins = {};
  items.forEach((it) => {
    const bin = Math.floor(it.bearing / binSize);
    bins[bin] = bins[bin] || [];
    bins[bin].push(it);
  });
  return Object.values(bins).sort((a, b) => a[0].bearing - b[0].bearing);
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function walkingMinutes(km) {
  return Math.round((km * 1000) / 1.4 / 60);
}

export const RadarDot = memo(({ item, size, heading, maxDistKm }) => {
  const radiusPx = size / 2 - 14; // padding from edge
  const normalized = clamp(1 - item.distance / maxDistKm, 0, 1);
  const r = 4 + normalized * 10; // closer = larger
  const angle = ((item.bearing - (heading ?? 0)) - 90) * (Math.PI / 180);
  const distancePx = 12 + normalized * radiusPx;
  const left = size / 2 + Math.cos(angle) * distancePx;
  const top = size / 2 + Math.sin(angle) * distancePx;
  const hue = item.hue ?? 30;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: `hsl(${hue}, 80%, 55%)`,
        boxShadow: `0 0 ${6 + normalized * 10}px hsla(${hue}, 80%, 55%, 0.8)`,
        transform: "translate(-50%, -50%)",
        transition: "all 0.6s cubic-bezier(.16,1,.3,1)",
        pointerEvents: "none",
      }}
    />
  );
});

export const SacredRadar = memo(({
  location,
  heading,
  temples,
  size = 160,
  maxDistKm = 10,
  showClusters = false,
  onClusterClick,
  style = {},
}) => {
  const { items, clusters } = useMemo(() => {
    if (!location || !temples?.length) return { items: [], clusters: [] };
    const raw = temples
      .filter((t) => t.latitude != null && t.longitude != null)
      .map((t) => {
        const distance = haversineKm(location.latitude, location.longitude, t.latitude, t.longitude);
        const bearing = bearingDeg(location.latitude, location.longitude, t.latitude, t.longitude);
        return { ...t, distance, bearing };
      })
      .filter((t) => t.distance <= maxDistKm)
      .sort((a, b) => a.distance - b.distance);

    const grouped = clusterByBearing(raw, 30);
    const clusters = grouped.filter((g) => g.length >= 3).map((g) => ({
      count: g.length,
      bearing: g.reduce((s, it) => s + it.bearing, 0) / g.length,
      items: g,
    }));

    return { items: raw, clusters };
  }, [location, temples, maxDistKm]);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(42,30,20,0.6) 0%, rgba(26,17,9,0.85) 100%)",
        border: "1px solid rgba(212,133,60,0.18)",
        boxShadow: "inset 0 0 28px rgba(0,0,0,0.35), 0 4px 20px rgba(0,0,0,0.25)",
        ...style,
      }}
    >
      {/* Concentric range rings */}
      {[0.33, 0.66, 1].map((f, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: size * f,
            height: size * f,
            borderRadius: "50%",
            border: "1px solid rgba(212,133,60,0.08)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
      ))}

      {/* North indicator */}
      {heading != null && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 6,
            transform: `translateX(-50%)`,
            fontSize: 9,
            color: "rgba(212,133,60,0.7)",
            fontWeight: 700,
            pointerEvents: "none",
          }}
        >
          N
        </div>
      )}

      {/* Radar sweep wedge */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `conic-gradient(from ${heading != null ? heading - 90 : -90}deg, transparent 0deg, rgba(212,133,60,0.06) 30deg, transparent 60deg)`,
          animation: "radarSweep 3s linear infinite",
          pointerEvents: "none",
        }}
      />

      {/* Center dot (user) */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 0 14px rgba(212,133,60,0.9), 0 0 28px rgba(212,133,60,0.5)",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      {/* Temple dots */}
      {items.map((it) => (
        <RadarDot key={it.id} item={it} size={size} heading={heading} maxDistKm={maxDistKm} />
      ))}

      {/* Cluster bubbles */}
      {showClusters &&
        clusters.map((c, idx) => {
          const radiusPx = size / 2 - 14;
          const angle = ((c.bearing - (heading ?? 0)) - 90) * (Math.PI / 180);
          const distancePx = 12 + 0.7 * radiusPx;
          const left = size / 2 + Math.cos(angle) * distancePx;
          const top = size / 2 + Math.sin(angle) * distancePx;
          return (
            <button
              key={idx}
              onClick={() => onClusterClick?.(c.items)}
              style={{
                position: "absolute",
                left,
                top,
                transform: "translate(-50%, -50%)",
                minWidth: 22,
                height: 22,
                borderRadius: 11,
                background: "rgba(212,133,60,0.9)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 800,
                border: "none",
                padding: "0 7px",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
                transition: "transform .15s ease",
                zIndex: 5,
              }}
            >
              {c.count}
            </button>
          );
        })}
    </div>
  );
});

export const NearbyCard = memo(({ t, distanceKm, onClick, delay = 0, gyroHeading }) => {
  const bearing = t.bearing ?? 0;
  const compass = formatCompass(bearing);
  const walkMin = walkingMinutes(distanceKm);
  const tilt = gyroHeading != null ? ((bearing - gyroHeading + 540) % 360) - 180 : 0;
  const rotateY = clamp(tilt * 0.15, -12, 12);

  return (
    <div
      className="t rv"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        margin: "0 24px 10px",
        borderRadius: 18,
        background: "rgba(36,26,16,0.85)",
        border: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        animationDelay: `${delay}s`,
        transform: `perspective(600px) rotateY(${rotateY}deg)`,
        transition: "transform 0.4s cubic-bezier(.16,1,.3,1), background 0.2s",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: `linear-gradient(135deg, hsla(${t.hue ?? 30}, 60%, 45%, 0.25), hsla(${t.hue ?? 30}, 60%, 35%, 0.15))`,
          border: `1px solid hsla(${t.hue ?? 30}, 60%, 50%, 0.25)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#fff",
          flexShrink: 0,
        }}
      >
        {t.deityPrimary?.[0] ?? "T"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#F2E8D4",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {t.templeName}
        </div>
        <div style={{ fontSize: 11, color: "#A89878", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {[t.townOrCity, t.district, t.stateOrUnionTerritory].filter(Boolean).join(" · ") || (t._source === "osm" ? "OpenStreetMap" : "Sacred Temple")}
        </div>
        <div style={{ fontSize: 11, color: "#A89878", marginTop: 3, display: "flex", alignItems: "center", gap: 8 }}>
          <span>{formatDistance(distanceKm)}</span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(168,152,120,0.5)" }} />
          <span>{walkMin} min walk</span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(168,152,120,0.5)" }} />
          <span>{compass}</span>
        </div>
      </div>
      <div style={{ fontSize: 18, color: "rgba(212,133,60,0.7)", flexShrink: 0 }}>→</div>
    </div>
  );
});

export const RadarLegend = memo(({ count, maxDistKm }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 10,
      fontSize: 11,
      color: "#A89878",
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "#D4853C",
        boxShadow: "0 0 6px rgba(212,133,60,0.6)",
      }}
    />
    <span>
      {count} temple{count !== 1 ? "s" : ""} within {maxDistKm} km
    </span>
  </div>
));
