# The building each pinned showroom sits in (nearest footprint, OpenStreetMap / Microsoft), exported as lat/lng polygons
# for the reel's close zooms on Al Qadisiyah and Al Shifa (globe.js), where the showrooms light up building by building.
import json, math, os, re
S = os.path.dirname(os.path.abspath(__file__))
w = json.load(open(os.path.join(S, 'sat', 'world.json')))
pins = json.loads(re.search(r'\[\[.*\]\]', open(os.path.join(S, 'dronepins.js')).read(), re.S).group(0))
LAT0, LNG0 = 24.7636, 46.6402; K = 111320 * math.cos(math.radians(LAT0))
def inside(px, pz, f):
    n = len(f) // 2; c = False
    for i in range(n):
        x0, z0, x1, z1 = f[2 * i], f[2 * i + 1], f[2 * ((i + 1) % n)], f[2 * ((i + 1) % n) + 1]
        if (z0 > pz) != (z1 > pz) and px < x0 + (pz - z0) * (x1 - x0) / (z1 - z0): c = not c
    return c
cand = [b for b in w['b'] if b[0] <= 30 and (math.hypot(b[2][0] - 17300, b[2][1] + 5600) < 4500 or math.hypot(b[2][0] - 4550, b[2][1] - 23980) < 2800)]
cent = [(sum(b[2][0::2]) / (len(b[2]) // 2), sum(b[2][1::2]) / (len(b[2]) // 2)) for b in cand]
out = {0: [], 1: []}; used = set()
for x, z, dist, inv in pins:
    best, bd = None, 1e9
    for i, (cx, cz) in enumerate(cent):
        d = math.hypot(cx - x, cz - z)
        if d < 120 and (inside(x, z, cand[i][2]) and d < bd + 1e6 or d < bd):
            if inside(x, z, cand[i][2]): best, bd = i, -1; break
            best, bd = i, d
    if best is None or (bd > 45) or best in used: continue
    used.add(best); f = cand[best][2]
    out[int(dist)].append([[round(LAT0 - f[2 * k + 1] / 111320, 6), round(LNG0 + f[2 * k] / K, 6)] for k in range(len(f) // 2)])
open(os.path.join(S, 'showfoot.js'), 'w').write('window.SHOWFOOT = ' + json.dumps({'q': out[0], 's': out[1]}) + ';\n')
print('Al Qadisiyah', len(out[0]), 'Al Shifa', len(out[1]))
