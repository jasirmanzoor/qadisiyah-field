'use strict';
// The field team showcase: the scenes that show the team's own deliverables
//   RSITE  the dealer portfolio website        RSOP   the portal SOP guide (English & Arabic) and sales-team training
//   RFLASH every headline number, one a beat   RNEXT  phase 2, the deep dive, under way
const BTR = () => (FILM.bpm ? 60 / FILM.bpm : .5);

/* ---------- RSITE: the dealer portfolio website ---------- */
const SITE_SHOTS = ['s-close', 's-open', 's-work'];
function browserWin(x, y, w, h, a, draw) {
  X.save(); X.globalAlpha = a;
  X.shadowColor = 'rgba(0,0,0,.55)'; X.shadowBlur = 80; X.shadowOffsetY = 30; X.fillStyle = '#0b1120'; rr(x, y, w, h, 18); X.fill(); X.shadowColor = 'transparent';
  X.strokeStyle = 'rgba(160,190,255,.25)'; X.lineWidth = 1.5; rr(x, y, w, h, 18); X.stroke();
  [[255, 95, 87], [254, 188, 46], [40, 200, 64]].forEach((c, i) => { X.fillStyle = rgba(c, .9); X.beginPath(); X.arc(x + 28 + i * 22, y + 24, 6.5, 0, 7); X.fill(); });
  X.fillStyle = 'rgba(255,255,255,.07)'; rr(x + w / 2 - 260, y + 10, 520, 28, 14); X.fill();
  X.font = `500 15px ${FAM.m}`; X.fillStyle = 'rgba(214,226,255,.8)'; X.textAlign = 'center'; X.fillText('autolinkdealerportfolio.vercel.app', x + w / 2, y + 29); X.textAlign = 'left';
  X.save(); rr(x + 1, y + 48, w - 2, h - 49, 16); X.clip(); draw(x + 1, y + 48, w - 2, h - 49); X.restore();
  X.restore();
}
SC2.RSITE = (lt, D) => {
  X.fillStyle = '#030a1f'; X.fillRect(0, 0, W, H);
  const gl = X.createRadialGradient(W * .62, H * .5, 0, W * .62, H * .5, 1000); gl.addColorStop(0, 'rgba(44,91,246,.35)'); gl.addColorStop(1, 'rgba(44,91,246,0)'); X.fillStyle = gl; X.fillRect(0, 0, W, H);
  const eb = S(lt - .05, 160);
  X.save(); X.globalAlpha = eb; X.fillStyle = rgba(C2.teal); X.fillRect(MX, 133, 44 * eb, 2); X.restore();
  mono('DEALER PORTFOLIO · WEB', MX + 62, 142, 20, C2.teal, eb);
  line('Every finding,', { x: MX, y: 262, size: 76, wt: 700, ls: -3, col: C2.white, tin: .1, stag: .014 });
  line('one site.', { x: MX, y: 346, size: 76, wt: 700, ls: -3, col: C2.teal, tin: .3, stag: .014 });
  mono('THE CENSUS · THE MAP', MX + 4, 420, 16, [170, 190, 235], S(lt - .7, 160));
  const bt = BTR(), per = 4 * bt, wp = S(lt - .15, 90), bx = 690, by = 120 + (1 - wp) * 60, bw = 1180, bh = 760;
  browserWin(bx, by, bw, bh, wp, (x, y, w, h) => {
    const k = Math.min(SITE_SHOTS.length - 1, Math.floor(lt / per)), u = lt - k * per;
    const draw = (i, dy) => { const im = IMG['site-' + SITE_SHOTS[i]]; if (im) photo(im, x, y + dy, w, h, { r: 0, zoom: 1.02 + .03 * clamp(u / per), py: 0 }); };
    if (k > 0 && u < .35) { const q = eio(u / .35); draw(k - 1, -h * q); draw(k, h * (1 - q)); } else draw(k, 0);
  });
  // a cursor that scrolls the page on the beat
  const cy = by + 300 + 60 * Math.sin(lt * 2.2);
  X.save(); X.globalAlpha = wp; X.fillStyle = '#fff'; X.strokeStyle = '#0b1120'; X.lineWidth = 2; X.translate(bx + bw * .7, cy);
  X.beginPath(); X.moveTo(0, 0); X.lineTo(0, 26); X.lineTo(7, 19); X.lineTo(12, 30); X.lineTo(16, 28); X.lineTo(11, 17); X.lineTo(20, 17); X.closePath(); X.fill(); X.stroke(); X.restore();
};
BG2.RSITE = () => NOIR;

