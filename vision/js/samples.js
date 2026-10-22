/* Built-in sample "photographs": small procedural scenes drawn with canvas, graded like film.
   They are labelled sample art in the UI and exist so templates and the empty board have pictures offline. */
(function () {
"use strict";
const VB = window.VB;

function lin(x, w, h, stops, vertical) {
  const g = vertical === false ? x.createLinearGradient(0, 0, w, 0) : x.createLinearGradient(0, 0, 0, h);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g;
}
function glow(x, cx, cy, r, c0, c1) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c0); g.addColorStop(1, c1); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
function finish(x, w, h, rnd, warm) {
  const img = x.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 22; d[i] = Math.min(255, Math.max(0, d[i] + n + (warm || 6))); d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n)); d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n - (warm || 6) * 0.8)); }
  x.putImageData(img, 0, 0);
  const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.78); g.addColorStop(0, "rgba(20,10,40,0)"); g.addColorStop(1, "rgba(20,10,40,.38)");
  x.fillStyle = g; x.fillRect(0, 0, w, h);
}
function hills(x, w, h, rnd, y0, cols, amp) {
  cols.forEach((c, i) => {
    x.fillStyle = c; x.beginPath(); x.moveTo(0, h);
    const base = y0 + i * (h - y0) / (cols.length + 0.6), ph = rnd() * 6, f = 0.004 + rnd() * 0.004;
    for (let px = 0; px <= w; px += 8) x.lineTo(px, base + Math.sin(px * f + ph) * amp * (1 - i * 0.12) + Math.sin(px * f * 2.3 + ph * 2) * amp * 0.35);
    x.lineTo(w, h); x.closePath(); x.fill();
  });
}
function pine(x, px, py, s, c) { x.fillStyle = c; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(px, py - s * (1.1 - i * 0.22)); x.lineTo(px - s * (0.28 + i * 0.1), py - s * (0.72 - i * 0.22)); x.lineTo(px + s * (0.28 + i * 0.1), py - s * (0.72 - i * 0.22)); x.closePath(); x.fill(); } x.fillRect(px - s * 0.04, py - s * 0.1, s * 0.08, s * 0.14); }

