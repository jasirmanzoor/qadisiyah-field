"""Score and sound effects for the keynote cut, built sample by sample so every hit lands on its frame.
Music: A minor (Am-F-C-G), 92 BPM. Pad throughout; plucked arpeggio and a soft pulse join as the story builds;
near-silence before the last reveal; resolve on the end card.
SFX: whoosh peaking mid-transition, risers into key numbers, low impacts on reveals, an air bed under the flight,
light data blips on the map morphs. Writes music.wav and sfx.wav (48 kHz stereo)."""
import os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(S, "vid")
import json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from remap5 import R, B
TL = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vid", "timeline.json")))
SR = 48000; TOTAL = TL["total"]; N = int(TOTAL * SR)
rng = np.random.default_rng(7)
BPM = 92; BEAT = 60 / BPM; BAR = 4 * BEAT
STARTS = [c["start"] for c in TL["clips"]]
XF = .55
A3 = next(c["start"] for c in TL["clips"] if c["name"] == "act3v3")
INNER = [R(t) for t in [t + .35 for t in (6.9, 13.2, 19.5, 26.2, 36.1, 46.0, 52.9)] + [A3 + t + .35 for t in (11.9, 19.0)] \
        + [26.2 + 2.5 * k + .5 for k in (1, 2, 3)] + [36.1 + 2.5 * k + .5 for k in (1, 2, 3)] + [A3 + 2.4 * k + .5 for k in (1, 2, 3, 4)] + [A3 + 11.9 + 2.4 * k + .5 for k in (1, 2)] if True]   # scene wipes and stacked-panel arrivals
CUTS = sorted([s + XF / 2 for s in STARTS[1:]] + INNER)
HITS = [R(1.3), R(53.3)] + [R(t + 5.783) for t in (51.17, 104.97, 124.43, 139.19)] + [B["card_out2"] + .25, B["kafd2"] + .9, B["zoom1"] + 14.2, B["zoom1"] + 22.4]   # title, the turn to the data, six numbers, 16-29bn, 98%, SAR 1.4bn, end card
RISE = [R(t + 5.783) for t in (104.97, 124.43, 139.19)] + [B["zoom1"] + 14.2]
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
    t = np.arange(N) / SR; xs, ys = zip(*points); xs = [R(x) if x < 190.6 else x for x in xs]; return np.interp(t, xs, ys)

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
g_pad = curve([(0, 0), (2.00, .8), (53.78, .9), (55.28, 1), (139.38, 1), (139.98, .25), (144.68, .25), (144.98, 1.15), (169.09, 1), (173.09, .9), (188.09, .8), (TOTAL - .2, 0), (TOTAL, 0)])
g_sub = curve([(0, 0), (3.00, .5), (52.78, .6), (56.18, 1), (139.38, 1), (139.88, 0), (144.93, 0), (144.98, 1), (188.09, .8), (TOTAL, 0)])
g_arp = curve([(0, 0), (1.50, .5), (46.00, .6), (52.78, 0), (56.18, 0), (57.28, .8), (79.78, .8), (81.28, 1.1), (102.78, 1.1), (104.78, .8), (139.08, .8), (139.68, 0), (144.98, 0), (146.18, 1), (169.09, .8), (170.09, .9), (186.09, .9), (189.59, 0), (TOTAL, 0)])
g_kick = curve([(0, 0), (79.78, 0), (80.38, .8), (102.58, 1), (103.38, .45), (138.88, .45), (139.48, 0), (144.93, 0), (144.98, .8), (154.78, .6), (169.49, 0), (TOTAL, 0)])
g_hat = curve([(0, 0), (84.78, 0), (86.78, .8), (101.78, 1), (103.38, 0), (TOTAL, 0)])
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
    add(sfx, x * (.55 if h < R(54) or B["zoom1"] < h < B["zoom1"] + 25 or B["kafd2"] < h < B["card_out2"] else .9), h, 0)
for h in RISE:                                     # risers into the big numbers
    L = int(1.8 * SR); tt = np.arange(L) / SR; u = tt / 1.8
    f = 180 + 900 * u ** 2; tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * .25
    air = bp(rng.standard_normal(L), 900, 5000) * .5
    x = (tone + air) * u ** 2.2 * np.minimum(1, (1.8 - tt) / .03)
    add(sfx, x * .45, h - 1.8, -.2); add(sfx, x * .45, h - 1.8 + .011, .2)
