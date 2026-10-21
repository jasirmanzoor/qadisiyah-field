"""v11 score: the v10 score (music10.wav) kept as it is, with three warmer layers on the same chords and tempo
(A minor, Am-F-C-G every two bars, 92 BPM): a felt-piano motif under the field and people scenes, soft strings
through the film, and a plucked oud-like line on the opening and the close. Writes music11.wav."""
import os, json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); V = os.path.join(S, "vid")
TL = json.load(open(os.path.join(V, "timeline.json"))); TOTAL = TL["total"]
SR = 48000; N = int(TOTAL * SR); rng = np.random.default_rng(21)
BEAT = 60 / 92; BAR = 4 * BEAT; SEG = 2 * BAR
CH = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]
def lp(x, f): return sosfilt(butter(2, f / (SR / 2), "low", output="sos"), x)
def hp(x, f): return sosfilt(butter(2, f / (SR / 2), "high", output="sos"), x)
def nf(m): return 440 * 2 ** ((m - 69) / 12)
def tt_(d): return np.arange(int(d * SR)) / SR
def add(buf, x, t, p=0.):
    i = int(t * SR); j = min(N, i + len(x))
    if j > i: buf[0, i:j] += x[: j - i] * np.sqrt(.5 * (1 - p)); buf[1, i:j] += x[: j - i] * np.sqrt(.5 * (1 + p))
def curve(pts): xs, ys = zip(*pts); return np.interp(np.arange(N) / SR, xs, ys)
def mk_ir(d, decay, seed):
    r = np.random.default_rng(seed); t = tt_(d); n = r.standard_normal(len(t)) * np.exp(-t * decay)
    n = lp(n, 5500); n[: int(.03 * SR)] = 0; return n / np.sqrt(np.sum(n ** 2))
