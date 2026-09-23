"use server";

import { getDb } from "@/lib/db";
import { assign, rolesFor, type Role } from "@/lib/ideas";
import { retrieve, type Candidate } from "@/lib/retrieve";
import { memberByEmail, memberByLinkedIn } from "@/lib/roster";
import { requireSession } from "@/lib/session";
import type { Person } from "@/components/person-card";

export type RoleResult = Role & { people: Person[] };
export type IdeaState = { idea?: string; roles?: RoleResult[]; error?: string };

// Per role. Five roles is 300 people, the same shortlist one search uses.
const PER_ROLE = 60;

export async function think(
  _: IdeaState,
  formData: FormData,
): Promise<IdeaState> {
  await requireSession();

  const idea = String(formData.get("idea") ?? "").trim();
  if (!idea) return {};
  if (idea.length > 2000) {
    return { error: "That is longer than an idea needs to be. Try a paragraph." };
  }

  const db = getDb();

  try {
    const roles = await rolesFor(idea);
    if (roles.length === 0) {
      return { idea, error: "Could not make sense of that. Try describing it as a sentence." };
    }

    // The roles are independent, so they retrieve at the same time.
    const perRole = await Promise.all(
      roles.map((role) => retrieve(db, role.query, PER_ROLE)),
    );

    const pool = new Map<string, Candidate>();
    for (const candidates of perRole) {
      for (const candidate of candidates) pool.set(candidate.url, candidate);
    }

    const assignments = await assign(roles, [...pool.values()]);
    const byRole = new Map(assignments.map((a) => [a.role, a.urls]));

    return {
      idea,
      roles: roles.map((role) => ({
        ...role,
        people: (byRole.get(role.role) ?? []).flatMap((url) => {
          const candidate = pool.get(url);
          if (!candidate) return [];
          return [
            {
              url: candidate.url,
              name: candidate.name,
              title: candidate.title,
              company: candidate.company,
              // The why belongs to the role and is printed once above the
              // list; repeating it on every card would read as a bug.
              reason: "",
              inCohort: memberByLinkedIn(candidate.url),
              via: candidate.via.flatMap((email) => memberByEmail(email) ?? []),
            },
          ];
        }),
      })),
    };
  } catch (error) {
    console.error("[idea] failed:", error);
    return { idea, error: "That did not work. Tell whoever runs this." };
  }
}
