import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { supabase } from "./supabase.js";
import { computePanchangam, DEFAULT_LOC } from "./LivePanchangam.jsx";
import { PanchangLangProvider } from "./PanchangLangContext.jsx";
import { useSacredSoundscape } from "./SacredSoundscape.js";

// Shared modules
import { C, applyTheme, getCss, FD, FB } from "./theme.js";
import { haptic, IDB, useRecentlyViewed } from "./utils.js";
import { initParallax } from "./hooks.js";
import { ErrorBoundary, PageLoader, OmSvg, OmSymbol, Toast, BNav, DailyIntention } from "./components.jsx";

// Pages
import Home from "./pages/HomePage.jsx";
import Discover from "./pages/DiscoverPage.jsx";
import Explore from "./pages/ExplorePage.jsx";
import Detail from "./pages/DetailPage.jsx";
import Search from "./pages/SearchPage.jsx";
import { StateBrowse, DistrictBrowse } from "./pages/BrowsePages.jsx";
import { CircuitsPage, CircuitDetail } from "./pages/CircuitsPages.jsx";
import Nearby from "./pages/NearbyPage.jsx";
import Saved from "./pages/SavedPage.jsx";
import Profile from "./pages/ProfilePage.jsx";
import About from "./pages/AboutPage.jsx";
import AudioGuide from "./pages/AudioGuidePage.jsx";

