'use strict';
// Look 2: three worlds in one film.
//   the market  -> data-noir: black void, a 3D wireframe Riyadh built from the real showroom coordinates, HUD, decrypting numbers
//   the problem -> kinetic poster: full-frame colour blocks and giant type that slams in on the beat
//   the answer  -> bright studio: porcelain light, floating glass screens of the portal, soft shadows
// Type: Inter Display (900 for the slams), JetBrains Mono for the HUD.
const C2 = {
  void: [3, 6, 14], teal: [86, 132, 255], tealD: [44, 91, 246], white: [246, 247, 250], porcelain: [235, 239, 246],
  ink: [6, 20, 62], navy: [2, 27, 84], blue: [44, 91, 246], ui: [241, 245, 249], flame: [255, 84, 30], sand: [232, 220, 200], grey: [128, 136, 146],
};
FAM.s = '"ID", "WenQuanYi Zen Hei", "FreeSerif", sans-serif';
const MX = 150;
const ln2 = (L, i) => L[Math.min(i, L.length - 1)].t;
const ldur = (L, i) => L[Math.min(i, L.length - 1)].dur;
const SC2 = {}, BG2 = {};
const NOIR = { w: [0, 0, 0, .35], c1: C2.teal, c2: C2.teal, ground: C2.void, amp: 1, vig: .6 };
const STUDIO = { w: [0, 0, 0, 0], c1: C2.teal, c2: C2.teal, ground: C2.porcelain, amp: 1, vig: .1 };
const POSTER = (col) => ({ w: [0, 0, 0, 0], c1: C2.teal, c2: C2.teal, ground: col, amp: 1, vig: .18 });
const WIPE_A = [C2.teal, C2.flame, C2.ink, C2.sand], WIPE_B = [C2.ink, C2.teal, C2.white, C2.flame];

/* ---------------- shared pieces ---------------- */
const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tx = tmp.getContext('2d');
// vector AutoLink lockup (so it can sit on white or black): AUTOLINK, teal rule, AI TECH
const tintCache = {};
function tinted(img, col) { const k = col.join(','); if (tintCache[k]) return tintCache[k]; const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = rgba(col); x.fillRect(0, 0, c.width, c.height); return (tintCache[k] = c); }
// the AutoLink AI tech logo: glass loop + wordmark (navy on light, white on dark); s = scale of a 300 px-tall lockup
function mark(x, y, s, col, a = 1, tin = -9) {
  const p = S(lt - tin, 140); if (p < .004 || !IMG.loopmark || !IMG.wordmark) return;
  const lh = 300 * s, lw = lh * IMG.loopmark.width / IMG.loopmark.height, wh = lh * .62, ww = wh * IMG.wordmark.width / IMG.wordmark.height, gap = lh * .06;
  const tot = lw + gap + ww, x0 = x - tot / 2;
  X.save(); X.globalAlpha = a * p; X.translate(0, (1 - p) * 24);
  // the loop turns in, the wordmark rises behind it
  X.save(); X.translate(x0 + lw / 2, y); X.rotate((1 - p) * -.5); X.scale(.85 + .15 * p, .85 + .15 * p); X.drawImage(IMG.loopmark, -lw / 2, -lh / 2, lw, lh); X.restore();
  const q = S(lt - tin - .15, 140); X.globalAlpha = a * q;
  X.drawImage(tinted(IMG.wordmark, col), x0 + lw + gap + (1 - q) * 30, y - wh / 2 + lh * .04, ww, wh);
  X.restore();
}
// DecryptedText: characters resolve left to right out of code glyphs
const GLY = '0123456789#%$&*+=<>/\\|▓▒░█';
function decrypt(str, o) {
  const { x, y, size = 200, wt = 900, fam = 's', col = C2.white, t0 = 0, dur = 1, align = 'left', tin = t0 - .1, tout = 1e9, ls = -size * .04, a = 1 } = o;
  const vis = S(lt - tin, 260) * (1 - S(lt - tout, 220)); if (vis < .004) return;
  X.save(); X.globalAlpha = a * vis; font(size, wt, fam); X.letterSpacing = ls + 'px';
  const w = X.measureText(str).width, x0 = align === 'left' ? x : align === 'center' ? x - w / 2 : x - w;
  const step = Math.floor(lt * 30);
  let cx = x0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i], res = lt >= t0 + dur * (i + 1) / str.length;
    const cw = X.measureText(ch).width;
    if (ch === ' ' || res) { X.fillStyle = rgba(col); X.fillText(ch, cx, y); }
    else if (lt >= tin) { const r = GLY[Math.floor(rnd(i * 31 + step) * GLY.length)]; X.fillStyle = rgba(C2.teal, .9); font(size, 500, 'm'); X.fillText(r, cx + cw * .1, y); font(size, wt, fam); X.letterSpacing = ls + 'px'; }
    cx += cw;
  }
  X.restore(); X.letterSpacing = '0px';
}
function mono(str, x, y, size = 18, col = C2.teal, a = 1, align = 'left') { X.save(); X.globalAlpha = a; X.font = `500 ${size}px ${FAM.m}`; X.letterSpacing = '2px'; X.textAlign = align; X.fillStyle = rgba(col); X.fillText(str, x, y); X.restore(); X.letterSpacing = '0px'; }
// HUD frame: corner brackets + running readout
function hud(lt, label, a = 1) {
  X.save(); X.globalAlpha = a; X.strokeStyle = rgba(C2.teal, .55); X.lineWidth = 2;
  const m = 44, l = 46;
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => { X.beginPath(); X.moveTo(x + sx * l, y); X.lineTo(x, y); X.lineTo(x, y + sy * l); X.stroke(); });
  X.restore();
  mono(label, 76, 92, 16, C2.teal, .8 * a);
  const tc = `T+${String(Math.floor(lt)).padStart(2, '0')}:${String(Math.floor((lt % 1) * 60)).padStart(2, '0')}`;
  mono(tc, W - 76, 92, 16, C2.teal, .8 * a, 'right');
  mono('24.7636N  46.6402E', W - 76, H - 70, 16, C2.grey, .8 * a, 'right');
}

/* ---------------- the 3D wireframe city (real showroom coordinates; height = cars on the floor) ---------------- */
const CITY = GEO.pins.map(([x, y, d, inv], i) => ({ X: (x - 960) * 1.25, Z: -(y - 600) * 1.25, h: 18 + Math.sqrt(Math.max(inv, 4)) * 22, d, i }));
function cityCam(o) { return Object.assign({ x: 0, y: 220, z: -1300, yaw: 0, pitch: -.2, f: 1150 }, o); }
function P3(cam, x, y, z) {
  let dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw); let xr = dx * cy - dz * sy, zr = dx * sy + dz * cy;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch); const yr = dy * cp - zr * sp; zr = dy * sp + zr * cp;
  if (zr < 8) return null;
  return [W / 2 + cam.f * xr / zr, H / 2 - cam.f * yr / zr, zr];
}
function city(cam, o = {}) {
  const { grow = 1, scan = null, lit = null, a = 1, fog = 3400 } = o;
  X.save(); X.globalAlpha = a; X.globalCompositeOperation = 'lighter'; X.lineCap = 'round';
  for (let k = -16; k <= 16; k++) {
    for (const along of [0, 1]) {
      const v = k * 110, zn = Math.max(-1800, cam.z + 40); if (!along && v < zn) continue;
      const p1 = along ? P3(cam, v, 0, zn) : P3(cam, -1800, 0, v), p2 = along ? P3(cam, v, 0, 1800) : P3(cam, 1800, 0, v);
      if (!p1 || !p2) continue; X.strokeStyle = rgba(C2.teal, .11); X.lineWidth = 1; X.beginPath(); X.moveTo(p1[0], p1[1]); X.lineTo(p2[0], p2[1]); X.stroke();
    }
  }
  // horizon glow
  const hz = P3(cam, 0, 0, 2400); if (hz) { const hg = X.createRadialGradient(W / 2, hz[1], 0, W / 2, hz[1], 1100); hg.addColorStop(0, rgba(C2.teal, .14)); hg.addColorStop(1, rgba(C2.teal, 0)); X.fillStyle = hg; X.fillRect(0, hz[1] - 500, W, 1100); }
  const items = [];
  for (const c of CITY) { const p0 = P3(cam, c.X, 0, c.Z); if (!p0) continue; const fz = clamp(1 - (p0[2] - 200) / fog); if (fz <= 0) continue; items.push({ c, p0, fz }); }
  items.sort((u, v) => v.p0[2] - u.p0[2]);
  const s = 9;
  for (const { c, p0, fz } of items) {
    const gi = typeof grow === 'function' ? grow(c) : grow; if (gi <= .002) continue;
    const h = c.h * gi;
    let br = .6; if (scan !== null) br += 1.6 * Math.exp(-Math.pow((c.Z - scan) / 80, 2));
    if (lit) br *= lit(c);
    const col = c.d ? mixc(C2.teal, C2.white, .4) : C2.teal;
    const B = [[-s, -s], [s, -s], [s, s], [-s, s]].map(([dx, dz]) => [P3(cam, c.X + dx, 0, c.Z + dz), P3(cam, c.X + dx, h, c.Z + dz)]);
    if (B.some(e => !e[0] || !e[1])) continue;
    const w = Math.max(.8, 700 / p0[2]);
    // faint glass body
    X.fillStyle = rgba(col, .06 * fz * br); X.beginPath(); X.moveTo(B[0][0][0], B[0][0][1]); X.lineTo(B[1][0][0], B[1][0][1]); X.lineTo(B[1][1][0], B[1][1][1]); X.lineTo(B[0][1][0], B[0][1][1]); X.closePath(); X.fill();
    X.strokeStyle = rgba(col, .8 * fz * Math.min(1, br)); X.lineWidth = w;
    X.beginPath();
    for (const e of B) { X.moveTo(e[0][0], e[0][1]); X.lineTo(e[1][0], e[1][1]); }
    X.moveTo(B[0][1][0], B[0][1][1]); for (let k = 1; k <= 4; k++) X.lineTo(B[k % 4][1][0], B[k % 4][1][1]);
    X.stroke();
    // roof glow
    X.fillStyle = rgba(col, .3 * fz * Math.min(1.6, br)); X.beginPath(); X.moveTo(B[0][1][0], B[0][1][1]); for (let k = 1; k < 4; k++) X.lineTo(B[k][1][0], B[k][1][1]); X.closePath(); X.fill();
  }
  X.restore();
}

