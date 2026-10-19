"""Narration: every line states only figures shown on screen in the deck. Each line is voiced with Kokoro (local, open
model), then placed at its shot; if a line would run into the next one it is gently sped up (never past 1.12x)."""
import os, sys, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = sys.argv[1] if len(sys.argv) > 1 else "af_heart"
OUT = os.path.join(S, "vid", "vo_" + VOICE); os.makedirs(OUT, exist_ok=True)
k = Kokoro(os.path.join(S, "tts", "kokoro-v1.0.onnx"), os.path.join(S, "tts", "voices-v1.0.bin"))
SR = 24000
# (start in the cut, s; text). Place names respelled so the model says them the way Riyadh does.
LINES = [
    (0.6,   "Riyadh's independent car market had never been counted."),
    (4.6,   "So our field team walked it. Door to door."),
    (12.2,  "Five hundred and twenty showrooms. Nearly thirty-two thousand cars. Every number, sourced."),
    (18.6,  "It starts at our headquarters, in the King Abdullah Financial District."),
    (25.1,  "Two districts. Al Qaadiseeya to the east. Al Shiffa to the south."),
    (31.1,  "Every car, on every floor, counted by hand."),
    (36.6,  "From the air, the scale becomes clear."),
    (46.2,  "The top of the market sits right next door to the middle."),
    (51.4,  "Each column is one showroom, raised by the cars on its floor."),
    (59.2,  "In Al Shiffa, two hundred and eleven showrooms. Most sell used cars only."),
    (66.2,  "Al Qaadiseeya alone: sixteen to twenty-nine billion riyals a year."),
    (70.2,  "Yet twenty-nine in every hundred ready buyers walk away. For want of a loan."),
    (75.0,  "One city. Two very different markets."),
    (80.6,  "Every tower is a showroom, lit by its average price."),
    (85.6,  "A Rolls-Royce, fifteen metres from a seventy-five-thousand-riyal floor."),
    (90.6,  "Ninety-eight percent of Al Qaadiseeya's floors are fully independent."),
    (95.6,  "And eleven of the thirteen we sat down with have no bank on site."),
    (100.8, "Fifty-four brands, across both districts."),
    (107.0, "Including legends, like the Porsche nine eleven."),
    (111.9, "Every figure came from a door we stood in front of."),
    (118.8, "One more thing."),
    (123.6, "One point four billion riyals a year of ready buyers walk out. Because the financing was not there."),
    (129.7, "The buyer is standing on the floor. The lender is not."),
    (136.4, "From the showroom floor, back to our headquarters."),
    (141.6, "The Riyadh Sub-Dealer Portfolio."),
]
TOTAL = 146.4
track = np.zeros(int(TOTAL * SR) + SR, dtype=np.float32); plan = []
for i, (t0, text) in enumerate(LINES):
    nxt = LINES[i + 1][0] if i + 1 < len(LINES) else TOTAL - .4
    room = nxt - t0 - .25
    speed = 1.0
    while True:
        audio, sr = k.create(text, voice=VOICE, speed=speed, lang="en-us")
        dur = len(audio) / sr
        if dur <= room or speed >= 1.12: break
        speed = min(1.12, speed * min(1.06, dur / room))
    a = np.asarray(audio, dtype=np.float32)
    nz = np.flatnonzero(np.abs(a) > 1e-3)                      # trim the model's leading/trailing silence
    if len(nz): a = a[max(0, nz[0] - 240): nz[-1] + 2400]
    s = int(t0 * SR); track[s:s + len(a)] += a[: len(track) - s]
    plan.append({"t": t0, "dur": round(len(a) / SR, 2), "room": round(room, 2), "speed": round(speed, 3), "fits": len(a) / SR <= room + .05, "text": text})
sf.write(os.path.join(OUT, "voice.wav"), track, SR)
json.dump(plan, open(os.path.join(OUT, "plan.json"), "w"), indent=1)
for p in plan: print(("OK " if p["fits"] else "OVER") + f" {p['t']:6.1f}s {p['dur']:5.2f}/{p['room']:5.2f} x{p['speed']}  {p['text'][:70]}")
