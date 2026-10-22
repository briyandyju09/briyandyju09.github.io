/* Scene renderer. Every board object becomes SVG markup. The same markup draws the live canvas,
   the template and board thumbnails, and the exported image, so what you see is what you export. */
(function () {
"use strict";
const VB = window.VB, esc = VB.esc;
const INK = "#0a0030";

/* ---------- constants shared with the UI ---------- */
VB.FONTS = {
  serif:     { label: "editorial", css: "'Instrument Serif', Georgia, serif", weight: 400, lh: 1.12 },
  sans:      { label: "modern", css: "'Space Grotesk', system-ui, sans-serif", weight: 500, lh: 1.25 },
  type:      { label: "typewriter", css: "'Special Elite', 'Courier New', monospace", weight: 400, lh: 1.3 },
  hand:      { label: "handwritten", css: "'Caveat', cursive", weight: 600, lh: 1.05 },
  script:    { label: "cursive", css: "'Homemade Apple', cursive", weight: 400, lh: 1.35, scale: 0.7 },
  condensed: { label: "bold condensed", css: "'Bricolage Grotesque', 'Arial Narrow', sans-serif", weight: 800, lh: 0.98, stretch: 75, upper: true },
  news:      { label: "newspaper", css: "'Old Standard TT', Georgia, serif", weight: 700, lh: 1.15 },
  mono:      { label: "mono", css: "'Courier Prime', 'Courier New', monospace", weight: 400, lh: 1.3 }
};
VB.FRAMES = {
  polaroid: { label: "classic polaroid", fc: "#fffdf8", cells: 1, cap: true },
  instant:  { label: "wide instant", fc: "#fffdf8", cells: 1, cap: true },
  square:   { label: "square border", fc: "#fffdf8", cells: 1 },
  frameless:{ label: "frameless", fc: "#fffdf8", cells: 1 },
  vintage:  { label: "vintage aged", fc: "#f0e4c8", cells: 1 },
  torn:     { label: "torn paper", fc: "#fffdf8", cells: 1 },
  taped:    { label: "masking tape", fc: "#fffdf8", cells: 1 },
  clip:     { label: "binder clip", fc: "#fffdf8", cells: 1, cap: true },
  pin:      { label: "pushpin", fc: "#fffdf8", cells: 1, cap: true },
  strip:    { label: "film strip", fc: "#1b1612", cells: 3 },
  contact:  { label: "contact sheet", fc: "#1b1612", cells: 6 }
};
VB.PAPER_SHAPES = { rect: "plain", torn: "torn", label: "label", folded: "folded", sticky: "sticky", ticket: "ticket" };
VB.PAPER_TEXTURES = { plain: "plain", grain: "grain", grid: "grid", lined: "lined", news: "newsprint", aged: "aged", tracing: "tracing" };
VB.BOARD_PAPERS = {
  offwhite: { label: "off-white paper", color: "#f8f4ea", tex: "grain" },
  cream:    { label: "cream cardstock", color: "#f1e7d0", tex: "grain" },
  aged:     { label: "aged paper", color: "#e8d6ac", tex: "aged" },
  grid:     { label: "grid paper", color: "#f8f6ee", tex: "grid" },
  lined:    { label: "lined paper", color: "#f9f6ec", tex: "lined" },
  news:     { label: "newspaper", color: "#e6e0d0", tex: "news" },
  notebook: { label: "notebook page", color: "#fbf8ef", tex: "lined" },
  matte:    { label: "matte photo paper", color: "#f3f1ec", tex: "plain" },
  kraft:    { label: "kraft paper", color: "#c8a572", tex: "kraft" },
  cork:     { label: "cork board", color: "#c79a63", tex: "cork" }
};

/* ---------- grain tile (generated once, shared by canvas and export) ---------- */
VB.grainURL = (() => {
  try {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d"), r = VB.rng(20261022);
    const img = x.createImageData(256, 256);
    for (let i = 0; i < 65536; i++) {
      const v = r() < 0.5 ? 255 : 0, a = r() < 0.55 ? Math.floor(r() * 26) : 0;
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v - (v ? 6 : 0); img.data[i * 4 + 3] = a;
    }
    x.putImageData(img, 0, 0);
    x.strokeStyle = "rgba(120,90,40,.10)"; x.lineWidth = 0.7;
    for (let i = 0; i < 70; i++) { const px = r() * 256, py = r() * 256, a = r() * 6.28, l = 6 + r() * 16; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
    return c.toDataURL("image/png");
  } catch (e) { return ""; }
})();

/* cork tile: speckled, generated once like the paper grain */
VB.corkURL = (() => {
  try {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d"), r = VB.rng(77123);
    x.fillStyle = "#c79a63"; x.fillRect(0, 0, 256, 256);
    const cols = ["#a8733b", "#dcb67f", "#8a5a2b", "#e4c595", "#b98550", "#7a4d22"];
    for (let i = 0; i < 1900; i++) {
      x.globalAlpha = 0.35 + r() * 0.55; x.fillStyle = cols[Math.floor(r() * cols.length)];
      const px = r() * 256, py = r() * 256, rr = 0.7 + r() * 2.8;
      for (const ox of [0, -256, 256]) for (const oy of [0, -256, 256]) { x.beginPath(); x.ellipse(px + ox, py + oy, rr, rr * (0.6 + r() * 0.6), r() * 3, 0, 7); x.fill(); }
    }
    x.globalAlpha = 0.5; x.fillStyle = "#5a3818";
    for (let i = 0; i < 90; i++) { x.beginPath(); x.arc(r() * 256, r() * 256, 0.8 + r() * 1.4, 0, 7); x.fill(); }
    return c.toDataURL("image/png");
  } catch (e) { return ""; }
})();

/* ---------- text measuring ---------- */
const mctx = document.createElement("canvas").getContext("2d");
const tcache = new Map();
function fontOf(el) { return VB.FONTS[el.font] || VB.FONTS.sans; }
function textStr(el) { const f = fontOf(el); return f.upper ? String(el.text || "").toUpperCase() : String(el.text || ""); }
VB.layoutText = el => {
  const f = fontOf(el), fs = el.fs * (f.scale || 1);
  const key = [el.text, el.font, el.fs, el.w, el.ls, el.lh, el.paper && el.paper.shape, VB.fontsEpoch].join("|");
  const hit = tcache.get(el.id);
  if (hit && hit.key === key) { el.h = hit.out.H; return hit.out; }
  const padK = el.paper ? ({ label: 0.7, folded: 0.6, sticky: 0.55, ticket: 0.8, torn: 0.65 }[el.paper.shape] || 0.5) : 0;
  const pad = Math.round(el.fs * padK);
  mctx.font = `${f.weight} ${fs}px ${f.css}`;
  try { mctx.letterSpacing = (el.ls || 0) * fs + "px"; mctx.fontStretch = f.stretch ? "condensed" : "normal"; } catch (e) { /* older browsers */ }
  const maxW = Math.max(24, el.w - pad * 2), lines = [];
  textStr(el).split("\n").forEach(par => {
    if (!par.trim()) { lines.push(""); return; }
    let cur = "";
    par.split(/(\s+)/).forEach(tok => {
      const t = cur + tok;
      if (mctx.measureText(t).width > maxW && cur.trim()) { lines.push(cur.trimEnd()); cur = tok.trimStart(); } else cur = t;
    });
    lines.push(cur.trimEnd());
  });
  const lhPx = fs * (el.lh || f.lh);
  const H = Math.max(lhPx + pad * 2, pad * 2 + lines.length * lhPx);
  const out = { lines, fs, lhPx, pad, f, H };
  tcache.set(el.id, { key, out });
  el.h = H;
  return out;
};
VB.fontsEpoch = 0;
VB.measureText = (str, fontKey, fs) => { const f = VB.FONTS[fontKey] || VB.FONTS.sans; mctx.font = `${f.weight} ${fs}px ${f.css}`; try { mctx.letterSpacing = "0px"; } catch (e) { /* noop */ } return mctx.measureText(str).width; };

/* ---------- shape helpers ---------- */
const f1 = n => Math.round(n * 10) / 10;
function rrPath(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return `M${f1(x + r)} ${f1(y)}H${f1(x + w - r)}Q${f1(x + w)} ${f1(y)} ${f1(x + w)} ${f1(y + r)}V${f1(y + h - r)}Q${f1(x + w)} ${f1(y + h)} ${f1(x + w - r)} ${f1(y + h)}H${f1(x + r)}Q${f1(x)} ${f1(y + h)} ${f1(x)} ${f1(y + h - r)}V${f1(y + r)}Q${f1(x)} ${f1(y)} ${f1(x + r)} ${f1(y)}Z`;
}
/* ragged rectangle: jitter along each edge. amp in px, step in px */
function raggedPath(w, h, seed, amp, step, sides) {
  const r = VB.rng(VB.hash(seed)), x0 = -w / 2, y0 = -h / 2, pts = [];
  const edge = (ax, ay, bx, by, on) => {
    const len = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(len / step));
    for (let i = 0; i < n; i++) {
      const t = i / n, j = on ? (r() - 0.5) * 2 * amp : 0;
      const nx = (by - ay) / len, ny = -(bx - ax) / len;
      pts.push([ax + (bx - ax) * t + nx * j, ay + (by - ay) * t + ny * j]);
    }
  };
  edge(x0, y0, -x0, y0, sides.top); edge(-x0, y0, -x0, -y0, sides.right);
  edge(-x0, -y0, x0, -y0, sides.bottom); edge(x0, -y0, x0, y0, sides.left);
  return "M" + pts.map(p => f1(p[0]) + " " + f1(p[1])).join("L") + "Z";
}
function paperShape(shape, W, H, id) {
  const x = -W / 2, y = -H / 2;
  switch (shape) {
    case "torn": return { d: raggedPath(W, H, id + "t", 3.2, 8, { top: 1, bottom: 1, left: 0.4, right: 0.4 }) };
    case "label": { const c = Math.min(10, H / 4); return { d: `M${x + c} ${y}H${-x - c}L${-x} ${y + c}V${-y - c}L${-x - c} ${-y}H${x + c}L${x} ${-y - c}V${y + c}Z` }; }
    case "folded": { const f = Math.min(W, H) * 0.2; return { d: `M${x} ${y}H${-x}V${-y - f}L${-x - f} ${-y}H${x}Z`, fold: `M${-x} ${-y - f}L${-x - f} ${-y - f}L${-x - f} ${-y}Z`, f }; }
    case "sticky": return { d: `M${x} ${y}H${-x}V${-y - 2}Q${f1(W * 0.25)} ${-y + 3} ${f1(x + W * 0.35)} ${-y - 1}Q${f1(x + W * 0.15)} ${-y + 2} ${x} ${-y - 2}Z` };
    case "ticket": { const r = Math.min(11, H / 4); return { d: `M${x} ${y}H${-x}V${-r}A${r} ${r} 0 0 0 ${-x} ${r}V${-y}H${x}V${r}A${r} ${r} 0 0 0 ${x} ${-r}Z` }; }
    default: return { d: rrPath(x, y, W, H, 3) };
  }
}

/* ---------- textures ---------- */
function texOverlay(kind, id, W, H, k) {
  k = k || 1;
  const x = -W / 2, y = -H / 2;
  if (kind === "grid") return `<pattern id="pg-${id}" width="${16 * k}" height="${16 * k}" patternUnits="userSpaceOnUse"><path d="M${16 * k} 0H0V${16 * k}" fill="none" stroke="#5f93bd" stroke-width="${0.8 * Math.max(1, k * 0.7)}" opacity=".5"/></pattern><rect x="${x}" y="${y}" width="${W}" height="${H}" fill="url(#pg-${id})"/>`;
  if (kind === "lined") {
    const s = 22 * k;
    return `<pattern id="pl-${id}" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><path d="M0 ${s - 1}H${s}" stroke="#6b9fc9" stroke-width="${Math.max(1, k * 0.9)}" opacity=".55"/></pattern><rect x="${x}" y="${y + s * 1.2}" width="${W}" height="${H - s * 1.2}" fill="url(#pl-${id})"/><path d="M${x + s * 2.4} ${y}V${-y}" stroke="#d9564a" stroke-width="${Math.max(1, k)}" opacity=".5"/>`;
  }
  if (kind === "newsprint") {
    const s = 6 * k, w = 130 * k, h = 96 * k;
    let rows = "";
    for (let i = 0; i < 11; i++) { const ww = (0.55 + ((i * 37) % 40) / 100) * (w - 14 * k); rows += `<rect x="${4 * k}" y="${(14 + i * 7.2) * k}" width="${ww}" height="${1.8 * k}" fill="#3a352c" opacity=".38"/>`; }
    return `<pattern id="pn-${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"><rect x="${4 * k}" y="${3 * k}" width="${w * 0.62}" height="${6 * k}" fill="#2a251c" opacity=".55"/>${rows}</pattern><rect x="${x}" y="${y}" width="${W}" height="${H}" fill="url(#pn-${id})"/>`;
  }
  if (kind === "aged") {
    const r = VB.rng(VB.hash(id + "age")); let st = "";
    for (let i = 0; i < 14; i++) st += `<ellipse cx="${f1(x + r() * W)}" cy="${f1(y + r() * H)}" rx="${f1((0.025 + r() * 0.08) * W)}" ry="${f1((0.02 + r() * 0.07) * H)}" fill="#9b6a22" opacity="${f1(0.025 + r() * 0.04)}" transform="rotate(${f1(r() * 180)} ${f1(x + W / 2)} ${f1(y + H / 2)})"/>`;
    return st + `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="none" stroke="#7d4f12" stroke-opacity=".12" stroke-width="${12 * k}"/><rect x="${x}" y="${y}" width="${W}" height="${H}" fill="none" stroke="#7d4f12" stroke-opacity=".12" stroke-width="${4 * k}"/>`;
  }
  if (kind === "kraft") {
    const w = 170 * k, h = 110 * k, r = VB.rng(VB.hash(id + "kr")); let ln = "";
    for (let i = 0; i < 26; i++) { const px = r() * w, py = r() * h, a = (r() - 0.5) * 0.5, l = (14 + r() * 40) * k; ln += `M${f1(px)} ${f1(py)}l${f1(Math.cos(a) * l)} ${f1(Math.sin(a) * l)}`; }
    return `<pattern id="pk-${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"><path d="${ln}" stroke="#6b4a1f" stroke-opacity=".16" stroke-width="${f1(1.1 * k)}" fill="none"/></pattern><rect x="${x}" y="${y}" width="${W}" height="${H}" fill="url(#pk-${id})"/>`;
  }
  if (kind === "tracing") return `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="#ffffff" opacity=".18"/><path d="M${x} ${y + H * 0.3}L${-x} ${y + H * 0.18}M${x} ${y + H * 0.7}L${-x} ${y + H * 0.6}" stroke="#fff" stroke-opacity=".5" stroke-width="${1.5 * k}"/>`;
  return "";
}
const grainRect = (W, H, th, strength, cy) => VB.grainURL && (th.grain || 0) > 0 ? `<rect x="${-W / 2}" y="${f1((cy || 0) - H / 2)}" width="${W}" height="${H}" fill="url(#grain)" opacity="${f1(Math.min(1, (th.grain || 0.5) * (strength || 1)))}" pointer-events="none"/>` : "";

/* ---------- global defs (filters, grain) ---------- */
VB.defsMarkup = doc => {
  const th = doc.theme || {}, s = th.shadow == null ? 0.5 : th.shadow;
  const sh = (id, k) => `<filter id="${id}" x="-25%" y="-25%" width="150%" height="160%" color-interpolation-filters="sRGB"><feDropShadow dx="${f1(1.2 * k * (0.4 + s))}" dy="${f1(3.2 * k * (0.4 + s))}" stdDeviation="${f1((2.2 * k * (0.3 + s)) + 0.2)}" flood-color="#2b1b06" flood-opacity="${f1(0.06 + 0.34 * s)}"/></filter>`;
  return `<defs>${sh("sh", 1)}${sh("shs", 0.55)}${VB.corkURL ? `<pattern id="cork" width="256" height="256" patternUnits="userSpaceOnUse"><image href="${VB.corkURL}" width="256" height="256"/></pattern>` : ""}${VB.grainURL ? `<pattern id="grain" width="256" height="256" patternUnits="userSpaceOnUse"><image href="${VB.grainURL}" width="256" height="256"/></pattern>` : ""}</defs>`;
};

/* ---------- element markup ---------- */
const markup = {};
VB.markup = markup;

function describe(el) {
  if (el.type === "photo") return (el.caption ? "photo: " + el.caption : "photo") + (el.goal && el.goal.title ? ", goal: " + el.goal.title : "");
  if (el.type === "text") return "note: " + String(el.text || "").slice(0, 60);
  if (el.type === "sticker") return "sticker: " + el.kind;
  if (el.type === "tape") return "tape";
  if (el.type === "imgsticker") return "image sticker";
  if (el.type === "thread") return "red thread" + (el.label ? ": " + el.label : "");
  return el.type;
}
VB.describe = describe;

/* photo layout: where the body, cells and caption sit, in the element's centred local coordinates */
VB.photoLayout = el => {
  const f = el.frame || "polaroid", W = el.w, bwm = el.bw == null ? 1 : el.bw, ar = Math.max(0.6, Math.min(1.8, el.ar || 1.25));
  const L = { f, W, H: 0, cells: [], capBox: null, hasCapArea: false };
  const cell = (x, y, w, h) => L.cells.push({ x, y, w, h });
  if (f === "polaroid" || f === "clip" || f === "pin") {
    const p = W * 0.065 * bwm, pw = W - 2 * p, ph = pw * 0.98, bot = p * 3.7;
    L.H = p + ph + bot; cell(-W / 2 + p, -L.H / 2 + p, pw, ph); L.capBox = { x: 0, y: -L.H / 2 + p + ph + bot / 2, w: pw, h: bot }; L.hasCapArea = true; L.p = p;
  } else if (f === "instant") {
    const p = W * 0.06 * bwm, pw = W - 2 * p, ph = pw * 0.78, bot = p * 3.3;
    L.H = p + ph + bot; cell(-W / 2 + p, -L.H / 2 + p, pw, ph); L.capBox = { x: 0, y: -L.H / 2 + p + ph + bot / 2, w: pw, h: bot }; L.hasCapArea = true; L.p = p;
  } else if (f === "square") {
    const p = W * 0.05 * bwm, pw = W - 2 * p;
    L.H = W; cell(-W / 2 + p, -L.H / 2 + p, pw, pw); L.p = p;
  } else if (f === "vintage") {
    const p = W * 0.075 * bwm, pw = W - 2 * p, ph = pw / ar;
    L.H = ph + p * 2.4; cell(-W / 2 + p, -L.H / 2 + p, pw, ph); L.p = p;
  } else if (f === "strip") {
    const pw = W * 0.7, ph = pw * 0.72, gap = W * 0.07, top = W * 0.07;
    L.H = top * 2 + ph * 3 + gap * 2; for (let i = 0; i < 3; i++) cell(-pw / 2, -L.H / 2 + top + i * (ph + gap), pw, ph); L.p = W * 0.15;
  } else if (f === "contact") {
    const p = W * 0.05, gap = W * 0.03, cw = (W - 2 * p - gap) / 2, chh = cw * 0.76, top = p * 2.9;
    L.H = top + p + chh * 3 + gap * 2; for (let i = 0; i < 6; i++) cell(-W / 2 + p + (i % 2) * (cw + gap), -L.H / 2 + top + Math.floor(i / 2) * (chh + gap), cw, chh); L.p = p;
  } else { /* frameless, torn, taped */
    const m = f === "torn" ? W * 0.03 : 0, pw = W - 2 * m;
    L.H = pw / ar + m * 2; cell(-W / 2 + m, -L.H / 2 + m, pw, pw / ar); L.p = m;
  }
  /* a caption on a frame without a caption area becomes a little paper label under it */
  if (el.caption && !L.hasCapArea) { L.strip = W * 0.14; L.capBox = { x: 0, y: L.H / 2 + L.strip * 0.28, w: W * 0.86, h: L.strip * 0.84 }; L.H += L.strip * 0.6; L.shift = L.strip * 0.3; }
  if (L.shift) { /* keep the whole element centred */
    L.cells.forEach(c => { c.y -= L.shift; }); L.capBox.y -= L.shift;
  }
  return L;
};

function photoFilter(el, doc) {
  const a = el.adj || {}, tone = (doc.theme && doc.theme.tone) || {};
  const b = (a.b == null ? 1 : a.b), c = (a.c == null ? 1 : a.c) * (tone.con || 1), s = (a.s == null ? 1 : a.s) * (tone.sat || 1), w = (a.w || 0) + (tone.warm || 0) + (el.frame === "vintage" ? 0.35 : 0);
  if (b === 1 && c === 1 && s === 1 && !w) return "";
  const rK = b * c * (1 + 0.14 * w), gK = b * c * (1 + 0.02 * w), bK = b * c * (1 - 0.16 * w), ic = (0.5 - 0.5 * c) * b;
  return `<filter id="f-${el.id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="${f1(rK * 100) / 100}" intercept="${f1(ic * 100) / 100}"/><feFuncG type="linear" slope="${f1(gK * 100) / 100}" intercept="${f1(ic * 100) / 100}"/><feFuncB type="linear" slope="${f1(bK * 100) / 100}" intercept="${f1(ic * 100) / 100}"/></feComponentTransfer><feColorMatrix type="saturate" values="${s}"/></filter>`;
}

function cellMarkup(el, i, cell, env, filt, clipD) {
  const c = (el.cells && el.cells[i]) || {}, cid = `cl-${el.id}-${i}`;
  const rec = c.a ? VB.assets.get(c.a) : null, url = c.a && env.asset ? env.asset(c.a) : "";
  const clip = `<clipPath id="${cid}"><path d="${clipD || rrPath(cell.x, cell.y, cell.w, cell.h, 1)}"/></clipPath>`;
  if (!rec || !url) {
    if (env.export) return `${clip}<rect x="${f1(cell.x)}" y="${f1(cell.y)}" width="${f1(cell.w)}" height="${f1(cell.h)}" fill="#d9d2c0"/>`;
    const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2, s = Math.min(cell.w, cell.h) * 0.16;
    return `${clip}<rect x="${f1(cell.x)}" y="${f1(cell.y)}" width="${f1(cell.w)}" height="${f1(cell.h)}" fill="#e9e2d0"/><rect x="${f1(cell.x + 5)}" y="${f1(cell.y + 5)}" width="${f1(cell.w - 10)}" height="${f1(cell.h - 10)}" fill="none" stroke="${INK}" stroke-opacity=".35" stroke-width="2" stroke-dasharray="7 6" rx="4"/><path d="M${f1(cx - s)} ${f1(cy)}H${f1(cx + s)}M${f1(cx)} ${f1(cy - s)}V${f1(cy + s)}" stroke="${INK}" stroke-opacity=".55" stroke-width="3.5" stroke-linecap="round"/>${cell.h > 80 ? `<text x="${f1(cx)}" y="${f1(cy + s * 2.3)}" text-anchor="middle" font-family="'Space Grotesk',sans-serif" font-size="${f1(Math.min(15, cell.w * 0.075))}" font-weight="700" fill="${INK}" fill-opacity=".6">drop a photo</text>` : ""}`;
  }
  const z = c.z || 1, sc = Math.max(cell.w / rec.w, cell.h / rec.h) * z, dw = rec.w * sc, dh = rec.h * sc;
  const maxx = Math.max(0, (dw - cell.w) / 2), maxy = Math.max(0, (dh - cell.h) / 2);
  const ox = VB.clamp((c.ox || 0) * cell.w, -maxx, maxx), oy = VB.clamp((c.oy || 0) * cell.h, -maxy, maxy);
  const cx = cell.x + cell.w / 2 + ox, cy = cell.y + cell.h / 2 + oy;
  return `${clip}<g clip-path="url(#${cid})"><image href="${url}" x="${f1(cx - dw / 2)}" y="${f1(cy - dh / 2)}" width="${f1(dw)}" height="${f1(dh)}" preserveAspectRatio="none"${filt ? ` filter="url(#f-${el.id})"` : ""}/></g>`;
}

const tapeMarkup = (id, w, h, color, pattern, opacity) => {
  const r = VB.rng(VB.hash(id)), zig = 4;
  let d = `M0 ${f1(-h / 2)}H${f1(w)}`;
  for (let i = 0; i <= 4; i++) d += `L${f1(w + (i % 2 ? zig : 0) * (r() * 0.5 + 0.7))} ${f1(-h / 2 + (h / 4) * i)}`;
  d += `H0`;
  for (let i = 4; i >= 0; i--) d += `L${f1((i % 2 ? zig : 0) * -(r() * 0.5 + 0.7))} ${f1(-h / 2 + (h / 4) * i)}`;
  d += "Z";
  const pid = `tp-${id}`;
  let pat = "";
  if (pattern === "stripe") pat = `<pattern id="${pid}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="${color}"/><rect width="7" height="14" fill="#fffdf8" opacity=".55"/></pattern>`;
  else if (pattern === "dots") pat = `<pattern id="${pid}" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="${color}"/><circle cx="7" cy="7" r="2.6" fill="#fffdf8" opacity=".75"/></pattern>`;
  else if (pattern === "check") pat = `<pattern id="${pid}" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="${color}"/><rect width="8" height="8" fill="#fffdf8" opacity=".5"/><rect x="8" y="8" width="8" height="8" fill="#fffdf8" opacity=".5"/></pattern>`;
  else if (pattern === "zigzag") pat = `<pattern id="${pid}" width="16" height="14" patternUnits="userSpaceOnUse"><rect width="16" height="14" fill="${color}"/><path d="M0 10l4-6 4 6 4-6 4 6" fill="none" stroke="#fffdf8" stroke-opacity=".7" stroke-width="2"/></pattern>`;
  else pat = `<pattern id="${pid}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${color}"/></pattern>`;
  return `<defs>${pat}</defs><path d="${d}" fill="url(#${pid})" opacity="${opacity == null ? 0.82 : opacity}"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>`;
};

function binderClip(x, y, s) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})"><path d="M-17 -34C-17 -52 17 -52 17 -34" fill="none" stroke="#9aa0a6" stroke-width="5" stroke-linecap="round"/><path d="M-26 -28H26L20 10H-20Z" fill="#242028" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M-14 -22H-6L-9 3H-16Z" fill="#fff" opacity=".18"/></g>`;
}
function pushPin(x, y, r, color) {
  const c = color || "#d9382a";
  return `<g transform="translate(${f1(x)} ${f1(y)})"><ellipse cx="${f1(r * 0.35)}" cy="${f1(r * 0.55)}" rx="${f1(r * 1.05)}" ry="${f1(r * 0.8)}" fill="#2b1b06" opacity=".28"/><circle r="${f1(r)}" fill="${c}" stroke="${INK}" stroke-width="2.4"/><ellipse cx="${f1(-r * 0.32)}" cy="${f1(-r * 0.4)}" rx="${f1(r * 0.34)}" ry="${f1(r * 0.22)}" fill="#fff" opacity=".78" transform="rotate(-25 ${f1(-r * 0.32)} ${f1(-r * 0.4)})"/></g>`;
}
VB.pushPin = pushPin;

