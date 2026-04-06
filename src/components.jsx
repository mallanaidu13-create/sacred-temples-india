// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Shared UI Components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { useState, useEffect, useRef, useCallback, memo, Component } from "react";
import { C, hsl, FD, FB, FE, getCss } from "./theme.js";
import { SHLOKAS, HERO_PARTICLES, INTENTIONS } from "./data.js";
import { haptic, getPanchangSummary, skelBg, deityQuery, cpGet, cpSet } from "./utils.js";
import { useReveal, useParallax, useTilt, useCountUp } from "./hooks.js";
import { CIRCUITS, CIRCUIT_COORDS } from "./content/sacred-circuits/circuits.js";

// ── Error Boundary ──
const EB_C = { bg: "#1A1109", cream: "#F2E8D4", textD: "#6E5E48", saffron: "#D4853C" };
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: EB_C.bg, color: EB_C.cream }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🙏</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: EB_C.textD, marginBottom: 24, textAlign: "center" }}>This sacred space encountered an unexpected disturbance.</div>
          <button onClick={() => this.setState({ hasError: false })} style={{ padding: "10px 22px", borderRadius: 99, background: EB_C.saffron, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Page Loader for Suspense ──
export function PageLoader() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#1A1109" }}>
      <div style={{ fontSize: 80, lineHeight: 1, color: "#D4853C", animation: "omLive 2s ease-in-out infinite, omGlow 2s ease-in-out infinite", fontFamily: "'Noto Serif Devanagari', serif" }}>ॐ</div>
      <div style={{ marginTop: 16, fontSize: 13, color: "#6E5E48" }}>Entering sacred space…</div>
    </div>
  );
}

// ── Om SVG icon ──
export const OmSvg = ({ size = 28, color }) => {
  const c = color || C.saffron;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
        fontFamily="'Noto Serif Devanagari', serif" fontSize="72" fill={c}>ॐ</text>
    </svg>
  );
};

// ── Large Om Symbol ──
export const OmSymbol = ({ size = 160, style = {} }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);
  return (
    <span style={{
      display: "inline-block", position: "relative", zIndex: 2,
      opacity: mounted ? 1 : 0,
      transform: mounted ? "scale(1) rotate(0deg)" : "scale(0.45) rotate(-20deg)",
      transition: "opacity 1.1s cubic-bezier(.22,1,.36,1), transform 1.2s cubic-bezier(.22,1,.36,1)",
      ...style,
    }}>
      <span style={{
        display: "inline-block",
        fontFamily: "'Noto Serif Devanagari', serif",
        fontSize: size, lineHeight: 1, color: C.saffron,
        animation: "omLive 5s ease-in-out infinite, omGlow 5s ease-in-out infinite",
        userSelect: "none",
      }}>ॐ</span>
    </span>
  );
};

