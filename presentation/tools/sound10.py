"""Director's cut sound, v10: the same score, re-timed on the v9 picture by absolute times, and a redesigned
effects layer. Every effect is placed from the finished cut (clip starts from timeline.json plus the transitions
measured from the picture), so nothing depends on the older timing maps.
SFX kit: spectral-sweep whooshes that travel across the stereo field, layered cinematic impacts (sub drop, thump,
transient, metallic shimmer, wide hall), Shepard-style risers with a hard stop, reverse swells, a low brass "braam"
for SAR 1.4B, odometer tick rolls that lock with a bell, droplet pins, radar pings on the zoom, street and night
ambience under the field scenes, a city bed under KAFD and a sting on the end card. Writes music10.wav, sfx10.wav."""
import os, json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(S, "vid")
TL = json.load(open(os.path.join(OUT, "timeline.json"))); B = {c["name"]: c["start"] for c in TL["clips"]}
SR = 48000; TOTAL = TL["total"]; N = int(TOTAL * SR); XF = TL["xf"]
rng = np.random.default_rng(7)
BPM = 92; BEAT = 60 / BPM; BAR = 4 * BEAT
R = lambda x: x                                       # times below are already v9 times
def lp(x, f): return sosfilt(butter(2, f / (SR / 2), "low", output="sos"), x)
def hp(x, f): return sosfilt(butter(2, f / (SR / 2), "high", output="sos"), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo / (SR / 2), hi / (SR / 2)], "band", output="sos"), x)
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
# arrangement in v9 time: the score breathes before the data, drives the zoom and pins, drops out for
# "One more thing", returns on SAR 1.4B and settles under Act III and the end card
g_pad = curve([(0, 0), (2.0, .8), (64.7, .9), (66.7, 1), (169.4, 1), (170.0, .25), (174.9, .25), (175.25, 1.15), (199.4, 1), (203.4, .9), (224.0, .8), (TOTAL - .2, 0), (TOTAL, 0)])
g_sub = curve([(0, 0), (3.0, .5), (64.2, .6), (67.6, 1), (169.4, 1), (169.9, 0), (175.2, 0), (175.25, 1), (224.0, .8), (TOTAL, 0)])
g_arp = curve([(0, 0), (1.5, .5), (57.4, .6), (64.2, 0), (67.6, 0), (68.7, .8), (74.3, .8), (75.8, 1.1), (108.5, 1.1), (110.5, .8), (169.1, .8), (169.7, 0), (175.25, 0), (176.4, 1), (199.4, .8), (200.4, .9), (216.4, .9), (219.9, 0), (TOTAL, 0)])
g_kick = curve([(0, 0), (74.3, 0), (74.9, .8), (108.3, 1), (109.4, .45), (169.2, .45), (169.8, 0), (175.2, 0), (175.25, .8), (185.0, .6), (187.8, 0), (TOTAL, 0)])
g_hat = curve([(0, 0), (78.0, 0), (80.0, .8), (107.5, 1), (109.4, 0), (TOTAL, 0)])
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
def tt_(d): return np.arange(int(d * SR)) / SR
def put(x, t, gl=1., gr=None):                       # stereo or mono buffer at time t (seconds)
    x = np.atleast_2d(x); x = np.vstack([x, x]) if x.shape[0] == 1 else x
    i = at(t); j = min(N, i + x.shape[1]); i0 = max(0, -i); i = max(0, i)
    if j <= i: return
    sfx[0, i:j] += x[0, i0:i0 + j - i] * gl; sfx[1, i:j] += x[1, i0:i0 + j - i] * (gl if gr is None else gr)
def pan(x, p):                                         # p: scalar or per-sample array, -1 left .. 1 right
    return np.vstack([x * np.sqrt(.5 * (1 - p)), x * np.sqrt(.5 * (1 + p))])
# a wide stereo hall: decorrelated tails, 22 ms pre-delay, darker as it decays
def mk_ir(d, decay, seed):
    r = np.random.default_rng(seed); t = tt_(d); n = r.standard_normal(len(t)) * np.exp(-t * decay)
    n = lp(n, 6500) * .6 + lp(n, 1800) * .4; n[: int(.022 * SR)] = 0; return n / np.sqrt(np.sum(n ** 2))
