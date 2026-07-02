/* ========================================
   Flatow Furniture — Main JS
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initGalleryCarousels();
  initReviewsCarousel();
  initSmoothScrollNav();
  initEmailLinkTracking();
  initEmailReveal();
  initPhoneReveal();
  initInquiryForm();
});

/* --- Plausible custom events ---
   Fires a Plausible goal alongside our GA events. window.plausible is only
   defined on the production domain (the head snippet is hostname-gated), so
   on deploy previews / localhost these calls are silent no-ops — same
   pattern as the `typeof gtag === 'function'` guards below. Props map to
   Plausible custom properties (e.g. break Email Reveal down by location). */
function plausibleEvent(name, props) {
  if (typeof window.plausible === 'function') {
    window.plausible(name, props ? { props } : undefined);
  }
}

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

/* --- Email + Phone Link Tracking ---
   Uses event delegation so links created by the click-to-reveal handlers
   (which don't exist at DOMContentLoaded time) also get tracked. Fires
   email_link_click for mailto: links and phone_link_click for tel: links. */
function initEmailLinkTracking() {
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="mailto:"], a[href^="tel:"]');
    if (!link) return;
    const isPhone = link.href.startsWith('tel:');
    const linkLocation = getLinkLocation(link);
    if (typeof gtag === 'function') {
      gtag('event', isPhone ? 'phone_link_click' : 'email_link_click', {
        link_url: link.href,
        link_location: linkLocation,
        page_path: location.pathname
      });
    }
    plausibleEvent(isPhone ? 'Phone Click' : 'Email Click', { location: linkLocation });
  });
}

function getLinkLocation(link) {
  if (link.dataset.linkLocation) return link.dataset.linkLocation;
  // Walk up — the reveal container may carry the data attribute
  const container = link.closest('.email-container');
  if (container && container.dataset.linkLocation) return container.dataset.linkLocation;
  if (link.closest('.cta-section')) return 'design-cta';
  if (link.closest('.contact-email')) return 'contact-page';
  if (link.closest('.about-text')) return 'about-page';
  if (link.closest('.article-body')) return 'article-body';
  if (link.closest('.faq-answer')) return 'faq-answer';
  if (link.closest('.footer-contact')) return 'footer';
  if (link.closest('footer')) return 'footer';
  return 'body';
}

/* --- Reveal behavioral gate ---
   For static sites we can't run a real captcha (no backend to verify),
   but we can defeat ~95% of casual scrapers by requiring a real user
   interaction + minimum page-dwell before any reveal succeeds. Bots
   that programmatically .click() without simulating mouse/touch/key
   activity first get a silent no-op. Real users pass trivially —
   tab+Enter, mouse hover→click, and touch all fire interaction
   events before the click handler runs. */
const REVEAL_GATE = (() => {
  const pageOpenedAt = Date.now();
  const MIN_DWELL_MS = 1500;
  let interacted = false;
  const SIGNALS = ['mousemove', 'touchstart', 'scroll', 'keydown', 'pointerdown'];
  SIGNALS.forEach(ev => {
    document.addEventListener(ev, () => { interacted = true; }, { once: true, passive: true });
  });
  return {
    passes() {
      return interacted && (Date.now() - pageOpenedAt) >= MIN_DWELL_MS;
    }
  };
})();

/* --- Click-to-Reveal Phone ---
   Same pattern as email reveal, but for the phone number. Number is
   split across three data attributes (area / prefix / line) so regex
   scrapers can't grep for a 10-digit number. On click we assemble it
   into a tel:+1AAAPPPLLLL link with a (AAA) PPP-LLLL display label
   and fire a phone_revealed GA4 event. */
function initPhoneReveal() {
  document.querySelectorAll('.phone-container').forEach(container => {
    const btn = container.querySelector('.phone-reveal-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!REVEAL_GATE.passes()) return;
      const area = container.dataset.area;
      const prefix = container.dataset.prefix;
      const line = container.dataset.line;
      if (!area || !prefix || !line) return;
      const e164 = '+1' + area + prefix + line;
      const display = '(' + area + ') ' + prefix + '-' + line;
      if (typeof gtag === 'function') {
        gtag('event', 'phone_revealed', {
          method: 'click_to_reveal',
          link_location: getLinkLocation(container),
          page_location: window.location.href
        });
      }
      plausibleEvent('Phone Reveal', { location: getLinkLocation(container) });
      const link = document.createElement('a');
      link.href = 'tel:' + e164;
      link.textContent = display;
      link.className = 'phone-link';
      if (container.dataset.linkLocation) {
        link.dataset.linkLocation = container.dataset.linkLocation;
      }
      container.replaceChild(link, btn);
    });
  });
}

