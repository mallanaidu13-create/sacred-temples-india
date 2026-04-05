/**
 * LivePanchangam.jsx — Production-grade Drik Panchāṅgam
 *
 * • True ephemeris (Meeus Ch.25 / Ch.47 + additive corrections)
 * • Lahiri ayanamsa via IAU precession polynomial
 * • Sunrise computed from actual RA/Dec + single-iteration refinement
 * • All transitions found by bisection root-solving (not mean motion)
 * • Panchang day = sunrise-to-sunrise
 * • Edge-case handling: kshaya tithi, vriddhi tithi, multiple nakshatras
 * • Live language switch (7 languages + dual display)
 * • Timeline bars + active muhurta highlighting + Abhijit muhurta
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { usePanchangLang, LANGS } from "./PanchangLangContext.jsx";
import { evaluateFestivals } from "./festival-rules.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const NAK_SPAN = 360 / 27; // 13°20′
const TITHI_SPAN = 12;

const DEFAULT_LOC = {
  name: "Chennai, India",
  lat: 13.0827,
  lng: 80.2707,
  tz: 5.5,
  tzName: "Asia/Kolkata",
};

const MUHURTA_SLOTS = [
  [8, 5, 4], // Sunday
  [2, 4, 3], // Monday
  [7, 3, 5], // Tuesday
  [5, 7, 6], // Wednesday
  [6, 6, 7], // Thursday
  [4, 2, 2], // Friday
  [3, 1, 1], // Saturday
];

// Choghadiya sequences by weekday (indices into CHOGHADIYA_NAMES)
// Order: Amrit=0, Shubh=1, Labh=2, Chal=3, Udveg=4, Rog=5, Kaal=6
const CHOGHADIYA_DAY_SEQ = [
  [4, 3, 2, 0, 6, 1, 5, 4],   // Sunday
  [0, 6, 1, 5, 4, 3, 2, 0],   // Monday
  [5, 4, 3, 2, 0, 6, 1, 5],   // Tuesday
  [2, 0, 6, 1, 5, 4, 3, 2],   // Wednesday
  [1, 5, 4, 3, 2, 0, 6, 1],   // Thursday
  [3, 2, 0, 6, 1, 5, 4, 3],   // Friday
  [6, 1, 5, 4, 3, 2, 0, 6],   // Saturday
];
const CHOGHADIYA_NIGHT_SEQ = [
  [1, 5, 4, 3, 2, 0, 6, 1],   // Sunday
  [3, 2, 0, 6, 1, 5, 4, 3],   // Monday
  [6, 1, 5, 4, 3, 2, 0, 6],   // Tuesday
  [4, 3, 2, 0, 6, 1, 5, 4],   // Wednesday
  [0, 6, 1, 5, 4, 3, 2, 0],   // Thursday
  [5, 4, 3, 2, 0, 6, 1, 5],   // Friday
  [2, 0, 6, 1, 5, 4, 3, 2],   // Saturday
];

// Hora cyclic order: Sun → Venus → Mercury → Moon → Saturn → Jupiter → Mars
const HORA_CYCLE = [0, 1, 2, 3, 4, 5, 6]; // indices into HORA_GRAHAS
// Vara → starting Hora index in HORA_CYCLE
// Sun(0)→0, Mon(1)→3, Tue(2)→6, Wed(3)→2, Thu(4)→5, Fri(5)→1, Sat(6)→4
const VARA_TO_HORA_START = [0, 3, 6, 2, 5, 1, 4];

// ─── Julian Day Helpers ───────────────────────────────────────────────────────
function julianDay(date) {
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

function jdToDate(jd) {
  // Meeus Astronomical Algorithms (2nd ed.) — inverse Julian Day
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

function norm360(a) {
  return ((a % 360) + 360) % 360;
}

function deltaAngle(jd, getAngle, target) {
  let d = norm360(getAngle(jd)) - target;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

// ─── Solar Longitude (Meeus Ch.25 low accuracy, ~0.01°) ────────────────────────
function solarLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mrad = M * D2R;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
          + 0.000289 * Math.sin(3 * Mrad);
  const sunTrue = L0 + C;
  const omega = norm360(125.04 - 1934.136 * T);
  return norm360(sunTrue - 0.00569 - 0.00478 * Math.sin(omega * D2R));
}

// ─── Moon Longitude (Meeus Ch.47 + additive corrections) ───────────────────────
function moonLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T
           - 0.0015786 * T * T + (T * T * T) / 538841 - (T * T * T * T) / 65194000;
  const Mp = 134.9633964 + 477198.8675055 * T
           + 0.0087414 * T * T + (T * T * T) / 69699 - (T * T * T * T) / 14712000;
  const M  = 357.5291092 + 35999.0502909 * T
           - 0.0001536 * T * T + (T * T * T) / 24490000;
  const F  = 93.2720950 + 483202.0175233 * T
           - 0.0036539 * T * T - (T * T * T) / 3526000 + (T * T * T * T) / 863310000;
  const D  = 297.8501921 + 445267.1114034 * T
           - 0.0018819 * T * T + (T * T * T) / 545868 - (T * T * T * T) / 113065000;
  const E  = 1 - 0.002516 * T - 0.0000074 * T * T;

  const Dr = norm360(D) * D2R, Mr = norm360(M) * D2R;
  const Mpr = norm360(Mp) * D2R, Fr = norm360(F) * D2R;

  const terms = [
    [0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],
    [0,1,0,0,-185116],[0,0,0,2,-114332],[2,0,-2,0,58793],[2,-1,-1,0,57066],
    [2,0,1,0,53322],[2,-1,0,0,45758],[0,1,-1,0,-40923],[1,0,0,0,-34720],
    [0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],[0,0,1,-2,10980],
    [4,0,-1,0,10675],[0,0,3,0,10034],[4,0,-2,0,8548],[2,1,-1,0,-7888],
    [2,1,0,0,-6766],[1,0,-1,0,-5163],[1,1,0,0,4987],[2,-1,1,0,4036],
    [2,0,2,0,3994],[4,0,0,0,3861],[2,0,-3,0,3665],[0,1,-2,0,-2689],
    [2,0,-1,2,-2602],[2,-1,-2,0,2390],[1,0,1,0,-2348],[2,-2,0,0,2236],
    [0,1,2,0,-2120],[0,2,0,0,-2069],[2,-2,-1,0,2048],[2,0,1,-2,-1773],
    [2,0,0,2,-1595],[4,-1,-1,0,1215],[0,0,2,2,-1110],[3,0,-1,0,-892],
    [2,1,1,0,-810],[4,-1,-2,0,759],[0,2,-1,0,-713],[2,2,-1,0,-700],
    [2,1,-2,0,691],[2,-1,0,-2,596],[4,0,1,0,549],[0,0,4,0,537],
    [4,-1,0,0,520],[1,0,-2,0,-487],[2,1,0,-2,-399],[0,0,2,-2,-381],
    [1,1,1,0,351],[3,0,-2,0,-340],[4,0,-3,0,330],[2,-1,2,0,327],
    [0,2,1,0,-323],[1,1,-1,0,299],[2,0,3,0,294],
  ];

  let sumL = 0;
  for (const [dm, mm, mpm, fm, lc] of terms) {
    const arg = dm * Dr + mm * Mr + mpm * Mpr + fm * Fr;
    const eFactor = Math.abs(mm) === 2 ? E * E : Math.abs(mm) === 1 ? E : 1;
    sumL += eFactor * lc * Math.sin(arg);
  }

  const A1 = (119.75 + 131.849 * T) * D2R;
  const A2 = (53.09 + 479264.29 * T) * D2R;
  const addL = (3958 * Math.sin(A1)
              + 1962 * Math.sin(norm360(Lp) * D2R - Fr)
              + 318 * Math.sin(A2)) / 1000000;

  return norm360(Lp + sumL / 1000000 + addL);
}

// ─── Lahiri Ayanamsa (IAU precession polynomial) ───────────────────────────────
function lahiriAyanamsa(jd) {
  const T = (jd - 2451545.0) / 36525;
  const pA = 5029.0966 * T + 1.11113 * T * T - 0.000006 * T * T * T;
  return 23.85 + pA / 3600;
}

// ─── Accurate Sunrise / Sunset (ephemeris-based + 1 refinement) ────────────────
function accurateSunriseSunset(localDate, lat, lng, tz) {
  const baseUTC = Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate(), 12 - tz, 0, 0);
  const jdNoon = julianDay(new Date(baseUTC));

  const obliquity = (T) => 23.4392916667 - 0.0130041667 * T - 1.6667e-7 * T * T + 5.0278e-7 * T * T * T;

  const solve = (jd) => {
    const T = (jd - 2451545.0) / 36525;
    const lam = solarLongitude(jd);
    const eps = obliquity(T);
    const alpha = Math.atan2(Math.sin(lam * D2R) * Math.cos(eps * D2R), Math.cos(lam * D2R)) * R2D;
    const delta = Math.asin(Math.sin(lam * D2R) * Math.sin(eps * D2R)) * R2D;

    const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    let eot = L0 - 0.0057183 - norm360(alpha);
    eot = ((eot % 360) + 360) % 360;
    if (eot > 180) eot -= 360;
    const eotHours = eot / 15;

    const cosHA = (Math.sin(-0.833 * D2R) - Math.sin(lat * D2R) * Math.sin(delta * D2R))
                / (Math.cos(lat * D2R) * Math.cos(delta * D2R));
    if (Math.abs(cosHA) > 1) return null;
    const HA = Math.acos(cosHA) * R2D / 15;
    const lngCorr = (lng - tz * 15) / 15;
    return {
      sunrise: 12 - HA - eotHours - lngCorr,
      sunset: 12 + HA - eotHours - lngCorr,
    };
  };

  const first = solve(jdNoon);
  if (!first) return null;

  const refine = (h) => {
    const jdEvent = jdNoon + (h - 12) / 24;
    const ss = solve(jdEvent);
    if (!ss) return h;
    return h < 12 ? ss.sunrise : ss.sunset;
  };

  return {
    sunrise: refine(first.sunrise),
    sunset: refine(first.sunset),
  };
}

// ─── Bisection Root Solver ─────────────────────────────────────────────────────
function findTransitionJD(jdStart, jdEnd, getAngle, targetDeg, tol = 1e-7) {
  let a = jdStart, b = jdEnd;
  let fa = deltaAngle(a, getAngle, targetDeg);
  let fb = deltaAngle(b, getAngle, targetDeg);
  if (fa * fb > 0) return null;
  for (let i = 0; i < 60; i++) {
    const c = (a + b) / 2;
    const fc = deltaAngle(c, getAngle, targetDeg);
    if (Math.abs(fc) < tol || (b - a) / 2 < tol) return c;
    if (fa * fc <= 0) { b = c; fb = fc; } else { a = c; fa = fc; }
  }
  return (a + b) / 2;
}

// ─── Panchang Day Boundary ─────────────────────────────────────────────────────
function getPanchangDayBounds(now, loc) {
  const localMidnight = new Date(now.getTime() + loc.tz * 3600000);
  localMidnight.setUTCHours(0, 0, 0, 0);
  localMidnight.setTime(localMidnight.getTime() - loc.tz * 3600000);

  const getSunriseJD = (base) => {
    const ss = accurateSunriseSunset(base, loc.lat, loc.lng, loc.tz);
    if (!ss) return null;
    const sunriseLocal = new Date(base.getTime() + ss.sunrise * 3600000);
    return julianDay(sunriseLocal);
  };

  const todaySunriseJD = getSunriseJD(localMidnight);
  const tomorrowBase = new Date(localMidnight.getTime() + 86400000);
  const tomorrowSunriseJD = getSunriseJD(tomorrowBase);
  const yesterdayBase = new Date(localMidnight.getTime() - 86400000);
  const yesterdaySunriseJD = getSunriseJD(yesterdayBase);

  const jdNow = julianDay(now);
  let dayStartJD, dayEndJD;
  if (jdNow >= todaySunriseJD) {
    dayStartJD = todaySunriseJD;
    dayEndJD = tomorrowSunriseJD;
  } else {
    dayStartJD = yesterdaySunriseJD;
    dayEndJD = todaySunriseJD;
  }
  return { dayStartJD, dayEndJD };
}

// ─── Intra-Day Transition Scanner ──────────────────────────────────────────────
function getDayTransitions(dayStartJD, dayEndJD, getAngle, span, count) {
  const startAngle = norm360(getAngle(dayStartJD));
  const startIdx = Math.floor(startAngle / span);
  const transitions = [];
  for (let i = 1; i <= count + 2; i++) {
    const target = norm360((startIdx + i) * span);
    const jd = findTransitionJD(dayStartJD, dayEndJD, getAngle, target);
    if (jd != null && jd < dayEndJD) {
      transitions.push({ jd, index: ((startIdx + i) % count + count) % count });
    }
  }
  return transitions;
}

// ─── Karana & Samvatsara ───────────────────────────────────────────────────────
function getKarana(moonLon, sunLon) {
  const diff = norm360(moonLon - sunLon);
  const k = Math.floor(diff / 6);
  const rotating = ["Bava","Balava","Kaulava","Taitila","Garaja","Vanija","Vishti"];
  const fixed = ["Shakuni","Chatushpada","Naga","Kimstughna"];
  if (k < 56) return rotating[k % 7];
  return fixed[k - 56];
}

function getSamvatsara(sunriseJD) {
  const date = jdToDate(sunriseJD);
  const year = date.getUTCFullYear();
  const refYear = 2022;
  const refIdx = 35; // Shubhakrit
  const hinduNewYear = Date.UTC(year, 3, 14); // ~14 Apr
  let offset = year - refYear;
  if (date.getTime() < hinduNewYear) offset -= 1;
  const idx = ((refIdx + offset) % 60 + 60) % 60;
  const names = [
    "Prabhava","Vibhava","Shukla","Pramoda","Prajotpatti","Angirasa","Shrimukha","Bhava","Yuva","Dhata",
    "Ishvara","Bahudhanya","Pramathi","Vikrama","Vrisha","Chitrabhanu","Svabhanu","Tarana","Parthiva","Vyaya",
    "Sarvajit","Sarvadhari","Virodhi","Vikrita","Khara","Nandana","Vijaya","Jaya","Manmatha","Durmukha",
    "Hevilambi","Vilambi","Vikari","Sharvari","Plava","Shubhakrit","Shobhana","Krodhi","Vishvavasu","Parabhava",
    "Plavanga","Kilaka","Saumya","Sadharana","Virodhikrit","Paridhavi","Pramadi","Ananda","Rakshasa","Nala",
    "Pingala","Kalayukti","Siddhartha","Raudra","Durmati","Dundubhi","Rudhirodgari","Raktakshi","Krodhana","Akshaya"
  ];
  return names[idx];
}

function getChoghadiyaSlots(dayStartJD, sunsetJD, dayEndJD, varaIdx) {
  const dayDur = sunsetJD - dayStartJD;
  const nightDur = dayEndJD - sunsetJD;
  const daySlot = dayDur / 8;
  const nightSlot = nightDur / 8;
  const daySeq = CHOGHADIYA_DAY_SEQ[varaIdx];
  const nightSeq = CHOGHADIYA_NIGHT_SEQ[varaIdx];
  const daySlots = Array.from({ length: 8 }, (_, i) => ({
    typeIdx: daySeq[i],
    startJD: dayStartJD + i * daySlot,
    endJD: dayStartJD + (i + 1) * daySlot,
  }));
  const nightSlots = Array.from({ length: 8 }, (_, i) => ({
    typeIdx: nightSeq[i],
    startJD: sunsetJD + i * nightSlot,
    endJD: sunsetJD + (i + 1) * nightSlot,
  }));
  return { daySlots, nightSlots };
}

function getHoraSlots(dayStartJD, dayEndJD, varaIdx) {
  const totalDur = dayEndJD - dayStartJD;
  const slotDur = totalDur / 24;
  const startIdx = VARA_TO_HORA_START[varaIdx];
  const slots = Array.from({ length: 24 }, (_, i) => ({
    grahaIdx: HORA_CYCLE[(startIdx + i) % 7],
    startJD: dayStartJD + i * slotDur,
    endJD: dayStartJD + (i + 1) * slotDur,
  }));
  return slots;
}

// ─── Full Panchang Engine ──────────────────────────────────────────────────────
function computePanchangam(now, loc) {
  const jdNow = julianDay(now);
  const { dayStartJD, dayEndJD } = getPanchangDayBounds(now, loc);

  // ── Positions at current moment ─────────────────────────────────────────────
  const tropSunNow  = solarLongitude(jdNow);
  const tropMoonNow = moonLongitude(jdNow);
  const ayanNow     = lahiriAyanamsa(jdNow);
  const siderSunNow = norm360(tropSunNow - ayanNow);
  const siderMoonNow = norm360(tropMoonNow - ayanNow);

  // ── Positions at sunrise (for calendar context) ───────────────────────────────
  const tropSunRise  = solarLongitude(dayStartJD);
  const tropMoonRise = moonLongitude(dayStartJD);
  const ayanRise     = lahiriAyanamsa(dayStartJD);
  const siderSunRise = norm360(tropSunRise - ayanRise);
  const siderMoonRise = norm360(tropMoonRise - ayanRise);

  // ── Tithi ─────────────────────────────────────────────────────────────────────
  const moonSunDiffNow = norm360(tropMoonNow - tropSunNow);
  const tithiIdxNow = Math.floor(moonSunDiffNow / TITHI_SPAN);
  const tithiFracNow = (moonSunDiffNow % TITHI_SPAN) / TITHI_SPAN;

  const tithiTransitions = getDayTransitions(
    dayStartJD, dayEndJD,
    jd => norm360(moonLongitude(jd) - solarLongitude(jd)),
    TITHI_SPAN, 30
  );

  let currentTithiStartJD = dayStartJD;
  let nextTithiJD = dayEndJD;
  let nextTithiIndex = (tithiIdxNow + 1) % 30;
  for (const tr of tithiTransitions) {
    if (tr.jd <= jdNow) {
      currentTithiStartJD = tr.jd;
    } else if (nextTithiJD === dayEndJD) {
      nextTithiJD = tr.jd;
      nextTithiIndex = tr.index;
      break;
    }
  }
  const tithiAtSunriseIdx = Math.floor(norm360(tropMoonRise - tropSunRise) / TITHI_SPAN);

  // Vriddhi / Kshaya detection
  const tithiAtEndIdx = Math.floor(norm360(moonLongitude(dayEndJD) - solarLongitude(dayEndJD)) / TITHI_SPAN);
  const vriddhi = tithiTransitions.length >= 2;
  const kshaya = ((tithiAtEndIdx - tithiAtSunriseIdx + 30) % 30) >= 2 && tithiTransitions.length === 1;

  // ── Nakshatra ─────────────────────────────────────────────────────────────────
  const nakIdxNow = Math.floor(siderMoonNow / NAK_SPAN);
  const nakFracNow = (siderMoonNow % NAK_SPAN) / NAK_SPAN;

  const nakTransitions = getDayTransitions(
    dayStartJD, dayEndJD,
    jd => norm360(moonLongitude(jd) - lahiriAyanamsa(jd)),
    NAK_SPAN, 27
  );

  let currentNakStartJD = dayStartJD;
  let nextNakJD = dayEndJD;
  let nextNakIndex = (nakIdxNow + 1) % 27;
  for (const tr of nakTransitions) {
    if (tr.jd <= jdNow) currentNakStartJD = tr.jd;
    else if (nextNakJD === dayEndJD) { nextNakJD = tr.jd; nextNakIndex = tr.index; break; }
  }

  // ── Yoga ──────────────────────────────────────────────────────────────────────
  const yogaSumNow = norm360(siderSunNow + siderMoonNow);
  const yogaIdxNow = Math.floor(yogaSumNow / NAK_SPAN);
  const yogaFracNow = (yogaSumNow % NAK_SPAN) / NAK_SPAN;

  const yogaTransitions = getDayTransitions(
    dayStartJD, dayEndJD,
    jd => {
      const s = norm360(solarLongitude(jd) - lahiriAyanamsa(jd));
      const m = norm360(moonLongitude(jd) - lahiriAyanamsa(jd));
      return norm360(s + m);
    },
    NAK_SPAN, 27
  );

  let currentYogaStartJD = dayStartJD;
  let nextYogaJD = dayEndJD;
  let nextYogaIndex = (yogaIdxNow + 1) % 27;
  for (const tr of yogaTransitions) {
    if (tr.jd <= jdNow) currentYogaStartJD = tr.jd;
    else if (nextYogaJD === dayEndJD) { nextYogaJD = tr.jd; nextYogaIndex = tr.index; break; }
  }

  // ── Karana ────────────────────────────────────────────────────────────────────
  const karanaNow = getKarana(tropMoonNow, tropSunNow);

  // ── Vara (sunrise-based) ──────────────────────────────────────────────────────
  const dayMid = jdToDate(dayStartJD + 0.5);
  const varaIdx = dayMid.getUTCDay();

  // ── Rashi / Masa / Samvatsara (at sunrise) ────────────────────────────────────
  const rashiSunIdx = Math.floor(siderSunRise / 30);
  const rashiMoonIdx = Math.floor(siderMoonNow / 30);
  const masaIdx = rashiSunIdx;

  // ── Sunrise / Sunset display ──────────────────────────────────────────────────
  const localBase = new Date(now.getTime() + loc.tz * 3600000);
  localBase.setUTCHours(0, 0, 0, 0);
  localBase.setTime(localBase.getTime() - loc.tz * 3600000);
  const ss = accurateSunriseSunset(localBase, loc.lat, loc.lng, loc.tz);

  // ── Muhurta (8 daylight slots) ────────────────────────────────────────────────
  let muhurta = { rahuStart: null, rahuEnd: null, yamaStart: null, yamaEnd: null, gulikaStart: null, gulikaEnd: null };
  let abhijitStart = null, abhijitEnd = null;
  if (ss) {
    const dayDur = ss.sunset - ss.sunrise;
    const slotDur = dayDur / 8;
    const [rahuSlot, yamaSlot, gulikaSlot] = MUHURTA_SLOTS[varaIdx];
    const s = (n) => ss.sunrise + (n - 1) * slotDur;
    const e = (n) => ss.sunrise + n * slotDur;
    muhurta = { rahuStart: s(rahuSlot), rahuEnd: e(rahuSlot), yamaStart: s(yamaSlot), yamaEnd: e(yamaSlot), gulikaStart: s(gulikaSlot), gulikaEnd: e(gulikaSlot) };
    // Abhijit = 8th of 15 muhurtas (approx middle of 4th daylight slot, ~24 min)
    const muhurtaDur = dayDur / 15;
    abhijitStart = ss.sunrise + 7 * muhurtaDur;
    abhijitEnd   = ss.sunrise + 8 * muhurtaDur;
  }

  // ── Choghadiya ────────────────────────────────────────────────────────────────
  let choghadiya = { daySlots: [], nightSlots: [], current: null };
  if (ss) {
    const sunsetJD = dayStartJD + (ss.sunset - ss.sunrise) / 24;
    const cg = getChoghadiyaSlots(dayStartJD, sunsetJD, dayEndJD, varaIdx);
    choghadiya.daySlots = cg.daySlots;
    choghadiya.nightSlots = cg.nightSlots;
    const allSlots = [...cg.daySlots, ...cg.nightSlots];
    choghadiya.current = allSlots.find((s) => s.startJD <= jdNow && jdNow < s.endJD) || null;
  }

  // ── Hora ───────────────────────────────────────────────────────────────────────
  let horaSlots = [];
  let currentHora = null;
  if (ss) {
    horaSlots = getHoraSlots(dayStartJD, dayEndJD, varaIdx);
    currentHora = horaSlots.find((s) => s.startJD <= jdNow && jdNow < s.endJD) || null;
  }

  // ── Nakshatra Pāda & Navāṁśa ───────────────────────────────────────────────────
  const pada = Math.floor((siderMoonNow % NAK_SPAN) / (NAK_SPAN / 4)) + 1;
  const navamsaRashiIdx = ((nakIdxNow * 4 + (pada - 1)) % 12 + 12) % 12;

  // ── Festivals ─────────────────────────────────────────────────────────────────
  const panchangAtSunrise = {
    tithiNum: tithiAtSunriseIdx + 1,
    masa: masaIdx,
    sunRashiIdx: rashiSunIdx,
    nakshatraIdx: Math.floor(siderMoonRise / NAK_SPAN),
  };
  const festivals = evaluateFestivals(panchangAtSunrise, masaIdx, tithiAtSunriseIdx + 1, rashiSunIdx, Math.floor(siderMoonRise / NAK_SPAN));

  return {
    // Current state
    tithiIdx: tithiIdxNow,
    tithiNum: tithiIdxNow + 1,
    tithiFrac: tithiFracNow,
    tithiStartJD: currentTithiStartJD,
    tithiEndJD: nextTithiJD,
    nextTithiIdx: nextTithiIndex,
    paksha: tithiIdxNow < 15 ? "Shukla" : "Krishna",
    vriddhi,
    kshaya,

    nakshatraIdx: nakIdxNow,
    nakshatraStartJD: currentNakStartJD,
    nakshatraEndJD: nextNakJD,
    nextNakshatraIdx: nextNakIndex,
    nakshatraFrac: nakFracNow,

    yogaIdx: yogaIdxNow,
    yogaStartJD: currentYogaStartJD,
    yogaEndJD: nextYogaJD,
    nextYogaIdx: nextYogaIndex,
    yogaFrac: yogaFracNow,

    karana: karanaNow,
    varaIdx,
    rashiSunIdx,
    rashiMoonIdx,
    degInRashiSun: siderSunRise % 30,
    degInRashiMoon: siderMoonNow % 30,
    siderSun: siderSunRise,
    siderMoon: siderMoonNow,

    sunrise: ss?.sunrise ?? null,
    sunset: ss?.sunset ?? null,

    muhurta,
    abhijitStart,
    abhijitEnd,

    samvatsara: getSamvatsara(dayStartJD),
    masaIdx,
    location: loc.name,
    festivals,

    choghadiya,
    horaSlots,
    currentHora,
    pada,
    navamsaRashiIdx,

    // Raw for scheduler
    dayStartJD,
    dayEndJD,
  };
}

// ─── Formatting ────────────────────────────────────────────────────────────────
function fmtTime(h) {
  if (h == null || isNaN(h)) return "—";
  let h24 = ((h % 24) + 24) % 24;
  let hh = Math.floor(h24);
  let mm = Math.round((h24 - hh) * 60);
  if (mm === 60) { mm = 0; hh = (hh + 1) % 24; }
  const disp = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  const ampm = hh < 12 ? "AM" : "PM";
  return `${disp}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function fmtDateTz(jd, tzName) {
  if (jd == null) return "—";
  const d = jdToDate(jd);
  try {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: tzName });
  } catch {
    return d.toUTCString();
  }
}

function fmtDeg(deg) {
  const d = Math.floor(deg);
  const mf = (deg - d) * 60;
  const m = Math.floor(mf);
  const s = Math.round((mf - m) * 60);
  return `${d}°\u202f${m}′\u202f${s}″`;
}

function jdToLocalDateStr(jd, tzName) {
  const d = jdToDate(jd);
  try {
    return d.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: tzName });
  } catch {
    return d.toDateString();
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CLR = {
  saffron: "#FF9933",
  saffronDim: "rgba(255,153,51,0.14)",
  maroon: "#800000",
  gold: "#DAA520",
  goldDim: "rgba(218,165,32,0.12)",
  goldBdr: "rgba(218,165,32,0.28)",
  text: "#F5E4C8",
  textM: "#C8A878",
  textD: "#8A7058",
  cardBg: "rgba(28,14,4,0.96)",
  divider: "rgba(218,165,32,0.22)",
};

const CSS_KEYFRAMES = `
@keyframes pcOmPulse {
  0%,100% { filter: drop-shadow(0 0 14px rgba(255,153,51,.75)) drop-shadow(0 0 42px rgba(255,153,51,.38)); transform: scale(1); }
  50% { filter: drop-shadow(0 0 28px rgba(255,220,80,1)) drop-shadow(0 0 80px rgba(255,153,51,.65)) drop-shadow(0 0 130px rgba(255,153,51,.28)); transform: scale(1.05); }
}
@keyframes pcPanelIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes pcSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes pcBtnHover {
  0%,100% { box-shadow: 0 4px 22px rgba(255,153,51,.35), 0 0 0 1px rgba(218,165,32,.4); }
  50%     { box-shadow: 0 6px 32px rgba(255,153,51,.55), 0 0 0 1px rgba(218,165,32,.7); }
}
@keyframes pcPulseBorder {
  0%,100% { border-color: rgba(255,153,51,0.45); box-shadow: 0 0 0 1px rgba(255,153,51,0.15); }
  50%     { border-color: rgba(255,153,51,0.85); box-shadow: 0 0 12px rgba(255,153,51,0.35); }
}
`;

// ─── Sub-components ───────────────────────────────────────────────────────────
const OmGlyph = () => (
  <div style={{ fontSize: 88, fontFamily: "'Noto Serif Devanagari', 'Nirmala UI', serif", color: CLR.saffron, textAlign: "center", lineHeight: 1.05, animation: "pcOmPulse 3.2s ease-in-out infinite", userSelect: "none" }}>
    ॐ
  </div>
);

const Tile = ({ label, value, sub, timeline }) => (
  <div style={{ padding: "11px 13px", borderRadius: 13, background: CLR.goldDim, border: `1px solid ${CLR.goldBdr}` }}>
    <div style={{ fontSize: 8.5, color: CLR.gold, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
    <div style={{ fontSize: 14, color: CLR.text, fontWeight: 600, lineHeight: 1.3 }}>{value}</div>
    {sub && <div style={{ fontSize: 10.5, color: CLR.textM, marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
    {timeline}
  </div>
);

const SectionHead = ({ icon, title }) => (
  <div style={{ marginBottom: 11 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 9.5, color: CLR.gold, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>{title}</span>
    </div>
    <div style={{ height: 1, background: CLR.divider, marginTop: 8 }} />
  </div>
);

const TimelineBar = ({ startJD, endJD, nowJD }) => {
  const pct = Math.max(0, Math.min(100, ((nowJD - startJD) / (endJD - startJD)) * 100));
  return (
    <div style={{ height: 3, background: "rgba(218,165,32,0.15)", borderRadius: 2, marginTop: 8, position: "relative" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: CLR.gold, borderRadius: 2 }} />
      <div style={{ position: "absolute", left: `${pct}%`, top: -2, width: 6, height: 6, borderRadius: "50%", background: "#fff", transform: "translateX(-50%)", boxShadow: "0 0 6px rgba(255,153,51,0.8)" }} />
    </div>
  );
};

// Re-export for App.jsx consumers
export { computePanchangam, DEFAULT_LOC };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LivePanchangam({ location: locProp = DEFAULT_LOC }) {
  const loc = { ...DEFAULT_LOC, ...locProp };
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimeoutRef = useRef(null);
  const scheduleRef = useRef(null);
  const { lang, setLang, dual, setDual, t, limb, fmtDual, tables } = usePanchangLang();

  const compute = useCallback(() => {
    setRefreshing(true);
    try {
      const result = computePanchangam(new Date(), loc);
      setData(result);
      // schedule next precise refresh
      if (scheduleRef.current) clearTimeout(scheduleRef.current);
      const nowJD = julianDay(new Date());
      const upcoming = [
        result.tithiEndJD,
        result.nakshatraEndJD,
        result.yogaEndJD,
        result.dayEndJD,
      ].filter(jd => jd != null && jd > nowJD + 1 / 1440);
      if (upcoming.length) {
        const nextJD = Math.min(...upcoming);
        const ms = (nextJD - nowJD) * 86400000;
        scheduleRef.current = setTimeout(compute, Math.max(1000, ms));
      }
    } catch (err) {
      console.error("[LivePanchangam] computation error:", err);
    }
    setLastUpdated(new Date());
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => setRefreshing(false), 700);
  }, [loc]);

  useEffect(() => {
    compute();
    return () => {
      if (scheduleRef.current) clearTimeout(scheduleRef.current);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [compute]);

  const toggle = () => setOpen((v) => !v);

  const renderName = (table, index) => {
    const { primary, secondary } = t(table, index);
    return fmtDual(primary, secondary);
  };

  const nowJD = julianDay(new Date());
  const nowDec = data ? (new Date().getHours() + new Date().getMinutes() / 60) : 0;

  return (
    <div style={{ margin: "24px 24px 0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{CSS_KEYFRAMES}</style>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <OmGlyph />
      </div>
      <div style={{ textAlign: "center", marginBottom: open ? 14 : 0 }}>
        <button onClick={toggle} style={{ padding: "11px 26px", borderRadius: 100, background: `linear-gradient(135deg, ${CLR.saffron} 0%, ${CLR.maroon} 100%)`, border: `1.5px solid ${CLR.gold}`, color: "#fff", fontSize: 13.5, fontWeight: 700, letterSpacing: 0.4, cursor: "pointer", boxShadow: `0 4px 22px rgba(255,153,51,.35), 0 0 0 1px rgba(218,165,32,.35)`, transition: "opacity 0.2s", animation: "pcBtnHover 4s ease-in-out infinite" }}>
          {open ? `▲  ${limb("closePanchang")}` : `🕉  ${limb("livePanchang")}`}
        </button>
      </div>

      <div style={{ overflow: "hidden", maxHeight: open ? "3600px" : "0", transition: "max-height 0.45s ease" }}>
        {data && (
          <div style={{ borderRadius: 18, border: `1.5px solid ${CLR.gold}`, overflow: "hidden", background: CLR.cardBg, boxShadow: `0 8px 44px rgba(218,165,32,.10), 0 2px 12px rgba(0,0,0,.4)`, animation: open ? "pcPanelIn 0.4s ease both" : "none" }}>
            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${CLR.saffron} 0%, ${CLR.maroon} 100%)`, padding: "15px 18px 14px", borderBottom: `2px solid ${CLR.gold}` }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.75)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>
                🕉 &nbsp;{limb("dailyPanchang")} • {data.location}
              </div>
              <div style={{ fontSize: 16.5, color: "#fff", fontWeight: 700, lineHeight: 1.3 }}>
                {renderName(tables.TITHI_NAMES, data.tithiIdx)} • {data.samvatsara} • {renderName(tables.MASA_NAMES, data.masaIdx)}
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.82)", marginTop: 3 }}>
                {jdToLocalDateStr(nowJD, loc.tzName || "Asia/Kolkata")}
              </div>

              {/* Language switcher */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer",
                      background: lang === l.code ? CLR.gold : "rgba(255,255,255,0.15)",
                      color: lang === l.code ? "#1a0f00" : "#fff",
                    }}
                  >
                    {l.label}
                  </button>
                ))}
                <button
                  onClick={() => setDual((v) => !v)}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 600, cursor: "pointer",
                    background: dual ? "rgba(255,255,255,0.25)" : "transparent", color: "#fff",
                  }}
                >
                  {dual ? "Dual ✓" : "Dual"}
                </button>
              </div>
            </div>

            {/* Updated row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, padding: "7px 18px 5px", background: "rgba(218,165,32,.04)" }}>
              {refreshing && <div style={{ width: 11, height: 11, border: `2px solid ${CLR.gold}`, borderTopColor: "transparent", borderRadius: "50%", animation: "pcSpin 0.75s linear infinite" }} />}
              <span style={{ fontSize: 9.5, color: CLR.textD }}>
                {limb("updated")}:&nbsp;
                {lastUpdated?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
              </span>
            </div>

            {/* Festivals */}
            {data.festivals.length > 0 && (
              <div style={{ padding: "10px 16px 0" }}>
                {data.festivals.map((f) => (
                  <div key={f.id} style={{ padding: "6px 12px", borderRadius: 20, background: CLR.saffronDim, border: `1px solid ${CLR.saffron}`, color: CLR.saffron, fontWeight: 700, fontSize: 12, textAlign: "center", marginBottom: 8 }}>
                    🪔 {f.names[lang] ?? f.names.en}
                  </div>
                ))}
              </div>
            )}

            {/* Body */}
            <div style={{ padding: "14px 16px 18px" }}>
              <SectionHead icon="✦" title={limb("muhurta") + " — Pañcha Aṅga"} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 9 }}>
                <Tile
                  label={limb("tithi")}
                  value={`${data.paksha === "Shukla" ? renderName({ sa: limb("pakshaShukla"), ...tables.MASA_NAMES }, 0)?.split(" ")[0] || limb("pakshaShukla") : limb("pakshaKrishna")} ${renderName(tables.TITHI_NAMES, data.tithiIdx)}`}
                  sub={`${Math.round(data.tithiFrac * 100)}% ${limb("elapsed")} · ${limb("next")} ~${fmtDateTz(data.tithiEndJD, loc.tzName || "Asia/Kolkata")}`}
                  timeline={<TimelineBar startJD={data.tithiStartJD} endJD={data.tithiEndJD} nowJD={nowJD} />}
                />
                <Tile
                  label={limb("nakshatra")}
                  value={renderName(tables.NAKSHATRA_NAMES, data.nakshatraIdx)}
                  sub={`${Math.round(data.nakshatraFrac * 100)}% · ${limb("pada")} ${data.pada} · ${limb("navamsaRashi")}: ${renderName(tables.RASHI_NAMES, data.navamsaRashiIdx)} · ${renderName(tables.NAKSHATRA_DEITIES, data.nakshatraIdx)} · ${limb("next")} ~${fmtDateTz(data.nakshatraEndJD, loc.tzName || "Asia/Kolkata")}`}
                  timeline={<TimelineBar startJD={data.nakshatraStartJD} endJD={data.nakshatraEndJD} nowJD={nowJD} />}
                />
                <Tile label={limb("yoga")} value={renderName(tables.YOGA_NAMES, data.yogaIdx)} sub={`${Math.round(data.yogaFrac * 100)}% · ${limb("next")} ~${fmtDateTz(data.yogaEndJD, loc.tzName || "Asia/Kolkata")}`} />
                <Tile label={limb("karana")} value={data.karana} />
              </div>

              {data.kshaya && (
                <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(184,40,40,0.12)", border: "1px solid rgba(184,40,40,0.35)", color: "#e8a0a0", fontSize: 11, fontWeight: 600 }}>
                  ⚠ Kshaya tithi detected — a tithi is skipped today.
                </div>
              )}
              {data.vriddhi && (
                <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(40,120,80,0.12)", border: "1px solid rgba(40,120,80,0.35)", color: "#a0e0c0", fontSize: 11, fontWeight: 600 }}>
                  ⛿ Vriddhi tithi detected — two tithis occur between sunrise and sunrise.
                </div>
              )}

              {/* Vara */}
              <div style={{ marginBottom: 16, padding: "12px 15px", borderRadius: 13, background: `linear-gradient(135deg, rgba(255,153,51,.1), rgba(128,0,0,.1))`, border: `1px solid rgba(218,165,32,.3)` }}>
                <div style={{ fontSize: 8.5, color: CLR.gold, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 5 }}>{limb("vara")}</div>
                <div style={{ fontSize: 15.5, color: CLR.text, fontWeight: 700 }}>{renderName(tables.VARA_NAMES, data.varaIdx)}</div>
                <div style={{ fontSize: 11, color: CLR.textM, marginTop: 3 }}>{limb("rulingGraha")}: {renderName(tables.VARA_GRAHAS, data.varaIdx)}</div>
              </div>

              {/* Hora strip */}
              {data.currentHora && (
                <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 12, background: CLR.goldDim, border: `1px solid ${CLR.goldBdr}` }}>
                  <div style={{ fontSize: 8.5, color: CLR.gold, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>{limb("hora")}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ padding: "6px 12px", borderRadius: 20, background: "rgba(255,153,51,.15)", border: "1px solid rgba(255,153,51,.45)", color: CLR.saffron, fontWeight: 700, fontSize: 12 }}>
                      {limb("currentHora")}: {renderName(tables.HORA_GRAHAS, data.currentHora.grahaIdx)}
                    </div>
                    {(() => {
                      const idx = data.horaSlots.indexOf(data.currentHora);
                      const next = data.horaSlots[idx + 1];
                      const next2 = data.horaSlots[idx + 2];
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: CLR.textM }}>
                          {next && (
                            <span>→ {limb("nextHora")}: <span style={{ color: CLR.text, fontWeight: 600 }}>{renderName(tables.HORA_GRAHAS, next.grahaIdx)}</span> <span style={{ color: CLR.textD }}>({fmtDateTz(next.startJD, loc.tzName || "Asia/Kolkata")})</span></span>
                          )}
                          {next2 && (
                            <span style={{ color: CLR.textD }}>• {renderName(tables.HORA_GRAHAS, next2.grahaIdx)} <span style={{ opacity: 0.8 }}>({fmtDateTz(next2.startJD, loc.tzName || "Asia/Kolkata")})</span></span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Astronomy */}
              <SectionHead icon="☀" title={limb("siderealSun")} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 16 }}>
                <Tile label={limb("sunrise")} value={fmtTime(data.sunrise)} sub={data.location} />
                <Tile label={limb("sunset")} value={fmtTime(data.sunset)} sub={data.sunrise != null && data.sunset != null ? `${Math.floor(data.sunset - data.sunrise)}h ${Math.round(((data.sunset - data.sunrise) % 1) * 60)}m` : "—"} />
                <Tile label={limb("siderealSun")} value={`${renderName(tables.RASHI_NAMES, data.rashiSunIdx)} ${fmtDeg(data.degInRashiSun)}`} sub={`${fmtDeg(data.siderSun)} ${limb("fromAries")}`} />
                <Tile label={limb("siderealMoon")} value={`${renderName(tables.RASHI_NAMES, data.rashiMoonIdx)} ${fmtDeg(data.degInRashiMoon)}`} sub={`${fmtDeg(data.siderMoon)} ${limb("fromAries")}`} />
              </div>

              {/* Choghadiya */}
              {data.choghadiya.current && (
                <div style={{ marginBottom: 16 }}>
                  <SectionHead icon="◈" title={limb("choghadiya")} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    <div style={{ padding: "6px 12px", borderRadius: 20, background: "rgba(40,120,80,.15)", border: "1px solid rgba(40,120,80,.45)", color: "#a0e0c0", fontWeight: 700, fontSize: 12 }}>
                      {limb("today")}: {renderName(tables.CHOGHADIYA_NAMES, data.choghadiya.current.typeIdx)} <span style={{ opacity: 0.8, fontWeight: 500 }}>({fmtDateTz(data.choghadiya.current.startJD, loc.tzName || "Asia/Kolkata")} – {fmtDateTz(data.choghadiya.current.endJD, loc.tzName || "Asia/Kolkata")})</span>
                    </div>
                  </div>
                  {[
                    { key: "day", slots: data.choghadiya.daySlots, label: limb("day") },
                    { key: "night", slots: data.choghadiya.nightSlots, label: limb("night") },
                  ].map((row) => (
                    <div key={row.key} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 9, color: CLR.textD, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 5 }}>{row.label}</div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {row.slots.map((slot, i) => {
                          const active = data.choghadiya.current && slot.startJD === data.choghadiya.current.startJD;
                          const typeIdx = slot.typeIdx;
                          const isGood = [0, 1, 2].includes(typeIdx); // Amrit, Shubh, Labh
                          const isNeutral = typeIdx === 3; // Chal
                          const bg = isGood ? "rgba(40,120,80,.12)" : isNeutral ? "rgba(218,165,32,.12)" : "rgba(184,40,40,.12)";
                          const border = isGood ? "rgba(40,120,80,.45)" : isNeutral ? "rgba(218,165,32,.45)" : "rgba(184,40,40,.45)";
                          const color = isGood ? "#a0e0c0" : isNeutral ? CLR.gold : "#e8a0a0";
                          return (
                            <div key={i} style={{ padding: "5px 8px", borderRadius: 7, background: bg, border: active ? `2px solid ${color}` : `1px solid ${border}`, fontSize: 10, color, fontWeight: active ? 700 : 600, whiteSpace: "nowrap" }}>
                              {renderName(tables.CHOGHADIYA_NAMES, typeIdx)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Moon Rashi */}
              <div style={{ marginBottom: 16, padding: "11px 14px", borderRadius: 12, background: CLR.goldDim, border: `1px solid ${CLR.goldBdr}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 8.5, color: CLR.gold, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>{limb("moonRashi")}</div>
                  <div style={{ fontSize: 15, color: CLR.text, fontWeight: 600 }}>{renderName(tables.RASHI_NAMES, data.rashiMoonIdx)}</div>
                </div>
                <div style={{ fontSize: 24, opacity: 0.55 }}>🌙</div>
              </div>

              {/* Muhurta */}
              <SectionHead icon="⚠" title={limb("muhurta")} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {[
                  { label: limb("rahuKalam"), start: data.muhurta.rahuStart, end: data.muhurta.rahuEnd, color: "#B82828" },
                  { label: limb("yamaGandam"), start: data.muhurta.yamaStart, end: data.muhurta.yamaEnd, color: "#7A3B10" },
                  { label: limb("gulikaKalam"), start: data.muhurta.gulikaStart, end: data.muhurta.gulikaEnd, color: "#3A5C48" },
                  { label: limb("abhijitMuhurta"), start: data.abhijitStart, end: data.abhijitEnd, color: "#2A6C38" },
                ].map((item) => {
                  const active = item.start != null && item.end != null && nowDec >= item.start && nowDec < item.end;
                  return (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 11, background: `${item.color}18`, border: active ? `2px solid ${item.color}` : `1px solid ${item.color}45`, animation: active ? "pcPulseBorder 2s ease-in-out infinite" : "none" }}>
                      <div style={{ fontSize: 12.5, color: CLR.text, fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: CLR.textM, fontWeight: 500 }}>{fmtTime(item.start)} – {fmtTime(item.end)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ padding: "9px 12px", borderRadius: 9, background: "rgba(218,165,32,.04)", border: `1px solid rgba(218,165,32,.10)`, fontSize: 9.5, color: CLR.textD, lineHeight: 1.65, textAlign: "center" }}>
                {limb("dailyPanchang")} • {data.location} • Lahiri Ayanamsa • {loc.tzName || "UTC"}
                <br />
                {limb("autoRefresh")} {limb("next")} {fmtDateTz(data.tithiEndJD, loc.tzName || "Asia/Kolkata")}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
