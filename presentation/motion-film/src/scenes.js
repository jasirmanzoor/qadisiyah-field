'use strict';
// Scenes. Each is f(lt, D, L): lt = seconds since the scene began, D = its length, L = its narration lines
// ({t, dur} in scene time). Everything on screen is placed from those times, so picture and voice stay in step.
const M = 160;                          // left margin
const ln = (L, i) => L[Math.min(i, L.length - 1)].t;
const lend = (L, i) => L[Math.min(i, L.length - 1)].t + L[Math.min(i, L.length - 1)].dur;
function push(lt, D, amt = .04, cx = W / 2, cy = H / 2) { const s = 1 + amt * clamp(lt / D); X.translate(cx, cy); X.scale(s, s); X.translate(-cx, -cy); }
function lockup(x, y, h, a = 1, tin = 0) {
  const im = IMG.lockup; if (!im) return; const p = S(lt - tin, 120); if (p < .004) return;
  const w = h * im.width / im.height;
  X.save(); X.globalAlpha = a * p;
  X.translate(x, y + (1 - p) * 24); X.scale(.92 + .08 * p, .92 + .08 * p); X.drawImage(im, -w / 2, -h / 2, w, h); X.restore();
}

/* ---------- Hyperspeed: tail lights away from us, headlights toward us, on a dark road ---------- */
function hyper(lt, vAt, a = 1) {
  const f = 820, cy = 690;
  X.save(); X.globalAlpha = a; X.lineCap = 'round';
  // horizon glow and road edges
  const hg = X.createRadialGradient(W / 2, cy, 0, W / 2, cy, 900); hg.addColorStop(0, rgba(COL.flame, .22)); hg.addColorStop(.35, rgba(COL.flame, .05)); hg.addColorStop(1, rgba(COL.flame, 0));
  X.fillStyle = hg; X.fillRect(0, cy - 400, W, 800);
  X.strokeStyle = rgba(COL.fog, .1); X.lineWidth = 2;
  for (const ex of [-3.4, -.12, .12, 3.4]) { X.beginPath(); X.moveTo(W / 2 + ex * f / 1.1, cy + 1.5 * f / 1.1); X.lineTo(W / 2 + ex * f / 90, cy + 1.5 * f / 90); X.stroke(); }
  const pos = vAt.pos(lt), v = vAt.v(lt);
  X.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 360; i++) {
    const away = i % 2 === 0, lane = away ? -3.1 + rnd(i) * 2.8 : .3 + rnd(i) * 2.8;
    const yh = 1.5 - rnd(i + 7) * .25;
    const z = ((rnd(i + 9) * 90 + (away ? 1 : -1.5) * pos * (.7 + .5 * rnd(i + 5))) % 90 + 90) % 90 + 1.4;
    const len = Math.max(.04, v * (away ? .045 : .07) * (.7 + .6 * rnd(i + 2)));
    const p1 = [W / 2 + lane * f / z, cy + yh * f / z], p2 = [W / 2 + lane * f / (z + len), cy + yh * f / (z + len)];
    const col = away ? (i % 3 ? COL.flame : COL.lit) : (i % 5 ? [255, 236, 214] : COL.teal);
    const fade = clamp((90 - z) / 35) * clamp(z / 2.5);
    const w = Math.max(1, 30 / z);
    X.strokeStyle = rgba(col, .16 * fade); X.lineWidth = w * 4; X.beginPath(); X.moveTo(p1[0], p1[1]); X.lineTo(p2[0], p2[1]); X.stroke();
    X.strokeStyle = rgba(col, .9 * fade); X.lineWidth = w; X.beginPath(); X.moveTo(p1[0], p1[1]); X.lineTo(p2[0], p2[1]); X.stroke();
  }
  X.restore();
}
const speedCurve = (t1, v0 = 28, tau = .55) => ({
  v: t => t < t1 ? v0 : v0 * Math.exp(-(t - t1) / tau),
  pos: t => t < t1 ? v0 * t : v0 * t1 + v0 * tau * (1 - Math.exp(-(t - t1) / tau)),
});

/* ---------- map helpers ---------- */
const ROUTE = () => GEO.route[0].concat(GEO.route[1]);
function hullPath(h) { X.beginPath(); h.forEach((p, i) => i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1])); X.closePath(); }

/* ======================= scenes ======================= */
const SCENES = {};
const BGS = { _: () => ({ w: [.4, 0, 0, 0], c1: COL.flame, c2: COL.lit }) };

// ---- the hook: the market at speed, then it stops to be counted
function hook(lt, D, L, teaser) {
  const t1 = ln(L, 1) - .35;
  push(lt, D, .05);
  hyper(lt, speedCurve(t1), 1 - .65 * sm(t1, t1 + 1.2, lt));
  if (teaser) lockup(M + 120, 92, 46, .9, .2);
  else eyebrow('FIELD CENSUS · RIYADH', { x: M, y: 112, tin: .3, tout: t1 });
  line("Riyadh's independent car market", { x: W / 2, y: 380, size: 108, wt: 600, ls: -3, align: 'center', tin: ln(L, 0), tout: t1, stag: .018 });
  line([P('trades '), P('billions', { fam: 'i', col: COL.lit, size: 124, shine: 1 }), P(' of riyals a year.')], { x: W / 2, y: 515, size: 108, wt: 600, ls: -3, align: 'center', tin: ln(L, 0) + .55, tout: t1, stag: .016 });
  line([P('No one had ever '), P('counted', { fam: 'i', col: COL.lit, size: 150 }), P(' it.')], { x: W / 2, y: 470, size: 132, wt: 600, ls: -4, align: 'center', tin: ln(L, 1), mode: 'blur', by: 'word', stag: .09, tout: D - .25 });
}
SCENES.T1 = (lt, D, L) => hook(lt, D, L, true);
SCENES.B1 = (lt, D, L) => hook(lt, D, L, false);
BGS.T1 = BGS.B1 = () => ({ w: [.28, 0, 0, 0], c1: COL.flame, c2: COL.lit, amp: .9 });

