# Charting: thesis to bets to hypotheses

## 1. Name the destination

Write it as the first `decisions` entry: what this maze must end in, by when, and
the floor: the smallest yearly revenue pool a bet's low case must clear to be worth
the time. Usually "one bet with a buyer committed to a paid pilot by <date>; floor
£20m a year". The destination decides what is out of scope.

```json
{ "date": "2026-09-28", "decision": "Destination: one bet with a paid pilot by 2026-11-30; floor £20m a year", "why": "<why this date and floor>" }
```

## 2. Reframe the thesis into 3–5 bets

A thesis is a direction, not a bet. Generate bets by changing one thing at a time:

| Change | Question | Example from "robots will take over warehouse picking" |
|---|---|---|
| Buyer | Who else has this problem, with no incumbent yet? | Small e-commerce brands packing from their own unit |
| Side | Sell to the incumbent instead of replacing them? | Software for the staffing agencies that supply peak pickers |
| Wedge | What is the narrowest painful slice? | Only the eight weeks of peak season |
| Shape | Software, service, or a firm run on software? | Robot picking rented by the month, operated by us |

Drop bets that need the same thing to be true as another bet; merge them.

## 3. Walk the maze for each bet

Write these into the bet's `walk`, one or two lines each, with a source where it
is a fact ("unknown yet" is allowed and goes in `open_questions` too):
- **Why now:** what changed (regulation, cost curve, platform, behaviour) and when.
- **Dead attempts:** who tried this before, and why they stopped.
- **Moving walls:** what incumbents or platforms are shipping that could close this path.
- **Who pays:** the person who signs, and what budget it comes from.

Put anything you cannot answer yet into `open_questions`.

## 4. State the secret

A secret is a claim that is true, that you can back with evidence, and that most
people in the market would disagree with.

Test it before writing it down:
1. Would a well-informed buyer or investor dispute it? If not, it is consensus.
2. Search the claim. If the first page of results states it, it is consensus.
3. Where does your evidence come from? The strongest sources are a recent change
   (a regulation, a research result: run `maze papers`) or a pattern only
   interviews reveal. Name it.

A consensus secret is not a failure; mark it `"secret": "none yet: <best guess>"`
and add the question to `open_questions`.

## 5. List what must be true

For each bet, list the beliefs the bet dies without. Include at least one
desirability hypothesis (they want it) and one viability hypothesis (they will
pay enough). Add feasibility only where building it is genuinely uncertain.

Write each belief as past or present behaviour of a named group:
- Weak: "Warehouses want robots."
- Strong: "3PL site managers paid agency premiums of 30%+ for pickers last peak."

Then score importance (how badly the bet dies if this is false) and evidence (the
scale in `SKILL.md`), and write the disproof test (`disproving.md`).