markup.photo = (el, env) => {
  const doc = env.doc, L = VB.photoLayout(el), f = L.f, W = L.W, H = L.H, fc = el.fc || VB.FRAMES[f].fc;
  el.h = H;
  const x0 = -W / 2, y0 = -H / 2, th = doc.theme || {};
  const filt = photoFilter(el, doc);
  let out = filt, body = "", over = "";
  const imgs = L.cells.map((c, i) => {
    let clipD;
    if (f === "torn") clipD = raggedPath(c.w, c.h, el.id + "p", 2.6, 9, { top: 1, bottom: 1, left: 1, right: 1 });
    if (clipD) clipD = clipD.replace(/(-?[\d.]+) (-?[\d.]+)/g, (m, a, b) => f1(parseFloat(a) + c.x + c.w / 2) + " " + f1(parseFloat(b) + c.y + c.h / 2));
    return cellMarkup(el, i, c, env, !!filt, clipD);
  }).join("");
  const bodyH = L.strip ? H - L.strip * 0.6 : H, bodyY = -H / 2, bcy = bodyY + bodyH / 2;
  if (f === "polaroid" || f === "instant" || f === "square" || f === "clip" || f === "pin") {
    body = `<rect x="${f1(x0)}" y="${f1(bodyY)}" width="${f1(W)}" height="${f1(bodyH)}" rx="2.4" fill="${fc}"/>${grainRect(W, bodyH, th, 0.5, bcy)}<rect x="${f1(x0)}" y="${f1(bodyY)}" width="${f1(W)}" height="${f1(bodyH)}" rx="2.4" fill="none" stroke="#000" stroke-opacity=".06"/>`;
    const c = L.cells[0]; over = `<rect x="${f1(c.x)}" y="${f1(c.y)}" width="${f1(c.w)}" height="${f1(c.h)}" fill="none" stroke="#000" stroke-opacity=".14"/>`;
  } else if (f === "vintage") {
    const d = raggedPath(W, bodyH, el.id + "v", 1.7, 7, { top: 1, bottom: 1, left: 1, right: 1 });
    body = `<g transform="translate(0 ${f1(bcy)})"><path d="${d}" fill="${fc}"/><path d="${d}" fill="#9b6a22" opacity=".07"/>${grainRect(W, bodyH, th, 0.9)}<path d="${d}" fill="none" stroke="#7d4f12" stroke-opacity=".28" stroke-width="2"/></g>`;
    const c = L.cells[0]; over = `<rect x="${f1(c.x)}" y="${f1(c.y)}" width="${f1(c.w)}" height="${f1(c.h)}" fill="#9b6a22" opacity=".16"/><rect x="${f1(c.x)}" y="${f1(c.y)}" width="${f1(c.w)}" height="${f1(c.h)}" fill="none" stroke="#3a2608" stroke-opacity=".3" stroke-width="5"/>`;
  } else if (f === "torn") {
    const d = raggedPath(W - 2, bodyH - 2, el.id + "tb", 4, 12, { top: 1, bottom: 1, left: 1, right: 1 });
    body = `<g transform="translate(0 ${f1(bcy)})"><path d="${d}" fill="${fc}"/>${grainRect(W, bodyH, th, 0.6)}</g>`;
  } else if (f === "strip" || f === "contact") {
    const dark = fc;
    body = `<rect x="${f1(x0)}" y="${f1(bodyY)}" width="${f1(W)}" height="${f1(bodyH)}" rx="3" fill="${dark}"/>`;
    if (f === "strip") {
      const n = Math.round(H / (W * 0.1)), hw = W * 0.055, hh = W * 0.07, sx = W * 0.075;
      for (let i = 0; i < n; i++) { const yy = y0 + (i + 0.5) * (H / n) - hh / 2; body += `<rect x="${f1(x0 + sx)}" y="${f1(yy)}" width="${f1(hw)}" height="${f1(hh)}" rx="2" fill="#f6efe0"/><rect x="${f1(-x0 - sx - hw)}" y="${f1(yy)}" width="${f1(hw)}" height="${f1(hh)}" rx="2" fill="#f6efe0"/>`; }
    } else {
      L.cells.forEach((c, i) => { over += `<text x="${f1(c.x + 3)}" y="${f1(c.y - 4)}" font-family="'Courier Prime',monospace" font-size="${f1(W * 0.03)}" fill="#f1b24a">${i + 1}A</text>`; });
      body += `<text x="${f1(x0 + W * 0.05)}" y="${f1(y0 + W * 0.062)}" font-family="'Courier Prime',monospace" font-size="${f1(W * 0.03)}" fill="#f1b24a" letter-spacing="2">CONTACT SHEET</text>`;
    }
  }
  const shadowBody = f === "frameless" || f === "taped" ? "" : `<g filter="url(#sh)">${body}</g>`;
  const framelessShadow = (f === "frameless" || f === "taped") ? `<g filter="url(#sh)"><rect x="${f1(L.cells[0].x)}" y="${f1(L.cells[0].y)}" width="${f1(L.cells[0].w)}" height="${f1(L.cells[0].h)}" fill="#ddd"/></g>` : "";
  let deco = "";
  if (f === "taped") deco = `<g transform="translate(${f1(x0 + W * 0.1)} ${f1(L.cells[0].y + 4)}) rotate(-38)" filter="url(#shs)">${tapeMarkup(el.id + "t1", 74, 24, "#f3dca0", "plain", 0.8)}</g><g transform="translate(${f1(-x0 - W * 0.1 - 74)} ${f1(L.cells[0].y + 4)}) rotate(36)" filter="url(#shs)">${tapeMarkup(el.id + "t2", 74, 24, "#f3dca0", "plain", 0.8)}</g>`;
  if (f === "clip") deco = `<g filter="url(#shs)">${binderClip(0, bodyY + 4, Math.max(0.7, W / 300))}</g>`;
  if (f === "pin") deco = pushPin(0, bodyY + Math.max(12, W * 0.05), Math.max(9, W * 0.036), "#d9382a");
  /* caption */
  let cap = "";
  if (el.caption && L.capBox) {
    const cb = L.capBox, f2 = VB.FONTS.hand;
    let fs = Math.min(cb.h * 0.52, W * 0.095);
    const mw = VB.measureText(el.caption, "hand", fs);
    if (mw > cb.w) fs *= cb.w / mw;
    if (L.hasCapArea) cap = `<text x="0" y="${f1(cb.y)}" text-anchor="middle" dominant-baseline="central" font-family="${f2.css}" font-weight="600" font-size="${f1(fs)}" fill="#2a2440" transform="rotate(-1.2 0 ${f1(cb.y)})">${esc(el.caption)}</text>`;
    else cap = `<g filter="url(#shs)"><rect x="${f1(-cb.w / 2)}" y="${f1(cb.y - cb.h / 2)}" width="${f1(cb.w)}" height="${f1(cb.h)}" fill="#fbf4e1" transform="rotate(-1.4 0 ${f1(cb.y)})"/></g><text x="0" y="${f1(cb.y)}" text-anchor="middle" dominant-baseline="central" font-family="${f2.css}" font-weight="600" font-size="${f1(fs)}" fill="#2a2440" transform="rotate(-1.4 0 ${f1(cb.y)})">${esc(el.caption)}</text>`;
  }
  out += framelessShadow + shadowBody + imgs + over + cap + deco;
  return out;
};

