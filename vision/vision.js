/* Vision: the atlas. State is kept in localStorage on this device only. */
(() => {
"use strict";
const A = window.ATLAS, goals = A.goals;
const TOTAL = goals.reduce((n, g) => n + g.steps.length, 0);
const KEY = "vision.v1";
const NS = "http://www.w3.org/2000/svg";
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function sv(tag, attrs = {}, kids = []) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  kids.forEach(c => e.append(c));
  return e;
}

/* ---------- state ---------- */
const fresh = () => ({ done: {}, sats: {}, targets: {}, dates: {}, log: {}, letter: null });
let S = load();
function load() {
  try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); }
  catch (e) { return fresh(); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode: still works for this visit */ } }
const isDone = (g, i) => !!(S.done[g.id] && S.done[g.id][i]);
const lit = g => g.steps.reduce((n, _, i) => n + (isDone(g, i) ? 1 : 0), 0);
const allLit = () => goals.reduce((n, g) => n + lit(g), 0);
const satsOf = g => (S.sats[g.id] = S.sats[g.id] || []);
const complete = g => lit(g) === g.steps.length;

/* ---------- geometry helpers ---------- */
function starPath(r) {
  const k = r * 0.2;
  return `M0 ${-r}L${k} ${-k}L${r} 0L${k} ${k}L0 ${r}L${-k} ${k}L${-r} 0L${-k} ${-k}Z`;
}
function flarePath(r) { const a = r * 0.62; return `M${-a} ${-a}L${a} ${a}M${a} ${-a}L${-a} ${a}`; }
const MAG = [4.2, 3.2, 3.6, 3, 4, 3.2, 3];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/* a constellation: lines first, then stars. scale enlarges stars for the small hero view */
function drawCon(g, k = 1) {
  const gr = sv("g", { class: "gcon" });
  g.edges.forEach(([a, b], n) => {
    const A1 = g.stars[a], B1 = g.stars[b];
    const ln = sv("line", { class: "ln", x1: A1[0], y1: A1[1], x2: B1[0], y2: B1[1], "data-a": a, "data-b": b });
    ln.style.setProperty("--len", dist(A1, B1).toFixed(1));
    gr.append(ln);
  });
  g.stars.forEach((p, i) => {
    const r = MAG[i] * k;
    const t = sv("g", { transform: `translate(${p[0]} ${p[1]})`, "data-i": i });
    t.append(sv("path", { class: "st", d: starPath(r) }), sv("path", { class: "flare", d: flarePath(r * 1.5) }));
    gr.append(t);
  });
  return gr;
}
function paintCon(root, g) {
  $$(".ln", root).forEach(l => l.classList.toggle("on", isDone(g, +l.dataset.a) && isDone(g, +l.dataset.b)));
  $$("g[data-i]", root).forEach(t => $(".st", t).classList.toggle("on", isDone(g, +t.dataset.i)));
}

/* ---------- hero: the planisphere ---------- */
const LAYOUT = {
  calamus: { cx: 305, cy: 672, lx: 385, ly: 790 },
  acer:    { cx: 585, cy: 735, lx: 585, ly: 855 },
  corona:  { cx: 750, cy: 545, lx: 745, ly: 665 },
  nodus:   { cx: 425, cy: 428, lx: 425, ly: 548 },
  arbor:   { cx: 545, cy: 190, lx: 545, ly: 308 }
};
const CON_SCALE = 1.8;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const polar = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [500 + r * Math.cos(a), 500 + r * Math.sin(a)]; };
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MSTART = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

