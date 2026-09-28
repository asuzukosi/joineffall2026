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
