---
name: idea-maze
description: Use when holding a startup hypothesis and wanting to act on it today, looking for something useful to give a prospect free before the product exists, turning a thesis into market bets, planning customer discovery to disprove an idea, logging an interview or chat transcript, writing a market report on a bet, or when a hypothesis was just confirmed or killed and the next move is unclear.
---

# Idea maze

Find the path through an idea by trying to kill each step of it, cheaply, while
giving the buyer something useful along the way. The agent thinks; the CLI in
`scripts/maze/` (README: commands and file shape) records it in
`mazes/<maze>/maze.json` and says what to do next. Run commands from the repo root.

## Hypothesis to action first

For a hypothesis, the first output is something done today:

```sh
npm run -s maze -- add <maze> "<belief>" --wrong-if "<kill line>" --do "<first action, today>" \
  --id <what-it-tests> --method "<e.g. Mom Test calls about the last time it happened>"
npm run -s maze -- crumb <maze> "<what we give>" --for "<who>" --tests <id>
```

- **First action:** the smallest step toward the kill line: a named list, messages
  sent, a call booked. Desk research comes after.
- **Crumb of value:** something useful the buyer gets free today (a script, an
  open-source pointer, research, a report). It is often the first action too.
  See `references/crumbs-of-value.md`.

Both commands print `Do now` with the kill line and deadline; no separate `check`
is needed. Log a crumb when it is promised; build its content afterwards, from
primary sources, before it is given.

Reply to the founder in this shape, then stop:

```markdown
**Do now (today):** <action, with where the people come from>
**Ask:** <one question about what happened last time, not about the idea>
**Crumb:** <what they get free, how it reaches them, and the reaction that counts>
**Wrong if:** <kill line>, by <deadline>
```

Planning runs alongside the first test, never in front of it.

## Where to go next

| You are | Read |
|---|---|
| Choosing or judging a crumb of value | `references/crumbs-of-value.md` |
| Holding a transcript (interview, Wispr Flow, Claude chat) | `maze import`, then `references/disproving.md` |
| Writing tests, this week's actions, or interview notes | `references/disproving.md` |
| Starting from a thesis, or adding a bet | `references/charting.md` |
| About to choose between bets, or at the weekly review | `references/finding-gaps.md`, then `references/choosing-a-path.md` |
| A hypothesis just survived or died | `references/choosing-a-path.md` |
| Writing the market report for a bet | `references/market-report.md` |

Run `check` after editing `maze.json` by hand: blocking problems (exit 2) mean a
test cannot run or cannot fail, so fix them at once; planning gaps fill in over a
day or two.

## Evidence scale

Score by the strongest thing that has happened, not by confidence.

| Score | What has happened |
|---|---|
| 1 | Our opinion only |
| 2 | A primary source you opened supports it (a search summary is not one) |
| 3 | Buyers described specific past behaviour |
| 4 | Buyers gave time, an intro or their data, or used a crumb we gave |
| 5 | Buyers paid, signed, or pre-ordered |

## Kill lines

`fewer than 4 of 12 site managers describe last peak's agency spend`: a sample, one
behaviour people did or committed to (never what they say they would do), and a
threshold. The date goes in `deadline`, at most 14 days out; actions at most 7.
A second behaviour is a second hypothesis.

## Rules

- Choosing a lead bet waits for the gaps pass (`walk`, `premortem`) and a
  destination in `decisions`; acting on a hypothesis never does.
- A number a decision rests on cites a primary source, or is marked `(secondary)`
  with an action to verify it.
- Every path choice goes in `decisions` with the date and why.
- A brainstorm, with Claude or the team, is not evidence; only what buyers said
  and did is.

Question banks: `customer-discovery` (Mom Test, switch interviews) and
`decision-frameworks` (pre-mortem, evidence audit).
