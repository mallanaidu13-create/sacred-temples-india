import { useState, useEffect, useMemo, useCallback } from "react";
import { computePanchangam, DEFAULT_LOC } from "./LivePanchangam.jsx";
import {
  computeTaraBala, computeChandraBala, findAbhijitMuhurta, findRahuKala,
  formatMuhurta, computeOverallScore, NAKSHATRAS, RASHIS,
} from "./kala-chakra-logic.js";

const C = {
  bg: "#1A1109", saffron: "#D4853C", gold: "#C4A24E", cream: "#F2E8D4", text: "#EDE4D4",
  card: "#241A10", div: "rgba(255,255,255,0.07)", glass: "rgba(26,17,9,0.78)", textD: "#6E5E48",
  good: "#4ade80", bad: "#f87171", neutral: "#fbbf24",
};

export default function KalaChakra({ onBack }) {
  const [birthNak, setBirthNak] = useState(() => localStorage.getItem("sti_birth_nakshatra") || "");
  const [birthRashi, setBirthRashi] = useState(() => localStorage.getItem("sti_birth_rashi") || "");
  const [panchang, setPanchang] = useState(null);
  const [reminderSet, setReminderSet] = useState(false);

  useEffect(() => {
    setPanchang(computePanchangam(new Date(), DEFAULT_LOC));
  }, []);

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
    const abhijit = findAbhijitMuhurta(sunriseJD, sunsetJD, DEFAULT_LOC.tz);
    const rahu = findRahuKala(sunriseJD, sunsetJD, panchang.varaIdx, DEFAULT_LOC.tz);
    return { abhijit, rahu };
  }, [panchang]);

  const setReminder = () => {
    if (!muhurtas?.abhijit) return;
    if (!("Notification" in window)) { alert("Notifications not supported"); return; }
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        const abTime = muhurtas.abhijit.start;
        const target = new Date((abTime - 2440587.5) * 86400000 + 86400000); // tomorrow same time approx
        const now = new Date();
        const ms = target.getTime() - now.getTime();
        if (ms > 0) {
          setTimeout(() => {
            new Notification("Your Kāla Chakra", {
              body: `Abhijit Muhurta begins at ${formatMuhurta(abTime, DEFAULT_LOC.tz)} — an auspicious window for new ventures.`,
            });
          }, ms);
        }
        setReminderSet(true);
      }
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: "22px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onBack} style={{
          width: 44, height: 44, borderRadius: 14, background: C.glass, border: `1px solid ${C.div}`,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          color: C.cream, fontSize: 20,
        }}>←</button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.cream }}>Kāla Chakra</h1>
          <p style={{ fontSize: 12, color: C.textD, marginTop: 2 }}>Personal Panchangam</p>
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
          <div style={{ height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "hidden" }}>
            <div style={{
              width: `${score}%`, height: "100%",
              background: score >= 70 ? `linear-gradient(90deg,${C.good},#86efac)` : score >= 40 ? `linear-gradient(90deg,${C.neutral},#fcd34d)` : `linear-gradient(90deg,${C.bad},#fca5a5)`,
              borderRadius: 5, transition: "width .6s ease",
            }} />
          </div>
        </div>
      )}

      {/* Today's windows */}
      <div style={{ padding: "0 24px", display: "grid", gap: 12 }}>
        {muhurtas?.abhijit && (
          <WindowCard
            label="Abhijit Muhurta"
            value={`${muhurtas.abhijit.startStr} – ${muhurtas.abhijit.endStr}`}
            tone="good"
            sub="Best for new ventures"
          />
        )}
        {muhurtas?.rahu && (
          <WindowCard
            label="Rāhu Kāla"
            value={`${muhurtas.rahu.startStr} – ${muhurtas.rahu.endStr}`}
            tone="bad"
            sub="Avoid new beginnings"
          />
        )}
        {tara && (
          <WindowCard
            label="Tara Bala"
            value={`${tara.name} · ${tara.status}`}
            tone={tara.status === "Good" ? "good" : tara.status === "Bad" ? "bad" : "neutral"}
            sub="Nakshatra relationship"
          />
        )}
        {chandra && (
          <WindowCard
            label="Chandra Bala"
            value={`${chandra.status}`}
            tone={chandra.status === "Good" ? "good" : chandra.status === "Bad" ? "bad" : "neutral"}
            sub="Moon sign relationship"
          />
        )}
      </div>

      {/* Reminder */}
      <div style={{ padding: "18px 24px 0" }}>
        <button
          onClick={setReminder}
          disabled={reminderSet}
          style={{
            width: "100%", padding: "14px", borderRadius: 18,
            background: reminderSet ? "rgba(40,120,80,0.15)" : C.saffron,
            color: reminderSet ? "#a0e0c0" : "#fff", border: "none", fontSize: 14, fontWeight: 700,
            cursor: reminderSet ? "default" : "pointer",
          }}
        >
          {reminderSet ? "Daily Reminder Set" : "Set Daily Reminder"}
        </button>
      </div>
    </div>
  );
}

function WindowCard({ label, value, tone, sub }) {
  const color = tone === "good" ? C.good : tone === "bad" ? C.bad : C.neutral;
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 16, background: C.card, border: `1px solid ${C.div}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textD, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.cream, marginTop: 4 }}>{value}</div>
        <div style={{ fontSize: 11, color: C.textD, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{
        width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 10px ${color}`,
      }} />
    </div>
  );
}
