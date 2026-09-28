import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { duration } from "./media.ts";
import { voiceFile } from "./voice.ts";

export type Character = { id: string; name: string; role: string; look: string; ref?: string };

export type Scene = {
  id: string;
  seconds: number;
  card?: "title" | "end";
  kicker?: string;
  title?: string;
  text?: string;
  clip?: string;
  cast?: string[];
  caption?: string;
  narration?: string;
  voice?: string;
  still_prompt?: string;
  motion_prompt?: string;
};

export type Storyboard = {
  customer: string;
  value: string;
  characters?: Character[];
  music?: string;
  scenes: Scene[];
};

const MAX_CAPTION_WORDS = 14;
const MAX_TOTAL_SECONDS = 120;
const WORDS_PER_SECOND = 2.0;
const VOICE_ROOM = 0.6;

export function load(dir: string): Storyboard {
  return JSON.parse(readFileSync(join(dir, "storyboard.json"), "utf8"));
}

const words = (s = "") => s.trim().split(/\s+/).filter(Boolean).length;

function planProblems(scene: Scene, cast: Set<string>, measured: boolean) {
  const out: string[] = [];
  const at = `scene ${scene.id}`;
  if (!(scene.seconds >= 2 && scene.seconds <= 12)) out.push(`${at}: seconds must be 2–12`);
  if (!scene.card === !scene.clip) out.push(`${at}: needs exactly one of card or clip`);
  if (scene.card && !scene.title) out.push(`${at}: a card needs a title`);
  if (scene.clip && !scene.still_prompt) out.push(`${at}: a clip scene needs a still_prompt`);
  if (words(scene.caption) > MAX_CAPTION_WORDS) out.push(`${at}: caption over ${MAX_CAPTION_WORDS} words`);
  const spoken = words(scene.narration) / WORDS_PER_SECOND;
  if (!measured && spoken > scene.seconds - VOICE_ROOM) out.push(`${at}: narration needs ~${spoken.toFixed(1)}s; make the scene ${Math.ceil(spoken + VOICE_ROOM)}s or cut words`);
  for (const id of scene.cast ?? []) if (!cast.has(id)) out.push(`${at}: unknown character ${id}`);
  return out;
}

function fileProblems(dir: string, scene: Scene) {
  const out: string[] = [];
  const at = `scene ${scene.id}`;
  if (scene.clip) {
    const clip = duration(join(dir, scene.clip));
    if (clip === null) out.push(`${at}: ${scene.clip} is missing or not a video`);
    else if (clip < scene.seconds * 0.6) out.push(`${at}: clip is ${clip.toFixed(1)}s, too short for ${scene.seconds}s even slowed down`);
  }
  if (scene.narration && !scene.voice) out.push(`${at}: narration has no voice file yet`);
  if (scene.voice) {
    const voice = duration(voiceFile(dir, scene));
    if (voice === null) out.push(`${at}: ${scene.voice} is missing or not audio`);
    else if (voice > scene.seconds - VOICE_ROOM) out.push(`${at}: voice is ${voice.toFixed(1)}s; make the scene ${Math.ceil(voice + VOICE_ROOM)}s`);
  }
  return out;
}

export function check(dir: string, board: Storyboard, needFiles: boolean) {
  const problems: string[] = [];
  if (!board.value || board.value.includes("[")) problems.push("value: say who sees this and what changes for them");
  const ids = board.scenes.map((s) => s.id);
  if (new Set(ids).size !== ids.length) problems.push("scene ids must be unique");
  const cast = new Set((board.characters ?? []).map((c) => c.id));
  const total = board.scenes.reduce((sum, s) => sum + s.seconds, 0);
  if (total > MAX_TOTAL_SECONDS) problems.push(`film is ${total}s; keep it under ${MAX_TOTAL_SECONDS}s`);
  // once a voice file exists its measured length replaces the word-count estimate
  for (const scene of board.scenes) problems.push(...planProblems(scene, cast, needFiles && !!scene.voice));
  if (!needFiles) return { problems, total };
  if (board.music && !existsSync(join(dir, board.music))) problems.push(`missing ${board.music}`);
  for (const scene of board.scenes) problems.push(...fileProblems(dir, scene));
  return { problems, total };
}
