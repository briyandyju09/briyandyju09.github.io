/* briyan.xyz/pager
   Sends a page to Riko (Briyan's pocket device) through ntfy.sh and waits for the
   device to acknowledge it. No tracking, no cookies: the only things stored are the
   sender's name and the page in flight, both in this browser's localStorage. */
(function () {
  "use strict";

  var NTFY = "https://ntfy.sh/";
  var REAL_TOPIC = "riko-page-ee5e0dfb8ef425bc";
  var MAX_LEN = 280;
  var GAP_MS = 30 * 1000;          // one page per 30 s
  var WAIT_MS = 10 * 60 * 1000;    // give up waiting for "seen" after 10 min
  var POLL_MS = 5000;
  var DUBAI_OFFSET_H = 4;          // Dubai is UTC+4 all year
  var QUICK = ["got a minute?", "call me when free", "check slack"];

  /* Riko classifies a page as HCB work when the sender's name matches a teammate:
     full name or first name, case-insensitive. This mirrors that list so the sender
     sees the same answer before sending. Names only. */
  var TEAM = [
    ["Shreya"], ["Daamin Ashai"], ["Gary Tou"], ["Lucy Tran"], ["Luke Oldenburg"],
    ["Melanie Smith", "mel"], ["Matthew Soh", "matt"], ["Sarvesh Mohan Kumar"],
    ["Yanella", "yanella ft"], ["Rhys"], ["Paul Spitler"], ["Mohamad Mortada"], ["Manan Sharma"]
  ];

  // ?topic= is for testing only: it sends to a different ntfy topic and says so on the page.
  var topic = REAL_TOPIC;
  try {
    var qt = new URLSearchParams(location.search).get("topic");
    if (qt && /^[A-Za-z0-9_-]{1,64}$/.test(qt)) topic = qt;
  } catch (e) { /* old browser: keep the real topic */ }
  var testing = topic !== REAL_TOPIC;

  /* ---------- storage (best effort) ---------- */
  var KEY_NAME = "pager.name", KEY_LAST = "pager.lastSent", KEY_PENDING = "pager.pending", KEY_RECENT = "pager.recent";
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  function loadJSON(k) { try { return JSON.parse(load(k) || "null"); } catch (e) { return null; } }

  /* ---------- elements ---------- */
  function $(id) { return document.getElementById(id); }
  var compose = $("compose"), ticket = $("ticket");
  var nameEl = $("name"), msgEl = $("msg"), urgentEl = $("urgent");
  var routeStamp = $("route-stamp"), routeLine = $("route");
  var nameErr = $("name-err"), msgErr = $("msg-err");
  var countEl = $("count"), countSr = $("count-sr");
  var quietEl = $("quiet"), quietTime = $("quiet-time"), clockEl = $("clock"), clockText = $("clock-text");
  var problem = $("problem"), problemText = $("problem-text");
  var sendBtn = $("send"), sendLabel = $("send-label"), limitHint = $("limit-hint");
  var tRoute = $("t-route"), tMeta = $("t-meta"), tMsg = $("t-msg"), track = $("track");
  var stopSeen = $("stop-seen"), sentAt = $("sent-at"), seenAt = $("seen-at");
  var statusEl = $("status"), bigStamp = $("big-stamp"), sentStamp = $("sent-stamp"), againBtn = $("again");

  /* ---------- helpers ---------- */
  function norm(s) {
    return String(s || "").normalize("NFKC").replace(/^@+/, "").replace(/\s+/g, " ").trim().toLowerCase();
  }
  var teamKeys = {};
  TEAM.forEach(function (p) {
    p.forEach(function (n) { teamKeys[norm(n)] = 1; });
    teamKeys[norm(p[0].split(" ")[0])] = 1;
  });
  function classify(name) {
    var n = norm(name);
    if (!n) return "none";
    return teamKeys[n] ? "hcb" : "personal";
  }
  var KIND_STAMP = { none: "who's paging?", hcb: "hcb work", personal: "personal" };

  function clockTime(d) {
    try { return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase(); }
    catch (e) { return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"); }
  }
  function dubaiNow() {
    var d = new Date(Date.now() + DUBAI_OFFSET_H * 3600e3);
    var h = d.getUTCHours(), m = d.getUTCMinutes();
    var label = ((h % 12) || 12) + ":" + String(m).padStart(2, "0") + (h < 12 ? " am" : " pm");
    return { h: h, label: label, quiet: h >= 23 || h < 7 };
  }
  function minutesBetween(a, b) {
    var m = Math.max(0, Math.round((b - a) / 60000));
    return m < 1 ? "under a minute" : m === 1 ? "1 minute" : m + " minutes";
  }
  // HTTP headers are Latin-1; ntfy decodes RFC 2047 so names like "Zoë" or "शिवा" survive.
  function headerSafe(s) {
    if (/^[\x20-\x7e]*$/.test(s)) return s;
    var bytes = new TextEncoder().encode(s), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return "=?UTF-8?B?" + btoa(bin) + "?=";
  }
  function setText(el, parts) {
    // parts: array of strings or [tag, text]
    el.textContent = "";
    parts.forEach(function (p) {
      if (typeof p === "string") el.appendChild(document.createTextNode(p));
      else { var b = document.createElement(p[0]); b.textContent = p[1]; el.appendChild(b); }
    });
  }
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- route (work vs personal) ---------- */
  var lastKind = null;
  function paintRoute() {
    var kind = classify(nameEl.value);
    routeStamp.dataset.kind = kind;
    routeStamp.textContent = KIND_STAMP[kind];
    if (kind !== lastKind && lastKind !== null && kind !== "none" && !reduceMotion) {
      routeStamp.classList.remove("thunk"); void routeStamp.offsetWidth; routeStamp.classList.add("thunk");
    }
    lastKind = kind;
    if (kind === "hcb") setText(routeLine, ["goes to Briyan as an ", ["b", "HCB work page"]]);
    else if (kind === "personal") setText(routeLine, ["goes to Briyan as a ", ["b", "personal page"]]);
    else routeLine.textContent = "type your name and we'll show how it lands";
  }

  /* ---------- counter ---------- */
  var lastSr = "";
  function paintCount() {
    var n = msgEl.value.length, left = MAX_LEN - n;
    countEl.textContent = left <= 20 ? left + " left" : n + "/" + MAX_LEN;
    if (left <= 20) countEl.dataset.low = ""; else delete countEl.dataset.low;
    var sr = left <= 20 ? left + " characters left" : "";
    if (sr !== lastSr) { countSr.textContent = sr; lastSr = sr; }
  }

  /* ---------- Dubai clock + quiet hours ---------- */
  function paintClock() {
    var d = dubaiNow();
    clockText.textContent = "it's " + d.label + " in Dubai";
    if (d.quiet) clockEl.dataset.quiet = ""; else delete clockEl.dataset.quiet;
    quietEl.hidden = !d.quiet;
    quietTime.textContent = "It's " + d.label;
  }

  /* ---------- rate limit ---------- */
  var limitTimer = null;
  function waitLeft() {
    var last = Number(load(KEY_LAST)) || 0;
    var left = last + GAP_MS - Date.now();
    return left > 0 && left <= GAP_MS ? Math.ceil(left / 1000) : 0;
  }
  function paintLimit() {
    var s = waitLeft();
    if (sending) return;
    if (s > 0) {
      sendBtn.setAttribute("aria-disabled", "true");
      sendLabel.textContent = "wait " + s + "s";
      limitHint.textContent = "one page every 30 seconds. you can send again in " + s + "s.";
      if (!limitTimer) limitTimer = setInterval(paintLimit, 1000);
    } else {
      sendBtn.removeAttribute("aria-disabled");
      sendLabel.textContent = "page briyan";
      limitHint.textContent = "one page every 30 seconds, up to 280 characters.";
      if (limitTimer) { clearInterval(limitTimer); limitTimer = null; }
      if (!problem.hidden && problem.dataset.kind === "limit") showProblem(null);
    }
  }

  /* ---------- problems + validation ---------- */
  function showProblem(text, kind) {
    problem.hidden = !text;
    problemText.textContent = text || "";
    problem.dataset.kind = kind || "";
  }
  function fieldError(input, errEl, text) {
    errEl.hidden = !text;
    if (input === nameEl) routeLine.hidden = !!text;   // one line under the field at a time
    errEl.textContent = text || "";
    if (text) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
  }

  /* ---------- sending ---------- */
  var sending = false;
  function setSending(on) {
    sending = on;
    sendBtn.setAttribute("aria-busy", on ? "true" : "false");
    if (on) { sendBtn.setAttribute("aria-disabled", "true"); sendLabel.textContent = "sending"; }
    nameEl.readOnly = on; msgEl.readOnly = on; urgentEl.disabled = on;
    if (!on) paintLimit();
  }

  function publish(name, message, urgent) {
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
    return fetch(NTFY + topic, {
      method: "POST",
      body: message,
      headers: { "Title": headerSafe(name), "Priority": urgent ? "5" : "3", "Tags": "web" },
      cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (res.status === 429) throw new Error("ntfy says slow down. give it a minute, then try again.");
      if (!res.ok) throw new Error("ntfy didn't take it (error " + res.status + "). try again in a moment.");
      return res.json();
    }, function (err) {
      if (timer) clearTimeout(timer);
      if (err && err.name === "AbortError") throw new Error("ntfy took too long to answer. check your connection and try again.");
      throw new Error("couldn't reach ntfy. check your connection and try again.");
    }).then(function (data) {
      if (!data || !data.id) throw new Error("ntfy answered oddly, so it may not have gone through. try again.");
      return data;
    });
  }

  compose.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sending) return;
    var name = nameEl.value.replace(/\s+/g, " ").trim();
    var message = msgEl.value.trim();
    fieldError(nameEl, nameErr, name ? "" : "add your name so Briyan knows who's paging.");
    fieldError(msgEl, msgErr, message ? "" : "write something first, even just “hi”.");
    if (!name) { nameEl.focus(); return; }
    if (!message) { msgEl.focus(); return; }
    var s = waitLeft();
    if (s > 0) { showProblem("hang on, one page every 30 seconds. you can send again in " + s + "s.", "limit"); return; }

    showProblem(null);
    save(KEY_NAME, name);
    var urgent = urgentEl.checked, kind = classify(name);
    setSending(true);
    publish(name, message.slice(0, MAX_LEN), urgent).then(function (data) {
      var sentMs = Date.now();
      save(KEY_LAST, String(sentMs));
      var page = {
        topic: topic, id: String(data.id), time: Number(data.time) || Math.floor(sentMs / 1000),
        name: name, message: message, urgent: urgent, kind: kind, sentMs: sentMs, state: "waiting"
      };
      save(KEY_PENDING, JSON.stringify(page));
      // Pages sent from this browser in the last 10 minutes, so a name-only ack can't be credited to the wrong one.
      var recent = (loadJSON(KEY_RECENT) || []).filter(function (r) { return sentMs - r.sentMs < WAIT_MS; });
      recent.push({ id: page.id, time: page.time, sentMs: sentMs, name: norm(name) });
      save(KEY_RECENT, JSON.stringify(recent.slice(-10)));
      setSending(false);
      showTicket(page, true);
    }, function (err) {
      setSending(false);
      showProblem(err.message || "something went wrong. try again.", "send");
      sendLabel.textContent = waitLeft() ? sendLabel.textContent : "try again";
    });
  });

  /* ---------- ticket + acknowledgement ---------- */
  var current = null, pollTimer = null, fails = 0;

  function showTicket(page, moveFocus) {
    current = page;
    compose.hidden = true; ticket.hidden = false;
    tRoute.dataset.kind = page.kind; tRoute.textContent = KIND_STAMP[page.kind];
    var parts = ["from ", ["b", page.name], " · " + clockTime(new Date(page.sentMs))];
    if (page.urgent) parts.push(" · ", ["b", "urgent"]);
    setText(tMeta, parts);
    tMsg.textContent = page.message;
    sentAt.textContent = clockTime(new Date(page.sentMs));
    setText(sentStamp, ["sent", ["small", clockTime(new Date(page.sentMs))]]);
    sentStamp.classList.remove("landing");
    if (moveFocus && !reduceMotion) { void sentStamp.offsetWidth; sentStamp.classList.add("landing"); }
    paintState(false);
    if (moveFocus) ticket.focus();
    if (page.state === "waiting") startPolling();
  }

  function paintState(animate) {
    var p = current;
    stopSeen.classList.toggle("done", p.state === "seen");
    stopSeen.classList.toggle("lapsed", p.state === "lapsed");
    track.dataset.state = p.state;
    bigStamp.classList.remove("landing", "lapsed");
    if (p.state === "seen") {
      var at = new Date(p.seenMs);
      seenAt.textContent = clockTime(at);
      setText(statusEl, [["b", "Seen."], " Briyan read it at " + clockTime(at) + ", " + minutesBetween(p.sentMs, p.seenMs) + " after you sent it."]);
      setText(bigStamp, ["seen", ["small", clockTime(at)]]);
      bigStamp.hidden = false;
      if (animate && !reduceMotion) { void bigStamp.offsetWidth; bigStamp.classList.add("landing"); }
    } else if (p.state === "lapsed") {
      seenAt.textContent = "not yet";
      setText(statusEl, [["b", "No “seen” in 10 minutes."], " It's still on Riko. If it can't wait, reach him another way."]);
      setText(bigStamp, ["not yet"]);
      bigStamp.classList.add("lapsed");
      bigStamp.hidden = false;
    } else {
      seenAt.textContent = "waiting";
      setText(statusEl, [["b", "It's on its way to Riko."], " This updates by itself when Briyan reads it. Keep the tab open."]);
      bigStamp.hidden = true;
    }
    if (fails >= 3 && p.state === "waiting") statusEl.appendChild(document.createTextNode(" Having trouble checking right now, still trying."));
  }

  function stopPolling() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; } }
  function startPolling() { stopPolling(); fails = 0; poll(); }

  function isAckMsg(m) { return m && m.event === "message" && (m.tags || []).indexOf("riko-ack") >= 0; }
  function exactAck(m, page) { return isAckMsg(m) && String(m.message || "").trim() === "seen:" + page.id; }
  // Older Riko firmware acks with "seen by <name>" and the page's title (the sender's name), not the id.
  function nameAck(m, page) {
    var body = String(m.message || "").trim();
    return isAckMsg(m) && body.indexOf("seen:") !== 0 && /seen/i.test(body) && norm(m.title) === norm(page.name);
  }
  // Earlier pages from this browser, same name, still inside the 10 minute window: a name-only ack might be theirs.
  function siblings(page) {
    return (loadJSON(KEY_RECENT) || []).filter(function (r) {
      return r.id !== page.id && r.name === norm(page.name) && r.sentMs < page.sentMs && page.sentMs - r.sentMs < WAIT_MS;
    });
  }

  function poll() {
    var page = current;
    if (!page || page.state !== "waiting") return;
    var expired = Date.now() - page.sentMs > WAIT_MS;   // one last look before giving up
    var sib = siblings(page);
    var since = sib.reduce(function (t, r) { return Math.min(t, r.time); }, page.time);
    fetch(NTFY + page.topic + "/json?poll=1&since=" + since, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" })
      .then(function (res) { if (!res.ok) throw new Error(res.status); return res.text(); })
      .then(function (txt) {
        if (current !== page) return;
        var hadFails = fails >= 3;
        fails = 0;
        var lines = txt.split("\n"), named = [];
        for (var i = 0; i < lines.length; i++) {
          if (!lines[i]) continue;
          var m; try { m = JSON.parse(lines[i]); } catch (e) { continue; }
          if (exactAck(m, page)) { settle("seen", (Number(m.time) || Date.now() / 1000) * 1000); return; }
          if (nameAck(m, page)) named.push(m);
        }
        // Name-only acks count only when there is one for every page this browser sent under that name in the
        // window, and at least one arrived after this page went out.
        var mine = named.filter(function (m) { return (m.time || 0) >= page.time; });
        if (mine.length && named.length >= sib.length + 1) {
          settle("seen", (Number(mine[mine.length - 1].time) || Date.now() / 1000) * 1000); return;
        }
        if (expired) { settle("lapsed"); return; }
        if (hadFails) paintState(false);
        schedule();
      }, function () {
        if (current !== page) return;
        if (expired) { settle("lapsed"); return; }
        fails++;
        if (fails === 3) paintState(false);
        schedule();
      });
  }
  function schedule() { stopPolling(); pollTimer = setTimeout(poll, POLL_MS); }

  function settle(state, ms) {
    stopPolling();
    current.state = state;
    if (state === "seen") current.seenMs = Math.max(ms || Date.now(), current.sentMs);
    save(KEY_PENDING, JSON.stringify(current));
    paintState(true);
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && current && current.state === "waiting") startPolling();
  });

  againBtn.addEventListener("click", function () {
    stopPolling();
    current = null;
    save(KEY_PENDING, null);
    ticket.hidden = true; compose.hidden = false;
    msgEl.value = ""; urgentEl.checked = false;
    fieldError(msgEl, msgErr, ""); showProblem(null);
    paintCount(); paintLimit();
    msgEl.focus();
  });

  /* ---------- inputs ---------- */
  nameEl.addEventListener("input", function () { paintRoute(); if (nameEl.value.trim()) fieldError(nameEl, nameErr, ""); });
  nameEl.addEventListener("change", function () { var n = nameEl.value.trim(); if (n) save(KEY_NAME, n); });
  msgEl.addEventListener("input", function () { paintCount(); if (msgEl.value.trim()) fieldError(msgEl, msgErr, ""); });
  // Enter in the name field moves on to the message until there is one; Ctrl/Cmd+Enter sends from the message.
  nameEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !msgEl.value.trim()) { e.preventDefault(); msgEl.focus(); }
  });
  msgEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); compose.requestSubmit ? compose.requestSubmit() : sendBtn.click(); }
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-quick]"), function (chip) {
    chip.addEventListener("click", function () {
      if (msgEl.readOnly) return;
      var t = chip.getAttribute("data-quick"), v = msgEl.value.trim();
      msgEl.value = (!v || QUICK.indexOf(v) >= 0) ? t : (v + " " + t).slice(0, MAX_LEN);
      paintCount(); fieldError(msgEl, msgErr, "");
      msgEl.focus();
      try { msgEl.setSelectionRange(msgEl.value.length, msgEl.value.length); } catch (e) { /* ignore */ }
    });
  });

  /* ---------- boot ---------- */
  var saved = load(KEY_NAME);
  if (saved) nameEl.value = saved;
  paintRoute(); paintCount(); paintClock(); paintLimit();
  setInterval(paintClock, 20000);

  if (testing) {
    var tb = $("testing");
    tb.textContent = "test mode: pages go to ntfy topic \"" + topic + "\", not to Riko.";
    tb.hidden = false;
  }

  var pending = loadJSON(KEY_PENDING);
  if (pending && pending.topic === topic && pending.id && typeof pending.sentMs === "number") {
    var age = Date.now() - pending.sentMs;
    if (age >= 0 && age < WAIT_MS + 5 * 60 * 1000) showTicket(pending, false);
    else save(KEY_PENDING, null);
  }
})();