// ---- the walk: door to door, both districts at true scale
function walk(lt, D, L, o = {}) {
  const t0 = ln(L, 0) + .2, t1 = D - .5, pr = eio(clamp((lt - t0) / (t1 - t0)) * .98 + .01) * clamp((lt - t0) / .2);
  const R = ROUTE(), n = R.length, head = pr * (n - 1);
  push(lt, D, .05, 960, 600);
  // district outlines draw on
  GEO.hull.forEach((h, k) => {
    const p = sm(.1 + k * .3, 1.1 + k * .3, lt); if (p <= 0) return;
    X.save(); X.globalAlpha = p; hullPath(h); X.setLineDash([2400 * p, 3000]); X.lineWidth = 1.6; X.strokeStyle = rgba(k ? COL.shf : COL.qad, .7); X.stroke(); X.restore();
  });
  // faint pins
  X.fillStyle = rgba(COL.fog, .16); GEO.pins.forEach(p => X.fillRect(p[0] - 2, p[1] - 2, 4, 4));
  // the route walked so far
  X.save(); X.lineJoin = 'round'; X.lineCap = 'round';
  const tail = 46;
  for (let j = 1; j <= Math.floor(head); j++) {
    const a = GEO.pins[R[j - 1]], b = GEO.pins[R[j]]; if (a[2] !== b[2]) continue;
    const age = head - j, al = age < tail ? 1 - age / tail * .75 : .25;
    X.strokeStyle = rgba(a[2] ? COL.shf : COL.lit, .55 * al); X.lineWidth = age < tail ? 2.6 : 1.2;
    X.beginPath(); X.moveTo(a[0], a[1]); X.lineTo(b[0], b[1]); X.stroke();
  }
  X.restore();
  // lit pins (pop as the walk reaches them)
  for (let j = 0; j <= Math.min(n - 1, Math.floor(head)); j++) {
    const p = GEO.pins[R[j]], age = (head - j) / 40, s = 4 + 7 * Math.exp(-age * 2.5);
    X.fillStyle = rgba(p[2] ? COL.shf : COL.qad); X.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
  }
  // head
  const hj = Math.min(n - 1, Math.floor(head)), hp = GEO.pins[R[hj]], hq = GEO.pins[R[Math.min(n - 1, hj + 1)]], hf = head - hj;
  const hx = lerp(hp[0], hq[0], hp[2] === hq[2] ? hf : 0), hy = lerp(hp[1], hq[1], hp[2] === hq[2] ? hf : 0);
  if (pr > 0 && pr < .995) { const rg = X.createRadialGradient(hx, hy, 0, hx, hy, 60); rg.addColorStop(0, rgba(COL.ink, .9)); rg.addColorStop(.12, rgba(COL.lit, .6)); rg.addColorStop(1, rgba(COL.lit, 0)); X.fillStyle = rg; X.fillRect(hx - 60, hy - 60, 120, 120); }
  // ImageTrail: showroom photos surface where the walk passes, then sink
  const pics = ['q-luxhall', 'n-redcarpet', 's-hall', 'n-porsche-row', 'q-barimi-rolls', 'n-rc-hall', 's-glass', 'q-porsche', 'n-hexhall', 's-jeeps'];
  for (let k = 0; k < pics.length; k++) {
    const at = (k + .5) / pics.length, tk = t0 + (t1 - t0) * at, age = lt - tk;
    if (age < 0 || age > 1.6) continue;
    const pin = GEO.pins[R[Math.floor(at * (n - 1))]], s = S(age, 220) * (1 - sm(1.0, 1.6, age));
    const w = 230 * (.8 + .2 * s), h = 150 * (.8 + .2 * s), ox = (k % 2 ? 40 : -270), oy = -190 - 20 * age;
    X.save(); X.globalAlpha = s; X.translate(pin[0] + ox + w / 2, pin[1] + oy + h / 2); X.rotate((k % 2 ? 1 : -1) * .04);
    photo(IMG[pics[k]], -w / 2, -h / 2, w, h, { r: 14, zoom: 1.08 }); X.lineWidth = 2; X.strokeStyle = rgba(COL.ink, .25); rr(-w / 2, -h / 2, w, h, 14); X.stroke(); X.restore();
  }
  // labels + counter
  X.restore(); X.save();
  line('AL QADISIYAH', { x: 640, y: 960, size: 22, wt: 600, ls: 6, col: COL.qad, align: 'center', tin: .4, stag: .01 });
  line('AL SHIFA', { x: 1390, y: 960, size: 22, wt: 600, ls: 6, col: COL.shf, align: 'center', tin: .7, stag: .01 });
  eyebrow(o.eyebrow || 'DOOR TO DOOR', { x: M, y: 112, tin: .2 });
  count(0, 520, { x: M, y: 250, size: 120, wt: 600, t0, dur: t1 - t0, post: 'showrooms', tin: .3, fmt: v => String(Math.round(v)).padStart(3, '0') });
  if (o.sub) line(o.sub, { x: M, y: 312, size: 30, wt: 400, col: COL.fog, tin: t0 + .4 });
}
SCENES.T2 = (lt, D, L) => walk(lt, D, L, {});
SCENES.B2 = (lt, D, L) => walk(lt, D, L, { sub: 'By day and after dark.' });
BGS.T2 = BGS.B2 = () => ({ w: [.12, 0, 0, .9], c1: COL.flame, c2: COL.lit, amp: 1 });

