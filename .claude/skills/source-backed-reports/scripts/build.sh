#!/usr/bin/env bash
# Compile and run every check. Non-zero exit means the report is not ready.
cd "$(dirname "$0")/.." || exit 1
tectonic -X compile main.tex --keep-intermediates > build.log 2>&1
echo "errors:         $(grep -cE '^error:|^! ' build.log)"
grep -E '^error:|^! ' build.log | head -20
echo "overfull boxes: $(grep -c 'Overfull' build.log)"
grep 'Overfull' build.log | sed 's/.*warning: //' | sort -u | head -10
echo "undefined refs: $(grep -cE 'Reference .* undefined|Citation .* undefined' build.log)"
python3 scripts/checkcites.py || exit 1
python3 scripts/verify.py    || exit 1
python3 - <<'PY'
import subprocess
pages = subprocess.run(['pdftotext', '-layout', 'main.pdf', '-'],
                       capture_output=True, text=True).stdout.split('\f')
low = [i for i, p in enumerate(pages, 1) if len(p.split()) < 100]
print("pages: %d, pages under 100 words: %d %s" % (len(pages), len(low), low[:12]))
PY
