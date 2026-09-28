---
name: customer-discovery-outbound
description: Use when finding people to talk to for customer discovery, running outbound, or building a prospect batch for any industry — finds non-obvious people, reads job changes and hiring signals, ranks by tier and speed, and prepares value-first drafts with a pamphlet as the gift, for a human to approve.
---

# Customer discovery outbound

All commands: `npm run discover -- <command>` from the repo root. Batches live in `outbound/`, which is never committed.
If the bet or the target roles are not settled yet, use the `idea-maze` skill first.

## Order

Any industry, any offer — both are inputs. What never changes: every message leads with value from that industry, never with us, and every message — first email, each follow-up, each LinkedIn note — carries something worth their time on its own.

1. `new <slug> --industry "…" --offer "…"`, then research the industry before anyone is contacted: what is changing, who is winning and losing, what it costs them. That research becomes the gifts. Then fill `brief.json`: `sender` (name, company, one-line why_me, `booking_link` — the 20-minute booking page),
   `roles` (each with 2–3 `todo_guesses` for this quarter), `strategic_companies` (whales).
2. Find people. Look past the obvious — use at least two:
   - `find <batch> --source exa --query "<role> at <kind of company> <context>"` — vary the context: a recent move, a tool they use, a region.
   - `find <batch> --source papers --query "<problem>"` — authors and co-authors working on it.
   - `find <batch> --source jobs --board greenhouse:<token> --company "<name>" --query "<problem words>"` — who is hiring for it and who the hire reports to; then find that person with Exa.
   - Your own search tools for news, talks, deadlines, funding: record each with
     `signal <batch> <person id or company> --kind … --text … --url … --date …`.
3. `enrich <batch>` — adds email, company size, job changes and funding. Safe to rerun: people already enriched are skipped, failures are retried.
4. `rank <batch>` — read the send order. Then `enrich <batch> --phones` if you want mobiles: it asks only for deer, elephants and whales (8 Apollo credits each). `status <batch>` lists seats that just opened: find who replaced each person, since they inherit the problem.
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

| Tier | Company size | Usual gift | You | Human |
|---|---|---|---|---|
| mouse | 1–10 | one shared pamphlet for everyone with the same to-do | write and draft | spot-check |
| rabbit | 11–50 | shared pamphlet, cover page naming their company | write and draft | skim each |
| deer | 51–500 | their own pamphlet, in their brand | write carefully; phones if useful | read each |
| elephant | 501–5,000 | their own pamphlet, plus a film | draft | rewrite each |
| whale | 5,000+ or strategic | their own pamphlet and film, reviewed page by page | draft only | writes and sends it, ideally through a warm intro |

The gift can be any type in the **outreach-writing** gift menu — pamphlet, film, deck, spreadsheet, checklist, brief or link — whichever takes their to-do off the list fastest. Every gift goes out as a Google Drive link, never an attachment. `draft` refuses a note with no `https://` gift link, or whose pamphlet or file is missing.

Start every new industry with mice. Carry the opening lines and gifts that earned replies up the tiers; a whale only gets a message shape that already worked lower down.

## Speed first

Prefer people who will move fast: just joined or promoted, recently funded, hiring for the problem, facing a deadline, founder-led. A slow whale can wait a quarter.

## LinkedIn

The agent sends the connect notes itself, in the browser with `gstack-browse` and the user's LinkedIn cookies, following the LinkedIn steps in the `customer-discovery` skill's `references/outbound.md`. There is no daily cap of our own — LinkedIn's limits are the limit. The moment LinkedIn shows a captcha, an identity check, an "unusual activity" warning or a limit notice, stop every LinkedIn step for the day and tell the user; never retry past it.

## Never

- Send anything. Nothing leaves without `approved: true` set by a human, and whales are never sent by a tool.
- Invent evidence. Record a signal with its real URL before citing it.
- Commit anything under `outbound/` or `pamphlets/`.
