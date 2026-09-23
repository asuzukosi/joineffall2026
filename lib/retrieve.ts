import type Database from "better-sqlite3";

export type Candidate = {
  url: string;
  name: string;
  title: string;
  company: string;
  via: string[];
};

// FTS5 reads its own query syntax, so a stray quote or hyphen from a person's
// question is a syntax error rather than a search. Keep the words, drop the rest.
function toMatchQuery(query: string): string {
  const words = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.map((word) => `"${word}"`).join(" OR ");
}

export function retrieve(
  db: Database.Database,
  query: string,
  limit: number,
): Candidate[] {
  const match = toMatchQuery(query);
  if (!match) return [];

  const rows = db
    .prepare(
      `select p.url, p.name, p.title, p.company,
              group_concat(k.member_email) as via
         from people_fts f
         join people p on p.url = f.url
         join knows  k on k.url = p.url
        where people_fts match ?
        group by p.url
        order by count(k.member_email) desc, p.name asc
        limit ?`,
    )
    .all(match, limit) as (Omit<Candidate, "via"> & { via: string })[];

  return rows.map((row) => ({ ...row, via: row.via.split(",") }));
}