function todayDeg() {
  const now = new Date(), doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5) - 1;
  return doy / 365 * 360;
}
function buildHero() {
  const host = $("#hero-plate");
  const svg = sv("svg", { viewBox: "0 0 1000 1000", role: "group", "aria-label": "A planisphere holding five constellations, one for each ambition" });
  svg.classList.add("intro");
  svg.append(sv("circle", { class: "plate-disc", cx: 500, cy: 500, r: 496 }));

  const rings = sv("g");
  rings.append(
    sv("circle", { class: "ring outer", cx: 500, cy: 500, r: 494, "stroke-width": 2 }),
    sv("circle", { class: "ring outer", cx: 500, cy: 500, r: 486, "stroke-width": 1 }),
    sv("circle", { class: "ring", cx: 500, cy: 500, r: 468, "stroke-width": 1 }),
    sv("circle", { class: "ring", cx: 500, cy: 500, r: 424, "stroke-width": 1.5 }),
    sv("circle", { class: "ring soft", cx: 500, cy: 500, r: 300, "stroke-width": 1, "stroke-dasharray": "2 7" }),
    sv("circle", { class: "ring soft", cx: 500, cy: 500, r: 170, "stroke-width": 1, "stroke-dasharray": "2 7" }),
    sv("ellipse", { class: "ring soft", cx: 500, cy: 500, rx: 410, ry: 130, transform: "rotate(-23.4 500 500)", "stroke-width": 1 }),
    sv("path", { class: "ring soft", d: "M500 90V910M90 500H910", "stroke-width": 1, "stroke-dasharray": "2 9" })
  );
  svg.append(rings);

  /* degree ticks */
  let minor = "", major = "";
  for (let d = 0; d < 360; d++) {
    const len = d % 30 === 0 ? 18 : d % 10 === 0 ? 13 : d % 5 === 0 ? 9 : 5;
    const [x1, y1] = polar(484, d), [x2, y2] = polar(484 - len, d);
    const seg = `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
    if (d % 10 === 0) major += seg; else minor += seg;
  }
  svg.append(sv("path", { class: "tick", d: minor, "stroke-width": 0.8, opacity: 0.7 }), sv("path", { class: "tick", d: major, "stroke-width": 1.3 }));

  /* month band */
  let div = "";
  MSTART.slice(0, 12).forEach((s, m) => {
    const deg = s / 365 * 360;
    const [x1, y1] = polar(424, deg), [x2, y2] = polar(466, deg);
    div += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
    const mid = (s + MSTART[m + 1]) / 2 / 365 * 360;
    const flip = mid > 90 && mid < 270;
    const t = sv("text", { class: "mname", transform: `rotate(${mid.toFixed(2)} 500 500) translate(500 ${500 - 445})${flip ? " rotate(180)" : ""}` });
    t.textContent = MONTHS[m];
    svg.append(t);
  });
  svg.append(sv("path", { class: "tick", d: div, "stroke-width": 1 }));

  /* fixed stars */
  const rnd = rng(1927), dots = sv("g");
  for (let i = 0; i < 170; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 410;
    dots.append(sv("circle", { class: "bgstar", cx: (500 + r * Math.cos(a)).toFixed(1), cy: (500 + r * Math.sin(a)).toFixed(1), r: (0.7 + rnd() * 1.5).toFixed(2), opacity: (0.25 + rnd() * 0.5).toFixed(2) }));
  }
  svg.append(dots);

  /* today on the date ring */
  const tdeg = todayDeg();
  const today = sv("g", { class: "today" });
  const [bx1, by1] = polar(492, tdeg - 2.3), [bx2, by2] = polar(492, tdeg + 2.3), [ax, ay] = polar(467, tdeg);
  today.append(
    sv("path", { d: `M${ax} ${ay}L${bx1} ${by1}L${bx2} ${by2}Z` }),
    sv("title")
  );
  $("title", today).textContent = "Today";
  svg.append(today);

  /* constellations */
  const wrap = sv("g");
  goals.forEach((g, gi) => {
    const L = LAYOUT[g.id];
    const con = sv("g", { class: "con", tabindex: 0, role: "link", "data-id": g.id });
    con.style.setProperty("--i", gi);
    con.append(sv("circle", { class: "hit", cx: L.cx, cy: L.cy, r: 118 }), sv("circle", { class: "ring-focus", cx: L.cx, cy: L.cy, r: 112 }));
    const fig = sv("g", { transform: `translate(${L.cx - 50 * CON_SCALE} ${L.cy - 50 * CON_SCALE}) scale(${CON_SCALE})` });
    fig.append(drawCon(g, 1.55));
    const lab = sv("text", { class: "lab", x: L.lx, y: L.ly }); lab.textContent = g.name;
    const sub = sv("text", { class: "sub", x: L.lx, y: L.ly + 34 });
    con.append(fig, lab, sub);
    con.addEventListener("click", () => goPlate(g.id));
    con.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goPlate(g.id); } });
    wrap.append(con);
  });
  svg.append(wrap);
  host.append(svg);
  return { svg };
}
let hero;
function goPlate(id) {
  const el = $("#plate-" + id);
  if (el) el.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
}
function paintHero() {
  goals.forEach(g => {
    const con = $(`.con[data-id="${g.id}"]`, hero.svg);
    paintCon(con, g);
    con.classList.toggle("done", complete(g));
    $(".sub", con).textContent = `${g.short} · ${lit(g)} of ${g.steps.length}`;
    con.setAttribute("aria-label", `${g.name}, ${g.epithet}: ${lit(g)} of ${g.steps.length} stars lit. Jump to this plate.`);
  });
}

/* ---------- plates ---------- */
const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });
function stepRow(id, text, checked, own, idx) {
  const rm = own ? `<button class="rm" type="button" data-rm="${idx}" aria-label="Remove this star"><svg viewBox="0 0 16 16"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg></button>` : "";
  return `<li><label class="step${own ? " own" : ""}" data-i="${idx}">
    <input type="checkbox" id="${id}" ${checked ? "checked" : ""}>
    <span class="row"><svg viewBox="-12 -12 24 24" aria-hidden="true"><path class="sp" d="${starPath(10)}"/></svg><span class="txt">${esc(text)}</span></span>${rm}
  </label></li>`;
}
function buildPlates() {
  const host = $("#plates");
  goals.forEach(g => {
    const sec = document.createElement("section");
    sec.className = "plate p-" + g.id; sec.id = "plate-" + g.id; sec.dataset.goal = g.id;
    sec.setAttribute("aria-labelledby", "h-" + g.id);
    const target = S.targets[g.id] != null ? S.targets[g.id] : g.target;
    sec.innerHTML = `
      <figure class="fig">
        <svg class="fig-svg" viewBox="-20 -20 140 140" aria-hidden="true"></svg>
        <figcaption>Tabula ${g.roman}. <i>${g.name}, ${g.epithet}</i></figcaption>
      </figure>
      <div class="plate-body">
        <h2 id="h-${g.id}">${g.name}<small>${esc(g.title)}</small></h2>
        <p class="meta"><span>${esc(g.phase)}</span><span class="prog"></span><span class="cd" aria-live="polite"></span></p>
        <p class="why">${esc(g.why)}</p>
        <div class="target"><label for="t-${g.id}">My target</label><input id="t-${g.id}" type="text" maxlength="48" value="${esc(target)}" spellcheck="false"></div>
        <ul class="steps">${g.steps.map((t, i) => stepRow(`s-${g.id}-${i}`, t, isDone(g, i), false, i)).join("")}</ul>
        <p class="own-label" hidden>Stars of my own</p>
        <ul class="steps own-steps"></ul>
        <details class="tools"${S.dates[g.id] ? " open" : ""}>
          <summary>Add stars of my own, set a date</summary>
          <form class="addstar" autocomplete="off">
            <label class="sr" for="a-${g.id}">Add a star of my own</label>
            <input id="a-${g.id}" type="text" maxlength="90" placeholder="Add a star of my own">
            <button class="btn ghost" type="submit">Add star</button>
          </form>
          <div class="horizon">
            <label for="d-${g.id}">Horizon date</label>
            <input id="d-${g.id}" type="date" value="${esc(S.dates[g.id] || "")}">
          </div>
        </details>
        <p class="note">${esc(g.note)}${g.link ? ` <a href="${g.link.href}" target="_blank" rel="noopener">${esc(g.link.text)}</a>.` : ""}</p>
      </div>`;
    host.append(sec);

    const svg = $(".fig-svg", sec);
    svg.append(
      ...frameFor(g),
      artFor(g),
      drawCon(g, 1),
      sv("g", { class: "g-sats" })
    );
    $$(".gcon g[data-i]", svg).forEach(t => {
      t.addEventListener("click", () => { const cb = $(`#s-${g.id}-${t.dataset.i}`); cb.click(); });
      t.style.cursor = "pointer";
      const hit = sv("circle", { r: 7, fill: "transparent" });
      t.prepend(hit);
    });
    paintPlate(g);
  });
  $$(".plate").forEach(sec => io.observe(sec));
}
/* each plate has its own frame, so the five do not read as one template */
function orn(x, y, r) { return sv("path", { class: "orn", d: starPath(r), transform: `translate(${x} ${y})` }); }
function frameFor(g) {
  const out = [];
  const hexD = r => { let d = ""; for (let k = 0; k < 6; k++) { const a = (-90 + 60 * k) * Math.PI / 180; d += (k ? "L" : "M") + (50 + r * Math.cos(a)).toFixed(2) + " " + (50 + r * Math.sin(a)).toFixed(2); } return d + "Z"; };
  if (g.id === "acer") {
    out.push(sv("rect", { class: "disc", x: -16, y: -16, width: 132, height: 132, rx: 1.5 }), sv("rect", { class: "frame", x: -12.5, y: -12.5, width: 125, height: 125 }));
    [[-16, -16], [116, -16], [-16, 116], [116, 116]].forEach(c => out.push(orn(c[0], c[1], 3.2)));
  } else if (g.id === "corona") {
    out.push(sv("path", { class: "disc", d: "M-16 116V34A66 54 0 0 1 116 34V116Z" }), sv("path", { class: "frame", d: "M-12.5 112.5V34A62.5 50.5 0 0 1 112.5 34V112.5Z" }), orn(50, -20, 3.4));
  } else if (g.id === "nodus") {
    out.push(sv("path", { class: "disc", d: hexD(72) }), sv("path", { class: "frame", d: hexD(68.5) }));
    for (let k = 0; k < 6; k++) { const a = (-90 + 60 * k) * Math.PI / 180; out.push(orn((50 + 72 * Math.cos(a)).toFixed(2), (50 + 72 * Math.sin(a)).toFixed(2), 2.6)); }
  } else if (g.id === "arbor") {
    out.push(sv("rect", { class: "disc", x: -12, y: -20, width: 124, height: 140, rx: 62 }), sv("rect", { class: "frame", x: -8.5, y: -16.5, width: 117, height: 133, rx: 58.5 }), orn(50, -20, 3.2), orn(50, 120, 3.2));
  } else {
    out.push(sv("circle", { class: "disc", cx: 50, cy: 50, r: 68 }), sv("path", { class: "tk", d: ticks50() }));
  }
  out.push(sv("circle", { class: "orbit", cx: 50, cy: 50, r: 60 }), sv("path", { class: "gridl", d: "M50-18V118M-18 50H118", "stroke-width": 0.2 }));
  return out;
}

