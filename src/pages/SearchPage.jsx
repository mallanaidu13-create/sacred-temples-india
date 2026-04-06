import { useState } from "react";
import { C, FD, FB } from "../theme.js";
import { POPULAR_SEARCHES } from "../data.js";
import { BackBtn, LCard, VoiceSearch, Empty } from "../components.jsx";

const Search = ({oT, oF, onBack, temples}) => {
  const [q, setQ] = useState("");
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem('searchHistory')||'[]'); } catch { return []; } });
  const res = q ? temples.filter(t => [t.templeName,t.deityPrimary,t.townOrCity,t.district,t.stateOrUnionTerritory].some(f => f?.toLowerCase().includes(q.toLowerCase()))) : [];
  const saveHistory = (term) => {
    if (!term.trim()) return;
    const next = [term, ...history.filter(x => x !== term)].slice(0,5);
    setHistory(next);
    localStorage.setItem('searchHistory', JSON.stringify(next));
  };
  const doSearch = (term) => { setQ(term); saveHistory(term); };
  const clearHistory = () => { setHistory([]); localStorage.removeItem('searchHistory'); };
  return (
    <div className="fi" style={{minHeight:"100vh",background:C.bg}}>
      <div style={{padding:"16px 24px",display:"flex",alignItems:"center",gap:14}}>
        <BackBtn onClick={onBack}/>
        <div style={{flex:1,padding:"13px 18px",borderRadius:16,background:C.card,display:"flex",alignItems:"center",gap:12,border:`2px solid ${C.saffron}`,boxShadow:`0 0 0 4px ${C.saffronDim}`}}>
          <span style={{fontSize:15,color:C.saffron}}>⌕</span>
          <input autoFocus type="search" aria-label="Search temples" placeholder="Temple, deity, city, state…" value={q} onChange={e => { setQ(e.target.value); }} onKeyDown={e => e.key==='Enter' && saveHistory(q)} style={{flex:1,border:"none",outline:"none",fontSize:14,fontFamily:FB,color:C.cream,background:"transparent"}}/>
          {q ? <button aria-label="Clear search" className="t" onClick={() => setQ("")} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:C.textD}}>✕</button> : <VoiceSearch onResult={term => { setQ(term); saveHistory(term); }}/>}
        </div>
      </div>
      {!q ? <div style={{padding:"18px 24px"}}>
        {history.length > 0 && (
          <div style={{marginBottom:22}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:9,color:C.textDD,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase"}}>Recent Searches</div>
              <button className="t" onClick={clearHistory} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:C.textD,fontWeight:600}}>Clear</button>
            </div>
            {history.map((s,i) => (
              <div key={s} className="t rv" onClick={() => doSearch(s)} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 0",borderBottom:`1px solid ${C.divL}`,cursor:"pointer",animationDelay:`${i*.04}s`}}>
                <svg width="13" height="13" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.49"/></svg>
                <span style={{fontSize:14,color:C.textM,flex:1}}>{s}</span>
                <button className="t" onClick={e => { e.stopPropagation(); const next = history.filter(x=>x!==s); setHistory(next); localStorage.setItem('searchHistory',JSON.stringify(next)); }} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.textDD}}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={{fontSize:9,color:C.textDD,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",marginBottom:18}}>Popular Searches</div>
        {POPULAR_SEARCHES.map((s,i) => (
          <div key={s} className="t rv" onClick={() => doSearch(s)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:`1px solid ${C.divL}`,cursor:"pointer",animationDelay:`${i*.04}s`}}>
            <svg width="13" height="13" fill="none" stroke={C.textDD} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <span style={{fontSize:14,color:C.textM}}>{s}</span>
          </div>
        ))}
      </div> : res.length > 0 ? <div style={{paddingTop:10}}>
        <div role="status" aria-live="polite" style={{padding:"0 24px 12px",fontSize:12,color:C.textD}}>{res.length} result{res.length !== 1 ? "s" : ""}</div>
        {res.map((t,i) => <LCard key={t.id} t={t} onClick={oT} onFav={oF} d={i*.04}/>)}
      </div> : <Empty emoji="⌕" title="No Results" sub={`Nothing for "${q}". Try another search.`}/>}
    </div>
  );
};

export default Search;
