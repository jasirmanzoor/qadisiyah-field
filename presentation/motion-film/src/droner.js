'use strict';
// The reel's drone flight, timed in reel seconds (about 35 s): a low crane and orbit round the KAFD towers, a high transit,
// a bird's-eye look at Al Qadisiyah, a dive into a low pass over the showroom rows, a pull-up as the showrooms rise as light
// columns, then the same for Al Shifa. Same renderer and data as drone.js (real imagery, real footprints, real pins).
const FLYR = [
  [0, [-1150, 70, 600], [100, 160, 0]],
  [2.7, [-950, 150, -600], [100, 180, 0]],
  [5.4, [150, 240, -1150], [60, 170, 0]],
  [8, [1250, 480, -900], [5200, 150, -2700]],
  [11, [11000, 1500, -5200], [18200, 0, -6700]],
  [13, [16900, 1100, -5900], [18300, 0, -6800]],
  [15, [18050, 900, -6350], [18200, 0, -6900]],
  [17, [17600, 140, -6300], [17755, 0, -6470]],
  [20, [17930, 72, -6660], [18085, 0, -6830]],
  [21.6, [18350, 420, -6250], [18100, 0, -6800]],
  [23, [18550, 820, -5650], [18100, 0, -6800]],
  [24.6, [12000, 5200, 8500], [4500, 0, 24000]],
  [26.2, [6600, 1500, 21300], [4500, 0, 24000]],
  [27.8, [4700, 1100, 23350], [4500, 0, 23950]],
  [29.6, [4000, 140, 23500], [4165, 0, 23665]],
  [32, [4260, 72, 23760], [4425, 0, 23925]],
  [33.4, [4800, 420, 24400], [4450, 0, 23950]],
  [35, [5050, 850, 24950], [4450, 0, 23950]],
];
const FLYR_END = FLYR[FLYR.length - 1][0];
function flyR(k, t) {
  const K = FLYR, n = K.length; t = clamp(t, 0, FLYR_END); let i = 0; while (i < n - 2 && t > K[i + 1][0]) i++;
  const seg = (j, d) => (K[j + 1][k][d] - K[j][k][d]) / (K[j + 1][0] - K[j][0]);
  const vel = j => K[j][k].map((x, d) => { if (j === 0) return seg(0, d) * .35; if (j === n - 1) return seg(n - 2, d) * .35; const a = seg(j - 1, d), b = seg(j, d); return a * b <= 0 ? 0 : 2 / (1 / a + 1 / b); });
  const a = K[i], b = K[i + 1], h = b[0] - a[0], u = clamp((t - a[0]) / h), va = vel(i), vb = vel(i + 1);
  const h00 = 2 * u ** 3 - 3 * u * u + 1, h10 = u ** 3 - 2 * u * u + u, h01 = -2 * u ** 3 + 3 * u * u, h11 = u ** 3 - u * u;
  return a[k].map((x, d) => h00 * x + h10 * h * va[d] + h01 * b[k][d] + h11 * h * vb[d]);
}
const flyCamR = t => { const eye = flyR(1, t); eye[1] = Math.max(eye[1], 55); return { eye, at: flyR(2, t), up: [0, 1, 0], fov: .92, fogD: 30000 }; };
SC2.RDRONE = (lt, D, L) => {
  if (!DR.ready) return;
  const tf = lt * FLYR_END / D, cam = flyCamR(tf), M = DR.render(cam);
  const sky = X.createLinearGradient(0, 0, 0, H * .6); sky.addColorStop(0, '#2f56b8'); sky.addColorStop(.55, '#9db4dc'); sky.addColorStop(1, '#e6e2da'); X.fillStyle = sky; X.fillRect(0, 0, W, H);
  X.drawImage(DR.canvas, 0, 0, W, H);
  const vg = X.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H); vg.addColorStop(0, 'rgba(3,10,30,0)'); vg.addColorStop(1, 'rgba(3,10,30,.55)'); X.fillStyle = vg; X.fillRect(0, 0, W, H);
  // the graphic layer: showrooms rise as light columns once the drone has flown the district
  const riseQ = sm(20.4, 22.6, tf), riseS = sm(32.2, 34.2, tf);
  X.save(); X.globalCompositeOperation = 'lighter'; X.lineCap = 'round';
  for (const [x, z, dist, inv] of DPINS) {
    const r = dist ? riseS : riseQ; if (r <= .01) continue;
    const hh = (40 + Math.sqrt(Math.max(inv, 4)) * 14) * r;
    const p0 = DR.project(M, [x, 0, z]), p1 = DR.project(M, [x, hh, z]); if (!p0 || !p1) continue;
    const col = dist ? [170, 200, 255] : [86, 132, 255], w = Math.max(1.2, 2600 / p0[2]);
    X.strokeStyle = rgba(col, .25); X.lineWidth = w * 4; X.beginPath(); X.moveTo(p0[0], p0[1]); X.lineTo(p1[0], p1[1]); X.stroke();
    X.strokeStyle = rgba(col, .95); X.lineWidth = w; X.beginPath(); X.moveTo(p0[0], p0[1]); X.lineTo(p1[0], p1[1]); X.stroke();
    X.fillStyle = 'rgba(255,255,255,.9)'; X.beginPath(); X.arc(p1[0], p1[1], w * 1.1, 0, 7); X.fill();
  }
  X.restore();
  const tag = (txt, p, a) => { const s = DR.project(M, p); if (!s || a < .01) return; X.save(); X.globalAlpha = a; X.strokeStyle = 'rgba(255,255,255,.8)'; X.lineWidth = 1.5; X.beginPath(); X.moveTo(s[0], s[1]); X.lineTo(s[0], s[1] - 70); X.stroke(); X.fillStyle = '#fff'; X.beginPath(); X.arc(s[0], s[1], 5, 0, 7); X.fill(); X.font = `700 22px ${FAM.m}`; X.letterSpacing = '3px'; X.fillStyle = 'rgba(3,10,30,.7)'; const w = X.measureText(txt).width; X.fillRect(s[0] - 12, s[1] - 112, w + 24, 36); X.fillStyle = '#fff'; X.fillText(txt, s[0], s[1] - 86); X.letterSpacing = '0px'; X.restore(); };
  tag('KAFD', [112, 210, 14], sm(.4, 1.2, tf) * (1 - sm(7.2, 8.2, tf)));
  tag('AL QADISIYAH · 309 SHOWROOMS', [18100, 0, -6800], sm(13.4, 14.2, tf) * (1 - sm(16.6, 17.2, tf)) + sm(21.4, 22.2, tf) * (1 - sm(23.4, 24.2, tf)));
  tag('AL SHIFA · 211 SHOWROOMS', [4450, 0, 23950], sm(27.4, 28.2, tf) * (1 - sm(29.2, 29.8, tf)) + sm(33.2, 34, tf));
  // titles
  const sh = X.createLinearGradient(0, 0, 0, 440); sh.addColorStop(0, 'rgba(3,10,30,.6)'); sh.addColorStop(1, 'rgba(3,10,30,0)'); X.fillStyle = sh; X.fillRect(0, 0, W, 440);
  const T = (a, b, t0, t1) => { const k = D / FLYR_END; line(a, { x: W / 2, y: 236, size: 96, wt: 900, ls: -3, col: C2.white, align: 'center', tin: t0 * k, tout: (t0 + (t1 - t0) * .5) * k, stag: .02 }); line(b, { x: W / 2, y: 236, size: 62, wt: 900, ls: -1, col: C2.white, align: 'center', tin: (t0 + (t1 - t0) * .5) * k + .45, tout: t1 * k, stag: .014 }); };
  T('SO WE WALKED IT.', '520 SHOWROOMS. DOOR TO DOOR.', .5, 7.4);
  T('AL QADISIYAH', '19.7 KM EAST OF KAFD · 309 SHOWROOMS', 12.4, 19.6);
  T('AL SHIFA', '24 KM SOUTH · 211 SHOWROOMS', 26.6, 31.6);
  // flight HUD
  const ep = flyR(1, Math.max(0, tf - .05)), hd = (Math.atan2(cam.at[0] - cam.eye[0], -(cam.at[2] - cam.eye[2])) * 180 / Math.PI + 360) % 360;
  hud(lt, 'DRONE · KAFD → AL QADISIYAH → AL SHIFA');
  mono(`ALT ${String(Math.max(0, Math.round(cam.eye[1]))).padStart(4, '0')} M   HDG ${String(Math.round(hd)).padStart(3, '0')}°`, 76, H - 70, 18, [220, 230, 255], .9);
  const leg = tf < 23 ? ['KAFD → AL QADISIYAH', 19.7 * sm(8, 14, tf)] : ['AL QADISIYAH → AL SHIFA', 34.1 * sm(23, 28, tf)];
  mono(`${leg[0]}  ${leg[1].toFixed(1)} KM`, 76, H - 100, 18, C2.teal, .95);
};
BG2.RDRONE = () => NOIR;