/* engraved ghost figures, drawn from geometry rather than clip-art */
const pth = (d, cls) => sv("path", cls ? { d, class: cls } : { d });
function hatch(root, id, clipD, step) {
  const cp = sv("clipPath", { id }); cp.append(sv("path", { d: clipD })); root.append(cp);
  let d = ""; for (let k = -100; k < 200; k += step) d += `M${k} 0L${k + 100} 100`;
  root.append(sv("path", { d, class: "hatch", "clip-path": `url(#${id})` }));
}
function artFor(g) {
  const a = sv("g", { class: "art" });
  ({ calamus: artQuill, acer: artLeaf, corona: artCrown, nodus: artKnot, arbor: artTree })[g.id](a);
  return a;
}
function artQuill(a) {
  const P = t => [(1 - t) ** 2 * 16 + 2 * (1 - t) * t * 62 + t * t * 90, (1 - t) ** 2 * 92 + 2 * (1 - t) * t * 66 + t * t * 8];
  const D = t => { const dx = 2 * (1 - t) * 46 + 2 * t * 28, dy = 2 * (1 - t) * -26 + 2 * t * -58, l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  let barbs = "";
  for (let i = 0; i <= 46; i++) {
    const t = .14 + i / 46 * .84, [x, y] = P(t), [tx, ty] = D(t);
    const prof = Math.pow(Math.sin(Math.PI * Math.min(1, (t - .08) / .92)), .75);
    [[1, 1], [-1, .72]].forEach(([side, k]) => {
      const nx = -ty * side, ny = tx * side, len = (3 + 20 * prof) * k;
      barbs += `M${x.toFixed(1)} ${y.toFixed(1)}L${(x + (nx * .8 + tx * .75) * len / 1.1).toFixed(1)} ${(y + (ny * .8 + ty * .75) * len / 1.1).toFixed(1)}`;
    });
  }
  a.append(pth(barbs), pth("M16 92Q62 66 90 8", "heavy"), pth("M16 92L10.5 99.5L19.5 96.5Z", "heavy"), pth("M14.5 94.5L17.5 91"));
}
function artLeaf(a) {
  const L = "M50 80L41 76L27 80L31 63L12 51L23 46L17 32L35 38L39 22L47 29L50 6L53 29L61 22L65 38L83 32L77 46L88 51L69 63L73 80L59 76Z";
  hatch(a, "clip-acer", L, 2.8);
  let veins = ""; [[50, 6], [17, 32], [83, 32], [12, 51], [88, 51]].forEach(([x, y]) => { veins += `M50 80L${x} ${y}`; });
  a.append(pth(L, "heavy"), pth(veins), pth("M50 80V97", "heavy"), pth("M50 97Q46 99 43 98"));
}
function artCrown(a) {
  const band = "M12 72H88V90H12Z";
  hatch(a, "clip-corona", band, 2.4);
  a.append(pth("M12 72L12 34L31 54L50 12L69 54L88 34L88 72Z", "heavy"), pth(band, "heavy"), pth("M12 76H88M12 86H88M31 54V72M69 54V72M50 12V72"));
  [[12, 34], [50, 12], [88, 34]].forEach(([x, y]) => a.append(sv("circle", { cx: x, cy: y, r: 3.2 })));
  [[31, 81], [50, 81], [69, 81]].forEach(([x, y]) => a.append(sv("circle", { cx: x, cy: y, r: 2.3 })));
}
function artKnot(a) {
  let d = "";
  for (let i = 0; i <= 260; i++) {
    const t = i / 260 * Math.PI * 2;
    d += (i ? "L" : "M") + (50 + 14 * (Math.sin(t) + 2 * Math.sin(2 * t))).toFixed(1) + " " + (50 + 14 * (Math.cos(t) - 2 * Math.cos(2 * t) + .5)).toFixed(1);
  }
  a.append(pth(d + "Z", "rib"), pth(d + "Z", "rib-in"), pth(d + "Z", "rib-core"));
}
function artTree(a) {
  const r = rng(5), layers = {};
  const br = (x, y, ang, len, dep) => {
    const x2 = x + Math.sin(ang) * len, y2 = y - Math.cos(ang) * len;
    layers[dep] = (layers[dep] || "") + `M${x.toFixed(1)} ${y.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
    if (dep === 0) { a.append(sv("circle", { cx: x2.toFixed(1), cy: y2.toFixed(1), r: 1.3 })); return; }
    br(x2, y2, ang - (.34 + r() * .22), len * .74, dep - 1);
    br(x2, y2, ang + (.34 + r() * .22), len * .74, dep - 1);
  };
  br(50, 94, 0, 24, 5);
  Object.keys(layers).forEach(k => { const e = pth(layers[k]); e.style.strokeWidth = (.22 + k * .2).toFixed(2); e.style.opacity = .85; a.append(e); });
  a.append(pth("M50 94Q40 98 30 97M50 94Q60 98 70 97M50 94Q49 99 46 104"));
}
function ticks50() {
  let d = "";
  for (let a = 0; a < 360; a += 5) {
    const r = a % 30 === 0 ? 63.8 : 65.4, t = a * Math.PI / 180, c = Math.cos(t), n = Math.sin(t);
    d += `M${(50 + 67.4 * c).toFixed(2)} ${(50 + 67.4 * n).toFixed(2)}L${(50 + r * c).toFixed(2)} ${(50 + r * n).toFixed(2)}`;
  }
  return d;
}
function paintPlate(g) {
  const sec = $("#plate-" + g.id), svg = $(".fig-svg", sec);
  paintCon(svg, g);
  $(".fig", sec).classList.toggle("complete", complete(g));
  const own = satsOf(g), ownDone = own.filter(s => s.d).length;
  $(".prog", sec).innerHTML = `<b>${lit(g)}</b> of ${g.steps.length} stars lit${own.length ? ` · ${ownDone}/${own.length} of my own` : ""}`;
  /* satellites */
  const gs = $(".g-sats", svg); gs.replaceChildren();
  own.forEach((s, k) => {
    const ang = (-90 + k * 137.5) * Math.PI / 180, r = 60;
    const c = sv("g", { transform: `translate(${(50 + r * Math.cos(ang)).toFixed(2)} ${(50 + r * Math.sin(ang)).toFixed(2)})` });
    c.append(sv("circle", { r: 4.5, fill: "transparent" }), sv("path", { class: "sat" + (s.d ? " on" : ""), d: starPath(2.6) }));
    c.style.cursor = "pointer";
    c.addEventListener("click", () => $(`#o-${g.id}-${k}`).click());
    gs.append(c);
  });
  const list = $(".own-steps", sec);
  list.innerHTML = own.map((s, k) => stepRow(`o-${g.id}-${k}`, s.t, s.d, true, k)).join("");
  $(".own-label", sec).hidden = !own.length;
  paintHorizon(g);
}
function daysTo(str) {
  const d = new Date(str + "T00:00"), t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 864e5);
}
function paintHorizon(g) {
  const out = $("#plate-" + g.id + " .cd"), v = S.dates[g.id];
  if (!v) { out.textContent = ""; return; }
  const n = daysTo(v);
  out.innerHTML = n > 1 ? `<b>${n}</b> days to go` : n === 1 ? "<b>1</b> day to go. Tomorrow." : n === 0 ? "Today is the day." : `${-n} day${n === -1 ? "" : "s"} ago. Set the next horizon.`;
}
function paintHorizonHero() {
  let best = null;
  goals.forEach(g => { const v = S.dates[g.id]; if (!v) return; const n = daysTo(v); if (n >= 0 && (!best || n < best.n)) best = { g, n }; });
  $("#horizon").textContent = best ? `Next horizon: ${best.g.name}, ${best.n === 0 ? "today" : best.n === 1 ? "tomorrow" : "in " + best.n + " days"}.` : "";
}
function paintCounts() {
  const n = allLit();
  $("#hdr-lit").textContent = n;
  $("#hero-lit-t").textContent = n === 0 ? "No stars lit yet. Thirty-five to go." : n === TOTAL ? "Every star is lit." : `${n} of ${TOTAL} stars lit.`;
}

