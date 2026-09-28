import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadPeople, readJson, signalsFor } from "./batch.ts";
import { checkNote, partText } from "./checks.ts";
import type { Brief, Company, Note, Person } from "./types.ts";

export const PAMPHLETS = join(import.meta.dirname, "../../pamphlets");

export function draftAll(dir: string, pamphlets = PAMPHLETS) {
  const brief = readJson<Brief>(join(dir, "brief.json"));
  if (!brief.sender?.booking_link?.startsWith("https://")) throw new Error("brief.json needs sender.booking_link, the 20-minute booking page");
  const companies = readJson<Record<string, Company>>(join(dir, "companies.json"));
  const people = new Map(loadPeople(dir).map((p) => [p.id, p]));
  const failures: Record<string, string[]> = {};
  for (const file of readdirSync(join(dir, "notes")).filter((f) => f.endsWith(".json")).sort()) {
    const id = file.replace(/\.json$/, "");
    const problems = draftOne(dir, id, people.get(id), brief, companies, pamphlets);
    if (problems.length) failures[id] = problems;
  }
  return failures;
}

function draftOne(dir: string, id: string, person: Person | undefined, brief: Brief,
  companies: Record<string, Company>, pamphlets: string) {
  if (!person) return [`no person with id ${id}`];
  const out = join(dir, "out", id);
  try {
    const note: Note = JSON.parse(readFileSync(join(dir, "notes", `${id}.json`), "utf8"));
    const problems = checkNote(note, person, signalsFor(companies, person), { pamphlets, out });
    if (problems.length) return problems;
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "email.md"), composeEmail(note, person, brief));
    writeFileSync(join(out, "linkedin.md"), note.linkedin.trim() + "\n");
  } catch (error) {
    const reason = error instanceof SyntaxError ? "is not valid JSON" : "has the wrong shape";
    return [`notes/${id}.json ${reason}: ${(error as Error).message}`];
  }
  return [];
}

export function composeEmail(note: Note, person: Person, brief: Brief) {
  const first = person.name.split(" ")[0] || "there";
  const links: Record<string, string> = { gift: note.gift.link ?? "", ask: brief.sender.booking_link };
  const parts = note.order.map((part) => links[part] ? `${partText(note, part)}\n${links[part]}` : partText(note, part));
  return `Subject: ${note.subject}\n\nHi ${first},\n\n${parts.join("\n\n")}\n\n${brief.sender.name}\n`;
}
