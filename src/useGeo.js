import { useState, useEffect, useRef, useCallback } from "react";

const CACHE_KEY = "sti_geo_cache_v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

export const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const bearingDeg = (lat1, lon1, lat2, lon2) => {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  let brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
};

export const formatCompass = (deg) => {
  const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  const idx = Math.round(deg / 45);
  const arrow = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖", "↑"][idx];
  return `${arrow} ${names[idx]}`;
};

const loadCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveCache = (coords) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ lat: coords.latitude, lng: coords.longitude, ts: Date.now() })
    );
  } catch {}
};

export function useGeo({ enableHighAccuracy = true } = {}) {
  const [location, setLocation] = useState(null);
  const [cachedLocation, setCachedLocation] = useState(() => loadCache());
  const [heading, setHeading] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | locating | active | denied
  const watchIdRef = useRef(null);
  const lastHapticRef = useRef(0);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setStatus("denied");
      return;
    }
    setStatus("locating");
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        };
        setLocation(coords);
        saveCache(coords);
        setStatus("active");
      },
      (err) => {
        setError(
          err.code === 1
            ? "Location access denied. Please allow location in browser settings."
            : "Could not get your location. Please try again."
        );
        setStatus(err.code === 1 ? "denied" : "idle");
      },
      {
        enableHighAccuracy,
        maximumAge: 0,
        timeout: 20000,
      }
    );
  }, [enableHighAccuracy]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Compass heading
  useEffect(() => {
    const onHeading = (e) => {
      let h = null;
      if (e.webkitCompassHeading != null) {
        h = e.webkitCompassHeading;
      } else if (e.alpha != null) {
        h = e.alpha;
        if (window.orientation) {
          h += window.orientation;
        }
        h = (360 - h) % 360;
      }
      if (h != null) {
        setHeading((prev) => {
          const next = Math.round(h);
          if (prev == null || Math.abs(prev - next) > 2) return next;
          return prev;
        });
      }
    };

    const tryAdd = (eventName) => {
      window.addEventListener(eventName, onHeading, { passive: true });
    };

    tryAdd("deviceorientationabsolute");
    tryAdd("deviceorientation");

    return () => {
      window.removeEventListener("deviceorientationabsolute", onHeading);
      window.removeEventListener("deviceorientation", onHeading);
    };
  }, []);

  // Auto-start watch on mount
  useEffect(() => {
    startWatching();
    return () => stopWatching();
  }, [startWatching, stopWatching]);

  // iOS 13+ permission helper
  const requestIOSPermission = useCallback(async () => {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        await DeviceOrientationEvent.requestPermission();
      } catch {}
    }
  }, []);

  const effectiveLocation = location || cachedLocation || null;

  return {
    location,
    cachedLocation,
    effectiveLocation,
    heading,
    error,
    status,
    startWatching,
    stopWatching,
    requestIOSPermission,
  };
}

export function useNearbyProximityHaptic(temples, thresholdMeters = 500) {
  const lastHapticRef = useRef(0);
  const geo = useGeo();
  const loc = geo.effectiveLocation;

  useEffect(() => {
    if (!loc || !temples?.length) return;
    const now = Date.now();
    if (now - lastHapticRef.current < 5000) return; // min 5s between haptics
    const nearby = temples.some((t) => {
      if (t.latitude == null || t.longitude == null) return false;
      const d = haversineKm(loc.latitude, loc.longitude, t.latitude, t.longitude);
      return d * 1000 <= thresholdMeters;
    });
    if (nearby) {
      try {
        navigator.vibrate?.(40);
      } catch {}
      lastHapticRef.current = now;
    }
  }, [loc, temples, thresholdMeters]);

  return geo;
}
