(() => {
  const root = document.documentElement;
  const nav = document.querySelector('.site-nav');
  const menuBtn = document.querySelector('.menu-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Language: EN by default, RU remembered per visitor.
  const getLang = () => { try { return localStorage.getItem('vera-lang'); } catch (e) { return null; } };
  const setLang = (l) => {
    root.setAttribute('data-lang', l);
    root.setAttribute('lang', l);
    document.querySelectorAll('.lang-btn').forEach(b => b.textContent = l === 'en' ? 'RU' : 'EN');
    try { localStorage.setItem('vera-lang', l); } catch (e) {}
  };
  const urlLang = new URLSearchParams(location.search).get('lang');
  setLang(urlLang === 'ru' || urlLang === 'en' ? urlLang : (getLang() || 'en'));
  document.querySelectorAll('.lang-btn').forEach(b => b.addEventListener('click', () => {
    setLang(root.getAttribute('data-lang') === 'en' ? 'ru' : 'en');
  }));

  const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (menuBtn && mobileMenu) {
    const close = () => {
      mobileMenu.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
    };
    menuBtn.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('no-scroll', open);
    });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  }

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  const reveals = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('in-view'));
  } else {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('in-view'); obs.unobserve(entry.target); }
      });
    }, { threshold: .1, rootMargin: '0px 0px -5% 0px' });
    reveals.forEach(el => obs.observe(el));
  }

  // Lightbox for any image marked data-zoom.
  const zoomables = document.querySelectorAll('[data-zoom]');
  if (zoomables.length) {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<button class="lightbox-close" aria-label="Close">×</button><img alt="">';
    document.body.appendChild(box);
    const boxImg = box.querySelector('img');
    const close = () => { box.classList.remove('open'); document.body.classList.remove('no-scroll'); };
    zoomables.forEach(img => img.addEventListener('click', () => {
      boxImg.src = img.currentSrc || img.src;
      boxImg.alt = img.alt || '';
      box.classList.add('open');
      document.body.classList.add('no-scroll');
    }));
    box.addEventListener('click', e => { if (e.target === box || e.target.closest('.lightbox-close')) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
