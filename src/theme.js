// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Theme System — colors, fonts, CSS keyframes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { cinematicKeyframes } from "./CinematicOverlay.jsx";

export const CDark = {
  bg: "#1A1109", bg2: "#201610", bg3: "#2A1E14",
  card: "#241A10", cardH: "#2E2218", cardB: "rgba(255,255,255,0.055)",
  saffron: "#D4853C", saffronH: "#E69A52", saffronDim: "rgba(212,133,60,0.12)",
  saffronPale: "rgba(212,133,60,0.08)",
  gold: "#C4A24E", goldDim: "rgba(196,162,78,0.1)",
  cream: "#F2E8D4", creamM: "#D4C4A8", creamD: "#A89878",
  text: "#EDE4D4", textM: "#A89878", textD: "#6E5E48", textDD: "#5C4E3A",
  red: "#C44040", div: "rgba(255,255,255,0.07)", divL: "rgba(255,255,255,0.035)",
  glass: "rgba(26,17,9,0.78)", glassL: "rgba(26,17,9,0.62)",
};

export const CLight = {
  bg: "#FAFAF8", bg2: "#F4F0EA", bg3: "#EDE8DF",
  card: "#FFFFFF", cardH: "#FBF8F3", cardB: "rgba(0,0,0,0.03)",
  saffron: "#C4721A", saffronH: "#D4853C", saffronDim: "rgba(196,114,26,0.12)",
  saffronPale: "rgba(196,114,26,0.07)",
  gold: "#9E7A28", goldDim: "rgba(158,122,40,0.08)",
  cream: "#1A1208", creamM: "#4A3010", creamD: "#7A5820",
  text: "#1A1208", textM: "#5A3A10", textD: "#8A6030", textDD: "#B89060",
  red: "#C44040", div: "rgba(0,0,0,0.08)", divL: "rgba(0,0,0,0.04)",
  glass: "rgba(250,250,248,0.88)", glassL: "rgba(250,250,248,0.72)",
};

// Mutable theme object — mutated via Object.assign so all importers see updates
export const C = Object.assign({}, CDark);

export function applyTheme(isDark) {
  Object.assign(C, isDark ? CDark : CLight);
}

export const hsl = (h, s, l, a) => a != null ? `hsla(${h},${s}%,${l}%,${a})` : `hsl(${h},${s}%,${l}%)`;

export const FD = "'EB Garamond',Georgia,serif";
export const FB = "'DM Sans',system-ui,sans-serif";
export const FE = FD;

