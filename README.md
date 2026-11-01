# Al Qadisiyah Dealership Intelligence Platform

Mobile-first, offline-first field survey tool for mapping and qualifying independent car
dealerships in the Al Qadisiyah market (East Riyadh) for embedded auto-financing.

**Status: Phase 1 (map + survey + offline sync + dashboard) and Phase 2 (research agent) are
built.** Phase 3 (operational layer, multi-user) is not started.

## What's here

- **Map** (`/`) — colour-coded pins by visit status, satellite/street toggle, near-me sort,
  walking-route planner, quick "add dealership" capture.
- **Survey** (`/survey/[id]`) — 9-step mobile form covering identity, business identity,
  people, commercial terms, financing pain, customers, and a mandatory data-quality gate.
  Autosaves every field to IndexedDB; works fully offline.
- **Dashboard** (`/dashboard`) — coverage, field completeness, an **Observed-only** toggle on
  every aggregate, pilot pipeline, top leads, and CSV/Excel export.
- **Settings** (`/settings`) — dark mode, CSV/Excel import (bring in your own survey sheet),
  OpenStreetMap-based discovery of nearby real dealerships not yet on the roster, research
  tasks and cost control, reset.
- **Research agent** (Phase 2) — see below.

## Research agent (Phase 2)

Looks up *public* facts about a dealership (CR number, listed phone, brands, social handles,
advertised financing, reviews) with Claude + web search in English and Arabic. It never
estimates private figures like monthly sales or financing share — those stay field-collected.

| Where | What |
|---|---|
| Settings → Research tasks | Write tasks in plain language (or start from a template). Pick what field it writes to, sources, and a schedule: on-demand, daily or weekly. Change schedule/scope on a saved task inline. |
| Survey → 🔍 Research | Run any task for this dealership. Each finding shows value, confidence, source link, cost. **Accept** writes it into the record and adds a provenance line to the notes; replacing an existing value asks first. **Reject** discards it. |
| Settings → Research cost control | Daily run cap, spend today / last 30 days, batch runner (task × scope, cost estimate from your real average, confirm, stop). |
| Dashboard → Research alerts | Values that changed since the last successful lookup (Review / Dismiss) and suspected duplicates (Merge / Not a duplicate). |
| Dashboard → Export Excel | Adds an **Agent findings** sheet, separate from field-collected columns. |

**Trust rules built in**

- Findings sit in their own store and never overwrite field data unless you accept them.
- A finding whose source URL is not one of the pages the search actually returned is
  downgraded to *low* confidence and labelled "verify before accepting". Non-http(s) links are dropped.
- A lookup that simply finds nothing is not treated as a "change".

**Scheduling.** There is no backend, so daily/weekly tasks run *while the app is open and
online* (checked shortly after opening, then every 30 minutes). Each task × dealership pair is
re-checked once per interval, never-checked first. Scheduled runs use at most 80% of the daily
cap, so manual runs always have room; a 300-dealership roster is worked through over several
days. Pause it in Settings.

**Duplicates.** Flags when every distinctive word of one English name appears in the other (whole words, so
"Hala" never matches inside "Shalal", and a shared place name like "Riyadh" alone is not enough)
*or* on an exact Arabic-name match after
normalising spelling (catches transliteration variants like "Idris Car" / "Idrees Car").
Proximity alone never flags — showrooms here sit metres apart. Re-scans don't re-add pairs you
dismissed. **Merge** keeps the record you choose: its values win, the other fills only empty
fields, explicit statuses (competitor / refused / closed) are never downgraded, and photos,
notes, findings and run history move across before the other record is deleted.

### Deploying research

Set two environment variables on the deployment:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `RESEARCH_ACCESS_TOKEN` | A long random code (e.g. `openssl rand -hex 24`). Enter the same code in Settings → Research access code on each device. |

Research stays disabled until both are set — without the access code, anyone who found the
app's URL could spend your API credit. The in-app daily cap is per device, so also set a
monthly spend limit on the API key's workspace in the Anthropic Console as the hard ceiling.

Cost per run is billed tokens plus web searches ($10 per 1,000); the app logs the real cost of
every run. The route allows up to 5 searches per run and `maxDuration = 60` seconds; if runs
time out and your hosting plan allows longer functions, raise `maxDuration` in
`src/app/api/research/run/route.ts`.

## Markets: Al Qadisiyah and Al Shifa

The Map and Dashboard have a two-option market selector — **Al Qadisiyah** (East Riyadh) and
**Al Shifa** (South Riyadh). The choice is remembered per device and scopes the map pins, list,
route planner, dashboard figures, CSV/Excel export, batch research, OpenStreetMap discovery
and sheet import. New dealerships are tagged with the market you're in. Research searches use
that market's locality. Duplicate scans only compare dealerships within the same market (an
operator with a desk in both markets is two real showrooms).

The Al Shifa roster (98 records) comes from the **"al shifa - MAPPING"** sheet of
`qadisiyah and shifa mapping.xlsx`, converted by `scripts/import-shifa.py` into
`src/lib/shifa-seed.json` — only values present in the sheet, blanks left empty. Pins the sheet
marks as not GPS-confirmed show with a dashed outline and a "Needs GPS" filter in the list;
updating the position from the survey's Identity step clears the flag. Devices that already had
the Al Qadisiyah roster get Al Shifa added once on next open, without touching existing records.

To refresh Al Shifa from a newer sheet: `python3 scripts/import-shifa.py "path/to/file.xlsx"`.

## The core data rule

Every business figure (inventory, price, monthly sold, monthly financed, financing losses) is
stored as `{ value, basis }` where `basis` is `observed` or `self_reported`. Dashboard
aggregates default to **Observed-only** and never silently blend the two. This mirrors the
field-survey philosophy: what you can count with your own eyes vs. what the dealer told you.

## Seed data provenance

The starting roster (`src/lib/seed.ts`) combines two real sources — no dealership names or
figures are invented:

1. The original 38-dealership mapping-data list for the district.
2. A 43-record manually-surveyed master table. Four records matched an existing mapping-data
   entry by name and <20m GPS proximity and were merged in place; the other 39 are distinct
   dealerships (this market has many showrooms per block, so nearby ≠ duplicate) added as
   additional pins.

This gives ~75 real starting records. The Al Qadisiyah market has far more dealerships than
that — growing the roster further should come from continued field survey (use **Import** in
Settings to bring in updated sheets) or from **Discover more dealerships** in Settings, which
queries OpenStreetMap for real, sourced candidate pins near the market to go verify in person.
Nothing in this app fabricates a dealership.

## Architecture notes

- **Local-first, single device.** All data lives in IndexedDB on the device — the app is fully
  functional with zero network. There is no backend in Phase 1. An optional "cloud sync
  endpoint" can be set in Settings as a forward-compatible hook for a future backend; when
  unset the app is simply local-only (matches the plan's Phase 3 multi-user scope).
  Photos are stored as compressed blobs in IndexedDB, geotagged on capture.
- **Offline map tiles.** A service worker (`public/sw.js`) caches the app shell and any map
  tiles you've already viewed, so previously-loaded areas keep rendering with no signal.
  First load of a new area still needs connectivity.
- **Auth.** A lightweight local "who's surveying" gate (name only, no server) — enough to
  avoid leaving commercially sensitive data on an unlocked screen, not a real multi-user
  auth system. Multi-user support is explicitly Phase 3 in the plan.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

Stack: Next.js (App Router) + TypeScript + Tailwind CSS v4, Leaflet/react-leaflet for the map,
`idb` for IndexedDB, ExcelJS for import/export.
