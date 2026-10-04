/* Vera Napalkova — exhibition shell: preloader, cursor, audio, reveals, language. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer:fine)').matches;

  /* ---------- language ---------- */
  const getLang = () => { try { return localStorage.getItem('vera-lang'); } catch (e) { return null; } };
  const setLang = l => {
    root.setAttribute('data-lang', l); root.setAttribute('lang', l);
    document.querySelectorAll('.lang-btn').forEach(b => b.textContent = l === 'en' ? 'RU' : 'EN');
    try { localStorage.setItem('vera-lang', l); } catch (e) {}
    document.dispatchEvent(new CustomEvent('gl:remeasure'));
  };
  const urlLang = new URLSearchParams(location.search).get('lang');
  setLang(urlLang === 'ru' || urlLang === 'en' ? urlLang : (getLang() || 'en'));
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.addEventListener('click', () => setLang(root.getAttribute('data-lang') === 'en' ? 'ru' : 'en')));

  /* ---------- audio ---------- */
  const Audio_ = {
    on: false, ctx: null, amb: null, gain: null, buf: {},
    async init() {
      if (this.ctx) return;
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.gain = this.ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(this.ctx.destination);
      const load = async (n, f) => {
        try {
          const r = await fetch(`assets/audio/${f}.mp3`);
          this.buf[n] = await this.ctx.decodeAudioData(await r.arrayBuffer());
        } catch (e) {}
      };
      await Promise.all([load('amb', 'amb'), load('tick', 'tick'), load('whoosh', 'whoosh'), load('enter', 'enter')]);
      if (this.buf.amb) {
        this.amb = this.ctx.createBufferSource();
        this.amb.buffer = this.buf.amb; this.amb.loop = true;
        this.amb.connect(this.gain); this.amb.start();
      }
    },
    play(n, vol = 1) {
      if (!this.on || !this.ctx || !this.buf[n]) return;
      const s = this.ctx.createBufferSource(); s.buffer = this.buf[n];
      s.playbackRate.value = 0.88 + Math.random() * 0.24;      // never the same twice
      const g = this.ctx.createGain(); g.gain.value = vol * (0.7 + Math.random() * 0.3);
      s.connect(g); g.connect(this.ctx.destination); s.start();
    },
    async toggle(force) {
      await this.init();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.on = force !== undefined ? force : !this.on;
      const g = this.gain.gain, t = this.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(this.on ? 0.3 : 0, t + 0.8);
      document.querySelectorAll('[data-sound-label]').forEach(e => e.textContent = this.on ? 'SOUND ON' : 'MUTED');
      document.querySelector('.sound')?.classList.toggle('is-on', this.on);
    }
  };
  document.querySelector('.sound')?.addEventListener('click', () => Audio_.toggle());
  document.addEventListener('ui:tick', () => Audio_.play('tick', 0.5));

  /* running timecode next to the sound toggle */
  const tc = document.querySelector('[data-timecode]');
  if (tc) {
    const t0 = Date.now();
    setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      tc.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}:${String(Math.floor((s * 25) % 25)).padStart(2, '0')}`;
    }, 40);
  }

  /* ---------- preloader ---------- */
  const pre = document.querySelector('.preloader');
  if (pre) {
    const num = pre.querySelector('[data-count]');
    const bar = pre.querySelector('.pre-bar span');
    const imgs = [...document.images];
    let done = 0;
    const total = Math.max(imgs.length, 1) + 6;             // + gl textures
    let shown = 0;
    const bump = () => { done++; };
    imgs.forEach(i => i.complete ? bump() : (i.addEventListener('load', bump), i.addEventListener('error', bump)));
    document.addEventListener('gl:asset', bump);
    const started = performance.now();
    let finished = false;
    const markReady = () => {
      if (finished) return;
      finished = true;
      shown = 1;
      if (num) num.textContent = '100';
      if (bar) bar.style.transform = 'scaleX(1)';
      pre.classList.add('is-ready');
    };
    const tick = () => {
      if (finished) return;
      const real = Math.min(1, done / total);
      // time-driven so a throttled rAF can never stall the counter
      const timed = Math.min(1, (performance.now() - started) / 1800);
      shown = Math.max(shown, Math.max(timed * 0.92, (real + timed) / 2));
      if (num) num.textContent = String(Math.round(shown * 100)).padStart(3, '0');
      if (bar) bar.style.transform = `scaleX(${shown})`;
      if (shown >= 0.999) { markReady(); return; }
      requestAnimationFrame(tick);
    };
    tick();
    setTimeout(markReady, 3200);              // backstop if rAF is throttled
    const enter = pre.querySelector('.pre-enter');
    const go = (withSound) => {
      pre.classList.add('is-gone');
      root.classList.remove('is-locked');
      setTimeout(() => { pre.remove(); document.dispatchEvent(new CustomEvent('gl:remeasure')); }, 1100);
      // audio loads in the background — entering never waits on it
      if (withSound) Audio_.toggle(true).then(() => Audio_.play('enter', 0.9)).catch(() => {});
    };
    root.classList.add('is-locked');
    enter?.addEventListener('click', () => go(true));
    pre.querySelector('.pre-silent')?.addEventListener('click', () => go(false));
  } else {
    root.classList.remove('is-locked');
  }

  /* ---------- custom cursor ---------- */
  if (fine && !reduce) {
    const cur = document.createElement('div');
    cur.className = 'cursor'; cur.innerHTML = '<span class="cursor-dot"></span><span class="cursor-ring"></span><span class="cursor-label"></span>';
    document.body.appendChild(cur);
    const dot = cur.querySelector('.cursor-dot'), ring = cur.querySelector('.cursor-ring'), label = cur.querySelector('.cursor-label');
    let mx = innerWidth / 2, my = innerHeight / 2, dx = mx, dy = my, rx = mx, ry = my;
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });
    (function loop() {
      dx += (mx - dx) * 0.55; dy += (my - dy) * 0.55;
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      dot.style.transform = `translate3d(${dx}px,${dy}px,0)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      label.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      requestAnimationFrame(loop);
    })();
    const setState = (s, text) => { cur.dataset.state = s || ''; label.textContent = text || ''; };
    document.querySelectorAll('a,button,[data-cursor]').forEach(el => {
      el.addEventListener('pointerenter', () => setState(el.dataset.cursor ? 'label' : 'link', el.dataset.cursor || ''));
      el.addEventListener('pointerleave', () => setState(''));
    });
  }

  /* ---------- scroll reveals ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(e => e.classList.add('in-view'));
  } else {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
    }), { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(e => io.observe(e));
  }

  /* ---------- nav ---------- */
  const nav = document.querySelector('.site-nav');
  const onScroll = () => nav?.classList.toggle('scrolled', scrollY > 40);
  onScroll(); addEventListener('scroll', onScroll, { passive: true });

  const mb = document.querySelector('.menu-btn'), mm = document.querySelector('.mobile-menu');
  if (mb && mm) {
    const close = () => { mm.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); document.body.classList.remove('no-scroll'); };
    mb.addEventListener('click', () => {
      const open = mm.classList.toggle('open');
      mb.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('no-scroll', open);
      Audio_.play('whoosh', 0.5);
    });
    mm.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  }

  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (!id || id === '#') return;
    const t = document.querySelector(id); if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }));

  /* ---------- leaving to a case page ---------- */
  const veil = document.querySelector('.veil');
  if (veil && !reduce) {
    document.querySelectorAll('a[href$=".html"]').forEach(a => {
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      a.addEventListener('click', e => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        Audio_.play('whoosh', 0.8);
        veil.classList.add('is-on');
        setTimeout(() => location.href = a.href, 620);
      });
    });
    addEventListener('pageshow', ev => { if (ev.persisted) veil.classList.remove('is-on'); });
  }

  const y = document.querySelector('[data-year]'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- lightbox for plain images ---------- */
  const zoomables = document.querySelectorAll('[data-zoom]');
  if (zoomables.length) {
    const box = document.createElement('div');
    box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<button class="lightbox-close" aria-label="Close">×</button><img alt="">';
    document.body.appendChild(box);
    const bi = box.querySelector('img');
    const close = () => { box.classList.remove('open'); document.body.classList.remove('no-scroll'); };
    zoomables.forEach(img => img.addEventListener('click', () => {
      bi.src = img.currentSrc || img.src; bi.alt = img.alt || '';
      box.classList.add('open'); document.body.classList.add('no-scroll');
    }));
    box.addEventListener('click', e => { if (e.target === box || e.target.closest('.lightbox-close')) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
})();