markup.text = (el, env) => {
  const doc = env.doc, lt = VB.layoutText(el), f = lt.f, W = el.w, H = el.h, pad = lt.pad;
  const th = doc.theme || {}, p = el.paper;
  let out = "";
  if (p) {
    const sh = paperShape(p.shape || "rect", W, H, el.id), color = p.color || "#fbf4e1", tex = p.texture || "plain";
    const alpha = tex === "tracing" ? 0.62 : 1;
    out += `<clipPath id="pc-${el.id}"><path d="${sh.d}"/></clipPath><g filter="url(#sh)"><path d="${sh.d}" fill="${color}" opacity="${alpha}"/></g><g clip-path="url(#pc-${el.id})">${texOverlay(tex === "grain" ? "" : tex, el.id, W, H, 1)}${tex !== "tracing" ? grainRect(W, H, th, 1) : ""}`;
    if (p.shape === "sticky") out += `<rect x="${-W / 2}" y="${-H / 2}" width="${W}" height="${f1(H * 0.1)}" fill="#000" opacity=".07"/>`;
    if (p.shape === "label") out += `<path d="${paperShape("label", W - 12, H - 12, el.id).d}" fill="none" stroke="${INK}" stroke-opacity=".45" stroke-width="1.4" stroke-dasharray="4 3"/>`;
    out += `</g>`;
    if (p.shape === "folded" && sh.fold) out += `<path d="${sh.fold}" fill="#000" opacity=".16"/><path d="${sh.fold}" fill="${color}" opacity=".85"/><path d="${sh.fold}" fill="none" stroke="#000" stroke-opacity=".18"/>`;
    if (p.shape === "torn") out += `<path d="${sh.d}" fill="none" stroke="#000" stroke-opacity=".07"/>`;
  }
  const align = el.align || "left", ax = align === "center" ? 0 : align === "right" ? W / 2 - pad : -W / 2 + pad;
  const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
  const top = -H / 2 + pad;
  const stroke = el.outline && el.outline.w ? ` stroke="${el.outline.c}" stroke-width="${el.outline.w}" stroke-linejoin="round" paint-order="stroke"` : "";
  const style = `font-family:${f.css.replace(/"/g, "'")};font-weight:${f.weight};${f.stretch ? `font-stretch:${f.stretch}%;font-variation-settings:'wdth' ${f.stretch};` : ""}`;
  let lines = "";
  if (VB.editingId !== el.id) lt.lines.forEach((ln, i) => { if (ln) lines += `<text x="${f1(ax)}" y="${f1(top + i * lt.lhPx + lt.lhPx / 2)}" text-anchor="${anchor}" dominant-baseline="central" xml:space="preserve">${esc(ln)}</text>`; });
  out += `<g style="${style}" font-size="${f1(lt.fs)}" fill="${el.color || INK}" letter-spacing="${f1((el.ls || 0) * lt.fs)}"${stroke}>${lines}</g>`;
  return out;
};

