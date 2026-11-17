#!/usr/bin/env python3
"""Build CELS Portal term data from the class-schedule workbook.

Usage:  python3 tools/build_terms.py path/to/2026_Class_Schedule.xlsx

Writes (relative to the project root):
  data/november.js   window.CELS_NOV  (Module E, Nov 9 - Dec 4, plus Volunteer Week key dates)
  data/december.js   window.CELS_DEC  (EEE program, week 1 = Dec 7-11, week 2 = Dec 14-18)
  tools/admin-import/*.xlsx           files for Admin > Courses > Import this schedule
  tools/build_report.txt              conflicts and missing information found in the workbook

The workbook itself is NOT stored in the repository.
"""
import sys, re, json, datetime as dt, collections, os, warnings
import openpyxl
warnings.filterwarnings("ignore")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1]
wb = openpyxl.load_workbook(SRC, data_only=True)
REPORT = []
def note(msg):
    if msg not in REPORT: REPORT.append(msg)

def merged_value(ws, r, c):
    """Value of a cell, resolving merged ranges to their top-left cell."""
    v = ws.cell(r, c).value
    if v is not None: return v
    for rng in ws.merged_cells.ranges:
        if rng.min_row <= r <= rng.max_row and rng.min_col <= c <= rng.max_col:
            return ws.cell(rng.min_row, rng.min_col).value
    return None

def fill_hex(cell, default):
    f = cell.fill
    if f and f.fill_type == "solid" and isinstance(f.fgColor.rgb, str) and len(f.fgColor.rgb) == 8:
        return "#" + f.fgColor.rgb[2:].upper()
    return default

def hm(s):
    h, m = s.split(":"); return "%02d:%02d" % (int(h), int(m))

def weekdays(a, b):
    d, out = dt.date.fromisoformat(a), []
    while d <= dt.date.fromisoformat(b):
        if d.weekday() < 5: out.append(d.isoformat())
        d += dt.timedelta(days=1)
    return out

DAYS5 = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
FT_SLOTS_SHEET = [["08:30","09:00"],["09:10","09:40"],["09:50","10:20"],["10:30","11:00"],["11:10","11:40"],   # the layout on the FT11-NOVEMBER sheet
                  ["13:00","13:30"],["13:40","14:10"],["14:20","14:50"],["16:10","17:00"],["17:10","18:00"]]
# Free Talk is three 30-minute sessions in each class period (periods 1 to 4), then the two 1-on-1 / Student Buddy times
FT_SLOTS = [["08:30","09:00"],["09:00","09:30"],["09:30","10:00"],["10:10","10:40"],["10:40","11:10"],["11:10","11:40"],
            ["12:50","13:20"],["13:20","13:50"],["13:50","14:20"],["14:30","15:00"],["15:00","15:30"],["15:30","16:00"],
            ["16:10","17:00"],["17:10","18:00"]]
NFREE = 12   # slots 0-11 are Free Talk, 12-13 are 1-on-1 / Student Buddy
BOOK_COLOR = {"free-talk": "#FFF2CC", "one-on-one": "#FBBC04", "student-buddy": "#FBBC04"}

# --------------------------------------------------------------------------- courses
NOV_COURSES = {  # token in grid -> (id, display name)
    "Filipino Travel": ("ftr", "Filipino Travel"), "Japanese": ("japanese", "Japanese"),
    "Reading Skills": ("rs", "Reading Skills"), "Grammar Builder": ("gb", "Grammar Builder"),
    "Business English": ("be", "Business English"), "Korean": ("korean", "Korean"),
    "Filipino": ("filipino", "Filipino"), "English Communication Skills": ("ecs", "English Communication Skills"),
    "Mandarin (Chinese)": ("mandarin", "Mandarin (Chinese)"), "SDGs for EFL": ("sdgs", "SDGs for EFL"),
    "Exam Foundations (A1-A2)": ("examf", "Exam Foundations"),
}
SECTION_SHEET_COURSE = {  # course title on the "Trs Class & Room" sheet -> course id
    "ENGLISH COMMUNICATION SKILLS": "ecs", "Reading Skills": "rs", "IELTS": "ielts", "TOEIC R & L": "toeic",
    "Exam Foundations": "examf", "SDGs for EFL": "sdgs", "Mandarin": "mandarin", "Grammar Builder": "gb",
    "Business English": "be", "Korean": "korean", "Filipino": "filipino", "Filipino Travel": "ftr", "Japanese": "japanese",
}
FALLBACK_COLOR = {"ecs": "#FFE599", "ielts": "#B4A7D6", "toeic": "#B4A7D6", "examf": "#B4A7D6", "sdgs": "#B4A7D6",
                  "mandarin": "#D0E0E3", "filipino": "#D0E0E3", "korean": "#D0E0E3", "japanese": "#EAD1DC",
                  "ftr": "#EAD1DC", "rs": "#F1C232", "gb": "#D0E0E3", "be": "#D0E0E3", "ffc": "#EAD1DC"}

