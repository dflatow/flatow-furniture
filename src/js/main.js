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

  initPhotoUpload(form);

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

/* --- Photo Upload: client-side compression + previews + remove --- */
function initPhotoUpload(form) {
  const fileInput = document.getElementById('f-photos');
  const previewContainer = document.getElementById('photos-preview');
  const fileHint = document.getElementById('photos-hint');
  if (!fileInput || !previewContainer || !fileHint) return;

  const MAX_DIMENSION = 1800;
  const QUALITY = 0.85;
  const MAX_TOTAL_BYTES = 8 * 1024 * 1024;

  let selectedFiles = [];
  let previewUrls = new WeakMap();

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  async function compressImage(file) {
    if (!file.type.startsWith('image/')) return file;
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (e) {
      return file;
    }
    const { width: w0, height: h0 } = bitmap;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(w0, h0));
    if (scale === 1 && file.size < 600 * 1024) {
      bitmap.close?.();
      return file;
    }
    const width = Math.round(w0 * scale);
    const height = Math.round(h0 * scale);
    let canvas;
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
    } else {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = canvas.convertToBlob
      ? await canvas.convertToBlob({ type: 'image/jpeg', quality: QUALITY })
      : await new Promise(r => canvas.toBlob(r, 'image/jpeg', QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const newName = file.name.replace(/\.[^.]+$/, '.jpg');
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
  }

  function syncInput() {
    const dt = new DataTransfer();
    selectedFiles.forEach(f => dt.items.add(f));
    fileInput.files = dt.files;
  }

  function totalBytes() {
    return selectedFiles.reduce((s, f) => s + f.size, 0);
  }

  function updateHint() {
    const total = totalBytes();
    if (selectedFiles.length === 0) {
      fileHint.textContent = '';
      fileHint.classList.remove('error');
      fileInput.setCustomValidity('');
      return;
    }
    if (total > MAX_TOTAL_BYTES) {
      fileHint.textContent = `${selectedFiles.length} photo${selectedFiles.length === 1 ? '' : 's'} · ${formatSize(total)} total. That's over the 8 MB submission limit — please remove a few or email the rest to inquire@flatow.furniture.`;
      fileHint.classList.add('error');
      fileInput.setCustomValidity('Total file size exceeds 8 MB');
    } else {
      fileHint.textContent = `${selectedFiles.length} photo${selectedFiles.length === 1 ? '' : 's'} · ${formatSize(total)} total.`;
      fileHint.classList.remove('error');
      fileInput.setCustomValidity('');
    }
  }

  function renderPreviews() {
    previewContainer.innerHTML = '';
    selectedFiles.forEach((file, index) => {
      let url = previewUrls.get(file);
      if (!url) {
        url = URL.createObjectURL(file);
        previewUrls.set(file, url);
      }
      const item = document.createElement('div');
      item.className = 'photo-preview';
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.loading = 'lazy';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'photo-preview-remove';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        URL.revokeObjectURL(url);
        previewUrls.delete(file);
        selectedFiles.splice(index, 1);
        syncInput();
        renderPreviews();
        updateHint();
      });
      const meta = document.createElement('span');
      meta.className = 'photo-preview-meta';
      meta.textContent = formatSize(file.size);
      item.appendChild(img);
      item.appendChild(remove);
      item.appendChild(meta);
      previewContainer.appendChild(item);
    });
  }

  fileInput.addEventListener('change', async () => {
    const incoming = Array.from(fileInput.files);
    if (incoming.length === 0) return;
    fileHint.textContent = `Resizing ${incoming.length} photo${incoming.length === 1 ? '' : 's'}…`;
    fileHint.classList.remove('error');
    let processed;
    try {
      processed = await Promise.all(incoming.map(compressImage));
    } catch (e) {
      processed = incoming;
    }
    selectedFiles = selectedFiles.concat(processed);
    syncInput();
    renderPreviews();
    updateHint();
  });
}
