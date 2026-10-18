import { chromium } from "/home/user/qadisiyah-field/node_modules/playwright/index.mjs";
const [,, url, out, w, h, tag] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, isMobile: tag === "p", hasTouch: tag === "p", deviceScaleFactor: tag === "p" ? 2 : 1 })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto(url); await p.waitForTimeout(2000);
await p.evaluate(() => { window.__deck.go(3, 0); window.__deck.setPlay(false); }); await p.waitForTimeout(6000);
const shots = [[0, "hold", 0], [0, "hold", .45], [0, "settle"], [1, "hold", .3], [1, "settle"], [2, "settle"], [3, "settle"]];
let n = 0;
for (const [bb, m, v] of shots) {
  await p.evaluate(({ bb }) => { window.__deck.go(3, bb); window.__deck.setPlay(false); }, { bb }); await p.waitForTimeout(800);
  await p.evaluate(({ m, v }) => window.__city[m](v), { m, v }); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${out}/q-${tag}-${++n}.png`, timeout: 120000 });
}
console.log(tag, errs); await b.close();
