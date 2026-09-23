import OpenAI from "openai";

export type Role = {
  role: string;
  why: string;
  query: string;
};

const ROLES_SCHEMA = {
  type: "object",
  properties: {
    roles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string" },
          why: { type: "string" },
          query: { type: "string" },
        },
        required: ["role", "why", "query"],
        additionalProperties: false,
      },
    },
  },
  required: ["roles"],
  additionalProperties: false,
} as const;

const ROLES_SYSTEM = [
  "A founder describes an idea. Name five kinds of person worth talking to",
  "about it, earliest and most useful first.",
  "Mix the kinds: someone living the problem, someone who has built something",
  "adjacent, someone who buys this sort of thing, someone who knows the",
  "regulations or the incumbents.",
  "`role` is a job title a real person would have, not a category.",
  "`why` is one short sentence on what this founder would learn from them.",
  "`query` is the words such a person's LinkedIn headline would contain and",
  "nothing else — no label, no prefix, no names. It is matched against titles",
  "and companies, so anything that is not those words makes the match worse.",
].join(" ");

function client() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

export async function rolesFor(idea: string): Promise<Role[]> {
  const completion = await client().chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
    messages: [
      { role: "system", content: ROLES_SYSTEM },
      { role: "user", content: idea },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "roles", schema: ROLES_SCHEMA, strict: true },
    },
  });

  const body = completion.choices[0]?.message?.content ?? '{"roles":[]}';
  return (JSON.parse(body) as { roles?: Role[] }).roles?.slice(0, 5) ?? [];
}

export type Assignment = { role: string; urls: string[] };

const ASSIGN_SCHEMA = {
  type: "object",
  properties: {
    assignments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string" },
          urls: { type: "array", items: { type: "string" } },
        },
        required: ["role", "urls"],
        additionalProperties: false,
      },
    },
  },
  required: ["assignments"],
  additionalProperties: false,
} as const;

const ASSIGN_SYSTEM = [
  "You are given roles a founder should talk to, and people from their",
  "cohort's network. Put each person under the role they genuinely fit.",
  "At most four people per role, best fit first. Copy urls exactly.",
  "A person belongs under one role only. Leave a role empty rather than",
  "filling it with someone who does not fit — an empty role is a true answer.",
].join(" ");

export async function assign(
  roles: Role[],
  people: { url: string; name: string; title: string; company: string }[],
): Promise<Assignment[]> {
  if (roles.length === 0 || people.length === 0) return [];

  const roleList = roles.map((r) => `${r.role}: ${r.why}`).join("\n");
  const peopleList = people
    .map((p) => `${p.url} | ${p.name} | ${p.title} at ${p.company}`)
    .join("\n");

  const completion = await client().chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
    messages: [
      { role: "system", content: ASSIGN_SYSTEM },
      { role: "user", content: `ROLES\n${roleList}\n\nPEOPLE\n${peopleList}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "assignments", schema: ASSIGN_SCHEMA, strict: true },
    },
  });

  const body = completion.choices[0]?.message?.content ?? '{"assignments":[]}';
  const known = new Set(people.map((p) => p.url));
  return (JSON.parse(body) as { assignments?: Assignment[] }).assignments
    ?.map((a) => ({ role: a.role, urls: a.urls.filter((u) => known.has(u)).slice(0, 4) }))
    ?? [];
}
