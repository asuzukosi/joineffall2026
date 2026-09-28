import { getJson } from "./http.ts";
import type { Found } from "./types.ts";

type Authorship = { author: { display_name: string }; institutions?: { display_name?: string }[] };
export type Work = { id: string; doi?: string | null; display_name?: string; publication_date?: string; authorships?: Authorship[] };

export async function find(query: string, since: string, limit: number) {
  const params = new URLSearchParams({ search: query, filter: `from_publication_date:${since}`, "per-page": String(limit) });
  if (process.env.OPENALEX_API_KEY) params.set("api_key", process.env.OPENALEX_API_KEY);
  if (process.env.OPENALEX_MAILTO) params.set("mailto", process.env.OPENALEX_MAILTO);
  const res = await getJson<{ results?: Work[] }>(`https://api.openalex.org/works?${params}`);
  return (res.results ?? []).flatMap(authorsOf);
}

export function authorsOf(work: Work): Found[] {
  const signal = {
    id: `paper:${work.id.split("/").pop()}`,
    kind: "publishes",
    date: work.publication_date ?? "",
    text: `Published: ${work.display_name ?? ""}`,
    url: work.doi ?? work.id,
  };
  return (work.authorships ?? []).map((a) => ({
    name: a.author.display_name,
    company: a.institutions?.[0]?.display_name ?? "",
    signals: [signal],
  }));
}
