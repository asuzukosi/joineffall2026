import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Extract = { siteName?: string; logo?: { source?: string; markup?: string; url?: string } };

export function brand(dir: string, url: string) {
  const out = join(dir, "brand");
  mkdirSync(out, { recursive: true });
  const json = execFileSync("dembrandt", [url, "--json-only", "--design-md", "--save-output"], {
    cwd: out,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  });
  writeFileSync(join(out, "brand.json"), json);
  const { siteName, logo } = JSON.parse(json) as Extract;
  if (logo?.markup?.startsWith("<svg")) writeFileSync(join(out, "logo.svg"), logo.markup);
  return { out, siteName, logo: logo?.markup ? join(out, "logo.svg") : logo?.url };
}
