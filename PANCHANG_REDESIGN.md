# Production Panchangam Redesign (Drik, Ephemeris-Based, Real-Time)

## 1) Panchang Calculation Engine

### 1.1 Scope and computational baseline
- **Language baseline**: English identifiers + English canonical output keys.
- **Astronomy baseline**: Drik (observable astronomy), using **true geocentric/apparent longitudes** from a modern ephemeris (Swiss Ephemeris, JPL DE431/DE440 wrapper, or equivalent).
- **Time baseline**: all internal math in UTC with explicit conversion to local timezone only at I/O boundaries.
- **Precision target**:
  - Longitudes and phase transitions solved to **<= 1 second** by iterative root-finding.
  - Display time rounded to minute by product setting, while storing seconds.

### 1.2 Inputs and canonical data contract
Required for every computation request:
- `timestamp_utc` (ISO-8601, seconds precision).
- `latitude` (WGS84 decimal degrees).
- `longitude` (WGS84 decimal degrees).
- `timezone_id` (IANA TZDB, e.g., `America/New_York`).
- `calendar_system` (`gregorian` default).
- Optional runtime flags: `ayanamsa` (default `Lahiri`), `tradition_profile` (for display-only regional variants).

Core ephemeris-derived primitives:
- Apparent geocentric ecliptic longitude of Sun: `L_sun_true(t)`.
- Apparent geocentric ecliptic longitude of Moon: `L_moon_true(t)`.
- Local rise/set events (sunrise/sunset/moonrise/moonset) for observer location and date.

### 1.3 Element definitions and production formulas

#### A) Tithi
- **Definition**: based on angular elongation `D(t) = mod360(L_moon_true - L_sun_true)`.
- **Formula**:
  - `tithi_index = floor(D / 12) + 1` in `[1..30]`.
  - Transition boundary when `D = k * 12°`, `k ∈ [0..29]`.
- **Inputs**: `L_moon_true(t)`, `L_sun_true(t)`, timezone conversion, local day window.
- **Steps**:
  1. Compute `D` at query instant for current tithi.
  2. For local day timeline, solve next boundary with bracket + bisection/Newton hybrid.
  3. Return current tithi and end time(s); include zero, one, or two transitions within civil day.
- **Precision**: second-level transition timestamp.
- **Transition handling**:
  - If transition occurs before local sunrise, assign sunrise tithi per ritual rule set.
  - If two tithis end between one sunrise and next, mark as **kshaya/vriddhi candidate metadata** for festival engine.

