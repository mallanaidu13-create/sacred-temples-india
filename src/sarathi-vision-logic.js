/**
 * sarathi-vision-logic.js — Camera helpers, fallback deity detection, and temple matching
 */

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

/* ─── Camera helpers ──────────────────────────────────────────────────────── */

export async function startCamera(videoEl, facingMode = "environment") {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Camera not supported on this device or browser.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode },
    audio: false,
  });
  if (videoEl) {
    videoEl.srcObject = stream;
    await videoEl.play();
  }
  return stream;
}

export function stopCamera(stream, videoEl) {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
  }
  if (videoEl) {
    videoEl.srcObject = null;
  }
}

export function captureFrame(videoEl, canvasEl) {
  if (!videoEl || !canvasEl) return null;
  const width = videoEl.videoWidth;
  const height = videoEl.videoHeight;
  canvasEl.width = width;
  canvasEl.height = height;
  const ctx = canvasEl.getContext("2d");
  ctx.drawImage(videoEl, 0, 0, width, height);
  // Return base64 JPEG, max dimension scaled down for API speed
  return canvasToDataURL(canvasEl, 1280);
}

export function canvasToDataURL(canvasEl, maxDim = 1280) {
  let { width, height } = canvasEl;
  if (width > maxDim || height > maxDim) {
    const scale = Math.min(maxDim / width, maxDim / height);
    const tmp = document.createElement("canvas");
    tmp.width = Math.round(width * scale);
    tmp.height = Math.round(height * scale);
    const ctx = tmp.getContext("2d");
    ctx.drawImage(canvasEl, 0, 0, tmp.width, tmp.height);
    return tmp.toDataURL("image/jpeg", 0.85);
  }
  return canvasEl.toDataURL("image/jpeg", 0.92);
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─── API call ────────────────────────────────────────────────────────────── */

export async function identifyWithGemini(base64DataUrl) {
  if (!GEMINI_KEY) throw new Error("Gemini key not configured");
  const base64 = base64DataUrl.split(",")[1];

  const prompt = `You are an expert in Hindu iconography. Analyze this image of a Hindu deity, statue, carving, or temple icon.
Identify the following and return ONLY valid JSON:
{
  "deity": "Primary deity name (e.g. Lord Shiva, Goddess Durga)",
  "form": "Specific form/manifestation (e.g. Nataraja, Venkateshwara)",
  "mudra": "Hand gesture if visible, else null",
  "vahana": "Vehicle animal if known/visible, else null",
  "weapon": "Primary weapon or object held, else null",
  "story": "One brief sentence of mythological significance.",
  "keywords": ["shiva", "dance", "nataraja", "cosmic"] // 3-6 lowercase keywords for matching temples
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: base64 } },
          ],
        }],
      }),
    }
  );

  const data = await res.json();
  if (!res.ok || data?.error) {
    const err = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(err);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");
  const parsed = JSON.parse(match[0]);
  return {
    deity: parsed.deity || "Unknown Deity",
    form: parsed.form || "",
    mudra: parsed.mudra || null,
    vahana: parsed.vahana || null,
    weapon: parsed.weapon || null,
    story: parsed.story || "",
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    isLocal: false,
  };
}

/* ─── Fallback / local matcher ───────────────────────────────────────────── */

const DEITY_PROFILES = [
  {
    names: ["shiva", "mahadeva", "nataraja", "lingam", "ardhanarishvara", "bhairava", "pashupati"],
    deity: "Lord Shiva",
    form: "Shiva / Nataraja / Lingam",
    story: "Shiva is the destroyer of evil and the transformer within the Trimurti. He is revered as the Supreme Being who creates, protects, and transforms the universe.",
  },
  {
    names: ["vishnu", "krishna", "rama", "venkateshwara", "balaji", "narayana", "perumal", "hayagriva"],
    deity: "Lord Vishnu",
    form: "Vishnu / Krishna / Venkateshwara",
    story: "Vishnu is the preserver and protector of the universe. His avatars, including Rama and Krishna, restore cosmic order whenever evil threatens the world.",
  },
  {
    names: ["devi", "durga", "kali", "parvati", "lakshmi", "saraswati", "meenakshi", "kamakshi", "tulja", "ambika"],
    deity: "The Divine Mother (Devi)",
    form: "Durga / Lakshmi / Saraswati / Parvati",
    story: "Devi manifests as Durga the protector, Lakshmi the goddess of wealth, and Saraswati the goddess of knowledge. She represents Shakti, the divine feminine energy.",
  },
  {
    names: ["ganesha", "ganapati", "vinayaka", "vigneshwara", "pillaiyar"],
    deity: "Lord Ganesha",
    form: "Ganesha / Vinayaka",
    story: "Ganesha is the remover of obstacles and the lord of beginnings. He is worshipped before any new venture and is the patron of arts and sciences.",
  },
  {
    names: ["hanuman", "anjani", "maruti", "bajrangbali"],
    deity: "Lord Hanuman",
    form: "Hanuman / Anjaneya",
    story: "Hanuman symbolizes strength, devotion, and selfless service. He is the divine protector who grants courage and removes fears from the hearts of devotees.",
  },
  {
    names: ["subrahmanya", "murugan", "karttikeya", "skanda", "vel"],
    deity: "Lord Murugan",
    form: "Murugan / Karttikeya / Subrahmanya",
    story: "Murugan is the god of war and victory, the embodiment of wisdom and youth. He is especially revered in Tamil Nadu as the divine spear-bearer.",
  },
  {
    names: ["surya", "sun", "aditya"],
    deity: "Lord Surya",
    form: "Surya / Aditya",
    story: "Surya is the solar deity and the source of all life. He represents health, vitality, and the dispeller of darkness.",
  },
];

export function guessDeityLocal(description = "") {
  const t = description.toLowerCase();
  for (const p of DEITY_PROFILES) {
    if (p.names.some((n) => t.includes(n))) return { ...p, keywords: p.names.slice(0, 4), isLocal: true };
  }
  return {
    deity: "Unknown Deity",
    form: "",
    story: "I could not clearly identify the deity from this image. Try capturing a clearer frontal view, or select a deity below.",
    keywords: [],
    isLocal: true,
  };
}

export function findTemplesByKeywords(temples, keywords) {
  if (!temples?.length || !keywords?.length) return [];
  const scored = temples.map((t) => {
    let score = 0;
    const text = [
      t.deityPrimary, t.deitySecondary, t.templeName, t.historicalSignificance,
      t.specialNotes, t.majorFestivals, t.architectureStyle,
    ].join(" ").toLowerCase();
    keywords.forEach((kw) => {
      if (text.includes(kw)) score += 1;
    });
    return { t, score };
  }).filter((r) => r.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map((r) => r.t);
}

export function isQuotaError(errText) {
  if (!errText) return false;
  const t = errText.toLowerCase();
  return t.includes("quota") || t.includes("rate limit") || t.includes("limit: 0") || t.includes("exceeded");
}

export { GEMINI_KEY };