/* ---------------- poster pieces ---------------- */
// a word that slams in: big scale -> 1 on a stiff spring, a vertical smear while it moves
function slam(str, o) {
  const { x, y, size = 260, col = C2.ink, t0 = 0, tout = 1e9, align = 'center', wt = 900, ls = -size * .05, from = 1.6 } = o;
  const p = S(lt - t0, 900), q = S(lt - tout, 500); if (p < .004 || q > .996) return;
  font(size, wt); X.letterSpacing = ls + 'px'; const w = X.measureText(str).width;
  const x0 = align === 'center' ? x - w / 2 : align === 'left' ? x : x - w;
  const sc = lerp(from, 1, p) * (1 + q * .3);
  X.save(); X.globalAlpha = Math.min(1, p * 1.5) * (1 - q); X.translate(x0 + w / 2, y - size * .35); X.scale(sc, sc); X.translate(-(x0 + w / 2), -(y - size * .35));
  X.fillStyle = rgba(col); X.textBaseline = 'alphabetic'; X.fillText(str, x0, y);
  X.restore(); X.letterSpacing = '0px';
  return { x0, w };
}
// a photo seen only through the letters
function photoText(str, img, o) {
  const { x, y, size = 300, t0 = 0, align = 'center', ls = -size * .05, zoom = 1.1, px = .5, py = .5 } = o;
  const p = S(lt - t0, 700); if (p < .004) return;
  tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, W, H); tx.globalCompositeOperation = 'source-over';
  tx.font = `900 ${size}px ${FAM.s}`; tx.letterSpacing = ls + 'px'; const w = tx.measureText(str).width;
  const x0 = align === 'center' ? x - w / 2 : x; tx.fillStyle = '#000'; tx.fillText(str, x0, y); tx.letterSpacing = '0px';
  tx.globalCompositeOperation = 'source-in';
  if (img) { const ar = img.width / img.height, bw = w * 1.1, bh = size * 1.2, fr = bw / bh; let sw = ar > fr ? img.height * fr : img.width, sh = ar > fr ? img.height : img.width / fr; sw /= zoom; sh /= zoom; tx.drawImage(img, (img.width - sw) * px, (img.height - sh) * py, sw, sh, x0 - w * .05, y - size * .95, bw, bh); }
  tx.globalCompositeOperation = 'source-over';
  const sc = lerp(1.25, 1, p);
  X.save(); X.globalAlpha = Math.min(1, p * 1.4); X.translate(x, y - size * .35); X.scale(sc, sc); X.translate(-x, -(y - size * .35)); X.drawImage(tmp, 0, 0); X.restore();
}

/* ---------------- studio pieces ---------------- */
function studioFloor(a = 1) {
  const rg = X.createRadialGradient(W / 2, H * .38, 80, W / 2, H * .5, W * .75);
  rg.addColorStop(0, rgba(C2.white, a)); rg.addColorStop(1, rgba(C2.porcelain, a)); X.fillStyle = rg; X.fillRect(0, 0, W, H);
}
// a glass screen floating in 3D (rotation about Y approximated by an affine squeeze and skew), with a soft shadow
function glass(cx, cy, w, h, o, draw) {
  const { ry = 0, rx = 0, a = 1, lift = 1, r = 34 } = o;
  const kx = Math.cos(ry), sk = Math.sin(ry) * .12, ky = Math.cos(rx);
  X.save(); X.globalAlpha = a;
  // shadow on the floor
  X.save(); X.translate(cx + 30 * lift, cy + h * .55 + 30 * lift); X.scale(1, .18);
  const sg = X.createRadialGradient(0, 0, 0, 0, 0, w * .6); sg.addColorStop(0, `rgba(20,30,40,${.22 * lift})`); sg.addColorStop(1, 'rgba(20,30,40,0)'); X.fillStyle = sg; X.fillRect(-w, -w, w * 2, w * 2); X.restore();
  X.translate(cx, cy); X.transform(kx, sk, 0, ky, 0, 0);
  X.shadowColor = 'rgba(20,32,44,.18)'; X.shadowBlur = 50; X.shadowOffsetY = 26;
  X.fillStyle = rgba(C2.white, .92); rr(-w / 2, -h / 2, w, h, r); X.fill();
  X.shadowColor = 'transparent';
  X.save(); rr(-w / 2, -h / 2, w, h, r); X.clip(); X.translate(-w / 2, -h / 2); draw(w, h); X.restore();
  // glass sheen
  const sh = X.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(.35, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,.12)');
  X.fillStyle = sh; rr(-w / 2, -h / 2, w, h, r); X.fill();
  X.lineWidth = 2; X.strokeStyle = 'rgba(255,255,255,.9)'; X.stroke(); X.lineWidth = 1; X.strokeStyle = 'rgba(12,14,18,.08)'; rr(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2, r + 1); X.stroke();
  X.restore();
}
function inkLine(str, o) { return line(str, Object.assign({ col: C2.ink }, o)); }

