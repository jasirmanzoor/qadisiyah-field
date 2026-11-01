'use strict';
// The AutoLink Dealer Portal, rebuilt as vector layers from the real screens (dealer SOP deck + portal screenshots):
// the login card (English / العربية / 中文), the sidebar (Loans: Applications, Estimator, Application Form, Model Library,
// Inventory, Products; Account: Security Center), the Loan Estimator, the eight-step application form and the Model Library.
// Shown as in the live portal (cleared for sub-dealer audiences): dealer, user, application number and financer offers.
const PB = { blue: [44, 91, 246], blueL: [75, 130, 255], bar: [0, 76, 214], act: [216, 227, 245], side: [241, 245, 249], line: [226, 230, 236],
  text: [31, 41, 55], mute: [120, 128, 140], head: [236, 236, 238], pale: [236, 242, 254], navy: [2, 27, 84] };
const UI = '"ID", "FreeSerif", sans-serif', SERIF = '"FreeSerif", serif';
const VW = 1600, VH = 900;   // the portal is drawn at this size, then scaled into its glass frame

function uiText(s, x, y, size, col, wt = 500, fam = UI, align = 'left') { X.font = `${wt} ${size}px ${fam}`; X.textAlign = align; X.fillStyle = rgba(col); X.fillText(s, x, y); X.textAlign = 'left'; }
function flagUK(x, y, w, h) {
  X.save(); rr(x, y, w, h, 3); X.clip(); X.fillStyle = '#1f3c8c'; X.fillRect(x, y, w, h);
  X.strokeStyle = '#fff'; X.lineWidth = h * .3; X.beginPath(); X.moveTo(x, y); X.lineTo(x + w, y + h); X.moveTo(x + w, y); X.lineTo(x, y + h); X.stroke();
  X.strokeStyle = '#c8102e'; X.lineWidth = h * .12; X.beginPath(); X.moveTo(x, y); X.lineTo(x + w, y + h); X.moveTo(x + w, y); X.lineTo(x, y + h); X.stroke();
  X.fillStyle = '#fff'; X.fillRect(x + w * .4, y, w * .2, h); X.fillRect(x, y + h * .36, w, h * .28);
  X.fillStyle = '#c8102e'; X.fillRect(x + w * .44, y, w * .12, h); X.fillRect(x, y + h * .41, w, h * .18); X.restore();
}
function flagSA(x, y, w, h) { X.fillStyle = '#165b33'; rr(x, y, w, h, 3); X.fill(); X.fillStyle = 'rgba(255,255,255,.85)'; X.fillRect(x + w * .25, y + h * .38, w * .5, h * .1); X.fillRect(x + w * .3, y + h * .62, w * .4, h * .06); }
function logoSmall(x, y, h, wordCol = PB.navy) {
  if (!IMG.loopmark || !IMG.wordmark) return;
  const lw = h * IMG.loopmark.width / IMG.loopmark.height; X.drawImage(IMG.loopmark, x, y, lw, h);
  const wh = h * .66, ww = wh * IMG.wordmark.width / IMG.wordmark.height; X.drawImage(tinted(IMG.wordmark, wordCol), x + lw + h * .06, y + h * .2, ww, wh);
}
function langPill(x, y, lang) {   // the language control: label + flag
  X.fillStyle = '#fff'; rr(x, y, 190, 46, 23); X.fill(); X.strokeStyle = rgba(PB.line); X.lineWidth = 1.5; X.stroke();
  uiText('⌃', x + 18, y + 31, 16, PB.mute, 500);
  if (lang === 'ar') { uiText('العربية', x + 52, y + 30, 20, PB.text, 500); flagSA(x + 134, y + 12, 38, 22); }
  else if (lang === 'zh') { uiText('中文', x + 60, y + 30, 20, PB.text, 500); flagUK(x + 134, y + 12, 38, 22); }
  else { uiText('English', x + 44, y + 30, 20, PB.text, 500); flagUK(x + 134, y + 12, 38, 22); }
}
function field(x, y, w, h, ph, val, icon) {
  X.fillStyle = '#fff'; rr(x, y, w, h, 10); X.fill(); X.strokeStyle = rgba(PB.line); X.lineWidth = 1.5; X.stroke();
  const tx = x + (icon ? 54 : 20);
  if (icon) { X.strokeStyle = rgba(PB.mute); X.lineWidth = 2; rr(x + 20, y + h / 2 - 11, 18, 22, 3); X.stroke(); }
  if (val) uiText(val, tx, y + h / 2 + 8, 22, PB.text, 500); else uiText(ph, tx, y + h / 2 + 8, 22, [150, 156, 166], 400);
}
function caretOn(x, y, h) { if (Math.floor(lt * 2.4) % 2 === 0) { X.fillStyle = rgba(PB.blue); X.fillRect(x, y, 2, h); } }

