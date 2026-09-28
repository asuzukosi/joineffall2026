# Data traps

Each of these produced a wrong published number before it was caught. Check for
all of them before computing anything.

## 1. Trailing partial periods

A cumulative series that **falls** is not a decline; the last period is
incomplete. A quarterly flow whose reporters thin out is the same bug.

```python
# cumulative: it can only rise
while len(xs) > 1 and total(xs[-1]) < total(xs[-2]):
    xs.pop()

# flow: require the same set of reporters as the fullest period
full = max(len(reporters[x]) for x in xs)
last_full = max(x for x in xs if len(reporters[x]) == full)
xs = [x for x in xs if x <= last_full]
```

Observed: installed compute appeared to fall 20.9M → 17.1M; component spend
$17.3bn → $1.7bn; a quarterly shipment series showed one vendor at 100\% share.
All three were partial periods.

## 2. Future-dated rows

Timeline tables often carry **planned** as well as observed rows. A "current
stock" curve built without a cut-off silently projects to 2030.

```python
snapshots = [s for s in snapshots if s.date <= RETRIEVED]
```

Observed: a tracked fleet came out 3.5× its real size.

## 3. Denominator rows hiding inside the data

A table of components may include a whole-industry residual row (often labelled
`Other`) that is not a member of the population.

Observed: including it put logic at 70\% of chip cost and hid the memory story
entirely; excluding it reproduced the publisher's figure to the point.
**This is the trap the "reproduce their chart" check exists to catch.**

## 4. Two columns, same name, different quantity

`Current power (MW)` was IT load; `Power (MW)` was whole-facility load. The
ratio is the PUE. Either is correct; mixing them is not.

Detect by joining two sources that should agree and investigating the residual
rather than averaging it away.

## 5. Incomparable rows in a mixed population

A "parameters" column spanning dense language models and sparse recommender
systems is not one quantity. Taking a running maximum over it yields nonsense
(a 2.5-month doubling, topped by a 174-trillion-parameter research system).

Filter to a comparable sub-population, **count what you dropped, and say so**:

```
excluded 756 parameter and 603 dataset cells as out of scope or mis-scaled
```

## 6. Units in the wrong column

A handful of cells will be off by orders of magnitude ("9,000 trillion tokens"
recorded as 9e31). Cap at a physically plausible bound and count the exclusions.

## 7. Stock versus flow

Summing every reading in a period counts a site once per report, not once. Take
each entity's **latest reading at or before the period end**, then sum.

Observed: the wrong method gave 18.3 months per doubling at R²=0.36; the right
one gave 6.9 months at R²=0.95. A bad R² on a series that should be smooth is
usually this bug.

## 8. Fit windows

A doubling time is a claim about a window. Record cluster power doubles every
39 months fitted from 2010 and 15 months from 2019. Choose deliberately, state
the window, and say why.

## 9. Small n where it matters most

Datasets covering "AI companies" may track under a dozen firms. Check
`len(set(rows))` before writing "the market". Most such tables exclude the
largest spenders because their segment revenue is not separable.
