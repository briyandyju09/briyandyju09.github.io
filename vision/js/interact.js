/* Canvas interaction: pan, zoom, select, move, resize, rotate, snap guides, red-thread tool, text editing, keyboard. */
(function () {
"use strict";
const VB = window.VB, $ = VB.$, NS = "http://www.w3.org/2000/svg";
const I = VB.interact = { tool: "select", space: false, cropId: null, editing: null, guides: [], marquee: null, threadDraft: null, hoverTarget: null };
let wrap, stage, ov, ovg, ctx;
const pointers = new Map();
let drag = null, pinch = null, panning = null;

/* ---------- view ---------- */
VB.setView = (v, quiet) => {
  Object.assign(VB.view, v);
  VB.view.z = VB.clamp(VB.view.z, 0.05, 6);
  VB.scene.world.setAttribute("transform", `translate(${VB.view.x} ${VB.view.y}) scale(${VB.view.z})`);
  VB.scene.shadowOffset();
  if (I.editing && I.fitEditor) I.fitEditor();
  I.draw(); VB.emit("view");
  if (!quiet && VB.doc) { VB.doc.view = VB.view; VB.viewSave(); }
};
VB.viewSave = VB.debounce(() => { if (VB.doc && !VB.dirty) VB.saveNow(); else VB.saveSoon(); }, 1500);
const toWorld = (cx, cy) => { const r = wrap.getBoundingClientRect(); return { x: (cx - r.left - VB.view.x) / VB.view.z, y: (cy - r.top - VB.view.y) / VB.view.z }; };
const toScreen = (x, y) => ({ x: x * VB.view.z + VB.view.x, y: y * VB.view.z + VB.view.y });
I.toWorld = toWorld; I.toScreen = toScreen;
VB.zoomAt = (k, cx, cy) => {
  const r = wrap.getBoundingClientRect(), px = (cx == null ? r.width / 2 : cx - r.left), py = (cy == null ? r.height / 2 : cy - r.top);
  const z = VB.clamp(VB.view.z * k, 0.05, 6), f = z / VB.view.z;
  VB.setView({ z, x: px - (px - VB.view.x) * f, y: py - (py - VB.view.y) * f });
};
VB.zoomBox = (b, pad) => {
  const r = wrap.getBoundingClientRect(); pad = pad == null ? 60 : pad;
  const w = Math.max(40, b.x2 - b.x1), h = Math.max(40, b.y2 - b.y1);
  const z = VB.clamp(Math.min((r.width - pad * 2) / w, (r.height - pad * 2) / h), 0.05, 4);
  VB.setView({ z, x: r.width / 2 - (b.x1 + w / 2) * z, y: r.height / 2 - (b.y1 + h / 2) * z });
};
VB.fit = () => {
  const ab = VB.doc.artboard, b = { x1: 0, y1: 0, x2: ab.w, y2: ab.h };
  VB.zoomBox(b, window.innerWidth < 900 ? 24 : 36);
};

/* ---------- picking ---------- */
const elFrom = n => { const g = n && n.closest && n.closest("#items .el"); return g ? VB.byId(g.dataset.id) : null; };
I.pick = (cx, cy, skipThreads) => {
  const list = document.elementsFromPoint(cx, cy);
  for (const n of list) { const e = elFrom(n); if (e && !(skipThreads && e.type === "thread") && !e.hidden) return e; }
  return null;
};

/* ---------- overlay drawing ---------- */
const S = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a || {}) e.setAttribute(k, a[k]); return e; };
const touch = () => window.matchMedia("(pointer: coarse)").matches;
I.draw = () => {
  if (!ovg || !VB.doc) return;
  ovg.replaceChildren();
  const sel = VB.selEls().filter(e => !e.hidden), z = VB.view.z;
  const ink = "#0a0030", vio = "#9457eb";
  /* guides */
  I.guides.forEach(g => {
    const r = wrap.getBoundingClientRect();
    if (g.axis === "x") { const sx = toScreen(g.v, 0).x; ovg.append(S("line", { x1: sx, y1: 0, x2: sx, y2: r.height, stroke: vio, "stroke-width": 1.5, "stroke-dasharray": "5 4" })); }
    else { const sy = toScreen(0, g.v).y; ovg.append(S("line", { x1: 0, y1: sy, x2: r.width, y2: sy, stroke: vio, "stroke-width": 1.5, "stroke-dasharray": "5 4" })); }
  });
  if (I.marquee) { const m = I.marquee; ovg.append(S("rect", { x: Math.min(m.x1, m.x2), y: Math.min(m.y1, m.y2), width: Math.abs(m.x2 - m.x1), height: Math.abs(m.y2 - m.y1), fill: "rgba(148,87,235,.14)", stroke: vio, "stroke-width": 2, "stroke-dasharray": "6 4", rx: 6 })); }
  if (I.threadDraft && I.threadDraft.cur) {
    const a = toScreen(I.threadDraft.p0.x, I.threadDraft.p0.y), b = toScreen(I.threadDraft.cur.x, I.threadDraft.cur.y);
    ovg.append(S("path", { d: `M${a.x} ${a.y}Q${(a.x + b.x) / 2} ${(a.y + b.y) / 2 + Math.hypot(b.x - a.x, b.y - a.y) * 0.1} ${b.x} ${b.y}`, fill: "none", stroke: "#d9382a", "stroke-width": 3, "stroke-dasharray": "2 7", "stroke-linecap": "round" }));
    ovg.append(S("circle", { cx: a.x, cy: a.y, r: 8, fill: "#d9382a", stroke: ink, "stroke-width": 2.5 }));
    if (I.threadDraft.hoverEl) { const h = I.threadDraft.hoverEl, c = VB.corners(h).map(p => toScreen(p[0], p[1])); ovg.append(S("polygon", { points: c.map(p => p.x + "," + p.y).join(" "), fill: "rgba(207,255,0,.25)", stroke: ink, "stroke-width": 2.5, "stroke-dasharray": "6 4" })); }
  }
  /* crop mode hint */
  if (I.cropId) { const e = VB.byId(I.cropId); if (e) { const c = VB.corners(e).map(p => toScreen(p[0], p[1])); ovg.append(S("polygon", { points: c.map(p => p.x + "," + p.y).join(" "), fill: "none", stroke: "#cfff00", "stroke-width": 4 })); ovg.append(S("polygon", { points: c.map(p => p.x + "," + p.y).join(" "), fill: "none", stroke: ink, "stroke-width": 2, "stroke-dasharray": "7 5" })); } }
  /* selection */
  if (sel.length === 1 && sel[0].type === "thread") {
    const t = sel[0], pts = VB.threadPts(t, VB.currentById);
    pts.forEach((p, i) => {
      const s = toScreen(p.x, p.y), edge = i === 0 || i === pts.length - 1;
      const c = S("g", { "data-h": "pin", "data-i": i, style: "cursor:grab" });
      c.append(S("circle", { cx: s.x, cy: s.y, r: touch() ? 20 : 14, fill: "transparent" }), S("circle", { cx: s.x, cy: s.y, r: edge ? 15 : 12, fill: "none", stroke: vio, "stroke-width": 3 }), S("circle", { cx: s.x, cy: s.y, r: edge ? 15 : 12, fill: "none", stroke: ink, "stroke-width": 1, "stroke-dasharray": "4 4" }));
      ovg.append(c);
    });
  } else if (sel.length === 1) {
    const e = sel[0], c = VB.corners(e).map(p => toScreen(p[0], p[1]));
    ovg.append(S("polygon", { points: c.map(p => p.x + "," + p.y).join(" "), fill: "none", stroke: vio, "stroke-width": 3 }));
    ovg.append(S("polygon", { points: c.map(p => p.x + "," + p.y).join(" "), fill: "none", stroke: ink, "stroke-width": 1, "stroke-dasharray": "5 5", opacity: .55 }));
    if (!e.locked) {
      const hs = touch() ? 18 : 12;
      ["nw", "ne", "se", "sw"].forEach((h, i) => {
        const p = c[i], g = S("g", { "data-h": h, style: `cursor:${i % 2 ? "nesw" : "nwse"}-resize` });
        g.append(S("circle", { cx: p.x, cy: p.y, r: hs + 8, fill: "transparent" }), S("rect", { x: p.x - hs / 2, y: p.y - hs / 2, width: hs, height: hs, rx: 4, fill: "#f5ffcf", stroke: ink, "stroke-width": 2.5, transform: `rotate(${e.rot || 0} ${p.x} ${p.y})` }));
        ovg.append(g);
      });
      const top = { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 }, ang = VB.rad((e.rot || 0) - 90), off = touch() ? 44 : 34;
      const rp = { x: top.x + Math.cos(ang) * off, y: top.y + Math.sin(ang) * off };
      const rg = S("g", { "data-h": "rot", style: "cursor:grab" });
      rg.append(S("line", { x1: top.x, y1: top.y, x2: rp.x, y2: rp.y, stroke: ink, "stroke-width": 2 }), S("circle", { cx: rp.x, cy: rp.y, r: touch() ? 22 : 14, fill: "transparent" }), S("circle", { cx: rp.x, cy: rp.y, r: touch() ? 13 : 9, fill: "#cfff00", stroke: ink, "stroke-width": 2.5 }));
      ovg.append(rg);
    }
  } else if (sel.length > 1) {
    const b = VB.unionBox(sel), a = toScreen(b.x1, b.y1), d = toScreen(b.x2, b.y2);
    ovg.append(S("rect", { x: a.x, y: a.y, width: d.x - a.x, height: d.y - a.y, fill: "rgba(148,87,235,.06)", stroke: vio, "stroke-width": 3, rx: 4 }));
    ovg.append(S("rect", { x: a.x, y: a.y, width: d.x - a.x, height: d.y - a.y, fill: "none", stroke: ink, "stroke-width": 1, "stroke-dasharray": "5 5", opacity: .5, rx: 4 }));
  }
  I.placeCtx();
};
I.placeCtx = () => {
  if (!ctx) return;
  const sel = VB.selEls().filter(e => !e.hidden);
  if (!sel.length || drag || I.editing || pinch || I.tool === "hand") { ctx.hidden = true; return; }
  const b = VB.unionBox(sel), a = toScreen(b.x1, b.y1), d = toScreen(b.x2, b.y2), r = wrap.getBoundingClientRect();
  ctx.hidden = false;
  const w = ctx.offsetWidth || 220, h = ctx.offsetHeight || 48;
  let x = (a.x + d.x) / 2 - w / 2, y = a.y - h - (sel.length === 1 && sel[0].type !== "thread" ? 58 : 18);
  if (y < 8) y = d.y + 18;
  x = VB.clamp(x, 8, r.width - w - 8); y = VB.clamp(y, 8, r.height - h - 8);
  ctx.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
};