/* ---------- RSOP: the portal SOP guide and the training ---------- */
const SOP_EN = ['en-01', 'en-02', 'en-03', 'en-06', 'en-09', 'en-10'], SOP_AR = ['arh-1', 'arh-2', 'arh-3'];
const STEPS7 = ['Log in', 'Language', 'Estimator', 'Applicant', 'Vehicle', 'Institutions', 'Submit'];
function pageCard(im, cx, cy, w, h, rot, a, lift = 1) {
  if (!im || a < .004) return;
  X.save(); X.globalAlpha = a; X.translate(cx, cy); X.rotate(rot);
  X.shadowColor = `rgba(16,30,80,${.22 * lift})`; X.shadowBlur = 50; X.shadowOffsetY = 22; X.fillStyle = '#fff'; rr(-w / 2, -h / 2, w, h, 10); X.fill(); X.shadowColor = 'transparent';
  X.save(); rr(-w / 2, -h / 2, w, h, 10); X.clip(); X.drawImage(im, -w / 2, -h / 2, w, h); X.restore();
  X.strokeStyle = 'rgba(20,40,110,.12)'; X.lineWidth = 1; rr(-w / 2, -h / 2, w, h, 10); X.stroke(); X.restore();
}
SC2.RSOP = (lt, D) => {
  studioFloor();
  const bt = BTR();
  mono('DEALER PORTAL SOP · ENGLISH & ARABIC', MX + 4, 128, 20, C2.blue, S(lt - .05, 200));
  line('The portal, made teachable.', { x: MX, y: 216, size: 84, wt: 700, ls: -3, col: C2.navy, tin: .1, stag: .012 });
  // the Arabic guide fans in on the left
  SOP_AR.forEach((k, i) => { const p = S(lt - (.3 + i * bt * .5), 120); pageCard(IMG['sop-' + k], 330 + i * 70, 640 - i * 14 + (1 - p) * 80, 300, 424, (-.12 + i * .07) * (1 - .3 * p), p); });
  // the English deck deals one slide per beat onto the stack
  const n = SOP_EN.length;
  for (let i = 0; i < n; i++) {
    const t0 = .25 + i * bt, p = eo(clamp((lt - t0) / .32)); if (p <= 0) continue;
    const settled = clamp((lt - t0 - .32) / (bt * 2)), off = Math.min(n - 1, Math.floor((lt - .25) / bt)) - i;
    const cx = 1200 + (1 - p) * 900 - off * 16, cy = 600 + off * 10 - (1 - p) * 40, rot = (1 - p) * .25 + (i % 2 ? .02 : -.025);
    pageCard(IMG['sop-' + SOP_EN[i]], cx, cy, 760, 428, rot, Math.min(1, p * 1.5) * (off > 3 ? .0 : 1), 1);
  }
  // the seven steps, lit in turn
  const sw = 214, sx = (W - 7 * sw) / 2;
  STEPS7.forEach((s, i) => {
    const on = lt > .6 + i * bt * .75, p = S(lt - (.5 + i * .05), 160); if (p < .004) return;
    X.save(); X.globalAlpha = p; X.fillStyle = on ? rgba(C2.blue) : 'rgba(255,255,255,.9)'; rr(sx + i * sw + 6, 930, sw - 12, 64, 32); X.fill();
    X.strokeStyle = on ? 'rgba(44,91,246,0)' : 'rgba(20,40,110,.15)'; X.stroke();
    X.font = `700 15px ${FAM.m}`; X.fillStyle = on ? '#fff' : rgba(C2.grey); X.textAlign = 'center'; X.fillText(`0${i + 1}`, sx + i * sw + sw / 2, 956);
    X.font = `700 19px ${FAM.s}`; X.fillStyle = on ? '#fff' : rgba(C2.navy); X.fillText(s, sx + i * sw + sw / 2, 980); X.textAlign = 'left'; X.restore();
  });
  mono('SEVEN STEPS · TAUGHT TO EVERY SUB-DEALER SALES TEAM', W / 2, 1040, 16, C2.grey, S(lt - 1.4, 160), 'center');
};
BG2.RSOP = () => STUDIO;

