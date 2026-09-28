# Customer Discovery Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `discover` script and two local skills that let any agent turn "industry + offer + target roles" into a ranked batch of non-obvious people, each with a value-first email and LinkedIn draft whose gift is a pamphlet made for them, ready for a human to approve.

**Architecture:** One more tool beside `scripts/maze` and `scripts/pamphlet`, built the same way: TypeScript run directly by Node (`npm run discover -- …`), no build step, output in a gitignored folder at the repo root. Each command reads and writes files in one batch folder, so every step can be inspected and rerun. The script fetches, scores and checks; the agent does the writing; `pamphlet` makes the gift.

**Tech Stack:** Node 22 (type stripping) · TypeScript · `node:util` parseArgs · fetch · Vitest · `scripts/maze/http.ts` · `scripts/pamphlet`

**Spec:** This document, § Spec.

**Research:** `docs/research/customer-discovery-agent-tools.md`

---

## Spec

**Who sees this and what changes for them:** a founder runs one agent session and gets back a folder of 15–30 people they would not have found on LinkedIn, each with the evidence for why they were picked, a tier, a speed score, a pamphlet in their company's brand, and a draft email and LinkedIn note they can approve and send.

**Industry-agnostic.** Industry, offer, target roles and the sender's credibility line are inputs in `brief.json`. Nothing in the code or skills names an industry outside labelled examples.

**Two principles set the order of everything:**

1. **Speed of response.** Rank people by how fast they are likely to move, from dated signals. A fast mouse goes before a slow whale.
2. **Tiers set how much we can get wrong.** Practise on mice, carry what earned replies up the tiers, and never automate a whale.

### Layout

```text
joineffall2026/
├── .claude/skills/
│   ├── customer-discovery-outbound/SKILL.md   workflow, tier rules, review gates
│   └── outreach-writing/SKILL.md              the value-first message; choosing the gift
├── scripts/discover/                          the script (beside maze/ and pamphlet/)
├── tests/discover/                            Vitest
├── pamphlets/<name>/pamphlet.pdf              made by npm run pamphlet (gitignored)
└── outbound/                                  gitignored — prospect data never enters this public repo
    └── 2026-09-28-<slug>/
        ├── brief.json
        ├── people.jsonl
        ├── companies.json      signals about a company (job posts, news), shared by its people
        ├── notes/<id>.json     what the agent wrote for that person
        └── out/<id>/           email.md, linkedin.md, and any file gift such as film.mp4
```

### Commands

```text
 new ─► find / signal ─► enrich ─► rank ─► (agent writes notes, makes pamphlets) ─► draft ─► (human approves)
```

| Command | Does | Writes |
|---|---|---|
| `new <slug> --industry … --offer …` | Starts a batch with a brief the agent fills in: sender, target roles and their likely to-dos, strategic companies | `brief.json` |
| `find <batch> --source exa\|papers --query …` | Pulls people; each carries the signal that found them, plus job-change signals from their work history | adds to `people.jsonl`, deduped on LinkedIn URL, email, or name + company |
| `find <batch> --source jobs --board greenhouse:<token> --company … --query …` | Reads a public job board; matching posts become hiring signals on the company, with who the hire reports to when the post says | `companies.json`; names companies with no people yet |
| `signal <batch> <person id or company> --kind … --text … --url … [--date …]` | Records one dated piece of evidence the agent found itself: news, a deadline, a talk | `people.jsonl` or `companies.json` |
| `enrich <batch> [--phones]` | Apollo people match: email, domain, company size, work history, latest funding. `--phones` asks for mobiles with `poll_only=true` and polls for them | updates `people.jsonl` |
| `rank <batch>` | Computes tier and speed score; prints the send order | `tier`, `speed_score`, `speed_reasons` |
| `status <batch>` | Counts per step and tier; lists seats that just opened | prints |
| `draft <batch>` | Checks each note, then writes the email and LinkedIn drafts | `out/<id>/…`, or the problems per person (exit 2) |

### Sources

| `--source` | API | Finds |
|---|---|---|
| `exa` | Exa search, `category: people` | People by role and context, with work history |
| `papers` | OpenAlex works search | Authors and co-authors working on the problem |
| `jobs` | Greenhouse, Lever and Ashby public job boards (no key) | Companies with the problem on this quarter's plan, and who the hire reports to |

News, deadlines, talks and funding the agent finds with its own search tools go in through `signal`. Patents, grants, SAM.gov, SEC and Companies House come later as one more source file each.

### Job changes

LinkedIn is never read directly (its terms forbid automated access; Proxycurl was shut down after LinkedIn sued it). The same facts come from the work history Exa and Apollo return from public profiles:

| Signal | Rule (90-day window) | Text |
|---|---|---|
| `joined` | current role started ≤ 90 days ago at a different company from the last one | "Joined Beta as Head of Ops, from Acme" |
| `role_change` | current role started ≤ 90 days ago at the same company as the last one | "Became Head of Ops at Acme, was Ops Lead" |
| `left` | last role ended ≤ 90 days ago and no recent join was recorded | "Left Ops Lead at Acme; now Consultant at Gamma" |

A `joined` or `left` signal carries `company`: the company whose seat just opened. `status` lists those seats, so the agent can find the replacement, who inherits the problem.

### Person record

```json
{
  "id": "p_7f3a91c2",
  "name": "…", "title": "…", "company": "…", "domain": "acme.com", "company_size": 140,
  "linkedin": "…", "email": "…", "phone": null, "phone_request_id": null,
  "signals": [
    {"id": "apollo:ap1:joined:2026-07-01", "kind": "joined", "date": "2026-07-01", "text": "Joined Beta as Head of Ops, from Acme", "url": "…", "company": "Acme"}
  ],
  "tier": "deer", "tier_override": null,
  "speed_score": 7, "speed_reasons": ["joined: …", "hiring: …"],
  "approved": false
}
```

Signal kinds: `profile`, `news`, `joined`, `role_change`, `left`, `funding`, `hiring`, `deadline`, `competitor_news`, `publishes`, `speaks`.

### Tiers

| Tier | Company size | Human review |
|---|---|---|
| mouse | 1–10 | spot-check |
| rabbit | 11–50 | skim each |
| deer | 51–500 | read each |
| elephant | 501–5,000 | rewrite each |
| whale | over 5,000, or listed in `brief.strategic_companies` | draft only, never sent by a tool |

Unknown company size ranks as deer. The agent may set `tier_override`.

### Speed score

A sum of weights, one per kind, counted once per kind. Weights live in one table in `rank.ts`.

| Kind | Counts when | Points |
|---|---|---|
| `joined` | ≤ 90 days ago | 3 |
| `role_change` | ≤ 90 days ago | 2 |
| `left` | ≤ 90 days ago | 2 |
| `funding` | ≤ 180 days ago | 3 |
| `hiring` | any open posting | 2 |
| `deadline` | 0–60 days ahead | 2 |
| `competitor_news` | ≤ 90 days ago | 1 |
| `publishes`, `speaks` | ≤ 180 days ago | 1 each |
| founder or owner is the buyer | title has founder, owner, CEO, chief executive, managing director or president | 2 |

Send order: tier from mouse up, then speed score from high to low.

### The message

Four parts. **Seen** and **gift** may come in either order; **why me** follows the gift; the **ask** is always last.

```text
SEEN    their likely problem now, from a real signal — a question is fine, a claimed fact is not
GIFT    what they get today, and no ask attached
WHY ME  one line of credibility
ASK     20 minutes, naming what the call will cover
```

`notes/<id>.json`:

```json
{
  "todo_guess": "…",
  "subject": "…",
  "seen":   {"text": "…", "evidence": ["apollo:ap1:joined:2026-07-01"]},
  "gift":   {"text": "…", "pamphlet": "acme-inspection"},
  "why_me": "…",
  "ask":    "…",
  "order":  ["seen", "gift", "why_me", "ask"],
  "linkedin": "…"
}
```

The gift names one of: `pamphlet` (a folder under `pamphlets/` with a built `pamphlet.pdf`), `file` (a file in `out/<id>/`, such as a Higgsfield film), or `link` (a public page).

`draft` refuses a note, naming the reason, when:

- a required field is missing or the file is not valid JSON;
- `seen.evidence` is empty or names a signal id not recorded on the person or their company;
- `order` does not hold each part once, the ask is not last, or why-me comes before the gift;
- the email or LinkedIn note contains a banned phrase: "I'm a", "I am a", "I've helped", "I have helped", "are you open to", "quick call", "hope this finds you";
- the four parts run over the tier's limit (mouse and rabbit 90 words, deer 120, elephant and whale 150) or the LinkedIn note is over 300 characters;
- the gift has no pamphlet, file or link, or the pamphlet PDF or file does not exist.

These are plain text checks. They catch the obvious mistakes; whether a message lands is judged by the human reviewer and by mouse-tier reply rates.

### The gift

Made by the existing `pamphlet` tool and `customer-pamphlet` skill: the prospect's brand via dembrandt, generated images, "for them, not from them". The `outreach-writing` skill covers choosing it: guess their to-do list this quarter, pick the one research task that removes an item, and make that the pamphlet. Sometimes the gift is a short film made with the existing `customer-video` skill: a made-up character in their role living the problem, in their brand, never their own face or likeness.

### Keys

`EXA_API_KEY`, `APOLLO_API_KEY` (a master key: the script calls the REST API, not the OAuth MCP), optional `OPENALEX_MAILTO`, loaded from `.env.local` by `node --env-file-if-exists`. A command whose key is missing stops and names it.

### Testing

- OpenAlex and Greenhouse parsers run against one saved real response each; Exa, Lever, Ashby and Apollo against responses shaped as their docs describe, confirmed in the live run.
- Job changes run against hand-built histories: joined, role change, left, and nothing recent.
- The checks run against the founder-mental-health pair: the pitch-first message fails, the value-first one passes.
- `rank` runs against hand-built people with known tiers and scores.
- One live batch end to end before calling it done.