/* ---------- snapping ---------- */
function snapMove(dx, dy, ids, orig, e) {
  I.guides = [];
  if (e && e.altKey) return { dx, dy };
  const els = VB.doc.elements.filter(x => ids.has(x.id) && x.type !== "thread");
  if (!els.length) return { dx, dy };
  let u = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  els.forEach(x => { const o = orig.get(x.id), tmp = Object.assign({}, x, { x: o.x + dx, y: o.y + dy }), a = VB.aabb(tmp); u.x1 = Math.min(u.x1, a.x1); u.y1 = Math.min(u.y1, a.y1); u.x2 = Math.max(u.x2, a.x2); u.y2 = Math.max(u.y2, a.y2); });
  const tol = 8 / VB.view.z, ab = VB.doc.artboard, xs = [0, ab.w / 2, ab.w], ys = [0, ab.h / 2, ab.h];
  VB.doc.elements.forEach(x => { if (ids.has(x.id) || x.type === "thread" || x.hidden) return; const a = VB.aabb(x); xs.push(a.x1, (a.x1 + a.x2) / 2, a.x2); ys.push(a.y1, (a.y1 + a.y2) / 2, a.y2); });
  const mine = { x: [u.x1, (u.x1 + u.x2) / 2, u.x2], y: [u.y1, (u.y1 + u.y2) / 2, u.y2] };
  let bx = null, by = null;
  mine.x.forEach(m => xs.forEach(c => { const d = c - m; if (Math.abs(d) < tol && (bx === null || Math.abs(d) < Math.abs(bx.d))) bx = { d, v: c }; }));
  mine.y.forEach(m => ys.forEach(c => { const d = c - m; if (Math.abs(d) < tol && (by === null || Math.abs(d) < Math.abs(by.d))) by = { d, v: c }; }));
  if (bx) { dx += bx.d; I.guides.push({ axis: "x", v: bx.v }); }
  if (by) { dy += by.d; I.guides.push({ axis: "y", v: by.v }); }
  return { dx, dy };
}

