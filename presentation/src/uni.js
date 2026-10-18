  /* ==================== the data universe: one particle system, every chapter a formation ==================== */
  const UNI = (function () {
    const T = window.THREE, cv = document.getElementById("uni"), labsEl = document.getElementById("uniLabs");
    const off = { show() {}, sleep() {}, ok: false };
    if (!cv || !T) return off;
    let renderer = null;
    try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, stencil: false, depth: false, powerPreference: "high-performance" }); } catch (e) { renderer = null; }
    if (!renderer) return off;
    const RMu = matchMedia("(prefers-reduced-motion: reduce)").matches, coarse = matchMedia("(pointer: coarse)").matches;
    const N = 40000;
    let seed = 7, rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const gauss = () => { let u = 0; for (let k = 0; k < 4; k++) u += rnd(); return (u - 2) / 1.15; };

    /* ---------- geometry: every particle carries where it was, where it is going, and how it moves ---------- */
    const A = { p: new Float32Array(N * 3), to: new Float32Array(N * 3), cf: new Float32Array(N * 4), ct: new Float32Array(N * 4), s: new Float32Array(N * 2), a: new Float32Array(N * 4), r: new Float32Array(N * 4) };
    for (let i = 0; i < N * 4; i++) A.r[i] = rnd();
    const geo = new T.BufferGeometry();
    const attr = { position: [A.p, 3], aTo: [A.to, 3], aCF: [A.cf, 4], aCT: [A.ct, 4], aS: [A.s, 2], aA: [A.a, 4], aR: [A.r, 4] };
    Object.entries(attr).forEach(([k, [arr, n]]) => geo.setAttribute(k, new T.BufferAttribute(arr, n)));
    geo.boundingSphere = new T.Sphere(new T.Vector3(), 1e5);
    const U = { uT: { value: 0 }, uM: { value: 1 }, uSp: { value: 0.9 }, uArc: { value: 10 }, uPx: { value: 1 }, uRef: { value: 100 }, uHi: { value: 0 }, uHiK: { value: -1 }, uFar: { value: 900 }, uInk: { value: 1 } };
    const mat = new T.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending,
      vertexShader: `
        attribute vec3 aTo; attribute vec4 aCF; attribute vec4 aCT; attribute vec2 aS; attribute vec4 aA; attribute vec4 aR;
        uniform float uT, uM, uSp, uArc, uPx, uRef, uHi, uHiK, uFar, uInk;
        varying vec4 vC;
        vec3 river(vec3 P, vec4 r, float t, out float s) {
          float k = P.x; s = fract(t * 0.042 + r.x);
          if (s < 0.45) { float u = s / 0.45, hw = mix(16.0, 2.4, smoothstep(0.0, 1.0, u));
            return vec3(mix(-66.0, -6.0, u), P.y * hw + sin(u * 9.0 + t * 0.7 + r.y * 6.0) * 0.9, P.z * hw * 0.7); }
          float u = (s - 0.45) / 0.55, ey = k < 0.5 ? 17.0 : (k < 1.5 ? 0.0 : -19.0), sp = mix(2.4, k > 1.5 ? 8.0 : 4.6, u);
          vec3 q = vec3(mix(-6.0, k > 1.5 ? 46.0 : 66.0, u), mix(0.0, ey, smoothstep(0.0, 1.0, u)) + P.y * sp, P.z * sp * 0.7);
          if (k > 1.5) { q.y -= u * u * 7.0; q.x += sin(t * 0.9 + r.z * 20.0) * u * 5.0; q.z += cos(t * 0.7 + r.w * 20.0) * u * 7.0; }
          return q;
        }
        vec3 animPos(vec3 P, float an, float par, vec4 r, float t, out float s) {
          s = 0.0;
          if (an < 0.5 || an > 3.5) return P;
          if (an < 1.5) return P + vec3(0.0, fract(t * 0.11 + r.w) * par, 0.0);
          if (an < 2.5) return river(P, r, t, s);
          float a = t * par, c = cos(a), sn = sin(a);
          return vec3(P.x * c - P.z * sn, P.y, P.x * sn + P.z * c);
        }
        vec4 animCol(vec4 c, vec3 P, float an, float par, float s, float t) {
          if (an > 1.5 && an < 2.5) { c.rgb = mix(vec3(1.0, 0.86, 0.7), c.rgb, smoothstep(0.42, 0.5, s)); if (P.x > 1.5) c.a *= 1.0 - smoothstep(0.62, 1.0, s); }
          if (an > 0.5 && an < 1.5) c.a *= 1.0 - smoothstep(0.55, 1.0, fract(t * 0.11 + aR.w));
          if (an > 3.5) { float dd = uInk - par; c.a *= dd < 0.0 ? 0.0 : 0.45 + 1.8 * pow(fract(par * 4.0 - t * 0.07), 14.0) + 4.0 * exp(-dd * 220.0); }
          return c;
        }
        void main() {
          float e = clamp(uM * (1.0 + uSp) - aR.x * uSp, 0.0, 1.0); e = e * e * e * (e * (e * 6.0 - 15.0) + 10.0);
          float sA, sB;
          vec3 pa = animPos(position, aA.x, aA.z, aR, uT, sA), pb = animPos(aTo, aA.y, aA.w, aR, uT, sB);
          vec3 p = mix(pa, pb, e) + (aR.yzw - vec3(0.5, 0.35, 0.5)) * sin(3.14159 * e) * uArc;
          p += vec3(sin(uT * 0.6 + aR.y * 40.0), cos(uT * 0.5 + aR.z * 40.0), sin(uT * 0.4 + aR.w * 40.0)) * 0.0006 * uRef;
          vec4 c = mix(animCol(aCF, position, aA.x, aA.z, sA, uT), animCol(aCT, aTo, aA.y, aA.w, sB, uT), e);
          if (uHiK > -0.5 && aA.y > 1.5 && aA.y < 2.5) c.a *= mix(1.0, abs(aTo.x - uHiK) < 0.5 ? 1.35 : 0.2, uHi);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float d = max(-mv.z, 0.5);
          c.a *= clamp((uFar - d) / (uFar * 0.45), 0.0, 1.0);
          vC = c;
          gl_PointSize = clamp(mix(aS.x, aS.y, e) * uPx * uRef / d, 0.0, 64.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec4 vC;
        void main() { vec2 q = gl_PointCoord - 0.5; float d = dot(q, q); if (d > 0.25 || vC.a < 0.003) discard; gl_FragColor = vec4(vC.rgb * vC.a * exp(-d * 13.0), 1.0); }`,
    });
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(40, 1, 0.5, 6000);
    const pts = new T.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);

    /* ---------- film pass: half- and quarter-resolution glow, chromatic fringe, vignette, grain ---------- */
    const quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadScene = new T.Scene(), quad = new T.Mesh(new T.PlaneGeometry(2, 2)); quadScene.add(quad);
    const VS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
    const blurM = new T.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new T.Vector2() } }, vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: "uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb * 0.2270; c += (texture2D(t, vUv + d * 1.3846).rgb + texture2D(t, vUv - d * 1.3846).rgb) * 0.3162; c += (texture2D(t, vUv + d * 3.2308).rgb + texture2D(t, vUv - d * 3.2308).rgb) * 0.0703; gl_FragColor = vec4(c, 1.0); }" });
    const copyM = new T.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: VS, depthTest: false, depthWrite: false, fragmentShader: "uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb, 1.0); }" });
    const compM = new T.ShaderMaterial({ uniforms: { tS: { value: null }, tA: { value: null }, tB: { value: null }, uB: { value: 1.25 }, uT: { value: 0 }, uRes: { value: new T.Vector2(1, 1) }, uFade: { value: 1 } }, vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: `uniform sampler2D tS, tA, tB; uniform float uB, uT, uFade; uniform vec2 uRes; varying vec2 vUv;
        void main(){
          vec2 c = vUv - 0.5; float r = length(c * vec2(uRes.x / uRes.y, 1.0));
          vec3 bg = mix(vec3(0.05, 0.016, 0.004), vec3(0.006, 0.002, 0.0), smoothstep(0.0, 0.9, r));
          vec2 o = c * 0.0024;
          vec3 s = vec3(texture2D(tS, vUv + o).r, texture2D(tS, vUv).g, texture2D(tS, vUv - o).b);
          vec3 g = texture2D(tA, vUv).rgb * 0.85 + texture2D(tB, vUv).rgb * 1.5;
          vec3 col = bg + s + g * uB;
          col = col / (1.0 + max(col.r, max(col.g, col.b)) * 0.18);
          col *= 1.0 - smoothstep(0.5, 1.15, r) * 0.6;
          col += (fract(sin(dot(vUv * uRes + fract(uT) * 91.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.028;
          gl_FragColor = vec4(col * uFade, 1.0);
        }` });
    const RT = (w, h) => new T.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), { minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false, stencilBuffer: false });
    let rtS = RT(1, 1), rtA = RT(1, 1), rtA2 = RT(1, 1), rtB = RT(1, 1), rtB2 = RT(1, 1);
    function pass(m, target) { quad.material = m; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); }
    function blur(src, tmp, w, h) {
      blurM.uniforms.t.value = src.texture; blurM.uniforms.d.value.set(1 / w, 0); pass(blurM, tmp);
      blurM.uniforms.t.value = tmp.texture; blurM.uniforms.d.value.set(0, 1 / h); pass(blurM, src);
    }

    /* ---------- the city, in local metres around KAFD (x east, z south), 1 unit = 100 m ---------- */
    const RAD = Math.PI / 180, RE = 6378137, LAT0 = 24.7636, LNG0 = 46.6402, KK = Math.cos(LAT0 * RAD);
    const merc = (lat, lng) => [RE * lng * RAD, RE * Math.log(Math.tan(Math.PI / 4 + lat * RAD / 2))];
    const [MX0, MY0] = merc(LAT0, LNG0);
    const locM = (lat, lng) => { const m = merc(lat, lng); return [(m[0] - MX0) * KK, -(m[1] - MY0) * KK]; };
    const shops = R.map((r) => ({ r, m: r.lat != null ? locM(r.lat, r.lng) : null }));
    const cenM = [0, 1].map((mk) => { const a = shops.filter((s) => s.m && s.r.mk === mk); return [sum(a.map((s) => s.m[0])) / a.length, sum(a.map((s) => s.m[1])) / a.length]; });
    /* no coordinate on record: kept at the district centre but never drawn */
    shops.forEach((s) => { if (!s.m) { s.m = cenM[s.r.mk].slice(); s.noLoc = true; } });
    const xs = shops.map((s) => s.m[0]).concat([0]), zs = shops.map((s) => s.m[1]).concat([0]);
    const CX = (Math.min(...xs) + Math.max(...xs)) / 2, CZ = (Math.min(...zs) + Math.max(...zs)) / 2, EXT = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 100;
    const cityU = (m) => [(m[0] - CX) / 100, (m[1] - CZ) / 100];
    const NC = sum(R.map((r) => r.units)), ND = R.length, D0 = NC, R0 = NC + ND, NREST = N - R0;
    const carOf = new Int32Array(NC), carK = new Int32Array(NC);
    { let k = 0; R.forEach((r, j) => { for (let c = 0; c < (r.units || 0); c++) { carOf[k] = j; carK[k] = c; k++; } }); }
    let blds = null, PORT = false;
    const bldReady = fetch("sat/world.json").then((r) => r.json()).then((w) => { blds = w.b.map(([h, , f]) => { let x = 0, z = 0; const n = f.length / 2; for (let i = 0; i < f.length; i += 2) { x += f[i]; z += f[i + 1]; } return [x / n, z / n, h]; }); }).catch(() => { blds = []; });

    /* ---------- palette ---------- */
    const COL = { q: [1, 0.42, 0.13], s: [0.16, 0.84, 0.8], w: [1, 0.9, 0.78], g: [1, 0.74, 0.3], dust: [0.78, 0.46, 0.27], dim: [0.42, 0.26, 0.2], ice: [0.62, 0.72, 0.9], fin: [1, 0.5, 0.12], cash: [0.3, 0.88, 0.84], lost: [1, 0.78, 0.36] };
    const PRICE = [[60e3, [0.62, 0.3, 0.14]], [100e3, [0.95, 0.4, 0.15]], [150e3, [1, 0.58, 0.16]], [250e3, [1, 0.78, 0.32]], [1e15, [1, 0.95, 0.8]]];
    const priceCol = (v) => v == null ? [0.5, 0.45, 0.42] : PRICE.find(([lim]) => v < lim)[1];

    function mk() { return { p: new Float32Array(N * 3), c: new Float32Array(N * 4), s: new Float32Array(N), a: new Float32Array(N * 2), cam: null, labs: [], hi: -1 }; }
    function put(f, i, x, y, z, c, al, sz, an = 0, par = 0) { f.p[i * 3] = x; f.p[i * 3 + 1] = y; f.p[i * 3 + 2] = z; f.c[i * 4] = c[0]; f.c[i * 4 + 1] = c[1]; f.c[i * 4 + 2] = c[2]; f.c[i * 4 + 3] = al; f.s[i] = sz; f.a[i * 2] = an; f.a[i * 2 + 1] = par; }
    function stars(f, from, to, R1 = 260) { for (let i = from; i < to; i++) { const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, rr = R1 * (0.8 + rnd() * 0.5), q = Math.sqrt(1 - u * u); put(f, i, Math.cos(th) * q * rr, u * rr * 0.6, Math.sin(th) * q * rr, COL.w, 0.05 + rnd() * 0.12, 0.9 + rnd()); } }
    const lab = (f, x, y, z, v, t, c, img, logo) => f.labs.push({ x, y, z, v, t, c, img, logo });

    /* city floor: buildings as dust, the rest as a faint survey grid */
    function cityBase(f, from, to) {
      const n = to - from, B = blds || [];
      for (let k = 0; k < n; k++) {
        const i = from + k;
        if (k < B.length && B.length) { const b = B[Math.floor(k * B.length / Math.min(n, B.length)) % B.length], [x, z] = cityU(b); put(f, i, x + (rnd() - 0.5) * 0.3, Math.min(14, b[2] / 100 * 1.6) * rnd(), z + (rnd() - 0.5) * 0.3, COL.dust, 0.32 + rnd() * 0.25, 1.5); }
        else { const g = 6, x = (Math.floor(rnd() * 70) - 35) * g, z = (Math.floor(rnd() * 70) - 35) * g, t = rnd() * g; put(f, i, rnd() < 0.5 ? x + t : x, -0.2, rnd() < 0.5 ? z : z + t, COL.dim, 0.05, 0.8); }
      }
    }
    const shopU = (j) => cityU(shops[j].m);
    const cityCam = (k = 1) => ({ look: [(Math.min(hqU0, qU0, sU0) + Math.max(hqU0, qU0, sU0)) / 2 - (PORT ? -0.07 * EXT : 0.24 * EXT), 0, (Math.min(hqU1, qU1, sU1) + Math.max(hqU1, qU1, sU1)) / 2 + (PORT ? 0.24 * EXT : 0.06 * EXT)], off: PORT ? [0.02 * EXT * k, 0.86 * EXT * k, 0.4 * EXT * k] : [-0.56 * EXT * k, 0.5 * EXT * k, 0.05 * EXT * k], orbit: 0.006 });
    const qU = cityU(cenM[0]), sU = cityU(cenM[1]), hqU = cityU([0, 0]), [qU0, qU1] = qU, [sU0, sU1] = sU, [hqU0, hqU1] = hqU;
    function cityLabs(f, y = 2) {
      lab(f, qU[0], y, qU[1], "Al Qadisiyah", `${fmt(R.filter((r) => r.mk === 0).length)} showrooms`, "var(--qad)", "n-rc-facade");
      lab(f, sU[0], y, sU[1], "Al Shifa", `${fmt(R.filter((r) => r.mk === 1).length)} showrooms`, "var(--shf)", "s16nfy-1");
      lab(f, hqU[0], y + 6, hqU[1], "KAFD · HQ", "Where it was run from", "#fff", "hq-kafd");
    }

    const FORM = {
      cloud(f) {
        for (let i = 0; i < N; i++) { const rr = 70 * Math.cbrt(rnd()), u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, q = Math.sqrt(1 - u * u); put(f, i, Math.cos(th) * q * rr, u * rr * 0.62, Math.sin(th) * q * rr, i >= D0 && i < R0 ? COL.g : COL.dust, i >= D0 && i < R0 ? 0.9 : 0.3, i >= D0 && i < R0 ? 3 : 1.4, 3, 0.02); }
        f.cam = { look: [0, 0, 0], off: [0, 8, 120], orbit: 0.02 };
      },
      doors(f) {
        for (let i = 0; i < NC; i++) { const [x, z] = shopU(carOf[i]); put(f, i, x + (rnd() - 0.5) * 0.3, 0, z + (rnd() - 0.5) * 0.3, COL.w, 0, 0.6); }
        for (let j = 0; j < ND; j++) { const [x, z] = shopU(j), ok = R[j].loc === "verified"; put(f, D0 + j, x, 0.3, z, R[j].mk ? COL.s : COL.q, ok ? 1 : 0.38, ok ? 7 : 4.2); }
        cityBase(f, R0, N - 600);
        for (let i = N - 600; i < N; i++) put(f, i, hqU[0] + gauss() * 0.5, 0, hqU[1] + gauss() * 0.5, COL.w, 0.7, 2, 1, 26);
        f.cam = cityCam(1.45); cityLabs(f);
      },
      cars(f) {
        const LH = 0.42, C = 0.24;
        for (let i = 0; i < NC; i++) { const j = carOf[i], k = carK[i], [x, z] = shopU(j), L = Math.floor(k / 4), q = k % 4; put(f, i, x + ((q & 1) - 0.5) * C, L * LH + 0.2, z + ((q >> 1) - 0.5) * C, R[j].mk ? COL.s : COL.q, 0.75, 2); }
        for (let j = 0; j < ND; j++) { const [x, z] = shopU(j); put(f, D0 + j, x, 0.1, z, COL.w, 0.8, 2.6); }
        cityBase(f, R0, N);
        f.cam = { look: [qU0, 6, qU1 + 10], off: [-0.1 * EXT, 0.2 * EXT, 0.3 * EXT], orbit: 0.025 };
        lab(f, qU[0], 26, qU[1], fmt(DV.dist[0].u) + " cars", "Al Qadisiyah, counted by hand", "var(--qad)", "n-redcarpet");
        lab(f, sU[0], 16, sU[1], fmt(DV.dist[1].u) + " cars", "Al Shifa", "var(--shf)");
      },
      walk(f) {
        const routes = [0, 1].map((mk) => {
          const idx = R.map((r, j) => j).filter((j) => R[j].mk === mk && !shops[j].noLoc), pts = idx.map(shopU), used = new Uint8Array(pts.length), path = [];
          let cur = pts.reduce((b, p, k) => (p[0] < pts[b][0] ? k : b), 0);
          for (let n = 0; n < pts.length; n++) { used[cur] = 1; path.push(pts[cur]); let best = -1, bd = 1e9; for (let k = 0; k < pts.length; k++) if (!used[k]) { const d = (pts[k][0] - pts[cur][0]) ** 2 + (pts[k][1] - pts[cur][1]) ** 2; if (d < bd) { bd = d; best = k; } } if (best < 0) break; cur = best; }
          const cum = [0]; for (let k = 1; k < path.length; k++) cum.push(cum[k - 1] + Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]));
          return { path, cum, len: cum[cum.length - 1] };
        });
        const tot = routes[0].len + routes[1].len;
        for (let i = 0; i < NC; i++) {
          let d = (i / NC) * tot, ro = routes[0]; if (d > ro.len) { d -= ro.len; ro = routes[1]; }
          let k = 1; while (k < ro.cum.length - 1 && ro.cum[k] < d) k++;
          const a = ro.path[k - 1], b = ro.path[k], u = (d - ro.cum[k - 1]) / Math.max(1e-6, ro.cum[k] - ro.cum[k - 1]);
          put(f, i, a[0] + (b[0] - a[0]) * u + (rnd() - 0.5) * 0.12, 0.25, a[1] + (b[1] - a[1]) * u + (rnd() - 0.5) * 0.12, ro === routes[0] ? [1, 0.7, 0.4] : [0.5, 0.95, 0.9], 1, 1.8, 4, i / NC);
        }
        for (let j = 0; j < ND; j++) { const [x, z] = shopU(j); put(f, D0 + j, x, 0.3, z, COL.w, 0.9, 2.8); }
        cityBase(f, R0, N);
        f.cam = cityCam(1.45);
        lab(f, qU[0], 3, qU[1], F.per[0].walk + " km", "Al Qadisiyah on foot", "var(--qad)");
        lab(f, sU[0], 3, sU[1], F.per[1].walk + " km", "Al Shifa on foot", "var(--shf)");
      },
      deep(f) {
        const dj = R.map((r, j) => j).filter((j) => R[j].deep), per = Math.floor(NC / dj.length);
        for (let i = 0; i < NC; i++) { const j = dj[Math.min(dj.length - 1, Math.floor(i / per))], [x, z] = shopU(j), rr = Math.abs(gauss()) * 0.35; const th = rnd() * 6.283; put(f, i, x + Math.cos(th) * rr, 0, z + Math.sin(th) * rr, rnd() < 0.3 ? COL.w : COL.g, 0.85, 1.8, 1, 34 + rnd() * 6); }
        for (let j = 0; j < ND; j++) { const [x, z] = shopU(j); put(f, D0 + j, x, 0.3, z, R[j].mk ? COL.s : COL.q, R[j].deep ? 1 : 0.35, R[j].deep ? 4 : 2); }
        cityBase(f, R0, N);
        f.cam = cityCam(1.45); f.cam.look[1] = 10;
        lab(f, qU[0], 44, qU[1], ((n) => fmt(n) + (n === 1 ? " sit-down" : " sit-downs"))(dj.filter((j) => R[j].mk === 0).length), "Al Qadisiyah", "var(--qad)");
        lab(f, sU[0], 44, sU[1], ((n) => fmt(n) + (n === 1 ? " sit-down" : " sit-downs"))(dj.filter((j) => R[j].mk === 1).length), "Al Shifa", "var(--shf)");
      },
      river(f) {
        const nF = Math.round(DV.ddS * DV.FIN), nC = Math.round(DV.ddS - DV.ddS * DV.FIN), nL = Math.round(DV.ddS * DV.LOST), nR = Math.min(N - 2500, nF + nC + nL);
        for (let i = 0; i < nR; i++) { const k = i < nF ? 0 : i < nF + nC ? 1 : 2; put(f, i, k, Math.max(-1, Math.min(1, gauss() * 0.42)), Math.max(-1, Math.min(1, gauss() * 0.42)), k === 0 ? COL.fin : k === 1 ? COL.cash : COL.lost, k === 2 ? 0.5 : 0.42, 1.3, 2); }
        for (let i = nR; i < N; i++) { const th = rnd() * 6.283, rr = 7.5 + gauss() * 0.25; put(f, i, -6 + gauss() * 0.15, Math.sin(th) * rr, Math.cos(th) * rr * 0.7, COL.w, 0.05, 1.2); }
        f.cam = { look: [2, -15, 0], off: [0, 6, 118], orbit: 0 };
        lab(f, -62, 15, 0, fmt(nF + nC + nL), `ready buyers a month, ${DV.nInt} interviewed floors`, "#fff");
        lab(f, -6, 10, 0, "The showroom floor", "", "#fff");
        lab(f, 50, 21, 0, fmt(nF), "leave on finance", "var(--flame-lit)");
        lab(f, 50, 4, 0, fmt(nC), "pay cash", "#4fd1c9");
        lab(f, 40, -27, 0, fmt(nL), "walk away", "#e3b54a");
        f.base = "river";
      },
      riverLost(f) { FORM.river(f); f.hi = 2; },
      terrain(f, port) {
        const G = coarse ? 80 : 96, half = 1.9, S = 11.5, sig = 175, Hm = 30, OX = 24;
        const dens = [0, 1].map((mk) => { const pts = shops.filter((s) => s.r.mk === mk && s.r.units && !s.noLoc); const c = cenM[mk]; const g = new Float32Array(G * G);
          for (let a = 0; a < G; a++) for (let b = 0; b < G; b++) { const x = c[0] + (a / (G - 1) * 2 - 1) * half * 1000, z = c[1] + (b / (G - 1) * 2 - 1) * half * 1000; let v = 0; for (const s of pts) { const dx = s.m[0] - x, dz = s.m[1] - z, d2 = dx * dx + dz * dz; if (d2 < 9 * sig * sig) v += s.r.units * Math.exp(-d2 / (2 * sig * sig)); } g[a * G + b] = v; }
          return g; });
        const mx = Math.max(...dens[0], ...dens[1]); let i = 0;
        [0, 1].forEach((mk) => { const ox = mk ? OX : -OX, cc = mk ? COL.s : COL.q;
          for (let a = 0; a < G; a++) for (let b = 0; b < G; b++) { const h = dens[mk][a * G + b] / mx, x = ox + (a / (G - 1) * 2 - 1) * half * S, z = (b / (G - 1) * 2 - 1) * half * S; const c = [cc[0] + (1 - cc[0]) * h * h, cc[1] + (1 - cc[1]) * h * h, cc[2] + (1 - cc[2]) * h * h]; put(f, i++, x, h * Hm, z, h > 0.02 ? c : COL.dim, 0.28 + h * 0.9, 1.7); } });
        const sparkFrom = i;
        for (; i < NC; i++) { const mk2 = rnd() < DV.dist[0].u / NC ? 0 : 1, pts = shops.filter((s) => s.r.mk === mk2 && s.r.units && !s.noLoc), s = pts[Math.floor(rnd() * pts.length)], x = (mk2 ? OX : -OX) + (s.m[0] - cenM[mk2][0]) / 1000 * S, z = (s.m[1] - cenM[mk2][1]) / 1000 * S; put(f, i, x + gauss() * 0.4, 0, z + gauss() * 0.4, mk2 ? COL.s : COL.g, 0.5, 1.3, 1, 30); }
        void sparkFrom;
        for (let j = 0; j < ND; j++) { const s = shops[j], mk2 = s.r.mk, x = (mk2 ? OX : -OX) + (s.m[0] - cenM[mk2][0]) / 1000 * S, z = (s.m[1] - cenM[mk2][1]) / 1000 * S; put(f, D0 + j, x, 0.2, z, COL.w, Math.abs(x - (mk2 ? OX : -OX)) < half * S && Math.abs(z) < half * S ? 0.9 : 0, 2.2); }
        for (let k = R0; k < N; k++) { const th = rnd() * 6.283, rr = 30 + Math.sqrt(rnd()) * 90; put(f, k, Math.cos(th) * rr, -0.3, Math.sin(th) * rr * 0.6, COL.dim, 0.07, 1); }
        f.cam = { look: [port ? 0 : 27, port ? -10 : 8, 0], off: [0, 58, 132], orbit: 0.018 };
        lab(f, -OX, Hm + 6, 0, "Al Qadisiyah", `${fmt(DV.dist[0].u)} cars, densely packed`, "var(--qad)", "n-hexhall");
        lab(f, OX, Hm * 0.62, 0, "Al Shifa", `${fmt(DV.dist[1].u)} cars, spread thin`, "var(--shf)", "s14sbr-2");
      },
      sky(f, mk) {
        const S = 30, LH = 0.5, C = 0.42, c0 = cenM[mk];
        const loc = (m) => [(m[0] - c0[0]) / 1000 * S, (m[1] - c0[1]) / 1000 * S];
        let tall = null;
        for (let i = 0; i < NC; i++) { const j = carOf[i], r = R[j];
          if (r.mk !== mk) { const [x, z] = loc(shops[j].m); put(f, i, x * 0.2, -6, z * 0.2, COL.dim, 0, 0.5); continue; }
          const [x, z] = loc(shops[j].m), k = carK[i], L = Math.floor(k / 4), q = k % 4; put(f, i, x + ((q & 1) - 0.5) * C, L * LH + 0.25, z + ((q >> 1) - 0.5) * C, priceCol(r.asp), 0.9, 2);
          if (!tall || (r.units || 0) > (tall.r.units || 0)) tall = { r, x, z }; }
        for (let j = 0; j < ND; j++) { const [x, z] = loc(shops[j].m); put(f, D0 + j, x, 0.1, z, COL.w, R[j].mk === mk ? 0.7 : 0, 2.2); }
        const B = (blds || []).filter((b) => Math.abs(b[0] - c0[0]) < 2200 && Math.abs(b[1] - c0[1]) < 2200);
        for (let k = R0; k < N; k++) { if (B.length) { const b = B[(k - R0) % B.length], [x, z] = loc(b); put(f, k, x + (rnd() - 0.5) * 0.5, rnd() * Math.min(3, b[2] / 10), z + (rnd() - 0.5) * 0.5, COL.dust, 0.16, 1.1); } else put(f, k, (rnd() - 0.5) * 120, 0, (rnd() - 0.5) * 120, COL.dim, 0.06, 1); }
        f.cam = { look: [6, 6, 0], off: [-44, 32, 62], orbit: 0.03 };
        if (tall) lab(f, tall.x, Math.floor((tall.r.units || 0) / 4) * LH + 4, tall.z, fmt(tall.r.units) + " cars", esc(tall.r.en), "#fff");
      },
      skyQ(f) { FORM.sky(f, 0); }, skyS(f) { FORM.sky(f, 1); },
      indep(f, port) {
        const cols = port ? 16 : 28, cell = 2.5, rows = Math.ceil(ND / cols), Q = 6, sp = cell * 0.8 / Q;
        let i = 0;
        for (let j = 0; j < ND; j++) { const cx = (j % cols - (cols - 1) / 2) * cell, cy = ((rows - 1) / 2 - Math.floor(j / cols)) * cell, au = R[j].auth;
          for (let q = 0; q < Q * Q; q++, i++) put(f, i, cx + ((q % Q) - (Q - 1) / 2) * sp, cy + (Math.floor(q / Q) - (Q - 1) / 2) * sp, (rnd() - 0.5) * 0.3, au ? COL.w : (R[j].mk ? COL.s : COL.q), au ? 1 : 0.55, au ? 2.6 : 1.9, au ? 1 : 0, au ? 3 : 0);
          if (au && !f.labs.length) lab(f, cx, cy + 3, 0, fmt(F.auth) + " authorised", "manufacturer-backed floors", "#fff"); }
        stars(f, i, N);
        f.cam = { look: [port ? 0 : 8, port ? -14 : 0, 0], off: [0, -6, port ? 150 : 84], orbit: 0 };
      },
      sales(f) {
        const n = F.salesmen; let i = 0;
        for (let c = 0; c < n && i + 21 <= N; c++) {
          const u = rnd(), rr = 4 + 42 * Math.sqrt(u), th = (c % 3) * 2.094 + rr * 0.16 + gauss() * 0.28, x = Math.cos(th) * rr, z = Math.sin(th) * rr, y = gauss() * (1.6 - u);
          put(f, i++, x, y, z, COL.w, 0.95, 2.6, 3, 0.035);
          for (let k = 0; k < 20; k++) { const a = k / 20 * 6.283, rad = 0.55 + rnd() * 0.15; put(f, i++, x + Math.cos(a) * rad, y + (rnd() - 0.5) * 0.3, z + Math.sin(a) * rad, COL.q, 0.38, 1.1, 3, 0.035); }
        }
        stars(f, i, N); f.labsSpin = 0.035;
        f.cam = { look: [0, 0, 0], off: [0, 46, 78], orbit: 0.01 };
        lab(f, 0, 6, 0, fmt(n) + " salespeople", `counted on ${fmt(F.salesmenN)} Al Qadisiyah floors`, "#fff");
      },
      brands(f, port) {
        const CN = /^(jetour|mg|changan|geely|haval|gac|jac|baic|jaecoo|chery|byd|exeed|tank|hongqi|omoda|great wall|gwm|dongfeng|kaiyi|foton|jmc|zeekr|bestune|maxus|soueast|forthing|voyah|nio|xpeng|lynk|deepal|haima|wuling|rox|avatr|leapmotor|livan|swm|dorcen|skywell|seres|jetta|hongqi)\b/i;
        const cnt = new Map(); for (const r of open) for (const b of new Set(r.brands)) cnt.set(b, (cnt.get(b) || 0) + 1);
        const list = [...cnt.entries()].sort((a, b) => b[1] - a[1]), tot = sum(list.map((x) => x[1])), budget = 30000; let i = 0;
        list.forEach(([name, c], k) => {
          const rr = k ? 7 + 4.6 * Math.sqrt(k) : 0, th = k * 2.39996, cx = Math.cos(th) * rr, cz = Math.sin(th) * rr, rad = 0.8 * Math.cbrt(c), n = Math.max(30, Math.round(c / tot * budget)), cn = CN.test(name), col = k < 2 ? COL.w : cn ? COL.s : COL.q;
          for (let q = 0; q < n && i < N; q++, i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, s = Math.sqrt(1 - u * u), rd = rad * Math.cbrt(rnd()); put(f, i, cx + Math.cos(a) * s * rd, (port ? 0 : 0) + u * rd, cz + Math.sin(a) * s * rd, col, k < 2 ? 0.5 : 0.42, 1.2, 3, 0.03); }
          if (k < (port ? 4 : 6)) lab(f, cx, rad + 1.5, cz, esc(name), `on ${c} floors`, k < 2 ? "#fff" : "var(--flame-lit)", null, window.LOGOS && window.LOGOS(name));
        });
        const firstCn = list.findIndex(([n]) => CN.test(n));
        if (firstCn >= 0) { const k = firstCn, rr = 7 + 4.6 * Math.sqrt(k), th = k * 2.39996; lab(f, Math.cos(th) * rr, 0.8 * Math.cbrt(list[k][1]) + 1.5, Math.sin(th) * rr, "Chinese makes", `${Math.round(F.cn * 100)}% of floors already · led by ${esc(list[k][0])}`, "#4fd1c9", null, window.LOGOS && window.LOGOS(list[k][0])); }
        stars(f, i, N); f.labsSpin = 0.03;
        f.cam = { look: [0, 0, 0], off: [0, 52, 84], orbit: 0.012 };
      },
      toyhy(f, port) {
        const fl = open.filter((r) => r.brands.length), lit = fl.filter((r) => r.brands.some((b) => /^(toyota|hyundai)/i.test(b)));
        const order = lit.concat(fl.filter((r) => !lit.includes(r))), per = Math.floor(30000 / order.length); let i = 0;
        order.forEach((r, k) => { const rr = 2.15 * Math.sqrt(k + 0.5), th = k * 2.39996, cx = Math.cos(th) * rr, cy = Math.sin(th) * rr, on = k < lit.length;
          for (let q = 0; q < per; q++, i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * 0.85; put(f, i, cx + Math.cos(a) * d, cy + Math.sin(a) * d, (rnd() - 0.5) * 0.4, on ? (q % 3 ? COL.q : COL.w) : COL.ice, on ? 0.6 : 0.3, 1.5); } });
        stars(f, i, N);
        const rIn = 2.15 * Math.sqrt(lit.length) * 0.5, rOut = 2.15 * Math.sqrt(order.length);
        f.cam = { look: [port ? 0 : 14, port ? -12 : 0, 0], off: [0, -4, 92], orbit: 0 };
        lab(f, rIn * 0.4, rIn * 0.4, 1, fmt(lit.length) + " floors", "carry Toyota or Hyundai", "var(--flame-lit)");
        lab(f, rOut * 0.62, -rOut * 0.55, 1, fmt(fl.length - lit.length) + " floors", "carry neither", "#9fb0d0");
      },
      bank(f, port) {
        const n = F.bankAns, yes = F.bankAns - F.bankNo, per = Math.floor(32000 / n), cols = port ? 4 : n, sp = port ? 11 : 8.4; let i = 0;
        const litAt = new Set([Math.floor(n * 0.3), Math.floor(n * 0.72)].slice(0, yes));
        for (let o = 0; o < n; o++) { const cx = (o % cols - (cols - 1) / 2) * sp, cy = port ? (((Math.ceil(n / cols)) - 1) / 2 - Math.floor(o / cols)) * sp : 0, on = litAt.has(o);
          for (let q = 0; q < per; q++, i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, s = Math.sqrt(1 - u * u), rd = on ? 3.4 * Math.cbrt(rnd()) : 3.4 + gauss() * 0.06, drift = !on && rnd() < 0.25;
            put(f, i, cx + Math.cos(a) * s * rd, cy + u * rd - (drift ? 2 : 0), Math.sin(a) * s * rd, on ? COL.g : COL.ice, on ? 0.75 : (drift ? 0.4 : 0.3), on ? 1.7 : 1.4, drift ? 1 : 0, drift ? 7 : 0); }
          if (on && f.labs.length < 1) lab(f, cx, cy + 6, 0, "Bank on site", `${yes} of ${n} floors`, "var(--gold)");
          if (!on && o === n - 3) lab(f, cx, cy + 6, 0, "No lender", `${F.bankNo} of ${n} floors`, "#9fb0d0"); }
        stars(f, i, N);
        f.cam = { look: [0, port ? -10 : -8, 0], off: [0, 4, port ? 120 : 106], orbit: 0 };
      },
      nebula(f) {
        for (let i = 0; i < N; i++) { const u = rnd(), rr = 6 + 70 * Math.pow(u, 0.7), th = (i % 2) * Math.PI + rr * 0.09 + gauss() * 0.35; put(f, i, Math.cos(th) * rr, gauss() * 2 * (1 - u), Math.sin(th) * rr, u < 0.2 ? COL.g : COL.dust, 0.1 + (1 - u) * 0.18, 1.1, 3, 0.06); }
        f.cam = { look: [0, 0, 0], off: [0, 30, 100], orbit: 0 };
      },
      text(f, port) {
        const txt = `SAR ${(F.lostSar * 12 / 1e9).toFixed(1)}B`, c = document.createElement("canvas"), W = 1600, H = 420; c.width = W; c.height = H;
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.font = "700 300px 'Inter Tight', 'Inter', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, W / 2, H / 2);
        const d = g.getImageData(0, 0, W, H).data, cand = []; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 128) cand.push(x, y);
        const m = cand.length / 2, wU = port ? 54 : 100, k = wU / W, cy = port ? 12 : 9;
        for (let i = 0; i < N; i++) { const q = Math.floor(rnd() * m) * 2, x = (cand[q] - W / 2 + rnd() * 2) * k, y = (H / 2 - cand[q + 1] + rnd() * 2) * k; const t = (x / wU + 0.5); put(f, i, x, y + cy, (rnd() - 0.5) * 1.6, [1, 0.62 + t * 0.3, 0.3 + t * 0.5], 0.55, 1.4); }
        f.cam = { look: [0, cy - 4, 0], off: [0, 0, port ? 120 : 96], orbit: 0 };
      },
    };
    const needsCity = new Set(["doors", "cars", "walk", "deep", "skyQ", "skyS"]);
    const cache = {};
    function build(id, port) { PORT = port; const key = id + (port ? "p" : ""); if (!cache[key]) { const f = mk(); seed = 11 + id.length * 7; FORM[id](f, port); f.id = id; if (needsCity.has(id)) { for (let i = 0; i < NC; i++) if (shops[carOf[i]].noLoc) f.c[i * 4 + 3] = 0; for (let j = 0; j < ND; j++) if (shops[j].noLoc) f.c[(D0 + j) * 4 + 3] = 0; } cache[key] = f; } return cache[key]; }

    /* ---------- morph: freeze where every particle is now, then send it to the new formation ---------- */
    let cur = null, t0 = performance.now(), mStart = 0, MDUR = 2600, inkStart = 0, INK = 5600;
    const now = () => (performance.now() - t0) / 1000;
    function cpuPos(i, t, e) {
      const r = A.r, a = A.a, out = [0, 0, 0];
      const one = (P, an, par, off) => {
        const x = P[off], y = P[off + 1], z = P[off + 2];
        if (an < 0.5 || an > 3.5) return [x, y, z];
        if (an < 1.5) return [x, y + ((t * 0.11 + r[i * 4 + 3]) % 1) * par, z];
        if (an < 2.5) { const s = (t * 0.042 + r[i * 4]) % 1, k = x;
          if (s < 0.45) { const u = s / 0.45, sm = u * u * (3 - 2 * u), hw = 16 + (2.4 - 16) * sm; return [-66 + 60 * u, y * hw + Math.sin(u * 9 + t * 0.7 + r[i * 4 + 1] * 6) * 0.9, z * hw * 0.7]; }
          const u = (s - 0.45) / 0.55, sm = u * u * (3 - 2 * u), ey = k < 0.5 ? 17 : k < 1.5 ? 0 : -19, sp = 2.4 + ((k > 1.5 ? 8 : 4.6) - 2.4) * u;
          const q = [-6 + ((k > 1.5 ? 46 : 66) + 6) * u, ey * sm + y * sp, z * sp * 0.7];
          if (k > 1.5) { q[1] -= u * u * 7; q[0] += Math.sin(t * 0.9 + r[i * 4 + 2] * 20) * u * 5; q[2] += Math.cos(t * 0.7 + r[i * 4 + 3] * 20) * u * 7; }
          return q; }
        const ang = t * par, c = Math.cos(ang), s = Math.sin(ang); return [x * c - z * s, y, x * s + z * c];
      };
      const pa = one(A.p, a[i * 4], a[i * 4 + 2], i * 3), pb = one(A.to, a[i * 4 + 1], a[i * 4 + 3], i * 3), w = Math.sin(Math.PI * e) * U.uArc.value;
      out[0] = pa[0] + (pb[0] - pa[0]) * e + (r[i * 4 + 1] - 0.5) * w; out[1] = pa[1] + (pb[1] - pa[1]) * e + (r[i * 4 + 2] - 0.35) * w; out[2] = pa[2] + (pb[2] - pa[2]) * e + (r[i * 4 + 3] - 0.5) * w;
      return out;
    }
    const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);
    function morph(f) {
      const t = now(), m = Math.min(1, (performance.now() - mStart) / MDUR), sp = U.uSp.value;
      for (let i = 0; i < N; i++) {
        let e = Math.min(1, Math.max(0, m * (1 + sp) - A.r[i * 4] * sp)); e = ease(e);
        const p = cpuPos(i, t, e), an = e > 0.5 ? A.a[i * 4 + 1] : A.a[i * 4], keepAnim = an === 3 || an === 2;
        /* rotating or flowing particles: keep their animation so the hand-off is seamless */
        if (keepAnim && e > 0.999) { A.p[i * 3] = A.to[i * 3]; A.p[i * 3 + 1] = A.to[i * 3 + 1]; A.p[i * 3 + 2] = A.to[i * 3 + 2]; A.a[i * 4] = A.a[i * 4 + 1]; A.a[i * 4 + 2] = A.a[i * 4 + 3]; }
        else { A.p[i * 3] = p[0]; A.p[i * 3 + 1] = p[1]; A.p[i * 3 + 2] = p[2]; A.a[i * 4] = 0; A.a[i * 4 + 2] = 0; }
        for (let k = 0; k < 4; k++) A.cf[i * 4 + k] = A.cf[i * 4 + k] + (A.ct[i * 4 + k] - A.cf[i * 4 + k]) * e;
        A.s[i * 2] = A.s[i * 2] + (A.s[i * 2 + 1] - A.s[i * 2]) * e;
        A.to[i * 3] = f.p[i * 3]; A.to[i * 3 + 1] = f.p[i * 3 + 1]; A.to[i * 3 + 2] = f.p[i * 3 + 2];
        for (let k = 0; k < 4; k++) A.ct[i * 4 + k] = f.c[i * 4 + k];
        A.s[i * 2 + 1] = f.s[i]; A.a[i * 4 + 1] = f.a[i * 2]; A.a[i * 4 + 3] = f.a[i * 2 + 1];
      }
      Object.keys(attr).forEach((k) => { geo.attributes[k].needsUpdate = true; });
      mStart = performance.now(); U.uM.value = 0;
    }

    /* ---------- camera: glide to each formation's shot, then drift ---------- */
    const camS = { p: new T.Vector3(0, 10, 160), l: new T.Vector3() }, camF = { p: new T.Vector3(), l: new T.Vector3() };
    let camStart = 0, camDef = { look: [0, 0, 0], off: [0, 10, 160], orbit: 0 }, camT = 1, orb = 0, mx = 0, my = 0, pmx = 0, pmy = 0;
    const YAX = new T.Vector3(0, 1, 0), tmpV = new T.Vector3(), tgt = new T.Vector3(), lk = new T.Vector3();
    function camAspect() { return cam.aspect < 1 ? 1 + (1 - cam.aspect) * 1.25 : 1; }
    function targetPos(out) { const o = camDef.off, k = camAspect(), c = Math.cos(orb), s = Math.sin(orb); out.set(camDef.look[0] + (o[0] * c - o[2] * s) * k, camDef.look[1] + o[1] * k, camDef.look[2] + (o[0] * s + o[2] * c) * k); return out; }

    /* ---------- labels ---------- */
    let labEls = [], labs = [];
    function setLabels(f) { labs = f.labs; labsEl.innerHTML = labs.map((l) => `<div class="ul" style="--c:${l.c}">${l.img ? `<img class="ul__ph" src="photos/${l.img}.jpg" alt="">` : ""}${l.logo ? `<i class="ul__logo"><img src="${l.logo}" alt=""></i>` : ""}<b>${l.v}</b>${l.t ? `<span>${l.t}</span>` : ""}</div>`).join(""); labEls = [...labsEl.children]; }

    /* ---------- loop ---------- */
    let last2 = 0, W = 1, H = 1, dpr = 0, active = false, raf = 0, last = 0, fade = 0, want = null, ema = 16, win = 0;
    const DPRM = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 1.75);
    function resize() {
      W = Math.max(1, cv.clientWidth); H = Math.max(1, cv.clientHeight); dpr = Math.min(dpr || DPRM, DPRM) || DPRM;
      renderer.setPixelRatio(1); renderer.setSize(Math.round(W * dpr), Math.round(H * dpr), false);
      const w = Math.round(W * dpr), h = Math.round(H * dpr);
      [rtS, rtA, rtA2, rtB, rtB2].forEach((r) => r.dispose());
      rtS = RT(w, h); rtA = RT(w >> 1, h >> 1); rtA2 = RT(w >> 1, h >> 1); rtB = RT(w >> 3, h >> 3); rtB2 = RT(w >> 3, h >> 3);
      cam.aspect = W / H; cam.updateProjectionMatrix(); U.uPx.value = dpr * Math.min(1.25, H / 900);
      compM.uniforms.uRes.value.set(w, h);
      if (cur && want) { const f = build(want, cam.aspect < 0.85); if (f !== cur) { cur = f; morph(f); camDef = f.cam; camT = 0; camStart = performance.now(); camF.p.copy(camS.p); camF.l.copy(camS.l); setLabels(f); } }
    }
    function frame(ts) {
      raf = 0; if (!active && fade <= 0) return;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
      const rdt = last2 ? Math.min(0.25, (ts - last2) / 1000) : 0.016; last2 = ts;
      fade = Math.max(0, Math.min(1, fade + (active ? rdt / 0.7 : -rdt / 0.5)));
      const t = now(); U.uT.value = t; compM.uniforms.uT.value = t; compM.uniforms.uFade.value = fade;
      U.uM.value = RMu ? 1 : Math.min(1, (performance.now() - mStart) / MDUR);
      U.uInk.value = RMu || !cur || cur.id !== "walk" ? 1 : Math.min(1, Math.max(0, (performance.now() - inkStart) / INK));
      U.uHi.value += ((cur && cur.hi >= 0 ? 1 : 0) - U.uHi.value) * Math.min(1, dt * 2); if (cur && cur.hi >= 0) U.uHiK.value = cur.hi;
      /* camera */
      camT = Math.min(1, (performance.now() - camStart) / 2800); const k = RMu ? 1 : ease(camT);
      orb += rdt * (camDef.orbit || 0) * k * (RMu ? 0 : 1);
      targetPos(tgt); lk.set(camDef.look[0], camDef.look[1], camDef.look[2]);
      camS.p.copy(camF.p).lerp(tgt, k); camS.l.copy(camF.l).lerp(lk, k);
      pmx += (mx - pmx) * Math.min(1, dt * 3); pmy += (my - pmy) * Math.min(1, dt * 3);
      const dist = camS.p.distanceTo(camS.l);
      cam.position.copy(camS.p); cam.position.x += pmx * dist * 0.06; cam.position.y += pmy * dist * 0.04; cam.lookAt(camS.l);
      U.uRef.value = dist; U.uFar.value = dist * 3.2; cam.far = dist * 4 + 500; cam.updateProjectionMatrix();
      /* render: particles → glow pyramid → film composite */
      renderer.setRenderTarget(rtS); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, cam);
      copyM.uniforms.t.value = rtS.texture; pass(copyM, rtA); blur(rtA, rtA2, rtA.width, rtA.height);
      copyM.uniforms.t.value = rtA.texture; pass(copyM, rtB); blur(rtB, rtB2, rtB.width, rtB.height); blur(rtB, rtB2, rtB.width, rtB.height);
      compM.uniforms.tS.value = rtS.texture; compM.uniforms.tA.value = rtA.texture; compM.uniforms.tB.value = rtB.texture; pass(compM, null);
      /* labels */
      const lo = Math.max(0, Math.min(1, (U.uM.value - 0.6) / 0.3)) * fade;
      labs.forEach((l, n) => { const el = labEls[n]; tmpV.set(l.x, l.y, l.z); if (cur && cur.labsSpin) tmpV.applyAxisAngle(YAX, -t * cur.labsSpin);
        tmpV.project(cam); const on = tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1;
        el.style.opacity = on ? lo.toFixed(2) : 0; if (on) el.style.transform = `translate3d(${((tmpV.x + 1) / 2 * W).toFixed(1)}px,${((1 - tmpV.y) / 2 * H).toFixed(1)}px,0)`; });
      cv.style.opacity = fade.toFixed(3); labsEl.style.opacity = fade.toFixed(3);
      /* adaptive resolution */
      ema += ((ts - (frame.p || ts)) - ema) * 0.05; frame.p = ts; win += dt;
      if (win > 2) { win = 0; if (ema > 24 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); resize(); } else if (ema < 14 && dpr < DPRM) { dpr = Math.min(DPRM, dpr + 0.25); resize(); } }
      raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
    async function show(id) {
      if (!id || id === "none") return sleep();
      active = true; want = id; kick();
      if (needsCity.has(id) && !blds) await bldReady;
      if (want !== id) return;
      if (id === "text" && document.fonts && document.fonts.ready) await document.fonts.ready;
      const f = build(id, cam.aspect < 0.85);
      if (f === cur) return;
      const sameBase = cur && f.base && cur.base === f.base;
      cur = f;
      if (id === "walk") inkStart = performance.now() + 900;
      if (!sameBase) { morph(f); camF.p.copy(camS.p); camF.l.copy(camS.l); camDef = f.cam; camT = 0; camStart = performance.now(); orb = 0; }
      setLabels(f);
    }
    function sleep() { active = false; want = null; }
    addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; mx = e.clientX / innerWidth - 0.5; my = -(e.clientY / innerHeight - 0.5); }, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(cv); else addEventListener("resize", resize);
    resize();
    /* start everyone in a dark cloud */
    { const f = build("cloud", false); for (let i = 0; i < N; i++) { for (let k = 0; k < 3; k++) A.p[i * 3 + k] = A.to[i * 3 + k] = f.p[i * 3 + k] * 2.2; for (let k = 0; k < 4; k++) A.cf[i * 4 + k] = A.ct[i * 4 + k] = 0; A.s[i * 2] = A.s[i * 2 + 1] = 1; } }
    /* build the heavy formations while the viewer is still on the opening chapters */
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
    bldReady.then(() => { const q = ["doors", "cars", "walk", "deep", "river", "terrain", "skyQ", "skyS", "indep", "sales", "brands", "toyhy", "bank", "nebula"]; const next = () => { const id = q.shift(); if (!id) return; build(id, cam.aspect < 0.85); idle(next); }; idle(next); });
    return { show, sleep, ok: true, ink: () => U.uInk.value, state: () => ({ id: cur && cur.id, m: U.uM.value, fade }) };
  })();
  window.__uni = UNI;

