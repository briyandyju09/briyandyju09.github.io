/* Document model: boards, history, selection, element operations, saving. */
(function () {
"use strict";
const VB = window.VB;

VB.CATEGORIES = ["Learning and Education", "Career and Projects", "Health and Fitness", "Love and Relationships", "Travel and Adventure", "Personal Growth", "Money and Financial Independence", "Home and Lifestyle", "Creativity and Hobbies", "Family and Friendships"];

VB.MOODS = {
  vintage:  { label: "warm vintage",       paper: "aged",     tone: { sat: 0.9, con: 1.04, warm: 0.45 }, grain: 0.95, shadow: 0.5, tape: "#e9cf95", noteColor: "#f1e3c3", ink: "#3b2a14", accent: "#d9382a" },
  mono:     { label: "minimal monochrome", paper: "offwhite", tone: { sat: 0,   con: 1.1,  warm: 0 },    grain: 0.35, shadow: 0.35, tape: "#d8d8d8", noteColor: "#f4f4f1", ink: "#1d1d1d", accent: "#1d1d1d" },
  pastel:   { label: "soft pastel",        paper: "cream",    tone: { sat: 0.85, con: 0.96, warm: 0.12 }, grain: 0.5, shadow: 0.4, tape: "#f6c1d4", noteColor: "#fde8ef", ink: "#4a2e5a", accent: "#e57aa0" },
  film:     { label: "film photography",   paper: "cream",    tone: { sat: 1.12, con: 1.12, warm: 0.28 }, grain: 0.85, shadow: 0.55, tape: "#f3dca0", noteColor: "#f6efe0", ink: "#1f1a14", accent: "#d9382a" },
  academic: { label: "academic",           paper: "notebook", tone: { sat: 0.82, con: 1.02, warm: 0.12 }, grain: 0.5, shadow: 0.45, tape: "#b9d1e8", noteColor: "#fbf8ef", ink: "#1d2a4a", accent: "#2d5f9a" },
  coastal:  { label: "coastal summer",     paper: "offwhite", tone: { sat: 1.06, con: 1.02, warm: -0.2 }, grain: 0.45, shadow: 0.4, tape: "#a9d8da", noteColor: "#eef7f6", ink: "#12384a", accent: "#2f8f9d" },
  romantic: { label: "romantic scrapbook", paper: "cream",    tone: { sat: 1,    con: 1,    warm: 0.2 },  grain: 0.7, shadow: 0.45, tape: "#f4b4c3", noteColor: "#fbe3e0", ink: "#5b2333", accent: "#c2385a" },
  cork:     { label: "cork wall",          paper: "cork",     tone: { sat: 1.05, con: 1.05, warm: 0.2 }, grain: 0.8, shadow: 0.75, tape: "#f3dca0", noteColor: "#f6efe0", ink: "#2a1d12", accent: "#d9382a" },
  kraft:    { label: "kraft paper",        paper: "kraft",    tone: { sat: 0.95, con: 1.04, warm: 0.3 }, grain: 0.9, shadow: 0.55, tape: "#fffdf8", noteColor: "#f6efe0", ink: "#2a1d12", accent: "#d9382a" },
  maximal:  { label: "maximalist collage", paper: "news",     tone: { sat: 1.3,  con: 1.1,  warm: 0.05 }, grain: 0.8, shadow: 0.6, tape: "#ffd000", noteColor: "#ffffff", ink: "#0a0030", accent: "#e0632b" }
};
VB.BOARD_SIZES = {
  landscape: { label: "landscape 3:2", w: 2400, h: 1600 },
  portrait:  { label: "portrait 2:3", w: 1600, h: 2400 },
  square:    { label: "square", w: 2000, h: 2000 },
  desktop:   { label: "desktop wallpaper 16:9", w: 2560, h: 1440 },
  mobile:    { label: "mobile wallpaper", w: 1170, h: 2532 },
  poster:    { label: "A-series poster", w: 1700, h: 2400 }
};

VB.defaultTheme = (mood) => {
  const m = VB.MOODS[mood || "film"] || VB.MOODS.film;
  return { mood: mood || "film", paper: "cream", paperColor: "", tone: Object.assign({}, m.tone), grain: m.grain, shadow: m.shadow, tape: m.tape, noteColor: m.noteColor, ink: m.ink, accent: m.accent };
};
VB.applyMood = (doc, id) => {
  const m = VB.MOODS[id]; if (!m) return;
  doc.theme = Object.assign(doc.theme || {}, { mood: id, paper: m.paper, paperColor: "", tone: Object.assign({}, m.tone), grain: m.grain, shadow: m.shadow, tape: m.tape, noteColor: m.noteColor, ink: m.ink, accent: m.accent });
};

VB.newDoc = (name, size) => {
  const sz = VB.BOARD_SIZES[size || "landscape"] || VB.BOARD_SIZES.landscape;
  return {
    id: "b" + VB.uid(), name: name || "untitled board", created: Date.now(), updated: Date.now(), cover: "",
    artboard: { w: sz.w, h: sz.h, preset: size || "landscape" },
    theme: VB.defaultTheme("film"),
    categories: VB.CATEGORIES.map(n => ({ id: "c" + VB.uid(), name: n, on: false })),
    elements: [], uploads: [], view: { x: 0, y: 0, z: 0.4, grid: false, snap: true, badges: true }
  };
};

/* ---------- current document ---------- */
VB.doc = null; VB.sel = new Set(); VB.view = { x: 0, y: 0, z: 0.4 };
VB.hist = { undo: [], redo: [], now: "" };
VB.dirty = false;

const snap = () => JSON.stringify({ elements: VB.doc.elements, artboard: VB.doc.artboard, theme: VB.doc.theme, categories: VB.doc.categories });
VB.openDoc = async (data) => {
  VB.doc = data; VB.sel.clear(); VB.dirty = false;
  VB.doc.view = VB.doc.view || { x: 0, y: 0, z: 0.4 };
  VB.view = VB.doc.view;
  VB.doc.uploads = VB.doc.uploads || [];
  /* ids of every picture used by the board, so they are ready before first paint */
  await Promise.all(VB.assetIdsOf(VB.doc.elements).concat(VB.doc.uploads).map(id => VB.loadAsset(id)));
  VB.hist = { undo: [], redo: [], now: snap() };
  VB.emit("doc:open");
};
VB.commit = () => {
  const s = snap();
  if (s === VB.hist.now) return;
  VB.hist.undo.push(VB.hist.now); if (VB.hist.undo.length > 120) VB.hist.undo.shift();
  VB.hist.now = s; VB.hist.redo = [];
  VB.doc.updated = Date.now();
  VB.markDirty(); VB.emit("hist");
};
const restore = s => {
  const d = JSON.parse(s);
  VB.doc.elements = d.elements; VB.doc.artboard = d.artboard; VB.doc.theme = d.theme; VB.doc.categories = d.categories;
  VB.hist.now = s;
  VB.sel = new Set(Array.from(VB.sel).filter(id => d.elements.some(e => e.id === id)));
  VB.scene.all(); VB.emit("sel"); VB.emit("doc:changed"); VB.markDirty(); VB.emit("hist");
};
VB.undo = () => { if (!VB.hist.undo.length) return; VB.hist.redo.push(VB.hist.now); restore(VB.hist.undo.pop()); };
VB.redo = () => { if (!VB.hist.redo.length) return; VB.hist.undo.push(VB.hist.now); restore(VB.hist.redo.pop()); };

/* ---------- saving ---------- */
VB.markDirty = () => { VB.dirty = true; VB.emit("save", { state: "saving" }); VB.saveSoon(); };
VB.saveNow = async () => {
  if (!VB.doc) return;
  try {
    const d = VB.doc;
    await VB.db.putBoard({ id: d.id, name: d.name, created: d.created, updated: d.updated, cover: d.cover || "", data: { artboard: d.artboard, theme: d.theme, categories: d.categories, elements: d.elements, uploads: d.uploads, view: d.view } });
    VB.dirty = false; VB.emit("save", { state: "saved", at: Date.now() });
  } catch (e) { console.error(e); VB.emit("save", { state: "error", msg: e && e.message }); }
};
VB.saveSoon = VB.debounce(() => VB.saveNow(), 700);
VB.boardFromRecord = r => Object.assign({ id: r.id, name: r.name, created: r.created, updated: r.updated, cover: r.cover || "" }, r.data);

/* ---------- selection ---------- */
VB.byId = id => VB.doc.elements.find(e => e.id === id);
VB.selEls = () => VB.doc.elements.filter(e => VB.sel.has(e.id));
VB.select = (ids, add) => {
  ids = [].concat(ids || []);
  const expand = new Set(ids);
  ids.forEach(id => { const e = VB.byId(id); if (e && e.gid) VB.doc.elements.forEach(x => { if (x.gid === e.gid) expand.add(x.id); }); });
  if (add) { expand.forEach(id => { if (VB.sel.has(id) && ids.length === 1) VB.sel.delete(id); else VB.sel.add(id); }); }
  else VB.sel = new Set(expand);
  VB.emit("sel");
};
VB.deselect = () => { if (VB.sel.size) { VB.sel.clear(); VB.emit("sel"); } };

/* ---------- factories ---------- */
VB.viewCenter = () => {
  const st = VB.$("#stagewrap"); if (!st) return { x: VB.doc.artboard.w / 2, y: VB.doc.artboard.h / 2 };
  const r = st.getBoundingClientRect(), z = VB.view.z;
  return { x: (r.width / 2 - VB.view.x) / z, y: (r.height / 2 - VB.view.y) / z };
};
const jitter = n => (Math.random() - 0.5) * 2 * n;
VB.make = {
  photo(o) {
    const th = VB.doc.theme;
    const el = { id: "e" + VB.uid(), type: "photo", x: 0, y: 0, w: 320, h: 0, rot: VB.round(jitter(4), 1), frame: "polaroid", fc: "", bw: 1, caption: "", ar: 1.25, adj: { b: 1, c: 1, s: 1, w: 0 }, cells: [{ a: null, z: 1, ox: 0, oy: 0 }] };
    Object.assign(el, o || {});
    const n = VB.FRAMES[el.frame].cells; while (el.cells.length < n) el.cells.push({ a: null, z: 1, ox: 0, oy: 0 });
    return el;
  },
  text(o) {
    const th = VB.doc.theme;
    return Object.assign({ id: "e" + VB.uid(), type: "text", x: 0, y: 0, w: 420, h: 60, rot: 0, text: "write something", font: "hand", fs: 56, color: th.ink || "#0a0030", align: "center", ls: 0, lh: 0, outline: null, paper: null }, o || {});
  },
  note(o) {
    const th = VB.doc.theme;
    return VB.make.text(Object.assign({ w: 360, fs: 40, align: "left", rot: VB.round(jitter(3), 1), paper: { shape: "rect", texture: "grain", color: th.noteColor || "#f8f1de" } }, o || {}));
  },
  sticker(kind, o) {
    const def = VB.stickerMap()[kind]; const base = def ? Math.max(def.w, def.h) : 100;
    return Object.assign({ id: "e" + VB.uid(), type: "sticker", x: 0, y: 0, w: def ? 180 * def.w / base : 180, h: def ? 180 * def.h / base : 180, rot: VB.round(jitter(8), 1), kind, a: "", b: "", flip: false, border: true }, o || {});
  },
  tape(o) { return Object.assign({ id: "e" + VB.uid(), type: "tape", x: 0, y: 0, w: 190, h: 52, rot: VB.round(jitter(12), 1), pattern: "plain", color: VB.doc.theme.tape || "#f3dca0", opacity: 0.82 }, o || {}); },
  imgsticker(asset, o) { const a = VB.assets.get(asset); return Object.assign({ id: "e" + VB.uid(), type: "imgsticker", x: 0, y: 0, w: 240, h: a ? 240 * a.h / a.w : 240, rot: VB.round(jitter(6), 1), asset, cut: true, bs: 1 }, o || {}); },
  thread(pts, o) { return Object.assign({ id: "e" + VB.uid(), type: "thread", x: 0, y: 0, w: 10, h: 10, rot: 0, pts, color: "#d9382a", th: 2.6, sag: 0.1, label: "", pins: true, pinColor: "#d9382a" }, o || {}); }
};

VB.place = (el, at) => {
  const c = at || VB.viewCenter();
  if (el.type !== "thread") { el.x = Math.round(c.x + (at ? 0 : jitter(60))); el.y = Math.round(c.y + (at ? 0 : jitter(50))); }
  return el;
};
VB.addEl = (el, o) => {
  o = o || {};
  if (el.type === "text") VB.layoutText(el);
  VB.doc.elements.push(el);
  VB.scene.reindex(); VB.scene.el(el, true);
  { const g = VB.scene.nodes.get(el.id); if (g && el.type !== "thread") { g.classList.add("drop"); setTimeout(() => g.classList.remove("drop"), 520); } }
  if (o.select !== false) VB.select([el.id]);
  if (o.commit !== false) VB.commit();
  VB.emit("doc:changed");
  return el;
};
VB.freezeThreadsFor = ids => {
  const set = new Set(ids);
  VB.doc.elements.forEach(t => {
    if (t.type !== "thread") return;
    t.pts.forEach(p => { if (p.att && set.has(p.att.id)) { const e = VB.byId(p.att.id); if (e) { const r = VB.rot(p.att.nx * e.w / 2, p.att.ny * e.h / 2, e.rot || 0); p.x = e.x + r[0]; p.y = e.y + r[1]; } delete p.att; } });
  });
};
VB.removeEls = ids => {
  ids = ids.filter(id => { const e = VB.byId(id); return e; });
  if (!ids.length) return;
  VB.freezeThreadsFor(ids);
  const set = new Set(ids);
  VB.doc.elements = VB.doc.elements.filter(e => !set.has(e.id));
  ids.forEach(id => VB.scene.remove(id)); VB.sel = new Set(Array.from(VB.sel).filter(id => !set.has(id)));
  VB.scene.reindex(); VB.scene.threads();
  VB.emit("sel"); VB.emit("doc:changed"); VB.commit();
};
VB.dupEls = (ids, off) => {
  off = off == null ? 36 : off;
  const src = VB.doc.elements.filter(e => ids.includes(e.id)), map = {}, out = [];
  src.forEach(e => { if (e.type === "thread") return; const c = VB.clone(e); c.id = "e" + VB.uid(); c.x += off; c.y += off; if (c.gid) c.gid = null; map[e.id] = c.id; out.push(c); });
  src.forEach(e => {
    if (e.type !== "thread") return;
    const c = VB.clone(e); c.id = "e" + VB.uid();
    c.pts.forEach(p => { if (p.att && map[p.att.id]) p.att.id = map[p.att.id]; else if (p.att) { const t = VB.byId(p.att.id); if (t) { const r = VB.rot(p.att.nx * t.w / 2, p.att.ny * t.h / 2, t.rot || 0); p.x = t.x + r[0] + off; p.y = t.y + r[1] + off; } delete p.att; } else { p.x += off; p.y += off; } });
    out.push(c);
  });
  /* threads that link two duplicated objects come along too */
  VB.doc.elements.forEach(t => {
    if (t.type !== "thread" || ids.includes(t.id)) return;
    if (t.pts.every(p => p.att && map[p.att.id])) { const c = VB.clone(t); c.id = "e" + VB.uid(); c.pts.forEach(p => { p.att.id = map[p.att.id]; }); out.push(c); }
  });
  /* keep a duplicated group together */
  const gmap = {}; src.forEach(e => { if (e.gid) { gmap[e.gid] = gmap[e.gid] || "g" + VB.uid(); } });
  out.forEach(c => { const o = src.find(s => map[s.id] === c.id); if (o && o.gid) c.gid = gmap[o.gid]; });
  out.forEach(c => { if (c.type === "text") VB.layoutText(c); VB.doc.elements.push(c); });
  VB.scene.reindex(); out.forEach(c => VB.scene.el(c, true));
  VB.select(out.map(c => c.id)); VB.emit("doc:changed"); VB.commit();
  return out;
};
VB.reorder = (ids, mode) => {
  const els = VB.doc.elements, set = new Set(ids), sel = els.filter(e => set.has(e.id)), rest = els.filter(e => !set.has(e.id));
  if (mode === "front") VB.doc.elements = rest.concat(sel);
  else if (mode === "back") VB.doc.elements = sel.concat(rest);
  else {
    const arr = els.slice();
    if (mode === "forward") for (let i = arr.length - 2; i >= 0; i--) { if (set.has(arr[i].id) && !set.has(arr[i + 1].id)) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; }
    else for (let i = 1; i < arr.length; i++) { if (set.has(arr[i].id) && !set.has(arr[i - 1].id)) [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]; }
    VB.doc.elements = arr;
  }
  VB.scene.order(); VB.emit("doc:changed"); VB.commit();
};
VB.moveLayer = (id, toIndex) => {
  const i = VB.doc.elements.findIndex(e => e.id === id); if (i < 0) return;
  const [e] = VB.doc.elements.splice(i, 1); VB.doc.elements.splice(VB.clamp(toIndex, 0, VB.doc.elements.length), 0, e);
  VB.scene.order(); VB.emit("doc:changed"); VB.commit();
};
VB.group = ids => { if (ids.length < 2) return; const g = "g" + VB.uid(); ids.forEach(id => { VB.byId(id).gid = g; }); VB.commit(); VB.emit("doc:changed"); VB.toast("grouped. they move together now"); };
VB.ungroup = ids => { ids.forEach(id => { const e = VB.byId(id); if (e) e.gid = null; }); VB.commit(); VB.emit("doc:changed"); };
VB.setLock = (ids, on) => { ids.forEach(id => { const e = VB.byId(id); if (e) { e.locked = on; VB.scene.el(e); } }); VB.commit(); VB.emit("sel"); VB.emit("doc:changed"); };
VB.setHidden = (id, on) => { const e = VB.byId(id); if (!e) return; e.hidden = on; VB.scene.el(e); if (on) { VB.sel.delete(id); VB.emit("sel"); } VB.commit(); VB.emit("doc:changed"); };
VB.align = (ids, how) => {
  const els = VB.doc.elements.filter(e => ids.includes(e.id) && e.type !== "thread" && !e.locked);
  if (els.length < 2) return;
  const bs = els.map(e => VB.aabb(e)), u = { x1: Math.min(...bs.map(b => b.x1)), x2: Math.max(...bs.map(b => b.x2)), y1: Math.min(...bs.map(b => b.y1)), y2: Math.max(...bs.map(b => b.y2)) };
  els.forEach((e, i) => {
    const b = bs[i];
    if (how === "left") e.x += u.x1 - b.x1; if (how === "right") e.x += u.x2 - b.x2; if (how === "center") e.x += (u.x1 + u.x2) / 2 - (b.x1 + b.x2) / 2;
    if (how === "top") e.y += u.y1 - b.y1; if (how === "bottom") e.y += u.y2 - b.y2; if (how === "middle") e.y += (u.y1 + u.y2) / 2 - (b.y1 + b.y2) / 2;
    VB.scene.place(e);
  });
  VB.scene.threads(); VB.commit(); VB.emit("doc:changed"); VB.emit("sel");
};

/* internal clipboard for copy / paste of objects */
VB.clip = null;
VB.copy = () => { const s = VB.selEls(); if (!s.length) return false; VB.clip = VB.clone(s); VB.toast("copied"); return true; };
VB.paste = () => {
  if (!VB.clip) return false;
  const map = {}, out = [];
  VB.clip.forEach(e => { if (e.type !== "thread") { const c = VB.clone(e); c.id = "e" + VB.uid(); map[e.id] = c.id; c.x += 40; c.y += 40; c.gid = null; out.push(c); } });
  VB.clip.forEach(e => { if (e.type === "thread") { const c = VB.clone(e); c.id = "e" + VB.uid(); c.pts.forEach(p => { if (p.att && map[p.att.id]) p.att.id = map[p.att.id]; else if (p.att) delete p.att; if (!p.att) { p.x = (p.x || 0) + 40; p.y = (p.y || 0) + 40; } }); out.push(c); } });
  out.forEach(c => { if (c.type === "text") VB.layoutText(c); VB.doc.elements.push(c); });
  VB.scene.reindex(); out.forEach(c => VB.scene.el(c, true));
  VB.select(out.map(c => c.id)); VB.emit("doc:changed"); VB.commit();
  return true;
};

/* ---------- goals ---------- */
VB.goalOf = el => el.goal;
VB.goalProgress = g => { const s = g.steps || []; if (g.status === "done") return 100; return s.length ? Math.round(s.filter(x => x.d).length / s.length * 100) : (g.progress || 0); };

/* ---------- backup (.json with images inline) ---------- */
VB.exportBackup = async doc => {
  const ids = VB.assetIdsOf(doc.elements).concat(doc.uploads || []), assets = {};
  for (const id of new Set(ids)) { try { const a = VB.assets.get(id); if (a && a.blob && !(VB.sampleIds || []).includes(id)) assets[id] = { url: await VB.assetDataURL(id), w: a.w, h: a.h, name: a.name, credit: a.credit, alpha: a.alpha }; } catch (e) { /* skip */ } }
  const d = { app: "vision-board-studio", v: 1, board: { id: doc.id, name: doc.name, created: doc.created, updated: doc.updated, cover: doc.cover, data: { artboard: doc.artboard, theme: doc.theme, categories: doc.categories, elements: doc.elements, uploads: doc.uploads, view: doc.view } }, assets };
  return new Blob([JSON.stringify(d)], { type: "application/json" });
};
VB.importBackup = async file => {
  let d; try { d = JSON.parse(await file.text()); } catch (e) { throw new Error("that file is not valid JSON"); }
  if (d.app !== "vision-board-studio" || !d.board) throw new Error("that does not look like a vision board backup");
  for (const id in (d.assets || {})) {
    const a = d.assets[id], blob = await (await fetch(a.url)).blob();
    const rec = { id, blob, w: a.w, h: a.h, name: a.name, credit: a.credit, alpha: a.alpha };
    VB.addAssetRecord(Object.assign({}, rec)); await VB.db.putAsset(rec);
  }
  const b = d.board; b.id = "b" + VB.uid(); b.name = (b.name || "board") + " (restored)"; b.updated = Date.now();
  await VB.db.putBoard(b);
  return b;
};
})();
