"use server";

import { getDb } from "@/lib/db";
import { rank } from "@/lib/rank";
import { retrieve } from "@/lib/retrieve";
import { memberByEmail, memberByLinkedIn } from "@/lib/roster";
import { requireSession } from "@/lib/session";
import type { Person } from "@/components/person-card";

export type SearchState = {
  query?: string;
  results?: Person[];
  error?: string;
};

const SHORTLIST = 300;

export async function search(
  _: SearchState,
  formData: FormData,
): Promise<SearchState> {
  await requireSession();

  const query = String(formData.get("q") ?? "").trim();
  if (!query) return {};

  const candidates = retrieve(getDb(), query, SHORTLIST);
  if (candidates.length === 0) return { query, results: [] };

  let ranked;
  try {
    ranked = await rank(query, candidates);
  } catch (error) {
    console.error("[search] ranking failed:", error);
    return { query, error: "Search is not working right now. Tell whoever runs this." };
  }

  const byUrl = new Map(candidates.map((c) => [c.url, c]));

  return {
    query,
    results: ranked.flatMap((row) => {
      const candidate = byUrl.get(row.url);
      if (!candidate) return [];
      return [
        {
          url: candidate.url,
          name: candidate.name,
          title: candidate.title,
          company: candidate.company,
          reason: row.reason,
          inCohort: memberByLinkedIn(candidate.url),
          via: candidate.via.flatMap((email) => memberByEmail(email) ?? []),
        },
      ];
    }),
  };
}
