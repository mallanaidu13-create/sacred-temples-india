import { useState, useEffect, useRef, useCallback, memo } from "react";
import { supabase } from "./supabase.js";
import LivePanchangam from "./LivePanchangam.jsx";
import CinematicOverlay, { cinematicKeyframes } from "./CinematicOverlay.jsx";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ── Haptic feedback ──
const haptic = (ms = 20) => { try { navigator.vibrate?.(ms); } catch(e) {} };

// ── Dynamic Hindu Panchang ──
const getHinduPanchang = (date = new Date()) => {
  const synodicMonth = 29.53058867;
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const daysSince = (date - knownNewMoon) / 86400000;
  const phase = ((daysSince % synodicMonth) + synodicMonth) % synodicMonth;
  const tithiIdx = Math.floor(phase / synodicMonth * 30) % 15;
  const tithis = ['Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami','Shashti','Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima'];
  const siderealMonth = 27.32166;
  const nakPh = ((daysSince % siderealMonth) + siderealMonth) % siderealMonth;
  const nakIdx = Math.floor(nakPh / siderealMonth * 27);
  const nakshatras = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
  const yogas = ['Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarma','Dhriti','Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata','Variyana','Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti'];
  const doy = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const varas = ['Ravivara','Somavara','Mangalavara','Budhavara','Guruvara','Shukravara','Shanivara'];
  return {
    tithi: tithis[tithiIdx] || 'Pratipada',
    nakshatra: nakshatras[nakIdx] || 'Ashwini',
    yoga: yogas[Math.floor((doy * 27) / 365) % 27] || 'Siddha',
    muhurta: 'Abhijit (11:52 – 12:44)',
    vara: varas[date.getDay()],
  };
};

// ── IndexedDB offline cache ──
const IDB = (() => {
  const NAME = 'sacredTemples', VER = 1, STORE = 'temples';
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open(NAME, VER);
    r.onupgradeneeded = e => e.target.result.createObjectStore(STORE, {keyPath:'id'});
    r.onsuccess = e => res(e.target.result);
    r.onerror = () => rej(r.error);
  });
  return {
    save: async (temples) => { try { const db = await open(); const tx = db.transaction(STORE,'readwrite'); const st = tx.objectStore(STORE); st.clear(); temples.forEach(t => st.put(t)); await new Promise((r,j) => { tx.oncomplete=r; tx.onerror=()=>j(tx.error); }); db.close(); } catch(e) {} },
    load: async () => { try { const db = await open(); const tx = db.transaction(STORE,'readonly'); const st = tx.objectStore(STORE); const r = st.getAll(); const data = await new Promise((res,rej) => { r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); db.close(); return data||[]; } catch(e) { return []; } },
  };
})();

// ── Recently viewed hook ──
const useRecentlyViewed = () => {
  const key = 'recentlyViewed';
  const get = () => { try { return JSON.parse(localStorage.getItem(key)||'[]'); } catch { return []; } };
  const add = useCallback((id) => {
    const ids = get().filter(x => x !== id).slice(0, 7);
    localStorage.setItem(key, JSON.stringify([id, ...ids]));
  }, []);
  return { getIds: get, addId: add };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SACRED TEMPLES OF BHĀRATA
//  Aesthetic: Dark Sanctum — gold on obsidian
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CDark = {
  bg: "#1A1109", bg2: "#201610", bg3: "#2A1E14",
  card: "#241A10", cardH: "#2E2218", cardB: "rgba(255,255,255,0.055)",
  saffron: "#D4853C", saffronH: "#E69A52", saffronDim: "rgba(212,133,60,0.12)",
  saffronPale: "rgba(212,133,60,0.08)",
  gold: "#C4A24E", goldDim: "rgba(196,162,78,0.1)",
  cream: "#F2E8D4", creamM: "#D4C4A8", creamD: "#A89878",
  text: "#EDE4D4", textM: "#A89878", textD: "#6E5E48", textDD: "#5C4E3A",
  red: "#C44040", div: "rgba(255,255,255,0.07)", divL: "rgba(255,255,255,0.035)",
  glass: "rgba(26,17,9,0.78)", glassL: "rgba(26,17,9,0.62)",
};
const CLight = {
  bg: "#FAFAF8", bg2: "#F4F0EA", bg3: "#EDE8DF",
  card: "#FFFFFF", cardH: "#FBF8F3", cardB: "rgba(0,0,0,0.03)",
  saffron: "#C4721A", saffronH: "#D4853C", saffronDim: "rgba(196,114,26,0.12)",
  saffronPale: "rgba(196,114,26,0.07)",
  gold: "#9E7A28", goldDim: "rgba(158,122,40,0.08)",
  cream: "#1A1208", creamM: "#4A3010", creamD: "#7A5820",
  text: "#1A1208", textM: "#5A3A10", textD: "#8A6030", textDD: "#B89060",
  red: "#C44040", div: "rgba(0,0,0,0.08)", divL: "rgba(0,0,0,0.04)",
  glass: "rgba(250,250,248,0.88)", glassL: "rgba(250,250,248,0.72)",
};
let C = CDark;

const hsl = (h, s, l, a) => a != null ? `hsla(${h},${s}%,${l}%,${a})` : `hsl(${h},${s}%,${l}%)`;

const STATES = [
  // ── 28 States (sorted by temple count) ────────────────────────────────────
  {name:"Tamil Nadu",         n:38615, h:15,  type:"state"},
  {name:"Andhra Pradesh",     n:21503, h:345, type:"state"},
  {name:"Maharashtra",        n:16800, h:25,  type:"state"},
  {name:"Uttar Pradesh",      n:15200, h:30,  type:"state"},
  {name:"Karnataka",          n:12850, h:42,  type:"state"},
  {name:"Madhya Pradesh",     n:11400, h:28,  type:"state"},
  {name:"Rajasthan",          n:9800,  h:20,  type:"state"},
  {name:"Gujarat",            n:8950,  h:35,  type:"state"},
  {name:"Odisha",             n:7200,  h:150, type:"state"},
  {name:"West Bengal",        n:6400,  h:330, type:"state"},
  {name:"Telangana",          n:6100,  h:10,  type:"state"},
  {name:"Kerala",             n:5800,  h:140, type:"state"},
  {name:"Bihar",              n:5200,  h:45,  type:"state"},
  {name:"Uttarakhand",        n:4800,  h:200, type:"state"},
  {name:"Himachal Pradesh",   n:3200,  h:215, type:"state"},
  {name:"Jharkhand",          n:2900,  h:160, type:"state"},
  {name:"Chhattisgarh",       n:2600,  h:135, type:"state"},
  {name:"Assam",              n:2400,  h:165, type:"state"},
  {name:"Punjab",             n:1900,  h:280, type:"state"},
  {name:"Haryana",            n:1800,  h:50,  type:"state"},
  {name:"Goa",                n:980,   h:180, type:"state"},
  {name:"Tripura",            n:640,   h:320, type:"state"},
  {name:"Manipur",            n:420,   h:175, type:"state"},
  {name:"Meghalaya",          n:310,   h:170, type:"state"},
  {name:"Arunachal Pradesh",  n:280,   h:195, type:"state"},
  {name:"Nagaland",           n:180,   h:155, type:"state"},
  {name:"Sikkim",             n:160,   h:210, type:"state"},
  {name:"Mizoram",            n:120,   h:185, type:"state"},
  // ── 8 Union Territories ─────────────────────────────────────────────────
  // (J&K became UT on 31 Oct 2019; Ladakh carved out separately)
  {name:"Delhi",              n:1200,  h:260, type:"ut"},
  {name:"Jammu & Kashmir",    n:1700,  h:220, type:"ut"},
  {name:"Puducherry",         n:520,   h:340, type:"ut"},
  {name:"Ladakh",             n:44,    h:225, type:"ut"},
  {name:"Chandigarh",         n:140,   h:270, type:"ut"},
  {name:"Andaman & Nicobar",  n:110,   h:190, type:"ut"},
  {name:"Dadra, NH & DD",     n:90,    h:130, type:"ut"},
  {name:"Lakshadweep",        n:48,    h:195, type:"ut"},
];

const DEITIES = [
  {name:"Shiva",sk:"शिव",n:1847,h:350,icon:"☽",noPic:true},
  {name:"Vishnu",sk:"विष्णु",n:1523,h:215,icon:"☸"},
  {name:"Devi",sk:"देवी",n:1206,h:280,icon:"✦"},
  {name:"Ganesha",sk:"गणेश",n:1045,h:28,icon:"◈"},
  {name:"Hanuman",sk:"हनुमान",n:892,h:15,icon:"◉"},
  {name:"Murugan",sk:"முருகன்",n:634,h:155,icon:"⊹"},
];

const SHLOKAS = [
  {sk:"ॐ नमः शिवाय", tr:"Om Namah Shivaya", src:"Shiva Panchakshara"},
  {sk:"ॐ नमो नारायणाय", tr:"Om Namo Narayanaya", src:"Vishnu Ashtakshara"},
  {sk:"ॐ गं गणपतये नमः", tr:"Om Gam Ganapataye Namah", src:"Ganesha Mantra"},
  {sk:"ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे", tr:"Invocation of Chamunda Devi", src:"Devi Mantra"},
  {sk:"ॐ हनुमते नमः", tr:"Om Hanumate Namah", src:"Hanuman Mantra"},
];

const PANCHANG = {
  tithi: "Tritiya",
  nakshatra: "Rohini",
  yoga: "Siddha",
  muhurta: "Abhijit (11:52 – 12:44)",
  vara: "Ravivara (Sunday)",
};

const FD = "'EB Garamond',Georgia,serif";
const FB = "'DM Sans',system-ui,sans-serif";
const FE = FD; // alias — serif display font

/* Small Om icon SVG — used in FAB button and chat header */
const OmSvg = ({ size = 28, color }) => {
  const c = color || C.saffron;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
        fontFamily="'Noto Serif Devanagari', serif" fontSize="72" fill={c}>ॐ</text>
    </svg>
  );
};

/* Large Om symbol — uses actual ॐ Unicode glyph with Noto Serif Devanagari */
const OmSymbol = ({ size = 160, style = {} }) => (
  <span style={{
    display: "inline-block",
    position: "relative",
    zIndex: 2,
    fontFamily: "'Noto Serif Devanagari', serif",
    fontSize: size,
    lineHeight: 1,
    color: C.saffron,
    animation: "omLive 5s ease-in-out infinite, omGlow 5s ease-in-out infinite",
    userSelect: "none",
    ...style,
  }}>
    ॐ
  </span>
);

const getCss = (theme) => `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Noto+Serif+Devanagari:wght@400;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{background:${theme.bg};transition:background-color 0.35s ease}
body{font-family:${FB};background:${theme.bg};color:${theme.text};-webkit-font-smoothing:antialiased;transition:background-color 0.35s ease,color 0.25s ease}
@keyframes rv{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fi{from{opacity:0}to{opacity:1}}
@keyframes breathe{0%,100%{opacity:.2;transform:scale(1)}50%{opacity:.5;transform:scale(1.04)}}
@keyframes drift{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(-8px)}}
@keyframes shimmer{0%{left:-120%}60%{left:120%}100%{left:120%}}
@keyframes glow{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes omLive{0%{transform:translateY(0) scale(1) rotate(-1.2deg);opacity:.88}25%{transform:translateY(-4px) scale(1.05) rotate(0deg);opacity:1}50%{transform:translateY(-7px) scale(1.07) rotate(1deg);opacity:.97}75%{transform:translateY(-4px) scale(1.04) rotate(0.4deg);opacity:.96}100%{transform:translateY(0) scale(1) rotate(-1.2deg);opacity:.88}}
@keyframes omGlow{0%,100%{filter:drop-shadow(0 0 10px rgba(240,192,96,.7)) drop-shadow(0 0 28px rgba(212,133,60,.5)) drop-shadow(0 0 60px rgba(212,133,60,.22)) drop-shadow(0 0 120px rgba(212,133,60,.08))}50%{filter:drop-shadow(0 0 22px rgba(255,220,100,1)) drop-shadow(0 0 55px rgba(230,154,82,.85)) drop-shadow(0 0 110px rgba(212,133,60,.45)) drop-shadow(0 0 200px rgba(212,133,60,.18))}}
@keyframes omHaloSpin{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes ringExpand{0%{transform:translate(-50%,-50%) scale(.55);opacity:.7}100%{transform:translate(-50%,-50%) scale(1.6);opacity:0}}
@keyframes soundWave{0%,100%{transform:scaleY(.4);opacity:.4}50%{transform:scaleY(1);opacity:1}}
@keyframes slideIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
@keyframes panchangGlow{0%,100%{box-shadow:0 0 0 1px rgba(196,162,78,0.08)}50%{box-shadow:0 0 0 1px rgba(196,162,78,0.18),0 0 32px rgba(196,162,78,0.06)}}
@keyframes kenBurns{0%{transform:scale(1)}100%{transform:scale(1.08)}}
@keyframes premiumPulse{0%,100%{box-shadow:0 0 0 1px rgba(196,162,78,0.1)}50%{box-shadow:0 0 0 1px rgba(196,162,78,0.26),0 0 40px rgba(196,162,78,0.07)}}
@keyframes badgePop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.18)}100%{transform:scale(1);opacity:1}}
@keyframes skeletonShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes slideInRight{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
@keyframes slideInLeft{from{opacity:0;transform:translateX(-30%)}to{opacity:1;transform:translateX(0)}}
@keyframes fabPulse{0%,100%{box-shadow:0 4px 22px rgba(212,133,60,0.45),0 0 0 2px rgba(212,133,60,0.15)}50%{box-shadow:0 4px 36px rgba(212,133,60,0.72),0 0 0 7px rgba(212,133,60,0.10)}}
@keyframes fabIn{from{opacity:0;transform:translateY(18px) scale(0.82)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes heartBurst{0%{transform:translate(-50%,-50%) rotate(var(--hb-deg)) translateX(0) scale(1.2);opacity:1}100%{transform:translate(-50%,-50%) rotate(var(--hb-deg)) translateX(32px) scale(0);opacity:0}}
@keyframes premiumSheen{0%{left:-110%}40%{left:160%}100%{left:160%}}
@keyframes floatUp{0%{transform:translateY(0) translateX(0) scale(1);opacity:0}8%{opacity:.75}80%{opacity:.35}100%{transform:translateY(-210px) translateX(var(--fp-x,0px)) scale(0.35);opacity:0}}
@keyframes flipIn{0%{transform:perspective(500px) rotateX(-80deg);opacity:0}100%{transform:perspective(500px) rotateX(0deg);opacity:1}}
@keyframes typeIn{0%{opacity:0;transform:scale(0.7) translateY(4px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes countUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes circuitGlow{0%,100%{box-shadow:0 0 0 1px rgba(212,133,60,0.1),0 4px 20px rgba(0,0,0,0.12)}50%{box-shadow:0 0 0 1px rgba(212,133,60,0.22),0 4px 28px rgba(212,133,60,0.08)}}
@keyframes petalOrbit{0%{transform:translate(-50%,-50%) rotate(0deg) translateX(var(--po-r,96px)) rotate(0deg) scale(1);opacity:var(--po-op,0.7)}50%{opacity:calc(var(--po-op,0.7)*1.25);transform:translate(-50%,-50%) rotate(180deg) translateX(var(--po-r,96px)) rotate(-180deg) scale(1.1)}100%{transform:translate(-50%,-50%) rotate(360deg) translateX(var(--po-r,96px)) rotate(-360deg) scale(1);opacity:var(--po-op,0.7)}}
@keyframes petalFloat{0%{transform:translate(-50%,-50%) translateY(0) translateX(0) scale(1) rotate(0deg);opacity:0}10%{opacity:0.85}75%{opacity:0.45}100%{transform:translate(-50%,-50%) translateY(-180px) translateX(var(--pf-x,0px)) scale(0.3) rotate(var(--pf-r,120deg));opacity:0}}
@keyframes petalTwinkle{0%,100%{opacity:0.15;transform:translate(-50%,-50%) rotate(var(--pt-deg,0deg)) translateX(var(--pt-r,130px)) scale(0.6)}40%{opacity:0.9;transform:translate(-50%,-50%) rotate(var(--pt-deg,0deg)) translateX(var(--pt-r,130px)) scale(1.3)}70%{opacity:0.5;transform:translate(-50%,-50%) rotate(var(--pt-deg,0deg)) translateX(var(--pt-r,130px)) scale(0.85)}}
@keyframes petalSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes sarathiGlow{0%,100%{filter:drop-shadow(0 0 12px rgba(240,192,96,.6)) drop-shadow(0 0 32px rgba(212,133,60,.35)) drop-shadow(0 0 64px rgba(212,133,60,.15))}50%{filter:drop-shadow(0 0 24px rgba(255,220,100,.9)) drop-shadow(0 0 52px rgba(230,154,82,.6)) drop-shadow(0 0 96px rgba(212,133,60,.3))}}
@keyframes sarathiBreathe{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.06);opacity:1}}
@keyframes sarathiAura{0%{transform:translate(-50%,-50%) scale(.7);opacity:.5}50%{transform:translate(-50%,-50%) scale(1.15);opacity:.18}100%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}
@keyframes sarathiRingPulse{0%{transform:translate(-50%,-50%) scale(.6);opacity:.6;border-color:rgba(212,133,60,.4)}100%{transform:translate(-50%,-50%) scale(1.8);opacity:0;border-color:rgba(212,133,60,0)}}
@keyframes sarathiChipIn{from{opacity:0;transform:translateY(8px) scale(.92)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes sarathiThinking{0%{background-position:200% center}100%{background-position:-200% center}}
.scrFwd{animation:slideInRight .38s cubic-bezier(.22,1,.36,1) both;will-change:transform,opacity}
.scrBack{animation:slideInLeft .32s cubic-bezier(.22,1,.36,1) both;will-change:transform,opacity}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
.rv{animation:rv .55s cubic-bezier(.16,1,.3,1) both}
.fi{animation:fi .32s ease both}
.t{transition:transform .15s cubic-bezier(.16,1,.3,1),box-shadow .15s ease}.t:active{transform:scale(.955)}
.t:focus-visible{outline:2px solid ${theme.saffron};outline-offset:2px;border-radius:inherit}
button:focus-visible{outline:2px solid ${theme.saffron};outline-offset:2px}
input:focus-visible{outline:2px solid ${theme.saffron};outline-offset:0;border-radius:inherit}
@keyframes tabFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.tabContent{animation:tabFade .25s cubic-bezier(.16,1,.3,1) both}
.skipLink{position:absolute;left:-9999px;top:-9999px;z-index:9999;padding:12px 24px;background:${theme.saffron};color:#fff;font-weight:700;border-radius:0 0 12px 0;font-size:14px;text-decoration:none;font-family:${FB}}
.skipLink:focus{left:0;top:0}
::-webkit-scrollbar{width:0;height:0}
input{font-family:${FB}}
input::placeholder{color:${theme.textD}}
${cinematicKeyframes}
`;

// ── Temple Image Helpers ──
const deityQuery = (deity = '') => {
  const d = deity.toLowerCase();
  if (d.match(/shiv|mahadev|shankar|rudra/)) return 'shiva+temple+india';
  if (d.match(/vishnu|venkat|narayan|balaji|tirupati/)) return 'vishnu+temple+india';
  if (d.match(/rama|krishna|govinda/)) return 'krishna+temple+india';
  if (d.match(/ganesh|ganesha|vinayak|ganapati/)) return 'ganesha+temple+india';
  if (d.match(/devi|shakti|durga|kali|amman|amma|mata|parvati|lakshmi/)) return 'goddess+temple+india';
  if (d.match(/hanuman|bajrang|anjaneya|maruti/)) return 'hanuman+temple+india';
  if (d.match(/murugan|subramania|kartikeya|skanda/)) return 'murugan+temple+india';
  if (d.match(/brahma|saraswati/)) return 'brahma+temple+india';
  return 'ancient+hindu+temple+india';
};

// px/py are parallax offsets in range [-1, 1] — drives the image position within its oversized wrapper
const TempleImage = ({src, hue, style, omSize=48, px=0, py=0}) => {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);
  const PAD = 20; // extra px on each side for parallax room
  return (
    <div style={{position:'relative',overflow:'hidden',...style}}>
      <div style={{position:'absolute',inset:0,background:`linear-gradient(165deg,${hsl(hue,40,16)},${hsl(hue,50,4)})`}}/>
      {!loaded && !err && (
        <div style={{position:'absolute',inset:0,background:`linear-gradient(90deg,${hsl(30,25,14,1)} 25%,${hsl(30,30,18,1)} 50%,${hsl(30,25,14,1)} 75%)`,backgroundSize:'800px 100%',animation:'skeletonShimmer 1.6s ease-in-out infinite'}}/>
      )}
      {err && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FD,fontSize:omSize,color:'rgba(212,133,60,0.15)'}}>ॐ</div>
      )}
      {!err && (
        // Wrapper handles kenBurns zoom; img handles parallax translate — separate elements to avoid CSS animation/transform conflict
        <div style={{position:'absolute',inset:0,animation:loaded?'kenBurns 20s ease-in-out infinite alternate':'none'}}>
          <img
            src={src}
            onLoad={() => setLoaded(true)}
            onError={() => setErr(true)}
            style={{
              position:'absolute',
              left:`${-PAD + px*PAD}px`,
              top:`${-PAD*0.65 + py*PAD*0.65}px`,
              width:`calc(100% + ${PAD*2}px)`,
              height:`calc(100% + ${PAD*1.3}px)`,
              objectFit:'cover',
              opacity:loaded?1:0,
              filter:loaded?'blur(0px)':'blur(14px)',
              transform:loaded?'scale(1)':'scale(1.05)',
              transition:'opacity 0.5s ease, filter 0.55s ease, transform 0.55s ease, left 0.1s linear, top 0.1s linear',
            }}
          />
        </div>
      )}
    </div>
  );
};

// ── Gyroscope Parallax Singleton ──
// Single RAF loop + single event listener shared across all subscribers
const _parSubs = new Set();
const _par = {x:0, y:0, tx:0, ty:0};
let _parRaf = null;
const _lerpN = (a,b,t) => a+(b-a)*t;

function _tickPar() {
  _par.x = _lerpN(_par.x, _par.tx, 0.075);
  _par.y = _lerpN(_par.y, _par.ty, 0.075);
  _parSubs.forEach(fn => fn(_par.x, _par.y));
  _parRaf = requestAnimationFrame(_tickPar);
}

function initParallax() {
  if (_parRaf) return;
  _parRaf = requestAnimationFrame(_tickPar);
  // Desktop: mouse parallax
  window.addEventListener('mousemove', e => {
    _par.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    _par.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, {passive:true});
  // Mobile: gyroscope parallax
  const onOrientation = e => {
    _par.tx = Math.max(-1, Math.min(1, (e.gamma||0) / 22));
    _par.ty = Math.max(-1, Math.min(1, ((e.beta||0) - 45) / 22));
  };
  window.addEventListener('deviceorientation', onOrientation, {passive:true});
  // iOS 13+ requires permission via user gesture — hook onto first touch
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    document.addEventListener('touchstart', async () => {
      try { await DeviceOrientationEvent.requestPermission(); } catch(_) {}
    }, {once:true, passive:true});
  }
}

const useParallax = () => {
  const [xy, setXY] = useState([0,0]);
  useEffect(() => {
    const fn = (x, y) => setXY(prev => {
      if (Math.abs(prev[0]-x) < 0.008 && Math.abs(prev[1]-y) < 0.008) return prev;
      return [x, y];
    });
    _parSubs.add(fn);
    return () => _parSubs.delete(fn);
  }, []);
  return xy;
};

// ── 3D Tilt Hook — perspective tilt on touch/mouse hover ──
const useTilt = () => {
  const [tilt, setTilt] = useState({x:0,y:0});
  const ref = useRef(null);
  const onMove = e => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = (e.clientX ?? e.touches?.[0]?.clientX ?? r.left+r.width/2) - r.left - r.width/2;
    const cy = (e.clientY ?? e.touches?.[0]?.clientY ?? r.top+r.height/2) - r.top - r.height/2;
    setTilt({ x: cy/r.height * -10, y: cx/r.width * 12 });
  };
  const onLeave = () => setTilt({x:0,y:0});
  return { ref, tilt, onMove, onLeave };
};