### Deferred, in the order they would come

1. **`publish`** — upload each gift to Cloudflare R2 behind a Worker with a unique link per person, so opens are visible.
2. **`send`** — add approved people to an Apollo sequence with their link as a custom field; LinkedIn notes stay copy-and-paste.
3. More sources: patents, grants, SAM.gov, SEC, Companies House.
4. Slides, from the gcr slides pipeline.
5. A shared industry dashboard.

**Out of scope:** automated LinkedIn messaging or reading (breaks LinkedIn's User Agreement 8.2), any AI model call inside the script, a database, a web UI, scheduling.

## Global Constraints

- Node 22, TypeScript run directly by Node: `import type` for types, `.ts` extensions in imports, no enums. Same shape as `scripts/maze`: `cli.ts` with `parseArgs`, a `USAGE` string, `fail()` exiting 2.
- `package.json` script: `"discover": "node --env-file-if-exists=.env.local scripts/discover/cli.ts"`.
- HTTP through `scripts/maze/http.ts` (`getJson`, `postJson`) except where a status code must be read (Apollo polling).
- Functions ≤ 75 lines, files ≤ 250 lines. No comments unless a line hides a trap.
- `/outbound/` is gitignored and excluded from the Docker image. The repo is public: no prospect data is ever committed, including in fixtures — saved real responses are public job posts and public paper metadata only.
- The script never calls an AI model and never sends a message.
- Build in a worktree on branch `customer-discovery-tools`, off `pamphlet-tool` once that branch has committed `scripts/maze` and `scripts/pamphlet`. Never edit the shared checkout another session is working in. Commit messages carry no agent attribution.

## Review Focus

1. **The same person found by two sources** — one with a LinkedIn URL, one with only name + company — stays one record with both signals. Test in Task 1.
2. **Work history with missing or partial dates** (`"2026-07"`, `"2026"`, no end, no start) — parsed to the first of the month or year, or skipped, never crashed on. Test in Task 2.
3. **Apollo finds no match** (`person` is null) — the person is left as is and the count says so. Test in Task 4.
4. **One broken note** (bad JSON, missing field, unknown person id) — `draft` reports that person's problem and still drafts everyone else. Test in Task 6.
5. **A missing key** — the command stops and names `EXA_API_KEY` or `APOLLO_API_KEY`. Test in Task 1.

---

### Task 1: Batch folder, keys and `discover new`

**Files:**
- Create: `scripts/discover/package.json`, `scripts/discover/types.ts`, `scripts/discover/batch.ts`, `scripts/discover/keys.ts`, `scripts/discover/cli.ts`, `tests/discover/batch.test.ts`
- Modify: `package.json`, `.gitignore`, `.dockerignore`

**Interfaces:**
- Produces:
  - `types.ts`: `Signal`, `Person`, `Found`, `Tier`, `Brief`, `Company`, `Job`, `Gift`, `Note`
  - `batch.OUTBOUND: string`, `batch.today(): string`
  - `batch.create(slug: string, industry: string, offer: string, root?: string): string`
  - `batch.openBatch(name: string, root?: string): string`
  - `batch.readJson<T>(file: string): T`, `batch.writeJson(file: string, data: unknown): void`
  - `batch.loadPeople(dir: string): Person[]`, `batch.savePeople(dir: string, people: Person[]): void`
  - `batch.addPeople(dir: string, found: Found[]): number`
  - `batch.addSignals(record: { signals: Signal[] }, signals: Signal[]): void`
  - `batch.addCompanySignals(dir: string, company: string, signals: Signal[]): void`
  - `batch.signalsFor(companies: Record<string, Company>, person: Pick<Person, "company" | "signals">): Signal[]`
  - `keys.requireKey(name: string): string`

- [ ] **Step 1: Worktree and wiring**

```bash
git worktree add .worktrees/customer-discovery-tools -b customer-discovery-tools pamphlet-tool
cd .worktrees/customer-discovery-tools && npm ci
mkdir -p scripts/discover tests/discover/fixtures
```

`scripts/discover/package.json`:

```json
{ "type": "module" }
```

In `package.json` scripts, after `"pamphlet"`:

```json
    "discover": "node --env-file-if-exists=.env.local scripts/discover/cli.ts"
```

Append to `.gitignore`:

```text
# outbound batches hold prospect data
/outbound/
```

Append to `.dockerignore`:

```text
outbound
```

- [ ] **Step 2: Write the types**

`scripts/discover/types.ts`:

```ts
export type Tier = "mouse" | "rabbit" | "deer" | "elephant" | "whale";

export type Signal = { id: string; kind: string; date: string; text: string; url: string; company?: string };

export type Person = {
  id: string;
  name: string;
  title: string;
  company: string;
  domain: string;
  company_size: number | null;
  linkedin: string;
  email: string;
  phone: string | null;
  phone_request_id: string | null;
  signals: Signal[];
  tier: Tier | null;
  tier_override: Tier | null;
  speed_score: number;
  speed_reasons: string[];
  approved: boolean;
};

export type Found = Partial<Omit<Person, "signals">> & { signals: Signal[] };

export type Brief = {
  industry: string;
  offer: string;
  sender: { name: string; company: string; why_me: string };
  roles: { role: string; todo_guesses: string[] }[];
  strategic_companies: string[];
};

export type Company = { name: string; signals: Signal[] };

export type Job = { title: string; company: string; start: string | null; end: string | null; current: boolean };

export type Gift = { text: string; pamphlet?: string; file?: string; link?: string };

export type Note = {
  todo_guess: string;
  subject: string;
  seen: { text: string; evidence: string[] };
  gift: Gift;
  why_me: string;
  ask: string;
  order: string[];
  linkedin: string;
};
```

- [ ] **Step 3: Write the failing tests**

`tests/discover/batch.test.ts`:

```ts
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { addCompanySignals, addPeople, create, loadPeople, openBatch, readJson, signalsFor } from "../../scripts/discover/batch.ts";
import { requireKey } from "../../scripts/discover/keys.ts";
import type { Brief, Company, Signal } from "../../scripts/discover/types.ts";

const root = () => mkdtempSync(join(tmpdir(), "discover-"));
const signal = (id: string): Signal => ({ id, kind: "profile", date: "2026-09-01", text: "t", url: "u" });

describe("batch", () => {
  it("creates a folder with an empty brief", () => {
    const dir = create("inspection", "Robotics", "Pilot reviews", root());
    expect(readJson<Brief>(join(dir, "brief.json")).industry).toBe("Robotics");
    expect(loadPeople(dir)).toEqual([]);
  });

  it("refuses to overwrite a batch", () => {
    const base = root();
    create("x", "a", "b", base);
    expect(() => create("x", "a", "b", base)).toThrow("already exists");
  });

  it("opens a batch by name or by path", () => {
    const base = root();
    const dir = create("x", "a", "b", base);
    expect(openBatch(dir.split("/").pop()!, base)).toBe(dir);
    expect(openBatch(dir, base)).toBe(dir);
    expect(() => openBatch("missing", base)).toThrow("no batch");
  });

  it("keeps the same person from two sources as one record", () => {
    const dir = create("x", "a", "b", root());
    const first = { name: "Ada Obi", company: "Acme", linkedin: "https://linkedin.com/in/ada/", signals: [signal("a")] };
    const second = { name: "ada obi", company: "ACME", title: "Head of Ops", signals: [signal("b")] };
    expect(addPeople(dir, [first])).toBe(1);
    expect(addPeople(dir, [second])).toBe(0);
    const [ada, ...rest] = loadPeople(dir);
    expect(rest).toEqual([]);
    expect(ada.signals.map((s) => s.id)).toEqual(["a", "b"]);
    expect(ada.title).toBe("Head of Ops");
    expect(ada.id).toMatch(/^p_[0-9a-f]{8}$/);
  });

  it("skips someone with no name, email or LinkedIn", () => {
    const dir = create("x", "a", "b", root());
    expect(addPeople(dir, [{ title: "Somebody", signals: [] }])).toBe(0);
  });

  it("gives company signals to that company's people", () => {
    const dir = create("x", "a", "b", root());
    addCompanySignals(dir, "Acme", [signal("job")]);
    addCompanySignals(dir, "acme", [signal("job")]);
    const companies = readJson<Record<string, Company>>(join(dir, "companies.json"));
    expect(signalsFor(companies, { company: "ACME ", signals: [signal("own")] }).map((s) => s.id)).toEqual(["own", "job"]);
  });

  it("names a missing key", () => {
    delete process.env.EXA_API_KEY;
    expect(() => requireKey("EXA_API_KEY")).toThrow("EXA_API_KEY");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run tests/discover/batch.test.ts`
Expected: FAIL — `Cannot find module '../../scripts/discover/batch.ts'`

- [ ] **Step 5: Write `batch.ts` and `keys.ts`**

`scripts/discover/batch.ts`:

```ts
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Brief, Company, Found, Person, Signal } from "./types.ts";

export const OUTBOUND = join(import.meta.dirname, "../../outbound");

const EMPTY: Omit<Person, "id"> = {
  name: "", title: "", company: "", domain: "", company_size: null,
  linkedin: "", email: "", phone: null, phone_request_id: null, signals: [],
  tier: null, tier_override: null, speed_score: 0, speed_reasons: [], approved: false,
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
```

`scripts/discover/keys.ts`:

```ts
export function requireKey(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set; add it to .env.local`);
  return value;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/discover/batch.test.ts`
Expected: 7 passed

- [ ] **Step 7: Write `cli.ts` with `new`**

`scripts/discover/cli.ts`:

```ts
import { parseArgs } from "node:util";
import { create } from "./batch.ts";

