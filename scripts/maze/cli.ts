import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { parseArgs } from "node:util";
import { addCrumb, addHypothesis } from "./add.ts";
import { checkMaze, type Hypothesis, type Maze } from "./check.ts";
import { events } from "./events.ts";
import { market } from "./market.ts";
import { table } from "./markdown.ts";
import { papers } from "./papers.ts";
import { fromClaudeAi, fromClaudeCode, fromText, toNote, type Transcript } from "./transcript.ts";

const MAZES = join(import.meta.dirname, "../../mazes");
const DAY = 86_400_000;

const USAGE = `usage: npm run maze -- <command>

  add <maze> "<belief>" --wrong-if "..." --do "..."   hypothesis to action in one step
      [--id short-name] [--method "..."] [--bet inbox] [--by YYYY-MM-DD] [--type desirability]
  crumb <maze> "<what we give>" --for "<who>" [--tests <hypothesis-id>] [--bet inbox] [--by YYYY-MM-DD]
                                  something useful the buyer gets free today; their reaction is evidence
  check <maze>                    what to do now, then everything that blocks a test
  import <maze> <file> [--match "title words"] [--title "..."]
                                  transcript into notes/: Wispr Flow or any .txt/.md,
                                  claude.ai export conversations.json, Claude Code .jsonl
  new <maze> --thesis "..."       create mazes/<maze>/maze.json (add does this for you)
  events "<topic>" [--days 60]    in-person London events from Meetup, Luma and confs.tech
  market "<query>" [--sic 62012,...]  UK buyer counts, public contracts, research funding, HN attention
  papers "<query>"                paper counts per year and the most relevant recent papers`;

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

function date(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
}

function mazeFile(name: string) {
  return join(MAZES, name, "maze.json");
}

function create(name: string, thesis: string) {
  const dir = join(MAZES, name);
  if (existsSync(dir)) fail(`mazes/${name} already exists`);
  cpSync(join(import.meta.dirname, "template"), dir, { recursive: true });
  mkdirSync(join(dir, "notes"));
  save(name, { ...load(name), thesis });
  console.log(`created mazes/${name}/maze.json`);
}

function load(name: string): Maze {
  if (!existsSync(mazeFile(name))) fail(`no mazes/${name}/maze.json; run add or new first`);
  return JSON.parse(readFileSync(mazeFile(name), "utf8"));
}

function save(name: string, maze: Maze) {
  writeFileSync(mazeFile(name), JSON.stringify(maze, null, 2) + "\n");
}

function report(maze: Maze, showGaps = true) {
  const { blocking, gaps, next, crumbs, summary } = checkMaze(maze, date());
  const now = next[0];
  console.log(
    now
      ? `Do now: ${now.action}\n  due ${now.due}${now.overdue ? " (OVERDUE)" : ""}; tests ${now.bet}/${now.hypothesis}, risk ${now.risk}\n  wrong if ${now.wrongIf}, by ${now.deadline}\n`
      : "Do now: nothing open. Add a hypothesis with `maze add`.\n",
  );
  const rows = next.slice(1).map((n) => [n.risk, n.bet, n.hypothesis, n.action, n.overdue ? `${n.due} OVERDUE` : n.due]);
  if (rows.length) console.log(`# Then\n\n${table(["Risk", "Bet", "Hypothesis", "Action", "Due"], rows)}`);
  const crumbRows = crumbs.map((c) => [c.status === "given" ? "given: note their reaction" : c.overdue ? `${c.due} OVERDUE` : c.due, c.give, c.for, c.bet, c.tests ?? ""]);
  if (crumbRows.length) console.log(`# Crumbs of value\n\n${table(["Due", "Give", "For", "Bet", "Tests"], crumbRows)}`);
  const betRows = summary.map((b) => [b.parked ? `${b.bet} (parked)` : b.bet, b.open, b.survived, b.killed, b.topRisk]);
  if (betRows.length > 1) console.log(`# Bets\n\n${table(["Bet", "Open", "Survived", "Killed", "Top risk"], betRows)}`);
  if (gaps.length && showGaps) console.log(`# Planning gaps (fill after acting)\n\n${gaps.map((g) => `- ${g}`).join("\n")}\n`);
  else if (gaps.length) console.log(`${gaps.length} planning gaps; \`check\` lists them.\n`);
  if (blocking.length) fail(`# Blocking: fix before testing\n\n${blocking.map((p) => `- ${p}`).join("\n")}`);
}

