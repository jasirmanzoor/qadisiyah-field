"""Act I for v7: the Slide Image opening (field photos only), Act I's founder-vision scene, then the
founder's line with his portrait, then the rest of Act I. Writes vid/act1v6 and vid/act1v7_map.json."""
import os, shutil, json
from PIL import Image
V = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vid")
SW, A, F, O = f"{V}/survey", f"{V}/act1v7src", f"{V}/founder", f"{V}/act1v7"
os.makedirs(O, exist_ok=True); n = lambda d: len([f for f in os.listdir(d) if f.endswith(".jpg")])
out = 0
def put(p):
    global out; shutil.copy(p, f"{O}/f{out:05d}.jpg"); out += 1
def blend(pa, pb, k, N):
    global out; u = (k + 1) / (N + 1); u = u * u * (3 - 2 * u)
    Image.blend(Image.open(pa), Image.open(pb), u).save(f"{O}/f{out:05d}.jpg", quality=93); out += 1
fa, ff = lambda i: f"{A}/f{i:05d}.jpg", lambda i: f"{F}/f{i:05d}.jpg"
for i in range(268): put(f"{SW}/f{i:05d}.jpg")
for k in range(10): blend(f"{SW}/f{268+k:05d}.jpg", fa(186 + k), k, 10)          # light bloom into the founder-vision scene
for i in range(196, 317): put(fa(i))                                            # vision scene up to the next wipe (13.2 s)
for k in range(12): blend(fa(317 + k), ff(k), k, 12)                            # into the founder's line
NF = n(F)
for i in range(12, NF - 12): put(ff(i))
for k in range(12): blend(ff(NF - 12 + k), fa(334 + k), k, 12)                  # out to "A small team", already settled
start_rest = out
for i in range(346, n(A)): put(fa(i))
FS = (start_rest - 346) - 82                                                    # extra shift after the founder scene vs v5
json.dump({"frames": out, "founder_at": (329 - 186 + 278) / 24, "shift_after": FS / 24}, open(f"{V}/act1v7_map.json", "w"))
print(out, out / 24, "founder at", (329 - 186 + 278) / 24, "shift", FS / 24)
