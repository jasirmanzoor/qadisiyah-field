'use strict';
// The drone flight (one continuous shot across three narrated scenes in Part B, a shorter cut in the teaser)
// and the lending-partners section (Part A and Part B).

/* ---------- the flight ---------- */
// the flight clock: Part B's three scenes map onto flight time 0-22, 22-30 and 30-50, so the shot never jumps
function flightText(lt, L, a, b) {
  const sh = X.createLinearGradient(0, 0, 0, 440); sh.addColorStop(0, 'rgba(3,10,30,.6)'); sh.addColorStop(1, 'rgba(3,10,30,0)'); X.fillStyle = sh; X.fillRect(0, 0, W, 440);
  const t0 = ln2(L, 0), d = ldur(L, 0);
  line(a, { x: W / 2, y: 236, size: 96, wt: 900, ls: -3, col: C2.white, align: 'center', tin: t0, tout: b ? t0 + d * .52 : t0 + d + .9, stag: .02 });
  if (b) line(b, { x: W / 2, y: 236, size: 62, wt: 900, ls: -1, col: C2.white, align: 'center', tin: t0 + d * .52, tout: t0 + d + .9, stag: .014 });
}
SC2.B2a = (lt, D, L) => { droneShot(lt * 22 / D); flightText(lt, L, 'SO WE WALKED IT.', 'DOOR TO DOOR. BY DAY AND AFTER DARK.'); };
SC2.B2b = (lt, D, L) => { droneShot(22 + lt * 8 / D); flightText(lt, L, 'AL QADISIYAH', '19.7 KM EAST OF KAFD · 309 SHOWROOMS'); };
SC2.B2c = (lt, D, L) => { droneShot(30 + lt * 20 / D); flightText(lt, L, 'AL SHIFA', '24 KM SOUTH · 211 SHOWROOMS'); };
BG2.B2a = () => Object.assign({}, NOIR, { cont: true });
BG2.B2b = () => Object.assign({}, NOIR, { cont: true });
BG2.B2c = () => Object.assign({}, NOIR, { cont: true });
// teaser: from the KAFD skyline to the arrival over Al Qadisiyah, at a gentle 1.5x
SC2.T2 = (lt, D, L) => { droneShot(4 + lt * 22 / D); flightText(lt, L, 'SO WE WALKED IT.', '520 SHOWROOMS. DOOR TO DOOR.'); };
BG2.T2 = () => NOIR;

/* ---------- partners: the banks and finance companies partnering with AutoLink ---------- */
const BANKS = ['albilad', 'alinma', 'anb', 'alrajhi', 'snb', 'riyad', 'enbd'];
const FINCOS = ['raya', 'nama', 'tarabut', 'aljabr', 'taajeer', 'nfh', 'tamam', 'tamweel', 'alj', 'yanal', 'alyusr'];
function logoTile(k, x, y, w, h, p, spot) {
  if (p < .004) return;
  const f = clamp(p * 1.4), sx = Math.abs(Math.cos(Math.PI * .5 * (1 - eo(f))));   // a quarter turn in from edge-on
  X.save(); X.globalAlpha = Math.min(1, p * 2); X.translate(x + w / 2, y + h / 2 + (1 - p) * 50); X.scale(Math.max(.02, sx), 1);
  X.shadowColor = 'rgba(20,40,90,.14)'; X.shadowBlur = 34; X.shadowOffsetY = 16; X.fillStyle = '#fff'; rr(-w / 2, -h / 2, w, h, 22); X.fill(); X.shadowColor = 'transparent';
  X.strokeStyle = 'rgba(44,91,246,.10)'; X.lineWidth = 1.5; X.stroke();
  const im = IMG['p-' + k];
  if (!im) {   // a missing logo falls back to a wordmark
    X.fillStyle = '#e03a33'; rr(-w * .36, -h * .2, 10, h * .4, 5); X.fill();
    X.font = `800 30px ${FAM.s}`; X.fillStyle = rgba(C2.navy); X.textAlign = 'left'; X.fillText(k, -w * .36 + 24, -2); X.font = `500 22px ${FAM.s}`; X.fillStyle = rgba(C2.grey); X.fillText('Finance', -w * .36 + 24, 26); X.textAlign = 'left';
  } else {
    const pad = 20, bw = w - pad * 2, bh = h - pad * 2, s = Math.min(bw / im.width, bh / im.height);
    X.drawImage(im, -im.width * s / 2, -im.height * s / 2, im.width * s, im.height * s);
  }
  // SpotlightCard: a soft light passes across the tiles
  if (spot > 0) { const g2 = X.createRadialGradient(0, 0, 0, 0, 0, w * .8); g2.addColorStop(0, `rgba(86,132,255,${.16 * spot})`); g2.addColorStop(1, 'rgba(86,132,255,0)'); X.fillStyle = g2; rr(-w / 2, -h / 2, w, h, 22); X.fill(); }
  X.restore();
}
function partners(lt, D, L, head, sub) {
  studioFloor();
  const t0 = ln2(L, 0), tf = L.length > 1 ? ln2(L, 1) : t0 + ldur(L, 0) * .45;
  mono('PARTNERING WITH AUTOLINK', MX + 4, 150, 22, C2.blue, S(lt - .1, 200));
  line(head, { x: MX, y: 240, size: 80, wt: 900, ls: -3, col: C2.navy, tin: t0, stag: .012 });
  if (sub) line(sub, { x: MX, y: 300, size: 30, wt: 500, col: C2.grey, tin: t0 + .4, stag: .005 });
  const tw = 214, th = 120, gap = 18;
  // banks: one row of seven
  mono('BANKS', MX + 4, 384, 20, C2.grey, S(lt - (t0 + .2), 200));
  const bx0 = (W - (BANKS.length * tw + (BANKS.length - 1) * gap)) / 2;
  const sweep = lerp(-300, W + 300, clamp((lt - (D - 3.2)) / 2.6));
  const spot = (x) => Math.exp(-Math.pow((x - sweep) / 260, 2));
  BANKS.forEach((k, i) => { const x = bx0 + i * (tw + gap); logoTile(k, x, 404, tw, th, S(lt - (t0 + .25 + Math.abs(i - 3) * .08), 120), spot(x + tw / 2)); });
  // finance companies: six and five
  mono('FINANCE COMPANIES', MX + 4, 594, 20, C2.grey, S(lt - (tf - .1), 200));
  FINCOS.forEach((k, i) => {
    const row = i < 6 ? 0 : 1, n = row ? 5 : 6, j = row ? i - 6 : i;
    const fx0 = (W - (n * tw + (n - 1) * gap)) / 2, x = fx0 + j * (tw + gap), y = 614 + row * (th + gap);
    logoTile(k, x, y, tw, th, S(lt - (tf + .05 + i * .06), 120), spot(x + tw / 2));
  });
  mono('BANKS AND FINANCE COMPANIES · PARTNERSHIPS IN PROGRESS', W / 2, 1000, 18, C2.grey, S(lt - (tf + 1), 200), 'center');
}
SC2.A4b = (lt, D, L) => partners(lt, D, L, 'Behind every request.', 'Saudi Arabia’s leading banks and finance companies.');
SC2.B7b = (lt, D, L) => partners(lt, D, L, 'The lenders are coming with us.', '');
BG2.A4b = () => STUDIO;
BG2.B7b = () => STUDIO;