IRL, IRR = mk_ir(3.2, 2.1, 11), mk_ir(3.2, 2.1, 12)
def verb(x, amt=.3, d=3.2):
    m = x if x.ndim == 1 else x.mean(0); n = int(d * SR)
    w = np.vstack([fftconvolve(m, IRL[:n]), fftconvolve(m, IRR[:n])]) * amt
    dry = np.vstack([m, m]) if x.ndim == 1 else x
    out = np.zeros((2, w.shape[1])); out[:, : dry.shape[1]] += dry; out += w; return out

def whoosh(d=1.1, peak=.62, bright=1., p0=-.6, p1=.6, body=1.):
    """Spectral sweep: bands light up low to high into the peak and fall back after; a pitched doppler body
    bends down through the peak; the whole thing travels across the stereo field."""
    t = tt_(d); n = rng.standard_normal(len(t)); x = np.zeros(len(t))
    bands = [(180, 400), (400, 800), (800, 1600), (1600, 3200), (3200, 6400), (6400, 11000)]
    for k, (lo, hi) in enumerate(bands):
        c = peak * d * (.55 + .09 * k * bright); w = .16 * d + .04 * k
        x += bp(n, lo, hi) * np.exp(-((t - c) / w) ** 2) * (1.0 if k < 4 else .7 * bright)
    f = 160 * np.exp(-3 * (t - peak * d)) ; f = np.clip(f, 50, 600)
    x += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-((t - peak * d) / (.12 * d)) ** 2) * .35 * body
    e = np.where(t < peak * d, (t / (peak * d)) ** 1.6, np.exp(-(t - peak * d) / (.18 * d)))
    p = p0 + (p1 - p0) / (1 + np.exp(-(t - peak * d) / (.08 * d)))
    return verb(pan(x * e, p), .18, 1.4)

def impact(g=1., shimmer=.35, d=3.0):
    t = tt_(d)
    sub = np.sin(2 * np.pi * np.cumsum(28 + 34 * np.exp(-t * 9)) / SR) * np.exp(-t * 1.5)
    thump = lp(rng.standard_normal(len(t)), 160) * np.exp(-t * 22) * 2.2
    crack = hp(rng.standard_normal(len(t)), 2800) * np.exp(-t * 85) * .55
    metal = sum(np.sin(2 * np.pi * f * t + k) * np.exp(-t * (2.2 + k * .6)) / (k + 1) for k, f in enumerate((523.3, 1187, 1873, 2711, 3540)))
    x = sub * .95 + thump * .55 + crack + metal * .05 * shimmer
    x = np.tanh(x * 1.4) / 1.4
    return verb(x, .42, 3.0) * g

def reverse_swell(d=1.6, bright=1.):                   # a reversed cymbal-and-hall tail that ends on the hit
    t = tt_(d); n = rng.standard_normal(len(t))
    x = (hp(n, 3500) * .7 * bright + bp(n, 900, 3500) * .5) * np.exp(-t * 3.2)
    y = verb(x, .6, d)[:, : len(t)][:, ::-1]; y[:, -int(.004 * SR):] *= np.linspace(1, 0, int(.004 * SR)); return y

def riser(d=1.9):                                      # Shepard-style climb, accelerating tremolo, hard stop
    t = tt_(d); u = t / d; x = np.zeros(len(t))
    for o in range(3):
        ph = (u * 1.0 + o / 3) % 1; f = 110 * 2 ** (ph * 3 + 1); w = np.sin(np.pi * ph) ** 2
        x += np.sin(2 * np.pi * np.cumsum(f) / SR) * w * .22
    n = rng.standard_normal(len(t)); air = bp(n, 700, 2500) * (1 - u) + bp(n, 2500, 9000) * u
    trem = .65 + .35 * np.sin(2 * np.pi * np.cumsum(4 + 14 * u ** 2) / SR)
    y = (x + air * .55) * u ** 2.3 * trem; y[-int(.06 * SR):] = 0                # 60 ms of silence before the hit
    return pan(y, np.sin(2 * np.pi * 2.5 * u) * .4 * u)