markup.sticker = (el, env) => {
  const def = VB.stickerMap && VB.stickerMap()[el.kind];
  if (!def) return `<rect x="${-el.w / 2}" y="${-el.h / 2}" width="${el.w}" height="${el.h}" fill="none" stroke="${INK}" stroke-dasharray="6 4"/>`;
  const k = el.w / def.w, a = el.a || def.a, b = el.b || def.b;
  el.h = def.h * k;
  const inner = `<g transform="scale(${el.flip ? -k : k} ${k}) translate(${-def.w / 2} ${-def.h / 2})">${def.svg(a, b)}</g>`;
  if (el.border === false) return `<g filter="url(#shs)">${inner}</g>`;
  const r = Math.max(2, Math.round(Math.min(el.w, el.h) * 0.035));
  return `<filter id="dc-${el.id}" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="d"/><feFlood flood-color="#fffdf8"/><feComposite in2="d" operator="in" result="w"/><feDropShadow in="w" dx="1.2" dy="2.6" stdDeviation="2" flood-color="#2b1b06" flood-opacity=".3" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter><g filter="url(#dc-${el.id})">${inner}</g>`;
};

markup.imgsticker = (el, env) => {
  const rec = VB.assets.get(el.asset), url = env.asset && env.asset(el.asset);
  if (!rec || !url) return `<rect x="${-el.w / 2}" y="${-el.h / 2}" width="${el.w}" height="${el.h}" fill="#e9e2d0" stroke="${INK}" stroke-dasharray="6 4"/>`;
  el.h = el.w * rec.h / rec.w;
  const r = el.cut === false ? 0 : Math.max(2, Math.round(el.w * 0.02 * (el.bs == null ? 1 : el.bs)));
  const img = `<image href="${url}" x="${-el.w / 2}" y="${-el.h / 2}" width="${el.w}" height="${el.h}" preserveAspectRatio="none"/>`;
  if (!r) return `<g filter="url(#shs)">${img}</g>`;
  return `<filter id="dc-${el.id}" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="d"/><feFlood flood-color="#fffdf8"/><feComposite in2="d" operator="in" result="w"/><feDropShadow in="w" dx="1.2" dy="2.6" stdDeviation="2" flood-color="#2b1b06" flood-opacity=".3" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter><g filter="url(#dc-${el.id})">${img}</g>`;
};

