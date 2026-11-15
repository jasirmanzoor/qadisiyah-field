# Extra satellite mosaics for the reel's pull-back from Al Qadisiyah to frame Al Shifa as well (levels 12-14),
# covering every view between the Al Qadisiyah close-up and the two-district frame (see RGLOBE in globe.js)
import os, math, json, urllib.request, concurrent.futures as cf
from PIL import Image
S = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(S, 'img', 'zoom'); T = os.path.join(O, 'tiles')
Q, MID = (24.8257, 46.8225), (24.687, 46.7535)
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
for L in (12, 13, 14):
    a, b = world(*Q, L), world(*MID, L)
    x0p, x1p = min(a[0], b[0]) - 1490, max(a[0], b[0]) + 1490; y0p, y1p = min(a[1], b[1]) - 850, max(a[1], b[1]) + 850
    tx0, ty0, tx1, ty1 = int(x0p // 256), int(y0p // 256), int(x1p // 256), int(y1p // 256)
    jobs = [(L, x, y) for y in range(ty0, ty1 + 1) for x in range(tx0, tx1 + 1)]
    with cf.ThreadPoolExecutor(12) as ex: list(ex.map(lambda j: get(*j), jobs))
    nx, ny = tx1 - tx0 + 1, ty1 - ty0 + 1
    im = Image.new('RGB', (nx * 256, ny * 256), (30, 26, 22))
    for (z, x, y) in jobs:
        try: im.paste(Image.open(f'{T}/{z}_{x}_{y}.jpg').convert('RGB'), ((x - tx0) * 256, (y - ty0) * 256))
        except Exception: pass
    im.save(f'{O}/P{L}.jpg', quality=88); spec.append({'L': L, 'x0': tx0, 'y0': ty0, 'nx': nx, 'ny': ny}); print(L, nx, ny, flush=True)
json.dump(spec, open(f'{O}/specP.json', 'w'))
