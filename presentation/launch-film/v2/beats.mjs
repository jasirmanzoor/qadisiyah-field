import { chromium } from 'playwright';
import fs from 'fs';
const out = process.argv[2], off = +(process.argv[3] ?? .25), list = process.argv[4];
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + process.cwd() + '/film.html'); await p.evaluate(() => window.ready);
const times = list ? list.split(',').map(Number) : Array.from({ length: 30 }, (_, k) => k * .5 + off);
for (const t of times) { await p.evaluate(t => window.seek(t), t); await p.screenshot({ path: `${out}/t${t.toFixed(3)}.jpg`, quality: 80 }); }
console.log('errors', errs);
await b.close();
