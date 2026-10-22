/* Sticker library for the scrapbook vision board.
   Plain browser JS. Each sticker's svg(a,b) returns INNER svg markup only. */
(function () {
'use strict';

const INK = '#0a0030', CREAM = '#f5ffcf', WHITE = '#fefbff', PAPER = '#efe3c8', KRAFT = '#c9a574', RED = '#d9382a', SILVER = '#c9c9d4';
const CAP = 'stroke-linecap="round" stroke-linejoin="round"';
const K = `stroke="${INK}" stroke-width="3" ${CAP}`;

/* ---------- tiny drawing helpers ---------- */
const P = (d, f, sw) => `<path d="${d}" fill="${f}" stroke="${INK}" stroke-width="${sw || 3}" ${CAP}/>`;
const PE = (d, f) => `<path d="${d}" fill="${f}" fill-rule="evenodd" ${K}/>`;
const N = (d, sw, col) => `<path d="${d}" fill="none" stroke="${col || INK}" stroke-width="${sw || 3}" ${CAP}/>`;
const OL = (d, col, w, o) => N(d, (w || 5) + 2 * (o || 2)) + N(d, w || 5, col);
const E = (cx, cy, rx, ry, f, rot, sw) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" stroke="${INK}" stroke-width="${sw || 3}" ${CAP}${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
const C = (cx, cy, r, f, sw) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" stroke="${INK}" stroke-width="${sw || 3}" ${CAP}/>`;
const D = (cx, cy, r, f) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"/>`;
const HL = (cx, cy, rx, ry, rot) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${WHITE}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
const G = (tf, inner) => `<g transform="${tf}">${inner}</g>`;
const T = (x, y, str, fam, size, weight, fill, extra) =>
  `<text x="${x}" y="${y}" font-family="${fam}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle"${extra ? ' ' + extra : ''}>${str}</text>`;
const R = n => Math.round(n * 10) / 10;

/* four-point sparkle */
function spark(cx, cy, r, f, p) {
  p = p == null ? 0.14 : p;
  const q = r * p;
  return P(`M${cx} ${cy - r} Q${cx + q} ${cy - q} ${cx + r} ${cy} Q${cx + q} ${cy + q} ${cx} ${cy + r} Q${cx - q} ${cy + q} ${cx - r} ${cy} Q${cx - q} ${cy - q} ${cx} ${cy - r}Z`, f);
}
/* n-point star / burst polygon */
function starPath(cx, cy, n, ro, ri, rot) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const ang = (rot || -90) * Math.PI / 180 + i * Math.PI / n;
    d += (i ? 'L' : 'M') + R(cx + r * Math.cos(ang)) + ' ' + R(cy + r * Math.sin(ang));
  }
  return d + 'Z';
}
/* scalloped circle: n bumps of radius br on circle radius r */
function scallop(cx, cy, r, n, br) {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const ang = i * 2 * Math.PI / n - Math.PI / 2;
    const x = R(cx + r * Math.cos(ang)), y = R(cy + r * Math.sin(ang));
    d += i === 0 ? `M${x} ${y}` : `A${br} ${br} 0 0 1 ${x} ${y}`;
  }
  return d + 'Z';
}
/* perforated rectangle (stamp) */
function perf(x, y, w, h, nx, ny) {
  const dx = w / nx, dy = h / ny;
  let d = `M${x} ${y}`;
  for (let i = 1; i <= nx; i++) d += `A${R(dx / 2)} ${R(dx / 2)} 0 0 0 ${R(x + i * dx)} ${y}`;
  for (let j = 1; j <= ny; j++) d += `A${R(dy / 2)} ${R(dy / 2)} 0 0 0 ${x + w} ${R(y + j * dy)}`;
  for (let i = 1; i <= nx; i++) d += `A${R(dx / 2)} ${R(dx / 2)} 0 0 0 ${R(x + w - i * dx)} ${y + h}`;
  for (let j = 1; j <= ny; j++) d += `A${R(dy / 2)} ${R(dy / 2)} 0 0 0 ${x} ${R(y + h - j * dy)}`;
  return d + 'Z';
}
/* ragged torn rectangle, deterministic */
function rag(x, y, w, h, step, amp, seed) {
  let s = seed || 7;
  const r = () => { s = (s * 16807) % 2147483647; return (s / 2147483647 - 0.5) * 2 * amp; };
  const pts = [];
  for (let t = 0; t < w; t += step) pts.push([x + t, y + r()]);
  for (let t = 0; t < h; t += step) pts.push([x + w + r() * 0.6, y + t]);
  for (let t = 0; t < w; t += step) pts.push([x + w - t, y + h + r()]);
  for (let t = 0; t < h; t += step) pts.push([x + r() * 0.6, y + h - t]);
  return 'M' + pts.map(p => R(p[0]) + ' ' + R(p[1])).join('L') + 'Z';
}
/* leaf shape in local coordinates, base at origin, pointing +x */
function leaf(x, y, ang, len, w, f, vein) {
  const d = `M0 0 C${R(len * .25)} ${-w} ${R(len * .75)} ${R(-w * .9)} ${len} 0 C${R(len * .75)} ${R(w * .9)} ${R(len * .25)} ${w} 0 0Z`;
  return G(`translate(${x} ${y}) rotate(${ang})`, P(d, f, 2.6) + (vein === false ? '' : N(`M3 0 L${R(len * .8)} 0`, 1.6)));
}

/* ---------- registry ---------- */
const list = [];
const S = (id, name, cat, tags, w, h, a, b, svg) => list.push({ id, name, cat, tags, w, h, a, b, svg });

/* =====================================================================
   DOODLES
   ===================================================================== */
S('star-doodle', 'star', 'doodles', ['star', 'sparkle', 'shine', 'favorite'], 100, 100, '#ffd000', '#cfff00', (a, b) =>
  P('M50 9 L61 36 L91 39 L68 58 L75 88 L50 72 L24 87 L32 58 L9 40 L39 36Z', a) +
  P('M50 33 L54 45 L67 46 L57 54 L61 66 L50 59 L39 66 L43 54 L33 46 L46 45Z', b, 2.4));

S('sparkle-four', 'sparkle', 'doodles', ['sparkle', 'twinkle', 'shine', 'star', 'magic'], 100, 100, '#cfff00', '#ffd000', (a, b) =>
  spark(42, 58, 37, a, .12) + spark(80, 22, 15, b, .14) + D(86, 78, 3.4, INK) + D(14, 20, 2.8, INK));

S('sparkle-cluster', 'sparkles', 'doodles', ['sparkles', 'stars', 'glitter', 'shine', 'magic'], 100, 100, '#9457eb', '#ffd000', (a, b) =>
  spark(38, 60, 32, a, .12) + spark(77, 27, 19, b, .13) + spark(80, 78, 12, CREAM, .15) + D(14, 20, 3, INK) + D(58, 88, 2.6, INK));

S('heart-doodle', 'heart', 'doodles', ['heart', 'love', 'valentine', 'like'], 100, 100, '#ff7eb6', '#ffd000', (a, b) =>
  P('M50 90 C20 68 7 50 11 33 C15 16 38 12 50 30 C62 13 85 16 89 34 C92 51 78 68 50 90Z', a) +
  N('M21 33 Q24 24 33 22', 3.4, WHITE) + D(40, 19, 0, b) + spark(84, 12, 8, b, .15));

S('flower-doodle', 'flower', 'doodles', ['flower', 'bloom', 'petal', 'spring', 'garden'], 100, 100, '#ff7eb6', '#ffd000', (a, b) => {
  const petal = 'M50 50 C32 43 33 8 50 8 C67 8 68 43 50 50Z';
  let s = '';
  for (let k = 0; k < 5; k++) s += G(`rotate(${k * 72} 50 50)`, P(petal, a));
  return s + C(50, 50, 11, b) + HL(46, 46, 3.4, 2.4, -30);
});

S('daisy-doodle', 'daisy', 'doodles', ['daisy', 'flower', 'white', 'bloom', 'spring'], 100, 100, '#fefbff', '#ffd000', (a, b) => {
  const petal = 'M50 50 C44 40 43 17 50 7 C57 17 56 40 50 50Z';
  let s = '';
  for (let k = 0; k < 12; k++) s += G(`rotate(${k * 30} 50 50)`, P(petal, a, 2.6));
  return s + C(50, 50, 12, b) + D(46, 47, 1.6, INK) + D(54, 46, 1.6, INK) + D(51, 55, 1.6, INK);
});

