"""City building layer from real outlines: polygons rasterised at 2x, box-downsampled to 3520x4096, then layered glow."""
import sys, gzip, json, numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter
S = sys.argv[1]; W0, E0, S0, N0 = 46.48, 47.02, 24.45, 25.02
OW, OH = 3520, 4096; SS = 2; W, H = OW * SS, OH * SS
im = Image.new("L", (W, H), 0); dr = ImageDraw.Draw(im); n = 0
fx = W / (E0 - W0); fy = H / (N0 - S0)
for f in ("osm/part-00153-4feead82-d499-422b-94cb-c036c212127a.c000.csv.gz", "osm/south.csv.gz"):
    for line in gzip.open(S + "/" + f, "rt"):
        i = line.find('"coordinates": ')
        ring = json.loads(line[i + 15: line.rfind("}", 0, line.rfind("}"))])[0]
        x0, y0 = ring[0]
        if not (W0 < x0 < E0 and S0 < y0 < N0): continue
        dr.polygon([((a - W0) * fx, (N0 - b) * fy) for a, b in ring], fill=255); n += 1
cov = np.asarray(im, np.float32).reshape(OH, SS, OW, SS).mean(axis=(1, 3)) / 255
halo = gaussian_filter(cov, 1.4); bloom = gaussian_filter(cov, 12); glow = gaussian_filter(cov, 55)
bloom /= np.percentile(bloom, 99.8); glow /= np.percentile(glow, 99.9)
L = 0.32 * cov + 0.15 * halo + 0.36 * np.clip(bloom, 0, 1.3) ** 1.5 + 0.26 * np.clip(glow, 0, 1.2) ** 1.8
stops = np.array([[0.00, 7, 11, 18], [0.06, 30, 30, 34], [0.20, 104, 54, 14], [0.45, 206, 120, 32], [0.75, 255, 184, 90], [1.10, 255, 238, 200]], np.float32)
img = np.stack([np.interp(L, stops[:, 0], stops[:, c + 1]) for c in range(3)], -1)
land = gaussian_filter((cov > 0).astype(np.float32), 26)
img += np.array([26, 36, 50], np.float32) * np.clip(land * 1.6, 0, 1)[..., None] * np.clip(1 - L / 0.25, 0, 1)[..., None]
out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
out.save(S + "/night/data-4k.jpg", quality=86, optimize=True, progressive=True)
out.resize((1760, 2048), Image.LANCZOS).save(S + "/night/data-2k.jpg", quality=86, optimize=True, progressive=True)
x, y = int((46.70 - W0) / (E0 - W0) * OW), int((N0 - 24.70) / (N0 - S0) * OH)
out.crop((x - 600, y - 450, x + 600, y + 450)).save(S + "/night/crop2.jpg", quality=82)
out.resize((880, 1024), Image.LANCZOS).save(S + "/night/preview2.jpg", quality=82)
print("polygons", n)
