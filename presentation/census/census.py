"""Riyadh sub-dealer field census: one reproducible build from the source files.

Sources (all local):
  xl/field.xlsx      RIYADH_FIELD_MAPPING workbook (finalised survey; Qadisiyah + Shifa sheets, ALL information sales sheet)
  snapshot.json      field-app export: GPS provenance per pin, owner interviews (lost buyers, pilot, banks)
  rows.json          field-app roster rows (used for the app-id <-> workbook-id join)
  photos.json        photo file -> app record id, from the published page

Outputs:
  data/census.json   one record per showroom, no personal contact data
  data/metrics.json  every published number with class, formula, source columns, denominator, n, assumptions

Classes: OBSERVED (recorded in the field), CALCULATED (arithmetic on observed records, no assumptions),
         ESTIMATED (needs an assumption; carries a range), UNAVAILABLE (not recorded / not finished).
Run: python3 -I census.py <scratchpad>
"""
import sys, json, re, math, random, statistics, unicodedata, collections
sys.path.insert(0, sys.argv[1] + "/census"); from xl import load
S = sys.argv[1]
wb, table = load(S + "/xl/field.xlsx")
C = collections.Counter

def num(x):
    if x is None or isinstance(x, bool): return None
    if isinstance(x, (int, float)): return float(x)
    t = str(x).replace(",", "").replace("O", "0").strip()
    try: return float(t)
    except ValueError: return None
def norm_ar(s): s = unicodedata.normalize("NFKC", str(s or "")); s = re.sub(r"[ً-ْـ]", "", s); s = re.sub("[أإآ]", "ا", s).replace("ة", "ه").replace("ى", "ي"); return re.sub(r"\s+", "", s)
def norm_en(s): return re.sub(r"[^a-z0-9]", "", str(s or "").lower())

# ---------- brand normalisation: "Toyota Hilux", "Toyota (Fortuner, Camry)" -> Toyota ----------
BRANDS = ["Toyota","Hyundai","Nissan","Kia","Lexus","Ford","Mercedes","GMC","Jetour","Chevrolet","BMW","MG","Changan","Land Rover","Range Rover","Isuzu","Genesis","Mazda","Geely","Jeep","Haval","Honda","GAC","Suzuki","Mitsubishi","JAC","Infiniti","Peugeot","Cadillac","Porsche","Mini","Audi","Renault","BAIC","Jaecoo","Chery","BYD","Exeed","Tank","Hongqi","Omoda","Dodge","Chrysler","Volkswagen","Skoda","Lincoln","Bentley","Rolls-Royce","Lamborghini","McLaren","Ferrari","Maserati","Aston Martin","Volvo","Subaru","Dongfeng","Foton","JMC","Great Wall","Hino","Fiat","Smart","Jetta","Bestune","Kaiyi","Soueast","Forthing","Haima","Maxus","Zeekr","Lynk","Deepal","Rox","Avatr","Leapmotor","Polestar","Tesla","Alfa Romeo","Citroen","Opel","Seat","Cupra","Ashok Leyland","Tata","Mahindra","Proton","Daihatsu","Hummer","Ram","Lucid","Ineos","Brabus","Mansory","Infinity"]
ALIAS = {"benz":"Mercedes","mercedes-benz":"Mercedes","merc":"Mercedes","landrover":"Land Rover","rangerover":"Land Rover","range rover":"Land Rover","lexis":"Lexus","vw":"Volkswagen","chevy":"Chevrolet","rollsroyce":"Rolls-Royce","rolls royce":"Rolls-Royce","infinity":"Infiniti","hyndai":"Hyundai","hundai":"Hyundai","toyoya":"Toyota","gwm":"Great Wall","g-class":"Mercedes","amg":"Mercedes","hilux":"Toyota","camry":"Toyota","land cruiser":"Toyota","prado":"Toyota","hiace":"Toyota","fortuner":"Toyota","yaris":"Toyota","elantra":"Hyundai","accent":"Hyundai","sonata":"Hyundai","tucson":"Hyundai","creta":"Hyundai","santa fe":"Hyundai","sunny":"Nissan","patrol":"Nissan","urvan":"Nissan","escalade":"Cadillac","tahoe":"Chevrolet","dyna":"Toyota","wrangler":"Jeep"}
CHINESE = {"Jetour","MG","Changan","Geely","Haval","GAC","JAC","BAIC","Jaecoo","Chery","BYD","Exeed","Tank","Hongqi","Omoda","Dongfeng","Foton","JMC","Great Wall","Jetta","Bestune","Kaiyi","Soueast","Forthing","Haima","Maxus","Zeekr","Lynk","Deepal","Rox","Avatr","Leapmotor"}
def brands_of(s):
    if not s: return [], False
    t = str(s); low = t.lower(); found = []
    for a, b in ALIAS.items():
        if re.search(r"(?<![a-z])" + re.escape(a) + r"(?![a-z])", low): found.append(b)
    for b in BRANDS:
        if re.search(r"(?<![a-z])" + re.escape(b.lower()) + r"(?![a-z])", low): found.append("Land Rover" if b == "Range Rover" else ("Infiniti" if b == "Infinity" else b))
    other_cn = bool(re.search(r"chinese", low))
    out = sorted(set(found), key=found.index)
    return out, other_cn