#### B) Nakshatra
- **Definition**: Moon nirayana longitude segmented into 27 equal parts (13°20').
- **Formula**:
  - `L_moon_nir = mod360(L_moon_true - ayanamsa(t))`.
  - `nakshatra_index = floor(L_moon_nir / (13 + 1/3)) + 1` in `[1..27]`.
  - Transition at `L_moon_nir = n * 13°20'`.
- **Inputs**: Moon true longitude + ayanamsa model.
- **Steps**:
  1. Compute nirayana longitude at instant.
  2. Root-solve next segment boundary crossing.
  3. Emit span list for day timeline.
- **Precision**: second-level.
- **Transition handling**: multiple nakshatra changes in a day are supported by iterative boundary solving.

#### C) Yoga
- **Definition**: sum of Sun and Moon nirayana longitudes, mapped to 27 segments.
- **Formula**:
  - `Y = mod360(L_sun_nir + L_moon_nir)`.
  - `yoga_index = floor(Y / (13 + 1/3)) + 1`.
  - Transition at `Y = y * 13°20'`.
- **Inputs**: Sun + Moon nirayana longitudes.
- **Steps**: compute `Y`, solve nearest boundary forward/backward for timeline.
- **Precision**: second-level.
- **Transition handling**: supports 0/1/2 transitions in local day window.

#### D) Karana
- **Definition**: half-tithi = 6° increments of elongation.
- **Formula**:
  - `k_slot = floor(D / 6) + 1` in `[1..60]` across synodic cycle.
  - Mapping slots -> karana names with fixed and repeating sequence.
- **Inputs**: same as tithi elongation.
- **Steps**:
  1. Compute `D`.
  2. Map half-tithi slot to karana using canonical table.
  3. Root-solve next 6° crossing.
- **Precision**: second-level.
- **Transition handling**: can change multiple times per local day; timeline-first storage required.

#### E) Vara
- **Definition**: weekday by local civil date.
- **Formula**: `vara = weekday(local_datetime)` (Sunday..Saturday).
- **Inputs**: timezone-aware local datetime.
- **Steps**: convert UTC to local timezone with TZDB, extract weekday.
- **Precision**: exact (calendar boundary at local midnight).
- **Transition handling**: only at 00:00 local.

#### F) Sunrise / Sunset
- **Definition**: local apparent rise/set of Sun center with standard refraction model.
- **Method**: ephemeris altitude crossing solver, observer topocentric correction.
- **Inputs**: date, lat/lon, elevation (optional), pressure/temp (optional defaults).
- **Steps**:
  1. Build local date window in UTC.
  2. Compute Sun topocentric altitude curve.
  3. Solve `altitude = -0.833°` crossings (standard civil sunrise/sunset convention).
- **Precision**: minute display, second internal.
- **Transition handling**:
  - Polar latitudes: return `no_rise`/`no_set` status with nearest event metadata.

#### G) Moonrise / Moonset
- **Definition**: local apparent Moon rise/set with parallax/refraction.
- **Method**: topocentric Moon altitude crossing solver from ephemeris.
- **Inputs**: same as sunrise/sunset.
- **Steps**:
  1. Sample + bracket Moon altitude over 24h local window.
  2. Solve each crossing event.
  3. Return none/one/two events as possible.
- **Precision**: minute display, second internal.
- **Transition handling**:
  - Moon may rise without set (or vice versa) in day window; preserve event ordering with explicit null semantics.

### 1.4 Transition engine design (shared)
- Use generic root-finder:
  1. Bracket crossing with adaptive step (e.g., 10 min coarse grid).
  2. Refine with bisection until < 0.5 sec.
  3. Optional Newton step if derivative stable.
- Normalize angle wrap safely with continuous phase-unwrapping near boundaries.
- Store transitions as interval objects:
  - `start_utc`, `end_utc`, `label`, `source_metric`, `confidence`.

---

## 2) Real-Time Architecture

### 2.1 System topology
- **Client apps** (Web/Mobile): geolocation, local UI rendering, offline cache read.
- **Panchang API** (stateless compute gateway): validation, auth, orchestration.
- **Astronomy Compute Service**: ephemeris calls + transition solver.
- **Rules Service**: muhurta logic, observance rules, tradition profiles.
- **Data stores**:
  - Redis (short TTL caches).
  - Postgres (profiles, localization, audit).
  - Object storage (ephemeris files + generated snapshots).

### 2.2 Processing pipeline (input -> output)
1. Request received with `timestamp`, `lat`, `lon`, `timezone_id`, `language`, `tradition_profile`.
2. Validate geospatial bounds and timezone coherence.
3. Resolve timezone offset/DST for requested timestamp using IANA TZDB.
4. Fetch/compute ephemeris longitudes + rise/set events.
5. Derive Panchang elements and transitions.
6. Apply tradition overlays (festival rule interpretation, display order).
7. Localize labels and return structured JSON.

### 2.3 API vs local computation tradeoff
- **Server-first recommended for production**:
  - Pros: consistent ephemeris versioning, deterministic outputs, patch once.
  - Cons: latency and online dependency.
- **Hybrid fallback**:
  - Cache today+tomorrow payload locally.
  - Optional embedded lightweight solver for degraded mode when offline.
- **Do not** use static precomputed tables beyond cache horizons.

### 2.4 Timezone, DST, geolocation handling
- Always store UTC + `timezone_id` + resolved offset at compute-time.
- Recompute if GPS location changes significantly (>= 5 km) or timezone changes.
- DST boundaries:
  - compute intervals in UTC,
  - render local timestamps per interval endpoint,
  - preserve absolute ordering during DST fold/gap.

### 2.5 Caching and recomputation
- **Cache key**: `lat_round|lon_round|date_local|tz|ayanamsa|tradition|engine_version`.
- Rounding strategy for cache reuse: ~0.05° grid for public anonymous traffic, exact coordinates for signed-in premium users.
- TTL policy:
  - today timeline: 15 min refresh.
  - future dates: 24h refresh.
  - invalidate on ephemeris/rules version bump.
- Recompute triggers:
  - app foreground resume,
  - significant location change,
  - minute boundary crossing near known transition (< 2 min).

### 2.6 Output contract (mobile/web implementable)
- JSON sections: `current`, `today_timeline`, `rise_set`, `alerts`, `metadata`.
- Include both machine IDs and localized text keys.
- Provide explicit `start/end` for every element to support timeline UI and notifications.

---

## 3) Enhancement Features (Advanced, High Value)

### 3.1 GPS-based Panchang
- **User value**: instant accuracy while traveling; no manual city selection.
- **Backend logic**:
  - subscribe to OS location updates,
  - trigger recompute when distance threshold met,
  - map reverse-geocode only for display (not for core math).
- **Data dependencies**: device GPS, timezone database, ephemeris engine.

### 3.2 Intelligent Muhurta recommendation engine
- **User value**: actionable time windows for tasks (travel, ceremonies, contracts).
- **Backend logic**:
  - compute candidate windows from tithi/nakshatra/yoga/karana + weekday constraints,
  - exclude Rahu Kalam/Yamaganda/Gulika and configurable taboo windows,
  - rank by weighted scoring profile.
- **Data dependencies**: Panchang intervals, tradition rule library, user intent profile.

### 3.3 Personalized ritual assistant (Sankalp auto generation)
- **User value**: one-tap, context-correct sankalp statement with date/place details.
- **Backend logic**:
  - template engine with placeholders for samvatsara, ayana, ritu, masa, paksha, tithi, nakshatra, gotra/user name,
  - localized script output + pronunciation mode.
- **Data dependencies**: Panchang payload, user profile fields, language pack.

### 3.4 Event alerts (Ekadashi, Pradosha, Rahu Kalam, etc.)
- **User value**: proactive observance reminders.
- **Backend logic**:
  - evaluate event predicates on transition intervals,
  - generate notification schedules with pre-alert buffers,
  - deduplicate when travel/timezone changes.
- **Data dependencies**: event rule engine, device notification token, Panchang timeline.

### 3.5 Multi-tradition comparison (Drik vs regional publishing)
- **User value**: transparency when local almanac differs.
- **Backend logic**:
  - compute canonical Drik core once,
  - apply rule profiles for observance assignment (sunrise-based, pradosha-based, etc.),
  - present diff view with reason codes.
- **Data dependencies**: normalized rule profile catalog, jurisdiction/community mapping.

### 3.6 Historical and future simulation
- **User value**: plan ceremonies, verify past observances, research use-cases.
- **Backend logic**:
  - same engine for date ranges (past/future),
  - batch compute with async jobs and pagination.
- **Data dependencies**: long-span ephemeris files, archival timezone history, rule version snapshots.

---

## 4) Multilingual Overlay Architecture (English Base)

### 4.1 Core model
- Keep canonical semantic layer in English IDs (never translated):
  - e.g., `tithi.ekadashi`, `nakshatra.rohini`, `event.rahu_kalam`.
- Localized layer maps IDs -> language strings.

### 4.2 Storage strategy
Option A (recommended): relational + JSONB hybrid.
- `i18n_terms(term_id PK, domain, english_text, translit_scheme, updated_at)`
- `i18n_translations(term_id FK, lang_code, script_text, transliteration, status, reviewer, updated_at)`
- Cache export to versioned JSON bundles per language for client delivery.

Language codes required:
- `en`, `sa`, `hi`, `kn`, `ta`, `te`, `ml`.

### 4.3 JSON response shape (example)
```json
{
  "term_id": "tithi.ekadashi",
  "label": {
    "en": "Ekadashi",
    "sa": "एकादशी",
    "hi": "एकादशी",
    "kn": "ಏಕಾದಶಿ",
    "ta": "ஏகாதசி",
    "te": "ఏకాదశి",
    "ml": "ഏകാദശി"
  }
}
```

### 4.4 UI language toggle and fallback
- Modes:
  - **Single language**: selected locale only.
  - **Dual language**: English + selected locale stacked.
- Fallback chain:
  1. requested language,
  2. Sanskrit (if domain mandates canonical term),
  3. English final fallback.
- Missing translation telemetry event should be logged for content operations.

### 4.5 Script and font handling
- Full Unicode normalization (NFC) at storage and render boundary.
- Use font stack with tested glyph coverage for Devanagari, Kannada, Tamil, Telugu, Malayalam.
- Avoid auto transliteration at runtime for sacred terms; use curated translations only.
- Version and review translations to prevent semantic drift.

### 4.6 Semantic integrity controls
- Add glossary governance:
  - one canonical term ID,
  - allowed synonyms list by language,
  - reviewer workflow with domain expert sign-off.
- Block deployment if required terms are missing for enabled locales.

---

## 5) UI Design (Mobile First, Premium, Non-Cluttered)

### 5.1 Today Panchang card
- Top fold card with:
  - current tithi, nakshatra, yoga, karana, vara,
  - sunrise/sunset, moonrise/moonset quick row,
  - next transition countdown (`ends in 01:42:10`).
- Interaction:
  - tap card -> detailed sheet.
  - swipe horizontally -> previous/next day.

### 5.2 Detailed expandable view
- Sectioned accordions:
  - Panchang elements with exact start/end times,
  - Observance tags (e.g., Ekadashi),
  - Muhurta recommendation chips.
- Keep each row data-dense but with icon + bilingual label support.

### 5.3 Timeline view (hour-by-hour transitions)
- Vertical timeline from 00:00 to 24:00 local.
- Render colored interval bars per element family.
- Transition markers with precise times and tooltips.
- DST days visually indicate 23h/25h anomalies.

### 5.4 Auspicious / inauspicious visualization
- Unified color semantics:
  - auspicious: emerald spectrum,
  - neutral: slate,
  - caution/inauspicious: amber/red.
- Accessibility:
  - do not encode meaning by color alone; add symbols and labels.

### 5.5 Festival highlighting
- Festival pill on top card when active by local observance rules.
- “Why today?” modal with rule explanation (e.g., tithi at sunrise / pradosha window).
- Add to calendar action (ICS + native integrations).

### 5.6 Implementation-ready component map
- `TodayPanchangCard`
- `TransitionCountdown`
- `RiseSetStrip`
- `PanchangAccordion`
- `DayTimeline`
- `FestivalBadge`
- `MuhurtaPanel`
- `LanguageToggle`

All components consume one normalized API response to avoid duplicate calculations on client.