def tokens_to_ids(cell_text):
    ids = []
    for tok in [t.strip() for t in str(cell_text).replace("\n", "/").split("/") if t.strip()]:
        if tok.startswith("IELTS or TOEIC"): ids += ["ielts", "toeic"]
        elif tok in NOV_COURSES: ids.append(NOV_COURSES[tok][0])
        else: note("UNRECOGNISED course token in November grid: %r" % tok)
    return ids

# --------------------------------------------------------------------------- November term
def build_november():
    ws = wb["November"]
    start, end = "2026-11-09", "2026-12-04"
    assert "Nov 9 - Dec 4" in str(ws["A2"].value)
    periods = {}
    for r in range(3, 14):
        m = re.search(r"PERIOD\s*(\d)\s*-\s*(\d+:\d+)\s*-\s*(\d+:\d+)", str(ws.cell(r, 1).value or ""))
        if m: periods[int(m.group(1))] = [hm(m.group(2)), hm(m.group(3))]
    assert len(periods) == 6, periods
    rows_for = {1: (3, 4), 2: (5, 6), 3: (8, 9), 4: (10, 11)}
    grid, colors = [], {}
    for ci in range(5):
        day = []
        for p in (1, 2, 3, 4):
            groups = []
            for r in rows_for[p]:
                v = merged_value(ws, r, 2 + ci)
                if not v: continue
                ids = tokens_to_ids(v)
                if ids and ids not in groups: groups.append(ids)   # a merged cell spans both rows
                col = fill_hex(ws.cell(r, 2 + ci), None)
                for i in ids: colors.setdefault(i, col)
            day.append(groups)
        grid.append(day)
    # sections
    ws2 = wb[[n for n in wb.sheetnames if n.startswith("NOVEMBER 2026 Trs Class")][0]]
    raw, r = [], 1
    while r <= ws2.max_row:
        a = ws2.cell(r, 1).value
        if a and ws2.cell(r + 1, 1).value == "ROOM":
            cid = SECTION_SHEET_COURSE[a.strip()]
            for c in range(2, 15):
                t = ws2.cell(r + 3, c).value
                if t:
                    raw.append(dict(course=cid, hdr=str(ws2.cell(r, c).value).strip(), sec=str(ws2.cell(r + 2, c).value).strip(),
                                    room=int(ws2.cell(r + 1, c).value), teacher=t.strip(), col=c))
            r += 4
        else: r += 1
    sections, seen = [], collections.Counter()
    for s in raw:
        lvl = s["hdr"].split("-")[0].strip() if re.match(r"^[ABC][12]-", s["hdr"]) else s["hdr"]
        s["level"] = lvl
        seen[(s["course"], lvl, s["sec"])] += 1
    for s in raw:
        key = (s["course"], s["level"], s["sec"]); sec = s["sec"]
        if seen[key] > 1:
            grp = s["hdr"].split("-", 1)[1] if "-" in s["hdr"] else s["hdr"]
            sec = "%s (%s)" % (s["sec"], s["hdr"])
            note("DUPLICATE section label in November class sheet: %s %s section %s appears %d times (%s). "
                 "Disambiguated with the sheet's own header, e.g. '%s'." % (s["course"], s["level"], s["sec"], seen[key],
                 ", ".join("%s/%s" % (x["teacher"], x["room"]) for x in raw if (x["course"], x["level"], x["sec"]) == key), sec))
        sid = "n11-%s-%s-%s" % (s["course"], re.sub(r"[^A-Za-z0-9]+", "", s["level"]), re.sub(r"[^A-Za-z0-9]+", "", sec))
        sections.append(dict(id=sid, course=s["course"], level=s["level"], section=sec, room=s["room"], teacher=s["teacher"]))
    assert len({x["id"] for x in sections}) == len(sections), "section id collision"
    # teacher / room clashes (using the grid)
    slots = collections.defaultdict(set)
    for d, day in enumerate(grid):
        for p, groups in enumerate(day):
            for g in groups:
                for cid in g: slots[cid].add((d, p + 1))
    tm, rm = collections.defaultdict(list), collections.defaultdict(list)
    for s in sections:
        for sl in slots[s["course"]]:
            tm[(s["teacher"], sl)].append(s); rm[(s["room"], sl)].append(s)
    for (t, sl), l in sorted(tm.items()):
        if len(l) > 1: note("TEACHER CLASH (Nov): %s teaches %s at the same time (%s P%d)" % (t, " and ".join("%s %s-%s" % (x["course"], x["level"], x["section"]) for x in l), DAYS5[sl[0]][:3], sl[1]))
    for (ro, sl), l in sorted(rm.items(), key=lambda x: str(x[0])):
        if len(l) > 1: note("ROOM CLASH (Nov): room %s used by %s at %s P%d" % (ro, " and ".join("%s %s-%s" % (x["course"], x["level"], x["section"]) for x in l), DAYS5[sl[0]][:3], sl[1]))
    # courses (names from the grid/section sheets)
    names = {"ielts": "IELTS", "toeic": "TOEIC R & L", "examf": "Exam Foundations"}
    for v in NOV_COURSES.values(): names[v[0]] = v[1]
    used = {s["course"] for s in sections} | {i for d in grid for p in d for g in p for i in g}
    courses = {i: {"name": names[i], "color": colors.get(i) or FALLBACK_COLOR[i]} for i in sorted(used)}
    order = ["ecs","rs","gb","be","ielts","toeic","examf","sdgs","mandarin","japanese","korean","filipino","ftr"]
    courses = {k: courses[k] for k in order if k in courses}
    legend, byc = [], collections.OrderedDict()
    for k, v in courses.items(): byc.setdefault(v["color"], []).append(v["name"])
    for col, ns in byc.items(): legend.append([" / ".join(ns), col])
    legend += [["Free Talk", BOOK_COLOR["free-talk"]], ["One-on-One / Student Buddy", BOOK_COLOR["one-on-one"]]]
    # key dates
    dates = [
        {"label": "Orientation (Volunteer Week)", "date": "2026-11-02"},
        {"label": "Volunteer Work (Volunteer Week)", "date": "2026-11-03"},
        {"label": "Presentations (Volunteer Week)", "date": "2026-11-06"},
        {"label": "Last date of enrolment", "date": str(ws["C18"].value)[:10]},
        {"label": "Dropping of classes deadline", "date": "2026-11-20"},
    ]
    note("YEAR TYPO: 'Dropping of Classes Deadline' is stored as %s on the November sheet; treated as 2026-11-20 (a Friday)." % str(ws["C19"].value)[:10])
    # free talk / one-on-one
    ft_old, booked_old = ft_from_sheet(start, end)
    ft_days, booked = convert_ft(ft_old, booked_old, sections, grid, periods)
    term = {"key": "nov", "module": "Module E / SC 11", "start": start, "end": end, "days": weekdays(start, end),
            "periods": {str(k): v for k, v in periods.items()}, "courses": courses, "grid": grid, "sections": sections,
            "colors": BOOK_COLOR, "legend": legend, "dates": sorted(dates, key=lambda x: x["date"]),
            "ft": {"slots": FT_SLOTS, "nFree": NFREE, "days": ft_days, "booked": booked}}
    return term, raw

