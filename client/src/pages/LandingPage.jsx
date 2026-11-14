import React, { useEffect, useRef, useState, useCallback } from 'react';
import UserMenu from '../components/auth/UserMenu';
import './LandingPage.css';

export default function LandingPage({ navigateTo, onOpenDiagnostics }) {
  const [soundOn, setSoundOn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('install');
  const [speakingPreview, setSpeakingPreview] = useState(false);
  const [privOff, setPrivOff] = useState(false);

  // References for DOM and animation coordination
  const containerRef = useRef(null);
  const bootCanvasRef = useRef(null);
  const haloCanvasRef = useRef(null);
  const dustCanvasRef = useRef(null);
  const waveContainerRef = useRef(null);
  const markStageRef = useRef(null);
  const mark3dRef = useRef(null);
  const statementRef = useRef(null);
  const splitRef = useRef(null);
  const heroRef = useRef(null);
  const bootRef = useRef(null);
  const bootFillRef = useRef(null);
  const bootWordRef = useRef(null);
  const bootTextRef = useRef(null);
  const bootBarRef = useRef(null);
  const chatOutRef = useRef(null);
  const caretRef = useRef(null);
  const stepsRef = useRef(null);
  const permResultRef = useRef(null);
  const privSvgRef = useRef(null);

  // Audio system state refs
  const actxRef = useRef(null);
  const masterRef = useRef(null);
  const ambRef = useRef(null);
  const soundOnRef = useRef(false);
  const bootActiveRef = useRef(true);
  const speakingPreviewRef = useRef(false);

  // Sync soundOnRef and speakingPreviewRef
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    speakingPreviewRef.current = speakingPreview;
  }, [speakingPreview]);

  // Audio Helper Functions
  const ensureAudio = useCallback(() => {
    try {
      if (!actxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return false;
        const actx = new AudioCtx();
        const master = actx.createGain();
        master.gain.value = 0.55;
        master.connect(actx.destination);
        actxRef.current = actx;
        masterRef.current = master;
      }
      if (actxRef.current.state === 'suspended') {
        actxRef.current.resume();
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const tone = useCallback((f, d, type, v, when, to) => {
    if (!actxRef.current || !soundOnRef.current) return;
    try {
      const actx = actxRef.current;
      const t = actx.currentTime + (when || 0);
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v || 0.1, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g);
      g.connect(masterRef.current);
      o.start(t);
      o.stop(t + d + 0.05);
    } catch {}
  }, []);

  const playStartup = useCallback(() => {
    tone(110, 1.4, 'triangle', 0.12, 0, 440);
    tone(220, 1.6, 'sine', 0.06, 0.1, 660);
    tone(330, 1.8, 'sine', 0.04, 0.3, 990);
  }, [tone]);

  const startAmbience = useCallback(() => {
    if (!actxRef.current || !soundOnRef.current || ambRef.current) return;
    try {
      const actx = actxRef.current;
      const g = actx.createGain();
      const f = actx.createBiquadFilter();
      const a = actx.createOscillator();
      const b = actx.createOscillator();
      f.type = 'lowpass';
      f.frequency.value = 380;
      a.type = 'sine';
      a.frequency.value = 55;
      b.type = 'sine';
      b.frequency.value = 82.6;
      b.detune.value = 7;
      g.gain.setValueAtTime(0.0001, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.07, actx.currentTime + 1.6);
      a.connect(f);
      b.connect(f);
      f.connect(g);
      g.connect(masterRef.current);
      a.start();
      b.start();
      ambRef.current = { g, a, b };
    } catch {}
  }, []);

  const stopAmbience = useCallback(() => {
    if (!ambRef.current || !actxRef.current) return;
    try {
      const t = actxRef.current.currentTime;
      const x = ambRef.current;
      ambRef.current = null;
      x.g.gain.cancelScheduledValues(t);
      x.g.gain.setValueAtTime(Math.max(x.g.gain.value, 0.0001), t);
      x.g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      x.a.stop(t + 1.3);
      x.b.stop(t + 1.3);
    } catch {}
  }, []);

  const chime = useCallback(() => {
    tone(659.3, 1.1, 'sine', 0.09, 0);
    tone(880, 1.2, 'sine', 0.08, 0.12);
    tone(1318.5, 1.6, 'sine', 0.06, 0.26);
  }, [tone]);

  const toneRef = useRef(tone);
  const chimeRef = useRef(chime);
  const stopAmbienceRef = useRef(stopAmbience);
  useEffect(() => {
    toneRef.current = tone;
    chimeRef.current = chime;
    stopAmbienceRef.current = stopAmbience;
  });

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    if (next) {
      if (ensureAudio()) {
        setSoundOn(true);
        soundOnRef.current = true;
        playStartup();
        if (bootActiveRef.current) startAmbience();
      }
    } else {
      setSoundOn(false);
      soundOnRef.current = false;
      stopAmbience();
    }
  }, [soundOn, ensureAudio, playStartup, startAmbience, stopAmbience]);

  // Main Interactive and Canvas Lifecycle Effect
  useEffect(() => {
    const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    root.classList.add('js', 'booting');

    function clampVal(x, a = 0, b = 1) {
      return Math.max(a, Math.min(b, x));
    }

    /* ---------- ORB (Boot Canvas) ---------- */
    function createOrb(canvas) {
      if (!canvas) return { size: () => {}, draw: () => {} };
      const ctx = canvas.getContext('2d');
      const N = 420;
      const pts = [];
      let W = 1, H = 1, dpr = 1;

      for (let i = 0; i < N; i++) {
        const y = 1 - 2 * (i + 0.5) / N;
        const r = Math.sqrt(1 - y * y);
        const th = i * 2.399963;
        pts.push({
          x: Math.cos(th) * r,
          y,
          z: Math.sin(th) * r,
          c: (i % 9 === 0),
          s: 0.55 + ((i * 37) % 10) / 10
        });
      }

      function size() {
        if (!canvas) return;
        const r = canvas.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.max(1, r.width);
        H = Math.max(1, r.height);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function rot(x, y, z, ay, ax) {
        const c = Math.cos(ay), s = Math.sin(ay);
        const x1 = x * c + z * s, z1 = -x * s + z * c;
        const c2 = Math.cos(ax), s2 = Math.sin(ax);
        return [x1, y * c2 - z1 * s2, y * s2 + z1 * c2];
      }

      const ringDefs = [
        { k: 1.38, ax: 1.25, az: 0.2, sp: 0.35, dot: '#C4B5FD' },
        { k: 1.68, ax: 0.7, az: -0.6, sp: -0.25, dot: '#67E8F9' },
        { k: 2.0, ax: 1.0, az: 1.1, sp: 0.18, dot: '#C4B5FD' }
      ];

      function draw(t, grow, rings, sphere) {
        ctx.clearRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2, base = Math.min(W, H), R = base * 0.27 * grow;
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.5 * Math.max(grow, 0.07));
        const ga = 0.5 * Math.min(1, grow * 1.3 + 0.25);
        gr.addColorStop(0, `rgba(139,92,246,${ga})`);
        gr.addColorStop(0.35, `rgba(139,92,246,${ga * 0.32})`);
        gr.addColorStop(1, 'rgba(139,92,246,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, W, H);

        if (grow < 0.06) {
          ctx.fillStyle = 'rgba(233,223,255,.95)';
          ctx.beginPath();
          ctx.arc(cx, cy, 2.6, 0, 6.2832);
          ctx.fill();
          return;
        }

        if (sphere > 0.01) {
          ctx.globalAlpha = sphere;
          const g2 = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, 0, cx, cy, R);
          g2.addColorStop(0, 'rgba(196,181,253,.38)');
          g2.addColorStop(0.55, 'rgba(139,92,246,.14)');
          g2.addColorStop(1, 'rgba(139,92,246,0)');
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, 6.2832);
          ctx.fill();

          const ay = t * 0.2, ax = 0.35, sc = base / 600;
          for (let i = 0; i < N; i++) {
            const p = pts[i];
            const q = rot(p.x, p.y, p.z, ay, ax);
            const d = (q[2] + 1) / 2;
            const a = 0.1 + 0.8 * d * d;
            const px = cx + q[0] * R, py = cy + q[1] * R;
            const s = (0.5 + 1.5 * d) * p.s * Math.max(0.7, sc * 1.1);
            ctx.fillStyle = p.c ? `rgba(103,232,249,${a * 0.9})` : `rgba(167,139,250,${a})`;
            ctx.beginPath();
            ctx.arc(px, py, s, 0, 6.2832);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        if (rings > 0.01) {
          for (let k = 0; k < ringDefs.length; k++) {
            const rd = ringDefs[k];
            const RR = R * rd.k;
            const M = 96;
            ctx.beginPath();
            for (let j = 0; j <= M; j++) {
              const th = j / M * 6.2832;
              const x = Math.cos(th), z = Math.sin(th);
              const a1 = rot(x, 0, z, t * 0.12 * (k + 1) * 0.5 + rd.az, rd.ax);
              const X = cx + a1[0] * RR, Y = cy + a1[1] * RR * 0.98;
              if (j === 0) ctx.moveTo(X, Y);
              else ctx.lineTo(X, Y);
            }
            ctx.strokeStyle = `rgba(167,139,250,${0.34 * rings})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            const ang = t * rd.sp * 2;
            const od = rot(Math.cos(ang), 0, Math.sin(ang), t * 0.12 * (k + 1) * 0.5 + rd.az, rd.ax);
            const ox = cx + od[0] * RR, oy = cy + od[1] * RR * 0.98;
            const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, 10);
            og.addColorStop(0, rd.dot);
            og.addColorStop(1, 'rgba(139,92,246,0)');
            ctx.globalAlpha = rings * (0.5 + 0.5 * ((od[2] + 1) / 2));
            ctx.fillStyle = og;
            ctx.beginPath();
            ctx.arc(ox, oy, 10, 0, 6.2832);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ox, oy, 1.8, 0, 6.2832);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }

      size();
      return { size, draw };
    }

    /* ---------- HALO (Hero Canvas) ---------- */
    function createHalo(canvas) {
      if (!canvas) return { size: () => {}, draw: () => {} };
      const ctx = canvas.getContext('2d');
      let W = 1, H = 1;
      const defs = [
        { rx: 0.62, ry: 0.20, rot: -0.38, sp: 0.5, dot: '#C4B5FD', a: 0.30 },
        { rx: 0.80, ry: 0.32, rot: 0.52, sp: -0.34, dot: '#67E8F9', a: 0.24 },
        { rx: 0.98, ry: 0.17, rot: -0.92, sp: 0.22, dot: '#C4B5FD', a: 0.2 }
      ];

      function size() {
        if (!canvas) return;
        const r = canvas.getBoundingClientRect();
        const d = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.max(1, r.width);
        H = Math.max(1, r.height);
        canvas.width = Math.round(W * d);
        canvas.height = Math.round(H * d);
        ctx.setTransform(d, 0, 0, d, 0, 0);
      }

      function draw(t, mx, my) {
        ctx.clearRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2, base = Math.min(W, H) / 2;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.95);
        g.addColorStop(0, 'rgba(139,92,246,.34)');
        g.addColorStop(0.45, 'rgba(139,92,246,.1)');
        g.addColorStop(1, 'rgba(139,92,246,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        for (let k = 0; k < defs.length; k++) {
          const d = defs[k];
          ctx.save();
          ctx.translate(cx + mx * 10 * (k + 1) * 0.5, cy + my * 8 * (k + 1) * 0.5);
          ctx.rotate(d.rot + Math.sin(t * 0.15 + k) * 0.08);
          const rx = base * d.rx, ry = base * d.ry * (1 + 0.14 * Math.sin(t * 0.4 + k * 2));
          ctx.beginPath();
          ctx.ellipse(0, 0, rx, ry, 0, 0, 6.2832);
          ctx.strokeStyle = `rgba(196,181,253,${d.a})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          const a = t * d.sp * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
          const og = ctx.createRadialGradient(x, y, 0, x, y, 12);
          og.addColorStop(0, d.dot);
          og.addColorStop(1, 'rgba(139,92,246,0)');
          ctx.globalAlpha = 0.55 + 0.45 * Math.sin(a);
          ctx.fillStyle = og;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, 6.2832);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, 6.2832);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      size();
      return { size, draw };
    }

    /* ---------- DUST CANVAS ---------- */
    const dc = dustCanvasRef.current;
    let dx = null;
    const dust = [];
    let DW = 1, DH = 1;

    if (dc) {
      dx = dc.getContext('2d');
      const dsize = () => {
        const r = dc.getBoundingClientRect();
        const d = Math.min(window.devicePixelRatio || 1, 2);
        DW = r.width;
        DH = r.height;
        dc.width = DW * d;
        dc.height = DH * d;
        dx.setTransform(d, 0, 0, d, 0, 0);
      };
      dsize();
      for (let i = 0; i < 80; i++) {
        dust.push({
          x: Math.random(),
          y: Math.random(),
          r: Math.random() * 1.3 + 0.3,
          v: Math.random() * 0.012 + 0.003,
          c: Math.random() < 0.1,
          p: Math.random() * 6.28
        });
      }
    }

    function drawDust(t) {
      if (!dx) return;
      dx.clearRect(0, 0, DW, DH);
      for (let i = 0; i < dust.length; i++) {
        const p = dust[i];
        if (!RM) {
          p.y -= p.v * 0.016;
          if (p.y < -0.02) p.y = 1.02;
        }
        const a = 0.25 + 0.35 * Math.sin(t * 0.8 + p.p);
        dx.fillStyle = p.c ? `rgba(103,232,249,${a * 0.7})` : `rgba(167,139,250,${a * 0.7})`;
        dx.beginPath();
        dx.arc(p.x * DW + Math.sin(t * 0.3 + p.p) * 6, p.y * DH, p.r, 0, 6.2832);
        dx.fill();
      }
    }

    /* ---------- ANIMATION TASK RUNNER ---------- */
    const tasks = [];
    function addTask(fn, el) {
      const k = { fn, on: true };
      tasks.push(k);
      if (el && 'IntersectionObserver' in window) {
        k.on = false;
        new IntersectionObserver((es) => {
          k.on = es[0].isIntersecting;
        }, { rootMargin: '80px' }).observe(el);
      }
      return k;
    }

    let animReq = null;
    function loop(ts) {
      if (!document.hidden) {
        for (let i = 0; i < tasks.length; i++) {
          if (tasks[i].on) tasks[i].fn(ts / 1000);
        }
      }
      animReq = requestAnimationFrame(loop);
    }

    /* ---------- BOOT ANIMATION ---------- */
    const boot = bootRef.current;
    const bootOrb = createOrb(bootCanvasRef.current);
    const startT = performance.now();
    let finished = false;
    const T_TOTAL = RM ? 1300 : 6000;

    function ease(x) {
      return 1 - Math.pow(1 - x, 3);
    }
    const flags = { mk: false, word: false, text: false };

    let bootReq = null;
    function bootFrame() {
      if (finished) return;
      const e = performance.now() - startT;
      const s = e / 1000;
      let grow, rings, sphere = 1;

      if (RM) {
        grow = 1;
        rings = 1;
        sphere = 0;
      } else {
        grow = s < 0.7 ? 0 : (s < 1.3 ? 0.035 * clampVal((s - 0.7) / 0.6) : 0.035 + 0.965 * ease(clampVal((s - 1.3) / 1.5)));
        rings = clampVal((s - 2.1) / 1.0);
        sphere = 1 - clampVal((s - 3.1) / 0.9);
      }

      bootOrb.draw(s + 3, grow, rings, sphere);

      if (!flags.mk && e > (RM ? 60 : 3100) && boot) {
        flags.mk = true;
        boot.classList.add('mk');
      }
      if (!flags.word && e > (RM ? 120 : 3700) && bootWordRef.current) {
        flags.word = true;
        bootWordRef.current.classList.add('show');
      }
      if (!flags.text && e > (RM ? 200 : 4100) && bootTextRef.current && bootBarRef.current) {
        flags.text = true;
        bootTextRef.current.classList.add('show');
        bootBarRef.current.classList.add('show');
      }

      const pr = RM ? clampVal(e / T_TOTAL) : clampVal((e - 4100) / 1600);
      if (bootFillRef.current) {
        bootFillRef.current.style.width = `${(pr * 100).toFixed(1)}%`;
      }

      if (e >= T_TOTAL) {
        finishBoot();
        return;
      }
      bootReq = requestAnimationFrame(bootFrame);
    }

    function finishBoot() {
      if (finished) return;
      finished = true;
      bootActiveRef.current = false;
      if (soundOnRef.current) {
        if (chimeRef.current) chimeRef.current();
        if (stopAmbienceRef.current) stopAmbienceRef.current();
      }
      if (boot) boot.classList.add('done');
      root.classList.remove('booting');
      root.classList.add('ready');
      setTimeout(() => {
        if (boot) boot.style.display = 'none';
      }, 1300);
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !finished) finishBoot();
    };
    window.addEventListener('keydown', handleKeyDown);

    const bootSkipBtn = document.getElementById('bootSkip');
    if (bootSkipBtn) bootSkipBtn.addEventListener('click', finishBoot);
    const bootFallbackTimer = setTimeout(finishBoot, 9500);
    bootReq = requestAnimationFrame(bootFrame);

    /* ---------- HERO TILT & PARTICLES ---------- */
    const halo = createHalo(haloCanvasRef.current);
    let mx = 0, my = 0, tx = 0, ty = 0;
    const stage = markStageRef.current;
    const mark3d = mark3dRef.current;

    const handlePointerMove = (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    function heroFrame(t) {
      mx += (tx - mx) * 0.05;
      my += (ty - my) * 0.05;
      if (stage) {
        stage.style.setProperty('--mx', mx.toFixed(3));
        stage.style.setProperty('--my', my.toFixed(3));
      }
      if (mark3d) {
        mark3d.style.setProperty('--rx', `${(-my * 7).toFixed(2)}deg`);
        mark3d.style.setProperty('--ry', `${(mx * 10).toFixed(2)}deg`);
      }
      halo.draw(t, mx, my);
      drawDust(t);
    }

    if (RM) {
      halo.draw(2, 0, 0);
      drawDust(1);
    } else if (heroRef.current) {
      addTask(heroFrame, heroRef.current);
    }

    /* ---------- STATEMENT WORD WRAPPING ---------- */
    const statement = statementRef.current;
    const words = [];
    if (statement) {
      function wrap(node) {
        Array.prototype.slice.call(node.childNodes).forEach((c) => {
          if (c.nodeType === 3) {
            const frag = document.createDocumentFragment();
            c.textContent.split(/(\s+)/).forEach((tok) => {
              if (!tok) return;
              if (/^\s+$/.test(tok)) {
                frag.appendChild(document.createTextNode(' '));
              } else {
                const s = document.createElement('span');
                s.className = 'w';
                s.textContent = tok;
                frag.appendChild(s);
                words.push(s);
              }
            });
            node.replaceChild(frag, c);
          } else if (c.nodeType === 1) {
            wrap(c);
          }
        });
      }
      wrap(statement);
      if (RM) statement.classList.add('all');
    }

    /* ---------- SCROLL HANDLER ---------- */
    const heroEl = heroRef.current;
    const splitEl = splitRef.current;
    let ticking = false;
    let lastLit = -1;

    function onScroll() {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      if (!RM) {
        root.style.setProperty('--py', `${Math.min(y, 900) * 0.12}px`);
        if (heroEl && stage) {
          const hb = heroEl.getBoundingClientRect();
          const sp = clampVal(-hb.top / Math.max(1, hb.height));
          stage.style.setProperty('--sp', sp.toFixed(3));
        }
        if (splitEl) {
          const r = splitEl.getBoundingClientRect();
          const p = clampVal(-r.top / Math.max(1, r.height - vh));
          splitEl.style.setProperty('--ap', p.toFixed(3));
          const n = Math.round(clampVal(p / 0.72) * words.length);
          if (n !== lastLit) {
            for (let i = 0; i < words.length; i++) {
              words[i].classList.toggle('lit', i < n);
            }
            lastLit = n;
          }
        }
      }
    }

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    onScroll();

    /* ---------- REVEAL OBSERVER ---------- */
    let ro = null;
    if ('IntersectionObserver' in window && !RM && containerRef.current) {
      ro = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            ro.unobserve(e.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

      const rvEls = containerRef.current.querySelectorAll('.rv');
      rvEls.forEach((el) => ro.observe(el));
    } else if (containerRef.current) {
      containerRef.current.querySelectorAll('.rv').forEach((el) => el.classList.add('in'));
    }

    /* ---------- INTERACTIVE WAVEFORM ---------- */
    const waveEl = waveContainerRef.current;
    const bars = [];
    if (waveEl) {
      waveEl.innerHTML = '';
      for (let b = 0; b < 48; b++) {
        const s = document.createElement('i');
        waveEl.appendChild(s);
        bars.push(s);
      }
    }

    let amp = 0;
    function drawWave(t) {
      amp += ((speakingPreviewRef.current ? 1 : 0.12) - amp) * 0.08;
      for (let i = 0; i < bars.length; i++) {
        const env = Math.sin(i / (bars.length - 1) * Math.PI);
        const n = Math.sin(t * 3.1 + i * 0.55) * 0.5 + Math.sin(t * 5.3 + i * 0.9) * 0.3 + Math.sin(t * 1.7 + i * 0.2) * 0.2;
        const h = 6 + Math.max(0, (env * 0.55 + env * n * 0.45)) * amp * 150;
        bars[i].style.height = `${h.toFixed(1)}px`;
      }
    }
    if (waveEl) {
      if (RM) {
        amp = 0.5;
        drawWave(1);
      } else {
        addTask(drawWave, waveEl);
      }
    }

    /* ---------- CHAT TYPING SIMULATION ---------- */
    const chatText = 'A mutex is a lock that one thread holds at a time, and only the holder may release it. A semaphore is a counter that lets up to N threads in at once, and any thread can signal it. Use a mutex to guard a resource, and a semaphore to limit access to a pool.';
    const chatOut = document.getElementById('chatOut');
    const caret = document.getElementById('caret');
    let chatTimer = null;

    if (chatOut && caret) {
      if (RM || !('IntersectionObserver' in window)) {
        chatOut.textContent = chatText;
        caret.style.display = 'none';
      } else {
        let started = false;
        const chatObs = new IntersectionObserver((es, ob) => {
          if (es[0].isIntersecting && !started) {
            started = true;
            ob.disconnect();
            let i = 0;
            function step() {
              i += 2;
              chatOut.textContent = chatText.slice(0, i);
              if (i < chatText.length) {
                chatTimer = setTimeout(step, 22);
              } else {
                caret.style.display = 'none';
              }
            }
            step();
          }
        }, { threshold: 0.5 });
        const chatContainer = document.getElementById('chat');
        if (chatContainer) chatObs.observe(chatContainer);
      }
    }

    /* ---------- CAPABILITY SCROLL RAIL TRACKING ---------- */
    let railObs = null;
    const railLinks = document.querySelectorAll('.rail a');
    if ('IntersectionObserver' in window && railLinks.length > 0) {
      railObs = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            railLinks.forEach((a) => {
              a.classList.toggle('on', a.getAttribute('href') === `#${e.target.id}`);
            });
          }
        });
      }, { rootMargin: '-40% 0px -50% 0px' });

      document.querySelectorAll('.scene').forEach((s) => railObs.observe(s));
    }

    /* ---------- START MAIN LOOP ---------- */
    if (!RM) animReq = requestAnimationFrame(loop);

    /* ---------- CLEANUP ON UNMOUNT ---------- */
    return () => {
      finished = true;
      root.classList.remove('booting', 'ready');
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(bootFallbackTimer);
      clearTimeout(chatTimer);
      if (bootReq) cancelAnimationFrame(bootReq);
      if (animReq) cancelAnimationFrame(animReq);
      if (ro) ro.disconnect();
      if (railObs) railObs.disconnect();
      if (bootSkipBtn) bootSkipBtn.removeEventListener('click', finishBoot);
      if (stopAmbienceRef.current) stopAmbienceRef.current();
      if (actxRef.current && actxRef.current.state !== 'closed') {
        try {
          actxRef.current.close();
        } catch {}
        actxRef.current = null;
      }
    };
  }, []);

  // Agent Steps Simulation Handler
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentStateText, setAgentStateText] = useState('Ready');
  const agentTimersRef = useRef([]);

  const resetAgentSteps = useCallback(() => {
    agentTimersRef.current.forEach(clearTimeout);
    agentTimersRef.current = [];
    document.querySelectorAll('#steps .st').forEach((s) => s.classList.remove('run', 'done'));
    setAgentRunning(false);
    setAgentStateText('Ready');
  }, []);

  const runAgentSteps = useCallback(() => {
    resetAgentSteps();
    setAgentRunning(true);
    setAgentStateText('Running');
    const stepEls = document.querySelectorAll('#steps .st');
    const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    stepEls.forEach((s, i) => {
      agentTimersRef.current.push(
        setTimeout(() => {
          s.classList.add('run');
          tone(520 + i * 110, 0.18, 'sine', 0.05);
        }, i * (RM ? 150 : 900))
      );
      agentTimersRef.current.push(
        setTimeout(() => {
          s.classList.remove('run');
          s.classList.add('done');
          if (i === stepEls.length - 1) {
            setAgentStateText('Complete (simulated)');
          }
        }, i * (RM ? 150 : 900) + (RM ? 120 : 750))
      );
    });
  }, [resetAgentSteps, tone]);

  // Permission Mock Handler
  const [permResult, setPermResult] = useState('Nothing has been changed.');
  const handlePermAction = (action) => {
    if (action === 'denied') {
      setPermResult('Denied. No files were touched.');
      tone(300, 0.14, 'sine', 0.05);
    } else {
      setPermResult(`Simulated: ${action}. No files were touched.`);
      tone(760, 0.14, 'sine', 0.05);
    }
  };

  // Memory Node Hover State
  const [activeMemoryKey, setActiveMemoryKey] = useState(null);
  const memoryNodeInfo = {
    pref: { title: 'Preferences', desc: 'How you like answers shaped: tone, length, formats.' },
    proj: { title: 'Projects', desc: 'What you are working on and the decisions made along the way.' },
    conv: { title: 'Conversations', desc: 'Searchable history of past threads, kept on your machine.' },
    fact: { title: 'Facts', desc: 'Details you told Ruan to remember, such as names and places.' },
    rout: { title: 'Routines', desc: 'Recurring tasks and habits Ruan can help you keep.' }
  };

  // Trace Signal Simulation
  const traceTimersRef = useRef({});
  const [sayCoreText, setSayCoreText] = useState('Press Trace request to follow a message through the stack.');
  const [sayVoiceText, setSayVoiceText] = useState('Press Trace voice to follow a spoken request.');

  const runTrace = (name) => {
    const isCore = name === 'core';
    const flowId = isCore ? '#flowCore' : '#flowVoice';
    const flow = document.querySelector(flowId);
    if (!flow) return;
    const nodes = flow.querySelectorAll('.node');
    const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = RM ? 160 : 820;

    (traceTimersRef.current[name] || []).forEach(clearTimeout);
    traceTimersRef.current[name] = [];

    nodes.forEach((n) => {
      n.classList.remove('lit', 'done');
      const w = n.querySelector('.wire');
      if (w) w.classList.remove('go');
    });

    nodes.forEach((n, i) => {
      traceTimersRef.current[name].push(
        setTimeout(() => {
          if (i > 0) {
            nodes[i - 1].classList.remove('lit');
            nodes[i - 1].classList.add('done');
          }
          n.classList.add('lit');
          const say = `${i + 1} / ${nodes.length}  ${n.getAttribute('data-say')}`;
          if (isCore) setSayCoreText(say);
          else setSayVoiceText(say);
          tone(480 + i * 90, 0.16, 'sine', 0.05);

          const w = n.querySelector('.wire');
          if (w && i < nodes.length - 1 && !RM) {
            w.classList.remove('go');
            void w.offsetWidth;
            w.classList.add('go');
          }
        }, i * step)
      );
    });

    traceTimersRef.current[name].push(
      setTimeout(() => {
        nodes[nodes.length - 1].classList.remove('lit');
        nodes[nodes.length - 1].classList.add('done');
        const doneMsg = isCore ? 'Done  The reply streams back to your screen.' : 'Done  The spoken reply finishes playing.';
        if (isCore) setSayCoreText(doneMsg);
        else setSayVoiceText(doneMsg);
      }, nodes.length * step + 300)
    );
  };

  return (
    <div className="ruan-landing-page" ref={containerRef}>
      {/* Shared Brand Logo Geometry Symbols */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <path id="pw" d="M4.5 4.2L73 4.1C92 5.5 106 22 106.9 42C107.2 52 105 62 101.8 70.2C93 58.5 78 51 60 50.2C40 49.6 22 44 12 28C7 20 5 12 4.5 4.2Z" />
          <path id="pv" d="M4 70C4 67.4 5.2 66.2 7.6 66.2L55 65.5C82 66 101 85 107.9 114.2C108.2 115 107.6 115.2 106.8 115.2L41 115.2C20 114.4 4 98 4 79Z" />
          <linearGradient id="wg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#DCDCE4" />
          </linearGradient>
          <linearGradient id="vg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#A78BFA" />
            <stop offset=".55" stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#6D3FE0" />
          </linearGradient>
          <linearGradient id="shg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".38" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="cpv">
            <use href="#pv" />
          </clipPath>
          <symbol id="glyph" viewBox="0 0 112 119">
            <use href="#pw" fill="#F1F1F3" />
            <use href="#pv" fill="#8B5CF6" />
          </symbol>
        </defs>
      </svg>

      {/* BOOT / INITIALIZATION OVERLAY SCREEN */}
      <div className="boot" id="boot" ref={bootRef} role="status" aria-live="polite" aria-label="Initializing Ruan AI">
        <canvas id="bootOrb" ref={bootCanvasRef} aria-hidden="true" />
        <div className="boot-center" aria-hidden="true">
          <svg viewBox="0 0 112 119">
            <g className="bw"><use href="#pw" fill="url(#wg)" /></g>
            <g className="bv"><use href="#pv" fill="url(#vg)" /></g>
          </svg>
        </div>
        <div className="boot-tools">
          <button type="button" id="bootSound" aria-pressed={soundOn ? 'true' : 'false'} onClick={toggleSound}>
            {soundOn ? 'Sound on' : 'Sound off'}
          </button>
          <button type="button" id="bootSkip">Skip</button>
        </div>
        <div className="boot-ui">
          <div className="boot-word" id="bootWord" ref={bootWordRef}>Ruan <b>AI</b></div>
          <div className="boot-text" id="bootText" ref={bootTextRef}>INITIALIZING INTELLIGENCE...</div>
          <div className="boot-bar" id="bootBar" ref={bootBarRef}><i id="bootFill" ref={bootFillRef}></i></div>
        </div>
      </div>

      {/* HEADER NAVIGATION */}
      <header className={`nav ${mobileMenuOpen ? 'open' : ''}`} id="nav">
        <div className="wrap">
          <a className="brand" href="#top" aria-label="Ruan AI home">
            <svg viewBox="0 0 112 119" aria-hidden="true">
              <use href="#pw" fill="url(#wg)" />
              <use href="#pv" fill="url(#vg)" />
            </svg>
            <span className="div"></span>
            <span className="wm">Ruan <b>AI</b></span>
          </a>
          <nav className="links" id="links" aria-label="Primary">
            <a className="l" href="#about" onClick={() => setMobileMenuOpen(false)}>About</a>
            <a className="l" href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a className="l" href="#architecture" onClick={() => setMobileMenuOpen(false)}>Architecture</a>
            <a className="l" href="#docs" onClick={() => setMobileMenuOpen(false)}>Documentation</a>
            <a className="l" href="#roadmap" onClick={() => setMobileMenuOpen(false)}>Roadmap</a>
            <a className="l" href="https://github.com/ruhaannarang/Ruan-AI" target="_blank" rel="noopener">GitHub</a>
            {onOpenDiagnostics && (
              <button
                className="l"
                type="button"
                style={{ background: 'none', border: 'none', textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer', padding: 0 }}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDiagnostics();
                }}
              >
                Diagnostics
              </button>
            )}
          </nav>
          <div className="nav-actions">
            {onOpenDiagnostics && (
              <button
                className="icon-btn"
                id="diagnosticsBtn"
                type="button"
                aria-label="Open System Diagnostics"
                title="System Diagnostics & Telemetry"
                onClick={onOpenDiagnostics}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </button>
            )}
            <button
              className="icon-btn sound"
              id="soundBtn"
              type="button"
              aria-pressed={soundOn ? 'true' : 'false'}
              aria-label="Toggle sound"
              onClick={toggleSound}
            >
              <svg className="off-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="m16 9 5 6m0-6-5 6" />
              </svg>
              <svg className="on-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
              </svg>
            </button>
            <UserMenu compact={true} />
            <button
              className="btn primary sm get-started-desktop"
              type="button"
              onClick={() => navigateTo('/app')}
            >
              Launch App
            </button>
            <button
              className="icon-btn burger"
              id="burger"
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen ? 'true' : 'false'}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M4 8h16M4 16h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* HERO SECTION */}
        <section className="hero" id="hero" ref={heroRef}>
          <div className="ambient"></div>
          <div className="grid-lines"></div>
          <canvas id="dust" ref={dustCanvasRef} aria-hidden="true" />
          <div className="wrap">
            <div className="hero-grid">
              <div className="hero-copy">
                <div 
                  className="status-pill h-item" 
                  style={{ '--i': 0, cursor: onOpenDiagnostics ? 'pointer' : 'default' }}
                  onClick={onOpenDiagnostics}
                  role={onOpenDiagnostics ? 'button' : undefined}
                  tabIndex={onOpenDiagnostics ? 0 : undefined}
                  title={onOpenDiagnostics ? 'Click to view live system diagnostics' : undefined}
                  onKeyDown={(e) => {
                    if (onOpenDiagnostics && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onOpenDiagnostics();
                    }
                  }}
                >
                  <span className="pulse"></span>
                  <span>Project status <b>Under active development</b></span>
                </div>
                <h1 className="h-item" style={{ '--i': 1 }}>
                  <span className="l1">Your AI.</span>
                  <span className="l2">Your Machine.</span>
                  <span className="l3">Your Rules.</span>
                </h1>
                <p className="sub h-item" style={{ '--i': 2 }}>
                  Meet Ruan — a personal AI companion designed to understand your world, remember what matters and help you get things done.
                </p>
                <div className="cta-row h-item" style={{ '--i': 3 }}>
                  <button className="btn primary" type="button" onClick={() => navigateTo('/app')}>
                    Launch Ruan <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                  </button>
                  <a className="btn" href="#docs">Explore Documentation</a>
                </div>
                <div className="tags h-item" style={{ '--i': 4 }}>
                  <span>LOCAL-FIRST</span>
                  <span>PRIVATE BY DESIGN</span>
                  <span>OPEN &amp; EXTENSIBLE</span>
                </div>
              </div>

              <div className="mark-stage h-item" id="markStage" ref={markStageRef} style={{ '--i': 2 }}>
                <canvas id="halo" ref={haloCanvasRef} aria-hidden="true" />
                <div className="mark3d" id="mark3d" ref={mark3dRef} role="img" aria-label="The Ruan AI mark: a white leaf above a violet leaf">
                  <svg className="mark-svg" viewBox="0 0 112 119">
                    <g className="lwp">
                      <g className="lwi"><use href="#pw" fill="url(#wg)" /></g>
                    </g>
                    <g className="lvp">
                      <g className="lvi">
                        <use href="#pv" fill="url(#vg)" />
                        <g clipPath="url(#cpv)">
                          <rect className="sheen" x="0" y="50" width="46" height="80" fill="url(#shg)" />
                        </g>
                      </g>
                    </g>
                  </svg>
                </div>
                <span className="orb-label ol1">Local model</span>
                <span className="orb-label ol2">Voice in · out</span>
                <span className="orb-label ol3">Agents · planned</span>
              </div>
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {['LOCAL-FIRST', 'PRIVATE BY DESIGN', 'OPEN & EXTENSIBLE', 'LM STUDIO', 'VOICE IN · VOICE OUT', 'PERMISSION-BASED', 'EXPRESS BACKEND', 'AGENTS · PLANNED'].map((item, idx) => (
              <span key={`mq1-${idx}`}>
                {item}
                <svg viewBox="0 0 112 119"><use href="#glyph" /></svg>
              </span>
            ))}
            {['LOCAL-FIRST', 'PRIVATE BY DESIGN', 'OPEN & EXTENSIBLE', 'LM STUDIO', 'VOICE IN · VOICE OUT', 'PERMISSION-BASED', 'EXPRESS BACKEND', 'AGENTS · PLANNED'].map((item, idx) => (
              <span key={`mq2-${idx}`}>
                {item}
                <svg viewBox="0 0 112 119"><use href="#glyph" /></svg>
              </span>
            ))}
          </div>
        </div>

        {/* ABOUT (SCROLL-DRIVEN SPLIT STAGE) */}
        <section className="split" id="about" ref={splitRef}>
          <div className="split-pin">
            <svg className="about-mark" viewBox="0 0 112 119" aria-hidden="true">
              <g className="aw"><use href="#pw" fill="#F1F1F3" /></g>
              <g className="av"><use href="#pv" fill="#8B5CF6" /></g>
            </svg>
            <div className="wrap split-copy">
              <div className="eyebrow">About Ruan</div>
              <p className="statement" id="statement" ref={statementRef}>
                Most assistants are services you rent. Your words travel to someone else's servers, and your context starts over every time. Ruan begins from the opposite premise: <em>the intelligence runs where your work already lives, on your machine, under your rules.</em>
              </p>
              <div className="scroll-cue mono"><i></i>Keep scrolling</div>
            </div>
          </div>
        </section>

        {/* 4 CORE PRINCIPLES */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="pgrid">
              <div className="pcard rv">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="16" cy="11" r="5" />
                  <path d="M5 27c1.5-6 5.5-9 11-9s9.5 3 11 9" />
                </svg>
                <span className="mono">Personal intelligence</span>
                <h3>It learns your context, not everyone's.</h3>
                <p>Ruan is built to hold on to the projects, preferences and routines that make help useful to you in particular.</p>
              </div>

              <div className="pcard rv">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="8" y="8" width="16" height="16" rx="2" />
                  <path d="M12 4v4M20 4v4M12 24v4M20 24v4M4 12h4M4 20h4M24 12h4M24 20h4" />
                  <rect x="13" y="13" width="6" height="6" rx="1" />
                </svg>
                <span className="mono">Local-first execution</span>
                <h3>Models run on your hardware.</h3>
                <p>Language models are served locally through LM Studio, so the core loop of reading, thinking and replying stays on your machine.</p>
              </div>

              <div className="pcard rv">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 4 6 8v8c0 6 4 10 10 12 6-2 10-6 10-12V8L16 4z" />
                  <path d="m12 16 3 3 5-6" />
                </svg>
                <span className="mono">Ownership and control</span>
                <h3>You approve what matters.</h3>
                <p>Anything that touches your files or applications is designed to ask first, and to show what it intends to do.</p>
              </div>

              <div className="pcard rv">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="4" width="10" height="10" rx="2" />
                  <rect x="18" y="4" width="10" height="10" rx="2" />
                  <rect x="4" y="18" width="10" height="10" rx="2" />
                  <path d="M23 18v10M18 23h10" />
                </svg>
                <span className="mono">Extensible architecture</span>
                <h3>Built from parts you can swap.</h3>
                <p>Interface, backend, model, memory and tools are separate layers, so each can grow or be replaced without a rewrite.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CORE CAPABILITIES WITH STICKY RAIL */}
        <section className="section" id="features" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="eyebrow rv">Core capabilities</div>
            <h2 className="h2 rv">Six abilities, honestly labeled.</h2>
            <p className="lead rv">Ruan is a work in progress. Each capability shows where it stands today, and the interactive previews are simulations of the intended experience.</p>

            <div className="cap-layout">
              <aside className="rail" aria-label="Capabilities">
                <span className="mono">Capabilities</span>
                <a href="#c1" className="on"><span className="dot"></span>Conversational Intelligence</a>
                <a href="#c2"><span className="dot"></span>Natural Voice Interaction</a>
                <a href="#c3"><span className="dot"></span>Persistent Memory</a>
                <a href="#c4"><span className="dot"></span>Agentic Workflows</a>
                <a href="#c5"><span className="dot"></span>Computer Interaction</a>
                <a href="#c6"><span className="dot"></span>Privacy and Local Execution</a>
              </aside>

              <div className="scenes">
                {/* 1. Conversational Intelligence */}
                <article className="scene" id="c1">
                  <div className="scene-head">
                    <span className="chip dev"><i></i>In development</span>
                    <span className="mono">conversation.core</span>
                  </div>
                  <h3>Conversational Intelligence</h3>
                  <p>Natural back-and-forth text with a model that runs on your own machine, streamed as it thinks.</p>
                  <div className="panel rv">
                    <div className="panel-bar">
                      <span>Session · local model</span>
                      <span>Preview</span>
                    </div>
                    <div className="msgs" id="chat">
                      <div className="m u">Explain the difference between a mutex and a semaphore.</div>
                      <div className="m a">
                        <span id="chatOut" ref={chatOutRef}></span>
                        <span className="caret" id="caret" ref={caretRef}></span>
                      </div>
                    </div>
                    <div className="composer">
                      <span>Message Ruan…</span>
                      <kbd>Enter</kbd>
                    </div>
                  </div>
                  <div className="tagrow">
                    <span>Talks to LM Studio's local server</span>
                    <span>Streams replies as they are written</span>
                    <span>Keeps the thread of the conversation</span>
                  </div>
                </article>

                {/* 2. Natural Voice Interaction */}
                <article className="scene" id="c2">
                  <div className="scene-head">
                    <span className="chip dev"><i></i>In development</span>
                    <span className="mono">voice.io</span>
                  </div>
                  <h3>Natural Voice Interaction</h3>
                  <p>Speak to Ruan and hear it answer. Voice runs as its own pipeline that feeds the same conversation engine as text.</p>
                  <div className="panel rv">
                    <div className="panel-bar">
                      <span>Voice channel</span>
                      <span id="waveState">{speakingPreview ? 'Speaking' : 'Idle'}</span>
                    </div>
                    <div className="wave" id="wave" ref={waveContainerRef} aria-hidden="true"></div>
                    <div className="vflow">
                      <b>MIC</b><s>→</s><b>STT</b><s>→</s><b>LLM</b><s>→</s><b>TTS</b><s>→</s><b>AUDIO</b>
                    </div>
                    <div className="panel-foot">
                      <span className="mono">Waveform preview</span>
                      <button
                        className="btn sm"
                        id="waveBtn"
                        type="button"
                        aria-pressed={speakingPreview ? 'true' : 'false'}
                        onClick={() => setSpeakingPreview(!speakingPreview)}
                      >
                        {speakingPreview ? 'Stop preview' : 'Preview speaking'}
                      </button>
                    </div>
                  </div>
                  <div className="tagrow">
                    <span>Microphone input with speech-to-text</span>
                    <span>Spoken replies through streaming text-to-speech</span>
                    <span>Real-world low latency (&lt;540ms TTFP)</span>
                  </div>
                </article>

                {/* 3. Persistent Memory */}
                <article className="scene" id="c3">
                  <div className="scene-head">
                    <span className="chip plan"><i></i>Planned · Phase 2</span>
                    <span className="mono">memory.store</span>
                  </div>
                  <h3>Persistent Memory</h3>
                  <p>Ruan is meant to carry what matters from one conversation into the next, stored locally and organized by kind.</p>
                  <div className="panel rv">
                    <div className="panel-bar">
                      <span>Memory map</span>
                      <span>Concept</span>
                    </div>
                    <svg className="mem-svg" viewBox="0 0 400 290" role="group" aria-label="Memory map concept">
                      <g>
                        <line className={`ln ${activeMemoryKey === 'pref' ? 'on' : ''}`} x1="200" y1="140" x2="82" y2="62" />
                        <line className={`ln ${activeMemoryKey === 'proj' ? 'on' : ''}`} x1="200" y1="140" x2="322" y2="58" />
                        <line className={`ln ${activeMemoryKey === 'conv' ? 'on' : ''}`} x1="200" y1="140" x2="62" y2="204" />
                        <line className={`ln ${activeMemoryKey === 'fact' ? 'on' : ''}`} x1="200" y1="140" x2="338" y2="208" />
                        <line className={`ln ${activeMemoryKey === 'rout' ? 'on' : ''}`} x1="200" y1="140" x2="200" y2="262" />
                      </g>
                      <circle className="core" cx="200" cy="140" r="32" />
                      <text className="coret" x="200" y="144">RUAN</text>

                      {['pref', 'proj', 'conv', 'fact', 'rout'].map((k) => {
                        const coords = {
                          pref: { cx: 82, cy: 62, r: 27, label: 'PREFS' },
                          proj: { cx: 322, cy: 58, r: 27, label: 'PROJECTS' },
                          conv: { cx: 62, cy: 204, r: 27, label: 'THREADS' },
                          fact: { cx: 338, cy: 208, r: 27, label: 'FACTS' },
                          rout: { cx: 200, cy: 262, r: 25, label: 'ROUTINES' }
                        }[k];
                        return (
                          <g
                            key={k}
                            className={`nd ${activeMemoryKey === k ? 'on' : ''}`}
                            tabIndex="0"
                            onMouseEnter={() => setActiveMemoryKey(k)}
                            onMouseLeave={() => setActiveMemoryKey(null)}
                            onFocus={() => setActiveMemoryKey(k)}
                            onBlur={() => setActiveMemoryKey(null)}
                            onClick={() => setActiveMemoryKey(activeMemoryKey === k ? null : k)}
                          >
                            <circle cx={coords.cx} cy={coords.cy} r={coords.r} />
                            <text x={coords.cx} y={coords.cy + 3}>{coords.label}</text>
                          </g>
                        );
                      })}
                    </svg>
                    <p className="mem-cap" id="memCap">
                      {activeMemoryKey && memoryNodeInfo[activeMemoryKey] ? (
                        <><b>{memoryNodeInfo[activeMemoryKey].title}.</b> {memoryNodeInfo[activeMemoryKey].desc}</>
                      ) : (
                        <><b>Hover a node.</b> Five kinds of memory, each stored and editable locally.</>
                      )}
                    </p>
                  </div>
                  <div className="tagrow">
                    <span>Preferences, projects, facts and routines</span>
                    <span>Recall relevant context on request</span>
                    <span>Memories you can read, edit and delete</span>
                  </div>
                </article>

                {/* 4. Agentic Workflows */}
                <article className="scene" id="c4">
                  <div className="scene-head">
                    <span className="chip plan"><i></i>Planned · Phase 3</span>
                    <span className="mono">agents.orchestrator</span>
                  </div>
                  <h3>Agentic Workflows</h3>
                  <p>Hand Ruan a goal instead of a prompt. An orchestration layer breaks it into steps, picks tools and checks the result.</p>
                  <div className="panel rv">
                    <div className="panel-bar">
                      <span>Goal · “Prepare my weekly summary”</span>
                      <span>Simulation</span>
                    </div>
                    <ol className="steps" id="steps" ref={stepsRef}>
                      <li className="st">
                        <span className="dot2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span>
                        <div><h4>Understand the goal</h4><p>Clarify scope and what “done” looks like.</p></div>
                        <span className="tm">plan</span>
                      </li>
                      <li className="st">
                        <span className="dot2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span>
                        <div><h4>Break it into steps</h4><p>Order the work and choose a tool for each.</p></div>
                        <span className="tm">orchestrate</span>
                      </li>
                      <li className="st">
                        <span className="dot2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span>
                        <div><h4>Use tools and memory</h4><p>Read what is needed, with your permission.</p></div>
                        <span className="tm">execute</span>
                      </li>
                      <li className="st">
                        <span className="dot2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span>
                        <div><h4>Check and report back</h4><p>Verify the result, then show you what changed.</p></div>
                        <span className="tm">review</span>
                      </li>
                    </ol>
                    <div className="panel-foot">
                      <span className="mono" id="stepState">{agentStateText}</span>
                      <button
                        className="btn sm"
                        id="stepBtn"
                        type="button"
                        onClick={agentRunning ? resetAgentSteps : runAgentSteps}
                      >
                        {agentRunning ? 'Reset' : 'Run simulation'}
                      </button>
                    </div>
                  </div>
                  <div className="tagrow">
                    <span>Multi-step plans, not one-shot replies</span>
                    <span>Tool calls routed by the orchestrator</span>
                    <span>Every step visible as it happens</span>
                  </div>
                </article>

                {/* 5. Computer Interaction */}
                <article className="scene" id="c5">
                  <div className="scene-head">
                    <span className="chip plan"><i></i>Planned · Phase 4</span>
                    <span className="mono">computer.access</span>
                  </div>
                  <h3>Computer Interaction</h3>
                  <p>Ruan is being designed to work with your files and applications, one approved action at a time.</p>
                  <div className="panel rv">
                    <div className="panel-bar">
                      <span>Permission request</span>
                      <span>Mock-up</span>
                    </div>
                    <div className="perm">
                      <div className="perm-top">
                        <span className="perm-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></svg></span>
                        <div><h4>Ruan wants to rename 24 files</h4><span className="mono" style={{ letterSpacing: '.1em' }}>Requested by step 3 of 4</span></div>
                      </div>
                      <div className="path">~/Documents/Invoices → YYYY-MM-vendor.pdf</div>
                      <div className="perm-actions">
                        <button className="btn primary sm" type="button" onClick={() => handlePermAction('allowed once')}>Allow once</button>
                        <button className="btn sm" type="button" onClick={() => handlePermAction('allowed for this folder')}>Always for this folder</button>
                        <button className="btn sm" type="button" onClick={() => handlePermAction('denied')}>Deny</button>
                      </div>
                      <div className="perm-result" id="permResult" ref={permResultRef} aria-live="polite">{permResult}</div>
                    </div>
                    <div className="scope"><span>files:read</span><span>files:write</span><span>apps:launch</span></div>
                  </div>
                  <div className="tagrow">
                    <span>Read and organize files in folders you choose</span>
                    <span>Operate applications on your behalf</span>
                    <span>Sensitive actions ask before they run</span>
                  </div>
                </article>

                {/* 6. Privacy and Local Execution */}
                <article className="scene" id="c6">
                  <div className="scene-head">
                    <span className="chip prin"><i></i>Design principle</span>
                    <span className="mono">privacy.local</span>
                  </div>
                  <h3>Privacy and Local Execution</h3>
                  <p>The model, the backend and the memory are designed to sit on your own machine, inside a boundary you control.</p>
                  <div className="panel rv">
                    <div className="panel-bar">
                      <span>Trust boundary</span>
                      <span>Diagram</span>
                    </div>
                    <svg className={`priv-svg ${privOff ? 'off' : ''}`} id="privSvg" ref={privSvgRef} viewBox="0 0 420 330" role="img" aria-label="Diagram: Ruan, LM Studio, memory and a permission gate inside your machine; optional external services outside">
                      <rect className="box" x="14" y="14" width="392" height="232" rx="18" />
                      <text className="lbl" x="210" y="40">YOUR MACHINE</text>
                      <rect className="nodeb" x="44" y="62" width="130" height="50" rx="10" />
                      <text className="tt" x="109" y="84">Ruan backend</text>
                      <text x="109" y="100">express</text>
                      <rect className="nodeb" x="246" y="62" width="130" height="50" rx="10" />
                      <text className="tt" x="311" y="84">LM Studio</text>
                      <text x="311" y="100">local model</text>
                      <rect className="nodeb" x="44" y="170" width="130" height="50" rx="10" />
                      <text className="tt" x="109" y="192">Memory</text>
                      <text x="109" y="208">local store</text>
                      <rect className="gate" x="246" y="170" width="130" height="50" rx="10" />
                      <text className="tt" x="311" y="192">Permission gate</text>
                      <text x="311" y="208">you approve</text>
                      <path className="path" d="M174 87H246" />
                      <path className="path" d="M109 112V170" />
                      <path className="path" d="M174 195H246" />
                      <g className="extg">
                        <rect className="ext" x="110" y="284" width="200" height="38" rx="10" />
                        <text x="210" y="307">Optional external services</text>
                        <text x="318" y="276" style={{ textAnchor: 'start', fontSize: '9px' }}>only if you enable</text>
                      </g>
                      <path className="path extp" d="M311 220V262H210V284" />
                    </svg>
                    <div className="panel-foot">
                      <span className="mono" id="privSay">{privOff ? 'Core stays inside your machine' : 'Optional services connected'}</span>
                      <button
                        className="btn sm"
                        id="privBtn"
                        type="button"
                        aria-pressed={privOff ? 'true' : 'false'}
                        onClick={() => {
                          const next = !privOff;
                          setPrivOff(next);
                          tone(next ? 420 : 640, 0.14, 'sine', 0.05);
                        }}
                      >
                        {privOff ? 'Reconnect optional services' : 'Disconnect optional services'}
                      </button>
                    </div>
                  </div>
                  <div className="tagrow">
                    <span>Local model serving through LM Studio</span>
                    <span>No account needed to run the core</span>
                    <span>External services only when you enable them</span>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* MODULAR ARCHITECTURE SECTION */}
        <section className="section" id="architecture" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="eyebrow rv">How it works</div>
            <h2 className="h2 rv">Two paths into one mind.</h2>
            <p className="lead rv">Text and voice take different routes in, then meet at the same conversation engine and the same local model. Trace a request to watch it travel.</p>

            {/* Core Request Flow */}
            <div className="arch-block rv">
              <div className="arch-title">
                <h3>Core request flow</h3>
                <div className="grp">
                  <span className="mono">Text · default path</span>
                  <button className="btn sm primary" type="button" onClick={() => runTrace('core')}>Trace request</button>
                </div>
              </div>
              <ol className="flow f5" id="flowCore">
                <li className="node" data-say="Your message enters through the interface.">
                  <div className="k"><span>Interface</span><span className="chip dev" style={{ padding: '2px 8px' }}><i></i>Dev</span></div>
                  <h4>User Interface</h4>
                  <p>Where you type, speak and review what Ruan is doing.</p>
                  <div className="sub">web client</div>
                  <span className="wire"><i></i></span>
                </li>
                <li className="node" data-say="The Express backend receives it and opens a stream.">
                  <div className="k"><span>Server</span><span className="chip dev" style={{ padding: '2px 8px' }}><i></i>Dev</span></div>
                  <h4>Express Backend</h4>
                  <p>Receives requests, holds session state and streams replies back.</p>
                  <div className="sub">node · express</div>
                  <span className="wire"><i></i></span>
                </li>
                <li className="node" data-say="LM Studio writes the reply on your machine.">
                  <div className="k"><span>Model</span><span className="chip dev" style={{ padding: '2px 8px' }}><i></i>Dev</span></div>
                  <h4>Local LLM</h4>
                  <p>Language model served on your machine by LM Studio.</p>
                  <div className="sub">LM Studio · localhost:1234 by default</div>
                  <span className="wire"><i></i></span>
                </li>
                <li className="node plan" data-say="Agent orchestration plans any extra steps (planned).">
                  <div className="k"><span>Agents</span><span className="chip plan" style={{ padding: '2px 8px' }}>Planned</span></div>
                  <h4>Agent Orchestration</h4>
                  <p>Plans multi-step tasks and decides which tool runs next.</p>
                  <div className="sub">planner · router</div>
                  <span className="wire"><i></i></span>
                </li>
                <li className="node plan" data-say="Tools and memory add context, behind your permissions (planned).">
                  <div className="k"><span>Context</span><span className="chip plan" style={{ padding: '2px 8px' }}>Planned</span></div>
                  <h4>Tools and Memory</h4>
                  <p>Files, applications and the persistent store behind them.</p>
                  <div className="sub">permission-gated</div>
                  <span className="wire"><i></i></span>
                </li>
              </ol>
              <p className="say" id="sayCore" aria-live="polite">{sayCoreText}</p>
            </div>

            {/* Voice Pipeline */}
            <div className="arch-block rv">
              <div className="arch-title">
                <h3>Voice pipeline</h3>
                <div className="grp">
                  <span className="mono">Joins the core flow at the conversation engine</span>
                  <button className="btn sm" type="button" onClick={() => runTrace('voice')}>Trace voice</button>
                </div>
              </div>
              <ol className="flow f6 v" id="flowVoice">
                <li className="node" data-say="Your voice is captured by the microphone.">
                  <div className="k"><span>Input</span></div>
                  <h4>Microphone</h4>
                  <p>Captures your voice in the browser.</p>
                  <span className="wire"><i></i></span>
                </li>
                <li className="node" data-say="Speech-to-text turns the audio into words.">
                  <div className="k"><span>Decode</span></div>
                  <h4>Speech-to-Text</h4>
                  <p>Turns audio into text via faster-whisper.</p>
                  <span className="wire"><i></i></span>
                </li>
                <li className="node" data-say="The conversation engine adds the session context.">
                  <div className="k"><span>Context</span></div>
                  <h4>Conversation Engine</h4>
                  <p>Combines the transcript with the session.</p>
                  <span className="wire"><i></i></span>
                </li>
                <li className="node" data-say="The same local model writes the reply.">
                  <div className="k"><span>Reason</span></div>
                  <h4>Local LLM</h4>
                  <p>The same model that handles text.</p>
                  <div className="sub">LM Studio</div>
                  <span className="wire"><i></i></span>
                </li>
                <li className="node" data-say="Text-to-speech renders the reply as a voice.">
                  <div className="k"><span>Speak</span></div>
                  <h4>Text-to-Speech</h4>
                  <p>Streaming Kokoro TTS synthesis.</p>
                  <span className="wire"><i></i></span>
                </li>
                <li className="node" data-say="You hear the answer through your speakers.">
                  <div className="k"><span>Output</span></div>
                  <h4>Audio Response</h4>
                  <p>Played back gaplessly through speakers.</p>
                  <span className="wire"><i></i></span>
                </li>
              </ol>
              <p className="say" id="sayVoice" aria-live="polite">{sayVoiceText}</p>
            </div>
            <p className="arch-note rv">Component names describe the intended design. Speech engines and the model are configurable, and Phases 3 to 5 are not yet built.</p>
          </div>
        </section>

        {/* PRIVACY AND SECURITY */}
        <section className="section" id="privacy" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="eyebrow rv">Privacy and security</div>
            <h2 className="h2 rv">You stay in the loop.</h2>
            <div className="priv-head rv">
              <div>
                <h3>Local-first AI processing</h3>
                <p>Ruan is built around a model on your own machine, so everyday conversations do not need a cloud round trip.</p>
              </div>
              <div>
                <h3>User-controlled computer actions</h3>
                <p>You choose which folders and applications Ruan can reach, and you can change that at any time.</p>
              </div>
              <div>
                <h3>Secure handling of conversations</h3>
                <p>History and memory are designed to be stored locally, in a form you can inspect and remove.</p>
              </div>
              <div>
                <h3>Permission-based execution</h3>
                <p>Sensitive operations pause for approval and show what they will do before anything happens.</p>
              </div>
            </div>

            <div className="tiers-label rv">
              <span className="mono">Permission tiers · design intent</span>
              <span className="mono">The more it can change, the more often it asks</span>
            </div>

            <div className="tiers rv">
              <div className="tier" style={{ '--t': 0 }}>
                <span className="chip">Never asks</span>
                <h3>Talk</h3>
                <p>Chat and answer questions. No access to your files or apps.</p>
              </div>
              <div className="tier" style={{ '--t': 1 }}>
                <span className="chip">Once per folder</span>
                <h3>Look</h3>
                <p>Read files in folders you chose. Nothing is written or moved.</p>
              </div>
              <div className="tier" style={{ '--t': 2 }}>
                <span className="chip">Before each batch</span>
                <h3>Change</h3>
                <p>Create, rename or edit files, with the plan shown first.</p>
              </div>
              <div className="tier" style={{ '--t': 3 }}>
                <span className="chip dev"><i></i>Every time</span>
                <h3>Act</h3>
                <p>Launch applications or run system-level actions after explicit approval.</p>
              </div>
            </div>

            <div className="caveat rv">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: '2px' }} aria-hidden="true">
                <circle cx="12" cy="12" r="9" /><path d="M12 8v4m0 4h.01" />
              </svg>
              <p><b>What local-first does and does not mean.</b> Ruan keeps its own processing on your machine. How private your setup is also depends on what you configure around it, such as the model you load in LM Studio and any external service you choose to connect.</p>
            </div>
          </div>
        </section>

        {/* DOCUMENTATION */}
        <section className="section" id="docs" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="eyebrow rv">Documentation</div>
            <h2 className="h2 rv">Everything you need to run it.</h2>
            <p className="lead rv">Guides are written alongside the code. Each page below lands with the phase it belongs to.</p>
            <div className="docs-grid">
              <div className="rv">
                <div className="doc-row"><span className="p">/01</span><div><h3>Getting Started</h3><p>What Ruan is and how to reach your first reply.</p></div><span className="chip dev"><i></i>Active</span></div>
                <div className="doc-row"><span className="p">/02</span><div><h3>Installation</h3><p>Node, LM Studio and the backend on your machine.</p></div><span className="chip dev"><i></i>Active</span></div>
                <div className="doc-row"><span className="p">/03</span><div><h3>Configuration</h3><p>Model endpoint, ports and environment settings.</p></div><span className="chip dev"><i></i>Active</span></div>
                <div className="doc-row"><span className="p">/04</span><div><h3>Architecture</h3><p>Layers, data flow and extension points.</p></div><span className="chip dev"><i></i>Active</span></div>
                <div className="doc-row"><span className="p">/05</span><div><h3>Voice Setup</h3><p>faster-whisper STT and streaming Kokoro TTS.</p></div><span className="chip dev"><i></i>Active</span></div>
                <div className="doc-row"><span className="p">/06</span><div><h3>Development Guide</h3><p>Project layout, conventions and how to contribute.</p></div><span className="chip plan">Planned</span></div>
                <div className="doc-row"><span className="p">/07</span><div><h3>API Reference</h3><p>Backend routes, streaming format and events.</p></div><span className="chip plan">Planned</span></div>
              </div>

              <div className="term rv">
                <div className="term-bar" role="tablist" aria-label="Quick start examples">
                  <button
                    className="tab"
                    role="tab"
                    id="tab-install"
                    aria-selected={activeTab === 'install'}
                    aria-controls="pane-install"
                    type="button"
                    onClick={() => setActiveTab('install')}
                  >
                    Install
                  </button>
                  <button
                    className="tab"
                    role="tab"
                    id="tab-config"
                    aria-selected={activeTab === 'config'}
                    aria-controls="pane-config"
                    type="button"
                    onClick={() => setActiveTab('config')}
                  >
                    Configure
                  </button>
                  <button
                    className="tab"
                    role="tab"
                    id="tab-voice"
                    aria-selected={activeTab === 'voice'}
                    aria-controls="pane-voice"
                    type="button"
                    onClick={() => setActiveTab('voice')}
                  >
                    Voice
                  </button>
                </div>

                {activeTab === 'install' && (
                  <pre id="pane-install" role="tabpanel" aria-labelledby="tab-install">
                    <span className="c"># 1. Start local server in LM Studio</span>{'\n'}
                    <span className="c">#    Default address: http://localhost:1234/v1</span>{'\n\n'}
                    <span className="c"># 2. Clone repository & install</span>{'\n'}
                    <span className="g">$</span> git clone https://github.com/ruhaannarang/Ruan-AI.git{'\n'}
                    <span className="g">$</span> cd Ruan-AI{'\n\n'}
                    <span className="c"># 3. Start Express backend & React client</span>{'\n'}
                    <span className="g">$</span> npm --prefix server start{'\n'}
                    <span className="g">$</span> npm --prefix client run dev
                  </pre>
                )}

                {activeTab === 'config' && (
                  <pre id="pane-config" role="tabpanel" aria-labelledby="tab-config">
                    <span className="c"># server/.env (example)</span>{'\n'}
                    <span className="v">PORT</span>=5000{'\n'}
                    <span className="v">HOST</span>=127.0.0.1{'\n'}
                    <span className="v">LM_STUDIO_BASE_URL</span>=http://localhost:1234/v1{'\n'}
                    <span className="v">LM_STUDIO_MODEL</span>=gemma-4-e2b-it-qat{'\n\n'}
                    <span className="c"># Connect local voice microservice</span>{'\n'}
                    <span className="v">VOICE_SERVICE_URL</span>=http://127.0.0.1:8008
                  </pre>
                )}

                {activeTab === 'voice' && (
                  <pre id="pane-voice" role="tabpanel" aria-labelledby="tab-voice">
                    <span className="c"># Voice setup & pipeline</span>{'\n'}
                    <span className="g">1.</span> Run Python service: <span className="v">python voice-service/app.py</span>{'\n'}
                    <span className="g">2.</span> Faster-whisper handles multilingual Push-to-Talk STT{'\n'}
                    <span className="g">3.</span> SentenceBuffer streams tokens to Kokoro 82M TTS{'\n'}
                    <span className="g">4.</span> AudioQueuePlayer plays speech in real-time (&lt;540ms TTFP)
                  </pre>
                )}

                <div className="term-foot">Active commands and variables for Ruan AI v0.1.0-alpha.7.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ROADMAP SECTION */}
        <section className="section" id="roadmap" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="eyebrow rv">Roadmap</div>
            <h2 className="h2 rv">Six phases, one at a time.</h2>
            <p className="lead rv">Order can shift as the project learns. Phase 1 is actively complete.</p>
            <ol className="road rv">
              <li className="ph now">
                <span className="pt"></span>
                <div className="big">1</div>
                <div className="n">Phase 1</div>
                <h3>Core Foundation &amp; Streaming Voice</h3>
                <p>Chat with local Gemma 4, faster-whisper STT, and streaming Kokoro TTS.</p>
                <span className="chip dev"><i></i>Complete</span>
              </li>
              <li className="ph">
                <span className="pt"></span>
                <div className="big">2</div>
                <div className="n">Phase 2</div>
                <h3>Persistent Memory</h3>
                <p>Local SQLite memory and session threads that carry across conversations.</p>
                <span className="chip plan">Planned</span>
              </li>
              <li className="ph">
                <span className="pt"></span>
                <div className="big">3</div>
                <div className="n">Phase 3</div>
                <h3>Agentic Intelligence</h3>
                <p>Multi-step plans with orchestrated tool use using LangGraph.js.</p>
                <span className="chip plan">Planned</span>
              </li>
              <li className="ph">
                <span className="pt"></span>
                <div className="big">4</div>
                <div className="n">Phase 4</div>
                <h3>Computer Interaction</h3>
                <p>Approved access to local files and system applications.</p>
                <span className="chip plan">Planned</span>
              </li>
              <li className="ph">
                <span className="pt"></span>
                <div className="big">5</div>
                <div className="n">Phase 5</div>
                <h3>Desktop Application</h3>
                <p>Electron desktop shell with system tray and global hotkeys.</p>
                <span className="chip plan">Planned</span>
              </li>
              <li className="ph">
                <span className="pt"></span>
                <div className="big">6</div>
                <div className="n">Phase 6</div>
                <h3>Advanced Voice &amp; Autonomy</h3>
                <p>Wake-word ("Hey Ruan"), hands-free dialogue and complex workflows.</p>
                <span className="chip plan">Planned</span>
              </li>
            </ol>
          </div>
        </section>

        {/* CLOSING CTA */}
        <section className="closing">
          <div className="wrap">
            <h2 className="rv">
              <span>Your AI.</span>
              <span className="d">Your Machine.</span>
              <span className="v">Your Rules.</span>
            </h2>
            <div className="cta-row rv">
              <button className="btn primary" type="button" onClick={() => navigateTo('/app')}>
                Launch App
              </button>
              <a className="btn" href="https://github.com/ruhaannarang/Ruan-AI" target="_blank" rel="noopener">
                View on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot">
            <div>
              <a className="brand" href="#top" aria-label="Ruan AI home">
                <svg viewBox="0 0 112 119" aria-hidden="true">
                  <use href="#pw" fill="url(#wg)" />
                  <use href="#pv" fill="url(#vg)" />
                </svg>
                <span className="div"></span>
                <span className="wm">Ruan <b>AI</b></span>
              </a>
              <p>A personal AI operating companion that runs on your machine and answers to you.</p>
            </div>
            <div>
              <h5>Project</h5>
              <ul>
                <li><a href="#about">About</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#roadmap">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h5>Build</h5>
              <ul>
                <li><a href="#docs">Documentation</a></li>
                <li><a href="#architecture">Architecture</a></li>
                <li><a href="https://github.com/ruhaannarang/Ruan-AI" target="_blank" rel="noopener">GitHub</a></li>
              </ul>
            </div>
            <div>
              <h5>Status</h5>
              <ul>
                <li>
                  <button 
                    type="button" 
                    className="chip dev" 
                    style={{ cursor: onOpenDiagnostics ? 'pointer' : 'default', background: 'rgba(139,92,246,.12)', border: '1px solid rgba(139,92,246,.55)', color: 'inherit', font: 'inherit' }}
                    onClick={onOpenDiagnostics}
                    title="Open System Diagnostics"
                  >
                    <i></i>Active Development • Diagnostics
                  </button>
                </li>
                <li style={{ color: 'var(--muted)', fontSize: '13.5px' }}>Phase 1.7 · Streaming Voice Active</li>
              </ul>
            </div>
          </div>
          <div className="legal">
            <span>© 2026 Ruan AI. All rights reserved.</span>
            <span className="mono" style={{ letterSpacing: '.1em' }}>Local-first · Private by design · Open &amp; extensible</span>
          </div>
          <div className="mega" aria-hidden="true">Ruan AI</div>
        </div>
      </footer>
    </div>
  );
}
