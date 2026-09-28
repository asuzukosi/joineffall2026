import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadPeople, readJson, signalsFor } from "./batch.ts";
import { checkNote, partText, valueText } from "./checks.ts";
import type { Brief, Company, FollowUp, Note, Person } from "./types.ts";

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
    (note.follow_ups ?? []).forEach((followUp, i) =>
      writeFileSync(join(out, `follow-up-${i + 1}.md`), composeFollowUp(followUp, person, brief)));
    writeFileSync(join(out, "linkedin.md"), lower(note.linkedin.trim(), [...person.name.split(" "), person.company]) + "\n");
  } catch (error) {
    const reason = error instanceof SyntaxError ? "is not valid JSON" : "has the wrong shape";
    return [`notes/${id}.json ${reason}: ${(error as Error).message}`];
  }
  return [];
}

const OPT_OUT = `not relevant? that's fine! send a "no" and i won't follow up`;

function lower(text: string, names: string[] = []) {
  const keep = (piece: string) => names.filter(Boolean).reduce((out, name) =>
    out.replace(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), name), piece.toLowerCase());
  return text.split(/(https?:\/\/\S+)/).map((piece, i) => (i % 2 ? piece : keep(piece))).join("");
}

function signOff(text: string, person: Person, brief: Brief) {
  const first = person.name.split(" ")[0] || "there";
  const keep = [...person.name.split(" "), person.company];
  return `${lower(`hi ${first},\n\n${text}\n\n${brief.sender.name}\n\n${OPT_OUT}`, keep)}\n`;
}

export function composeFollowUp(followUp: FollowUp, person: Person, brief: Brief) {
  return signOff(`${valueText(followUp)}\n${followUp.link}`, person, brief);
}

export function composeEmail(note: Note, person: Person, brief: Brief) {
  const paragraphs = note.order.filter((part) => part !== "why_me").map((part) =>
    part === "gift" ? `${valueText(note.gift)}\n${note.gift.link}`
      : part === "ask" ? `${note.why_me} ${note.ask}\n${brief.sender.booking_link}`
      : partText(note, part));
  return `Subject: ${note.subject.trim()}\n\n${signOff(paragraphs.join("\n\n"), person, brief)}`;
}
