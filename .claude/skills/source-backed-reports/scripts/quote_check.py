"""Verify that every figure the prose attributes to a source is really in it.

Macros protect computed numbers; this protects quoted ones. Point it at the
parsed corpus JSON and give it (title fragment, quoted substrings) pairs.

A failure is sometimes a Unicode variant of the same text (a multiplication
sign, a curly quote) rather than a wrong number -- check before correcting.
"""
import json
import re
import sys

CORPUS = sys.argv[1] if len(sys.argv) > 1 else "raw/corpus_parsed.json"
DOCS = {r.get("title", ""): re.sub(r"\s+", " ", r.get("body", ""))
        for r in json.load(open(CORPUS))}
BAD = []


def has(title_fragment, *quoted):
    body = next((v for k, v in DOCS.items()
                 if title_fragment.lower() in k.lower()), None)
    if body is None:
        print("  MISSING DOC: %s" % title_fragment)
        BAD.append(title_fragment)
        return
    for q in quoted:
        ok = q in body
        print("  %s %-54s | %s" % ("OK" if ok else "!!", q[:52],
                                   title_fragment[:26]))
        if not ok:
            BAD.append("%s :: %s" % (title_fragment, q))


if __name__ == "__main__":
    # --- add one has(...) per cited document, e.g.:
    # has("Near-daily AI use", "from 8% to 19%", "fell from 17% to 10%")
    if BAD:
        print("\n%d unverified quotation(s)" % len(BAD))
        sys.exit(1)
    print("\nall quotations verified")
