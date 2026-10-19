  /* ==================== Riyadh: satellite → data morph (Cinematic Market Discovery) ==================== */
  (function () {
    const sec = document.getElementById("s-city"), cv = document.getElementById("cityCanvas"), T = window.THREE;
    if (!sec || !cv) return;
    const $ = (id) => document.getElementById(id), TOT = sum(R.map((r) => r.units));
    MET.ext_pop = { cls: "EXTERNAL", label: "Riyadh Region population, 2022 census", value: 8591748, unit: "people", source: "GASTAT 2022 census", n: null, formula: "", note: "Published figure, not part of our census" };
    MET.ext_bld = { cls: "EXTERNAL", label: "Building outlines inside this map frame", value: 758621, unit: "buildings", source: "Microsoft Global ML Building Footprints (ODbL), 2026 release", formula: "count of footprints whose centre falls inside the frame", n: null, note: "Machine-detected from imagery; the base layer of this map, not a field count" };
    CLS.EXTERNAL = "Published source";
    let renderer = null;
    try { if (T) renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: "high-performance" }); } catch (e) { renderer = null; }
    if (!renderer) { sec.classList.add("cmap--off"); window.__city = { build() {}, enter() {}, leave() {} }; return; }
    const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const big = !window.matchMedia("(pointer: coarse)").matches && renderer.capabilities.maxTextureSize >= 4096;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x05070b, 1);
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(42, 1, 0.05, 600);

    /* frame: equirectangular, 1 unit = 1 km */
    const W0 = 46.48, E0 = 47.02, S0 = 24.45, N0 = 25.02, CX = (W0 + E0) / 2, CY = (S0 + N0) / 2;
    const KY = 111.32, KX = KY * Math.cos(24.73 * Math.PI / 180);
    const XY = (lat, lng) => new T.Vector2((lng - CX) * KX, -(lat - CY) * KY);
    const TILES = { q: { w: 46.788117, e: 46.855369, s: 24.794486, n: 24.855571 }, s: { w: 46.649433, e: 46.716686, s: 24.517518, n: 24.578603 } };

    const VS = `varying vec2 vUv; varying vec2 vW; varying float vD;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`;
    const FS = `uniform sampler2D tSat, tData; uniform float uMix, uR, uEdge, uFar, uTime, uReady; uniform vec2 uFocus; varying vec2 vUv; varying vec2 vW; varying float vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec3 s = texture2D(tSat, vUv).rgb; vec3 d = texture2D(tData, vUv).rgb;
        float l = dot(s, vec3(.3,.59,.11)); s = mix(s, vec3(l), .18) * .86;
        float nz = n2(vW * 1.3) * .6 + n2(vW * 5.) * .4;
        float dist = length(vW - uFocus) + (nz - .5) * (.6 + uR * .05);
        float front = uR * uMix * uMix * uMix;
        float m = smoothstep(front + .25, front - .25, dist);
        float edge = exp(-pow((dist - front) / (.18 + front * .03), 2.)) * step(.002, uMix) * step(uMix, .995);
        vec2 g = abs(fract(vW / .5) - .5) / fwidth(vW / .5); float grid = 1. - min(min(g.x, g.y), 1.);
        vec3 col = mix(s, d, m) + vec3(1., .62, .22) * edge * 1.1 + vec3(1., .55, .18) * grid * m * .05;
        col = mix(col, vec3(.02,.027,.043), smoothstep(uFar * .55, uFar, vD));
        float a = 1.; if (uEdge > .5) { vec2 e = min(vUv, 1. - vUv); a = smoothstep(0., uEdge > 1.5 ? .16 : .1, min(e.x, e.y)); }
        gl_FragColor = vec4(col * uReady, a);
      }`;
    const U = { uMix: { value: 0 }, uR: { value: 90 }, uFocus: { value: new T.Vector2() }, uFar: { value: 200 }, uTime: { value: 0 }, uReady: { value: 0 } };
    const blank = new T.DataTexture(new Uint8Array([6, 8, 12, 255]), 1, 1, T.RGBAFormat); blank.needsUpdate = true;
    function layer(w, e, s, n, edge, y) {
      const a = XY(n, w), b = XY(s, e), mat = new T.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: !!edge, depthWrite: !edge,
        uniforms: Object.assign({ tSat: { value: blank }, tData: { value: blank }, uEdge: { value: edge ? 1 : 0 } }, U), extensions: { derivatives: true } });
      const m = new T.Mesh(new T.PlaneGeometry(b.x - a.x, b.y - a.y), mat);
      m.rotation.x = -Math.PI / 2; m.position.set((a.x + b.x) / 2, y, (a.y + b.y) / 2); m.renderOrder = edge ? 1 : 0; scene.add(m); return mat;
    }
    const base = layer(W0, E0, S0, N0, true, 0), tq = layer(TILES.q.w, TILES.q.e, TILES.q.s, TILES.q.n, true, .002), ts = layer(TILES.s.w, TILES.s.e, TILES.s.s, TILES.s.n, true, .002);
    tq.uniforms.uEdge.value = ts.uniforms.uEdge.value = 2;
    scene.children.find((x) => x.material === base).renderOrder = -1;   /* the city layer always sits under the district tiles */

    /* showrooms: located rows only. GPS-confirmed doors are solid pillars; positions from the sheet or a listing are rings */
    const HQ = XY(24.7636, 46.6402), MKC = [new T.Color("#ffb066"), new T.Color("#4fd1c9")];
    const shops = R.filter((r) => r.lat != null && r.lng != null && r.loc !== "missing").map((r) => ({ r, p: XY(r.lat, r.lng), v: r.loc === "verified" }));
    const cen = [0, 1].map((mk) => { const ps = shops.filter((s) => s.r.mk === mk), v = new T.Vector2(); ps.forEach((s) => v.add(s.p)); return v.multiplyScalar(1 / ps.length); });
    const pv = shops.filter((s) => s.v), pr = shops.filter((s) => !s.v);
    const pil = new T.InstancedMesh(new T.BoxGeometry(.016, 1, .016).translate(0, .5, 0), new T.MeshBasicMaterial({ transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false }), pv.length);
    const tmp = new T.Object3D();
    pv.forEach((s, k) => pil.setColorAt(k, MKC[s.r.mk].clone().lerp(new T.Color("#fff3e0"), .15)));
    pil.renderOrder = 4; scene.add(pil);
    const grow = [0, 0], growT = [0, 0];
    function setPillars() {
      pv.forEach((s, k) => { const g = grow[s.r.mk], hgt = (.025 + Math.min(1, (s.r.units || 20) / 180) * .15) * g; tmp.position.set(s.p.x, 0, s.p.y); tmp.scale.set(1, Math.max(.0001, hgt), 1); tmp.updateMatrix(); pil.setMatrixAt(k, tmp.matrix); });
      pil.instanceMatrix.needsUpdate = true;
    }
    const ptGeo = new T.BufferGeometry(), all = pv.concat(pr), pos = new Float32Array(all.length * 3), kind = new Float32Array(all.length), mkA = new Float32Array(all.length);
    all.forEach((s, k) => { pos.set([s.p.x, .004, s.p.y], k * 3); kind[k] = s.v ? 1 : 0; mkA[k] = s.r.mk; });
    ptGeo.setAttribute("position", new T.BufferAttribute(pos, 3)); ptGeo.setAttribute("aKind", new T.BufferAttribute(kind, 1)); ptGeo.setAttribute("aMk", new T.BufferAttribute(mkA, 1));
    const PU = { uShow: { value: new T.Vector2() }, uPx: { value: 1 } };
    const pts = new T.Points(ptGeo, new T.ShaderMaterial({ uniforms: PU, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: `attribute float aKind, aMk; uniform vec2 uShow; uniform float uPx; varying float vK, vA; varying vec3 vC;
        void main(){ vK = aKind; float sh = aMk < .5 ? uShow.x : uShow.y; vA = sh; vC = aMk < .5 ? vec3(1.,.69,.4) : vec3(.31,.82,.79);
          vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = clamp(uPx * (aKind > .5 ? .05 : .045) / -mv.z, 1.5, 22.) * sh; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vK, vA; varying vec3 vC;
        void main(){ float r = length(gl_PointCoord - .5) * 2.; if (r > 1.) discard;
          float a = vK > .5 ? exp(-r * r * 4.) : smoothstep(.62, .78, r) * smoothstep(1., .86, r) * .9;
          gl_FragColor = vec4(vC * (vK > .5 ? 1.4 : 1.), a * vA); }` }));
    pts.renderOrder = 5; scene.add(pts);

    /* district footprint: convex hull with a 50 m survey grid */
    function hull(ps) {
      const p = ps.slice().sort((a, b) => a.x - b.x || a.y - b.y), cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x), lo = [], up = [];
      p.forEach((q) => { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
      p.slice().reverse().forEach((q) => { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); });
      return lo.slice(0, -1).concat(up.slice(0, -1));
    }
    const HU = [0, 1].map(() => ({ uA: { value: 0 }, uC: { value: new T.Color() } }));
    const outlines = [0, 1].map((mk) => {
      const own = shops.filter((s) => s.r.mk === mk && s.r.loc !== "listing" && s.r.loc !== "approximate" && s.p.distanceTo(cen[mk]) < 2.2), h = hull(own.map((s) => s.p)), c = cen[mk];
      const ex = h.map((q) => q.clone().sub(c).multiplyScalar(1).add(q.clone().sub(c).normalize().multiplyScalar(.06)).add(c));
      HU[mk].uC.value.copy(MKC[mk]);
      const shp = new T.Shape(ex.map((q) => new T.Vector2(q.x, -q.y)));
      const fill = new T.Mesh(new T.ShapeGeometry(shp), new T.ShaderMaterial({ uniforms: HU[mk], transparent: true, depthWrite: false, blending: T.AdditiveBlending, extensions: { derivatives: true },
        vertexShader: `varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `uniform float uA; uniform vec3 uC; varying vec2 vW; void main(){ vec2 g = abs(fract(vW / .05) - .5) / fwidth(vW / .05); float l = 1. - min(min(g.x, g.y), 1.); gl_FragColor = vec4(uC, (.025 + l * .14) * uA); }` }));
      fill.rotation.x = -Math.PI / 2; fill.position.y = .006; fill.renderOrder = 3; scene.add(fill);
      const lg = new T.BufferGeometry().setFromPoints(ex.concat([ex[0]]).map((q) => new T.Vector3(q.x, .008, q.y)));
      const line = new T.Line(lg, new T.LineBasicMaterial({ color: MKC[mk], transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
      line.renderOrder = 3; scene.add(line); return line;
    });

    /* arcs from headquarters to each district */
    const arcs = [0, 1].map((mk) => {
      const a = new T.Vector3(HQ.x, 0, HQ.y), b = new T.Vector3(cen[mk].x, 0, cen[mk].y), m = a.clone().lerp(b, .5); m.y = a.distanceTo(b) * .28;
      const g = new T.BufferGeometry().setFromPoints(new T.QuadraticBezierCurve3(a, m, b).getPoints(120));
      const l = new T.Line(g, new T.LineBasicMaterial({ color: MKC[mk], transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false }));
      g.setDrawRange(0, 0); l.renderOrder = 6; scene.add(l); return { l, g, t: 0 };
    });
    const kmQS = cen[0].distanceTo(cen[1]);

    /* HTML labels pinned to the ground */
    const labs = [
      { p: HQ, el: lab("KAFD", "Headquarters", "#fff") },
      { p: cen[0], el: lab("Al Qadisiyah", `${fmt(R.filter((r) => r.mk === 0).length)} showrooms`, "var(--qad)") },
      { p: cen[1], el: lab("Al Shifa", `${fmt(R.filter((r) => r.mk === 1).length)} showrooms`, "var(--shf)") },
    ];
    function lab(t, s, c) { const d = document.createElement("div"); d.className = "clab"; d.innerHTML = `<i style="background:${c}"></i><b>${t}</b><span>${s}</span>`; sec.appendChild(d); return d; }

    /* camera: target, distance, pitch, azimuth */
    const K = [
      { t: new T.Vector2(0, 4), d: 66, p: 70, a: 0 },
      { t: cen[0].clone(), d: 4.1, p: 47, a: 32 },
      { t: cen[1].clone(), d: 3.6, p: 48, a: -24 },
      { t: cen[0].clone().add(cen[1]).add(HQ).multiplyScalar(1 / 3).add(new T.Vector2(1.5, 4.5)), d: 54, p: 60, a: 8 },
    ];
    const cur = { t: K[0].t.clone(), d: 105, p: 86, a: -12 };
    let from = null, to = K[0], tt = 1, dur = 1, lift = 0, beat = -1, active = false, playing = true, raf = 0, last = 0, clock = 0, mixFrom = 0, mixT = 0, mixDelay = 0;
    const ease = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    function moveTo(k, d, lf) { d *= .66; from = { t: cur.t.clone(), d: cur.d, p: cur.p, a: cur.a }; to = Object.assign({}, K[k], { d: K[k].d * (cam.aspect < 1 && (k === 0 || k === 3) ? 1.3 : 1) }); tt = 0; dur = d; lift = lf || 0; }
    function morph(focus, delay) { U.uFocus.value.copy(focus); mixFrom = U.uMix.value; mixT = 0; mixDelay = delay * .62; }
    function build(b) {
      if (b === beat) return; const prev = beat; beat = b;
      if (b === 0) { if (prev < 0 || prev > 0) { Object.assign(cur, { t: K[0].t.clone(), d: prev < 0 ? 105 : cur.d, p: prev < 0 ? 86 : cur.p, a: prev < 0 ? -12 : cur.a }); } moveTo(0, prev < 0 ? 5.2 : 3.2); U.uMix.value = 0; morph(K[0].t, 3.4); }
      if (b === 1) { moveTo(1, 4.6, .4); morph(cen[0], 3.6); }
      if (b === 2) { moveTo(2, 5.6, 2.2); morph(cen[1], 4.4); }
      if (b === 3) { moveTo(3, 4.2); morph(K[3].t, .1); arcs.forEach((a) => { a.t = 0; }); }
      if (RM) { Object.assign(cur, { t: to.t.clone(), d: to.d, p: to.p, a: to.a }); tt = 1; U.uMix.value = 1; mixT = -1; }
    }
    function resize() {
      const w = sec.clientWidth, h = sec.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); cam.aspect = w / h;
      /* shift the picture off the copy: right of it on wide screens, above it on phones */
      if (w > h) cam.setViewOffset(w, h, -w * .17, 0, w, h); else cam.setViewOffset(w, h, 0, h * .14, w, h);
      cam.updateProjectionMatrix(); PU.uPx.value = h * renderer.getPixelRatio() * .9;
    }
    const v3 = new T.Vector3();
    function frame(now) {
      raf = active ? requestAnimationFrame(frame) : 0;
      const dt = last ? Math.min(.5, (now - last) / 1000) : .016; last = now; clock += dt; U.uTime.value = clock;
      /* camera tween */
      if (tt < 1) {
        tt = Math.min(1, tt + dt / dur); const e = ease(tt);
        cur.t.copy(from.t).lerp(to.t, e); cur.d = Math.exp(Math.log(from.d) + (Math.log(to.d) - Math.log(from.d)) * e) * (1 + lift * Math.sin(Math.PI * e));
        cur.p = from.p + (to.p - from.p) * e; let da = ((to.a - from.a + 540) % 360) - 180; cur.a = from.a + da * e;
      } else if (playing && !RM) cur.a += dt * (beat === 0 || beat === 3 ? 1.2 : 2.4);
      /* morph: collapse back to imagery while flying in, then the data front sweeps out from the district */
      if (mixT >= 0) {
        mixT += dt;
        if (mixT < mixDelay) U.uMix.value = Math.max(0, mixFrom * (1 - Math.min(1, mixT / Math.min(1.2, mixDelay * .5))));
        else U.uMix.value = Math.min(1, (mixT - mixDelay) / 2.5);
        if (U.uMix.value >= 1 && mixT > mixDelay) mixT = -1;
      }
      const shown = mixT < 0 ? 1 : Math.max(0, (mixT - mixDelay) / 1.4);
      const wantQ = beat >= 1 ? Math.min(1, beat === 1 ? shown : 1) : 0, wantS = beat >= 2 ? Math.min(1, beat === 2 ? shown : 1) : 0;
      [wantQ, wantS].forEach((w, mk) => { growT[mk] = w; grow[mk] += (growT[mk] - grow[mk]) * Math.min(1, dt * 2.6); });
      setPillars(); PU.uShow.value.set(grow[0], grow[1]);
      outlines.forEach((l, mk) => { l.material.opacity = grow[mk] * .9; HU[mk].uA.value = grow[mk]; });
      arcs.forEach((a) => { if (beat === 3) a.t = Math.min(1, a.t + dt / 2.4); else a.t = Math.max(0, a.t - dt * 2); a.g.setDrawRange(0, Math.floor(ease(a.t) * 121)); });
      /* place camera */
      const port = cam.aspect < 1, p = Math.min(88, cur.p + (port ? 14 : 0)) * Math.PI / 180, a = cur.a * Math.PI / 180, aspectK = port ? 1.5 : 1;
      const d = cur.d * aspectK;
      cam.position.set(cur.t.x + Math.sin(a) * Math.cos(p) * d, Math.sin(p) * d, cur.t.y + Math.cos(a) * Math.cos(p) * d);
      cam.lookAt(cur.t.x, 0, cur.t.y); U.uFar.value = d * 2.6 + 6;
      renderer.render(scene, cam);
      /* labels */
      const w = sec.clientWidth, hgt = sec.clientHeight;
      labs.forEach((L, k) => {
        v3.set(L.p.x, 0, L.p.y).project(cam);
        const vis = beat === 0 || beat === 3 ? 1 : 0, sy = (1 - v3.y) / 2, show = vis && v3.z < 1 && Math.abs(v3.x) < .97 && sy > .08 && sy < (w < hgt ? .56 : .9) && U.uMix.value > .6;
        L.el.style.transform = `translate(${((v3.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v3.y) / 2 * hgt).toFixed(1)}px)`; L.el.classList.toggle("on", !!show); L.el.classList.toggle("flip", v3.x > .3);
      });
    }
    let loaded = false;
    function load() {
      if (loaded) return; loaded = true;
      const tl = new T.TextureLoader(), max = renderer.capabilities.getMaxAnisotropy(), sz = big ? "4k" : "2k";
      const set = (mat, k, url) => tl.load(url, (tx) => { tx.anisotropy = Math.min(8, max); tx.encoding = T.LinearEncoding; mat.uniforms[k].value = tx; U.uReady.value = 1; });
      set(base, "tSat", `city/sat-${sz}.jpg`); set(base, "tData", `city/data-${sz}.jpg`);
      set(tq, "tSat", "city/sat-q.jpg"); set(tq, "tData", "city/tile-q.jpg"); set(ts, "tSat", "city/sat-s.jpg"); set(ts, "tData", "city/tile-s.jpg");
    }
    sec.addEventListener("scene:near", load);
    GL.register(sec, (on) => { active = on; if (on) { load(); resize(); if (!raf) { last = 0; raf = requestAnimationFrame(frame); } } });
    window.addEventListener("resize", () => active && resize());
    window.__city = {
      enter: (p) => { beat = -1; playing = p; },
      build: (b) => build(b),
      play: (p) => { playing = p; },
      leave: () => { beat = -1; },
      state: () => ({ beat, mix: U.uMix.value, d: cur.d }),
      hide: (k) => { const o = scene.children.find((x) => x.material === [base, tq, ts][k]); o.visible = !o.visible; },
      dbg: () => ({ cen: cen.map((c) => [c.x.toFixed(2), c.y.toFixed(2)]), layers: [base, tq, ts].map((m) => { const o = scene.children.find((x) => x.material === m); return [o.position.x.toFixed(2), o.position.z.toFixed(2), o.geometry.parameters.width.toFixed(2), o.geometry.parameters.height.toFixed(2), !!m.uniforms.tSat.value.image, m.uniforms.uEdge.value]; }), cam: [cam.position.x.toFixed(2), cam.position.y.toFixed(2), cam.position.z.toFixed(2)], tgt: [cur.t.x.toFixed(2), cur.t.y.toFixed(2)] }),
      /* QA only: jump to the end state of the current beat, or hold the morph at a value */
      settle: () => { tt = 1; Object.assign(cur, { t: to.t.clone(), d: to.d, p: to.p, a: to.a }); mixT = -1; U.uMix.value = 1; grow[0] = beat >= 1 ? 1 : 0; grow[1] = beat >= 2 ? 1 : 0; arcs.forEach((x) => { x.t = beat === 3 ? 1 : 0; }); },
      hold: (v) => { tt = 1; Object.assign(cur, { t: to.t.clone(), d: to.d, p: to.p, a: to.a }); mixT = -1; U.uMix.value = v; },
    };
    $("cityFoot").innerHTML = `${mchip("ext_bld")} <span>Imagery © Esri, Maxar · Buildings © Microsoft, ODbL</span>`;
    $("cityQ").innerHTML = `<b class="num">${fmt(R.filter((r) => r.mk === 0).length)}</b> showrooms on <b class="num">${MET.area_Q.value.toFixed(2)}</b> km². <b class="num">${fmt(MET.loc_Q.value.verified)}</b> doors confirmed by GPS on the walk. ${mchip("loc_Q")}`;
    const ls = MET.loc_S.value;
    $("cityS").innerHTML = `<b class="num">${fmt(R.filter((r) => r.mk === 1).length)}</b> showrooms. <b class="num">${fmt(ls.verified)}</b> doors confirmed by GPS, <b class="num">${fmt(ls.sheet + ls.listing)}</b> placed from the survey sheet or a listing, <b class="num">${fmt(ls.missing)}</b> without a pin. ${mchip("loc_S")}`;
    $("cityBoth").innerHTML = `${kmQS.toFixed(0)} km apart across the city. <b class="num">${fmt(R.length)}</b> showrooms and <b class="num">${fmt(TOT)}</b> cars, recorded on foot. ${mchip("showrooms_total")}`;
    $("cityRiy").innerHTML = `A region of <b class="num">8.6 million</b> people. Every building in the city, mapped from the sky, before we walk the streets. ${mchip("ext_pop")}`;
  })();
