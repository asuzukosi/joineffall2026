import { parse } from "csv-parse/sync";

export type Member = {
  name: string;
  email: string;
  linkedin: string;
  photo: string;
};

export function normaliseLinkedIn(url: string): string {
  let text = url.trim();
  // Three cohort profiles carry accents as %c3%a9 and the like. An export may
  // spell the same profile either way, so both forms must land on one key.
  try {
    text = decodeURIComponent(text);
  } catch {
    // a stray % is not an escape; compare what we were given
  }
  const cleaned = text.toLowerCase().split("?")[0].replace(/\/+$/, "");
  return cleaned.match(/linkedin\.com\/in\/[^/]+/)?.[0] ?? "";
}

export function parseRoster(csv: string): Member[] {
  const rows: Record<string, string>[] = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return rows
    .filter((row) => row.email)
    .map((row) => ({
      name: row.name,
      email: row.email.toLowerCase(),
      linkedin: normaliseLinkedIn(row.linkedin ?? ""),
      photo: row.photo ?? "",
    }));
}

let cached: Member[] | undefined;

export function loadRoster(): Member[] {
  const csv = process.env.ROSTER_CSV;
  if (!csv) throw new Error("ROSTER_CSV is not set");
  cached ??= parseRoster(csv);
  return cached;
}

export function memberByEmail(email: string): Member | undefined {
  const key = email.trim().toLowerCase();
  return loadRoster().find((member) => member.email === key);
}

export function isMember(email: string): boolean {
  return memberByEmail(email) !== undefined;
}

export function memberByLinkedIn(url: string): Member | undefined {
  const key = normaliseLinkedIn(url);
  return key
    ? loadRoster().find((member) => member.linkedin === key)
    : undefined;
}
