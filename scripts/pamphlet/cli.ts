import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { brand } from "./brand.ts";
import { build } from "./render.ts";

const PAMPHLETS = join(import.meta.dirname, "../../pamphlets");

const USAGE = `usage: npm run pamphlet -- <command>

  new <name>            copy the template into pamphlets/<name>/
  brand <name> <url>    pull colours, fonts and logo from the customer's site into pamphlets/<name>/brand/
  build <name>          render pages/*.html to pamphlet.pdf and previews/NN.png; exit 2 if a page overflows`;

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

function create(name: string | undefined) {
  const dir = folder(name, false);
  if (existsSync(dir)) fail(`pamphlets/${name} already exists`);
  cpSync(join(import.meta.dirname, "template"), dir, { recursive: true });
  console.log(`created pamphlets/${name}/`);
}

function pullBrand(name: string | undefined, url: string | undefined) {
  if (!url) fail(USAGE);
  const result = brand(folder(name), url);
  console.log(`brand: ${result.out}  (${result.siteName ?? "unnamed"})`);
  console.log(`logo: ${result.logo ?? "not found — save one to brand/ by hand"}`);
}

async function render(name: string | undefined) {
  const result = await build(folder(name), name!);
  console.log(`pdf: ${result.out}  (${result.count} pages)`);
  console.log(`previews: ${result.previews}`);
  for (const problem of result.problems) console.error(`overflow: ${problem}`);
  if (result.problems.length) process.exit(2);
}

const { positionals } = parseArgs({ allowPositionals: true });
const [command, name, arg] = positionals;

if (command === "new") create(name);
else if (command === "brand") pullBrand(name, arg);
else if (command === "build") await render(name);
else fail(USAGE);
