import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Brief, Company, Found, Person, Signal } from "./types.ts";

export const OUTBOUND = join(import.meta.dirname, "../../outbound");

const EMPTY: Omit<Person, "id"> = {
  name: "", title: "", company: "", domain: "", company_size: null,
  linkedin: "", email: "", phone: null, phone_request_id: null, signals: [],
  tier: null, tier_override: null, speed_score: 0, speed_reasons: [], approved: false, enriched_at: null,
};

const NEW_BRIEF: Brief = {
  industry: "", offer: "",
  sender: { name: "", company: "", why_me: "" },
  roles: [], strategic_companies: [],
};

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function create(slug: string, industry: string, offer: string, root = OUTBOUND) {
  const dir = join(root, `${today()}-${slug}`);
  if (existsSync(dir)) throw new Error(`${dir} already exists`);
  mkdirSync(join(dir, "notes"), { recursive: true });
  mkdirSync(join(dir, "out"));
  writeJson(join(dir, "brief.json"), { ...NEW_BRIEF, industry, offer });
  writeJson(join(dir, "companies.json"), {});
  writeFileSync(join(dir, "people.jsonl"), "");
  return dir;
}

export function openBatch(name: string, root = OUTBOUND) {
  for (const dir of [name, join(root, name)]) {
    if (existsSync(join(dir, "brief.json"))) return dir;
  }
  throw new Error(`no batch called ${name}; run new first`);
}

export function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeJson(file: string, data: unknown) {
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export function loadPeople(dir: string): Person[] {
  const lines = readFileSync(join(dir, "people.jsonl"), "utf8").split("\n");
  return lines.filter((line) => line.trim()).map((line) => JSON.parse(line));
}

export function savePeople(dir: string, people: Person[]) {
  writeFileSync(join(dir, "people.jsonl"), people.map((p) => JSON.stringify(p) + "\n").join(""));
}

function matchKeys(person: Found | Person) {
  const keys = [];
  for (const field of ["linkedin", "email"] as const) {
    const value = (person[field] ?? "").trim().toLowerCase().replace(/\/+$/, "");
    if (value) keys.push(`${field}:${value}`);
  }
  const name = (person.name ?? "").trim().toLowerCase();
  const company = (person.company ?? "").trim().toLowerCase();
  if (name && company) keys.push(`name:${name}|${company}`);
  return keys;
}

export function addPeople(dir: string, found: Found[]) {
  const people = loadPeople(dir);
  const index = new Map(people.flatMap((p) => matchKeys(p).map((k) => [k, p] as const)));
  let added = 0;
  for (const person of found) {
    const keys = matchKeys(person);
    if (!keys.length) continue;
    let record = keys.map((k) => index.get(k)).find(Boolean);
    if (record) merge(record, person);
    else {
      const id = "p_" + createHash("sha1").update(keys[0]).digest("hex").slice(0, 8);
      record = { ...EMPTY, ...person, id, signals: [] };
      addSignals(record, person.signals);
      people.push(record);
      added++;
    }
    for (const key of matchKeys(record)) index.set(key, record);
  }
  savePeople(dir, people);
  return added;
}

function merge(person: Person, update: Found) {
  const target = person as Record<string, unknown>;
  for (const [field, value] of Object.entries(update)) {
    if (field === "signals") addSignals(person, value as Signal[]);
    else if (value && !target[field]) target[field] = value;
  }
}

export function addSignals(record: { signals: Signal[] }, signals: Signal[]) {
  const known = new Set(record.signals.map((s) => s.id));
  for (const signal of signals) {
    if (known.has(signal.id)) continue;
    record.signals.push(signal);
    known.add(signal.id);
  }
}

export function addCompanySignals(dir: string, company: string, signals: Signal[]) {
  const file = join(dir, "companies.json");
  const companies = readJson<Record<string, Company>>(file);
  const key = company.trim().toLowerCase();
  companies[key] ??= { name: company, signals: [] };
  addSignals(companies[key], signals);
  writeJson(file, companies);
}

export function signalsFor(companies: Record<string, Company>, person: Pick<Person, "company" | "signals">) {
  const company = companies[(person.company ?? "").trim().toLowerCase()];
  return [...person.signals, ...(company?.signals ?? [])];
}
