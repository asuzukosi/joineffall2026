"""Rewrite a citation key to the unique bib key it is a prefix of."""
import re, glob, os, sys

def _bib(root):
    """The report's .bib, or a clear message if this is still the skill copy."""
    p = os.path.join(root, "refs.bib")
    if not os.path.exists(p):
        sys.exit("no refs.bib beside %s -- copy this script into a report's "
                 "scripts/ directory and run it from there" % os.path.abspath(root))
    return set(re.findall(r"@\w+\{([^,]+),", open(p).read()))

root = os.path.join(os.path.dirname(__file__), "..")
keys = _bib(root)
files = glob.glob(os.path.join(root, "sections", "*.tex")) + \
        glob.glob(os.path.join(root, "figures", "*.tex"))
fixed = unfixed = 0
for f in files:
    s = orig = open(f).read()
    for k in set(x.strip() for m in re.finditer(r"\\cite[tp]?\{([^}]+)\}", s)
                 for x in m.group(1).split(",")):
        if k in keys:
            continue
        cand = [c for c in keys if c.startswith(k)]
        if len(cand) == 1:
            s = re.sub(r"\b%s\b" % re.escape(k), cand[0], s)
            fixed += 1
            print("  %-40s -> %s" % (k, cand[0]))
        else:
            unfixed += 1
            print("  AMBIGUOUS/UNKNOWN %-38s (%d candidates)" % (k, len(cand)))
    if s != orig:
        open(f, "w").write(s)
print("fixed %d, unresolved %d" % (fixed, unfixed))
sys.exit(1 if unfixed else 0)