/* ---------- RFLASH: every headline number, one a beat ---------- */
const FLASH = [
  ['520', 'SHOWROOMS WALKED'], ['514', 'GPS PINS'], ['31,869', 'CARS COUNTED'], ['SAR 3.6B', 'STOCK ON THE FLOOR'],
  ['25', 'OWNERS INTERVIEWED'], ['SAR 15.7B', 'A YEAR · AL QADISIYAH ALONE'], ['11 / 13', 'FLOORS WITH NO BANK'], ['194 / 210', 'AL SHIFA FLOORS · CASH ONLY'],
  ['20', 'SUB-DEALERS SIGNED'], ['64', 'IN THE PIPELINE'], ['19', 'LENDERS IN OUTREACH'], ['PHASE 1', 'DELIVERED'],
];
const FLASH_BG = [[2, 9, 30], [44, 91, 246], [246, 247, 250], [2, 27, 84]];
SC2.RFLASH = (lt, D) => {
  const bt = BTR(), i = clamp(Math.floor(lt / bt), 0, FLASH.length - 1), u = Math.max(0, lt - i * bt), [v, lab] = FLASH[i];
  const bg = FLASH_BG[i % 4], light = bg[0] > 200, fg = light ? C2.navy : C2.white, accent = light ? C2.blue : (i % 4 === 1 ? C2.white : C2.teal);
  X.fillStyle = rgba(bg); X.fillRect(0, 0, W, H);
  if (!light) warpStreaks(X, .35 + .5 * Math.exp(-u / .1), lt, i % 4 === 1 ? [220, 230, 255] : [120, 160, 255]);
  // a hard horizontal wipe of the previous colour on each beat
  if (i > 0 && u < .12) { X.fillStyle = rgba(FLASH_BG[(i - 1) % 4]); X.fillRect(W * eo(u / .12), 0, W, H); }
  const sc = 1.25 - .25 * eo(clamp(u / .16)), sz = v.length > 6 ? 230 : 300;
  X.save(); X.translate(W / 2, H / 2 - 30); X.scale(sc, sc);
  font(sz, 900); X.letterSpacing = (-sz * .04) + 'px'; X.textAlign = 'center'; X.textBaseline = 'alphabetic';
  if (u < .08) { X.globalAlpha = .5; X.fillStyle = 'rgba(255,60,90,1)'; X.fillText(v, -12, sz * .34); X.fillStyle = 'rgba(60,140,255,1)'; X.fillText(v, 12, sz * .34); }
  X.globalAlpha = 1; X.fillStyle = rgba(fg); X.fillText(v, 0, sz * .34); X.restore(); X.letterSpacing = '0px';
  X.save(); X.globalAlpha = Math.min(1, u / .08); X.font = `700 30px ${FAM.m}`; X.letterSpacing = '8px'; X.textAlign = 'center'; X.fillStyle = rgba(accent); X.fillText(lab, W / 2, H / 2 + 170); X.restore(); X.letterSpacing = '0px'; X.textAlign = 'left';
  mono(`${String(i + 1).padStart(2, '0')} / ${FLASH.length}`, 100, 120, 18, light ? C2.grey : [170, 190, 235], .9);
  mono('PHASE 1 · IN NUMBERS', W - 100, 120, 18, light ? C2.grey : [170, 190, 235], .9, 'right');
};
BG2.RFLASH = () => NOIR;