/* --- Click-to-Reveal Email ---
   Bots can't read the address until the user clicks. Fires a GA4
   email_revealed event so we can track reveal intent alongside the
   existing email_link_click event (which fires when they actually
   click the revealed mailto: link to open their mail app). */
function initEmailReveal() {
  document.querySelectorAll('.email-container').forEach(container => {
    const btn = container.querySelector('.email-reveal-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!REVEAL_GATE.passes()) return;
      const user = container.dataset.user;
      const domain = container.dataset.domain;
      if (!user || !domain) return;
      const email = user + '@' + domain;
      if (typeof gtag === 'function') {
        gtag('event', 'email_revealed', {
          method: 'click_to_reveal',
          link_location: getLinkLocation(container),
          page_location: window.location.href
        });
      }
      plausibleEvent('Email Reveal', { location: getLinkLocation(container) });
      const link = document.createElement('a');
      link.href = 'mailto:' + email;
      link.textContent = email;
      link.className = 'email-link';
      // Carry through link_location override if the container had one
      if (container.dataset.linkLocation) {
        link.dataset.linkLocation = container.dataset.linkLocation;
      }
      container.replaceChild(link, btn);
    });
  });
}

/* --- Inquiry Form --- */
function initInquiryForm() {
  const form = document.getElementById('inquiry-form');
  if (!form) return;

  let started = false;
  form.addEventListener('focusin', () => {
    if (started) return;
    started = true;
    if (typeof gtag === 'function') {
      gtag('event', 'form_start', {
        form_id: 'inquiry-form',
        form_name: 'inquiry',
        form_destination: 'https://flatowfurniture.com/inquiry/thanks/'
      });
    }
    plausibleEvent('Inquiry Start');
  });

  const photoState = initPhotoUpload(form);

  // Intercept submit so we can build a FormData with the *compressed* file
  // objects explicitly. Setting fileInput.files via DataTransfer (which the
  // photo-upload code does) makes the new FileList visible to the DOM but
  // some browsers — notably Safari — drop those programmatically-assigned
  // files from native multipart form submission. Building FormData by hand
  // and POSTing via fetch avoids that quirk entirely.
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const projectType = form.querySelector('[name="project_type"]')?.value || '';
    if (typeof gtag === 'function') {
      gtag('event', 'form_submit', {
        form_id: 'inquiry-form',
        form_name: 'inquiry',
        form_destination: 'https://flatowfurniture.com/inquiry/thanks/',
        project_type: projectType
      });
    }
    // Fires on submit attempt (parity with GA). The /inquiry/thanks/ pageview
    // goal is the authoritative confirmed-conversion count; this event adds a
    // project_type breakdown on top of it.
    plausibleEvent('Inquiry Submit', { project_type: projectType });

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }

    try {
      const formData = new FormData(form);
      // Replace whatever the browser put in reference_photos (often empty
      // bytes when the FileList was set programmatically) with our actual
      // compressed File objects.
      // Netlify Forms doesn't accept multiple files under a single field
      // name (single-file works; multi-file silently drops everything;
      // brackets in the name get stripped). The workaround: register N
      // distinct file fields in the form's HTML schema (reference_photo_1
      // through reference_photo_10 in the hidden form on /), then spread
      // the user's selected files across those slots here at submit time.
      const MAX_PHOTOS = 10;
      formData.delete('reference_photos_picker');
      for (let i = 1; i <= MAX_PHOTOS; i++) formData.delete('reference_photo_' + i);
      photoState.files().slice(0, MAX_PHOTOS).forEach((f, i) => {
        formData.append('reference_photo_' + (i + 1), f, f.name);
      });

      // Debug log — visible in DevTools so we can confirm the files are
      // attached to the FormData before it leaves the browser. Helpful if
      // submissions land in Netlify without the photos again.
      const fileSummary = [];
      for (const [k, v] of formData.entries()) {
        if (v instanceof File) fileSummary.push(`${k}=${v.name}(${v.type}, ${v.size}B)`);
      }
      console.log('[inquiry] submitting form-name=%s with %d files: %s',
        formData.get('form-name'), fileSummary.length, fileSummary.join(', '));

      // Netlify Forms expects AJAX submissions to POST to "/" (their
      // documented pattern). POSTing to the form's action URL works for
      // text fields but seems to drop file attachments in practice.
      const response = await fetch('/', { method: 'POST', body: formData });
      console.log('[inquiry] response status=%d redirected=%s url=%s',
        response.status, response.redirected, response.url);

      if (response.ok || response.redirected) {
        window.location.href = form.action;
      } else {
        throw new Error('HTTP ' + response.status);
      }
    } catch (err) {
      console.error('Inquiry form submission failed:', err);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText || 'Send inquiry';
      }
      window.alert("Sorry — there was a problem sending your inquiry. Please try again, or use the email/phone buttons below.");
    }
  });
}