/* plate events (delegated) */
function onPlates() {
  const host = $("#plates");
  host.addEventListener("change", e => {
    const sec = e.target.closest(".plate"); if (!sec) return;
    const g = goals.find(x => x.id === sec.dataset.goal);
    const id = e.target.id;
    if (e.target.type === "checkbox") {
      const own = id.startsWith("o-");
      const i = +id.split("-").pop();
      if (own) { satsOf(g)[i].d = e.target.checked; }
      else {
        (S.done[g.id] = S.done[g.id] || [])[i] = e.target.checked;
        const was = e.target.checked && complete(g);
        save(); paintPlate(g); paintHero(); paintCounts();
        if (was) celebrate(g, sec);
        return;
      }
      save(); paintPlate(g); return;
    }
    if (e.target.type === "date") { S.dates[g.id] = e.target.value; save(); paintHorizon(g); paintHorizonHero(); }
  });
  host.addEventListener("input", e => {
    if (e.target.id && e.target.id.startsWith("t-")) {
      const g = goals.find(x => "t-" + x.id === e.target.id);
      S.targets[g.id] = e.target.value; save();
    }
  });
  host.addEventListener("submit", e => {
    e.preventDefault();
    const sec = e.target.closest(".plate"), g = goals.find(x => x.id === sec.dataset.goal);
    const inp = $(".addstar input", sec), t = inp.value.trim();
    if (!t) { inp.focus(); return; }
    if (satsOf(g).length >= 12) { toast("Twelve stars of your own is plenty. Finish one first."); return; }
    satsOf(g).push({ t, d: false }); inp.value = ""; save(); paintPlate(g); inp.focus();
  });
  host.addEventListener("click", e => {
    const rm = e.target.closest("[data-rm]"); if (!rm) return;
    const sec = rm.closest(".plate"), g = goals.find(x => x.id === sec.dataset.goal);
    satsOf(g).splice(+rm.dataset.rm, 1); save(); paintPlate(g);
  });
  /* hover a step, wake its star */
  host.addEventListener("pointerover", e => hot(e, true));
  host.addEventListener("pointerout", e => hot(e, false));
  host.addEventListener("focusin", e => hot(e, true));
  host.addEventListener("focusout", e => hot(e, false));
  function hot(e, on) {
    const st = e.target.closest && e.target.closest(".step:not(.own)"); if (!st) return;
    const sec = st.closest(".plate");
    $$(".fig .st.hot", sec).forEach(x => x.classList.remove("hot"));
    if (on) { const s = $(`.fig .gcon g[data-i="${st.dataset.i}"] .st`, sec); if (s) s.classList.add("hot"); }
  }
}

