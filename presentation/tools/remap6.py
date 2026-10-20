"""v6 = v5 + the founder's line inside Act I, a pinned-map scene after the zoom, a new KAFD finale.
R56 maps a v5 time to v6; R maps a v3 time to v6 (via v4 and v5); B holds the v6 clip starts."""
import os, sys, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import remap5
V = remap5.V
T5 = {c["name"]: (c["start"], c["dur"]) for c in json.load(open(os.path.join(V, "timeline_v5.json")))["clips"]}
T6 = {c["name"]: (c["start"], c["dur"]) for c in json.load(open(os.path.join(V, os.environ.get("REMAP_V6", "timeline.json"))))["clips"]}
B = {k: v[0] for k, v in T6.items()}
M = json.load(open(os.path.join(V, "act1v6_map.json")))
SH = (268 - 186) / 24
REN = {"act3v3": "act3v6", "kafd2": "kafd6", **{f"seg_{k}": f"b_seg_{k}" for k in ("02", "05", "06", "07", "08", "09h2", "10", "11", "13", "14", "15", "19", "20")}}
xs, ys = [0, 316 / 24 + SH, 346 / 24 + SH], [0, 316 / 24 + SH, 346 / 24 + SH + M["shift_after"]]   # inside Act I
for n, (s5, d5) in T5.items():
    m = REN.get(n, n)
    if m in T6 and n != "act1v5": xs.append(s5); ys.append(T6[m][0])
xs.append(T5["zoom1"][0] + 24.0); ys.append(T6["zoom1"][0] + 24.0)   # the zoom keeps its own timing; the pinned map opens after it
o = np.argsort(xs); XS, YS = np.array(xs)[o], np.array(ys)[o]
def R56(t): return float(np.interp(t, XS, YS))
def R(t): return R56(remap5.R(t))