markup.tape = (el, env) => {
  return `<g filter="url(#shs)"><g transform="translate(${f1(-el.w / 2)} 0)">${tapeMarkup(el.id, el.w, el.h, el.color || "#f3dca0", el.pattern || "plain", el.opacity)}</g></g>`;
};

/* thread geometry */
VB.threadPts = (el, byId) => el.pts.map(p => {
  if (p.att) {
    const t = byId(p.att.id);
    if (t) { const r = VB.rot(p.att.nx * t.w / 2, p.att.ny * t.h / 2, t.rot || 0); return { x: t.x + r[0], y: t.y + r[1], att: t }; }
  }
  return { x: p.x || 0, y: p.y || 0 };
});
VB.threadPath = (pts, sag) => {
  let d = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1], len = Math.hypot(q.x - p.x, q.y - p.y);
    d += `M${f1(p.x)} ${f1(p.y)}Q${f1((p.x + q.x) / 2)} ${f1((p.y + q.y) / 2 + len * sag)} ${f1(q.x)} ${f1(q.y)}`;
  }
  return d;
};
VB.threadBox = el => {
  const byId = VB.currentById || (() => null), pts = VB.threadPts(el, byId);
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y), sag = (el.sag || 0);
  let maxLen = 0; for (let i = 0; i < pts.length - 1; i++) maxLen = Math.max(maxLen, Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y));
  return { x1: Math.min(...xs) - 12, y1: Math.min(...ys) - 12, x2: Math.max(...xs) + 12, y2: Math.max(...ys) + 12 + Math.max(0, maxLen * sag * 0.5) };
};
markup.thread = (el, env) => {
  const pts = VB.threadPts(el, env.byId), th = el.th || 2.4, col = el.color || "#d9382a";
  if (pts.length < 2) return "";
  const d = VB.threadPath(pts, el.sag == null ? 0.1 : el.sag);
  let out = "";
  if (!env.export) out += `<path class="hit" d="${d}" fill="none" stroke="transparent" stroke-width="${Math.max(18, th + 14)}" stroke-linecap="round"/>`;
  out += `<path d="${d}" fill="none" stroke="#2b1b06" stroke-opacity=".22" stroke-width="${f1(th + 1.2)}" stroke-linecap="round" transform="translate(1.6 3.2)"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${f1(th)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="${f1(th * 0.34)}" stroke-dasharray="2.5 4.5" stroke-linecap="round" transform="translate(-.4 -.5)"/>`;
  if (el.pins !== false) {
    const r = Math.max(8, 6.5 + th * 1.4);
    pts.forEach((p, i) => { out += pushPin(p.x, p.y, i === 0 || i === pts.length - 1 ? r : r * 0.8, el.pinColor || "#d9382a"); });
  }
  if (el.label) {
    const i = Math.floor((pts.length - 1) / 2), p = pts[i], q = pts[i + 1], len = Math.hypot(q.x - p.x, q.y - p.y);
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2 + len * (el.sag == null ? 0.1 : el.sag) * 0.5;
    const fs = 26, w = Math.max(60, VB.measureText(el.label, "hand", fs) + 26);
    out += `<g transform="translate(${f1(mx)} ${f1(my)}) rotate(${f1((Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI) * 0.25 - 2)})"><g filter="url(#shs)"><rect x="${f1(-w / 2)}" y="-16" width="${f1(w)}" height="32" rx="4" fill="#fbf4e1"/></g><rect x="${f1(-w / 2 + 3)}" y="-13" width="${f1(w - 6)}" height="26" rx="2" fill="none" stroke="${INK}" stroke-opacity=".3" stroke-dasharray="3 3"/><text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-family="'Caveat',cursive" font-weight="600" font-size="${fs}" fill="#2a2440">${esc(el.label)}</text></g>`;
  }
  return out;
};

