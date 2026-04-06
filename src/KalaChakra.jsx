import { useState, useEffect, useMemo, useCallback } from "react";
import { computePanchangam, DEFAULT_LOC } from "./LivePanchangam.jsx";
import { useGeo } from "./useGeo.js";
import { CHOGHADIYA_NAMES, HORA_GRAHAS } from "./panchangam-i18n.js";
import {
  computeTaraBala, computeChandraBala, findAbhijitMuhurta, findRahuKala,
  computeGulikaKala, computeYamaGandam, computeMuhurtaTimeline,
  getWindowStatus, julianDay,
  computeOverallScore, NAKSHATRAS, RASHIS, VARAS,
} from "./kala-chakra-logic.js";

const CDark = {
  bg: "#1A1109", saffron: "#D4853C", saffronDim: "rgba(212,133,60,0.12)",
  gold: "#C4A24E", goldDim: "rgba(196,162,78,0.1)",
  cream: "#F2E8D4", text: "#EDE4D4", textM: "#A89878", textD: "#6E5E48", textDD: "#5C4E3A",
  card: "#241A10", cardH: "#2E2218", div: "rgba(255,255,255,0.07)", glass: "rgba(26,17,9,0.78)",
  good: "#4ade80", bad: "#f87171", neutral: "#fbbf24",
};

const CLight = {
  bg: "#FAFAF8", saffron: "#C4721A", saffronDim: "rgba(196,114,26,0.12)",
  gold: "#9E7A28", goldDim: "rgba(158,122,40,0.08)",
  cream: "#1A1208", text: "#1A1208", textM: "#5A3A10", textD: "#8A6030", textDD: "#B89060",
  card: "#FFFFFF", cardH: "#FBF8F3", div: "rgba(0,0,0,0.08)", glass: "rgba(250,250,248,0.88)",
  good: "#16a34a", bad: "#dc2626", neutral: "#d97706",
};

