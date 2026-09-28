/* ================================================================
   myOS — script.js
   Handles: clock · window management · drag · map · blog · widgets
   ────────────────────────────────────────────────────────────────
   CONTENT lives in blogs.js (BLOG_POSTS).
   This file is the engine — you rarely need to edit it.
================================================================ */


/* ── 1. APP REGISTRY ─────────────────────────────────────────────*/
const APP_REGISTRY = {
  home:        { title: 'Home',        winId: 'win-home',      onOpen: null },
  about:       { title: 'About Me',    winId: 'win-about',     onOpen: null },
  spotify:     { title: 'Spotify',     winId: 'win-spotify',   onOpen: null },
  map:         { title: 'My Map',      winId: 'win-map',       onOpen: initMapApp },
  blog:        { title: 'Blog',        winId: 'win-blog',      onOpen: initBlogList },
  'blog-post': { title: 'Post',        winId: 'win-blog-post', onOpen: null },
  projects:    { title: 'Projects',    winId: 'win-projects',  onOpen: initProjectsApp },
  weather:     { title: 'Weather',     winId: 'win-weather',   onOpen: null },
};


/* ── 2. SYSTEM CLOCK ─────────────────────────────────────────────*/
function updateClock() {
  const el  = document.getElementById('topbar-clock');
  const now = new Date();
  const d   = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const t   = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  el.textContent = `${d},  ${t}`;
}
updateClock();
setInterval(updateClock, 1000);


/* ── 3. WINDOW MANAGEMENT ────────────────────────────────────────*/
let zTop = 200;

function openApp(appKey) {
  const app = APP_REGISTRY[appKey];
  if (!app) { console.warn(`myOS: unknown app "${appKey}"`); return; }
  const win = document.getElementById(app.winId);
  if (!win)  { console.warn(`myOS: window #${app.winId} not found`); return; }

  if (win.classList.contains('window-open')) { focusWin(win); return; }

  const desktop = document.getElementById('desktop');
  const dw = desktop.clientWidth,  dh = desktop.clientHeight;
  const ww = win.offsetWidth  || parseInt(win.style.width)  || 420;
  const wh = win.offsetHeight || parseInt(win.style.height) || 320;
  const jitter = () => (Math.random() - 0.5) * 60;

  win.style.left = `${Math.max(10, (dw - ww) / 2 + jitter())}px`;
  win.style.top  = `${Math.max(10, (dh - wh) / 2 + jitter())}px`;
  win.classList.add('window-open');
  focusWin(win);
  if (typeof app.onOpen === 'function') app.onOpen(win);
}

function focusWin(win) {
  zTop += 1;
  win.style.zIndex = zTop;
  document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
  win.classList.add('focused');
}


/* ── 4. CLICK HANDLERS ───────────────────────────────────────────*/
document.querySelectorAll('.desktop-icon').forEach(icon => {
  icon.addEventListener('click',    () => openApp(icon.dataset.app));
  icon.addEventListener('dblclick', () => openApp(icon.dataset.app));
});

document.querySelectorAll('.window').forEach(win => {
  win.addEventListener('mousedown', () => focusWin(win));
});

document.querySelectorAll('.dot-close').forEach(dot => {
  dot.addEventListener('click', e => {
    e.stopPropagation();
    dot.closest('.window').classList.remove('window-open');
  });
});

document.querySelectorAll('.home-card').forEach(btn => {
  btn.addEventListener('click', () => openApp(btn.dataset.app));
});


/* ── 5. DRAG ─────────────────────────────────────────────────────*/
document.querySelectorAll('.window-titlebar').forEach(tb => {
  tb.addEventListener('mousedown', startDrag);
});

