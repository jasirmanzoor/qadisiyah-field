"""v13 narration: the founder is no longer named, and his line looks past the map. Only the two founder lines are
replaced in the finished v11 voice track; every other line is left sample-for-sample as rendered."""
import os, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); V = os.path.join(S, "vid")
SRC, OUT = os.path.join(V, "vo11_af_heart"), os.path.join(V, "vo13_af_heart"); os.makedirs(OUT, exist_ok=True)
SWAP = [("Our founder and CEO,", "Our founder and CEO set a bigger goal than a map: the network that connects dealers, buyers and lenders."),
        ("There was no map.", "We are not here to map a market. We are here to move it.")]
plan = json.load(open(os.path.join(SRC, "plan.json"))); track, SR = sf.read(os.path.join(SRC, "voice.wav"), dtype="float32")
k = Kokoro(os.path.join(S, "tts", "kokoro-v1.0.onnx"), os.path.join(S, "tts", "voices-v1.0.bin"))
for OLD, NEW in SWAP:
    p = next(x for x in plan if x["text"].startswith(OLD))
    s = int(p["t"] * SR); track[s: s + int((p["dur"] + .02) * SR)] = 0       # lift the old line out
    speed = 1.0
    while True:                                                               # same fitting rule as narrate9
        a, sr = k.create(NEW, voice="af_heart", speed=speed, lang="en-us"); dur = len(a) / sr
        if dur <= p["room"] or speed >= 1.12: break
        speed = min(1.12, speed * min(1.06, dur / p["room"]))
    a = np.asarray(a, dtype=np.float32); nz = np.flatnonzero(np.abs(a) > 1e-3); a = a[max(0, nz[0] - 240): nz[-1] + 2400]
    track[s: s + len(a)] += a[: len(track) - s]
    p.update(text=NEW, dur=round(len(a) / SR, 2), speed=round(speed, 3), fits=len(a) / SR <= p["room"] + .05)
    print(("OK " if p["fits"] else "OVER"), p)
sf.write(os.path.join(OUT, "voice.wav"), track, SR); json.dump(plan, open(os.path.join(OUT, "plan.json"), "w"), indent=1)
