export function parseDate(value: string | null | undefined) {
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(value ?? "");
  if (!match) return null;
  const [, year, month = "01", day = "01"] = match;
  return new Date(`${year}-${month}-${day}T00:00:00Z`);
}

export function daysBetween(from: string, to: string) {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
