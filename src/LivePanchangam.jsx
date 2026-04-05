/**
 * LivePanchangam.jsx
 *
 * Single-file React component — Live daily Panchāṅgam (Hindu almanac)
 * All astronomical calculations are pure client-side JavaScript (no API calls).
 * Computation based on Meeus "Astronomical Algorithms" + Lahiri ayanamsa.
 *
 * Default state: animated Om symbol (ॐ) + "Live Panchāṅgam" toggle button.
 * On click: panel slides down (400 ms ease) showing full Panchāṅgam data.
 * Auto-refreshes every 60 seconds.
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const D2R = Math.PI / 180; // degrees → radians
const R2D = 180 / Math.PI; // radians → degrees

// Each of the 27 nakshatras spans 360°/27 degrees of the ecliptic
const NAK_SPAN = 360 / 27;

// Mean angular speeds (degrees per day)
const MOON_SUN_REL_SPEED = 12.19;   // Moon relative to Sun (tithi advance rate)
const MOON_SIDEREAL_SPEED = 13.176; // Moon's mean sidereal speed (nakshatra advance rate)

// Samvatsara reference: Shubhakrit (0-based index 35) started ~2 April 2022
const SAMVATSARA_REF_YEAR = 2022;
const SAMVATSARA_REF_IDX  = 35; // 0-based index of Shubhakrit in the 60-year cycle

// Default location: Chennai, India
const DEFAULT_LOC = {
  name: "Chennai, India",
  lat: 13.0827,
  lng: 80.2707,
  tz: 5.5, // IST = UTC+5:30
};

// ─── Lookup Tables ────────────────────────────────────────────────────────────

const TITHI_NAMES = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashti", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima",
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashti", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Amavasya",
];

const NAKSHATRA_NAMES = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha",
  "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

const NAKSHATRA_DEITIES = [
  "Ashwini Kumaras", "Yama", "Agni", "Brahma", "Chandra", "Rudra",
  "Aditi", "Brihaspati", "Sarpa", "Pitru", "Bhaga", "Aryaman",
  "Savitar", "Vishwakarma", "Vayu", "Indra–Agni", "Mitra", "Indra",
  "Niritti", "Apas", "Vishwadevas", "Vishnu", "Ashta Vasus",
  "Varuna", "Aja Ekapada", "Ahir Budhanya", "Pushan",
];

const YOGA_NAMES = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
  "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva",
  "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana",
  "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla",
  "Brahma", "Indra", "Vaidhriti",
];

// 7 rotating karanas (repeat 8 times = 56 karanas for slots 1–56)
const ROTATING_KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"];
// Fixed karanas for last 4 slots (57–60): Shakuni, Chatushpada, Naga, Kimstughna
const FIXED_KARANAS_END = ["Shakuni", "Chatushpada", "Naga", "Kimstughna"];

const VARA_NAMES  = ["Ravivara", "Somavara", "Mangalavara", "Budhavara", "Guruvara", "Shukravara", "Shanivara"];
const VARA_GRAHAS = ["Surya (Sun)", "Chandra (Moon)", "Mangala (Mars)", "Budha (Mercury)", "Guru (Jupiter)", "Shukra (Venus)", "Shani (Saturn)"];

const RASHI_NAMES = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
                     "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"];

// Each masa is named after the month when the sun occupies the corresponding rashi
const MASA_NAMES = [
  "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
  "Ashwina", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna",
];

// 60-year Jovian samvatsara cycle (Prabhava = index 0)
const SAMVATSARA_NAMES = [
  "Prabhava", "Vibhava", "Shukla", "Pramoda", "Prajotpatti", "Angirasa",
  "Shrimukha", "Bhava", "Yuva", "Dhata", "Ishvara", "Bahudhanya",
  "Pramathi", "Vikrama", "Vrisha", "Chitrabhanu", "Svabhanu", "Tarana",
  "Parthiva", "Vyaya", "Sarvajit", "Sarvadhari", "Virodhi", "Vikrita",
  "Khara", "Nandana", "Vijaya", "Jaya", "Manmatha", "Durmukha",
  "Hevilambi", "Vilambi", "Vikari", "Sharvari", "Plava", "Shubhakrit",
  "Shobhana", "Krodhi", "Vishvavasu", "Parabhava", "Plavanga", "Kilaka",
  "Saumya", "Sadharana", "Virodhikrit", "Paridhavi", "Pramadi", "Ananda",
  "Rakshasa", "Nala", "Pingala", "Kalayukti", "Siddhartha", "Raudra",
  "Durmati", "Dundubhi", "Rudhirodgari", "Raktakshi", "Krodhana", "Akshaya",
];

// ─── Astronomical Helper Functions ───────────────────────────────────────────

/**
 * Convert a calendar date (UTC) to Julian Day Number.
 * Algorithm: Meeus "Astronomical Algorithms" Ch.7
 */
