'use strict';
// Motion engine for the AutoLink films. Every pixel is a pure function of time: window.seek(t) draws the frame.
// React Bits looks (SplitText, BlurText, ShinyText, CountUp, RotatingText, TextType, StarBorder, SpotlightCard,
// CardSwap, Hyperspeed, Aurora, LightRays, Threads, DotGrid) are re-made here as functions of t, because the
// originals run on timers and mouse input, which a frame-exact render cannot use.
const W = 1920, H = 1080;
const fg = document.getElementById('fg'), g = fg.getContext('2d');
const buf = [0, 1].map(() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; });

/* ---------------- palette (from the keynote's own tokens) ---------------- */
const COL = {
  ground: [18, 4, 0], panel: [28, 8, 2], ink: [255, 248, 240], fog: [216, 204, 182],
  flame: [255, 61, 0], lit: [255, 138, 31], qad: [232, 96, 28], shf: [30, 158, 152], teal: [50, 218, 230],
};
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mixc = (a, b, p) => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p];

/* ---------------- time maths ---------------- */
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, p) => a + (b - a) * p;
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const eo = x => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const eio = x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
// Framer Motion spring, critically damped (damping = 2·sqrt(stiffness)), closed form
const S = (t, k = 170) => { if (t <= 0) return 0; const w = Math.sqrt(k); return 1 - Math.exp(-w * t) * (1 + w * t); };
const rnd = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/* ---------------- background shader (half resolution, upscaled) ---------------- */
const bgc = document.getElementById('bg');
const gl = bgc.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
const BG_FS = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uT; uniform vec4 uW; uniform vec3 uC1, uC2, uGround; uniform vec2 uRO; uniform float uAmp;
out vec4 o;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for(int i=0;i<4;i++){ s += a*n(p); p = p*2.03 + 17.1; a *= .5; } return s; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; vec2 p = (gl_FragCoord.xy - .5*uRes) / uRes.y;
  vec3 c = uGround;
  if (uW.x > .001) {            // veil: domain-warped silk (DarkVeil / Silk)
    vec2 q = vec2(fbm(p*1.6 + vec2(0., .05*uT)), fbm(p*1.6 + vec2(5.2, 1.3) - .04*uT));
    float r = fbm(p*1.4 + 2.2*q + vec2(.03*uT, -.02*uT));
    float v = smoothstep(.35, .95, r);
    c += uW.x * (uC1 * v * .55 + uC2 * pow(v, 5.) * .9) * (1. - .5*uv.y);
  }
  if (uW.y > .001) {            // aurora: thin curtains with vertical striations, drifting
    float x = p.x;
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float base = .62 + .1*fk + .07*sin(x*(1.3+.4*fk) + uT*(.25+.07*fk) + fk*2.1) + .05*fbm(vec2(x*1.5 + fk*7., uT*.1));
      float d = uv.y - base;
      float curtain = exp(-max(d, 0.)*9.) * smoothstep(-.22, 0., d) * (1. - smoothstep(0., .02, d)*.0);
      float stri = .5 + .5*fbm(vec2(x*14. + fk*3., uT*.3 + fk));
      vec3 col = mix(uC1, uC2, fk*.5);
      c += uW.y * col * curtain * stri * (.55 - .12*fk);
    }
  }
  if (uW.z > .001) {            // light rays from uRO (LightRays)
    vec2 d = uv - uRO; d.x *= uRes.x/uRes.y; float ang = atan(d.x, -d.y); float r = length(d);
    float ray = .5 + .5*sin(ang*23. + uT*.3) * sin(ang*13. - uT*.2 + 1.7);
    ray = pow(ray, 3.) * (.6 + .4*fbm(vec2(ang*6., uT*.15)));
    c += uW.z * uC1 * ray * exp(-r*1.6) * 1.1;
    c += uW.z * uC2 * exp(-r*r*6.) * .35;
  }
  if (uW.w > .001) {            // dot grid
    vec2 gp = gl_FragCoord.xy / (uRes.y/27.); vec2 f = fract(gp) - .5;
    float dt = smoothstep(.09, .04, length(f));
    c += uW.w * vec3(.5, .42, .36) * dt * (.25 + .75*fbm(gp*.08 + uT*.05));
  }
  c *= uAmp;
  o = vec4(c, 1.);
}`;
const BG_VS = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.-1., 0., 1.); }`;
function mkProg(vs, fs) {
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}
const BGP = mkProg(BG_VS, BG_FS);
gl.bindVertexArray(gl.createVertexArray());
// bg = { w:[veil, aurora, rays, dots], c1, c2, ro:[x,y] (0..1, y up), amp }
function drawBG(b, t) {
  gl.viewport(0, 0, bgc.width, bgc.height); gl.useProgram(BGP.p); const u = BGP.u;
  gl.uniform2f(u.uRes, bgc.width, bgc.height); gl.uniform1f(u.uT, t);
  gl.uniform4fv(u.uW, b.w); gl.uniform3fv(u.uC1, b.c1.map(x => x / 255)); gl.uniform3fv(u.uC2, b.c2.map(x => x / 255));
  gl.uniform3fv(u.uGround, (b.ground || COL.ground).map(x => x / 255)); gl.uniform2fv(u.uRO, b.ro || [.5, 1.05]); gl.uniform1f(u.uAmp, b.amp ?? 1);
  gl.drawArrays(gl.TRIANGLES, 0, 3); gl.finish();
}
const lerpBG = (a, b, p) => ({ w: a.w.map((x, i) => lerp(x, b.w[i], p)), c1: mixc(a.c1, b.c1, p), c2: mixc(a.c2, b.c2, p), ro: [lerp((a.ro || [.5, 1.05])[0], (b.ro || [.5, 1.05])[0], p), lerp((a.ro || [.5, 1.05])[1], (b.ro || [.5, 1.05])[1], p)], amp: lerp(a.amp ?? 1, b.amp ?? 1, p), ground: mixc(a.ground || COL.ground, b.ground || COL.ground, p), vig: lerp(a.vig ?? .55, b.vig ?? .55, p), wipe: b.wipe });

