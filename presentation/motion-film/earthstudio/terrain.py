"""Ground height (m above sea level) from the public AWS Terrain Tiles (terrarium, SRTM-based), zoom 12, cached."""
import math, os, io, urllib.request
from PIL import Image
Z = 12; CACHE = os.environ.get('DEM_CACHE', '/tmp/dem'); os.makedirs(CACHE, exist_ok=True); _t = {}
def _tile(x, y):
    k = (x, y)
    if k not in _t:
        p = f'{CACHE}/{Z}_{x}_{y}.png'
        if not os.path.exists(p):
            d = urllib.request.urlopen(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png', timeout=30).read()
            open(p, 'wb').write(d)
        _t[k] = Image.open(p).convert('RGB').load()
    return _t[k]
def _px(X, Y):
    x, y = int(X // 256), int(Y // 256); r, g, b = _tile(x, y)[int(X % 256), int(Y % 256)]; return r * 256 + g + b / 256 - 32768
def ground(lat, lng):
    n = 2 ** Z; X = (lng + 180) / 360 * n * 256 - .5; Y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n * 256 - .5
    x0, y0 = math.floor(X), math.floor(Y); fx, fy = X - x0, Y - y0
    return (_px(x0, y0) * (1 - fx) * (1 - fy) + _px(x0 + 1, y0) * fx * (1 - fy) + _px(x0, y0 + 1) * (1 - fx) * fy + _px(x0 + 1, y0 + 1) * fx * fy)
def ground_smooth(lat, lng, r=250):
    """mean over a small disc, so the camera height follows the land, not every bump in the elevation model"""
    s, k = 0, 0
    for dx in (-r, 0, r):
        for dz in (-r, 0, r):
            s += ground(lat + dz / 111320, lng + dx / (111320 * math.cos(math.radians(lat)))); k += 1
    return s / k