/* ---------- celebration ---------- */
const burstCv = $("#burst"), bx = burstCv.getContext("2d");
let parts = [], bRun = false;
function sizeBurst() { const d = Math.min(devicePixelRatio || 1, 2); burstCv.width = innerWidth * d; burstCv.height = innerHeight * d; bx.setTransform(d, 0, 0, d, 0, 0); }
function celebrate(g, sec) {
  const all = goals.every(complete);
  toast(all ? "Every constellation is lit. Look at that sky." : `${g.name}, ${g.epithet}, is fully lit.`);
  if (RM) return;
  const r = $(".fig-svg", sec).getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, all ? 160 : 80);
}
function burst(x, y, n) {
  const cols = ["#f2c94c", "#f7f1df", "#b9c4f5", "#f2c94c"];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 9;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, s: 3 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, life: 1, c: cols[i % cols.length] });
  }
  if (!bRun) { bRun = true; requestAnimationFrame(stepBurst); }
}
function stepBurst() {
  bx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.life > 0);
  for (const p of parts) {
    p.vy += 0.18; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.012;
    bx.save(); bx.translate(p.x, p.y); bx.rotate(p.rot); bx.globalAlpha = Math.max(p.life, 0); bx.fillStyle = p.c;
    bx.fill(new Path2D(starPath(p.s))); bx.restore();
  }
  if (parts.length) requestAnimationFrame(stepBurst); else { bRun = false; bx.clearRect(0, 0, innerWidth, innerHeight); }
}