// ---- the census in numbers (MagicBento)
function bento(lt, D, L, teaser) {
  push(lt, D, .03);
  const cells = teaser
    ? [{ x: M, y: 250, w: 780, h: 560, v: 31944, lab: 'cars, counted on the floor', t: ln(L, 0) + .1, big: 1 },
       { x: 980, y: 250, w: 780, h: 560, v: 3.6, pre: 'SAR', post: 'billion', lab: 'of stock on display', t: ln(L, 0) + L[0].dur * .55, fmt: v => v.toFixed(1), big: 1 }]
    : [{ x: M, y: 200, w: 780, h: 330, v: 520, lab: 'showrooms, door to door', t: ln(L, 0) + .05 },
       { x: 980, y: 200, w: 780, h: 330, v: 516, lab: 'pinned at their GPS coordinates', t: ln(L, 0) + L[0].dur * .5 },
       { x: M, y: 570, w: 780, h: 330, v: 31944, lab: 'cars, counted on the floor', t: ln(L, 1) + .05 },
       { x: 980, y: 570, w: 780, h: 330, v: 3.6, pre: 'SAR', post: 'billion', lab: 'of stock on display', t: ln(L, 1) + L[1].dur * .6, fmt: v => v.toFixed(1) }];
  eyebrow(teaser ? 'ON THE FLOOR' : 'THE CENSUS', { x: M, y: teaser ? 180 : 140, tin: .1 });
  cells.forEach((c, k) => {
    const p = S(lt - (c.t - .35), 150); if (p < .004) return;
    const active = sm(c.t - .2, c.t, lt) * (1 - sm(c.t + 1.6, c.t + 2.4, lt));
    X.save(); X.globalAlpha = p; X.translate(c.x + c.w / 2, c.y + c.h / 2 + (1 - p) * 40); X.scale(.96 + .04 * p, .96 + .04 * p); X.translate(-c.x - c.w / 2, -c.y - c.h / 2);
    card(c.x, c.y, c.w, c.h, { r: 30, star: active > .02 ? (lt * .35 + k * .25) % 1 : null, starCol: k % 2 ? COL.teal : COL.lit, glow: .5 + active });
    X.restore();
    const sz = c.big ? 220 : 150, by = c.big ? c.y + c.h * .62 : c.y + c.h * .6;
    count(0, c.v, { x: c.x + 56, y: by, size: sz, t0: c.t, dur: 1.3, fmt: c.fmt, pre: c.pre, post: c.post, tin: c.t - .3 });
    line(c.lab, { x: c.x + 60, y: by + (c.big ? 90 : 72), size: c.big ? 36 : 30, wt: 400, col: COL.fog, tin: c.t + .25, stag: .008 });
  });
}
SCENES.T3 = (lt, D, L) => bento(lt, D, L, true);
SCENES.B3 = (lt, D, L) => bento(lt, D, L, false);
BGS.T3 = BGS.B3 = () => ({ w: [.55, 0, 0, .15], c1: COL.flame, c2: COL.lit, amp: .85 });

// ---- the question on the floor
function question(lt, D, L, mode) {
  const qT = mode === 'A' ? ln(L, 2) + L[2].dur * .42 : ln(L, 0) + L[0].dur * .5;
  if (mode === 'A') {
    // CircularGallery: showroom floors drift past on a shallow curve
    const pics = ['n-rc-night', 'q-luxhall', 'n-redcarpet', 's-sunset-row', 'q-riyadhcars-night', 'n-gclass-front', 'q-safh-dark'];
    const dim = sm(qT - .6, qT + .2, lt), off = lt * 150;
    pics.forEach((k, i) => {
      let x = ((i * 560 - off) % (pics.length * 560) + pics.length * 560) % (pics.length * 560) - 560;
      const c = (x + 230 - W / 2) / (W / 2), y = 300 + c * c * 80, rot = c * .09, s = 1 - Math.abs(c) * .12;
      X.save(); X.globalAlpha = (1 - .78 * dim) * clamp(1.4 - Math.abs(c)); X.translate(x + 230, y + 170); X.rotate(rot); X.scale(s, s);
      photo(IMG[k], -230, -170, 460, 340, { r: 26, zoom: 1.12, px: .5 + c * .1 });
      X.restore();
    });
    line('Every day, buyers walk onto your floor.', { x: W / 2, y: 690, size: 72, wt: 600, ls: -2, align: 'center', tin: ln(L, 0), tout: ln(L, 1) - .1 });
    // two facts, ticked
    [['Seen the car', ln(L, 1) + .1], ['Agreed the price', ln(L, 1) + L[1].dur * .5]].forEach(([s, t], k) => {
      const p = S(lt - t, 200) * (1 - S(lt - (qT - .4), 200)); if (p < .004) return;
      const x = W / 2 - 420 + k * 440, y = 650;
      X.save(); X.globalAlpha = p; X.translate(0, (1 - p) * 30); card(x, y, 400, 110, { r: 55, fill: .08, edge: .2, glow: .6, starCol: COL.teal });
      check(x + 62, y + 55, 52, COL.teal, sm(t + .1, t + .5, lt)); font(38, 500); X.fillStyle = rgba(COL.ink); X.fillText(s, x + 110, y + 68); X.restore();
    });
  } else {
    // TiltedCard: one night floor, glare sweeping across
    push(lt, D, .05);
    const p = S(lt + .2, 120), ang = lerp(-.05, .02, clamp(lt / D));
    X.save(); X.globalAlpha = p; X.translate(W / 2, 470); X.rotate(ang); X.transform(1, -.04, .06, 1, 0, 0);
    photo(IMG['n-rc-night'], -560, -300, 1120, 600, { r: 34, zoom: 1.05 + .08 * clamp(lt / D), dim: .25 });
    const gx = lerp(-900, 900, clamp(lt / D)); const gr = X.createLinearGradient(gx - 200, 0, gx + 200, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    rr(-560, -300, 1120, 600, 34); X.fillStyle = gr; X.fill(); X.restore();
    line('On every floor, the same question.', { x: W / 2, y: 880, size: 56, wt: 500, col: COL.fog, align: 'center', tin: ln(L, 0) + .2, tout: qT - .3 });
  }
  eyebrow('THE QUESTION', { x: W / 2 - 90, y: mode === 'A' ? 840 : 840, tin: qT - .2 });
  typed('How will I pay?', { x: W / 2, y: mode === 'A' ? 960 : 960, size: 120, align: 'center', t0: qT, cps: 16 });
}
SCENES.T4 = (lt, D, L) => question(lt, D, L, 'T');
SCENES.A1 = (lt, D, L) => question(lt, D, L, 'A');
BGS.T4 = BGS.A1 = () => ({ w: [.35, 0, 0, 0], c1: COL.flame, c2: COL.lit, amp: .75 });

// ---- A2: the sale walks out of the door (owners' own count: ~4 more leave for every 10 sold)
SCENES.A2 = (lt, D, L) => {
  push(lt, D, .03);
  line([P('When the finance is not there, the sale '), P('walks out', { fam: 'i', col: COL.lit, size: 84 }), P(' of the door.')], { x: W / 2, y: 260, size: 68, wt: 600, ls: -2, align: 'center', tin: ln(L, 0), stag: .012 });
  const t1 = ln(L, 1);
  eyebrow('WHAT OWNERS TOLD US', { x: M, y: 430, tin: t1 });
  // ten sold
  for (let i = 0; i < 10; i++) { const p = S(lt - (t1 + .25 + i * .06), 260); if (p < .004) continue; carIcon(M + 90 + i * 158, 560 + (1 - p) * 30, 136, COL.qad, p); }
  count(0, 10, { x: M, y: 690, size: 96, t0: t1 + .25, dur: .6, post: 'cars sold', tin: t1 + .2 });
  // four more leave
  const tl = t1 + L[1].dur * .55;
  for (let i = 0; i < 4; i++) {
    const p = S(lt - (tl + i * .1), 260); if (p < .004) continue;
    const go = ei(clamp((lt - (tl + 1.6 + i * .15)) / 1.1)), x = M + 90 + i * 158 + go * 1300;
    carIcon(x, 830 + (1 - p) * 30, 136, COL.ink, p * (1 - go), true);
  }
  count(0, 4, { x: M, y: 960, size: 96, t0: tl, dur: .5, post: 'more ready buyers leave without one', tin: tl - .05, col: COL.lit });
  // the door they leave by
  const dp = sm(tl, tl + .5, lt); X.save(); X.globalAlpha = dp; X.strokeStyle = rgba(COL.lit, .7); X.lineWidth = 3; rr(1640, 740, 170, 250, 8); X.stroke(); X.restore();
};
BGS.A2 = () => ({ w: [.55, 0, 0, 0], c1: COL.flame, c2: COL.lit, amp: .8 });
function ei(x) { return x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, 10 * (x - 1)); }

