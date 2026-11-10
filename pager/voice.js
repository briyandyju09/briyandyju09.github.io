/* Voice messages for the pager.
   Records with MediaRecorder (hold or tap, 20 s max), then converts IN THE BROWSER to a
   16 kHz mono 16-bit PCM WAV (decodeAudioData -> OfflineAudioContext -> WAV encode),
   about 32 KB per second. Nothing leaves the browser until the sender presses send. */
(function () {
  "use strict";
  var MAX_S = 20, MIN_S = 0.6, RATE = 16000;
  function $(id) { return document.getElementById(id); }
  var panel = $("voice-panel");
  if (!panel) { window.PagerVoice = { supported: false }; return; }
  var recBtn = $("rec"), timeEl = $("rec-time"), meterFill = $("meter-fill"), help = $("rec-help");
  var actions = $("rec-actions"), playBtn = $("rec-play"), againBtn = $("rec-again"), discardBtn = $("rec-discard");
  var errEl = $("voice-err"), noteEl = $("note"), loudEl = $("loud");

  var AC = window.AudioContext || window.webkitAudioContext;
  var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  var secure = window.isSecureContext !== false;
  var supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder && AC && OAC);
  var why = !secure ? "Voice messages need a secure (https) page. Type your message instead."
    : !supported ? "This browser can't record audio. Type your message instead." : "";

  var state = "idle", stream = null, rec = null, chunks = [], startMs = 0, tInt = 0, raf = 0, actx = null, analyser = null;
  var result = null, url = "", audio = null, stopReq = false, downAt = 0, locked = false, onChange = function () {};

  function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function setTime(s) { timeEl.firstChild.nodeValue = fmt(s); }
  function setState(s) {
    state = s; panel.dataset.state = s;
    recBtn.hidden = s === "ready" || s === "processing";
    actions.hidden = s !== "ready";
    var label = s === "recording" ? "stop recording" : "record a voice message";
    recBtn.setAttribute("aria-label", label);
    recBtn.setAttribute("aria-pressed", s === "recording" ? "true" : "false");
    if (s === "idle") help.textContent = "hold or tap to record, up to 20 seconds.";
    if (s === "recording") help.textContent = "recording. release, or tap again, to stop.";
    if (s === "processing") help.textContent = "getting it ready…";
    if (s === "ready") help.textContent = "ready to send. listen back first if you like.";
    updateLock();
  }
  function showErr(t) { errEl.hidden = !t; errEl.textContent = t || ""; }
  function updateLock() {
    [recBtn, playBtn, againBtn, discardBtn, noteEl, loudEl].forEach(function (el) { el.disabled = locked; });
  }

  function cleanupStream() {
    cancelAnimationFrame(raf); clearInterval(tInt);
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    if (actx) { try { actx.close(); } catch (e) { /* ignore */ } }
    stream = null; actx = null; analyser = null;
    meterFill.style.transform = "scaleX(0)";
  }
  function pickMime() {
    var list = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    for (var i = 0; i < list.length; i++) { try { if (MediaRecorder.isTypeSupported(list[i])) return list[i]; } catch (e) { /* ignore */ } }
    return "";
  }

  function start() {
    if (!supported || locked || state === "recording" || state === "processing") return;
    stopAudio(); clearResult(); showErr("");
    stopReq = false;
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (s) {
      stream = s;
      var mime = pickMime();
      try { rec = new MediaRecorder(s, mime ? { mimeType: mime } : undefined); }
      catch (e) { cleanupStream(); setState("idle"); showErr("This browser couldn't start recording. Type your message instead."); return; }
      chunks = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = finish;
      rec.start(250);
      startMs = Date.now(); setState("recording"); setTime(0);
      try {
        actx = new AC(); var src = actx.createMediaStreamSource(s); analyser = actx.createAnalyser(); analyser.fftSize = 512; src.connect(analyser);
        var buf = new Uint8Array(analyser.fftSize);
        (function loop() {
          raf = requestAnimationFrame(loop);
          analyser.getByteTimeDomainData(buf);
          var sum = 0; for (var i = 0; i < buf.length; i++) { var v = (buf[i] - 128) / 128; sum += v * v; }
          meterFill.style.transform = "scaleX(" + Math.min(1, Math.sqrt(sum / buf.length) * 3.2).toFixed(3) + ")";
        })();
      } catch (e) { /* the meter is a nicety; recording still works */ }
      tInt = setInterval(function () {
        var el = (Date.now() - startMs) / 1000; setTime(Math.min(el, MAX_S));
        if (el >= MAX_S) stop();
      }, 100);
      if (stopReq) stop();
    }, function (err) {
      cleanupStream(); setState("idle");
      var n = err && err.name;
      showErr(n === "NotAllowedError" || n === "SecurityError"
        ? "The microphone is blocked. Allow it in your browser's site settings, then tap record again."
        : n === "NotFoundError" || n === "OverconstrainedError" ? "No microphone found. Plug one in, or type your message instead."
        : "Couldn't open the microphone. Type your message instead.");
    });
  }
  function stop() {
    if (state !== "recording") { stopReq = true; return; }
    if (rec && rec.state !== "inactive") rec.stop();
  }

  function finish() {
    var dur = (Date.now() - startMs) / 1000, type = rec && rec.mimeType || "audio/webm";
    cleanupStream();
    if (dur < MIN_S || !chunks.length) { setState("idle"); showErr("That was too short. Hold a little longer, or tap once to start and again to stop."); return; }
    setState("processing");
    toWav(new Blob(chunks, { type: type })).then(function (wav) {
      result = { wav: wav.blob, dur: wav.samples / RATE, bytes: wav.blob.size };
      url = URL.createObjectURL(wav.blob);
      setTime(result.dur);
      setState("ready");
      help.textContent = "ready to send (" + Math.max(1, Math.round(result.bytes / 1024)) + " KB). listen back first if you like.";
      onChange();
    }, function () {
      setState("idle"); showErr("Couldn't read that recording. Try again, or type your message instead.");
    });
  }

  /* ---- conversion: any recorded format -> 16 kHz mono 16-bit PCM WAV ---- */
  function decode(ab) {
    var c = new AC();
    return new Promise(function (res, rej) {
      var p = c.decodeAudioData(ab, res, rej);
      if (p && p.then) p.then(res, rej);
    }).then(function (b) { try { c.close(); } catch (e) { /* ignore */ } return b; }, function (e) { try { c.close(); } catch (x) { /* ignore */ } throw e; });
  }
  function toWav(blob) {
    return blob.arrayBuffer().then(decode).then(function (buf) {
      var n = Math.max(1, Math.min(Math.ceil(buf.duration * RATE), MAX_S * RATE));
      var off = new OAC(1, n, RATE), src = off.createBufferSource();
      src.buffer = buf; src.connect(off.destination); src.start();
      var r = off.startRendering();
      return r;
    }).then(function (rb) {
      var f = rb.getChannelData(0), n = f.length, ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
      function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
      str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt ");
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
      str(36, "data"); v.setUint32(40, n * 2, true);
      for (var i = 0; i < n; i++) { var s = Math.max(-1, Math.min(1, f[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
      return { blob: new Blob([ab], { type: "audio/wav" }), samples: n };
    });
  }

  function stopAudio() { if (audio) { audio.pause(); audio = null; playBtn.textContent = "listen back"; } }
  function clearResult() { stopAudio(); if (url) URL.revokeObjectURL(url); url = ""; result = null; setTime(0); onChange(); }
  function reset() {
    if (state === "recording" && rec && rec.state !== "inactive") { rec.onstop = null; try { rec.stop(); } catch (e) { /* ignore */ } }
    cleanupStream(); clearResult(); showErr(""); noteEl.value = ""; loudEl.checked = false; setState("idle");
  }

  /* ---- controls: pointer = hold or tap; keyboard = Space/Enter toggles ---- */
  var pointerUsed = false;
  recBtn.addEventListener("pointerdown", function (e) {
    if (e.button > 0 || locked) return;
    pointerUsed = true;
    if (state === "recording") { downAt = 0; stop(); return; }   // tap to stop
    downAt = Date.now(); start();
  });
  function release() {
    if (!downAt) return;
    var held = Date.now() - downAt; downAt = 0;
    if (held > 500 && (state === "recording" || !stopReq)) stop();   // held: release stops. A short press leaves it recording.
  }
  recBtn.addEventListener("pointerup", release);
  recBtn.addEventListener("pointercancel", release);
  recBtn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  recBtn.addEventListener("click", function () {
    if (pointerUsed) { pointerUsed = false; return; }
    if (state === "recording") stop(); else start();
  });
  playBtn.addEventListener("click", function () {
    if (!result) return;
    if (audio) { stopAudio(); return; }
    audio = new Audio(url);
    audio.onended = function () { audio = null; playBtn.textContent = "listen back"; };
    playBtn.textContent = "stop";
    audio.play().catch(function () { stopAudio(); showErr("Couldn't play that back here. It will still send."); });
  });
  againBtn.addEventListener("click", function () { clearResult(); setState("idle"); start(); });
  discardBtn.addEventListener("click", function () { clearResult(); showErr(""); setState("idle"); recBtn.focus(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && state === "recording") stop(); });

  setState("idle");
  window.PagerVoice = {
    supported: supported, why: why, fmt: fmt, reset: reset, showErr: showErr,
    result: function () { return result; }, busy: function () { return state === "recording" || state === "processing"; },
    note: function () { return noteEl.value.replace(/\s+/g, " ").trim(); }, loud: function () { return loudEl.checked; },
    lock: function (on) { locked = !!on; updateLock(); }, pause: function () { stopAudio(); if (state === "recording") stop(); },
    onChange: function (fn) { onChange = fn; }
  };
})();
