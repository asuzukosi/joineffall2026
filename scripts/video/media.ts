import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

export function duration(file: string): number | null {
  if (!existsSync(file)) return null;
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
    const seconds = Number.parseFloat(out);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  } catch {
    return null;
  }
}

export function ffmpeg(args: string[], label: string) {
  try {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString().trim();
    throw new Error(`ffmpeg failed on ${label}: ${stderr || String(error)}`);
  }
}
