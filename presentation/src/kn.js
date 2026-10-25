  /* ==================== keynote: scene content ==================== */
  (function () {
    const $ = (id) => document.getElementById(id);
    const cnt = (n, l, s, u, d) => `<div class="cnt" data-only="${cnt.k++}"><p class="mega num"><span data-count${d ? ` data-d="${d}"` : ""}>${n}</span>${u ? `<small>${u}</small>` : ""}</p><p class="cnt__l">${l}</p><p class="cnt__s">${s}</p></div>`;
    cnt.k = 0;
    const TOT = sum(R.map((r) => r.units)), VER = R.filter((r) => r.loc === "verified").length;
    $("workCount").innerHTML = [
      cnt(fmt(R.length), "showroom records in the field census", `${fmt(R.filter((r) => r.mk === 0).length)} in Al Qadisiyah, ${fmt(R.filter((r) => r.mk === 1).length)} in Al Shifa. Bright doors were placed by phone GPS at the entrance (${fmt(VER)}); faint ones from the mapping sheets. ${mchip("showrooms_total")}`),
      cnt(fmt(TOT), "cars on the floor, counted", `Inside each showroom and out on the forecourt, on ${fmt(R.filter((r) => r.units).length)} floors. Nobody had added them up before. ${mchip("inventory_total")}`),
      cnt((F.per[0].walk + F.per[1].walk).toFixed(1), "route past every located door", `Al Qadisiyah ${F.per[0].walk} km, then Al Shifa ${F.per[1].walk} km, in straight lines. The walking itself was longer. ${mchip("walk_Q")}`, "km", 6500),
      cnt(fmt(deep.length), "owners sat down and opened their books", `Monthly sales, financed sales, partner banks and the buyers they lose; ${MET.int_n_Q.value} confirmed sales figures in Al Qadisiyah. ${mchip("int_n_Q")}`),
    ].join("");
    cnt.k = 0;
    const indep = ((1 - F.auth / MET.authorised_Q.n) * 100).toFixed(0);
    $("factCount").innerHTML = [
      cnt(indep + "%", "of Al Qadisiyah floors are fully independent", `Only ${F.auth} of ${fmt(MET.authorised_Q.n)} floors asked hold a manufacturer authorisation. ${mchip("authorised_Q")}`),
      cnt("1 : " + Math.round(F.carsPerSalesman), "one salesperson for every twenty cars", `${fmt(F.salesmen)} salespeople counted on ${fmt(F.salesmenN)} Al Qadisiyah floors. ${mchip("cars_per_staff_Q")}`),
      cnt(String(F.brands), "brands on the floors of two districts", `Chinese makes are on ${Math.round(F.per[0].cn * 100)}% of Al Qadisiyah floors and ${Math.round(F.per[1].cn * 100)}% in Al Shifa. ${mchip("brands_distinct")}`),
      cnt(Math.round(F.toyHy * 100) + "%", "of floors stock Toyota or Hyundai", `${Math.round(MET.brand_toyhy_Q.value * 100)}% in Al Qadisiyah, ${Math.round(MET.brand_toyhy_S.value * 100)}% in Al Shifa. Multi-brand floors count once per brand. ${mchip("brand_toyhy_S")}`),
      cnt(String(F.bankNo), "floors have no bank on site", `Asked in ${F.bankAns} owner sit-downs. Only ${F.bankNamed} of ${deep.length} owners named a partner bank. ${mchip("bank_none_Q")}`, `of ${F.bankAns}`),
    ].join("");

    /* finance gap */
    const demand = soldN + lostN, lostP = Math.round(lostN / demand * 100);
    $("gapMega").innerHTML = `${lostP}<small>in 100</small>`;
    $("gapSub").textContent = `On the floors we sat down in, ${fmt(lostN)} ready buyers a month walked away when financing fell through. ${F.bankNo} of ${F.bankAns} floors have no lender on site.`;

    /* two markets */
    const q = by(0), s = by(1), o5 = s.map((r) => r.over5).filter((v) => v != null);
    const typedShare = (rows, t) => { const ty = rows.filter((r) => r.type); return Math.round(ty.filter((r) => r.type === t).length / ty.length * 100); };
    const row = (l, a, b) => `<span class="l">${l}</span><b>${a}</b><b>${b}</b>`;
    $("vsTable").innerHTML = `<span class="h"></span><span class="h"><img class="vs__ph" src="photos/n-rc-facade.jpg" alt="Riyadh Cars, Al Qadisiyah"><i style="background:var(--qad)"></i>Al Qadisiyah</span><span class="h"><img class="vs__ph" src="photos/s16nfy-1.jpg" alt="Faris Ayedh Al Nufai Cars, Al Shifa"><i style="background:var(--shf)"></i>Al Shifa</span>` + [
      row("Showrooms", fmt(R.filter((r) => r.mk === 0).length), fmt(R.filter((r) => r.mk === 1).length)),
      row("Cars on the floor", fmt(DV.dist[0].u), fmt(DV.dist[1].u)),
      row("Median average price", "SAR " + sar(med(q.map((r) => r.asp))), "SAR " + sar(med(s.map((r) => r.asp)))),
      row("Sells new cars only", typedShare(q, "n") + "%", typedShare(s, "n") + "%"),
      row("Door to door", F.per[0].nn + " m", F.per[1].nn + " m"),
      row("Stock on display", "SAR " + (stock(q) / 1e9).toFixed(2) + "B", "SAR " + (stock(s) / 1e6).toFixed(0) + "M"),
      row("Sell for cash only", `<span class="na">not recorded</span>`, `${fmt(F.cashOnlyS)} of ${fmt(F.cashAnsS)}`),
      row("Monthly sales", `${fmt(DV.ddS)} <small class="na">on ${DV.nInt} floors</small>`, `<span class="na">not yet modelled</span>`),
    ].join("") + (o5.length ? `<span class="l" style="grid-column:1/-1;border:0;color:var(--ink-faint);font-size:12.5px">On Al Shifa floors, ${Math.round(sum(o5) / o5.length)}% of stock is more than five years old.</span>` : "");

    /* on the ground */
    /* on the ground: the photo wall */
    const byPhoto = (p) => R.find((x) => x.photos.includes(p));
    const WALL = [
      ["n-rc-facade", "D0228"], ["s-nufai", "S16NFY"], ["n-hexhall", null, "A new-car hall", 0], ["s-odaini", "S0098"], ["n-saber-facade", "D0006"], ["s-qahtani", "S0113"],
      ["n-nojoom-facade", "D0055"], ["s-sunset-row", null, "One row of Al Shifa at sunset", 1], ["n-mezzanine", null, "From the mezzanine of a new-car hall", 0], ["s-wafi", "S0092"], ["n-gclass-front", null, "G-Class AMG row", 0], ["s-ramz", "S0112"],
      ["n-redcarpet", null, "Kia and Genesis floor", 0], ["s-kathiri", "S16KTH"], ["n-imad-facade", "D0307"], ["s-odaini-s", "S0098", "Al Odaini, the S-Class row"], ["n-porsche-row", null, "Porsche 911 line-up", 0], ["s-shumukh", "S14SHM"],
      ["n-rolls", "D0164", "Rolls-Royce Spectre and friends"], ["s-ghost", null, "Rolls-Royce Ghost on an Al Shifa floor", 1], ["n-tank", null, "Tank SUVs, model year 2027", 0], ["s-dosari", null, "Al Dosari Cars at night", 1], ["n-rc-night", "D0228", "Riyadh Cars and Nojoom at night"], ["s-raad", "S16RAD"],
    ].map(([p, sd, label, mk]) => { const r = sd ? R.find((x) => x.sd === rid(sd)) : byPhoto(p); return { p, name: label || (r ? r.en : "On the survey walk"), dist: MK[r ? r.mk : (mk || 0)], units: r && !label ? r.units : null }; });
    $("cwRing").innerHTML = WALL.map((w, n) => `<li class="cw__p" data-k="${n}"><img src="photos/${w.p}.jpg" alt="${esc(w.name)}, ${w.dist}" loading="lazy" decoding="async"></li>`).join("");
    window.__WALL = WALL;

    /* data-room photo grids reveal as they scroll into view, five frames at a time */
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("seen"); io.unobserve(e.target); } }), { root: $("roomScroll"), rootMargin: "0px 0px -8% 0px" });
      document.querySelectorAll(".pgrid .shot").forEach((x) => io.observe(x));
    } else document.querySelectorAll(".pgrid .shot").forEach((x) => x.classList.add("seen"));

    /* exotic tiles */
    /* exotic: the headline is measured, not written: the nearest priced floor to the SAR 1M showroom, by GPS */
    const xbar = R.find((x) => x.sd === "D0164"), mdist = (a, b) => Math.hypot((a.lng - b.lng) * 101200, (a.lat - b.lat) * 111320);
    const xnear = xbar && R.filter((x) => x !== xbar && x.mk === 0 && x.lat != null && x.asp && x.loc === "verified").sort((a, b) => mdist(a, xbar) - mdist(b, xbar))[0];
    $("exoSay").innerHTML = `Rolls-Royce, Lamborghini, McLaren, <em>all on independent floors</em>.`;   /* the top end, as in the film */
    const exoFolio = window.DepthFlow ? window.DepthFlow.mount($("exoFolio"), { hold: 2300 }) : (window.Folio ? window.Folio.mount($("exoFolio"), { hold: 2300 }) : null);
    const EXO = [["n-rolls", "Rolls-Royce Spectre · Aston Martin DBX · Bentley"], ["q-barimi-rolls", "Rolls-Royce Cullinan"], ["q-barimi-urus", "Lamborghini Urus"], ["q-barimi-mclaren", "McLaren"]];
    /* on the ground: five glass folders, four photographs each, alternating districts */
    const gFolio = window.Folio ? window.Folio.mount($("groundFolio"), { hold: 950 }) : null;
    const wq = WALL.filter((w) => w.dist === MK[0]), ws = WALL.filter((w) => w.dist === MK[1]);
    const GROUPS = [[wq, 0, 0], [ws, 0, 1], [wq, 4, 0], [ws, 4, 1], [wq, 8, 0]].map(([L, a, mk]) => ({ mk, items: L.slice(a, a + 4).map((w) => [w.p, w.units ? `${w.name} · ${fmt(w.units)} cars` : w.name]) })).filter((g) => g.items.length);
    window.__FOL = { exoFolio, EXO, gFolio, GROUPS };

    /* at a glance */
    const pil = { yes: 0, maybe: 0, too_early: 0, no: 0 }; deep.forEach((d) => { if (d.pilot in pil) pil[d.pilot]++; });
    const pilN = pil.yes + pil.maybe + pil.too_early + pil.no, Bn = (n) => (n / 1e9).toFixed(1);
    const KP = [
      ["The census", `${fmt(R.length)}<small>showrooms</small>`, "independent floors recorded, door to door", `${fmt(R.filter((r) => r.mk === 0).length)} Al Qadisiyah · ${fmt(R.filter((r) => r.mk === 1).length)} Al Shifa`, 0, "showrooms_total"],
      ["Counted stock", `${fmt(TOT)}<small>cars</small>`, `SAR ${Bn(stock(R))}B on display at stated prices`, `on ${fmt(R.filter((r) => r.units).length)} floors`, 0, "inventory_total"],
      ["Al Qadisiyah sales", `${Math.round(DV.gmvY / 1e9)}–${Math.round(DV.gmvHi / 1e9)}<small>SAR bn / yr</small>`, "a range scaled from 21 owner interviews, conservative to full pace", `interviewed floors alone: SAR ${Bn(DV.intGmvY)}B a year`, 1, "est_gmv_Q"],
      ["Finance share", `${Math.round(DV.FIN * 100)}<small>%</small>`, "of interviewed owners' sales are financed", `range ${Math.round(DV.ciFin[0] * 100)}–${Math.round(DV.ciFin[1] * 100)}%`, 0, "int_fpr_Q"],
      ["Lost buyers", `${(DV.LOST * 10).toFixed(1)}<small>per 10 sold</small>`, "ready buyers walk away when financing fails", `SAR ${Math.round(F.lostSar / 1e6)}M a month on ${F.lostN} floors`, 1, "int_lost_ratio_Q"],
      ["Al Shifa, cash only", `${fmt(F.cashOnlyS)}<small>of ${fmt(F.cashAnsS)}</small>`, "floors offer no financing at all", "Al Shifa sales: not yet modelled", 0, "cash_only_S"],
    ];
    $("glanceGrid").innerHTML = KP.map(([t, v, l, r, hero, mid], k) => `<div class="kp${hero ? " kp--hero" : ""}" style="--k:${k}"><p class="kp__t">${t}${mchip(mid)}</p><p class="kp__v num">${v}</p><div><p class="kp__l">${l}</p><p class="kp__r">${r}</p></div></div>`).join("");
    $("glanceFoot").innerHTML = [`<b>${fmt(R.length)}</b> showrooms`, `<b>${fmt(TOT)}</b> cars counted`, `<b>${fmt(VER)}</b> doors GPS-confirmed`, `<b>${deep.length}</b> owner sit-downs`, `<b>${F.photos}</b> field photos`, `Al Qadisiyah · Al Shifa · Riyadh`].map((x) => `<span>${x}</span>`).join("");

    /* the opportunity */
    const qs = stock(by(0)) / stock(open);
    $("oppCols").innerHTML = [
      ["Where the value is", `${Math.round(qs * 100)}%`, `of the stock on display stands in Al Qadisiyah: SAR ${(stock(by(0)) / 1e9).toFixed(1)}B on ${fmt(R.filter((r) => r.mk === 0).length)} floors, a dense new-car cluster off Dammam Road.`, "n-mezzanine", "stockvalue_Q"],
      ["What is leaking", `SAR ${(F.lostSar * 12 / 1e9).toFixed(1)}B`, `a year of ready buyers walk out of just ${F.lostN} interviewed showrooms when financing fails. ${F.bankNo} of ${F.bankAns} have no lender on site.`, "s-odaini", "int_lost_sar_Q"],
      ["Who is ready", `${pil.yes + pil.maybe} owners`, `said yes or maybe to a finance pilot in their own showroom, with ${pil.too_early} more undecided. All are on the roster, with location and photos.`, "n-rc-facade", "pilot_Q"],
    ].map(([t, v, l, img, mid], k) => `<div class="oc" style="--k:${k}"><div class="oc__bg" style="background-image:url(photos/${img}.jpg)"></div><p class="oc__t">${t}${mchip(mid)}</p><p class="oc__v">${v}</p><p class="oc__l">${l}</p></div>`).join("");
    $("oppNext").innerHTML = [
      `<b>Pilot on the floor.</b> Put an embedded finance desk in the ${pil.yes + pil.maybe} showrooms that said yes or maybe, starting in Al Qadisiyah.`,
      `<b>Measure the lift.</b> Track financed sales and buyers lost against today's baseline of ${(DV.LOST * 10).toFixed(1)} lost per 10 sold.`,
      `<b>Extend the census.</b> Take the same method to the next Riyadh car districts to size the city, not just two corners of it.`,
    ].map((x, k) => `<li style="--k:${k}">${x}</li>`).join("");

    /* one more thing */
    $("omtMega").innerHTML = `SAR ${(F.lostSar * 12 / 1e9).toFixed(1)}<small>B</small>`;
    $("omtSay").innerHTML = `a year of ready buyers walk out of <em>just ${F.lostN} showrooms</em> we sat down in, because the financing was not there.`;
  })();

  /* ==================== metric popover: class, formula, source, denominator, n ==================== */
  (function () {
    const pop = document.createElement("div"); pop.className = "mpop"; pop.hidden = true; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "How this number is built");
    document.getElementById("kn").appendChild(pop);
    const v = (m) => m.value == null ? "Not available" : typeof m.value === "object" ? Object.entries(m.value).map(([a, b]) => `${a} ${b}`).join(" · ") : m.unit === "share" ? Math.round(m.value * 100) + "%" : Math.abs(m.value) >= 1e9 ? (m.value / 1e9).toFixed(2) + "B" : Math.abs(m.value) >= 1e6 ? (m.value / 1e6).toFixed(1) + "M" : (Math.round(m.value * 10) / 10).toLocaleString("en-US");
    const row = (k, x) => x ? `<dt>${k}</dt><dd>${esc(String(x))}</dd>` : "";
    function show(btn) {
      const m = MET[btn.dataset.mid]; if (!m) return;
      pop.innerHTML = `<p class="mpop__c mc--${m.cls.toLowerCase()}">${CLS[m.cls]}</p><p class="mpop__l">${esc(m.label)}</p><p class="mpop__v num">${v(m)}${m.lo != null && m.hi != null ? `<small> range ${v({ value: m.lo, unit: m.unit })}–${v({ value: m.hi, unit: m.unit })}</small>` : ""} <small>${esc(m.unit || "")}</small></p><dl>${row("Formula", m.formula)}${row("Source", m.source)}${row("Denominator", m.denominator)}${row("Sample", m.n ? "n = " + Math.round(m.n).toLocaleString("en-US") : "")}${row("Assumptions", m.assumptions)}${row("Note", m.note)}</dl><button type="button" class="mpop__x" aria-label="Close">✕</button>`;
      const r = btn.getBoundingClientRect(), w = Math.min(380, innerWidth - 24), x = Math.max(12, Math.min(innerWidth - w - 12, r.left));
      pop.style.width = w + "px"; pop.style.left = x + "px"; pop.hidden = false;
      const below = r.bottom + 10 + pop.offsetHeight < innerHeight; pop.style.top = (below ? r.bottom + 10 : Math.max(12, r.top - pop.offsetHeight - 10)) + "px";
      window.__deck && window.__deck.setPlay(false);
    }
    document.addEventListener("click", (e) => { const b = e.target.closest("[data-mid]"); if (b) { e.stopPropagation(); show(b); return; } if (!pop.hidden && (e.target.closest(".mpop__x") || !pop.contains(e.target))) pop.hidden = true; }, true);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") pop.hidden = true; });
  })();

  /* ==================== keynote: the deck ==================== */
  (function () {
    const $ = (id) => document.getElementById(id);
    const RMk = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const S = [...document.querySelectorAll(".sc:not([data-off])")].map((el, k) => {   /* chapters the film leaves out stay in the page, off the timeline */
      const durs = (el.dataset.dur || "8000").split(",").map(Number);
      return { el, k, id: el.id.slice(2), title: el.dataset.title, durs, n: durs.length, uni: el.dataset.uni ? el.dataset.uni.split(",") : null, parts: [...el.querySelectorAll("[data-b],[data-only]")] };
    });
    const hooks = {};
    let i = -1, b = 0, t = 0, playing = !new URLSearchParams(location.search).has("still"), wheelLock = 0;
    const playBtn = $("kPlay"), seg = $("kSeg");
    seg.innerHTML = S.map((s, k) => `<button type="button" role="tab" aria-label="${k + 1}. ${s.title}"><i></i><span>${String(k + 1).padStart(2, "0")} · ${s.title}</span></button>`).join("");
    const segs = [...seg.children], fills = segs.map((x) => x.firstChild);
    $("kIdxList").innerHTML = S.map((s, k) => `<li><button type="button" data-go="${k}"><b>${String(k + 1).padStart(2, "0")}</b><span>${s.title}</span></button></li>`).join("");

    function countUp(el) {
      if (RMk || el.dataset.done) return; el.dataset.done = 1;
      const txt = el.textContent, m = txt.match(/[\d,.]+/); if (!m) return;
      const target = parseFloat(m[0].replace(/,/g, "")), dec = (m[0].split(".")[1] || "").length, t0 = performance.now() + (el.dataset.d ? 900 : 0), D = +el.dataset.d || 1300;
      const stp = (now) => { const kk = Math.min(1, Math.max(0, (now - t0) / D)), v = target * (el.dataset.d ? kk : 1 - Math.pow(1 - kk, 3)); el.textContent = txt.replace(m[0], dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US")); if (kk < 1) requestAnimationFrame(stp); else delete el.dataset.done; };
      requestAnimationFrame(stp);
    }
    function builds() {
      const s = S[i];
      s.parts.forEach((el) => {
        const on = el.hasAttribute("data-only") ? +el.dataset.only === b : b >= +el.dataset.b;
        if (on && !el.classList.contains("is-b")) { el.querySelectorAll("[data-count]").forEach(countUp); heads(el).forEach((h, n) => h.__mh.play(.12 + n * .1)); }
        else if (!on && el.classList.contains("is-b")) heads(el).forEach((h) => h.__mh.rest());
        el.classList.toggle("is-b", on);
      });
      hooks[s.id] && hooks[s.id].build && hooks[s.id].build(b);
      if (s.uni) UNI.show(s.uni[Math.min(b, s.uni.length - 1)]); else UNI.sleep();
    }
    function setPlay(p) {
      playing = p; playBtn.classList.toggle("paused", !p); playBtn.setAttribute("aria-label", p ? "Pause" : "Play");
      const h = i >= 0 && hooks[S[i].id]; h && h.play && h.play(p);
    }
    function show(k, bb = 0) {
      k = Math.max(0, Math.min(S.length - 1, k));
      const prev = i;
      if (k !== prev) {
        if (leaving) finishLeave();
        if (prev >= 0) { S[prev].el.classList.remove("is-on"); if (!RMk && Math.abs(k - prev) === 1 && T > 0) { leaving = S[prev]; leaving.el.classList.add("is-leaving"); } heads(S[prev].el).forEach((h) => h.__mh.rest()); S[prev].parts.forEach((el) => el.classList.remove("is-b"));   /* so its builds replay on the way back in */ hooks[S[prev].id] && hooks[S[prev].id].leave && hooks[S[prev].id].leave(); }
        i = k; S[i].el.classList.add("is-on");
        $("kn").classList.toggle("is-film", S[i].el.classList.contains("sc--film"));   /* the film's own lockup is in the picture */
        GL.activate(S[i].el);
        [1, 2].forEach((d) => S[i + d] && S[i + d].el.dispatchEvent(new Event("scene:near")));
        S[i].el.dispatchEvent(new Event("scene:near"));
        hooks[S[i].id] && hooks[S[i].id].enter && hooks[S[i].id].enter(playing);
        heads(S[i].el).filter((h) => !h.closest("[data-b],[data-only]")).forEach((h, n) => h.__mh.play(.25 + n * .12));
        fx(S[i]);
        $("kCh").innerHTML = `<b>${String(i + 1).padStart(2, "0")}</b>${S[i].title}`;
        $("kNum").textContent = `${String(i + 1).padStart(2, "0")} / ${S.length}`;
        segs.forEach((x, n) => x.setAttribute("aria-selected", String(n === i)));
        document.querySelectorAll("#kIdxList button").forEach((x) => x.classList.toggle("on", +x.dataset.go === i));
        try { history.replaceState(null, "", "#" + S[i].id); } catch (e) { /* sandboxed */ }
      }
      b = Math.max(0, Math.min(S[i].n - 1, bb)); t = 0; builds(); paint();
    }

    /* ==================== the director: one clock, a cue sheet, scrub and glide ==================== */
    let TR = RMk ? 0 : 1;                           /* chapter transition, seconds (set per cut) */
    const smooth = (x) => x * x * (3 - 2 * x), clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
    const flyDur = () => window.__fly && window.__fly.dur ? window.__fly.dur() : 60;
    let lastT = 0, warp = 0, lastScrub = 0, flyLast = -1, flyStall = 0, cues = [], chap = [], TOTAL = 0, T = 0, TT = null, vel = 0, holdUntil = 0, glide = null, speed = 1, leaving = null;
    /* how long a beat holds: the time to read what it shows (about 3.3 words a second) plus a settle,
       never shorter than its visual needs to play out, never so long the eye starts to wander */
    /* how long a beat holds, by what it shows: reading time (3.3 words a second) on top of the time its visual needs to land.
       particle morphs need ~2.8 s to settle, a count-up 1.3 s, a camera move its own flight time, a photo deck one hold per frame */
    /* attention pacing: the eye gets a new thing every 3-7 s. A beat holds for its visual to land, plus reading at 4 words a second, and no longer */
    const VIS = {
      uni: { land: 2.2, min: 4.2, max: 6.2 }, opp: { fixed: () => 9.5 }, glance: { fixed: (s, bb) => bb === 0 ? 3.2 : 8.2 }, count: { land: 1.2, min: 3.4, max: 6 }, globe: { land: 3.4, min: 6.4, max: 8 }, city: { land: 3, min: 5.8, max: 7.4 },
      size: { land: 1.8, min: 4.5, max: 7.5 }, ground: { land: 1.4, fixed: () => 1.4 + 4 * .95 + .4 }, exo: { land: 1, min: 6, max: 7.5 },
      walk: { fixed: () => 11.5 }, trail: { fixed: () => 11 }, marques: { land: 0, fixed: (s, bb) => bb === 0 ? 8.5 : 5.4 }, text: { land: .5, min: 3, max: 6.5 },
    };
    function kindOf(s) {
      if (VIS[s.id]) return VIS[s.id];
      if (s.el.classList.contains("sc--film")) return { fixed: () => s.durs[0] / 1000 };
      if (s.el.classList.contains("sc--uni")) return VIS.uni;
      if (s.el.classList.contains("sc--count")) return VIS.count;
      return VIS.text;
    }
    function dwell(s, bb, orig) {
      const K = kindOf(s); if (K.fixed) return K.fixed(s, bb);
      const parts = s.parts.filter((el) => el.hasAttribute("data-only") ? +el.dataset.only === bb : +el.dataset.b === bb);
      const loose = bb === 0 ? [...s.el.querySelectorAll(".say, .sc__sub, .kick, .mega")].filter((el) => !el.closest("[data-b],[data-only]")) : [];
      const words = parts.concat(loose).map((el) => el.textContent).join(" ").split(/\s+/).filter(Boolean).length;
      return Math.min(K.max, Math.max(K.min, K.land + .8 + words / 4));
    }
    function sheet() {
      cues = []; chap = []; let t0 = 0;
      S.forEach((s, k) => {
        const ds = s.id === "tour" ? [flyDur()] : s.durs.map((ms, bb) => dwell(s, bb, (ms || 9000) / 1000));
        chap[k] = { t0, d: ds.reduce((a, v) => a + v, 0) };
        ds.forEach((d, bb) => { cues.push({ i: k, b: bb, t0, d }); t0 += d; });
      });
      TOTAL = t0;
      segs.forEach((x, k) => { x.style.flexGrow = chap[k].d.toFixed(2); });
      $("kTot").textContent = tc(TOTAL);
    }
    const cueAt = (tm) => { let lo = 0; for (let k = 0; k < cues.length; k++) if (cues[k].t0 <= tm + 1e-6) lo = k; return cues[lo]; };
    const cueIndex = (k, bb) => cues.findIndex((c) => c.i === k && c.b === Math.min(bb, S[k].n - 1));
    const tc = (x) => `${String(Math.floor(x / 60)).padStart(2, "0")}:${(x % 60).toFixed(1).padStart(4, "0")}`;
    function seekTo(tm, mode) {
      tm = Math.max(0, Math.min(TOTAL - .05, tm)); holdUntil = performance.now() + 1400; vel = 0; TT = null;
      if (mode === "jump" || RMk) { glide = null; T = tm; apply(true); return; }
      const dist = Math.abs(tm - T); glide = { a: T, z: tm, t: 0, d: Math.min(1.5, Math.max(.7, .35 + dist * .02)) };
    }
    function go(k, bb = 0, mode) { const c = cues[cueIndex(Math.max(0, Math.min(S.length - 1, k)), bb)]; seekTo(c.t0 + .001, mode); }
    const next = () => { const c = cueAt(T), n = cues[cues.indexOf(c) + 1]; if (n) seekTo(n.t0 + .001); };
    const prev = () => { const c = cueAt(T), k = cues.indexOf(c), back = T - c.t0 > 1.2 ? c : cues[Math.max(0, k - 1)]; seekTo(back.t0 + .001); };
    function apply(scrubbed) {
      const c = cueAt(T);
      if (c.i !== i) show(c.i, c.b); else if (c.b !== b) { b = c.b; builds(); }
      if (scrubbed && S[i].id === "tour" && window.__fly && window.__fly.seek) window.__fly.seek(Math.max(0, T - chap[i].t0));
    }
    function finishLeave() { if (!leaving) return; const el = leaving.el; el.classList.remove("is-leaving"); el.style.opacity = ""; el.style.filter = ""; el.style.transform = ""; el.style.borderRadius = ""; el.style.zIndex = ""; el.style.removeProperty("--se-z"); leaving = null; }
    /* ScrollExpand's frame, driven by the clock: the next chapter opens from a rounded card to full bleed */
    /* chapter transitions: three cuts in rotation (light blade, iris, shutter) so no two arrivals feel the same */
    const txLight = $("txLight"), KINDS = ["blade", "iris", "shutter", "blade", "shutter", "iris"];
    const ease3 = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const SLATS = [0, .11, .27, .36, .52, .66, .74, .9, 1], SLAT_D = [.0, .16, .05, .22, .09, .27, .03, .19];
    function clipFor(kind, k, el) {
      if (kind === "iris") {
        const c = el.querySelector(".say, .mega, .sc__copy, .uni__copy, h2") || el, rc = c.getBoundingClientRect(), W = innerWidth, H = innerHeight;
        const cx = Math.min(80, Math.max(20, (rc.left + rc.width / 2) / W * 100)), cy = Math.min(75, Math.max(25, (rc.top + rc.height / 2) / H * 100)), rr = k * 150;
        txLight.style.background = `radial-gradient(circle at ${cx}% ${cy}%, transparent calc(${rr}vmax - 3px), rgba(255,190,120,${(.9 * (1 - k)).toFixed(3)}) ${rr}vmax, transparent calc(${rr}vmax + 22px))`;
        return `circle(${rr.toFixed(2)}vmax at ${cx.toFixed(1)}% ${cy.toFixed(1)}%)`;
      }
      if (kind === "reveal") {
        /* scroll-zoom reveal: the chapter opens as a small rounded window at the centre, then grows to full bleed while its picture settles */
        const e = 1 - Math.pow(1 - k, 4), w = 22 + 78 * e, h = 12 + 88 * e, ix = (100 - w) / 2, iy = (100 - h) / 2;
        txLight.style.background = "none";
        return `inset(${iy.toFixed(2)}% ${ix.toFixed(2)}% ${iy.toFixed(2)}% ${ix.toFixed(2)}% round ${(46 * (1 - e)).toFixed(1)}px)`;
      }
      if (kind === "shutter") {
        txLight.style.background = "none";
        let pts = ["0% 100%"];
        for (let j = 0; j < SLATS.length - 1; j++) { const h = ease3(Math.min(1, Math.max(0, (k - SLAT_D[j]) / (1 - .27)))) * 100, x0 = SLATS[j] * 100, x1 = SLATS[j + 1] * 100; pts.push(`${x0}% 100%`, `${x0}% ${(100 - h).toFixed(2)}%`, `${x1}% ${(100 - h).toFixed(2)}%`, `${x1}% 100%`); }
        return `polygon(${pts.join(",")})`;
      }
      const f = -35 + k * 170;   /* blade: a 22° edge sweeping left to right, lit along its front */
      txLight.style.background = `linear-gradient(112deg, transparent calc(${f.toFixed(2)}% - 2px), rgba(255,214,170,${(.95 * Math.sin(Math.PI * k)).toFixed(3)}) ${f.toFixed(2)}%, rgba(255,140,60,${(.35 * Math.sin(Math.PI * k)).toFixed(3)}) calc(${f.toFixed(2)}% + 10px), transparent calc(${f.toFixed(2)}% + 60px))`;
      return `polygon(0% 0%, ${(f + 20).toFixed(2)}% 0%, ${(f - 20).toFixed(2)}% 100%, 0% 100%)`;
    }
    /* cuts, Reels-style: every chapter arrives with a different move, never the same twice in a row */
    const CUTS = ["swipe", "pan", "reveal", "blade", "shrink", "reveal", "iris", "swipe", "shutter", "pan", "pop", "shrink", "zoom", "blade", "swipe", "iris", "reveal", "pop", "shrink"];
    const CUT_D = { swipe: .78, pan: .82, pop: .68, shrink: .92, zoom: .78, blade: .95, iris: 1, shutter: .95, reveal: 1.25 };
    const easeExpo = (x) => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x), easeBack = (x) => { const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
    function motion(kind, k, el, out) {
      /* returns [incoming transform, outgoing transform, outgoing opacity, radius] */
      const W = innerWidth, H = innerHeight;
      if (kind === "swipe") { const e = easeExpo(k); return [`translate3d(0, ${((1 - e) * H).toFixed(1)}px, 0)`, `translate3d(0, ${(-e * H * .28).toFixed(1)}px, 0) scale(${(1 - .06 * e).toFixed(4)})`, 1 - .55 * e, 18 * (1 - e)]; }
      if (kind === "pan") { const e = easeExpo(k); return [`translate3d(${((1 - e) * W).toFixed(1)}px, 0, 0)`, `translate3d(${(-e * W * .32).toFixed(1)}px, 0, 0) scale(${(1 - .05 * e).toFixed(4)})`, 1 - .55 * e, 18 * (1 - e)]; }
      if (kind === "pop") { const e = easeBack(Math.min(1, k)); return [`scale(${(.78 + .22 * e).toFixed(4)})`, `scale(${(1 + .08 * k).toFixed(4)})`, 1 - k, 26 * (1 - Math.min(1, k * 1.2))]; }
      if (kind === "shrink") { const e = 1 - Math.pow(1 - k, 3); return [`scale(${(1.08 - .08 * e).toFixed(4)})`, `translate3d(0, ${(-e * H * .06).toFixed(1)}px, 0) scale(${(1 - .42 * e).toFixed(4)})`, 1 - e * e, 0, 32 * e]; }
      if (kind === "zoom") { const e = easeExpo(k); return [`scale(${(1.22 - .22 * e).toFixed(4)})`, `scale(${(1 + .35 * e).toFixed(4)})`, 1 - e, 0]; }
      return null;
    }
    function stageFx() {
      const s = S[i]; if (!s) return;
      const kind = CUTS[i % CUTS.length]; TR = RMk ? 0 : CUT_D[kind];
      const e = TR ? clamp01((T - chap[i].t0) / TR) : 1, k = ease3(e), cp = clamp01((T - chap[i].t0) / Math.max(1, chap[i].d));
      if (e < 1 && i > 0) {
        const m = motion(kind, e, s.el);
        if (m) {
          s.el.style.transform = m[0]; s.el.style.borderRadius = m[3] ? m[3].toFixed(1) + "px" : ""; s.el.style.overflow = "hidden"; s.el.style.clipPath = "";
          if (leaving) { leaving.el.style.transform = m[1]; leaving.el.style.opacity = Math.max(0, m[2]).toFixed(3); leaving.el.style.borderRadius = m[4] ? m[4].toFixed(1) + "px" : ""; leaving.el.style.filter = `brightness(${(1 - .45 * e).toFixed(3)})`; leaving.el.style.zIndex = kind === "shrink" ? 3 : ""; }
          txLight.style.opacity = 0;
        } else {
          s.el.style.clipPath = clipFor(kind, k, s.el); s.el.style.transform = "";
          s.el.style.setProperty("--se-z", (1.05 - .05 * k).toFixed(4));
          if (leaving) { leaving.el.style.opacity = (1 - k * .85).toFixed(3); leaving.el.style.setProperty("--se-z", (1 - .05 * k).toFixed(4)); leaving.el.style.filter = `brightness(${(1 - .5 * k).toFixed(3)}) blur(${(4 * k).toFixed(2)}px)`; }
          txLight.style.opacity = 1;
        }
        if (!stage.classList.contains("is-transit") && fibRef()) fibRef().set({ paused: false });
        stage.classList.add("is-transit");
      } else {
        if (s.el.style.clipPath) s.el.style.clipPath = "";
        if (s.el.style.transform) { s.el.style.transform = ""; s.el.style.borderRadius = ""; s.el.style.overflow = ""; }
        s.el.style.setProperty("--se-z", "1"); finishLeave(); if (stage.classList.contains("is-transit") && fibRef()) fibRef().set({ paused: S[i].el.dataset.fx !== "fibers" }); stage.classList.remove("is-transit"); txLight.style.opacity = 0;
      }
      if (!RMk) s.el.style.setProperty("--dolly", (1 + .022 * smooth(cp)).toFixed(4));
      /* the open loop: the next chapter is named a moment before it arrives */
      const left = chap[i].t0 + chap[i].d - T, nx = S[i + 1];
      upEl.classList.toggle("on", !!nx && left < 1.8 && left > .15 && !glide);
      if (nx && upEl.dataset.k !== String(i + 1)) { upEl.dataset.k = i + 1; upEl.innerHTML = `<span>Next</span><b>${nx.title}</b>`; }
    }
    const upEl = $("kUp");
    let fibRef = () => null;
    let last = 0;
    function tick(now) {
      const dt = last ? Math.min(.5, (now - last) / 1000) : .016; last = now;
      if (glide) {
        glide.t += dt / glide.d; const x = Math.min(1, glide.t), g = glide.t >= 1 ? 1 : glide.spring ? 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2) : x < .5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2;
        T = glide.a + (glide.z - glide.a) * g; apply(true); if (glide.t >= 1) { glide = null; holdUntil = now + 300; }
      } else if (TT !== null || Math.abs(vel) > .01) {
        if (Math.abs(vel) > .01) { TT = (TT === null ? T : TT) + vel * dt; vel *= Math.exp(-dt / .32); }
        T += (TT - T) * (1 - Math.exp(-dt / .11)); T = Math.max(0, Math.min(TOTAL - .05, T)); TT = Math.max(0, Math.min(TOTAL - .05, TT));
        apply(true);
        if (Math.abs(TT - T) < .004 && Math.abs(vel) <= .01) {
          T = TT; TT = null;
          /* magnetic beats: a scrub that comes to rest near a beat's opening is drawn onto it with a soft spring */
          if (now - lastScrub > 260) { const c = cueAt(T), n = cues[cues.indexOf(c) + 1], dA = T - c.t0, dB = n ? n.t0 - T : 99;
            const tgt = dA < 1.6 ? c.t0 + .001 : dB < 1.2 ? n.t0 + .001 : null;
            if (tgt !== null && Math.abs(tgt - T) > .05) glide = { a: T, z: tgt, t: 0, d: .55, spring: true }; }
        }
      } else if (playing && !document.hidden && now > holdUntil) {
        if (S[i].id === "tour" && window.__fly && window.__fly.prog) {
          /* the flight keeps its own clock; if it stalls (no WebGL), the director carries the time and drags the camera along */
          const fp = window.__fly.prog(); if (fp !== flyLast) { flyLast = fp; flyStall = 0; } else flyStall += dt;
          if (flyStall > 2.5) { T += dt * speed; window.__fly.seek && window.__fly.seek(Math.max(0, T - chap[i].t0)); } else T = Math.max(T, chap[i].t0 + fp * chap[i].d);
        } else T += dt * speed;
        if (T >= TOTAL - .05) { T = TOTAL - .05; setPlay(false); }
        apply(false);
      }
      /* time-warp: the faster the tour is scrubbed, the more the scene streaks and leans along the motion */
      const v = (T - lastT) / Math.max(.008, dt); lastT = T; warp += (Math.max(-1, Math.min(1, v / 40)) - warp) * (1 - Math.exp(-dt / .09));
      stage.style.setProperty("--warp", warp.toFixed(3)); stage.classList.toggle("is-warp", Math.abs(warp) > .04);
      stageFx(); paint(); filmSync();
      requestAnimationFrame(tick);
    }
    const stage = $("stage");
    function progress() {
      const s = S[i], h = hooks[s.id];
      if (h && h.progress) return h.progress();
      const tot = s.durs.reduce((a, v) => a + v, 0); if (!tot) return 1;
      return Math.min(1, (s.durs.slice(0, b).reduce((a, v) => a + v, 0) + Math.min(t, s.durs[b])) / tot);
    }
    const routeKm = $("routeKm"), routeLeg = $("routeLeg"), WALK = F.per[0].walk + F.per[1].walk;
    const tele = $("teleClock"), T0 = performance.now(); let teleS = -1;
    function paint() {
      if (S[i] && S[i].id === "open") { const s = Math.floor((performance.now() - T0) / 1000); if (s !== teleS) { teleS = s; tele.textContent = `T+ ${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; } }
      if (S[i] && S[i].id === "work" && b === 2 && routeKm) { const k = UNI.ink ? UNI.ink() : 1, km = k * WALK; routeKm.textContent = km.toFixed(1); routeLeg.textContent = km < F.per[0].walk ? "Leg 1 / 2 · Al Qadisiyah · August" : "Leg 2 / 2 · Al Shifa · September"; }
      fills.forEach((f, n) => { f.style.transform = `scaleX(${chap[n] ? clamp01((T - chap[n].t0) / Math.max(.01, chap[n].d)).toFixed(4) : 0})`; });
      $("kTc").textContent = tc(T);
    }
    /* film chapters: the film's own cut of a scene, held on the keynote's clock so pause, scrub and jumps stay frame-true */
    const filmV = (s) => s.el.querySelector("video");
    const filmLoad = (s) => { const v = filmV(s); if (!v.getAttribute("src")) { v.src = s.el.dataset.film; v.preload = "auto"; } return v; };
    S.filter((s) => s.el.classList.contains("sc--film")).forEach((s) => {
      s.el.addEventListener("scene:near", () => filmLoad(s));
      hooks[s.id] = {
        enter: (p) => { const v = filmLoad(s); try { v.currentTime = Math.max(0, T - chap[s.k].t0); } catch (e) {} p ? v.play().catch(() => {}) : v.pause(); },
        play: (p) => { const v = filmV(s); p ? v.play().catch(() => {}) : v.pause(); },
        leave: () => filmV(s).pause(),
      };
    });
    function filmSync() {
      const s = S[i]; if (!s || !s.el.classList.contains("sc--film")) return;
      const v = filmV(s), want = Math.max(0, T - chap[i].t0), moving = playing && !glide && TT === null;
      if (moving && v.paused && v.readyState > 1 && want < chap[i].d - .1) v.play().catch(() => {});
      if (!moving && !v.paused) v.pause();
      if (v.readyState > 0 && Math.abs(v.currentTime - want) > (moving ? .35 : .04)) { try { v.currentTime = want; } catch (e) {} }
    }
    hooks.tour = {
      enter: (p) => { window.__fly && window.__fly.restart(); window.__fly && window.__fly.setPlay(p); },
      play: (p) => window.__fly && window.__fly.setPlay(p),
      progress: () => window.__fly ? window.__fly.prog() : 0,
      leave: () => window.__fly && window.__fly.setPlay(false),
    };
    $("s-tour").addEventListener("fly:end", () => { if (playing && S[i].id === "tour") T = chap[i].t0 + chap[i].d + .001; });
    hooks.city = { enter: (p) => window.__city && window.__city.enter(p), build: (bb) => window.__city && window.__city.build(bb), play: (p) => window.__city && window.__city.play(p), leave: () => window.__city && window.__city.leave() };
    hooks.walk = { build: (bb) => window.__walk && window.__walk.build(bb) };
    hooks.marques = { build: (bb) => window.__marques && window.__marques.build(bb) };
    hooks.size = { build: (bb) => window.__size && window.__size.beat(bb), enter: () => window.__size && window.__size.set(0) };
    /* the photo wall: a concave ring of real photos; each beat turns it two frames, the one in front is lit */
    const ring = $("cwRing"), panels = [...ring.children], NW = panels.length, STEP = 360 / NW, amb = [...document.querySelectorAll(".cw__amb i")];
    let wallTurn = 0, ambK = 0;
    function wallLayout() {
      const vw = innerWidth, vh = innerHeight, w = Math.round(Math.min(vw < 760 ? vw * 0.62 : vw * 0.28, vh * 0.5)), R = (w / 2) / Math.tan(Math.PI / NW) * 1.12, D = vw < 760 ? 40 : 80;
      ring.style.setProperty("--w", w + "px"); ring.dataset.r = R; ring.dataset.d = D;
      panels.forEach((p, n) => { p.style.transform = `rotateY(${(n * STEP).toFixed(3)}deg) translateZ(${R.toFixed(1)}px)`; });
    }
    function wall(bb) {
      const k = (bb * 2) % NW, R = +ring.dataset.r, D = +ring.dataset.d;
      wallTurn = bb * 2 * STEP;
      ring.style.transform = `translateZ(${(-R + D).toFixed(1)}px) rotateY(${(-wallTurn).toFixed(3)}deg)`;
      panels.forEach((p, n) => { let a = ((n * STEP - wallTurn) % 360 + 540) % 360 - 180; p.style.opacity = Math.abs(a) > 80 ? 0 : 1; p.classList.toggle("on", n === k); });
      const w = window.__WALL[k]; amb[ambK].classList.remove("on"); ambK ^= 1; amb[ambK].style.backgroundImage = `url(photos/${w.p}.jpg)`; amb[ambK].classList.add("on");
      $("cwCap").innerHTML = `<div><p>${String(k + 1).padStart(2, "0")} / ${NW} · ${w.dist}</p><b>${esc(w.name)}</b><span>${w.units ? fmt(w.units) + " cars on the floor" : "Photographed on the survey walk"}</span></div>`;
    }
    wallLayout();
    const { exoFolio, EXO, gFolio, GROUPS } = window.__FOL || {};
    hooks.ground = gFolio ? { build: (bb) => { const g = GROUPS[Math.min(bb, GROUPS.length - 1)]; gFolio.show(g.items, { tab: `${MK[g.mk]} · ${String(bb + 1).padStart(2, "0")} / ${String(GROUPS.length).padStart(2, "0")}`, color: g.mk ? "#4fd1c9" : "#ff9a4a", seed: bb * 31 + 5 }); }, leave: () => gFolio.hide() } : { build: wall, enter: () => { wallLayout(); wall(0); } };
    addEventListener("resize", () => { wallLayout(); if (S[i] && S[i].id === "ground") wall(b); });
    /* exotic: play the floor footage only while the chapter is on screen */
    const exoVid = $("exoVid");
    $("s-exo").addEventListener("scene:near", () => { if (!exoVid.src) { exoVid.src = "video/albarimi.mp4"; exoVid.preload = "auto"; } });
    hooks.exo = { build: () => exoFolio && exoFolio.show(EXO, { tab: "ALBARIMI · Wadi Ar Rimah", seed: 11 }), enter: () => { if (!exoVid.src) exoVid.src = "video/albarimi.mp4"; exoVid.currentTime = 0; const pr = exoVid.play(); if (pr && pr.catch) pr.catch(() => {}); }, leave: () => { exoVid.pause(); exoFolio && exoFolio.hide(); } };

    /* controls */
    playBtn.addEventListener("click", () => setPlay(!playing));
    $("kNext").addEventListener("click", next);
    $("kPrev").addEventListener("click", prev);
    segs.forEach((x, n) => x.addEventListener("click", () => go(n)));
    $("kReplay").addEventListener("click", () => { go(0, 0, "jump"); setPlay(true); });
    const idx = $("kIdx"), room = $("room");
    let wasPlaying = false;
    function openPanel(p) { wasPlaying = playing; setPlay(false); p.hidden = false; const c = p.querySelector("[data-close]"); c && c.focus(); }
    function closePanel(p) { p.hidden = true; if (wasPlaying) setPlay(true); }
    $("kIdxBtn").addEventListener("click", () => openPanel(idx));
    $("kRoomBtn").addEventListener("click", () => openPanel(room));
    $("kRoom2").addEventListener("click", () => openPanel(room));
    [idx, room].forEach((p) => p.querySelector("[data-close]").addEventListener("click", () => closePanel(p)));
    idx.addEventListener("click", (e) => { const g = e.target.closest("[data-go]"); if (g) { idx.hidden = true; go(+g.dataset.go); setPlay(true); } else if (e.target === idx) closePanel(idx); });
    room.querySelectorAll(".room__nav a").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); const tg = document.querySelector(a.getAttribute("href")); tg && $("roomScroll").scrollTo({ top: tg.offsetTop - 8, behavior: RMk ? "auto" : "smooth" }); }));
    document.querySelector(".kbar .brand").addEventListener("click", (e) => { e.preventDefault(); go(0); });
    const modal = () => !idx.hidden || !room.hidden || !document.getElementById("lb").hidden;
    /* hands-off show: it plays by itself with no controls on screen; the first key, click, wheel, touch or mouse move
       stops it on the chapter in view (that input does nothing else). After that, arrows and scroll step by hand and Space resumes. */
    let moved = 0, mx = null, my = null, haltTouch = false;
    const halt = () => { if (!playing) return false; setPlay(false); glide = null; TT = null; vel = 0; return true; };
    window.addEventListener("keydown", (e) => { if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return; if (halt()) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    window.addEventListener("wheel", (e) => { if (halt()) { e.preventDefault(); e.stopImmediatePropagation(); } }, { capture: true, passive: false });
    window.addEventListener("pointerdown", (e) => { if (halt() && e.pointerType !== "mouse") haltTouch = true; }, true);
    window.addEventListener("touchstart", () => { if (halt()) haltTouch = true; }, { capture: true, passive: true });
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || !playing) return;
      if (mx !== null) moved += Math.abs(e.clientX - mx) + Math.abs(e.clientY - my); mx = e.clientX; my = e.clientY;
      if (moved > 14) { moved = 0; halt(); }
    }, true);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { if (!room.hidden) closePanel(room); else if (!idx.hidden) closePanel(idx); return; }
      if (modal() || e.metaKey || e.ctrlKey || e.altKey) return;
      if (["ArrowRight", "ArrowDown", "PageDown", "Enter"].includes(e.key)) { e.preventDefault(); next(); }
      else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); prev(); }
      else if (e.key === " ") { e.preventDefault(); setPlay(!playing); }
      else if (e.key === "Home") go(0); else if (e.key === "End") go(S.length - 1);
    });
    /* scroll and swipe scrub the tour clock; it plays on by itself after a short rest */
    const scrubOk = (el) => !el.closest(".globe__stage, .fly__bar, .room, .kidx, .mpop, button, a");
    stage.addEventListener("wheel", (e) => {
      if (modal() || !scrubOk(e.target)) return; e.preventDefault(); glide = null;
      const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      TT = Math.max(0, Math.min(TOTAL - .05, (TT === null ? T : TT) + dy * .011)); holdUntil = performance.now() + 1600; lastScrub = performance.now();
    }, { passive: false });
    let ty = 0, tt0 = 0, tOk = false, tv = 0;
    stage.addEventListener("touchstart", (e) => { tOk = scrubOk(e.target) && !haltTouch; haltTouch = false; ty = e.touches[0].clientY; tt0 = performance.now(); tv = 0; vel = 0; glide = null; }, { passive: true });
    stage.addEventListener("touchmove", (e) => {
      if (!tOk) return; const y = e.touches[0].clientY, dy = ty - y, now = performance.now(); ty = y;
      const ds = dy * .022; TT = Math.max(0, Math.min(TOTAL - .05, (TT === null ? T : TT) + ds)); tv = ds / Math.max(.008, (now - tt0) / 1000); tt0 = now; holdUntil = now + 1800; lastScrub = now;
    }, { passive: true });
    stage.addEventListener("touchend", () => { if (tOk) vel = Math.max(-14, Math.min(14, tv * .45)); }, { passive: true });
    /* exploring a 3D scene by hand pauses the show */
    document.querySelectorAll(".globe__stage").forEach((el) => el.addEventListener("pointerdown", () => playing && setPlay(false)));
    document.querySelectorAll("#flyTicks, #flyRestart").forEach((el) => el.addEventListener("click", () => { if (!playing) setPlay(true); }));

    const start = S.findIndex((s) => s.id === location.hash.slice(1));
    /* the tour is a timed show: animations follow the wall clock, never stretched on a slow frame */
    if (window.gsap) window.gsap.ticker.lagSmoothing(0);
    /* masked headings: every headline in the deck and the data room */
    const heads = (root) => [...root.querySelectorAll(".masked-heading")].filter((h) => h.__mh);
    if (window.RB && window.RB.MaskedHeading) document.querySelectorAll("#stage .say, #stage .open__h, #room .h2").forEach((h) => {
      const m = window.RB.MaskedHeading(h, {}); if (m) { h.__mh = m; if (h.closest("#room")) { const io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { m.play(); io.disconnect(); } }, { threshold: .25 }); io.observe(h); } }
    });
    /* ambient motion: GhostFibers behind the stage, AeroShards in the finale (WebGPU), fibers as its fallback */
    const fxEl = $("fxFibers"); let fib = null, aero = null, drape = null; fibRef = () => fib;
    function fx(s) {
      const want = s && s.el.dataset.fx;
      if (!fib && window.RB && window.RB.GhostFibers && fxEl) {
        const coarse = matchMedia("(pointer: coarse)").matches;
        fib = window.RB.GhostFibers(fxEl, { glowColor: "#ff7a1a", lineColor: "#ffd9b8", secondaryColor: "#a8461c", speed: .32, rotation: 14, layers: 3, threads: coarse ? 44 : 68, waves: 1.1, twist: 1.1, particles: .45, sparkle: .55, glow: .85, brightness: .95, vignette: .5, grain: .05, depthOfField: .9, fiberStyle: "dots", dpr: coarse ? 1 : 1.5 });
      }
      if (fib) fib.set({ paused: want !== "fibers" });
      stage.dataset.fx = want || "";
      /* Spectral Drape: a folding field of dots behind the brands chapter and the finale */
      if (want === "drape" && !drape && window.SpectralDrape) drape = window.SpectralDrape($("fxDrape"), { colors: ["#6e2406", "#ff9a4a"], strands: 8, depth: 1.1, colorShift: .35, intensity: .55, dotSize: .8, tilt: -42, turn: -38, roll: 112, flow: .8 });
      if (drape) want === "drape" ? drape.start() : drape.stop();
      if (want === "aero" && !aero && navigator.gpu && window.RB.AeroShards) {
        aero = "loading";
        window.RB.AeroShards($("fxAero"), { shardColor: "#ff9a4a", accentColor: "#ffd2ad", material: "glass", count: 1100, markers: "plus", glow: .55, vignette: .45, grain: .05, speed: .8, mouseStrength: .5, onError: () => { stage.classList.add("no-aero"); } })
          .then((a) => { aero = a; stage.classList.add("has-aero"); }).catch(() => stage.classList.add("no-aero"));
      }
    }
    $("kSpeed").addEventListener("click", () => { speed = speed === 1 ? 1.5 : speed === 1.5 ? .75 : 1; $("kSpeed").textContent = speed + "×"; });
    sheet();
    window.addEventListener("load", () => setTimeout(sheet, 400));
    const startK = start >= 0 ? start : 0;
    setPlay(playing); T = cues[cueIndex(startK, 0)].t0; apply(true);
    requestAnimationFrame(tick);
    window.__deck = { go: (k, bb = 0) => go(k, bb, "jump"), glide: (k, bb = 0) => go(k, bb), seek: (tm) => seekTo(tm, "jump"), next, prev, setPlay, setSpeed: (v) => { speed = v; }, state: () => ({ i, b, id: S[i].id, playing, T: +T.toFixed(2), total: +TOTAL.toFixed(2) }), cues: () => cues.map((c) => ({ id: S[c.i].id, b: c.b, t0: +c.t0.toFixed(2), d: +c.d.toFixed(2) })) };
  })();