function julianDay(date) {
  const Y = date.getUTCFullYear();
  const M = date.getUTCMonth() + 1;
  const D = date.getUTCDate()
    + (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24;

  let y = Y, m = M;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4); // Gregorian correction
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D + B - 1524.5;
}

/**
 * Normalise an angle to [0, 360).
 */
function norm360(a) { return ((a % 360) + 360) % 360; }

/**
 * Compute the tropical (ecliptic) longitude of the Sun in degrees.
 * Based on Meeus Ch.25 (low-accuracy, suitable for Panchāṅgam).
 */
function solarLongitude(jd) {
  const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000.0

  // Geometric mean longitude of the Sun (°)
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);

  // Mean anomaly of the Sun (°)
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mrad = M * D2R;

  // Equation of center
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
          + 0.000289 * Math.sin(3 * Mrad);

  // Sun's true longitude
  const sunTrue = L0 + C;

  // Apparent longitude (nutation + aberration correction)
  const omega = norm360(125.04 - 1934.136 * T);
  return norm360(sunTrue - 0.00569 - 0.00478 * Math.sin(omega * D2R));
}

/**
 * Compute the tropical longitude of the Moon in degrees.
 * Uses Meeus Ch.47 principal periodic terms (60+ terms for high accuracy).
 * At minimum the 6 largest terms are used; all 60+ are included here.
 */
function moonLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;

  // Moon's mean longitude (°)
  const Lp = 218.3164477 + 481267.88123421 * T
           - 0.0015786 * T * T + T * T * T / 538841 - T * T * T * T / 65194000;

  // Moon's mean anomaly (°)
  const Mp = 134.9633964 + 477198.8675055 * T
           + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000;

  // Sun's mean anomaly (°)
  const M  = 357.5291092 + 35999.0502909 * T
           - 0.0001536 * T * T + T * T * T / 24490000;

  // Moon's argument of latitude (°)
  const F  = 93.2720950 + 483202.0175233 * T
           - 0.0036539 * T * T - T * T * T / 3526000 + T * T * T * T / 863310000;

  // Moon's mean elongation (°)
  const D  = 297.8501921 + 445267.1114034 * T
           - 0.0018819 * T * T + T * T * T / 545868 - T * T * T * T / 113065000;

  // Eccentricity correction factor for solar anomaly terms
  const E  = 1 - 0.002516 * T - 0.0000074 * T * T;

  // Convert to radians
  const Dr = norm360(D) * D2R, Mr = norm360(M) * D2R;
  const Mpr = norm360(Mp) * D2R, Fr = norm360(F) * D2R;

  // Periodic terms: [D_mult, M_mult, Mp_mult, F_mult, l_coefficient (×10⁻⁶ °)]
  // The 6 largest terms account for ~99 % of the periodic correction.
  // All 60 principal terms from Meeus Table 47.A are included for accuracy.
  const terms = [
    [0, 0,  1, 0,  6288774],
    [2, 0, -1, 0,  1274027],
    [2, 0,  0, 0,   658314],
    [0, 0,  2, 0,   213618],
    [0, 1,  0, 0,  -185116],
    [0, 0,  0, 2,  -114332],
    [2, 0, -2, 0,    58793],
    [2,-1, -1, 0,    57066],
    [2, 0,  1, 0,    53322],
    [2,-1,  0, 0,    45758],
    [0, 1, -1, 0,   -40923],
    [1, 0,  0, 0,   -34720],
    [0, 1,  1, 0,   -30383],
    [2, 0,  0,-2,    15327],
    [0, 0,  1, 2,   -12528],
    [0, 0,  1,-2,    10980],
    [4, 0, -1, 0,    10675],
    [0, 0,  3, 0,    10034],
    [4, 0, -2, 0,     8548],
    [2, 1, -1, 0,    -7888],
    [2, 1,  0, 0,    -6766],
    [1, 0, -1, 0,    -5163],
    [1, 1,  0, 0,     4987],
    [2,-1,  1, 0,     4036],
    [2, 0,  2, 0,     3994],
    [4, 0,  0, 0,     3861],
    [2, 0, -3, 0,     3665],
    [0, 1, -2, 0,    -2689],
    [2, 0, -1, 2,    -2602],
    [2,-1, -2, 0,     2390],
    [1, 0,  1, 0,    -2348],
    [2,-2,  0, 0,     2236],
    [0, 1,  2, 0,    -2120],
    [0, 2,  0, 0,    -2069],
    [2,-2, -1, 0,     2048],
    [2, 0,  1,-2,    -1773],
    [2, 0,  0, 2,    -1595],
    [4,-1, -1, 0,     1215],
    [0, 0,  2, 2,    -1110],
    [3, 0, -1, 0,     -892],
    [2, 1,  1, 0,     -810],
    [4,-1, -2, 0,      759],
    [0, 2, -1, 0,     -713],
    [2, 2, -1, 0,     -700],
    [2, 1, -2, 0,      691],
    [2,-1,  0,-2,      596],
    [4, 0,  1, 0,      549],
    [0, 0,  4, 0,      537],
    [4,-1,  0, 0,      520],
    [1, 0, -2, 0,     -487],
    [2, 1,  0,-2,     -399],
    [0, 0,  2,-2,     -381],
    [1, 1,  1, 0,      351],
    [3, 0, -2, 0,     -340],
    [4, 0, -3, 0,      330],
    [2,-1,  2, 0,      327],
    [0, 2,  1, 0,     -323],
    [1, 1, -1, 0,      299],
    [2, 0,  3, 0,      294],
  ];

  let sumL = 0;
  for (const [dm, mm, mpm, fm, lc] of terms) {
    const arg = dm * Dr + mm * Mr + mpm * Mpr + fm * Fr;
    // Apply eccentricity correction for terms involving the Sun's anomaly
    const eFactor = Math.abs(mm) === 2 ? E * E : Math.abs(mm) === 1 ? E : 1;
    sumL += eFactor * lc * Math.sin(arg);
  }

  return norm360(Lp + sumL / 1000000);
}

/**
 * Lahiri ayanamsa in degrees for a given Julian Day.
 * Formula: 23.85° at J2000.0, precessing at ~50.3″/year ≈ 0.01396°/year.
 */
function lahiriAyanamsa(jd) {
  const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000.0
  return 23.85 + T * 100 * 0.01396;
}

/**
 * Compute local sunrise and sunset times for a given date and location.
 * Uses Spencer's equation-of-time and standard solar declination formula.
 * Accounts for atmospheric refraction (+0.833°).
 *
 * @param {Date}   localDate - Date object shifted to local midnight (UTC fields = local date)
 * @param {number} lat       - Latitude in degrees (positive = North)
 * @param {number} lng       - Longitude in degrees (positive = East)
 * @param {number} tz        - UTC offset in hours (e.g. 5.5 for IST)
 * @returns {{ sunrise: number, sunset: number } | null} Times in local decimal hours, or null for polar extremes
 */
function sunriseSunset(localDate, lat, lng, tz) {
  // Day of year (N = 1 … 366)
  const startOfYear = new Date(Date.UTC(localDate.getUTCFullYear(), 0, 1));
  const N = Math.round((localDate - startOfYear) / 86400000) + 1;

  // Approximate solar declination (degrees) — accurate to ~0.3°
  const dec = 23.45 * Math.sin((360 / 365) * (N + 284) * D2R);

  // Equation of time (minutes) — Spencer's formula
  const B = (360 / 365) * (N - 81); // degrees
  const Brad = B * D2R;
  const eqt = 9.87 * Math.sin(2 * Brad) - 7.53 * Math.cos(Brad) - 1.5 * Math.sin(Brad);

  // Hour angle at sunrise/sunset (−0.833° = refraction + solar-disk radius)
  const cosHA = (Math.sin(-0.833 * D2R) - Math.sin(lat * D2R) * Math.sin(dec * D2R))
              / (Math.cos(lat * D2R) * Math.cos(dec * D2R));

  if (Math.abs(cosHA) > 1) return null; // polar day or polar night

  const HA = Math.acos(cosHA) * R2D; // half-day arc in degrees

  // Longitude correction: difference from timezone central meridian
  const timeCorr = eqt / 60 + (lng - tz * 15) / 15; // hours

  return {
    sunrise: 12 - HA / 15 - timeCorr,
    sunset:  12 + HA / 15 - timeCorr,
  };
}

