"""Score and sound effects for the keynote cut, built sample by sample so every hit lands on its frame.
Music: A minor (Am-F-C-G), 92 BPM. Pad throughout; plucked arpeggio and a soft pulse join as the story builds;
near-silence before the last reveal; resolve on the end card.
SFX: whoosh peaking mid-transition, risers into key numbers, low impacts on reveals, an air bed under the flight,
light data blips on the map morphs. Writes music.wav and sfx.wav (48 kHz stereo)."""
import os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(S, "vid")
SR = 48000; TOTAL = 146.4; N = int(TOTAL * SR)
rng = np.random.default_rng(7)
BPM = 92; BEAT = 60 / BPM; BAR = 4 * BEAT
STARTS = [0, 4.05, 11.5, 17.95, 24.608, 30.642, 35.675, 45.125, 58.575, 65.025, 68.892, 74.342, 80.0, 85.033, 90.067, 95.1, 100.133,
          106.583, 111.242, 118.275, 127.725, 135.758, 141.0]
XF = .55
CUTS = [s + XF / 2 for s in STARTS[1:]]                 # transition midpoints
HITS = [12.3, 66.1, 90.6, 123.5, 141.25]   # where each reveal actually lands in the cut            # number reveals and the end card
def lp(x, f): return sosfilt(butter(2, f / (SR / 2), "low", output="sos"), x)
def hp(x, f): return sosfilt(butter(2, f / (SR / 2), "high", output="sos"), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo / (SR / 2), hi / (SR / 2)], "band", output="sos"), x)
def env_ad(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
def at(t): return int(t * SR)
def nf(name): return 440 * 2 ** ((name - 69) / 12)            # midi -> Hz
def add(buf, x, t, pan=0.):
    i = at(t); j = min(N, i + len(x));
    if j <= i or i < 0: return
    l, r = np.sqrt(.5 * (1 - pan)), np.sqrt(.5 * (1 + pan)); buf[0, i:j] += x[: j - i] * l; buf[1, i:j] += x[: j - i] * r
def curve(points):                                   # piecewise-linear level over time
    t = np.arange(N) / SR; xs, ys = zip(*points); return np.interp(t, xs, ys)

# ---------------- music ----------------
mus = np.zeros((2, N)); t = np.arange(N) / SR
CH = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]      # Am F C G (voiced around A3)
pad = np.zeros(N)
for b0 in np.arange(0, TOTAL, 2 * BAR):
    chord = CH[int(round(b0 / (2 * BAR))) % 4]; L = int(2.6 * BAR * SR); tt = np.arange(L) / SR
    e = np.minimum(1, tt / 1.6) * np.minimum(1, np.maximum(0, (2.6 * BAR - tt) / 1.2))
    x = np.zeros(L)
    for m in chord:
        for det in (-.0016, .0016):
            f = nf(m) * (1 + det)
            for h in range(1, 7): x += np.sin(2 * np.pi * f * h * tt + rng.random() * 6.28) / h ** 1.35
    i = at(b0); j = min(N, i + L); pad[i:j] += (x * e)[: j - i]
pad = lp(pad, 1500) * .028
sub = np.zeros(N)
for b0 in np.arange(0, TOTAL, 2 * BAR):
    root = CH[int(round(b0 / (2 * BAR))) % 4][0] - 24; L = int(2 * BAR * SR); tt = np.arange(L) / SR
    e = np.minimum(1, tt / .4) * np.minimum(1, (2 * BAR - tt) / .4); i = at(b0); j = min(N, i + L)
    sub[i:j] += (np.sin(2 * np.pi * nf(root) * tt) * e)[: j - i]
sub *= .11
arp = np.zeros(N); pat = [0, 1, 2, 3, 2, 1, 3, 2]
for k, tb in enumerate(np.arange(0, TOTAL, BEAT / 2)):
    chord = CH[int(tb // (2 * BAR)) % 4]; m = chord[pat[k % 8]] + 12; f = nf(m); L = int(.9 * SR); tt = np.arange(L) / SR
    x = (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 7) + .35 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 11) + .12 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt * 16))
    x *= np.minimum(1, tt / .003); i = at(tb); j = min(N, i + L); arp[i:j] += x[: j - i] * (.8 + .2 * (k % 2 == 0))
arp = lp(arp, 4200) * .016
kick = np.zeros(N); hat = np.zeros(N)
for k, tb in enumerate(np.arange(0, TOTAL, BEAT)):
    L = int(.35 * SR); tt = np.arange(L) / SR; ph = 2 * np.pi * np.cumsum(45 + 80 * np.exp(-tt * 30)) / SR
    i = at(tb); j = min(N, i + L); kick[i:j] += (np.sin(ph) * np.exp(-tt * 9))[: j - i]
    L2 = int(.05 * SR); i2 = at(tb + BEAT / 2); j2 = min(N, i2 + L2)
    if i2 < N: hat[i2:j2] += (rng.standard_normal(L2) * np.exp(-np.arange(L2) / SR * 70))[: j2 - i2]
