/* Editor UI, part 1: building blocks, adding things to the board, toolbar and the left-hand tool panels. */
(function () {
"use strict";
const VB = window.VB, h = VB.h, $ = VB.$, icon = VB.icon;
const U = VB.ui = { tab: "photos" };
VB.prefs = { fav: [], styles: [], customStickers: [] };

/* ---------- widgets ---------- */
const ico = (n, c) => { const s = document.createElement("span"); s.className = "ico-wrap"; s.innerHTML = icon(n, c); s.setAttribute("aria-hidden", "true"); return s; };
U.ico = ico;
U.btn = (label, o) => { o = o || {}; const b = h("button.btn" + (o.cls ? "." + o.cls.split(" ").join(".") : ""), { type: "button", title: o.title, onclick: o.on, disabled: o.disabled, "aria-label": o.aria }); if (o.icon) b.append(ico(o.icon)); if (label) b.append(label); return b; };
U.round = (name, label, on, o) => { o = o || {}; const b = h("button.round" + (o.cls ? "." + o.cls : ""), { type: "button", title: label, "aria-label": label, onclick: on, "aria-pressed": o.pressed == null ? null : String(!!o.pressed), disabled: o.disabled }); b.append(ico(name)); return b; };
U.chip = (label, on, cb, o) => { o = o || {}; const b = h("button.chip" + (o.tone ? ".t-" + o.tone : ""), { type: "button", "aria-pressed": String(!!on), onclick: e => cb(e, b), title: o.title }); if (o.icon) b.append(ico(o.icon)); b.append(label); return b; };
U.field = (label, input, hint) => h("label.field", h("span.fl", label), input, hint ? h("span.hint", hint) : null);
U.section = (title, kids, open) => { const d = h("details.sec", open ? { open: true } : null, h("summary", h("span.shout-sm", title)), h("div.sec-body", kids)); return d; };
U.slider = (label, val, min, max, step, onInput, onChange, fmt) => {
  fmt = fmt || (v => String(VB.round(v, 2)));
  const out = h("output.val", fmt(val)), inp = h("input", { type: "range", min, max, step, value: val, "aria-label": label });
  inp.addEventListener("input", () => { const v = parseFloat(inp.value); out.textContent = fmt(v); onInput && onInput(v); });
  inp.addEventListener("change", () => { onChange && onChange(parseFloat(inp.value)); });
  return h("div.slider", h("span.fl", label), inp, out);
};
U.num = (label, val, cb, o) => {
  o = o || {};
  const inp = h("input", { type: "number", value: VB.round(val, 1), step: o.step || 1, min: o.min, max: o.max, "aria-label": label, "data-bind": o.bind });
  inp.addEventListener("change", () => { const v = parseFloat(inp.value); if (!isNaN(v)) cb(v); });
  return U.field(label, inp);
};
U.swatches = (colors, cur, cb, o) => {
  o = o || {};
  const wrap = h("div.swatches", { role: "group", "aria-label": o.label || "colour" });
  colors.forEach(c => { const b = h("button.sw", { type: "button", style: { background: c || "transparent" }, "aria-pressed": String((cur || "") === (c || "")), title: c || "none", "aria-label": "colour " + (c || "none"), onclick: () => { cb(c); $$s(wrap).forEach(x => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); } }); if (!c) b.classList.add("none"); wrap.append(b); });
  const pick = h("input", { type: "color", value: /^#[0-9a-f]{6}$/i.test(cur || "") ? cur : "#0a0030", "aria-label": "custom colour", title: "custom colour" });
  pick.addEventListener("input", () => cb(pick.value)); pick.addEventListener("change", () => { cb(pick.value, true); });
  if (!o.noCustom) wrap.append(h("span.sw-custom", pick));
  return wrap;
};
const $$s = w => Array.from(w.querySelectorAll(".sw"));
U.seg = (opts, cur, cb) => { const w = h("div.seg", { role: "group" }); opts.forEach(([v, l]) => w.append(h("button", { type: "button", "aria-pressed": String(v === cur), title: l, onclick: () => { cb(v); Array.from(w.children).forEach(c => c.setAttribute("aria-pressed", "false")); w.children[opts.findIndex(o => o[0] === v)].setAttribute("aria-pressed", "true"); } }, l))); return w; };
U.empty = (title, text) => h("div.empty", h("p.shout-sm", title), h("p", text));

/* ---------- little previews of an element or sticker ---------- */
U.previewEl = (el, pad) => {
  const doc = { theme: VB.doc.theme, artboard: { w: 100, h: 100 }, elements: [el] };
  if (el.type === "text") VB.layoutText(el);
  let box;
  if (el.type === "photo") { const L = VB.photoLayout(el); el.h = L.H; }
  const b = el.type === "thread" ? VB.threadBox(el) : VB.aabb(el);
  pad = pad == null ? 14 : pad;
  const svg = VB.docSVG(doc, { uid: VB.uid(), transparent: true, view: { x: b.x1 - pad, y: b.y1 - pad, w: (b.x2 - b.x1) + pad * 2, h: (b.y2 - b.y1) + pad * 2 }, width: "100%", height: "100%", par: "xMidYMid meet" });
  const d = document.createElement("div"); d.className = "pv"; d.innerHTML = svg; return d;
};
U.stickerTile = (s, o) => {
  o = o || {};
  const svg = `<svg viewBox="0 0 ${s.w} ${s.h}" aria-hidden="true">${s.svg(s.a, s.b)}</svg>`;
  const b = h("button.tile.stk", { type: "button", title: s.name, "aria-label": "add sticker " + s.name, onclick: () => U.addSticker(s.id) });
  b.innerHTML = svg;
  const fav = VB.prefs.fav.includes(s.id);
  const star = h("button.favbtn", { type: "button", "aria-pressed": String(fav), title: fav ? "remove from favorites" : "save to favorites", "aria-label": (fav ? "unfavorite " : "favorite ") + s.name, onclick: e => { e.stopPropagation(); toggleFav(s.id); } }, ico("star"));
  return h("div.tilewrap", b, star);
};
function toggleFav(id) {
  const i = VB.prefs.fav.indexOf(id); if (i >= 0) VB.prefs.fav.splice(i, 1); else VB.prefs.fav.push(id);
  VB.db.setPref("fav", VB.prefs.fav); U.renderPanel();
}

/* ---------- adding things ---------- */
U.at = at => at || null;
U.addPhoto = (asset, o) => {
  o = o || {};
  const ar = asset.w / asset.h, frame = o.frame || "polaroid";
  const w = o.w || (ar > 1.4 ? 400 : ar < 0.8 ? 300 : 340);
  const el = VB.make.photo(Object.assign({ w, ar, frame, cells: [{ a: asset.id, z: 1, ox: 0, oy: 0 }] }, o.props || {}));
  const n = VB.FRAMES[el.frame].cells; while (el.cells.length < n) el.cells.push({ a: null, z: 1, ox: 0, oy: 0 });
  VB.place(el, o.at);
  if (asset.credit && !/generated/.test(asset.credit)) el.credit = asset.credit;
  if (!(VB.sampleIds || []).includes(asset.id) && !VB.doc.uploads.includes(asset.id)) VB.doc.uploads.push(asset.id);
  VB.addEl(el); return el;
};
U.addEmptyFrame = (frame, at) => {
  const el = VB.make.photo({ frame, w: frame === "contact" ? 460 : frame === "strip" ? 230 : 340 });
  VB.place(el, at); VB.addEl(el); VB.toast("drop a photo on the frame, or use replace image on the right"); return el;
};
U.addSticker = (kind, at) => { const el = VB.make.sticker(kind); VB.place(el, at); VB.addEl(el); return el; };
U.addText = (o, at) => { const el = (o.paper ? VB.make.note : VB.make.text)(o); VB.place(el, at); VB.addEl(el); if (!o.noEdit) setTimeout(() => VB.interact.editText(el), 60); return el; };
U.addTape = (o, at) => { const el = VB.make.tape(o); VB.place(el, at); VB.addEl(el); return el; };

U.addFiles = async (files, at) => {
  files = Array.from(files).filter(f => /^image\//.test(f.type) || /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(f.name));
  if (!files.length) { VB.toast("that is not a picture file. try a png, jpg, webp or gif", "bad"); return; }
  let ok = 0;
  for (let i = 0; i < files.length; i++) {
    try {
      VB.toast(files.length > 1 ? `adding picture ${i + 1} of ${files.length}...` : "adding your picture...");
      const rec = await VB.addImageBlob(files[i]);
      const target = at ? { x: at.x + i * 40, y: at.y + i * 30 } : null;
      U.addPhoto(rec, { at: target }); ok++;
    } catch (e) { VB.toast(e.message || "that picture could not be added", "bad"); }
  }
  if (ok) VB.toast(ok === 1 ? "picture pinned to the board" : ok + " pictures pinned to the board");
  U.renderPanel();
};
U.pickFiles = (cb, accept) => {
  const f = $("#filepick"); f.value = ""; f.accept = accept || "image/*"; f.onchange = () => { if (f.files && f.files.length) cb(Array.from(f.files)); };
  f.click();
};
U.replaceCell = (el, i, file) => {
  VB.addImageBlob(file).then(rec => {
    el.cells[i] = Object.assign(el.cells[i] || { z: 1, ox: 0, oy: 0 }, { a: rec.id, z: 1, ox: 0, oy: 0 });
    if (i === 0) el.ar = rec.w / rec.h; if (!VB.doc.uploads.includes(rec.id)) VB.doc.uploads.push(rec.id);
    VB.scene.el(el); VB.scene.threads(); VB.commit(); VB.emit("doc:changed"); VB.emit("sel"); VB.toast("picture replaced. the frame kept its place");
  }).catch(e => VB.toast(e.message || "could not replace that picture", "bad"));
};
U.addAssetToCell = (el, i, rec) => {
  el.cells[i] = Object.assign(el.cells[i] || { z: 1, ox: 0, oy: 0 }, { a: rec.id, z: 1, ox: 0, oy: 0 });
  if (i === 0) el.ar = rec.w / rec.h;
  VB.scene.el(el); VB.scene.threads(); VB.commit(); VB.emit("doc:changed"); VB.emit("sel");
};

/* ---------- image search (Wikimedia Commons: no key, CORS-friendly) ---------- */
const COLLECTIONS = [["dream university", "university campus quad"], ["mountains", "mountain lake landscape"], ["city lights", "city skyline night"], ["coffee + books", "coffee cup books desk"], ["beach", "beach sunset sea"], ["flowers", "flowers garden macro"], ["travel", "airplane window clouds"], ["workspace", "laptop desk workspace"]];
U.searchState = { q: "", results: [], loading: false, error: "", source: "" };
async function searchCommons(q) {
  const st = U.searchState; st.loading = true; st.error = ""; st.q = q; U.renderPanel();
  const url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=24&prop=imageinfo&iiprop=url%7Cextmetadata%7Csize%7Cmime&iiurlwidth=1100&iiextmetadatafilter=Artist%7CLicenseShortName&format=json&origin=*&gsrsearch=" + encodeURIComponent("filetype:bitmap " + q + " incategory:\"Quality images\"|\"Featured pictures on Wikimedia Commons\"|\"Valued images\"");
  try {
    let res = await fetch(url); if (!res.ok) throw new Error("search service answered " + res.status);
    let j = await res.json(), pages = j.query ? Object.values(j.query.pages) : [];
    if (pages.length < 6) { /* fall back to a plain search */
      const u2 = url.replace(/&gsrsearch=.*/, "&gsrsearch=" + encodeURIComponent("filetype:bitmap " + q));
      res = await fetch(u2); j = await res.json(); pages = j.query ? Object.values(j.query.pages) : pages;
    }
    st.results = pages.filter(p => p.imageinfo && p.imageinfo[0] && /^image\/(jpeg|png|webp)$/.test(p.imageinfo[0].mime) && p.imageinfo[0].width > 500).sort((a, b) => a.index - b.index).map(p => {
      const ii = p.imageinfo[0], md = ii.extmetadata || {};
      const artist = ((md.Artist && md.Artist.value) || "").replace(/<[^>]+>/g, "").trim().slice(0, 60);
      return { thumb: ii.thumburl, full: ii.thumburl, title: p.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, ""), credit: (artist ? artist + ", " : "") + ((md.LicenseShortName && md.LicenseShortName.value) || "see Commons") + " via Wikimedia Commons", page: ii.descriptionurl };
    });
    if (!st.results.length) st.error = "no pictures found for that. try a simpler word";
  } catch (e) { st.error = "could not reach the picture search. check your connection, or upload your own pictures instead"; st.results = []; }
  st.loading = false; U.renderPanel();
}

/* ---------- left rail + panels ---------- */
const TABS = [
  ["uploads", "upload", "uploads"], ["photos", "image", "photos"], ["stickers", "sticker", "stickers"], ["text", "type", "text"],
  ["paper", "note", "paper + labels"], ["frames", "frame", "frames"], ["tape", "pin", "tape + pins"], ["threads", "thread", "red threads"], ["templates", "template", "templates"]
];
U.buildRail = () => {
  const rail = $("#rail"); rail.replaceChildren();
  TABS.forEach(([id, ic, label]) => {
    const b = h("button.railbtn", { type: "button", role: "tab", id: "tab-" + id, "aria-selected": String(U.tab === id), "aria-controls": "panel", title: label, onclick: () => U.setTab(id) }, ico(ic), h("span.rl", label));
    rail.append(b);
  });
  rail.addEventListener("keydown", e => { if (!/^Arrow(Up|Down|Left|Right)$/.test(e.key)) return; const t = VB.$$(".railbtn[role=tab]", rail), i = t.findIndex(b => b === document.activeElement); if (i < 0) return; e.preventDefault(); const n = t[(i + (/Down|Right/.test(e.key) ? 1 : t.length - 1)) % t.length]; n.focus(); n.click(); });
  rail.append(h("button.railbtn.collapse", { type: "button", title: "hide the tool panel", "aria-label": "hide or show the tool panel", onclick: () => U.togglePanel() }, ico("panel")));
};
U.setTab = id => {
  if (U.tab === id && window.innerWidth < 900 && !$("#left").classList.contains("collapsed")) { U.togglePanel(); return; }
  U.tab = id; $("#left").classList.remove("collapsed"); document.body.classList.add("panel-open"); VB.$$(".railbtn[role=tab]").forEach(b => b.setAttribute("aria-selected", String(b.id === "tab-" + id))); U.renderPanel(); };
U.togglePanel = () => { const l = $("#left"); l.classList.toggle("collapsed"); document.body.classList.toggle("panel-open", !l.classList.contains("collapsed")); setTimeout(() => VB.interact.draw(), 260); };
U.renderPanel = () => {
  const p = $("#panel"); if (!p) return;
  const scroll = p.scrollTop, focus = document.activeElement && document.activeElement.id;
  p.replaceChildren(); p.setAttribute("aria-labelledby", "tab-" + U.tab); p.setAttribute("role", "tabpanel");
  (PANELS[U.tab] || PANELS.photos)(p);
  p.scrollTop = scroll;
  if (focus) { const f = document.getElementById(focus); if (f) f.focus(); }
};
const head = (t, sub) => h("div.phead", h("h2.shout-md", t), sub ? h("p.psub", sub) : null, h("button.pclose", { type: "button", "aria-label": "close the tool panel", onclick: () => U.togglePanel() }, ico("x")));
const PANELS = {
  uploads(p) {
    p.append(head("your pictures", "drop files on the board, paste from the clipboard, or choose them here."));
    p.append(h("div.dropzone", { tabindex: 0, role: "button", onclick: () => U.pickFiles(f => U.addFiles(f)), onkeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); U.pickFiles(f => U.addFiles(f)); } } }, ico("upload"), h("b", "choose pictures"), h("small", "png, jpg, webp, gif. up to 40 MB each. they stay on this device.")));
    const url = h("input", { type: "url", placeholder: "https://... image address", "aria-label": "image address", id: "urlinp" });
    const go = async () => {
      const v = url.value.trim(); if (!v) { url.focus(); return; }
      try { VB.toast("fetching that picture..."); const rec = await VB.addImageFromUrl(v, { name: v.split("/").pop().split("?")[0] }); U.addPhoto(rec); url.value = ""; VB.toast("picture pinned to the board"); U.renderPanel(); }
      catch (e) { VB.toast(e.message, "bad"); }
    };
    url.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
    p.append(h("div.row", url, U.btn("add", { cls: "sm", on: go })));
    p.append(h("p.psub", "some sites block copying their pictures. if that happens, download the image and upload it instead."));
    const ids = VB.doc.uploads.filter(id => VB.assets.has(id));
    p.append(h("h3.shout-sm", "on this board"));
    if (!ids.length) p.append(U.empty("nothing yet", "pictures you add show up here so you can pin them again."));
    else { const g = h("div.thumbs"); ids.forEach(id => { const a = VB.assets.get(id); g.append(h("button.thumb", { type: "button", title: "pin " + (a.name || "picture") + " again", "aria-label": "pin " + (a.name || "picture") + " again", onclick: () => U.addPhoto(a) }, h("img", { src: a.url, alt: "", loading: "lazy" }))); }); p.append(g); }
  },
  photos(p) {
    p.append(head("photos", "search free pictures or start with sample art."));
    const q = h("input", { type: "search", placeholder: "search pictures", "aria-label": "search pictures", id: "searchinp", value: U.searchState.q });
    const run = () => { const v = q.value.trim(); if (!v) { q.focus(); return; } searchCommons(v); };
    q.addEventListener("keydown", e => { if (e.key === "Enter") run(); });
    p.append(h("div.row", q, U.btn("search", { cls: "sm cream", icon: "search", on: run })));
    const chips = h("div.chips"); COLLECTIONS.forEach(([l, query]) => chips.append(U.chip(l, U.searchState.q === query, () => { q.value = query; searchCommons(query); }))); p.append(h("p.shout-sm", "curated collections"), chips);
    const st = U.searchState;
    if (st.loading) p.append(h("p.status", "looking for pictures..."));
    if (st.error) p.append(h("p.status.bad", { role: "alert" }, st.error));
    if (st.results.length) {
      const g = h("div.thumbs");
      st.results.forEach(r => g.append(h("button.thumb", { type: "button", title: r.title + " · " + r.credit, "aria-label": "add " + r.title, onclick: async () => { try { VB.toast("fetching that picture..."); const rec = await VB.addImageFromUrl(r.full, { name: r.title, credit: r.credit }); U.addPhoto(rec); VB.toast("pinned. credit: " + r.credit); } catch (e) { VB.toast(e.message, "bad"); } } }, h("img", { src: r.thumb, alt: "", loading: "lazy", crossorigin: "anonymous" }))));
      p.append(g, h("p.psub", "pictures come from Wikimedia Commons under open licences. the credit is saved on each photo."));
    }
    p.append(h("h3.shout-sm", "sample art"), h("p.psub", "made by the app, so the board has pictures offline. swap them for your own."));
    const g2 = h("div.thumbs"); VB.SAMPLES.forEach(s => {
      const b = h("button.thumb", { type: "button", title: s.name, "aria-label": "add sample art " + s.name, onclick: async () => { const rec = await VB.makeSample(s.id); U.addPhoto(rec); } });
      VB.makeSample(s.id).then(rec => { b.append(h("img", { src: rec.url, alt: "" })); });
      g2.append(b);
    }); p.append(g2);
  },
  stickers(p) {
    p.append(head("stickers"));
    const q = h("input", { type: "search", placeholder: "search stickers", "aria-label": "search stickers", id: "stkq", value: U.stkQ || "" });
    q.addEventListener("input", () => { U.stkQ = q.value; renderGrid(); });
    p.append(q);
    const cats = [["all", "all"], ["fav", "favorites"]].concat(window.VB_STICKER_CATS.map(c => [c.id, c.name]));
    const chips = h("div.chips"); cats.forEach(([id, l]) => chips.append(U.chip(l, (U.stkCat || "all") === id, () => { U.stkCat = id; U.renderPanel(); }))); p.append(chips);
    const grid = h("div.tiles"); p.append(grid);
    function renderGrid() {
      grid.replaceChildren(); const t = (U.stkQ || "").toLowerCase().trim(), cat = U.stkCat || "all";
      let list = window.VB_STICKERS.filter(s => (cat === "all" || (cat === "fav" ? VB.prefs.fav.includes(s.id) : s.cat === cat)) && (!t || (s.name + " " + s.tags.join(" ")).toLowerCase().includes(t)));
      if (!list.length) { grid.append(U.empty(cat === "fav" ? "no favorites yet" : "no stickers match", cat === "fav" ? "tap the star on a sticker to keep it here." : "try another word.")); return; }
      list.forEach(s => grid.append(U.stickerTile(s)));
    }
    renderGrid();
    p.append(h("h3.shout-sm", "make your own"));
    p.append(h("div.row", U.btn("upload png sticker", { cls: "sm cream", icon: "upload", on: () => U.pickFiles(async files => { for (const f of files) { try { const rec = await VB.addImageBlob(f, { alpha: true, max: 1200 }); const el = VB.make.imgsticker(rec.id); VB.place(el); if (!VB.doc.uploads.includes(rec.id)) VB.doc.uploads.push(rec.id); VB.addEl(el); VB.toast("sticker added with a cut-out border"); } catch (e) { VB.toast(e.message, "bad"); } } }) })));
    const t = h("input", { type: "text", maxlength: 40, placeholder: "type a phrase", "aria-label": "text sticker", id: "tsinp" });
    const addT = () => { const v = t.value.trim(); if (!v) { t.focus(); return; } U.addText({ text: v, font: "condensed", fs: 110, w: 700, color: "#0a0030", outline: { c: "#fffdf8", w: 12 }, noEdit: true, align: "center" }); t.value = ""; };
    t.addEventListener("keydown", e => { if (e.key === "Enter") addT(); });
    p.append(h("div.row", t, U.btn("add", { cls: "sm", on: addT })));
  },
  text(p) {
    p.append(head("text", "click one to place it. double-click on the board to edit."));
    const th = VB.doc.theme;
    const presets = [
      ["big title", { text: "my vision board", font: "condensed", fs: 200, w: 1500, color: th.accent || "#d9382a", outline: { c: "#fffdf8", w: 10 } }],
      ["heading", { text: "this year", font: "serif", fs: 120, w: 900 }],
      ["handwritten caption", { text: "a little note to self", font: "hand", fs: 64, w: 600 }],
      ["affirmation", { text: "i am becoming who i want to be", font: "script", fs: 56, w: 640, paper: { shape: "torn", texture: "plain", color: th.noteColor } }],
      ["typewriter note", { text: "remember: small steps count.", font: "type", fs: 42, w: 520, align: "left", paper: { shape: "rect", texture: "grain", color: th.noteColor } }],
      ["goal list", { text: "goals\n- one\n- two\n- three", font: "hand", fs: 52, w: 420, align: "left", paper: { shape: "rect", texture: "lined", color: "#fbf8ef" } }],
      ["quote", { text: "“do it scared.”", font: "serif", fs: 96, w: 800 }],
      ["newspaper headline", { text: "LOCAL DREAMER MAKES IT HAPPEN", font: "news", fs: 70, w: 760, align: "left", paper: { shape: "torn", texture: "news", color: "#e6e0d0" } }]
    ];
    const g = h("div.list"); presets.forEach(([n, o]) => g.append(h("button.listbtn", { type: "button", onclick: () => U.addText(Object.assign({}, o)) }, h("span.shout-sm", n), h("span.small", o.text.split("\n")[0])))); p.append(g);
    p.append(h("h3.shout-sm", "font styles"));
    const f = h("div.fonts"); Object.keys(VB.FONTS).forEach(k => { const F = VB.FONTS[k]; f.append(h("button.fontbtn", { type: "button", style: { fontFamily: F.css, fontWeight: F.weight, fontStretch: F.stretch ? F.stretch + "%" : "" }, title: "add text in " + F.label, onclick: () => U.addText({ text: "write here", font: k, fs: k === "condensed" ? 120 : 72, w: 700 }) }, h("span.aa", F.upper ? "AA" : "Aa"), h("span.fn", F.label))); }); p.append(f);
    p.append(h("h3.shout-sm", "my saved styles"));
    const sv = h("div.list"); const mine = VB.prefs.styles.filter(s => s.kind === "text");
    if (!mine.length) sv.append(U.empty("none yet", "select a note and press save style in the inspector."));
    mine.forEach((s, i) => sv.append(h("div.stylerow", h("button.listbtn", { type: "button", onclick: () => U.applyStyle(s) }, h("span.shout-sm", s.name), h("span.small", VB.FONTS[s.props.font].label + (s.props.paper ? " + paper" : ""))), h("button.mini", { type: "button", title: "delete saved style", "aria-label": "delete saved style " + s.name, onclick: () => { VB.prefs.styles.splice(VB.prefs.styles.indexOf(s), 1); VB.db.setPref("styles", VB.prefs.styles); U.renderPanel(); } }, ico("x")))));
    p.append(sv);
  },
  paper(p) {
    p.append(head("paper + labels", "notes on paper. change the shape, texture and colour independently later."));
    const th = VB.doc.theme, nc = th.noteColor || "#f8f1de";
    const notes = [
      ["torn note", { shape: "torn", texture: "plain", color: nc }], ["vintage label", { shape: "label", texture: "aged", color: "#efe0b8" }], ["graph paper", { shape: "rect", texture: "grid", color: "#fbfaf2" }],
      ["lined notebook", { shape: "rect", texture: "lined", color: "#fbf8ef" }], ["sticky note", { shape: "sticky", texture: "plain", color: "#fff1a8" }], ["folded paper", { shape: "folded", texture: "grain", color: nc }],
      ["ticket", { shape: "ticket", texture: "plain", color: "#f4ead2" }], ["tracing paper", { shape: "rect", texture: "tracing", color: "#e8efe9" }]
    ];
    const g = h("div.tiles.wide");
    notes.forEach(([n, paper]) => {
      const el = VB.make.note({ text: n, w: 300, fs: 36, rot: 0, paper, font: n === "vintage label" ? "type" : "hand", align: "center" });
      const tile = h("button.tile.paper", { type: "button", title: "add " + n, "aria-label": "add " + n, onclick: () => U.addText({ text: "write here", w: 420, fs: 46, font: el.font, align: el.align, paper: Object.assign({}, paper) }) }, U.previewEl(el, 18), h("span.cap", n));
      g.append(tile);
    }); p.append(g);
    p.append(h("h3.shout-sm", "category labels"), h("p.psub", "optional paper headings. arrange everything freely, labels are just signs."));
    const list = h("div.catlist");
    VB.doc.categories.forEach(c => {
      const inp = h("input", { type: "text", value: c.name, "aria-label": "category name", maxlength: 40 });
      inp.addEventListener("change", () => { c.name = inp.value.trim() || c.name; VB.doc.elements.forEach(e => { if (e.cat === c.id) { e.text = c.name; VB.layoutText(e); VB.scene.el(e); } }); VB.commit(); VB.emit("doc:changed"); });
      list.append(h("div.catrow", inp, h("button.mini", { type: "button", title: "zoom in on this group", "aria-label": "zoom in on the " + c.name + " group", onclick: () => U.zoomToCategory(c) }, ico("fit")), h("button.mini", { type: "button", title: "add a label for " + c.name, "aria-label": "add a label for " + c.name, onclick: () => U.addCategoryLabel(c) }, ico("plus")), h("button.mini", { type: "button", title: "remove category", "aria-label": "remove category " + c.name, onclick: () => { VB.doc.categories = VB.doc.categories.filter(x => x !== c); VB.doc.elements.forEach(e => { if (e.cat === c.id) e.cat = null; }); VB.commit(); U.renderPanel(); } }, ico("x"))));
    });
    p.append(list);
    const nn = h("input", { type: "text", maxlength: 40, placeholder: "new category", "aria-label": "new category name" });
    const addN = () => { const v = nn.value.trim(); if (!v) { nn.focus(); return; } const c = { id: "c" + VB.uid(), name: v, on: false }; VB.doc.categories.push(c); VB.commit(); U.renderPanel(); U.addCategoryLabel(c); };
    nn.addEventListener("keydown", e => { if (e.key === "Enter") addN(); });
    p.append(h("div.row", nn, U.btn("add", { cls: "sm", on: addN })));
  },
  frames(p) {
    p.append(head("frames", VB.selEls().some(e => e.type === "photo") ? "click a frame to restyle the selected photo." : "click a frame to add it, then drop a photo in."));
    const sel = VB.selEls().filter(e => e.type === "photo"), g = h("div.tiles.wide");
    Object.keys(VB.FRAMES).forEach(k => {
      const demo = VB.make.photo({ frame: k, w: 260, rot: 0, caption: VB.FRAMES[k].cap ? "caption" : "", cells: [{ a: "s-sunrise", z: 1, ox: 0, oy: 0 }, { a: "s-flower", z: 1, ox: 0, oy: 0 }, { a: "s-ocean", z: 1, ox: 0, oy: 0 }, { a: "s-city", z: 1, ox: 0, oy: 0 }, { a: "s-forest", z: 1, ox: 0, oy: 0 }, { a: "s-desk", z: 1, ox: 0, oy: 0 }] });
      demo.id = "pv-" + k; demo.ar = 0.8;
      const tile = h("button.tile.frame", { type: "button", title: VB.FRAMES[k].label, "aria-label": (sel.length ? "use " : "add ") + VB.FRAMES[k].label + " frame", onclick: () => { if (sel.length) { sel.forEach(e => U.setFrame(e, k)); VB.commit(); VB.emit("doc:changed"); VB.emit("sel"); } else U.addEmptyFrame(k); } }, U.previewEl(demo, 10), h("span.cap", VB.FRAMES[k].label));
      g.append(tile);
    }); p.append(g);
    Promise.all(["s-sunrise", "s-flower", "s-ocean", "s-city", "s-forest", "s-desk"].map(VB.makeSample)).then(() => { if (U.tab === "frames" && !p.dataset.done) { p.dataset.done = "1"; U.renderPanel(); } });
    p.append(h("h3.shout-sm", "my saved frames"));
    const mine = VB.prefs.styles.filter(s => s.kind === "photo"), sv = h("div.list");
    if (!mine.length) sv.append(U.empty("none yet", "select a photo and press save style in the inspector."));
    mine.forEach(s => sv.append(h("div.stylerow", h("button.listbtn", { type: "button", onclick: () => U.applyStyle(s) }, h("span.shout-sm", s.name), h("span.small", VB.FRAMES[s.props.frame].label)), h("button.mini", { type: "button", title: "delete saved style", "aria-label": "delete saved style " + s.name, onclick: () => { VB.prefs.styles.splice(VB.prefs.styles.indexOf(s), 1); VB.db.setPref("styles", VB.prefs.styles); U.renderPanel(); } }, ico("x")))));
    p.append(sv);
  },
  tape(p) {
    p.append(head("tape + pins", "tape is resizable and see-through. pins and clips are stickers."));
    const combos = [["plain", "#f3dca0"], ["plain", "#f4b4c3"], ["plain", "#b9d1e8"], ["plain", "#cfe6c4"], ["stripe", "#e0632b"], ["stripe", "#3daab8"], ["dots", "#ffd000"], ["dots", "#9457eb"], ["check", "#d9382a"], ["check", "#2f9e5b"], ["zigzag", "#ff7eb6"], ["zigzag", "#3a4a8a"]];
    const g = h("div.tiles.wide");
    combos.forEach(([pat, col]) => { const el = VB.make.tape({ pattern: pat, color: col, w: 150, h: 46, rot: 0 }); el.x = 0; el.y = 0; g.append(h("button.tile.tape", { type: "button", title: pat + " tape", "aria-label": "add " + pat + " tape in " + col, onclick: () => U.addTape({ pattern: pat, color: col }) }, U.previewEl(el, 10))); });
    p.append(g, h("h3.shout-sm", "pins and clips"));
    const t = h("div.tiles"); window.VB_STICKERS.filter(s => s.cat === "pins").forEach(s => t.append(U.stickerTile(s))); p.append(t);
  },
  threads(p) {
    p.append(head("red threads", "connect goals like a detective board."));
    const on = VB.interact.tool === "thread";
    p.append(h("div.row", U.btn(on ? "stop threading" : "start a red thread", { icon: "thread", on: () => { VB.setTool(on ? "select" : "thread"); U.renderPanel(); } })));
    p.append(h("ol.steps", h("li", "click a photo, note or any spot to start"), h("li", "click another object (or the board) to finish"), h("li", "pins mark both ends. keep going to build a web"), h("li", "double-click a thread to add a bend pin")));
    p.append(h("h3.shout-sm", "string"), h("div.fl", "colour"));
    p.append(U.swatches(["#d9382a", "#0a0030", "#3daab8", "#2f9e5b", "#ffd000", "#ff7eb6", "#fffdf8"], VB.interact.threadColor || "#d9382a", c => { VB.interact.threadColor = c; }));
    p.append(U.slider("thickness", VB.interact.threadThickness || 2.6, 1, 8, 0.2, v => { VB.interact.threadThickness = v; }, null, v => v.toFixed(1)));
    const sel = VB.selEls().filter(e => e.type !== "thread" && e.type !== "tape");
    p.append(U.btn("connect the two selected", { cls: "cream sm", icon: "link", disabled: sel.length !== 2, on: () => { const [a, b] = sel; VB.addEl(VB.make.thread([{ att: { id: a.id, nx: 0, ny: -0.8 } }, { att: { id: b.id, nx: 0, ny: -0.8 } }], { color: VB.interact.threadColor || "#d9382a", th: VB.interact.threadThickness || 2.6, pinColor: VB.interact.threadColor || "#d9382a" })); VB.toast("thread added between them"); } }));
    p.append(h("p.psub", "select two objects with shift-click to join them in one press."));
  },
  templates(p) {
    p.append(head("templates", "starting points, not rules. every piece stays editable."));
    const g = h("div.tpls");
    VB.TEMPLATES.forEach(t => {
      const card = h("button.tpl", { type: "button", "aria-label": "use template " + t.name, onclick: () => VB.dialogs.template(t) }, h("div.tplprev", h("span.small", "loading...")), h("span.shout-sm", t.name), h("span.small", t.desc));
      g.append(card);
      VB.dialogs.templateThumb(t).then(node => { const pv = card.querySelector(".tplprev"); pv.replaceChildren(node); });
    });
    p.append(g);
    p.append(h("p.psub", "or start blank from the board list."));
  }
};
U.zoomToCategory = c => {
  const lab = VB.doc.elements.find(e => e.cat === c.id);
  if (!lab) { VB.toast("add a label for this category first, then place it near its pictures"); return; }
  const near = VB.doc.elements.filter(e => e.type !== "thread" && !e.hidden && Math.hypot(e.x - lab.x, e.y - lab.y) < 820);
  VB.zoomBox(VB.unionBox(near.length ? near : [lab]), 90);
};
U.addCategoryLabel = c => {
  const th = VB.doc.theme;
  const el = VB.make.text({ text: c.name, font: "condensed", fs: 40, w: 520, cat: c.id, align: "center", rot: VB.round((Math.random() - 0.5) * 4, 1), paper: { shape: "label", texture: "grain", color: th.noteColor } });
  VB.place(el); VB.addEl(el); c.on = true; VB.toast("label added. drag it near its group");
};
U.setFrame = (el, k) => {
  el.frame = k; el.fc = ""; const n = VB.FRAMES[k].cells;
  while (el.cells.length < n) el.cells.push({ a: null, z: 1, ox: 0, oy: 0 });
  VB.scene.el(el); VB.scene.threads();
};
U.applyStyle = s => {
  const sel = VB.selEls().filter(e => e.type === (s.kind === "photo" ? "photo" : "text"));
  if (sel.length) { sel.forEach(e => { Object.assign(e, VB.clone(s.props)); if (e.type === "text") VB.layoutText(e); VB.scene.el(e); }); VB.scene.threads(); VB.commit(); VB.emit("doc:changed"); VB.emit("sel"); VB.toast("style applied"); }
  else if (s.kind === "photo") { const el = VB.make.photo(VB.clone(s.props)); VB.place(el); VB.addEl(el); }
  else U.addText(Object.assign({ text: "write here" }, VB.clone(s.props)));
};