/* ---------- RNEXT: phase 2, the deep dive ---------- */
SC2.RNEXT = (lt, D) => {
  const z = 14.35 + .25 * clamp(lt / D), c = [GQ[0] - .004, GQ[1] - .012];
  X.fillStyle = '#01030c'; X.fillRect(0, 0, W, H);
  drawMap(z, c, 1);
  X.fillStyle = 'rgba(2,10,34,.62)'; X.fillRect(0, 0, W, H);
  // the sweep: every pinned showroom is revisited and profiled
  const sweepAng = lt * 1.6, cxy = placeAt(GQ[0], GQ[1], z, c) || [W / 2, H / 2];
  X.save(); X.translate(cxy[0], cxy[1]);
  const sg = X.createConicGradient(sweepAng - .9, 0, 0); sg.addColorStop(0, 'rgba(86,132,255,0)'); sg.addColorStop(.14, 'rgba(86,132,255,.28)'); sg.addColorStop(.145, 'rgba(86,132,255,0)');
  X.fillStyle = sg; X.beginPath(); X.arc(0, 0, 1400, 0, 7); X.fill(); X.restore();
  QPINS.forEach((q, i) => {
    const p = placeAt(q[0], q[1], z, c); if (!p) return;
    let ang = Math.atan2(p[1] - cxy[1], p[0] - cxy[0]); const since = ((sweepAng - ang) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const lit = Math.exp(-since * 1.6) * S(lt - .3, 60);
    X.strokeStyle = 'rgba(190,210,255,.55)'; X.lineWidth = 1.4; X.beginPath(); X.arc(p[0], p[1], 5, 0, 7); X.stroke();
    if (lit > .02) { X.fillStyle = `rgba(86,132,255,${.35 * lit})`; X.beginPath(); X.arc(p[0], p[1], 14 * lit + 4, 0, 7); X.fill(); X.fillStyle = `rgba(230,238,255,${lit})`; X.beginPath(); X.arc(p[0], p[1], 3, 0, 7); X.fill(); }
  });
  const vg = X.createLinearGradient(0, 0, W, 0); vg.addColorStop(0, 'rgba(1,5,20,.92)'); vg.addColorStop(.5, 'rgba(1,5,20,.35)'); vg.addColorStop(1, 'rgba(1,5,20,0)'); X.fillStyle = vg; X.fillRect(0, 0, W, H);
  const eb = S(lt - .05, 160);
  X.save(); X.globalAlpha = eb; X.fillStyle = rgba(C2.teal); X.fillRect(MX, 323, 44 * eb, 2); X.restore();
  mono('PHASE 2 · THE DEEP DIVE', MX + 62, 332, 20, C2.teal, eb);
  line('Every dealership,', { x: MX, y: 452, size: 92, wt: 700, ls: -3, col: C2.white, tin: .15, stag: .014 });
  line('profiled in depth.', { x: MX, y: 552, size: 92, wt: 700, ls: -3, col: C2.teal, tin: .4, stag: .014 });
  line('To shape what AutoLink does next.', { x: MX, y: 640, size: 36, wt: 500, col: [190, 205, 240], tin: 1.0, stag: .008 });
  // status pill
  const pp = S(lt - 1.3, 140), blink = .55 + .45 * Math.abs(Math.sin(lt * 4));
  if (pp > .004) { X.save(); X.globalAlpha = pp; X.fillStyle = 'rgba(8,18,52,.7)'; rr(MX, 700, 300, 54, 27); X.fill(); X.strokeStyle = 'rgba(160,190,255,.4)'; X.stroke();
    X.fillStyle = `rgba(86,132,255,${blink})`; X.beginPath(); X.arc(MX + 30, 727, 7, 0, 7); X.fill(); X.restore(); mono('IN PROGRESS', MX + 52, 734, 18, [214, 226, 255], pp); }
};
BG2.RNEXT = () => NOIR;
