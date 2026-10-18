  /* ==================== Glass Folio: photographs arrive in a glass folder, fan out, one at a time takes focus ==================== */
  window.Folio = (function () {
    const RMf = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    /* slot templates in container units (0..1): x, y, w (height follows the photo's own aspect), depth, tilt;
       each set is mirrored or not at random, so no two folders lay out alike */
    const LAYOUTS = {
      1: [[[.08, .06, .84, 1, 0]]],
      2: [[[.02, .04, .62, 1, -1], [.5, .36, .48, .6, 1.5]], [[.0, .22, .5, .6, -1.5], [.36, .02, .62, 1, 1]]],
      3: [[[.0, .02, .6, 1, -1], [.56, .0, .42, .7, 2], [.5, .5, .48, .5, -1.5]], [[.04, .38, .44, .55, 1.5], [.3, .0, .66, 1, -.5], [.0, .0, .34, .45, -2.5]]],
      4: [[[.0, .0, .56, 1, -1], [.54, .02, .44, .7, 2], [.56, .52, .3, .45, -2], [.86, .5, .3, .4, 1.5]], [[.2, .0, .6, 1, .5], [.0, .46, .34, .6, -2.5], [.72, .44, .3, .55, 2.5], [.0, .0, .26, .4, 1]]],
      5: [[[.16, .0, .6, 1, -.5], [.0, .5, .32, .6, -2], [.7, .0, .3, .7, 2], [.72, .54, .28, .5, -1.5], [.0, .04, .22, .4, 1.5]]],
    };
    const aspectOf = (img) => img.naturalWidth ? Math.min(1.6, Math.max(.66, img.naturalWidth / img.naturalHeight)) : 1.33;
    const srcOf = (name) => name[0] === "@" ? `video/${name.slice(1)}.jpg` : `photos/${name}.jpg`;

    function mount(host, opts) {
      const o = Object.assign({ hold: 2600, tab: "", accent: "#ff9a4a", auto: true }, opts);
      const root = document.createElement("div"); root.className = "folio"; root.setAttribute("aria-live", "polite");
      root.innerHTML = `<div class="folio__case"><div class="folio__back"></div><div class="folio__tab"><i></i><span></span><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8"/></svg></div>
        <div class="folio__deck"></div><div class="folio__flap"><b></b></div></div><p class="folio__cap"><span class="folio__cap-a"></span><span class="folio__cap-b"></span></p>`;
      host.appendChild(root);
      const kase = root.querySelector(".folio__case"), deck = root.querySelector(".folio__deck"), flap = root.querySelector(".folio__flap"), tab = root.querySelector(".folio__tab span"),
        dot = root.querySelector(".folio__tab i"), ring = root.querySelector(".folio__tab circle"), capA = root.querySelector(".folio__cap-a"), capB = root.querySelector(".folio__cap-b");
      let cards = [], tl = null, timer = 0, focus = -1, items = [], open = false, gen = 0;
      const G = () => window.gsap;

      function layout() {
        const W = deck.clientWidth, H = deck.clientHeight; if (!W || !cards.length) return;
        cards.forEach((c) => {
          const [x, y, w, z, r] = c.slot, ww = w * W, hh = Math.min(H * (z > .8 ? .98 : .62), ww / c.ar);
          c.el.style.width = ww.toFixed(1) + "px"; c.el.style.height = hh.toFixed(1) + "px";
          c.x = Math.max(0, Math.min(W - ww, c.mirror ? W - (x * W + ww) : x * W)); c.y = Math.max(0, Math.min(y * H, H - hh)); c.z = z; c.r = (c.mirror ? -r : r) + (rnd() - .5) * 1.2;
        });
      }
      function place(c, k, f) {   /* f: focused index */
        const on = k === f, gs = G(); if (!gs) return;
        gs.to(c.el, { x: c.x, y: c.y + (on ? -10 : 0), rotation: on ? 0 : c.r, scale: on ? 1.035 : 1, z: on ? 90 : 10 + 30 * c.z, opacity: 1, filter: on ? "brightness(1) saturate(1)" : `brightness(${f < 0 ? .95 : .66}) saturate(${f < 0 ? 1 : .8})`,
          zIndex: on ? 9 : Math.round(c.z * 5), duration: on ? .62 : .5, ease: on ? "back.out(1.6)" : "power3.out", overwrite: "auto" });
      }
      function setFocus(f) {
        focus = f; cards.forEach((c, k) => place(c, k, f));
        const it = items[f]; if (!it) return;
        capB.textContent = capA.textContent; capA.textContent = it[1] || "";
        root.classList.remove("swap"); void root.offsetWidth; root.classList.add("swap");
        if (!RMf && o.auto && items.length > 1) { ring.style.animation = "none"; void ring.getBoundingClientRect(); ring.style.animation = `folioRing ${o.hold}ms linear forwards`; }
      }
      function cycle() { clearInterval(timer); if (!o.auto || items.length < 2) return; timer = setInterval(() => setFocus((focus + 1) % items.length), o.hold); }

      /* show a set: [[photo, caption], ...] */
      function show(list, meta = {}) {
        const my = ++gen; clearInterval(timer);
        const gs = G(); items = (list || []).slice(0, 5);
        const go = () => {
          if (my !== gen) return;
          deck.innerHTML = ""; seed = 1 + Math.floor((meta.seed || items.length * 97 + (items[0] ? items[0][0].length : 0)) * 7919) % 2147483646;
          const pool = LAYOUTS[items.length] || LAYOUTS[5], tpl = pool[Math.floor(rnd() * pool.length)], mirror = rnd() > .5;
          cards = items.map(([name], k) => {
            const el = document.createElement("figure"); el.className = "folio__card" + (name[0] === "@" ? " is-vid" : "");
            el.innerHTML = name[0] === "@" ? `<video muted loop playsinline autoplay src="video/${name.slice(1)}.mp4" poster="${srcOf(name)}"></video><i class="folio__rec">REC</i>` : `<img alt="" decoding="async" src="${srcOf(name)}">`;
            deck.appendChild(el);
            return { el, slot: tpl[k], mirror, ar: 1.33 };
          });
          tab.textContent = meta.tab || o.tab; dot.style.background = meta.color || o.accent;
          /* shapes are known up front (measured at build time), so the folder opens at once; each photo fades in as it lands */
          cards.forEach((c, k) => {
            const known = (window.PHOTO_AR || {})[items[k][0]]; c.ar = known ? Math.min(1.6, Math.max(.66, known)) : (items[k][0][0] === "@" ? 16 / 9 : 1.33);
            const im = c.el.querySelector("img"); if (im && !(im.complete && im.naturalWidth)) { c.el.classList.add("is-loading"); im.onload = () => c.el.classList.remove("is-loading"); }
          });
          layout(); openUp();
        };
        if (open && cards.length) closeDown(go); else go();
      }
      function openUp() {
        open = true; root.classList.add("on"); const gs = G();
        if (!gs || RMf) { cards.forEach((c, k) => { c.el.style.transform = `translate(${c.x}px, ${c.y}px) rotate(${c.r}deg)`; c.el.style.opacity = 1; }); setFocus(0); cycle(); return; }
        tl && tl.kill();
        const H = deck.clientHeight;
        tl = gs.timeline();
        tl.fromTo(kase, { y: 60, rotationX: 22, opacity: 0, scale: .94 }, { y: 0, rotationX: 0, opacity: 1, scale: 1, duration: .7, ease: "expo.out" }, 0)
          .fromTo(flap, { rotationX: 0, opacity: 1 }, { rotationX: 96, opacity: 0, duration: .6, ease: "power3.inOut" }, .26);
        cards.forEach((c, k) => {
          gs.set(c.el, { x: c.x * .3 + deck.clientWidth * .35, y: H * .9, rotation: (k % 2 ? 6 : -6), scale: .7, opacity: 0, z: -120 });
          tl.to(c.el, { x: c.x, y: c.y, rotation: c.r, scale: 1, opacity: 1, z: 10 + 30 * c.z, duration: .82 + rnd() * .22, ease: "expo.out" }, .52 + k * (.07 + rnd() * .05));
        });
        tl.call(() => { setFocus(0); cycle(); }, null, .62 + cards.length * .09);
      }
      function closeDown(then) {
        clearInterval(timer); const gs = G(); open = false;
        if (!gs || RMf || !cards.length) { root.classList.remove("on"); then && then(); return; }
        tl && tl.kill(); const H = deck.clientHeight;
        tl = gs.timeline({ onComplete: () => { if (!then) root.classList.remove("on"); then && then(); } });
        cards.slice().reverse().forEach((c, k) => tl.to(c.el, { y: H * .85, x: deck.clientWidth * .35, rotation: 0, scale: .72, opacity: 0, duration: .34, ease: "power3.in" }, k * .04));
        tl.to(flap, { rotationX: 0, opacity: 1, duration: .3, ease: "power2.in" }, .12).to(kase, { y: 40, opacity: then ? 1 : 0, scale: .96, duration: .3, ease: "power2.in" }, .2);
      }
      new ResizeObserver(() => { if (open) { layout(); cards.forEach((c, k) => place(c, k, focus)); } }).observe(deck);
      return { show, hide: () => { gen++; closeDown(null); }, focus: (k) => { clearInterval(timer); setFocus(((k % items.length) + items.length) % items.length); }, el: root, get count() { return items.length; } };
    }
    return { mount };
  })();
