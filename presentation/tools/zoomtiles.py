"""Satellite tile ladder for the film's globe-to-block zoom: one Mercator mosaic per zoom level, each centred on
where the camera is at that level, so every layer lines up exactly with the one above it."""
import os, math, json, urllib.request, concurrent.futures as cf
from PIL import Image
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = os.path.join(S, "zoomtiles"); O = os.path.join(S, "portfolio", "zoom")
def txy(lat, lng, z):
    n = 2 ** z; return ((lng + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
def get(z, x, y):
    p = f"{T}/{z}_{x}_{y}.jpg"
    if os.path.exists(p) and os.path.getsize(p) > 0: return
    url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    for k in range(5):
        try:
            d = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=40).read(); open(p, "wb").write(d); return
        except Exception as e: err = e
    print("FAIL", z, x, y, err)
RIY, Q, SH = (24.70, 46.70), (24.8255, 46.8241), (24.5475, 46.6835)
MQ = ((RIY[0] + Q[0]) / 2, (RIY[1] + Q[1]) / 2); MS = ((Q[0] + SH[0]) / 2, (Q[1] + SH[1]) / 2)
L = [("w2", 2, None, 4), ("w3", 3, None, 8)]
L += [(f"r{z}", z, RIY, 12) for z in range(4, 9)]
L += [(f"m{z}", z, MQ, 12) for z in range(9, 13)]
L += [(f"q{z}", z, Q, 10) for z in range(13, 18)]
L += [(f"x{z}", z, MS, 14) for z in (12, 13)]
L += [(f"s{z}", z, SH, 10) for z in range(14, 18)]
spec = []
for name, z, c, n in L:
    if c is None: x0 = y0 = 0
    else:
        tx, ty = txy(*c, z); x0 = int(math.floor(tx - n / 2)); y0 = int(math.floor(ty - n / 2))
    jobs = [(z, x0 + i, y0 + j) for j in range(n) for i in range(n)]
    with cf.ThreadPoolExecutor(16) as ex: list(ex.map(lambda a: get(*a), jobs))
    im = Image.new("RGB", (n * 256, n * 256), (40, 34, 28))
    for (zz, x, y) in jobs:
        p = f"{T}/{zz}_{x}_{y}.jpg"
        try: im.paste(Image.open(p).convert("RGB"), ((x - x0) * 256, (y - y0) * 256))
        except Exception: pass
    im.save(f"{O}/{name}.jpg", quality=90); spec.append({"id": name, "z": z, "x0": x0, "y0": y0, "n": n}); print(name, z, x0, y0, n, flush=True)
json.dump(spec, open(f"{O}/spec.json", "w"))
