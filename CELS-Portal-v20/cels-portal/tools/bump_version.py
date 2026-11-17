#!/usr/bin/env python3
"""Put one version number on every local script, stylesheet and data file in every page, so browsers fetch the new files.

Usage: python3 tools/bump_version.py 23      (run it every time you change a .js, .css or data file, before you publish)

Why: browsers keep old copies of files whose address has not changed. Changing ?v=NN in the page makes them fetch the new one.
"""
import re, glob, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
v = sys.argv[1]
assert re.fullmatch(r"[0-9A-Za-z._-]+", v), "version must be letters, digits, dots, dashes"
pat = re.compile(r'((?:src|href)="(?:\.\./)?(?:assets|data)/[^"?]+?)(?:\?v=[^"]*)?(")')
n = files = 0
for f in sorted(glob.glob(os.path.join(ROOT, "*/*.html")) + [os.path.join(ROOT, "index.html")]):
    h = open(f).read()
    new, c = pat.subn(lambda m: m.group(1) + "?v=" + v + m.group(2), h)
    if new != h: open(f, "w").write(new); files += 1
    n += c
print("version ?v=%s on %d references in %d pages" % (v, n, files))
