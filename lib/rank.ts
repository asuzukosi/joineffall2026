import OpenAI from "openai";
import type { Candidate } from "./retrieve";

export type Ranked = { url: string; reason: string };

const SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          reason: { type: "string" },
        },
        required: ["url", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
} as const;

const SYSTEM = [
  "You are picking people out of one cohort's combined LinkedIn connections.",
  "Choose at most ten who genuinely answer the question.",
  "For each, give one short sentence of evidence drawn only from the line you",
  "were given — never invent a fact about someone.",
  "Return fewer than ten, or none at all, rather than padding the list.",
  "Copy each url back exactly as it appears.",
].join(" ");

export async function rank(
  query: string,
  candidates: Candidate[],
): Promise<Ranked[]> {
  if (candidates.length === 0) return [];

  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");

  const list = candidates
    .map((c) => `${c.url} | ${c.name} | ${c.title} at ${c.company}`)
    .join("\n");

  const completion = await new OpenAI({ apiKey: key }).chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `${query}\n\n${list}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "results", schema: SCHEMA, strict: true },
    },
  });

  const body = completion.choices[0]?.message?.content ?? '{"results":[]}';
  const parsed = JSON.parse(body) as { results?: Ranked[] };
  const known = new Set(candidates.map((c) => c.url));

  // Only keep rows that point at someone we actually retrieved, so a
  // hallucinated url cannot reach the page.
  return (parsed.results ?? []).filter((r) => known.has(r.url)).slice(0, 10);
}