// ---- the answer: AutoLink brings the finance to the floor
function answer(lt, D, L, full) {
  push(lt, D, .03);
  const t0 = ln(L, 0);
  lockup(W / 2, full ? 170 : 380, full ? 70 : 120, 1, t0 - .1);
  line([P('Financing, '), P('on your floor.', { fam: 'i', col: COL.teal, size: full ? 108 : 136 })], { x: W / 2, y: full ? 330 : 620, size: full ? 92 : 116, wt: 600, ls: -3, align: 'center', tin: t0 + .35, stag: .02 });
  if (!full) return;
  // the dealer portal, step by step
  const steps = ['Log in', 'Dashboard', 'Submit request', 'Track it'], t1 = ln(L, 1), span = L[1].dur * .9;
  const sx = 300, ex = 1620, y = 520, pr = eio(clamp((lt - t1) / span));
  X.save(); X.strokeStyle = rgba(COL.ink, .14); X.lineWidth = 3; X.beginPath(); X.moveTo(sx, y); X.lineTo(ex, y); X.stroke();
  X.strokeStyle = rgba(COL.teal, .9); X.beginPath(); X.moveTo(sx, y); X.lineTo(lerp(sx, ex, pr), y); X.stroke(); X.restore();
  steps.forEach((s, k) => {
    const x = lerp(sx, ex, k / 3), on = pr * 3 >= k - .02, tk = t1 + span * k / 3, p = S(lt - (t1 - .3 + k * .08), 200);
    if (p < .004) return;
    X.save(); X.globalAlpha = p;
    card(x - 140, y - 46, 280, 92, { r: 46, fill: on ? .1 : .04, edge: on ? .3 : .12, star: on ? (lt * .5 + k * .2) % 1 : null, starCol: COL.teal, glow: on ? 1 : 0 });
    font(30, 600); X.fillStyle = rgba(on ? COL.ink : COL.fog); X.textAlign = 'center'; X.fillText(s, x, y + 11); X.textAlign = 'left';
    X.fillStyle = rgba(on ? COL.teal : COL.fog, on ? 1 : .5); font(18, 600); X.fillText(String(k + 1).padStart(2, '0'), x - 120, y - 58);
    X.restore();
  });
  const dx = lerp(sx, ex, pr); if (pr > 0 && pr < 1) { const rg = X.createRadialGradient(dx, y, 0, dx, y, 40); rg.addColorStop(0, rgba(COL.ink)); rg.addColorStop(.25, rgba(COL.teal, .8)); rg.addColorStop(1, rgba(COL.teal, 0)); X.fillStyle = rg; X.fillRect(dx - 40, y - 40, 80, 80); }
  // the request, as it moves through the portal
  const rp = S(lt - (t1 + span * .55), 150); if (rp < .004) return;
  X.save(); X.globalAlpha = rp; X.translate(0, (1 - rp) * 50);
  card(560, 650, 800, 300, { r: 28, fill: .07, edge: .18, glow: .8, starCol: COL.teal });
  font(20, 600); X.letterSpacing = '4px'; X.fillStyle = rgba(COL.fog); X.fillText('FINANCING REQUEST', 610, 712); X.letterSpacing = '0px';
  [['Buyer', 0.55], ['Vehicle', 0.7], ['Price', 0.4]].forEach(([k, w], i) => { font(26, 400); X.fillStyle = rgba(COL.fog); X.fillText(k, 610, 772 + i * 48); X.fillStyle = rgba(COL.ink, .18); rr(780, 752 + i * 48, 360 * w, 22, 11); X.fill(); });
  const st = ['Submitted', 'In review', 'Decision'], sp = clamp((lt - (t1 + span * .7)) / (D - (t1 + span * .7) - .4)) * 3;
  st.forEach((s, i) => { const on = sp >= i + .1; const x = 1180, yy = 760 + i * 52; X.fillStyle = rgba(on ? COL.teal : COL.fog, on ? 1 : .35); X.beginPath(); X.arc(x, yy, 9, 0, 7); X.fill(); font(26, 500); X.fillText(s, x + 24, yy + 9); });
  X.restore();
}
SCENES.T5 = (lt, D, L) => answer(lt, D, L, false);
SCENES.A3 = (lt, D, L) => answer(lt, D, L, true);
BGS.T5 = BGS.A3 = () => ({ w: [0, 1, 0, 0], c1: COL.teal, c2: COL.shf, amp: .9 });

