"""v6 narration: the v5 lines moved into the v6 cut, plus the founder's line and the pinned map."""
import os, sys, json, numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from remap6 import R56, B
from kokoro_onnx import Kokoro
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); V = os.path.join(S, "vid")
TOTAL = json.load(open(os.path.join(V, "timeline.json")))["total"]
PLAN = json.load(open(os.path.join(V, "plan_v5.json")))
LINES = [(R56(p["t"]), p["text"]) for p in PLAN]
FO, PI = json.load(open(os.path.join(V, "act1v6_map.json")))["founder_at"], B["pins"]
LINES += [(FO + 2.0, "There was no map. So we built one. One showroom at a time."),
          (PI + .6, "Every showroom we walked, day and night, we pinned at its exact coordinates."),
          (PI + 6.6, "Four hundred and seventy-four pins. One map, now live on Google Earth.")]
LINES.sort()
VOICE = sys.argv[1] if len(sys.argv) > 1 else "af_heart"
OUT = os.path.join(V, "vo6_" + VOICE); os.makedirs(OUT, exist_ok=True)
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
