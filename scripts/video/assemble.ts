import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ffmpeg } from "./media.ts";
import { renderSegments } from "./segments.ts";
import { soundtrackArgs, starts, writeSubtitles } from "./soundtrack.ts";
import type { Storyboard } from "./storyboard.ts";

function joinPicture(dir: string, segments: string[]) {
  const list = join(dir, "build", "segments.txt");
  const out = join(dir, "build", "picture.mp4");
  writeFileSync(list, segments.map((s) => `file '${s}'`).join("\n"));
  ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", out], "joining scenes");
  return out;
}

function mux(dir: string, board: Storyboard, picture: string, total: number) {
  const out = join(dir, "film.mp4");
  const { inputs, graph } = soundtrackArgs(dir, board, total);
  const audio = graph
    ? ["-filter_complex", graph, "-map", "0:v", "-map", "[aout]"]
    : ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-map", "0:v", "-map", "1:a"];
  const args = graph ? ["-i", picture, ...inputs, ...audio] : ["-i", picture, ...audio];
  ffmpeg([...args, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", String(total), "-movflags", "+faststart", out], "mixing sound");
  return out;
}

// first, middle and last frame of every scene, so warping at clip ends gets seen
function previews(dir: string, board: Storyboard, film: string) {
  const out = join(dir, "previews");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out);
  const at = starts(board);
  board.scenes.forEach((scene, i) => {
    const points = { a: 0.15, m: scene.seconds / 2, z: scene.seconds - 0.15 };
    for (const [tag, offset] of Object.entries(points)) {
      const png = join(out, `${scene.id}-${tag}.png`);
      ffmpeg(["-ss", (at[i] + offset).toFixed(2), "-i", film, "-frames:v", "1", png], `preview ${scene.id}`);
    }
  });
  return out;
}

export function assemble(dir: string, board: Storyboard, cards: Record<string, string>) {
  mkdirSync(join(dir, "build", "segments"), { recursive: true });
  const total = board.scenes.reduce((sum, s) => sum + s.seconds, 0);
  const picture = joinPicture(dir, renderSegments(dir, board.scenes, cards));
  const film = mux(dir, board, picture, total);
  return { film, total, subtitles: writeSubtitles(dir, board), previews: previews(dir, board, film) };
}