L = int(23 * SR); tt = np.arange(L) / SR                # flight: a slow air bed with gentle movement
air = lp(rng.standard_normal(L), 380) * (np.minimum(1, tt / 3) * np.minimum(1, (23 - tt) / 3)) * (.75 + .25 * np.sin(2 * np.pi * .11 * tt))
add(sfx, air * .35, R(80.38), -.3); add(sfx, np.roll(air, 4000) * .35, R(80.38), .3)
Z0 = B["zoom1"]                                      # the dive: a high, thin air bed that thickens as the ground comes up
L = int(25 * SR); tt = np.arange(L) / SR
zair = (lp(rng.standard_normal(L), 300) * .9 + bp(rng.standard_normal(L), 1200, 4000) * .25 * np.exp(-tt / 9)) * np.minimum(1, tt / 2) * np.minimum(1, (25 - tt) / 2.5)
add(sfx, zair * .38, Z0, -.25); add(sfx, np.roll(zair, 3000) * .38, Z0, .25)
for c0, d in ((Z0 + 8.0, 1.6), (Z0 + 18.0, 2.6)):    # through the cloud bank, and the flight south
    L = int(d * SR); tt = np.arange(L) / SR; n = rng.standard_normal(L); x = bp(n, 400, 2600) * np.sin(np.pi * tt / d) ** 2
    add(sfx, x * .5, c0, -.4); add(sfx, np.roll(x, 900) * .5, c0, .4)
for t0, g in ((0.0, .22), (6.9, .2), (19.5, .18)):                  # a lighter air bed under the drive-by footage
    add(sfx, air[: int(7.5 * SR)] * g * np.minimum(1, np.minimum(np.arange(int(7.5 * SR)), int(7.5 * SR) - np.arange(int(7.5 * SR))) / SR / 1.2), R(t0), -.2)
for t0 in (B["zoom1"] + 13.5, B["zoom1"] + 21.2, R(95.95)):                                 # data blips as the map turns into data
    for q in range(7):
        f = 1800 + 400 * q; L = int(.07 * SR); tt = np.arange(L) / SR
        add(sfx, np.sin(2 * np.pi * f * tt) * np.exp(-tt * 60) * .06, t0 + q * .09 + rng.random() * .03, (q % 3 - 1) * .5)

# SwellCast opening: a sub swell from black, the streams' launch, a riser into the light bloom and its impact
L = int(3.0 * SR); tt = np.arange(L) / SR
add(sfx, np.sin(2 * np.pi * np.cumsum(32 + 18 * np.exp(-tt * 1.5)) / SR) * np.minimum(1, tt / .4) * np.exp(-tt * .9) * .7, .2, 0)
L = int(2.2 * SR); tt = np.arange(L) / SR; n = rng.standard_normal(L)
x = (bp(n, 250, 1600) * np.exp(-((tt - .55) / .35) ** 2) + hp(n, 3500) * .4 * np.exp(-((tt - .7) / .5) ** 2))
add(sfx, x * .6, .1, -.5); add(sfx, np.roll(x, 1200) * .6, .1, .5)
for k in range(10):                                     # glints as the first cards leave the origin
    f = 2200 + 260 * k; L = int(.5 * SR); tt = np.arange(L) / SR
    add(sfx, np.sin(2 * np.pi * f * tt) * np.exp(-tt * 9) * .035, .7 + k * .17, (k % 2) * .8 - .4)
L = int(2.0 * SR); tt = np.arange(L) / SR; u = tt / 2.0
x = (np.sin(2 * np.pi * np.cumsum(160 + 1100 * u ** 2) / SR) * .22 + bp(rng.standard_normal(L), 900, 6000) * .55) * u ** 2.4 * np.minimum(1, (2.0 - tt) / .03)
add(sfx, x * .5, 11.15 - 2.0, -.25); add(sfx, np.roll(x, 500) * .5, 11.15 - 2.0, .25)
L = int(2.4 * SR); tt = np.arange(L) / SR
boom = np.sin(2 * np.pi * np.cumsum(36 + 80 * np.exp(-tt * 12)) / SR) * np.exp(-tt * 2.0) + lp(rng.standard_normal(L), 1200) * np.exp(-tt * 7) * .5
add(sfx, (boom + fftconvolve(boom, ir[: int(1.4 * SR)])[:L] * .3) * .75, 11.15, 0)

for name, buf in (("music", mus), ("sfx", sfx)):
    buf /= max(1e-9, np.max(np.abs(buf))) / .8
    sf.write(os.path.join(OUT, name + ".wav"), buf.T.astype(np.float32), SR)
print("ok", N / SR)