function add(name: string, belief: string, v: Record<string, string | undefined>) {
  if (!existsSync(mazeFile(name))) create(name, "");
  const maze = load(name);
  const h = addHypothesis(maze, {
    id: v.id,
    belief,
    wrongIf: v["wrong-if"] ?? fail('--wrong-if is required: "fewer than <n> of <sample> <did what>"'),
    action: v.do ?? fail("--do is required: the first thing to do today to test it"),
    bet: v.bet ?? "inbox",
    type: (v.type ?? "desirability") as Hypothesis["type"],
    method: v.method ?? "customer conversations",
    deadline: v.by ?? date(14),
    today: date(),
  });
  save(name, maze);
  console.log(`added ${h.id}\n`);
  report(maze, false);
}

function crumb(name: string, give: string, v: Record<string, string | undefined>) {
  if (!existsSync(mazeFile(name))) create(name, "");
  const maze = load(name);
  const forWho = v.for ?? fail('--for is required: the named person or group who gets it, e.g. "Sarah at Northside Clinic"');
  addCrumb(maze, v.bet ?? "inbox", { give, for: forWho, tests: v.tests, due: v.by ?? date() });
  save(name, maze);
  console.log(`added crumb for ${forWho}\n`);
  report(maze, false);
}

function readTranscript(file: string, v: Record<string, string | undefined>): Transcript {
  if (!existsSync(file)) fail(`no file at ${file}`);
  const text = readFileSync(file, "utf8");
  const ext = extname(file).toLowerCase();
  if (ext === ".jsonl") return fromClaudeCode(text);
  if (ext === ".json") return fromClaudeAi(text, v.match);
  return fromText(text, v.title ?? basename(file, ext), statSync(file).mtime.toISOString().slice(0, 10));
}

function importTranscript(name: string, file: string, v: Record<string, string | undefined>) {
  if (!existsSync(mazeFile(name))) create(name, "");
  let transcript: Transcript;
  try {
    transcript = { ...readTranscript(file, v), ...(v.title ? { title: v.title } : {}) };
  } catch (err) {
    fail((err as Error).message);
  }
  const slug = transcript.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  let note = join(MAZES, name, "notes", `${transcript.date}-${slug}.md`);
  for (let n = 2; existsSync(note); n++) note = join(MAZES, name, "notes", `${transcript.date}-${slug}-${n}.md`);
  writeFileSync(note, toNote(transcript, basename(file)));
  console.log(`imported ${transcript.turns.length} turns to mazes/${name}/notes/${basename(note)}`);
  console.log("Next: fill its facts, commitments and surprises, then `maze add` each new hypothesis.");
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    thesis: { type: "string" },
    days: { type: "string", default: "60" },
    sic: { type: "string", default: "" },
    "wrong-if": { type: "string" },
    do: { type: "string" },
    bet: { type: "string" },
    by: { type: "string" },
    type: { type: "string" },
    method: { type: "string" },
    id: { type: "string" },
    match: { type: "string" },
    for: { type: "string" },
    tests: { type: "string" },
    title: { type: "string" },
  },
});
const [command, arg, text] = positionals;
if (!arg) fail(USAGE);

if (command === "add") add(arg, text ?? fail(USAGE), values);
else if (command === "check") report(load(arg));
else if (command === "crumb") crumb(arg, text ?? fail(USAGE), values);
else if (command === "import") importTranscript(arg, text ?? fail(USAGE), values);
else if (command === "new") create(arg, values.thesis ?? fail("--thesis is required"));
else if (command === "events") console.log(await events(arg, Number(values.days)));
else if (command === "market") console.log(await market(arg, values.sic.split(",").filter(Boolean)));
else if (command === "papers") console.log(await papers(arg));
else fail(USAGE);
