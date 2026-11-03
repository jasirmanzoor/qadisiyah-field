'use strict';
// Two sections added to Part B, between the walk and the census:
//   B2d  "Evidence from the floor": a viewfinder reel of real field photographs, each one captured and logged
//   B2e  "Mapping the market": the field app walking Al Shifa on the real satellite map, and the master sheet filling in

/* ---------- B2d: the viewfinder reel ---------- */
// photo, focus point (fraction of the frame), district stamp
const EVID = [
  ['q-riyadhcars-night', .50, .66, 'AL QADISIYAH'],
  ['q-luxhall', .46, .62, 'AL QADISIYAH'],
  ['s-hall', .55, .60, 'AL SHIFA'],
  ['q-street-fullspeed', .42, .58, 'AL QADISIYAH'],
  ['n-porsche-row', .58, .64, 'RIYADH'],
  ['s-sunset-row', .50, .62, 'AL SHIFA'],
];
function bracketSet(cx, cy, w, h, len, col, a, lw) {
  X.save(); X.globalAlpha = a; X.strokeStyle = col; X.lineWidth = lw; X.lineCap = 'square';
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    const x = cx + sx * w / 2, y = cy + sy * h / 2;
    X.beginPath(); X.moveTo(x - sx * len, y); X.lineTo(x, y); X.lineTo(x, y - sy * len); X.stroke();
  });
  X.restore();
}
function evidChip(x, y, str, p) {
  if (p < .004) return;
  X.save(); X.globalAlpha = Math.min(1, p * 1.6); X.translate(x - (1 - p) * 40, y);
  X.font = `700 27px ${FAM.s}`; const w = X.measureText(str).width + 96;
  X.shadowColor = 'rgba(0,0,0,.35)'; X.shadowBlur = 24; X.fillStyle = 'rgba(6,14,36,.62)'; rr(0, -34, w, 68, 34); X.fill(); X.shadowColor = 'transparent';
  X.strokeStyle = 'rgba(255,255,255,.22)'; X.lineWidth = 1.5; X.stroke();
  X.fillStyle = rgba(C2.teal); X.beginPath(); X.arc(36, 0, 17, 0, 7); X.fill();
  check(36, 1, 26, C2.navy, clamp((p - .4) / .6));
  X.fillStyle = '#fff'; X.textBaseline = 'middle'; X.fillText(str, 68, 2);
  X.restore();
}
SC2.B2d = (lt, D, L) => {
  const n = EVID.length, t0 = .35, sd = (D - t0 - .9) / n;
  const idx = clamp(Math.floor((lt - t0) / sd), 0, n - 1), u = lt - t0 - idx * sd;
  const cap = sd * .6;   // the moment of capture inside each shot
  X.fillStyle = '#02050f'; X.fillRect(0, 0, W, H);
  const drawShot = (i, uu) => {
    const [k, , , ] = EVID[i], im = IMG[k]; if (!im) return;
    const z = 1.05 + .07 * clamp(uu / sd), pan = .35 + .3 * clamp(uu / sd) * (i % 2 ? -1 : 1) + (i % 2 ? .3 : 0);
    photo(im, 0, 0, W, H, { r: 0, zoom: z, px: clamp(pan), py: .55 });
  };
  // the new frame is revealed through ten vertical blinds
  if (idx > 0 && u < .8) {
    drawShot(idx - 1, sd + u);
    for (let s = 0; s < 10; s++) {
      const p = eio(clamp((u - s * .035) / .42)); if (p <= 0) continue;
      X.save(); X.beginPath(); X.rect(s * 192, 0, 193, H * p); X.clip(); drawShot(idx, u); X.restore();
      X.fillStyle = `rgba(255,255,255,${.5 * (1 - p) * p * 4})`; X.fillRect(s * 192, H * p - 3, 193, 3);
    }
  } else drawShot(idx, u);
  // legibility
  let g1 = X.createLinearGradient(0, 0, 0, 300); g1.addColorStop(0, 'rgba(2,8,24,.72)'); g1.addColorStop(1, 'rgba(2,8,24,0)'); X.fillStyle = g1; X.fillRect(0, 0, W, 300);
  g1 = X.createLinearGradient(0, H - 420, 0, H); g1.addColorStop(0, 'rgba(2,8,24,0)'); g1.addColorStop(1, 'rgba(2,8,24,.86)'); X.fillStyle = g1; X.fillRect(0, H - 420, W, 420);
  // the viewfinder
  const sp = 1 + .05 * (1 - S(lt - .1, 90));
  bracketSet(W / 2, H / 2, (W - 140) * sp, (H - 140) * sp, 70, 'rgba(255,255,255,.9)', Math.min(1, lt * 3), 3);
  const [, fx, fy, dist] = EVID[idx];
  const lock = S(u - .12, 110), fs = lerp(420, 150, lock), fcx = lerp(W / 2, fx * W, S(u, 60)), fcy = lerp(H / 2, fy * H, S(u, 60));
  const locked = u > cap - .12;
  bracketSet(fcx, fcy, fs, fs * .72, 26, locked ? rgba(C2.teal) : 'rgba(255,255,255,.95)', .95, 3);
  if (locked) { X.save(); X.strokeStyle = rgba(C2.teal, .9); X.lineWidth = 2; X.beginPath(); X.moveTo(fcx - 9, fcy); X.lineTo(fcx + 9, fcy); X.moveTo(fcx, fcy - 9); X.lineTo(fcx, fcy + 9); X.stroke(); X.restore(); }
  // shutter
  if (u > cap) { const f = Math.exp(-(u - cap) * 15); X.fillStyle = `rgba(255,255,255,${.55 * f})`; X.fillRect(0, 0, W, H); }
  // readouts: REC, timecode, district, captured number
  const blink = Math.floor(lt * 2) % 2 === 0;
  X.fillStyle = blink ? '#ff3b3b' : 'rgba(255,59,59,.25)'; X.beginPath(); X.arc(92, 96, 9, 0, 7); X.fill();
  mono('REC', 116, 103, 22, [255, 255, 255], .95);
  const fr = Math.floor(lt * 24), tc = `00:00:${String(Math.floor(fr / 24)).padStart(2, '0')}:${String(fr % 24).padStart(2, '0')}`;
  mono(tc, 220, 103, 22, [255, 255, 255], .8);
  mono(dist, W - 92, 103, 22, [255, 255, 255], .95, 'right');
  mono('SEEN IN PERSON', W - 92, 140, 17, C2.teal, .9, 'right');
  // the "logged" tag beside the focus box
  if (u > cap + .05) {
    const p = S(u - cap - .05, 160);
    X.save(); X.globalAlpha = p; X.translate(fcx + fs / 2 + 26, fcy - fs * .36 + (1 - p) * 14);
    X.font = `700 22px ${FAM.m}`; const label = 'LOGGED  S' + String(412 + idx * 37).padStart(4, '0'); const w = X.measureText(label).width + 40;
    X.fillStyle = rgba(C2.teal); rr(0, -20, w, 40, 20); X.fill(); X.fillStyle = rgba(C2.navy); X.textBaseline = 'middle'; X.fillText(label, 20, 1); X.restore();
  }
  // the title and the three things we read
  const a0 = ln2(L, 0), d0 = ldur(L, 0);
  line('EVIDENCE', { x: MX, y: 868, size: 118, wt: 900, ls: -4, col: C2.white, tin: a0, tout: 1e9, stag: .02 });
  line('FROM THE FLOOR.', { x: MX, y: 976, size: 118, wt: 900, ls: -4, col: C2.white, tin: a0 + .12, tout: 1e9, stag: .016 });
  const t1 = L.length > 1 ? ln2(L, 1) : a0 + d0 * .55;
  evidChip(MX, 392, 'STOCK ON THE FLOOR', S(lt - (a0 + d0 * .30), 150));
  evidChip(MX, 480, 'PRICES ON THE GLASS', S(lt - (a0 + d0 * .60), 150));
  evidChip(MX, 568, 'HOW IT IS PRESENTED', S(lt - t1, 150));
  // the captured frames collect along the bottom
  const tw = 176, th = 104, gx = 16, x1 = W - 92;
  for (let i = 0; i < n; i++) {
    const tc2 = t0 + i * sd + cap + .1, p = S(lt - tc2, 130); if (p < .004) continue;
    const x = x1 - (n - i) * (tw + gx) + gx, y = H - 160 + (1 - p) * 40;
    X.save(); X.globalAlpha = Math.min(1, p * 1.6); X.shadowColor = 'rgba(0,0,0,.5)'; X.shadowBlur = 22;
    photo(IMG[EVID[i][0]], x, y, tw, th, { r: 12, zoom: 1.1 }); X.shadowColor = 'transparent';
    X.strokeStyle = i === idx && lt < D - .9 ? rgba(C2.teal) : 'rgba(255,255,255,.55)'; X.lineWidth = 2.5; rr(x, y, tw, th, 12); X.stroke(); X.restore();
  }
};
BG2.B2d = () => NOIR;

