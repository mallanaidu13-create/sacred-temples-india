import { C, FD, FB } from "../theme.js";
import { useOmChant } from "../hooks.js";
import { BackBtn, ThemeBtn, OmSymbol } from "../components.jsx";

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
      <div style={{padding:"20px 24px 0",display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:50,background:C.glass,backdropFilter:"blur(24px)",borderBottom:`1px solid ${C.divL}`}}>
        <BackBtn onClick={onBack}/>
        <h1 style={{fontFamily:FD,fontSize:22,fontWeight:500,color:C.cream,flex:1}}>Audio Guide</h1>
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
      </div>
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
      <div style={{display:"flex",alignItems:"center",gap:14,padding:"0 28px",marginBottom:28}}>
        <div style={{flex:1,height:1,background:`linear-gradient(to right,transparent,rgba(196,162,78,0.15))`}}/>
        <span style={{fontFamily:FD,fontSize:14,color:"rgba(196,162,78,0.25)"}}>✦</span>
        <div style={{flex:1,height:1,background:`linear-gradient(to left,transparent,rgba(196,162,78,0.15))`}}/>
      </div>
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

export default AudioGuide;
