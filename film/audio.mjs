// Renders the soundtrack with OfflineAudioContext inside Chromium → WAV
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
const out = process.argv[2] || 'soundtrack.wav';
const b = await chromium.launch(); const p = await b.newPage();
const b64 = await p.evaluate(async () => {
  const SR = 48000, DUR = 40, BT = 0.5, OFF = 2; // OFF: new 2 s opening bar
  const RZ = 30 + OFF, BIG = 32 + OFF, END = 34 + OFF, FOLD = 37.42 + OFF; // riser start, strongest bar, end title, fold to line
  const ac = new OfflineAudioContext(2, SR * DUR, SR);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const master = ac.createDynamicsCompressor(); master.threshold.value = -14; master.ratio.value = 4; master.attack.value = 0.003; master.release.value = 0.12;
  const mg = ac.createGain(); mg.gain.value = 0.9; master.connect(mg); mg.connect(ac.destination);
  // reverb
  const ir = ac.createBuffer(2, SR * 1.6, SR);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
  const verb = ac.createConvolver(); verb.buffer = ir; const vg = ac.createGain(); vg.gain.value = 0.32; verb.connect(vg); vg.connect(master);
  const noiseBuf = ac.createBuffer(1, SR * 3, SR); { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }
  const noise = () => { const n = ac.createBufferSource(); n.buffer = noiseBuf; return n; };
  const env = (g, t, a, peak, dec, end = 0.0001) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + dec); };

  function kick(t, v = 1) {
    const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    env(g, t, 0.002, 0.95 * v, 0.38); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5);
    const n = noise(), f = ac.createBiquadFilter(), ng = ac.createGain(); f.type = 'highpass'; f.frequency.value = 2500; env(ng, t, 0.001, 0.12 * v, 0.02);
    n.connect(f); f.connect(ng); ng.connect(master); n.start(t, rnd()); n.stop(t + 0.05);
  }
  function hat(t, v = 0.16, dec = 0.04) {
    const n = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'highpass'; f.frequency.value = 8500; env(g, t, 0.001, v, dec);
    n.connect(f); f.connect(g); g.connect(master); n.start(t, rnd() * 2); n.stop(t + dec + 0.05);
  }
  function hit(t, big = false) {
    const n = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'bandpass'; f.frequency.setValueAtTime(big ? 1800 : 2600, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.5); f.Q.value = 0.7;
    env(g, t, 0.002, big ? 0.6 : 0.32, big ? 0.9 : 0.4); n.connect(f); f.connect(g); g.connect(master); g.connect(verb); n.start(t, rnd()); n.stop(t + 1.2);
    const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(big ? 70 : 90, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.6);
    env(og, t, 0.003, big ? 0.9 : 0.45, big ? 1.1 : 0.5); o.connect(og); og.connect(master); o.start(t); o.stop(t + 1.4);
    // metallic stab: two detuned squares through bandpass
    for (const fr of big ? [440, 659.25, 523.25] : [880, 1318.5]) { const s = ac.createOscillator(), sf = ac.createBiquadFilter(), sg = ac.createGain(); s.type = 'square'; s.frequency.value = fr;
      sf.type = 'bandpass'; sf.frequency.value = fr * 2; sf.Q.value = 3; env(sg, t, 0.002, big ? 0.05 : 0.035, big ? 0.7 : 0.18); s.connect(sf); sf.connect(sg); sg.connect(master); sg.connect(verb); s.start(t); s.stop(t + 1); }
  }
  function bass(t, f, len, v = 0.22) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = f; o2.frequency.value = f / 2; lp.type = 'lowpass'; lp.Q.value = 6;
    lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(180, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master); o.start(t); o2.start(t); o.stop(t + len + 0.02); o2.stop(t + len + 0.02);
  }
  function pluck(t, f, v = 0.06) { const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter(); o.type = 'triangle'; o.frequency.value = f;
    lp.type = 'lowpass'; lp.frequency.value = 3200; env(g, t, 0.002, v, 0.22); o.connect(lp); lp.connect(g); g.connect(master); g.connect(verb); o.start(t); o.stop(t + 0.3); }

  const roots = [55, 43.65, 65.41, 49.0]; // A F C G
  const arp = [[440, 523.25, 659.25], [349.23, 440, 523.25], [392, 523.25, 659.25], [392, 493.88, 587.33]];
  for (let k = 0; k < DUR * 2; k++) { const t = k * BT; const bar = Math.floor(k / 4);
    if (t < FOLD) kick(t, t >= BIG && t < END ? 1.1 : 1);
    if (t < END && !(t >= RZ + 1.5 && t < BIG)) { const r = roots[bar % 4]; bass(t + 0.25, r * 2, 0.22); bass(t + 0.375, r, 0.1, 0.12); }
    if (t < RZ || (t >= BIG && t < END)) { hat(t + 0.25, 0.14); hat(t + 0.125, 0.05); hat(t + 0.375, 0.05); }
    const u = t - OFF; if ((u >= 6 && u < 10) || (u >= 14 && u < 28)) { const a = arp[bar % 4]; for (let s = 0; s < 4; s++) pluck(t + s * 0.125, a[(k * 4 + s) % 3] * (s === 3 ? 2 : 1), 0.045); }
    if (t >= END && t < FOLD - 0.2) pluck(t, [880, 1046.5, 1318.5, 1174.66][k % 4], 0.03);
  }
  // logo pops: a soft tick for each bank / finance company landing
  for (let i = 0; i < 8; i++) pluck(OFF + 22.08 + i * 0.19, 1760, 0.035);
  for (let i = 0; i < 11; i++) pluck(OFF + 24.08 + i * 0.15, 2093, 0.03);
  // riser RZ → BIG
  for (let i = 0; i < 32; i++) { const t = RZ + i * 0.0625; if (i % 2 === 0 || t >= RZ + 1) hat(t, 0.04 + 0.2 * (i / 32), 0.06); }
  { const n = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, RZ); f.frequency.exponentialRampToValueAtTime(9000, BIG - 0.02);
    g.gain.setValueAtTime(0.0001, RZ); g.gain.exponentialRampToValueAtTime(0.55, BIG - 0.03); g.gain.linearRampToValueAtTime(0.0001, BIG);
    n.loop = true; n.connect(f); f.connect(g); g.connect(master); n.start(RZ); n.stop(BIG + 0.01); }
  for (const det of [-8, 0, 7]) { const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; o.detune.value = det;
    o.frequency.setValueAtTime(110, RZ); o.frequency.exponentialRampToValueAtTime(880, BIG - 0.02); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, RZ); lp.frequency.exponentialRampToValueAtTime(6000, BIG - 0.02);
    g.gain.setValueAtTime(0.0001, RZ); g.gain.exponentialRampToValueAtTime(0.06, BIG - 0.05); g.gain.linearRampToValueAtTime(0.0001, BIG);
    o.connect(lp); lp.connect(g); g.connect(master); o.start(RZ); o.stop(BIG + 0.01); }
  // scene-change hits
  for (const t of [2, 4, 6, 10, 14, 18, 22, 24, 26, 28, 30]) hit(t + OFF);
  hit(2.0); // opening: wide night shot
  hit(BIG, true); hit(END, true);
  // end chord under the title, decays to silence for the loop
  for (const f of [220, 261.63, 329.63, 440]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, END); g.gain.exponentialRampToValueAtTime(0.05, END + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, DUR - 0.1); o.connect(g); g.connect(master); g.connect(verb); o.start(END); o.stop(DUR); }
  pluck(FOLD, 1760, 0.05); pluck(FOLD + 0.5, 880, 0.04);

  const buf = await ac.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length;
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const gain = 0.89 / peak;
  // short fade at very end to avoid a click on loop
  const ab = new ArrayBuffer(44 + n * 4), dv = new DataView(ab); const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
  dv.setUint32(24, SR, true); dv.setUint32(28, SR * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { const f = i > n - 480 ? (n - i) / 480 : 1; dv.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] * gain * f)) * 32767, true); dv.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] * gain * f)) * 32767, true); }
  let s = ''; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
});
fs.writeFileSync(out, Buffer.from(b64, 'base64')); await b.close(); console.log('wrote', out);
