"""Re-derive every quoted macro from the .dat files and fail on a mismatch.

Copy into a report's scripts/ and add one check() per number the prose quotes.
The point is to reach each value by a DIFFERENT route than counts.py used, so
agreement means the number survived two independent computations.

Usage:  python3 scripts/verify.py        # exit 1 if any check fails
"""
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
MACROS = dict(re.findall(r"\\newcommand\{\\(\w+)\}\{(.*?)\}\n",
                         open(os.path.join(ROOT, "counts.tex")).read()))
FAILED = []


def dat(name):
    """Read a generated series file as a list of dicts."""
    lines = open(os.path.join(ROOT, "data", "dat", name)).read().strip().split("\n")
    head = lines[0].split()
    return head, [dict(zip(head, l.split())) for l in lines[1:]]


def check(label, claimed, actual, tol=0.06):
    """Compare a macro's value with an independently computed one."""
    try:
        c = float(str(claimed).replace("{,}", "").replace(",", ""))
        a = float(actual)
    except (TypeError, ValueError):
        print("  ?? %-34s claimed=%r actual=%r" % (label, claimed, actual))
        FAILED.append(label)
        return False
    ok = abs(c - a) <= tol * max(abs(a), 1e-9)
    print("  %s %-34s claimed=%-12s actual=%.6g"
          % ("OK" if ok else "!!", label, c, a))
    if not ok:
        FAILED.append(label)
    return ok


def report_unused():
    used = set()
    for sub in ("sections", "figures"):
        d = os.path.join(ROOT, sub)
        if not os.path.isdir(d):
            continue
        for f in os.listdir(d):
            if f.endswith(".tex"):
                used |= set(re.findall(r"\\([a-zA-Z]+)",
                                       open(os.path.join(d, f)).read()))
    unused = sorted(k for k in MACROS if k not in used)
    print("\nmacros defined but never cited: %d" % len(unused))
    if unused:
        print("  " + ", ".join(unused))


if __name__ == "__main__":
    print("== series cross-checks ==")
    # --- add checks here, e.g.:
    # head, rows = dat("components_share.dat")
    # check("hbmShareLast", MACROS["hbmShareLast"], float(rows[-1]["hbm"]))
    report_unused()
    if FAILED:
        print("\n%d MISMATCH(ES): %s" % (len(FAILED), ", ".join(FAILED)))
        sys.exit(1)
    print("\nall checks pass")
