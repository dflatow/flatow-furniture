/* ========================================
   Flatow Furniture — Main JS
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initGalleryCarousels();
  initReviewsCarousel();
  initSmoothScrollNav();
  initEmailLinkTracking();
  initInquiryForm();
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

/* --- Email Link Tracking --- */
function initEmailLinkTracking() {
  const links = document.querySelectorAll('a[href^="mailto:inquire@flatow.furniture"]');
  links.forEach(link => {
    link.addEventListener('click', () => {
      if (typeof gtag !== 'function') return;
      gtag('event', 'email_link_click', {
        link_url: 'mailto:inquire@flatow.furniture',
        link_location: getLinkLocation(link),
        page_path: location.pathname
      });
    });
  });
}

function getLinkLocation(link) {
  if (link.dataset.linkLocation) return link.dataset.linkLocation;
  if (link.closest('.cta-section')) return 'design-cta';
  if (link.closest('.contact-email')) return 'contact-page';
  if (link.closest('.about-text')) return 'about-page';
  if (link.closest('.article-body')) return 'article-body';
  if (link.closest('.faq-answer')) return 'faq-answer';
  if (link.closest('.footer-contact')) return 'footer';
  if (link.closest('footer')) return 'footer';
  return 'body';
}

/* --- Inquiry Form --- */
function initInquiryForm() {
  const form = document.getElementById('inquiry-form');
  if (!form) return;

  let started = false;
  form.addEventListener('focusin', () => {
    if (started) return;
    started = true;
    if (typeof gtag !== 'function') return;
    gtag('event', 'form_start', {
      form_id: 'inquiry-form',
      form_name: 'inquiry',
      form_destination: 'https://flatowfurniture.com/inquiry/thanks/'
    });
  });

  const fileInput = document.getElementById('f-photos');
  const fileHint = document.getElementById('photos-hint');
  const MAX_BYTES = 8 * 1024 * 1024;
  if (fileInput && fileHint) {
    fileInput.addEventListener('change', () => {
      const total = Array.from(fileInput.files).reduce((sum, f) => sum + f.size, 0);
      if (total > MAX_BYTES) {
        const mb = (total / 1024 / 1024).toFixed(1);
        fileHint.textContent = `Total size is ${mb} MB. The limit is 8 MB — please remove or compress some images, or email them to inquire@flatow.furniture instead.`;
        fileHint.classList.add('error');
        fileInput.setCustomValidity('Total file size exceeds 8 MB');
      } else if (total > 0) {
        const mb = (total / 1024 / 1024).toFixed(1);
        fileHint.textContent = `${fileInput.files.length} file${fileInput.files.length === 1 ? '' : 's'} selected, ${mb} MB total.`;
        fileHint.classList.remove('error');
        fileInput.setCustomValidity('');
      } else {
        fileHint.textContent = '';
        fileHint.classList.remove('error');
        fileInput.setCustomValidity('');
      }
    });
  }

  form.addEventListener('submit', () => {
    if (typeof gtag !== 'function') return;
    const projectType = form.querySelector('[name="project_type"]')?.value || '';
    gtag('event', 'form_submit', {
      form_id: 'inquiry-form',
      form_name: 'inquiry',
      form_destination: 'https://flatowfurniture.com/inquiry/thanks/',
      project_type: projectType
    });
  });
}