# ---------- field app: provenance, interviews, ids ----------
snap = json.load(open(S + "/snapshot.json"))[0]["data"]
app = {}
for d in snap["dealerships"]:
    f = d.get("flags", {}) or {}
    app[f.get("sdId") or d["id"]] = d
rows = {r["sd"]: r for r in json.load(open(S + "/rows.json"))}
photos = json.load(open(S + "/census/photos.json"))          # file -> app id
ph_by_app = collections.defaultdict(list)
for fn, aid in photos.items(): ph_by_app[aid].append(fn)

def loc_quality(aid):
    d = app.get(aid); f = (d or {}).get("flags", {}) or {}
    src, st = f.get("gpsSource"), f.get("gpsStatus")
    if st == "confirmed" or src in ("survey", "field_device_gps", "manual_pin", "existing_confirmed_pin"): return "verified"
    if src in ("mapping_seed", "public_map", "maps_link"): return "listing"
    if src in ("interpolated", "outlier_corrected", "related"): return "approximate"
    return "sheet"

# ---------- Al Qadisiyah ----------
_, Q = table("Al Qadisiyah - Mapped", 1)
census = []
for r in Q:
    sid = r["SD ID"]; ll = str(r.get("Latitude and longitude (for copy)") or "")
    m = re.findall(r"-?\d+\.\d+", ll); lat, lng = (float(m[0]), float(m[1])) if len(m) >= 2 else (None, None)
    if lat is None and sid in app and app[sid].get("lat"): lat, lng = app[sid]["lat"], app[sid]["lng"]   # sheet gap: use the field-app pin and its quality label
    b, ocn = brands_of(r.get("Main Brands")); a = rows.get(sid) or {}
    auth = str(r.get("Authorized Distributor") or "").strip()
    typ = {"New Cars": "new", "Used Cars": "used", "New & Used Cars": "mix"}.get(str(r.get("Vehicle Business Type") or "").strip())
    census.append(dict(id=sid, app=sid if sid in app else None, mk="Q", en=r.get("SD English Name"), ar=r.get("SD Arabic Name"),
        status="active" if a.get("status") != "closed" else "closed", lat=lat, lng=lng,
        loc=(loc_quality(sid) if lat is not None else "missing"), street=r.get("Located on : street name"),
        sqm=num(r.get("Showroom Size(m2)")), type=typ, brands=b, cn_other=ocn, inv=num(r.get("Sellable Inventory")), inside=None, outside=None,
        asp=num(r.get("ASP (SAR)")), over5=None, staff=num(r.get("Number Of Salesman")),
        auth=("yes" if auth.upper().startswith("Y") or auth in ("Isuzu",) else "unsure" if "?" in auth or "？" in auth else "no" if auth.upper().startswith("N") else None),
        finance=None, cred=(r.get("Information Credibility") or None), photos=ph_by_app.get(sid, [])))

