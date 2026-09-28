import { getJson } from "./http.ts";
import { day, section, table } from "./markdown.ts";

type YearGroups = { group_by: { key: string; count: number }[] };
type HfPaper = { paper: { id: string; title: string; publishedAt: string; upvotes: number } };

async function trend(query: string) {
  const res = await getJson<YearGroups>(`https://api.openalex.org/works?search=${encodeURIComponent(query)}&group_by=publication_year`);
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => String(thisYear - 5 + i));
  const counts = years.map((y) => res.group_by.find((g) => g.key === y)?.count ?? 0);
  return `Papers per year in OpenAlex (${thisYear} is partial). A steep rise means the field is moving faster than most people have noticed.\n\n${table(years, [counts])}`;
}

async function recent(query: string) {
  const res = await getJson<HfPaper[]>(`https://huggingface.co/api/papers/search?q=${encodeURIComponent(query)}`);
  const rows = res
    .slice(0, 15)
    .map(({ paper: p }) => [day(p.publishedAt), p.title, p.upvotes, `https://huggingface.co/papers/${p.id}`]);
  return table(["Published", "Paper", "Upvotes", "Link"], rows);
}

export async function papers(query: string) {
  const parts = await Promise.all([
    section("Is the field speeding up?", () => trend(query)),
    section("Most relevant papers (Hugging Face Papers)", () => recent(query)),
  ]);
  return `# Research: "${query}"\n\n${parts.join("\n")}`;
}
