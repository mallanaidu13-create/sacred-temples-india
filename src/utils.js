// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Utility functions — haptic, IDB, localStorage, search helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { useCallback } from "react";
import { computePanchangam, DEFAULT_LOC } from "./LivePanchangam.jsx";

// ── Haptic feedback ──
export const haptic = (ms = 20) => { try { navigator.vibrate?.(ms); } catch(e) {} };

// ── Real Panchang summary (from LivePanchangam engine) ──
export const getPanchangSummary = () => {
  const p = computePanchangam(new Date(), DEFAULT_LOC);
  return {
    tithi: p.tithi,
    nakshatra: p.nakshatra,
    yoga: p.yoga,
    vara: p.vara,
    rashiMoon: p.rashiMoon,
  };
};

// ── IndexedDB offline cache ──
export const IDB = (() => {
  const NAME = 'sacredTemples', VER = 1, STORE = 'temples';
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open(NAME, VER);
    r.onupgradeneeded = e => e.target.result.createObjectStore(STORE, {keyPath:'id'});
    r.onsuccess = e => res(e.target.result);
    r.onerror = () => rej(r.error);
  });
  return {
    save: async (temples) => { try { const db = await open(); const tx = db.transaction(STORE,'readwrite'); const st = tx.objectStore(STORE); st.clear(); temples.forEach(t => st.put(t)); await new Promise((r,j) => { tx.oncomplete=r; tx.onerror=()=>j(tx.error); }); db.close(); } catch(e) {} },
    load: async () => { try { const db = await open(); const tx = db.transaction(STORE,'readonly'); const st = tx.objectStore(STORE); const r = st.getAll(); const data = await new Promise((res,rej) => { r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); db.close(); return data||[]; } catch(e) { return []; } },
  };
})();

// ── Recently viewed hook ──
export const useRecentlyViewed = () => {
  const key = 'recentlyViewed';
  const get = () => { try { return JSON.parse(localStorage.getItem(key)||'[]'); } catch { return []; } };
  const add = useCallback((id) => {
    const ids = get().filter(x => x !== id).slice(0, 7);
    localStorage.setItem(key, JSON.stringify([id, ...ids]));
  }, []);
  return { getIds: get, addId: add };
};

// ── Temple Image Helpers ──
export const deityQuery = (deity = '') => {
  const d = deity.toLowerCase();
  if (d.match(/shiv|mahadev|shankar|rudra/)) return 'shiva+temple+india';
  if (d.match(/vishnu|venkat|narayan|balaji|tirupati/)) return 'vishnu+temple+india';
  if (d.match(/rama|krishna|govinda/)) return 'krishna+temple+india';
  if (d.match(/ganesh|ganesha|vinayak|ganapati/)) return 'ganesha+temple+india';
  if (d.match(/devi|shakti|durga|kali|amman|amma|mata|parvati|lakshmi/)) return 'goddess+temple+india';
  if (d.match(/hanuman|bajrang|anjaneya|maruti/)) return 'hanuman+temple+india';
  if (d.match(/murugan|subramania|kartikeya|skanda/)) return 'murugan+temple+india';
  if (d.match(/brahma|saraswati/)) return 'brahma+temple+india';
  return 'ancient+hindu+temple+india';
};

// ── Circuit progress helpers (localStorage) ──
export const cpGet = id => { try { return JSON.parse(localStorage.getItem(`cp_${id}`) || '[]'); } catch { return []; } };
export const cpSet = (id, arr) => localStorage.setItem(`cp_${id}`, JSON.stringify(arr));

// ── Skeleton shimmer helper ──
export const skelBg = (isDark) => isDark
  ? `linear-gradient(90deg,rgba(42,30,20,1) 25%,rgba(58,42,28,1) 50%,rgba(42,30,20,1) 75%)`
  : `linear-gradient(90deg,rgba(230,224,214,1) 25%,rgba(245,240,232,1) 50%,rgba(230,224,214,1) 75%)`;

// ── Chat temple search ──
export const searchTemples = (temples, query) => {
  if (!temples || !temples.length || !query) return [];
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 1);
  const scored = temples.map(t => {
    let score = 0;
    const fields = [
      t.templeName, t.deityPrimary, t.deitySecondary,
      t.townOrCity, t.village, t.district,
      t.stateOrUnionTerritory, t.nearestCity,
      t.architectureStyle, t.majorFestivals,
      t.historicalSignificance, t.specialNotes,
    ].map(f => (f || '').toLowerCase());
    const all = fields.join(' ');
    if ((t.templeName || '').toLowerCase().includes(q)) score += 50;
    if (all.includes(q)) score += 20;
    words.forEach(w => {
      if ((t.templeName || '').toLowerCase().includes(w)) score += 10;
      if ((t.deityPrimary || '').toLowerCase().includes(w)) score += 8;
      if ((t.stateOrUnionTerritory || '').toLowerCase().includes(w)) score += 6;
      if ((t.townOrCity || '').toLowerCase().includes(w)) score += 6;
      if ((t.district || '').toLowerCase().includes(w)) score += 5;
      if (all.includes(w)) score += 2;
    });
    return { temple: t, score };
  }).filter(r => r.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map(r => r.temple);
};

// ── Format temple data for AI prompt ──
export const formatTempleData = (temple) => {
  const lines = [];
  lines.push(`Temple: ${temple.templeName}`);
  if (temple.deityPrimary) lines.push(`Primary Deity: ${temple.deityPrimary}`);
  if (temple.deitySecondary) lines.push(`Secondary Deity: ${temple.deitySecondary}`);
  const loc = [temple.village, temple.townOrCity, temple.district, temple.stateOrUnionTerritory].filter(Boolean).join(', ');
  if (loc) lines.push(`Location: ${loc}`);
  if (temple.latitude && temple.longitude) lines.push(`Coordinates: ${temple.latitude}, ${temple.longitude}`);
  if (temple.nearestCity) lines.push(`Nearest City: ${temple.nearestCity}`);
  if (temple.nearestRailwayStation) lines.push(`Nearest Railway Station: ${temple.nearestRailwayStation}`);
  if (temple.nearestAirport) lines.push(`Nearest Airport: ${temple.nearestAirport}`);
  if (temple.routeSummary) lines.push(`Route: ${temple.routeSummary}`);
  if (temple.darshanTimings) lines.push(`Darshan Timings: ${temple.darshanTimings}`);
  if (temple.majorFestivals) lines.push(`Major Festivals: ${temple.majorFestivals}`);
  if (temple.architectureStyle) lines.push(`Architecture: ${temple.architectureStyle}`);
  if (temple.historicalSignificance) lines.push(`Historical Significance: ${temple.historicalSignificance}`);
  if (temple.specialNotes) lines.push(`Special Notes: ${temple.specialNotes}`);
  return lines.join('\n');
};

// ── Simple markdown → React renderer (bold, code, line breaks) ──
import React from "react";
export const renderMd = (text) => {
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    const rendered = parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) return React.createElement('strong', {key:i}, p.slice(2,-2));
      if (p.startsWith('`') && p.endsWith('`')) return React.createElement('code', {key:i, style:{background:'rgba(212,133,60,0.15)',padding:'1px 5px',borderRadius:4,fontSize:'0.88em',fontFamily:'monospace'}}, p.slice(1,-1));
      return p;
    });
    return React.createElement('span', {key:li}, ...rendered, li < lines.length - 1 ? React.createElement('br') : null);
  });
};
