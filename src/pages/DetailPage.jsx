import { useState, useEffect, useRef } from "react";
import { C, hsl, FD, FB, FE } from "../theme.js";
import { useParallax } from "../hooks.js";
import { TempleImage, BackBtn, ThemeBtn, IR, OmSvg, OmSymbol } from "../components.jsx";

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
  const imgSrc = null;
  const [px, py] = useParallax();
  return (
    <div className="fi" style={{paddingBottom:44}}>
      <div style={{height: heroCollapsed ? 240 : 390, position:"relative",overflow:"hidden",transition:'height 0.42s cubic-bezier(.16,1,.3,1)'}}>
        <TempleImage src={imgSrc} hue={t.hue} style={{position:"absolute",inset:0,width:"100%",height:"100%"}} omSize={80} px={px} py={py}/>
        <div style={{position:"absolute",inset:0,background:`linear-gradient(180deg,rgba(0,0,0,0.35) 0%,transparent 35%,rgba(0,0,0,0.1) 55%,${b3} 100%)`}}/>
        {heroCollapsed && (
          <div className="fi" style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 80px",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(transparent,${b3} 70%)`,zIndex:4,animationDuration:'0.2s'}}>
            <span style={{fontFamily:FD,fontSize:17,fontWeight:500,color:"#fff",textAlign:"center",lineHeight:1.2,textShadow:"0 1px 8px rgba(0,0,0,0.6)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{t.templeName}</span>
          </div>
        )}
        <div style={{position:"absolute",top:18,left:18,right:18,display:"flex",justifyContent:"space-between",zIndex:5}}>
          <BackBtn onClick={onBack} glass/>
          <div style={{display:"flex",gap:8}}>
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
            <div style={{borderRadius:20,overflow:"hidden",height:240,position:"relative",marginBottom:8}}>
              <TempleImage src={null} hue={t.hue} style={{width:"100%",height:"100%"}} omSize={56}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{borderRadius:16,overflow:"hidden",height:150,position:"relative"}}>
                  <TempleImage src={null} hue={t.hue} style={{width:"100%",height:"100%"}} omSize={32}/>
                </div>
              ))}
            </div>
            <div style={{borderRadius:20,overflow:"hidden",height:180,position:"relative",marginTop:8}}>
              <TempleImage src={null} hue={t.hue} style={{width:"100%",height:"100%"}} omSize={44}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Detail;