/* ---------- pointer events ---------- */
function down(e) {
  if (e.target.closest("#ctxbar") || I.editing) return;
  wrap.setPointerCapture && wrap.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) { startPinch(); return; }
  if (pointers.size > 2) return;
  VB.emit("canvas:focus");
  const handle = e.target.closest("[data-h]");
  const pan = e.button === 1 || I.tool === "hand" || I.space;
  if (pan) { panning = { sx: e.clientX, sy: e.clientY, vx: VB.view.x, vy: VB.view.y }; wrap.classList.add("panning"); e.preventDefault(); return; }
  if (e.button !== 0 && e.pointerType === "mouse") return;
  if (I.tool === "thread") { threadClick(e); return; }
  const w = toWorld(e.clientX, e.clientY);
  if (handle) {
    const h = handle.dataset.h, sel = VB.selEls();
    if (h === "pin") { drag = { kind: "pin", id: sel[0].id, i: +handle.dataset.i }; return; }
    const el = sel[0]; if (!el) return;
    if (h === "rot") { drag = { kind: "rot", id: el.id }; return; }
    const idx = { nw: 0, ne: 1, se: 2, sw: 3 }[h], cs = VB.corners(el), opp = cs[(idx + 2) % 4];
    drag = { kind: "resize", id: el.id, h, P0: { x: opp[0], y: opp[1] }, C0: { x: el.x, y: el.y }, corner: cs[idx], w0: el.w, h0: el.h, fs0: el.fs };
    return;
  }
  if (I.cropId) {
    const el = VB.byId(I.cropId), hit = I.pick(e.clientX, e.clientY);
    if (el && hit && hit.id === el.id) { const cell = cellAt(el, w); if (cell != null) { const c = el.cells[cell.i]; drag = { kind: "crop", id: el.id, i: cell.i, w: cell.box, ox: c.ox || 0, oy: c.oy || 0, sx: w.x, sy: w.y }; return; } }
    I.setCrop(null);
  }
  let hit = I.pick(e.clientX, e.clientY);
  if (hit && e.altKey) { /* alt-click: step to the object underneath */
    const all = document.elementsFromPoint(e.clientX, e.clientY).map(elFrom).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i);
    const cur = all.findIndex(x => VB.sel.has(x.id)); hit = all[(cur + 1) % all.length] || hit;
  }
  if (hit) {
    if (e.shiftKey) VB.select([hit.id], true);
    else if (!VB.sel.has(hit.id)) VB.select([hit.id]);
    const ids = new Set(VB.sel), orig = new Map();
    VB.doc.elements.forEach(x => { if (ids.has(x.id) && !x.locked) orig.set(x.id, { x: x.x, y: x.y, pts: x.type === "thread" ? VB.clone(x.pts) : null }); });
    if (orig.size) drag = { kind: "move", sx: w.x, sy: w.y, ids: new Set(orig.keys()), orig, moved: false, px: e.clientX, py: e.clientY };
    else drag = { kind: "none" };
  } else {
    drag = { kind: "marquee", x0: e.clientX - wrap.getBoundingClientRect().left, y0: e.clientY - wrap.getBoundingClientRect().top, add: e.shiftKey, moved: false };
  }
  I.placeCtx();
}
function move(e) {
  if (!pointers.has(e.pointerId)) { hoverThread(e); return; }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size >= 2) { doPinch(); return; }
  if (panning) { VB.setView({ x: panning.vx + e.clientX - panning.sx, y: panning.vy + e.clientY - panning.sy }); return; }
  if (I.tool === "thread") { hoverThread(e); return; }
  if (!drag) return;
  const w = toWorld(e.clientX, e.clientY);
  if (drag.kind === "move") {
    if (!drag.moved && Math.hypot(e.clientX - drag.px, e.clientY - drag.py) < 3) return;
    drag.moved = true;
    let { dx, dy } = snapMove(w.x - drag.sx, w.y - drag.sy, drag.ids, drag.orig, e);
    if (VB.view.grid && !e.altKey) { const first = VB.byId(Array.from(drag.ids)[0]); if (first && first.type !== "thread") { const o = drag.orig.get(first.id); dx = Math.round((o.x + dx) / 25) * 25 - o.x; dy = Math.round((o.y + dy) / 25) * 25 - o.y; } }
    drag.ids.forEach(id => {
      const el = VB.byId(id), o = drag.orig.get(id); if (!el || !o) return;
      if (el.type === "thread") { el.pts.forEach((p, i) => { if (!p.att) { p.x = o.pts[i].x + dx; p.y = o.pts[i].y + dy; } }); VB.scene.el(el); }
      else { el.x = o.x + dx; el.y = o.y + dy; VB.scene.place(el); }
    });
    VB.scene.threads(); I.draw();
  } else if (drag.kind === "resize") {
    const el = VB.byId(drag.id); if (!el) return;
    const d0 = Math.hypot(drag.corner[0] - drag.P0.x, drag.corner[1] - drag.P0.y) || 1;
    const k = VB.clamp(Math.hypot(w.x - drag.P0.x, w.y - drag.P0.y) / d0, 0.08, 10);
    el.w = Math.max(30, drag.w0 * k);
    if (el.type === "tape") el.h = Math.max(18, drag.h0 * k);
    if (el.type === "text") el.fs = Math.max(8, drag.fs0 * k);
    el.x = drag.P0.x + (drag.C0.x - drag.P0.x) * k; el.y = drag.P0.y + (drag.C0.y - drag.P0.y) * k;
    VB.scene.el(el); VB.scene.threads(); I.draw(); VB.emit("live", el);
  } else if (drag.kind === "rot") {
    const el = VB.byId(drag.id); if (!el) return;
    let a = Math.atan2(w.y - el.y, w.x - el.x) * 180 / Math.PI + 90;
    if (e.shiftKey) a = Math.round(a / 15) * 15; else { const n = Math.round(a / 45) * 45; if (Math.abs(a - n) < 3) a = n; }
    a = ((a + 540) % 360) - 180; el.rot = VB.round(a, 1);
    VB.scene.place(el); VB.scene.threads(); I.draw(); VB.emit("live", el);
  } else if (drag.kind === "pin") {
    const t = VB.byId(drag.id); if (!t) return;
    const p = t.pts[drag.i]; delete p.att; p.x = w.x; p.y = w.y;
    const over = I.pick(e.clientX, e.clientY, true); drag.over = over && over.id;
    VB.scene.el(t); I.draw();
  } else if (drag.kind === "crop") {
    const el = VB.byId(drag.id), c = el.cells[drag.i]; if (!el) return;
    const r = VB.rot(w.x - drag.sx, w.y - drag.sy, -(el.rot || 0));
    c.ox = drag.ox + r[0] / drag.w.w; c.oy = drag.oy + r[1] / drag.w.h;
    VB.scene.el(el); VB.emit("live", el);
  } else if (drag.kind === "marquee") {
    const r = wrap.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (!drag.moved && Math.hypot(x - drag.x0, y - drag.y0) < 4) return;
    drag.moved = true; I.marquee = { x1: drag.x0, y1: drag.y0, x2: x, y2: y }; I.draw();
  }
}
function up(e) {
  pointers.delete(e.pointerId);
  if (pinch) { if (pointers.size < 2) { pinch = null; I.draw(); } return; }
  if (panning) { panning = null; wrap.classList.remove("panning"); return; }
  if (!drag) return;
  const d = drag; drag = null; I.guides = [];
  if (d.kind === "move") { if (d.moved) { VB.commit(); VB.emit("doc:changed"); } }
  else if (d.kind === "resize" || d.kind === "rot" || d.kind === "crop") { VB.commit(); VB.emit("doc:changed"); }
  else if (d.kind === "pin") {
    const t = VB.byId(d.id);
    if (t && d.over) { const tg = VB.byId(d.over), p = t.pts[d.i], r = VB.rot(p.x - tg.x, p.y - tg.y, -(tg.rot || 0)); p.att = { id: tg.id, nx: VB.clamp(r[0] / (tg.w / 2), -0.92, 0.92), ny: VB.clamp(r[1] / (tg.h / 2), -0.92, 0.92) }; delete p.x; delete p.y; }
    VB.scene.el(t); VB.commit(); VB.emit("doc:changed");
  }
  else if (d.kind === "marquee") {
    const r = I.marquee; I.marquee = null;
    if (d.moved && r) {
      const a = toWorld(Math.min(r.x1, r.x2) + wrap.getBoundingClientRect().left, Math.min(r.y1, r.y2) + wrap.getBoundingClientRect().top), b = toWorld(Math.max(r.x1, r.x2) + wrap.getBoundingClientRect().left, Math.max(r.y1, r.y2) + wrap.getBoundingClientRect().top);
      const ids = VB.doc.elements.filter(x => !x.hidden && !x.locked && (() => { const bb = x.type === "thread" ? VB.threadBox(x) : VB.aabb(x); return bb.x1 < b.x && bb.x2 > a.x && bb.y1 < b.y && bb.y2 > a.y; })()).map(x => x.id);
      if (d.add) VB.select(ids.filter(id => !VB.sel.has(id)), false), VB.select(Array.from(new Set([...VB.sel, ...ids])), false); else VB.select(ids);
    } else if (!d.add) VB.deselect();
  }
  I.draw();
}
function cancel(e) { pointers.delete(e.pointerId); if (!pointers.size) { drag = null; panning = null; pinch = null; I.marquee = null; I.guides = []; wrap.classList.remove("panning"); I.draw(); } }

