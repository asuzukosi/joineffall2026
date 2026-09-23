import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { ingest } from "@/lib/bank";
import type { Connection } from "@/lib/linkedin";

const DIR = join(process.cwd(), "lib/migrations");

function freshBank() {
  const db = new Database(":memory:");
  for (const file of readdirSync(DIR).sort()) {
    if (file.includes("bank")) db.exec(readFileSync(join(DIR, file), "utf8"));
  }
  return db;
}

const neha: Connection = {
  url: "linkedin.com/in/neha-mittal",
  name: "Neha Mittal",
  title: "CEO",
  company: "JustAI",
  connectedOn: "14 Mar 2021",
};

let db: Database.Database;
beforeEach(() => {
  db = freshBank();
});

describe("ingest", () => {
  it("counts a first upload as all new", () => {
    expect(ingest(db, "ade@example.com", [neha]))
      .toEqual({ rows: 1, added: 1, shared: 0 });
  });

  it("counts someone another member already knows as shared", () => {
    ingest(db, "ade@example.com", [neha]);
    expect(ingest(db, "tomi@example.com", [neha]))
      .toEqual({ rows: 1, added: 0, shared: 1 });
  });

  it("is idempotent, so re-uploading the same file adds nobody", () => {
    ingest(db, "ade@example.com", [neha]);
    expect(ingest(db, "ade@example.com", [neha]))
      .toEqual({ rows: 1, added: 0, shared: 1 });
    expect(db.prepare("select count(*) as n from knows").get()).toEqual({ n: 1 });
  });

  it("keeps one person and one edge per member who knows them", () => {
    ingest(db, "ade@example.com", [neha]);
    ingest(db, "tomi@example.com", [neha]);
    expect(db.prepare("select count(*) as n from people").get()).toEqual({ n: 1 });
    expect(db.prepare("select count(*) as n from knows").get()).toEqual({ n: 2 });
  });

  it("lets a fresher export correct a stale title", () => {
    ingest(db, "ade@example.com", [{ ...neha, title: "Engineer" }]);
    ingest(db, "tomi@example.com", [neha]);
    expect(db.prepare("select title from people where url = ?").get(neha.url))
      .toEqual({ title: "CEO" });
  });

  it("indexes each person once for search, however many members know them", () => {
    ingest(db, "ade@example.com", [neha]);
    ingest(db, "tomi@example.com", [neha]);
    const hits = db
      .prepare("select count(*) as n from people_fts where people_fts match ?")
      .get('"justai"');
    expect(hits).toEqual({ n: 1 });
  });
});
