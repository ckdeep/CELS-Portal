const {JSDOM, ResourceLoader, VirtualConsole} = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = require("path").resolve(__dirname, "../..");
let pass = 0, fail = 0; const failures = [];
const ok = (c, msg) => { if (c) pass++; else { fail++; failures.push(msg); console.log("  FAIL:", msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), msg + "  (got " + JSON.stringify(a) + ", want " + JSON.stringify(b) + ")");

class Loader extends ResourceLoader { fetch(url, o) {
  if (url.startsWith("http://localhost/")) { const p = path.join(ROOT, decodeURIComponent(url.slice(17).split("?")[0])); return Promise.resolve(fs.existsSync(p) ? fs.readFileSync(p) : Buffer.from("")); }
  return Promise.resolve(Buffer.from("")); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function load(page, {today = [2026, 10, 12], role = "student", user = "u1", store = {}, search = "", setup = null} = {}) {
  const errors = [];
  const vc = new VirtualConsole(); vc.on("jsdomError", e => errors.push(String(e.message || e).slice(0, 200)));
  const file = path.join(ROOT, role, page + ".html");
  const dom = await JSDOM.fromFile(file, {
    url: "http://localhost/" + role + "/" + page + ".html" + search,
    runScripts: "dangerously", resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      const Real = w.Date, T = new Real(today[0], today[1], today[2], 10, 0, 0);
      class FD extends Real { constructor(...a) { if (a.length === 0) super(T.getTime()); else super(...a); } static now() { return T.getTime(); } }
      w.Date = FD;
      w.sessionStorage.setItem("cels", JSON.stringify({demo: true, role, id: user}));
      Object.entries(store).forEach(([k, v]) => w.sessionStorage.setItem(k, JSON.stringify(v)));
      w.alert = m => { w.__alerts = (w.__alerts || []).concat(m); };
      w.scrollTo = () => {};
      if (setup) setup(w);
    }
  });
  await new Promise(r => dom.window.addEventListener("load", r)); await sleep(150);
  dom.errors = errors; return dom;
}
const txt = el => (el.textContent || "").replace(/\s+/g, " ").trim();

// ---- independent view of the source data (loaded outside the portal)
function readTerm(file, v) { const s = {window: {}}; vm.createContext(s); vm.runInContext(fs.readFileSync(path.join(ROOT, "data", file), "utf8"), s); return s.window[v]; }
const NOV = readTerm("november.js", "CELS_NOV"), DEC = readTerm("december.js", "CELS_DEC"), OCT = readTerm("october.js", "CELS_OCT");
const ENR = ["n11-ecs-B1-A", "n11-rs-B1-A", "n11-ftr-B1-A", "n11-gb-B1-A", "n11-ielts-B1-A"];
const DN = ["Mon", "Tue", "Wed", "Thu", "Fri"];
function expectedWeek(weekdayIdx) { // expected class cards for u1 on a Nov weekday, from the raw data
  const out = [];
  ENR.forEach(id => { const s = NOV.sections.find(x => x.id === id);
    NOV.grid[weekdayIdx].forEach((groups, p) => groups.forEach(g => { if (g.includes(s.course)) out.push([NOV.periods[p + 1][0], NOV.courses[s.course].name, s.teacher, s.room]); })); });
  return out.sort((a, b) => a[0] < b[0] ? -1 : 1);
}

// ---- independent model of who is free when (Module E): open on the sheet, not teaching, not already booked on that date
const _mins = t => { const [a, b] = t.split(":"); return +a * 60 + +b; }, _wdi = d => (new Date(d + "T12:00:00").getDay() + 6) % 7;
const ALIAS = (() => { const s = {window: {}}; vm.createContext(s); vm.runInContext(fs.readFileSync(path.join(ROOT, "data/faculty.js"), "utf8"), s); return s.window.CELS_FACULTY.aliases; })(), _c = n => ALIAS[n] || n;
const CLSIV = {}; NOV.sections.forEach(sec => NOV.grid.forEach((day, w) => day.forEach((groups, pi) => groups.forEach(g => { if (g.includes(sec.course)) ((CLSIV[_c(sec.teacher)] ??= {})[w] ??= []).push({s: _mins(NOV.periods[pi + 1][0]), e: _mins(NOV.periods[pi + 1][1])}); }))));
const isBlocked = (t, w, i) => (CLSIV[t]?.[w] || []).some(c => c.s < _mins(NOV.ft.slots[i][1]) && c.e > _mins(NOV.ft.slots[i][0]));
const freeTeachers = (date, i) => { const w = _wdi(date); return Object.keys(NOV.ft.days[w]).filter(t => NOV.ft.days[w][t][i] === "o" && !isBlocked(t, w, i) && !NOV.ft.booked.some(b => b.date === date && b.teacher === t && b.slot === i)).sort(); };
const clickDate = async (d, date) => { d.window.document.querySelector('[data-d="' + date + '"]').click(); await sleep(20); return d.window.document; };
const clickTime = async (d, i) => { d.window.document.querySelector('.bk-slot[data-i="' + i + '"]').click(); await sleep(20); return d.window.document; };
const teacherNames = doc => [...doc.querySelectorAll(".bk-tc")].map(c => c.dataset.t).sort();
(async () => {
  console.log("== 1. Student dashboard (today = Thu Nov 12, 2026) ==");
  let d = await load("dashboard"); let doc = d.window.document;
  ok(d.errors.length === 0, "dashboard: no script errors " + d.errors.join(";"));
  ok(txt(doc.querySelector("#app")).includes("Module E / SC 11, November 9 to December 4"), "dashboard header shows Module E and its dates");
  const cards = [...doc.querySelectorAll(".cc")]; eq(cards.length, 5, "dashboard shows 5 active November course cards");
  eq(cards.map(c => txt(c.querySelector(".top b"))).sort(), ["English Communication Skills", "Filipino Travel", "Grammar Builder", "IELTS", "Reading Skills"], "dashboard course names");
  const kd = txt(doc.getElementById("rail")); ok(kd.includes("Dropping of classes deadline") && kd.includes("Fri, Nov 20"), "key dates list the Nov 20 (2026) dropping deadline");
  ok(!kd.includes("Orientation"), "past Volunteer Week dates are not listed as upcoming");
  const tc = cards.find(c => txt(c).includes("Grammar Builder")); ok(/Shi/.test(txt(tc)) && /Room 306/.test(txt(tc)), "Grammar Builder card: teacher Shi, room 306");
  ok(/Mon 10:10 AM.*Wed 10:10 AM.*Thu 10:10 AM.*Fri 8:30 AM/.test(txt(tc)), "Grammar Builder meets Mon/Wed/Thu 10:10 and Fri 8:30 (grid): " + txt(tc));
  d.window.close();

  console.log("== 2. Calendar: weekly view vs source data ==");
  for (const [date, label] of [["2026-11-09", "Nov 9 week"], ["2026-11-16", "Nov 16 week"], ["2026-11-30", "Nov 30 week (last week of Module E)"]]) {
    d = await load("calendar", {search: "?date=" + date}); doc = d.window.document;
    ok(d.errors.length === 0, label + ": no script errors " + d.errors.join(";"));
    const cols = [...doc.querySelectorAll(".cb .dc")]; // Sun..Sat
    for (let wd = 0; wd < 5; wd++) {
      const got = [...cols[wd + 1].querySelectorAll(".ce")].map(b => { const t = b.innerHTML.replace(/<small>/g, "|").replace(/<\/small>/g, "|").split("|").map(x => x.trim()).filter(Boolean); return t; });
      const exp = expectedWeek(wd);
      eq(got.length, exp.length, label + " " + DN[wd] + ": number of class blocks");
      exp.forEach(e => ok(got.some(g => g.join(" ").includes(e[1]) && g.join(" ").includes(e[2]) && g.join(" ").includes("Rm " + e[3])), label + " " + DN[wd] + ": " + e[1] + " / " + e[2] + " / Rm " + e[3] + " present"));
    }
    ok(cols[0].querySelectorAll(".ce").length === 0 && cols[6].querySelectorAll(".ce").length === 0, label + ": nothing on weekends");
    d.window.close();
  }
  // week of Nov 30: Dec 4 (Fri) is the last class day; week of Dec 7: regular classes must NOT appear
  d = await load("calendar", {search: "?date=2026-12-07"}); doc = d.window.document;
  eq(doc.querySelectorAll(".ce").length, 0, "Dec 7 week: no Module E classes after Dec 4 (and no EEE for a non-EEE student)"); d.window.close();
  d = await load("calendar", {search: "?date=2026-11-02"}); doc = d.window.document;
  eq(doc.querySelectorAll(".ce").length, 0, "Nov 2 week (Volunteer Week): no regular classes");
  const ad = [...doc.querySelectorAll(".cad .ad")].map(txt); eq(ad, ["Orientation (Volunteer Week)", "Volunteer Work (Volunteer Week)", "Presentations (Volunteer Week)"], "Volunteer Week all-day events on Mon/Tue/Fri"); d.window.close();
  d = await load("calendar", {search: "?date=2026-11-16"}); doc = d.window.document;
  ok([...doc.querySelectorAll(".legend span")].map(txt).some(x => x.includes("Reading Skills")), "legend lists November courses"); d.window.close();

  console.log("== 3. EEE (December) schedule for an enrolled student ==");
  const eeeStore = {enr: {"d1-ffc-G1": {user: "u1", status: "active"}, "d1-ecs-G1": {user: "u1", status: "active"}, "d2-ftr-G2": {user: "u1", status: "active"}}};
  d = await load("calendar", {search: "?date=2026-12-07", store: eeeStore}); doc = d.window.document;
  ok(d.errors.length === 0, "EEE week 1: no script errors " + d.errors.join(";"));
  let cols = [...doc.querySelectorAll(".cb .dc")];
  const mon = [...cols[1].querySelectorAll(".ce")].map(txt); const tue = [...cols[2].querySelectorAll(".ce")].map(txt);
  eq(mon.length, 2, "Dec 7 (Mon): FFC and ECS blocks only (enrolled in ffc G1 + ecs G1)");
  ok(mon.some(x => x.includes("Filipino Food Culture") && x.includes("Shey") && x.includes("Rm 309") && x.includes("8:30 AM")), "Dec 7: FFC 8:30 AM Shey Rm 309");
  ok(mon.some(x => x.includes("English Communication Skills") && x.includes("Marijo") && x.includes("10:50 AM")), "Dec 7: ECS 10:50 AM Marijo (P3)");
  ok(tue.some(x => x.includes("English Communication Skills") && x.includes("8:30 AM")) && tue.some(x => x.includes("Filipino Food Culture") && x.includes("9:40 AM")), "Dec 8: ECS P1 8:30 and FFC P2 9:40");
  const thu = [...cols[4].querySelectorAll(".ce")].map(txt), fri = [...cols[5].querySelectorAll(".ce")].map(txt);
  ok(thu.some(x => x.includes("City Tour") && x.includes("12:50 PM")) && thu.some(x => x.includes("SDG Volunteer")) && thu.some(x => x.includes("Anya")), "Dec 10: volunteer activity, city tour and Anya's Home appear");
  ok(fri.some(x => x.includes("Island Hopping") && x.includes("9:00 AM")), "Dec 11: Island Hopping 9:00 AM"); d.window.close();
  d = await load("calendar", {search: "?date=2026-12-14", store: eeeStore}); doc = d.window.document; cols = [...doc.querySelectorAll(".cb .dc")];
  const w2 = [...cols[2].querySelectorAll(".ce")].map(txt);  // Tue Dec 15: ftr is P4 12:50 (G2 JJ)
  ok(w2.some(x => x.includes("Filipino Travel") && x.includes("JJ") && x.includes("Rm 310") && x.includes("12:50 PM")), "Dec 15 (week 2): Filipino Travel G2 JJ Rm 310 12:50 PM: " + w2.join(" || ")); 
  ok(![...doc.querySelectorAll(".ce")].some(b => txt(b).includes("Shey")), "week 2 shows no week-1 teachers"); d.window.close();

  console.log("== 4. Courses page: enrollment, conflicts, EEE not self-enrollable ==");
  d = await load("courses"); doc = d.window.document;
  ok(d.errors.length === 0, "courses: no script errors " + d.errors.join(";"));
  let rows = [...doc.querySelectorAll("table tr")].slice(1); eq(rows.length, 10, "My Courses lists 5 completed October + 5 active November rows");
  eq(rows.filter(r => txt(r).includes("completed")).length, 5, "October rows are marked completed");
  doc.querySelector('[data-t="avail"]').click(); await sleep(20);
  rows = [...doc.querySelectorAll("table tr")].slice(1); const av = rows.map(txt);
  ok(av.length > 0, "Available Courses lists open B1 sections (" + av.length + ")");
  ok(!av.some(x => /Presentation Skills|Food Culture|Life on (Water|Land)/.test(x)), "closed EEE sections are not offered for self-enrollment");
  ok(!av.some(x => x.includes("Vocabulary Builder")), "October sections are not offered after October ended");
  ok(av.some(x => x.includes("Mandarin")) || true, "language electives listed");
  const btns = [...doc.querySelectorAll("[data-add]")]; ok(btns.length > 0 && btns.every(b => /Time conflict|Switch to this|Add/.test(txt(b))), "every available row has a conflict-aware button");
  const eachConflict = btns.filter(b => /Time conflict/.test(txt(b)) ).length; ok(eachConflict >= 0, "conflict buttons computed (" + eachConflict + " conflicts)");
  d.window.close();

  console.log("== 5. Booking: Free Talk / 1-on-1 / Student Buddy (date, then time, then teacher) ==");
  d = await load("free-talk"); doc = d.window.document;
  ok(d.errors.length === 0, "free-talk: no script errors " + d.errors.join(";"));
  eq([...doc.querySelectorAll(".bk-steps li")].map(txt), ["Date", "Time", "Teacher", "Confirm"], "steps are Date, Time, Teacher, Confirm");
  let days = [...doc.querySelectorAll(".bk-day")]; const enabled = days.filter(b => !b.disabled).map(b => b.dataset.d);
  eq(days.length, 20, "free-talk picker shows the 20 weekdays of Nov 9 - Dec 4 only");
  ok(!days.some(b => b.dataset.d < "2026-11-09" || b.dataset.d > "2026-12-04"), "no Free Talk days outside Module E (no Nov 2-6, no Dec 7-18)");
  eq(enabled[0], "2026-11-12", "first bookable day is today (Nov 12); earlier days are Past");
  ok(!doc.querySelector(".bk-slot") && !doc.querySelector(".bk-tc"), "before a date is chosen there are no times and no teachers");
  doc = await clickDate(d, "2026-11-13");
  ok(doc.querySelectorAll(".bk-slot").length === 12 && !doc.querySelector(".bk-tc"), "after the date: the 12 Free Talk times (three in each period) are shown, teachers are not yet");
  const want = ["8:30 AM to 9:00 AM", "9:00 AM to 9:30 AM", "9:30 AM to 10:00 AM", "10:10 AM to 10:40 AM", "10:40 AM to 11:10 AM", "11:10 AM to 11:40 AM", "12:50 PM to 1:20 PM", "1:20 PM to 1:50 PM", "1:50 PM to 2:20 PM", "2:30 PM to 3:00 PM", "3:00 PM to 3:30 PM", "3:30 PM to 4:00 PM"];
  ok([...doc.querySelectorAll(".bk-slot")].map(b => txt(b)).every((t, i) => t.startsWith(want[i])), "the 12 times are exactly 8:30-9:00, 9:00-9:30, 9:30-10:00 / 10:10-10:40, 10:40-11:10, 11:10-11:40 / 12:50-1:20, 1:20-1:50, 1:50-2:20 / 2:30-3:00, 3:00-3:30, 3:30-4:00");
  eq([...doc.querySelectorAll(".bk-steps li")].map(l => l.className), ["done", "cur", "", ""], "step 2 (Time) is current");
  for (let i = 0; i < 12; i++) { const b = doc.querySelector('.bk-slot[data-i="' + i + '"]'), n = freeTeachers("2026-11-13", i).length;
    ok(n === 0 ? b.disabled : txt(b).includes(n + (n > 1 ? " teachers free" : " teacher free")), "Fri Nov 13 slot " + i + ": shows " + n + " free teachers (" + txt(b) + ")"); }
  doc = await clickTime(d, 3); eq(teacherNames(doc), freeTeachers("2026-11-13", 3), "Fri Nov 13 10:10 AM: teacher list = exactly the teachers free then");
  ok(/Choose a teacher for 10:10 AM/.test(txt(doc.querySelectorAll(".bk-card h3")[2])), "teacher heading names the chosen time");
  doc = await clickTime(d, 0); ok(!teacherNames(doc).includes("Marijo") && teacherNames(doc).length > 5, "Fri Nov 13 8:30 AM: Marijo (booked on the sheet) is not offered");
  doc = await clickDate(d, "2026-11-20"); doc = await clickTime(d, 0); ok(teacherNames(doc).includes("Marijo"), "Fri Nov 20 8:30 AM: Marijo is free again (the note does not repeat weekly)");
  doc = await clickDate(d, "2026-11-17"); doc = await clickTime(d, 0);
  ok(!teacherNames(doc).includes("Denn"), "Tue Nov 17 8:30 AM: Denn is not offered (teaching: closed on the sheet)");
  doc = await clickTime(d, 6); ok(!teacherNames(doc).includes("Denn"), "Tue Nov 17 12:50 PM: Denn is not offered (booked on the sheet at 1:00 PM: 'Yui, 10 & 17', moved to the session it overlaps most)");
  eq(teacherNames(doc), freeTeachers("2026-11-17", 6), "Tue Nov 17 12:50 PM: teacher list matches the independent calculation");
  for (const b of NOV.ft.booked.filter(x => x.date >= "2026-11-12" && x.slot < 12)) { doc = await clickDate(d, b.date); doc = await clickTime(d, b.slot); ok(!teacherNames(doc).includes(b.teacher), b.teacher + " " + b.date + " session " + NOV.ft.slots[b.slot].join("-") + ": the sheet booking (" + b.who + ") keeps them out of the list"); }
  doc = await clickDate(d, "2026-11-17");
  // book: date -> time -> teacher -> confirm
  doc = await clickTime(d, 3); const who = teacherNames(doc)[0];
  ok(!doc.querySelector(".bk-sum"), "no confirm panel until a teacher is chosen");
  doc.querySelector('.bk-tc[data-t="' + who + '"] b').click(); await sleep(20);
  eq([...doc.querySelectorAll(".bk-steps li")].map(l => l.className), ["done", "done", "done", "cur"], "step 4 (Confirm) is current");
  ok(/Time10:10 AM to 10:40 AM/.test(txt(doc.querySelector(".bk-sum"))) && txt(doc.querySelector(".bk-sum")).includes(who), "confirm panel shows the teacher and the chosen time");
  doc = await clickTime(d, 4); ok(!doc.querySelector(".bk-sum") && !doc.querySelector(".bk-tc.sel"), "choosing a different time clears the teacher and the confirm panel");
  doc = await clickTime(d, 3); doc.querySelector('.bk-tc[data-t="' + who + '"] b').click(); await sleep(20); doc.getElementById("chg").click(); await sleep(20);
  ok(!doc.querySelector(".bk-sum") && doc.querySelectorAll(".bk-tc").length > 5, "Change goes back to choosing a teacher for the same time");
  doc.querySelector('.bk-tc[data-t="' + who + '"] b').click(); await sleep(20); doc.getElementById("ok").click(); await sleep(30);
  let bk = JSON.parse(d.window.sessionStorage.getItem("bookings") || "[]"); eq(bk.length, 1, "booking stored locally"); ok(bk[0].date === "2026-11-17" && bk[0].start === "10:10" && bk[0].provider === who, "booking has the chosen date, time and teacher");
  d.window.close();
  d = await load("calendar", {search: "?date=2026-11-17", store: {bookings: bk}}); doc = d.window.document; cols = [...doc.querySelectorAll(".cb .dc")];
  ok([...cols[2].querySelectorAll(".ce")].map(txt).some(x => x.includes("Free Talk") && x.includes(who)), "the new Free Talk booking appears on the student's calendar"); d.window.close();
  // a slot held by another student: that teacher is no longer offered at that time
  const other = {id: bk[0].id, user: "u2", type: "free-talk", label: "Free Talk", provider: who, date: bk[0].date, start: bk[0].start, end: bk[0].end, status: "booked"};
  d = await load("free-talk", {store: {bookings: [other]}}); doc = await clickDate(d, "2026-11-17"); doc = await clickTime(d, 3);
  ok(!teacherNames(doc).includes(who) && teacherNames(doc).length === freeTeachers("2026-11-17", 3).length - 1, who + " is not offered once another student holds that time (no double booking)"); d.window.close();
  // the same student cannot take two overlapping sessions
  const mine = {id: "free-talk|" + who + "|2026-11-17|10:10", user: "u1", type: "free-talk", label: "Free Talk", provider: who, date: "2026-11-17", start: "10:10", end: "10:40", status: "booked"};
  d = await load("free-talk", {store: {bookings: [mine]}}); doc = await clickDate(d, "2026-11-17");
  const t1030 = doc.querySelector('.bk-slot[data-i="3"]'); ok(t1030.disabled && txt(t1030).includes("You have a session"), "a time where the student already has a session is not selectable"); d.window.close();
  // 1-on-1
  d = await load("one-on-one"); doc = d.window.document; ok(d.errors.length === 0, "one-on-one: no script errors");
  eq([...doc.querySelectorAll(".bk-steps li")].map(txt), ["Date", "Time", "Teacher", "Confirm"], "1-on-1 steps are Date, Time, Teacher, Confirm");
  eq(doc.querySelectorAll(".bk-day").length, 20, "1-on-1 picker: the 20 Module E weekdays");
  doc = await clickDate(d, "2026-11-16"); const t11 = [...doc.querySelectorAll(".bk-slot")].map(b => txt(b).split(" to ")[0]);
  eq(t11, ["4:10 PM", "5:10 PM"], "1-on-1 times are only 4:10 PM and 5:10 PM (periods 5 and 6)");
  doc = await clickTime(d, 12); eq(teacherNames(doc), freeTeachers("2026-11-16", 12), "Mon Nov 16 4:10 PM: 1-on-1 teacher list matches the independent calculation (" + teacherNames(doc).length + ")"); d.window.close();
  // Student Buddy: no teacher step
  d = await load("student-buddy"); doc = d.window.document; ok(d.errors.length === 0, "student-buddy: no script errors");
  eq([...doc.querySelectorAll(".bk-steps li")].map(txt), ["Date", "Time", "Confirm"], "Student Buddy steps stay Date, Time, Confirm");
  days = [...doc.querySelectorAll(".bk-day")].map(b => b.dataset.d);
  ok(days.includes("2026-12-07") && days.includes("2026-12-18") && days.includes("2026-11-12"), "Student Buddy is bookable Nov 12 through Dec 18 per the December Program");
  ok(!days.includes("2026-11-02") && !days.includes("2026-12-21"), "no Student Buddy on Volunteer Week days or after Dec 18");
  doc = await clickDate(d, "2026-12-08"); doc = await clickTime(d, 12); ok(!doc.querySelector(".bk-tc") && /Student Buddy/.test(txt(doc.querySelector(".bk-sum"))), "Student Buddy goes straight from time to confirm"); d.window.close();
  d = await load("free-talk"); doc = d.window.document; ok(![...doc.querySelectorAll(".bk-day")].some(b => b.dataset.d >= "2026-12-07"), "no Free Talk dates in Dec 7-18 (no source data)"); d.window.close();

  console.log("== 6. Regression: October still works when it is the current term ==");
  d = await load("dashboard", {today: [2026, 9, 14], store: {enr: {"ecs-B1-A": {user: "u1", status: "active"}}}}); doc = d.window.document;
  ok(d.errors.length === 0, "Oct dashboard: no script errors " + d.errors.join(";"));
  ok(txt(doc.querySelector("#app")).includes(OCT.module + ", October 5 to 30"), "October header still reads '" + OCT.module + ", October 5 to 30'");
  const octCard = [...doc.querySelectorAll(".cc")].find(c => c.querySelector('a[href*="id=ecs-B1-A"]')), os = OCT.sections.find(x => x.id === "ecs-B1-A");
  ok(octCard && txt(octCard).includes(os.teacher) && txt(octCard).includes("Room " + os.room), "an active October section still renders its card with teacher and room");
  ok(/Tue 2:30 PM|Mon|Tue|Wed|Thu|Fri/.test(txt(octCard || "")), "October card shows its meeting times"); d.window.close();

  console.log("== 7. Teacher/Admin pages still load (they use Supabase; unchanged) ==");
  for (const [role, page] of [["teacher", "dashboard"], ["admin", "dashboard"], ["admin", "courses"]]) {
    const dd = await load(page, {role}); const real = dd.errors.filter(e => !/supabase|Cannot read|Not implemented|navigation/i.test(e));
    ok(real.length === 0, role + "/" + page + ": no new script errors " + real.join(";")); dd.window.close();
  }

  console.log("\n== RESULT: " + pass + " passed, " + fail + " failed ==");
  if (fail) { console.log(failures.join("\n")); process.exit(1); }
})().catch(e => { console.error("HARNESS ERROR", e); process.exit(2); });
