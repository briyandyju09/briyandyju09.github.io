(function () {
  const canvas = document.getElementById('wallpaper');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  /* Deterministic value noise, so the picture is the same every visit. */
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  const smooth = t => t * t * (3 - 2 * t);
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }
  function field(x, y) {
    return 0.62 * noise(x * 0.0021 + 7, y * 0.0021 + 3)
         + 0.28 * noise(x * 0.0049 + 19, y * 0.0049 + 11)
         + 0.10 * noise(x * 0.011 + 31, y * 0.011 + 23);
  }

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const css = getComputedStyle(document.documentElement);
    const bg = css.getPropertyValue('--bg').trim();
    const dotSoft = css.getPropertyValue('--line').trim();
    const dotStrong = css.getPropertyValue('--ink-3').trim();

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 1;
    const phone = w < 769;
    const step = phone ? 12 : 14;
    const fade = phone ? 0.55 : 1;   // quieter behind phone text, which sits straight on the wallpaper
    const levels = 9;
    for (let y = step / 2; y < h; y += step) {
      for (let x = step / 2; x < w; x += step) {
        const v = field(x, y) * levels;
        const band = v - Math.floor(v);              // 0..1 inside a band
        const edge = Math.abs(band - 0.5) * 2;       // 1 on the band edge, 0 mid-band
        const near = Math.pow(edge, 5);              // sharp falloff away from the contour
        const r = 0.55 + near * 1.9;
        const strong = near > 0.35;
        ctx.globalAlpha = (strong ? 0.5 : 1) * fade;
        ctx.fillStyle = strong ? dotStrong : dotSoft;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 6.2832);
        ctx.fill();
      }
    }
  }

  let timer = 0;
  const redraw = () => { cancelAnimationFrame(timer); timer = requestAnimationFrame(draw); };

  draw();
  window.addEventListener('resize', () => { clearTimeout(redraw.t); redraw.t = setTimeout(redraw, 120); });
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
})();
/* ================================================================
   wallpaper.js
   A dot-matrix halftone of a made-up landscape. The dot grid is the
   OLED pixel grid; the dots swell along contour bands, so it reads
   as a topographic map. Greys only, read from the theme tokens, so it
   follows light and dark. Static: drawn once per resize or theme change.
(function () {
  const canvas = document.getElementById('wallpaper');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  /* Deterministic value noise, so the picture is the same every visit. */
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  const smooth = t => t * t * (3 - 2 * t);
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }
  function field(x, y) {
    return 0.62 * noise(x * 0.0021 + 7, y * 0.0021 + 3)
         + 0.28 * noise(x * 0.0049 + 19, y * 0.0049 + 11)
         + 0.10 * noise(x * 0.011 + 31, y * 0.011 + 23);
  }

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const css = getComputedStyle(document.documentElement);
    const bg = css.getPropertyValue('--bg').trim();
    const dotSoft = css.getPropertyValue('--line').trim();
    const dotStrong = css.getPropertyValue('--ink-3').trim();

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 1;
    const phone = w < 769;
    const step = phone ? 12 : 14;
    const fade = phone ? 0.55 : 1;   // quieter behind phone text, which sits straight on the wallpaper
    const levels = 9;
    for (let y = step / 2; y < h; y += step) {
      for (let x = step / 2; x < w; x += step) {
        const v = field(x, y) * levels;
        const band = v - Math.floor(v);              // 0..1 inside a band
        const edge = Math.abs(band - 0.5) * 2;       // 1 on the band edge, 0 mid-band
        const near = Math.pow(edge, 5);              // sharp falloff away from the contour
        const r = 0.55 + near * 1.9;
        const strong = near > 0.35;
        ctx.globalAlpha = (strong ? 0.5 : 1) * fade;
        ctx.fillStyle = strong ? dotStrong : dotSoft;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 6.2832);
        ctx.fill();
      }
    }
  }

  let timer = 0;
  const redraw = () => { cancelAnimationFrame(timer); timer = requestAnimationFrame(draw); };

  draw();
  window.addEventListener('resize', () => { clearTimeout(redraw.t); redraw.t = setTimeout(redraw, 120); });
  window.addEventListener('themechange', redraw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
})();
