/* ================================================================
   music.js: a tiny lo-fi radio that makes its own music.
   ────────────────────────────────────────────────────────────────
   Nothing is downloaded. Each track is invented in the browser with
   the Web Audio API: a random key, a random jazzy chord loop, a soft
   electric piano, a sleepy bass, a dusty drum groove, vinyl crackle,
   plus a random title. It plays quietly in the background.

   Browsers only allow sound after the visitor does something on the
   page, so if autoplay is blocked the player waits and starts on the
   first tap, click or key press anywhere (except the widget itself).
   Closing the widget stops the music. Pausing is remembered.
================================================================ */
(function () {
  const win = document.getElementById('win-music');
  if (!win) return;

  const $ = id => document.getElementById(id);
  const elTitle = $('music-title'), elMeta = $('music-meta');
  const btnPlay = $('music-play'), btnNext = $('music-next'), vol = $('music-volume');
  const AC = window.AudioContext || window.webkitAudioContext;

  if (!AC) {
    elTitle.textContent = 'No sound here';
    elMeta.textContent = 'this browser can’t make audio';
    btnPlay.disabled = btnNext.disabled = true;
    return;
  }

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch { /* storage blocked: carry on */ }
    return null;
  }
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  /* ── names ─────────────────────────────────────────────────── */
  const ADJ  = ['Rainy', 'Slow', 'Late Night', 'Paper', 'Quiet', 'Dusty', 'Warm', 'Faded', 'Soft', 'Sleepy',
                'Golden', 'Blue Hour', 'Distant', 'Foggy', 'Lazy', 'Midnight', 'Tender', 'Velvet'];
  const NOUN = ['Window', 'Bus Ride', 'Lanterns', 'Coffee', 'Letters', 'Skyline', 'Cassette', 'Streetlight',
                'Balcony', 'Train', 'Daydream', 'Polaroid', 'Laundromat', 'Tea', 'Rooftop', 'Postcards',
                'Sunday', 'Umbrella'];
  const KEYS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

  /* ── harmony ───────────────────────────────────────────────── */
  const QUAL = { maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], min9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14] };
  const PROGS = [
    [[0, 'maj7'], [9, 'min7'], [2, 'min7'], [7, 'dom7']],
    [[2, 'min7'], [7, 'dom7'], [0, 'maj7'], [9, 'min7']],
    [[0, 'maj7'], [4, 'min7'], [5, 'maj7'], [7, 'dom7']],
    [[5, 'maj7'], [4, 'min7'], [2, 'min7'], [0, 'maj7']],
    [[9, 'min7'], [2, 'min7'], [7, 'dom7'], [0, 'maj7']],
    [[0, 'maj9'], [5, 'maj9'], [4, 'min7'], [9, 'min9']],
  ];
  const PENTA = [0, 2, 4, 7, 9];

  let lastTitle = '';
  function makeTrack() {
    let title;
    do { title = `${pick(ADJ)} ${pick(NOUN)}`; } while (title === lastTitle);
    lastTitle = title;
    const keyRoot = Math.floor(Math.random() * 12);
    return {
      title,
      keyName: KEYS[keyRoot],
      base: 48 + keyRoot,
      prog: pick(PROGS),
      bpm: 62 + Math.floor(Math.random() * 15),      // 62 to 76
      swing: 0.1 + Math.random() * 0.08,
      bars: 4 * (6 + Math.floor(Math.random() * 3)),  // 24 to 32 bars, about 80 to 110 s
      hats: 0.5 + Math.random() * 0.3,
      kickAlt: Math.random() < 0.5,
    };
  }

  function voicing(root, quality) {
    return QUAL[quality]
      .map(i => { let n = root + i; while (n < 57) n += 12; while (n > 74) n -= 12; return n; })
      .sort((a, b) => a - b);
  }

  /* ── audio graph ───────────────────────────────────────────── */
  let ctx = null, master = null, bus = null, analyser = null, noiseBuf = null;
  let track = null, step = 0, nextTime = 0, timer = 0;
  let transitioning = false, userPaused = store('archive-music') === 'off';

  const level = () => 2.2 * Math.pow(vol.value / 100, 2);      // quiet by design: the default (40) sits around -33 dBFS

  function impulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function buildGraph() {
    ctx = new AC({ latencyHint: 'playback' });
    master = ctx.createGain();
    master.gain.value = 0;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;

    bus = ctx.createGain();
    const tone = ctx.createBiquadFilter();            // the "old tape" lid
    tone.type = 'lowpass'; tone.frequency.value = 3000; tone.Q.value = 0.4;
    const dry = ctx.createGain(); dry.gain.value = 0.85;
    const wet = ctx.createGain(); wet.gain.value = 0.3;
    const verb = ctx.createConvolver(); verb.buffer = impulse(1.9, 2.4);

    bus.connect(tone);
    tone.connect(dry); tone.connect(verb); verb.connect(wet);
    dry.connect(comp); wet.connect(comp);
    comp.connect(master);

    const limiter = ctx.createDynamicsCompressor();     // keeps the volume slider from ever clipping
    limiter.threshold.value = -4; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.003; limiter.release.value = 0.1;
    master.connect(limiter); limiter.connect(ctx.destination);

    analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
    limiter.connect(analyser);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    /* vinyl: quiet hiss with the odd pop, looped, straight to the dry path */
    const crackle = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const cd = crackle.getChannelData(0);
    for (let i = 0; i < cd.length; i++) {
      cd[i] = (Math.random() * 2 - 1) * 0.012;
      if (Math.random() < 0.0006) cd[i] = (Math.random() * 2 - 1) * (0.25 + Math.random() * 0.5);
    }
    const src = ctx.createBufferSource(); src.buffer = crackle; src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const vg = ctx.createGain(); vg.gain.value = 0.16;
    src.connect(hp); hp.connect(vg); vg.connect(dry);
    src.start();

    ctx.onstatechange = () => { updateUI(); if (ctx.state === 'running') disarm(); };
    window.__lofi = { get ctx() { return ctx; }, get analyser() { return analyser; }, get track() { return track; } };
  }

  /* ── voices ────────────────────────────────────────────────── */
  function env(g, t, attack, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function keys(freq, t, dur, vel) {                  // soft electric piano
    const g = ctx.createGain(); env(g, t, 0.01, vel, dur);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700 + Math.random() * 600;
    [['sine', 1, 1], ['triangle', 2, 0.16], ['sine', 4, 0.04]].forEach(([type, mul, amp]) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq * mul;
      o.detune.value = (Math.random() - 0.5) * 9;
      const og = ctx.createGain(); og.gain.value = amp;
      o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.05);
    });
    lp.connect(g); g.connect(bus);
  }

  function bassNote(freq, t, dur) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const g = ctx.createGain(); env(g, t, 0.02, 0.3, dur);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 280;
    o.connect(lp); lp.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }

  function kick(t) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(125, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.32);
  }

  function noiseHit(t, type, freq, q, peak, dur) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
  }
  const snare = t => noiseHit(t, 'bandpass', 1700, 0.7, 0.17, 0.15);
  const hat   = (t, v) => noiseHit(t, 'highpass', 7000, 0.7, 0.045 * v, 0.045);

  /* ── the groove: one call per eighth note ──────────────────── */
  function playStep(s, t0) {
    const T = track;
    const stepDur = 60 / T.bpm / 2;
    const bar = Math.floor(s / 8), pos = s % 8;
    const [off, qual] = T.prog[bar % 4];
    const t = t0 + (pos % 2 ? stepDur * T.swing : 0) + (Math.random() - 0.5) * 0.008;
    const root = T.base + off;

    if (pos === 0 || (pos === 5 && Math.random() < 0.55) || (pos === 3 && Math.random() < 0.2)) {
      const first = pos === 0;
      voicing(root, qual).forEach((n, i) =>
        keys(mtof(n), t + i * 0.014 + Math.random() * 0.006, first ? stepDur * 6 : stepDur * 2.5,
             (first ? 0.11 : 0.07) * (0.85 + Math.random() * 0.3)));
    }
    if (pos === 0) bassNote(mtof(root - 12), t, stepDur * 3.2);
    if (pos === 6 && Math.random() < 0.45) bassNote(mtof(root - 5), t, stepDur * 1.6);

    if (pos === 0 || (pos === 5 && T.kickAlt) || (pos === 7 && Math.random() < 0.15)) kick(t);
    if (pos === 2 || pos === 6) snare(t);
    if (Math.random() < T.hats) hat(t, pos % 2 ? 0.6 : 1);

    if (pos % 2 === 1 && Math.random() < 0.22) {
      keys(mtof(T.base + 24 + pick(PENTA)), t, stepDur * 3, 0.05);
    }
  }

  function tick() {
    if (!ctx || ctx.state !== 'running' || transitioning || !track) return;
    const stepDur = 60 / track.bpm / 2;
    while (nextTime < ctx.currentTime + 0.4) {
      playStep(step, nextTime);
      nextTime += stepDur; step++;
      if (step >= track.bars * 8) { swapTrack(1.4); break; }
    }
  }

  function startTrack() {
    track = makeTrack();
    step = 0;
    nextTime = ctx.currentTime + 0.15;
    transitioning = false;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(level(), ctx.currentTime, 0.6);
    updateUI();
  }

  /* fade out, then invent a new track */
  function swapTrack(fade) {
    if (transitioning) return;
    transitioning = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, fade / 4);
    setTimeout(() => { if (ctx) startTrack(); }, fade * 1000);
  }

  function ensureStarted() {
    if (!ctx) { buildGraph(); timer = setInterval(tick, 90); }
    if (!track) startTrack();
  }

  /* ── autoplay handling ─────────────────────────────────────── */
  const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'];
  let armed = false;
  function onGesture(ev) {
    if (win.contains(ev.target)) return;               // the widget's own buttons decide for themselves
    if (userPaused) { disarm(); return; }
    ensureStarted();
    ctx.resume().catch(() => {});
  }
  function arm() {
    if (armed) return;
    armed = true;
    GESTURES.forEach(e => document.addEventListener(e, onGesture, true));
  }
  function disarm() {
    if (!armed) return;
    armed = false;
    GESTURES.forEach(e => document.removeEventListener(e, onGesture, true));
  }

  /* ── ui ────────────────────────────────────────────────────── */
  function updateUI() {
    const running = !!ctx && ctx.state === 'running';
    win.classList.toggle('playing', running);
    elTitle.textContent = track ? track.title : 'Warming up…';
    const info = track ? `${track.bpm} bpm · key of ${track.keyName}` : 'made up on the spot';
    elMeta.textContent = running ? info : (userPaused ? `paused · ${info}` : 'tap anywhere to start ✧');
    btnPlay.setAttribute('aria-label', running ? 'Pause' : 'Play');
    const use = btnPlay.querySelector('use');
    if (use) use.setAttribute('href', running ? '#ic-pause' : '#ic-play');
  }

  btnPlay.addEventListener('click', () => {
    if (ctx && ctx.state === 'running') {
      userPaused = true; store('archive-music', 'off');
      ctx.suspend();
    } else {
      userPaused = false; store('archive-music', 'on');
      ensureStarted();
      ctx.resume().catch(() => {});
    }
    updateUI();
  });

  btnNext.addEventListener('click', () => {
    userPaused = false; store('archive-music', 'on');
    ensureStarted();
    ctx.resume().catch(() => {});
    swapTrack(0.5);
  });

  const savedVol = store('archive-music-vol');
  if (savedVol !== null && !isNaN(+savedVol)) vol.value = savedVol;
  vol.addEventListener('input', () => {
    store('archive-music-vol', vol.value);
    if (ctx && !transitioning) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.05);
  });

  /* closing the widget stops the music (reload to bring it back) */
  let wasOpen = win.classList.contains('window-open');
  new MutationObserver(() => {
    const open = win.classList.contains('window-open');
    if (wasOpen && !open && ctx && ctx.state === 'running') {
      ctx.suspend();
      userPaused = true;                               // not saved: the next visit starts playing again
    }
    wasOpen = open;
  }).observe(win, { attributes: true, attributeFilter: ['class'] });

  /* ── go ────────────────────────────────────────────────────── */
  updateUI();
  if (!userPaused) {
    ensureStarted();
    ctx.resume().catch(() => {});
    setTimeout(() => { if (ctx.state !== 'running') arm(); }, 250);
  }
})();