/* ---------------- login (portal screen: STEP 01 · ACCESS) ---------------- */
const LOGIN = {
  en: { title: 'Dealer Portal', mobile: 'Mobile', pass: 'Password', code: 'Code', send: 'Send Code', login: 'Login', forgot: 'Change Password' },
  ar: { title: 'بوابة الوكيل', mobile: 'أدخل رقم الجوال', pass: 'أدخل كلمة المرور', code: 'أدخل رمز التحقق', send: 'إرسال الرمز', login: 'تسجيل الدخول', forgot: 'نسيت كلمة المرور' },
};
function loginScreen(o) {
  const { lang = 'en', typed = 0, dropdown = 0, press = 0 } = o, T = LOGIN[lang === 'ar' ? 'ar' : 'en'], rtl = lang === 'ar';
  // backdrop: pale with soft blue swirls, as on the real login
  const g0 = X.createLinearGradient(0, 0, VW, VH); g0.addColorStop(0, '#f7f8fc'); g0.addColorStop(1, '#e9effd'); X.fillStyle = g0; X.fillRect(0, 0, VW, VH);
  for (let k = 0; k < 5; k++) { X.strokeStyle = `rgba(80,120,240,${.06 + k * .02})`; X.lineWidth = 40 - k * 6; X.beginPath(); X.moveTo(-100, 700 + k * 30); X.bezierCurveTo(500, 520 + k * 20 + Math.sin(lt + k) * 20, 1000, 980, 1700, 640 - k * 40); X.stroke(); }
  const cx = 520, cy = 90, cw = 560, chh = 700;
  X.save(); X.shadowColor = 'rgba(30,50,120,.10)'; X.shadowBlur = 40; X.shadowOffsetY = 12; X.fillStyle = '#fff'; rr(cx, cy, cw, chh, 22); X.fill(); X.restore();
  logoSmall(cx + 44, cy + 46, 66);
  langPill(cx + cw - 230, cy + 50, lang);
  if (dropdown > .01) {   // the dropdown: 中文 / English / العربية
    X.save(); X.globalAlpha = dropdown; X.shadowColor = 'rgba(30,50,120,.15)'; X.shadowBlur = 24; X.fillStyle = '#fff'; rr(cx + cw - 250, cy + 106, 210, 156, 16); X.fill(); X.restore();
    X.save(); X.globalAlpha = dropdown;
    ['中文', 'English', 'العربية'].forEach((s, i) => { const on = (lang === 'zh' && i === 0) || (lang === 'en' && i === 1) || (lang === 'ar' && i === 2); if (on) { X.fillStyle = rgba(PB.pale); rr(cx + cw - 242, cy + 114 + i * 46, 194, 42, 10); X.fill(); X.fillStyle = rgba(PB.blue); X.beginPath(); X.arc(cx + cw - 222, cy + 135 + i * 46, 5, 0, 7); X.fill(); } uiText(s, cx + cw - 64, cy + 143 + i * 46, 21, PB.text, 500, UI, 'right'); });
    X.restore();
  }
  uiText(T.title, cx + cw / 2, cy + 196, 34, [17, 17, 17], 500, UI, 'center');
  const mob = '05 ••• ••••'.slice(0, Math.floor(typed * 11));
  field(cx + 44, cy + 236, cw - 88, 70, rtl ? '' : T.mobile, mob, true); if (rtl) uiText(T.mobile, cx + cw - 100, cy + 279, 22, [150, 156, 166], 400, UI, 'right');
  field(cx + 44, cy + 322, cw - 88, 70, rtl ? '' : T.pass, typed > 1 ? '••••••••' : '', true); if (rtl) uiText(T.pass, cx + cw - 100, cy + 365, 22, [150, 156, 166], 400, UI, 'right');
  field(cx + 44, cy + 408, 330, 70, rtl ? '' : T.code, typed > 1.5 ? '••••' : '', true); if (rtl) uiText(T.code, cx + 340, cy + 451, 22, [150, 156, 166], 400, UI, 'right');
  X.fillStyle = '#fff'; rr(cx + 44, cy + 492, 330, 60, 10); X.fill(); X.strokeStyle = rgba(PB.line); X.stroke(); uiText(T.send, cx + 209, cy + 530, 22, PB.blue, 500, UI, 'center');
  X.fillStyle = rgba(press > .5 ? PB.bar : PB.blue); rr(cx + 44, cy + 578, cw - 88, 76, 12); X.fill(); uiText(T.login, cx + cw / 2, cy + 626, 30, [255, 255, 255], 500, UI, 'center');
  uiText(T.forgot, rtl ? cx + 44 : cx + cw - 44, cy + 690, 20, PB.blue, 500, UI, rtl ? 'left' : 'right');
}

