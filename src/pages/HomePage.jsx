import { useState, useEffect, useRef, useMemo } from "react";
import { C, hsl, FD, FB, FE } from "../theme.js";
import { DEITIES, SHLOKAS, HERO_PARTICLES, STATES } from "../data.js";
import { haptic, deityQuery } from "../utils.js";
import { useCountUp, useOmChant } from "../hooks.js";
import { useGeo, haversineKm, bearingDeg } from "../useGeo.js";
import { SacredRadar, NearbyCard } from "../SacredRadar.jsx";
import LivePanchangam from "../LivePanchangam.jsx";
import CinematicOverlay from "../CinematicOverlay.jsx";
import {
  OmSymbol, TempleImage, Reveal, Typewriter, ShlokaWidget,
  PilgrimageCard, SH, FCard, CardCarousel, ThemeBtn,
  SkeletonCard, SkeletonListCard,
  OmVisualizer, SacredCircuits, FeatureCard,
} from "../components.jsx";

const Home = ({ nav, oT, oF, temples, loading, isDark, onToggleTheme, recentIds = [] }) => {
  const { playing, toggle } = useOmChant();
  const [chantFlash, setChantFlash] = useState(0);
  const handleChantToggle = () => { haptic(playing ? 20 : 40); toggle(); setChantFlash(f => f + 1); };
  const [notified, setNotified] = useState(() => localStorage.getItem('premiumNotify') === '1');
  const onNotify = () => { localStorage.setItem('premiumNotify', '1'); setNotified(true); };

  // Animated stats counters
  const [templesCount, triggerTemples] = useCountUp(3000, 1600);
  const [statesCount, triggerStates] = useCountUp(36, 1200);
  const [deitiesCount, triggerDeities] = useCountUp(6, 900);
  const statsRef = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { triggerTemples(); triggerStates(); triggerDeities(); obs.disconnect(); }
    }, { threshold: 0.5 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, [triggerTemples, triggerStates, triggerDeities]);

  // Geo for real "Near You"
  const geo = useGeo({ enableHighAccuracy: true });
  useEffect(() => {
    geo.startWatching();
    return () => geo.stopWatching();
  }, []);
  const nearYou = useMemo(() => {
    const loc = geo.effectiveLocation;
    if (!loc || !temples.length) return { inRange: [], all: [] };
    const all = temples
      .filter(t => t.latitude != null && t.longitude != null && isFinite(t.latitude) && isFinite(t.longitude))
      .map(t => ({
        ...t,
        _dist: haversineKm(loc.latitude, loc.longitude, t.latitude, t.longitude),
        _bearing: bearingDeg(loc.latitude, loc.longitude, t.latitude, t.longitude),
      }))
      .filter(t => isFinite(t._dist) && t._dist >= 0)
      .sort((a, b) => a._dist - b._dist);
    return { inRange: all.slice(0, 6), all };
  }, [geo.effectiveLocation?.latitude, geo.effectiveLocation?.longitude, temples]);

  return (
    <div className="fi" style={{ paddingBottom: 28 }}>
      {/* Cinematic spiritual overlay — triggered by Om chant */}
      <CinematicOverlay active={playing} />

      {/* HERO */}
      <div style={{ background: isDark ? `linear-gradient(175deg,${hsl(30, 48, 13)},${hsl(350, 42, 10)} 55%,${C.bg})` : `linear-gradient(175deg,${hsl(30, 60, 94)},${hsl(350, 50, 97)} 55%,${C.bg})`, padding: "22px 24px 40px", borderRadius: "0 0 42px 42px", position: "relative", overflow: "hidden", boxShadow: isDark ? `0 24px 80px ${hsl(350, 30, 7, 0.55)}` : `0 24px 80px ${hsl(30, 40, 80, 0.18)}`, transition: "box-shadow 1.5s ease" }}>
        {/* Ambient glows */}
        <div style={{ position: "absolute", top: "-8%", right: "-12%", width: 320, height: 320, borderRadius: "50%", background: `radial-gradient(circle,rgba(212,133,60,${playing ? 0.14 : 0.07}),transparent 60%)`, filter: "blur(60px)", animation: "breathe 9s ease-in-out infinite", pointerEvents: "none", transition: "background 1.5s ease" }} />
        <div style={{ position: "absolute", bottom: "5%", left: "-18%", width: 220, height: 220, borderRadius: "50%", background: `radial-gradient(circle,rgba(160,80,180,${playing ? 0.08 : 0.04}),transparent 60%)`, filter: "blur(45px)", animation: "breathe 12s ease-in-out infinite 3s", pointerEvents: "none", transition: "background 1.5s ease" }} />
        {/* Floating incense particles */}
        {HERO_PARTICLES.map((p, i) => (
          <div key={i} style={{
            position: "absolute", bottom: `${p.b}%`, left: `${p.l}%`,
            width: p.s, height: p.s, borderRadius: "50%",
            background: "rgba(240,192,96,0.6)",
            boxShadow: `0 0 ${p.s * 4}px rgba(240,192,96,0.45)`,
            pointerEvents: "none", zIndex: 1,
            animation: `floatUp ${p.dur}s ease-in-out infinite ${p.d}s`,
            '--fp-x': `${p.x}px`,
          }} />
        ))}

        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 9, color: "rgba(212,133,60,0.45)", fontWeight: 800, letterSpacing: 5, textTransform: "uppercase", marginBottom: 8, animation: "rv .5s ease both" }}>Discover</div>
            <h1 style={{ fontFamily: FD, fontSize: 36, color: C.cream, fontWeight: 500, lineHeight: .96, letterSpacing: -.5, animation: "rv .55s cubic-bezier(.16,1,.3,1) .08s both" }}>Sacred<br />Temples</h1>
            <p style={{ fontFamily: FD, fontSize: 15, color: C.textDD, marginTop: 8, fontStyle: "italic", animation: "rv .55s cubic-bezier(.16,1,.3,1) .22s both" }}>
              <Typewriter text="of Bhārata" delay={480} speed={62} />
            </p>
          </div>
          <button className="t" aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{ width: 46, height: 46, borderRadius: 15, background: isDark ? "rgba(255,255,255,0.05)" : C.saffronDim, border: `1px solid ${isDark ? C.div : C.saffronPale}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .3s cubic-bezier(.16,1,.3,1)", boxShadow: isDark ? "none" : `0 4px 16px ${C.saffronDim}` }}>
            {isDark
              ? <svg width="19" height="19" fill="none" stroke="rgba(255,220,100,0.85)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
              : <svg width="19" height="19" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            }
          </button>
        </div>

        {/* OM SYMBOL */}
        <div style={{ position: "relative", textAlign: "center", marginBottom: 24, paddingTop: 8 }} aria-hidden="true">
          {/* Expanding pulse rings */}
          {[0, 1, 2].map(i => (
            <div key={i} aria-hidden="true" style={{ position: "absolute", top: "50%", left: "50%", width: 190, height: 190, borderRadius: "50%", border: "1.5px solid rgba(212,133,60,0.18)", transform: "translate(-50%,-50%)", animation: `ringExpand 3.6s ease-out infinite ${i * 1.2}s`, pointerEvents: "none" }} />
          ))}
          {/* Spinning halos */}
          <div style={{ position: "absolute", top: "50%", left: "50%", width: 240, height: 240, borderRadius: "50%", border: "1px dashed rgba(212,133,60,0.18)", transform: "translate(-50%,-50%)", animation: "omHaloSpin 28s linear infinite", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", width: 210, height: 210, borderRadius: "50%", border: "1px dashed rgba(240,192,96,0.12)", transform: "translate(-50%,-50%)", animation: "omHaloSpin 18s linear infinite reverse", pointerEvents: "none" }} />
          {/* Static concentric rings */}
          {[220, 168, 116].map((r, i) => (
            <div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: r, height: r, borderRadius: "50%", border: `1px solid rgba(212,133,60,${0.04 + i * 0.04})`, transform: "translate(-50%,-50%)", animation: `breathe ${7 + i * 2}s ease-in-out infinite ${i * .6}s`, pointerEvents: "none" }} />
          ))}
          {/* Sunburst rays */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-52%)", pointerEvents: "none", zIndex: 1, animation: "omHaloSpin 60s linear infinite" }}>
            <svg width={220} height={220} viewBox="0 0 220 220" style={{ opacity: 0.09 }}>
              {Array.from({ length: 24 }, (_, i) => { const a = (i * 15) * Math.PI / 180; return <line key={i} x1="110" y1="110" x2={110 + 104 * Math.cos(a)} y2={110 + 104 * Math.sin(a)} stroke="#F0C060" strokeWidth="2" />; })}
            </svg>
          </div>
          {/* Deep radial glow behind OM */}
          <div style={{ position: "absolute", top: "50%", left: "50%", width: playing ? 200 : 170, height: playing ? 200 : 170, borderRadius: "50%", background: `radial-gradient(circle,rgba(240,192,96,${playing ? 0.42 : 0.28}),rgba(212,133,60,${playing ? 0.18 : 0.10}) 50%,transparent 70%)`, transform: "translate(-50%,-50%)", filter: `blur(${playing ? 28 : 22}px)`, animation: "breathe 4s ease-in-out infinite", pointerEvents: "none", transition: "all 1.5s ease" }} />

          {/* Flower layers */}
          {[
            { emoji: "🌸", r: "118px", dur: "22s", op: 0.72, delay: "0s" },
            { emoji: "🌺", r: "118px", dur: "22s", op: 0.65, delay: "2.75s" },
            { emoji: "🌸", r: "118px", dur: "22s", op: 0.70, delay: "5.5s" },
            { emoji: "🪷", r: "118px", dur: "22s", op: 0.68, delay: "8.25s" },
            { emoji: "🌼", r: "118px", dur: "22s", op: 0.62, delay: "11s" },
            { emoji: "🌸", r: "118px", dur: "22s", op: 0.70, delay: "13.75s" },
            { emoji: "🌺", r: "118px", dur: "22s", op: 0.65, delay: "16.5s" },
            { emoji: "🪷", r: "118px", dur: "22s", op: 0.72, delay: "19.25s" },
          ].map((p, i) => (
            <div key={`po1-${i}`} style={{
              position: "absolute", top: "50%", left: "50%", fontSize: 14, lineHeight: 1,
              pointerEvents: "none", zIndex: 2,
              "--po-r": p.r, "--po-op": p.op,
              animation: `petalOrbit ${p.dur} linear infinite ${p.delay}`,
            }}>{p.emoji}</div>
          ))}
          {[
            { emoji: "🌼", r: "82px", dur: "14s", op: 0.58, delay: "0s" },
            { emoji: "✿", r: "82px", dur: "14s", op: 0.55, delay: "2.33s" },
            { emoji: "🌼", r: "82px", dur: "14s", op: 0.60, delay: "4.66s" },
            { emoji: "❀", r: "82px", dur: "14s", op: 0.55, delay: "6.99s" },
            { emoji: "🌼", r: "82px", dur: "14s", op: 0.58, delay: "9.32s" },
            { emoji: "✿", r: "82px", dur: "14s", op: 0.52, delay: "11.65s" },
          ].map((p, i) => (
            <div key={`po2-${i}`} style={{
              position: "absolute", top: "50%", left: "50%", fontSize: 11, lineHeight: 1,
              pointerEvents: "none", zIndex: 2, color: "rgba(240,192,96,0.85)", fontWeight: "bold",
              "--po-r": p.r, "--po-op": p.op,
              animation: `petalOrbit ${p.dur} linear infinite reverse ${p.delay}`,
            }}>{p.emoji}</div>
          ))}
          {[
            { emoji: "🌸", x: "-18px", r: "80deg", dur: "6.8s", delay: "0s" },
            { emoji: "🌺", x: "22px", r: "-65deg", dur: "8.2s", delay: "1.1s" },
            { emoji: "🌼", x: "-8px", r: "110deg", dur: "7.4s", delay: "2.3s" },
            { emoji: "🪷", x: "14px", r: "-95deg", dur: "9.0s", delay: "3.5s" },
            { emoji: "🌸", x: "-24px", r: "55deg", dur: "6.2s", delay: "4.6s" },
            { emoji: "🌼", x: "10px", r: "-130deg", dur: "7.8s", delay: "5.7s" },
          ].map((p, i) => (
            <div key={`pf-${i}`} style={{
              position: "absolute", top: "50%", left: "50%", fontSize: 13, lineHeight: 1,
              pointerEvents: "none", zIndex: 2,
              "--pf-x": p.x, "--pf-r": p.r,
              animation: `petalFloat ${p.dur} ease-out infinite ${p.delay}`,
            }}>{p.emoji}</div>
          ))}
          {[
            { deg: "0deg", r: "136px", dur: "2.2s", delay: "0s", col: "rgba(255,220,100,0.9)" },
            { deg: "30deg", r: "142px", dur: "3.1s", delay: ".4s", col: "rgba(212,133,60,0.85)" },
            { deg: "60deg", r: "130px", dur: "2.6s", delay: ".8s", col: "rgba(255,200,80,0.9)" },
            { deg: "90deg", r: "140px", dur: "1.9s", delay: "1.2s", col: "rgba(196,162,78,0.9)" },
            { deg: "120deg", r: "136px", dur: "2.8s", delay: ".2s", col: "rgba(255,220,100,0.85)" },
            { deg: "150deg", r: "138px", dur: "2.4s", delay: ".6s", col: "rgba(212,133,60,0.9)" },
            { deg: "180deg", r: "132px", dur: "3.0s", delay: "1.0s", col: "rgba(255,200,80,0.85)" },
            { deg: "210deg", r: "142px", dur: "2.1s", delay: "1.4s", col: "rgba(196,162,78,0.9)" },
            { deg: "240deg", r: "136px", dur: "2.7s", delay: ".3s", col: "rgba(255,220,100,0.9)" },
            { deg: "270deg", r: "140px", dur: "1.8s", delay: ".7s", col: "rgba(212,133,60,0.85)" },
            { deg: "300deg", r: "134px", dur: "2.9s", delay: "1.1s", col: "rgba(255,200,80,0.9)" },
            { deg: "330deg", r: "138px", dur: "2.3s", delay: ".5s", col: "rgba(196,162,78,0.85)" },
          ].map((s, i) => (
            <div key={`pt-${i}`} style={{
              position: "absolute", top: "50%", left: "50%",
              width: i % 3 === 0 ? 5 : i % 3 === 1 ? 4 : 3,
              height: i % 3 === 0 ? 5 : i % 3 === 1 ? 4 : 3,
              borderRadius: "50%", background: s.col,
              pointerEvents: "none", zIndex: 2,
              boxShadow: `0 0 6px ${s.col}`,
              "--pt-deg": s.deg, "--pt-r": s.r,
              animation: `petalTwinkle ${s.dur} ease-in-out infinite ${s.delay}`,
            }} />
          ))}
          {/* SVG lotus mandala */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 1, animation: "omHaloSpin 45s linear infinite reverse", opacity: 0.22 }}>
            <svg width={290} height={290} viewBox="0 0 290 290">
              {Array.from({ length: 16 }, (_, i) => {
                const a = (i * 22.5) * Math.PI / 180;
                const r1 = 128, r2 = 142, r3 = 115;
                const x1 = 145 + r1 * Math.cos(a), y1 = 145 + r1 * Math.sin(a);
                const x2 = 145 + r2 * Math.cos(a + 0.12), y2 = 145 + r2 * Math.sin(a + 0.12);
                const x3 = 145 + r3 * Math.cos(a + 0.22), y3 = 145 + r3 * Math.sin(a + 0.22);
                return <path key={i} d={`M145,145 Q${x2},${y2} ${x1},${y1} Q${x2 + 2},${y2 + 2} ${x3},${y3} Z`} fill="rgba(212,133,60,0.6)" stroke="none" />;
              })}
            </svg>
          </div>

          <OmVisualizer playing={playing} />
          <OmSymbol size={168} />
          {chantFlash > 0 && (
            <div key={chantFlash} aria-hidden="true" style={{
              position: "absolute", top: "50%", left: "50%",
              width: 180, height: 180, borderRadius: "50%",
              border: "2.5px solid rgba(212,133,60,0.9)",
              animation: "goldenRing 0.7s ease-out both",
              pointerEvents: "none", zIndex: 10,
            }} />
          )}
          {/* Om chant button */}
          <div style={{ position: "absolute", bottom: -14, left: "50%", transform: "translateX(-50%)", zIndex: 3 }}>
            <button className="t" onClick={handleChantToggle} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 22px", borderRadius: 100, background: playing ? "rgba(212,133,60,0.9)" : "rgba(212,133,60,0.12)", border: `1.5px solid ${playing ? C.saffron : "rgba(212,133,60,0.3)"}`, cursor: "pointer", backdropFilter: "blur(12px)", transition: "all .3s cubic-bezier(.16,1,.3,1)", boxShadow: playing ? "0 4px 28px rgba(212,133,60,0.4)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 2, height: 14 }}>
                {[1, 1.8, 1.3, 2, 1.5, 1.1, 1.7].map((h, i) => (
                  <div key={i} style={{ width: 2.5, borderRadius: 2, background: playing ? "#fff" : C.saffron, height: `${h * 6}px`, animation: playing ? `soundWave 1.1s ease-in-out infinite ${i * .12}s` : "none", opacity: playing ? 1 : .7 }} />
                ))}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: .8, color: playing ? "#fff" : C.saffron, textTransform: "uppercase" }}>{playing ? "Chanting…" : "Chant Om"}</span>
            </button>
          </div>
        </div>

        {/* AR Darshan button — below Om area */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16, position: "relative", zIndex: 3 }}>
          <button className="t" onClick={() => nav("mandalaAR")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 100, background: "rgba(196,162,78,0.12)", border: "1px solid rgba(196,162,78,0.30)", cursor: "pointer", backdropFilter: "blur(12px)", transition: "all .2s" }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: .8, color: C.gold, textTransform: "uppercase" }}>AR Darshan</span>
            <span style={{ fontSize: 10, color: C.textD }}>Immersive Sacred Experience</span>
          </button>
        </div>

        {/* Search */}
        <div className="t" onClick={() => nav("search")} style={{ padding: "15px 20px", borderRadius: 18, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", gap: 14, border: `1px solid ${C.div}`, cursor: "pointer", position: "relative", zIndex: 2, marginTop: 26 }}>
          <span style={{ fontSize: 16, color: C.textDD }}>⌕</span>
          <span style={{ flex: 1, fontSize: 14, color: C.textDD }}>Search temples, deities, places…</span>
        </div>

        {/* Stats */}
        <div ref={statsRef} style={{ display: "flex", justifyContent: "center", gap: 0, marginTop: 28, position: "relative", zIndex: 2 }}>
          {[
            { val: templesCount, suffix: "+", l: "Temples" },
            { val: statesCount, suffix: "", l: "States & UTs" },
            { val: deitiesCount, suffix: "", l: "Deities" },
          ].map((s, i) => (
            <div key={s.l} style={{ textAlign: "center", flex: 1, padding: "14px 0", borderRadius: 16, position: "relative" }}>
              {i > 0 && <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 1, background: C.divL }} />}
              <div style={{ fontFamily: FD, fontSize: 24, fontWeight: 500, color: C.saffron, textShadow: "0 0 20px rgba(212,133,60,0.3)", animation: "countUp .6s ease both", animationDelay: `${i * .12}s` }}>
                {s.val.toLocaleString()}{s.suffix}
              </div>
              <div style={{ fontSize: 9, color: C.textDD, fontWeight: 700, letterSpacing: 1.2, marginTop: 5, textTransform: "uppercase" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DAILY SHLOKA */}
      <Reveal delay={0.05}><ShlokaWidget /></Reveal>

      {/* DEITIES */}
      <div style={{ marginTop: 38 }}>
        <SH title="Sacred Deities" sub="Explore by divine presence" d={.1} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 16, padding: "0 24px 8px" }}>
          {DEITIES.map((d, i) => (
            <div key={d.name} className="t rv" onClick={() => nav("explore")} style={{ textAlign: "center", cursor: "pointer", animationDelay: `${.15 + i * .08}s` }}>
              <div style={{ width: 88, height: 88, borderRadius: 26, margin: "0 auto 12px", position: "relative", overflow: "hidden", boxShadow: `0 8px 28px ${hsl(d.h, 30, 8, 0.6)}, 0 0 0 1px ${hsl(d.h, 30, 20, 0.18)}` }}>
                {!d.noPic && <TempleImage src={`https://source.unsplash.com/160x160/?${deityQuery(d.name)}&sig=${d.name}`} hue={d.h} style={{ width: 88, height: 88 }} omSize={22} />}
                {d.noPic && <div style={{ position: "absolute", inset: 0, background: `linear-gradient(165deg,${hsl(d.h, 40, 16)},${hsl(d.h, 50, 4)})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, opacity: 0.4 }}>{d.icon}</div>}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 35%,rgba(0,0,0,0.72))" }} />
                <div style={{ position: "absolute", bottom: 5, left: 0, right: 0, textAlign: "center", fontFamily: FD, fontSize: 13, color: "rgba(255,255,255,0.92)", lineHeight: 1, letterSpacing: .3 }}>{d.sk}</div>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.creamM, letterSpacing: .2 }}>{d.name}</div>
              <div style={{ fontSize: 10, color: C.textD, marginTop: 3 }}>{d.n.toLocaleString()} temples</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURED */}
      <div style={{ marginTop: 40 }}>
        <SH title="Featured Temples" sub="Handpicked sacred destinations" act="See all" onAct={() => nav("explore")} d={.25} />
        {loading
          ? <div style={{ display: "flex", gap: 18, overflowX: "auto", padding: "0 24px 14px" }}>{[0, 1, 2].map(i => <SkeletonCard key={i} />)}</div>
          : <CardCarousel items={temples.slice(0, 6)} renderCard={(t, i) => <FCard t={t} onClick={oT} onFav={oF} d={.3 + i * .08} />} />}
      </div>

      {/* SACRED CIRCUITS */}
      <SacredCircuits nav={nav} isDark={isDark} />

      {/* DISCOVER MODE */}
      <div className="rv t" onClick={() => nav("discover")} style={{ margin: "32px 24px 0", borderRadius: 26, overflow: "hidden", position: "relative", height: 158, cursor: "pointer", animationDelay: ".35s", boxShadow: "0 12px 48px rgba(0,0,0,0.18)" }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg,${hsl(28, 55, 14)},${hsl(350, 45, 10)})` }} />
        <div style={{ position: "absolute", top: "-15%", right: "-8%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(212,133,60,0.08),transparent 60%)", filter: "blur(40px)", animation: "breathe 9s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-58%)", display: "flex", alignItems: "center", gap: 14 }}>
          {[{ deg: -14, opacity: .3 }, { deg: -6, opacity: .55 }, { deg: 0, opacity: 1 }].map((c, i) => (
            <div key={i} style={{ position: "absolute", left: "50%", width: 44, height: 60, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", transform: `translateX(-50%) rotate(${c.deg}deg)`, opacity: c.opacity, animation: i === 2 ? "drift 4s ease-in-out infinite" : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "rgba(212,133,60,0.4)" }}>ॐ</div>
          ))}
        </div>
        <div style={{ position: "absolute", inset: 0, padding: "0 22px 22px", display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "linear-gradient(transparent 25%,rgba(0,0,0,0.6))" }}>
          <div style={{ fontSize: 9, color: "rgba(212,133,60,0.6)", fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", marginBottom: 7 }}>New Mode</div>
          <h3 style={{ fontFamily: FD, fontSize: 23, fontWeight: 500, color: "#fff", lineHeight: 1.1, marginBottom: 4 }}>Discover Temples</h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>Swipe through sacred temples — save what calls to you</p>
        </div>
        <div style={{ position: "absolute", top: 20, right: 20, width: 38, height: 38, borderRadius: 12, background: "rgba(212,133,60,0.12)", border: "1px solid rgba(212,133,60,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: C.saffron }}>→</div>
      </div>

      {/* EXPERIENCE CARDS */}
      <FeatureCard title="Sacred Walks" sub="Spatial Audio Pradakṣiṇa" icon="🎧" hue={30} onClick={() => nav("spatialAudio")} delay=".38s" />
      <FeatureCard title="Your Kāla Chakra" sub="Personal Panchangam & Muhurta" icon="⏰" hue={45} onClick={() => nav("kalaChakra")} delay=".4s" premium />
      <FeatureCard title="Sankalpa Engine" sub="Speak your intention · Receive Sanskrit" icon="🗣" hue={15} onClick={() => nav("sankalpa")} delay=".42s" />
      <FeatureCard title="Sarathi Vision" sub="Identify deity · Iconography AI" icon="📷" hue={200} onClick={() => nav("sarathiVision")} delay=".44s" />
      <FeatureCard title="Tīrtha Stamps" sub="Spiritual Passport · Pilgrimage circuits" icon="🪷" hue={280} onClick={() => nav("tirthaStamps")} delay=".46s" />

      {/* BY STATE */}
      <Reveal delay={0}>
        <div style={{ marginTop: 42 }}>
          <SH title="By State" sub="All 28 states · 8 UTs covered" act="All 36 →" onAct={() => nav("stateBrowse")} d={.4} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 24px" }}>
            {STATES.slice(0, 8).map((s, i) => (
              <div key={s.name} className="t rv" onClick={() => nav("stateBrowse")} style={{ padding: "18px 16px", borderRadius: 18, cursor: "pointer", background: `linear-gradient(135deg,${hsl(s.h, 35, isDark ? 13 : 90)},${C.card})`, border: `1px solid ${C.div}`, borderTop: `2.5px solid ${hsl(s.h, 40, isDark ? 35 : 60, 0.45)}`, position: "relative", overflow: "hidden", animationDelay: `${.45 + i * .05}s` }}>
                <div style={{ width: 9, height: 9, borderRadius: 4, background: `linear-gradient(135deg,${hsl(s.h, 60, 55)},${hsl(s.h, 50, 40)})`, marginBottom: 10 }} />
                <div style={{ fontFamily: FE, fontSize: 16, fontWeight: 500, color: C.creamM, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: C.textM, marginTop: 4 }}>{s.n.toLocaleString()} temples</div>
              </div>
            ))}
          </div>
          <button className="t" onClick={() => nav("stateBrowse")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "14px 24px 0", width: "calc(100% - 48px)", padding: "13px 20px", borderRadius: 14, background: C.saffronDim, border: "1px solid rgba(212,133,60,0.18)", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: C.saffron, letterSpacing: .4 }}>
            View all 36 States & Union Territories
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </Reveal>

      {/* LIVE PANCHĀṄGAM */}
      <Reveal delay={0}><LivePanchangam /></Reveal>

      {/* PILGRIMAGE CIRCUIT */}
      <Reveal delay={0.05}><PilgrimageCard onNav={nav} /></Reveal>

      {/* SACRED PREMIUM TEASER */}
      <Reveal delay={0.05} style={{ margin: "42px 24px 0" }}>
        <div style={{ borderRadius: 28, overflow: "hidden", position: "relative", background: `linear-gradient(140deg,${hsl(42, 55, 10)},${hsl(28, 65, 7)},${hsl(355, 40, 10)})` }}>
          <div style={{ position: "absolute", top: 0, left: "-110%", width: "50%", height: "100%", background: "linear-gradient(105deg,transparent,rgba(196,162,78,0.11),transparent)", animation: "premiumSheen 5s ease-in-out infinite", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "-20%", right: "-5%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(196,162,78,0.1),transparent 60%)", filter: "blur(40px)", animation: "breathe 7s ease-in-out infinite", pointerEvents: "none" }} />
          <div style={{ padding: "26px 22px 24px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 99, background: "rgba(196,162,78,0.14)", border: "1px solid rgba(196,162,78,0.28)", marginBottom: 12 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="rgba(196,162,78,0.9)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 1.8, color: "rgba(196,162,78,0.9)", textTransform: "uppercase" }}>Sacred Premium</span>
                </div>
                <h3 style={{ fontFamily: FD, fontSize: 22, color: "rgba(255,242,210,0.95)", fontWeight: 500, lineHeight: 1.2 }}>Unlock the Full<br />Sacred Journey</h3>
                <p style={{ fontSize: 12, color: "rgba(255,220,150,0.35)", marginTop: 8, lineHeight: 1.7 }}>Deeper access to India's living heritage</p>
              </div>
              <div style={{ width: 50, height: 50, borderRadius: 16, background: "rgba(196,162,78,0.09)", border: "1px solid rgba(196,162,78,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="22" height="22" fill="none" stroke="rgba(196,162,78,0.75)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 20 }}>
              {[
                { icon: <svg width="13" height="13" fill="none" stroke="rgba(196,162,78,0.65)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>, l: "Audio Guides", s: "Expert narrations" },
                { icon: <svg width="13" height="13" fill="none" stroke="rgba(196,162,78,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>, l: "Pilgrimage Planner", s: "Char Dham & circuits" },
                { icon: <svg width="13" height="13" fill="none" stroke="rgba(196,162,78,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>, l: "Offline Maps", s: "Navigate anywhere" },
                { icon: <svg width="13" height="13" fill="none" stroke="rgba(196,162,78,0.65)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>, l: "Festival Alerts", s: "Never miss darshan" },
              ].map(f => (
                <div key={f.l} style={{ padding: "13px 13px", borderRadius: 15, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(196,162,78,0.1)" }}>
                  <div style={{ marginBottom: 7 }}>{f.icon}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,240,180,0.78)", marginBottom: 3, lineHeight: 1.2 }}>{f.l}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,220,140,0.3)", lineHeight: 1.4 }}>{f.s}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 18, background: "rgba(196,162,78,0.09)", border: "1px solid rgba(196,162,78,0.22)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,242,200,0.88)" }}>Coming Soon</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,215,140,0.38)", marginTop: 3 }}>Be first when it launches</div>
              </div>
              <div onClick={notified ? undefined : onNotify} style={{ padding: "9px 18px", borderRadius: 13, background: notified ? "rgba(60,180,60,0.12)" : "rgba(196,162,78,0.16)", border: `1px solid ${notified ? "rgba(60,200,60,0.3)" : "rgba(196,162,78,0.32)"}`, fontSize: 11, fontWeight: 700, color: notified ? "rgba(100,220,100,0.9)" : "rgba(196,162,78,0.88)", letterSpacing: .5, cursor: notified ? "default" : "pointer", whiteSpace: "nowrap", transition: "all .3s" }}>{notified ? "✓ Noted!" : "Notify Me →"}</div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* RECENTLY VIEWED */}
      {recentIds.length > 0 && (() => {
        const recent = recentIds.map(id => temples.find(t => t.id === id)).filter(Boolean);
        return recent.length > 0 ? (
          <div style={{ marginTop: 40 }}>
            <SH title="Continue Exploring" sub="Recently visited temples" d={.52} />
            <CardCarousel items={recent} renderCard={(t, i) => <FCard t={t} onClick={oT} onFav={oF} d={.54 + i * .08} />} />
          </div>
        ) : null;
      })()}

      {/* NEARBY */}
      <div style={{ marginTop: 42 }}>
        <SH title="Near You" act="Map" onAct={() => nav("nearby")} d={.55} />
        {loading ? (
          [0, 1].map(i => <SkeletonListCard key={i} />)
        ) : geo.effectiveLocation ? (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <SacredRadar
                location={geo.effectiveLocation}
                heading={geo.heading}
                temples={nearYou.inRange.length ? nearYou.inRange : nearYou.all.slice(0, 12)}
                size={160}
                maxDistKm={nearYou.inRange.length ? Math.max(1, (nearYou.inRange[nearYou.inRange.length - 1]?._dist ?? 1) * 1.5) : Math.max(1, (nearYou.all[0]?._dist ?? 50) * 3)}
              />
            </div>
            {nearYou.inRange.slice(0, 3).map((t, i) => (
              <NearbyCard key={t.id} t={{ ...t, bearing: t._bearing ?? 0 }} distanceKm={t._dist} onClick={() => oT(t)} delay={0.6 + i * 0.08} gyroHeading={geo.heading} />
            ))}
            {nearYou.inRange.length === 0 && nearYou.all.length > 0 && (
              <>
                <div style={{ margin: "0 24px 10px", padding: "10px 14px", borderRadius: 12, background: "rgba(212,133,60,0.08)", border: "1px solid rgba(212,133,60,0.2)" }}>
                  <div style={{ fontSize: 11, color: C.textD }}>No temples very close by. Nearest: <span style={{ color: C.saffron, fontWeight: 600 }}>{nearYou.all[0].templeName}</span> · {nearYou.all[0]._dist < 1 ? `${(nearYou.all[0]._dist * 1000).toFixed(0)} m` : `${nearYou.all[0]._dist.toFixed(1)} km`}</div>
                </div>
                {nearYou.all.slice(0, 3).map((t, i) => (
                  <NearbyCard key={t.id} t={{ ...t, bearing: t._bearing ?? 0 }} distanceKm={t._dist} onClick={() => oT(t)} delay={0.7 + i * 0.08} gyroHeading={geo.heading} />
                ))}
              </>
            )}
            {nearYou.inRange.length === 0 && nearYou.all.length === 0 && (
              <div style={{ margin: "0 24px", padding: "14px 16px", borderRadius: 14, background: C.card, border: `1px solid ${C.div}` }}>
                <div style={{ fontSize: 12, color: C.textD }}>No temples with coordinates found in database. Open the full map to search a wider area.</div>
              </div>
            )}
          </>
        ) : (
          <div style={{ margin: "0 24px", padding: "18px 20px", borderRadius: 18, background: C.card, border: `1px solid ${C.div}`, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: C.textD, lineHeight: 1.7, marginBottom: 10 }}>
              Enable location for real-time discovery of sacred temples around you.
            </div>
            {geo.error && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 10, lineHeight: 1.6 }}>{geo.error}</div>}
            <button className="t" onClick={() => geo.requestAndWatch()} style={{ padding: "9px 18px", borderRadius: 12, background: C.saffronDim, border: "1px solid rgba(212,133,60,0.2)", color: C.saffron, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {geo.error ? "Try Again" : "Enable Location"}
            </button>
          </div>
        )}
      </div>

      {/* SAVED */}
      {temples.filter(x => x.isFavorite).length > 0 && (
        <div style={{ marginTop: 32, marginBottom: 16 }}>
          <SH title="Saved" act="All" onAct={() => nav("saved")} d={.7} />
          <CardCarousel items={temples.filter(x => x.isFavorite)} renderCard={(t, i) => <FCard t={t} onClick={oT} onFav={oF} d={.75 + i * .08} />} />
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "56px 40px 24px", textAlign: "center", position: "relative" }}>
        <div style={{ width: 48, height: 1, background: "linear-gradient(90deg,transparent,rgba(196,162,78,0.3),transparent)", margin: "0 auto 24px" }} />
        <div style={{ fontFamily: FD, fontSize: 16, color: C.textD, fontStyle: "italic", lineHeight: 1.85, letterSpacing: .2, textShadow: playing ? "0 0 20px rgba(196,162,78,0.12)" : "none", transition: "text-shadow 1.5s ease" }}>
          "Where the temple bell resonates,<br />the divine presence abides."
        </div>
        <div style={{ marginTop: 20, fontSize: 9, color: C.textDD, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>Sacred Temples of Bhārata</div>
        <button className="t" onClick={() => nav("about")} style={{ marginTop: 16, padding: "8px 22px", borderRadius: 99, background: C.saffronDim, border: "1px solid rgba(212,133,60,0.18)", cursor: "pointer", fontSize: 11, fontWeight: 700, color: C.saffron, letterSpacing: .8, textTransform: "uppercase", fontFamily: FB }}>About this App</button>
        <div style={{ width: 48, height: 1, background: "linear-gradient(90deg,transparent,rgba(196,162,78,0.3),transparent)", margin: "20px auto 0" }} />
      </div>
    </div>
  );
};

export default Home;
