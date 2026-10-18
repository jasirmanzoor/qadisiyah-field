  /* ==================== Pinned decks: a stop's photographs ride above its building on a beam of light ==================== */
  window.PinDeck = (function () {
    const RMp = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const AR = () => window.PHOTO_AR || {};
    const srcOf = (n) => n[0] === "@" ? `video/${n.slice(1)}.jpg` : `photos/${n}.jpg`;
    function mount(host) {
      const el = document.createElement("div"); el.className = "pin"; el.setAttribute("aria-live", "polite");
      el.innerHTML = `<svg class="pin__beam" aria-hidden="true"><defs><linearGradient id="pinG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffb066" stop-opacity=".95"/><stop offset="1" stop-color="#ffb066" stop-opacity=".15"/></linearGradient></defs><path/><circle class="pin__dot" r="4.5"/><circle class="pin__ring" r="10"/><circle class="pin__ring pin__ring--2" r="10"/></svg>
        <div class="pin__deck"><div class="pin__stack"></div><div class="pin__meta"><span class="pin__n"></span><b class="pin__t"></b><span class="pin__c"></span></div></div>`;
      host.appendChild(el);
      const deck = el.querySelector(".pin__deck"), stack = el.querySelector(".pin__stack"), path = el.querySelector(".pin__beam path"), dot = el.querySelector(".pin__dot"),
        rings = [...el.querySelectorAll(".pin__ring")], nEl = el.querySelector(".pin__n"), tEl = el.querySelector(".pin__t"), cEl = el.querySelector(".pin__c");
      let items = [], cards = [], front = 0, timer = 0, on = false, gen = 0, W = 0, H = 0;
      const pos = { x: 0, y: 0, ax: 0, ay: 0, init: false, vis: 0 };
      const G = () => window.gsap;
      function size() { W = host.clientWidth; H = host.clientHeight; }
      function cw() { const port = W < H; return port ? Math.min(W * .62, 300) : Math.min(Math.max(W * .23, 260), 400); }
      function order() {
        const gs = G(), n = cards.length;
        cards.forEach((c, k) => {
          const d = (k - front + n) % n;                    /* depth in the deck: 0 = front */
          const tgt = { x: d * 16, y: -d * 12, z: -d * 50, rotationY: -d * 3, rotationZ: d * 1.8, scale: 1 - d * .06, opacity: d > 3 ? 0 : 1 - d * .18, zIndex: 10 - d };
          if (gs && !RMp) gs.to(c, Object.assign({ duration: d === n - 1 && n > 1 ? .75 : .6, ease: d === 0 ? "expo.out" : "power3.out", overwrite: "auto" }, tgt));
          else Object.assign(c.style, { transform: `translate(${tgt.x}px,${tgt.y}px) scale(${tgt.scale})`, opacity: tgt.opacity, zIndex: tgt.zIndex });
          c.classList.toggle("is-front", d === 0);
        });
        const it = items[front]; cEl.textContent = it ? it[1] || "" : "";
        nEl.textContent = items.length > 1 ? `${String(front + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}` : "";
        el.classList.remove("tick"); void el.offsetWidth; el.classList.add("tick");
      }
      function advance() {
        const gs = G(), out = cards[front];
        if (gs && !RMp && cards.length > 1) {
          /* the front card lifts, swings past the camera and tucks in at the back */
          gs.timeline().to(out, { y: -46, rotationX: 18, rotationY: 24, scale: 1.04, duration: .32, ease: "power2.out" })
            .add(() => { front = (front + 1) % cards.length; order(); });
        } else { front = (front + 1) % cards.length; order(); }
      }
      function show(list, meta = {}) {
        const my = ++gen; clearInterval(timer); size();
        items = (list || []).slice(0, 6); front = 0;
        if (!items.length) { hide(); return; }
        const build = () => {
          if (my !== gen) return;
          stack.innerHTML = "";
          const w = cw();
          cards = items.map(([n]) => {
            const c = document.createElement("figure"); c.className = "pin__card" + (n[0] === "@" ? " is-vid" : "");
            const ar = Math.min(1.5, Math.max(.75, AR()[n] || 1.33)), h = w / ar;
            c.style.width = w + "px"; c.style.height = Math.min(h, (W < H ? H * .3 : H * .46)) + "px";
            c.innerHTML = n[0] === "@" ? `<video muted loop playsinline autoplay src="video/${n.slice(1)}.mp4" poster="${srcOf(n)}"></video>` : `<img alt="" decoding="async" src="${srcOf(n)}">`;
            const im = c.querySelector("img"); if (im) { c.classList.add("is-loading"); im.onload = () => c.classList.remove("is-loading"); if (im.complete && im.naturalWidth) c.classList.remove("is-loading"); }
            stack.appendChild(c); return c;
          });
          tEl.textContent = meta.title || "";
          el.style.setProperty("--pin-c", meta.color || "#ffb066");
          const gs = G(); on = true; el.classList.add("on");
          if (gs && !RMp) {
            cards.forEach((c, k) => gs.set(c, { x: 0, y: 40, z: -200, rotationX: -30, scale: .7, opacity: 0, zIndex: 10 - k }));
            gs.fromTo(deck, { opacity: 0, scale: .82, rotationX: -14 }, { opacity: 1, scale: 1, rotationX: 0, duration: .8, ease: "expo.out" });
            gs.delayedCall(.08, order);
          } else order();
          if (items.length > 1) timer = setInterval(advance, meta.hold || 2600);
        };
        if (on && cards.length && G() && !RMp) { G().to(deck, { opacity: 0, scale: .9, y: 20, duration: .28, ease: "power2.in", onComplete: () => { G().set(deck, { y: 0 }); build(); } }); }
        else build();
      }
      function hide() { gen++; clearInterval(timer); on = false; el.classList.remove("on"); }
      /* anchor: screen position of the building (px), whether it is on screen; the deck floats in a safe zone above it */
      function anchor(ax, ay, visible, dt) {
        if (!on) return;
        if (!W) size();
        const port = W < H, w = cw(), dh = cards[0] ? cards[0].offsetHeight : w * .75;
        /* the safe zone keeps clear of the story text: right half on wide screens, the top band on phones */
        const zx0 = port ? 14 : W * .5, zx1 = W - 24 - w, zy0 = port ? H * .14 : H * .14, zy1 = port ? H * .5 - dh : H * .78 - dh - 40;
        let tx = ax + (port ? -w / 2 : 70), ty = ay - dh - (port ? 70 : 110);
        tx = Math.max(zx0, Math.min(zx1, tx)); ty = Math.max(zy0, Math.min(Math.max(zy0, zy1), ty));
        const k = pos.init ? 1 - Math.exp(-(dt || .016) / .22) : 1; pos.init = true;
        pos.x += (tx - pos.x) * k; pos.y += (ty - pos.y) * k;
        pos.vis += ((visible ? 1 : 0) - pos.vis) * (1 - Math.exp(-(dt || .016) / .25));
        /* the deck leans toward its building, the way a sign leans in a wind */
        const lean = Math.max(-5, Math.min(5, (ax - (pos.x + w / 2)) / W * 16));
        deck.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0) rotateY(${lean.toFixed(2)}deg)`;
        /* beam: from the ground pin up to the deck's lower corner, as a soft curve */
        const bx = pos.x + (ax < pos.x + w / 2 ? 22 : w - 22), by = pos.y + dh + 16, cx = (ax + bx) / 2, cy = Math.min(ay, by) - 30;
        const a = visible ? pos.vis : 0;
        path.setAttribute("d", `M${ax.toFixed(1)},${ay.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`);
        path.style.opacity = (a * .9).toFixed(3);
        dot.setAttribute("cx", ax.toFixed(1)); dot.setAttribute("cy", ay.toFixed(1)); dot.style.opacity = a.toFixed(3);
        rings.forEach((r) => { r.setAttribute("cx", ax.toFixed(1)); r.setAttribute("cy", ay.toFixed(1)); r.style.opacity = a.toFixed(3); });
      }
      new ResizeObserver(size).observe(host);
      const seen = new Set();
      function preload(lists) { lists.forEach((l) => (l || []).forEach(([n]) => { if (seen.has(n) || n[0] === "@") return; seen.add(n); const im = new Image(); im.decoding = "async"; im.src = srcOf(n); })); }
      return { show, hide, anchor, preload };
    }
    return { mount };
  })();
