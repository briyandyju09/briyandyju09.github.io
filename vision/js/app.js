/* App shell: boot, routing, the boards dashboard, floating tools. */
(function () {
"use strict";
const VB = window.VB, h = VB.h, $ = VB.$, U = VB.ui, ico = U.ico, D = VB.dialogs;
let editorBuilt = false, current = null;

/* ---------- theme ---------- */
function setTheme(t) { document.documentElement.dataset.theme = t; VB.db.setPref("theme", t); const m = $("#themebtn"); if (m) { m.replaceChildren(ico(t === "dark" ? "sun" : "moon")); m.setAttribute("aria-label", t === "dark" ? "switch to day theme" : "switch to night theme"); } const mt = document.querySelector('meta[name="theme-color"]'); if (mt) mt.content = t === "dark" ? "#120637" : "#f3effd"; }

/* ---------- fonts ---------- */
async function loadFonts() {
  const specs = ["400 40px 'Instrument Serif'", "500 40px 'Space Grotesk'", "400 40px 'Special Elite'", "600 40px 'Caveat'", "400 40px 'Homemade Apple'", "800 40px 'Bricolage Grotesque'", "700 40px 'Old Standard TT'", "400 40px 'Courier Prime'", "italic 400 40px 'Instrument Serif'"];
  try { await Promise.all(specs.map(s => document.fonts.load(s, "Aa"))); } catch (e) { /* fall back to system fonts */ }
  VB.fontsEpoch++;
  if (VB.doc && !$("#view-editor").hidden) VB.scene.all();
}

/* ---------- dashboard ---------- */
async function showDash() {
  current = null; document.body.classList.remove("in-editor", "previewing");
  $("#view-editor").hidden = true; const d = $("#view-dash"); d.hidden = false;
  document.title = "Vision Board Studio";
  d.replaceChildren();
  const boards = await VB.db.listBoards().catch(() => []);
  const top = h("header.dtop", h("a.brand", { href: "#/" }, h("span.logo", { "aria-hidden": "true" }, ico("pin")), h("span.shout-md", "vision board studio")), h("span.sp"), U.btn("restore a backup", { cls: "sm cream", icon: "upload", on: () => D.restore() }), h("button.round", { type: "button", id: "themebtn", title: "day or night", onclick: () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark") }));
  const hero = h("section.dhero", h("div.dcopy",
    h("h1.display", "Make a board you'd ", h("span.marker", "tape to your wall"), "."),
    h("p.lead", "photos, polaroids, notes, stickers and red strings on real-feeling paper. pin your goals, connect them, export a wallpaper."),
    h("div.heroact", U.btn("new blank board", { icon: "plus", on: () => newBoardDialog() }), U.btn("start from a template", { cls: "cream", icon: "template", on: () => document.getElementById("dtemplates").scrollIntoView({ behavior: "smooth" }) })),
    !VB.db.ok ? h("p.status.bad", "saving is switched off in this browser mode, so boards will not be kept after you close the tab.") : null),
    h("div.dart", { "aria-hidden": "true" }, heroArt()));
  const sec = h("section.dboards", { "aria-labelledby": "bh" }, h("h2.shout-lg", { id: "bh" }, "your boards"));
  if (!boards.length) sec.append(h("div.card.empty-card", h("p.shout-md", "no boards yet"), h("p", "start blank, or grab a template below. it saves itself as you go."), U.btn("new blank board", { cls: "cream", icon: "plus", on: () => newBoardDialog() })));
  else {
    const grid = h("div.bgrid"); boards.forEach((b, i) => grid.append(boardCard(b, i))); sec.append(grid);
  }
  const tpl = h("section.dtemplates#dtemplates", { "aria-labelledby": "th" }, h("h2.shout-lg", { id: "th" }, "start from a template"), h("p.lead", "starting points, never rules. everything on them is yours to move, swap or delete."));
  const tg = h("div.tpls.big"); tpl.append(tg);
  VB.TEMPLATES.forEach((t, i) => {
    const c = h("button.tpl", { type: "button", "aria-label": "use template " + t.name, style: { "--tilt": (i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.5) + "deg" }, onclick: () => D.template(t) }, h("div.tplprev", h("span.small", "loading...")), h("span.shout-sm", t.name), h("span.small", t.desc));
    tg.append(c); D.templateThumb(t).then(n => c.querySelector(".tplprev").replaceChildren(n)).catch(() => {});
  });
  const foot = h("footer.dfoot", h("p", "everything stays on your device. back up a board any time from the editor menu."), h("p", h("a", { href: "../" }, "back to briyan.xyz")));
  d.append(h("div.scenery", { "aria-hidden": "true" }, bubble("b1"), bubble("b2"), bubble("b3"), bubble("b4")), top, hero, sec, tpl, foot);
  setTheme(document.documentElement.dataset.theme || "light");
}
function bubble(c) { return h("i.bub." + c); }
function heroArt() {
  /* a tiny live preview collage built from the same renderer */
  const doc = VB.buildTemplate("classic");
  const d = document.createElement("div"); d.className = "heroboard";
  Promise.all(VB.assetIdsOf(doc.elements).map(id => VB.loadAsset(id))).then(() => { d.innerHTML = VB.docSVG(doc, { width: "100%", height: "100%", par: "xMidYMid slice", uid: VB.uid(), view: VB.coverView(doc, 1.55) }); });
  return d;
}
function boardCard(rec, i) {
  const tilt = (i % 2 ? 1 : -1) * (0.5 + (i % 3) * 0.4);
  const prev = h("div.bprev", h("span.small", "loading..."));
  const data = VB.boardFromRecord(rec);
  const draw = async () => {
    if (data.cover && data.cover !== "none") { await VB.loadAsset(data.cover); const a = VB.assets.get(data.cover); if (a) { prev.replaceChildren(h("img", { src: a.url, alt: "cover of " + rec.name })); return; } }
    const ids = VB.assetIdsOf(data.elements).slice(0, 14); await Promise.all(ids.map(id => VB.loadAsset(id)));
    prev.innerHTML = data.elements.length ? VB.docSVG(data, { width: "100%", height: "100%", par: "xMidYMid slice", uid: VB.uid(), view: VB.coverView(data, 1.5), fill: (data.theme && data.theme.paperColor) || (VB.BOARD_PAPERS[(data.theme || {}).paper] || VB.BOARD_PAPERS.cream).color }) : `<div class="blank"><span class="shout-sm">blank</span></div>`;
  };
  draw().catch(() => {});
  const card = h("article.card.bcard", { style: { "--tilt": tilt + "deg" } }, h("a.bopen", { href: "#/b/" + rec.id, "aria-label": "open " + rec.name }, prev),
    h("div.bmeta", h("h3.shout-md", rec.name), h("p.small", "edited " + VB.fmtDate(rec.updated) + " · " + data.elements.length + " object" + (data.elements.length === 1 ? "" : "s") + " · " + data.artboard.w + " × " + data.artboard.h)),
    h("div.bact", h("a.btn.sm.cream", { href: "#/b/" + rec.id }, "open"), U.btn("rename", { cls: "sm cream", on: () => renameDialog(rec) }), U.btn("duplicate", { cls: "sm cream", icon: "copy", on: () => dupBoard(rec) }), U.btn("cover", { cls: "sm cream", icon: "image", on: () => coverDialog(rec, data) }), U.btn("delete", { cls: "sm danger", icon: "trash", on: () => D.confirm("delete “" + rec.name + "”?", "this removes the board and its pictures from this device. back it up first if you might want it back.", "delete it", () => delBoard(rec), true) })));
  return card;
}
async function dupBoard(rec) {
  const d = VB.clone(VB.boardFromRecord(rec)); d.id = "b" + VB.uid(); d.name = rec.name + " copy"; d.created = d.updated = Date.now();
  await VB.db.putBoard({ id: d.id, name: d.name, created: d.created, updated: d.updated, cover: d.cover || "", data: { artboard: d.artboard, theme: d.theme, categories: d.categories, elements: d.elements, uploads: d.uploads, view: d.view } });
  VB.toast("duplicated"); showDash();
}
async function delBoard(rec) {
  const data = VB.boardFromRecord(rec), mine = new Set(VB.assetIdsOf(data.elements).concat(data.uploads || []));
  await VB.db.delBoard(rec.id);
  const others = await VB.db.listBoards(), used = new Set(); others.forEach(b => VB.assetIdsOf((b.data || {}).elements || []).concat((b.data || {}).uploads || []).forEach(id => used.add(id)));
  for (const id of mine) if (!used.has(id) && !(VB.sampleIds || []).includes(id)) { await VB.db.delAsset(id).catch(() => {}); const a = VB.assets.get(id); if (a && a.url) URL.revokeObjectURL(a.url); VB.assets.delete(id); }
  VB.toast("board deleted"); showDash();
}
function renameDialog(rec) {
  const inp = h("input", { type: "text", value: rec.name, maxlength: 60, "aria-label": "board name" });
  const go = async () => { const v = inp.value.trim(); if (!v) { inp.focus(); return false; } rec.name = v; rec.updated = Date.now(); const full = await VB.db.getBoard(rec.id); full.name = v; await VB.db.putBoard(full); showDash(); };
  const m = D.modal({ title: "rename board", body: U.field("name", inp), actions: [{ label: "cancel" }, { label: "rename", cls: "", on: go }] });
  inp.addEventListener("keydown", e => { if (e.key === "Enter") go().then(r => { if (r !== false) m.close(); }); });
}
function coverDialog(rec, data) {
  const ids = VB.assetIdsOf(data.elements).concat(data.uploads || []).filter((x, i, a) => a.indexOf(x) === i);
  const body = h("div.col", h("p", "pick one of this board's pictures, or go back to the live preview."));
  const g = h("div.thumbs");
  Promise.all(ids.map(id => VB.loadAsset(id))).then(() => ids.forEach(id => { const a = VB.assets.get(id); if (!a) return; g.append(h("button.thumb", { type: "button", "aria-label": "use " + (a.name || "picture") + " as cover", onclick: async () => { const full = await VB.db.getBoard(rec.id); full.cover = id; await VB.db.putBoard(full); m.close(); showDash(); } }, h("img", { src: a.url, alt: "" }))); }));
  body.append(g);
  const m = D.modal({ title: "board cover", body, actions: [{ label: "cancel" }, { label: "use live preview", cls: "cream", on: async () => { const full = await VB.db.getBoard(rec.id); full.cover = ""; await VB.db.putBoard(full); showDash(); } }] });
}
function newBoardDialog() {
  const name = h("input", { type: "text", value: "my vision board", maxlength: 60, "aria-label": "board name" });
  let size = "landscape", mood = "film";
  const sz = h("div.chips"), mo = h("div.chips");
  const paint = () => { sz.replaceChildren(); Object.keys(VB.BOARD_SIZES).forEach(k => sz.append(U.chip(VB.BOARD_SIZES[k].label, size === k, () => { size = k; paint(); }))); mo.replaceChildren(); Object.keys(VB.MOODS).forEach(k => mo.append(U.chip(VB.MOODS[k].label, mood === k, () => { mood = k; paint(); }))); };
  paint();
  D.modal({ title: "new blank board", body: h("div.col", U.field("name", name), h("div.fl", "shape"), sz, h("div.fl", "look"), mo, h("p.psub", "you can change all of this later. the board can also grow: objects can sit outside it.")), actions: [{ label: "cancel" }, { label: "create board", cls: "", icon: "plus", on: async () => {
    const d = VB.newDoc(name.value.trim() || "untitled board", size); VB.applyMood(d, mood);
    await VB.db.putBoard({ id: d.id, name: d.name, created: d.created, updated: d.updated, cover: "", data: { artboard: d.artboard, theme: d.theme, categories: d.categories, elements: d.elements, uploads: [], view: d.view } });
    location.hash = "#/b/" + d.id;
  } }] });
}

/* ---------- editor ---------- */
function buildEditorOnce() {
  if (editorBuilt) return; editorBuilt = true;
  VB.scene.init(); VB.interact.init(); U.wireDrop();
  U.buildRail(); U.buildRight(); U.buildToolpill();
  VB.on("sel", () => { U.renderCtx(); U.renderRight(); if (U.tab === "frames" || U.tab === "threads") U.renderPanel(); if (VB.sel.size) document.body.classList.add("has-sel"); else document.body.classList.remove("has-sel"); });
  VB.on("doc:changed", () => { U.renderRight(true); U.renderCtx(); U.syncEmpty(); if (U.tab === "uploads" || U.tab === "paper") U.renderPanel(); });
  VB.on("hist", U.syncToolbar); VB.on("view", U.syncToolbar);
  VB.on("save", U.setSaveState);
  VB.on("tool", t => { VB.$$("#toolpill [data-tool]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tool === t))); if (U.tab === "threads") U.renderPanel(); });
  VB.on("crop", () => { U.renderRight(); });
  VB.on("live", el => { if (el) U.syncFields(); });
  window.addEventListener("pagehide", () => { if (VB.doc && VB.dirty) VB.saveNow(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && VB.doc && VB.dirty) VB.saveNow(); });
}
U.buildToolpill = () => {
  const p = $("#toolpill"); p.replaceChildren();
  const t = (id, ic, label) => { const b = h("button.round", { type: "button", "data-tool": id, title: label, "aria-label": label, "aria-pressed": String(VB.interact.tool === id), onclick: () => VB.setTool(id) }); b.append(ico(ic)); return b; };
  p.append(t("select", "cursor", "select and move (v)"), t("hand", "hand", "pan the board (h)"), t("thread", "thread", "red thread (t)"));
  const tx = h("button.round", { type: "button", title: "add text (n)", "aria-label": "add text", onclick: () => U.addText({ text: "write something", font: "hand", fs: 64, w: 600 }) }); tx.append(ico("type")); p.append(tx);
  const zb = (n, l, f) => { const b = h("button.round.zm", { type: "button", title: l, "aria-label": l, onclick: f }); b.append(ico(n)); return b; };
  p.append(zb("minus", "zoom out", () => VB.zoomAt(1 / 1.25)), zb("fit", "fit the whole board", () => VB.fit()), zb("plus", "zoom in", () => VB.zoomAt(1.25)));
};
U.syncEmpty = () => {
  const e = $("#emptyhint"); if (!e) return;
  e.hidden = !!(VB.doc && VB.doc.elements.length);
};
async function openBoard(id) {
  const rec = await VB.db.getBoard(id);
  if (!rec) { VB.toast("that board was not found on this device", "bad"); location.hash = "#/"; return; }
  $("#view-dash").hidden = true; $("#view-editor").hidden = false; document.body.classList.add("in-editor");
  buildEditorOnce();
  await VB.openDoc(VB.boardFromRecord(rec));
  current = id; document.title = VB.doc.name + " · Vision Board Studio";
  VB.view.grid = !!VB.doc.view.grid;
  VB.scene.chrome(); VB.scene.all();
  U.buildToolbar(); U.renderPanel(); U.renderRight(); U.renderCtx(); U.syncEmpty(); U.setSaveState({ state: "saved" });
  VB.setTool("select");
  if (VB.doc.view && VB.doc.view.x === 0 && VB.doc.view.y === 0) requestAnimationFrame(() => VB.fit()); else VB.setView({}, true);
  if (window.innerWidth < 900) { $("#left").classList.add("collapsed"); document.body.classList.remove("panel-open"); }
  $("#right").classList.toggle("off", window.innerWidth >= 900 && window.innerWidth < 1700);
}

/* ---------- router ---------- */
async function route() {
  const m = /^#\/b\/([\w-]+)/.exec(location.hash);
  if (current && VB.doc && VB.dirty) await VB.saveNow();
  if (m) { if (VB.interact.editing) VB.interact.endEdit(true); await openBoard(m[1]); } else await showDash();
}
async function boot() {
  await VB.db.open();
  await U.loadPrefs();
  const th = await VB.db.getPref("theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = th;
  window.addEventListener("hashchange", route);
  await route();
  loadFonts();
  document.body.classList.add("ready");
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
