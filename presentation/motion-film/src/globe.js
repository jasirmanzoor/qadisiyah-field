'use strict';
// The reel's opening: the brand card, then one continuous move from orbit to Al Qadisiyah.
// The globe is the Earth texture on an orthographic sphere; past KSA it hands over to Esri satellite mosaics, one per zoom level (zoom_tiles.py).

/* ---------- RBRAND: the brand card ---------- */
SC2.RBRAND = (lt, D) => {
  studioFloor();
  mark(W / 2, H / 2 - 40, .92, C2.navy, 1, .12);
  const p = S(lt - .75, 90), ls = lerp(22, 7, eo(clamp((lt - .75) / .9)));
  X.save(); X.globalAlpha = p; X.font = `700 30px ${FAM.s}`; X.letterSpacing = ls + 'px'; X.textAlign = 'center'; X.fillStyle = rgba(C2.blue);
  X.fillText('AI-DRIVEN FINANCE FOR 520 SHOWROOMS', W / 2, H / 2 + 190); X.restore(); X.letterSpacing = '0px'; X.textAlign = 'left';
  const lw = 420 * eio(clamp((lt - .9) / .6)); X.fillStyle = rgba(C2.blue, .35); X.fillRect(W / 2 - lw / 2, H / 2 + 128, lw, 1.5);
};
BG2.RBRAND = () => STUDIO;