/* two-finger pan + pinch zoom */
function startPinch() {
  drag = null; panning = null; I.marquee = null;
  const [a, b] = Array.from(pointers.values());
  pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: VB.view.z, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, vx: VB.view.x, vy: VB.view.y };
}
function doPinch() {
  const [a, b] = Array.from(pointers.values()), d = Math.hypot(a.x - b.x, a.y - b.y) || 1, r = wrap.getBoundingClientRect();
  const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, z = VB.clamp(pinch.z0 * d / pinch.d0, 0.05, 6), k = z / pinch.z0;
  const px = pinch.cx - r.left, py = pinch.cy - r.top;
  VB.setView({ z, x: (cx - r.left) - (px - pinch.vx) * k, y: (cy - r.top) - (py - pinch.vy) * k });
}

/* ---------- thread tool ---------- */
function attachAt(el, w) {
  const r = VB.rot(w.x - el.x, w.y - el.y, -(el.rot || 0));
  return { id: el.id, nx: VB.clamp(r[0] / (el.w / 2), -0.92, 0.92), ny: VB.clamp(r[1] / (el.h / 2), -0.92, 0.92) };
}
function hoverThread(e) {
  if (I.tool !== "thread") return;
  const w = toWorld(e.clientX, e.clientY), over = I.pick(e.clientX, e.clientY, true);
  I.hoverTarget = over;
  if (I.threadDraft) { I.threadDraft.cur = w; I.threadDraft.hoverEl = over; I.draw(); }
  else { I.draw(); if (over) { const c = VB.corners(over).map(p => toScreen(p[0], p[1])); ovg.append(S("polygon", { points: c.map(p => p.x + "," + p.y).join(" "), fill: "rgba(207,255,0,.2)", stroke: "#0a0030", "stroke-width": 2.5, "stroke-dasharray": "6 4" })); } }
}
function threadClick(e) {
  const w = toWorld(e.clientX, e.clientY), over = I.pick(e.clientX, e.clientY, true);
  const pt = over ? { att: attachAt(over, w) } : { x: w.x, y: w.y };
  if (!I.threadDraft) { I.threadDraft = { first: pt, p0: over ? w : w, cur: w }; VB.toast(over ? "now click another photo or note, or anywhere on the board" : "now click where the string should end"); I.draw(); return; }
  const first = I.threadDraft.first;
  I.threadDraft = null;
  if (first.att && pt.att && first.att.id === pt.att.id) { VB.toast("pick a different object for the other end"); I.draw(); return; }
  const t = VB.make.thread([first, pt], { color: I.threadColor || "#d9382a", th: I.threadThickness || 2.6, pinColor: I.threadColor || "#d9382a" });
  VB.addEl(t); VB.toast("thread pinned. click two more points to keep connecting");
  I.draw();
}
VB.setTool = tool => {
  I.tool = tool; I.threadDraft = null;
  wrap.dataset.tool = tool; if (tool !== "select") I.setCrop(null);
  I.draw(); VB.emit("tool", tool);
};

