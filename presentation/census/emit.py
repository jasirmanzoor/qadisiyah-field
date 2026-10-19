"""Emit the page data (legacy row shape + metric registry) and the public research files from census.json."""
import sys, json, os, csv, collections
S = sys.argv[1]; c = json.load(open(S + "/census/census.json")); rows = json.load(open(S + "/rows.json"))
# public names: drop owner names and field notes the survey appended after the trading name
CLEAN = {"SD004": ("Abu Ghazi Cars", "معرض ابوغازى للسيارات"), "SD005": ("Adwa Suwaidan Cars", "معرض اضواء سويدان للسيارات"),
         "SD167": ("Al Masoudi Cars", "معرض المسعودي للسيارات"), "SD173": ("Al Hassan Ayesh Al Adini Cars", "معرض الحسن عائش العديني للسيارات"),
         "SD187": ("Al Maliki Car Showrooms", "معارض السيارات المالكي")}
for x in c["showrooms"]:
    if x["id"] in CLEAN: x["en"], x["ar"] = CLEAN[x["id"]]
M = {m["id"]: m for m in c["metrics"]}; V = lambda k: M[k]["value"]
T = {"new": "n", "used": "u", "mix": "m"}
d = []
sales_ids = {s["id"] for s in c["sales_interviews"] if s["id"]}
app_deep = {r["sd"] for r in rows if r.get("deep") or r.get("sold") is not None}
for x in c["showrooms"]:
    d.append([x["id"], x["en"], x["ar"], 0 if x["mk"] == "Q" else 1, T.get(x["type"], ""), int(x["inv"]) if x["inv"] else None,
              int(x["asp"]) if x["asp"] else None, round(x["over5"] * 100) if x["over5"] is not None else None, x["brands"],
              x["lat"] if x["loc"] != "missing" else None, x["lng"] if x["loc"] != "missing" else None, x.get("street"),
              x["status"] in ("closed", "empty", "open-floor"), bool(x["inv"] or x["asp"]), x["id"] in sales_ids or x["app"] in app_deep,
              x["auth"] == "yes", x["photos"], int(x["sqm"]) if x["sqm"] else None, x["loc"], x["status"], x["finance"]])
deep = []
for r in rows:
    if r.get("deep") or r.get("sold") is not None:
        deep.append([r["en"], 0 if r["market"] == "qadisiyah" else 1, r.get("units"), r.get("sold"), r.get("fin"), r.get("lost"), r.get("pilot") or "", r.get("banks") or [], r["sd"]])
dp = [r for r in rows if (r.get("deep") or r.get("sold") is not None) and r.get("sold") and r.get("asp") and r.get("lost") is not None and r["market"] == "qadisiyah"]
lostSar = sum((r.get("lost") or 0) * r["asp"] for r in dp); soldSar = sum(r["sold"] * r["asp"] for r in dp)
G = c["geo"]
photos_on_disk = len([f for f in os.listdir(S + "/portfolio/photos") if f.endswith(".jpg") and not f.startswith("hq-")])
facts = dict(per=[dict(area=round(G[k]["area"], 2), nn=round(G[k]["nn"]), walk=round(G[k]["walk"], 1), cn=round(V(f"brand_cn_{k}"), 3)) for k in ("Q", "S")],
    sqm=int(V("sqm_Q") + V("sqm_S")), sqmN=M["sqm_Q"]["n"] + M["sqm_S"]["n"], salesmen=int(V("staff_Q")), salesmenN=M["staff_Q"]["n"],
    carsPerSalesman=round(V("cars_per_staff_Q"), 1), brands=V("brands_distinct"),
    cn=round(sum(1 for x in c["showrooms"] if x["brands"] and (x["cn_other"] or set(x["brands"]) & {"Jetour","MG","Changan","Geely","Haval","GAC","JAC","BAIC","Jaecoo","Chery","BYD","Exeed","Tank","Hongqi","Omoda","Dongfeng","Foton","JMC","Great Wall","Bestune","Kaiyi","Soueast","Forthing","Haima","Maxus","Zeekr","Lynk","Deepal","Rox","Avatr","Leapmotor"})) / sum(1 for x in c["showrooms"] if x["brands"]), 3),
    toyHy=round(sum(1 for x in c["showrooms"] if {"Toyota", "Hyundai"} & set(x["brands"])) / sum(1 for x in c["showrooms"] if x["brands"]), 3),
    auth=V("authorised_Q"), turnDays=round(V("int_days_Q")), lostSar=lostSar, soldSar=soldSar, lostN=len(dp),
    bankAns=M["bank_none_Q"]["n"], bankNo=V("bank_none_Q"), bankNamed=V("bank_named_Q"), saudiMajority=V("buyer_saudi_Q"), buyerAns=M["buyer_saudi_Q"]["n"],
    photos=photos_on_disk, rosterVersions=25, cashOnlyS=V("cash_only_S_n"), cashAnsS=M["cash_only_S"]["n"])
sales = [[s["name"], s["sold"], s["fpr"], s["inv"], s["asp"]] for s in c["sales_interviews"]]
data = dict(d=d, deep=deep, comp=["Carly", "Soum (offline showroom)"], facts=facts, sales=sales, metrics=c["metrics"], al={x["app"]: x["id"] for x in c["showrooms"] if x.get("app") and x["app"] != x["id"]},
            ext=json.load(open(S + "/census/external.json")))
json.dump(data, open(S + "/data.json", "w"), ensure_ascii=False, separators=(",", ":"))
# public research files
os.makedirs(S + "/portfolio/data", exist_ok=True)
json.dump(c["metrics"], open(S + "/portfolio/data/metrics.json", "w"), ensure_ascii=False, indent=1)
with open(S + "/portfolio/data/showrooms.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["id", "district", "name_en", "name_ar", "status", "lat", "lng", "location_quality", "showroom_m2", "type", "brands", "inventory", "avg_price_sar", "pct_over_5y", "salespeople", "authorised", "finance"])
    for x in c["showrooms"]:
        w.writerow([x["id"], "Al Qadisiyah" if x["mk"] == "Q" else "Al Shifa", x["en"], x["ar"], x["status"], x["lat"] if x["loc"] != "missing" else "", x["lng"] if x["loc"] != "missing" else "", x["loc"], x["sqm"] or "", x["type"] or "", "; ".join(x["brands"]), x["inv"] or "", x["asp"] or "", x["over5"] if x["over5"] is not None else "", x["staff"] or "", x["auth"] or "", x["finance"] or ""])
print("rows", len(d), "deep", len(deep), "sales", len(sales), "metrics", len(c["metrics"]), "photos", photos_on_disk, "lostSar", lostSar, "soldSar", soldSar)