// ---- A4: one dashboard, three languages
SCENES.A4 = (lt, D, L) => {
  push(lt, D, .025);
  const p = S(lt + .1, 120), x = 330, y = 220, w = 1260, h = 700;
  line([P('One dashboard. '), P('Every request.', { fam: 'i', col: COL.teal, size: 76 })], { x: W / 2, y: 150, size: 64, wt: 600, ls: -2, align: 'center', tin: ln(L, 0) });
  X.save(); X.globalAlpha = p; X.translate(0, (1 - p) * 60);
  card(x, y, w, h, { r: 30, fill: .06, edge: .18, glow: .6, starCol: COL.teal });
  // sidebar
  X.fillStyle = rgba(COL.ink, .04); rr(x, y, 280, h, 30); X.fill();
  const items = ['Requests', 'Reports', 'Account'], t0 = ln(L, 0) + .1, per = L[0].dur * .85 / 3;
  const act = clamp(Math.floor((lt - t0) / per), 0, 2);
  items.forEach((s, i) => { const on = i === act && lt >= t0; if (on) { X.fillStyle = rgba(COL.teal, .14); rr(x + 20, y + 110 + i * 70, 240, 54, 14); X.fill(); } font(28, on ? 600 : 400); X.fillStyle = rgba(on ? COL.ink : COL.fog); X.fillText(s, x + 48, y + 146 + i * 70); });
  lockupMini(x + 40, y + 46);
  // main panel: what the active section shows
  const mx = x + 320, my = y + 110;
  if (act === 0) for (let r = 0; r < 6; r++) { const rp = S(lt - (t0 + r * .06), 260); X.globalAlpha = p * rp; X.fillStyle = rgba(COL.ink, .05); rr(mx, my + r * 86, 900, 70, 14); X.fill(); X.fillStyle = rgba(COL.ink, .22); rr(mx + 24, my + r * 86 + 26, 220 + rnd(r) * 160, 18, 9); X.fill(); const sc = [COL.teal, COL.lit, COL.fog][r % 3]; X.fillStyle = rgba(sc, .9); rr(mx + 740, my + r * 86 + 20, 130, 30, 15); X.fill(); }
  if (act === 1) { const bp = sm(t0 + per, t0 + per + .6, lt); for (let b = 0; b < 12; b++) { const bh = (120 + rnd(b + 4) * 300) * bp; X.fillStyle = rgba(b % 3 ? COL.teal : COL.shf, .85); rr(mx + 30 + b * 72, my + 480 - bh, 44, bh, 8); X.fill(); } }
  if (act === 2) { X.fillStyle = rgba(COL.ink, .06); X.beginPath(); X.arc(mx + 90, my + 90, 60, 0, 7); X.fill(); for (let r = 0; r < 4; r++) { X.fillStyle = rgba(COL.ink, .14); rr(mx + 190, my + 50 + r * 60, 300 + rnd(r + 9) * 200, 20, 10); X.fill(); } }
  X.globalAlpha = p;
  // RotatingText: the language switch
  const langs = ['English', 'العربية', '中文'], t1 = ln(L, 1), lp = clamp((lt - t1) / (L[1].dur * .9)) * 2.999;
  const li = lt < t1 ? 0 : Math.floor(lp), lf = lt < t1 || li === 2 ? 0 : sm(.55, 1, lp - li);
  card(x + w - 300, y + 26, 260, 60, { r: 30, fill: .08, edge: .25, star: lt > t1 ? (lt * .6) % 1 : null, starCol: COL.teal });
  X.save(); rr(x + w - 300, y + 26, 260, 60, 30); X.clip();
  font(28, 600); X.textAlign = 'center';
  X.fillStyle = rgba(COL.ink); X.fillText(langs[li], x + w - 170, y + 66 - lf * 60);
  if (li < 2) X.fillText(langs[li + 1], x + w - 170, y + 126 - lf * 60);
  X.restore();
  X.restore();
};
function lockupMini(x, y) { const im = IMG.lockup; if (!im) return; const h = 34; X.drawImage(im, x, y - h / 2, h * im.width / im.height, h); }
BGS.A4 = () => ({ w: [0, .35, 0, .25], c1: COL.teal, c2: COL.shf, amp: .8 });

// ---- A5: training the sales team (CardSwap of the four rules)
SCENES.A5 = (lt, D, L) => {
  push(lt, D, .03);
  eyebrow('ON-FLOOR TRAINING', { x: M, y: 330, tin: .1 });
  line([P('We train your '), P('sales team.', { fam: 'i', col: COL.lit, size: 104 })], { x: M, y: 450, size: 88, wt: 600, ls: -3, tin: ln(L, 0) });
  line('On the portal, and on the conversation with the buyer.', { x: M, y: 530, size: 34, wt: 400, col: COL.fog, tin: ln(L, 0) + L[0].dur * .4, stag: .006 });
  const rules = ['Let them finish.', 'Reflect before you respond.', 'Ask one clarifying question.', 'Then answer, briefly.'];
  const t0 = ln(L, 0) + .4, per = (D - t0 - .3) / 4;
  rules.forEach((s, k) => {
    const st = (lt - (t0 + k * per)) / per;      // stage: 0 arrives in front, 1+ steps back
    if (st < -.6) return;
    const front = S(st + .6, 4.5), back = clamp(st - .4) * 0 + Math.max(0, st - .4);
    const depth = Math.min(3, back * 1.0), x = 1090 + depth * 46, y = 380 - depth * 40 + (1 - front) * 260;
    const a = (front) * (1 - clamp((depth - 2.2) / .8));
    if (a < .004) return;
    X.save(); X.globalAlpha = a; X.translate(x + 330, y + 140); X.scale(1 - depth * .06, 1 - depth * .06); X.rotate(-.025 * depth);
    X.fillStyle = rgba(mixc(COL.panel, COL.ground, clamp(depth * .4))); rr(-330, -140, 660, 280, 30); X.fill();
    card(-330, -140, 660, 280, { r: 30, fill: .07, edge: .2, glow: depth < .5 ? 1 : 0, starCol: COL.lit });
    X.globalAlpha = a * (1 - clamp(depth * .7));
    font(22, 600); X.letterSpacing = '4px'; X.fillStyle = rgba(COL.lit); X.fillText(String(k + 1).padStart(2, '0'), -280, -70); X.letterSpacing = '0px';
    font(48, 600); X.fillStyle = rgba(COL.ink); wrapText(s, -280, 10, 560, 58);
    X.restore();
  });
};
function wrapText(s, x, y, maxW, lh) { const words = s.split(' '); let lineS = '', yy = y; for (const w of words) { const t = lineS ? lineS + ' ' + w : w; if (X.measureText(t).width > maxW && lineS) { X.fillText(lineS, x, yy); lineS = w; yy += lh; } else lineS = t; } X.fillText(lineS, x, yy); }
BGS.A5 = () => ({ w: [.45, 0, .2, 0], c1: COL.flame, c2: COL.lit, ro: [.8, 1.05], amp: .8 });

