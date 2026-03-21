/* ========================================
   Flatow Furniture — Main JS
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initGalleryCarousels();
  initReviewsCarousel();
  initSmoothScrollNav();
});

/* --- Mobile Menu --- */
function initMobileMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');

  if (!toggle || !mobileNav) return;

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', !isOpen);
    mobileNav.classList.toggle('open');
    document.body.classList.toggle('menu-open');
  });

  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      mobileNav.classList.remove('open');
      document.body.classList.remove('menu-open');
    });
  });
}

/* --- Gallery Carousels (mobile single-slide mode) --- */
function initGalleryCarousels() {
  /* Preload all carousel images once the carousel scrolls into view */
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('img[loading="lazy"]').forEach(img => {
            img.removeAttribute('loading');
          });
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '200px' });

    document.querySelectorAll('[data-carousel]').forEach(c => observer.observe(c));
  }

  document.querySelectorAll('[data-carousel]').forEach(carousel => {
    const slides = carousel.querySelectorAll('.carousel-slide');
    const prevBtn = carousel.querySelector('.carousel-btn.prev');
    const nextBtn = carousel.querySelector('.carousel-btn.next');
    const counter = carousel.querySelector('.carousel-counter');
    let current = 0;

    function updateSlides() {
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === current);
      });
      if (counter) {
        counter.textContent = `Item ${current + 1} of ${slides.length}`;
      }
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        current = (current - 1 + slides.length) % slides.length;
        updateSlides();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        current = (current + 1) % slides.length;
        updateSlides();
      });
    }
  });
}

/* --- Reviews Carousel --- */
function initReviewsCarousel() {
  const container = document.querySelector('[data-reviews]');
  if (!container) return;

  const reviews = container.querySelectorAll('[data-review]');
  const dots = container.querySelectorAll('.dot');
  const prevBtn = container.querySelector('.carousel-btn.prev');
  const nextBtn = container.querySelector('.carousel-btn.next');
  let current = 0;

  function showReview(index) {
    current = (index + reviews.length) % reviews.length;
    reviews.forEach((r, i) => r.classList.toggle('active', i === current));
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  if (prevBtn) prevBtn.addEventListener('click', () => showReview(current - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => showReview(current + 1));

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      showReview(parseInt(dot.dataset.index, 10));
    });
  });
}

/* --- Smooth Scroll for Nav Links --- */
function initSmoothScrollNav() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}
