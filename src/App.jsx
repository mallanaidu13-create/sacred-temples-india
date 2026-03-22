import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";

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
  {name:"Tamil Nadu",n:847,h:15},{name:"Andhra Pradesh",n:612,h:345},{name:"Karnataka",n:534,h:42},
  {name:"Kerala",n:421,h:140},{name:"Maharashtra",n:567,h:25},{name:"Gujarat",n:398,h:35},
  {name:"Rajasthan",n:389,h:20},{name:"Uttar Pradesh",n:445,h:30},{name:"Odisha",n:312,h:150},
  {name:"Telangana",n:287,h:10},
];

const DEITIES = [
  {name:"Shiva",sk:"शिव",n:1847,h:350,icon:"☽"},
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
.rv{animation:rv .55s cubic-bezier(.16,1,.3,1) both}
.fi{animation:fi .35s ease both}
.t{transition:transform .12s cubic-bezier(.16,1,.3,1)}.t:active{transform:scale(.96)}
::-webkit-scrollbar{width:0;height:0}
input{font-family:${FB}}
input::placeholder{color:${theme.textD}}
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
      {(!loaded || err) && (
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
              transition:`opacity ${loaded?'0':'1'}s ease, left 0.1s linear, top 0.1s linear`,
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

const PanchangWidget = () => (
  <div style={{margin:"28px 24px 0",borderRadius:22,overflow:"hidden",background:C.card,border:`1px solid ${C.div}`,boxShadow:`0 4px 20px rgba(212,133,60,0.06)`}}>
    <div style={{height:3,background:`linear-gradient(90deg,${C.saffron},${C.gold},transparent)`}}/>
    <div style={{padding:"16px 20px 18px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontFamily:FE,fontSize:13,color:C.textM,fontWeight:500,letterSpacing:.3}}>Today's Panchang</div>
        <div style={{fontSize:11,color:C.saffron,fontWeight:700,padding:"4px 12px",borderRadius:8,background:C.saffronDim,border:`1px solid rgba(212,133,60,0.1)`,fontFamily:FD}}>{PANCHANG.vara}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[
          {l:"Tithi",v:PANCHANG.tithi,e:"🌙"},
          {l:"Nakshatra",v:PANCHANG.nakshatra,e:"✦"},
          {l:"Yoga",v:PANCHANG.yoga,e:"◎"},
          {l:"Muhurta",v:PANCHANG.muhurta,e:"⊙"},
        ].map(p => (
          <div key={p.l} style={{padding:"12px 14px",borderRadius:14,background:C.saffronPale,border:`1px solid rgba(212,133,60,0.08)`}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <span style={{fontSize:16}}>{p.e}</span>
              <span style={{fontSize:9,color:C.textD,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase"}}>{p.l}</span>
            </div>
            <div style={{fontFamily:FE,fontSize:14,color:C.creamM,fontWeight:500,lineHeight:1.3}}>{p.v}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

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
  <button className="t" onClick={onClick} style={{
    padding:"9px 18px",borderRadius:100,fontFamily:FB,fontSize:12,fontWeight:active?700:500,
    cursor:"pointer",whiteSpace:"nowrap",letterSpacing:.3,
    background:active?C.saffron:C.card,color:active?C.bg:C.textM,
    border:active?"none":`1px solid ${C.div}`,
    boxShadow:active?"0 4px 20px rgba(212,133,60,0.3)":"none",
    transition:"all .2s cubic-bezier(.16,1,.3,1)",
  }}>{label}</button>
);

// ── Featured Card ──
const FCard = ({t, onClick, onFav, d=0}) => {
  const imgSrc = `https://source.unsplash.com/featured/400x600/?${deityQuery(t.deityPrimary)}&sig=${t.id}`;
  const [px, py] = useParallax();
  return (
    <div className="t rv" onClick={() => onClick(t)} style={{
      width:268,minWidth:268,height:360,borderRadius:26,overflow:"hidden",
      position:"relative",cursor:"pointer",flexShrink:0,scrollSnapAlign:"start",
      boxShadow:`0 16px 56px ${hsl(t.hue,30,5,0.6)}, 0 0 0 1px ${hsl(t.hue,30,20,0.12)}`,
      animationDelay:`${d}s`,
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
      {/* Fav — top right */}
      <div style={{position:"absolute",top:18,right:18,zIndex:3}}>
        <div className="t" onClick={e => { e.stopPropagation(); onFav?.(t.id, t.isFavorite); }} style={{width:38,height:38,borderRadius:12,background:t.isFavorite?"rgba(196,64,64,0.85)":"rgba(0,0,0,0.32)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${t.isFavorite?"rgba(196,64,64,0.4)":"rgba(255,255,255,0.1)"}`,fontSize:14,color:"#fff",transition:"all .3s",cursor:"pointer"}}>
          {t.isFavorite ? "♥" : "♡"}
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
  );
};

// ── List Card ──
const LCard = ({t, onClick, onFav, d=0}) => {
  const imgSrc = `https://source.unsplash.com/featured/180x180/?${deityQuery(t.deityPrimary)}&sig=${t.id}`;
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
        <div onClick={e => { e.stopPropagation(); onFav?.(t.id, t.isFavorite); }} style={{display:"flex",alignItems:"center",fontSize:15,color:t.isFavorite?C.red:C.textDD,padding:"8px 4px",cursor:"pointer",transition:"transform .12s"}}>{t.isFavorite?"♥":"♡"}</div>
      </div>
    </div>
  );
};

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

// Persistent theme toggle — used in every page header
const ThemeBtn = ({isDark, onToggle}) => (
  <button className="t" onClick={onToggle} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{
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
  <div className="fi" style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"80px 40px",textAlign:"center"}}>
    <div style={{width:96,height:96,borderRadius:"50%",background:C.saffronDim,border:`1px solid rgba(212,133,60,0.2)`,boxShadow:`0 0 32px rgba(212,133,60,0.08)`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:24,fontSize:38,position:"relative"}}>
      <span style={{position:"absolute",fontSize:72,fontFamily:FE,color:C.saffron,opacity:.07,userSelect:"none",lineHeight:1}}>ॐ</span>
      <span style={{position:"relative"}}>{emoji}</span>
    </div>
    <h3 style={{fontFamily:FE,fontSize:24,color:C.cream,marginBottom:10}}>{title}</h3>
    <p style={{fontSize:13,color:C.textD,lineHeight:1.7,maxWidth:260,marginBottom:action?24:0}}>{sub}</p>
    {action && <button className="t" onClick={action.onPress} style={{padding:"11px 28px",borderRadius:99,background:`linear-gradient(135deg,${C.saffron},${C.saffronH})`,border:"none",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 18px rgba(212,133,60,0.3)`}}>{action.label}</button>}
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
    <div style={{position:"sticky",bottom:0,zIndex:100,background:C.glass,backdropFilter:"blur(28px) saturate(160%)",borderTop:`1px solid ${C.div}`,display:"flex",justifyContent:"space-around",padding:"6px 0 20px"}}>
      {items.map(t => {
        const active = a === t.k;
        const col = active ? C.saffron : C.textDD;
        return (
          <button key={t.k} className="t" onClick={() => on(t.k)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"6px 14px",position:"relative"}}>
            {/* Top active indicator */}
            {active && <div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",width:24,height:3,borderRadius:2,background:C.saffron,boxShadow:`0 0 14px ${C.saffron}99`,transition:"all .3s cubic-bezier(.16,1,.3,1)"}}/>}
            <div style={{width:40,height:40,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",background:active?C.saffronDim:"transparent",transition:"all .25s cubic-bezier(.16,1,.3,1)",position:"relative"}}>
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
            <span style={{fontSize:9.5,fontWeight:active?700:500,color:col,letterSpacing:.6}}>{t.l}</span>
          </button>
        );
      })}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━ PAGES ━━━━━━━━━━━━━━━━━━━━━━━

const Home = ({nav, oT, oF, temples, isDark, onToggleTheme}) => {
  const { playing, toggle } = useOmChant();
  const [notified, setNotified] = useState(() => localStorage.getItem('premiumNotify') === '1');
  const onNotify = () => { localStorage.setItem('premiumNotify','1'); setNotified(true); };
  return (
  <div className="fi" style={{paddingBottom:28}}>
    {/* HERO */}
    <div style={{background:isDark?`linear-gradient(175deg,${hsl(30,48,13)},${hsl(350,42,10)} 55%,${C.bg})`:`linear-gradient(175deg,${hsl(30,60,94)},${hsl(350,50,97)} 55%,${C.bg})`,padding:"22px 24px 40px",borderRadius:"0 0 42px 42px",position:"relative",overflow:"hidden",boxShadow:isDark?`0 24px 80px ${hsl(350,30,7,0.55)}`:`0 24px 80px ${hsl(30,40,80,0.18)}`}}>
      {/* Ambient glows */}
      <div style={{position:"absolute",top:"-8%",right:"-12%",width:320,height:320,borderRadius:"50%",background:"radial-gradient(circle,rgba(212,133,60,0.07),transparent 60%)",filter:"blur(60px)",animation:"breathe 9s ease-in-out infinite",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"5%",left:"-18%",width:220,height:220,borderRadius:"50%",background:"radial-gradient(circle,rgba(160,80,180,0.04),transparent 60%)",filter:"blur(45px)",animation:"breathe 12s ease-in-out infinite 3s",pointerEvents:"none"}}/>

      {/* Top row */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,position:"relative",zIndex:2}}>
        <div>
          <div style={{fontSize:9,color:"rgba(212,133,60,0.45)",fontWeight:800,letterSpacing:5,textTransform:"uppercase",marginBottom:8}}>Discover</div>
          <h1 style={{fontFamily:FD,fontSize:36,color:C.cream,fontWeight:500,lineHeight:.96,letterSpacing:-.5}}>Sacred<br/>Temples</h1>
          <p style={{fontFamily:FD,fontSize:15,color:C.textDD,marginTop:8,fontStyle:"italic"}}>of Bhārata</p>
        </div>
        <button className="t" onClick={onToggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{width:46,height:46,borderRadius:15,background:isDark?"rgba(255,255,255,0.05)":C.saffronDim,border:`1px solid ${isDark?C.div:C.saffronPale}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .3s cubic-bezier(.16,1,.3,1)",boxShadow:isDark?"none":`0 4px 16px ${C.saffronDim}`}}>
          {isDark
            ? <svg width="19" height="19" fill="none" stroke="rgba(255,220,100,0.85)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            : <svg width="19" height="19" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          }
        </button>
      </div>

      {/* OM SYMBOL — Central sacred focal point */}
      <div style={{position:"relative",textAlign:"center",marginBottom:24,paddingTop:8}}>
        {/* Expanding pulse rings */}
        {[0,1,2].map(i => (
          <div key={i} style={{position:"absolute",top:"50%",left:"50%",width:190,height:190,borderRadius:"50%",border:`1.5px solid rgba(212,133,60,0.18)`,transform:"translate(-50%,-50%)",animation:`ringExpand 3.6s ease-out infinite ${i*1.2}s`,pointerEvents:"none"}}/>
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
        {/* Deep radial glow behind OM */}
        <div style={{position:"absolute",top:"50%",left:"50%",width:170,height:170,borderRadius:"50%",background:"radial-gradient(circle,rgba(240,192,96,0.28),rgba(212,133,60,0.10) 50%,transparent 70%)",transform:"translate(-50%,-50%)",filter:"blur(22px)",animation:"breathe 4s ease-in-out infinite",pointerEvents:"none"}}/>
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

      {/* Stats */}
      <div style={{display:"flex",justifyContent:"center",gap:0,marginTop:28,position:"relative",zIndex:2}}>
        {[{v:"3,000+",l:"Temples"},{v:"28+",l:"States"},{v:"6",l:"Deities"}].map((s,i) => (
          <div key={s.l} style={{textAlign:"center",flex:1,padding:"14px 0",borderRadius:16,position:"relative"}}>
            {i > 0 && <div style={{position:"absolute",left:0,top:"20%",bottom:"20%",width:1,background:C.divL}}/>}
            <div style={{fontFamily:FD,fontSize:24,fontWeight:500,color:C.saffron,textShadow:`0 0 20px rgba(212,133,60,0.3)`}}>{s.v}</div>
            <div style={{fontSize:9,color:C.textDD,fontWeight:700,letterSpacing:1.2,marginTop:5,textTransform:"uppercase"}}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>

    {/* DAILY SHLOKA */}
    <ShlokaWidget/>

    {/* DEITIES */}
    <div style={{marginTop:38}}>
      <SH title="Sacred Deities" sub="Explore by divine presence" d={.1}/>
      <div style={{display:"flex",gap:14,overflowX:"auto",padding:"0 24px 8px",scrollSnapType:"x mandatory"}}>
        {DEITIES.map((d,i) => (
          <div key={d.name} className="t rv" onClick={() => nav("explore")} style={{minWidth:102,textAlign:"center",cursor:"pointer",animationDelay:`${.15+i*.08}s`,scrollSnapAlign:"start"}}>
            <div style={{width:82,height:82,borderRadius:26,margin:"0 auto 12px",position:"relative",overflow:"hidden",boxShadow:`0 8px 28px ${hsl(d.h,30,8,0.6)}, 0 0 0 1px ${hsl(d.h,30,20,0.18)}`}}>
              <TempleImage src={`https://source.unsplash.com/featured/160x160/?${deityQuery(d.name)}&sig=${d.name}`} hue={d.h} style={{width:82,height:82}} omSize={22}/>
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
      <div style={{display:"flex",gap:18,overflowX:"auto",padding:"0 24px 14px",scrollSnapType:"x mandatory"}}>
        {temples.slice(0,4).map((t,i) => <FCard key={t.id} t={t} onClick={oT} onFav={oF} d={.3+i*.1}/>)}
      </div>
    </div>

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

    {/* BY STATE */}
    <div style={{marginTop:42}}>
      <SH title="By State" sub="Region by region" act="All" onAct={() => nav("stateBrowse")} d={.4}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"0 24px"}}>
        {STATES.slice(0,6).map((s,i) => (
          <div key={s.name} className="t rv" onClick={() => nav("stateBrowse")} style={{padding:"20px 16px",borderRadius:18,cursor:"pointer",background:`linear-gradient(135deg,${hsl(s.h,35,isDark?13:90)},${C.card})`,border:`1px solid ${C.div}`,borderTop:`2px solid ${hsl(s.h,40,isDark?35:60,0.35)}`,position:"relative",overflow:"hidden",animationDelay:`${.45+i*.06}s`}}>
            <div style={{width:10,height:10,borderRadius:5,background:hsl(s.h,50,50),opacity:.6,marginBottom:12}}/>
            <div style={{fontFamily:FE,fontSize:17,fontWeight:500,color:C.creamM,lineHeight:1.2}}>{s.name}</div>
            <div style={{fontSize:12,color:C.textM,marginTop:5}}>{s.n} temples</div>
          </div>
        ))}
      </div>
    </div>

    {/* PANCHANG */}
    <PanchangWidget/>

    {/* PILGRIMAGE CIRCUIT */}
    <PilgrimageCard onNav={nav}/>

    {/* ━━━ SACRED PREMIUM TEASER ━━━ */}
    <div className="rv" style={{margin:"42px 24px 0",animationDelay:".48s"}}>
      <div style={{borderRadius:28,overflow:"hidden",position:"relative",background:`linear-gradient(140deg,${hsl(42,55,10)},${hsl(28,65,7)},${hsl(355,40,10)})`}}>
        {/* Gold shimmer sweep */}
        <div style={{position:"absolute",top:0,left:"-120%",width:"55%",height:"100%",background:"linear-gradient(90deg,transparent,rgba(196,162,78,0.06),transparent)",animation:"shimmer 8s ease-in-out infinite",pointerEvents:"none"}}/>
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
    </div>

    {/* NEARBY */}
    <div style={{marginTop:42}}>
      <SH title="Near You" act="Map" onAct={() => nav("nearby")} d={.55}/>
      {temples.slice(0,2).map((t,i) => <LCard key={t.id} t={t} onClick={oT} onFav={oF} d={.6+i*.08}/>)}
    </div>

    {/* SAVED — only show when non-empty */}
    {temples.filter(x => x.isFavorite).length > 0 && (
      <div style={{marginTop:32,marginBottom:16}}>
        <SH title="Saved" act="All" onAct={() => nav("saved")} d={.7}/>
        <div style={{display:"flex",gap:18,overflowX:"auto",padding:"0 24px"}}>
          {temples.filter(x => x.isFavorite).map((t,i) => <FCard key={t.id} t={t} onClick={oT} onFav={oF} d={.75+i*.08}/>)}
        </div>
      </div>
    )}

    {/* Footer verse */}
    <div style={{padding:"56px 40px 24px",textAlign:"center"}}>
      <div style={{width:28,height:1,background:`rgba(196,162,78,0.18)`,margin:"0 auto 24px"}}/>
      <div style={{fontFamily:FD,fontSize:16,color:C.textD,fontStyle:"italic",lineHeight:1.85,letterSpacing:.2}}>
        "Where the temple bell resonates,<br/>the divine presence abides."
      </div>
      <div style={{marginTop:20,fontSize:9,color:C.textDD,fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}>Sacred Temples of Bhārata</div>
      <button className="t" onClick={() => nav("about")} style={{marginTop:16,padding:"8px 22px",borderRadius:99,background:C.saffronDim,border:`1px solid rgba(212,133,60,0.18)`,cursor:"pointer",fontSize:11,fontWeight:700,color:C.saffron,letterSpacing:.8,textTransform:"uppercase",fontFamily:FB}}>About this App</button>
      <div style={{width:28,height:1,background:`rgba(196,162,78,0.18)`,margin:"20px auto 0"}}/>
    </div>
  </div>
  );
};

const Explore = ({nav, oT, oF, temples, isDark, onToggleTheme}) => {
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
      <div className="t" onClick={() => nav("search")} style={{margin:"0 24px",padding:"13px 18px",borderRadius:16,background:C.card,display:"flex",alignItems:"center",gap:12,border:`1px solid ${C.div}`,cursor:"pointer"}}>
        <span style={{fontSize:15,color:C.textDD}}>⌕</span><span style={{flex:1,fontSize:14,color:C.textD}}>Search temples…</span>
      </div>
      <div style={{position:"sticky",top:0,zIndex:50,background:C.glass,backdropFilter:"blur(20px)",padding:"14px 0 12px",borderBottom:`1px solid ${C.divL}`}}>
        <div style={{display:"flex",gap:8,overflowX:"auto",padding:"0 24px"}}>{opts.map(f => <Chip key={f} label={f} active={f === "All" ? fl.length === 0 : fl.includes(f)} onClick={() => tg(f)}/>)}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 24px 0"}}>
          <span style={{fontSize:12,color:C.textD}}>{sorted.length} temples{fl.length>0?" · filtered":""}</span>
          <button className="t" onClick={cycleSort} style={{background:sortBy!=="default"?C.saffronDim:C.card,border:`1px solid ${sortBy!=="default"?"rgba(212,133,60,0.3)":C.div}`,padding:"6px 13px",borderRadius:10,fontSize:11,color:sortBy!=="default"?C.saffron:C.textD,fontWeight:700,cursor:"pointer",fontFamily:FB,display:"flex",alignItems:"center",gap:5}}>
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
            {sortLabels[sortBy]}
          </button>
        </div>
      </div>
      <div style={{paddingTop:16}}>
        {sorted.length === 0 ? <Empty emoji="🏛" title="No Temples Found" sub="Try removing a filter or changing your sort order."/> :
        v === "list" ? sorted.map((t,i) => <LCard key={t.id} t={t} onClick={oT} onFav={oF} d={i*.04}/>) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,padding:"0 24px"}}>
            {sorted.map((t,i) => (
              <div key={t.id} className="t rv" onClick={() => oT(t)} style={{borderRadius:20,overflow:"hidden",height:250,position:"relative",cursor:"pointer",boxShadow:`0 8px 32px ${hsl(t.hue,30,5,0.4)}`,animationDelay:`${i*.05}s`}}>
                <TempleImage src={`https://source.unsplash.com/featured/500x350/?${deityQuery(t.deityPrimary)}&sig=${t.id}`} hue={t.hue} style={{position:"absolute",inset:0,width:"100%",height:"100%"}} omSize={44}/>
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
  const [shared, setShared] = useState(false);
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
  const imgSrc = `https://source.unsplash.com/featured/860x520/?${deityQuery(t.deityPrimary)}&sig=${t.id}`;
  const [px, py] = useParallax();
  return (
    <div className="fi" style={{paddingBottom:44}}>
      <div style={{height:390,position:"relative",overflow:"hidden"}}>
        {/* Cinematic hero image with gyroscope parallax depth */}
        <TempleImage src={imgSrc} hue={t.hue} style={{position:"absolute",inset:0,width:"100%",height:"100%"}} omSize={80} px={px} py={py}/>
        {/* Gradient overlays: top dim for buttons, bottom for text legibility */}
        <div style={{position:"absolute",inset:0,background:`linear-gradient(180deg,rgba(0,0,0,0.35) 0%,transparent 35%,rgba(0,0,0,0.1) 55%,${b3} 100%)`}}/>
        <div style={{position:"absolute",top:18,left:18,right:18,display:"flex",justifyContent:"space-between",zIndex:5}}>
          <button className="t" onClick={onBack} style={{width:46,height:46,borderRadius:15,background:"rgba(0,0,0,0.35)",backdropFilter:"blur(14px)",border:"1px solid rgba(255,255,255,0.12)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"#fff"}}>←</button>
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
      </div>
      <div style={{display:"flex",background:C.glass,backdropFilter:"blur(20px)",borderBottom:`1px solid ${C.divL}`,padding:"0 24px",position:"sticky",top:0,zIndex:50}}>
        {["overview","travel","visit","gallery"].map(tb => (
          <button key={tb} className="t" onClick={() => setTab(tb)} style={{padding:"16px 14px",border:"none",background:"none",cursor:"pointer",fontSize:12.5,fontWeight:tab===tb?700:400,color:tab===tb?C.saffron:C.textD,fontFamily:FB,textTransform:"capitalize",letterSpacing:.4,borderBottom:`2.5px solid ${tab===tb?C.saffron:"transparent"}`,transition:"all .2s"}}>{tb}</button>
        ))}
      </div>
      <div style={{padding:"10px 24px 0"}}>
        {tab === "overview" && <div className="fi">
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
          <div style={{margin:"22px 0 8px",borderRadius:22,overflow:"hidden",position:"relative",border:"1px solid rgba(196,162,78,0.18)"}}>
            <div style={{position:"absolute",inset:0,background:`linear-gradient(140deg,${hsl(42,55,10)},${hsl(28,65,7)})`,pointerEvents:"none"}}/>
            <div style={{position:"absolute",top:0,left:"-120%",width:"55%",height:"100%",background:"linear-gradient(90deg,transparent,rgba(196,162,78,0.05),transparent)",animation:"shimmer 7s ease-in-out infinite",pointerEvents:"none"}}/>
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
        {tab === "travel" && <div className="fi">
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
        {tab === "visit" && <div className="fi">
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
          <div className="fi" style={{paddingTop:8}}>
            {/* Large hero shot */}
            <div style={{borderRadius:20,overflow:"hidden",height:240,position:"relative",marginBottom:8}}>
              <TempleImage src={`https://source.unsplash.com/featured/800x480/?${deityQuery(t.deityPrimary)}&sig=${t.id}-g0`} hue={t.hue} style={{width:"100%",height:"100%"}} omSize={56}/>
            </div>
            {/* 2-col grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{borderRadius:16,overflow:"hidden",height:150,position:"relative"}}>
                  <TempleImage src={`https://source.unsplash.com/featured/${380+i*10}x${300+i*12}/?${deityQuery(t.deityPrimary)}&sig=${t.id}-g${i}`} hue={t.hue} style={{width:"100%",height:"100%"}} omSize={32}/>
                </div>
              ))}
            </div>
            {/* Last wide shot */}
            <div style={{borderRadius:20,overflow:"hidden",height:180,position:"relative",marginTop:8}}>
              <TempleImage src={`https://source.unsplash.com/featured/800x360/?${deityQuery(t.deityPrimary)}&sig=${t.id}-g5`} hue={t.hue} style={{width:"100%",height:"100%"}} omSize={44}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Search = ({oT, oF, onBack, temples}) => {
  const [q, setQ] = useState("");
  const rec = ["Jyotirlinga temples","Temples near Chennai","Devi temples Kerala","UNESCO heritage"];
  const res = temples.filter(t => [t.templeName,t.deityPrimary,t.townOrCity,t.district,t.stateOrUnionTerritory].some(f => f.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="fi" style={{minHeight:"100vh",background:C.bg}}>
      <div style={{padding:"16px 24px",display:"flex",alignItems:"center",gap:14}}>
        <button className="t" onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.cream}}>←</button>
        <div style={{flex:1,padding:"13px 18px",borderRadius:16,background:C.card,display:"flex",alignItems:"center",gap:12,border:`2px solid ${C.saffron}`,boxShadow:`0 0 0 4px ${C.saffronDim}`}}>
          <span style={{fontSize:15,color:C.saffron}}>⌕</span>
          <input autoFocus type="text" placeholder="Temple, deity, city, state…" value={q} onChange={e => setQ(e.target.value)} style={{flex:1,border:"none",outline:"none",fontSize:14,fontFamily:FB,color:C.cream,background:"transparent"}}/>
          {q && <button className="t" onClick={() => setQ("")} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:C.textD}}>✕</button>}
        </div>
      </div>
      {!q ? <div style={{padding:"18px 24px"}}>
        <div style={{fontSize:9,color:C.textDD,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",marginBottom:18}}>Popular Searches</div>
        {rec.map((s,i) => (
          <div key={s} className="t rv" onClick={() => setQ(s)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:`1px solid ${C.divL}`,cursor:"pointer",animationDelay:`${i*.04}s`}}>
            <svg width="13" height="13" fill="none" stroke={C.textDD} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <span style={{fontSize:14,color:C.textM}}>{s}</span>
          </div>
        ))}
      </div> : res.length > 0 ? <div style={{paddingTop:10}}>
        <div style={{padding:"0 24px 12px",fontSize:12,color:C.textD}}>{res.length} result{res.length !== 1 ? "s" : ""}</div>
        {res.map((t,i) => <LCard key={t.id} t={t} onClick={oT} onFav={oF} d={i*.04}/>)}
      </div> : <Empty emoji="⌕" title="No Results" sub={`Nothing for "${q}". Try another search.`}/>}
    </div>
  );
};

const StateBrowse = ({nav, onBack, isDark, onToggleTheme, onSelect}) => (
  <div className="fi" style={{paddingBottom:24}}>
    <div style={{padding:"20px 24px",display:"flex",alignItems:"center",gap:14}}>
      <button className="t" onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.cream}}>←</button>
      <h1 style={{fontFamily:FD,fontSize:26,fontWeight:500,color:C.cream,flex:1}}>States</h1>
      <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
    </div>
    <div style={{padding:"0 24px"}}>{STATES.map((s,i) => (
      <div key={s.name} className="t rv" onClick={() => { onSelect(s); nav("districtBrowse"); }} style={{display:"flex",alignItems:"center",gap:16,padding:"18px 0",borderBottom:`1px solid ${C.divL}`,cursor:"pointer",animationDelay:`${i*.03}s`}}>
        <div style={{width:50,height:50,borderRadius:16,background:hsl(s.h,30,12),border:`1px solid ${hsl(s.h,30,20,0.15)}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:10,height:10,borderRadius:4,background:hsl(s.h,40,40),opacity:.3}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:FD,fontSize:17,fontWeight:500,color:C.creamM}}>{s.name}</div>
          <div style={{fontSize:12,color:C.textD,marginTop:4}}>{s.n} temples</div>
        </div>
        <span style={{color:C.textDD,fontSize:16}}>→</span>
      </div>
    ))}</div>
  </div>
);

const DISTRICT_MAP = {
  "Tamil Nadu": [{n:"Thanjavur",c:89},{n:"Madurai",c:72},{n:"Kanchipuram",c:65},{n:"Ramanathapuram",c:48},{n:"Tiruchirappalli",c:56},{n:"Chidambaram",c:34}],
  "Karnataka": [{n:"Mysuru",c:78},{n:"Hassan",c:54},{n:"Dakshina Kannada",c:42},{n:"Chikkamagaluru",c:38},{n:"Kodagu",c:29},{n:"Belagavi",c:47}],
  "Andhra Pradesh": [{n:"Tirupati",c:95},{n:"Guntur",c:61},{n:"Krishna",c:53},{n:"Kurnool",c:49},{n:"Nellore",c:44},{n:"Srikakulam",c:38}],
  "Kerala": [{n:"Thiruvananthapuram",c:67},{n:"Thrissur",c:72},{n:"Palakkad",c:55},{n:"Kozhikode",c:44},{n:"Malappuram",c:38},{n:"Idukki",c:29}],
};

const DistrictBrowse = ({onBack, oT, oF, temples, isDark, onToggleTheme, state}) => {
  const sName = state?.name || "Tamil Nadu";
  const sCount = state?.n;
  const ds = DISTRICT_MAP[sName] || [];
  const stateTemples = temples.filter(t => t.stateOrUnionTerritory === sName);
  return (
    <div className="fi" style={{paddingBottom:24}}>
      <div style={{padding:"20px 24px",display:"flex",alignItems:"center",gap:14}}>
        <button className="t" onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.cream}}>←</button>
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

const Nearby = ({oT, oF, temples, isDark, onToggleTheme}) => {
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
      {sv.length > 0 ? sv.map((t,i) => <LCard key={t.id} t={t} onClick={oT} onFav={oF} d={i*.05}/>) : <Empty emoji="♥" title="No Saved Temples" sub="Tap the heart on any temple to save it here." action={{label:"Browse Temples", onPress: onBrowse}}/>}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━ ABOUT PAGE ━━━━━━━━━━━━━━━━━━━━━━━━

const ABOUT_TEXT = `I am Malla, and this app was born from something far deeper than an idea — it grew from a feeling I have carried with me for a long time. India is not simply a country to me; it is a living memory that breathes through its temples, where every stone, every carving, and every hushed corner holds a story that has travelled across generations without losing its meaning. Temples in India are not merely places of worship. They are expressions of faith and art, of science and devotion, of time itself — built by hands that believed in something far greater than themselves. While a handful of temples are known to the world and visited by millions, there are thousands more that remain quietly hidden: resting in forests, standing on lonely hills, tucked away in villages, or existing in places that most of us will never think to look. These temples are not lesser in any way. They are simply waiting to be seen, to be understood, and to be experienced with the attention they have always deserved. Many of them carry powerful local stories, a depth of spiritual energy, and an architectural beauty that has never been fully explored or shared. Over time, as life moved faster and attention drifted elsewhere, many such sacred places were left behind — not because they lost their importance, but because their stories were never brought forward. This app is my honest attempt to change that, to bring these temples closer to people who seek something more than just travel, something more than just a destination. It is built for those who want to explore, to feel, to understand, and to connect with a deeper side of India that no image can fully capture. It is also a small but sincere step towards encouraging thoughtful, respectful temple tourism — where visiting such places can support local communities, help preserve living traditions, and give these sacred spaces the care and attention they truly deserve. I believe that at least once in a lifetime, every person should stand inside a temple where time quietly slows, where silence speaks louder than any noise, and where you feel a sense of peace and belonging that words can only gesture towards. Not every temple in this app is famous. Not every place is crowded. But every place carries a meaning worth discovering, and a story worth carrying home. If this journey helps you find even one such place, feel even one such moment, or reconnect with something within yourself that you had almost forgotten, then this app has done everything it was meant to do. This is not just about temples. It is about stories, about roots, and about experiences that stay with you long after you have left. Sacred Temples India is simply a guide — but the journey, in every way that matters, is yours to take.`;

const About = ({onBack, isDark, onToggleTheme, temples}) => (
  <div className="fi" style={{minHeight:"100vh",background:C.bg,paddingBottom:48}}>
    {/* Header */}
    <div style={{padding:"20px 24px 0",display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:50,background:C.glass,backdropFilter:"blur(24px)",borderBottom:`1px solid ${C.divL}`}}>
      <button className="t" onClick={onBack} style={{width:44,height:44,borderRadius:14,background:"none",border:`1px solid ${C.div}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:C.cream,flexShrink:0}}>←</button>
      <h1 style={{fontFamily:FD,fontSize:22,fontWeight:500,color:C.cream,flex:1}}>About</h1>
      <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
    </div>

    {/* Hero block */}
    <div style={{padding:"44px 28px 36px",textAlign:"center",position:"relative",overflow:"hidden"}}>
      {/* Ambient glow behind OM */}
      <div style={{position:"absolute",top:"30%",left:"50%",width:260,height:260,borderRadius:"50%",background:"radial-gradient(circle,rgba(212,133,60,0.07),transparent 60%)",transform:"translate(-50%,-50%)",filter:"blur(50px)",animation:"breathe 6s ease-in-out infinite",pointerEvents:"none"}}/>
      {[160,118,80].map((r,i) => (
        <div key={i} style={{position:"absolute",top:"36%",left:"50%",width:r,height:r,borderRadius:"50%",border:`1px solid rgba(212,133,60,${0.05+i*0.04})`,transform:"translate(-50%,-50%)",animation:`breathe ${8+i*2}s ease-in-out infinite ${i*.8}s`,pointerEvents:"none"}}/>
      ))}
      <OmSymbol size={100} />
      <div style={{marginTop:24,position:"relative",zIndex:2}}>
        <h2 style={{fontFamily:FD,fontSize:26,fontWeight:500,color:C.cream,letterSpacing:-.2,lineHeight:1.15}}>Sacred Temples<br/>of India</h2>
        <p style={{fontFamily:FD,fontSize:14,color:"rgba(212,133,60,0.45)",fontStyle:"italic",marginTop:10,letterSpacing:.3}}>A personal journey by Malla</p>
      </div>
    </div>

    {/* Divider */}
    <div style={{display:"flex",alignItems:"center",gap:14,padding:"0 28px",marginBottom:32}}>
      <div style={{flex:1,height:1,background:`linear-gradient(to right,transparent,rgba(196,162,78,0.18))`}}/>
      <span style={{fontFamily:FD,fontSize:16,color:"rgba(196,162,78,0.3)"}}>✦</span>
      <div style={{flex:1,height:1,background:`linear-gradient(to left,transparent,rgba(196,162,78,0.18))`}}/>
    </div>

    {/* The story */}
    <div style={{padding:"0 28px"}}>
      <p style={{
        fontFamily:FD,fontSize:17.5,color:C.creamM,lineHeight:2.05,
        letterSpacing:.18,
        borderLeft:`2px solid rgba(196,162,78,0.18)`,
        paddingLeft:20,
      }}>
        {ABOUT_TEXT}
      </p>
    </div>

    {/* Divider */}
    <div style={{display:"flex",alignItems:"center",gap:14,padding:"40px 28px 0",marginBottom:28}}>
      <div style={{flex:1,height:1,background:`linear-gradient(to right,transparent,rgba(196,162,78,0.12))`}}/>
      <span style={{fontFamily:FD,fontSize:14,color:"rgba(196,162,78,0.2)"}}>✦</span>
      <div style={{flex:1,height:1,background:`linear-gradient(to left,transparent,rgba(196,162,78,0.12))`}}/>
    </div>

    {/* Footer meta */}
    <div style={{padding:"0 28px",display:"flex",flexDirection:"column",gap:10}}>
      {[
        {l:"App", v:"Sacred Temples India"},
        {l:"Version", v:"1.0"},
        {l:"Temples", v:`${temples.length} sacred places`},
        {l:"Creator", v:"Malla Naidu"},
      ].map(r => (
        <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.divL}`}}>
          <span style={{fontSize:11,fontWeight:700,color:C.textDD,letterSpacing:1.2,textTransform:"uppercase"}}>{r.l}</span>
          <span style={{fontSize:13,color:C.creamD,fontFamily:FD}}>{r.v}</span>
        </div>
      ))}
    </div>

    {/* Closing line */}
    <div style={{padding:"36px 28px 0",textAlign:"center"}}>
      <div style={{fontFamily:FD,fontSize:15,color:C.textD,fontStyle:"italic",lineHeight:1.8}}>
        "The journey is yours to take."
      </div>
      <div style={{width:24,height:1,background:"rgba(196,162,78,0.15)",margin:"18px auto 0"}}/>
    </div>
  </div>
);

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
        <button className="t" onClick={() => setEditing(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.cream}}>←</button>
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
    setDrag(d => ({...d, x:cx-startRef.current.x, y:cy-startRef.current.y}));
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
        <button className="t" onClick={onBack} style={{width:46,height:46,borderRadius:15,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.div}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:C.cream}}>←</button>
        <div style={{textAlign:'center'}}>
          <h1 style={{fontFamily:FD,fontSize:22,fontWeight:500,color:C.cream}}>Discover</h1>
          <div style={{fontSize:10,color:C.textD,marginTop:2,letterSpacing:.5}}>{idx+1} of {temples.length}</div>
        </div>
        {/* Progress arc */}
        <div style={{width:46,height:46,borderRadius:'50%',background:C.saffronDim,border:`1px solid rgba(212,133,60,0.15)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:C.saffron}}>{Math.round(idx/temples.length*100)}%</div>
      </div>

      {/* Card stack */}
      <div style={{flex:1,position:'relative',margin:'0 0 8px'}}>
        {/* 3rd card — simple gradient peek */}
        {third && (
          <div style={{...cardBase,background:`linear-gradient(165deg,${hsl(third.hue,40,16)},${hsl(third.hue,50,4)})`,transform:`translateY(${20-progress*10}px) scale(${0.88+progress*0.06})`,transition:flyDir?'transform 0.45s cubic-bezier(.16,1,.3,1)':'transform 0.18s',zIndex:1,opacity:0.65}}>
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FD,fontSize:52,color:'rgba(212,133,60,0.07)'}}>ॐ</div>
          </div>
        )}
        {/* 2nd card — loads photo */}
        {second && (
          <div style={{...cardBase,transform:`translateY(${10-progress*10}px) scale(${0.94+progress*0.06})`,transition:flyDir?'transform 0.45s cubic-bezier(.16,1,.3,1)':'transform 0.18s',zIndex:2}}>
            <TempleImage src={`https://source.unsplash.com/featured/400x700/?${deityQuery(second.deityPrimary)}&sig=${second.id}`} hue={second.hue} style={{position:'absolute',inset:0,width:'100%',height:'100%'}} omSize={60}/>
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
          <TempleImage src={`https://source.unsplash.com/featured/400x700/?${deityQuery(top.deityPrimary)}`} hue={top.hue} style={{position:'absolute',inset:0,width:'100%',height:'100%'}} omSize={72} px={px} py={py}/>
          {/* SAVED badge */}
          <div style={{position:'absolute',top:32,left:20,padding:'9px 22px',borderRadius:14,background:'rgba(34,197,94,0.92)',backdropFilter:'blur(8px)',border:'2.5px solid rgba(255,255,255,0.55)',fontSize:16,fontWeight:800,color:'#fff',letterSpacing:.8,transform:'rotate(-10deg)',opacity:saving||flyDir==='right'?1:0,transition:'opacity 0.18s',pointerEvents:'none'}}>
            SAVED ♥
          </div>
          {/* SKIP badge */}
          <div style={{position:'absolute',top:32,right:20,padding:'9px 22px',borderRadius:14,background:'rgba(239,68,68,0.92)',backdropFilter:'blur(8px)',border:'2.5px solid rgba(255,255,255,0.55)',fontSize:16,fontWeight:800,color:'#fff',letterSpacing:.8,transform:'rotate(10deg)',opacity:skipping||flyDir==='left'?1:0,transition:'opacity 0.18s',pointerEvents:'none'}}>
            SKIP ✕
          </div>
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

Respond in English unless the user writes in another language. Do not make up specific temple facts you are unsure about — acknowledge uncertainty gracefully.`;

const SUGGESTIONS_DEFAULT = [
  "What are the 12 Jyotirlingas?",
  "Tell me about Char Dham pilgrimage",
  "Best time to visit temples in South India?",
  "What is the significance of Abhishek?",
];

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

const Chat = ({onBack, temple, isDark, onToggleTheme}) => {
  const greeting = temple
    ? `Namaste 🙏 I'm **Sarathi**, your divine guide. You're exploring **${temple.templeName}** in ${temple.townOrCity || temple.stateOrUnionTerritory}. Ask me anything — history, rituals, travel routes, or nearby temples.`
    : `Namaste 🙏 I'm **Sarathi**, your divine guide to the sacred temples of Bhārata. I can help with temple history, pilgrimage routes, rituals, festivals, and travel. What would you like to know?`;

  const [msgs, setMsgs] = useState([{role:'assistant', text: greeting}]);
  const [input, setInput] = useState('');

  const endRef = useRef(null);
  const taRef = useRef(null);

  const suggestions = temple ? [
    `Tell me about ${temple.templeName}`,
    `How do I travel to ${temple.townOrCity || temple.stateOrUnionTerritory}?`,
    `What festivals are celebrated here?`,
    `Best time to visit and darshan tips`,
  ] : SUGGESTIONS_DEFAULT;

  const hasUserMsg = msgs.some(m => m.role === 'user');

  useEffect(() => { endRef.current?.scrollIntoView({behavior:'smooth'}); }, [msgs]);

  const autoResize = (el) => { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; };

  const send = (text) => {
    const q = (text || input).trim();
    if (!q) return;
    setMsgs(prev => [...prev, {role:'user', text: q}]);
    setInput('');
    if (taRef.current) { taRef.current.style.height = 'auto'; }
    setMsgs(prev => [...prev, {role:'assistant', text:'🙏 Sarathi AI is coming soon. Please check back later!'}]);
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:C.bg,position:'relative'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px 12px',background:C.glass,backdropFilter:'blur(20px)',borderBottom:`1px solid ${C.divL}`,flexShrink:0,position:'sticky',top:0,zIndex:60}}>
        <button className="t" onClick={onBack} style={{width:40,height:40,borderRadius:13,background:C.bg3,border:`1px solid ${C.div}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,cursor:'pointer',color:C.text,flexShrink:0}}>←</button>
        <div style={{width:44,height:44,borderRadius:14,background:`linear-gradient(135deg,rgba(212,133,60,0.22),rgba(212,133,60,0.08))`,border:`1px solid rgba(212,133,60,0.25)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><OmSvg size={26}/></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <span style={{fontSize:15.5,fontWeight:700,color:C.text,fontFamily:FD}}>Sarathi</span>
            <span style={{fontSize:9,color:C.textDD,fontWeight:600,letterSpacing:1.2,textTransform:'uppercase',fontFamily:FB}}>सारथी</span>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',boxShadow:'0 0 6px rgba(74,222,128,0.6)',flexShrink:0}}/>
          </div>
          <div style={{fontSize:11,color:C.textD,marginTop:1}}>Divine guide · powered by Google Gemini</div>
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
        {msgs.map((m, i) => (
          <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',alignItems:'flex-end',gap:8}}>
            {m.role === 'assistant' && (
              <div style={{width:30,height:30,borderRadius:10,background:`linear-gradient(135deg,rgba(212,133,60,0.22),rgba(212,133,60,0.08))`,border:`1px solid rgba(212,133,60,0.2)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginBottom:2}}><OmSvg size={17}/></div>
            )}
            <div style={{
              maxWidth:'78%',
              padding:m.role==='user'?'10px 14px':'12px 16px',
              borderRadius:m.role==='user'?'18px 18px 4px 18px':'4px 18px 18px 18px',
              background:m.role==='user'?`linear-gradient(135deg,${C.saffron},${C.saffronH})`:`${C.card}`,
              border:m.role==='user'?'none':`1px solid ${C.div}`,
              boxShadow:m.role==='user'?`0 3px 16px rgba(212,133,60,0.25)`:`0 2px 12px rgba(0,0,0,0.08)`,
            }}>
              <div style={{fontSize:13.5,color:m.role==='user'?'#fff':C.text,lineHeight:1.75,fontFamily:FB}}>
                {renderMd(m.text)}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef}/>
      </div>

      {/* Suggestions */}
      {!hasUserMsg && (
        <div style={{padding:'6px 16px 8px',flexShrink:0,display:'flex',gap:7,flexWrap:'wrap'}}>
          {suggestions.map(s => (
            <button key={s} className="t" onClick={() => send(s)} style={{padding:'7px 13px',borderRadius:100,background:C.bg3,border:`1px solid ${C.div}`,fontSize:11.5,color:C.textM,cursor:'pointer',fontFamily:FB,fontWeight:500,whiteSpace:'nowrap'}}>
              {s}
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
            placeholder="Ask about temples, routes, rituals…"
            rows={1}
            style={{flex:1,background:'none',border:'none',outline:'none',resize:'none',fontFamily:FB,fontSize:13.5,color:C.text,lineHeight:1.55,minHeight:22,maxHeight:120,padding:0}}
          />
          <button
            className="t"
            onClick={() => send()}
            disabled={!input.trim()}
            style={{width:38,height:38,borderRadius:12,background:input.trim()?`linear-gradient(135deg,${C.saffron},${C.saffronH})`:`${C.bg2}`,border:'none',cursor:input.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .2s',boxShadow:input.trim()?`0 3px 14px rgba(212,133,60,0.35)`:'none'}}
          >
            <svg width="15" height="15" fill="none" stroke={input.trim()?'#fff':C.textDD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </button>
        </div>
        <div style={{textAlign:'center',marginTop:7,fontSize:10,color:C.textDD,letterSpacing:.5}}>Sarathi AI · Coming soon</div>
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
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');
  const ref = useRef(null);

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

  useEffect(() => {
    supabase.from("temples").select("*").then(({ data, error }) => {
      if (!error && data) setTemples(data);
      setLoading(false);
    });
    initParallax();
  }, []);

  const nav = useCallback(t => { setStk(p => [...p, t]); setScr(t); ref.current?.scrollTo({top:0,behavior:"instant"}); }, []);
  const back = useCallback(() => { setStk(p => { const n = p.slice(0,-1); setScr(n[n.length-1] || "home"); return n.length ? n : ["home"]; }); setTmp(null); ref.current?.scrollTo({top:0,behavior:"instant"}); }, []);
  // backNoTmpReset: go back without clearing tmp — used from Chat so Detail context is preserved
  const backNoTmpReset = useCallback(() => { setStk(p => { const n = p.slice(0,-1); setScr(n[n.length-1] || "home"); return n.length ? n : ["home"]; }); ref.current?.scrollTo({top:0,behavior:"instant"}); }, []);
  const oT = useCallback(t => { setTmp(t); nav("detail"); }, [nav]);
  const onTab = useCallback(t => { setStk([t]); setScr(t); setTmp(null); ref.current?.scrollTo({top:0,behavior:"instant"}); }, []);

  // Favorites: optimistic update → Supabase persist → rollback on error
  const oF = useCallback(async (id, current) => {
    const next = !current;
    setTemples(prev => prev.map(t => t.id === id ? {...t, isFavorite: next} : t));
    const { error } = await supabase.from("temples").update({ isFavorite: next }).eq("id", id);
    if (error) {
      console.error("Favorite update failed:", error.message);
      setTemples(prev => prev.map(t => t.id === id ? {...t, isFavorite: current} : t));
    }
  }, []);

  const tabs = ["home","explore","nearby","saved","profile"];
  const aTab = tabs.includes(scr) ? scr : [...stk].reverse().find(s => tabs.includes(s)) || "home";
  const showNav = !["detail","search","stateBrowse","districtBrowse","discover","about","chat"].includes(scr);

  if (loading) return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      <style>{getCss(C)}</style>
      {/* Deep ambient glow */}
      <div style={{position:"absolute",top:"50%",left:"50%",width:360,height:360,borderRadius:"50%",background:"radial-gradient(circle,rgba(212,133,60,0.07),transparent 60%)",transform:"translate(-50%,-50%)",filter:"blur(55px)",animation:"breathe 5s ease-in-out infinite",pointerEvents:"none"}}/>
      {/* Static concentric rings */}
      {[220,162,110].map((r,i) => (
        <div key={i} style={{position:"absolute",top:"50%",left:"50%",width:r,height:r,borderRadius:"50%",border:`1px solid rgba(212,133,60,${0.05+i*0.04})`,transform:"translate(-50%,-50%)",animation:`breathe ${7+i*2}s ease-in-out infinite ${i*.7}s`,pointerEvents:"none"}}/>
      ))}
      {/* Pulsing rings */}
      {[0,1,2].map(i => (
        <div key={`rp${i}`} style={{position:"absolute",top:"50%",left:"50%",width:160,height:160,borderRadius:"50%",border:"1.5px solid rgba(212,133,60,0.14)",transform:"translate(-50%,-50%)",animation:`ringExpand 3.4s ease-out infinite ${i*1.13}s`,pointerEvents:"none"}}/>
      ))}
      {/* OM */}
      <OmSymbol size={130} />
      {/* Brand */}
      <div style={{marginTop:38,display:"flex",flexDirection:"column",alignItems:"center",gap:8,position:"relative",zIndex:2}}>
        <div style={{fontSize:11,color:C.textDD,fontWeight:700,letterSpacing:4,textTransform:"uppercase"}}>Sacred Temples</div>
        <div style={{fontFamily:FD,fontSize:14,color:"rgba(212,133,60,0.28)",fontStyle:"italic"}}>of Bhārata</div>
      </div>
      {/* Loading dots */}
      <div style={{display:"flex",gap:7,marginTop:48,position:"relative",zIndex:2}}>
        {[0,1,2].map(i => (
          <div key={i} style={{width:5,height:5,borderRadius:"50%",background:C.saffron,opacity:.22,animation:`breathe 1.6s ease-in-out infinite ${i*.22}s`}}/>
        ))}
      </div>
    </div>
  );

  const th = {isDark, onToggleTheme: toggleTheme};

  let page = null;
  if (scr === "home") page = <Home nav={nav} oT={oT} oF={oF} temples={temples} {...th}/>;
  else if (scr === "discover") page = <Discover temples={temples} oT={oT} onBack={back}/>;
  else if (scr === "explore") page = <Explore nav={nav} oT={oT} oF={oF} temples={temples} {...th}/>;
  else if (scr === "detail" && tmp) page = <Detail temple={tmp} onBack={back} oF={oF} nav={nav} {...th}/>;
  else if (scr === "chat") page = <Chat onBack={backNoTmpReset} temple={tmp} {...th}/>;
  else if (scr === "search") page = <Search oT={oT} oF={oF} onBack={back} temples={temples}/>;
  else if (scr === "stateBrowse") page = <StateBrowse nav={nav} onBack={back} onSelect={t => setTmp(t)} {...th}/>;
  else if (scr === "districtBrowse") page = <DistrictBrowse onBack={back} oT={oT} oF={oF} temples={temples} state={tmp} {...th}/>;
  else if (scr === "nearby") page = <Nearby oT={oT} oF={oF} temples={temples} {...th}/>;
  else if (scr === "saved") page = <Saved oT={oT} oF={oF} temples={temples} onBrowse={() => nav("explore")} {...th}/>;
  else if (scr === "profile") page = <Profile nav={nav} temples={temples} {...th}/>;
  else if (scr === "about") page = <About onBack={back} temples={temples} {...th}/>;
  else page = <Home nav={nav} oT={oT} oF={oF} temples={temples} {...th}/>;

  return (
    <div>
      <style>{getCss(C)}</style>
      <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:C.bg,position:"relative",boxShadow:"0 0 120px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column"}}>
        <div ref={ref} style={{flex:1,overflowY:"auto",overflowX:"hidden",paddingBottom:showNav?78:0}}>
          {page}
        </div>
        {/* Sarathi FAB — floats above BNav */}
        {showNav && (
          <button className="t" onClick={() => nav("chat")} title="Ask Sarathi" style={{position:"absolute",bottom:88,right:18,width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.saffron},${C.saffronH})`,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:110,boxShadow:`0 4px 22px rgba(212,133,60,0.45),0 0 0 2px rgba(212,133,60,0.15)`}}><OmSvg size={28} color="#fff"/></button>
        )}
        {showNav && <BNav a={aTab} on={onTab} savedCount={temples.filter(t=>t.isFavorite).length}/>}
      </div>
    </div>
  );
}
