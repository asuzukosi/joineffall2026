# Worked example

One run of this workflow, with the numbers it produced, as a calibration for
what "detailed" costs and yields.

## Inputs

| Source | Documents | Full text | Datasets |
|---|---|---|---|
| A research institute (CC-BY) | 243 | 243 | 25 CSVs, 84,783 rows |
| An evaluation nonprofit | 71 | 71 | — |
| A subscription analyst | 332 | 93 | — |

Scraping took roughly two hours wall-clock, serialised, with one slow re-run
after rate limiting.

## Outputs

218 pages · 72,600 words · 217 figures (28 computed, 189 reproduced) ·
42 tables · 169 citations · 659 bibliography entries.

Checks at completion: 0 compile errors, 0 overfull boxes, 0 unresolved
citations, 29 macros independently re-derived, 1 page under 100 words.

## Where the length actually came from

Not from writing longer. From mining wider:

1. **Unused dataset columns.** A 57-column model table yielded two chapters
   (composition by domain/country/access; training-run anatomy) and the
   report's most-cited finding — that 5.6\% of training-compute figures were
   reported by the developer rather than reconstructed by a third party.
2. **Uncited documents.** Listing corpus documents with no citation surfaced
   ~150 unused pieces; a dozen became sections.
3. **Joining datasets on an entity.** Joining every table on company name
   produced a profile chapter that existed in none of the sources.
4. **Cross-source agreement.** Two organisations measuring capability duration
   by different methods landed within a month of each other — a finding that
   cost one paragraph and no new data.

## What the checks caught

- A cumulative series that "fell" 20.9M → 17.1M: a partial quarter.
- A fleet 3.5× too large: planned rows dated to 2030 in a "current stock" curve.
- Logic at 70\% of chip cost instead of 13\%: an industry-denominator row inside
  a components table. Caught by failing to reproduce the publisher's chart.
- A doubling time off by 2.6×: stock computed as a sum of flows.
- A figure cropped mid-plot: an `og:image` social card used as the chart.

Each was a number that would have been published as fact.

## Rhythm that worked

Scrape in the background while writing the scaffolding; parse and build series
before any prose; write a chapter, regenerate, re-verify, move on. Never write
prose against numbers you have not yet regenerated at least twice.
