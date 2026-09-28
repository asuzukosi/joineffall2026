import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Note, Person, Signal } from "./types.ts";

export const PARTS = ["seen", "gift", "why_me", "ask"] as const;
const REQUIRED = ["subject", "seen", "gift", "why_me", "ask", "order", "linkedin"] as const;
const BANNED = ["i'm a", "i am a", "i've helped", "i have helped", "are you open to", "quick call", "hope this finds you"];
const WORD_LIMITS: Record<string, number> = { mouse: 90, rabbit: 90, deer: 120, elephant: 150, whale: 150 };
const LINKEDIN_LIMIT = 200;
const EMPTY_SUBJECTS = /^(quick question|following up|follow up|checking in|touching base|intro\b|introduction|hi\b|hello\b|hey\b)/i;

export function partText(note: Note, part: string) {
  const value = note[part as keyof Note];
  return typeof value === "string" ? value : (value as { text: string }).text;
}

export function checkNote(note: Note, person: Person, signals: Signal[], gifts: { pamphlets: string; out: string }) {
  const missing = REQUIRED.filter((field) => !note[field]);
  if (missing.length) return [`missing: ${missing.join(", ")}`];
  return [...checkOrder(note.order), ...checkEvidence(note, signals), ...checkWords(note, person), ...checkGift(note, gifts)];
}

function checkOrder(order: string[]) {
  if ([...order].sort().join() !== [...PARTS].sort().join()) return [`order must list each of ${PARTS.join(", ")} once`];
  const problems = [];
  if (order.at(-1) !== "ask") problems.push("the ask must come last");
  if (order.indexOf("why_me") < order.indexOf("gift")) problems.push("why_me must come after the gift");
  return problems;
}

function checkEvidence(note: Note, signals: Signal[]) {
  const ids = new Set(signals.map((s) => s.id));
  const evidence = note.seen.evidence ?? [];
  if (!evidence.length) return ["seen has no evidence; cite at least one signal id"];
  return evidence.filter((id) => !ids.has(id)).map((id) => `unknown evidence id: ${id}`);
}

function checkWords(note: Note, person: Person) {
  const email = PARTS.map((part) => partText(note, part)).join(" ");
  const everything = `${email} ${note.linkedin}`.toLowerCase().replaceAll("’", "'");
  const problems = BANNED.filter((phrase) => everything.includes(phrase)).map((phrase) => `banned phrase: "${phrase}"`);
  if (EMPTY_SUBJECTS.test(note.subject.trim())) problems.push(`subject says nothing about their outcome: "${note.subject}"`);
  const tier = person.tier ?? "deer";
  const words = email.split(/\s+/).filter(Boolean).length;
  if (words > WORD_LIMITS[tier]) problems.push(`email is ${words} words; the ${tier} limit is ${WORD_LIMITS[tier]}`);
  if (note.linkedin.length > LINKEDIN_LIMIT) {
    problems.push(`LinkedIn note is ${note.linkedin.length} characters; the limit is ${LINKEDIN_LIMIT}`);
  }
  return problems;
}

function checkGift(note: Note, gifts: { pamphlets: string; out: string }) {
  const { pamphlet, file, link } = note.gift;
  const problems = [];
  if (!link?.startsWith("https://")) problems.push("gift needs a link they can open, such as a Google Drive link anyone can view");
  else if (!note.linkedin.includes(link)) problems.push("the LinkedIn note must include the gift link");
  if (pamphlet && !existsSync(join(gifts.pamphlets, pamphlet, "pamphlet.pdf"))) {
    problems.push(`pamphlet ${pamphlet} is not built; run npm run pamphlet -- build ${pamphlet}`);
  }
  if (file && !existsSync(join(gifts.out, file))) problems.push(`gift file ${join(gifts.out, file)} does not exist`);
  return problems;
}
