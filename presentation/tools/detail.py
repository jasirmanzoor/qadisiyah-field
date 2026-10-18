"""Crisp district tiles: rasterise real building outlines; light up footprints that contain a GPS-confirmed showroom door."""
import sys, gzip, json, math, statistics, numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter
S = sys.argv[1]; D = json.load(open(S + "/data.json"))["d"]
HALF = 3.4  # km half-width
PX = 2048
ky = 111.32; kx = ky * math.cos(math.radians(24.73))
out = {}
for mk, key in ((0, "q"), (1, "s")):
    pts = [(r[9], r[10], r[18]) for r in D if r[3] == mk and r[9] is not None]
    clat = statistics.median(p[0] for p in pts); clng = statistics.median(p[1] for p in pts)
    w, e = clng - HALF / kx, clng + HALF / kx; s, n = clat - HALF / ky, clat + HALF / ky
    out[key] = dict(lat=clat, lng=clng, w=w, e=e, s=s, n=n, half=HALF)
    ver = [(la, lo) for la, lo, q in pts if q == "verified"]
    X = lambda lo: (lo - w) / (e - w) * PX; Y = lambda la: (n - la) / (n - s) * PX
    base = Image.new("L", (PX, PX), 0); lit = Image.new("L", (PX, PX), 0); db = ImageDraw.Draw(base); dl = ImageDraw.Draw(lit)
    nb = nl = 0
    for f in ("osm/part-00153-4feead82-d499-422b-94cb-c036c212127a.c000.csv.gz", "osm/south.csv.gz"):
        for line in gzip.open(S + "/" + f, "rt"):
            i = line.find('"coordinates": ')
            ring = json.loads(line[i + 15: line.rfind("}", 0, line.rfind("}"))])[0]
            x0 = ring[0][0]; y0 = ring[0][1]
            if not (w - 0.002 < x0 < e + 0.002 and s - 0.002 < y0 < n + 0.002): continue
            poly = [(X(a), Y(b)) for a, b in ring]
            db.polygon(poly, fill=255); nb += 1
            xs = [a for a, b in ring]; ys = [b for a, b in ring]
            for la, lo in ver:   # door point inside the footprint, or within ~12 m of it
                if min(xs) - 0.00012 <= lo <= max(xs) + 0.00012 and min(ys) - 0.00011 <= la <= max(ys) + 0.00011:
                    dl.polygon(poly, fill=255); nl += 1; break
    b = np.asarray(base, np.float32) / 255; l = np.asarray(lit, np.float32) / 255
    halo = gaussian_filter(b, 2.2); bloom = gaussian_filter(b, 26)
    lh = gaussian_filter(l, 3); lb = gaussian_filter(l, 14)
    L = 0.17 * b + 0.09 * halo + 0.30 * bloom ** 1.4 + 0.85 * l + 0.6 * lh + 0.7 * lb
    stops = np.array([[0.00, 7, 11, 18], [0.06, 30, 30, 34], [0.20, 104, 54, 14], [0.45, 206, 120, 32], [0.75, 255, 184, 90], [1.10, 255, 238, 200]], np.float32)
    img = np.stack([np.interp(L, stops[:, 0], stops[:, c + 1]) for c in range(3)], -1)
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(S + f"/night/tile-{key}.jpg", quality=84, optimize=True, progressive=True)
    print(key, "buildings", nb, "lit footprints", nl, "verified doors", len(ver))
json.dump(out, open(S + "/night/tiles.json", "w"), indent=1)
