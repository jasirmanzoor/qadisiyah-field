"""Map a time in the v3 cut to the same moment in the v4 cut (clip starts are the anchors)."""
import os, json, numpy as np
V = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vid")
A = {c["name"]: c["start"] for c in json.load(open(os.path.join(V, "timeline_v3.json")))["clips"]}
B = {c["name"]: c["start"] for c in json.load(open(os.path.join(V, "timeline.json")))["clips"]}
REN = {"seg_09": "seg_09h2", "seg_03": "zoom1", "card_out": "card_out2"}
xs, ys = [], []
for n, t in A.items():
    m = REN.get(n, n)
    if m in B: xs.append(t); ys.append(B[m])
xs += [A["seg_09"] + 1.07, A["card_out"] - .02, A["card_out"] + 5.4]; ys += [B["seg_09h2"] + 5.6, B["kafd2"] - .02, B["card_out2"] + 5.4]
o = np.argsort(xs); XS, YS = np.array(xs)[o], np.array(ys)[o]
def R(t): return float(np.interp(t, XS, YS))
