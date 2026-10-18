"""City-wide daylight imagery (Esri World Imagery z13), resampled onto the same equirectangular frame as the building layer."""
import sys, os, math, urllib.request, concurrent.futures as cf, numpy as np
from PIL import Image
S = sys.argv[1]; T = S + "/night/tiles13"; os.makedirs(T, exist_ok=True)
W0, E0, S0, N0 = 46.48, 47.02, 24.45, 25.02; Z = 13; n = 2 ** Z
tx = lambda lng: (lng + 180) / 360 * n
ty = lambda lat: (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
x0, x1 = int(tx(W0)), int(tx(E0)); y0, y1 = int(ty(N0)), int(ty(S0))
def get(a):
    x, y = a; p = f"{T}/{x}_{y}.jpg"
    if os.path.exists(p) and os.path.getsize(p) > 0: return
    url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z}/{y}/{x}"
    for k in range(4):
        try: open(p, "wb").write(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=40).read()); return
        except Exception as e: err = e
    print("FAIL", x, y, err)
jobs = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
with cf.ThreadPoolExecutor(12) as ex: list(ex.map(get, jobs))
mos = Image.new("RGB", ((x1 - x0 + 1) * 256, (y1 - y0 + 1) * 256))
for x, y in jobs:
    try: mos.paste(Image.open(f"{T}/{x}_{y}.jpg").convert("RGB"), ((x - x0) * 256, (y - y0) * 256))
    except Exception: pass
M = np.asarray(mos)
OW, OH = 3520, 4096
lngs = W0 + (np.arange(OW) + .5) / OW * (E0 - W0); lats = N0 - (np.arange(OH) + .5) / OH * (N0 - S0)
px = ((lngs + 180) / 360 * n - x0) * 256
py = ((1 - np.arcsinh(np.tan(np.radians(lats))) / math.pi) / 2 * n - y0) * 256
out = M[np.clip(py.astype(int), 0, M.shape[0] - 1)[:, None], np.clip(px.astype(int), 0, M.shape[1] - 1)[None, :]]
im = Image.fromarray(out)
im.save(S + "/night/sat-4k.jpg", quality=82, optimize=True, progressive=True)
im.resize((1760, 2048), Image.LANCZOS).save(S + "/night/sat-2k.jpg", quality=82, optimize=True, progressive=True)
im.resize((880, 1024), Image.LANCZOS).save(S + "/night/sat-preview.jpg", quality=80)
print(len(jobs), "tiles", mos.size)