function startDrag(e) {
  if (e.target.classList.contains('dot')) return;
  // Below 768px, windows are pinned full-screen by CSS and there's no
  // mouse to drag with anyway (touch only) — skip entirely.
  if (window.matchMedia('(max-width: 768px)').matches) return;

  const win     = e.currentTarget.closest('.window');
  const desktop = document.getElementById('desktop');
  focusWin(win);

  const startX = e.clientX - win.offsetLeft;
  const startY = e.clientY - win.offsetTop - parseInt(getComputedStyle(document.getElementById('topbar')).height);
  const maxX   = () => desktop.clientWidth  - win.offsetWidth;
  const maxY   = () => desktop.clientHeight - 40;

  function onMove(ev) {
    const tbH = parseInt(getComputedStyle(document.getElementById('topbar')).height || 36);
    win.style.left = `${Math.max(0, Math.min(ev.clientX - startX,          maxX()))}px`;
    win.style.top  = `${Math.max(0, Math.min(ev.clientY - startY - tbH,    maxY()))}px`;
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',   onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onUp);
}


/* ── 6. MAP APP ──────────────────────────────────────────────────*/
let mapInstance = null;

const PLACES_IVE_BEEN = [
  { name: 'Shanghai, China',  lat: 31.230391, lng: 121.473701, note: '✦ game Jam in Shanghai' },
  { name: 'Yerevan, Armenia', lat: 40.069099, lng:  45.038189, note: '✧ city of lights' },
  { name: 'Vermont, USA',     lat: 44.558804, lng: -72.577843, note: '✦ hackclub intern 2026' },
  { name: 'Kerala, India',    lat:  9.318328, lng:  76.611084, note: '✧ pure peace' },
  { name: 'Delhi, India',     lat: 28.704060, lng:  77.102493, note: '✦ first ever hackathon' },
  { name: 'Dubai, UAE',       lat: 25.2048,   lng:  55.2708,   note: '✧ home base' },
];

function initMapApp() {
  if (mapInstance) return;
  mapInstance = L.map('leaflet-map').setView([20, 10], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 18,
  }).addTo(mapInstance);

  const icon = L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;background:#4ECDC4;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px #4ECDC4;"></div>`,
    iconSize: [12, 12], iconAnchor: [6, 6],
  });

  PLACES_IVE_BEEN.forEach(p => {
    L.marker([p.lat, p.lng], { icon })
      .addTo(mapInstance)
      .bindPopup(`<strong style="font-family:Syne,sans-serif;font-size:13px;">${p.name}</strong><br>
                  <span style="font-family:'Space Mono',monospace;font-size:11px;color:#666;">${p.note}</span>`);
  });
  setTimeout(() => mapInstance.invalidateSize(), 200);
}


/* ════════════════════════════════════════════════════════════════
   BLOG APP
════════════════════════════════════════════════════════════════ */

let blogListInit = false;

function initBlogList() {
  if (blogListInit) return;
  blogListInit = true;

  const container = document.getElementById('blog-entries');
  if (!container) return;

  if (!BLOG_POSTS || !BLOG_POSTS.length) {
    container.innerHTML = `<div class="blog-empty">✧ no posts yet — add some in blogs.js ✧</div>`;
    return;
  }

  container.innerHTML = '';
  BLOG_POSTS.forEach(post => {
    const card = document.createElement('button');
    card.className    = 'blog-entry-card';
    card.dataset.postId = post.id;
    card.innerHTML = `
      <div class="blog-entry-emoji">${post.emoji || '✦'}</div>
      <div class="blog-entry-meta">
        <div class="blog-entry-title">${escapeHTML(post.title)}</div>
        <div class="blog-entry-date">${escapeHTML(post.date)}</div>
        <div class="blog-entry-excerpt">${escapeHTML(post.excerpt || '')}</div>
      </div>
      <div class="blog-entry-arrow">→</div>
    `;
    card.addEventListener('click', () => openBlogPost(post.id));
    container.appendChild(card);
  });
}

/* ── Open a post ─────────────────────────────────────────────── */
function openBlogPost(postId) {
  const post = BLOG_POSTS.find(p => p.id === postId);
  if (!post) return;

  renderBlogPost(post);

  const win = document.getElementById('win-blog-post');
  if (!win) return;

  const titleEl = document.getElementById('blog-post-win-title');
  if (titleEl) titleEl.textContent = `✧ ${post.title} ✧`;

  if (win.classList.contains('window-open')) {
    focusWin(win);
  } else {
    const blogWin = document.getElementById('win-blog');
    const desktop = document.getElementById('desktop');
    const dw = desktop.clientWidth, dh = desktop.clientHeight;
    let left, top;
    if (blogWin && blogWin.classList.contains('window-open')) {
      left = Math.min(parseInt(blogWin.style.left || 0) + 30, dw - 540);
      top  = Math.min(parseInt(blogWin.style.top  || 0) + 30, dh - 400);
    } else {
      left = Math.max(10, (dw - 520) / 2);
      top  = Math.max(10, (dh - 580) / 2);
    }
    win.style.left = `${Math.max(10, left)}px`;
    win.style.top  = `${Math.max(10, top)}px`;
    win.classList.add('window-open');
    focusWin(win);
  }
}

/* ── Normalise to days array ─────────────────────────────────── */
function normaliseDays(post) {
  if (post.days && post.days.length) return post.days;
  return [{ label: null, date: post.date, photos: post.photos || [], content: post.content || '' }];
}

