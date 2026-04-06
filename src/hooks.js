// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Custom Hooks — parallax, tilt, reveal, countUp, omChant
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { useState, useEffect, useRef, useCallback } from "react";

// ── Gyroscope Parallax Singleton ──
// Single RAF loop + single event listener shared across all subscribers
const _parSubs = new Set();
const _par = {x:0, y:0, tx:0, ty:0};
let _parRaf = null;
const _lerpN = (a,b,t) => a+(b-a)*t;

function _tickPar() {
  _par.x = _lerpN(_par.x, _par.tx, 0.075);
  _par.y = _lerpN(_par.y, _par.ty, 0.075);
  _parSubs.forEach(fn => fn(_par.x, _par.y));
  _parRaf = requestAnimationFrame(_tickPar);
}

export function initParallax() {
  if (_parRaf) return;
  _parRaf = requestAnimationFrame(_tickPar);
  window.addEventListener('mousemove', e => {
    _par.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    _par.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, {passive:true});
  const onOrientation = e => {
    _par.tx = Math.max(-1, Math.min(1, (e.gamma||0) / 22));
    _par.ty = Math.max(-1, Math.min(1, ((e.beta||0) - 45) / 22));
  };
  window.addEventListener('deviceorientation', onOrientation, {passive:true});
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    document.addEventListener('touchstart', async () => {
      try { await DeviceOrientationEvent.requestPermission(); } catch(_) {}
    }, {once:true, passive:true});
  }
}

export const useParallax = () => {
  const [xy, setXY] = useState([0,0]);
  useEffect(() => {
    const fn = (x, y) => setXY(prev => {
      if (Math.abs(prev[0]-x) < 0.008 && Math.abs(prev[1]-y) < 0.008) return prev;
      return [x, y];
    });
    _parSubs.add(fn);
    return () => _parSubs.delete(fn);
  }, []);
  return xy;
};

// ── 3D Tilt Hook ──
export const useTilt = () => {
  const [tilt, setTilt] = useState({x:0,y:0});
  const ref = useRef(null);
  const onMove = e => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = (e.clientX ?? e.touches?.[0]?.clientX ?? r.left+r.width/2) - r.left - r.width/2;
    const cy = (e.clientY ?? e.touches?.[0]?.clientY ?? r.top+r.height/2) - r.top - r.height/2;
    setTilt({ x: cy/r.height * -10, y: cx/r.width * 12 });
  };
  const onLeave = () => setTilt({x:0,y:0});
  return { ref, tilt, onMove, onLeave };
};

