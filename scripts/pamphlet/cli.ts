import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { brand } from "./brand.ts";
import { build, writingProblems } from "./render.ts";

const PAMPHLETS = join(import.meta.dirname, "../../pamphlets");
const TOPICS = join(import.meta.dirname, "../../topics");
const TEMPLATE = join(import.meta.dirname, "template");

const USAGE = `usage: npm run pamphlet -- <command>

  topic <topic>                  start shared research in topics/<topic>/ (done once, reused for every recipient)
  new <name> [--topic <topic>]   start a recipient pamphlet; with --topic it holds only the personal pages
  brand <name> <url>    pull colours, fonts and logo from the customer's site into pamphlets/<name>/brand/
  build <name>          check every page's prose for AI-writing patterns, then render pamphlet.pdf and previews/NN.png;
                        exit 2 on a writing problem or an overflowing page`;

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

function folder(name: string | undefined, mustExist = true) {
  if (!name) fail(USAGE);
  const dir = join(PAMPHLETS, name);
  if (mustExist && !existsSync(dir)) fail(`pamphlets/${name} does not exist; run new first`);
  return dir;
}

function createTopic(topic: string | undefined) {
  if (!topic) fail(USAGE);
  const dir = join(TOPICS, topic);
  if (existsSync(dir)) fail(`topics/${topic} already exists`);
  for (const sub of ["pages", "images", "research"]) mkdirSync(join(dir, sub), { recursive: true });
  console.log(`created topics/${topic}/ — research goes in research/, generated pages in pages/`);
}

function create(name: string | undefined, topic: string | undefined) {
  const dir = folder(name, false);
  if (existsSync(dir)) fail(`pamphlets/${name} already exists`);
  if (topic && !existsSync(join(TOPICS, topic))) fail(`topics/${topic} does not exist; run topic first`);
  if (!topic) {
    cpSync(TEMPLATE, dir, { recursive: true, filter: (src) => !src.includes("/personal") });
    return console.log(`created pamphlets/${name}/`);
  }
  for (const f of ["brand.css", "page.css", "images"]) cpSync(join(TEMPLATE, f), join(dir, f), { recursive: true });
  cpSync(join(TEMPLATE, "personal"), join(dir, "pages"), { recursive: true });
  writeFileSync(join(dir, "pamphlet.json"), JSON.stringify({ topic }, null, 2) + "\n");
  console.log(`created pamphlets/${name}/ on topic ${topic}: edit brand.css and the pages in pages/`);
}

function pullBrand(name: string | undefined, url: string | undefined) {
  if (!url) fail(USAGE);
  const result = brand(folder(name), url);
  console.log(`brand: ${result.out}  (${result.siteName ?? "unnamed"})`);
  console.log(`logo: ${result.logo ?? "not found — save one to brand/ by hand"}`);
}

async function render(name: string | undefined) {
  const writing = writingProblems(folder(name), TOPICS);
  for (const problem of writing) console.error(`writing: ${problem}`);
  if (writing.length) fail(`${writing.length} writing problems; fix the prose (avoid-ai-writing skill) and rebuild`);
  const result = await build(folder(name), TOPICS, name!);
  console.log(`pdf: ${result.out}  (${result.count} pages)`);
  console.log(`previews: ${result.previews}`);
  for (const problem of result.problems) console.error(`overflow: ${problem}`);
  if (result.problems.length) process.exit(2);
}

const { positionals, values } = parseArgs({ allowPositionals: true, options: { topic: { type: "string" } } });
const [command, name, arg] = positionals;

if (command === "topic") createTopic(name);
else if (command === "new") create(name, values.topic);
else if (command === "brand") pullBrand(name, arg);
else if (command === "build") await render(name);
else fail(USAGE);
