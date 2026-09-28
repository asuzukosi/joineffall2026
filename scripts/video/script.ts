import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { starts } from "./soundtrack.ts";
import type { Scene, Storyboard } from "./storyboard.ts";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

function sceneBlock(scene: Scene, start: number, names: Map<string, string>) {
  const cast = (scene.cast ?? []).map((id) => names.get(id) ?? id).join(", ");
  const lines = [`### ${clock(start)} · ${scene.id} · ${scene.seconds}s`];
  if (scene.card) lines.push(`**${scene.card.toUpperCase()} CARD** — ${[scene.kicker, scene.title, scene.text].filter(Boolean).join(" / ")}`);
  if (scene.still_prompt) lines.push(`**Picture:** ${scene.still_prompt}`);
  if (scene.motion_prompt) lines.push(`**Camera:** ${scene.motion_prompt}`);
  if (cast) lines.push(`**On screen:** ${cast}`);
  if (scene.narration) lines.push(`**Voice:** "${scene.narration}"`);
  if (scene.caption) lines.push(`**Caption:** ${scene.caption}`);
  return lines.join("\n\n");
}

export function writeScript(dir: string, board: Storyboard) {
  const at = starts(board);
  const total = board.scenes.reduce((sum, s) => sum + s.seconds, 0);
  const names = new Map((board.characters ?? []).map((c) => [c.id, c.name]));
  const cast = (board.characters ?? []).map((c) => `- **${c.name}**, ${c.role}. ${c.look}`);
  const parts = [
    `# ${board.customer} — ${clock(total)}`,
    `**Who it is for:** ${board.value}`,
    cast.length ? `## Cast\n\n${cast.join("\n")}` : "",
    "## Script",
    ...board.scenes.map((scene, i) => sceneBlock(scene, at[i], names)),
  ];
  const out = join(dir, "script.md");
  writeFileSync(out, parts.filter(Boolean).join("\n\n") + "\n");
  return out;
}
