import { chromium } from "/home/user/qadisiyah-field/node_modules/playwright/index.mjs";
const [,, url, out, w, h, tag, list] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, isMobile: tag === "p", hasTouch: tag === "p", deviceScaleFactor: tag === "p" ? 2 : 1 })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message + " " + (e.stack || "").split("\n")[1])); p.on("console", (m) => m.type() === "error" && !/404/.test(m.text()) && errs.push("C " + m.text()));
await p.goto(url); await p.waitForTimeout(2500);
await p.evaluate(() => window.__deck.setPlay(false));
if (tag === "d") console.log(JSON.stringify(await p.evaluate(() => [window.__deck.state(), window.__deck.cues().filter((c) => c.b === 0)])));
let n = 0;
for (const spec of list.split(",")) {
  const [id, off, wait] = spec.split(":");
  await p.evaluate(({ id, off }) => { const [cid, fk] = id.split("@"); const c = window.__deck.cues().find((x) => x.id === cid && x.b === 0); window.__deck.seek(c.t0 + (fk ? window.__fly.keyTime(+fk) : 0) + +off); }, { id, off });
  await p.waitForTimeout(+wait || 2500);
  await p.screenshot({ path: `${out}/t-${tag}-${String(++n).padStart(2, "0")}-${id}-${off}.png`, timeout: 120000 });
}
console.log(tag, JSON.stringify(errs.slice(0, 6)), JSON.stringify(await p.evaluate(() => window.__deck.state())));
await b.close();
