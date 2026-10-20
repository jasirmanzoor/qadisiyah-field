"""Add the InfiniteStory-style stacked panels to the film scenes, plus a test act ("spec") for review."""
import os
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(S, "portfolio", "act.html"); s = open(p).read()
css = '''
/* InfiniteStory-style stack: full-bleed panels arrive from below, the previous one sinks, shrinks and dims */
.st-p { position: absolute; inset: 0; overflow: hidden; background: #000; will-change: transform; }
.st-p img { position: absolute; left: 0; top: -12%; width: 100%; height: 124%; object-fit: cover; will-change: transform; }
.st-p .dim { position: absolute; inset: 0; background: #000; opacity: 0; }
.st-p .grad { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(5,2,0,.88) 0%, rgba(5,2,0,.35) 38%, rgba(5,2,0,0) 60%); }
.st-mq { position: absolute; left: 0; top: 50%; white-space: nowrap; font: 800 300px/1 var(--d); letter-spacing: -.05em; color: transparent; -webkit-text-stroke: 2px rgba(255,255,255,.55); text-transform: uppercase; will-change: transform; mix-blend-mode: overlay; }
.st-cap { position: absolute; left: 120px; bottom: 110px; width: 1300px; }
.st-cap .n { font: 500 20px/1 var(--m); letter-spacing: .28em; color: var(--flame-lit); }
.st-cap h3 { margin: 18px 0 0; font: 700 104px/.96 var(--d); letter-spacing: -.045em; }
.st-cap h3 em { font-family: var(--s); font-weight: 400; font-style: italic; color: #ffd2ad; }
.st-cap p { margin: 18px 0 0; font: 400 28px/1.4 var(--b); color: var(--soft); max-width: 900px; }
.st-rail { position: absolute; right: 70px; top: 50%; display: grid; gap: 12px; transform: translateY(-50%); }
.st-rail i { display: block; width: 3px; height: 46px; background: rgba(255,255,255,.25); border-radius: 2px; }
.st-rail i.on { background: var(--flame-lit); box-shadow: 0 0 10px var(--flame); }
'''
if "function stack(" not in s:
    s = s.replace("</style>", css + "</style>", 1)
    fn = '''
function stack(r, items, seg) {
  /* items: [src, number, title html, line, marquee word]; one panel per seg seconds, each arriving over mv seconds */
  const mv = .95, H = 1080, els = items.map(([src, n, h, ln, mq], i) => {
    const el = $(`<div class="st-p" style="z-index:${i}"><img src="${src}"><div class="grad"></div><div class="st-mq">${mq} · ${mq} · ${mq}</div><div class="dim"></div>
      <div class="st-cap"><div class="n">${n}</div><h3>${words(h)}</h3><p>${ln}</p></div></div>`); r.appendChild(el); return el; });
  const rail = $(`<div class="st-rail" style="z-index:99">${items.map(() => "<i></i>").join("")}</div>`); r.appendChild(rail);
  return (t) => {
    els.forEach((el, i) => {
      const a = i * seg, u = i === 0 ? 1 : eio(ramp(t, a, mv));
      const nxt = i < els.length - 1 ? eio(ramp(t, a + seg, mv)) : 0;
      el.style.transform = `translate3d(0, ${((1 - u) * H).toFixed(1)}px, 0) scale(${(1 - nxt * .08).toFixed(4)})`;
      el.style.visibility = t > a - .05 || i === 0 ? "visible" : "hidden";
      el.style.borderRadius = (nxt * 28).toFixed(1) + "px";
      el.querySelector(".dim").style.opacity = (nxt * .7).toFixed(3);
      const lt = t - a;
      el.querySelector("img").style.transform = `translate3d(0, ${(-4 + lt * 1.2 - (1 - u) * 6).toFixed(2)}%, 0) scale(${(1.06 + lt * .012).toFixed(4)})`;
      const mq = el.querySelector(".st-mq");
      mq.style.transform = `translate3d(${(-500 - lt * 260).toFixed(1)}px, -50%, 0) scale(${(1.35 - .1 * Math.min(1, lt / seg)).toFixed(3)})`;
      mq.style.opacity = (eo(ramp(t, a + .2, .8)) * (1 - nxt)).toFixed(3);
      const cap = el.querySelector(".st-cap"); rise(cap.querySelector("h3"), t, a + .45, .07, .8); fade(cap.querySelector(".n"), t, a + .35); fade(cap.querySelector("p"), t, a + 1.1);
    });
    const k = Math.min(els.length - 1, Math.floor(t / seg)); [...rail.children].forEach((x, i) => x.classList.toggle("on", i === k));
  };
}
'''
    s = s.replace("/* ---------- scenes:", fn + "\n/* ---------- scenes:", 1)
    test = '''} else if (ACT === "spec") {
scene(4 * 2.6 + .6, (r) => stack(r, [
  ["bp3/trucks.jpg", "01 / 04 · Commercial", "Fleet <em>trucks.</em>", "Some floors sell nothing but refrigerated trucks and light commercial vehicles.", "Trucks"],
  ["bp3/ambul.jpg", "02 / 04 · Emergency service", "Ambulances <em>on the lot.</em>", "Others stock ambulances and service vehicles, by the row.", "Emergency"],
  ["bp3/sclass.jpg", "03 / 04 · Luxury", "S-Class, <em>end to end.</em>", "A few hold only flagship sedans, under their own lights.", "Luxury"],
  ["bp3/covered.jpg", "04 / 04 · Everyday", "The <em>everyday</em> floor.", "Most move the cars Riyadh drives every day.", "Volume"],
], 2.6));
} else {
/* C1: the people behind the work */'''
    a = "} else {\n/* C1: the people behind the work */"
    assert a in s; s = s.replace(a, test, 1)
open(p, "w").write(s); print("ok")
