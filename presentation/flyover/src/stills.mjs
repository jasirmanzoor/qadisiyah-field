import { chromium } from '/home/user/qadisiyah-field/node_modules/playwright/index.mjs';
const out = process.argv[2], sub = +(process.argv[3] || 1), times = process.argv.slice(4).map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl'] });
const p = await b.newPage({ viewport: { width: 1440, height: 1152 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type()==='warning') errs.push(m.text()); });
await p.goto('http://127.0.0.1:8115/fly.html');
console.log(JSON.stringify(await p.evaluate(() => window.ready)));
await p.evaluate(n => window.setSub(n), sub);
for (const t of times) { const t0 = Date.now(); await p.evaluate(t => window.seek(t), t); await p.screenshot({ path: `${out}/s_${t.toFixed(2)}.jpg`, quality: 88, timeout: 600000 }); console.log(t, Date.now() - t0, 'ms'); }
console.log('errors', errs.slice(0, 8));
await b.close();
