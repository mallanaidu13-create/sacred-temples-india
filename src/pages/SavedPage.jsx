import { C, FD } from "../theme.js";
import { ThemeBtn, LCard, FCard, SH, Empty, CardCarousel } from "../components.jsx";

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

export default Saved;
