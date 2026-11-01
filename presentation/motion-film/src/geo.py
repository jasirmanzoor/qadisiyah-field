# showroom pins from the site data -> geo.js (per-district projection at one true scale, a walking route, district hulls)
import json, math, statistics as st
d = json.load(open('../../site/data.json'))['d']
kx = math.cos(math.radians(24.77))
def hull(ps):
    ps = sorted(set(ps)); cr = lambda o, a, b: (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]); lo = []; up = []
    for p in ps:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(ps):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]
boxes = {0: (640, 590), 1: (1390, 610)}; SC = min(760/(2.0731/111), 640/(1.5665/111))
out = {'pins': [], 'hull': [], 'route': []}
for dist in (0, 1):
    loc = [r for r in d if r[3] == dist and r[9]]
    X = [r[10]*kx for r in loc]; Y = [-r[9] for r in loc]
    mx, my = st.median(X), st.median(Y); rr = [math.hypot(x-mx, y-my) for x, y in zip(X, Y)]; lim = sorted(rr)[int(len(rr)*.97)]
    keep = [i for i in range(len(loc)) if rr[i] <= lim]
    x0, x1 = min(X[i] for i in keep), max(X[i] for i in keep); y0, y1 = min(Y[i] for i in keep), max(Y[i] for i in keep)
    cx, cy = boxes[dist]; P = []
    for i, r in enumerate(loc):
        x, y = X[i], Y[i]
        if rr[i] > lim: f = lim/rr[i]; x = mx+(x-mx)*f; y = my+(y-my)*f
        P.append([round(cx+(x-(x0+x1)/2)*SC, 1), round(cy+(y-(y0+y1)/2)*SC, 1), dist, int(r[5] or 0)])
    base = len(out['pins']); out['pins'] += P
    h = hull([(p[0], p[1]) for p in P]); hc = (sum(a for a, b in h)/len(h), sum(b for a, b in h)/len(h))
    out['hull'].append([[round(a+(a-hc[0])/max(1, math.hypot(a-hc[0], b-hc[1]))*30, 1), round(b+(b-hc[1])/max(1, math.hypot(a-hc[0], b-hc[1]))*30, 1)] for a, b in h])
    # nearest-neighbour walk from the westmost pin
    left = set(range(len(P))); cur = min(left, key=lambda i: P[i][0]); route = [cur]; left.remove(cur)
    while left:
        cur = min(left, key=lambda i: (P[i][0]-P[cur][0])**2+(P[i][1]-P[cur][1])**2); route.append(cur); left.remove(cur)
    out['route'].append([base+i for i in route])
open('geo.js', 'w').write('window.GEO=' + json.dumps(out) + ';')
print(len(out['pins']), [len(r) for r in out['route']])