/* ---------------- text ---------------- */
const FAM = { s: '"IT", "WenQuanYi Zen Hei", "FreeSerif", sans-serif', i: '"IS", serif', m: '"JB", monospace' };
let X = g;   // the context scenes draw into (a buffer during transitions)
const font = (size, wt = 500, fam = 's') => { X.font = `${fam === 'i' ? 'italic 400' : wt} ${size}px ${FAM[fam]}`; };
// rich line: parts [{s:'text', fam:'i', col:[..]}] laid out on one baseline
function layout(parts, size, wt, ls) {
  let x = 0; const out = [];
  for (const p of parts) {
    font(p.size || size, p.wt || wt, p.fam); X.letterSpacing = (p.ls ?? ls) + 'px';
    for (const ch of [...p.s]) { const w = X.measureText(ch).width; out.push({ ch, x, w, p }); x += w; }
  }
  // kerning-correct positions per part
  let off = 0;
  for (const p of parts) { font(p.size || size, p.wt || wt, p.fam); X.letterSpacing = (p.ls ?? ls) + 'px'; const items = out.filter(o => o.p === p); let acc = 0; items.forEach((o, i) => { o.x = off + X.measureText(p.s.slice(0, i)).width; }); off += X.measureText(p.s).width; }
  X.letterSpacing = '0px';
  return { glyphs: out, width: off };
}
const P = (s, o = {}) => Object.assign({ s }, o);
// pseudo-blur: a ring of faint offset copies plus a core (a canvas filter per glyph is far too slow in software)
const ONE = [[0, 0, 1]];
const RING = [...Array(8)].map((_, i) => [Math.cos(i * .785) * .55, Math.sin(i * .785) * .55, .16]).concat([[0, 0, .45]]);
// blur a whole layer by drawing it small and scaling it back up
const small = document.createElement('canvas');
function softDraw(ctx, src, blur, alpha, scale = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(W / 2, H / 2); ctx.scale(scale, scale); ctx.translate(-W / 2, -H / 2);
  if (blur < 1.2) { ctx.drawImage(src, 0, 0); ctx.restore(); return; }
  const k = Math.min(24, 1 + blur / 2.2), sw = Math.max(8, Math.round(W / k)), sh = Math.max(8, Math.round(H / k));
  small.width = sw; small.height = sh; const sc = small.getContext('2d'); sc.imageSmoothingQuality = 'high'; sc.clearRect(0, 0, sw, sh); sc.drawImage(src, 0, 0, sw, sh);
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(small, 0, 0, sw, sh, 0, 0, W, H); ctx.restore();
}
// SplitText / BlurText: glyphs (or words) rise in on a spring from tin, leave upward at tout
function line(parts, o) {
  if (typeof parts === 'string') parts = [P(parts)];
  const { x = 0, y = 0, size = 64, wt = 500, col = COL.ink, a = 1, align = 'left', tin = -99, tout = 1e9, stag = .022, by = 'char', mode = 'rise', ls = 0, k = 170, shine = 0 } = o;
  const L = layout(parts, size, wt, ls);
  const x0 = align === 'left' ? x : align === 'center' ? x - L.width / 2 : x - L.width;
  if (lt < tin - .01 || lt > tout + 1.6) return { x0, w: L.width };
  // group into units
  const units = [];
  if (by === 'char') L.glyphs.forEach(gph => { if (gph.ch !== ' ') units.push({ gl: [gph], i: units.length }); });
  else { let cur = null; L.glyphs.forEach(gph => { if (gph.ch === ' ') { cur = null; return; } if (!cur) { cur = { gl: [], i: units.length }; units.push(cur); } cur.gl.push(gph); }); }
  X.textBaseline = 'alphabetic';
  for (const u of units) {
    const pin = S(lt - tin - u.i * stag, k), pout = S(lt - tout - u.i * stag * .6, k);
    const vis = pin * (1 - pout); if (vis < .004) continue;
    let dy = 0, bl = 0, sc = 1;
    if (mode === 'rise') { dy = (1 - pin) * size * .55 - pout * size * .45; bl = (1 - pin) * 10 + pout * 10; }
    if (mode === 'blur') { bl = (1 - pin) * 16 + pout * 16; sc = 1 + (1 - pin) * .06; }
    if (mode === 'drop') { dy = -(1 - pin) * size * .5 + pout * size * .4; bl = (1 - pin) * 8; }
    X.save();
    const passes = bl > .6 ? RING : ONE;
    for (const [ox, oy, wa] of passes) {
    X.globalAlpha = a * vis * wa;
    for (const gph of u.gl) {
      const p = gph.p; font(p.size || size, p.wt || wt, p.fam); X.letterSpacing = (p.ls ?? ls) + 'px';
      let fill = rgba(p.col || col);
      if (shine || p.shine) {    // ShinyText: a bright band sweeps across the line
        const sx = x0 + lerp(-.3, 1.3, ((lt - tin) * .45) % 1.6 / 1.3) * L.width;
        const gr = X.createLinearGradient(sx - 160, 0, sx + 160, 0);
        gr.addColorStop(0, rgba(p.col || col)); gr.addColorStop(.5, rgba(mixc(p.col || col, [255, 255, 255], .85))); gr.addColorStop(1, rgba(p.col || col));
        fill = gr;
      }
      X.fillStyle = fill;
      const bx = ox * bl, by2 = oy * bl;
      if (sc !== 1) { X.save(); X.translate(x0 + gph.x + bx, y + dy + by2); X.scale(sc, sc); X.fillText(gph.ch, 0, 0); X.restore(); }
      else X.fillText(gph.ch, x0 + gph.x + bx, y + dy + by2);
    }
    }
    X.restore();
  }
  X.letterSpacing = '0px';
  return { x0, w: L.width };
}
// eyebrow label: dot + tracked caps
function eyebrow(str, o) {
  const { x, y, col = COL.lit, tin = 0, tout = 1e9, a = 1, align = 'left' } = o;
  const p = S(lt - tin, 200) * (1 - S(lt - tout, 200)); if (p < .004) return;
  font(20, 600); X.letterSpacing = '5px'; const w = X.measureText(str).width; X.letterSpacing = '0px';
  const x0 = align === 'center' ? x - (w + 26) / 2 : x;
  X.save(); X.globalAlpha = a * p;
  X.fillStyle = rgba(col); X.beginPath(); X.arc(x0 + 5, y - 7, 5, 0, 7); X.fill();
  X.restore();
  line(str, { x: x0 + 26, y, size: 20, wt: 600, ls: 5, col: COL.fog, a: a * .9, tin, tout, stag: .01 });
}
// CountUp with tabular slots
function count(v0, v1, o) {
  const { x, y, size = 200, wt = 600, col = COL.ink, align = 'left', t0 = 0, dur = 1.2, fmt = v => Math.round(v).toLocaleString('en-US'), tin = t0, tout = 1e9, pre = '', post = '', preFam = 's', postSize } = o;
  const v = lerp(v0, v1, eo(clamp((lt - t0) / dur)));
  const str = fmt(v);
  font(size, wt); X.letterSpacing = (-size * .03) + 'px'; const dw = X.measureText('0').width;
  let w = 0; for (const ch of str) w += /\d/.test(ch) ? dw : X.measureText(ch).width;
  font(postSize || size * .42, 500); const pw = post ? X.measureText(post).width + size * .08 : 0;
  font(size * .42, 500); const qw = pre ? X.measureText(pre).width + size * .06 : 0;
  const tot = w + pw + qw, x0 = align === 'left' ? x : align === 'center' ? x - tot / 2 : x - tot;
  const pin = S(lt - tin, 160), pout = S(lt - tout, 160), vis = pin * (1 - pout); if (vis < .004) return { x0, w: tot };
  X.save(); X.globalAlpha = vis; X.textBaseline = 'alphabetic';
  const dy = (1 - pin) * size * .3 - pout * size * .3;
  if (pre) { font(size * .42, 500); X.fillStyle = rgba(COL.fog); X.fillText(pre, x0, y + dy - size * .02); }
  font(size, wt); X.letterSpacing = (-size * .03) + 'px'; X.fillStyle = rgba(col); let cx = x0 + qw;
  for (const ch of str) { const cw = /\d/.test(ch) ? dw : X.measureText(ch).width; X.fillText(ch, cx + (cw - X.measureText(ch).width) / 2, y + dy); cx += cw; }
  X.letterSpacing = '0px';
  if (post) { font(postSize || size * .42, 500); X.fillStyle = rgba(COL.fog); X.fillText(post, cx + size * .08, y + dy); }
  X.restore();
  return { x0, w: tot };
}
// TextType: typewriter with a blinking caret (blink computed from time)
function typed(str, o) {
  const { x, y, size = 96, fam = 'i', col = COL.ink, t0 = 0, cps = 18, align = 'left', tout = 1e9, caret = true } = o;
  const n = Math.max(0, Math.min(str.length, Math.floor((lt - t0) * cps)));
  font(size, 500, fam); const full = X.measureText(str).width, part = X.measureText(str.slice(0, n)).width;
  const x0 = align === 'center' ? x - full / 2 : x;
  const out = S(lt - tout, 170); if (out > .995 || lt < t0 - .3) return;
  X.save(); X.globalAlpha = 1 - out; X.translate(0, -out * 30);
  X.fillStyle = rgba(col); X.fillText(str.slice(0, n), x0, y);
  if (caret && (n < str.length || Math.floor(lt * 2.2) % 2 === 0)) { X.fillStyle = rgba(COL.lit); X.fillRect(x0 + part + size * .06, y - size * .78, size * .06, size * .92); }
  X.restore();
}

