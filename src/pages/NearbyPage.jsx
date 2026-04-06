import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { C, FD } from "../theme.js";
import { haptic } from "../utils.js";
import { Chip, ThemeBtn, SkeletonListCard, Empty } from "../components.jsx";
import { useGeo, haversineKm, bearingDeg } from "../useGeo.js";
import { SacredRadar, NearbyCard, RadarLegend } from "../SacredRadar.jsx";
import { mergeTemples, fetchOsmTemplesProgressive } from "../osm-temples.js";
import { TIRTHA_CIRCUITS } from "../tirtha-data.js";

const Nearby = ({oT, oF, temples, loading, isDark, onToggleTheme}) => {
  const geo = useGeo({ enableHighAccuracy: true });
  useEffect(() => {
    geo.startWatching();
    return () => geo.stopWatching();
  }, []);
  const [range, setRange] = useState(25);
  const [osmLoading, setOsmLoading] = useState(false);
  const [osmRadius, setOsmRadius] = useState(0);
  const [osmError, setOsmError] = useState(null);
  const [osmCount, setOsmCount] = useState(0);
  const [merged, setMerged] = useState(temples);
  const [expandedCluster, setExpandedCluster] = useState(null);
  const [claimToast, setClaimToast] = useState(null);
  const claimTimerRef = useRef(null);
  const RANGES = [{l:"5 km",v:5},{l:"10 km",v:10},{l:"25 km",v:25},{l:"50 km",v:50},{l:"100 km",v:100}];
  const lastHapticRef = useRef(0);
  const templesRef = useRef(temples);
  const fetchingRef = useRef(false);
  const fetchedKeyRef = useRef("");
  const osmDebounceRef = useRef(null);

  useEffect(() => {
    templesRef.current = temples;
    setMerged(prev => {
      const osmOnly = prev.filter(p => p._source === "osm");
      return mergeTemples(temples, osmOnly);
    });
  }, [temples]);

  const allWithCoords = useMemo(() => {
    const loc = geo.effectiveLocation;
    if (!loc) return [];
    return merged
      .filter(t => t.latitude != null && t.longitude != null && isFinite(t.latitude) && isFinite(t.longitude))
      .map(t => ({
        ...t,
        _dist: haversineKm(loc.latitude, loc.longitude, t.latitude, t.longitude),
        _bearing: bearingDeg(loc.latitude, loc.longitude, t.latitude, t.longitude),
      }))
      .filter(t => isFinite(t._dist) && t._dist >= 0)
      .sort((a, b) => a._dist - b._dist);
  }, [geo.effectiveLocation?.latitude, geo.effectiveLocation?.longitude, merged]);

  const nearby = useMemo(() => {
    return allWithCoords.filter(t => t._dist <= range);
  }, [allWithCoords, range]);

  const supabaseInRange = useMemo(() => {
    const loc = geo.effectiveLocation;
    if (!loc) return 0;
    return temples
      .filter(t => t.latitude != null && t.longitude != null && isFinite(t.latitude) && isFinite(t.longitude))
      .filter(t => {
        const d = haversineKm(loc.latitude, loc.longitude, t.latitude, t.longitude);
        return isFinite(d) && d <= range;
      }).length;
  }, [geo.effectiveLocation?.latitude, geo.effectiveLocation?.longitude, temples, range]);

  const shouldFetchOsm = useMemo(() => {
    const loc = geo.effectiveLocation;
    if (!loc) return false;
    if (range >= 10) return true;
    return supabaseInRange < 15;
  }, [geo.effectiveLocation?.latitude, geo.effectiveLocation?.longitude, range, supabaseInRange]);

  const runOsmFetch = useCallback(() => {
    let cancelled = false;
    const loc = geo.effectiveLocation;
    if (!loc || !shouldFetchOsm) {
      setOsmRadius(0);
      setOsmError(null);
      if (!shouldFetchOsm) {
        setMerged(prev => prev.filter(p => p._source !== "osm"));
        setOsmCount(0);
      }
      return;
    }
    const fetchKey = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)},${range}`;
    if (fetchedKeyRef.current === fetchKey || fetchingRef.current) return;
    fetchedKeyRef.current = fetchKey;
    fetchingRef.current = true;
    setOsmLoading(true);
    setOsmError(null);
    fetchOsmTemplesProgressive(loc.latitude, loc.longitude, (r) => setOsmRadius(r))
      .then(({ data, radius }) => {
        if (cancelled) return;
        setOsmCount(data.length);
        setMerged(mergeTemples(templesRef.current, data));
        setOsmError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setOsmError(e.message || "Could not reach OpenStreetMap. Try again.");
      })
      .finally(() => {
        fetchingRef.current = false;
        if (!cancelled) setOsmLoading(false);
      });
    return () => { cancelled = true; };
  }, [geo.effectiveLocation?.latitude, geo.effectiveLocation?.longitude, shouldFetchOsm, range]);

  // Debounced OSM fetch — waits 600ms after range/location changes before triggering
  useEffect(() => {
    if (osmDebounceRef.current) clearTimeout(osmDebounceRef.current);
    osmDebounceRef.current = setTimeout(() => {
      const cleanup = runOsmFetch();
      return cleanup;
    }, 600);
    return () => {
      if (osmDebounceRef.current) clearTimeout(osmDebounceRef.current);
    };
  }, [runOsmFetch]);

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

  const clusterItems = expandedCluster || [];
  const coordCount = allWithCoords.length;
  const nearest = allWithCoords[0];
  const showFallback = geo.effectiveLocation && nearby.length === 0 && coordCount > 0;

  return (
    <div className="fi" style={{paddingBottom:24}}>
      <div style={{padding:"22px 24px",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div>
          <h1 style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream}}>Nearby</h1>
          <p style={{fontSize:13,color:C.textD,marginTop:5}}>
            {geo.effectiveLocation ? `${nearby.length} temples within ${range} km` : "Temples around your location"}
          </p>
        </div>
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
      </div>

      {geo.effectiveLocation && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",margin:"8px 0 18px"}}>
          <SacredRadar
            location={geo.effectiveLocation}
            heading={geo.heading}
            temples={merged}
            size={240}
            maxDistKm={range}
            showClusters={true}
            onClusterClick={(items) => setExpandedCluster(items)}
          />
          <RadarLegend count={nearby.length} maxDistKm={range} />
        </div>
      )}

      <div style={{display:"flex",justifyContent:"center",margin:"0 24px 14px"}}>
        <button
          className="t"
          onClick={() => geo.requestAndWatch()}
          disabled={geo.status === "locating"}
          style={{
            display:"flex",alignItems:"center",gap:8,
            padding:"11px 22px",borderRadius:99,
            background: geo.status === "active" ? C.saffronDim : `linear-gradient(120deg,${C.saffron},${C.saffronH})`,
            border: `1px solid ${geo.status === "active" ? "rgba(212,133,60,0.25)" : "transparent"}`,
            color: geo.status === "active" ? C.saffron : "#fff",
            fontSize:12,fontWeight:700,cursor:"pointer",
            animation: geo.status === "locating" ? "locatePulse 1.2s ease-in-out infinite" : "none",
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
          </svg>
          {geo.status === "locating" ? "Locating…" : geo.status === "active" ? "Live Tracking" : geo.error ? "Try Again" : "Locate Me"}
        </button>
      </div>

      {geo.effectiveLocation && (
        <div style={{display:"flex",gap:8,padding:"0 24px 12px",overflowX:"auto"}}>
          {RANGES.map(r => (
            <Chip key={r.l} label={r.l} active={range===r.v} onClick={() => { setRange(r.v); setExpandedCluster(null); }}/>
          ))}
        </div>
      )}

      {geo.effectiveLocation && (
        <div style={{margin:"0 24px 14px",padding:"12px 14px",borderRadius:14,background:C.card,border:`1px solid ${C.div}`}}>
          <div style={{fontSize:11,color:C.textD,lineHeight:1.6}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:geo.status==="active"?"#22c55e":"#eab308"}}/>
              <span>GPS {geo.status==="active"?"active":geo.error?"denied":"calibrating"}
                {geo.effectiveLocation?.accuracy ? ` · ±${Math.round(geo.effectiveLocation.accuracy)}m` : ""}
              </span>
            </div>
            <div>Database: <span style={{color:C.creamM,fontWeight:600}}>{temples.filter(t=>t.latitude!=null&&t.longitude!=null).length}</span> temples with coordinates</div>
            {nearest && <div>Nearest temple: <span style={{color:C.saffron,fontWeight:600}}>{nearest.templeName}</span> · {nearest._dist < 1 ? `${(nearest._dist*1000).toFixed(0)} m` : `${nearest._dist.toFixed(1)} km`} away</div>}
            {osmLoading && <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}><span style={{width:10,height:10,borderRadius:"50%",border:`1.5px solid ${C.div}`,borderTopColor:C.saffron,animation:"spin 0.7s linear infinite",display:"inline-block"}}/><span>Scanning OpenStreetMap{osmRadius ? ` up to ${osmRadius} km…` : "…"}</span></div>}
            {!osmLoading && osmCount > 0 && <div style={{marginTop:4,color:"#4ade80"}}>✓ OpenStreetMap added {osmCount} more temples</div>}
            {osmError && (
              <div style={{marginTop:6,display:"flex",alignItems:"center",gap:8,justifyContent:"space-between"}}>
                <span style={{color:"#f87171"}}>⚠ {osmError}</span>
                <button className="t" onClick={runOsmFetch} style={{padding:"5px 10px",borderRadius:8,background:C.saffronDim,border:"none",color:C.saffron,fontSize:10,fontWeight:700,cursor:"pointer"}}>Retry</button>
              </div>
            )}
          </div>
        </div>
      )}

      {claimToast && (
        <div style={{margin:"0 24px 12px",padding:"12px 14px",borderRadius:14,background:"rgba(196,162,78,0.12)",border:"1px solid rgba(196,162,78,0.35)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.gold}}>You are at {claimToast.temple.name}</div>
            <div style={{fontSize:11,color:C.textD,marginTop:2}}>Claim your Tīrtha Stamp?</div>
          </div>
          <button className="t" onClick={claimStamp} style={{padding:"8px 14px",borderRadius:10,background:C.gold,color:"#1a0f00",border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>Claim</button>
        </div>
      )}

      {clusterItems.length > 0 && (
        <div style={{margin:"0 24px 12px",padding:"12px 14px",borderRadius:16,background:"rgba(212,133,60,0.08)",border:"1px solid rgba(212,133,60,0.18)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:700,color:C.saffron}}>{clusterItems.length} temples nearby</span>
            <button className="t" onClick={() => setExpandedCluster(null)} style={{fontSize:11,color:C.textD,background:"none",border:"none",cursor:"pointer"}}>Close</button>
          </div>
          {clusterItems.slice(0,5).map((t,i) => (
            <NearbyCard
              key={t.id}
              t={{...t, bearing: t._bearing ?? t.bearing ?? 0}}
              distanceKm={t._dist ?? t.distance ?? 0}
              onClick={() => { setExpandedCluster(null); oT(t); }}
              delay={i * 0.04}
              gyroHeading={geo.heading}
            />
          ))}
        </div>
      )}

      {loading && !geo.effectiveLocation && [0,1].map(i => <SkeletonListCard key={i}/>)}

      {showFallback && (
        <>
          <div style={{margin:"0 24px 10px",padding:"10px 14px",borderRadius:12,background:"rgba(212,133,60,0.08)",border:"1px solid rgba(212,133,60,0.2)"}}>
            <div style={{fontSize:12,color:C.saffron,fontWeight:600}}>No temples within {range} km</div>
            <div style={{fontSize:11,color:C.textD,marginTop:3}}>Showing the nearest temples from our database regardless of radius.</div>
          </div>
          {allWithCoords.slice(0,10).map((t,i) => (
            <NearbyCard
              key={t.id}
              t={{...t, bearing: t._bearing ?? 0}}
              distanceKm={t._dist}
              onClick={() => oT(t)}
              delay={i * 0.05}
              gyroHeading={geo.heading}
            />
          ))}
        </>
      )}

      {geo.effectiveLocation && nearby.length > 0 && nearby.map((t,i) => (
        <NearbyCard
          key={t.id}
          t={{...t, bearing: t._bearing ?? 0}}
          distanceKm={t._dist}
          onClick={() => oT(t)}
          delay={i * 0.05}
          gyroHeading={geo.heading}
        />
      ))}

      {geo.effectiveLocation && nearby.length === 0 && coordCount === 0 && !osmLoading && (
        <Empty emoji="🏛" title="No Temples Nearby" sub={`No temples found in the database with coordinates. Try a larger radius or check back later.`}/>
      )}

      {!geo.effectiveLocation && !loading && (
        <div style={{margin:"0 24px",padding:"18px 20px",borderRadius:18,background:C.card,border:`1px solid ${C.div}`,textAlign:"center"}}>
          <div style={{fontSize:12,color:C.textD,lineHeight:1.7,marginBottom:10}}>
            Share your location to discover sacred temples around you.
          </div>
          {geo.error && <div style={{fontSize:11,color:"#f87171",marginBottom:10,lineHeight:1.6}}>{geo.error}</div>}
          <button
            className="t"
            onClick={() => geo.requestAndWatch()}
            style={{padding:"9px 18px",borderRadius:12,background:C.saffronDim,border:`1px solid rgba(212,133,60,0.2)`,color:C.saffron,fontSize:12,fontWeight:700,cursor:"pointer"}}
          >
            {geo.error ? "Try Again" : "Enable Location"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Nearby;