def braam(d=4.2):                                      # low brass cluster, filter opens then closes
    t = tt_(d); x = np.zeros(len(t))
    for m in (33, 40, 45, 52):                         # A1 E2 A2 E3
        for det in (-.006, 0, .007):
            f = nf(m) * (1 + det); ph = (f * t + rng.random()) % 1; x += (2 * ph - 1) / (1 + (m > 45))
    cut = 180 + 1700 * np.exp(-((t - .35) / .5) ** 2) + 400 * np.exp(-t / 1.4)
    y = np.zeros(len(t)); seg = int(.02 * SR)
    for i in range(0, len(t), seg):                    # piecewise low-pass following the cutoff curve
        y[i:i + seg] = lp(x[max(0, i - seg * 4): i + seg], cut[i])[-len(x[i:i + seg]):]
    e = np.minimum(1, t / .03) * np.exp(-t / 1.6)
    return verb(np.tanh(y * e * .5) * 1.2, .5, 3.2)

def bell(f=1318.5, d=2.4, idx=3.0, ratio=3.5):         # FM bell
    t = tt_(d); I = idx * np.exp(-t * 2.5)
    return np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t * 1.9)

def tick(f=2600, g=1.):
    t = tt_(.035); return (hp(rng.standard_normal(len(t)), 4000) * .5 + np.sin(2 * np.pi * f * t)) * np.exp(-t * 140) * g

def lock(t0, g=1., chord=(1318.5,)):                   # the number settles: click, sub tap, bell in the hall
    t = tt_(.25); tap = np.sin(2 * np.pi * 78 * t) * np.exp(-t * 18)
    put(pan(tick(3200, 1.4) , 0) * .5 * g, t0); put(np.vstack([tap, tap]) * .55 * g, t0)
    b = sum(bell(f) for f in chord) / len(chord); put(verb(b, .45, 2.6) * .16 * g, t0 + .005)

def tick_roll(t0, dur, n=34, g=1., stagger_ease=True):  # odometer reels: fast at first, easing to a stop
    for k in range(n):
        u = k / n; s = 1 - (1 - u) ** 2.6 if stagger_ease else u
        put(pan(tick(2200 + 700 * (k % 3), .55 * (1 - .6 * u)), (k % 2) * .5 - .25) * .32 * g, t0 + s * dur)

def droplet(f):
    t = tt_(.09); fr = f * (1 + .6 * (1 - np.exp(-t * 60)))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 55)

def ping(t0, f=1250, g=1.):                            # radar ping with a fading echo
    t = tt_(.6); x = np.sin(2 * np.pi * f * t) * np.exp(-t * 9) + .3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 14)
    for k in range(4): put(pan(x * .9 ** k * .5 ** k, (-.5, .5)[k % 2] * (k > 0)) * .12 * g, t0 + k * .27)

def bed(t0, d, kind, g=1.):                            # ambience beds with soft edges
    t = tt_(d); n = rng.standard_normal(len(t)); m = rng.standard_normal(len(t))
    edge = np.minimum(1, t / 1.5) * np.minimum(1, (d - t) / 1.5)
    if kind == "street":                               # distant traffic hum and air
        L = lp(n, 220) * (.8 + .2 * np.sin(2 * np.pi * .09 * t)) + bp(n, 600, 2400) * .12
        Rr = lp(m, 220) * (.8 + .2 * np.sin(2 * np.pi * .07 * t + 1)) + bp(m, 600, 2400) * .12
    elif kind == "night":                              # warm night air with sparse crickets
        L = lp(n, 300) * .7; Rr = lp(m, 300) * .7
        for c in np.arange(.8, d - 1, .37):
            if rng.random() < .55:
                ct = tt_(.12); chirp = np.sin(2 * np.pi * 4300 * ct) * (np.sin(2 * np.pi * 38 * ct) > 0) * np.exp(-ct * 18) * .05
                s = int(c * SR); (L if rng.random() < .5 else Rr)[s:s + len(ct)] += chirp[: len(L) - s]
    elif kind == "wind":                               # high altitude: thin air thickening as the ground comes up
        u = t / d
        L = lp(n, 280) * (.4 + .6 * u) + bp(n, 1200, 4500) * .35 * (1 - u) * (.7 + .3 * np.sin(2 * np.pi * .23 * t))
        Rr = lp(m, 280) * (.4 + .6 * u) + bp(m, 1200, 4500) * .35 * (1 - u) * (.7 + .3 * np.sin(2 * np.pi * .19 * t + 2))
    else:                                              # city: a low district hum and the odd far-off pass-by
        L = lp(n, 160) + bp(n, 300, 1200) * .15; Rr = lp(m, 160) + bp(m, 300, 1200) * .15
        for c in (1.6, 4.9):
            if c < d - 1.5:
                w = whoosh(2.2, .55, .3, -.8, .8, .2); s = int(c * SR); k = min(w.shape[1], len(L) - s)
                L[s:s + k] += w[0, :k] * .12; Rr[s:s + k] += w[1, :k] * .12
    put(np.vstack([L * edge, Rr * edge]) * g, t0)

