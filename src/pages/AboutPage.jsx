import { C, hsl, FD, FB } from "../theme.js";
import { BackBtn, ThemeBtn, OmSymbol } from "../components.jsx";

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
    <div style={{padding:"20px 24px 16px",display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:50,background:C.glass,backdropFilter:"blur(24px)",borderBottom:`1px solid ${C.divL}`}}>
      <BackBtn onClick={onBack}/>
      <h1 style={{fontFamily:FD,fontSize:22,fontWeight:500,color:C.cream,flex:1}}>About</h1>
      <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
    </div>
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
    <AboutSection icon="✦" label="Our Purpose" title="Why This App Was Born" accent="rgba(212,133,60,0.22)">
      <p style={{fontFamily:FD,fontSize:16,color:C.creamM,lineHeight:1.9,letterSpacing:.15}}>
        I am Malla, and this app was born from something far deeper than an idea — it grew from a feeling I have carried with me for a long time. It is my honest attempt to bring sacred temples closer to people who seek something more than just travel, something more than just a destination. It is built for those who want to explore, to feel, to understand, and to connect with a deeper side of India that no image can fully capture.
      </p>
    </AboutSection>
    <AboutSection icon="🏛" label="India's Heritage" title="A Living Memory in Stone" accent="rgba(196,162,78,0.2)">
      <p style={{fontFamily:FD,fontSize:16,color:C.creamM,lineHeight:1.9,letterSpacing:.15}}>
        India is not simply a country — it is a living memory that breathes through its temples, where every stone, every carving, and every hushed corner holds a story that has travelled across generations without losing its meaning. Temples here are not merely places of worship. They are expressions of faith and art, of science and devotion, of time itself — built by hands that believed in something far greater than themselves.
      </p>
    </AboutSection>
    <AboutSection icon="◎" label="Beyond the Famous" title="Temples Waiting to Be Seen" accent="rgba(168,152,120,0.22)">
      <p style={{fontFamily:FD,fontSize:16,color:C.creamM,lineHeight:1.9,letterSpacing:.15}}>
        While a handful of temples are known to the world and visited by millions, there are thousands more that remain quietly hidden — resting in forests, standing on lonely hills, tucked away in villages, or existing in places that most of us will never think to look. These temples are not lesser in any way. They carry powerful local stories, a depth of spiritual energy, and an architectural beauty that has never been fully explored or shared.
      </p>
    </AboutSection>
    <AboutSection icon="❤" label="Why It Matters" title="Preserving What Is Sacred" accent="rgba(180,60,60,0.2)">
      <p style={{fontFamily:FD,fontSize:16,color:C.creamM,lineHeight:1.9,letterSpacing:.15}}>
        Over time, as life moved faster and attention drifted elsewhere, many sacred places were left behind — not because they lost their importance, but because their stories were never brought forward. This app is also a small but sincere step towards encouraging thoughtful, respectful temple tourism — where visiting such places can support local communities, help preserve living traditions, and give these sacred spaces the care they truly deserve.
      </p>
    </AboutSection>
    <AboutDivider/>
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
    <AboutSection icon="◈" label="Crafted with Heart" title="Authentic and Trustworthy" accent="rgba(196,162,78,0.2)">
      <p style={{fontFamily:FD,fontSize:16,color:C.creamM,lineHeight:1.9,letterSpacing:.15}}>
        Every temple listed here has been gathered with care and presented with sincere respect for the traditions they represent. This app is not just a directory — it is a curated collection of sacred experiences, built by someone who deeply believes in the value of what these places hold and the stories they carry.
      </p>
    </AboutSection>
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

export default About;
