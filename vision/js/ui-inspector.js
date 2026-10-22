/* Editor UI, part 2: the right-hand side. Inspector for the selection (or the board), layers, goals. */
(function () {
"use strict";
const VB = window.VB, h = VB.h, $ = VB.$, U = VB.ui, ico = U.ico;
const PALETTE = ["#0a0030", "#fffdf8", "#d9382a", "#e0632b", "#ffd000", "#2f9e5b", "#3daab8", "#2d5f9a", "#9457eb", "#ff7eb6", "#8a5a1c"];
U.rtab = "inspector"; U.cellIdx = 0;

/* apply a change to elements live; commit when the gesture ends */
function apply(els, fn, commit) {
  els.forEach(e => { fn(e); if (e.type === "text") VB.layoutText(e); VB.scene.el(e); });
  VB.scene.threads(); VB.emit("live"); VB.interact.draw();
  if (commit) { VB.commit(); VB.emit("doc:changed"); }
}
const rebuild = () => U.renderRight(true);

U.buildRight = () => {
  const r = $("#right"); r.replaceChildren();
  const tabs = h("div.rtabs", { role: "tablist" });
  [["inspector", "details"], ["layers", "layers"], ["goals", "goals"]].forEach(([id, l]) => tabs.append(h("button", { type: "button", role: "tab", id: "rtab-" + id, "aria-selected": String(U.rtab === id), onclick: () => U.setRTab(id) }, l)));
  tabs.addEventListener("keydown", e => { if (!/^Arrow(Left|Right)$/.test(e.key)) return; const t = VB.$$("button", tabs), i = t.indexOf(document.activeElement); if (i < 0) return; e.preventDefault(); const n = t[(i + (e.key === "ArrowRight" ? 1 : t.length - 1)) % t.length]; n.focus(); n.click(); });
  r.append(tabs, h("div#rbody.rbody", { role: "tabpanel" }), h("button.rclose", { type: "button", "aria-label": "close details", onclick: () => r.classList.remove("open") }, ico("x")));
};
U.setRTab = id => { U.rtab = id; VB.$$("#right .rtabs button").forEach(b => b.setAttribute("aria-selected", String(b.id === "rtab-" + id))); U.renderRight(); };
U.renderRight = keepFocus => {
  const b = $("#rbody"); if (!b || !VB.doc) return;
  if (keepFocus && b.contains(document.activeElement) && /^(input|textarea)$/i.test(document.activeElement.tagName)) { U.syncFields(); return; }
  const scroll = b.scrollTop; b.replaceChildren();
  b.setAttribute("aria-labelledby", "rtab-" + U.rtab);
  if (U.rtab === "layers") U.layers(b); else if (U.rtab === "goals") U.goals(b); else U.inspector(b);
  b.scrollTop = scroll;
};
U.syncFields = () => {
  VB.$$("#rbody [data-bind]").forEach(i => { if (document.activeElement === i) return; const sel = VB.selEls()[0]; if (!sel) return; const v = { x: sel.x, y: sel.y, w: sel.w, rot: sel.rot || 0 }[i.dataset.bind]; if (v != null) i.value = VB.round(v, 1); });
};

/* ---------- inspector ---------- */
U.inspector = b => {
  const sel = VB.selEls();
  if (!sel.length) return U.boardSettings(b);
  if (sel.length > 1) return U.multi(b, sel);
  const e = sel[0];
  const names = { photo: "photo", text: e.paper ? "note" : "text", sticker: "sticker", imgsticker: "your sticker", tape: "tape", thread: "red thread" };
  b.append(h("div.phead", h("h2.shout-md", names[e.type] || e.type), e.locked ? h("span.chip.s", "locked") : null));
  const acts = h("div.actrow");
  const A = (n, l, on) => { const x = h("button.cbtn", { type: "button", title: l, "aria-label": l, onclick: on }); x.append(ico(n)); acts.append(x); };
  A("copy", "duplicate", () => VB.dupEls([e.id])); A("front", "bring to front", () => VB.reorder([e.id], "front")); A("backward", "send to back", () => VB.reorder([e.id], "back"));
  A(e.locked ? "unlock" : "lock", e.locked ? "unlock" : "lock", () => VB.setLock([e.id], !e.locked)); A("trash", "delete", () => VB.removeEls([e.id]));
  b.append(acts);
  if (e.locked) { b.append(U.empty("this object is locked", "unlock it to move or edit it.")); return; }
  if (e.type === "photo") photoSec(b, e);
  if (e.type === "text") textSec(b, e);
  if (e.type === "sticker") stickerSec(b, e);
  if (e.type === "imgsticker") imgStickerSec(b, e);
  if (e.type === "tape") tapeSec(b, e);
  if (e.type === "thread") return threadSec(b, e);
  transformSec(b, e);
  if (e.type !== "tape") goalSec(b, e);
};

function transformSec(b, e) {
  const body = [];
  const row = h("div.grid2");
  row.append(U.num("x", e.x, v => { apply([e], x => { x.x = v; }, true); }, { bind: "x" }), U.num("y", e.y, v => { apply([e], x => { x.y = v; }, true); }, { bind: "y" }), U.num("width", e.w, v => { apply([e], x => { x.w = Math.max(20, v); }, true); }, { bind: "w", min: 20 }), U.num("rotate", e.rot || 0, v => { apply([e], x => { x.rot = v; }, true); }, { bind: "rot" }));
  body.push(row);
  body.push(U.slider("rotation", e.rot || 0, -180, 180, 1, v => apply([e], x => { x.rot = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => Math.round(v) + "°"));
  body.push(U.slider("opacity", e.op == null ? 1 : e.op, 0.15, 1, 0.01, v => apply([e], x => { x.op = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => Math.round(v * 100) + "%"));
  b.append(U.section("position + size", body, e.type === "sticker" || e.type === "tape"));
}

/* ----- photo ----- */
function photoSec(b, e) {
  const f = [];
  const chips = h("div.chips"); Object.keys(VB.FRAMES).forEach(k => chips.append(U.chip(VB.FRAMES[k].label, e.frame === k, () => { U.setFrame(e, k); VB.commit(); VB.emit("doc:changed"); rebuild(); })));
  f.push(h("div.fl", "frame style"), chips);
  f.push(h("div.fl", "frame colour"), U.swatches(["", "#fffdf8", "#f6d6e0", "#cfe6e2", "#f3dca0", "#b9d1e8", "#1b1612"], e.fc || "", c => apply([e], x => { x.fc = c; }, true), { noCustom: false }));
  f.push(U.slider("border thickness", e.bw == null ? 1 : e.bw, 0.3, 2.4, 0.05, v => apply([e], x => { x.bw = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => v.toFixed(1) + "x"));
  const cap = h("input", { type: "text", value: e.caption || "", placeholder: "e.g. my dream university", maxlength: 60, "aria-label": "caption", id: "capinp" });
  cap.addEventListener("input", () => apply([e], x => { x.caption = cap.value; }));
  cap.addEventListener("change", () => { VB.commit(); VB.emit("doc:changed"); rebuild(); });
  f.push(U.field("caption", cap));
  b.append(U.section("frame + caption", f, true));

  const im = [];
  const n = e.cells.length;
  if (n > 1) { const cc = h("div.chips"); e.cells.forEach((c, i) => cc.append(U.chip("picture " + (i + 1), U.cellIdx === i, () => { U.cellIdx = i; rebuild(); }))); im.push(cc); }
  if (U.cellIdx >= n) U.cellIdx = 0;
  const ci = U.cellIdx, c = e.cells[ci] || {};
  const rec = c.a && VB.assets.get(c.a);
  im.push(h("div.cellrow", rec ? h("img.cellthumb", { src: rec.url, alt: "current picture" }) : h("div.cellthumb.empty", "empty"), h("div.col", U.btn("replace image", { cls: "sm cream", icon: "image", on: () => U.pickFiles(files => U.replaceCell(e, ci, files[0])) }), U.btn(VB.interact.cropId === e.id ? "done repositioning" : "reposition", { cls: "sm cream", icon: "fit", on: () => { VB.interact.setCrop(VB.interact.cropId === e.id ? null : e.id); rebuild(); } }))));
  im.push(U.slider("zoom in frame", c.z || 1, 1, 4, 0.02, v => apply([e], x => { x.cells[ci].z = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => v.toFixed(2) + "x"));
  im.push(h("p.psub", "double-click the photo, then drag to reposition, scroll to zoom. drop a new file on the frame to swap it."));
  if (e.credit) im.push(h("p.credit", "credit: " + e.credit));
  b.append(U.section("picture", im, true));

  const a = e.adj || (e.adj = { b: 1, c: 1, s: 1, w: 0 }), ad = [];
  const set = (k, v) => apply([e], x => { x.adj = Object.assign({ b: 1, c: 1, s: 1, w: 0 }, x.adj); x.adj[k] = v; });
  ad.push(U.slider("brightness", a.b, 0.5, 1.5, 0.01, v => set("b", v), () => { VB.commit(); VB.emit("doc:changed"); }, v => Math.round(v * 100) + "%"));
  ad.push(U.slider("contrast", a.c, 0.6, 1.6, 0.01, v => set("c", v), () => { VB.commit(); VB.emit("doc:changed"); }, v => Math.round(v * 100) + "%"));
  ad.push(U.slider("saturation", a.s, 0, 2, 0.01, v => set("s", v), () => { VB.commit(); VB.emit("doc:changed"); }, v => Math.round(v * 100) + "%"));
  ad.push(U.slider("warmth", a.w, -1, 1, 0.02, v => set("w", v), () => { VB.commit(); VB.emit("doc:changed"); }, v => (v > 0 ? "+" : "") + v.toFixed(1)));
  ad.push(U.btn("reset adjustments", { cls: "sm cream", on: () => { apply([e], x => { x.adj = { b: 1, c: 1, s: 1, w: 0 }; }, true); rebuild(); } }));
  b.append(U.section("adjust the picture", ad, false));
  b.append(h("div.row", U.btn("save style", { cls: "sm cream", icon: "bookmark", title: "keep this frame look for other boards", on: () => saveStyle("photo", { frame: e.frame, fc: e.fc, bw: e.bw, adj: VB.clone(e.adj) }, VB.FRAMES[e.frame].label) })));
}
function saveStyle(kind, props, base) {
  const name = base + " " + (VB.prefs.styles.filter(s => s.kind === kind).length + 1);
  VB.prefs.styles.push({ kind, name, props }); VB.db.setPref("styles", VB.prefs.styles); VB.toast("style saved. find it in the " + (kind === "photo" ? "frames" : "text") + " panel");
}

/* ----- text / note ----- */
function textSec(b, e) {
  const t = [];
  const ta = h("textarea", { rows: 3, value: e.text, "aria-label": "text", maxlength: 1200, id: "textinp" });
  ta.addEventListener("input", () => apply([e], x => { x.text = ta.value; }));
  ta.addEventListener("change", () => { VB.commit(); VB.emit("doc:changed"); });
  t.push(ta);
  const fc = h("div.chips"); Object.keys(VB.FONTS).forEach(k => fc.append(U.chip(VB.FONTS[k].label, e.font === k, () => { apply([e], x => { x.font = k; }, true); rebuild(); })));
  t.push(h("div.fl", "font style"), fc);
  t.push(U.slider("size", e.fs, 14, 400, 1, v => apply([e], x => { x.fs = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => Math.round(v) + "px"));
  t.push(h("div.fl", "colour"), U.swatches(PALETTE.concat(VB.doc.theme.ink), e.color, (c, done) => apply([e], x => { x.color = c; }, done)));
  t.push(h("div.fl", "alignment"), U.seg([["left", "left"], ["center", "centre"], ["right", "right"]], e.align || "left", v => apply([e], x => { x.align = v; }, true)));
  t.push(U.slider("letter spacing", e.ls || 0, -0.05, 0.4, 0.005, v => apply([e], x => { x.ls = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => v.toFixed(2) + "em"));
  const lhEff = e.lh || (VB.FONTS[e.font] || VB.FONTS.sans).lh;
  t.push(U.slider("line height", lhEff, 0.8, 2.2, 0.01, v => apply([e], x => { x.lh = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => v.toFixed(2)));
  const ol = e.outline;
  t.push(h("div.fl", "outline"), U.swatches(["", "#fffdf8", "#0a0030", "#d9382a"], ol ? ol.c : "", c => { apply([e], x => { x.outline = c ? { c, w: (x.outline && x.outline.w) || Math.max(4, Math.round(x.fs * 0.08)) } : null; }, true); rebuild(); }, { noCustom: true }));
  if (ol) t.push(U.slider("outline width", ol.w, 1, 30, 1, v => apply([e], x => { x.outline.w = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => Math.round(v) + "px"));
  b.append(U.section("text", t, true));

  const p = [];
  const p0 = e.paper;
  p.push(h("div.chips", U.chip("no paper", !p0, () => { apply([e], x => { x.paper = null; }, true); rebuild(); })));
  p.push(h("div.fl", "paper shape"));
  const sh = h("div.chips"); Object.keys(VB.PAPER_SHAPES).forEach(k => sh.append(U.chip(VB.PAPER_SHAPES[k], p0 && p0.shape === k, () => { apply([e], x => { x.paper = Object.assign({ shape: "rect", texture: "grain", color: VB.doc.theme.noteColor }, x.paper, { shape: k }); }, true); rebuild(); })));
  p.push(sh);
  p.push(h("div.fl", "paper texture"));
  const tx = h("div.chips"); Object.keys(VB.PAPER_TEXTURES).forEach(k => tx.append(U.chip(VB.PAPER_TEXTURES[k], p0 && p0.texture === k, () => { apply([e], x => { x.paper = Object.assign({ shape: "rect", texture: "grain", color: VB.doc.theme.noteColor }, x.paper, { texture: k }); }, true); rebuild(); })));
  p.push(tx);
  p.push(h("div.fl", "paper colour"), U.swatches(["#fbf4e1", "#f8f1de", "#fff1a8", "#fde8ef", "#e8efe9", "#bfe3f2", "#efe0b8", "#ffffff", "#2b2a3a"], p0 ? p0.color : "", (c, done) => apply([e], x => { x.paper = Object.assign({ shape: "rect", texture: "grain" }, x.paper, { color: c }); }, done)));
  b.append(U.section("paper", p, !!p0));
  b.append(h("div.row", U.btn("save style", { cls: "sm cream", icon: "bookmark", on: () => saveStyle("text", { font: e.font, fs: e.fs, color: e.color, align: e.align, ls: e.ls, lh: e.lh, outline: VB.clone(e.outline), paper: VB.clone(e.paper) }, VB.FONTS[e.font].label) })));
}

/* ----- stickers ----- */
function stickerSec(b, e) {
  const def = VB.stickerMap()[e.kind] || {}, s = [];
  s.push(h("div.fl", "main colour"), U.swatches(["", "#ffd000", "#cfff00", "#e0632b", "#3daab8", "#9457eb", "#ff7eb6", "#d9382a", "#2f9e5b", "#f1e3c3", "#c9a574"], e.a || "", (c, done) => apply([e], x => { x.a = c; }, done)));
  s.push(h("div.fl", "second colour"), U.swatches(["", "#ffd000", "#cfff00", "#e0632b", "#3daab8", "#9457eb", "#ff7eb6", "#d9382a", "#2f9e5b", "#f1e3c3", "#c9a574"], e.b || "", (c, done) => apply([e], x => { x.b = c; }, done)));
  s.push(h("div.chips", U.chip("white border", e.border !== false, (ev, bt) => { apply([e], x => { x.border = x.border === false; }, true); rebuild(); }), U.chip("flip", !!e.flip, () => { apply([e], x => { x.flip = !x.flip; }, true); rebuild(); }), U.chip(VB.prefs.fav.includes(e.kind) ? "favorited" : "favorite", VB.prefs.fav.includes(e.kind), () => { const i = VB.prefs.fav.indexOf(e.kind); if (i >= 0) VB.prefs.fav.splice(i, 1); else VB.prefs.fav.push(e.kind); VB.db.setPref("fav", VB.prefs.fav); rebuild(); }, { icon: "star" })));
  b.append(U.section("sticker (" + (def.name || e.kind) + ")", s, true));
}
function imgStickerSec(b, e) {
  const s = [];
  s.push(h("div.chips", U.chip("cut-out border", e.cut !== false, () => { apply([e], x => { x.cut = x.cut === false; }, true); rebuild(); })));
  if (e.cut !== false) s.push(U.slider("border size", e.bs == null ? 1 : e.bs, 0.3, 3, 0.05, v => apply([e], x => { x.bs = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => v.toFixed(1) + "x"));
  b.append(U.section("your sticker", s, true));
}
function tapeSec(b, e) {
  const t = [];
  const pc = h("div.chips"); ["plain", "stripe", "dots", "check", "zigzag"].forEach(k => pc.append(U.chip(k, e.pattern === k, () => { apply([e], x => { x.pattern = k; }, true); rebuild(); })));
  t.push(h("div.fl", "pattern"), pc, h("div.fl", "colour"), U.swatches(["#f3dca0", "#f4b4c3", "#b9d1e8", "#cfe6c4", "#e0632b", "#3daab8", "#ffd000", "#9457eb", "#d9382a", "#2f9e5b"], e.color, (c, done) => apply([e], x => { x.color = c; }, done)));
  t.push(U.slider("see-through", e.opacity == null ? 0.82 : e.opacity, 0.3, 1, 0.01, v => apply([e], x => { x.opacity = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => Math.round(v * 100) + "%"));
  t.push(U.slider("length", e.w, 60, 700, 1, v => apply([e], x => { x.w = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => Math.round(v) + "px"));
  t.push(U.slider("width", e.h, 20, 140, 1, v => apply([e], x => { x.h = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => Math.round(v) + "px"));
  b.append(U.section("tape", t, true));
}

/* ----- thread ----- */
function threadSec(b, e) {
  const t = [];
  t.push(h("div.fl", "colour"), U.swatches(["#d9382a", "#0a0030", "#3daab8", "#2f9e5b", "#ffd000", "#ff7eb6", "#fffdf8"], e.color, (c, done) => apply([e], x => { x.color = c; x.pinColor = c; }, done)));
  t.push(U.slider("thickness", e.th || 2.6, 1, 10, 0.2, v => apply([e], x => { x.th = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => v.toFixed(1)));
  t.push(U.slider("curvature", e.sag == null ? 0.1 : e.sag, -0.4, 0.6, 0.01, v => apply([e], x => { x.sag = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => v.toFixed(2)));
  const lab = h("input", { type: "text", value: e.label || "", maxlength: 40, placeholder: "e.g. this leads to...", "aria-label": "label on the thread", id: "threadlabel" });
  lab.addEventListener("input", () => apply([e], x => { x.label = lab.value; })); lab.addEventListener("change", () => { VB.commit(); VB.emit("doc:changed"); });
  t.push(U.field("label", lab));
  t.push(h("div.chips", ...["step one", "this leads to...", "why it matters", "then"].map(l => U.chip(l, e.label === l, () => { apply([e], x => { x.label = l; }, true); rebuild(); }))));
  t.push(h("div.chips", U.chip("pins on", e.pins !== false, () => { apply([e], x => { x.pins = x.pins === false; }, true); rebuild(); })));
  b.append(U.section("string", t, true));

  const pts = VB.threadPts(e, VB.currentById), p = [];
  e.pts.forEach((pt, i) => {
    const edge = i === 0 || i === e.pts.length - 1, att = pt.att && VB.byId(pt.att.id);
    p.push(h("div.pinrow", h("span", edge ? (i === 0 ? "start pin" : "end pin") : "bend pin " + i), h("span.small", att ? "on " + (VB.describe(att).slice(0, 22)) : "free"),
      att ? h("button.mini", { type: "button", title: "let go of the object", "aria-label": "detach pin " + (i + 1), onclick: () => { const q = pts[i]; apply([e], x => { delete x.pts[i].att; x.pts[i].x = q.x; x.pts[i].y = q.y; }, true); rebuild(); } }, ico("unlock")) : null,
      !edge ? h("button.mini", { type: "button", title: "remove this pin", "aria-label": "remove bend pin " + i, onclick: () => { apply([e], x => { x.pts.splice(i, 1); }, true); rebuild(); } }, ico("x")) : null));
  });
  p.push(U.btn("add a bend pin", { cls: "sm cream", icon: "plus", on: () => { U.addPin(e); rebuild(); } }));
  p.push(h("p.psub", "drag a pin to bend or reconnect the string. drop an end pin on another object to attach it. the thread follows when objects move."));
  b.append(U.section("pins", p, true));
  const o = [h("div.chips", U.chip("reverse direction", false, () => { apply([e], x => { x.pts.reverse(); }, true); rebuild(); }))];
  b.append(U.section("order", [h("p.psub", "threads are layers: use send to back or bring to front above to pass behind or in front of photos."), ...o], false));
}

/* ----- goals on an object ----- */
function goalSec(b, e) {
  const g = e.goal, body = [];
  if (!g) {
    body.push(h("p.psub", "attach a goal to this object: a title, a date, small steps and your reason. it stays quiet on the board."));
    body.push(U.btn("attach a goal", { cls: "sm", icon: "flag", on: () => { e.goal = { title: e.caption || (e.text ? String(e.text).split("\n")[0].slice(0, 40) : ""), desc: "", date: "", priority: "med", status: "idea", why: "", steps: [], progress: 0, cat: "" }; VB.scene.el(e); VB.commit(); VB.emit("doc:changed"); rebuild(); $("#goaltitle") && $("#goaltitle").focus(); } }));
  } else {
    const touch = (live) => { VB.scene.el(e); if (!live) { VB.commit(); VB.emit("doc:changed"); } };
    const ti = h("input", { id: "goaltitle", type: "text", value: g.title || "", maxlength: 80, placeholder: "e.g. get into U of T", "aria-label": "goal title" });
    ti.addEventListener("input", () => { g.title = ti.value; VB.scene.el(e); }); ti.addEventListener("change", () => touch());
    body.push(U.field("goal", ti));
    const de = h("textarea", { rows: 2, "aria-label": "description", placeholder: "what does done look like?" }); de.value = g.desc || "";
    de.addEventListener("change", () => { g.desc = de.value; touch(); });
    body.push(U.field("description", de));
    const dt = h("input", { type: "date", value: g.date || "", "aria-label": "target date" }); dt.addEventListener("change", () => { g.date = dt.value; touch(); rebuild(); });
    body.push(U.field("target date", dt, g.date ? daysText(g.date) : ""));
    body.push(h("div.fl", "priority"), U.seg([["low", "low"], ["med", "medium"], ["high", "high"]], g.priority || "med", v => { g.priority = v; touch(); }));
    body.push(h("div.fl", "status"), U.seg([["idea", "an idea"], ["doing", "in progress"], ["done", "done"]], g.status || "idea", v => { g.status = v; touch(); rebuild(); }));
    if (!(g.steps && g.steps.length)) body.push(U.slider("progress", g.progress || 0, 0, 100, 1, v => { g.progress = v; VB.scene.el(e); }, () => touch(), v => Math.round(v) + "%"));
    const why = h("textarea", { rows: 2, "aria-label": "my reasons", placeholder: "why does this matter to me?" }); why.value = g.why || "";
    why.addEventListener("change", () => { g.why = why.value; touch(); });
    body.push(U.field("my reason", why));
    if (VB.doc.categories.length) { const sel = h("select", { "aria-label": "category" }, h("option", { value: "" }, "no category"), ...VB.doc.categories.map(c => h("option", { value: c.id, selected: g.cat === c.id }, c.name))); sel.addEventListener("change", () => { g.cat = sel.value; touch(); }); body.push(U.field("category", sel)); }
    body.push(h("div.fl", "small steps"));
    const list = h("div.steplist");
    (g.steps = g.steps || []).forEach((s, i) => {
      const cb = h("input", { type: "checkbox", checked: !!s.d, "aria-label": "done: " + s.t }); cb.addEventListener("change", () => { s.d = cb.checked; touch(); rebuild(); });
      list.append(h("label.stepitem" + (s.d ? ".done" : ""), cb, h("span", s.t), h("button.mini", { type: "button", title: "remove step", "aria-label": "remove step " + s.t, onclick: ev => { ev.preventDefault(); g.steps.splice(i, 1); touch(); rebuild(); } }, ico("x"))));
    });
    body.push(list);
    const ns = h("input", { type: "text", maxlength: 80, placeholder: "add a small step", "aria-label": "new step" });
    const addS = () => { const v = ns.value.trim(); if (!v) { ns.focus(); return; } g.steps.push({ t: v, d: false }); touch(); rebuild(); setTimeout(() => { const n = $("#rbody input[aria-label='new step']"); n && n.focus(); }, 30); };
    ns.addEventListener("keydown", ev => { if (ev.key === "Enter") addS(); });
    body.push(h("div.row", ns, U.btn("add", { cls: "sm", on: addS })));
    body.push(U.btn("remove goal", { cls: "sm cream", icon: "trash", on: () => { e.goal = null; VB.scene.el(e); VB.commit(); VB.emit("doc:changed"); rebuild(); } }));
  }
  b.append(U.section("goal" + (g && g.title ? ": " + g.title.slice(0, 18) : ""), body, !!g));
}
function daysText(d) { const n = Math.round((new Date(d + "T00:00") - new Date(new Date().toDateString())) / 864e5); return n > 1 ? n + " days to go" : n === 1 ? "tomorrow" : n === 0 ? "today" : Math.abs(n) + " days ago"; }

/* ----- several objects ----- */
U.multi = (b, sel) => {
  const ids = sel.map(e => e.id);
  b.append(h("div.phead", h("h2.shout-md", sel.length + " objects")));
  const acts = h("div.actrow"); const A = (n, l, on) => { const x = h("button.cbtn", { type: "button", title: l, "aria-label": l, onclick: on }); x.append(ico(n)); acts.append(x); };
  A("copy", "duplicate", () => VB.dupEls(ids)); A("group", "group", () => VB.group(ids)); A("ungroup", "ungroup", () => VB.ungroup(ids)); A("front", "bring to front", () => VB.reorder(ids, "front")); A("backward", "send to back", () => VB.reorder(ids, "back")); A("lock", "lock", () => VB.setLock(ids, true)); A("trash", "delete", () => VB.removeEls(ids));
  b.append(acts);
  const al = h("div.chips"); [["left", "align left"], ["center", "align centre"], ["right", "align right"], ["top", "align top"], ["middle", "align middle"], ["bottom", "align bottom"]].forEach(([k, l]) => al.append(h("button.chip", { type: "button", onclick: () => VB.align(ids, k) }, l)));
  b.append(U.section("align", [al], true));
  b.append(U.section("opacity", [U.slider("opacity", sel[0].op == null ? 1 : sel[0].op, 0.15, 1, 0.01, v => apply(sel, x => { x.op = v; }), () => { VB.commit(); VB.emit("doc:changed"); }, v => Math.round(v * 100) + "%")], false));
  b.append(h("p.psub", "grouped objects move together. shift-click to add or remove objects from the selection."));
};

/* ---------- board settings ---------- */
U.boardSettings = b => {
  const d = VB.doc, th = d.theme;
  b.append(h("div.phead", h("h2.shout-md", "the board"), h("p.psub", "nothing selected. these settings are for the whole board.")));
  const redraw = () => { VB.scene.chrome(); VB.scene.all(); VB.interact.draw(); };
  const commit = () => { VB.commit(); VB.emit("doc:changed"); };
  /* size */
  const sz = [];
  const sc = h("div.chips"); Object.keys(VB.BOARD_SIZES).forEach(k => sc.append(U.chip(VB.BOARD_SIZES[k].label, d.artboard.preset === k, () => { const s = VB.BOARD_SIZES[k]; d.artboard = { w: s.w, h: s.h, preset: k }; redraw(); commit(); VB.fit(); rebuild(); })));
  sz.push(sc);
  const gw = U.num("width", d.artboard.w, v => { d.artboard = { w: VB.clamp(Math.round(v), 400, 6000), h: d.artboard.h, preset: "custom" }; redraw(); commit(); rebuild(); }, { min: 400, max: 6000 });
  const gh = U.num("height", d.artboard.h, v => { d.artboard = { w: d.artboard.w, h: VB.clamp(Math.round(v), 400, 6000), preset: "custom" }; redraw(); commit(); rebuild(); }, { min: 400, max: 6000 });
  sz.push(h("div.grid2", gw, gh));
  sz.push(U.btn("rotate orientation", { cls: "sm cream", icon: "rotate", on: () => { d.artboard = { w: d.artboard.h, h: d.artboard.w, preset: "custom" }; redraw(); commit(); VB.fit(); rebuild(); } }));
  sz.push(h("p.psub", "objects can sit outside the board. exports use the board area (or fit all objects)."));
  b.append(U.section("size + orientation", sz, true));
  /* paper */
  const pp = [];
  const pc = h("div.chips"); Object.keys(VB.BOARD_PAPERS).forEach(k => pc.append(U.chip(VB.BOARD_PAPERS[k].label, th.paper === k, () => { th.paper = k; th.paperColor = ""; redraw(); commit(); rebuild(); })));
  pp.push(pc, h("div.fl", "paper colour"), U.swatches(["", "#f8f4ea", "#f1e7d0", "#e8d6ac", "#fde8ef", "#e6f1ef", "#ece8f6", "#2b2a3a"], th.paperColor || "", (c, done) => { th.paperColor = c; VB.scene.chrome(); if (done) commit(); }));
  pp.push(U.slider("paper grain", th.grain == null ? 0.6 : th.grain, 0, 1.5, 0.02, v => { th.grain = v; redraw(); }, commit, v => Math.round(v * 100) + "%"));
  pp.push(U.slider("shadow strength", th.shadow == null ? 0.5 : th.shadow, 0, 1, 0.02, v => { th.shadow = v; VB.scene.chrome(); }, commit, v => Math.round(v * 100) + "%"));
  b.append(U.section("paper + materials", pp, true));
  /* moods */
  const mo = [h("p.psub", "one tap changes paper, tone and new-item colours. your photos and notes stay as they are.")];
  const mc = h("div.chips"); Object.keys(VB.MOODS).forEach(k => mc.append(U.chip(VB.MOODS[k].label, th.mood === k, () => { VB.applyMood(d, k); redraw(); commit(); rebuild(); VB.toast(VB.MOODS[k].label + " applied")})));
  mo.push(mc);
  b.append(U.section("mood presets", mo, false));
  /* view options */
  const vo = [h("div.chips", U.chip("goal badges on the board", d.view.badges !== false, () => { d.view.badges = d.view.badges === false; VB.scene.all(); VB.saveSoon(); rebuild(); }), U.chip("alignment grid", !!d.view.grid, () => { d.view.grid = !d.view.grid; VB.view.grid = d.view.grid; VB.scene.chrome(); VB.saveSoon(); rebuild(); }), U.chip("snap to guides", d.view.snap !== false, () => { d.view.snap = d.view.snap === false; VB.saveSoon(); rebuild(); }))];
  b.append(U.section("on the canvas", vo, false));
  b.append(h("div.kbd", h("p.shout-sm", "shortcuts"), h("ul", ...[["v / h / t / n", "select / hand / thread / text"], ["+ / -", "zoom"], ["space + drag", "pan"], ["ctrl + wheel", "zoom"], ["ctrl+z / y", "undo / redo"], ["ctrl+d", "duplicate"], ["arrows", "nudge (shift = 10)"], ["[ ]", "rotate"], ["alt + up/down", "resize"], ["ctrl+g", "group"], ["del", "delete"], ["shift+1", "fit board"]].map(([k, v]) => h("li", h("kbd", k), " " + v)))));
};

/* ---------- layers ---------- */
U.layers = b => {
  b.append(h("div.phead", h("h2.shout-md", "layers"), h("p.psub", "top of the list is the front. pick anything, even if it is buried.")));
  const els = VB.doc.elements.slice().reverse();
  if (!els.length) { b.append(U.empty("nothing on the board yet", "add a photo, a sticker or a note and it shows up here.")); return; }
  const list = h("ul.layers");
  els.forEach((e, ri) => {
    const i = VB.doc.elements.length - 1 - ri;
    const nm = { photo: "photo", text: "note", sticker: "sticker", imgsticker: "sticker", tape: "tape", thread: "thread" }[e.type];
    const li = h("li.layer" + (VB.sel.has(e.id) ? ".sel" : "") + (e.hidden ? ".off" : ""));
    li.append(h("button.lname", { type: "button", onclick: ev => { VB.select([e.id], ev.shiftKey); VB.interact.draw(); }, title: VB.describe(e) }, h("span.lt", nm), h("span.ld", VB.describe(e).replace(/^[a-z ]+: /, "").slice(0, 26))),
      h("button.mini", { type: "button", title: e.hidden ? "show" : "hide", "aria-label": (e.hidden ? "show " : "hide ") + nm, "aria-pressed": String(!!e.hidden), onclick: () => { VB.setHidden(e.id, !e.hidden); } }, ico(e.hidden ? "eyeoff" : "eye")),
      h("button.mini", { type: "button", title: e.locked ? "unlock" : "lock", "aria-label": (e.locked ? "unlock " : "lock ") + nm, "aria-pressed": String(!!e.locked), onclick: () => VB.setLock([e.id], !e.locked) }, ico(e.locked ? "lock" : "unlock")),
      h("button.mini", { type: "button", title: "move forward", "aria-label": "move " + nm + " forward", disabled: ri === 0, onclick: () => VB.moveLayer(e.id, i + 1) }, ico("up")),
      h("button.mini", { type: "button", title: "move back", "aria-label": "move " + nm + " back", disabled: i === 0, onclick: () => VB.moveLayer(e.id, i - 1) }, ico("down")));
    list.append(li);
  });
  b.append(list);
};

/* ---------- goals ---------- */
U.goalFilter = { status: "all", cat: "all" };
U.goals = b => {
  b.append(h("div.phead", h("h2.shout-md", "goals"), h("p.psub", "everything on the board that has a goal attached.")));
  const all = VB.doc.elements.filter(e => e.goal && (e.goal.title || (e.goal.steps || []).length));
  const F = U.goalFilter;
  const sc = h("div.chips"); [["all", "all"], ["idea", "ideas"], ["doing", "in progress"], ["done", "done"]].forEach(([k, l]) => sc.append(U.chip(l, F.status === k, () => { F.status = k; rebuild(); })));
  b.append(sc);
  if (VB.doc.categories.length) { const sel = h("select", { "aria-label": "filter by category" }, h("option", { value: "all" }, "all categories"), ...VB.doc.categories.map(c => h("option", { value: c.id, selected: F.cat === c.id }, c.name))); sel.addEventListener("change", () => { F.cat = sel.value; rebuild(); }); b.append(sel); }
  const list = all.filter(e => (F.status === "all" || (e.goal.status || "idea") === F.status) && (F.cat === "all" || e.goal.cat === F.cat));
  if (!all.length) { b.append(U.empty("no goals yet", "select a photo or note and open its goal section to attach one.")); return; }
  if (!list.length) { b.append(U.empty("nothing matches", "change the filters above.")); return; }
  const ul = h("ul.goallist");
  list.sort((a, c) => (a.goal.date || "9").localeCompare(c.goal.date || "9"));
  list.forEach(e => {
    const g = e.goal, pr = VB.goalProgress(g);
    ul.append(h("li", h("button.goalbtn" + (g.status === "done" ? ".done" : ""), { type: "button", onclick: () => { VB.select([e.id]); VB.zoomBox(VB.aabb(e), 220); U.setRTab("inspector"); } },
      h("span.gt", g.title || "untitled goal"), h("span.gm", [g.status === "done" ? "done" : g.status === "doing" ? "in progress" : "idea", g.date ? daysText(g.date) : "", g.priority === "high" ? "high priority" : ""].filter(Boolean).join(" · ")),
      h("span.bar", h("span.fill", { style: { width: pr + "%" } })), h("span.small", pr + "% · " + (g.steps || []).filter(s => s.d).length + "/" + (g.steps || []).length + " steps"))));
  });
  b.append(ul);
};
})();
