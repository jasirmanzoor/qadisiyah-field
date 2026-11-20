"""Writes AutoLink-Drone.esp: the reel's drone flight as a Google Earth Studio project, one keyframe per frame
(camera position + pan/tilt), so Earth Studio renders exactly the path the reel's graphics are timed to.
Altitudes are metres above sea level = ground height (SRTM terrain tiles) + the flight's height above ground."""
import json, math, sys
from flight import pose, latlng, END
from terrain import ground_smooth
FPS, W, H = 30, 3840, 2160
MIN_AGL = 80
N = int(round(END * FPS)) + 1
LON, LAT, ALT, PAN, TILT = (-180, 180), (-89.9999, 89.9999), (1, 65117481), (0, 360), (0, 180)
rel = lambda v, r: (v - r[0]) / (r[1] - r[0])
raw = []
for f in range(N):
    t = f / FPS; e, a, hd, _ = pose(t)
    la, lo = latlng(e[0], e[2]); ta, to = latlng(a[0], a[2])
    raw.append(dict(t=t, la=la, lo=lo, agl=max(e[1], MIN_AGL), g=ground_smooth(la, lo), ta=ta, to=to, tagl=a[1], tg=ground_smooth(ta, to), dx=a[0]-e[0], dz=a[2]-e[2]))
def smooth(key, w=12):
    v = [r[key] for r in raw]; return [sum(v[max(0, i - w):i + w + 1]) / len(v[max(0, i - w):i + w + 1]) for i in range(N)]
g, tg = smooth('g'), smooth('tg')
frames = []
for i, r in enumerate(raw):
    alt = g[i] + r['agl']; talt = tg[i] + r['tagl']
    hd = (math.degrees(math.atan2(r['dx'], -r['dz'])) + 360) % 360
    tilt = 90 + math.degrees(math.atan2(talt - alt, math.hypot(r['dx'], r['dz'])))
    frames.append(dict(t=r['t'], lat=r['la'], lng=r['lo'], alt=alt, ground=g[i], pan=hd, tilt=tilt))
def kf(fn, rng): return [{'time': i / (N - 1), 'value': rel(fn(fr), rng)} for i, fr in enumerate(frames)]
attr = lambda typ, rng, fn: {'type': typ, 'value': {'maxValueRange': rng[1], 'minValueRange': rng[0], 'relative': kf(fn, rng)[0]['value']}, 'keyframes': kf(fn, rng), 'visible': True}
esp = {
  'modelVersion': 16,
  'settings': {'name': 'AutoLink Drone KAFD-Qadisiyah-Shifa', 'frameRate': FPS, 'dimensions': {'width': W, 'height': H}, 'duration': N - 1, 'timeFormat': 'timecode'},
  'scenes': [{
    'animationModel': {'roving': False, 'logarithmic': False, 'groupedPosition': True},
    'duration': N - 1,
    'attributes': [{'type': 'cameraGroup', 'attributes': [
        {'type': 'cameraPositionGroup', 'attributes': [{'type': 'position', 'visible': True, 'attributesLocked': True, 'attributes': [
            attr('longitude', LON, lambda f: f['lng']), attr('latitude', LAT, lambda f: f['lat']), attr('altitude', ALT, lambda f: f['alt'])]}]},
        {'type': 'cameraRotationGroup', 'attributes': [attr('rotationX', PAN, lambda f: f['pan']), attr('rotationY', TILT, lambda f: f['tilt'])]},
    ]}],
  }],
  'playbackManager': {'range': {'start': 0, 'end': N - 1}},
}
json.dump(esp, open('AutoLink-Drone.esp', 'w'), separators=(',', ':'))
json.dump(frames, open('drone_frames.json', 'w'))
print(N, 'frames')
for s in [0, 2.7, 5.4, 8, 11, 13, 15, 17, 20, 21.6, 23, 24.6, 26.2, 27.8, 29.6, 32, 33.4, 35]:
    f = frames[min(N - 1, int(round(s * FPS)))]
    print(f"{s:5.1f}s  {f['lat']:.5f}N {f['lng']:.5f}E  alt {f['alt']:6.0f} m (ground {f['ground']:.0f})  pan {f['pan']:5.1f}  tilt {f['tilt']:5.1f}")
