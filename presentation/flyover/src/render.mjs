// node render.mjs <srcdir> <f0> <f1> <out.mp4> [sub]   : frames f0..f1-1 at 60 fps, motion blur and DOF in the page
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
const [root, f0, f1, out, sub = '16'] = process.argv.slice(2);
const srv = createServer(async (q, r) => { try { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); r.writeHead(200); r.end(await readFile(f)); } catch { r.writeHead(404); r.end(); } }).listen(0);
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 1152 } });
await p.goto(`http://127.0.0.1:${srv.address().port}/fly.html`); await p.evaluate(() => window.ready);
await p.evaluate(n => window.setSub(n), +sub);
const T0 = Date.now();
for (let f = +f0; f < +f1; f++) {
  await p.evaluate(t => window.seek(t), f / 60);
  const buf = await p.screenshot({ type: 'jpeg', quality: 96, timeout: 600000 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 60 === 0) console.log(out, f, ((Date.now() - T0) / 1000).toFixed(0) + 's');
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); srv.close(); console.log('done', out);
