// Admin Alerts page, dashboard row and Users page filters, against a fake in-memory database.
// Run: node tools/tests/admin_alerts.test.js (needs jsdom, see tools/README.md)
const src = require("fs").readFileSync(__dirname + "/student_portal.test.js", "utf8");
eval(src.slice(0, src.indexOf('(async () => {\n  console.log("== 1.')) + `
const clone = o => JSON.parse(JSON.stringify(o));
const fakeSB = (tables, log) => ({
  from: t => { let rows = clone(tables[t] || []), upd = null; const gone = (tables.__missing || []).includes(t); const b = {
    upsert: (p, o) => { log.push({t, op: "upsert", p, o}); const k = o && o.onConflict, arr = tables[t] = tables[t] || [], i = arr.findIndex(r => r[k] === p[k]); if (i >= 0) arr[i] = Object.assign({}, arr[i], p); else arr.push(Object.assign({}, p)); return Promise.resolve({data: [p], error: null}); },
    select: () => b, order: () => b, limit: () => b, gte: () => b, lte: () => b, not: () => b, is: () => b, neq: () => b, or: () => b,
    eq: (k, v) => { rows = rows.filter(r => r[k] === v); return b; }, in: (k, v) => { rows = rows.filter(r => v.includes(r[k])); return b; },
    update: p => { upd = p; log.push({t, op: "update", p}); return b; },
    maybeSingle: () => Promise.resolve({data: rows[0] || null, error: null}), single: () => Promise.resolve({data: rows[0] || null, error: null}),
    then: (res, rej) => Promise.resolve(gone ? {data: null, error: {code: "42P01", message: 'relation "public.' + t + '" does not exist'}} : {data: rows, count: rows.length, error: null}).then(res, rej) }; return b; },
  auth: {getSession: async () => ({data: {session: null}})}, rpc: async () => ({data: null, error: null}), functions: {invoke: async () => ({data: {}, error: null})} });
const P = (id, role, nick, extra) => Object.assign({id, role, status: "active", nickname: nick, first_name: nick, last_name: "X", email: id + "@cels.test"}, extra || {});
const DB = () => ({
  terms: [{id: "t-oct", name: "Module D", starts_on: "2026-10-05", ends_on: "2026-10-30"}, {id: "t-nov", name: "Module E", starts_on: "2026-11-09", ends_on: "2026-12-04"}],
  courses: [{id: "c1", name: "Reading Skills"}, {id: "c2", name: "Grammar Builder"}, {id: "c3", name: "IELTS"}],
  profiles: [P("a1", "admin", "Boss"), P("ana", "teacher", "Ana"), P("ben", "teacher", "Ben"), P("cy", "teacher", "Cy"), P("di", "teacher", "Di"), P("fay", "teacher", "Fay"), P("ed", "teacher", "Ed", {status: "inactive"}),
    P("s1", "student", "Sam", {student_number: "100000001", country: "Japan", home_university: "Dong-eui University", cels_level: "B1"}), P("s2", "student", "Sue", {student_number: "100000002", country: "Japan", home_university: "Dong-eui University", cels_level: "B2"}),
    P("s3", "student", "Sid", {student_number: "100000003", country: "Korea", home_university: "Tokyo College", cels_level: "B1"}), P("s4", "student", "Sol", {student_number: "100000004", country: "Korea", cels_level: "A2"}), P("s5", "student", "Sky", {student_number: "100000005", cels_level: "B1"})],
  sections: [
    {id: "x1", course_id: "c1", level: "B1", section: "A", room: 301, teacher_name: "Ana", term_id: "t-nov", active: true}, {id: "x2", course_id: "c2", level: "B1", section: "A", room: 302, teacher_name: "Ana", term_id: "t-nov", active: true},
    {id: "x3", course_id: "c3", level: "A2", section: "A", room: 303, teacher_name: "ana", term_id: "t-nov", active: true}, {id: "x4", course_id: "c1", level: "B2", section: "A", room: 304, teacher_name: "Ben", term_id: "t-nov", active: true},
    {id: "x5", course_id: "c2", level: "B2", section: "A", room: 305, teacher_name: "Ben", term_id: "t-nov", active: true}, {id: "x6", course_id: "c3", level: "B1", section: "B", room: 306, teacher_name: "Cy", term_id: "t-nov", active: true},
    {id: "x7", course_id: "c1", level: "C1", section: "A", room: 307, teacher_name: "", term_id: "t-nov", active: true, created_at: "2026-11-09T10:00:00Z"},
    {id: "x8", course_id: "c2", level: "C1", section: "A", room: null, teacher_name: "Ben", term_id: "t-nov", active: true, created_at: "2026-08-01T00:00:00Z"},
    {id: "x9", course_id: "c3", level: "C1", section: "A", room: null, teacher_name: null, term_id: "t-nov", active: false},
    {id: "x10", course_id: "c1", level: "A1", section: "A", room: null, teacher_name: null, term_id: "t-oct", active: true},
    {id: "x11", course_id: "c1", level: "A2", section: "B", room: 308, teacher_name: "Fay", term_id: "t-nov", active: true}, {id: "x12", course_id: "c2", level: "A2", section: "B", room: 309, teacher_name: "Fay", term_id: "t-nov", active: true}],
  grade_items: [{id: "i1", section_id: "x1", name: "Quiz 1", max_points: 100}, {id: "i2", section_id: "x1", name: "Quiz 2", max_points: 20}, {id: "i3", section_id: "x4", name: "Essay", max_points: 50}, {id: "i4", section_id: "x9", name: "Old", max_points: 100}, {id: "i5", section_id: "x1", name: "Bonus", max_points: 0}],
  grade_scores: [{item_id: "i1", student_id: "s1", score: 59}, {item_id: "i1", student_id: "s2", score: 60}, {item_id: "i2", student_id: "s3", score: 11}, {item_id: "i2", student_id: "s1", score: 12}, {item_id: "i3", student_id: "s4", score: 24.9}, {item_id: "i3", student_id: "s5", score: null}, {item_id: "i5", student_id: "s2", score: 0}, {item_id: "i4", student_id: "s1", score: 10}],
  attendance_sessions: [{id: "a1", section_id: "x1", held_on: "2026-11-10"}, {id: "a2", section_id: "x1", held_on: "2026-11-11"}, {id: "a3", section_id: "x1", held_on: "2026-11-12"}, {id: "a4", section_id: "x4", held_on: "2026-11-13"}, {id: "a5", section_id: "x1", held_on: "2026-10-12"}, {id: "a6", section_id: "x9", held_on: "2026-11-10"}],
  attendance_records: [{session_id: "a1", student_id: "s1", status: "absent"}, {session_id: "a2", student_id: "s1", status: "absent"}, {session_id: "a1", student_id: "s2", status: "absent"}, {session_id: "a2", student_id: "s2", status: "excused"}, {session_id: "a3", student_id: "s2", status: "late"},
    {session_id: "a1", student_id: "s3", status: "absent"}, {session_id: "a4", student_id: "s3", status: "absent"}, {session_id: "a5", student_id: "s4", status: "absent"}, {session_id: "a1", student_id: "s4", status: "absent"},
    {session_id: "a1", student_id: "s5", status: "absent"}, {session_id: "a2", student_id: "s5", status: "absent"}, {session_id: "a3", student_id: "s5", status: "absent"}, {session_id: "a6", student_id: "s2", status: "absent"}, {session_id: "a6", student_id: "s2", status: "absent"}],
  level_change_requests: [{id: "r1", student_id: "s1", status: "pending", from_level: "B1", requested_level: "B2", reason: "Finds class too easy", created_at: "2026-11-10"}, {id: "r2", student_id: "s2", status: "approved", from_level: "A2", requested_level: "B1"}, {id: "r3", student_id: "s3", status: "denied", from_level: "B1", requested_level: "C1"}],
  enrollments: [{student_id: "s1", section_id: "x1", status: "active"}, {student_id: "s1", section_id: "x2", status: "active"}, {student_id: "s2", section_id: "x4", status: "active"}, {student_id: "s3", section_id: "x5", status: "dropped"}, {student_id: "s4", section_id: "x6", status: "active"}],
  course_meetings: [{term_id: "t-nov", course_id: "c1", weekday: 0, period: 1}, {term_id: "t-nov", course_id: "c1", weekday: 2, period: 1}, {term_id: "t-nov", course_id: "c2", weekday: 1, period: 2}, {term_id: "t-nov", course_id: "c3", weekday: 3, period: 3}],
  periods: [{period: 1, starts_at: "08:30:00", ends_at: "10:00:00"}, {period: 2, starts_at: "10:10:00", ends_at: "11:40:00"}, {period: 3, starts_at: "12:50:00", ends_at: "14:20:00"}],
  school_events: [{id: "e1", name: "Sports day", event_type: "event", starts_on: "2026-11-18", ends_on: "2026-11-18", cancels_classes: true}, {id: "e2", name: "Open house", event_type: "event", starts_on: "2026-11-20", ends_on: "2026-11-21", cancels_classes: false}, {id: "e3", name: "Dec party", event_type: "event", starts_on: "2026-12-10", ends_on: "2026-12-10", cancels_classes: false}],
  event_assignments: [{event_id: "e2", teacher_name: "Ana", hours: 3, role: "host"}, {event_id: "e2", teacher_name: "Ben", hours: 1, role: "host"}, {event_id: "e3", teacher_name: "Fay", hours: 4, role: "host"}],
  curriculum_duties: [{month: "2026-11", teacher_name: "Ana", hours: 6, task: "IELTS materials", status: "in_progress"}, {month: "2026-11", teacher_name: "Ben", hours: 2, task: "Quiz bank", status: "todo"}, {month: "2026-11", teacher_name: "Ben", hours: 1.5, task: "Syllabus", status: "todo"}, {month: "2026-12", teacher_name: "Ana", hours: 10, task: "Dec", status: "todo"}],
  monthly_load_targets: [{month: "2026-10", teaching_hours: 24, prep_hours: 6, event_hours: 3, note: "Oct"}, {month: "2026-11", teaching_hours: 20, prep_hours: 4, event_hours: 2, note: "Nov"}],
  appointments: [], teacher_availability: [], availability_slots: []});
const open = async (page, db, o) => { const log = []; const d = await load(page, Object.assign({role: "admin", user: "u3", setup: w => { w.CELS_SB = fakeSB(db, log); w.CELS_MARKETING = [{country: "Japan", name: "Aya", email: "aya@example.org"}]; }}, o || {})); await sleep(250); d.log = log; return d; };
const heads = doc => [...doc.querySelectorAll(".panel h3")].map(h => txt(h));
(async () => {
  console.log("== Alerts page ==");
  let d = await open("alerts", DB()), doc = d.window.document;
  ok(d.errors.length === 0, "page loads with no script errors " + d.errors.join(";"));
  ok(txt(doc.body).includes("Alerts") && ["Dashboard", "Users", "Workload", "Schedule check"].every(n => txt(doc.body).includes(n)), "Alerts is in the admin menu and the existing items are still there");
  const H = heads(doc); console.log("   headings: " + H.join(" | "));
  const A = await d.window.CELS.alerts.fetchAll().then(db => d.window.CELS.alerts.compute(db, {today: "2026-11-12"}));
  eq(A.term.id, "t-nov", "current term is chosen from today's date (Module E)");
  console.log("-- 1. scores under 60%");
  eq(A.low.map(x => x.student.id + ":" + x.pct), ["s4:49.8", "s3:55", "s1:59"], "flags 59/100, 11/20 and 24.9/50, lowest first; 60/100 and 12/20 (exactly 60%) are NOT flagged");
  ok(!A.low.some(x => x.item.id === "i4" || x.item.id === "i5" || x.student.id === "s5"), "ignores empty scores, zero-point items and inactive classes");
  ok(H.some(h => /Scores under 60% [(]3[)]/.test(h)), "panel shows the count 3");
  console.log("-- 3. classes that need a teacher or room");
  eq(A.unst.map(x => x.section.id + ":" + (x.needTeacher ? "T" : "") + (x.needRoom ? "R" : "") + (x.isNew ? ":new" : "")).sort(), ["x7:T:new", "x8:R"], "x7 (no teacher, created 3 days ago) is new; x8 (no room) is older; inactive and ended-term classes are ignored");
  ok(txt(doc.body).includes("needs a teacher") && txt(doc.body).includes("needs a room number"), "page says what is missing");
  console.log("-- 4. level change requests");
  eq(A.levels.map(x => x.req.id), ["r1"], "only the pending request is listed (approved and denied are not)");
  ok(txt(doc.body).includes("move from B1 to B2") && doc.querySelector('a[href="placement.html"]'), "shows From and Requested levels and links to Placement");
  console.log("-- 2. teachers below 2/3 of the month's load (teaching / prep / events)");
  const L = A.load; const hoursOf = n => L[n.toLowerCase()];
  eq([hoursOf("Ana").teaching, hoursOf("Ben").teaching, hoursOf("Cy").teaching, hoursOf("Fay").teaching], [18, 18, 4.5, 13.5], "teaching hours: class periods x class days in November, Nov 18 (a day that cancels classes) left out; 'ana' in lower case still counts for Ana");
  eq([hoursOf("Ana").prep, hoursOf("Ben").prep, hoursOf("Cy") ? hoursOf("Cy").prep : 0], [6, 3.5, 0], "prep hours: this month's curriculum duties only (Ana's 10 h in December is not counted)");
  eq([hoursOf("Ana").events, hoursOf("Ben").events, hoursOf("Fay") ? hoursOf("Fay").events : 0], [3, 1, 0], "event hours: events in November only (Fay's December party is not counted)");
  eq(A.targets, {teaching: 20, prep: 4, events: 2}, "November's targets are the ones set by the admin (20 / 4 / 2)");
  eq(A.light.map(x => x.name + ":" + x.cats.map(c => c.key).join("+")), ["Cy:teaching+prep+events", "Di:teaching+prep+events", "Fay:prep+events", "Ben:events"], "flagged: Cy, Di, Fay (prep, events; 13.5 of 20 teaching is above 2/3) and Ben (events 1 of 2); Ana is fine; inactive Ed is ignored");
  const withT = async (row, o) => { const db = await d.window.CELS.alerts.fetchAll(); db.targets = row ? [Object.assign({month: "2026-11"}, row)] : []; return d.window.CELS.alerts.compute(db, Object.assign({today: "2026-11-12"}, o || {})); };
  eq((await withT({teaching_hours: 27, prep_hours: 0, event_hours: 0})).light.map(x => x.name).sort(), ["Cy", "Di", "Fay"], "exactly 2/3 is not flagged: with a teaching target of 27, Ana and Ben (18 h) are fine, Fay (13.5), Cy and Di are not");
  eq((await withT({teaching_hours: 0, prep_hours: 0, event_hours: 0})).light.length, 0, "a target of 0 hours means that category is not checked");
  const noT = await withT(null); eq([noT.light.length, noT.targets], [0, null], "no targets for the month: no guessing, no load alerts");
  console.log("-- 5. unexcused absences");
  eq(A.abs.map(x => x.student.id + ":" + x.count), ["s5:3", "s1:2", "s3:2"], "students with 2 or more: s5 (3), s1 (2), s3 (2 across two classes)");
  ok(!A.abs.some(x => ["s2", "s4"].includes(x.student.id)), "excused/late and absences outside the term or in inactive classes do not count (s2, s4)");
  ok(txt(doc.body).includes("Country not set") && txt(doc.body).includes("No marketing manager on record for this country"), "no country: marketing cannot be told; Korea has no manager on record");
  const ml = [...doc.querySelectorAll("a")].find(a => /Email marketing/.test(a.textContent)); ok(ml && ml.href.startsWith("mailto:aya%40example.org") && /Sam/.test(decodeURIComponent(ml.href)) && /Unexcused absences: 2/.test(decodeURIComponent(ml.href)), "Japan has a manager: an email to marketing is prepared with the student and dates");
  eq((await d.window.CELS.alerts.fetchAll().then(db => d.window.CELS.alerts.compute(db, {today: "2026-11-12", absences: 3}))).abs.map(x => x.student.id), ["s5"], "raising the threshold to 3 leaves only s5");
  eq(A.total, 12, "total open alerts = 3 scores + 2 classes + 4 teachers + 3 absences");
  eq(A.miss, [], "today is Nov 12 and November has targets: no reminder yet");
  console.log("-- controls on the page");
  const t = doc.getElementById("al_t"); ok(t.value === "t-nov", "term picker starts on Module E"); t.value = "t-oct"; t.dispatchEvent(new d.window.Event("change")); await sleep(10);
  ok(/Module D/.test(txt(doc.body)) && /No scores under 60% in this term/.test(txt(doc.body)), "switching to Module D re-computes (no scores there)");
  doc.getElementById("al_t").value = "t-nov"; doc.getElementById("al_t").dispatchEvent(new d.window.Event("change")); await sleep(10);
  const mo = doc.getElementById("al_m"); ok(mo.value === "2026-11", "month picker starts on this month"); mo.value = "2026-10"; mo.dispatchEvent(new d.window.Event("change")); await sleep(10);
  ok(/October 2026 targets: teaching 24 h, prep 6 h, events 3 h/.test(txt(doc.body)), "switching the month to October uses October's targets"); mo.value = "2026-11"; doc.getElementById("al_m").dispatchEvent(new d.window.Event("change")); await sleep(10);
  const ab = doc.getElementById("al_a"); ab.value = "3"; ab.dispatchEvent(new d.window.Event("change")); await sleep(10); ok(heads(doc).some(h => /3 or more unexcused absences [(]1[)]/.test(h)), "alert-at 3 shows one student");
  ok(!d.log.some(x => x.op === "update"), "the page is read-only: it wrote nothing to the database"); d.window.close();
  console.log("== Everything fine ==");
  const quiet = DB(); quiet.grade_scores = []; quiet.attendance_records = []; quiet.level_change_requests = []; quiet.sections = quiet.sections.filter(s => s.teacher_name && s.room); quiet.sections.push({id: "x13", course_id: "c1", level: "B1", section: "C", room: 310, teacher_name: "Cy", term_id: "t-nov", active: true}, {id: "x14", course_id: "c1", level: "B1", section: "D", room: 311, teacher_name: "Di", term_id: "t-nov", active: true});
  quiet.sections.push({id: "x15", course_id: "c2", level: "B1", section: "C", room: 312, teacher_name: "Di", term_id: "t-nov", active: true}); quiet.monthly_load_targets = [{month: "2026-11", teaching_hours: 1, prep_hours: 0, event_hours: 0}]; quiet.event_assignments = [];
  d = await open("alerts", quiet); doc = d.window.document; ok(d.errors.length === 0, "quiet database: no errors"); ok(/0 open/.test(txt(doc.body)) && /Every open class has a teacher and a room/.test(txt(doc.body)) && /No scores under 60%/.test(txt(doc.body)), "no alerts: every panel says so (" + txt(doc.querySelector(".panel h3")) + ")"); d.window.close();
  d = await load("alerts", {role: "admin", user: "u3"}); await sleep(150); ok(/not connected in demo mode/.test(txt(d.window.document.body)), "without a database (demo mode) the page explains instead of failing"); d.window.close();
  console.log("== Dashboard row ==");
  d = await open("dashboard", DB()); doc = d.window.document; await sleep(150);
  const row = [...doc.querySelectorAll(".todo")].find(a => /Alerts/.test(a.textContent)); ok(!!row, "'Needs your attention' has an Alerts line"); ok(row && row.getAttribute("href") === "alerts.html" && /12/.test(row.textContent) && row.className.includes("hot"), "it shows the open count and links to the Alerts page: " + (row && txt(row)));
  ok([...doc.querySelectorAll(".todo")].some(a => /Level change requests/.test(a.textContent)), "the existing level-change line is still there"); d.window.close();
  console.log("== Users page: filter students ==");
  d = await open("users", DB()); doc = d.window.document; ok(d.errors.length === 0, "users page loads, no errors " + d.errors.join(";"));
  const labels = [...doc.querySelectorAll("label.f")].map(l => txt(l)); ok(["Course", "Teacher", "Country", "Home university"].every(x => labels.some(l => l.startsWith(x))), "filters: Course, Teacher, Country and Home university are present");
  const rowsNow = () => [...doc.querySelectorAll("#ut table tr")].slice(1).map(r => r.children[0].textContent).sort(), setF = async (id, v) => { const e = doc.getElementById(id); e.value = v; e.dispatchEvent(new d.window.Event("change")); await sleep(10); };
  eq(txt(doc.getElementById("cntx")), "Showing 12 of 12", "no filter: everyone (12)");
  await setF("fc", "c1"); eq(rowsNow(), ["Sam", "Sue"], "Course = Reading Skills: Sam and Sue (active enrollments only)");
  await setF("ft", "Ana"); eq(rowsNow(), ["Sam"], "Course + Teacher Ana: Sam");
  await setF("fc", ""); await setF("ft", "Ben"); eq(rowsNow(), ["Sue"], "Teacher = Ben: Sue (Sid's enrollment is dropped, so not counted)");
  await setF("ft", ""); await setF("fk", "Japan"); eq(rowsNow(), ["Sam", "Sue"], "Country = Japan: Sam and Sue");
  await setF("fh", "Dong-eui University"); await setF("fl", "B1"); eq(rowsNow(), ["Sam"], "Japan + Dong-eui University + level B1: Sam");
  await setF("fl", ""); await setF("fk", ""); await setF("fh", "Tokyo College"); eq(rowsNow(), ["Sid"], "Home university = Tokyo College: Sid"); await setF("fh", "");
  doc.getElementById("fq").value = "sky"; doc.getElementById("fq").dispatchEvent(new d.window.Event("input")); await sleep(10); eq(rowsNow(), ["Sky"], "the existing search box still works"); 
  doc.getElementById("fq").value = ""; doc.getElementById("fq").dispatchEvent(new d.window.Event("input")); await sleep(10);
  const head = txt(doc.querySelector("#ut table tr")); ok(head.includes("Country") && head.includes("Home university"), "table shows Country and Home university columns");
  console.log("-- editing country / home university");
  doc.querySelector('[data-e="s3"]').click(); await sleep(60); ok(!!doc.getElementById("f_country") && doc.getElementById("f_uni").value === "Tokyo College", "edit form has Country and Home university, filled in");
  doc.getElementById("f_country").value = "Taiwan"; doc.getElementById("f_uni").value = "Taipei Univ"; doc.getElementById("save").click(); await sleep(60);
  const up = d.log.find(x => x.op === "update" && x.t === "profiles"); ok(up && up.p.country === "Taiwan" && up.p.home_university === "Taipei Univ", "saving writes country and home university to the profile"); d.window.close();
  const plain = DB(); plain.profiles.forEach(p => { delete p.country; delete p.home_university; });
  d = await open("users", plain); doc = d.window.document; ok(!txt(doc.body).includes("Home university") && ![...doc.querySelectorAll("label.f")].some(l => /^Country/.test(txt(l))), "before those columns exist: no Country / Home university filters (nothing breaks)"); ok(d.errors.length === 0 && [...doc.querySelectorAll("label.f")].some(l => /^Course/.test(txt(l))), "Course and Teacher filters still work without them"); d.window.close();
  console.log("== Same numbers as the Workload page ==");
  d = await open("workload", DB()); doc = d.window.document; await sleep(100); ok(d.errors.length === 0, "Workload page renders with the same data, no errors " + d.errors.join(";"));
  const wl = {}; const tbl = [...doc.querySelectorAll("table")][0]; const hd = [...tbl.querySelectorAll("tr")[0].children].map(txt); [...tbl.querySelectorAll("tr")].slice(1).forEach(r => { const c = [...r.children].map(txt), k = c[0].toLowerCase(), w = wl[k] || (wl[k] = {teaching: 0, prep: 0, events: 0}); w.teaching += Number(c[hd.indexOf("Teaching hours")]); w.prep += Number(c[hd.indexOf("Curriculum development hours")]); w.events += Number(c[hd.indexOf("Event coordination hours")]); }); /* Workload lists "Ana" and "ana" as two teachers; Alerts treats them as one, so add them up */
  ok([...tbl.querySelectorAll("tr")].some(r => r.children[0].textContent === "ana") && [...tbl.querySelectorAll("tr")].some(r => r.children[0].textContent === "Ana"), "Workload really does list Ana and ana (different capitalisation) as two teachers");
  const mine = await (async () => { const d2 = await open("alerts", DB()); const db = await d2.window.CELS.alerts.fetchAll(); const r = d2.window.CELS.alerts.loads(db, "2026-11"); d2.window.close(); return r; })();
  const names = Object.keys(wl).filter(n => n !== "total"); ok(names.length >= 4, "Workload lists the teachers (" + names.join(",") + ")");
  names.forEach(n => { const m = mine[n] || {teaching: 0, prep: 0, events: 0}; eq([m.teaching, m.prep, m.events], [wl[n].teaching, wl[n].prep, wl[n].events], "November hours for " + n + " match the Workload page exactly (teaching / prep / events; case variants added together)"); });
  const ms = [...doc.querySelectorAll("select")].find(x => [...x.options].some(o => /December 2026/.test(o.textContent))); ok(!!ms, "Workload has a month picker");
  if (ms) { ms.value = [...ms.options].find(o => /December 2026/.test(o.textContent)).value; ms.dispatchEvent(new d.window.Event("change")); await sleep(150);
    const wd2 = {}; const t2 = [...doc.querySelectorAll("table")][0], h2 = [...t2.querySelectorAll("tr")[0].children].map(txt); [...t2.querySelectorAll("tr")].slice(1).forEach(r => { const c = [...r.children].map(txt), k = c[0].toLowerCase(), w = wd2[k] || (wd2[k] = {teaching: 0, prep: 0, events: 0}); w.teaching += Number(c[h2.indexOf("Teaching hours")]); w.prep += Number(c[h2.indexOf("Curriculum development hours")]); w.events += Number(c[h2.indexOf("Event coordination hours")]); });
    const d3 = await open("alerts", DB()), mine2 = d3.window.CELS.alerts.loads(await d3.window.CELS.alerts.fetchAll(), "2026-12"); d3.window.close();
    Object.keys(wd2).filter(n => n !== "total").forEach(n => { const m = mine2[n] || {teaching: 0, prep: 0, events: 0}; eq([m.teaching, m.prep, m.events], [wd2[n].teaching, wd2[n].prep, wd2[n].events], "December hours for " + n + " match the Workload page"); }); }
  d.window.close();
  console.log("== Setting the monthly targets ==");
  d = await open("alerts", DB()); doc = d.window.document;
  ok(doc.getElementById("tg_t").value === "20" && doc.getElementById("tg_p").value === "4" && doc.getElementById("tg_e").value === "2" && doc.getElementById("tg_n").value === "Nov", "the panel shows November's saved targets");
  const setV = (id, v) => { doc.getElementById(id).value = v; };
  setV("tg_t", "30"); setV("tg_p", "5"); setV("tg_e", "2.5"); setV("tg_n", "Busy month"); doc.getElementById("tg_s").click(); await sleep(60);
  const upN = d.log.find(x => x.op === "upsert"); ok(upN && upN.t === "monthly_load_targets" && upN.o.onConflict === "month" && upN.p.month === "2026-11" && upN.p.teaching_hours === 30 && upN.p.prep_hours === 5 && upN.p.event_hours === 2.5 && upN.p.note === "Busy month", "Save writes one row for the month with all three targets");
  ok(/Saved the targets for November 2026/.test(txt(doc.body)), "it confirms the save");
  ok(/teaching 30 h, prep 5 h, events 2.5 h/.test(txt(doc.body)), "the load alerts immediately use the new targets");
  ok(heads(doc).some(h => /below 2[/]3 of the month/.test(h) && /[(]5[)]/.test(h)), "with teaching 30: Ana and Ben (18 of 30 = 60%) are now flagged too, so 5 teachers");
  console.log("-- next month: copy and save");
  const tm = doc.getElementById("tg_m"); tm.value = "2026-12"; tm.dispatchEvent(new d.window.Event("change")); await sleep(10);
  ok(doc.getElementById("tg_t").value === "" && /Copy from November 2026/.test(txt(doc.body)), "December is empty and offers to copy from November");
  doc.getElementById("tg_c").click(); ok(doc.getElementById("tg_t").value === "30" && doc.getElementById("tg_p").value === "5" && doc.getElementById("tg_n").value === "Busy month", "Copy fills in the previous month's targets");
  setV("tg_t", "12"); doc.getElementById("tg_s").click(); await sleep(60);
  const up2 = d.log.filter(x => x.op === "upsert").pop(); ok(up2.p.month === "2026-12" && up2.p.teaching_hours === 12 && up2.p.prep_hours === 5, "December saved with the edited teaching target");
  ok(d.window.CELS.alerts && (await d.window.CELS.alerts.saveTargets("2026-11", {teaching: -1}).then(() => false, e => /negative/.test(e.message))), "negative hours are refused");
  ok(await d.window.CELS.alerts.saveTargets("bad", {teaching: 1}).then(() => false, e => /Choose a month/.test(e.message)), "a bad month is refused"); d.window.close();
  console.log("-- reminders");
  const base = DB(); d = await open("alerts", base); let dbx = await d.window.CELS.alerts.fetchAll();
  eq(d.window.CELS.alerts.compute(dbx, {today: "2026-11-19"}).miss, [], "Nov 19: December targets are not yet due");
  eq(d.window.CELS.alerts.compute(dbx, {today: "2026-11-20"}).miss, ["2026-12"], "from the 20th: reminder to set December's targets");
  dbx.targets = dbx.targets.filter(t => t.month !== "2026-11"); eq(d.window.CELS.alerts.compute(dbx, {today: "2026-11-12"}).miss, ["2026-11"], "this month's targets missing: reminder right away");
  dbx.targets = [{month: "2026-12", teaching_hours: 1, prep_hours: 1, event_hours: 1}, {month: "2026-11", teaching_hours: 1, prep_hours: 1, event_hours: 1}]; eq(d.window.CELS.alerts.compute(dbx, {today: "2026-11-25"}).miss, [], "no reminder once the next month is set"); d.window.close();
  const nt = DB(); nt.monthly_load_targets = []; d = await open("alerts", nt); doc = d.window.document;
  ok(/Load targets not set [(]1[)]/.test(txt(doc.body)) && /November 2026 has no load targets yet/.test(txt(doc.body)), "page shows the reminder and the empty panel");
  ok(/No targets are set for November 2026 yet/.test(txt(doc.body)), "the load panel says why it cannot check"); d.window.close();
  console.log("-- before the targets table exists");
  const gone = DB(); gone.__missing = ["monthly_load_targets"]; d = await open("alerts", gone); doc = d.window.document;
  ok(d.errors.length === 0 && /One-time setup needed/.test(txt(doc.body)) && /db-changes-draft.sql/.test(txt(doc.body)), "page still loads and explains the one-time setup");
  ok(!doc.getElementById("tg_s") && heads(doc).some(h => /Scores under 60%/.test(h)), "no save button until the table exists; other alerts still work"); d.window.close();
  console.log("\\nRESULT admin alerts: " + pass + " passed, " + fail + " failed"); if (fail) { console.log(failures.join("\\n")); process.exit(1); }
})().catch(e => { console.error("HARNESS ERROR", e); process.exit(2); });
`);
