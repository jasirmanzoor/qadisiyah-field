import { chromium } from '/home/user/qadisiyah-field/node_modules/playwright/index.mjs';
import fs from 'fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(); await p.goto('http://127.0.0.1:8113/audio.html');
const r = await p.evaluate(() => window.renderScore());
const pcm = Buffer.from(r.b64, 'base64'); const h = Buffer.alloc(44);
h.write('RIFF',0); h.writeUInt32LE(36+pcm.length,4); h.write('WAVE',8); h.write('fmt ',12); h.writeUInt32LE(16,16); h.writeUInt16LE(1,20); h.writeUInt16LE(2,22); h.writeUInt32LE(r.sr,24); h.writeUInt32LE(r.sr*4,28); h.writeUInt16LE(4,32); h.writeUInt16LE(16,34); h.write('data',36); h.writeUInt32LE(pcm.length,40);
fs.writeFileSync(process.argv[2], Buffer.concat([h,pcm])); console.log('peak', r.peak); await b.close();
