import { initializeStorefront } from './storefront.js';

function initializeNavigation() {
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.nav-links');
  if (!menuButton || !navigation) return;

  menuButton.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  navigation.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navigation.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    });
  });
}

function initializeScrollReveals() {
  if (!('IntersectionObserver' in window) ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const selector = [
    '.hero-copy',
    '[data-repair-carousel]',
    '.section-head',
    '.service-card',
    '.repair-brand-strip',
    '.product-card',
    '.technician-card',
    '.review-card',
    '.contact-grid > div:first-child',
    '.contact-cards > *',
    '#store-map',
  ].join(',');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -28px 0px' });

  function prepare(element) {
    if (element.matches(selector) && !element.classList.contains('reveal-ready')) {
      const siblings = [...(element.parentElement?.children ?? [])];
      const index = siblings.indexOf(element);
      element.style.setProperty('--reveal-delay', `${Math.max(0, index % 4) * 55}ms`);
      element.classList.add('reveal-ready');
      observer.observe(element);
    }
    element.querySelectorAll?.(selector).forEach(prepare);
  }

  prepare(document.documentElement);

  const productGrid = document.querySelector('#productGrid');
  if (productGrid) {
    const productObserver = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) prepare(node);
      }));
    });
    productObserver.observe(productGrid, { childList: true });
  }
}

function initializeRepairCarousel() {
  const carousel = document.querySelector('[data-repair-carousel]');
  if (!carousel) return;

  const slides = [...carousel.querySelectorAll('[data-repair-slide]')];
  const dots = [...carousel.querySelectorAll('[data-repair-go-to]')];
  const previousButton = carousel.querySelector('[data-repair-previous]');
  const nextButton = carousel.querySelector('[data-repair-next]');
  const toggleButton = carousel.querySelector('[data-repair-toggle]');
  const toggleIcon = carousel.querySelector('[data-repair-toggle-icon]');
  const count = carousel.querySelector('[data-repair-count]');
  const announcement = carousel.querySelector('[data-repair-announcement]');
  if (slides.length < 2) return;

  let activeIndex = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
  let userPaused = false;
  let playRequested = false;
  let focusInside = false;
  let timer;

  function clearTimer() {
    window.clearTimeout(timer);
    timer = undefined;
  }

  function syncPlaybackControl() {
    const label = userPaused ? 'Play slideshow' : 'Pause slideshow';
    toggleButton.setAttribute('aria-label', label);
    toggleButton.title = label;
    toggleIcon.innerHTML = userPaused
      ? '<path d="M8 5v14l11-7z" />'
      : '<path d="M8 5v14M16 5v14" />';
  }

  function render(announce = false) {
    slides.forEach((slide, index) => {
      const isActive = index === activeIndex;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
    });

    dots.forEach((dot, index) => {
      dot.classList.toggle('is-active', index === activeIndex);
      dot.setAttribute('aria-current', String(index === activeIndex));
    });

    if (count) count.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    if (announce && announcement) {
      const title = slides[activeIndex].getAttribute('aria-label').replace(/^\d+ of \d+:\s*/, '');
      announcement.textContent = `Slide ${activeIndex + 1} of ${slides.length}: ${title}`;
    }
  }

  function scheduleRotation() {
    clearTimer();
    const explicitlyPlaying = playRequested && !userPaused;
    if (userPaused || document.hidden || (focusInside && !explicitlyPlaying)) return;

    timer = window.setTimeout(() => {
      activeIndex = (activeIndex + 1) % slides.length;
      render();
      scheduleRotation();
    }, 4500);
  }

  function showSlide(index, announce = true) {
    activeIndex = (index + slides.length) % slides.length;
    render(announce);
    scheduleRotation();
  }

  previousButton?.addEventListener('click', () => showSlide(activeIndex - 1));
  nextButton?.addEventListener('click', () => showSlide(activeIndex + 1));
  dots.forEach(dot => {
    dot.addEventListener('click', () => showSlide(Number(dot.dataset.repairGoTo)));
  });

  toggleButton?.addEventListener('click', () => {
    userPaused = !userPaused;
    playRequested = !userPaused;
    syncPlaybackControl();
    scheduleRotation();
  });

  carousel.addEventListener('focusin', () => {
    focusInside = true;
    scheduleRotation();
  });
  carousel.addEventListener('focusout', () => {
    window.setTimeout(() => {
      focusInside = carousel.contains(document.activeElement);
      scheduleRotation();
    }, 0);
  });
  document.addEventListener('visibilitychange', scheduleRotation);

  render();
  syncPlaybackControl();
  scheduleRotation();
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => window.L ? resolve(window.L) : reject(new Error('Map library did not load'));
    script.onerror = () => reject(new Error('Map library did not load'));
    document.head.append(script);
  });
}

async function initializeStoreMap() {
  const container = document.querySelector('#store-map');
  if (!container) return;

  try {
    const L = await loadLeaflet();
    container.replaceChildren();

    const map = L.map(container, {
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView([49.15078, -122.89188], 16);

    map.attributionControl.setPrefix(false);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    }).addTo(map);

    L.circleMarker([49.15078, -122.89188], {
      radius: 9,
      color: '#fff',
      weight: 3,
      fillColor: '#16724c',
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip('Delta Electronics', { permanent: true, direction: 'top', offset: [0, -8] });
  } catch {
    const fallback = container.querySelector('.map-fallback');
    if (fallback?.firstChild) fallback.firstChild.textContent = 'Map unavailable. ';
  }
}

function initializeBrandMarquee() {
  const track = document.querySelector('[data-brand-track]');
  const brandList = track?.querySelector('[data-brand-list]');
  if (!track || !brandList || track.querySelector('[data-brand-clone]')) return;

  const duplicate = brandList.cloneNode(true);
  duplicate.removeAttribute('data-brand-list');
  duplicate.dataset.brandClone = 'true';
  duplicate.setAttribute('aria-hidden', 'true');
  duplicate.inert = true;
  track.append(duplicate);
}

function initializePage() {
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
  initializeNavigation();
  initializeScrollReveals();
  initializeBrandMarquee();
  initializeRepairCarousel();
  initializeStorefront();
  initializeStoreMap();
}

initializePage();
