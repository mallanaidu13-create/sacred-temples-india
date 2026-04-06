import { useState } from "react";
import { C, hsl, FD, FB, FE } from "../theme.js";
import { haptic, cpGet, cpSet } from "../utils.js";
import { useTilt } from "../hooks.js";
import { BackBtn, ProgressArc } from "../components.jsx";
import { CIRCUITS, CIRCUIT_COORDS } from "../content/sacred-circuits/circuits.js";

// ── Circuit card with 3D tilt ──
const CircuitCard = ({ c, i, onCircuit, isDark }) => {
  const { ref: tiltRef, tilt, onMove, onLeave } = useTilt();
  const [visited] = useState(() => cpGet(c.id).length);
  const isSettled = tilt.x === 0 && tilt.y === 0;
  const b1 = hsl(c.hue, 35, isDark ? 13 : 90), b2 = hsl(c.hue, 42, isDark ? 6 : 96);
  return (
    <div className="rv" onClick={() => onCircuit(c)} style={{
      borderRadius: 24, overflow: "hidden", marginBottom: 14, cursor: "pointer",
      background: `linear-gradient(135deg,${b1},${b2})`,
      border: `1px solid ${hsl(c.hue, 30, isDark ? 20 : 78, 0.15)}`,
      boxShadow: `0 6px 32px ${hsl(c.hue, 30, 5, 0.3)}`,
      animationDelay: `${i * .08}s`, position: "relative",
    }}>
      <div ref={tiltRef} onMouseMove={onMove} onTouchMove={onMove} onMouseLeave={onLeave} onTouchEnd={onLeave}
        style={{
          transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: isSettled ? 'transform 0.5s cubic-bezier(.16,1,.3,1)' : 'none',
          transformOrigin: 'center center', willChange: 'transform',
        }}>
        <div style={{ position: "absolute", top: "-20%", right: "-5%", width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle,${hsl(c.hue, 50, 40, 0.06)},transparent 60%)`, filter: "blur(40px)", pointerEvents: "none" }} />
        {visited > 0 && (
          <div style={{ position: "absolute", top: 16, right: 16, zIndex: 3 }}>
            <ProgressArc visited={visited} total={c.count} hue={c.hue} size={40} />
          </div>
        )}
        <div style={{ padding: "22px", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 9, color: hsl(c.hue, 50, 55, 0.7), fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{c.deity}</div>
              <h3 style={{ fontFamily: FD, fontSize: 22, fontWeight: 500, color: C.cream, lineHeight: 1.15 }}>{c.name}</h3>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
              <div style={{ fontFamily: FD, fontSize: 32, fontWeight: 500, color: hsl(c.hue, 50, 55, 0.6), lineHeight: 1 }}>{c.count}</div>
              <div style={{ fontSize: 9, color: C.textD, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginTop: 3 }}>Sites</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: C.creamD, lineHeight: 1.7, fontFamily: FD, fontStyle: "italic", marginBottom: 14 }}>{c.essence.slice(0, 110)}…</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {c.pacing.map(p => (
                <div key={p.days} style={{ padding: "4px 11px", borderRadius: 100, background: "rgba(255,255,255,0.05)", fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>{p.days}d</div>
              ))}
            </div>
            {visited > 0 && <div style={{ fontSize: 10, color: hsl(c.hue, 55, 60, 0.8), fontWeight: 700 }}>{visited}/{c.count} visited</div>}
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 16 }}>→</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CircuitsPage = ({ onCircuit, isDark }) => (
  <div className="fi" style={{ paddingBottom: 24 }}>
    <div style={{ background: `linear-gradient(175deg,${hsl(28, 35, isDark ? 13 : 90)},${hsl(28, 40, isDark ? 6 : 96)} 55%,${C.bg})`, padding: "26px 24px 36px", borderRadius: "0 0 34px 34px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(196,162,78,0.06),transparent 60%)", filter: "blur(50px)", animation: "breathe 10s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ fontSize: 9, color: "rgba(196,162,78,0.5)", fontWeight: 800, letterSpacing: 5, textTransform: "uppercase", marginBottom: 10, position: "relative", zIndex: 2 }}>Pilgrim's Atlas</div>
      <h1 style={{ fontFamily: FD, fontSize: 36, color: C.cream, fontWeight: 500, lineHeight: .96, letterSpacing: -.4, position: "relative", zIndex: 2 }}>Sacred<br />Circuits</h1>
      <p style={{ fontFamily: FD, fontSize: 14, color: C.textDD, marginTop: 10, fontStyle: "italic", position: "relative", zIndex: 2 }}>of Bhārata</p>
      <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 28, position: "relative", zIndex: 2 }}>
        {[{ v: "175", l: "Sacred Sites" }, { v: "4", l: "Circuits" }, { v: "∞", l: "Lifetimes" }].map(s => (
          <div key={s.l} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: FD, fontSize: 20, fontWeight: 500, color: C.cream }}>{s.v}</div>
            <div style={{ fontSize: 9, color: C.textDD, fontWeight: 700, letterSpacing: 1.2, marginTop: 4, textTransform: "uppercase" }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
    <div style={{ padding: "32px 24px 0" }}>
      <div style={{ fontSize: 9, color: C.textDD, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 20 }}>The Four Sacred Circuits</div>
      {CIRCUITS.map((c, i) => (
        <CircuitCard key={c.id} c={c} i={i} onCircuit={onCircuit} isDark={isDark} />
      ))}
    </div>
  </div>
);

export const CircuitDetail = ({ circuit: c, onBack, isDark }) => {
  const [tab, setTab] = useState("overview");
  const [visited, setVisited] = useState(() => new Set(cpGet(c.id)));
  const toggleVisited = (idx) => setVisited(prev => {
    const next = new Set(prev);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    cpSet(c.id, [...next]);
    haptic(20);
    return next;
  });
  const b1 = hsl(c.hue, 38, isDark ? 15 : 88), b2 = hsl(c.hue, 44, isDark ? 7 : 94), b3 = hsl(c.hue, 50, isDark ? 3 : 97);
  return (
    <div className="fi" style={{ paddingBottom: 44 }}>
      <div style={{ height: 300, position: "relative", overflow: "hidden", background: `linear-gradient(178deg,${b1},${b2} 50%,${b3})` }}>
        <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 6 }} viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M12,0.5 L0.5,0.5 L0.5,12" fill="none" stroke={hsl(c.hue, 60, 55, 0.55)} strokeWidth="0.6" strokeLinecap="round" style={{ strokeDasharray: "24", strokeDashoffset: "24", animation: "borderDraw 0.75s cubic-bezier(.22,1,.36,1) 0.25s both" }} />
          <path d="M88,0.5 L99.5,0.5 L99.5,12" fill="none" stroke={hsl(c.hue, 60, 55, 0.55)} strokeWidth="0.6" strokeLinecap="round" style={{ strokeDasharray: "24", strokeDashoffset: "24", animation: "borderDraw 0.75s cubic-bezier(.22,1,.36,1) 0.45s both" }} />
          <path d="M0.5,88 L0.5,99.5 L12,99.5" fill="none" stroke={hsl(c.hue, 60, 55, 0.4)} strokeWidth="0.6" strokeLinecap="round" style={{ strokeDasharray: "24", strokeDashoffset: "24", animation: "borderDraw 0.75s cubic-bezier(.22,1,.36,1) 0.65s both" }} />
          <path d="M99.5,88 L99.5,99.5 L88,99.5" fill="none" stroke={hsl(c.hue, 60, 55, 0.4)} strokeWidth="0.6" strokeLinecap="round" style={{ strokeDasharray: "24", strokeDashoffset: "24", animation: "borderDraw 0.75s cubic-bezier(.22,1,.36,1) 0.85s both" }} />
        </svg>
        <div style={{ position: "absolute", top: "10%", right: "0", width: 250, height: 250, borderRadius: "50%", background: `radial-gradient(circle,${hsl(c.hue, 55, 45, 0.06)},transparent 55%)`, filter: "blur(50px)", animation: "breathe 9s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "18%", left: "50%", animation: "drift 10s ease-in-out infinite", pointerEvents: "none" }}>
          <span style={{ fontFamily: FD, fontSize: 64, color: hsl(c.hue, 30, 50, 0.025), userSelect: "none" }}>{c.sk}</span>
        </div>
        <div style={{ position: "absolute", top: 18, left: 18, zIndex: 5 }}>
          <BackBtn onClick={onBack} glass />
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "100px 24px 22px", background: `linear-gradient(transparent,${b3}bb 30%,${b3} 100%)` }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 13px", borderRadius: 100, background: "rgba(255,255,255,0.07)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.saffronH, boxShadow: `0 0 8px ${C.saffron}` }} /><span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 700, letterSpacing: .6 }}>{c.deity}</span>
            </div>
            <div style={{ padding: "4px 12px", borderRadius: 100, background: "rgba(255,255,255,0.04)", fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700 }}>{c.count} sacred sites</div>
          </div>
          <h1 style={{ fontFamily: FD, fontSize: 26, fontWeight: 500, color: C.cream, lineHeight: 1.1 }}>{c.name}</h1>
          <div style={{ marginTop: 6, fontFamily: FD, fontSize: 12, color: "rgba(255,255,255,0.22)", fontStyle: "italic" }}>{c.sk}</div>
        </div>
      </div>
      <div style={{ display: "flex", background: C.glass, backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.divL}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 50, overflowX: "auto" }}>
        {["overview", "temples", "pacing", "wisdom", "map"].map(tb => (
          <button key={tb} className="t" onClick={() => setTab(tb)} style={{ padding: "15px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 12.5, fontWeight: tab === tb ? 700 : 400, color: tab === tb ? C.saffron : C.textD, fontFamily: FB, textTransform: "capitalize", letterSpacing: .4, borderBottom: `2.5px solid ${tab === tb ? C.saffron : "transparent"}`, transition: "all .2s", whiteSpace: "nowrap" }}>{tb}</button>
        ))}
      </div>
      <div style={{ padding: "20px 24px 0" }}>
        {tab === "overview" && <div className="fi">
          <div style={{ padding: "0 0 20px", borderBottom: `1px solid ${C.divL}` }}>
            <div style={{ fontSize: 9, color: C.textDD, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Spiritual Essence</div>
            <p style={{ fontFamily: FD, fontSize: 17, color: C.creamM, lineHeight: 1.95 }}>{c.essence}</p>
          </div>
          <div style={{ padding: "20px 0", borderBottom: `1px solid ${C.divL}` }}>
            <div style={{ fontSize: 9, color: C.textDD, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Significance</div>
            <p style={{ fontSize: 14.5, color: C.creamM, lineHeight: 1.8 }}>{c.significance}</p>
          </div>
          <div style={{ padding: "20px 0", borderBottom: `1px solid ${C.divL}` }}>
            <div style={{ fontSize: 9, color: C.textDD, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Best For</div>
            <p style={{ fontSize: 14, color: C.creamD, lineHeight: 1.7 }}>{c.bestFor}</p>
          </div>
          <div style={{ padding: "20px 0", borderBottom: `1px solid ${C.divL}` }}>
            <div style={{ fontSize: 9, color: C.textDD, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Best Season</div>
            <p style={{ fontSize: 14, color: C.creamD, lineHeight: 1.7 }}>{c.season}</p>
          </div>
          <div style={{ margin: "20px 0 0", padding: 20, borderRadius: 18, background: C.goldDim, border: "1px solid rgba(196,162,78,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 14 }}>🕉</span><span style={{ fontSize: 9.5, fontWeight: 800, color: C.gold, letterSpacing: 1.2, textTransform: "uppercase" }}>Sacred Verse</span></div>
            <p style={{ fontFamily: FD, fontSize: 13, color: C.creamD, lineHeight: 2, fontStyle: "italic", whiteSpace: "pre-line" }}>{c.stotram}</p>
          </div>
        </div>}
        {tab === "temples" && <div className="fi">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.textD }}>Key sites · {c.count} total in complete circuit</div>
            {visited.size > 0 && <div style={{ fontSize: 11, color: hsl(c.hue, 55, 60), fontWeight: 700 }}>{visited.size} visited</div>}
          </div>
          {c.temples.map((t, i) => (
            <div key={i} className="rv" style={{ padding: "14px 0", borderBottom: `1px solid ${C.divL}`, animationDelay: `${i * .04}s` }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <button className="t" onClick={() => toggleVisited(i)} aria-label={visited.has(i) ? "Mark not visited" : "Mark visited"} style={{ width: 34, height: 34, borderRadius: 11, background: visited.has(i) ? `linear-gradient(145deg,${hsl(c.hue, 55, 30)},${hsl(c.hue, 60, 20)})` : `linear-gradient(145deg,${hsl(c.hue, 35, 16)},${hsl(c.hue, 45, 8)})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: visited.has(i) ? 14 : 11, color: visited.has(i) ? hsl(c.hue, 70, 75) : hsl(c.hue, 50, 55, 0.7), fontWeight: 700, fontFamily: FD, border: `1px solid ${visited.has(i) ? hsl(c.hue, 50, 35, 0.5) : "transparent"}`, cursor: "pointer", transition: "all .3s cubic-bezier(.22,1,.36,1)", boxShadow: visited.has(i) ? `0 0 12px ${hsl(c.hue, 50, 40, 0.25)}` : "none" }}>{visited.has(i) ? "✓" : i + 1}</button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: visited.has(i) ? hsl(c.hue, 50, 70) : C.cream, fontFamily: FD, marginBottom: 3, transition: "color .3s" }}>{t.n}</div>
                  <div style={{ fontSize: 11.5, color: C.textD, marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 3, height: 3, borderRadius: "50%", background: C.textDD }} />{t.loc}</div>
                  {t.note && <div style={{ fontSize: 12, color: C.creamD, lineHeight: 1.6, fontStyle: "italic" }}>{t.note}</div>}
                </div>
              </div>
            </div>
          ))}
          {c.count > c.temples.length && <div style={{ padding: "18px 0", textAlign: "center" }}><div style={{ fontSize: 13, color: C.textD, fontStyle: "italic", fontFamily: FD }}>+ {c.count - c.temples.length} more sacred sites in the complete circuit</div></div>}
        </div>}
        {tab === "pacing" && <div className="fi">
          <div style={{ fontSize: 9, color: C.textDD, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 18 }}>Choose Your Journey</div>
          {c.pacing.map((p, i) => (
            <div key={i} className="rv" style={{ padding: 20, borderRadius: 20, background: C.card, border: `1px solid ${C.div}`, marginBottom: 12, animationDelay: `${i * .06}s` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(145deg,${hsl(c.hue, 35, 18)},${hsl(c.hue, 45, 8)})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px solid ${hsl(c.hue, 30, 25, 0.15)}` }}>
                  <span style={{ fontFamily: FD, fontSize: 18, fontWeight: 500, color: hsl(c.hue, 50, 60, 0.8), lineHeight: 1 }}>{p.days}</span>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontWeight: 700, letterSpacing: .5 }}>days</span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.cream, marginBottom: 2 }}>{p.label}</div>
                  <div style={{ fontSize: 10, color: C.textD, letterSpacing: .5 }}>{p.days}-day circuit</div>
                </div>
              </div>
              <p style={{ fontSize: 13.5, color: C.creamD, lineHeight: 1.75 }}>{p.desc}</p>
            </div>
          ))}
        </div>}
        {tab === "wisdom" && <div className="fi">
          <div style={{ fontSize: 9, color: C.textDD, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 18 }}>Pilgrim's Wisdom</div>
          {c.tips.map((tip, i) => (
            <div key={i} className="rv" style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: `1px solid ${C.divL}`, animationDelay: `${i * .05}s` }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: C.saffronDim, border: "1px solid rgba(212,133,60,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, color: C.saffron, fontWeight: 700, fontFamily: FD }}>{i + 1}</div>
              <p style={{ fontSize: 14, color: C.creamM, lineHeight: 1.75, paddingTop: 4 }}>{tip}</p>
            </div>
          ))}
        </div>}
        {tab === "map" && (() => {
          const pts = CIRCUIT_COORDS[c.id] || [];
          if (!pts.length) return <div style={{ padding: 40, textAlign: "center", color: C.textD, fontStyle: "italic", fontFamily: FD }}>Map not available for this circuit.</div>;
          const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
          const minX = Math.min(...xs) - 14, maxX = Math.max(...xs) + 14;
          const minY = Math.min(...ys) - 14, maxY = Math.max(...ys) + 14;
          const vw = maxX - minX, vh = maxY - minY;
          const routeD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
          const routeLen = pts.length * 28;
          return (
            <div className="fi" style={{ paddingBottom: 24 }}>
              <div style={{ fontSize: 9, color: C.textDD, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Pilgrimage Route Map</div>
              <div style={{ borderRadius: 22, overflow: "hidden", background: C.card, border: `1px solid ${C.div}`, padding: 12 }}>
                <svg viewBox={`${minX} ${minY} ${vw} ${vh}`} style={{ width: "100%", height: "auto", display: "block" }} aria-label={`${c.name} pilgrimage route map`}>
                  <path d={routeD} fill="none" stroke={hsl(c.hue, 55, 50, 0.22)} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
                  <path d={routeD} fill="none" stroke={hsl(c.hue, 65, 60)} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"
                    strokeDasharray={routeLen} style={{ strokeDashoffset: routeLen, animation: "routeDash 2.4s cubic-bezier(.22,1,.36,1) 0.3s forwards" }} />
                  {pts.map((p, i) => {
                    const isV = visited.has(i % c.temples.length);
                    return (
                      <g key={i}>
                        <circle cx={p[0]} cy={p[1]} r="5.5" fill={hsl(c.hue, 40, 18)} stroke={hsl(c.hue, 50, 35, 0.3)} strokeWidth="0.8" />
                        <circle cx={p[0]} cy={p[1]} r={isV ? 3.5 : 2.8} fill={isV ? hsl(c.hue, 70, 65) : hsl(c.hue, 55, 52, 0.75)}
                          style={{ animation: `dotPulse ${1.6 + i * 0.1}s ease-in-out infinite ${i * 0.12}s` }} />
                        <text x={p[0]} y={p[1] - 8} textAnchor="middle" fontSize="3.8" fill={hsl(c.hue, 50, 70, 0.7)} fontFamily="serif" style={{ pointerEvents: "none" }}>{p[2]}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, padding: "12px 0", borderTop: `1px solid ${C.divL}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: hsl(c.hue, 70, 65) }} /><span style={{ fontSize: 11, color: C.textD }}>Visited</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: hsl(c.hue, 55, 52, 0.75) }} /><span style={{ fontSize: 11, color: C.textD }}>Remaining</span></div>
                <div style={{ marginLeft: "auto", fontSize: 11, color: hsl(c.hue, 55, 60), fontWeight: 700 }}>{visited.size}/{c.temples.length} marked</div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
