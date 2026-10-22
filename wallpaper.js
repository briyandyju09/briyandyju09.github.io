/* ================================================================
   wallpaper.js
   Big glossy Gumdrop bubbles (ink outline, flat tone fill, a soft white
   highlight) crowding the edges of the screen, cropped, behind the
   windows. Decorative only. The page ground itself is a CSS gradient.
   Positions are fixed fractions of the viewport, so the picture is the
   same every visit. Drawn once per resize or theme change.
================================================================ */
(function () {
  const canvas = document.getElementById('wallpaper');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  /* x, y as a fraction of the screen; r as a fraction of the shorter side. */
  const BUBBLES = [
    { x: 0.97, y: 0.10, r: 0.15, tone: '--orange' },
    { x: 0.02, y: 0.80, r: 0.18, tone: '--teal' },
    { x: 0.90, y: 1.01, r: 0.13, tone: '--yellow' },
    { x: 0.56, y: -0.03, r: 0.07, tone: '--violet' },
    { x: 0.33, y: 1.04, r: 0.08, tone: '--lime' },
    { x: 0.14, y: 0.30, r: 0.05, tone: '--yellow' },
    { x: 0.80, y: 0.58, r: 0.045, tone: '--teal' },
  ];

  function bubble(x, y, r, fill, ink, lw) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = ink;
    ctx.stroke();
    /* highlight: ~34% wide x 22% tall, white at ~70%, left 18% / top 14%, tilted -25deg */
    const d = r * 2;
    ctx.save();
    ctx.translate(x - r + d * (0.18 + 0.17), y - r + d * (0.14 + 0.11));
    ctx.rotate(-25 * Math.PI / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, d * 0.17, d * 0.11, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue('--ink').trim() || '#0a0030';
    const side = Math.min(w, h);
    const phone = w < 769;

    BUBBLES.forEach(b => {
      const r = Math.max(26, b.r * side * (phone ? 1.15 : 1.4));
      bubble(b.x * w, b.y * h, r, css.getPropertyValue(b.tone).trim(), ink, 5);
    });
  }

  let timer = 0;
  const redraw = () => { cancelAnimationFrame(timer); timer = requestAnimationFrame(draw); };

  draw();
  window.addEventListener('resize', () => { clearTimeout(redraw.t); redraw.t = setTimeout(redraw, 120); });
  window.addEventListener('themechange', redraw);
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);
})();