// ── Scroll-Reveal Hook ──
export const useReveal = (threshold=0.12) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if(e.isIntersecting) { setVisible(true); obs.disconnect(); } }, {threshold});
    if(ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

// ── Count-Up Hook ──
export const useCountUp = (target, duration = 1400) => {
  const [val, setVal] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const rafRef = useRef(null);
  const trigger = useCallback(() => { if (!triggered) setTriggered(true); }, [triggered]);
  useEffect(() => {
    if (!triggered) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [triggered, target, duration]);
  return [val, trigger];
};

// ── Om Chant Hook (MP3 + Web Audio API fallback) ──
export const useOmChant = () => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const fadeRef = useRef(null);
  const ctx = useRef(null);
  const masterRef = useRef(null);
  const nodes = useRef([]);

  const stopSynth = useCallback(() => {
    try {
      if (ctx.current && masterRef.current) {
        const now = ctx.current.currentTime;
        masterRef.current.gain.cancelScheduledValues(now);
        masterRef.current.gain.setValueAtTime(masterRef.current.gain.value, now);
        masterRef.current.gain.linearRampToValueAtTime(0, now + 2.5);
      }
      nodes.current.forEach(n => { try { n.stop(ctx.current ? ctx.current.currentTime + 2.6 : 0); } catch(e) {} });
    } catch(e) {}
    nodes.current = [];
    masterRef.current = null;
    setTimeout(() => { try { if (ctx.current) { ctx.current.close(); ctx.current = null; } } catch(e) {} }, 2800);
  }, []);

  const stop = useCallback(() => {
    if (fadeRef.current) { clearInterval(fadeRef.current); fadeRef.current = null; }
    if (audioRef.current) {
      const audio = audioRef.current;
      audioRef.current = null;
      let vol = audio.volume;
      const fadeOut = setInterval(() => {
        vol = Math.max(0, vol - 0.06);
        try { audio.volume = vol; } catch(e) {}
        if (vol <= 0) { try { audio.pause(); audio.currentTime = 0; } catch(e) {} clearInterval(fadeOut); }
      }, 60);
    }
    stopSynth();
    setPlaying(false);
  }, [stopSynth]);

  const playSynth = useCallback((ac) => {
    const t = ac.currentTime;
    const root = 110;
    const master = ac.createGain();
    masterRef.current = master;
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(0.72, t + 3.5);
    master.connect(ac.destination);
    const reverbOut = ac.createGain();
    reverbOut.gain.setValueAtTime(0.38, t);
    reverbOut.connect(master);
    [[0.031, 0.18], [0.071, 0.14], [0.127, 0.10], [0.213, 0.07]].forEach(([dt, g]) => {
      const dl = ac.createDelay(0.5); dl.delayTime.setValueAtTime(dt, t);
      const dg = ac.createGain(); dg.gain.setValueAtTime(g, t);
      dl.connect(dg); dg.connect(reverbOut);
      nodes.current.push(dl);
    });
    const dry = ac.createGain();
    dry.gain.setValueAtTime(0.62, t);
    dry.connect(master);
    const vib = ac.createOscillator();
    const vibG = ac.createGain();
    vib.frequency.setValueAtTime(5.2, t);
    vibG.gain.setValueAtTime(root * 0.0035, t);
    vib.connect(vibG); vib.start(t);
    nodes.current.push(vib);
    const saw = ac.createOscillator();
    saw.type = 'sawtooth'; saw.frequency.setValueAtTime(root, t);
    vibG.connect(saw.frequency);
    const sawG = ac.createGain(); sawG.gain.setValueAtTime(0.55, t);
    saw.connect(sawG);
    const sub = ac.createOscillator();
    sub.type = 'sine'; sub.frequency.setValueAtTime(root, t);
    vibG.connect(sub.frequency);
    const subG = ac.createGain(); subG.gain.setValueAtTime(0.42, t);
    sub.connect(subG); subG.connect(dry); subG.connect(reverbOut);
    const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.setValueAtTime(4, t);
    f1.frequency.setValueAtTime(750, t); f1.frequency.linearRampToValueAtTime(500, t+5); f1.frequency.linearRampToValueAtTime(280, t+10);
    const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.setValueAtTime(6, t);
    f2.frequency.setValueAtTime(1100, t); f2.frequency.linearRampToValueAtTime(800, t+5); f2.frequency.linearRampToValueAtTime(450, t+10);
    const f3 = ac.createBiquadFilter(); f3.type = 'bandpass'; f3.Q.setValueAtTime(5, t);
    f3.frequency.setValueAtTime(260, t);
    const f3G = ac.createGain(); f3G.gain.setValueAtTime(0.15, t); f3G.gain.linearRampToValueAtTime(0.85, t+9);
    f3.connect(f3G);
    sawG.connect(f1); sawG.connect(f2); sawG.connect(f3);
    f1.connect(dry); f1.connect(reverbOut);
    f2.connect(dry); f2.connect(reverbOut);
    f3G.connect(dry); f3G.connect(reverbOut);
    const harm = ac.createOscillator(); harm.type = 'sine'; harm.frequency.setValueAtTime(root*2, t);
    const harmG = ac.createGain(); harmG.gain.setValueAtTime(0.07, t); harmG.gain.linearRampToValueAtTime(0.03, t+6);
    harm.connect(harmG); harmG.connect(dry); harm.start(t);
    nodes.current.push(harm, saw, sub);
    saw.start(t); sub.start(t);
  }, []);

  const startSynth = useCallback(() => {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      ctx.current = ac;
      playSynth(ac);
      setPlaying(true);
    } catch(e) { console.error('Synth fallback failed:', e); }
  }, [playSynth]);

  const play = useCallback(() => {
    if (audioRef.current) { try { audioRef.current.pause(); } catch(e) {} audioRef.current = null; }
    if (fadeRef.current) { clearInterval(fadeRef.current); fadeRef.current = null; }

    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audioRef.current = audio;

    audio.onerror = () => {
      if (audioRef.current === audio) { audioRef.current = null; startSynth(); }
    };

    const tryPlay = () => {
      audio.volume = 0.001;
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          let vol = 0.001;
          fadeRef.current = setInterval(() => {
            vol = Math.min(1, vol + 0.035);
            if (audioRef.current === audio) audio.volume = vol;
            if (vol >= 1) { clearInterval(fadeRef.current); fadeRef.current = null; }
          }, 60);
          setPlaying(true);
        }).catch(err => {
          console.warn('MP3 play() rejected:', err.name, err.message);
          if (audioRef.current === audio) { audioRef.current = null; }
          startSynth();
        });
      } else {
        setPlaying(true);
      }
    };

    audio.src = '/om-chant.mp3';
    audio.load();
    tryPlay();
  }, [startSynth]);

  const toggle = useCallback(() => { playing ? stop() : play(); }, [playing, stop, play]);
  useEffect(() => () => {
    if (fadeRef.current) clearInterval(fadeRef.current);
    if (audioRef.current) { try { audioRef.current.pause(); } catch(e) {} audioRef.current = null; }
    nodes.current.forEach(n => { try { n.stop(); } catch(e) {} });
    try { if (ctx.current) ctx.current.close(); } catch(e) {}
  }, []);
  return { playing, toggle };
};
