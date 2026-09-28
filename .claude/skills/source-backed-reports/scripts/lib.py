import csv, os, math, re, datetime, statistics

DATA = os.path.join(os.path.dirname(__file__), "..", "data")
OUT = os.path.join(os.path.dirname(__file__), "..", "out", "dat")


def rows(name):
    with open(os.path.join(DATA, name), encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            yield r


def num(v):
    if v is None:
        return None
    v = v.strip().replace(",", "").replace("$", "")
    if not v:
        return None
    try:
        return float(v)
    except ValueError:
        return None


def date(v):
    if not v:
        return None
    v = v.strip()[:10]
    for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
        try:
            return datetime.datetime.strptime(v, fmt).date()
        except ValueError:
            pass
    return None


def frac_year(d):
    start = datetime.date(d.year, 1, 1)
    end = datetime.date(d.year + 1, 1, 1)
    return d.year + (d - start).days / (end - start).days


def quarter(d):
    return "%dQ%d" % (d.year, (d.month - 1) // 3 + 1)


def colname(s):
    """pgfplots looks columns up by name, and a tilde or space breaks the lookup."""
    return re.sub(r"[^A-Za-z0-9_]", "", str(s)) or "c"


def write(name, header, data, fmt="%s"):
    path = os.path.join(OUT, name)
    with open(path, "w") as f:
        f.write(" ".join(colname(h) for h in header) + "\n")
        for row in data:
            f.write(" ".join(cell(x) for x in row) + "\n")
    print("wrote %-34s %4d rows" % (name, len(data)))


def cell(x):
    if x is None or x == "":
        return "nan"
    if isinstance(x, float):
        if math.isnan(x):
            return "nan"
        return ("%.6g" % x)
    return str(x).replace(" ", "~")


def fit_doubling(pts):
    """pts = [(frac_year, value)] with value > 0. Returns (months_per_doubling, r2, n)."""
    pts = [(x, math.log10(y)) for x, y in pts if y and y > 0]
    if len(pts) < 4:
        return None, None, len(pts)
    n = len(pts)
    mx = sum(x for x, _ in pts) / n
    my = sum(y for _, y in pts) / n
    sxy = sum((x - mx) * (y - my) for x, y in pts)
    sxx = sum((x - mx) ** 2 for x, _ in pts)
    if sxx == 0:
        return None, None, n
    slope = sxy / sxx
    inter = my - slope * mx
    ss_res = sum((y - (slope * x + inter)) ** 2 for x, y in pts)
    ss_tot = sum((y - my) ** 2 for _, y in pts)
    r2 = 1 - ss_res / ss_tot if ss_tot else None
    if slope <= 0:
        return None, r2, n
    return 12 * math.log10(2) / slope, r2, n


def running_max(pts):
    """pts sorted by x; yields (x, y) only where y sets a new record."""
    best = None
    for x, y in pts:
        if y is None:
            continue
        if best is None or y > best:
            best = y
            yield x, y