IRL, IRR = mk_ir(3.6, 1.8, 31), mk_ir(3.6, 1.8, 32)
def hall(x, amt): return x + np.vstack([fftconvolve(x[0], IRL)[:N], fftconvolve(x[1], IRR)[:N]]) * amt
chord_at = lambda t: CH[int(t // SEG) % 4]

# felt piano: slightly stretched partials, soft hammer, two-stage decay, darkened by the felt
def piano(m, v=1., d=3.2):
    t = tt_(d); f = nf(m); x = np.zeros(len(t))
    for h in range(1, 9):
        fh = f * h * np.sqrt(1 + .0004 * h * h); x += np.sin(2 * np.pi * fh * t) * np.exp(-t * (1.1 + .55 * h)) / h ** 1.1
    x = x * (.7 * np.exp(-t * 2.2) + .3 * np.exp(-t * .45)) + lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 60) * .08
    x *= np.minimum(1, t / .008); return lp(x, 1800 + 900 * v) * v
MOT = {0: [(0, 76), (1.5, 72), (3, 69), (5, 71)], 1: [(0, 77), (1.5, 72), (3, 69), (5, 72)],
       2: [(0, 76), (1.5, 72), (3, 67), (5, 74)], 3: [(0, 74), (1.5, 71), (3, 67), (5.5, 71)]}
pno = np.zeros((2, N))
for s0 in np.arange(0, TOTAL, SEG):
    ci = int(s0 // SEG) % 4
    add(pno, piano(CH[ci][0] - 12, .45, 4.5), s0, -.25)                         # soft low root
    for k, (b, m) in enumerate(MOT[ci]):
        add(pno, piano(m, .75 + .2 * rng.random() - .1 * k), s0 + b * BEAT + rng.random() * .012, .15 + .1 * (m > 72))

# soft strings: a detuned saw ensemble with slow vibrato, long attack, voiced low and wide
str_ = np.zeros((2, N))
for s0 in np.arange(0, TOTAL, SEG):
    ch = chord_at(s0 + .1); L = int((SEG + 1.4) * SR); t = np.arange(L) / SR
    e = np.minimum(1, t / 1.3) * np.minimum(1, np.maximum(0, (SEG + 1.4 - t) / 1.4))
    for side, voices in ((-1, [ch[0] - 12, ch[1]]), (1, [ch[2], ch[3]])):
        x = np.zeros(L)
        for m in voices:
            for det in (-.004, .0, .005):
                f = nf(m) * (1 + det) * (1 + .003 * np.sin(2 * np.pi * (4.8 + det * 100) * t + rng.random() * 6))
                ph = np.cumsum(f) / SR + rng.random(); x += (2 * (ph % 1) - 1)
        x = lp(lp(x, 1500), 2200) * e; add(str_, x, s0, .55 * side)

# oud-like pluck: Karplus-Strong with a bright attack and a small slide into the note, a grace note on accents
def oud(m, v=1., d=1.6, grace=None):
    f = nf(m); P = int(SR / f); L = int(d * SR); buf = rng.standard_normal(P) * .9; y = np.zeros(L)
    for i in range(L):
        y[i] = buf[i % P]; buf[i % P] = .5 * (buf[i % P] + buf[(i + 1) % P]) * .996
    slide = np.interp(np.arange(L), [0, int(.04 * SR), L], [1.012, 1, 1])           # resample for the slide
    idx = np.clip(np.cumsum(slide), 0, L - 1); y = np.interp(idx, np.arange(L), y)
    y = hp(y, 140) * np.exp(-np.arange(L) / SR * 1.8) * v
    if grace is not None:
        g = oud(grace, v * .5, .18); y[: len(g)] += g * np.linspace(1, 0, len(g))
    return y
LINE = [(0, 69, 1, None), (1, 72, .8, None), (1.5, 71, .6, None), (2, 69, .9, 71), (3, 64, .8, None), (4, 65, .7, None),
        (4.5, 64, .6, None), (5, 62, .7, None), (6, 64, .9, 65), (7, 57, .7, None)]
oudb = np.zeros((2, N))
for start, end in ((.6, 11.2), (215.6, TOTAL - .5)):
    for s0 in np.arange(start, end, SEG):
        for b, m, v, gr in LINE:
            t0 = s0 + b * BEAT
            if t0 < end - .4: add(oudb, oud(m - 12, v, 1.6, None if gr is None else gr - 12), t0 + rng.random() * .01, -.35 + .1 * (b % 2))

# arrangement (v9 times): piano with the field and people scenes, strings throughout and fuller where the story is
# human, the oud on the opening and the close; everything out for "One more thing"
g_pno = curve([(0, 0), (2.0, 0), (4.0, .8), (63.6, .9), (65.2, 0), (187.6, 0), (189.4, 1), (222.0, 1), (224.2, .7), (TOTAL - .3, 0), (TOTAL, 0)])
g_str = curve([(0, 0), (6.0, .35), (11.2, .6), (64.0, .75), (67.6, .45), (169.2, .45), (169.8, 0), (175.25, 0), (176.6, .7), (187.5, .8), (190.0, 1), (222.0, 1), (TOTAL - .2, 0), (TOTAL, 0)])
g_oud = curve([(0, 0), (.6, .9), (10.8, .9), (11.4, 0), (215.4, 0), (216.6, .8), (TOTAL - .4, .8), (TOTAL, 0)])
def rms(x): return np.sqrt(np.mean(x ** 2)) + 1e-9
mus10, _ = sf.read(os.path.join(V, "music10.wav")); mus10 = mus10.T
ref = rms(mus10[:, int(20 * SR): int(60 * SR)])                                    # the score's level under Act I
pno *= .85 * ref / rms(pno[:, int(20 * SR): int(60 * SR)]); str_ *= .55 * ref / rms(str_[:, int(20 * SR): int(60 * SR)])
oudb *= .7 * ref / rms(oudb[:, int(1 * SR): int(10 * SR)])
new = hall(pno * g_pno, .45) + hall(str_ * g_str, .35) + hall(oudb * g_oud, .3)
out = mus10 * .85 + new
out /= np.max(np.abs(out)) / .8
sf.write(os.path.join(V, "music11.wav"), out.T.astype(np.float32), SR); print("ok", TOTAL)