/* goal badge: a tiny progress sticker in the corner of an object */
function goalBadge(el) {
  const g = el.goal; if (!g || (!g.title && !g.steps)) return "";
  const steps = g.steps || [], done = steps.filter(s => s.d).length;
  const pr = g.status === "done" ? 100 : (steps.length ? Math.round(done / steps.length * 100) : (g.progress || 0));
  const r = 15, cx = el.w / 2 - 6, cy = -el.h / 2 + 6, C = 2 * Math.PI * (r - 3);
  return `<g transform="translate(${f1(cx)} ${f1(cy)})" class="badge"><circle r="${r}" fill="${g.status === "done" ? "#cfff00" : "#f5ffcf"}" stroke="${INK}" stroke-width="2.5"/><circle r="${r - 3}" fill="none" stroke="${INK}" stroke-opacity=".18" stroke-width="3"/><circle r="${r - 3}" fill="none" stroke="#9457eb" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="${f1(C * pr / 100)} ${f1(C)}" transform="rotate(-90)"/>${g.status === "done" ? `<path d="M-5 0l3.500 4 6-8" fill="none" stroke="${INK}" stroke-width="2.800" stroke-linecap="round" stroke-linejoin="round"/>` : `<text y="1" text-anchor="middle" dominant-baseline="central" font-family="'Bricolage Grotesque',sans-serif" font-weight="800" font-size="10" fill="${INK}">${pr}</text>`}</g>`;
}

