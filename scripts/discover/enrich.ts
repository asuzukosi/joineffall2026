import { addSignals } from "./batch.ts";
import { jobChanges } from "./changes.ts";
import { requireKey } from "./keys.ts";
import type { Job, Person, Signal } from "./types.ts";

type ApolloJob = { title?: string; organization_name?: string; start_date?: string | null; end_date?: string | null; current?: boolean };
type ApolloOrg = { estimated_num_employees?: number; primary_domain?: string; latest_funding_round_date?: string; latest_funding_stage?: string };
export type ApolloPerson = { id: string; email?: string | null; title?: string | null; linkedin_url?: string | null;
  employment_history?: ApolloJob[]; organization?: ApolloOrg | null };
export type MatchReply = { person?: ApolloPerson | null; request_id?: string | number };
type PollReply = { status: number; body: { error_code?: string; retry_after_seconds?: number } & Record<string, unknown> };

export type Apollo = {
  post(path: string, query: Record<string, string>): Promise<MatchReply>;
  get(path: string): Promise<PollReply>;
};

const BASE = "https://api.apollo.io/api/v1";

export function apollo(): Apollo {
  const headers = { "x-api-key": requireKey("APOLLO_API_KEY"), "content-type": "application/json" };
  return {
    async post(path, query) {
      const res = await fetch(`${BASE}${path}?${new URLSearchParams(query)}`, { method: "POST", headers });
      if (!res.ok) throw new Error(`${res.status} from Apollo ${path}: ${(await res.text()).slice(0, 200)}`);
      return res.json();
    },
    async get(path) {
      const res = await fetch(`${BASE}${path}`, { headers });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    },
  };
}

export async function enrichAll(people: Person[], phones: boolean, api: Apollo, today: string) {
  let matched = 0;
  for (const person of people) {
    if (person.email || !person.name) continue;
    const query: Record<string, string> = { name: person.name, organization_name: person.company };
    if (person.domain) query.domain = person.domain;
    if (person.linkedin) query.linkedin_url = person.linkedin;
    if (phones) Object.assign(query, { reveal_phone_number: "true", poll_only: "true" });
    const body = await api.post("/people/match", query);
    if (body.person) {
      applyMatch(person, body.person, today);
      matched++;
    }
    if (phones && body.request_id) person.phone_request_id = String(body.request_id);
  }
  if (phones) await collectPhones(people, api);
  return matched;
}

export function applyMatch(person: Person, found: ApolloPerson, today: string) {
  const org: ApolloOrg = found.organization ?? {};
  person.email = found.email ?? person.email;
  person.title ||= found.title ?? "";
  person.linkedin ||= found.linkedin_url ?? "";
  person.company_size = org.estimated_num_employees ?? person.company_size;
  person.domain = org.primary_domain ?? person.domain;
  const url = person.linkedin || `https://app.apollo.io/#/people/${found.id}`;
  const history: Job[] = (found.employment_history ?? []).map((j) => ({ title: j.title ?? "",
    company: j.organization_name ?? "", start: j.start_date ?? null, end: j.end_date ?? null, current: Boolean(j.current) }));
  const signals: Signal[] = jobChanges(history, today, url, `apollo:${found.id}`);
  if (org.latest_funding_round_date) {
    signals.push({ id: `apollo:${found.id}:funding`, kind: "funding", date: org.latest_funding_round_date, url,
      text: `${person.company} raised a ${org.latest_funding_stage ?? "funding"} round` });
  }
  addSignals(person, signals);
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function collectPhones(people: Person[], api: Apollo, sleep = wait, rounds = 6) {
  let pending = people.filter((p) => p.phone_request_id && !p.phone);
  for (let round = 0; round < rounds && pending.length; round++) {
    const waiting: Person[] = [];
    let seconds = 10;
    for (const person of pending) {
      const { status, body } = await api.get(`/webhook_result/${person.phone_request_id}`);
      if (status === 404 && body.error_code === "result_pending") {
        waiting.push(person);
        seconds = body.retry_after_seconds ?? 10;
      } else if (status === 200) person.phone = firstPhone(body);
    }
    pending = waiting;
    if (pending.length) await sleep(seconds * 1000);
  }
}

function firstPhone(data: unknown): string | null {
  if (Array.isArray(data)) return data.map(firstPhone).find(Boolean) ?? null;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.sanitized_number === "string") return record.sanitized_number;
    return firstPhone(Object.values(record));
  }
  return null;
}