// Lazy-loaded heavy features
const MandalaAR = lazy(() => import('./MandalaAR.jsx'));
const SpatialAudio = lazy(() => import('./SpatialAudio.jsx'));
const KalaChakra = lazy(() => import('./KalaChakra.jsx'));
const SankalpaEngine = lazy(() => import('./SankalpaEngine.jsx'));
const SarathiVision = lazy(() => import('./SarathiVision.jsx'));
const TirthaStamps = lazy(() => import('./TirthaStamps.jsx'));
const SarathiChat = lazy(() => import('./SarathiChat.jsx'));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  App orchestrator — routing, state, nav
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function App() {
  const [scr, setScr] = useState("home");
  const [tmp, setTmp] = useState(null);
  const [cir, setCir] = useState(null);
  const [stk, setStk] = useState(["home"]);
  const [temples, setTemples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');
  const [sunrising, setSunrising] = useState(false);
  const [showIntention, setShowIntention] = useState(() => {
    const today = new Date().toDateString();
    return localStorage.getItem('intentionDate') !== today;
  });
  const [navDir, setNavDir] = useState('none');
  const [pageKey, setPageKey] = useState(0);
  const [toast, setToast] = useState({ msg: '', icon: '✓', visible: false });
  const toastTimer = useRef(null);
  const { getIds: getRecentIds, addId: addRecentId } = useRecentlyViewed();
  const [recentIds, setRecentIds] = useState(() => getRecentIds());
  const [ambienceOn, setAmbienceOn] = useState(() => localStorage.getItem("sti_ambience") === "1");
  const ref = useRef(null);

  const showToast = useCallback((msg, icon = '✓') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, icon, visible: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2400);
  }, []);

  // Sacred soundscape
  const panchangForSound = useMemo(() => computePanchangam(new Date(), DEFAULT_LOC), []);
  useSacredSoundscape({ enabled: ambienceOn, panchangam: panchangForSound, volume: 0.2 });
  useEffect(() => { localStorage.setItem("sti_ambience", ambienceOn ? "1" : "0"); }, [ambienceOn]);

  // Theme sync
  applyTheme(isDark);

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#1A1109' : '#FAFAF8');
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark(v => {
      const next = !v;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      if (!next) { setSunrising(true); setTimeout(() => setSunrising(false), 2200); }
      return next;
    });
  }, []);

  // Data fetching with IndexedDB fallback
  const fetchTemples = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase.from("temples").select("*");
    if (error) {
      const cached = await IDB.load();
      if (cached.length > 0) {
        setTemples(cached);
        setFetchError(null);
      } else {
        setFetchError(error.message || "Could not load temples. Please check your connection.");
      }
    } else if (data) {
      setTemples(data);
      IDB.save(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemples();
    initParallax();
  }, [fetchTemples]);

  // Navigation
  const navGuardRef = useRef(false);
  const nav = useCallback(t => {
    if (navGuardRef.current) return;
    navGuardRef.current = true;
    setNavDir('forward');
    setPageKey(k => k + 1);
    setStk(p => [...p, t]);
    setScr(t);
    ref.current?.scrollTo({ top: 0, behavior: "instant" });
    setTimeout(() => { navGuardRef.current = false; }, 300);
  }, []);

  const back = useCallback(() => {
    setNavDir('back');
    setPageKey(k => k + 1);
    setStk(p => {
      const n = p.slice(0, -1);
      setScr(n[n.length - 1] || "home");
      return n.length ? n : ["home"];
    });
    setTmp(null);
    ref.current?.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const backNoTmpReset = useCallback(() => {
    setNavDir('back');
    setPageKey(k => k + 1);
    setStk(p => {
      const n = p.slice(0, -1);
      setScr(n[n.length - 1] || "home");
      return n.length ? n : ["home"];
    });
    ref.current?.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const oT = useCallback(t => {
    addRecentId(t.id);
    setRecentIds(getRecentIds());
    setTmp(t);
    nav("detail");
  }, [nav, addRecentId, getRecentIds]);

  const oC = useCallback(c => { setCir(c); nav("circuitDetail"); }, [nav]);

  const onTab = useCallback(t => {
    setNavDir('none');
    setPageKey(k => k + 1);
    setStk([t]);
    setScr(t);
    setTmp(null);
    ref.current?.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Favorites: optimistic update → Supabase persist → rollback on error
  const oF = useCallback(async (id, current) => {
    const next = !current;
    haptic(next ? 30 : 15);
    setTemples(prev => prev.map(t => t.id === id ? { ...t, isFavorite: next } : t));
    showToast(next ? 'Saved to favourites' : 'Removed from saved', next ? '♥' : '♡');
    const { error } = await supabase.from("temples").update({ isFavorite: next }).eq("id", id);
    if (error) {
      console.error("Favorite update failed:", error.message);
      setTemples(prev => prev.map(t => t.id === id ? { ...t, isFavorite: current } : t));
      showToast('Could not save. Try again.', '✕');
    }
  }, [showToast]);

  // Tab/nav state
  const tabs = ["home", "explore", "circuits", "saved", "profile"];
  const aTab = tabs.includes(scr) ? scr : [...stk].reverse().find(s => tabs.includes(s)) || "home";
  const showNav = !["detail", "search", "stateBrowse", "districtBrowse", "discover", "about", "chat", "audio", "circuitDetail", "mandalaAR", "spatialAudio", "sarathiVision", "kalaChakra", "sankalpa", "tirthaStamps"].includes(scr);

  // Error state
  if (fetchError) return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <style>{getCss(C)}</style>
      <div style={{ position: "absolute", top: "50%", left: "50%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,rgba(212,133,60,0.05),transparent 60%)", transform: "translate(-50%,-50%)", filter: "blur(55px)", pointerEvents: "none" }} />
      <OmSymbol size={100} />
      <h2 style={{ fontFamily: FD, fontSize: 26, color: C.cream, marginTop: 32, marginBottom: 12, fontWeight: 500 }}>Connection Lost</h2>
      <p style={{ fontSize: 13, color: C.textD, lineHeight: 1.75, maxWidth: 260, marginBottom: 32 }}>{fetchError}</p>
      <button className="t" onClick={fetchTemples} style={{ padding: "13px 40px", borderRadius: 16, background: `linear-gradient(135deg,${C.saffron},${C.saffronH})`, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FB, boxShadow: "0 6px 28px rgba(212,133,60,0.35)" }}>Retry</button>
    </div>
  );

  // Page routing
  const th = { isDark, onToggleTheme: toggleTheme };
  let page = null;

  if (scr === "home") page = <Home nav={nav} oT={oT} oF={oF} temples={temples} loading={loading} recentIds={recentIds} {...th} />;
  else if (scr === "discover") page = <Discover temples={temples} oT={oT} onBack={back} />;
  else if (scr === "explore") page = <Explore nav={nav} oT={oT} oF={oF} temples={temples} loading={loading} {...th} />;
  else if (scr === "detail" && tmp) page = <Detail temple={tmp} onBack={back} oF={oF} nav={nav} {...th} />;
  else if (scr === "chat") page = <SarathiChat onBack={backNoTmpReset} temple={tmp} temples={temples} oT={oT} {...th} />;
  else if (scr === "search") page = <Search oT={oT} oF={oF} onBack={back} temples={temples} />;
  else if (scr === "stateBrowse") page = <StateBrowse nav={nav} onBack={back} onSelect={t => setTmp(t)} {...th} />;
  else if (scr === "districtBrowse") page = <DistrictBrowse onBack={back} oT={oT} oF={oF} temples={temples} state={tmp} {...th} />;
  else if (scr === "circuits") page = <CircuitsPage onCircuit={oC} isDark={isDark} />;
  else if (scr === "circuitDetail" && cir) page = <CircuitDetail circuit={cir} onBack={back} isDark={isDark} />;
  else if (scr === "nearby") page = <Nearby oT={oT} oF={oF} temples={temples} loading={loading} {...th} />;
  else if (scr === "saved") page = <Saved oT={oT} oF={oF} temples={temples} onBrowse={() => nav("explore")} {...th} />;
  else if (scr === "profile") page = <Profile nav={nav} temples={temples} ambienceOn={ambienceOn} setAmbienceOn={setAmbienceOn} {...th} />;
  else if (scr === "about") page = <About onBack={back} temples={temples} {...th} />;
  else if (scr === "audio") page = <AudioGuide onBack={back} {...th} />;
  else if (scr === "mandalaAR") page = <MandalaAR onBack={back} isDark={isDark} onToggleTheme={toggleTheme} />;
  else if (scr === "spatialAudio") page = <SpatialAudio onBack={back} />;
  else if (scr === "kalaChakra") page = <KalaChakra onBack={back} isDark={isDark} onToggleTheme={toggleTheme} />;
  else if (scr === "sankalpa") page = <SankalpaEngine onBack={back} isDark={isDark} onToggleTheme={toggleTheme} temples={temples} />;
  else if (scr === "sarathiVision") page = <SarathiVision onBack={back} isDark={isDark} onToggleTheme={toggleTheme} temples={temples} onFindTemples={() => { nav("explore"); }} />;
  else if (scr === "tirthaStamps") page = <TirthaStamps onBack={back} isDark={isDark} onToggleTheme={toggleTheme} />;
  else page = <Home nav={nav} oT={oT} oF={oF} temples={temples} loading={loading} {...th} />;

  const transitionClass = navDir === 'forward' ? 'scrFwd' : navDir === 'back' ? 'scrBack' : '';

  return (
    <PanchangLangProvider>
      <div>
        <style>{getCss(C)}</style>
        <a href="#main-content" className="skipLink">Skip to main content</a>
        <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: C.bg, position: "relative", boxShadow: "0 0 120px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>
          <main id="main-content" ref={ref} role="main" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: showNav ? 'calc(78px + env(safe-area-inset-bottom))' : 'env(safe-area-inset-bottom)' }}>
            <ErrorBoundary key={scr}>
              <Suspense fallback={<PageLoader />}>
                <div key={pageKey} className={transitionClass}>{page}</div>
              </Suspense>
            </ErrorBoundary>
          </main>
          {sunrising && (
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 200, pointerEvents: "none", background: "linear-gradient(135deg,rgba(255,200,80,0.72) 0%,rgba(255,160,40,0.55) 40%,rgba(255,220,120,0.38) 100%)", animation: "sunriseSweep 2.1s cubic-bezier(.22,1,.36,1) both" }} />
          )}
          {showIntention && (
            <DailyIntention onClose={() => { const today = new Date().toDateString(); localStorage.setItem('intentionDate', today); setShowIntention(false); }} />
          )}
          <Toast msg={toast.msg} icon={toast.icon} visible={toast.visible} />
          {showNav && (
            <button className="t" onClick={() => { haptic(20); nav("chat"); }} title="Ask Sarathi" aria-label="Ask Sarathi" style={{ position: "absolute", bottom: 88, right: 18, width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg,${C.saffron},${C.saffronH})`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, animation: 'fabIn 0.45s cubic-bezier(.22,1,.36,1) both, fabPulse 3s ease-in-out 0.45s infinite' }}>
              <OmSvg size={28} color="#fff" />
            </button>
          )}
          {showNav && <BNav a={aTab} on={onTab} savedCount={temples.filter(t => t.isFavorite).length} />}
        </div>
      </div>
    </PanchangLangProvider>
  );
}
