import { chromium } from 'playwright';
import { spawn } from 'child_process';
const [f0, f1, out] = [+process.argv[2], +process.argv[3], process.argv[4]];
// 3 subframes per 60 fps frame, blended with tmix for motion blur
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '180', '-c:v', 'mjpeg', '-i', '-', '-vf', "tmix=frames=3,select='eq(mod(n\\,3)\\,2)',setpts=N/(60*TB)", '-r', '60', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('file://' + process.cwd() + '/film.html'); await p.evaluate(() => window.ready);
for (let f = f0; f < f1; f++) for (let j = 0; j < 3; j++) {
  // subframes at -1/3, 0 of the frame interval end on the frame time itself
  await p.evaluate(t => window.seek(t), Math.max(0, (3 * f + j - 2) / 180));
  const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done', out);