/* a complete element: wrapper-less inner markup. env = {doc, byId, asset(id)->url, export} */
VB.elInner = (el, env) => {
  const fn = markup[el.type]; if (!fn) return "";
  let s = fn(el, env);
  if (env.badges && el.type !== "thread") s += goalBadge(el);
  return s;
};
VB.elHit = el => el.type === "thread" ? "" : `<rect class="hit" x="${f1(-el.w / 2 - 4)}" y="${f1(-el.h / 2 - 4)}" width="${f1(el.w + 8)}" height="${f1(el.h + 8)}" fill="transparent"/>`;
VB.elTransform = el => el.type === "thread" ? "" : `translate(${f1(el.x)} ${f1(el.y)}) rotate(${f1(el.rot || 0)})`;

/* ---------- artboard ---------- */
VB.artboardInner = (doc, env) => {
  const ab = doc.artboard, th = doc.theme || {}, P = VB.BOARD_PAPERS[th.paper] || VB.BOARD_PAPERS.cream;
  const color = th.paperColor || P.color, W = ab.w, H = ab.h, k = Math.max(1.4, W / 900);
  const cx = W / 2, cy = H / 2;
  let tex = P.tex;
  let out = `<rect x="0" y="0" width="${W}" height="${H}" fill="${color}"/><g transform="translate(${cx} ${cy})">`;
  if (tex === "grid" || tex === "lined" || tex === "news" || tex === "aged" || tex === "kraft") out += texOverlay(tex === "news" ? "newsprint" : tex, "ab", W, H, k * (tex === "grid" ? 2.2 : tex === "news" ? 1.6 : 1.4));
  if (tex === "cork") out += `<rect x="${-W / 2}" y="${-H / 2}" width="${W}" height="${H}" fill="url(#cork)"/>`;
  out += grainRect(W, H, th, tex === "cork" ? 0.5 : tex === "kraft" ? 1.8 : 1.2) + `</g>`;
  return out;
};

/* ---------- full document to a standalone SVG string (thumbnails, export) ---------- */
VB.coverView = (doc, aspect) => {
  aspect = aspect || 1.5;
  let box = { x: 0, y: 0, w: doc.artboard.w, h: doc.artboard.h };
  const vis = doc.elements.filter(e => !e.hidden);
  if (vis.length) {
    const prev = VB.currentById; VB.currentById = id => doc.elements.find(e => e.id === id);
    const u = VB.unionBox(vis); VB.currentById = prev;
    const m = Math.max(60, (u.x2 - u.x1) * 0.05); box = { x: u.x1 - m, y: u.y1 - m, w: u.x2 - u.x1 + 2 * m, h: u.y2 - u.y1 + 2 * m };
  }
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2; let w = box.w, h = box.h;
  if (w / h < aspect) w = h * aspect; else h = w / aspect;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
};
VB.stickerMap = () => VB._sm || (VB._sm = Object.fromEntries((window.VB_STICKERS || []).map(x => [x.id, x])));

