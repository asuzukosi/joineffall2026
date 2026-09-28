---
name: source-backed-reports
description: Use when building a long, figure-dense report from a set of web publications and the datasets those publishers release — market analyses, surveys of a literature or an archive, state-of-the-field write-ups — especially when the request says "go through everything", "cover every aspect", "cite the companies and authors", "use the charts from the sources", or "as detailed as possible". Also use when a report must be defensible claim by claim, or when a previous draft was thin, padded, or its numbers could not be traced.
---

# Source-backed reports

A report is defensible when every number in it was recomputed from published
data and every figure names where it came from. This skill is the machinery for
that: enumerate the corpus completely, download the publishers' datasets,
recompute rather than quote, and make the build fail when prose and data
disagree.

## The four rules

1. **Enumerate, never search.** Sitemaps and archive APIs give the whole
   publication record. Search gives a selection someone else made.
2. **Text says what people think; data says what was measured.** If a publisher
   releases CSVs, the CSVs are the spine and the prose is the interpretation.
3. **No number is typed twice.** A generator emits every quoted figure as a
   macro; prose cites macros; a separate checker re-derives them independently
   and fails the build on a mismatch.
4. **Reproduce one published figure exactly before trusting the pipeline.** If
   your recomputation of their headline chart does not match theirs, your
   pipeline is wrong, not theirs. This is the single highest-value check.

## Workflow

| Stage | Do | Detail |
|---|---|---|
| 1 Scope | List sources; check each one's licence and paywall before planning | [references/pipeline.md](references/pipeline.md) |
| 2 Enumerate | Sitemap index, archive API, or `links` crawl → one URL list per source | [references/pipeline.md](references/pipeline.md) |
| 3 Fetch | One request at a time, resumable, with backoff | [scripts/fetch.sh](scripts/fetch.sh), [scripts/fetch_slow.sh](scripts/fetch_slow.sh) |
| 4 Parse | Prefer the page's own BibTeX or JSON metadata over heuristics | [references/pipeline.md](references/pipeline.md) |
| 5 Datasets | Download every CSV/ZIP the publisher offers | [references/pipeline.md](references/pipeline.md) |
| 6 Series | Turn data into plain `.dat` files the charts read | [scripts/lib.py](scripts/lib.py) |
| 7 Numbers | Emit every quoted figure as a macro | [references/verification.md](references/verification.md) |
| 8 Figures | Your charts *and* theirs, each credited | [references/latex-figures.md](references/latex-figures.md) |
| 9 Verify | Three checkers wired into the build | [scripts/build.sh](scripts/build.sh), [scripts/verify.py](scripts/verify.py), [scripts/quote_check.py](scripts/quote_check.py) |

**Before computing anything, read [references/data-traps.md](references/data-traps.md).**
Every trap in it produced a wrong number in a real report before it was caught.
For what a full run costs and yields, see
[references/worked-example.md](references/worked-example.md).

## Length comes from coverage, not padding

A thin draft is usually an under-mined corpus. In order of yield:

- **Unused columns.** A 50-column model table holds five chapters. Inventory
  every column by fill rate before writing.
- **Unused documents.** List corpus documents with no citation yet; the long
  ones are chapters you have not written.
- **Cross-source agreement.** Where two independent sources measure the same
  thing, that comparison is a finding and costs nothing to compute.
- **Provenance.** How a number was produced is often more interesting than the
  number. ("5.6\% of these figures are developer-reported" carried a chapter.)

## Non-negotiables

- **State the sample behind every trend**, not just the trend.
- **Report the fit window** for every doubling time; it can move the answer
  twofold.
- **Exclude incomparable rows, count them, say so** — never silently.
- **Never guess a citation key.** Look it up with [scripts/cite.py](scripts/cite.py);
  [scripts/checkcites.py](scripts/checkcites.py) and [scripts/fixcites.py](scripts/fixcites.py) catch the rest.
- **Say what the report cannot tell you**, in its own section.

## Common mistakes

| Mistake | Fix |
|---|---|
| Quoting a publisher's headline figure | Recompute it; cite theirs alongside |
| One figure per page, pages half empty | [references/latex-figures.md](references/latex-figures.md) |
| Using a page's `og:image` as its chart | It is usually a 16:9 crop. Fetch the in-page asset |
| Prose drifting from regenerated data | Macros + `verify.py` in the build |
| Scraping in parallel | Shared browser session; serialise or lose most of it |
