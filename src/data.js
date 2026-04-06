// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Static Data — states, deities, shlokas, etc.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const STATES = [
  {name:"Tamil Nadu",         n:38615, h:15,  type:"state"},
  {name:"Andhra Pradesh",     n:21503, h:345, type:"state"},
  {name:"Maharashtra",        n:16800, h:25,  type:"state"},
  {name:"Uttar Pradesh",      n:15200, h:30,  type:"state"},
  {name:"Karnataka",          n:12850, h:42,  type:"state"},
  {name:"Madhya Pradesh",     n:11400, h:28,  type:"state"},
  {name:"Rajasthan",          n:9800,  h:20,  type:"state"},
  {name:"Gujarat",            n:8950,  h:35,  type:"state"},
  {name:"Odisha",             n:7200,  h:150, type:"state"},
  {name:"West Bengal",        n:6400,  h:330, type:"state"},
  {name:"Telangana",          n:6100,  h:10,  type:"state"},
  {name:"Kerala",             n:5800,  h:140, type:"state"},
  {name:"Bihar",              n:5200,  h:45,  type:"state"},
  {name:"Uttarakhand",        n:4800,  h:200, type:"state"},
  {name:"Himachal Pradesh",   n:3200,  h:215, type:"state"},
  {name:"Jharkhand",          n:2900,  h:160, type:"state"},
  {name:"Chhattisgarh",       n:2600,  h:135, type:"state"},
  {name:"Assam",              n:2400,  h:165, type:"state"},
  {name:"Punjab",             n:1900,  h:280, type:"state"},
  {name:"Haryana",            n:1800,  h:50,  type:"state"},
  {name:"Goa",                n:980,   h:180, type:"state"},
  {name:"Tripura",            n:640,   h:320, type:"state"},
  {name:"Manipur",            n:420,   h:175, type:"state"},
  {name:"Meghalaya",          n:310,   h:170, type:"state"},
  {name:"Arunachal Pradesh",  n:280,   h:195, type:"state"},
  {name:"Nagaland",           n:180,   h:155, type:"state"},
  {name:"Sikkim",             n:160,   h:210, type:"state"},
  {name:"Mizoram",            n:120,   h:185, type:"state"},
  {name:"Delhi",              n:1200,  h:260, type:"ut"},
  {name:"Jammu & Kashmir",    n:1700,  h:220, type:"ut"},
  {name:"Puducherry",         n:520,   h:340, type:"ut"},
  {name:"Ladakh",             n:44,    h:225, type:"ut"},
  {name:"Chandigarh",         n:140,   h:270, type:"ut"},
  {name:"Andaman & Nicobar",  n:110,   h:190, type:"ut"},
  {name:"Dadra, NH & DD",     n:90,    h:130, type:"ut"},
  {name:"Lakshadweep",        n:48,    h:195, type:"ut"},
];

export const DEITIES = [
  {name:"Shiva",sk:"शिव",n:1847,h:350,icon:"☽",noPic:true},
  {name:"Vishnu",sk:"विष्णु",n:1523,h:215,icon:"☸"},
  {name:"Devi",sk:"देवी",n:1206,h:280,icon:"✦"},
  {name:"Ganesha",sk:"गणेश",n:1045,h:28,icon:"◈"},
  {name:"Hanuman",sk:"हनुमान",n:892,h:15,icon:"◉"},
  {name:"Murugan",sk:"முருகன்",n:634,h:155,icon:"⊹"},
];

export const SHLOKAS = [
  {sk:"ॐ नमः शिवाय", tr:"Om Namah Shivaya", src:"Shiva Panchakshara"},
  {sk:"ॐ नमो नारायणाय", tr:"Om Namo Narayanaya", src:"Vishnu Ashtakshara"},
  {sk:"ॐ गं गणपतये नमः", tr:"Om Gam Ganapataye Namah", src:"Ganesha Mantra"},
  {sk:"ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे", tr:"Invocation of Chamunda Devi", src:"Devi Mantra"},
  {sk:"ॐ हनुमते नमः", tr:"Om Hanumate Namah", src:"Hanuman Mantra"},
];

