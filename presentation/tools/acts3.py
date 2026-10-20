"""Film v3: rebuild Act I and Act III with the full-size field photos, the new flyby clips and the stacked-story sections."""
import os
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(S, "portfolio", "act.html"); s = open(p).read()
a = s.index('if (ACT === "1") {'); b = s.index("/* timeline: scenes overlap")
NEW = r'''if (ACT === "1") {
/* S1: opening triptych of the drive-by footage */
scene(7.6, (r) => {
  const P = [["c2640", 677], ["c2622", 348], ["c2623", 156]], W = 600, H = 1240, xs = [70, 660, 1250];
  const ps = P.map(([c], i) => panel(r, xs[i], -80, W, H, `bogpan/${c}/f0001.jpg`));
  r.appendChild($(`<div class="shade-b"></div>`));
  const c = $(`<div class="copy" style="bottom:120px;width:1100px"><p class="kick">Pre-launch · Riyadh fieldwork</p><h1>${words("Built on <em>the ground.</em>")}</h1><p class="sub" style="max-width:820px">Before launch, two people set out to learn Riyadh's independent car market. Door to door.</p></div>`); r.appendChild(c);
  return (t) => {
    ps.forEach((p, i) => { seq(p, P[i][0], P[i][1], Math.max(0, t - .15 * i), .62); enter(p, t, .1 + i * .22, 1.2); });
    rise(c.querySelector("h1"), t, 1.2, .1); fade(c.querySelector(".kick"), t, .9); fade(c.querySelector(".sub"), t, 2.2);
  };
});
/* S2: the founder's vision */
scene(7.0, (r) => {
  const v = panel(r, 1000, -60, 820, 1200, "bogpan/c2629/f0001.jpg");
  const cp = $(`<div class="copy" style="top:200px;width:780px"><p class="kick">The founder's vision</p><h2>${words("Map a market <em>no one had mapped.</em>")}</h2>
    <p class="sub">Our founder and CEO, Leon, set the task: understand Riyadh's sub-dealer market, showroom by showroom.</p></div>`); r.appendChild(cp);
  return (t) => { seq(v, "c2629", 151, t, .7); enter(v, t, .1, 1.2, -1); fade(cp.querySelector(".kick"), t, .2); rise(cp.querySelector("h2"), t, .35, .08); fade(cp.querySelector(".sub"), t, 1.8); };
});
/* S3: a small team, a critical mandate */
scene(7.0, (r) => {
  const a = panel(r, 980, 110, 820, 520, "bp3/review1.jpg"), b = panel(r, 1010, 660, 430, 330, "bp3/selfie_kafd.jpg"), c = panel(r, 1470, 660, 380, 330, "bp3/car_laptop.jpg");
  const cp = $(`<div class="copy" style="top:150px"><p class="kick">Early team · Pre-launch</p><h2>${words("A small team. <em>A critical mandate.</em>")}</h2>
    <p class="sub">In retail, the team was two people: a retail executive and the director of retail.</p>
    <div class="chips"><div class="chip"><b>A few</b><span>people company-wide</span></div><div class="chip"><b>2</b><span>people in retail</span></div><div class="chip"><b>1</b><span>field mission</span></div></div></div>`); r.appendChild(cp);
  return (t) => {
    [a, b, c].forEach((p, i) => { enter(p, t, .2 + i * .25, 1.1); kb(p, t, 7, 1.04, 1.13, i % 2 ? -20 : 20); });
    fade(cp.querySelector(".kick"), t, .2); rise(cp.querySelector("h2"), t, .35, .08); fade(cp.querySelector(".sub"), t, 1.6);
    cp.querySelectorAll(".chip").forEach((x, i) => fade(x, t, 2.4 + i * .25, .7, 30));
  };
});
/* S4: into the market */
scene(7.4, (r) => {
  const v = panel(r, 1220, -40, 560, 1160, "bogpan/c2636/f0001.jpg"), a = panel(r, 760, 110, 470, 400, "bp3/saber.jpg"), b = panel(r, 700, 560, 480, 420, "bp3/wadi.jpg");
  r.appendChild($(`<div class="shade-l" style="background:linear-gradient(90deg,rgba(7,2,0,.97) 0%,rgba(7,2,0,.9) 30%,rgba(7,2,0,0) 44%)"></div>`));
  const cp = $(`<div class="copy" style="top:130px;width:560px"><p class="kick">On-field research</p><h2>${words("Into the <em>market.</em>")}</h2>
    <div class="verbs">${["Visit.", "Observe.", "Ask.", "Document.", "Repeat."].map((x) => `<div class="verb">${x}</div>`).join("")}</div>
    <p class="sub" style="font-size:24px">Ground truth had to be collected in person.</p></div>`); r.appendChild(cp);
  return (t) => {
    seq(v, "c2636", 108, t, .55); enter(v, t, .05, 1.1); [a, b].forEach((p, i) => { enter(p, t, .35 + i * .25, 1.1, -1); kb(p, t, 7.4, 1.05, 1.15); });
    fade(cp.querySelector(".kick"), t, .1); rise(cp.querySelector("h2"), t, .2, .1);
    cp.querySelectorAll(".verb").forEach((x, i) => { const on = t > 1.4 + i * .62; x.classList.toggle("on", on); x.classList.toggle("now", on && t < 1.4 + (i + 1) * .62); x.style.transform = `translateX(${(1 - eo(ramp(t, 1.4 + i * .62, .5))) * -30}px)`; });
    fade(cp.querySelector(".sub"), t, 4.9);
  };
});
/* S5: day and night, as a stacked story */
scene(4 * 2.5 + .6, (r) => stack(r, [
  ["bp3/avenue2.jpg", "Daylight · Al Qadisiyah", "Door after door, <em>down the avenue.</em>", "Every showroom on the strip, visited and logged.", "Day", 62],
  ["bp3/fullspeed.jpg", "Daylight · the survey route", "Every sign, <em>every floor.</em>", "Names, stock and location, recorded at the door.", "Survey", 58],
  ["bp3/nightlot.jpg", "After dark · Al Shifa", "The market <em>trades at night.</em>", "So the survey carried on after sunset.", "Night", 72],
  ["bp3/dusk_prayer.jpg", "Dusk · between visits", "Prayer on <em>the showroom walk.</em>", "Long days, in the market's own rhythm.", "Dusk", 70],
], 2.5));
/* S6: every floor is different: the specialisations */
scene(4 * 2.5 + .6, (r) => stack(r, [
  ["bp3/trucks.jpg", "Specialists 01 · Commercial", "Fleet <em>trucks.</em>", "Some floors sell nothing but refrigerated trucks and light commercial vehicles.", "Trucks", 88],
  ["bp3/ambul.jpg", "Specialists 02 · Emergency service", "Ambulances <em>on the lot.</em>", "Others stock ambulances and service vehicles, by the row.", "Emergency", 62],
  ["bp3/adini.jpg", "Specialists 03 · Luxury", "Flagships, <em>under the lights.</em>", "A few hold only luxury sedans.", "Luxury", 70],
  ["bp3/covered.jpg", "Specialists 04 · Everyday", "The <em>everyday</em> floor.", "Most move the cars Riyadh drives every day.", "Volume", 70],
], 2.5));
/* S7: capturing ground truth — the windscreen notices */
scene(7.6, (r) => {
  const m = panel(r, 1420, 110, 400, 380, "bogph/054.jpg"), n = panel(r, 1400, 530, 420, 440, "bogph/048.jpg"), s = panel(r, 820, 110, 580, 860, "bogph/050.jpg");
  const co = $(`<div class="callout" style="left:120px;top:720px;width:600px"><small>On the windscreen · 2025 Rolls-Royce Spectre, 6,000 km</small><b>SAR 1,550,000</b><span>Asking prices, mileage and model year, read off the floor.</span></div>`); r.appendChild(co);
  const cp = $(`<div class="copy" style="top:150px;width:640px"><p class="kick">Field survey · Data collection</p><h2>${words("Capturing <em>ground truth.</em>")}</h2>
    <p class="sub" style="font-size:26px">Windscreen notices and showroom floors confirmed what desk research could not.</p></div>`); r.appendChild(cp);
  return (t) => {
    enter(s, t, .1, 1.1); enter(m, t, .4, 1, -1); enter(n, t, .65, 1, -1);
    s._img.style.transform = `translate(-50%, calc(-50% + ${-40 * eio(ramp(t, 1.4, 4))}px)) scale(${1.02 + .22 * eio(ramp(t, 1.4, 4))})`; kb(m, t, 7.6, 1.04, 1.12); kb(n, t, 7.6, 1.04, 1.1);
    fade(co, t, 2.4, .8, 30); fade(cp.querySelector(".kick"), t, .1); rise(cp.querySelector("h2"), t, .2, .1); fade(cp.querySelector(".sub"), t, 1.4);
  };
});
/* S8: the turn to the data */
scene(3.8, (r) => {
  r.querySelector(".glow").style.opacity = .5;
  const c = $(`<div class="center"><h2 style="font-size:104px">${words("This is <em>what they found.</em>")}</h2><div class="line" style="position:relative;width:520px;margin-top:40px"></div></div>`); r.appendChild(c);
  return (t) => { rise(c.querySelector("h2"), t, .2, .1, 1); c.querySelector(".line").style.transform = `scaleX(${eio(ramp(t, 1.1, 1.4))})`; };
});
} else {
/* C1: from field to system: AutoLink, analysis, meetings, training */
scene(5 * 2.4 + .6, (r) => stack(r, [
  ["bp3/portal_screen.jpg", "01 / 05 · Introducing AutoLink", "The <em>portal</em>, on the big screen.", "Field knowledge, turned into a system dealers could use.", "AutoLink", 45],
  ["bp3/review1.jpg", "02 / 05 · Initial analysis", "From notes <em>to insight.</em>", "Every visit reviewed, organised and fed into the model.", "Analysis", 50],
  ["bp3/meet.jpg", "03 / 05 · Dealership meetings", "Across <em>the table.</em>", "Meetings with dealer groups, face to face.", "Meetings", 50],
  ["bp3/train2.jpg", "04 / 05 · System training", "Training <em>the sales teams.</em>", "Showroom staff, walked through the portal step by step.", "Training", 55],
  ["bp3/office.jpg", "05 / 05 · In the dealer's office", "Over coffee <em>and dates.</em>", "Where the real conversations happen.", "Dealers", 55],
], 2.4));
/* C2: the people behind the work */
scene(3 * 2.4 + .6, (r) => stack(r, [
  ["bp3/pair.jpg", "People · Presence · Persistence", "The people <em>behind the work.</em>", "Real people, who kept showing up.", "People", 40],
  ["bp3/dinner3.jpg", "Partners", "Relationships, <em>not just records.</em>", "Built at the table as much as on the floor.", "Partners", 50],
  ["bp3/dinner2.jpg", "One team", "Everyone <em>who carried it.</em>", "Together, from the field to the launch.", "Team", 55],
], 2.4));
/* C3: the foundation was built here */
scene(9.6, (r) => {
  const p = panel(r, 0, 0, 1920, 1080, "bp3/sunset.jpg"); p.style.boxShadow = "none"; p._img.style.filter = "saturate(1.1) brightness(.6)";
  r.appendChild($(`<div style="position:absolute;inset:0;background:radial-gradient(70% 70% at 50% 50%,rgba(7,2,0,.3),rgba(7,2,0,.88))"></div>`));
  const c = $(`<div class="center"><p class="kick" style="justify-content:center">Contribution · Resilience · Impact</p><h2 style="font-size:112px">${words("The foundation <em>was built here.</em>")}</h2>
    <p class="quote">The earliest contribution is not always the most visible. Sometimes it is the one everything else stands on.</p><p class="small">Our founder's vision, carried out on the ground · the field research behind AutoLink</p></div>`); r.appendChild(c);
  return (t) => {
    kb(p, t, 9.6, 1.0, 1.12, 0, 20); p.style.opacity = eo(ramp(t, 0, 1.2));
    fade(c.querySelector(".kick"), t, .5); rise(c.querySelector("h2"), t, .8, .1, 1.1); fade(c.querySelector(".quote"), t, 3.2, 1.2, 20); fade(c.querySelector(".small"), t, 5.2, 1);
  };
});
}

'''
s = s[:a] + NEW + s[b:]
s = s.replace('const bo = ACT === "1" ? 1 : 0;', 'const bo = ACT === "1" ? 1 : 0;', 1)
open(p, "w").write(s); print("ok")