/* ── Build carousel HTML (uses absolute-positioned slides) ────── */
function buildCarouselHTML(photos, carouselId) {
  if (!photos || !photos.length) return '';

  const isSingle = photos.length === 1;

  const slides = photos.map((ph, i) => `
    <div class="carousel-slide${i === 0 ? ' active' : ''}" data-idx="${i}">
      <img src="${escapeHTML(ph.src)}" alt="${escapeHTML(ph.caption || '')}" loading="lazy" />
      ${ph.caption ? `<div class="carousel-caption">${escapeHTML(ph.caption)}</div>` : ''}
    </div>
  `).join('');

  const dots = !isSingle
    ? `<div class="carousel-indicators">
         ${photos.map((_, i) => `<div class="carousel-dot${i === 0 ? ' active' : ''}" data-idx="${i}"></div>`).join('')}
       </div>`
    : '';

  return `
    <div class="carousel-wrap${isSingle ? ' carousel-single' : ''}" id="${carouselId}">
      <div class="carousel-stage">${slides}</div>
      <button class="carousel-btn carousel-btn-prev">‹</button>
      <button class="carousel-btn carousel-btn-next">›</button>
      ${dots}
    </div>
  `;
}

/* ── Wire smooth slide-in/out carousel ───────────────────────── */
function wireCarousel(wrap, total) {
  if (total <= 1) return;

  let current   = 0;
  let animating = false;
  const DURATION = 420; // ms — match CSS animation duration

  const slides = wrap.querySelectorAll('.carousel-slide');
  const dots   = wrap.querySelectorAll('.carousel-dot');

  function goTo(next, dir) {
    if (animating || next === current) return;
    animating = true;

    const outSlide = slides[current];
    const inSlide  = slides[next];

    const outClass = dir === 'next' ? 'slide-exit-left'  : 'slide-exit-right';
    const inClass  = dir === 'next' ? 'slide-enter-right': 'slide-enter-left';

    // Bring incoming slide to visible layer while animation plays
    inSlide.classList.add('active', inClass);
    outSlide.classList.add(outClass);

    setTimeout(() => {
      outSlide.classList.remove('active', outClass);
      inSlide.classList.remove(inClass);
      current   = next;
      animating = false;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }, DURATION);
  }

  wrap.querySelector('.carousel-btn-prev').addEventListener('click', e => {
    e.stopPropagation();
    goTo((current - 1 + total) % total, 'prev');
  });
  wrap.querySelector('.carousel-btn-next').addEventListener('click', e => {
    e.stopPropagation();
    goTo((current + 1) % total, 'next');
  });
  dots.forEach(dot => {
    dot.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(dot.dataset.idx);
      goTo(idx, idx > current ? 'next' : 'prev');
    });
  });
}

/* ── Render post content into win-blog-post ─────────────────── */
function renderBlogPost(post) {
  const body = document.getElementById('blog-post-body');
  if (!body) return;

  const days    = normaliseDays(post);
  const isMulti = days.length > 1;
  let   html    = '';

  days.forEach((day, di) => {
    const cid       = `carousel-${post.id}-d${di}`;
    const hasPhotos = day.photos && day.photos.length > 0;

    const paragraphs = (day.content || '')
      .split(/\n\s*\n/)
      .filter(p => p.trim())
      .map(p => `<p>${escapeHTML(p.trim()).replace(/\n/g, '<br>')}</p>`)
      .join('');

    if (isMulti && di > 0) {
      html += `<div class="blog-day-divider"></div>`;
    }

    html += `<div class="blog-day">
      ${isMulti ? `
        <div class="blog-day-header">
          <span class="blog-day-label">${escapeHTML(day.label || `Day ${di + 1}`)}</span>
          ${day.date ? `<span class="blog-day-date">${escapeHTML(day.date)}</span>` : ''}
        </div>` : ''}
      ${hasPhotos ? buildCarouselHTML(day.photos, cid) : ''}
      <div class="blog-post-text">${paragraphs}</div>
    </div>`;
  });

  body.innerHTML = `
    <div class="blog-post-header">
      <div class="blog-post-date">${escapeHTML(post.date)}</div>
      <h2 class="blog-post-title">${escapeHTML(post.title)}</h2>
      <div class="blog-post-divider"></div>
    </div>
    <div class="blog-post-scroll-area">${html}</div>
  `;

  // Wire each carousel that has >1 slide
  days.forEach((day, di) => {
    if (!day.photos || day.photos.length <= 1) return;
    const wrap = body.querySelector(`#carousel-${post.id}-d${di}`);
    if (wrap) wireCarousel(wrap, day.photos.length);
  });
}


