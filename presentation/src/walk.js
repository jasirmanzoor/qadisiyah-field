  /* ==================== The virtual walk: a shuffle deck of real showroom photos, one district at a time ====================
     Our own build of the Framer "Carousel 01" shuffle deck: the front card sits flat, two more fan out behind it, and each turn
     the front card is dealt away and the next comes forward. Cards carry the floor's name, its district and its counted cars. */
  (function () {
    const sec = document.getElementById("s-walk"); if (!sec) return;
    const $ = (id) => document.getElementById(id), RMw = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const KEY = [0, 1], TAB = ["Al Qadisiyah", "Al Shifa"];
    /* the largest floors of each district that we photographed on the walk; the pin status is the census's own, not a guess */
    const sets = KEY.map((mk) => R.filter((r) => r.mk === mk && r.photos && r.photos.length && !(r.ar === "" && !r.en))
      .sort((a, b) => (b.units || 0) - (a.units || 0)).slice(0, 7).map((r) => ({ src: `photos/${r.photos[0]}.jpg`, name: r.en, units: r.units, mk })));
    const root = $("walkDeck"), thumbs = $("walkThumbs"), cnt = $("walkCnt");
    let list = [], cur = 0, timer = 0, W = 0, H = 0, cw = 0, ch = 0;
    function size() {
      W = root.clientWidth; H = root.clientHeight; if (!W) return;
      const port = W < H * .9; cw = Math.min(W * (port ? .9 : .78), 760); ch = Math.min(H * .74, cw * (port ? .86 : .68));
      root.style.setProperty("--cw", cw.toFixed(0) + "px"); root.style.setProperty("--ch", ch.toFixed(0) + "px");
    }
    function paint(first) {
      const n = list.length; if (!n) return;
      [...root.querySelectorAll(".wk__card")].forEach((el) => {
        const k = +el.dataset.k, rank = ((k - cur) % n + n) % n, side = rank === 1 ? -1 : 1;
        const show = rank <= 2, x = rank === 0 ? 0 : side * (cw * .075), y = rank === 0 ? 10 : rank === 1 ? -9 : -23, rot = rank === 0 ? 0 : side * 7, sc = rank === 0 ? 1 : rank === 1 ? .955 : .91;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y}px) rotate(${rot}deg) scale(${sc})`;
        el.style.opacity = show ? 1 : 0; el.style.zIndex = show ? 10 - rank : 0; el.style.pointerEvents = "none";
        el.classList.toggle("is-front", rank === 0);
      });
      [...thumbs.children].forEach((t, k) => t.classList.toggle("on", k === cur));
      cnt.textContent = `${String(cur + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
    }
    function build(bb) {
      clearInterval(timer); size(); list = sets[Math.min(1, bb)] || []; cur = 0;
      root.querySelector(".wk__stack").innerHTML = list.map((c, k) => `<figure class="wk__card" data-k="${k}"><div class="wk__img"><img alt="" decoding="async" src="${c.src}"></div>
        <figcaption><b>${esc(c.name)}</b><span>${TAB[c.mk]} · ${c.units ? fmt(c.units) + " cars counted" : "survey floor"}</span></figcaption></figure>`).join("");
      thumbs.innerHTML = list.map((c) => `<i style="background-image:url(${c.src})"></i>`).join("");
      root.dataset.mk = bb; paint(true);
      if (list.length > 1 && !RMw) timer = setInterval(() => { if (!sec.classList.contains("is-on")) return clearInterval(timer); cur = (cur + 1) % list.length; paint(); }, 1550);
    }
    new ResizeObserver(() => { size(); paint(); }).observe(root);
    window.__walk = { build, sets };
  })();
