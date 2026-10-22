"""v14 narration: the flight returns after "counted by hand". The finished v13 voice track is opened at the insertion point
by the flight's length (30.35 s), so every later line keeps its place on the picture, and four new lines ride the flight."""
import os, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); V = os.path.join(S, "vid")
SRC, OUT = os.path.join(V, "vo13_af_heart"), os.path.join(V, "vo14_af_heart"); os.makedirs(OUT, exist_ok=True)
P, D = 124.617, 30.35                                   # old start of the market-size excerpt; the flight's net length
TL = json.load(open(os.path.join(V, "timeline.json"))); B = {c["name"]: c["start"] for c in TL["clips"]}
NEW = [("flyA", 1.2, 7.2, "Then we took to the air. From our headquarters, east to Al Qaadiseeya."),
       ("flyA", 9.4, 5.6, "More than twenty thousand cars, on three hundred and nine floors."),
       ("flyB", .7, 5.6, "Each floor rises by the cars on it. The market, as data."),
       ("flyC", 1.0, 6.8, "Then south, to Al Shiffa, and two hundred and eleven floors more.")]
plan = json.load(open(os.path.join(SRC, "plan.json"))); track, SR = sf.read(os.path.join(SRC, "voice.wav"), dtype="float32")
i = int(P * SR); track = np.concatenate([track[:i], np.zeros(int(round(D * SR)), np.float32), track[i:]])
for p in plan:
    if p["t"] >= P: p["t"] = round(p["t"] + D, 2)
k = Kokoro(os.path.join(S, "tts", "kokoro-v1.0.onnx"), os.path.join(S, "tts", "voices-v1.0.bin"))
for clip, off, room, text in NEW:
    t0 = B[clip] + off; speed = 1.0
    while True:                                                               # same fitting rule as narrate9
        a, sr = k.create(text, voice="af_heart", speed=speed, lang="en-us"); dur = len(a) / sr
        if dur <= room or speed >= 1.12: break
        speed = min(1.12, speed * min(1.06, dur / room))
    a = np.asarray(a, dtype=np.float32); nz = np.flatnonzero(np.abs(a) > 1e-3); a = a[max(0, nz[0] - 240): nz[-1] + 2400]
    s = int(t0 * SR); track[s: s + len(a)] += a[: len(track) - s]
    p = dict(t=round(t0, 2), room=room, text=text, dur=round(len(a) / SR, 2), speed=round(speed, 3), fits=len(a) / SR <= room + .05)
    plan.append(p); print(("OK " if p["fits"] else "OVER"), p)
plan.sort(key=lambda p: p["t"])
sf.write(os.path.join(OUT, "voice.wav"), track, SR); json.dump(plan, open(os.path.join(OUT, "plan.json"), "w"), indent=1)
print("voice", len(track) / SR, "s; timeline", TL["total"])