/* ════════════════════════════════════════════════════════════════
   PROJECTS APP  (live from GitHub)
════════════════════════════════════════════════════════════════ */

const GITHUB_USERNAME = 'briyandyju09';
const PROJECTS_EXCLUDE = new Set([
  'briyandyju09.github.io', // this site itself
  'briyandyju09',           // GitHub profile-README repo
]);

let projectsInit = false;

function formatRelativeDate(iso) {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days < 1)  return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

async function initProjectsApp() {
  if (projectsInit) return;
  projectsInit = true;

  const container = document.getElementById('projects-list');
  if (!container) return;

  try {
    const r = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=pushed&direction=desc&per_page=15`);
    if (!r.ok) throw new Error('bad response');
    const repos = (await r.json()).filter(repo => !repo.fork && !PROJECTS_EXCLUDE.has(repo.name));

    if (!repos.length) {
      container.innerHTML = `<div class="blog-empty">✧ no public repos found ✧</div>`;
      return;
    }

    container.innerHTML = repos.map(repo => `
      <a class="project-card" href="${repo.html_url}" target="_blank" rel="noopener noreferrer">
        <div class="project-card-top">
          <span class="project-name">${escapeHTML(repo.name)}</span>
          ${repo.stargazers_count ? `<span class="project-stars">★ ${repo.stargazers_count}</span>` : ''}
        </div>
        <div class="project-desc">${escapeHTML(repo.description || 'no description yet')}</div>
        <div class="project-meta">
          ${repo.language ? `<span class="project-lang">${escapeHTML(repo.language)}</span>` : ''}
          <span class="project-updated">updated ${formatRelativeDate(repo.pushed_at)}</span>
        </div>
      </a>
    `).join('');
  } catch {
    container.innerHTML = `<div class="blog-empty">✧ couldn't load projects ✧</div>`;
  }
}


/* ════════════════════════════════════════════════════════════════
   WEATHER WIDGET
════════════════════════════════════════════════════════════════ */

function getWeatherEmoji(code) {
  if (code === 0) return '☀️';
  if (code <= 2)  return '⛅';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '🌨️';
  if (code <= 99) return '⛈️';
  return '🌤️';
}
function getWeatherDesc(code) {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Foggy';
  if (code <= 55) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  if (code <= 99) return 'Thunderstorm';
  return '—';
}

async function fetchDubaiWeather() {
  const body = document.getElementById('weather-body');
  if (!body) return;
  try {
    const r = await fetch(
      'https://api.open-meteo.com/v1/forecast'
      + '?latitude=25.2048&longitude=55.2708'
      + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code'
      + '&wind_speed_unit=kmh&timezone=Asia%2FDubai'
    );
    const data = await r.json();
    const c    = data.current;
    const tStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    body.innerHTML = `
      <div class="weather-emoji">${getWeatherEmoji(c.weather_code)}</div>
      <div class="weather-temp">${Math.round(c.temperature_2m)}°C</div>
      <div class="weather-city">Dubai, AE</div>
      <div class="weather-desc">${getWeatherDesc(c.weather_code)}</div>
      <div class="weather-row">
        <span>💨 ${Math.round(c.wind_speed_10m)} km/h</span>
        <span>💧 ${c.relative_humidity_2m}%</span>
      </div>
      <div class="weather-updated">updated ${tStr}</div>
    `;
  } catch {
    const b = document.getElementById('weather-body');
    if (b) b.innerHTML = `<div class="widget-loading">couldn't fetch weather ✧</div>`;
  }
}


/* ════════════════════════════════════════════════════════════════
   WIDGET POSITIONING
════════════════════════════════════════════════════════════════ */
function openWidgets() {
  setTimeout(() => {
    const dw      = document.getElementById('desktop').clientWidth;
    const rightX  = dw - 244 - 20;

    const weatherWin = document.getElementById('win-weather');
    if (weatherWin) {
      weatherWin.style.left = `${rightX}px`;
      weatherWin.style.top  = '20px';
      weatherWin.classList.add('window-open');
      focusWin(weatherWin);
      fetchDubaiWeather();
      setInterval(fetchDubaiWeather, 10 * 60 * 1000);
    }
  }, 120);
}


/* ── UTILITY ─────────────────────────────────────────────────────*/
function escapeHTML(str) {
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}


/* ── BOOT ────────────────────────────────────────────────────────*/
window.addEventListener('load', () => {
  openApp('home');
  openWidgets();
});
