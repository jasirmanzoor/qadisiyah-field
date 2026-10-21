"""Director's cut: map v7 times to v9 by shared clip starts (cut clips collapse onto their neighbours)."""
import os, sys, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import remap7
V = remap7.V
T7 = {c["name"]: c["start"] for c in json.load(open(os.path.join(V, "timeline_v7.json")))["clips"]}
B = {c["name"]: c["start"] for c in json.load(open(os.path.join(V, "timeline.json")))["clips"]}
REN = {"act1v7": "act1v8"}
xs, ys = [], []
for n, s7 in T7.items():
    m = REN.get(n, n)
    if m in B: xs.append(s7); ys.append(B[m])
o = np.argsort(xs); XS, YS = np.array(xs)[o], np.array(ys)[o]
def R79(t): return float(np.interp(t, XS, YS))
def R(t): return R79(remap7.R(t))