S('smiley-doodle', 'smiley', 'doodles', ['smiley', 'happy', 'face', 'smile', 'joy'], 100, 100, '#ffd000', '#ff7eb6', (a, b) =>
  P('M50 8 C74 6 94 26 92 52 C90 77 72 94 48 92 C24 90 8 72 9 48 C10 26 28 10 50 8Z', a) +
  E(36, 43, 3.6, 6.5, INK) + E(64, 42, 3.6, 6.5, INK) +
  D(24, 62, 6, b) + D(76, 62, 6, b) + N('M30 61 Q50 82 71 60', 3.6) + N('M22 26 Q28 17 38 14', 3.4, WHITE));

S('cloud-doodle', 'cloud', 'doodles', ['cloud', 'sky', 'weather', 'rain', 'dream'], 100, 100, '#fefbff', '#3daab8', (a, b) =>
  P('M24 66 C8 66 6 44 24 42 C22 24 44 16 52 30 C60 16 84 22 80 42 C96 44 94 66 78 66Z', a) +
  N('M20 56 Q22 50 28 49', 2.6, '#c9d6e8') +
  P('M30 74 Q36 82 30 88 Q24 82 30 74Z', b, 2.6) + P('M52 76 Q58 84 52 90 Q46 84 52 76Z', b, 2.6) + P('M72 74 Q78 82 72 88 Q66 82 72 74Z', b, 2.6));

S('sun-doodle', 'sun', 'doodles', ['sun', 'sunny', 'summer', 'bright', 'day'], 100, 100, '#ffd000', '#e0632b', (a, b) => {
  let s = '';
  for (let k = 0; k < 10; k++) s += G(`rotate(${k * 36} 50 50)`, P('M50 5 L57 21 L43 21Z', b, 2.6));
  return s + C(50, 50, 25, a) + E(41, 46, 2.6, 4.2, INK, 0, 1) + E(59, 46, 2.6, 4.2, INK, 0, 1) +
    N('M40 58 Q50 67 60 58', 3) + D(35, 57, 3.4, '#ff7eb6') + D(65, 57, 3.4, '#ff7eb6') + N('M34 36 Q38 31 44 30', 3, WHITE);
});

S('moon-doodle', 'moon', 'doodles', ['moon', 'night', 'crescent', 'sleep', 'dream'], 100, 100, '#ffd000', '#fefbff', (a, b) =>
  P('M62 8 C34 10 14 32 18 58 C22 82 50 94 76 84 C54 80 40 62 44 40 C46 26 52 16 62 8Z', a) +
  spark(80, 30, 13, b, .14) + spark(66, 66, 7, b, .15) + N('M25 50 Q26 38 33 30', 3.2, WHITE));

S('bolt-doodle', 'lightning', 'doodles', ['lightning', 'bolt', 'energy', 'power', 'zap'], 100, 100, '#ffd000', '#cfff00', (a, b) =>
  P('M58 6 L22 56 L45 56 L38 94 L80 38 L56 38Z', a) + N('M52 20 L38 42', 3, WHITE) +
  N('M86 14 L92 8 M90 24 L97 22 M12 70 L5 72 M16 82 L10 90', 3.4, b) );

S('music-note', 'music', 'doodles', ['music', 'note', 'song', 'melody', 'sound'], 100, 100, '#3daab8', '#ff7eb6', (a, b) =>
  P('M38 28 L80 18 L80 34 L38 44Z', b) + N('M38 72 V28 M80 64 V18', 4) +
  E(28, 76, 12.5, 9, a, -22) + E(70, 68, 12.5, 9, a, -22) + HL(24, 73, 4, 2.3, -22) + HL(66, 65, 4, 2.3, -22));

S('arrow-curved', 'curved arrow', 'doodles', ['arrow', 'curve', 'point', 'direction'], 100, 100, '#e0632b', '#ffd000', (a, b) =>
  OL('M12 82 C8 46 34 22 72 26', a, 6, 2.2) + OL('M54 8 L80 26 L58 46', a, 6, 2.2) + spark(82, 78, 11, b, .15) + D(16, 94, 2.6, INK));

S('arrow-straight', 'arrow', 'doodles', ['arrow', 'straight', 'point', 'direction', 'next'], 100, 60, '#9457eb', '#cfff00', (a, b) =>
  OL('M8 38 Q40 30 86 27', a, 6, 2.2) + OL('M66 10 L90 27 L68 46', a, 6, 2.2) + N('M16 34 Q40 27 60 26', 1.8, b));

S('spiral-doodle', 'spiral', 'doodles', ['spiral', 'swirl', 'curl', 'whirl'], 100, 100, '#ff7eb6', '#cfff00', (a, b) => {
  const d = 'M50 54 C46 54 46 47 51 47 C58 47 59 57 51 60 C41 63 38 46 47 39 C61 31 71 49 63 62 C53 77 30 70 30 47 C30 25 56 17 70 29 C86 42 84 68 66 80 C45 92 16 78 14 50';
  return N(d, 9, INK) + N(d, 4.6, a) + N('M50 54 C46 54 46 47 51 47', 1.5, b);
});

S('squiggle-doodle', 'squiggle', 'doodles', ['squiggle', 'wave', 'line', 'zigzag'], 100, 60, '#3daab8', '#fefbff', (a, b) => {
  const d = 'M8 34 C16 10 28 10 36 34 S56 58 64 34 S84 10 92 34';
  return OL(d, a, 6, 2.2) + N(d, 1.8, b);
});

S('wavy-underline', 'wavy underline', 'doodles', ['underline', 'wave', 'squiggle', 'line', 'highlight'], 140, 30, '#ff7eb6', '#fefbff', (a, b) => {
  const d = 'M8 16 C20 3 28 3 38 16 S58 29 70 16 S90 3 102 16 S122 29 132 16';
  return OL(d, a, 5.5, 2.2) + N(d, 1.6, b);
});

S('ring-highlight', 'highlight ring', 'doodles', ['circle', 'ring', 'highlight', 'loop', 'marker'], 100, 100, '#e0632b', '#ffd000', (a, b) =>
  OL('M68 12 C38 4 8 24 10 54 C12 84 50 98 80 80 C98 66 94 30 68 18 C58 13 48 12 38 15', a, 6, 2.2) +
  N('M64 18 C40 10 16 28 18 54 C20 76 44 88 70 78', 2, b));

S('scribble-underline', 'scribble underline', 'doodles', ['scribble', 'underline', 'marker', 'highlight', 'zigzag'], 140, 50, '#ff7eb6', '#cfff00', (a, b) =>
  N('M8 26 L132 24', 18, b) + N('M10 30 L128 10 L16 40 L130 24 L30 46 L118 36', 5.2, a));

S('crown-doodle', 'crown', 'doodles', ['crown', 'queen', 'king', 'royal', 'princess'], 100, 100, '#ffd000', '#ff7eb6', (a, b) =>
  P('M14 80 L8 31 L32 54 L50 17 L68 54 L92 31 L86 80Z', a) +
  P('M14 80 Q50 90 86 80 L84 67 Q50 77 16 67Z', b) +
  C(8, 28, 5, b, 2.6) + C(50, 13, 5, b, 2.6) + C(92, 28, 5, b, 2.6) +
  D(30, 75, 3.4, CREAM) + D(50, 78, 3.4, CREAM) + D(70, 75, 3.4, CREAM) + N('M24 52 L18 36', 3, WHITE));

S('rainbow-doodle', 'rainbow', 'doodles', ['rainbow', 'colour', 'sky', 'happy', 'arc'], 100, 86, '#ff7eb6', '#3daab8', (a, b) => {
  const arc = r => `M${50 - r} 64 A${r} ${r} 0 0 1 ${50 + r} 64`;
  return N(arc(40), 13) + N(arc(30), 13) + N(arc(20), 13) +
    N(arc(40), 8.4, a) + N(arc(30), 8.4, b) + N(arc(20), 8.4, '#ffd000') +
    P('M4 80 C-2 70 6 62 14 64 C16 54 30 52 34 62 C44 62 46 76 38 80Z', WHITE) +
    P('M96 80 C102 70 94 62 86 64 C84 54 70 52 66 62 C56 62 54 76 62 80Z', WHITE);
});

S('butterfly-doodle', 'butterfly', 'doodles', ['butterfly', 'wings', 'insect', 'spring', 'change'], 100, 100, '#9457eb', '#ffd000', (a, b) => {
  const half = P('M50 46 C60 12 94 10 92 38 C91 55 70 56 50 50Z', a) + P('M50 53 C70 52 87 62 79 80 C71 94 54 80 50 60Z', b) +
    C(77, 31, 6, WHITE, 2.4) + C(68, 72, 4, WHITE, 2.4);
  return half + G('translate(100 0) scale(-1 1)', half) +
    P('M50 28 Q56 50 50 78 Q44 50 50 28Z', INK) + N('M49 30 Q42 16 33 12 M51 30 Q58 16 67 12', 2.8) + D(33, 12, 2.6, INK) + D(67, 12, 2.6, INK);
});

