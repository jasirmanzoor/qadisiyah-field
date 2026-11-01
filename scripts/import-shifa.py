#!/usr/bin/env python3
"""Convert the 'al shifa - MAPPING' sheet into src/lib/shifa-seed.json.

Only values present in the sheet are carried over. Blank cells stay null.
Usage: python3 scripts/import-shifa.py "path/to/qadisiyah and shifa mapping.xlsx"
"""
import json, sys
import openpyxl

SHEET = "al shifa - MAPPING"
STATUS = {"not visited": "not_visited", "partial": "partial", "complete": "completed",
          "completed": "completed", "closed / moved": "closed_moved", "refused": "refused",
          "competitor": "competitor"}
AGE = {"wide": "wide_spread", "wide_spread": "wide_spread", "mostly_2020_plus": "mostly_2020_plus",
       "mostly_2015_2020": "mostly_2015_2020", "mostly_pre_2015": "mostly_pre_2015"}
BUYER = {"even": "roughly_even", "roughly_even": "roughly_even", "mostly_saudi": "mostly_saudi",
         "mostly_expat": "mostly_expat", "mostly_self_employed": "mostly_self_employed"}
SIZE_BASIS = {"estimated", "measured", "dealer_stated"}
COUNT_BASIS = {"estimated", "counted", "dealer_stated"}
VEHICLE = {"used_only", "new_only", "mix"}
VOLUME = {"observed", "self_reported", "mixed"}
PILOT = {"yes", "maybe", "no", "too_early"}
SOURCE = {"observed", "self_reported"}


def blank(v):
    return v is None or (isinstance(v, str) and not v.strip())


def s(v):
    return "" if blank(v) else str(v).strip()


def num(v):
    if blank(v):
        return None
    try:
        f = float(str(v).replace(",", ""))
    except ValueError:
        return None
    return int(f) if f.is_integer() else f


def pick(v, allowed, mapping=None):
    t = s(v).lower()
    if mapping:
        t = mapping.get(t, "")
    return t if t in allowed else None


def main(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[SHEET]
    rows = ws.iter_rows(values_only=True)
    header = [s(h) for h in next(rows)]
    col = {h: i for i, h in enumerate(header)}
    out = []
    for r in rows:
        g = lambda name: r[col[name]] if name in col else None
        sd = s(g("SD ID"))
        if not sd:
            continue
        try:
            flags = json.loads(s(g("Flags")) or "{}")
        except json.JSONDecodeError:
            flags = {}
        inside, outside, older = num(g("Cars inside")), num(g("Cars outside")), num(g("% older than 5 years"))
        extra = []
        if inside is not None or outside is not None:
            extra.append(f"Cars inside {inside if inside is not None else '?'} / outside {outside if outside is not None else '?'}")
        if older is not None:
            extra.append(f"{older}% older than 5 years")
        out.append({
            "sdId": sd,
            "nameEn": s(g("Name EN")),
            "nameAr": s(g("Name AR")),
            "visitStatus": STATUS.get(s(g("Visit status")).lower(), "not_visited"),
            "lat": num(g("Lat")),
            "lng": num(g("Lng")),
            "listedPhone": s(g("Listed phone")),
            "crNumber": s(g("CR number")),
            "showroomSizeSqm": num(g("Showroom sqm")),
            "sizeBasis": pick(g("Size basis"), SIZE_BASIS),
            "vehicleType": pick(g("Vehicle type"), VEHICLE),
            "inventoryAgeMix": pick(g("Inventory age mix"), set(AGE.values()), AGE),
            "pocName": s(g("POC name")),
            "pocRole": s(g("POC role")),
            "pocMobile": s(g("POC mobile")),
            "decisionMaker": s(g("Decision maker")),
            "numSalesmen": num(g("Salesmen")),
            "mainBrands": [b.strip() for b in s(g("Main brands")).replace(",", ";").split(";") if b.strip()],
            "authorisedBrand": s(g("Authorised brand")),
            "inventoryUnits": num(g("Sellable units")),
            "inventorySource": pick(g("Inventory source"), SOURCE),
            "inventoryCountBasis": pick(g("Inventory basis"), COUNT_BASIS),
            "avgPrice": num(g("Avg selling price SAR")),
            "priceSource": pick(g("Price source"), SOURCE),
            "banksPartnered": [b.strip() for b in s(g("Banks partnered")).replace(",", ";").split(";") if b.strip()],
            "buyerMix": pick(g("Buyer mix"), set(BUYER.values()), BUYER),
            "volumeFiguresBasis": pick(g("Volume figures are"), VOLUME),
            "openToPilot": pick(g("Open to pilot"), PILOT),
            "street": s(g("Street / corridor")),
            "needsGps": bool(flags.get("needsGps", s(g("GPS source")) != "survey")),
            "notes": " · ".join(x for x in [s(g("Notes")), "; ".join(extra)] if x),
        })
    missing = [o["sdId"] for o in out if o["lat"] is None or o["lng"] is None]
    if missing:
        sys.exit(f"Rows without coordinates: {missing}")
    json.dump(out, open("src/lib/shifa-seed.json", "w"), ensure_ascii=False, indent=1)
    print(f"Wrote {len(out)} Al Shifa records")


if __name__ == "__main__":
    main(sys.argv[1])
