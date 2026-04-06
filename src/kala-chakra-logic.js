// Kāla Chakra — Personal Panchangam Logic
// Extends existing Panchangam engine with personal astrology, muhurtas, hora, choghadiya

const TARA_NAMES = [
  "Janma","Sampat","Vipat","Kshema","Pratyak","Sadhana","Naidhana","Mitra","Paramitra"
];

export function computeTaraBala(birthNakshatraIdx, currentNakshatraIdx) {
  const diff = ((currentNakshatraIdx - birthNakshatraIdx) % 27 + 27) % 27;
  const taraIdx = diff % 9;
  const name = TARA_NAMES[taraIdx];
  const good = ["Sampat","Kshema","Sadhana","Mitra","Paramitra"];
  const bad = ["Janma","Vipat","Pratyak","Naidhana"];
  if (good.includes(name)) return { status: "Good", name, idx: taraIdx };
  if (bad.includes(name)) return { status: "Bad", name, idx: taraIdx };
  return { status: "Neutral", name, idx: taraIdx };
}

export function computeChandraBala(birthMoonRashiIdx, currentMoonRashiIdx) {
  const diff = ((currentMoonRashiIdx - birthMoonRashiIdx) % 12 + 12) % 12;
  const good = [0, 2, 5, 6, 9, 10]; // 1st, 3rd, 6th, 7th, 10th, 11th
  const bad = [1, 4, 8, 11]; // 2nd, 5th, 9th, 12th
  if (good.includes(diff)) return { status: "Good", diff };
  if (bad.includes(diff)) return { status: "Bad", diff };
  return { status: "Neutral", diff };
}

// Julian Day helpers (match LivePanchangam)
export function julianDay(date) {
  const Y = date.getUTCFullYear();
  const M = date.getUTCMonth() + 1;
  const D = date.getUTCDate()
    + (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24;
  let y = Y, m = M;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D + B - 1524.5;
}

export function jdToDate(jd) {
  jd = jd + 0.5;
  const Z = Math.floor(jd);
  const F = jd - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E) + F;
  let month = E - 1;
  if (E > 13) month = E - 13;
  let year = C - 4715;
  if (month > 2) year = C - 4716;
  const d = Math.floor(day);
  const frac = day - d;
  const ms = frac * 86400000;
  return new Date(Date.UTC(year, month - 1, d) + ms);
}

export function formatMuhurta(jd, tz = 5.5) {
  if (jd == null || isNaN(jd)) return "—";
  const d = jdToDate(jd);
  const localMs = d.getTime() + tz * 3600000;
  const local = new Date(localMs);
  let hh = local.getUTCHours();
  let mm = local.getUTCMinutes();
  const ampm = hh >= 12 ? "PM" : "AM";
  const disp = hh % 12 || 12;
  return `${disp}:${String(mm).padStart(2, "0")} ${ampm}`;
}

export function formatDuration(ms) {
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function getWindowStatus(startJD, endJD) {
  const nowJD = julianDay(new Date());
  if (nowJD < startJD) {
    return { state: "upcoming", label: `starts in ${formatDuration((startJD - nowJD) * 86400000)}` };
  } else if (nowJD < endJD) {
    return { state: "active", label: `${formatDuration((endJD - nowJD) * 86400000)} left` };
  }
  return { state: "ended", label: "ended" };
}

// Muhurta slot mapping by Vara: [Rahu, Yama, Gulika]
const MUHURTA_SLOT_MAP = [
  [8, 5, 4], // Sunday
  [2, 4, 3], // Monday
  [7, 3, 5], // Tuesday
  [5, 7, 6], // Wednesday
  [6, 6, 7], // Thursday
  [4, 2, 2], // Friday
  [3, 1, 1], // Saturday
];

export function findAbhijitMuhurta(sunriseJD, sunsetJD, tz = 5.5) {
  const dayDur = sunsetJD - sunriseJD;
  const muhurtaDur = dayDur / 15;
  const start = sunriseJD + 7 * muhurtaDur;
  const end = sunriseJD + 8 * muhurtaDur;
  return { start, end, startStr: formatMuhurta(start, tz), endStr: formatMuhurta(end, tz) };
}

export function findRahuKala(sunriseJD, sunsetJD, varaIdx, tz = 5.5) {
  const dayDur = sunsetJD - sunriseJD;
  const slotDur = dayDur / 8;
  const rahuSlot = MUHURTA_SLOT_MAP[varaIdx][0];
  const start = sunriseJD + (rahuSlot - 1) * slotDur;
  const end = sunriseJD + rahuSlot * slotDur;
  return { start, end, startStr: formatMuhurta(start, tz), endStr: formatMuhurta(end, tz) };
}

export function computeGulikaKala(sunriseJD, sunsetJD, varaIdx, tz = 5.5) {
  const dayDur = sunsetJD - sunriseJD;
  const slotDur = dayDur / 8;
  const slot = MUHURTA_SLOT_MAP[varaIdx][2];
  const start = sunriseJD + (slot - 1) * slotDur;
  const end = sunriseJD + slot * slotDur;
  return { start, end, startStr: formatMuhurta(start, tz), endStr: formatMuhurta(end, tz) };
}

export function computeYamaGandam(sunriseJD, sunsetJD, varaIdx, tz = 5.5) {
  const dayDur = sunsetJD - sunriseJD;
  const slotDur = dayDur / 8;
  const slot = MUHURTA_SLOT_MAP[varaIdx][1];
  const start = sunriseJD + (slot - 1) * slotDur;
  const end = sunriseJD + slot * slotDur;
  return { start, end, startStr: formatMuhurta(start, tz), endStr: formatMuhurta(end, tz) };
}

export function computeMuhurtaTimeline(sunriseJD, sunsetJD, tz = 5.5) {
  const dayDur = sunsetJD - sunriseJD;
  const muhurtaDur = dayDur / 15;
  const slots = [];
  for (let i = 0; i < 15; i++) {
    const start = sunriseJD + i * muhurtaDur;
    const end = sunriseJD + (i + 1) * muhurtaDur;
    slots.push({
      idx: i + 1,
      start,
      end,
      startStr: formatMuhurta(start, tz),
      endStr: formatMuhurta(end, tz),
      isAbhijit: i === 7,
      label: i === 7 ? "Abhijit" : `${i + 1}`,
    });
  }
  return slots;
}

export function computeOverallScore(tara, chandra) {
  let score = 50;
  if (tara.status === "Good") score += 25;
  if (tara.status === "Bad") score -= 25;
  if (chandra.status === "Good") score += 25;
  if (chandra.status === "Bad") score -= 25;
  return Math.max(0, Math.min(100, score));
}

export const NAKSHATRAS = [
  "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha",
  "Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
  "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada",
  "Uttara Bhadrapada","Revati"
];

export const RASHIS = [
  "Mesha","Vrishabha","Mithuna","Karka","Simha","Kanya","Tula","Vrishchika","Dhanu","Makara","Kumbha","Meena"
];

export const VARAS = [
  "Ravivara","Somavara","Mangalavara","Budhavara","Guruvara","Shukravara","Shanivara"
];
