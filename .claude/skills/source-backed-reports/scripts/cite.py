"""Look up a bib key by title substring, so citations are never guessed."""
import re, sys, os

BIB = os.path.join(os.path.dirname(__file__), "..", "refs.bib")
if not os.path.exists(BIB):
    sys.exit("no refs.bib beside this script -- copy it into a report's scripts/")
ENT = re.compile(r"@\w+\{([^,]+),\s*title = \{\{(.*?)\}\},(?:\s*author = \{(.*?)\},)?"
                 r"\s*year = \{(\d{4})\}", re.S)
ROWS = ENT.findall(open(BIB).read())

for q in sys.argv[1:]:
    hits = [r for r in ROWS if q.lower() in r[1].lower()]
    if not hits:
        print("NO MATCH: %s" % q)
    for k, t, a, y in hits[:4]:
        print("%-48s %s  %s (%s)" % (k, t[:64], (a or "-")[:40], y))