/* ---------- toolbar ---------- */
U.buildToolbar = () => {
  const tb = $("#toolbar"); tb.replaceChildren();
  const name = h("input.title", { id: "boardname", type: "text", value: VB.doc.name, maxlength: 60, "aria-label": "board name" });
  name.addEventListener("change", () => { VB.doc.name = name.value.trim() || "untitled board"; name.value = VB.doc.name; VB.commit(); VB.markDirty(); VB.doc.updated = Date.now(); });
  const save = h("span.chip.s.savechip", { id: "savechip", role: "status", "aria-live": "polite" }, "saved");
  const zoom = h("div.zoom", { role: "group", "aria-label": "zoom" }, U.round("minus", "zoom out", () => VB.zoomAt(1 / 1.2)), h("button.zval", { type: "button", id: "zval", title: "reset to 100%", onclick: () => VB.setView({ z: 1 }) }, "100%"), U.round("plus", "zoom in", () => VB.zoomAt(1.2)), U.round("fit", "fit the whole board", () => VB.fit()));
  tb.append(
    h("a.round.back", { href: "#/", title: "all boards", "aria-label": "back to all boards", onclick: () => VB.saveNow() }, ico("home")),
    name,
    h("div.tbgroup", U.round("undo", "undo (ctrl+z)", () => VB.undo(), { cls: "undo" }), U.round("redo", "redo (ctrl+y)", () => VB.redo(), { cls: "redo" })),
    zoom,
    h("div.tbgroup.opt", U.round("grid", "show alignment grid", e => { VB.view.grid = !VB.view.grid; VB.doc.view.grid = VB.view.grid; VB.scene.chrome(); e.currentTarget.setAttribute("aria-pressed", String(!!VB.view.grid)); VB.saveSoon(); }, { pressed: !!VB.view.grid }), U.round("magnet", "snap to guides", e => { VB.view.snap = VB.view.snap === false; e.currentTarget.setAttribute("aria-pressed", String(VB.view.snap !== false)); }, { pressed: VB.view.snap !== false })),
    h("span.sp"),
    U.round("spark", "random inspiration", () => VB.dialogs.inspire(), { cls: "hide-sm" }),
    U.round("eye", "preview mode (esc to leave)", () => U.preview(true), { cls: "hide-sm" }),
    save,
    U.btn(h("span.lbl", "export"), { icon: "download", title: "export your board", aria: "export your board", on: () => VB.dialogs.export() }),
    U.round("more", "more: backup, restore, help", e => VB.dialogs.more(e.currentTarget), { cls: "more" }),
    h("button.round.paneltoggle", { type: "button", title: "tools", "aria-label": "show tools", onclick: () => U.togglePanel() }, ico("panel")),
    h("button.round.insptoggle", { type: "button", title: "show or hide the details panel", "aria-label": "show or hide the details panel", onclick: () => { const r = $("#right"); if (window.innerWidth < 900) r.classList.toggle("open"); else r.classList.toggle("off"); setTimeout(() => VB.interact.draw(), 60); } }, ico("panelr"))
  );
  U.syncToolbar();
};
U.syncToolbar = () => {
  const z = $("#zval"); if (z) z.textContent = Math.round(VB.view.z * 100) + "%";
  const u = $(".undo"), r = $(".redo"); if (u) u.disabled = !VB.hist.undo.length; if (r) r.disabled = !VB.hist.redo.length;
  const n = $("#boardname"); if (n && document.activeElement !== n) n.value = VB.doc.name;
};
U.setSaveState = s => {
  const c = $("#savechip"); if (!c) return;
  c.classList.remove("bad", "busy");
  if (s.state === "saving") { c.textContent = "saving..."; c.classList.add("busy"); }
  else if (s.state === "error") { c.textContent = "not saved"; c.classList.add("bad"); c.title = s.msg || "saving failed. export a backup from the menu"; }
  else { c.textContent = VB.db.ok ? "saved" : "not saved (private mode)"; if (!VB.db.ok) c.classList.add("bad"); c.title = "stored on this device only"; }
};
U.preview = on => {
  document.body.classList.toggle("previewing", on);
  if (on) { VB.deselect(); VB.toast("preview. press esc to leave"); document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); setTimeout(() => VB.fit(), 60); }
  else { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); setTimeout(() => VB.interact.draw(), 60); }
};
document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("previewing")) U.preview(false); });
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && document.body.classList.contains("previewing")) U.preview(false); });

