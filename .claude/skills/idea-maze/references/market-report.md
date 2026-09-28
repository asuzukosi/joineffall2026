# Market report for one bet

Write one report per bet to `mazes/<maze>/<bet-id>-market.md`. Its job is to
change hypotheses, not to look complete: end with what it changed.

## Gather

```sh
npm run -s maze -- market "<bet keywords>" --sic <5-digit SIC codes>
npm run -s maze -- papers "<technology or problem keywords>"
npm run -s maze -- events "<term>, <synonym>, <buyer's trade>" --days 60
```

Then web-search for leaders and startups, one search per angle (incumbents,
funded startups, recent shutdowns), and open each company's own site.

## Count who pays

`market --sic` counts VAT or PAYE registered businesses **in an industry**. Use
it when the buyer is a business in that industry (for example, warehouses). When
the buyer spans every industry (all small businesses, sole traders, freelancers),
SIC counts only show suppliers; use the government's Business population
estimates or the regulator's own figures for the buyer count instead, and say so.

Size = buyer count × price a buyer pays today for the job, as a low and a high case.

## Report shape

```markdown
# <bet name>: market

## Who pays and how many
<buyer, count, source; low and high case of count × price>

## Why now
<the change and its date, with source>

## Leaders
| Company | What they sell | Size signal | Source |

## Startups
| Company | Angle | Funding or stage | Source |

## Dead attempts
| Company | What happened | Source |

## Patterns
<2–4 lines: how the market is moving, from the tables above and `market` output>

## Where buyers gather (next 60 days)
| Date | Event | Why the buyers will be there | Link |

## What this changes
<hypotheses whose evidence or importance moved, new hypotheses, killed bets>
```

## Rules

- Every row cites a source; no source, no row.
- Every decision-critical number cites a primary source, or is marked `(secondary)`.
- Keep only events the bet's buyers would attend; `events` matches words, not intent.
- No leaders found is a finding ("no incumbent"); write it, do not pad the table.
