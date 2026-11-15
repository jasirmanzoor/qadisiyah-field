# High-resolution ground for the reel's drone flight: Esri World Imagery at zoom 19 (~0.26 m/px) over KAFD and the
# two low-pass zones, resampled into the drone's local metre frame (x east, z south from KAFD) as 3x3 texture chunks.
import os, math, json, urllib.request, concurrent.futures as cf
from PIL import Image
S = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(S, 'img', 'zoom', 'hisat'); T = os.path.join(S, 'img', 'zoom', 'tiles')
LAT0, LNG0 = 24.7636, 46.6402; K = 111320 * math.cos(math.radians(LAT0)); Z = 19
ZONES = {'kafd': (0, 0, 1600), 'qad': (17850, -6550, 1200), 'shifa': (4250, 23750, 1200)}   # centre x, z, size (m)
def ll(x, z): return LAT0 - z / 111320, LNG0 + x / K
def world(lat, lng): n = 256 * 2 ** Z; return ((lng + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
def get(x, y):
    p = f'{T}/{Z}_{x}_{y}.jpg'
    if os.path.exists(p) and os.path.getsize(p) > 0: return
    url = f'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z}/{y}/{x}'
    for k in range(5):
        try: open(p, 'wb').write(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'autolink-film/1.0'}), timeout=40).read()); return
        except Exception as e: err = e
    print('FAIL', x, y, err)
chunks = []
for name, (cx, cz, size) in ZONES.items():
    x0, x1, z0, z1 = cx - size / 2, cx + size / 2, cz - size / 2, cz + size / 2
    (la0, lo0), (la1, lo1) = ll(x0, z0), ll(x1, z1)        # north-west, south-east
    px0, py0 = world(la0, lo0); px1, py1 = world(la1, lo1)
    tx0, ty0, tx1, ty1 = int(px0 // 256), int(py0 // 256), int(px1 // 256), int(py1 // 256)
    jobs = [(x, y) for y in range(ty0, ty1 + 1) for x in range(tx0, tx1 + 1)]
    with cf.ThreadPoolExecutor(16) as ex: list(ex.map(lambda j: get(*j), jobs))
    im = Image.new('RGB', ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    for (x, y) in jobs:
        try: im.paste(Image.open(f'{T}/{Z}_{x}_{y}.jpg').convert('RGB'), ((x - tx0) * 256, (y - ty0) * 256))
        except Exception: pass
    im = im.crop((int(px0 - tx0 * 256), int(py0 - ty0 * 256), int(px1 - tx0 * 256), int(py1 - ty0 * 256))).resize((4608, 4608), Image.LANCZOS)
    s = size / 3
    for i in range(3):
        for j in range(3):
            f = f'{name}-{i}{j}'; im.crop((i * 1536, j * 1536, (i + 1) * 1536, (j + 1) * 1536)).save(f'{O}/{f}.jpg', quality=90)
            e = ('l' if i == 0 else '') + ('t' if j == 0 else '') + ('r' if i == 2 else '') + ('b' if j == 2 else '')
            chunks.append({'f': f, 'x0': x0 + i * s, 'z0': z0 + j * s, 'x1': x0 + (i + 1) * s, 'z1': z0 + (j + 1) * s, 'L': 3, 'e': e})
    print(name, len(jobs), 'tiles', flush=True)
json.dump(chunks, open(f'{O}/hisat.json', 'w'))
