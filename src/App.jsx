import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SACRED TEMPLES OF BHĀRATA
//  Aesthetic: Dark Sanctum — gold on obsidian
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CDark = {
  bg: "#0E0A07", bg2: "#161210", bg3: "#1E1814",
  card: "#1C1712", cardH: "#241E18", cardB: "rgba(255,255,255,0.04)",
  saffron: "#D4853C", saffronH: "#E69A52", saffronDim: "rgba(212,133,60,0.12)",
  saffronPale: "rgba(212,133,60,0.08)",
  gold: "#C4A24E", goldDim: "rgba(196,162,78,0.1)",
  cream: "#F2E8D4", creamM: "#D4C4A8", creamD: "#A89878",
  text: "#EDE4D4", textM: "#A89878", textD: "#6E5E48", textDD: "#4A3E30",
  red: "#C44040", div: "rgba(255,255,255,0.06)", divL: "rgba(255,255,255,0.03)",
  glass: "rgba(20,16,12,0.75)", glassL: "rgba(20,16,12,0.6)",
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

const getCss = (theme) => `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{background:${theme.bg};transition:background-color 0.35s ease}
body{font-family:${FB};background:${theme.bg};color:${theme.text};-webkit-font-smoothing:antialiased;transition:background-color 0.35s ease,color 0.25s ease}
@keyframes rv{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fi{from{opacity:0}to{opacity:1}}
@keyframes breathe{0%,100%{opacity:.2;transform:scale(1)}50%{opacity:.5;transform:scale(1.04)}}
@keyframes drift{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(-8px)}}
@keyframes shimmer{0%{left:-120%}60%{left:120%}100%{left:120%}}
@keyframes glow{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes omPulse{0%,100%{opacity:.92;transform:scale(1)}50%{opacity:1;transform:scale(1.035)}}
@keyframes omGlow{0%,100%{filter:drop-shadow(0 0 18px rgba(212,133,60,.45)) drop-shadow(0 0 40px rgba(212,133,60,.2))}50%{filter:drop-shadow(0 0 36px rgba(212,133,60,.75)) drop-shadow(0 0 80px rgba(212,133,60,.38)) drop-shadow(0 0 140px rgba(212,133,60,.12))}}
@keyframes ringExpand{0%{transform:translate(-50%,-50%) scale(.55);opacity:.7}100%{transform:translate(-50%,-50%) scale(1.6);opacity:0}}
@keyframes soundWave{0%,100%{transform:scaleY(.4);opacity:.4}50%{transform:scaleY(1);opacity:1}}
@keyframes slideIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
@keyframes panchangGlow{0%,100%{box-shadow:0 0 0 1px rgba(196,162,78,0.08)}50%{box-shadow:0 0 0 1px rgba(196,162,78,0.18),0 0 32px rgba(196,162,78,0.06)}}
@keyframes kenBurns{0%{transform:scale(1)}100%{transform:scale(1.08)}}
.rv{animation:rv .55s cubic-bezier(.16,1,.3,1) both}
.fi{animation:fi .35s ease both}
.t{transition:transform .1s cubic-bezier(.16,1,.3,1)}.t:active{transform:scale(.965)}
::-webkit-scrollbar{width:0;height:0}
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
      nodes.current.forEach(n => { try { n.stop(ctx.current.currentTime + 2.6); } catch(e) {} });
    } catch(e) {}
    nodes.current = [];
    masterRef.current = null;
    setTimeout(() => { if (ctx.current) { ctx.current.close(); ctx.current = null; } }, 2800);
  }, []);

  const stop = useCallback(() => {
    // Stop MP3
    if (audioRef.current) {
      const audio = audioRef.current;
      // Fade out volume smoothly
      const fadeOut = setInterval(() => {
        if (audio.volume > 0.05) { audio.volume = Math.max(0, audio.volume - 0.05); }
        else { audio.pause(); audio.currentTime = 0; audio.volume = 1; clearInterval(fadeOut); }
      }, 80);
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

  const play = useCallback(() => {
    try {
      // Try MP3 first
      const audio = new Audio('/om-chant.mp3');
      audio.loop = true;
      audio.volume = 0;
      audioRef.current = audio;
      audio.play().then(() => {
        // Fade in smoothly
        let vol = 0;
        const fadeIn = setInterval(() => {
          vol = Math.min(1, vol + 0.04);
          audio.volume = vol;
          if (vol >= 1) clearInterval(fadeIn);
        }, 80);
        setPlaying(true);
      }).catch(() => {
        // Fallback to synthesis if MP3 fails
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        ctx.current = ac;
        playSynth(ac);
        setPlaying(true);
      });
    } catch(e) { console.error('Audio error:', e); }
  }, [playSynth]);

  const toggle = useCallback(() => { playing ? stop() : play(); }, [playing, stop, play]);
  useEffect(() => () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    nodes.current.forEach(n => { try { n.stop(); } catch(e) {} });
    if (ctx.current) ctx.current.close();
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
  <div style={{margin:"28px 24px 0",borderRadius:22,padding:"20px 20px 18px",background:C.card,border:`1px solid ${C.div}`}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div style={{fontSize:9,color:C.textDD,fontWeight:800,letterSpacing:3,textTransform:"uppercase"}}>Today's Panchang</div>
      <div style={{fontSize:10,color:C.saffron,fontWeight:700,padding:"4px 10px",borderRadius:8,background:C.saffronDim,border:`1px solid rgba(212,133,60,0.1)`}}>{PANCHANG.vara}</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {[
        {l:"Tithi",v:PANCHANG.tithi,e:"🌙"},
        {l:"Nakshatra",v:PANCHANG.nakshatra,e:"✦"},
        {l:"Yoga",v:PANCHANG.yoga,e:"◎"},
        {l:"Muhurta",v:PANCHANG.muhurta,e:"⊙"},
      ].map(p => (
        <div key={p.l} style={{padding:"12px 14px",borderRadius:14,background:C.bg3,border:`1px solid ${C.divL}`}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
            <span style={{fontSize:12}}>{p.e}</span>
            <span style={{fontSize:9,color:C.textDD,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase"}}>{p.l}</span>
          </div>
          <div style={{fontSize:13,color:C.creamM,fontWeight:600,lineHeight:1.3}}>{p.v}</div>
        </div>
      ))}
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
const FCard = ({t, onClick, d=0}) => {
  const imgSrc = `https://source.unsplash.com/featured/400x600/?${deityQuery(t.deityPrimary)}`;
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
        <div className="t" style={{width:38,height:38,borderRadius:12,background:t.isFavorite?"rgba(196,64,64,0.85)":"rgba(0,0,0,0.32)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${t.isFavorite?"rgba(196,64,64,0.4)":"rgba(255,255,255,0.1)"}`,fontSize:14,color:"#fff",transition:"all .3s"}}>
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
const LCard = ({t, onClick, d=0}) => {
  const imgSrc = `https://source.unsplash.com/featured/180x180/?${deityQuery(t.deityPrimary)}`;
  return (
    <div className="t rv" onClick={() => onClick(t)} style={{
      display:"flex",gap:16,padding:14,margin:"0 24px 12px",borderRadius:20,
      background:C.card,cursor:"pointer",animationDelay:`${d}s`,
      border:`1px solid ${C.div}`,
    }}>
      <div style={{width:88,height:88,minWidth:88,borderRadius:16,overflow:"hidden",position:"relative"}}>
        <TempleImage src={imgSrc} hue={t.hue} style={{width:88,height:88}} omSize={24}/>
        <div style={{position:"absolute",bottom:5,left:5,padding:"3px 7px",borderRadius:6,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(6px)",fontSize:8.5,color:"rgba(255,255,255,0.9)",fontWeight:700,letterSpacing:.3}}>{t.deityPrimary}</div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",minWidth:0,gap:4}}>
        <h3 style={{fontFamily:FD,fontSize:17,fontWeight:500,lineHeight:1.25,color:C.cream,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.templeName}</h3>
        <div style={{fontSize:11.5,color:C.textD,display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:3,height:3,borderRadius:"50%",background:C.textDD}}/>{t.townOrCity}, {t.district}
        </div>
        <div style={{marginTop:2}}>
          <span style={{fontSize:10,padding:"3px 9px",borderRadius:99,background:C.saffronDim,color:C.saffron,fontWeight:700,letterSpacing:.3,border:`1px solid rgba(212,133,60,0.1)`}}>
            {(t.architectureStyle || t.deityPrimary).split("·")[0].trim()}
          </span>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",fontSize:15,color:t.isFavorite?C.red:C.textDD}}>{t.isFavorite?"♥":"♡"}</div>
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

const Empty = ({emoji, title, sub}) => (
  <div className="fi" style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"80px 40px",textAlign:"center"}}>
    <div style={{width:96,height:96,borderRadius:32,background:C.bg3,border:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:24,fontSize:40}}>{emoji}</div>
    <h3 style={{fontFamily:FD,fontSize:22,color:C.cream,marginBottom:10}}>{title}</h3>
    <p style={{fontSize:13,color:C.textD,lineHeight:1.7,maxWidth:260}}>{sub}</p>
  </div>
);

const BNav = ({a, on}) => {
  const items = [{k:"home",e:"◈",l:"Home"},{k:"explore",e:"◎",l:"Explore"},{k:"nearby",e:"◉",l:"Nearby"},{k:"saved",e:"♥",l:"Saved"},{k:"profile",e:"◇",l:"Profile"}];
  return (
    <div style={{position:"sticky",bottom:0,zIndex:100,background:C.glass,backdropFilter:"blur(24px) saturate(150%)",borderTop:`1px solid ${C.div}`,display:"flex",justifyContent:"space-around",padding:"6px 0 18px"}}>
      {items.map(t => (
        <button key={t.k} className="t" onClick={() => on(t.k)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"6px 14px",position:"relative"}}>
          {a === t.k && <div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",width:20,height:3,borderRadius:2,background:C.saffron,boxShadow:`0 0 12px ${C.saffron}88`}}/>}
          <div style={{width:40,height:40,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",background:a===t.k?C.saffronDim:"transparent",transition:"all .2s",fontSize:a===t.k?18:16,color:a===t.k?C.saffron:C.textDD}}>{t.e}</div>
          <span style={{fontSize:9.5,fontWeight:a===t.k?700:500,color:a===t.k?C.saffron:C.textDD,letterSpacing:.6}}>{t.l}</span>
        </button>
      ))}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━ PAGES ━━━━━━━━━━━━━━━━━━━━━━━

const Home = ({nav, oT, temples, isDark, onToggleTheme}) => {
  const { playing, toggle } = useOmChant();
  return (
  <div className="fi" style={{paddingBottom:28}}>
    {/* HERO */}
    <div style={{background:`linear-gradient(175deg,${hsl(30,45,10)},${hsl(350,40,7)} 55%,${C.bg})`,padding:"22px 24px 40px",borderRadius:"0 0 42px 42px",position:"relative",overflow:"hidden",boxShadow:`0 24px 80px ${hsl(350,30,5,0.6)}`}}>
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
        <button className="t" onClick={onToggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{width:46,height:46,borderRadius:15,background:isDark?"rgba(255,255,255,0.05)":C.saffronDim,border:`1px solid ${isDark?C.div:C.saffronPale}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:19,color:isDark?"rgba(255,220,100,0.85)":C.saffron,transition:"all .3s cubic-bezier(.16,1,.3,1)",boxShadow:isDark?"none":`0 4px 16px ${C.saffronDim}`}}>
          {isDark ? "☀" : "☽"}
        </button>
      </div>

      {/* OM SYMBOL — Central sacred focal point */}
      <div style={{position:"relative",textAlign:"center",marginBottom:24,paddingTop:4}}>
        {/* Expanding pulse rings */}
        {[0,1,2].map(i => (
          <div key={i} style={{position:"absolute",top:"50%",left:"50%",width:170,height:170,borderRadius:"50%",border:`1.5px solid rgba(212,133,60,0.18)`,transform:"translate(-50%,-50%)",animation:`ringExpand 3.6s ease-out infinite ${i*1.2}s`,pointerEvents:"none"}}/>
        ))}
        {/* Static concentric rings */}
        {[200,150,104].map((r,i) => (
          <div key={i} style={{position:"absolute",top:"50%",left:"50%",width:r,height:r,borderRadius:"50%",border:`1px solid rgba(212,133,60,${0.05+i*0.04})`,transform:"translate(-50%,-50%)",animation:`breathe ${7+i*2}s ease-in-out infinite ${i*.6}s`,pointerEvents:"none"}}/>
        ))}
        {/* Deep glow behind OM */}
        <div style={{position:"absolute",top:"50%",left:"50%",width:130,height:130,borderRadius:"50%",background:"radial-gradient(circle,rgba(212,133,60,0.22),rgba(212,133,60,0.06) 50%,transparent 70%)",transform:"translate(-50%,-50%)",filter:"blur(18px)",animation:"breathe 4s ease-in-out infinite",pointerEvents:"none"}}/>
        {/* OM glyph */}
        <span style={{fontFamily:FD,fontSize:108,color:C.saffron,display:"inline-block",lineHeight:1,position:"relative",zIndex:2,animation:"omPulse 4s ease-in-out infinite, omGlow 4s ease-in-out infinite",userSelect:"none"}}>ॐ</span>
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
            <div style={{width:82,height:82,borderRadius:26,margin:"0 auto 12px",position:"relative",overflow:"hidden",background:`linear-gradient(155deg,${hsl(d.h,38,18)},${hsl(d.h,48,7)})`,boxShadow:`0 8px 28px ${hsl(d.h,30,8,0.6)}, 0 0 0 1px ${hsl(d.h,30,20,0.12)}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:2}}>
              <span style={{fontFamily:FD,fontSize:22,color:hsl(d.h,40,70,0.9),userSelect:"none",lineHeight:1}}>{d.sk}</span>
              <span style={{fontSize:18,color:hsl(d.h,50,75,0.35),lineHeight:1}}>{d.icon}</span>
              <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 25% 18%,rgba(255,255,255,0.12),transparent 55%)"}}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,height:28,background:`linear-gradient(transparent,${hsl(d.h,50,5,0.6)})`}}/>
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
        {temples.slice(0,4).map((t,i) => <FCard key={t.id} t={t} onClick={oT} d={.3+i*.1}/>)}
      </div>
    </div>

    {/* DISCOVER MODE ENTRY */}
    <div className="rv t" onClick={() => nav("discover")} style={{margin:"32px 24px 0",borderRadius:26,overflow:"hidden",position:"relative",height:158,cursor:"pointer",animationDelay:".35s",boxShadow:`0 12px 48px rgba(0,0,0,0.18)`}}>
      <div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,${hsl(28,55,11)},${hsl(350,45,7)})`}}/>
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
          <div key={s.name} className="t rv" onClick={() => nav("stateBrowse")} style={{padding:"20px 16px",borderRadius:18,cursor:"pointer",background:C.card,border:`1px solid ${C.div}`,position:"relative",overflow:"hidden",animationDelay:`${.45+i*.06}s`}}>
            <div style={{position:"absolute",top:-18,right:-18,width:55,height:55,borderRadius:"50%",background:hsl(s.h,40,40),opacity:.04}}/>
            <div style={{width:8,height:8,borderRadius:4,background:hsl(s.h,40,45),opacity:.35,marginBottom:14}}/>
            <div style={{fontFamily:FD,fontSize:16,fontWeight:500,color:C.creamM,lineHeight:1.2}}>{s.name}</div>
            <div style={{fontSize:11,color:C.textD,marginTop:5}}>{s.n} temples</div>
          </div>
        ))}
      </div>
    </div>

    {/* PANCHANG */}
    <PanchangWidget/>

    {/* PILGRIMAGE CIRCUIT */}
    <PilgrimageCard onNav={nav}/>

    {/* NEARBY + SAVED */}
    <div style={{marginTop:42}}>
      <SH title="Near You" act="Map" onAct={() => nav("nearby")} d={.55}/>
      {temples.slice(0,2).map((t,i) => <LCard key={t.id} t={t} onClick={oT} d={.6+i*.08}/>)}
    </div>
    <div style={{marginTop:32,marginBottom:16}}>
      <SH title="Saved" act="All" onAct={() => nav("saved")} d={.7}/>
      <div style={{display:"flex",gap:18,overflowX:"auto",padding:"0 24px"}}>
        {temples.filter(x => x.isFavorite).map((t,i) => <FCard key={t.id} t={t} onClick={oT} d={.75+i*.08}/>)}
      </div>
    </div>

    <div style={{textAlign:"center",padding:"48px 48px 16px"}}>
      <div style={{fontFamily:FD,fontSize:15.5,color:C.textD,fontStyle:"italic",lineHeight:1.7}}>
        "Where the temple bell resonates,<br/>the divine presence abides."
      </div>
      <div style={{width:36,height:1,background:C.div,margin:"20px auto 0"}}/>
    </div>
  </div>
  );
};

const Explore = ({nav, oT, temples}) => {
  const [v, setV] = useState("list");
  const [fl, setFl] = useState([]);
  const opts = ["All","Shiva","Vishnu","Devi","Ganesha","Jyotirlinga","Heritage"];
  const tg = f => { if (f === "All") { setFl([]); return; } setFl(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]); };
  return (
    <div className="fi" style={{paddingBottom:24}}>
      <div style={{padding:"22px 24px 16px",display:"flex",alignItems:"center"}}>
        <h1 style={{fontFamily:FD,fontSize:30,fontWeight:500,flex:1,color:C.cream}}>Explore</h1>
        <div style={{display:"flex",gap:6}}>
          {["grid","list"].map(m => (
            <button key={m} className="t" onClick={() => setV(m)} style={{width:40,height:40,borderRadius:12,border:v===m?`2px solid ${C.saffron}`:`1px solid ${C.div}`,background:v===m?C.saffronDim:C.card,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:v===m?C.saffron:C.textD}}>
              {m === "grid" ? "▦" : "☰"}
            </button>
          ))}
        </div>
      </div>
      <div className="t" onClick={() => nav("search")} style={{margin:"0 24px",padding:"13px 18px",borderRadius:16,background:C.card,display:"flex",alignItems:"center",gap:12,border:`1px solid ${C.div}`,cursor:"pointer"}}>
        <span style={{fontSize:15,color:C.textDD}}>⌕</span><span style={{flex:1,fontSize:14,color:C.textD}}>Search temples…</span>
      </div>
      <div style={{position:"sticky",top:0,zIndex:50,background:C.glass,backdropFilter:"blur(20px)",padding:"14px 0 12px",borderBottom:`1px solid ${C.divL}`}}>
        <div style={{display:"flex",gap:8,overflowX:"auto",padding:"0 24px"}}>{opts.map(f => <Chip key={f} label={f} active={f === "All" ? fl.length === 0 : fl.includes(f)} onClick={() => tg(f)}/>)}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 24px 0"}}>
          <span style={{fontSize:12,color:C.textD}}>{temples.length} temples</span>
          <button className="t" style={{background:C.saffronDim,border:`1px solid rgba(212,133,60,0.1)`,padding:"5px 12px",borderRadius:8,fontSize:11,color:C.saffron,fontWeight:700,cursor:"pointer",fontFamily:FB}}>↕ Sort</button>
        </div>
      </div>
      <div style={{paddingTop:16}}>
        {v === "list" ? temples.map((t,i) => <LCard key={t.id} t={t} onClick={oT} d={i*.05}/>) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,padding:"0 24px"}}>
            {temples.map((t,i) => (
              <div key={t.id} className="t rv" onClick={() => oT(t)} style={{borderRadius:20,overflow:"hidden",height:250,position:"relative",cursor:"pointer",boxShadow:`0 8px 32px ${hsl(t.hue,30,5,0.4)}`,animationDelay:`${i*.05}s`}}>
                <TempleImage src={`https://source.unsplash.com/featured/500x350/?${deityQuery(t.deityPrimary)}`} hue={t.hue} style={{position:"absolute",inset:0,width:"100%",height:"100%"}} omSize={44}/>
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

const Detail = ({temple: t, onBack}) => {
  const [sv, setSv] = useState(t.isFavorite);
  const [tab, setTab] = useState("overview");
  const b3 = hsl(t.hue,50,3);
  const imgSrc = `https://source.unsplash.com/featured/860x520/?${deityQuery(t.deityPrimary)}`;
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
            <button className="t" style={{width:46,height:46,borderRadius:15,background:"rgba(0,0,0,0.35)",backdropFilter:"blur(14px)",border:"1px solid rgba(255,255,255,0.12)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"rgba(255,255,255,0.7)"}}>↗</button>
            <button className="t" onClick={() => setSv(!sv)} style={{width:46,height:46,borderRadius:15,background:sv?"rgba(196,64,64,0.85)":"rgba(0,0,0,0.35)",backdropFilter:"blur(14px)",border:`1px solid ${sv?"rgba(196,64,64,0.4)":"rgba(255,255,255,0.12)"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,color:"#fff",boxShadow:sv?"0 4px 20px rgba(196,64,64,0.3)":"none",transition:"all .3s"}}>{sv?"♥":"♡"}</button>
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
          <button className="t" style={{width:"100%",marginTop:24,padding:16,borderRadius:18,background:C.saffron,color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FB,display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:"0 4px 24px rgba(212,133,60,0.3)"}}>🗺 Open in Maps</button>
          <div style={{marginTop:16,padding:16,borderRadius:16,background:C.bg3,textAlign:"center",border:`1px solid ${C.div}`}}>
            <span style={{fontSize:12,color:C.textD,letterSpacing:1,fontWeight:600}}>{t.latitude.toFixed(4)}°N · {t.longitude.toFixed(4)}°E</span>
          </div>
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
        {tab === "gallery" && <Empty emoji="🖼" title="Gallery Coming Soon" sub="Photos will appear here as the collection grows."/>}
      </div>
    </div>
  );
};

const Search = ({oT, onBack, temples}) => {
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
        <div style={{fontSize:9,color:C.textDD,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",marginBottom:18}}>Recent</div>
        {rec.map((s,i) => (
          <div key={s} className="t rv" onClick={() => setQ(s)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:`1px solid ${C.divL}`,cursor:"pointer",animationDelay:`${i*.04}s`}}>
            <span style={{fontSize:13,color:C.textDD}}>↻</span><span style={{fontSize:14,color:C.textM}}>{s}</span>
          </div>
        ))}
      </div> : res.length > 0 ? <div style={{paddingTop:10}}>
        <div style={{padding:"0 24px 12px",fontSize:12,color:C.textD}}>{res.length} result{res.length !== 1 ? "s" : ""}</div>
        {res.map((t,i) => <LCard key={t.id} t={t} onClick={oT} d={i*.04}/>)}
      </div> : <Empty emoji="⌕" title="No Results" sub={`Nothing for "${q}". Try another search.`}/>}
    </div>
  );
};

const StateBrowse = ({nav, onBack}) => (
  <div className="fi" style={{paddingBottom:24}}>
    <div style={{padding:"20px 24px",display:"flex",alignItems:"center",gap:14}}>
      <button className="t" onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.cream}}>←</button>
      <h1 style={{fontFamily:FD,fontSize:26,fontWeight:500,color:C.cream}}>States</h1>
    </div>
    <div style={{padding:"0 24px"}}>{STATES.map((s,i) => (
      <div key={s.name} className="t rv" onClick={() => nav("districtBrowse")} style={{display:"flex",alignItems:"center",gap:16,padding:"18px 0",borderBottom:`1px solid ${C.divL}`,cursor:"pointer",animationDelay:`${i*.03}s`}}>
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

const DistrictBrowse = ({onBack, oT, temples}) => {
  const ds = [{n:"Thanjavur",c:89},{n:"Madurai",c:72},{n:"Kanchipuram",c:65},{n:"Ramanathapuram",c:48},{n:"Tiruchirappalli",c:56},{n:"Chidambaram",c:34}];
  return (
    <div className="fi" style={{paddingBottom:24}}>
      <div style={{padding:"20px 24px",display:"flex",alignItems:"center",gap:14}}>
        <button className="t" onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.cream}}>←</button>
        <div><h1 style={{fontFamily:FD,fontSize:24,fontWeight:500,color:C.cream}}>Tamil Nadu</h1><div style={{fontSize:12,color:C.textD,marginTop:3}}>847 temples</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"12px 24px"}}>
        {ds.map((d,i) => (
          <div key={d.n} className="t rv" style={{padding:20,borderRadius:18,background:C.card,cursor:"pointer",border:`1px solid ${C.div}`,animationDelay:`${i*.04}s`}}>
            <div style={{fontFamily:FD,fontSize:16,fontWeight:500,color:C.creamM}}>{d.n}</div><div style={{fontSize:11,color:C.textD,marginTop:5}}>{d.c} temples</div>
          </div>))}
      </div>
      <div style={{marginTop:28}}><SH title="Top Temples" d={.2}/>
        {temples.filter(t => t.stateOrUnionTerritory === "Tamil Nadu").map((t,i) => <LCard key={t.id} t={t} onClick={oT} d={.25+i*.06}/>)}
      </div>
    </div>
  );
};

const Nearby = ({oT, temples}) => (
  <div className="fi" style={{paddingBottom:24}}>
    <div style={{padding:"22px 24px"}}><h1 style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream}}>Nearby</h1><p style={{fontSize:13,color:C.textD,marginTop:5}}>Temples around your location</p></div>
    <div style={{margin:"0 24px",height:230,borderRadius:24,background:C.bg3,border:`1px solid ${C.div}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
      <div style={{width:72,height:72,borderRadius:22,background:C.card,border:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>🗺</div>
      <span style={{fontSize:13,color:C.textD,fontWeight:600}}>Enable location for map</span>
    </div>
    <div style={{display:"flex",gap:8,padding:"20px 24px",overflowX:"auto"}}><Chip label="Within 10 km" active/><Chip label="10–50 km"/><Chip label="50–100 km"/></div>
    {temples.slice(0,4).map((t,i) => <LCard key={t.id} t={t} onClick={oT} d={i*.06}/>)}
  </div>
);

const Saved = ({oT, temples}) => {
  const sv = temples.filter(t => t.isFavorite);
  return (
    <div className="fi" style={{paddingBottom:24}}>
      <div style={{padding:"22px 24px"}}><h1 style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream}}>Saved</h1><p style={{fontSize:13,color:C.textD,marginTop:5}}>{sv.length} temples</p></div>
      {sv.length > 0 ? sv.map((t,i) => <LCard key={t.id} t={t} onClick={oT} d={i*.05}/>) : <Empty emoji="♥" title="No Saved Temples" sub="Tap the heart on any temple to save it."/>}
    </div>
  );
};

const Profile = () => (
  <div className="fi" style={{paddingBottom:24}}>
    <div style={{padding:"22px 24px"}}><h1 style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream}}>Profile</h1></div>
    <div style={{margin:"0 24px",padding:30,borderRadius:26,background:C.card,border:`1px solid ${C.div}`,textAlign:"center"}}>
      <div style={{width:84,height:84,borderRadius:"50%",margin:"0 auto 18px",background:`linear-gradient(140deg,${C.saffron},${C.saffronH})`,boxShadow:"0 6px 28px rgba(212,133,60,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,color:"#fff",animation:"glow 4s ease-in-out infinite"}}>☸</div>
      <h2 style={{fontFamily:FD,fontSize:22,fontWeight:500,color:C.cream}}>Devotee</h2>
      <p style={{fontSize:12,color:C.textD,marginTop:8,lineHeight:1.6}}>Sign in to sync across devices</p>
      <button className="t" style={{marginTop:22,padding:"13px 38px",borderRadius:16,background:C.saffron,color:"#fff",border:"none",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FB,boxShadow:"0 4px 20px rgba(212,133,60,0.3)"}}>Sign In</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,padding:"22px 24px 0"}}>
      {[{l:"Saved",v:"3",e:"♥"},{l:"Visited",v:"0",e:"◉"},{l:"Reviews",v:"0",e:"✦"}].map((s,i) => (
        <div key={s.l} className="rv" style={{padding:20,borderRadius:20,background:C.card,textAlign:"center",border:`1px solid ${C.div}`,animationDelay:`${.1+i*.06}s`}}>
          <span style={{fontSize:20,color:C.saffron}}>{s.e}</span>
          <div style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream,marginTop:10}}>{s.v}</div>
          <div style={{fontSize:9.5,color:C.textD,marginTop:4,fontWeight:700,letterSpacing:.8,textTransform:"uppercase"}}>{s.l}</div>
        </div>
      ))}
    </div>
    <div style={{padding:"26px 24px 0"}}>
      {[{e:"⚙",l:"Settings"},{e:"⊙",l:"Notifications"},{e:"☰",l:"Collections"},{e:"ⓘ",l:"About"}].map((m,i) => (
        <div key={m.l} className="t rv" style={{display:"flex",alignItems:"center",gap:16,padding:"16px 0",borderBottom:`1px solid ${C.divL}`,cursor:"pointer",animationDelay:`${.2+i*.05}s`}}>
          <div style={{width:46,height:46,borderRadius:15,background:C.bg3,border:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:C.saffron}}>{m.e}</div>
          <span style={{flex:1,fontSize:14,fontWeight:600,color:C.creamM}}>{m.l}</span>
          <span style={{color:C.textDD,fontSize:16}}>→</span>
        </div>
      ))}
    </div>
  </div>
);

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
    <div className="fi" style={{height:'100vh',background:C.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,padding:'40px 32px'}}>
      <div style={{fontFamily:FD,fontSize:72,color:'rgba(212,133,60,0.12)',animation:'omPulse 4s ease-in-out infinite'}}>ॐ</div>
      <h2 style={{fontFamily:FD,fontSize:26,color:C.cream,textAlign:'center',lineHeight:1.2}}>Sacred journey complete</h2>
      <p style={{fontSize:13,color:C.textD,textAlign:'center',lineHeight:1.8,maxWidth:280}}>You've swept through {temples.length} sacred temples. A truly blessed discovery.</p>
      <button className="t" onClick={onBack} style={{marginTop:8,padding:'14px 36px',borderRadius:18,background:C.saffron,color:'#fff',border:'none',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:FB,boxShadow:'0 6px 28px rgba(212,133,60,0.35)'}}>Return Home</button>
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
            <TempleImage src={`https://source.unsplash.com/featured/400x700/?${deityQuery(second.deityPrimary)}`} hue={second.hue} style={{position:'absolute',inset:0,width:'100%',height:'100%'}} omSize={60}/>
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#0E0A07' : '#FAFAF8');
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
  const oT = useCallback(t => { setTmp(t); nav("detail"); }, [nav]);
  const onTab = useCallback(t => { setStk([t]); setScr(t); setTmp(null); ref.current?.scrollTo({top:0,behavior:"instant"}); }, []);

  const tabs = ["home","explore","nearby","saved","profile"];
  const aTab = tabs.includes(scr) ? scr : [...stk].reverse().find(s => tabs.includes(s)) || "home";
  const showNav = !["detail","search","stateBrowse","districtBrowse","discover"].includes(scr);

  if (loading) return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
      <style>{getCss(C)}</style>
      <div style={{fontFamily:FD,fontSize:48,color:"rgba(212,133,60,0.15)",animation:"breathe 3s ease-in-out infinite"}}>ॐ</div>
      <div style={{fontSize:11,color:C.textDD,fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}>Loading</div>
    </div>
  );

  let page = null;
  if (scr === "home") page = <Home nav={nav} oT={oT} temples={temples} isDark={isDark} onToggleTheme={toggleTheme}/>;
  else if (scr === "discover") page = <Discover temples={temples} oT={oT} onBack={back}/>;
  else if (scr === "explore") page = <Explore nav={nav} oT={oT} temples={temples}/>;
  else if (scr === "detail" && tmp) page = <Detail temple={tmp} onBack={back}/>;
  else if (scr === "search") page = <Search oT={oT} onBack={back} temples={temples}/>;
  else if (scr === "stateBrowse") page = <StateBrowse nav={nav} onBack={back}/>;
  else if (scr === "districtBrowse") page = <DistrictBrowse onBack={back} oT={oT} temples={temples}/>;
  else if (scr === "nearby") page = <Nearby oT={oT} temples={temples}/>;
  else if (scr === "saved") page = <Saved oT={oT} temples={temples}/>;
  else if (scr === "profile") page = <Profile/>;
  else page = <Home nav={nav} oT={oT} temples={temples}/>;

  return (
    <div>
      <style>{getCss(C)}</style>
      <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:C.bg,position:"relative",boxShadow:"0 0 120px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column"}}>
        <div ref={ref} style={{flex:1,overflowY:"auto",overflowX:"hidden",paddingBottom:showNav?78:0}}>
          {page}
        </div>
        {showNav && <BNav a={aTab} on={onTab}/>}
      </div>
    </div>
  );
}
