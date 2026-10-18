    /* the derivation — Al Qadisiyah only. Sales come from the 21 owners in the workbook's "ALL information"
       sheet (self-reported). Al Shifa's sales model is not finished, so it is never extrapolated. */
    const dd = DATA.sales.map(([name, sold, fpr, inv, asp]) => ({ name, sold, fpr, inv, asp })).filter((d) => d.sold && d.inv);
    const QR = R.filter((r) => r.mk === 0), SR = R.filter((r) => r.mk === 1);
    const U = sum(QR.map((r) => r.units)), US = sum(SR.map((r) => r.units));
    const ddU = sum(dd.map((d) => d.inv)), ddS = sum(dd.map((d) => d.sold));
    const ST = ddS / ddU, FIN = sum(dd.map((d) => d.sold * (d.fpr || 0))) / ddS;
    const lostRows = deep.filter((d) => d.mk === 0 && d.sold && d.lost != null);
    const LOST = sum(lostRows.map((d) => d.lost)) / sum(lostRows.map((d) => d.sold));
    const priced = QR.filter((r) => r.units != null && r.asp != null);
    const aspOf = (rows) => sum(rows.map((r) => r.units * r.asp)) / sum(rows.map((r) => r.units));
    const ASP = aspOf(priced);
    let seed = 20261018;
    const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const BS = { st: [], fin: [] };
    for (let b = 0; b < 2000; b++) { let u = 0, s = 0, f = 0; for (let i = 0; i < dd.length; i++) { const d = dd[Math.floor(rnd() * dd.length)]; u += d.inv; s += d.sold; f += d.sold * (d.fpr || 0); } BS.st.push(s / u); BS.fin.push(f / s); }
    const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
    const ci = (a) => [pct(a, 0.025), pct(a, 0.975)];
    const ciSt = ci(BS.st), ciFin = ci(BS.fin), ciLost = [LOST, LOST], ciGmv = [0, 0];
    const soldHi = U * ST, consSold = ddS + (U - ddU) * ST / 2;
    const sold = consSold, finN = sold * FIN, cashN = sold - finN, lostN = sold * LOST;          /* headline = conservative case */
    const gmvY = sold * ASP * 12, gmvHi = soldHi * ASP * 12, gmvTop = U * ciSt[1] * ASP * 12, finY = finN * ASP * 12, lostY = lostN * ASP * 12;
    const consY = gmvY, intGmvY = sum(dd.map((d) => d.sold * d.asp)) * 12;
    ciGmv[0] = gmvY; ciGmv[1] = gmvTop;
    Object.assign(DV, { ciSt, ciFin, ciLost, ciGmv, soldHi, gmvHi, gmvTop, intGmvY, ddS, ddU, nInt: dd.length, US });
    const EXT = Object.fromEntries((DATA.ext || []).map((e) => [e.id, e]));
    const regRiy = EXT.riyadh_reg_2024 ? EXT.riyadh_reg_2024.value : null;
    const dist = [{ u: U, sold, gmv: sold * ASP }, { u: US, sold: null, gmv: null }];
    const perSales = DATA.facts.carsPerSalesman * ST, salesforce = null, turn = 30 / ST;
    const B = (n) => "SAR " + (n / 1e9).toFixed(1) + "B", Mo = (n) => "SAR " + (n / 1e9 >= 1 ? (n / 1e9).toFixed(2) + "B" : Math.round(n / 1e6) + "M"), k1 = (n) => (n / 1000).toFixed(1) + "k";
    const P = (x) => Math.round(x * 100) + "%";
    function rangeBar(lo, hi, mid, cons, min, max, fmtV, loLbl, hiLbl) {
      const at = (v) => (Math.max(0, Math.min(1, (v - min) / (max - min))) * 100).toFixed(2) + "%";
      return `<div class="rng"><span class="rng__band" style="left:${at(lo)};width:calc(${at(hi)} - ${at(lo)})"></span>${cons != null ? `<span class="rng__lo" style="left:${at(cons)}"></span>` : ""}<span class="rng__mid" style="left:${at(mid)}"></span></div><div class="rng__lbl"><i class="b">${loLbl || fmtV(lo)} to ${hiLbl || fmtV(hi)}</i>${cons != null ? `<i>Conservative ${fmtV(cons)}</i>` : ""}</div>`;
    }

    /* the five beats */
    const shareReg = regRiy ? consSold * 12 / regRiy : null;
    const steps = [
      { n: fmt(U), u: "cars", t: `on Al Qadisiyah floors, <em>counted</em> one by one`, m: `A physical count on ${fmt(QR.filter((r) => r.units).length)} of ${fmt(QR.length)} floors. Al Shifa adds another <b>${fmt(US)}</b>; its sales model is not finished, so everything below is Al Qadisiyah only.`, c: mchip("inventory_Q") },
      { n: `${k1(consSold)}–${k1(soldHi)}`, u: "a month", t: `cars leave Al Qadisiyah floors <em>every month</em>`, m: `${dd.length} owners reported <b>${fmt(ddS)}</b> sales a month on ${fmt(ddU)} cars: ${P(ST)} of their floor. If every floor sold at that pace: ${k1(soldHi)}. If the floors we did not interview sold at half that pace: ${k1(consSold)}.`, r: rangeBar(consSold, U * ciSt[1], soldHi, consSold, 5000, 25000, k1), c: mchip("est_sales_Q") },
      { n: P(FIN), u: "financed", t: `of the cars these owners sell leave on a <em>bank or lender plan</em>`, m: `Owner-reported finance share across ${dd.length} floors (median floor ${P(DATA.metrics.find((m) => m.id === "int_fpr_median_Q").value)}). The rest is cash.`, r: rangeBar(ciFin[0] * 100, ciFin[1] * 100, FIN * 100, null, 30, 80, (v) => Math.round(v) + "%"), c: mchip("int_fpr_Q") },
      { n: (LOST * 10).toFixed(1), u: "per 10 sold", t: `ready buyers <em>walk away</em> when financing falls through`, m: `Reported by ${lostRows.length} owners in sit-downs: ${fmt(sum(lostRows.map((d) => d.lost)))} buyers lost a month against ${fmt(sum(lostRows.map((d) => d.sold)))} cars sold. Each faint dot rising off the floor is one of them.`, c: mchip("int_lost_ratio_Q") },
      { n: `${B(gmvY).replace("B", "")}–${(gmvHi / 1e9).toFixed(1)}B`, u: "a year", t: `in sub-dealer sales from <em>one district</em> (estimate)`, m: `Monthly sales × SAR ${fmt(ASP)} stock-weighted stated price × 12. The ${dd.length} interviewed floors alone report <b>${B(intGmvY)}</b> a year.${shareReg ? ` Cross-check: even the conservative case equals ${P(shareReg)} of every new vehicle registered in Riyadh Region in 2024 (${fmt(regRiy)}, GASTAT); buyers come from beyond Riyadh and used cars are included, but treat these totals as upper bounds.` : ""}`, r: rangeBar(gmvY / 1e9, gmvTop / 1e9, gmvHi / 1e9, gmvY / 1e9, 5, 40, (v) => v.toFixed(1) + "B"), c: mchip("est_gmv_Q") },
    ];
    $("szSteps").innerHTML = steps.map((s, i) => `<div class="size__step${i ? "" : " on"}"><p class="size__k">Derivation <b>0${i + 1} / 05</b>${s.c}</p><p class="size__n${s.n.length > 7 ? " size__n--long" : ""}">${s.n}<small>${s.u}</small></p><p class="size__t">${s.t}</p><p class="size__m">${s.m}</p>${s.r ? `<div class="size__r">${s.r}</div>` : ""}</div>`).join("");
    $("szRail").innerHTML = steps.map((_, i) => `<span${i ? "" : ' class="on"'}></span>`).join("");
    $("szRingS").textContent = `Al Qadisiyah · conservative estimate · up to ${B(gmvHi)}`;
    const stepEls = [...$("szSteps").children], railEls = [...$("szRail").children];

    /* derived-values grid (data room) */
    const qs = stock(QR) / (stock(QR) + stock(SR));
    $("dvGrid").innerHTML = [
      `<div class="dv__c dv__c--big"><span class="dv__tag">Market size · Al Qadisiyah</span>${mchip("est_gmv_Q")}<p class="dv__l">Annual sub-dealer sales (estimate)</p><p class="dv__v num">${B(gmvY)}<small>to ${B(gmvHi)}</small></p>${rangeBar(gmvY / 1e9, gmvTop / 1e9, gmvHi / 1e9, gmvY / 1e9, 5, 40, (v) => "SAR " + v.toFixed(1) + "B")}<p class="dv__h">Low end: floors we did not interview sell at half the interviewed pace. High end: every floor sells at that pace (band shows its 95% sampling range). Al Shifa is not estimated.</p></div>`,
      `<div class="dv__c"><span class="dv__tag">Observed</span>${mchip("int_sold_Q")}<p class="dv__l">Monthly sales, ${dd.length} interviewed floors</p><p class="dv__v num">${fmt(ddS)}<small>cars</small></p><p class="dv__h">${B(intGmvY)} a year at their own stated prices. Owner-reported, not audited.</p></div>`,
      `<div class="dv__c"><span class="dv__tag">Velocity</span>${mchip("int_days_Q")}<p class="dv__l">Days to sell the floor once</p><p class="dv__v num">${Math.round(turn)}<small>days</small></p><p class="dv__h">On the interviewed floors: ${fmt(ddS)} sold a month against ${fmt(ddU)} in stock.</p></div>`,
      `<div class="dv__c"><span class="dv__tag">Credit</span>${mchip("int_fpr_Q")}<p class="dv__l">Share of sales financed</p><p class="dv__v num">${P(FIN)}</p><p class="dv__h">Range ${P(ciFin[0])} to ${P(ciFin[1])} across resamples of the ${dd.length} owners.</p></div>`,
      `<div class="dv__c"><span class="dv__tag">Lost demand</span>${mchip("int_lost_ratio_Q")}<p class="dv__l">Buyers lost per 10 sold</p><p class="dv__v num">${(LOST * 10).toFixed(1)}</p><p class="dv__h">${lostRows.length} sit-downs. On their floors that is SAR ${Math.round(DATA.facts.lostSar / 1e6)}M of sales a month at floor prices.</p></div>`,
      `<div class="dv__c"><span class="dv__tag">People</span>${mchip("cars_per_staff_Q")}<p class="dv__l">Cars per salesperson</p><p class="dv__v num">${DATA.facts.carsPerSalesman}</p><p class="dv__h">${fmt(DATA.facts.salesmen)} salespeople counted on ${DATA.facts.salesmenN} Al Qadisiyah floors. Not recorded in Al Shifa.</p></div>`,
      `<div class="dv__c"><span class="dv__tag">Inventory</span>${mchip("stockvalue_total")}<p class="dv__l">Value of cars on the floor today</p><p class="dv__v num">${B(stock(R))}</p><p class="dv__h">Both districts, each floor's count × its stated average price.</p></div>`,
      `<div class="dv__c dv__c--big dv__c--wide"><span class="dv__tag">Two markets</span>${mchip("stockvalue_Q")}<p class="dv__l">Stock value on display by district (observed counts × stated prices)</p><div class="dv__sl"><span><b style="color:var(--ink)">Al Qadisiyah</b> ${Mo(stock(QR))}</span><span><b style="color:var(--ink)">Al Shifa</b> ${Mo(stock(SR))}</span></div><div class="dv__split"><i style="width:${(qs * 100).toFixed(1)}%;background:var(--qad)"></i><i style="flex:1;background:var(--shf)"></i></div><div class="dv__sl"><span>${fmt(U)} cars · ${P(qs)} of value</span><span>${fmt(US)} cars · ${P(1 - qs)}</span></div><p class="dv__h">Sales value by district is not compared: Al Shifa's sales model is still being built.</p></div>`,
    ].join("");
    $("dvMethod").innerHTML = [
      `<li><b>Census.</b> ${fmt(R.length)} showroom records: ${fmt(QR.length)} in Al Qadisiyah, ${fmt(SR.length)} in Al Shifa (one duplicate removed), from the finalised field-mapping workbook.</li>`,
      `<li><b>Stock</b> is the counted inventory on ${fmt(R.filter((r) => r.units).length)} floors. Prices are each dealer's stated average selling price, not transaction prices.</li>`,
      `<li><b>Sales</b> come from ${dd.length} Al Qadisiyah owners (workbook "ALL information"), self-reported and unaudited. Lost buyers come from ${lostRows.length} field-app sit-downs.</li>`,
      `<li><b>Estimates</b> apply the interviewed pace to Al Qadisiyah only. The low end assumes other floors sell at half that pace; the high end band is the 95% range from 2,000 resamples (sampling noise only).</li>`,
      `<li><b>Bias.</b> Owners who agreed to talk may run busier floors, and many buyers come from outside Riyadh. The external cross-check suggests district totals are upper bounds.</li>`,
      `<li><b>Al Shifa</b> sales are not estimated: the calculation is unfinished and its dynamics differ (${fmt(DATA.facts.cashOnlyS)} of ${fmt(DATA.facts.cashAnsS)} floors sell for cash only).</li>`,
    ].join("");