// ── Scroll-Reveal Hook — one-shot IntersectionObserver entrance ──
const useReveal = (threshold=0.12) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if(e.isIntersecting) { setVisible(true); obs.disconnect(); } }, {threshold});
    if(ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

// ── Reveal Wrapper — fades+slides children in as they enter viewport ──
const Reveal = ({children, delay=0, style={}}) => {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.55s ease ${delay}s, transform 0.55s cubic-bezier(.16,1,.3,1) ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
};

// ── Count-Up Hook — animates a number from 0 to target on trigger ──
const useCountUp = (target, duration = 1400) => {
  const [val, setVal] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const rafRef = useRef(null);
  const trigger = useCallback(() => { if (!triggered) setTriggered(true); }, [triggered]);
  useEffect(() => {
    if (!triggered) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // cubic ease-out
      setVal(Math.round(target * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [triggered, target, duration]);
  return [val, trigger];
};

// ── Typewriter — reveals text character by character on mount ──
const Typewriter = ({text, delay = 400, speed = 58}) => {
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const to = setTimeout(() => {
      let i = 0;
      const id = setInterval(() => {
        i++;
        setShown(i);
        if (i >= text.length) { clearInterval(id); setDone(true); }
      }, speed);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(to);
  }, [text, delay, speed]);
  return (
    <span>
      {text.split('').map((ch, i) => (
        <span key={i} style={{
          opacity: i < shown ? 1 : 0,
          display: 'inline-block',
          animation: i < shown ? `typeIn 0.18s ease both` : 'none',
        }}>{ch}</span>
      ))}
      {!done && <span style={{animation:'cursorBlink 0.7s ease infinite',marginLeft:1,color:'inherit',opacity:.6}}>|</span>}
    </span>
  );
};

// ── Hero floating incense particles (deterministic positions) ──
const HERO_PARTICLES = [
  {b:6,  l:28, s:2.5, d:0,   dur:7.2, x:14},
  {b:18, l:52, s:2,   d:1.4, dur:9.0, x:-9},
  {b:10, l:68, s:3,   d:2.6, dur:6.8, x:18},
  {b:30, l:38, s:1.5, d:0.7, dur:8.4, x:-16},
  {b:22, l:75, s:2,   d:3.2, dur:7.6, x:7},
  {b:40, l:22, s:2.5, d:1.0, dur:6.4, x:22},
  {b:14, l:84, s:2,   d:2.0, dur:9.8, x:-6},
  {b:35, l:58, s:1.5, d:0.4, dur:8.0, x:11},
];

// ── Om Chant Hook (MP3 + Web Audio API fallback) ──
const useOmChant = () => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const fadeRef = useRef(null);
  const ctx = useRef(null);
  const masterRef = useRef(null);
  const nodes = useRef([]);

  const stopSynth = useCallback(() => {
    try {
      if (ctx.current && masterRef.current) {
        const now = ctx.current.currentTime;
        masterRef.current.gain.cancelScheduledValues(now);
        masterRef.current.gain.setValueAtTime(masterRef.current.gain.value, now);
        masterRef.current.gain.linearRampToValueAtTime(0, now + 2.5);
      }
      nodes.current.forEach(n => { try { n.stop(ctx.current ? ctx.current.currentTime + 2.6 : 0); } catch(e) {} });
    } catch(e) {}
    nodes.current = [];
    masterRef.current = null;
    setTimeout(() => { try { if (ctx.current) { ctx.current.close(); ctx.current = null; } } catch(e) {} }, 2800);
  }, []);

  const stop = useCallback(() => {
    if (fadeRef.current) { clearInterval(fadeRef.current); fadeRef.current = null; }
    if (audioRef.current) {
      const audio = audioRef.current;
      audioRef.current = null;
      let vol = audio.volume;
      const fadeOut = setInterval(() => {
        vol = Math.max(0, vol - 0.06);
        try { audio.volume = vol; } catch(e) {}
        if (vol <= 0) { try { audio.pause(); audio.currentTime = 0; } catch(e) {} clearInterval(fadeOut); }
      }, 60);
    }
    stopSynth();
    setPlaying(false);
  }, [stopSynth]);

  const playSynth = useCallback((ac) => {
    const t = ac.currentTime;
    const root = 110;
    const master = ac.createGain();
    masterRef.current = master;
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(0.72, t + 3.5);
    master.connect(ac.destination);
    const reverbOut = ac.createGain();
    reverbOut.gain.setValueAtTime(0.38, t);
    reverbOut.connect(master);
    [[0.031, 0.18], [0.071, 0.14], [0.127, 0.10], [0.213, 0.07]].forEach(([dt, g]) => {
      const dl = ac.createDelay(0.5); dl.delayTime.setValueAtTime(dt, t);
      const dg = ac.createGain(); dg.gain.setValueAtTime(g, t);
      dl.connect(dg); dg.connect(reverbOut);
      nodes.current.push(dl);
    });
    const dry = ac.createGain();
    dry.gain.setValueAtTime(0.62, t);
    dry.connect(master);
    const vib = ac.createOscillator();
    const vibG = ac.createGain();
    vib.frequency.setValueAtTime(5.2, t);
    vibG.gain.setValueAtTime(root * 0.0035, t);
    vib.connect(vibG); vib.start(t);
    nodes.current.push(vib);
    const saw = ac.createOscillator();
    saw.type = 'sawtooth'; saw.frequency.setValueAtTime(root, t);
    vibG.connect(saw.frequency);
    const sawG = ac.createGain(); sawG.gain.setValueAtTime(0.55, t);
    saw.connect(sawG);
    const sub = ac.createOscillator();
    sub.type = 'sine'; sub.frequency.setValueAtTime(root, t);
    vibG.connect(sub.frequency);
    const subG = ac.createGain(); subG.gain.setValueAtTime(0.42, t);
    sub.connect(subG); subG.connect(dry); subG.connect(reverbOut);
    const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.setValueAtTime(4, t);
    f1.frequency.setValueAtTime(750, t); f1.frequency.linearRampToValueAtTime(500, t+5); f1.frequency.linearRampToValueAtTime(280, t+10);
    const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.setValueAtTime(6, t);
    f2.frequency.setValueAtTime(1100, t); f2.frequency.linearRampToValueAtTime(800, t+5); f2.frequency.linearRampToValueAtTime(450, t+10);
    const f3 = ac.createBiquadFilter(); f3.type = 'bandpass'; f3.Q.setValueAtTime(5, t);
    f3.frequency.setValueAtTime(260, t);
    const f3G = ac.createGain(); f3G.gain.setValueAtTime(0.15, t); f3G.gain.linearRampToValueAtTime(0.85, t+9);
    f3.connect(f3G);
    sawG.connect(f1); sawG.connect(f2); sawG.connect(f3);
    f1.connect(dry); f1.connect(reverbOut);
    f2.connect(dry); f2.connect(reverbOut);
    f3G.connect(dry); f3G.connect(reverbOut);
    const harm = ac.createOscillator(); harm.type = 'sine'; harm.frequency.setValueAtTime(root*2, t);
    const harmG = ac.createGain(); harmG.gain.setValueAtTime(0.07, t); harmG.gain.linearRampToValueAtTime(0.03, t+6);
    harm.connect(harmG); harmG.connect(dry); harm.start(t);
    nodes.current.push(harm, saw, sub);
    saw.start(t); sub.start(t);
  }, []);

  const startSynth = useCallback(() => {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      ctx.current = ac;
      playSynth(ac);
      setPlaying(true);
    } catch(e) { console.error('Synth fallback failed:', e); }
  }, [playSynth]);

  const play = useCallback(() => {
    // Cleanup any previous audio
    if (audioRef.current) { try { audioRef.current.pause(); } catch(e) {} audioRef.current = null; }
    if (fadeRef.current) { clearInterval(fadeRef.current); fadeRef.current = null; }

    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audioRef.current = audio;

    // Error handler — go straight to synth
    audio.onerror = () => {
      if (audioRef.current === audio) { audioRef.current = null; startSynth(); }
    };

    // Once enough data is loaded, play and fade in
    const tryPlay = () => {
      audio.volume = 0.001;
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          // Audio is playing — fade in
          let vol = 0.001;
          fadeRef.current = setInterval(() => {
            vol = Math.min(1, vol + 0.035);
            if (audioRef.current === audio) audio.volume = vol;
            if (vol >= 1) { clearInterval(fadeRef.current); fadeRef.current = null; }
          }, 60);
          setPlaying(true);
        }).catch(err => {
          console.warn('MP3 play() rejected:', err.name, err.message);
          if (audioRef.current === audio) { audioRef.current = null; }
          startSynth();
        });
      } else {
        // Old browser — no promise
        setPlaying(true);
      }
    };

    // Set src after handlers are attached
    audio.src = '/om-chant.mp3';
    audio.load();
    // Attempt play immediately (works in most browsers post-load())
    tryPlay();
  }, [startSynth]);

  const toggle = useCallback(() => { playing ? stop() : play(); }, [playing, stop, play]);
  useEffect(() => () => {
    if (fadeRef.current) clearInterval(fadeRef.current);
    if (audioRef.current) { try { audioRef.current.pause(); } catch(e) {} audioRef.current = null; }
    nodes.current.forEach(n => { try { n.stop(); } catch(e) {} });
    try { if (ctx.current) ctx.current.close(); } catch(e) {}
  }, []);
  return { playing, toggle };
};

// ── Components ──

const ShlokaWidget = () => {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => { setIdx(i => (i + 1) % SHLOKAS.length); setFading(false); }, 400);
    }, 6000);
    return () => clearInterval(id);
  }, []);
  const s = SHLOKAS[idx];
  return (
    <div style={{margin:"32px 24px 0",borderRadius:22,padding:"22px 20px",background:`linear-gradient(140deg,rgba(196,162,78,0.07),rgba(212,133,60,0.04))`,border:`1px solid rgba(196,162,78,0.1)`,animation:"panchangGlow 6s ease-in-out infinite",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-12,right:-12,fontFamily:FD,fontSize:80,color:"rgba(196,162,78,0.04)",lineHeight:1,pointerEvents:"none",userSelect:"none"}}>ॐ</div>
      <div style={{fontSize:9,color:C.gold,fontWeight:800,letterSpacing:3,textTransform:"uppercase",marginBottom:14,opacity:.7}}>Daily Mantra</div>
      <div style={{transition:"opacity .4s ease",opacity:fading?0:1}}>
        <div style={{fontFamily:FD,fontSize:22,color:C.cream,lineHeight:1.5,letterSpacing:.5,marginBottom:10}}>{s.sk}</div>
        <div style={{fontSize:12.5,color:C.creamD,fontStyle:"italic",marginBottom:6}}>{s.tr}</div>
        <div style={{fontSize:10,color:C.textDD,fontWeight:600,letterSpacing:.8}}>— {s.src}</div>
      </div>
      <div style={{display:"flex",gap:6,marginTop:18}}>
        {SHLOKAS.map((_,i) => (
          <div key={i} onClick={() => { setFading(true); setTimeout(()=>{setIdx(i);setFading(false);},300); }} style={{width:i===idx?18:6,height:5,borderRadius:3,background:i===idx?C.gold:`rgba(196,162,78,0.18)`,transition:"all .4s cubic-bezier(.16,1,.3,1)",cursor:"pointer"}}/>
        ))}
      </div>
    </div>
  );
};