S('burst-doodle', 'burst', 'doodles', ['burst', 'pop', 'bang', 'starburst', 'sticker'], 100, 100, '#ff7eb6', '#ffd000', (a, b) =>
  P(starPath(50, 50, 12, 44, 32), a) + C(50, 50, 18, b) + N('M40 42 Q44 37 50 36', 3, WHITE));

S('tulip-doodle', 'tulip', 'doodles', ['tulip', 'flower', 'spring', 'plant', 'bloom'], 100, 100, '#ff7eb6', '#2f9e5b', (a, b) =>
  N('M50 50 V92', 4.4, INK) + N('M50 50 V92', 2.2, b) +
  P('M50 90 C34 86 22 72 20 58 C36 62 48 74 50 90Z', b, 2.6) + P('M50 82 C66 80 78 68 80 54 C64 58 52 68 50 82Z', b, 2.6) +
  P('M26 24 C26 48 36 56 50 56 C64 56 74 48 74 24 L62 34 L50 14 L38 34Z', a) + N('M34 30 Q33 40 38 46', 2.6, WHITE));

S('cherries-doodle', 'cherries', 'doodles', ['cherry', 'cherries', 'fruit', 'sweet', 'red'], 100, 100, '#d9382a', '#2f9e5b', (a, b) =>
  N('M30 66 C34 40 46 22 68 12 M70 70 C68 44 66 26 68 12', 3.4, '#5a3a22') + P('M68 12 C80 6 92 12 94 22 C82 24 72 20 68 12Z', b, 2.6) +
  C(28, 74, 16, a) + C(70, 76, 16, a) + HL(22, 68, 4, 2.6, -40) + HL(64, 70, 4, 2.6, -40));

/* =====================================================================
   SCRAPBOOK
   ===================================================================== */
S('torn-paper', 'torn paper', 'scrapbook', ['paper', 'torn', 'scrap', 'note', 'beige', 'vintage'], 120, 90, PAPER, KRAFT, (a, b) =>
  P(rag(8, 9, 104, 72, 12, 3.2, 11), a, 2.4) + N('M22 30 H98 M22 44 H92 M22 58 H100', 2, b));

S('postage-stamp', 'postage stamp', 'scrapbook', ['stamp', 'postage', 'mail', 'post', 'vintage', 'travel'], 80, 100, '#9fd3d8', '#2f9e5b', (a, b) =>
  P(perf(4, 4, 72, 92, 8, 10), WHITE, 2.4) +
  P('M15 14 H65 V70 H15Z', a, 2.4) + C(50, 30, 7, '#ffd000', 2.4) +
  P('M15 70 C24 46 38 44 48 56 C54 50 60 50 65 55 V70Z', b, 2.4) + N('M32 62 V54 M28 56 L32 50 L36 56', 2) +
  N('M20 80 H60 M26 87 H54', 2.4));

S('postmark', 'postmark', 'scrapbook', ['postmark', 'cancel', 'stamp', 'ink', 'mail', 'vintage'], 140, 92, '#1d1648', '#1d1648', (a, b) => {
  const wave = y => N(`M92 ${y} q5.5 -6 11 0 t11 0 t11 0 t11 0`, 3, b);
  return C(46, 46, 38, 'none', 3).replace(INK, a) + C(46, 46, 30, 'none', 2).replace(INK, a) +
    `<circle cx="46" cy="46" r="34" fill="none" stroke="${a}" stroke-width="2" stroke-dasharray="2 5" ${CAP}/>` +
    `<path d="${starPath(46, 46, 5, 14, 6)}" fill="${a}" stroke="${a}" stroke-width="2" ${CAP}/>` +
    wave(26) + wave(40) + wave(54) + wave(68);
});

S('tag-string', 'tag with string', 'scrapbook', ['tag', 'label', 'string', 'paper', 'gift', 'price'], 76, 124, PAPER, RED, (a, b) =>
  N('M38 46 C14 40 18 6 38 6 C60 6 60 40 38 46', 4.4, b) +
  P('M22 28 H54 L64 40 V118 H12 V40Z', a) + N('M22 84 H54 M20 96 H56 M24 108 H52', 2, KRAFT) +
  C(38, 46, 7.5, WHITE, 2.6) + D(38, 46, 3.2, INK));

S('ribbon-wave', 'ribbon', 'scrapbook', ['ribbon', 'strip', 'banner', 'decor', 'wavy'], 140, 50, '#ff7eb6', WHITE, (a, b) =>
  P('M8 14 C30 2 50 26 72 14 S112 2 132 14 L124 25 L132 36 C112 24 92 48 70 36 S30 24 8 36 L16 25Z', a) +
  N('M18 25 C34 14 52 38 72 25 S108 14 122 25', 2.4, b).replace('stroke-linecap', 'stroke-dasharray="4 5" stroke-linecap'));

S('bow-ribbon', 'bow', 'scrapbook', ['bow', 'ribbon', 'gift', 'cute', 'coquette'], 100, 92, '#ff7eb6', '#d9568f', (a, b) => {
  const half = P('M46 50 L30 88 L40 82 L46 90 L54 54Z', b) +
    P('M46 38 C30 6 2 14 7 40 C10 60 32 60 46 46Z', a) + N('M38 38 C26 26 16 28 14 38', 2.4, WHITE);
  return half + G('translate(100 0) scale(-1 1)', half) + E(50, 44, 9, 11, b);
});

S('ticket-stub', 'ticket stub', 'scrapbook', ['ticket', 'stub', 'admit', 'event', 'movie', 'concert'], 120, 70, '#ffd000', '#e0632b', (a, b) =>
  P('M6 8 H114 V26 A9 9 0 0 0 114 44 V62 H6 V44 A9 9 0 0 0 6 26Z', a) +
  N('M88 11 V59', 2.4, INK).replace('stroke-linecap', 'stroke-dasharray="3 4" stroke-linecap') +
  P(starPath(44, 35, 5, 16, 7), b, 2.6) + N('M70 22 H80 M70 35 H80 M70 48 H80', 2.6) +
  N('M96 22 V48 M100 22 V48 M104 22 V48 M108 22 V48', 2.2) + N('M96 22 V48', 3.6));

S('envelope', 'envelope', 'scrapbook', ['envelope', 'mail', 'letter', 'post', 'message', 'love'], 110, 78, PAPER, '#e5d3a8', (a, b) =>
  P('M8 12 L102 10 L104 68 L6 70Z', a) + N('M8 68 L44 38 M102 66 L66 38', 2.4) +
  P('M6 12 L55 50 L104 10Z', b) + P('M55 52 C46 46 44 40 49 38 C52 37 54 39 55 41 C56 39 58 37 61 38 C66 40 64 46 55 52Z', RED, 2.4));

S('film-strip', 'film strip', 'scrapbook', ['film', 'strip', 'negative', 'photo', 'movie', 'camera'], 140, 60, '#ff7eb6', '#3daab8', (a, b) => {
  let holes = '';
  for (let i = 0; i < 9; i++) holes += `<rect x="${11 + i * 14}" y="12" width="7" height="6" rx="1.6" fill="${CREAM}"/><rect x="${11 + i * 14}" y="42" width="7" height="6" rx="1.6" fill="${CREAM}"/>`;
  return P('M4 7 H136 V53 H4Z', INK) + holes +
    `<rect x="9" y="21" width="38" height="18" rx="2" fill="${a}"/><rect x="51" y="21" width="38" height="18" rx="2" fill="${b}"/><rect x="93" y="21" width="38" height="18" rx="2" fill="${CREAM}"/>` +
    D(36, 27, 4, WHITE) + `<path d="M51 39 L62 27 L70 35 L76 30 L89 39Z" fill="${WHITE}"/>` +
    `<path d="M112 36 C104 31 103 26 107 25 C110 24 112 26 112 28 C112 26 114 24 117 25 C121 26 120 31 112 36Z" fill="${RED}"/>`;
});

S('paper-heart', 'paper heart', 'scrapbook', ['heart', 'paper', 'craft', 'love', 'folded'], 100, 100, '#ff7eb6', '#e65a97', (a, b) =>
  P('M50 90 C20 68 8 50 12 34 C16 16 38 14 50 30Z', a) + P('M50 90 C80 68 92 50 88 34 C84 16 62 14 50 30Z', b) +
  N('M50 36 V82', 2.4, WHITE).replace('stroke-linecap', 'stroke-dasharray="3 4" stroke-linecap') + N('M22 36 Q25 28 32 26', 3, WHITE));