/* ---------------- the shell: sidebar + header ---------------- */
const NAV = [['Loans', 0], ['Applications', 1], ['Estimator', 1], ['Application Form', 1], ['Model Library', 1], ['Inventory', 1], ['Products', 1], ['Account', 0], ['Security Center', 1]];
function shell(active, crumb, lang = 'en') {
  X.fillStyle = '#fff'; X.fillRect(0, 0, VW, VH);
  X.fillStyle = rgba(PB.side); X.fillRect(0, 0, 300, VH); X.fillStyle = rgba(PB.line); X.fillRect(300, 0, 1.5, VH);
  logoSmall(34, 30, 52);
  uiText('Dealer Admin Portal', 34, 112, 17, PB.mute, 400, SERIF);
  uiText('Nojoom Riyadh Cars Company', 34, 140, 17, PB.blue, 600);
  let y = 196;
  for (const [s, sub] of NAV) {
    if (!sub) { y += 10; X.strokeStyle = rgba(PB.text, .8); X.lineWidth = 2; if (s === 'Loans') { X.strokeRect(36, y - 18, 22, 16); } else { X.beginPath(); X.arc(47, y - 16, 7, 0, 7); X.stroke(); } uiText(s, 74, y, 21, PB.text, 700, SERIF); uiText('⌄', 268, y - 4, 18, PB.mute, 500); y += 52; continue; }
    if (s === active) { X.fillStyle = rgba(PB.act); X.fillRect(10, y - 32, 284, 48); X.fillStyle = rgba(PB.bar); X.fillRect(10, y - 32, 5, 48); }
    uiText(s, 82, y, 20, s === active ? PB.bar : PB.text, 700, SERIF); y += 50;
  }
  // header
  X.fillStyle = '#fbfbfc'; X.fillRect(301, 0, VW - 301, 76); X.fillStyle = rgba(PB.line); X.fillRect(301, 76, VW - 301, 1.5);
  uiText('☰', 330, 46, 20, PB.mute, 500); uiText('Loans', 372, 46, 20, PB.blue, 500); uiText('/', 434, 46, 20, PB.mute, 400); uiText(crumb, 452, 46, 20, PB.mute, 400);
  langPill(VW - 560, 15, lang);
  uiText('Salem al anezi (سالم العنيزي)', VW - 90, 46, 19, PB.text, 500, UI, 'right');
  X.strokeStyle = rgba(PB.line); X.lineWidth = 1.5; X.beginPath(); X.arc(VW - 60, 38, 20, 0, 7); X.stroke(); X.beginPath(); X.arc(VW - 60, 33, 6, 0, 7); X.stroke(); X.beginPath(); X.arc(VW - 60, 49, 10, Math.PI, 0); X.stroke();
}
// eight-step application form stepper (the real labels)
const STEPS8 = ['Applicant Info', 'Vehicle Info', 'Loan Request', 'Credit Pre-check', 'Financial Institution Selection', 'Financial Product Selection', 'Submit Application', 'Application Progress'];
function stepper8(x, y, w, cur) {
  const n = 8, dx = w / (n - 1);
  for (let i = 0; i < n - 1; i++) { const f = clamp(cur - i); X.fillStyle = rgba(PB.line); X.fillRect(x + i * dx + 34, y - 1.5, dx - 68, 3); X.fillStyle = rgba(PB.blue); X.fillRect(x + i * dx + 34, y - 1.5, (dx - 68) * f, 3); }
  for (let i = 0; i < n; i++) {
    const cx = x + i * dx, done = cur >= i + .99, here = Math.round(cur) === i && !done;
    X.beginPath(); X.arc(cx, y, 26, 0, 7); X.fillStyle = here ? rgba(PB.blue) : '#fff'; X.fill(); X.lineWidth = 2.5; X.strokeStyle = rgba(cur >= i - .01 ? PB.blue : PB.line); X.stroke();
    X.fillStyle = here ? '#fff' : rgba(cur >= i - .01 ? PB.blue : PB.mute); X.fillRect(cx - 7, y - 9, 14, 18);
    if (done) { X.fillStyle = rgba(PB.blue); X.beginPath(); X.arc(cx + 19, y + 18, 9, 0, 7); X.fill(); check(cx + 19, y + 18, 12, [255, 255, 255], 1); }
    const lab = STEPS8[i], words = lab.length > 16 ? lab.split(' ') : [lab];
    const lines = words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [words.join(' ')];
    lines.forEach((s, k) => uiText(s, cx, y + 54 + k * 20, 15, here ? PB.blue : PB.mute, here ? 700 : 500, UI, 'center'));
  }
}
function appNoBar(x, y, w, a = 1) {
  X.save(); X.globalAlpha = a; X.fillStyle = rgba(PB.pale); rr(x, y, w, 64, 12); X.fill();
  uiText('Application No.', x + 22, y + 40, 19, PB.mute, 500);
  uiText('AO20260811CVGG49CPDM79', x + 180, y + 40, 19, PB.blue, 600);
  X.fillStyle = '#fff'; rr(x + 472, y + 14, 74, 36, 8); X.fill(); X.strokeStyle = rgba(PB.blue, .5); X.lineWidth = 1.5; X.stroke(); uiText('Copy', x + 509, y + 38, 17, PB.blue, 600, UI, 'center');
  X.restore();
}
/* pages */
function pageForm(lt0, cur) {
  shell('Application Form', 'Application Form');
  X.fillStyle = '#fff'; rr(330, 100, VW - 360, 250, 16); X.fill(); X.strokeStyle = rgba(PB.line); X.lineWidth = 1.5; X.stroke();
  stepper8(400, 160, VW - 500, cur);
  appNoBar(360, 262, VW - 420);
  X.fillStyle = '#fff'; rr(330, 372, VW - 360, 500, 16); X.fill(); X.strokeStyle = rgba(PB.line); X.stroke();
  const st = Math.min(7, Math.round(cur));
  const heads = ['Step 1: Applicant Information', 'Step 2: Vehicle Information', 'Step 3: Loan Request', 'Step 4: Credit Pre-check', 'Step 5: Financial Institution Selection', 'Step 6: Financial Product Selection', 'Step 6: Submit to Financial Institutions', 'Application Progress'];
  uiText(heads[st], 360, 420, 24, PB.text, 700);
  if (st === 6) uiText('Each selected financial product should be packaged, sent, and submitted separately according to the target bank requirements.', 360, 456, 17, PB.mute, 400);
  if (st === 0 || st === 1) for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { const fx = 360 + c * 600, fy = 480 + r * 92; uiText(st ? ['Condition', 'Brand', 'Series', 'Model', 'Colour', 'Fuel Type', 'VIN', 'Total Vehicle Value'][r * 2 + c] : ['Mobile', 'National ID / Iqama', 'Full Name (EN)', 'Full Name (AR)', 'Employer', 'Employment Date', 'Nationality', 'Monthly Income (SAR)'][r * 2 + c], fx, fy, 17, PB.mute, 500); X.fillStyle = '#fff'; rr(fx, fy + 10, 560, 48, 8); X.fill(); X.strokeStyle = rgba(PB.line); X.stroke(); X.fillStyle = rgba(PB.text, .16); rr(fx + 16, fy + 28, 140 + rnd(r * 2 + c + st * 9) * 160, 12, 6); X.fill(); }
  if (st >= 6) {
    uiText('Uploaded Attachments', 360, 510, 20, PB.text, 700);
    ['Identity document', 'Driver license', 'GOSI certificate', 'Salary certificate'].forEach((s, i) => { const y = 540 + i * 64; X.fillStyle = rgba(PB.side); rr(360, y, VW - 420, 52, 10); X.fill(); uiText(s, 384, y + 33, 19, PB.text, 500); X.fillStyle = 'rgba(34,160,90,.12)'; rr(VW - 220, y + 10, 140, 32, 16); X.fill(); uiText('Uploaded', VW - 150, y + 32, 17, [24, 140, 72], 600, UI, 'center'); });
  }
  if (st >= 2 && st <= 5) for (let r = 0; r < 3; r++) { const y = 480 + r * 120; X.fillStyle = rgba(PB.side); rr(360, y, VW - 420, 100, 12); X.fill(); X.fillStyle = rgba(PB.text, .18); rr(384, y + 30, 260, 14, 7); X.fill(); X.fillStyle = rgba(PB.text, .1); rr(384, y + 60, 420, 10, 5); X.fill(); X.fillStyle = rgba(r === 0 ? PB.blue : PB.line); X.beginPath(); X.arc(VW - 110, y + 50, 14, 0, 7); X.fill(); }
  // Next / Submit button
  const lab = st >= 6 ? 'Submit Application' : 'Next';
  X.fillStyle = rgba(PB.blue); rr(VW - 300, 806, 240, 52, 10); X.fill(); uiText(lab, VW - 180, 840, 20, [255, 255, 255], 600, UI, 'center');
}
function pageEstimator(t) {
  shell('Estimator', 'Estimator');
  X.fillStyle = '#fff'; rr(330, 100, VW - 360, 210, 16); X.fill(); X.strokeStyle = rgba(PB.line); X.lineWidth = 1.5; X.stroke();
  const steps = ['Estimator Info', 'Credit Pre-screening', 'Financial Products'], cur = clamp(t, 0, 2);
  steps.forEach((s, i) => { const x = 520 + i * 420, on = Math.round(cur) === i, done = cur >= i + .99; X.beginPath(); X.arc(x, 160, 32, 0, 7); X.fillStyle = on ? rgba(PB.blue) : '#fff'; X.fill(); X.lineWidth = 2; X.strokeStyle = rgba(on || done ? PB.blue : PB.line); X.stroke(); if (done) check(x, 160, 30, PB.blue, 1); else { X.fillStyle = on ? '#fff' : rgba(PB.mute); X.fillRect(x - 8, 148, 16, 22); } uiText(s, x, 222, 21, on ? PB.blue : PB.mute, on ? 700 : 500, UI, 'center'); });
  appNoBar(360, 238, VW - 420, 1);
  X.fillStyle = '#fff'; rr(330, 332, VW - 360, 540, 16); X.fill(); X.strokeStyle = rgba(PB.line); X.stroke();
  uiText('Loan Estimator', 360, 384, 30, PB.text, 700);
  uiText('Enter applicant, vehicle, and finance information to pre-screen credit and match financial products.', 360, 418, 18, PB.mute, 400);
  X.fillStyle = rgba(PB.side); rr(360, 446, 560, 400, 14); X.fill();
  uiText('Applicant Information', 384, 488, 22, PB.text, 700);
  const fs = [['Employer Type', 'Government'], ['Nationality', 'Saudi Arabia'], ['Total Monthly Income (SAR)', '15,000'], ['Salary Transfer Bank', '']];
  fs.forEach(([k, v], i) => { const y = 510 + i * 82; uiText(k, 384, y + 16, 17, PB.text, 500); const n = Math.floor(clamp((lt - (.3 + i * .3)) * 14, 0, v.length)); field(384, y + 26, 512, 46, 'Please select', v.slice(0, n)); });
  X.fillStyle = rgba(PB.side); rr(950, 446, 560, 400, 14); X.fill();
  uiText('Vehicle Information', 974, 488, 22, PB.text, 700);
  ['Condition', 'Brand / Series / Model', 'Total Vehicle Value (SAR)', 'Down Payment'].forEach((k, i) => { const y = 510 + i * 82; uiText(k, 974, y + 16, 17, PB.text, 500); field(974, y + 26, 512, 46, 'Please select', ''); });
}
function pageModels() {
  shell('Model Library', 'Model Library');
  X.fillStyle = '#fff'; rr(330, 100, VW - 360, 772, 16); X.fill(); X.strokeStyle = rgba(PB.line); X.lineWidth = 1.5; X.stroke();
  const cols = ['Type', 'Brand', 'Series', 'Model', 'Year', 'Fuel Type', 'Source'], xs = [360, 520, 700, 880, 1100, 1220, 1350];
  X.fillStyle = rgba(PB.head); X.fillRect(350, 130, VW - 400, 56); cols.forEach((c, i) => uiText(c, xs[i], 166, 19, PB.text, 600));
  const rows = [['SUV', 'JETOUR', 'T1', 'Luxury', '2026', 'Petrol'], ['Sedan', 'PORSCHE', 'Panamera', 'GTS 4.8L V8', '', ''], ['Sedan', 'MERCEDES', 'S CLASS', 'S Class', '', ''], ['exotic', 'FERRARI', 'Fiorano 599', '6.0L V12 COUPE', '', ''], ['Sedan', 'PORSCHE', 'Panamera', '3.6L V6', '', ''], ['Sedan', 'ASTON MARTIN', 'Rapide', '5.9L V12', '', ''], ['Sedan', 'BMW', '2 SERIES', '2 Series', '', '']];
  rows.forEach((r, k) => { const y = 186 + k * 92, a = S(lt - k * .06, 300); X.globalAlpha *= 1; X.save(); X.globalAlpha = X.globalAlpha * a; r.forEach((c, i) => uiText(c, xs[i], y + 54, 19, PB.text, 400)); uiText('Operations Platform', xs[6], y + 54, 19, PB.text, 400); X.fillStyle = rgba(PB.line); X.fillRect(350, y + 91, VW - 400, 1.5); X.restore(); });
}
function pageProducts() {
  shell('Products', 'Products');
  X.fillStyle = '#fff'; rr(330, 100, VW - 360, 772, 16); X.fill(); X.strokeStyle = rgba(PB.line); X.lineWidth = 1.5; X.stroke();
  const cols = ['Financer', 'Product Name', 'Profit Rate', 'Tenure (Months)', 'Maximum Loan Amount', 'Min. Down'], xs = [360, 610, 930, 1060, 1210, 1420];
  X.fillStyle = rgba(PB.head); X.fillRect(350, 130, VW - 400, 56); cols.forEach((c, i) => uiText(c, xs[i], 166, 18, PB.text, 600));
  const rows = [['Alinma Bank', 'Alinma Salary-Transfer Offer', '4%', '60', '2,000,000 SAR', '0%'], ['Alinma Bank', 'Alinma Non-Salary-Transfer Offer', '4%', '60', '1,000,000 SAR', '0%'],
    ['Emirates NBD', 'Emirates NBD Offer', '3.99%', '60', '750,000 SAR', '0%'], ['Emirates NBD', 'Emirates NBD Offer (Self Employed)', '6.99%', '60', '1,000,000 SAR', '10%'],
    ['Saudi Fransi (J-B)', 'J-B Offer (Chinese Car)', '6.99%', '60', '600,000 SAR', '5%'], ['Tamweel AlOula', 'Tamweel Al Oula Offer', '9%', '60', '600,000 SAR', '0%'],
    ['Al Rajhi Bank', 'ARB Campaigns Category D', '5.8%', '60', '1,000,000 SAR', '10%']];
  rows.forEach((r, k) => { const y = 186 + k * 92; X.save(); X.globalAlpha *= S(lt - k * .06, 300); r.forEach((c, i) => uiText(c, xs[i], y + 54, i === 1 ? 17 : 18, i === 0 ? PB.text : PB.text, i === 0 ? 600 : 400)); uiText('View', VW - 72, y + 54, 18, PB.blue, 500, UI, 'right'); X.fillStyle = rgba(PB.line); X.fillRect(350, y + 91, VW - 400, 1.5); X.restore(); });
}
// draw a portal page into a glass frame of w x h
function portal(w, h, fn) { X.save(); X.scale(w / VW, h / VH); fn(); X.restore(); }
// screen position of a portal-space point inside a glass(cx, cy, w, h, ry) frame
function glassPt(cx, cy, w, h, ry, u, v) { const kx = Math.cos(ry), sk = Math.sin(ry) * .12; const lx = u * w / VW - w / 2, ly = v * h / VH - h / 2; return [cx + kx * lx, cy + sk * lx + ly]; }

