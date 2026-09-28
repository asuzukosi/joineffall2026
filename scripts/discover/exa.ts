import { jobChanges } from "./changes.ts";
import { postJson } from "./http.ts";
import { requireKey } from "./keys.ts";
import type { Found, Job } from "./types.ts";

type ExaJob = { title?: string; company?: string | { name?: string }; dates?: { start?: string; end?: string }; startDate?: string; endDate?: string };
export type ExaResult = { id?: string; url?: string; title?: string; publishedDate?: string; entities?: { name?: string; workHistory?: ExaJob[] }[] };

export async function find(query: string, limit: number, today: string) {
  const res = await postJson<{ results?: ExaResult[] }>("https://api.exa.ai/search",
    { query, category: "people", numResults: limit }, { "x-api-key": requireKey("EXA_API_KEY") });
  return (res.results ?? []).map((r) => personFrom(r, query, today));
}

function toJob(work: ExaJob): Job {
  const company = typeof work.company === "string" ? work.company : work.company?.name ?? "";
  const end = work.dates?.end ?? work.endDate ?? null;
  return { title: work.title ?? "", company, start: work.dates?.start ?? work.startDate ?? null, end, current: !end };
}

export function personFrom(result: ExaResult, query: string, today: string): Found {
  const entity = result.entities?.[0] ?? {};
  const history = (entity.workHistory ?? []).map(toJob);
  const current = history.find((j) => j.current) ?? history[0];
  const url = result.url ?? "";
  const title = result.title ?? "";
  const profile = { id: `exa:${result.id ?? url}`, kind: "profile", url,
    date: (result.publishedDate ?? today).slice(0, 10), text: `Exa people search for "${query}": ${title}` };
  return {
    name: entity.name ?? title.split(" - ")[0].trim(),
    title: current?.title ?? "",
    company: current?.company ?? "",
    linkedin: url.includes("linkedin.com/in/") ? url : "",
    signals: [profile, ...jobChanges(history, today, url, `exa:${result.id ?? url}`)],
  };
}
