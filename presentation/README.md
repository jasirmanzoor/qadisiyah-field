# Riyadh sub-dealer presentation

Self-running keynote built from the Al Qadisiyah and Al Shifa field census. Published privately at
https://claude.ai/artifact/RGxNw3bwo4FB72LkArbHJz.

- `site/` — the built page (`index.html` is the body, `preview.html` a full document for local viewing) and every asset it loads: photos, satellite and city tiles, video, globe textures, public research files (`data/`). Serve with `python3 -m http.server` and open `preview.html`.
- `src/` — page source. `template.html` holds base CSS/JS; `body.html`, `kn.css`, `kn.js` (deck and tour director), `uni.js` (particle scenes), `city.js` (satellite → data map), `folio.js` (Glass Folio photos), `rb/` (React Bits GhostFibers, AeroShards, MaskedHeading ported to plain JS). `assemble.py` combines them.
- `census/` — `census.py` builds the metric register (every figure classed Observed / Calculated / Estimated / Unavailable, with formula, source and n) from the field workbook; `emit.py` writes `data.json` and the public files.
- `tools/` — build script, map-layer bakers (Microsoft building footprints, Esri imagery) and Playwright QA scripts.

The field workbook and app export are not in the repo: they contain contact names and phone numbers. The public showroom CSV in `site/data/` has none.