/* ---------------- studio floor: the brand's blue silk ---------------- */
function studioFloor() {
  const rg = X.createRadialGradient(W / 2, H * .38, 80, W / 2, H * .5, W * .75);
  rg.addColorStop(0, '#fbfcff'); rg.addColorStop(1, '#e8eefb'); X.fillStyle = rg; X.fillRect(0, 0, W, H);
  X.save(); X.globalAlpha = .9;
  for (let k = 0; k < 7; k++) {
    const ph = lt * .25 + k * .5;
    X.strokeStyle = `rgba(${60 + k * 8},${100 + k * 10},${240},${.05 + k * .012})`; X.lineWidth = 70 - k * 8;
    X.beginPath(); X.moveTo(-200, 980 - k * 18); X.bezierCurveTo(500, 880 + Math.sin(ph) * 40 - k * 12, 1100, 1120 - k * 20, 2100, 760 - k * 30 + Math.cos(ph) * 30); X.stroke();
  }
  X.restore();
}

/* ---------------- the scenes that show the portal ---------------- */
// T5 (teaser): the Loan Estimator, three steps, on a glass screen
SC2.T5 = (lt, D, L) => {
  studioFloor();
  const p = S(lt + .1, 90), ry = lerp(.55, .12, p);
  glass(1250, 560, 1060, 596, { ry, a: p, lift: p }, (w, h) => portal(w, h, () => pageEstimator(eio(clamp((lt - 1.2) / (D - 1.6))) * 2)));
  mark(MX + 240, 300, .34, C2.navy, 1, .05);
  inkLine('Financing,', { x: MX, y: 560, size: 110, wt: 900, ls: -4, col: C2.navy, tin: ln2(L, 0) + .2 });
  inkLine('on your', { x: MX, y: 680, size: 110, wt: 900, ls: -4, col: C2.blue, tin: ln2(L, 0) + .45 });
  inkLine('floor.', { x: MX, y: 800, size: 110, wt: 900, ls: -4, col: C2.blue, tin: ln2(L, 0) + .6 });
};
// A3: log in, then the eight-step application, the cursor submitting it
SC2.A3 = (lt, D, L) => {
  studioFloor();
  const t1 = ln2(L, 1), span = ldur(L, 1);
  mark(W / 2, 120, .3, C2.navy, 1, .05);
  inkLine('Financing, on your floor.', { x: W / 2, y: 300, size: 92, wt: 900, ls: -4, col: C2.navy, align: 'center', tin: ln2(L, 0) + .1, stag: .012 });
  const gp = S(lt + .2, 100), ry = lerp(.4, 0, gp), cx = W / 2, cy = 690, gw = 1180, gh = 664;
  const loginEnd = t1 + span * .18, cur = eio(clamp((lt - loginEnd) / (span * .7))) * 7;
  glass(cx, cy, gw, gh, { ry, a: gp, lift: gp }, (w, h) => portal(w, h, () => {
    if (lt < loginEnd) loginScreen({ lang: 'en', typed: clamp((lt - .4) * 1.2, 0, 2), press: lt > loginEnd - .35 ? 1 : 0 });
    else pageForm(lt, cur);
  }));
  // the cursor: Login, then Next ... Submit Application
  const P = (u, v) => glassPt(cx, cy, gw, gh, 0, u, v);
  const lg = P(800, 706), nx = P(VW - 180, 832);
  targetCursor([{ t: .2, x: 1650, y: 1000 }, { t: loginEnd - .4, x: lg[0], y: lg[1], lock: [P(564, 668)[0], P(564, 668)[1], 472 * gw / VW, 76 * gh / VH], click: true }, { t: loginEnd + .9, x: nx[0], y: nx[1], lock: [P(VW - 300, 806)[0], P(VW - 300, 806)[1], 240 * gw / VW, 52 * gh / VH] }, { t: D - .3, x: nx[0], y: nx[1], lock: [P(VW - 300, 806)[0], P(VW - 300, 806)[1], 240 * gw / VW, 52 * gh / VH], click: true }], { col: C2.navy, spark: C2.blue });
};
// A4: one dashboard (sidebar), then the language control: English -> العربية -> 中文
SC2.A4 = (lt, D, L) => {
  studioFloor();
  const t0 = ln2(L, 0), t1 = ln2(L, 1), per = ldur(L, 0) * .9 / 3;
  inkLine('One dashboard.', { x: MX, y: 230, size: 96, wt: 900, ls: -4, col: C2.navy, tin: t0 });
  const k = clamp(Math.floor((lt - t0) / per), 0, 2);
  const labs = [['Requests', 'every application, step by step'], ['Offers', 'every lender’s products, in one table'], ['Your account', 'security center']];
  labs.forEach(([a, b], i) => { const on = i === k && lt < t1 - .1; line(a, { x: MX, y: 360 + i * 92, size: 44, wt: 900, ls: -1, col: on ? C2.blue : C2.navy, a: on ? 1 : .35, tin: t0 + i * .1, stag: .01 }); line(b, { x: MX, y: 396 + i * 92, size: 22, wt: 500, col: C2.grey, a: on ? 1 : .5, tin: t0 + i * .1 + .1, stag: .004 }); });
  const p = S(lt + .1, 100), ry = lerp(.4, .08, p), cx = 1260, cy = 590, gw = 1040, gh = 585;
  const lang = lt < t1 + ldur(L, 1) * .3 ? 'en' : lt < t1 + ldur(L, 1) * .62 ? 'ar' : 'zh';
  const drop = sm(t1 - .1, t1 + .2, lt) * (1 - sm(D - .5, D - .2, lt));
  glass(cx, cy, gw, gh, { ry, a: p, lift: p }, (w, h) => portal(w, h, () => {
    if (lt < t1 - .15) { if (k === 0) pageForm(lt, 6.2); else if (k === 1) pageProducts(); else { shell('Security Center', 'Security Center'); uiText('Reset Password', 700, 220, 30, PB.text, 700); ['Mobile', 'SMS Verification Code', 'New Password', 'Confirm New Password'].forEach((s, i) => { uiText(s, 700, 290 + i * 110, 19, PB.text, 500); field(700, 302 + i * 110, 600, 56, ['Enter mobile number', 'Enter verification code', 'At least 8 chars, letters and numbers', 'Enter password again'][i], ''); }); X.fillStyle = rgba(PB.blue); rr(700, 760, 600, 60, 10); X.fill(); uiText('Confirm And Change', 1000, 798, 22, [255, 255, 255], 600, UI, 'center'); } }
    else loginScreen({ lang, dropdown: drop });
  }));
  inkLine('In Arabic, English', { x: MX, y: 760, size: 40, wt: 900, col: C2.blue, tin: t1, stag: .008 });
  inkLine('or Chinese.', { x: MX, y: 810, size: 40, wt: 900, col: C2.blue, tin: t1 + .2, stag: .008 });
};