S('kraft-tag', 'kraft tag', 'scrapbook', ['tag', 'kraft', 'label', 'paper', 'price', 'brown'], 120, 76, KRAFT, '#7a5a3a', (a, b) =>
  N('M30 38 C10 36 2 14 14 8 C22 4 30 10 32 22', 3.8, b) +
  P('M34 12 H108 Q112 12 112 16 V60 Q112 64 108 64 H34 L8 38Z', a) +
  N('M48 26 H100 M48 38 H92 M48 50 H102', 2.2, '#a8834f') + C(28, 38, 8, CREAM, 2.6) + D(28, 38, 3.2, INK));

S('bunting-flags', 'bunting', 'scrapbook', ['bunting', 'flags', 'party', 'banner', 'celebrate', 'garland'], 140, 64, '#ff7eb6', '#ffd000', (a, b) => {
  const cols = [a, b, CREAM, b, a];
  let s = '';
  [0.1, 0.3, 0.5, 0.7, 0.9].forEach((t, i) => {
    const x = 6 + 128 * t, y = 14 + 52 * t * (1 - t), sl = 0.406 * (1 - 2 * t);
    s += P(`M${R(x - 11)} ${R(y - 11 * sl)} L${R(x + 11)} ${R(y + 11 * sl)} L${R(x)} ${R(y + 32)}Z`, cols[i], 2.6);
  });
  return s + N('M6 14 Q70 40 134 14', 3);
});

S('doily', 'doily', 'scrapbook', ['doily', 'lace', 'scallop', 'vintage', 'circle', 'craft'], 100, 100, '#fefbff', KRAFT, (a, b) => {
  let holes = '';
  for (let i = 0; i < 12; i++) {
    const an = i * Math.PI / 6, x = R(50 + 31 * Math.cos(an)), y = R(50 + 31 * Math.sin(an));
    holes += `M${R(x - 4.6)} ${y}a4.6 4.6 0 1 0 9.2 0a4.6 4.6 0 1 0 -9.2 0`;
  }
  return PE(scallop(50, 50, 44, 18, 8.6) + holes, a) + C(50, 50, 21, 'none', 2).replace(INK, b) +
    `<circle cx="50" cy="50" r="12" fill="${b}" stroke="${INK}" stroke-width="2.4"/>`;
});

S('folded-note', 'folded note', 'scrapbook', ['note', 'letter', 'heart', 'folded', 'love', 'paper'], 100, 100, '#fefbff', '#ff7eb6', (a, b) =>
  P('M10 10 L72 10 L90 28 L90 90 L10 90Z', a) + P('M72 10 L72 28 L90 28Z', CREAM, 2.6) +
  N('M20 26 Q28 22 36 26 T52 26 M20 38 Q30 34 40 38', 2.2) +
  P('M50 80 C32 68 30 54 38 50 C44 48 48 52 50 56 C52 52 58 48 62 50 C70 54 68 68 50 80Z', b, 2.6));

S('pressed-flowers', 'pressed flowers', 'scrapbook', ['flower', 'pressed', 'botanical', 'corner', 'dried', 'vintage'], 100, 100, '#8aa05a', '#d9a0a0', (a, b) => {
  const fl = (x, y, r) => {
    let s = '';
    for (let k = 0; k < 5; k++) { const an = k * 72 * Math.PI / 180; s += C(R(x + r * Math.cos(an)), R(y + r * Math.sin(an)), r * .62, b, 2.2); }
    return s + C(x, y, r * .55, '#ffd000', 2);
  };
  return N('M10 94 C26 74 44 52 68 24', 3.4, '#5a3a22') + N('M30 74 C32 58 40 48 50 40', 2.6, '#5a3a22') +
    leaf(22, 84, -62, 22, 8, a) + leaf(38, 66, 14, 24, 8, a) + leaf(44, 56, -100, 22, 7, a) + leaf(56, 42, -10, 20, 7, a) + leaf(58, 38, -90, 20, 7, a) +
    fl(68, 22, 9) + fl(50, 36, 7) + fl(28, 62, 6) + fl(86, 60, 6) + N('M70 74 C78 70 82 66 86 60', 2.2, '#5a3a22') + leaf(76, 72, 40, 14, 5, a);
});

S('washi-tape', 'washi tape', 'scrapbook', ['tape', 'washi', 'decor', 'stripe', 'craft'], 110, 40, '#ff7eb6', '#fefbff', (a, b) =>
  P('M8 8 L14 12 L8 17 L14 22 L8 27 L14 32 L8 36 L98 36 L104 32 L98 27 L104 22 L98 17 L104 12 L98 8Z', a, 2.4) +
  N('M26 9 L16 35 M44 9 L34 35 M62 9 L52 35 M80 9 L70 35 M98 9 L88 35', 4, b));

S('polaroid', 'polaroid', 'scrapbook', ['photo', 'polaroid', 'frame', 'picture', 'memory', 'snapshot'], 90, 106, '#fefbff', '#9fd3d8', (a, b) =>
  P('M8 6 H82 V100 H8Z', a, 2.8) + P('M16 14 H74 V74 H16Z', b, 2.4) +
  C(56, 34, 7, '#ffd000', 2.2) + P('M16 74 L36 44 L50 62 L58 52 L74 74Z', '#2f9e5b', 2.4) + N('M22 88 Q34 82 46 88 T68 88', 2.2));

S('sticky-note', 'sticky note', 'scrapbook', ['note', 'sticky', 'memo', 'post-it', 'reminder'], 100, 100, '#ffd000', '#d9382a', (a, b) =>
  P('M10 12 L90 10 L92 66 L72 90 L10 90Z', a) + P('M92 66 L72 90 L72 68Z', '#e6b800', 2.6) +
  N('M22 30 H78 M22 44 H70 M22 58 H54', 2.8) + N('M24 78 L28 82 L36 74', 3, b));

/* =====================================================================
   LIFESTYLE
   ===================================================================== */
S('camera', 'camera', 'lifestyle', ['camera', 'photo', 'photography', 'snap', 'picture'], 100, 80, '#e0632b', '#3daab8', (a, b) =>
  P('M8 28 Q8 22 14 22 H30 L36 12 H64 L70 22 H86 Q92 22 92 28 V68 Q92 74 86 74 H14 Q8 74 8 68Z', a) +
  N('M9 36 H91', 2.6) + C(50, 50, 20, WHITE) + C(50, 50, 13, b, 2.6) + D(50, 50, 5, INK) + HL(45, 44, 4, 2.6, -30) +
  `<rect x="74" y="26" width="9" height="6" rx="1.8" fill="#ffd000" stroke="${INK}" stroke-width="2.2"/>` + D(20, 31, 2.4, INK));

S('film-roll', 'film roll', 'lifestyle', ['film', 'roll', '35mm', 'photo', 'analog', 'canister'], 100, 100, '#ffd000', '#d9382a', (a, b) =>
  P('M78 66 H96 V80 H78Z', INK, 2.6) + D(84, 70, 1.8, CREAM) + D(90, 70, 1.8, CREAM) + D(84, 76, 1.8, CREAM) + D(90, 76, 1.8, CREAM) +
  P('M44 6 H56 V18 H44Z', SILVER, 2.6) + P('M20 30 V82 Q20 92 50 92 Q80 92 80 82 V30Z', a) +
  P('M16 18 H84 V32 H16Z', SILVER) + P('M26 50 H74 V76 H26Z', WHITE, 2.6) + P('M26 50 H74 V58 H26Z', b, 2.4) + N('M32 67 H62', 2.4));

S('open-book', 'open book', 'lifestyle', ['book', 'read', 'study', 'novel', 'open', 'library'], 100, 100, '#9457eb', '#ff7eb6', (a, b) =>
  P('M2 24 V84 C20 78 36 78 50 90 C64 78 80 78 98 84 V24Z', a) +
  P('M50 28 C36 18 20 18 8 24 V76 C20 72 36 72 50 82Z', WHITE) + P('M50 28 C64 18 80 18 92 24 V76 C80 72 64 72 50 82Z', WHITE) +
  N('M16 34 Q28 30 42 36 M16 44 Q28 40 42 46 M16 54 Q28 50 42 56 M58 36 Q72 30 84 34 M58 46 Q72 40 84 44', 2) +
  P('M56 78 V96 L60 92 L64 96 V80Z', b, 2.4));

S('book-stack', 'books', 'lifestyle', ['books', 'stack', 'library', 'read', 'study', 'learn'], 100, 100, '#3daab8', '#ff7eb6', (a, b) =>
  P('M8 72 H92 V92 H8Z', a) + N('M18 72 V92 M24 72 V92', 2.6) + `<rect x="74" y="78" width="12" height="8" rx="1.6" fill="#ffd000"/>` +
  P('M14 50 H84 V72 H14Z', b) + N('M70 50 V72 M76 50 V72', 2.6) + `<rect x="24" y="56" width="22" height="10" rx="1.6" fill="${CREAM}"/>` +
  P('M22 32 H78 V50 H22Z', RED) + N('M30 32 V50 M36 32 V50', 2.6) +
  G('rotate(-8 50 18)', P('M32 12 H72 V30 H32Z', CREAM) + N('M32 17 H72', 2.4) + N('M32 25 H72', 2.4)));

