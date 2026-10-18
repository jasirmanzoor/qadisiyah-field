python3 -I - "/tmp/claude-0/-home-user-qadisiyah-field/88dc8c01-5bd2-5aa6-b478-4bdfabedcbd9/scratchpad/portfolio/keynote.html" "/tmp/claude-0/-home-user-qadisiyah-field/88dc8c01-5bd2-5aa6-b478-4bdfabedcbd9/scratchpad/data.json" "/tmp/claude-0/-home-user-qadisiyah-field/88dc8c01-5bd2-5aa6-b478-4bdfabedcbd9/scratchpad/portfolio/index.html" <<'PY'
import sys, json
tpl, data, out = sys.argv[1:4]
s = open(tpl, encoding="utf-8").read()
s = s.replace('const sar = (n) => n == null ? "—" : n >= 1e6 ?', 'const sar = (n) => n == null ? "—" : n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ?')
d = json.load(open(data, encoding="utf-8")); d["asOf"] = "17 October 2026"
s = s.replace("/*__DATA__*/null", json.dumps(d, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"))
open(out, "w", encoding="utf-8").write(s)
PY
(echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'; cat /tmp/claude-0/-home-user-qadisiyah-field/88dc8c01-5bd2-5aa6-b478-4bdfabedcbd9/scratchpad/portfolio/index.html; echo '</body></html>') > /tmp/claude-0/-home-user-qadisiyah-field/88dc8c01-5bd2-5aa6-b478-4bdfabedcbd9/scratchpad/portfolio/preview.html
