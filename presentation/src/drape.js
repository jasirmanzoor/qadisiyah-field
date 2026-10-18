  /* ==================== Spectral Drape: a glowing drape of dots folding in 3D ====================
     Our own WebGL build of the React Bits Pro concept, same prop names. A dot grid is lifted by flowing strands
     into folds; dots warm from the base colour to the highlight along the crests; the pointer pushes dots aside
     and turns the view; clicks send a ripple that lights the grid. */
  window.SpectralDrape = function mount(host, props) {
    const T = window.THREE; if (!T) return null;
    const P = Object.assign({ colors: ["#c2410c", "#ffd9b0"], backgroundColor: "transparent", density: 1, dotSize: 1, strands: 8, amplitude: 1, frequency: 1, thickness: .7, depth: 1, softness: .6,
      intensity: 1, colorShift: .3, tilt: -40, turn: -45, roll: 110, zoom: 1, flow: 1, speed: 1, interactive: true, brush: 1, brushRadius: .2, parallax: 1, clickRipples: true, seed: 0, paused: false, dpr: 2 }, props);
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" }); } catch (e) { return null; }
    const coarse = matchMedia("(pointer: coarse)").matches, RMd = matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, P.dpr, coarse ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    const cv = renderer.domElement; cv.className = "drape__cv"; host.appendChild(cv);
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(36, 1, .1, 50); cam.position.set(0, 0, 4.2);
    /* grid: about 44,000 dots at density 1 (fewer on phones) */
    const n = Math.round(Math.sqrt(44000 * Math.min(2.5, Math.max(.2, P.density)) * (coarse ? .55 : 1))), nx = Math.round(n * 1.25), ny = Math.round(n / 1.25);
    const pos = new Float32Array(nx * ny * 3), rnd = new Float32Array(nx * ny); let k = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++, k++) { pos[k * 3] = (i / (nx - 1) - .5) * 3.2; pos[k * 3 + 1] = (j / (ny - 1) - .5) * 2.2; rnd[k] = Math.random(); }
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(pos, 3)); geo.setAttribute("aR", new T.BufferAttribute(rnd, 1));
    const col = (h) => new T.Color(h);
    /* strands: each a sine path across the drape, with its own phase, speed and lift */
    let s = (P.seed * 9301 + 49297) % 233280; const sr = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const NS = Math.max(1, Math.min(12, P.strands)), SD = []; for (let q = 0; q < 12; q++) SD.push(new T.Vector4(sr() * 2 - 1, sr() * 6.283, .5 + sr(), .6 + sr() * .8));
    const U = {
      uT: { value: 0 }, uStr: { value: SD }, uNS: { value: NS }, uAmp: { value: P.amplitude }, uFreq: { value: P.frequency }, uThk: { value: P.thickness }, uDepth: { value: P.depth },
      uA: { value: col(P.colors[0]) }, uB: { value: col(P.colors[1]) }, uShift: { value: P.colorShift }, uInt: { value: P.intensity }, uSoft: { value: P.softness },
      uSize: { value: P.dotSize }, uPx: { value: 1 }, uPtr: { value: new T.Vector3(9, 9, 0) }, uBrush: { value: P.brush }, uBR: { value: P.brushRadius }, uRip: { value: new T.Vector4(0, 0, -9, 0) }, uFade: { value: 0 },
    };
    const mat = new T.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: `uniform float uT, uNS, uAmp, uFreq, uThk, uDepth, uSize, uPx, uBrush, uBR, uShift; uniform vec4 uStr[12]; uniform vec3 uPtr; uniform vec4 uRip; attribute float aR; varying float vH, vL, vRip, vA;
        void main(){
          vec3 p = position; float h = 0.;
          for (int q = 0; q < 12; q++) { if (float(q) >= uNS) break; vec4 S = uStr[q];
            float cy = S.x * .9 + uAmp * .38 * sin(p.x * 1.7 * uFreq * S.z + S.y + uT * .35 * S.w) + uAmp * .12 * sin(p.x * 3.9 * uFreq + S.y * 2. - uT * .21);
            float d = (p.y - cy) / (.12 + .22 * uThk); h += S.w * exp(-d * d); }
          p.z = h * .34 * uDepth;
          /* pointer: dots part around it */
          vec2 dp = p.xy - uPtr.xy; float pd = length(dp), pr = uBR * 2.2;
          if (uBrush > 0. && pd < pr) { float f = 1. - pd / pr; p.xy += normalize(dp + 1e-4) * f * f * .16 * uBrush * uPtr.z; p.z += f * f * .12 * uPtr.z; }
          /* ripple from a click */
          float rr = length(p.xy - uRip.xy), ra = uT - uRip.z; vRip = ra > 0. && ra < 3. ? exp(-pow((rr - ra * 1.4) * 5., 2.)) * (1. - ra / 3.) : 0.;
          vH = h; vL = p.x / 3.2 + .5; vA = .55 + .45 * aR;
          vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
          gl_PointSize = uPx * uSize * (2.2 + h * 1.3 + vRip * 3.) / -mv.z;
        }`,
      fragmentShader: `uniform vec3 uA, uB; uniform float uShift, uInt, uSoft, uFade; varying float vH, vL, vRip, vA;
        void main(){ float r = length(gl_PointCoord - .5) * 2.; if (r > 1.) discard;
          float edge = mix(1. - step(.8, r), exp(-r * r * 3.), uSoft);
          float m = clamp(vH * .55 + vL * uShift + vRip, 0., 1.);
          vec3 c = mix(uA, uB, m) * (.35 + vH * .55 + vRip * 1.6) * uInt;
          gl_FragColor = vec4(c, edge * vA * uFade * (.25 + min(1., vH) * .75 + vRip)); }` });
    const pts = new T.Points(geo, mat); scene.add(pts);
    const D = Math.PI / 180, base = new T.Euler(P.tilt * D, P.turn * D, P.roll * D, "YXZ"), q0 = new T.Quaternion().setFromEuler(base);
    let W = 1, H = 1, raf = 0, on = false, last = 0, lookX = 0, lookY = 0, tx = 0, ty = 0, ptrA = 0, ptrT = 0;
    function size() { W = host.clientWidth || 1; H = host.clientHeight || 1; renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); U.uPx.value = H * renderer.getPixelRatio() * .0062; cam.position.z = 4.2 / Math.min(1.25, Math.max(.7, W / H / 1.2)) / P.zoom; }
    const ray = new T.Raycaster(), plane = new T.Plane(new T.Vector3(0, 0, 1), 0), hit = new T.Vector3(), inv = new T.Matrix4();
    function toLocal(cx, cy) {
      const r = cv.getBoundingClientRect(); ray.setFromCamera({ x: (cx - r.left) / r.width * 2 - 1, y: -((cy - r.top) / r.height) * 2 + 1 }, cam);
      inv.copy(pts.matrixWorld).invert(); const o = ray.ray.origin.clone().applyMatrix4(inv), d = ray.ray.direction.clone().transformDirection(inv);
      const tt = -o.z / d.z; return tt > 0 ? o.add(d.multiplyScalar(tt)) : null;
    }
    if (P.interactive) {
      addEventListener("pointermove", (e) => { if (!on) return; const r = cv.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - .5) * 2; ty = ((e.clientY - r.top) / r.height - .5) * 2; const l = toLocal(e.clientX, e.clientY); if (l) { U.uPtr.value.x = l.x; U.uPtr.value.y = l.y; ptrT = 1; } }, { passive: true });
      if (P.clickRipples) addEventListener("pointerdown", (e) => { if (!on || e.target.closest("button, a, .kctl, .mpop")) return; const l = toLocal(e.clientX, e.clientY); if (l) U.uRip.value.set(l.x, l.y, U.uT.value, 1); });
    }
    function frame(now) {
      raf = on ? requestAnimationFrame(frame) : 0;
      const dt = last ? Math.min(.05, (now - last) / 1000) : .016; last = now;
      if (!P.paused && !RMd) U.uT.value += dt * P.speed * P.flow;
      U.uFade.value += ((on ? 1 : 0) - U.uFade.value) * (1 - Math.exp(-dt / .5));
      ptrA += (ptrT - ptrA) * (1 - Math.exp(-dt / .25)); ptrT *= Math.exp(-dt / 1.2); U.uPtr.value.z = ptrA;
      lookX += (tx * P.parallax - lookX) * (1 - Math.exp(-dt / .6)); lookY += (ty * P.parallax - lookY) * (1 - Math.exp(-dt / .6));
      pts.quaternion.copy(q0).premultiply(new T.Quaternion().setFromEuler(new T.Euler(lookY * .12, lookX * .18, 0)));
      renderer.render(scene, cam);
    }
    new ResizeObserver(size).observe(host); size();
    return {
      start() { if (on) return; on = true; size(); last = 0; if (!raf) raf = requestAnimationFrame(frame); },
      stop() { on = false; },
      set(p) { Object.assign(P, p); if (p.colors) { U.uA.value.set(p.colors[0]); U.uB.value.set(p.colors[1]); } ["amplitude:uAmp", "frequency:uFreq", "thickness:uThk", "depth:uDepth", "intensity:uInt", "softness:uSoft", "colorShift:uShift", "dotSize:uSize"].forEach((kv) => { const [a, b] = kv.split(":"); if (a in p) U[b].value = p[a]; }); },
    };
  };
