"""Where does the 385 m tower sit in the frame? yaw/pitch offsets of its base and top from the view centre, per second."""
import math
from flight import pose, TOWER, END
from terrain import ground_smooth
from flight import latlng
g0 = ground_smooth(*latlng(*TOWER))
print('t   dist  yaw_off  base_pitch  top_pitch   fits vertical FOV of: 35  50   (and horizontal 35)')
for t in range(0, 17):
    e, a, hd, pt = pose(t)
    dx, dz = TOWER[0]-e[0], TOWER[1]-e[2]; d = math.hypot(dx, dz)
    yaw = (math.degrees(math.atan2(dx, -dz)) - hd + 540) % 360 - 180
    base = math.degrees(math.atan2(0-e[1], d)) - pt; top = math.degrees(math.atan2(385-e[1], d)) - pt
    ok = lambda f: abs(yaw) < f*16/9/2*.8 and top < f/2 and base > -f/2
    print(f'{t:2d} {d:5.0f} {yaw:7.1f} {base:10.1f} {top:10.1f}      {"yes" if ok(35) else "NO "}  {"yes" if ok(50) else "NO "}   {"yes" if (abs(yaw)<17 and top<9.8 and base>-9.8) else "NO "}')