const USAGE = `usage: npm run discover -- <command>

  new <slug> --industry "..." --offer "..."   start outbound/<date>-<slug>/ with an empty brief`;

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    industry: { type: "string" },
    offer: { type: "string" },
  },
});
const [command, arg] = positionals;
if (!arg) fail(USAGE);

try {
  if (command === "new") {
    const dir = create(arg, values.industry ?? fail("--industry is required"), values.offer ?? fail("--offer is required"));
    console.log(`created ${dir}\nnext: fill in brief.json — sender, roles with todo_guesses, strategic_companies`);
  } else fail(USAGE);
} catch (error) {
  fail((error as Error).message);
}
```

Run: `npm run discover -- new smoke --industry test --offer test && ls outbound && rm -r outbound`
Expected: `created …/outbound/2026-09-28-smoke`, then the folder name.

- [ ] **Step 8: Commit**

```bash
git add package.json .gitignore .dockerignore scripts/discover tests/discover
git commit -m "Add the discover script with batch folders and discover new"
```

---

### Task 2: Job changes from work history

**Files:**
- Create: `scripts/discover/dates.ts`, `scripts/discover/changes.ts`, `tests/discover/changes.test.ts`

**Interfaces:**
- Consumes: `Job`, `Signal` from `types.ts`
- Produces:
  - `dates.parseDate(value: string | null | undefined): Date | null`
  - `dates.daysBetween(from: string, to: string): number | null` (to − from, in days)
  - `changes.RECENT_DAYS = 90`
  - `changes.jobChanges(jobs: Job[], today: string, url: string, idPrefix: string): Signal[]`

- [ ] **Step 1: Write the failing tests**

`tests/discover/changes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { jobChanges } from "../../scripts/discover/changes.ts";
import { daysBetween, parseDate } from "../../scripts/discover/dates.ts";
import type { Job } from "../../scripts/discover/types.ts";

const TODAY = "2026-09-28";
const job = (company: string, title: string, start: string | null, end: string | null = null): Job =>
  ({ company, title, start, end, current: end === null });