# --------------------------------------------------------------------------- Free Talk sheet
def ft_from_sheet(start, end):
    ws = wb["FT11-NOVEMBER"]
    heads = [(r, str(ws.cell(r, 1).value).strip().upper()) for r in range(1, ws.max_row + 1)
             if str(ws.cell(r, 1).value).strip().upper() in ("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY")]
    assert [h[1] for h in heads] == [d.upper() for d in DAYS5], heads
    offs = [2, 4, 6, 8, 10, 14, 16, 18, 20, 22]
    days, booked, allnames = [], [], None
    first_names = None
    for di, (hr, _) in enumerate(heads):
        labs = [str(ws.cell(hr + o, 2).value).replace(" ", "") for o in offs]
        exp = [a.lstrip("0") + "-" + b.lstrip("0") for a, b in FT_SLOTS_SHEET]
        assert [l.lstrip("0").replace("-0", "-") for l in labs] == [e.replace("-0", "-") for e in exp], (hr, labs)
        names = {c: str(ws.cell(hr + 1, c).value).strip() for c in range(3, 40) if ws.cell(hr + 1, c).value}
        if first_names is None: first_names = names
        elif names != first_names: note("FT sheet: teacher columns differ between day blocks (%s)" % DAYS5[di])
        d = {}
        for c, t in names.items():
            s = ""
            for si, o in enumerate(offs):
                v = merged_value(ws, hr + o, c)
                if v is None or str(v).strip() == "": s += "o"
                elif str(v).strip().upper() == "CLOSED": s += "c"
                else:
                    s += "o"
                    txt = str(v).strip(); nums = [int(x) for x in re.findall(r"\d+", txt)]
                    who = re.sub(r"[\d&,()]+", " ", txt).strip(" ,-") or txt
                    for n in nums:
                        date = dt.date(2026, 11, n)
                        if date.weekday() != di:
                            note("FT booking note %r for %s on %s: day-of-month %d is a %s, not a %s - SKIPPED" % (txt, t, DAYS5[di], n, date.strftime("%A"), DAYS5[di]))
                            continue
                        booked.append({"date": date.isoformat(), "teacher": t, "slot": si, "who": who})
            d[t] = s
        days.append(dict(sorted(d.items(), key=lambda kv: kv[0].lower())))
    return days, sorted(booked, key=lambda b: (b["date"], b["teacher"], b["slot"]))

