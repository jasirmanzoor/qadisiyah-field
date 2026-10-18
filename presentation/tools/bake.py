"""Accumulate Microsoft building footprints over Riyadh into an area grid (npz)."""
import sys, gzip, json, math, numpy as np
S = sys.argv[1]
W0, E0, S0, N0 = 46.48, 47.02, 24.45, 25.02
W = 4096; H = round(W * (N0 - S0) / ((E0 - W0) * math.cos(math.radians(24.73))))
acc = np.zeros((H, W), np.float32); n = 0
ky = 111320.0; kx = ky * math.cos(math.radians(24.73))
for f in ("osm/part-00153-4feead82-d499-422b-94cb-c036c212127a.c000.csv.gz", "osm/south.csv.gz"):
    for line in gzip.open(S + "/" + f, "rt"):
        i = line.find('"coordinates": ');
        if i < 0: continue
        ring = json.loads(line[i + 15: line.rfind("}", 0, line.rfind("}"))])[0]
        xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
        cx = sum(xs) / len(xs); cy = sum(ys) / len(ys)
        if not (W0 < cx < E0 and S0 < cy < N0): continue
        a = 0.0
        for k in range(len(ring) - 1): a += (xs[k] * ys[k + 1] - xs[k + 1] * ys[k])
        a = abs(a) / 2 * kx * ky
        px = int((cx - W0) / (E0 - W0) * W); py = int((N0 - cy) / (N0 - S0) * H)
        if 0 <= px < W and 0 <= py < H: acc[py, px] += a; n += 1
np.savez_compressed(S + "/night/acc.npz", acc=acc, bbox=np.array([W0, E0, S0, N0]))
print("buildings", n, "grid", W, H)