/* ---------- context bar (appears over the selection) ---------- */
U.renderCtx = () => {
  const c = $("#ctxbar"); c.replaceChildren();
  const sel = VB.selEls(); if (!sel.length) { c.hidden = true; return; }
  const ids = sel.map(e => e.id), one = sel.length === 1 ? sel[0] : null, locked = sel.every(e => e.locked);
  const b = (name, label, on) => { const x = h("button.cbtn", { type: "button", title: label, "aria-label": label, onclick: on }); x.append(ico(name)); return x; };
  if (one && one.type === "text") c.append(b("type", "edit text", () => VB.interact.editText(one)));
  if (one && one.type === "photo") { c.append(b("image", "replace image", () => U.pickFiles(f => U.replaceCell(one, 0, f[0])))); c.append(b("fit", "reposition the picture in its frame", () => VB.interact.setCrop(VB.interact.cropId ? null : one.id))); }
  if (one && one.type === "thread") c.append(b("plus", "add a bend pin", () => U.addPin(one)));
  c.append(b("panelr", "show or hide the details panel", () => { const r = $("#right"); if (window.innerWidth < 900) r.classList.toggle("open"); else r.classList.toggle("off"); setTimeout(() => VB.interact.draw(), 60); }));
  if (sel.length > 1) { c.append(b("group", "group (ctrl+g)", () => VB.group(ids))); if (sel.some(e => e.gid)) c.append(b("ungroup", "ungroup", () => VB.ungroup(ids))); }
  c.append(b("copy", "duplicate (ctrl+d)", () => VB.dupEls(ids)), b("front", "bring to front", () => VB.reorder(ids, "front")), b("backward", "send to back", () => VB.reorder(ids, "back")), b(locked ? "unlock" : "lock", locked ? "unlock" : "lock", () => VB.setLock(ids, !locked)), b("trash", "delete", () => VB.removeEls(ids.filter(id => !VB.byId(id).locked))));
  VB.interact.placeCtx();
};
U.addPin = t => {
  const pts = VB.threadPts(t, VB.currentById); let bi = 0, bl = 0;
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y); if (l > bl) { bl = l; bi = i; } }
  const a = pts[bi], c = pts[bi + 1]; t.pts.splice(bi + 1, 0, { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 + bl * (t.sag || 0) * 0.5 });
  VB.scene.el(t); VB.commit(); VB.emit("doc:changed"); VB.interact.draw(); VB.toast("pin added. drag it to bend the string");
};

