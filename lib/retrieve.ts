import type Database from "better-sqlite3";
import { embed } from "./embed";

export type Candidate = {
  url: string;
  name: string;
  title: string;
  company: string;
  via: string[];
};

type Index = { urls: string[]; matrix: Float32Array; dims: number };

let index: Index | undefined;

export function invalidateIndex() {
  index = undefined;
}

function loadIndex(db: Database.Database): Index {
  if (index) return index;

  const rows = db.prepare(`select url, v from vectors`).all() as {
    url: string;
    v: Buffer;
  }[];

  const dims = rows.length ? rows[0].v.byteLength / 4 : 0;
  const matrix = new Float32Array(rows.length * dims);
  rows.forEach((row, i) =>
    matrix.set(new Float32Array(row.v.buffer, row.v.byteOffset, dims), i * dims),
  );

  index = { urls: rows.map((row) => row.url), matrix, dims };
  return index;
}

export async function retrieve(
  db: Database.Database,
  query: string,
  limit: number,
): Promise<Candidate[]> {
  if (!query.trim()) return [];

  const { urls, matrix, dims } = loadIndex(db);
  if (urls.length === 0) return [];

  const [wanted] = await embed([query]);

  const scored = urls.map((url, i) => {
    let dot = 0;
    for (let d = 0; d < dims; d++) dot += matrix[i * dims + d] * wanted[d];
    return { url, dot };
  });
  scored.sort((a, b) => b.dot - a.dot);
  const top = scored.slice(0, limit).map((row) => row.url);
  if (top.length === 0) return [];

  const rows = db
    .prepare(
      `select p.url, p.name, p.title, p.company,
              group_concat(k.member_email) as via
         from people p
         join knows k on k.url = p.url
        where p.url in (${top.map(() => "?").join(",")})
        group by p.url`,
    )
    .all(...top) as (Omit<Candidate, "via"> & { via: string })[];

  const byUrl = new Map(rows.map((row) => [row.url, row]));

  // Keep the similarity order, not the order SQLite returned them in.
  return top.flatMap((url) => {
    const row = byUrl.get(url);
    return row ? [{ ...row, via: row.via.split(",") }] : [];
  });
}
