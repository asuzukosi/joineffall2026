# Pipeline: corpus to series

## 1. Scope and licence

Check before planning, because it changes what you can build:

| Question | Where to look | Consequence |
|---|---|---|
| Licence | footer, a README in the data ZIP, a `/terms` page | CC-BY means charts can be reproduced with credit; "all rights reserved" means cite the numbers, not the image — unless the document is for private use, which the user must state |
| Paywall | fetch one known-paid item and read what comes back | Metadata may be fully open while bodies are not. Say so in the methodology and compute text measures on the open subset only |
| Datasets | look for `/data`, `/downloads`, a documentation sub-page | If present, this is the spine of the report |

## 2. Enumerate the corpus

Never enumerate from search results. Use, in order of preference:

```bash
# sitemap index → per-type sitemaps → URLs
curl -s https://SITE/sitemap-index.xml | grep -o 'https[^<]*sitemap[^<]*'

# Substack and similar: archive API, paginated
# NOTE: limit is silently capped; 50 returns ~23. Use 20 and step offset by 20.
curl -s 'https://SITE/api/v1/archive?sort=new&offset=0&limit=20'
```

Filter to article paths only; index and `?page=N` pagination pages must be
dropped or they pollute the corpus. Dropping them is why a count may come out
lower than the raw file count — state which.

## 3. Fetch

Serialise. A shared headless browser is one session; parallel jobs collide and
most return errors.

- `scripts/fetch.sh LIST OUTDIR` — resumable, skips non-empty outputs.
- `scripts/fetch_slow.sh LIST OUTDIR DELAY` — adds backoff and 3 retries.

Rate limits are real: a first pass at full speed returned `Too Many Requests`
for 86 of 94 posts on one publisher. Detect by size, delete the short files,
re-run the slow variant:

```bash
for f in OUT/*.txt; do [ $(wc -c < "$f") -lt 3000 ] && rm "$f"; done
```

## 4. Parse

Prefer structured metadata the page already carries:

- **BibTeX block** — many research publishers embed one per article. It gives
  title, authors and year exactly, where heuristics on headings give neither.
- **Archive API JSON** — gives title, date, byline, word count, audience.
- **Fallback only then** to positional parsing of the text.

Record per document: `url, title, date, authors, section, nchars, body`.
Normalise dates to ISO at parse time; mixed `"August 26, 2026"` and
`"2026-08-26"` will otherwise crash a sort later.

## 5. Datasets

The download links are usually not in the page text — the text extraction loses
the `href`. Pull them from the DOM:

```bash
browse js "Array.from(document.querySelectorAll('a')).map(a=>a.getAttribute('href')).filter(h=>h&&/\.(csv|zip|gz)$/i.test(h)).join('|')"
```

Then fetch each with `curl`, unzip archives, and inventory:

```python
for f in files:
    rows = sum(1 for _ in csv.reader(open(f, encoding="utf-8-sig"))) - 1
```

Count rows with `csv`, never `wc -l`: quoted note fields contain newlines and
inflate a line count several-fold.

## 6. Series

`scripts/lib.py` provides `rows`, `num`, `date`, `frac_year`, `write`,
`fit_doubling`, `running_max`, `colname`.

Emit one `.dat` per chart, space-separated, header row first. Keep every series
script small and single-purpose (`s_capability.py`, `s_compute.py`, …) so a
regeneration is cheap and a bug is local.

Every doubling time must be reported with its **window, point count and R²**.
Print them as the script runs; you will need them in captions.