# ---------- Al Shifa ----------
_, SH = table("Al Shifa - Mapped", 0)
app_shifa = {k: v for k, v in app.items() if (v.get("flags", {}) or {}).get("market") == "shifa" or str(k).startswith("S")}
by_ar = {norm_ar(v.get("nameAr") or rows.get(k, {}).get("ar")): k for k, v in app_shifa.items() if (v.get("nameAr") or rows.get(k, {}).get("ar"))}
by_en = {norm_en(v.get("name") or rows.get(k, {}).get("en")): k for k, v in app_shifa.items()}
unmatched = 0
for r in SH:
    st = str(r.get("Status") or "").strip()
    if st.lower().startswith("duplicate"): continue
    aid = by_ar.get(norm_ar(r.get("Name AR"))) or by_en.get(norm_en(r.get("Name EN")))
    if not aid: unmatched += 1
    lat, lng = num(r.get("Lat")), num(r.get("Long"))
    from_app = False
    if (lat is None or lng is None) and aid and app[aid].get("lat"): lat, lng, from_app = app[aid]["lat"], app[aid]["lng"], True   # sheet shows #N/A
    elif lat is None or lng is None: lat = lng = None
    b, ocn = brands_of(r.get("Main brands"))
    fin = str(r.get("Finance options") or "").lower()
    census.append(dict(id=r["SD ID"], app=aid, mk="S", en=r.get("Name EN"), ar=r.get("Name AR"),
        status={"active": "active", "closed": "closed", "maybe closing": "closing", "floor empty": "empty"}.get(st.lower(), "open-floor" if st.lower().startswith("open floor") else st.lower()),
        lat=lat, lng=lng, loc=((loc_quality(aid) if from_app else "verified") if lat else "missing"), street=None,  # sheet coordinates were walked on site (confirmed by the field lead, 18 Oct 2026)
        sqm=num(r.get("Showroom sqm")), type={"used_only": "used", "new_only": "new", "mix": "mix"}.get(r.get("car type")), brands=b, cn_other=ocn,
        inv=num(r.get("Total sellable Inventory")), inside=num(r.get("Inside Inventory")), outside=num(r.get("outside inventory")),
        asp=num(r.get("ASP - SAR")), over5=num(r.get("% older than 5 years")), staff=None, auth=None,
        finance=("cash" if "cash" in fin else "all" if "all banks" in fin else "new-only" if "new models" in fin else None), cred=None,
        photos=ph_by_app.get(aid, []) if aid else []))
for c in census:
    if c["inv"] == 0 and c["status"] != "active": c["inv"] = None
    c["photos"] = sorted(set(c["photos"]))

# ---------- owner interviews (Qadisiyah sales: ALL information sheet) ----------
_, A = table("ALL information", 1)
hdr = A[0]; keys = [hdr[k] for k in sorted(hdr)]
sales = []
q_by_en = {norm_en(c["en"]): c for c in census if c["mk"] == "Q"}
for row in A[1:]:
    v = [row[k] for k in sorted(row)]; d = dict(zip(keys, v))
    if d.get("Monthly Sales") is None: continue
    rec = (next((c for c in census if c["id"] == d.get("SD ID")), None) if d.get("SD ID") else None) or q_by_en.get(norm_en(d.get("Dealer Name")))
    sales.append(dict(id=rec["id"] if rec else None, name=str(d["Dealer Name"]).strip(), sold=num(d["Monthly Sales"]), fpr=num(d["FPR"]),
                      inv=num(d["Inventory"]), asp=num(d["ASP (SAR)"]), fin=num(d.get("Est Fin Units/mo")), incr_gmv_yr=num(d.get("Incr GMV/yr SAR"))))
for s in sales:
    if s["fin"] is None and s["sold"] and s["fpr"] is not None: s["fin"] = round(s["sold"] * s["fpr"], 1)
# lost buyers + pilot + banks: field-app interviews (Qadisiyah)
interviews = []
for sid, a in rows.items():
    if a.get("deep") or a.get("sold") is not None or a.get("lost") is not None:
        interviews.append(dict(id=sid, mk="Q" if a["market"] == "qadisiyah" else "S", sold=a.get("sold"), fin=a.get("fin"), lost=a.get("lost"),
                               units=a.get("units"), asp=a.get("asp"), pilot=a.get("pilot"), banks=len(a.get("banks") or []), bankRep=a.get("bankRep")))

# ---------- metrics ----------
M = []
def metric(id, label, value, cls, unit="", district="both", formula="", source="", denominator="", n=None, assumptions="", lo=None, hi=None, note=""):
    M.append(dict(id=id, label=label, value=value, lo=lo, hi=hi, unit=unit, cls=cls, district=district, formula=formula, source=source, denominator=denominator, n=n, assumptions=assumptions, note=note))