/* --- Photo Upload: client-side compression + previews + remove --- */
function initPhotoUpload(form) {
  const fileInput = document.getElementById('f-photos');
  const previewContainer = document.getElementById('photos-preview');
  const fileHint = document.getElementById('photos-hint');
  // Return a getter even if the photo widgets aren't on the page so callers
  // can always do photoState.files() without a null check.
  if (!fileInput || !previewContainer || !fileHint) return { files: () => [] };

  const MAX_DIMENSION = 1800;
  const QUALITY = 0.85;
  const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
  // Mirrors MAX_PHOTOS in the submit handler. Netlify Forms can't store
  // multiple files per field, so we register 10 distinct file fields in
  // the hidden form and cap selections at the same number here.
  const MAX_PHOTOS = 10;

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

  function updateHint(extraNotice) {
    const total = totalBytes();
    if (selectedFiles.length === 0) {
      fileHint.textContent = extraNotice || '';
      fileHint.classList.toggle('error', !!extraNotice);
      fileInput.setCustomValidity('');
      return;
    }
    const base = `${selectedFiles.length} of ${MAX_PHOTOS} photo${selectedFiles.length === 1 ? '' : 's'} · ${formatSize(total)} total.`;
    if (total > MAX_TOTAL_BYTES) {
      fileHint.textContent = base + " That's over the 8 MB submission limit — please remove a few photos and try again.";
      fileHint.classList.add('error');
      fileInput.setCustomValidity('Total file size exceeds 8 MB');
    } else {
      fileHint.textContent = extraNotice ? base + ' ' + extraNotice : base;
      fileHint.classList.toggle('error', !!extraNotice);
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

    // Enforce the 10-photo cap before doing the work of compressing.
    const slotsLeft = Math.max(0, MAX_PHOTOS - selectedFiles.length);
    const accepted = incoming.slice(0, slotsLeft);
    const rejectedCount = incoming.length - accepted.length;

    if (accepted.length === 0) {
      // Already at the cap — nothing to compress
      updateHint(`Limit is ${MAX_PHOTOS} photos. Remove one to add another.`);
      // Reset the input so the user can pick again if they remove some
      fileInput.value = '';
      return;
    }

    fileHint.textContent = `Resizing ${accepted.length} photo${accepted.length === 1 ? '' : 's'}…`;
    fileHint.classList.remove('error');
    let processed;
    try {
      processed = await Promise.all(accepted.map(compressImage));
    } catch (e) {
      processed = accepted;
    }
    selectedFiles = selectedFiles.concat(processed);
    syncInput();
    renderPreviews();
    updateHint(rejectedCount > 0
      ? `${rejectedCount} more not added (limit is ${MAX_PHOTOS}).`
      : null);
    // Clear the input value so the user can re-pick the same file later
    fileInput.value = '';
  });

  // Expose a getter so the submit handler can attach the compressed File
  // objects directly to FormData (bypassing the DataTransfer-set FileList).
  return {
    files: () => selectedFiles.slice()
  };
}
