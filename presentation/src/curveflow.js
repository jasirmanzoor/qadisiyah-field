  /* ==================== Curve Flow: a curved, endlessly flowing strip of showroom photographs in the flight's sky ====================
     Our own WebGL build after the Framer "Curve Flow Carousel": a flat centre with curved, taller edges, infinite horizontal flow,
     distortion and colour fringes that grow with speed, and a dissolve entrance. The strip rides just above the horizon and turns with
     the drone: a change of heading pushes the photographs along, so the sky moves the way the ground does. Driven from the flight's own
     frame loop, so it costs nothing when the flight is off screen. */
  window.CurveFlow = function mount(host, items, opts) {
    const T = window.THREE; if (!T || !items.length) return null;
    const o = Object.assign({ cells: 16, cellW: 512, cellH: 320, auto: .16, curve: .55, flat: .22, fringe: .0045, gap: 18, onFocus: null }, opts);
    let renderer;
    try { renderer = new T.WebGLRenderer({ alpha: true, antialias: false, premultipliedAlpha: true }); } catch (e) { return null; }
    const RMc = matchMedia("(prefers-reduced-motion: reduce)").matches, pr = Math.min(devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(pr); renderer.setClearColor(0, 0);
    const cv = renderer.domElement; cv.className = "cflow"; Object.assign(cv.style, { position: "absolute", left: "0", top: "auto", bottom: "0", inset: "auto auto 0 0" }); host.appendChild(cv);
    /* atlas: each photograph cropped to the card's shape around its own detail point (measured at build time) */
    const N = Math.min(o.cells, items.length), COLS = 4, ROWS = Math.ceil(N / COLS);
    const atlas = document.createElement("canvas"); atlas.width = COLS * o.cellW; atlas.height = ROWS * o.cellH;
    const g = atlas.getContext("2d"); g.fillStyle = "#1b120d"; g.fillRect(0, 0, atlas.width, atlas.height);
    const tex = new T.CanvasTexture(atlas); tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
    const pick = items.slice(0, N);
    pick.forEach(([name], k) => {
      const im = new Image(); im.decoding = "async";
      im.onload = () => {
        const fc = (window.PHOTO_FOCUS || {})[name] || [50, 55], cw = o.cellW, ch = o.cellH, s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
        const w = im.naturalWidth * s, h = im.naturalHeight * s, x = (k % COLS) * cw, y = Math.floor(k / COLS) * ch;
        const ox = Math.min(0, Math.max(cw - w, cw / 2 - w * fc[0] / 100)), oy = Math.min(0, Math.max(ch - h, ch / 2 - h * fc[1] / 100));
        g.save(); g.beginPath(); g.rect(x, y, cw, ch); g.clip(); g.drawImage(im, x + ox, y + oy, w, h); g.restore();
        tex.needsUpdate = true;
      };
      im.src = `photos/${name}.jpg`;
    });
    const U = {
      uAtlas: { value: tex }, uRes: { value: new T.Vector2(1, 1) }, uVis: { value: 1 }, uScroll: { value: 0 }, uSpeed: { value: 0 }, uCY: { value: 100 }, uCH: { value: 120 },
      uCW: { value: 190 }, uGap: { value: o.gap }, uCurve: { value: o.curve }, uFlat: { value: o.flat }, uFringe: { value: o.fringe }, uIn: { value: 0 }, uN: { value: N },
      uGrid: { value: new T.Vector2(COLS, ROWS) }, uR: { value: 12 },
    };
    const mat = new T.ShaderMaterial({ uniforms: U, transparent: true, depthTest: false, depthWrite: false,
      vertexShader: "void main(){ gl_Position = vec4(position.xy, 0., 1.); }",
      fragmentShader: `precision highp float;
        uniform sampler2D uAtlas; uniform vec2 uRes, uGrid; uniform float uVis, uScroll, uSpeed, uCY, uCH, uCW, uGap, uCurve, uFlat, uFringe, uIn, uN, uR;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        vec3 tap(float cell, float f, float v){
          float cx = mod(cell, uGrid.x), cy = floor(cell / uGrid.x);
          vec2 uv = vec2((cx + clamp(f, .002, .998)) / uGrid.x, 1. - (cy + 1. - clamp(v, .002, .998)) / uGrid.y);
          return texture2D(uAtlas, uv).rgb;
        }
        void main(){
          vec2 p = gl_FragCoord.xy;
          float e = (p.x - uRes.x * .5) / (uVis * .5), ae = abs(e);
          float k = smoothstep(uFlat, 1.15, ae);
          /* curved edges: cards stand taller and crowd closer towards the sides, as if wrapped on the inside of a drum */
          float s = 1. + uCurve * k * k;
          float pitch = uCW + uGap;
          float xw = (p.x - uRes.x * .5) * (1. - .28 * k);
          float u = uScroll + xw / pitch;
          float i = floor(u), f = fract(u) * pitch / uCW;
          float hh = uCH * .5 * s, dy = (p.y - uCY) / hh;
          if (f > 1. || abs(dy) > 1.) discard;
          float v = dy * .5 + .5;
          /* rounded corners, in card pixels */
          vec2 q = vec2((f - .5) * uCW, dy * hh), b = vec2(uCW * .5, hh) - uR;
          float d = length(max(abs(q) - b, 0.)) - uR;
          float a = 1. - smoothstep(-1., .5, d);
          float cell = mod(i, uN);
          /* speed-responsive fringes: the faster the strip runs, the further red and blue pull apart, most at the edges */
          float sp = uFringe * clamp(abs(uSpeed), 0., 1.6) * (.35 + k);
          vec3 col = vec3(tap(cell, f + sp, v).r, tap(cell, f, v).g, tap(cell, f - sp, v).b);
          col *= 1. - .38 * k;
          /* dissolve entrance, in small blocks */
          float n = hash(floor(p / 5.) + i * 7.);
          a *= smoothstep(n - .08, n, uIn * 1.15 - .05);
          a *= 1. - smoothstep(.82, 1.02, ae);
          gl_FragColor = vec4(col * a, a);
        }` });
    const scene = new T.Scene(), cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    scene.add(new T.Mesh(new T.PlaneGeometry(2, 2), mat));
    let t0 = 0, W = 0, H = 0, on = false, scroll = Math.random() * N, vel = 0, lastYaw = null, focus = -1, last = 0;
    function size() { W = host.clientWidth || 1; H = innerHeight; renderer.setSize(W, H, false); cv.style.width = W + "px"; cv.style.height = H + "px"; U.uRes.value.set(W * pr, H * pr); U.uVis.value = innerWidth * pr; }
    addEventListener("resize", size); size();
    /* hy: the horizon's height on screen (px, from the top), yaw: the drone's heading (rad) */
    function frame(hy, yaw) {
      if (!on) return;
      const now = performance.now(), dt = last ? Math.min(.05, Math.max(.004, (now - last) / 1000)) : .016; last = now;
      let dYaw = 0; if (lastYaw !== null) { dYaw = yaw - lastYaw; if (dYaw > Math.PI) dYaw -= 2 * Math.PI; if (dYaw < -Math.PI) dYaw += 2 * Math.PI; } lastYaw = yaw;
      const push = RMc ? 0 : (o.auto + dYaw / dt * .9);
      vel += ((isFinite(push) ? push : o.auto) - vel) * (1 - Math.exp(-dt / .35)); if (!isFinite(vel)) vel = o.auto; scroll += vel * dt; if (!isFinite(scroll)) scroll = 0;
      U.uScroll.value = scroll; U.uSpeed.value = (vel - o.auto) * 4 + vel;
      U.uIn.value = Math.min(1, (now - t0) / 1400);
      /* the strip sits in the band of sky just above the horizon; it hides when the horizon leaves the screen */
      const sky = Math.max(0, hy + 10), ch = Math.max(56, Math.min(sky * .66, 300)), cw = ch * 1.6;
      U.uCH.value = ch * pr; U.uCW.value = cw * pr; U.uGap.value = o.gap * pr; U.uR.value = 12 * pr; U.uCY.value = (sky * .5) * pr;
      cv.style.opacity = sky < 70 ? 0 : 1;
      const c0 = .5 * cw / (cw + o.gap), fi = (((Math.round(scroll - c0) % N) + N) % N);
      if (fi !== focus && pick[fi]) { focus = fi; o.onFocus && o.onFocus(pick[fi][1], pick[fi][0]); }
      renderer.render(scene, cam);
    }
    return { start() { if (on) return; on = true; last = 0; lastYaw = null; U.uIn.value = 0; t0 = performance.now(); host.classList.add("is-curve"); }, stop() { on = false; }, frame };
  };
