/* Riko: a tiny CSS-3D CyberPi with a 64x64 pixel screen.
   No libraries. window.Riko.set(mode, opts) drives it:
   idle | alert | delivered | seen | lapsed. */
(function () {
  "use strict";
  var root = document.getElementById("riko"), cv = document.getElementById("riko-screen");
  if (!root || !cv || !cv.getContext) { window.Riko = { set: function () {} }; return; }
  var g = cv.getContext("2d");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* classic 5x7 font, ASCII 0x20..0x5A, one byte per column (bit 0 = top row) */
  var FONT = ("0000000000" + "00005F0000" + "0007000700" + "147F147F14" + "242A7F2A12" + "2313086462" + "3649562050" + "0005030000" +
    "001C224100" + "0041221C00" + "2A1C7F1C2A" + "08083E0808" + "0050300000" + "0808080808" + "0060600000" + "2010080402" +
    "3E5149453E" + "00427F4000" + "4261514946" + "2141454B31" + "1814127F10" + "2745454539" + "3C4A494930" + "0171090503" +
    "3649494936" + "064949291E" + "0036360000" + "0056360000" + "0814224100" + "1414141414" + "0041221408" + "0201510906" +
    "324979413E" + "7E1111117E" + "7F49494936" + "3E41414122" + "7F4141221C" + "7F49494941" + "7F09090901" + "3E4149497A" +
    "7F0808087F" + "00417F4100" + "2040413F01" + "7F08142241" + "7F40404040" + "7F020C027F" + "7F0408107F" + "3E4141413E" +
    "7F09090906" + "3E4151215E" + "7F09192946" + "4649494931" + "01017F0101" + "3F4040403F" + "1F2040201F" + "3F4038403F" +
    "6314081463" + "0708700807" + "6151494543");
  function cols(ch) {
    var c = ch.toUpperCase().charCodeAt(0);
    if (c < 32 || c > 90) c = 63;                       // anything else prints as "?"
    var i = (c - 32) * 10, out = [];
    for (var k = 0; k < 5; k++) out.push(parseInt(FONT.substr(i + k * 2, 2), 16));
    return out;
  }
  function tw(str, sc) { return str.length ? str.length * 6 * sc - sc : 0; }
  function text(str, x, y, sc, color) {
    g.fillStyle = color;
    for (var i = 0; i < str.length; i++) {
      var cc = cols(str.charAt(i)), gx = x + i * 6 * sc;
      if (gx > 64 || gx < -6 * sc) continue;
      for (var cx = 0; cx < 5; cx++) for (var cy = 0; cy < 7; cy++) {
        if (cc[cx] >> cy & 1) g.fillRect(gx + cx * sc, y + cy * sc, sc, sc);
      }
    }
  }
  function px(x, y, w, h, color) { g.fillStyle = color; g.fillRect(x, y, w, h); }

  var C = { bg: "#2a1450", light: "#e0d4fb", white: "#fefbff", lav: "#cbbff2", ink: "#0a0030", orange: "#ff6a3c", green: "#7be7a2", teal: "#3daab8", violet: "#9457eb" };
  var S = { mode: "idle", name: "", text: "", urgent: false, voice: false, t0: 0, off: 0, lastSec: -1, dirty: true };

  function dubaiClock() {
    var d = new Date(Date.now() + 4 * 3600e3), h = d.getUTCHours() % 12 || 12, m = d.getUTCMinutes();
    return { s: h + ":" + (m < 10 ? "0" : "") + m, sec: d.getUTCSeconds() };
  }
  function drawIdle() {
    px(0, 0, 64, 64, C.bg);
    px(0, 0, 64, 9, C.lav); text("RIKO", 2, 1, 1, C.ink);
    var c = dubaiClock(), s = c.s;
    if (c.sec % 2 && !reduce) s = s.replace(":", " ");
    text(s, Math.round((64 - tw(s, 2)) / 2), 20, 2, C.white);
    text("DUBAI", 17, 40, 1, C.lav);
    for (var i = 0; i < 5; i++) px(8 + i * 10, 54, 6, 4, i === 2 ? C.violet : C.lav);
    return c.sec;
  }
  function scrollX(str, sc, off) {
    var w = tw(str, sc);
    if (w <= 60 || reduce) return 2;
    var span = w + 24;
    return 62 - (off % span);
  }
  function drawAlert() {
    var strobe = S.urgent && !reduce && S.mode === "alert" && Date.now() - S.t0 < 5000 && Math.floor((Date.now() - S.t0) / 250) % 2 === 0;
    px(0, 0, 64, 64, strobe ? "#b3261e" : C.bg);
    px(0, 0, 64, 9, S.urgent ? C.orange : C.lav);
    text(S.voice ? "VOICE" : "NEW PAGE", 2, 1, 1, C.ink);
    var name = S.name || "?";
    text(name, scrollX(name, 1, S.off), 13, 1, C.lav);
    var body = S.text || "";
    text(body, scrollX(body, 2, S.off * 2), 26, 2, C.white);
    var st = S.mode === "alert" ? "SENT" : S.mode === "delivered" ? "GOT IT" : S.mode === "lapsed" ? "WAITING" : "";
    var col = S.mode === "delivered" ? C.teal : C.lav;
    px(2, 49, tw(st, 1) + 6, 11, col); text(st, 5, 51, 1, C.ink);
  }
  function drawSeen() {
    px(0, 0, 64, 64, C.bg);
    px(0, 0, 64, 9, C.green); text("SEEN", 2, 1, 1, C.ink);
    var ck = [[14, 30], [18, 34], [22, 38], [26, 34], [30, 30], [34, 26], [38, 22], [42, 18]];  // pixel check mark
    ck.forEach(function (p) { px(p[0] + 1, p[1] + 2, 6, 6, C.green); });
    text("BRIYAN", 14, 50, 1, C.white);
  }
  function draw() {
    if (S.mode === "idle") { var sec = drawIdle(); S.lastSec = sec; }
    else if (S.mode === "seen") drawSeen();
    else drawAlert();
  }

  /* one light timer: redraws only when something visibly changes */
  var timer = setInterval(function () {
    if (document.hidden) return;
    if (S.mode === "idle") { var sec = dubaiClock().sec; if (sec !== S.lastSec || S.dirty) { draw(); S.dirty = false; } }
    else if (S.mode === "seen") { if (S.dirty) { draw(); S.dirty = false; } }
    else if (reduce) { if (S.dirty) { draw(); S.dirty = false; } }
    else { S.off += 1; draw(); }
  }, 80);
  draw();

  var buzzT = 0;
  function set(mode, o) {
    o = o || {};
    S.mode = mode;
    if (o.name != null) S.name = String(o.name);
    if (o.text != null) S.text = String(o.text).replace(/\s+/g, " ").slice(0, 90);
    if (o.urgent != null) S.urgent = !!o.urgent;
    if (o.voice != null) S.voice = !!o.voice;
    if (mode === "alert" && !o.quiet) S.t0 = Date.now();
    if (mode === "alert" && o.quiet) S.t0 = 0;
    S.off = 0; S.dirty = true;
    root.dataset.mode = mode;
    root.dataset.urgent = S.urgent ? "1" : "0";
    draw();
    if (mode === "alert" && !o.quiet && !reduce) {
      root.classList.add("buzzing"); clearTimeout(buzzT);
      buzzT = setTimeout(function () { root.classList.remove("buzzing"); }, S.urgent ? 2600 : 1300);
    }
    if (mode !== "alert") { root.classList.remove("buzzing"); clearTimeout(buzzT); }
  }
  window.Riko = { set: set };

  /* gentle parallax: pointer on desktop, device tilt on phones. Off when motion is reduced. */
  if (!reduce) {
    var tilt = root.querySelector(".riko-tilt"), raf = 0, rx = 0, ry = 0;
    function apply() { raf = 0; tilt.style.setProperty("--rx", rx.toFixed(1) + "deg"); tilt.style.setProperty("--ry", ry.toFixed(1) + "deg"); }
    function queue() { if (!raf) raf = requestAnimationFrame(apply); }
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      ry = (e.clientX / innerWidth - .5) * 2 * 16;
      rx = -(e.clientY / innerHeight - .5) * 2 * 10;
      queue();
    }, { passive: true });
    window.addEventListener("deviceorientation", function (e) {
      if (e.gamma == null || e.beta == null) return;
      ry = Math.max(-16, Math.min(16, e.gamma * .6));
      rx = Math.max(-10, Math.min(10, -(e.beta - 50) * .3));
      queue();
    }, { passive: true });
  }
})();
