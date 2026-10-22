/* briyan.xyz/plan: a day-by-day study checklist with honest check-ins.
   Vanilla JS, no dependencies. Everything is stored in localStorage under "plan.v1". */
(function () {
  "use strict";
  var P = window.PLAN;
  var KEY = "plan.v1";
  var NS = "http://www.w3.org/2000/svg";
  var SUBJ = P.subjects;
  var STUDY_SUBJ = ["maths", "phy", "chem", "cs", "eng"];

  /* ---------------------------------------------------------------- helpers */
  function $(s, r) { return (r || document).querySelector(s); }
  function h(tag, attrs) {
    var el = document.createElement(tag), i, k, v, kids = Array.prototype.slice.call(arguments, 2);
    attrs = attrs || {};
    for (k in attrs) {
      v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    }
    (function add(list) {
      for (i = 0; i < list.length; i++) {
        var c = list[i];
        if (c == null || c === false) continue;
        if (Array.isArray(c)) add(c);
        else el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
      }
    })(kids);
    return el;
  }
  var ICONS = {
    today: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    plan: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    recap: '<path d="M5 20V11M12 20V5M19 20v-7"/>',
    exams: '<path d="M6 3h12M6 21h12M7 3v4l5 5-5 5v4M17 3v4l-5 5 5 5v4"/>',
    tools: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    calm: '<path d="M3 9c3-3 6 3 9 0s6 3 9 0M3 16c3-3 6 3 9 0s6 3 9 0"/>',
    text: '<path d="M3 19L8 5l5 14M5 14h6M15 19l3.5-9 3.5 9M16 16.5h5"/>',
    contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
    play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-9z"/>',
    pencil: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
  };
  function ico(name) {
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", "ico"); s.setAttribute("aria-hidden", "true");
    s.innerHTML = ICONS[name] || "";
    return s;
  }
  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var DOWL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function diffDays(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }
  function short(s) { var d = parse(s); return DOW[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()]; }
  function dm(s) { var d = parse(s); return d.getDate() + " " + MON[d.getMonth()]; }
  function range(a, b) { return a === b ? dm(a) : dm(a) + " – " + dm(b); }
  function todayISO() {
    var q = new URLSearchParams(location.search).get("d");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
    return iso(new Date());
  }
  function monday(s) { var d = parse(s), w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return iso(d); }
  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function inPlan(d) { return d >= P.start && d <= P.end; }

  /* ---------------------------------------------------------------- storage */
  var DEF = function () {
    return { done: {}, started: {}, skipped: {}, moved: {}, redo: {}, recalls: {}, energy: {}, launch: {}, parked: [], doubts: [],
      examDates: {}, reflect: {}, note: {}, badges: {}, settings: {}, timer: null, focusOnly: false, fresh: null };
  };
  var S, memOnly = false;
  function load() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { memOnly = true; }
    S = DEF();
    if (raw && typeof raw === "object") for (var k in S) if (raw[k] != null) S[k] = raw[k];
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); memOnly = false; } catch (e) { memOnly = true; }
  }
  load();

  /* ---------------------------------------------------------------- settings */
  function applySettings() {
    var s = S.settings, d = document.documentElement;
    d.dataset.theme = s.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    s.large ? d.setAttribute("data-large", "") : d.removeAttribute("data-large");
    s.contrast ? d.setAttribute("data-contrast", "") : d.removeAttribute("data-contrast");
    var calm = s.calm == null ? matchMedia("(prefers-reduced-motion: reduce)").matches : s.calm;
    calm ? d.setAttribute("data-calm", "") : d.removeAttribute("data-calm");
    var m = $('meta[name="theme-color"]'); if (m) m.content = d.dataset.theme === "dark" ? "#120637" : "#f3effd";
  }
  function isCalm() { return document.documentElement.hasAttribute("data-calm"); }
  function renderTools() {
    var box = $("#tools"); box.textContent = "";
    var defs = [
      ["theme", "moon", "Night mode", function () { return document.documentElement.dataset.theme === "dark"; },
        function () { S.settings.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; }],
      ["calm", "calm", "Calm motion (stop the movement)", isCalm, function () { S.settings.calm = !isCalm(); }],
      ["large", "text", "Larger text", function () { return !!S.settings.large; }, function () { S.settings.large = !S.settings.large; }],
      ["contrast", "contrast", "High contrast", function () { return !!S.settings.contrast; }, function () { S.settings.contrast = !S.settings.contrast; }],
      ["sound", "sound", "Sound effects", function () { return S.settings.sound !== false; }, function () { S.settings.sound = S.settings.sound === false; }]
    ];
    defs.forEach(function (d) {
      var b = h("button", { type: "button", class: "round", "aria-pressed": String(!!d[3]()), "aria-label": d[2], title: d[2] }, ico(d[1]));
      b.addEventListener("click", function () { d[4](); save(); applySettings(); renderTools(); if (d[0] === "sound") beep("pop"); });
      box.appendChild(b);
    });
  }

  /* ---------------------------------------------------------------- audio, toast, bubbles */
  var actx;
  function beep(kind) {
    if (S.settings.sound === false) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var seq = kind === "chime" ? [[660, 0, .18], [880, .2, .18], [1175, .4, .35]] : kind === "soft" ? [[330, 0, .12]] : [[520, 0, .07], [780, .07, .1]];
      seq.forEach(function (n) {
        var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + n[1];
        o.type = "sine"; o.frequency.value = n[0];
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + n[2]);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + n[2] + .05);
      });
    } catch (e) { /* audio is optional */ }
  }
  function toast(msg, ms) {
    var box = $("#toasts"), t = h("div", { class: "toast", role: "status", text: msg });
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 3600);
  }
  var COLORS = { maths: "#9457eb", phy: "#3daab8", chem: "#cfff00", cs: "#ffd000", eng: "#e0632b", review: "#e0d4fb", hcb: "#fefbff" };
  function burst(el, subj) {
    if (isCalm() || !el) return;
    var r = el.getBoundingClientRect(), n = 9;
    for (var i = 0; i < n; i++) {
      var b = h("i", { class: "bubble-pop" });
      b.style.left = r.left + r.width / 2 - 11 + (Math.random() * 30 - 15) + "px";
      b.style.top = r.top + r.height / 2 - 11 + "px";
      b.style.background = COLORS[subj] || "#cfff00";
      b.style.setProperty("--dx", Math.round(Math.random() * 120 - 60) + "px");
      b.style.animationDelay = Math.round(Math.random() * 150) + "ms";
      document.body.appendChild(b);
      setTimeout(function (x) { x.remove(); }.bind(null, b), 1400);
    }
  }

  /* ---------------------------------------------------------------- tasks */
  var BASE = [];
  P.days.forEach(function (d) { d.tasks.forEach(function (t) { var c = Object.assign({}, t); c.date = d.date; BASE.push(c); }); });
  var BYID = {}; BASE.forEach(function (t) { BYID[t.id] = t; });

  function eff(t) { return S.moved[t.id] || t.date; }
  function isStudy(t) { return t.k !== "side"; }
  function ticketTask(date) {
    return { id: date + "-tix", s: "hcb", t: "Answer Hack Club tickets", d: "Clear the queue. Quick wins first, park the tricky ones.", k: "side", e: "light", date: date, tix: true,
      st: ["Opened the queue", "Replied to or closed what I could", "Noted anything stuck for tomorrow"] };
  }
  function windowTasks(date) {
    if (date < "2026-11-16" || date > "2026-11-27") return [];
    var out = [], tom = addDays(date, 1), ed = S.examDates, any = false;
    STUDY_SUBJ.forEach(function (s) {
      if (ed[s] === date) {
        out.push({ id: date + "-paper-" + s, s: s, t: "Paper day: " + SUBJ[s].name, k: "review", e: "light", date: date,
          d: "Today is the paper. Eat, pack, arrive early. Afterwards write down what to fix next time.",
          st: ["Ate something and packed pens, ID and water", "Looked at my formula sheet or key points once, not more", "Wrote down one thing to do differently next paper"] });
      }
      if (ed[s] === tom) {
        any = true;
        out.push({ id: date + "-last-" + s, s: s, t: "Last look: " + SUBJ[s].name + " (tomorrow's paper)", k: "revise", e: "medium", date: date,
          d: "Light and calm: no new topics. Formulas and key points from memory, then a few questions on your weakest chapter.",
          st: ["Wrote the key formulas or points from memory", "Did a few questions from my weakest chapter", "Fixed what I got wrong, then stopped"] });
      }
    });
    if (!any) {
      out.push({ id: date + "-win-a", s: "review", t: "Revise the subject of your next paper", k: "revise", e: "medium", date: date,
        d: "Check the datesheet first. Recall formulas without notes, do questions on your weakest chapters, then fix mistakes. No new topics.",
        st: ["Checked which paper is next", "Recalled formulas or key points without notes", "Did questions on my weakest chapters", "Fixed my mistakes"] });
      out.push({ id: date + "-win-b", s: "review", t: "Light recap for tomorrow", k: "review", e: "light", date: date,
        d: "Skim your formula sheet and error log. Then stop and sleep.",
        st: ["Skimmed my formula sheet", "Read my error log once", "Closed the books at a sensible hour"] });
    }
    return out;
  }
  function redoTasks(date) {
    var out = [];
    for (var id in S.redo) {
      if (S.redo[id] !== date || !BYID[id]) continue;
      var o = BYID[id];
      out.push({ id: "redo-" + id, redoOf: id, s: o.s, t: "Second pass: " + o.t, k: "revise", e: "medium", date: date,
        d: "You flagged this as shaky. Go again, slower, and fix what tripped you up. " + o.d, st: o.st });
    }
    return out;
  }
  function tasksFor(date) {
    var out = BASE.filter(function (t) { return eff(t) === date; });
    out = out.concat(redoTasks(date), windowTasks(date));
    if (inPlan(date)) out.push(ticketTask(date));
    return out;
  }
  function stOf(id) { return S.done[id] || null; }
  function weight(t) { var s = stOf(t.id); return s ? (s.status === "done" ? 1 : .5) : 0; }
  function handled(t) { return !!(S.done[t.id] || S.skipped[t.id]); }
  function studyOf(date) { return tasksFor(date).filter(isStudy); }
  function dayFraction(date) {
    var ts = studyOf(date); if (!ts.length) return null;
    return ts.reduce(function (a, t) { return a + weight(t); }, 0) / ts.length;
  }
  function overdue(today) {
    return BASE.filter(function (t) { return isStudy(t) && eff(t) < today && !handled(t); })
      .sort(function (a, b) { return STUDY_SUBJ.indexOf(a.s) - STUDY_SUBJ.indexOf(b.s) || (a.date < b.date ? -1 : 1); });
  }
  function weakTasks() {
    var out = [];
    for (var id in S.done) {
      var d = S.done[id], t = BYID[id];
      if (!t || d.fixed) continue;
      if (d.status === "partial" || (d.conf && d.conf <= 2)) out.push(t);
    }
    return out;
  }
  function recallsFor(date) {
    var out = [], base = [2, 6];
    for (var id in S.done) {
      var d = S.done[id], t = BYID[id];
      if (!t || !d.date || t.k === "test" || t.k === "review" || t.k === "side") continue;
      base.forEach(function (n, i) {
        var due = addDays(d.date, n), rid = "rc-" + id + "-" + (i + 1);
        if (S.recalls[rid]) return;
        if (due <= date && diffDays(due, date) <= 4) out.push({ id: rid, of: id, s: t.s, t: "Recall: " + t.t, due: due });
      });
    }
    return out.sort(function (a, b) { return a.due < b.due ? -1 : 1; }).slice(0, 3);
  }
  var EFFR = { light: 0, medium: 1, heavy: 2 };
  function ordered(list, date) {
    var en = S.energy[date], idx = list.map(function (t, i) { return [t, i]; });
    if (en === 1) idx.sort(function (a, b) { return EFFR[a[0].e] - EFFR[b[0].e] || a[1] - b[1]; });
    else if (en === 3) idx.sort(function (a, b) { return EFFR[b[0].e] - EFFR[a[0].e] || a[1] - b[1]; });
    return idx.map(function (x) { return x[0]; });
  }

  /* ---------------------------------------------------------------- streaks & stats */
  function activeDay(date) {
    return studyOf(date).some(function (t) { return S.done[t.id]; }) || recallsDone(date);
  }
  function recallsDone(date) {
    for (var k in S.recalls) if (S.recalls[k].date === date) return true; return false;
  }
  function streaks(today) {
    var cur = 0, miss = 0, d = today;
    if (!activeDay(d)) d = addDays(d, -1);
    while (d >= P.start) {
      if (activeDay(d)) { cur++; miss = 0; } else { miss++; if (miss >= 2) break; }
      d = addDays(d, -1);
    }
    var best = 0, run = 0; miss = 0;
    for (var x = P.start; x <= today; x = addDays(x, 1)) {
      if (activeDay(x)) { run++; miss = 0; if (run > best) best = run; } else { miss++; if (miss >= 2) { run = 0; miss = 0; } }
    }
    return { cur: cur, best: Math.max(best, cur) };
  }
  function subjectStats(s, today) {
    var due = BASE.filter(function (t) { return t.s === s && isStudy(t) && eff(t) <= today; });
    var all = BASE.filter(function (t) { return t.s === s && isStudy(t); });
    var done = due.reduce(function (a, t) { return a + weight(t); }, 0);
    var confs = [];
    all.forEach(function (t) { var d = stOf(t.id); if (d && d.conf) confs.push(d.conf); });
    var avg = confs.length ? confs.reduce(function (a, b) { return a + b; }, 0) / confs.length : null;
    var weak = weakTasks().filter(function (t) { return t.s === s; });
    var strong = all.filter(function (t) { var d = stOf(t.id); return d && d.status === "done" && d.conf >= 4; });
    return { due: due.length, done: done, pct: due.length ? Math.round(100 * done / due.length) : 0, total: all.length, avg: avg, weak: weak, strong: strong,
      completed: all.filter(function (t) { return S.done[t.id]; }).length };
  }
  function readiness(s, untilISO) {
    var list = BASE.filter(function (t) { return t.s === s && isStudy(t) && t.date < untilISO; });
    var done = list.reduce(function (a, t) { return a + weight(t); }, 0);
    return { total: list.length, done: done, left: list.filter(function (t) { return !S.done[t.id]; }).length, pct: list.length ? Math.round(100 * done / list.length) : 0 };
  }

  /* ---------------------------------------------------------------- exams */
  function examList(today) {
    var out = [];
    P.exams.forEach(function (e) {
      if (e.s === "all" && e.id === "pt2") {
        out.push({ id: e.id, s: "all", n: e.n, a: e.a, b: e.b, topics: e.topics });
        return;
      }
      out.push(e);
    });
    STUDY_SUBJ.forEach(function (s) {
      if (S.examDates[s]) out.push({ id: "pt2-" + s, s: s, n: "PT2 paper", a: S.examDates[s], b: S.examDates[s], topics: "Full syllabus" });
    });
    return out;
  }
  function upcoming(today, n) {
    return examList(today).filter(function (e) { return e.a && e.b >= today; }).sort(function (x, y) { return x.a < y.a ? -1 : x.a > y.a ? 1 : 0; }).slice(0, n || 4);
  }
  function whenText(e, today) {
    if (!e.a) return e.tbc ? e.tbc + " (date tbc)" : "date tbc";
    if (today >= e.a && today <= e.b) return "on now";
    var n = diffDays(today, e.a);
    return n === 1 ? "tomorrow" : "in " + plural(n, "day");
  }
  function examChip(e, today) {
    var sj = e.s === "all" ? null : SUBJ[e.s];
    return h("span", { class: "chip" + (sj ? " s s-" + e.s : "") },
      (sj ? sj.short + " " : "") + e.n.replace("Unit test", "UT").replace(" (full syllabus)", "") + " · " + whenText(e, today));
  }

  /* ---------------------------------------------------------------- dialogs */
  var dlg = $("#dlg");
  function openDlg(node, opts) {
    dlg.textContent = ""; dlg.appendChild(node);
    if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); } }
    dlg._onclose = opts && opts.onclose;
    var f = node.querySelector("[autofocus]") || node.querySelector("input,textarea,button");
    if (f) setTimeout(function () { try { f.focus(); } catch (e) { /* ignore */ } }, 30);
  }
  function closeDlg() { if (dlg.open) dlg.close(); }
  dlg.addEventListener("click", function (e) { if (e.target === dlg) closeDlg(); });
  dlg.addEventListener("close", function () { if (dlg._onclose) { var f = dlg._onclose; dlg._onclose = null; f(); } });
  function dialog(title, kids) {
    return h("div", { class: "dlg" }, h("h2", { id: "dlg-title", text: title }), kids);
  }
  function closeBtn(label) { return h("button", { type: "button", class: "btn cream", onclick: closeDlg, text: label || "Close" }); }

  /* ---- confirm sheet: the honest check-in ---- */
  function openConfirm(t, srcEl) {
    var existing = stOf(t.id), ticked = {}, conf = existing ? existing.conf : 0;
    var startedAgo = S.started[t.id] ? Math.round((Date.now() - S.started[t.id]) / 1000) : null;
    var isSide = t.k === "side", isTest = t.k === "test";
    var stepBoxes = t.st.map(function (txt, i) {
      var cb = h("input", { type: "checkbox", id: "st" + i });
      if (existing && existing.steps && existing.steps.indexOf(i) > -1) { cb.checked = true; ticked[i] = true; }
      cb.addEventListener("change", function () { ticked[i] = cb.checked; sync(); });
      return h("label", { class: "opt", for: "st" + i }, cb, h("span", { text: txt }));
    });
    var scale = h("div", { class: "scale" });
    for (var n = 1; n <= 5; n++) {
      (function (n) {
        var r = h("input", { type: "radio", name: "conf", value: n, "aria-label": n + " of 5" });
        if (conf === n) r.checked = true;
        r.addEventListener("change", function () { conf = n; sync(); });
        scale.appendChild(h("label", null, r, h("span", { text: String(n) })));
      })(n);
    }
    var proof = h("textarea", { id: "proof", rows: 3, placeholder: isSide ? "What did you ship or clear? (optional)" : "e.g. \"Gauss's law for a sheet gives E = σ/2ε₀\" or \"I kept mixing up dot and cross product\"" });
    if (existing && existing.proof) proof.value = existing.proof;
    proof.addEventListener("input", sync);
    var got = h("input", { type: "number", min: 0, step: "any", "aria-label": "marks scored", placeholder: "marks" });
    var outOf = h("input", { type: "number", min: 1, step: "any", "aria-label": "out of", placeholder: "out of" });
    if (existing && existing.score) { got.value = existing.score[0]; outOf.value = existing.score[1]; }
    var msg = h("p", { class: "hint", "aria-live": "polite" });
    var lock = h("button", { type: "button", class: "btn", onclick: function () { finish("done"); } }, ico("check"), "Lock it in");
    var part = h("button", { type: "button", class: "btn orange", onclick: function () { finish("partial"); }, text: "I did part of it" });
    var nope = h("button", { type: "button", class: "btn cream", onclick: function () { closeDlg(); toast("No stress. Put it back and try just 10 minutes."); }, text: "Not yet" });

    function count() { return Object.keys(ticked).filter(function (k) { return ticked[k]; }).length; }
    function sync() {
      var c = count(), all = c === t.st.length, needProof = !isSide && proof.value.trim().length < 10;
      lock.disabled = !(all && conf && !needProof);
      part.hidden = !(c > 0 && !all);
      part.disabled = !conf;
      if (!c) msg.textContent = "Tick only what you really did. Nothing ticked? Hit \"Not yet\" — that's fine.";
      else if (!all) msg.textContent = conf ? "Part-done counts as half and gets queued for a second pass." : "Rate how well you could explain it, then save.";
      else if (!conf) msg.textContent = "Last bits: rate how well you could explain it.";
      else if (needProof) msg.textContent = "One line of proof, please: what do you remember, or which mistake did you make?";
      else msg.textContent = "Nice. Lock it in.";
      msg.className = "hint" + (lock.disabled ? "" : " good");
    }
    function finish(status) {
      var steps = Object.keys(ticked).filter(function (k) { return ticked[k]; }).map(Number);
      var rec = { status: status, conf: conf, proof: proof.value.trim(), steps: steps, ts: Date.now(), date: todayISO() };
      if (isTest && got.value && outOf.value) rec.score = [+got.value, +outOf.value];
      if (existing && existing.date) rec.date = existing.date;
      S.done[t.id] = rec; delete S.skipped[t.id];
      if (t.redoOf && S.done[t.redoOf] && status === "done" && conf >= 3) S.done[t.redoOf].fixed = true;
      if (status === "done" && conf <= 2 && !t.redoOf) toast("Logged as shaky. It will come back for a second pass.");
      save(); closeDlg(); beep("pop"); burst(srcEl, t.s);
      if (status === "done") toast(pick(["Locked in. Real progress.", "That one's yours now.", "Done and honest. Best kind.", "Another bubble in the jar."]));
      else toast("Saved as part-done. Half credit, and it comes back later.");
      checkBadges(); render(true);
    }
    var kids = [
      h("div", { class: "row" }, h("span", { class: "chip s s-" + t.s, text: SUBJ[t.s].name }), h("span", { class: "tstatus", text: t.t })),
      startedAgo != null && startedAgo < 120 ? h("p", { class: "hint bad", text: "You only started this " + startedAgo + " seconds ago. If you really did it, great. If not, keep going!" }) : null,
      h("fieldset", { class: "fieldset" }, h("legend", { text: "1. Honesty check: what did you actually do?" }), stepBoxes),
      h("fieldset", { class: "fieldset" }, h("legend", { text: "2. Could you explain it to a friend?" }), scale,
        h("div", { class: "scale-l" }, h("span", { text: "not really" }), h("span", { text: "I could teach it" }))),
      h("div", { class: "fieldset" }, h("label", { class: "shout", for: "proof", style: "font-size:1rem" }, isSide ? "3. What happened? (optional)" : "3. One line of proof"), proof),
      isTest ? h("div", { class: "fieldset" }, h("label", { class: "shout", style: "font-size:1rem" }, "How did it go? (optional)"), h("div", { class: "row" }, got, outOf)) : null,
      msg,
      h("div", { class: "row" }, lock, part, nope)
    ];
    openDlg(dialog("Lock in: " + t.t, kids));
    sync();
  }

  function openUndo(t) {
    openDlg(dialog("Undo this tick?", [
      h("p", { text: "\"" + t.t + "\" is marked as done. Only undo it if you ticked it by mistake." }),
      h("div", { class: "row" },
        h("button", { type: "button", class: "btn orange", onclick: function () { delete S.done[t.id]; save(); closeDlg(); render(true); toast("Unticked."); }, text: "Yes, undo" }),
        h("button", { type: "button", class: "btn cream", onclick: function () { openConfirm(t); }, text: "Edit my answers" }),
        closeBtn("Keep it"))
    ]));
  }
  function openSkip(t) {
    var reasons = ["No time today", "Too hard right now", "Already know this", "Not feeling it"];
    openDlg(dialog("Skip \"" + t.t + "\"?", [
      h("p", { text: "Skipping is allowed. Say why, so you can spot patterns in the recap." }),
      h("div", { class: "pills" }, reasons.map(function (r) {
        return h("button", { type: "button", class: "chip", onclick: function () { S.skipped[t.id] = r; save(); closeDlg(); render(true); toast("Skipped. It lives in Backlog (Recap)."); }, text: r });
      })),
      closeBtn("Cancel")
    ]));
  }
  function moveTomorrow(t, today) {
    var tom = addDays(today, 1);
    if (!inPlan(tom)) { openSkip(t); return; }
    S.moved[t.id] = tom; save(); render(true); toast("Moved to " + short(tom) + ".");
  }

  /* ---- start picker (micro-start) ---- */
  function openStart(t) {
    var opts = [[2, "2-minute start", "Just open the book and read the first question out loud."], [10, "10 minutes", "Tiny commitment. You can stop after."], [25, "25 minutes", "One classic focus round."], [40, "40 minutes", "A full block. Breaks after."]];
    openDlg(dialog("How long will you try?", [
      h("p", { class: "lead", text: "Starting is the hard part. Pick a size you can't say no to." }),
      h("div", { class: "stack" }, opts.map(function (o) {
        return h("button", { type: "button", class: "btn cream", style: "justify-content:flex-start;text-align:left", onclick: function () { S.started[t.id] = Date.now(); startTimer(o[0], t, "work"); closeDlg(); },
          "aria-label": o[1] + ". " + o[2] }, h("span", null, h("b", { text: o[1] }), h("br"), h("span", { class: "hint", text: o[2] })));
      })),
      closeBtn("Not now")
    ]));
  }

  /* ---- recall check ---- */
  function openRecall(r, srcEl) {
    var t = BYID[r.of];
    function answer(res) {
      S.recalls[r.id] = { res: res, date: todayISO() };
      if (res === "blank" && S.done[r.of]) { delete S.done[r.of].fixed; S.done[r.of].conf = Math.min(S.done[r.of].conf || 3, 2); }
      if (res === "easy" && S.done[r.of] && S.done[r.of].conf < 5) S.done[r.of].conf = S.done[r.of].conf + 1;
      save(); closeDlg(); beep("pop"); burst(srcEl, r.s);
      toast(res === "blank" ? "Blanking is data, not failure. It's flagged for a second pass." : "Memory strengthened.");
      checkBadges(); render(true);
    }
    openDlg(dialog("Quick recall", [
      h("div", { class: "row" }, h("span", { class: "chip s s-" + r.s, text: SUBJ[r.s].name }), h("b", { text: t.t })),
      h("p", { class: "lead", text: "Close everything. Say out loud (or write) three things you remember about this chapter. Then be honest:" }),
      h("div", { class: "stack" },
        h("button", { type: "button", class: "btn", onclick: function () { answer("easy"); }, text: "Easily, no peeking" }),
        h("button", { type: "button", class: "btn cream", onclick: function () { answer("ok"); }, text: "Kind of, a bit fuzzy" }),
        h("button", { type: "button", class: "btn orange", onclick: function () { answer("blank"); }, text: "I blanked" })),
      closeBtn("Later")
    ]));
  }

  /* ---- stuck helper ---- */
  function openStuck(next) {
    function timerQuick(m, label, t) { closeDlg(); startTimer(m, t || null, label || "work"); }
    var opts = [
      ["I can't get started", "Do a 2-minute start: open the page, read the first question out loud. That's it.", function () { if (next) { S.started[next.id] = Date.now(); } timerQuick(2, "work", next); }],
      ["I don't understand it", "Park it as a doubt for tuition, then switch to a lighter task so you keep moving.", function () { closeDlg(); openDoubt(next ? next.s : "maths", next ? "Don't get: " + next.t : ""); }],
      ["I'm restless", "3-minute movement break: walk, stretch, water. The task will still be here.", function () { timerQuick(3, "break"); }],
      ["I'm overwhelmed", "Switching on Just-one-thing mode. Only one task on screen. One.", function () { S.focusOnly = true; save(); closeDlg(); location.hash = "#/today"; render(true); }],
      ["My head is full of other stuff", "Dump it on the parking list now, then come back.", function () { closeDlg(); openPark(); }]
    ];
    openDlg(dialog("What's going on?", [
      h("div", { class: "stack" }, opts.map(function (o) {
        return h("button", { type: "button", class: "btn cream", style: "justify-content:flex-start;text-align:left", onclick: o[2] }, h("span", null, h("b", { text: o[0] }), h("br"), h("span", { class: "hint", text: o[1] })));
      })),
      closeBtn("I'm fine, close")
    ]));
  }

  /* ---- park a thought + doubts ---- */
  function openPark() {
    var inp = h("input", { type: "text", placeholder: "e.g. check the match score, text Sam back, buy pens", autofocus: true, "aria-label": "Thought to park" });
    var list = h("ul", { class: "stack", style: "list-style:none;margin:0;padding:0" });
    function draw() {
      list.textContent = "";
      if (!S.parked.length) list.appendChild(h("li", { class: "hint", text: "Nothing parked. Your head is clear." }));
      S.parked.forEach(function (p, i) {
        list.appendChild(h("li", { class: "row between" }, h("span", { text: p.text }),
          h("button", { type: "button", class: "chip", "aria-label": "Remove: " + p.text, onclick: function () { S.parked.splice(i, 1); save(); draw(); }, text: "done" })));
      });
    }
    function add() { var v = inp.value.trim(); if (!v) return; S.parked.unshift({ text: v, ts: Date.now() }); inp.value = ""; save(); draw(); beep("soft"); toast("Parked. Back to what you were doing."); }
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); add(); } });
    openDlg(dialog("Park a thought", [
      h("p", { class: "lead", text: "Get it out of your head and onto the list. You'll deal with it after your block." }),
      h("div", { class: "row" }, h("div", { style: "flex:1 1 220px" }, inp), h("button", { type: "button", class: "btn", onclick: add, text: "Park it" })),
      list, closeBtn("Back to work")
    ]));
    draw();
  }
  function openDoubt(subj, text) {
    var inp = h("input", { type: "text", value: text || "", placeholder: "What exactly confuses you?", autofocus: true, "aria-label": "Doubt" });
    var sel = h("select", { "aria-label": "Subject" }, STUDY_SUBJ.map(function (s) { var o = h("option", { value: s, text: SUBJ[s].name }); if (s === subj) o.selected = true; return o; }));
    openDlg(dialog("Save a doubt for tuition", [
      h("div", { class: "stack" }, inp, sel),
      h("div", { class: "row" },
        h("button", { type: "button", class: "btn", text: "Save doubt", onclick: function () {
          if (!inp.value.trim()) return;
          S.doubts.unshift({ id: "d" + Date.now(), text: inp.value.trim(), s: sel.value, done: false }); save(); closeDlg(); toast("Saved. It will show up on your tuition day."); render(true);
        } }), closeBtn("Cancel"))
    ]));
  }

  /* ---------------------------------------------------------------- timer */
  var tick;
  var BREAKS = ["Stand up and stretch for a full minute.", "Drink some water.", "Look out of a window for 20 seconds.", "Walk to another room and back.", "Ten slow breaths: in for 4, out for 6.", "Do 10 squats or shoulder rolls."];
  function startTimer(mins, t, mode) {
    S.timer = { mode: mode || "work", end: Date.now() + mins * 60000, total: mins * 60, id: t ? t.id : null, title: t ? t.t : (mode === "break" ? "Break" : "Free focus"), s: t ? t.s : null, mins: mins };
    save(); renderTimer(); beep("soft");
  }
  function stopTimer() { S.timer = null; save(); renderTimer(); }
  function fmt(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return pad(Math.floor(s / 60)) + ":" + pad(s % 60); }
  function renderTimer() {
    var box = $("#timer"); clearInterval(tick);
    if (!S.timer) { box.hidden = true; box.textContent = ""; document.title = baseTitle; return; }
    box.hidden = false; box.textContent = "";
    var T = S.timer, tm = h("div", { class: "tm", role: "timer", "aria-label": "Time left" }), label = h("div", { class: "tl" });
    label.appendChild(h("b", { text: T.mode === "break" ? "break time" : "focus" }));
    label.appendChild(document.createTextNode(T.title));
    var bar = h("div", { class: "timerbar" + (T.mode === "break" ? " break" : "") }, tm, label,
      h("div", { class: "row", style: "gap:6px;flex-wrap:nowrap" },
        h("button", { type: "button", class: "round", "aria-label": "Add 5 minutes", title: "+5 min", onclick: function () { S.timer.end += 300000; S.timer.total += 300; save(); }, style: "width:40px;height:40px;font:800 .8rem var(--font-display)" }, "+5"),
        h("button", { type: "button", class: "round", "aria-label": "Stop timer", title: "Stop", onclick: stopTimer, style: "width:40px;height:40px" }, ico("x"))));
    box.appendChild(bar);
    function upd() {
      if (!S.timer) return;
      var left = S.timer.end - Date.now();
      tm.textContent = fmt(left); document.title = "(" + fmt(left) + ") " + baseTitle;
      if (left <= 0) { clearInterval(tick); timerDone(); }
    }
    upd(); tick = setInterval(upd, 500);
  }
  function timerDone() {
    var T = S.timer; if (!T) return;
    S.timer = null; save(); renderTimer(); beep("chime");
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* ignore */ }
    try { if (document.hidden && window.Notification && Notification.permission === "granted") new Notification(T.mode === "break" ? "Break over" : "Focus round done", { body: T.title }); } catch (e) { /* ignore */ }
    var t = T.id ? (BYID[T.id] || null) : null;
    if (T.mode === "break") {
      openDlg(dialog("Break's over", [h("p", { class: "lead", text: "Ready for the next round?" }),
        h("div", { class: "row" }, h("button", { type: "button", class: "btn", text: "Start 25 min", onclick: function () { closeDlg(); startTimer(25, t, "work"); } }), closeBtn("Not yet"))]));
      return;
    }
    var kids = [h("p", { class: "lead", text: "Round finished: " + T.mins + " min on \"" + T.title + "\"." }), h("p", { class: "marker", style: "width:max-content;max-width:100%", text: pick(BREAKS) })];
    var row = h("div", { class: "row" });
    if (t) row.appendChild(h("button", { type: "button", class: "btn", text: "I finished the task", onclick: function () { openConfirm(t); } }));
    row.appendChild(h("button", { type: "button", class: "btn cream", text: "5-min break", onclick: function () { closeDlg(); startTimer(5, t, "break"); } }));
    row.appendChild(h("button", { type: "button", class: "btn cream", text: "One more round", onclick: function () { closeDlg(); startTimer(T.mins >= 25 ? 25 : 10, t, "work"); } }));
    kids.push(row);
    openDlg(dialog("Nice, that counts.", kids));
  }

  /* ---------------------------------------------------------------- badges */
  var BADGES = [
    ["first", "First lock-in", "Confirm your first task", function () { return Object.keys(S.done).length >= 1; }],
    ["day3", "3-day streak", "Study 3 days in a row", function (st) { return st.best >= 3; }],
    ["day7", "7-day streak", "A whole week", function (st) { return st.best >= 7; }],
    ["full", "Clean sweep", "Finish every study task in a day", function () { return P.days.some(function (d) { var f = dayFraction(d.date); return f === 1; }); }],
    ["test", "Test taker", "Confirm a mini-test", function () { return Object.keys(S.done).some(function (id) { return BYID[id] && BYID[id].k === "test"; }); }],
    ["fixed", "Weak spot slain", "Redo a shaky chapter and nail it", function () { return Object.keys(S.done).some(function (id) { return S.done[id].fixed; }); }],
    ["recall", "Memory muscle", "Pass 5 recall checks", function () { return Object.keys(S.recalls).filter(function (k) { return S.recalls[k].res !== "blank"; }).length >= 5; }],
    ["ten", "Ten down", "Confirm 10 tasks", function () { return Object.keys(S.done).length >= 10; }],
    ["thirty", "Thirty down", "Confirm 30 tasks", function () { return Object.keys(S.done).length >= 30; }],
    ["park", "Mind like water", "Park 3 thoughts instead of chasing them", function () { return S.parked.length >= 3; }]
  ];
  function checkBadges() {
    var st = streaks(todayISO());
    BADGES.forEach(function (b) {
      if (!S.badges[b[0]] && b[3](st)) { S.badges[b[0]] = todayISO(); save(); toast("Badge unlocked: " + b[1]); }
    });
  }

  /* ---------------------------------------------------------------- views */
  var baseTitle = "Plan · PT2 study list";
  function navBadge() { var t = todayISO(); return inPlan(t) ? studyOf(t).filter(function (x) { return !S.done[x.id]; }).length : 0; }
  function renderNav(route) {
    var items = [["today", "today", "#/today"], ["plan", "plan", "#/plan"], ["recap", "recap", "#/recap"], ["exams", "exams", "#/exams"], ["tools", "tools", "#/tools"]];
    var nav = $("#menu"); nav.textContent = "";
    items.forEach(function (it) {
      var a = h("a", { class: "navlink", href: it[2], "data-route": it[0] }, ico(it[1]), h("span", { class: "nl", text: it[0] }));
      if (route === it[0]) a.setAttribute("aria-current", "page");
      if (it[0] === "today") { var n = navBadge(); if (n) a.appendChild(h("span", { class: "badge", "aria-label": n + " tasks left", text: String(n) })); }
      nav.appendChild(a);
    });
  }
  function subjChip(s) { return h("span", { class: "chip s s-" + s, text: SUBJ[s].name }); }

  function taskRow(t, today, o) {
    o = o || {};
    var st = stOf(t.id), cls = "task s-" + t.s + (st ? (st.status === "done" ? " done" : " partial") : "") + (o.next ? " next" : "");
    var cb = h("button", { type: "button", class: "check", "aria-label": (st ? "Done: " : "Mark done: ") + t.t, "aria-pressed": String(!!st) }, ico("check"));
    var row = h("li", { class: cls, id: "t-" + t.id });
    cb.addEventListener("click", function () { st ? openUndo(t) : openConfirm(t, cb); });
    var meta = h("div", { class: "tmeta" }, subjChip(t.s), t.e ? h("span", { class: "eff", text: t.e === "light" ? "light" : t.e === "heavy" ? "heavy lift" : "steady" }) : null,
      o.late ? h("span", { class: "chip", text: "from " + short(t.date) }) : null, o.next ? h("span", { class: "chip", style: "background:var(--yellow)", text: "up next" }) : null);
    var body = h("div", { class: "tbody" }, meta, h("div", { class: "ttl", text: t.t }), t.d ? h("p", { class: "tdetail", text: t.d }) : null);
    if (st) {
      body.appendChild(h("p", { class: "tstatus", text: (st.status === "done" ? "Done" : "Part-done") + (st.conf ? " · confidence " + st.conf + "/5" : "") + (st.score ? " · scored " + st.score[0] + "/" + st.score[1] : "") + (st.proof ? " · “" + (st.proof.length > 70 ? st.proof.slice(0, 70) + "…" : st.proof) + "”" : "") }));
    } else {
      var acts = h("div", { class: "tactions" });
      if (!o.noStart) acts.appendChild(h("button", { type: "button", class: "btn sm", onclick: function () { openStart(t); } }, ico("play"), "Start"));
      if (o.catchup) {
        acts.appendChild(h("button", { type: "button", class: "btn sm cream", onclick: function () { S.moved[t.id] = today; save(); render(true); toast("Pulled into today."); }, text: "Do it today" }));
        acts.appendChild(h("button", { type: "button", class: "btn sm cream", onclick: function () { openSkip(t); }, text: "Skip" }));
      } else if (o.today && !t.tix && !t.redoOf) {
        acts.appendChild(h("button", { type: "button", class: "btn sm cream", onclick: function () { moveTomorrow(t, today); }, text: "Not today" }));
      }
      body.appendChild(acts);
    }
    row.appendChild(cb); row.appendChild(body);
    return row;
  }
  function recallRow(r, today) {
    var row = h("li", { class: "task s-" + r.s }), cb = h("button", { type: "button", class: "check", "aria-label": "Do recall: " + r.t }, ico("check"));
    cb.addEventListener("click", function () { openRecall(r, cb); });
    row.appendChild(cb);
    row.appendChild(h("div", { class: "tbody" }, h("div", { class: "tmeta" }, subjChip(r.s), h("span", { class: "eff", text: "5 minutes" })), h("div", { class: "ttl", text: r.t }),
      h("p", { class: "tdetail", text: "Close the book. Name three things you remember. Be honest." })));
    return row;
  }

  function ringEl(pct, label) {
    var r = h("div", { class: "ring", role: "img", "aria-label": pct + " percent" }, h("span", { text: label == null ? pct + "%" : label }));
    r.style.setProperty("--p", pct); return r;
  }
  function barEl(pct) { var b = h("div", { class: "bar", role: "img", "aria-label": pct + " percent" }, h("i")); b.firstChild.style.setProperty("--p", pct); b.firstChild.setAttribute("style", "--p:" + pct); return b; }

  function viewDay(date, isToday) {
    var today = todayISO(), screen = h("div", { class: "screen" });
    var dow = parse(date).getDay();
    if (!inPlan(date)) {
      screen.appendChild(h("div", { class: "card empty" }, h("h2", { class: "headline", text: date < P.start ? "The plan starts on " + short(P.start) : "The plan ran till " + short(P.end) }),
        h("p", { class: "lead", text: date < P.start ? "Rest up. Day one is waiting." : "PT2 papers are done. Next up: practicals Nov 30 – Dec 11 and unit test 2.3 on Dec 7–10. Ask Claude for the next block." }),
        h("p", null, h("a", { class: "btn", href: "#/plan", text: "See the plan" }))));
      return screen;
    }
    var study = ordered(studyOf(date), date), side = tasksFor(date).filter(function (t) { return !isStudy(t); });
    var doneW = study.reduce(function (a, t) { return a + weight(t); }, 0), pct = study.length ? Math.round(100 * doneW / study.length) : 0;
    var pending = study.filter(function (t) { return !S.done[t.id]; });
    var nextT = pending[0] || side.filter(function (t) { return !S.done[t.id]; })[0] || null;

    /* hero */
    var title = isToday ? "Today" : DOWL[dow];
    var phrase = isToday ? (pending.length ? "one thing at a time" : study.length ? "all done" : "free day") : "plan for the day";
    var hero = h("section", { class: "hero" },
      h("div", { class: "row between" },
        h("p", { class: "shout", text: short(date) + (isToday ? "" : date === addDays(today, 1) ? " · tomorrow" : date < today ? " · past" : "") }),
        h("div", { class: "row", style: "gap:8px" },
          h("a", { class: "round", href: date > P.start ? "#/day/" + addDays(date, -1) : "#/plan", "aria-label": "Previous day", title: "Previous day" }, ico("left")),
          isToday ? null : h("a", { class: "btn sm cream", href: "#/today", text: "Today" }),
          h("a", { class: "round", href: date < P.end ? "#/day/" + addDays(date, 1) : "#/plan", "aria-label": "Next day", title: "Next day" }, ico("right")))),
      h("h1", { class: "display" }, title + ": ", h("span", { class: "marker", text: phrase })),
      h("p", { class: "lead", text: heroLine(date, study, pending, today) }),
      h("div", { class: "countdowns" }, upcoming(today, 4).map(function (e) { return examChip(e, today); })));
    screen.appendChild(hero);

    /* side column */
    var side1 = h("div", { class: "stack" });
    var prog = h("section", { class: "card tone-lav lav" },
      h("div", { class: "srow" }, ringEl(pct), h("div", { class: "mini" }, h("h2", { class: "shout", text: "Today's progress" }),
        h("span", { text: doneW % 1 ? doneW.toFixed(1) : doneW }), h("span", { class: "hint", text: "of " + study.length + " study tasks" }))));
    var jar = h("div", { class: "jar", "aria-hidden": "true" });
    study.forEach(function (t) { var d = stOf(t.id), i = h("i", { class: d ? "on" : "off" }); if (d) i.style.background = COLORS[t.s]; jar.appendChild(i); });
    prog.appendChild(h("p", { class: "note", style: "margin:12px 0 6px", text: "Your bubble jar" })); prog.appendChild(jar);
    var sk = streaks(today);
    prog.appendChild(h("div", { class: "row", style: "margin-top:12px" }, h("span", { class: "chip", style: "background:var(--yellow)" }, ico("flame"), plural(sk.cur, "day") + " streak"), h("span", { class: "chip", text: "best " + sk.best }),
      h("span", { class: "hint", text: "One missed day is forgiven." })));
    side1.appendChild(prog);

    if (isToday) {
      /* energy */
      var en = S.energy[date] || 0, enRow = h("div", { class: "pills", role: "group", "aria-label": "Energy today" });
      [[1, "Low battery"], [2, "Okay"], [3, "Fired up"]].forEach(function (o) {
        enRow.appendChild(h("button", { type: "button", class: "chip", "aria-pressed": String(en === o[0]), text: o[1], onclick: function () { S.energy[date] = en === o[0] ? 0 : o[0]; save(); render(true); } }));
      });
      side1.appendChild(h("section", { class: "card white tight" }, h("h2", { class: "shout", text: "How's your battery?" }), enRow,
        h("p", { class: "hint", style: "margin-top:8px", text: en === 1 ? "Light tasks first. Momentum beats willpower." : en === 3 ? "Heavy lifts first while the brain is sharp." : "I'll reorder today's list to match." })));
      /* launch pad */
      var lp = S.launch[date] || {};
      var pad_ = h("div", { class: "stack", style: "gap:8px" });
      [["water", "Water within reach"], ["phone", "Phone away or on silent"], ["desk", "Book, pen, paper out"], ["tab", "One tab, one task"]].forEach(function (o) {
        var cb = h("input", { type: "checkbox", id: "lp-" + o[0] }); cb.checked = !!lp[o[0]];
        cb.addEventListener("change", function () { S.launch[date] = S.launch[date] || {}; S.launch[date][o[0]] = cb.checked; save(); beep("soft"); });
        pad_.appendChild(h("label", { class: "opt", for: "lp-" + o[0] }, cb, h("span", { text: o[1] })));
      });
      side1.appendChild(h("section", { class: "card white tight" }, h("h2", { class: "shout", text: "30-second launch pad" }), pad_));
      /* tuition + doubts */
      var tu = (P.tuition[dow] || []);
      if (tu.length) {
        var doubts = S.doubts.filter(function (d) { return !d.done && tu.indexOf(d.s) > -1; });
        side1.appendChild(h("section", { class: "card tone-yellow tight", style: "background:var(--yellow)" }, h("h2", { class: "shout", text: "Tuition today" }),
          h("p", { text: tu.map(function (s) { return SUBJ[s].name; }).join(" + ") }),
          doubts.length ? h("ul", { style: "margin:6px 0 0;padding-left:1.1rem" }, doubts.slice(0, 4).map(function (d) { return h("li", { text: d.text }); })) : h("p", { class: "hint", style: "color:#0a0030", text: "No doubts saved. Park one with \"I'm stuck\" whenever something confuses you." }),
          h("p", null, h("button", { type: "button", class: "link", onclick: function () { openDoubt(tu[0], ""); }, text: "+ add a doubt" }))));
      }
    }

    /* main column */
    var main = h("div", { class: "stack" });
    var actions = h("div", { class: "row" });
    if (isToday) {
      actions.appendChild(h("button", { type: "button", class: "btn", onclick: function () { if (nextT) openStart(nextT); else toast("Nothing left. Enjoy the break."); }, "aria-label": "Start the next task" }, ico("play"), "Start next"));
      actions.appendChild(h("button", { type: "button", class: "chip", "aria-pressed": String(!!S.focusOnly), onclick: function () { S.focusOnly = !S.focusOnly; save(); render(true); }, text: "Just one thing" }));
      actions.appendChild(h("button", { type: "button", class: "chip", onclick: function () { openStuck(nextT); }, text: "I'm stuck" }));
      actions.appendChild(h("button", { type: "button", class: "chip", onclick: openPark, text: "Park a thought" }));
      main.appendChild(actions);
    }

    /* first-visit catch-up decision */
    var od = isToday ? overdue(today) : [];
    if (isToday && S.fresh == null && od.length > 4) {
      main.appendChild(h("section", { class: "card tone orange", style: "background:var(--orange)" }, h("h2", { class: "headline", text: "You have " + od.length + " older tasks waiting." }),
        h("p", { class: "lead", text: "That pile can feel heavy. Two options:" }),
        h("div", { class: "row", style: "margin-top:12px" },
          h("button", { type: "button", class: "btn", text: "Fresh start from today", onclick: function () { od.forEach(function (t) { S.skipped[t.id] = "fresh start"; }); S.fresh = "fresh"; save(); render(true); toast("Parked in Backlog (Recap). Bring any back whenever."); } }),
          h("button", { type: "button", class: "btn cream", text: "Keep a catch-up lane", onclick: function () { S.fresh = "keep"; save(); render(true); } }))));
    }

    if (S.focusOnly && isToday && nextT) {
      main.appendChild(oneThing(nextT, today));
      main.appendChild(h("p", { class: "note", text: pending.length > 1 ? (pending.length - 1) + " more waiting, out of sight. Switch off \"Just one thing\" to see them." : "That's the last one for today." }));
    } else {
      var grp = function (label, items, extra) {
        if (!items.length) return;
        main.appendChild(h("div", { class: "group-h" }, h("h2", { class: "shout", text: label }), extra || null));
        main.appendChild(h("ul", { class: "tasks" }, items));
      };
      var nid = pending[0] && isToday ? pending[0].id : null;
      if (!study.length) main.appendChild(h("div", { class: "card white empty" }, h("h2", { class: "headline", text: "No study tasks this day" }), h("p", { class: "lead", text: "Rest, or pull something forward from the Plan tab." })));
      grp("Study", study.map(function (t) { return taskRow(t, today, { next: t.id === nid, today: isToday }); }),
        h("span", { class: "hint", text: pending.length + " left" }));
      if (isToday) {
        var rc = recallsFor(today);
        grp("Quick recalls", rc.map(function (r) { return recallRow(r, today); }), h("span", { class: "hint", text: "5 min each, from what you've done" }));
        var cu = od.filter(function (t) { return !S.moved[t.id]; }).slice(0, 3);
        if (cu.length) grp("Catch-up lane", cu.map(function (t) { return taskRow(t, today, { catchup: true, late: true }); }),
          h("span", { class: "hint", text: "showing 3 of " + od.length + ". Two a day is plenty." }));
      }
      grp("Side quests", side.map(function (t) { return taskRow(t, today, { today: isToday && !t.tix }); }), h("span", { class: "hint", text: "don't count toward study progress" }));
    }

    /* wrap-up */
    if (isToday && study.length && !pending.length) main.appendChild(wrapUp(date, today));
    if (isToday && dow === 0) main.appendChild(reflectCard(monday(date)));
    screen.appendChild(h("div", { class: "cols" }, main, side1));
    return screen;
  }
  function heroLine(date, study, pending, today) {
    var d = diffDays(today, date), ut = upcoming(date, 1)[0];
    if (date < today) return "A look back. Tap a tick to review what you wrote.";
    if (!study.length) return "No study tasks. Hack Club and rest are valid plans.";
    if (!pending.length) return "Every study task for this day is done. That's how you build trust in yourself.";
    var nx = pending[0];
    return (d === 0 ? "Start with " : "First up: ") + SUBJ[nx.s].name + ": " + nx.t + ". " + plural(pending.length, "study task") + " left" + (ut ? ", next test " + whenText(ut, date) + "." : ".");
  }
  function oneThing(t, today) {
    var steps = h("ol", { class: "steps" }, t.st.map(function (x) { return h("li", { text: x }); }));
    var st = stOf(t.id);
    return h("section", { class: "card onething s-" + t.s, style: "background:var(--c-" + t.s + ");color:#0a0030" },
      h("div", { class: "row" }, h("span", { class: "chip", text: SUBJ[t.s].name }), h("span", { class: "eff", text: t.e })),
      h("h2", { class: "ttl", text: t.t }), h("p", { class: "lead", text: t.d }), steps,
      h("div", { class: "row" },
        st ? null : h("button", { type: "button", class: "btn", style: "background:#fff", onclick: function () { openStart(t); } }, ico("play"), "Start"),
        h("button", { type: "button", class: "btn cream", onclick: function () { openConfirm(t); }, text: "I did it" })));
  }
  function wrapUp(date, today) {
    var tom = addDays(date, 1), tt = inPlan(tom) ? studyOf(tom)[0] : null;
    var weak = weakTasks();
    var kids = [h("h2", { class: "headline", text: "Day done." }), h("p", { class: "lead", text: pick(["You did what you said you would. That's the whole game.", "Closed the loop. Go rest, properly.", "All honest ticks. Be proud of that."]) })];
    if (tt) kids.push(h("p", { text: "Tomorrow starts with " + SUBJ[tt.s].name + ": " + tt.t + ". Open the book to that page before bed so it's easy to begin." }));
    if (weak.length) kids.push(h("p", null, h("a", { class: "btn sm", href: "#/recap", text: weak.length + " chapter" + (weak.length === 1 ? "" : "s") + " flagged for a second pass" })));
    return h("section", { class: "card tone-lime", style: "background:var(--lime);color:#0a0030" }, kids);
  }
  function reflectCard(wk) {
    var r = S.reflect[wk] || {}, a = h("textarea", { rows: 2, "aria-label": "What worked this week" }), b = h("textarea", { rows: 2, "aria-label": "One thing to change" });
    a.value = r.a || ""; b.value = r.b || "";
    function sv() { S.reflect[wk] = { a: a.value, b: b.value }; save(); }
    a.addEventListener("change", sv); b.addEventListener("change", sv);
    return h("section", { class: "card white" }, h("h2", { class: "shout", text: "Sunday reflection" }),
      h("div", { class: "stack" }, h("label", null, h("span", { class: "hint", text: "What worked this week?" }), a), h("label", null, h("span", { class: "hint", text: "One thing to change next week?" }), b)));
  }

  /* ---- plan ---- */
  function viewPlan() {
    var today = todayISO(), screen = h("div", { class: "screen" }), weeks = {}, order = [];
    P.days.forEach(function (d) { var w = monday(d.date); if (!weeks[w]) { weeks[w] = []; order.push(w); } weeks[w].push(d.date); });
    screen.appendChild(h("section", { class: "hero" }, h("p", { class: "shout", text: short(P.start) + " → " + short(P.end) }),
      h("h1", { class: "display" }, "The ", h("span", { class: "marker", text: "whole plan" }), ", chapter by chapter"),
      h("p", { class: "lead", text: "One subject, one chapter at a time. Tap a day to open it." })));
    var wrap = h("div", { class: "weeks" });
    order.forEach(function (w, wi) {
      var days = weeks[w], total = 0, done = 0;
      days.forEach(function (d) { studyOf(d).forEach(function (t) { total++; done += weight(t); }); });
      var grid = h("div", { class: "daygrid" });
      days.forEach(function (d) {
        var ts = tasksFor(d).filter(isStudy), pastD = d < today, ex = P.exams.filter(function (e) { return e.a && d >= e.a && d <= e.b && e.s !== "all"; });
        var ul = h("ul");
        ts.forEach(function (t) { ul.appendChild(h("li", { class: "s-" + t.s + (S.done[t.id] ? " is-done" : "") }, h("i"), h("span", { text: SUBJ[t.s].short + ": " + t.t }))); });
        if (!ts.length) ul.appendChild(h("li", { text: "Rest / Hack Club" }));
        var fr = dayFraction(d);
        var c = h("a", { class: "daycard" + (d === today ? " today" : "") + (pastD ? " past" : ""), href: "#/day/" + d },
          h("h3", null, h("span", { text: short(d) }), h("span", { class: "hint", text: fr == null ? "" : Math.round(fr * 100) + "%" })), ul);
        ex.slice(0, 3).forEach(function (e) { c.appendChild(h("span", { class: "examflag", text: SUBJ[e.s].short + " " + e.n.replace("Unit test", "UT") + (d === e.a ? " starts" : "") })); });
        if (d >= "2026-11-16" && d <= "2026-11-27") c.appendChild(h("span", { class: "examflag", text: "PT2 window" }));
        grid.appendChild(c);
      });
      wrap.appendChild(h("section", null, h("div", { class: "week-h" }, h("h2", { class: "headline", text: "Week of " + dm(w) }),
        h("span", { class: "note", text: total ? Math.round(100 * done / total) + "% done" : "" })), grid));
    });
    screen.appendChild(wrap);
    return screen;
  }

  /* ---- recap ---- */
  function viewRecap() {
    var today = todayISO(), screen = h("div", { class: "screen" }), upto = today > P.end ? P.end : today;
    var sk = streaks(today);
    var totalDue = 0, totalDone = 0, confs = [];
    BASE.forEach(function (t) { if (isStudy(t) && eff(t) <= upto) { totalDue++; totalDone += weight(t); } var d = stOf(t.id); if (d && d.conf) confs.push(d.conf); });
    var overall = totalDue ? Math.round(100 * totalDone / totalDue) : 0, avg = confs.length ? (confs.reduce(function (a, b) { return a + b; }, 0) / confs.length) : null;
    screen.appendChild(h("section", { class: "hero" }, h("p", { class: "shout", text: "How it's going" }),
      h("h1", { class: "display" }, "Your ", h("span", { class: "marker", text: "recap" })),
      h("p", { class: "lead", text: recapLine(overall, sk, totalDue) })));
    var top = h("div", { class: "cols even" });
    top.appendChild(h("section", { class: "card lav" }, h("div", { class: "srow" }, ringEl(overall), h("div", { class: "mini" }, h("h2", { class: "shout", text: "Plan so far" }),
      h("span", { text: totalDone % 1 ? totalDone.toFixed(1) : totalDone }), h("span", { class: "hint", text: "of " + totalDue + " tasks due" }),
      avg ? h("span", { class: "hint", text: "average confidence " + avg.toFixed(1) + "/5" }) : null))));
    top.appendChild(h("section", { class: "card white" }, h("div", { class: "row" }, h("span", { class: "stat", text: String(sk.cur) }), h("div", null, h("h2", { class: "shout", text: "day streak" }), h("p", { class: "hint", text: "best " + sk.best + " · one missed day is forgiven" }))),
      h("p", { class: "note", style: "margin-top:8px", text: Object.keys(S.done).length + " tasks confirmed · " + Object.keys(S.recalls).length + " recalls · " + S.parked.length + " thoughts parked" })));
    screen.appendChild(top);

    /* heatmap */
    var heat = h("div", { class: "heat" }), first = parse(P.start), offset = (first.getDay() + 6) % 7;
    ["M", "T", "W", "T", "F", "S", "S"].forEach(function (l) { heat.appendChild(h("span", { class: "hd", text: l })); });
    for (var i = 0; i < offset; i++) heat.appendChild(h("span"));
    P.days.forEach(function (d) {
      var f = dayFraction(d.date), lv = f == null ? "none" : f >= .9 ? "lv3" : f >= .5 ? "lv2" : f > 0 ? "lv1" : (d.date > today ? "none" : "");
      heat.appendChild(h("a", { class: "cell " + lv + (d.date === today ? " tod" : ""), href: "#/day/" + d.date, "aria-label": short(d.date) + (f == null ? "" : ", " + Math.round(f * 100) + "% done"), text: String(parse(d.date).getDate()) }));
    });
    screen.appendChild(h("section", { class: "block" }, h("h2", { class: "headline", text: "Day by day" }), h("div", { style: "height:12px" }), h("div", { class: "card white tight" }, heat)));

    /* subjects */
    var subs = h("div", { class: "cols even" });
    STUDY_SUBJ.forEach(function (s) {
      var st = subjectStats(s, upto), ne = upcoming(today, 20).filter(function (e) { return e.s === s && e.a; })[0];
      var card = h("section", { class: "card white s-" + s }, h("div", { class: "srow" }, ringEl(st.pct), h("div", { class: "mini" }, h("h2", { class: "shout", text: SUBJ[s].name }),
        h("span", { text: st.completed + " of " + st.total + " chapters ticked" }),
        h("span", { class: "hint", text: st.avg ? "confidence " + st.avg.toFixed(1) + "/5" : "no check-ins yet" }),
        ne ? h("span", { class: "hint", text: "next: " + ne.n + " " + whenText(ne, today) }) : null)));
      if (st.strong.length) card.appendChild(h("p", { class: "note", style: "margin-top:12px", text: "Strong: " + st.strong.slice(0, 3).map(function (t) { return t.t; }).join("; ") + (st.strong.length > 3 ? " +" + (st.strong.length - 3) : "") }));
      if (st.weak.length) {
        card.appendChild(h("p", { class: "shout", style: "font-size:.95rem;margin-top:12px", text: "Needs another pass" }));
        card.appendChild(h("ul", { class: "stack", style: "list-style:none;margin:6px 0 0;padding:0;gap:8px" }, st.weak.map(function (t) {
          var queued = !!(S.redo[t.id] && S.redo[t.id] >= today);
          return h("li", { class: "row between" }, h("span", { class: "mini", text: t.t }), queued ? h("span", { class: "chip", text: "queued " + short(S.redo[t.id]) }) :
            h("button", { type: "button", class: "btn sm", text: "Add to today", onclick: function () { var d = today < P.start ? P.start : today > P.end ? P.end : today; S.redo[t.id] = d; save(); toast("Queued for " + short(d) + "."); render(true); } }));
        })));
      } else if (st.completed) card.appendChild(h("p", { class: "hint", style: "margin-top:12px", text: "Nothing flagged. Keep it that way." }));
      subs.appendChild(card);
    });
    screen.appendChild(h("section", { class: "block" }, h("h2", { class: "headline", text: "Subject recaps" }), h("div", { style: "height:12px" }), subs));

    /* test scores */
    var tests = Object.keys(S.done).filter(function (id) { return BYID[id] && BYID[id].k === "test"; }).map(function (id) { return [BYID[id], S.done[id]]; });
    if (tests.length) screen.appendChild(h("section", { class: "block" }, h("h2", { class: "headline", text: "Mini-tests" }), h("div", { style: "height:12px" }),
      h("div", { class: "card white tight" }, tests.map(function (x) { return h("div", { class: "exam-row" }, subjChip(x[0].s), h("span", { text: x[0].t.replace("Mini-test: ", "") }), h("b", { text: x[1].score ? x[1].score[0] + "/" + x[1].score[1] : "taken" })); }))));

    /* backlog */
    var back = BASE.filter(function (t) { return S.skipped[t.id]; });
    if (back.length) {
      var bl = h("ul", { class: "stack", style: "list-style:none;margin:0;padding:0;gap:8px" }, back.map(function (t) {
        return h("li", { class: "row between" }, h("span", null, subjChip(t.s), " ", t.t, h("span", { class: "hint", text: " · " + short(t.date) + " · " + S.skipped[t.id] })),
          h("button", { type: "button", class: "btn sm cream", text: "Bring back", onclick: function () { delete S.skipped[t.id]; save(); render(true); } }));
      }));
      screen.appendChild(h("section", { class: "block" }, h("h2", { class: "headline", text: "Backlog (" + back.length + ")" }), h("div", { style: "height:12px" }), h("div", { class: "card white tight" }, bl)));
    }

    /* badges */
    var bd = h("div", { class: "badges" });
    BADGES.forEach(function (b) {
      var got = S.badges[b[0]];
      bd.appendChild(h("div", { class: "bdg" + (got ? "" : " locked") }, h("div", { class: "medal" }, ico("star")), h("b", { text: b[1] }), h("span", { text: got ? "earned " + dm(got) : b[2] })));
    });
    screen.appendChild(h("section", { class: "block" }, h("h2", { class: "headline", text: "Badges" }), h("div", { style: "height:12px" }), bd));
    return screen;
  }
  function recapLine(overall, sk, due) {
    if (!due) return "Nothing due yet. Day one is " + short(P.start) + ".";
    if (!Object.keys(S.done).length) return "No check-ins yet. Do one small task honestly and this page starts to fill up.";
    if (overall >= 80) return "Strong. You're ahead of the plan, keep the second passes going.";
    if (overall >= 50) return "Solid middle. Pick one subject to catch up and one weak chapter to fix.";
    return "Behind, but recoverable. Two honest tasks a day beats a perfect plan you drop.";
  }

  /* ---- exams ---- */
  function viewExams() {
    var today = todayISO(), screen = h("div", { class: "screen" }), pt2 = P.exams.filter(function (e) { return e.id === "pt2"; })[0];
    var d2 = diffDays(today, pt2.a);
    screen.appendChild(h("section", { class: "hero" }, h("p", { class: "shout", text: "PT2: " + range(pt2.a, pt2.b) }),
      h("h1", { class: "display" }, d2 > 0 ? [h("span", { class: "marker", text: plural(d2, "day") }), " to PT2"] : d2 >= -11 ? [h("span", { class: "marker", text: "PT2" }), " is on now"] : [h("span", { class: "marker", text: "PT2" }), " is done"]),
      h("p", { class: "lead", text: "Full syllabus, 70–80 marks per paper. The datesheet isn't out yet. Add each paper's date below when it is." })));

    var ed = h("section", { class: "card white" }, h("h2", { class: "shout", text: "PT2 datesheet" }), h("p", { class: "hint", text: "Add dates as you get them. The day before each paper turns into a \"Last look\" task." }));
    var grid = h("div", { class: "stack", style: "margin-top:12px" });
    STUDY_SUBJ.forEach(function (s) {
      var inp = h("input", { type: "date", min: pt2.a, max: pt2.b, id: "ed-" + s, "aria-label": SUBJ[s].name + " PT2 date" }); inp.value = S.examDates[s] || "";
      inp.addEventListener("change", function () { if (inp.value && (inp.value < pt2.a || inp.value > pt2.b)) { toast("PT2 runs " + range(pt2.a, pt2.b) + "."); inp.value = S.examDates[s] || ""; return; } if (inp.value) S.examDates[s] = inp.value; else delete S.examDates[s]; save(); render(true); });
      grid.appendChild(h("label", { class: "row between", for: "ed-" + s }, subjChip(s), inp));
    });
    ed.appendChild(grid);
    var cols = h("div", { class: "cols even" }, ed);

    var tl = h("section", { class: "card" }, h("h2", { class: "shout", text: "Coming up" }));
    examList(today).filter(function (e) { return !e.a || e.b >= today; }).sort(function (x, y) { return (x.a || "9") < (y.a || "9") ? -1 : 1; }).forEach(function (e) {
      tl.appendChild(h("div", { class: "exam-row" }, e.s === "all" ? h("span", { class: "chip", text: "all" }) : subjChip(e.s),
        h("div", { class: "mini" }, h("b", { text: e.n }), h("span", { class: "hint", text: (e.a ? range(e.a, e.b) : e.tbc + " (date tbc)") + " · " + e.topics })),
        h("div", { class: "days-left" }, e.a ? (today >= e.a && today <= e.b ? "now" : String(diffDays(today, e.a))) : "?", h("small", { text: e.a && !(today >= e.a && today <= e.b) ? "days" : "" }))));
    });
    cols.appendChild(tl); screen.appendChild(cols);

    var rd = h("div", { class: "cols even" });
    STUDY_SUBJ.forEach(function (s) {
      var ne = upcoming(today, 30).filter(function (e) { return e.s === s && e.a; })[0] || { n: "PT2", a: pt2.a };
      var r = readiness(s, ne.a);
      rd.appendChild(h("section", { class: "card white tight" }, h("div", { class: "row between" }, subjChip(s), h("b", { text: ne.n + " · " + dm(ne.a) })), h("div", { style: "height:10px" }), barEl(r.pct),
        h("p", { class: "hint", style: "margin-top:8px", text: r.total ? r.left + " of " + r.total + " scheduled chapters not yet ticked before then" : "Nothing scheduled before this one." })));
    });
    screen.appendChild(h("section", { class: "block" }, h("h2", { class: "headline", text: "Am I ready?" }), h("p", { class: "note", text: "Share of scheduled chapters ticked before each subject's next test." }), h("div", { style: "height:12px" }), rd));
    return screen;
  }

  /* ---- tools ---- */
  function viewTools() {
    var screen = h("div", { class: "screen" });
    screen.appendChild(h("section", { class: "hero" }, h("p", { class: "shout", text: "ADHD toolbox" }), h("h1", { class: "display" }, "Tools that ", h("span", { class: "marker", text: "get you moving" })),
      h("p", { class: "lead", text: "Everything here is built around starting small, getting thoughts out of your head and making progress visible." })));
    var timer = h("section", { class: "card" }, h("h2", { class: "shout", text: "Focus timer" }), h("p", { class: "note", text: "Not tied to a task. Quick rounds with breaks." }),
      h("div", { class: "pills", style: "margin-top:10px" }, [[2, "2 min start"], [10, "10 min"], [25, "25 min"], [40, "40 min"], [5, "5 min break"]].map(function (o) {
        return h("button", { type: "button", class: "btn sm cream", text: o[1], onclick: function () { startTimer(o[0], null, o[0] === 5 ? "break" : "work"); } });
      })));
    var parkS = h("section", { class: "card white" }, h("h2", { class: "shout", text: "Parking lot (" + S.parked.length + ")" }),
      S.parked.length ? h("ul", { style: "margin:8px 0;padding-left:1.1rem" }, S.parked.slice(0, 6).map(function (p) { return h("li", { text: p.text }); })) : h("p", { class: "hint", text: "Empty. Park distractions here mid-task." }),
      h("button", { type: "button", class: "btn sm", onclick: openPark, text: "Open parking lot" }));
    var dl = h("ul", { class: "stack", style: "list-style:none;margin:8px 0;padding:0;gap:8px" });
    if (!S.doubts.length) dl.appendChild(h("li", { class: "hint", text: "No doubts saved. Anything you don't get goes here for tuition." }));
    S.doubts.forEach(function (d) {
      var cb = h("input", { type: "checkbox", id: "db-" + d.id, "aria-label": "Resolved: " + d.text }); cb.checked = d.done;
      cb.addEventListener("change", function () { d.done = cb.checked; save(); render(true); });
      dl.appendChild(h("li", { class: "row between" }, h("label", { class: "row", for: "db-" + d.id, style: "gap:8px" }, cb, subjChip(d.s), h("span", { text: d.text, style: d.done ? "text-decoration:line-through;opacity:.6" : "" })),
        h("button", { type: "button", class: "chip", "aria-label": "Delete doubt", text: "x", onclick: function () { S.doubts = S.doubts.filter(function (x) { return x !== d; }); save(); render(true); } })));
    });
    var doubts = h("section", { class: "card white" }, h("h2", { class: "shout", text: "Doubts for tuition" }), dl, h("button", { type: "button", class: "btn sm", onclick: function () { openDoubt("maths", ""); }, text: "Add a doubt" }));
    var how = h("section", { class: "card lav" }, h("h2", { class: "shout", text: "How this planner keeps you honest" }),
      h("ul", { style: "margin:8px 0 0;padding-left:1.1rem;display:grid;gap:6px" },
        ["Ticking a task opens a check-in: tick what you really did, rate your confidence, write one line of proof.", "Part-done counts as half and queues a second pass. Shaky chapters (confidence 1–2) do too.",
          "Recalls pop up 2 and 6 days after you finish a chapter. Five minutes, no notes. That's how it sticks.", "Streaks forgive one missed day. Two in a row resets, so you always have a way back in.",
          "Low battery? Say so and the list reorders to light tasks first."].map(function (x) { return h("li", { text: x }); })));
    var keys = h("section", { class: "card white tight" }, h("h2", { class: "shout", text: "Shortcuts" }), h("p", { class: "note", text: "n: start next task · p: park a thought · f: just-one-thing · s: I'm stuck · g then t/p/r/e: go to today, plan, recap, exams" }));
    var notif = h("button", { type: "button", class: "btn sm cream", text: "Let the timer ping me in the background", onclick: function () {
      if (!window.Notification) { toast("This browser can't do notifications."); return; }
      Notification.requestPermission().then(function (p) { toast(p === "granted" ? "Timer pings are on." : "Okay, no pings."); });
    } });
    var imp = h("input", { type: "file", accept: "application/json", class: "sr-only", id: "imp" });
    imp.addEventListener("change", function () {
      var f = imp.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { try { var o = JSON.parse(rd.result); if (!o || typeof o !== "object" || !o.done) throw 0; S = Object.assign(DEF(), o); save(); applySettings(); renderTools(); renderTimer(); render(true); toast("Backup restored."); } catch (e) { toast("That file doesn't look like a Plan backup."); } };
      rd.readAsText(f);
    });
    var data = h("section", { class: "card white" }, h("h2", { class: "shout", text: "Your data" }),
      h("p", { class: "note", text: memOnly ? "Your browser is blocking storage, so progress will vanish on reload. Back it up often." : "Saved only in this browser. Back it up to move devices." }),
      h("div", { class: "pills", style: "margin-top:10px" },
        h("button", { type: "button", class: "btn sm", text: "Back up", onclick: function () {
          var blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" }), a = h("a", { href: URL.createObjectURL(blob), download: "plan-backup-" + todayISO() + ".json" });
          document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        } }),
        h("label", { class: "btn sm cream", for: "imp", text: "Restore" }), imp, notif,
        h("button", { type: "button", class: "btn sm orange", text: "Reset everything", onclick: function () {
          openDlg(dialog("Reset everything?", [h("p", { text: "This deletes all ticks, notes, doubts and badges in this browser. It can't be undone (back up first if unsure)." }),
            h("div", { class: "row" }, h("button", { type: "button", class: "btn orange", text: "Yes, delete it all", onclick: function () { S = DEF(); save(); closeDlg(); applySettings(); renderTools(); renderTimer(); render(true); toast("Fresh slate."); } }), closeBtn("Cancel"))]));
        } })));
    screen.appendChild(h("div", { class: "cols even" }, h("div", { class: "stack" }, timer, parkS, doubts), h("div", { class: "stack" }, how, keys, data)));
    return screen;
  }

  /* ---------------------------------------------------------------- router */
  var cur = { name: "today", arg: null };
  function parseHash() {
    var p = (location.hash || "#/today").replace(/^#\/?/, "").split("/");
    var name = p[0] || "today";
    if (name === "day" && /^\d{4}-\d{2}-\d{2}$/.test(p[1] || "")) return { name: "day", arg: p[1] };
    if (["today", "plan", "recap", "exams", "tools"].indexOf(name) === -1) return { name: "today", arg: null };
    return { name: name, arg: null };
  }
  function render(keep) {
    var r = parseHash(), main = $("#main"), y = window.scrollY, today = todayISO(), view, nav = r.name;
    if (r.name === "today") view = viewDay(today, true);
    else if (r.name === "day") { view = viewDay(r.arg, r.arg === today); nav = r.arg === today ? "today" : "plan"; }
    else if (r.name === "plan") view = viewPlan();
    else if (r.name === "recap") view = viewRecap();
    else if (r.name === "exams") view = viewExams();
    else view = viewTools();
    main.textContent = ""; main.appendChild(view);
    if (keep) { var s = view; s.style.animation = "none"; window.scrollTo(0, y); }
    renderNav(nav);
    baseTitle = { today: "Today", plan: "Plan", recap: "Recap", exams: "Exams", tools: "Tools", day: "Day" }[r.name] + " · PT2 study list";
    if (!S.timer) document.title = baseTitle;
    cur = r;
  }
  window.addEventListener("hashchange", function () { render(false); window.scrollTo(0, 0); var m = $("#main"); m.focus({ preventScroll: true }); });
  var menu = $("#menu");
  window.addEventListener("scroll", function () { menu.classList.toggle("stuck", window.scrollY > 40); }, { passive: true });

  /* keyboard shortcuts */
  var gPending = false;
  document.addEventListener("keydown", function (e) {
    var t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT");
    if (typing || dlg.open || e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key.toLowerCase(), today = todayISO();
    if (gPending) { gPending = false; var m = { t: "today", p: "plan", r: "recap", e: "exams" }[k]; if (m) location.hash = "#/" + m; return; }
    if (k === "g") { gPending = true; setTimeout(function () { gPending = false; }, 900); }
    else if (k === "p") { e.preventDefault(); openPark(); }
    else if (k === "f") { S.focusOnly = !S.focusOnly; save(); render(true); }
    else if (k === "s") { openStuck(null); }
    else if (k === "n") {
      var nx = ordered(studyOf(today), today).filter(function (x) { return !S.done[x.id]; })[0];
      if (nx) openStart(nx);
    }
  });
  window.addEventListener("storage", function (e) { if (e.key === KEY) { load(); applySettings(); renderTools(); renderTimer(); render(true); } });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { if (S.timer && S.timer.end <= Date.now()) renderTimer(); render(true); } });

  /* floating "park a thought" button */
  $("#float").appendChild(h("button", { type: "button", class: "round floatbtn", "aria-label": "Park a thought", title: "Park a thought (p)", onclick: openPark }, ico("pencil")));

  /* boot */
  applySettings(); renderTools(); render(false); renderTimer(); checkBadges();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(function () { /* offline support is optional */ });
  }
})();
