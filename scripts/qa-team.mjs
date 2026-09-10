import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const errors = [];
function attach(page) {
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
}

async function signup(page, name, email) {
  await page.goto("http://127.0.0.1:8080/login", { waitUntil: "networkidle" });
  const need = page.getByRole("button", { name: /Need an account|تحتاج حساباً/i });
  if (await need.count()) await need.first().click();
  await page.getByPlaceholder("Name").fill(name);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("FieldPass9!");
  await page.getByRole("button", { name: /Create account|إنشاء حساب/i }).click();
  await page.waitForTimeout(8000);
}

async function waitHud(page) {
  await page.waitForFunction(() => /\/\s*31\d/.test(document.body.innerText), { timeout: 25000 }).catch(() => {});
}

const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
attach(page);
await signup(page, "Umair", `umair${Date.now()}@example.com`);
await waitHud(page);
await page.screenshot({ path: "/workspace/screenshots/team-owner-map.png" });

const ops = page.getByRole("link", { name: /Ops|تشغيل/i });
await ops.click();
await page.waitForTimeout(1200);
await page.screenshot({ path: "/workspace/screenshots/team-ops.png" });
const opsText = await page.locator("body").innerText();
console.log("OPS", opsText.slice(0, 900));
const codeMatch = opsText.match(/\b([A-Z0-9]{3}-[A-Z0-9]{3})\b/);
console.log("CODE", codeMatch?.[1] ?? "NONE");
const code = (codeMatch?.[1] ?? "").replace("-", "");

const signOut = page.getByRole("button", { name: /Sign out|تسجيل الخروج/i });
if (await signOut.count()) {
  await signOut.click();
  await page.waitForTimeout(1500);
} else {
  console.log("NO_SIGNOUT", await page.locator("header").innerText().catch(() => ""));
}

await page.goto("http://127.0.0.1:8080/login", { waitUntil: "networkidle" });
const need2 = page.getByRole("button", { name: /Need an account|تحتاج حساباً/i });
if (await need2.count()) await need2.first().click();
await page.getByPlaceholder("Name").fill("Friend");
await page.getByPlaceholder("Email").fill(`friend${Date.now()}@example.com`);
await page.getByPlaceholder("Password").fill("FieldPass9!");
const teamBox = page.getByPlaceholder(/Team code|رمز الفريق/i);
await teamBox.fill(codeMatch?.[1] ?? code);
await page.getByRole("button", { name: /Create account|إنشاء حساب/i }).click();
await page.waitForTimeout(10000);
await waitHud(page);
await page.screenshot({ path: "/workspace/screenshots/team-friend-map.png" });
const friendText = await page.locator("body").innerText();
console.log("FRIEND MAP", friendText.slice(0, 700));
console.log("HAS_TEAM_COUNT", /\b2\s+Team\b/.test(friendText) || friendText.includes("2 Team") || friendText.includes("2 الفريق"));

await page.getByRole("link", { name: /Ops|تشغيل/i }).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: "/workspace/screenshots/team-friend-ops.png" });
const friendOps = await page.locator("body").innerText();
console.log("FRIEND OPS", friendOps.slice(0, 800));
console.log("HAS_FRIEND", friendOps.includes("Friend"));
console.log("HAS_UMAIR", friendOps.includes("Umair"));
console.log("HAS_MEMBER", /Member|عضو/.test(friendOps));
console.log("CONSOLE_ERRORS", errors.length ? errors.slice(0, 8) : "none");

await browser.close();
