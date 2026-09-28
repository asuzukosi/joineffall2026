# Verification

Three checkers, all wired into `build.sh`, all failing loudly.

## 1. One source of truth for every number

`counts.py` reads the data and emits a macro per quoted figure:

```latex
\newcommand{\hbmShareLast}{63}
\newcommand{\openLagMed}{8.0}
```

Prose cites `\hbmShareLast\,\%`, never `63`. Regenerate the data and the prose
follows. Two constraints on macro names:

- **Letters only.** `\fund2026` is not a legal control word. Translate digits or
  name them (`\fundCurrentYear`).
- **Clean the values.** Curated text fields carry inline tags (`Amazon
  #confident`); strip them or they print.

## 2. Independent re-derivation

`verify.py` recomputes each macro **from the `.dat` files**, by a different
route than `counts.py` used, and compares with tolerance:

```python
check("hbmShareLast", macros["hbmShareLast"], float(rows[-1]["hbm"]))
```

A macro and its check agreeing means the number survived two independent
paths. Disagreement has twice caught a real bug — a partial period, and an
IT-versus-facility power mix-up.

Also report **macros defined but unused** (dead weight) and referenced but
undefined (a typo waiting to print blank).

## 3. Citations are looked up, never guessed

Keys get truncated and mangled; a guessed key silently prints `[?]`.

- `checkcites.py` — every `\cite*` key resolves against the `.bib`; exit 1 if not.
- `fixcites.py` — rewrites a key to the unique entry it is a prefix of; reports
  ambiguities instead of picking.
- `cite.py "title fragment"` — look a key up before writing it.

**tectonic does not always fail on an undefined citation.** Do not rely on the
compiler; run the checker.

## 4. Verify the prose against the sources too

Macros protect computed numbers. Quoted numbers need a different check: search
the parsed corpus for the exact substring you attributed.

```python
def has(title_fragment, *quoted):
    body = find_doc(title_fragment)
    for q in quoted:
        print("OK" if q in body else "!!", q)
```

Run it over every quoted figure before finalising. It catches transcription
slips and misattribution. Note that a failure may be a Unicode variant
(`×` vs `x`, curly quotes) rather than a wrong number — check before correcting.

## build.sh

```bash
tectonic -X compile main.tex --keep-intermediates > build.log 2>&1
echo "errors:   $(grep -cE '^error:|^! ' build.log)"
echo "overfull: $(grep -c 'Overfull' build.log)"
python3 scripts/checkcites.py
python3 scripts/verify.py
```

Target state before calling it done: **0 errors, 0 overfull boxes, 0 unresolved
citations, 0 numeric mismatches, no page under ~100 words.**
