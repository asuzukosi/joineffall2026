import { join } from "node:path";
import { FRAME } from "./cards.ts";
import { duration, ffmpeg } from "./media.ts";
import type { Scene } from "./storyboard.ts";

export const FPS = 30;
const FADE = 0.4;
const MAX_SLOWDOWN = 1.35;
const ENCODE = ["-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-r", String(FPS), "-pix_fmt", "yuv420p"];

type Edges = { fadeIn: boolean; fadeOut: boolean };

function fades(s: number, edges: Edges) {
  const parts = [];
  if (edges.fadeIn) parts.push(`fade=t=in:st=0:d=${FADE}`);
  if (edges.fadeOut) parts.push(`fade=t=out:st=${(s - FADE).toFixed(2)}:d=${FADE}`);
  return parts.length ? `,${parts.join(",")}` : "";
}

function cardSegment(card: string, s: number, edges: Edges, out: string, label: string) {
  const vf = `format=yuv420p${fades(s, edges)}`;
  ffmpeg(["-loop", "1", "-framerate", String(FPS), "-i", card, "-vf", vf, "-t", String(s), ...ENCODE, out], label);
}

// short clips play slower (up to 1.35x), then hold their last frame; long ones are cut
function clipSegment(clip: string, caption: string | undefined, s: number, edges: Edges, out: string, label: string) {
  const { width: w, height: h } = FRAME;
  const length = duration(clip) ?? s;
  const slow = Math.min(MAX_SLOWDOWN, Math.max(1, s / length)).toFixed(3);
  const base =
    `[0:v]setpts=${slow}*PTS,scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,fps=${FPS},` +
    `tpad=stop_mode=clone:stop_duration=${s},trim=duration=${s},setpts=PTS-STARTPTS`;
  const graph = caption ? `${base}[b];[b][1:v]overlay${fades(s, edges)}[v]` : `${base}${fades(s, edges)}[v]`;
  const inputs = caption ? ["-i", clip, "-loop", "1", "-i", caption] : ["-i", clip];
  ffmpeg([...inputs, "-filter_complex", graph, "-map", "[v]", "-t", String(s), ...ENCODE, out], label);
}

// cards dip to black; clips cut straight into each other so the story flows
function edges(scenes: Scene[], i: number): Edges {
  const scene = scenes[i];
  if (scene.card) return { fadeIn: true, fadeOut: true };
  const prev = scenes[i - 1];
  const next = scenes[i + 1];
  return { fadeIn: !prev || !!prev.card, fadeOut: !next || !!next.card };
}

export function renderSegments(dir: string, scenes: Scene[], cards: Record<string, string>) {
  return scenes.map((scene, i) => {
    const out = join(dir, "build", "segments", `${scene.id}.mp4`);
    const label = `scene ${scene.id}`;
    if (scene.card) cardSegment(cards[scene.id], scene.seconds, edges(scenes, i), out, label);
    else clipSegment(join(dir, scene.clip!), cards[scene.id], scene.seconds, edges(scenes, i), out, label);
    return out;
  });
}