const PanchangWidget = () => {
  const p = getHinduPanchang();
  const [ref, visible] = useReveal(0.2);
  return (
  <div ref={ref} style={{margin:"28px 24px 0",borderRadius:22,overflow:"hidden",background:C.card,border:`1px solid ${C.div}`,boxShadow:`0 4px 20px rgba(212,133,60,0.06)`}}>
    <div style={{height:3,background:`linear-gradient(90deg,${C.saffron},${C.gold},transparent)`}}/>
    <div style={{padding:"16px 20px 18px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontFamily:FD,fontSize:13,color:C.textM,fontWeight:500,letterSpacing:.3}}>Today's Panchang</div>
        <div style={{fontSize:11,color:C.saffron,fontWeight:700,padding:"4px 12px",borderRadius:8,background:C.saffronDim,border:`1px solid rgba(212,133,60,0.1)`,fontFamily:FD}}>{p.vara}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[
          {l:"Tithi",v:p.tithi,e:"🌙"},
          {l:"Nakshatra",v:p.nakshatra,e:"✦"},
          {l:"Yoga",v:p.yoga,e:"◎"},
          {l:"Muhurta",v:p.muhurta,e:"⊙"},
        ].map((item,i) => (
          <div key={item.l} style={{
            padding:"12px 14px",borderRadius:14,background:C.saffronPale,
            border:`1px solid rgba(212,133,60,0.08)`,
            animation: visible ? `flipIn 0.55s cubic-bezier(.16,1,.3,1) ${i*0.09}s both` : 'none',
            transformOrigin:'top center',
          }}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <span style={{fontSize:16}}>{item.e}</span>
              <span style={{fontSize:9,color:C.textD,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase"}}>{item.l}</span>
            </div>
            <div style={{fontFamily:FE,fontSize:14,color:C.creamM,fontWeight:500,lineHeight:1.3}}>{item.v}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
  );
};

const PilgrimageCard = ({onNav}) => (
  <div className="t" onClick={() => onNav("explore")} style={{margin:"28px 24px 0",borderRadius:24,padding:"24px 22px",cursor:"pointer",position:"relative",overflow:"hidden",background:`linear-gradient(140deg,${hsl(215,40,12)},${hsl(215,50,6)})`}}>
    <div style={{position:"absolute",top:"-20%",right:"-10%",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(100,140,255,0.07),transparent 65%)",filter:"blur(30px)",animation:"breathe 9s ease-in-out infinite",pointerEvents:"none"}}/>
    <div style={{fontSize:9,color:"rgba(140,170,255,0.5)",fontWeight:800,letterSpacing:3,textTransform:"uppercase",marginBottom:10}}>New Feature</div>
    <h3 style={{fontFamily:FD,fontSize:20,fontWeight:500,color:"#fff",lineHeight:1.2,marginBottom:8}}>Pilgrimage Circuits</h3>
    <p style={{fontSize:12.5,color:"rgba(255,255,255,0.35)",lineHeight:1.7,marginBottom:18}}>Curated sacred routes — Char Dham, Jyotirlinga Yatra, Shakti Peethas & more.</p>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      {["Char Dham","Jyotirlinga","Shakti Peethas"].map(t => (
        <div key={t} style={{padding:"5px 12px",borderRadius:8,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.05)",fontSize:10,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:.3}}>{t}</div>
      ))}
    </div>
    <div style={{position:"absolute",top:20,right:20,width:40,height:40,borderRadius:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"rgba(255,255,255,0.3)"}}>→</div>
  </div>
);

const SH =({title, sub, act, onAct, d=0}) => (
  <div className="rv" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",padding:"0 24px",marginBottom:20,animationDelay:`${d}s`}}>
    <div>
      <h2 style={{fontFamily:FD,fontSize:24,fontWeight:500,color:C.cream,letterSpacing:-.3,lineHeight:1.1}}>{title}</h2>
      {sub && <p style={{fontSize:11,color:C.textD,marginTop:6,letterSpacing:.5,fontWeight:500}}>{sub}</p>}
    </div>
    {act && <button className="t" onClick={onAct} style={{background:C.saffronDim,border:`1px solid rgba(212,133,60,0.15)`,color:C.saffron,fontSize:10.5,fontWeight:700,cursor:"pointer",fontFamily:FB,padding:"7px 14px",borderRadius:10,letterSpacing:.6,textTransform:"uppercase",display:"flex",alignItems:"center",gap:4}}>
      {act} <span style={{fontSize:13}}>→</span>
    </button>}
  </div>
);

const Chip = ({label, active, onClick}) => (
  <button className="t" aria-pressed={active} onClick={onClick} style={{
    padding:"9px 18px",borderRadius:100,fontFamily:FB,fontSize:12,fontWeight:active?700:500,
    cursor:"pointer",whiteSpace:"nowrap",letterSpacing:.3,
    background:active?C.saffron:C.card,color:active?C.bg:C.textM,
    border:active?"none":`1px solid ${C.div}`,
    boxShadow:active?"0 4px 20px rgba(212,133,60,0.3)":"none",
    transition:"all .2s cubic-bezier(.16,1,.3,1)",
  }}>{label}</button>
);

// ── Featured Card ──
const FCard = memo(({t, onClick, onFav, d=0}) => {
  const imgSrc = `https://source.unsplash.com/400x600/?${deityQuery(t.deityPrimary)}&sig=${t.id}`;
  const [px, py] = useParallax();
  const { ref: tiltRef, tilt, onMove: onTiltMove, onLeave: onTiltLeave } = useTilt();
  const [burst, setBurst] = useState(false);
  const handleFav = (e) => {
    e.stopPropagation();
    if (!t.isFavorite) { setBurst(true); setTimeout(() => setBurst(false), 750); }
    onFav?.(t.id, t.isFavorite);
  };
  const isSettled = tilt.x === 0 && tilt.y === 0;
  return (
    <div className="rv" onClick={() => onClick(t)} style={{
      width:268,minWidth:268,height:360,borderRadius:26,overflow:"hidden",
      position:"relative",cursor:"pointer",flexShrink:0,scrollSnapAlign:"start",
      boxShadow:`0 16px 56px ${hsl(t.hue,30,5,0.6)}, 0 0 0 1px ${hsl(t.hue,30,20,0.12)}`,
      animationDelay:`${d}s`,
    }}>
      {/* 3D tilt wrapper — perspective transform without conflicting with .t active scale */}
      <div ref={tiltRef}
        onMouseMove={onTiltMove} onTouchMove={onTiltMove}
        onMouseLeave={onTiltLeave} onTouchEnd={onTiltLeave}
        className="t"
        style={{
          position:'absolute', inset:0,
          transform:`perspective(820px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: isSettled ? 'transform 0.5s cubic-bezier(.16,1,.3,1)' : 'none',
          transformOrigin:'center center',
          willChange:'transform',
        }}>
        {/* Full-bleed cinematic photo with Ken Burns + gyroscope parallax */}
        <TempleImage src={imgSrc} hue={t.hue} style={{position:"absolute",inset:0,width:"100%",height:"100%"}} omSize={68} px={px} py={py}/>
        {/* Shimmer sweep */}
        <div style={{position:"absolute",top:0,left:"-120%",width:"60%",height:"100%",background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)",animation:"shimmer 6s ease-in-out infinite",pointerEvents:"none"}}/>
        {/* Deity badge — top left */}
        <div style={{position:"absolute",top:18,left:18,zIndex:3}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 13px",borderRadius:100,background:"rgba(0,0,0,0.42)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.12)",fontSize:10,color:"rgba(255,255,255,0.92)",fontWeight:700,letterSpacing:.7}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:"#E69A52",boxShadow:"0 0 8px rgba(212,133,60,0.8)"}}/>{t.deityPrimary}
          </div>
        </div>
        {/* Fav — top right (with heart burst anchor) */}
        <div style={{position:"absolute",top:18,right:18,zIndex:3}}>
          <div aria-label={t.isFavorite ? "Remove from saved" : "Save temple"} role="button" className="t" onClick={handleFav} style={{width:38,height:38,borderRadius:12,background:t.isFavorite?"rgba(196,64,64,0.85)":"rgba(0,0,0,0.32)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${t.isFavorite?"rgba(196,64,64,0.4)":"rgba(255,255,255,0.1)"}`,fontSize:14,color:"#fff",transition:"all .3s",cursor:"pointer",position:"relative"}}>
            {t.isFavorite ? "♥" : "♡"}
            {/* Heart burst particles */}
            {burst && [0,60,120,180,240,300].map((deg,i) => (
              <div key={i} style={{
                position:'absolute',top:'50%',left:'50%',
                width:6,height:6,borderRadius:'50%',
                background:'#ef4444',pointerEvents:'none',zIndex:20,
                animation:`heartBurst 0.65s ease-out ${i*0.045}s both`,
                '--hb-deg':`${deg}deg`,
              }}/>
            ))}
          </div>
        </div>
        {/* Cinematic bottom glass overlay */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"110px 22px 24px",background:"linear-gradient(transparent,rgba(0,0,0,0.45) 25%,rgba(0,0,0,0.88) 100%)"}}>
          <h3 style={{fontFamily:FD,fontSize:23,fontWeight:500,color:"#fff",lineHeight:1.15,marginBottom:8,textShadow:"0 2px 12px rgba(0,0,0,0.4)"}}>{t.templeName}</h3>
          <div style={{fontSize:11.5,color:"rgba(255,255,255,0.5)",display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:3,height:3,borderRadius:"50%",background:"rgba(255,255,255,0.3)"}}/>{t.townOrCity}, {t.stateOrUnionTerritory}
          </div>
          {t.architectureStyle && <div style={{marginTop:10,fontSize:11,color:"rgba(255,255,255,0.25)",fontFamily:FD,fontStyle:"italic"}}>{t.architectureStyle}</div>}
        </div>
      </div>
    </div>
  );
});

// ── List Card ──
const LCard = memo(({t, onClick, onFav, d=0}) => {
  const imgSrc = `https://source.unsplash.com/180x180/?${deityQuery(t.deityPrimary)}&sig=${t.id}`;
  return (
    <div className="t rv" onClick={() => onClick(t)} style={{
      display:"flex",gap:0,padding:0,margin:"0 24px 12px",borderRadius:20,
      background:C.card,cursor:"pointer",animationDelay:`${d}s`,
      border:`1px solid ${C.div}`,overflow:"hidden",
      boxShadow:`0 2px 12px rgba(0,0,0,0.18)`,
    }}>
      <div style={{width:3,flexShrink:0,background:`linear-gradient(180deg,${C.saffron},${C.gold})`}}/>
      <div style={{display:"flex",gap:14,padding:14,flex:1,minWidth:0}}>
        <div style={{width:96,height:96,minWidth:96,borderRadius:16,overflow:"hidden",position:"relative"}}>
          <TempleImage src={imgSrc} hue={t.hue} style={{width:96,height:96}} omSize={24}/>
          <div style={{position:"absolute",bottom:5,left:5,padding:"3px 7px",borderRadius:6,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(6px)",fontSize:8.5,color:"rgba(255,255,255,0.9)",fontWeight:700,letterSpacing:.3}}>{t.deityPrimary}</div>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",minWidth:0,gap:4}}>
          <h3 style={{fontFamily:FE,fontSize:18,fontWeight:500,lineHeight:1.25,color:C.cream,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.templeName}</h3>
          <div style={{fontSize:11.5,color:C.textD,display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:3,height:3,borderRadius:"50%",background:C.textDD}}/>{t.townOrCity}{t.stateOrUnionTerritory ? `, ${t.stateOrUnionTerritory}` : ""}
          </div>
          <div style={{marginTop:2}}>
            <span style={{fontSize:10.5,padding:"3px 9px",borderRadius:99,background:C.saffronDim,color:C.saffron,fontWeight:700,letterSpacing:.3,border:`1px solid rgba(212,133,60,0.1)`}}>
              {(t.architectureStyle || t.deityPrimary).split("·")[0].trim()}
            </span>
          </div>
        </div>
        <div aria-label={t.isFavorite ? "Remove from saved" : "Save temple"} role="button" onClick={e => { e.stopPropagation(); onFav?.(t.id, t.isFavorite); }} style={{display:"flex",alignItems:"center",fontSize:15,color:t.isFavorite?C.red:C.textDD,padding:"8px 4px",cursor:"pointer",transition:"transform .12s"}}>{t.isFavorite?"♥":"♡"}</div>
      </div>
    </div>
  );
});

const IR = ({emoji, label, value, action}) => (
  <div className="t" onClick={action} style={{display:"flex",alignItems:"flex-start",gap:16,padding:"18px 0",borderBottom:`1px solid ${C.divL}`,cursor:action?"pointer":"default"}}>
    <div style={{width:44,height:44,borderRadius:14,background:C.saffronDim,border:`1px solid rgba(212,133,60,0.08)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>{emoji}</div>
    <div style={{flex:1,paddingTop:1}}>
      <div style={{fontSize:9.5,color:C.textDD,fontWeight:700,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>{label}</div>
      <div style={{fontSize:14,color:C.creamM,lineHeight:1.65,whiteSpace:"pre-line"}}>{value}</div>
    </div>
    {action && <span style={{color:C.textDD,fontSize:16,paddingTop:12}}>→</span>}
  </div>
);

// ── SVG Chevron Back Button ──
const BackBtn = ({onClick, glass=false}) => (
  <button aria-label="Go back" className="t" onClick={onClick} style={{
    background: glass ? 'rgba(0,0,0,0.35)' : 'none',
    backdropFilter: glass ? 'blur(14px)' : 'none',
    border: glass ? '1px solid rgba(255,255,255,0.12)' : 'none',
    cursor:'pointer', width:42, height:42, borderRadius:13, flexShrink:0,
    display:'flex', alignItems:'center', justifyContent:'center',
    color: glass ? '#fff' : C.cream,
  }}>
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  </button>
);

// ── FCard Carousel with Dot Indicators ──
const CardCarousel = ({items, renderCard, pad='24px'}) => {
  const [active, setActive] = useState(0);
  const itemRefs = useRef([]);
  const scrollRef = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { const idx = itemRefs.current.indexOf(e.target); if (idx>=0) setActive(idx); } });
    }, {root: scrollRef.current, threshold: 0.55});
    itemRefs.current.forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, [items.length]);
  return (
    <div>
      <div ref={scrollRef} style={{display:'flex',gap:18,overflowX:'auto',padding:`0 ${pad} 4px`,scrollSnapType:'x mandatory',WebkitOverflowScrolling:'touch'}}>
        {items.map((item,i) => (
          <div key={item.id||i} ref={el => itemRefs.current[i]=el} style={{scrollSnapAlign:'start',flexShrink:0}}>
            {renderCard(item,i)}
          </div>
        ))}
        <div style={{flexShrink:0,width:8}}/>
      </div>
      {items.length > 1 && (
        <div style={{display:'flex',gap:5,justifyContent:'center',paddingTop:10,paddingBottom:2}}>
          {items.map((_,i) => (
            <div key={i} style={{
              height:5, borderRadius:3, background: i===active ? C.saffron : C.textDD,
              width: i===active ? 20 : 5,
              transition:'all 0.35s cubic-bezier(.16,1,.3,1)',
              opacity: i===active ? 1 : 0.4,
            }}/>
          ))}
        </div>
      )}
    </div>
  );
};

// Persistent theme toggle — used in every page header
const ThemeBtn = ({isDark, onToggle}) => (
  <button aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"} className="t" onClick={onToggle} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{
    width:42,height:42,borderRadius:13,flexShrink:0,
    background:isDark?"rgba(255,255,255,0.05)":C.saffronDim,
    border:`1px solid ${isDark?C.div:C.saffronPale}`,
    display:"flex",alignItems:"center",justifyContent:"center",
    cursor:"pointer",transition:"all .3s cubic-bezier(.16,1,.3,1)",
    boxShadow:isDark?"none":`0 2px 12px ${C.saffronPale}`,
  }}>
    {isDark
      ? <svg width="18" height="18" fill="none" stroke="rgba(255,220,100,0.85)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
      : <svg width="18" height="18" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    }
  </button>
);

const Empty = ({emoji, title, sub, action}) => (
  <div className="fi" role="status" style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"80px 40px",textAlign:"center"}}>
    <div style={{width:96,height:96,borderRadius:"50%",background:C.saffronDim,border:`1px solid rgba(212,133,60,0.2)`,boxShadow:`0 0 32px rgba(212,133,60,0.08)`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:24,fontSize:38,position:"relative"}} aria-hidden="true">
      <span style={{position:"absolute",fontSize:72,fontFamily:FE,color:C.saffron,opacity:.07,userSelect:"none",lineHeight:1}}>ॐ</span>
      <span style={{position:"relative"}}>{emoji}</span>
    </div>
    <h3 style={{fontFamily:FE,fontSize:24,color:C.cream,marginBottom:10}}>{title}</h3>
    <p style={{fontSize:13,color:C.textD,lineHeight:1.7,maxWidth:260,marginBottom:action?24:0}}>{sub}</p>
    {action && <button className="t" onClick={action.onPress} style={{padding:"11px 28px",borderRadius:99,background:`linear-gradient(135deg,${C.saffron},${C.saffronH})`,border:"none",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 18px rgba(212,133,60,0.3)`,transition:"box-shadow .2s ease, transform .15s ease"}}>{action.label}</button>}
  </div>
);

// ── Skeleton shimmer helper ──
const skelBg = (isDark) => isDark
  ? `linear-gradient(90deg,rgba(42,30,20,1) 25%,rgba(58,42,28,1) 50%,rgba(42,30,20,1) 75%)`
  : `linear-gradient(90deg,rgba(230,224,214,1) 25%,rgba(245,240,232,1) 50%,rgba(230,224,214,1) 75%)`;

const SkeletonCard = () => (
  <div style={{width:268,minWidth:268,height:360,borderRadius:26,overflow:"hidden",flexShrink:0,scrollSnapAlign:"start",background:C.card,border:`1px solid ${C.div}`}}>
    <div style={{height:260,background:skelBg(true),backgroundSize:'800px 100%',animation:'skeletonShimmer 1.6s ease-in-out infinite'}}/>
    <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:10}}>
      <div style={{height:14,width:"55%",borderRadius:7,background:skelBg(true),backgroundSize:'800px 100%',animation:'skeletonShimmer 1.6s ease-in-out infinite .1s'}}/>
      <div style={{height:20,width:"80%",borderRadius:7,background:skelBg(true),backgroundSize:'800px 100%',animation:'skeletonShimmer 1.6s ease-in-out infinite .2s'}}/>
      <div style={{height:12,width:"50%",borderRadius:6,background:skelBg(true),backgroundSize:'800px 100%',animation:'skeletonShimmer 1.6s ease-in-out infinite .3s'}}/>
    </div>
  </div>
);

const SkeletonListCard = () => (
  <div style={{display:"flex",gap:0,padding:0,margin:"0 24px 12px",borderRadius:20,background:C.card,border:`1px solid ${C.div}`,overflow:"hidden"}}>
    <div style={{width:3,flexShrink:0,background:`linear-gradient(180deg,${C.saffronDim},${C.goldDim})`}}/>
    <div style={{display:"flex",gap:14,padding:14,flex:1}}>
      <div style={{width:96,height:96,minWidth:96,borderRadius:16,background:skelBg(true),backgroundSize:'800px 100%',animation:'skeletonShimmer 1.6s ease-in-out infinite'}}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:8}}>
        <div style={{height:18,width:"70%",borderRadius:7,background:skelBg(true),backgroundSize:'800px 100%',animation:'skeletonShimmer 1.6s ease-in-out infinite .1s'}}/>
        <div style={{height:12,width:"50%",borderRadius:6,background:skelBg(true),backgroundSize:'800px 100%',animation:'skeletonShimmer 1.6s ease-in-out infinite .2s'}}/>
        <div style={{height:22,width:90,borderRadius:99,background:skelBg(true),backgroundSize:'800px 100%',animation:'skeletonShimmer 1.6s ease-in-out infinite .3s'}}/>
      </div>
    </div>
  </div>
);

const TypingDots = () => (
  <div style={{display:'flex',justifyContent:'flex-start',alignItems:'flex-end',gap:8}}>
    <div style={{width:30,height:30,borderRadius:10,background:`linear-gradient(135deg,rgba(212,133,60,0.22),rgba(212,133,60,0.08))`,border:`1px solid rgba(212,133,60,0.2)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><OmSvg size={17}/></div>
    <div style={{padding:'12px 16px',borderRadius:'4px 18px 18px 18px',background:C.card,border:`1px solid ${C.div}`,display:'flex',alignItems:'center',gap:5}}>
      {[0,1,2].map(i => <div key={i} style={{width:7,height:7,borderRadius:'50%',background:C.saffron,opacity:.5,animation:`soundWave 1.2s ease-in-out infinite ${i*.18}s`}}/>)}
    </div>
  </div>
);

const Toast = ({msg, icon='✓', visible}) => (
  <div style={{
    position:'fixed', bottom:100, left:'50%',
    zIndex:999, pointerEvents:'none',
    padding:'11px 22px', borderRadius:100,
    background: visible ? C.card : 'transparent',
    border: visible ? `1px solid ${C.div}` : 'none',
    boxShadow: visible ? `0 8px 32px rgba(0,0,0,0.28), 0 0 0 1px ${C.saffronDim}` : 'none',
    display:'flex', alignItems:'center', gap:8,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateX(-50%) translateY(0) scale(1)' : 'translateX(-50%) translateY(16px) scale(0.92)',
    transition:'opacity .26s cubic-bezier(.16,1,.3,1), transform .26s cubic-bezier(.16,1,.3,1)',
    whiteSpace:'nowrap',
    backdropFilter: visible ? 'blur(20px)' : 'none',
  }}>
    <span style={{fontSize:14,color:C.saffron}}>{icon}</span>
    <span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:FB}}>{msg}</span>
  </div>
);

const NavSvg = ({name, col}) => {
  const s = {width:22,height:22,display:"block"};
  if (name === "home") return <svg {...s} fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 10L12 3l9 7v10h-5v-6h-8v6H3z"/></svg>;
  if (name === "explore") return <svg {...s} fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z" fill={col} stroke="none"/></svg>;
  if (name === "nearby") return <svg {...s} fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>;
  if (name === "saved") return <svg {...s} fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
  return <svg {...s} fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg>;
};

const BNav = ({a, on, savedCount=0}) => {
  const items = [{k:"home",l:"Home"},{k:"explore",l:"Explore"},{k:"nearby",l:"Nearby"},{k:"saved",l:"Saved"},{k:"profile",l:"Profile"}];
  return (
    <nav role="navigation" aria-label="Main navigation" style={{position:"relative",bottom:0,zIndex:100,background:C.glass,backdropFilter:"blur(28px) saturate(160%)",borderTop:`1px solid ${C.div}`,padding:"6px 0 20px"}}>
      {/* Single sliding indicator pill */}
      {(() => { const idx = items.map(t=>t.k).indexOf(a); return idx>=0 && (
        <div style={{position:"absolute",top:0,left:`${idx * 20}%`,width:'20%',display:'flex',justifyContent:'center',transition:'left 0.38s cubic-bezier(.16,1,.3,1)',pointerEvents:'none'}} aria-hidden="true">
          <div style={{width:28,height:3,borderRadius:3,background:`linear-gradient(90deg,${C.saffron},${C.saffronH})`,boxShadow:`0 0 14px ${C.saffron}99`}}/>
        </div>
      ); })()}
      <div style={{display:"flex",justifyContent:"space-around"}}>
        {items.map(t => {
          const active = a === t.k;
          const col = active ? C.saffron : C.textDD;
          return (
            <button key={t.k} aria-label={t.l} aria-current={active ? "page" : undefined} className="t" onClick={() => { haptic(12); on(t.k); }} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"6px 14px",position:"relative"}}>
              <div style={{width:40,height:40,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",background:active?C.saffronDim:"transparent",transform:active?'scale(1)':'scale(0.88)',transition:"all .28s cubic-bezier(.16,1,.3,1)",position:"relative"}}>
                <NavSvg name={t.k} col={col}/>
                {/* Saved badge */}
                {t.k === "saved" && savedCount > 0 && (
                  <div style={{
                    position:"absolute",top:-2,right:-2,
                    minWidth:16,height:16,borderRadius:8,
                    background:C.saffron,
                    fontSize:8.5,fontWeight:800,color:"#fff",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    padding:"0 4px",
                    border:`2px solid ${C.bg}`,
                    boxShadow:`0 0 8px rgba(212,133,60,0.5)`,
                  }}>
                    {savedCount > 99 ? "99+" : savedCount}
                  </div>
                )}
              </div>
              <span style={{fontSize:9.5,fontWeight:active?700:500,color:col,letterSpacing:.6,transition:'color .25s ease'}}>{t.l}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━ PAGES ━━━━━━━━━━━━━━━━━━━━━━━

const SacredCircuits = ({nav, isDark}) => {
  const [c1, t1] = useCountUp(12,  900);
  const [c2, t2] = useCountUp(51,  1100);
  const [c3, t3] = useCountUp(108, 1400);
  const [c4, t4] = useCountUp(4,   700);
  const stripRef = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { t1(); t2(); t3(); t4(); obs.disconnect(); }
    }, {threshold: 0.35});
    if (stripRef.current) obs.observe(stripRef.current);
    return () => obs.disconnect();
  }, [t1, t2, t3, t4]);
  const circuits = [
    {n:c1, l:"Jyotirlingas",   icon:"☽", h:350},
    {n:c2, l:"Shakti Peethas", icon:"✦", h:280},
    {n:c3, l:"Divya Desams",   icon:"☸", h:215},
    {n:c4, l:"Char Dhams",     icon:"◎", h:140},
  ];
  return (
    <Reveal delay={0}>
      <div style={{margin:"36px 24px 0"}}>
        <SH title="Sacred Circuits" sub="Complete pilgrimage networks of Bhārata"/>
        <div ref={stripRef} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {circuits.map((c,i) => (
            <div key={c.l} className="t" onClick={() => nav("explore")} style={{
              padding:"18px 16px",borderRadius:20,cursor:"pointer",
              background:`linear-gradient(140deg,${hsl(c.h,35,isDark?11:92)},${C.card})`,
              border:`1px solid ${hsl(c.h,30,isDark?20:78,0.25)}`,
              borderTop:`2.5px solid ${hsl(c.h,50,isDark?38:62,0.55)}`,
              position:"relative",overflow:"hidden",
              animation:`circuitGlow 4s ease-in-out infinite ${i*.8}s`,
            }}>
              <div style={{position:"absolute",top:0,left:"-100%",width:"45%",height:"100%",background:`linear-gradient(105deg,transparent,${hsl(c.h,60,70,0.07)},transparent)`,animation:`premiumSheen 5s ease-in-out infinite ${i*0.9+1}s`,pointerEvents:"none"}}/>
              <div style={{fontSize:20,marginBottom:8,filter:`drop-shadow(0 0 6px ${hsl(c.h,60,55,0.5)})`}}>{c.icon}</div>
              <div style={{fontFamily:FD,fontSize:28,fontWeight:500,color:hsl(c.h,55,isDark?68:42),lineHeight:1,marginBottom:6}}>{c.n}</div>
              <div style={{fontSize:11,color:C.textM,fontWeight:600,letterSpacing:.3}}>{c.l}</div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
};

const Home = ({nav, oT, oF, temples, loading, isDark, onToggleTheme, recentIds=[]}) => {
  const { playing, toggle } = useOmChant();
  const [notified, setNotified] = useState(() => localStorage.getItem('premiumNotify') === '1');
  const onNotify = () => { localStorage.setItem('premiumNotify','1'); setNotified(true); };
  // Animated stats counters
  const [templesCount, triggerTemples] = useCountUp(3000, 1600);
  const [statesCount,  triggerStates]  = useCountUp(36,   1200);
  const [deitiesCount, triggerDeities] = useCountUp(6,    900);
  const statsRef = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { triggerTemples(); triggerStates(); triggerDeities(); obs.disconnect(); }
    }, {threshold: 0.5});
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, [triggerTemples, triggerStates, triggerDeities]);
  return (
  <div className="fi" style={{paddingBottom:28}}>
    {/* Cinematic spiritual overlay — triggered by Om chant */}
    <CinematicOverlay active={playing} />
    {/* HERO */}
    <div style={{background:isDark?`linear-gradient(175deg,${hsl(30,48,13)},${hsl(350,42,10)} 55%,${C.bg})`:`linear-gradient(175deg,${hsl(30,60,94)},${hsl(350,50,97)} 55%,${C.bg})`,padding:"22px 24px 40px",borderRadius:"0 0 42px 42px",position:"relative",overflow:"hidden",boxShadow:isDark?`0 24px 80px ${hsl(350,30,7,0.55)}`:`0 24px 80px ${hsl(30,40,80,0.18)}`,transition:"box-shadow 1.5s ease"}}>
      {/* Ambient glows — enhanced when Om chant is active */}
      <div style={{position:"absolute",top:"-8%",right:"-12%",width:320,height:320,borderRadius:"50%",background:`radial-gradient(circle,rgba(212,133,60,${playing?0.14:0.07}),transparent 60%)`,filter:"blur(60px)",animation:"breathe 9s ease-in-out infinite",pointerEvents:"none",transition:"background 1.5s ease"}}/>
      <div style={{position:"absolute",bottom:"5%",left:"-18%",width:220,height:220,borderRadius:"50%",background:`radial-gradient(circle,rgba(160,80,180,${playing?0.08:0.04}),transparent 60%)`,filter:"blur(45px)",animation:"breathe 12s ease-in-out infinite 3s",pointerEvents:"none",transition:"background 1.5s ease"}}/>
      {/* Floating incense particles */}
      {HERO_PARTICLES.map((p,i) => (
        <div key={i} style={{
          position:"absolute", bottom:`${p.b}%`, left:`${p.l}%`,
          width:p.s, height:p.s, borderRadius:"50%",
          background:"rgba(240,192,96,0.6)",
          boxShadow:`0 0 ${p.s*4}px rgba(240,192,96,0.45)`,
          pointerEvents:"none", zIndex:1,
          animation:`floatUp ${p.dur}s ease-in-out infinite ${p.d}s`,
          '--fp-x':`${p.x}px`,
        }}/>
      ))}

      {/* Top row */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,position:"relative",zIndex:2}}>
        <div>
          <div style={{fontSize:9,color:"rgba(212,133,60,0.45)",fontWeight:800,letterSpacing:5,textTransform:"uppercase",marginBottom:8,animation:"rv .5s ease both"}}>Discover</div>
          <h1 style={{fontFamily:FD,fontSize:36,color:C.cream,fontWeight:500,lineHeight:.96,letterSpacing:-.5,animation:"rv .55s cubic-bezier(.16,1,.3,1) .08s both"}}>Sacred<br/>Temples</h1>
          <p style={{fontFamily:FD,fontSize:15,color:C.textDD,marginTop:8,fontStyle:"italic",animation:"rv .55s cubic-bezier(.16,1,.3,1) .22s both"}}>
            <Typewriter text="of Bhārata" delay={480} speed={62}/>
          </p>
        </div>
        <button className="t" aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{width:46,height:46,borderRadius:15,background:isDark?"rgba(255,255,255,0.05)":C.saffronDim,border:`1px solid ${isDark?C.div:C.saffronPale}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .3s cubic-bezier(.16,1,.3,1)",boxShadow:isDark?"none":`0 4px 16px ${C.saffronDim}`}}>
          {isDark
            ? <svg width="19" height="19" fill="none" stroke="rgba(255,220,100,0.85)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            : <svg width="19" height="19" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          }
        </button>
      </div>

      {/* OM SYMBOL — Central sacred focal point */}
      <div style={{position:"relative",textAlign:"center",marginBottom:24,paddingTop:8}} aria-hidden="true">
        {/* Expanding pulse rings */}
        {[0,1,2].map(i => (
          <div key={i} aria-hidden="true" style={{position:"absolute",top:"50%",left:"50%",width:190,height:190,borderRadius:"50%",border:`1.5px solid rgba(212,133,60,0.18)`,transform:"translate(-50%,-50%)",animation:`ringExpand 3.6s ease-out infinite ${i*1.2}s`,pointerEvents:"none"}}/>
        ))}
        {/* Slow spinning golden dashed halo */}
        <div style={{position:"absolute",top:"50%",left:"50%",width:240,height:240,borderRadius:"50%",border:"1px dashed rgba(212,133,60,0.18)",transform:"translate(-50%,-50%)",animation:"omHaloSpin 28s linear infinite",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:"50%",left:"50%",width:210,height:210,borderRadius:"50%",border:"1px dashed rgba(240,192,96,0.12)",transform:"translate(-50%,-50%)",animation:"omHaloSpin 18s linear infinite reverse",pointerEvents:"none"}}/>
        {/* Static concentric rings */}
        {[220,168,116].map((r,i) => (
          <div key={i} style={{position:"absolute",top:"50%",left:"50%",width:r,height:r,borderRadius:"50%",border:`1px solid rgba(212,133,60,${0.04+i*0.04})`,transform:"translate(-50%,-50%)",animation:`breathe ${7+i*2}s ease-in-out infinite ${i*.6}s`,pointerEvents:"none"}}/>
        ))}
        {/* Sunburst rays */}
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-52%)",pointerEvents:"none",zIndex:1,animation:"omHaloSpin 60s linear infinite"}}>
          <svg width={220} height={220} viewBox="0 0 220 220" style={{opacity:0.09}}>
            {Array.from({length:24},(_,i)=>{const a=(i*15)*Math.PI/180;return<line key={i} x1="110" y1="110" x2={110+104*Math.cos(a)} y2={110+104*Math.sin(a)} stroke="#F0C060" strokeWidth="2"/>;})}
          </svg>
        </div>
        {/* Deep radial glow behind OM — intensifies during chant */}
        <div style={{position:"absolute",top:"50%",left:"50%",width:playing?200:170,height:playing?200:170,borderRadius:"50%",background:`radial-gradient(circle,rgba(240,192,96,${playing?0.42:0.28}),rgba(212,133,60,${playing?0.18:0.10}) 50%,transparent 70%)`,transform:"translate(-50%,-50%)",filter:`blur(${playing?28:22}px)`,animation:"breathe 4s ease-in-out infinite",pointerEvents:"none",transition:"all 1.5s ease"}}/>

        {/* ═══ FLOWER & SPRINKLE LAYER 1 — Orbiting lotus petals (outer ring, slow) ═══ */}
        {[
          {emoji:"🌸",r:"118px",dur:"22s",op:0.72,delay:"0s"},
          {emoji:"🌺",r:"118px",dur:"22s",op:0.65,delay:"2.75s"},
          {emoji:"🌸",r:"118px",dur:"22s",op:0.70,delay:"5.5s"},
          {emoji:"🪷",r:"118px",dur:"22s",op:0.68,delay:"8.25s"},
          {emoji:"🌼",r:"118px",dur:"22s",op:0.62,delay:"11s"},
          {emoji:"🌸",r:"118px",dur:"22s",op:0.70,delay:"13.75s"},
          {emoji:"🌺",r:"118px",dur:"22s",op:0.65,delay:"16.5s"},
          {emoji:"🪷",r:"118px",dur:"22s",op:0.72,delay:"19.25s"},
        ].map((p,i) => (
          <div key={`po1-${i}`} style={{
            position:"absolute",top:"50%",left:"50%",fontSize:14,lineHeight:1,
            pointerEvents:"none",zIndex:2,
            "--po-r":p.r,"--po-op":p.op,
            animation:`petalOrbit ${p.dur} linear infinite ${p.delay}`,
          }}>{p.emoji}</div>
        ))}

        {/* ═══ FLOWER & SPRINKLE LAYER 2 — Orbiting marigold petals (inner ring, faster) ═══ */}
        {[
          {emoji:"🌼",r:"82px",dur:"14s",op:0.58,delay:"0s"},
          {emoji:"✿",r:"82px",dur:"14s",op:0.55,delay:"2.33s"},
          {emoji:"🌼",r:"82px",dur:"14s",op:0.60,delay:"4.66s"},
          {emoji:"❀",r:"82px",dur:"14s",op:0.55,delay:"6.99s"},
          {emoji:"🌼",r:"82px",dur:"14s",op:0.58,delay:"9.32s"},
          {emoji:"✿",r:"82px",dur:"14s",op:0.52,delay:"11.65s"},
        ].map((p,i) => (
          <div key={`po2-${i}`} style={{
            position:"absolute",top:"50%",left:"50%",fontSize:11,lineHeight:1,
            pointerEvents:"none",zIndex:2,color:"rgba(240,192,96,0.85)",fontWeight:"bold",
            "--po-r":p.r,"--po-op":p.op,
            animation:`petalOrbit ${p.dur} linear infinite reverse ${p.delay}`,
          }}>{p.emoji}</div>
        ))}

        {/* ═══ FLOWER & SPRINKLE LAYER 3 — Rising floating petals (drift upward) ═══ */}
        {[
          {emoji:"🌸",x:"-18px",r:"80deg",  dur:"6.8s",delay:"0s"},
          {emoji:"🌺",x:"22px", r:"-65deg", dur:"8.2s",delay:"1.1s"},
          {emoji:"🌼",x:"-8px", r:"110deg", dur:"7.4s",delay:"2.3s"},
          {emoji:"🪷",x:"14px", r:"-95deg", dur:"9.0s",delay:"3.5s"},
          {emoji:"🌸",x:"-24px",r:"55deg",  dur:"6.2s",delay:"4.6s"},
          {emoji:"🌼",x:"10px", r:"-130deg",dur:"7.8s",delay:"5.7s"},
        ].map((p,i) => (
          <div key={`pf-${i}`} style={{
            position:"absolute",top:"50%",left:"50%",fontSize:13,lineHeight:1,
            pointerEvents:"none",zIndex:2,
            "--pf-x":p.x,"--pf-r":p.r,
            animation:`petalFloat ${p.dur} ease-out infinite ${p.delay}`,
          }}>{p.emoji}</div>
        ))}

        {/* ═══ FLOWER & SPRINKLE LAYER 4 — Twinkling sparkle dots at fixed positions ═══ */}
        {[
          {deg:"0deg",  r:"136px",dur:"2.2s",delay:"0s",   col:"rgba(255,220,100,0.9)"},
          {deg:"30deg", r:"142px",dur:"3.1s",delay:".4s",  col:"rgba(212,133,60,0.85)"},
          {deg:"60deg", r:"130px",dur:"2.6s",delay:".8s",  col:"rgba(255,200,80,0.9)"},
          {deg:"90deg", r:"140px",dur:"1.9s",delay:"1.2s", col:"rgba(196,162,78,0.9)"},
          {deg:"120deg",r:"136px",dur:"2.8s",delay:".2s",  col:"rgba(255,220,100,0.85)"},
          {deg:"150deg",r:"138px",dur:"2.4s",delay:".6s",  col:"rgba(212,133,60,0.9)"},
          {deg:"180deg",r:"132px",dur:"3.0s",delay:"1.0s", col:"rgba(255,200,80,0.85)"},
          {deg:"210deg",r:"142px",dur:"2.1s",delay:"1.4s", col:"rgba(196,162,78,0.9)"},
          {deg:"240deg",r:"136px",dur:"2.7s",delay:".3s",  col:"rgba(255,220,100,0.9)"},
          {deg:"270deg",r:"140px",dur:"1.8s",delay:".7s",  col:"rgba(212,133,60,0.85)"},
          {deg:"300deg",r:"134px",dur:"2.9s",delay:"1.1s", col:"rgba(255,200,80,0.9)"},
          {deg:"330deg",r:"138px",dur:"2.3s",delay:".5s",  col:"rgba(196,162,78,0.85)"},
        ].map((s,i) => (
          <div key={`pt-${i}`} style={{
            position:"absolute",top:"50%",left:"50%",
            width:i%3===0?5:i%3===1?4:3,
            height:i%3===0?5:i%3===1?4:3,
            borderRadius:"50%",background:s.col,
            pointerEvents:"none",zIndex:2,
            boxShadow:`0 0 6px ${s.col}`,
            "--pt-deg":s.deg,"--pt-r":s.r,
            animation:`petalTwinkle ${s.dur} ease-in-out infinite ${s.delay}`,
          }}/>
        ))}

        {/* ═══ FLOWER & SPRINKLE LAYER 5 — SVG lotus mandala petals (outermost, ultra-slow spin) ═══ */}
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:1,animation:"omHaloSpin 45s linear infinite reverse",opacity:0.22}}>
          <svg width={290} height={290} viewBox="0 0 290 290">
            {Array.from({length:16},(_,i) => {
              const a = (i*22.5)*Math.PI/180;
              const r1=128, r2=142, r3=115;
              const x1=145+r1*Math.cos(a), y1=145+r1*Math.sin(a);
              const x2=145+r2*Math.cos(a+0.12), y2=145+r2*Math.sin(a+0.12);
              const x3=145+r3*Math.cos(a+0.22), y3=145+r3*Math.sin(a+0.22);
              return <path key={i} d={`M145,145 Q${x2},${y2} ${x1},${y1} Q${x2+2},${y2+2} ${x3},${y3} Z`} fill="rgba(212,133,60,0.6)" stroke="none"/>;
            })}
          </svg>
        </div>

        {/* OM glyph */}
        <OmSymbol size={168} />
        {/* Om chant button */}
        <div style={{position:"absolute",bottom:-14,left:"50%",transform:"translateX(-50%)",zIndex:3}}>
          <button className="t" onClick={toggle} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 22px",borderRadius:100,background:playing?"rgba(212,133,60,0.9)":"rgba(212,133,60,0.12)",border:`1.5px solid ${playing?C.saffron:"rgba(212,133,60,0.3)"}`,cursor:"pointer",backdropFilter:"blur(12px)",transition:"all .3s cubic-bezier(.16,1,.3,1)",boxShadow:playing?`0 4px 28px rgba(212,133,60,0.4)`:"none"}}>
            {/* Sound wave bars */}
            <div style={{display:"flex",alignItems:"center",gap:2,height:14}}>
              {[1,1.8,1.3,2,1.5,1.1,1.7].map((h,i) => (
                <div key={i} style={{width:2.5,borderRadius:2,background:playing?"#fff":C.saffron,height:`${h*6}px`,animation:playing?`soundWave 1.1s ease-in-out infinite ${i*.12}s`:"none",opacity:playing?1:.7}}/>
              ))}
            </div>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:.8,color:playing?"#fff":C.saffron,textTransform:"uppercase"}}>{playing?"Chanting…":"Chant Om"}</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="t" onClick={() => nav("search")} style={{padding:"15px 20px",borderRadius:18,background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",display:"flex",alignItems:"center",gap:14,border:`1px solid ${C.div}`,cursor:"pointer",position:"relative",zIndex:2,marginTop:26}}>
        <span style={{fontSize:16,color:C.textDD}}>⌕</span>
        <span style={{flex:1,fontSize:14,color:C.textDD}}>Search temples, deities, places…</span>
      </div>

      {/* Stats — count-up animation on mount */}
      <div ref={statsRef} style={{display:"flex",justifyContent:"center",gap:0,marginTop:28,position:"relative",zIndex:2}}>
        {[
          {val:templesCount, suffix:"+", l:"Temples"},
          {val:statesCount,  suffix:"",  l:"States & UTs"},
          {val:deitiesCount, suffix:"",  l:"Deities"},
        ].map((s,i) => (
          <div key={s.l} style={{textAlign:"center",flex:1,padding:"14px 0",borderRadius:16,position:"relative"}}>
            {i > 0 && <div style={{position:"absolute",left:0,top:"20%",bottom:"20%",width:1,background:C.divL}}/>}
            <div style={{fontFamily:FD,fontSize:24,fontWeight:500,color:C.saffron,textShadow:`0 0 20px rgba(212,133,60,0.3)`,animation:"countUp .6s ease both",animationDelay:`${i*.12}s`}}>
              {s.val.toLocaleString()}{s.suffix}
            </div>
            <div style={{fontSize:9,color:C.textDD,fontWeight:700,letterSpacing:1.2,marginTop:5,textTransform:"uppercase"}}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>

    {/* DAILY SHLOKA */}
    <Reveal delay={0.05}><ShlokaWidget/></Reveal>

    {/* DEITIES */}
    <div style={{marginTop:38}}>
      <SH title="Sacred Deities" sub="Explore by divine presence" d={.1}/>
      <div style={{display:"flex",gap:14,overflowX:"auto",padding:"0 24px 8px",scrollSnapType:"x mandatory"}}>
        {DEITIES.map((d,i) => (
          <div key={d.name} className="t rv" onClick={() => nav("explore")} style={{minWidth:102,textAlign:"center",cursor:"pointer",animationDelay:`${.15+i*.08}s`,scrollSnapAlign:"start"}}>
            <div style={{width:82,height:82,borderRadius:26,margin:"0 auto 12px",position:"relative",overflow:"hidden",boxShadow:`0 8px 28px ${hsl(d.h,30,8,0.6)}, 0 0 0 1px ${hsl(d.h,30,20,0.18)}`}}>
              {!d.noPic && <TempleImage src={`https://source.unsplash.com/160x160/?${deityQuery(d.name)}&sig=${d.name}`} hue={d.h} style={{width:82,height:82}} omSize={22}/>}
              {d.noPic && <div style={{position:"absolute",inset:0,background:`linear-gradient(165deg,${hsl(d.h,40,16)},${hsl(d.h,50,4)})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,opacity:0.4}}>{d.icon}</div>}
              {/* gradient + sanskrit overlay */}
              <div style={{position:"absolute",inset:0,background:`linear-gradient(transparent 35%,rgba(0,0,0,0.72))`}}/>
              <div style={{position:"absolute",bottom:5,left:0,right:0,textAlign:"center",fontFamily:FD,fontSize:13,color:"rgba(255,255,255,0.92)",lineHeight:1,letterSpacing:.3}}>{d.sk}</div>
            </div>
            <div style={{fontSize:12.5,fontWeight:700,color:C.creamM,letterSpacing:.2}}>{d.name}</div>
            <div style={{fontSize:10,color:C.textD,marginTop:3}}>{d.n.toLocaleString()} temples</div>
          </div>
        ))}
      </div>
    </div>

    {/* FEATURED */}
    <div style={{marginTop:40}}>
      <SH title="Featured Temples" sub="Handpicked sacred destinations" act="See all" onAct={() => nav("explore")} d={.25}/>
      {loading
        ? <div style={{display:"flex",gap:18,overflowX:"auto",padding:"0 24px 14px"}}>{[0,1,2].map(i => <SkeletonCard key={i}/>)}</div>
        : <CardCarousel items={temples.slice(0,6)} renderCard={(t,i) => <FCard t={t} onClick={oT} onFav={oF} d={.3+i*.08}/>}/>}
    </div>

    {/* SACRED CIRCUITS — count-up strip */}
    <SacredCircuits nav={nav} isDark={isDark}/>

    {/* DISCOVER MODE ENTRY */}
    <div className="rv t" onClick={() => nav("discover")} style={{margin:"32px 24px 0",borderRadius:26,overflow:"hidden",position:"relative",height:158,cursor:"pointer",animationDelay:".35s",boxShadow:`0 12px 48px rgba(0,0,0,0.18)`}}>
      <div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,${hsl(28,55,14)},${hsl(350,45,10)})`}}/>
      <div style={{position:"absolute",top:"-15%",right:"-8%",width:220,height:220,borderRadius:"50%",background:"radial-gradient(circle,rgba(212,133,60,0.08),transparent 60%)",filter:"blur(40px)",animation:"breathe 9s ease-in-out infinite",pointerEvents:"none"}}/>
      {/* Animated card deck hint */}
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-58%)",display:"flex",alignItems:"center",gap:14}}>
        {[{deg:-14,opacity:.3},{deg:-6,opacity:.55},{deg:0,opacity:1}].map((c,i) => (
          <div key={i} style={{position:"absolute",left:"50%",width:44,height:60,borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.04)",transform:`translateX(-50%) rotate(${c.deg}deg)`,opacity:c.opacity,animation:i===2?"drift 4s ease-in-out infinite":"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"rgba(212,133,60,0.4)"}}>ॐ</div>
        ))}
      </div>
      <div style={{position:"absolute",inset:0,padding:"0 22px 22px",display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"linear-gradient(transparent 25%,rgba(0,0,0,0.6))"}}>
        <div style={{fontSize:9,color:"rgba(212,133,60,0.6)",fontWeight:800,letterSpacing:3,textTransform:"uppercase",marginBottom:7}}>New Mode</div>
        <h3 style={{fontFamily:FD,fontSize:23,fontWeight:500,color:"#fff",lineHeight:1.1,marginBottom:4}}>Discover Temples</h3>
        <p style={{fontSize:12,color:"rgba(255,255,255,0.35)",lineHeight:1.5}}>Swipe through sacred temples — save what calls to you</p>
      </div>
      <div style={{position:"absolute",top:20,right:20,width:38,height:38,borderRadius:12,background:"rgba(212,133,60,0.12)",border:"1px solid rgba(212,133,60,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:C.saffron}}>→</div>
    </div>

    {/* BY STATE — shows top 8 + "See all 36" */}
    <Reveal delay={0}>
    <div style={{marginTop:42}}>
      <SH title="By State" sub={`All 28 states · 8 UTs covered`} act="All 36 →" onAct={() => nav("stateBrowse")} d={.4}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"0 24px"}}>
        {STATES.slice(0,8).map((s,i) => (
          <div key={s.name} className="t rv" onClick={() => nav("stateBrowse")} style={{padding:"18px 16px",borderRadius:18,cursor:"pointer",background:`linear-gradient(135deg,${hsl(s.h,35,isDark?13:90)},${C.card})`,border:`1px solid ${C.div}`,borderTop:`2.5px solid ${hsl(s.h,40,isDark?35:60,0.45)}`,position:"relative",overflow:"hidden",animationDelay:`${.45+i*.05}s`}}>
            <div style={{width:9,height:9,borderRadius:4,background:`linear-gradient(135deg,${hsl(s.h,60,55)},${hsl(s.h,50,40)})`,marginBottom:10}}/>
            <div style={{fontFamily:FE,fontSize:16,fontWeight:500,color:C.creamM,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
            <div style={{fontSize:11,color:C.textM,marginTop:4}}>{s.n.toLocaleString()} temples</div>
          </div>
        ))}
      </div>
      {/* "Show all" pill */}
      <button className="t" onClick={() => nav("stateBrowse")} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,margin:"14px 24px 0",width:"calc(100% - 48px)",padding:"13px 20px",borderRadius:14,background:C.saffronDim,border:`1px solid rgba(212,133,60,0.18)`,cursor:"pointer",fontSize:12.5,fontWeight:700,color:C.saffron,letterSpacing:.4}}>
        View all 36 States & Union Territories
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>
    </Reveal>

    {/* LIVE PANCHĀṄGAM */}
    <Reveal delay={0}><LivePanchangam/></Reveal>

    {/* PILGRIMAGE CIRCUIT */}
    <Reveal delay={0.05}><PilgrimageCard onNav={nav}/></Reveal>

    {/* ━━━ SACRED PREMIUM TEASER ━━━ */}
    <Reveal delay={0.05} style={{margin:"42px 24px 0"}}>
      <div style={{borderRadius:28,overflow:"hidden",position:"relative",background:`linear-gradient(140deg,${hsl(42,55,10)},${hsl(28,65,7)},${hsl(355,40,10)})`}}>
        {/* Premium diagonal gold sheen sweep — pauses between passes */}
        <div style={{position:"absolute",top:0,left:"-110%",width:"50%",height:"100%",background:"linear-gradient(105deg,transparent,rgba(196,162,78,0.11),transparent)",animation:"premiumSheen 5s ease-in-out infinite",pointerEvents:"none"}}/>
        {/* Radial ambient */}
        <div style={{position:"absolute",top:"-20%",right:"-5%",width:220,height:220,borderRadius:"50%",background:"radial-gradient(circle,rgba(196,162,78,0.1),transparent 60%)",filter:"blur(40px)",animation:"breathe 7s ease-in-out infinite",pointerEvents:"none"}}/>
        <div style={{padding:"26px 22px 24px"}}>
          {/* Badge + title */}
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:99,background:"rgba(196,162,78,0.14)",border:"1px solid rgba(196,162,78,0.28)",marginBottom:12}}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="rgba(196,162,78,0.9)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span style={{fontSize:8.5,fontWeight:800,letterSpacing:1.8,color:"rgba(196,162,78,0.9)",textTransform:"uppercase"}}>Sacred Premium</span>
              </div>
              <h3 style={{fontFamily:FD,fontSize:22,color:"rgba(255,242,210,0.95)",fontWeight:500,lineHeight:1.2}}>Unlock the Full<br/>Sacred Journey</h3>
              <p style={{fontSize:12,color:"rgba(255,220,150,0.35)",marginTop:8,lineHeight:1.7}}>Deeper access to India's living heritage</p>
            </div>
            <div style={{width:50,height:50,borderRadius:16,background:"rgba(196,162,78,0.09)",border:"1px solid rgba(196,162,78,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="22" height="22" fill="none" stroke="rgba(196,162,78,0.75)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
          </div>
          {/* Feature 2×2 grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:20}}>
            {[
              {icon:<svg width="13" height="13" fill="none" stroke="rgba(196,162,78,0.65)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>, l:"Audio Guides", s:"Expert narrations"},
              {icon:<svg width="13" height="13" fill="none" stroke="rgba(196,162,78,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>, l:"Pilgrimage Planner", s:"Char Dham & circuits"},
              {icon:<svg width="13" height="13" fill="none" stroke="rgba(196,162,78,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, l:"Offline Maps", s:"Navigate anywhere"},
              {icon:<svg width="13" height="13" fill="none" stroke="rgba(196,162,78,0.65)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, l:"Festival Alerts", s:"Never miss darshan"},
            ].map(f => (
              <div key={f.l} style={{padding:"13px 13px",borderRadius:15,background:"rgba(255,255,255,0.025)",border:"1px solid rgba(196,162,78,0.1)"}}>
                <div style={{marginBottom:7}}>{f.icon}</div>
                <div style={{fontSize:11.5,fontWeight:700,color:"rgba(255,240,180,0.78)",marginBottom:3,lineHeight:1.2}}>{f.l}</div>
                <div style={{fontSize:10,color:"rgba(255,220,140,0.3)",lineHeight:1.4}}>{f.s}</div>
              </div>
            ))}
          </div>
          {/* CTA row */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderRadius:18,background:"rgba(196,162,78,0.09)",border:"1px solid rgba(196,162,78,0.22)"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"rgba(255,242,200,0.88)"}}>Coming Soon</div>
              <div style={{fontSize:10.5,color:"rgba(255,215,140,0.38)",marginTop:3}}>Be first when it launches</div>
            </div>
            <div onClick={notified ? undefined : onNotify} style={{padding:"9px 18px",borderRadius:13,background:notified?"rgba(60,180,60,0.12)":"rgba(196,162,78,0.16)",border:`1px solid ${notified?"rgba(60,200,60,0.3)":"rgba(196,162,78,0.32)"}`,fontSize:11,fontWeight:700,color:notified?"rgba(100,220,100,0.9)":"rgba(196,162,78,0.88)",letterSpacing:.5,cursor:notified?"default":"pointer",whiteSpace:"nowrap",transition:"all .3s"}}>{notified?"✓ Noted!":"Notify Me →"}</div>
          </div>
        </div>
      </div>
    </Reveal>

    {/* RECENTLY VIEWED */}
    {recentIds.length > 0 && (() => {
      const recent = recentIds.map(id => temples.find(t => t.id === id)).filter(Boolean);
      return recent.length > 0 ? (
        <div style={{marginTop:40}}>
          <SH title="Continue Exploring" sub="Recently visited temples" d={.52}/>
          <CardCarousel items={recent} renderCard={(t,i) => <FCard t={t} onClick={oT} onFav={oF} d={.54+i*.08}/>}/>
        </div>
      ) : null;
    })()}

    {/* NEARBY */}
    <div style={{marginTop:42}}>
      <SH title="Near You" act="Map" onAct={() => nav("nearby")} d={.55}/>
      {loading
        ? [0,1].map(i => <SkeletonListCard key={i}/>)
        : temples.slice(0,2).map((t,i) => <LCard key={t.id} t={t} onClick={oT} onFav={oF} d={.6+i*.08}/>)}
    </div>

    {/* SAVED — only show when non-empty */}
    {temples.filter(x => x.isFavorite).length > 0 && (
      <div style={{marginTop:32,marginBottom:16}}>
        <SH title="Saved" act="All" onAct={() => nav("saved")} d={.7}/>
        <CardCarousel items={temples.filter(x => x.isFavorite)} renderCard={(t,i) => <FCard t={t} onClick={oT} onFav={oF} d={.75+i*.08}/>}/>
      </div>
    )}

    {/* Footer verse */}
    <div style={{padding:"56px 40px 24px",textAlign:"center",position:"relative"}}>
      <div style={{width:48,height:1,background:`linear-gradient(90deg,transparent,rgba(196,162,78,0.3),transparent)`,margin:"0 auto 24px"}}/>
      <div style={{fontFamily:FD,fontSize:16,color:C.textD,fontStyle:"italic",lineHeight:1.85,letterSpacing:.2,textShadow:playing?`0 0 20px rgba(196,162,78,0.12)`:"none",transition:"text-shadow 1.5s ease"}}>
        "Where the temple bell resonates,<br/>the divine presence abides."
      </div>
      <div style={{marginTop:20,fontSize:9,color:C.textDD,fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}>Sacred Temples of Bhārata</div>
      <button className="t" onClick={() => nav("about")} style={{marginTop:16,padding:"8px 22px",borderRadius:99,background:C.saffronDim,border:`1px solid rgba(212,133,60,0.18)`,cursor:"pointer",fontSize:11,fontWeight:700,color:C.saffron,letterSpacing:.8,textTransform:"uppercase",fontFamily:FB}}>About this App</button>
      <div style={{width:48,height:1,background:`linear-gradient(90deg,transparent,rgba(196,162,78,0.3),transparent)`,margin:"20px auto 0"}}/>
    </div>
  </div>
  );
};

const Explore = ({nav, oT, oF, temples, loading, isDark, onToggleTheme}) => {
  const [v, setV] = useState("list");
  const [fl, setFl] = useState([]);
  const [sortBy, setSortBy] = useState("default");
  const opts = ["All","Shiva","Vishnu","Devi","Ganesha","Jyotirlinga","Heritage"];
  const sorts = ["default","a–z","z–a","state"];
  const sortLabels = {default:"Default","a–z":"A → Z","z–a":"Z → A",state:"By State"};
  const tg = f => { if (f === "All") { setFl([]); return; } setFl(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]); };
  const cycleSort = () => { const i = sorts.indexOf(sortBy); setSortBy(sorts[(i+1)%sorts.length]); };
  const filtered = temples.filter(t => fl.length === 0 || fl.some(f => {
    if (f === "Jyotirlinga") return (t.architectureStyle||"").toLowerCase().includes("jyotirlinga") || (t.specialNotes||"").toLowerCase().includes("jyotirlinga");
    if (f === "Heritage") return (t.architectureStyle||"").toLowerCase().includes("heritage") || (t.architectureStyle||"").toLowerCase().includes("dravidian");
    return (t.deityPrimary||"").toLowerCase().includes(f.toLowerCase());
  }));
  const sorted = [...filtered].sort((a,b) => {
    if (sortBy === "a–z") return a.templeName.localeCompare(b.templeName);
    if (sortBy === "z–a") return b.templeName.localeCompare(a.templeName);
    if (sortBy === "state") return (a.stateOrUnionTerritory||"").localeCompare(b.stateOrUnionTerritory||"");
    return 0;
  });
  return (
    <div className="fi" style={{paddingBottom:24}}>
      <div style={{padding:"22px 24px 16px",display:"flex",alignItems:"center",gap:10}}>
        <h1 style={{fontFamily:FD,fontSize:30,fontWeight:500,flex:1,color:C.cream}}>Explore</h1>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {["grid","list"].map(m => (
            <button key={m} className="t" onClick={() => setV(m)} style={{width:40,height:40,borderRadius:12,border:v===m?`2px solid ${C.saffron}`:`1px solid ${C.div}`,background:v===m?C.saffronDim:C.card,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:v===m?C.saffron:C.textD}}>
              {m === "grid" ? "▦" : "☰"}
            </button>
          ))}
          <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
        </div>
      </div>
      <div className="t" role="button" aria-label="Search temples" tabIndex={0} onClick={() => nav("search")} onKeyDown={e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); nav("search"); } }} style={{margin:"0 24px",padding:"13px 18px",borderRadius:16,background:C.card,display:"flex",alignItems:"center",gap:12,border:`1px solid ${C.div}`,cursor:"pointer"}}>
        <span style={{fontSize:15,color:C.textDD}} aria-hidden="true">⌕</span><span style={{flex:1,fontSize:14,color:C.textD}}>Search temples…</span>
      </div>
      <div style={{position:"sticky",top:0,zIndex:50,background:C.glass,backdropFilter:"blur(20px)",padding:"14px 0 12px",borderBottom:`1px solid ${C.divL}`}}>
        <div style={{display:"flex",gap:8,overflowX:"auto",padding:"0 24px"}}>{opts.map(f => <Chip key={f} label={f} active={f === "All" ? fl.length === 0 : fl.includes(f)} onClick={() => tg(f)}/>)}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 24px 0"}}>
          <span style={{fontSize:12,color:C.textD}}>{sorted.length} temples{fl.length>0?" · filtered":""}</span>
          <button className="t" aria-label={`Sort by: ${sortLabels[sortBy]}`} onClick={cycleSort} style={{background:sortBy!=="default"?C.saffronDim:C.card,border:`1px solid ${sortBy!=="default"?"rgba(212,133,60,0.3)":C.div}`,padding:"6px 13px",borderRadius:10,fontSize:11,color:sortBy!=="default"?C.saffron:C.textD,fontWeight:700,cursor:"pointer",fontFamily:FB,display:"flex",alignItems:"center",gap:5}}>
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
            {sortLabels[sortBy]}
          </button>
        </div>
      </div>
      <div style={{paddingTop:16}}>
        {loading ? (
          v === "list"
            ? [0,1,2,3,4,5].map(i => <SkeletonListCard key={i}/>)
            : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,padding:"0 24px"}}>
                {[0,1,2,3,4,5].map(i => <div key={i} style={{borderRadius:20,height:250,background:C.card,border:`1px solid ${C.div}`,overflow:"hidden"}}><div style={{height:"100%",background:skelBg(true),backgroundSize:'800px 100%',animation:`skeletonShimmer 1.6s ease-in-out infinite ${i*.1}s`}}/></div>)}
              </div>
        ) : sorted.length === 0 ? <Empty emoji="🏛" title="No Temples Found" sub="Try removing a filter or changing your sort order."/> :
        v === "list" ? sorted.map((t,i) => <LCard key={t.id} t={t} onClick={oT} onFav={oF} d={i*.04}/>) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,padding:"0 24px"}}>
            {sorted.map((t,i) => (
              <div key={t.id} className="t rv" onClick={() => oT(t)} style={{borderRadius:20,overflow:"hidden",height:250,position:"relative",cursor:"pointer",boxShadow:`0 8px 32px ${hsl(t.hue,30,5,0.4)}`,animationDelay:`${i*.05}s`}}>
                <TempleImage src={`https://source.unsplash.com/500x350/?${deityQuery(t.deityPrimary)}&sig=${t.id}`} hue={t.hue} style={{position:"absolute",inset:0,width:"100%",height:"100%"}} omSize={44}/>
                <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"70px 14px 16px",background:"linear-gradient(transparent,rgba(0,0,0,0.88))"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",fontWeight:700,marginBottom:5,letterSpacing:.5}}>{t.deityPrimary}</div>
                  <h3 style={{fontFamily:FD,fontSize:15.5,fontWeight:500,color:"#fff",lineHeight:1.2}}>{t.templeName}</h3>
                  <div style={{marginTop:5,fontSize:11,color:"rgba(255,255,255,0.32)",display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:3,height:3,borderRadius:"50%",background:"rgba(255,255,255,0.2)"}}/>{t.townOrCity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Detail = ({temple: t, onBack, isDark, onToggleTheme, oF, nav}) => {
  const [sv, setSv] = useState(t.isFavorite);
  const [tab, setTab] = useState("overview");
  const [tabKey, setTabKey] = useState(0);
  const switchTab = (tb) => { setTab(tb); setTabKey(k => k+1); };
  const [shared, setShared] = useState(false);
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const sentinelRef = useRef(null);
  useEffect(() => {
    setHeroCollapsed(false);
    const obs = new IntersectionObserver(([e]) => setHeroCollapsed(!e.isIntersecting), {threshold: 0, rootMargin: '-60px 0px 0px 0px'});
    const el = sentinelRef.current;
    if (el) obs.observe(el);
    return () => obs.disconnect();
  }, [t.id]);
  const doShare = () => {
    const text = `${t.templeName} — ${t.townOrCity}, ${t.stateOrUnionTerritory}`;
    if (navigator.share) {
      navigator.share({title: t.templeName, text, url: window.location.href}).catch(()=>{});
    } else {
      try { navigator.clipboard.writeText(text); } catch(e) {}
    }
    setShared(true);
    setTimeout(() => setShared(false), 2200);
  };
  const b3 = hsl(t.hue,50,3);
  const imgSrc = `https://source.unsplash.com/860x520/?${deityQuery(t.deityPrimary)}&sig=${t.id}`;
  const [px, py] = useParallax();
  return (
    <div className="fi" style={{paddingBottom:44}}>
      {/* Scroll-linked collapsing hero */}
      <div style={{height: heroCollapsed ? 240 : 390, position:"relative",overflow:"hidden",transition:'height 0.42s cubic-bezier(.16,1,.3,1)'}}>
        {/* Cinematic hero image with gyroscope parallax depth */}
        <TempleImage src={imgSrc} hue={t.hue} style={{position:"absolute",inset:0,width:"100%",height:"100%"}} omSize={80} px={px} py={py}/>
        {/* Gradient overlays: top dim for buttons, bottom for text legibility */}
        <div style={{position:"absolute",inset:0,background:`linear-gradient(180deg,rgba(0,0,0,0.35) 0%,transparent 35%,rgba(0,0,0,0.1) 55%,${b3} 100%)`}}/>
        {/* Mini-header fades in when hero collapses */}
        {heroCollapsed && (
          <div className="fi" style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 80px",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(transparent,${b3} 70%)`,zIndex:4,animationDuration:'0.2s'}}>
            <span style={{fontFamily:FD,fontSize:17,fontWeight:500,color:"#fff",textAlign:"center",lineHeight:1.2,textShadow:"0 1px 8px rgba(0,0,0,0.6)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{t.templeName}</span>
          </div>
        )}
        <div style={{position:"absolute",top:18,left:18,right:18,display:"flex",justifyContent:"space-between",zIndex:5}}>
          <BackBtn onClick={onBack} glass/>
          <div style={{display:"flex",gap:8}}>
            {/* Theme toggle — glass style to match photo overlay */}
            <button className="t" onClick={onToggleTheme} style={{width:46,height:46,borderRadius:15,background:"rgba(0,0,0,0.35)",backdropFilter:"blur(14px)",border:"1px solid rgba(255,255,255,0.12)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {isDark
                ? <svg width="17" height="17" fill="none" stroke="rgba(255,220,100,0.85)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                : <svg width="17" height="17" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
            <button className="t" onClick={doShare} title="Share temple" style={{width:46,height:46,borderRadius:15,background:shared?"rgba(60,160,60,0.7)":"rgba(0,0,0,0.35)",backdropFilter:"blur(14px)",border:`1px solid ${shared?"rgba(60,200,60,0.35)":"rgba(255,255,255,0.12)"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:shared?"#fff":"rgba(255,255,255,0.7)",transition:"all .3s"}}>{shared?"✓":"↗"}</button>
            <button className="t" onClick={() => { setSv(v => { oF?.(t.id, v); return !v; }); }} style={{width:46,height:46,borderRadius:15,background:sv?"rgba(196,64,64,0.85)":"rgba(0,0,0,0.35)",backdropFilter:"blur(14px)",border:`1px solid ${sv?"rgba(196,64,64,0.4)":"rgba(255,255,255,0.12)"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,color:"#fff",boxShadow:sv?"0 4px 20px rgba(196,64,64,0.3)":"none",transition:"all .3s"}}>{sv?"♥":"♡"}</button>
          </div>
        </div>
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"130px 24px 26px",background:`linear-gradient(transparent,rgba(0,0,0,0.6) 30%,${b3} 100%)`}}>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 15px",borderRadius:100,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.1)"}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:"#E69A52",boxShadow:"0 0 8px rgba(212,133,60,0.8)"}}/><span style={{fontSize:11,color:"rgba(255,255,255,0.9)",fontWeight:700,letterSpacing:.6}}>{t.deityPrimary}</span>
            </div>
            {t.deitySecondary && <div style={{padding:"5px 13px",borderRadius:100,background:"rgba(0,0,0,0.3)",backdropFilter:"blur(6px)",fontSize:11,color:"rgba(255,255,255,0.45)"}}>{t.deitySecondary}</div>}
          </div>
          <h1 style={{fontFamily:FD,fontSize:32,fontWeight:500,color:"#fff",lineHeight:1.1,textShadow:"0 2px 16px rgba(0,0,0,0.5)"}}>{t.templeName}</h1>
          <div style={{marginTop:10,fontSize:12.5,color:"rgba(255,255,255,0.4)",display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:4,height:4,borderRadius:"50%",background:"rgba(255,255,255,0.2)"}}/>{[t.village,t.townOrCity,t.district,t.stateOrUnionTerritory].filter(Boolean).join(" · ")}
          </div>
        </div>
        {/* Sentinel: when this exits viewport, hero collapses */}
        <div ref={sentinelRef} style={{position:"absolute",bottom:0,left:0,right:0,height:1,pointerEvents:"none"}}/>
      </div>
      <div role="tablist" aria-label="Temple information" style={{display:"flex",background:C.glass,backdropFilter:"blur(20px)",borderBottom:`1px solid ${C.divL}`,padding:"0 24px",position:"sticky",top:0,zIndex:50}}
        onKeyDown={(e) => {
          const tabs = ["overview","travel","visit","gallery"];
          const idx = tabs.indexOf(tab);
          let nextIdx = -1;
          if (e.key === 'ArrowRight') { e.preventDefault(); nextIdx = (idx+1) % tabs.length; }
          if (e.key === 'ArrowLeft') { e.preventDefault(); nextIdx = (idx-1+tabs.length) % tabs.length; }
          if (nextIdx >= 0) { switchTab(tabs[nextIdx]); e.currentTarget.querySelectorAll('[role="tab"]')[nextIdx]?.focus(); }
        }}>
        {["overview","travel","visit","gallery"].map(tb => (
          <button key={tb} role="tab" aria-selected={tab===tb} aria-controls={`tabpanel-${tb}`} tabIndex={tab===tb?0:-1} className="t" onClick={() => switchTab(tb)} style={{padding:"16px 14px",border:"none",background:"none",cursor:"pointer",fontSize:12.5,fontWeight:tab===tb?700:400,color:tab===tb?C.saffron:C.textD,fontFamily:FB,textTransform:"capitalize",letterSpacing:.4,borderBottom:`2.5px solid ${tab===tb?C.saffron:"transparent"}`,transition:"all .2s"}}>{tb}</button>
        ))}
      </div>
      <div role="tabpanel" id={`tabpanel-${tab}`} aria-label={tab} style={{padding:"10px 24px 0"}}>
        {tab === "overview" && <div key={tabKey} className="tabContent">
          {t.architectureStyle && <IR emoji="🏛" label="Architecture" value={t.architectureStyle}/>}
          <div style={{padding:"22px 0",borderBottom:`1px solid ${C.divL}`}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
              <div style={{width:44,height:44,borderRadius:14,background:C.saffronDim,border:`1px solid rgba(212,133,60,0.08)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>✦</div>
              <div style={{fontSize:9.5,color:C.textDD,fontWeight:700,textTransform:"uppercase",letterSpacing:2}}>Historical Significance</div>
            </div>
            <p style={{fontSize:17,color:C.creamM,lineHeight:1.95,fontFamily:FD,paddingLeft:58}}>{t.historicalSignificance}</p>
          </div>
          <IR emoji="🕐" label="Darshan Timings" value={t.darshanTimings}/>
          <IR emoji="🎪" label="Festivals" value={t.majorFestivals}/>
          {t.specialNotes && <div style={{margin:"22px 0",padding:20,borderRadius:18,background:C.goldDim,border:`1px solid rgba(196,162,78,0.08)`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{fontSize:14}}>📋</span><span style={{fontSize:9.5,fontWeight:800,color:C.gold,letterSpacing:1.2,textTransform:"uppercase"}}>Notes</span></div>
            <p style={{fontSize:13.5,color:C.creamD,lineHeight:1.8}}>{t.specialNotes}</p>
          </div>}
          {/* ── Premium Audio Guide teaser ── */}
          <div className="t" onClick={() => nav?.("audio")} style={{margin:"22px 0 8px",borderRadius:22,overflow:"hidden",position:"relative",border:"1px solid rgba(196,162,78,0.18)",cursor:"pointer"}}>
            <div style={{position:"absolute",inset:0,background:`linear-gradient(140deg,${hsl(42,55,10)},${hsl(28,65,7)})`,pointerEvents:"none"}}/>
            <div style={{position:"absolute",top:0,left:"-110%",width:"50%",height:"100%",background:"linear-gradient(105deg,transparent,rgba(196,162,78,0.10),transparent)",animation:"premiumSheen 4.5s ease-in-out infinite 1s",pointerEvents:"none"}}/>
            <div style={{position:"relative",padding:"18px 20px",display:"flex",alignItems:"center",gap:16}}>
              <div style={{width:52,height:52,borderRadius:16,background:"rgba(196,162,78,0.11)",border:"1px solid rgba(196,162,78,0.22)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="20" height="20" fill="none" stroke="rgba(196,162,78,0.75)" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                  <span style={{fontSize:13,fontWeight:700,color:"rgba(255,240,190,0.85)"}}>Audio Guide</span>
                  <div style={{padding:"2px 8px",borderRadius:99,background:"rgba(196,162,78,0.14)",border:"1px solid rgba(196,162,78,0.28)",fontSize:8,fontWeight:800,color:"rgba(196,162,78,0.88)",letterSpacing:1.4,textTransform:"uppercase"}}>Premium</div>
                </div>
                <div style={{fontSize:11,color:"rgba(255,215,140,0.38)",lineHeight:1.6}}>Expert narration · history, rituals &amp; significance · 12 min</div>
              </div>
              <div style={{width:40,height:40,borderRadius:13,background:"rgba(196,162,78,0.09)",border:"1px solid rgba(196,162,78,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="15" height="15" fill="none" stroke="rgba(196,162,78,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
            </div>
          </div>
          {/* ── Ask Sarathi ── */}
          <button className="t" onClick={() => nav?.("chat")} style={{width:"100%",marginTop:14,marginBottom:4,padding:"15px 20px",borderRadius:22,background:`linear-gradient(135deg,rgba(212,133,60,0.13),rgba(212,133,60,0.06))`,border:`1.5px solid rgba(212,133,60,0.28)`,cursor:"pointer",display:"flex",alignItems:"center",gap:14,textAlign:"left",position:"relative",overflow:"hidden"}}>
            <div style={{width:44,height:44,borderRadius:14,background:"rgba(212,133,60,0.14)",border:"1px solid rgba(212,133,60,0.22)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><OmSvg size={26}/></div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <span style={{fontSize:13.5,fontWeight:700,color:C.saffron,fontFamily:FD}}>Ask Sarathi</span>
                <span style={{fontSize:9,color:C.textDD,fontWeight:600,letterSpacing:1.2,textTransform:"uppercase",fontFamily:FB}}>सारथी</span>
              </div>
              <div style={{fontSize:11.5,color:C.textD,lineHeight:1.55}}>Temple history · routes · rituals · travel advice</div>
            </div>
            <svg width="16" height="16" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{flexShrink:0,opacity:.65}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>}
        {tab === "travel" && <div key={tabKey} className="tabContent">
          <IR emoji="📍" label="Nearest City" value={t.nearestCity}/>
          <IR emoji="🚂" label="Railway" value={t.nearestRailwayStation}/>
          <IR emoji="✈" label="Airport" value={t.nearestAirport}/>
          <div style={{padding:"22px 0",borderBottom:`1px solid ${C.divL}`}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
              <div style={{width:44,height:44,borderRadius:14,background:C.saffronDim,border:`1px solid rgba(212,133,60,0.08)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🧭</div>
              <div style={{fontSize:9.5,color:C.textDD,fontWeight:700,textTransform:"uppercase",letterSpacing:2}}>How to Get There</div>
            </div>
            <p style={{fontSize:14.5,color:C.creamM,lineHeight:1.8,paddingLeft:58}}>{t.routeSummary}</p>
          </div>
          <button className="t" onClick={() => t.latitude && t.longitude && window.open(`https://maps.google.com/maps?q=${t.latitude},${t.longitude}&z=15`,'_blank')} style={{width:"100%",marginTop:24,padding:16,borderRadius:18,background:C.saffron,color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FB,display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:"0 4px 24px rgba(212,133,60,0.3)"}}>🗺 Open in Maps</button>
          {(t.latitude || t.longitude) && (
            <div style={{marginTop:16,padding:16,borderRadius:16,background:C.bg3,textAlign:"center",border:`1px solid ${C.div}`}}>
              <span style={{fontSize:12,color:C.textD,letterSpacing:1,fontWeight:600}}>{t.latitude?.toFixed(4)}°N · {t.longitude?.toFixed(4)}°E</span>
            </div>
          )}
        </div>}
        {tab === "visit" && <div key={tabKey} className="tabContent">
          <div style={{padding:"18px 0",borderBottom:`1px solid ${C.divL}`}}>
            <div style={{fontSize:9.5,color:C.textDD,fontWeight:800,letterSpacing:2,textTransform:"uppercase",marginBottom:16}}>Visitor Checklist</div>
            {[
              {e:"👟",l:"Footwear",v:"Remove before entering the main sanctum"},
              {e:"👘",l:"Dress Code",v:"Modest attire — cover shoulders and legs"},
              {e:"🌸",l:"Offerings",v:"Flowers, fruits, or prasad as appropriate"},
              {e:"📱",l:"Photography",v:"Check temple rules — some areas prohibited"},
              {e:"🔕",l:"Mobile",v:"Keep on silent during darshan"},
              {e:"💳",l:"Entry Fee",v:"Verify ticket/donation requirements at gate"},
            ].map(c => (
              <div key={c.l} style={{display:"flex",gap:14,padding:"14px 0",borderBottom:`1px solid ${C.divL}`}}>
                <div style={{width:40,height:40,borderRadius:12,background:C.bg3,border:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{c.e}</div>
                <div><div style={{fontSize:13,color:C.cream,fontWeight:600,marginBottom:4}}>{c.l}</div><div style={{fontSize:12,color:C.textD,lineHeight:1.6}}>{c.v}</div></div>
              </div>
            ))}
          </div>
          <button className="t" style={{width:"100%",marginTop:24,padding:16,borderRadius:18,background:`linear-gradient(135deg,${C.saffron},${C.saffronH})`,color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FB,display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:"0 6px 28px rgba(212,133,60,0.35)"}}>
            ◎ Plan My Visit
          </button>
          <div style={{marginTop:12,textAlign:"center",fontSize:11.5,color:C.textDD,lineHeight:1.7}}>
            Best season: Oct – Feb · Avoid: Amavasya crowds
          </div>
        </div>}
        {tab === "gallery" && (
          <div key={tabKey} className="tabContent" style={{paddingTop:8}}>
            {/* Large hero shot */}
            <div style={{borderRadius:20,overflow:"hidden",height:240,position:"relative",marginBottom:8}}>
              <TempleImage src={`https://source.unsplash.com/800x480/?${deityQuery(t.deityPrimary)}&sig=${t.id}-g0`} hue={t.hue} style={{width:"100%",height:"100%"}} omSize={56}/>
            </div>
            {/* 2-col grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{borderRadius:16,overflow:"hidden",height:150,position:"relative"}}>
                  <TempleImage src={`https://source.unsplash.com/${380+i*10}x${300+i*12}/?${deityQuery(t.deityPrimary)}&sig=${t.id}-g${i}`} hue={t.hue} style={{width:"100%",height:"100%"}} omSize={32}/>
                </div>
              ))}
            </div>
            {/* Last wide shot */}
            <div style={{borderRadius:20,overflow:"hidden",height:180,position:"relative",marginTop:8}}>
              <TempleImage src={`https://source.unsplash.com/800x360/?${deityQuery(t.deityPrimary)}&sig=${t.id}-g5`} hue={t.hue} style={{width:"100%",height:"100%"}} omSize={44}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const POPULAR_SEARCHES = ["Jyotirlinga temples","Temples near Chennai","Devi temples Kerala","UNESCO heritage"];
const Search = ({oT, oF, onBack, temples}) => {
  const [q, setQ] = useState("");
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem('searchHistory')||'[]'); } catch { return []; } });
  const res = q ? temples.filter(t => [t.templeName,t.deityPrimary,t.townOrCity,t.district,t.stateOrUnionTerritory].some(f => f?.toLowerCase().includes(q.toLowerCase()))) : [];
  const saveHistory = (term) => {
    if (!term.trim()) return;
    const next = [term, ...history.filter(x => x !== term)].slice(0,5);
    setHistory(next);
    localStorage.setItem('searchHistory', JSON.stringify(next));
  };
  const doSearch = (term) => { setQ(term); saveHistory(term); };
  const clearHistory = () => { setHistory([]); localStorage.removeItem('searchHistory'); };
  return (
    <div className="fi" style={{minHeight:"100vh",background:C.bg}}>
      <div style={{padding:"16px 24px",display:"flex",alignItems:"center",gap:14}}>
        <BackBtn onClick={onBack}/>
        <div style={{flex:1,padding:"13px 18px",borderRadius:16,background:C.card,display:"flex",alignItems:"center",gap:12,border:`2px solid ${C.saffron}`,boxShadow:`0 0 0 4px ${C.saffronDim}`}}>
          <span style={{fontSize:15,color:C.saffron}}>⌕</span>
          <input autoFocus type="search" aria-label="Search temples" placeholder="Temple, deity, city, state…" value={q} onChange={e => { setQ(e.target.value); }} onKeyDown={e => e.key==='Enter' && saveHistory(q)} style={{flex:1,border:"none",outline:"none",fontSize:14,fontFamily:FB,color:C.cream,background:"transparent"}}/>
          {q && <button aria-label="Clear search" className="t" onClick={() => setQ("")} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:C.textD}}>✕</button>}
        </div>
      </div>
      {!q ? <div style={{padding:"18px 24px"}}>
        {history.length > 0 && (
          <div style={{marginBottom:22}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:9,color:C.textDD,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase"}}>Recent Searches</div>
              <button className="t" onClick={clearHistory} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:C.textD,fontWeight:600}}>Clear</button>
            </div>
            {history.map((s,i) => (
              <div key={s} className="t rv" onClick={() => doSearch(s)} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 0",borderBottom:`1px solid ${C.divL}`,cursor:"pointer",animationDelay:`${i*.04}s`}}>
                <svg width="13" height="13" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.49"/></svg>
                <span style={{fontSize:14,color:C.textM,flex:1}}>{s}</span>
                <button className="t" onClick={e => { e.stopPropagation(); const next = history.filter(x=>x!==s); setHistory(next); localStorage.setItem('searchHistory',JSON.stringify(next)); }} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.textDD}}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={{fontSize:9,color:C.textDD,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",marginBottom:18}}>Popular Searches</div>
        {POPULAR_SEARCHES.map((s,i) => (
          <div key={s} className="t rv" onClick={() => doSearch(s)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:`1px solid ${C.divL}`,cursor:"pointer",animationDelay:`${i*.04}s`}}>
            <svg width="13" height="13" fill="none" stroke={C.textDD} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <span style={{fontSize:14,color:C.textM}}>{s}</span>
          </div>
        ))}
      </div> : res.length > 0 ? <div style={{paddingTop:10}}>
        <div role="status" aria-live="polite" style={{padding:"0 24px 12px",fontSize:12,color:C.textD}}>{res.length} result{res.length !== 1 ? "s" : ""}</div>
        {res.map((t,i) => <LCard key={t.id} t={t} onClick={oT} onFav={oF} d={i*.04}/>)}
      </div> : <Empty emoji="⌕" title="No Results" sub={`Nothing for "${q}". Try another search.`}/>}
    </div>
  );
};

const StateBrowse = ({nav, onBack, isDark, onToggleTheme, onSelect}) => {
  const states = STATES.filter(s => s.type === "state");
  const uts    = STATES.filter(s => s.type === "ut");
  const Row = ({s, i}) => (
    <div key={s.name} className="t rv" onClick={() => { onSelect(s); nav("districtBrowse"); }}
      style={{display:"flex",alignItems:"center",gap:16,padding:"16px 0",borderBottom:`1px solid ${C.divL}`,cursor:"pointer",animationDelay:`${i*.025}s`}}>
      <div style={{width:48,height:48,borderRadius:14,background:hsl(s.h,30,isDark?12:90),border:`1.5px solid ${hsl(s.h,40,isDark?22:72,0.35)}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <div style={{width:18,height:18,borderRadius:5,background:`linear-gradient(135deg,${hsl(s.h,55,50)},${hsl(s.h,45,35)})`,opacity:.65}}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{fontFamily:FD,fontSize:17,fontWeight:500,color:C.creamM}}>{s.name}</span>
          {s.type==="ut" && <span style={{fontSize:8,fontWeight:800,letterSpacing:1,color:C.gold,background:C.goldDim,border:`1px solid rgba(196,162,78,0.2)`,padding:"2px 6px",borderRadius:5,textTransform:"uppercase",flexShrink:0}}>UT</span>}
        </div>
        <div style={{fontSize:11.5,color:C.textD,marginTop:3}}>{s.n.toLocaleString()} temples</div>
      </div>
      <svg width="16" height="16" fill="none" stroke={C.textDD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
    </div>
  );
  return (
    <div className="fi" style={{paddingBottom:32}}>
      <div style={{padding:"20px 24px",display:"flex",alignItems:"center",gap:14}}>
        <BackBtn onClick={onBack}/>
        <div style={{flex:1}}>
          <h1 style={{fontFamily:FD,fontSize:26,fontWeight:500,color:C.cream}}>All States & UTs</h1>
          <div style={{fontSize:11,color:C.textD,marginTop:3}}>{states.length} states · {uts.length} union territories</div>
        </div>
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
      </div>
      {/* States section */}
      <div style={{padding:"0 24px"}}>
        <div style={{fontSize:9,color:C.textDD,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",marginBottom:6,paddingTop:4}}>States ({states.length})</div>
        {states.map((s,i) => <Row key={s.name} s={s} i={i}/>)}
      </div>
      {/* Union Territories section */}
      <div style={{padding:"20px 24px 0"}}>
        <div style={{fontSize:9,color:C.gold,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",marginBottom:6}}>Union Territories ({uts.length})</div>
        {uts.map((s,i) => <Row key={s.name} s={s} i={states.length + i}/>)}
      </div>
    </div>
  );
};

const DISTRICT_MAP = {
  // South India
  "Tamil Nadu":       [{n:"Thanjavur",c:892},{n:"Madurai",c:724},{n:"Kanchipuram",c:648},{n:"Tiruchirappalli",c:562},{n:"Tirunelveli",c:498},{n:"Ramanathapuram",c:432},{n:"Chidambaram",c:385},{n:"Coimbatore",c:312},{n:"Salem",c:276},{n:"Vellore",c:248}],
  "Andhra Pradesh":   [{n:"Tirupati",c:954},{n:"Guntur",c:614},{n:"Krishna",c:532},{n:"Kurnool",c:488},{n:"East Godavari",c:442},{n:"Nellore",c:398},{n:"West Godavari",c:356},{n:"Visakhapatnam",c:312},{n:"Srikakulam",c:284},{n:"Kadapa",c:256}],
  "Karnataka":        [{n:"Mysuru",c:784},{n:"Hassan",c:542},{n:"Dakshina Kannada",c:418},{n:"Belagavi",c:472},{n:"Chikkamagaluru",c:382},{n:"Shivamogga",c:348},{n:"Kalaburagi",c:312},{n:"Kodagu",c:292},{n:"Dharwad",c:268},{n:"Udupi",c:244}],
  "Kerala":           [{n:"Thrissur",c:724},{n:"Thiruvananthapuram",c:674},{n:"Palakkad",c:548},{n:"Kollam",c:512},{n:"Ernakulam",c:482},{n:"Kozhikode",c:438},{n:"Malappuram",c:384},{n:"Alappuzha",c:352},{n:"Idukki",c:292},{n:"Pathanamthitta",c:268}],
  "Telangana":        [{n:"Hyderabad",c:412},{n:"Warangal",c:368},{n:"Nalgonda",c:312},{n:"Bhadradri Kothagudem",c:284},{n:"Nizamabad",c:248},{n:"Karimnagar",c:224},{n:"Mahbubnagar",c:198},{n:"Khammam",c:182}],
  // West India
  "Maharashtra":      [{n:"Pune",c:842},{n:"Nashik",c:724},{n:"Kolhapur",c:682},{n:"Aurangabad",c:618},{n:"Satara",c:572},{n:"Raigad",c:498},{n:"Solapur",c:468},{n:"Nagpur",c:412},{n:"Ahmednagar",c:384},{n:"Sindhudurg",c:328}],
  "Gujarat":          [{n:"Junagadh",c:582},{n:"Somnath",c:524},{n:"Rajkot",c:448},{n:"Vadodara",c:412},{n:"Dwarka",c:392},{n:"Surat",c:368},{n:"Ahmedabad",c:348},{n:"Bhavnagar",c:312},{n:"Gandhinagar",c:256},{n:"Anand",c:224}],
  "Goa":              [{n:"North Goa",c:312},{n:"South Goa",c:268}],
  // North India
  "Uttar Pradesh":    [{n:"Varanasi",c:1842},{n:"Mathura",c:1524},{n:"Ayodhya",c:1248},{n:"Prayagraj",c:984},{n:"Vrindavan",c:872},{n:"Agra",c:642},{n:"Lucknow",c:584},{n:"Gorakhpur",c:528},{n:"Meerut",c:468},{n:"Kanpur",c:392}],
  "Rajasthan":        [{n:"Jaipur",c:724},{n:"Pushkar",c:648},{n:"Udaipur",c:582},{n:"Jodhpur",c:512},{n:"Nathdwara",c:468},{n:"Ajmer",c:428},{n:"Chittorgarh",c:384},{n:"Alwar",c:348},{n:"Kota",c:312},{n:"Bikaner",c:278}],
  "Madhya Pradesh":   [{n:"Ujjain",c:892},{n:"Bhopal",c:568},{n:"Khajuraho",c:484},{n:"Omkareshwar",c:448},{n:"Indore",c:412},{n:"Gwalior",c:368},{n:"Jabalpur",c:324},{n:"Orchha",c:298},{n:"Chitrakoot",c:272},{n:"Amarkantak",c:248}],
  "Uttarakhand":      [{n:"Rishikesh",c:624},{n:"Haridwar",c:584},{n:"Chamoli (Badrinath)",c:492},{n:"Rudraprayag (Kedarnath)",c:468},{n:"Dehradun",c:384},{n:"Almora",c:348},{n:"Pauri Garhwal",c:312},{n:"Nainital",c:276},{n:"Pithoragarh",c:248},{n:"Tehri",c:224}],
  "Himachal Pradesh": [{n:"Kullu",c:412},{n:"Shimla",c:368},{n:"Chamba",c:324},{n:"Kangra",c:298},{n:"Mandi",c:272},{n:"Bilaspur",c:228},{n:"Hamirpur",c:196},{n:"Una",c:168}],
  "Punjab":           [{n:"Amritsar",c:348},{n:"Ludhiana",c:284},{n:"Patiala",c:248},{n:"Anandpur Sahib",c:212},{n:"Jalandhar",c:196},{n:"Bathinda",c:168}],
  "Haryana":          [{n:"Kurukshetra",c:412},{n:"Ambala",c:248},{n:"Faridabad",c:212},{n:"Gurugram",c:184},{n:"Panipat",c:168},{n:"Hisar",c:148}],
  // East India
  "West Bengal":      [{n:"Kolkata",c:724},{n:"Murshidabad",c:582},{n:"Birbhum (Tarapith)",c:498},{n:"Burdwan",c:412},{n:"Nadia",c:368},{n:"Hooghly",c:328},{n:"Medinipur",c:292},{n:"Cooch Behar",c:248},{n:"North 24 Parganas",c:224},{n:"Purulia",c:196}],
  "Odisha":           [{n:"Puri",c:884},{n:"Cuttack",c:624},{n:"Bhubaneswar",c:548},{n:"Bhadrak",c:412},{n:"Koraput",c:368},{n:"Bolangir",c:324},{n:"Balasore",c:292},{n:"Ganjam",c:268},{n:"Sambalpur",c:244},{n:"Dhenkanal",c:212}],
  "Bihar":            [{n:"Gaya (Bodh Gaya)",c:624},{n:"Patna",c:512},{n:"Darbhanga",c:448},{n:"Muzaffarpur",c:384},{n:"Bhagalpur",c:348},{n:"Vaishali",c:312},{n:"Sitamarhi",c:278},{n:"Nawada",c:242}],
  "Jharkhand":        [{n:"Deoghar (Baidyanath)",c:484},{n:"Ranchi",c:368},{n:"Dumka",c:284},{n:"Hazaribagh",c:248},{n:"Dhanbad",c:212},{n:"Giridih",c:192}],
  "Assam":            [{n:"Kamrup (Kamakhya)",c:542},{n:"Tezpur",c:384},{n:"Dibrugarh",c:312},{n:"Jorhat",c:272},{n:"Nagaon",c:248},{n:"Barpeta",c:218}],
  "Chhattisgarh":     [{n:"Raipur",c:368},{n:"Dantewada",c:312},{n:"Rajnandgaon",c:268},{n:"Bilaspur",c:248},{n:"Bastar",c:224},{n:"Durg",c:192}],
  // North-East
  "Tripura":          [{n:"Gomati (Tripura Sundari)",c:248},{n:"West Tripura",c:198},{n:"North Tripura",c:112},{n:"South Tripura",c:82}],
  "Manipur":          [{n:"Imphal West",c:168},{n:"Imphal East",c:142},{n:"Bishnupur",c:68},{n:"Thoubal",c:42}],
  "Meghalaya":        [{n:"East Khasi Hills",c:128},{n:"West Jaintia Hills",c:88},{n:"East Garo Hills",c:58},{n:"West Khasi Hills",c:36}],
  "Arunachal Pradesh":[{n:"East Kameng",c:68},{n:"Papum Pare",c:58},{n:"Upper Siang",c:48},{n:"Tawang",c:38},{n:"Dibang Valley",c:28},{n:"Lohit",c:40}],
  "Nagaland":         [{n:"Kohima",c:68},{n:"Dimapur",c:58},{n:"Wokha",c:32},{n:"Mokukchung",c:22}],
  "Sikkim":           [{n:"South Sikkim",c:64},{n:"East Sikkim",c:52},{n:"North Sikkim",c:28},{n:"West Sikkim",c:16}],
  "Mizoram":          [{n:"Aizawl",c:48},{n:"Lunglei",c:32},{n:"Champhai",c:24},{n:"Kolasib",c:16}],
  // UTs
  "Delhi":            [{n:"Central Delhi",c:312},{n:"South Delhi",c:268},{n:"East Delhi",c:212},{n:"North Delhi",c:196},{n:"West Delhi",c:168},{n:"New Delhi",c:144}],
  "Jammu & Kashmir":  [{n:"Jammu",c:484},{n:"Kathua",c:312},{n:"Udhampur (Vaishno Devi)",c:268},{n:"Anantnag",c:224},{n:"Srinagar",c:198},{n:"Kupwara",c:112},{n:"Pahalgam",c:102},{n:"Shopian",c:0}],
  "Puducherry":       [{n:"Puducherry",c:312},{n:"Karaikal",c:128},{n:"Mahé",c:48},{n:"Yanam",c:32}],
  "Chandigarh":       [{n:"Chandigarh",c:140}],
  "Ladakh":           [{n:"Leh",c:28},{n:"Kargil",c:16}],
  "Andaman & Nicobar":[{n:"South Andaman",c:68},{n:"North & Middle Andaman",c:32},{n:"Nicobar",c:10}],
  "Dadra, NH & DD":   [{n:"Daman",c:44},{n:"Diu",c:28},{n:"Dadra & Nagar Haveli",c:18}],
  "Lakshadweep":      [{n:"Kavaratti",c:28},{n:"Agatti",c:12},{n:"Amini",c:8}],
};

const DistrictBrowse = ({onBack, oT, oF, temples, isDark, onToggleTheme, state}) => {
  const sName = state?.name || "Tamil Nadu";
  const sCount = state?.n;
  const ds = DISTRICT_MAP[sName] || [];
  const stateTemples = temples.filter(t => t.stateOrUnionTerritory === sName);
  return (
    <div className="fi" style={{paddingBottom:24}}>
      <div style={{padding:"20px 24px",display:"flex",alignItems:"center",gap:14}}>
        <BackBtn onClick={onBack}/>
        <div style={{flex:1}}>
          <h1 style={{fontFamily:FD,fontSize:24,fontWeight:500,color:C.cream}}>{sName}</h1>
          <div style={{fontSize:12,color:C.textD,marginTop:3}}>{sCount ? `${sCount} temples` : `${stateTemples.length} temples in database`}</div>
        </div>
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
      </div>
      {ds.length > 0 ? (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"12px 24px"}}>
          {ds.map((d,i) => (
            <div key={d.n} className="t rv" style={{padding:20,borderRadius:18,background:C.card,cursor:"pointer",border:`1px solid ${C.div}`,animationDelay:`${i*.04}s`}}>
              <div style={{fontFamily:FD,fontSize:16,fontWeight:500,color:C.creamM}}>{d.n}</div>
              <div style={{fontSize:11,color:C.textD,marginTop:5}}>{d.c} temples</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{margin:"8px 24px",padding:"18px 20px",borderRadius:18,background:C.card,border:`1px solid ${C.div}`,textAlign:"center"}}>
          <div style={{fontSize:12,color:C.textD,lineHeight:1.7}}>District breakdown for <span style={{color:C.saffron,fontWeight:600}}>{sName}</span> coming soon.</div>
        </div>
      )}
      <div style={{marginTop:28}}>
        <SH title={`Temples in ${sName}`} d={.2}/>
        {stateTemples.length > 0
          ? stateTemples.map((t,i) => <LCard key={t.id} t={t} onClick={oT} onFav={oF} d={.25+i*.06}/>)
          : <Empty emoji="🏛" title="No Temples Yet" sub={`We're adding more temples from ${sName} soon.`}/>}
      </div>
    </div>
  );
};

const distKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const Nearby = ({oT, oF, temples, loading, isDark, onToggleTheme}) => {
  const [geo, setGeo] = useState(null);
  const [geoErr, setGeoErr] = useState(null);
  const [locating, setLocating] = useState(false);
  const [range, setRange] = useState(50);
  const RANGES = [{l:"10 km",v:10},{l:"50 km",v:50},{l:"100 km",v:100},{l:"All",v:99999}];

  const locate = () => {
    if (!navigator.geolocation) { setGeoErr("Geolocation not supported by your browser."); return; }
    setLocating(true); setGeoErr(null);
    navigator.geolocation.getCurrentPosition(
      pos => { setGeo({lat:pos.coords.latitude, lng:pos.coords.longitude}); setLocating(false); },
      err => { setGeoErr(err.code === 1 ? "Location access denied. Please allow location in browser settings." : "Could not get your location. Please try again."); setLocating(false); },
      {timeout:12000, maximumAge:60000}
    );
  };

  const nearby = geo
    ? temples
        .filter(t => t.latitude && t.longitude)
        .map(t => ({...t, _dist: distKm(geo.lat, geo.lng, t.latitude, t.longitude)}))
        .filter(t => t._dist <= range)
        .sort((a,b) => a._dist - b._dist)
    : [];

  return (
    <div className="fi" style={{paddingBottom:24}}>
      <div style={{padding:"22px 24px",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div>
          <h1 style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream}}>Nearby</h1>
          <p style={{fontSize:13,color:C.textD,marginTop:5}}>{geo ? `${nearby.length} temples within ${range === 99999 ? "any distance" : range+" km"}` : "Temples around your location"}</p>
        </div>
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
      </div>

      {/* Location card */}
      {!geo ? (
        <div style={{margin:"0 24px",borderRadius:24,background:C.card,border:`1px solid ${C.div}`,padding:"32px 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:16,textAlign:"center"}}>
          <div style={{width:72,height:72,borderRadius:22,background:C.saffronDim,border:`1px solid rgba(212,133,60,0.15)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="30" height="30" fill="none" stroke={C.saffron} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          </div>
          {geoErr
            ? <p style={{fontSize:12.5,color:"#ef4444",lineHeight:1.7,maxWidth:260}}>{geoErr}</p>
            : <p style={{fontSize:13,color:C.textD,lineHeight:1.7,maxWidth:260}}>Share your location to discover sacred temples near you.</p>
          }
          <button className="t" onClick={locate} disabled={locating} style={{padding:"13px 36px",borderRadius:16,background:`linear-gradient(120deg,${C.saffron},${C.saffronH})`,color:"#fff",border:"none",fontSize:13,fontWeight:700,cursor:locating?"default":"pointer",fontFamily:FB,boxShadow:"0 4px 20px rgba(212,133,60,0.32)",opacity:locating?.7:1,transition:"all .3s"}}>
            {locating ? "Locating…" : geoErr ? "Try Again" : "Enable Location"}
          </button>
        </div>
      ) : (
        <div style={{margin:"0 24px",padding:"14px 18px",borderRadius:18,background:C.card,border:`1px solid ${C.div}`,display:"flex",alignItems:"center",gap:12}}>
          <svg width="16" height="16" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          <span style={{fontSize:12,color:C.creamM,flex:1}}>Location: {geo.lat.toFixed(3)}°N, {geo.lng.toFixed(3)}°E</span>
          <button className="t" onClick={() => { setGeo(null); setGeoErr(null); }} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.textD,fontWeight:600}}>Change</button>
        </div>
      )}

      {/* Range filter */}
      {geo && (
        <div style={{display:"flex",gap:8,padding:"16px 24px 4px",overflowX:"auto"}}>
          {RANGES.map(r => <Chip key={r.l} label={r.l} active={range===r.v} onClick={() => setRange(r.v)}/>)}
        </div>
      )}

      {/* Results */}
      {loading && !geo && [0,1].map(i => <SkeletonListCard key={i}/>)}
      {geo && (nearby.length > 0
        ? nearby.map((t,i) => (
            <div key={t.id}>
              <LCard t={t} onClick={oT} onFav={oF} d={i*.06}/>
              <div style={{fontSize:11,color:C.textD,fontWeight:600,padding:"0 24px 6px",marginTop:-8,display:"flex",alignItems:"center",gap:4}}>
                <svg width="10" height="10" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                {t._dist < 1 ? `${(t._dist*1000).toFixed(0)} m away` : `${t._dist.toFixed(1)} km away`}
              </div>
            </div>
          ))
        : <Empty emoji="🏛" title="No Temples Nearby" sub={`No temples found within ${range} km. Try a larger radius.`}/>
      )}
    </div>
  );
};

const Saved = ({oT, oF, temples, isDark, onToggleTheme, onBrowse}) => {
  const sv = temples.filter(t => t.isFavorite);
  return (
    <div className="fi" style={{paddingBottom:24}}>
      <div style={{padding:"22px 24px",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div><h1 style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream}}>Saved</h1><p style={{fontSize:13,color:C.textD,marginTop:5}}>{sv.length} temple{sv.length!==1?"s":""}</p></div>
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
      </div>
      {sv.length > 0 ? sv.map((t,i) => <LCard key={t.id} t={t} onClick={oT} onFav={oF} d={i*.05}/>) : (
        <div>
          <Empty emoji="♥" title="No Saved Temples" sub="Tap the heart on any temple to save it here." action={{label:"Browse Temples", onPress: onBrowse}}/>
          {temples.length > 0 && (
            <div style={{marginTop:8}}>
              <SH title="You Might Like" sub="Discover temples to save" d={.1}/>
              <div style={{display:"flex",gap:18,overflowX:"auto",padding:"0 24px 14px",scrollSnapType:"x mandatory"}}>
                {temples.slice(0,4).map((t,i) => <FCard key={t.id} t={t} onClick={oT} onFav={oF} d={.12+i*.08}/>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━ ABOUT PAGE ━━━━━━━━━━━━━━━━━━━━━━━━

const ABOUT_TEXT = `I am Malla, and this app was born from something far deeper than an idea — it grew from a feeling I have carried with me for a long time. India is not simply a country to me; it is a living memory that breathes through its temples, where every stone, every carving, and every hushed corner holds a story that has travelled across generations without losing its meaning. Temples in India are not merely places of worship. They are expressions of faith and art, of science and devotion, of time itself — built by hands that believed in something far greater than themselves. While a handful of temples are known to the world and visited by millions, there are thousands more that remain quietly hidden: resting in forests, standing on lonely hills, tucked away in villages, or existing in places that most of us will never think to look. These temples are not lesser in any way. They are simply waiting to be seen, to be understood, and to be experienced with the attention they have always deserved. Many of them carry powerful local stories, a depth of spiritual energy, and an architectural beauty that has never been fully explored or shared. Over time, as life moved faster and attention drifted elsewhere, many such sacred places were left behind — not because they lost their importance, but because their stories were never brought forward. This app is my honest attempt to change that, to bring these temples closer to people who seek something more than just travel, something more than just a destination. It is built for those who want to explore, to feel, to understand, and to connect with a deeper side of India that no image can fully capture. It is also a small but sincere step towards encouraging thoughtful, respectful temple tourism — where visiting such places can support local communities, help preserve living traditions, and give these sacred spaces the care and attention they truly deserve. I believe that at least once in a lifetime, every person should stand inside a temple where time quietly slows, where silence speaks louder than any noise, and where you feel a sense of peace and belonging that words can only gesture towards. Not every temple in this app is famous. Not every place is crowded. But every place carries a meaning worth discovering, and a story worth carrying home. If this journey helps you find even one such place, feel even one such moment, or reconnect with something within yourself that you had almost forgotten, then this app has done everything it was meant to do. This is not just about temples. It is about stories, about roots, and about experiences that stay with you long after you have left. Sacred Temples India is simply a guide — but the journey, in every way that matters, is yours to take.`;

const AboutDivider = () => (
  <div style={{display:"flex",alignItems:"center",gap:14,padding:"0 24px",margin:"8px 0"}}>
    <div style={{flex:1,height:1,background:`linear-gradient(to right,transparent,rgba(196,162,78,0.18))`}}/>
    <span style={{fontFamily:FD,fontSize:15,color:"rgba(196,162,78,0.35)"}}>✦</span>
    <div style={{flex:1,height:1,background:`linear-gradient(to left,transparent,rgba(196,162,78,0.18))`}}/>
  </div>
);

const AboutSection = ({icon, label, title, children, accent}) => {
  const borderColor = accent || "rgba(196,162,78,0.22)";
  const iconBg = "rgba(196,162,78,0.08)";
  return (
    <div style={{margin:"0 16px 18px",borderRadius:20,background:C.card,border:`1px solid ${borderColor}`,overflow:"hidden",boxShadow:"0 2px 18px rgba(0,0,0,0.14)"}}>
      <div style={{padding:"20px 20px 0",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:38,height:38,borderRadius:12,background:iconBg,border:`1px solid ${borderColor}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:17}}>
          {icon}
        </div>
        <div>
          {label && <div style={{fontSize:9,fontWeight:800,letterSpacing:1.8,textTransform:"uppercase",color:C.textDD,marginBottom:3}}>{label}</div>}
          <div style={{fontFamily:FD,fontSize:17,fontWeight:600,color:C.cream,lineHeight:1.2}}>{title}</div>
        </div>
      </div>
      <div style={{padding:"14px 20px 20px"}}>
        {children}
      </div>
    </div>
  );
};

const About = ({onBack, isDark, onToggleTheme, temples}) => (
  <div className="fi" style={{minHeight:"100vh",background:C.bg,paddingBottom:64}}>

    {/* Sticky Header */}
    <div style={{padding:"20px 24px 16px",display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:50,background:C.glass,backdropFilter:"blur(24px)",borderBottom:`1px solid ${C.divL}`}}>
      <BackBtn onClick={onBack}/>
      <h1 style={{fontFamily:FD,fontSize:22,fontWeight:500,color:C.cream,flex:1}}>About</h1>
      <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
    </div>

    {/* Hero Block */}
    <div style={{padding:"44px 24px 40px",textAlign:"center",position:"relative",overflow:"hidden",background:`linear-gradient(180deg,rgba(212,133,60,0.05) 0%,transparent 100%)`}}>
      <div style={{position:"absolute",top:"38%",left:"50%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(212,133,60,0.09),transparent 65%)",transform:"translate(-50%,-50%)",filter:"blur(48px)",animation:"breathe 6s ease-in-out infinite",pointerEvents:"none"}}/>
      {[170,124,82].map((r,i) => (
        <div key={i} style={{position:"absolute",top:"38%",left:"50%",width:r,height:r,borderRadius:"50%",border:`1px solid rgba(212,133,60,${0.06+i*0.05})`,transform:"translate(-50%,-50%)",animation:`breathe ${8+i*2}s ease-in-out infinite ${i*.9}s`,pointerEvents:"none"}}/>
      ))}
      <OmSymbol size={96}/>
      <div style={{marginTop:22,position:"relative",zIndex:2}}>
        <h2 style={{fontFamily:FD,fontSize:28,fontWeight:600,color:C.cream,lineHeight:1.15,letterSpacing:.2}}>Sacred Temples<br/>of India</h2>
        <p style={{fontFamily:FD,fontSize:14,color:C.saffron,fontStyle:"italic",marginTop:10,opacity:.75,letterSpacing:.4}}>A personal journey by Malla</p>
        <p style={{fontFamily:FD,fontSize:15,color:C.creamD,lineHeight:1.75,marginTop:18,maxWidth:320,margin:"18px auto 0",letterSpacing:.15}}>Discovering the divine in every stone, every carving, and every sacred moment across India.</p>
      </div>
    </div>

    {/* Stats Row */}
    <div style={{display:"flex",gap:10,padding:"0 16px 28px",overflowX:"auto",scrollbarWidth:"none"}}>
      {[
        {n:temples.length, label:"Sacred Places"},
        {n:"36", label:"States and UTs"},
        {n:"6", label:"Sacred Deities"},
      ].map(s => (
        <div key={s.label} style={{flex:1,minWidth:96,borderRadius:16,background:C.card,border:`1px solid rgba(196,162,78,0.15)`,padding:"16px 10px",textAlign:"center",boxShadow:"0 2px 12px rgba(0,0,0,0.10)"}}>
          <div style={{fontFamily:FD,fontSize:22,fontWeight:600,color:C.saffron,lineHeight:1}}>{s.n}</div>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:C.textDD,marginTop:5}}>{s.label}</div>
        </div>
      ))}
    </div>

    <AboutDivider/>

    {/* Mission Section */}
    <AboutSection icon="✦" label="Our Purpose" title="Why This App Was Born" accent="rgba(212,133,60,0.22)">
      <p style={{fontFamily:FD,fontSize:16,color:C.creamM,lineHeight:1.9,letterSpacing:.15}}>
        I am Malla, and this app was born from something far deeper than an idea — it grew from a feeling I have carried with me for a long time. It is my honest attempt to bring sacred temples closer to people who seek something more than just travel, something more than just a destination. It is built for those who want to explore, to feel, to understand, and to connect with a deeper side of India that no image can fully capture.
      </p>
    </AboutSection>

    {/* Heritage Section */}
    <AboutSection icon="🏛" label="India's Heritage" title="A Living Memory in Stone" accent="rgba(196,162,78,0.2)">
      <p style={{fontFamily:FD,fontSize:16,color:C.creamM,lineHeight:1.9,letterSpacing:.15}}>
        India is not simply a country — it is a living memory that breathes through its temples, where every stone, every carving, and every hushed corner holds a story that has travelled across generations without losing its meaning. Temples here are not merely places of worship. They are expressions of faith and art, of science and devotion, of time itself — built by hands that believed in something far greater than themselves.
      </p>
    </AboutSection>

    {/* Hidden Temples Section */}
    <AboutSection icon="◎" label="Beyond the Famous" title="Temples Waiting to Be Seen" accent="rgba(168,152,120,0.22)">
      <p style={{fontFamily:FD,fontSize:16,color:C.creamM,lineHeight:1.9,letterSpacing:.15}}>
        While a handful of temples are known to the world and visited by millions, there are thousands more that remain quietly hidden — resting in forests, standing on lonely hills, tucked away in villages, or existing in places that most of us will never think to look. These temples are not lesser in any way. They carry powerful local stories, a depth of spiritual energy, and an architectural beauty that has never been fully explored or shared.
      </p>
    </AboutSection>

    {/* Why It Matters Section */}
    <AboutSection icon="❤" label="Why It Matters" title="Preserving What Is Sacred" accent="rgba(180,60,60,0.2)">
      <p style={{fontFamily:FD,fontSize:16,color:C.creamM,lineHeight:1.9,letterSpacing:.15}}>
        Over time, as life moved faster and attention drifted elsewhere, many sacred places were left behind — not because they lost their importance, but because their stories were never brought forward. This app is also a small but sincere step towards encouraging thoughtful, respectful temple tourism — where visiting such places can support local communities, help preserve living traditions, and give these sacred spaces the care they truly deserve.
      </p>
    </AboutSection>

    <AboutDivider/>

    {/* Spiritual Journey Section */}
    <div style={{margin:"8px 16px 18px",borderRadius:20,background:`linear-gradient(135deg,rgba(212,133,60,0.10) 0%,rgba(196,162,78,0.06) 100%)`,border:"1px solid rgba(212,133,60,0.2)",padding:"24px 20px",boxShadow:"0 2px 18px rgba(0,0,0,0.12)"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <div style={{width:38,height:38,borderRadius:12,background:"rgba(212,133,60,0.12)",border:"1px solid rgba(212,133,60,0.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:17}}>☸</div>
        <div>
          <div style={{fontSize:9,fontWeight:800,letterSpacing:1.8,textTransform:"uppercase",color:C.textDD,marginBottom:3}}>Spiritual Journey</div>
          <div style={{fontFamily:FD,fontSize:17,fontWeight:600,color:C.cream,lineHeight:1.2}}>A Moment That Stays With You</div>
        </div>
      </div>
      <p style={{fontFamily:FD,fontSize:16,color:C.creamM,lineHeight:1.9,letterSpacing:.15}}>
        I believe that at least once in a lifetime, every person should stand inside a temple where time quietly slows, where silence speaks louder than any noise, and where you feel a sense of peace and belonging that words can only gesture towards. Not every temple in this app is famous. Not every place is crowded. But every place carries a meaning worth discovering, and a story worth carrying home.
      </p>
    </div>

    {/* Trust and Authenticity */}
    <AboutSection icon="◈" label="Crafted with Heart" title="Authentic and Trustworthy" accent="rgba(196,162,78,0.2)">
      <p style={{fontFamily:FD,fontSize:16,color:C.creamM,lineHeight:1.9,letterSpacing:.15}}>
        Every temple listed here has been gathered with care and presented with sincere respect for the traditions they represent. This app is not just a directory — it is a curated collection of sacred experiences, built by someone who deeply believes in the value of what these places hold and the stories they carry.
      </p>
    </AboutSection>

    {/* Future Vision */}
    <div style={{margin:"0 16px 28px",borderRadius:20,background:C.card,border:"1px solid rgba(196,162,78,0.18)",overflow:"hidden",boxShadow:"0 2px 18px rgba(0,0,0,0.14)"}}>
      <div style={{padding:"20px 20px 14px",borderBottom:"1px solid rgba(196,162,78,0.10)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:38,height:38,borderRadius:12,background:"rgba(196,162,78,0.08)",border:"1px solid rgba(196,162,78,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:17}}>🌅</div>
          <div>
            <div style={{fontSize:9,fontWeight:800,letterSpacing:1.8,textTransform:"uppercase",color:C.textDD,marginBottom:3}}>What is Coming</div>
            <div style={{fontFamily:FD,fontSize:17,fontWeight:600,color:C.cream,lineHeight:1.2}}>The Vision Ahead</div>
          </div>
        </div>
      </div>
      <div style={{padding:"16px 20px 20px",display:"flex",flexDirection:"column",gap:12}}>
        {[
          {icon:"🎧", text:"Audio guides and narrated temple tours"},
          {icon:"🗺", text:"Detailed pilgrimage route planning"},
          {icon:"📖", text:"Community stories and personal darshan accounts"},
          {icon:"🌿", text:"Seasonal festivals and auspicious dates"},
        ].map((item,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:32,height:32,borderRadius:10,background:"rgba(196,162,78,0.07)",border:"1px solid rgba(196,162,78,0.14)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:15}}>{item.icon}</div>
            <span style={{fontFamily:FD,fontSize:15,color:C.creamM,lineHeight:1.6}}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>

    <AboutDivider/>

    {/* App Meta */}
    <div style={{margin:"8px 16px 0",borderRadius:18,background:C.card,border:`1px solid ${C.div}`,overflow:"hidden"}}>
      {[
        {l:"App", v:"Sacred Temples India"},
        {l:"Version", v:"1.0"},
        {l:"Temples", v:`${temples.length} sacred places`},
        {l:"Creator", v:"Malla Naidu"},
      ].map((r,i,arr) => (
        <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:i<arr.length-1?`1px solid ${C.divL}`:"none"}}>
          <span style={{fontSize:11,fontWeight:700,color:C.textDD,letterSpacing:1.2,textTransform:"uppercase"}}>{r.l}</span>
          <span style={{fontSize:14,color:C.creamD,fontFamily:FD}}>{r.v}</span>
        </div>
      ))}
    </div>

    {/* Closing Emotional CTA */}
    <div style={{margin:"28px 16px 0",borderRadius:20,background:`linear-gradient(135deg,rgba(212,133,60,0.12) 0%,rgba(196,162,78,0.07) 100%)`,border:"1px solid rgba(212,133,60,0.22)",padding:"32px 24px",textAlign:"center",boxShadow:"0 2px 20px rgba(212,133,60,0.08)"}}>
      <OmSymbol size={42} style={{opacity:.85}}/>
      <div style={{fontFamily:FD,fontSize:20,fontWeight:600,color:C.cream,lineHeight:1.5,marginTop:16,letterSpacing:.2}}>
        This is not just about temples.
      </div>
      <div style={{fontFamily:FD,fontSize:16,color:C.creamM,lineHeight:1.85,marginTop:12,letterSpacing:.15}}>
        It is about stories, about roots, and about experiences that stay with you long after you have left. Sacred Temples India is simply a guide — but the journey, in every way that matters, is yours to take.
      </div>
      <div style={{display:"flex",alignItems:"center",gap:14,marginTop:24}}>
        <div style={{flex:1,height:1,background:"linear-gradient(to right,transparent,rgba(196,162,78,0.22))"}}/>
        <span style={{fontFamily:FD,fontSize:13,color:C.saffron,fontStyle:"italic",opacity:.8}}>ॐ शान्तिः शान्तिः शान्तिः</span>
        <div style={{flex:1,height:1,background:"linear-gradient(to left,transparent,rgba(196,162,78,0.22))"}}/>
      </div>
    </div>

  </div>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const AudioGuide = ({onBack, isDark, onToggleTheme}) => {
  const { playing, toggle } = useOmChant();
  const GUIDES = [
    {name:"Tirupati Balaji",loc:"Andhra Pradesh",dur:"14 min"},
    {name:"Kashi Vishwanath",loc:"Uttar Pradesh",dur:"11 min"},
    {name:"Meenakshi Amman",loc:"Tamil Nadu",dur:"13 min"},
    {name:"Somnath Temple",loc:"Gujarat",dur:"10 min"},
    {name:"Konark Sun Temple",loc:"Odisha",dur:"12 min"},
    {name:"Brihadeeswarar",loc:"Tamil Nadu",dur:"15 min"},
  ];
  return (
    <div className="fi" style={{minHeight:"100vh",background:C.bg,paddingBottom:48}}>
      {/* Header */}
      <div style={{padding:"20px 24px 0",display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:50,background:C.glass,backdropFilter:"blur(24px)",borderBottom:`1px solid ${C.divL}`}}>
        <BackBtn onClick={onBack}/>
        <h1 style={{fontFamily:FD,fontSize:22,fontWeight:500,color:C.cream,flex:1}}>Audio Guide</h1>
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
      </div>

      {/* Om Chant */}
      <div style={{padding:"44px 24px 32px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"40%",left:"50%",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(212,133,60,0.07),transparent 60%)",transform:"translate(-50%,-50%)",filter:"blur(50px)",pointerEvents:"none"}}/>
        {[180,130,90].map((r,i) => (
          <div key={i} style={{position:"absolute",top:"42%",left:"50%",width:r,height:r,borderRadius:"50%",border:`1px solid rgba(212,133,60,${0.05+i*0.04})`,transform:"translate(-50%,-50%)",animation:`breathe ${8+i*2}s ease-in-out infinite ${i*.8}s`,pointerEvents:"none"}}/>
        ))}
        <OmSymbol size={110}/>
        <h2 style={{fontFamily:FD,fontSize:22,color:C.cream,marginTop:20,marginBottom:8,fontWeight:500}}>Sacred Om Chant</h2>
        <p style={{fontSize:13,color:C.textD,lineHeight:1.7,maxWidth:260,margin:"0 auto 28px"}}>Experience the primordial sound — the vibration that underlies all creation</p>
        <button onClick={toggle} className="t" style={{display:"inline-flex",alignItems:"center",gap:10,padding:"14px 32px",borderRadius:100,background:playing?C.saffron:"rgba(212,133,60,0.12)",border:`1.5px solid ${playing?C.saffron:"rgba(212,133,60,0.3)"}`,cursor:"pointer",fontSize:13,fontWeight:700,color:playing?"#fff":C.saffron,fontFamily:FB,transition:"all .3s cubic-bezier(.16,1,.3,1)",boxShadow:playing?`0 6px 32px rgba(212,133,60,0.4)`:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:2,height:16}}>
            {[1,1.8,1.3,2,1.5,1.1,1.7].map((h,i) => (
              <div key={i} style={{width:2.5,borderRadius:2,background:playing?"#fff":C.saffron,height:`${h*6}px`,animation:playing?`soundWave 1.1s ease-in-out infinite ${i*.12}s`:"none",opacity:playing?1:.7}}/>
            ))}
          </div>
          <span>{playing ? "Chanting…" : "Begin Chant"}</span>
        </button>
      </div>

      {/* Divider */}
      <div style={{display:"flex",alignItems:"center",gap:14,padding:"0 28px",marginBottom:28}}>
        <div style={{flex:1,height:1,background:`linear-gradient(to right,transparent,rgba(196,162,78,0.15))`}}/>
        <span style={{fontFamily:FD,fontSize:14,color:"rgba(196,162,78,0.25)"}}>✦</span>
        <div style={{flex:1,height:1,background:`linear-gradient(to left,transparent,rgba(196,162,78,0.15))`}}/>
      </div>

      {/* Temple Audio Guides */}
      <div style={{padding:"0 24px"}}>
        <div style={{fontSize:10,color:C.textDD,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:16}}>Temple Audio Guides</div>
        {GUIDES.map((g) => (
          <div key={g.name} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 18px",marginBottom:10,borderRadius:18,background:C.card,border:`1px solid ${C.div}`}}>
            <div style={{width:44,height:44,borderRadius:14,background:"rgba(196,162,78,0.09)",border:"1px solid rgba(196,162,78,0.18)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="18" height="18" fill="none" stroke="rgba(196,162,78,0.6)" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600,color:C.cream,fontFamily:FD,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</div>
              <div style={{fontSize:11,color:C.textD}}>{g.loc} · {g.dur}</div>
            </div>
            <div style={{padding:"3px 10px",borderRadius:99,background:"rgba(196,162,78,0.09)",border:"1px solid rgba(196,162,78,0.2)",fontSize:8,fontWeight:800,color:"rgba(196,162,78,0.75)",letterSpacing:1.2,textTransform:"uppercase",flexShrink:0}}>Premium</div>
          </div>
        ))}
        <div style={{marginTop:8,padding:"18px 20px",borderRadius:18,background:C.saffronPale,border:`1px solid rgba(212,133,60,0.12)`,textAlign:"center"}}>
          <div style={{fontSize:12,color:C.textD,lineHeight:1.7}}>More temple audio guides coming soon.<br/>Expert narrations covering history, rituals &amp; significance.</div>
        </div>
      </div>
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const Profile = ({isDark, onToggleTheme, temples, nav}) => {
  const LS_KEY = "sti_profile";
  const load = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } };

  const [user, setUser] = useState(load);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({name:"", email:""});
  const [notifs, setNotifs] = useState(() => load().notifs !== false);
  const [deity, setDeity] = useState(() => load().deity || "All");

  const savedCount = temples.filter(t => t.isFavorite).length;
  const visitedCount = parseInt(load().visited || 0);

  const isSignedIn = !!(user.name);

  const save = (patch) => {
    const next = {...load(), ...patch};
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    setUser(next);
  };

  const initials = (name) => name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);

  const hue = 30; // saffron hue for avatar bg

  const AvatarCircle = ({size=80}) => (
    <div style={{
      width:size,height:size,borderRadius:"50%",flexShrink:0,
      background:isSignedIn
        ? `linear-gradient(140deg,${C.saffron},${C.saffronH})`
        : C.bg3,
      border:`2px solid ${isSignedIn ? "rgba(212,133,60,0.4)" : C.div}`,
      boxShadow:isSignedIn?"0 6px 28px rgba(212,133,60,0.28)":"none",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*0.36,fontWeight:700,
      color:isSignedIn?"#fff":C.textDD,
      fontFamily:FB,
    }}>
      {isSignedIn ? initials(user.name) : "☸"}
    </div>
  );

  /* ── SIGN IN FORM ── */
  if (!isSignedIn && !editing) return (
    <div className="fi" style={{paddingBottom:40}}>
      <div style={{padding:"22px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <h1 style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream}}>Profile</h1>
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
      </div>

      {/* Hero sign-in card */}
      <div style={{margin:"0 24px",borderRadius:28,background:C.card,border:`1px solid ${C.div}`,overflow:"hidden"}}>
        {/* Gradient band */}
        <div style={{height:90,background:`linear-gradient(120deg,${C.saffronDim},${C.bg3})`,borderBottom:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontFamily:FD,fontSize:52,color:"rgba(212,133,60,0.18)",userSelect:"none",letterSpacing:-2}}>ॐ</div>
        </div>
        <div style={{padding:"28px 28px 32px",textAlign:"center"}}>
          <AvatarCircle size={72}/>
          <h2 style={{fontFamily:FD,fontSize:21,fontWeight:500,color:C.cream,marginTop:16}}>Welcome, Devotee</h2>
          <p style={{fontSize:12.5,color:C.textD,marginTop:8,lineHeight:1.7,maxWidth:240,margin:"8px auto 0"}}>Create your profile to track visited temples and sync saved temples across devices.</p>
          <button className="t" onClick={() => { setForm({name:"",email:""}); setEditing(true); }} style={{
            marginTop:24,padding:"14px 44px",borderRadius:18,
            background:`linear-gradient(120deg,${C.saffron},${C.saffronH})`,
            color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",
            fontFamily:FB,letterSpacing:.4,boxShadow:"0 6px 24px rgba(212,133,60,0.35)",
            width:"100%",
          }}>Get Started</button>
        </div>
      </div>

      {/* Stats preview */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,padding:"20px 24px 0"}}>
        {[{l:"Saved",v:savedCount,icon:<svg width="16" height="16" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>},
           {l:"Visited",v:0,icon:<svg width="16" height="16" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>},
           {l:"Reviews",v:0,icon:<svg width="16" height="16" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>},
        ].map((s,i) => (
          <div key={s.l} className="rv" style={{padding:"18px 12px",borderRadius:20,background:C.card,textAlign:"center",border:`1px solid ${C.div}`,animationDelay:`${.1+i*.06}s`}}>
            <div style={{display:"flex",justifyContent:"center"}}>{s.icon}</div>
            <div style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream,marginTop:10}}>{s.v}</div>
            <div style={{fontSize:9.5,color:C.textD,marginTop:4,fontWeight:700,letterSpacing:.8,textTransform:"uppercase"}}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── CREATE / EDIT PROFILE FORM ── */
  if (editing) return (
    <div className="fi" style={{paddingBottom:40}}>
      <div style={{padding:"22px 24px",display:"flex",alignItems:"center",gap:14}}>
        <BackBtn onClick={() => setEditing(false)}/>
        <h1 style={{fontFamily:FD,fontSize:24,fontWeight:500,color:C.cream,flex:1}}>{isSignedIn?"Edit Profile":"Create Profile"}</h1>
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
      </div>

      <div style={{padding:"0 24px",display:"flex",flexDirection:"column",gap:14}}>
        {/* Avatar preview */}
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
          <div style={{
            width:88,height:88,borderRadius:"50%",
            background:form.name.trim()
              ? `linear-gradient(140deg,${C.saffron},${C.saffronH})`
              : C.bg3,
            border:`2px solid ${form.name.trim() ? "rgba(212,133,60,0.4)" : C.div}`,
            boxShadow:form.name.trim()?"0 6px 28px rgba(212,133,60,0.28)":"none",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:32,fontWeight:700,color:form.name.trim()?"#fff":C.textDD,fontFamily:FB,
            transition:"all .3s",
          }}>
            {form.name.trim() ? initials(form.name) : "☸"}
          </div>
        </div>

        {[{key:"name",label:"Full Name",placeholder:"e.g. Arjun Sharma",type:"text"},
          {key:"email",label:"Email Address",placeholder:"e.g. arjun@gmail.com",type:"email"},
        ].map(f => (
          <div key={f.key}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:.8,color:C.textD,textTransform:"uppercase",marginBottom:8}}>{f.label}</div>
            <input
              type={f.type}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))}
              style={{
                width:"100%",padding:"14px 18px",borderRadius:16,
                background:C.card,border:`1.5px solid ${C.div}`,
                fontSize:15,color:C.cream,outline:"none",boxSizing:"border-box",
                fontFamily:FB,
              }}
            />
          </div>
        ))}

        {/* Deity preference */}
        <div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:.8,color:C.textD,textTransform:"uppercase",marginBottom:8}}>Favourite Deity</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {["All","Shiva","Vishnu","Devi","Ganesha","Murugan","Hanuman"].map(d => (
              <button key={d} className="t" onClick={() => setForm(p => ({...p,deity:d}))} style={{
                padding:"8px 16px",borderRadius:99,fontSize:12,fontWeight:700,cursor:"pointer",
                background:(form.deity||"All")===d ? C.saffronDim : C.card,
                color:(form.deity||"All")===d ? C.saffron : C.textD,
                border:`1.5px solid ${(form.deity||"All")===d ? "rgba(212,133,60,0.4)" : C.div}`,
              }}>{d}</button>
            ))}
          </div>
        </div>

        <button
          className="t"
          disabled={!form.name.trim()}
          onClick={() => {
            save({name:form.name.trim(), email:form.email.trim(), deity:form.deity||"All", notifs});
            setDeity(form.deity||"All");
            setEditing(false);
          }}
          style={{
            marginTop:8,padding:"15px",borderRadius:18,width:"100%",
            background:form.name.trim()
              ? `linear-gradient(120deg,${C.saffron},${C.saffronH})`
              : C.bg3,
            color:form.name.trim()?"#fff":C.textDD,
            border:"none",fontSize:14,fontWeight:700,cursor:form.name.trim()?"pointer":"default",
            fontFamily:FB,letterSpacing:.4,
            boxShadow:form.name.trim()?"0 6px 24px rgba(212,133,60,0.3)":"none",
            transition:"all .3s",
          }}>
          Save Profile
        </button>
      </div>
    </div>
  );

  /* ── SIGNED-IN PROFILE ── */
  return (
    <div className="fi" style={{paddingBottom:40}}>
      <div style={{padding:"22px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <h1 style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream}}>Profile</h1>
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
      </div>

      {/* Identity card */}
      <div style={{margin:"0 24px",borderRadius:26,background:C.card,border:`1px solid ${C.div}`,padding:"24px 24px",display:"flex",alignItems:"center",gap:18}}>
        <AvatarCircle size={72}/>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{fontFamily:FD,fontSize:20,fontWeight:500,color:C.cream,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</h2>
          {user.email && <div style={{fontSize:12,color:C.textD,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>}
          {user.deity && user.deity !== "All" && (
            <div style={{marginTop:8,display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:99,background:C.saffronDim,border:`1px solid rgba(212,133,60,0.18)`}}>
              <div style={{width:4,height:4,borderRadius:"50%",background:C.saffron}}/>
              <span style={{fontSize:10,color:C.saffron,fontWeight:700,letterSpacing:.6}}>{user.deity}</span>
            </div>
          )}
        </div>
        <button className="t" onClick={() => { setForm({name:user.name||"",email:user.email||"",deity:user.deity||"All"}); setEditing(true); }} style={{
          padding:"9px 16px",borderRadius:13,background:C.saffronDim,
          border:`1px solid rgba(212,133,60,0.25)`,cursor:"pointer",
          fontSize:11,fontWeight:700,color:C.saffron,letterSpacing:.4,
        }}>Edit</button>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,padding:"16px 24px 0"}}>
        {[{l:"Saved",v:savedCount,icon:<svg width="16" height="16" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>},
           {l:"Visited",v:visitedCount,icon:<svg width="16" height="16" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>},
           {l:"Reviews",v:parseInt(user.reviews||0),icon:<svg width="16" height="16" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>},
        ].map((s,i) => (
          <div key={s.l} className="rv" style={{padding:"18px 12px",borderRadius:20,background:C.card,textAlign:"center",border:`1px solid ${C.div}`,animationDelay:`${.08+i*.06}s`}}>
            <div style={{display:"flex",justifyContent:"center"}}>{s.icon}</div>
            <div style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream,marginTop:10}}>{s.v}</div>
            <div style={{fontSize:9.5,color:C.textD,marginTop:4,fontWeight:700,letterSpacing:.8,textTransform:"uppercase"}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div style={{margin:"22px 24px 0",borderRadius:22,background:C.card,border:`1px solid ${C.div}`,overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.divL}`}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,color:C.textDD,textTransform:"uppercase"}}>Preferences</div>
        </div>

        {/* Dark/Light mode inline row */}
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderBottom:`1px solid ${C.divL}`}}>
          <div style={{width:42,height:42,borderRadius:13,background:C.bg3,border:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {isDark
              ? <svg width="17" height="17" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              : <svg width="17" height="17" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </div>
          <span style={{flex:1,fontSize:14,fontWeight:600,color:C.creamM}}>{isDark ? "Dark Mode" : "Light Mode"}</span>
          {/* Toggle pill */}
          <div onClick={onToggleTheme} style={{
            width:50,height:28,borderRadius:99,cursor:"pointer",position:"relative",
            background:isDark ? C.saffron : C.bg3,
            border:`1.5px solid ${isDark ? "rgba(212,133,60,0.4)" : C.div}`,
            transition:"background .3s,border-color .3s",
          }}>
            <div style={{
              position:"absolute",top:3,
              left:isDark?22:3,
              width:20,height:20,borderRadius:"50%",
              background:isDark?"#fff":C.textDD,
              transition:"left .25s cubic-bezier(.16,1,.3,1)",
              boxShadow:"0 1px 6px rgba(0,0,0,0.18)",
            }}/>
          </div>
        </div>

        {/* Notifications row */}
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderBottom:`1px solid ${C.divL}`}}>
          <div style={{width:42,height:42,borderRadius:13,background:C.bg3,border:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="17" height="17" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <span style={{flex:1,fontSize:14,fontWeight:600,color:C.creamM}}>Notifications</span>
          <div onClick={() => { const next = !notifs; setNotifs(next); save({notifs:next}); }} style={{
            width:50,height:28,borderRadius:99,cursor:"pointer",position:"relative",
            background:notifs ? C.saffron : C.bg3,
            border:`1.5px solid ${notifs ? "rgba(212,133,60,0.4)" : C.div}`,
            transition:"background .3s,border-color .3s",
          }}>
            <div style={{
              position:"absolute",top:3,
              left:notifs?22:3,
              width:20,height:20,borderRadius:"50%",
              background:notifs?"#fff":C.textDD,
              transition:"left .25s cubic-bezier(.16,1,.3,1)",
              boxShadow:"0 1px 6px rgba(0,0,0,0.18)",
            }}/>
          </div>
        </div>

        {/* Deity preference row */}
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.divL}`}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
            <div style={{width:42,height:42,borderRadius:13,background:C.bg3,border:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="17" height="17" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            </div>
            <span style={{fontSize:14,fontWeight:600,color:C.creamM}}>Favourite Deity</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7,paddingLeft:56}}>
            {["All","Shiva","Vishnu","Devi","Ganesha","Murugan","Hanuman"].map(d => (
              <button key={d} className="t" onClick={() => { setDeity(d); save({deity:d}); }} style={{
                padding:"6px 14px",borderRadius:99,fontSize:11,fontWeight:700,cursor:"pointer",
                background:deity===d ? C.saffronDim : C.bg3,
                color:deity===d ? C.saffron : C.textD,
                border:`1.5px solid ${deity===d ? "rgba(212,133,60,0.4)" : C.divL}`,
                transition:"all .2s",
              }}>{d}</button>
            ))}
          </div>
        </div>

        {/* About row */}
        <div className="t" onClick={() => nav("about")} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",cursor:"pointer"}}>
          <div style={{width:42,height:42,borderRadius:13,background:C.bg3,border:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="17" height="17" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:C.creamM}}>About Sacred Temples</div>
            <div style={{fontSize:11,color:C.textD,marginTop:2}}>Our story · Version 1.0</div>
          </div>
          <span style={{color:C.textDD,fontSize:16}}>→</span>
        </div>
      </div>

      {/* Sign Out */}
      <div style={{padding:"20px 24px 0"}}>
        <button className="t" onClick={() => { localStorage.removeItem(LS_KEY); setUser({}); setEditing(false); }} style={{
          width:"100%",padding:"14px",borderRadius:18,
          background:"rgba(239,68,68,0.07)",border:"1.5px solid rgba(239,68,68,0.18)",
          color:"#ef4444",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:.3,
          fontFamily:FB,
        }}>Sign Out</button>
      </div>
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━ DISCOVER (SWIPE MODE) ━━━━━━━━━━━━━━━━━━━

const Discover = ({temples, oT, onBack}) => {
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState({x:0, y:0, active:false});
  const [flyDir, setFlyDir] = useState(null); // 'right' | 'left' | null
  const startRef = useRef({x:0, y:0});
  const [px, py] = useParallax();

  const progress = Math.min(1, Math.abs(drag.x) / 120);
  const top = temples[idx];
  const second = temples[idx+1];
  const third = temples[idx+2];

  const onStart = (cx, cy) => {
    startRef.current = {x:cx, y:cy};
    setDrag({x:0, y:0, active:true});
  };
  const onMove = (cx, cy) => {
    if (!drag.active) return;
    const newX = cx - startRef.current.x;
    const newY = cy - startRef.current.y;
    // Haptic pulse exactly when crossing the save/skip threshold
    if ((Math.abs(drag.x) < 110) !== (Math.abs(newX) < 110)) haptic(18);
    setDrag(d => ({...d, x:newX, y:newY}));
  };
  const onEnd = () => {
    if (!drag.active) return;
    if (drag.x > 110) setFlyDir('right');
    else if (drag.x < -110) setFlyDir('left');
    else if (drag.y < -90) { oT(top); setDrag({x:0,y:0,active:false}); }
    else setDrag({x:0,y:0,active:false});
  };
  const afterFly = () => {
    setFlyDir(null);
    setDrag({x:0,y:0,active:false});
    setIdx(i => i+1);
  };

  if (!top) return (
    <div style={{height:'100vh',background:C.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 32px',position:'relative',overflow:'hidden'}}>
      {/* Ambient glow */}
      <div style={{position:'absolute',top:'40%',left:'50%',width:320,height:320,borderRadius:'50%',background:'radial-gradient(circle,rgba(212,133,60,0.08),transparent 60%)',transform:'translate(-50%,-50%)',filter:'blur(50px)',animation:'breathe 5s ease-in-out infinite',pointerEvents:'none'}}/>
      {/* Rings */}
      {[200,148,100].map((r,i) => (
        <div key={i} style={{position:'absolute',top:'42%',left:'50%',width:r,height:r,borderRadius:'50%',border:`1px solid rgba(212,133,60,${0.06+i*0.04})`,transform:'translate(-50%,-50%)',animation:`breathe ${7+i*2}s ease-in-out infinite ${i*.7}s`,pointerEvents:'none'}}/>
      ))}
      {[0,1,2].map(i => (
        <div key={`rp${i}`} style={{position:'absolute',top:'42%',left:'50%',width:140,height:140,borderRadius:'50%',border:'1.5px solid rgba(212,133,60,0.12)',transform:'translate(-50%,-50%)',animation:`ringExpand 3.4s ease-out infinite ${i*1.13}s`,pointerEvents:'none'}}/>
      ))}
      {/* OM */}
      <OmSymbol size={112} style={{marginBottom:28}} />
      {/* Text */}
      <h2 className="rv" style={{fontFamily:FD,fontSize:28,color:C.cream,textAlign:'center',lineHeight:1.25,position:'relative',zIndex:2,animationDelay:'.1s'}}>Sacred Journey<br/>Complete</h2>
      <p className="rv" style={{fontSize:13,color:C.textD,textAlign:'center',lineHeight:1.85,maxWidth:270,marginTop:14,position:'relative',zIndex:2,animationDelay:'.18s'}}>
        You've journeyed through {temples.length} sacred temples.<br/>May the divine bless your path.
      </p>
      {/* Stats row */}
      <div className="rv" style={{display:'flex',gap:0,marginTop:28,borderRadius:18,background:C.card,border:`1px solid ${C.div}`,overflow:'hidden',position:'relative',zIndex:2,animationDelay:'.26s'}}>
        {[{v:temples.length,l:'Explored'},{v:temples.filter(x=>x.isFavorite).length,l:'Saved'}].map((s,i) => (
          <div key={s.l} style={{textAlign:'center',padding:'16px 32px',position:'relative'}}>
            {i>0 && <div style={{position:'absolute',left:0,top:'20%',bottom:'20%',width:1,background:C.divL}}/>}
            <div style={{fontFamily:FD,fontSize:26,fontWeight:500,color:C.saffron}}>{s.v}</div>
            <div style={{fontSize:9.5,color:C.textD,fontWeight:700,letterSpacing:1,marginTop:4,textTransform:'uppercase'}}>{s.l}</div>
          </div>
        ))}
      </div>
      <button className="t rv" onClick={onBack} style={{marginTop:28,padding:'14px 44px',borderRadius:18,background:`linear-gradient(120deg,${C.saffron},${C.saffronH})`,color:'#fff',border:'none',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:FB,boxShadow:'0 6px 28px rgba(212,133,60,0.38)',letterSpacing:.4,position:'relative',zIndex:2,animationDelay:'.34s'}}>
        Return to Home
      </button>
    </div>
  );

  const tx = flyDir==='right'?650 : flyDir==='left'?-650 : drag.x;
  const ty = flyDir ? -40 : drag.y * 0.22;
  const rot = flyDir==='right'?14 : flyDir==='left'?-14 : drag.x * 0.055;
  const saving = !flyDir && drag.x > 70;
  const skipping = !flyDir && drag.x < -70;

  const cardBase = {
    position:'absolute', left:20, right:20, top:0, bottom:0,
    borderRadius:28, overflow:'hidden',
  };

  return (
    <div style={{height:'100vh',background:C.bg,display:'flex',flexDirection:'column',overflow:'hidden',userSelect:'none'}}>
      {/* Header */}
      <div style={{padding:'20px 24px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <BackBtn onClick={onBack}/>
        <div style={{textAlign:'center'}}>
          <h1 style={{fontFamily:FD,fontSize:22,fontWeight:500,color:C.cream}}>Discover</h1>
          <div style={{fontSize:10,color:C.textD,marginTop:2,letterSpacing:.5}}>{idx+1} of {temples.length}</div>
        </div>
        {/* Progress arc */}
        <div style={{width:46,height:46,borderRadius:'50%',background:C.saffronDim,border:`1px solid rgba(212,133,60,0.15)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:C.saffron}}>{Math.round(idx/temples.length*100)}%</div>
      </div>

      {/* Card stack */}
      <div style={{flex:1,position:'relative',margin:'0 0 8px'}}>
        {/* Swipe direction background color pulse */}
        <div style={{
          position:'absolute',inset:0,pointerEvents:'none',borderRadius:28,zIndex:0,
          background: drag.x > 0
            ? `rgba(34,197,94,${Math.min(0.13, drag.x / 850)})`
            : drag.x < 0
            ? `rgba(239,68,68,${Math.min(0.13, -drag.x / 850)})`
            : 'transparent',
          transition: drag.active ? 'none' : 'background 0.45s ease',
        }}/>
        {/* 3rd card — simple gradient peek */}
        {third && (
          <div style={{...cardBase,background:`linear-gradient(165deg,${hsl(third.hue,40,16)},${hsl(third.hue,50,4)})`,transform:`translateY(${20-progress*10}px) scale(${0.88+progress*0.06})`,transition:flyDir?'transform 0.45s cubic-bezier(.16,1,.3,1)':'transform 0.18s',zIndex:1,opacity:0.65}}>
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FD,fontSize:52,color:'rgba(212,133,60,0.07)'}}>ॐ</div>
          </div>
        )}
        {/* 2nd card — loads photo */}
        {second && (
          <div style={{...cardBase,transform:`translateY(${10-progress*10}px) scale(${0.94+progress*0.06})`,transition:flyDir?'transform 0.45s cubic-bezier(.16,1,.3,1)':'transform 0.18s',zIndex:2}}>
            <TempleImage src={`https://source.unsplash.com/400x700/?${deityQuery(second.deityPrimary)}&sig=${second.id}`} hue={second.hue} style={{position:'absolute',inset:0,width:'100%',height:'100%'}} omSize={60}/>
            <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'100px 22px 22px',background:'linear-gradient(transparent,rgba(0,0,0,0.88))'}}>
              <h3 style={{fontFamily:FD,fontSize:20,fontWeight:500,color:'#fff',lineHeight:1.1}}>{second.templeName}</h3>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:5}}>{second.townOrCity}</div>
            </div>
          </div>
        )}
        {/* Top card — draggable with parallax */}
        <div
          style={{
            ...cardBase, zIndex:3,
            transform:`translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg)`,
            transition: flyDir ? 'transform 0.48s cubic-bezier(.16,1,.3,1)' : (drag.active ? 'none' : 'transform 0.32s cubic-bezier(.16,1,.3,1)'),
            boxShadow:'0 28px 90px rgba(0,0,0,0.55)',
            cursor: drag.active ? 'grabbing' : 'grab',
          }}
          onTouchStart={e => onStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={e => onMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={onEnd}
          onMouseDown={e => onStart(e.clientX, e.clientY)}
          onMouseMove={e => drag.active && onMove(e.clientX, e.clientY)}
          onMouseUp={onEnd}
          onMouseLeave={() => drag.active && onEnd()}
          onTransitionEnd={e => { if (flyDir && e.propertyName === 'transform') afterFly(); }}
        >
          <TempleImage src={`https://source.unsplash.com/400x700/?${deityQuery(top.deityPrimary)}`} hue={top.hue} style={{position:'absolute',inset:0,width:'100%',height:'100%'}} omSize={72} px={px} py={py}/>
          {/* SAVED badge — proportional spring */}
          {(() => { const p = Math.max(0, Math.min(1, (drag.x - 55) / 60)); const sc = 0.55 + p * 0.55; return (
          <div style={{position:'absolute',top:32,left:20,padding:'9px 22px',borderRadius:14,background:'rgba(34,197,94,0.92)',backdropFilter:'blur(8px)',border:'2.5px solid rgba(255,255,255,0.55)',fontSize:16,fontWeight:800,color:'#fff',letterSpacing:.8,transform:`rotate(-10deg) scale(${flyDir==='right'?1:sc})`,opacity:flyDir==='right'?1:p,transition:drag.active?'none':'all 0.32s cubic-bezier(.16,1,.3,1)',pointerEvents:'none'}}>
            SAVED ♥
          </div>);})()}
          {/* SKIP badge — proportional spring */}
          {(() => { const p = Math.max(0, Math.min(1, (-drag.x - 55) / 60)); const sc = 0.55 + p * 0.55; return (
          <div style={{position:'absolute',top:32,right:20,padding:'9px 22px',borderRadius:14,background:'rgba(239,68,68,0.92)',backdropFilter:'blur(8px)',border:'2.5px solid rgba(255,255,255,0.55)',fontSize:16,fontWeight:800,color:'#fff',letterSpacing:.8,transform:`rotate(10deg) scale(${flyDir==='left'?1:sc})`,opacity:flyDir==='left'?1:p,transition:drag.active?'none':'all 0.32s cubic-bezier(.16,1,.3,1)',pointerEvents:'none'}}>
            SKIP ✕
          </div>);})()}
          {/* Deity badge — top center */}
          <div style={{position:'absolute',top:18,left:'50%',transform:'translateX(-50%)',zIndex:5,pointerEvents:'none'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 14px',borderRadius:100,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.14)',fontSize:10,color:'rgba(255,255,255,0.92)',fontWeight:700,letterSpacing:.7,whiteSpace:'nowrap'}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#E69A52',boxShadow:'0 0 8px rgba(212,133,60,0.8)'}}/>{top.deityPrimary}
            </div>
          </div>
          {/* Info overlay */}
          <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'140px 24px 30px',background:'linear-gradient(transparent,rgba(0,0,0,0.45) 25%,rgba(0,0,0,0.92) 100%)',pointerEvents:'none'}}>
            <h2 style={{fontFamily:FD,fontSize:30,fontWeight:500,color:'#fff',lineHeight:1.1,marginBottom:8,textShadow:'0 2px 20px rgba(0,0,0,0.5)'}}>{top.templeName}</h2>
            <div style={{fontSize:12.5,color:'rgba(255,255,255,0.45)',display:'flex',alignItems:'center',gap:5,marginBottom:6}}>
              <div style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,0.3)'}}/>{top.townOrCity}, {top.stateOrUnionTerritory}
            </div>
            {top.architectureStyle && <div style={{fontSize:11.5,color:'rgba(255,255,255,0.22)',fontFamily:FD,fontStyle:'italic'}}>{top.architectureStyle}</div>}
            <div style={{marginTop:16,display:'flex',justifyContent:'center',alignItems:'center',gap:8}}>
              <div style={{width:24,height:1.5,borderRadius:1,background:'rgba(255,255,255,0.15)'}}/>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.22)',letterSpacing:.6}}>swipe up to explore</span>
              <div style={{width:24,height:1.5,borderRadius:1,background:'rgba(255,255,255,0.15)'}}/>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:22,padding:'6px 24px 38px',flexShrink:0}}>
        <button className="t" onClick={() => { if (!flyDir) setFlyDir('left'); }} style={{width:64,height:64,borderRadius:'50%',background:C.card,border:`1px solid ${C.div}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,cursor:'pointer',boxShadow:'0 4px 24px rgba(0,0,0,0.15)',color:'#ef4444'}}>✕</button>
        <button className="t" onClick={() => oT(top)} style={{width:50,height:50,borderRadius:'50%',background:C.bg3,border:`1px solid ${C.divL}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,cursor:'pointer',color:C.textM}}>↑</button>
        <button className="t" onClick={() => { if (!flyDir) setFlyDir('right'); }} style={{width:64,height:64,borderRadius:'50%',background:'rgba(212,133,60,0.1)',border:`1.5px solid rgba(212,133,60,0.3)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,cursor:'pointer',color:C.saffron,boxShadow:`0 4px 28px rgba(212,133,60,0.18)`}}>♥</button>
      </div>
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━ SARATHI CHATBOT ━━━━━━━━━━━━━━━━━━━

const SARATHI_SYSTEM_PROMPT = `You are Sarathi (सारथी), a wise and knowledgeable divine guide for the Sacred Temples of India app. Your name means "divine charioteer" in Sanskrit — just as Lord Krishna guided Arjuna, you guide devotees and travellers through India's sacred heritage.

Your expertise covers:
• Temple history, mythology, and architecture (Dravidian, Nagara, Vesara, Hoysala, etc.)
• The 12 Jyotirlingas, 51 Shakti Peethas, 108 Divya Desams, Char Dham, Pancha Bhuta Stalas
• Pilgrimage circuits, travel routes, transport options (rail, road, air), accommodation
• Rituals, puja types, festival calendars, darshan timings, dress codes, offerings
• Sanskrit mantras and shloka meanings
• Temple etiquette, visitor guidelines, best seasons to visit
• Regional cuisines, prasad specialties, nearby attractions

Tone: Warm, reverent, knowledgeable — like a learned temple priest who is also a well-travelled guide. Use gentle Sanskrit terms where appropriate (Namaste, Darshan, Prasad, etc.). Keep responses concise but meaningful. Use bullet points or numbered lists for routes/steps. When asked about a specific temple, provide rich context including mythology, architecture, and travel guidance. Always end pilgrimage guidance with a brief blessing or auspicious note.

IMPORTANT: When you receive a context block labeled [TEMPLE DATA FROM DATABASE], use that real data in your response. Present the information in clearly structured sections using **bold headers** such as:
**🛕 Temple Overview**
**📍 Location & How to Reach**
**🕐 Darshan Timings**
**🎪 Festivals & Significance**
**🏛️ Architecture & History**
**📝 Special Notes**
Only include sections for which data is available. Do not fabricate data fields that are not provided. If multiple temples match, present each briefly. If the database provides data, always prefer it over general knowledge.

Respond in English unless the user writes in another language. Do not make up specific temple facts you are unsure about — acknowledge uncertainty gracefully.`;

const SUGGESTIONS_DEFAULT = [
  { icon: '🛕', label: 'Famous temples to visit' },
  { icon: '🕐', label: 'Temple timings' },
  { icon: '🏛️', label: 'Famous temples in Tamil Nadu' },
  { icon: '🗺️', label: 'Route to Tirupati temple' },
  { icon: '🎪', label: 'Festivals and significance' },
  { icon: '🕉️', label: 'What are the 12 Jyotirlingas?' },
];

/* Search temples dataset by matching user query against key fields */
const searchTemples = (temples, query) => {
  if (!temples || !temples.length || !query) return [];
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 1);
  const scored = temples.map(t => {
    let score = 0;
    const fields = [
      t.templeName, t.deityPrimary, t.deitySecondary,
      t.townOrCity, t.village, t.district,
      t.stateOrUnionTerritory, t.nearestCity,
      t.architectureStyle, t.majorFestivals,
      t.historicalSignificance, t.specialNotes,
    ].map(f => (f || '').toLowerCase());
    const all = fields.join(' ');
    // Exact phrase match in name gets highest score
    if ((t.templeName || '').toLowerCase().includes(q)) score += 50;
    // Exact phrase in any field
    if (all.includes(q)) score += 20;
    // Word-by-word matching
    words.forEach(w => {
      if ((t.templeName || '').toLowerCase().includes(w)) score += 10;
      if ((t.deityPrimary || '').toLowerCase().includes(w)) score += 8;
      if ((t.stateOrUnionTerritory || '').toLowerCase().includes(w)) score += 6;
      if ((t.townOrCity || '').toLowerCase().includes(w)) score += 6;
      if ((t.district || '').toLowerCase().includes(w)) score += 5;
      if (all.includes(w)) score += 2;
    });
    return { temple: t, score };
  }).filter(r => r.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map(r => r.temple);
};

/* Format temple data into a structured text block for the AI prompt */
const formatTempleData = (temple) => {
  const lines = [];
  lines.push(`Temple: ${temple.templeName}`);
  if (temple.deityPrimary) lines.push(`Primary Deity: ${temple.deityPrimary}`);
  if (temple.deitySecondary) lines.push(`Secondary Deity: ${temple.deitySecondary}`);
  const loc = [temple.village, temple.townOrCity, temple.district, temple.stateOrUnionTerritory].filter(Boolean).join(', ');
  if (loc) lines.push(`Location: ${loc}`);
  if (temple.latitude && temple.longitude) lines.push(`Coordinates: ${temple.latitude}, ${temple.longitude}`);
  if (temple.nearestCity) lines.push(`Nearest City: ${temple.nearestCity}`);
  if (temple.nearestRailwayStation) lines.push(`Nearest Railway Station: ${temple.nearestRailwayStation}`);
  if (temple.nearestAirport) lines.push(`Nearest Airport: ${temple.nearestAirport}`);
  if (temple.routeSummary) lines.push(`Route: ${temple.routeSummary}`);
  if (temple.darshanTimings) lines.push(`Darshan Timings: ${temple.darshanTimings}`);
  if (temple.majorFestivals) lines.push(`Major Festivals: ${temple.majorFestivals}`);
  if (temple.architectureStyle) lines.push(`Architecture: ${temple.architectureStyle}`);
  if (temple.historicalSignificance) lines.push(`Historical Significance: ${temple.historicalSignificance}`);
  if (temple.specialNotes) lines.push(`Special Notes: ${temple.specialNotes}`);
  return lines.join('\n');
};

// Simple markdown → React renderer (bold, code, line breaks)
const renderMd = (text) => {
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    const rendered = parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2,-2)}</strong>;
      if (p.startsWith('`') && p.endsWith('`')) return <code key={i} style={{background:'rgba(212,133,60,0.15)',padding:'1px 5px',borderRadius:4,fontSize:'0.88em',fontFamily:'monospace'}}>{p.slice(1,-1)}</code>;
      return p;
    });
    return <span key={li}>{rendered}{li < lines.length - 1 ? <br/> : null}</span>;
  });
};

/* Sarathi sacred Om hero — shown in welcome state */
const SarathiOmHero = () => (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'28px 0 12px',position:'relative'}}>
    {/* Aura rings */}
    <div style={{position:'absolute',top:'50%',left:'50%',width:140,height:140,borderRadius:'50%',background:'radial-gradient(circle,rgba(212,133,60,0.10),transparent 70%)',transform:'translate(-50%,-50%)',animation:'sarathiAura 4s ease-in-out infinite',pointerEvents:'none'}}/>
    <div style={{position:'absolute',top:'50%',left:'50%',width:110,height:110,borderRadius:'50%',border:'1.5px solid rgba(212,133,60,0.15)',animation:'sarathiRingPulse 3.5s ease-out infinite',pointerEvents:'none'}}/>
    <div style={{position:'absolute',top:'50%',left:'50%',width:110,height:110,borderRadius:'50%',border:'1px solid rgba(212,133,60,0.1)',animation:'sarathiRingPulse 3.5s ease-out 1.2s infinite',pointerEvents:'none'}}/>
    {/* Om symbol */}
    <span aria-label="Om — sacred divine presence" style={{
      fontFamily:"'Noto Serif Devanagari', serif",
      fontSize:72,
      lineHeight:1,
      color:C.saffron,
      animation:'sarathiBreathe 5s ease-in-out infinite, sarathiGlow 5s ease-in-out infinite',
      userSelect:'none',
      position:'relative',
      zIndex:2,
    }}>ॐ</span>
    <div style={{marginTop:10,fontSize:13,color:C.textM,fontFamily:FD,fontWeight:500,letterSpacing:.5}}>
      Sarathi is ready to guide you
    </div>
  </div>
);

/* Enhanced thinking indicator */
const SarathiThinking = () => (
  <div style={{display:'flex',justifyContent:'flex-start',alignItems:'flex-end',gap:8,animation:'fi .3s ease both'}}>
    <div style={{width:30,height:30,borderRadius:10,background:`linear-gradient(135deg,rgba(212,133,60,0.22),rgba(212,133,60,0.08))`,border:`1px solid rgba(212,133,60,0.2)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><OmSvg size={17}/></div>
    <div style={{padding:'12px 20px',borderRadius:'4px 18px 18px 18px',background:C.card,border:`1px solid ${C.div}`,display:'flex',alignItems:'center',gap:10}}>
      <div style={{display:'flex',alignItems:'center',gap:5}}>
        {[0,1,2].map(i => <div key={i} style={{width:7,height:7,borderRadius:'50%',background:C.saffron,opacity:.5,animation:`soundWave 1.2s ease-in-out infinite ${i*.18}s`}}/>)}
      </div>
      <span style={{fontSize:11,color:C.textD,fontFamily:FB,fontStyle:'italic'}}>Sarathi is contemplating…</span>
    </div>
  </div>
);

const Chat = ({onBack, temple, temples, isDark, onToggleTheme}) => {
  const greeting = temple
    ? `Namaste 🙏 I'm **Sarathi**, your divine guide. You're exploring **${temple.templeName}** in ${temple.townOrCity || temple.stateOrUnionTerritory}. Ask me anything — history, rituals, travel routes, or nearby temples.`
    : `Namaste 🙏 I'm **Sarathi**, your divine guide to the sacred temples of Bhārata. I can help with temple history, pilgrimage routes, darshan timings, festivals, travel directions, and much more. What would you like to know?`;

  const [msgs, setMsgs] = useState([{role:'assistant', text: greeting}]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const endRef = useRef(null);
  const taRef = useRef(null);

  const suggestions = temple ? [
    { icon: '🛕', label: `Tell me about ${temple.templeName}` },
    { icon: '🗺️', label: `How to reach ${temple.townOrCity || temple.stateOrUnionTerritory}` },
    { icon: '🎪', label: 'Festivals celebrated here' },
    { icon: '🕐', label: 'Darshan timings and tips' },
  ] : SUGGESTIONS_DEFAULT;

  const hasUserMsg = msgs.some(m => m.role === 'user');

  useEffect(() => { endRef.current?.scrollIntoView({behavior:'smooth'}); }, [msgs, isLoading]);

  const autoResize = (el) => { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; };

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || isLoading) return;
    haptic(15);
    const nextMsgs = [...msgs, {role:'user', text: q}];
    setMsgs(nextMsgs);
    setInput('');
    if (taRef.current) { taRef.current.style.height = 'auto'; }
    setIsLoading(true);

    // Search local temple data for relevant matches
    const allTemples = temples || [];
    let matchedTemples = [];
    if (temple) {
      // Always include current temple context
      matchedTemples = [temple];
      // Also search for additional matches if query mentions other temples
      const extra = searchTemples(allTemples, q).filter(t => (t.id || t.templeName) !== (temple.id || temple.templeName));
      matchedTemples = matchedTemples.concat(extra.slice(0, 3));
    } else {
      matchedTemples = searchTemples(allTemples, q);
    }

    // Build enriched system prompt with matched data
    let enrichedPrompt = SARATHI_SYSTEM_PROMPT;
    if (matchedTemples.length > 0) {
      const dataBlock = matchedTemples.map(t => formatTempleData(t)).join('\n---\n');
      enrichedPrompt += `\n\n[TEMPLE DATA FROM DATABASE]\nThe following real temple records matched the user's query. Use this data in your response:\n\n${dataBlock}`;
    }

    try {
      const contents = nextMsgs.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{text: m.text}],
      }));
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            system_instruction: {parts: [{text: enrichedPrompt}]},
            contents,
          }),
        }
      );
      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      setMsgs(prev => [...prev, {role:'assistant', text: reply || '🙏 Sarathi could not respond. Please try again.'}]);
    } catch (e) {
      // Fallback: present local data if available when API fails
      if (matchedTemples.length > 0) {
        const fallback = matchedTemples.map(t => {
          const parts = [`**🛕 ${t.templeName}**`];
          if (t.deityPrimary) parts.push(`**Deity:** ${t.deityPrimary}`);
          const loc = [t.townOrCity, t.district, t.stateOrUnionTerritory].filter(Boolean).join(', ');
          if (loc) parts.push(`**📍 Location:** ${loc}`);
          if (t.darshanTimings) parts.push(`**🕐 Timings:** ${t.darshanTimings}`);
          if (t.majorFestivals) parts.push(`**🎪 Festivals:** ${t.majorFestivals}`);
          if (t.routeSummary) parts.push(`**🗺️ Route:** ${t.routeSummary}`);
          if (t.historicalSignificance) parts.push(`**🏛️ History:** ${t.historicalSignificance}`);
          if (t.specialNotes) parts.push(`**📝 Notes:** ${t.specialNotes}`);
          return parts.join('\n');
        }).join('\n\n---\n\n');
        setMsgs(prev => [...prev, {role:'assistant', text:`🙏 I couldn't reach the cloud, but here's what I found in our temple records:\n\n${fallback}`}]);
      } else {
        setMsgs(prev => [...prev, {role:'assistant', text:'🙏 Unable to reach Sarathi right now. Please check your connection and try again.'}]);
      }
    }
    setIsLoading(false);
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:C.bg,position:'relative'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px 12px',background:C.glass,backdropFilter:'blur(20px)',borderBottom:`1px solid ${C.divL}`,flexShrink:0,position:'sticky',top:0,zIndex:60}}>
        <BackBtn onClick={onBack}/>
        <div style={{width:48,height:48,borderRadius:14,background:`linear-gradient(135deg,rgba(212,133,60,0.25),rgba(212,133,60,0.10))`,border:`1px solid rgba(212,133,60,0.3)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 0 20px rgba(212,133,60,0.12)'}}>
          <span aria-label="Om — sacred symbol" style={{fontFamily:"'Noto Serif Devanagari', serif",fontSize:26,color:C.saffron,lineHeight:1,animation:'sarathiBreathe 5s ease-in-out infinite'}}>ॐ</span>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <span style={{fontSize:16,fontWeight:700,color:C.text,fontFamily:FD}}>Sarathi</span>
            <span style={{fontSize:10,color:C.saffron,fontWeight:600,letterSpacing:1,fontFamily:FB,opacity:.8}}>सारथी</span>
            <div style={{width:7,height:7,borderRadius:'50%',background:'#4ade80',boxShadow:'0 0 8px rgba(74,222,128,0.6)',flexShrink:0,animation:'glow 2s ease-in-out infinite'}}/>
          </div>
          <div style={{fontSize:11,color:C.textD,marginTop:2}}>{GEMINI_KEY ? 'Live · Divine guide powered by Gemini' : 'Divine guide · AI key not configured'}</div>
        </div>
        <button className="t" onClick={onToggleTheme} style={{width:36,height:36,borderRadius:11,background:C.bg3,border:`1px solid ${C.div}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
          {isDark
            ? <svg width="15" height="15" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            : <svg width="15" height="15" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          }
        </button>
      </div>

      {/* Temple context pill */}
      {temple && (
        <div style={{padding:'10px 18px 0',flexShrink:0}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:7,padding:'6px 14px',borderRadius:100,background:C.saffronDim,border:`1px solid rgba(212,133,60,0.18)`}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:C.saffron}}/>
            <span style={{fontSize:11,color:C.saffron,fontWeight:600}}>{temple.templeName}</span>
            <span style={{fontSize:10,color:C.textD,fontWeight:400}}>· {temple.stateOrUnionTerritory}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'14px 16px 8px',display:'flex',flexDirection:'column',gap:10}}>
        {/* Sacred Om hero before any user messages */}
        {!hasUserMsg && <SarathiOmHero/>}

        {msgs.map((m, i) => (
          <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',alignItems:'flex-end',gap:8}}>
            {m.role === 'assistant' && (
              <div style={{width:30,height:30,borderRadius:10,background:`linear-gradient(135deg,rgba(212,133,60,0.22),rgba(212,133,60,0.08))`,border:`1px solid rgba(212,133,60,0.2)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginBottom:2}}><OmSvg size={17}/></div>
            )}
            <div style={{
              maxWidth:'82%',
              padding:m.role==='user'?'10px 14px':'12px 16px',
              borderRadius:m.role==='user'?'18px 18px 4px 18px':'4px 18px 18px 18px',
              background:m.role==='user'?`linear-gradient(135deg,${C.saffron},${C.saffronH})`:`${C.card}`,
              border:m.role==='user'?'none':`1px solid ${C.div}`,
              boxShadow:m.role==='user'?`0 3px 16px rgba(212,133,60,0.25)`:`0 2px 12px rgba(0,0,0,0.08)`,
            }}>
              <div style={{fontSize:13.5,color:m.role==='user'?'#fff':C.text,lineHeight:1.8,fontFamily:FB}}>
                {renderMd(m.text)}
              </div>
            </div>
          </div>
        ))}
        {isLoading && <SarathiThinking/>}
        <div ref={endRef}/>
      </div>

      {/* Suggestion chips */}
      {!hasUserMsg && (
        <div style={{padding:'6px 16px 10px',flexShrink:0,display:'flex',gap:8,flexWrap:'wrap'}}>
          {suggestions.map((s, idx) => (
            <button
              key={s.label}
              className="t"
              onClick={() => send(s.label)}
              style={{
                padding:'8px 14px',
                borderRadius:100,
                background:`linear-gradient(135deg,${C.bg3},${C.card})`,
                border:`1px solid ${C.div}`,
                fontSize:12,
                color:C.textM,
                cursor:'pointer',
                fontFamily:FB,
                fontWeight:500,
                whiteSpace:'nowrap',
                display:'flex',
                alignItems:'center',
                gap:6,
                animation:`sarathiChipIn .4s cubic-bezier(.22,1,.36,1) ${idx * .06}s both`,
                boxShadow:`0 1px 6px rgba(0,0,0,0.06)`,
              }}
            >
              <span style={{fontSize:13}}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div style={{padding:'10px 14px 28px',flexShrink:0,background:C.glass,backdropFilter:'blur(20px)',borderTop:`1px solid ${C.divL}`}}>
        <div style={{display:'flex',alignItems:'flex-end',gap:10,background:C.bg3,borderRadius:22,border:`1.5px solid ${input.trim() ? C.saffron+'60' : C.div}`,padding:'10px 12px',transition:'border-color .2s'}}>
          <textarea
            ref={taRef}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize(e.target); }}
            onKeyDown={onKey}
            placeholder="Ask about temples, routes, timings, festivals…"
            rows={1}
            style={{flex:1,background:'none',border:'none',outline:'none',resize:'none',fontFamily:FB,fontSize:13.5,color:C.text,lineHeight:1.55,minHeight:22,maxHeight:120,padding:0}}
          />
          <button
            className="t"
            onClick={() => send()}
            disabled={!input.trim() || isLoading}
            style={{width:38,height:38,borderRadius:12,background:(input.trim()&&!isLoading)?`linear-gradient(135deg,${C.saffron},${C.saffronH})`:`${C.bg2}`,border:'none',cursor:(input.trim()&&!isLoading)?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .2s',boxShadow:(input.trim()&&!isLoading)?`0 3px 14px rgba(212,133,60,0.35)`:'none'}}
          >
            <svg width="15" height="15" fill="none" stroke={(input.trim()&&!isLoading)?'#fff':C.textDD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </button>
        </div>
        <div style={{textAlign:'center',marginTop:7,fontSize:10,color:C.textDD,letterSpacing:.5}}>Powered by Google Gemini</div>
      </div>
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━ APP SHELL ━━━━━━━━━━━━━━━━━━━

export default function App() {
  const [scr, setScr] = useState("home");
  const [tmp, setTmp] = useState(null);
  const [stk, setStk] = useState(["home"]);
  const [temples, setTemples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');
  const [navDir, setNavDir] = useState('none');
  const [pageKey, setPageKey] = useState(0);
  const [toast, setToast] = useState({msg:'',icon:'✓',visible:false});
  const toastTimer = useRef(null);
  const { getIds: getRecentIds, addId: addRecentId } = useRecentlyViewed();
  const [recentIds, setRecentIds] = useState(() => getRecentIds());
  const ref = useRef(null);

  const showToast = useCallback((msg, icon='✓') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({msg, icon, visible:true});
    toastTimer.current = setTimeout(() => setToast(t => ({...t, visible:false})), 2400);
  }, []);

  // Keep module-level C in sync with current theme before every render
  C = isDark ? CDark : CLight;

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#1A1109' : '#FAFAF8');
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark(v => {
      const next = !v;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const fetchTemples = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase.from("temples").select("*");
    if (error) {
      // Try IndexedDB fallback
      const cached = await IDB.load();
      if (cached.length > 0) {
        setTemples(cached);
        setFetchError(null);
      } else {
        setFetchError(error.message || "Could not load temples. Please check your connection.");
      }
    } else if (data) {
      setTemples(data);
      IDB.save(data); // persist for offline use
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemples();
    initParallax();
  }, [fetchTemples]);

  const nav = useCallback(t => { setNavDir('forward'); setPageKey(k => k+1); setStk(p => [...p, t]); setScr(t); ref.current?.scrollTo({top:0,behavior:"instant"}); }, []);
  const back = useCallback(() => { setNavDir('back'); setPageKey(k => k+1); setStk(p => { const n = p.slice(0,-1); setScr(n[n.length-1] || "home"); return n.length ? n : ["home"]; }); setTmp(null); ref.current?.scrollTo({top:0,behavior:"instant"}); }, []);
  const backNoTmpReset = useCallback(() => { setNavDir('back'); setPageKey(k => k+1); setStk(p => { const n = p.slice(0,-1); setScr(n[n.length-1] || "home"); return n.length ? n : ["home"]; }); ref.current?.scrollTo({top:0,behavior:"instant"}); }, []);
  const oT = useCallback(t => {
    addRecentId(t.id);
    setRecentIds(getRecentIds());
    setTmp(t);
    nav("detail");
  }, [nav, addRecentId, getRecentIds]);
  const onTab = useCallback(t => { setNavDir('none'); setPageKey(k => k+1); setStk([t]); setScr(t); setTmp(null); ref.current?.scrollTo({top:0,behavior:"instant"}); }, []);

  // Favorites: optimistic update → Supabase persist → rollback on error
  const oF = useCallback(async (id, current) => {
    const next = !current;
    haptic(next ? 30 : 15);
    setTemples(prev => prev.map(t => t.id === id ? {...t, isFavorite: next} : t));
    showToast(next ? 'Saved to favourites' : 'Removed from saved', next ? '♥' : '♡');
    const { error } = await supabase.from("temples").update({ isFavorite: next }).eq("id", id);
    if (error) {
      console.error("Favorite update failed:", error.message);
      setTemples(prev => prev.map(t => t.id === id ? {...t, isFavorite: current} : t));
      showToast('Could not save. Try again.', '✕');
    }
  }, [showToast]);

  const tabs = ["home","explore","nearby","saved","profile"];
  const aTab = tabs.includes(scr) ? scr : [...stk].reverse().find(s => tabs.includes(s)) || "home";
  const showNav = !["detail","search","stateBrowse","districtBrowse","discover","about","chat","audio"].includes(scr);

  if (fetchError) return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 32px",textAlign:"center",position:"relative",overflow:"hidden"}}>
      <style>{getCss(C)}</style>
      <div style={{position:"absolute",top:"50%",left:"50%",width:360,height:360,borderRadius:"50%",background:"radial-gradient(circle,rgba(212,133,60,0.05),transparent 60%)",transform:"translate(-50%,-50%)",filter:"blur(55px)",pointerEvents:"none"}}/>
      <OmSymbol size={100}/>
      <h2 style={{fontFamily:FD,fontSize:26,color:C.cream,marginTop:32,marginBottom:12,fontWeight:500}}>Connection Lost</h2>
      <p style={{fontSize:13,color:C.textD,lineHeight:1.75,maxWidth:260,marginBottom:32}}>{fetchError}</p>
      <button className="t" onClick={fetchTemples} style={{padding:"13px 40px",borderRadius:16,background:`linear-gradient(135deg,${C.saffron},${C.saffronH})`,color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FB,boxShadow:`0 6px 28px rgba(212,133,60,0.35)`}}>Retry</button>
    </div>
  );

  const th = {isDark, onToggleTheme: toggleTheme};

  let page = null;
  if (scr === "home") page = <Home nav={nav} oT={oT} oF={oF} temples={temples} loading={loading} recentIds={recentIds} {...th}/>;
  else if (scr === "discover") page = <Discover temples={temples} oT={oT} onBack={back}/>;
  else if (scr === "explore") page = <Explore nav={nav} oT={oT} oF={oF} temples={temples} loading={loading} {...th}/>;
  else if (scr === "detail" && tmp) page = <Detail temple={tmp} onBack={back} oF={oF} nav={nav} {...th}/>;
  else if (scr === "chat") page = <Chat onBack={backNoTmpReset} temple={tmp} temples={temples} {...th}/>;
  else if (scr === "search") page = <Search oT={oT} oF={oF} onBack={back} temples={temples}/>;
  else if (scr === "stateBrowse") page = <StateBrowse nav={nav} onBack={back} onSelect={t => setTmp(t)} {...th}/>;
  else if (scr === "districtBrowse") page = <DistrictBrowse onBack={back} oT={oT} oF={oF} temples={temples} state={tmp} {...th}/>;
  else if (scr === "nearby") page = <Nearby oT={oT} oF={oF} temples={temples} loading={loading} {...th}/>;
  else if (scr === "saved") page = <Saved oT={oT} oF={oF} temples={temples} onBrowse={() => nav("explore")} {...th}/>;
  else if (scr === "profile") page = <Profile nav={nav} temples={temples} {...th}/>;
  else if (scr === "about") page = <About onBack={back} temples={temples} {...th}/>;
  else if (scr === "audio") page = <AudioGuide onBack={back} {...th}/>;
  else page = <Home nav={nav} oT={oT} oF={oF} temples={temples} loading={loading} {...th}/>;

  const transitionClass = navDir === 'forward' ? 'scrFwd' : navDir === 'back' ? 'scrBack' : '';

  return (
    <div>
      <style>{getCss(C)}</style>
      <a href="#main-content" className="skipLink">Skip to main content</a>
      <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:C.bg,position:"relative",boxShadow:"0 0 120px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column"}}>
        <main id="main-content" ref={ref} role="main" style={{flex:1,overflowY:"auto",overflowX:"hidden",paddingBottom:showNav?78:0}}>
          <div key={pageKey} className={transitionClass}>{page}</div>
        </main>
        <Toast msg={toast.msg} icon={toast.icon} visible={toast.visible}/>
        {/* Sarathi FAB — floats above BNav */}
        {showNav && (
          <button className="t" onClick={() => { haptic(20); nav("chat"); }} title="Ask Sarathi" aria-label="Ask Sarathi" style={{position:"absolute",bottom:88,right:18,width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.saffron},${C.saffronH})`,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:110,animation:'fabIn 0.45s cubic-bezier(.22,1,.36,1) both, fabPulse 3s ease-in-out 0.45s infinite'}}><OmSvg size={28} color="#fff"/></button>
        )}
        {showNav && <BNav a={aTab} on={onTab} savedCount={temples.filter(t=>t.isFavorite).length}/>}
      </div>
    </div>
  );
}