kick *= .16; hat = hp(hat, 7000) * .025
# arrangement: levels per layer over time (s, gain)
g_pad = curve([(0, 0), (2.5, .9), (11, 1), (118.0, 1), (118.6, .25), (123.2, .25), (123.5, 1.15), (140, 1.1), (145.6, 0), (TOTAL, 0)])
g_sub = curve([(0, 0), (4, .7), (35, .8), (36, 1), (118.0, 1), (118.5, 0), (123.45, 0), (123.5, 1), (144, .8), (TOTAL, 0)])
g_arp = curve([(0, 0), (11, 0), (12.5, .7), (35, .8), (36.5, 1.1), (58, 1.1), (60, .8), (117.6, .8), (118.2, 0), (123.5, 0), (124.7, 1), (140, .9), (144.5, 0), (TOTAL, 0)])
g_kick = curve([(0, 0), (35.4, 0), (36, .8), (57.8, 1), (58.6, .45), (117.4, .45), (118.0, 0), (123.45, 0), (123.5, .8), (134, .6), (138, 0), (TOTAL, 0)])
g_hat = curve([(0, 0), (40, 0), (42, .8), (57, 1), (58.6, 0), (TOTAL, 0)])
dry = pad * g_pad + arp * g_arp + kick * g_kick + hat * g_hat
# small hall: exponentially decaying noise impulse response, on pad and arp only
ir = rng.standard_normal(int(2.4 * SR)) * np.exp(-np.arange(int(2.4 * SR)) / SR * 2.6); ir = lp(ir, 5000); ir /= np.sqrt(np.sum(ir ** 2))
wet_src = pad * g_pad + arp * g_arp
wl = fftconvolve(wet_src, ir)[:N] * .32; wr = fftconvolve(wet_src, np.roll(ir, 311))[:N] * .32
mus[0] = dry + sub * g_sub + wl; mus[1] = dry + sub * g_sub + wr
# a whisper of stereo motion on the arpeggio
mus[0] += arp * g_arp * .25 * np.sin(2 * np.pi * .07 * t); mus[1] -= arp * g_arp * .25 * np.sin(2 * np.pi * .07 * t)

# ---------------- sound effects ----------------
sfx = np.zeros((2, N))
for k, c in enumerate(CUTS[:-1]):                       # whoosh: rises into the cut, peaks on its fastest frame
    L = int(1.1 * SR); tt = np.arange(L) / SR; n = rng.standard_normal(L)
    lo = bp(n, 300, 1400); hi = bp(n, 1400, 6000); mixw = np.clip(tt / 1.1, 0, 1)
    x = lo * (1 - mixw) + hi * mixw
    e = np.exp(-((tt - .62) / .22) ** 2); add(sfx, x * e * .55, c - .62, pan=(-.5 if k % 2 else .5))
for h in HITS:                                          # impact: sub drop + body + transient, with a short tail
    L = int(2.2 * SR); tt = np.arange(L) / SR
    ph = 2 * np.pi * np.cumsum(38 + 70 * np.exp(-tt * 14)) / SR
    boom = np.sin(ph) * np.exp(-tt * 2.4) * .9 + lp(rng.standard_normal(L), 900) * np.exp(-tt * 9) * .5
    tr = hp(rng.standard_normal(L), 3000) * np.exp(-tt * 60) * .25
    x = boom + tr; x = x + fftconvolve(x, ir[: int(1.2 * SR)])[:L] * .25
    add(sfx, x * .9, h, 0)
for h in HITS[1:4]:                                     # risers into the big numbers
    L = int(1.8 * SR); tt = np.arange(L) / SR; u = tt / 1.8
    f = 180 + 900 * u ** 2; tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * .25
    air = bp(rng.standard_normal(L), 900, 5000) * .5
    x = (tone + air) * u ** 2.2 * np.minimum(1, (1.8 - tt) / .03)
    add(sfx, x * .45, h - 1.8, -.2); add(sfx, x * .45, h - 1.8 + .011, .2)
L = int(23 * SR); tt = np.arange(L) / SR                # flight: a slow air bed with gentle movement
air = lp(rng.standard_normal(L), 380) * (np.minimum(1, tt / 3) * np.minimum(1, (23 - tt) / 3)) * (.75 + .25 * np.sin(2 * np.pi * .11 * tt))
add(sfx, air * .35, 35.7, -.3); add(sfx, np.roll(air, 4000) * .35, 35.7, .3)
for t0 in (25.0, 51.3):                                 # data blips as the map turns into data
    for q in range(7):
        f = 1800 + 400 * q; L = int(.07 * SR); tt = np.arange(L) / SR
        add(sfx, np.sin(2 * np.pi * f * tt) * np.exp(-tt * 60) * .06, t0 + q * .09 + rng.random() * .03, (q % 3 - 1) * .5)

for name, buf in (("music", mus), ("sfx", sfx)):
    buf /= max(1e-9, np.max(np.abs(buf))) / .8
    sf.write(os.path.join(OUT, name + ".wav"), buf.T.astype(np.float32), SR)
print("ok", N / SR)
