"""The reel's drone flight (src/droner.js FLYR) as camera poses in real coordinates, for Google Earth Studio."""
import math
OLD = [
  [0, [-1150, 70, 600], [100, 160, 0]],
  [2.7, [-950, 150, -600], [100, 180, 0]],
  [5.4, [150, 240, -1150], [60, 170, 0]],
  [8, [1250, 480, -900], [5200, 150, -2700]],
  [11, [11000, 1500, -5200], [18200, 0, -6700]],
  [13, [16900, 1100, -5900], [18300, 0, -6800]],
  [15, [18050, 900, -6350], [18200, 0, -6900]],
  [17, [17600, 140, -6300], [17755, 0, -6470]],
  [20, [17930, 72, -6660], [18085, 0, -6830]],
  [21.6, [18350, 420, -6250], [18100, 0, -6800]],
  [23, [18550, 820, -5650], [18100, 0, -6800]],
  [24.6, [12000, 5200, 8500], [4500, 0, 24000]],
  [26.2, [6600, 1500, 21300], [4500, 0, 24000]],
  [27.8, [4700, 1100, 23350], [4500, 0, 23950]],
  [29.6, [4000, 140, 23500], [4165, 0, 23665]],
  [32, [4260, 72, 23760], [4425, 0, 23925]],
  [33.4, [4800, 420, 24400], [4450, 0, 23950]],
  [35, [5050, 850, 24950], [4450, 0, 23950]],
]

import math as _m
TOWER = (133.0, -12.0)      # the 385 m KAFD tower, local metres (x east, z south), from the building data
TH = 160                    # aim height on the tower (m above ground): mid-tower, so base and top both stay in frame
KAFD_END = 15               # seconds of KAFD (was 8)
SHIFT = KAFD_END - 8        # everything after KAFD moves later by this much
def sm(a, b, t): u = max(0, min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u)
def orbit(t):
    # bearing from the tower to the camera (0 = north, clockwise): west of it -> north of it (98 degrees), where the
    # circular motion already points east, the way to Al Qadisiyah. Radius and height above ground ease with time.
    b = 262 + 98 * sm(0, 11, t)
    R = [(0, 1550), (3, 1050), (7, 900), (11, 1000)]
    A = [(0, 90), (3, 200), (7, 260), (11, 330)]
    def lerpk(K):
        for i in range(len(K) - 1):
            if t <= K[i + 1][0]:
                u = sm(K[i][0], K[i + 1][0], t); return K[i][1] + (K[i + 1][1] - K[i][1]) * u
        return K[-1][1]
    r, h = lerpk(R), lerpk(A)
    return [TOWER[0] + r * _m.sin(_m.radians(b)), h, TOWER[1] - r * _m.cos(_m.radians(b))]
EXIT = {12: [520, 370, -1010], 13: [860, 420, -990], 14: [1100, 470, -940]}   # leaves along the north side, heading east
FLYR = []
old_tgt = OLD[3][2]                        # where the old flight is looking once it leaves KAFD
for t in range(0, 15):                     # one key a second through the orbit and exit
    k = sm(10, 15, t)
    tgt = [TOWER[0] + (old_tgt[0] - TOWER[0]) * k, TH + (old_tgt[1] - TH) * k, TOWER[1] + (old_tgt[2] - TOWER[1]) * k]
    FLYR.append([t, EXIT.get(t) or orbit(t), tgt])
for k in OLD[3:]:                          # the rest of the flight, unchanged, later by SHIFT
    FLYR.append([k[0] + SHIFT, k[1], k[2]])
END = FLYR[-1][0]
LAT0, LNG0 = 24.7636, 46.6402
def clamp(v, a=0, b=1): return max(a, min(b, v))
def fly(k, t):
    K, n = FLYR, len(FLYR); t = clamp(t, 0, END); i = 0
    while i < n - 2 and t > K[i + 1][0]: i += 1
    seg = lambda j, d: (K[j + 1][k][d] - K[j][k][d]) / (K[j + 1][0] - K[j][0])
    def vel(j):
        out = []
        for d in range(3):
            if j == 0: out.append(seg(0, d) * .35); continue
            if j == n - 1: out.append(seg(n - 2, d) * .35); continue
            a, b = seg(j - 1, d), seg(j, d); out.append(0 if a * b <= 0 else 2 / (1 / a + 1 / b))
        return out
    a, b = K[i], K[i + 1]; h = b[0] - a[0]; u = clamp((t - a[0]) / h); va, vb = vel(i), vel(i + 1)
    h00 = 2*u**3 - 3*u*u + 1; h10 = u**3 - 2*u*u + u; h01 = -2*u**3 + 3*u*u; h11 = u**3 - u*u
    return [h00*a[k][d] + h10*h*va[d] + h01*b[k][d] + h11*h*vb[d] for d in range(3)]
def latlng(x, z): return LAT0 - z / 111320, LNG0 + x / (111320 * math.cos(math.radians(LAT0)))
def pose(t):
    e, a = fly(1, t), fly(2, t); e[1] = max(e[1], 55)
    dx, dy, dz = a[0] - e[0], a[1] - e[1], a[2] - e[2]
    hd = (math.degrees(math.atan2(dx, -dz)) + 360) % 360
    pitch = math.degrees(math.atan2(dy, math.hypot(dx, dz)))
    return e, a, hd, pitch
if __name__ == '__main__':
    for i in range(0, 36):
        e, a, hd, p = pose(i); print(i, [round(v) for v in e], round(hd, 1), round(p, 1))