/* ---------- toast ---------- */
let toastT;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200);
}

/* ---------- header nav and reveal ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add("seen"); }), { rootMargin: "0px 0px -15% 0px", threshold: 0.12 });
function buildNav() {
  const nav = $("#spy");
  goals.forEach(g => {
    const a = document.createElement("a");
    a.href = "#plate-" + g.id; a.textContent = g.roman; a.title = `${g.name}, ${g.epithet}`;
    a.setAttribute("aria-label", `Plate ${g.roman}: ${g.name}`);
    nav.append(a);
  });
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    $$("a", nav).forEach(a => a.removeAttribute("aria-current"));
    const a = $(`a[href="#${e.target.id}"]`, nav); if (a) a.setAttribute("aria-current", "true");
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$(".plate").forEach(p => spy.observe(p));
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) $$("a", nav).forEach(a => a.removeAttribute("aria-current")); }), { rootMargin: "-45% 0px -50% 0px" }).observe($("#hero"));
}

function navTone() {
  const r = $(".paper").getBoundingClientRect();
  $("#top").classList.toggle("on-paper", r.top < 60 && r.bottom > 60);
}

/* ---------- observation log ---------- */
const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayKey = () => keyOf(new Date());
function dayAgo(n) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; }
function streak() {
  let n = 0, i = S.log[todayKey()] ? 0 : 1;
  while (S.log[keyOf(dayAgo(i))]) { n++; i++; }
  return n;
}
function buildLog() {
  $("#chips").innerHTML = goals.map(g => `<label class="chip"><input type="checkbox" name="g" value="${g.id}"><span>${g.name}</span></label>`).join("");
  $("#log-form").addEventListener("submit", e => {
    e.preventDefault();
    const k = todayKey(), had = !!S.log[k];
    S.log[k] = { note: $("#log-note").value.trim(), goals: $$("#chips input:checked").map(i => i.value) };
    save(); paintLog();
    toast(had ? "Entry updated." : `Night logged. ${streak() > 1 ? streak() + " in a row." : "The sky is a little brighter."}`);
  });
  $("#log-undo").addEventListener("click", () => { delete S.log[todayKey()]; $("#log-note").value = ""; $$("#chips input").forEach(i => i.checked = false); save(); paintLog(); });
  paintLog(true);
}
function paintLog(first) {
  const k = todayKey(), cur = S.log[k];
  if (first && cur) { $("#log-note").value = cur.note || ""; $$("#chips input").forEach(i => i.checked = (cur.goals || []).includes(i.value)); }
  const n = streak();
  $("#streak").innerHTML = n ? `${n} night${n === 1 ? "" : "s"} in a row.<span>Keep the chain unbroken tonight.</span>` : `No streak yet.<span>Log tonight and the count begins.</span>`;
  $("#log-btn").textContent = cur ? "Update tonight's entry" : "Log tonight's observation";
  $("#log-undo").hidden = !cur;
  const ol = $("#nights"); ol.replaceChildren();
  for (let i = 27; i >= 0; i--) {
    const d = dayAgo(i), seen = !!S.log[keyOf(d)];
    const li = document.createElement("li");
    li.className = "night" + (seen ? " seen" : "") + (i === 0 ? " today" : "");
    li.title = `${dateFmt.format(d)}${seen ? ", observed" : ""}`;
    li.setAttribute("aria-label", li.title + (i === 0 ? " (today)" : ""));
    li.innerHTML = `<svg viewBox="-12 -12 24 24" aria-hidden="true"><path class="nsp" d="${starPath(9)}"/></svg>`;
    ol.append(li);
  }
  const keys = Object.keys(S.log).sort().reverse().slice(0, 6), ul = $("#entries");
  ul.innerHTML = keys.length ? keys.map(kk => {
    const e = S.log[kk], d = new Date(kk + "T12:00");
    const names = (e.goals || []).map(id => (goals.find(g => g.id === id) || {}).name).filter(Boolean).join(" · ");
    return `<li><time datetime="${kk}">${dateFmt.format(d)}</time><div>${names ? `<div class="e-chips">${esc(names)}</div>` : ""}${e.note ? `<p class="e-note">${esc(e.note)}</p>` : `<p class="e-note" style="color:var(--ink-soft)">Showed up.</p>`}</div></li>`;
  }).join("") : `<li class="empty">No nights logged yet. Tonight is a good first one.</li>`;
}

