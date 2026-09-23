import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

const DIR = join(process.cwd(), "lib/migrations");

function applyAll(db: Database.Database) {
  for (const file of readdirSync(DIR).sort()) {
    if (file.endsWith(".sql")) db.exec(readFileSync(join(DIR, file), "utf8"));
  }
}

describe("the migrations", () => {
  it("create both bank tables alongside the auth ones", () => {
    const db = new Database(":memory:");
    applyAll(db);
    const tables = db
      .prepare("select name from sqlite_master where type = 'table'")
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tables).toEqual(expect.arrayContaining(["people", "knows", "user", "session"]));
  });

  it("re-apply on every boot without error", () => {
    const db = new Database(":memory:");
    applyAll(db);
    applyAll(db);
    expect(() => applyAll(db)).not.toThrow();
  });

  it("keep one row per person and one edge per member", () => {
    const db = new Database(":memory:");
    applyAll(db);
    const person = db.prepare(
      "insert into people (url, name, title, company) values (?, ?, ?, ?) on conflict(url) do nothing",
    );
    const edge = db.prepare(
      "insert or ignore into knows (member_email, url, connected_on) values (?, ?, ?)",
    );
    person.run("linkedin.com/in/neha", "Neha", "CEO", "JustAI");
    person.run("linkedin.com/in/neha", "Neha", "CEO", "JustAI");
    edge.run("ade@example.com", "linkedin.com/in/neha", "2021");
    edge.run("tomi@example.com", "linkedin.com/in/neha", "2023");
    edge.run("tomi@example.com", "linkedin.com/in/neha", "2023");

    expect(db.prepare("select count(*) as n from people").get()).toEqual({ n: 1 });
    expect(db.prepare("select count(*) as n from knows").get()).toEqual({ n: 2 });
  });

  it("leave no keyword index behind, and a vectors table in its place", () => {
    const db = new Database(":memory:");
    applyAll(db);
    const tables = db
      .prepare("select name from sqlite_master where type in ('table','view')")
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tables).toContain("vectors");
    expect(tables).not.toContain("people_fts");
  });
});
