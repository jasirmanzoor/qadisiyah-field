import json, os, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
S = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(S)
sc = json.load(open(os.path.join(S, "script.json")))
k = Kokoro(os.path.join(R, "tts", "kokoro-v1.0.onnx"), os.path.join(R, "tts", "voices-v1.0.bin"))
SR = 24000; GAP = .75; PART_GAP = 2.0
lines, scenes, t = [], [], 0.0
for pi, part in enumerate(sc["parts"]):
    if pi: t += PART_GAP
    part_start = t
    for s in part["scenes"]:
        s0 = t; lt = t + s.get("lead", .6)
        for j, text in enumerate(s["lines"]):
            a, sr = k.create(text, voice=sc["voice"], speed=.92, lang="en-us")
            a = np.asarray(a, np.float32); nz = np.flatnonzero(np.abs(a) > 2e-3); a = a[max(0, nz[0] - 200): nz[-1] + 1800]
            d = len(a) / sr
            lines.append({"scene": s["id"], "t": round(lt, 3), "dur": round(d, 3), "text": text, "audio": a})
            lt += d + (GAP if j < len(s["lines"]) - 1 else 0)
        t = lt + s.get("tail", .7) + s.get("pad", 0)
        scenes.append({"id": s["id"], "part": part["id"], "start": round(s0, 3), "end": round(t, 3), "lines": [ {"t": l["t"], "dur": l["dur"], "text": l["text"]} for l in lines if l["scene"] == s["id"]]})
    print(part["id"], "from", round(part_start, 2), "to", round(t, 2), "=", round(t - part_start, 2), "s")
total = t + .3
track = np.zeros(int(total * SR) + SR, np.float32)
for l in lines:
    i = int(l["t"] * SR); track[i:i + len(l["audio"])] += l["audio"]
sf.write(os.path.join(S, "voice.wav"), track, SR)
json.dump({"total": round(total, 3), "scenes": scenes}, open(os.path.join(S, "timeline.json"), "w"), indent=1)
for s in scenes: print(s["id"], s["start"], s["end"], round(s["end"] - s["start"], 2))
print("total", round(total, 2))