/* ---------- transmissions ---------- */
let lastTx = -1;
function drawTx() {
  let i; do { i = Math.floor(Math.random() * A.transmissions.length); } while (i === lastTx && A.transmissions.length > 1);
  lastTx = i;
  const g = goals[Math.floor(Math.random() * goals.length)];
  const card = $("#tx-card"); card.classList.remove("flip"); void card.offsetWidth; card.classList.add("flip");
  $("#tx-text").textContent = A.transmissions[i];
  motif(g);
}
function motif(g) {
  const m = $("#tx-motif"); m.replaceChildren();
  g.edges.forEach(([a, b]) => m.append(sv("line", { class: "ln", x1: g.stars[a][0], y1: g.stars[a][1], x2: g.stars[b][0], y2: g.stars[b][1] })));
  g.stars.forEach((p, k) => m.append(sv("path", { class: "st", d: starPath(MAG[k] * 1.4), transform: `translate(${p[0]} ${p[1]})` })));
}

/* ---------- letter ---------- */
function buildLetter() {
  const ta = $("#letter"), note = $("#letter-saved"); let t;
  ta.value = S.letter != null ? S.letter : A.letter;
  ta.addEventListener("input", () => {
    clearTimeout(t); note.textContent = "Saving…";
    t = setTimeout(() => { S.letter = ta.value; save(); note.textContent = "Saved on this device only."; }, 400);
  });
}

/* ---------- wallpaper ---------- */
async function wallpaper() {
  const btn = $("#wallpaper"); btn.disabled = true;
  try {
    await Promise.all([document.fonts.load('italic 120px "IM Fell English"'), document.fonts.load('40px "IM Fell English SC"'), document.fonts.load('600 36px "Schibsted Grotesk"')]);
    const W = 1179, H = 2556, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d"), cream = "#f7f1df", mist = "#b9c4f5", gold = "#f2c94c", rule = "#5d6fd6", soft = "#3a47a8", red = "#ee5a36";
    x.fillStyle = "#0b1e70"; x.fillRect(0, 0, W, H);
    const rnd = rng(77);
    for (let i = 0; i < 520; i++) { x.globalAlpha = .2 + rnd() * .6; x.fillStyle = i % 17 === 0 ? gold : mist; x.beginPath(); x.arc(rnd() * W, rnd() * H, .8 + rnd() * 2.2, 0, 7); x.fill(); }
    x.globalAlpha = 1;
    const K = 0.96, CX = W / 2, CY = 1600, ox = CX - 500 * K, oy = CY - 500 * K;
    const pc = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [CX + r * K * Math.cos(a), CY + r * K * Math.sin(a)]; };
    const ring = (r, lw, col, dash) => { x.strokeStyle = col; x.lineWidth = lw; x.setLineDash(dash || []); x.beginPath(); x.arc(CX, CY, r * K, 0, 7); x.stroke(); x.setLineDash([]); };
    x.fillStyle = "#08165c"; x.beginPath(); x.arc(CX, CY, 496 * K, 0, 7); x.fill();
    ring(494, 3, soft); ring(486, 2, soft); ring(468, 2, soft); ring(424, 2.5, rule); ring(300, 2, soft, [3, 14]);
    x.strokeStyle = rule; x.lineWidth = 1.6;
    for (let d = 0; d < 360; d += 5) { const len = d % 30 === 0 ? 18 : d % 10 === 0 ? 13 : 8, p = pc(484, d), q = pc(484 - len, d); x.beginPath(); x.moveTo(...p); x.lineTo(...q); x.stroke(); }
    x.textAlign = "center"; x.textBaseline = "middle";
    MSTART.slice(0, 12).forEach((st, m) => {
      const deg = st / 365 * 360, p = pc(424, deg), q = pc(466, deg);
      x.strokeStyle = rule; x.lineWidth = 2; x.beginPath(); x.moveTo(...p); x.lineTo(...q); x.stroke();
      const mid = (st + MSTART[m + 1]) / 2 / 365 * 360, flip = mid > 90 && mid < 270, [mx, my] = pc(445, mid);
      x.save(); x.translate(mx, my); x.rotate(mid * Math.PI / 180 + (flip ? Math.PI : 0)); x.fillStyle = mist; x.font = '27px "IM Fell English SC"'; x.fillText(MONTHS[m], 0, 0); x.restore();
    });
    const td = todayDeg(), t1 = pc(467, td), t2 = pc(492, td - 2.3), t3 = pc(492, td + 2.3);
    x.fillStyle = red; x.beginPath(); x.moveTo(...t1); x.lineTo(...t2); x.lineTo(...t3); x.closePath(); x.fill();
    x.textBaseline = "alphabetic";
    goals.forEach(g => {
      const L = LAYOUT[g.id], s = CON_SCALE * K;
      const P = p => [ox + L.cx * K + (p[0] - 50) * s, oy + L.cy * K + (p[1] - 50) * s];
      x.lineCap = "round";
      g.edges.forEach(([a, b]) => {
        const on = isDone(g, a) && isDone(g, b), p = P(g.stars[a]), q = P(g.stars[b]);
        x.strokeStyle = on ? gold : rule; x.lineWidth = on ? 4.5 : 2.2; x.beginPath(); x.moveTo(...p); x.lineTo(...q); x.stroke();
      });
      g.stars.forEach((st, i) => {
        const [px, py] = P(st), r = MAG[i] * 1.55 * s, on = isDone(g, i);
        x.save(); x.translate(px, py); const p = new Path2D(starPath(r));
        if (on) { x.fillStyle = gold; x.fill(p); } else { x.strokeStyle = mist; x.lineWidth = 2.2; x.stroke(p); }
        x.restore();
      });
    });
    x.lineJoin = "round"; x.textAlign = "center";
    goals.forEach(g => {
      const L = LAYOUT[g.id], lx = ox + L.lx * K, ly = oy + (L.ly + 8) * K;
      x.strokeStyle = "#08165c";
      x.font = '40px "IM Fell English SC"'; x.lineWidth = 14; x.strokeText(g.name.toUpperCase(), lx, ly);
      x.fillStyle = complete(g) ? gold : cream; x.fillText(g.name.toUpperCase(), lx, ly);
      const sub = `${g.short} · ${lit(g)} of ${g.steps.length}`;
      x.font = '600 29px "Schibsted Grotesk", sans-serif'; x.lineWidth = 12; x.strokeText(sub, lx, ly + 38 * K);
      x.fillStyle = mist; x.fillText(sub, lx, ly + 38 * K);
    });
    /* top 30% stays clear for the lock-screen clock */
    x.textAlign = "center";
    x.fillStyle = cream; x.font = 'italic 150px "IM Fell English"'; x.fillText("Per aspera", W / 2, 885);
    x.fillStyle = gold; x.fillText("ad astra.", W / 2, 1030);
    x.fillStyle = cream; x.font = '600 54px "Schibsted Grotesk", sans-serif'; x.fillText(`${allLit()} of ${TOTAL} stars lit`, W / 2, 2262);
    x.fillStyle = mist; x.font = '40px "IM Fell English SC"'; x.fillText("briyan.xyz/vision", W / 2, 2345);
    const blob = await new Promise(r => c.toBlob(r, "image/png"));
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "briyan-atlas.png"; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("Wallpaper saved. Set it as your lock screen.");
  } catch (e) { toast("Could not make the wallpaper in this browser."); }
  btn.disabled = false;
}

