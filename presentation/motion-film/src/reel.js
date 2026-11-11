'use strict';
// The final reel: a fast cut of all the films. Two scenes of its own: a cold open and a premium "where the money leaks".

/* ---------- R0: cold open, five statements on the beat, then the mark ---------- */
const R0_CARDS = [
  ['RIYADH', 'q-riyadhcars-night'], ['520 SHOWROOMS', 'q-luxhall'], ['31,869 CARS', 's-hall'],
  ['SAR 3.6B ON THE FLOOR', 'n-porsche-row'], ['WALKED DOOR TO DOOR', 'q-street-fullspeed'],
];
function gradedPhoto(k, zoom, px, dark) {
  photo(IMG[k], 0, 0, W, H, { r: 0, zoom, px, py: .5 });
  X.fillStyle = `rgba(2,10,34,${dark})`; X.fillRect(0, 0, W, H);
}
SC2.R0 = (lt, D) => {
  const beat = .6, n = R0_CARDS.length, tm = n * beat;
  X.fillStyle = '#02050f'; X.fillRect(0, 0, W, H);
  if (lt < tm) {
    const i = Math.floor(lt / beat), u = lt - i * beat, [word, pic] = R0_CARDS[i];
    gradedPhoto(pic, 1.18 - .08 * (u / beat), .5 + (i % 2 ? -.08 : .08) * (u / beat), .72);
    // a thin frame and a light streak that crosses on each beat
    X.strokeStyle = 'rgba(160,190,255,.22)'; X.lineWidth = 1.5; X.strokeRect(70, 70, W - 140, H - 140);
    const sx = lerp(-400, W + 400, eio(clamp(u / beat)));
    const sg = X.createLinearGradient(sx - 300, 0, sx + 300, 0); sg.addColorStop(0, 'rgba(160,190,255,0)'); sg.addColorStop(.5, 'rgba(160,190,255,.14)'); sg.addColorStop(1, 'rgba(160,190,255,0)');
    X.fillStyle = sg; X.fillRect(0, 0, W, H);
    mono(`0${i + 1} / 0${n}`, 100, 120, 18, C2.teal, .9);
    mono('AUTOLINK · FIELD CENSUS', W - 100, 120, 18, C2.teal, .9, 'right');
    const sc = 1.14 - .14 * eo(clamp(u / .22)), al = Math.min(1, u / .06);
    font(150, 900); X.letterSpacing = '-4px'; X.textAlign = 'center'; X.textBaseline = 'middle';
    X.save(); X.translate(W / 2, H / 2); X.scale(sc, sc);
    if (u < .12) { X.globalAlpha = .55 * al; X.fillStyle = 'rgba(255,60,90,1)'; X.fillText(word, -10, 0); X.fillStyle = 'rgba(60,140,255,1)'; X.fillText(word, 10, 0); }
    X.globalAlpha = al; X.fillStyle = rgba(C2.white); X.fillText(word, 0, 0); X.restore();
    X.letterSpacing = '0px'; X.textAlign = 'left'; X.textBaseline = 'alphabetic';
  } else {
    const u = lt - tm;
    const gl = X.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 900); gl.addColorStop(0, `rgba(44,91,246,${.35 * S(u, 60)})`); gl.addColorStop(1, 'rgba(44,91,246,0)'); X.fillStyle = gl; X.fillRect(0, 0, W, H);
    const lw = W * eio(clamp(u / .35)); X.fillStyle = 'rgba(160,190,255,.8)'; X.fillRect(W / 2 - lw / 2, H / 2 + 120, lw, 1.5);
    mark(W / 2, H / 2 - 20, .62, C2.white, 1, tm + .05);
    mono('FROM THE SHOWROOM FLOOR TO KAFD', W / 2, H / 2 + 170, 22, C2.teal, S(u - .35, 160), 'center');
  }
};
BG2.R0 = () => NOIR;