def dist(mk): return [c for c in census if c["mk"] == mk]
DN = {"Q": "Al Qadisiyah", "S": "Al Shifa"}
operating = lambda c: c["status"] in ("active", "closing")
SRC_Q, SRC_S = "workbook › Al Qadisiyah - Mapped dealerships", "workbook › Al Shifa - Mapped Dealerships"
for mk in ("Q", "S"):
    rs = dist(mk); src = SRC_Q if mk == "Q" else SRC_S
    metric(f"showrooms_{mk}", f"Showroom records, {DN[mk]}", len(rs), "OBSERVED", "showrooms", mk, "count of records", src + (" (duplicate rows removed)" if mk == "S" else ""), "", len(rs))
    metric(f"operating_{mk}", f"Operating showrooms, {DN[mk]}", sum(1 for c in rs if operating(c)), "OBSERVED", "showrooms", mk, "status Active (or 'maybe closing')", src + " › Status" if mk == "S" else "workbook + field-app status", "", len(rs))
    inv = [c["inv"] for c in rs if c["inv"]]; asp = [c for c in rs if c["inv"] and c["asp"]]
    metric(f"inventory_{mk}", f"Cars on the floor, {DN[mk]}", sum(inv), "OBSERVED", "cars", mk, "Σ sellable inventory", src + " › Sellable Inventory", f"{len(inv)} of {len(rs)} records with a count", len(inv))
    metric(f"stockvalue_{mk}", f"Stock value on display, {DN[mk]}", sum(c["inv"] * c["asp"] for c in asp), "CALCULATED", "SAR", mk, "Σ (inventory × stated average selling price)", src + " › Inventory, ASP", f"{len(asp)} records with both", len(asp), "ASP is the dealer-stated average selling price, not a transaction price")
    metric(f"asp_median_{mk}", f"Median stated average price, {DN[mk]}", statistics.median([c["asp"] for c in rs if c["asp"]]), "OBSERVED", "SAR", mk, "median of per-showroom ASP", src + " › ASP", "showrooms with an ASP", sum(1 for c in rs if c["asp"]))
    metric(f"inv_median_{mk}", f"Median cars per floor, {DN[mk]}", statistics.median(inv), "OBSERVED", "cars", mk, "median of inventory", src, "showrooms with a count", len(inv))
    sq = [c["sqm"] for c in rs if c["sqm"]]
    metric(f"sqm_{mk}", f"Showroom floor recorded, {DN[mk]}", sum(sq), "OBSERVED", "m²", mk, "Σ showroom size", src, f"{len(sq)} records with a size", len(sq))
    tb = [c for c in rs if c["type"]]
    for t in ("new", "used", "mix"):
        metric(f"type_{t}_{mk}", f"Share selling {t}, {DN[mk]}", sum(1 for c in tb if c["type"] == t) / len(tb), "CALCULATED", "share", mk, "showrooms of type ÷ showrooms with a type", src, f"{len(tb)} typed showrooms", len(tb))
    br = [c for c in rs if c["brands"]]
    for b in ("Toyota", "Hyundai"):
        metric(f"brand_{b.lower()}_{mk}", f"Floors carrying {b}, {DN[mk]}", sum(1 for c in br if b in c["brands"]) / len(br), "CALCULATED", "share", mk, f"showrooms listing {b} ÷ showrooms with brands recorded", src + " › Main brands (normalised)", f"{len(br)} showrooms with brands recorded (multi-brand floors count once per brand)", len(br))
    metric(f"brand_toyhy_{mk}", f"Floors carrying Toyota or Hyundai, {DN[mk]}", sum(1 for c in br if {"Toyota", "Hyundai"} & set(c["brands"])) / len(br), "CALCULATED", "share", mk, "showrooms listing Toyota or Hyundai ÷ showrooms with brands", src, f"{len(br)} showrooms with brands", len(br))
    metric(f"brand_cn_{mk}", f"Floors carrying a Chinese make, {DN[mk]}", sum(1 for c in br if (set(c["brands"]) & CHINESE) or c["cn_other"]) / len(br), "CALCULATED", "share", mk, "showrooms listing ≥1 Chinese brand ÷ showrooms with brands", src, f"{len(br)} showrooms with brands", len(br))
    loc = C(c["loc"] for c in rs)
    metric(f"loc_{mk}", f"Location quality, {DN[mk]}", dict(loc), "OBSERVED", "showrooms", mk, "verified = coordinate taken on the walk (phone GPS at the door, or the mapping sheet's walked coordinate); sheet = unconfirmed sheet coordinate; listing = seeded from a map listing; approximate = interpolated; missing = no coordinate", "field app gpsSource + workbook coordinates", "", len(rs))
