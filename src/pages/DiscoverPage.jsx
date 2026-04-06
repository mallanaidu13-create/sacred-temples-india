import { useState, useRef } from "react";
import { C, hsl, FD, FB } from "../theme.js";
import { haptic, deityQuery } from "../utils.js";
import { useParallax } from "../hooks.js";
import { TempleImage, OmSymbol, BackBtn } from "../components.jsx";

const Discover = ({temples, oT, onBack}) => {
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState({x:0, y:0, active:false});
  const [flyDir, setFlyDir] = useState(null);
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
      <div style={{position:'absolute',top:'40%',left:'50%',width:320,height:320,borderRadius:'50%',background:'radial-gradient(circle,rgba(212,133,60,0.08),transparent 60%)',transform:'translate(-50%,-50%)',filter:'blur(50px)',animation:'breathe 5s ease-in-out infinite',pointerEvents:'none'}}/>
      {[200,148,100].map((r,i) => (
        <div key={i} style={{position:'absolute',top:'42%',left:'50%',width:r,height:r,borderRadius:'50%',border:`1px solid rgba(212,133,60,${0.06+i*0.04})`,transform:'translate(-50%,-50%)',animation:`breathe ${7+i*2}s ease-in-out infinite ${i*.7}s`,pointerEvents:'none'}}/>
      ))}
      {[0,1,2].map(i => (
        <div key={`rp${i}`} style={{position:'absolute',top:'42%',left:'50%',width:140,height:140,borderRadius:'50%',border:'1.5px solid rgba(212,133,60,0.12)',transform:'translate(-50%,-50%)',animation:`ringExpand 3.4s ease-out infinite ${i*1.13}s`,pointerEvents:'none'}}/>
      ))}
      <OmSymbol size={112} style={{marginBottom:28}} />
      <h2 className="rv" style={{fontFamily:FD,fontSize:28,color:C.cream,textAlign:'center',lineHeight:1.25,position:'relative',zIndex:2,animationDelay:'.1s'}}>Sacred Journey<br/>Complete</h2>
      <p className="rv" style={{fontSize:13,color:C.textD,textAlign:'center',lineHeight:1.85,maxWidth:270,marginTop:14,position:'relative',zIndex:2,animationDelay:'.18s'}}>
        You've journeyed through {temples.length} sacred temples.<br/>May the divine bless your path.
      </p>
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

  const cardBase = {
    position:'absolute', left:20, right:20, top:0, bottom:0,
    borderRadius:28, overflow:'hidden',
  };

  return (
    <div style={{height:'100vh',background:C.bg,display:'flex',flexDirection:'column',overflow:'hidden',userSelect:'none'}}>
      <div style={{padding:'20px 24px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <BackBtn onClick={onBack}/>
        <div style={{textAlign:'center'}}>
          <h1 style={{fontFamily:FD,fontSize:22,fontWeight:500,color:C.cream}}>Discover</h1>
          <div style={{fontSize:10,color:C.textD,marginTop:2,letterSpacing:.5}}>{idx+1} of {temples.length}</div>
        </div>
        <div style={{width:46,height:46,borderRadius:'50%',background:C.saffronDim,border:`1px solid rgba(212,133,60,0.15)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:C.saffron}}>{Math.round(idx/temples.length*100)}%</div>
      </div>

      <div style={{flex:1,position:'relative',margin:'0 0 8px'}}>
        <div style={{
          position:'absolute',inset:0,pointerEvents:'none',borderRadius:28,zIndex:0,
          background: drag.x > 0
            ? `rgba(34,197,94,${Math.min(0.13, drag.x / 850)})`
            : drag.x < 0
            ? `rgba(239,68,68,${Math.min(0.13, -drag.x / 850)})`
            : 'transparent',
          transition: drag.active ? 'none' : 'background 0.45s ease',
        }}/>
        {third && (
          <div style={{...cardBase,background:`linear-gradient(165deg,${hsl(third.hue,40,16)},${hsl(third.hue,50,4)})`,transform:`translateY(${20-progress*10}px) scale(${0.88+progress*0.06})`,transition:flyDir?'transform 0.45s cubic-bezier(.16,1,.3,1)':'transform 0.18s',zIndex:1,opacity:0.65}}>
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FD,fontSize:52,color:'rgba(212,133,60,0.07)'}}>ॐ</div>
          </div>
        )}
        {second && (
          <div style={{...cardBase,transform:`translateY(${10-progress*10}px) scale(${0.94+progress*0.06})`,transition:flyDir?'transform 0.45s cubic-bezier(.16,1,.3,1)':'transform 0.18s',zIndex:2}}>
            <TempleImage src={null} hue={second.hue} style={{position:'absolute',inset:0,width:'100%',height:'100%'}} omSize={60}/>
            <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'100px 22px 22px',background:'linear-gradient(transparent,rgba(0,0,0,0.88))'}}>
              <h3 style={{fontFamily:FD,fontSize:20,fontWeight:500,color:'#fff',lineHeight:1.1}}>{second.templeName}</h3>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:5}}>{second.townOrCity}</div>
            </div>
          </div>
        )}
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
          <TempleImage src={null} hue={top.hue} style={{position:'absolute',inset:0,width:'100%',height:'100%'}} omSize={72} px={px} py={py}/>
          {(() => { const p = Math.max(0, Math.min(1, (drag.x - 55) / 60)); const sc = 0.55 + p * 0.55; return (
          <div style={{position:'absolute',top:32,left:20,padding:'9px 22px',borderRadius:14,background:'rgba(34,197,94,0.92)',backdropFilter:'blur(8px)',border:'2.5px solid rgba(255,255,255,0.55)',fontSize:16,fontWeight:800,color:'#fff',letterSpacing:.8,transform:`rotate(-10deg) scale(${flyDir==='right'?1:sc})`,opacity:flyDir==='right'?1:p,transition:drag.active?'none':'all 0.32s cubic-bezier(.16,1,.3,1)',pointerEvents:'none'}}>
            SAVED ♥
          </div>);})()}
          {(() => { const p = Math.max(0, Math.min(1, (-drag.x - 55) / 60)); const sc = 0.55 + p * 0.55; return (
          <div style={{position:'absolute',top:32,right:20,padding:'9px 22px',borderRadius:14,background:'rgba(239,68,68,0.92)',backdropFilter:'blur(8px)',border:'2.5px solid rgba(255,255,255,0.55)',fontSize:16,fontWeight:800,color:'#fff',letterSpacing:.8,transform:`rotate(10deg) scale(${flyDir==='left'?1:sc})`,opacity:flyDir==='left'?1:p,transition:drag.active?'none':'all 0.32s cubic-bezier(.16,1,.3,1)',pointerEvents:'none'}}>
            SKIP ✕
          </div>);})()}
          <div style={{position:'absolute',top:18,left:'50%',transform:'translateX(-50%)',zIndex:5,pointerEvents:'none'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 14px',borderRadius:100,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.14)',fontSize:10,color:'rgba(255,255,255,0.92)',fontWeight:700,letterSpacing:.7,whiteSpace:'nowrap'}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#E69A52',boxShadow:'0 0 8px rgba(212,133,60,0.8)'}}/>{top.deityPrimary}
            </div>
          </div>
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

      <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:22,padding:'6px 24px 38px',flexShrink:0}}>
        <button className="t" onClick={() => { if (!flyDir) setFlyDir('left'); }} style={{width:64,height:64,borderRadius:'50%',background:C.card,border:`1px solid ${C.div}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,cursor:'pointer',boxShadow:'0 4px 24px rgba(0,0,0,0.15)',color:'#ef4444'}}>✕</button>
        <button className="t" onClick={() => oT(top)} style={{width:50,height:50,borderRadius:'50%',background:C.bg3,border:`1px solid ${C.divL}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,cursor:'pointer',color:C.textM}}>↑</button>
        <button className="t" onClick={() => { if (!flyDir) setFlyDir('right'); }} style={{width:64,height:64,borderRadius:'50%',background:'rgba(212,133,60,0.1)',border:`1.5px solid rgba(212,133,60,0.3)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,cursor:'pointer',color:C.saffron,boxShadow:`0 4px 28px rgba(212,133,60,0.18)`}}>♥</button>
      </div>
    </div>
  );
};

export default Discover;
