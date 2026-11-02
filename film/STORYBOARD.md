# AUTOLINK — "MAPPED."

**Concept:** one blue line becomes a door, the door becomes 520 doors, and 520 doors become one organized network: AUTOLINK.

- 30 s · 1920×1080 · 60 fps · 120 BPM (1 beat = 0.5 s, 1 bar = 2 s)
- Type: Inter Display (Black / Bold / SemiBold), one family only
- Palette: blue `#2B4BFF`, sky `#A9C1FF`, survey orange `#FF5B1F`, plus black and white, in light mode
- Camera: constant slow push-in, with exponential zoom-throughs instead of cuts
- Assets: the 63 real survey facade photos and real showroom GPS / inventory from this repo; bank and finance-company logos cut from the AUTOLINK banking pipeline sheet (`logos/`), labelled neutrally as "banks & finance companies", not partners

| Bar | Time | Technique | Beat by beat |
|---|---|---|---|
| 1 | 0–2 | Hook | Blue line stretches · opens like a shutter onto a showroom · orange paint ring on the sign + `001 / 520` · window splits into 3 photo columns |
| 2 | 2–4 | Kinetic type | Columns carve into a photo-filled **520** · blue fill wipes up, "SHOWROOMS" · NEVER MAPPED. · NEVER SURVEYED. |
| 3 | 4–6 | Kinetic type → shape | 520 rolls to UNTIL · NOW. (the O is a blue disc) · letters drop away, disc centres · disc irises open onto a photo |
| 4–5 | 6–10 | Images + paint | full bleed · 1+2 with paint ring + MAPPED · 6 tiles with ticks + SURVEYED · zoom-through to one showroom: dimension line, ring, SIZE/STOCK/BRANDS/FINANCE · 5 strips AL QADISIYAH · 12 tiles AL SHIFA · 40 tiles · tiles paint blue/sky |
| 6–7 | 10–14 | Shape morph | 40 squares assemble into 2 blocks · blocks morph into the real district outlines · fill shatters into 520 GPS dots · dots pulse, MAPPED. · orange survey rings, SURVEYED. · network tree draws, STRUCTURED. · rings retract |
| 8–9 | 14–18 | 2D → 3D | Map tilts back · every showroom extrudes by cars on the floor · 20,831 rolls · 11,038 rolls · orbit + 31,869 CARS · bars fall into a ranked chart |
| 10–11 | 18–22 | Data / UI | Ranked distribution · SAR 3.6BN · chart shrinks into a sparkline, card draws around it · Al Qadisiyah rows tick in · card flips to Al Shifa · card shrinks left → AUTOLINK AI → logo wall: 8 banks, then 11 finance companies · FINANCE, FACILITATED. · the wall collapses into the AI node |
| 12 | 22–24 | Type stack | NO ONE HAD · MAPPED · THIS MARKET · BEFORE. — zoom through the blue period |
| 13 | 24–26 | Riser | Period becomes a photo; the grid doubles each beat 1 → 4 → 16 → 64 → 256 with the counter rolling |
| 14 | 26–28 | Strongest | 256-tile wall tilts into 3D · flips in a diagonal wave to read **ORGANIZED.** · settles flat · tiles fly into the AUTOLINK mark |
| 15 | 28–30 | End title | Mark + AUTOLINK + "THE SUB-DEALER MARKET, ORGANIZED." · type rolls out · the three diamonds fold back into the opening blue line, so it loops |

**Sound:** a kick on every beat, offbeat hats, 8th-note bass (A–F–C–G), arps under the collage and data sections, a hit on every scene change, a noise and saw riser across bars 13→14, and big impacts at 26 s and 28 s.

**Render:** `index.html` exposes `window.seek(t)`, and every pixel is a pure function of t. Each page sample is a 2-tap shutter. `render.mjs full` renders 3 subframes per frame at 180 fps and blends them with `tmix`, which gives direction-true motion blur. `audio.mjs` renders the soundtrack with OfflineAudioContext to a WAV.