q, s = dist("Q"), dist("S")
metric("showrooms_total", "Showroom records, both districts", len(q) + len(s), "OBSERVED", "showrooms", "both", "Al Qadisiyah + Al Shifa records", "workbook", "", len(q) + len(s))
metric("inventory_total", "Cars on the floor, both districts", sum(c["inv"] or 0 for c in census), "OBSERVED", "cars", "both", "Σ inventory", "workbook", "records with a count", sum(1 for c in census if c["inv"]))
metric("stockvalue_total", "Stock value on display, both districts", sum(c["inv"] * c["asp"] for c in census if c["inv"] and c["asp"]), "CALCULATED", "SAR", "both", "Σ inventory × ASP", "workbook", "records with both", sum(1 for c in census if c["inv"] and c["asp"]))
qs = [c for c in q if c["staff"]]
metric("staff_Q", "Salespeople counted, Al Qadisiyah", sum(c["staff"] for c in qs), "OBSERVED", "people", "Q", "Σ Number Of Salesman", SRC_Q, f"{len(qs)} showrooms", len(qs))
metric("cars_per_staff_Q", "Cars per salesperson, Al Qadisiyah", sum(c["inv"] for c in qs if c["inv"]) / sum(c["staff"] for c in qs if c["inv"]), "CALCULATED", "cars", "Q", "Σ inventory ÷ Σ salespeople (same showrooms)", SRC_Q, f"{sum(1 for c in qs if c['inv'])} showrooms with both", sum(1 for c in qs if c["inv"]))
metric("staff_S", "Salespeople, Al Shifa", None, "UNAVAILABLE", "", "S", "", "", "not recorded on the Al Shifa sheet", 0)
o5 = [c for c in s if c["over5"] is not None and c["inv"]]
metric("over5_S", "Stock older than five years, Al Shifa", sum(c["over5"] * c["inv"] for c in o5) / sum(c["inv"] for c in o5), "CALCULATED", "share", "S", "Σ(share older than 5y × inventory) ÷ Σ inventory", SRC_S + " › % older than 5 years", f"{len(o5)} showrooms with both", len(o5), "per-floor share is the surveyor's estimate on the visit")
metric("over5_Q", "Stock older than five years, Al Qadisiyah", None, "UNAVAILABLE", "", "Q", "", "", "not recorded on the Al Qadisiyah sheet", 0)
fo = [c for c in s if c["finance"]]
metric("cash_only_S", "Floors that sell for cash only, Al Shifa", sum(1 for c in fo if c["finance"] == "cash") / len(fo), "OBSERVED", "share", "S", "floors 'Cash deals only' ÷ floors with a finance answer", SRC_S + " › Finance options", f"{len(fo)} floors", len(fo))
metric("cash_only_S_n", "Floors that sell for cash only, Al Shifa (count)", sum(1 for c in fo if c["finance"] == "cash"), "OBSERVED", "showrooms", "S", "count", SRC_S, f"{len(fo)} floors", len(fo))
aq = [c for c in q if c["auth"]]
metric("authorised_Q", "Manufacturer-authorised floors, Al Qadisiyah", sum(1 for c in aq if c["auth"] == "yes"), "OBSERVED", "showrooms", "Q", "Authorized Distributor = Y or a named brand", SRC_Q + " › Authorized Distributor", f"{len(aq)} answered; {sum(1 for c in aq if c['auth']=='unsure')} unsure", len(aq))