S('laptop', 'laptop', 'lifestyle', ['laptop', 'computer', 'work', 'code', 'study', 'tech'], 100, 85, '#9457eb', '#ff7eb6', (a, b) =>
  P('M20 8 H80 Q84 8 84 12 V60 H16 V12 Q16 8 20 8Z', a) + P('M23 14 H77 V54 H23Z', CREAM, 2.4) +
  `<rect x="29" y="20" width="22" height="6" rx="2" fill="${b}"/>` + N('M29 34 H70 M29 42 H60', 2.4) + P('M64 22 C60 19 59 16 62 16 C63 16 64 17 64 18 C64 17 65 16 66 16 C69 16 68 19 64 22Z', RED, 1.6) +
  P('M6 62 H94 L90 74 Q89 77 86 77 H14 Q11 77 10 74Z', SILVER) + N('M42 68 H58', 2.6));

S('headphones', 'headphones', 'lifestyle', ['headphones', 'music', 'listen', 'audio', 'podcast'], 100, 100, '#ff7eb6', '#cfff00', (a, b) =>
  N('M20 58 C14 8 86 8 80 58', 9) +
  N('M20 58 C14 8 86 8 80 58', 5, b) +
  P('M10 50 H26 Q30 50 30 54 V78 Q30 82 26 82 H10 Q6 82 6 78 V54 Q6 50 10 50Z', a) +
  P('M74 50 H90 Q94 50 94 54 V78 Q94 82 90 82 H74 Q70 82 70 78 V54 Q70 50 74 50Z', a) +
  N('M14 58 V72 M78 58 V72', 2.6, WHITE));

S('coffee-cup', 'coffee', 'lifestyle', ['coffee', 'cup', 'tea', 'cafe', 'morning', 'mug'], 100, 100, '#fefbff', '#3daab8', (a, b) =>
  N('M34 28 C28 20 40 16 34 8 M50 28 C44 20 56 16 50 8 M66 28 C60 20 72 16 66 8', 3) +
  E(48, 88, 36, 7, b) + N('M76 48 C98 44 98 74 72 74', 4.5) +
  P('M16 38 H78 L72 82 Q70 88 64 88 H30 Q24 88 22 82Z', a) + E(47, 38, 31, 6.5, '#6b4226', 0, 2.6) + N('M26 54 L30 76', 3, '#dcd3e6'));

S('pencil', 'pencil', 'lifestyle', ['pencil', 'write', 'draw', 'school', 'sketch', 'art'], 100, 100, '#ffd000', '#ff7eb6', (a, b) =>
  G('rotate(-45 50 50)',
    P('M4 50 L20 40 V60Z', '#f2c48d', 2.6) + P('M4 50 L9.6 46.7 V53.3Z', INK, 1.6) +
    P('M20 40 H74 V60 H20Z', a) + N('M20 46 H74 M20 54 H74', 1.8) +
    P('M74 40 H84 V60 H74Z', SILVER, 2.6) + N('M79 40 V60', 1.6) +
    P('M84 40 H92 Q99 40 99 50 Q99 60 92 60 H84Z', b)));

S('plant-pot', 'plant', 'lifestyle', ['plant', 'pot', 'houseplant', 'green', 'grow', 'garden'], 100, 100, '#e0632b', '#2f9e5b', (a, b) =>
  P('M50 62 C38 50 34 30 46 12 C60 28 60 48 50 62Z', b) + P('M48 64 C32 64 17 54 15 38 C32 38 46 48 48 64Z', b) + P('M52 64 C68 64 83 54 85 38 C68 38 54 48 52 64Z', b) +
  N('M50 58 V26 M46 58 L26 46 M54 58 L74 46', 2, '#1d6f3f') +
  P('M26 66 H74 L68 92 Q67 96 62 96 H38 Q33 96 32 92Z', a) + P('M21 58 H79 V69 H21Z', a) + N('M28 80 L31 90', 3, WHITE));

S('leaf-branch', 'leaf branch', 'lifestyle', ['leaf', 'branch', 'plant', 'nature', 'botanical', 'green'], 100, 100, '#2f9e5b', '#8fd18a', (a, b) =>
  N('M14 92 C30 62 56 38 88 14', 3.2, '#5a3a22') +
  leaf(22, 82, -108, 26, 9, a) + leaf(26, 76, 4, 26, 9, b) + leaf(36, 64, -108, 26, 9, b) + leaf(42, 58, 4, 26, 9, a) +
  leaf(52, 47, -104, 24, 8, a) + leaf(58, 42, 4, 24, 8, b) + leaf(68, 32, -100, 22, 8, b) + leaf(72, 28, 4, 20, 7, a) + leaf(84, 17, -42, 14, 6, a));

S('airplane', 'airplane', 'lifestyle', ['airplane', 'plane', 'travel', 'flight', 'trip', 'vacation'], 100, 100, '#fefbff', '#3daab8', (a, b) =>
  G('translate(50 50) rotate(45) scale(.88) translate(-50 -50)',
    P('M42 40 L8 62 L8 70 L42 58Z', b) + P('M58 40 L92 62 L92 70 L58 58Z', b) +
    P('M44 78 L30 90 L30 95 L48 88Z', b) + P('M56 78 L70 90 L70 95 L52 88Z', b) +
    P('M50 5 C57 13 59 28 59 44 L59 74 L52 90 L48 90 L41 74 L41 44 C41 28 43 13 50 5Z', a) +
    P('M45 16 Q50 11 55 16 Q50 21 45 16Z', INK, 2) + N('M46 34 V60 M54 34 V60', 2.4, '#9fb8d8')));

S('suitcase', 'suitcase', 'lifestyle', ['suitcase', 'luggage', 'travel', 'trip', 'bag', 'vacation'], 100, 90, '#e0632b', '#ffd000', (a, b) =>
  N('M36 30 V20 Q36 13 43 13 H57 Q64 13 64 20 V30', 4.2) +
  P('M10 30 H90 Q94 30 94 34 V78 Q94 82 90 82 H10 Q6 82 6 78 V34 Q6 30 10 30Z', a) +
  P('M21 30 H29 V82 H21Z', b, 2.6) + P('M71 30 H79 V82 H71Z', b, 2.6) +
  `<rect x="42" y="42" width="16" height="10" rx="2.4" fill="${CREAM}" stroke="${INK}" stroke-width="2.6"/>` + D(50, 47, 1.8, INK) + N('M12 38 Q14 36 17 36', 2.6, WHITE));

S('folded-map', 'map', 'lifestyle', ['map', 'travel', 'explore', 'route', 'adventure', 'navigate'], 100, 100, PAPER, '#3daab8', (a, b) =>
  P('M6 20 L36 14 L36 82 L6 88Z', a) + P('M36 14 L66 22 L66 90 L36 82Z', CREAM) + P('M66 22 L94 16 L94 84 L66 90Z', a) +
  N('M12 34 C20 40 26 52 22 66 M40 30 C50 40 58 38 62 50 M72 38 C80 46 86 44 90 56', 3, b) +
  N('M12 74 L18 68 L26 76 L34 60 L44 66 L52 54 L62 64 L76 50 L86 60', 2.4, RED).replace('stroke-linecap', 'stroke-dasharray="3 4" stroke-linecap') +
  N('M80 66 l8 8 M88 66 l-8 8', 3.4, RED));

S('compass', 'compass', 'lifestyle', ['compass', 'direction', 'north', 'explore', 'navigate', 'adventure'], 100, 100, '#e0632b', '#ffd000', (a, b) =>
  P('M44 16 H56 V8 H44Z', b, 2.6) + C(50, 56, 38, a) + C(50, 56, 29, CREAM, 2.6) +
  N('M50 30 V34 M50 78 V82 M24 56 H28 M72 56 H76', 2.6) +
  G('rotate(38 50 56)', P('M50 28 L43 56 L57 56Z', RED, 2.4) + P('M50 84 L43 56 L57 56Z', WHITE, 2.4)) + C(50, 56, 3.4, INK, 1));

S('dumbbell', 'dumbbell', 'lifestyle', ['dumbbell', 'gym', 'fitness', 'workout', 'weights', 'strong'], 100, 100, '#3daab8', '#ffd000', (a, b) =>
  G('rotate(-25 50 50)',
    OL('M30 50 H70', SILVER, 6, 2) +
    P('M12 28 H24 Q27 28 27 31 V69 Q27 72 24 72 H12 Q9 72 9 69 V31 Q9 28 12 28Z', a) + P('M27 35 H35 V65 H27Z', b, 2.6) +
    P('M88 28 H76 Q73 28 73 31 V69 Q73 72 76 72 H88 Q91 72 91 69 V31 Q91 28 88 28Z', a) + P('M73 35 H65 V65 H73Z', b, 2.6) +
    N('M14 36 V50', 2.6, WHITE) + N('M86 36 V50', 2.6, WHITE)));