describe("dates", () => {
  it("reads partial dates as the first of the month or year", () => {
    expect(parseDate("2026-07")?.toISOString().slice(0, 10)).toBe("2026-07-01");
    expect(parseDate("2026")?.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(parseDate("2026-07-15T10:00:00Z")?.toISOString().slice(0, 10)).toBe("2026-07-15");
    expect(parseDate("soon")).toBeNull();
    expect(parseDate(null)).toBeNull();
    expect(daysBetween("2026-09-01", TODAY)).toBe(27);
  });
});

describe("jobChanges", () => {
  it("records joining a new company, naming the one they came from", () => {
    const [s] = jobChanges([job("Beta", "Head of Ops", "2026-07-01"), job("Acme", "Ops Lead", "2022-01", "2026-06")], TODAY, "u", "x");
    expect(s).toMatchObject({ kind: "joined", date: "2026-07-01", text: "Joined Beta as Head of Ops, from Acme", company: "Acme" });
  });

  it("records a new role at the same company", () => {
    const [s] = jobChanges([job("Acme", "Head of Ops", "2026-08"), job("Acme", "Ops Lead", "2022", "2026-08")], TODAY, "u", "x");
    expect(s).toMatchObject({ kind: "role_change", text: "Became Head of Ops at Acme, was Ops Lead" });
  });

  it("records leaving when there is no recent join", () => {
    const [s] = jobChanges([job("Acme", "Ops Lead", "2020", "2026-08-15")], TODAY, "u", "x");
    expect(s).toMatchObject({ kind: "left", text: "Left Ops Lead at Acme", company: "Acme" });
  });

  it("records nothing when every change is old or undated", () => {
    expect(jobChanges([job("Acme", "Ops Lead", "2019"), job("Old", "Analyst", null, null)], TODAY, "u", "x")).toEqual([]);
    expect(jobChanges([], TODAY, "u", "x")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/discover/changes.test.ts`
Expected: FAIL — `Cannot find module '../../scripts/discover/changes.ts'`

- [ ] **Step 3: Write `dates.ts` and `changes.ts`**

`scripts/discover/dates.ts`:

```ts
export function parseDate(value: string | null | undefined) {
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(value ?? "");
  if (!match) return null;
  const [, year, month = "01", day = "01"] = match;
  return new Date(`${year}-${month}-${day}T00:00:00Z`);
}

export function daysBetween(from: string, to: string) {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
```

`scripts/discover/changes.ts`:

```ts
import { daysBetween } from "./dates.ts";
import type { Job, Signal } from "./types.ts";

export const RECENT_DAYS = 90;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function recent(date: string | null, today: string) {
  const days = date ? daysBetween(date, today) : null;
  return days !== null && days >= 0 && days <= RECENT_DAYS;
}

function latest(jobs: Job[], field: "start" | "end") {
  return [...jobs].sort((a, b) => (b[field] ?? "").localeCompare(a[field] ?? ""))[0];
}

export function jobChanges(jobs: Job[], today: string, url: string, idPrefix: string): Signal[] {
  const current = latest(jobs.filter((j) => j.current), "start");
  const previous = latest(jobs.filter((j) => j !== current && j.end), "end");
  if (current?.start && recent(current.start, today)) {
    if (previous && same(previous.company, current.company)) {
      return [{ id: `${idPrefix}:role_change:${current.start}`, kind: "role_change", date: current.start, url,
        text: `Became ${current.title} at ${current.company}, was ${previous.title}` }];
    }
    return [{ id: `${idPrefix}:joined:${current.start}`, kind: "joined", date: current.start, url,
      text: `Joined ${current.company} as ${current.title}${previous ? `, from ${previous.company}` : ""}`,
      ...(previous && { company: previous.company }) }];
  }
  if (previous?.end && recent(previous.end, today)) {
    const now = current ? `; now ${current.title} at ${current.company}` : "";
    return [{ id: `${idPrefix}:left:${previous.end}`, kind: "left", date: previous.end, url,
      text: `Left ${previous.title} at ${previous.company}${now}`, company: previous.company }];
  }
  return [];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/discover/changes.test.ts`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add scripts/discover tests/discover
git commit -m "Turn work history into joined, role change and left signals"
```

---

### Task 3: Sources — Exa people, OpenAlex authors, job boards — plus `find` and `signal`

**Files:**
- Create: `scripts/discover/exa.ts`, `scripts/discover/papers.ts`, `scripts/discover/jobs.ts`, `tests/discover/fixtures/openalex_works.json`, `tests/discover/fixtures/greenhouse_jobs.json`, `tests/discover/sources.test.ts`
- Modify: `scripts/discover/cli.ts`

**Interfaces:**
- Consumes: `getJson`, `postJson` from `scripts/maze/http.ts`; `jobChanges`; `requireKey`; `addPeople`, `addSignals`, `addCompanySignals`, `loadPeople`, `savePeople`, `openBatch`, `today`
- Produces:
  - `exa.find(query: string, limit: number, today: string): Promise<Found[]>`, `exa.personFrom(result: ExaResult, query: string, today: string): Found`
  - `papers.find(query: string, since: string, limit: number): Promise<Found[]>`, `papers.authorsOf(work: Work): Found[]`
  - `jobs.find(board: string, token: string, query: string): Promise<Signal[]>`, `jobs.postings(board: string, data: unknown): Posting[]`, `jobs.matches(posting, query): boolean`, `jobs.signalFrom(board, token, posting): Signal`
  - `cli.ts`: `KINDS` set; `find`, `signal` commands

- [ ] **Step 1: Save one real response from each keyless source**

```bash
curl -s "https://api.openalex.org/works?search=pipeline%20inspection%20robot&per-page=3&select=id,doi,display_name,publication_date,authorships" \
  | python3 -m json.tool > tests/discover/fixtures/openalex_works.json
curl -s "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs?content=true" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);d['jobs']=d['jobs'][:3];json.dump(d,sys.stdout,indent=1)" \
  > tests/discover/fixtures/greenhouse_jobs.json
python3 -c "import json;print(len(json.load(open('tests/discover/fixtures/openalex_works.json'))['results']), len(json.load(open('tests/discover/fixtures/greenhouse_jobs.json'))['jobs']))"
```

Expected: `3 3`. If the `gitlab` board is gone, use any company on Greenhouse; the tests do not depend on which.

- [ ] **Step 2: Write the failing tests**

`tests/discover/sources.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as exa from "../../scripts/discover/exa.ts";
import * as jobs from "../../scripts/discover/jobs.ts";
import * as papers from "../../scripts/discover/papers.ts";

const fixture = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", name), "utf8"));

describe("exa", () => {
  it("reads a person, their current job and a recent move", () => {
    const person = exa.personFrom({
      id: "abc",
      url: "https://www.linkedin.com/in/ada-obi",
      title: "Ada Obi - Head of Inspection - Beta",
      entities: [{ name: "Ada Obi", workHistory: [
        { title: "Head of Inspection", company: { name: "Beta" }, dates: { start: "2026-08-01" } },
        { title: "Inspection Lead", company: { name: "Acme" }, dates: { start: "2021-01", end: "2026-07" } },
      ] }],
    }, "inspection leads", "2026-09-28");
    expect(person).toMatchObject({ name: "Ada Obi", title: "Head of Inspection", company: "Beta", linkedin: "https://www.linkedin.com/in/ada-obi" });
    expect(person.signals.map((s) => s.kind)).toEqual(["profile", "joined"]);
    expect(person.signals[1].text).toBe("Joined Beta as Head of Inspection, from Acme");
  });

  it("falls back to the page title when there is no entity", () => {
    const person = exa.personFrom({ id: "x", url: "https://example.com/team", title: "Ben Ade - CTO" }, "q", "2026-09-28");
    expect(person.name).toBe("Ben Ade");
    expect(person.linkedin).toBe("");
  });
});

describe("papers", () => {
  it("turns each author into a person sharing the paper's signal", () => {
    const works = fixture("openalex_works.json").results;
    const people = works.flatMap(papers.authorsOf);
    expect(people.length).toBeGreaterThan(0);
    for (const person of people) {
      expect(person.name).toBeTruthy();
      expect(person.signals[0].kind).toBe("publishes");
      expect(person.signals[0].id).toMatch(/^paper:W/);
    }
    expect(new Set(papers.authorsOf(works[0]).map((p) => p.signals[0].id)).size).toBe(1);
  });
});

describe("jobs", () => {
  it("reads Greenhouse posts as plain text", () => {
    const posts = jobs.postings("greenhouse", fixture("greenhouse_jobs.json"));
    expect(posts).toHaveLength(3);
    for (const post of posts) {
      expect(post.url).toMatch(/^http/);
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.text).not.toContain("<");
    }
  });

  it("reads Lever and Ashby posts", () => {
    const lever = [{ id: "l1", text: "Inspection Lead", hostedUrl: "https://jobs.lever.co/a/l1", createdAt: 1756684800000, descriptionPlain: "d" }];
    const ashby = { jobs: [{ id: "a1", title: "Robotics PM", jobUrl: "https://jobs.ashbyhq.com/b/a1", publishedAt: "2026-09-01T10:00:00Z", descriptionPlain: "d" }] };
    expect(jobs.postings("lever", lever)[0].date).toBe("2025-09-01");
    expect(jobs.postings("ashby", ashby)[0].title).toBe("Robotics PM");
  });

  it("names who the hire reports to", () => {
    const post = { id: "l1", title: "Inspection Lead", url: "https://x", date: "2026-09-01", text: "You will report to the VP of Operations. Travel required." };
    expect(jobs.signalFrom("lever", "acme", post)).toMatchObject({
      id: "job:lever:acme:l1", kind: "hiring", text: "Hiring: Inspection Lead (reports to VP of Operations)" });
  });

  it("needs every query word", () => {
    const post = { title: "Inspection Lead", text: "drones and crawlers" };
    expect(jobs.matches(post, "inspection drones")).toBe(true);
    expect(jobs.matches(post, "inspection welding")).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/discover/sources.test.ts`
Expected: FAIL — `Cannot find module '../../scripts/discover/exa.ts'`

- [ ] **Step 4: Write the three sources**

`scripts/discover/exa.ts`:

```ts
import { postJson } from "../maze/http.ts";
import { jobChanges } from "./changes.ts";
import { requireKey } from "./keys.ts";
import type { Found, Job } from "./types.ts";

type ExaJob = { title?: string; company?: string | { name?: string }; dates?: { start?: string; end?: string }; startDate?: string; endDate?: string };
export type ExaResult = { id?: string; url?: string; title?: string; publishedDate?: string; entities?: { name?: string; workHistory?: ExaJob[] }[] };

export async function find(query: string, limit: number, today: string) {
  const res = await postJson<{ results?: ExaResult[] }>("https://api.exa.ai/search",
    { query, category: "people", numResults: limit }, { "x-api-key": requireKey("EXA_API_KEY") });
  return (res.results ?? []).map((r) => personFrom(r, query, today));
}

function toJob(work: ExaJob): Job {
  const company = typeof work.company === "string" ? work.company : work.company?.name ?? "";
  const end = work.dates?.end ?? work.endDate ?? null;
  return { title: work.title ?? "", company, start: work.dates?.start ?? work.startDate ?? null, end, current: !end };
}

export function personFrom(result: ExaResult, query: string, today: string): Found {
  const entity = result.entities?.[0] ?? {};
  const history = (entity.workHistory ?? []).map(toJob);
  const current = history.find((j) => j.current) ?? history[0];
  const url = result.url ?? "";
  const title = result.title ?? "";
  const profile = { id: `exa:${result.id ?? url}`, kind: "profile", url,
    date: (result.publishedDate ?? today).slice(0, 10), text: `Exa people search for "${query}": ${title}` };
  return {
    name: entity.name ?? title.split(" - ")[0].trim(),
    title: current?.title ?? "",
    company: current?.company ?? "",
    linkedin: url.includes("linkedin.com/in/") ? url : "",
    signals: [profile, ...jobChanges(history, today, url, `exa:${result.id ?? url}`)],
  };
}
```

`scripts/discover/papers.ts`:

```ts
import { getJson } from "../maze/http.ts";
import type { Found } from "./types.ts";

type Authorship = { author: { display_name: string }; institutions?: { display_name?: string }[] };
export type Work = { id: string; doi?: string | null; display_name?: string; publication_date?: string; authorships?: Authorship[] };

export async function find(query: string, since: string, limit: number) {
  const params = new URLSearchParams({ search: query, filter: `from_publication_date:${since}`, "per-page": String(limit) });
  if (process.env.OPENALEX_MAILTO) params.set("mailto", process.env.OPENALEX_MAILTO);
  const res = await getJson<{ results?: Work[] }>(`https://api.openalex.org/works?${params}`);
  return (res.results ?? []).flatMap(authorsOf);
}

export function authorsOf(work: Work): Found[] {
  const signal = {
    id: `paper:${work.id.split("/").pop()}`,
    kind: "publishes",
    date: work.publication_date ?? "",
    text: `Published: ${work.display_name ?? ""}`,
    url: work.doi ?? work.id,
  };
  return (work.authorships ?? []).map((a) => ({
    name: a.author.display_name,
    company: a.institutions?.[0]?.display_name ?? "",
    signals: [signal],
  }));
}
```

`scripts/discover/jobs.ts`:

```ts
import { getJson } from "../maze/http.ts";
import type { Signal } from "./types.ts";

export type Posting = { id: string; title: string; url: string; date: string; text: string };

const BOARDS: Record<string, string> = {
  greenhouse: "https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true",
  lever: "https://api.lever.co/v0/postings/{token}?mode=json",
  ashby: "https://api.ashbyhq.com/posting-api/job-board/{token}",
};
const REPORTS_TO = /report(?:s|ing)? (?:directly )?to (?:the |our )?([A-Z][\w&/ -]{2,60}?)[.,;\n]/;

export async function find(board: string, token: string, query: string) {
  if (!BOARDS[board]) throw new Error(`board must be one of ${Object.keys(BOARDS).join(", ")}`);
  const data = await getJson<unknown>(BOARDS[board].replace("{token}", token));
  return postings(board, data).filter((p) => matches(p, query)).map((p) => signalFrom(board, token, p));
}

export function matches(posting: Pick<Posting, "title" | "text">, query: string) {
  const haystack = `${posting.title} ${posting.text}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

type Greenhouse = { jobs: { id: number; title: string; absolute_url: string; updated_at: string; content?: string }[] };
type Lever = { id: string; text: string; hostedUrl: string; createdAt: number; descriptionPlain?: string }[];
type Ashby = { jobs: { id: string; title: string; jobUrl: string; publishedAt: string; descriptionPlain?: string }[] };

export function postings(board: string, data: unknown): Posting[] {
  if (board === "greenhouse") {
    return (data as Greenhouse).jobs.map((j) => ({ id: String(j.id), title: j.title, url: j.absolute_url,
      date: j.updated_at.slice(0, 10), text: plain(j.content ?? "") }));
  }
  if (board === "lever") {
    return (data as Lever).map((j) => ({ id: j.id, title: j.text, url: j.hostedUrl,
      date: new Date(j.createdAt).toISOString().slice(0, 10), text: j.descriptionPlain ?? "" }));
  }
  return (data as Ashby).jobs.map((j) => ({ id: j.id, title: j.title, url: j.jobUrl,
    date: j.publishedAt.slice(0, 10), text: j.descriptionPlain ?? "" }));
}

export function signalFrom(board: string, token: string, posting: Posting): Signal {
  const reports = REPORTS_TO.exec(posting.text);
  const who = reports ? ` (reports to ${reports[1].trim()})` : "";
  return { id: `job:${board}:${token}:${posting.id}`, kind: "hiring", date: posting.date,
    text: `Hiring: ${posting.title}${who}`, url: posting.url };
}

function plain(markup: string) {
  const unescaped = markup.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  return unescaped.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/discover/sources.test.ts`
Expected: 7 passed

- [ ] **Step 6: Add `find` and `signal` to `cli.ts`**

Replace `scripts/discover/cli.ts` with:

```ts
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { addCompanySignals, addPeople, addSignals, create, loadPeople, openBatch, savePeople, today } from "./batch.ts";
import * as exa from "./exa.ts";
import * as jobs from "./jobs.ts";
import * as papers from "./papers.ts";

const KINDS = new Set(["profile", "news", "joined", "role_change", "left", "funding", "hiring",
  "deadline", "competitor_news", "publishes", "speaks"]);

const USAGE = `usage: npm run discover -- <command>

  new <slug> --industry "..." --offer "..."           start outbound/<date>-<slug>/ with an empty brief
  find <batch> --source exa|papers --query "..."      add people [--limit 25] [--since YYYY-MM-DD]
  find <batch> --source jobs --board greenhouse:<token> --company "..." --query "..."
                                                      record matching job posts as company hiring signals
  signal <batch> <p_id|company> --kind ... --text "..." --url ... [--date YYYY-MM-DD]
                                                      record one dated piece of evidence`;

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

const [command, arg, target] = positionals;
if (!arg) fail(USAGE);

try {
  if (command === "new") {
    const dir = create(arg, need("industry"), need("offer"));
    console.log(`created ${dir}\nnext: fill in brief.json — sender, roles with todo_guesses, strategic_companies`);
  } else if (command === "find") await find(arg);
  else if (command === "signal") signal(arg, target ?? fail(USAGE));
  else fail(USAGE);
} catch (error) {
  fail((error as Error).message);
}
```

Run:

```bash
npm run discover -- new smoke --industry test --offer test
B=$(ls outbound)
npm run discover -- find $B --source papers --query "pipeline inspection robot" --limit 5
npm run discover -- find $B --source jobs --board greenhouse:gitlab --company GitLab --query engineer
npm run discover -- signal $B Acme --kind news --text "Acme opened a plant" --url https://example.com/news
rm -r outbound
```

Expected: `N found, N new` (N > 0); `N matching posts recorded for GitLab` with the "no people at GitLab yet" hint; a signal id like `news:1a2b3c4d`.

- [ ] **Step 7: Commit**

```bash
git add scripts/discover tests/discover
git commit -m "Find people through Exa and OpenAlex, hiring signals through job boards, and record evidence"
```

---

### Task 4: Apollo enrichment, with phones on request

**Files:**
- Create: `scripts/discover/enrich.ts`, `tests/discover/enrich.test.ts`
- Modify: `scripts/discover/cli.ts`

**Interfaces:**
- Consumes: `jobChanges`, `addSignals`, `requireKey`, `loadPeople`, `savePeople`, `openBatch`, `today`
- Produces:
  - `enrich.Apollo` = `{ post(path, query): Promise<MatchReply>; get(path): Promise<{ status: number; body: … }> }`; types `ApolloPerson`, `MatchReply`
  - `enrich.apollo(): Apollo`
  - `enrich.enrichAll(people: Person[], phones: boolean, api: Apollo, today: string): Promise<number>`
  - `enrich.applyMatch(person: Person, found: ApolloPerson, today: string): void`
  - `enrich.collectPhones(people: Person[], api: Apollo, sleep?: (ms: number) => Promise<void>, rounds?: number): Promise<void>`
  - CLI: `enrich <batch> [--phones]`

- [ ] **Step 1: Write the failing tests**

`tests/discover/enrich.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyMatch, collectPhones, enrichAll, type Apollo, type MatchReply } from "../../scripts/discover/enrich.ts";
import type { Person } from "../../scripts/discover/types.ts";

const TODAY = "2026-09-28";
const FOUND = {
  id: "ap1",
  email: "ada@beta.com",
  title: "Head of Inspection",
  linkedin_url: "https://linkedin.com/in/ada",
  employment_history: [
    { current: true, start_date: "2026-07-01", end_date: null, organization_name: "Beta", title: "Head of Inspection" },
    { current: false, start_date: "2019-01-01", end_date: "2026-06-01", organization_name: "Acme", title: "Inspection Lead" },
  ],
  organization: { estimated_num_employees: 140, primary_domain: "beta.com", latest_funding_round_date: "2026-05-01", latest_funding_stage: "Series B" },
};

function person(extra: Partial<Person> = {}): Person {
  return { id: "p_1", name: "Ada Obi", title: "", company: "Beta", domain: "", company_size: null, linkedin: "",
    email: "", phone: null, phone_request_id: null, signals: [], tier: null, tier_override: null,
    speed_score: 0, speed_reasons: [], approved: false, ...extra };
}

function fake(post: () => MatchReply, gets: Awaited<ReturnType<Apollo["get"]>>[] = []): Apollo & { posts: number } {
  const api = { posts: 0, async post() { api.posts++; return post(); }, async get() { return gets.shift()!; } };
  return api;
}

describe("enrich", () => {
  it("fills contact and company fields and adds dated signals", () => {
    const p = person();
    applyMatch(p, FOUND, TODAY);
    expect(p).toMatchObject({ email: "ada@beta.com", company_size: 140, domain: "beta.com", title: "Head of Inspection" });
    expect(p.signals.map((s) => s.kind)).toEqual(["joined", "funding"]);
    expect(p.signals[0].text).toBe("Joined Beta as Head of Inspection, from Acme");
  });

  it("leaves a person alone when Apollo finds no match", async () => {
    const people = [person()];
    expect(await enrichAll(people, false, fake(() => ({ person: null })), TODAY)).toBe(0);
    expect(people[0].email).toBe("");
  });

  it("skips people already enriched or without a name", async () => {
    const api = fake(() => ({ person: FOUND }));
    await enrichAll([person({ email: "x@y.com" }), person({ name: "" })], false, api, TODAY);
    expect(api.posts).toBe(0);
  });

  it("polls for phones until Apollo has them", async () => {
    const people = [person({ phone_request_id: "123" })];
    const api = fake(() => ({}), [
      { status: 404, body: { error_code: "result_pending", retry_after_seconds: 1 } },
      { status: 200, body: { webhook_status: "success", webhook_result: { people: [{ phone_numbers: [{ sanitized_number: "+447700900123" }] }] } } },
    ]);
    await collectPhones(people, api, async () => {});
    expect(people[0].phone).toBe("+447700900123");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/discover/enrich.test.ts`
Expected: FAIL — `Cannot find module '../../scripts/discover/enrich.ts'`

- [ ] **Step 3: Write `enrich.ts`**

`scripts/discover/enrich.ts`:

```ts
import { addSignals } from "./batch.ts";
import { jobChanges } from "./changes.ts";
import { requireKey } from "./keys.ts";
import type { Job, Person, Signal } from "./types.ts";

type ApolloJob = { title?: string; organization_name?: string; start_date?: string | null; end_date?: string | null; current?: boolean };
type ApolloOrg = { estimated_num_employees?: number; primary_domain?: string; latest_funding_round_date?: string; latest_funding_stage?: string };
export type ApolloPerson = { id: string; email?: string | null; title?: string | null; linkedin_url?: string | null;
  employment_history?: ApolloJob[]; organization?: ApolloOrg | null };
export type MatchReply = { person?: ApolloPerson | null; request_id?: string | number };
type PollReply = { status: number; body: { error_code?: string; retry_after_seconds?: number } & Record<string, unknown> };

export type Apollo = {
  post(path: string, query: Record<string, string>): Promise<MatchReply>;
  get(path: string): Promise<PollReply>;
};

const BASE = "https://api.apollo.io/api/v1";

export function apollo(): Apollo {
  const headers = { "x-api-key": requireKey("APOLLO_API_KEY"), "content-type": "application/json" };
  return {
    async post(path, query) {
      const res = await fetch(`${BASE}${path}?${new URLSearchParams(query)}`, { method: "POST", headers });
      if (!res.ok) throw new Error(`${res.status} from Apollo ${path}`);
      return res.json();
    },
    async get(path) {
      const res = await fetch(`${BASE}${path}`, { headers });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    },
  };
}

export async function enrichAll(people: Person[], phones: boolean, api: Apollo, today: string) {
  let matched = 0;
  for (const person of people) {
    if (person.email || !person.name) continue;
    const query: Record<string, string> = { name: person.name, organization_name: person.company };
    if (person.domain) query.domain = person.domain;
    if (person.linkedin) query.linkedin_url = person.linkedin;
    if (phones) Object.assign(query, { reveal_phone_number: "true", poll_only: "true" });
    const body = await api.post("/people/match", query);
    if (body.person) {
      applyMatch(person, body.person, today);
      matched++;
    }
    if (phones && body.request_id) person.phone_request_id = String(body.request_id);
  }
  if (phones) await collectPhones(people, api);
  return matched;
}

export function applyMatch(person: Person, found: ApolloPerson, today: string) {
  const org: ApolloOrg = found.organization ?? {};
  person.email = found.email ?? person.email;
  person.title ||= found.title ?? "";
  person.linkedin ||= found.linkedin_url ?? "";
  person.company_size = org.estimated_num_employees ?? person.company_size;
  person.domain = org.primary_domain ?? person.domain;
  const url = person.linkedin || `https://app.apollo.io/#/people/${found.id}`;
  const history: Job[] = (found.employment_history ?? []).map((j) => ({ title: j.title ?? "",
    company: j.organization_name ?? "", start: j.start_date ?? null, end: j.end_date ?? null, current: Boolean(j.current) }));
  const signals: Signal[] = jobChanges(history, today, url, `apollo:${found.id}`);
  if (org.latest_funding_round_date) {
    signals.push({ id: `apollo:${found.id}:funding`, kind: "funding", date: org.latest_funding_round_date, url,
      text: `${person.company} raised a ${org.latest_funding_stage ?? "funding"} round` });
  }
  addSignals(person, signals);
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function collectPhones(people: Person[], api: Apollo, sleep = wait, rounds = 6) {
  let pending = people.filter((p) => p.phone_request_id && !p.phone);
  for (let round = 0; round < rounds && pending.length; round++) {
    const waiting: Person[] = [];
    let seconds = 10;
    for (const person of pending) {
      const { status, body } = await api.get(`/webhook_result/${person.phone_request_id}`);
      if (status === 404 && body.error_code === "result_pending") {
        waiting.push(person);
        seconds = body.retry_after_seconds ?? 10;
      } else if (status === 200) person.phone = firstPhone(body);
    }
    pending = waiting;
    if (pending.length) await sleep(seconds * 1000);
  }
}

function firstPhone(data: unknown): string | null {
  if (Array.isArray(data)) return data.map(firstPhone).find(Boolean) ?? null;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.sanitized_number === "string") return record.sanitized_number;
    return firstPhone(Object.values(record));
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/discover/enrich.test.ts`
Expected: 4 passed

- [ ] **Step 5: Add `enrich` to `cli.ts`**

Add the import, a `phones` option, a usage line and a branch:

```ts
import { apollo, enrichAll } from "./enrich.ts";
```

```ts
    phones: { type: "boolean", default: false },
```

```text
  enrich <batch> [--phones]                           email, company size, job changes, funding from Apollo
```

```ts
async function enrich(name: string) {
  const dir = openBatch(name);
  const people = loadPeople(dir);
  const matched = await enrichAll(people, Boolean(values.phones), apollo(), today());
  savePeople(dir, people);
  console.log(`${matched} matched in Apollo, ${people.filter((p) => p.phone).length} with phones`);
}
```

```ts
  else if (command === "enrich") await enrich(arg);
```

Run: `APOLLO_API_KEY= npm run discover -- enrich anything`
Expected: `no batch called anything; run new first` (exit 2). The live call waits for Task 8.

- [ ] **Step 6: Commit**

```bash
git add scripts/discover tests/discover
git commit -m "Enrich people through Apollo, including job changes and phones on request"
```

---

### Task 5: Tiers, speed score, `rank` and `status`

**Files:**
- Create: `scripts/discover/rank.ts`, `tests/discover/rank.test.ts`
- Modify: `scripts/discover/cli.ts`

**Interfaces:**
- Consumes: `daysBetween`, `signalsFor`, `readJson`, `loadPeople`, `savePeople`, `openBatch`, `today`
- Produces:
  - `rank.TIERS: Tier[]`
  - `rank.tierFor(person: Person, strategic: string[]): Tier`
  - `rank.speedFor(person: Person, signals: Signal[], today: string): { score: number; reasons: string[] }`
  - `rank.rankAll(people: Person[], companies: Record<string, Company>, strategic: string[], today: string): Person[]`
  - `rank.openSeats(people: Person[]): string[]`
  - CLI: `rank <batch>`, `status <batch>`

- [ ] **Step 1: Write the failing tests**

`tests/discover/rank.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { openSeats, rankAll, speedFor, tierFor } from "../../scripts/discover/rank.ts";
import type { Person, Signal } from "../../scripts/discover/types.ts";

const TODAY = "2026-09-28";

function person(extra: Partial<Person> = {}): Person {
  return { id: "p", name: "A", title: "Engineer", company: "Acme", domain: "", company_size: null, linkedin: "",
    email: "", phone: null, phone_request_id: null, signals: [], tier: null, tier_override: null,
    speed_score: 0, speed_reasons: [], approved: false, ...extra };
}
const sig = (kind: string, date: string, company?: string): Signal => ({ id: kind + date, kind, date, text: kind, url: "u", company });

describe("rank", () => {
  it("sets tiers by company size", () => {
    const tier = (size: number | null) => tierFor(person({ company_size: size }), []);
    expect([tier(8), tier(50), tier(51), tier(5000), tier(5001), tier(null)])
      .toEqual(["mouse", "rabbit", "deer", "elephant", "whale", "deer"]);
  });

  it("puts strategic companies at whale and respects an override", () => {
    expect(tierFor(person({ company_size: 8 }), ["ACME"])).toBe("whale");
    expect(tierFor(person({ company_size: 8, tier_override: "elephant" }), [])).toBe("elephant");
  });

  it("counts each kind once, inside its window", () => {
    const signals = [sig("joined", "2026-07-01"), sig("hiring", "2025-01-01"), sig("hiring", "2026-09-01"),
      sig("funding", "2025-01-01"), sig("deadline", "2026-10-20"), sig("publishes", "2026-06-01")];
    const { score, reasons } = speedFor(person({ title: "Founder & CEO" }), signals, TODAY);
    expect(score).toBe(3 + 2 + 2 + 1 + 2);
    expect(reasons).toContain("founder or owner buys");
    expect(reasons.some((r) => r.startsWith("funding"))).toBe(false);
  });

  it("ignores a deadline that has passed", () => {
    expect(speedFor(person(), [sig("deadline", "2026-09-01")], TODAY).score).toBe(0);
  });

  it("orders by tier, then speed", () => {
    const ordered = rankAll([person({ name: "whale", company_size: 9000 }), person({ name: "slow mouse", company_size: 5 }),
      person({ name: "fast mouse", company_size: 5, signals: [sig("joined", "2026-09-01")] })], {}, [], TODAY);
    expect(ordered.map((p) => p.name)).toEqual(["fast mouse", "slow mouse", "whale"]);
  });

  it("lists seats that just opened", () => {
    const moved = person({ name: "Ada", signals: [sig("joined", "2026-09-01", "Acme"), sig("left", "2026-08-01", "Gamma")] });
    expect(openSeats([moved, person()])).toEqual(["Acme (Ada moved on)", "Gamma (Ada moved on)"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/discover/rank.test.ts`
Expected: FAIL — `Cannot find module '../../scripts/discover/rank.ts'`

- [ ] **Step 3: Write `rank.ts`**

`scripts/discover/rank.ts`:

```ts
import { signalsFor } from "./batch.ts";
import { daysBetween } from "./dates.ts";
import type { Company, Person, Signal, Tier } from "./types.ts";

export const TIERS: Tier[] = ["mouse", "rabbit", "deer", "elephant", "whale"];

const SIZE_LIMITS: [number, Tier][] = [[10, "mouse"], [50, "rabbit"], [500, "deer"], [5000, "elephant"]];

const WEIGHTS: Record<string, [points: number, days: number | null]> = {
  joined: [3, 90],
  role_change: [2, 90],
  left: [2, 90],
  funding: [3, 180],
  hiring: [2, null],
  deadline: [2, 60],
  competitor_news: [1, 90],
  publishes: [1, 180],
  speaks: [1, 180],
};

const BUYER_WORDS = ["founder", "owner", "ceo", "chief executive", "managing director", "president"];

export function tierFor(person: Person, strategic: string[]): Tier {
  if (person.tier_override) return person.tier_override;
  if (strategic.some((s) => s.trim().toLowerCase() === person.company.trim().toLowerCase())) return "whale";
  if (!person.company_size) return "deer";
  return SIZE_LIMITS.find(([limit]) => person.company_size! <= limit)?.[1] ?? "whale";
}

function inWindow(signal: Signal, days: number | null, today: string) {
  if (days === null) return true;
  const elapsed = signal.kind === "deadline" ? daysBetween(today, signal.date) : daysBetween(signal.date, today);
  return elapsed !== null && elapsed >= 0 && elapsed <= days;
}

export function speedFor(person: Person, signals: Signal[], today: string) {
  let score = 0;
  const reasons: string[] = [];
  for (const [kind, [points, days]] of Object.entries(WEIGHTS)) {
    const hit = signals.find((s) => s.kind === kind && inWindow(s, days, today));
    if (!hit) continue;
    score += points;
    reasons.push(`${kind.replace("_", " ")}: ${hit.text}`);
  }
  if (BUYER_WORDS.some((word) => person.title.toLowerCase().includes(word))) {
    score += 2;
    reasons.push("founder or owner buys");
  }
  return { score, reasons };
}

export function rankAll(people: Person[], companies: Record<string, Company>, strategic: string[], today: string) {
  for (const person of people) {
    person.tier = tierFor(person, strategic);
    const { score, reasons } = speedFor(person, signalsFor(companies, person), today);
    person.speed_score = score;
    person.speed_reasons = reasons;
  }
  return [...people].sort((a, b) => TIERS.indexOf(a.tier!) - TIERS.indexOf(b.tier!) || b.speed_score - a.speed_score);
}

export function openSeats(people: Person[]) {
  return people.flatMap((p) => p.signals
    .filter((s) => (s.kind === "joined" || s.kind === "left") && s.company)
    .map((s) => `${s.company} (${p.name} moved on)`));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/discover/rank.test.ts`
Expected: 6 passed

- [ ] **Step 5: Add `rank` and `status` to `cli.ts`**

```ts
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { openSeats, rankAll, TIERS } from "./rank.ts";
import type { Brief, Company } from "./types.ts";
```

(add `readJson` to the `./batch.ts` import)

```text
  rank <batch>                                        set tiers and speed scores; print the send order
  status <batch>                                      counts per step and tier; seats that just opened
```

```ts
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
```

```ts
  else if (command === "rank") rank(arg);
  else if (command === "status") status(arg);
```

Run:

```bash
npm run discover -- new smoke --industry test --offer test && B=$(ls outbound)
npm run discover -- find $B --source papers --query "pipeline inspection robot" --limit 5
npm run discover -- rank $B && npm run discover -- status $B
rm -r outbound
```

Expected: everyone listed as `deer` (no company size yet) with score 1 for a recent paper; status shows the deer count.

- [ ] **Step 6: Commit**

```bash
git add scripts/discover tests/discover
git commit -m "Rank people into tiers and by how fast they are likely to move"
```

---

### Task 6: Note checks and `draft`

**Files:**
- Create: `scripts/discover/checks.ts`, `scripts/discover/draft.ts`, `tests/discover/draft.test.ts`
- Modify: `scripts/discover/cli.ts`

**Interfaces:**
- Consumes: `signalsFor`, `readJson`, `loadPeople`, `openBatch`; `pamphlets/<name>/pamphlet.pdf` from `npm run pamphlet`
- Produces:
  - `checks.PARTS`, `checks.partText(note: Note, part: string): string`
  - `checks.checkNote(note: Note, person: Person, signals: Signal[], gifts: { pamphlets: string; out: string }): string[]`
  - `draft.PAMPHLETS: string`
  - `draft.draftAll(dir: string, pamphlets?: string): Record<string, string[]>` (person id → problems)
  - `draft.composeEmail(note: Note, person: Person, brief: Brief, pamphlets: string): string`
  - CLI: `draft <batch>` (exit 2 when any note fails)

- [ ] **Step 1: Write the failing tests**

`tests/discover/draft.test.ts`:

```ts
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { addPeople, create, loadPeople, readJson, writeJson } from "../../scripts/discover/batch.ts";
import { checkNote } from "../../scripts/discover/checks.ts";
import { draftAll } from "../../scripts/discover/draft.ts";
import type { Brief, Note, Person, Signal } from "../../scripts/discover/types.ts";

const SIGNALS: Signal[] = [{ id: "profile:1", kind: "profile", date: "2026-09-01", text: "t", url: "u" }];

const GOOD: Note = {
  todo_guess: "Keep the founding team together through discovery",
  subject: "A guide for the early days",
  seen: { text: "Co-founder breakups getting to you? And I'm sure customer discovery and its demands are getting very tough.", evidence: ["profile:1"] },
  gift: { text: "I created a guide for founders in the very early stages that helps them introspect and manage these challenges better, here's the link.", link: "https://example.com/guide" },
  why_me: "I want you to win and I think this would really give you a leg up. I've been working with founders going through this.",
  ask: "Feel free to book a 20 minute conversation if you'd like to talk face to face about these.",
  order: ["seen", "gift", "why_me", "ask"],
  linkedin: "Co-founder breakups getting to you? I made a short guide for early founders on handling it: https://example.com/guide",
};

const BAD: Note = {
  ...GOOD,
  seen: { text: "Saw you just joined EF.", evidence: ["profile:1"] },
  gift: { text: "I'm a psychiatric clinician specializing in founder mental health.", link: "https://example.com" },
  why_me: "I've helped X amount of founders go through the tough founding process.",
  ask: "Are you open to a 20 minute conversation?",
};

const base = () => mkdtempSync(join(tmpdir(), "discover-"));
const mouse = { tier: "mouse" } as Person;
const check = (note: Note, person = mouse, gifts = { pamphlets: base(), out: base() }) => checkNote(note, person, SIGNALS, gifts);

describe("checkNote", () => {
  it("passes the value-first message", () => expect(check(GOOD)).toEqual([]));

  it("fails the pitch-first message on its phrases", () => {
    expect(check(BAD)).toEqual(expect.arrayContaining(["banned phrase: \"i'm a\"", "banned phrase: \"i've helped\"", "banned phrase: \"are you open to\""]));
  });

  it("lets seen and gift swap, but keeps why-me after the gift and the ask last", () => {
    expect(check({ ...GOOD, order: ["gift", "seen", "why_me", "ask"] })).toEqual([]);
    expect(check({ ...GOOD, order: ["seen", "gift", "ask", "why_me"] })).toContain("the ask must come last");
    expect(check({ ...GOOD, order: ["seen", "why_me", "gift", "ask"] })).toContain("why_me must come after the gift");
  });

  it("needs recorded evidence", () => {
    expect(check({ ...GOOD, seen: { text: "x", evidence: ["made:up"] } })).toContain("unknown evidence id: made:up");
    expect(check({ ...GOOD, seen: { text: "x", evidence: [] } })[0]).toMatch(/no evidence/);
  });

  it("needs the gift to exist", () => {
    const gifts = { pamphlets: base(), out: base() };
    const note = { ...GOOD, gift: { text: "Made for you.", pamphlet: "acme" } };
    expect(check(note, mouse, gifts)[0]).toMatch(/pamphlet .* not built/);
    mkdirSync(join(gifts.pamphlets, "acme"));
    writeFileSync(join(gifts.pamphlets, "acme", "pamphlet.pdf"), "%PDF");
    expect(check(note, mouse, gifts)).toEqual([]);
    expect(check({ ...GOOD, gift: { text: "x" } })).toContain("gift needs a pamphlet, file or link");
  });

  it("limits length by tier", () => {
    const long = { ...GOOD, ask: "word ".repeat(60) };
    expect(check(long).some((p) => p.includes("limit is 90"))).toBe(true);
    expect(check(long, { tier: "elephant" } as Person)).toEqual([]);
    expect(check({ ...GOOD, linkedin: "x".repeat(301) }).some((p) => p.includes("LinkedIn"))).toBe(true);
  });
});

describe("draftAll", () => {
  function batch() {
    const dir = create("x", "Any", "Any", base());
    const brief = readJson<Brief>(join(dir, "brief.json"));
    writeJson(join(dir, "brief.json"), { ...brief, sender: { name: "Kosi", company: "Example Co", why_me: "" } });
    addPeople(dir, [
      { name: "Ada Obi", company: "Acme", tier: "mouse", signals: SIGNALS },
      { name: "Ben Ade", company: "Beta", tier: "mouse", signals: SIGNALS },
    ]);
    return { dir, ids: loadPeople(dir).map((p) => p.id) };
  }

  it("drafts a good note and reports a broken one", () => {
    const { dir, ids: [ada, ben] } = batch();
    writeFileSync(join(dir, "notes", `${ada}.json`), JSON.stringify(GOOD));
    writeFileSync(join(dir, "notes", `${ben}.json`), "{not json");
    const failures = draftAll(dir, base());
    expect(Object.keys(failures)).toEqual([ben]);
    expect(failures[ben][0]).toMatch(/not valid JSON/);
    const email = readFileSync(join(dir, "out", ada, "email.md"), "utf8");
    expect(email.startsWith("Subject: A guide for the early days\n\nHi Ada,")).toBe(true);
    expect(email.indexOf("Co-founder")).toBeLessThan(email.indexOf("20 minute"));
    expect(email.trimEnd().endsWith("Kosi")).toBe(true);
    expect(readFileSync(join(dir, "out", ada, "linkedin.md"), "utf8")).toMatch(/^Co-founder/);
  });

  it("reports a note for someone not in the batch", () => {
    const { dir } = batch();
    writeFileSync(join(dir, "notes", "p_missing.json"), JSON.stringify(GOOD));
    expect(draftAll(dir, base())).toEqual({ p_missing: ["no person with id p_missing"] });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/discover/draft.test.ts`
Expected: FAIL — `Cannot find module '../../scripts/discover/checks.ts'`

- [ ] **Step 3: Write `checks.ts`**

`scripts/discover/checks.ts`:

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Note, Person, Signal } from "./types.ts";

export const PARTS = ["seen", "gift", "why_me", "ask"] as const;
const REQUIRED = ["subject", "seen", "gift", "why_me", "ask", "order", "linkedin"] as const;
const BANNED = ["i'm a", "i am a", "i've helped", "i have helped", "are you open to", "quick call", "hope this finds you"];
const WORD_LIMITS: Record<string, number> = { mouse: 90, rabbit: 90, deer: 120, elephant: 150, whale: 150 };
const LINKEDIN_LIMIT = 300;

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
  if (pamphlet) {
    const pdf = join(gifts.pamphlets, pamphlet, "pamphlet.pdf");
    return existsSync(pdf) ? [] : [`pamphlet ${pamphlet} is not built; run npm run pamphlet -- build ${pamphlet}`];
  }
  if (file) return existsSync(join(gifts.out, file)) ? [] : [`gift file ${join(gifts.out, file)} does not exist`];
  return link ? [] : ["gift needs a pamphlet, file or link"];
}
```

- [ ] **Step 4: Write `draft.ts`**

`scripts/discover/draft.ts`:

```ts
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadPeople, readJson, signalsFor } from "./batch.ts";
import { checkNote, partText } from "./checks.ts";
import type { Brief, Company, Note, Person } from "./types.ts";

export const PAMPHLETS = join(import.meta.dirname, "../../pamphlets");

export function draftAll(dir: string, pamphlets = PAMPHLETS) {
  const brief = readJson<Brief>(join(dir, "brief.json"));
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
  let note: Note;
  try {
    note = JSON.parse(readFileSync(join(dir, "notes", `${id}.json`), "utf8"));
  } catch (error) {
    return [`notes/${id}.json is not valid JSON: ${(error as Error).message}`];
  }
  const out = join(dir, "out", id);
  const problems = checkNote(note, person, signalsFor(companies, person), { pamphlets, out });
  if (problems.length) return problems;
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "email.md"), composeEmail(note, person, brief, pamphlets));
  writeFileSync(join(out, "linkedin.md"), note.linkedin.trim() + "\n");
  return [];
}

export function composeEmail(note: Note, person: Person, brief: Brief, pamphlets: string) {
  const first = person.name.split(" ")[0] || "there";
  const attach = note.gift.pamphlet ? `Attach: ${join(pamphlets, note.gift.pamphlet, "pamphlet.pdf")}\n`
    : note.gift.file ? `Attach: ${note.gift.file}\n` : "";
  const body = note.order.map((part) => partText(note, part)).join("\n\n");
  return `Subject: ${note.subject}\n${attach}\nHi ${first},\n\n${body}\n\n${brief.sender.name}\n`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/discover/draft.test.ts`
Expected: 8 passed

- [ ] **Step 6: Add `draft` to `cli.ts`**

```ts
import { draftAll } from "./draft.ts";
```

```text
  draft <batch>                                       check every note; write out/<id>/email.md and linkedin.md
```

```ts
function draft(name: string) {
  const dir = openBatch(name);
  const failures = draftAll(dir);
  const notes = readdirSync(join(dir, "notes")).filter((f) => f.endsWith(".json")).length;
  console.log(`${notes - Object.keys(failures).length} of ${notes} drafted into ${join(dir, "out")}`);
  const report = Object.entries(failures).map(([id, problems]) => `\n${id}:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  if (report.length) fail(report.join("\n"));
}
```

```ts
  else if (command === "draft") draft(arg);
```

Run: `npx vitest run tests/discover && npx tsc --noEmit && wc -l scripts/discover/*.ts`
Expected: all discover tests pass, no type errors, every file under 250 lines.

- [ ] **Step 7: Commit**

```bash
git add scripts/discover tests/discover
git commit -m "Check every note is value-first and grounded, then write the email and LinkedIn drafts"
```

---

### Task 7: The two local skills

**Files:**
- Create: `.claude/skills/customer-discovery-outbound/SKILL.md`, `.claude/skills/outreach-writing/SKILL.md`, `scripts/discover/README.md`

**Interfaces:**
- Consumes: every command and the note format from Tasks 1–6; `customer-pamphlet`, `customer-video` and `idea-maze` skills.

- [ ] **Step 1: Write `customer-discovery-outbound`**

`.claude/skills/customer-discovery-outbound/SKILL.md`:

````markdown
---
name: customer-discovery-outbound
description: Use when finding people to talk to for customer discovery, running outbound, or building a prospect batch for any industry — finds non-obvious people, reads job changes and hiring signals, ranks by tier and speed, and prepares value-first drafts with a pamphlet as the gift, for a human to approve.
---

# Customer discovery outbound

All commands: `npm run discover -- <command>` from the repo root. Batches live in `outbound/`, which is never committed.
If the bet or the target roles are not settled yet, use the `idea-maze` skill first.

## Order

1. `new <slug> --industry "…" --offer "…"`, then fill `brief.json`: `sender` (name, company, one-line why_me),
   `roles` (each with 2–3 `todo_guesses` for this quarter), `strategic_companies` (whales).
2. Find people. Look past the obvious — use at least two:
   - `find <batch> --source exa --query "<role> at <kind of company> <context>"` — vary the context: a recent move, a tool they use, a region.
   - `find <batch> --source papers --query "<problem>"` — authors and co-authors working on it.
   - `find <batch> --source jobs --board greenhouse:<token> --company "<name>" --query "<problem words>"` — who is hiring for it and who the hire reports to; then find that person with Exa.
   - Your own search tools for news, talks, deadlines, funding: record each with
     `signal <batch> <person id or company> --kind … --text … --url … --date …`.
3. `enrich <batch>` — adds email, company size, job changes and funding. Add `--phones` only for deer and above (8 Apollo credits each).
4. `rank <batch>` — read the send order. `status <batch>` lists seats that just opened: find who replaced each person, since they inherit the problem.
5. For each person in send order: write `notes/<id>.json` with the **outreach-writing** skill, and make the gift with the **customer-pamphlet** skill.
6. `draft <batch>`. Fix every problem it lists by rewriting the note or building the gift — never by editing the checks. Repeat until it exits 0.
7. `status <batch>`, then hand the batch to the human.

## Job changes are the strongest signal

| Signal | What it means for them |
|---|---|
| joined (≤ 90 days) | Setting their first-quarter plan, with budget and a need for an early win |
| role change | Just took ownership of the problem |
| left | Two leads: they may bring the problem to their next company, and whoever replaced them inherits it |

## Tiers — how much we can get wrong

| Tier | Company size | You | Human |
|---|---|---|---|
| mouse | 1–10 | write and draft | spot-check |
| rabbit | 11–50 | write and draft | skim each |
| deer | 51–500 | write carefully; phones if useful | read each |
| elephant | 501–5,000 | draft | rewrite each |
| whale | 5,000+ or strategic | draft only | writes and sends it, ideally through a warm intro |

Start every new industry with mice. Carry the opening lines and gifts that earned replies up the tiers; a whale only gets a message shape that already worked lower down.

## Speed first

Prefer people who will move fast: just joined or promoted, recently funded, hiring for the problem, facing a deadline, founder-led. A slow whale can wait a quarter.

## Never

- Send anything. Nothing leaves without `approved: true` set by a human, and whales are never sent by a tool.
- Read or message LinkedIn automatically. LinkedIn notes are drafts a human pastes.
- Invent evidence. Record a signal with its real URL before citing it.
- Commit anything under `outbound/` or `pamphlets/`.
````

- [ ] **Step 2: Write `outreach-writing`**

`.claude/skills/outreach-writing/SKILL.md`:

````markdown
---
name: outreach-writing
description: Use when drafting a first message to a prospect — cold email, LinkedIn note, or a discover note — so it is value-first (seen, gift, why me, ask), grounded in recorded signals, and gives them something useful before asking for 20 minutes.
---

# Value-first outreach

A first message passes three tests:

1. **They feel seen.** It names a problem they likely have right now, from a real signal.
2. **They get value before we ask for anything.** The gift arrives in this message.
3. **They know what the call is about.** The ask names the topic.

## Before and after

Pitch-first — fails all three:

> Hey Kosi, saw you just joined EF, I'm a psychiatric clinician specializing in founder mental health, I've helped X amount of founders go through the tough founding process, are you open to a 20 minute conversation?

Value-first:

> Hey Kosi, co-founder breakups getting to you? And I'm sure customer discovery and its demands are getting very tough. I created a guide for founders in the very early stages that helps them introspect and manage these challenges better, here's the link. I want you to win and I think this would really give you a leg up. I've been working with founders going through this — feel free to book a 20 minute conversation if you'd like to talk face to face about these.

## The four parts

| Part | Rule |
|---|---|
| `seen` | Their likely problem now. A question unless the signal states it outright. Cite signal ids in `evidence`. |
| `gift` | What they get today and why it helps. No ask here. |
| `why_me` | One line of credibility, after the gift. |
| `ask` | Last. 20 minutes, naming what you will cover. Easy to say no to. |

`seen` and `gift` can swap: lead with the gift when it stands on its own.

## From signal to "seen"

| Signal | Seen, as a question |
|---|---|
| joined, from Acme | "First quarter at Beta — is the <problem> you had at Acme showing up here too?" |
| role change | "New seat, same building — is <problem> yours now?" |
| left | "Now that you're out of Acme, is <problem> still something you think about?" |
| hiring, reports to them | "Hiring a <role> while <problem> is still on your plate?" |
| competitor news | "Did <competitor>'s <move> change the timeline on your side?" |
| deadline | "<Deadline> is <n> weeks out — is <problem> on the list before then?" |
| paper or talk | "Your <paper/talk> on <topic> stopped at <point> — did <next step> happen?" |

## Choosing the gift

1. Write `todo_guess`: the one item most likely on their list this quarter, from their role, signals and `brief.roles[].todo_guesses`. Specific: "pick between two vendors before the October budget freeze", not "improve operations".
2. Pick the one research task that removes or shortens that item: what peers did, what it cost, what failed, who supplies what.
3. Make it with the **customer-pamphlet** skill, then set `"gift": {"text": "…", "pamphlet": "<name>"}`.
4. Sometimes a short film says it better: make it with the **customer-video** skill — a made-up character in their role living the problem, in their brand. Never their own face, name or likeness. Save it as `out/<id>/film.mp4` and set `"file": "film.mp4"`.
5. When a public page already answers their question, use `"link"` and say what to look at first.

Quality bar: would they forward it to a colleague if it came from someone they already trust?

## Never open with

"I'm a…", "I've helped…", "Are you open to…", "Quick call", "Hope this finds you well". `draft` rejects them.

## Length

Mouse and rabbit: 90 words across the four parts. Deer: 120. Elephant and whale: 150. LinkedIn note: 300 characters, the seen question and the gift only.

## Note format

```json
{
  "todo_guess": "…",
  "subject": "Names the gift, not us",
  "seen":   {"text": "…", "evidence": ["<signal id>"]},
  "gift":   {"text": "…", "pamphlet": "<pamphlets/ folder name>"},
  "why_me": "…",
  "ask":    "…",
  "order":  ["seen", "gift", "why_me", "ask"],
  "linkedin": "…"
}
```
````

- [ ] **Step 3: Write `scripts/discover/README.md`**

```markdown
# discover

Customer-discovery outbound for agents: find non-obvious people, read job changes and hiring
signals, rank by tier and speed, and draft a value-first email and LinkedIn note whose gift is a
pamphlet made for them. The agent writes; the script fetches, scores and checks. Nothing is sent.

`outbound/` is git-ignored: the repo is public and batches hold prospect data.

    npm run discover -- new <slug> --industry "..." --offer "..."
    npm run discover -- find <batch> --source exa|papers|jobs ...
    npm run discover -- enrich <batch> [--phones]
    npm run discover -- rank <batch>
    npm run discover -- draft <batch>

Keys in `.env.local`: `EXA_API_KEY`, `APOLLO_API_KEY` (master key), optional `OPENALEX_MAILTO`.
The workflow is in `.claude/skills/customer-discovery-outbound/SKILL.md`.
```

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/customer-discovery-outbound .claude/skills/outreach-writing scripts/discover/README.md
git commit -m "Add skills for running discovery batches and writing value-first outreach"
```

---

### Task 8: One live batch end to end, then the PR

- [ ] **Step 1: Keys**

Run: `grep -c -E "^(EXA|APOLLO)_API_KEY=." .env.local`
Expected: `2`. If not, stop and ask the human for the keys.

- [ ] **Step 2: Run a five-person batch**

Follow the **customer-discovery-outbound** skill for five people in an industry the human names, using at least two sources, with one pamphlet built through the **customer-pamphlet** skill. Then:

```bash
npm run discover -- status <batch>
npm run discover -- draft <batch>; echo "exit $?"
```

Expected: five people with tiers and scores, at least one job-change signal, `exit 0`, and `email.md` naming the pamphlet to attach.

- [ ] **Step 3: Confirm the parsers against live responses**

If Exa or Apollo return names, companies, work-history dates or emails in a different place than `exa.personFrom` or `enrich.applyMatch` expect (empty fields across the batch, or no job changes where profiles clearly show them), save one response with personal fields replaced by placeholders into `tests/discover/fixtures/`, fix the parser and its test, and rerun `npx vitest run tests/discover`.

- [ ] **Step 4: Full check, push, PR**

```bash
npm test && npx tsc --noEmit && npm run lint
git push -u origin customer-discovery-tools
gh pr create --base main --title "Customer discovery outbound for agents" --body-file /tmp/discover-pr.md
```

The PR body carries the session's Decisions, Feedback and Changes, one ASCII diagram of the command flow, the `draft` output rejecting the pitch-first message and accepting the value-first one, and the `status` output from the live batch with names removed.
