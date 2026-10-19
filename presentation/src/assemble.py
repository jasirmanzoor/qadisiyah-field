import sys, re
S = sys.argv[1]
src = open(S + "/portfolio/template.html", encoding="utf-8").read()
kn = lambda f: open(S + "/kn/" + f, encoding="utf-8").read()

def cut(s, a, b, keep_b=True):
    i = s.index(a); j = s.index(b, i)
    return s[:i] + (s[j:] if keep_b else s[j + len(b):])
def rep(s, a, b, n=1):
    assert s.count(a) >= 1, a[:80]
    return s.replace(a, b, n)

head = src[:src.index("<style>")]
css = src[src.index("<style>") + 7:src.index("</style>")]
css = cut(css, "/* ---------- hero ---------- */", "/* ---------- section scaffolding ---------- */")
css = cut(css, "/* ---------- tour ---------- */", "/* ---------- work ---------- */")
css = rep(css, "/* Layout: Fluxora — full-bleed video hero, then ember bands; one 1180px column, glass cards only where a figure stands alone. */", "/* Layout: a self-running keynote. Thirteen full-screen chapters, one idea each; detail lives in the data room overlay. */")
css += kn("kn.css") + open(S + "/rb/GhostFibers.css").read() + open(S + "/rb/AeroShards.css").read() + open(S + "/rb/MaskedHeading.css").read()

js = src[src.index("<script>\nconst DATA"):src.rindex("</script>")]
js = cut(js, "  /* ---------- hero ghost bars", "  /* ---------- market cards with dot maps")
# deck-driven GL coordinator
i = js.index("  /* ---------- one WebGL scene renders at a time"); j = js.index("  /* ---------- 3D globe")
js = js[:i] + """  /* ---------- one WebGL scene renders at a time: the chapter on screen ---------- */
  const GL = (function () {
    const items = []; let cur = null;
    const apply = (scene) => items.forEach((it) => { const on = !!scene && scene.contains(it.el); if (on !== it.on) { it.on = on; it.cb(on); } });
    document.addEventListener("visibilitychange", () => apply(document.hidden ? null : cur));
    return { register(el, cb) { items.push({ el, cb, on: false }); if (cur) apply(cur); }, activate(scene) { cur = scene; apply(scene); } };
  })();
  const DV = {};

""" + js[j:]
# globe
js = rep(js, 'document.getElementById("globe"), cv = document.getElementById("globeCanvas")', 'document.getElementById("s-globe"), cv = document.getElementById("globeCanvas")')
js = rep(js, '    document.getElementById("globeFocus").addEventListener("click", () => { startFocus(); wake(); });\n', "")
js = rep(js, 'GL.register(sec, (on) => { active = on; if (on) wake(); else', 'function replay() { if (RMq) return; mode = "spin"; modeT = 0; introDone = false; yaw = FOCUS_YAW + 2.5; yawVel = 0; tilt = 0.22; zoom = 0; }\n    GL.register(sec, (on) => { active = on; if (on) { replay(); wake(); } else')
# fly
js = rep(js, "window.__fly = { seek:", "window.__fly = { dur: () => total / FLY_RATE, seek:")
js = rep(js, 'document.getElementById("tour"), cv = document.getElementById("flyCanvas")', 'document.getElementById("s-tour"), cv = document.getElementById("flyCanvas")')
js = rep(js, 'if ("IntersectionObserver" in window) new IntersectionObserver((e) => { if (e[0].isIntersecting) loadWorld(); }, { rootMargin: "60% 0px" }).observe(sec); else loadWorld();', 'sec.addEventListener("scene:near", loadWorld);')
js = rep(js, "t += dt * FLY_RATE; if (t >= total) { t = 0; prevYaw = null; }", 't += dt * FLY_RATE; if (t >= total) { t = 0; prevYaw = null; sec.dispatchEvent(new Event("fly:end")); }')
js = rep(js, "pause: () => { userPaused = true; sync(); } };", "pause: () => { userPaused = true; sync(); }, setPlay: (p) => { userPaused = !p; sync(); }, restart: () => { t = RMq ? kt[chKey[7]] + 2 : 0; prevYaw = null; if (ready && visible) render(0); }, prog: () => t / total };")
# size
js = rep(js, 'const sec = document.getElementById("size"); if (!sec) return;', 'const sec = document.getElementById("s-size"); if (!sec) return;')
js = rep(js, "    const perSales = DATA.facts.carsPerSalesman * ST,", "    Object.assign(DV, { U, ST, FIN, LOST, ASP, sold, finN, cashN, lostN, gmvY, finY, lostY, consSold, consY, dist });\n    const perSales = DATA.facts.carsPerSalesman * ST,")
i = js.index("    /* scroll → beat */"); j = js.index("    /* particle field */")
js = js[:i] + """    /* beat → step panel */
    let target = 0, S = 0, beat = 0;
    function setBeat(b) { target = b; beat = b; stepEls.forEach((el, i) => el.classList.toggle("on", i === b)); railEls.forEach((el, i) => el.classList.toggle("on", i === b)); }

""" + js[j:]
js = rep(js, "window.__size = { set: (s) => { target = s; S = s; }, state: () => S };", "window.__size = { set: (s) => { setBeat(s); S = s; }, beat: setBeat, state: () => S };")
js = rep(js, "const d = frameR * (cam.aspect < 1 ? 4.6 : 3.1);", "const d = frameR * (cam.aspect < 1 ? 6.2 : 3.9);")
# finance waffle: the deck turns it on
js = rep(js, """    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { W.classList.add("on"); io.disconnect(); } }, { threshold: .35 });
      io.observe(W);
    } else W.classList.add("on");
""", "")
js = cut(js, "  /* ---------- nav state + video ---------- */", "  /* ---------- lightbox ---------- */")
k = js.rindex("})();")
import os as _os, json as _js
LH = sorted(f[:-4] for f in _os.listdir(S + "/portfolio/logos") if f.endswith(".svg"))
LG = sorted(f[:-4] for f in _os.listdir(S + "/portfolio/legends") if f.endswith(".jpg"))
NL = sum(1 for x in ("legend-911", "legend-g", "legend-ghost", "legend-countach", "legend-f1") if x in LG)
js = js[:k] + "  window.PHOTO_AR = " + kn("photo_ar.json") + ";\n  window.PHOTO_FOCUS = " + kn("photo_focus.json") + ";\n  window.LOGO_HAVE = " + _js.dumps(LH) + ";\n  window.LEGEND_OK = " + _js.dumps(LG) + ";\n" + kn("marques.js") + kn("rb/ghostfibers.js") + kn("rb/aeroshards.js") + kn("rb/maskedheading.js") + kn("folio.js") + kn("pins.js") + kn("drape.js") + kn("uni.js") + kn("city.js") + kn("kn.js") + js[k:]
out = head + "<style>" + css + "</style>\n" + kn("body.html").replace("__MQDUR__", ",".join(["11500"] + ["7400"] * NL)) + '\n<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js"></script>\n' + js + "</script>\n"
out = out.replace("<title>Riyadh Sub-Dealer Portfolio</title>", "<title>Riyadh Sub-Dealer Keynote</title>")
open(S + "/portfolio/keynote.html", "w", encoding="utf-8").write(out)
print(len(out))
