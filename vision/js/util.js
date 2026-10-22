/* Vision Board Studio: shared helpers. Plain scripts, one global namespace (VB), so it also runs from file://. */
(function () {
"use strict";
const VB = window.VB = window.VB || {};

VB.$ = (s, r) => (r || document).querySelector(s);
VB.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
VB.uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
VB.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
VB.rad = d => d * Math.PI / 180;
VB.deg = r => r * 180 / Math.PI;
VB.esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
VB.round = (v, n) => { const k = Math.pow(10, n == null ? 1 : n); return Math.round(v * k) / k; };
VB.clone = o => JSON.parse(JSON.stringify(o));
VB.rot = (x, y, deg) => { const a = VB.rad(deg), c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
VB.debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = (...a) => { clearTimeout(t); fn(...a); }; return d; };
VB.sleep = ms => new Promise(r => setTimeout(r, ms));

/* seeded random: used for torn edges so a shape never changes between renders and exports */
VB.hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
VB.rng = seed => { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

/* tiny emitter */
const ev = {};
VB.on = (n, f) => { (ev[n] = ev[n] || []).push(f); return f; };
VB.off = (n, f) => { ev[n] = (ev[n] || []).filter(x => x !== f); };
VB.emit = (n, a) => { (ev[n] || []).slice().forEach(f => { try { f(a); } catch (e) { console.error(n, e); } }); };

/* DOM builder: h("div.class#id", {attr}, child, ...) */
VB.h = (sel, attrs, ...kids) => {
  const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(sel) || [];
  const el = document.createElement(m[1] || "div");
  (m[2] || "").replace(/([.#])([\w-]+)/g, (_, k, v) => { if (k === ".") el.classList.add(v); else el.id = v; });
  if (attrs && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "html") el.innerHTML = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "value") el.value = v;
    else if (k === "checked" || k === "disabled" || k === "hidden") el[k] = !!v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  kids.flat().forEach(c => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c)); });
  return el;
};

/* toast */
let toastT;
VB.toast = (msg, kind) => {
  const t = VB.$("#toast"); if (!t) return;
  t.textContent = msg; t.className = "toast show" + (kind ? " " + kind : "");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), kind === "bad" ? 5200 : 2600);
};

VB.fmtDate = ts => {
  const d = new Date(ts), now = new Date(), diff = (now - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + " min ago";
  if (diff < 86400) return Math.floor(diff / 3600) + " hr ago";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
};

/* geometry of an element: corners in world space */
VB.corners = el => {
  const hw = el.w / 2, hh = el.h / 2;
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => { const r = VB.rot(x, y, el.rot || 0); return [el.x + r[0], el.y + r[1]]; });
};
VB.aabb = el => {
  const c = VB.corners(el);
  const xs = c.map(p => p[0]), ys = c.map(p => p[1]);
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
};
VB.unionBox = list => {
  if (!list.length) return null;
  const b = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  list.forEach(e => { const a = e.type === "thread" ? VB.threadBox(e) : VB.aabb(e); b.x1 = Math.min(b.x1, a.x1); b.y1 = Math.min(b.y1, a.y1); b.x2 = Math.max(b.x2, a.x2); b.y2 = Math.max(b.y2, a.y2); });
  return b;
};
})();
