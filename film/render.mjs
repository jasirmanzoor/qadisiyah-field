// usage: node render.mjs beats|full
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'fs'; import path from 'path';
const mode=process.argv[2]||'beats';
const DUR=17; // authored timeline length (s)
const SPEED=+(process.argv[3]||1); // 0.8 = 20% slower (96 BPM)
const here=path.dirname(new URL(import.meta.url).pathname);
const url='file://'+path.join(here,'showreel.html');
const out=path.join(here,mode==='beats'?'beats':'frames'); fs.mkdirSync(out,{recursive:true});
let times=[];
if(mode==='beats') for(let b=0;b<30;b++) times.push([b,b*0.5+0.2]);
else { const SUB=3, FPS=60, N=Math.round(DUR/SPEED*FPS)*SUB; for(let n=0;n<N;n++) times.push([n,Math.min(n/(FPS*SUB)*SPEED,DUR-1e-4)]); }
const browser=await chromium.launch({args:['--allow-file-access-from-files']});
const WORKERS=mode==='beats'?2:4;
const errs=[];
await Promise.all([...Array(WORKERS)].map(async (_,w)=>{
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  page.on('pageerror',e=>errs.push(String(e))); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await page.goto(url); await page.evaluate(()=>window.ready);
  const mine=times.filter((_,i)=>i%WORKERS===w);
  for(const [n,t] of mine){
    await page.evaluate(t=>window.seek(t),t);
    await page.screenshot({path:path.join(out,String(n).padStart(5,'0')+'.png')});
  }
  if(w===0 && mode==='full'){
    const b64=await page.evaluate(s=>window.renderAudio(s),SPEED);
    fs.writeFileSync(path.join(here,'soundtrack.wav'),Buffer.from(b64,'base64'));
  }
  await page.close();
}));
await browser.close();
if(errs.length){console.log('ERRORS',errs.slice(0,5));process.exit(1);}
console.log('done',times.length);