const SCENES = {
  sunrise: { name: "sunrise hills", w: 800, h: 1000, draw(x, w, h, r) {
    x.fillStyle = lin(x, w, h, ["#f6a6a0", "#f9c78c", "#ffe9a8"]); x.fillRect(0, 0, w, h);
    glow(x, w * 0.62, h * 0.52, 360, "rgba(255,248,200,.95)", "rgba(255,230,150,0)"); x.fillStyle = "#fff6c9"; x.beginPath(); x.arc(w * 0.62, h * 0.52, 74, 0, 7); x.fill();
    hills(x, w, h, r, h * 0.55, ["#d79aa6", "#a27ca8", "#6c5a98", "#3d3a78"], 34);
    x.strokeStyle = "#3a2d5c"; x.lineWidth = 3; for (let i = 0; i < 5; i++) { const bx = w * 0.18 + i * 46, by = h * 0.3 + Math.sin(i * 1.7) * 26; x.beginPath(); x.moveTo(bx - 12, by + 4); x.quadraticCurveTo(bx, by - 8, bx + 12, by + 4); x.stroke(); }
  } },
  city: { name: "city at night", w: 800, h: 1000, draw(x, w, h, r) {
    x.fillStyle = lin(x, w, h, ["#0e1240", "#2b2a7a", "#7a4a9a", "#f0907a"]); x.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; x.fillRect(r() * w, r() * h * 0.55, 2, 2); }
    glow(x, w * 0.76, h * 0.2, 90, "rgba(255,250,220,.9)", "rgba(255,250,220,0)"); x.fillStyle = "#fffbe6"; x.beginPath(); x.arc(w * 0.76, h * 0.2, 30, 0, 7); x.fill();
    for (let layer = 0; layer < 2; layer++) {
      let px = -20; while (px < w) { const bw = 50 + r() * 70, bh = (layer ? 160 : 260) + r() * (layer ? 240 : 340); x.fillStyle = layer ? "#1a1a4a" : "#0d0d2c"; x.fillRect(px, h - bh, bw, bh);
        for (let wy = h - bh + 14; wy < h - 14; wy += 20) for (let wx = px + 8; wx < px + bw - 8; wx += 16) if (r() < 0.38) { x.fillStyle = r() < 0.8 ? "#ffd86a" : "#ffb0c8"; x.fillRect(wx, wy, 6, 9); } px += bw + 4 + r() * 8; }
    }
  } },
  ocean: { name: "ocean horizon", w: 1000, h: 700, draw(x, w, h, r) {
    x.fillStyle = lin(x, w, h * 0.52, ["#f7b7a3", "#fbd9a6", "#fff0c4"]); x.fillRect(0, 0, w, h * 0.52);
    glow(x, w * 0.5, h * 0.5, 260, "rgba(255,245,210,.9)", "rgba(255,245,210,0)"); x.fillStyle = "#fff4cf"; x.beginPath(); x.arc(w * 0.5, h * 0.5, 54, Math.PI, 0); x.fill();
    x.fillStyle = lin(x, w, h, ["#3b7fa0", "#1f5a86", "#123e66"]); x.fillRect(0, h * 0.5, w, h * 0.5);
    for (let i = 0; i < 130; i++) { const yy = h * 0.5 + 6 + Math.pow(r(), 1.6) * h * 0.48, ww = 10 + (yy - h * 0.5) * 0.35 * r() + r() * 30; x.fillStyle = `rgba(255,236,190,${0.12 + r() * 0.45 * (1 - Math.abs(yy / h - 0.6))})`; x.fillRect(w * 0.5 + (r() - 0.5) * (120 + (yy - h * 0.5) * 0.9) - ww / 2, yy, ww, 2.4); }
  } },
  mountain: { name: "mountain lake", w: 1000, h: 700, draw(x, w, h, r) {
    x.fillStyle = lin(x, w, h * 0.6, ["#8fb7d6", "#d6e6ef", "#f6eed8"]); x.fillRect(0, 0, w, h);
    const ridge = (base, amp, col, snow) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, h * 0.62); for (let px = 0; px <= w; px += 25) x.lineTo(px, base - Math.abs(Math.sin(px * 0.006 + amp)) * amp - Math.sin(px * 0.021 + amp) * amp * 0.16); x.lineTo(w, h * 0.62); x.fill(); };
    ridge(h * 0.5, 190, "#7e93b8"); ridge(h * 0.55, 130, "#566a94"); ridge(h * 0.6, 70, "#2f4770");
    x.fillStyle = lin(x, w, h, ["#3a6f93", "#1c4565"]); x.fillRect(0, h * 0.62, w, h * 0.38);
    x.fillStyle = "rgba(255,255,255,.12)"; for (let i = 0; i < 40; i++) x.fillRect(r() * w, h * 0.63 + r() * h * 0.36, 40 + r() * 90, 2);
    for (let i = 0; i < 16; i++) pine(x, 20 + i * 64 + r() * 30, h * 0.66 + r() * 12, 70 + r() * 50, "#173126");
  } },
  desert: { name: "desert dunes", w: 1000, h: 700, draw(x, w, h, r) {
    x.fillStyle = lin(x, w, h, ["#f3a77a", "#f7cf9a", "#fbe6bf"]); x.fillRect(0, 0, w, h);
    glow(x, w * 0.3, h * 0.28, 200, "rgba(255,244,200,.9)", "rgba(255,244,200,0)"); x.fillStyle = "#fff4cf"; x.beginPath(); x.arc(w * 0.3, h * 0.28, 44, 0, 7); x.fill();
    ["#d98d5e", "#c47346", "#a85a36", "#7d3f27"].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.moveTo(0, h); for (let px = 0; px <= w; px += 10) x.lineTo(px, h * (0.52 + i * 0.11) + Math.sin(px * (0.006 + i * 0.002) + i * 2) * (46 - i * 6)); x.lineTo(w, h); x.fill(); x.fillStyle = "rgba(60,20,10,.22)"; x.beginPath(); x.moveTo(0, h); for (let px = 0; px <= w; px += 10) x.lineTo(px, h * (0.52 + i * 0.11) + Math.sin(px * (0.006 + i * 0.002) + i * 2) * (46 - i * 6) + 18); x.lineTo(w, h); x.fill(); });
  } },
  forest: { name: "misty forest", w: 800, h: 1000, draw(x, w, h, r) {
    x.fillStyle = lin(x, w, h, ["#cfe3d4", "#9fc2a8", "#4f7d62"]); x.fillRect(0, 0, w, h);
    [["#8fb59d", 0.38, 60], ["#5f9276", 0.52, 90], ["#376b53", 0.68, 130], ["#1d4636", 0.86, 190]].forEach(([c, yy, s]) => { for (let i = 0; i < 9; i++) pine(x, (i + r() * 0.6) * (w / 8) - 20, h * yy + r() * 40, s * (0.8 + r() * 0.6), c); x.fillStyle = "rgba(226,240,230,.22)"; x.fillRect(0, h * yy - 10, w, 90); });
    x.fillStyle = "rgba(255,250,220,.1)"; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(120 + i * 140, 0); x.lineTo(60 + i * 140, h); x.lineTo(150 + i * 140, h); x.lineTo(180 + i * 140, 0); x.fill(); }
  } },
  campus: { name: "dream campus", w: 1000, h: 700, draw(x, w, h, r) {
    x.fillStyle = lin(x, w, h * 0.7, ["#9cc6e8", "#d8ebf5", "#fbf0d4"]); x.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { x.fillStyle = "rgba(255,255,255,.7)"; x.beginPath(); x.ellipse(120 + i * 160 + r() * 40, 90 + r() * 120, 60 + r() * 40, 18 + r() * 8, 0, 0, 7); x.fill(); }
    x.fillStyle = "#6fae6a"; x.fillRect(0, h * 0.78, w, h * 0.22); x.fillStyle = "#e6d8b6"; x.beginPath(); x.moveTo(w * 0.36, h); x.lineTo(w * 0.46, h * 0.78); x.lineTo(w * 0.54, h * 0.78); x.lineTo(w * 0.64, h); x.fill();
    const bx = w * 0.18, bw = w * 0.64, by = h * 0.36, bh = h * 0.42;
    x.fillStyle = "#c9a37a"; x.fillRect(bx, by, bw, bh); x.fillStyle = "#b8895c"; x.fillRect(bx, by + bh * 0.82, bw, bh * 0.18);
    x.fillStyle = "#d9b48a"; x.beginPath(); x.moveTo(bx - 14, by); x.lineTo(bx + bw / 2, by - 92); x.lineTo(bx + bw + 14, by); x.closePath(); x.fill();
    x.fillStyle = "#e8ccaa"; x.fillRect(w * 0.44, by - 150, w * 0.12, 90); x.fillStyle = "#6f9bb5"; x.beginPath(); x.arc(w * 0.5, by - 150, w * 0.07, Math.PI, 0); x.fill(); x.fillStyle = "#fffbe6"; x.beginPath(); x.arc(w * 0.5, by - 110, 18, 0, 7); x.fill(); x.strokeStyle = "#3a2d1c"; x.lineWidth = 3; x.beginPath(); x.moveTo(w * 0.5, by - 110); x.lineTo(w * 0.5, by - 122); x.moveTo(w * 0.5, by - 110); x.lineTo(w * 0.5 + 9, by - 106); x.stroke();
    for (let i = 0; i < 7; i++) { x.fillStyle = "#f3e6cd"; x.fillRect(bx + 30 + i * (bw - 60) / 6.5, by + 14, 20, bh * 0.8); }
    for (let i = 0; i < 7; i++) { x.fillStyle = "#6b4a2c"; x.fillRect(bx + 36 + i * (bw - 60) / 6.5, by + bh * 0.3, 8, 36); }
    [0.07, 0.9].forEach(t => { x.fillStyle = "#3f7a45"; x.beginPath(); x.arc(w * t, h * 0.66, 70, 0, 7); x.fill(); x.fillStyle = "#6b4a2c"; x.fillRect(w * t - 6, h * 0.66, 12, h * 0.14); });
  } },
  desk: { name: "study desk", w: 1000, h: 700, draw(x, w, h, r) {
    x.fillStyle = "#d9b99a"; x.fillRect(0, 0, w, h * 0.62); x.fillStyle = "#8a5a3a"; x.fillRect(0, h * 0.62, w, h * 0.38);
    glow(x, w * 0.74, h * 0.32, 300, "rgba(255,236,170,.75)", "rgba(255,236,170,0)");
    x.fillStyle = "#3a2a4a"; x.fillRect(w * 0.73, h * 0.4, 8, h * 0.22); x.beginPath(); x.moveTo(w * 0.66, h * 0.3); x.lineTo(w * 0.8, h * 0.3); x.lineTo(w * 0.84, h * 0.4); x.lineTo(w * 0.62, h * 0.4); x.fill();
    const cols = ["#d9382a", "#2d5f9a", "#e0a82b", "#2f8f6d", "#7a4a9a"]; let by = h * 0.62; for (let i = 0; i < 5; i++) { const bw = 230 - i * 14, bh = 34 + r() * 8; x.fillStyle = cols[i]; x.fillRect(w * 0.1 + i * 4, by - bh, bw, bh); x.fillStyle = "rgba(255,255,255,.7)"; x.fillRect(w * 0.1 + i * 4 + bw - 14, by - bh + 6, 10, bh - 12); by -= bh; }
    x.fillStyle = "#f4efe3"; x.fillRect(w * 0.36, h * 0.54, 190, 70); x.fillStyle = "#2b2a3a"; for (let i = 0; i < 4; i++) x.fillRect(w * 0.36 + 14, h * 0.54 + 14 + i * 12, 150 - i * 20, 3);
    x.fillStyle = "#f6f3ec"; x.beginPath(); x.roundRect(w * 0.57, h * 0.53, 62, 70, 9); x.fill(); x.fillStyle = "#c8652f"; x.fillRect(w * 0.57 + 4, h * 0.53 + 8, 54, 14);
  } },
  flower: { name: "flowers", w: 800, h: 1000, draw(x, w, h, r) {
    x.fillStyle = lin(x, w, h, ["#cfe0c6", "#f3d9d5"]); x.fillRect(0, 0, w, h);
    [[w * 0.5, h * 0.42, 190, "#f08aa5", "#ffd25a"], [w * 0.2, h * 0.78, 110, "#fff2f4", "#f2b84b"], [w * 0.82, h * 0.7, 130, "#b9a3e6", "#ffe58a"]].forEach(([cx, cy, R, pc, cc]) => {
      x.strokeStyle = "#4f8a52"; x.lineWidth = 12; x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + 30, cy + R * 2, cx - 20, h); x.stroke();
      for (let i = 0; i < 10; i++) { x.save(); x.translate(cx, cy); x.rotate(i * Math.PI / 5); x.fillStyle = pc; x.beginPath(); x.ellipse(0, -R * 0.62, R * 0.27, R * 0.55, 0, 0, 7); x.fill(); x.strokeStyle = "rgba(120,30,60,.18)"; x.lineWidth = 2; x.stroke(); x.restore(); }
      x.fillStyle = cc; x.beginPath(); x.arc(cx, cy, R * 0.2, 0, 7); x.fill();
    });
  } },
  plane: { name: "window seat", w: 800, h: 1000, draw(x, w, h, r) {
    x.fillStyle = "#e7e1d6"; x.fillRect(0, 0, w, h);
    x.save(); x.beginPath(); x.roundRect(160, 190, 480, 640, 220); x.clip();
    x.fillStyle = lin(x, w, h, ["#4f9bd6", "#a9d4f0", "#fbe3c4"]); x.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(255,255,255,${0.5 + r() * 0.4})`; x.beginPath(); x.arc(200 + r() * 420, 520 + r() * 300, 30 + r() * 60, 0, 7); x.fill(); }
    x.fillStyle = "#cfd6dd"; x.beginPath(); x.moveTo(160, 700); x.lineTo(640, 560); x.lineTo(640, 640); x.lineTo(160, 830); x.fill(); x.restore();
    x.lineWidth = 26; x.strokeStyle = "#cdc6b8"; x.beginPath(); x.roundRect(160, 190, 480, 640, 220); x.stroke(); x.lineWidth = 3; x.strokeStyle = "rgba(0,0,0,.2)"; x.beginPath(); x.roundRect(147, 177, 506, 666, 232); x.stroke();
    x.fillStyle = "#d6cfc0"; x.beginPath(); x.roundRect(240, 150, 320, 28, 12); x.fill();
  } },
  coffee: { name: "morning coffee", w: 800, h: 800, draw(x, w, h, r) {
    x.fillStyle = "#b98a5f"; x.fillRect(0, 0, w, h); for (let i = 0; i < 24; i++) { x.fillStyle = `rgba(80,40,10,${0.05 + r() * 0.08})`; x.fillRect(0, i * 34 + r() * 8, w, 3); }
    x.fillStyle = "rgba(0,0,0,.18)"; x.beginPath(); x.arc(w * 0.52, h * 0.54, 270, 0, 7); x.fill();
    x.fillStyle = "#f6f0e4"; x.beginPath(); x.arc(w * 0.5, h * 0.5, 270, 0, 7); x.fill(); x.fillStyle = "#e6dcc8"; x.beginPath(); x.arc(w * 0.5, h * 0.5, 190, 0, 7); x.fill();
    x.fillStyle = "#fbf7ee"; x.beginPath(); x.arc(w * 0.5, h * 0.5, 170, 0, 7); x.fill(); x.fillStyle = "#6b4226"; x.beginPath(); x.arc(w * 0.5, h * 0.5, 138, 0, 7); x.fill();
    x.fillStyle = "#f2dfc2"; x.beginPath(); x.arc(w * 0.5, h * 0.5, 104, 0, 7); x.fill(); x.fillStyle = "#6b4226"; x.beginPath(); x.moveTo(w * 0.5, h * 0.5 + 62); x.bezierCurveTo(w * 0.5 - 100, h * 0.5 - 6, w * 0.5 - 40, h * 0.5 - 80, w * 0.5, h * 0.5 - 28); x.bezierCurveTo(w * 0.5 + 40, h * 0.5 - 80, w * 0.5 + 100, h * 0.5 - 6, w * 0.5, h * 0.5 + 62); x.fill();
    x.strokeStyle = "#f6f0e4"; x.lineWidth = 34; x.beginPath(); x.arc(w * 0.5 + 288, h * 0.5, 74, -1.2, 1.2); x.stroke();
    x.fillStyle = "#d9d3c6"; x.fillRect(w * 0.08, h * 0.9, w * 0.34, 14);
  } },
  lights: { name: "film light leak", w: 1000, h: 700, draw(x, w, h, r) {
    x.fillStyle = "#1c1428"; x.fillRect(0, 0, w, h);
    [[0.15, 0.3, 380, "rgba(255,120,80,.85)"], [0.85, 0.2, 330, "rgba(255,190,70,.8)"], [0.5, 0.95, 420, "rgba(190,80,220,.7)"], [0.7, 0.7, 240, "rgba(80,160,255,.55)"]].forEach(([a, b, R, c]) => glow(x, w * a, h * b, R, c, c.replace(/[\d.]+\)$/, "0)")));
    for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.25})`; x.beginPath(); x.arc(r() * w, r() * h, 1 + r() * 4, 0, 7); x.fill(); }
  } }
};
VB.SAMPLES = Object.keys(SCENES).map(k => ({ id: "s-" + k, key: k, name: SCENES[k].name, w: SCENES[k].w, h: SCENES[k].h }));
VB.sampleIds = VB.SAMPLES.map(s => s.id);
const pending = new Map();
VB.makeSample = id => {
  if (VB.assets.has(id)) return Promise.resolve(VB.assets.get(id));
  if (pending.has(id)) return pending.get(id);
  const sc = SCENES[id.replace(/^s-/, "")]; if (!sc) return Promise.resolve(null);
  const p = new Promise(res => {
    const c = document.createElement("canvas"); c.width = sc.w; c.height = sc.h; const x = c.getContext("2d"), r = VB.rng(VB.hash(id));
    sc.draw(x, sc.w, sc.h, r); finish(x, sc.w, sc.h, r, 6);
    c.toBlob(blob => { res(VB.addAssetRecord({ id, blob, w: sc.w, h: sc.h, name: "sample art: " + sc.name, credit: "generated sample art" })); }, "image/jpeg", 0.9);
  });
  pending.set(id, p); return p;
};
})();