export default function KalaChakra({ onBack, isDark, onToggleTheme }) {
  const C = useMemo(() => (isDark ? CDark : CLight), [isDark]);

  const geo = useGeo();
  const loc = useMemo(() => {
    if (geo.effectiveLocation) {
      return {
        name: "Your Location",
        lat: geo.effectiveLocation.latitude,
        lng: geo.effectiveLocation.longitude,
        tz: 5.5,
        tzName: "Asia/Kolkata",
      };
    }
    return DEFAULT_LOC;
  }, [geo.effectiveLocation]);

  const [birthNak, setBirthNak] = useState(() => localStorage.getItem("sti_birth_nakshatra") || "");
  const [birthRashi, setBirthRashi] = useState(() => localStorage.getItem("sti_birth_rashi") || "");
  const [panchang, setPanchang] = useState(null);
  const [tab, setTab] = useState("today");
  const [reminderSet, setReminderSet] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  // Live tick every minute
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // Compute panchang on mount, location change, and every tick
  useEffect(() => {
    setPanchang(computePanchangam(new Date(), loc));
  }, [loc, nowTick]);

  const save = useCallback(() => {
    localStorage.setItem("sti_birth_nakshatra", birthNak);
    localStorage.setItem("sti_birth_rashi", birthRashi);
  }, [birthNak, birthRashi]);

  const tara = useMemo(() => {
    if (birthNak === "" || !panchang) return null;
    return computeTaraBala(parseInt(birthNak, 10), panchang.nakshatraIdx);
  }, [birthNak, panchang]);

  const chandra = useMemo(() => {
    if (birthRashi === "" || !panchang) return null;
    return computeChandraBala(parseInt(birthRashi, 10), panchang.rashiMoonIdx);
  }, [birthRashi, panchang]);

  const score = useMemo(() => {
    if (!tara || !chandra) return 0;
    return computeOverallScore(tara, chandra);
  }, [tara, chandra]);

  const muhurtas = useMemo(() => {
    if (!panchang) return null;
    const sunriseJD = panchang.dayStartJD;
    const sunsetJD = sunriseJD + (panchang.sunset - panchang.sunrise) / 24;
    return {
      timeline: computeMuhurtaTimeline(sunriseJD, sunsetJD, loc.tz),
      abhijit: findAbhijitMuhurta(sunriseJD, sunsetJD, loc.tz),
      rahu: findRahuKala(sunriseJD, sunsetJD, panchang.varaIdx, loc.tz),
      gulika: computeGulikaKala(sunriseJD, sunsetJD, panchang.varaIdx, loc.tz),
      yama: computeYamaGandam(sunriseJD, sunsetJD, panchang.varaIdx, loc.tz),
    };
  }, [panchang, loc]);

  const hora = panchang?.currentHora || null;
  const chog = panchang?.choghadiya?.current || null;
  const nowJD = useMemo(() => julianDay(new Date(nowTick)), [nowTick]);

  // Week forecast
  const week = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const p = computePanchangam(d, loc);
      const sunriseJD = p.dayStartJD;
      const sunsetJD = sunriseJD + (p.sunset - p.sunrise) / 24;
      days.push({
        date: d,
        label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "long" }),
        shortDate: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        vara: VARAS[p.varaIdx],
        abhijit: findAbhijitMuhurta(sunriseJD, sunsetJD, loc.tz),
        rahu: findRahuKala(sunriseJD, sunsetJD, p.varaIdx, loc.tz),
        gulika: computeGulikaKala(sunriseJD, sunsetJD, p.varaIdx, loc.tz),
        yama: computeYamaGandam(sunriseJD, sunsetJD, p.varaIdx, loc.tz),
      });
    }
    return days;
  }, [loc]);

  // Robust reminders: check pending on mount + set new ones
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sti_kalachakra_reminder");
      if (!raw) return;
      const target = new Date(raw).getTime();
      const now = Date.now();
      if (target <= now) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Your Kāla Chakra", {
            body: `Abhijit Muhurta is beginning — an auspicious window for new ventures.`,
          });
        }
        localStorage.removeItem("sti_kalachakra_reminder");
      } else {
        const ms = target - now;
        setTimeout(() => {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Your Kāla Chakra", {
              body: `Abhijit Muhurta begins — an auspicious window for new ventures.`,
            });
          }
          localStorage.removeItem("sti_kalachakra_reminder");
        }, ms);
        setReminderSet(true);
      }
    } catch {}
  }, []);

  const setReminder = () => {
    if (!muhurtas?.abhijit) return;
    if (!("Notification" in window)) { alert("Notifications not supported"); return; }
    Notification.requestPermission().then((perm) => {
      if (perm !== "granted") return;
      const { start } = muhurtas.abhijit;
      let targetJD = start;
      if (targetJD <= nowJD) targetJD += 1; // schedule tomorrow if already passed
      const ms = (targetJD - nowJD) * 86400000;
      const targetIso = new Date(Date.now() + ms).toISOString();
      localStorage.setItem("sti_kalachakra_reminder", targetIso);
      setTimeout(() => {
        new Notification("Your Kāla Chakra", {
          body: `Abhijit Muhurta begins at ${muhurtas.abhijit.startStr} — an auspicious window for new ventures.`,
        });
        localStorage.removeItem("sti_kalachakra_reminder");
      }, ms);
      setReminderSet(true);
    });
  };

  const locationLabel = geo.effectiveLocation
    ? `Using live location · ${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)}`
    : `Using default location · ${DEFAULT_LOC.name}`;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: "22px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onBack} style={{
          width: 44, height: 44, borderRadius: 14, background: C.glass, border: `1px solid ${C.div}`,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          color: C.cream, fontSize: 20,
        }}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.cream }}>Kāla Chakra</h1>
          <p style={{ fontSize: 12, color: C.textD, marginTop: 2 }}>Personal Panchangam & Muhurta</p>
        </div>
        <button onClick={onToggleTheme} style={{
          width: 40, height: 40, borderRadius: 12, background: C.card, border: `1px solid ${C.div}`,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.cream,
        }}>
          {isDark ? (
            <svg width="18" height="18" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg width="18" height="18" fill="none" stroke={C.saffron} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Location pill */}
      <div style={{ padding: "0 24px 18px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 12px", borderRadius: 100, background: C.saffronDim,
          border: `1px solid ${isDark ? "rgba(212,133,60,0.18)" : "rgba(196,114,26,0.18)"}`,
          fontSize: 11, color: C.saffron, fontWeight: 600,
        }}>
          <span>📍</span>
          <span>{locationLabel}</span>
        </div>
      </div>

      {/* Inputs */}
      <div style={{ padding: "0 24px 18px", display: "grid", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textD, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Birth Nakshatra</div>
          <select
            value={birthNak}
            onChange={(e) => { setBirthNak(e.target.value); }}
            onBlur={save}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 14, background: C.card, border: `1px solid ${C.div}`,
              color: C.cream, fontSize: 14, outline: "none",
            }}
          >
            <option value="">Select Nakshatra</option>
            {NAKSHATRAS.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textD, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Birth Moon Rashi</div>
          <select
            value={birthRashi}
            onChange={(e) => { setBirthRashi(e.target.value); }}
            onBlur={save}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 14, background: C.card, border: `1px solid ${C.div}`,
              color: C.cream, fontSize: 14, outline: "none",
            }}
          >
            <option value="">Select Rashi</option>
            {RASHIS.map((r, i) => <option key={r} value={i}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Score gauge */}
      {tara && chandra && (
        <div style={{ margin: "0 24px 20px", padding: 20, borderRadius: 22, background: C.card, border: `1px solid ${C.div}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textD }}>AUSPICIOUSNESS</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: score >= 70 ? C.good : score >= 40 ? C.neutral : C.bad }}>{score}%</div>
          </div>
          <div style={{ height: 10, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderRadius: 5, overflow: "hidden" }}>
            <div style={{
              width: `${score}%`, height: "100%",
              background: score >= 70 ? `linear-gradient(90deg,${C.good},${isDark ? "#86efac" : "#4ade80"})` : score >= 40 ? `linear-gradient(90deg,${C.neutral},${isDark ? "#fcd34d" : "#fbbf24"})` : `linear-gradient(90deg,${C.bad},${isDark ? "#fca5a5" : "#f87171"})`,
              borderRadius: 5, transition: "width .6s ease",
            }} />
          </div>
          <div style={{ fontSize: 12, color: C.textM, marginTop: 10 }}>
            {score >= 70
              ? "Excellent day for new beginnings, travel, and auspicious deeds."
              : score >= 40
              ? "Mixed energies — proceed with caution and prayer."
              : "Challenging day — best suited for introspection, charity, and mantra japa."}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ padding: "0 24px 16px", display: "flex", gap: 8 }}>
        {["today", "week"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: tab === t ? 700 : 500,
              background: tab === t ? C.saffron : C.card, color: tab === t ? "#fff" : C.textD,
              border: `1px solid ${C.div}`, cursor: "pointer",
            }}
          >
            {t === "today" ? "Today" : "This Week"}
          </button>
        ))}
      </div>

      {tab === "today" && (
        <div style={{ padding: "0 24px", display: "grid", gap: 14 }}>
          {/* Live Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {hora && (
              <StatusCard
                title="Current Hora"
                value={HORA_GRAHAS.en[hora.grahaIdx] || "—"}
                sub={(() => {
                  const st = getWindowStatus(hora.startJD, hora.endJD);
                  return `${st.label}`;
                })()}
                tone={(() => {
                  const g = HORA_GRAHAS.en[hora.grahaIdx] || "";
                  if (g.includes("Surya") || g.includes("Guru")) return "good";
                  if (g.includes("Shani") || g.includes("Mangala")) return "bad";
                  return "neutral";
                })()}
                C={C}
              />
            )}
            {chog && (
              <StatusCard
                title="Choghadiya"
                value={CHOGHADIYA_NAMES.en[chog.typeIdx] || "—"}
                sub={(() => {
                  const st = getWindowStatus(chog.startJD, chog.endJD);
                  return `${st.label}`;
                })()}
                tone={(() => {
                  const name = CHOGHADIYA_NAMES.en[chog.typeIdx] || "";
                  if (["Amrit", "Shubh", "Labh"].includes(name)) return "good";
                  if (["Udveg", "Rog", "Kaal"].includes(name)) return "bad";
                  return "neutral";
                })()}
                C={C}
              />
            )}
          </div>

          {/* Muhurta Cards */}
          {muhurtas?.abhijit && (
            <MuhurtaCard
              label="Abhijit Muhurta"
              timeRange={`${muhurtas.abhijit.startStr} – ${muhurtas.abhijit.endStr}`}
              status={(() => {
                const st = getWindowStatus(muhurtas.abhijit.start, muhurtas.abhijit.end);
                return st.label;
              })()}
              tone="good"
              C={C}
            />
          )}
          {muhurtas?.rahu && (
            <MuhurtaCard
              label="Rāhu Kāla"
              timeRange={`${muhurtas.rahu.startStr} – ${muhurtas.rahu.endStr}`}
              status={(() => {
                const st = getWindowStatus(muhurtas.rahu.start, muhurtas.rahu.end);
                return st.label;
              })()}
              tone="bad"
              C={C}
            />
          )}
          {muhurtas?.gulika && (
            <MuhurtaCard
              label="Gulikā Kāla"
              timeRange={`${muhurtas.gulika.startStr} – ${muhurtas.gulika.endStr}`}
              status={(() => {
                const st = getWindowStatus(muhurtas.gulika.start, muhurtas.gulika.end);
                return st.label;
              })()}
              tone="warn"
              C={C}
            />
          )}
          {muhurtas?.yama && (
            <MuhurtaCard
              label="Yama Gandam"
              timeRange={`${muhurtas.yama.startStr} – ${muhurtas.yama.endStr}`}
              status={(() => {
                const st = getWindowStatus(muhurtas.yama.start, muhurtas.yama.end);
                return st.label;
              })()}
              tone="warn"
              C={C}
            />
          )}

          {/* Tara / Chandra mini cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {tara && (
              <MiniCard
                label="Tara Bala"
                value={`${tara.name}`}
                sub={tara.status}
                tone={tara.status === "Good" ? "good" : tara.status === "Bad" ? "bad" : "neutral"}
                C={C}
              />
            )}
            {chandra && (
              <MiniCard
                label="Chandra Bala"
                value={chandra.status}
                sub={(() => {
                  const map = { 0: "1st", 1: "2nd", 2: "3rd", 3: "4th", 4: "5th", 5: "6th", 6: "7th", 7: "8th", 8: "9th", 9: "10th", 10: "11th", 11: "12th" };
                  return `Moon ${map[chandra.diff] || ""} from birth sign`;
                })()}
                tone={chandra.status === "Good" ? "good" : chandra.status === "Bad" ? "bad" : "neutral"}
                C={C}
              />
            )}
          </div>

          {/* 15-Muhurta Timeline */}
          {muhurtas?.timeline && (
            <div style={{ padding: 16, borderRadius: 18, background: C.card, border: `1px solid ${C.div}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textD, marginBottom: 12 }}>15 Muhurtas of the Day</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {muhurtas.timeline.map((s) => {
                  const isCurrent = nowJD >= s.start && nowJD < s.end;
                  const pct = isCurrent ? Math.min(100, Math.max(0, ((nowJD - s.start) / (s.end - s.start)) * 100)) : nowJD > s.end ? 100 : 0;
                  return (
                    <div key={s.idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 52, fontSize: 11, color: s.isAbhijit ? C.gold : C.textD, fontWeight: s.isAbhijit || isCurrent ? 700 : 400 }}>
                        {s.isAbhijit ? "Abhijit" : `Muhurta ${s.idx}`}
                      </div>
                      <div style={{
                        flex: 1, height: 8, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                        borderRadius: 4, position: "relative", overflow: "hidden",
                      }}>
                        <div style={{
                          position: "absolute", left: 0, top: 0, bottom: 0,
                          width: `${pct}%`,
                          background: s.isAbhijit ? C.gold : isCurrent ? C.saffron : "transparent",
                          borderRadius: 4, transition: "width 0.5s ease",
                        }} />
                      </div>
                      <div style={{ width: 90, fontSize: 10, color: C.textD, textAlign: "right" }}>
                        {s.startStr} – {s.endStr}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reminder */}
          <div style={{ paddingTop: 4 }}>
            <button
              onClick={setReminder}
              disabled={reminderSet}
              style={{
                width: "100%", padding: "14px", borderRadius: 18,
                background: reminderSet ? (isDark ? "rgba(40,120,80,0.15)" : "rgba(22,163,74,0.12)") : C.saffron,
                color: reminderSet ? (isDark ? "#a0e0c0" : "#166534") : "#fff", border: "none", fontSize: 14, fontWeight: 700,
                cursor: reminderSet ? "default" : "pointer",
              }}
            >
              {reminderSet ? "Daily Reminder Set" : "Remind me for Abhijit Muhurta"}
            </button>
          </div>
        </div>
      )}

      {tab === "week" && (
        <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {week.map((day, i) => (
            <div key={i} style={{ padding: 16, borderRadius: 18, background: C.card, border: `1px solid ${C.div}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.cream }}>{day.label}</div>
                  <div style={{ fontSize: 11, color: C.textD, marginTop: 2 }}>{day.shortDate} · {day.vara}</div>
                </div>
                <div style={{
                  padding: "4px 10px", borderRadius: 100, background: C.saffronDim, color: C.saffron,
                  fontSize: 10, fontWeight: 700,
                }}>{day.vara.slice(0, 3)}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <WeekMuhurta label="Abhijit" time={`${day.abhijit.startStr} – ${day.abhijit.endStr}`} tone="good" C={C} />
                <WeekMuhurta label="Rāhu" time={`${day.rahu.startStr} – ${day.rahu.endStr}`} tone="bad" C={C} />
                <WeekMuhurta label="Gulikā" time={`${day.gulika.startStr} – ${day.gulika.endStr}`} tone="warn" C={C} />
                <WeekMuhurta label="Yama" time={`${day.yama.startStr} – ${day.yama.endStr}`} tone="warn" C={C} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusCard({ title, value, sub, tone, C }) {
  const color = tone === "good" ? C.good : tone === "bad" ? C.bad : tone === "warn" ? C.neutral : C.saffron;
  return (
    <div style={{ padding: 14, borderRadius: 16, background: C.card, border: `1px solid ${C.div}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.textD, textTransform: "uppercase", letterSpacing: 1 }}>{title}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.cream, marginTop: 4, lineHeight: 1.3 }}>{value}</div>
      <div style={{ fontSize: 11, color, marginTop: 3, fontWeight: 600 }}>{sub}</div>
    </div>
  );
}

function MiniCard({ label, value, sub, tone, C }) {
  const color = tone === "good" ? C.good : tone === "bad" ? C.bad : C.neutral;
  return (
    <div style={{ padding: 12, borderRadius: 14, background: C.card, border: `1px solid ${C.div}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.textD, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.cream, marginTop: 3 }}>{value}</div>
      <div style={{ fontSize: 10, color, marginTop: 2, fontWeight: 600 }}>{sub}</div>
    </div>
  );
}

function MuhurtaCard({ label, timeRange, status, tone, C }) {
  const color = tone === "good" ? C.good : tone === "bad" ? C.bad : tone === "warn" ? C.neutral : C.saffron;
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 16, background: C.card, border: `1px solid ${C.div}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textD, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.cream, marginTop: 4 }}>{timeRange}</div>
        <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 600 }}>{status}</div>
      </div>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 10px ${color}` }} />
    </div>
  );
}

function WeekMuhurta({ label, time, tone, C }) {
  const color = tone === "good" ? C.good : tone === "bad" ? C.bad : C.neutral;
  return (
    <div style={{ padding: "8px 10px", borderRadius: 10, background: isDarkColor(C.bg) ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.textD }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color, marginTop: 2 }}>{time}</div>
    </div>
  );
}

function isDarkColor(hex) {
  // crude check
  return hex === "#1A1109" || hex === "#201610" || hex === "#241A10";
}
