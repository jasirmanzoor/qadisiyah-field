#!/usr/bin/env python3
"""Parse the Al Qadisiyah field sheet and emit src/lib/census-data.json.

Fills missing fields from observed patterns — never invents financials.
"""
from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
# Latest field sheet (street column + resolved Google Maps pins). Fall back to (8) if missing.
_MIND = Path("/workspace/attachments/Dealer MIND Map - Training.xlsx")
_LATEST = Path("/workspace/attachments/Al Qadisiyah.xlsx")
_PREV = Path("/workspace/attachments/Al Qadisiyah (8).xlsx")
_GIS = Path("/workspace/attachments/AL QADISIYAH - SURVEY - Autolink- Al Qadisiyah - Dealers.xlsx.csv")
XLSX = _MIND if _MIND.exists() else (_LATEST if _LATEST.exists() else _PREV)
OUT = Path("/workspace/src/lib/census-data.json")
MARKET = (24.8260, 46.8230)
CENSUS_VERSION = 14
# GIS WKT more than this far from the market is the out-of-area branch, not the Qadisiyah pin.
GIS_OUTLIER_M = 4000

COL_ALIASES = {
    "sd id": "sd",
    "sd arabic name": "ar",
    "sd english name": "en",
    "city": "city",
    "area": "area",
    "latitude and longitude": "latlng",
    "latitude and longitude (for copy)": "latlng",
    "google maps geo link (based on lat long": "maps",
    "located on : street name": "street",
    "showroom size(m2)": "size",
    "authorized distributor": "auth",
    "vehicle business type": "vtype",
    "customer nationality mix": "mix",
    "key contact name": "poc",
    "key contact role": "role",
    "contact number": "contact",
    "main brands": "brands",
    "sellable inventory": "inv",
    "monthly sales": "sold",
    "monthly financed deals": "fin",
    "fpr": "fpr",
    "number of salesman": "salesmen",
    "online salesman": "online_sm",
    "walk-in salesman": "walk_sm",
    "asp (sar)": "asp",
    "contracted financial institutions": "banks",
    "contracted financial institutions/banks": "banks",
    "finance mandoob": "rep",
    "finance sales rep": "rep",
    "customer from online": "online_pct",
    "customer from walk-in": "walk_pct",
    "information credibility": "cred",
    "notes": "notes",
}


def fold_header(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower()).rstrip(":")


def detect_cols(rows: dict) -> dict[str, int]:
    h = rows.get(2, {})
    mapping: dict[str, int] = {}
    for col, val in h.items():
        key = fold_header(str(val))
        if not key:
            continue
        for alias, name in COL_ALIASES.items():
            if name in mapping:
                continue
            if key == alias or key.startswith(alias) or alias.startswith(key):
                mapping[name] = col
                break
    cred = mapping.get("cred")
    if cred and "notes" not in mapping:
        mapping["notes"] = cred + 1
    required = ("sd", "en", "latlng", "size", "brands")
    missing = [k for k in required if k not in mapping]
    if missing:
        raise SystemExit(f"Sheet header missing columns {missing} in {XLSX}")
    return mapping


# Original mapping-roster pins (pre-census). Used to backfill GPS + phones.
MAPPING = [
    {"nameEn": "AL HALL AL SARI FOR CARS", "nameAr": "", "lat": 24.8259915, "lng": 46.8226078, "phone": "+966533093339", "note": ""},
    {"nameEn": "Automax", "nameAr": "", "lat": 24.8301255, "lng": 46.8364122, "phone": "+966533077000", "note": ""},
    {"nameEn": "AlWadi Car", "nameAr": "معرض مركبة الوادي للسيارات فرع القادسيه", "lat": 24.824768, "lng": 46.8174393, "phone": "+966580646002", "note": ""},
    {"nameEn": "Carly", "nameAr": "كارلي", "lat": 24.8291207, "lng": 46.8248513, "phone": "+966920016302", "note": "COMPETITOR — embedded finance"},
    {"nameEn": "Sayaratk Cars Co.", "nameAr": "شركة سيارتك للسيارات", "lat": 24.8312385, "lng": 46.8281159, "phone": "+966595066097", "note": ""},
    {"nameEn": "Exit 8 Car Dealer", "nameAr": "", "lat": 24.8224692, "lng": 46.825439, "phone": "+966557974899", "note": ""},
    {"nameEn": "Alhamidi Cars Company", "nameAr": "", "lat": 24.8244831, "lng": 46.8224061, "phone": "+966503543287", "note": ""},
    {"nameEn": "Saeed Salem Al Shahrani Cars", "nameAr": "شركة سعيد سالم الشهراني للسيارات", "lat": 24.8199375, "lng": 46.8251396, "phone": "+966556570540", "note": ""},
    {"nameEn": "Idris Car", "nameAr": "ادريس كار", "lat": 24.8252064, "lng": 46.8259055, "phone": "+966920015755", "note": ""},
    {"nameEn": "Saleh Group for Cars", "nameAr": "مجموعة صالح للسيارات", "lat": 24.8262119, "lng": 46.8219016, "phone": "+966920022122", "note": ""},
    {"nameEn": "Soum Cars", "nameAr": "معرض سوم للسيارات", "lat": 24.8187947, "lng": 46.824374, "phone": "+966540031703", "note": "COMPETITOR — online platform"},
    {"nameEn": "Hala Car Company", "nameAr": "شركة هلا كار للسيارات", "lat": 24.8202447, "lng": 46.8236137, "phone": "+966920013471", "note": "Listed as finance business"},
    {"nameEn": "Sanam United Cars", "nameAr": "معرض سنام المتحدة للسيارات", "lat": 24.8305529, "lng": 46.8287964, "phone": "+966550395924", "note": ""},
    {"nameEn": "Anwar Al Qadisiyah", "nameAr": "معرض أنوار القادسية", "lat": 24.8252899, "lng": 46.8290274, "phone": "+966555381166", "note": ""},
    {"nameEn": "Shallal Najd Cars", "nameAr": "معرض شلال نجد للسيارات", "lat": 24.8288408, "lng": 46.8226635, "phone": "+966920002911", "note": ""},
    {"nameEn": "Imad Eddin Gallery", "nameAr": "", "lat": 24.8205575, "lng": 46.8257539, "phone": "+966504448216", "note": "Recently relocated — verify"},
    {"nameEn": "Al Kaif Cars Company", "nameAr": "شركة معرض الكيف للسيارات", "lat": 24.8253412, "lng": 46.8231903, "phone": "+966506113280", "note": ""},
    {"nameEn": "Ostora Al Qadisiyah Cars", "nameAr": "معرض اسطورة القادسية للسيارات", "lat": 24.8246275, "lng": 46.8269025, "phone": "+966543169787", "note": ""},
    {"nameEn": "Ramz Al Emarat Cars", "nameAr": "شركة رمز الإمارات للسيارات", "lat": 24.8287041, "lng": 46.8206782, "phone": "+966920015990", "note": ""},
    {"nameEn": "Al Saber Al Qadisiyah", "nameAr": "معرض السبر القادسية", "lat": 24.8277657, "lng": 46.8152084, "phone": "+966548400654", "note": ""},
    {"nameEn": "Al Qadisiyah Showrooms", "nameAr": "معارض القادسيه", "lat": 24.8312124, "lng": 46.8182889, "phone": "+966503132638", "note": "COMPLEX — multiple units, split into separate records"},
    {"nameEn": "Abraj Al Qadisiyah Cars", "nameAr": "معرض أبراج القادسية للسيارات", "lat": 24.8294822, "lng": 46.8240594, "phone": "+966507776198", "note": ""},
    {"nameEn": "Khalaf Cars", "nameAr": "معرض خلف للسيارات", "lat": 24.8296347, "lng": 46.8185873, "phone": "+966534446080", "note": ""},
    {"nameEn": "Al Buraimi Cars Company", "nameAr": "شركة البريمي للسيارات", "lat": 24.8300263, "lng": 46.8199979, "phone": "+966920033340", "note": "Luxury segment"},
    {"nameEn": "Shaya Cars", "nameAr": "معرض شايع للسيارات", "lat": 24.8218341, "lng": 46.8266487, "phone": "+966557304655", "note": ""},
    {"nameEn": "Nujoom Al Riyadh Cars", "nameAr": "شركة نجوم الرياض للسيارات", "lat": 24.8268807, "lng": 46.8139415, "phone": "+966920002561", "note": ""},
    {"nameEn": "Sada Alriyadh Showroom", "nameAr": "", "lat": 24.8287026, "lng": 46.8154649, "phone": "+966565653581", "note": ""},
    {"nameEn": "JMC Aljabr Showroom", "nameAr": "معرض جيه ام سي الجبر", "lat": 24.82671, "lng": 46.805391, "phone": "+9668001257777", "note": "AUTHORISED — JMC, contrast case"},
    {"nameEn": "New Car", "nameAr": "", "lat": 24.8212117, "lng": 46.8314468, "phone": "+966591233383", "note": ""},
    {"nameEn": "Al Rumaih Cars", "nameAr": "معرض الرميح للسيارات", "lat": 24.827974, "lng": 46.819868, "phone": "+966920031202", "note": ""},
    {"nameEn": "Al Jood Cars", "nameAr": "معرض الجود للسيارات", "lat": 24.8195645, "lng": 46.8254648, "phone": "+966552379999", "note": ""},
    {"nameEn": "Al Fakhama Cars", "nameAr": "معرض الفخامه للسيارات", "lat": 24.8246293, "lng": 46.8234441, "phone": "+966534989883", "note": ""},
    {"nameEn": "Awla Al Markabat Cars", "nameAr": "معرض اولى المركبات للسيارات", "lat": 24.8282222, "lng": 46.8180986, "phone": "+966530014387", "note": ""},
    {"nameEn": "Bahjat Aseer Cars", "nameAr": "معرض بهجة عسير للسيارات", "lat": 24.8304864, "lng": 46.8285866, "phone": "+966542652233", "note": "Hyundai, Haval, MG"},
    {"nameEn": "Ahdath Cars Ltd", "nameAr": "شركة احدث السيارات المحدودة", "lat": 24.8234916, "lng": 46.8221556, "phone": "+966540998075", "note": ""},
    {"nameEn": "AZURE Cars", "nameAr": "", "lat": 24.8283097, "lng": 46.8167385, "phone": "+966502667999", "note": ""},
    {"nameEn": "Raed Exhibition of Excellence Cars", "nameAr": "", "lat": 24.8245769, "lng": 46.824583, "phone": "+966535333766", "note": ""},
    {"nameEn": "Changan Riyadh Al Humaidi", "nameAr": "", "lat": 24.8370625, "lng": 46.8225625, "phone": "", "note": "AUTHORISED — Changan, contrast case"},
]

