---
name: idea-maze
description: Use when holding a startup hypothesis and wanting to act on it today, finding which customer problem is worth solving, looking for something useful to give a prospect free before the product exists, planning customer discovery to disprove an idea, logging an interview or chat transcript, writing a market report on a bet, or when a hypothesis was just confirmed or killed and the next move is unclear.
---

# Idea maze

Find the path through an idea by trying to kill each step of it, cheaply, while
giving the buyer something useful along the way. The agent thinks; the CLI in
`scripts/maze/` (README: commands and file shape) records it in
`mazes/<maze>/maze.json`. Run commands from the repo root.

**The maze is made of problems, not solutions.** A bet is a named group with a
painful problem; a hypothesis says what they do or suffer today. "People would
pay for X" is first rewritten as the problem X assumes. A solution is tested only
once a problem in its bet has survived; `check` blocks it before then.

| Type | Claims | Example |
|---|---|---|
| `problem` | It happens, often, and it hurts | "Physios finish notes after hours most days" |
| `spend` | They already pay money or time to cope | "Clinics pay for a scribe tool, or in unpaid overtime" |
| `solution` | Our approach fixes it | "Clinics switch if notes are done by the last patient" |

## Hypothesis to action first

Three commands, in this order:

```sh
mkdir -p mazes/<maze> && npm run -s maze -- latest "<the problem in plain words>" --days 30 > mazes/<maze>/latest.md
npm run -s maze -- add <maze> "<what they do or suffer today>" --wrong-if "<kill line>" --do "<first action, today>" \
  --id <what-it-tests> --method "<e.g. Mom Test calls about the last time it happened>"
npm run -s maze -- crumb <maze> "<what we give>" --for "<who>" --tests <id>
```

1. **Latest** (Exa, about 3 cents): pass the problem, not the solution. It opens
   with people describing the problem in their own words, then what changed this
   month. If the problem is already well served, test the sharper one left.
2. **First action:** the smallest step toward the kill line: a named list,
   messages sent, a call booked.
3. **Crumb of value:** something that eases the problem today, free. See
   `references/crumbs-of-value.md`. Log it when promised; build it from primary
   sources before giving it.

`add` and `crumb` print `Do now` with the kill line and deadline. Reply to the
founder in this shape, then stop; planning runs alongside the first test:

```markdown
**Do now (today):** <action, with where the people come from>
**Ask:** <one question about the last time the problem happened, never about the idea>
**Crumb:** <what they get free, how it reaches them, and the reaction that counts>
**Wrong if:** <kill line>, by <deadline>
```

## Where to go next

| You are | Read |
|---|---|
| Writing a kill line, this week's actions, or interview notes | `references/disproving.md` |
| Holding a transcript (interview, Wispr Flow, Claude chat) | `maze import`, then `references/disproving.md` |
| Choosing or judging a crumb | `references/crumbs-of-value.md` |
| Starting from a thesis, or adding a bet | `references/charting.md` |
| Choosing between bets, or at the weekly review | `references/finding-gaps.md`, then `references/choosing-a-path.md` |
| A hypothesis just survived or died | `references/choosing-a-path.md` |
| Writing the market report for a bet | `references/market-report.md` |

After editing `maze.json` by hand, run `check`: blocking problems (exit 2) mean a
test cannot run or cannot fail; planning gaps fill in over a day or two.

## Evidence scale

| Score | What has happened (the strongest thing, not how sure we feel) |
|---|---|
| 1 | Our opinion only |
| 2 | A primary source you opened supports it (a search summary is not one) |
| 3 | Buyers described specific past behaviour |
| 4 | Buyers gave time, an intro or their data, or used a crumb we gave |
| 5 | Buyers paid, signed, or pre-ordered |

## Rules

- Only what buyers said and did is evidence; a brainstorm with Claude or the team is not.
- Newest wins: prefer sources from the last 90 days; mark older than a year `(dated)`.
- A number a decision rests on cites a primary source, or is marked `(secondary)`
  with an action to verify it.
- Choosing a lead bet waits for the gaps pass and a destination; acting never does.
  Every choice goes in `decisions` with the date and why.

Question banks: `customer-discovery` (Mom Test, switch interviews) and
`decision-frameworks` (pre-mortem, evidence audit).
