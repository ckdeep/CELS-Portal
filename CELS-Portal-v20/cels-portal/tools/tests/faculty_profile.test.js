// Teacher photo badges and profile cards. Run: node tools/tests/faculty_profile.test.js (needs jsdom, see tools/README.md)
const src = require("fs").readFileSync(__dirname + "/student_portal.test.js", "utf8");
eval(src.slice(0, src.indexOf('(async () => {\n  console.log("== 1.')) + `
const FAC = (() => { const s = {window: {}}; vm.createContext(s); vm.runInContext(fs.readFileSync(path.join(ROOT, "data/faculty.js"), "utf8"), s); return s.window.CELS_FACULTY; })();
const toTeachers = async (d, date, i) => { await clickDate(d, date); return clickTime(d, i); };
(async () => {
  console.log("== Free Talk: photos on teacher cards ==");
  let d = await load("free-talk"); let doc = await toTeachers(d, "2026-11-13", 3);
  ok(d.errors.length === 0, "no script errors " + d.errors.join(";"));
  const cards = [...doc.querySelectorAll(".bk-tc")];
  const withFac = Object.keys(FAC.people).filter(n => freeTeachers("2026-11-13", 3).includes(n));
  ok(withFac.length >= 4, "several faculty teachers are free Fri Nov 13 at 10:30: " + withFac.join(","));
  for (const n of withFac) { const img = doc.querySelector('.bk-tc[data-t="' + n + '"] .fp-av img'); ok(img && img.src === FAC.people[n].photo, n + ": card shows the CELS faculty photo (" + (img && img.src) + ")"); ok(img && img.getAttribute("referrerpolicy") === "no-referrer", n + ": photo does not send a referrer"); }
  const others = cards.filter(c => !FAC.people[c.dataset.t]); ok(others.every(c => !c.querySelector("img") && c.querySelector(".fp-av")), "teachers not in the faculty workbook keep the initials badge (" + others.map(c => c.dataset.t).join(",") + ")");
  ok(cards.filter(c => c.querySelector(".fp-av img")).length >= cards.length - 1, "every free teacher except at most Lester shows a photo (" + cards.filter(c => c.querySelector(".fp-av img")).length + " of " + cards.length + ")");
  ok(cards.every(c => c.querySelector('.fp-av[role="button"][tabindex="0"]')), "every badge is a keyboard-focusable button");

  if (process.env.FACULTY_XLSX) { const XLSX = require("xlsx"), rows = XLSX.utils.sheet_to_json(XLSX.readFile(process.env.FACULTY_XLSX).Sheets[XLSX.readFile(process.env.FACULTY_XLSX).SheetNames[0]]);
    ok(rows.length === Object.keys(FAC.people).length, "faculty.js has one entry per workbook row (" + rows.length + ")");
    rows.forEach(r => { const nm = String(r.Name), key = nm.split(" (")[0], p = FAC.people[key]; ok(p && p.photo === r.Photo.trim() && p.name === r["Full Name"].trim(), "workbook row " + nm + ": photo and full name copied exactly"); if (nm.includes(" (")) ok(FAC.aliases[nm.split(" (")[1].replace(")", "")] === key, nm + ": nickname recorded as an alias"); });
    ok(!JSON.stringify(FAC).includes("@"), "no email addresses in the shipped data"); }
  console.log("== Click a photo: profile card ==");
  const e = withFac.find(n => FAC.people[n].url), P = FAC.people[e];
  doc.querySelector('.bk-tc[data-t="' + e + '"] .fp-av').click(); await sleep(20);
  let ov = doc.querySelector(".fp-ov"); ok(!!ov, "profile card opens");
  ok(ov && txt(ov).includes(P.name) && txt(ov).includes(P.role), "card shows full name and role: " + (ov && txt(ov).slice(0, 80)));
  ok(ov && ov.querySelector(".fp-big img") && ov.querySelector(".fp-big img").src === P.photo, "card shows the large photo");
  const links = ov ? [...ov.querySelectorAll("a.fp-btn")] : [];
  eq(links.map(a => a.href), [P.url, FAC.site], "links go to the teacher's CELS profile and the CELS faculty page");
  ok(links.every(a => a.target === "_blank" && /noopener/.test(a.rel)), "links open in a new tab with rel=noopener");
  ok(!doc.querySelector(".bk-tc.sel") && !doc.querySelector(".bk-sum"), "clicking the photo does NOT select the teacher");
  doc.dispatchEvent(new d.window.KeyboardEvent("keydown", {key: "Escape", bubbles: true})); await sleep(10);
  ok(!doc.querySelector(".fp-ov"), "Escape closes the card");
  doc.querySelector('.bk-tc[data-t="' + e + '"] .fp-av').click(); await sleep(10); doc.querySelector(".fp-x").click(); await sleep(10); ok(!doc.querySelector(".fp-ov"), "the close button closes the card");
  doc.querySelector('.bk-tc[data-t="' + e + '"] .fp-av').click(); await sleep(10); doc.querySelector(".fp-ov").dispatchEvent(new d.window.MouseEvent("click", {bubbles: true})); await sleep(10); ok(!doc.querySelector(".fp-ov"), "clicking outside the card closes it");
  const av = doc.querySelector('.bk-tc[data-t="' + e + '"] .fp-av'); av.focus(); av.dispatchEvent(new d.window.KeyboardEvent("keydown", {key: "Enter", bubbles: true})); await sleep(10);
  ok(!!doc.querySelector(".fp-ov"), "Enter on a focused photo opens the card"); doc.querySelector(".fp-x").click(); await sleep(10);
  ok(doc.activeElement === av, "focus returns to the photo after closing");
  // teacher with a photo but no website profile page
  const np = withFac.find(n => !FAC.people[n].url), NP = FAC.people[np];
  doc.querySelector('.bk-tc[data-t="' + np + '"] .fp-av').click(); await sleep(10); ov = doc.querySelector(".fp-ov");
  ok(ov && txt(ov).includes(NP.name) && txt(ov).includes("Teacher") && !txt(ov).includes("No photo or profile"), np + ": card shows full name and role, no 'missing' note");
  eq([...ov.querySelectorAll("a.fp-btn")].map(a => a.href), [FAC.site], np + ": only the faculty page link (no profile page of their own)");
  ok(ov.querySelector(".fp-big img") && /Classes this term/.test(txt(ov)), np + ": large photo and this term's classes shown"); doc.querySelector(".fp-x").click(); await sleep(10);
  // nickname: Zie is Fritzie
  d.window.CELS.fp.open("Fritzie"); ov = doc.querySelector(".fp-ov"); ok(ov && /also called Zie/.test(txt(ov)) && /Reading Skills/.test(txt(ov)), "Fritzie's card says 'also called Zie' and lists Zie's classes: " + (ov && txt(ov).slice(0, 140))); doc.querySelector(".fp-x").click(); await sleep(10);
  // not in the workbook
  d.window.CELS.fp.open("Lester"); ov = doc.querySelector(".fp-ov"); ok(ov && txt(ov).includes("No photo or profile is on file for Lester") && !ov.querySelector(".fp-big img"), "Lester (not in the workbook): initials and a 'no photo on file' note");
  eq([...ov.querySelectorAll("a.fp-btn")].map(a => a.href), [FAC.site], "Lester: only the faculty page link"); doc.querySelector(".fp-x").click(); await sleep(10);
  // photo that fails to load falls back to initials
  const img = doc.querySelector('.bk-tc[data-t="' + e + '"] .fp-av img'); img.dispatchEvent(new d.window.Event("error")); await sleep(5);
  ok(!doc.querySelector('.bk-tc[data-t="' + e + '"] .fp-av img') && txt(doc.querySelector('.bk-tc[data-t="' + e + '"] .fp-av')).length === 2, "a broken photo falls back to the initials badge");

  console.log("== Selecting a teacher and booking still work ==");
  doc.querySelector('.bk-tc[data-t="' + e + '"] b').click(); await sleep(20);
  ok(doc.querySelector('.bk-tc.sel[data-t="' + e + '"]') && doc.querySelector(".bk-sum"), "clicking the teacher's name still selects them and shows the confirm step");
  const link = doc.querySelector(".bk-sum .fp-link"); ok(link && link.textContent === e, "confirm step: teacher name is a link");
  link.click(); await sleep(10); ok(!!doc.querySelector(".fp-ov") && txt(doc.querySelector(".fp-ov")).includes(P.name), "confirm step: the link opens the profile"); doc.querySelector(".fp-x").click(); await sleep(10);
  doc.getElementById("ok").click(); await sleep(30);
  eq(JSON.parse(d.window.sessionStorage.getItem("bookings")).length, 1, "booking is still saved");
  ok(doc.querySelector(".fp-link"), "my sessions list links the teacher's name"); d.window.close();

  console.log("== 1-on-1 and Student Buddy ==");
  d = await load("one-on-one"); doc = await toTeachers(d, "2026-11-16", 12); ok(d.errors.length === 0, "one-on-one: no errors " + d.errors.join(";"));
  ok(doc.querySelectorAll(".bk-tc .fp-av img").length > 0, "1-on-1 teacher cards show faculty photos (" + doc.querySelectorAll(".bk-tc .fp-av img").length + ")"); d.window.close();
  d = await load("student-buddy"); ok(d.errors.length === 0 && !d.window.document.querySelector(".fp-av"), "Student Buddy page unchanged (no teacher badges)"); d.window.close();

  console.log("\\nRESULT faculty: " + pass + " passed, " + fail + " failed"); if (fail) { console.log(failures.join("\\n")); process.exit(1); }
})().catch(e => { console.error("HARNESS ERROR", e); process.exit(2); });
`);