export const HERO_PARTICLES = [
  {b:6,  l:28, s:2.5, d:0,   dur:7.2, x:14},
  {b:18, l:52, s:2,   d:1.4, dur:9.0, x:-9},
  {b:10, l:68, s:3,   d:2.6, dur:6.8, x:18},
  {b:30, l:38, s:1.5, d:0.7, dur:8.4, x:-16},
  {b:22, l:75, s:2,   d:3.2, dur:7.6, x:7},
  {b:40, l:22, s:2.5, d:1.0, dur:6.4, x:22},
  {b:14, l:84, s:2,   d:2.0, dur:9.8, x:-6},
  {b:35, l:58, s:1.5, d:0.4, dur:8.0, x:11},
];

export const INTENTIONS = [
  { sk:"सर्वे भवन्तु सुखिनः", en:"May all beings be happy, may all be free from suffering" },
  { sk:"तमसो मा ज्योतिर्गमय", en:"Lead me from darkness into light, from ignorance into wisdom" },
  { sk:"ॐ शान्तिः शान्तिः शान्तिः", en:"Om — peace in body, peace in mind, peace in spirit" },
  { sk:"अहं ब्रह्मास्मि", en:"I am Brahman — the consciousness that pervades all creation" },
  { sk:"यत्र योगेश्वरः कृष्णः", en:"Where there is Krishna, there is victory, wisdom, and prosperity" },
  { sk:"मातृदेवो भव", en:"Honor your mother as a deity — she is the first sacred ground" },
  { sk:"सत्यं शिवं सुन्दरम्", en:"Truth is auspicious, auspiciousness is beauty itself" },
];

export const POPULAR_SEARCHES = ["Jyotirlinga temples","Temples near Chennai","Devi temples Kerala","UNESCO heritage"];

