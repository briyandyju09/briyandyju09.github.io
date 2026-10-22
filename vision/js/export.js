/* Export: the board is rendered from the same SVG markup as the editor, then rasterised to PNG / JPEG / PDF. */
(function () {
"use strict";
const VB = window.VB;

VB.EXPORT_PRESETS = {
  board:     { label: "board size", w: 0, h: 0 },
  desktop:   { label: "desktop wallpaper 1920 x 1080", w: 1920, h: 1080 },
  desktop4k: { label: "desktop wallpaper 4K", w: 3840, h: 2160 },
  mobile:    { label: "mobile wallpaper 1170 x 2532", w: 1170, h: 2532 },
  square:    { label: "square 2048", w: 2048, h: 2048 },
  portrait:  { label: "portrait print 2:3", w: 2400, h: 3600 },
  landscape: { label: "landscape print 3:2", w: 3600, h: 2400 },
  custom:    { label: "custom size", w: 0, h: 0 }
};

let fontCssCache = null;
async function fontCss() {
  if (fontCssCache) return fontCssCache;
  const list = window.VB_FONTFILES || [];
  const parts = await Promise.all(list.map(async f => {
    const res = await fetch("fonts/" + f.file); if (!res.ok) throw new Error("font file missing: " + f.file);
    const buf = new Uint8Array(await res.arrayBuffer()); let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};${f.stretch ? `font-stretch:${f.stretch};` : ""}src:url(data:font/woff2;base64,${btoa(s)}) format('woff2');}`;
  }));
  return (fontCssCache = parts.join(""));
}

VB.exportSize = (doc, o) => {
  const ab = doc.artboard, p = VB.EXPORT_PRESETS[o.preset] || VB.EXPORT_PRESETS.board;
  let w, h;
  if (o.preset === "custom") { w = Math.round(o.w || ab.w); h = Math.round(o.h || ab.h); }
  else if (p.w) { w = p.w; h = p.h; }
  else { const s = o.scale || 1; w = Math.round(ab.w * s); h = Math.round(ab.h * s); }
  const max = Math.max(w, h), cap = 8000;
  if (max > cap) { const k = cap / max; w = Math.round(w * k); h = Math.round(h * k); }
  return { w: Math.max(16, w), h: Math.max(16, h) };
};
VB.exportView = (doc, o, size) => {
  const ab = doc.artboard, ta = size.w / size.h;
  let box = { x: 0, y: 0, w: ab.w, h: ab.h };
  if (o.fit === "content" && doc.elements.length) {
    const prev = VB.currentById; VB.currentById = id => doc.elements.find(e => e.id === id);
    const u = VB.unionBox(doc.elements.filter(e => !e.hidden)); VB.currentById = prev;
    const m = 70; box = { x: u.x1 - m, y: u.y1 - m, w: u.x2 - u.x1 + 2 * m, h: u.y2 - u.y1 + 2 * m };
  }
  const aa = box.w / box.h, cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  let w, h;
  const cover = o.fit === "cover";
  if ((ta > aa) !== cover) { h = box.h; w = h * ta; } else { w = box.w; h = w / ta; }
  return { x: cx - w / 2, y: cy - h / 2, w, h };
};

VB.renderExport = async (doc, o) => {
  o = Object.assign({ preset: "board", fit: "cover", scale: 1, transparent: false, maxSide: 0 }, o || {});
  let size = VB.exportSize(doc, o);
  if (o.maxSide && Math.max(size.w, size.h) > o.maxSide) { const k = o.maxSide / Math.max(size.w, size.h); size = { w: Math.round(size.w * k), h: Math.round(size.h * k) }; }
  const view = VB.exportView(doc, o, size);
  /* pictures become data URLs, so the standalone SVG can carry them */
  const urls = {};
  for (const id of VB.assetIdsOf(doc.elements)) {
    try { await VB.loadAsset(id); urls[id] = await VB.assetDataURL(id); }
    catch (e) { throw new Error("one of the pictures could not be read, so the export stopped. re-add it and try again"); }
  }
  let css = "";
  try { css = await fontCss(); } catch (e) { throw new Error("the fonts could not be loaded for export. open the site through its web address and try again"); }
  const P = VB.BOARD_PAPERS[(doc.theme || {}).paper] || VB.BOARD_PAPERS.cream;
  const svg = VB.docSVG(doc, { export: true, view, width: size.w, height: size.h, par: "none", style: css, transparent: o.transparent, fill: (doc.theme && doc.theme.paperColor) || P.color, asset: id => urls[id] || "", badges: !!o.badges });
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image(); img.decoding = "sync";
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("the browser could not draw this board as an image")); img.src = url; });
    const c = document.createElement("canvas"); c.width = size.w; c.height = size.h;
    const x = c.getContext("2d");
    /* first pass warms the embedded fonts, second pass is the real picture */
    const warm = document.createElement("canvas"); warm.width = warm.height = 8; warm.getContext("2d").drawImage(img, 0, 0, 8, 8);
    await VB.sleep(60);
    if (o.format === "jpeg" || o.format === "pdf" || !o.transparent) { /* opaque formats get a paper-coloured base */ }
    if (o.format === "jpeg" || o.format === "pdf") { x.fillStyle = (doc.theme && doc.theme.paperColor) || P.color; x.fillRect(0, 0, size.w, size.h); }
    x.drawImage(img, 0, 0, size.w, size.h);
    return { canvas: c, w: size.w, h: size.h };
  } finally { URL.revokeObjectURL(url); }
};

/* ---------- minimal PDF writer: one page, one JPEG ---------- */
VB.makePDF = async (canvas, page, quality) => {
  const jpeg = await new Promise(r => canvas.toBlob(r, "image/jpeg", quality || 0.92));
  if (!jpeg) throw new Error("could not make the picture for the PDF");
  const jb = new Uint8Array(await jpeg.arrayBuffer()), iw = canvas.width, ih = canvas.height;
  const SIZES = { a4: [595.28, 841.89], a3: [841.89, 1190.55], letter: [612, 792] };
  let pw, ph;
  if (page === "fit" || !SIZES[page]) { pw = iw * 0.75; ph = ih * 0.75; }
  else { let [a, b] = SIZES[page]; if (iw > ih) { pw = b; ph = a; } else { pw = a; ph = b; } }
  const k = Math.min(pw / iw, ph / ih), dw = iw * k, dh = ih * k, ox = (pw - dw) / 2, oy = (ph - dh) / 2;
  const enc = new TextEncoder(), chunks = [], offs = []; let len = 0;
  const push = b => { const u = typeof b === "string" ? enc.encode(b) : b; chunks.push(u); len += u.length; };
  const obj = (n, s) => { offs[n] = len; push(`${n} 0 obj\n${s}\nendobj\n`); };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1, "<</Type/Catalog/Pages 2 0 R>>"); obj(2, "<</Type/Pages/Kids[3 0 R]/Count 1>>");
  obj(3, `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${pw.toFixed(2)} ${ph.toFixed(2)}]/Contents 4 0 R/Resources<</XObject<</Im0 5 0 R>>>>>>`);
  const content = `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${ox.toFixed(2)} ${oy.toFixed(2)} cm /Im0 Do Q`;
  obj(4, `<</Length ${content.length}>>\nstream\n${content}\nendstream`);
  offs[5] = len; push(`5 0 obj\n<</Type/XObject/Subtype/Image/Width ${iw}/Height ${ih}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${jb.length}>>\nstream\n`); push(jb); push("\nendstream\nendobj\n");
  const xr = len; let x = "xref\n0 6\n0000000000 65535 f \n"; for (let i = 1; i <= 5; i++) x += String(offs[i]).padStart(10, "0") + " 00000 n \n";
  push(x + `trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n${xr}\n%%EOF`);
  const out = new Uint8Array(len); let p = 0; chunks.forEach(c => { out.set(c, p); p += c.length; });
  return new Blob([out], { type: "application/pdf" });
};

VB.download = (blob, name) => {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};
VB.exportFile = async (doc, o) => {
  const r = await VB.renderExport(doc, o);
  const base = (doc.name || "vision-board").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "vision-board";
  let blob, ext;
  if (o.format === "pdf") { blob = await VB.makePDF(r.canvas, o.page || "fit", o.quality); ext = "pdf"; }
  else if (o.format === "jpeg") { blob = await new Promise(res => r.canvas.toBlob(res, "image/jpeg", o.quality || 0.92)); ext = "jpg"; }
  else { blob = await new Promise(res => r.canvas.toBlob(res, "image/png")); ext = "png"; }
  if (!blob) throw new Error("the browser could not create the file. try a smaller size");
  VB.download(blob, `${base}-${r.w}x${r.h}.${ext}`);
  return { w: r.w, h: r.h, bytes: blob.size, ext };
};
})();