# --------------------------------------------------------------------------- December (EEE) terms
def parse_eee_timetable(ws):
    """Return {week: {course title: {'Gr 1': (level, section, room, teacher), ...}}} for both weeks."""
    out, cur = {}, None
    r = 1
    week = 0
    while r <= ws.max_row:
        a = ws.cell(r, 1).value
        if a and "Duration" in str(a): week += 1
        if a and ws.cell(r + 1, 1).value == "ROOM":
            out.setdefault(week, {})[str(a).strip()] = [
                dict(level=str(ws.cell(r, c).value).strip(), room=int(float(ws.cell(r + 1, c).value)),
                     section=str(ws.cell(r + 2, c).value).strip(), teacher=str(ws.cell(r + 3, c).value).strip())
                for c in (2, 3)]
            r += 4
        else: r += 1
    return out

def build_december(ft_names):
    prog, tt = wb["December Program"], parse_eee_timetable(wb["EEE-Dec Timetable"])
    canon = {n.lower(): n for n in ft_names}
    cn = lambda n: canon.get(n.strip().lower(), n.strip())
    TITLE = {"Filipino Food Culture": ("ffc", "Filipino Food Culture", "Filipino Food Culture"),
             "English Communication Skills": ("ecs", "English Communication Skills", "ENGLISH COMMUNICATION SKILLS"),
             "SDGs For EFL - Life on Water": ("sdgw", "SDGs for EFL: Life on Water", "SDG (Life on Water)"),
             "SDGs For EFL -Life on Land": ("sdgl", "SDGs for EFL: Life on Land", "SDG (Life on Land)"),
             "Presentation Skills": ("pres", "Presentation Skills", "Presentation Skills"),
             "Filipino Travel": ("ftr", "Filipino Travel", "Filipino Travel")}
    periods = {"1": ["08:30","09:20"], "2": ["09:40","10:30"], "3": ["10:50","11:40"], "4": ["12:50","13:40"],
               "5": ["14:00","14:50"], "6": ["15:10","16:00"]}
    note("DECEMBER: the sheet labels three rows 'PERIOD 5' (14:00-14:50, 15:10-16:00, 16:10-17:00). Treated as periods 5, 6 and the 1-on-1/Buddy slot 16:10-17:00; "
         "the 17:10-18:00 row (labelled PERIOD 6) is the second 1-on-1/Buddy slot.")
    note("DECEMBER: dates are written 'Dec 7, 2025' etc. Treated as 2026 (Dec 7, 2026 is a Monday; Dec 7, 2025 is a Sunday).")
    note("DECEMBER: rows 40-56 of 'December Program' (6 University students, Dec 14-16) say 'no need to create new classes'; no entries were created for them.")
    colorcache = {}
    terms, imports = [], []
    for wk, (r0, start, end, label) in enumerate([(3, "2026-12-07", "2026-12-11", "EEE Program, week 1"),
                                                  (22, "2026-12-14", "2026-12-18", "EEE Program, week 2")], 1):
        grid = [[[] for _ in range(6)] for _ in range(5)]
        sections, courses = {}, {}
        prow = {1: r0 + 1, 2: r0 + 3, 3: r0 + 5, 4: r0 + 8, 5: r0 + 10, 6: r0 + 12}
        acts = []
        for di in range(3):                       # Mon-Wed carry classes
            for p, row in prow.items():
                v = prog.cell(row, 2 + di).value
                if not v: continue
                title = str(v).split("\n")[0].strip()
                if title not in TITLE: note("DECEMBER: unrecognised course title %r (week %d)" % (title, wk)); continue
                cid, cname, ttname = TITLE[title]
                grid[di][p - 1] = [[cid]]
                colorcache.setdefault(cid, fill_hex(prog.cell(row, 2 + di), FALLBACK_COLOR.get(cid, "#D0E0E3")))
                courses[cid] = {"name": cname, "color": colorcache[cid]}
                m = re.search(r"G1\s*-\s*(\w+)\s*-\s*(\d+).*?G2\s*-\s*(\w+)\s*-\s*(\d+)", str(v).replace("\n", " "))
                prog_t = {"Gr 1": (cn(m.group(1)), int(m.group(2))), "Gr 2": (cn(m.group(3)), int(m.group(4)))}
                for gi, info in enumerate(tt[wk][ttname]):
                    pt, room = prog_t["Gr %d" % (gi + 1)]
                    if cn(info["teacher"]) != pt:
                        note("DECEMBER week %d TEACHER MISMATCH: %s group %d is '%s' on 'December Program' but '%s' on 'EEE-Dec Timetable'. Used '%s' (Program)." % (wk, cname, gi + 1, pt, info["teacher"], pt))
                    if room != info["room"]: note("DECEMBER week %d ROOM MISMATCH for %s group %d: %s vs %s" % (wk, cname, gi + 1, room, info["room"]))
                    sid = "d%d-%s-G%d" % (wk, cid, gi + 1)
                    prev = sections.get(sid)
                    if prev and (prev["teacher"], prev["room"]) != (pt, room): note("DECEMBER week %d: %s group %d has different teachers on different days" % (wk, cname, gi + 1))
                    sections[sid] = dict(id=sid, course=cid, level=info["level"], section=info["section"], room=room, teacher=pt, group="G%d" % (gi + 1), closed=True)
        # Thu / Fri activities (explicit times where the sheet gives them, else the merged cell span)
        def vols(cell):
            return ", ".join(re.sub(r"^\d+\.\s*", "", x).strip() for x in str(cell).split("\n") if re.match(r"^\s*\d+\.", x) and re.sub(r"^\s*\d+\.\s*", "", x).strip())
        thu, fri = prog.cell(r0 + 1, 5).value, prog.cell(r0 + 1, 6).value
        d_thu, d_fri = start[:8] + "%02d" % (int(start[8:]) + 3), start[:8] + "%02d" % (int(start[8:]) + 4)
        city = prog.cell(r0 + 8, 5).value; anya = prog.cell(r0 + 12, 5).value
        acts = [
            {"title": "SDG Volunteer Activity (shopping & lunch, SM Seaside)", "date": d_thu, "start": "08:30", "end": "11:40", "type": "event", "teacher": vols(thu)},
            {"title": "City Tour", "date": d_thu, "start": "12:50", "end": "14:50", "type": "event", "teacher": vols(city)},
            {"title": "Anya's Home (c/o Satoshi San and JPN team)", "date": d_thu, "start": "15:00", "end": "19:00", "type": "event"},
            {"title": "Island Hopping (c/o Satoshi San & JP Marketing Team)", "date": d_fri, "start": "09:00", "end": "15:00", "type": "event",
             "teacher": re.search(r"\(([^)]*)\)\s*$", str(fri).strip()).group(1) if re.search(r"\(([^)]*)\)\s*$", str(fri).strip()) else "Kath"},
        ]
        if wk == 1:
            acts[3]["teacher"] = "Kath"
            note("DECEMBER week 1: Island Hopping says '2 TEACHER VOLUNTEERS (Kath)' but names only one teacher; only Kath is shown.")
        legend = [[v["name"], v["color"]] for v in courses.values()] + [["EEE activity", "#e1ebf8"], ["One-on-One / Student Buddy", BOOK_COLOR["one-on-one"]]]
        empty = [{} for _ in range(5)]
        term = {"key": "dec%d" % wk, "module": "EEE Program (Explore, Express, Engage), " + ("week 1" if wk == 1 else "week 2"),
                "start": start, "end": end, "days": weekdays(start, end), "periods": periods, "courses": courses, "grid": grid,
                "sections": list(sections.values()), "colors": BOOK_COLOR, "legend": legend,
                "dates": [{"label": label + " begins (" + dt.date.fromisoformat(start).strftime("%b %-d") + " to " + dt.date.fromisoformat(end).strftime("%b %-d") + ")", "date": start}],
                "acts": acts, "ft": {"slots": FT_SLOTS, "nFree": NFREE, "days": empty, "booked": []}}
        terms.append(term)
    note("DECEMBER: no Free Talk / 1-on-1 teacher availability exists for Dec 7-18 in the workbook (FT11-NOVEMBER covers Nov 9 - Dec 4). "
         "Only Student Buddy (no teacher needed) is bookable on those dates. Nothing was invented.")
    note("DECEMBER: nothing in the workbook covers Dec 21 onward.")
    return terms