/* ---------- crop (reposition a photo inside its frame) ---------- */
function cellAt(el, w) {
  const L = VB.photoLayout(el), r = VB.rot(w.x - el.x, w.y - el.y, -(el.rot || 0));
  for (let i = 0; i < L.cells.length; i++) { const c = L.cells[i]; if (r[0] >= c.x && r[0] <= c.x + c.w && r[1] >= c.y && r[1] <= c.y + c.h) return { i, box: c }; }
  return null;
}
I.setCrop = id => { I.cropId = id; wrap.classList.toggle("cropping", !!id); I.draw(); VB.emit("crop", id); if (id) VB.toast("drag the picture inside its frame. esc when you are done"); };

/* ---------- text editing in place ---------- */
I.editText = el => {
  if (!el || el.type !== "text" || el.locked) return;
  I.endEdit(true);
  VB.editingId = el.id; I.editing = el.id; VB.scene.el(el); ctx.hidden = true;
  const ta = document.createElement("textarea"); ta.className = "texteditor"; ta.value = el.text; ta.setAttribute("aria-label", "edit text");
  const f = VB.FONTS[el.font] || VB.FONTS.sans;
  wrap.appendChild(ta); I.ta = ta;
  const fit = () => {
    const z = VB.view.z, lt = VB.layoutText(el), s = toScreen(el.x, el.y);
    ta.style.cssText = `position:absolute;left:0;top:0;width:${el.w * z}px;height:${Math.max(el.h * z, 40)}px;transform:translate(${s.x - el.w * z / 2}px,${s.y - el.h * z / 2}px) rotate(${el.rot || 0}deg);transform-origin:50% 50%;font-family:${f.css};font-weight:${f.weight};font-size:${lt.fs * z}px;line-height:${lt.lhPx * z}px;letter-spacing:${(el.ls || 0) * lt.fs * z}px;padding:${lt.pad * z}px;color:${el.color};text-align:${el.align || "left"};text-transform:${f.upper ? "uppercase" : "none"};${f.stretch ? "font-stretch:75%;" : ""}`;
  };
  fit(); I.fitEditor = fit;
  ta.addEventListener("input", () => { el.text = ta.value; VB.scene.el(el); fit(); I.draw(); VB.emit("live", el); });
  ta.addEventListener("keydown", e => { if (e.key === "Escape") { e.preventDefault(); I.endEdit(); } e.stopPropagation(); });
  ta.addEventListener("blur", () => I.endEdit());
  ta.focus(); ta.select();
};
I.endEdit = noCommit => {
  if (!I.editing) return;
  const id = I.editing, el = VB.byId(id), ta = I.ta;
  I.editing = null; VB.editingId = null; I.ta = null;
  if (ta) { ta.remove(); }
  if (el) { if (!String(el.text).trim() && !noCommit) { VB.removeEls([id]); return; } VB.scene.el(el); if (!noCommit) { VB.commit(); } }
  I.draw(); VB.emit("doc:changed");
};

