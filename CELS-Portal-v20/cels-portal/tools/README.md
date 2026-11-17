# tools/

- `build_terms.py` – rebuilds `data/november.js`, `data/december.js` and `tools/admin-import/*.xlsx` from the class-schedule workbook
  (`python3 tools/build_terms.py path/to/2026_Class_Schedule.xlsx`). The workbook is not stored in the repo.
- `build_faculty.py` – rebuilds `data/faculty.js` (teacher photos, full names, nicknames) from `CELS_Faculty.xlsx` (`python3 tools/build_faculty.py path/to/CELS_Faculty.xlsx`). Emails in the workbook are not copied. To also check the shipped data against the workbook: `FACULTY_XLSX=path/to/CELS_Faculty.xlsx node tools/tests/faculty_profile.test.js`.
- `build_users.py` – builds the Admin > Users import file (teachers) and a login-info sheet (incl. admins to invite) from the faculty workbook. Writes outside the project because the files contain staff emails (`python3 tools/build_users.py path/to/CELS_Faculty.xlsx output_dir`).
- `bump_version.py` – run `python3 tools/bump_version.py 23` before publishing any change to a .js, .css or data file: it puts the same `?v=` number on every file in every page so browsers fetch the new copies (otherwise they can keep showing the old version). `tests/asset_versions.test.js` checks it.
- `build_report.txt` – conflicts and missing information found in the workbook on the last build.
- `admin-import/` – files for Admin > Courses > Import this schedule (one term per file).
- `tests/` – jsdom checks (`npm i jsdom@24 xlsx`, then `node tools/tests/student_portal.test.js`, `admin_import.test.js`, `faculty_profile.test.js`, `enrollment_levels.test.js`, `schedule_engine.test.js` and `admin_alerts.test.js`).
