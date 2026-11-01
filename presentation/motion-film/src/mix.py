# voice over score: the music ducks under the narrator (sidechain envelope), then loudness-normalised in ffmpeg
import sys, numpy as np, soundfile as sf
voice, score, out = sys.argv[1:4]
v, vsr = sf.read(voice, dtype='float32'); m, msr = sf.read(score, dtype='float32')
if v.ndim == 1: v = np.stack([v, v], 1)
# resample voice to the score rate (linear is fine for speech at 24k -> 48k)
x = np.arange(len(v)) / vsr; xi = np.arange(int(len(v) * msr / vsr)) / msr
v = np.stack([np.interp(xi, x, v[:, c]) for c in range(2)], 1).astype(np.float32)
n = max(len(v), len(m)); V = np.zeros((n, 2), np.float32); Mu = np.zeros((n, 2), np.float32); V[:len(v)] = v; Mu[:len(m)] = m
env = np.abs(V).max(1); win = int(msr * .05); env = np.convolve(env, np.ones(win) / win, 'same')
# attack 40 ms / release 350 ms smoothing of the duck gain
target = np.where(env > .02, 10 ** (-10 / 20), 1.0).astype(np.float32); g = np.empty_like(target); cur = 1.0
a_up, a_dn = np.exp(-1 / (msr * .35)), np.exp(-1 / (msr * .04))
for i in range(n): k = a_dn if target[i] < cur else a_up; cur = target[i] + (cur - target[i]) * k; g[i] = cur
mix = V * 1.0 + Mu * .55 * g[:, None]
mix /= max(1e-6, np.abs(mix).max()) / .9
sf.write(out, mix, msr)
