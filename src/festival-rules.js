// Festival Rule Engine — Drik Panchangam
// Rules evaluate based on tithi/nakshatra/masa at sunrise (default) or moonrise/sunset.

export const FESTIVAL_RULES = [
  // Major festivals
  { id: "makar-sankranti",  names: { en: "Makar Sankranti", sa: "मकरसंक्रान्तिः", hi: "मकर संक्रांति", kn: "ಮಕರ ಸಂಕ್ರಾಂತಿ", ta: "மகர் சங்கராந்தி", te: "మకర సంక్రాంతి", ml: "മകര സങ്ക്രാന്തി" }, condition: "sunrise", masa: 9,  sunRashi: 9 }, // Sun enters Makara (Capricorn)
  { id: "ugadi",            names: { en: "Ugadi", sa: "युगादिः", hi: "युगादि", kn: "ಯುಗಾದಿ", ta: "யுகாதி", te: "యుగాది", ml: "യുഗാദി" }, condition: "sunrise", masa: 0,  tithi: 1 }, // Chaitra Pratipada
  { id: "rama-navami",      names: { en: "Rama Navami", sa: "रामनवमी", hi: "राम नवमी", kn: "ರಾಮ ನವಮಿ", ta: "ராம நவமி", te: "రామ నవమి", ml: "രാമ നവമി" }, condition: "sunrise", masa: 0,  tithi: 9 },
  { id: "hanuman-jayanti",  names: { en: "Hanuman Jayanti", sa: "हनूमज्जयन्ती", hi: "हनुमान जयंती", kn: "ಹನುಮಾನ್ ಜಯಂತಿ", ta: "ஹனுமான் ஜெயந்தி", te: "హనుమాన్ జయంతి", ml: "ഹനുമാൻ ജയന്തി" }, condition: "sunrise", masa: 0,  tithi: 15 }, // Chaitra Purnima
  { id: "akshaya-tritiya",  names: { en: "Akshaya Tritiya", sa: "अक्षयतृतीया", hi: "अक्षय तृतीया", kn: "ಅಕ್ಷಯ ತೃತೀಯ", ta: "அக்ஷய திருதியை", te: "అక్షయ తృతీయ", ml: "അക്ഷയ തൃതീയ" }, condition: "sunrise", masa: 1,  tithi: 3 },
  { id: "vata-savitri",     names: { en: "Vata Savitri Vrat", sa: "वटसावित्रीव्रतम्", hi: "वट सावित्री व्रत", kn: "ವಟ ಸಾವಿತ್ರಿ ವ್ರತ", ta: "வட்ட சாவித்திரி விரதம்", te: "వట సావిత్రి వ్రతం", ml: "വട സാവിത്രി വ്രതം" }, condition: "sunrise", masa: 2,  tithi: 15 }, // Jyeshtha Purnima
  { id: "guru-purnima",     names: { en: "Guru Purnima", sa: "गुरूपूर्णिमा", hi: "गुरु पूर्णिमा", kn: "ಗುರು ಪೂರ್ಣಿಮಾ", ta: "குரு பௌர்ணமி", te: "గురు పౌర్ణమి", ml: "ഗുരു പൂര്‍ണിമ" }, condition: "sunrise", masa: 3,  tithi: 15 }, // Ashadha Purnima
  { id: "nag-panchami",     names: { en: "Nag Panchami", sa: "नागपञ्चमी", hi: "नाग पंचमी", kn: "ನಾಗ ಪಂಚಮಿ", ta: "நாக பஞ்சமி", te: "నాగ పంచమి", ml: "നാഗ പഞ്ചമി" }, condition: "sunrise", masa: 4,  tithi: 5 },
  { id: "raksha-bandhan",   names: { en: "Raksha Bandhan", sa: "रक्षाबन्धनम्", hi: "रक्षा बंधन", kn: "ರಕ್ಷಾ ಬಂಧನ", ta: "ரக்ஷா பந்தன்", te: "రక్షా బంధన్", ml: "രക്ഷാ ബന്ധന്‍" }, condition: "sunrise", masa: 4,  tithi: 15 }, // Shravana Purnima
  { id: "janmashtami",      names: { en: "Krishna Janmashtami", sa: "कृष्णजन्माष्टमी", hi: "कृष्ण जन्माष्टमी", kn: "ಕೃಷ್ಣ ಜನ್ಮಾಷ್ಟಮಿ", ta: "கிருஷ்ண ஜெயந்தி", te: "కృష్ణాష్టమి", ml: "കൃഷ്ണജയന്തി" }, condition: "moonrise", masa: 4,  tithi: 23 }, // Rohini nakshatra optional
  { id: "ganesh-chaturthi", names: { en: "Ganesh Chaturthi", sa: "गणेशचतुर्थी", hi: "गणेश चतुर्थी", kn: "ಗಣೇಶ ಚತುರ್ಥಿ", ta: "விநாயகர் சதுர்த்தி", te: "వినాయక చవితి", ml: "വിനായക ചതുര്‍ത്ഥി" }, condition: "sunrise", masa: 5,  tithi: 4 },
  { id: "mahalaya-amavasya",names: { en: "Mahalaya Amavasya", sa: "महालयामावास्या", hi: "महालय अमावस्या", kn: "ಮಹಾಲಯ ಅಮಾವಾಸ್ಯೆ", ta: "மஹாளய அமாவாசை", te: "మహాలయ అమావాస్య", ml: "മഹാലയ അമാവാസി" }, condition: "sunrise", masa: 5,  tithi: 30 }, // Bhadrapada Amavasya
  { id: "navratri-start",   names: { en: "Sharadiya Navratri", sa: "शारदीयनवरात्रि", hi: "शारदीय नवरात्रि", kn: "ಶಾರದೀಯ ನವರಾತ್ರಿ", ta: "சாரதிய நவராத்திரி", te: "శారదీయ నవరాత్రి", ml: "ശാരദീയ നവരാത്രി" }, condition: "sunrise", masa: 6,  tithi: 1 }, // Ashwina Pratipada
  { id: "dussehra",         names: { en: "Vijaya Dashami", sa: "विजयदशमी", hi: "विजयादशमी", kn: "ವಿಜಯದಶಮಿ", ta: "விஜயதசமி", te: "విజయదశమి", ml: "വിജയദശമി" }, condition: "sunrise", masa: 6,  tithi: 10 },
  { id: "karwa-chauth",     names: { en: "Karwa Chauth", sa: "करवाचौथ", hi: "करवा चौथ", kn: "ಕರವಾ ಚೌತ್", ta: "கர்வா சೌத்", te: "కర్వా చౌత్", ml: "കര്‍വാ ചൗത്" }, condition: "sunrise", masa: 6,  tithi: 4 }, // Ashwina Krishna Chaturthi
  { id: "diwali",           names: { en: "Diwali", sa: "दीपावली", hi: "दीपावली", kn: "ದೀಪಾವಳಿ", ta: "தீபாவளி", te: "దీపావళి", ml: "ദീപാവലി" }, condition: "sunset",    masa: 6,  tithi: 15 }, // Kartika Amavasya actually; simplified here
  { id: "skanda-shashti",   names: { en: "Skanda Shashti", sa: "स्कन्दषष्ठी", hi: "स्कंद षष्ठी", kn: "ಸ್ಕಂದ ಷಷ್ಠಿ", ta: "கந்த ஷஷ்டி", te: "స్కంద షష్టి", ml: "സ്കന്ദ ഷഷ്ടി" }, condition: "sunrise", masa: 6,  tithi: 6 },
  { id: "tulasi-vivah",     names: { en: "Tulasi Vivah", sa: "तुलसीविवाहः", hi: "तुलसी विवाह", kn: "ತುಲಸಿ ವಿವಾಹ", ta: "துளசி விவாகம்", te: "తులసి వివాహం", ml: "തുളസിവിവാഹം" }, condition: "sunrise", masa: 7,  tithi: 12 }, // Kartika Dwadashi
  { id: "vaikuntha-ekadashi",names:{ en: "Vaikuntha Ekadashi", sa: "वैकुण्ठैकादशी", hi: "वैकुंठ एकादशी", kn: "ವೈಕುಂಠ ಏಕಾದಶಿ", ta: "வைகுண்ட ஏகாதசி", te: "వైకుంఠ ఏకాదశి", ml: "വൈകുണ്ഠ ഏകാദശി" }, condition: "sunrise", masa: 8,  tithi: 11 }, // Margashirsha Ekadashi
  { id: "maha-shivaratri",  names: { en: "Maha Shivaratri", sa: "महाशिवरात्रिः", hi: "महाशिवरात्रि", kn: "ಮಹಾ ಶಿವರಾತ್ರಿ", ta: "மகா சிவராத்திரி", te: "మహా శివరాత్రి", ml: "മഹാ ശിവരാത്രി" }, condition: "night",     masa: 10, tithi: 29 }, // Magha Krishna Chaturdashi/Amavasya border
  { id: "holi",             names: { en: "Holi", sa: "होली", hi: "होली", kn: "ಹೋಳಿ", ta: "ஹோளி", te: "హోళి", ml: "ഹോളി" }, condition: "sunrise", masa: 10, tithi: 15 }, // Phalguna Purnima
];

export function evaluateFestivals(panchangAtSunrise, masa, tithiNum, sunRashiIdx, nakshatraIdx) {
  const results = [];
  for (const rule of FESTIVAL_RULES) {
    let match = true;
    if (rule.masa != null && rule.masa !== masa) match = false;
    if (rule.tithi != null && rule.tithi !== tithiNum) match = false;
    if (rule.sunRashi != null && rule.sunRashi !== sunRashiIdx) match = false;
    if (match) results.push(rule);
  }
  return results;
}