S('running-shoe', 'sneaker', 'lifestyle', ['shoe', 'sneaker', 'running', 'sport', 'run', 'fitness'], 100, 90, '#ff7eb6', '#fefbff', (a, b) =>
  P('M10 62 L12 32 Q14 26 22 27 L34 30 Q44 42 58 46 Q80 50 92 62 Q96 66 92 72 H10Z', a) +
  P('M8 70 H93 Q97 70 95 78 Q93 84 87 84 H14 Q8 84 8 77Z', b) +
  N('M20 62 Q42 54 70 62', 3.4, '#ffd000') + N('M40 36 L46 42 M34 42 L40 48 M48 40 L54 46', 2.6) + N('M14 40 Q14 34 18 31', 2.6, WHITE));

S('house-doodle', 'house', 'lifestyle', ['house', 'home', 'cozy', 'property', 'dream home', 'building'], 100, 100, '#e0632b', '#3daab8', (a, b) =>
  P('M64 28 V12 H78 V40Z', RED) + P('M18 48 H82 V90 H18Z', CREAM) + P('M8 52 L50 14 L92 52Z', a) +
  P('M42 90 V66 Q42 59 50 59 Q58 59 58 66 V90Z', b) + D(54, 76, 1.8, INK) +
  `<rect x="24" y="58" width="12" height="12" rx="1.6" fill="#ffd000" stroke="${INK}" stroke-width="2.4"/>` +
  `<rect x="64" y="58" width="12" height="12" rx="1.6" fill="#ffd000" stroke="${INK}" stroke-width="2.4"/>` + N('M30 58 V70 M24 64 H36', 1.6));

S('key-vintage', 'key', 'lifestyle', ['key', 'vintage', 'unlock', 'home', 'secret', 'antique'], 100, 100, '#ffd000', KRAFT, (a, b) =>
  G('rotate(-38 50 50)',
    P('M40 45 H90 V55 H40Z', a) + P('M72 55 V68 H80 V55Z', a) + P('M84 55 V64 H90 V55Z', a) +
    PE('M8 50 a19 19 0 1 0 38 0 a19 19 0 1 0 -38 0 M20 50 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0', a) +
    N('M14 40 Q18 31 26 29', 3, WHITE)));

S('graduation-cap', 'grad cap', 'lifestyle', ['graduation', 'cap', 'school', 'degree', 'college', 'university'], 100, 100, '#1d1648', '#ffd000', (a, b) =>
  P('M26 50 V68 Q50 82 74 68 V50 L50 60Z', '#3a2f7a') +
  P('M50 18 L96 38 L50 58 L4 38Z', a) + N('M50 38 L88 42 V68', 2.6, b) + P('M88 68 L83 84 H93Z', b, 2.4) + C(50, 38, 3.6, b, 2) + N('M20 36 L42 26', 2.6, '#6a5fb0'));

S('diploma-scroll', 'diploma', 'lifestyle', ['diploma', 'scroll', 'graduation', 'degree', 'certificate', 'achievement'], 100, 80, '#f5ffcf', '#d9382a', (a, b) =>
  P('M16 14 H84 V66 H16Z', a) +
  P('M16 14 C4 14 4 66 16 66 C26 66 26 14 16 14Z', '#eadcb8') + P('M84 14 C72 14 72 66 84 66 C96 66 96 14 84 14Z', '#eadcb8') +
  N('M16 22 C12 28 12 50 16 58', 1.8) + N('M84 22 C80 28 80 50 84 58', 1.8) +
  N('M34 28 H66 M32 40 H68 M38 52 H62', 2.2) +
  P('M43 14 V66 H57 V14Z', b) + P('M50 40 C44 32 54 28 50 40 C46 52 56 48 50 40Z', b, 1) + C(50, 40, 6, '#ffd000', 2.4));

S('lightbulb', 'idea', 'lifestyle', ['lightbulb', 'idea', 'light', 'think', 'creative', 'inspiration'], 100, 100, '#ffd000', '#cfff00', (a, b) =>
  N('M14 18 L8 12 M86 18 L92 12 M8 44 H2 M92 44 H98 M50 6 V1', 3.2, b) +
  P('M50 12 C26 12 17 32 23 47 C27 57 37 61 37 73 H63 C63 61 73 57 77 47 C83 32 74 12 50 12Z', a) +
  N('M41 62 V48 C41 41 47 41 47 48 C47 55 53 55 53 48 C53 41 59 41 59 48 V62', 2.6) + P('M37 73 H63 V80 H37Z', SILVER, 2.6) + P('M42 80 H58 Q58 90 50 90 Q42 90 42 80Z', SILVER, 2.6) + N('M30 30 Q34 22 42 20', 3.2, WHITE));

S('trophy', 'trophy', 'lifestyle', ['trophy', 'win', 'award', 'champion', 'success', 'goal'], 100, 100, '#ffd000', '#e0632b', (a, b) =>
  N('M27 20 H14 C10 42 22 50 30 50', 4.2) + N('M73 20 H86 C90 42 78 50 70 50', 4.2) +
  P('M26 10 H74 V36 C74 56 62 62 50 62 C38 62 26 56 26 36Z', a) + P(starPath(50, 34, 5, 11, 5), CREAM, 2.2) +
  P('M44 62 H56 V76 H44Z', a, 2.6) + P('M28 76 H72 V92 H28Z', b) + N('M34 83 H66', 2.4, CREAM) + N('M32 18 V34', 3, WHITE));

S('globe', 'globe', 'lifestyle', ['globe', 'world', 'earth', 'travel', 'map', 'planet'], 100, 100, '#3daab8', '#2f9e5b', (a, b) =>
  N('M16 66 C20 94 80 94 84 66', 3.4) + N('M36 92 H64', 4) +
  C(50, 46, 35, a) +
  P('M30 26 C38 20 46 24 44 32 C42 40 34 42 30 38 C24 36 24 30 30 26Z', b, 2.4) +
  P('M52 38 C62 34 70 40 68 50 C66 62 60 70 56 74 C52 68 52 56 48 50 C46 44 48 40 52 38Z', b, 2.4) +
  N('M50 11 V81 M15 46 H85', 1.6) + HL(32, 20, 5, 3, -35));

S('calendar-page', 'calendar', 'lifestyle', ['calendar', 'date', 'plan', 'schedule', 'month', 'day'], 100, 100, '#ff7eb6', '#ffd000', (a, b) => {
  let g = '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++)
    g += `<rect x="${21 + c * 17}" y="${48 + r * 14}" width="10" height="7" rx="1.6" fill="#e0d6bd"/>`;
  return P('M12 18 H88 V90 H12Z', CREAM) + P('M12 18 H88 V38 H12Z', a) +
    `<rect x="28" y="9" width="7" height="16" rx="3" fill="${b}" stroke="${INK}" stroke-width="2.6"/><rect x="65" y="9" width="7" height="16" rx="3" fill="${b}" stroke="${INK}" stroke-width="2.6"/>` +
    g + N('M54 56 C48 46 66 44 70 54 C74 64 56 70 50 62', 2.8, RED);
});

S('checklist-pad', 'checklist', 'lifestyle', ['checklist', 'todo', 'list', 'tasks', 'goals', 'plan'], 100, 100, '#9457eb', '#2f9e5b', (a, b) => {
  let rows = '';
  for (let i = 0; i < 4; i++) {
    const y = 38 + i * 14;
    rows += `<rect x="26" y="${y - 5}" width="8" height="8" rx="1.8" fill="${WHITE}" stroke="${INK}" stroke-width="2"/>` + N(`M42 ${y} H72`, 2.4);
    if (i < 3) rows += N(`M26.5 ${y - 1} L29.5 ${y + 3} L36 ${y - 8}`, 3, b);
  }
  return P('M18 14 H82 V92 H18Z', CREAM) + P('M18 14 H82 V28 H18Z', a) +
    C(30, 14, 3.8, WHITE, 2.4) + C(50, 14, 3.8, WHITE, 2.4) + C(70, 14, 3.8, WHITE, 2.4) + rows;
});

S('telescope', 'telescope', 'lifestyle', ['telescope', 'stars', 'space', 'astronomy', 'explore', 'night'], 100, 100, '#e0632b', '#ffd000', (a, b) =>
  N('M48 62 L28 94 M48 62 L68 94 M48 62 V94', 4) +
  G('rotate(-25 48 52)',
    P('M10 39 H40 V65 H10Z', a) + P('M40 42 H66 V62 H40Z', b) + P('M66 45 H88 V59 H66Z', a) +
    P('M88 47 H95 V57 H88Z', INK, 2.4) + N('M16 39 V65 M46 42 V62 M72 45 V59', 2.4) + E(10, 52, 3, 13, '#cfeff2', 0, 2.4)) +
  spark(82, 20, 8, b, .15) + D(60, 10, 2.4, INK));

