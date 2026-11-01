'use strict';
// Drone flight, KAFD -> Al Qadisiyah -> Al Shifa, over the real satellite imagery (Esri / Maxar, three detail levels)
// with the real building footprints (OpenStreetMap / Microsoft) standing in 3D. Local metres around KAFD: x east,
// z south, y up — the same frame the portfolio site's flight uses (sat/world.json). Every frame is a pure function of t.
const DR = { ready: false };
(function () {
  const cv = document.createElement('canvas'); cv.width = 1920; cv.height = 1080;
  const gl = cv.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true, alpha: true, premultipliedAlpha: false });
  DR.canvas = cv; DR.gl = gl;
  const ANI = gl.getExtension('EXT_texture_filter_anisotropic');
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const prog = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); } return { p, u }; };
  const FOG = `uniform vec3 uFogC; uniform float uFogD; vec3 fog(vec3 c, float d){ float f = 1. - exp(-pow(d / uFogD, 1.6)); return mix(c, uFogC, clamp(f, 0., .92)); }`;
  // ground: one textured quad per imagery chunk; edges listed in 'e' feather into the coarser layer below
  const G = prog(`#version 300 es
    uniform mat4 uVP; uniform vec4 uRect; in vec2 aP; out vec2 vUV; out vec3 vW;
    void main(){ vec3 w = vec3(mix(uRect.x, uRect.z, aP.x), 0., mix(uRect.y, uRect.w, aP.y)); vUV = aP; vW = w; gl_Position = uVP * vec4(w, 1.); }`,
  `#version 300 es
    precision highp float; uniform sampler2D uT; uniform vec4 uEdge; uniform vec3 uEye; uniform float uGrade; ${FOG}
    in vec2 vUV; in vec3 vW; out vec4 o;
    void main(){ vec3 c = texture(uT, vUV).rgb;
      float a = 1.; float fw = .06;
      if (uEdge.x > .5) a *= smoothstep(0., fw, vUV.x); if (uEdge.y > .5) a *= smoothstep(0., fw, vUV.y);
      if (uEdge.z > .5) a *= smoothstep(0., fw, 1. - vUV.x); if (uEdge.w > .5) a *= smoothstep(0., fw, 1. - vUV.y);
      // grade toward the film: a touch cooler and deeper
      c = mix(c, c * vec3(.86, .93, 1.08), uGrade); c = pow(c, vec3(1.08));
      o = vec4(fog(c, distance(vW, uEye)), a); }`);
  // buildings: walls shaded by facing, glass bands on towers, pale roofs
  const B = prog(`#version 300 es
    uniform mat4 uVP; in vec3 aP; in vec3 aN; in float aH; out vec3 vW; out vec3 vN; out float vH;
    void main(){ vW = aP; vN = aN; vH = aH; gl_Position = uVP * vec4(aP, 1.); }`,
  `#version 300 es
    precision highp float; uniform vec3 uEye; uniform vec3 uSun; ${FOG}
    in vec3 vW; in vec3 vN; in float vH; out vec4 o;
    void main(){
      float l = .55 + .45 * max(0., dot(normalize(vN), uSun));
      vec3 base = vN.y > .5 ? vec3(.80, .79, .76) : vec3(.74, .72, .69) * l;
      if (vH > 40. && vN.y < .5) { // glass towers: sky reflected at grazing angles, dark glass head-on, floors and mullions
        vec3 vd = normalize(uEye - vW); float fr = pow(1. - max(0., dot(normalize(vN), vd)), 2.5);
        vec3 glass = mix(vec3(.09, .14, .22), vec3(.66, .76, .90), clamp(fr * 1.3 + vW.y / vH * .25, 0., 1.));
        float floorL = smoothstep(.9, .96, fract(vW.y / 4.2)), mull = smoothstep(.92, .97, fract((vW.x + vW.z) / 3.2));
        glass = mix(glass, vec3(.05, .07, .1), max(floorL, mull) * .55);
        glass += vec3(1., .93, .8) * pow(max(0., dot(reflect(-vd, normalize(vN)), uSun)), 40.) * .6;
        base = glass * (.85 + .15 * l);
      } else if (vN.y < .5) { base = vec3(.83, .77, .68) * l; }
      base *= mix(.82, 1., clamp(vW.y / max(vH, 1.), 0., 1.));
      o = vec4(fog(base, distance(vW, uEye)), 1.); }`);
  const quadBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const vaoG = gl.createVertexArray(); gl.bindVertexArray(vaoG); gl.enableVertexAttribArray(0); gl.bindAttribLocation(G.p, 0, 'aP'); gl.vertexAttribPointer(gl.getAttribLocation(G.p, 'aP'), 2, gl.FLOAT, false, 0, 0);
  let vaoB = null, nB = 0;
  const CH = [];
  function tex(img) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); if (ANI) gl.texParameterf(gl.TEXTURE_2D, ANI.TEXTURE_MAX_ANISOTROPY_EXT, 8); return t; }
  function buildings(list) {
    const P = [], N = [], H = [];
    for (const [h0, , f] of list) {
      const h = Math.max(4, h0), n = f.length / 2; if (n < 3) continue;
      for (let i = 0; i < n; i++) {
        const x0 = f[i * 2], z0 = f[i * 2 + 1], x1 = f[((i + 1) % n) * 2], z1 = f[((i + 1) % n) * 2 + 1];
        const nx = z1 - z0, nz = -(x1 - x0), nl = Math.hypot(nx, nz) || 1;
        const q = [[x0, 0, z0], [x1, 0, z1], [x1, h, z1], [x0, 0, z0], [x1, h, z1], [x0, h, z0]];
        for (const v of q) { P.push(...v); N.push(nx / nl, 0, nz / nl); H.push(h); }
      }
      for (let i = 1; i < n - 1; i++) for (const k of [0, i, i + 1]) { P.push(f[k * 2], h, f[k * 2 + 1]); N.push(0, 1, 0); H.push(h); }
    }
    nB = P.length / 3;
    vaoB = gl.createVertexArray(); gl.bindVertexArray(vaoB);
    const put = (arr, loc, k) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, k, gl.FLOAT, false, 0, 0); };
    put(P, gl.getAttribLocation(B.p, 'aP'), 3); put(N, gl.getAttribLocation(B.p, 'aN'), 3); put(H, gl.getAttribLocation(B.p, 'aH'), 1);
  }
  DR.load = async function (base) {
    const w = await (await fetch(base + 'sat/world.json')).json();
    await Promise.all(w.chunks.map(async c => { const img = await loadImg(`${base}sat/${c.f}.jpg`); if (!img) return; CH.push({ c, t: tex(img) }); }));
    CH.sort((a, b) => a.c.L - b.c.L);
    // the skyline stands in 3D (KAFD, and true towers anywhere); the imagery carries the low-rise city and the districts
    buildings(w.b.filter(b => { const f = b[2]; const near = Math.hypot(f[0], f[1]) < 2600; return (near && b[0] >= 24) || b[0] >= 80; }));
    DR.ready = true;
  };
  /* ---------- camera ---------- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = a => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function viewProj(eye, at, up, fov, asp) {
    const f = norm(sub(at, eye)), s = norm(cross(f, up)), u = cross(s, f);
    const V = [s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0, -dot(s, eye), -dot(u, eye), dot(f, eye), 1];
    const n = 4, fa = 90000, tt = 1 / Math.tan(fov / 2);
    const Pm = [tt / asp, 0, 0, 0, 0, tt, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0];
    const M = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) M[c * 4 + r] += Pm[k * 4 + r] * V[c * 4 + k];
    return M;
  }
  DR.project = (M, p) => { const x = M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12], y = M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13], w = M[3] * p[0] + M[7] * p[1] + M[11] * p[2] + M[15]; if (w <= 1) return null; return [(x / w * .5 + .5) * 1920, (1 - (y / w * .5 + .5)) * 1080, w]; };
  DR.render = function (cam) {
    const M = viewProj(cam.eye, cam.at, cam.up || [0, 1, 0], cam.fov || .9, 1920 / 1080);
    gl.viewport(0, 0, 1920, 1080); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const fogC = [.86, .85, .83], fogD = cam.fogD || 26000;
    // ground layers, coarse to fine
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(G.p); gl.bindVertexArray(vaoG);
    gl.uniformMatrix4fv(G.u.uVP, false, M); gl.uniform3fv(G.u.uEye, cam.eye); gl.uniform3fv(G.u.uFogC, fogC); gl.uniform1f(G.u.uFogD, fogD); gl.uniform1f(G.u.uGrade, .6);
    gl.activeTexture(gl.TEXTURE0); gl.uniform1i(G.u.uT, 0);
    for (const { c, t } of CH) {
      // skip fine tiles that are far away (they would only shimmer)
      if (c.L === 2) { const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2; if (Math.hypot(cx - cam.eye[0], cz - cam.eye[2]) > 9000 + cam.eye[1] * 3) continue; }
      const e = c.e || ''; gl.uniform4f(G.u.uEdge, e.includes('l') ? 1 : 0, e.includes('t') ? 1 : 0, e.includes('r') ? 1 : 0, e.includes('b') ? 1 : 0);
      gl.uniform4f(G.u.uRect, c.x0, c.z0, c.x1, c.z1); gl.bindTexture(gl.TEXTURE_2D, t); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // buildings
    gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(B.p); gl.bindVertexArray(vaoB);
    gl.uniformMatrix4fv(B.u.uVP, false, M); gl.uniform3fv(B.u.uEye, cam.eye); gl.uniform3fv(B.u.uSun, norm([-.5, .7, .45])); gl.uniform3fv(B.u.uFogC, fogC); gl.uniform1f(B.u.uFogD, fogD);
    gl.drawArrays(gl.TRIANGLES, 0, nB);
    gl.finish();
    return M;
  };
})();

/* ---------- the flight path ---------- */
// keys: time (s, for the full 13 s flight), eye, look-at. Al Qadisiyah ~ (18429, -6910), Al Shifa ~ (4323, 23998)
const FLY = [
  [0.0, [-1900, 170, 1100], [200, 180, -150]],
  [2.4, [800, 420, -650], [3400, 220, -1500]],
  [4.0, [7200, 1500, -2700], [14200, 500, -5700]],
  [5.6, [15600, 560, -5200], [18300, 0, -6900]],
  [7.6, [20200, 420, -4600], [18200, 0, -7000]],
  [9.2, [14500, 3600, 3500], [8000, 0, 15500]],
  [10.9, [5600, 1700, 22300], [4400, 0, 24000]],
  [13.0, [4323, 980, 24002], [4323, 0, 24004]],
];
const CR = (p0, p1, p2, p3, u) => p1.map((_, i) => .5 * (2 * p1[i] + (-p0[i] + p2[i]) * u + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * u * u + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * u * u * u));
function flyCam(t) {
  t = clamp(t, 0, 13); let i = 0; while (i < FLY.length - 2 && t > FLY[i + 1][0]) i++;
  const a = FLY[Math.max(0, i - 1)], b = FLY[i], c = FLY[i + 1], d = FLY[Math.min(FLY.length - 1, i + 2)];
  const u = sm(0, 1, (t - b[0]) / (c[0] - b[0])) * .3 + ((t - b[0]) / (c[0] - b[0])) * .7;
  const eye = CR(a[1], b[1], c[1], d[1], u), at = CR(a[2], b[2], c[2], d[2], u);
  // the last stretch looks straight down: switch the up vector to north as the view turns vertical
  const down = sm(11.2, 12.6, t);
  const up = [0, 1 - down, -down];
  return { eye, at, up, fov: lerp(.95, .8, down) };
}
const KM = [18.4, -6.9], DIST = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

