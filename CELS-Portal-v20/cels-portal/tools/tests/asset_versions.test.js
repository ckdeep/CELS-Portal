// Every local script, stylesheet and data file in every page carries the same ?v= number. Run: node tools/tests/asset_versions.test.js
const fs = require("fs"), path = require("path"), ROOT = path.resolve(__dirname, "../..");
const pages = ["index.html"].concat(["student", "teacher", "admin"].flatMap(d => fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith(".html")).map(f => d + "/" + f)));
const seen = new Set(); let bad = [], n = 0;
pages.forEach(p => { const h = fs.readFileSync(path.join(ROOT, p), "utf8"); for (const m of h.matchAll(/(?:src|href)="((?:\.\.\/)?(?:assets|data)\/[^"]+)"/g)) { n++; const v = (m[1].match(/\?v=([^"]+)$/) || [])[1]; if (!v) bad.push(p + " " + m[1]); else seen.add(v);
  const file = path.join(ROOT, path.dirname(p) === "." ? "" : "", m[1].replace(/^\.\.\//, "").split("?")[0]); if (!fs.existsSync(file)) bad.push(p + " missing file " + m[1]); } });
console.log(pages.length + " pages, " + n + " local references, versions: " + [...seen].join(","));
if (bad.length || seen.size !== 1) { console.log("FAIL", bad.slice(0, 10), [...seen]); process.exit(1); } console.log("RESULT asset versions: all references versioned the same, every file exists");