VB.docSVG = (doc, o) => {
  o = o || {};
  const ab = doc.artboard, vb = o.view || { x: 0, y: 0, w: ab.w, h: ab.h };
  const byIdMap = new Map(doc.elements.map(e => [e.id, e]));
  const env = { doc, export: !!o.export, byId: id => byIdMap.get(id), asset: o.asset || VB.assetUrl, badges: !!o.badges };
  const prev = VB.currentById; VB.currentById = env.byId;
  let items = "";
  doc.elements.forEach(el => {
    if (el.hidden) return;
    const tf = VB.elTransform(el);
    items += `<g${tf ? ` transform="${tf}"` : ""}${el.op != null && el.op < 1 ? ` opacity="${el.op}"` : ""}>${VB.elInner(el, env)}</g>`;
  });
  VB.currentById = prev;
  const bg = o.transparent ? "" : (o.fill ? `<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="${o.fill}"/>` : "");
  const board = o.transparent ? "" : VB.artboardInner(doc, env);
  const w = o.width || vb.w, h = o.height || vb.h;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${f1(vb.x)} ${f1(vb.y)} ${f1(vb.w)} ${f1(vb.h)}" width="${w}" height="${h}" preserveAspectRatio="${o.par || "xMidYMid slice"}">${o.style ? `<style>${o.style}</style>` : ""}${VB.defsMarkup(doc)}${bg}${board}${items}</svg>`;
  if (o.uid) ["sh", "shs", "grain"].forEach(n => { out = out.split(`id="${n}"`).join(`id="${n}${o.uid}"`).split(`url(#${n})`).join(`url(#${n}${o.uid})`); });
  return out;
};

/* ---------- live DOM scene ---------- */
const NS = "http://www.w3.org/2000/svg";
VB.scene = {
  nodes: new Map(), stage: null, world: null, items: null, abg: null, abshadow: null, defs: null,
  init() {
    const S = VB.scene;
    S.stage = VB.$("#stage");
    S.stage.innerHTML = `<g id="defsHost"></g><g id="world"><rect id="abshadow" fill="var(--shadow-c)"/><g id="artboard"></g><rect id="abframe" fill="none" stroke="var(--ink)" stroke-width="3" vector-effect="non-scaling-stroke"/><rect id="gridrect" fill="url(#gridpat)" pointer-events="none" display="none"/><g id="items"></g></g>`;
    S.world = VB.$("#world", S.stage); S.items = VB.$("#items", S.stage); S.abg = VB.$("#artboard", S.stage);
    S.defs = VB.$("#defsHost", S.stage); S.abshadow = VB.$("#abshadow", S.stage); S.abframe = VB.$("#abframe", S.stage);
  },
  env() {
    const doc = VB.doc, map = VB.byIdMap || new Map(doc.elements.map(e => [e.id, e]));
    return { doc, byId: id => map.get(id), asset: VB.assetUrl, export: false, badges: !!(doc.view && doc.view.badges !== false) };
  },
  reindex() { VB.byIdMap = new Map(VB.doc.elements.map(e => [e.id, e])); VB.currentById = id => VB.byIdMap.get(id); },
  all() {
    const S = VB.scene; S.reindex(); S.nodes.forEach(n => n.remove()); S.nodes.clear();
    S.chrome();
    VB.doc.elements.forEach(e => S.el(e, true));
    S.order();
  },
  chrome() {
    const S = VB.scene, ab = VB.doc.artboard;
    S.defs.innerHTML = VB.defsMarkup(VB.doc) + `<defs><pattern id="gridpat" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" stroke="#0a0030" stroke-opacity=".2" stroke-width="1.2" vector-effect="non-scaling-stroke"/><path d="M50 0V100M0 50H100" fill="none" stroke="#0a0030" stroke-opacity=".08" stroke-width="1" vector-effect="non-scaling-stroke"/></pattern></defs>`;
    const gr = VB.$("#gridrect", S.stage); gr.setAttribute("width", ab.w); gr.setAttribute("height", ab.h); gr.setAttribute("display", VB.doc.view && VB.doc.view.grid ? "" : "none");
    S.abg.innerHTML = VB.artboardInner(VB.doc, S.env());
    S.abframe.setAttribute("x", 0); S.abframe.setAttribute("y", 0); S.abframe.setAttribute("width", ab.w); S.abframe.setAttribute("height", ab.h);
    S.abshadow.setAttribute("width", ab.w); S.abshadow.setAttribute("height", ab.h);
    S.shadowOffset();
  },
  shadowOffset() { const z = VB.view ? VB.view.z : 1, o = 6 / z; VB.scene.abshadow.setAttribute("x", o); VB.scene.abshadow.setAttribute("y", o); },
  el(el, skipIndex) {
    const S = VB.scene;
    if (!skipIndex && !VB.byIdMap.has(el.id)) S.reindex();
    let g = S.nodes.get(el.id);
    if (!g) {
      g = document.createElementNS(NS, "g"); g.setAttribute("class", "el" + (el.type === "thread" ? " thread" : "")); g.dataset.id = el.id;
      g.setAttribute("tabindex", "0"); g.setAttribute("role", "img");
      S.items.appendChild(g); S.nodes.set(el.id, g);
    }
    const env = S.env();
    let inner = "";
    try { inner = VB.elHit(el) + VB.elInner(el, env); } catch (e) { console.error("render", el.type, e); }
    g.innerHTML = inner;
    S.place(el);
    g.setAttribute("aria-label", describe(el));
    g.classList.toggle("locked", !!el.locked);
    g.style.display = el.hidden ? "none" : "";
    return g;
  },
  place(el) {
    const g = VB.scene.nodes.get(el.id); if (!g) return;
    const tf = VB.elTransform(el);
    if (tf) g.setAttribute("transform", tf); else g.removeAttribute("transform");
    if (el.op != null && el.op < 1) g.setAttribute("opacity", el.op); else g.removeAttribute("opacity");
  },
  /* threads follow the objects they are pinned to */
  threads() { VB.doc.elements.forEach(e => { if (e.type === "thread") VB.scene.el(e); }); },
  remove(id) { const n = VB.scene.nodes.get(id); if (n) n.remove(); VB.scene.nodes.delete(id); },
  order() { const S = VB.scene; VB.doc.elements.forEach(e => { const n = S.nodes.get(e.id); if (n) S.items.appendChild(n); }); }
};
})();
