// Schedule engine: teacher hours, double-booking checks, Admin > Schedule check, student booking guards.
// Run: node tools/tests/schedule_engine.test.js (needs jsdom, see tools/README.md)
const src = require("fs").readFileSync(__dirname + "/student_portal.test.js", "utf8");
eval(src.slice(0, src.indexOf('(async () => {\n  console.log("== 1.')) + `
const mins2 = t => { const [a, b] = t.split(":"); return +a * 60 + +b; };
const wdi2 = d => (new Date(d + "T12:00:00").getDay() + 6) % 7;
const datesBetween = (a, b) => { const o = []; for (let d = new Date(a + "T12:00:00"); d <= new Date(b + "T12:00:00"); d.setDate(d.getDate() + 1)) if ((d.getDay() + 6) % 7 < 5) o.push(d.toISOString().slice(0, 10)); return o; };
// ---- independent model of Module E straight from the raw data
const TERM = NOV, SL = TERM.ft.slots;
const classIv = {}; // teacher -> weekday -> [{s,e,label}]
TERM.sections.forEach(sec => TERM.grid.forEach((day, w) => day.forEach((groups, pi) => groups.forEach(g => { if (g.includes(sec.course)) ((classIv[_c(sec.teacher)] ??= {})[w] ??= []).push({s: mins2(TERM.periods[pi + 1][0]), e: mins2(TERM.periods[pi + 1][1])}); }))));
const days = datesBetween(TERM.start, TERM.end), r2 = n => Math.round(n * 100) / 100;
const expClassWeek = (t, ds) => r2(ds.reduce((s, d) => s + (classIv[t]?.[wdi2(d)] || []).reduce((x, c) => x + (c.e - c.s) / 60, 0), 0));
const WK = datesBetween("2026-11-09", "2026-11-13");
const expClass = t => r2(days.reduce((s, d) => s + (classIv[t]?.[wdi2(d)] || []).reduce((x, c) => x + (c.e - c.s) / 60, 0), 0));
const blockedCell = (t, w, i) => (classIv[t]?.[w] || []).some(c => c.s < mins2(SL[i][1]) && c.e > mins2(SL[i][0]));
const expOffered = (t, lo, hi) => r2(days.reduce((s, d) => { const w = wdi2(d), st = (TERM.ft.days[w] || {})[t]; if (!st) return s; let h = 0; for (let i = lo; i < hi; i++) if (st[i] === "o" && !blockedCell(t, w, i)) h += (mins2(SL[i][1]) - mins2(SL[i][0])) / 60; return s + h; }, 0));
(async () => {
  console.log("== Admin > Schedule check page ==");
  let d = await load("schedule-check", {role: "admin", user: "u3"}); let doc = d.window.document, E = d.window.CELS;
  ok(d.errors.length === 0, "page loads with no script errors " + d.errors.join(";"));
  const navTxt = txt(doc.body); const ORIG = ["Dashboard", "Users", "Placement", "IELTS", "Courses", "Content", "Enrollments", "Appointments", "Progress", "Results", "Reports", "Workload", "Messages", "Forms", "Settings"];
  ok(ORIG.every(n => navTxt.includes(n)), "all 15 existing admin menu items are still there"); ok(navTxt.includes("Schedule check"), "'Schedule check' menu item added");
  ok(E.C.nav.admin.length === 17 && E.C.nav.admin.some(n => n[0] === "schedule-check") && E.C.nav.admin.some(n => n[0] === "alerts"), "admin menu: the 15 original items plus Schedule check and Alerts (" + E.C.nav.admin.length + ")");
  const S = E.sched; ok(!!S && !!doc.querySelector("#sc_r"), "engine loaded and the page is drawn");
  eq(doc.querySelector("#sc_r").value, "nov", "default period is Module E");
  console.log("== Hours: engine vs independent calculation (Module E, every teacher) ==");
  const teachers = S.teachers(); ok(teachers.length >= 35, "teacher list: " + teachers.length);
  ok(!teachers.includes("Zie") && teachers.includes("Fritzie"), "Zie is Fritzie: one teacher, not two (from the faculty workbook)");
  const zieClass = r2(NOV.sections.filter(s => s.teacher === "Zie").reduce((a, sec) => a + days.reduce((x, dd) => x + NOV.grid[wdi2(dd)].reduce((y, groups, pi) => y + (groups.some(g => g.includes(sec.course)) ? (mins2(NOV.periods[pi + 1][1]) - mins2(NOV.periods[pi + 1][0])) / 60 : 0), 0), 0), 0));
  ok(zieClass > 0 && S.hours("Fritzie", TERM.start, TERM.end).class === zieClass, "Fritzie's class hours are Zie's classes (" + zieClass + " h)");
  ok(S.check("Fritzie", "2026-11-10", "08:30", "10:00").some(x => x.kind === "class"), "Fritzie is busy during Zie's class");
  let badC = 0, badF = 0, badO = 0; const miss = [];
  for (const t of teachers) { const h = S.hours(t, TERM.start, TERM.end);
    if (h.class !== expClass(t)) { badC++; miss.push(t + " class " + h.class + " vs " + expClass(t)); }
    if (h.ftOffered !== expOffered(t, 0, 12)) { badF++; miss.push(t + " ft " + h.ftOffered + " vs " + expOffered(t, 0, 12)); }
    if (h.ooOffered !== expOffered(t, 12, 14)) { badO++; miss.push(t + " oo " + h.ooOffered + " vs " + expOffered(t, 12, 14)); } }
  ok(badC === 0 && badF === 0 && badO === 0, "class / Free Talk / 1-on-1 hours match for all " + teachers.length + " teachers " + miss.slice(0, 3).join("; "));
  const totalClass = r2(teachers.reduce((s, t) => s + S.hours(t, TERM.start, TERM.end).class, 0));
  const expTotal = r2(TERM.sections.reduce((s, sec) => s + days.reduce((x, dd) => x + TERM.grid[wdi2(dd)].reduce((y, groups, pi) => y + (groups.some(g => g.includes(sec.course)) ? (mins2(TERM.periods[pi + 1][1]) - mins2(TERM.periods[pi + 1][0])) / 60 : 0), 0), 0), 0));
  eq(totalClass, expTotal, "total class hours = every section x every class day x period length");
  eq(S.hours("Elisa", "2026-11-09", "2026-11-13").class, expClassWeek("Elisa", WK), "Elisa, week of Nov 9: class hours match the independent count (" + expClassWeek("Elisa", WK) + " h; her two simultaneous classes are both counted and flagged below)");
  eq(S.hours("Claire", "2026-11-09", "2026-11-13").class, expClassWeek("Claire", WK), "Claire, week of Nov 9: class hours match the independent count (" + expClassWeek("Claire", WK) + " h)");
  console.log("== Conflicts found ==");
  const a = S.audit(TERM.start, TERM.end);
  eq(a.clashes.map(g => g.teacher + "|" + g.day).sort(), ["Elisa|0", "Elisa|2", "Elisa|3", "Elisa|4"], "class clashes: only Elisa (Mon, Wed, Thu, Fri), nothing else");
  ok(a.clashes.every(g => /Grammar Builder/.test(g.what) && /Filipino/.test(g.what)), "the clash is Grammar Builder vs Filipino");
  const expOff = []; TERM.sections && Object.keys(TERM.ft.days[0]).forEach(t => { for (let w = 0; w < 5; w++) for (let i = 0; i < 14; i++) if (TERM.ft.days[w][t][i] === "o" && blockedCell(t, w, i)) expOff.push(t + "|" + w + "|" + i); });
  eq(a.offered.length, expOff.length, "open Free Talk / 1-on-1 times that collide with a class: engine finds the same " + expOff.length + " as the independent check");
  eq([...new Set(a.offered.map(g => g.teacher))].sort(), ["Jay", "Jean"], "...all belonging to Jay and Jean");
  eq(a.clashes.concat(a.offered).filter(g => g.type === "clash" && /booking|\\(/.test(g.kinds)).length, 0, "no booked session collides with a class");
  console.log("== Page content ==");
  let t = txt(doc.getElementById("app")); ok(t.includes("Elisa") && t.includes("Grammar Builder") && t.includes("Jay") && t.includes("Jean"), "clashes and hidden times are listed on the page");
  ok(/Total/.test(t) && doc.querySelectorAll("table tr").length === teachers.length + 2, "hours table: one row per teacher plus header and total (" + doc.querySelectorAll("table tr").length + " rows)");
  const sel = doc.querySelector("#sc_r"); sel.value = "w2026-11-09"; sel.dispatchEvent(new d.window.Event("change")); await sleep(10);
  doc = d.window.document; const rowsW = [...doc.querySelectorAll("table tr")].slice(1, -1).map(r => [...r.children].map(c => c.textContent));
  const er = rowsW.find(r => r[0] === "Elisa"); ok(er && Number(er[1]) === expClassWeek("Elisa", WK), "week view: Elisa class hours = " + expClassWeek("Elisa", WK) + " (page shows " + (er && er[1]) + ")"); 
  const tsel = doc.querySelector("#sc_t"); tsel.value = "Jay"; tsel.dispatchEvent(new d.window.Event("change")); await sleep(10);
  t = txt(doc.getElementById("app")); const hr = [...doc.querySelectorAll("table")[0].querySelectorAll("tr")].map(r => r.children[0].textContent); eq(hr, ["Teacher", "Jay", "Total"], "teacher view: hours table shows only Jay"); ok(doc.querySelectorAll("table").length === 2 && t.includes("English Communication Skills"), "teacher view: Jay\u2019s own schedule table is shown");
  ok(t.includes("12:50 to 13:20"), "teacher view lists Jay's hidden Free Talk time (12:50 to 13:20)");
  let blob = null; d.window.URL.createObjectURL = b => { blob = b; return "blob:x"; }; d.window.URL.revokeObjectURL = () => {};
  doc.querySelector("#sc_csv").click(); await sleep(20); ok(!!blob, "Download CSV produces a file");
  const csv = S.csv(TERM.start, TERM.end).split("\\r\\n"); eq(csv.length, teachers.length + 1, "CSV: header + one row per teacher"); ok(csv[0].startsWith('"Teacher","Class hours"') && csv.some(l => l.startsWith('"Elisa","')), "CSV: header and Elisa row");
  console.log("== A booking that collides is caught ==");
  d.window.sessionStorage.setItem("bookings", JSON.stringify([{id: "free-talk|Jay|2026-11-10|13:00", user: "u1", type: "free-talk", provider: "Jay", date: "2026-11-10", start: "13:00", end: "13:30", status: "booked"}]));
  const a2 = S.audit("2026-11-09", "2026-11-13"); ok(a2.clashes.some(g => g.teacher === "Jay" && /English Communication/.test(g.what) && /booking/.test(g.what)), "a Free Talk booked during Jay's class is reported as a clash");
  eq(S.hours("Jay", "2026-11-10", "2026-11-10").ftBooked, 0.5, "...and counted as booked time");
  eq(S.check("Jay", "2026-11-10", "13:00", "13:30", {ignoreId: "free-talk|Jay|2026-11-10|13:00"}).map(x => x.kind), ["class"], "check() ignores the booking itself and still sees the class");
  eq(S.check("Denn", "2026-11-10", "09:00", "09:10").length >= 0, true, "check() runs for any teacher");
  d.window.close();
  console.log("== EEE activities ==");
  d = await load("schedule-check", {role: "admin", user: "u3"}); E = d.window.CELS; const S2 = E.sched;
  const w1 = S2.hours("Kath", "2026-12-07", "2026-12-11"); ok(w1.activity >= 6, "Kath, EEE week 1: includes the 6-hour island hopping trip (activity hours " + w1.activity + ")");
  const knownT = new Set(S2.teachers()), un = new Set(); DEC.forEach(T => T.acts.forEach(x => (x.teacher || "").split(/\\s*(?:,|&|\\band\\b)\\s*/).filter(Boolean).forEach(n => { if (!knownT.has(n)) un.add(n); })));
  eq(S2.audit("2026-12-07", "2026-12-18").unmatched, [...un].sort(), "names on activities that match no teacher are listed: " + [...un].join(","));
  eq(S2.audit("2026-12-07", "2026-12-18").clashes.length, 0, "EEE weeks: no clashes");
  d.window.close();
  console.log("== Student booking: hidden times and confirm guard ==");
  d = await load("free-talk"); doc = d.window.document; E = d.window.CELS;
  ok(d.errors.length === 0, "free-talk page loads, no errors " + d.errors.join(";"));
  doc = await clickDate(d, "2026-11-17"); doc = await clickTime(d, 6);   // Tue 12:50 PM
  ok(TERM.ft.days[1].Jay[6] === "o" && isBlocked("Jay", 1, 6), "precondition: Jay's 12:50 PM is open on the sheet but he is teaching");
  ok(!teacherNames(doc).includes("Jay"), "Tue 12:50 PM: Jay is not offered (during his class)");
  eq(teacherNames(doc), freeTeachers("2026-11-17", 6), "Tue 12:50 PM: teacher list = open, not teaching, not booked");
  doc = await clickTime(d, 7); ok(!teacherNames(doc).includes("Jay"), "Tue 1:20 PM: Jay is not offered (during his class)"); doc = await clickTime(d, 8); ok(!teacherNames(doc).includes("Jay"), "Tue 1:50 PM: Jay is not offered (during his class)");
  doc = await clickDate(d, "2026-11-20"); doc = await clickTime(d, 6);
  ok(TERM.ft.days[4].Jean[6] === "o" && isBlocked("Jean", 4, 6) && !teacherNames(doc).includes("Jean"), "Fri Nov 20 12:50 PM: Jean is not offered (during TOEIC)");
  doc = await clickDate(d, "2026-11-17"); doc = await clickTime(d, 6); ok(!teacherNames(doc).includes("Denn"), "a teacher booked on the sheet is not offered at that time");
  doc = await clickTime(d, 3); const pickT = teacherNames(doc)[0]; doc.querySelector('.bk-tc[data-t="' + pickT + '"] b').click(); await sleep(20);
  const NOVT = E.TERMS.find(x => x.key === "nov"); NOVT.acts = [{title: "Teachers' meeting", date: "2026-11-17", start: "00:00", end: "23:59", type: "event", teacher: pickT}];
  doc.getElementById("ok").click(); await sleep(30);
  ok((d.window.__alerts || []).some(m => /no longer available/.test(m) && /Teachers' meeting/.test(m)), "confirm re-checks: a new conflict blocks the booking with a clear message");
  eq(JSON.parse(d.window.sessionStorage.getItem("bookings") || "[]").length, 0, "...and nothing is saved"); d.window.close();
  d = await load("free-talk"); doc = await clickDate(d, "2026-11-17"); doc = await clickTime(d, 3); doc.querySelector(".bk-tc b").click(); await sleep(20); doc.getElementById("ok").click(); await sleep(30);
  eq(JSON.parse(d.window.sessionStorage.getItem("bookings") || "[]").length, 1, "a normal booking still goes through"); d.window.close();
  d = await load("one-on-one"); doc = await clickDate(d, "2026-11-16"); doc = await clickTime(d, 12);
  ok(d.errors.length === 0 && doc.querySelectorAll(".bk-tc").length > 20, "1-on-1 page: teachers free at 4:10 PM (" + doc.querySelectorAll(".bk-tc").length + ")"); d.window.close();
  console.log("\\nRESULT schedule engine: " + pass + " passed, " + fail + " failed"); if (fail) { console.log(failures.join("\\n")); process.exit(1); }
})().catch(e => { console.error("HARNESS ERROR", e); process.exit(2); });
`);
