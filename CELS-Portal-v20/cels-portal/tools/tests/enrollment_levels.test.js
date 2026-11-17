// Enrollment shows the student's level, one level up and one level down. Run: node tools/tests/enrollment_levels.test.js
const src = require("fs").readFileSync(__dirname + "/student_portal.test.js", "utf8");
eval(src.slice(0, src.indexOf('(async () => {\n  console.log("== 1.')) + `
const ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
const WIN = L => ORDER.slice(Math.max(0, ORDER.indexOf(L) - 1), ORDER.indexOf(L) + 2);
(async () => {
  const d = await load("courses"); const doc = d.window.document, E = d.window.CELS, u = E.user;
  ok(d.errors.length === 0, "no script errors " + d.errors.join(";"));
  const render = async L => { const el = doc.createElement("div"); doc.body.appendChild(el); E.pages["student/courses"](el, {...u, level: L});
    el.querySelector('[data-t="avail"]').click(); await sleep(10);
    const rows = [...el.querySelectorAll("table tr")].slice(1).map(r => { const b = r.querySelector("[data-add]"), sec = b && E.section(b.dataset.add); return sec ? [txt(r.children[0]), sec.level, sec.id] : null; }).filter(Boolean); return {el, rows}; };
  const present = new Set(NOV.sections.map(s => s.level.split(/\\s*[&,]\\s*/)).flat().filter(x => ORDER.includes(x)));
  console.log("levels that exist in the November data: " + [...present].sort().join(", "));
  for (const L of ORDER) {
    const {el, rows} = await render(L), win = WIN(L);
    const shown = new Set(rows.map(r => r[1]));
    const lv = rows.map(r => r[1]).filter(x => !/^FL/i.test(x));
    ok(lv.every(x => x.split(/\\s*[&,]\\s*/).some(y => win.includes(y))), L + ": every level-based course is within " + win.join("/") + " (saw " + [...shown].join(",") + ")");
    win.filter(x => present.has(x)).forEach(x => ok(rows.some(r => r[1].split(/\\s*[&,]\\s*/).includes(x)), L + ": " + x + " courses are offered"));
    ORDER.filter(x => !win.includes(x)).forEach(x => ok(!rows.some(r => r[1].split(/\\s*[&,]\\s*/).includes(x) && !r[1].split(/\\s*[&,]\\s*/).some(y => win.includes(y))), L + ": no " + x + "-only courses"));
    ok(rows.some(r => /^FL/i.test(r[1])), L + ": language electives still offered");
    ok(!rows.some(r => /Food Culture|Life on (Water|Land)|Presentation Skills/.test(r[0])), L + ": closed EEE sections not offered");
    const t = txt(el.querySelector(".panel")); ok(t.includes("one level up and one level down"), L + ": explanatory text shown");
    const opts = [...el.querySelectorAll("select")].flatMap(s => [...s.options].map(o => o.value)).filter(x => ORDER.includes(x));
    ok(opts.every(x => win.includes(x)), L + ": level filter only lists " + win.join("/") + " (" + opts.join(",") + ")");
  }
  { const {el} = await render("B1"); ok(txt(el.querySelector(".panel")).includes("A2, B1 and B2"), "B1 student is told: A2, B1 and B2"); }
  { const {el} = await render("A1"); ok(txt(el.querySelector(".panel")).includes("A1 and A2"), "A1 student is told: A1 and A2 (no level below)"); }
  { const {el} = await render("C2"); ok(txt(el.querySelector(".panel")).includes("C1 and C2"), "C2 student is told: C1 and C2 (no level above)"); }
  { const {rows} = await render(undefined); ok(rows.length > 30, "a student with no level set still sees everything (" + rows.length + " rows)"); }
  // enrolling in a one-level-down (A2) course works for the B1 student
  const page = doc.createElement("div"); doc.body.appendChild(page);
  d.window.sessionStorage.removeItem("enr"); E.pages["student/courses"](page, u); page.querySelector('[data-t="avail"]').click(); await sleep(10);
  const a2 = [...page.querySelectorAll("table tr")].slice(1).find(r => /^A2/.test(r.children[1].textContent) && r.querySelector("[data-add]") && !/conflict/i.test(txt(r.querySelector("[data-add]"))));
  ok(!!a2, "an A2 course with a free time slot is offered to the B1 student");
  if (a2) { const before = JSON.parse(d.window.sessionStorage.getItem("enr") || "{}"); a2.querySelector("[data-add]").click(); await sleep(20);
    const after = JSON.parse(d.window.sessionStorage.getItem("enr") || "{}"); ok(Object.keys(after).length > Object.keys(before).length, "the B1 student can enroll in the A2 course: " + Object.keys(after).join(",")); }
  console.log("\\nRESULT enrollment levels: " + pass + " passed, " + fail + " failed"); if (fail) { console.log(failures.join("\\n")); process.exit(1); }
})().catch(e => { console.error("HARNESS ERROR", e); process.exit(2); });
`);