S('cactus-pot', 'cactus', 'lifestyle', ['cactus', 'plant', 'desert', 'succulent', 'pot', 'green'], 100, 100, '#e0632b', '#2f9e5b', (a, b) =>
  P('M42 70 V24 Q42 10 52 10 Q62 10 62 24 V70Z', b) +
  P('M42 56 H30 Q22 56 22 48 V36 Q22 30 28 30 Q34 30 34 36 V46 H42Z', b) +
  P('M62 48 H72 Q80 48 80 40 V28 Q80 22 74 22 Q68 22 68 28 V38 H62Z', b) +
  N('M52 20 V60 M46 30 H48 M56 40 H58 M47 50 H49', 2, '#1d6f3f') + P('M52 5 C48 0 44 6 52 10 C60 6 56 0 52 5Z', '#ff7eb6', 2) +
  P('M28 66 H72 L67 92 Q66 96 61 96 H39 Q34 96 33 92Z', a) + P('M24 62 H76 V72 H24Z', a) + N('M31 80 L34 90', 3, WHITE));

S('hot-air-balloon', 'balloon', 'lifestyle', ['balloon', 'hot air', 'travel', 'sky', 'adventure', 'float'], 100, 100, '#ff7eb6', '#ffd000', (a, b) =>
  N('M38 74 L42 84 M62 74 L58 84', 2.6) +
  P('M50 7 C18 7 9 38 21 58 C27 68 35 71 38 74 H62 C65 71 73 68 79 58 C91 38 82 7 50 7Z', a) +
  P('M50 7 C36 14 30 42 40 74 H60 C70 42 64 14 50 7Z', b) + N('M50 7 V74', 2.2) +
  P('M39 84 H61 V95 H39Z', KRAFT, 2.6) + N('M39 89 H61', 1.8, '#a8834f') + N('M20 34 Q24 22 34 16', 3, WHITE));

S('sunglasses', 'sunglasses', 'lifestyle', ['sunglasses', 'summer', 'cool', 'shades', 'vacation', 'sun'], 100, 70, '#1d1648', '#ff7eb6', (a, b) =>
  P('M8 24 C20 18 36 18 46 24 C48 44 40 58 28 58 C14 58 8 42 8 24Z', a) + P('M92 24 C80 18 64 18 54 24 C52 44 60 58 72 58 C86 58 92 42 92 24Z', a) +
  N('M46 26 Q50 22 54 26', 3.6) + N('M16 28 L24 24 M70 28 L78 24', 3, b) + N('M16 38 Q18 46 22 50', 2.4, '#6a5fb0') + N('M62 38 Q64 46 68 50', 2.4, '#6a5fb0'));

S('paint-palette', 'palette', 'lifestyle', ['palette', 'paint', 'art', 'colour', 'creative', 'artist'], 100, 90, '#efe3c8', '#ff7eb6', (a, b) =>
  P('M50 8 C22 8 6 28 8 50 C10 72 28 84 44 82 C54 80 50 70 56 66 C64 62 74 70 84 66 C96 60 96 40 88 28 C78 14 64 8 50 8Z', a) +
  E(50, 54, 7, 6, '#f6efe0', 0, 2.4) +
  C(28, 40, 6.5, b, 2.4) + C(40, 24, 6.5, '#ffd000', 2.4) + C(60, 22, 6.5, '#3daab8', 2.4) + C(76, 36, 6.5, '#cfff00', 2.4) + C(28, 62, 6.5, '#9457eb', 2.4));

/* =====================================================================
   WORDS
   ===================================================================== */
const CAV = 'Caveat', BRI = 'Bricolage Grotesque', TYP = 'Special Elite', SER = 'Instrument Serif', HAP = 'Homemade Apple', OST = 'Old Standard TT';

S('word-dream-big', 'dream big.', 'words', ['dream', 'big', 'goals', 'ambition', 'quote', 'handwritten'], 150, 60, PAPER, '#ff7eb6', (a, b) =>
  P(rag(5, 6, 140, 46, 14, 2.8, 5), a, 2.4) + T(75, 38, 'dream big.', CAV, 31, 700, INK) + N('M42 45 C54 40 64 49 78 44 S100 44 110 44', 2.6, b));

S('word-keep-going', 'keep going.', 'words', ['keep', 'going', 'motivation', 'persist', 'quote', 'bold'], 150, 48, '#cfff00', '#ff7eb6', (a, b) =>
  P('M26 6 H124 Q144 6 144 24 Q144 42 124 42 H26 Q6 42 6 24 Q6 6 26 6Z', a) + C(17, 24, 3.2, b, 2) + C(133, 24, 3.2, b, 2) +
  T(75, 31, 'KEEP GOING.', BRI, 21, 800, INK, 'font-stretch="75%"'));

S('word-in-progress', 'in progress.', 'words', ['progress', 'stamp', 'typewriter', 'work', 'process', 'quote'], 150, 56, RED, CREAM, (a, b) =>
  G('rotate(-4 75 28)',
    `<rect x="8" y="8" width="134" height="40" rx="4" fill="${b}" stroke="${a}" stroke-width="3.2"/><rect x="13" y="13" width="124" height="30" rx="2" fill="none" stroke="${a}" stroke-width="1.6"/>` +
    T(75, 34, 'IN PROGRESS.', TYP, 17, 400, a)));

S('word-romanticize', 'romanticize your life.', 'words', ['romanticize', 'life', 'aesthetic', 'quote', 'serif', 'cozy'], 170, 84, '#ff7eb6', '#d9568f', (a, b) =>
  P('M4 26 L26 26 L26 70 L4 70 L12 48Z', b, 2.6) + P('M166 26 L144 26 L144 70 L166 70 L158 48Z', b, 2.6) +
  P('M22 8 C58 0 112 16 148 8 V74 C112 82 58 66 22 74Z', a) +
  T(85, 38, 'romanticize', SER, 26, 400, INK, 'font-style="italic"') + T(85, 62, 'your life.', SER, 24, 400, INK, 'font-style="italic"'));

S('word-trust-process', 'trust the process.', 'words', ['trust', 'process', 'patience', 'ticket', 'quote', 'faith'], 150, 76, '#ffd000', '#e0632b', (a, b) =>
  P('M6 8 H144 V28 A10 10 0 0 0 144 48 V68 H6 V48 A10 10 0 0 0 6 28Z', a) + P('M6 8 H24 V68 H6 V48 A10 10 0 0 0 6 28Z', b, 2.6) +
  T(84, 36, 'TRUST THE', BRI, 24, 800, INK, 'font-stretch="75%"') + T(84, 58, 'PROCESS.', BRI, 24, 800, INK, 'font-stretch="75%"') +
  N('M14 18 V26 M14 34 V42 M14 50 V58', 2.2, CREAM));

S('word-one-day', 'one day at a time.', 'words', ['one day', 'time', 'daily', 'stamp', 'round', 'quote'], 110, 110, '#9457eb', CREAM, (a, b) =>
  C(55, 55, 48, b) + `<circle cx="55" cy="55" r="41" fill="none" stroke="${a}" stroke-width="2.4" stroke-dasharray="1 5" ${CAP}/>` + C(55, 55, 35, 'none', 1.8).replace(INK, a) +
  T(55, 46, 'one day', CAV, 20, 700, INK) + T(55, 64, 'at a', CAV, 20, 700, INK) + T(55, 82, 'time.', CAV, 22, 700, INK) +
  P(starPath(55, 17, 5, 5, 2.4), a, 1.6) + P(starPath(55, 95, 5, 5, 2.4), a, 1.6));

S('word-becoming-her', 'becoming her.', 'words', ['becoming', 'her', 'growth', 'script', 'tape', 'quote'], 170, 58, '#ff7eb6', WHITE, (a, b) =>
  P('M8 8 L14 14 L8 20 L14 26 L8 32 L14 38 L8 44 L14 50 L8 54 L162 54 L156 50 L162 44 L156 38 L162 32 L156 26 L162 20 L156 14 L162 8Z', a, 2.4) +
  N('M24 9 L18 53 M146 9 L140 53', 3, b) + T(85, 35, 'becoming her.', HAP, 15, 400, INK));