/* ---------- double click ---------- */
function dbl(e) {
  if (I.tool !== "select") return;
  const hit = I.pick(e.clientX, e.clientY);
  if (!hit || hit.locked) return;
  VB.select([hit.id]);
  if (hit.type === "text") I.editText(hit);
  else if (hit.type === "photo") I.setCrop(hit.id);
  else if (hit.type === "thread") {
    const w = toWorld(e.clientX, e.clientY), pts = VB.threadPts(hit, VB.currentById);
    let bi = 0, bd = Infinity;
    for (let i = 0; i < pts.length - 1; i++) { const m = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 }; const dd = Math.hypot(m.x - w.x, m.y - w.y); if (dd < bd) { bd = dd; bi = i; } }
    hit.pts.splice(bi + 1, 0, { x: w.x, y: w.y }); VB.scene.el(hit); VB.commit(); VB.emit("doc:changed"); I.draw(); VB.toast("pin added. drag it to bend the string");
  }
}

/* ---------- wheel ---------- */
function wheel(e) {
  e.preventDefault();
  if (I.cropId && !e.ctrlKey) {
    const el = VB.byId(I.cropId), L = el && VB.photoLayout(el), hit = el && cellAt(el, toWorld(e.clientX, e.clientY));
    if (hit) { const c = el.cells[hit.i]; c.z = VB.clamp((c.z || 1) * Math.exp(-e.deltaY * 0.0015), 1, 4); VB.scene.el(el); VB.emit("live", el); clearTimeout(I._cz); I._cz = setTimeout(() => VB.commit(), 400); return; }
  }
  if (e.ctrlKey || e.metaKey) VB.zoomAt(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0022)), e.clientX, e.clientY);
  else VB.setView({ x: VB.view.x - (e.shiftKey ? e.deltaY : e.deltaX), y: VB.view.y - (e.shiftKey ? 0 : e.deltaY) });
}