/* ---------- drop + paste ---------- */
U.wireDrop = () => {
  const wrap = $("#stagewrap");
  wrap.addEventListener("dragover", e => { if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) { e.preventDefault(); wrap.classList.add("dropping"); } });
  wrap.addEventListener("dragleave", () => wrap.classList.remove("dropping"));
  wrap.addEventListener("drop", e => {
    wrap.classList.remove("dropping");
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    const at = VB.interact.toWorld(e.clientX, e.clientY), hit = VB.interact.pick(e.clientX, e.clientY), file = e.dataTransfer.files[0];
    if (hit && hit.type === "photo" && e.dataTransfer.files.length === 1) { const L = VB.photoLayout(hit), r = VB.rot(at.x - hit.x, at.y - hit.y, -(hit.rot || 0)); let i = L.cells.findIndex(c => r[0] >= c.x && r[0] <= c.x + c.w && r[1] >= c.y && r[1] <= c.y + c.h); if (i < 0) i = 0; U.replaceCell(hit, i, file); return; }
    U.addFiles(e.dataTransfer.files, at);
  });
  document.addEventListener("paste", e => {
    if (!VB.doc || $("#view-editor").hidden || /input|textarea/i.test((e.target || {}).tagName || "")) return;
    const items = Array.from((e.clipboardData && e.clipboardData.items) || []).filter(i => i.kind === "file" && /^image\//.test(i.type));
    if (items.length) { e.preventDefault(); U.addFiles(items.map(i => i.getAsFile())); return; }
    const txt = e.clipboardData && e.clipboardData.getData("text");
    if (txt && /^https?:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?$/i.test(txt.trim())) { e.preventDefault(); VB.addImageFromUrl(txt.trim()).then(r => U.addPhoto(r)).catch(er => VB.toast(er.message, "bad")); }
  });
};

/* ---------- preferences ---------- */
U.loadPrefs = async () => {
  VB.prefs.fav = await VB.db.getPref("fav", []); VB.prefs.styles = await VB.db.getPref("styles", []);
};
})();