# --------------------------------------------------------------------------- Free Talk: sheet layout -> three sessions per period
def load_aliases():
    t = open(os.path.join(ROOT, "data/faculty.js")).read()
    m = re.search(r'"aliases":\s*\{([^}]*)\}', t)
    return dict(re.findall(r'"([^"]+)":\s*"([^"]+)"', m.group(1))) if m else {}

def convert_ft(days_old, booked_old, sections, grid, periods):
    """The FT11-NOVEMBER sheet lists 8 Free Talk times (8:30, 9:10, 9:50, 10:30, 11:10, 13:00, 13:40, 14:20) and 2 one-on-one times.
    The portal now offers three 30-minute sessions in each of periods 1 to 4 (12 in all) plus the same 2 one-on-one times.
    A new session is open when every sheet time that overlaps it is open. Where no sheet time overlaps it (15:00 to 16:00) the sheet says
    nothing, so it is open when the teacher is not teaching that period. Sheet bookings move to the new session they overlap most."""
    mins = lambda t: int(t[:2]) * 60 + int(t[3:])
    al = load_aliases()
    iv = collections.defaultdict(list)    # (teacher, weekday) -> class intervals
    for sec in sections:
        for w, day in enumerate(grid):
            for pi, groups in enumerate(day):
                if any(sec["course"] in g for g in groups):
                    iv[(al.get(sec["teacher"], sec["teacher"]), w)].append((mins(periods[pi + 1][0]), mins(periods[pi + 1][1])))
    new_days, inferred, closed_by_sheet, opened_by_booking = [], 0, 0, []
    for w, day in enumerate(days_old):
        nd = {}
        for t, old in day.items():
            out = ""
            for k in range(NFREE):
                a, b = mins(FT_SLOTS[k][0]), mins(FT_SLOTS[k][1])
                ov = [i for i in range(8) if mins(FT_SLOTS_SHEET[i][0]) < b and mins(FT_SLOTS_SHEET[i][1]) > a]
                if ov: st = "o" if all(old[i] == "o" for i in ov) else "c"
                else:
                    st = "c" if any(x < b and y > a for x, y in iv.get((t, w), [])) else "o"
                    if st == "o": inferred += 1
                out += st
            nd[t] = out + old[8:10]
        new_days.append(nd)
    booked = []
    for bk in booked_old:
        w = dt.date.fromisoformat(bk["date"]).weekday()
        if bk["slot"] >= 8: ns = bk["slot"] + 4
        else:
            a, b = mins(FT_SLOTS_SHEET[bk["slot"]][0]), mins(FT_SLOTS_SHEET[bk["slot"]][1])
            ns = max(range(NFREE), key=lambda k: (min(b, mins(FT_SLOTS[k][1])) - max(a, mins(FT_SLOTS[k][0])), -k))
            note("FREE TALK booking on the sheet: %s, %s, %s-%s (%s) moved to the new session %s-%s, the one it overlaps most." % (bk["teacher"], bk["date"], FT_SLOTS_SHEET[bk["slot"]][0], FT_SLOTS_SHEET[bk["slot"]][1], bk["who"], FT_SLOTS[ns][0], FT_SLOTS[ns][1]))
        row = new_days[w][bk["teacher"]]
        if row[ns] != "o": opened_by_booking.append((bk["teacher"], bk["date"])); new_days[w][bk["teacher"]] = row[:ns] + "o" + row[ns + 1:]
        booked.append(dict(bk, slot=ns))
    if opened_by_booking: note("FREE TALK: %d sheet booking(s) fall in a session that would otherwise be closed; the session is kept open for the booking: %s." % (len(opened_by_booking), ", ".join("%s %s" % x for x in opened_by_booking)))
    note("FREE TALK layout: 3 sessions per period (8:30-10:00, 10:10-11:40, 12:50-14:20, 14:30-16:00). %d sessions (15:00 to 16:00) have no entry on the sheet and are open only because the teacher is not teaching then; please confirm teachers really offer Free Talk in the afternoon." % inferred)
    return new_days, booked