// ---- A6: the roadmap
SCENES.A6 = (lt, D, L) => {
  push(lt, D, .03);
  eyebrow('ROADMAP', { x: M, y: 200, tin: .1 });
  line('What comes next.', { x: M, y: 300, size: 84, wt: 600, ls: -3, tin: .15 });
  const nodes = [
    { k: 'NOW', a: 'Financing on your floor', b: 'through the dealer portal', t: .3, col: COL.teal, done: 1 },
    { k: 'NEXT', a: 'Every buyer matched', b: 'to the right lender, faster approvals', t: ln(L, 0) + L[0].dur * .35, col: COL.lit },
    { k: 'THEN', a: 'Your stock online', b: 'and new buyers sent to your door', t: ln(L, 1) + .1, col: COL.lit },
  ];
  const y = 600, x0 = M + 40, x1 = 1760, pr = sm(.2, ln(L, 1) + L[1].dur * .5, lt);
  X.strokeStyle = rgba(COL.ink, .14); X.lineWidth = 3; X.beginPath(); X.moveTo(x0, y); X.lineTo(x1, y); X.stroke();
  const gr = X.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, rgba(COL.teal)); gr.addColorStop(.4, rgba(COL.lit)); gr.addColorStop(1, rgba(COL.lit));
  X.strokeStyle = gr; X.beginPath(); X.moveTo(x0, y); X.lineTo(lerp(x0, x1, pr), y); X.stroke();
  nodes.forEach((n, i) => {
    const x = x0 + i * 560, p = S(lt - n.t, 200); if (p < .004) return;
    X.save(); X.globalAlpha = p; X.fillStyle = rgba(COL.ground); X.strokeStyle = rgba(n.col); X.lineWidth = 4; X.beginPath(); X.arc(x, y, 18 * p, 0, 7); X.fill(); X.stroke();
    if (n.done) check(x, y, 26, COL.teal, sm(n.t + .2, n.t + .6, lt)); X.restore();
    line(n.k, { x, y: y - 54, size: 24, wt: 600, ls: 6, col: n.col, tin: n.t + .05, stag: .02 });
    line(n.a, { x, y: y + 100, size: 46, wt: 600, ls: -1, tin: n.t + .12, stag: .012 });
    line(n.b, { x, y: y + 150, size: 28, wt: 400, col: COL.fog, tin: n.t + .25, stag: .006 });
  });
};
BGS.A6 = () => ({ w: [.2, .45, 0, .25], c1: COL.teal, c2: COL.lit, amp: .75 });

// ---- signed: 20 showrooms (names withheld, NDA)
function signed(lt, D, L, mode) {
  push(lt, D, .03);
  const t0 = ln(L, 0) + .1;
  eyebrow(mode === 'B' ? 'TRACTION' : 'SIGNED WITH AUTOLINK', { x: M, y: 220, tin: .1 });
  count(0, 20, { x: M, y: 520, size: 300, t0, dur: 1.2, tin: t0 - .2, col: COL.ink });
  line(mode === 'T' ? 'showrooms signed in the first month' : 'showrooms signed', { x: M + 8, y: 600, size: 40, wt: 500, col: COL.fog, tin: t0 + .3, stag: .01 });
  line('Names withheld · under NDA', { x: M + 8, y: 660, size: 24, wt: 500, ls: 2, col: COL.fog, a: .6, tin: t0 + .6, stag: .006 });
  // the twenty tiles flip to signed, one by one
  const gx = 960, gy = 200, cw = 150, chh = 120, gap = 18;
  const nT = mode === 'A' ? 21 : 20;
  for (let i = 0; i < nT; i++) {
    const r = Math.floor(i / 5), c = i % 5, x = gx + c * (cw + gap), y = gy + r * (chh + gap);
    if (i === 20) { // A: the 21st is yours
      const p = S(lt - (ln(L, 0) + L[0].dur * .6), 200); if (p < .004) continue;
      const pul = .5 + .5 * Math.sin(lt * 5);
      X.save(); X.globalAlpha = p; X.setLineDash([10, 8]); X.strokeStyle = rgba(COL.teal, .6 + .4 * pul); X.lineWidth = 2.5; rr(gx + 0 * (cw + gap), gy + 4 * (chh + gap), cw * 2 + gap, chh, 18); X.stroke(); X.setLineDash([]);
      font(30, 600); X.fillStyle = rgba(COL.teal); X.fillText('Yours?', gx + 30, gy + 4 * (chh + gap) + 72); X.restore(); continue;
    }
    const ti = t0 + .15 + i * .07, f = clamp((lt - ti) / .45), flip = Math.abs(Math.cos(Math.PI * f)), sideB = f > .5;
    const p = S(lt - (t0 - .4 + i * .02), 200); if (p < .004) continue;
    X.save(); X.globalAlpha = p; X.translate(x + cw / 2, y + chh / 2); X.scale(f > 0 && f < 1 ? flip : 1, 1);
    card(-cw / 2, -chh / 2, cw, chh, { r: 18, fill: sideB ? .1 : .04, edge: sideB ? .3 : .1, glow: sideB ? .8 : 0, starCol: COL.teal });
    if (sideB) check(0, 0, 54, COL.teal, sm(ti + .25, ti + .55, lt)); else { X.fillStyle = rgba(COL.ink, .1); rr(-40, -8, 80, 16, 8); X.fill(); }
    X.restore();
  }
  if (mode === 'B') {
    const st = [['16', 'more with agreements in hand', ln(L, 1) + L[1].dur * .45], ['64', 'in the pipeline', ln(L, 1) + L[1].dur * .78], ['9', 'banks and finance companies at the table', ln(L, 2) + .2]];
    st.forEach(([v, s, t], k) => { count(0, +v, { x: M, y: 790 + k * 90, size: 70, t0: t, dur: .6, tin: t - .1, col: k === 2 ? COL.teal : COL.lit, post: s, postSize: 32 }); });
  }
}
SCENES.T6 = (lt, D, L) => signed(lt, D, L, 'T');
SCENES.B7 = (lt, D, L) => signed(lt, D, L, 'B');
BGS.T6 = BGS.B7 = () => ({ w: [0, .35, .7, 0], c1: COL.teal, c2: COL.shf, ro: [.75, 1.05], amp: .85 });
// A7: signed, then the close
SCENES.A7 = (lt, D, L) => {
  const tc = ln(L, 1) - .3;
  if (lt < tc + .6) { X.save(); const q = sm(tc, tc + .6, lt); X.globalAlpha = 1 - q; X.translate(W / 2, H / 2); X.scale(1 + .08 * q, 1 + .08 * q); X.translate(-W / 2, -H / 2); signed(lt, D, L, 'A'); X.restore(); }
  if (lt > tc) {
    lockup(W / 2, 430, 120, 1, tc + .2);
    line([P('Every buyer on your floor, '), P('a buyer you can finance.', { fam: 'i', col: COL.teal, size: 84 })], { x: W / 2, y: 660, size: 70, wt: 600, ls: -2, align: 'center', tin: ln(L, 1) + L[1].dur * .2, stag: .014 });
  }
};
BGS.A7 = lt => ({ w: [0, .5, .6, 0], c1: COL.teal, c2: COL.shf, ro: [.5, 1.05], amp: .85 });

