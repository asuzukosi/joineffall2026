import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "@/lib/linkedin";

// The unit tests must not call OpenAI, so the embedder is replaced with a
// deterministic stand-in: three axes, one per topic. It proves the plumbing —
// nearest vector first, the limit, the via list — not that a model understands
// anything. That part is verified against the deployed app.
const AXES = [
  ["invest", "capital", "fund", "vc", "money"],
  ["robot", "hardware", "mechanical", "firmware"],
  ["design", "brand", "product"],
];

function stub(text: string): Float32Array {
  const words = text.toLowerCase();
  const raw = AXES.map((axis) =>
    axis.reduce((n, term) => n + (words.includes(term) ? 1 : 0), 0),
  );
  const norm = Math.hypot(...raw) || 1;
  return Float32Array.from(raw.map((value) => value / norm));
}


vi.mock("@/lib/embed", () => ({
  EMBED_BATCH: 256,
  embed: async (texts: string[]) => texts.map(stub),
}));

const { ingest } = await import("@/lib/bank");
const { retrieve, invalidateIndex } = await import("@/lib/retrieve");

const DIR = join(process.cwd(), "lib/migrations");

const investor: Connection = {
  url: "linkedin.com/in/ada-capital",
  name: "Ada Capital",
  title: "Partner",
  company: "Fund One",
  connectedOn: "",
};
const engineer: Connection = {
  url: "linkedin.com/in/bo-robot",
  name: "Bo Robot",
  title: "Firmware Engineer",
  company: "Robot Works",
  connectedOn: "",
};

let db: Database.Database;

beforeEach(async () => {
  invalidateIndex();
  db = new Database(":memory:");
  for (const file of readdirSync(DIR).sort()) {
    if (file.includes("bank") || file.includes("vectors")) {
      db.exec(readFileSync(join(DIR, file), "utf8"));
    }
  }
  await ingest(db, "ade@example.com", [investor, engineer]);
  await ingest(db, "tomi@example.com", [investor]);
});

describe("retrieve", () => {
  it("returns the nearest person first, with no word in common", async () => {
    const [first] = await retrieve(db, "someone who could fund a round", 10);
    expect(first.name).toBe("Ada Capital");
  });

  it("names every member who knows them", async () => {
    const [first] = await retrieve(db, "vc money", 10);
    expect(first.via.sort()).toEqual(["ade@example.com", "tomi@example.com"]);
  });

  it("picks the other person for a different question", async () => {
    const [first] = await retrieve(db, "mechanical and firmware work", 10);
    expect(first.name).toBe("Bo Robot");
  });

  it("honours the limit", async () => {
    expect(await retrieve(db, "invest robot", 1)).toHaveLength(1);
  });

  it("returns nothing for an empty query", async () => {
    expect(await retrieve(db, "   ", 10)).toEqual([]);
  });

  it("returns nothing when the bank is empty", async () => {
    const empty = new Database(":memory:");
    for (const file of readdirSync(DIR).sort()) {
      if (file.includes("bank") || file.includes("vectors")) {
        empty.exec(readFileSync(join(DIR, file), "utf8"));
      }
    }
    invalidateIndex();
    expect(await retrieve(empty, "anything", 10)).toEqual([]);
  });
});