/* ======================= teaser ======================= */
// T1 the market, never counted (noir)
SC2.T1 = (lt, D, L) => {
  const u = clamp(lt / D);
  const cam = cityCam({ z: lerp(-1250, -620, eio(u)), y: lerp(170, 120, u), yaw: .1 * Math.sin(lt * .25), pitch: -.06 });
  const sz = lerp(-900, 1100, (lt * .3) % 1);
  city(cam, { grow: c => S(lt - .2 - (c.Z + 1000) / 2600, 60), scan: sz });
  scanPlane(cam, sz, .8 * (1 - sm(ln2(L, 1) - .3, ln2(L, 1) + .3, lt)));
  hud(lt, 'FIELD CENSUS 001 · RIYADH', S(lt - .3, 100));
  const t0 = ln2(L, 0), d0 = ldur(L, 0);
  trueFocus(['RIYADH’S', 'INDEPENDENT', 'CAR', 'MARKET'], { x: W / 2, y: 250, size: 84, times: [t0, t0 + d0 * .2, t0 + d0 * .4, t0 + d0 * .55], tin: t0 - .1, tout: ln2(L, 1) - .3 });
  decrypt('SAR BILLIONS A YEAR', { x: W / 2, y: 350, size: 64, wt: 700, col: C2.teal, align: 'center', t0: ln2(L, 0) + .7, dur: 1.4, tout: ln2(L, 1) - .25, ls: 4 });
  const t1 = ln2(L, 1);
  slam('NO ONE HAD', { x: W / 2, y: 290, size: 150, col: C2.white, t0: t1 });
  slam('EVER COUNTED IT.', { x: W / 2, y: 440, size: 150, col: C2.white, t0: t1 + ldur(L, 1) * .4 });
};
BG2.T1 = () => NOIR;
// T2 door to door (noir, camera rises overhead, the walk lights each showroom)
SC2.T2 = (lt, D, L) => {
  const u = eio(clamp(lt / D));
  const cam = cityCam({ z: lerp(-620, -1350, u), y: lerp(120, 1250, u), pitch: lerp(-.06, -.78, u), yaw: lerp(.05, 0, u) });
  const R = ROUTE(), ord = {}; R.forEach((pi, k) => ord[pi] = k / R.length);
  const pr = clamp((lt - .2) / (D - .6));
  city(cam, { grow: 1, lit: c => (ord[c.i] ?? 1) <= pr ? 2.2 : .45 });
  hud(lt, 'WALK · DOOR TO DOOR');
  const sf = String(Math.round(520 * pr)).padStart(3, '0');
  splitFlapLive(sf, MX + 6, 330, 150);
  mono('SHOWROOMS WALKED', MX + 8, 380, 22, C2.teal);
};
BG2.T2 = () => NOIR;
// T3 counted (noir HUD, numbers decrypt)
SC2.T3 = (lt, D, L) => {
  const cam = cityCam({ z: lerp(-1350, -1500, clamp(lt / D)), y: 1250, pitch: -.78 });
  city(cam, { grow: 1, a: .28 });
  hud(lt, 'CENSUS · ON THE FLOOR');
  const t0 = ln2(L, 0), t1 = t0 + ldur(L, 0) * .52;
  decrypt('31,869', { x: W / 2, y: 520, size: 300, align: 'center', t0: t0 + .1, dur: 1.1 });
  mono('CARS COUNTED ON THE FLOOR', W / 2, 590, 26, C2.teal, S(lt - t0 - .6, 200), 'center');
  decrypt('SAR 3.6B', { x: W / 2, y: 830, size: 170, align: 'center', col: C2.teal, t0: t1, dur: .9 });
  mono('STOCK ON DISPLAY', W / 2, 890, 26, C2.grey, S(lt - t1 - .5, 200), 'center');
};
BG2.T3 = () => NOIR;
// T4 the question (poster: flame field, giant type, a showroom seen through the letters)
SC2.T4 = (lt, D, L) => {
  const t0 = ln2(L, 0), tq = t0 + ldur(L, 0) * .5;
  slam('ON EVERY FLOOR,', { x: MX, y: 300, size: 110, align: 'left', t0, tout: tq - .1, from: 1.3 });
  slam('THE SAME QUESTION.', { x: MX, y: 420, size: 110, align: 'left', t0: t0 + .35, tout: tq - .1, from: 1.3 });
  marquee('HOW WILL I PAY?', { y: 150, size: 120, speed: 260, dir: -1, col: C2.ink, outline: true, a: .35 * S(lt - tq, 120) });
  marquee('HOW WILL I PAY?', { y: 1040, size: 120, speed: 260, dir: 1, col: C2.ink, outline: true, a: .35 * S(lt - tq, 120) });
  slam('HOW WILL', { x: W / 2, y: 470, size: 250, t0: tq });
  photoText('I PAY?', IMG['n-rc-night'], { x: W / 2, y: 800, size: 330, t0: tq + .4, py: .45 });
};
BG2.T4 = () => Object.assign(POSTER(C2.flame), { wipe: WIPE_A });
// T5 the answer (studio: light, a glass portal screen floats in)
SC2.T5 = (lt, D, L) => {
  studioFloor();
  const p = S(lt + .1, 90);
  glass(1270, 540, 1000, 640, { ry: lerp(.6, .14, p), a: p, lift: p }, (w, h) => portalUI(w, h, lt));
  mark(MX + 250, 300, .56, C2.ink, 1, .1);
  inkLine('Financing,', { x: MX, y: 560, size: 116, wt: 900, ls: -4, tin: ln2(L, 0) + .2 });
  inkLine('on your', { x: MX, y: 690, size: 116, wt: 900, ls: -4, col: C2.tealD, tin: ln2(L, 0) + .45 });
  inkLine('floor.', { x: MX, y: 820, size: 116, wt: 900, ls: -4, col: C2.tealD, tin: ln2(L, 0) + .6 });
};
BG2.T5 = () => Object.assign({}, STUDIO, { wipe: WIPE_B });
function portalUI(w, h, lt) {
  X.fillStyle = rgba(C2.white); X.fillRect(0, 0, w, h);
  X.fillStyle = rgba(C2.ink, .04); X.fillRect(0, 0, 220, h);
  X.font = `700 26px ${FAM.s}`; X.fillStyle = rgba(C2.ink); X.fillText('AutoLink', 28, 56);
  ['Requests', 'Reports', 'Account'].forEach((s, i) => { if (!i) { X.fillStyle = rgba(C2.teal, .18); rr(16, 96, 188, 50, 12); X.fill(); } X.font = `500 24px ${FAM.s}`; X.fillStyle = rgba(C2.ink, i ? .5 : 1); X.fillText(s, 36, 130 + i * 62); });
  X.font = `700 34px ${FAM.s}`; X.fillStyle = rgba(C2.ink); X.fillText('Financing requests', 256, 62);
  for (let r = 0; r < 6; r++) {
    const ap = S(lt - .4 - r * .08, 300), y = 100 + r * 84;
    X.globalAlpha = ap; X.fillStyle = rgba(C2.ink, .035); rr(256, y, w - 290, 70, 14); X.fill();
    X.fillStyle = rgba(C2.ink, .22); rr(282, y + 22, 160 + rnd(r) * 120, 14, 7); X.fill(); X.fillStyle = rgba(C2.ink, .1); rr(282, y + 44, 110 + rnd(r + 3) * 80, 10, 5); X.fill();
    const st = r < 2 ? 2 : r < 4 ? 1 : 0, cols = [C2.grey, C2.flame, C2.tealD], labs = ['Submitted', 'In review', 'Approved'];
    X.fillStyle = rgba(cols[st], .14); rr(w - 230, y + 18, 170, 34, 17); X.fill(); X.font = `600 19px ${FAM.s}`; X.fillStyle = rgba(cols[st]); X.fillText(labs[st], w - 212, y + 42);
    X.globalAlpha = 1;
  }
}
// T6 twenty signed (studio: glass tiles flip to teal)
SC2.T6 = (lt, D, L) => {
  studioFloor();
  const t0 = ln2(L, 0);
  const n = Math.round(20 * eo(clamp((lt - t0) / 1)));
  font(380, 900); X.letterSpacing = '-18px'; X.fillStyle = rgba(C2.ink); X.globalAlpha = S(lt - t0 + .2, 200); X.fillText(String(n), MX - 10, 620); X.globalAlpha = 1; X.letterSpacing = '0px';
  inkLine('showrooms signed', { x: MX, y: 720, size: 52, wt: 700, ls: -1, tin: t0 + .2 });
  inkLine('in the first month · names under NDA', { x: MX, y: 790, size: 30, wt: 500, col: C2.grey, tin: t0 + .45, stag: .006 });
  for (let i = 0; i < 20; i++) {
    const r = Math.floor(i / 5), c = i % 5, x = 1010 + c * 160 + r * 14, y = 250 + r * 150;
    const ti = t0 + .1 + i * .06, f = clamp((lt - ti) / .4), fl = Math.abs(Math.cos(Math.PI * f)), back = f > .5;
    const p = S(lt - (t0 - .5 + i * .02), 220); if (p < .004) continue;
    X.save(); X.globalAlpha = p; X.translate(x + 66, y + 60 + (1 - p) * 40); X.scale(f > 0 && f < 1 ? fl : 1, 1);
    X.shadowColor = 'rgba(20,32,44,.14)'; X.shadowBlur = 24; X.shadowOffsetY = 12;
    X.fillStyle = back ? rgba(C2.teal) : rgba(C2.white); rr(-66, -60, 132, 120, 22); X.fill(); X.shadowColor = 'transparent';
    if (back) check(0, 0, 60, C2.white, sm(ti + .2, ti + .5, lt)); else { X.fillStyle = rgba(C2.ink, .08); rr(-34, -6, 68, 12, 6); X.fill(); }
    X.restore();
  }
};
BG2.T6 = () => STUDIO;
// T7 the close (noir again: the mark lands, the city glows behind)
SC2.T7 = (lt, D, L) => {
  const cam = cityCam({ z: lerp(-1300, -1050, clamp(lt / D)), y: 150, pitch: -.06, yaw: .06 });
  city(cam, { grow: 1, a: .55, scan: lerp(-900, 900, (lt * .3) % 1) });
  const tg = X.createLinearGradient(0, 0, 0, H); tg.addColorStop(0, 'rgba(4,6,8,.85)'); tg.addColorStop(.6, 'rgba(4,6,8,.35)'); tg.addColorStop(1, 'rgba(4,6,8,.9)'); X.fillStyle = tg; X.fillRect(0, 0, W, H);
  mark(W / 2, 470, 1.15, C2.white, 1, ln2(L, 0) + .05);
  inkLine('From the showroom floor to KAFD.', { x: W / 2, y: 720, size: 58, wt: 700, ls: -1, col: C2.white, align: 'center', tin: ln2(L, 0) + .6, stag: .014 });
};
BG2.T7 = () => Object.assign({}, NOIR, { wipe: [C2.teal, C2.teal, C2.ink, C2.teal] });
// a live split-flap readout: each digit flips when its value changes (the flip phase comes from time)
function splitFlapLive(str, x, y, size) {
  const cw = size * .72, ch = size * 1.12, gap = size * .08, tile = [16, 22, 26];
  for (let i = 0; i < str.length; i++) {
    const cx = x + i * (cw + gap);
    X.fillStyle = rgba(tile); rr(cx, y - ch, cw, ch, size * .08); X.fill();
    X.fillStyle = 'rgba(255,255,255,.05)'; rr(cx, y - ch, cw, ch / 2, size * .08); X.fill();
    font(size * .86, 700, 'm'); X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillStyle = rgba(C2.white);
    X.fillText(str[i], cx + cw / 2, y - ch / 2 + size * .04);
    const ph = (lt * (i === 2 ? 14 : i === 1 ? 1.6 : .3)) % 1, s = Math.cos(ph * Math.PI);
    if (i === 2) { X.save(); X.translate(cx + cw / 2, y - ch / 2); X.scale(1, Math.abs(s)); X.fillStyle = rgba(mixc(tile, [0, 0, 0], .4)); X.fillRect(-cw / 2, s > 0 ? -ch / 2 : 0, cw, ch / 2); X.restore(); }
    X.fillStyle = 'rgba(0,0,0,.6)'; X.fillRect(cx, y - ch / 2 - 1.5, cw, 3);
    X.textAlign = 'left'; X.textBaseline = 'alphabetic';
  }
}
// T5: the portal in use — TargetCursor locks onto "Submit request", ClickSpark, the new request lands at the top (AnimatedList)
SC2.T5 = (lt, D, L) => {
  studioFloor();
  const p = S(lt + .1, 90);
  glass(1270, 540, 1000, 640, { ry: lerp(.6, .14, p), a: p, lift: p }, (w, h) => portalUI2(w, h, lt, D));
  mark(MX + 250, 300, .56, C2.ink, 1, .1);
  inkLine('Financing,', { x: MX, y: 560, size: 116, wt: 900, ls: -4, tin: ln2(L, 0) + .2 });
  inkLine('on your', { x: MX, y: 690, size: 116, wt: 900, ls: -4, col: C2.tealD, tin: ln2(L, 0) + .45 });
  inkLine('floor.', { x: MX, y: 820, size: 116, wt: 900, ls: -4, col: C2.tealD, tin: ln2(L, 0) + .6 });
  // screen-space cursor over the (nearly front-on) glass
  // map a point on the glass (its own pixels) to the screen, through the same affine as glass()
  const ry = lerp(.6, .14, p), kx = Math.cos(ry), sk = Math.sin(ry) * .12;
  const G = (u, v) => [1270 + kx * (u - 500), 540 + sk * (u - 500) + (v - 320)];
  const bt = G(760, 34), bc = G(845, 57), row = G(600, 140);
  targetCursor([{ t: .3, x: 1700, y: 980 }, { t: 1.0, x: bc[0], y: bc[1], lock: [bt[0], bt[1], 170 * kx, 46], click: true }, { t: 2.3, x: row[0], y: row[1] }], { col: C2.ink });
};
function portalUI2(w, h, lt, D) {
  X.fillStyle = rgba(C2.white); X.fillRect(0, 0, w, h);
  X.fillStyle = rgba(C2.ink, .04); X.fillRect(0, 0, 220, h);
  X.font = `700 26px ${FAM.s}`; X.fillStyle = rgba(C2.ink); X.fillText('AutoLink', 28, 56);
  ['Requests', 'Reports', 'Account'].forEach((s, i) => { if (!i) { X.fillStyle = rgba(C2.teal, .18); rr(16, 96, 188, 50, 12); X.fill(); } X.font = `500 24px ${FAM.s}`; X.fillStyle = rgba(C2.ink, i ? .5 : 1); X.fillText(s, 36, 130 + i * 62); });
  X.font = `700 30px ${FAM.s}`; X.fillStyle = rgba(C2.ink); X.fillText('Financing requests', 256, 66);
  // the Submit button the cursor clicks
  const pressed = lt > 1.45 && lt < 1.65;
  X.fillStyle = rgba(pressed ? C2.tealD : C2.ink); rr(w - 240, 34, 170, 46, 23); X.fill(); X.font = `600 19px ${FAM.s}`; X.fillStyle = rgba(C2.white); X.fillText('Submit request', w - 222, 64);
  // AnimatedList: the new request drops in at the top and the others slide down
  const nin = S(lt - 1.6, 260), rows = 6;
  for (let r = 0; r < rows; r++) {
    const isNew = r === 0, y = 108 + (isNew ? 0 : (r - 1 + nin) * 84) + (isNew ? (1 - nin) * -30 : 0);
    if (isNew && nin < .01) continue; if (y > h - 60) continue;
    X.globalAlpha = isNew ? nin : S(lt - .3 - r * .07, 300);
    X.fillStyle = isNew ? rgba(C2.teal, .1) : rgba(C2.ink, .035); rr(256, y, w - 290, 70, 14); X.fill();
    X.fillStyle = rgba(C2.ink, .22); rr(282, y + 22, 160 + rnd(r) * 120, 14, 7); X.fill(); X.fillStyle = rgba(C2.ink, .1); rr(282, y + 44, 110 + rnd(r + 3) * 80, 10, 5); X.fill();
    const st = isNew ? (lt > 2.7 ? 1 : 0) : r < 3 ? 2 : r < 5 ? 1 : 0, cols = [C2.grey, C2.flame, C2.tealD], labs = ['Submitted', 'In review', 'Approved'];
    X.fillStyle = rgba(cols[st], .14); rr(w - 230, y + 18, 170, 34, 17); X.fill(); X.font = `600 19px ${FAM.s}`; X.fillStyle = rgba(cols[st]); X.fillText(labs[st], w - 212, y + 42);
    X.globalAlpha = 1;
  }
}
// T6: Counter wheels roll to 20, tiles flip to signed, the last one crackles (ElectricBorder)
SC2.T6 = (lt, D, L) => {
  studioFloor();
  const t0 = ln2(L, 0);
  rollCounter(20, { x: MX - 10, y: 620, size: 380, t0: t0 - .1 });
  inkLine('showrooms signed', { x: MX, y: 720, size: 52, wt: 700, ls: -1, tin: t0 + .2 });
  inkLine('in the first month · names under NDA', { x: MX, y: 790, size: 30, wt: 500, col: C2.grey, tin: t0 + .45, stag: .006 });
  for (let i = 0; i < 20; i++) {
    const r = Math.floor(i / 5), c = i % 5, x = 1010 + c * 160 + r * 14, y = 250 + r * 150;
    const ti = t0 + .1 + i * .06, f = clamp((lt - ti) / .4), fl = Math.abs(Math.cos(Math.PI * f)), back = f > .5;
    const p = S(lt - (t0 - .5 + i * .02), 220); if (p < .004) continue;
    X.save(); X.globalAlpha = p; X.translate(x + 66, y + 60 + (1 - p) * 40); X.scale(f > 0 && f < 1 ? fl : 1, 1);
    X.shadowColor = 'rgba(20,32,44,.14)'; X.shadowBlur = 24; X.shadowOffsetY = 12;
    X.fillStyle = back ? rgba(C2.teal) : rgba(C2.white); rr(-66, -60, 132, 120, 22); X.fill(); X.shadowColor = 'transparent';
    if (back) check(0, 0, 60, C2.white, sm(ti + .2, ti + .5, lt)); else { X.fillStyle = rgba(C2.ink, .08); rr(-34, -6, 68, 12, 6); X.fill(); }
    X.restore();
  }
  const done = t0 + .1 + 19 * .06 + .5;
  electricBorder(990, 230, 840, 610, 30, C2.teal, sm(done, done + .3, lt) * (1 - sm(D - .5, D, lt)));
};

