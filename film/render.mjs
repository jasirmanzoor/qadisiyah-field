// node render.mjs beats <outdir>            -> one PNG per beat (+0.2s) for review
// node render.mjs frames <outdir> t1 t2 ...  -> specific times
// node render.mjs full <out.mp4> [workers]   -> 60fps, 3 subframes/frame blended with tmix
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(here, 'index.html');
const [mode, out, ...rest] = process.argv.slice(2);
const FPS = 60, SUBF = 3, DUR = 30, SUBDT = 1 / 360; // subframes span half a frame (180° shutter)

async function page(browser) {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  p.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  p.on('pageerror', e => console.error('[pageerror]', e.message));
  await p.goto(url);
  await p.evaluate(() => window.ready);
  return p;
}
const shot = (p, t, type = 'jpeg') => p.evaluate(t => window.seek(t), t)
  .then(() => p.screenshot({ type, quality: type === 'jpeg' ? 93 : undefined, clip: { x: 0, y: 0, width: 1920, height: 1080 } }));

const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-device-scale-factor=1'] });
if (mode === 'beats' || mode === 'frames') {
  fs.mkdirSync(out, { recursive: true });
  const p = await page(browser);
  const times = mode === 'beats' ? Array.from({ length: 60 }, (_, k) => +(k * 0.5 + 0.3).toFixed(3)) : rest.map(Number);
  for (const t of times) fs.writeFileSync(path.join(out, `t${t.toFixed(2).padStart(5, '0')}.jpg`), await shot(p, t));
  console.log('wrote', times.length);
} else if (mode === 'full') {
  const workers = +(rest[0] || 4);
  const total = FPS * DUR, per = Math.ceil(total / workers);
  const segs = [];
  const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const a = w * per, b = Math.min(total, a + per);
    const seg = out.replace(/\.mp4$/, `.seg${w}.mp4`); segs[w] = seg;
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS * SUBF), '-i', '-',
      '-vf', `tmix=frames=${SUBF},select='eq(mod(n\\,${SUBF})\\,${SUBF - 1})',setpts=N/${FPS}/TB`,
      '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
    const p = await page(browser);
    for (let f = a; f < b; f++) {
      for (let s = 0; s < SUBF; s++) {
        const buf = await shot(p, f / FPS + s * SUBDT);
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      }
      if (w === 0 && f % 60 === 0) console.log(`w0 frame ${f}/${b} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }));
  fs.writeFileSync(out + '.txt', segs.map(s => `file '${s}'`).join('\n'));
  console.log('segments done', ((Date.now() - t0) / 1000).toFixed(0), 's');
}
await browser.close();
