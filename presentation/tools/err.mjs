import { chromium } from "/home/user/qadisiyah-field/node_modules/playwright/index.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-gl=swiftshader"] });
const p = await b.newPage(); p.on("pageerror", (e) => console.log("ERR", e.message, e.stack.split("\n").slice(0,3).join(" | "))); p.on("console", (m) => m.type()==="error" && console.log("C", m.text()));
await p.goto(process.argv[2]); await p.waitForTimeout(2500); await b.close();