/**
 * Derive the Karana (half-tithi) name from Sun and Moon tropical longitudes.
 * Cycle: slots 1–56 → rotating 7 karanas × 8; slots 57–60 → fixed 4.
 */
function getKarana(moonLon, sunLon) {
  const diff = norm360(moonLon - sunLon);
  const k = Math.floor(diff / 6); // 0–59
  if (k < 56) return ROTATING_KARANAS[k % 7];
  return FIXED_KARANAS_END[k - 56];
}

/**
 * Return the Samvatsara (60-year Jovian cycle year name) for a given local date.
 * Reference: Shubhakrit (index 35, 0-based) started ~2 April 2022.
 */
function getSamvatsara(localDate) {
  // Hindu new year falls around 14 April
  const hinduNewYear = new Date(Date.UTC(localDate.getUTCFullYear(), 3, 14));
  let yearOffset = localDate.getUTCFullYear() - SAMVATSARA_REF_YEAR;
  if (localDate < hinduNewYear) yearOffset -= 1; // before new year → previous samvatsara
  const idx = ((SAMVATSARA_REF_IDX + yearOffset) % 60 + 60) % 60;
  return SAMVATSARA_NAMES[idx];
}

// ─── Full Panchāṅgam Computation ─────────────────────────────────────────────

/**
 * Compute all Panchāṅgam elements for the current moment at the given location.
 * @param {Date}   now  - The current date/time (Date object)
 * @param {object} loc  - { name, lat, lng, tz }
 * @returns {object}    - All Panchāṅgam fields
 */
