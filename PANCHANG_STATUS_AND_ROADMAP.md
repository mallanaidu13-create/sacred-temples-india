# Panchang Status & Upgrade Roadmap

## Current Status (as of April 3, 2026)

### What is already strong
- A dedicated `LivePanchangam` module computes Panchang data in the client using astronomical formulas (Meeus-based Sun/Moon longitude and Lahiri ayanamsa), with no external API dependency.
- It computes key limbs: tithi, nakshatra, yoga, karana, vara, plus rashi, sunrise/sunset, Rahu/Yama/Gulika windows, samvatsara, and masa.
- The live panel auto-refreshes every 60 seconds.

### Gaps that limit “world-class realtime” quality
1. **Location model is static by default**
   - Live Panchang defaults to Chennai/IST and there is no clear user-facing location selector in the Live Panchang component itself.
   - Footer text hardcodes `IST UTC+5:30` even though the component accepts a location prop.

2. **Timezone formatting is fixed to Asia/Kolkata for next-transition times**
   - `fmtDate` formats next tithi/nakshatra times only in `Asia/Kolkata`, which will be wrong for users outside IST.

3. **Realtime cadence is coarse (60 seconds)**
   - Refreshing once per minute is good for dashboard style, but not true event-driven realtime.
   - There is no scheduler for “next boundary” (next tithi/nakshatra/yoga/karana transition).

4. **Astronomical precision is mixed**
   - Core longitudes are strong, but sunrise/sunset use an approximate declination/EOT model.
   - Tithi/nakshatra transition timing uses mean speeds; this is useful but not highest precision at boundaries.

5. **Dual Panchang implementations in app**
   - `App.jsx` also has a simpler `getHinduPanchang()` widget, creating possible mismatch with `LivePanchangam` outputs.

## Best Upgrade Path to Become Truly World-Class + Realtime

## Phase 1 — Product correctness foundation (High priority)
1. **Single source of truth engine**
   - Extract all Panchang calculations into `src/panchang/engine.ts`.
   - Make both “Today’s Panchang” and “Live Panchang” consume this same engine.

2. **True timezone + geolocation correctness**
   - Add location picker (GPS + manual city search + saved locations).
   - Resolve timezone via IANA zone per coordinate (not manual offset).
   - Display every time in selected location timezone and optionally user local timezone.

3. **Accuracy harness**
   - Build a test suite comparing outputs against trusted almanac references for at least 25 major cities and 365 sample dates/year.
   - Track error budget: e.g., transition error <= 2 minutes target.

## Phase 2 — Realtime event architecture (High priority)
1. **Event-driven recomputation**
   - Replace fixed 60s polling with adaptive scheduler:
     - coarse update every 30-60s for UI clocks,
     - exact re-render at computed transition instants (next tithi/nakshatra/yoga/karana boundary).

2. **Realtime update channel**
   - Optional Supabase realtime channel for:
     - festival corrections,
     - locale text updates,
     - emergency hotfix ephemeris constants.

3. **Deterministic cache strategy**
   - Cache daily ephemeris slices in IndexedDB by `(lat,lng,date,engineVersion)`.
   - Instant load from cache, background recalc, then reconcile.

## Phase 3 — World-class quality/performance (Medium priority)
1. **High-precision astronomy backend option**
   - Add optional server microservice (or WASM) for Swiss Ephemeris/JPL-grade calculations.
   - Keep client fallback for offline mode.

2. **Multi-tradition support**
   - Panchang variants: Drik/Traditional schools, regional sunrise rules, amanta/purnimanta months.
   - Allow user to choose tradition profile and make it explicit in UI.

3. **Global localization + accessibility**
   - Language packs: English, Hindi, Tamil, Telugu, Kannada, Malayalam, etc.
   - Proper screen-reader semantics and low-vision mode for liturgical audiences.

## Phase 4 — Signature “never before” experience (Differentiator)
1. **Predictive sacred timeline**
   - Show the next 24h / 7d transition timeline with countdown chips.

2. **Temple-personalized Panchang**
   - “Panchang for this temple” based on temple coordinates + tradition + local sunrise.

3. **Ritual intelligence layer**
   - Context-aware suggestions: best darshan windows, sankalpa-ready text, notification triggers before auspicious windows.

## Suggested immediate sprint (7–10 days)
1. Unify to one Panchang engine.
2. Fix timezone handling and remove IST hardcoding.
3. Add adaptive next-event scheduler.
4. Add regression tests against reference data.
5. Ship location picker and per-city saved presets.

If these five are completed first, quality jumps from “good feature” to “serious global Panchang platform.”