/* ======================= Part A · for sub-dealers ======================= */
const SAND = Object.assign(POSTER(C2.sand), { wipe: WIPE_A });
// A1: every day, buyers walk onto your floor (sand poster, photos fly past), then the question slams in on flame
SC2.A1 = (lt, D, L) => {
  const t1 = ln2(L, 1), t2 = ln2(L, 2), tq = t2 + ldur(L, 2) * .45;
  // FlyingPosters: showroom floors sail across on a shallow arc
  const pics = ['n-rc-night', 'q-luxhall', 'n-redcarpet', 's-sunset-row', 'q-riyadhcars-night', 'n-gclass-front', 'q-safh-dark', 'n-porsche-row'];
  const off = lt * 190;
  pics.forEach((k, i) => {
    const span = pics.length * 470; let x = ((i * 470 - off) % span + span) % span - 470;
    const c = (x + 210 - W / 2) / (W / 2), y = 560 + c * c * 70, s = 1 - Math.abs(c) * .1;
    X.save(); X.globalAlpha = clamp(1.3 - Math.abs(c)); X.translate(x + 210, y); X.rotate(c * .06); X.scale(s, s);
    X.shadowColor = 'rgba(40,30,20,.25)'; X.shadowBlur = 30; X.shadowOffsetY = 16; X.fillStyle = '#fff'; rr(-210, -150, 420, 300, 20); X.fill(); X.shadowColor = 'transparent';
    photo(IMG[k], -210, -150, 420, 300, { r: 20, zoom: 1.1 }); X.restore();
  });
  inkLine('EVERY DAY, BUYERS WALK', { x: MX, y: 200, size: 96, wt: 900, ls: -3, tin: ln2(L, 0), tout: t1 - .2 });
  inkLine('ONTO YOUR FLOOR.', { x: MX, y: 300, size: 96, wt: 900, ls: -3, col: C2.tealD, tin: ln2(L, 0) + .3, tout: t1 - .2 });
  slam('SEEN THE CAR.', { x: MX, y: 230, size: 110, align: 'left', t0: t1 + .05, from: 1.3 });
  slam('AGREED THE PRICE.', { x: MX, y: 360, size: 110, align: 'left', t0: t1 + ldur(L, 1) * .5, from: 1.3 });
  // the flame block takes the frame for the question
  const fb = eio(clamp((lt - (t2 - .1)) / .45));
  if (fb > 0) { X.fillStyle = rgba(C2.flame); X.fillRect(0, H * (1 - fb), W, H * fb); }
  if (lt > t2) {
    marquee('HOW WILL I PAY?', { y: 150, size: 120, speed: 260, dir: -1, col: C2.ink, outline: true, a: .35 * S(lt - tq, 120) });
    marquee('HOW WILL I PAY?', { y: 1040, size: 120, speed: 260, dir: 1, col: C2.ink, outline: true, a: .35 * S(lt - tq, 120) });
    slam('THEN COMES THE QUESTION.', { x: W / 2, y: 330, size: 70, t0: t2 + .2, tout: tq - .05, from: 1.2 });
    slam('HOW WILL', { x: W / 2, y: 470, size: 250, t0: tq });
    photoText('I PAY?', IMG['q-riyadhcars-night'], { x: W / 2, y: 800, size: 330, t0: tq + .4, py: .5 });
  }
};
BG2.A1 = () => SAND;
// A2: the sale walks out. A graded showroom at night, and fourteen cars on one floor line:
// ten are sold and light up; four ready buyers fade out through the door
function carPro(x, y, len, mode, a = 1) {   // a sleek side profile; mode 'sold' (lit body) or 'ghost' (outline)
  if (a < .004) return;
  const s = len / 100;
  const body = () => {
    X.beginPath(); X.moveTo(-48, 5); X.lineTo(-49.5, -1); X.quadraticCurveTo(-49, -6, -43, -7.5);
    X.quadraticCurveTo(-31, -9, -24, -15); X.quadraticCurveTo(-17, -19.5, -4, -19.5); X.quadraticCurveTo(10, -19.5, 20, -11);
    X.quadraticCurveTo(36, -9, 45, -6.5); X.quadraticCurveTo(50, -5, 50, 0); X.lineTo(49, 5); X.closePath();
  };
  X.save(); X.globalAlpha *= a; X.translate(x, y); X.scale(s, s);
  if (mode === 'sold') {
    X.shadowColor = 'rgba(86,132,255,.55)'; X.shadowBlur = 26 / s;
    const g = X.createLinearGradient(0, -20, 0, 6); g.addColorStop(0, '#dfe8ff'); g.addColorStop(.45, '#7fa2ff'); g.addColorStop(1, '#2c5bf6');
    body(); X.fillStyle = g; X.fill(); X.shadowColor = 'transparent';
    // glasshouse
    X.beginPath(); X.moveTo(-21, -13.5); X.quadraticCurveTo(-15, -17.6, -4, -17.6); X.quadraticCurveTo(8, -17.6, 16, -11.2); X.lineTo(-21, -11.2); X.closePath();
    X.fillStyle = 'rgba(4,14,44,.82)'; X.fill();
    // shoulder highlight
    X.beginPath(); X.moveTo(-42, -6.4); X.quadraticCurveTo(0, -9.4, 44, -5.6); X.strokeStyle = 'rgba(255,255,255,.75)'; X.lineWidth = .7; X.stroke();
  } else {
    body(); X.strokeStyle = 'rgba(214,226,255,.7)'; X.lineWidth = 1.3 / s; X.setLineDash([3 / s, 2.4 / s]); X.stroke(); X.setLineDash([]);
  }
  for (const wx of [-29, 31]) {
    X.beginPath(); X.arc(wx, 5, 7.2, 0, 7);
    if (mode === 'sold') { X.fillStyle = '#050b1e'; X.fill(); X.beginPath(); X.arc(wx, 5, 4, 0, 7); X.strokeStyle = 'rgba(200,214,255,.8)'; X.lineWidth = 1.1; X.stroke(); }
    else { X.fillStyle = 'rgba(3,8,24,.9)'; X.fill(); X.strokeStyle = 'rgba(214,226,255,.7)'; X.lineWidth = 1.3 / s; X.stroke(); }
  }
  X.restore();
}
SC2.A2 = (lt, D, L) => {
  const t0 = ln2(L, 0), t1 = ln2(L, 1), d1 = ldur(L, 1);
  // the graded floor: a real showroom at night, pushed slowly, in deep navy
  photo(IMG['q-luxhall'], 0, 0, W, H, { r: 0, zoom: 1.08 + .06 * clamp(lt / D), px: .45 + .1 * clamp(lt / D), py: .4 });
  X.fillStyle = 'rgba(2,10,34,.74)'; X.fillRect(0, 0, W, H);
  let g = X.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(1,6,22,.85)'); g.addColorStop(.6, 'rgba(1,6,22,.25)'); g.addColorStop(1, 'rgba(1,6,22,.55)'); X.fillStyle = g; X.fillRect(0, 0, W, H);
  g = X.createRadialGradient(W * .78, H * .2, 0, W * .78, H * .2, 900); g.addColorStop(0, 'rgba(86,132,255,.16)'); g.addColorStop(1, 'rgba(86,132,255,0)'); X.fillStyle = g; X.fillRect(0, 0, W, H);
  // eyebrow and headline
  const eb = S(lt - .15, 160);
  X.save(); X.globalAlpha = eb; X.fillStyle = rgba(C2.teal); X.fillRect(MX, 133, 44 * eb, 2); X.restore();
  mono('THE COST OF NO FINANCE', MX + 62, 142, 20, C2.teal, eb);
  line('No finance on the floor,', { x: MX, y: 258, size: 84, wt: 700, ls: -2.5, col: C2.white, tin: t0, stag: .014 });
  line('and the sale walks out.', { x: MX, y: 352, size: 84, wt: 700, ls: -2.5, col: C2.teal, tin: t0 + d1 * 0 + ldur(L, 0) * .5, stag: .014 });
  // the panel
  const pp = S(lt - (t0 + 1.2), 90), px0 = 84, py0 = 500, pw = W - 168, ph = 430;
  if (pp > .004) {
    X.save(); X.globalAlpha = pp; X.translate(0, (1 - pp) * 30);
    X.fillStyle = 'rgba(8,18,52,.52)'; rr(px0, py0, pw, ph, 28); X.fill();
    const bg = X.createLinearGradient(0, py0, 0, py0 + ph); bg.addColorStop(0, 'rgba(160,190,255,.32)'); bg.addColorStop(1, 'rgba(160,190,255,.06)');
    X.strokeStyle = bg; X.lineWidth = 1.5; rr(px0, py0, pw, ph, 28); X.stroke();
    const sw = lerp(-.2, 1.2, clamp((lt - (t0 + 1.4)) / 2.2));   // one light sweep along the top edge
    const hl = X.createLinearGradient(px0, 0, px0 + pw, 0); hl.addColorStop(clamp(sw - .12), 'rgba(255,255,255,0)'); hl.addColorStop(clamp(sw), 'rgba(255,255,255,.7)'); hl.addColorStop(clamp(sw + .12), 'rgba(255,255,255,0)');
    X.strokeStyle = hl; X.lineWidth = 2; X.beginPath(); X.moveTo(px0 + 28, py0); X.lineTo(px0 + pw - 28, py0); X.stroke();
    mono('WHAT OWNERS TOLD US', px0 + 56, py0 + 62, 18, [170, 190, 235], 1);
    mono('FOR EVERY 10 CARS SOLD', px0 + pw - 56, py0 + 62, 18, [170, 190, 235], .8, 'right');
    X.restore();
  }
  // the floor line, the door, fourteen cars
  const fy = 708, cl = 108, gap = 10, n = 14, rowW = n * cl + (n - 1) * gap, x0 = 140, doorX = x0 + rowW + 22;
  const fl = S(lt - (t0 + 1.5), 60);
  if (fl > .004) {
    const lg = X.createLinearGradient(x0 - 40, 0, doorX, 0); lg.addColorStop(0, 'rgba(160,190,255,0)'); lg.addColorStop(.15, 'rgba(160,190,255,.4)'); lg.addColorStop(1, 'rgba(160,190,255,.4)');
    X.save(); X.globalAlpha = fl; X.fillStyle = lg; X.fillRect(x0 - 40, fy + 13, (doorX - x0 + 40) * fl, 1.5); X.restore();
  }
  const tg = t1 + d1 * .52, tgo = tg + 1.3;
  const door = sm(tg + .3, tg + .9, lt) * pp;
  if (door > 0) {
    const dg = X.createLinearGradient(0, fy - 130, 0, fy + 16); dg.addColorStop(0, 'rgba(120,160,255,0)'); dg.addColorStop(.5, 'rgba(160,190,255,.9)'); dg.addColorStop(1, 'rgba(160,190,255,.2)');
    X.save(); X.globalAlpha = door; X.fillStyle = dg; X.fillRect(doorX - 1, fy - 130, 2, 146);
    const hz = X.createRadialGradient(doorX, fy - 50, 0, doorX, fy - 50, 140); hz.addColorStop(0, 'rgba(86,132,255,.28)'); hz.addColorStop(1, 'rgba(86,132,255,0)'); X.fillStyle = hz; X.fillRect(doorX - 140, fy - 190, 280, 280);
    X.restore();
    mono('THE DOOR', doorX, fy + 52, 15, [170, 190, 235], door * .8, 'center');
  }
  X.save(); X.beginPath(); X.rect(0, 0, doorX, H); X.clip();
  for (let i = 0; i < n; i++) {
    const cx = x0 + i * (cl + gap) + cl / 2;
    if (i < 10) {
      const p = S(lt - (t1 + .25 + i * .085), 140); if (p < .004) continue;
      carPro(cx, fy + (1 - p) * 18, cl, 'sold', p);
      X.save(); X.translate(0, 2 * (fy + 13)); X.scale(1, -1); carPro(cx, fy + (1 - p) * 18, cl, 'sold', p * .14); X.restore();
    } else {
      const j = i - 10, p = S(lt - (tg + j * .1), 140); if (p < .004) continue;
      const go = ei(clamp((lt - (tgo + j * .16)) / 1.6)), gx = cx + go * (doorX - cx + 160);
      carPro(gx, fy, cl, 'ghost', p * (1 - sm(doorX - 120, doorX, gx)));
    }
  }
  X.restore();
  // the numbers
  const c1 = t1 + .25;
  count(0, 10, { x: x0, y: 842, size: 104, t0: c1, dur: .9, wt: 700, col: C2.white, tin: c1 - .1 });
  mono('SOLD ON THE FLOOR', x0 + 4, 880, 17, [170, 190, 235], S(lt - c1, 160));
  const gxL = x0 + 10 * (cl + gap);
  count(0, 4, { x: gxL, y: 842, size: 104, t0: tg, dur: .6, wt: 700, col: C2.teal, tin: tg - .1 });
  mono('READY BUYERS LEAVE', gxL + 4, 880, 17, [170, 190, 235], S(lt - tg, 160));
  mono('WITHOUT A CAR', gxL + 4, 904, 17, [170, 190, 235], S(lt - tg, 160));
  const tz = tgo + .5, zp = S(lt - tz, 120);
  if (zp > .004) {
    X.save(); X.globalAlpha = zp; X.fillStyle = 'rgba(160,190,255,.25)'; X.fillRect(1380, 196, 1.5, 200); X.restore();
    count(0, 40, { x: 1424, y: 330, size: 190, t0: tz, dur: .9, wt: 400, col: C2.white, tin: tz - .05, post: '%' });
    mono('MORE SALES,', 1430, 378, 19, [170, 190, 235], zp);
    mono('LOST AT THE DOOR', 1430, 404, 19, [170, 190, 235], zp);
  }
};
BG2.A2 = () => Object.assign({}, NOIR, { wipe: WIPE_A });
// A3: financing on your floor — Stepper over the glass portal, the cursor submits a request
SC2.A3 = (lt, D, L) => {
  studioFloor();
  const t1 = ln2(L, 1), span = ldur(L, 1);
  mark(W / 2, 140, .5, C2.ink, 1, .05);
  inkLine('Financing, on your floor.', { x: W / 2, y: 300, size: 100, wt: 900, ls: -4, align: 'center', tin: ln2(L, 0) + .1, stag: .012 });
  // Stepper
  const steps = ['Log in', 'Dashboard', 'Submit request', 'Track it'], pr = eio(clamp((lt - t1) / (span * .85)));
  const sx = 420, ex = 1500, y = 420;
  X.fillStyle = rgba(C2.ink, .1); rr(sx, y - 3, ex - sx, 6, 3); X.fill(); X.fillStyle = rgba(C2.teal); rr(sx, y - 3, (ex - sx) * pr, 6, 3); X.fill();
  steps.forEach((s, k) => {
    const x = lerp(sx, ex, k / 3), on = pr * 3 >= k - .02, p = S(lt - (t1 - .4 + k * .07), 300); if (p < .004) return;
    X.save(); X.globalAlpha = p; X.shadowColor = 'rgba(20,32,44,.14)'; X.shadowBlur = 18; X.shadowOffsetY = 8;
    X.fillStyle = rgba(on ? C2.teal : C2.white); X.beginPath(); X.arc(x, y, 30, 0, 7); X.fill(); X.shadowColor = 'transparent';
    if (on) check(x, y, 34, C2.white, 1); else { font(24, 700); X.fillStyle = rgba(C2.ink, .5); X.textAlign = 'center'; X.fillText(String(k + 1), x, y + 9); X.textAlign = 'left'; }
    font(26, 700); X.fillStyle = rgba(C2.ink, on ? 1 : .45); X.textAlign = 'center'; X.fillText(s, x, y + 76); X.textAlign = 'left';
    X.restore();
  });
  // the portal itself, with the request going in
  const gp = S(lt - (t1 - .2), 120);
  X.save(); X.globalAlpha = gp; X.translate(W / 2, 790); X.scale(.78, .78); X.translate(-W / 2, -790);
  glass(W / 2, 790, 1000, 560, { ry: lerp(.5, 0, gp), a: 1, lift: gp }, (w, h) => portalUI2(w, h, lt - (t1 + span * .45) + 1.0, D));
  X.restore();
};
BG2.A3 = () => Object.assign({}, STUDIO, { wipe: WIPE_B });
// A4: one dashboard, three languages (RotatingText)
SC2.A4 = (lt, D, L) => {
  studioFloor();
  const t0 = ln2(L, 0), per = ldur(L, 0) * .85 / 3, act = clamp(Math.floor((lt - t0) / per), 0, 2);
  inkLine('One dashboard.', { x: MX, y: 230, size: 104, wt: 900, ls: -4, tin: t0 });
  inkLine('Requests, reports, account.', { x: MX, y: 320, size: 44, wt: 500, col: C2.grey, tin: t0 + .3, stag: .008 });
  const p = S(lt + .1, 120);
  glass(1260, 600, 1040, 620, { ry: lerp(.4, .08, p), a: p, lift: p }, (w, h) => {
    X.fillStyle = rgba(C2.white); X.fillRect(0, 0, w, h); X.fillStyle = rgba(C2.ink, .04); X.fillRect(0, 0, 240, h);
    X.font = `700 26px ${FAM.s}`; X.fillStyle = rgba(C2.ink); X.fillText('AutoLink', 30, 56);
    ['Requests', 'Reports', 'Account'].forEach((s, i) => { const on = i === act && lt >= t0; if (on) { X.fillStyle = rgba(C2.teal, .2); rr(16, 96 + i * 64, 208, 52, 12); X.fill(); } X.font = `${on ? 700 : 500} 24px ${FAM.s}`; X.fillStyle = rgba(C2.ink, on ? 1 : .45); X.fillText(s, 38, 130 + i * 64); });
    const mx = 280;
    if (act === 0) for (let r = 0; r < 6; r++) { X.globalAlpha = S(lt - (t0 + r * .06), 300); X.fillStyle = rgba(C2.ink, .035); rr(mx, 100 + r * 84, w - 320, 70, 14); X.fill(); X.fillStyle = rgba(C2.ink, .22); rr(mx + 24, 124 + r * 84, 180 + rnd(r) * 140, 14, 7); X.fill(); const cs = [C2.tealD, C2.flame, C2.grey][r % 3]; X.fillStyle = rgba(cs, .15); rr(w - 230, 118 + r * 84, 170, 34, 17); X.fill(); X.globalAlpha = 1; }
    if (act === 1) { const bp = sm(t0 + per, t0 + per + .7, lt); for (let b = 0; b < 12; b++) { const bh = (100 + rnd(b + 4) * 320) * bp; X.fillStyle = rgba(b % 3 ? C2.teal : C2.tealD); rr(mx + 30 + b * 62, 560 - bh, 38, bh, 8); X.fill(); } }
    if (act === 2) { X.fillStyle = rgba(C2.ink, .06); X.beginPath(); X.arc(mx + 90, 190, 60, 0, 7); X.fill(); for (let r = 0; r < 4; r++) { X.fillStyle = rgba(C2.ink, .12); rr(mx + 190, 150 + r * 56, 300 + rnd(r + 9) * 200, 18, 9); X.fill(); } }
    // RotatingText: English -> العربية -> 中文
    const langs = ['English', 'العربية', '中文'], t1 = ln2(L, 1), lp = clamp((lt - t1) / (ldur(L, 1) * .9)) * 2.999;
    const li = lt < t1 ? 0 : Math.floor(lp), lf = lt < t1 || li === 2 ? 0 : sm(.55, 1, lp - li);
    X.fillStyle = rgba(C2.ink); rr(w - 290, 30, 250, 56, 28); X.fill();
    X.save(); rr(w - 290, 30, 250, 56, 28); X.clip(); X.font = `700 26px ${FAM.s}`; X.textAlign = 'center'; X.fillStyle = rgba(C2.white);
    X.fillText(langs[li], w - 165, 68 - lf * 56); if (li < 2) X.fillText(langs[li + 1], w - 165, 124 - lf * 56); X.restore();
  });
  const t1 = ln2(L, 1);
  inkLine('In Arabic, English', { x: MX, y: 470, size: 40, wt: 700, col: C2.tealD, tin: t1, stag: .008 });
  inkLine('or Chinese.', { x: MX, y: 520, size: 40, wt: 700, col: C2.tealD, tin: t1 + .2, stag: .008 });
};
BG2.A4 = () => STUDIO;
// A5: we train your sales team — CardSwap of the four rules
SC2.A5 = (lt, D, L) => {
  studioFloor();
  inkLine('We train your', { x: MX, y: 380, size: 104, wt: 900, ls: -4, tin: ln2(L, 0) });
  inkLine('sales team.', { x: MX, y: 500, size: 104, wt: 900, ls: -4, col: C2.tealD, tin: ln2(L, 0) + .25 });
  inkLine('On the portal, and on the', { x: MX, y: 600, size: 38, wt: 500, col: C2.grey, tin: ln2(L, 0) + .7, stag: .006 });
  inkLine('conversation with the buyer.', { x: MX, y: 650, size: 38, wt: 500, col: C2.grey, tin: ln2(L, 0) + .9, stag: .006 });
  const rules = ['Let them finish.', 'Reflect before you respond.', 'Ask one clarifying question.', 'Then answer, briefly.'];
  const t0 = .5, per = (D - t0 - .4) / 4;
  for (let k = 0; k < 4; k++) {
    const st = (lt - (t0 + k * per)) / per; if (st < -.7) continue;
    const front = S(st + .7, 5), back = Math.max(0, st - .45), depth = Math.min(3, back);
    const a = front * (1 - clamp((depth - 2.2) / .8)); if (a < .004) continue;
    X.save(); X.globalAlpha = a; X.translate(1340 + depth * 50, 520 - depth * 46 + (1 - front) * 300); X.scale(1 - depth * .07, 1 - depth * .07); X.rotate(-.03 * depth);
    X.shadowColor = 'rgba(20,32,44,.18)'; X.shadowBlur = 40; X.shadowOffsetY = 20; X.fillStyle = rgba(C2.white); rr(-340, -170, 680, 340, 30); X.fill(); X.shadowColor = 'transparent';
    X.globalAlpha = a * (1 - clamp(depth * .6));
    X.font = `700 24px ${FAM.m}`; X.fillStyle = rgba(C2.teal); X.fillText(String(k + 1).padStart(2, '0'), -290, -90);
    X.font = `900 54px ${FAM.s}`; X.letterSpacing = '-1px'; X.fillStyle = rgba(C2.ink); wrapText(rules[k], -290, 0, 580, 64); X.letterSpacing = '0px';
    X.restore();
  }
};
BG2.A5 = () => STUDIO;
// A6: the roadmap (studio): now / next / then on glass cards
SC2.A6 = (lt, D, L) => {
  studioFloor();
  inkLine('What comes next.', { x: MX, y: 230, size: 104, wt: 900, ls: -4, tin: .1 });
  const nodes = [
    { k: 'NOW', a: 'Financing on your floor', b: 'through the dealer portal', t: .4, done: 1 },
    { k: 'NEXT', a: 'Every buyer matched', b: 'to the right lender, for faster approvals', t: ln2(L, 0) + ldur(L, 0) * .35 },
    { k: 'THEN', a: 'Your stock online', b: 'and new buyers sent to your door', t: ln2(L, 1) + .1 },
  ];
  const y = 560, pr = sm(.3, ln2(L, 1) + ldur(L, 1) * .5, lt);
  X.fillStyle = rgba(C2.ink, .1); rr(MX + 30, y - 3, 1560, 6, 3); X.fill(); X.fillStyle = rgba(C2.teal); rr(MX + 30, y - 3, 1560 * pr, 6, 3); X.fill();
  nodes.forEach((n, i) => {
    const x = MX + 30 + i * 560, p = S(lt - n.t, 220); if (p < .004) return;
    X.save(); X.globalAlpha = p; X.fillStyle = rgba(n.done ? C2.teal : C2.white); X.strokeStyle = rgba(C2.teal); X.lineWidth = 5; X.beginPath(); X.arc(x, y, 20, 0, 7); X.fill(); X.stroke();
    if (n.done) check(x, y, 24, C2.white, 1);
    X.translate(0, (1 - p) * 40); X.shadowColor = 'rgba(20,32,44,.14)'; X.shadowBlur = 30; X.shadowOffsetY = 14; X.fillStyle = rgba(C2.white); rr(x - 20, y + 60, 500, 220, 26); X.fill(); X.shadowColor = 'transparent';
    X.font = `700 20px ${FAM.m}`; X.fillStyle = rgba(n.done ? C2.tealD : C2.flame); X.fillText(n.k, x + 14, y + 112);
    X.font = `900 40px ${FAM.s}`; X.fillStyle = rgba(C2.ink); X.fillText(n.a, x + 14, y + 168);
    X.font = `500 24px ${FAM.s}`; X.fillStyle = rgba(C2.grey); wrapText(n.b, x + 14, y + 212, 450, 30);
    X.restore();
  });
};
BG2.A6 = () => STUDIO;
// A7: twenty signed, one tile left for you, then the close
SC2.A7 = (lt, D, L) => {
  const t1 = ln2(L, 1), tc = t1 - .35;
  if (lt < tc + .8) {
    const q = sm(tc, tc + .8, lt); X.save(); X.globalAlpha = 1 - q;
    studioFloor();
    const t0 = ln2(L, 0);
    rollCounter(20, { x: MX - 10, y: 560, size: 360, t0: t0 - .1 });
    inkLine('showrooms signed.', { x: MX, y: 660, size: 52, wt: 700, ls: -1, tin: t0 + .2 });
    inkLine('Yours could be next.', { x: MX, y: 740, size: 52, wt: 900, ls: -1, col: C2.tealD, tin: t0 + ldur(L, 0) * .55 });
    for (let i = 0; i < 21; i++) {
      const r = Math.floor(i / 5), c = i % 5, x = 1010 + c * 160 + r * 14, y = 170 + r * 150;
      if (i === 20) { const p = S(lt - (t0 + ldur(L, 0) * .55), 200); if (p > .01) { electricBorder(x, y, 132, 120, 22, C2.teal, p); font(26, 900); X.fillStyle = rgba(C2.tealD); X.globalAlpha = (1 - q) * p; X.fillText('YOU?', x + 34, y + 70); X.globalAlpha = 1 - q; } continue; }
      const ti = t0 + .1 + i * .05, f = clamp((lt - ti) / .4), fl = Math.abs(Math.cos(Math.PI * f)), back = f > .5, p = S(lt - (t0 - .5 + i * .02), 220); if (p < .004) continue;
      X.save(); X.globalAlpha = (1 - q) * p; X.translate(x + 66, y + 60); X.scale(f > 0 && f < 1 ? fl : 1, 1);
      X.shadowColor = 'rgba(20,32,44,.14)'; X.shadowBlur = 24; X.shadowOffsetY = 12; X.fillStyle = back ? rgba(C2.teal) : rgba(C2.white); rr(-66, -60, 132, 120, 22); X.fill(); X.shadowColor = 'transparent';
      if (back) check(0, 0, 60, C2.white, sm(ti + .2, ti + .5, lt)); X.restore();
    }
    X.restore();
  }
  if (lt > tc) {
    const q = sm(tc, tc + .8, lt); X.save(); X.globalAlpha = q;
    X.fillStyle = rgba(C2.void); X.fillRect(0, 0, W, H);
    city(cityCam({ z: lerp(-1300, -1050, clamp((lt - tc) / (D - tc))), y: 150, pitch: -.06, yaw: .06 }), { grow: 1, a: .5 });
    const tg = X.createLinearGradient(0, 0, 0, H); tg.addColorStop(0, 'rgba(4,6,8,.85)'); tg.addColorStop(.6, 'rgba(4,6,8,.35)'); tg.addColorStop(1, 'rgba(4,6,8,.9)'); X.fillStyle = tg; X.fillRect(0, 0, W, H);
    X.restore();
    mark(W / 2, 440, 1.1, C2.white, 1, tc + .4);
    inkLine('Every buyer on your floor,', { x: W / 2, y: 680, size: 60, wt: 700, ls: -1, col: C2.white, align: 'center', tin: t1 + ldur(L, 1) * .25, stag: .012 });
    inkLine('a buyer you can finance.', { x: W / 2, y: 760, size: 60, wt: 900, ls: -1, col: C2.teal, align: 'center', tin: t1 + ldur(L, 1) * .45, stag: .012 });
  }
};
BG2.A7 = () => Object.assign({}, STUDIO, { vig: .3 });

