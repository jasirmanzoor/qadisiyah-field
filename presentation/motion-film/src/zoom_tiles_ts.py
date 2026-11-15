# Mosaics for the reel's second half of the zoom: the transit from Al Qadisiyah to Al Shifa (T, levels 12-14)
# and the close-up on Al Shifa (S, levels 14-15). Same Esri World Imagery tiles as zoom_tiles.py.
import os, math, json, urllib.request, concurrent.futures as cf
from PIL import Image
S = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(S, 'img', 'zoom'); T = os.path.join(O, 'tiles')
Q, SH = (24.8257, 46.8225), (24.5480, 46.6850)
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
def mosaic(name, L, pts, mx, my):
    ws = [world(*p, L) for p in pts]
    x0p, x1p = min(w[0] for w in ws) - mx, max(w[0] for w in ws) + mx; y0p, y1p = min(w[1] for w in ws) - my, max(w[1] for w in ws) + my
    tx0, ty0, tx1, ty1 = int(x0p // 256), int(y0p // 256), int(x1p // 256), int(y1p // 256)
    jobs = [(L, x, y) for y in range(ty0, ty1 + 1) for x in range(tx0, tx1 + 1)]
    with cf.ThreadPoolExecutor(12) as ex: list(ex.map(lambda j: get(*j), jobs))
    nx, ny = tx1 - tx0 + 1, ty1 - ty0 + 1
    im = Image.new('RGB', (nx * 256, ny * 256), (30, 26, 22))
    for (z, x, y) in jobs:
        try: im.paste(Image.open(f'{T}/{z}_{x}_{y}.jpg').convert('RGB'), ((x - tx0) * 256, (y - ty0) * 256))
        except Exception: pass
    im.save(f'{O}/{name}{L}.jpg', quality=88); print(name, L, nx, ny, flush=True)
    return {'L': L, 'x0': tx0, 'y0': ty0, 'nx': nx, 'ny': ny}
spec = {'T': [mosaic('T', L, [Q, SH], 1480, 840) for L in (12, 13, 14)], 'S': [mosaic('S', L, [SH], 1480, 840) for L in (14, 15)]}
json.dump(spec, open(f'{O}/specTS.json', 'w'))
