---
name: customer-discovery-outbound
description: Use when finding people to talk to for customer discovery, running outbound, or building a prospect batch for any industry — finds non-obvious people, reads job changes and hiring signals, ranks by tier and speed, and prepares value-first drafts with a pamphlet as the gift, for a human to approve.
---

# Customer discovery outbound

All commands: `npm run discover -- <command>` from the repo root. Batches live in `outbound/`, which is never committed.
If the bet or the target roles are not settled yet, use the `idea-maze` skill first.

## Order

1. `new <slug> --industry "…" --offer "…"`, then fill `brief.json`: `sender` (name, company, one-line why_me),
   `roles` (each with 2–3 `todo_guesses` for this quarter), `strategic_companies` (whales).
2. Find people. Look past the obvious — use at least two:
   - `find <batch> --source exa --query "<role> at <kind of company> <context>"` — vary the context: a recent move, a tool they use, a region.
   - `find <batch> --source papers --query "<problem>"` — authors and co-authors working on it.
   - `find <batch> --source jobs --board greenhouse:<token> --company "<name>" --query "<problem words>"` — who is hiring for it and who the hire reports to; then find that person with Exa.
   - Your own search tools for news, talks, deadlines, funding: record each with
     `signal <batch> <person id or company> --kind … --text … --url … --date …`.
3. `enrich <batch>` — adds email, company size, job changes and funding. Add `--phones` only for deer and above (8 Apollo credits each).
4. `rank <batch>` — read the send order. `status <batch>` lists seats that just opened: find who replaced each person, since they inherit the problem.
5. For each person in send order: write `notes/<id>.json` with the **outreach-writing** skill, and make the gift with the **customer-pamphlet** skill.
6. `draft <batch>`. Fix every problem it lists by rewriting the note or building the gift — never by editing the checks. Repeat until it exits 0.
7. `status <batch>`, then hand the batch to the human.

## Job changes are the strongest signal

| Signal | What it means for them |
|---|---|
| joined (≤ 90 days) | Setting their first-quarter plan, with budget and a need for an early win |
| role change | Just took ownership of the problem |
| left | Two leads: they may bring the problem to their next company, and whoever replaced them inherits it |

## Tiers — how much we can get wrong

| Tier | Company size | You | Human |
|---|---|---|---|
| mouse | 1–10 | write and draft | spot-check |
| rabbit | 11–50 | write and draft | skim each |
| deer | 51–500 | write carefully; phones if useful | read each |
| elephant | 501–5,000 | draft | rewrite each |
| whale | 5,000+ or strategic | draft only | writes and sends it, ideally through a warm intro |

Start every new industry with mice. Carry the opening lines and gifts that earned replies up the tiers; a whale only gets a message shape that already worked lower down.

## Speed first

Prefer people who will move fast: just joined or promoted, recently funded, hiring for the problem, facing a deadline, founder-led. A slow whale can wait a quarter.

## Never

- Send anything. Nothing leaves without `approved: true` set by a human, and whales are never sent by a tool.
- Read or message LinkedIn automatically. LinkedIn notes are drafts a human pastes.
- Invent evidence. Record a signal with its real URL before citing it.
- Commit anything under `outbound/` or `pamphlets/`.
