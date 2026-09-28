# Finding gaps

Run this on every bet in play before choosing a path, and again at each weekly
review. It is what turns a plan that looks fine into one that has been attacked.

## 1. Premortem from four seats

It is a year from now and this bet failed. For each seat, write the most likely
reason in one line into the bet's `premortem`:

| Seat | Asks |
|---|---|
| Buyer | Why did I never pay, or stop paying? |
| Incumbent or platform | What did we ship that made this pointless? |
| Regulator or gatekeeper | What approval, liability, or rule blocked it? |
| Researcher | What does the latest work show that breaks the assumption? (`maze papers`) |

Each reason becomes a hypothesis with a kill line if it can be tested within two
weeks (end its belief with `(premortem: <seat>)`), otherwise an `open_questions`
entry. Full method: the `decision-frameworks`
skill, `references/pre-mortem.md`.

## 2. Evidence audit

List every number and fact that a bet's case rests on (market size, deadlines,
counts, competitor claims, prices). For each:
- Is the source primary (regulator, filing, official dataset, the company itself)?
- If it is secondary (news, Wikipedia, a blog, a search summary, a page you did
  not open), mark it `(secondary)` where it is used, and add an action to find the
  primary source on the hypothesis that relies on it. If no hypothesis does, it
  goes in `open_questions` starting with `verify:`.
- Is the claim falsifiable at all? Red flags: "most", "huge", "everyone", no date.

Method and red-flag list: `decision-frameworks`, `references/evidence-audit.md`.

## 3. Ask what you would need to know

"To bet the next three months on this, what would I need to know that I do not?"
Write each answer as an `open_questions` entry, then promote the ones you can
already phrase as a sharp, testable claim into hypotheses.

## Done when

- Every unparked bet's `premortem` is filled (`check` lists it as a gap until it is).
- Each unparked bet has at least one hypothesis marked `(premortem: <seat>)`.
- No decision-critical number is unsourced or unmarked.
- `check` shows no planning gaps and no blocking problems.
