import { useState } from "react";
import { C, hsl, FD, FB, FE } from "../theme.js";
import { DEITIES } from "../data.js";
import { deityQuery, skelBg } from "../utils.js";
import { TempleImage, ThemeBtn, Chip, LCard, FCard, SkeletonListCard, Empty, SH } from "../components.jsx";

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
                <TempleImage src={null} hue={t.hue} style={{position:"absolute",inset:0,width:"100%",height:"100%"}} omSize={44}/>
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

export default Explore;