// ── Temple Image with Ken Burns + parallax ──
export const TempleImage = ({src, hue, style, omSize=48, px=0, py=0}) => {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(!src);
  const PAD = 20;
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

// ── Reveal Wrapper ──
export const Reveal = ({children, delay=0, style={}}) => {
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

// ── Typewriter ──
export const Typewriter = ({text, delay = 400, speed = 58}) => {
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

// ── Shloka Widget ──
export const ShlokaWidget = () => {
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

// ── Panchang Widget ──
export const PanchangWidget = () => {
  const p = getPanchangSummary();
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
            {l:"Rahu Kāla",v:p.muhurta,e:"⊙"},
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

// ── Pilgrimage Card ──
export const PilgrimageCard = ({onNav}) => (
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

// ── Section Heading ──
export const SH = ({title, sub, act, onAct, d=0}) => (
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

// ── Chip ──
export const Chip = ({label, active, onClick}) => (
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
export const FCard = memo(({t, onClick, onFav, d=0}) => {
  const imgSrc = null;
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
        <TempleImage src={imgSrc} hue={t.hue} style={{position:"absolute",inset:0,width:"100%",height:"100%"}} omSize={68} px={px} py={py}/>
        <div style={{position:"absolute",top:0,left:"-120%",width:"60%",height:"100%",background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)",animation:"shimmer 6s ease-in-out infinite",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:18,left:18,zIndex:3}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 13px",borderRadius:100,background:"rgba(0,0,0,0.42)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.12)",fontSize:10,color:"rgba(255,255,255,0.92)",fontWeight:700,letterSpacing:.7}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:"#E69A52",boxShadow:"0 0 8px rgba(212,133,60,0.8)"}}/>{t.deityPrimary}
          </div>
        </div>
        <div style={{position:"absolute",top:18,right:18,zIndex:3}}>
          <div aria-label={t.isFavorite ? "Remove from saved" : "Save temple"} role="button" className="t" onClick={handleFav} style={{width:38,height:38,borderRadius:12,background:t.isFavorite?"rgba(196,64,64,0.85)":"rgba(0,0,0,0.32)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${t.isFavorite?"rgba(196,64,64,0.4)":"rgba(255,255,255,0.1)"}`,fontSize:14,color:"#fff",transition:"all .3s",cursor:"pointer",position:"relative"}}>
            {t.isFavorite ? "♥" : "♡"}
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
export const LCard = memo(({t, onClick, onFav, d=0}) => {
  const imgSrc = null;
  const [burst, setBurst] = useState(0);
  const DEGS = [0,45,90,135,180,225,270,315];
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
        <div style={{position:"relative",display:"flex",alignItems:"center",padding:"8px 4px"}}>
          {burst > 0 && DEGS.map((deg,i) => (
            <div key={`hb-${burst}-${i}`} aria-hidden="true" style={{position:"absolute",top:"50%",left:"50%",width:6,height:6,borderRadius:"50%",background:C.red,pointerEvents:"none",zIndex:10,"--hb-deg":`${deg}deg`,animation:"heartBurst 0.65s ease-out both",animationDelay:`${i*0.04}s`}}/>
          ))}
          <div aria-label={t.isFavorite ? "Remove from saved" : "Save temple"} role="button" onClick={e => { e.stopPropagation(); if (!t.isFavorite) { setBurst(b => b+1); haptic(30); } onFav?.(t.id, t.isFavorite); }} style={{fontSize:15,color:t.isFavorite?C.red:C.textDD,cursor:"pointer",transition:"transform .12s"}}>{t.isFavorite?"♥":"♡"}</div>
        </div>
      </div>
    </div>
  );
});

// ── Info Row ──
export const IR = ({emoji, label, value, action}) => (
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
export const BackBtn = ({onClick, glass=false}) => (
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

// ── Card Carousel with dot indicators ──
export const CardCarousel = ({items, renderCard, pad='24px'}) => {
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

// ── Theme Toggle Button ──
export const ThemeBtn = ({isDark, onToggle}) => (
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

// ── Empty State ──
export const Empty = ({emoji, title, sub, action}) => (
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

// ── Skeleton Cards ──
export const SkeletonCard = () => (
  <div style={{width:268,minWidth:268,height:360,borderRadius:26,overflow:"hidden",flexShrink:0,scrollSnapAlign:"start",background:C.card,border:`1px solid ${C.div}`}}>
    <div style={{height:260,background:skelBg(true),backgroundSize:'800px 100%',animation:'skeletonShimmer 1.6s ease-in-out infinite'}}/>
    <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:10}}>
      <div style={{height:14,width:"55%",borderRadius:7,background:skelBg(true),backgroundSize:'800px 100%',animation:'skeletonShimmer 1.6s ease-in-out infinite .1s'}}/>
      <div style={{height:20,width:"80%",borderRadius:7,background:skelBg(true),backgroundSize:'800px 100%',animation:'skeletonShimmer 1.6s ease-in-out infinite .2s'}}/>
      <div style={{height:12,width:"50%",borderRadius:6,background:skelBg(true),backgroundSize:'800px 100%',animation:'skeletonShimmer 1.6s ease-in-out infinite .3s'}}/>
    </div>
  </div>
);

export const SkeletonListCard = () => (
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

// ── Typing Dots ──
export const TypingDots = () => (
  <div style={{display:'flex',justifyContent:'flex-start',alignItems:'flex-end',gap:8}}>
    <div style={{width:30,height:30,borderRadius:10,background:`linear-gradient(135deg,rgba(212,133,60,0.22),rgba(212,133,60,0.08))`,border:`1px solid rgba(212,133,60,0.2)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><OmSvg size={17}/></div>
    <div style={{padding:'12px 16px',borderRadius:'4px 18px 18px 18px',background:C.card,border:`1px solid ${C.div}`,display:'flex',alignItems:'center',gap:5}}>
      {[0,1,2].map(i => <div key={i} style={{width:7,height:7,borderRadius:'50%',background:C.saffron,opacity:.5,animation:`soundWave 1.2s ease-in-out infinite ${i*.18}s`}}/>)}
    </div>
  </div>
);

// ── Toast ──
export const Toast = ({msg, icon='✓', visible}) => (
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

// ── Nav SVG icons ──
export const NavSvg = ({name, col}) => {
  const s = {width:22,height:22,display:"block"};
  if (name === "home") return <svg {...s} fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 10L12 3l9 7v10h-5v-6h-8v6H3z"/></svg>;
  if (name === "explore") return <svg {...s} fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z" fill={col} stroke="none"/></svg>;
  if (name === "circuits") return <svg {...s} fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>;
  if (name === "saved") return <svg {...s} fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
  return <svg {...s} fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg>;
};

// ── Bottom Navigation ──
export const BNav = ({a, on, savedCount=0}) => {
  const items = [{k:"home",l:"Home"},{k:"explore",l:"Explore"},{k:"circuits",l:"Circuits"},{k:"saved",l:"Saved"},{k:"profile",l:"Profile"}];
  return (
    <nav role="navigation" aria-label="Main navigation" style={{position:"relative",bottom:0,zIndex:100,background:C.glass,backdropFilter:"blur(28px) saturate(160%)",borderTop:`1px solid ${C.div}`,padding:"6px 0 20px"}}>
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

// ── Progress Arc ──
export const ProgressArc = ({ visited, total, hue, size = 38 }) => {
  const pct = total > 0 ? Math.min(1, visited / total) : 0;
  const r = 14, circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  if (visited === 0) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" style={{position:"absolute",top:10,right:10}}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
      <circle cx="18" cy="18" r={r} fill="none"
        stroke={hsl(hue,60,58)} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={circ.toFixed(1)} strokeDashoffset={offset.toFixed(1)}
        transform="rotate(-90 18 18)"
        style={{transition:"stroke-dashoffset 0.7s cubic-bezier(.22,1,.36,1)"}}/>
      <text x="18" y="22" textAnchor="middle" fontSize="7.5" fontWeight="700"
        fill={hsl(hue,60,65)} style={{fontFamily:FB}}>{visited}</text>
    </svg>
  );
};

// ── Om Circular Visualizer ──
export const OmVisualizer = ({ playing }) => {
  const HEIGHTS = [14,22,12,28,16,24,10,26,18,30,12,22,28,14,24,18,32,14,20,26,10,28,16,22,30,12,26,18,22,28,14,20,16,24,20,18];
  const R = 158;
  return (
    <div aria-hidden="true" style={{position:"absolute",top:"50%",left:"50%",width:0,height:0,pointerEvents:"none",zIndex:1}}>
      {HEIGHTS.map((h,i) => {
        const rad = (i * 10 - 90) * Math.PI / 180;
        const x = Math.cos(rad) * R;
        const y = Math.sin(rad) * R;
        const spd = (0.62 + Math.abs(Math.sin(i * 0.8)) * 0.52).toFixed(2);
        const dly = (i * 0.042 % 0.72).toFixed(3);
        return (
          <div key={i} style={{
            position:"absolute", width:3, height:h,
            transform:`translate(${(x-1.5).toFixed(1)}px,${(y-h).toFixed(1)}px) rotate(${i*10}deg)`,
            transformOrigin:`1.5px ${h}px`,
          }}>
            <div style={{
              width:"100%", height:"100%", borderRadius:2,
              background:`rgba(212,133,60,${(0.42+Math.abs(Math.sin(i*0.7))*0.42).toFixed(2)})`,
              transformOrigin:"center bottom",
              animation: playing ? `vizBar ${spd}s ease-in-out infinite ${dly}s` : "none",
              opacity: playing ? undefined : 0.1,
              transition:"opacity 1.4s ease",
              boxShadow: playing ? "0 0 4px rgba(212,133,60,0.35)" : "none",
            }}/>
          </div>
        );
      })}
    </div>
  );
};

// ── Daily Intention Splash ──
export const DailyIntention = ({ onClose }) => {
  const panchang = getPanchangSummary();
  const today = new Date();
  const shloka = INTENTIONS[today.getDate() % INTENTIONS.length];
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9998,
      background:`radial-gradient(ellipse at 50% 35%,${hsl(30,55,10)},${hsl(350,45,5)} 65%,${hsl(30,30,3)})`,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"40px 32px", textAlign:"center",
      animation:"intentionIn 0.7s cubic-bezier(.22,1,.36,1) both",
    }}>
      <div style={{position:"absolute",top:"30%",left:"50%",width:320,height:320,borderRadius:"50%",
        background:"radial-gradient(circle,rgba(212,133,60,0.12),transparent 65%)",
        transform:"translate(-50%,-50%)",filter:"blur(60px)",pointerEvents:"none"}}/>
      <div style={{fontFamily:"'Noto Serif Devanagari', serif",fontSize:72,color:C.saffron,
        animation:"omGlow 4s ease-in-out infinite",lineHeight:1,marginBottom:24,position:"relative",zIndex:2}}>ॐ</div>
      <div style={{display:"flex",gap:16,marginBottom:32,position:"relative",zIndex:2}}>
        {[{l:"Tithi",v:panchang.tithi},{l:"Nakshatra",v:panchang.nakshatra},{l:"Vara",v:{Ravivara:"Ravi",Somavara:"Soma",Mangalavara:"Mangala",Budhavara:"Budha",Guruvara:"Guru",Shukravara:"Shukra",Shanivara:"Shani"}[panchang.vara] || panchang.vara}].map(p => (
          <div key={p.l} style={{textAlign:"center"}}>
            <div style={{fontSize:8,color:"rgba(212,133,60,0.5)",fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",marginBottom:4}}>{p.l}</div>
            <div style={{fontFamily:FD,fontSize:13,color:C.creamM}}>{p.v}</div>
          </div>
        ))}
      </div>
      <div style={{position:"relative",zIndex:2,maxWidth:300}}>
        <div style={{fontFamily:"'Noto Serif Devanagari', serif",fontSize:22,color:C.saffron,lineHeight:1.5,marginBottom:14}}>{shloka.sk}</div>
        <div style={{fontFamily:FD,fontSize:14,color:C.creamD,lineHeight:1.8,fontStyle:"italic",marginBottom:36}}>{shloka.en}</div>
      </div>
      <button className="t" onClick={onClose} style={{
        padding:"14px 44px",borderRadius:100,
        background:`linear-gradient(135deg,${C.saffron},${C.saffronH})`,
        color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",
        fontFamily:FB,letterSpacing:.5,
        boxShadow:`0 6px 32px rgba(212,133,60,0.4)`,
        position:"relative",zIndex:2,
      }}>Begin the Journey</button>
      <div style={{marginTop:20,fontSize:10,color:C.textDD,letterSpacing:1,position:"relative",zIndex:2}}>
        {today.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
      </div>
    </div>
  );
};

// ── Voice Search ──
export const VoiceSearch = ({ onResult }) => {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!SR) return null;
  const start = () => {
    if (listening) { recRef.current?.stop(); return; }
    const r = new SR();
    recRef.current = r;
    r.lang = 'en-IN'; r.continuous = false; r.interimResults = false;
    r.onresult = e => { onResult(e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
    setListening(true);
    haptic(15);
  };
  return (
    <button aria-label={listening ? "Stop listening" : "Search by voice"} className="t" onClick={start} style={{
      background:"none", border:"none", cursor:"pointer",
      color: listening ? C.saffron : C.textD,
      fontSize:17, padding:"4px 6px", lineHeight:1,
      animation: listening ? "breathe 0.9s ease-in-out infinite" : "none",
    }}>🎙</button>
  );
};

// ── Odometer Digit ──
export const OdometerDigit = ({ digit, size = 28, color, delay = 0, triggered }) => {
  const rowH = Math.ceil(size * 1.3);
  const colW = Math.ceil(size * 0.68);
  return (
    <div style={{ overflow: "hidden", height: rowH, width: colW, display: "inline-block" }}>
      <div style={{
        transform: `translateY(${triggered ? -digit * rowH : 0}px)`,
        transition: triggered
          ? `transform 0.9s ${delay}ms cubic-bezier(.25,.46,.45,.94)`
          : "none",
      }}>
        {[0,1,2,3,4,5,6,7,8,9].map(n => (
          <div key={n} style={{
            height: rowH,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: FD, fontSize: size, fontWeight: 500, color, lineHeight: 1,
          }}>{n}</div>
        ))}
      </div>
    </div>
  );
};

export const Odometer = ({ value, size = 28, color, triggered }) => (
  <div style={{ display: "inline-flex", lineHeight: 1, overflow: "hidden" }}>
    {String(value).split("").map((d, i) => (
      <OdometerDigit key={i} digit={Number(d)} size={size} color={color}
        delay={i * 110} triggered={triggered} />
    ))}
  </div>
);

// ── Sacred Circuits Strip ──
export const SacredCircuits = ({nav, isDark}) => {
  const [triggered, setTriggered] = useState(false);
  const [visitCounts, setVisitCounts] = useState({});
  const stripRef = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTriggered(true); obs.disconnect(); }
    }, {threshold: 0.35});
    if (stripRef.current) obs.observe(stripRef.current);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    setVisitCounts({
      Jyotirlingas: cpGet("jyotirlingas").length,
      "Shakti Peethas": cpGet("shakti_peethas").length,
      "Divya Desams": cpGet("divya_desams").length,
      "Char Dhams": cpGet("char_dham").length,
    });
  }, []);
  const circuits = [
    {v:12,  l:"Jyotirlingas",   icon:"☽", h:350, id:"jyotirlingas"},
    {v:51,  l:"Shakti Peethas", icon:"✦", h:280, id:"shakti_peethas"},
    {v:108, l:"Divya Desams",   icon:"☸", h:215, id:"divya_desams"},
    {v:4,   l:"Char Dhams",     icon:"◎", h:140, id:"char_dham"},
  ];
  return (
    <Reveal delay={0}>
      <div style={{margin:"36px 24px 0"}}>
        <SH title="Sacred Circuits" sub="Complete pilgrimage networks of Bhārata"/>
        <div ref={stripRef} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {circuits.map((c,i) => (
            <div key={c.l} className="t" onClick={() => nav("circuits")} style={{
              padding:"18px 16px",borderRadius:20,cursor:"pointer",
              background:`linear-gradient(140deg,${hsl(c.h,35,isDark?11:92)},${C.card})`,
              border:`1px solid ${hsl(c.h,30,isDark?20:78,0.25)}`,
              borderTop:`2.5px solid ${hsl(c.h,50,isDark?38:62,0.55)}`,
              position:"relative",overflow:"hidden",
              animation:`circuitGlow 4s ease-in-out infinite ${i*.8}s`,
            }}>
              <div style={{position:"absolute",top:0,left:"-100%",width:"45%",height:"100%",background:`linear-gradient(105deg,transparent,${hsl(c.h,60,70,0.07)},transparent)`,animation:`premiumSheen 5s ease-in-out infinite ${i*0.9+1}s`,pointerEvents:"none"}}/>
              <ProgressArc visited={visitCounts[c.l]||0} total={c.v} hue={c.h}/>
              <div style={{fontSize:20,marginBottom:8,filter:`drop-shadow(0 0 6px ${hsl(c.h,60,55,0.5)})`}}>{c.icon}</div>
              <Odometer value={c.v} size={28} color={hsl(c.h,55,isDark?68:42)} triggered={triggered}/>
              <div style={{fontSize:11,color:C.textM,fontWeight:600,letterSpacing:.3,marginTop:6}}>{c.l}</div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
};

// ── Circuit Card ──
export const CircuitCard = ({ c, i, onCircuit, isDark }) => {
  const { ref: tiltRef, tilt, onMove, onLeave } = useTilt();
  const [visited, setVisited] = useState(() => cpGet(c.id).length);
  const isSettled = tilt.x === 0 && tilt.y === 0;
  const b1 = hsl(c.hue,35,isDark?13:90), b2 = hsl(c.hue,42,isDark?6:96);
  return (
    <div className="rv" onClick={() => onCircuit(c)} style={{
      borderRadius:24,overflow:"hidden",marginBottom:14,cursor:"pointer",
      background:`linear-gradient(135deg,${b1},${b2})`,
      border:`1px solid ${hsl(c.hue,30,isDark?20:78,0.15)}`,
      boxShadow:`0 6px 32px ${hsl(c.hue,30,5,0.3)}`,
      animationDelay:`${i*.08}s`,position:"relative",
    }}>
      <div ref={tiltRef} onMouseMove={onMove} onTouchMove={onMove} onMouseLeave={onLeave} onTouchEnd={onLeave}
        style={{
          transform:`perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: isSettled ? 'transform 0.5s cubic-bezier(.16,1,.3,1)' : 'none',
          transformOrigin:'center center', willChange:'transform',
        }}>
        <div style={{position:"absolute",top:"-20%",right:"-5%",width:180,height:180,borderRadius:"50%",background:`radial-gradient(circle,${hsl(c.hue,50,40,0.06)},transparent 60%)`,filter:"blur(40px)",pointerEvents:"none"}}/>
        {visited > 0 && (
          <div style={{position:"absolute",top:16,right:16,zIndex:3}}>
            <ProgressArc visited={visited} total={c.count} hue={c.hue} size={40}/>
          </div>
        )}
        <div style={{padding:"22px",position:"relative",zIndex:2}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <div style={{fontSize:9,color:hsl(c.hue,50,55,0.7),fontWeight:800,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>{c.deity}</div>
              <h3 style={{fontFamily:FD,fontSize:22,fontWeight:500,color:C.cream,lineHeight:1.15}}>{c.name}</h3>
            </div>
            <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
              <div style={{fontFamily:FD,fontSize:32,fontWeight:500,color:hsl(c.hue,50,55,0.6),lineHeight:1}}>{c.count}</div>
              <div style={{fontSize:9,color:C.textD,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginTop:3}}>Sites</div>
            </div>
          </div>
          <p style={{fontSize:13,color:C.creamD,lineHeight:1.7,fontFamily:FD,fontStyle:"italic",marginBottom:14}}>{c.essence.slice(0,110)}…</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",gap:6}}>
              {c.pacing.map(p => (
                <div key={p.days} style={{padding:"4px 11px",borderRadius:100,background:"rgba(255,255,255,0.05)",fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:700}}>{p.days}d</div>
              ))}
            </div>
            {visited > 0 && <div style={{fontSize:10,color:hsl(c.hue,55,60,0.8),fontWeight:700}}>{visited}/{c.count} visited</div>}
            <span style={{color:"rgba(255,255,255,0.2)",fontSize:16}}>→</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Feature Card ──
export const FeatureCard = ({ title, sub, icon, hue, onClick, delay, premium }) => {
  const clickedRef = useRef(false);
  const handleClick = () => {
    if (clickedRef.current) return;
    clickedRef.current = true;
    onClick();
    setTimeout(() => { clickedRef.current = false; }, 400);
  };
  return (
    <div className="rv t" onClick={handleClick} style={{
      margin:"14px 24px 0", borderRadius:20, overflow:"hidden", position:"relative",
      minHeight: premium ? 124 : 110, cursor:"pointer", animationDelay: delay,
      boxShadow:`0 8px 32px rgba(0,0,0,0.16)`,
      border:`1px solid ${premium ? "rgba(196,162,78,0.35)" : "rgba(255,255,255,0.06)"}`,
      willChange:"transform",
      WebkitBackfaceVisibility:"hidden",
      backfaceVisibility:"hidden",
    }}>
      <div style={{position:"absolute", inset:0, background:`linear-gradient(135deg,${hsl(hue, premium?55:45, premium?14:12)},${hsl((hue+40)%360, premium?50:40, premium?10:8)})`}} />
      <div style={{position:"absolute", top:"-20%", right:"-6%", width:160, height:160, borderRadius:"50%", background:`radial-gradient(circle,${hsl(hue,60,45,0.1)},transparent 60%)`, filter:"blur(30px)", pointerEvents:"none"}} />
      <div style={{position:"absolute", inset:0, padding:"18px 20px", display:"flex", flexDirection:"column", justifyContent:"flex-end", background:"linear-gradient(transparent 10%,rgba(0,0,0,0.45))"}}>
        <div style={{fontSize:9, color:hsl(hue,70,55,0.85), fontWeight:800, letterSpacing:2, textTransform:"uppercase", marginBottom:6}}>{premium ? "Premium" : "Experience"}</div>
        <h3 style={{fontFamily:FD, fontSize:19, fontWeight:600, color:"#fff", lineHeight:1.1, marginBottom:4}}>{icon} {title}</h3>
        <p style={{fontSize:12, color:"rgba(255,255,255,0.45)", lineHeight:1.4}}>{sub}</p>
      </div>
      <div style={{position:"absolute", top:18, right:18, width:32, height:32, borderRadius:10, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#fff", pointerEvents:"none"}}>→</div>
      {premium && (
        <div style={{position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${hsl(hue,70,60,0.8)},transparent)`}} />
      )}
    </div>
  );
};

// ── Sarathi Om Hero ──
export const SarathiOmHero = () => (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'28px 0 12px',position:'relative'}}>
    <div style={{position:'absolute',top:'50%',left:'50%',width:140,height:140,borderRadius:'50%',background:'radial-gradient(circle,rgba(212,133,60,0.10),transparent 70%)',transform:'translate(-50%,-50%)',animation:'sarathiAura 4s ease-in-out infinite',pointerEvents:'none'}}/>
    <div style={{position:'absolute',top:'50%',left:'50%',width:110,height:110,borderRadius:'50%',border:'1.5px solid rgba(212,133,60,0.15)',animation:'sarathiRingPulse 3.5s ease-out infinite',pointerEvents:'none'}}/>
    <div style={{position:'absolute',top:'50%',left:'50%',width:110,height:110,borderRadius:'50%',border:'1px solid rgba(212,133,60,0.1)',animation:'sarathiRingPulse 3.5s ease-out 1.2s infinite',pointerEvents:'none'}}/>
    <span aria-label="Om — sacred divine presence" style={{
      fontFamily:"'Noto Serif Devanagari', serif",
      fontSize:72,lineHeight:1,color:C.saffron,
      animation:'sarathiBreathe 5s ease-in-out infinite, sarathiGlow 5s ease-in-out infinite',
      userSelect:'none',position:'relative',zIndex:2,
    }}>ॐ</span>
    <div style={{marginTop:10,fontSize:13,color:C.textM,fontFamily:FD,fontWeight:500,letterSpacing:.5}}>
      Sarathi is ready to guide you
    </div>
  </div>
);

// ── Sarathi Thinking Indicator ──
export const SarathiThinking = () => (
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