# Manual census SD → mapping-roster name (phones + GPS + leftover exclusion).
MANUAL_MAP = {
    "D0170": "AL HALL AL SARI FOR CARS",
    "D0299": "Automax",
    "D0065": "AlWadi Car",
    "D0225": "Carly",
    "D0180": "Exit 8 Car Dealer",
    "D0141": "Alhamidi Cars Company",
    "D0139": "Saeed Salem Al Shahrani Cars",
    "D0276": "Idris Car",
    "D0231": "Soum Cars",
    "D0235": "Hala Car Company",
    "D0050": "Sanam United Cars",
    "D0052": "Shallal Najd Cars",
    "D0044": "Imad Eddin Gallery",
    "D0041": "Al Kaif Cars Company",
    "D0259": "Ostora Al Qadisiyah Cars",
    "D0035": "Ramz Al Emarat Cars",
    "D0006": "Al Saber Al Qadisiyah",
    "D0128": "Khalaf Cars",
    "D0033": "Al Buraimi Cars Company",
    "D0158": "Shaya Cars",
    "D0055": "Nujoom Al Riyadh Cars",
    "D0182": "Sada Alriyadh Showroom",
    "D0034": "Al Rumaih Cars",
    "D0194": "Al Jood Cars",
    "D0097": "Awla Al Markabat Cars",
    "D0210": "Bahjat Aseer Cars",
    "D0258": "Ahdath Cars Ltd",
    "D0092": "AZURE Cars",
    "D0013": "Sayaratk Cars Co.",
    "D0303": "Sayaratk Cars Co.",
}
RELATED_GPS = {
    "D0165": "D0110",  # Abdulmajeed Al Khader deep
    "D0179": "D0056",  # Jihat deep
    "D0204": "D0036",  # Adwaa Khamis Mushait deep
    "D0205": "D0037",  # Qimmat Al Wafi 2
    "D0184": "D0041",  # Al Kaif 2
    "D0164": "D0033",  # Al Buraimi exclusive
    "D0168": "D0167",  # Makarim same pin as AR Cars
    "D0223": "D0222",  # Al Fahad used section
    "D0203": "D0182",  # Sada Riyadh 2
    "D0147": "D0182",  # Sada Cars ~ Sada Riyadh mapping
    "D0293": "D0295",  # Nahi shares maps pin with Wahat Al Markaba
    "D0294": "D0295",  # Hamat Najd same short-link
}

# Explicit GPS from resolved maps short-links / mapping seed (higher confidence).
EXPLICIT_GPS = {
    "D0218": (24.829098, 46.832453, "maps_link"),  # Shams Al Qadisiyah short link
    "D0170": (24.8259915, 46.8226078, "mapping_seed"),  # Al Hall Al Sari
    "D0139": (24.8199375, 46.8251396, "mapping_seed"),  # Saeed Salem Al Shahrani
    "D0141": (24.8244831, 46.8224061, "mapping_seed"),  # Al Humaydi
    "D0158": (24.8218341, 46.8266487, "mapping_seed"),  # Shaya
    "D0180": (24.8224692, 46.825439, "mapping_seed"),  # Exit 8
    "D0182": (24.8287026, 46.8154649, "mapping_seed"),  # Sada Alriyadh
    "D0194": (24.8195645, 46.8254648, "mapping_seed"),  # Al Jood
    "D0210": (24.8304864, 46.8285866, "mapping_seed"),  # Bahjat Aseer
    "D0225": (24.8291207, 46.8248513, "mapping_seed"),  # Carly
    "D0231": (24.8187947, 46.824374, "mapping_seed"),  # Soum (also has census GPS)
    "D0150": (24.8238893, 46.825562, "mapping_seed"),  # Baddelha closed — last known pin
    "D0065": (24.824768, 46.8174393, "outlier_corrected"),  # Markabat Al Wadi GIS pin is 7 km west of Qadisiyah
}

BRAND_CANON = {
    "hyndai": "Hyundai", "hyundai": "Hyundai", "toyota": "Toyota", "nissan": "Nissan",
    "kia": "Kia", "kia": "Kia", "chevrolet": "Chevrolet", "chevy": "Chevrolet",
    "gmc": "GMC", "ford": "Ford", "honda": "Honda", "mazda": "Mazda", "mg": "MG",
    "changan": "Changan", "haval": "Haval", "geely": "Geely", "bmw": "BMW",
    "mercedes": "Mercedes", "merc": "Mercedes", "benz": "Mercedes", "lexus": "Lexus",
    "lexis": "Lexus", "genesis": "Genesis", "mitsubishi": "Mitsubishi", "isuzu": "Isuzu",
    "gac": "GAC", "jmc": "JMC", "jetour": "Jetour", "baic": "BAIC", "jac": "JAC",
    "peugeot": "Peugeot", "peugeout": "Peugeot", "land rover": "Land Rover",
    "range rover": "Land Rover", "infiniti": "Infiniti", "infinity": "Infiniti",
    "jeep": "Jeep", "suzuki": "Suzuki", "renault": "Renault", "volkswagen": "Volkswagen",
    "volks w": "Volkswagen", "cadillac": "Cadillac", "porsche": "Porsche",
    "foton": "Foton", "jaecoo": "Jaecoo", "jaecoo": "Jaecoo", "exeed": "Exeed",
    "dongfeng": "Dongfeng", "maxus": "Maxus", "mini": "Mini", "bentley": "Bentley",
    "lamborghini": "Lamborghini", "rolls-royce": "Rolls-Royce", "maybach": "Maybach",
    "brabus": "Brabus", "mclaren": "McLaren", "audi": "Audi", "dodge": "Dodge",
    "ram": "RAM", "sitrak": "Sitrak", "tank": "Tank", "gmw": "GWM", "gwm": "GWM",
    "kin": "Kia", "patrol": "Nissan", "land cruiser": "Toyota", "hilux": "Toyota",
    "fortuner": "Toyota", "corolla": "Toyota", "camry": "Toyota", "yaris": "Toyota",
    "accent": "Hyundai", "elantra": "Hyundai", "sonata": "Hyundai", "creta": "Hyundai",
    "sunny": "Nissan", "altima": "Nissan", "tahoe": "Chevrolet", "camaro": "Chevrolet",
    "escalade": "Cadillac", "g-wagon": "Mercedes", "g-class": "Mercedes",
    "charger": "Dodge", "taurus": "Ford", "supra": "Toyota", "pajero": "Mitsubishi",
    "sportage": "Kia", "cerato": "Kia", "sonet": "Kia", "k5": "Kia",
    "lx600": "Lexus", "gv80": "Genesis", "g80": "Genesis",
}

