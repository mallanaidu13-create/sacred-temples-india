import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { LIMBS, TITHI_NAMES, NAKSHATRA_NAMES, YOGA_NAMES, KARANA_NAMES, VARA_NAMES, VARA_GRAHAS, RASHI_NAMES, MASA_NAMES, SAMVATSARA_NAMES, NAKSHATRA_DEITIES } from "./panchangam-i18n.js";

const CTX = createContext(null);

export const LANGS = [
  { code: "en", label: "EN", script: "English" },
  { code: "sa", label: "सं", script: "Sanskrit" },
  { code: "hi", label: "हि", script: "Hindi" },
  { code: "kn", label: "ಕ", script: "Kannada" },
  { code: "ta", label: "த", script: "Tamil" },
  { code: "te", label: "త", script: "Telugu" },
  { code: "ml", label: "മ", script: "Malayalam" },
];

export function PanchangLangProvider({ children }) {
  const [lang, setLang] = useState("en");
  const [dual, setDual] = useState(false);

  const t = useCallback(
    (table, index) => {
      const primary = table[lang]?.[index] ?? table.en[index];
      if (!dual) return { primary, secondary: null };
      const secondary = lang === "en" ? null : table["sa"]?.[index] ?? table.en[index];
      return { primary, secondary };
    },
    [lang, dual]
  );

  const limb = useCallback(
    (key) => {
      const val = LIMBS[key];
      if (!val) return key;
      const primary = val[lang] ?? val.en;
      if (!dual) return primary;
      const secondary = lang === "en" ? null : val.sa ?? val.en;
      return secondary ? `${primary} (${secondary})` : primary;
    },
    [lang, dual]
  );

  const fmtDual = useCallback((primary, secondary) => {
    if (!dual || !secondary || secondary === primary) return primary;
    return `${primary} (${secondary})`;
  }, [dual]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      dual,
      setDual,
      t,
      limb,
      fmtDual,
      tables: {
        TITHI_NAMES,
        NAKSHATRA_NAMES,
        YOGA_NAMES,
        KARANA_NAMES,
        VARA_NAMES,
        VARA_GRAHAS,
        RASHI_NAMES,
        MASA_NAMES,
        SAMVATSARA_NAMES,
        NAKSHATRA_DEITIES,
      },
    }),
    [lang, dual, t, limb, fmtDual]
  );

  return <CTX.Provider value={value}>{children}</CTX.Provider>;
}

export function usePanchangLang() {
  const v = useContext(CTX);
  if (!v) throw new Error("usePanchangLang must be used within PanchangLangProvider");
  return v;
}