S('word-make-it-happen', 'make it happen.', 'words', ['make', 'happen', 'action', 'do', 'bold', 'quote'], 190, 64, '#9457eb', INK, (a, b) =>
  `<rect x="10" y="10" width="176" height="46" rx="12" fill="${b}"/>` +
  `<rect x="6" y="6" width="176" height="46" rx="12" fill="${a}" stroke="${INK}" stroke-width="3"/>` +
  T(94, 37, 'MAKE IT HAPPEN.', BRI, 23, 800, WHITE, 'font-stretch="75%"'));

S('word-future-me', 'future me says thanks.', 'words', ['future', 'me', 'thanks', 'note', 'sticky', 'quote'], 150, 108, '#ffd000', RED, (a, b) =>
  P('M8 8 L142 6 L144 78 L116 102 L8 102Z', a) + P('M144 78 L116 102 L116 80Z', '#e6b800', 2.6) +
  T(76, 38, 'future me', CAV, 28, 700, INK) + T(76, 66, 'says thanks.', CAV, 26, 700, INK) +
  P('M122 22 C116 16 112 10 117 8 C120 7 122 9 122 11 C122 9 124 7 127 8 C132 10 128 16 122 22Z', b, 2));

S('word-small-steps', 'small steps, big life.', 'words', ['small steps', 'big life', 'growth', 'index card', 'typewriter', 'quote'], 180, 90, WHITE, RED, (a, b) =>
  P('M8 8 H172 V82 H8Z', a, 2.6) + N('M8 22 H172', 2.6, b) + N('M8 44 H172 M8 58 H172 M8 72 H172', 1.4, '#7fb2e8') + N('M30 8 V82', 1.4, '#e8a0a0') +
  T(100, 40, 'small steps,', TYP, 18, 400, INK) + T(100, 56, 'big life.', TYP, 18, 400, INK));

S('word-day-by-day', 'day by day.', 'words', ['day by day', 'daily', 'habit', 'badge', 'bold', 'quote'], 110, 110, '#e0632b', CREAM, (a, b) =>
  P(scallop(55, 55, 46, 16, 8.6), a, 2.8) + C(55, 55, 36, b, 2.4) +
  T(55, 51, 'DAY BY', BRI, 20, 800, INK, 'font-stretch="75%"') + T(55, 71, 'DAY.', BRI, 20, 800, INK, 'font-stretch="75%"'));

S('word-she-believed', 'she believed she could.', 'words', ['believed', 'she', 'confidence', 'torn paper', 'serif', 'quote'], 180, 96, PAPER, '#9457eb', (a, b) =>
  P(rag(8, 8, 164, 78, 14, 3.2, 3), a, 2.4) +
  T(90, 44, 'she believed', SER, 30, 400, INK, 'font-style="italic"') + T(90, 70, 'she could.', SER, 30, 400, INK, 'font-style="italic"') + P(starPath(21, 20, 5, 7, 3), b, 1.8));

S('word-let-it-bloom', 'let it bloom.', 'words', ['bloom', 'grow', 'flower', 'vintage', 'label', 'quote'], 170, 64, KRAFT, CREAM, (a, b) =>
  P('M14 6 H156 Q164 6 164 14 V50 Q164 58 156 58 H14 Q6 58 6 50 V14 Q6 6 14 6Z', a) +
  `<rect x="12" y="12" width="146" height="40" rx="4" fill="none" stroke="${b}" stroke-width="1.8"/>` +
  T(85, 39, 'let it bloom.', OST, 21, 400, INK));

/* =====================================================================
   PINS & CLIPS
   ===================================================================== */
function pushpin(a, b) {
  /* head centred at (50,50); needle goes down-right */
  return N('M54 56 L87 92', 5.4, INK) + N('M54 56 L87 92', 2, '#eeeef6') +
    `<ellipse cx="62" cy="64" rx="8" ry="5" fill="${INK}" transform="rotate(48 62 64)"/>` +
    C(50, 50, 23, a) +
    `<path d="M70.7 42.5 A22 22 0 0 1 42.5 70.7 A27 27 0 0 0 70.7 42.5Z" fill="${b}"/>` +
    `<circle cx="50" cy="50" r="23" fill="none" stroke="${INK}" stroke-width="3"/>` +
    HL(41, 40, 7, 4.4, -38) + D(32, 50, 2.2, WHITE);
}
S('pin-red', 'red pushpin', 'pins', ['pushpin', 'pin', 'red', 'thumbtack', 'board', 'string'], 100, 100, '#d9382a', '#a82218', pushpin);
S('pin-yellow', 'yellow pushpin', 'pins', ['pushpin', 'pin', 'yellow', 'thumbtack', 'board'], 100, 100, '#ffd000', '#d99a00', pushpin);
S('pin-blue', 'blue pushpin', 'pins', ['pushpin', 'pin', 'blue', 'thumbtack', 'board'], 100, 100, '#3b78e0', '#2548a8', pushpin);
S('pin-green', 'green pushpin', 'pins', ['pushpin', 'pin', 'green', 'thumbtack', 'board'], 100, 100, '#2f9e5b', '#1f7240', pushpin);

S('thumbtack-flat', 'thumbtack', 'pins', ['thumbtack', 'tack', 'pin', 'flat', 'board', 'metal'], 100, 100, '#c9c9d4', '#8a8aa0', (a, b) =>
  N('M58 62 L88 90', 5.4) + N('M58 62 L88 90', 2, '#eeeef6') +
  C(48, 48, 28, a) + C(48, 48, 18, b, 2.6) + C(48, 48, 7, a, 2.4) + HL(38, 36, 7, 3.4, -40) + D(60, 62, 2, WHITE));

S('clip-binder-black', 'black binder clip', 'pins', ['clip', 'binder', 'black', 'paper', 'office', 'hold'], 100, 100, '#2b2b3a', SILVER, (a, b) =>
  OL('M33 38 C16 26 28 6 50 6 C72 6 84 26 67 38', b, 4.4, 2) +
  P('M10 88 L30 36 Q31 32 36 32 H64 Q69 32 70 36 L90 88Z', a) + P('M16 88 L22 74 H78 L84 88Z', '#14142a', 2.6) +
  N('M38 44 L24 76', 3, '#6a6a86'));

S('clip-binder-silver', 'silver binder clip', 'pins', ['clip', 'binder', 'silver', 'paper', 'office', 'metal'], 100, 100, '#c9c9d4', '#8a8aa0', (a, b) =>
  OL('M33 38 C16 26 28 6 50 6 C72 6 84 26 67 38', b, 4.4, 2) +
  P('M10 88 L30 36 Q31 32 36 32 H64 Q69 32 70 36 L90 88Z', a) + P('M16 88 L22 74 H78 L84 88Z', b, 2.6) +
  N('M38 44 L24 76', 3.4, WHITE));

S('paper-clip', 'paper clip', 'pins', ['paperclip', 'clip', 'paper', 'office', 'silver', 'attach'], 100, 100, '#c9c9d4', '#fefbff', (a, b) => {
  const d = 'M42 66 V30 C42 12 70 12 70 30 V74 C70 94 30 94 30 74 V24 C30 4 78 4 78 24 V60';
  return N(d, 8, INK) + N(d, 4, a) + N('M33 74 V30', 1.4, b);
});

S('clip-bulldog', 'bulldog clip', 'pins', ['clip', 'bulldog', 'paper', 'office', 'metal', 'hold'], 100, 100, '#c9c9d4', '#8a8aa0', (a, b) =>
  P('M6 68 H92 V80 H6Z', b, 2.8) +
  P('M6 64 L70 46 L90 20 L97 27 L82 54 L76 64Z', a) + N('M12 60 L62 46', 3, WHITE) + C(76, 62, 7.4, b, 2.6) + D(76, 62, 2.4, INK));

S('safety-pin', 'safety pin', 'pins', ['safety pin', 'pin', 'clasp', 'metal', 'punk', 'fix'], 100, 100, '#c9c9d4', '#8a8aa0', (a, b) =>
  G('rotate(-30 50 50)',
    N('M24 40 H80', 8, INK) + N('M24 58 H80', 8, INK) + N('M24 40 C4 38 4 60 24 58', 8, INK) + N('M22 44 C12 46 12 54 22 54', 8, INK) +
    N('M24 40 H80', 4, a) + N('M24 58 H80', 4, a) + N('M24 40 C4 38 4 60 24 58', 4, a) + N('M22 44 C12 46 12 54 22 54', 4, a) +
    P('M76 32 H90 Q96 32 96 38 V60 Q96 66 90 66 H76Z', b, 2.8) + N('M82 38 V60', 2.6, WHITE)));

/* ---------- exports ---------- */
window.VB_STICKER_CATS = [
  { id: 'doodles', name: 'doodles' }, { id: 'scrapbook', name: 'scrapbook' }, { id: 'lifestyle', name: 'lifestyle' },
  { id: 'words', name: 'words' }, { id: 'pins', name: 'pins & clips' }
];
window.VB_STICKERS = list;
})();