export const getCss = (theme) => `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Noto+Serif+Devanagari:wght@400;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{background:${theme.bg};transition:background-color 0.35s ease}
body{font-family:${FB};background:${theme.bg};color:${theme.text};-webkit-font-smoothing:antialiased;transition:background-color 0.35s ease,color 0.25s ease}
@keyframes rv{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fi{from{opacity:0}to{opacity:1}}
@keyframes breathe{0%,100%{opacity:.2;transform:scale(1)}50%{opacity:.5;transform:scale(1.04)}}
@keyframes drift{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(-8px)}}
@keyframes shimmer{0%{left:-120%}60%{left:120%}100%{left:120%}}
@keyframes glow{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes omLive{0%{transform:translateY(0) scale(1) rotate(-1.2deg);opacity:.88}25%{transform:translateY(-4px) scale(1.05) rotate(0deg);opacity:1}50%{transform:translateY(-7px) scale(1.07) rotate(1deg);opacity:.97}75%{transform:translateY(-4px) scale(1.04) rotate(0.4deg);opacity:.96}100%{transform:translateY(0) scale(1) rotate(-1.2deg);opacity:.88}}
@keyframes omGlow{0%,100%{filter:drop-shadow(0 0 10px rgba(240,192,96,.7)) drop-shadow(0 0 28px rgba(212,133,60,.5)) drop-shadow(0 0 60px rgba(212,133,60,.22)) drop-shadow(0 0 120px rgba(212,133,60,.08))}50%{filter:drop-shadow(0 0 22px rgba(255,220,100,1)) drop-shadow(0 0 55px rgba(230,154,82,.85)) drop-shadow(0 0 110px rgba(212,133,60,.45)) drop-shadow(0 0 200px rgba(212,133,60,.18))}}
@keyframes omHaloSpin{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes ringExpand{0%{transform:translate(-50%,-50%) scale(.55);opacity:.7}100%{transform:translate(-50%,-50%) scale(1.6);opacity:0}}
@keyframes soundWave{0%,100%{transform:scaleY(.4);opacity:.4}50%{transform:scaleY(1);opacity:1}}
@keyframes slideIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
@keyframes panchangGlow{0%,100%{box-shadow:0 0 0 1px rgba(196,162,78,0.08)}50%{box-shadow:0 0 0 1px rgba(196,162,78,0.18),0 0 32px rgba(196,162,78,0.06)}}
@keyframes kenBurns{0%{transform:scale(1)}100%{transform:scale(1.08)}}
@keyframes premiumPulse{0%,100%{box-shadow:0 0 0 1px rgba(196,162,78,0.1)}50%{box-shadow:0 0 0 1px rgba(196,162,78,0.26),0 0 40px rgba(196,162,78,0.07)}}
@keyframes badgePop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.18)}100%{transform:scale(1);opacity:1}}
@keyframes skeletonShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes slideInRight{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
@keyframes slideInLeft{from{opacity:0;transform:translateX(-30%)}to{opacity:1;transform:translateX(0)}}
@keyframes fabPulse{0%,100%{box-shadow:0 4px 22px rgba(212,133,60,0.45),0 0 0 2px rgba(212,133,60,0.15)}50%{box-shadow:0 4px 36px rgba(212,133,60,0.72),0 0 0 7px rgba(212,133,60,0.10)}}
@keyframes fabIn{from{opacity:0;transform:translateY(18px) scale(0.82)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes heartBurst{0%{transform:translate(-50%,-50%) rotate(var(--hb-deg)) translateX(0) scale(1.2);opacity:1}100%{transform:translate(-50%,-50%) rotate(var(--hb-deg)) translateX(32px) scale(0);opacity:0}}
@keyframes premiumSheen{0%{left:-110%}40%{left:160%}100%{left:160%}}
@keyframes floatUp{0%{transform:translateY(0) translateX(0) scale(1);opacity:0}8%{opacity:.75}80%{opacity:.35}100%{transform:translateY(-210px) translateX(var(--fp-x,0px)) scale(0.35);opacity:0}}
@keyframes flipIn{0%{transform:perspective(500px) rotateX(-80deg);opacity:0}100%{transform:perspective(500px) rotateX(0deg);opacity:1}}
@keyframes typeIn{0%{opacity:0;transform:scale(0.7) translateY(4px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes countUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes circuitGlow{0%,100%{box-shadow:0 0 0 1px rgba(212,133,60,0.1),0 4px 20px rgba(0,0,0,0.12)}50%{box-shadow:0 0 0 1px rgba(212,133,60,0.22),0 4px 28px rgba(212,133,60,0.08)}}
@keyframes petalOrbit{0%{transform:translate(-50%,-50%) rotate(0deg) translateX(var(--po-r,96px)) rotate(0deg) scale(1);opacity:var(--po-op,0.7)}50%{opacity:calc(var(--po-op,0.7)*1.25);transform:translate(-50%,-50%) rotate(180deg) translateX(var(--po-r,96px)) rotate(-180deg) scale(1.1)}100%{transform:translate(-50%,-50%) rotate(360deg) translateX(var(--po-r,96px)) rotate(-360deg) scale(1);opacity:var(--po-op,0.7)}}
@keyframes petalFloat{0%{transform:translate(-50%,-50%) translateY(0) translateX(0) scale(1) rotate(0deg);opacity:0}10%{opacity:0.85}75%{opacity:0.45}100%{transform:translate(-50%,-50%) translateY(-180px) translateX(var(--pf-x,0px)) scale(0.3) rotate(var(--pf-r,120deg));opacity:0}}
@keyframes petalTwinkle{0%,100%{opacity:0.15;transform:translate(-50%,-50%) rotate(var(--pt-deg,0deg)) translateX(var(--pt-r,130px)) scale(0.6)}40%{opacity:0.9;transform:translate(-50%,-50%) rotate(var(--pt-deg,0deg)) translateX(var(--pt-r,130px)) scale(1.3)}70%{opacity:0.5;transform:translate(-50%,-50%) rotate(var(--pt-deg,0deg)) translateX(var(--pt-r,130px)) scale(0.85)}}
@keyframes petalSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes sarathiGlow{0%,100%{filter:drop-shadow(0 0 12px rgba(240,192,96,.6)) drop-shadow(0 0 32px rgba(212,133,60,.35)) drop-shadow(0 0 64px rgba(212,133,60,.15))}50%{filter:drop-shadow(0 0 24px rgba(255,220,100,.9)) drop-shadow(0 0 52px rgba(230,154,82,.6)) drop-shadow(0 0 96px rgba(212,133,60,.3))}}
@keyframes sarathiBreathe{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.06);opacity:1}}
@keyframes sarathiAura{0%{transform:translate(-50%,-50%) scale(.7);opacity:.5}50%{transform:translate(-50%,-50%) scale(1.15);opacity:.18}100%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}
@keyframes sarathiRingPulse{0%{transform:translate(-50%,-50%) scale(.6);opacity:.6;border-color:rgba(212,133,60,.4)}100%{transform:translate(-50%,-50%) scale(1.8);opacity:0;border-color:rgba(212,133,60,0)}}
@keyframes sarathiChipIn{from{opacity:0;transform:translateY(8px) scale(.92)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes sarathiThinking{0%{background-position:200% center}100%{background-position:-200% center}}
@keyframes goldenRing{0%{transform:translate(-50%,-50%) scale(1);opacity:0.85;border-color:rgba(212,133,60,0.9)}100%{transform:translate(-50%,-50%) scale(2.8);opacity:0;border-color:rgba(212,133,60,0)}}
@keyframes borderDraw{from{stroke-dashoffset:var(--bd-len,100)}to{stroke-dashoffset:0}}
@keyframes cardSlideIn{from{opacity:0;transform:translateY(28px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes vizBar{0%,100%{transform:scaleY(0.15);opacity:0.12}50%{transform:scaleY(1);opacity:0.88}}
@keyframes sunriseSweep{0%{clip-path:inset(0 100% 0 0);opacity:1}65%{clip-path:inset(0 0% 0 0);opacity:0.88}100%{clip-path:inset(0 0% 0 0);opacity:0}}
@keyframes intentionIn{0%{opacity:0;transform:scale(0.96) translateY(16px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes routeDash{from{stroke-dashoffset:var(--route-len,800)}to{stroke-dashoffset:0}}
@keyframes dotPulse{0%,100%{r:4;opacity:0.8}50%{r:6;opacity:1}}
@keyframes radarSweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes locatePulse{0%,100%{box-shadow:0 0 0 0 rgba(212,133,60,0.45)}50%{box-shadow:0 0 0 12px rgba(212,133,60,0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes sankalpaBar{0%,100%{transform:scaleY(0.4);opacity:0.6}50%{transform:scaleY(1);opacity:1}}
@keyframes visionScan{0%{top:0;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:100%;opacity:0}}
@keyframes arAuraSpin{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes arOmPulse{0%{transform:translate(-50%,-50%) scale(0.6);opacity:0.85}100%{transform:translate(-50%,-50%) scale(2.2);opacity:0}}
@keyframes arFlowerFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(55vh) rotate(180deg);opacity:0}}
.scrFwd{animation:slideInRight .38s cubic-bezier(.22,1,.36,1) both;will-change:transform,opacity}
.scrBack{animation:slideInLeft .32s cubic-bezier(.22,1,.36,1) both;will-change:transform,opacity}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
.rv{animation:rv .55s cubic-bezier(.16,1,.3,1) both}
.fi{animation:fi .32s ease both}
.t{transition:transform .15s cubic-bezier(.16,1,.3,1),box-shadow .15s ease}.t:active{transform:scale(.955)}
.t:focus-visible{outline:2px solid ${theme.saffron};outline-offset:2px;border-radius:inherit}
button:focus-visible{outline:2px solid ${theme.saffron};outline-offset:2px}
input:focus-visible{outline:2px solid ${theme.saffron};outline-offset:0;border-radius:inherit}
@keyframes tabFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.tabContent{animation:tabFade .25s cubic-bezier(.16,1,.3,1) both}
.skipLink{position:absolute;left:-9999px;top:-9999px;z-index:9999;padding:12px 24px;background:${theme.saffron};color:#fff;font-weight:700;border-radius:0 0 12px 0;font-size:14px;text-decoration:none;font-family:${FB}}
.skipLink:focus{left:0;top:0}
::-webkit-scrollbar{width:0;height:0}
input{font-family:${FB}}
input::placeholder{color:${theme.textD}}
.leaflet-popup-content-wrapper{background:#241A10;color:#F2E8D4;border:1px solid rgba(212,133,60,0.2);border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.5)}
.leaflet-popup-tip{background:#241A10;border:1px solid rgba(212,133,60,0.15);box-shadow:none}
.leaflet-popup-content{margin:10px 14px;font-size:13px;line-height:1.5}
.leaflet-popup-close-button{color:rgba(255,255,255,0.4)!important;font-size:16px!important;top:6px!important;right:8px!important}
.leaflet-popup-close-button:hover{color:#D4853C!important}
.leaflet-control-zoom a{background:#241A10!important;color:#D4853C!important;border-color:rgba(255,255,255,0.08)!important}
.leaflet-control-zoom a:hover{background:#2E2218!important}
.leaflet-control-attribution{background:rgba(26,17,9,0.7)!important;color:rgba(255,255,255,0.3)!important;font-size:9px!important;backdrop-filter:blur(8px)}
.leaflet-control-attribution a{color:rgba(212,133,60,0.6)!important}
${cinematicKeyframes}
`;
