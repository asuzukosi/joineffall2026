# Disproving: tests, actions, evidence

## Pick the cheapest test that could kill it

Go down this list and stop at the first test that can produce the kill line:

| Test | Cost | Can reach evidence |
|---|---|---|
| Desk check of a primary source | an hour | 2 |
| Problem interviews about the last time it happened | a week | 3 |
| Commitment ask at the end of the interview (intro, data, time) | same calls | 4 |
| Paid pilot or pre-order offer | a week or two | 5 |

Combine where you can: one call can test pain, ask for data, and offer a pilot.

## Write the kill line

`fewer than <n> of <sample> <who> <did what>, by <date>`. Past behaviour or a
commitment, never an opinion. Two weeks at most.

| Weak | Strong |
|---|---|
| "nobody likes it" | "fewer than 4 of 12 managers describe a workaround they paid for" |
| "people would pay" | "fewer than 2 of 12 agree to a £40/month pilot and share statements" |
| "the market is big enough" | "the low case, from a primary-source count, is under £20m a year" |

## Plan this week's actions

Each open hypothesis in an unparked bet gets actions due within the next 7 days;
its kill-line deadline can be up to 14 days out, so a hypothesis usually spans two
weeks of actions. Each action says who does it, how many, and through which list
or channel ("founder emails the 15 practices on the Companies House list").
Order: build the list of people, send the asks (leading with a crumb of value),
hold the calls, give a crumb at the end of each, ask for the commitment. Finding people: `docs/research/customer-discovery-agent-tools.md`
and the cohort connections search (who can introduce you).

## Run the conversations

Mom Test rules: talk about their life, not your idea; ask about specific past
events, not the future; listen more than you talk. Ask what they did last time,
what it cost, what they tried, and what they pay for today. Question banks: the
`customer-discovery` skill, `references/mom-test.md` (problem interviews) and
`references/jobs-to-be-done.md` (switch interviews for why people change supplier).

## Log each conversation

One file per conversation: `notes/YYYY-MM-DD-<role>-<org>.md`. With a transcript
(Wispr Flow, any text file, a claude.ai export, a Claude Code session), run
`npm run -s maze -- import <maze> <file> --title "<role>, <org>"`: it writes the
note with the sections below empty and the transcript underneath. Fill them from
the transcript; only what the other person said and did counts as evidence.

A brainstorm with Claude is not evidence. Import it to mine it: every belief in it
becomes a `maze add` with a kill line, and every claimed fact goes through the
evidence audit.

```markdown
# 2026-10-01 site manager, Midlands 3PL

tests: peak-labour-pain, peak-pays-monthly

## facts (what happened, with numbers)
## commitments (what they gave or agreed to)
## compliments and opinions (not evidence)
## surprises (candidate new hypotheses or secrets)
```

Then update `maze.json`: raise `evidence` only per the scale, set `status` to
`testing` once calls start, and when the kill line is reached or the deadline
passes set `survived` or `killed` with a `result` that quotes the count
("3 of 12 described it; killed"). Then read `choosing-a-path.md`.