export const DISTRICT_MAP = {
  "Tamil Nadu":       [{n:"Thanjavur",c:892},{n:"Madurai",c:724},{n:"Kanchipuram",c:648},{n:"Tiruchirappalli",c:562},{n:"Tirunelveli",c:498},{n:"Ramanathapuram",c:432},{n:"Chidambaram",c:385},{n:"Coimbatore",c:312},{n:"Salem",c:276},{n:"Vellore",c:248}],
  "Andhra Pradesh":   [{n:"Tirupati",c:954},{n:"Guntur",c:614},{n:"Krishna",c:532},{n:"Kurnool",c:488},{n:"East Godavari",c:442},{n:"Nellore",c:398},{n:"West Godavari",c:356},{n:"Visakhapatnam",c:312},{n:"Srikakulam",c:284},{n:"Kadapa",c:256}],
  "Karnataka":        [{n:"Mysuru",c:784},{n:"Hassan",c:542},{n:"Dakshina Kannada",c:418},{n:"Belagavi",c:472},{n:"Chikkamagaluru",c:382},{n:"Shivamogga",c:348},{n:"Kalaburagi",c:312},{n:"Kodagu",c:292},{n:"Dharwad",c:268},{n:"Udupi",c:244}],
  "Kerala":           [{n:"Thrissur",c:724},{n:"Thiruvananthapuram",c:674},{n:"Palakkad",c:548},{n:"Kollam",c:512},{n:"Ernakulam",c:482},{n:"Kozhikode",c:438},{n:"Malappuram",c:384},{n:"Alappuzha",c:352},{n:"Idukki",c:292},{n:"Pathanamthitta",c:268}],
  "Telangana":        [{n:"Hyderabad",c:412},{n:"Warangal",c:368},{n:"Nalgonda",c:312},{n:"Bhadradri Kothagudem",c:284},{n:"Nizamabad",c:248},{n:"Karimnagar",c:224},{n:"Mahbubnagar",c:198},{n:"Khammam",c:182}],
  "Maharashtra":      [{n:"Pune",c:842},{n:"Nashik",c:724},{n:"Kolhapur",c:682},{n:"Aurangabad",c:618},{n:"Satara",c:572},{n:"Raigad",c:498},{n:"Solapur",c:468},{n:"Nagpur",c:412},{n:"Ahmednagar",c:384},{n:"Sindhudurg",c:328}],
  "Gujarat":          [{n:"Junagadh",c:582},{n:"Somnath",c:524},{n:"Rajkot",c:448},{n:"Vadodara",c:412},{n:"Dwarka",c:392},{n:"Surat",c:368},{n:"Ahmedabad",c:348},{n:"Bhavnagar",c:312},{n:"Gandhinagar",c:256},{n:"Anand",c:224}],
  "Goa":              [{n:"North Goa",c:312},{n:"South Goa",c:268}],
  "Uttar Pradesh":    [{n:"Varanasi",c:1842},{n:"Mathura",c:1524},{n:"Ayodhya",c:1248},{n:"Prayagraj",c:984},{n:"Vrindavan",c:872},{n:"Agra",c:642},{n:"Lucknow",c:584},{n:"Gorakhpur",c:528},{n:"Meerut",c:468},{n:"Kanpur",c:392}],
  "Rajasthan":        [{n:"Jaipur",c:724},{n:"Pushkar",c:648},{n:"Udaipur",c:582},{n:"Jodhpur",c:512},{n:"Nathdwara",c:468},{n:"Ajmer",c:428},{n:"Chittorgarh",c:384},{n:"Alwar",c:348},{n:"Kota",c:312},{n:"Bikaner",c:278}],
  "Madhya Pradesh":   [{n:"Ujjain",c:892},{n:"Bhopal",c:568},{n:"Khajuraho",c:484},{n:"Omkareshwar",c:448},{n:"Indore",c:412},{n:"Gwalior",c:368},{n:"Jabalpur",c:324},{n:"Orchha",c:298},{n:"Chitrakoot",c:272},{n:"Amarkantak",c:248}],
  "Uttarakhand":      [{n:"Rishikesh",c:624},{n:"Haridwar",c:584},{n:"Chamoli (Badrinath)",c:492},{n:"Rudraprayag (Kedarnath)",c:468},{n:"Dehradun",c:384},{n:"Almora",c:348},{n:"Pauri Garhwal",c:312},{n:"Nainital",c:276},{n:"Pithoragarh",c:248},{n:"Tehri",c:224}],
  "Himachal Pradesh": [{n:"Kullu",c:412},{n:"Shimla",c:368},{n:"Chamba",c:324},{n:"Kangra",c:298},{n:"Mandi",c:272},{n:"Bilaspur",c:228},{n:"Hamirpur",c:196},{n:"Una",c:168}],
  "Punjab":           [{n:"Amritsar",c:348},{n:"Ludhiana",c:284},{n:"Patiala",c:248},{n:"Anandpur Sahib",c:212},{n:"Jalandhar",c:196},{n:"Bathinda",c:168}],
  "Haryana":          [{n:"Kurukshetra",c:412},{n:"Ambala",c:248},{n:"Faridabad",c:212},{n:"Gurugram",c:184},{n:"Panipat",c:168},{n:"Hisar",c:148}],
  "West Bengal":      [{n:"Kolkata",c:724},{n:"Murshidabad",c:582},{n:"Birbhum (Tarapith)",c:498},{n:"Burdwan",c:412},{n:"Nadia",c:368},{n:"Hooghly",c:328},{n:"Medinipur",c:292},{n:"Cooch Behar",c:248},{n:"North 24 Parganas",c:224},{n:"Purulia",c:196}],
  "Odisha":           [{n:"Puri",c:884},{n:"Cuttack",c:624},{n:"Bhubaneswar",c:548},{n:"Bhadrak",c:412},{n:"Koraput",c:368},{n:"Bolangir",c:324},{n:"Balasore",c:292},{n:"Ganjam",c:268},{n:"Sambalpur",c:244},{n:"Dhenkanal",c:212}],
  "Bihar":            [{n:"Gaya (Bodh Gaya)",c:624},{n:"Patna",c:512},{n:"Darbhanga",c:448},{n:"Muzaffarpur",c:384},{n:"Bhagalpur",c:348},{n:"Vaishali",c:312},{n:"Sitamarhi",c:278},{n:"Nawada",c:242}],
  "Jharkhand":        [{n:"Deoghar (Baidyanath)",c:484},{n:"Ranchi",c:368},{n:"Dumka",c:284},{n:"Hazaribagh",c:248},{n:"Dhanbad",c:212},{n:"Giridih",c:192}],
  "Assam":            [{n:"Kamrup (Kamakhya)",c:542},{n:"Tezpur",c:384},{n:"Dibrugarh",c:312},{n:"Jorhat",c:272},{n:"Nagaon",c:248},{n:"Barpeta",c:218}],
  "Chhattisgarh":     [{n:"Raipur",c:368},{n:"Dantewada",c:312},{n:"Rajnandgaon",c:268},{n:"Bilaspur",c:248},{n:"Bastar",c:224},{n:"Durg",c:192}],
  "Tripura":          [{n:"Gomati (Tripura Sundari)",c:248},{n:"West Tripura",c:198},{n:"North Tripura",c:112},{n:"South Tripura",c:82}],
  "Manipur":          [{n:"Imphal West",c:168},{n:"Imphal East",c:142},{n:"Bishnupur",c:68},{n:"Thoubal",c:42}],
  "Meghalaya":        [{n:"East Khasi Hills",c:128},{n:"West Jaintia Hills",c:88},{n:"East Garo Hills",c:58},{n:"West Khasi Hills",c:36}],
  "Arunachal Pradesh":[{n:"East Kameng",c:68},{n:"Papum Pare",c:58},{n:"Upper Siang",c:48},{n:"Tawang",c:38},{n:"Dibang Valley",c:28},{n:"Lohit",c:40}],
  "Nagaland":         [{n:"Kohima",c:68},{n:"Dimapur",c:58},{n:"Wokha",c:32},{n:"Mokukchung",c:22}],
  "Sikkim":           [{n:"South Sikkim",c:64},{n:"East Sikkim",c:52},{n:"North Sikkim",c:28},{n:"West Sikkim",c:16}],
  "Mizoram":          [{n:"Aizawl",c:48},{n:"Lunglei",c:32},{n:"Champhai",c:24},{n:"Kolasib",c:16}],
  "Delhi":            [{n:"Central Delhi",c:312},{n:"South Delhi",c:268},{n:"East Delhi",c:212},{n:"North Delhi",c:196},{n:"West Delhi",c:168},{n:"New Delhi",c:144}],
  "Jammu & Kashmir":  [{n:"Jammu",c:484},{n:"Kathua",c:312},{n:"Udhampur (Vaishno Devi)",c:268},{n:"Anantnag",c:224},{n:"Srinagar",c:198},{n:"Kupwara",c:112},{n:"Pahalgam",c:102},{n:"Shopian",c:0}],
  "Puducherry":       [{n:"Puducherry",c:312},{n:"Karaikal",c:128},{n:"Mahé",c:48},{n:"Yanam",c:32}],
  "Chandigarh":       [{n:"Chandigarh",c:140}],
  "Ladakh":           [{n:"Leh",c:28},{n:"Kargil",c:16}],
  "Andaman & Nicobar":[{n:"South Andaman",c:68},{n:"North & Middle Andaman",c:32},{n:"Nicobar",c:10}],
  "Dadra, NH & DD":   [{n:"Daman",c:44},{n:"Diu",c:28},{n:"Dadra & Nagar Haveli",c:18}],
  "Lakshadweep":      [{n:"Kavaratti",c:28},{n:"Agatti",c:12},{n:"Amini",c:8}],
};

