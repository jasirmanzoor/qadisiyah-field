"""v4 narration: v3 lines move with their excerpts; the globe-to-block zoom, the market-size hold and the KAFD close get
their own lines."""
import os, sys, json, numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from remap import R, B
from kokoro_onnx import Kokoro
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); V = os.path.join(S, "vid")
TOTAL = json.load(open(os.path.join(V, "timeline.json")))["total"]
OLD = json.load(open(os.path.join(V, "vo3_af_heart", "plan.json")))
DROP = {"It starts at our headquarters, in the King Abdullah Financial District.", "Two districts. Al Qaadiseeya to the east. Al Shiffa to the south.",
        "The Riyadh Sub-Dealer Portfolio."}
LINES = [(R(p["t"]), p["text"]) for p in OLD if p["text"] not in DROP]
Z, M, K, C = B["zoom1"], B["seg_09h2"], B["kafd2"], B["card_out2"]
LINES += [(Z + 1.4, "It starts in the Kingdom of Saudi Arabia."),
          (Z + 8.2, "In Riyadh, its capital."),
          (Z + 13.6, "Al Qaadiseeya, in the east. Three hundred and nine showrooms."),
          (Z + 18.6, "Thirty-four kilometres south, Al Shiffa."),
          (M + .7, "For every ten cars sold, four more ready buyers walk away when financing falls through."),
          (K + .7, "From the showroom floor, to our headquarters in the King Abdullah Financial District."),
          (C + .9, "AutoLink. The Riyadh Sub-Dealer Portfolio.")]
LINES.sort()
VOICE = sys.argv[1] if len(sys.argv) > 1 else "af_heart"
OUT = os.path.join(V, "vo4_" + VOICE); os.makedirs(OUT, exist_ok=True)
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