/* ---------- B2e: mapping the market ---------- */
const SHIFA_PINS = (window.DPINS || []).filter(p => p[2] === 1);
const SHEET = [
  ['S0001', 'Haraj Al Shifa Used Cars', '24.54852'], ['S0002', 'Shifa Yard for Used Cars', '24.5488603'],
  ['S0003', 'Al Shifa Car Showrooms (cluster)', '24.5479261'], ['S0004', 'Saleh Group — Al Shifa', '24.5515836'],
  ['S0005', 'Najoom Al Shifa', '24.5510734'], ['S0006', 'Afaq Al Shifa', '24.5486997'],
  ['S0007', 'Shaibani Cars', '24.5482954'], ['S0008', 'Rashid Al Damaan Cars', '24.5488793'],
];
// a walked order through the pins: nearest neighbour from the south-west
const WALK = (() => {
  const P = SHIFA_PINS.slice(); if (!P.length) return [];
  let cur = P.reduce((a, b) => (b[0] - b[1] < a[0] - a[1] ? b : a)); const out = [cur]; P.splice(P.indexOf(cur), 1);
  while (P.length) { let bi = 0, bd = 1e18; P.forEach((p, i) => { const d = (p[0] - cur[0]) ** 2 + (p[1] - cur[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); cur = P.splice(bi, 1)[0]; out.push(cur); }
  return out;
})();
const SHIFA_CHUNKS = [['00', 2587.93, 22411.37], ['10', 3698.46, 22411.37], ['20', 4808.99, 22411.37], ['01', 2587.93, 23521.91], ['11', 3698.46, 23521.91], ['21', 4808.99, 23521.91], ['02', 2587.93, 24632.44], ['12', 3698.46, 24632.44], ['22', 4808.99, 24632.44]];
const APPG = '#1d6b50', APPBG = '#f6f4ee';
function appMap(w, h, prog) {
  const cx = 4560, cz = 23950, s = w / 1900;
  X.save(); rr(0, 0, w, h, 22); X.clip(); X.fillStyle = '#ddd'; X.fillRect(0, 0, w, h);
  SHIFA_CHUNKS.forEach(([k, x0, z0]) => { const im = IMG['sh-' + k]; if (!im) return; X.drawImage(im, (x0 - cx) * s + w / 2, (z0 - cz) * s + h / 2, 1110.53 * s + 1, 1110.53 * s + 1); });
  X.fillStyle = 'rgba(255,255,255,.18)'; X.fillRect(0, 0, w, h);
  const N = WALK.length, m = prog * N, P2 = p => [(p[0] - cx) * s + w / 2, (p[1] - cz) * s + h / 2];
  // the walked route
  if (N) {
    X.lineJoin = 'round'; X.lineCap = 'round';
    for (const [lw, col] of [[8, 'rgba(61,255,106,.22)'], [3, '#3dff6a']]) {
      X.strokeStyle = col; X.lineWidth = lw; X.beginPath();
      for (let i = 0; i < Math.min(N, Math.ceil(m)); i++) { const [x, y] = P2(WALK[i]); i ? X.lineTo(x, y) : X.moveTo(x, y); }
      X.stroke();
    }
    WALK.forEach((p, i) => {
      const q = clamp(m - i); if (q <= 0) return; const [x, y] = P2(p), r = 5.5 * (1 + (1 - S(q, 40)) * .8);
      X.fillStyle = APPG; X.strokeStyle = '#fff'; X.lineWidth = 2; X.beginPath(); X.arc(x, y, r, 0, 7); X.fill(); X.stroke();
    });
    const [hx, hy] = P2(WALK[Math.min(N - 1, Math.floor(m))]);
    if (prog < 1) { X.fillStyle = 'rgba(0,120,255,.25)'; X.beginPath(); X.arc(hx, hy, 18, 0, 7); X.fill(); X.fillStyle = '#1a73e8'; X.strokeStyle = '#fff'; X.lineWidth = 3; X.beginPath(); X.arc(hx, hy, 8, 0, 7); X.fill(); X.stroke(); }
  }
  X.restore();
}
function appUI(w, h, prog, lt) {
  X.fillStyle = APPBG; X.fillRect(0, 0, w, h);
  X.fillStyle = '#1b2a2a'; X.font = `700 26px ${FAM.s}`; X.textAlign = 'left'; X.fillText('Qadisiyah Field', 26, 76);
  X.font = `500 15px ${FAM.s}`; X.fillStyle = '#6d7a76'; X.fillText('Al Shifa · Used-car market · Synced', 26, 100);
  // the district switch
  X.fillStyle = '#e9e6dc'; rr(22, 122, w - 44, 56, 28); X.fill();
  X.fillStyle = APPG; rr(w / 2 - 2, 126, w / 2 - 24, 48, 24); X.fill();
  X.font = `600 18px ${FAM.s}`; X.textAlign = 'center'; X.fillStyle = '#44504c'; X.fillText('Al Qadisiyah  309', w / 4 + 10, 157); X.fillStyle = '#fff'; X.fillText('Al Shifa  211', w * .75 - 11, 157);
  // the map
  X.save(); X.translate(22, 198); appMap(w - 44, 420, prog); X.restore();
  // progress card
  const n = Math.round(prog * WALK.length);
  X.fillStyle = '#fff'; X.shadowColor = 'rgba(0,0,0,.12)'; X.shadowBlur = 22; X.shadowOffsetY = 8; rr(22, 636, w - 44, 118, 22); X.fill(); X.shadowColor = 'transparent';
  X.textAlign = 'left'; X.fillStyle = '#1b2a2a'; X.font = `700 21px ${FAM.s}`; X.fillText('Used-car market', 42, 676);
  X.textAlign = 'right'; X.fillStyle = '#6d7a76'; X.font = `600 18px ${FAM.s}`; X.fillText(`${n} / ${WALK.length} pinned`, w - 42, 676);
  X.fillStyle = '#e4e1d6'; rr(42, 696, w - 84, 8, 4); X.fill(); X.fillStyle = APPG; rr(42, 696, Math.max(8, (w - 84) * prog), 8, 4); X.fill();
  X.fillStyle = APPG; rr(42, 716, w - 84, 22, 11); X.globalAlpha = 0; X.fill(); X.globalAlpha = 1;
}
function sheetUI(w, h, lt, t0) {
  X.fillStyle = '#fff'; X.fillRect(0, 0, w, h);
  X.fillStyle = '#0f7b4f'; X.fillRect(0, 0, w, 78);
  X.textAlign = 'left'; X.fillStyle = '#fff'; X.font = `600 25px ${FAM.s}`; X.fillText('Al_Shifa_Dealership_Mapping', 28, 49);
  const cols = [28, 170, 560, 730], head = ['SD ID', 'SHOWROOM', 'AREA', 'LATITUDE'];
  X.fillStyle = '#dff1e8'; X.fillRect(0, 78, w, 62);
  X.fillStyle = '#115c3d'; X.font = `700 18px ${FAM.m}`; head.forEach((t, i) => X.fillText(t, cols[i], 117));
  SHEET.forEach((r, i) => {
    const p = S(lt - (t0 + .15 + i * .26), 150); if (p < .004) return;
    const y = 140 + i * 66 + (1 - p) * 26;
    X.globalAlpha = Math.min(1, p * 1.6); X.fillStyle = i % 2 ? '#f1f7f4' : '#fff'; X.fillRect(0, y, w, 66);
    X.fillStyle = '#16211d'; X.font = `500 21px ${FAM.m}`; X.fillText(r[0], cols[0], y + 41);
    X.font = `600 22px ${FAM.s}`; X.fillText(r[1], cols[1], y + 41);
    X.fillStyle = '#4b5a54'; X.font = `500 21px ${FAM.s}`; X.fillText('Al Shifa', cols[2], y + 41);
    X.font = `500 21px ${FAM.m}`; X.fillText(r[2], cols[3], y + 41); X.globalAlpha = 1;
  });
}
SC2.B2e = (lt, D, L) => {
  studioFloor();
  const a0 = ln2(L, 0), d0 = ldur(L, 0);
  mono('FIELD APP  ·  MASTER SHEET', MX + 4, 150, 22, C2.blue, S(lt - .1, 200));
  line('Every door, on one map.', { x: MX, y: 262, size: 92, wt: 900, ls: -3, col: C2.navy, tin: a0, stag: .012 });
  const prog = clamp((lt - (a0 + .5)) / (d0 * .75 + 1.5)), prE = prog * prog * (3 - 2 * prog);
  const pS = S(lt - .15, 70), pP = S(lt - .5, 70);
  glass(930, 660, 930, 600, { ry: .13, a: Math.min(1, pS * 1.5), lift: pS }, (w, h) => sheetUI(w, h, lt, a0 + .3));
  glass(1560, 640, 372, 770, { ry: -.2, a: Math.min(1, pP * 1.5), lift: pP, r: 54 }, (w, h) => appUI(w, h, prE, lt));
  mono(`${Math.round(prE * WALK.length)} PINS  ·  EVERY SHOWROOM AT ITS COORDINATES`, MX + 4, 1010, 20, C2.grey, S(lt - (a0 + 1), 200));
};
BG2.B2e = () => Object.assign({}, STUDIO, { wipe: WIPE_B });