# --------------------------------------------------------------------------- output
def js(name, var, obj, header):
    p = os.path.join(ROOT, "data", name)
    with open(p, "w") as f:
        f.write("/* %s */\nwindow.%s=%s;\n" % (header, var, json.dumps(obj, ensure_ascii=False, separators=(",", ":"))))
    return p

def admin_import(term, path, term_id, name):
    wb2 = openpyxl.Workbook()
    ws = wb2.active; ws.title = "Term"; ws.append(["id", "name", "starts_on", "ends_on"]); ws.append([term_id, name, term["start"], term["end"]])
    ws = wb2.create_sheet("Courses"); ws.append(["id", "name", "color"])
    for k, v in term["courses"].items(): ws.append([k, v["name"], v["color"]])
    ws = wb2.create_sheet("Sections"); ws.append(["course_id", "level", "section", "room", "teacher"])
    for s in term["sections"]: ws.append([s["course"], s["level"], s["section"], s["room"], s["teacher"]])
    ws = wb2.create_sheet("Meetings"); ws.append(["course_id", "weekday", "period"])
    seen = set()
    for d, day in enumerate(term["grid"]):
        for p, groups in enumerate(day):
            for g in groups:
                for cid in g:
                    if cid in term["courses"] and (cid, d, p) not in seen:
                        seen.add((cid, d, p)); ws.append([cid, DAYS5[d], p + 1])
    ws = wb2.create_sheet("Key Dates"); ws.append(["label", "date"])
    for d in term["dates"]: ws.append([d["label"], d["date"]])
    os.makedirs(os.path.dirname(path), exist_ok=True); wb2.save(path)
    return len(term["sections"]), len(seen)