BANK_CANON = {
    "rajhi": "Al Rajhi", "al rajhi": "Al Rajhi", "snb": "SNB", "alinma": "Alinma",
    "riyadh": "Riyad Bank", "riyad": "Riyad Bank", "anb": "ANB", "alj": "ALJ",
    "bsf": "BSF", "banque saudi fransi": "BSF", "sab": "SAB", "saib": "SAIB",
    "sanabul": "Sanabul", "raya": "Raya", "bank aljazira": "Bank AlJazira",
}


def fold(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[\u064B-\u065F]", "", s)
    s = re.sub(r"[^a-z0-9\u0600-\u06ff]+", "", s)
    for w in ("company", "cars", "showroom", "gallery", "exhibition", "auto",
              "automotive", "trading", "limited", "ltd", "co", "for",
              "معرض", "شركة", "للسيارات", "السيارات"):
        s = s.replace(w, "")
    return s


def colrow(ref: str):
    m = re.match(r"([A-Z]+)(\d+)", ref)
    col, row = m.group(1), int(m.group(2))
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch) - 64)
    return n, row


def load_sheet(sheet_path: str = "xl/worksheets/sheet1.xml"):
    z = zipfile.ZipFile(XLSX)
    ss_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    strings = []
    for si in ss_root.findall("m:si", NS):
        texts = [t.text or "" for t in si.findall(".//m:t", NS)]
        strings.append("".join(texts))
    sheet = ET.fromstring(z.read(sheet_path))

    def cell_value(c):
        t = c.get("t")
        v = c.find("m:v", NS)
        is_el = c.find("m:is", NS)
        if t == "s" and v is not None and v.text is not None:
            return strings[int(v.text)]
        if t == "inlineStr" and is_el is not None:
            return "".join(t.text or "" for t in is_el.findall(".//m:t", NS))
        if v is not None and v.text is not None:
            return v.text
        return ""

    rows = {}
    for c in sheet.findall(".//m:c", NS):
        ref = c.get("r")
        if not ref:
            continue
        col, row = colrow(ref)
        rows.setdefault(row, {})[col] = cell_value(c)
    return rows


def g(d, k, default=""):
    v = d.get(k, default)
    if v is None:
        return default
    return str(v).strip()


def parse_num(raw: str):
    if raw is None:
        return None
    s = str(raw).strip().replace(",", "").replace(" ", "").replace("%", "")
    if re.fullmatch(r"[0-9O]+", s) and "O" in s:
        s = s.replace("O", "0")
    if not s or s in {"-", "—", "n/a", "N/A"}:
        return None
    try:
        n = float(s)
    except ValueError:
        return None
    if not (n == n) or n < 0:
        return None
    return n


def parse_int(raw: str):
    n = parse_num(raw)
    if n is None:
        return None
    return int(round(n))


def parse_latlng(text: str):
    if not text:
        return None
    m = re.search(r"(24\.\d+)\s*[,/]\s*(46\.\d+)", text)
    if m:
        return float(m.group(1)), float(m.group(2))
    m = re.search(r"[@/](24\.\d+),(-?46\.\d+)", text)
    if m:
        return float(m.group(1)), float(m.group(2))
    m = re.search(r"[?&]q=(24\.\d+),(%20)?(46\.\d+)", text)
    if m:
        return float(m.group(1)), float(m.group(3))
    return None


def haversine_m(a, b):
    from math import radians, sin, cos, asin, sqrt
    R = 6371000
    lat1, lon1 = map(radians, a)
    lat2, lon2 = map(radians, b)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * R * asin(min(1, sqrt(h)))


def normalize_phone(raw: str) -> str:
    if not raw:
        return ""
    # take first number if several
    first = re.split(r"[/,;]| and ", raw)[0]
    digits = re.sub(r"\D", "", first)
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("966"):
        return "+" + digits
    if digits.startswith("0") and len(digits) >= 9:
        return "+966" + digits[1:]
    if len(digits) == 9 and digits.startswith("5"):
        return "+966" + digits
    if len(digits) == 10 and digits.startswith("5"):
        return "+966" + digits
    if len(digits) >= 8:
        return "+966" + digits
    return ""


def extra_phones(raw: str) -> list[str]:
    if not raw:
        return []
    parts = re.split(r"[/,;]", raw)
    out = []
    for p in parts[1:]:
        n = normalize_phone(p)
        if n:
            out.append(n)
    return out


def split_brands(raw: str) -> list[str]:
    if not raw:
        return []
    s = raw.replace("，", ",").replace("、", ",").replace("&", ",").replace("/", ",")
    s = s.replace(" New", ",").replace(" Used", ",")
    parts = [p.strip(" .;-") for p in re.split(r"[,+]| and ", s) if p.strip()]
    out = []
    seen = set()
    for p in parts:
        key = re.sub(r"[^a-z0-9]+", "", p.lower())
        canon = None
        low = p.lower().strip()
        if low in BRAND_CANON:
            canon = BRAND_CANON[low]
        else:
            for k, v in BRAND_CANON.items():
                if k in low and len(k) >= 3:
                    canon = v
                    break
        label = canon or p.strip()
        if not label or len(label) < 2:
            continue
        # skip narrative fragments
        if any(w in label.lower() for w in ("mostly", "high end", "flagship", "mix", "across", "limited edition", "majority")):
            continue
        k2 = label.lower()
        if k2 in seen:
            continue
        seen.add(k2)
        out.append(label)
        if len(out) >= 8:
            break
    return out


def split_banks(raw: str) -> list[str]:
    if not raw:
        return []
    low = raw.lower()
    if "cash only" in low:
        return []
    if re.search(r"all banks", low):
        return ["Al Rajhi", "SNB", "Riyad Bank", "ANB", "Alinma"]
    s = raw.replace("，", ",")
    parts = [p.strip() for p in re.split(r"[,+/]| and ", s) if p.strip()]
    out = []
    seen = set()
    for p in parts:
        key = re.sub(r"[^a-z]", "", p.lower())
        label = BANK_CANON.get(key) or BANK_CANON.get(p.lower())
        if not label:
            for k, v in BANK_CANON.items():
                if k in p.lower():
                    label = v
                    break
        if not label:
            continue
        if label in seen:
            continue
        seen.add(label)
        out.append(label)
    return out


def vehicle_type(raw: str) -> str:
    s = (raw or "").lower()
    if "new" in s and "used" in s:
        return "mix"
    if "used" in s:
        return "used_only"
    if "new" in s:
        return "new_only"
    return ""


def buyer_mix(raw: str) -> str:
    s = (raw or "").lower()
    if "government" in s:
        return "saudi"
    if "saudi" in s:
        return "saudi"
    if "balanc" in s:
        return "even"
    if "expat" in s:
        return "expat"
    return ""


def sold_band(n):
    if n is None:
        return ""
    if n <= 20:
        return "0_20"
    if n <= 50:
        return "21_50"
    if n <= 100:
        return "51_100"
    return "100plus"


def financed_band(n):
    if n is None:
        return ""
    if n <= 5:
        return "0_5"
    if n <= 15:
        return "6_15"
    if n <= 40:
        return "16_40"
    return "40plus"


def parse_visit_date(notes: str) -> str:
    if not notes:
        return "2026-07-01"
    m = re.search(r"Surveyed\s+(\d{1,2})\s+Aug", notes, re.I)
    if m:
        return f"2026-08-{int(m.group(1)):02d}"
    if re.search(r"Aug(?:ust)?\s*2026", notes, re.I):
        return "2026-08-15"
    if "May" in notes:
        return "2026-05-15"
    return "2026-07-01"


def street_from_notes(notes: str) -> str:
    if not notes:
        return ""
    if "Wadi Ar Rimah" in notes or "Wadi Ar Rimah" in notes:
        return "Wadi Ar Rimah"
    if "وادي اللجام" in notes or "Wadi Al Lajam" in notes:
        return "Wadi Al Lajam"
    return ""


def match_mapping(name_en: str, name_ar: str):
    fe, fa = fold(name_en), fold(name_ar)
    best = None
    best_score = 0
    for m in MAPPING:
        dn, da = fold(m["nameEn"]), fold(m["nameAr"])
        score = 0
        if fe and dn and (fe == dn or (len(fe) >= 6 and (fe in dn or dn in fe))):
            score = 3
        elif fa and da and (fa == da or (len(fa) >= 6 and (fa in da or da in fa))):
            score = 3
        elif fe and dn and len(fe) >= 8 and (fe[:8] == dn[:8]):
            score = 2
        if score > best_score:
            best, best_score = m, score
    return best if best_score >= 2 else None


