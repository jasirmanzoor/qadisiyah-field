import { chromium } from '/home/user/qadisiyah-field/node_modules/playwright/index.mjs';
const out = process.argv[2], off = +(process.argv[3]||0.25);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({viewport:{width:1920,height:1080}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://127.0.0.1:8113/film.html'); await p.evaluate(()=>window.ready);
for (let k=0;k<80;k++){ await p.evaluate(t=>window.seek(t), k*0.5+off); await p.screenshot({path:`${out}/b${String(k).padStart(2,'0')}.jpg`, quality:70}); }
console.log('errors', errs);
await b.close();
