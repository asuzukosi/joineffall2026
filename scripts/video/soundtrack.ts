import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Storyboard } from "./storyboard.ts";
import { voiceFile } from "./voice.ts";

const MUSIC_VOLUME = 0.16;
const MUSIC_FADE = 2;
const VOICE_LEAD = 0.25;
const LEVEL = "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000";

export function starts(board: Storyboard) {
  let at = 0;
  return board.scenes.map((scene) => {
    const start = at;
    at += scene.seconds;
    return start;
  });
}

// each narration line starts just after its scene begins; music sits underneath and fades out at the end
export function soundtrackArgs(dir: string, board: Storyboard, total: number) {
  const inputs: string[] = [];
  const chains: string[] = [];
  const stereo = "aformat=sample_rates=48000:channel_layouts=stereo";
  const at = starts(board);
  board.scenes.forEach((scene, i) => {
    if (!scene.voice) return;
    const ms = Math.round((at[i] + VOICE_LEAD) * 1000);
    inputs.push("-i", voiceFile(dir, scene));
    chains.push(`[${chains.length + 1}:a]${stereo},adelay=${ms}|${ms}[a${chains.length + 1}]`);
  });
  if (board.music) {
    const fadeAt = (total - MUSIC_FADE).toFixed(2);
    inputs.push("-stream_loop", "-1", "-i", join(dir, board.music));
    chains.push(`[${chains.length + 1}:a]${stereo},volume=${MUSIC_VOLUME},afade=t=out:st=${fadeAt}:d=${MUSIC_FADE}[a${chains.length + 1}]`);
  }
  return { inputs, graph: mix(chains) };
}

function mix(chains: string[]) {
  if (!chains.length) return null;
  const labels = chains.map((c) => c.slice(c.lastIndexOf("["))).join("");
  return `${chains.join(";")};${labels}amix=inputs=${chains.length}:normalize=0:duration=longest,apad,${LEVEL}[aout]`;
}

const stamp = (s: number) => {
  const ms = Math.round(s * 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

export function writeSubtitles(dir: string, board: Storyboard) {
  const at = starts(board);
  const cues = board.scenes
    .map((scene, i) => ({ text: scene.narration, from: at[i] + VOICE_LEAD, to: at[i] + scene.seconds - 0.1 }))
    .filter((cue) => cue.text)
    .map((cue, n) => `${n + 1}\n${stamp(cue.from)} --> ${stamp(cue.to)}\n${cue.text}\n`);
  const out = join(dir, "film.srt");
  writeFileSync(out, cues.join("\n"));
  return out;
}
