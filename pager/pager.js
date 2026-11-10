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
  var POLL_FAST = 1500, POLL_SLOW = 5000, POLL_SSE = 10000, FAST_MS = 60 * 1000;   // watching for acks
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
  var personalEl = $("personal"), topicEl = $("topic"), topicField = $("topic-field"), topicErr = $("topic-err");
  var routeStamp = $("route-stamp"), routeLine = $("route");
  var nameErr = $("name-err"), msgErr = $("msg-err");
  var countEl = $("count"), countSr = $("count-sr");
  var quietEl = $("quiet"), quietTime = $("quiet-time"), clockEl = $("clock"), clockText = $("clock-text");
  var problem = $("problem"), problemText = $("problem-text");
  var sendBtn = $("send"), sendLabel = $("send-label"), limitHint = $("limit-hint");
  var tRoute = $("t-route"), tMeta = $("t-meta"), tMsg = $("t-msg");
  var stSent = $("st-sent"), stGot = $("st-got"), stSeen = $("st-seen");
  var modeType = $("mode-type"), modeVoice = $("mode-voice"), typePanel = $("type-panel"), voicePanel = $("voice-panel");
  var uploadEl = $("upload"), uploadFill = $("upload-fill");
  var Voice = window.PagerVoice || { supported: false, why: "" }, Riko = window.Riko || { set: function () {} };
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
  // Personal tick wins. Otherwise the page is an HCB request (the topic picker applies).
  function isTeam(name) { return !!teamKeys[norm(name)]; }
  function classify(name, personal) {
    if (personal) return "personal";
    return norm(name) ? "hcb" : "none";
  }
  var TOPICS = {
    card: "Card or reimbursement", invoice: "Invoice or receipt", transfer: "Transfer, ACH or wire",
    donations: "Donations or fundraising", grants: "Grants", setup: "Account setup or onboarding",
    applying: "Applying for HCB", other: "Something else"
  };
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
  function clockTimeS(ms) {
    var d = new Date(ms);
    try { return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }).toLowerCase(); }
    catch (e) { return d.toTimeString().slice(0, 8); }
  }
  function elapsed(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    return s < 60 ? s + "s" : Math.floor(s / 60) + "m " + String(s % 60).padStart(2, "0") + "s";
  }
  function mmss(s) { return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); }
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
    var kind = classify(nameEl.value, personalEl.checked);
    routeStamp.dataset.kind = kind;
    routeStamp.textContent = KIND_STAMP[kind];
    if (kind !== lastKind && lastKind !== null && kind !== "none" && !reduceMotion) {
      routeStamp.classList.remove("thunk"); void routeStamp.offsetWidth; routeStamp.classList.add("thunk");
    }
    lastKind = kind;
    if (kind === "hcb") setText(routeLine, isTeam(nameEl.value) ? ["goes to Briyan as an ", ["b", "HCB work page"]] : ["goes to Briyan as an ", ["b", "HCB request"]]);
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

  var mode = "type";
  function baseHint() { return mode === "voice" ? "one page every 30 seconds, up to 20 seconds of voice." : "one page every 30 seconds, up to 280 characters."; }

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
      limitHint.textContent = baseHint();
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

  /* ---------- mode: type it / voice message ---------- */
  function setMode(m) {
    if (m === "voice" && !Voice.supported) { showProblem(Voice.why || "Voice messages aren't available in this browser. Type your message instead.", "voice"); return; }
    if (problem.dataset.kind === "voice") showProblem(null);
    mode = m;
    modeType.setAttribute("aria-pressed", m === "type" ? "true" : "false");
    modeVoice.setAttribute("aria-pressed", m === "voice" ? "true" : "false");
    typePanel.hidden = m !== "type"; voicePanel.hidden = m !== "voice";
    if (m === "type" && Voice.pause) Voice.pause();
    if (!waitLeft()) limitHint.textContent = baseHint();
  }
  modeType.addEventListener("click", function () { setMode("type"); });
  modeVoice.addEventListener("click", function () { setMode("voice"); });
  if (!Voice.supported) modeVoice.setAttribute("aria-disabled", "true");
  if (Voice.onChange) Voice.onChange(function () { if (Voice.result && Voice.result()) Voice.showErr(""); });

  /* ---------- sending ---------- */
  var sending = false;
  function setSending(on) {
    sending = on;
    sendBtn.setAttribute("aria-busy", on ? "true" : "false");
    if (on) { sendBtn.setAttribute("aria-disabled", "true"); sendLabel.textContent = "sending"; }
    nameEl.readOnly = on; msgEl.readOnly = on; urgentEl.disabled = on; personalEl.disabled = on; topicEl.disabled = on;
    modeType.disabled = on; modeVoice.disabled = on;
    if (Voice.lock) Voice.lock(on);
    if (!on) { uploadEl.hidden = true; paintLimit(); }
  }

  function publishText(name, body, urgent, tags) {
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
    return fetch(NTFY + topic, {
      method: "POST", body: body,
      headers: { "Title": headerSafe(name), "Priority": urgent ? "5" : "3", "Tags": tags },
      cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (res.status === 429) throw new Error("ntfy says slow down. give it a minute, then try again.");
      if (!res.ok) throw new Error("ntfy didn't take it (error " + res.status + "). try again in a moment.");
      return res.json();
    }, function (err) {
      if (timer) clearTimeout(timer);
      if (err && err.name === "AbortError") throw new Error("ntfy took too long to answer. check your connection and try again.");
      throw new Error("couldn't reach ntfy. check your connection and try again.");
    }).then(checkData);
  }
  function checkData(data) {
    if (!data || !data.id) throw new Error("ntfy answered oddly, so it may not have gone through. try again.");
    return data;
  }
  // Voice: HTTP PUT of the WAV as an ntfy attachment (XHR so we can show upload progress).
  function publishVoice(name, wav, msgHeader, urgent, tags, onProgress) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open("PUT", NTFY + topic);
      x.timeout = 90000;
      x.setRequestHeader("Filename", "voice.wav");
      x.setRequestHeader("Title", headerSafe(name));
      x.setRequestHeader("Priority", urgent ? "5" : "3");
      x.setRequestHeader("Tags", tags);
      if (msgHeader) x.setRequestHeader("Message", headerSafe(msgHeader));
      x.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      x.onload = function () {
        if (x.status === 413) return reject(new Error("that recording is too big for ntfy. try a shorter one."));
        if (x.status === 429) return reject(new Error("ntfy is limiting uploads right now. wait a minute and try again, or type it."));
        if (x.status === 507) return reject(new Error("ntfy has no room for attachments right now. try again later, or type it."));
        if (x.status < 200 || x.status > 299) return reject(new Error("ntfy didn't take the recording (error " + x.status + "). try again in a moment."));
        try { resolve(checkData(JSON.parse(x.responseText))); } catch (e) { reject(e); }
      };
      x.onerror = function () { reject(new Error("couldn't reach ntfy. check your connection and try again.")); };
      x.ontimeout = function () { reject(new Error("the upload took too long. check your connection and try again.")); };
      x.send(wav);
    });
  }

  compose.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sending) return;
    var name = nameEl.value.replace(/\s+/g, " ").trim();
    var voice = mode === "voice", rec = voice && Voice.result ? Voice.result() : null;
    var message = voice ? (Voice.note ? Voice.note() : "") : msgEl.value.trim();
    fieldError(nameEl, nameErr, name ? "" : "add your name so Briyan knows who's paging.");
    if (!voice) fieldError(msgEl, msgErr, message ? "" : "write something first, even just “hi”.");
    var needTopic = !personalEl.checked && !topicEl.value;
    fieldError(topicEl, topicErr, needTopic ? "pick what you need help with, or tick personal." : "");
    if (!name) { nameEl.focus(); return; }
    if (needTopic) { topicEl.focus(); return; }
    if (voice && !rec) {
      Voice.showErr(Voice.busy && Voice.busy() ? "finish your recording first." : "record something first, or switch to type it.");
      $("rec").focus(); return;
    }
    if (!voice && !message) { msgEl.focus(); return; }
    var s = waitLeft();
    if (s > 0) { showProblem("hang on, one page every 30 seconds. you can send again in " + s + "s.", "limit"); return; }

    showProblem(null);
    save(KEY_NAME, name);
    var urgent = urgentEl.checked, personal = personalEl.checked, kind = classify(name, personal);
    var tkey = personal ? "" : topicEl.value, tlabel = TOPICS[tkey] || "";
    var prefix = personal ? "" : "[" + tlabel + "] ";
    var tags = "web" + (voice ? ",voice" : "") + (personal ? ",personal" : ",hcb-" + tkey);
    var loud = voice && Voice.loud();
    if (loud) tags += ",play";
    var dur = rec ? rec.dur : 0, job;
    setSending(true);
    if (voice) {
      uploadEl.hidden = false; uploadFill.style.transform = "scaleX(0)";
      job = publishVoice(name, rec.wav, prefix + (message || "voice message " + mmss(dur)), urgent, tags, function (f) {
        uploadFill.style.transform = "scaleX(" + f.toFixed(3) + ")"; sendLabel.textContent = "sending " + Math.round(f * 100) + "%";
      });
    } else {
      job = publishText(name, (prefix + message.slice(0, MAX_LEN)), urgent, tags);
    }
    job.then(function (data) {
      var sentMs = Date.now();
      save(KEY_LAST, String(sentMs));
      var page = {
        topic: topic, id: String(data.id), time: Number(data.time) || Math.floor(sentMs / 1000),
        name: name, message: message, urgent: urgent, kind: kind, topicLabel: tlabel, voice: dur, loud: !!loud,
        sentMs: sentMs, state: "waiting"
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

  /* ---------- ticket: sent -> delivered to Riko -> seen ---------- */
  var current = null, pollTimer = null, tickTimer = null, es = null, sseOk = false, fails = 0, namedAcks = [], gotIds = {};

  function pageText(p) { return p.voice ? "voice " + mmss(p.voice) + (p.message ? " " + p.message : "") : p.message; }

  function showTicket(page, fresh) {
    current = page;
    compose.hidden = true; ticket.hidden = false;
    tRoute.dataset.kind = page.kind; tRoute.textContent = KIND_STAMP[page.kind];
    var parts = ["from ", ["b", page.name], " · " + clockTime(new Date(page.sentMs))];
    if (page.topicLabel) parts.push(" · " + page.topicLabel);
    if (page.urgent) parts.push(" · ", ["b", "urgent"]);
    if (page.loud) parts.push(" · plays out loud");
    setText(tMeta, parts);
    tMsg.textContent = page.voice ? "voice message " + mmss(page.voice) + (page.message ? "\n" + page.message : "") : page.message;
    setText(sentStamp, ["sent", ["small", clockTime(new Date(page.sentMs))]]);
    sentStamp.classList.remove("landing");
    if (fresh && !reduceMotion) { void sentStamp.offsetWidth; sentStamp.classList.add("landing"); }
    namedAcks = []; gotIds = {};
    paint(false);
    rikoSync(fresh);
    if (fresh) ticket.focus();
    if (page.state === "waiting") startWatching();
  }

  function rikoSync(fresh) {
    var p = current, base = { name: p.name, text: pageText(p), urgent: p.urgent, voice: !!p.voice };
    if (p.state === "seen") Riko.set("seen", base);
    else if (p.state === "lapsed") Riko.set("lapsed", base);
    else if (p.gotMs) Riko.set("delivered", base);
    else { base.quiet = !fresh; Riko.set("alert", base); }
  }

  function setStep(li, done, active, lapsed, t, d, animate) {
    var was = li.classList.contains("done");
    li.classList.toggle("done", done);
    li.classList.toggle("active", active);
    li.classList.toggle("lapsed", lapsed);
    li.querySelector(".t").textContent = t;
    li.querySelector(".d").textContent = d;
    if (done && !was && animate && !reduceMotion) { li.classList.remove("pop"); void li.offsetWidth; li.classList.add("pop"); }
  }

  function paint(animate) {
    var p = current, waiting = p.state === "waiting", lapsed = p.state === "lapsed";
    var gotAt = p.gotMs ? p.gotMs - p.sentMs : 0;
    setStep(stSent, true, false, false, clockTimeS(p.sentMs), "", false);
    setStep(stGot, !!p.gotMs, waiting && !p.gotMs, lapsed && !p.gotMs, p.gotMs ? clockTimeS(p.gotMs) : "", p.gotMs ? "+" + elapsed(gotAt) : (lapsed ? "not yet" : ""), animate);
    setStep(stSeen, !!p.seenMs, waiting && !!p.gotMs, lapsed && !p.seenMs, p.seenMs ? clockTimeS(p.seenMs) : "", p.seenMs ? "+" + elapsed(p.seenMs - p.sentMs) : (lapsed ? "not yet" : ""), animate);
    bigStamp.classList.remove("landing", "lapsed");
    if (p.state === "seen") {
      setText(statusEl, [["b", "Seen."], " Briyan read it at " + clockTimeS(p.seenMs) + ", " + elapsed(p.seenMs - p.sentMs) + " after you sent it."]);
      setText(bigStamp, ["seen", ["small", clockTime(new Date(p.seenMs))]]);
      bigStamp.hidden = false;
      if (animate && !reduceMotion) { void bigStamp.offsetWidth; bigStamp.classList.add("landing"); }
    } else if (lapsed) {
      setText(statusEl, p.gotMs
        ? [["b", "Riko has it, but no “seen” in 10 minutes."], " Briyan hasn't looked yet. If it can't wait, reach him another way."]
        : [["b", "No word from Riko in 10 minutes."], " It may be switched off or offline. If it can't wait, reach him another way."]);
      setText(bigStamp, ["not yet"]); bigStamp.classList.add("lapsed"); bigStamp.hidden = false;
    } else {
      bigStamp.hidden = true;
      setText(statusEl, p.gotMs
        ? [["b", "Delivered to Riko"], " in " + elapsed(gotAt) + ". Waiting for Briyan to see it."]
        : [["b", "On its way to Riko."], " This updates by itself. Keep the tab open."]);
    }
    if (fails >= 3 && waiting && !sseOk) statusEl.appendChild(document.createTextNode(" Having trouble checking right now, still trying."));
    tick();
  }

  // live "12s" counter on the step we're waiting for (not announced to screen readers)
  function tick() {
    var p = current; if (!p || p.state !== "waiting") return;
    var li = !p.gotMs ? stGot : stSeen;
    li.querySelector(".d").textContent = elapsed(Date.now() - p.sentMs) + " so far";
  }

  /* ---- watching ntfy: EventSource (near instant) with fast polling as the safety net ---- */
  function isAckMsg(m) { return m && m.event === "message" && (m.tags || []).indexOf("riko-ack") >= 0; }
  function ackBody(m) { return String(m.message || "").trim(); }
  // Older Riko firmware acks with "seen by <name>" and the sender's name as the title, not the id.
  function nameAck(m, page) { var b = ackBody(m); return b.indexOf("seen:") !== 0 && b.indexOf("got:") !== 0 && /seen/i.test(b) && norm(m.title) === norm(page.name); }
  // Earlier pages from this browser, same name, still inside the 10 minute window: a name-only ack might be theirs.
  function siblings(page) {
    return (loadJSON(KEY_RECENT) || []).filter(function (r) {
      return r.id !== page.id && r.name === norm(page.name) && r.sentMs < page.sentMs && page.sentMs - r.sentMs < WAIT_MS;
    });
  }
  function sinceTime(page) { return siblings(page).reduce(function (t, r) { return Math.min(t, r.time); }, page.time); }

  function ingest(m, page) {
    if (!isAckMsg(m) || current !== page || page.state !== "waiting") return;
    if (m.id) { if (gotIds[m.id]) return; gotIds[m.id] = 1; }
    var t = (Number(m.time) || Date.now() / 1000) * 1000, b = ackBody(m);
    if (b === "got:" + page.id) { markGot(page, t); return; }
    if (b === "seen:" + page.id) { settle("seen", t); return; }
    if (nameAck(m, page)) {
      namedAcks.push(m);
      var mine = namedAcks.filter(function (x) { return (x.time || 0) >= page.time; });
      if (mine.length && namedAcks.length >= siblings(page).length + 1) settle("seen", (Number(mine[mine.length - 1].time) || Date.now() / 1000) * 1000);
    }
  }
  function markGot(page, t) {
    if (page.gotMs) return;
    page.gotMs = Math.max(t, page.sentMs); save(KEY_PENDING, JSON.stringify(page));
    paint(true); rikoSync(false);
  }
  function settle(state, ms) {
    stopWatching();
    current.state = state;
    if (state === "seen") {
      current.seenMs = Math.max(ms || Date.now(), current.sentMs);
      if (!current.gotMs) current.gotMs = current.seenMs;   // seen implies delivered
    }
    save(KEY_PENDING, JSON.stringify(current));
    paint(true); rikoSync(false);
  }

  function stopWatching() {
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (es) { es.close(); es = null; }
    sseOk = false;
  }
  function startWatching() {
    stopWatching(); fails = 0;
    var page = current;
    if (typeof EventSource === "function") {
      try {
        es = new EventSource(NTFY + page.topic + "/sse?since=" + sinceTime(page));
        es.onopen = function () { sseOk = true; fails = 0; };
        es.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (x) { return; } ingest(m, page); };
        es.onerror = function () { sseOk = false; };   // EventSource reconnects by itself; polling covers the gap
      } catch (e) { es = null; }
    }
    tickTimer = setInterval(tick, 1000);
    poll();
  }

  function poll() {
    var page = current;
    if (!page || page.state !== "waiting") return;
    var age = Date.now() - page.sentMs, expired = age > WAIT_MS;   // one last look before giving up
    fetch(NTFY + page.topic + "/json?poll=1&since=" + sinceTime(page), { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" })
      .then(function (res) { if (!res.ok) throw new Error(res.status); return res.text(); })
      .then(function (txt) {
        if (current !== page) return;
        var hadFails = fails >= 3; fails = 0;
        txt.split("\n").forEach(function (line) {
          if (!line) return;
          var m; try { m = JSON.parse(line); } catch (e) { return; }
          ingest(m, page);
        });
        if (page.state !== "waiting") return;
        if (expired) { settle("lapsed"); return; }
        if (hadFails) paint(false);
        schedule(page);
      }, function () {
        if (current !== page || page.state !== "waiting") return;
        if (expired) { settle("lapsed"); return; }
        fails++;
        if (fails === 3) paint(false);
        schedule(page);
      });
  }
  function schedule(page) {
    if (pollTimer) clearTimeout(pollTimer);
    var age = Date.now() - page.sentMs;
    pollTimer = setTimeout(poll, sseOk ? POLL_SSE : age < FAST_MS ? POLL_FAST : POLL_SLOW);
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && current && current.state === "waiting") startWatching();
  });

  againBtn.addEventListener("click", function () {
    stopWatching();
    current = null;
    save(KEY_PENDING, null);
    ticket.hidden = true; compose.hidden = false;
    msgEl.value = ""; urgentEl.checked = false; topicEl.value = ""; fieldError(topicEl, topicErr, "");
    if (Voice.reset) Voice.reset();
    fieldError(msgEl, msgErr, ""); showProblem(null);
    Riko.set("idle");
    paintCount(); paintLimit();
    (mode === "voice" ? $("rec") : msgEl).focus();
  });

  /* ---------- inputs ---------- */
  function paintTopic() { topicField.hidden = personalEl.checked; paintRoute(); }
  personalEl.addEventListener("change", function () { fieldError(topicEl, topicErr, ""); paintTopic(); });
  topicEl.addEventListener("change", function () { if (topicEl.value) fieldError(topicEl, topicErr, ""); });
  nameEl.addEventListener("input", function () { paintRoute(); if (nameEl.value.trim()) fieldError(nameEl, nameErr, ""); });
  nameEl.addEventListener("change", function () { var n = nameEl.value.trim(); if (n) save(KEY_NAME, n); });
  msgEl.addEventListener("input", function () { paintCount(); if (msgEl.value.trim()) fieldError(msgEl, msgErr, ""); });
  // Enter in the name field moves on to the message until there is one; Ctrl/Cmd+Enter sends from the message.
  nameEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && mode === "type" && !msgEl.value.trim()) { e.preventDefault(); msgEl.focus(); }
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
  paintTopic(); paintCount(); paintClock(); paintLimit();
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
