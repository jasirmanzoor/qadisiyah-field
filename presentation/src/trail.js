  /* ==================== the photo trail: SmoothImageCursor (Framer), ported ====================
     As the pointer moves, a showroom photo drops every `spacing` px of travel, sized and tilted at random, then shrinks to
     55% and fades out (the component's own rules). Extended for the keynote: the whole vetted set rotates through it, fast
     moves are filled in along the path so the trail never gaps, a finger drag works like the mouse, and while the show
     plays hands-off an unseen cursor traces a slow figure-eight so the chapter performs on its own. */
  (function () {
    const sec = document.getElementById("s-trail"), box = document.getElementById("trailBox"); if (!sec || !box) return;
    const LIST = (box.dataset.list || "").split(",").filter(Boolean);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const POOL = LIST.map((f) => [f, rnd()]).sort((a, b) => a[1] - b[1]).map((x) => "photos/t/" + x[0]);   /* shuffled once, the same every visit */
    const O = { spacing: 46, sizeRand: .2, rot: 16, life: 1.15, max: 22, opacity: 1, radius: 14 };
    const size = () => Math.round(Math.min(260, Math.max(130, innerWidth * .15)));
    let live = [], idx = 0, last = null, raf = 0, on = false, ghostT = 0, ghostOn = true, lastReal = 0, prevNow = 0;
    const count = document.getElementById("trailN"), b0 = () => box.clientWidth || innerWidth;
    const pre = []; const warm = () => { if (pre.length) return; POOL.forEach((src) => { const im = new Image(); im.decoding = "async"; im.src = src; pre.push(im); }); };
    function spawn(x, y) {
      const el = document.createElement("div"), s = Math.max(1, size() * (1 + (rnd() * 2 - 1) * O.sizeRand)), r = (rnd() * 2 - 1) * O.rot;
      el.className = "trail__s"; el.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px;border-radius:${O.radius}px`;
      el.innerHTML = `<img src="${POOL[idx % POOL.length]}" alt="" draggable="false">`;
      box.appendChild(el); live.push({ el, t: performance.now(), r }); idx++;
      if (count) count.textContent = String((idx - 1) % POOL.length + 1).padStart(2, "0");
      while (live.length > O.max) live.shift().el.remove();
    }
    function moveTo(x, y) {                                   /* spawn along the path at a fixed spacing: no gaps on a fast flick */
      if (!last) { last = { x, y }; spawn(x, y); return; }
      let dx = x - last.x, dy = y - last.y, d = Math.hypot(dx, dy);
      while (d >= O.spacing) { const k = O.spacing / d; last = { x: last.x + dx * k, y: last.y + dy * k }; spawn(last.x, last.y); dx = x - last.x; dy = y - last.y; d = Math.hypot(dx, dy); }
    }
    function tick(now) {
      const dt = prevNow ? Math.min(.05, (now - prevNow) / 1000) : .016; prevNow = now;
      if (ghostOn && now - lastReal > 2600) {                /* the unseen cursor: a lemniscate across the stage */
        ghostT += dt * Math.max(.7, 1.05 * 900 / Math.max(600, b0()));   /* a steady ~900 px/s on screen, whatever its width */ const b = box.getBoundingClientRect(), a = ghostT, s = Math.sin(a), c = Math.cos(a), den = 1 + s * s;
        moveTo(b.width * (.5 + .36 * c / den), b.height * (.52 + .3 * s * c / den));
      }
      const life = O.life * 1000;
      live = live.filter((it) => { const p = (now - it.t) / life; if (p >= 1) { it.el.remove(); return false; }
        it.el.style.opacity = (O.opacity * (1 - p)).toFixed(3); it.el.style.transform = `translate(-50%, -50%) rotate(${it.r.toFixed(1)}deg) scale(${(1 - p * .45).toFixed(3)})`; return true; });
      raf = on || live.length ? requestAnimationFrame(tick) : 0; if (!raf) prevNow = 0;
    }
    const start = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const local = (e) => { const b = box.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top, e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom]; };
    const real = (e) => { if (!on) return; const [x, y, inside] = local(e); if (!inside) { last = null; return; } if (ghostOn && performance.now() - lastReal > 2600) last = null; lastReal = performance.now(); moveTo(x, y); start(); };
    window.addEventListener("pointermove", real, { passive: true });
    window.addEventListener("touchmove", (e) => e.touches[0] && real(e.touches[0]), { passive: true });
    sec.addEventListener("scene:near", warm);
    new MutationObserver(() => { const now = sec.classList.contains("is-on"); if (now === on) return; on = now; if (on) { warm(); ghostT = 0; last = null; start(); } }).observe(sec, { attributes: true, attributeFilter: ["class"] });
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { ghostOn = false; O.life = .6; }
  })();
