#!/usr/bin/env bash
#
# Inline a cases.js into index.html to produce ONE self-contained page you can
# email to a reviewer (audio, if embedded, comes along).
#
#   scripts/build-standalone.sh [cases.js] [out.html]
#
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
CASES="${1:-$HERE/cases.js}"
OUT="${2:-$HERE/dist/standalone.html}"
mkdir -p "$(dirname "$OUT")"
python3 - "$HERE/index.html" "$CASES" "$OUT" <<'PY'
import sys, re
idx, cases, out = sys.argv[1], sys.argv[2], sys.argv[3]
html = open(idx).read()
data = open(cases).read()
html, k = re.subn(r'<script src="[^"]*cases\.js"></script>',
                  lambda m: "<script>\n" + data + "\n</script>", html, count=1)
assert k == 1, 'could not find <script src="cases.js"> in index.html'
open(out, "w").write(html)
print("wrote", out, "(", len(html)//1024, "KB )")
PY
