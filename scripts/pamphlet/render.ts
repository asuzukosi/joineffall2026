import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import puppeteer, { type Page } from "puppeteer-core";

const A4 = { width: 794, height: 1123 };
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export function listPages(dir: string) {
  return readdirSync(join(dir, "pages"))
    .filter((f) => f.endsWith(".html") && !f.startsWith("."))
    .sort()
    .map((f) => join(dir, "pages", f));
}

function part(html: string, tag: string) {
  return html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*)</${tag}>`, "i"))?.[1] ?? "";
}

// pages are joined into one document so links between pages survive into the pdf
function joinPages(files: string[], title: string) {
  const head = part(readFileSync(files[0], "utf8"), "head").replace(/<title>[\s\S]*?<\/title>/i, "");
  const bodies = files.map((file) => {
    const id = basename(file, ".html");
    return part(readFileSync(file, "utf8"), "body").replace(/<main\b/i, `<main id="${id}"`);
  });
  return `<!doctype html><html lang="en"><head>${head}<title>${title}</title></head><body>${bodies.join("\n")}</body></html>`;
}

async function prepare(page: Page, file: string) {
  await page.goto(`file://${file}`, { waitUntil: "networkidle0", timeout: 120_000 });
  return page.evaluate(async () => {
    await document.fonts.ready;
    const pages = [...document.querySelectorAll<HTMLElement>("main.page")];
    pages.forEach((main, i) =>
      main.querySelectorAll(".folio").forEach((el) => (el.textContent = String(i + 1).padStart(2, "0"))),
    );
    return pages.map((main) => ({ id: main.id, spill: main.scrollHeight - main.clientHeight }));
  });
}

async function screenshots(page: Page, previews: string) {
  const mains = await page.$$("main.page");
  for (const [i, main] of mains.entries()) {
    await main.screenshot({ path: join(previews, `${String(i + 1).padStart(2, "0")}.png`) });
  }
}

export async function build(dir: string, title: string) {
  const files = listPages(dir);
  const joined = join(dir, "pages", ".print.html");
  const previews = join(dir, "previews");
  rmSync(previews, { recursive: true, force: true });
  mkdirSync(previews);
  writeFileSync(joined, joinPages(files, title));
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--font-render-hinting=none"] });
  try {
    const page = await browser.newPage();
    await page.setViewport(A4);
    const pages = await prepare(page, joined);
    await screenshots(page, previews);
    const out = join(dir, "pamphlet.pdf");
    await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true, outline: true, tagged: true });
    const problems = pages.filter((p) => p.spill > 1).map((p) => `${p.id}: content overflows by ${p.spill}px`);
    return { out, previews, count: pages.length, problems };
  } finally {
    await browser.close();
    rmSync(joined, { force: true });
  }
}