/* ---------- keyboard ---------- */
const typing = t => t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable);
let nudgeT;
function key(e) {
  if (typing(e.target) || document.body.classList.contains("modal-open")) { if (e.key === "Escape" && I.editing) I.endEdit(); return; }
  if (!VB.doc || !$("#view-editor") || $("#view-editor").hidden) return;
  const k = e.key, mod = e.ctrlKey || e.metaKey, sel = VB.selEls().filter(x => !x.locked), step = e.shiftKey ? 10 : 1;
  if (k === " ") { if (!I.space) { I.space = true; wrap.classList.add("handmode"); } e.preventDefault(); return; }
  if (mod && k.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? VB.redo() : VB.undo(); return; }
  if (mod && k.toLowerCase() === "y") { e.preventDefault(); VB.redo(); return; }
  if (mod && k.toLowerCase() === "s") { e.preventDefault(); VB.saveNow().then(() => VB.toast("saved on this device")); return; }
  if (mod && k.toLowerCase() === "d") { e.preventDefault(); if (VB.sel.size) VB.dupEls(Array.from(VB.sel)); return; }
  if (mod && k.toLowerCase() === "a") { e.preventDefault(); VB.select(VB.doc.elements.filter(x => !x.hidden && !x.locked).map(x => x.id)); return; }
  if (mod && k.toLowerCase() === "c") { if (VB.copy()) e.preventDefault(); return; }
  if (mod && k.toLowerCase() === "v") { if (VB.clip) { e.preventDefault(); VB.paste(); } return; }
  if (mod && k.toLowerCase() === "g") { e.preventDefault(); e.shiftKey ? VB.ungroup(Array.from(VB.sel)) : VB.group(Array.from(VB.sel)); return; }
  if (mod && e.shiftKey && k.toLowerCase() === "l") { e.preventDefault(); const s = VB.selEls(); if (s.length) VB.setLock(s.map(x => x.id), !s.every(x => x.locked)); return; }
  if (mod && k === "]") { e.preventDefault(); VB.reorder(Array.from(VB.sel), e.shiftKey ? "front" : "forward"); return; }
  if (mod && k === "[") { e.preventDefault(); VB.reorder(Array.from(VB.sel), e.shiftKey ? "back" : "backward"); return; }
  if (mod && (k === "=" || k === "+")) { e.preventDefault(); VB.zoomAt(1.2); return; }
  if (mod && k === "-") { e.preventDefault(); VB.zoomAt(1 / 1.2); return; }
  if (mod && k === "0") { e.preventDefault(); VB.setView({ z: 1 }); return; }
  if (k === "Escape") { if (I.cropId) I.setCrop(null); else if (I.threadDraft) { I.threadDraft = null; I.draw(); } else if (I.tool !== "select") VB.setTool("select"); else VB.deselect(); return; }
  if (k === "Delete" || k === "Backspace") { if (sel.length) { e.preventDefault(); VB.removeEls(sel.map(x => x.id)); } return; }
  if (k === "Enter" && sel.length === 1 && sel[0].type === "text") { e.preventDefault(); I.editText(sel[0]); return; }
  if (!mod && k.toLowerCase() === "v") return VB.setTool("select");
  if (!mod && k.toLowerCase() === "h") return VB.setTool("hand");
  if (!mod && k.toLowerCase() === "t") return VB.setTool("thread");
  if (!mod && k.toLowerCase() === "n") { e.preventDefault(); VB.ui.addText({ text: "write something", font: "hand", fs: 64, w: 600 }); return; }
  if (!mod && (k === "+" || k === "=")) { VB.zoomAt(1.2); return; }
  if (!mod && (k === "-" || k === "_")) { VB.zoomAt(1 / 1.2); return; }
  if (!mod && k === "1" && e.shiftKey) { VB.fit(); return; }
  if (!mod && k === "!") { VB.fit(); return; }
  if (k.startsWith("Arrow") && sel.length) {
    e.preventDefault();
    if (e.altKey && (k === "ArrowUp" || k === "ArrowDown")) { const f = k === "ArrowUp" ? 1.05 : 1 / 1.05; sel.forEach(x => { if (x.type === "thread") return; x.w = Math.max(30, x.w * f); if (x.type === "text") x.fs = Math.max(8, x.fs * f); if (x.type === "tape") x.h = Math.max(18, x.h * f); VB.scene.el(x); }); }
    else if (e.altKey) { sel.forEach(x => { if (x.type !== "thread") { x.rot = VB.round((x.rot || 0) + (k === "ArrowRight" ? step : -step), 1); VB.scene.place(x); } }); }
    else { const dx = k === "ArrowLeft" ? -step : k === "ArrowRight" ? step : 0, dy = k === "ArrowUp" ? -step : k === "ArrowDown" ? step : 0; sel.forEach(x => { if (x.type === "thread") { x.pts.forEach(p => { if (!p.att) { p.x += dx; p.y += dy; } }); VB.scene.el(x); } else { x.x += dx; x.y += dy; VB.scene.place(x); } }); }
    VB.scene.threads(); I.draw(); clearTimeout(nudgeT); nudgeT = setTimeout(() => { VB.commit(); VB.emit("doc:changed"); }, 400); return;
  }
  if ((k === "[" || k === "]") && sel.length) { sel.forEach(x => { if (x.type !== "thread") { x.rot = VB.round((x.rot || 0) + (k === "]" ? step : -step) * (e.shiftKey ? 1.5 : 1), 1); VB.scene.place(x); } }); VB.scene.threads(); I.draw(); clearTimeout(nudgeT); nudgeT = setTimeout(() => { VB.commit(); VB.emit("doc:changed"); }, 400); return; }
}
function keyup(e) { if (e.key === " " && I.space) { I.space = false; wrap.classList.remove("handmode"); } }

