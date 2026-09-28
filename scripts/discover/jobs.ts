import { getJson } from "../maze/http.ts";
import type { Signal } from "./types.ts";

export type Posting = { id: string; title: string; url: string; date: string; text: string };

const BOARDS: Record<string, string> = {
  greenhouse: "https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true",
  lever: "https://api.lever.co/v0/postings/{token}?mode=json",
  ashby: "https://api.ashbyhq.com/posting-api/job-board/{token}",
};
const REPORTS_TO = /report(?:s|ing)? (?:directly )?to (?:the |our )?([A-Z][\w&/ -]{2,60}?)[.,;\n]/;

export async function find(board: string, token: string, query: string) {
  if (!BOARDS[board]) throw new Error(`board must be one of ${Object.keys(BOARDS).join(", ")}`);
  const data = await getJson<unknown>(BOARDS[board].replace("{token}", token));
  return postings(board, data).filter((p) => matches(p, query)).map((p) => signalFrom(board, token, p));
}

export function matches(posting: Pick<Posting, "title" | "text">, query: string) {
  const haystack = `${posting.title} ${posting.text}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

type Greenhouse = { jobs: { id: number; title: string; absolute_url: string; updated_at: string; content?: string }[] };
type Lever = { id: string; text: string; hostedUrl: string; createdAt: number; descriptionPlain?: string }[];
type Ashby = { jobs: { id: string; title: string; jobUrl: string; publishedAt: string; descriptionPlain?: string }[] };

export function postings(board: string, data: unknown): Posting[] {
  if (board === "greenhouse") {
    return (data as Greenhouse).jobs.map((j) => ({ id: String(j.id), title: j.title, url: j.absolute_url,
      date: j.updated_at.slice(0, 10), text: plain(j.content ?? "") }));
  }
  if (board === "lever") {
    return (data as Lever).map((j) => ({ id: j.id, title: j.text, url: j.hostedUrl,
      date: new Date(j.createdAt).toISOString().slice(0, 10), text: j.descriptionPlain ?? "" }));
  }
  return (data as Ashby).jobs.map((j) => ({ id: j.id, title: j.title, url: j.jobUrl,
    date: j.publishedAt.slice(0, 10), text: j.descriptionPlain ?? "" }));
}

export function signalFrom(board: string, token: string, posting: Posting): Signal {
  const reports = REPORTS_TO.exec(posting.text);
  const who = reports ? ` (reports to ${reports[1].trim()})` : "";
  return { id: `job:${board}:${token}:${posting.id}`, kind: "hiring", date: posting.date,
    text: `Hiring: ${posting.title}${who}`, url: posting.url };
}

function plain(markup: string) {
  const unescaped = markup.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  return unescaped.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