/* ---------------- the close: the AutoLink key visual ---------------- */
function brandClose(lt, tc, D, tag) {
  const u = lt - tc; if (u < 0) return;
  const p = clamp(u / .9);
  const kv = IMG.keyvisual; if (!kv) return;
  // PixelTransition reveal of the key visual, then a slow push-in
  const z = 1 + .05 * clamp(u / Math.max(1, D - tc));
  X.save(); X.translate(W / 2, H / 2); X.scale(z, z); X.translate(-W / 2, -H / 2);
  if (p < 1) pixelIn(kv, 0, 0, W, H, eio(p) * 1.05, 48); else X.drawImage(kv, 0, 0, W, H);
  X.restore();
  line(tag, { x: W / 2, y: 170, size: 54, wt: 900, ls: -1, col: C2.navy, align: 'center', tin: tc + .9, stag: .012 });
}
SC2.T7 = (lt, D, L) => { brandClose(lt, 0, D, 'From the showroom floor to KAFD.'); };
BG2.T7 = () => Object.assign({}, STUDIO, { wipe: [C2.blue, C2.navy, C2.white, C2.blue] });
const _A7 = SC2.A7;
SC2.A7 = (lt, D, L) => {
  const t1 = ln2(L, 1), tc = t1 - .35;
  if (lt < tc + .8) { X.save(); _A7(Math.min(lt, tc - .01), D, L); X.restore(); }
  if (lt > tc) { X.save(); brandClose(lt, tc, D, 'Every buyer on your floor, a buyer you can finance.'); X.restore(); }
};
const _B8 = SC2.B8;
SC2.B8 = (lt, D, L) => {
  const tc = ln2(L, 1) - .3;
  if (lt < tc + .6) { X.save(); X.globalAlpha = 1 - sm(tc, tc + .6, lt); X.fillStyle = rgba(C2.ink); X.fillRect(0, 0, W, H);
    mono('OUR FOUNDER', W / 2, 260, 24, C2.teal, S(lt - .1, 200), 'center');
    slam('WE ARE NOT HERE TO', { x: W / 2, y: 430, size: 120, col: C2.white, t0: ln2(L, 0) });
    slam('MAP A MARKET.', { x: W / 2, y: 570, size: 120, col: C2.white, t0: ln2(L, 0) + .5 });
    slam('WE ARE HERE TO MOVE IT.', { x: W / 2, y: 760, size: 110, col: C2.teal, t0: ln2(L, 0) + ldur(L, 0) * .5 }); X.restore(); }
  if (lt > tc) brandClose(lt, tc, D, 'From the showroom floor to KAFD.');
};
BG2.B8 = () => Object.assign({}, NOIR, { wipe: [C2.blue, C2.ink, C2.blue, C2.ink] });