// ---- B4: the owners' books
SCENES.B4 = (lt, D, L) => {
  push(lt, D, .03);
  const t0 = ln(L, 0), t1 = ln(L, 1);
  eyebrow("THE OWNERS' BOOKS", { x: M, y: 200, tin: .1 });
  count(0, 25, { x: M, y: 400, size: 220, t0, dur: .9, tin: t0 - .2, post: 'owners opened their books', postSize: 40 });
  // 25 ledgers fan out
  for (let i = 0; i < 25; i++) {
    const p = S(lt - (t0 + .1 + i * .03), 150); if (p < .004) continue;
    const ang = lerp(-.95, .95, i / 24) * p, x = 1480, y = 470;
    X.save(); X.globalAlpha = p * (1 - .7 * sm(t1, t1 + .6, lt)); X.translate(x, y + 420); X.rotate(ang); X.translate(0, -420);
    X.fillStyle = rgba(COL.panel); rr(-80, -110, 160, 220, 14); X.fill(); card(-80, -110, 160, 220, { r: 14, fill: .06, edge: .22 });
    X.fillStyle = rgba(i % 5 ? COL.lit : COL.teal, .8); X.fillRect(-56, -86, 40, 6);
    for (let r = 0; r < 5; r++) { X.fillStyle = rgba(COL.ink, .14); X.fillRect(-56, -56 + r * 30, 112 - (r % 2) * 36, 8); }
    X.restore();
  }
  const v = 15.7, tv = t1 + L[1].dur * .3;
  count(0, v, { x: M, y: 760, size: 200, t0: tv, dur: 1.4, tin: tv - .3, pre: 'SAR', post: 'billion a year', fmt: v => v.toFixed(1), col: COL.lit, postSize: 44 });
  line('Al Qadisiyah alone · estimated from the owners’ own numbers · conservative', { x: M + 4, y: 840, size: 28, wt: 400, col: COL.fog, tin: tv + .4, stag: .004 });
};
BGS.B4 = () => ({ w: [.55, 0, .15, 0], c1: COL.flame, c2: COL.lit, ro: [.85, 1.05], amp: .85 });