/* ======================= Part B · for the CEO and investors ======================= */
SC2.B1 = (lt, D, L) => SC2.T1(lt, D, L);
BG2.B1 = () => NOIR;
SC2.B2 = (lt, D, L) => { SC2.T2(lt, D, L); const sh = X.createLinearGradient(0, 0, 900, 0); sh.addColorStop(0, 'rgba(4,6,8,.55)'); sh.addColorStop(1, 'rgba(4,6,8,0)'); X.fillStyle = sh; X.fillRect(0, 380, 900, 60); mono('BY DAY AND AFTER DARK · AL QADISIYAH + AL SHIFA', MX + 8, 420, 20, C2.grey, S(lt - .8, 200)); };
BG2.B2 = () => NOIR;
// B3: the census as a HUD bento of dark glass cells
function hudCard(x, y, w, h, a) {
  X.save(); X.globalAlpha = a; X.fillStyle = 'rgba(12,20,24,.72)'; rr(x, y, w, h, 18); X.fill(); X.strokeStyle = rgba(C2.teal, .25); X.lineWidth = 1.5; X.stroke();
  X.strokeStyle = rgba(C2.teal, .9); X.lineWidth = 3; const l = 24; [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([cx, cy, sx, sy]) => { X.beginPath(); X.moveTo(cx + sx * l, cy); X.lineTo(cx, cy); X.lineTo(cx, cy + sy * l); X.stroke(); });
  X.restore();
}
SC2.B3 = (lt, D, L) => {
  city(cityCam({ z: lerp(-1350, -1500, clamp(lt / D)), y: 1250, pitch: -.78 }), { grow: 1, a: .3 });
  hud(lt, 'CENSUS · TWO DISTRICTS · ONE STANDARD');
  const t0 = ln2(L, 0), tm = t0 + ldur(L, 0) * .5, t1 = ln2(L, 1), tn = t1 + ldur(L, 1) * .58;
  const cells = [
    { x: MX, y: 170, w: 790, h: 360, v: '520', lab: 'SHOWROOMS · DOOR TO DOOR', t: t0 + .05 },
    { x: 980, y: 170, w: 790, h: 360, v: '514', lab: 'PINNED AT GPS COORDINATES', t: tm },
    { x: MX, y: 570, w: 790, h: 360, v: '31,869', lab: 'CARS COUNTED ON THE FLOOR', t: t1 + .05 },
    { x: 980, y: 570, w: 790, h: 360, v: 'SAR 3.6B', lab: 'STOCK ON DISPLAY', t: tn, col: C2.teal },
  ];
  cells.forEach(c => {
    const p = S(lt - (c.t - .35), 160); if (p < .004) return;
    hudCard(c.x, c.y + (1 - p) * 30, c.w, c.h, p);
    decrypt(c.v, { x: c.x + 50, y: c.y + 230, size: 170, t0: c.t, dur: .9, col: c.col || C2.white });
    mono(c.lab, c.x + 56, c.y + 300, 22, C2.teal, S(lt - c.t - .5, 200));
  });
};
BG2.B3 = () => NOIR;
// B4: the owners' books
SC2.B4 = (lt, D, L) => {
  city(cityCam({ z: -1500, y: 1250, pitch: -.78, yaw: lt * .02 }), { grow: 1, a: .2 });
  hud(lt, "OWNERS' BOOKS · AL QADISIYAH");
  const t0 = ln2(L, 0), t1 = ln2(L, 1), tv = t1 + ldur(L, 1) * .3;
  splitFlap('25', { x: MX, y: 380, size: 200, t0: t0 + .05 });
  slam('OWNERS OPENED THEIR BOOKS.', { x: MX + 360, y: 330, size: 64, align: 'left', col: C2.white, t0: t0 + .3, from: 1.2 });
  for (let i = 0; i < 25; i++) {   // ledgers fan out
    const p = S(lt - (t0 + .2 + i * .03), 150); if (p < .004) continue;
    X.save(); X.globalAlpha = p * (1 - .6 * sm(t1, t1 + .6, lt)); X.translate(1500, 900); X.rotate(lerp(-.9, .9, i / 24) * p); X.translate(0, -330);
    X.fillStyle = 'rgba(12,20,24,.9)'; rr(-70, -95, 140, 190, 12); X.fill(); X.strokeStyle = rgba(C2.teal, .5); X.lineWidth = 1.5; X.stroke();
    for (let r = 0; r < 5; r++) { X.fillStyle = rgba(C2.teal, r ? .25 : .7); X.fillRect(-48, -66 + r * 26, 96 - (r % 2) * 30, 6); }
    X.restore();
  }
  decrypt('SAR 15.7B', { x: MX, y: 760, size: 220, t0: tv, dur: 1.1, col: C2.teal });
  mono('A YEAR · AL QADISIYAH ALONE · CONSERVATIVE ESTIMATE FROM THE OWNERS’ OWN NUMBERS', MX + 6, 830, 20, C2.grey, S(lt - tv - .6, 200));
};
BG2.B4 = () => NOIR;
// B5: where the money leaks (flame poster)
SC2.B5 = (lt, D, L) => {
  const t1 = ln2(L, 1), t2 = ln2(L, 2), tr = t1 + ldur(L, 1) * .45;
  marquee('WHERE THE MONEY LEAKS', { y: 1020, size: 110, speed: 180, col: C2.ink, outline: true, a: .3 });
  slam('WHERE THE MONEY', { x: MX, y: 200, size: 120, align: 'left', t0: ln2(L, 0), tout: t2 - .3, from: 1.3 });
  slam('LEAKS.', { x: MX + 1150, y: 200, size: 120, align: 'left', col: C2.white, t0: ln2(L, 0) + .45, tout: t2 - .3, from: 1.6 });
  const a1 = S(lt - t1, 200) * (1 - S(lt - (t2 - .3), 220));
  if (a1 > .004) {
    X.save(); X.globalAlpha = a1;
    for (let i = 0; i < 13; i++) { const on = i < 11, p = sm(t1 + .15 + i * .05, t1 + .4 + i * .05, lt); X.fillStyle = on ? rgba(C2.ink, p) : rgba(C2.white, .9 * p); rr(MX + (i % 7) * 100, 300 + Math.floor(i / 7) * 100, 80, 80, 12); X.fill(); }
    X.restore();
    count(0, 11, { x: MX, y: 620, size: 150, wt: 900, col: C2.ink, t0: t1 + .15, dur: .6, tin: t1, post: 'OF 13 FLOORS · NO BANK ON SITE', postSize: 30, tout: t2 - .3 });
    const rp = eio(clamp((lt - tr) / 1.2)), cx = 1340, cy = 450;
    X.save(); X.globalAlpha = a1 * S(lt - (tr - .3), 160); X.lineWidth = 34; X.lineCap = 'round'; X.strokeStyle = 'rgba(0,0,0,.18)'; X.beginPath(); X.arc(cx, cy, 150, 0, 7); X.stroke(); X.strokeStyle = rgba(C2.ink); X.beginPath(); X.arc(cx, cy, 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (194 / 210) * rp); X.stroke(); X.restore();
    count(0, 194, { x: cx, y: cy + 28, size: 92, wt: 900, col: C2.ink, align: 'center', t0: tr, dur: 1.2, tin: tr - .2, tout: t2 - .3 });
    slam('OF 210 AL SHIFA FLOORS: CASH ONLY', { x: cx, y: 690, size: 40, col: C2.ink, t0: tr + .4, tout: t2 - .3, from: 1.1 });
  }
  if (lt > t2 - .2) {
    const fb = eio(clamp((lt - (t2 - .2)) / .45)); X.fillStyle = rgba(C2.ink); X.fillRect(0, 0, W * fb, H);
    const tv = t2 + ldur(L, 2) * .35;
    for (let i = 0; i < 60; i++) { const x = 160 + rnd(i) * 1600, sp = 200 + rnd(i + 1) * 260, y = ((lt - t2) * sp + rnd(i + 2) * 1100) % 1150 - 50, l = 40 + rnd(i + 3) * 120; X.strokeStyle = rgba(C2.flame, .55 * fb); X.lineWidth = 2; X.beginPath(); X.moveTo(x, y - l); X.lineTo(x, y); X.stroke(); }
    slam('SAR 1.4B', { x: W / 2, y: 560, size: 300, col: C2.flame, t0: tv });
    slam('A YEAR WALKS AWAY', { x: W / 2, y: 690, size: 80, col: C2.white, t0: tv + .35, from: 1.2 });
    mono('FROM JUST 24 FLOORS · FOR WANT OF A LOAN', W / 2, 780, 26, C2.sand, S(lt - tv - .7, 200), 'center');
  }
};
BG2.B5 = () => Object.assign(POSTER(C2.flame), { wipe: WIPE_A });
// B6: the map no one else holds (noir, the whole city lit)
SC2.B6 = (lt, D, L) => {
  const u = clamp(lt / D);
  city(cityCam({ z: lerp(-1500, -1250, u), y: lerp(1300, 900, u), pitch: lerp(-.8, -.6, u), yaw: lerp(-.08, .08, u) }), { grow: 1, scan: lerp(-700, 700, u), a: 1 });
  const sh = X.createLinearGradient(0, 0, 0, 620); sh.addColorStop(0, 'rgba(4,6,8,.92)'); sh.addColorStop(1, 'rgba(4,6,8,0)'); X.fillStyle = sh; X.fillRect(0, 0, W, 620);
  hud(lt, 'THE MAP NO ONE ELSE HAS');
  slam('NO ONE ELSE', { x: W / 2, y: 260, size: 150, col: C2.white, t0: ln2(L, 0) });
  slam('HOLDS THIS.', { x: W / 2, y: 410, size: 150, col: C2.teal, t0: ln2(L, 0) + .4 });
  mono('THE LARGEST SUB-DEALER MAPPING OF ITS KIND · ON ONE STANDARD', W / 2, 980, 22, C2.teal, S(lt - ln2(L, 0) - 1, 200), 'center');
};
BG2.B6 = () => Object.assign({}, NOIR, { wipe: WIPE_B });
// B7: traction (studio)
SC2.B7 = (lt, D, L) => {
  studioFloor();
  const t0 = ln2(L, 0), t1 = ln2(L, 1), t2 = ln2(L, 2);
  inkLine('And it is already moving.', { x: MX, y: 200, size: 76, wt: 900, ls: -3, tin: t0 });
  rollCounter(20, { x: MX - 10, y: 560, size: 320, t0: t1 });
  inkLine('sub-dealers signed in one month', { x: MX, y: 640, size: 40, wt: 700, tin: t1 + .3, stag: .008 });
  mono('NAMES WITHHELD · UNDER NDA', MX + 4, 690, 20, C2.grey, S(lt - t1 - .6, 200));
  const st = [['16', 'more agreements sent', t1 + ldur(L, 1) * .45, C2.ink], ['64', 'in the pipeline', t1 + ldur(L, 1) * .78, C2.ink], [FILM.id === 'R' ? '19' : '18', 'lenders at the table', t2 + .2, C2.tealD]];
  st.forEach(([v, s, t, col], k) => {
    const p = S(lt - (t - .2), 220); if (p < .004) return;
    const x = 960, y = 280 + k * 220;
    X.save(); X.globalAlpha = p; X.translate(0, (1 - p) * 40); X.shadowColor = 'rgba(20,32,44,.14)'; X.shadowBlur = 30; X.shadowOffsetY = 14; X.fillStyle = rgba(C2.white); rr(x, y, 800, 180, 26); X.fill(); X.shadowColor = 'transparent'; X.restore();
    count(0, +v, { x: x + 40, y: y + 128, size: 110, wt: 900, col, t0: t, dur: .7, tin: t - .2 });
    inkLine(s, { x: x + 230, y: y + 108, size: 32, wt: 700, tin: t + .1, stag: .006 });
  });
  const done = t2 + .9; electricBorder(950, 700, 820, 200, 26, C2.teal, sm(done, done + .3, lt));
};
BG2.B7 = () => Object.assign({}, STUDIO, { wipe: WIPE_B });
// B8: the founder's line (ink poster), then the close (noir)
SC2.B8 = (lt, D, L) => {
  const t1 = ln2(L, 1), tc = t1 - .3;
  if (lt < tc + .6) {
    X.save(); X.globalAlpha = 1 - sm(tc, tc + .6, lt);
    X.fillStyle = rgba(C2.ink); X.fillRect(0, 0, W, H);
    mono('OUR FOUNDER', W / 2, 260, 24, C2.teal, S(lt - .1, 200), 'center');
    slam('WE ARE NOT HERE TO', { x: W / 2, y: 430, size: 120, col: C2.white, t0: ln2(L, 0) });
    slam('MAP A MARKET.', { x: W / 2, y: 570, size: 120, col: C2.white, t0: ln2(L, 0) + .5 });
    slam('WE ARE HERE TO MOVE IT.', { x: W / 2, y: 760, size: 110, col: C2.teal, t0: ln2(L, 0) + ldur(L, 0) * .5 });
    X.restore();
  }
  if (lt > tc) {
    const q = sm(tc, tc + .6, lt); X.save(); X.globalAlpha = q;
    city(cityCam({ z: lerp(-1300, -1050, clamp((lt - tc) / (D - tc))), y: 150, pitch: -.06, yaw: .06 }), { grow: 1, a: .55, scan: lerp(-900, 900, ((lt - tc) * .3) % 1) });
    const tg = X.createLinearGradient(0, 0, 0, H); tg.addColorStop(0, 'rgba(4,6,8,.85)'); tg.addColorStop(.6, 'rgba(4,6,8,.35)'); tg.addColorStop(1, 'rgba(4,6,8,.9)'); X.fillStyle = tg; X.fillRect(0, 0, W, H);
    X.restore();
    mark(W / 2, 470, 1.15, C2.white, 1, tc + .35);
    inkLine('From the showroom floor to KAFD.', { x: W / 2, y: 720, size: 58, wt: 700, ls: -1, col: C2.white, align: 'center', tin: tc + .9, stag: .014 });
  }
};
BG2.B8 = () => Object.assign({}, NOIR, { wipe: [C2.teal, C2.ink, C2.teal, C2.ink] });