# Qadisiyah sales: owner-reported, ALL information sheet
sd = [x for x in sales if x["sold"] and x["inv"]]
sold, inv_s = sum(x["sold"] for x in sd), sum(x["inv"] for x in sd)
fin = sum(x["sold"] * x["fpr"] for x in sd if x["fpr"] is not None)
metric("int_n_Q", "Owner sales interviews, Al Qadisiyah", len(sd), "OBSERVED", "showrooms", "Q", "interviews with monthly sales and inventory", "workbook › ALL information Showrooms", "", len(sd))
metric("int_sold_Q", "Monthly sales reported by interviewed owners", sold, "OBSERVED", "cars / month", "Q", "Σ Monthly Sales", "ALL information › Monthly Sales", f"{len(sd)} owners (self-reported)", len(sd))
metric("int_fpr_Q", "Share of their sales that are financed", fin / sold, "CALCULATED", "share", "Q", "Σ(sales × FPR) ÷ Σ sales", "ALL information › Monthly Sales, FPR", f"{len(sd)} owners", len(sd), "self-reported")
metric("int_fpr_median_Q", "Median financed share per showroom", statistics.median([x["fpr"] for x in sd]), "CALCULATED", "share", "Q", "median FPR", "ALL information › FPR", f"{len(sd)} owners", len(sd))
st = sold / inv_s
metric("int_turn_Q", "Monthly sales ÷ cars on the floor (interviewed floors)", st, "CALCULATED", "ratio", "Q", "Σ sales ÷ Σ inventory", "ALL information › Monthly Sales, Inventory", f"{len(sd)} owners", len(sd))
metric("int_days_Q", "Days to sell the floor once (interviewed floors)", 30 / st, "CALCULATED", "days", "Q", "30 ÷ (Σ sales ÷ Σ inventory)", "ALL information", f"{len(sd)} owners", len(sd))
metric("int_gmv_Q", "Monthly sales value of interviewed floors", sum(x["sold"] * x["asp"] for x in sd), "CALCULATED", "SAR / month", "Q", "Σ (sales × stated ASP)", "ALL information › Monthly Sales, ASP", f"{len(sd)} owners", len(sd))

# district estimate (Qadisiyah only), with bootstrap + conservative case
QI = sum(c["inv"] for c in q if c["inv"]); q_asp = [c for c in q if c["inv"] and c["asp"]]
ASPw = sum(c["inv"] * c["asp"] for c in q_asp) / sum(c["inv"] for c in q_asp)
random.seed(20261018); bs = []
for _ in range(4000):
    smp = [random.choice(sd) for _ in sd]; bs.append(sum(x["sold"] for x in smp) / sum(x["inv"] for x in smp))
bs.sort(); lo_st, hi_st = bs[int(.025 * len(bs))], bs[int(.975 * len(bs))]
cons = (inv_s * st + (QI - inv_s) * st / 2) / QI          # non-interviewed floors sell at half the interviewed rate
est = QI * st
metric("est_sales_Q", "Cars sold a month, Al Qadisiyah (estimate)", est, "ESTIMATED", "cars / month", "Q", "district inventory × interviewed sell-through", "workbook (inventory) + ALL information (sales)", f"{len(sd)} interviews applied to {sum(1 for c in q if c['inv'])} counted floors", len(sd),
       "interviewed floors represent all floors; range covers sampling noise only, not the likelihood that busier owners agreed to interviews", lo=QI * lo_st, hi=QI * hi_st, note=f"conservative case (other floors at half pace): {QI*cons:,.0f}")
metric("est_sales_Q_cons", "Cars sold a month, Al Qadisiyah (conservative)", QI * cons, "ESTIMATED", "cars / month", "Q", "interviewed floors at their rate; all other floors at half that rate", "as above", "", len(sd), "half-pace assumption for floors not interviewed")
metric("est_gmv_Q", "Annual sales value, Al Qadisiyah (estimate)", est * ASPw * 12, "ESTIMATED", "SAR / year", "Q", "estimated monthly sales × stock-weighted stated ASP × 12", "workbook + ALL information", "", len(sd), "as above; ASP is the dealer-stated average", lo=QI * lo_st * ASPw * 12, hi=QI * hi_st * ASPw * 12, note=f"conservative: SAR {QI*cons*ASPw*12/1e9:.1f}B")
metric("est_gmv_Q_cons", "Annual sales value, Al Qadisiyah (conservative)", QI * cons * ASPw * 12, "ESTIMATED", "SAR / year", "Q", "conservative monthly sales × ASP × 12", "", "", len(sd), "half-pace assumption")
metric("est_fin_Q", "Annual financed sales value, Al Qadisiyah (estimate)", est * ASPw * 12 * fin / sold, "ESTIMATED", "SAR / year", "Q", "annual value × interviewed financed share", "", "", len(sd), "financed share of interviewed owners applies district-wide", lo=QI * lo_st * ASPw * 12 * fin / sold * 0, hi=None)
M[-1]["lo"] = M[-1]["hi"] = None
metric("est_sales_S", "Cars sold a month, Al Shifa", None, "UNAVAILABLE", "", "S", "", "", "Al Shifa sales calculation not finished; its dynamics differ from Al Qadisiyah, so the Al Qadisiyah rate is not applied", 0)

