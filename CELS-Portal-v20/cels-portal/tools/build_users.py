#!/usr/bin/env python3
"""Build the account files for Admin > Users from the faculty workbook.

Usage: python3 tools/build_users.py path/to/CELS_Faculty.xlsx [output_dir]

Writes to output_dir (default: current directory), NOT into the project, because the files contain staff emails:
  cels-teachers-users-import.xlsx   upload in Admin > Users > Import (teachers only; the importer does not accept admins)
  cels-login-info.xlsx              who signs in how, plus the admins to add one by one (Admin > Users > Add user, role admin)

How accounts work in this portal (from the app's own Users page):
  - teachers sign in with their school Google account; the import pre-registers their email, no password is created or needed
  - admins are sent an invitation and set their own password
No passwords are generated or stored anywhere.
A teacher's "my classes" page matches the profile nickname to the teacher name on the schedule, so nickname = the name the class schedule uses.
"""
import sys, re, os, json, warnings
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
warnings.filterwarnings("ignore")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else "."
os.makedirs(out, exist_ok=True)
ws = openpyxl.load_workbook(src).active
head = [str(c.value).strip() for c in ws[1]]; col = {h: i for i, h in enumerate(head)}
rows = [r for r in ws.iter_rows(min_row=2, values_only=True) if r[col["Name"]]]

def load_js(f, v):
    return json.loads(open(os.path.join(ROOT, "data", f)).read().split("window." + v + "=", 1)[1].rstrip().rstrip(";"))
nov, dec = load_js("november.js", "CELS_NOV"), load_js("december.js", "CELS_DEC")
sched_names = {s["teacher"] for t in [nov] + dec for s in t["sections"]}

def split_name(full):
    t = full.split()
    last = t[-1]; rest = t[:-1]; mid = ""
    if len(rest) > 1 and re.fullmatch(r"[A-Za-z]\.?", rest[-1]): mid = rest[-1]; rest = rest[:-1]
    return " ".join(rest), mid, last

NOTES, people = [], []
for r in rows:
    pos = str(r[col["Position"]]).strip().lower(); raw = str(r[col["Name"]]).strip()
    m = re.match(r"^(.*?)\s*\((.*?)\)\s*$", raw); key, nick = (m.group(1), m.group(2)) if m else (raw, None)
    email = str(r[col["Email"]]).strip().lower(); full = str(r[col["Full Name"]]).strip()
    first, mid, last = split_name(full)
    nickname = nick if (nick and nick in sched_names and key not in sched_names) else key
    if nickname != key: NOTES.append("Nickname for %s is '%s' (the class schedule says '%s', and a teacher's classes are matched by nickname)." % (full, nickname, nick))
    local = re.sub(r"[^a-z]", "", email.split("@")[0])
    if not any(re.sub(r"[^a-z]", "", p.lower()) in local for p in re.split(r"[-\s]", last)):
        NOTES.append("Email '%s' does not contain the last name '%s' (%s). Check it is the right address." % (email, last, full))
    people.append(dict(role="admin" if pos == "admin" else "teacher", email=email, first=first, mid=mid, last=last, nickname=nickname, full=full))
assert len({p["email"] for p in people}) == len(people), "duplicate emails"
miss = sched_names - {p["nickname"] for p in people}
if miss: NOTES.append("Teachers named on the class schedule with no row in the workbook, so no login and their classes show for nobody: " + ", ".join(sorted(miss)) + ".")
adm = [p for p in people if p["role"] == "admin"]; tch = [p for p in people if p["role"] == "teacher"]
ft_names = set(nov["ft"]["days"][0])
adm_teach = [p["nickname"] for p in adm if p["nickname"] in sched_names or p["nickname"] in ft_names]
if adm_teach: NOTES.append("Admins who also appear on the Free Talk / 1-on-1 or class schedule: " + ", ".join(adm_teach) + ". A profile has one role, so Teacher-page features (their sessions and classes) will not show for them unless they also have a separate teacher account.")

F = "Arial"; H = Font(name=F, bold=True, color="FFFFFF"); HF = PatternFill("solid", fgColor="1F3A5F"); B = Font(name=F)
def sheet(wb, title, header, data, widths, first=False):
    s = wb.active if first else wb.create_sheet(); s.title = title
    s.append(header)
    for c in s[1]: c.font, c.fill = H, HF
    for d in data: s.append(d)
    for row in s.iter_rows(min_row=2):
        for c in row: c.font = B; c.alignment = Alignment(wrap_text=True, vertical="top")
    for i, w in enumerate(widths): s.column_dimensions[chr(65 + i)].width = w
    s.freeze_panes = "A2"; return s

# 1) importer file: exactly the columns the Users importer reads
UCOLS = ["role", "email", "first_name", "middle_name", "last_name", "nickname", "student_number", "level", "employee_number", "department", "status"]
wb = openpyxl.Workbook()
sheet(wb, "Users", UCOLS, [[p["role"], p["email"], p["first"], p["mid"], p["last"], p["nickname"], "", "", "", "", "active"] for p in tch], [10, 36, 18, 12, 18, 14, 14, 8, 16, 14, 10], first=True)
rd = wb.create_sheet("README")
for line in ["Upload this file in Admin > Users > Import. It contains teachers only (the importer does not accept admins).",
             "Teachers sign in with their school Google account. No password is created.",
             "nickname must match the teacher name on the class schedule: a teacher's classes are found by nickname.",
             "Names were split from the full name in the faculty workbook: please check first, middle and last names.",
             "Existing emails are updated; new emails are created."]: rd.append([line])
rd.column_dimensions["A"].width = 110
for c in rd["A"]: c.font = B
wb.save(os.path.join(out, "cels-teachers-users-import.xlsx"))

# 2) login info
wb = openpyxl.Workbook()
how = {"teacher": "Sign in with Google using this school email. No password. (Add them first with Admin > Users > Import.)",
       "admin": "Admin > Users > Add user (role admin) sends an invitation to this email; the admin sets their own password from it. Later: Forgot password on the sign-in page."}
sheet(wb, "All staff", ["Role", "Full name", "Nickname (shown in portal)", "Sign-in email", "How they sign in"],
      [[p["role"], p["full"], p["nickname"], p["email"], how[p["role"]]] for p in people], [9, 30, 18, 38, 80], first=True)
sheet(wb, "Admins to add", ["role", "email", "first_name", "middle_name", "last_name", "nickname", "status", "Done"],
      [["admin", p["email"], p["first"], p["mid"], p["last"], p["nickname"], "active", ""] for p in adm], [8, 38, 16, 12, 16, 14, 10, 8])
sheet(wb, "Check before use", ["Item"], [[n] for n in NOTES] or [["Nothing to check."]], [140])
wb.save(os.path.join(out, "cels-login-info.xlsx"))
print("teachers:", len(tch), "| admins:", len(adm)); print("\n".join(NOTES))