/* ---------- RGLOBE: orbit to Al Qadisiyah ---------- */
const ZKEYS = [[0, 2.9], [1.1, 3.5], [2.0, 5.6], [2.7, 6.3], [3.8, 9.4], [4.4, 10.2], [5.7, 14.2], [7.2, 14.7]];
const ZSLOPE = (() => {   // Fritsch–Carlson slopes: a smooth zoom that never overshoots its keys
  const k = ZKEYS, n = k.length, d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((k[i + 1][1] - k[i][1]) / (k[i + 1][0] - k[i][0]));
  m.push(d[0]); for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : 2 / (1 / d[i - 1] + 1 / d[i])); m.push(d[n - 2]);
  return m;
})();
function zoomAt(t) {
  const k = ZKEYS; if (t <= k[0][0]) return k[0][1]; if (t >= k[k.length - 1][0]) return k[k.length - 1][1];
  let i = 0; while (t > k[i + 1][0]) i++;
  const h = k[i + 1][0] - k[i][0], s = (t - k[i][0]) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * k[i][1] + (s3 - 2 * s2 + s) * h * ZSLOPE[i] + (-2 * s3 + 3 * s2) * k[i + 1][1] + (s3 - s2) * h * ZSLOPE[i + 1];
}
const GKSA = [24.0, 45.0], GRIY = [24.70, 46.70], GQ = [24.8257, 46.8225], COSR = Math.cos(24.7 * Math.PI / 180);
function camCentre(z) {   // matches zoom_tiles.py
  if (z < 4.8) { const p = sm(2.9, 4.8, z); return [lerp(6, GKSA[0], p), lerp(8, GKSA[1], p)]; }
  const p1 = sm(5.5, 8.5, z), p2 = sm(8.5, 12.5, z);
  return [lerp(lerp(GKSA[0], GRIY[0], p1), GQ[0], p2), lerp(lerp(GKSA[1], GRIY[1], p1), GQ[1], p2)];
}
const mercW = (lat, lng, L) => { const n = 256 * Math.pow(2, L); return [(lng + 180) / 360 * n, (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n]; };
const D2R = Math.PI / 180;
// screen position of a place, on the globe or on the flat map
function placeAt(lat, lng, z, c) {
  if (z < 4.8) {
    const R = Math.pow(2, z) * 256 / (360 * COSR) / D2R, f0 = c[0] * D2R, l0 = c[1] * D2R, f = lat * D2R, l = lng * D2R;
    const cosc = Math.sin(f0) * Math.sin(f) + Math.cos(f0) * Math.cos(f) * Math.cos(l - l0); if (cosc < 0) return null;
    return [W / 2 + R * Math.cos(f) * Math.sin(l - l0), H / 2 - R * (Math.cos(f0) * Math.sin(f) - Math.sin(f0) * Math.cos(f) * Math.cos(l - l0))];
  }
  const a = mercW(lat, lng, z), b = mercW(c[0], c[1], z); return [W / 2 + a[0] - b[0], H / 2 + a[1] - b[1]];
}
let EARTH = null; const gcv = document.createElement('canvas'); gcv.width = 960; gcv.height = 540; const gctx = gcv.getContext('2d'), gimg = gctx.createImageData(960, 540);
function drawGlobe(z, c) {
  if (!EARTH && IMG.earth) { const cv = document.createElement('canvas'); cv.width = IMG.earth.width; cv.height = IMG.earth.height; const cx = cv.getContext('2d'); cx.drawImage(IMG.earth, 0, 0); EARTH = { w: cv.width, h: cv.height, d: cx.getImageData(0, 0, cv.width, cv.height).data }; }
  // stars
  X.fillStyle = '#01030c'; X.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) { const x = rnd(i * 3) * W, y = rnd(i * 3 + 1) * H, b = rnd(i * 3 + 2); X.fillStyle = `rgba(200,215,255,${.15 + .55 * b * b})`; X.fillRect(x, y, b > .9 ? 2 : 1.2, b > .9 ? 2 : 1.2); }
  if (!EARTH) return;
  const R = Math.pow(2, z) * 256 / (360 * COSR) / D2R / 2;   // in half-resolution pixels
  const f0 = c[0] * D2R, l0 = c[1] * D2R, sf0 = Math.sin(f0), cf0 = Math.cos(f0), d = gimg.data, E = EARTH.d, ew = EARTH.w, eh = EARTH.h;
  const Lx = -.42, Ly = .5, Lz = .76;
  const ys = Math.max(0, Math.floor(270 - R)), ye = Math.min(540, Math.ceil(270 + R)), xs = Math.max(0, Math.floor(480 - R)), xe = Math.min(960, Math.ceil(480 + R));
  d.fill(0);
  for (let py = ys; py < ye; py++) {
    const y = (270 - py - .5) / R;
    for (let px = xs; px < xe; px++) {
      const x = (px + .5 - 480) / R, r2 = x * x + y * y; if (r2 >= 1) continue;
      const cz = Math.sqrt(1 - r2), rho = Math.sqrt(r2), sc = rho, cc = cz;
      const lat = rho < 1e-9 ? f0 : Math.asin(cc * sf0 + (y * sc * cf0) / rho);
      const lon = l0 + Math.atan2(x * sc, rho * cc * cf0 - y * sc * sf0);
      let u = ((lon / D2R + 180) / 360) % 1; if (u < 0) u += 1;
      const tx = Math.min(ew - 1, Math.floor(u * ew)), ty = Math.min(eh - 1, Math.max(0, Math.floor((90 - lat / D2R) / 180 * eh))), ti = (ty * ew + tx) * 4;
      const lam = Math.max(0, x * Lx + y * Ly + cz * Lz), sh = .28 + .9 * lam, rim = Math.pow(1 - cz, 2.6);
      const o = (py * 960 + px) * 4;
      d[o] = E[ti] * sh * (1 - rim) + 70 * rim; d[o + 1] = E[ti + 1] * sh * (1 - rim) + 120 * rim; d[o + 2] = E[ti + 2] * sh * (1 - rim) + 255 * rim;
      d[o + 3] = 255 * Math.min(1, (1 - Math.sqrt(r2)) * R * .6);
    }
  }
  gctx.putImageData(gimg, 0, 0);
  X.save(); X.imageSmoothingQuality = 'high'; X.drawImage(gcv, 0, 0, W, H); X.restore();
  // atmosphere
  const Rf = R * 2, ag = X.createRadialGradient(W / 2, H / 2, Rf * .96, W / 2, H / 2, Rf * 1.16);
  ag.addColorStop(0, 'rgba(110,160,255,.55)'); ag.addColorStop(.35, 'rgba(70,120,255,.22)'); ag.addColorStop(1, 'rgba(40,90,255,0)');
  X.fillStyle = ag; X.beginPath(); X.arc(W / 2, H / 2, Rf * 1.16, 0, 7); X.fill();
}
let ZSPEC = null;
function drawMap(z, c, a) {
  if (!ZSPEC) return; X.save(); X.globalAlpha = a;
  const draw = (L, al) => {
    const sp = ZSPEC[L - 5], im = IMG['zoom' + L]; if (!sp || !im || al <= 0) return;
    const s = Math.pow(2, z - L), cw = mercW(c[0], c[1], L);
    X.globalAlpha = a * al; X.drawImage(im, W / 2 + (sp.x0 * 256 - cw[0]) * s, H / 2 + (sp.y0 * 256 - cw[1]) * s, sp.nx * 256 * s, sp.ny * 256 * s);
  };
  const lo = Math.floor(z), f = z - lo, hiA = sm(.38, .62, f);
  if (lo < 5) draw(5, 1); else if (lo >= 15) draw(15, 1); else { draw(lo, 1); draw(lo + 1, hiA); }
  X.restore();
}
function placeChip(x, y, top, big, a, sub) {
  if (a < .004 || !x) return;
  X.save(); X.globalAlpha = a;
  const pulse = (T * 1.4) % 1;
  X.strokeStyle = `rgba(160,190,255,${.8 * (1 - pulse)})`; X.lineWidth = 2; X.beginPath(); X.arc(x, y, 8 + pulse * 26, 0, 7); X.stroke();
  X.shadowColor = 'rgba(86,132,255,.9)'; X.shadowBlur = 18; X.fillStyle = '#fff'; X.beginPath(); X.arc(x, y, 6, 0, 7); X.fill(); X.shadowColor = 'transparent';
  const lh = 90 * eo(a), bx = x + 26, by = y - lh - 76;
  X.strokeStyle = 'rgba(214,226,255,.85)'; X.lineWidth = 1.5; X.beginPath(); X.moveTo(x, y - 8); X.lineTo(x, y - lh); X.lineTo(bx, y - lh); X.stroke();
  X.font = `700 44px ${FAM.s}`; let w = X.measureText(big).width; X.font = `500 15px ${FAM.m}`; X.letterSpacing = '2px'; w = Math.max(w, X.measureText(top).width, sub ? X.measureText(sub).width : 0) + 60; X.letterSpacing = '0px';
  X.fillStyle = 'rgba(4,12,40,.72)'; rr(bx, by, w, sub ? 128 : 96, 18); X.fill(); X.strokeStyle = 'rgba(160,190,255,.4)'; X.lineWidth = 1.2; X.stroke();
  X.restore();
  mono(top, bx + 28, by + 30, 15, [150, 178, 240], a);
  X.save(); X.globalAlpha = a; X.font = `700 44px ${FAM.s}`; X.fillStyle = '#fff'; X.fillText(big, bx + 28, by + 78); X.restore();
  if (sub) mono(sub, bx + 28, by + 110, 16, C2.teal, a);
}
const QPINS = (() => { const P = (window.DPINS || []).filter(p => p[2] === 0), lat0 = 24.7636, lng0 = 46.6402;
  return P.map(p => [lat0 - p[1] / 111320, lng0 + p[0] / (111320 * Math.cos(lat0 * D2R))]).map(q => [q, Math.hypot(q[0] - GQ[0], (q[1] - GQ[1]) * .91)]).sort((a, b) => a[1] - b[1]).map(a => a[0]); })();
