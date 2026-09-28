import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { addCompanySignals, addPeople, addSignals, create, loadPeople, openBatch, readJson, savePeople, today } from "./batch.ts";
import { apollo, enrichAll } from "./enrich.ts";
import * as exa from "./exa.ts";
import * as jobs from "./jobs.ts";
import * as papers from "./papers.ts";
import { openSeats, rankAll, TIERS } from "./rank.ts";
import type { Brief, Company } from "./types.ts";

const KINDS = new Set(["profile", "news", "joined", "role_change", "left", "funding", "hiring",
  "deadline", "competitor_news", "publishes", "speaks"]);

const USAGE = `usage: npm run discover -- <command>

  new <slug> --industry "..." --offer "..."           start outbound/<date>-<slug>/ with an empty brief
  find <batch> --source exa|papers --query "..."      add people [--limit 25] [--since YYYY-MM-DD]
  find <batch> --source jobs --board greenhouse:<token> --company "..." --query "..."
                                                      record matching job posts as company hiring signals
  signal <batch> <p_id|company> --kind ... --text "..." --url ... [--date YYYY-MM-DD]
                                                      record one dated piece of evidence
  enrich <batch> [--phones]                           email, company size, job changes, funding from Apollo
  rank <batch>                                        set tiers and speed scores; print the send order
  status <batch>                                      counts per step and tier; seats that just opened`;

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    industry: { type: "string" }, offer: { type: "string" },
    source: { type: "string" }, query: { type: "string" }, limit: { type: "string", default: "25" },
    since: { type: "string" }, board: { type: "string" }, company: { type: "string" },
    kind: { type: "string" }, text: { type: "string" }, url: { type: "string" }, date: { type: "string" },
    phones: { type: "boolean", default: false },
  },
});
const need = (name: keyof typeof values) => (values[name] as string | undefined) ?? fail(`--${name} is required`);

async function find(name: string) {
  const dir = openBatch(name);
  const source = need("source");
  if (source === "jobs") return findJobs(dir);
  const since = values.since ?? new Date(Date.now() - 730 * 86_400_000).toISOString().slice(0, 10);
  const found = source === "exa" ? await exa.find(need("query"), Number(values.limit), today())
    : source === "papers" ? await papers.find(need("query"), since, Number(values.limit))
    : fail(`unknown source ${source}`);
  console.log(`${found.length} found, ${addPeople(dir, found)} new`);
}

async function findJobs(dir: string) {
  const [board, token] = need("board").split(":");
  const company = values.company ?? token;
  const signals = await jobs.find(board, token, need("query"));
  addCompanySignals(dir, company, signals);
  console.log(`${signals.length} matching posts recorded for ${company}`);
  const known = new Set(loadPeople(dir).map((p) => p.company.trim().toLowerCase()));
  if (signals.length && !known.has(company.trim().toLowerCase())) {
    console.log(`no people at ${company} yet; find them, e.g. find <batch> --source exa --query "<role> at ${company}"`);
  }
}

function signal(name: string, target: string) {
  const dir = openBatch(name);
  const kind = need("kind");
  if (!KINDS.has(kind)) fail(`--kind must be one of ${[...KINDS].join(", ")}`);
  const [text, url] = [need("text"), need("url")];
  const record = { id: `${kind}:${createHash("sha1").update(url + text).digest("hex").slice(0, 8)}`,
    kind, date: values.date ?? today(), text, url };
  if (target.startsWith("p_")) {
    const people = loadPeople(dir);
    const person = people.find((p) => p.id === target) ?? fail(`no person ${target}`);
    addSignals(person, [record]);
    savePeople(dir, people);
  } else addCompanySignals(dir, target, [record]);
  console.log(record.id);
}

async function enrich(name: string) {
  const dir = openBatch(name);
  const people = loadPeople(dir);
  const matched = await enrichAll(people, Boolean(values.phones), apollo(), today());
  savePeople(dir, people);
  console.log(`${matched} matched in Apollo, ${people.filter((p) => p.phone).length} with phones`);
}

function rank(name: string) {
  const dir = openBatch(name);
  const brief = readJson<Brief>(join(dir, "brief.json"));
  const companies = readJson<Record<string, Company>>(join(dir, "companies.json"));
  const ordered = rankAll(loadPeople(dir), companies, brief.strategic_companies, today());
  savePeople(dir, ordered);
  for (const p of ordered) {
    console.log(`${p.tier!.padEnd(9)}${String(p.speed_score).padStart(3)}  ${p.id}  ${p.name}, ${p.title} at ${p.company}`);
  }
}

function status(name: string) {
  const dir = openBatch(name);
  const people = loadPeople(dir);
  const notes = readdirSync(join(dir, "notes")).filter((f) => f.endsWith(".json")).length;
  const drafted = people.filter((p) => existsSync(join(dir, "out", p.id, "email.md"))).length;
  console.log(`${people.length} people · ${people.filter((p) => p.email).length} with email · ${notes} notes · ` +
    `${drafted} drafted · ${people.filter((p) => p.approved).length} approved`);
  for (const tier of TIERS) {
    const count = people.filter((p) => p.tier === tier).length;
    if (count) console.log(`  ${tier.padEnd(9)}${count}`);
  }
  const seats = openSeats(people);
  if (seats.length) console.log(`\nseats that just opened — find who replaced them:\n${seats.map((s) => `  ${s}`).join("\n")}`);
}

const [command, arg, target] = positionals;
if (!arg) fail(USAGE);

try {
  if (command === "new") {
    const dir = create(arg, need("industry"), need("offer"));
    console.log(`created ${dir}\nnext: fill in brief.json — sender, roles with todo_guesses, strategic_companies`);
  } else if (command === "find") await find(arg);
  else if (command === "signal") signal(arg, target ?? fail(USAGE));
  else if (command === "enrich") await enrich(arg);
  else if (command === "rank") rank(arg);
  else if (command === "status") status(arg);
  else fail(USAGE);
} catch (error) {
  fail((error as Error).message);
}
