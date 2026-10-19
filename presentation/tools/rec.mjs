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
    const n = ms > 50 ? Math.ceil(ms / 50) : 1, sub = ms / n;   /* one render per captured frame; long warm-up steps split */   /* sub-steps keep spring and exp smoothing stable */
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
for (let i = 0; i < 90; i++) { await p.evaluate(() => window.__step(33.3)); await p.waitForTimeout(60); }
/* clean frame for video: brand mark stays, controls go */
await p.addStyleTag({ content: ".kbar__act, .kctl, .kseg, #kUp, .kidx, .fly__bar, .fly__ticks, .kctl__hint { display: none !important; }" });
/* one jump to 4.2 s before the excerpt (the deck holds 1.4 s after a jump), then play forward into it the way a viewer would;
   real-time waits let photos and map tiles load as they come into view */
await p.evaluate((t) => { window.__deck.setPlay(false); window.__deck.seek(Math.max(0, +t - 4.2), "jump"); window.__deck.setPlay(true); }, startT);
for (let i = 0; i < 126; i++) { await p.evaluate(() => window.__step(33.33)); await p.waitForTimeout(i < 40 ? 120 : 40); }
const N = Math.round(+durS * +fps), dt = 1000 / +fps, t0 = Date.now();
for (let i = 0; i < N; i++) {
  await p.evaluate((dt) => window.__step(dt), dt);
  await p.screenshot({ path: `${out}/f${String(i).padStart(5, "0")}.jpg`, type: "jpeg", quality: 93 });
}
const st = await p.evaluate(() => window.__deck.state());
console.log(JSON.stringify({ frames: N, secPerFrame: +((Date.now() - t0) / 1000 / N).toFixed(2), T: st.T, errs: errs.slice(0, 5) }));
await b.close();
