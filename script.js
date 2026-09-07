// Shared capability flags, used across several of the enhancements below.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsHover = window.matchMedia('(hover: hover)').matches;

  const header = document.getElementById('siteHeader');
  const scrollProgress = document.getElementById('scrollProgress');
  let scrollTicking = false;
  function updateOnScroll() {
    header.classList.toggle('scrolled', window.scrollY > 40);
    if (scrollProgress) {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const ratio = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
      scrollProgress.style.transform = `scaleX(${ratio})`;
    }
    scrollTicking = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      requestAnimationFrame(updateOnScroll);
      scrollTicking = true;
    }
  }, { passive: true });
  updateOnScroll();

  // Scroll-spy: highlight the nav link for whichever section is currently in view
  const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const spySections = navLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  if (navLinks.length && spySections.length && 'IntersectionObserver' in window) {
    const spyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const link = navLinks.find(a => a.getAttribute('href') === `#${entry.target.id}`);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach(a => a.classList.remove('active'));
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    spySections.forEach(sec => spyObserver.observe(sec));
  }

  const burger = document.getElementById('burgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');
  burger.addEventListener('click', () => mobileMenu.classList.add('open'));
  mobileClose.addEventListener('click', () => mobileMenu.classList.remove('open'));
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    if(item.classList.contains('open')){ a.style.maxHeight = a.scrollHeight + 'px'; }
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => { i.classList.remove('open'); i.querySelector('.faq-a').style.maxHeight = 0; });
      if(!isOpen){ item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
    });
  });

  const copyBtn = document.querySelector('.copy-btn');
  if(copyBtn){
    copyBtn.addEventListener('click', () => {
      const email = copyBtn.getAttribute('data-copy');
      const label = copyBtn.querySelector('.copy-label');
      const finishCopy = () => {
        copyBtn.classList.add('copied');
        label.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          label.textContent = 'Copy';
        }, 2000);
      };
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(email).then(finishCopy).catch(() => {
          const temp = document.createElement('textarea');
          temp.value = email;
          document.body.appendChild(temp);
          temp.select();
          document.execCommand('copy');
          document.body.removeChild(temp);
          finishCopy();
        });
      } else {
        const temp = document.createElement('textarea');
        temp.value = email;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        finishCopy();
      }
    });
  }

  // Scroll-reveal fade-in (single elements) + staggered entrance (card/grid groups)
  // + clip-path wipe reveal (photography, observed via an unclipped wrapper — see
  // the .img-reveal-trigger comment in style.css for why) — all share one trigger.
  const revealEls = document.querySelectorAll('.reveal-on-scroll, .reveal-stagger, .img-reveal-trigger');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // Count-up animation for the about-section stat numbers (25+, 2, 1).
  // Falls back to the static number already in the markup for no-JS/no-IO and
  // jumps straight to the final value under reduced-motion.
  const countEls = document.querySelectorAll('.num[data-count]');
  if (countEls.length) {
    const animateCount = (el) => {
      const target = parseInt(el.getAttribute('data-count'), 10);
      const suffix = el.getAttribute('data-suffix') || '';
      if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        el.textContent = target + suffix;
        return;
      }
      const duration = 1200;
      const start = performance.now();
      const easeOutQuad = t => t * (2 - t);
      const step = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const value = Math.round(target * easeOutQuad(progress));
        el.textContent = value + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      const countObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      countEls.forEach(el => countObserver.observe(el));
    }
  }

  // Word-level headline reveal. Splits a heading's existing DOM content into
  // per-word spans at runtime (no HTML source changes — inline elements like
  // <em>/<br> are preserved as single units), then fades/rises each word in
  // on scroll. Skipped entirely under reduced-motion, leaving the heading as
  // plain static text.
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const splitWords = (el) => {
      const nodes = Array.from(el.childNodes);
      el.textContent = '';
      let wordIndex = 0;
      nodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const parts = node.textContent.split(/(\s+)/);
          parts.forEach((part) => {
            if (part.trim() === '') {
              el.appendChild(document.createTextNode(part));
              return;
            }
            const outer = document.createElement('span');
            outer.className = 'word';
            outer.style.transitionDelay = `${Math.min(wordIndex, 14) * 35}ms`;
            const inner = document.createElement('span');
            inner.className = 'word-inner';
            inner.textContent = part;
            outer.appendChild(inner);
            el.appendChild(outer);
            wordIndex++;
          });
        } else if (node.nodeName === 'BR') {
          el.appendChild(node.cloneNode());
        } else {
          const outer = document.createElement('span');
          outer.className = 'word';
          outer.style.transitionDelay = `${Math.min(wordIndex, 14) * 35}ms`;
          const inner = document.createElement('span');
          inner.className = 'word-inner';
          inner.appendChild(node.cloneNode(true));
          outer.appendChild(inner);
          el.appendChild(outer);
          wordIndex++;
        }
      });
    };

    const headlineEls = document.querySelectorAll('.hero h1, .kicker-block h2, .about-copy h2, .cta-banner h2');
    if (headlineEls.length) {
      const headlineObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            headlineObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      headlineEls.forEach((el) => {
        splitWords(el);
        el.classList.add('split-heading');
        headlineObserver.observe(el);
      });
    }
  }

  // Subtle 3D tilt on grid cards, tracking the pointer. Desktop/hover only;
  // reduced-motion and touch devices keep the plain CSS lift-on-hover instead.
  if (!prefersReducedMotion && supportsHover) {
    const tiltCards = document.querySelectorAll('.offer-card, .framework-item');
    tiltCards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        const rotateX = (-py * 8).toFixed(2);
        const rotateY = (px * 8).toFixed(2);
        card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // Subtle magnetic pull on the hero's primary CTA only — one focal element, not a
  // page-wide effect. Skipped entirely for touch (no hover) and reduced-motion users.
  const magneticCta = document.querySelector('.hero-cta-glow');
  if (magneticCta && !prefersReducedMotion && supportsHover) {
    // Note: this sets an inline transform, which takes over from the CSS
    // .btn-gold:hover translateY(-2px) lift for this element — so the -2px
    // lift is folded into the y offset here to keep that feel while hovered.
    magneticCta.addEventListener('mousemove', (e) => {
      const r = magneticCta.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.25;
      const y = (e.clientY - r.top - r.height / 2) * 0.25 - 2;
      magneticCta.style.transform = `translate(${x}px, ${y}px)`;
    });
    magneticCta.addEventListener('mouseleave', () => {
      magneticCta.style.transform = '';
    });
  }
