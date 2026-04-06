import { useState } from "react";
import { C, hsl, FD, FE, FB } from "../theme.js";
import { STATES, DISTRICT_MAP } from "../data.js";
import { BackBtn, ThemeBtn, LCard, Empty, SH } from "../components.jsx";

export const StateBrowse = ({nav, onBack, isDark, onToggleTheme, onSelect}) => {
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
      <div style={{padding:"0 24px"}}>
        <div style={{fontSize:9,color:C.textDD,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",marginBottom:6,paddingTop:4}}>States ({states.length})</div>
        {states.map((s,i) => <Row key={s.name} s={s} i={i}/>)}
      </div>
      <div style={{padding:"20px 24px 0"}}>
        <div style={{fontSize:9,color:C.gold,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",marginBottom:6}}>Union Territories ({uts.length})</div>
        {uts.map((s,i) => <Row key={s.name} s={s} i={states.length + i}/>)}
      </div>
    </div>
  );
};

export const DistrictBrowse = ({onBack, oT, oF, temples, isDark, onToggleTheme, state}) => {
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