SC2.RGLOBE = (lt, D) => {
  const z = zoomAt(lt), c = camCentre(z);
  if (z < 5.0) drawGlobe(Math.min(z, 4.8), camCentre(Math.min(z, 4.8)));
  const ma = sm(4.55, 5.0, z); if (ma > 0) drawMap(Math.max(z, 4.55), z < 4.8 ? camCentre(4.8) : c, ma);
  // grade the imagery towards the brand blues
  if (ma > 0) { X.fillStyle = `rgba(4,14,44,${.26 * ma})`; X.fillRect(0, 0, W, H); }
  const vg = X.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * 1.05); vg.addColorStop(0, 'rgba(1,4,18,0)'); vg.addColorStop(1, 'rgba(1,4,18,.75)'); X.fillStyle = vg; X.fillRect(0, 0, W, H);
  // Al Qadisiyah's showrooms light up
  const pz = sm(12.9, 13.9, z);
  if (pz > 0) {
    X.save();
    QPINS.forEach((q, i) => {
      const al = sm(i / QPINS.length * .8, i / QPINS.length * .8 + .2, pz); if (al <= 0) return;
      const p = placeAt(q[0], q[1], z, c); if (!p) return;
      X.fillStyle = `rgba(86,132,255,${.16 * al})`; X.beginPath(); X.arc(p[0], p[1], 7, 0, 7); X.fill();
      X.fillStyle = `rgba(190,210,255,${.85 * al})`; X.beginPath(); X.arc(p[0], p[1], 2.2, 0, 7); X.fill();
    });
    X.restore();
  }
  // labels
  const zc = z < 4.8 ? camCentre(z) : c, pl = (g) => placeAt(g[0], g[1], z < 4.8 ? z : z, zc) || [0, 0];
  const aS = sm(4.4, 4.9, z) * (1 - sm(6.8, 7.4, z)), aR = sm(8.3, 8.9, z) * (1 - sm(10.6, 11.2, z)), aQ = sm(13.3, 13.9, z);
  if (aS > 0) { const p = pl(GKSA); placeChip(p[0], p[1], 'KINGDOM OF SAUDI ARABIA', 'Saudi Arabia', aS); }
  if (aR > 0) { const p = pl([24.7136, 46.6753]); placeChip(p[0], p[1], 'CAPITAL OF THE KINGDOM', 'Riyadh', aR); }
  if (aQ > 0) { const p = pl([24.8365, 46.7905]); placeChip(p[0], p[1], 'EAST RIYADH · USED-CAR DISTRICT', 'Al Qadisiyah', aQ, '309 SHOWROOMS PINNED'); }
  // HUD
  const ha = S(lt - .2, 100);
  X.save(); X.globalAlpha = ha * .8; X.strokeStyle = 'rgba(160,190,255,.5)'; X.lineWidth = 2; const m = 44, l = 46;
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => { X.beginPath(); X.moveTo(x + sx * l, y); X.lineTo(x, y); X.lineTo(x, y + sy * l); X.stroke(); }); X.restore();
  const span = W / (256 * Math.pow(2, z) / 360) * 111.32 * Math.cos(zc[0] * D2R);
  mono('AUTOLINK · FIELD CENSUS', 76, 92, 16, C2.teal, ha * .9);
  mono(`${zc[0].toFixed(4)}°N   ${zc[1].toFixed(4)}°E`, W - 76, 92, 16, C2.teal, ha * .9, 'right');
  mono(`FIELD OF VIEW  ${span >= 100 ? Math.round(span).toLocaleString('en-US') : span.toFixed(1)} KM`, 76, H - 70, 16, [170, 190, 235], ha * .9);
  mono('IMAGERY © ESRI, MAXAR, EARTHSTAR GEOGRAPHICS', W - 76, H - 70, 13, [150, 165, 200], ha * .7, 'right');
};
BG2.RGLOBE = () => NOIR;
