"""v7 = v6 with the Slide Image opening (same length), and the Rolls-Royce, 98%, 11-of-13 and KAFD excerpts replaced by
new scenes. R67 maps a v6 time to v7 by clip starts; R maps a v3 time to v7; B holds the v7 clip starts."""
import os, sys, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import remap6
V = remap6.V
T6 = {c["name"]: c["start"] for c in json.load(open(os.path.join(V, "timeline_v6.json")))["clips"]}
B = {c["name"]: c["start"] for c in json.load(open(os.path.join(V, os.environ.get("REMAP_B7", "timeline.json"))))["clips"]}
REN = {"act1v6": os.environ.get("ACT1", "act1v7"), "b_seg_13": "premium", "b_seg_14": "indep", "b_seg_15": "bank", "kafd6": "kafd7"}
xs, ys = [], []
for n, s6 in T6.items():
    m = REN.get(n, n)
    if m in B: xs.append(s6); ys.append(B[m])
o = np.argsort(xs); XS, YS = np.array(xs)[o], np.array(ys)[o]
def R67(t): return float(np.interp(t, XS, YS))
def R(t): return R67(remap6.R(t))
