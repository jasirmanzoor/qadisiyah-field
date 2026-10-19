/* MaskedHeading: React Bits (reactbits.dev), ported to a framework-free mount for existing headings.
   Same mechanism as the component: transparent measuring text, an SVG clipPath of per-glyph <text>, a drifting media
   layer seen through the glyphs, and a GSAP word-by-word reveal. Additions for this page: accent words (<em>) get their
   own clip and tint so mixed fonts keep their look, and the reveal is driven by the tour (play / rest / settle). */
window.RB = window.RB || {};
(function () {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  let uid = 0;

  /* warm colour mesh, drawn once: the light that drifts inside the letters */
  function mesh(stops) {
    const c = document.createElement("canvas"); c.width = 1200; c.height = 600; const x = c.getContext("2d");
    x.fillStyle = stops[0]; x.fillRect(0, 0, 1200, 600);
    [[180, 160, 520, stops[1]], [880, 420, 560, stops[2]], [560, 80, 420, stops[3]], [1080, 60, 380, stops[1]], [260, 520, 420, stops[2]]].forEach(([cx, cy, r, col]) => {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, 1200, 600);
    });
    return c.toDataURL("image/jpeg", .9);
  }
  let MESH = null, MESH_EM = null;

  window.RB.MaskedHeading = function mount(root, opts) {
    const o = Object.assign({ reveal: "rise", duration: 1.1, stagger: .09, fillScale: 1.25, drift: 18, parallax: 26, brightness: 1, saturation: 1 }, opts);
    if (!MESH) { MESH = mesh(["#fff6ec", "#ffffff", "#ffd9b8", "#ffe9d4"]); MESH_EM = mesh(["#ffc99c", "#ffe1c4", "#ff9f5c", "#ffd2ad"]); }
    const gsap = window.gsap;
    /* read words, remembering which sit inside <em> */
    const words = [];
    (function walk(node, em) {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          /* text that touches the previous word (a full stop after an accent) joins it without a space */
          if (words.length && n.data && !/^\s/.test(n.data) && !words[words.length - 1].sp) words[words.length - 1].tight = true;
          const parts = n.data.split(/\s+/).filter(Boolean);
          parts.forEach((w, k) => words.push({ w, em, sp: k < parts.length - 1 || /\s$/.test(n.data) }));
        }
        else if (n.nodeType === 1) walk(n, em || n.tagName === "EM");
      });
    })(root, false);
    if (!words.length) return null;
    const label = root.textContent.replace(/\s+/g, " ").trim();
    const id = "mh" + (++uid);
    root.classList.add("masked-heading");
    root.innerHTML = "";
    const measure = document.createElement("span"); measure.className = "masked-heading__measure";
    const wordEls = [], baseEls = [];
    words.forEach((wd) => {
      const s = document.createElement("span"); s.className = "masked-heading__word" + (wd.em ? " masked-heading__word--em" : "") + (wd.tight ? " masked-heading__word--tight" : "");
      s.textContent = wd.w; const b = document.createElement("i"); b.className = "masked-heading__baseline"; s.appendChild(b);
      measure.appendChild(s); wordEls.push(s); baseEls.push(b);
    });
    root.appendChild(measure);
    const NS = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(NS, "svg"); defs.setAttribute("class", "masked-heading__defs"); defs.setAttribute("aria-hidden", "true");
    const d = document.createElementNS(NS, "defs"); defs.appendChild(d);
    const clips = [0, 1].map((k) => { const cp = document.createElementNS(NS, "clipPath"); cp.id = `${id}-${k}`; cp.setAttribute("clipPathUnits", "userSpaceOnUse"); d.appendChild(cp); return cp; });
    const glyphs = [];
    words.forEach((wd, w) => Array.from(wd.w).forEach((ch) => { const t = document.createElementNS(NS, "text"); t.textContent = ch; clips[wd.em ? 1 : 0].appendChild(t); glyphs.push({ el: t, w, em: wd.em }); }));
    root.appendChild(defs);
    const reveal = document.createElement("span"); reveal.className = "masked-heading__reveal"; reveal.setAttribute("aria-hidden", "true");
    const medias = [0, 1].map((k) => {
      const clip = document.createElement("span"); clip.className = "masked-heading__clip"; clip.style.clipPath = `url(#${id}-${k})`;
      const media = document.createElement("span"); media.className = "masked-heading__media";
      const img = document.createElement("img"); img.className = "masked-heading__source"; img.alt = ""; img.draggable = false;
      img.src = k ? (o.srcEm || MESH_EM) : (o.src || MESH);
      media.appendChild(img); clip.appendChild(media); reveal.appendChild(clip); return media;
    });
    root.appendChild(reveal);
    /* Text Hover Effect (Aceternity), multi-line: an outline of every glyph draws itself on, and a warm gradient stroke
       is revealed through a radial mask that follows the pointer, or wanders through the letters when nobody is pointing */
    const hov = document.createElementNS(NS, "svg"); hov.setAttribute("class", "masked-heading__hover"); hov.setAttribute("aria-hidden", "true");
    hov.innerHTML = `<defs><linearGradient id="${id}-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="600" y2="0"><stop offset="0" stop-color="#ffd27a"/><stop offset=".3" stop-color="#ff7a1a"/><stop offset=".55" stop-color="#ffe2c2"/><stop offset=".8" stop-color="#ff9a4a"/><stop offset="1" stop-color="#4fd1c9"/></linearGradient>
      <radialGradient id="${id}-r" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="160"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
      <mask id="${id}-m" maskUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%"><rect x="-2000" y="-2000" width="6000" height="6000" fill="url(#${id}-r)"/></mask></defs>
      <g class="mh-draw"></g><g class="mh-glow" mask="url(#${id}-m)" stroke="url(#${id}-g)"></g>`;
    const gDraw = hov.querySelector(".mh-draw"), gGlow = hov.querySelector(".mh-glow"), rgEl = hov.querySelector("radialGradient"), lgEl = hov.querySelector("linearGradient");
    const hovT = glyphs.map((g) => [gDraw, gGlow].map((grp) => { const t = document.createElementNS(NS, "text"); t.textContent = g.el.textContent; grp.appendChild(t); return t; }));
    root.appendChild(hov);
    root.setAttribute("aria-label", label);

    /* geometry: per-glyph boxes, exactly as the component measures them */
    let boxes = [];
    const states = glyphs.map(() => ({ x: 0, y: 0, s: 1 }));
    function renderGlyphs() {
      for (let i = 0; i < glyphs.length; i++) {
        const g = glyphs[i].el, box = boxes[i], st = states[i];
        if (!box || (st.x === 0 && st.y === 0 && st.s === 1)) { if (g.hasAttribute("transform")) { g.removeAttribute("transform"); hovT[i].forEach((h) => h.removeAttribute("transform")); } continue; }
        const s = Math.max(st.s, .0001), tx = box.cx * (1 - s) + st.x * (box.cx - box.lc), ty = box.cy * (1 - s) + st.y;
        const tr = `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})`; g.setAttribute("transform", tr); hovT[i].forEach((h) => h.setAttribute("transform", tr));
      }
    }
    function sync() {
      const rootRect = root.getBoundingClientRect(), ratio = root.offsetWidth ? rootRect.width / root.offsetWidth || 1 : 1;
      if (!root.offsetWidth) return;
      const range = document.createRange(); let index = 0; boxes = [];
      wordEls.forEach((box, w) => {
        const node = box.firstChild, cs = getComputedStyle(box), fontPx = parseFloat(cs.fontSize) || 48;
        const y = baseEls[w].offsetTop;
        let off = 0;
        Array.from(node.data).forEach((ch) => {
          range.setStart(node, off); range.setEnd(node, off + ch.length); off += ch.length;
          const r = range.getBoundingClientRect(), x = (r.left - rootRect.left) / ratio, width = r.width / ratio;
          boxes[index] = { x, y: Math.round(y * 100) / 100, w: width, cx: x + width / 2, cy: y - fontPx * .36, lc: 0 };
          const t = glyphs[index].el; t.setAttribute("x", x.toFixed(2)); t.setAttribute("y", `${y}`);
          t.style.fontFamily = cs.fontFamily; t.style.fontSize = cs.fontSize; t.style.fontWeight = cs.fontWeight; t.style.fontStyle = cs.fontStyle; t.style.letterSpacing = cs.letterSpacing;
          hovT[index].forEach((h) => { h.setAttribute("x", x.toFixed(2)); h.setAttribute("y", `${y}`); h.style.cssText = t.style.cssText; h.style.strokeWidth = Math.max(.8, fontPx * .018).toFixed(2) + "px"; });
          index++;
        });
      });
      const lines = new Map();
      boxes.forEach((b) => { const l = lines.get(b.y) || { left: Infinity, right: -Infinity }; l.left = Math.min(l.left, b.x); l.right = Math.max(l.right, b.x + b.w); lines.set(b.y, l); });
      boxes.forEach((b) => { const l = lines.get(b.y); b.lc = (l.left + l.right) / 2; });
      renderGlyphs(); place();
    }
    /* drifting media + pointer parallax */
    const off = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0, last = 0, clock = 0, alive = true, shown = false;
    const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function place() {
      const scale = o.fillScale, maxX = Math.max(0, (scale - 1) / 2 * root.clientWidth), maxY = Math.max(0, (scale - 1) / 2 * root.clientHeight);
      const tf = `translate3d(${clamp(off.x, -maxX, maxX).toFixed(2)}px, ${clamp(off.y, -maxY, maxY).toFixed(2)}px, 0) scale(${scale})`;
      medias.forEach((m) => { m.style.transform = tf; });
    }
    function frame(now) {
      raf = 0; if (!alive) return;
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now; clock += dt;
      const e = 1 - Math.exp(-dt / .18);
      off.x += (off.tx + Math.sin(clock * .21) * o.drift - off.x) * e; off.y += (off.ty + Math.cos(clock * .17) * o.drift * .6 - off.y) * e;
      if (tween && tween.isActive()) renderGlyphs();
      const W = root.clientWidth || 1, H = root.clientHeight || 1;
      const gx = hover ? hp.x : W * (.5 + .48 * Math.sin(clock * .5)), gy = hover ? hp.y : H * (.5 + .35 * Math.sin(clock * .83 + .7));
      const k2 = 1 - Math.exp(-dt / (hover ? .08 : .4)); mp.x += (gx - mp.x) * k2; mp.y += (gy - mp.y) * k2;
      rgEl.setAttribute("cx", mp.x.toFixed(1)); rgEl.setAttribute("cy", mp.y.toFixed(1)); rgEl.setAttribute("r", Math.max(90, Math.min(W, H * 2.2) * .38).toFixed(0)); lgEl.setAttribute("x2", W.toFixed(0));
      place(); if (shown && !RM) raf = requestAnimationFrame(frame);
    }
    const wake = () => { if (!raf && alive && !RM) { last = 0; raf = requestAnimationFrame(frame); } };
    root.addEventListener("pointermove", (e) => { const r = root.getBoundingClientRect(); off.tx = clamp(((e.clientX - r.left) / (r.width || 1)) * 2 - 1, -1, 1) * -o.parallax; off.ty = clamp(((e.clientY - r.top) / (r.height || 1)) * 2 - 1, -1, 1) * -o.parallax; });
    const hp = { x: 0, y: 0 }, mp = { x: 0, y: 0 }; let hover = false;
    root.addEventListener("pointermove", (e) => { const r = root.getBoundingClientRect(); hp.x = e.clientX - r.left; hp.y = e.clientY - r.top; hover = e.pointerType !== "touch"; });
    root.addEventListener("pointerleave", () => { off.tx = off.ty = 0; hover = false; });
    new ResizeObserver(() => sync()).observe(root);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => alive && sync());

    /* reveal: rise, word by word */
    let tween = null;
    const em = () => parseFloat(getComputedStyle(root).fontSize) || 48;
    function rest() { tween && tween.kill(); const s = em(); states.forEach((st) => { st.x = 0; st.y = s * 1.15; st.s = 1; }); renderGlyphs(); }
    function settle() { tween && tween.kill(); states.forEach((st) => { st.x = 0; st.y = 0; st.s = 1; }); renderGlyphs(); }
    function play(delay = 0, dur = o.duration) {
      shown = true; wake();
      hov.classList.remove("draw"); void hov.getBoundingClientRect(); hov.style.setProperty("--mh-delay", (delay + .2).toFixed(2) + "s"); hov.classList.add("draw");
      if (RM || !gsap) { settle(); return; }
      sync(); const s = em();
      tween && tween.kill();
      tween = gsap.fromTo(states, { x: 0, y: s * 1.15, s: 1 }, { y: 0, duration: dur, delay, stagger: (i) => glyphs[i].w * o.stagger, ease: "power4.out", overwrite: "auto", onUpdate: renderGlyphs, onComplete: renderGlyphs });
    }
    sync(); rest();
    return { play, rest, settle, sync, hide() { shown = false; }, el: root };
  };
})();
