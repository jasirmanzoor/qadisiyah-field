'use strict';
// React Bits components, re-made as pure functions of time for a frame-exact render.
// Each mirrors its original's look; the originals' timers, hover and scroll triggers become times on the film's timeline.

// TrueFocus: corner brackets glide from word to word; the other words sit blurred and dim
function trueFocus(words, o) {
  const { x, y, size = 84, wt = 900, col = C2.white, bracket = C2.teal, times, align = 'center', tin = -9, tout = 1e9, gap = size * .28, blurAmt = 7, dim = .35 } = o;
  const vis = S(lt - tin, 200) * (1 - S(lt - tout, 220)); if (vis < .004) return;
  font(size, wt); X.letterSpacing = (-size * .03) + 'px';
  const ws = words.map(w => X.measureText(w).width), tot = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
  let x0 = align === 'center' ? x - tot / 2 : x; const xs = []; ws.forEach(w => { xs.push(x0); x0 += w + gap; });
  // which word is in focus, and how far the brackets have travelled to it
  let k = 0; for (let i = 0; i < times.length; i++) if (lt >= times[i]) k = i;
  const mv = eio(clamp((lt - times[k]) / .45)), from = Math.max(0, k - 1);
  const box = i => [xs[i] - 14, y - size * .82, ws[i] + 28, size * 1.05];
  const A = box(from), B = box(k), bx = lerp(A[0], B[0], k ? mv : 1), by = lerp(A[1], B[1], k ? mv : 1), bw = lerp(A[2], B[2], k ? mv : 1), bh = lerp(A[3], B[3], k ? mv : 1);
  words.forEach((w, i) => {
    const f = i === k ? (k ? mv : 1) : i === from && k ? 1 - mv : 0;
    const bl = blurAmt * (1 - f), al = vis * lerp(dim, 1, f);
    X.save(); X.fillStyle = rgba(col);
    const passes = bl > .6 ? RING : ONE;
    for (const [ox, oy, wa] of passes) { X.globalAlpha = al * wa; X.fillText(w, xs[i] + ox * bl, y + oy * bl); }
    X.restore();
  });
  X.letterSpacing = '0px';
  X.save(); X.globalAlpha = vis; X.strokeStyle = rgba(bracket); X.lineWidth = 5; X.lineCap = 'square'; const L = 26;
  [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]].forEach(([cx, cy, sx, sy]) => { X.beginPath(); X.moveTo(cx + sx * L, cy); X.lineTo(cx, cy); X.lineTo(cx, cy + sy * L); X.stroke(); });
  X.restore();
}
// SplitFlapText: each character is a flap tile that riffles through the charset and settles, left to right
function splitFlap(str, o) {
  const { x, y, size = 150, t0 = 0, per = .09, flips = 9, flipT = .055, col = C2.white, tile = [18, 22, 26], charset = '0123456789', a = 1 } = o;
  const cw = size * .72, ch = size * 1.12, gap = size * .08;
  X.save(); X.globalAlpha = a;
  for (let i = 0; i < str.length; i++) {
    const cx = x + i * (cw + gap), target = str[i];
    const tSettle = t0 + i * per + flips * flipT, n = Math.max(0, Math.floor((lt - (t0 + i * per)) / flipT));
    const settled = lt >= tSettle;
    const cur = settled ? target : charset[(n + i * 3) % charset.length], nxt = settled ? target : charset[(n + 1 + i * 3) % charset.length];
    const ph = settled ? 1 : ((lt - (t0 + i * per)) / flipT) % 1;
    X.fillStyle = rgba(tile); rr(cx, y - ch, cw, ch, size * .08); X.fill();
    X.fillStyle = 'rgba(255,255,255,.04)'; rr(cx, y - ch, cw, ch / 2, size * .08); X.fill();
    font(size * .86, 700, 'm'); X.textAlign = 'center'; X.textBaseline = 'middle';
    X.save(); rr(cx, y - ch, cw, ch, size * .08); X.clip();
    X.fillStyle = rgba(col); X.fillText(lt < t0 ? '0' : cur, cx + cw / 2, y - ch / 2 + size * .04);
    if (!settled && lt >= t0) { // the falling flap
      const s = Math.cos(ph * Math.PI); X.save(); X.translate(cx + cw / 2, y - ch / 2); X.scale(1, Math.abs(s)); X.fillStyle = rgba(mixc(tile, [0, 0, 0], .3 * (1 - Math.abs(s)))); X.fillRect(-cw / 2, s > 0 ? -ch / 2 : 0, cw, ch / 2); X.restore();
    }
    X.restore();
    X.fillStyle = 'rgba(0,0,0,.55)'; X.fillRect(cx, y - ch / 2 - 1.5, cw, 3);
    X.textAlign = 'left'; X.textBaseline = 'alphabetic';
  }
  X.restore();
}
// ScrollVelocity: a giant line of type running across the frame; outline or solid
function marquee(text, o) {
  const { y, size = 160, speed = 220, dir = 1, col = C2.ink, outline = false, a = 1, wt = 900, t0 = 0 } = o;
  font(size, wt); X.letterSpacing = (-size * .03) + 'px';
  const unit = text + '  ·  ', w = X.measureText(unit).width;
  let off = ((lt - t0) * speed * dir) % w; if (off > 0) off -= w;
  X.save(); X.globalAlpha = a;
  for (let xx = off - w; xx < W + w; xx += w) { if (outline) { X.lineWidth = 2.5; X.strokeStyle = rgba(col); X.strokeText(unit, xx, y); } else { X.fillStyle = rgba(col); X.fillText(unit, xx, y); } }
  X.restore(); X.letterSpacing = '0px';
}
// PixelTransition: an image resolves cell by cell in a Bayer dither order
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function pixelIn(img, rx, ry, rw, rh, p, cell = 40, r = 0) {
  if (!img || p <= 0) return;
  const ar = img.width / img.height, fr = rw / rh; const sw = ar > fr ? img.height * fr : img.width, sh = ar > fr ? img.height : img.width / fr; const sx0 = (img.width - sw) / 2, sy0 = (img.height - sh) / 2;
  const nx = Math.ceil(rw / cell), ny = Math.ceil(rh / cell);
  X.save(); if (r) { rr(rx, ry, rw, rh, r); X.clip(); }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const th = (BAYER[(j % 4) * 4 + (i % 4)] + .5) / 16 * .7 + (i / nx) * .3; if (p < th) continue;
    const cx = rx + i * cell, cy = ry + j * cell, cwid = Math.min(cell, rx + rw - cx), chei = Math.min(cell, ry + rh - cy);
    X.drawImage(img, sx0 + (i * cell / rw) * sw, sy0 + (j * cell / rh) * sh, cwid / rw * sw, chei / rh * sh, cx, cy, cwid + .5, chei + .5);
  }
  X.restore();
}
// TargetCursor: a dot with four spinning corner brackets that snap onto a target, and a ClickSpark when it clicks
function targetCursor(path, o) {
  const { col = C2.ink } = o;   // path: [{t, x, y, lock:[x,y,w,h]|null, click:bool}]
  // the cursor travels into each point over the .6 s before its time, then rests there (locked if the point has a target)
  let i = path.findIndex(p => lt < p.t); if (i < 0) i = path.length;
  const prev = path[Math.max(0, i - 1)], next = path[Math.min(path.length - 1, i)];
  const mv = i < path.length && i > 0 ? eio(clamp((lt - (next.t - .6)) / .6)) : 0;
  const x = lerp(prev.x, next.x, mv), y = lerp(prev.y, next.y, mv);
  const lock = mv < .02 && prev.lock ? prev.lock : null, lp = lock ? S(lt - prev.t, 300) * (1 - sm(next.t - .7, next.t - .55, lt) * (next !== prev ? 1 : 0)) : 0;
  X.save(); X.strokeStyle = rgba(col); X.lineWidth = 3; X.lineCap = 'square';
  const spin = lt * 2.2, R = 22;
  for (let k = 0; k < 4; k++) {
    const ang = spin + k * Math.PI / 2, sx = [1, -1, 1, -1][k], sy = [1, 1, -1, -1][k];
    let cx = x + Math.cos(ang) * R * Math.SQRT1_2 * 1.4, cy = y + Math.sin(ang) * R * Math.SQRT1_2 * 1.4;
    if (lock) { const tx = [lock[0], lock[0] + lock[2], lock[0], lock[0] + lock[2]][k], ty = [lock[1], lock[1], lock[1] + lock[3], lock[1] + lock[3]][k]; cx = lerp(cx, tx, lp); cy = lerp(cy, ty, lp); }
    const dx = lock ? sx : Math.cos(ang), dy = lock ? sy : Math.sin(ang), L = 14;
    X.beginPath(); X.moveTo(cx + (lock ? dx * L * lp : 0), cy); X.lineTo(cx, cy); X.lineTo(cx, cy + (lock ? dy * L * lp : 0)); if (!lock) { X.moveTo(cx - 5, cy); X.lineTo(cx + 5, cy); } X.stroke();
  }
  X.fillStyle = rgba(col); X.beginPath(); X.arc(x, y, 5, 0, 7); X.fill(); X.restore();
  for (const p of path) if (p.click) clickSpark(p.x, p.y, p.t + .45, o.spark || C2.teal);
}
function clickSpark(x, y, t0, col) {
  const u = (lt - t0) / .42; if (u < 0 || u > 1) return;
  X.save(); X.strokeStyle = rgba(col, 1 - u); X.lineWidth = 3; X.lineCap = 'round';
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r0 = 14 + 40 * eo(u), r1 = r0 + 20 * (1 - u); X.beginPath(); X.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); X.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); X.stroke(); }
  X.restore();
}
// Counter: rolling digit wheels
function rollCounter(value, o) {
  const { x, y, size = 380, t0 = 0, col = C2.ink, wt = 900, stag = .08 } = o;
  const s = String(value); font(size, wt); const dw = X.measureText('0').width * .92;
  const vis = S(lt - (t0 - .25), 200); if (vis < .004) return;
  X.save(); X.globalAlpha *= vis; X.beginPath(); X.rect(x - 10, y - size * .82, dw * s.length + 20, size * .95); X.clip();
  X.fillStyle = rgba(col); X.textBaseline = 'alphabetic';
  for (let i = 0; i < s.length; i++) {
    const d = +s[i], turns = 1 + i, tgt = d + 10 * turns, pos = tgt * S(lt - (t0 + i * stag), 60);
    for (let k = Math.floor(pos) - 1; k <= Math.floor(pos) + 1; k++) { const yy = y + (k - pos) * size * .95; X.fillText(String(((k % 10) + 10) % 10), x + i * dw, yy); }
  }
  X.restore();
}
// ElectricBorder: a rounded frame whose edge crackles (noise-displaced, glowing)
function electricBorder(x, y, w, h, r, col, a = 1) {
  if (a < .01) return;
  const per = 2 * (w + h), n = 220, pts = [];
  for (let i = 0; i <= n; i++) {
    let d = per * i / n, px, py, nx, ny;
    if (d < w) { px = x + d; py = y; nx = 0; ny = -1; } else if (d < w + h) { px = x + w; py = y + d - w; nx = 1; ny = 0; } else if (d < 2 * w + h) { px = x + w - (d - w - h); py = y + h; nx = 0; ny = 1; } else { px = x; py = y + h - (d - 2 * w - h); nx = -1; ny = 0; }
    const f = Math.floor(lt * 24), nz = (rnd(i * 7 + f * 131) - .5) * 9 + Math.sin(i * .37 + lt * 9) * 3;
    pts.push([px + nx * nz, py + ny * nz]);
  }
  X.save(); X.globalAlpha = a; X.lineJoin = 'round';
  for (const [lw, al] of [[10, .12], [4, .35], [1.6, 1]]) { X.strokeStyle = rgba(col, al); X.lineWidth = lw; X.beginPath(); pts.forEach((p, i) => i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1])); X.stroke(); }
  X.restore();
}
// GridScan-style scan plane through the noir world: a bright band sweeping the floor grid
function scanPlane(cam, z, a = 1) {
  const pts = [[-1800, 0, z], [1800, 0, z], [1800, 520, z], [-1800, 520, z]].map(p => P3(cam, ...p));
  if (pts.some(p => !p)) return;
  X.save(); X.globalCompositeOperation = 'lighter'; X.globalAlpha = a;
  const gr = X.createLinearGradient(0, pts[0][1], 0, pts[3][1]); gr.addColorStop(0, rgba(C2.teal, .22)); gr.addColorStop(1, rgba(C2.teal, 0));
  X.fillStyle = gr; X.beginPath(); pts.forEach((p, i) => i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1])); X.closePath(); X.fill();
  X.strokeStyle = rgba(C2.teal, .9); X.lineWidth = 2; X.beginPath(); X.moveTo(pts[0][0], pts[0][1]); X.lineTo(pts[1][0], pts[1][1]); X.stroke();
  X.restore();
}
