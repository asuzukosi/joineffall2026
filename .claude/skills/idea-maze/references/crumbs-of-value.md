# Crumbs of value

A crumb is something useful the buyer gets from us today, free, before the product
exists. It does two jobs: the buyer is better off this week, and what they do with
it is evidence. Every bet in play has at least one (`check` lists a gap until it does).

## What to give

| Crumb | Example | Made with |
|---|---|---|
| Point them to something that already works | "These 3 open-source tools do appointment reminders with their booking system; here's how to set up the first" | `maze latest` (open-source section); test it yourself first |
| A small script or no-code fix | A spreadsheet formula or 30-line script that cleans their export | An hour of code; send it running, with a 3-line readme |
| A tiny web app on their data | A one-page calculator of what peak agency staff cost them | Built in an afternoon, hosted free |
| What changed in their field this month | "Three things that changed for you in September, with links" | `maze latest --days 30` |
| Market research they would not do themselves | "Who is selling into your sector, what they charge, what changed this year" | `maze latest`, `maze market`, `maze papers` |
| A report in their brand | A 4-page brief on the rule change hitting them | `customer-pamphlet` skill |
| Competitor watch | "What your three nearest competitors shipped and hired for this month" | `maze latest "<competitor>"`, job boards |
| Where their peers are | "Five events next month where practice managers meet" | `maze events` |
| An introduction | Someone in the cohort network who solved the same problem | Cohort connections search |
| A digest of a rule or deadline | "What the new rule means for you, in one page, with the dates" | Primary sources only |
| Doing the job once by hand | Preparing one quarter's update for them, manually | Your own time: the concierge test |

## How to pick one

A good crumb is all of these:
1. **Specific to a problem they told you about**, in their words. A generic crumb is marketing.
2. **Deliverable today**, or within a day. If it needs the product, it is not a crumb.
3. **Costs us under a day.** Crumbs are many small bets on goodwill, not projects.
4. **Tells us something when they react.** Decide before sending which reaction
   would count, and link the crumb to that hypothesis with `--tests`.

## How to give it

```sh
npm run -s maze -- crumb <maze> "<what we give>" --for "<named person or group>" --tests <hypothesis-id>
```

- Offer it at the end of a discovery call ("I'll send you the list of tools
  tonight"), or lead a cold message with it: a crumb is a reason to reply.
- Send it with one question that invites a reaction: "Did the second tool fit how
  you run recalls?"
- Never pitch in the same message. The crumb is the whole message.

## Read the reaction

Set the crumb's `status` to `given` when sent, then `used` or `ignored` with a
`result` that says what happened. Then update the hypothesis it tests:

| Reaction | Evidence for the linked hypothesis |
|---|---|
| No reply, or "thanks" | None. A crumb nobody uses is a signal the problem is not sharp |
| They used it, or forwarded it to a colleague | 4 |
| They asked for more, or sent their own data to make it work | 4, and a strong lead |
| They asked what it would cost to keep doing it | 5 when they pay; offer a paid pilot now |

Repeated asks for the same crumb are the product telling you what to build first.
