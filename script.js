(() => {
  'use strict';

  // اگر کاربر حرکت کم را خواسته، هیچ انیمیشنی اجرا نشود
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  /*  تنظیمات  */
  const CONFIG = {
    header: 'header',
    hero: '#home',
    heroImage: '#home > img',
    revealGroups: [
      'main section:not(#home) > h2',
      '#menu > h3',
      '#menu article',
      '#popular article',
      '#about article',
      '#reviews article',
      '#contact > p, #contact > address, #contact form',
      'footer',
    ],
    tiltCards: '#popular article',
    navLinks: 'header ul a[href^="#"]',
    revealStagger: 120, // فاصله‌ی زمانی بین عناصر هم‌ردیف (میلی‌ثانیه)
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /*  ۱. ظاهر شدن نرم با اسکرول (هر بار که دوباره وارد صفحه شود)  */
  function initReveal() {
    const seen = new Set();
    const targets = [];

    CONFIG.revealGroups.forEach((sel) => {
      $$(sel).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        el.classList.add('js-reveal');
        targets.push(el);
      });
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;

          if (entry.isIntersecting) {
            // تأخیر پلکانی بر اساس جای عنصر بین هم‌ردیف‌هایش
            const siblings = [...el.parentElement.children].filter((c) =>
              c.classList.contains('js-reveal')
            );
            const index = Math.max(0, siblings.indexOf(el));
            el.style.setProperty(
              '--reveal-delay',
              `${(index % 4) * CONFIG.revealStagger}ms`
            );
            el.classList.add('is-visible');
          } else if (entry.boundingClientRect.top > 0) {
            // از پایین صفحه خارج شده (کاربر به بالا اسکرول کرده): ریست برای دفعه‌ی بعد
            el.classList.remove('is-visible');
            el.style.setProperty('--reveal-delay', '0ms');
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px -10% 0px' }
    );

    targets.forEach((el) => io.observe(el));
  }

  /*  ۲. هدر: سایه با اسکرول + مخفی/ظاهر شدن  */
  function initHeader() {
    const header = $(CONFIG.header);
    if (!header) return;

    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 40);
      // پایین رفتن: مخفی، بالا آمدن: نمایش
      const goingDown = y > lastY && y > 200;
      header.classList.toggle('is-hidden', goingDown);
      lastY = y;
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  /*  ۳. پارالاکس ملایم عکس اصلی (اسکرول + حرکت موس)  */
  function initHeroParallax() {
    const hero = $(CONFIG.hero);
    const img = $(CONFIG.heroImage);
    if (!hero || !img) return;

    let scrollOffset = 0;
    let mx = 0;
    let my = 0;
    let raf = null;

    const render = () => {
      img.style.transform =
        `translate3d(${mx * 14}px, ${scrollOffset + my * 14}px, 0)`;
      raf = null;
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(render); };

    window.addEventListener(
      'scroll',
      () => {
        const rect = hero.getBoundingClientRect();
        if (rect.bottom < 0) return;
        scrollOffset = Math.min(window.scrollY * 0.08, 40);
        schedule();
      },
      { passive: true }
    );

    // حرکت موس فقط روی دستگاه‌هایی که موس دارند
    if (window.matchMedia('(hover: hover)').matches) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width - 0.5;
        my = (e.clientY - r.top) / r.height - 0.5;
        schedule();
      });
      hero.addEventListener('pointerleave', () => { mx = my = 0; schedule(); });
    }
  }

  /*  ۴. کج شدن سه‌بعدی کارت‌های محبوب‌ترین‌ها زیر موس  */
  function initTilt() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    $$(CONFIG.tiltCards).forEach((card) => {
      card.classList.add('js-tilt');

      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', `${x * 8}deg`);
        card.style.setProperty('--rx', `${-y * 8}deg`);
      });

      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ۵. هایلایت لینک منو بر اساس بخشی که دیده می‌شود */
  function initScrollSpy() {
    const links = $$(CONFIG.navLinks);
    if (!links.length) return;

    const map = new Map();
    links.forEach((a) => {
      const target = $(a.getAttribute('href'));
      if (target) map.set(target, a);
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((l) => l.classList.remove('is-active'));
          map.get(entry.target)?.classList.add('is-active');
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );

    map.forEach((_, section) => io.observe(section));
  }

  /*اجرا*/
  const start = () => {
    initReveal();
    initHeader();
    initHeroParallax();
    initTilt();
    initScrollSpy();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();