# ---------------- cue sheet (v9 times) ----------------
A = lambda name, off=0.: B[name] + off
BOUND = [s + XF / 2 for s in [c["start"] for c in TL["clips"]][1:]]
SEEN = [11.29, 15.25, 16.88, 25.58, 31.62, 37.96, 40.71, 43.04, 45.67, 47.83, 50.58, 52.92, 55.58, 58.12, 65.04,
        104.58, 129.54, 150.38, 190.54, 192.88, 195.17, 197.71, 199.75, 202.38, 204.79, 206.88]   # wipes measured on the picture
QUIET = [(169.4, 175.3), (215.9, 230), (74.6, 98.6)]   # tension, the clean KAFD close, the zoom (it has its own air)
ACTCUT = {round(A("b_seg_02") + XF / 2, 2), round(A("act3v6") + XF / 2, 2)}
cuts = sorted(set(round(x, 2) for x in BOUND + SEEN))
merged = []
for c in cuts:
    if merged and c - merged[-1] < .7: continue
    merged.append(c)
for k, c in enumerate(merged):
    if any(a < c < b for a, b in QUIET) or c < 11: continue
    act3 = c > A("act3v6")
    if round(c, 2) in ACTCUT: continue                 # act changes get their own treatment below
    g = .5 if act3 else .62
    sgn = 1 if k % 2 else -1
    put(whoosh(1.15, .62, .8 if act3 else 1., -.65 * sgn, .65 * sgn, .6 if act3 else 1.) * g, c - .62 * 1.15)

# opening: sub swell from black, the streams launching, glints, a riser into the light bloom, the bloom impact
t = tt_(3.2); put(np.sin(2 * np.pi * np.cumsum(30 + 16 * np.exp(-t * 1.4)) / SR) * np.minimum(1, t / .5) * np.exp(-t * .8) * .6, .15)
put(whoosh(2.2, .4, .9, -.8, .8) * .6, .05)
for k in range(12):
    put(pan(bell(2093 + 196 * k, .9, 1.2, 2.0) * .05, (k % 2) * 1.4 - .7), .62 + k * .16)
bed(1.5, 9.5, "street", .05)
put(riser(2.1) * .55, 11.2 - 2.1); put(reverse_swell(1.4) * .35, 11.2 - 1.4)
put(impact(.75, .6), 11.2)
# Act I: field ambience by time of day, the founder's line on a soft low hit
bed(31.0, 12.4, "street", .07)                         # daylight, door after door
bed(43.0, 15.0, "night", .08)                          # after dark: prayer, flagships under the lights
put(reverse_swell(1.3, .6) * .25, 19.14 - 1.3); put(impact(.45, .2), 19.14)
# the turn to the data: riser, black, impact; the six numbers count up
TD = A("b_seg_02") + XF / 2
put(riser(2.2) * .55, TD - 2.2); put(impact(1.0, .5), TD)
tick_roll(TD + .55, 1.9, 40, .9); lock(TD + 2.5, .8, (1318.5, 1975.5))
# the zoom: altitude air, a pass through the cloud bank, radar pings as each level locks, a hit on each district
Z0 = A("zoom1"); bed(Z0, 25.0, "wind", .16)
put(whoosh(2.6, .55, .7, -.9, .9, .4) * .45, Z0 + 6.6)
for k, o in enumerate((1.4, 8.2, 13.6, 18.6)): ping(Z0 + o + .3, 1250 + 160 * k, .9)
put(impact(.55, .4), Z0 + 14.2); put(impact(.5, .4), Z0 + 22.4)
put(whoosh(1.15) * .6, A("pins") + XF / 2 - .7)
# every showroom pinned: droplets in two voices, accelerating, then the map locks
P0 = A("pins")
for d0, n, f0, pn in ((1.2, 309, 2300, -.45), (1.4, 165, 1700, .45)):
    for i in range(n):
        u = i / n; t0 = P0 + d0 + 3.4 * (u ** .8)
        put(pan(droplet(f0 * (1 + .3 * rng.random())), pn + .3 * (rng.random() - .5)) * .045 * (.6 + .4 * rng.random()), t0)