export const SARATHI_SYSTEM_PROMPT = `You are Sarathi (सारथी), a wise and knowledgeable divine guide for the Sacred Temples of India app. Your name means "divine charioteer" in Sanskrit — just as Lord Krishna guided Arjuna, you guide devotees and travellers through India's sacred heritage.

Your expertise covers:
• Temple history, mythology, and architecture (Dravidian, Nagara, Vesara, Hoysala, etc.)
• The 12 Jyotirlingas, 51 Shakti Peethas, 108 Divya Desams, Char Dham, Pancha Bhuta Stalas
• Pilgrimage circuits, travel routes, transport options (rail, road, air), accommodation
• Rituals, puja types, festival calendars, darshan timings, dress codes, offerings
• Sanskrit mantras and shloka meanings
• Temple etiquette, visitor guidelines, best seasons to visit
• Regional cuisines, prasad specialties, nearby attractions

Tone: Warm, reverent, knowledgeable — like a learned temple priest who is also a well-travelled guide. Use gentle Sanskrit terms where appropriate (Namaste, Darshan, Prasad, etc.). Keep responses concise but meaningful. Use bullet points or numbered lists for routes/steps. When asked about a specific temple, provide rich context including mythology, architecture, and travel guidance. Always end pilgrimage guidance with a brief blessing or auspicious note.

IMPORTANT: When you receive a context block labeled [TEMPLE DATA FROM DATABASE], use that real data in your response. Present the information in clearly structured sections using **bold headers** such as:
**🛕 Temple Overview**
**📍 Location & How to Reach**
**🕐 Darshan Timings**
**🎪 Festivals & Significance**
**🏛️ Architecture & History**
**📝 Special Notes**
Only include sections for which data is available. Do not fabricate data fields that are not provided. If multiple temples match, present each briefly. If the database provides data, always prefer it over general knowledge.

Respond in English unless the user writes in another language. Do not make up specific temple facts you are unsure about — acknowledge uncertainty gracefully.`;

