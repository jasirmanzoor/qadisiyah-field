import { chromium } from "/home/user/qadisiyah-field/node_modules/playwright/index.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push("PAGEERR " + e.message + " " + (e.stack||"").split("\n")[1])); p.on("response", (r) => r.status() >= 400 && errs.push("HTTP " + r.status() + " " + r.url()));
await p.goto(process.argv[2]); await p.waitForTimeout(1500);
const n = await p.evaluate(() => { window.__deck.setPlay(false); return document.querySelectorAll("#kn .sc").length; });
for (let i = 0; i < n; i++) { await p.evaluate((i) => { window.__deck.go(i, 99); window.__deck.setPlay(false); }, i); await p.waitForTimeout(900); }
console.log("scenes", n, JSON.stringify([...new Set(errs)], null, 1)); await b.close();