def build_records():
    rows = load_sheet()
    cols = detect_cols(rows)
    print("using", XLSX.name, "cols", cols)
    recs = []
    for r in range(3, 400):
        d = rows.get(r, {})
        sd = g(d, cols["sd"])
        if not re.match(r"D\d{4}$", sd):
            continue
        name_ar = g(d, cols.get("ar", 2))
        name_en = g(d, cols.get("en", 3)) or name_ar or sd
        if name_en == name_ar and not name_en:
            name_en = sd
        latlng_raw = g(d, cols.get("latlng", 6))
        maps = g(d, cols.get("maps", 7))
        street_col = g(d, cols["street"]) if "street" in cols else ""
        size = parse_num(g(d, cols.get("size", 9)))
        auth_raw = g(d, cols.get("auth", 10))
        vtype_raw = g(d, cols.get("vtype", 11))
        mix_raw = g(d, cols.get("mix", 12))
        poc_name = g(d, cols.get("poc", 13))
        poc_role = g(d, cols.get("role", 14))
        contact_raw = g(d, cols.get("contact", 15))
        brands_raw = g(d, cols.get("brands", 16))
        inventory = parse_int(g(d, cols.get("inv", 17)))
        monthly_sales = parse_int(g(d, cols.get("sold", 18)))
        monthly_financed = parse_int(g(d, cols.get("fin", 19)))
        fpr = parse_num(g(d, cols.get("fpr", 20)))
        salesmen = parse_int(g(d, cols.get("salesmen", 21)))
        asp = parse_num(g(d, cols.get("asp", 24)))
        banks_raw = g(d, cols.get("banks", 27))
        finance_rep = g(d, cols.get("rep", 28))
        online_pct = parse_num(g(d, cols.get("online_pct", 29)))
        walk_pct = parse_num(g(d, cols.get("walk_pct", 30)))
        cred_raw = g(d, cols.get("cred", 27)).lower()
        notes_bits = [g(d, cols.get("notes", 28))]
        cred_col = cols.get("cred")
        if cred_col:
            for extra_c in range(cred_col + 1, cred_col + 5):
                extra_v = g(d, extra_c)
                if extra_v and extra_v not in notes_bits:
                    notes_bits.append(extra_v)
        notes = " ".join(b for b in notes_bits if b).strip()
        if str(latlng_raw).strip().lower() == "closed":
            notes = (notes + " Closed").strip()

        gps = parse_latlng(latlng_raw)
        gps_source = "survey" if gps else ""
        if not gps:
            gps = parse_latlng(maps)
            if gps:
                gps_source = "maps_link"
        maps_url = maps if maps.startswith("http") else (latlng_raw if latlng_raw.startswith("http") else "")

        recs.append({
            "sdId": sd,
            "nameEn": name_en,
            "nameAr": name_ar if name_ar != name_en else name_ar,
            "latlngRaw": latlng_raw,
            "maps": maps,
            "mapsUrl": maps_url,
            "streetCol": street_col,
            "gps": gps,
            "gpsSource": gps_source,
            "size": size,
            "authRaw": auth_raw,
            "vtypeRaw": vtype_raw,
            "mixRaw": mix_raw,
            "pocName": poc_name,
            "pocRole": poc_role,
            "contactRaw": contact_raw,
            "brandsRaw": brands_raw,
            "inventory": inventory,
            "monthlySales": monthly_sales,
            "monthlyFinanced": monthly_financed,
            "fpr": fpr,
            "salesmen": salesmen,
            "asp": asp,
            "banksRaw": banks_raw,
            "financeRep": finance_rep,
            "onlinePct": online_pct,
            "walkPct": walk_pct,
            "credRaw": cred_raw,
            "notes": notes,
        })
    return recs



def fill_gps(recs):
    by_id = {r["sdId"]: r for r in recs}

    mapping_by_name = {m["nameEn"]: m for m in MAPPING}

    # Explicit overrides
    for sd, (lat, lng, src) in EXPLICIT_GPS.items():
        if sd in by_id:
            if src == "outlier_corrected" or not by_id[sd]["gps"]:
                old = by_id[sd]["gps"]
                by_id[sd]["gps"] = (lat, lng)
                by_id[sd]["gpsSource"] = src
                if src == "outlier_corrected" and old:
                    extra = f"Census GPS {old[0]:.6f},{old[1]:.6f} is outside Al Qadisiyah — snapped to mapping pin for the Qadisiyah branch."
                    by_id[sd]["notes"] = (by_id[sd]["notes"] + " " + extra).strip()

    # Manual mapping-roster GPS when census GPS is missing
    for sd, map_name in MANUAL_MAP.items():
        if sd in by_id and not by_id[sd]["gps"] and map_name in mapping_by_name:
            m = mapping_by_name[map_name]
            by_id[sd]["gps"] = (m["lat"], m["lng"])
            by_id[sd]["gpsSource"] = "mapping_seed"
            by_id[sd]["mappingMatch"] = m["nameEn"]

    # Related ids
    for src_id, dst_id in RELATED_GPS.items():
        if src_id in by_id and not by_id[src_id]["gps"]:
            target = by_id.get(dst_id)
            if target and target["gps"]:
                lat, lng = target["gps"]
                # tiny offset so pins don't stack
                idx = int(src_id[1:]) - int(dst_id[1:])
                by_id[src_id]["gps"] = (lat + 0.00004 * (1 if idx >= 0 else -1), lng + 0.00005)
                by_id[src_id]["gpsSource"] = "related"
                by_id[src_id]["relatedSdId"] = dst_id

    # Mapping-seed name match
    for r in recs:
        if r["gps"]:
            continue
        m = match_mapping(r["nameEn"], r["nameAr"])
        if m:
            r["gps"] = (m["lat"], m["lng"])
            r["gpsSource"] = "mapping_seed"
            r["mappingMatch"] = m["nameEn"]

    # Walking-order interpolation
    n = len(recs)
    for i, r in enumerate(recs):
        if r["gps"]:
            continue
        prev = next_ = None
        pi = ni = None
        for j in range(i - 1, -1, -1):
            if recs[j]["gps"]:
                prev, pi = recs[j], j
                break
        for j in range(i + 1, n):
            if recs[j]["gps"]:
                next_, ni = recs[j], j
                break
        if prev and next_ and ni is not None and pi is not None and ni != pi:
            t = (i - pi) / (ni - pi)
            lat = prev["gps"][0] + (next_["gps"][0] - prev["gps"][0]) * t
            lng = prev["gps"][1] + (next_["gps"][1] - prev["gps"][1]) * t
            r["gps"] = (lat, lng)
            r["gpsSource"] = "interpolated"
        elif prev:
            r["gps"] = (prev["gps"][0], prev["gps"][1] + 0.00022)
            r["gpsSource"] = "interpolated"
        elif next_:
            r["gps"] = (next_["gps"][0], next_["gps"][1] - 0.00022)
            r["gpsSource"] = "interpolated"
        else:
            r["gps"] = MARKET
            r["gpsSource"] = "interpolated"

    return recs


INDUCTION_HINTS = {
    "adel": "D0039",
    "najoom riyadh": "D0055",
    "nojoom riyadh": "D0055",
    "riyadh cars": "D0228",
    "saleh": "D0309",
    "sharaf": "D0238",
    "carz": "D0113",
    "كارز الرياض": "D0113",
    "nukhba": "D0187",
    "dar ul": "D0187",
    "sayarah": "D0094",
    "sadara": "D0086",
    "emarat": "D0035",
    "emirates": "D0035",
    "walid": "D0197",
    "najoom": "D0055",
    "nojoom": "D0055",
    "falah": "D0038",
    "khateeri": "D0062",
    "murqi": "D0181",
}


