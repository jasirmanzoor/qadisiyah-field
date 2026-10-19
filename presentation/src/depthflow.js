  /* ==================== Depth Blur Carousel: a 3D coverflow, the centre card sharp, the sides turned away and softened ====================
     Our own build of the Framer "Depth Blur Carousel" idea (centre card, side cards narrower, rotateY and depth by distance, wrap-around,
     springy settle), with the blur it names but does not apply drawn on the side cards. Same mount API as the Glass Folio. */
  window.DepthFlow = (function () {
    const RMd = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const srcOf = (n) => n[0] === "@" ? `video/${n.slice(1)}.jpg` : `photos/${n}.jpg`;
    function mount(host, opts) {
      const o = Object.assign({ hold: 2300, accent: "#ff9a4a", maxRot: 62, blur: 9, depth: 200, gap: 28 }, opts);
      const root = document.createElement("div"); root.className = "dbc"; root.setAttribute("aria-live", "polite");
      root.innerHTML = `<div class="dbc__stage"></div><p class="dbc__cap"><i></i><b></b><span></span></p>`;
      host.appendChild(root);
      const stage = root.querySelector(".dbc__stage"), capB = root.querySelector(".dbc__cap b"), capN = root.querySelector(".dbc__cap span"), dot = root.querySelector(".dbc__cap i");
      let items = [], cards = [], target = 0, v = 0, vel = 0, raf = 0, last = 0, timer = 0, W = 0, H = 0, iw = 0, ih = 0, sw = 0, gen = 0, open = false;
      function size() {
        W = host.clientWidth; H = host.clientHeight; if (!W) return;
        const port = W < H; iw = Math.min(W * (port ? .78 : .5), H * (port ? .42 : .7) * 1.5); ih = iw / 1.5; sw = iw * .62; root.style.setProperty("--ih", ih.toFixed(0) + "px");
        cards.forEach((c) => { c.el.style.width = iw + "px"; c.el.style.height = ih + "px"; c.el.style.marginLeft = -iw / 2 + "px"; c.el.style.marginTop = -ih / 2 + "px"; });
      }
      /* signed distance on the ring, so the last card sits beside the first */
      const ring = (k) => { const n = items.length; let m = ((k - v) % n + n) % n; if (m > n / 2) m -= n; return m; };
      function paint() {
        const n = cards.length, side = sw + o.gap, c2n = iw / 2 + o.gap + sw / 2;
        cards.forEach((c, k) => {
          const d = ring(k), a = Math.abs(d), s = Math.sign(d);
          const x = a === 0 ? 0 : a <= 1 ? s * c2n * a : s * (c2n + (a - 1) * side * .85);
          const sc = 1 - Math.min(1, a) * (1 - sw / iw), rot = s * Math.min(a * 35, o.maxRot), z = -a * o.depth;
          c.el.style.transform = `translate3d(${x.toFixed(1)}px,0,${z.toFixed(0)}px) rotateY(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
          c.el.style.zIndex = 1000 - Math.round(a * 10);
          c.el.style.opacity = a >= 3 ? 0 : (a > 2 ? 3 - a : 1).toFixed(3);
          const bl = a < .04 ? 0 : Math.min(o.blur, a * o.blur * .8);
          c.im.style.filter = bl ? `blur(${bl.toFixed(2)}px) brightness(${(1 - Math.min(.45, a * .3)).toFixed(3)})` : "";
          c.el.style.visibility = a > 3 ? "hidden" : "";
        });
        const f = ((Math.round(v) % n) + n) % n, it = items[f];
        if (it && capB.textContent !== (it[1] || "")) { capB.textContent = it[1] || ""; root.classList.remove("swap"); void root.offsetWidth; root.classList.add("swap"); }
        capN.textContent = n > 1 ? `${String(f + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}` : "";
      }
      function frame(now) {
        raf = open ? requestAnimationFrame(frame) : 0;
        const dt = last ? Math.min(.05, (now - last) / 1000) : .016; last = now;
        /* critically-damped-ish spring toward the target card */
        const k = 70, dmp = 13; vel += ((target - v) * k - vel * dmp) * dt; v += vel * dt; paint();
      }
      function go(t) { target = t; if (RMd) { v = t; paint(); } }
      function show(list, meta = {}) {
        gen++; clearInterval(timer); items = (list || []).slice(0, 8); stage.innerHTML = "";
        if (!items.length) return hide();
        cards = items.map(([name]) => {
          const el = document.createElement("figure"); el.className = "dbc__card";
          el.innerHTML = `<img alt="" decoding="async" src="${srcOf(name)}">`;
          const im = el.firstChild, fc = (window.PHOTO_FOCUS || {})[name]; if (fc) im.style.objectPosition = `${fc[0]}% ${fc[1]}%`;
          stage.appendChild(el); return { el, im };
        });
        dot.style.background = meta.color || o.accent; v = -.9; vel = 0; target = 0; last = 0; size();
        root.classList.add("on"); open = true; if (!raf) raf = requestAnimationFrame(frame);
        if (items.length > 1) timer = setInterval(() => go(Math.round(target) + 1), o.hold);
      }
      function hide() { gen++; clearInterval(timer); open = false; root.classList.remove("on"); }
      new ResizeObserver(size).observe(host);
      return { show, hide, focus: (k) => { clearInterval(timer); go(k); }, el: root, get count() { return items.length; } };
    }
    return { mount };
  })();