# lost buyers (field-app interviews, Qadisiyah)
li = [x for x in interviews if x["mk"] == "Q" and x["sold"] and x["lost"] is not None]
ls, lsold = sum(x["lost"] for x in li), sum(x["sold"] for x in li)
metric("int_lost_Q", "Ready buyers lost a month when financing fails (interviewed floors)", ls, "OBSERVED", "buyers / month", "Q", "Σ buyers lost", "field app › owner sit-down", f"{len(li)} owners (self-reported)", len(li))
metric("int_lost_ratio_Q", "Buyers lost per 10 cars sold", ls / lsold * 10, "CALCULATED", "per 10 sold", "Q", "Σ lost ÷ Σ sold × 10", "field app › owner sit-down", f"{len(li)} owners", len(li))
lsar = [x for x in li if x.get("asp")]
metric("int_lost_sar_Q", "Value of buyers lost a year at the owner's stated price (interviewed floors)", sum(x["lost"] * x["asp"] for x in lsar) * 12, "CALCULATED", "SAR / year", "Q", "Σ (buyers lost a month × owner's average selling price) × 12", "field app › owner sit-down", f"{len(lsar)} owners (self-reported)", len(lsar), "every lost buyer would have paid the floor's average price; a month is representative of the year")
pl = C(x["pilot"] for x in interviews if x["pilot"])
metric("pilot_Q", "Owners ready or open to a finance pilot", pl.get("yes", 0) + pl.get("maybe", 0), "OBSERVED", "owners", "Q", "answers yes or maybe", "field app › owner sit-down", f"{sum(pl.values())} answered: {dict(pl)}", sum(pl.values()))
# Autolink scoring model scenario (company model, not observation)
inc = [x for x in sales if x["incr_gmv_yr"]]
metric("scn_fpr65_Q", "Extra financed sales a year if interviewed floors reached a 65% finance share", sum(x["incr_gmv_yr"] for x in inc), "ESTIMATED", "SAR / year", "Q", "Σ Incr GMV/yr from the company scoring model", "workbook › ALL information › Incr GMV/yr", f"{len(inc)} scored floors", len(inc), "scenario: FPR raised to the 65% target; company scoring model")