/* ---------------- shapes, cards, photos ---------------- */
function rr(x, y, w, h, r) { X.beginPath(); X.roundRect(x, y, w, h, r); }
// SpotlightCard + StarBorder: glass panel, a light that travels round the border
function card(x, y, w, h, o = {}) {
  const { r = 28, a = 1, fill = .045, edge = .1, star = null, starCol = COL.lit, glow = 0 } = o;
  X.save(); X.globalAlpha = a;
  rr(x, y, w, h, r); X.fillStyle = rgba(COL.ink, fill); X.fill();
  X.lineWidth = 1.5; X.strokeStyle = rgba(COL.ink, edge); X.stroke();
  if (star !== null) {
    const cg = X.createConicGradient(star * Math.PI * 2, x + w / 2, y + h / 2);
    cg.addColorStop(0, rgba(starCol, .95)); cg.addColorStop(.08, rgba(starCol, 0)); cg.addColorStop(.92, rgba(starCol, 0)); cg.addColorStop(1, rgba(starCol, .95));
    X.lineWidth = 2.5; X.strokeStyle = cg; rr(x, y, w, h, r); X.stroke();
  }
  if (glow > 0) { const rg = X.createRadialGradient(x + w * .3, y, 0, x + w * .3, y, w * .9); rg.addColorStop(0, rgba(starCol, .16 * glow)); rg.addColorStop(1, rgba(starCol, 0)); X.fillStyle = rg; rr(x, y, w, h, r); X.fill(); }
  X.restore();
}
// photo, cover-fit into a rounded frame, with Ken Burns zoom and pan
function photo(img, x, y, w, h, o = {}) {
  const { r = 24, zoom = 1, px = .5, py = .5, a = 1, dim = 0 } = o;
  if (!img) return;
  const ar = img.width / img.height, fr = w / h;
  let sw = ar > fr ? img.height * fr : img.width, sh = ar > fr ? img.height : img.width / fr;
  sw /= zoom; sh /= zoom;
  const sx = (img.width - sw) * px, sy = (img.height - sh) * py;
  X.save(); X.globalAlpha = a; rr(x, y, w, h, r); X.clip(); X.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  if (dim) { X.fillStyle = `rgba(0,0,0,${dim})`; X.fillRect(x, y, w, h); }
  X.restore();
}
function check(x, y, s, col, p = 1) {  // a tick drawn on
  X.save(); X.strokeStyle = rgba(col); X.lineWidth = s * .14; X.lineCap = 'round'; X.lineJoin = 'round';
  const pts = [[-.32, .02], [-.08, .26], [.36, -.24]], L1 = Math.hypot(.24, .24), L2 = Math.hypot(.44, .5), tot = L1 + L2;
  X.beginPath(); X.moveTo(x + pts[0][0] * s, y + pts[0][1] * s);
  const d = p * tot;
  if (d <= L1) { const u = d / L1; X.lineTo(x + lerp(pts[0][0], pts[1][0], u) * s, y + lerp(pts[0][1], pts[1][1], u) * s); }
  else { X.lineTo(x + pts[1][0] * s, y + pts[1][1] * s); const u = (d - L1) / L2; X.lineTo(x + lerp(pts[1][0], pts[2][0], u) * s, y + lerp(pts[1][1], pts[2][1], u) * s); }
  X.stroke(); X.restore();
}
function carIcon(x, y, s, col, a = 1, hollow = false) {   // side-on car, s = length
  X.save(); X.globalAlpha = a; X.translate(x, y); X.scale(s / 100, s / 100);
  X.beginPath();
  X.moveTo(-50, 8); X.lineTo(-48, -4); X.quadraticCurveTo(-46, -10, -36, -11); X.lineTo(-22, -12);
  X.quadraticCurveTo(-12, -26, 6, -26); X.lineTo(18, -26); X.quadraticCurveTo(28, -24, 36, -12); X.lineTo(44, -10); X.quadraticCurveTo(50, -8, 50, 0); X.lineTo(50, 8); X.closePath();
  if (hollow) { X.lineWidth = 3.2; X.strokeStyle = rgba(col); X.stroke(); } else { X.fillStyle = rgba(col); X.fill(); }
  X.fillStyle = hollow ? rgba(COL.ground) : rgba(COL.ground); X.strokeStyle = rgba(col); X.lineWidth = 3.2;
  [[-28, 9], [30, 9]].forEach(([wx, wy]) => { X.beginPath(); X.arc(wx, wy, 9, 0, 7); X.fill(); X.stroke(); });
  X.restore();
}

