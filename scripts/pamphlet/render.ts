import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { PDFDocument } from "pdf-lib";
import puppeteer, { type Page } from "puppeteer-core";
import { checkWriting, proseOf } from "./writing.ts";

const A4 = { width: 794, height: 1123 };
const MAX_EMPTY = 110; // px, about 29mm: a quarter of the usable page reads as unfinished
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

type Source = { file: string; home: string };

function pagesIn(home: string): Source[] {
  const dir = join(home, "pages");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".html") && !f.startsWith("."))
    .map((f) => ({ file: join(dir, f), home }));
}

type Config = { topic?: string; author?: string; title?: string; subject?: string };

function configOf(dir: string): Config {
  const file = join(dir, "pamphlet.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
}

export function topicOf(dir: string, topics: string) {
  const { topic } = configOf(dir);
  return topic ? join(topics, topic) : null;
}

// the pdf names its author and title instead of the browser that printed it
async function stamp(pdf: Uint8Array, dir: string, fallbackTitle: string) {
  const { author, title, subject } = configOf(dir);
  const doc = await PDFDocument.load(pdf);
  doc.setTitle(title ?? fallbackTitle);
  if (author) doc.setAuthor(author);
  if (subject) doc.setSubject(subject);
  doc.setCreator(author ?? "");
  doc.setProducer(author ?? "");
  return doc.save();
}

// a pamphlet's own pages (cover, personal note, back) interleave with its topic's research pages by file name
export function listPages(dir: string, topics: string) {
  const topic = topicOf(dir, topics);
  const all = [...pagesIn(dir), ...(topic ? pagesIn(topic) : [])];
  const names = all.map((s) => basename(s.file));
  const clash = names.find((n, i) => names.indexOf(n) !== i);
  if (clash) throw new Error(`page ${clash} exists in both the pamphlet and its topic`);
  return all.sort((a, b) => basename(a.file).localeCompare(basename(b.file)));
}

function part(html: string, tag: string) {
  return html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*)</${tag}>`, "i"))?.[1] ?? "";
}

// pages are joined into one document so links between pages survive into the pdf
function joinPages(dir: string, sources: Source[], title: string) {
  const first = sources.find((s) => s.home === dir) ?? sources[0];
  const head = part(readFileSync(first.file, "utf8"), "head").replace(/<title>[\s\S]*?<\/title>/i, "");
  const bodies = sources.map(({ file, home }) => {
    const id = basename(file, ".html");
    const body = part(readFileSync(file, "utf8"), "body").replace(/<main\b/i, `<main id="${id}"`);
    // recipient pages use their own image if present, else the topic's, so clean never breaks a rebuild
    return body.replace(/\.\.\/images\/([^"')]+)/g, (_, name: string) => {
      const own = join(home, "images", name);
      const shared = sources.find((s) => s.home !== home && existsSync(join(s.home, "images", name)));
      return `file://${existsSync(own) || !shared ? own : join(shared.home, "images", name)}`;
    });
  });
  return `<!doctype html><html lang="en"><head>${head}<title>${title}</title></head><body>${bodies.join("\n")}</body></html>`;
}

async function prepare(page: Page, file: string) {
  await page.goto(`file://${file}`, { waitUntil: "networkidle0", timeout: 120_000 });
  return page.evaluate(async () => {
    await document.fonts.ready;
    const pages = [...document.querySelectorAll<HTMLElement>("main.page")];
    const number = (i: number) => String(i + 1).padStart(2, "0");
    pages.forEach((main, i) => main.querySelectorAll(".folio").forEach((el) => (el.textContent = number(i))));
    document.querySelectorAll<HTMLAnchorElement>(".toc a[href^='#']").forEach((a) => {
      const at = pages.findIndex((m) => m.id === a.hash.slice(1));
      const slot = a.querySelector("i");
      if (slot && at >= 0) slot.textContent = number(at);
    });
    // empty space left under the last block, ignoring the footer; full-bleed and cover pages are exempt
    const unused = (main: HTMLElement) => {
      if (main.matches(".dark, .flush, .cover")) return 0;
      const blocks = [...main.children].filter((el) => !el.matches(".folio, .home, .runhead"));
      const last = Math.max(...blocks.map((el) => el.getBoundingClientRect().bottom));
      const floor = main.getBoundingClientRect().bottom - parseFloat(getComputedStyle(main).paddingBottom);
      return Math.round(floor - last);
    };
    return pages.map((main) => ({ id: main.id, spill: main.scrollHeight - main.clientHeight, empty: unused(main) }));
  });
}

async function screenshots(page: Page, previews: string) {
  const mains = await page.$$("main.page");
  for (const [i, main] of mains.entries()) {
    await main.screenshot({ path: join(previews, `${String(i + 1).padStart(2, "0")}.png`) });
  }
}

export function writingProblems(dir: string, topics: string) {
  return listPages(dir, topics).flatMap(({ file }) => checkWriting(basename(file, ".html"), proseOf(readFileSync(file, "utf8"))));
}

export async function build(dir: string, topics: string, title: string) {
  const sources = listPages(dir, topics);
  mkdirSync(join(dir, "pages"), { recursive: true });
  const joined = join(dir, "pages", ".print.html");
  const previews = join(dir, "previews");
  rmSync(previews, { recursive: true, force: true });
  mkdirSync(previews);
  writeFileSync(joined, joinPages(dir, sources, title));
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--font-render-hinting=none"] });
  try {
    const page = await browser.newPage();
    await page.setViewport(A4);
    const pages = await prepare(page, joined);
    await screenshots(page, previews);
    const out = join(dir, "pamphlet.pdf");
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, outline: true, tagged: true });
    writeFileSync(out, await stamp(pdf, dir, title));
    const problems = [
      ...pages.filter((p) => p.spill > 1).map((p) => `${p.id}: content overflows by ${p.spill}px`),
      ...pages.filter((p) => p.empty > MAX_EMPTY).map((p) => `${p.id}: leaves ${Math.round(p.empty / 3.78)}mm empty at the bottom; add content or a figure with .grow`),
    ];
    return { out, previews, count: pages.length, problems };
  } finally {
    await browser.close();
    rmSync(joined, { force: true });
  }
}
