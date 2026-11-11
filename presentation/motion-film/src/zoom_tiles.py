# Satellite mosaics for the reel's orbit-to-Al Qadisiyah zoom (Esri World Imagery): one mosaic per zoom level 5..15,
# covering everything the camera sees while that level is drawn (scale 0.71x to 1.41x), following the same centre path as reel.js
import os, math, json, urllib.request, concurrent.futures as cf
from PIL import Image
S = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(S, 'img', 'zoom'); T = os.path.join(O, 'tiles'); os.makedirs(T, exist_ok=True)
KSA, RIY, Q = (24.0, 45.0), (24.70, 46.70), (24.8257, 46.8225)
def lerp(a, b, p): return a + (b - a) * p
def sm(a, b, x): u = min(1, max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u)
def centre(z):   # must match camCentre() in reel.js
    p1, p2 = sm(5.5, 8.5, z), sm(8.5, 12.5, z)
    lat = lerp(lerp(KSA[0], RIY[0], p1), Q[0], p2); lng = lerp(lerp(KSA[1], RIY[1], p1), Q[1], p2); return lat, lng
def world(lat, lng, L):
    n = 256 * 2 ** L; return ((lng + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
def get(z, x, y):
    p = f'{T}/{z}_{x}_{y}.jpg'
    if os.path.exists(p) and os.path.getsize(p) > 0: return
    url = f'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    for k in range(5):
        try: open(p, 'wb').write(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'autolink-film/1.0'}), timeout=40).read()); return
        except Exception as e: err = e
    print('FAIL', z, x, y, err)
spec = []
for L in range(5, 16):
    pts = [world(*centre(L + d / 20 - .55), L) for d in range(23)]
    x0p = min(p[0] for p in pts) - 1420; x1p = max(p[0] for p in pts) + 1420; y0p = min(p[1] for p in pts) - 830; y1p = max(p[1] for p in pts) + 830
    tx0, ty0, tx1, ty1 = int(x0p // 256), int(y0p // 256), int(x1p // 256), int(y1p // 256)
    jobs = [(L, x, y) for y in range(ty0, ty1 + 1) for x in range(tx0, tx1 + 1)]
    with cf.ThreadPoolExecutor(12) as ex: list(ex.map(lambda a: get(*a), jobs))
    nx, ny = tx1 - tx0 + 1, ty1 - ty0 + 1
    im = Image.new('RGB', (nx * 256, ny * 256), (30, 26, 22))
    for (z, x, y) in jobs:
        try: im.paste(Image.open(f'{T}/{z}_{x}_{y}.jpg').convert('RGB'), ((x - tx0) * 256, (y - ty0) * 256))
        except Exception: pass
    im.save(f'{O}/L{L}.jpg', quality=88); spec.append({'L': L, 'x0': tx0, 'y0': ty0, 'nx': nx, 'ny': ny}); print(L, nx, ny, flush=True)
json.dump(spec, open(f'{O}/spec.json', 'w'))