/* ---------- the flight as a scene ---------- */
// tf: flight time (0..13). Draws the real flight, the showrooms rising as light columns, and the flight HUD.
function droneShot(tf, o = {}) {
  if (!DR.ready) return;
  const cam = flyCam(tf), M = DR.render(cam);
  const sky = X.createLinearGradient(0, 0, 0, H * .6); sky.addColorStop(0, '#2f56b8'); sky.addColorStop(.55, '#9db4dc'); sky.addColorStop(1, '#e6e2da'); X.fillStyle = sky; X.fillRect(0, 0, W, H);
  X.drawImage(DR.canvas, 0, 0, W, H);
  // a cool grade and vignette so the white type and blue light read
  const vg = X.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H); vg.addColorStop(0, 'rgba(3,10,30,0)'); vg.addColorStop(1, 'rgba(3,10,30,.55)'); X.fillStyle = vg; X.fillRect(0, 0, W, H);
  // showrooms: light columns that rise as the drone arrives over each district
  const riseQ = sm(4.6, 6.2, tf), riseS = sm(10.2, 11.6, tf);
  X.save(); X.globalCompositeOperation = 'lighter'; X.lineCap = 'round';
  for (const [x, z, dist, inv] of DPINS) {
    const r = dist ? riseS : riseQ; if (r <= .01) continue;
    const h = (40 + Math.sqrt(Math.max(inv, 4)) * 14) * r;
    const p0 = DR.project(M, [x, 0, z]), p1 = DR.project(M, [x, h, z]); if (!p0 || !p1) continue;
    const col = dist ? [170, 200, 255] : [86, 132, 255], w = Math.max(1.2, 2600 / p0[2]);
    X.strokeStyle = rgba(col, .25); X.lineWidth = w * 4; X.beginPath(); X.moveTo(p0[0], p0[1]); X.lineTo(p1[0], p1[1]); X.stroke();
    X.strokeStyle = rgba(col, .95); X.lineWidth = w; X.beginPath(); X.moveTo(p0[0], p0[1]); X.lineTo(p1[0], p1[1]); X.stroke();
    X.fillStyle = rgba([255, 255, 255], .9); X.beginPath(); X.arc(p1[0], p1[1], w * 1.1, 0, 7); X.fill();
  }
  X.restore();
  // place labels pinned to the ground
  const tag = (txt, p, a) => { const s = DR.project(M, p); if (!s || a < .01) return; X.save(); X.globalAlpha = a; X.strokeStyle = 'rgba(255,255,255,.8)'; X.lineWidth = 1.5; X.beginPath(); X.moveTo(s[0], s[1]); X.lineTo(s[0], s[1] - 70); X.stroke(); X.fillStyle = '#fff'; X.beginPath(); X.arc(s[0], s[1], 5, 0, 7); X.fill(); X.font = `700 22px ${FAM.m}`; X.letterSpacing = '3px'; X.fillStyle = 'rgba(3,10,30,.7)'; const w = X.measureText(txt).width; X.fillRect(s[0] - 12, s[1] - 112, w + 24, 36); X.fillStyle = '#fff'; X.fillText(txt, s[0], s[1] - 86); X.letterSpacing = '0px'; X.restore(); };
  tag('KAFD', [0, 260, 0], 1 - sm(1.6, 2.6, tf));
  tag('AL QADISIYAH · 309 SHOWROOMS', [18430, 0, -6910], sm(5.2, 5.8, tf) * (1 - sm(8.6, 9.2, tf)));
  tag('AL SHIFA · 211 SHOWROOMS', [4323, 0, 23998], sm(11.4, 12.0, tf));
  // flight HUD
  const ep = flyCam(Math.max(0, tf - .05)).eye, sp = Math.hypot(cam.eye[0] - ep[0], cam.eye[2] - ep[2]) / .05 * 3.6;
  const hd = (Math.atan2(cam.at[0] - cam.eye[0], -(cam.at[2] - cam.eye[2])) * 180 / Math.PI + 360) % 360;
  hud(lt, o.label || 'DRONE · KAFD → AL QADISIYAH → AL SHIFA');
  mono(`ALT ${String(Math.round(cam.eye[1])).padStart(4, '0')} M   HDG ${String(Math.round(hd)).padStart(3, '0')}°`, 76, H - 70, 18, [220, 230, 255], .9);
  const leg = tf < 5.6 ? ['KAFD → AL QADISIYAH', 19.7 * sm(0, 5.6, tf)] : ['AL QADISIYAH → AL SHIFA', 34.1 * sm(8, 12, tf)];
  mono(`${leg[0]}  ${leg[1].toFixed(1)} KM`, 76, H - 100, 18, C2.teal, .95);
}
