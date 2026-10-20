/* Frame recorder for pages that expose window.__render(t): every frame is rendered at an exact time, then captured.
   usage: node rz.mjs URL OUTDIR FPS t0 t1  (or: node rz.mjs URL OUTDIR stills t,t,t) */
import { chromium } from "/home/user/qadisiyah-field/node_modules/playwright/index.mjs";
const [,, url, out, fps, a, b] = process.argv;
const br = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--hide-scrollbars"] });
const p = await (await br.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto(url); await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const ts = fps === "stills" ? a.split(",").map(Number) : [...Array(Math.round((+b - +a) * +fps))].map((_, i) => +a + i / +fps);
const t0 = Date.now();
for (let i = 0; i < ts.length; i++) {
  await p.evaluate((t) => window.__render(t), ts[i]);
  await p.screenshot({ path: fps === "stills" ? `${out}/t${ts[i]}.jpg` : `${out}/f${String(i).padStart(5, "0")}.jpg`, type: "jpeg", quality: 93 });
}
console.log(JSON.stringify({ frames: ts.length, sec: ((Date.now() - t0) / 1000 / ts.length).toFixed(2), errs: errs.slice(0, 5) }));
await br.close();