/* ---------- reset ---------- */
function buildReset() {
  const b = $("#reset"); let armed = 0;
  b.addEventListener("click", () => {
    if (!armed) { armed = setTimeout(() => { armed = 0; b.textContent = "Wipe my progress"; }, 4000); b.textContent = "Tap again to wipe everything"; return; }
    clearTimeout(armed); armed = 0; b.textContent = "Wipe my progress";
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    S = fresh();
    $("#plates").replaceChildren(); buildPlates(); paintHero(); paintCounts(); paintHorizonHero(); paintLog(true);
    $("#letter").value = A.letter; $("#log-note").value = ""; $$("#chips input").forEach(i => i.checked = false);
    toast("A blank sky. Light the first star.");
  });
}

/* ---------- drifting dust (background) ---------- */
function dust() {
  const cv = $("#dust"), x = cv.getContext("2d");
  let W = 0, H = 0, D = 1, px = 0, py = 0, tx = 0, ty = 0, stars = [];
  function size() {
    D = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = W * D; cv.height = H * D; x.setTransform(D, 0, 0, D, 0, 0);
    const rnd = rng(31), n = Math.round(Math.min(260, W * H / 5500));
    stars = Array.from({ length: n }, (_, i) => ({ x: rnd() * W, y: rnd() * H, r: .5 + rnd() * 1.3 * (i % 5 === 0 ? 1.6 : 1), z: 0.2 + rnd() * 0.8, ph: rnd() * 7, sp: .6 + rnd() * 1.8, g: i % 19 === 0 }));
    draw(0);
  }
  function draw(t) {
    x.clearRect(0, 0, W, H);
    const sy = scrollY;
    for (const s of stars) {
      const X = ((s.x + px * s.z * 26) % W + W) % W;
      const Y = ((s.y - sy * s.z * 0.18 + py * s.z * 26 - (RM ? 0 : t * 0.002 * s.z * 8)) % H + H) % H;
      x.globalAlpha = RM ? .55 : 0.3 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.001 * s.sp + s.ph));
      x.fillStyle = s.g ? "#f2c94c" : "#cfd7ff";
      x.beginPath(); x.arc(X, Y, s.r, 0, 7); x.fill();
    }
  }
  let raf = 0;
  function loop(t) {
    px += (tx - px) * 0.06; py += (ty - py) * 0.06;
    draw(t);
    const plate = $("#hero-plate");
    if (plate) plate.style.transform = `translate(${(-px * 14).toFixed(1)}px, ${(-py * 14).toFixed(1)}px)`;
    raf = requestAnimationFrame(loop);
  }
  addEventListener("resize", size);
  size();
  if (RM) { addEventListener("scroll", () => draw(0), { passive: true }); return; }
  addEventListener("pointermove", e => { if (e.pointerType === "touch") return; tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(loop); });
  raf = requestAnimationFrame(loop);
}

/* ---------- go ---------- */
hero = buildHero();
buildPlates(); onPlates(); buildNav(); addEventListener("scroll", navTone, { passive: true }); navTone(); buildLog(); buildLetter(); buildReset();
paintHero(); paintCounts(); paintHorizonHero();
sizeBurst(); addEventListener("resize", sizeBurst);
dust();
{
  const now = new Date(), doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
  lastTx = doy % A.transmissions.length;
  $("#tx-text").textContent = A.transmissions[lastTx];
  motif(goals[doy % goals.length]);
}
$("#tx-draw").addEventListener("click", drawTx);
$("#wallpaper").addEventListener("click", wallpaper);
addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea/i.test(e.target.tagName)) return;
  const n = +e.key; if (n >= 1 && n <= goals.length) goPlate(goals[n - 1].id);
});
})();
