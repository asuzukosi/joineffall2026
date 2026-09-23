import type Database from "better-sqlite3";
import type { Connection } from "./linkedin";

export type IngestResult = {
  rows: number;
  added: number;
  shared: number;
};

export function ingest(
  db: Database.Database,
  memberEmail: string,
  rows: Connection[],
): IngestResult {
  const exists = db.prepare(`select 1 from people where url = ?`);
  const upsertPerson = db.prepare(
    `insert into people (url, name, title, company) values (?, ?, ?, ?)
     on conflict(url) do update set
       name = excluded.name, title = excluded.title, company = excluded.company`,
  );
  const clearIndex = db.prepare(`delete from people_fts where url = ?`);
  const addIndex = db.prepare(`insert into people_fts (url, text) values (?, ?)`);
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
      clearIndex.run(row.url);
      addIndex.run(row.url, `${row.name} ${row.title} ${row.company}`);
      addEdge.run(member, row.url, row.connectedOn);
    }
  })();

  return { rows: rows.length, added, shared: rows.length - added };
}
