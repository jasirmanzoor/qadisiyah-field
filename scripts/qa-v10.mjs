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
  await adel.click({ force: true });
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

const shifaBtn = page.getByRole("tab", { name: /Al Shifa|الشفا/ }).first();
console.log("HAS_SHIFA_TAB", (await shifaBtn.count()) > 0);
if (await shifaBtn.count()) {
  await shifaBtn.click();
  await page.waitForTimeout(1200);
  const sbody = await page.locator("body").innerText();
  console.log("SHIFA MAP", sbody.slice(0, 700));
  console.log("SHIFA_USED", /Used-car|المستعمل/.test(sbody));
  console.log("HAS_BOTH_CHIP", /Both markets|في السوقين/.test(sbody));
  console.log("SHIFA_ALL_DUAL_TIPS", await page.locator(".qads-tip-dual").count());
  console.log("HAS_NEXT_DESK", /Next desk|المعرض التالي/.test(sbody));
  await page.screenshot({ path: "/workspace/screenshots/map-shifa.png" });
  const bothChip = page.locator("button").filter({ hasText: /Both markets|في السوقين/ }).first();
  if (await bothChip.count()) {
    await bothChip.click();
    await page.waitForTimeout(800);
    const bothBody = await page.locator("body").innerText();
    console.log("BOTH FILTER", bothBody.match(/Showing\s+\d+|المعروض\s+\d+/)?.[0] ?? "none");
    console.log("SHIFA_BOTH_DUAL_TIPS", await page.locator(".qads-tip-dual").count());
    console.log("BOTH_SALEH", /Saleh Group/.test(bothBody));
    console.log("BOTH_NUKHBA", /Nukhba|النخبة/.test(bothBody));
    await page.screenshot({ path: "/workspace/screenshots/map-shifa-dual.png" });
  }
  await search.fill("Haraj");
  await page.waitForTimeout(600);
  const haraj = page.locator("button").filter({ hasText: /Haraj|حراج/i }).first();
  console.log("HAS_HARAJ", (await haraj.count()) > 0);
  if (await haraj.count()) {
    await haraj.click();
    await page.waitForTimeout(800);
    const hsheet = await page.locator("body").innerText();
    console.log("HARAJ SHEET", hsheet.slice(0, 700));
    console.log("HARAJ_USED_BADGE", /Used-car market|سوق المستعمل/.test(hsheet));
    console.log("HARAJ_ROUGH", /rough notes|ملاحظات أولية/i.test(hsheet));
    console.log("HARAJ_LOT_PASTE", /Inventory:\s*[—–-]/.test(hsheet) && /Showroom size:\s*[—–-]/.test(hsheet));
    console.log("HARAJ_COPY", /Copy|نسخ/.test(hsheet));
    console.log("HARAJ_CLOSED_CTA", /Lot closed|المعرض مغلق/.test(hsheet));
    await page.screenshot({ path: "/workspace/screenshots/dealer-haraj.png" });
  }
  await search.fill("");
  await page.waitForTimeout(300);

  const allChip = page.locator(".qads-chips button").first();
  if (await allChip.count()) {
    await allChip.click();
    await page.waitForTimeout(400);
  }

  const listBtn = page.getByRole("button", { name: /^List$|^قائمة$/ }).first();
  console.log("HAS_LIST_BTN", (await listBtn.count()) > 0);
  if (await listBtn.count()) {
    await listBtn.click();
    await page.waitForTimeout(800);
    const listBody = await page.locator("body").innerText();
    const listCol = page.locator("[data-list='1']");
    console.log("HAS_LIST_COL", (await listCol.count()) > 0);
    console.log("LIST_HAS_HARAJ", /Haraj Al Shifa/.test(listBody));
    console.log("LIST_HAS_SALEH", /Saleh Group/.test(listBody));
    console.log("LIST_HAS_CORRIDOR", /Ahmad Al Basri/.test(listBody));
    await page.screenshot({ path: "/workspace/screenshots/map-shifa-list.png" });
    const salehRow = listCol.locator("button").filter({ hasText: /Saleh Group/i }).first();
    if (await salehRow.count()) {
      await salehRow.click({ force: true });
      await page.waitForTimeout(800);
      const salehSheet = await page.locator("body").innerText();
      console.log("LIST_SALEH_SHEET", salehSheet.slice(0, 900));
      console.log("HAS_ROUGH_NOTES", /rough notes|ملاحظات أولية/i.test(salehSheet));
      console.log("HAS_SALEH_INV", /Inventory:\s*140/.test(salehSheet));
      console.log("HAS_SALEH_SIZE", /Showroom size:\s*2,?000/.test(salehSheet));
      await page.screenshot({ path: "/workspace/screenshots/dealer-saleh-shifa.png" });
    }
    const harajRow = listCol.locator("button").filter({ hasText: /Haraj/i }).first();
    if (await harajRow.count()) {
      await harajRow.click({ force: true });
      await page.waitForTimeout(600);
      const hsheet = await page.locator("body").innerText();
      console.log("LIST_HARAJ_POPUP", /Haraj Al Shifa/.test(hsheet) && /Start survey|بدء/.test(hsheet));
      console.log("LIST_HARAJ_LOT_PASTE", /Inventory:\s*[—–-]/.test(hsheet) && /Showroom size:\s*[—–-]/.test(hsheet));
      await page.screenshot({ path: "/workspace/screenshots/dealer-haraj-list.png" });
    }
    const najoomRow = listCol.locator("button").filter({ hasText: /Najoom/i }).first();
    if (await najoomRow.count()) {
      await najoomRow.click({ force: true });
      await page.waitForTimeout(600);
      const nsheet = await page.locator("body").innerText();
      console.log("NAJOOM_LOT_PASTE", /Najoom Al Shifa/.test(nsheet) && /Inventory:\s*[—–-]/.test(nsheet) && /Showroom size:\s*[—–-]/.test(nsheet));
      console.log("NAJOOM_NO_QADS_INV", !/Inventory:\s*140/.test(nsheet));
      await page.screenshot({ path: "/workspace/screenshots/dealer-najoom-shifa.png" });
    }
  }
}

await search.fill("");
await page.waitForTimeout(300);

const qadsBtn = page.getByRole("tab", { name: /Al Qadisiyah|القادسية/ }).first();
if (await qadsBtn.count()) {
  await qadsBtn.click();
  await page.waitForTimeout(600);
}

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
