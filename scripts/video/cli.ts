import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { brand } from "../pamphlet/brand.ts";
import { assemble } from "./assemble.ts";
import { renderCards } from "./cards.ts";
import { writeScript } from "./script.ts";
import { check, load } from "./storyboard.ts";
import { prepareVoices } from "./voice.ts";

const VIDEOS = join(import.meta.dirname, "../../videos");

const USAGE = `usage: npm run video -- <command>

  new <name>            copy the template into videos/<name>/
  brand <name> <url>    pull colours, fonts and logo from the customer's site into videos/<name>/brand/
  check <name>          check storyboard.json before spending credits on footage
  script <name>         write script.md: the whole film as a readable shooting script
  build <name>          render cards, cut scenes, lay narration and music, write film.mp4, film.srt, previews/`;

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

function folder(name: string | undefined, mustExist = true) {
  if (!name) fail(USAGE);
  const dir = join(VIDEOS, name);
  if (mustExist && !existsSync(dir)) fail(`videos/${name} does not exist; run new first`);
  return dir;
}

function create(name: string | undefined) {
  const dir = folder(name, false);
  if (existsSync(dir)) fail(`videos/${name} already exists`);
  cpSync(join(import.meta.dirname, "template"), dir, { recursive: true });
  console.log(`created videos/${name}/`);
}

function pullBrand(name: string | undefined, url: string | undefined) {
  if (!url) fail(USAGE);
  const result = brand(folder(name), url);
  console.log(`brand: ${result.out}  (${result.siteName ?? "unnamed"})`);
  console.log(`logo: ${result.logo ?? "not found — save one to brand/ by hand"}`);
}

function verify(dir: string, needFiles: boolean) {
  const board = load(dir);
  const { problems, total } = check(dir, board, needFiles);
  for (const problem of problems) console.error(`problem: ${problem}`);
  if (problems.length) process.exit(2);
  console.log(`ok: ${board.scenes.length} scenes, ${total}s`);
  return board;
}

async function build(name: string | undefined) {
  const dir = folder(name);
  prepareVoices(dir, load(dir));
  const board = verify(dir, true);
  try {
    const result = assemble(dir, board, await renderCards(dir, board));
    console.log(`film: ${result.film}  (${result.total}s)`);
    console.log(`subtitles: ${result.subtitles}`);
    console.log(`previews: ${result.previews}  (first, middle, last frame per scene)`);
  } catch (error) {
    fail((error as Error).message);
  }
}

function script(name: string | undefined) {
  const dir = folder(name);
  console.log(`script: ${writeScript(dir, load(dir))}`);
}

const { positionals } = parseArgs({ allowPositionals: true });
const [command, name, arg] = positionals;

if (command === "new") create(name);
else if (command === "brand") pullBrand(name, arg);
else if (command === "check") verify(folder(name), false);
else if (command === "script") script(name);
else if (command === "build") await build(name);
else fail(USAGE);