// ---- B5: where the money leaks
SCENES.B5 = (lt, D, L) => {
  push(lt, D, .025);
  const t1 = ln(L, 1), t2 = ln(L, 2);
  line([P('Where the money '), P('leaks.', { fam: 'i', col: COL.flame, size: 120 })], { x: M, y: 200, size: 100, wt: 600, ls: -3, tin: ln(L, 0), tout: t2 - .3 });
  // 11 of 13 floors without a bank
  const a = S(lt - t1, 150) * (1 - S(lt - (t2 - .3), 170));
  if (a > .004) {
    X.save(); X.globalAlpha = a;
    card(M, 300, 760, 420, { r: 28, fill: .05, edge: .14 });
    for (let i = 0; i < 13; i++) { const on = i < 11, p = sm(t1 + .2 + i * .05, t1 + .5 + i * .05, lt); X.fillStyle = rgba(on ? COL.flame : COL.fog, on ? .9 * p : .4 * p); rr(M + 50 + (i % 7) * 96, 350 + Math.floor(i / 7) * 96, 72, 72, 12); X.fill(); }
    X.restore();
    count(0, 11, { x: M + 50, y: 650, size: 110, t0: t1 + .2, dur: .7, tin: t1, post: 'of 13 floors · no bank on site', postSize: 30 });
    // 194 of 211 cash-only in Al Shifa: a ring
    const tr = t1 + L[1].dur * .45, rp = eio(clamp((lt - tr) / 1.2)), cx = 1270, cy = 510;
    X.save(); X.globalAlpha = a * S(lt - (tr - .3), 150);
    card(980, 300, 780, 420, { r: 28, fill: .05, edge: .14 });
    X.lineWidth = 26; X.lineCap = 'round'; X.strokeStyle = rgba(COL.ink, .1); X.beginPath(); X.arc(cx - 150, cy, 130, 0, 7); X.stroke();
    X.strokeStyle = rgba(COL.shf); X.beginPath(); X.arc(cx - 150, cy, 130, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (194 / 211) * rp); X.stroke();
    X.restore();
    count(0, 194, { x: 1330, y: 540, size: 110, t0: tr, dur: 1.2, tin: tr - .2, post: '/ 211', postSize: 40 });
    line('Al Shifa floors, cash only', { x: 1334, y: 600, size: 30, wt: 400, col: COL.fog, tin: tr + .3, stag: .006 });
  }
  // SAR 1.4B a year walks away
  const p2 = S(lt - (t2 - .1), 150);
  if (p2 > .004) {
    // money draining: thin flame lines falling (computed from time)
    X.save(); X.globalAlpha = p2;
    for (let i = 0; i < 70; i++) { const x = 200 + rnd(i) * 1520, sp = 220 + rnd(i + 1) * 260, y = ((lt - t2) * sp + rnd(i + 2) * 1100) % 1150 - 50, l = 40 + rnd(i + 3) * 120; const gr = X.createLinearGradient(0, y - l, 0, y); gr.addColorStop(0, rgba(COL.flame, 0)); gr.addColorStop(1, rgba(COL.lit, .55)); X.strokeStyle = gr; X.lineWidth = 2; X.beginPath(); X.moveTo(x, y - l); X.lineTo(x, y); X.stroke(); }
    X.restore();
    count(0, 1.4, { x: W / 2, y: 600, size: 260, t0: t2 + L[2].dur * .35, dur: 1.2, tin: t2, pre: 'SAR', post: 'billion a year', fmt: v => v.toFixed(1), align: 'center', col: COL.lit, postSize: 50 });
    line('walks away from just 24 floors, for want of a loan', { x: W / 2, y: 700, size: 40, wt: 400, col: COL.fog, align: 'center', tin: t2 + L[2].dur * .5, stag: .006 });
  }
};
BGS.B5 = () => ({ w: [.7, 0, 0, 0], c1: COL.flame, c2: COL.flame, amp: .85 });

// ---- B6: the map no one else holds (the map tilts back in perspective, every pin lit)
SCENES.B6 = (lt, D, L) => {
  const tilt = sm(0, D * .7, lt);
  X.save(); X.translate(W / 2, 700); X.transform(1, 0, -.18 * tilt, 1 - .45 * tilt, 0, 0); X.scale(1.05 + .1 * tilt, 1.05 + .1 * tilt); X.translate(-W / 2, -620);
  GEO.hull.forEach((h, k) => { hullPath(h); X.lineWidth = 2; X.strokeStyle = rgba(k ? COL.shf : COL.qad, .7); X.stroke(); });
  GEO.pins.forEach((p, i) => { const pul = .6 + .4 * Math.sin(lt * 3 + i); const s = 5 + 2 * pul; X.fillStyle = rgba(p[2] ? COL.shf : COL.qad, .9); X.fillRect(p[0] - s / 2, p[1] - s / 2, s, s); });
  X.restore();
  line([P('No one else '), P('holds this.', { fam: 'i', col: COL.lit, size: 130 })], { x: W / 2, y: 230, size: 110, wt: 600, ls: -3, align: 'center', tin: ln(L, 0) });
  line('The largest sub-dealer mapping of its kind, on one standard.', { x: W / 2, y: 320, size: 38, wt: 400, col: COL.fog, align: 'center', tin: ln(L, 0) + L[0].dur * .35, stag: .005 });
};
BGS.B6 = () => ({ w: [0, 0, .5, .8], c1: COL.lit, c2: COL.flame, ro: [.5, 1.05], amp: .9 });

// ---- the close: founder's line, then KAFD
function close(lt, D, L, withQuote) {
  const tk = withQuote ? ln(L, 1) - .2 : 0;
  if (withQuote && lt < tk + .7) {
    const q = sm(tk, tk + .7, lt); X.save(); X.globalAlpha = 1 - q; X.translate(W / 2, H / 2); X.scale(1 + .08 * q, 1 + .08 * q); X.translate(-W / 2, -H / 2);
    eyebrow('OUR FOUNDER', { x: W / 2 - 100, y: 330, tin: .1 });
    line('We are not here to map a market.', { x: W / 2, y: 500, size: 96, wt: 600, ls: -3, align: 'center', tin: ln(L, 0), by: 'word', mode: 'blur', stag: .07 });
    line([P('We are here to '), P('move it.', { fam: 'i', col: COL.lit, size: 120 })], { x: W / 2, y: 640, size: 96, wt: 600, ls: -3, align: 'center', tin: ln(L, 0) + L[0].dur * .5, by: 'word', mode: 'blur', stag: .07 });
    X.restore();
  }
  if (lt > tk) {
    const u = lt - tk, dr = clamp(u / Math.max(1, D - tk));
    [['hq-skyline', -1], ['kafd-skyline', 1]].forEach(([k, side], i) => {
      const p = S(u - .1 - i * .12, 90); if (p < .004) return;
      const cx = W / 2 + side * (760 + (1 - p) * 220), cy = 540 - 10 * dr;
      X.save(); X.globalAlpha = p; X.translate(cx, cy); X.transform(1, side * -.07, 0, 1, 0, 0); X.rotate(side * .03);
      photo(IMG[k], -190, -340, 380, 680, { r: 28, zoom: 1.06 + .06 * dr, py: .4, dim: .25 });
      X.lineWidth = 1.5; X.strokeStyle = rgba(COL.ink, .2); rr(-190, -340, 380, 680, 28); X.stroke();
      X.restore();
    });
    lockup(W / 2, 460, 140, 1, tk + .3);
    line([P('From the showroom floor, '), P('to KAFD.', { fam: 'i', col: COL.teal, size: 86 })], { x: W / 2, y: 660, size: 66, wt: 600, ls: -2, align: 'center', tin: tk + .6, stag: .016 });
  }
}
SCENES.T7 = (lt, D, L) => close(lt, D, L, false);
SCENES.B8 = (lt, D, L) => close(lt, D, L, true);
BGS.T7 = BGS.B8 = () => ({ w: [.2, 0, .8, 0], c1: COL.lit, c2: COL.flame, ro: [.5, 1.05], amp: .8 });