lock(P0 + 4.9, .7, (1046.5, 1568))
# the data advantage: the plane drifts in on air, 520 rolls and locks, each point lands with a soft tick
M0 = A("moat"); put(whoosh(2.0, .5, .6, -.5, .5, .3) * .35, M0 + .1)
tick_roll(M0 + 1.4, 1.8, 30, .9); lock(M0 + 3.0, 1.0, (1318.5, 1975.5, 2637))
for i in range(4): put(pan(tick(2600, .8), .2) * .22, M0 + 3.25 + i * .9)
# counted by hand; 4.2 per 10 and the market size; one city, two markets
tick_roll(A("b_seg_05") + .6, 2.6, 46, .7)
put(reverse_swell(1.2) * .3, 128.71 - 1.2); put(impact(.85, .5), 128.71)
put(impact(.45, .3), A("b_seg_11") + .6)
# the top end: images falling past the lens
for k, c in enumerate(np.arange(A("premium") + 1.0, A("premium") + 9.0, .85)):
    put(whoosh(.55, .55, 1.0, (-.7, .7)[k % 2], (.7, -.7)[k % 2], .3) * .22, c)
# 98% and 11 of 13 settle on their reels
I0 = A("indep"); tick_roll(I0 + .55, 1.6, 30, .9); lock(I0 + 2.2, .95, (1318.5, 1975.5))
K0 = A("bank"); tick_roll(K0 + .55, 1.5, 24, .9); lock(K0 + 2.05, .95, (1318.5,)); put(pan(bell(1975.5, 1.6) , .3) * .06, K0 + 1.6)
# One more thing: near silence, three slow heartbeats, a climb, a breath of nothing, then the braam on SAR 1.4B
H = 175.25
for k, hb in enumerate((171.4, 172.35, 173.15)):
    t = tt_(.5); beat = np.sin(2 * np.pi * np.cumsum(55 + 25 * np.exp(-t * 30)) / SR) * np.exp(-t * 11)
    put(np.vstack([beat, beat]) * (.35 + .1 * k), hb); put(np.vstack([beat, beat]) * (.22 + .07 * k), hb + .2)
put(riser(1.8) * .6, H - 1.8); put(reverse_swell(1.5) * .35, H - 1.5 - .06)
put(braam(4.4) * 1.0, H); put(impact(.9, .7), H)
put(reverse_swell(1.0, .6) * .25, A("b_seg_20") + XF / 2 - 1.0); put(impact(.5, .2), A("b_seg_20") + XF / 2)
# Act III: a breath into the people, soft wipes (above)
put(whoosh(2.4, .5, .5, 0, 0, 1.2) * .45, A("act3v6") + XF / 2 - 1.2); put(impact(.4, .15), A("act3v6") + XF / 2 + .1)
# KAFD: one shot, a city bed under it, a reverse swell into the end card, then the sting
bed(A("kafd7") - .3, 9.6, "city", .09)
EC = A("card_out2") + .25
put(reverse_swell(1.8) * .4, EC - 1.8)
put(impact(.7, .9), EC)
st = sum(bell(f, 4.5, 1.6, 2.0) * w for f, w in ((440, 1), (554.4, .8), (659.3, .8), (880, .6), (1318.5, .35)))
put(verb(st, .6, 3.2) * .07, EC + .02)

# gentle glue on the effects bus: soft saturation, then peak-normalise both stems
sfx = np.tanh(sfx * 1.2) / 1.2
for name, buf in (("music10", mus), ("sfx10", sfx)):
    buf /= max(1e-9, np.max(np.abs(buf))) / .8
    sf.write(os.path.join(OUT, name + ".wav"), buf.T.astype(np.float32), SR)
print("ok", N / SR, "whooshes", sum(1 for c in merged if not any(a < c < b for a, b in QUIET) and c >= 11))
