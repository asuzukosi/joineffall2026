import type Database from "better-sqlite3";
import type { Connection } from "./linkedin";
import { EMBED_BATCH, embed } from "./embed";
import { invalidateIndex } from "./retrieve";

export type IngestResult = {
  rows: number;
  added: number;
  shared: number;
};

export async function ingest(
  db: Database.Database,
  memberEmail: string,
  rows: Connection[],
): Promise<IngestResult> {
  const exists = db.prepare(`select 1 from people where url = ?`);
  const upsertPerson = db.prepare(
    `insert into people (url, name, title, company) values (?, ?, ?, ?)
     on conflict(url) do update set
       name = excluded.name, title = excluded.title, company = excluded.company`,
  );
  const addEdge = db.prepare(
    `insert or ignore into knows (member_email, url, connected_on) values (?, ?, ?)`,
  );

  const member = memberEmail.trim().toLowerCase();
  let added = 0;

  // One transaction: a half-loaded export is worse than no export.
  db.transaction(() => {
    for (const row of rows) {
      if (!exists.get(row.url)) added += 1;
      // The freshest export wins, so a member who exported this week corrects
      // one who exported in 2023.
      upsertPerson.run(row.url, row.name, row.title, row.company);
      addEdge.run(member, row.url, row.connectedOn);
    }
  })();

  await indexVectors(db, rows);
  invalidateIndex();

  return { rows: rows.length, added, shared: rows.length - added };
}

async function indexVectors(db: Database.Database, rows: Connection[]) {
  const save = db.prepare(
    `insert into vectors (url, v) values (?, ?)
     on conflict(url) do update set v = excluded.v`,
  );

  for (let i = 0; i < rows.length; i += EMBED_BATCH) {
    const batch = rows.slice(i, i + EMBED_BATCH);
    const vectors = await embed(
      batch.map((row) => `${row.name} ${row.title} ${row.company}`.trim()),
    );
    db.transaction(() => {
      batch.forEach((row, n) => save.run(row.url, Buffer.from(vectors[n].buffer)));
    })();
  }
}
