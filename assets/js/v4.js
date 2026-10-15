/* Vera Napalkova portfolio v4 */
(() => {
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // language
  const langBtn = $('.lang');
  const setLang = (l) => {
    root.dataset.lang = l; root.lang = l;
    if (langBtn) langBtn.textContent = l === 'en' ? 'RU' : 'EN';
    try { localStorage.setItem('vera-lang', l); } catch (e) {}
    const on = $('.skin-pick [aria-pressed="true"]'); if (on) setSkinName(on);
  };
  langBtn && langBtn.addEventListener('click', () => setLang(root.dataset.lang === 'en' ? 'ru' : 'en'));

  // drawer
  const burger = $('.burger'), drawer = $('.drawer');
  if (burger && drawer) {
    const toggle = (open) => { drawer.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('lock', open); };
    burger.addEventListener('click', () => toggle(!drawer.classList.contains('open')));
    $$('a', drawer).forEach(a => a.addEventListener('click', () => toggle(false)));
  }

  // nav turns solid once the hero is behind us
  const nav = $('.nav'), sentinel = $('.hero');
  if (nav && sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => nav.classList.toggle('solid', !e.isIntersecting), { rootMargin: '-70px 0px 0px 0px', threshold: 0.02 }).observe(sentinel);
  } else if (nav) nav.classList.add('solid');

  // reveal once
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' }) : null;
  $$('.rv, .lineup').forEach(el => io ? io.observe(el) : el.classList.add('in'));

  // start the lineup centred when it scrolls sideways (phones)
  const lu = $('.lineup');
  if (lu && lu.scrollWidth > lu.clientWidth) lu.scrollLeft = (lu.scrollWidth - lu.clientWidth) / 2;

  // fireflies echoing the lily key art
  const flies = $('.flies');
  if (flies && !reduce) {
    for (let i = 0; i < 16; i++) {
      const f = document.createElement('i');
      f.style.left = (35 + Math.random() * 60) + '%';
      f.style.top = (25 + Math.random() * 60) + '%';
      f.style.animationDelay = (Math.random() * 9).toFixed(2) + 's';
      f.style.animationDuration = (7 + Math.random() * 6).toFixed(2) + 's';
      const s = 2 + Math.random() * 4; f.style.width = f.style.height = s + 'px';
      flies.appendChild(f);
    }
  }

  // skin selector
  const nameEl = $('.skin-name');
  function setSkinName(btn) {
    if (!nameEl) return;
    const ru = root.dataset.lang === 'ru';
    nameEl.innerHTML = (ru ? btn.dataset.ru : btn.dataset.en);
  }
  $$('.skin-pick button').forEach(btn => btn.addEventListener('click', () => {
    $$('.skin-pick button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    $$('.stage-fig img').forEach(img => img.classList.toggle('on', img.dataset.skin === btn.dataset.skin));
    setSkinName(btn);
  }));

  // imp view tabs
  $$('.tabs').forEach(tabs => {
    const view = document.getElementById(tabs.dataset.for);
    $$('button', tabs).forEach(btn => btn.addEventListener('click', () => {
      $$('button', tabs).forEach(b => b.setAttribute('aria-selected', String(b === btn)));
      $$('img', view).forEach(img => img.classList.toggle('on', img.dataset.v === btn.dataset.v));
    }));
  });

  // drag to pan
  $$('.pan').forEach(p => {
    let down = false, x0 = 0, s0 = 0, moved = false;
    p.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; x0 = e.clientX; s0 = p.scrollLeft; p.setPointerCapture(e.pointerId); });
    p.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - x0; if (Math.abs(dx) > 4) moved = true; p.scrollLeft = s0 - dx; });
    p.addEventListener('pointerup', () => { down = false; });
    p.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  });

  // lightbox
  const zooms = $$('img[data-zoom]');
  if (zooms.length) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close">×</button><img alt="">';
    document.body.appendChild(lb);
    const big = $('img', lb);
    const close = () => { lb.classList.remove('open'); document.body.classList.remove('lock'); };
    zooms.forEach(img => img.addEventListener('click', () => {
      if (img.closest('.pan') && img.closest('.pan').dataset.dragged === '1') return;
      big.src = img.currentSrc || img.src; big.alt = img.alt;
      lb.classList.add('open'); document.body.classList.add('lock');
    }));
    lb.addEventListener('click', e => { if (e.target !== big) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  $$('[data-year]').forEach(n => n.textContent = new Date().getFullYear());
  setLang(root.dataset.lang || 'en');
})();
