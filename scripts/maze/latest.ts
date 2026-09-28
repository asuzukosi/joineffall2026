import { postJson } from "./http.ts";
import { day, section, table } from "./markdown.ts";

type ExaResult = { title: string; url: string; publishedDate?: string; highlights?: string[] };
type ExaSearch = { results: ExaResult[]; costDollars?: { total: number } };
type Angle = { title: string; query: (q: string) => string; category?: string; includeDomains?: string[]; anyDate?: boolean };

const ANGLES: Angle[] = [
  // Forum threads carry no publish date either.
  { title: "The problem in their own words", query: (q) => `a forum thread where people complain about ${q}`, anyDate: true },
  { title: "News", query: (q) => q, category: "news" },
  { title: "Research", query: (q) => q, category: "research paper" },
  { title: "Launches and funding", query: (q) => `new startup launches or raises funding for ${q}` },
  // Repositories carry no publish date, so a date filter would drop them all.
  { title: "Open source (crumbs to point buyers at)", query: (q) => `open-source tool for ${q}`, includeDomains: ["github.com"], anyDate: true },
];

function clip(text: string, max = 160) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

// GitHub pages are often titled "README.md"; the repository path says more.
function name(r: ExaResult) {
  const url = new URL(r.url);
  if (r.title?.trim() && !/readme/i.test(r.title)) return clip(r.title, 100);
  const path = url.pathname.split("/").filter(Boolean);
  return clip(url.hostname === "github.com" ? path.slice(0, 2).join("/") : `${url.hostname}/${path.join("/")}`, 100);
}

function when(published: string | undefined, since: string) {
  if (!published) return "undated";
  return published < since ? `(dated) ${day(published)}` : day(published);
}

async function search(angle: Angle, query: string, since: string, key: string) {
  const res = await postJson<ExaSearch>(
    "https://api.exa.ai/search",
    {
      query: angle.query(query),
      type: "auto",
      numResults: 6,
      ...(angle.anyDate ? {} : { startPublishedDate: since }),
      ...(angle.category ? { category: angle.category } : {}),
      ...(angle.includeDomains ? { includeDomains: angle.includeDomains } : {}),
      contents: { highlights: { numSentences: 1, highlightsPerUrl: 1 } },
    },
    { "x-api-key": key },
  );
  const rows = [...res.results]
    .sort((a, b) => (b.publishedDate ?? "").localeCompare(a.publishedDate ?? ""))
    .map((r) => [when(r.publishedDate, since), name(r), clip(r.highlights?.[0] ?? ""), r.url]);
  return { markdown: table(["Published", "Title", "Key line", "Link"], rows), cost: res.costDollars?.total ?? 0 };
}

export async function latest(query: string, days: number) {
  const key = process.env.EXA_API_KEY;
  if (!key) throw new Error("EXA_API_KEY is not set; add it to .env.local");
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  let cost = 0;
  const parts = await Promise.all(
    ANGLES.map((angle) =>
      section(angle.title, async () => {
        const result = await search(angle, query, since, key);
        cost += result.cost;
        return result.markdown;
      }),
    ),
  );
  return `# Latest: "${query}", last ${days} days (Exa)\n\nPass the problem, not the solution: "physios writing notes after hours", not "AI clinical notes".\n\n${parts.join("\n")}\nExa cost: $${cost.toFixed(3)}\n`;
}
