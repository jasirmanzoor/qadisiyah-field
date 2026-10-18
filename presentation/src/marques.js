  /* ==================== Marques: brand strata + legends ==================== */
  window.LOGOS = (function () {
    const have = new Set(window.LOGO_HAVE || []);
    const slug = (n) => n.toLowerCase().replace(/mercedes.*/, "mercedes").replace(/[^a-z]/g, "");
    return (name) => { const s = slug(name); return have.has(s) ? `logos/${s}.svg` : null; };
  })();

  (function () {
    const sec = document.getElementById("s-marques"); if (!sec) return;
    const $ = (id) => document.getElementById(id), RMm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ORIGIN = { Japan: /^(toyota|nissan|lexus|isuzu|mazda|honda|suzuki|mitsubishi|infiniti)$/i, Korea: /^(hyundai|kia|genesis)$/i, Germany: /^(mercedes|bmw|audi|porsche|volkswagen|mini|brabus)$/i,
      "United States": /^(ford|gmc|chevrolet|cadillac|jeep|dodge|chrysler)$/i, China: /^(jetour|changan|mg|geely|haval|gac|jac|baic|jaecoo|foton|dongfeng|exeed|maxus|tank|jmc|chery|great wall)$/i,
      "United Kingdom": /^(land rover|rolls-royce|bentley|mclaren)$/i, Europe: /^(peugeot|renault|citroen|seat|lamborghini)$/i };
    const open = R.filter((r) => r.brands.length), cnt = new Map();
    open.forEach((r) => new Set(r.brands).forEach((b) => cnt.set(b, (cnt.get(b) || 0) + 1)));
    const list = [...cnt.entries()].sort((a, b) => b[1] - a[1]), max = list[0][1];
    const originOf = (b) => Object.keys(ORIGIN).find((k) => ORIGIN[k].test(b)) || "Other";
    const byO = {}; list.forEach(([b, c]) => { const o = originOf(b); (byO[o] = byO[o] || { o, floors: new Set(), brands: [] }).brands.push([b, c]); });
    open.forEach((r) => new Set(r.brands.map(originOf)).forEach((o) => byO[o] && byO[o].floors.add(r)));
    const groups = Object.values(byO).sort((a, b) => b.floors.size - a.floors.size);
    const COLS = { Japan: "#ff8a3d", Korea: "#ffc06a", Germany: "#e9e4dc", "United States": "#7fb3ff", China: "#4fd1c9", "United Kingdom": "#c9a7ff", Europe: "#ff9fb4", Other: "#9a8f86" };
    /* strata: one band per country of origin, its thickness the floors that carry it; brands are tiles inside, wide by their own floor count */
    $("mqStrata").innerHTML = groups.map((g, k) => {
      const top = g.brands.slice(0, 9), rest = g.brands.length - top.length;
      return `<div class="mq__band" style="--k:${k};--c:${COLS[g.o]};--f:${(g.floors.size / open.length).toFixed(4)}">
        <div class="mq__head"><b>${g.o}</b><span class="num">${fmt(g.floors.size)} floors · ${Math.round(g.floors.size / open.length * 100)}%</span></div>
        <div class="mq__row">${top.map(([b, c], j) => { const L = window.LOGOS(b); return `<div class="mq__tile" style="--w:${Math.max(.05, c / max).toFixed(4)};--j:${j}"><i>${L ? `<img src="${L}" alt="">` : `<em>${esc(b)}</em>`}</i><span>${L ? `${esc(b)} · ` : ""}<b class="num">${c}</b></span></div>`; }).join("")}${rest > 0 ? `<div class="mq__more">+${rest}</div>` : ""}</div></div>`;
    }).join("");
    $("mqSub").innerHTML = `${fmt(list.length)} brands on ${fmt(open.length)} floors across both districts. Each band is a country of origin, as thick as the share of floors that carry it; each tile is a brand. ${mchip("brands_distinct")}`;

    /* legends: our floor, then the car that made the name */
    const LEG = [
      { ours: "n-porsche-row", oc: "Porsche 911 line-up · Al Qadisiyah", arch: "legend-911", ac: "Porsche 901, 1964", n: "Porsche 911", t: "Unveiled at Frankfurt in 1963 as the 901, renamed 911 before sale. Sixty years on, the silhouette on this floor is the same.", by: "Photo: MrWalkr, Wikimedia Commons, CC BY-SA 4.0 (a 1964 Porsche 901 at the London Concours 2021)" },
      { ours: "n-gclass-front", oc: "G-Class AMG row · Al Qadisiyah", arch: "legend-g", ac: "Mercedes-Benz G-Class (W460), 1979", n: "Mercedes-Benz G-Class", t: "Built in 1979 as a military off-roader. Still made in Graz, still the same box, now a status symbol from Riyadh to Los Angeles.", by: "Photo: MrWalkr, Wikimedia Commons, CC BY-SA 4.0" },
      { ours: "n-rolls", oc: "Rolls-Royce Spectre · Al Qadisiyah", arch: "legend-ghost", ac: "Rolls-Royce Silver Ghost, 1907", n: "Rolls-Royce", t: "The 1907 Silver Ghost ran 15,000 miles almost without stopping and earned the name ‘the best car in the world’.", by: "Photo: Malcolm Asquith, Wikimedia Commons, CC BY-SA 2.5 (Silver Ghost at the 2004 centenary)" },
      { ours: "q-barimi-urus", oc: "Lamborghini Urus · ALBARIMI", arch: "legend-countach", ac: "Lamborghini Countach LP400, 1974", n: "Lamborghini", t: "The Countach drew the wedge every supercar since has followed. The Urus on this floor carries the same name on the bonnet.", by: "Photo: Benespit, Wikimedia Commons, CC BY-SA 4.0" },
      { ours: "q-barimi-mclaren", oc: "McLaren · ALBARIMI", arch: "legend-f1", ac: "McLaren F1, 1992", n: "McLaren", t: "Central driving seat, gold-lined engine bay, and the world's fastest production car for more than a decade.", by: "Photo: Lee, Wikimedia Commons, CC BY 2.0" },
    ].filter((L) => (window.LEGEND_OK || []).includes(L.arch));
    window.__LEGN = LEG.length;
    const box = $("mqLegend");
    function legend(k) {
      const L = LEG[k]; if (!L) return;
      box.innerHTML = `<figure class="lg__a"><img src="photos/${L.ours}.jpg" alt="${esc(L.oc)}"><figcaption><span>On the floor · 2026</span>${esc(L.oc)}</figcaption></figure>
        <figure class="lg__b"><img src="legends/${L.arch}.jpg" alt="${esc(L.ac)}"><figcaption><span>Where the name was made</span>${esc(L.ac)}</figcaption></figure>
        <i class="lg__seam"></i><div class="lg__copy"><p class="kick">Honourable mention ${k + 1} / ${LEG.length}</p><h3>${esc(L.n)}</h3><p>${esc(L.t)}</p><small>${esc(L.by)}</small></div>`;
      box.classList.remove("run"); void box.offsetWidth; box.classList.add("run");
    }
    window.__marques = { build: (b) => { sec.dataset.mq = b; if (b > 0) legend(b - 1); } };
  })();