/* focus on an object with the keyboard = select it */
function focusin(e) { if (I.tool !== "select" || !(e.target.matches && e.target.matches(":focus-visible"))) return; const g = e.target.closest && e.target.closest("#items .el"); if (g) { const el = VB.byId(g.dataset.id); if (el && !VB.sel.has(el.id)) VB.select([el.id]); } }

I.init = () => {
  wrap = $("#stagewrap"); stage = $("#stage"); ov = $("#overlay"); ctx = $("#ctxbar");
  ovg = document.createElementNS(NS, "g"); ov.appendChild(ovg);
  wrap.addEventListener("pointerdown", down);
  wrap.addEventListener("pointermove", move);
  wrap.addEventListener("pointerup", up); wrap.addEventListener("pointercancel", cancel);
  wrap.addEventListener("dblclick", dbl);
  wrap.addEventListener("wheel", wheel, { passive: false });
  wrap.addEventListener("contextmenu", e => { if (I.tool !== "select") e.preventDefault(); });
  wrap.addEventListener("focusin", focusin);
  window.addEventListener("keydown", key); window.addEventListener("keyup", keyup);
  window.addEventListener("resize", () => I.draw());
  VB.on("sel", () => { I.draw(); }); VB.on("doc:changed", () => I.draw()); VB.on("live", () => I.draw());
  new ResizeObserver(() => I.draw()).observe(wrap);
};
})();
