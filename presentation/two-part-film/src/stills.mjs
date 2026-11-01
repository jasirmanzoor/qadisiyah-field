import { chromium } from '/home/user/qadisiyah-field/node_modules/playwright/index.mjs';
import fs from 'fs';
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://127.0.0.1:8116/tf/two.html');
await p.evaluate(() => window.ready);
const tl = JSON.parse(fs.readFileSync(new URL('./timeline.json', import.meta.url)));
const times = process.argv[3] ? process.argv.slice(3).map(Number) : tl.scenes.flatMap(s => [s.start + 1.6, (s.start + s.end) / 2, s.end - .9]);
for (const t of times) { await p.evaluate(t => window.seek(t), t); await p.screenshot({ path: `${out}/t${t.toFixed(2).padStart(7, '0')}.jpg`, quality: 70 }); }
console.log('frames', times.length, 'errors', errs.slice(0, 6));
await b.close();