/* ---------- RLEAK: where the money leaks, in the premium dark look ---------- */
function glassCard(x, y, w, h, p) {
  if (p < .004) return false;
  X.save(); X.globalAlpha = p; X.translate(0, (1 - p) * 30);
  X.fillStyle = 'rgba(8,18,52,.55)'; rr(x, y, w, h, 26); X.fill();
  const bg = X.createLinearGradient(0, y, 0, y + h); bg.addColorStop(0, 'rgba(160,190,255,.34)'); bg.addColorStop(1, 'rgba(160,190,255,.05)');
  X.strokeStyle = bg; X.lineWidth = 1.5; rr(x, y, w, h, 26); X.stroke();
  X.restore(); return true;
}
SC2.RLEAK = (lt, D) => {
  gradedPhoto('q-safh-dark', 1.08 + .05 * clamp(lt / D), .5, .76);
  let g2 = X.createLinearGradient(0, 0, 0, H); g2.addColorStop(0, 'rgba(1,6,22,.6)'); g2.addColorStop(.4, 'rgba(1,6,22,.1)'); g2.addColorStop(1, 'rgba(1,6,22,.7)'); X.fillStyle = g2; X.fillRect(0, 0, W, H);
  const eb = S(lt - .1, 160);
  X.save(); X.globalAlpha = eb; X.fillStyle = rgba(C2.teal); X.fillRect(MX, 133, 44 * eb, 2); X.restore();
  mono('WHAT THE CENSUS FOUND', MX + 62, 142, 20, C2.teal, eb);
  line('Where the money leaks.', { x: MX, y: 262, size: 92, wt: 700, ls: -3, col: C2.white, tin: .15, stag: .014 });
  const cw = 500, ch = 520, gap = 60, y0 = 400, x0 = (W - (cw * 3 + gap * 2)) / 2, lab = [170, 190, 235];
  // 1: eleven of thirteen floors with no bank on site
  const t1 = .7, p1 = S(lt - t1, 110);
  if (glassCard(x0, y0, cw, ch, p1)) {
    mono('FLOORS ASKED', x0 + 44, y0 + 62, 17, lab, p1);
    for (let i = 0; i < 13; i++) {
      const cx = x0 + 44 + (i % 5) * 86, cy = y0 + 100 + Math.floor(i / 5) * 86, q = S(lt - (t1 + .15 + i * .05), 160); if (q < .004) continue;
      X.save(); X.globalAlpha = q * p1;
      if (i < 11) { X.strokeStyle = 'rgba(160,190,255,.5)'; X.lineWidth = 1.5; X.setLineDash([5, 4]); rr(cx, cy, 66, 66, 14); X.stroke(); X.setLineDash([]); }
      else { X.shadowColor = 'rgba(86,132,255,.7)'; X.shadowBlur = 24; const gg = X.createLinearGradient(0, cy, 0, cy + 66); gg.addColorStop(0, '#9db8ff'); gg.addColorStop(1, '#2c5bf6'); X.fillStyle = gg; rr(cx, cy, 66, 66, 14); X.fill(); }
      X.restore();
    }
    count(0, 11, { x: x0 + 44, y: y0 + 430, size: 110, t0: t1 + .3, dur: .7, wt: 700, col: C2.white, tin: t1 + .2, post: 'of 13', postSize: 34 });
    mono('FLOORS WITH NO BANK ON SITE', x0 + 48, y0 + 474, 17, lab, S(lt - t1 - .5, 160));
  }
  // 2: cash only in Al Shifa
  const t2 = 2.0, p2 = S(lt - t2, 110);
  if (glassCard(x0 + cw + gap, y0, cw, ch, p2)) {
    const cx = x0 + cw + gap + cw / 2, cy = y0 + 225, r = 140, rp = eio(clamp((lt - t2 - .2) / 1.3)) * 194 / 210;
    mono('AL SHIFA FLOORS', x0 + cw + gap + 44, y0 + 62, 17, lab, p2);
    X.save(); X.globalAlpha = p2; X.lineCap = 'round';
    X.strokeStyle = 'rgba(160,190,255,.14)'; X.lineWidth = 16; X.beginPath(); X.arc(cx, cy, r, 0, 7); X.stroke();
    X.shadowColor = 'rgba(86,132,255,.8)'; X.shadowBlur = 26; const rg = X.createLinearGradient(cx - r, cy - r, cx + r, cy + r); rg.addColorStop(0, '#c9d8ff'); rg.addColorStop(1, '#2c5bf6');
    X.strokeStyle = rg; X.lineWidth = 16; X.beginPath(); X.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + rp * Math.PI * 2); X.stroke(); X.restore();
    count(0, 194, { x: cx, y: cy + 30, size: 92, t0: t2 + .2, dur: 1.3, wt: 700, col: C2.white, align: 'center', tin: t2 + .1 });
    mono('OF 210', cx, cy + 70, 17, lab, p2, 'center');
    line('sell for cash only', { x: x0 + cw + gap + 44, y: y0 + 450, size: 40, wt: 700, col: C2.teal, tin: t2 + .8, stag: .01 });
  }
  // 3: what walks away
  const t3 = 3.4, p3 = S(lt - t3, 110);
  if (glassCard(x0 + (cw + gap) * 2, y0, cw, ch, p3)) {
    const xx = x0 + (cw + gap) * 2 + 44;
    mono('FROM JUST 24 FLOORS', xx, y0 + 62, 17, lab, p3);
    count(0, 1.4, { x: xx, y: y0 + 270, size: 150, t0: t3 + .2, dur: 1.1, wt: 700, col: C2.white, tin: t3 + .1, fmt: v => v.toFixed(1), pre: 'SAR', post: 'B', postSize: 80 });
    line('a year walks away,', { x: xx, y: y0 + 380, size: 40, wt: 700, col: C2.teal, tin: t3 + .7, stag: .01 });
    line('for want of a loan.', { x: xx, y: y0 + 432, size: 40, wt: 700, col: C2.teal, tin: t3 + .85, stag: .01 });
  }
};
BG2.RLEAK = () => NOIR;