/* ---------------- grain + vignette ---------------- */
const grain = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), d = x.createImageData(256, 256); let s = 9; for (let i = 0; i < d.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = s & 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; })();
function finish(t, vig = .55) {
  const vg = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${vig})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const f = Math.floor(t * 60); g.save(); g.globalAlpha = .045; g.globalCompositeOperation = 'overlay';
  const ox = -((f * 97) % 256), oy = -((f * 57) % 256);
  for (let y = oy; y < H; y += 256) for (let x = ox; x < W; x += 256) g.drawImage(grain, x, y);
  g.restore();
}

/* ---------------- film runner ---------------- */
let lt = 0;            // local time of the scene being drawn
let FILM = null;       // { scenes:[{id,start,end,lines}], total }
const XF = .75;        // transition length
function sceneAt(t) { const s = FILM.scenes; for (let i = 0; i < s.length; i++) if (t < s[i].end) return i; return s.length - 1; }
function drawScene(i, t, ctx) {
  const sc = FILM.scenes[i]; const fn = SCENES[sc.id]; X = ctx; lt = t - sc.start;
  ctx.save(); fn(lt, sc.end - sc.start, sc.lines, sc); ctx.restore(); X = g;
}
window.seek = function (t) {
  T = t;
  const i = sceneAt(t), sc = FILM.scenes[i], nx = FILM.scenes[i + 1], pv = FILM.scenes[i - 1];
  // transition window centred on each boundary
  let a = null, b = null, p = 0;
  const contOf = s2 => s2 && (BGS[s2.id] || BGS._)(0).cont;
  if (nx && t > sc.end - XF / 2 && !(contOf(sc) && contOf(nx))) { a = i; b = i + 1; p = (t - (sc.end - XF / 2)) / XF; }
  else if (pv && t < sc.start + XF / 2 && !(contOf(sc) && contOf(pv))) { a = i - 1; b = i; p = (t - (sc.start - XF / 2)) / XF; }
  const bgOf = j => (BGS[FILM.scenes[j].id] || BGS._)(t - FILM.scenes[j].start);
  const BB = a !== null ? lerpBG(bgOf(a), bgOf(b), eio(p)) : bgOf(i);
  // an inserted section shifts later scenes in time; the background clock eases back by the same amount so reused frames join seamlessly
  const bs = FILM.bgshift, tb = bs ? t - bs.off * eio(clamp((t - bs.t0) / (bs.t1 - bs.t0))) : t;
  drawBG(BB, tb);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.filter = 'none'; g.globalAlpha = 1;
  if (a === null) drawScene(i, t, g);
  else {
    const wipe = (BGS[FILM.scenes[b].id] || BGS._)(0).wipe;
    if (wipe) {
      // kinetic-poster wipe: four bands of brand colour sweep across, the next scene is behind them
      const j = p < .5 ? a : b; drawScene(j, t, g);
      const nb = 4, bh = H / nb;
      for (let k = 0; k < nb; k++) {
        const c0 = eio(clamp((p - k * .04) / .34)), c1 = eio(clamp((p - .52 - k * .04) / .34));
        const xl = c1 * W, xr = c0 * W; if (xr - xl < .5) continue;
        g.fillStyle = rgba(wipe[k % wipe.length]); g.fillRect(xl, k * bh - 1, xr - xl, bh + 2);
      }
    } else {
      const q = eio(clamp(p));
      for (const [k, j] of [[0, a], [1, b]]) { const c = buf[k].getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); drawScene(j, t, c); }
      softDraw(g, buf[0], q * 22, 1 - q, 1 + .12 * q);
      softDraw(g, buf[1], (1 - q) * 22, q, .94 + .06 * q);
    }
  }
  finish(t, BB.vig ?? .55);
};

let T = 0;
const IMG = {};
const loadImg = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
