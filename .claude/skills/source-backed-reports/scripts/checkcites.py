import re, glob, sys, os

def _bib(root):
    """The report's .bib, or a clear message if this is still the skill copy."""
    p = os.path.join(root, "refs.bib")
    if not os.path.exists(p):
        sys.exit("no refs.bib beside %s -- copy this script into a report's "
                 "scripts/ directory and run it from there" % os.path.abspath(root))
    return set(re.findall(r"@\w+\{([^,]+),", open(p).read()))

root = os.path.join(os.path.dirname(__file__), "..")
keys = _bib(root)
used = {}
for f in glob.glob(os.path.join(root, "sections", "*.tex")) + \
         glob.glob(os.path.join(root, "figures", "*.tex")):
    for m in re.finditer(r"\\cite[tp]?\{([^}]+)\}", open(f).read()):
        for k in m.group(1).split(","):
            used.setdefault(k.strip(), os.path.basename(f))
missing = sorted(k for k in used if k not in keys)
print("citations: %d used, %d missing" % (len(used), len(missing)))
for k in missing:
    print("  MISSING %-52s (%s)" % (k, used[k]))
sys.exit(1 if missing else 0)
