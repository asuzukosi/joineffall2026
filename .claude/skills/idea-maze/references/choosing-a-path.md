# Choosing a path

## Compare the bets

Fill this table from `maze.json`, the market reports and `check`'s Bets summary.
Write it into the decision's `why`.

| Bet | Best desirability evidence (1–5) | Crumbs used / given | Secret: sourced and disputed? | Days to first kill line | Low case above the destination's floor? | Who owns the buyer today |
|---|---|---|---|---|---|---|

Low case: the smallest credible buyer count (primary source) × the lowest price
buyers pay today for the job, per year. A guessed count is marked `(secondary)`.

Choose:
- **Lead bet:** the highest evidence, with a real secret and the fastest route to a
  kill line. When evidence is tied, prefer the bet whose crumbs got used, then the
  bet where no incumbent owns the buyer.
- **Hedge:** one other bet that the same week's conversations can also test.
- **Everything else:** set `"parked": true`. `check` then drops its actions,
  deadlines and the walk and premortem requirement; keep its hypotheses so the
  bet can be picked up again. Never more than two bets unparked.

Write it to `decisions`: `{ "date": "...", "decision": "Lead: X; hedge: Y", "why": "<the table, compressed>" }`.

## When a hypothesis survives

- Raise the bar: the next test for the same belief asks for a stronger commitment
  (evidence 3 → 4 → 5).
- Move to the bet's next riskiest open hypothesis (`check` lists it first).

## When a hypothesis dies

1. Write the `result` with the count.
2. Ask what else it takes down: every hypothesis and bet that assumed it.
3. Look for the door it opens. A killed hypothesis usually points one step sideways:

| It died because | Door to try |
|---|---|
| This buyer has the pain but no budget | Same pain, a buyer who holds the budget |
| This buyer has no pain | Same product, a buyer the pain is worse for |
| The incumbent already solves it | Sell to the incumbent instead |
| Too broad to sell | The narrowest slice that was still painful |
| The pain is real, but rare | A buyer or moment where it recurs |

   A door you can state sharply becomes a new bet (run `charting.md` on it);
   otherwise it goes in `open_questions`.
4. Record the choice in `decisions`.

## When to leave the maze

A bet leaves the maze when its desirability and viability hypotheses have both
survived at evidence 4 or higher. The next step is delivering the pilot, not more
research. If every bet has died, the thesis goes back to charting with what the
dead ends taught you, written in `decisions`.