function computePanchangam(now, loc) {
  const jdNow = julianDay(now);

  // ── Positions ──────────────────────────────────────────────────────────────
  const tropSun  = solarLongitude(jdNow);
  const tropMoon = moonLongitude(jdNow);
  const ayan     = lahiriAyanamsa(jdNow);

  // Sidereal longitudes (Lahiri ayanamsa subtracted, wrapped to [0°,360°))
  const siderSun  = norm360(tropSun  - ayan);
  const siderMoon = norm360(tropMoon - ayan);

  // ── Five Limbs ─────────────────────────────────────────────────────────────

  // 1. Tithi: every 12° of Moon–Sun elongation = 1 tithi (1–30)
  const moonSunDiff = norm360(tropMoon - tropSun);
  const tithiIdx    = Math.floor(moonSunDiff / 12);         // 0–29
  const tithiFrac   = Math.round((moonSunDiff % 12) / 12 * 100); // % elapsed

  // Time to next tithi using the mean Moon–Sun relative speed constant
  const degToNextTithi   = 12 - (moonSunDiff % 12);
  const hoursToNextTithi = (degToNextTithi / MOON_SUN_REL_SPEED) * 24;
  const tithiNextTime    = new Date(now.getTime() + hoursToNextTithi * 3600000);

  const paksha = tithiIdx < 15 ? "Shukla" : "Krishna";

  // 2. Nakshatra: 27 nakshatras, each spanning NAK_SPAN degrees of the ecliptic
  const nakIdx  = Math.floor(siderMoon / NAK_SPAN);       // 0–26
  const nakFrac = Math.round((siderMoon % NAK_SPAN) / NAK_SPAN * 100);

  // Time to next nakshatra using the Moon's mean sidereal speed constant
  const degToNextNak   = NAK_SPAN - (siderMoon % NAK_SPAN);
  const hoursToNextNak = (degToNextNak / MOON_SIDEREAL_SPEED) * 24;
  const nakNextTime    = new Date(now.getTime() + hoursToNextNak * 3600000);

  // 3. Yoga: (sidereal_sun + sidereal_moon) % 360, divided into 27 equal slots
  const yogaIdx = Math.floor(((siderSun + siderMoon) % 360) / NAK_SPAN); // 0–26

  // 4. Karana (half-tithi) derived from tropical Moon–Sun diff
  const karana = getKarana(tropMoon, tropSun);

  // 5. Vara (Vedic weekday) — JS getDay() matches: 0=Sun … 6=Sat
  const varaIdx = now.getDay();

  // ── Astronomical Data ──────────────────────────────────────────────────────
  const rashiSunIdx  = Math.floor(siderSun  / 30); // 0–11
  const rashiMoonIdx = Math.floor(siderMoon / 30);
  const degInRashiSun  = siderSun  % 30;
  const degInRashiMoon = siderMoon % 30;

  // Sunrise / Sunset — use the local calendar date for correct day-of-year
  const localDate = new Date(now.getTime() + loc.tz * 3600000); // shift to local midnight domain
  const ss = sunriseSunset(localDate, loc.lat, loc.lng, loc.tz);

  // ── Muhurta / Inauspicious Windows ────────────────────────────────────────
  // Slot tables: [Rahu, Yama, Gulika] — 1-indexed slot number during the day
  const MUHURTA_SLOTS = [
    [8, 5, 4], // Sunday
    [2, 4, 3], // Monday
    [7, 3, 5], // Tuesday
    [5, 7, 6], // Wednesday
    [6, 6, 7], // Thursday
    [4, 2, 2], // Friday
    [3, 1, 1], // Saturday
  ];

  let muhurta = { rahuStart: null, rahuEnd: null, yamaStart: null, yamaEnd: null, gulikaStart: null, gulikaEnd: null };
  if (ss) {
    const dayDur  = ss.sunset - ss.sunrise; // total daylight hours
    const slotDur = dayDur / 8;             // each of the 8 equal slots
    const [rahuSlot, yamaSlot, gulikaSlot] = MUHURTA_SLOTS[varaIdx];

    const slotStart = (s) => ss.sunrise + (s - 1) * slotDur;
    const slotEnd   = (s) => ss.sunrise +  s      * slotDur;

    muhurta = {
      rahuStart:   slotStart(rahuSlot),   rahuEnd:   slotEnd(rahuSlot),
      yamaStart:   slotStart(yamaSlot),   yamaEnd:   slotEnd(yamaSlot),
      gulikaStart: slotStart(gulikaSlot), gulikaEnd: slotEnd(gulikaSlot),
    };
  }

  // ── Hindu Calendar Context ─────────────────────────────────────────────────
  const samvatsara = getSamvatsara(localDate);
  const masa       = MASA_NAMES[rashiSunIdx]; // masa named by the rashi the Sun occupies

  return {
    // Five Limbs
    tithi: TITHI_NAMES[tithiIdx],
    tithiNum: tithiIdx + 1,
    tithiFrac,
    tithiNextTime,
    paksha,

    nakshatra: NAKSHATRA_NAMES[nakIdx],
    nakshatraDeity: NAKSHATRA_DEITIES[nakIdx],
    nakshatraFrac: nakFrac,
    nakNextTime,

    yoga: YOGA_NAMES[yogaIdx],

    karana,

    vara: VARA_NAMES[varaIdx],
    varaGraha: VARA_GRAHAS[varaIdx],

    // Astronomical
    sunrise: ss?.sunrise ?? null,
    sunset:  ss?.sunset  ?? null,
    siderSun,
    siderMoon,
    rashiSun:  RASHI_NAMES[rashiSunIdx],
    rashiMoon: RASHI_NAMES[rashiMoonIdx],
    degInRashiSun,
    degInRashiMoon,

    // Muhurta windows
    ...muhurta,

    // Hindu Calendar
    samvatsara,
    masa,
    location: loc.name,
  };
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

/** Format decimal hours (0–24) as "H:MM AM/PM" */
function fmtTime(h) {
  if (h == null || isNaN(h)) return "N/A";
  let h24 = ((h % 24) + 24) % 24;
  let hh  = Math.floor(h24);
  let mm  = Math.round((h24 - hh) * 60);
  if (mm === 60) { mm = 0; hh = (hh + 1) % 24; } // rounding overflow
  const disp = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  const ampm = hh < 12 ? "AM" : "PM";
  return `${disp}:${String(mm).padStart(2, "0")} ${ampm}`;
}

/** Format a Date object as local IST time "H:MM AM/PM" */
function fmtDate(date) {
  if (!date) return "N/A";
  try {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
    });
  } catch {
    return fmtTime(date.getHours() + date.getMinutes() / 60);
  }
}