if __name__ == "__main__":
    nov, raw = build_november()
    ft_names = list(nov["ft"]["days"][0].keys())
    dec = build_december(ft_names)
    # teachers that teach (Nov) but have no Free Talk column, and the reverse
    teach = {s["teacher"] for s in nov["sections"]}
    for t in sorted(teach - set(ft_names)): note("Teacher '%s' teaches a November class but has no column on FT11-NOVEMBER (no Free Talk availability)." % t)
    note("FT11-NOVEMBER has %d teacher columns; %d dated booking notes imported as pre-booked slots." % (len(ft_names), len(nov["ft"]["booked"])))
    js("november.js", "CELS_NOV", nov, "Module E / SC 11 (Nov 9 - Dec 4, 2026). Generated by tools/build_terms.py from the class-schedule workbook.")
    js("december.js", "CELS_DEC", dec, "EEE Program, Dec 7-11 and Dec 14-18, 2026. Generated by tools/build_terms.py from the class-schedule workbook.")
    counts = {}
    counts["nov"] = admin_import(nov, os.path.join(ROOT, "tools/admin-import/nov2026.xlsx"), "nov2026", "Module E / SC 11 (Nov 9 - Dec 4, 2026)")
    counts["dec1"] = admin_import(dec[0], os.path.join(ROOT, "tools/admin-import/dec2026-week1.xlsx"), "dec2026w1", "EEE Program, week 1 (Dec 7-11, 2026)")
    counts["dec2"] = admin_import(dec[1], os.path.join(ROOT, "tools/admin-import/dec2026-week2.xlsx"), "dec2026w2", "EEE Program, week 2 (Dec 14-18, 2026)")
    summary = ["Sections / meeting rows per import file: " + json.dumps(counts)]
    with open(os.path.join(ROOT, "tools/build_report.txt"), "w") as f: f.write("\n".join(REPORT + summary) + "\n")
    print("\n".join(REPORT + summary))