# ---------- geometry (located doors only) ----------
def xy(c, lat0): return ((c["lng"]) * 111320 * math.cos(math.radians(lat0)), c["lat"] * 110540)
def hull_area(P):
    P = sorted(set(P))
    if len(P) < 3: return 0
    def cr(o, a, b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lo, up = [], []
    for p in P:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(P):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    H = lo[:-1] + up[:-1]
    return abs(sum(H[i][0]*H[(i+1)%len(H)][1] - H[(i+1)%len(H)][0]*H[i][1] for i in range(len(H)))) / 2
GEO = {}
for mk in ("Q", "S"):
    loc = [c for c in census if c["mk"] == mk and c["loc"] != "missing" and c["lat"]]
    lat0 = statistics.mean(c["lat"] for c in loc); P = [xy(c, lat0) for c in loc]
    # trim the 1% most distant outliers from the district centre before the hull
    cx, cy = statistics.median(p[0] for p in P), statistics.median(p[1] for p in P)
    d = sorted(math.hypot(p[0]-cx, p[1]-cy) for p in P); cut = d[int(len(d) * .99) - 1]
    Pt = [p for p in P if math.hypot(p[0]-cx, p[1]-cy) <= cut]
    nn = [min(math.hypot(p[0]-q[0], p[1]-q[1]) for q in P if q is not p) for p in P]
    left = list(range(1, len(P))); cur = 0; tour = 0.0
    while left:
        j = min(left, key=lambda k: math.hypot(P[k][0]-P[cur][0], P[k][1]-P[cur][1])); tour += math.hypot(P[j][0]-P[cur][0], P[j][1]-P[cur][1]); left.remove(j); cur = j
    GEO[mk] = dict(area=hull_area(Pt) / 1e6, nn=statistics.median(nn), walk=tour / 1000, n=len(P))
    metric(f"area_{mk}", f"Footprint of the showroom cluster, {DN[mk]}", GEO[mk]["area"], "CALCULATED", "km²", mk, "convex hull of located doors (outermost 1% trimmed)", "census coordinates", f"{len(P)} located showrooms", len(P), "approximate and sheet coordinates included")
    metric(f"nn_{mk}", f"Typical distance to the next door, {DN[mk]}", GEO[mk]["nn"], "CALCULATED", "m", mk, "median nearest-neighbour distance", "census coordinates", f"{len(P)} located showrooms", len(P))
    metric(f"walk_{mk}", f"Route past every located door, {DN[mk]}", GEO[mk]["walk"], "CALCULATED", "km", mk, "greedy nearest-neighbour tour, straight lines", "census coordinates", f"{len(P)} located showrooms", len(P), "a lower bound on the distance actually walked; not a GPS track")
    metric(f"density_{mk}", f"Showrooms per km², {DN[mk]}", len(P) / GEO[mk]["area"], "CALCULATED", "per km²", mk, "located showrooms ÷ cluster footprint", "census coordinates", "", len(P))

# interview facts from field-app sit-downs (Qadisiyah, 25 owners)
dp = [r for r in rows.values() if r.get("deep") or r.get("sold") is not None]
br = [r for r in dp if r.get("bankRep")]
metric("bank_none_Q", "Sit-down floors with no bank or lender rep on site", sum(1 for r in br if r["bankRep"] == "no"), "OBSERVED", "showrooms", "Q", "bank rep answer = no", "field app › owner sit-down › bank rep", f"{len(br)} owners answered", len(br))
nb = [r for r in dp if r.get("banks")]
metric("bank_named_Q", "Sit-down owners who named a partner bank", len(nb), "OBSERVED", "owners", "Q", "≥1 bank named", "field app › owner sit-down", f"{len(dp)} owners", len(dp))
bu = [r for r in dp if r.get("buyer")]
metric("buyer_saudi_Q", "Sit-down floors selling mainly to Saudi buyers", sum(1 for r in bu if r["buyer"] == "saudi"), "OBSERVED", "showrooms", "Q", "buyer = saudi", "field app › owner sit-down", f"{len(bu)} owners answered", len(bu))
contracted = [c for c in Q if str(c.get("Contracted financial institutions/Banks") or "").strip() and "cash only" not in str(c.get("Contracted financial institutions/Banks")).lower()]
metric("bank_contract_Q", "Al Qadisiyah floors with a finance arrangement recorded", len(contracted), "OBSERVED", "showrooms", "Q", "non-empty 'Contracted financial institutions/Banks'", SRC_Q, "recorded mainly on sit-down visits; blank does not mean none", len(Q))
allb = C(b for c in census for b in c["brands"])
metric("brands_distinct", "Distinct brands recorded on the floors", len(allb), "CALCULATED", "brands", "both", "distinct normalised brand names", "workbook › Main Brands", f"{sum(1 for c in census if c['brands'])} showrooms with brands", sum(1 for c in census if c["brands"]), "after merging model names into their brand")
metric("photos", "Field photographs in the publication", len({p for c in census for p in c["photos"]}) , "OBSERVED", "photos", "both", "photos filed against a showroom record", "photo library", "", None)

out = {"built": "2026-10-18", "sources": {"workbook": "RIYADH_FIELD_MAPPING (Al Qadisiyah & Shifa).xlsx", "app": "field-app export (GPS provenance, owner sit-downs)"},
       "showrooms": census, "sales_interviews": sd, "brands": allb.most_common(), "geo": GEO, "metrics": M}
json.dump(out, open(S + "/census/census.json", "w"), ensure_ascii=False, indent=1, default=str)
print("records", len(census), "Q", len(q), "S", len(s), "unmatched Shifa->app", unmatched)
for m in M:
    v = m["value"]; vs = (f"{v:,.3f}" if isinstance(v, float) and abs(v) < 10 else f"{v:,.0f}" if isinstance(v, (int, float)) else str(v))
    rng = f" [{m['lo']:,.0f} – {m['hi']:,.0f}]" if m.get("lo") else ""
    print(f"{m['cls']:<11} {m['id']:<20} {vs}{rng}  n={m['n']}  {m['note']}")