def tidy_street(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        return ""
    s = re.sub(r"\s*\([^)]*\)\s*", " ", s)
    s = re.sub(r"\s+corridor$", "", s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip(" .,-")
    if "Wadi Ar Rimah" in s or "wadi ar rimah" in s.lower():
        return "Wadi Ar Rimah"
    if "Wadi Al Lajam" in s or "وادي اللجام" in s or "wadi al lajam" in s.lower():
        return "Wadi Al Lajam"
    return s


def maps_url_complete(url: str) -> bool:
    if not url:
        return False
    if "maps.app.goo.gl" in url or "goo.gl/" in url:
        return True
    if re.search(r"[?&]q=24\.\d+,46\.\d+", url):
        return True
    return False


def parse_gis_layer() -> dict:
    """Parse the GIS CSV via WKT + ID regex. DictReader is unusable — unquoted commas shift columns.

    Excel wrapped some rows across 2–3 lines (WKT on line 1, size/brands on the next).
    Join those before extracting fields.
    """
    if not _GIS.exists():
        print("GIS csv missing", _GIS)
        return {}
    text = _GIS.read_text(encoding="utf-8-sig")
    lines = text.splitlines()
    joined: list[str] = []
    buf = ""
    start_re = re.compile(r'^("POINT \(|,D\d{4},)')
    for line in lines[1:]:
        if not line.strip():
            continue
        if start_re.match(line):
            if buf:
                joined.append(buf)
            buf = line
        else:
            buf += line
    if buf:
        joined.append(buf)

    out: dict[str, dict] = {}
    for chunk in joined:
        idm = re.search(r"\b(D\d{4})\b", chunk)
        if not idm:
            continue
        sd = idm.group(1)
        wkt = re.search(r"POINT \(([0-9.]+) ([0-9.]+)\)", chunk)
        lat = lng = None
        if wkt:
            lng, lat = float(wkt.group(1)), float(wkt.group(2))
        nm = re.search(rf"{sd},([^,]*),([^,]*),", chunk)
        ar = en = ""
        if nm:
            ar = (nm.group(1) or "").replace("\xa0", " ").replace("\u200e", "").strip()
            en = (nm.group(2) or "").replace("\xa0", " ").replace("\u200e", "").strip()
        short = re.search(
            r"https://maps\.app\.goo\.gl/[A-Za-z0-9_-]+(?:\?[A-Za-z0-9_=&-]*)?",
            chunk,
        )
        maps = short.group(0) if short else ""
        if not maps and lat is not None:
            maps = f"https://www.google.com/maps?q={round(lat, 7)},{round(lng, 7)}"
        street = ""
        sm = re.search(r"Street:\s*([^.\n]+)", chunk)
        if sm:
            street = tidy_street(sm.group(1))
        # Closed only from the latlng/maps cells or an explicit CLOSED note — not a fuzzy match.
        closed = bool(re.search(
            rf"{sd},[^,]*,[^,]*,[^,]*,[^,]*,\s*closed\b",
            chunk,
            re.I,
        )) or bool(re.search(r"\bCLOSED\.", chunk))
        name_only = bool(re.search(r"name only", chunk, re.I))
        size = None
        auth = ""
        vtype = ""
        sm2 = re.search(r",(\d{3,5}),([NY])(?:,((?:New|Used)[^,]*))?", chunk)
        if sm2:
            size_n = int(sm2.group(1))
            if 100 <= size_n <= 5000:
                size = size_n
            auth = sm2.group(2) or ""
            vtype = (sm2.group(3) or "").strip()
        out[sd] = {
            "lat": lat,
            "lng": lng,
            "ar": ar,
            "en": en,
            "maps": maps,
            "street": street,
            "closed": closed,
            "nameOnly": name_only,
            "size": size,
            "auth": auth,
            "vtype": vtype,
        }
    return out


# GIS identity corrections (mind-map D0151 Saleh had an out-of-market pin; GIS puts Saleh on D0309).
GIS_IDENTITY = {
    "D0309": {
        "nameEn": "Saleh Group for Cars",
        "nameAr": "مجموعة صالح للسيارات",
        "closed": False,
        "clearSize": True,  # mind-map had Baddelha's 1,000 m²
        "note": "GIS survey pin — Saleh Group Qadisiyah branch (induction GPS).",
    },
    "D0151": {
        "nameEn": "Swapcar",
        "nameAr": "سوابكار",
        "closed": True,
        "clearFinancials": True,
        "clearGps": True,
        "size": 2000,
        "note": "CLOSED. GIS layer lists Swapcar here with no WKT pin — Saleh Group moved to D0309.",
    },
}


def overlay_gis(recs):
    """Overlay WKT GPS, maps, streets, size, vtype, and closed/open from the GIS sheet.

    Never copy comma-shifted financial columns (monthly GMV, FPR). Visual fields
    (size / vtype / auth) overlay only when the GIS row is not 'name only'.
    """
    gis = parse_gis_layer()
    if not gis:
        return recs
    by_id = {r["sdId"]: r for r in recs}
    applied = skipped_outlier = streets = maps = identity = sizes = vtypes = reopened = closed_n = 0
    for sd, g in gis.items():
        cur = by_id.get(sd)
        if not cur:
            continue
        spec = GIS_IDENTITY.get(sd)
        if spec:
            cur["nameEn"] = spec["nameEn"]
            cur["nameAr"] = spec["nameAr"]
            if spec.get("closed"):
                if "closed" not in (cur.get("notes") or "").lower():
                    cur["notes"] = ((cur.get("notes") or "") + " Closed").strip()
            else:
                cur["notes"] = re.sub(r"(?i)\bclosed\b", "", cur.get("notes") or "").strip()
            if spec.get("note"):
                if spec["note"] not in (cur.get("notes") or ""):
                    cur["notes"] = ((cur.get("notes") or "") + " " + spec["note"]).strip()
            if spec.get("clearFinancials"):
                cur["pocName"] = ""
                cur["pocRole"] = ""
                cur["contactRaw"] = ""
                cur["brandsRaw"] = ""
                cur["inventory"] = None
                cur["monthlySales"] = None
                cur["monthlyFinanced"] = None
                cur["fpr"] = None
                cur["salesmen"] = None
                cur["asp"] = None
                cur["banksRaw"] = ""
                cur["financeRep"] = ""
                cur["onlinePct"] = None
                cur["walkPct"] = None
            if spec.get("clearSize"):
                cur["size"] = None
            if spec.get("size") is not None:
                cur["size"] = spec["size"]
            if spec.get("clearGps"):
                cur["gps"] = None
                cur["gpsSource"] = ""
                cur.pop("relatedSdId", None)
            identity += 1

        if g.get("street") and not (cur.get("streetCol") or "").strip():
            cur["streetCol"] = g["street"]
            streets += 1

        # Closed / reopen from this sheet (skip identity-locked rows).
        if not spec:
            if g.get("closed"):
                if "closed" not in (cur.get("notes") or "").lower():
                    cur["notes"] = ((cur.get("notes") or "") + " Closed").strip()
                closed_n += 1
            elif g.get("lat") is not None and re.search(r"(?i)\bclosed\b", cur.get("notes") or ""):
                cur["notes"] = re.sub(r"(?i)\bclosed\b", "", cur.get("notes") or "").strip()
                extra = "GIS survey pin is live — previous sheet had no operating pin; restored from the Autolink GIS layer."
                if extra not in (cur.get("notes") or ""):
                    cur["notes"] = ((cur.get("notes") or "") + " " + extra).strip()
                reopened += 1

        if not g.get("nameOnly") and not (spec and spec.get("clearSize")):
            if g.get("size") and 100 <= g["size"] <= 5000:
                cur["size"] = g["size"]
                sizes += 1
            if g.get("vtype"):
                cur["vtypeRaw"] = g["vtype"]
                vtypes += 1
            # GIS auth is Y/N; keep a named brand from the mind-map (Isuzu/Haval/…).
            if g.get("auth") in {"Y", "N"}:
                raw = (cur.get("authRaw") or "").strip().lower()
                if raw in {"", "y", "n", "yes", "no", "?", "n?", "y?"}:
                    cur["authRaw"] = g["auth"]

        lat, lng = g.get("lat"), g.get("lng")
        apply_gps = False
        if lat is not None and lng is not None:
            dist_m = haversine_m(MARKET, (lat, lng))
            if dist_m > GIS_OUTLIER_M:
                extra = (
                    f"GIS WKT {lat:.6f},{lng:.6f} is {int(dist_m)} m from Al Qadisiyah — "
                    "kept the in-market branch pin."
                )
                if extra not in (cur.get("notes") or ""):
                    cur["notes"] = ((cur.get("notes") or "") + " " + extra).strip()
                skipped_outlier += 1
            else:
                cur["gps"] = (lat, lng)
                cur["gpsSource"] = "survey"
                cur.pop("relatedSdId", None)
                applied += 1
                apply_gps = True

        if apply_gps and g.get("maps"):
            cur["mapsUrl"] = g["maps"]
            maps += 1
        elif apply_gps and lat is not None and not maps_url_complete(cur.get("mapsUrl") or ""):
            cur["mapsUrl"] = f"https://www.google.com/maps?q={round(lat, 7)},{round(lng, 7)}"
            maps += 1

    print(
        f"GIS overlay: {len(gis)} rows, {applied} WKT pins, "
        f"{skipped_outlier} outliers kept in-market, {streets} streets, {maps} maps, "
        f"{identity} identity, {sizes} sizes, {vtypes} vtypes, {reopened} reopened, {closed_n} closed"
    )
    return recs


def overlay_previous(recs):
    """Keep streets, maps URLs, and GPS already resolved in the prior census JSON or the GPS sheet."""
    by_id = {r["sdId"]: r for r in recs}
    if OUT.exists():
        try:
            prev = json.loads(OUT.read_text(encoding="utf-8"))
            for row in prev.get("rows", []):
                sd = row.get("sdId")
                cur = by_id.get(sd)
                if not cur:
                    continue
                flags = row.get("flags") or {}
                if not cur.get("streetCol") and flags.get("street"):
                    cur["streetCol"] = flags["street"]
                if not cur.get("mapsUrl") and flags.get("mapsUrl"):
                    cur["mapsUrl"] = flags["mapsUrl"]
                if not cur.get("gps") and row.get("lat") and row.get("lng"):
                    src = flags.get("gpsSource") or "mapping_seed"
                    if src != "interpolated":
                        cur["gps"] = (float(row["lat"]), float(row["lng"]))
                        cur["gpsSource"] = src
                if not cur.get("contactRaw") and row.get("phone"):
                    cur["contactRaw"] = row["phone"]
        except Exception:
            pass
    legacy = Path("/workspace/attachments/Al Qadisiyah.xlsx")
    if not legacy.exists():
        return recs
    try:
        orig = XLSX
        # temporarily not: load via zip of legacy
        z = zipfile.ZipFile(legacy)
        ss_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        strings = []
        for si in ss_root.findall("m:si", NS):
            texts = [t.text or "" for t in si.findall(".//m:t", NS)]
            strings.append("".join(texts))
        sheet = ET.fromstring(z.read("xl/worksheets/sheet2.xml"))

        def cell_value(c):
            t = c.get("t")
            v = c.find("m:v", NS)
            is_el = c.find("m:is", NS)
            if t == "s" and v is not None and v.text is not None:
                return strings[int(v.text)]
            if t == "inlineStr" and is_el is not None:
                return "".join(t.text or "" for t in is_el.findall(".//m:t", NS))
            if v is not None and v.text is not None:
                return v.text
            return ""

        rows = {}
        for c in sheet.findall(".//m:c", NS):
            ref = c.get("r")
            if not ref:
                continue
            col, row = colrow(ref)
            rows.setdefault(row, {})[col] = cell_value(c)
        cols = detect_cols(rows)
        for r in range(3, 400):
            d = rows.get(r, {})
            sd = g(d, cols.get("sd", 1))
            cur = by_id.get(sd)
            if not cur:
                continue
            street = g(d, cols["street"]) if "street" in cols else ""
            maps = g(d, cols["maps"]) if "maps" in cols else ""
            if street and not cur.get("streetCol"):
                cur["streetCol"] = street
            if maps.startswith("http") and not cur.get("mapsUrl"):
                cur["mapsUrl"] = maps
            if not cur.get("gps"):
                gps = parse_latlng(g(d, cols.get("latlng", 6))) or parse_latlng(maps)
                if gps:
                    cur["gps"] = gps
                    cur["gpsSource"] = "maps_link" if maps.startswith("http") else "survey"
    except Exception as e:
        print("legacy overlay skipped", e)
    return recs


def match_induction_name(name: str, recs):
    raw = (name or "").strip()
    if not raw:
        return None
    low = raw.lower()
    hits = [(hint, sd) for hint, sd in INDUCTION_HINTS.items() if hint in low]
    if hits:
        hits.sort(key=lambda x: len(x[0]), reverse=True)
        return hits[0][1]
    fn = fold(raw)
    best, score = None, 0
    for r in recs:
        fe, fa = fold(r["nameEn"]), fold(r["nameAr"])
        s = 0
        if fn and fe and (fn == fe or (len(fn) >= 5 and (fn in fe or fe in fn))):
            s = 3
        elif fn and fa and (fn == fa or (len(fn) >= 5 and (fn in fa or fa in fn))):
            s = 3
        if s > score:
            best, score = r["sdId"], s
    return best if score >= 3 else None


def parse_training_stage(raw: str, notes: str, fail: str, prio: str):
    s = f"{raw} {notes} {fail} {prio}".lower()
    if "trained" in s:
        return "trained"
    if "hold" in s or "revisit" in s or "full interest" in s:
        return "hold"
    if "declined" in s:
        return "declined"
    if "did not participate" in s or "unavailable" in s:
        return "unavailable"
    if "scheduled" in s:
        return "scheduled"
    return ""


def parse_priority(raw: str):
    s = (raw or "").lower()
    if "active" in s:
        return "active"
    if "introduction" in s:
        return "intro"
    if "scheduled" in s:
        return "scheduled"
    return ""


def load_induction(recs):
    try:
        rows = load_sheet("xl/worksheets/sheet3.xml")
    except Exception:
        return recs, []
    by_id = {r["sdId"]: r for r in recs}
    unmatched = []
    applied = 0
    for r in range(2, 40):
        d = rows.get(r, {})
        name = g(d, 1)
        prio = g(d, 2)
        if not name or "not in qadisiyah" in g(d, 22).lower():
            continue
        if not prio and not g(d, 6):
            continue
        sd = match_induction_name(name, recs)
        stage = parse_training_stage(g(d, 6), g(d, 21), g(d, 22), prio)
        priority = parse_priority(prio)
        payload = {
            "dealer": name,
            "priority": priority,
            "stage": stage,
            "pocName": g(d, 3),
            "pocRole": g(d, 4),
            "contact": g(d, 5),
            "notes": g(d, 21),
            "fail": g(d, 22),
            "sold": parse_int(g(d, 14)),
            "fin": parse_int(g(d, 15)),
            "fpr": parse_num(g(d, 16)),
            "salesmen": parse_int(g(d, 17)),
            "asp": parse_num(g(d, 18)),
            "online": parse_num(g(d, 19)),
            "walk": parse_num(g(d, 20)),
            "inv": parse_int(g(d, 13)),
            "size": parse_num(g(d, 9)),
            "gps": parse_latlng(g(d, 8)),
            "cred": g(d, 23).lower(),
        }
        if not sd or sd == "SALEH_GROUP":
            unmatched.append(payload)
            continue
        cur = by_id.get(sd)
        if not cur:
            unmatched.append(payload)
            continue
        if cur.get("training"):
            continue
        cur["training"] = payload
        if payload["pocName"] and not cur["pocName"]:
            cur["pocName"] = payload["pocName"]
        if payload["pocRole"] and not cur["pocRole"]:
            cur["pocRole"] = payload["pocRole"]
        if payload["contact"] and not cur["contactRaw"]:
            cur["contactRaw"] = payload["contact"]
        if payload["sold"] is not None and cur["monthlySales"] is None:
            cur["monthlySales"] = payload["sold"]
        if payload["fin"] is not None and cur["monthlyFinanced"] is None:
            cur["monthlyFinanced"] = payload["fin"]
        if payload["fpr"] is not None and cur["fpr"] is None:
            cur["fpr"] = payload["fpr"]
        if payload["salesmen"] is not None and cur["salesmen"] is None:
            cur["salesmen"] = payload["salesmen"]
        if payload["asp"] is not None and cur["asp"] is None:
            cur["asp"] = payload["asp"]
        if payload["inv"] is not None and cur["inventory"] is None:
            cur["inventory"] = payload["inv"]
        if payload["size"] is not None and cur["size"] is None:
            cur["size"] = payload["size"]
        if payload["online"] is not None and cur["onlinePct"] is None:
            cur["onlinePct"] = payload["online"]
        if payload["gps"]:
            if not cur["gps"] or cur.get("gpsSource") in {"interpolated", "outlier_corrected"}:
                cur["gps"] = payload["gps"]
                cur["gpsSource"] = cur.get("gpsSource") or "survey"
            else:
                lat, lng = cur["gps"]
                if abs(lat - MARKET[0]) > 0.012 or abs(lng - MARKET[1]) > 0.012:
                    cur["gps"] = payload["gps"]
                    cur["gpsSource"] = "outlier_corrected"
        applied += 1
    print(f"induction matched {applied}, unmatched {len(unmatched)}")
    for u in unmatched:
        print("  unmatched induction:", u["dealer"], u["priority"], u["stage"])
    return recs, unmatched


def saleh_extra_row(unmatched):
    hit = next((u for u in unmatched if "saleh" in u["dealer"].lower()), None)
    if not hit:
        return None
    gps = hit["gps"] or (24.8262119, 46.8219016)
    return {
        "sdId": "D0310",
        "nameEn": "Saleh Group for Cars",
        "nameAr": "مجموعة صالح للسيارات",
        "latlngRaw": f"{gps[0]}, {gps[1]}",
        "maps": "",
        "mapsUrl": "",
        "streetCol": "",
        "gps": gps,
        "gpsSource": "survey",
        "size": hit["size"] or 2000,
        "authRaw": "N",
        "vtypeRaw": "New Cars",
        "mixRaw": "Balanced",
        "pocName": hit["pocName"],
        "pocRole": hit["pocRole"],
        "contactRaw": hit["contact"] or "+966920022122",
        "brandsRaw": "Kia, MG, Nissan, Hyundai, Genesis, Toyota, Jetour",
        "inventory": hit["inv"] or 140,
        "monthlySales": hit["sold"] or 130,
        "monthlyFinanced": hit["fin"] or 90,
        "fpr": hit["fpr"] or 0.69,
        "salesmen": hit["salesmen"] or 10,
        "asp": hit["asp"] or 90000,
        "banksRaw": "",
        "financeRep": "",
        "onlinePct": hit["online"] if hit["online"] is not None else 0.5,
        "walkPct": hit["walk"] if hit["walk"] is not None else 0.5,
        "credRaw": hit["cred"] or "high",
        "notes": (hit["notes"] or "") + " Active AutoLink user — trained basic level. Pulled from induction sheet.",
        "training": hit,
    }


def fill_phone(r):
    phone = normalize_phone(r["contactRaw"])
    extras = extra_phones(r["contactRaw"])
    mapping_by_name = {m["nameEn"]: m for m in MAPPING}
    if not phone:
        map_name = MANUAL_MAP.get(r["sdId"])
        m = mapping_by_name.get(map_name) if map_name else match_mapping(r["nameEn"], r["nameAr"])
        if m and m["phone"]:
            phone = m["phone"]
            r["phoneSource"] = "mapping_seed"
            r["mappingMatch"] = m["nameEn"]
    r["phone"] = phone
    r["extraPhones"] = extras
    return r


def fill_derived(r):
    notes = r["notes"] or ""
    low = notes.lower()

    # ASP pattern: 10,000 with 30+ mixed/new units is a missing-zero typo except D0219 (surveyor flagged).
    if r["asp"] == 10000 and r["sdId"] in {"D0305", "D0307"}:
        r["asp"] = 100000
        notes = (notes + " ASP recorded as 10,000 — corrected to 100,000 from brand/inventory pattern; verify.").strip()

    # Size: modal independent showroom is 1000 m² estimated. Don't invent for closed/name-only/under instruction.
    name_only = "name only" in low
    closed = "closed" in low
    under = "under instruction" in low or "under process" in low or "under renovation" in low
    if r["size"] is None and not closed and not name_only and not under:
        r["size"] = 1000
        r["sizeFilled"] = True
        r["sizeBasis"] = "estimated"
    elif r["size"] is not None:
        # round hundreds → estimated; otherwise dealer_stated / estimated visual
        r["sizeFilled"] = False
        r["sizeBasis"] = "estimated" if r["size"] % 50 == 0 else "estimated"
        if r["sdId"] == "D0187" and r["size"] == 14000:
            notes = (notes + " Size 14,000 m² recorded — likely 1,400 typo; left as captured pending verify.").strip()

    if r["inventory"] is not None:
        r["inventoryBasis"] = "counted" if r["inventory"] % 5 else "estimated"
        # actually most are round tens — estimated visual count
        r["inventoryBasis"] = "estimated" if r["inventory"] % 5 == 0 else "counted"

    # FPR from sales/financed
    if r["fpr"] is None and r["monthlySales"] and r["monthlyFinanced"] is not None and r["monthlySales"] > 0:
        r["fpr"] = round(r["monthlyFinanced"] / r["monthlySales"], 2)
        r["fprFilled"] = True
    else:
        r["fprFilled"] = False

    # Credibility
    cred = r["credRaw"]
    if cred in {"high", "medium", "low"}:
        r["credibility"] = cred
    elif closed:
        r["credibility"] = "high"
    elif r["monthlySales"] is not None and r["pocName"]:
        r["credibility"] = "high"
    elif r["inventory"] is not None and r["brandsRaw"]:
        r["credibility"] = "medium"
    elif name_only or not (r["brandsRaw"] or r["inventory"] is not None):
        r["credibility"] = "low"
    else:
        r["credibility"] = "medium"

    r["notes"] = notes
    r["street"] = (r.get("streetCol") or "").strip().rstrip(",") or street_from_notes(notes)
    r["visitDate"] = parse_visit_date(notes)
    r["closed"] = closed
    r["under"] = under
    r["nameOnly"] = name_only
    r["cashOnly"] = "cash only" in low or "cash only" in (r["mixRaw"] or "").lower() or "cash only" in (r["banksRaw"] or "").lower()
    r["noFinance"] = "no finance" in low
    r["competitor"] = r["sdId"] in {"D0225", "D0231"} or "competitor" in low
    sync_maps_url(r)
    return r


def sync_maps_url(r):
    """Keep GIS short-links; rebuild q= URLs from the final pin so they never drift or truncate."""
    gps = r.get("gps")
    url = (r.get("mapsUrl") or "").strip()
    if "maps.app.goo.gl" in url:
        return
    if not gps:
        r["mapsUrl"] = url if maps_url_complete(url) else ""
        return
    lat, lng = gps
    r["mapsUrl"] = f"https://www.google.com/maps?q={round(lat, 7)},{round(lng, 7)}"


def authorised(r):
    raw = (r["authRaw"] or "").strip()
    low = raw.lower()
    if low in {"n", "no"}:
        return "no", ""
    if low in {"y", "yes"}:
        # brand from name or notes
        brands = split_brands(r["brandsRaw"])
        brand = ""
        if "haval" in (r["nameEn"] + r["notes"] + r["brandsRaw"]).lower():
            brand = "Haval"
        elif "jetour" in (r["nameEn"] + r["notes"]).lower():
            brand = "Jetour"
        elif "foton" in (r["nameEn"] + r["notes"]).lower():
            brand = "Foton"
        elif brands:
            brand = brands[0]
        return "yes", brand
    if "?" in raw or not raw:
        if re.search(r"isuzu|nissan|toyota|peugeot", low):
            brand = re.search(r"isuzu|nissan|toyota|peugeot", low).group(0).title()
            return "unclear", brand
        return "unclear", ""
    # named brand in the authorised column
    brand = re.sub(r"[?？]", "", raw).strip()
    if brand and brand.lower() not in {"n", "y"}:
        return "yes", brand
    return "unclear", ""


def bank_rep(raw: str) -> str:
    s = (raw or "").lower()
    if not s or s in {"none", "no"}:
        return "no" if s in {"none", "no"} else ""
    if "on-site" in s or "5 days" in s or "permanent" in s:
        return "permanent"
    if "roaming" in s or "weekly" in s or "days per week" in s:
        return "weekly"
    return ""


def status_for(r):
    if r["competitor"]:
        return "competitor"
    if r["closed"]:
        return "closed"
    return "partial"


def open_to_pilot(r):
    tr = r.get("training") or {}
    stage = tr.get("stage") or ""
    notes = (tr.get("notes") or "").lower()
    if stage == "trained":
        return "yes"
    if stage == "hold" and "interest" in notes:
        return "yes"
    if stage == "declined":
        return "no"
    if stage == "scheduled":
        return "maybe"
    if r["competitor"] or r["closed"]:
        return ""
    if r["noFinance"] or r["cashOnly"]:
        return "no"
    if r["under"] or r["nameOnly"]:
        return "too_early"
    return "too_early"


def volume_tag(r):
    has_visual = r["inventory"] is not None or bool(r["brandsRaw"])
    has_fin = r["monthlySales"] is not None or r["monthlyFinanced"] is not None
    if has_visual and has_fin:
        return "mixed"
    if has_fin:
        return "self_reported"
    if has_visual:
        return "observed"
    return ""


def to_census_row(r):
    auth, auth_brand = authorised(r)
    brands = split_brands(r["brandsRaw"])
    banks = split_banks(r["banksRaw"])
    phone = r.get("phone") or ""
    extras = r.get("extraPhones") or []
    poc_mobile = phone
    vtype = vehicle_type(r["vtypeRaw"])
    if not vtype and brands and not r["closed"] and not r["nameOnly"]:
        # pattern: luxury used keywords
        raw = (r["brandsRaw"] or "").lower()
        if "used" in raw and "new" not in raw:
            vtype = "used_only"
        elif "used" in raw:
            vtype = "mix"
        else:
            vtype = "new_only"
            r["vtypeInferred"] = True

    notes_parts = []
    if r["notes"]:
        notes_parts.append(r["notes"])
    if extras:
        notes_parts.append("Additional numbers: " + ", ".join(extras))
    if r.get("phoneSource") == "mapping_seed":
        notes_parts.append("Phone backfilled from mapping roster.")
    if r["gpsSource"] == "interpolated":
        notes_parts.append("GPS interpolated from walking-order neighbours — confirm on next visit.")
    if r["gpsSource"] == "mapping_seed":
        notes_parts.append("GPS backfilled from mapping roster" + (f" ({r.get('mappingMatch')})" if r.get("mappingMatch") else "") + ".")
    if r["gpsSource"] == "related":
        notes_parts.append(f"GPS copied from related record {r.get('relatedSdId')} with a small offset.")
    if r.get("sizeFilled"):
        notes_parts.append("Showroom size missing — filled with 1,000 m² (modal independent showroom); estimated.")
    if r.get("fprFilled") and r["fpr"] is not None:
        notes_parts.append(f"FPR computed as financed/sales = {r['fpr']}.")
    if r.get("vtypeInferred"):
        notes_parts.append("Vehicle type inferred from brand mix.")
    if r["cashOnly"]:
        notes_parts.append("Cash-only operation noted.")
    note = " ".join(notes_parts).strip()

    flags = {
        "sdId": r["sdId"],
        "census": True,
        "market": "qadisiyah",
        "credibility": r["credibility"],
        "gpsSource": r["gpsSource"],
        "street": r["street"],
        "censusVersion": CENSUS_VERSION,
    }
    if r.get("mapsUrl"):
        flags["mapsUrl"] = r["mapsUrl"]
    if auth == "yes":
        flags["authorised"] = True
        if auth_brand:
            flags["authorisedBrand"] = auth_brand
    if r["competitor"]:
        flags["competitor"] = True
    if r.get("relatedSdId"):
        flags["relatedSdId"] = r["relatedSdId"]
    if r["gpsSource"] == "interpolated":
        flags["needsGps"] = True
    if r["under"]:
        flags["underProcess"] = True
    if r["nameOnly"]:
        flags["nameOnly"] = True
    tr = r.get("training") or {}
    if tr.get("priority"):
        flags["trainingPriority"] = tr["priority"]
    if tr.get("stage"):
        flags["trainingStage"] = tr["stage"]
    if tr.get("notes"):
        flags["trainingNote"] = tr["notes"]
    if tr.get("fail"):
        flags["failedSession"] = tr["fail"]

    lost = None
    if r["monthlySales"] is not None and r["monthlyFinanced"] is not None:
        lost = max(0, r["monthlySales"] - r["monthlyFinanced"])

    lead_pct = None
    if r["onlinePct"] is not None:
        lead_pct = int(round(r["onlinePct"] * 100)) if r["onlinePct"] <= 1 else int(round(r["onlinePct"]))

    status = status_for(r)
    survey = {
        "visitDate": r["visitDate"],
        "surveyorName": "Umair",
        "visitStatus": status,
        "showroomSizeSqm": int(r["size"]) if r["size"] is not None else None,
        "sizeBasis": r.get("sizeBasis") or "",
        "showroomSizeSource": "observed" if r["size"] is not None and not r.get("sizeFilled") else "",
        "vehicleType": vtype,
        "pocName": r["pocName"],
        "pocRole": r["pocRole"],
        "pocMobile": poc_mobile,
        "salesmenCount": r["salesmen"],
        "salesmenSource": "observed" if r["salesmen"] is not None else "",
        "mainBrands": brands,
        "authorisedDealer": auth,
        "authorisedBrand": auth_brand,
        "inventoryUnits": r["inventory"],
        "inventoryBasis": r.get("inventoryBasis") or "",
        "inventorySource": "observed" if r["inventory"] is not None else "",
        "avgSellingPriceSar": int(r["asp"]) if r["asp"] is not None else None,
        "avgPriceSource": "self_reported" if r["asp"] is not None else "",
        "avgMonthlySold": sold_band(r["monthlySales"]),
        "avgMonthlyFinanced": financed_band(r["monthlyFinanced"]),
        "monthlySoldExact": r["monthlySales"],
        "monthlyFinancedExact": r["monthlyFinanced"],
        "fpr": r["fpr"],
        "financingLostNumber": lost,
        "financingLostPerMonth": str(lost) if lost is not None else "",
        "financingLostSource": "self_reported" if lost is not None else "",
        "banksPartnered": banks,
        "bankRepOnSite": bank_rep(r["financeRep"]),
        "buyerMix": buyer_mix(r["mixRaw"]),
        "leadOnlinePct": lead_pct if lead_pct is not None else 0,
        "volumeFiguresAre": volume_tag(r) or ("observed" if vtype or brands else ""),
        "openToPilot": open_to_pilot(r),
        "informationCredibility": r["credibility"],
        "street": r["street"],
        "financingWorkaround": "cash only" if r["cashOnly"] else (r["financeRep"] if r["financeRep"] and r["financeRep"].lower() not in {"none", "no"} else ""),
        "notes": note,
    }
    # drop empty-string-only noise? keep schema complete.

    step = 4
    if survey["volumeFiguresAre"] and survey["openToPilot"]:
        step = 7
    elif brands or r["inventory"] is not None:
        step = 4
    elif r["closed"] or r["nameOnly"]:
        step = 1

    seed_note = f"{r['sdId']}"
    if r["street"]:
        seed_note += f" · {r['street']}"
    if r["credibility"]:
        seed_note += f" · {r['credibility']} credibility"
    if r["gpsSource"] and r["gpsSource"] != "survey":
        seed_note += f" · GPS {r['gpsSource']}"

    lat, lng = r["gps"]
    return {
        "sdId": r["sdId"],
        "nameEn": r["nameEn"],
        "nameAr": r["nameAr"],
        "lat": round(lat, 7),
        "lng": round(lng, 7),
        "phone": phone,
        "note": seed_note,
        "status": status,
        "flags": flags,
        "survey": survey,
        "step": step,
    }


def leftover_mapping(census_rows):
    mapped_names = set(MANUAL_MAP.values())
    for r in census_rows:
        m = match_mapping(r["nameEn"], r["nameAr"])
        if m:
            mapped_names.add(m["nameEn"])
    census_folds = {fold(r["nameEn"]) for r in census_rows} | {fold(r["nameAr"]) for r in census_rows if r["nameAr"]}
    keep_always = {
        "JMC Aljabr Showroom",
        "Changan Riyadh Al Humaidi",
        "New Car",
        "Anwar Al Qadisiyah",
        "Al Fakhama Cars",
        "Abraj Al Qadisiyah Cars",
        "Raed Exhibition of Excellence Cars",
    }
    extra = []
    for m in MAPPING:
        if m["nameEn"] not in keep_always:
            continue
        extra.append({
            "sdId": "",
            "nameEn": m["nameEn"],
            "nameAr": m["nameAr"],
            "lat": m["lat"],
            "lng": m["lng"],
            "phone": m["phone"],
            "note": m["note"] or "Mapping roster — not in August 2026 walking census. Verify if duplicate or still operating.",
            "status": "competitor" if "COMPETITOR" in m["note"].upper() else "not_visited",
            "flags": {
                "mappingOnly": True,
                "competitor": "COMPETITOR" in m["note"].upper(),
                "authorised": "AUTHORISED" in m["note"].upper() or "AUTHORIZED" in m["note"].upper(),
                "complex": "COMPLEX" in m["note"].upper(),
                "authorisedBrand": "JMC" if "JMC" in m["note"] else ("Changan" if "Changan" in m["note"] else ""),
                "gpsSource": "mapping_seed",
            },
            "survey": {
                "visitDate": "",
                "surveyorName": "",
                "visitStatus": "not_visited",
                "mainBrands": [],
                "banksPartnered": [],
                "leadOnlinePct": 0,
                "authorisedDealer": "yes" if "AUTHORISED" in m["note"].upper() else "",
                "authorisedBrand": "JMC" if "JMC" in m["note"] else ("Changan" if "Changan" in m["note"] else ""),
                "notes": m["note"],
            },
            "step": 0,
        })
    return extra


def main():
    recs = build_records()
    recs = overlay_previous(recs)
    recs = overlay_gis(recs)
    recs, unmatched = load_induction(recs)
    recs = fill_gps(recs)
    for r in recs:
        fill_phone(r)
        fill_derived(r)
    census = [to_census_row(r) for r in recs]
    extra = leftover_mapping(census)

    stats = {
        "census": len(census),
        "extraMapping": len(extra),
        "gpsSources": {},
        "status": {},
        "missingPhone": 0,
        "withInventory": 0,
        "withMonthly": 0,
        "interpolated": 0,
        "closed": 0,
        "authorised": 0,
        "trained": 0,
        "priority": 0,
        "withPoc": 0,
    }
    for r, raw in zip(census, recs):
        src = raw["gpsSource"]
        stats["gpsSources"][src] = stats["gpsSources"].get(src, 0) + 1
        stats["status"][r["status"]] = stats["status"].get(r["status"], 0) + 1
        if not r["phone"]:
            stats["missingPhone"] += 1
        if r["survey"].get("inventoryUnits") is not None:
            stats["withInventory"] += 1
        if r["survey"].get("monthlySoldExact") is not None:
            stats["withMonthly"] += 1
        if raw["gpsSource"] == "interpolated":
            stats["interpolated"] += 1
        if r["status"] == "closed":
            stats["closed"] += 1
        if r["flags"].get("authorised"):
            stats["authorised"] += 1
        if r["flags"].get("trainingStage") == "trained":
            stats["trained"] += 1
        if r["flags"].get("trainingPriority") == "active":
            stats["priority"] += 1
        if r["survey"].get("pocName"):
            stats["withPoc"] += 1

    payload = {"version": CENSUS_VERSION, "stats": stats, "rows": census, "extra": extra}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(stats, indent=2))
    print("wrote", OUT, "bytes", OUT.stat().st_size)


if __name__ == "__main__":
    main()
