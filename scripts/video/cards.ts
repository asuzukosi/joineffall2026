import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import puppeteer, { type Page } from "puppeteer-core";
import type { Scene, Storyboard } from "./storyboard.ts";

export const FRAME = { width: 1920, height: 1080 };
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const escape = (s = "") => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function fill(template: string, mode: string, scene: Scene, customer: string) {
  const values: Record<string, string> = {
    mode,
    customer: escape(customer),
    kicker: escape(scene.kicker),
    title: escape(scene.title),
    text: escape(scene.card ? scene.text : scene.caption),
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
}

async function renderOne(page: Page, file: string, html: string, out: string, transparent: boolean) {
  writeFileSync(file, html);
  await page.goto(`file://${file}`, { waitUntil: "networkidle0", timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, omitBackground: transparent });
}

// title and end cards are full frames; captions are transparent overlays for the clip underneath
export async function renderCards(dir: string, board: Storyboard) {
  const template = readFileSync(join(dir, "card.html"), "utf8");
  const outDir = join(dir, "build", "cards");
  const scratch = join(dir, ".card.html");
  mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--font-render-hinting=none"] });
  const made: Record<string, string> = {};
  try {
    const page = await browser.newPage();
    await page.setViewport(FRAME);
    for (const scene of board.scenes) {
      if (!scene.card && !scene.caption) continue;
      const out = join(outDir, `${scene.id}.png`);
      const mode = scene.card ?? "caption";
      await renderOne(page, scratch, fill(template, mode, scene, board.customer), out, !scene.card);
      made[scene.id] = out;
    }
    return made;
  } finally {
    await browser.close();
    rmSync(scratch, { force: true });
  }
}
