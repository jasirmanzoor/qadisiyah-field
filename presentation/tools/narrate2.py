"""v2 narration: Act I and Act III lines come from the field deck; data lines keep their wording and are moved
to wherever their excerpt now sits in the cut (old offset within the excerpt is preserved)."""
import os, sys, json, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); V = os.path.join(S, "vid")
TL = json.load(open(os.path.join(V, "timeline.json"))); at = {c["name"]: c["start"] for c in TL["clips"]}; TOTAL = TL["total"]
ACT1 = [(0.8, "Before launch, a handful of people were building the company. Just two of them were in retail."),
        (7.6, "Their mandate: understand Riyadh's sub-dealer market, showroom by showroom."),
        (14.9, "Visit. Observe. Ask. Document. Repeat."),
        (18.4, "The market could only be understood by being in it."),
        (21.2, "Every showroom was different. Every door added something new."),
        (27.7, "Prices on windscreens. A Rolls-Royce Spectre: one point five five million riyals. Ground truth, off the floor."),
        (34.8, "Sunlit visits. Dealerships after dark. Not a staged campaign."),
        (41.0, "Then, back in the room, field notes became insight, and insight shaped the business model."),
        (47.5, "This is what they found.")]
ACT3 = [(0.7, "Behind every figure were real people, who kept showing up."),
        (9.7, "The earliest contribution is not always the most visible. Sometimes, it is the one everything else stands on.")]
# old cut: excerpt starts, and the lines as they were placed
OLD = {"seg_01": 4.05, "seg_02": 11.5, "seg_03": 17.95, "seg_04": 24.608, "seg_05": 30.642, "seg_06": 35.675, "seg_07": 45.125, "seg_08": 58.575, "seg_09": 65.025, "seg_10": 68.892,
       "seg_11": 74.342, "seg_12": 80.0, "seg_13": 85.033, "seg_14": 90.067, "seg_15": 95.1, "seg_16": 100.133, "seg_17": 106.583, "seg_18": 111.242, "seg_19": 118.275, "seg_20": 127.725, "seg_21": 135.758}
src = open(os.path.join(S, "tools", "narrate.py")).read()
OLDL = [(float(a), b) for a, b in re.findall(r'\(\s*([\d.]+),\s*"([^"]+)"\)', src)]
LINES = [(at["act1"] + t, x) for t, x in ACT1]
for t, x in OLDL:
    seg = max((k for k, v in OLD.items() if v <= t + .3), key=lambda k: OLD[k], default=None)
    if seg in at: LINES.append((at[seg] + (t - OLD[seg]), x))
LINES += [(at["act3"] + t, x) for t, x in ACT3]
LINES.append((at["card_out"] + .6, "The Riyadh Sub-Dealer Portfolio."))
LINES = sorted({round(t, 2): (t, x) for t, x in LINES}.values())
LINES = [l for l in LINES if l[1] != "The Riyadh Sub-Dealer Portfolio." or l[0] >= at["card_out"]]
VOICE = sys.argv[1] if len(sys.argv) > 1 else "af_heart"
OUT = os.path.join(V, "vo2_" + VOICE); os.makedirs(OUT, exist_ok=True)
k = Kokoro(os.path.join(S, "tts", "kokoro-v1.0.onnx"), os.path.join(S, "tts", "voices-v1.0.bin")); SR = 24000
track = np.zeros(int(TOTAL * SR) + SR, dtype=np.float32); plan = []
for i, (t0, text) in enumerate(LINES):
    nxt = LINES[i + 1][0] if i + 1 < len(LINES) else TOTAL - .4; room = nxt - t0 - .25; speed = 1.0
    while True:
        audio, sr = k.create(text, voice=VOICE, speed=speed, lang="en-us"); dur = len(audio) / sr
        if dur <= room or speed >= 1.12: break
        speed = min(1.12, speed * min(1.06, dur / room))
    a = np.asarray(audio, dtype=np.float32); nz = np.flatnonzero(np.abs(a) > 1e-3)
    if len(nz): a = a[max(0, nz[0] - 240): nz[-1] + 2400]
    s = int(t0 * SR); track[s:s + len(a)] += a[: len(track) - s]
    plan.append({"t": round(t0, 2), "dur": round(len(a) / SR, 2), "room": round(room, 2), "speed": round(speed, 3), "fits": len(a) / SR <= room + .05, "text": text})
sf.write(os.path.join(OUT, "voice.wav"), track, SR); json.dump(plan, open(os.path.join(OUT, "plan.json"), "w"), indent=1)
for p in plan: print(("OK " if p["fits"] else "OVER") + f" {p['t']:6.1f}s {p['dur']:5.2f}/{p['room']:5.2f} x{p['speed']}  {p['text'][:72]}")
