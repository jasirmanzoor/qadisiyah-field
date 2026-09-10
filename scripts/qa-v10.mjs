import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(err.message));

await page.goto("http://127.0.0.1:8080/login", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Need an account? Sign up" }).click();
const email = `mind${Date.now()}@example.com`;
await page.getByPlaceholder("Name").fill("Umair");
await page.getByPlaceholder("Email").fill(email);
await page.getByPlaceholder("Password").fill("FieldPass9!");
await page.getByRole("button", { name: "Create account" }).click();

// Seed is ~317 inserts — wait until HUD shows roster size
let body = "";
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(1500);
  if (page.url().includes("login")) continue;
  body = await page.locator("body").innerText();
  if (/\d+\s*\/\s*\d+/.test(body) && /walked|تمت/i.test(body)) break;
}
await page.screenshot({ path: "/workspace/screenshots/map-loaded.png" });
console.log("URL", page.url());
console.log("MAP TEXT", body.slice(0, 900));

const hud = body.match(/(\d+)\s*\/\s*(\d+)/);
console.log("HUD", hud ? hud[0] : "none");
console.log("HAS_TRAINED_CHIP", /Trained|مُدرَّب/.test(body));
console.log("HAS_INDUCTION_CHIP", /Induction|التدريب/.test(body));

// Filter trained
const trainedChip = page.locator("button").filter({ hasText: /Trained|مُدرَّب/ }).first();
if (await trainedChip.count()) {
  await trainedChip.click();
  await page.waitForTimeout(800);
  const tbody = await page.locator("body").innerText();
  console.log("TRAINED FILTER", tbody.slice(0, 500));
  await page.screenshot({ path: "/workspace/screenshots/map-trained.png" });
}

// Search Saleh
const search = page.getByPlaceholder(/Search showrooms|بحث المعارض/i);
await search.fill("Saleh");
await page.waitForTimeout(600);
const salehHit = page.locator("button").filter({ hasText: /Saleh/i }).first();
console.log("HAS_SALEH", (await salehHit.count()) > 0);
if (await salehHit.count()) {
  await salehHit.click();
  await page.waitForTimeout(800);
  const sheet = await page.locator("body").innerText();
  console.log("SALEH SHEET", sheet.slice(0, 800));
  console.log("HAS_ACTIVE_USER", /Active user|مستخدم نشط|Trained|مُدرَّب/.test(sheet));
  console.log("HAS_SURVEY_CTA", /Start survey|Continue survey|بدء|متابعة/.test(sheet));
  await page.screenshot({ path: "/workspace/screenshots/dealer-sheet.png" });
}

// Search Adel
await search.fill("Adel");
await page.waitForTimeout(500);
const adel = page.locator("button").filter({ hasText: /Adel/i }).first();
if (await adel.count()) {
  await adel.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/workspace/screenshots/map-adel.png" });
}

// D0308 Hamat
await search.fill("Hamat Al Astoorah");
await page.waitForTimeout(500);
const hamat = page.locator("button").filter({ hasText: /Hamat/i }).first();
console.log("HAS_HAMAT", (await hamat.count()) > 0);

// D0069 Al Khiyar — GIS live pin, no longer closed
await search.fill("Khiyar");
await page.waitForTimeout(500);
const khiyar = page.locator("button").filter({ hasText: /Khiyar|الخيار/i }).first();
console.log("HAS_KHIYAR", (await khiyar.count()) > 0);
if (await khiyar.count()) {
  await khiyar.click();
  await page.waitForTimeout(600);
  const ksheet = await page.locator("body").innerText();
  console.log("KHIYAR_STATUS_CLOSED", /\bClosed\b/.test(ksheet.split("\n").slice(0, 20).join("\n")));
  console.log("KHIYAR_SHEET", ksheet.slice(0, 400));
  await page.screenshot({ path: "/workspace/screenshots/dealer-khiyar.png" });
}

await search.fill("");
await page.waitForTimeout(300);

const dash = page.getByRole("link", { name: /Dashboard|لوحة/i });
if (await dash.count()) {
  await dash.click();
  await page.waitForTimeout(2000);
  const targets = page.getByRole("button", { name: /Targets|أهداف/i });
  if (await targets.count()) {
    await targets.click();
    await page.waitForTimeout(400);
  }
  const dtext = await page.locator("body").innerText();
  console.log("DASH TEXT", dtext.slice(0, 900));
  console.log("HAS_TRAINED_STAT", /Trained|مُدرَّب/.test(dtext));
  console.log("HAS_INDUCTION_INSIGHT", /AutoLink|أوتو لينك|trained desks|مكتب مُدرَّب/.test(dtext));
  await page.screenshot({ path: "/workspace/screenshots/dashboard.png" });
}

const ops = page.getByRole("link", { name: /Ops|تشغيل/i });
if (await ops.count()) {
  await ops.click();
  await page.waitForTimeout(1500);
  const otext = await page.locator("body").innerText();
  console.log("OPS TEXT", otext.slice(0, 900));
  console.log("HAS_ONBOARDED", /Onboarded/.test(otext));
  console.log("HAS_SALEH_OPS", /Saleh/.test(otext));
  console.log("HAS_ADEL_OPS", /Adel/.test(otext));
  await page.screenshot({ path: "/workspace/screenshots/ops.png" });
}

console.log("CONSOLE_ERRORS", errors.length ? errors.slice(0, 8) : "none");
await browser.close();
