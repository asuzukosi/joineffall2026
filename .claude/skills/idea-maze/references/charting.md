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

A bet is a problem, not a product: "<who> <struggles with what> <when>". If the
thesis names a solution ("robots will take over picking"), first ask what problem
it assumes, then vary that problem:

| Change | Question | Example from "robots will take over warehouse picking" |
|---|---|---|
| Who | Who else has this problem, with nobody serving them yet? | Small e-commerce brands packing from their own unit |
| Upstream | Whose problem causes this one? | Staffing agencies that cannot find peak pickers |
| Moment | When is it worst? | The eight weeks of peak season |
| Root | Is this problem a symptom of a deeper one? | Order volumes nobody can forecast |

Drop bets that need the same thing to be true as another bet; merge them.

## 3. Walk the maze for each bet

Start each bet with `npm run -s maze -- latest "<bet in a few words>" --days 90`
and `maze papers`. Why now and moving walls come from what changed in the last
quarter, not from what everyone already knows.


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
   (a regulation, a research result, a launch: run `maze latest` and `maze papers`) or a pattern only
   interviews reveal. Name it.

A consensus secret is not a failure; mark it `"secret": "none yet: <best guess>"`
and add the question to `open_questions`.

## 5. List what must be true

For each bet, list the beliefs the bet dies without, problems first: at least
one `problem` hypothesis (it happens, often, and hurts) and one `spend` hypothesis
(they already pay money or time to cope). No `solution` hypothesis until a
problem hypothesis has survived; `check` blocks it.

Write each belief as past or present behaviour of a named group:
- Weak: "Warehouses want robots."
- Strong: "3PL site managers paid agency premiums of 30%+ for pickers last peak."

Then score importance (how badly the bet dies if this is false) and evidence (the
scale in `SKILL.md`), and write the disproof test (`disproving.md`).
