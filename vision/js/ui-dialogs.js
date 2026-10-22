/* Editor UI, part 3: modal dialogs (export, templates, inspiration, menu, confirm). */
(function () {
"use strict";
const VB = window.VB, h = VB.h, $ = VB.$, U = VB.ui, ico = U.ico;
const D = VB.dialogs = {};

/* ---------- modal ---------- */
D.modal = o => {
  const root = $("#modal-root"), prevFocus = document.activeElement;
  const close = () => { back.remove(); document.body.classList.remove("modal-open"); document.removeEventListener("keydown", onKey, true); if (o.onclose) o.onclose(); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
  const acts = h("div.mactions"); (o.actions || []).forEach(a => acts.append(U.btn(a.label, { cls: a.cls || "cream", icon: a.icon, on: () => { if (a.on) { const r = a.on(close); if (r === false) return; } if (a.close !== false) close(); }, disabled: a.disabled })));
  const dlg = h("div.modal" + (o.wide ? ".wide" : ""), { role: "dialog", "aria-modal": "true", "aria-label": o.title }, h("div.mhead", h("h2.shout-md", o.title), h("button.round", { type: "button", "aria-label": "close", onclick: close }, ico("x"))), h("div.mbody", o.body), acts);
  const back = h("div.backdrop", { onmousedown: e => { if (e.target === back) close(); } }, dlg);
  root.append(back); document.body.classList.add("modal-open");
  const onKey = e => {
    if (e.key === "Escape") { e.stopPropagation(); close(); }
    if (e.key === "Tab") { const f = VB.$$("button,input,select,textarea,a[href]", dlg).filter(x => !x.disabled && x.offsetParent !== null); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
  };
  document.addEventListener("keydown", onKey, true);
  setTimeout(() => { const f = VB.$("input,select,button.btn,textarea", dlg); (o.focus ? VB.$(o.focus, dlg) : f) && (o.focus ? VB.$(o.focus, dlg) : f).focus(); }, 30);
  return { close, dlg };
};
D.confirm = (title, text, label, cb, danger) => D.modal({ title, body: h("p", text), actions: [{ label: "not now", cls: "cream" }, { label, cls: danger ? "danger" : "", on: () => { cb(); } }] });

/* ---------- export ---------- */
D.export = () => {
  const doc = VB.doc, o = { format: "png", preset: "board", fit: "cover", scale: 1, w: doc.artboard.w, h: doc.artboard.h, transparent: false, quality: 0.92, page: "fit", badges: false };
  const prev = h("div.exprev", h("p.status", "making a preview..."));
  const info = h("p.exinfo"), err = h("p.status.bad", { role: "alert", hidden: true });
  let tok = 0;
  const refresh = VB.debounce(async () => {
    const my = ++tok; err.hidden = true;
    prev.classList.toggle("alpha", o.transparent && o.format === "png");
    try {
      const r = await VB.renderExport(doc, Object.assign({}, o, { maxSide: 760 }));
      if (my !== tok) return;
      const sz = VB.exportSize(doc, o); info.textContent = `${sz.w} × ${sz.h} px · ${o.format === "pdf" ? "PDF" : o.format.toUpperCase()}`;
      r.canvas.className = "excanvas"; r.canvas.setAttribute("role", "img"); r.canvas.setAttribute("aria-label", "export preview"); prev.replaceChildren(r.canvas);
    } catch (e) { if (my !== tok) return; prev.replaceChildren(h("p.status", "no preview")); err.textContent = e.message; err.hidden = false; }
  }, 180);
  const ctl = h("div.excontrols");
  const build = () => {
    ctl.replaceChildren();
    ctl.append(h("div.fl", "format"), U.seg([["png", "PNG"], ["jpeg", "JPEG"], ["pdf", "PDF (print)"]], o.format, v => { o.format = v; if (v !== "png") o.transparent = false; build(); refresh(); }));
    const sel = h("select", { "aria-label": "size" }); Object.keys(VB.EXPORT_PRESETS).forEach(k => sel.append(h("option", { value: k, selected: o.preset === k }, VB.EXPORT_PRESETS[k].label + (k === "board" ? ` (${doc.artboard.w} × ${doc.artboard.h})` : ""))));
    sel.addEventListener("change", () => { o.preset = sel.value; build(); refresh(); });
    ctl.append(U.field("size", sel));
    if (o.preset === "custom") ctl.append(h("div.grid2", U.num("width px", o.w, v => { o.w = VB.clamp(Math.round(v), 64, 8000); refresh(); }, { min: 64, max: 8000 }), U.num("height px", o.h, v => { o.h = VB.clamp(Math.round(v), 64, 8000); refresh(); }, { min: 64, max: 8000 })));
    if (o.preset === "board") ctl.append(U.slider("resolution", o.scale, 0.5, 3, 0.25, v => { o.scale = v; }, () => refresh(), v => v + "x"));
    ctl.append(h("div.fl", "what to include"), U.seg([["cover", "fill the size"], ["contain", "whole board"], ["content", "fit all objects"]], o.fit, v => { o.fit = v; refresh(); }));
    if (o.format === "png") ctl.append(h("div.chips", U.chip("transparent background", o.transparent, (e, b) => { o.transparent = !o.transparent; b.setAttribute("aria-pressed", String(o.transparent)); refresh(); })));
    if (o.format !== "png") ctl.append(U.slider("quality", o.quality, 0.5, 1, 0.01, v => { o.quality = v; }, () => refresh(), v => Math.round(v * 100) + "%"));
    if (o.format === "pdf") { const ps = h("select", { "aria-label": "page size" }); [["fit", "fit the picture"], ["a4", "A4"], ["a3", "A3"], ["letter", "US letter"]].forEach(([v, l]) => ps.append(h("option", { value: v, selected: o.page === v }, l))); ps.addEventListener("change", () => { o.page = ps.value; }); ctl.append(U.field("page", ps)); }
    ctl.append(h("div.chips", U.chip("include goal badges", o.badges, (e, b) => { o.badges = !o.badges; b.setAttribute("aria-pressed", String(o.badges)); refresh(); })));
    ctl.append(h("p.psub", "the file only contains the board, not the editor. layers, shadows, textures, threads and text are all kept."));
  };
  build();
  const m = D.modal({ title: "export", wide: true, body: h("div.exwrap", h("div.excol", prev, info), h("div.excol", ctl, err)), actions: [{ label: "cancel", cls: "cream" }, { label: "download", icon: "download", cls: "", close: false, on: async close => {
    const btn = VB.$$(".mactions .btn", m.dlg).pop(); btn.disabled = true; btn.lastChild.textContent = "making your file...";
    try { const r = await VB.exportFile(doc, o); VB.toast(`saved ${r.w} × ${r.h} ${r.ext.toUpperCase()} (${(r.bytes / 1048576).toFixed(1)} MB)`); close(); }
    catch (e) { err.textContent = e.message || "export failed. try a smaller size"; err.hidden = false; btn.disabled = false; btn.lastChild.textContent = "download"; }
    return false;
  } }] });
  refresh();
};

/* ---------- templates ---------- */
D.templateThumb = async t => {
  const doc = VB.buildTemplate(t.id);
  await Promise.all(VB.assetIdsOf(doc.elements).map(id => VB.loadAsset(id)));
  const d = document.createElement("div"); d.className = "pv"; d.innerHTML = VB.docSVG(doc, { width: "100%", height: "100%", par: "xMidYMid meet", uid: VB.uid() });
  return d;
};
D.template = t => {
  const inEditor = VB.doc && !$("#view-editor").hidden, empty = !inEditor || !VB.doc.elements.length;
  const start = async mode => {
    const doc = VB.buildTemplate(t.id);
    await Promise.all(VB.assetIdsOf(doc.elements).map(id => VB.loadAsset(id)));
    if (mode === "new" || !inEditor) {
      doc.id = "b" + VB.uid(); doc.created = doc.updated = Date.now();
      await VB.db.putBoard({ id: doc.id, name: doc.name, created: doc.created, updated: doc.updated, cover: "", data: { artboard: doc.artboard, theme: doc.theme, categories: doc.categories, elements: doc.elements, uploads: [], view: doc.view } });
      if (inEditor) await VB.saveNow(); location.hash = "#/b/" + doc.id; return;
    }
    if (mode === "replace") {
      VB.doc.elements = doc.elements; VB.doc.artboard = doc.artboard; VB.doc.theme = doc.theme; VB.doc.categories = doc.categories; VB.doc.name = doc.name;
      VB.sel.clear(); VB.scene.chrome(); VB.scene.all(); VB.commit(); VB.emit("sel"); VB.emit("doc:changed"); VB.fit(); U.buildToolbar(); VB.toast("template applied. everything is editable"); return;
    }
    const c = VB.viewCenter(), u = VB.unionBox(doc.elements.filter(e => e.type !== "thread")), dx = c.x - (u.x1 + u.x2) / 2, dy = c.y - (u.y1 + u.y2) / 2;
    doc.elements.forEach(e => { if (e.type === "thread") e.pts.forEach(p => { if (!p.att) { p.x += dx; p.y += dy; } }); else { e.x += dx; e.y += dy; } });
    const gid = "g" + VB.uid(); doc.elements.forEach(e => VB.doc.elements.push(e));
    VB.scene.reindex(); doc.elements.forEach(e => VB.scene.el(e, true)); VB.select(doc.elements.map(e => e.id)); VB.commit(); VB.emit("doc:changed"); VB.toast("template pieces added to the board");
  };
  const body = h("div.col", h("p", t.desc + "."), h("p.psub", "pictures are generated sample art. replace them with your own."));
  const acts = inEditor
    ? [{ label: "cancel", cls: "cream" }, { label: "new board", on: () => { start("new"); }, cls: "" }, { label: "add to this board", cls: "cream", on: () => { start("add"); } }, { label: "replace this board", cls: "cream", on: close => { if (empty) { start("replace"); return; } D.confirm("replace this board?", "everything on this board will be swapped for the template. you can undo with ctrl+z.", "replace", () => start("replace"), true); } }]
    : [{ label: "cancel", cls: "cream" }, { label: "use this template", on: () => { start("new"); } }];
  D.modal({ title: t.name, body, actions: acts });
};

/* ---------- random inspiration ---------- */
const AFFIRM = ["small steps, big life.", "i am allowed to take up space.", "future me says thanks.", "done is better than perfect.", "keep going, you're closer than you think.", "one day at a time.", "make it happen.", "i trust the process.", "i'm exactly where i need to be.", "do it scared.", "romanticize your life.", "soft heart, strong mind."];
D.inspire = () => {
  const pick = (arr, n) => arr.slice().sort(() => Math.random() - 0.5).slice(0, n);
  let affirm, stick, mood;
  const list = h("div.col"), chosen = new Set();
  const roll = () => {
    affirm = pick(AFFIRM, 3); stick = pick(window.VB_STICKERS.filter(s => s.cat !== "pins"), 4); mood = pick(Object.keys(VB.MOODS), 1)[0]; chosen.clear(); list.replaceChildren();
    list.append(h("p.shout-sm", "affirmations"));
    affirm.forEach((a, i) => list.append(h("label.pick", h("input", { type: "checkbox", onchange: e => e.target.checked ? chosen.add("a" + i) : chosen.delete("a" + i) }), h("span.script", a))));
    list.append(h("p.shout-sm", "stickers"));
    const row = h("div.pickrow"); stick.forEach((s, i) => { const cb = h("input", { type: "checkbox", "aria-label": "sticker " + s.name, onchange: e => e.target.checked ? chosen.add("s" + i) : chosen.delete("s" + i) }); const l = h("label.pickstk", cb); l.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 ${s.w} ${s.h}" aria-hidden="true">${s.svg(s.a, s.b)}</svg>`); row.append(l); }); list.append(row);
    list.append(h("p.shout-sm", "mood"));
    list.append(h("label.pick", h("input", { type: "checkbox", onchange: e => e.target.checked ? chosen.add("m") : chosen.delete("m") }), h("span", "try the " + VB.MOODS[mood].label + " look (changes paper and tone only)")));
  };
  roll();
  D.modal({ title: "need an idea?", body: h("div.col", h("p", "pick what you like. nothing is added until you press add."), list), actions: [{ label: "shuffle", cls: "cream", close: false, on: () => { roll(); return false; } }, { label: "close", cls: "cream" }, { label: "add selected", on: () => {
    if (!chosen.size) { VB.toast("tick something first"); return false; }
    const th = VB.doc.theme;
    chosen.forEach(k => {
      if (k[0] === "a") U.addText({ text: affirm[+k.slice(1)], font: "script", fs: 54, w: 520, noEdit: true, paper: { shape: "torn", texture: "plain", color: th.noteColor } });
      else if (k[0] === "s") U.addSticker(stick[+k.slice(1)].id);
      else if (k === "m") { VB.applyMood(VB.doc, mood); VB.scene.chrome(); VB.scene.all(); VB.commit(); }
    });
    VB.emit("doc:changed");
  } }] });
};

/* ---------- more menu ---------- */
D.more = anchor => {
  const old = $(".menu"); if (old) { old.remove(); return; }
  const m = h("div.menu", { role: "menu" });
  const item = (label, fn) => m.append(h("button", { type: "button", role: "menuitem", onclick: () => { m.remove(); fn(); } }, label));
  item("back up this board (.json file)", async () => { try { const blob = await VB.exportBackup(VB.doc); VB.download(blob, (VB.doc.name || "board").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-backup.json"); VB.toast("backup downloaded. it contains your pictures too"); } catch (e) { VB.toast("backup failed: " + e.message, "bad"); } });
  item("restore a backup...", () => D.restore());
  item("need an idea? random inspiration", () => D.inspire());
  item("preview mode (esc to leave)", () => U.preview(true));
  item("board settings + shortcuts", () => { VB.deselect(); U.setRTab("inspector"); $("#right").classList.add("open"); $("#right").classList.remove("off"); setTimeout(() => VB.interact.draw(), 60); });
  item("where is my work saved?", () => D.modal({ title: "where is my work saved?", body: h("div.col", h("p", "boards and pictures are saved automatically in this browser (IndexedDB), on this device only. nothing is uploaded."), h("p", "if you clear site data or use a private window they can disappear. use back up this board to keep a file, and restore a backup to bring it back anywhere."), VB.db.ok ? null : h("p.status.bad", "saving is switched off in this browser mode, so this visit will not be kept.")), actions: [{ label: "got it", cls: "" }] }));
  document.body.append(m);
  const r = anchor.getBoundingClientRect(); m.style.top = r.bottom + 10 + "px"; m.style.right = Math.max(8, window.innerWidth - r.right) + "px";
  const off = e => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener("pointerdown", off, true); } };
  setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
  m.querySelector("button").focus();
  m.addEventListener("keydown", e => { if (e.key === "Escape") { m.remove(); anchor.focus(); } });
};
D.restore = () => {
  U.pickFiles(async files => {
    try { const b = await VB.importBackup(files[0]); VB.toast("restored as a new board"); location.hash = "#/b/" + b.id; }
    catch (e) { VB.toast(e.message, "bad"); }
  }, ".json,application/json");
};
})();
