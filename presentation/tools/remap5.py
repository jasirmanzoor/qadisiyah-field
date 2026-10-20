"""v5 = v4 with the SwellCast opening: Act I's first scene (0-6.9 s) now runs 0-10.3 s and everything after moves 3.417 s later.
R maps a v3 time to v5 (via v4); R45 maps v4 to v5."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import remap as r4
SH = (268 - 186) / 24
def R45(t): return t * (6.9 + SH) / 6.9 if t < 6.9 else t + SH
def R(t): return R45(r4.R(t))
V = r4.V
B = {c["name"]: c["start"] for c in json.load(open(os.path.join(V, "timeline.json")))["clips"]}
