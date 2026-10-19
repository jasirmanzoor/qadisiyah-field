/* Deterministic recorder: the page's clock, animation frames, timers, CSS animations and videos all run on a
   virtual clock that advances exactly 1/fps per captured frame, so the clip is smooth however slow the renderer is.
   usage: node rec.mjs URL OUTDIR W H FPS startT durS [dsf] */
import { chromium } from "/home/user/qadisiyah-field/node_modules/playwright/index.mjs";
const [,, url, out, w, h, fps, startT, durS, dsf] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(dsf || 1) });
const p = await ctx.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.addInitScript(() => {
  let now = 0; const base = Date.now(), rN = performance.now.bind(performance);
  performance.now = () => now; Date.now = () => base + now;
  const RD = window.Date; window.Date = class extends RD { constructor(...a) { a.length ? super(...a) : super(base + now); } static now() { return base + now; } };
  let rid = 0; let raf = new Map();
  window.requestAnimationFrame = (cb) => { raf.set(++rid, cb); return rid; };
  window.cancelAnimationFrame = (id) => { raf.delete(id); };
  let tid = 0; const timers = new Map();
  window.setTimeout = (f, ms = 0, ...a) => { timers.set(++tid, { f, at: now + Math.max(0, +ms || 0), a, iv: 0 }); return tid; };
  window.setInterval = (f, ms = 0, ...a) => { timers.set(++tid, { f, at: now + Math.max(1, +ms || 0), a, iv: Math.max(1, +ms || 0) }); return tid; };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  function runTimers() {
    for (let guard = 0; guard < 500; guard++) {
      let best = null; for (const [id, t] of timers) if (t.at <= now && (!best || t.at < best[1].at)) best = [id, t];
      if (!best) return; const [id, t] = best;
      if (t.iv) t.at += t.iv; else timers.delete(id);
      try { typeof t.f === "function" ? t.f(...t.a) : 0; } catch (e) { console.error(e); }
    }
  }
  function syncCss() {
    for (const a of document.getAnimations()) {
      if (a.__s === undefined) { a.__s = now - (a.currentTime || 0); try { a.pause(); } catch (e) {} }
      try { a.currentTime = now - a.__s; } catch (e) {}
    }
    document.querySelectorAll("video").forEach((v) => {
      if (!v.readyState || !v.duration) return; if (!v.paused) v.pause();
      if (v.__s === undefined) v.__s = now - v.currentTime * 1000;
      const t = ((now - v.__s) / 1000) % v.duration; if (Math.abs(v.currentTime - t) > .02) v.currentTime = t;
    });
  }
  window.__step = (ms) => {
    const n = Math.max(1, Math.round(ms / 16.667)), sub = ms / n;   /* sub-steps keep spring and exp smoothing stable */
    for (let k = 0; k < n; k++) {
      now += sub; runTimers();
      const cur = raf; raf = new Map(); for (const cb of cur.values()) { try { cb(now); } catch (e) { console.error(e); } }
    }
    syncCss();
    return now;
  };
  window.__realNow = rN;
});
await p.goto(url);
/* warm up on the virtual clock while assets load in real time */
await p.waitForTimeout(4000); await p.evaluate(() => document.fonts.ready);   /* cards: wait for fonts in real time, clock stays at zero */
await p.evaluate(() => { document.getAnimations().forEach((a) => { try { a.pause(); a.currentTime = 0; a.__s = performance.now(); } catch (e) {} }); });
const N = Math.round(+durS * +fps), dt = 1000 / +fps, t0 = Date.now();
for (let i = 0; i < N; i++) {
  await p.evaluate((dt) => window.__step(dt), dt);
  await p.screenshot({ path: `${out}/f${String(i).padStart(5, "0")}.jpg`, type: "jpeg", quality: 93 });
}
const st = { T: 0 };
console.log(JSON.stringify({ frames: N, secPerFrame: +((Date.now() - t0) / 1000 / N).toFixed(2), T: st.T, errs: errs.slice(0, 5) }));
await b.close();