/* ---------- RCLOSE: the founder's line, then a new end card ---------- */
// flowing light ribbons in the brand blues (an echo of the key visual's silk), drawn live so they move
function ribbons(lt, a) {
  X.save(); X.globalCompositeOperation = 'lighter';
  const R = [[.62, 150, [44, 91, 246], .16, .9], [.5, 90, [86, 132, 255], .14, 1.3], [.72, 60, [160, 190, 255], .10, 1.7], [.42, 200, [20, 50, 160], .18, .6], [.58, 30, [210, 225, 255], .12, 2.1]];
  R.forEach(([yb, w, c, al, sp], i) => {
    const ph = lt * .35 * sp + i * 1.7, y0 = H * yb;
    const gr = X.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(.35, rgba(c, al * a)); gr.addColorStop(.7, rgba(c, al * a * .8)); gr.addColorStop(1, rgba(c, 0));
    X.strokeStyle = gr; X.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      X.lineWidth = w * (1 - k * .3); X.globalAlpha = .55 + k * .2;
      X.beginPath(); X.moveTo(-200, y0 + Math.sin(ph) * 120);
      X.bezierCurveTo(W * .3, y0 - 260 + Math.sin(ph + 1.1) * 140, W * .62, y0 + 280 + Math.cos(ph * .8) * 150, W + 200, y0 - 80 + Math.sin(ph + 2.2) * 120);
      X.stroke();
    }
  });
  X.restore();
}
SC2.RCLOSE = (lt, D) => {
  const tc = 3.4, u = lt - tc;
  const bg = X.createRadialGradient(W / 2, H * .46, 0, W / 2, H * .5, W * .7); bg.addColorStop(0, '#0a1b52'); bg.addColorStop(1, '#010416');
  X.fillStyle = bg; X.fillRect(0, 0, W, H);
  if (lt < tc + .5) {   // the founder's line
    const fo = 1 - sm(tc - .2, tc + .3, lt);
    X.save(); X.globalAlpha = fo;
    const eb = S(lt - .1, 160); X.fillStyle = rgba(C2.teal); X.fillRect(W / 2 - 22 * eb, 390, 44 * eb, 2);
    mono('OUR FOUNDER', W / 2, 360, 20, C2.teal, eb, 'center');
    line('We are not here to map a market.', { x: W / 2, y: 530, size: 92, wt: 700, ls: -3, col: C2.white, align: 'center', tin: .25, stag: .012 });
    line('We are here to move it.', { x: W / 2, y: 650, size: 92, wt: 700, ls: -3, col: C2.teal, align: 'center', tin: 1.35, stag: .014 });
    X.restore();
  }
  if (u > -.3) {   // the end card
    const ra = S(u + .3, 40);
    ribbons(lt, ra);
    const vg = X.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .95); vg.addColorStop(0, 'rgba(1,4,22,0)'); vg.addColorStop(1, 'rgba(1,4,22,.8)'); X.fillStyle = vg; X.fillRect(0, 0, W, H);
    const halo = X.createRadialGradient(W / 2 - 240, H / 2 - 30, 0, W / 2 - 240, H / 2 - 30, 420); halo.addColorStop(0, `rgba(86,132,255,${.35 * S(u - .1, 60)})`); halo.addColorStop(1, 'rgba(86,132,255,0)'); X.fillStyle = halo; X.fillRect(0, 0, W, H);
    mark(W / 2, H / 2 - 50, .78, C2.white, 1, tc + .15);
    // one light sweep across the mark
    const sx = lerp(-500, W + 500, eio(clamp((u - .7) / 1.1)));
    X.save(); X.globalCompositeOperation = 'lighter'; const sg = X.createLinearGradient(sx - 160, 0, sx + 160, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(200,215,255,.22)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    X.fillStyle = sg; X.beginPath(); X.moveTo(sx - 260, H * .2); X.lineTo(sx + 60, H * .2); X.lineTo(sx + 260, H * .72); X.lineTo(sx - 60, H * .72); X.closePath(); X.fill(); X.restore();
    const lw = 560 * eio(clamp((u - .9) / .6)); const lg = X.createLinearGradient(W / 2 - lw / 2, 0, W / 2 + lw / 2, 0); lg.addColorStop(0, 'rgba(160,190,255,0)'); lg.addColorStop(.5, 'rgba(160,190,255,.85)'); lg.addColorStop(1, 'rgba(160,190,255,0)');
    X.fillStyle = lg; X.fillRect(W / 2 - lw / 2, H / 2 + 112, lw, 1.5);
    line('From the showroom floor to KAFD.', { x: W / 2, y: H / 2 + 190, size: 46, wt: 700, ls: -1, col: C2.white, align: 'center', tin: tc + 1.1, stag: .012 });
    mono('520 SHOWROOMS MAPPED  ·  18 LENDERS AT THE TABLE  ·  20 SUB-DEALERS SIGNED', W / 2, H / 2 + 250, 18, [170, 190, 235], S(u - 1.7, 140), 'center');
  }
  const out = sm(D - .7, D, lt); if (out > 0) { X.fillStyle = `rgba(0,0,0,${out})`; X.fillRect(0, 0, W, H); }
};
BG2.RCLOSE = () => NOIR;