export const SUGGESTIONS_DEFAULT = [
  { icon: '🛕', label: 'Famous temples to visit' },
  { icon: '🕐', label: 'Temple timings' },
  { icon: '🏛️', label: 'Famous temples in Tamil Nadu' },
  { icon: '🗺️', label: 'Route to Tirupati temple' },
  { icon: '🎪', label: 'Festivals and significance' },
  { icon: '🕉️', label: 'What are the 12 Jyotirlingas?' },
];

export const ABOUT_TEXT = `I am Malla, and this app was born from something far deeper than an idea — it grew from a feeling I have carried with me for a long time. India is not simply a country to me; it is a living memory that breathes through its temples, where every stone, every carving, and every hushed corner holds a story that has travelled across generations without losing its meaning. Temples in India are not merely places of worship. They are expressions of faith and art, of science and devotion, of time itself — built by hands that believed in something far greater than themselves. While a handful of temples are known to the world and visited by millions, there are thousands more that remain quietly hidden: resting in forests, standing on lonely hills, tucked away in villages, or existing in places that most of us will never think to look. These temples are not lesser in any way. They are simply waiting to be seen, to be understood, and to be experienced with the attention they have always deserved. Many of them carry powerful local stories, a depth of spiritual energy, and an architectural beauty that has never been fully explored or shared. Over time, as life moved faster and attention drifted elsewhere, many such sacred places were left behind — not because they lost their importance, but because their stories were never brought forward. This app is my honest attempt to change that, to bring these temples closer to people who seek something more than just travel, something more than just a destination. It is built for those who want to explore, to feel, to understand, and to connect with a deeper side of India that no image can fully capture. It is also a small but sincere step towards encouraging thoughtful, respectful temple tourism — where visiting such places can support local communities, help preserve living traditions, and give these sacred spaces the care and attention they truly deserve. I believe that at least once in a lifetime, every person should stand inside a temple where time quietly slows, where silence speaks louder than any noise, and where you feel a sense of peace and belonging that words can only gesture towards. Not every temple in this app is famous. Not every place is crowded. But every place carries a meaning worth discovering, and a story worth carrying home. If this journey helps you find even one such place, feel even one such moment, or reconnect with something within yourself that you had almost forgotten, then this app has done everything it was meant to do. This is not just about temples. It is about stories, about roots, and about experiences that stay with you long after you have left. Sacred Temples India is simply a guide — but the journey, in every way that matters, is yours to take.`;
