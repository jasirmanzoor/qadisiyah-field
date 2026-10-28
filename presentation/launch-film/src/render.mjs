import { chromium } from '/home/user/qadisiyah-field/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
const [f0, f1, out] = [+process.argv[2], +process.argv[3], process.argv[4]];
const ff = spawn('ffmpeg', ['-v','error','-y','-f','image2pipe','-framerate','180','-c:v','mjpeg','-i','-','-vf',"tmix=frames=3,select='eq(mod(n\\,3)\\,2)',setpts=N/(60*TB)",'-r','60','-c:v','libx264','-preset','medium','-crf','14','-pix_fmt','yuv420p',out], { stdio: ['pipe','inherit','inherit'] });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('http://127.0.0.1:8113/film.html'); await p.evaluate(() => window.ready);
const t0 = Date.now();
for (let f = f0; f < f1; f++) for (let j = 0; j < 3; j++) {
  await p.evaluate(t => window.seek(t), (3 * f + j) / 180);
  const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 100 === 0 && j === 0) console.log(out, f, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done', out);
