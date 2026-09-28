# maze

Get from a hypothesis to something you do today in one command. The agent does
the thinking and writes it into `mazes/<maze>/maze.json`; the scripts turn it into
an ordered list of actions, check each test can actually fail, and fetch free
market data. No API keys needed.

`mazes/` is git-ignored: the repo is public and mazes hold unreleased ideas.

```text
hypothesis ──► add ──► Do now: <first action>        (seconds; creates the maze if needed)
             crumb ──► something useful the buyer gets free today; their reaction is evidence
                 │
                 ▼
            maze.json ◄── agent edits: more bets, walk, premortem, results
                 │
               check ──► Do now, then the rest by risk
                         blocking problems (exit 2): a test that cannot run or fail
                         planning gaps (exit 0): fill after acting
   papers / market / events ── evidence
   import <transcript> ──► notes/ ──► facts, commitments ──► evidence scores, new `add`s
```

## Commands

Run from the repo root.

```sh
npm run maze -- add clinics "Clinic managers lose 5+ hours a week to phone triage" \
  --wrong-if "fewer than 4 of 12 managers describe a recent week of it" \
  --do "Message 10 clinic managers from the cohort search asking for 20 minutes" \
  --id triage-hours --method "Mom Test calls about last week's phones"
npm run maze -- crumb clinics "Free list of 3 call-triage tools that work with EMIS" \
  --for "The 10 managers from the cohort search" --tests triage-hours
npm run maze -- check clinics
npm run maze -- import clinics ~/Downloads/call-with-sarah.txt --title "Sarah, practice manager"
npm run maze -- papers "warehouse picking robot"
npm run maze -- market "warehouse robotics" --sic 52103,28220
npm run maze -- events "robotics, robot, humanoid" --days 60
```

`add` defaults: bet `inbox`, type `desirability`, importance 4, evidence 1,
deadline 14 days out, action due today, id from the belief's first words. Change
them with `--id`, `--method`, `--bet`, `--type`, `--by`, or edit the file.

`import` turns a transcript into `notes/<date>-<title>.md`, with empty facts,
commitments and surprises sections above it for the agent to fill:

| Source | File to pass |
|---|---|
| Wispr Flow (or Granola, Otter, anything) | Copy the transcript into a `.txt` or `.md` file; `--title` names it |
| claude.ai | Settings → Privacy → Export data, unzip, pass `conversations.json` with `--match "<words from the chat title>"` |
| Claude Code | `~/.claude/projects/<project-path-with-dashes>/<session-id>.jsonl`; tool calls, thinking and injected text are dropped |

`check` exits 2 only for what stops a test running: no kill line, no deadline, no
open action, a deadline passed without a verdict, a duplicate id. Missing
destination, secret, walk or premortem are listed as planning gaps and do not block.

`events` treats commas as alternatives; each word in a term must start a word in
the event text, so `robot` also matches `robots` and `robotics`. `market --sic`
takes 5-digit SIC 2007 codes
([list](https://resources.companieshouse.gov.uk/sic/)).

Save any output to the maze folder, e.g. `> mazes/<maze>/market.md`.

## maze.json

```json
{
  "thesis": "Mid-size UK warehouses will rent robot picking monthly",
  "open_questions": ["Who signs off automation spend under £50k?"],
  "decisions": [
    { "date": "2026-09-28", "decision": "Destination: one bet with a paid pilot by 2026-11-30", "why": "EF demo day timing" }
  ],
  "bets": [
    {
      "id": "3pl-peak-season",
      "name": "Peak-season picking for UK third-party logistics firms",
      "secret": "Peak labour, not robot price, is what blocks automation",
      "walk": {
        "why_now": "Agency peak rates rose sharply after 2021 (source: <link>)",
        "dead_attempts": "unknown yet",
        "moving_walls": "Amazon Robotics now sells to third parties (source: <link>)",
        "who_pays": "The 3PL site's general manager, from the peak labour budget"
      },
      "premortem": {
        "buyer": "Peak was cheaper to staff than to automate for 8 weeks a year",
        "incumbent": "Agencies cut peak rates to keep the contract",
        "regulator": "Health and safety sign-off for robots near people took a year",
        "researcher": "Picking success rates on mixed stock stayed below 95%"
      },
      "hypotheses": [
        {
          "id": "peak-labour-pain",
          "belief": "3PL site managers lose margin every peak to agency labour",
          "type": "desirability",
          "importance": 5,
          "evidence": 1,
          "disproof_test": {
            "method": "Mom Test interviews with 3PL site managers",
            "we_are_wrong_if": "fewer than 4 of 12 do",
            "deadline": "2026-10-16"
          },
          "status": "untested",
          "actions": [{ "do": "List 20 3PL site managers in the Midlands", "due": "2026-10-02", "done": false }]
        }
      ]
    }
  ]
}
```

- `type`: desirability (do they want it), viability (will it pay), feasibility (can we build it).
- `importance` and `evidence`: 1–5. Risk is `importance × (6 − evidence)`; `check` sorts by it.
- `status`: untested, testing, survived, killed. Survived or killed needs a `result`.
- A hypothesis without `we_are_wrong_if` and `deadline` fails `check`, and so does an open one past its deadline.
- `walk` and `premortem` belong on every unparked bet, and `decisions` starts with the destination; `check` lists them as planning gaps until filled.
- `"parked": true` takes a bet out of play: its actions leave the list, and its deadlines, walk and premortem stop counting.
- `crumbs` on a bet: `{ "give", "for", "tests", "due", "status": "to-give" | "given" | "used" | "ignored", "result" }`.
  Something useful the buyer gets free today; `check` lists a gap for any bet in play without one.
- `decisions` is the path walked: each choice of lead bet, with the date and why.

## Working a maze

The `idea-maze` skill (`.claude/skills/idea-maze/`) holds the method: charting a
thesis into bets, finding gaps, choosing a path, disproving, and the market report.
