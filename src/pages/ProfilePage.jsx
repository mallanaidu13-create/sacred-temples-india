import { useState } from "react";
import { C, hsl, FD, FB } from "../theme.js";
import { BackBtn, ThemeBtn, OmSymbol } from "../components.jsx";

const PassportWidget = ({ nav }) => {
  const [claims] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sti_tirtha_claims") || "[]"); } catch { return []; }
  });
  const jyotirlingaClaims = claims.filter((c) => c.circuitId === "jyotirlingas").length;
  return (
    <div onClick={() => nav("tirthaStamps")} className="t" style={{
      margin:"14px 24px 0", padding:"14px 18px", borderRadius:18, background:C.card, border:`1px solid ${C.div}`,
      display:"flex", alignItems:"center", gap:14, cursor:"pointer",
    }}>
      <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,rgba(212,133,60,0.2),rgba(196,162,78,0.1))",border:"1px solid rgba(212,133,60,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🪷</div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700,color:C.cream}}>Tīrtha Passport</div>
        <div style={{fontSize:11,color:C.textD,marginTop:2}}>{jyotirlingaClaims}/12 Jyotirlingas visited</div>
      </div>
      <span style={{color:C.textDD,fontSize:16}}>→</span>
    </div>
  );
};

const Profile = ({isDark, onToggleTheme, temples, nav, ambienceOn, setAmbienceOn}) => {
  const LS_KEY = "sti_profile";
  const load = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } };

  const [user, setUser] = useState(load);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({name:"", email:""});
  const [notifs, setNotifs] = useState(() => load().notifs !== false);
  const [deity, setDeity] = useState(() => load().deity || "All");

  const savedCount = temples.filter(t => t.isFavorite).length;
  const visitedCount = parseInt(load().visited || 0);

  const isSignedIn = !!(user.name);

  const save = (patch) => {
    const next = {...load(), ...patch};
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    setUser(next);
  };

  const initials = (name) => name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);

  const AvatarCircle = ({size=80}) => (
    <div style={{
      width:size,height:size,borderRadius:"50%",flexShrink:0,
      background:isSignedIn
        ? `linear-gradient(140deg,${C.saffron},${C.saffronH})`
        : C.bg3,
      border:`2px solid ${isSignedIn ? "rgba(212,133,60,0.4)" : C.div}`,
      boxShadow:isSignedIn?"0 6px 28px rgba(212,133,60,0.28)":"none",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*0.36,fontWeight:700,
      color:isSignedIn?"#fff":C.textDD,
      fontFamily:FB,
    }}>
      {isSignedIn ? initials(user.name) : "☸"}
    </div>
  );

  if (!isSignedIn && !editing) return (
    <div className="fi" style={{paddingBottom:40}}>
      <div style={{padding:"22px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <h1 style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream}}>Profile</h1>
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
      </div>
      <div style={{margin:"0 24px",borderRadius:28,background:C.card,border:`1px solid ${C.div}`,overflow:"hidden"}}>
        <div style={{height:90,background:`linear-gradient(120deg,${C.saffronDim},${C.bg3})`,borderBottom:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontFamily:FD,fontSize:52,color:"rgba(212,133,60,0.18)",userSelect:"none",letterSpacing:-2}}>ॐ</div>
        </div>
        <div style={{padding:"28px 28px 32px",textAlign:"center"}}>
          <AvatarCircle size={72}/>
          <h2 style={{fontFamily:FD,fontSize:21,fontWeight:500,color:C.cream,marginTop:16}}>Welcome, Devotee</h2>
          <p style={{fontSize:12.5,color:C.textD,marginTop:8,lineHeight:1.7,maxWidth:240,margin:"8px auto 0"}}>Create your profile to track visited temples and sync saved temples across devices.</p>
          <button className="t" onClick={() => { setForm({name:"",email:""}); setEditing(true); }} style={{
            marginTop:24,padding:"14px 44px",borderRadius:18,
            background:`linear-gradient(120deg,${C.saffron},${C.saffronH})`,
            color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",
            fontFamily:FB,letterSpacing:.4,boxShadow:"0 6px 24px rgba(212,133,60,0.35)",
            width:"100%",
          }}>Get Started</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,padding:"20px 24px 0"}}>
        {[{l:"Saved",v:savedCount,icon:<svg width="16" height="16" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>},
           {l:"Visited",v:0,icon:<svg width="16" height="16" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>},
           {l:"Reviews",v:0,icon:<svg width="16" height="16" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>},
        ].map((s,i) => (
          <div key={s.l} className="rv" style={{padding:"18px 12px",borderRadius:20,background:C.card,textAlign:"center",border:`1px solid ${C.div}`,animationDelay:`${.1+i*.06}s`}}>
            <div style={{display:"flex",justifyContent:"center"}}>{s.icon}</div>
            <div style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream,marginTop:10}}>{s.v}</div>
            <div style={{fontSize:9.5,color:C.textD,marginTop:4,fontWeight:700,letterSpacing:.8,textTransform:"uppercase"}}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (editing) return (
    <div className="fi" style={{paddingBottom:40}}>
      <div style={{padding:"22px 24px",display:"flex",alignItems:"center",gap:14}}>
        <BackBtn onClick={() => setEditing(false)}/>
        <h1 style={{fontFamily:FD,fontSize:24,fontWeight:500,color:C.cream,flex:1}}>{isSignedIn?"Edit Profile":"Create Profile"}</h1>
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
      </div>
      <div style={{padding:"0 24px",display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
          <div style={{
            width:88,height:88,borderRadius:"50%",
            background:form.name.trim()
              ? `linear-gradient(140deg,${C.saffron},${C.saffronH})`
              : C.bg3,
            border:`2px solid ${form.name.trim() ? "rgba(212,133,60,0.4)" : C.div}`,
            boxShadow:form.name.trim()?"0 6px 28px rgba(212,133,60,0.28)":"none",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:32,fontWeight:700,color:form.name.trim()?"#fff":C.textDD,fontFamily:FB,
            transition:"all .3s",
          }}>
            {form.name.trim() ? initials(form.name) : "☸"}
          </div>
        </div>
        {[{key:"name",label:"Full Name",placeholder:"e.g. Arjun Sharma",type:"text"},
          {key:"email",label:"Email Address",placeholder:"e.g. arjun@gmail.com",type:"email"},
        ].map(f => (
          <div key={f.key}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:.8,color:C.textD,textTransform:"uppercase",marginBottom:8}}>{f.label}</div>
            <input
              type={f.type}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))}
              style={{
                width:"100%",padding:"14px 18px",borderRadius:16,
                background:C.card,border:`1.5px solid ${C.div}`,
                fontSize:15,color:C.cream,outline:"none",boxSizing:"border-box",
                fontFamily:FB,
              }}
            />
          </div>
        ))}
        <div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:.8,color:C.textD,textTransform:"uppercase",marginBottom:8}}>Favourite Deity</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {["All","Shiva","Vishnu","Devi","Ganesha","Murugan","Hanuman"].map(d => (
              <button key={d} className="t" onClick={() => setForm(p => ({...p,deity:d}))} style={{
                padding:"8px 16px",borderRadius:99,fontSize:12,fontWeight:700,cursor:"pointer",
                background:(form.deity||"All")===d ? C.saffronDim : C.card,
                color:(form.deity||"All")===d ? C.saffron : C.textD,
                border:`1.5px solid ${(form.deity||"All")===d ? "rgba(212,133,60,0.4)" : C.div}`,
              }}>{d}</button>
            ))}
          </div>
        </div>
        <button
          className="t"
          disabled={!form.name.trim()}
          onClick={() => {
            save({name:form.name.trim(), email:form.email.trim(), deity:form.deity||"All", notifs});
            setDeity(form.deity||"All");
            setEditing(false);
          }}
          style={{
            marginTop:8,padding:"15px",borderRadius:18,width:"100%",
            background:form.name.trim()
              ? `linear-gradient(120deg,${C.saffron},${C.saffronH})`
              : C.bg3,
            color:form.name.trim()?"#fff":C.textDD,
            border:"none",fontSize:14,fontWeight:700,cursor:form.name.trim()?"pointer":"default",
            fontFamily:FB,letterSpacing:.4,
            boxShadow:form.name.trim()?"0 6px 24px rgba(212,133,60,0.3)":"none",
            transition:"all .3s",
          }}>
          Save Profile
        </button>
      </div>
    </div>
  );

  return (
    <div className="fi" style={{paddingBottom:40}}>
      <div style={{padding:"22px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <h1 style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream}}>Profile</h1>
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme}/>
      </div>
      <div style={{margin:"0 24px",borderRadius:26,background:C.card,border:`1px solid ${C.div}`,padding:"24px 24px",display:"flex",alignItems:"center",gap:18}}>
        <AvatarCircle size={72}/>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{fontFamily:FD,fontSize:20,fontWeight:500,color:C.cream,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</h2>
          {user.email && <div style={{fontSize:12,color:C.textD,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>}
          {user.deity && user.deity !== "All" && (
            <div style={{marginTop:8,display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:99,background:C.saffronDim,border:`1px solid rgba(212,133,60,0.18)`}}>
              <div style={{width:4,height:4,borderRadius:"50%",background:C.saffron}}/>
              <span style={{fontSize:10,color:C.saffron,fontWeight:700,letterSpacing:.6}}>{user.deity}</span>
            </div>
          )}
        </div>
        <button className="t" onClick={() => { setForm({name:user.name||"",email:user.email||"",deity:user.deity||"All"}); setEditing(true); }} style={{
          padding:"9px 16px",borderRadius:13,background:C.saffronDim,
          border:`1px solid rgba(212,133,60,0.25)`,cursor:"pointer",
          fontSize:11,fontWeight:700,color:C.saffron,letterSpacing:.4,
        }}>Edit</button>
      </div>
      <PassportWidget nav={nav} />
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,padding:"16px 24px 0"}}>
        {[{l:"Saved",v:savedCount,icon:<svg width="16" height="16" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>},
           {l:"Visited",v:visitedCount,icon:<svg width="16" height="16" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>},
           {l:"Reviews",v:parseInt(user.reviews||0),icon:<svg width="16" height="16" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>},
        ].map((s,i) => (
          <div key={s.l} className="rv" style={{padding:"18px 12px",borderRadius:20,background:C.card,textAlign:"center",border:`1px solid ${C.div}`,animationDelay:`${.08+i*.06}s`}}>
            <div style={{display:"flex",justifyContent:"center"}}>{s.icon}</div>
            <div style={{fontFamily:FD,fontSize:28,fontWeight:500,color:C.cream,marginTop:10}}>{s.v}</div>
            <div style={{fontSize:9.5,color:C.textD,marginTop:4,fontWeight:700,letterSpacing:.8,textTransform:"uppercase"}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{margin:"22px 24px 0",borderRadius:22,background:C.card,border:`1px solid ${C.div}`,overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.divL}`}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,color:C.textDD,textTransform:"uppercase"}}>Preferences</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderBottom:`1px solid ${C.divL}`}}>
          <div style={{width:42,height:42,borderRadius:13,background:C.bg3,border:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {isDark
              ? <svg width="17" height="17" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              : <svg width="17" height="17" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </div>
          <span style={{flex:1,fontSize:14,fontWeight:600,color:C.creamM}}>{isDark ? "Dark Mode" : "Light Mode"}</span>
          <div onClick={onToggleTheme} style={{width:50,height:28,borderRadius:99,cursor:"pointer",position:"relative",background:isDark ? C.saffron : C.bg3,border:`1.5px solid ${isDark ? "rgba(212,133,60,0.4)" : C.div}`,transition:"background .3s,border-color .3s"}}>
            <div style={{position:"absolute",top:3,left:isDark?22:3,width:20,height:20,borderRadius:"50%",background:isDark?"#fff":C.textDD,transition:"left .25s cubic-bezier(.16,1,.3,1)",boxShadow:"0 1px 6px rgba(0,0,0,0.18)"}}/>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderBottom:`1px solid ${C.divL}`}}>
          <div style={{width:42,height:42,borderRadius:13,background:C.bg3,border:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="17" height="17" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <span style={{flex:1,fontSize:14,fontWeight:600,color:C.creamM}}>Notifications</span>
          <div onClick={() => { const next = !notifs; setNotifs(next); save({notifs:next}); }} style={{width:50,height:28,borderRadius:99,cursor:"pointer",position:"relative",background:notifs ? C.saffron : C.bg3,border:`1.5px solid ${notifs ? "rgba(212,133,60,0.4)" : C.div}`,transition:"background .3s,border-color .3s"}}>
            <div style={{position:"absolute",top:3,left:notifs?22:3,width:20,height:20,borderRadius:"50%",background:notifs?"#fff":C.textDD,transition:"left .25s cubic-bezier(.16,1,.3,1)",boxShadow:"0 1px 6px rgba(0,0,0,0.18)"}}/>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderBottom:`1px solid ${C.divL}`}}>
          <div style={{width:42,height:42,borderRadius:13,background:C.bg3,border:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="17" height="17" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <span style={{flex:1,fontSize:14,fontWeight:600,color:C.creamM}}>Sacred Ambience</span>
          <div onClick={() => setAmbienceOn((v) => !v)} style={{width:50,height:28,borderRadius:99,cursor:"pointer",position:"relative",background:ambienceOn ? C.saffron : C.bg3,border:`1.5px solid ${ambienceOn ? "rgba(212,133,60,0.4)" : C.div}`,transition:"background .3s,border-color .3s"}}>
            <div style={{position:"absolute",top:3,left:ambienceOn?22:3,width:20,height:20,borderRadius:"50%",background:ambienceOn?"#fff":C.textDD,transition:"left .25s cubic-bezier(.16,1,.3,1)",boxShadow:"0 1px 6px rgba(0,0,0,0.18)"}}/>
          </div>
        </div>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.divL}`}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
            <div style={{width:42,height:42,borderRadius:13,background:C.bg3,border:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="17" height="17" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            </div>
            <span style={{fontSize:14,fontWeight:600,color:C.creamM}}>Favourite Deity</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7,paddingLeft:56}}>
            {["All","Shiva","Vishnu","Devi","Ganesha","Murugan","Hanuman"].map(d => (
              <button key={d} className="t" onClick={() => { setDeity(d); save({deity:d}); }} style={{
                padding:"6px 14px",borderRadius:99,fontSize:11,fontWeight:700,cursor:"pointer",
                background:deity===d ? C.saffronDim : C.bg3,
                color:deity===d ? C.saffron : C.textD,
                border:`1.5px solid ${deity===d ? "rgba(212,133,60,0.4)" : C.divL}`,
                transition:"all .2s",
              }}>{d}</button>
            ))}
          </div>
        </div>
        <div className="t" onClick={() => nav("about")} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",cursor:"pointer"}}>
          <div style={{width:42,height:42,borderRadius:13,background:C.bg3,border:`1px solid ${C.div}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="17" height="17" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:C.creamM}}>About Sacred Temples</div>
            <div style={{fontSize:11,color:C.textD,marginTop:2}}>Our story · Version 1.0</div>
          </div>
          <span style={{color:C.textDD,fontSize:16}}>→</span>
        </div>
      </div>
      <div style={{padding:"20px 24px 0"}}>
        <button className="t" onClick={() => { localStorage.removeItem(LS_KEY); setUser({}); setEditing(false); }} style={{
          width:"100%",padding:"14px",borderRadius:18,
          background:"rgba(239,68,68,0.07)",border:"1.5px solid rgba(239,68,68,0.18)",
          color:"#ef4444",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:.3,
          fontFamily:FB,
        }}>Sign Out</button>
      </div>
    </div>
  );
};

export default Profile;
