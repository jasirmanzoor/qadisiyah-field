"""Director's cut narration: every line placed by its clip's start in the v9 cut."""
import os, sys, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); V = os.path.join(S, "vid")
TL = json.load(open(os.path.join(V, "timeline.json"))); B = {c["name"]: c["start"] for c in TL["clips"]}; TOTAL = TL["total"]
CUE = [("act1v8", 3.3, "Before launch, two people set out to learn Riyadh's independent car market."),
       ("act1v8", 10.9, "Our founder and CEO, Leon, set the task: map a market no one had mapped."),
       ("act1v8", 19.5, "There was no map. So we built one. One showroom at a time."),
       ("act1v8", 22.8, "A small team, with a critical mandate."),
       ("act1v8", 32.0, "Visit. Observe. Ask. Document. Repeat."),
       ("act1v8", 38.4, "By day, door after door, down the avenue."),
       ("act1v8", 43.1, "And after dark, because the market trades at night."),
       ("act1v8", 48.2, "Every floor was different. Fleet trucks. Ambulances. Luxury flagships. Everyday sedans."),
       ("act1v8", 58.0, "Prices on windscreens. A Rolls-Royce Spectre, at one point five five million riyals."),
       ("act1v8", 64.8, "This is what they found."),
       ("b_seg_02", .73, "Five hundred and twenty showrooms. Nearly thirty-two thousand cars. Every number, sourced."),
       ("zoom1", 1.4, "It starts in the Kingdom of Saudi Arabia."), ("zoom1", 8.2, "In Riyadh, its capital."),
       ("zoom1", 13.6, "Al Qaadiseeya, in the east. Three hundred and nine showrooms."), ("zoom1", 18.6, "Thirty-four kilometres south, Al Shiffa."),
       ("pins", .6, "Every showroom we walked, day and night, we pinned at its exact coordinates."),
       ("pins", 6.6, "Four hundred and seventy-four pins. One map, now live on Google Earth."),
       ("moat", 1.0, "One uniform standard, across more than five hundred showrooms. Data no one else holds, and the ground our next strategy is written on."),
       ("b_seg_05", .47, "Every car, on every floor, counted by hand."),
       ("b_seg_09h2", .7, "For every ten cars sold, four more ready buyers walk away when financing falls through."),
       ("b_seg_09h2", 5.98, "Al Qaadiseeya alone: sixteen to twenty-nine billion riyals a year."),
       ("b_seg_11", .7, "One city. Two very different markets."),
       ("premium", 1.2, "At the top end: Rolls-Royce, Lamborghini, McLaren, G-Class and Porsche, all on independent floors."),
       ("indep", .9, "Ninety-eight percent of Al Qaadiseeya's floors are fully independent."),
       ("bank", .85, "And eleven of the thirteen we sat down with have no bank on site."),
       ("b_seg_19", .5, "One more thing."),
       ("b_seg_19", 5.3, "One point four billion riyals a year of ready buyers walk out. Because the financing was not there."),
       ("b_seg_20", 1.97, "The buyer is standing on the floor. The lender is not."),
       ("act3v6", .6, "Then the field knowledge became a system: AutoLink."),
       ("act3v6", 5.1, "Meetings with dealer groups. Training for their sales teams."),
       ("act3v6", 12.3, "Behind every figure were real people, who kept showing up."),
       ("act3v6", 19.6, "The earliest contribution is not always the most visible. Sometimes, it is the one everything else stands on."),
       ("kafd7", .9, "From the showroom floor, to our headquarters in the King Abdullah Financial District."),
       ("card_out2", .1, "AutoLink. The Riyadh Sub-Dealer Portfolio.")]
LINES = sorted((B[c] + d, x) for c, d, x in CUE)
VOICE = "af_heart"; OUT = os.path.join(V, "vo9_" + VOICE); os.makedirs(OUT, exist_ok=True)
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
for p in plan: print(("OK " if p["fits"] else "OVER") + f" {p['t']:6.1f}s {p['dur']:5.2f}/{p['room']:5.2f} x{p['speed']}  {p['text'][:70]}")
