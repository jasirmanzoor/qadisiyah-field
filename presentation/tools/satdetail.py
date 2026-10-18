"""Daylight z16 imagery for each district tile, resampled to the exact bbox of the building-detail tile."""
import sys, os, math, json, urllib.request, concurrent.futures as cf, numpy as np
from PIL import Image
S = sys.argv[1]; T = S + "/night/tiles16"; os.makedirs(T, exist_ok=True); Z = 16; n = 2 ** Z
tiles = json.load(open(S + "/night/tiles.json"))
def get(a):
    x, y = a; p = f"{T}/{x}_{y}.jpg"
    if os.path.exists(p) and os.path.getsize(p) > 0: return
    url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z}/{y}/{x}"
    for k in range(4):
        try: open(p, "wb").write(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=40).read()); return
        except Exception as e: err = e
    print("FAIL", x, y, err)
for key, t in tiles.items():
    fx = lambda lng: (lng + 180) / 360 * n; fy = lambda lat: (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    x0, x1, y0, y1 = int(fx(t["w"])), int(fx(t["e"])), int(fy(t["n"])), int(fy(t["s"]))
    jobs = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
    with cf.ThreadPoolExecutor(12) as ex: list(ex.map(get, jobs))
    mos = Image.new("RGB", ((x1 - x0 + 1) * 256, (y1 - y0 + 1) * 256))
    for x, y in jobs:
        try: mos.paste(Image.open(f"{T}/{x}_{y}.jpg").convert("RGB"), ((x - x0) * 256, (y - y0) * 256))
        except Exception: pass
    M = np.asarray(mos); P = 2048
    lngs = t["w"] + (np.arange(P) + .5) / P * (t["e"] - t["w"]); lats = t["n"] - (np.arange(P) + .5) / P * (t["n"] - t["s"])
    px = (fx(0) * 0 + (lngs + 180) / 360 * n - x0) * 256; py = ((1 - np.arcsinh(np.tan(np.radians(lats))) / math.pi) / 2 * n - y0) * 256
    out = M[np.clip(py.astype(int), 0, M.shape[0] - 1)[:, None], np.clip(px.astype(int), 0, M.shape[1] - 1)[None, :]]
    Image.fromarray(out).save(S + f"/night/sat-{key}.jpg", quality=80, optimize=True, progressive=True)
    print(key, len(jobs), "tiles")
