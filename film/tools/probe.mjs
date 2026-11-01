import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
const ts=process.argv.slice(2).map(Number);
const b=await chromium.launch({args:['--allow-file-access-from-files']}); const p=await b.newPage({viewport:{width:1920,height:1080}});
p.on('pageerror',e=>console.log('ERR',String(e))); p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
await p.goto('file://'+process.cwd()+'/showreel.html'); await p.evaluate(()=>window.ready);
for(const t of ts){await p.evaluate(t=>seek(t),t);await p.screenshot({path:`/tmp/p_${t}.png`});}
await b.close();
