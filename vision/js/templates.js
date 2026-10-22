/* Starter boards. Every template is a recipe that builds ordinary, fully editable objects. */
(function () {
"use strict";
const VB = window.VB;

function builder(doc) {
  const th = doc.theme, keys = {}, rnd = VB.rng(VB.hash(doc.name));
  const nid = () => "e" + VB.uid();
  const reg = (key, el) => { el.id = nid(); if (key) keys[key] = el.id; doc.elements.push(el); return el; };
  const B = {
    doc, keys,
    photo(key, src, x, y, w, rot, caption, frame, o) {
      const first = [].concat(src)[0], s = VB.SAMPLES.find(q => q.id === first);
      const n = (VB.FRAMES[frame || "polaroid"] || {}).cells || 1, list = [].concat(src);
      const cells = []; for (let i = 0; i < n; i++) cells.push({ a: list[i % list.length], z: 1, ox: 0, oy: 0 });
      return reg(key, Object.assign({ type: "photo", x, y, w, h: 0, rot: rot || 0, frame: frame || "polaroid", fc: "", bw: 1, caption: caption || "", ar: s ? s.w / s.h : 1.25, adj: { b: 1, c: 1, s: 1, w: 0 }, cells }, o || {}));
    },
    note(key, text, x, y, w, rot, o) {
      return reg(key, Object.assign({ type: "text", x, y, w, h: 60, rot: rot || 0, text, font: "hand", fs: 42, color: th.ink, align: "left", ls: 0, lh: 0, outline: null, paper: { shape: "rect", texture: "grain", color: th.noteColor } }, o || {}));
    },
    text(key, text, x, y, w, font, fs, o) {
      return reg(key, Object.assign({ type: "text", x, y, w, h: 60, rot: 0, text, font: font || "hand", fs: fs || 90, color: th.ink, align: "center", ls: 0, lh: 0, outline: null, paper: null }, o || {}));
    },
    sticker(key, kind, x, y, w, rot, o) {
      const d = VB.stickerMap()[kind]; if (!d) return null;
      return reg(key, Object.assign({ type: "sticker", x, y, w, h: w * d.h / d.w, rot: rot || 0, kind, a: "", b: "", flip: false, border: !/^(pin|clip|word|paper-clip|safety|thumb)/.test(kind) }, o || {}));
    },
    tape(x, y, w, rot, pattern, color) { return reg(null, { type: "tape", x, y, w, h: 50, rot: rot || 0, pattern: pattern || "plain", color: color || th.tape, opacity: 0.82 }); },
    cat(name, x, y, rot) {
      let c = doc.categories.find(k => k.name === name);
      if (!c) { c = { id: "c" + VB.uid(), name, on: true }; doc.categories.push(c); }
      c.on = true;
      return reg("cat-" + c.id, { type: "text", x, y, w: 520, h: 60, rot: rot || 0, text: name, font: "condensed", fs: 40, color: th.ink, align: "center", ls: 0.02, lh: 0, outline: null, cat: c.id, paper: { shape: "label", texture: "grain", color: th.noteColor } });
    },
    link(a, c, o) {
      o = o || {};
      const pa = o.a || [0, -0.8], pb = o.b || [0, -0.8];
      return reg(null, { type: "thread", x: 0, y: 0, w: 10, h: 10, rot: 0, pts: [{ att: { id: keys[a], nx: pa[0], ny: pa[1] } }, ...(o.mid || []), { att: { id: keys[c], nx: pb[0], ny: pb[1] } }], color: o.color || "#d9382a", th: o.th || 2.6, sag: o.sag == null ? 0.1 : o.sag, label: o.label || "", pins: true, pinColor: o.color || "#d9382a" });
    },
    goal(key, g) { const el = doc.elements.find(e => e.id === keys[key]); if (el) el.goal = g; }
  };
  return B;
}

const GOALS = {
  boards: { title: "CBSE Grade 12 boards", desc: "finish the syllabus early and walk in rested", date: "", priority: "high", status: "doing", why: "every other door opens on these marks", steps: ["map the whole syllabus", "first full pass of every subject", "solve sample papers under timing", "fix the weakest chapters", "sit every paper rested"].map(t => ({ t, d: false })) },
  pearson: { title: "Pearson Scholarship, U of T", desc: "school nomination, then the U of T application and scholarship essays", date: "", priority: "high", status: "doing", why: "toronto is where the rest of the plan happens", steps: ["ask my counsellor about nomination", "pick my three stories", "lead one thing with real people", "draft the essays and rewrite twice", "submit everything"].map(t => ({ t, d: false })) },
  company: { title: "a company that sets the standard", desc: "internships, shipped projects, an offer I'm proud of", date: "", priority: "med", status: "idea", why: "learn how the best teams build things", steps: ["algorithms until they feel like reflex", "ship a project strangers use", "first internship", "stretch internship", "an offer I respect"].map(t => ({ t, d: false })) },
  phd: { title: "Ph.D. in computer science", desc: "one question, asked patiently for years", date: "", priority: "med", status: "idea", why: "find out something nobody knew yesterday", steps: ["join a lab as an undergrad", "read fifty papers", "co-author a first paper", "apply with a clear research story", "defend the dissertation"].map(t => ({ t, d: false })) },
  prof: { title: "professor at a university", desc: "teach the class I wished I had", date: "", priority: "low", status: "idea", why: "the best teachers changed what I thought was possible", steps: ["teach or TA", "postdoc or research stint", "start my own research line", "tenure-track", "earn tenure"].map(t => ({ t, d: false })) }
};

VB.TEMPLATES = [
  { id: "classic", name: "the classic scrapbook", desc: "polaroids, tape and handwriting on warm paper", mood: "vintage", size: "landscape", build(b) {
    b.text("t", "my little corner of the future", 1200, 180, 1500, "hand", 124);
    b.sticker(null, "wavy-underline", 1200, 300, 640, -1, { border: false });
    b.photo("p1", "s-sunrise", 560, 760, 380, -5, "slow mornings");
    b.photo("p2", "s-campus", 1090, 700, 480, 3, "where i'm headed", "instant");
    b.photo("p3", "s-coffee", 1640, 780, 360, -3, "little rituals", "square");
    b.photo("p4", "s-flower", 2050, 640, 340, 6, "bloom", "vintage");
    b.photo("p5", "s-desk", 820, 1280, 440, 2, "late nights", "taped");
    b.photo("p6", "s-ocean", 1500, 1290, 520, -2, "someday soon", "torn");
    b.note("n1", "dear future me,\ni'm proud of how far you came.", 270, 1260, 380, -3);
    b.note("n2", "to do:\n- say yes more\n- write it down\n- keep going", 2090, 1280, 360, 3, { paper: { shape: "torn", texture: "lined", color: "#fbf8ef" } });
    b.sticker(null, "star-doodle", 190, 360, 130, -12); b.sticker(null, "heart-doodle", 2230, 320, 140, 10); b.sticker(null, "paper-clip", 1290, 500, 130, 20);
    b.sticker(null, "word-dream-big", 1830, 1010, 300, -5, { border: false });
    b.link("p1", "p2", { label: "step one", sag: 0.12 }); b.link("p2", "p3", { label: "then this" }); b.link("p3", "p4", { sag: 0.14 });
  } },
  { id: "y2026", name: "the 2026 vision board", desc: "one big year at the centre, goals pinned around it", mood: "film", size: "landscape", build(b) {
    b.text("year", "2026", 1200, 800, 860, "condensed", 330, { color: "#d9382a", outline: { c: "#fffdf8", w: 10 } });
    b.sticker(null, "word-make-it-happen", 1200, 1010, 460, -3, { border: false });
    b.cat("Learning and Education", 420, 150, -2); b.cat("Career and Projects", 1980, 150, 2); b.cat("Health and Fitness", 420, 1480, 2); b.cat("Travel and Adventure", 1980, 1480, -2);
    b.photo("a", "s-desk", 440, 450, 330, -4, "learn the thing"); b.photo("b", "s-city", 1960, 460, 320, 4, "build the thing");
    b.photo("c", "s-forest", 440, 1130, 330, 3, "move every day"); b.photo("d", "s-plane", 1960, 1150, 320, -4, "go somewhere new");
    b.note("n1", "the plan:\nsave first. say no kindly.\nshow up daily.", 1200, 360, 420, -2, { paper: { shape: "sticky", texture: "plain", color: "#fff1a8" } });
    b.sticker(null, "sparkle-cluster", 780, 250, 140, 8); b.sticker(null, "bolt-doodle", 1650, 270, 110, 10);
    b.link("year", "a", { label: "why it matters", sag: 0.18 }); b.link("year", "b", { sag: 0.18 }); b.link("year", "c", { sag: 0.16 }); b.link("year", "d", { label: "step one", sag: 0.16 });
  } },
  { id: "minimal", name: "the minimalist mood board", desc: "quiet, monochrome, lots of air", mood: "mono", size: "landscape", build(b) {
    b.text("t", "less, but better.", 1200, 220, 1200, "serif", 150);
    b.photo("a", "s-mountain", 640, 820, 560, 0, "", "frameless", { rot: 0 });
    b.photo("b", "s-desert", 1360, 640, 420, 0, "", "frameless", { rot: 0 });
    b.photo("c", "s-coffee", 1700, 1180, 360, 0, "", "square", { rot: 0 });
    b.photo("d", "s-ocean", 1880, 760, 400, 0, "", "frameless", { rot: 0 });
    b.note("n1", "slow mornings\nclean desks\nlong walks", 1180, 1180, 420, 0, { font: "type", fs: 34, paper: { shape: "rect", texture: "grain", color: "#f4f4f1" } });
    b.text("c1", "(place)", 640, 1240, 400, "mono", 30, { color: "#555" });
    b.link("a", "b", { color: "#1d1d1d", th: 1.8, label: "" });
  } },
  { id: "dream", name: "the dream life collage", desc: "everything at once, loud and layered", mood: "maximal", size: "landscape", build(b) {
    b.photo("a", "s-ocean", 520, 560, 560, -6, "the view", "instant"); b.photo("b", "s-city", 1260, 520, 380, 4, "the city", "polaroid");
    b.photo("c", "s-flower", 1850, 620, 400, -3, "the garden", "square"); b.photo("d", "s-lights", 700, 1180, 480, 3, "the nights", "taped");
    b.photo("e", "s-desert", 1500, 1200, 520, -4, "the road", "vintage"); b.photo("f", "s-plane", 2100, 1210, 360, 6, "the plan", "clip");
    b.text("t", "dream life.", 1200, 130, 1400, "condensed", 170, { color: "#e0632b", outline: { c: "#0a0030", w: 6 } });
    b.sticker(null, "word-becoming-her", 1650, 380, 360, 4, { border: false }); b.sticker(null, "word-trust-process", 340, 1330, 280, -6, { border: false });
    b.sticker(null, "burst-doodle", 1070, 860, 170, 8); b.sticker(null, "star-doodle", 260, 250, 150, -10); b.sticker(null, "rainbow-doodle", 2230, 380, 220, 8); b.sticker(null, "sunglasses", 1050, 1420, 180, -8);
    b.sticker(null, "cherries-doodle", 2230, 920, 150, 12); b.sticker(null, "butterfly-doodle", 1620, 880, 150, -14);
    b.note("n", "everything i want\nis on the other side\nof a little courage.", 2100, 1480, 420, 3, { font: "script", fs: 42 });
    b.link("a", "b", { label: "lead to", sag: 0.14 }); b.link("b", "c"); b.link("d", "e", { sag: 0.12 }); b.link("e", "f");
  } },
  { id: "travel", name: "the travel bucket list", desc: "places, a route and a red string between them", mood: "coastal", size: "landscape", build(b) {
    b.text("t", "places i want to go", 1200, 170, 1500, "hand", 120);
    b.sticker(null, "folded-map", 260, 300, 240, -8); b.sticker(null, "airplane", 2150, 270, 220, 12); b.sticker(null, "compass", 2220, 1400, 190, -10); b.sticker(null, "suitcase", 250, 1420, 210, 8);
    b.photo("a", "s-ocean", 640, 760, 460, -4, "1. the coast", "instant"); b.photo("b", "s-mountain", 1230, 640, 470, 3, "2. the mountains", "torn");
    b.photo("c", "s-desert", 1760, 840, 400, -3, "3. the dunes", "polaroid"); b.photo("d", "s-city", 1230, 1240, 380, 4, "4. the city", "square");
    b.photo("e", "s-forest", 640, 1260, 340, -5, "5. the woods", "vintage");
    b.note("n", "packing list:\npassport, film camera,\none good book.", 1880, 1360, 380, 3, { paper: { shape: "ticket", texture: "plain", color: "#f4ead2" } });
    b.link("a", "b", { label: "step one" }); b.link("b", "c"); b.link("c", "d"); b.link("d", "e");
  } },
  { id: "academic", name: "the academic comeback", desc: "targets, timetables and the desk you're building", mood: "academic", size: "landscape", build(b) {
    b.text("t", "the comeback plan", 1200, 170, 1500, "serif", 150);
    b.photo("a", "s-desk", 700, 760, 480, -3, "where it happens", "instant"); b.photo("b", "s-campus", 1760, 720, 440, 3, "where it leads");
    b.note("n1", "this term:\n- finish every chapter\n- weekly past papers\n- sleep before midnight", 1220, 760, 420, 2, { paper: { shape: "rect", texture: "lined", color: "#fbf8ef" } });
    b.note("n2", "target: 95%+", 800, 1250, 360, -2, { font: "condensed", fs: 62, align: "center", paper: { shape: "label", texture: "grain", color: "#fff1a8" } });
    b.note("n3", "exam dates\nwrite them here", 1500, 1260, 360, 3, { font: "type", fs: 36, paper: { shape: "sticky", texture: "plain", color: "#bfe3f2" } });
    b.sticker(null, "book-stack", 260, 1330, 220, -6); b.sticker(null, "graduation-cap", 2210, 330, 200, 10); b.sticker(null, "checklist-pad", 2160, 1360, 210, 8); b.sticker(null, "pencil", 360, 330, 220, -14);
    b.link("a", "n1", { label: "daily work" }); b.link("n1", "b", { label: "so that" });
  } },
  { id: "career", name: "the career roadmap", desc: "a chain of milestones from now to the big goal", mood: "film", size: "landscape", build(b) {
    b.text("t", "the long road to the thing", 1200, 160, 1700, "condensed", 120);
    b.photo("a", "s-desk", 380, 860, 340, -3, "learn", "polaroid"); b.photo("b", "s-lights", 880, 560, 340, 3, "build", "polaroid");
    b.photo("c", "s-city", 1400, 900, 340, -2, "intern", "polaroid"); b.photo("d", "s-mountain", 1860, 560, 340, 4, "lead", "polaroid");
    b.note("n1", "year 1\nfundamentals, daily practice", 380, 1290, 320, -2); b.note("n2", "year 2\nship projects people use", 880, 1000, 320, 2);
    b.note("n3", "year 3\nfirst internship", 1400, 1330, 320, -3); b.note("n4", "year 4+\nown something meaningful", 1860, 1000, 320, 3);
    b.sticker(null, "arrow-curved", 640, 1090, 140, 0); b.sticker(null, "trophy", 2230, 330, 200, 8); b.sticker(null, "lightbulb", 240, 330, 190, -10);
    b.link("a", "b", { label: "step one", sag: 0.2 }); b.link("b", "c", { sag: 0.2 }); b.link("c", "d", { label: "why it matters", sag: 0.2 });
  } },
  { id: "wellness", name: "the wellness reset", desc: "habits, movement and slow mornings", mood: "coastal", size: "portrait", build(b) {
    b.text("t", "reset.", 800, 230, 1100, "condensed", 220, { color: "#2f8f9d" });
    b.photo("a", "s-forest", 520, 780, 460, -4, "move daily", "polaroid"); b.photo("b", "s-ocean", 1130, 960, 420, 4, "breathe", "instant");
    b.photo("c", "s-coffee", 560, 1480, 380, 3, "slow mornings", "square"); b.photo("d", "s-flower", 1130, 1700, 400, -4, "bloom", "torn");
    b.note("n", "habits\n- 10k steps\n- water first\n- lights out at 11\n- stretch", 800, 2130, 520, -2, { paper: { shape: "folded", texture: "grain", color: "#eef7f6" } });
    b.sticker(null, "dumbbell", 1300, 400, 200, 12); b.sticker(null, "running-shoe", 280, 470, 220, -10); b.sticker(null, "plant-pot", 1330, 2230, 200, 8); b.sticker(null, "sun-doodle", 260, 2200, 190, -8);
    b.link("a", "b", { label: "step one" }); b.link("b", "c"); b.link("c", "d");
  } },
  { id: "life", name: "relationships and life goals", desc: "the people and the home you're building", mood: "romantic", size: "landscape", build(b) {
    b.text("t", "the life we're building", 1200, 180, 1500, "script", 110, { color: "#c2385a" });
    b.photo("a", "s-flower", 600, 780, 420, -4, "grow together", "polaroid"); b.photo("b", "s-coffee", 1200, 700, 400, 3, "every morning", "square");
    b.photo("c", "s-sunrise", 1800, 800, 440, -3, "new places", "instant"); b.photo("d", "s-desk", 900, 1290, 380, 3, "a home", "vintage");
    b.note("n1", "i want a life that feels like\nsunday morning.", 1500, 1290, 420, -2, { font: "serif", fs: 52, paper: { shape: "torn", texture: "plain", color: "#fbe3e0" } });
    b.sticker(null, "heart-doodle", 270, 330, 150, -10); b.sticker(null, "paper-heart", 2210, 330, 150, 10); b.sticker(null, "bow-ribbon", 280, 1360, 180, 8); b.sticker(null, "house-doodle", 2210, 1350, 200, -6); b.sticker(null, "tulip-doodle", 2260, 800, 150, 6);
    b.link("a", "b", { label: "this leads to" }); b.link("b", "c"); b.link("b", "d", { sag: 0.16 });
  } },
  { id: "pinterest", name: "the pinterest-inspired collage", desc: "soft pastel columns of pictures and quotes", mood: "pastel", size: "portrait", build(b) {
    b.photo("a", "s-flower", 480, 560, 400, -2, "soft", "frameless"); b.photo("b", "s-sunrise", 1150, 640, 400, 2, "golden hour", "frameless");
    b.photo("c", "s-coffee", 480, 1250, 380, 2, "", "square"); b.photo("d", "s-ocean", 1150, 1340, 440, -2, "salt air", "polaroid");
    b.photo("e", "s-lights", 480, 1860, 400, -3, "", "taped"); b.photo("f", "s-forest", 1150, 2050, 400, 3, "wander", "vintage");
    b.text("t", "pretty things", 800, 170, 1200, "script", 100, { color: "#e57aa0" });
    b.sticker(null, "word-let-it-bloom", 800, 960, 360, -4, { border: false }); b.sticker(null, "sparkle-cluster", 1400, 300, 140, 8); b.sticker(null, "butterfly-doodle", 230, 1000, 140, -12); b.sticker(null, "bow-ribbon", 1400, 1700, 150, 10);
    b.note("n", "gentle days,\nbig dreams.", 800, 2380, 480, 2, { font: "serif", fs: 64, align: "center", paper: { shape: "ticket", texture: "plain", color: "#fde8ef" } });
  } },
  { id: "analog", name: "the vintage analog scrapbook", desc: "film strips, stamps and aged paper", mood: "vintage", size: "landscape", build(b) {
    b.text("t", "film diary no. 7", 1200, 160, 1400, "type", 100);
    b.photo("a", ["s-sunrise", "s-forest", "s-ocean"], 440, 860, 300, -2, "", "strip");
    b.photo("b", ["s-city", "s-desk", "s-flower", "s-coffee", "s-lights", "s-desert"], 1300, 900, 560, 2, "", "contact");
    b.photo("c", "s-campus", 2020, 780, 400, -4, "august, again", "vintage");
    b.sticker(null, "camera", 800, 420, 230, -8); b.sticker(null, "film-roll", 1900, 340, 170, 10); b.sticker(null, "postage-stamp", 2250, 1260, 150, 8); b.sticker(null, "postmark", 1960, 1320, 210, -6, { border: false }); b.sticker(null, "ticket-stub", 700, 1400, 210, 6);
    b.note("n", "light leaks, dust,\nthe smell of the darkroom.", 1380, 1480, 480, -2, { font: "type", fs: 34, paper: { shape: "torn", texture: "aged", color: "#e8d6ac" } });
  } },
  { id: "diary", name: "the photo-diary board", desc: "dated moments and daily notes", mood: "film", size: "landscape", build(b) {
    b.text("t", "this month, in pictures", 1200, 160, 1600, "hand", 112);
    const days = ["mon", "tue", "wed", "thu", "fri"], ph = ["s-coffee", "s-desk", "s-forest", "s-sunrise", "s-ocean"];
    days.forEach((d, i) => { b.photo("p" + i, ph[i], 340 + i * 440, 700 + (i % 2) * 120, 330, (i % 2 ? 3 : -3), d + ".", "polaroid"); b.note("n" + i, ["coffee and a clear head", "finally cracked it", "walked until sunset", "up before the sun", "salt in my hair"][i], 340 + i * 440, 1230 + (i % 2) * 90, 320, (i % 2 ? -2 : 2), { fs: 38 }); });
    b.sticker(null, "calendar-page", 2200, 330, 190, 8); b.sticker(null, "star-doodle", 250, 350, 120, -10); b.sticker(null, "washi-tape", 1200, 330, 200, -3, { border: false });
    b.link("p0", "p1", { sag: 0.1 }); b.link("p1", "p2"); b.link("p2", "p3"); b.link("p3", "p4");
  } },
  { id: "longgame", name: "the long game", desc: "boards → Pearson → company → Ph.D. → professor", mood: "film", size: "landscape", build(b) {
    b.text("t", "the long game", 1200, 150, 1500, "condensed", 150, { color: "#9457eb", outline: { c: "#fffdf8", w: 8 } });
    b.sticker(null, "word-keep-going", 1200, 300, 340, -2, { border: false });
    b.photo("g1", "s-desk", 380, 720, 340, -4, "boards", "polaroid"); b.goal("g1", GOALS.boards);
    b.photo("g2", "s-campus", 860, 560, 380, 3, "my dream university", "instant"); b.goal("g2", GOALS.pearson);
    b.photo("g3", "s-city", 1340, 840, 340, -3, "a company that sets the bar", "polaroid"); b.goal("g3", GOALS.company);
    b.photo("g4", "s-lights", 1800, 580, 340, 4, "one good question", "polaroid"); b.goal("g4", GOALS.phd);
    b.photo("g5", "s-forest", 2150, 1000, 340, -3, "the teacher i'll be", "polaroid"); b.goal("g5", GOALS.prof);
    b.note("n1", "now → boards\n(CBSE Grade 12)", 380, 1130, 320, -2, { fs: 36 });
    b.note("n2", "this cycle → Pearson\nask my counsellor first", 860, 1010, 340, 2, { fs: 36, paper: { shape: "label", texture: "grain", color: "#fff1a8" } });
    b.note("n3", "undergrad →\ninternships, projects", 1340, 1290, 330, -2, { fs: 36 });
    b.note("n4", "after → research", 1800, 1030, 300, 3, { fs: 36 });
    b.note("n5", "per aspera ad astra.\nthrough hardships to the stars.", 1200, 1490, 760, 0, { font: "serif", fs: 54, align: "center", paper: { shape: "torn", texture: "plain", color: "#f6efe0" } });
    b.sticker(null, "graduation-cap", 250, 330, 190, -10); b.sticker(null, "star-doodle", 2200, 340, 160, 10); b.sticker(null, "trophy", 1560, 330, 170, 8);
    b.link("g1", "g2", { label: "step one", sag: 0.16 }); b.link("g2", "g3", { sag: 0.16 }); b.link("g3", "g4", { label: "why it matters", sag: 0.16 }); b.link("g4", "g5", { sag: 0.16 });
  } }
];

/* build a template into a fresh board document (does not touch the open board) */
VB.buildTemplate = id => {
  const t = VB.TEMPLATES.find(x => x.id === id); if (!t) return null;
  const doc = VB.newDoc(t.name, t.size);
  VB.applyMood(doc, t.mood);
  doc.categories.forEach(c => { c.on = false; });
  const b = builder(doc);
  t.build(b);
  doc.elements.forEach(e => { if (e.type === "text") VB.layoutText(e); });
  return doc;
};
VB.templateAssets = id => { const d = VB.buildTemplate(id); return d ? VB.assetIdsOf(d.elements) : []; };
})();
