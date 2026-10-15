/* Vera Napalkova portfolio: language, menu, lightbox, reveal-once */
(() => {
  const root = document.documentElement;

  // language
  const langBtn = document.querySelector('.lang-btn');
  const setLang = (l) => {
    root.setAttribute('data-lang', l);
    root.lang = l;
    if (langBtn) langBtn.textContent = l === 'en' ? 'RU' : 'EN';
    try { localStorage.setItem('vera-lang', l); } catch (e) {}
  };
  setLang(root.getAttribute('data-lang') || 'en');
  langBtn && langBtn.addEventListener('click', () => setLang(root.getAttribute('data-lang') === 'en' ? 'ru' : 'en'));

  // mobile menu
  const menuBtn = document.querySelector('.menu-btn');
  const menu = document.querySelector('.mobile-menu');
  const closeMenu = () => { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('no-scroll'); };
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => {
      const open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('no-scroll', open);
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  }

  // quiet fade-in
  const els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  } else els.forEach(el => el.classList.add('in-view'));

  // lightbox
  const zooms = document.querySelectorAll('img[data-zoom]');
  if (zooms.length) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close">×</button><img alt="">';
    document.body.appendChild(lb);
    const big = lb.querySelector('img');
    const close = () => { lb.classList.remove('open'); document.body.classList.remove('no-scroll'); };
    zooms.forEach(img => img.addEventListener('click', () => {
      big.src = img.currentSrc || img.src; big.alt = img.alt;
      lb.classList.add('open'); document.body.classList.add('no-scroll');
    }));
    lb.addEventListener('click', (e) => { if (e.target !== big) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  // year
  document.querySelectorAll('[data-year]').forEach(n => n.textContent = new Date().getFullYear());
})();
