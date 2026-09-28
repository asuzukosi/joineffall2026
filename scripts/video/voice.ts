import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ffmpeg } from "./media.ts";
import type { Scene, Storyboard } from "./storyboard.ts";

const TRIM = "silenceremove=start_periods=1:start_threshold=-40dB";
const TRIM_BOTH_ENDS = `${TRIM},areverse,${TRIM},areverse,aformat=sample_rates=48000:channel_layouts=stereo`;

export function voiceFile(dir: string, scene: Scene) {
  const trimmed = join(dir, "build", "voice", `${scene.id}.wav`);
  return existsSync(trimmed) ? trimmed : join(dir, scene.voice!);
}

// text-to-speech pads lines with silence; trimming both ends keeps narration on its scene
export function prepareVoices(dir: string, board: Storyboard) {
  const out = join(dir, "build", "voice");
  mkdirSync(out, { recursive: true });
  for (const scene of board.scenes) {
    if (!scene.voice || !existsSync(join(dir, scene.voice))) continue;
    ffmpeg(["-i", join(dir, scene.voice), "-af", TRIM_BOTH_ENDS, join(out, `${scene.id}.wav`)], `voice ${scene.id}`);
  }
}
