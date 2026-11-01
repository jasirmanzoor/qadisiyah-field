import { chromium } from '/home/user/qadisiyah-field/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2];
const SECS = [
  ['open',   [[2, '.kbar a, .kbar button', 'btn-hero', 'Data room'], [2, '.kbar a, .kbar button', 'chip-btn', 'Chapters'], [2, '.sc--open .tele', 'chip-hero'], [2, '.sc--open .kick', 'chip-hero']]],
  ['ground', [[2, '.sc--ground .folio__tab', 'chip2'], [2, '.sc--ground .kick', 'chip2'], [1, '.sc--ground .folio__card', 'photo2']]],
  ['glance', [[2, '.sc--glance .mc', 'chip'], [1, '.sc--glance .kp', 'card']]],
  ['adv',    [[1, '.sc--adv .adv__tot', 'card'], [1, '.sc--adv .adv__d', 'card'], [1, '.sc--adv .adv__moat', 'card']]],
  ['size',   []],
  ['vision', [[2, '.sc--vision .vis__q', 'quote'], [1, '.sc--vision .vis__wall img', 'photo']]],
  ['close',  [[2, '.sc--close .btn', 'btn'], [1, '.sc--close .close__strip figure', 'photo']]],
];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto('http://127.0.0.1:8114/index.html', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
const go = id => p.evaluate((id) => { const c = window.__deck.cues(); const u = [...new Set(c.map(x => x.id))]; const bs = c.filter(x => x.id === id).length; window.__deck.go(u.indexOf(id), bs - 1, 'jump'); window.__deck.setPlay(false); }, id);
// visit every chapter once so lazy images and reveal animations finish
for (const [id] of SECS) { await go(id); await p.waitForTimeout(900); }
const meta = { secH: 900, w: 1440, sections: [], pieces: [] };
for (let si = 0; si < SECS.length; si++) {
  const [id, specs] = SECS[si];
  await go(id); await p.waitForTimeout(3200);
  const found = await p.evaluate(({ specs, si, id }) => {
    document.querySelectorAll('[data-layer]').forEach(e => { e.removeAttribute('data-layer'); e.style.visibility = ''; });
    const kbar = document.querySelector('.kbar'); kbar.style.visibility = id === 'open' ? '' : 'hidden';
    const r = []; let n = 0;
    for (const [lvl, sel, kind, txt] of specs) {
      document.querySelectorAll(sel).forEach(e => {
        if (txt && !e.textContent.includes(txt)) return;
        const bb = e.getBoundingClientRect(), cs = getComputedStyle(e);
        if (bb.width < 8 || bb.height < 8 || cs.visibility === 'hidden') return;
        if (bb.bottom < 0 || bb.top > 900 || bb.right < 0 || bb.left > 1440) return;
        if (kind === 'photo' && (bb.top < -40 || bb.bottom > 940)) return;
        const name = `${id}-${n++}`; e.setAttribute('data-layer', name);
        r.push({ name, sec: si, lvl, kind, x: bb.x, y: bb.y, w: bb.width, h: bb.height, rad: parseFloat(cs.borderTopLeftRadius) || 0 });
      });
    }
    return r;
  }, { specs, si, id });
  // level 2 crops from the full frame, level 1 with level 2 hidden, base with all hidden
  for (const lvl of [2, 1, 0]) {
    if (lvl < 2) await p.evaluate((l) => document.querySelectorAll('[data-layer]').forEach(e => { const f = window.__found || {}; }), lvl);
    const hide = found.filter(f => f.lvl > lvl).map(f => f.name);
    await p.evaluate((hide) => hide.forEach(n => { const e = document.querySelector(`[data-layer="${n}"]`); if (e) e.style.visibility = 'hidden'; }), hide);
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${OUT}/page/${id}-L${lvl}.png` });
  }
  meta.sections.push({ id, y: si * 900 });
  found.forEach(f => meta.pieces.push(f));
  console.log(id, found.length, found.map(f => f.kind).join(','));
}
fs.writeFileSync(`${OUT}/layers.json`, JSON.stringify(meta, null, 1));
await b.close();
