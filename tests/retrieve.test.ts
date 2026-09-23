import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { ingest } from "@/lib/bank";
import { retrieve } from "@/lib/retrieve";
import type { Connection } from "@/lib/linkedin";

const DIR = join(process.cwd(), "lib/migrations");

const neha: Connection = {
  url: "linkedin.com/in/neha-mittal",
  name: "Neha Mittal",
  title: "CEO and Co-founder",
  company: "JustAI",
  connectedOn: "",
};
const sam: Connection = {
  url: "linkedin.com/in/sam-buxton",
  name: "Sam Buxton",
  title: "Head of Platform",
  company: "Monzo",
  connectedOn: "",
};

function bank() {
  const db = new Database(":memory:");
  for (const file of readdirSync(DIR).sort()) {
    if (file.includes("bank")) db.exec(readFileSync(join(DIR, file), "utf8"));
  }
  ingest(db, "ade@example.com", [neha, sam]);
  ingest(db, "tomi@example.com", [neha]);
  return db;
}

describe("retrieve", () => {
  it("finds a person by company and names every member who knows them", () => {
    const [hit] = retrieve(bank(), "JustAI", 10);
    expect(hit.name).toBe("Neha Mittal");
    expect(hit.via.sort()).toEqual(["ade@example.com", "tomi@example.com"]);
  });

  it("puts the person more of the cohort knows first", () => {
    const hits = retrieve(bank(), "JustAI Monzo", 10);
    expect(hits.map((h) => h.name)).toEqual(["Neha Mittal", "Sam Buxton"]);
  });

  it("matches on a title word, not just the company", () => {
    expect(retrieve(bank(), "platform", 10)[0].name).toBe("Sam Buxton");
  });

  it("returns nothing rather than throwing on punctuation", () => {
    expect(retrieve(bank(), '"; drop table people; --', 10)).toEqual([]);
  });

  it("returns nothing for an empty query", () => {
    expect(retrieve(bank(), "   ", 10)).toEqual([]);
  });

  it("honours the limit", () => {
    expect(retrieve(bank(), "JustAI Monzo", 1)).toHaveLength(1);
  });
});