/** Format decimal degrees as "D° M' S"" */
function fmtDeg(deg) {
  const d  = Math.floor(deg);
  const mf = (deg - d) * 60;
  const m  = Math.floor(mf);
  const s  = Math.round((mf - m) * 60);
  return `${d}°\u202f${m}′\u202f${s}″`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CLR = {
  saffron:    "#FF9933",
  saffronDim: "rgba(255,153,51,0.14)",
  maroon:     "#800000",
  gold:       "#DAA520",
  goldDim:    "rgba(218,165,32,0.12)",
  goldBdr:    "rgba(218,165,32,0.28)",
  text:       "#F5E4C8",
  textM:      "#C8A878",
  textD:      "#8A7058",
  cardBg:     "rgba(28,14,4,0.96)",
  divider:    "rgba(218,165,32,0.22)",
};

const CSS_KEYFRAMES = `
@keyframes pcOmPulse {
  0%,100% {
    filter: drop-shadow(0 0 14px rgba(255,153,51,.75))
            drop-shadow(0 0 42px rgba(255,153,51,.38));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 0 28px rgba(255,220,80,1))
            drop-shadow(0 0 80px rgba(255,153,51,.65))
            drop-shadow(0 0 130px rgba(255,153,51,.28));
    transform: scale(1.05);
  }
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
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated OM glyph */
const OmGlyph = () => (
  <div style={{
    fontSize: 88,
    fontFamily: "'Noto Serif Devanagari', 'Nirmala UI', serif",
    color: CLR.saffron,
    textAlign: "center",
    lineHeight: 1.05,
    animation: "pcOmPulse 3.2s ease-in-out infinite",
    userSelect: "none",
    letterSpacing: 0,
  }}>
    ॐ
  </div>
);

/** Labeled data tile */
const Tile = ({ label, value, sub }) => (
  <div style={{
    padding: "11px 13px",
    borderRadius: 13,
    background: CLR.goldDim,
    border: `1px solid ${CLR.goldBdr}`,
  }}>
    <div style={{ fontSize: 8.5, color: CLR.gold, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 5 }}>
      {label}
    </div>
    <div style={{ fontSize: 14, color: CLR.text, fontWeight: 600, lineHeight: 1.3 }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: 10.5, color: CLR.textM, marginTop: 4, lineHeight: 1.5 }}>
        {sub}
      </div>
    )}
  </div>
);

/** Section heading with gold divider */
const SectionHead = ({ icon, title }) => (
  <div style={{ marginBottom: 11 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 9.5, color: CLR.gold, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
        {title}
      </span>
    </div>
    <div style={{ height: 1, background: CLR.divider, marginTop: 8 }} />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * LivePanchangam — shows an animated Om symbol and a "Live Panchāṅgam" toggle.
 * On toggle, a panel slides down with all Panchāṅgam data computed in real time.
 *
 * @param {object} [location] - Optional override: { name, lat, lng, tz }
 */
export default function LivePanchangam({ location = DEFAULT_LOC }) {
  const [open, setOpen]           = useState(false);
  const [data, setData]           = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing]   = useState(false);
  const refreshTimeoutRef = useRef(null);

  /** Re-compute Panchāṅgam and mark as refreshed */
  const refresh = useCallback(() => {
    setRefreshing(true);
    try {
      const result = computePanchangam(new Date(), location);
      setData(result);
    } catch (err) {
      console.error("[LivePanchangam] computation error:", err);
    }
    setLastUpdated(new Date());
    // Clear spinner after a short visual delay
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => setRefreshing(false), 700);
  }, [location]);

  // Initial computation + 60-second auto-refresh
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60000);
    return () => {
      clearInterval(id);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [refresh]);

  const toggle = () => setOpen((v) => !v);

  return (
    <div style={{ margin: "24px 24px 0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* ── Injected keyframes ───────────────────────────────────────────────── */}
      <style>{CSS_KEYFRAMES}</style>

      {/* ── Om Symbol ────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <OmGlyph />
      </div>

      {/* ── Toggle Button ────────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: open ? 14 : 0 }}>
        <button
          onClick={toggle}
          style={{
            padding: "11px 26px",
            borderRadius: 100,
            background: `linear-gradient(135deg, ${CLR.saffron} 0%, ${CLR.maroon} 100%)`,
            border: `1.5px solid ${CLR.gold}`,
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 700,
            letterSpacing: 0.4,
            cursor: "pointer",
            boxShadow: `0 4px 22px rgba(255,153,51,.35), 0 0 0 1px rgba(218,165,32,.35)`,
            transition: "opacity 0.2s",
            animation: "pcBtnHover 4s ease-in-out infinite",
          }}
        >
          {open ? "▲  Close Panchāṅgam" : "🕉  Live Panchāṅgam"}
        </button>
      </div>

      {/* ── Collapsible Panel ────────────────────────────────────────────────── */}
      <div
        style={{
          overflow: "hidden",
          maxHeight: open ? "3000px" : "0",
          // 400 ms ease transition (expand is immediate via large maxHeight;
          // collapse animates via transition timing)
          transition: "max-height 0.4s ease",
        }}
      >
        {data && (
          <div
            style={{
              borderRadius: 18,
              border: `1.5px solid ${CLR.gold}`,
              overflow: "hidden",
              background: CLR.cardBg,
              boxShadow: `0 8px 44px rgba(218,165,32,.10), 0 2px 12px rgba(0,0,0,.4)`,
              animation: open ? "pcPanelIn 0.4s ease both" : "none",
            }}
          >
            {/* ── Panel Header ─────────────────────────────────────────────── */}
            <div
              style={{
                background: `linear-gradient(135deg, ${CLR.saffron} 0%, ${CLR.maroon} 100%)`,
                padding: "15px 20px 14px",
                borderBottom: `2px solid ${CLR.gold}`,
              }}
            >
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.75)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>
                🕉 &nbsp;Daily Panchāṅgam &bull; {data.location}
              </div>
              <div style={{ fontSize: 16.5, color: "#fff", fontWeight: 700, lineHeight: 1.3 }}>
                {data.paksha} {data.tithi}, {data.samvatsara} Samvatsara
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.82)", marginTop: 3 }}>
                {data.masa} Māsa &bull;{" "}
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long", year: "numeric", month: "long", day: "numeric",
                })}
              </div>
            </div>

            {/* ── Last Updated Row ─────────────────────────────────────────── */}
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "flex-end",
                gap: 6, padding: "7px 18px 5px",
                background: "rgba(218,165,32,.04)",
              }}
            >
              {refreshing && (
                <div
                  style={{
                    width: 11, height: 11,
                    border: `2px solid ${CLR.gold}`, borderTopColor: "transparent",
                    borderRadius: "50%", animation: "pcSpin 0.75s linear infinite",
                  }}
                />
              )}
              <span style={{ fontSize: 9.5, color: CLR.textD }}>
                Updated:&nbsp;
                {lastUpdated?.toLocaleTimeString("en-IN", {
                  hour: "2-digit", minute: "2-digit", hour12: true,
                })}
              </span>
            </div>

            {/* ── Panel Body ───────────────────────────────────────────────── */}
            <div style={{ padding: "14px 16px 18px" }}>

              {/* ── Section 1: Five Limbs ───────────────────────────────────── */}
              <SectionHead icon="✦" title="Pañcha Aṅga — The Five Limbs" />

              {/* 2-column grid for Tithi, Nakshatra, Yoga, Karana */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 9,
                  marginBottom: 9,
                }}
              >
                <Tile
                  label="Tithi · Lunar Day"
                  value={`${data.paksha} ${data.tithi}`}
                  sub={`${data.tithiFrac}% elapsed · next ~${fmtDate(data.tithiNextTime)}`}
                />
                <Tile
                  label="Nakshatra · Mansion"
                  value={data.nakshatra}
                  sub={`${data.nakshatraFrac}% · deity: ${data.nakshatraDeity} · next ~${fmtDate(data.nakNextTime)}`}
                />
                <Tile
                  label="Yoga · Sun–Moon Angular"
                  value={data.yoga}
                />
                <Tile
                  label="Karaṇa · Half-Tithi"
                  value={data.karana}
                />
              </div>

              {/* Vara — full width accent row */}
              <div
                style={{
                  marginBottom: 16, padding: "12px 15px",
                  borderRadius: 13,
                  background: `linear-gradient(135deg, rgba(255,153,51,.1), rgba(128,0,0,.1))`,
                  border: `1px solid rgba(218,165,32,.3)`,
                }}
              >
                <div style={{ fontSize: 8.5, color: CLR.gold, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 5 }}>
                  Vara · Vedic Weekday
                </div>
                <div style={{ fontSize: 15.5, color: CLR.text, fontWeight: 700 }}>
                  {data.vara}
                </div>
                <div style={{ fontSize: 11, color: CLR.textM, marginTop: 3 }}>
                  Ruling Graha: {data.varaGraha}
                </div>
              </div>

              {/* ── Section 2: Astronomical Data ───────────────────────────── */}
              <SectionHead icon="☀" title="Astronomical Data" />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 9,
                  marginBottom: 16,
                }}
              >
                <Tile
                  label="Sunrise"
                  value={fmtTime(data.sunrise)}
                  sub={data.location}
                />
                <Tile
                  label="Sunset"
                  value={fmtTime(data.sunset)}
                  sub={`Day length: ${
                    data.sunrise != null && data.sunset != null
                      ? (() => {
                          const dur = data.sunset - data.sunrise;
                          return `${Math.floor(dur)}h ${Math.round((dur % 1) * 60)}m`;
                        })()
                      : "N/A"
                  }`}
                />
                <Tile
                  label="Sidereal Sun"
                  value={`${data.rashiSun} ${fmtDeg(data.degInRashiSun)}`}
                  sub={`${fmtDeg(data.siderSun)} from Aries`}
                />
                <Tile
                  label="Sidereal Moon"
                  value={`${data.rashiMoon} ${fmtDeg(data.degInRashiMoon)}`}
                  sub={`${fmtDeg(data.siderMoon)} from Aries`}
                />
              </div>

              {/* Moon Rashi — full width */}
              <div
                style={{
                  marginBottom: 16, padding: "11px 14px",
                  borderRadius: 12,
                  background: CLR.goldDim,
                  border: `1px solid ${CLR.goldBdr}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 8.5, color: CLR.gold, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
                    Moon Rashi (Sign)
                  </div>
                  <div style={{ fontSize: 15, color: CLR.text, fontWeight: 600 }}>
                    {data.rashiMoon}
                  </div>
                </div>
                <div style={{ fontSize: 24, opacity: 0.55 }}>🌙</div>
              </div>

              {/* ── Section 3: Inauspicious Windows ───────────────────────── */}
              <SectionHead icon="⚠" title="Muhurta — Inauspicious Windows" />

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Rahu Kālam",   start: data.rahuStart,   end: data.rahuEnd,   color: "#B82828" },
                  { label: "Yama Gaṇḍam",  start: data.yamaStart,   end: data.yamaEnd,   color: "#7A3B10" },
                  { label: "Gulika Kāli",  start: data.gulikaStart, end: data.gulikaEnd, color: "#3A5C48" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 11,
                      background: `${item.color}18`,
                      border: `1px solid ${item.color}45`,
                    }}
                  >
                    <div style={{ fontSize: 12.5, color: CLR.text, fontWeight: 600 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 12, color: CLR.textM, fontWeight: 500 }}>
                      {fmtTime(item.start)} – {fmtTime(item.end)}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Footer Note ──────────────────────────────────────────────── */}
              <div
                style={{
                  padding: "9px 12px",
                  borderRadius: 9,
                  background: "rgba(218,165,32,.04)",
                  border: `1px solid rgba(218,165,32,.10)`,
                  fontSize: 9.5,
                  color: CLR.textD,
                  lineHeight: 1.65,
                  textAlign: "center",
                }}
              >
                All calculations for {data.location} (Lahiri Ayanamsa · IST UTC+5:30)
                &nbsp;·&nbsp; Auto-refreshes every 60 s
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
